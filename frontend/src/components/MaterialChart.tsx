import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  MaterialColors,
  MaterialElevation,
  MaterialSpacing,
  MaterialTypography,
  MaterialShape,
} from '../styles/MaterialDesign';
import { useResponsive } from '../hooks/useResponsive';

interface MaterialChartProps {
  title: string;
  data: Array<{ label: string; value: number; color?: string }>;
  type: 'bar' | 'line' | 'pie' | 'donut';
  height?: number;
  showValues?: boolean;
  animated?: boolean;
}

const MaterialChart: React.FC<MaterialChartProps> = ({
  title,
  data,
  type = 'bar',
  height,
  showValues = true,
}) => {
  const responsive = useResponsive();

  const metrics = useMemo(() => {
    const baseHeight = height ?? responsive.height * (responsive.isDesktop ? 0.35 : 0.3);
    const clampedHeight = Math.max(220, Math.min(baseHeight, responsive.isLandscape ? 420 : 360));
    const maxValue = Math.max(...data.map(item => item.value), 1);
    const totalValue = data.reduce((sum, item) => sum + item.value, 0);

    const horizontalPadding = responsive.getResponsivePadding(MaterialSpacing.lg, {
      mobile: MaterialSpacing.md,
      desktop: MaterialSpacing.xl,
    });

    const chartWidth = Math.min(
      responsive.width - horizontalPadding * 2,
      responsive.getMaxContentWidth({ desktop: 1040 })
    );

    const barWidth = Math.max(24, (chartWidth - responsive.getResponsiveSpacing(MaterialSpacing.xl)) / Math.max(data.length, 1));

    const pieRadius = Math.min(chartWidth, clampedHeight * (responsive.isLandscape ? 0.8 : 0.9)) / 2;

    return {
      maxValue,
      totalValue,
      chartHeight: clampedHeight,
      chartWidth,
      barWidth,
      pieRadius,
      horizontalPadding,
    };
  }, [data, height, responsive]);

  const renderBarChart = () => (
    <View style={[styles.chartRow, responsive.isDesktop && styles.chartRowSplit]}>
      <View style={[styles.chartContainer, { width: metrics.chartWidth }]}>        
        <View style={[styles.barChart, { height: metrics.chartHeight - MaterialSpacing.lg }]}>          
          {data.map((item, index) => {
            const barHeight = (item.value / metrics.maxValue) * (metrics.chartHeight - MaterialSpacing.xl);
            const color = item.color || MaterialColors.primary[400 + (index % 4) * 100];

            return (
              <View key={item.label} style={[styles.barContainer, { width: metrics.barWidth }]}>                
                <View style={[styles.bar, { height: barHeight, backgroundColor: color }]} />
                <Text style={styles.barLabel} numberOfLines={2}>
                  {item.label}
                </Text>
                {showValues && (
                  <Text style={styles.barValue}>{item.value.toLocaleString()}</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );

  const renderLineChart = () => {
    const points = data.map((item, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * (metrics.chartWidth - MaterialSpacing.xl);
      const y = metrics.chartHeight - MaterialSpacing.xl - (item.value / metrics.maxValue) * (metrics.chartHeight - MaterialSpacing.xl * 1.5);
      const color = item.color || MaterialColors.primary[500];
      return { ...item, x, y, color };
    });

    return (
      <View style={[styles.chartRow, responsive.isDesktop && styles.chartRowSplit]}>
        <View style={[styles.chartContainer, { height: metrics.chartHeight }]}>          
          <View style={styles.lineChart}>
            {points.map(point => (
              <View
                key={point.label}
                style={[
                  styles.linePoint,
                  {
                    left: point.x,
                    top: point.y,
                    backgroundColor: point.color,
                  },
                ]}
              >
                {showValues && (
                  <View style={styles.pointLabel}>
                    <Text style={styles.pointValue}>{point.value.toLocaleString()}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
          <View style={styles.lineLabels}>
            {data.map(item => (
              <Text key={item.label} style={styles.lineLabel} numberOfLines={1}>
                {item.label}
              </Text>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderPieChart = () => {
    const radius = metrics.pieRadius;
    const center = radius;
    let currentAngle = 0;

    const slices = data.map((item, index) => {
      const sliceAngle = (item.value / metrics.totalValue) * 360;
      const color = item.color || MaterialColors.primary[300 + (index % 5) * 100];
      const entry = {
        ...item,
        color,
        startAngle: currentAngle,
        endAngle: currentAngle + sliceAngle,
        percentage: ((item.value / metrics.totalValue) * 100) || 0,
      };
      currentAngle += sliceAngle;
      return entry;
    });

    const legendColumns = responsive.getGridColumns({ mobile: 1, tablet: 2, desktop: 3 });

    return (
      <View style={[styles.chartRow, responsive.isDesktop && styles.chartRowSplit]}>
        <View style={[styles.pieChartContainer, { width: radius * 2, height: radius * 2 }]}>
          <View style={[styles.pieChart, { width: radius * 2, height: radius * 2, borderRadius: radius }]}>
            {slices.map(slice => (
              <TouchableOpacity
                key={slice.label}
                activeOpacity={0.9}
                style={styles.pieSlicePlaceholder}
              >
                <Text style={styles.pieSlicePlaceholderText}>{slice.percentage.toFixed(1)}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View
          style={[
            styles.pieLegend,
            {
              width: metrics.chartWidth,
              columnGap: MaterialSpacing.md,
              flexDirection: legendColumns > 1 ? 'row' : 'column',
              flexWrap: legendColumns > 1,
            },
          ]}
        >
          {data.map((item, index) => (
            <View
              key={item.label}
              style={[
                styles.legendItem,
                { width: legendColumns > 1 ? `${100 / legendColumns}%` : '100%' },
              ]}
            >
              <View
                style={[styles.legendColor, { backgroundColor: item.color || MaterialColors.primary[300 + (index % 5) * 100] }]}
              />
              <View style={styles.legendLabelColumn}>
                <Text style={styles.legendText} numberOfLines={1}>
                  {item.label}
                </Text>
                {showValues && (
                  <Text style={styles.legendValue}>{item.value.toLocaleString()}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const chartContent = useMemo(() => {
    switch (type) {
      case 'pie':
      case 'donut':
        return renderPieChart();
      case 'line':
        return renderLineChart();
      case 'bar':
      default:
        return renderBarChart();
    }
  }, [type, renderBarChart, renderLineChart, renderPieChart]);

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: metrics.horizontalPadding,
          paddingVertical: responsive.getResponsivePadding(MaterialSpacing.lg, {
            mobile: MaterialSpacing.md,
          }),
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { fontSize: responsive.getResponsiveFontSize(20) }]}>{title}</Text>
        <Text style={styles.subtitle}>
          {data.length} items • Total: {metrics.totalValue.toLocaleString()}
        </Text>
      </View>
      {chartContent}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: MaterialColors.surface,
    borderRadius: MaterialShape.large,
    ...MaterialElevation.level2,
  },
  header: {
    marginBottom: MaterialSpacing.lg,
    gap: MaterialSpacing.xs,
  },
  title: {
    ...MaterialTypography.titleLarge,
    color: MaterialColors.onSurface,
  },
  subtitle: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
  },
  chartRow: {
    width: '100%',
  },
  chartRowSplit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: MaterialSpacing.xl,
  },
  chartContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: MaterialSpacing.md,
  },
  barContainer: {
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: MaterialShape.small,
    backgroundColor: MaterialColors.primary[500],
  },
  barLabel: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[600],
    marginTop: MaterialSpacing.sm,
    textAlign: 'center',
  },
  barValue: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.onSurface,
    marginTop: MaterialSpacing.xs,
  },
  lineChart: {
    flex: 1,
    borderRadius: MaterialShape.medium,
    backgroundColor: MaterialColors.neutral[100],
  },
  linePoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pointLabel: {
    position: 'absolute',
    bottom: 16,
    left: -20,
    paddingHorizontal: MaterialSpacing.xs,
    paddingVertical: 4,
    backgroundColor: MaterialColors.surface,
    borderRadius: MaterialShape.small,
    ...MaterialElevation.level1,
  },
  pointValue: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onSurface,
  },
  lineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: MaterialSpacing.md,
  },
  lineLabel: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[600],
  },
  pieChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieChart: {
    backgroundColor: MaterialColors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pieSlicePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MaterialColors.neutral[200],
    margin: MaterialSpacing.sm,
  },
  pieSlicePlaceholderText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[600],
  },
  pieLegend: {
    marginTop: MaterialSpacing.lg,
    gap: MaterialSpacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabelColumn: {
    flex: 1,
    gap: 2,
  },
  legendText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.onSurface,
  },
  legendValue: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[600],
  },
});

export default MaterialChart;
