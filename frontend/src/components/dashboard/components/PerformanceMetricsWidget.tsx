import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialColors, MaterialSpacing, MaterialTypography } from '../../../styles/MaterialDesign';
import { DashboardMetrics, AgentPerformance } from '../../../types/dashboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PerformanceMetricsWidgetProps {
  metrics: DashboardMetrics | null;
  timeRange: 'today' | 'week' | 'month' | 'quarter';
  onTimeRangeChange?: (range: 'today' | 'week' | 'month' | 'quarter') => void;
  onMetricPress?: (metricType: string, value: any) => void;
  loading?: boolean;
}

interface MetricCard {
  id: string;
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  format: 'number' | 'percentage' | 'currency' | 'time';
  icon: string;
  color: string;
  description?: string;
}

const PerformanceMetricsWidget: React.FC<PerformanceMetricsWidgetProps> = ({
  metrics,
  timeRange = 'week',
  onTimeRangeChange,
  onMetricPress,
  loading = false,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  // Time range options
  const timeRangeOptions = [
    { label: 'Today', value: 'today' as const },
    { label: 'Week', value: 'week' as const },
    { label: 'Month', value: 'month' as const },
    { label: 'Quarter', value: 'quarter' as const },
  ];

  // Generate metric cards from dashboard metrics
  const metricCards = useMemo((): MetricCard[] => {
    if (!metrics) return [];

    return [
      {
        id: 'totalLeads',
        title: 'Total Leads',
        value: metrics.totalLeads,
        change: 12.5, // Mock change data
        changeType: 'increase',
        format: 'number',
        icon: '👥',
        color: MaterialColors.primary[500],
        description: 'Active leads in pipeline',
      },
      {
        id: 'activeLeads',
        title: 'Active Leads',
        value: metrics.activeLeads,
        change: 8.2,
        changeType: 'increase',
        format: 'number',
        icon: '⚡',
        color: MaterialColors.secondary[500],
        description: 'Leads with recent activity',
      },
      {
        id: 'highValueLeads',
        title: 'High-Value Leads',
        value: metrics.highValueLeads,
        change: -3.1,
        changeType: 'decrease',
        format: 'number',
        icon: '💎',
        color: MaterialColors.warning[500],
        description: 'Leads with score > 80',
      },
      {
        id: 'conversionRate',
        title: 'Conversion Rate',
        value: metrics.conversionRate,
        change: 5.7,
        changeType: 'increase',
        format: 'percentage',
        icon: '🎯',
        color: MaterialColors.secondary[600],
        description: 'Leads converted to deals',
      },
      {
        id: 'averageScore',
        title: 'Avg Lead Score',
        value: metrics.averageScore,
        change: 2.3,
        changeType: 'increase',
        format: 'number',
        icon: '📊',
        color: MaterialColors.primary[600],
        description: 'Average ML lead score',
      },
    ];
  }, [metrics]);

  // Format values based on type
  const formatValue = (value: number | string, format: string) => {
    if (typeof value === 'string') return value;

    switch (format) {
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'time':
        return `${value}h`;
      default:
        return value.toLocaleString();
    }
  };

  // Format change values
  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  // Get change color
  const getChangeColor = (changeType?: string) => {
    switch (changeType) {
      case 'increase':
        return MaterialColors.secondary[600];
      case 'decrease':
        return MaterialColors.error[500];
      default:
        return MaterialColors.neutral[500];
    }
  };

  // Render metric card
  const renderMetricCard = (card: MetricCard) => (
    <TouchableOpacity
      key={card.id}
      style={[
        styles.metricCard,
        selectedMetric === card.id && styles.metricCardSelected,
      ]}
      onPress={() => {
        setSelectedMetric(selectedMetric === card.id ? null : card.id);
        onMetricPress?.(card.id, card.value);
      }}
    >
      <View style={styles.metricHeader}>
        <View style={styles.metricIcon}>
          <Text style={styles.iconText}>{card.icon}</Text>
        </View>
        <View style={styles.metricTitleContainer}>
          <Text style={styles.metricTitle}>{card.title}</Text>
          {card.change !== undefined && (
            <Text style={[styles.metricChange, { color: getChangeColor(card.changeType) }]}>
              {formatChange(card.change)}
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.metricValue}>{formatValue(card.value, card.format)}</Text>

      {card.description && (
        <Text style={styles.metricDescription}>{card.description}</Text>
      )}

      {selectedMetric === card.id && (
        <View style={styles.metricDetails}>
          <Text style={styles.detailTitle}>Details</Text>
          <Text style={styles.detailText}>
            Current: {formatValue(card.value, card.format)}
          </Text>
          {card.change !== undefined && (
            <Text style={styles.detailText}>
              Change: {formatChange(card.change)} from last period
            </Text>
          )}
          <Text style={styles.detailText}>
            Time Range: {timeRangeOptions.find(opt => opt.value === timeRange)?.label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // Render agent performance section
  const renderAgentPerformance = () => {
    if (!metrics?.topPerformingAgents?.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Performing Agents</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {metrics.topPerformingAgents.slice(0, 5).map((agent, index) => (
            <View key={agent.agentId} style={styles.agentCard}>
              <View style={styles.agentRank}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <Text style={styles.agentName}>{agent.name}</Text>
              <Text style={styles.agentMetric}>
                {agent.conversionRate.toFixed(1)}% conversion
              </Text>
              <Text style={styles.agentValue}>
                ${agent.averageDealValue.toLocaleString()} avg deal
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render activity summary
  const renderActivitySummary = () => {
    if (!metrics?.recentActivity?.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {metrics.recentActivity.slice(0, 3).map((activity, index) => (
          <View key={index} style={styles.activityItem}>
            <Text style={styles.activityType}>{activity.type.replace('_', ' ')}</Text>
            <Text style={styles.activityCount}>{activity.count} events</Text>
            <View style={[
              styles.activityTrend,
              activity.trend === 'up' && styles.trendUp,
              activity.trend === 'down' && styles.trendDown,
            ]}>
              <Text style={styles.trendText}>
                {activity.trend === 'up' ? '↗' : activity.trend === 'down' ? '↘' : '→'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Performance Metrics</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading performance data...</Text>
        </View>
      </View>
    );
  }

  if (!metrics) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Performance Metrics</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No performance data available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Performance Metrics</Text>
        <View style={styles.timeRangeContainer}>
          {timeRangeOptions.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.timeRangeButton,
                timeRange === option.value && styles.timeRangeButtonActive,
              ]}
              onPress={() => onTimeRangeChange?.(option.value)}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  timeRange === option.value && styles.timeRangeTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Metric Cards Grid */}
      <View style={styles.metricsGrid}>
        {metricCards.map(card => renderMetricCard(card))}
      </View>

      {/* Additional Sections */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderAgentPerformance()}
        {renderActivitySummary()}

        {/* System Health Indicator */}
        {metrics.systemHealth && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System Health</Text>
            <View style={[
              styles.healthIndicator,
              metrics.systemHealth.status === 'healthy' && styles.healthHealthy,
              metrics.systemHealth.status === 'warning' && styles.healthWarning,
              metrics.systemHealth.status === 'critical' && styles.healthCritical,
            ]}>
              <Text style={styles.healthStatus}>
                {metrics.systemHealth.status.toUpperCase()}
              </Text>
              <Text style={styles.healthUptime}>
                {metrics.systemHealth.components.database.uptime.toFixed(1)}% uptime
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    marginHorizontal: MaterialSpacing.sm,
    marginVertical: MaterialSpacing.xs,
    padding: MaterialSpacing.md,
    elevation: 2,
    maxHeight: 600,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.md,
  },
  title: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: MaterialColors.neutral[100],
    borderRadius: 8,
    padding: 2,
  },
  timeRangeButton: {
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
    borderRadius: 6,
  },
  timeRangeButtonActive: {
    backgroundColor: MaterialColors.primary[500],
  },
  timeRangeText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[700],
  },
  timeRangeTextActive: {
    color: MaterialColors.onPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  emptyText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: MaterialSpacing.md,
  },
  metricCard: {
    width: (SCREEN_WIDTH - 60) / 2 - 10,
    backgroundColor: MaterialColors.surface,
    borderRadius: 8,
    padding: MaterialSpacing.md,
    marginBottom: MaterialSpacing.sm,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[200],
    elevation: 1,
  },
  metricCardSelected: {
    borderColor: MaterialColors.primary[300],
    backgroundColor: MaterialColors.primary[50],
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: MaterialSpacing.sm,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: MaterialColors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: MaterialSpacing.sm,
  },
  iconText: {
    fontSize: 16,
  },
  metricTitleContainer: {
    flex: 1,
  },
  metricTitle: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[800],
    fontWeight: '500',
  },
  metricChange: {
    ...MaterialTypography.labelSmall,
    marginTop: 2,
  },
  metricValue: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[900],
    fontWeight: '600',
    marginBottom: MaterialSpacing.xs,
  },
  metricDescription: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[600],
  },
  metricDetails: {
    marginTop: MaterialSpacing.md,
    paddingTop: MaterialSpacing.md,
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[200],
  },
  detailTitle: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.neutral[800],
    fontWeight: '600',
    marginBottom: MaterialSpacing.xs,
  },
  detailText: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[700],
    marginBottom: 2,
  },
  section: {
    marginTop: MaterialSpacing.lg,
  },
  sectionTitle: {
    ...MaterialTypography.titleSmall,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.md,
  },
  agentCard: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 8,
    padding: MaterialSpacing.md,
    marginRight: MaterialSpacing.md,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[200],
    width: 140,
    elevation: 1,
  },
  agentRank: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: MaterialColors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  agentName: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[800],
    fontWeight: '500',
    marginBottom: 4,
  },
  agentMetric: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.secondary[600],
    marginBottom: 2,
  },
  agentValue: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[600],
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: MaterialSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: MaterialColors.neutral[100],
  },
  activityType: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[800],
    flex: 1,
    textTransform: 'capitalize',
  },
  activityCount: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
    marginRight: MaterialSpacing.md,
  },
  activityTrend: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: MaterialColors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendUp: {
    backgroundColor: MaterialColors.secondary[100],
  },
  trendDown: {
    backgroundColor: MaterialColors.error[100],
  },
  trendText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[700],
  },
  healthIndicator: {
    padding: MaterialSpacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  healthHealthy: {
    backgroundColor: MaterialColors.secondary[50],
  },
  healthWarning: {
    backgroundColor: MaterialColors.warning[50],
  },
  healthCritical: {
    backgroundColor: MaterialColors.error[50],
  },
  healthStatus: {
    ...MaterialTypography.labelMedium,
    fontWeight: '600',
    marginBottom: 4,
  },
  healthUptime: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
});

export default PerformanceMetricsWidget;