// Workflow Service Tests
// Tests for automated follow-up workflow trigger logic

const WorkflowService = require('../WorkflowService');
const { pool } = require('../../config/database');

jest.mock('../../config/database');

describe('WorkflowService', () => {
  let mockPool;

  beforeEach(() => {
    mockPool = {
      query: jest.fn()
    };
    pool.mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkWorkflowTriggers', () => {
    it('should trigger workflows when score matches criteria', async () => {
      const mockWorkflows = [
        { workflow_id: 1, name: 'High Value Follow-up', trigger_score_min: 70 }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockWorkflows }) // getActiveWorkflowsForScore
        .mockResolvedValueOnce({ rows: [] }) // getExistingExecution
        .mockResolvedValueOnce({ rows: [{ sequence_id: 1, delay_hours: 0 }] }) // getFirstSequenceStep
        .mockResolvedValueOnce({ rows: [{ execution_id: 1 }] }); // triggerWorkflow insert

      const result = await WorkflowService.checkWorkflowTriggers(123, 85, 456);

      expect(result.triggered).toBe(true);
      expect(result.workflows).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledTimes(4);
    });

    it('should not trigger when no workflows match score', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // No matching workflows

      const result = await WorkflowService.checkWorkflowTriggers(123, 50, 456);

      expect(result.triggered).toBe(false);
      expect(result.workflows).toHaveLength(0);
    });

    it('should not trigger if workflow already executed for lead', async () => {
      const mockWorkflows = [
        { workflow_id: 1, name: 'High Value Follow-up', trigger_score_min: 70 }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockWorkflows }) // getActiveWorkflowsForScore
        .mockResolvedValueOnce({ rows: [{ execution_id: 1 }] }); // getExistingExecution - already exists

      const result = await WorkflowService.checkWorkflowTriggers(123, 85, 456);

      expect(result.triggered).toBe(false);
      expect(result.workflows).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await WorkflowService.checkWorkflowTriggers(123, 85, 456);

      expect(result.triggered).toBe(false);
      expect(result.workflows).toHaveLength(0);
      expect(result.error).toBe('Database connection failed');
    });
  });

  describe('getActiveWorkflowsForScore', () => {
    it('should return workflows matching score criteria', async () => {
      const mockWorkflows = [
        { workflow_id: 1, name: 'High Value', trigger_score_min: 70, trigger_score_max: null }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockWorkflows });

      const result = await WorkflowService.getActiveWorkflowsForScore(456, 85);

      expect(result).toHaveLength(1);
      expect(result[0].workflow_id).toBe(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM workflow_configurations'),
        [456, 85]
      );
    });

    it('should filter out inactive workflows', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await WorkflowService.getActiveWorkflowsForScore(456, 85);

      expect(result).toHaveLength(0);
    });
  });

  describe('triggerWorkflow', () => {
    it('should successfully trigger a new workflow', async () => {
      const mockWorkflow = { workflow_id: 1, name: 'Test Workflow' };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // No existing execution
        .mockResolvedValueOnce({ rows: [{ sequence_id: 1, delay_hours: 2 }] }) // First step
        .mockResolvedValueOnce({ rows: [{ execution_id: 123 }] }); // Insert execution

      const result = await WorkflowService.triggerWorkflow(mockWorkflow, 456);

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });

    it('should return false if no sequence steps exist', async () => {
      const mockWorkflow = { workflow_id: 1, name: 'Test Workflow' };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // No existing execution
        .mockResolvedValueOnce({ rows: [] }); // No sequence steps

      const result = await WorkflowService.triggerWorkflow(mockWorkflow, 456);

      expect(result).toBe(false);
    });
  });

  describe('processPendingExecutions', () => {
    it('should process pending executions due for execution', async () => {
      const mockExecutions = [
        {
          execution_id: 1,
          workflow_id: 1,
          lead_id: 123,
          sequence_id: 1,
          action_type: 'email',
          template_id: 1
        }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockExecutions }) // Get pending executions
        .mockResolvedValueOnce({ rows: [] }) // Update status to in_progress
        .mockResolvedValueOnce({ rows: [] }); // Update status to completed

      const result = await WorkflowService.processPendingExecutions();

      expect(result.processed).toBe(1);
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });

    it('should handle empty pending executions list', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await WorkflowService.processPendingExecutions();

      expect(result.processed).toBe(0);
    });
  });

  describe('executeWorkflowStep', () => {
    it('should execute email action successfully', async () => {
      const mockExecution = {
        execution_id: 1,
        action_type: 'email',
        lead_id: 123,
        workflow_id: 1,
        sequence_id: 1
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // Update to in_progress
        .mockResolvedValueOnce({ rows: [] }); // Update to completed

      await WorkflowService.executeWorkflowStep(mockExecution);

      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should handle execution failures gracefully', async () => {
      const mockExecution = {
        execution_id: 1,
        action_type: 'email',
        lead_id: 123,
        workflow_id: 1,
        sequence_id: 1
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // Update to in_progress
        .mockRejectedValueOnce(new Error('Email service unavailable')) // Execution fails
        .mockResolvedValueOnce({ rows: [] }); // Update to failed

      await WorkflowService.executeWorkflowStep(mockExecution);

      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });
  });
});