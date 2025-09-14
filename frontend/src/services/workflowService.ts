import {
  CommunicationWorkflow,
  WorkflowExecution,
  CommunicationTemplate
} from '../types/communication';

export interface WorkflowTrigger {
  id: number;
  name: string;
  eventType: 'lead_created' | 'lead_updated' | 'conversion_event' | 'time_based' | 'manual';
  conditions: Record<string, any>;
  isActive: boolean;
}

export interface WorkflowStep {
  id: number;
  workflowId: number;
  stepNumber: number;
  templateId: number;
  delayHours: number;
  conditions?: Record<string, any>;
  isActive: boolean;
}

export interface WorkflowExecutionContext {
  workflowId: number;
  leadId: number;
  triggerEvent: string;
  triggerData: Record<string, any>;
  currentStep: number;
  executedSteps: Array<{
    stepNumber: number;
    templateId: number;
    executedAt: string;
    status: 'sent' | 'failed' | 'skipped';
    errorMessage?: string;
  }>;
  nextExecutionAt?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
}

class WorkflowService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:5678/webhook';
  }

  /**
   * Get all workflows
   */
  async getWorkflows(): Promise<{ success: boolean; data?: CommunicationWorkflow[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/workflows`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch workflows'
      };
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(id: number): Promise<{ success: boolean; data?: CommunicationWorkflow; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/workflows/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch workflow'
      };
    }
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(workflow: Omit<CommunicationWorkflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data?: CommunicationWorkflow; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflow),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create workflow'
      };
    }
  }

  /**
   * Update workflow
   */
  async updateWorkflow(id: number, updates: Partial<CommunicationWorkflow>): Promise<{ success: boolean; data?: CommunicationWorkflow; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/workflows/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update workflow'
      };
    }
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/workflows/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete workflow'
      };
    }
  }

  /**
   * Trigger workflow execution
   */
  async triggerWorkflow(
    workflowId: number,
    leadId: number,
    context?: Record<string, any>
  ): Promise<{ success: boolean; data?: WorkflowExecution; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/workflows/${workflowId}/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadId, context }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger workflow'
      };
    }
  }

  /**
   * Get workflow executions for a lead
   */
  async getLeadWorkflows(leadId: number): Promise<{ success: boolean; data?: WorkflowExecution[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/workflows/executions/${leadId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch lead workflows'
      };
    }
  }

  /**
   * Pause workflow execution
   */
  async pauseWorkflowExecution(executionId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/workflows/executions/${executionId}/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pause workflow'
      };
    }
  }

  /**
   * Resume workflow execution
   */
  async resumeWorkflowExecution(executionId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/workflows/executions/${executionId}/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resume workflow'
      };
    }
  }

  /**
   * Cancel workflow execution
   */
  async cancelWorkflowExecution(executionId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/workflows/executions/${executionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel workflow'
      };
    }
  }

  /**
   * Get workflow analytics
   */
  async getWorkflowAnalytics(workflowId: number): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/workflows/${workflowId}/analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch workflow analytics'
      };
    }
  }

  /**
   * Create default workflows
   */
  async createDefaultWorkflows(): Promise<{ success: boolean; error?: string }> {
    const defaultWorkflows = [
      {
        name: 'New Lead Nurturing',
        description: 'Automated nurturing sequence for new leads',
        triggerConditions: [
          { field: 'leadScore', operator: 'greater_than' as const, value: 30 },
          { field: 'daysSinceCreation', operator: 'less_than' as const, value: 7 }
        ],
        templateSequence: [
          { templateId: 1, delayHours: 0 }, // Welcome email
          { templateId: 2, delayHours: 24 }, // Property recommendations
          { templateId: 3, delayHours: 72 } // Follow-up
        ],
        isActive: true
      },
      {
        name: 'High-Value Lead Engagement',
        description: 'Intensive engagement for high-scoring leads',
        triggerConditions: [
          { field: 'leadScore', operator: 'greater_than' as const, value: 70 }
        ],
        templateSequence: [
          { templateId: 1, delayHours: 0 }, // Welcome
          { templateId: 4, delayHours: 12 }, // VIP treatment
          { templateId: 5, delayHours: 48 }, // Exclusive offers
          { templateId: 6, delayHours: 96 } // Personal consultation
        ],
        isActive: true
      },
      {
        name: 'Cold Lead Reactivation',
        description: 'Reactivation sequence for inactive leads',
        triggerConditions: [
          { field: 'lastActivity', operator: 'greater_than' as const, value: 30 },
          { field: 'leadScore', operator: 'greater_than' as const, value: 20 }
        ],
        templateSequence: [
          { templateId: 7, delayHours: 0 }, // Re-engagement
          { templateId: 8, delayHours: 168 }, // Special offer
          { templateId: 9, delayHours: 336 } // Final attempt
        ],
        isActive: true
      }
    ];

    try {
      for (const workflow of defaultWorkflows) {
        await this.createWorkflow(workflow);
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create default workflows'
      };
    }
  }

  /**
   * Validate workflow configuration
   */
  validateWorkflow(workflow: Partial<CommunicationWorkflow>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!workflow.name?.trim()) {
      errors.push('Workflow name is required');
    }

    if (!workflow.triggerConditions || workflow.triggerConditions.length === 0) {
      errors.push('At least one trigger condition is required');
    }

    if (!workflow.templateSequence || workflow.templateSequence.length === 0) {
      errors.push('At least one template in the sequence is required');
    }

    if (workflow.templateSequence) {
      workflow.templateSequence.forEach((step, index) => {
        if (!step.templateId) {
          errors.push(`Step ${index + 1}: Template ID is required`);
        }
        if (step.delayHours < 0) {
          errors.push(`Step ${index + 1}: Delay hours cannot be negative`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get workflow suggestions for a lead
   */
  async getWorkflowSuggestions(leadId: number): Promise<{ success: boolean; data?: CommunicationWorkflow[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/workflows/suggestions/${leadId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get workflow suggestions'
      };
    }
  }

  /**
   * Clone workflow
   */
  async cloneWorkflow(workflowId: number, newName: string): Promise<{ success: boolean; data?: CommunicationWorkflow; error?: string }> {
    try {
      const sourceWorkflow = await this.getWorkflow(workflowId);
      if (!sourceWorkflow.success || !sourceWorkflow.data) {
        return { success: false, error: 'Source workflow not found' };
      }

      const clonedWorkflow = {
        ...sourceWorkflow.data,
        name: newName,
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined
      };

      return await this.createWorkflow(clonedWorkflow);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clone workflow'
      };
    }
  }
}

// Export singleton instance
export const workflowService = new WorkflowService();