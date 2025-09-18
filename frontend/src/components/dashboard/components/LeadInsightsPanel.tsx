import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { LeadInsights, DashboardWebSocketEvent } from '../../../types/dashboard';
import { dashboardService } from '../../../services/dashboardService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LeadInsightsPanelProps {
  insights: LeadInsights[];
  loading?: boolean;
  onLeadPress?: (leadId: number) => void;
  maxItems?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // seconds
}

const LeadInsightsPanel: React.FC<LeadInsightsPanelProps> = ({
  insights: initialInsights,
  loading: initialLoading = false,
  onLeadPress,
  maxItems = 5,
  autoRefresh = true,
  refreshInterval = 30,
}) => {
  const [insights, setInsights] = useState<LeadInsights[]>(initialInsights);
  const [loading, setLoading] = useState(initialLoading);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [animatedValues] = useState<Map<number, Animated.Value>>(
    new Map(initialInsights.map(insight => [insight.leadId, new Animated.Value(1)]))
  );

  // Update insights when props change
  useEffect(() => {
    setInsights(initialInsights);
    setLoading(initialLoading);
  }, [initialInsights, initialLoading]);

  // Set up real-time updates
  useFocusEffect(
    useCallback(() => {
      const unsubscribeLeadUpdates = dashboardService.subscribeToEvents('lead_updated', handleLeadUpdate);
      const unsubscribeScoreChanges = dashboardService.subscribeToEvents('score_changed', handleScoreChange);

      return () => {
        unsubscribeLeadUpdates();
        unsubscribeScoreChanges();
      };
    }, [])
  );

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshInsights();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const handleLeadUpdate = useCallback((event: DashboardWebSocketEvent) => {
    if (event.type === 'lead_update' && event.data?.leadId) {
      setInsights(prevInsights =>
        prevInsights.map(insight =>
          insight.leadId === event.data.leadId
            ? { ...insight, ...event.data.updates }
            : insight
        )
      );

      // Animate the updated lead card
      const animatedValue = animatedValues.get(event.data.leadId);
      if (animatedValue) {
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1.05,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }

      setLastUpdate(new Date());
    }
  }, [animatedValues]);

  const handleScoreChange = useCallback((event: DashboardWebSocketEvent) => {
    if (event.type === 'score_change' && event.data?.leadId) {
      setInsights(prevInsights =>
        prevInsights.map(insight =>
          insight.leadId === event.data.leadId
            ? {
                ...insight,
                currentScore: event.data.newScore,
                scoreHistory: [
                  ...insight.scoreHistory,
                  {
                    timestamp: new Date().toISOString(),
                    score: event.data.newScore,
                    confidence: event.data.confidence || 0.8,
                    factors: event.data.factors || {},
                  },
                ],
              }
            : insight
        )
      );

      // Animate score change
      const animatedValue = animatedValues.get(event.data.leadId);
      if (animatedValue) {
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1.1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }

      setLastUpdate(new Date());
    }
  }, [animatedValues]);

  const refreshInsights = async () => {
    try {
      setRefreshing(true);
      // In a real implementation, this would fetch fresh data
      // For now, we'll just update the timestamp
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to refresh insights:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const displayInsights = useMemo(() => {
    return insights
      .sort((a, b) => b.currentScore - a.currentScore)
      .slice(0, maxItems);
  }, [insights, maxItems]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#dc3545';
      case 'high':
        return '#fd7e14';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'high':
        return '#28a745';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const formatScore = (score: number) => {
    return Math.round(score);
  };

  const formatProbability = (probability: number) => {
    return `${Math.round(probability * 100)}%`;
  };

  const getScoreChange = (insight: LeadInsights) => {
    if (insight.scoreHistory.length < 2) return null;

    const current = insight.currentScore;
    const previous = insight.scoreHistory[insight.scoreHistory.length - 2]?.score || current;

    const change = current - previous;
    const percentChange = previous > 0 ? (change / previous) * 100 : 0;

    return {
      value: change,
      percent: percentChange,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    };
  };

  const handleLeadLongPress = (leadId: number) => {
    Alert.alert(
      'Lead Actions',
      'Choose an action for this lead',
      [
        {
          text: 'View Details',
          onPress: () => onLeadPress?.(leadId),
        },
        {
          text: 'Mark as Contacted',
          onPress: () => {
            // In a real implementation, this would update the lead status
            console.log('Mark lead as contacted:', leadId);
          },
        },
        {
          text: 'Schedule Follow-up',
          onPress: () => {
            // In a real implementation, this would open a scheduling interface
            console.log('Schedule follow-up for lead:', leadId);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  if (loading && insights.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Lead Insights</Text>
          <View style={styles.loadingIndicator} />
        </View>
        <Text style={styles.loadingText}>Loading lead insights...</Text>
      </View>
    );
  }

  if (displayInsights.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Lead Insights</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refreshInsights}
            disabled={refreshing}
          >
            <Icon name="refresh" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="people" size={48} color="#cccccc" />
          <Text style={styles.emptyText}>No lead insights available</Text>
          <Text style={styles.emptySubtext}>
            Try adjusting your filters or refresh to load new data
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Top Lead Insights</Text>
          <Text style={styles.subtitle}>
            {insights.length} total leads • {displayInsights.length} shown
          </Text>
          <Text style={styles.lastUpdate}>
            Updated {lastUpdate.toLocaleTimeString()}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refreshInsights}
          disabled={refreshing}
        >
          <Icon
            name={refreshing ? "hourglass-empty" : "refresh"}
            size={20}
            color="#007AFF"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshInsights}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        {displayInsights.map((insight, index) => {
          const animatedValue = animatedValues.get(insight.leadId) || new Animated.Value(1);
          const scoreChange = getScoreChange(insight);

          return (
            <Animated.View
              key={insight.leadId}
              style={[
                styles.leadCard,
                {
                  transform: [{ scale: animatedValue }],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.cardTouchable}
                onPress={() => onLeadPress?.(insight.leadId)}
                onLongPress={() => handleLeadLongPress(insight.leadId)}
                activeOpacity={0.7}
              >
                {/* Priority Indicator */}
                <View
                  style={[
                    styles.priorityIndicator,
                    { backgroundColor: getPriorityColor(insight.priority) },
                  ]}
                />

                {/* Real-time Indicator */}
                <View style={styles.realTimeIndicator}>
                  <View style={styles.realTimeDot} />
                  <Text style={styles.realTimeText}>LIVE</Text>
                </View>

                {/* Lead Header */}
                <View style={styles.leadHeader}>
                  <Text style={styles.leadName} numberOfLines={1}>
                    {insight.name}
                  </Text>
                  <Text style={styles.leadEmail} numberOfLines={1}>
                    {insight.email}
                  </Text>
                </View>

                {/* Score and Probability */}
                <View style={styles.metricsContainer}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Score</Text>
                    <View style={styles.scoreContainer}>
                      <Text style={styles.metricValue}>
                        {formatScore(insight.currentScore)}
                      </Text>
                      {scoreChange && (
                        <View style={styles.scoreChange}>
                          <Icon
                            name={
                              scoreChange.direction === 'up'
                                ? 'arrow-upward'
                                : scoreChange.direction === 'down'
                                ? 'arrow-downward'
                                : 'remove'
                            }
                            size={12}
                            color={
                              scoreChange.direction === 'up'
                                ? '#28a745'
                                : scoreChange.direction === 'down'
                                ? '#dc3545'
                                : '#6c757d'
                            }
                          />
                          <Text
                            style={[
                              styles.scoreChangeText,
                              {
                                color:
                                  scoreChange.direction === 'up'
                                    ? '#28a745'
                                    : scoreChange.direction === 'down'
                                    ? '#dc3545'
                                    : '#6c757d',
                              },
                            ]}
                          >
                            {Math.abs(scoreChange.percent).toFixed(1)}%
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Conversion</Text>
                    <Text style={styles.metricValue}>
                      {formatProbability(insight.conversionProbability)}
                    </Text>
                  </View>
                </View>

                {/* Engagement Level */}
                <View style={styles.engagementContainer}>
                  <View
                    style={[
                      styles.engagementIndicator,
                      { backgroundColor: getEngagementColor(insight.engagementLevel) },
                    ]}
                  />
                  <Text style={styles.engagementText}>
                    {insight.engagementLevel.toUpperCase()} ENGAGEMENT
                  </Text>
                </View>

                {/* Next Best Action */}
                <View style={styles.actionContainer}>
                  <Icon name="lightbulb" size={16} color="#007AFF" />
                  <Text style={styles.actionText} numberOfLines={2}>
                    {insight.nextBestAction}
                  </Text>
                </View>

                {/* Key Insights */}
                {insight.insights.length > 0 && (
                  <View style={styles.insightsContainer}>
                    <Text style={styles.insightsTitle}>Key Insights:</Text>
                    {insight.insights.slice(0, 2).map((insightItem, idx) => (
                      <View key={idx} style={styles.insightItem}>
                        <View
                          style={[
                            styles.insightDot,
                            {
                              backgroundColor:
                                insightItem.type === 'positive'
                                  ? '#28a745'
                                  : insightItem.type === 'negative'
                                  ? '#dc3545'
                                  : '#ffc107',
                            },
                          ]}
                        />
                        <Text style={styles.insightText} numberOfLines={1}>
                          {insightItem.title}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Last Activity */}
                <View style={styles.activityContainer}>
                  <Icon name="schedule" size={14} color="#666666" />
                  <Text style={styles.activityText}>
                    {new Date(insight.lastActivity).toLocaleDateString()}
                  </Text>
                </View>

                {/* Recommendations Count */}
                {insight.recommendations.length > 0 && (
                  <View style={styles.recommendationsBadge}>
                    <Icon name="recommend" size={12} color="#ffffff" />
                    <Text style={styles.recommendationsText}>
                      {insight.recommendations.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </ScrollView>

      {/* Performance Indicator */}
      <View style={styles.performanceIndicator}>
        <Text style={styles.performanceText}>
          Real-time updates active • {insights.length} leads monitored
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
  },
  loadingIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderTopColor: 'transparent',
    // Animation would be added in a real implementation
  },
  loadingText: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#666666',
    fontSize: 16,
    marginTop: 8,
  },
  scrollContainer: {
    paddingRight: 16,
  },
  leadCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    width: SCREEN_WIDTH * 0.7,
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  priorityIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  leadHeader: {
    marginBottom: 12,
  },
  leadName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  leadEmail: {
    fontSize: 12,
    color: '#666666',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: '#666666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  engagementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  engagementIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  engagementText: {
    fontSize: 10,
    color: '#666666',
    fontWeight: 'bold',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 6,
    flex: 1,
  },
  insightsContainer: {
    marginBottom: 12,
  },
  insightsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 6,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  insightText: {
    fontSize: 11,
    color: '#666666',
    flex: 1,
  },
  activityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  activityText: {
    fontSize: 10,
    color: '#666666',
    marginLeft: 4,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  lastUpdate: {
    fontSize: 10,
    color: '#999999',
    marginTop: 2,
  },
  cardTouchable: {
    flex: 1,
  },
  realTimeIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  realTimeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#28a745',
    marginRight: 4,
  },
  realTimeText: {
    fontSize: 8,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  scoreChangeText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  recommendationsBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationsText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 2,
  },
  performanceIndicator: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignSelf: 'center',
  },
  performanceText: {
    fontSize: 10,
    color: '#666666',
    textAlign: 'center',
  },
});

export default LeadInsightsPanel;