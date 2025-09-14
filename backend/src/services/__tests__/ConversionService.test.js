const ConversionService = require('../ConversionService');
const pool = require('../../config/database');

// Mock the database pool
jest.mock('../../config/database', () => ({
  connect: jest.fn(),
  query: jest.fn(),
}));

describe('ConversionService', () => {
  let mockClient;
  let mockPool;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock client for transactions
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Setup mock pool
    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    pool.connect = mockPool.connect;
    pool.query = mockPool.query;
  });

  describe('getConversionStages', () => {
    it('should return all active conversion stages ordered by stage_order', async () => {
      const mockStages = [
        { stage_id: 1, stage_name: 'Initial Contact', stage_order: 1, description: 'First contact', is_active: true },
        { stage_id: 2, stage_name: 'Qualified', stage_order: 2, description: 'Lead qualified', is_active: true },
      ];

      mockPool.query.mockResolvedValue({ rows: mockStages });

      const result = await ConversionService.getConversionStages();

      expect(mockPool.query).toHaveBeenCalledWith(`
        SELECT stage_id, stage_name, stage_order, description, is_active
        FROM conversion_stages
        WHERE is_active = true
        ORDER BY stage_order
      `);
      expect(result).toEqual(mockStages);
    });
  });

  describe('updateLeadStage', () => {
    it('should successfully update lead stage and log event', async () => {
      const leadId = 1;
      const stageId = 2;
      const userId = 100;
      const notes = 'Moving to qualified stage';

      const mockCurrentStage = {
        conversion_stage_id: 1,
        conversion_started_at: '2025-01-01T00:00:00Z'
      };

      const mockUpdatedLead = {
        lead_id: leadId,
        conversion_stage_id: stageId,
        updated_at: '2025-01-12T16:45:00Z'
      };

      // Mock current stage query
      mockClient.query
        .mockResolvedValueOnce({ rows: [mockCurrentStage] })
        // Mock update query
        .mockResolvedValueOnce({ rows: [mockUpdatedLead] })
        // Mock event insert
        .mockResolvedValueOnce({ rows: [] })
        // Mock commit
        .mockResolvedValueOnce();

      const result = await ConversionService.updateLeadStage(leadId, stageId, userId, notes);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(`
        SELECT conversion_stage_id, conversion_started_at
        FROM leads
        WHERE lead_id = $1
      `, [leadId]);
      expect(mockClient.query).toHaveBeenCalledWith(`
        UPDATE leads
        SET
          conversion_stage_id = $1,
          conversion_started_at = COALESCE(conversion_started_at, CURRENT_TIMESTAMP),
          updated_at = CURRENT_TIMESTAMP
        WHERE lead_id = $2
        RETURNING *
      `, [stageId, leadId]);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result).toEqual(mockUpdatedLead);
    });

    it('should throw error if lead not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(ConversionService.updateLeadStage(1, 2, 100))
        .rejects.toThrow('Lead not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should update completion timestamp for final stages', async () => {
      const mockCurrentStage = {
        conversion_stage_id: 1,
        conversion_started_at: '2025-01-01T00:00:00Z'
      };

      const mockUpdatedLead = {
        lead_id: 1,
        conversion_stage_id: 7, // Closed Won
        updated_at: '2025-01-12T16:45:00Z'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockCurrentStage] })
        .mockResolvedValueOnce({ rows: [mockUpdatedLead] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }) // Completion timestamp update
        .mockResolvedValueOnce();

      await ConversionService.updateLeadStage(1, 7, 100);

      expect(mockClient.query).toHaveBeenCalledWith(`
        UPDATE leads
        SET conversion_completed_at = CURRENT_TIMESTAMP
        WHERE lead_id = $1
      `, [1]);
    });
  });

  describe('updateConversionProbability', () => {
    it('should update lead probability and log event', async () => {
      const leadId = 1;
      const probability = 0.75;
      const userId = 100;
      const notes = 'High probability based on engagement';

      const mockUpdatedLead = {
        lead_id: leadId,
        conversion_probability: 0.75,
        estimated_value: 50000,
        conversion_score: 37500
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUpdatedLead] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await ConversionService.updateConversionProbability(leadId, probability, userId, notes);

      expect(mockPool.query).toHaveBeenCalledWith(`
        UPDATE leads
        SET
          conversion_probability = $1,
          conversion_score = $1 * COALESCE(estimated_value, 0),
          updated_at = CURRENT_TIMESTAMP
        WHERE lead_id = $2
        RETURNING *
      `, [probability, leadId]);
      expect(result).toEqual(mockUpdatedLead);
    });
  });

  describe('getConversionFunnel', () => {
    it('should return funnel data for user', async () => {
      const userId = 100;
      const mockFunnelData = [
        { stage_name: 'Initial Contact', stage_order: 1, lead_count: 10, avg_probability: 0.2, total_value: 500000 },
        { stage_name: 'Qualified', stage_order: 2, lead_count: 5, avg_probability: 0.6, total_value: 300000 },
      ];

      mockPool.query.mockResolvedValue({ rows: mockFunnelData });

      const result = await ConversionService.getConversionFunnel(userId);

      expect(result).toEqual(mockFunnelData);
      expect(mockPool.query).toHaveBeenCalledWith(`
        SELECT
          cs.stage_name,
          cs.stage_order,
          COUNT(l.lead_id) as lead_count,
          AVG(l.conversion_probability) as avg_probability,
          SUM(l.estimated_value) as total_value
        FROM conversion_stages cs
        LEFT JOIN leads l ON cs.stage_id = l.conversion_stage_id
          AND l.user_id = $1
          ${''}
        WHERE cs.is_active = true
        GROUP BY cs.stage_id, cs.stage_name, cs.stage_order
        ORDER BY cs.stage_order
      `, [userId]);
    });

    it('should apply date filter when provided', async () => {
      const userId = 100;
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';

      mockPool.query.mockResolvedValue({ rows: [] });

      await ConversionService.getConversionFunnel(userId, startDate, endDate);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND l.created_at BETWEEN $2 AND $3'),
        [userId, startDate, endDate]
      );
    });
  });

  describe('getLeadConversionHistory', () => {
    it('should return conversion history for lead', async () => {
      const leadId = 1;
      const mockHistory = [
        {
          event_id: 1,
          event_type: 'stage_change',
          event_data: '{"from":1,"to":2}',
          notes: 'Moving to qualified',
          created_at: '2025-01-12T10:00:00Z',
          from_stage: 'Initial Contact',
          to_stage: 'Qualified',
          first_name: 'John',
          last_name: 'Doe'
        }
      ];

      mockPool.query.mockResolvedValue({ rows: mockHistory });

      const result = await ConversionService.getLeadConversionHistory(leadId);

      expect(result).toEqual(mockHistory);
      expect(mockPool.query).toHaveBeenCalledWith(`
        SELECT
          ce.event_id,
          ce.event_type,
          ce.event_data,
          ce.notes,
          ce.created_at,
          cs_from.stage_name as from_stage,
          cs_to.stage_name as to_stage,
          u.first_name,
          u.last_name
        FROM conversion_events ce
        LEFT JOIN conversion_stages cs_from ON ce.from_stage_id = cs_from.stage_id
        LEFT JOIN conversion_stages cs_to ON ce.to_stage_id = cs_to.stage_id
        LEFT JOIN users u ON ce.user_id = u.user_id
        WHERE ce.lead_id = $1
        ORDER BY ce.created_at DESC
      `, [leadId]);
    });
  });

  describe('updateConversionMetrics', () => {
    it('should calculate and store conversion metrics', async () => {
      const userId = 100;
      const mockMetrics = {
        total_leads: 20,
        leads_in_pipeline: 15,
        leads_won: 3,
        leads_lost: 2,
        avg_deal_size: 75000,
        pipeline_value: 500000,
        avg_conversion_time: 30
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockMetrics] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await ConversionService.updateConversionMetrics(userId);

      expect(result.conversionRate).toBe(60); // 3/(3+2) * 100
      expect(result.total_leads).toBe(20);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conversion_metrics'),
        expect.arrayContaining([userId, expect.any(String), 20, 15, 60, 75000, 500000, 3, 2, 30])
      );
    });
  });

  describe('getConversionMetrics', () => {
    it('should return metrics for date range', async () => {
      const userId = 100;
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';
      const mockMetrics = [
        { metric_date: '2025-01-15', total_leads: 10, conversion_rate: 50 }
      ];

      mockPool.query.mockResolvedValue({ rows: mockMetrics });

      const result = await ConversionService.getConversionMetrics(userId, startDate, endDate);

      expect(result).toEqual(mockMetrics);
      expect(mockPool.query).toHaveBeenCalledWith(`
        SELECT *
        FROM conversion_metrics
        WHERE user_id = $1
          AND metric_date BETWEEN $2 AND $3
        ORDER BY metric_date
      `, [userId, startDate, endDate]);
    });
  });

  describe('getLeadsByStage', () => {
    it('should return leads for specific stage', async () => {
      const userId = 100;
      const stageId = 2;
      const mockLeads = [
        {
          lead_id: 1,
          first_name: 'John',
          last_name: 'Doe',
          stage_name: 'Qualified',
          stage_order: 2,
          last_stage_change: '2025-01-12T10:00:00Z'
        }
      ];

      mockPool.query.mockResolvedValue({ rows: mockLeads });

      const result = await ConversionService.getLeadsByStage(userId, stageId);

      expect(result).toEqual(mockLeads);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND l.conversion_stage_id = $2'),
        [userId, stageId]
      );
    });

    it('should return all leads when no stage specified', async () => {
      const userId = 100;
      const mockLeads = [
        { lead_id: 1, stage_name: 'Initial Contact' },
        { lead_id: 2, stage_name: 'Qualified' }
      ];

      mockPool.query.mockResolvedValue({ rows: mockLeads });

      const result = await ConversionService.getLeadsByStage(userId);

      expect(result).toEqual(mockLeads);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE l.user_id = $1'),
        [userId]
      );
    });
  });
});