import { WorkflowExecutionService } from '../workflowExecutionService';
import { communicationApiService } from '../communicationApiService';
import leadScoringService from '../LeadScoringService';
import notificationService from '../notificationService';

// Mock the dependencies
jest.mock('../communicationApiService');
jest.mock('../LeadScoringService');
jest.mock('../notificationService');
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('WorkflowExecutionService', () => {
  let service: WorkflowExecutionService;
  let mockCommunicationService: jest.Mocked<typeof communicationApiService>;
  let mockLeadScoringService: jest.Mocked<typeof leadScoringService>;
  let mockNotificationService: jest.Mocked<typeof notificationService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mocks
    mockCommunicationService = communicationApiService as jest.Mocked<typeof communicationApiService>;
    mockLeadScoringService = leadScoringService as jest.Mocked<typeof leadScoringService>;
    mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;

    // Mock successful responses
    mockCommunicationService.sendEmail.mockResolvedValue({ success: true, data: {} });
    mockCommunicationService.sendSMS.mockResolvedValue({ success: true, data: {} });
    mockNotificationService.sendInAppNotification.mockResolvedValue(undefined);

    mockLeadScoringService.getLeadScore.mockResolvedValue({
      id: 'score_1',
      leadId: 1,
      totalScore: 85,
      grade: 'A',
      confidence: 90,
      factors: [],
      recommendations: [],
      calculatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    mockLeadScoringService.getLeadById.mockResolvedValue({
      id: 1,
      name: 'Test Lead',
      email: 'test@example.com',
      phone: '555-0123',
      budget: 500000,
      timeline: '3-6 months',
      propertyType: 'single-family',
      location: 'Downtown',
      qualificationStatus: 'qualified',
      engagementScore: 80,
      inquiryCount: 2,
      lastActivity: new Date().toISOString(),
    });

    // Create service instance
    service = WorkflowExecutionService.getInstance();
  });

  afterEach(() => {
    // Clean up service
    service.cleanup();
  });

  describe('startWorkflowExecution', () => {
    it('should start a workflow execution successfully', async () => {
      const steps = [
        {
          id: 'step1',
          sequence: 1,
          channel: 'email' as const,
          templateId: 'welcome-template',
          delayMinutes: 0,
          conditions: [],
        },
      ];

      const executionId = await service.startWorkflowExecution(1, 'workflow1', steps);

      expect(executionId).toBeDefined();
      expect(typeof executionId).toBe('string');
      expect(executionId.startsWith('exec_')).toBe(true);
    });

    it('should execute immediate steps without delay', async () => {
      const steps = [
        {
          id: 'step1',
          sequence: 1,
          channel: 'email' as const,
          templateId: 'welcome-template',
          delayMinutes: 0,
          conditions: [],
        },
      ];

      await service.startWorkflowExecution(1, 'workflow1', steps);

      expect(mockCommunicationService.sendEmail).toHaveBeenCalledWith(
        'test@example.com',
        'welcome-template',
        expect.any(Object)
      );
    });

    it('should schedule delayed steps', async () => {
      const steps = [
        {
          id: 'step1',
          sequence: 1,
          channel: 'email' as const,
          templateId: 'welcome-template',
          delayMinutes: 5,
          conditions: [],
        },
      ];

      await service.startWorkflowExecution(1, 'workflow1', steps);

      // Email should not be sent immediately due to delay
      expect(mockCommunicationService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('step execution', () => {
    it('should execute email steps correctly', async () => {
      const steps = [
        {
          id: 'email-step',
          sequence: 1,
          channel: 'email' as const,
          templateId: 'email-template',
          delayMinutes: 0,
          conditions: [],
        },
      ];

      await service.startWorkflowExecution(1, 'workflow1', steps);

      expect(mockCommunicationService.sendEmail).toHaveBeenCalledWith(
        'test@example.com',
        'email-template',
        expect.objectContaining({
          id: 1,
          name: 'Test Lead',
          email: 'test@example.com',
        })
      );
    });

    it('should execute SMS steps correctly', async () => {
      const steps = [
        {
          id: 'sms-step',
          sequence: 1,
          channel: 'sms' as const,
          templateId: 'sms-template',
          delayMinutes: 0,
          conditions: [],
        },
      ];

      await service.startWorkflowExecution(1, 'workflow1', steps);

      expect(mockCommunicationService.sendSMS).toHaveBeenCalledWith(
        '555-0123',
        'sms-template',
        expect.any(Object)
      );
    });

    it('should execute in-app notification steps correctly', async () => {
      const steps = [
        {
          id: 'notification-step',
          sequence: 1,
          channel: 'in_app' as const,
          templateId: 'notification-template',
          delayMinutes: 0,
          conditions: [],
        },
      ];

      await service.startWorkflowExecution(1, 'workflow1', steps);

      expect(mockNotificationService.sendInAppNotification).toHaveBeenCalledWith(
        1,
        'notification-template',
        expect.any(Object)
      );
    });
  });

  describe('condition evaluation', () => {
    it('should skip steps when conditions are not met', async () => {
      const steps = [
        {
          id: 'conditional-step',
          sequence: 1,
          channel: 'email' as const,
          templateId: 'conditional-template',
          delayMinutes: 0,
          conditions: [
            {
              type: 'lead_score' as const,
              operator: 'gt' as const,
              value: 90,
            },
          ],
        },
      ];

      await service.startWorkflowExecution(1, 'workflow1', steps);

      // Email should not be sent because lead score (85) is not > 90
      expect(mockCommunicationService.sendEmail).not.toHaveBeenCalled();
    });

    it('should execute steps when conditions are met', async () => {
      const steps = [
        {
          id: 'conditional-step',
          sequence: 1,
          channel: 'email' as const,
          templateId: 'conditional-template',
          delayMinutes: 0,
          conditions: [
            {
              type: 'lead_score' as const,
              operator: 'lt' as const,
              value: 90,
            },
          ],
        },
      ];

      await service.startWorkflowExecution(1, 'workflow1', steps);

      // Email should be sent because lead score (85) is < 90
      expect(mockCommunicationService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle communication service errors', async () => {
      mockCommunicationService.sendEmail.mockRejectedValue(new Error('Email service unavailable'));

      const steps = [
        {
          id: 'error-step',
          sequence: 1,
          channel: 'email' as const,
          templateId: 'error-template',
          delayMinutes: 0,
          conditions: [],
        },
      ];

      await service.startWorkflowExecution(1, 'workflow1', steps);

      // Should still record the attempt in execution history
      const execution = service.getWorkflowExecution(await service.startWorkflowExecution(1, 'workflow1', steps));
      expect(execution?.executionHistory.length).toBeGreaterThan(0);
    });

    it('should retry failed steps', async () => {
      mockCommunicationService.sendEmail
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ success: true, data: {} });

      const steps = [
        {
          id: 'retry-step',
          sequence: 1,
          channel: 'email' as const,
          templateId: 'retry-template',
          delayMinutes: 0,
          conditions: [],
          maxRetries: 2,
        },
      ];

      await service.startWorkflowExecution(1, 'workflow1', steps);

      // Should be called twice: initial attempt + 1 retry
      expect(mockCommunicationService.sendEmail).toHaveBeenCalledTimes(2);
    });
  });

  describe('workflow management', () => {
    it('should pause workflow execution', async () => {
      const steps = [
        {
          id: 'pause-step',
          sequence: 1,
          channel: 'email' as const,
          templateId: 'pause-template',
          delayMinutes: 0,
          conditions: [],
        },
      ];

      const executionId = await service.startWorkflowExecution(1, 'workflow1', steps);
      await service.pauseWorkflowExecution(executionId);

      const execution = service.getWorkflowExecution(executionId);
      expect(execution?.status).toBe('paused');
    });

    it('should resume workflow execution', async () => {
      const steps = [
        {
          id: 'resume-step',
          sequence: 1,
          channel: 'email' as const,
          templateId: 'resume-template',
          delayMinutes: 0,
          conditions: [],
        },
      ];

      const executionId = await service.startWorkflowExecution(1, 'workflow1', steps);
      await service.pauseWorkflowExecution(executionId);
      await service.resumeWorkflowExecution(executionId);

      const execution = service.getWorkflowExecution(executionId);
      expect(execution?.status).toBe('active');
    });

    it('should cancel workflow execution', async () => {
      const steps = [
        {
          id: 'cancel-step',
          sequence: 1,
          channel: 'email' as const,
          templateId: 'cancel-template',
          delayMinutes: 0,
          conditions: [],
        },
      ];

      const executionId = await service.startWorkflowExecution(1, 'workflow1', steps);
      await service.cancelWorkflowExecution(executionId);

      const execution = service.getWorkflowExecution(executionId);
      expect(execution?.status).toBe('cancelled');
      expect(execution?.completedAt).toBeDefined();
    });
  });

  describe('active executions', () => {
    it('should return only active executions', async () => {
      const steps = [
        {
          id: 'active-step',
          sequence: 1,
          channel: 'email' as const,
          templateId: 'active-template',
          delayMinutes: 0,
          conditions: [],
        },
      ];

      const executionId1 = await service.startWorkflowExecution(1, 'workflow1', steps);
      const executionId2 = await service.startWorkflowExecution(2, 'workflow2', steps);

      await service.cancelWorkflowExecution(executionId1);

      const activeExecutions = service.getActiveExecutions();
      expect(activeExecutions.length).toBe(1);
      expect(activeExecutions[0].id).toBe(executionId2);
    });
  });
});