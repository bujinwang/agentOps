import api from './api';
import {
  CommissionAnalytics,
  CommissionRecord,
  AgentPerformance,
  AnalyticsFilters,
  ApiResponse
} from '../types/analytics';

class CommissionService {
  private baseUrl = '/api/commissions';

  // Get commission analytics
  async getCommissionAnalytics(filters: AnalyticsFilters = {}): Promise<CommissionAnalytics> {
    try {
      const params = new URLSearchParams();

      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.agentId) params.append('agentId', filters.agentId);

      const response = await api.get(
        `${this.baseUrl}/analytics/summary?${params.toString()}`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch commission analytics');
      }
    } catch (error) {
      console.error('Error fetching commission analytics:', error);
      throw error;
    }
  }

  // Get commission records
  async getCommissionRecords(filters: AnalyticsFilters = {}): Promise<{
    commissions: CommissionRecord[];
    pagination: any;
  }> {
    try {
      const params = new URLSearchParams();

      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.agentId) params.append('agentId', filters.agentId);

      const response = await api.get(
        `${this.baseUrl}?${params.toString()}`
      );

      if (response.data.success) {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch commission records');
      }
    } catch (error) {
      console.error('Error fetching commission records:', error);
      throw error;
    }
  }

  // Calculate commission
  async calculateCommission(data: {
    transactionId: string;
    agentId?: string;
    commissionStructureId?: string;
  }): Promise<CommissionRecord> {
    try {
      const response = await api.post(
        `${this.baseUrl}/calculate`,
        data
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to calculate commission');
      }
    } catch (error) {
      console.error('Error calculating commission:', error);
      throw error;
    }
  }

  // Bulk calculate commissions
  async bulkCalculateCommissions(data: {
    transactionIds: string[];
    agentId?: string;
    commissionStructureId?: string;
  }): Promise<any> {
    try {
      const response = await api.post(
        `${this.baseUrl}/bulk-calculate`,
        data
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to bulk calculate commissions');
      }
    } catch (error) {
      console.error('Error bulk calculating commissions:', error);
      throw error;
    }
  }

  // Process commission payments
  async processCommissionPayments(data: {
    agentId: string;
    paymentPeriodStart: string;
    paymentPeriodEnd: string;
  }): Promise<any> {
    try {
      const response = await api.post(
        `${this.baseUrl}/payments/process`,
        data
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to process commission payments');
      }
    } catch (error) {
      console.error('Error processing commission payments:', error);
      throw error;
    }
  }

  // Get commission structures
  async getCommissionStructures(): Promise<any[]> {
    try {
      const response = await api.get(`${this.baseUrl}/structures`);

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch commission structures');
      }
    } catch (error) {
      console.error('Error fetching commission structures:', error);
      throw error;
    }
  }

  // Create commission structure
  async createCommissionStructure(structureData: any): Promise<any> {
    try {
      const response = await api.post(
        `${this.baseUrl}/structures`,
        structureData
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to create commission structure');
      }
    } catch (error) {
      console.error('Error creating commission structure:', error);
      throw error;
    }
  }

  // Update commission structure
  async updateCommissionStructure(id: string, updateData: any): Promise<any> {
    try {
      const response = await api.put(
        `${this.baseUrl}/structures/${id}`,
        updateData
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update commission structure');
      }
    } catch (error) {
      console.error('Error updating commission structure:', error);
      throw error;
    }
  }

  // Get commission structure templates
  async getCommissionStructureTemplates(): Promise<any[]> {
    try {
      const response = await api.get(`${this.baseUrl}/structures/templates`);

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch commission structure templates');
      }
    } catch (error) {
      console.error('Error fetching commission structure templates:', error);
      throw error;
    }
  }

  // Create commission dispute
  async createCommissionDispute(data: {
    commissionId: string;
    reason: string;
    description: string;
  }): Promise<any> {
    try {
      const response = await api.post(
        `${this.baseUrl}/disputes`,
        data
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to create commission dispute');
      }
    } catch (error) {
      console.error('Error creating commission dispute:', error);
      throw error;
    }
  }

  // Resolve commission dispute
  async resolveCommissionDispute(data: {
    disputeId: string;
    resolution: string;
    adjustmentAmount?: number;
  }): Promise<void> {
    try {
      const response = await api.put(
        `${this.baseUrl}/disputes/${data.disputeId}/resolve`,
        {
          resolution: data.resolution,
          adjustmentAmount: data.adjustmentAmount
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to resolve commission dispute');
      }
    } catch (error) {
      console.error('Error resolving commission dispute:', error);
      throw error;
    }
  }

  // Get commission audit trail
  async getCommissionAuditTrail(commissionId: string): Promise<any[]> {
    try {
      const response = await api.get(
        `${this.baseUrl}/${commissionId}/audit-trail`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch commission audit trail');
      }
    } catch (error) {
      console.error('Error fetching commission audit trail:', error);
      throw error;
    }
  }

  // Get top performing agents
  async getTopPerformingAgents(
    timeRange: string = '30d',
    limit: number = 10
  ): Promise<AgentPerformance[]> {
    try {
      const params = new URLSearchParams();
      params.append('timeRange', timeRange);
      params.append('limit', limit.toString());

      const response = await api.get(
        `${this.baseUrl}/analytics/top-agents?${params.toString()}`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch top performing agents');
      }
    } catch (error) {
      console.error('Error fetching top performing agents:', error);
      throw error;
    }
  }

  // Export commission data
  async exportCommissions(
    format: 'csv' | 'json' = 'csv',
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(
        `${this.baseUrl}/export/commissions?${params.toString()}`,
        { responseType: 'blob' }
      );

      return response.data;
    } catch (error) {
      console.error('Error exporting commissions:', error);
      throw error;
    }
  }

  // Export commission payments
  async exportCommissionPayments(
    format: 'csv' | 'json' = 'csv',
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(
        `${this.baseUrl}/export/payments?${params.toString()}`,
        { responseType: 'blob' }
      );

      return response.data;
    } catch (error) {
      console.error('Error exporting commission payments:', error);
      throw error;
    }
  }

  // Real-time updates (WebSocket)
  connectToRealTimeUpdates(callback: (data: any) => void): () => void {
    // This would connect to WebSocket for real-time commission updates
    console.log('Connecting to real-time commission updates...');

    // Mock real-time updates
    const interval = setInterval(() => {
      callback({
        type: 'commission_update',
        data: {
          newCommissions: Math.floor(Math.random() * 5),
          totalPending: Math.floor(Math.random() * 100),
          timestamp: new Date().toISOString()
        }
      });
    }, 60000); // Update every minute

    return () => {
      clearInterval(interval);
      console.log('Disconnected from real-time commission updates');
    };
  }

  // Cache management
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TIMEOUT) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Cached version of getCommissionAnalytics
  async getCommissionAnalyticsCached(filters: AnalyticsFilters = {}): Promise<CommissionAnalytics> {
    const cacheKey = `commission_analytics_${JSON.stringify(filters)}`;
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    const data = await this.getCommissionAnalytics(filters);
    this.setCachedData(cacheKey, data);
    return data;
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }
}

export const commissionService = new CommissionService();
export default commissionService;