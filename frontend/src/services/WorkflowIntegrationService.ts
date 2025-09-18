export interface WorkflowStatus {
  leadId: number;
  activeWorkflows: number;
  pausedWorkflows: number;
  completedWorkflows: number;
  totalWorkflows: number;
  workflows: {
    active: Workflow[];
    paused: Workflow[];
    completed: Workflow[];
  };
}

export interface Workflow {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  currentStep?: number;
  totalSteps?: number;
  nextExecution?: string;
}

export interface WorkflowHistoryEntry {
  id: number;
  leadId: number;
  eventType: string;
  oldValue: string;
  newValue: string;
  changedBy: number;
  reason: string;
  eventData: any;
  timestamp: string;
  workflow?: Workflow;
}

export interface WorkflowOverrideRequest {
  workflowId: string;
  operation: 'pause' | 'resume' | 'cancel' | 'restart';
  reason?: string;
}

export interface BulkWorkflowOperation {
  leadIds: number[];
  operation: 'pause' | 'resume' | 'cancel';
  reason?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class WorkflowIntegrationService {
  private baseUrl = '/api/workflow-integration';

  /**
   * Get authentication token from storage
   */
  private getAuthToken(): string {
    // This should be replaced with actual token retrieval logic
    // For now, return a placeholder
    return 'your-auth-token-here';
  }

  /**
   * Get workflow status for a lead
   */
  async getLeadWorkflowStatus(leadId: number): Promise<WorkflowStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/lead/${leadId}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse<WorkflowStatus> = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to get workflow status');
      }

      return data.data!;
    } catch (error) {
      console.error('Failed to get workflow status:', error);
      throw error;
    }
  }

  /**
   * Get workflow history for a lead
   */
  async getLeadWorkflowHistory(
    leadId: number,
    options: {
      limit?: number;
      offset?: number;
      eventTypes?: string[];
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<WorkflowHistoryEntry[]> {
    try {
      const params = new URLSearchParams();

      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.eventTypes?.length) params.append('eventTypes', options.eventTypes.join(','));
      if (options.startDate) params.append('startDate', options.startDate.toISOString());
      if (options.endDate) params.append('endDate', options.endDate.toISOString());

      const queryString = params.toString();
      const url = `${this.baseUrl}/lead/${leadId}/history${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse<{ history: WorkflowHistoryEntry[] }> = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to get workflow history');
      }

      return data.data!.history;
    } catch (error) {
      console.error('Failed to get workflow history:', error);
      throw error;
    }
  }

  /**
   * Override workflow (pause, resume, cancel, restart)
   */
  async overrideWorkflow(
    workflowId: string,
    operation: 'pause' | 'resume' | 'cancel' | 'restart',
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const request: WorkflowOverrideRequest = {
        workflowId,
        operation,
        reason
      };

      const response = await fetch(`${this.baseUrl}/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse<{ success: boolean; message: string }> = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to override workflow');
      }

      return data.data!;
    } catch (error) {
      console.error('Failed to override workflow:', error);
      throw error;
    }
  }

  /**
   * Perform bulk workflow operations
   */
  async bulkWorkflowOperation(
    leadIds: number[],
    operation: 'pause' | 'resume' | 'cancel',
    reason?: string
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: any[];
    errors: any[];
  }> {
    try {
      const request: BulkWorkflowOperation = {
        leadIds,
        operation,
        reason
      };

      const response = await fetch(`${this.baseUrl}/bulk-operation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse<{
        total: number;
        successful: number;
        failed: number;
        results: any[];
        errors: any[];
      }> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to perform bulk operation');
      }

      return data.data!;
    } catch (error) {
      console.error('Failed to perform bulk operation:', error);
      throw error;
    }
  }

  /**
   * Handle lead status change
   */
  async handleLeadStatusChange(
    leadId: number,
    oldStatus: string,
    newStatus: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const request = {
        leadId,
        oldStatus,
        newStatus,
        reason
      };

      const response = await fetch(`${this.baseUrl}/status-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse<{ success: boolean; message: string }> = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to handle status change');
      }

      return data.data!;
    } catch (error) {
      console.error('Failed to handle status change:', error);
      throw error;
    }
  }

  /**
   * Get workflow analytics
   */
  async getWorkflowAnalytics(filters: {
    workflowId?: string;
    leadId?: number;
    eventTypes?: string[];
    startDate?: Date;
    endDate?: Date;
    groupBy?: string;
  } = {}): Promise<any> {
    try {
      const params = new URLSearchParams();

      if (filters.workflowId) params.append('workflowId', filters.workflowId);
      if (filters.leadId) params.append('leadId', filters.leadId.toString());
      if (filters.eventTypes?.length) params.append('eventTypes', filters.eventTypes.join(','));
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      if (filters.groupBy) params.append('groupBy', filters.groupBy);

      const queryString = params.toString();
      const url = `${this.baseUrl}/analytics${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse<{ analytics: any }> = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to get workflow analytics');
      }

      return data.data!.analytics;
    } catch (error) {
      console.error('Failed to get workflow analytics:', error);
      throw error;
    }
  }

  /**
   * Cleanup old workflow data (admin only)
   */
  async cleanupOldWorkflows(daysOld: number = 90): Promise<{
    deletedWorkflows: number;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ daysOld })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse<{
        deletedWorkflows: number;
        message: string;
      }> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to cleanup workflows');
      }

      return data.data!;
    } catch (error) {
      console.error('Failed to cleanup workflows:', error);
      throw error;
    }
  }

  /**
   * Get workflow templates available for a lead
   */
  async getWorkflowTemplates(leadId: number): Promise<any[]> {
    try {
      // This would typically fetch from a templates endpoint
      // For now, return mock data
      return [
        {
          id: 'followup-basic',
          name: 'Basic Follow-up Sequence',
          description: '5-step email follow-up sequence',
          estimatedDuration: '7 days'
        },
        {
          id: 'qualification-advanced',
          name: 'Advanced Qualification',
          description: 'Multi-channel qualification workflow',
          estimatedDuration: '14 days'
        }
      ];
    } catch (error) {
      console.error('Failed to get workflow templates:', error);
      throw error;
    }
  }

  /**
   * Create workflow from template
   */
  async createWorkflowFromTemplate(
    leadId: number,
    templateId: string,
    customizations: any = {}
  ): Promise<{ success: boolean; workflowId: string }> {
    try {
      const request = {
        leadId,
        templateId,
        customizations
      };

      const response = await fetch('/api/workflows/create-from-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse<{ success: boolean; workflowId: string }> = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create workflow from template');
      }

      return data.data!;
    } catch (error) {
      console.error('Failed to create workflow from template:', error);
      throw error;
    }
  }
}