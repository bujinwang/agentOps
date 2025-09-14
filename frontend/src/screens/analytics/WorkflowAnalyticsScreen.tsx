import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Text,
} from 'react-native';
import { MaterialColors, MaterialSpacing, MaterialTypography } from '../../styles/MaterialDesign';
import { apiService } from '../../services/api';

interface AnalyticsOverview {
  totalWorkflows: number;
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  avgCompletionHours: number;
  totalConversions: number;
  totalConversionValue: number;
  conversionRate: number;
}

interface WorkflowPerformance {
  workflowId: number;
  name: string;
  triggerScoreMin: number;
  triggerScoreMax: number | null;
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  avgCompletionHours: number;
  conversions: number;
  conversionValue: number;
}

interface ResponseRate {
  actionType: string;
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  deliveryRate: string;
  openRate: string;
  clickRate: string;
  replyRate: string;
}

const WorkflowAnalyticsScreen: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [workflowPerformance, setWorkflowPerformance] = useState<WorkflowPerformance[]>([]);
  const [responseRates, setResponseRates] = useState<ResponseRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await apiService.getWorkflowAnalyticsOverview();
      const data = response.data;

      setOverview(data.overview);
      setWorkflowPerformance(data.workflowPerformance);
      setResponseRates(data.responseRates);
    } catch (error) {
      console.error('Error loading analytics:', error);
      Alert.alert('Error', 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const renderOverviewCard = () => {
    if (!overview) return null;

    return (
      <View style={styles.overviewCard}>
        <Text style={styles.cardTitle}>Workflow Overview</Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{overview.totalWorkflows}</Text>
            <Text style={styles.metricLabel}>Active Workflows</Text>
          </View>

          <View style={styles.metric}>
            <Text style={styles.metricValue}>{overview.totalExecutions}</Text>
            <Text style={styles.metricLabel}>Total Executions</Text>
          </View>

          <View style={styles.metric}>
            <Text style={styles.metricValue}>{overview.completedExecutions}</Text>
            <Text style={styles.metricLabel}>Completed</Text>
          </View>

          <View style={styles.metric}>
            <Text style={styles.metricValue}>{overview.conversionRate}%</Text>
            <Text style={styles.metricLabel}>Conversion Rate</Text>
          </View>
        </View>

        <View style={styles.additionalMetrics}>
          <Text style={styles.metricText}>
            Avg Completion Time: {overview.avgCompletionHours.toFixed(1)} hours
          </Text>
          <Text style={styles.metricText}>
            Total Conversions: {overview.totalConversions}
          </Text>
          <Text style={styles.metricText}>
            Conversion Value: ${overview.totalConversionValue.toLocaleString()}
          </Text>
        </View>
      </View>
    );
  };

  const renderWorkflowPerformance = () => {
    if (workflowPerformance.length === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Workflow Performance</Text>

        {workflowPerformance.map((workflow) => (
          <View key={workflow.workflowId} style={styles.workflowItem}>
            <View style={styles.workflowHeader}>
              <Text style={styles.workflowName}>{workflow.name}</Text>
              <Text style={styles.workflowTrigger}>
                Score {workflow.triggerScoreMin}{workflow.triggerScoreMax ? `-${workflow.triggerScoreMax}` : '+'}
              </Text>
            </View>

            <View style={styles.workflowMetrics}>
              <View style={styles.workflowMetric}>
                <Text style={styles.metricValue}>{workflow.totalExecutions}</Text>
                <Text style={styles.metricLabel}>Executions</Text>
              </View>

              <View style={styles.workflowMetric}>
                <Text style={styles.metricValue}>
                  {workflow.totalExecutions > 0
                    ? ((workflow.completedExecutions / workflow.totalExecutions) * 100).toFixed(0)
                    : 0}%
                </Text>
                <Text style={styles.metricLabel}>Success Rate</Text>
              </View>

              <View style={styles.workflowMetric}>
                <Text style={styles.metricValue}>{workflow.conversions}</Text>
                <Text style={styles.metricLabel}>Conversions</Text>
              </View>

              <View style={styles.workflowMetric}>
                <Text style={styles.metricValue}>${workflow.conversionValue.toLocaleString()}</Text>
                <Text style={styles.metricLabel}>Value</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderResponseRates = () => {
    if (responseRates.length === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Response Rates by Channel</Text>

        {responseRates.map((rate) => (
          <View key={rate.actionType} style={styles.responseItem}>
            <View style={styles.responseHeader}>
              <Text style={styles.responseType}>{rate.actionType.toUpperCase()}</Text>
              <Text style={styles.responseCount}>{rate.totalSent} sent</Text>
            </View>

            <View style={styles.responseMetrics}>
              <View style={styles.responseMetric}>
                <Text style={styles.metricValue}>{rate.deliveryRate}%</Text>
                <Text style={styles.metricLabel}>Delivered</Text>
              </View>

              <View style={styles.responseMetric}>
                <Text style={styles.metricValue}>{rate.openRate}%</Text>
                <Text style={styles.metricLabel}>Opened</Text>
              </View>

              <View style={styles.responseMetric}>
                <Text style={styles.metricValue}>{rate.clickRate}%</Text>
                <Text style={styles.metricLabel}>Clicked</Text>
              </View>

              <View style={styles.responseMetric}>
                <Text style={styles.metricValue}>{rate.replyRate}%</Text>
                <Text style={styles.metricLabel}>Replied</Text>
              </View>
            </View>

            {rate.bounced > 0 && (
              <Text style={styles.bounceText}>
                {rate.bounced} bounced ({((rate.bounced / rate.totalSent) * 100).toFixed(1)}%)
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Workflow Analytics</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      ) : (
        <>
          {renderOverviewCard()}
          {renderWorkflowPerformance()}
          {renderResponseRates()}

          {!overview && !workflowPerformance.length && !responseRates.length && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No analytics data available</Text>
              <Text style={styles.emptySubtext}>
                Analytics will appear here once workflows start executing
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: MaterialSpacing.md,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[900],
  },
  refreshButton: {
    backgroundColor: MaterialColors.primary[500],
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: MaterialSpacing.xl,
  },
  loadingText: {
    ...MaterialTypography.bodyLarge,
    color: MaterialColors.neutral[500],
  },
  overviewCard: {
    backgroundColor: 'white',
    margin: MaterialSpacing.md,
    padding: MaterialSpacing.md,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    ...MaterialTypography.titleLarge,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: MaterialSpacing.md,
  },
  metric: {
    width: '50%',
    alignItems: 'center',
    marginBottom: MaterialSpacing.md,
  },
  metricValue: {
    ...MaterialTypography.headlineMedium,
    color: MaterialColors.primary[600],
    fontWeight: 'bold',
  },
  metricLabel: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
    marginTop: 4,
  },
  additionalMetrics: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: MaterialSpacing.md,
  },
  metricText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[700],
    marginBottom: MaterialSpacing.xs,
  },
  sectionCard: {
    backgroundColor: 'white',
    margin: MaterialSpacing.md,
    marginTop: 0,
    padding: MaterialSpacing.md,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workflowItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: MaterialSpacing.md,
  },
  workflowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.sm,
  },
  workflowName: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    flex: 1,
  },
  workflowTrigger: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
  },
  workflowMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  workflowMetric: {
    alignItems: 'center',
    flex: 1,
  },
  responseItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: MaterialSpacing.md,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.sm,
  },
  responseType: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
  },
  responseCount: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
  },
  responseMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: MaterialSpacing.sm,
  },
  responseMetric: {
    alignItems: 'center',
    flex: 1,
  },
  bounceText: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.error[600],
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: MaterialSpacing.xl,
    margin: MaterialSpacing.md,
  },
  emptyText: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[700],
    marginBottom: MaterialSpacing.sm,
  },
  emptySubtext: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[500],
    textAlign: 'center',
  },
});

export default WorkflowAnalyticsScreen;