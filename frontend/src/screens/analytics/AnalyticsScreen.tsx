import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { apiService } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/validation';
import MaterialChart from '../../components/MaterialChart';
import MaterialKPICard from '../../components/MaterialKPICard';
import { 
  MaterialColors, 
  MaterialElevation, 
  MaterialSpacing, 
  MaterialTypography 
} from '../../styles/MaterialDesign';

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

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ navigation }) => {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('month');

  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    loadAnalyticsData();
  }, [timeframe]);

  const loadAnalyticsData = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [dashboardResponse, leadStatsResponse] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getLeadStats(timeframe),
      ]);

      setDashboardStats(dashboardResponse.data);
      setLeadStats(leadStatsResponse.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadAnalyticsData(true);
  };

  const handleTimeframeChange = (period: 'week' | 'month' | 'quarter') => {
    setTimeframe(period);
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

  const renderKPIcards = () => {
    if (!dashboardStats) return null;

    const kpiData = [
      {
        title: 'Total Leads',
        value: dashboardStats.totalLeads,
        subtitle: 'All time',
        color: MaterialColors.primary[500],
        trend: { value: 12.5, isPositive: true }
      },
      {
        title: 'New Leads',
        value: dashboardStats.newLeads,
        subtitle: 'This period',
        color: MaterialColors.secondary[500],
        trend: { value: 8.3, isPositive: true }
      },
      {
        title: 'Active Tasks',
        value: dashboardStats.activeTasks,
        subtitle: 'Pending',
        color: MaterialColors.warning[500],
        trend: { value: 5.2, isPositive: false }
      },
      {
        title: 'Conversion Rate',
        value: `${dashboardStats.conversionRate.toFixed(1)}%`,
        subtitle: 'Lead to client',
        color: dashboardStats.conversionRate > 15 ? MaterialColors.secondary[500] : MaterialColors.error[500],
        trend: { value: 2.1, isPositive: dashboardStats.conversionRate > 10 }
      },
      {
        title: 'Leads This Month',
        value: dashboardStats.leadsThisMonth,
        subtitle: 'This month',
        color: MaterialColors.primary[300],
        trend: { value: 15.7, isPositive: true }
      },
      {
        title: 'Completed Tasks',
        value: dashboardStats.completedTasks,
        subtitle: 'This period',
        color: MaterialColors.secondary[300],
        trend: { value: 22.4, isPositive: true }
      }
    ];

    return (
      <View style={styles.kpiContainer}>
        {kpiData.map((kpi, index) => (
          <MaterialKPICard
            key={index}
            title={kpi.title}
            value={kpi.value}
            subtitle={kpi.subtitle}
            color={kpi.color}
            trend={kpi.trend}
            elevation={2}
          />
        ))}
      </View>
    );
  };

  const renderLeadStatusChart = () => {
    if (!leadStats?.leadsByStatus) return null;

    const chartData = leadStats.leadsByStatus.map(item => ({
      label: item.status,
      value: item.count,
      color: getStatusColor(item.status)
    }));

    return (
      <MaterialChart
        title="Leads by Status"
        data={chartData}
        type="bar"
        height={250}
        showValues={true}
      />
    );
  };

  const renderLeadSourceChart = () => {
    if (!leadStats?.leadsBySource) return null;

    const chartData = leadStats.leadsBySource.map(item => ({
      label: item.source,
      value: item.count
    }));

    return (
      <MaterialChart
        title="Leads by Source"
        data={chartData}
        type="pie"
        height={250}
        showValues={true}
      />
    );
  };

  const renderConversionFunnel = () => {
    if (!leadStats?.leadsByStatus) return null;

    const statusOrder = ['New', 'Contacted', 'Qualified', 'Showing Scheduled', 'Offer Made', 'Closed Won'];
    const funnelData = statusOrder.map(status => {
      const found = leadStats.leadsByStatus.find(s => s.status === status);
      return { status, count: found ? found.count : 0 };
    });

    const maxCount = Math.max(...funnelData.map(s => s.count));

    return (
      <View style={[styles.card, styles.funnelCard]}>
        <Text style={styles.cardTitle}>Lead Conversion Funnel</Text>
        <View style={styles.funnelContainer}>
          {funnelData.map((item, index) => {
            const width = maxCount > 0 ? Math.max((item.count / maxCount) * 100, 15) : 15;
            const color = getStatusColor(item.status);
            
            return (
              <View key={index} style={styles.funnelStage}>
                <View style={styles.funnelStageInfo}>
                  <Text style={styles.funnelStageLabel}>{item.status}</Text>
                  <Text style={styles.funnelStageValue}>{item.count}</Text>
                </View>
                <View style={styles.funnelBarContainer}>
                  <View 
                    style={[
                      styles.funnelBar, 
                      { width: `${width}%`, backgroundColor: color }
                    ]} 
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>
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

  if (isLoading && !dashboardStats) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={MaterialColors.primary[500]} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics Dashboard</Text>
          <Text style={styles.headerSubtitle}>Business performance insights</Text>
        </View>

        {/* Timeframe Selector */}
        {renderTimeframeSelector()}

        {/* KPI Cards */}
        {renderKPIcards()}

        {/* Charts Section */}
        <View style={styles.chartsSection}>
          {renderLeadStatusChart()}
          {renderLeadSourceChart()}
          {renderConversionFunnel()}
        </View>

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
  headerTitle: {
    ...MaterialTypography.headlineMedium,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.xs,
  },
  headerSubtitle: {
    ...MaterialTypography.bodyLarge,
    color: MaterialColors.neutral[600],
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
});

export default AnalyticsScreen;