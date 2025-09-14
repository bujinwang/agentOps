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

interface FunnelStage {
  label: string;
  value: number;
  color?: string;
  percentage?: number;
  dropoff?: number;
  details?: {
    count: number;
    percentage: number;
    conversion: number;
  };
}

interface FunnelChartProps {
  title: string;
  data: FunnelStage[];
  height?: number;
  showValues?: boolean;
  showPercentages?: boolean;
  showDropoff?: boolean;
  onStagePress?: (stage: FunnelStage, index: number) => void;
  orientation?: 'vertical' | 'horizontal';
}

const FunnelChart: React.FC<FunnelChartProps> = ({
  title,
  data,
  height = 300,
  showValues = true,
  showPercentages = true,
  showDropoff = true,
  onStagePress,
  orientation = 'vertical',
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No funnel data available</Text>
        </View>
      </View>
    );
  }

  // Calculate percentages and dropoff rates
  const maxValue = Math.max(...data.map(stage => stage.value));
  const processedData = data.map((stage, index) => {
    const percentage = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
    const previousValue = index > 0 ? data[index - 1].value : stage.value;
    const dropoff = previousValue > 0 ? ((previousValue - stage.value) / previousValue) * 100 : 0;

    return {
      ...stage,
      percentage,
      dropoff: index > 0 ? dropoff : 0,
      details: {
        count: stage.value,
        percentage,
        conversion: index > 0 ? (stage.value / previousValue) * 100 : 100,
      }
    };
  });

  const getStageColor = (index: number): string => {
    return processedData[index].color ||
           MaterialColors.primary[400 + (index * 50) % 400] ||
           MaterialColors.primary[500];
  };

  const renderVerticalFunnel = () => {
    const stageHeight = (height - 100) / processedData.length;
    const maxWidth = screenWidth - MaterialSpacing.xl * 2;

    return (
      <View style={styles.verticalFunnel}>
        {processedData.map((stage, index) => {
          const width = (stage.percentage / 100) * maxWidth;
          const color = getStageColor(index);

          return (
            <TouchableOpacity
              key={index}
              style={styles.verticalStage}
              onPress={() => onStagePress?.(stage, index)}
              activeOpacity={0.7}
            >
              <View style={styles.stageConnector}>
                {index > 0 && (
                  <View style={[styles.connectorLine, { backgroundColor: color }]} />
                )}
              </View>

              <View
                style={[
                  styles.verticalStageBar,
                  {
                    width,
                    height: stageHeight,
                    backgroundColor: color,
                  }
                ]}
              >
                <View style={styles.stageContent}>
                  <Text style={[styles.stageLabel, { color: MaterialColors.onPrimary }]}>
                    {stage.label}
                  </Text>
                  {showValues && (
                    <Text style={[styles.stageValue, { color: MaterialColors.onPrimary }]}>
                      {stage.value.toLocaleString()}
                    </Text>
                  )}
                  {showPercentages && (
                    <Text style={[styles.stagePercentage, { color: MaterialColors.onPrimary }]}>
                      {stage.details?.conversion.toFixed(1)}%
                    </Text>
                  )}
                </View>
              </View>

              {showDropoff && index > 0 && stage.dropoff > 0 && (
                <View style={styles.dropoffIndicator}>
                  <Text style={[styles.dropoffText, { color: MaterialColors.error[600] }]}>
                    -{stage.dropoff.toFixed(1)}%
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderHorizontalFunnel = () => {
    const maxHeight = height - 100;
    const stageWidth = (screenWidth - MaterialSpacing.xl * 2) / processedData.length;

    return (
      <View style={styles.horizontalFunnel}>
        {processedData.map((stage, index) => {
          const barHeight = (stage.percentage / 100) * maxHeight;
          const color = getStageColor(index);

          return (
            <View key={index} style={styles.horizontalStage}>
              <TouchableOpacity
                style={styles.horizontalStageTouchable}
                onPress={() => onStagePress?.(stage, index)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.horizontalStageBar,
                    {
                      height: barHeight,
                      width: stageWidth - MaterialSpacing.md,
                      backgroundColor: color,
                    }
                  ]}
                >
                  <View style={styles.horizontalStageContent}>
                    {showValues && (
                      <Text style={[styles.horizontalStageValue, { color: MaterialColors.onPrimary }]}>
                        {stage.value.toLocaleString()}
                      </Text>
                    )}
                    {showPercentages && (
                      <Text style={[styles.horizontalStagePercentage, { color: MaterialColors.onPrimary }]}>
                        {stage.details?.conversion.toFixed(1)}%
                      </Text>
                    )}
                  </View>
                </View>

                <Text style={styles.horizontalStageLabel} numberOfLines={2}>
                  {stage.label}
                </Text>

                {showDropoff && index > 0 && stage.dropoff > 0 && (
                  <View style={styles.horizontalDropoffIndicator}>
                    <Text style={[styles.dropoffText, { color: MaterialColors.error[600] }]}>
                      -{stage.dropoff.toFixed(1)}%
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {index < processedData.length - 1 && (
                <View style={styles.horizontalConnector}>
                  <View style={[styles.horizontalConnectorLine, { backgroundColor: color }]} />
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderSummary = () => {
    const totalConversion = processedData.length > 1
      ? (processedData[processedData.length - 1].value / processedData[0].value) * 100
      : 100;

    return (
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          Overall Conversion: {totalConversion.toFixed(1)}%
        </Text>
        <Text style={styles.summarySubtext}>
          {processedData[0]?.value.toLocaleString()} → {processedData[processedData.length - 1]?.value.toLocaleString()}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { height }]}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.funnelContainer}>
        {orientation === 'vertical' ? renderVerticalFunnel() : renderHorizontalFunnel()}
      </View>

      {renderSummary()}
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
  funnelContainer: {
    flex: 1,
    marginBottom: MaterialSpacing.md,
  },
  verticalFunnel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalStage: {
    width: '100%',
    alignItems: 'center',
    marginBottom: MaterialSpacing.xs,
  },
  stageConnector: {
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorLine: {
    width: 2,
    height: '100%',
  },
  verticalStageBar: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: MaterialSpacing.sm,
  },
  stageContent: {
    alignItems: 'center',
  },
  stageLabel: {
    ...MaterialTypography.bodyMedium,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: MaterialSpacing.xs,
  },
  stageValue: {
    ...MaterialTypography.titleMedium,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  stagePercentage: {
    ...MaterialTypography.labelSmall,
    textAlign: 'center',
    marginTop: MaterialSpacing.xs,
  },
  dropoffIndicator: {
    position: 'absolute',
    right: MaterialSpacing.sm,
    top: '50%',
    transform: [{ translateY: -10 }],
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
    ...MaterialElevation.level1,
  },
  dropoffText: {
    ...MaterialTypography.labelSmall,
    fontWeight: '600',
  },
  horizontalFunnel: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: MaterialSpacing.md,
  },
  horizontalStage: {
    flex: 1,
    alignItems: 'center',
  },
  horizontalStageTouchable: {
    alignItems: 'center',
  },
  horizontalStageBar: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: MaterialSpacing.sm,
  },
  horizontalStageContent: {
    alignItems: 'center',
  },
  horizontalStageValue: {
    ...MaterialTypography.bodyMedium,
    fontWeight: 'bold',
  },
  horizontalStagePercentage: {
    ...MaterialTypography.labelSmall,
    marginTop: MaterialSpacing.xs,
  },
  horizontalStageLabel: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[700],
    textAlign: 'center',
    marginTop: MaterialSpacing.sm,
    height: 40,
  },
  horizontalDropoffIndicator: {
    position: 'absolute',
    top: -25,
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
    ...MaterialElevation.level1,
  },
  horizontalConnector: {
    position: 'absolute',
    right: -10,
    top: '50%',
    width: 20,
    height: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalConnectorLine: {
    width: '100%',
    height: 2,
  },
  summary: {
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[200],
    paddingTop: MaterialSpacing.md,
    alignItems: 'center',
  },
  summaryText: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    fontWeight: 'bold',
  },
  summarySubtext: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
    marginTop: MaterialSpacing.xs,
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

export default FunnelChart;