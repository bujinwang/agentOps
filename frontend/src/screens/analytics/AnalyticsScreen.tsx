import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { apiService } from '../../services/api';
import { analyticsService } from '../../services/AnalyticsService';
import { formatCurrency, formatDate } from '../../utils/validation';
import MaterialChart from '../../components/MaterialChart';
import InteractiveChart from '../../components/analytics/InteractiveChart';
import KPICard from '../../components/analytics/KPICard';
import TrendChart from '../../components/analytics/TrendChart';
import ComparisonChart from '../../components/analytics/ComparisonChart';
import FunnelChart from '../../components/analytics/FunnelChart';
import ConversionFunnel from '../../components/analytics/ConversionFunnel';
import ConversionMetricsCard from '../../components/analytics/ConversionMetricsCard';
import { useWebSocketAnalytics } from '../../hooks/useWebSocketAnalytics';
import { useLoadingState } from '../../utils/loadingState';
import { CompactListSkeleton } from '../../components/common/SkeletonList';
import {
  MaterialColors,
  MaterialElevation,
  MaterialSpacing,
  MaterialTypography
} from '../../styles/MaterialDesign';
import {
  DashboardKPIs,
  LeadAnalytics,
  PerformanceMetrics,
  DateRange
} from '../../types';

interface AnalyticsScreenProps {
  navigation: any;
}

interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  activeTasks: number;
  completedTasks: number;
  leadsThisMonth: number;
  conversionRate: number;
  recentActivity: any[];
}

interface LeadStats {
  leadsByStatus: Array<{ status: string; count: number }>;
  leadsBySource: Array<{ source: string; count: number }>;
  leadsByPriority: Array<{ priority: string; count: number }>;
  leadsOverTime: Array<{ date: string; count: number }>;
}

interface ConversionStage {
  stage_name: string;
  stage_order: number;
  lead_count: number;
  avg_probability: number;
  total_value: number;
}

interface ConversionMetrics {
  total_leads: number;
  leads_in_pipeline: number;
  conversion_rate: number;
  average_deal_size: number;
  pipeline_value: number;
  leads_won: number;
  leads_lost: number;
  average_conversion_time: number;
}

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ navigation }) => {
  const { analyticsData, isLoading: wsLoading, error: wsError, reconnect } = useWebSocketAnalytics();

  // Enhanced loading state management
  const initialLoadingState = useLoadingState();
  const refreshLoadingState = useLoadingState();
  const comparisonLoadingState = useLoadingState();

  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('month');

  // New analytics state using AnalyticsService
  const [dashboardKPIs, setDashboardKPIs] = useState<DashboardKPIs | null>(null);
  const [leadAnalytics, setLeadAnalytics] = useState<LeadAnalytics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [comparisonMode, setComparisonMode] = useState<'none' | 'time' | 'category'>('none');
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');
  const [isOffline, setIsOffline] = useState(false);
  const [offlineStats, setOfflineStats] = useState<{
    queueSize: number;
    storedItems: number;
    totalSize: number;
  } | null>(null);
  const [httpDashboardStats, setHttpDashboardStats] = useState<DashboardStats | null>(null);
  const [httpLeadStats, setHttpLeadStats] = useState<LeadStats | null>(null);
  const [httpConversionFunnel, setHttpConversionFunnel] = useState<ConversionStage[]>([]);
  const [httpConversionMetrics, setHttpConversionMetrics] = useState<ConversionMetrics | null>(null);

  // Extract data from WebSocket hook
  const { dashboardStats, leadStats, conversionFunnel, conversionMetrics, isConnected, lastUpdate } = analyticsData;

  const resolvedDashboardStats = useMemo(() => dashboardStats || httpDashboardStats || null, [dashboardStats, httpDashboardStats]);
  const resolvedLeadStats = useMemo(() => leadStats || httpLeadStats || null, [leadStats, httpLeadStats]);
  const resolvedConversionFunnel = useMemo(() => {
    if (conversionFunnel && conversionFunnel.length > 0) {
      return conversionFunnel;
    }
    return httpConversionFunnel;
  }, [conversionFunnel, httpConversionFunnel]);
  const resolvedConversionMetrics = useMemo(() => conversionMetrics || httpConversionMetrics || null, [conversionMetrics, httpConversionMetrics]);

  const screenWidth = Dimensions.get('window').width;

  // Load initial data on mount and timeframe change
  useEffect(() => {
    loadInitialData();
  }, [timeframe]);

  // Network status monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected ?? true;
      setIsOffline(!online);
      analyticsService.setOnlineStatus(online);

      if (online) {
        loadOfflineStats();
      }
    });

    // Initial network check
    NetInfo.fetch().then(state => {
      const online = state.isConnected ?? true;
      setIsOffline(!online);
      analyticsService.setOnlineStatus(online);

      if (online) {
        loadOfflineStats();
      }
    });

    return () => unsubscribe();
  }, []);

  const loadOfflineStats = async () => {
    try {
      const stats = await analyticsService.getOfflineStats();
      setOfflineStats(stats);
    } catch (error) {
      console.warn('Failed to load offline stats:', error);
    }
  };

  const loadInitialData = async () => {
    initialLoadingState.startLoading('Loading analytics data...');

    try {
      // Load data using the new AnalyticsService with loading callbacks
      const [kpis, analytics, performance] = await Promise.all([
        analyticsService.getDashboardKPIsWithLoading({ dateRange }, {
          onStart: initialLoadingState.startLoading,
          onProgress: initialLoadingState.updateProgress,
          onComplete: initialLoadingState.stopLoading,
          onError: initialLoadingState.setError,
        }),
        analyticsService.getLeadAnalyticsWithLoading(timeframe, { dateRange }, {
          onStart: initialLoadingState.startLoading,
          onProgress: initialLoadingState.updateProgress,
          onComplete: initialLoadingState.stopLoading,
          onError: initialLoadingState.setError,
        }),
        analyticsService.getPerformanceMetrics({ dateRange }),
      ]);

      if (kpis) setDashboardKPIs(kpis);
      if (analytics) setLeadAnalytics(analytics);
      setPerformanceMetrics(performance);

      // Also load legacy data for backward compatibility
      const [dashboardResponse, leadStatsResponse, conversionResponse, metricsResponse] = await Promise.all([
        apiService.getDashboardStatsWithLoading({
          onStart: initialLoadingState.startLoading,
          onProgress: initialLoadingState.updateProgress,
          onComplete: initialLoadingState.stopLoading,
          onError: initialLoadingState.setError,
        }),
        apiService.getLeadStats(timeframe),
        apiService.getConversionFunnel(),
        apiService.getConversionMetrics(dateRange),
      ]);

      if (dashboardResponse?.data) {
        setHttpDashboardStats(dashboardResponse.data);
      }

      if (leadStatsResponse?.data) {
        setHttpLeadStats(leadStatsResponse.data);
      }

      if (Array.isArray(conversionResponse?.data)) {
        setHttpConversionFunnel(conversionResponse.data as ConversionStage[]);
      }

      if (metricsResponse?.data) {
        setHttpConversionMetrics(metricsResponse.data as unknown as ConversionMetrics);
      }

      console.log('Analytics data loaded successfully');
      initialLoadingState.stopLoading();
    } catch (error) {
      console.error('Error loading analytics:', error);
      initialLoadingState.setError('Failed to load analytics data');
    }
  };

  const handleRefresh = async () => {
    refreshLoadingState.startLoading('Refreshing analytics...');

    try {
      await loadInitialData();
      if (wsError) {
        await reconnect(); // Try to reconnect WebSocket if there was an error
      }
      refreshLoadingState.stopLoading();
    } catch (error) {
      console.error('Error refreshing analytics:', error);
      refreshLoadingState.setError('Failed to refresh analytics');
    }
  };

  const handleExport = async () => {
    if (!dashboardKPIs) return;

    setIsExporting(true);
    try {
      const exportData = await analyticsService.exportAnalyticsData(
        exportFormat,
        dateRange,
        true // include charts
      );

      // Create a download link for the exported file
      const blob = new Blob([exportData as any], {
        type: exportFormat === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('Analytics data exported successfully');
    } catch (error) {
      console.error('Error exporting analytics data:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (!dashboardKPIs) return;

    try {
      // Create a shareable summary
      const shareData = {
        title: 'Analytics Report',
        text: `Business Analytics Report - ${new Date().toLocaleDateString()}\n\n` +
              `Total Leads: ${dashboardKPIs.totalLeads}\n` +
              `New Leads: ${dashboardKPIs.newLeads}\n` +
              `Conversion Rate: ${dashboardKPIs.conversionRate}%\n` +
              `Average Deal Size: $${dashboardKPIs.averageDealSize}\n\n` +
              'Generated by Real Estate CRM Analytics',
        url: window.location.href
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(
          `${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`
        );
        // You could show a toast notification here
        console.log('Analytics summary copied to clipboard');
      }
    } catch (error) {
      console.error('Error sharing analytics:', error);
    }
  };

  const handleTimeframeChange = (period: 'week' | 'month' | 'quarter') => {
    setTimeframe(period);
  };

  const handleComparisonModeChange = (mode: 'none' | 'time' | 'category') => {
    setComparisonMode(mode);
    if (mode !== 'none') {
      loadComparisonData(mode);
    } else {
      setComparisonData(null);
    }
  };

  const loadComparisonData = async (mode: 'time' | 'category') => {
    try {
      if (mode === 'time') {
        // Compare current period with previous period
        const currentPeriod = await analyticsService.getDashboardKPIs({ dateRange });
        const previousStart = new Date(dateRange.startDate);
        const previousEnd = new Date(dateRange.endDate);

        const periodDiff = previousEnd.getTime() - previousStart.getTime();
        previousStart.setTime(previousStart.getTime() - periodDiff);
        previousEnd.setTime(previousEnd.getTime() - periodDiff);

        const previousPeriod = await analyticsService.getDashboardKPIs({
          dateRange: {
            startDate: previousStart.toISOString().split('T')[0],
            endDate: previousEnd.toISOString().split('T')[0]
          }
        });

        setComparisonData({
          type: 'time',
          data: [
            {
              label: 'Previous Period',
              values: {
                totalLeads: previousPeriod.totalLeads,
                newLeads: previousPeriod.newLeads,
                conversionRate: previousPeriod.conversionRate,
                averageDealSize: previousPeriod.averageDealSize
              }
            },
            {
              label: 'Current Period',
              values: {
                totalLeads: currentPeriod.totalLeads,
                newLeads: currentPeriod.newLeads,
                conversionRate: currentPeriod.conversionRate,
                averageDealSize: currentPeriod.averageDealSize
              }
            }
          ],
          categories: ['totalLeads', 'newLeads', 'conversionRate', 'averageDealSize'],
          categoryLabels: {
            totalLeads: 'Total Leads',
            newLeads: 'New Leads',
            conversionRate: 'Conversion Rate (%)',
            averageDealSize: 'Avg Deal Size ($)'
          }
        });
      } else if (mode === 'category') {
        // Compare lead categories
        const analytics = await analyticsService.getLeadAnalytics(timeframe, { dateRange });
        const categoryData = analytics.leadsByScoreCategory.map(cat => ({
          label: cat.category,
          values: {
            count: cat.count,
            percentage: cat.percentage
          }
        }));

        setComparisonData({
          type: 'category',
          data: categoryData,
          categories: ['count', 'percentage'],
          categoryLabels: {
            count: 'Lead Count',
            percentage: 'Percentage (%)'
          }
        });
      }
    } catch (error) {
      console.error('Error loading comparison data:', error);
    }
  };

  const renderTimeframeSelector = () => (
    <View style={styles.timeframeContainer}>
      {(['week', 'month', 'quarter'] as const).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.timeframeButton,
            timeframe === period && styles.timeframeButtonActive
          ]}
          onPress={() => handleTimeframeChange(period)}
        >
          <Text style={[
            styles.timeframeButtonText,
            timeframe === period && styles.timeframeButtonTextActive
          ]}>
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderComparisonModeSelector = () => (
    <View style={styles.comparisonContainer}>
      <Text style={styles.comparisonTitle}>Compare:</Text>
      {(['none', 'time', 'category'] as const).map((mode) => (
        <TouchableOpacity
          key={mode}
          style={[
            styles.comparisonButton,
            comparisonMode === mode && styles.comparisonButtonActive
          ]}
          onPress={() => handleComparisonModeChange(mode)}
        >
          <Text style={[
            styles.comparisonButtonText,
            comparisonMode === mode && styles.comparisonButtonTextActive
          ]}>
            {mode === 'none' ? 'None' : mode === 'time' ? 'Time Periods' : 'Categories'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderComparisonChart = () => {
    if (!comparisonData || comparisonMode === 'none') return null;

    return (
      <View style={styles.comparisonSection}>
        <Text style={styles.sectionTitle}>
          {comparisonMode === 'time' ? 'Period Comparison' : 'Category Comparison'}
        </Text>
        <ComparisonChart
          title={comparisonMode === 'time' ? 'Performance Comparison' : 'Lead Categories'}
          data={comparisonData.data}
          categories={comparisonData.categories}
          categoryLabels={comparisonData.categoryLabels}
          height={280}
          showValues={true}
          orientation={comparisonMode === 'time' ? 'horizontal' : 'vertical'}
        />
      </View>
    );
  };

  const renderKPIcards = () => {
    if (!resolvedDashboardStats) return null;

    const baseKpiData = [
      {
        title: 'Total Leads',
        value: resolvedDashboardStats.totalLeads,
        subtitle: 'All time',
        color: MaterialColors.primary[500],
        trend: 'up' as const
      },
      {
        title: 'New Leads',
        value: resolvedDashboardStats.newLeads,
        subtitle: 'This period',
        color: MaterialColors.secondary[500],
        trend: 'up' as const
      },
      {
        title: 'Active Tasks',
        value: resolvedDashboardStats.activeTasks,
        subtitle: 'Pending',
        color: MaterialColors.warning[500],
        trend: 'down' as const
      },
      {
        title: 'Conversion Rate',
        value: `${resolvedDashboardStats.conversionRate.toFixed(1)}%`,
        subtitle: 'Lead to client',
        color: resolvedDashboardStats.conversionRate > 15 ? MaterialColors.secondary[500] : MaterialColors.error[500],
        trend: resolvedDashboardStats.conversionRate > 10 ? 'up' as const : 'down' as const
      },
      {
        title: 'Leads This Month',
        value: resolvedDashboardStats.leadsThisMonth,
        subtitle: 'This month',
        color: MaterialColors.primary[300],
        trend: 'up' as const
      },
      {
        title: 'Completed Tasks',
        value: resolvedDashboardStats.completedTasks,
        subtitle: 'This period',
        color: MaterialColors.secondary[300],
        trend: 'up' as const
      }
    ];

    // Add conversion-specific KPIs if data is available
    const conversionKpiData = [];
    if (resolvedConversionMetrics) {
      conversionKpiData.push(
        {
          title: 'Pipeline Value',
          value: formatCurrency(resolvedConversionMetrics.pipeline_value || 0),
          subtitle: 'Total opportunity value',
          color: MaterialColors.secondary[600],
          trend: 'up' as const
        },
        {
          title: 'Avg Deal Size',
          value: formatCurrency(resolvedConversionMetrics.average_deal_size || 0),
          subtitle: 'Won deals average',
          color: MaterialColors.primary[600],
          trend: 'up' as const
        },
        {
          title: 'Win Rate',
          value: resolvedConversionMetrics.total_leads > 0
            ? `${((resolvedConversionMetrics.leads_won / Math.max(resolvedConversionMetrics.leads_won + resolvedConversionMetrics.leads_lost, 1)) * 100).toFixed(1)}%`
            : '0.0%',
          subtitle: 'Deals won vs lost',
          color: (resolvedConversionMetrics.leads_won / Math.max(resolvedConversionMetrics.leads_won + resolvedConversionMetrics.leads_lost, 1)) > 0.2
            ? MaterialColors.secondary[500]
            : MaterialColors.warning[500],
          trend: 'up' as const
        },
        {
          title: 'Conversion Velocity',
          value: resolvedConversionMetrics.average_conversion_time > 0
            ? `${Math.round(resolvedConversionMetrics.average_conversion_time)} days`
            : 'N/A',
          subtitle: 'Avg time to convert',
          color: MaterialColors.neutral[600],
          trend: 'down' as const
        }
      );
    }

    const allKpiData = [...baseKpiData, ...conversionKpiData];

    return (
      <View style={styles.kpiContainer}>
        {allKpiData.map((kpi, index) => (
          <KPICard
            key={index}
            title={kpi.title}
            value={kpi.value}
            subtitle={kpi.subtitle}
            color={kpi.color}
            trend={kpi.trend}
            size="medium"
          />
        ))}
      </View>
    );
  };

  const renderLeadStatusChart = () => {
    if (!resolvedLeadStats?.leadsByStatus) return null;

    const chartData = resolvedLeadStats.leadsByStatus.map(item => ({
      label: item.status,
      value: item.count,
      color: getStatusColor(item.status),
      details: {
        count: item.count,
        percentage: resolvedLeadStats.leadsByStatus.reduce((sum, s) => sum + s.count, 0) > 0
          ? (item.count / resolvedLeadStats.leadsByStatus.reduce((sum, s) => sum + s.count, 0)) * 100
          : 0,
        trend: Math.random() * 20 - 10, // Mock trend data - replace with real data
        subItems: [
          { label: 'Hot', value: Math.floor(item.count * 0.3), color: MaterialColors.error[500] },
          { label: 'Warm', value: Math.floor(item.count * 0.5), color: MaterialColors.warning[500] },
          { label: 'Cold', value: Math.floor(item.count * 0.2), color: MaterialColors.neutral[500] },
        ]
      }
    }));

    const handleStatusPress = (segment: any) => {
      Alert.alert(
        'Lead Status Insight',
        `${segment.label}: ${segment.details.count} leads (${segment.details.percentage.toFixed(1)}%)`
      );
    };

    return (
      <InteractiveChart
        title="Leads by Status"
        data={chartData}
        type="bar"
        height={280}
        showValues={true}
        onSegmentPress={handleStatusPress}
        enableDrillDown={true}
      />
    );
  };

  const renderLeadSourceChart = () => {
    if (!resolvedLeadStats?.leadsBySource) return null;

    const chartData = resolvedLeadStats.leadsBySource.map(item => ({
      label: item.source,
      value: item.count,
      color: getSourceColor(item.source),
      details: {
        count: item.count,
        percentage: resolvedLeadStats.leadsBySource.reduce((sum, s) => sum + s.count, 0) > 0
          ? (item.count / resolvedLeadStats.leadsBySource.reduce((sum, s) => sum + s.count, 0)) * 100
          : 0,
        trend: Math.random() * 30 - 15, // Mock trend data - replace with real data
        subItems: [
          { label: 'Qualified', value: Math.floor(item.count * 0.6), color: MaterialColors.secondary[500] },
          { label: 'Unqualified', value: Math.floor(item.count * 0.4), color: MaterialColors.neutral[500] },
        ]
      }
    }));

    const handleSourcePress = (segment: any) => {
      Alert.alert(
        'Lead Source Insight',
        `${segment.label}: ${segment.details.count} leads (${segment.details.percentage.toFixed(1)}%)`
      );
    };

    return (
      <InteractiveChart
        title="Leads by Source"
        data={chartData}
        type="pie"
        height={320}
        showValues={true}
        onSegmentPress={handleSourcePress}
        enableDrillDown={true}
      />
    );
  };

  const renderConversionFunnel = () => {
    const funnelData = resolvedConversionFunnel;
    if (!funnelData || funnelData.length === 0) return null;

    const handleStagePress = (stage: ConversionStage) => {
      Alert.alert(
        'Conversion Stage Details',
        `${stage.stage_name || stage.stage} \nLeads: ${stage.lead_count} \nAvg Probability: ${Math.round((stage.avg_probability || 0) * 100)}%`
      );
    };

    return (
      <ConversionFunnel
        data={funnelData}
        onStagePress={handleStagePress}
        showValues={true}
        showProbabilities={true}
        height={350}
      />
    );
  };

  const getStatusColor = (status: string): string => {
    const colors = {
      'New': MaterialColors.primary[500],
      'Contacted': MaterialColors.secondary[500],
      'Qualified': MaterialColors.warning[500],
      'Showing Scheduled': MaterialColors.neutral[600],
      'Offer Made': MaterialColors.error[500],
      'Closed Won': MaterialColors.secondary[700],
      'Closed Lost': MaterialColors.neutral[500],
      'Archived': MaterialColors.neutral[400],
    };
    return colors[status as keyof typeof colors] || MaterialColors.neutral[500];
  };

  const getSourceColor = (source: string): string => {
    const colors = {
      'Website': MaterialColors.primary[500],
      'Referral': MaterialColors.secondary[500],
      'Social Media': MaterialColors.primary[300],
      'Email Campaign': MaterialColors.secondary[300],
      'PPC': MaterialColors.warning[500],
      'Direct': MaterialColors.neutral[600],
      'Phone': MaterialColors.primary[700],
      'Other': MaterialColors.neutral[500],
    };
    return colors[source as keyof typeof colors] || MaterialColors.neutral[500];
  };

  if (initialLoadingState.isLoading && !resolvedDashboardStats) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header skeleton */}
        <View style={[styles.header, { backgroundColor: MaterialColors.surface }]}>
          <View style={styles.headerContent}>
            <View style={{ flex: 1 }}>
              <View style={{ height: 24, backgroundColor: MaterialColors.neutral[200], borderRadius: 4, marginBottom: 8 }} />
              <View style={{ height: 16, backgroundColor: MaterialColors.neutral[200], borderRadius: 4, width: '60%' }} />
            </View>
          </View>
        </View>

        {/* Timeframe selector skeleton */}
        <View style={[styles.timeframeContainer, { backgroundColor: MaterialColors.surface }]}>
          {[1, 2, 3].map(i => (
            <View key={i} style={[styles.timeframeButton, { backgroundColor: MaterialColors.neutral[200] }]} />
          ))}
        </View>

        {/* KPI cards skeleton */}
        <View style={styles.kpiContainer}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <View key={i} style={[styles.card, { height: 100, backgroundColor: MaterialColors.surface }]}>
              <View style={{ height: 16, backgroundColor: MaterialColors.neutral[200], borderRadius: 4, marginBottom: 8 }} />
              <View style={{ height: 24, backgroundColor: MaterialColors.neutral[200], borderRadius: 4, width: '70%' }} />
            </View>
          ))}
        </View>

        {/* Charts skeleton */}
        <View style={styles.chartsSection}>
          <CompactListSkeleton count={3} animated={true} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshLoadingState.isLoading} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Analytics Dashboard</Text>
              <Text style={styles.headerSubtitle}>Business performance insights</Text>
            </View>
            <View style={styles.headerActions}>
              <View style={styles.connectionStatus}>
                <View style={[
                  styles.connectionIndicator,
                  {
                    backgroundColor: isOffline
                      ? MaterialColors.warning[500]
                      : isConnected
                      ? MaterialColors.secondary[500]
                      : MaterialColors.error[500]
                  }
                ]} />
                <Text style={styles.connectionText}>
                  {isOffline ? 'Offline' : isConnected ? 'Live' : 'Connecting...'}
                </Text>
                {lastUpdate && (
                  <Text style={styles.lastUpdateText}>
                    Updated: {formatDate(lastUpdate.toISOString())}
                  </Text>
                )}
                {isOffline && offlineStats && (
                  <Text style={styles.offlineStatsText}>
                    {offlineStats.storedItems} items cached ({Math.round(offlineStats.totalSize / 1024)}KB)
                  </Text>
                )}
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.shareButton]}
                  onPress={handleShare}
                  disabled={!dashboardKPIs}
                >
                  <Text style={styles.actionButtonText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.exportButton]}
                  onPress={handleExport}
                  disabled={!dashboardKPIs || isExporting}
                >
                  <Text style={styles.actionButtonText}>
                    {isExporting ? 'Exporting...' : 'Export'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          {wsError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Connection Error: {wsError}
              </Text>
              <TouchableOpacity onPress={reconnect} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Timeframe Selector */}
        {renderTimeframeSelector()}

        {/* Comparison Mode Selector */}
        {renderComparisonModeSelector()}

        {/* KPI Cards */}
        {renderKPIcards()}

        {/* Comparison Chart */}
        {renderComparisonChart()}

        {/* Conversion Metrics Card */}
        {resolvedConversionMetrics && (
          <ConversionMetricsCard
            metrics={resolvedConversionMetrics}
            onPress={() => {
              const details = [
                `Pipeline Value: ${formatCurrency(resolvedConversionMetrics.pipeline_value || 0)}`,
                `Average Deal Size: ${formatCurrency(resolvedConversionMetrics.average_deal_size || 0)}`,
                `Win Rate: ${resolvedConversionMetrics.total_leads > 0
                  ? `${((resolvedConversionMetrics.leads_won / Math.max(resolvedConversionMetrics.leads_won + resolvedConversionMetrics.leads_lost, 1)) * 100).toFixed(1)}%`
                  : '0.0%'}`,
                `Average Conversion Time: ${resolvedConversionMetrics.average_conversion_time > 0
                  ? `${Math.round(resolvedConversionMetrics.average_conversion_time)} days`
                  : 'Not available'}`
              ].join('\n');

              Alert.alert('Conversion Insights', details);
            }}
            showDetails={true}
          />
        )}

        {/* Charts Section */}
        <View style={styles.chartsSection}>
          {renderLeadStatusChart()}
          {renderLeadSourceChart()}
          {renderConversionFunnel()}
        </View>

        {/* Performance & Offline Info */}
        {(offlineStats || !analyticsService.isOnlineStatus()) && (
          <View style={styles.performanceInfo}>
            <Text style={styles.performanceTitle}>Performance Info</Text>
            <View style={styles.performanceStats}>
              {offlineStats && (
                <Text style={styles.performanceText}>
                  📱 {offlineStats.storedItems} cached items
                </Text>
              )}
              <Text style={styles.performanceText}>
                {analyticsService.isOnlineStatus() ? '🟢 Online' : '🟡 Offline'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MaterialColors.neutral[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: MaterialColors.neutral[50],
  },
  loadingText: {
    marginTop: MaterialSpacing.md,
    ...MaterialTypography.bodyLarge,
    color: MaterialColors.neutral[600],
  },
  scrollContainer: {
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.lg,
  },
  header: {
    marginBottom: MaterialSpacing.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    ...MaterialTypography.headlineMedium,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.xs,
  },
  headerSubtitle: {
    ...MaterialTypography.bodyLarge,
    color: MaterialColors.neutral[600],
  },
  connectionStatus: {
    alignItems: 'flex-end',
  },
  connectionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: MaterialSpacing.xs,
  },
  connectionText: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
    fontWeight: '500',
  },
  lastUpdateText: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
    marginTop: MaterialSpacing.xs,
  },
  errorContainer: {
    marginTop: MaterialSpacing.md,
    padding: MaterialSpacing.md,
    backgroundColor: MaterialColors.error[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MaterialColors.error[200],
  },
  errorText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.error[700],
    marginBottom: MaterialSpacing.sm,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.xs,
    backgroundColor: MaterialColors.error[500],
    borderRadius: 6,
  },
  retryButtonText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.onError,
    fontWeight: '600',
  },
  timeframeContainer: {
    flexDirection: 'row',
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.xs,
    marginBottom: MaterialSpacing.xl,
    ...MaterialElevation.level1,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: MaterialSpacing.sm,
    paddingHorizontal: MaterialSpacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeframeButtonActive: {
    backgroundColor: MaterialColors.primary[500],
  },
  timeframeButtonText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.neutral[600],
  },
  timeframeButtonTextActive: {
    color: MaterialColors.onPrimary,
  },
  kpiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: MaterialSpacing.xl,
  },
  chartsSection: {
    marginBottom: MaterialSpacing.xl,
  },
  card: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.lg,
    marginBottom: MaterialSpacing.md,
    ...MaterialElevation.level1,
  },
  cardTitle: {
    ...MaterialTypography.titleLarge,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.md,
  },
  funnelCard: {
    marginTop: MaterialSpacing.md,
  },
  funnelContainer: {
    marginTop: MaterialSpacing.md,
  },
  funnelStage: {
    marginBottom: MaterialSpacing.lg,
  },
  funnelStageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.sm,
  },
  funnelStageLabel: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[800],
    fontWeight: '500',
  },
  funnelStageValue: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
    fontWeight: '600',
  },
  funnelBarContainer: {
    height: 8,
    backgroundColor: MaterialColors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  funnelBar: {
    height: '100%',
    borderRadius: 4,
  },
  bottomSpacer: {
    height: 100,
  },
  comparisonContainer: {
    flexDirection: 'row',
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.md,
    marginBottom: MaterialSpacing.lg,
    ...MaterialElevation.level1,
    alignItems: 'center',
  },
  comparisonTitle: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[700],
    marginRight: MaterialSpacing.md,
    fontWeight: '600',
  },
  comparisonButton: {
    flex: 1,
    paddingVertical: MaterialSpacing.sm,
    paddingHorizontal: MaterialSpacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: MaterialSpacing.xs,
  },
  comparisonButtonActive: {
    backgroundColor: MaterialColors.primary[500],
  },
  comparisonButtonText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.neutral[600],
  },
  comparisonButtonTextActive: {
    color: MaterialColors.onPrimary,
  },
  comparisonSection: {
    marginBottom: MaterialSpacing.xl,
  },
  sectionTitle: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.md,
    textAlign: 'center',
  },
  headerActions: {
    alignItems: 'flex-end',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: MaterialSpacing.sm,
  },
  actionButton: {
    paddingHorizontal: MaterialSpacing.lg,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: 8,
    marginLeft: MaterialSpacing.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  shareButton: {
    backgroundColor: MaterialColors.secondary[500],
  },
  exportButton: {
    backgroundColor: MaterialColors.primary[500],
  },
  actionButtonText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  offlineStatsText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[500],
    marginTop: MaterialSpacing.xs / 2,
  },
  performanceInfo: {
    backgroundColor: MaterialColors.neutral[50],
    borderRadius: 8,
    padding: MaterialSpacing.md,
    marginHorizontal: MaterialSpacing.md,
    marginBottom: MaterialSpacing.md,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[200],
  },
  performanceTitle: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[800],
    fontWeight: '600',
    marginBottom: MaterialSpacing.sm,
  },
  performanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[600],
  },
});

export default AnalyticsScreen;
