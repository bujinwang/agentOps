// Status Management API Service
// Handles all status-related API operations including changes, history, and analytics

import {
  StatusChange,
  StatusHistory,
  StatusChangeRequest,
  StatusValidationResult,
  StatusAnalytics,
  StatusDashboardData,
  StatusBulkOperation,
  StatusAPIResponse,
  StatusHistoryResponse,
  StatusChangeResponse,
  StatusAnalyticsResponse,
  StatusDashboardResponse
} from '../types/status';

class StatusApiService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = 'http://localhost:5678/webhook';
    this.authToken = localStorage.getItem('authToken');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<StatusAPIResponse<T>> {
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        // If we can't parse the error response, use the default message
      }

      return {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: errorMessage,
          details: { status: response.status }
        }
      };
    }

    try {
      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (e) {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse response',
          details: e
        }
      };
    }
  }

  // Status Change Operations

  /**
   * Change property status with validation
   */
  async changePropertyStatus(
    propertyId: number,
    request: StatusChangeRequest
  ): Promise<StatusChangeResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status/properties/${propertyId}/status`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      });

      return await this.handleResponse<StatusChange>(response);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STATUS_CHANGE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to change property status',
          details: error
        }
      };
    }
  }

  /**
   * Validate status transition before making the change
   */
  async validateStatusTransition(
    propertyId: number,
    fromStatus: string,
    toStatus: string,
    userRole?: string
  ): Promise<StatusValidationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status/validate-transition`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          property_id: propertyId,
          from_status: fromStatus,
          to_status: toStatus,
          user_role: userRole
        }),
      });

      const result = await this.handleResponse<StatusValidationResult>(response);
      return result.success ? result.data! : {
        isValid: false,
        errors: [{
          message: result.error?.message || 'Validation failed',
          severity: 'error'
        }],
        warnings: [],
        infos: []
      };
    } catch (error: any) {
      return {
        isValid: false,
        errors: [{
          message: error instanceof Error ? error.message : 'Validation failed',
          severity: 'error'
        }],
        warnings: [],
        infos: []
      };
    }
  }

  /**
   * Bulk status change operation
   */
  async bulkChangeStatus(
    operation: Omit<StatusBulkOperation, 'id' | 'created_at' | 'status' | 'results'>
  ): Promise<StatusAPIResponse<StatusBulkOperation>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status/bulk-change`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(operation),
      });

      return await this.handleResponse<StatusBulkOperation>(response);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'BULK_STATUS_CHANGE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to perform bulk status change',
          details: error
        }
      };
    }
  }

  /**
   * Get bulk operation status
   */
  async getBulkOperationStatus(operationId: string): Promise<StatusAPIResponse<StatusBulkOperation>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status/bulk-operations/${operationId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<StatusBulkOperation>(response);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'BULK_OPERATION_STATUS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get bulk operation status',
          details: error
        }
      };
    }
  }

  // Status History Operations

  /**
   * Get complete status history for a property
   */
  async getPropertyStatusHistory(
    propertyId: number,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<StatusHistoryResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (options?.limit) queryParams.append('limit', options.limit.toString());
      if (options?.offset) queryParams.append('offset', options.offset.toString());
      if (options?.startDate) queryParams.append('start_date', options.startDate);
      if (options?.endDate) queryParams.append('end_date', options.endDate);

      const queryString = queryParams.toString();
      const url = `${this.baseUrl}/api/status/properties/${propertyId}/history${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<StatusHistory>(response);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'STATUS_HISTORY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve status history',
          details: error
        }
      };
    }
  }

  /**
   * Get status changes within a date range
   */
  async getStatusChanges(
    filters?: {
      propertyIds?: number[];
      statuses?: string[];
      changedBy?: number[];
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<StatusAPIResponse<StatusChange[]>> {
    try {
      const queryParams = new URLSearchParams();

      if (filters?.propertyIds?.length) {
        filters.propertyIds.forEach(id => queryParams.append('property_id', id.toString()));
      }
      if (filters?.statuses?.length) {
        filters.statuses.forEach(status => queryParams.append('status', status));
      }
      if (filters?.changedBy?.length) {
        filters.changedBy.forEach(id => queryParams.append('changed_by', id.toString()));
      }
      if (filters?.startDate) queryParams.append('start_date', filters.startDate);
      if (filters?.endDate) queryParams.append('end_date', filters.endDate);
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());
      if (filters?.offset) queryParams.append('offset', filters.offset.toString());

      const queryString = queryParams.toString();
      const url = `${this.baseUrl}/api/status/changes${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<StatusChange[]>(response);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'STATUS_CHANGES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve status changes',
          details: error
        }
      };
    }
  }

  // Analytics Operations

  /**
   * Get status analytics for a property or global
   */
  async getStatusAnalytics(
    propertyId?: number,
    options?: {
      period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
      startDate?: string;
      endDate?: string;
    }
  ): Promise<StatusAnalyticsResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (options?.period) queryParams.append('period', options.period);
      if (options?.startDate) queryParams.append('start_date', options.startDate);
      if (options?.endDate) queryParams.append('end_date', options.endDate);

      const queryString = queryParams.toString();
      const baseUrl = propertyId
        ? `${this.baseUrl}/api/status/properties/${propertyId}/analytics`
        : `${this.baseUrl}/api/status/analytics`;

      const url = `${baseUrl}${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<StatusAnalytics>(response);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'STATUS_ANALYTICS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve status analytics',
          details: error
        }
      };
    }
  }

  /**
   * Get status dashboard data
   */
  async getStatusDashboard(): Promise<StatusDashboardResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status/dashboard`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<StatusDashboardData>(response);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'STATUS_DASHBOARD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve status dashboard data',
          details: error
        }
      };
    }
  }

  // Approval Workflow Operations

  /**
   * Approve a status change request
   */
  async approveStatusChange(
    changeId: string,
    approverId: number,
    notes?: string
  ): Promise<StatusChangeResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status/changes/${changeId}/approve`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          approver_id: approverId,
          notes
        }),
      });

      return await this.handleResponse<StatusChange>(response);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'STATUS_APPROVAL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to approve status change',
          details: error
        }
      };
    }
  }

  /**
   * Reject a status change request
   */
  async rejectStatusChange(
    changeId: string,
    approverId: number,
    reason: string,
    notes?: string
  ): Promise<StatusChangeResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status/changes/${changeId}/reject`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          approver_id: approverId,
          reason,
          notes
        }),
      });

      return await this.handleResponse<StatusChange>(response);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'STATUS_REJECTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to reject status change',
          details: error
        }
      };
    }
  }

  /**
   * Get pending approvals for current user
   */
  async getPendingApprovals(
    userId: number
  ): Promise<StatusAPIResponse<StatusChange[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status/approvals/pending?user_id=${userId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<StatusChange[]>(response);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'PENDING_APPROVALS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve pending approvals',
          details: error
        }
      };
    }
  }

  // Configuration Operations

  /**
   * Get status transition rules
   */
  async getTransitionRules(): Promise<StatusAPIResponse<any[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status/rules/transitions`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<any[]>(response);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'TRANSITION_RULES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve transition rules',
          details: error
        }
      };
    }
  }

  /**
   * Update status transition rules
   */
  async updateTransitionRules(rules: any[]): Promise<StatusAPIResponse<any[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status/rules/transitions`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ rules }),
      });

      return await this.handleResponse<any[]>(response);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'UPDATE_TRANSITION_RULES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update transition rules',
          details: error
        }
      };
    }
  }

  // Export Operations

  /**
   * Export status history for a property
   */
  async exportStatusHistory(
    propertyId: number,
    format: 'csv' | 'pdf' = 'csv',
    options?: {
      startDate?: string;
      endDate?: string;
      includeMetadata?: boolean;
    }
  ): Promise<Blob> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('format', format);
      if (options?.startDate) queryParams.append('start_date', options.startDate);
      if (options?.endDate) queryParams.append('end_date', options.endDate);
      if (options?.includeMetadata) queryParams.append('include_metadata', 'true');

      const response = await fetch(
        `${this.baseUrl}/api/status/properties/${propertyId}/history/export?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error: any) {
      throw new Error(error instanceof Error ? error.message : 'Failed to export status history');
    }
  }

  /**
   * Export status analytics report
   */
  async exportStatusAnalytics(
    format: 'csv' | 'pdf' = 'pdf',
    options?: {
      propertyId?: number;
      period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
      startDate?: string;
      endDate?: string;
    }
  ): Promise<Blob> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('format', format);
      if (options?.propertyId) queryParams.append('property_id', options.propertyId.toString());
      if (options?.period) queryParams.append('period', options.period);
      if (options?.startDate) queryParams.append('start_date', options.startDate);
      if (options?.endDate) queryParams.append('end_date', options.endDate);

      const response = await fetch(
        `${this.baseUrl}/api/status/analytics/export?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error: any) {
      throw new Error(error instanceof Error ? error.message : 'Failed to export status analytics');
    }
  }
}

// Export singleton instance
export const statusApiService = new StatusApiService();