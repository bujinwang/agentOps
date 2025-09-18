import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
  Alert,
  StatusBar,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

// Material Design imports
import { MaterialColors, MaterialTypography } from '../../styles/MaterialDesign';

// Components
// import DashboardHeader from './components/DashboardHeader';
// import LeadInsightsPanel from './components/LeadInsightsPanel';
// import ConversionProbabilityChart from './components/ConversionProbabilityChart';
// import PredictiveTimeline from './components/PredictiveTimeline';
// import BehavioralAnalysis from './components/BehavioralAnalysis';
// import RecommendationEngine from './components/RecommendationEngine';
// import ModelPerformanceMonitor from './components/ModelPerformanceMonitor';
// import AlertCenter from './components/AlertCenter';
// import DashboardFilters from './components/DashboardFilters';
import LeadScoringTrendChart from './components/LeadScoringTrendChart';
import InteractiveLeadComparisonMatrix from './components/InteractiveLeadComparisonMatrix';
import PerformanceMetricsWidget from './components/PerformanceMetricsWidget';
// import LoadingOverlay from '../common/LoadingOverlay';
// import ErrorBoundary from '../common/ErrorBoundary';

// Services and Types
import { dashboardService } from '../../services/dashboardService';
import {
  DashboardConfig,
  LeadInsights,
  PredictiveAnalytics,
  DashboardMetrics,
  DashboardAlert,
  DashboardFilters as DashboardFiltersType,
  ComponentData,
  LoadingState,
} from '../../types/dashboard';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PredictiveLeadInsightsDashboardProps {
  navigation?: any;
  route?: any;
  configId?: string;
}

const PredictiveLeadInsightsDashboard: React.FC<PredictiveLeadInsightsDashboardProps> = ({
  navigation,
  route,
  configId,
}) => {
  // State management
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig | null>(null);
  const [leadInsights, setLeadInsights] = useState<LeadInsights[]>([]);
  const [predictiveAnalytics, setPredictiveAnalytics] = useState<PredictiveAnalytics[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [filters, setFilters] = useState<DashboardFiltersType | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [componentLoadingStates, setComponentLoadingStates] = useState<Map<string, LoadingState>>(new Map());

  // Component visibility state
  const [visibleComponents, setVisibleComponents] = useState<Set<string>>(new Set([
    'lead-insights',
    'conversion-probability',
    'predictive-timeline',
    'recommendation-engine',
    'alert-center',
  ]));

  // Initialize dashboard
  useEffect(() => {
    initializeDashboard();
  }, [configId]);

  // Set up real-time updates
  useFocusEffect(
    useCallback(() => {
      const unsubscribeLeadUpdates = dashboardService.subscribeToEvents('lead_updated', handleLeadUpdate);
      const unsubscribeScoreChanges = dashboardService.subscribeToEvents('score_changed', handleScoreChange);
      const unsubscribeAlerts = dashboardService.subscribeToEvents('alert_received', handleAlertReceived);
      const unsubscribeLoadingStates = dashboardService.subscribeToEvents('loading_state_changed', handleLoadingStateChange);

      return () => {
        unsubscribeLeadUpdates();
        unsubscribeScoreChanges();
        unsubscribeAlerts();
        unsubscribeLoadingStates();
      };
    }, [])
  );

  // Update component loading states
  useEffect(() => {
    const updateLoadingStates = () => {
      const newStates = new Map<string, LoadingState>();
      visibleComponents.forEach(componentId => {
        const loadingState = dashboardService.getLoadingState(componentId);
        if (loadingState) {
          newStates.set(componentId, loadingState);
        }
      });
      setComponentLoadingStates(newStates);
    };

    updateLoadingStates();
    const interval = setInterval(updateLoadingStates, 1000);
    return () => clearInterval(interval);
  }, [visibleComponents]);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize dashboard service
      const config = await dashboardService.initializeDashboard(configId);
      setDashboardConfig(config);
      setFilters(config.filters);

      // Load initial data
      await loadDashboardData();

    } catch (err) {
      console.error('Failed to initialize dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      // Load lead insights
      const insights = await dashboardService.getLeadInsights();
      setLeadInsights(insights);

      // Load predictive analytics for top leads
      const topLeadIds = insights
        .sort((a, b) => b.currentScore - a.currentScore)
        .slice(0, 10)
        .map(lead => lead.leadId);

      if (topLeadIds.length > 0) {
        const analytics = await dashboardService.getPredictiveAnalytics(topLeadIds);
        setPredictiveAnalytics(analytics);
      }

      // Load dashboard metrics
      const metrics = await dashboardService.getDashboardMetrics();
      setDashboardMetrics(metrics);

      // Load alerts
      const dashboardAlerts = await dashboardService.getDashboardAlerts();
      setAlerts(dashboardAlerts);

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to refresh dashboard:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFiltersChange = async (newFilters: Partial<DashboardFiltersType>) => {
    try {
      await dashboardService.updateFilters(newFilters);
      setFilters(prev => prev ? { ...prev, ...newFilters } : null);
      await loadDashboardData(); // Reload data with new filters
    } catch (err) {
      console.error('Failed to update filters:', err);
      Alert.alert('Error', 'Failed to update filters. Please try again.');
    }
  };

  const handleComponentToggle = (componentId: string, visible: boolean) => {
    setVisibleComponents(prev => {
      const newSet = new Set(prev);
      if (visible) {
        newSet.add(componentId);
      } else {
        newSet.delete(componentId);
      }
      return newSet;
    });
  };

  const handleLeadUpdate = useCallback((event: any) => {
    // Update lead insights when lead data changes
    setLeadInsights(prev =>
      prev.map(lead =>
        lead.leadId === event.data.leadId
          ? { ...lead, ...event.data.updates }
          : lead
      )
    );
  }, []);

  const handleScoreChange = useCallback((event: any) => {
    // Update lead scores in real-time
    setLeadInsights(prev =>
      prev.map(lead =>
        lead.leadId === event.data.leadId
          ? {
              ...lead,
              currentScore: event.data.newScore,
              scoreHistory: [
                ...lead.scoreHistory,
                {
                  timestamp: new Date().toISOString(),
                  score: event.data.newScore,
                  confidence: event.data.confidence || 0.8,
                  factors: event.data.factors || {},
                },
              ],
            }
          : lead
      )
    );
  }, []);

  const handleAlertReceived = useCallback((event: any) => {
    // Add new alert to the list
    setAlerts(prev => [event.data, ...prev].slice(0, 50)); // Keep last 50 alerts
  }, []);

  const handleLoadingStateChange = useCallback((event: any) => {
    // Update component loading states
    setComponentLoadingStates(prev => {
      const newStates = new Map(prev);
      newStates.set(event.data.componentId, event.data.loadingState);
      return newStates;
    });
  }, []);

  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    try {
      const componentIds = Array.from(visibleComponents);
      const exportUrl = await dashboardService.exportDashboard(format, componentIds, {
        title: 'Predictive Lead Insights Dashboard',
        includeCharts: true,
        includeRawData: true,
      });

      Alert.alert(
        'Export Complete',
        `Dashboard exported successfully. Download: ${exportUrl}`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('Failed to export dashboard:', err);
      Alert.alert('Export Failed', 'Failed to export dashboard. Please try again.');
    }
  };

  const handleAlertAction = (alert: DashboardAlert, action: any) => {
    // Handle alert actions (view, dismiss, etc.)
    switch (action.type) {
      case 'view':
        // Navigate to relevant screen
        if (alert.type === 'lead') {
          navigation?.navigate('LeadDetail', { leadId: alert.data.leadId });
        }
        break;
      case 'dismiss':
        setAlerts(prev => prev.filter(a => a.id !== alert.id));
        break;
      default:
        console.log('Unhandled alert action:', action);
    }
  };

  // Memoized computed values
  const topInsights = useMemo(() => {
    return leadInsights
      .sort((a, b) => b.currentScore - a.currentScore)
      .slice(0, 5);
  }, [leadInsights]);

  const urgentAlerts = useMemo(() => {
    return alerts.filter(alert => alert.severity === 'high' || alert.severity === 'critical');
  }, [alerts]);

  const conversionData = useMemo(() => {
    return predictiveAnalytics.map(analytics => ({
      leadId: analytics.leadId,
      probability: analytics.conversionForecast.probability,
      confidence: analytics.conversionForecast.confidence,
    }));
  }, [predictiveAnalytics]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard Loading</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initializing Predictive Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard Error</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      <View style={styles.header}>
        <Text style={styles.title}>Predictive Lead Insights</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Performance Metrics Widget */}
        <View style={styles.section}>
          <PerformanceMetricsWidget
            metrics={dashboardMetrics}
            timeRange="week"
            onTimeRangeChange={(range) => console.log('Time range changed:', range)}
            onMetricPress={(type, value) => console.log('Metric pressed:', type, value)}
            loading={false}
          />
        </View>

        {/* Lead Scoring Trend Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lead Scoring Trends</Text>
          <LeadScoringTrendChart
            leads={leadInsights}
            timeRange="30d"
            height={300}
            loading={false}
            onLeadSelect={(leadIds) => console.log('Leads selected:', leadIds)}
            onTimeRangeChange={(range) => console.log('Time range changed:', range)}
          />
        </View>

        {/* Interactive Lead Comparison Matrix */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lead Comparison Matrix</Text>
          <InteractiveLeadComparisonMatrix
            leads={leadInsights}
            predictiveAnalytics={predictiveAnalytics}
            selectedLeads={[]}
            maxLeads={4}
            onLeadSelect={(leadIds) => console.log('Leads selected:', leadIds)}
            onLeadPress={(leadId) => navigation?.navigate('LeadDetail', { leadId })}
            loading={false}
          />
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: MaterialColors.primary[500],
    elevation: 4,
  },
  title: {
    ...MaterialTypography.titleLarge,
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.error[500],
    textAlign: 'center',
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
  section: {
    marginVertical: 8,
  },
  sectionTitle: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[800],
    marginBottom: 12,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default PredictiveLeadInsightsDashboard;