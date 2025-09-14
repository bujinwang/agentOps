import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {
  MaterialColors,
  MaterialElevation,
  MaterialSpacing,
  MaterialTypography
} from '../../styles/MaterialDesign';

const { width: screenWidth } = Dimensions.get('window');

interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
  color?: string;
}

interface TrendChartProps {
  title: string;
  data: TrendDataPoint[];
  height?: number;
  showGrid?: boolean;
  showTrendLine?: boolean;
  trendColor?: string;
  fillArea?: boolean;
  yAxisLabel?: string;
  xAxisLabel?: string;
}

const TrendChart: React.FC<TrendChartProps> = ({
  title,
  data,
  height = 250,
  showGrid = true,
  showTrendLine = true,
  trendColor = MaterialColors.primary[500],
  fillArea = false,
  yAxisLabel,
  xAxisLabel,
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      </View>
    );
  }

  const values = data.map(point => point.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = maxValue - minValue || 1;

  // Calculate trend (simple linear regression)
  const calculateTrend = () => {
    if (data.length < 2) return null;

    const n = data.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = data.reduce((sum, point) => sum + point.value, 0);
    const sumXY = data.reduce((sum, point, index) => sum + (index * point.value), 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  };

  const trend = calculateTrend();

  const renderGrid = () => {
    if (!showGrid) return null;

    const gridLines = [];
    for (let i = 0; i <= 5; i++) {
      const y = (height - 60) * (i / 5);
      const value = maxValue - (range * (i / 5));

      gridLines.push(
        <View key={`grid-${i}`} style={[styles.gridLine, { top: y }]}>
          <Text style={styles.gridLabel}>
            {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </Text>
        </View>
      );
    }

    return <View style={styles.gridContainer}>{gridLines}</View>;
  };

  const renderDataPoints = () => {
    const chartWidth = screenWidth - MaterialSpacing.xl * 2;
    const chartHeight = height - 60;

    return data.map((point, index) => {
      const x = (index / (data.length - 1)) * chartWidth;
      const y = chartHeight - ((point.value - minValue) / range) * chartHeight;

      return (
        <TouchableOpacity
          key={index}
          style={[
            styles.dataPoint,
            {
              left: x - 4,
              top: y - 4,
              backgroundColor: point.color || trendColor,
            }
          ]}
          activeOpacity={0.7}
        >
          <View style={styles.pointTooltip}>
            <Text style={styles.tooltipText}>
              {point.label || point.date}: {point.value.toLocaleString()}
            </Text>
          </View>
        </TouchableOpacity>
      );
    });
  };

  const renderTrendLine = () => {
    if (!showTrendLine || !trend) return null;

    const chartWidth = screenWidth - MaterialSpacing.xl * 2;
    const chartHeight = height - 60;

    const startX = 0;
    const startY = chartHeight - ((trend.intercept - minValue) / range) * chartHeight;
    const endX = chartWidth;
    const endY = chartHeight - ((trend.slope * (data.length - 1) + trend.intercept - minValue) / range) * chartHeight;

    const trendDirection = trend.slope > 0 ? 'up' : trend.slope < 0 ? 'down' : 'flat';
    const trendColor = trendDirection === 'up'
      ? MaterialColors.secondary[600]
      : trendDirection === 'down'
      ? MaterialColors.error[500]
      : MaterialColors.neutral[500];

    return (
      <View style={styles.trendLineContainer}>
        <View
          style={[
            styles.trendLine,
            {
              backgroundColor: trendColor,
              width: Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)),
              left: startX,
              top: Math.min(startY, endY),
              transform: [
                {
                  rotate: `${Math.atan2(endY - startY, endX - startX)}rad`
                }
              ]
            }
          ]}
        />
        <View style={[styles.trendIndicator, { backgroundColor: trendColor }]}>
          <Text style={styles.trendText}>
            {trendDirection === 'up' ? '↗' : trendDirection === 'down' ? '↘' : '→'}
          </Text>
        </View>
      </View>
    );
  };

  const renderAreaFill = () => {
    if (!fillArea) return null;

    const chartWidth = screenWidth - MaterialSpacing.xl * 2;
    const chartHeight = height - 60;

    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * chartWidth;
      const y = chartHeight - ((point.value - minValue) / range) * chartHeight;
      return `${x},${y}`;
    });

    const areaPath = `0,${chartHeight} ${points.join(' ')} ${chartWidth},${chartHeight}`;

    return (
      <View style={styles.areaFill}>
        {/* SVG-like area fill would be implemented here */}
        <View style={[styles.areaShape, { backgroundColor: trendColor, opacity: 0.1 }]} />
      </View>
    );
  };

  const renderXAxisLabels = () => {
    if (data.length === 0) return null;

    const labels = [];
    const step = Math.max(1, Math.floor(data.length / 5));

    for (let i = 0; i < data.length; i += step) {
      const point = data[i];
      const x = (i / (data.length - 1)) * (screenWidth - MaterialSpacing.xl * 2);

      labels.push(
        <Text
          key={i}
          style={[styles.axisLabel, { left: x - 30 }]}
          numberOfLines={1}
        >
          {new Date(point.date).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
          })}
        </Text>
      );
    }

    return <View style={styles.xAxisLabels}>{labels}</View>;
  };

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {trend && (
          <View style={styles.trendSummary}>
            <Text style={styles.trendSummaryText}>
              Trend: {trend.slope > 0.1 ? 'Increasing' : trend.slope < -0.1 ? 'Decreasing' : 'Stable'}
              ({trend.slope > 0 ? '+' : ''}{(trend.slope * 100).toFixed(1)}% per period)
            </Text>
          </View>
        )}
      </View>

      <View style={styles.chartArea}>
        {renderGrid()}
        {renderAreaFill()}
        {renderTrendLine()}
        {renderDataPoints()}
      </View>

      {renderXAxisLabels()}

      {yAxisLabel && (
        <Text style={styles.yAxisLabel}>{yAxisLabel}</Text>
      )}

      {xAxisLabel && (
        <Text style={styles.xAxisLabel}>{xAxisLabel}</Text>
      )}
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
  header: {
    marginBottom: MaterialSpacing.md,
  },
  title: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.xs,
  },
  trendSummary: {
    marginTop: MaterialSpacing.xs,
  },
  trendSummaryText: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  chartArea: {
    position: 'relative',
    height: '100%',
    marginBottom: MaterialSpacing.lg,
  },
  gridContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 40,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: MaterialColors.neutral[200],
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridLabel: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[500],
    backgroundColor: MaterialColors.surface,
    paddingHorizontal: MaterialSpacing.xs,
    marginLeft: -MaterialSpacing.sm,
  },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    ...MaterialElevation.level1,
  },
  pointTooltip: {
    position: 'absolute',
    bottom: 12,
    left: -20,
    backgroundColor: MaterialColors.neutral[900],
    borderRadius: 4,
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
    minWidth: 80,
  },
  tooltipText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
    textAlign: 'center',
  },
  trendLineContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 40,
  },
  trendLine: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
  },
  trendIndicator: {
    position: 'absolute',
    right: MaterialSpacing.sm,
    top: MaterialSpacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
    fontWeight: 'bold',
  },
  areaFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 40,
  },
  areaShape: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  xAxisLabels: {
    position: 'relative',
    height: 20,
    marginTop: MaterialSpacing.sm,
  },
  axisLabel: {
    position: 'absolute',
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[600],
    textAlign: 'center',
    width: 60,
  },
  yAxisLabel: {
    position: 'absolute',
    left: -MaterialSpacing.xl,
    top: '50%',
    transform: [{ rotate: '-90deg' }],
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[600],
  },
  xAxisLabel: {
    textAlign: 'center',
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[600],
    marginTop: MaterialSpacing.sm,
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

export default TrendChart;