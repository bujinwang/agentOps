import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { RecommendationService, Recommendation, RecommendationAction, RecommendationContext } from '../../../services/recommendationService';
import { LeadInsights, PredictiveAnalytics } from '../../../types/dashboard';

// Simple inline components
const Card: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const Button: React.FC<{
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium';
}> = ({ title, onPress, variant = 'primary', size = 'medium' }) => (
  <TouchableOpacity
    style={[
      styles.button,
      variant === 'secondary' && styles.buttonSecondary,
      size === 'small' && styles.buttonSmall
    ]}
    onPress={onPress}
  >
    <Text style={[
      styles.buttonText,
      variant === 'secondary' && styles.buttonTextSecondary,
      size === 'small' && styles.buttonTextSmall
    ]}>
      {title}
    </Text>
  </TouchableOpacity>
);

const Icon: React.FC<{ name: string; size?: number; color?: string }> = ({ name, size = 24, color = '#000' }) => {
  // Simple icon placeholder - would be replaced with actual icon library
  const iconMap: { [key: string]: string } = {
    'alert-circle': '⚠️',
    'clock': '🕐',
    'check-circle': '✅',
    'info': 'ℹ️',
    'mail': '📧',
    'message-square': '💬',
    'phone': '📞',
    'smartphone': '📱',
    'send': '📤',
    'chevron-up': '⬆️',
    'chevron-down': '⬇️',
    'x': '✕',
    'lightbulb': '💡',
    'refresh-ccw': '🔄',
    'alert-triangle': '⚠️'
  };

  return <Text style={{ fontSize: size, color }}>{iconMap[name] || '•'}</Text>;
};

const LoadingSpinner: React.FC<{ size?: 'small' | 'large' }> = ({ size = 'large' }) => (
  <ActivityIndicator size={size} color="#3b82f6" />
);

const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Simple error boundary - would be replaced with proper error boundary
  return <>{children}</>;
};

interface RecommendationEngineProps {
  lead: LeadInsights;
  predictiveAnalytics: PredictiveAnalytics;
  onActionTaken?: (action: RecommendationAction, recommendationId: string) => void;
  onRecommendationDismissed?: (recommendationId: string) => void;
  refreshInterval?: number; // seconds
  maxRecommendations?: number;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  onActionPress: (action: RecommendationAction) => void;
  onDismiss: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onActionPress,
  onDismiss,
  isExpanded,
  onToggleExpand
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return 'alert-circle';
      case 'medium': return 'clock';
      case 'low': return 'check-circle';
      default: return 'info';
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return 'mail';
      case 'sms': return 'message-square';
      case 'call': return 'phone';
      case 'inapp': return 'smartphone';
      default: return 'send';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'immediate': return 'NOW';
      case 'today': return 'Today';
      case 'this_week': return 'This Week';
      case 'this_month': return 'This Month';
      default: return urgency.toUpperCase();
    }
  };

  return (
    <Card style={[styles.recommendationCard, { borderLeftColor: getPriorityColor(recommendation.priority) }]}>
      {/* Header */}
      <TouchableOpacity onPress={onToggleExpand} style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Icon
            name={getPriorityIcon(recommendation.priority)}
            size={20}
            color={getPriorityColor(recommendation.priority)}
          />
          <View style={styles.titleContainer}>
            <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
            <Text style={styles.recommendationType}>{recommendation.type.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.priorityBadge, { backgroundColor: getPriorityColor(recommendation.priority) }]}>
            {recommendation.priority.toUpperCase()}
          </Text>
          <Icon
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#6b7280"
          />
        </View>
      </TouchableOpacity>

      {/* Content */}
      {isExpanded && (
        <View style={styles.cardContent}>
          {/* Description */}
          <Text style={styles.description}>{recommendation.description}</Text>

          {/* Rationale */}
          <View style={styles.rationaleContainer}>
            <Text style={styles.rationaleLabel}>Why this recommendation:</Text>
            <Text style={styles.rationaleText}>{recommendation.rationale}</Text>
          </View>

          {/* Expected Impact */}
          <View style={styles.impactContainer}>
            <Text style={styles.impactLabel}>Expected Impact:</Text>
            <View style={styles.impactMetrics}>
              <Text style={styles.impactMetric}>
                +{Math.round(recommendation.expectedImpact.conversionIncrease * 100)}% conversion
              </Text>
              <Text style={styles.impactMetric}>
                {recommendation.expectedImpact.timeToConversion > 0 ? '+' : ''}{recommendation.expectedImpact.timeToConversion} days
              </Text>
              <Text style={styles.impactMetric}>
                {Math.round(recommendation.expectedImpact.confidence * 100)}% confidence
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <Text style={styles.actionsLabel}>Recommended Actions:</Text>
            {recommendation.actions.map((action, index) => (
              <View key={action.id} style={styles.actionItem}>
                <View style={styles.actionHeader}>
                  <Icon
                    name={getChannelIcon(action.channel.primary)}
                    size={16}
                    color="#3b82f6"
                  />
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={[styles.urgencyBadge, {
                    backgroundColor: action.timing.urgency === 'immediate' ? '#ef4444' : '#f59e0b'
                  }]}>
                    {getUrgencyText(action.timing.urgency)}
                  </Text>
                </View>

                <Text style={styles.actionDescription}>{action.description}</Text>

                <View style={styles.actionTiming}>
                  <Text style={styles.timingLabel}>Suggested time:</Text>
                  <Text style={styles.timingValue}>
                    {formatTime(action.timing.suggestedTime)}
                  </Text>
                </View>

                <View style={styles.actionFooter}>
                  <Text style={styles.responseExpectation}>
                    Expected: {action.expectedResponse.type} ({Math.round(action.expectedResponse.probability * 100)}% in {action.expectedResponse.timeFrame})
                  </Text>
                  <Button
                    title="Take Action"
                    onPress={() => onActionPress(action)}
                    size="small"
                    variant="primary"
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Validity Period */}
          <View style={styles.validityContainer}>
            <Text style={styles.validityText}>
              Valid until: {formatTime(recommendation.validityPeriod.end)}
            </Text>
          </View>

          {/* Dismiss Button */}
          <View style={styles.dismissContainer}>
            <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
              <Icon name="x" size={16} color="#6b7280" />
              <Text style={styles.dismissText}>Dismiss Recommendation</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Card>
  );
};

export const RecommendationEngine: React.FC<RecommendationEngineProps> = ({
  lead,
  predictiveAnalytics,
  onActionTaken,
  onRecommendationDismissed,
  refreshInterval = 300, // 5 minutes
  maxRecommendations = 5
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const recommendationService = new RecommendationService();

  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Create recommendation context
      const context: RecommendationContext = {
        leadId: lead.leadId,
        leadData: {
          id: lead.leadId,
          name: lead.name,
          email: lead.email,
          phone: lead.phone || '',
          status: 'active', // Map from lead status
          preferredContact: lead.recommendations?.[0]?.channels?.[0]?.type as any || 'email',
          createdAt: lead.lastActivity,
          updatedAt: lead.lastActivity
        },
        leadScore: {
          score: lead.currentScore,
          confidence: 0.85, // Default confidence
          factors: {}, // Would be populated from actual scoring
          lastUpdated: lead.lastActivity
        },
        predictiveAnalytics,
        historicalActivity: [], // Would be populated from actual activity data
        currentTime: new Date()
      };

      const recs = await recommendationService.generateRecommendations(context);

      // Sort and limit recommendations
      const sortedRecs = recs
        .sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        })
        .slice(0, maxRecommendations);

      setRecommendations(sortedRecs);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }, [lead, predictiveAnalytics, maxRecommendations]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        loadRecommendations();
      }, refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, loadRecommendations]);

  const handleActionPress = (action: RecommendationAction, recommendation: Recommendation) => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action.title.toLowerCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            onActionTaken?.(action, recommendation.id);
            // Track effectiveness
            recommendationService.trackRecommendationEffectiveness(
              recommendation.id,
              lead.leadId,
              action.type,
              'success',
              { timestamp: new Date() }
            );
          }
        }
      ]
    );
  };

  const handleDismiss = (recommendationId: string) => {
    Alert.alert(
      'Dismiss Recommendation',
      'Are you sure you want to dismiss this recommendation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          onPress: () => {
            setRecommendations(prev => prev.filter(r => r.id !== recommendationId));
            onRecommendationDismissed?.(recommendationId);
          }
        }
      ]
    );
  };

  const toggleCardExpansion = (recommendationId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recommendationId)) {
        newSet.delete(recommendationId);
      } else {
        newSet.add(recommendationId);
      }
      return newSet;
    });
  };

  const refreshRecommendations = () => {
    loadRecommendations();
  };

  if (loading && recommendations.length === 0) {
    return (
      <Card style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
          <Text style={styles.loadingText}>Analyzing lead data...</Text>
          <Text style={styles.loadingSubtext}>Generating personalized recommendations</Text>
        </View>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-triangle" size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>Failed to Load Recommendations</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Button
            title="Retry"
            onPress={refreshRecommendations}
            variant="secondary"
          />
        </View>
      </Card>
    );
  }

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="lightbulb" size={24} color="#3b82f6" />
            <Text style={styles.headerTitle}>AI Recommendations</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.lastRefreshText}>
              Updated {lastRefresh.toLocaleTimeString()}
            </Text>
            <TouchableOpacity onPress={refreshRecommendations} style={styles.refreshButton}>
              <Icon name="refresh-ccw" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Recommendations List */}
        {recommendations.length === 0 ? (
          <Card style={styles.emptyContainer}>
            <Icon name="check-circle" size={48} color="#10b981" />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyMessage}>
              No recommendations available at this time. Check back later for new insights.
            </Text>
          </Card>
        ) : (
          <ScrollView style={styles.recommendationsList} showsVerticalScrollIndicator={false}>
            {recommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                onActionPress={(action) => handleActionPress(action, recommendation)}
                onDismiss={() => handleDismiss(recommendation.id)}
                isExpanded={expandedCards.has(recommendation.id)}
                onToggleExpand={() => toggleCardExpansion(recommendation.id)}
              />
            ))}
          </ScrollView>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Recommendations are generated based on lead behavior, predictive analytics, and historical success patterns.
          </Text>
        </View>
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    margin: 4,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#e5e7eb',
  },
  buttonSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonTextSecondary: {
    color: '#374151',
  },
  buttonTextSmall: {
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastRefreshText: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 8,
  },
  refreshButton: {
    padding: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  recommendationsList: {
    flex: 1,
    padding: 16,
  },
  recommendationCard: {
    marginBottom: 12,
    borderLeftWidth: 4,
    backgroundColor: '#ffffff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  titleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  recommendationType: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priorityBadge: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  cardContent: {
    padding: 16,
    paddingTop: 0,
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  rationaleContainer: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  rationaleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rationaleText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 18,
  },
  impactContainer: {
    marginBottom: 16,
  },
  impactLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  impactMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  impactMetric: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  actionsContainer: {
    marginBottom: 16,
  },
  actionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  urgencyBadge: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  actionDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  actionTiming: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timingLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 4,
  },
  timingValue: {
    fontSize: 12,
    color: '#1f2937',
    fontWeight: '500',
  },
  actionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  responseExpectation: {
    fontSize: 11,
    color: '#6b7280',
    flex: 1,
  },
  validityContainer: {
    marginBottom: 16,
  },
  validityText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  dismissContainer: {
    alignItems: 'center',
  },
  dismissButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  dismissText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  footer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default RecommendationEngine;