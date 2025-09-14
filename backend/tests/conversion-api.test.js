const request = require('supertest');
const express = require('express');
const conversionRouter = require('../src/routes/conversion');
const ConversionService = require('../src/services/ConversionService');

// Mock the ConversionService
jest.mock('../src/services/ConversionService', () => ({
  getConversionStages: jest.fn(),
  updateLeadStage: jest.fn(),
  updateConversionProbability: jest.fn(),
  getConversionFunnel: jest.fn(),
  getLeadConversionHistory: jest.fn(),
  getConversionMetrics: jest.fn(),
  updateConversionMetrics: jest.fn(),
  getLeadsByStage: jest.fn(),
}));

// Mock authentication middleware
jest.mock('../src/middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { userId: 100 };
    next();
  },
}));

const app = express();
app.use(express.json());
app.use('/api/conversion', conversionRouter);

describe('Conversion API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/conversion/stages', () => {
    it('should return conversion stages successfully', async () => {
      const mockStages = [
        { stage_id: 1, stage_name: 'Initial Contact', stage_order: 1 },
        { stage_id: 2, stage_name: 'Qualified', stage_order: 2 },
      ];

      ConversionService.getConversionStages.mockResolvedValue(mockStages);

      const response = await request(app)
        .get('/api/conversion/stages')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStages
      });
      expect(ConversionService.getConversionStages).toHaveBeenCalled();
    });

    it('should handle errors when fetching stages', async () => {
      ConversionService.getConversionStages.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/conversion/stages')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch conversion stages'
      });
    });
  });

  describe('PUT /api/conversion/leads/:leadId/stage', () => {
    it('should update lead stage successfully', async () => {
      const leadId = 1;
      const stageId = 2;
      const notes = 'Moving to qualified';
      const mockUpdatedLead = {
        lead_id: leadId,
        conversion_stage_id: stageId,
        updated_at: '2025-01-12T16:46:00Z'
      };

      ConversionService.updateLeadStage.mockResolvedValue(mockUpdatedLead);

      const response = await request(app)
        .put(`/api/conversion/leads/${leadId}/stage`)
        .send({ stageId, notes })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUpdatedLead,
        message: 'Lead conversion stage updated successfully'
      });
      expect(ConversionService.updateLeadStage).toHaveBeenCalledWith(
        leadId,
        stageId,
        100, // userId from mock auth
        notes
      );
    });

    it('should return 400 when stageId is missing', async () => {
      const response = await request(app)
        .put('/api/conversion/leads/1/stage')
        .send({ notes: 'Test notes' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Stage ID is required'
      });
    });

    it('should handle errors when updating stage', async () => {
      ConversionService.updateLeadStage.mockRejectedValue(new Error('Update failed'));

      const response = await request(app)
        .put('/api/conversion/leads/1/stage')
        .send({ stageId: 2 })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to update lead conversion stage'
      });
    });
  });

  describe('PUT /api/conversion/leads/:leadId/probability', () => {
    it('should update conversion probability successfully', async () => {
      const leadId = 1;
      const probability = 0.75;
      const notes = 'High probability';
      const mockUpdatedLead = {
        lead_id: leadId,
        conversion_probability: probability
      };

      ConversionService.updateConversionProbability.mockResolvedValue(mockUpdatedLead);

      const response = await request(app)
        .put(`/api/conversion/leads/${leadId}/probability`)
        .send({ probability, notes })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUpdatedLead,
        message: 'Lead conversion probability updated successfully'
      });
      expect(ConversionService.updateConversionProbability).toHaveBeenCalledWith(
        leadId,
        probability,
        100,
        notes
      );
    });

    it('should return 400 for invalid probability values', async () => {
      const testCases = [
        { probability: -0.1, expected: 'Probability must be between 0 and 1' },
        { probability: 1.5, expected: 'Probability must be between 0 and 1' },
        { probability: undefined, expected: 'Probability must be between 0 and 1' },
      ];

      for (const { probability, expected } of testCases) {
        const response = await request(app)
          .put('/api/conversion/leads/1/probability')
          .send({ probability })
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error: expected
        });
      }
    });
  });

  describe('GET /api/conversion/funnel', () => {
    it('should return conversion funnel data', async () => {
      const mockFunnelData = [
        { stage_name: 'Initial Contact', lead_count: 10, avg_probability: 0.2 },
        { stage_name: 'Qualified', lead_count: 5, avg_probability: 0.6 },
      ];

      ConversionService.getConversionFunnel.mockResolvedValue(mockFunnelData);

      const response = await request(app)
        .get('/api/conversion/funnel')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockFunnelData
      });
      expect(ConversionService.getConversionFunnel).toHaveBeenCalledWith(
        100, // userId
        undefined,
        undefined
      );
    });

    it('should pass date filters to service', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';

      ConversionService.getConversionFunnel.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/conversion/funnel')
        .query({ startDate, endDate })
        .expect(200);

      expect(ConversionService.getConversionFunnel).toHaveBeenCalledWith(
        100,
        startDate,
        endDate
      );
    });
  });

  describe('GET /api/conversion/leads/:leadId/history', () => {
    it('should return lead conversion history', async () => {
      const leadId = 1;
      const mockHistory = [
        {
          event_id: 1,
          event_type: 'stage_change',
          from_stage: 'Initial Contact',
          to_stage: 'Qualified',
          created_at: '2025-01-12T10:00:00Z'
        }
      ];

      ConversionService.getLeadConversionHistory.mockResolvedValue(mockHistory);

      const response = await request(app)
        .get(`/api/conversion/leads/${leadId}/history`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockHistory
      });
      expect(ConversionService.getLeadConversionHistory).toHaveBeenCalledWith(leadId);
    });
  });

  describe('GET /api/conversion/metrics', () => {
    it('should return conversion metrics for date range', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';
      const mockMetrics = [
        { metric_date: '2025-01-15', total_leads: 10, conversion_rate: 50 }
      ];

      ConversionService.getConversionMetrics.mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/api/conversion/metrics')
        .query({ startDate, endDate })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockMetrics
      });
      expect(ConversionService.getConversionMetrics).toHaveBeenCalledWith(
        100,
        startDate,
        endDate
      );
    });

    it('should return 400 when dates are missing', async () => {
      const response = await request(app)
        .get('/api/conversion/metrics')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Start date and end date are required'
      });
    });
  });

  describe('POST /api/conversion/metrics/update', () => {
    it('should update conversion metrics successfully', async () => {
      const mockMetrics = {
        total_leads: 20,
        conversion_rate: 60,
        date: '2025-01-12'
      };

      ConversionService.updateConversionMetrics.mockResolvedValue(mockMetrics);

      const response = await request(app)
        .post('/api/conversion/metrics/update')
        .send({ date: '2025-01-12' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockMetrics,
        message: 'Conversion metrics updated successfully'
      });
      expect(ConversionService.updateConversionMetrics).toHaveBeenCalledWith(
        100,
        '2025-01-12'
      );
    });

    it('should handle optional date parameter', async () => {
      ConversionService.updateConversionMetrics.mockResolvedValue({});

      const response = await request(app)
        .post('/api/conversion/metrics/update')
        .send({})
        .expect(200);

      expect(ConversionService.updateConversionMetrics).toHaveBeenCalledWith(
        100,
        undefined
      );
    });
  });

  describe('GET /api/conversion/leads', () => {
    it('should return leads by stage', async () => {
      const stageId = 2;
      const mockLeads = [
        { lead_id: 1, stage_name: 'Qualified', stage_order: 2 }
      ];

      ConversionService.getLeadsByStage.mockResolvedValue(mockLeads);

      const response = await request(app)
        .get('/api/conversion/leads')
        .query({ stageId })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockLeads
      });
      expect(ConversionService.getLeadsByStage).toHaveBeenCalledWith(100, stageId);
    });

    it('should return all leads when no stage specified', async () => {
      const mockLeads = [
        { lead_id: 1, stage_name: 'Initial Contact' },
        { lead_id: 2, stage_name: 'Qualified' }
      ];

      ConversionService.getLeadsByStage.mockResolvedValue(mockLeads);

      const response = await request(app)
        .get('/api/conversion/leads')
        .expect(200);

      expect(ConversionService.getLeadsByStage).toHaveBeenCalledWith(100, null);
    });
  });
});