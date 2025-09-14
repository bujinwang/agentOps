import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import {
  MaterialColors,
  MaterialElevation,
  MaterialSpacing,
  MaterialTypography
} from '../../styles/MaterialDesign';

const { width: screenWidth } = Dimensions.get('window');

interface ComparisonData {
  label: string;
  values: {
    [key: string]: number;
  };
  color?: string;
}

interface ComparisonChartProps {
  title: string;
  data: ComparisonData[];
  categories: string[];
  categoryLabels?: { [key: string]: string };
  categoryColors?: { [key: string]: string };
  height?: number;
  showValues?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({
  title,
  data,
  categories,
  categoryLabels = {},
  categoryColors = {},
  height = 300,
  showValues = true,
  orientation = 'vertical',
}) => {
  if (!data || data.length === 0 || !categories || categories.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data available for comparison</Text>
        </View>
      </View>
    );
  }

  // Calculate max value for scaling
  const allValues = data.flatMap(item =>
    categories.map(cat => item.values[cat] || 0)
  );
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const range = maxValue - minValue || 1;

  const getCategoryColor = (category: string, index: number): string => {
    return categoryColors[category] ||
           MaterialColors.primary[300 + (index * 100) % 600] ||
           MaterialColors.primary[500];
  };

  const getCategoryLabel = (category: string): string => {
    return categoryLabels[category] || category;
  };

  const renderVerticalComparison = () => {
    const barWidth = Math.max(40, (screenWidth - MaterialSpacing.xl * 2) / data.length - MaterialSpacing.md);
    const maxBarHeight = height - 120;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.verticalContainer}>
          {data.map((item, itemIndex) => (
            <View key={itemIndex} style={styles.verticalItem}>
              <View style={styles.verticalBars}>
                {categories.map((category, catIndex) => {
                  const value = item.values[category] || 0;
                  const barHeight = maxValue > 0 ? (value / maxValue) * maxBarHeight : 0;
                  const color = getCategoryColor(category, catIndex);

                  return (
                    <View key={category} style={styles.barGroup}>
                      <View
                        style={[
                          styles.verticalBar,
                          {
                            height: barHeight,
                            backgroundColor: color,
                            width: barWidth / categories.length - MaterialSpacing.xs,
                          }
                        ]}
                      />
                      {showValues && (
                        <Text style={[styles.barValue, { color }]}>
                          {value.toLocaleString()}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
              <Text style={styles.verticalLabel} numberOfLines={2}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderHorizontalComparison = () => {
    const maxBarWidth = screenWidth - MaterialSpacing.xl * 2 - 80;
    const barHeight = Math.max(20, (height - 100) / data.length - MaterialSpacing.sm);

    return (
      <View style={styles.horizontalContainer}>
        {data.map((item, itemIndex) => (
          <View key={itemIndex} style={styles.horizontalItem}>
            <Text style={styles.horizontalLabel} numberOfLines={1}>
              {item.label}
            </Text>
            <View style={styles.horizontalBars}>
              {categories.map((category, catIndex) => {
                const value = item.values[category] || 0;
                const barWidth = maxValue > 0 ? (value / maxValue) * maxBarWidth : 0;
                const color = getCategoryColor(category, catIndex);

                return (
                  <View key={category} style={styles.horizontalBarContainer}>
                    <View
                      style={[
                        styles.horizontalBar,
                        {
                          width: barWidth,
                          backgroundColor: color,
                          height: barHeight,
                        }
                      ]}
                    />
                    {showValues && barWidth > 50 && (
                      <Text style={[styles.horizontalBarValue, { color: MaterialColors.onPrimary }]}>
                        {value.toLocaleString()}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderLegend = () => {
    return (
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Categories:</Text>
        <View style={styles.legendItems}>
          {categories.map((category, index) => (
            <View key={category} style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: getCategoryColor(category, index) }
                ]}
              />
              <Text style={styles.legendText}>
                {getCategoryLabel(category)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { height }]}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.chartContainer}>
        {orientation === 'vertical' ? renderVerticalComparison() : renderHorizontalComparison()}
      </View>

      {renderLegend()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.lg,
    marginHorizontal: MaterialSpacing.sm,
    marginVertical: MaterialSpacing.xs,
    ...MaterialElevation.level2,
  },
  title: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.md,
    textAlign: 'center',
  },
  chartContainer: {
    flex: 1,
    marginBottom: MaterialSpacing.md,
  },
  verticalContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: MaterialSpacing.md,
  },
  verticalItem: {
    alignItems: 'center',
    marginHorizontal: MaterialSpacing.xs,
  },
  verticalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: MaterialSpacing.sm,
  },
  barGroup: {
    alignItems: 'center',
    marginHorizontal: MaterialSpacing.xs / 2,
  },
  verticalBar: {
    borderRadius: 4,
    marginBottom: MaterialSpacing.xs,
  },
  barValue: {
    ...MaterialTypography.labelSmall,
    fontWeight: '600',
    textAlign: 'center',
  },
  verticalLabel: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[700],
    textAlign: 'center',
    width: 80,
  },
  horizontalContainer: {
    paddingVertical: MaterialSpacing.md,
  },
  horizontalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: MaterialSpacing.md,
  },
  horizontalLabel: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[800],
    width: 80,
    marginRight: MaterialSpacing.md,
  },
  horizontalBars: {
    flex: 1,
    flexDirection: 'row',
  },
  horizontalBarContainer: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: MaterialSpacing.xs / 2,
  },
  horizontalBar: {
    borderRadius: 4,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: MaterialSpacing.sm,
  },
  horizontalBarValue: {
    ...MaterialTypography.labelSmall,
    fontWeight: '600',
  },
  legendContainer: {
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[200],
    paddingTop: MaterialSpacing.md,
  },
  legendTitle: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[800],
    marginBottom: MaterialSpacing.sm,
    fontWeight: '600',
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: MaterialSpacing.lg,
    marginBottom: MaterialSpacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: MaterialSpacing.sm,
  },
  legendText: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[700],
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[500],
  },
});

export default ComparisonChart;