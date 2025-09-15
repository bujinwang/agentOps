// Automated Follow-up Workflow Service
// Handles automated follow-up sequences triggered by lead scoring

import AsyncStorage from '@react-native-async-storage/async-storage';
import leadScoringService from './LeadScoringService';
import notificationService from './notificationService';
import { communicationApiService } from './communicationApiService';

export interface WorkflowTrigger {
  id: string;
  scoreThreshold: number;
  triggerType: 'immediate' | 'delayed';
  delayMinutes?: number;
  conditions: WorkflowCondition[];
  isActive: boolean;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'between';
  value: any;
  weight?: number;
}

export interface WorkflowStep {
  id: string;
  sequence: number;
  channel: 'email' | 'sms' | 'in_app';
  templateId: string;
  delayMinutes: number;
  conditions?: WorkflowCondition[];
  isActive: boolean;
}

export interface WorkflowExecution {
  id: string;
  leadId: number;
  workflowId: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  currentStep: number;
  startedAt: Date;
  completedAt?: Date;
  executedSteps: WorkflowExecutionStep[];
}

export interface WorkflowExecutionStep {
  stepId: string;
  executedAt: Date;
  status: 'sent' | 'failed' | 'skipped';
  channel: 'email' | 'sms' | 'in_app';
  templateId: string;
  errorMessage?: string;
}

export interface FollowupWorkflow {
  id: string;
  name: string;
  description: string;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  performance: WorkflowPerformance;
}

export interface WorkflowPerformance {
  totalExecutions: number;
  successfulCompletions: number;
  averageCompletionTime: number;
  conversionRate: number;
  lastExecuted?: Date;
}

class AutomatedFollowupWorkflowService {
  private baseUrl: string;
  private workflows: Map<string, FollowupWorkflow> = new Map();
  private activeExecutions: Map<string, WorkflowExecution> = new Map();
  private readonly WORKFLOW_STORAGE_KEY = '@followup_workflows';
  private readonly EXECUTION_STORAGE_KEY = '@workflow_executions';
  private readonly BASE_URL_KEY = '@workflow_base_url';

  constructor() {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      // Get base URL from environment or secure storage
      const envBaseUrl = process.env.EXPO_PUBLIC_WORKFLOW_API_URL ||
                        process.env.WORKFLOW_API_URL ||
                        'http://localhost:5678/webhook';

      const storedBaseUrl = await AsyncStorage.getItem(this.BASE_URL_KEY);
      this.baseUrl = storedBaseUrl || envBaseUrl;

      // Load persisted workflows and executions
      await this.loadPersistedData();

      // Start monitoring for score changes
      this.startScoreMonitoring();
    } catch (error) {
      console.error('Failed to initialize AutomatedFollowupWorkflowService:', error);
    }
  }

  private async loadPersistedData(): Promise<void> {
    try {
      const workflowsData = await AsyncStorage.getItem(this.WORKFLOW_STORAGE_KEY);
      if (workflowsData) {
        const workflows = JSON.parse(workflowsData);
        workflows.forEach((workflow: FollowupWorkflow) => {
          this.workflows.set(workflow.id, workflow);
        });
      }

      const executionsData = await AsyncStorage.getItem(this.EXECUTION_STORAGE_KEY);
      if (executionsData) {
        const executions = JSON.parse(executionsData);
        executions.forEach((execution: WorkflowExecution) => {
          this.activeExecutions.set(execution.id, execution);
        });
      }
    } catch (error) {
      console.error('Failed to load persisted workflow data:', error);
    }
  }

  private async savePersistedData(): Promise<void> {
    try {
      const workflows = Array.from(this.workflows.values());
      await AsyncStorage.setItem(this.WORKFLOW_STORAGE_KEY, JSON.stringify(workflows));

      const executions = Array.from(this.activeExecutions.values());
      await AsyncStorage.setItem(this.EXECUTION_STORAGE_KEY, JSON.stringify(executions));
    } catch (error) {
      console.error('Failed to save workflow data:', error);
    }
  }

  private startScoreMonitoring(): void {
    // Set up periodic monitoring for lead score changes
    setInterval(async () => {
      await this.checkForWorkflowTriggers();
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Initial check
    this.checkForWorkflowTriggers();
  }

  private async checkForWorkflowTriggers(): Promise<void> {
    try {
      // Get all active workflows
      const activeWorkflows = Array.from(this.workflows.values())
        .filter(workflow => workflow.isActive);

      for (const workflow of activeWorkflows) {
        await this.evaluateWorkflowTriggers(workflow);
      }
    } catch (error) {
      console.error('Error checking workflow triggers:', error);
    }
  }

  private async evaluateWorkflowTriggers(workflow: FollowupWorkflow): Promise<void> {
    for (const trigger of workflow.triggers) {
      if (!trigger.isActive) continue;

      try {
        // Get leads that might match this trigger
        const matchingLeads = await this.findLeadsMatchingTrigger(trigger);

        for (const lead of matchingLeads) {
          // Check if workflow is already running for this lead
          const existingExecution = Array.from(this.activeExecutions.values())
            .find(exec => exec.leadId === lead.id && exec.workflowId === workflow.id);

          if (!existingExecution) {
            await this.startWorkflowExecution(workflow, lead.id, trigger);
          }
        }
      } catch (error) {
        console.error(`Error evaluating trigger ${trigger.id}:`, error);
      }
    }
  }

  private async findLeadsMatchingTrigger(trigger: WorkflowTrigger): Promise<any[]> {
    // This would integrate with the lead management system
    // For now, return mock data - in real implementation, this would query the database
    try {
      // Mock implementation - replace with actual lead query
      const mockLeads = [
        { id: 1, score: 85, name: 'John Doe', email: 'john@example.com' },
        { id: 2, score: 72, name: 'Jane Smith', email: 'jane@example.com' },
      ];

      return mockLeads.filter(lead => {
        // Check if lead score meets threshold
        if (lead.score < trigger.scoreThreshold) return false;

        // Check additional conditions
        return this.evaluateConditions(lead, trigger.conditions);
      });
    } catch (error) {
      console.error('Error finding leads for trigger:', error);
      return [];
    }
  }

  private evaluateConditions(lead: any, conditions: WorkflowCondition[]): boolean {
    return conditions.every(condition => {
      const fieldValue = lead[condition.field];

      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'greater_than':
          return fieldValue > condition.value;
        case 'less_than':
          return fieldValue < condition.value;
        case 'contains':
          return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
        case 'between':
          const [min, max] = condition.value;
          return fieldValue >= min && fieldValue <= max;
        default:
          return false;
      }
    });
  }

  private async startWorkflowExecution(
    workflow: FollowupWorkflow,
    leadId: number,
    trigger: WorkflowTrigger
  ): Promise<void> {
    const execution: WorkflowExecution = {
      id: `execution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      leadId,
      workflowId: workflow.id,
      status: 'active',
      currentStep: 0,
      startedAt: new Date(),
      executedSteps: []
    };

    this.activeExecutions.set(execution.id, execution);
    await this.savePersistedData();

    // Start executing the first step
    await this.executeNextStep(execution);

    console.log(`Started workflow execution ${execution.id} for lead ${leadId}`);
  }

  private async executeNextStep(execution: WorkflowExecution): Promise<void> {
    const workflow = this.workflows.get(execution.workflowId);
    if (!workflow) return;

    const currentStepIndex = execution.currentStep;
    if (currentStepIndex >= workflow.steps.length) {
      // Workflow completed
      execution.status = 'completed';
      execution.completedAt = new Date();
      await this.savePersistedData();
      return;
    }

    const step = workflow.steps[currentStepIndex];

    try {
      // Execute the step
      const success = await this.executeWorkflowStep(step, execution.leadId);

      // Record the execution
      const executionStep: WorkflowExecutionStep = {
        stepId: step.id,
        executedAt: new Date(),
        status: success ? 'sent' : 'failed',
        channel: step.channel,
        templateId: step.templateId
      };

      execution.executedSteps.push(executionStep);

      if (success) {
        // Move to next step
        execution.currentStep++;

        // Schedule next step if there is one
        if (execution.currentStep < workflow.steps.length) {
          const nextStep = workflow.steps[execution.currentStep];
          setTimeout(() => {
            this.executeNextStep(execution);
          }, nextStep.delayMinutes * 60 * 1000); // Convert minutes to milliseconds
        } else {
          // Workflow completed
          execution.status = 'completed';
          execution.completedAt = new Date();
        }
      } else {
        // Step failed - could implement retry logic here
        console.error(`Failed to execute step ${step.id} for lead ${execution.leadId}`);
      }

      await this.savePersistedData();
    } catch (error) {
      console.error(`Error executing workflow step ${step.id}:`, error);

      // Record failed execution
      const executionStep: WorkflowExecutionStep = {
        stepId: step.id,
        executedAt: new Date(),
        status: 'failed',
        channel: step.channel,
        templateId: step.templateId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };

      execution.executedSteps.push(executionStep);
      await this.savePersistedData();
    }
  }

  private async executeWorkflowStep(step: WorkflowStep, leadId: number): Promise<boolean> {
    try {
      // Get lead information (mock implementation)
      const lead = await this.getLeadInfo(leadId);
      if (!lead) return false;

      // Send communication based on channel
      switch (step.channel) {
        case 'email':
          return await this.sendEmail(lead, step.templateId);
        case 'sms':
          return await this.sendSMS(lead, step.templateId);
        case 'in_app':
          return await this.sendInAppNotification(lead, step.templateId);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error executing workflow step:`, error);
      return false;
    }
  }

  private async getLeadInfo(leadId: number): Promise<any> {
    // Mock implementation - replace with actual lead service call
    return {
      id: leadId,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890'
    };
  }

  private async sendEmail(lead: any, templateId: string): Promise<boolean> {
    try {
      // Render template first
      const renderResult = await communicationApiService.renderTemplate(parseInt(templateId), {
        leadId: lead.id,
        customVariables: {
          leadName: lead.name,
          leadId: lead.id
        }
      });

      if (!renderResult.success || !renderResult.data) {
        console.error('Failed to render email template');
        return false;
      }

      // Use existing notification service for email (mock implementation)
      // In real implementation, this would integrate with email service
      console.log(`Email sent to ${lead.email} with template ${templateId}`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  private async sendSMS(lead: any, templateId: string): Promise<boolean> {
    try {
      // Render template first
      const renderResult = await communicationApiService.renderTemplate(parseInt(templateId), {
        leadId: lead.id,
        customVariables: {
          leadName: lead.name,
          leadId: lead.id
        }
      });

      if (!renderResult.success || !renderResult.data) {
        console.error('Failed to render SMS template');
        return false;
      }

      // Use existing notification service for SMS (mock implementation)
      // In real implementation, this would integrate with SMS service
      console.log(`SMS sent to ${lead.phone} with template ${templateId}`);
      return true;
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }

  private async sendInAppNotification(lead: any, templateId: string): Promise<boolean> {
    try {
      // Use existing notification service
      notificationService.addNotification({
        leadId: lead.id,
        leadName: lead.name,
        type: 'milestone',
        title: 'Follow-up Message',
        message: `Automated follow-up sent using template ${templateId}`,
        actionRequired: false
      });

      return true;
    } catch (error) {
      console.error('Error sending in-app notification:', error);
      return false;
    }
  }

  // Public API methods

  async createWorkflow(workflowData: Omit<FollowupWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'performance'>): Promise<FollowupWorkflow> {
    const workflow: FollowupWorkflow = {
      ...workflowData,
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      performance: {
        totalExecutions: 0,
        successfulCompletions: 0,
        averageCompletionTime: 0,
        conversionRate: 0
      }
    };

    this.workflows.set(workflow.id, workflow);
    await this.savePersistedData();

    return workflow;
  }

  async getWorkflow(workflowId: string): Promise<FollowupWorkflow | null> {
    return this.workflows.get(workflowId) || null;
  }

  async getAllWorkflows(): Promise<FollowupWorkflow[]> {
    return Array.from(this.workflows.values());
  }

  async updateWorkflow(workflowId: string, updates: Partial<FollowupWorkflow>): Promise<boolean> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    Object.assign(workflow, updates, { updatedAt: new Date() });
    await this.savePersistedData();

    return true;
  }

  async deleteWorkflow(workflowId: string): Promise<boolean> {
    const deleted = this.workflows.delete(workflowId);
    if (deleted) {
      await this.savePersistedData();
    }
    return deleted;
  }

  async pauseWorkflowExecution(executionId: string): Promise<boolean> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return false;

    execution.status = 'paused';
    await this.savePersistedData();

    return true;
  }

  async resumeWorkflowExecution(executionId: string): Promise<boolean> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return false;

    execution.status = 'active';
    await this.savePersistedData();

    // Continue execution from current step
    this.executeNextStep(execution);

    return true;
  }

  async cancelWorkflowExecution(executionId: string): Promise<boolean> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return false;

    execution.status = 'cancelled';
    await this.savePersistedData();

    return true;
  }

  async getWorkflowExecutions(leadId?: number): Promise<WorkflowExecution[]> {
    const executions = Array.from(this.activeExecutions.values());

    if (leadId) {
      return executions.filter(exec => exec.leadId === leadId);
    }

    return executions;
  }

  async setBaseUrl(url: string): Promise<void> {
    try {
      new URL(url); // Validate URL
      this.baseUrl = url;
      await AsyncStorage.setItem(this.BASE_URL_KEY, url);
    } catch (error) {
      throw new Error('Invalid workflow API URL');
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Export singleton instance
const automatedFollowupWorkflowService = new AutomatedFollowupWorkflowService();
export default automatedFollowupWorkflowService;