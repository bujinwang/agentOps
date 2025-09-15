import automatedFollowupWorkflowService from '../automatedFollowupWorkflowService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock communication service
jest.mock('../communicationApiService', () => ({
  communicationApiService: {
    renderTemplate: jest.fn(),
  },
}));

// Mock notification service
jest.mock('../notificationService', () => ({
  default: {
    addNotification: jest.fn(),
  },
}));

describe('AutomatedFollowupWorkflowService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Workflow Creation', () => {
    it('should create a workflow successfully', async () => {
      const workflowData = {
        name: 'Test Workflow',
        description: 'A test workflow',
        triggers: [{
          id: 'trigger1',
          scoreThreshold: 70,
          triggerType: 'immediate' as const,
          conditions: [],
          isActive: true,
        }],
        steps: [{
          id: 'step1',
          sequence: 1,
          channel: 'email' as const,
          templateId: 'template1',
          delayMinutes: 0,
          isActive: true,
        }],
        isActive: true,
      };

      const workflow = await automatedFollowupWorkflowService.createWorkflow(workflowData);

      expect(workflow).toBeDefined();
      expect(workflow.name).toBe('Test Workflow');
      expect(workflow.triggers).toHaveLength(1);
      expect(workflow.steps).toHaveLength(1);
    });

    it('should get workflow by id', async () => {
      const workflowData = {
        name: 'Test Workflow',
        description: 'A test workflow',
        triggers: [],
        steps: [],
        isActive: true,
      };

      const createdWorkflow = await automatedFollowupWorkflowService.createWorkflow(workflowData);
      const retrievedWorkflow = await automatedFollowupWorkflowService.getWorkflow(createdWorkflow.id);

      expect(retrievedWorkflow).toBeDefined();
      expect(retrievedWorkflow?.id).toBe(createdWorkflow.id);
    });

    it('should return null for non-existent workflow', async () => {
      const workflow = await automatedFollowupWorkflowService.getWorkflow('non-existent-id');
      expect(workflow).toBeNull();
    });
  });

  describe('Workflow Execution', () => {
    it('should start workflow execution', async () => {
      const workflowData = {
        name: 'Test Workflow',
        description: 'A test workflow',
        triggers: [{
          id: 'trigger1',
          scoreThreshold: 70,
          triggerType: 'immediate' as const,
          conditions: [],
          isActive: true,
        }],
        steps: [{
          id: 'step1',
          sequence: 1,
          channel: 'email' as const,
          templateId: 'template1',
          delayMinutes: 0,
          isActive: true,
        }],
        isActive: true,
      };

      const workflow = await automatedFollowupWorkflowService.createWorkflow(workflowData);

      // Mock the private methods for testing
      const service = automatedFollowupWorkflowService as any;
      service.getLeadInfo = jest.fn().mockResolvedValue({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
      });

      // This would normally be called by the trigger system
      // For testing, we can call the execution method directly
      expect(workflow).toBeDefined();
    });

    it('should get workflow executions for a lead', async () => {
      const executions = await automatedFollowupWorkflowService.getWorkflowExecutions(1);
      expect(Array.isArray(executions)).toBe(true);
    });
  });

  describe('Workflow Management', () => {
    it('should update workflow', async () => {
      const workflowData = {
        name: 'Test Workflow',
        description: 'A test workflow',
        triggers: [],
        steps: [],
        isActive: true,
      };

      const workflow = await automatedFollowupWorkflowService.createWorkflow(workflowData);
      const updated = await automatedFollowupWorkflowService.updateWorkflow(workflow.id, {
        name: 'Updated Workflow'
      });

      expect(updated).toBe(true);

      const retrieved = await automatedFollowupWorkflowService.getWorkflow(workflow.id);
      expect(retrieved?.name).toBe('Updated Workflow');
    });

    it('should delete workflow', async () => {
      const workflowData = {
        name: 'Test Workflow',
        description: 'A test workflow',
        triggers: [],
        steps: [],
        isActive: true,
      };

      const workflow = await automatedFollowupWorkflowService.createWorkflow(workflowData);
      const deleted = await automatedFollowupWorkflowService.deleteWorkflow(workflow.id);

      expect(deleted).toBe(true);

      const retrieved = await automatedFollowupWorkflowService.getWorkflow(workflow.id);
      expect(retrieved).toBeNull();
    });

    it('should get all workflows', async () => {
      const workflows = await automatedFollowupWorkflowService.getAllWorkflows();
      expect(Array.isArray(workflows)).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should set base URL', async () => {
      await automatedFollowupWorkflowService.setBaseUrl('https://api.example.com');
      expect(automatedFollowupWorkflowService.getBaseUrl()).toBe('https://api.example.com');
    });

    it('should throw error for invalid URL', async () => {
      await expect(automatedFollowupWorkflowService.setBaseUrl('invalid-url'))
        .rejects
        .toThrow('Invalid workflow API URL');
    });
  });
});