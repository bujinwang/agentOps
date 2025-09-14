import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import {
  MaterialColors,
  MaterialElevation,
  MaterialSpacing,
  MaterialTypography
} from '../../styles/MaterialDesign';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ChartData {
  label: string;
  value: number;
  color: string;
  percentage?: number;
  details?: {
    count: number;
    percentage: number;
    trend?: number;
    subItems?: Array<{
      label: string;
      value: number;
      color: string;
    }>;
  };
}

interface InteractiveChartProps {
  title: string;
  data: ChartData[];
  type: 'bar' | 'pie';
  height?: number;
  showValues?: boolean;
  onSegmentPress?: (segment: ChartData) => void;
  enableDrillDown?: boolean;
}

const InteractiveChart: React.FC<InteractiveChartProps> = ({
  title,
  data,
  type,
  height = 250,
  showValues = true,
  onSegmentPress,
  enableDrillDown = true,
}) => {
  const [selectedSegment, setSelectedSegment] = useState<ChartData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Calculate percentages and add to data
  const dataWithPercentages = data.map(item => ({
    ...item,
    percentage: total > 0 ? (item.value / total) * 100 : 0,
    details: item.details || {
      count: item.value,
      percentage: total > 0 ? (item.value / total) * 100 : 0,
    }
  }));

  const handleSegmentPress = (segment: ChartData) => {
    setSelectedSegment(segment);
    onSegmentPress?.(segment);

    if (enableDrillDown && segment.details?.subItems) {
      setModalVisible(true);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedSegment(null);
  };

  const renderBarChart = () => {
    const maxValue = Math.max(...dataWithPercentages.map(item => item.value));
    const barWidth = Math.max((screenWidth - MaterialSpacing.xl * 2) / dataWithPercentages.length - MaterialSpacing.md, 40);

    return (
      <View style={styles.barChartContainer}>
        {dataWithPercentages.map((item, index) => {
          const barHeight = maxValue > 0 ? (item.value / maxValue) * (height - 80) : 0;

          return (
            <TouchableOpacity
              key={index}
              style={styles.barContainer}
              onPress={() => handleSegmentPress(item)}
              activeOpacity={0.7}
            >
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      width: barWidth,
                      backgroundColor: item.color,
                      opacity: selectedSegment?.label === item.label ? 1 : 0.8
                    }
                  ]}
                />
                {showValues && (
                  <Text style={[styles.barValue, { color: item.color }]}>
                    {item.value}
                  </Text>
                )}
              </View>
              <Text style={styles.barLabel} numberOfLines={2}>
                {item.label}
              </Text>
              {showValues && (
                <Text style={styles.barPercentage}>
                  {item.percentage.toFixed(1)}%
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderPieChart = () => {
    const radius = Math.min(height / 2 - 20, 80);
    const centerX = screenWidth / 2 - MaterialSpacing.xl;
    const centerY = height / 2;

    let startAngle = -Math.PI / 2; // Start from top

    return (
      <View style={[styles.pieChartContainer, { height }]}>
        <View style={styles.pieWrapper}>
          {dataWithPercentages.map((item, index) => {
            const angle = (item.percentage / 100) * 2 * Math.PI;
            const endAngle = startAngle + angle;

            // Calculate path for pie slice (simplified as colored segments)
            const largeArcFlag = angle > Math.PI ? 1 : 0;
            const x1 = centerX + radius * Math.cos(startAngle);
            const y1 = centerY + radius * Math.sin(startAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);

            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ');

            const segment = (
              <TouchableOpacity
                key={index}
                style={[
                  styles.pieSegment,
                  {
                    backgroundColor: item.color,
                    opacity: selectedSegment?.label === item.label ? 1 : 0.8
                  }
                ]}
                onPress={() => handleSegmentPress(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.pieSegmentText}>
                  {item.label}: {item.percentage.toFixed(1)}%
                </Text>
              </TouchableOpacity>
            );

            startAngle = endAngle;
            return segment;
          })}
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          {dataWithPercentages.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.legendItem}
              onPress={() => handleSegmentPress(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.legendColor, { backgroundColor: item.color }]} />
              <View style={styles.legendTextContainer}>
                <Text style={styles.legendLabel}>{item.label}</Text>
                <Text style={styles.legendValue}>
                  {item.value} ({item.percentage.toFixed(1)}%)
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderDrillDownModal = () => {
    if (!selectedSegment || !selectedSegment.details?.subItems) return null;

    return (
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedSegment.label} Details
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.detailSummary}>
                <Text style={styles.detailSummaryText}>
                  Total: {selectedSegment.details.count} ({selectedSegment.details.percentage.toFixed(1)}%)
                </Text>
                {selectedSegment.details.trend && (
                  <Text style={[
                    styles.detailTrend,
                    { color: selectedSegment.details.trend > 0 ? MaterialColors.secondary[600] : MaterialColors.error[500] }
                  ]}>
                    Trend: {selectedSegment.details.trend > 0 ? '+' : ''}{selectedSegment.details.trend.toFixed(1)}%
                  </Text>
                )}
              </View>

              {selectedSegment.details.subItems && (
                <View style={styles.subItemsContainer}>
                  <Text style={styles.subItemsTitle}>Breakdown:</Text>
                  {selectedSegment.details.subItems.map((subItem, index) => (
                    <View key={index} style={styles.subItem}>
                      <View style={[styles.subItemColor, { backgroundColor: subItem.color }]} />
                      <View style={styles.subItemContent}>
                        <Text style={styles.subItemLabel}>{subItem.label}</Text>
                        <Text style={styles.subItemValue}>{subItem.value}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { height }]}>
      <Text style={styles.title}>{title}</Text>

      {type === 'bar' ? renderBarChart() : renderPieChart()}

      {renderDrillDownModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.lg,
    ...MaterialElevation.level2,
  },
  title: {
    ...MaterialTypography.titleLarge,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.md,
    textAlign: 'center',
  },
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingVertical: MaterialSpacing.md,
  },
  barContainer: {
    alignItems: 'center',
    maxWidth: 80,
  },
  barWrapper: {
    alignItems: 'center',
    marginBottom: MaterialSpacing.sm,
  },
  bar: {
    borderRadius: 4,
    marginBottom: MaterialSpacing.xs,
  },
  barValue: {
    ...MaterialTypography.labelMedium,
    fontWeight: '600',
  },
  barLabel: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[700],
    textAlign: 'center',
  },
  barPercentage: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
  },
  pieChartContainer: {
    justifyContent: 'center',
  },
  pieWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieSegment: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieSegmentText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  legendContainer: {
    marginTop: MaterialSpacing.lg,
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
  legendTextContainer: {
    flex: 1,
  },
  legendLabel: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[800],
  },
  legendValue: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    width: screenWidth * 0.9,
    maxHeight: screenHeight * 0.8,
    ...MaterialElevation.level4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: MaterialSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: MaterialColors.neutral[200],
  },
  modalTitle: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[900],
  },
  closeButton: {
    padding: MaterialSpacing.sm,
  },
  closeButtonText: {
    ...MaterialTypography.titleLarge,
    color: MaterialColors.neutral[600],
  },
  modalBody: {
    padding: MaterialSpacing.lg,
  },
  detailSummary: {
    marginBottom: MaterialSpacing.lg,
  },
  detailSummaryText: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.xs,
  },
  detailTrend: {
    ...MaterialTypography.bodyMedium,
    fontWeight: '600',
  },
  subItemsContainer: {
    marginTop: MaterialSpacing.md,
  },
  subItemsTitle: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.md,
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: MaterialSpacing.sm,
    padding: MaterialSpacing.sm,
    backgroundColor: MaterialColors.neutral[50],
    borderRadius: 8,
  },
  subItemColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: MaterialSpacing.sm,
  },
  subItemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subItemLabel: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[800],
  },
  subItemValue: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
    fontWeight: '600',
  },
});

export default InteractiveChart;