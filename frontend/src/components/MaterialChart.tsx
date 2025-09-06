import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { MaterialColors, MaterialElevation, MaterialSpacing, MaterialTypography } from '../styles/MaterialDesign';

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
  height = 200,
  showValues = true,
  animated = true,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const maxValue = Math.max(...data.map(item => item.value));
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  const renderBarChart = () => {
    const barWidth = (screenWidth - 100) / data.length;

    return (
      <View style={styles.chartContainer}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * (height - 40);
          const color = item.color || MaterialColors.primary[500];

          return (
            <View key={index} style={styles.barContainer}>
              <View style={[styles.bar, { height: barHeight, backgroundColor: color }]} />
              <Text style={styles.barLabel} numberOfLines={1}>
                {item.label}
              </Text>
              {showValues && (
                <Text style={styles.barValue}>{item.value.toLocaleString()}</Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderPieChart = () => {
    const radius = Math.min(screenWidth - 100, height - 40) / 2;
    const centerX = radius;
    const centerY = radius;

    let currentAngle = 0;
    const slices = data.map((item, index) => {
      const sliceAngle = (item.value / totalValue) * 360;
      const color = item.color || MaterialColors.primary[300 + (index * 100) % 600];
      
      const result = {
        ...item,
        color,
        startAngle: currentAngle,
        endAngle: currentAngle + sliceAngle,
      };
      
      currentAngle += sliceAngle;
      return result;
    });

    return (
      <View style={styles.pieContainer}>
        <View style={styles.pieChart}>
          {slices.map((slice, index) => {
            const angle = (slice.startAngle + slice.endAngle) / 2;
            const labelRadius = radius * 0.7;
            const labelX = centerX + labelRadius * Math.cos(angle * Math.PI / 180);
            const labelY = centerY + labelRadius * Math.sin(angle * Math.PI / 180);
            const percentage = ((slice.value / totalValue) * 100).toFixed(1);

            return (
              <View key={index}>
                {/* Pie slice would be rendered here using SVG or canvas */}
                <View
                  style={[
                    styles.pieSlice,
                    {
                      backgroundColor: slice.color,
                      transform: [{ rotate: `${slice.startAngle}deg` }],
                    },
                  ]}
                />
                <View style={[styles.pieLabel, { left: labelX - 20, top: labelY - 10 }]}>
                  <Text style={styles.pieLabelText}>{percentage}%</Text>
                </View>
              </View>
            );
          })}
        </View>
        <View style={styles.pieLegend}>
          {data.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: item.color || MaterialColors.primary[300 + (index * 100) % 600] }
                ]}
              />
              <Text style={styles.legendText}>{item.label}</Text>
              <Text style={styles.legendValue}>{item.value.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderLineChart = () => {
    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * (screenWidth - 80);
      const y = height - 40 - (item.value / maxValue) * (height - 80);
      return { x, y, ...item };
    });

    return (
      <View style={styles.chartContainer}>
        <View style={styles.lineChart}>
          {/* Line would be drawn here using SVG or canvas */}
          {points.map((point, index) => (
            <View
              key={index}
              style={[
                styles.linePoint,
                {
                  left: point.x,
                  top: point.y,
                  backgroundColor: point.color || MaterialColors.primary[500],
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
          {data.map((item, index) => (
            <Text key={index} style={styles.lineLabel} numberOfLines={1}>
              {item.label}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return renderBarChart();
      case 'pie':
      case 'donut':
        return renderPieChart();
      case 'line':
        return renderLineChart();
      default:
        return renderBarChart();
    }
  };

  return (
    <View style={[styles.container, { elevation: 1 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {data.length} items • Total: {totalValue.toLocaleString()}
        </Text>
      </View>
      <View style={[styles.chart, { height }]}>
        {renderChart()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    marginHorizontal: MaterialSpacing.sm,
    marginVertical: MaterialSpacing.xs,
    padding: MaterialSpacing.md,
    ...MaterialElevation.level1,
  },
  header: {
    marginBottom: MaterialSpacing.md,
  },
  title: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    marginBottom: 2,
  },
  subtitle: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  chart: {
    marginTop: MaterialSpacing.sm,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '100%',
  },
  barContainer: {
    alignItems: 'center',
    width: 60,
  },
  bar: {
    width: 40,
    borderRadius: 4,
    marginBottom: 8,
  },
  barLabel: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[700],
    textAlign: 'center',
    marginBottom: 4,
  },
  barValue: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
    textAlign: 'center',
  },
  pieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pieChart: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
  },
  pieSlice: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  pieLabel: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pieLabelText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
  },
  pieLegend: {
    flex: 1,
    marginLeft: MaterialSpacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: MaterialSpacing.sm,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: MaterialSpacing.sm,
  },
  legendText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[800],
    flex: 1,
  },
  legendValue: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  lineChart: {
    flex: 1,
    position: 'relative',
  },
  linePoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    elevation: 2,
  },
  pointLabel: {
    position: 'absolute',
    top: -30,
    left: -20,
    backgroundColor: MaterialColors.neutral[900],
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pointValue: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
  },
  lineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: MaterialSpacing.sm,
  },
  lineLabel: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[700],
    textAlign: 'center',
    flex: 1,
  },
});

export default MaterialChart;