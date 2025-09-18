import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PerformanceInsight, InsightsFilters, PerformanceAnalysisResult } from '../../types/insights';
import performanceInsightsService from '../../services/PerformanceInsightsService';
import { MaterialColors, MaterialSpacing, MaterialTypography, MaterialElevation } from '../../styles/MaterialDesign';
import { useResponsive } from '../../hooks/useResponsive';
import InsightsList from './InsightsList';

interface InsightsDashboardProps {
  leadId?: number;
  filters?: InsightsFilters;
  onInsightSelect?: (insight: PerformanceInsight) => void;
  onRecommendationSelect?: (insightId: string, recommendationId: string) => void;
}

const InsightsDashboard: React.FC<InsightsDashboardProps> = ({
  leadId,
  filters,
  onInsightSelect,
  onRecommendationSelect
}) => {
  const [insights, setInsights] = useState<PerformanceInsight[]>([]);
  const [overallAnalysis, setOverallAnalysis] = useState<PerformanceAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { deviceType, getResponsiveSpacing } = useResponsive();
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const categories = [
    { key: 'all', label: 'All', icon: 'view-list' },
    { key: 'timing', label: 'Timing', icon: 'clock-outline' },
    { key: 'strategy', label: 'Strategy', icon: 'target' },
    { key: 'prioritization', label: 'Priority', icon: 'sort-variant' },
    { key: 'follow_up', label: 'Follow-up', icon: 'phone-outgoing' },
    { key: 'quality', label: 'Quality', icon: 'star-outline' },
    { key: 'conversion', label: 'Conversion', icon: 'trending-up' },
  ];

  const loadInsights = useCallback(async (isRefresh = false) => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      if (leadId) {
        // Load lead-specific insights
        const leadInsights = await performanceInsightsService.analyzeLeadPerformance(leadId);

        // Check if component is still mounted and request wasn't aborted
        if (isMountedRef.current && !abortControllerRef.current.signal.aborted) {
          setInsights(leadInsights.insights);
        }
      } else {
        // Load overall performance insights
        const analysis = await performanceInsightsService.analyzeOverallPerformance(filters);

        // Check if component is still mounted and request wasn't aborted
        if (isMountedRef.current && !abortControllerRef.current.signal.aborted) {
          setOverallAnalysis(analysis);
          setInsights(analysis.insights);
        }
      }
    } catch (error) {
      // Don't show error if request was aborted
      if (error.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        return;
      }

      console.error('Failed to load insights:', error);

      // Only show alert if component is still mounted
      if (isMountedRef.current) {
        Alert.alert('Error', 'Failed to load insights. Please try again.');
      }
    } finally {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [leadId, filters]);

  useEffect(() => {
    loadInsights();

    // Cleanup function
    return () => {
      isMountedRef.current = false;

      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [loadInsights]);

  const handleRefresh = useCallback(() => {
    loadInsights(true);
  }, [loadInsights]);

  const handleInsightPress = useCallback((insight: PerformanceInsight) => {
    onInsightSelect?.(insight);
  }, [onInsightSelect]);

  const handleRecommendationPress = useCallback((insightId: string, recommendationId: string) => {
    onRecommendationSelect?.(insightId, recommendationId);
  }, [onRecommendationSelect]);

  const filteredInsights = selectedCategory === 'all'
    ? insights
    : insights.filter(insight => insight.category === selectedCategory);

  const getCategoryStats = (category: string) => {
    const categoryInsights = insights.filter(insight => insight.category === category);
    const highImpact = categoryInsights.filter(insight => insight.impact === 'high').length;
    return { count: categoryInsights.length, highImpact };
  };

  const renderCategoryFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryContainer}
    >
      {categories.map((category) => {
        const stats = getCategoryStats(category.key);
        const isSelected = selectedCategory === category.key;

        return (
          <TouchableOpacity
            key={category.key}
            style={[
              styles.categoryButton,
              isSelected && { backgroundColor: MaterialColors.primary[500] }
            ]}
            onPress={() => setSelectedCategory(category.key)}
            accessibilityLabel={`${category.label} category${stats.count > 0 ? `, ${stats.count} insights` : ', no insights'}`}
            accessibilityState={{ selected: isSelected }}
          >
            <MaterialCommunityIcons
              name={category.icon as any}
              size={20}
              color={isSelected ? MaterialColors.onPrimary : MaterialColors.onSurface}
            />
            <Text
              style={[
                styles.categoryText,
                { color: isSelected ? MaterialColors.onPrimary : MaterialColors.onSurface }
              ]}
            >
              {category.label}
            </Text>
            {stats.count > 0 && (
              <View style={[
                styles.categoryBadge,
                isSelected && { backgroundColor: MaterialColors.primary[700] }
              ]}>
                <Text style={[
                  styles.categoryBadgeText,
                  { color: isSelected ? MaterialColors.onPrimary : MaterialColors.primary[500] }
                ]}>
                  {stats.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderSummaryStats = () => {
    if (!overallAnalysis) return null;

    const { summary } = overallAnalysis;
    const responsiveSpacing = getResponsiveSpacing(MaterialSpacing.md);

    return (
      <View style={[styles.summaryContainer, { marginHorizontal: responsiveSpacing }]}>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: MaterialColors.primary[500] }]}>
              {summary.totalInsights}
            </Text>
            <Text style={[styles.statLabel, { color: MaterialColors.neutral[600] }]}>
              Total Insights
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: MaterialColors.error[500] }]}>
              {summary.highImpactCount}
            </Text>
            <Text style={[styles.statLabel, { color: MaterialColors.neutral[600] }]}>
              High Impact
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: MaterialColors.secondary[500] }]}>
              {Math.round(summary.averageConfidence)}%
            </Text>
            <Text style={[styles.statLabel, { color: MaterialColors.neutral[600] }]}>
              Avg Confidence
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const responsiveSpacing = getResponsiveSpacing(MaterialSpacing.md);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: responsiveSpacing }]}>
        <Text style={[styles.title, { color: MaterialColors.onSurface }]}>
          {leadId ? 'Lead Performance Insights' : 'Performance Analytics'}
        </Text>
        <Text style={[styles.subtitle, { color: MaterialColors.neutral[600] }]}>
          {leadId ? `Analysis for Lead #${leadId}` : 'Comprehensive performance overview'}
        </Text>
      </View>

      {/* Summary Stats */}
      {!leadId && renderSummaryStats()}

      {/* Category Filters */}
      {renderCategoryFilter()}

      {/* Insights List */}
      <InsightsList
        insights={filteredInsights}
        onInsightPress={handleInsightPress}
        onRecommendationPress={handleRecommendationPress}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        emptyMessage={
          selectedCategory === 'all'
            ? 'No insights available'
            : `No ${selectedCategory} insights available`
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MaterialColors.background,
  },
  header: {
    paddingTop: MaterialSpacing.lg,
    paddingBottom: MaterialSpacing.md,
  },
  title: {
    ...MaterialTypography.headlineSmall,
    marginBottom: MaterialSpacing.xs,
  },
  subtitle: {
    ...MaterialTypography.bodyMedium,
  },
  summaryContainer: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.md,
    marginBottom: MaterialSpacing.md,
    ...MaterialElevation.level2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...MaterialTypography.headlineMedium,
    fontWeight: '700',
  },
  statLabel: {
    ...MaterialTypography.bodySmall,
    marginTop: MaterialSpacing.xs,
  },
  categoryContainer: {
    paddingHorizontal: MaterialSpacing.md,
    paddingBottom: MaterialSpacing.sm,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MaterialColors.surface,
    borderRadius: 20,
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    marginRight: MaterialSpacing.sm,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
    ...MaterialElevation.level1,
  },
  categoryText: {
    ...MaterialTypography.labelLarge,
    marginLeft: MaterialSpacing.xs,
    marginRight: MaterialSpacing.xs,
  },
  categoryBadge: {
    backgroundColor: MaterialColors.primary[100],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  categoryBadgeText: {
    ...MaterialTypography.labelSmall,
    fontWeight: '600',
  },
});

export default InsightsDashboard;