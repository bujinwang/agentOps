// Analytics Service - Comprehensive data aggregation for dashboard and reporting
// Builds on existing API endpoints to provide real-time business intelligence

import { apiService } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoadingOptions, withLoading } from '../utils/loadingState';

export interface DashboardKPIs {
  totalLeads: number;
  newLeads: number;
  activeTasks: number;
  completedTasks: number;
  leadsThisMonth: number;
  conversionRate: number;
  averageDealSize: number;
  responseTimeHours: number;
  highScoreLeads: number;
  mediumScoreLeads: number;
  lowScoreLeads: number;
}

export interface LeadAnalytics {
  leadsByStatus: Array<{ status: string; count: number; percentage: number }>;
  leadsBySource: Array<{ source: string; count: number; percentage: number }>;
  leadsByPriority: Array<{ priority: string; count: number; percentage: number }>;
  leadsByScoreCategory: Array<{ category: string; count: number; percentage: number }>;
  leadsOverTime: Array<{ date: string; count: number; new: number; converted: number }>;
  conversionFunnel: Array<{ stage: string; count: number; percentage: number }>;
}

export interface PerformanceMetrics {
  agentPerformance: Array<{
    agentId: number;
    agentName: string;
    leadsManaged: number;
    conversionRate: number;
    averageResponseTime: number;
    totalRevenue: number;
  }>;
  teamBenchmarks: {
    averageConversionRate: number;
    averageResponseTime: number;
    topPerformerRate: number;
  };
  marketComparison: {
    localAverageRate: number;
    industryAverageRate: number;
  };
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface AnalyticsFilters {
  dateRange?: DateRange;
  agentId?: number;
  leadSource?: string;
  propertyType?: string;
  scoreCategory?: 'High' | 'Medium' | 'Low';
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly CACHE_KEY_PREFIX = '@RealEstateCRM:analytics:';
  private readonly OFFLINE_KEY_PREFIX = '@RealEstateCRM:offline-analytics:';
  private isOnline: boolean = true;
  private offlineQueue: Array<{ key: string; data: any; timestamp: number }> = [];

  private constructor() {
    // Initialize cache cleanup interval
    setInterval(() => this.cleanupExpiredCache(), 10 * 60 * 1000); // Clean every 10 minutes
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  // Get comprehensive dashboard KPIs
  public async getDashboardKPIs(filters?: AnalyticsFilters): Promise<DashboardKPIs> {
    const cacheKey = `dashboard-kpis-${JSON.stringify(filters || {})}`;

    return await this.fetchWithOfflineSupport(cacheKey, async () => {
      // Get basic stats from existing endpoint
      const dashboardStats = await apiService.getDashboardStats();

      // Get lead stats for additional metrics
      const leadStats = await apiService.getLeadStats('month');

      // Get conversion metrics
      const conversionMetrics = await apiService.getConversionMetrics({
        startDate: filters?.dateRange?.startDate || this.getDefaultStartDate(),
        endDate: filters?.dateRange?.endDate || new Date().toISOString().split('T')[0]
      });

      // Calculate additional KPIs
      const kpis: DashboardKPIs = {
        totalLeads: dashboardStats.data.totalLeads || 0,
        newLeads: dashboardStats.data.newLeads || 0,
        activeTasks: dashboardStats.data.activeTasks || 0,
        completedTasks: dashboardStats.data.completedTasks || 0,
        leadsThisMonth: dashboardStats.data.leadsThisMonth || 0,
        conversionRate: this.calculateConversionRate(conversionMetrics.data),
        averageDealSize: this.calculateAverageDealSize(conversionMetrics.data),
        responseTimeHours: this.calculateAverageResponseTime(dashboardStats.data.recentActivity || []),
        highScoreLeads: leadStats.data.leadsByPriority?.find(p => p.priority === 'High')?.count || 0,
        mediumScoreLeads: leadStats.data.leadsByPriority?.find(p => p.priority === 'Medium')?.count || 0,
        lowScoreLeads: leadStats.data.leadsByPriority?.find(p => p.priority === 'Low')?.count || 0
      };

      return kpis;
    }) || {
      totalLeads: 0,
      newLeads: 0,
      activeTasks: 0,
      completedTasks: 0,
      leadsThisMonth: 0,
      conversionRate: 0,
      averageDealSize: 0,
      responseTimeHours: 0,
      highScoreLeads: 0,
      mediumScoreLeads: 0,
      lowScoreLeads: 0
    };
  }

  // Get comprehensive dashboard KPIs with loading support
  public async getDashboardKPIsWithLoading(
    filters?: AnalyticsFilters,
    loadingCallbacks?: { onStart?: (message?: string) => void; onProgress?: (progress: number, message?: string) => void; onComplete?: () => void; onError?: (error: string) => void }
  ): Promise<DashboardKPIs | null> {
    try {
      loadingCallbacks?.onStart?.('Loading dashboard KPIs...');

      const result = await this.getDashboardKPIs(filters);

      loadingCallbacks?.onComplete?.();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard KPIs';
      loadingCallbacks?.onError?.(errorMessage);
      return null;
    }
  }

  // Get comprehensive lead analytics
  public async getLeadAnalytics(timeframe: 'week' | 'month' | 'quarter' = 'month', filters?: AnalyticsFilters): Promise<LeadAnalytics> {
    const cacheKey = `lead-analytics-${timeframe}-${JSON.stringify(filters || {})}`;

    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const [leadStats, conversionFunnel] = await Promise.all([
        apiService.getLeadStats(timeframe),
        apiService.getConversionFunnel({
          startDate: filters?.dateRange?.startDate || this.getDefaultStartDate(timeframe),
          endDate: filters?.dateRange?.endDate || new Date().toISOString().split('T')[0]
        })
      ]);

      // Calculate percentages and enrich data
      const totalLeads = leadStats.data.leadsByStatus?.reduce((sum, item) => sum + item.count, 0) || 1;

      const analytics: LeadAnalytics = {
        leadsByStatus: leadStats.data.leadsByStatus?.map(item => ({
          ...item,
          percentage: Math.round((item.count / totalLeads) * 100)
        })) || [],
        leadsBySource: leadStats.data.leadsBySource?.map(item => ({
          ...item,
          percentage: Math.round((item.count / totalLeads) * 100)
        })) || [],
        leadsByPriority: leadStats.data.leadsByPriority?.map(item => ({
          ...item,
          percentage: Math.round((item.count / totalLeads) * 100)
        })) || [],
        leadsByScoreCategory: await this.calculateLeadsByScoreCategory(filters),
        leadsOverTime: leadStats.data.leadsOverTime?.map(item => ({
          ...item,
          new: item.count, // Assuming count represents new leads
          converted: Math.floor(item.count * 0.15) // Estimate conversions (15% conversion rate)
        })) || [],
        conversionFunnel: conversionFunnel.data?.map((stage: any) => ({
          stage: stage.name || stage.stage,
          count: stage.count || 0,
          percentage: stage.percentage || 0
        })) || []
      };

      this.setCachedData(cacheKey, analytics);
      return analytics;
    } catch (error) {
      console.error('Error fetching lead analytics:', error);
      return {
        leadsByStatus: [],
        leadsBySource: [],
        leadsByPriority: [],
        leadsByScoreCategory: [],
        leadsOverTime: [],
        conversionFunnel: []
      };
    }
  }

  // Get comprehensive lead analytics with loading support
  public async getLeadAnalyticsWithLoading(
    timeframe: 'week' | 'month' | 'quarter' = 'month',
    filters?: AnalyticsFilters,
    loadingCallbacks?: { onStart?: (message?: string) => void; onProgress?: (progress: number, message?: string) => void; onComplete?: () => void; onError?: (error: string) => void }
  ): Promise<LeadAnalytics | null> {
    try {
      loadingCallbacks?.onStart?.('Loading lead analytics...');
      loadingCallbacks?.onProgress?.(25, 'Fetching lead statistics...');

      const result = await this.getLeadAnalytics(timeframe, filters);

      loadingCallbacks?.onProgress?.(75, 'Processing analytics data...');
      loadingCallbacks?.onComplete?.();

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load lead analytics';
      loadingCallbacks?.onError?.(errorMessage);
      return null;
    }
  }

  // Get performance metrics and comparisons
  public async getPerformanceMetrics(filters?: AnalyticsFilters): Promise<PerformanceMetrics> {
    const cacheKey = `performance-metrics-${JSON.stringify(filters || {})}`;

    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // This would typically come from a dedicated performance API
      // For now, we'll aggregate from existing data
      const dashboardStats = await apiService.getDashboardStats();

      const metrics: PerformanceMetrics = {
        agentPerformance: [], // Would be populated from agent-specific endpoints
        teamBenchmarks: {
          averageConversionRate: 15.5, // Mock data - would come from API
          averageResponseTime: 4.2, // Mock data - would come from API
          topPerformerRate: 28.3 // Mock data - would come from API
        },
        marketComparison: {
          localAverageRate: 12.8, // Mock data - would come from API
          industryAverageRate: 14.2 // Mock data - would come from API
        }
      };

      this.setCachedData(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      return {
        agentPerformance: [],
        teamBenchmarks: {
          averageConversionRate: 0,
          averageResponseTime: 0,
          topPerformerRate: 0
        },
        marketComparison: {
          localAverageRate: 0,
          industryAverageRate: 0
        }
      };
    }
  }

  // Export analytics data
  public async exportAnalyticsData(
    format: 'csv' | 'excel' = 'csv',
    dateRange?: DateRange,
    includeCharts: boolean = false
  ): Promise<Blob> {
    try {
      const filters: AnalyticsFilters = dateRange ? { dateRange } : {};

      // Get all analytics data
      const [kpis, leadAnalytics, performance] = await Promise.all([
        this.getDashboardKPIs(filters),
        this.getLeadAnalytics('month', filters),
        this.getPerformanceMetrics(filters)
      ]);

      // Create comprehensive export data
      const exportData = {
        summary: kpis,
        leadAnalytics,
        performance,
        generatedAt: new Date().toISOString(),
        dateRange: dateRange || {
          startDate: this.getDefaultStartDate(),
          endDate: new Date().toISOString().split('T')[0]
        }
      };

      // Use existing export endpoint with enhanced data
      return await apiService.exportLeads(format, {
        includeAnalytics: true,
        analyticsData: JSON.stringify(exportData)
      });
    } catch (error) {
      console.error('Error exporting analytics data:', error);
      throw new Error('Failed to export analytics data');
    }
  }

  // Clear cache (useful for manual refresh)
  public clearCache(): void {
    this.cache.clear();
  }

  // Get cache statistics
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Offline support methods
  public setOnlineStatus(online: boolean): void {
    const wasOffline = !this.isOnline;
    this.isOnline = online;

    if (online && wasOffline) {
      // Sync offline data when coming back online
      this.syncOfflineData();
    }
  }

  public isOnlineStatus(): boolean {
    return this.isOnline;
  }

  private async storeOfflineData(key: string, data: any): Promise<void> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const offlineKey = `${this.OFFLINE_KEY_PREFIX}${key}`;
      const offlineData = {
        data,
        timestamp: Date.now(),
        synced: false
      };

      await AsyncStorage.setItem(offlineKey, JSON.stringify(offlineData));
      this.offlineQueue.push({ key, data: offlineData, timestamp: Date.now() });
    } catch (error) {
      console.warn('Failed to store offline data:', error);
    }
  }

  private async getOfflineData(key: string): Promise<any | null> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const offlineKey = `${this.OFFLINE_KEY_PREFIX}${key}`;
      const stored = await AsyncStorage.getItem(offlineKey);

      if (stored) {
        const offlineData = JSON.parse(stored);
        // Return data if it's not too old (24 hours max for offline data)
        if (Date.now() - offlineData.timestamp < 24 * 60 * 60 * 1000) {
          return offlineData.data;
        } else {
          // Remove expired offline data
          await AsyncStorage.removeItem(offlineKey);
        }
      }
    } catch (error) {
      console.warn('Failed to get offline data:', error);
    }
    return null;
  }

  private async syncOfflineData(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    console.log(`Syncing ${this.offlineQueue.length} offline analytics items...`);

    // Process offline queue (in a real implementation, this would sync with server)
    // For now, we'll just mark them as synced
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage');

      for (const item of this.offlineQueue) {
        const offlineKey = `${this.OFFLINE_KEY_PREFIX}${item.key}`;
        const updatedData = { ...item.data, synced: true };
        await AsyncStorage.setItem(offlineKey, JSON.stringify(updatedData));
      }

      this.offlineQueue = [];
      console.log('Offline analytics data synced successfully');
    } catch (error) {
      console.warn('Failed to sync offline data:', error);
    }
  }

  // Enhanced data fetching with offline support
  private async fetchWithOfflineSupport<T>(
    cacheKey: string,
    fetchFunction: () => Promise<T>
  ): Promise<T | null> {
    // Try cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    // Try offline data if offline
    if (!this.isOnline) {
      const offlineData = await this.getOfflineData(cacheKey);
      if (offlineData) {
        console.log(`Using offline data for ${cacheKey}`);
        return offlineData;
      }
    }

    // Fetch from API if online
    if (this.isOnline) {
      try {
        const data = await fetchFunction();
        this.setCachedData(cacheKey, data);

        // Also store for offline use
        await this.storeOfflineData(cacheKey, data);

        return data;
      } catch (error) {
        console.warn(`Failed to fetch ${cacheKey}:`, error);

        // Fallback to offline data if fetch fails
        const offlineData = await this.getOfflineData(cacheKey);
        if (offlineData) {
          console.log(`Using offline fallback for ${cacheKey}`);
          return offlineData;
        }
      }
    }

    return null;
  }

  // Get offline storage statistics
  public async getOfflineStats(): Promise<{
    queueSize: number;
    storedItems: number;
    totalSize: number;
  }> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter(key => key.startsWith(this.OFFLINE_KEY_PREFIX));

      let totalSize = 0;
      for (const key of offlineKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalSize += data.length;
        }
      }

      return {
        queueSize: this.offlineQueue.length,
        storedItems: offlineKeys.length,
        totalSize
      };
    } catch (error) {
      console.warn('Failed to get offline stats:', error);
      return {
        queueSize: this.offlineQueue.length,
        storedItems: 0,
        totalSize: 0
      };
    }
  }

  // Clear offline data (useful for storage management)
  public async clearOfflineData(): Promise<void> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter(key => key.startsWith(this.OFFLINE_KEY_PREFIX));

      await AsyncStorage.multiRemove(offlineKeys);
      this.offlineQueue = [];

      console.log(`Cleared ${offlineKeys.length} offline analytics items`);
    } catch (error) {
      console.warn('Failed to clear offline data:', error);
    }
  }

  // Private helper methods
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key); // Remove expired cache
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if ((now - value.timestamp) > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }

  private calculateConversionRate(metrics: any[]): number {
    if (!metrics || metrics.length === 0) return 0;

    const totalLeads = metrics.reduce((sum, metric) => sum + (metric.totalLeads || 0), 0);
    const totalConversions = metrics.reduce((sum, metric) => sum + (metric.conversions || 0), 0);

    return totalLeads > 0 ? Math.round((totalConversions / totalLeads) * 100) : 0;
  }

  private calculateAverageDealSize(metrics: any[]): number {
    if (!metrics || metrics.length === 0) return 0;

    const totalRevenue = metrics.reduce((sum, metric) => sum + (metric.revenue || 0), 0);
    const totalConversions = metrics.reduce((sum, metric) => sum + (metric.conversions || 0), 0);

    return totalConversions > 0 ? Math.round(totalRevenue / totalConversions) : 0;
  }

  private calculateAverageResponseTime(activities: any[]): number {
    if (!activities || activities.length === 0) return 0;

    const responseTimes = activities
      .filter(activity => activity.responseTime)
      .map(activity => activity.responseTime);

    if (responseTimes.length === 0) return 0;

    const averageMs = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    return Math.round(averageMs / (1000 * 60 * 60) * 10) / 10; // Convert to hours with 1 decimal
  }

  private async calculateLeadsByScoreCategory(filters?: AnalyticsFilters): Promise<Array<{ category: string; count: number; percentage: number }>> {
    try {
      // Get leads with score filtering
      const leadsResponse = await apiService.getLeads({
        scoreCategory: filters?.scoreCategory,
        limit: 1000 // Get more leads for accurate stats
      });

      const leads = leadsResponse.data || [];
      const totalLeads = leads.length;

      if (totalLeads === 0) return [];

      const categoryCounts = leads.reduce((acc, lead) => {
        const category = lead.scoreCategory || 'Unscored';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(categoryCounts).map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / totalLeads) * 100)
      }));
    } catch (error) {
      console.error('Error calculating leads by score category:', error);
      return [];
    }
  }

  private getDefaultStartDate(timeframe: 'week' | 'month' | 'quarter' = 'month'): string {
    const now = new Date();
    const startDate = new Date(now);

    switch (timeframe) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
    }

    return startDate.toISOString().split('T')[0];
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance();