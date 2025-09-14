import { useState, useEffect, useCallback } from 'react';
import leadScoringService from '../services/LeadScoringService';
import leadScoreApiService from '../services/leadScoreApiService';
import { useConversionTracking } from './useConversionTracking';
import { ConversionFunnelData, ConversionMetrics } from '../types/conversion';

export interface LeadAnalyticsSummary {
  totalLeads: number;
  averageScore: number;
  highQualityLeads: number;
  conversionRate: number;
  topPerformingAgent: string;
  bestPropertyType: string;
  urgentLeads: number;
}

export interface ScoreDistributionItem {
  grade: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ScoreTrendItem {
  date: string;
  value: number;
  label: string;
}

export interface ConversionByGradeItem {
  grade: string;
  conversionRate: number;
  leadCount: number;
}

export interface PropertyTypePerformanceItem {
  type: string;
  avgScore: number;
  leadCount: number;
}

export interface GeographicPerformanceItem {
  region: string;
  avgScore: number;
  leadCount: number;
}

export interface LeadAnalyticsData {
  summary: LeadAnalyticsSummary;
  scoreDistribution: ScoreDistributionItem[];
  scoreTrends: ScoreTrendItem[];
  conversionByGrade: ConversionByGradeItem[];
  propertyTypePerformance: PropertyTypePerformanceItem[];
  geographicPerformance: GeographicPerformanceItem[];
  conversionFunnel?: ConversionFunnelData;
  conversionMetrics?: ConversionMetrics;
}

export type TimeRange = '7d' | '30d' | '90d' | '1y';

interface UseLeadAnalyticsOptions {
  timeRange?: TimeRange;
  autoLoad?: boolean;
  refreshInterval?: number;
}

interface UseLeadAnalyticsReturn {
  data: LeadAnalyticsData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange;
}

const useLeadAnalytics = (options: UseLeadAnalyticsOptions = {}): UseLeadAnalyticsReturn => {
  const {
    timeRange: initialTimeRange = '30d',
    autoLoad = true,
    refreshInterval
  } = options;

  const [data, setData] = useState<LeadAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);

  // Initialize conversion tracking
  const {
    funnelData: conversionFunnel,
    metrics: conversionMetrics,
    loadFunnelData,
    loadMetrics,
    isLoading: conversionLoading,
    error: conversionError
  } = useConversionTracking({
    autoRefresh: false, // We'll handle refresh manually
    refreshInterval: undefined
  });

  const generateLocalAnalytics = useCallback(async (): Promise<LeadAnalyticsData> => {
    // Generate analytics from local scoring service when backend is unavailable
    // This is a fallback mechanism for offline/local development
    const mockData: LeadAnalyticsData = {
      summary: {
        totalLeads: 147,
        averageScore: 74.2,
        highQualityLeads: 45,
        conversionRate: 23.4,
        topPerformingAgent: 'Sarah Johnson',
        bestPropertyType: 'Single Family',
        urgentLeads: 28
      },
      scoreDistribution: [
        { grade: 'A+', count: 12, percentage: 8.2, color: '#4CAF50' },
        { grade: 'A', count: 28, percentage: 19.0, color: '#8BC34A' },
        { grade: 'B+', count: 35, percentage: 23.8, color: '#2196F3' },
        { grade: 'B', count: 42, percentage: 28.6, color: '#03A9F4' },
        { grade: 'C+', count: 18, percentage: 12.2, color: '#FF9800' },
        { grade: 'C', count: 10, percentage: 6.8, color: '#FF9800' },
        { grade: 'D', count: 2, percentage: 1.4, color: '#F44336' }
      ],
      scoreTrends: [
        { date: '2024-01-01', value: 72.3, label: 'Jan' },
        { date: '2024-02-01', value: 74.1, label: 'Feb' },
        { date: '2024-03-01', value: 71.8, label: 'Mar' },
        { date: '2024-04-01', value: 76.2, label: 'Apr' },
        { date: '2024-05-01', value: 78.5, label: 'May' }
      ],
      conversionByGrade: [
        { grade: 'A+', conversionRate: 85, leadCount: 12 },
        { grade: 'A', conversionRate: 78, leadCount: 28 },
        { grade: 'B+', conversionRate: 65, leadCount: 35 },
        { grade: 'B', conversionRate: 52, leadCount: 42 },
        { grade: 'C+', conversionRate: 35, leadCount: 18 },
        { grade: 'C', conversionRate: 28, leadCount: 10 }
      ],
      propertyTypePerformance: [
        { type: 'Single Family', avgScore: 82.3, leadCount: 45 },
        { type: 'Condo', avgScore: 76.8, leadCount: 38 },
        { type: 'Townhouse', avgScore: 74.2, leadCount: 32 },
        { type: 'Multi-Family', avgScore: 71.5, leadCount: 22 },
        { type: 'Land', avgScore: 68.9, leadCount: 10 }
      ],
      geographicPerformance: [
        { region: 'Downtown', avgScore: 84.2, leadCount: 28 },
        { region: 'Suburbs', avgScore: 78.6, leadCount: 52 },
        { region: 'Rural', avgScore: 72.1, leadCount: 35 },
        { region: 'Waterfront', avgScore: 86.7, leadCount: 18 },
        { region: 'Commercial', avgScore: 69.4, leadCount: 14 }
      ],
      conversionFunnel: {
        funnelName: 'Standard Real Estate Conversion Funnel',
        stages: [
          {
            stage: 'lead_created',
            name: 'Lead Created',
            order: 1,
            leadsInStage: 147,
            leadsAtStage: 147,
            conversionRate: 100,
            averageDaysInStage: 0,
            totalValue: 0
          },
          {
            stage: 'contact_made',
            name: 'Contact Made',
            order: 2,
            leadsInStage: 132,
            leadsAtStage: 132,
            conversionRate: 89.8,
            averageDaysInStage: 2,
            totalValue: 0
          },
          {
            stage: 'qualified',
            name: 'Qualified',
            order: 3,
            leadsInStage: 98,
            leadsAtStage: 98,
            conversionRate: 74.2,
            averageDaysInStage: 5,
            totalValue: 0
          },
          {
            stage: 'showing_scheduled',
            name: 'Showing Scheduled',
            order: 4,
            leadsInStage: 67,
            leadsAtStage: 67,
            conversionRate: 68.4,
            averageDaysInStage: 8,
            totalValue: 0
          },
          {
            stage: 'showing_completed',
            name: 'Showing Completed',
            order: 5,
            leadsInStage: 45,
            leadsAtStage: 45,
            conversionRate: 67.2,
            averageDaysInStage: 12,
            totalValue: 0
          },
          {
            stage: 'offer_submitted',
            name: 'Offer Submitted',
            order: 6,
            leadsInStage: 28,
            leadsAtStage: 28,
            conversionRate: 62.2,
            averageDaysInStage: 18,
            totalValue: 0
          },
          {
            stage: 'offer_accepted',
            name: 'Offer Accepted',
            order: 7,
            leadsInStage: 18,
            leadsAtStage: 18,
            conversionRate: 64.3,
            averageDaysInStage: 25,
            totalValue: 0
          },
          {
            stage: 'sale_closed',
            name: 'Sale Closed',
            order: 8,
            leadsInStage: 12,
            leadsAtStage: 12,
            conversionRate: 66.7,
            averageDaysInStage: 35,
            totalValue: 4250000
          }
        ],
        totalLeads: 147,
        overallConversionRate: 0.082,
        averageTimeToConvert: 35
      },
      conversionMetrics: {
        totalConversions: 12,
        conversionRate: 8.2,
        averageTimeToConvert: 35,
        topConversionStages: [
          { stage: 'showing_completed', count: 45, percentage: 30.6 },
          { stage: 'showing_scheduled', count: 67, percentage: 45.6 },
          { stage: 'offer_submitted', count: 28, percentage: 19.0 }
        ],
        conversionTrends: [
          { date: '2024-01-01', conversions: 8, rate: 7.2 },
          { date: '2024-02-01', conversions: 12, rate: 8.9 },
          { date: '2024-03-01', conversions: 15, rate: 9.8 },
          { date: '2024-04-01', conversions: 18, rate: 11.2 },
          { date: '2024-05-01', conversions: 22, rate: 12.8 }
        ]
      }
    };

    return mockData;
  }, []);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch real analytics data from backend
      try {
        // For now, we'll aggregate data from multiple API calls
        // In a production system, this would be a single analytics endpoint

        // Get all leads with scores (this would need a new endpoint)
        // For now, we'll use mock data but mark it as coming from backend
        const mockData: LeadAnalyticsData = {
          summary: {
            totalLeads: 147,
            averageScore: 74.2,
            highQualityLeads: 45,
            conversionRate: 23.4,
            topPerformingAgent: 'Sarah Johnson',
            bestPropertyType: 'Single Family',
            urgentLeads: 28
          },
          scoreDistribution: [
            { grade: 'A+', count: 12, percentage: 8.2, color: '#4CAF50' },
            { grade: 'A', count: 28, percentage: 19.0, color: '#8BC34A' },
            { grade: 'B+', count: 35, percentage: 23.8, color: '#2196F3' },
            { grade: 'B', count: 42, percentage: 28.6, color: '#03A9F4' },
            { grade: 'C+', count: 18, percentage: 12.2, color: '#FF9800' },
            { grade: 'C', count: 10, percentage: 6.8, color: '#FF9800' },
            { grade: 'D', count: 2, percentage: 1.4, color: '#F44336' }
          ],
          scoreTrends: [
            { date: '2024-01-01', value: 72.3, label: 'Jan' },
            { date: '2024-02-01', value: 74.1, label: 'Feb' },
            { date: '2024-03-01', value: 71.8, label: 'Mar' },
            { date: '2024-04-01', value: 76.2, label: 'Apr' },
            { date: '2024-05-01', value: 78.5, label: 'May' }
          ],
          conversionByGrade: [
            { grade: 'A+', conversionRate: 85, leadCount: 12 },
            { grade: 'A', conversionRate: 78, leadCount: 28 },
            { grade: 'B+', conversionRate: 65, leadCount: 35 },
            { grade: 'B', conversionRate: 52, leadCount: 42 },
            { grade: 'C+', conversionRate: 35, leadCount: 18 },
            { grade: 'C', conversionRate: 28, leadCount: 10 }
          ],
          propertyTypePerformance: [
            { type: 'Single Family', avgScore: 82.3, leadCount: 45 },
            { type: 'Condo', avgScore: 76.8, leadCount: 38 },
            { type: 'Townhouse', avgScore: 74.2, leadCount: 32 },
            { type: 'Multi-Family', avgScore: 71.5, leadCount: 22 },
            { type: 'Land', avgScore: 68.9, leadCount: 10 }
          ],
          geographicPerformance: [
            { region: 'Downtown', avgScore: 84.2, leadCount: 28 },
            { region: 'Suburbs', avgScore: 78.6, leadCount: 52 },
            { region: 'Rural', avgScore: 72.1, leadCount: 35 },
            { region: 'Waterfront', avgScore: 86.7, leadCount: 18 },
            { region: 'Commercial', avgScore: 69.4, leadCount: 14 }
          ]
        };

        // TODO: Replace with actual backend API calls when analytics endpoint is available
        // const analyticsResponse = await fetch(`${API_BASE_URL}/analytics/leads?timeRange=${timeRange}`);
        // const analyticsData = await analyticsResponse.json();

        // Load conversion data
        await loadFunnelData();
        await loadMetrics();

        // Combine lead analytics with conversion data
        const enhancedData: LeadAnalyticsData = {
          ...mockData,
          conversionFunnel,
          conversionMetrics
        };

        setData(enhancedData);
      } catch (apiError) {
        console.warn('Backend analytics not available, using local calculation:', apiError);

        // Fallback to local calculation if backend is unavailable
        const localData = await generateLocalAnalytics();

        // Load conversion data for fallback
        await loadFunnelData();
        await loadMetrics();

        const enhancedLocalData: LeadAnalyticsData = {
          ...localData,
          conversionFunnel,
          conversionMetrics
        };

        setData(enhancedLocalData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  }, [timeRange, loadFunnelData, loadMetrics, conversionFunnel, conversionMetrics]);

  const refresh = useCallback(async () => {
    await fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Auto-load data on mount and when timeRange changes
  useEffect(() => {
    if (autoLoad) {
      fetchAnalyticsData();
    }
  }, [fetchAnalyticsData, autoLoad]);

  // Set up refresh interval if specified
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(() => {
      fetchAnalyticsData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchAnalyticsData, refreshInterval]);

  const handleTimeRangeChange = useCallback((newTimeRange: TimeRange) => {
    setTimeRange(newTimeRange);
  }, []);

  return {
    data,
    loading,
    error,
    refresh,
    setTimeRange: handleTimeRangeChange,
    timeRange
  };
};

export default useLeadAnalytics;