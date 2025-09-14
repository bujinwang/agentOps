import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import {
  MaterialColors,
  MaterialElevation,
  MaterialSpacing,
  MaterialTypography
} from '../../styles/MaterialDesign';

const { width: screenWidth } = Dimensions.get('window');

interface ConversionStage {
  stage_name: string;
  stage_order: number;
  lead_count: number;
  avg_probability: number;
  total_value: number;
  details?: {
    leads?: Array<{
      id: number;
      name: string;
      value: number;
      probability: number;
    }>;
    conversion_time?: number;
    drop_off_reasons?: string[];
  };
}

interface ConversionFunnelProps {
  data: ConversionStage[];
  onStagePress?: (stage: ConversionStage) => void;
  showValues?: boolean;
  showProbabilities?: boolean;
  height?: number;
}

const ConversionFunnel: React.FC<ConversionFunnelProps> = ({
  data,
  onStagePress,
  showValues = true,
  showProbabilities = true,
  height = 300,
}) => {
  const [selectedStage, setSelectedStage] = useState<ConversionStage | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.noDataText}>No conversion data available</Text>
      </View>
    );
  }

  const maxCount = Math.max(...data.map(stage => stage.lead_count));
  const maxValue = Math.max(...data.map(stage => stage.total_value || 0));

  const getConversionRate = (currentIndex: number): number => {
    if (currentIndex === 0) return 100; // First stage is always 100%
    const previousCount = data[currentIndex - 1]?.lead_count || 0;
    const currentCount = data[currentIndex]?.lead_count || 0;
    return previousCount > 0 ? (currentCount / previousCount) * 100 : 0;
  };

  const getDropOffRate = (currentIndex: number): number => {
    return 100 - getConversionRate(currentIndex);
  };

  const getStageColor = (stageName: string, index: number): string => {
    const colors = {
      'New Lead': MaterialColors.primary[400],
      'Initial Contact': MaterialColors.secondary[400],
      'Qualified': MaterialColors.warning[400],
      'Needs Analysis': MaterialColors.primary[600],
      'Proposal Sent': MaterialColors.secondary[600],
      'Negotiation': MaterialColors.warning[600],
      'Closed Won': MaterialColors.secondary[700],
      'Closed Lost': MaterialColors.error[500],
    };

    return colors[stageName as keyof typeof colors] || MaterialColors.neutral[400];
  };

  const handleStagePress = (stage: ConversionStage) => {
    setSelectedStage(selectedStage?.stage_name === stage.stage_name ? null : stage);
    onStagePress?.(stage);

    // Show drill-down modal if stage has details
    if (stage.details?.leads || stage.details?.drop_off_reasons) {
      setModalVisible(true);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedStage(null);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <View style={[styles.container, { height }]}>
      <Text style={styles.title}>Conversion Funnel</Text>

      <ScrollView
        style={styles.funnelContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.funnelContent}
      >
        {data.map((stage, index) => {
          const width = maxCount > 0 ? Math.max((stage.lead_count / maxCount) * 0.9, 0.1) : 0.1;
          const conversionRate = getConversionRate(index);
          const dropOffRate = getDropOffRate(index);
          const color = getStageColor(stage.stage_name, index);
          const isSelected = selectedStage?.stage_name === stage.stage_name;

          return (
            <TouchableOpacity
              key={stage.stage_name}
              style={[
                styles.stageContainer,
                isSelected && styles.stageSelected
              ]}
              onPress={() => handleStagePress(stage)}
              activeOpacity={0.7}
            >
              {/* Stage Header */}
              <View style={styles.stageHeader}>
                <View style={styles.stageInfo}>
                  <Text style={styles.stageName}>{stage.stage_name}</Text>
                  <Text style={styles.stageCount}>
                    {stage.lead_count} leads
                  </Text>
                </View>

                {index > 0 && (
                  <View style={styles.conversionInfo}>
                    <Text style={[styles.conversionRate, { color: conversionRate > 50 ? MaterialColors.secondary[600] : MaterialColors.error[500] }]}>
                      {formatPercentage(conversionRate)}
                    </Text>
                    <Text style={styles.dropOffText}>
                      {formatPercentage(dropOffRate)} drop-off
                    </Text>
                  </View>
                )}
              </View>

              {/* Funnel Bar */}
              <View style={styles.funnelBarContainer}>
                <View
                  style={[
                    styles.funnelBar,
                    {
                      width: `${width * 100}%`,
                      backgroundColor: color,
                      opacity: isSelected ? 1 : 0.8
                    }
                  ]}
                />
              </View>

              {/* Expanded Details */}
              {isSelected && (
                <View style={styles.stageDetails}>
                  {stage.total_value > 0 && (
                    <Text style={styles.detailText}>
                      Total Value: {formatCurrency(stage.total_value)}
                    </Text>
                  )}

                  {showProbabilities && stage.avg_probability > 0 && (
                    <Text style={styles.detailText}>
                      Avg Probability: {formatPercentage(stage.avg_probability * 100)}
                    </Text>
                  )}

                  {stage.lead_count > 0 && (
                    <Text style={styles.detailText}>
                      Conversion Score: {formatPercentage((stage.avg_probability || 0) * 100)}
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Summary Footer */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          Total Pipeline: {data.reduce((sum, stage) => sum + stage.lead_count, 0)} leads
        </Text>
        <Text style={styles.summaryText}>
          Total Value: {formatCurrency(data.reduce((sum, stage) => sum + (stage.total_value || 0), 0))}
        </Text>
      </View>

      {/* Drill-down Modal */}
      {renderDrillDownModal()}
    </View>
  );

  function renderDrillDownModal() {
    if (!selectedStage || !modalVisible) return null;

    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

    return (
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: screenHeight * 0.8 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedStage.stage_name} Details
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.detailSummary}>
                <Text style={styles.detailSummaryText}>
                  {selectedStage.lead_count} leads • {formatCurrency(selectedStage.total_value)}
                </Text>
                {selectedStage.avg_probability > 0 && (
                  <Text style={styles.detailSummaryText}>
                    Avg Probability: {formatPercentage(selectedStage.avg_probability * 100)}
                  </Text>
                )}
                {selectedStage.details?.conversion_time && (
                  <Text style={styles.detailSummaryText}>
                    Avg Conversion Time: {Math.round(selectedStage.details.conversion_time)} days
                  </Text>
                )}
              </View>

              {selectedStage.details?.leads && selectedStage.details.leads.length > 0 && (
                <View style={styles.leadsSection}>
                  <Text style={styles.sectionTitle}>Top Leads in This Stage:</Text>
                  {selectedStage.details.leads.slice(0, 5).map((lead, index) => (
                    <View key={lead.id} style={styles.leadItem}>
                      <View style={styles.leadInfo}>
                        <Text style={styles.leadName}>{lead.name}</Text>
                        <Text style={styles.leadValue}>{formatCurrency(lead.value)}</Text>
                      </View>
                      <Text style={styles.leadProbability}>
                        {formatPercentage(lead.probability * 100)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {selectedStage.details?.drop_off_reasons && selectedStage.details.drop_off_reasons.length > 0 && (
                <View style={styles.dropOffSection}>
                  <Text style={styles.sectionTitle}>Common Drop-off Reasons:</Text>
                  {selectedStage.details.drop_off_reasons.map((reason, index) => (
                    <View key={index} style={styles.reasonItem}>
                      <Text style={styles.reasonText}>• {reason}</Text>
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
  noDataText: {
    ...MaterialTypography.bodyLarge,
    color: MaterialColors.neutral[500],
    textAlign: 'center',
    marginTop: MaterialSpacing.xl,
  },
  funnelContainer: {
    flex: 1,
  },
  funnelContent: {
    paddingVertical: MaterialSpacing.sm,
  },
  stageContainer: {
    marginBottom: MaterialSpacing.md,
    borderRadius: 8,
    backgroundColor: MaterialColors.neutral[50],
    padding: MaterialSpacing.md,
  },
  stageSelected: {
    backgroundColor: MaterialColors.primary[50],
    borderWidth: 2,
    borderColor: MaterialColors.primary[300],
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.sm,
  },
  stageInfo: {
    flex: 1,
  },
  stageName: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    fontWeight: '600',
  },
  stageCount: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
    marginTop: 2,
  },
  conversionInfo: {
    alignItems: 'flex-end',
  },
  conversionRate: {
    ...MaterialTypography.labelLarge,
    fontWeight: '700',
  },
  dropOffText: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
    marginTop: 2,
  },
  funnelBarContainer: {
    height: 24,
    backgroundColor: MaterialColors.neutral[200],
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: MaterialSpacing.sm,
  },
  funnelBar: {
    height: '100%',
    borderRadius: 12,
  },
  stageDetails: {
    marginTop: MaterialSpacing.md,
    paddingTop: MaterialSpacing.md,
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[200],
  },
  detailText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[700],
    marginBottom: MaterialSpacing.xs,
  },
  summaryContainer: {
    marginTop: MaterialSpacing.lg,
    paddingTop: MaterialSpacing.md,
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[200],
  },
  summaryText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
    textAlign: 'center',
    marginBottom: MaterialSpacing.xs,
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
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[700],
    marginBottom: MaterialSpacing.xs,
  },
  leadsSection: {
    marginBottom: MaterialSpacing.lg,
  },
  sectionTitle: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.md,
  },
  leadItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: MaterialSpacing.sm,
    backgroundColor: MaterialColors.neutral[50],
    borderRadius: 8,
    marginBottom: MaterialSpacing.sm,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[800],
  },
  leadValue: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  leadProbability: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.secondary[600],
    fontWeight: '600',
  },
  dropOffSection: {
    marginBottom: MaterialSpacing.lg,
  },
  reasonItem: {
    marginBottom: MaterialSpacing.sm,
  },
  reasonText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[700],
  },
});

export default ConversionFunnel;