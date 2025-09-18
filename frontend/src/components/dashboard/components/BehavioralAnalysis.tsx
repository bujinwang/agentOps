import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BehavioralPatterns, BehavioralTrend, BehavioralInsight } from '../../../types/dashboard';
import { predictiveAnalyticsService } from '../../../services/predictiveAnalyticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BehavioralAnalysisProps {
  leadId: number;
  patterns?: BehavioralPatterns;
  loading?: boolean;
  onInsightPress?: (insight: BehavioralInsight) => void;
  compact?: boolean;
}

const BehavioralAnalysis: React.FC<BehavioralAnalysisProps> = ({
  leadId,
  patterns: initialPatterns,
  loading = false,
  onInsightPress,
  compact = false,
}) => {
  const [patterns, setPatterns] = useState<BehavioralPatterns | undefined>(initialPatterns);
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [animatedValues] = useState<Map<string, Animated.Value>>(new Map());

  // Load patterns data if not provided
  useEffect(() => {
    const loadPatterns = async () => {
      if (!initialPatterns && leadId) {
        try {
          const analytics = await predictiveAnalyticsService.generatePredictiveAnalytics(leadId, {
            includeTimeline: false,
            includeValue: false,
            includeRisk: false,
          });
          setPatterns(analytics.behavioralPatterns);
        } catch (error) {
          console.error('Failed to load behavioral patterns:', error);
        }
      }
    };

    loadPatterns();
  }, [leadId, initialPatterns]);

  // Animate pattern appearance
  useEffect(() => {
    if (patterns) {
      patterns.engagementPatterns.forEach((pattern, index) => {
        const key = `pattern_${pattern.type}`;
        if (!animatedValues.has(key)) {
          animatedValues.set(key, new Animated.Value(0));
        }
        const animatedValue = animatedValues.get(key)!;

        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 400,
          delay: index * 100,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [patterns, animatedValues]);

  // Get pattern color based on significance
  const getPatternColor = (significance: number) => {
    if (significance >= 0.8) return '#28a745'; // High significance - green
    if (significance >= 0.6) return '#ffc107'; // Medium significance - yellow
    return '#dc3545'; // Low significance - red
  };

  // Get trend icon
  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing':
        return 'trending-up';
      case 'decreasing':
        return 'trending-down';
      default:
        return 'trending-flat';
    }
  };

  // Get trend color
  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'increasing':
        return '#28a745';
      case 'decreasing':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  // Get insight icon
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return 'thumb-up';
      case 'negative':
        return 'thumb-down';
      default:
        return 'info';
    }
  };

  // Get insight color
  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive':
        return '#28a745';
      case 'negative':
        return '#dc3545';
      default:
        return '#ffc107';
    }
  };

  // Calculate pattern strength visualization
  const getPatternStrength = (significance: number) => {
    return Math.max(20, Math.min(100, significance * 100));
  };

  if (loading || !patterns) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <View style={styles.header}>
          <Text style={[styles.title, compact && styles.compactTitle]}>
            Behavioral Analysis
          </Text>
          <View style={styles.loadingIndicator} />
        </View>
        <Text style={styles.loadingText}>
          {loading ? 'Analyzing behavior patterns...' : 'Loading behavioral data...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <View style={styles.header}>
        <Text style={[styles.title, compact && styles.compactTitle]}>
          Behavioral Analysis
        </Text>
        <View style={styles.significanceBadge}>
          <Text style={styles.significanceText}>
            {Math.round(patterns.significance * 100)}% Significance
          </Text>
        </View>
      </View>

      {/* Overall Significance Indicator */}
      <View style={styles.significanceContainer}>
        <Text style={styles.significanceLabel}>Pattern Strength</Text>
        <View style={styles.significanceBar}>
          <View
            style={[
              styles.significanceFill,
              {
                width: `${getPatternStrength(patterns.significance)}%`,
                backgroundColor: getPatternColor(patterns.significance),
              },
            ]}
          />
        </View>
        <Text style={styles.significanceValue}>
          {patterns.significance >= 0.8 ? 'Strong' :
           patterns.significance >= 0.6 ? 'Moderate' : 'Weak'} Patterns Detected
        </Text>
      </View>

      {/* Engagement Patterns */}
      {!compact && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Engagement Patterns</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {patterns.engagementPatterns.map((pattern, index) => {
              const animatedValue = animatedValues.get(`pattern_${pattern.type}`) || new Animated.Value(1);

              return (
                <Animated.View
                  key={pattern.type}
                  style={[
                    styles.patternCard,
                    {
                      opacity: animatedValue,
                      transform: [{ scale: animatedValue }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.patternTouchable,
                      selectedPattern === pattern.type && styles.selectedPattern,
                    ]}
                    onPress={() => setSelectedPattern(
                      selectedPattern === pattern.type ? null : pattern.type
                    )}
                    activeOpacity={0.7}
                  >
                    <View style={styles.patternHeader}>
                      <Text style={styles.patternType}>{pattern.type.replace('_', ' ').toUpperCase()}</Text>
                      <View
                        style={[
                          styles.patternDot,
                          { backgroundColor: getPatternColor(pattern.significance) },
                        ]}
                      />
                    </View>

                    <View style={styles.patternMetrics}>
                      <Text style={styles.patternValue}>
                        {pattern.frequency.toFixed(2)}
                      </Text>
                      <Text style={styles.patternTrend}>{pattern.trend.toUpperCase()}</Text>
                    </View>

                    <Text style={styles.patternDescription} numberOfLines={2}>
                      {pattern.description}
                    </Text>

                    <View style={styles.patternSignificance}>
                      <Text style={styles.significancePercent}>
                        {Math.round(pattern.significance * 100)}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Behavioral Trends */}
      <View style={[styles.sectionContainer, compact && styles.compactSection]}>
        <Text style={[styles.sectionTitle, compact && styles.compactSectionTitle]}>
          Key Trends
        </Text>
        <ScrollView
          horizontal={compact}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={compact ? undefined : styles.trendsContainer}
        >
          {patterns.trends.map((trend, index) => (
            <View key={trend.type} style={[styles.trendItem, compact && styles.compactTrend]}>
              <View style={styles.trendHeader}>
                <Icon
                  name={getTrendIcon(trend.direction)}
                  size={16}
                  color={getTrendColor(trend.direction)}
                />
                <Text style={styles.trendType}>
                  {trend.type.replace('_', ' ').toUpperCase()}
                </Text>
              </View>

              <View style={styles.trendMetrics}>
                <Text style={styles.trendMagnitude}>
                  {Math.abs(trend.magnitude * 100).toFixed(1)}%
                </Text>
                <Text style={styles.trendDirection}>
                  {trend.direction}
                </Text>
              </View>

              <Text style={styles.trendSignificance}>
                {Math.round(trend.significance * 100)}% confidence
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Behavioral Insights */}
      <View style={[styles.sectionContainer, compact && styles.compactSection]}>
        <Text style={[styles.sectionTitle, compact && styles.compactSectionTitle]}>
          Insights & Recommendations
        </Text>
        <ScrollView
          horizontal={compact}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={compact ? undefined : styles.insightsContainer}
        >
          {patterns.insights.map((insight, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.insightItem, compact && styles.compactInsight]}
              onPress={() => onInsightPress?.(insight)}
              activeOpacity={0.7}
            >
              <View style={styles.insightHeader}>
                <Icon
                  name={getInsightIcon(insight.type)}
                  size={16}
                  color={getInsightColor(insight.type)}
                />
                <Text style={styles.insightCategory}>
                  {insight.category.toUpperCase()}
                </Text>
              </View>

              <Text style={styles.insightTitle} numberOfLines={2}>
                {insight.title}
              </Text>

              <Text style={styles.insightDescription} numberOfLines={3}>
                {insight.description}
              </Text>

              <View style={styles.insightMetrics}>
                <Text style={styles.insightImpact}>
                  Impact: {Math.round(insight.impact * 100)}%
                </Text>
                <Text style={styles.insightConfidence}>
                  {Math.round(insight.confidence * 100)}% confidence
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Analysis Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          Last analyzed: {new Date(patterns.lastAnalyzed).toLocaleDateString()}
        </Text>
        <TouchableOpacity style={styles.refreshButton}>
          <Icon name="refresh" size={16} color="#007AFF" />
          <Text style={styles.refreshText}>Re-analyze</Text>
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
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactContainer: {
    padding: 12,
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
  compactTitle: {
    fontSize: 16,
  },
  significanceBadge: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  significanceText: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '500',
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
  },
  significanceContainer: {
    marginBottom: 20,
  },
  significanceLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  significanceBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 8,
  },
  significanceFill: {
    height: '100%',
    borderRadius: 4,
  },
  significanceValue: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  compactSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  compactSectionTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  patternCard: {
    marginRight: 12,
    width: 160,
  },
  patternTouchable: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPattern: {
    borderColor: '#007AFF',
  },
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patternType: {
    fontSize: 11,
    color: '#666666',
    fontWeight: 'bold',
    flex: 1,
  },
  patternDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  patternMetrics: {
    marginBottom: 8,
  },
  patternValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  patternTrend: {
    fontSize: 10,
    color: '#666666',
    marginTop: 2,
  },
  patternDescription: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  patternSignificance: {
    alignItems: 'flex-end',
  },
  significancePercent: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  trendsContainer: {
    paddingBottom: 8,
  },
  trendItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 140,
  },
  compactTrend: {
    marginRight: 8,
    minWidth: 120,
    padding: 8,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendType: {
    fontSize: 12,
    color: '#666666',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  trendMetrics: {
    marginBottom: 8,
  },
  trendMagnitude: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  trendDirection: {
    fontSize: 11,
    color: '#999999',
    marginTop: 2,
  },
  trendSignificance: {
    fontSize: 10,
    color: '#666666',
  },
  insightsContainer: {
    paddingBottom: 8,
  },
  insightItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 200,
  },
  compactInsight: {
    marginRight: 8,
    minWidth: 160,
    padding: 8,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightCategory: {
    fontSize: 10,
    color: '#666666',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 6,
  },
  insightDescription: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  insightMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  insightImpact: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500',
  },
  insightConfidence: {
    fontSize: 11,
    color: '#666666',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  summaryText: {
    fontSize: 11,
    color: '#999999',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  refreshText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
  },
});

export default BehavioralAnalysis;