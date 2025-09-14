import React from 'react';
import { View, FlatList, Text, StyleSheet, RefreshControl } from 'react-native';
import { PerformanceInsight } from '../../types/insights';
import { MaterialColors, MaterialSpacing, MaterialTypography } from '../../styles/MaterialDesign';
import InsightCard from './InsightCard';

interface InsightsListProps {
  insights: PerformanceInsight[];
  onInsightPress?: (insight: PerformanceInsight) => void;
  onRecommendationPress?: (insightId: string, recommendationId: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  emptyMessage?: string;
}

const InsightsList: React.FC<InsightsListProps> = ({
  insights,
  onInsightPress,
  onRecommendationPress,
  onRefresh,
  refreshing = false,
  emptyMessage = 'No insights available'
}) => {
  const renderInsight = ({ item }: { item: PerformanceInsight }) => (
    <InsightCard
      insight={item}
      onPress={() => onInsightPress?.(item)}
      onRecommendationPress={(recId) => onRecommendationPress?.(item.id, recId)}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: MaterialColors.neutral[600] }]}>
        {emptyMessage}
      </Text>
    </View>
  );

  const sortedInsights = [...insights].sort((a, b) => {
    // Sort by impact first (high > medium > low)
    const impactOrder = { high: 3, medium: 2, low: 1 };
    const impactDiff = impactOrder[b.impact] - impactOrder[a.impact];
    if (impactDiff !== 0) return impactDiff;

    // Then by confidence
    return b.confidence - a.confidence;
  });

  return (
    <FlatList
      data={sortedInsights}
      renderItem={renderInsight}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[MaterialColors.primary[500]]}
            tintColor={MaterialColors.primary[500]}
          />
        ) : undefined
      }
      ListEmptyComponent={renderEmpty}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: MaterialSpacing.sm,
    minHeight: '100%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: MaterialSpacing.xxl,
    paddingHorizontal: MaterialSpacing.lg,
  },
  emptyText: {
    ...MaterialTypography.bodyLarge,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default InsightsList;