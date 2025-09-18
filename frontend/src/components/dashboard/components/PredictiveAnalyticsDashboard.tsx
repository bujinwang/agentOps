import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ConversionTimeline from './ConversionTimeline';
import DealValuePrediction from './DealValuePrediction';
import BehavioralAnalysis from './BehavioralAnalysis';
import RiskAssessment from './RiskAssessment';
import { PredictiveAnalytics } from '../../../types/dashboard';
import { predictiveAnalyticsService } from '../../../services/predictiveAnalyticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PredictiveAnalyticsDashboardProps {
  leadIds: number[];
  loading?: boolean;
  onLeadSelect?: (leadId: number) => void;
  onInsightAction?: (action: string, data: any) => void;
  compact?: boolean;
}

const PredictiveAnalyticsDashboard: React.FC<PredictiveAnalyticsDashboardProps> = ({
  leadIds,
  loading: initialLoading = false,
  onLeadSelect,
  onInsightAction,
  compact = false,
}) => {
  const [analytics, setAnalytics] = useState<PredictiveAnalytics[]>([]);
  const [loading, setLoading] = useState(initialLoading);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'value' | 'behavior' | 'risk'>('timeline');

  // Load predictive analytics data
  useEffect(() => {
    if (leadIds.length > 0) {
      loadAnalytics();
    }
  }, [leadIds]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const analyticsPromises = leadIds.map(leadId =>
        predictiveAnalyticsService.generatePredictiveAnalytics(leadId, {
          includeTimeline: true,
          includeValue: true,
          includeRisk: true,
        })
      );

      const results = await Promise.all(analyticsPromises);
      setAnalytics(results);
    } catch (error) {
      console.error('Failed to load predictive analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  // Calculate dashboard metrics
  const dashboardMetrics = useMemo(() => {
    if (analytics.length === 0) return null;

    const totalLeads = analytics.length;
    const avgConversionProbability = analytics.reduce(
      (sum, analytic) => sum + (analytic.conversionForecast?.probability || 0),
      0
    ) / totalLeads;

    const avgDealValue = analytics.reduce(
      (sum, analytic) => sum + (analytic.dealValuePrediction?.estimatedValue || 0),
      0
    ) / totalLeads;

    const avgRisk = analytics.reduce(
      (sum, analytic) => sum + (analytic.riskAssessment?.overallRisk || 0),
      0
    ) / totalLeads;

    const highRiskLeads = analytics.filter(
      analytic => (analytic.riskAssessment?.overallRisk || 0) >= 0.7
    ).length;

    return {
      totalLeads,
      avgConversionProbability,
      avgDealValue,
      avgRisk,
      highRiskLeads,
    };
  }, [analytics]);

  // Get tab content
  const renderTabContent = () => {
    const commonProps = {
      loading,
      compact,
    };

    switch (activeTab) {
      case 'timeline':
        return (
          <ConversionTimeline
            {...commonProps}
            leadIds={leadIds}
            onTimelinePointPress={(point, leadId) => {
              setSelectedLeadId(leadId);
              onInsightAction?.('timeline_point_selected', { point, leadId });
            }}
          />
        );

      case 'value':
        return selectedLeadId ? (
          <DealValuePrediction
            {...commonProps}
            leadId={selectedLeadId}
            onComparablePress={(comparable) => {
              onInsightAction?.('comparable_selected', { comparable, leadId: selectedLeadId });
            }}
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Icon name="attach-money" size={48} color="#cccccc" />
            <Text style={styles.placeholderText}>
              Select a lead to view deal value predictions
            </Text>
          </View>
        );

      case 'behavior':
        return selectedLeadId ? (
          <BehavioralAnalysis
            {...commonProps}
            leadId={selectedLeadId}
            onInsightPress={(insight) => {
              onInsightAction?.('behavioral_insight_selected', { insight, leadId: selectedLeadId });
            }}
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Icon name="psychology" size={48} color="#cccccc" />
            <Text style={styles.placeholderText}>
              Select a lead to view behavioral analysis
            </Text>
          </View>
        );

      case 'risk':
        return selectedLeadId ? (
          <RiskAssessment
            {...commonProps}
            leadId={selectedLeadId}
            onMitigationPress={(strategy) => {
              onInsightAction?.('mitigation_strategy_selected', { strategy, leadId: selectedLeadId });
            }}
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Icon name="warning" size={48} color="#cccccc" />
            <Text style={styles.placeholderText}>
              Select a lead to view risk assessment
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  // Get tab icon
  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'timeline':
        return 'timeline';
      case 'value':
        return 'attach-money';
      case 'behavior':
        return 'psychology';
      case 'risk':
        return 'warning';
      default:
        return 'help';
    }
  };

  if (loading && analytics.length === 0) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <View style={styles.header}>
          <Text style={[styles.title, compact && styles.compactTitle]}>
            Predictive Analytics
          </Text>
          <View style={styles.loadingIndicator} />
        </View>
        <Text style={styles.loadingText}>Loading predictive analytics...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {/* Header with metrics */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, compact && styles.compactTitle]}>
            Predictive Analytics
          </Text>
          {dashboardMetrics && (
            <Text style={styles.subtitle}>
              {dashboardMetrics.totalLeads} leads • {Math.round(dashboardMetrics.avgConversionProbability * 100)}% avg conversion
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Icon
            name={refreshing ? "hourglass-empty" : "refresh"}
            size={20}
            color="#007AFF"
          />
        </TouchableOpacity>
      </View>

      {/* Quick Metrics */}
      {dashboardMetrics && !compact && (
        <View style={styles.metricsContainer}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              ${Math.round(dashboardMetrics.avgDealValue).toLocaleString()}
            </Text>
            <Text style={styles.metricLabel}>Avg Deal Value</Text>
          </View>

          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {Math.round(dashboardMetrics.avgRisk * 100)}%
            </Text>
            <Text style={styles.metricLabel}>Avg Risk</Text>
          </View>

          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {dashboardMetrics.highRiskLeads}
            </Text>
            <Text style={styles.metricLabel}>High Risk</Text>
          </View>
        </View>
      )}

      {/* Lead Selection */}
      {leadIds.length > 1 && (
        <View style={styles.leadSelector}>
          <Text style={styles.selectorLabel}>Select Lead:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {leadIds.map((leadId) => (
              <TouchableOpacity
                key={leadId}
                style={[
                  styles.leadButton,
                  selectedLeadId === leadId && styles.selectedLeadButton,
                ]}
                onPress={() => {
                  setSelectedLeadId(leadId);
                  onLeadSelect?.(leadId);
                }}
              >
                <Text
                  style={[
                    styles.leadButtonText,
                    selectedLeadId === leadId && styles.selectedLeadButtonText,
                  ]}
                >
                  Lead {leadId}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {(['timeline', 'value', 'behavior', 'risk'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.activeTab,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Icon
              name={getTabIcon(tab)}
              size={18}
              color={activeTab === tab ? '#007AFF' : '#666666'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView
        style={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        {renderTabContent()}
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onInsightAction?.('export_analytics', { analytics })}
        >
          <Icon name="download" size={16} color="#007AFF" />
          <Text style={styles.actionText}>Export</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onInsightAction?.('share_insights', { analytics })}
        >
          <Icon name="share" size={16} color="#007AFF" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onInsightAction?.('schedule_report', { analytics })}
        >
          <Icon name="schedule" size={16} color="#007AFF" />
          <Text style={styles.actionText}>Schedule</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactContainer: {
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  compactTitle: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  loadingIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderTopColor: 'transparent',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 14,
    padding: 20,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  metricLabel: {
    fontSize: 10,
    color: '#666666',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  leadSelector: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  selectorLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
    fontWeight: '500',
  },
  leadButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedLeadButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  leadButtonText: {
    fontSize: 12,
    color: '#666666',
  },
  selectedLeadButtonText: {
    color: '#ffffff',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginHorizontal: 2,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#f0f8ff',
  },
  tabText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
  },
  contentContainer: {
    maxHeight: 400,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  placeholderText: {
    color: '#666666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  actionText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default PredictiveAnalyticsDashboard;