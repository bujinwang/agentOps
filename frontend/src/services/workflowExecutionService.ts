import AsyncStorage from '@react-native-async-storage/async-storage';
import { communicationApiService } from './communicationApiService';
import leadScoringService from './LeadScoringService';
import notificationService from './notificationService';

export interface WorkflowStep {
  id: string;
  sequence: number;
  channel: 'email' | 'sms' | 'in_app';
  templateId: string;
  delayMinutes: number;
  conditions: StepCondition[];
  retryCount?: number;
  maxRetries?: number;
}

export interface StepCondition {
  type: 'lead_score' | 'engagement' | 'time_elapsed' | 'custom';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains' | 'not_contains';
  value: any;
  field?: string;
}

export interface WorkflowExecution {
  id: string;
  leadId: number;
  workflowId: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled' | 'error';
  currentStep: number;
  steps: WorkflowStep[];
  startedAt: Date;
  completedAt?: Date;
  nextExecutionTime?: Date;
  executionHistory: ExecutionRecord[];
  retryAttempts: number;
  maxRetries: number;
}

export interface ExecutionRecord {
  stepId: string;
  executedAt: Date;
  status: 'success' | 'failed' | 'retry' | 'skipped';
  errorMessage?: string;
  retryCount: number;
  channel: string;
  templateId: string;
  leadData: any;
}

export class WorkflowExecutionService {
  private static instance: WorkflowExecutionService;
  private communicationService: typeof communicationApiService;
  private leadScoringService: typeof leadScoringService;
  private notificationService: typeof notificationService;
  private executionQueue: WorkflowExecution[] = [];
  private isProcessing = false;
  private executionInterval: NodeJS.Timeout | null = null;

  private readonly STORAGE_KEYS = {
    EXECUTIONS: 'workflow_executions',
    QUEUE: 'workflow_execution_queue',
  };

  private constructor() {
    this.communicationService = communicationApiService;
    this.leadScoringService = leadScoringService;
    this.notificationService = notificationService;
    this.initializeExecutionEngine();
  }

  public static getInstance(): WorkflowExecutionService {
    if (!WorkflowExecutionService.instance) {
      WorkflowExecutionService.instance = new WorkflowExecutionService();
    }
    return WorkflowExecutionService.instance;
  }

  private async initializeExecutionEngine(): Promise<void> {
    try {
      // Load persisted executions
      await this.loadPersistedExecutions();

      // Start execution processor
      this.startExecutionProcessor();

      console.log('Workflow execution engine initialized');
    } catch (error) {
      console.error('Failed to initialize workflow execution engine:', error);
    }
  }

  private async loadPersistedExecutions(): Promise<void> {
    try {
      const executionsJson = await AsyncStorage.getItem(this.STORAGE_KEYS.EXECUTIONS);
      if (executionsJson) {
        const executions = JSON.parse(executionsJson);
        this.executionQueue = executions.map((exec: any) => ({
          ...exec,
          startedAt: new Date(exec.startedAt),
          completedAt: exec.completedAt ? new Date(exec.completedAt) : undefined,
          nextExecutionTime: exec.nextExecutionTime ? new Date(exec.nextExecutionTime) : undefined,
          executionHistory: exec.executionHistory.map((record: any) => ({
            ...record,
            executedAt: new Date(record.executedAt),
          })),
        }));
      }
    } catch (error) {
      console.error('Failed to load persisted executions:', error);
    }
  }

  private async persistExecutions(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.EXECUTIONS,
        JSON.stringify(this.executionQueue)
      );
    } catch (error) {
      console.error('Failed to persist executions:', error);
    }
  }

  private startExecutionProcessor(): void {
    // Process executions every 30 seconds
    this.executionInterval = setInterval(() => {
      this.processPendingExecutions();
    }, 30000);
  }

  private async processPendingExecutions(): Promise<void> {
    if (this.isProcessing || this.executionQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const now = new Date();
      const pendingExecutions = this.executionQueue.filter(
        exec => exec.status === 'active' &&
               (!exec.nextExecutionTime || exec.nextExecutionTime <= now)
      );

      for (const execution of pendingExecutions) {
        await this.executeNextStep(execution);
      }

      await this.persistExecutions();
    } catch (error) {
      console.error('Error processing pending executions:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  public async startWorkflowExecution(
    leadId: number,
    workflowId: string,
    steps: WorkflowStep[]
  ): Promise<string> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const execution: WorkflowExecution = {
      id: executionId,
      leadId,
      workflowId,
      status: 'active',
      currentStep: 0,
      steps,
      startedAt: new Date(),
      executionHistory: [],
      retryAttempts: 0,
      maxRetries: 3,
    };

    this.executionQueue.push(execution);
    await this.persistExecutions();

    console.log(`Started workflow execution: ${executionId} for lead ${leadId}`);

    // Execute first step immediately if no delay
    if (steps.length > 0 && steps[0].delayMinutes === 0) {
      await this.executeNextStep(execution);
    }

    return executionId;
  }

  private async executeNextStep(execution: WorkflowExecution): Promise<void> {
    if (execution.currentStep >= execution.steps.length) {
      execution.status = 'completed';
      execution.completedAt = new Date();
      console.log(`Workflow execution completed: ${execution.id}`);
      return;
    }

    const currentStep = execution.steps[execution.currentStep];

    try {
      // Check step conditions
      const conditionsMet = await this.evaluateStepConditions(currentStep, execution.leadId);
      if (!conditionsMet) {
        console.log(`Step conditions not met for execution ${execution.id}, step ${currentStep.id}`);
        execution.currentStep++;
        return;
      }

      // Execute the step
      await this.executeStep(currentStep, execution);

      // Move to next step
      execution.currentStep++;

      // Schedule next step if it exists and has delay
      if (execution.currentStep < execution.steps.length) {
        const nextStep = execution.steps[execution.currentStep];
        if (nextStep.delayMinutes > 0) {
          execution.nextExecutionTime = new Date(
            Date.now() + nextStep.delayMinutes * 60 * 1000
          );
        }
      }

    } catch (error) {
      console.error(`Error executing step ${currentStep.id}:`, error);
      await this.handleExecutionError(execution, currentStep, error as Error);
    }
  }

  private async evaluateStepConditions(step: WorkflowStep, leadId: number): Promise<boolean> {
    for (const condition of step.conditions) {
      const result = await this.evaluateCondition(condition, leadId);
      if (!result) {
        return false;
      }
    }
    return true;
  }

  private async evaluateCondition(condition: StepCondition, leadId: number): Promise<boolean> {
    try {
      let actualValue: any;

      switch (condition.type) {
        case 'lead_score':
          const leadScore = await this.leadScoringService.getLeadScore(leadId);
          actualValue = leadScore?.score || 0;
          break;

        case 'engagement':
          // Get engagement metrics from lead data
          const leadData = await this.leadScoringService.getLeadById(leadId);
          actualValue = leadData?.engagement || 0;
          break;

        case 'time_elapsed':
          // Calculate time since workflow started
          const workflowStart = new Date(); // This would come from execution context
          actualValue = Date.now() - workflowStart.getTime();
          break;

        case 'custom':
          // Custom field evaluation
          if (condition.field) {
            const leadData = await this.leadScoringService.getLeadById(leadId);
            actualValue = leadData?.[condition.field] || null;
          }
          break;

        default:
          return false;
      }

      return this.compareValues(actualValue, condition.operator, condition.value);
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  }

  private compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'gt':
        return actual > expected;
      case 'lt':
        return actual < expected;
      case 'eq':
        return actual === expected;
      case 'gte':
        return actual >= expected;
      case 'lte':
        return actual <= expected;
      case 'contains':
        return String(actual).includes(String(expected));
      case 'not_contains':
        return !String(actual).includes(String(expected));
      default:
        return false;
    }
  }

  private async executeStep(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    const leadData = await this.leadScoringService.getLeadById(execution.leadId);
    if (!leadData) {
      throw new Error(`Lead not found: ${execution.leadId}`);
    }

    const executionRecord: ExecutionRecord = {
      stepId: step.id,
      executedAt: new Date(),
      status: 'success',
      retryCount: 0,
      channel: step.channel,
      templateId: step.templateId,
      leadData,
    };

    try {
      switch (step.channel) {
        case 'email':
          await this.communicationService.sendEmail(
            leadData.email,
            step.templateId,
            leadData
          );
          break;

        case 'sms':
          await this.communicationService.sendSMS(
            leadData.phone,
            step.templateId,
            leadData
          );
          break;

        case 'in_app':
          await this.notificationService.sendInAppNotification(
            execution.leadId,
            step.templateId,
            leadData
          );
          break;
      }

      execution.executionHistory.push(executionRecord);
      console.log(`Successfully executed step ${step.id} for lead ${execution.leadId}`);

    } catch (error) {
      executionRecord.status = 'failed';
      executionRecord.errorMessage = (error as Error).message;
      execution.executionHistory.push(executionRecord);
      throw error;
    }
  }

  private async handleExecutionError(
    execution: WorkflowExecution,
    step: WorkflowStep,
    error: Error
  ): Promise<void> {
    const retryCount = step.retryCount || 0;
    const maxRetries = step.maxRetries || execution.maxRetries;

    if (retryCount < maxRetries) {
      // Schedule retry with exponential backoff
      const retryDelay = Math.min(30000 * Math.pow(2, retryCount), 300000); // Max 5 minutes
      execution.nextExecutionTime = new Date(Date.now() + retryDelay);

      // Update step retry count
      step.retryCount = retryCount + 1;

      // Add retry record to history
      const retryRecord: ExecutionRecord = {
        stepId: step.id,
        executedAt: new Date(),
        status: 'retry',
        errorMessage: `Retry ${retryCount + 1}/${maxRetries}: ${error.message}`,
        retryCount: retryCount + 1,
        channel: step.channel,
        templateId: step.templateId,
        leadData: {},
      };

      execution.executionHistory.push(retryRecord);
      console.log(`Scheduled retry for step ${step.id}, attempt ${retryCount + 1}`);
    } else {
      // Max retries exceeded
      execution.status = 'error';
      console.error(`Max retries exceeded for step ${step.id}:`, error);
    }
  }

  public async pauseWorkflowExecution(executionId: string): Promise<void> {
    const execution = this.executionQueue.find(exec => exec.id === executionId);
    if (execution) {
      execution.status = 'paused';
      await this.persistExecutions();
      console.log(`Paused workflow execution: ${executionId}`);
    }
  }

  public async resumeWorkflowExecution(executionId: string): Promise<void> {
    const execution = this.executionQueue.find(exec => exec.id === executionId);
    if (execution && execution.status === 'paused') {
      execution.status = 'active';
      execution.nextExecutionTime = new Date(); // Execute immediately
      await this.persistExecutions();
      console.log(`Resumed workflow execution: ${executionId}`);
    }
  }

  public async cancelWorkflowExecution(executionId: string): Promise<void> {
    const execution = this.executionQueue.find(exec => exec.id === executionId);
    if (execution) {
      execution.status = 'cancelled';
      execution.completedAt = new Date();
      await this.persistExecutions();
      console.log(`Cancelled workflow execution: ${executionId}`);
    }
  }

  public getWorkflowExecution(executionId: string): WorkflowExecution | undefined {
    return this.executionQueue.find(exec => exec.id === executionId);
  }

  public getActiveExecutions(): WorkflowExecution[] {
    return this.executionQueue.filter(exec => exec.status === 'active');
  }

  public async cleanup(): Promise<void> {
    if (this.executionInterval) {
      clearInterval(this.executionInterval);
      this.executionInterval = null;
    }

    // Remove completed executions older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.executionQueue = this.executionQueue.filter(exec =>
      exec.status !== 'completed' || exec.completedAt! > thirtyDaysAgo
    );

    await this.persistExecutions();
  }
}