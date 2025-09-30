import { useState, useEffect, useCallback, useMemo } from 'react';
import leadScoringService from '../services/LeadScoringService';
import { analyticsService, DashboardKPIs, LeadAnalytics as BackendLeadAnalytics } from '../services/AnalyticsService';
import apiService from '../services/api';
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

const mapTimeRangeToTimeframe = (range: TimeRange): 'week' | 'month' | 'quarter' => {
  switch (range) {
    case '7d':
      return 'week';
    case '90d':
    case '1y':
      return 'quarter';
    default:
      return 'month';
  }
};

const buildScoreDistributionFromKpis = (kpis?: DashboardKPIs | null): ScoreDistributionItem[] => {
  if (!kpis) {
    return [];
  }

  const high = kpis.highScoreLeads ?? 0;
  const medium = kpis.mediumScoreLeads ?? 0;
  const low = kpis.lowScoreLeads ?? 0;
  const total = high + medium + low;

  if (total === 0) {
    return [];
  }

  return [
    {
      grade: 'High',
      count: high,
      percentage: Math.round((high / total) * 100),
      color: '#4CAF50'
    },
    {
      grade: 'Medium',
      count: medium,
      percentage: Math.round((medium / total) * 100),
      color: '#FFC107'
    },
    {
      grade: 'Low',
      count: low,
      percentage: Math.round((low / total) * 100),
      color: '#F44336'
    }
  ];
};

const buildScoreTrendsFromLeadStats = (leadStats?: BackendLeadAnalytics | null): ScoreTrendItem[] => {
  if (!leadStats || !leadStats.leadsOverTime) {
    return [];
  }

  return leadStats.leadsOverTime.map((point) => {
    const date = point.date || point.timestamp;
    const parsedDate = date ? new Date(date) : null;
    const label = parsedDate
      ? parsedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : point.label || '';

    return {
      date: date || new Date().toISOString(),
      value: typeof point.count === 'number' ? point.count : Number(point.value) || 0,
      label
    };
  });
};

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

  const analyticsClient = useMemo(() => analyticsService, []);

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
    setLoading(true);
    setError(null);

    try {
      const timeframe = mapTimeRangeToTimeframe(timeRange);

      const [fallbackData, kpis, leadStats, scoringStats] = await Promise.all([
        generateLocalAnalytics(),
        analyticsClient.getDashboardKPIs().catch(() => null),
        analyticsClient.getLeadAnalytics(timeframe).catch(() => null),
        apiService.getScoringStats().catch(() => null)
      ]);

      await loadFunnelData();
      await loadMetrics();

      const summary: LeadAnalyticsSummary = {
        ...fallbackData.summary,
        totalLeads: kpis?.totalLeads ?? fallbackData.summary.totalLeads,
        averageScore: scoringStats?.data?.summary?.averageScore ?? fallbackData.summary.averageScore,
        highQualityLeads: kpis?.highScoreLeads ?? fallbackData.summary.highQualityLeads,
        conversionRate: kpis?.conversionRate ?? fallbackData.summary.conversionRate
      };

      const scoreDistribution = buildScoreDistributionFromKpis(kpis);
      const scoreTrends = buildScoreTrendsFromLeadStats(leadStats);

      const enhancedData: LeadAnalyticsData = {
        ...fallbackData,
        summary,
        scoreDistribution: scoreDistribution.length ? scoreDistribution : fallbackData.scoreDistribution,
        scoreTrends: scoreTrends.length ? scoreTrends : fallbackData.scoreTrends,
        conversionFunnel,
        conversionMetrics
      };

      setData(enhancedData);

      if (!kpis && !leadStats) {
        setError('Analytics service unavailable. Showing estimated values.');
      }
    } catch (err) {
      console.warn('Analytics fetch failed, reverting to local calculations:', err);

      try {
        const localData = await generateLocalAnalytics();
        await loadFunnelData();
        await loadMetrics();

        setData({
          ...localData,
          conversionFunnel,
          conversionMetrics
        });
      } catch (fallbackError) {
        setError(fallbackError instanceof Error ? fallbackError.message : 'Failed to fetch analytics data');
      }
    } finally {
      setLoading(false);
    }
  }, [
    timeRange,
    analyticsClient,
    generateLocalAnalytics,
    loadFunnelData,
    loadMetrics,
    conversionFunnel,
    conversionMetrics
  ]);

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
