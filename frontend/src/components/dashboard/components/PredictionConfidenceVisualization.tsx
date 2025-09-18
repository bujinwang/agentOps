import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialColors, MaterialSpacing, MaterialTypography } from '../../../styles/MaterialDesign';
import { MLLeadScore } from '../../../types/ml';

const { width: screenWidth } = Dimensions.get('window');

interface PredictionConfidenceVisualizationProps {
  predictions: MLLeadScore[];
  confidenceThreshold: number;
  onThresholdChange: (threshold: number) => void;
  onPredictionSelect: (prediction: MLLeadScore) => void;
}

interface ConfidenceRange {
  label: string;
  min: number;
  max: number;
  color: string;
  count: number;
  percentage: number;
}

interface ConfidenceBarProps {
  range: ConfidenceRange;
  totalPredictions: number;
  onPress: () => void;
}

const ConfidenceBar: React.FC<ConfidenceBarProps> = ({ range, totalPredictions, onPress }) => {
  const barWidth = (range.count / totalPredictions) * (screenWidth - 80);

  return (
    <TouchableOpacity style={styles.confidenceBarContainer} onPress={onPress}>
      <View style={styles.confidenceBarHeader}>
        <Text style={styles.confidenceRangeLabel}>
          {range.label} ({range.min * 100}% - {range.max * 100}%)
        </Text>
        <Text style={styles.confidenceCount}>
          {range.count} ({range.percentage.toFixed(1)}%)
        </Text>
      </View>
      <View style={styles.confidenceBar}>
        <View
          style={[
            styles.confidenceBarFill,
            {
              width: barWidth,
              backgroundColor: range.color,
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
};

interface ConfidenceGaugeProps {
  confidence: number;
  size?: number;
}

const ConfidenceGauge: React.FC<ConfidenceGaugeProps> = ({ confidence, size = 80 }) => {
  const radius = size / 2;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * (radius - strokeWidth / 2);
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (confidence * circumference);

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return MaterialColors.secondary[600];
    if (conf >= 0.6) return MaterialColors.primary[500];
    if (conf >= 0.4) return MaterialColors.primary[400];
    return MaterialColors.error[500];
  };

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 0.8) return 'High';
    if (conf >= 0.6) return 'Medium';
    if (conf >= 0.4) return 'Low';
    return 'Very Low';
  };

  return (
    <View style={[styles.gaugeContainer, { width: size, height: size }]}>
      <View style={styles.gaugeBackground}>
        <View
          style={[
            styles.gaugeCircle,
            {
              width: size - strokeWidth,
              height: size - strokeWidth,
              borderRadius: (size - strokeWidth) / 2,
              borderWidth: strokeWidth / 2,
              borderColor: MaterialColors.neutral[200],
            },
          ]}
        />
      </View>
      <View style={styles.gaugeForeground}>
        <View
          style={[
            styles.gaugeProgress,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: getConfidenceColor(confidence),
              borderTopColor: 'transparent',
              borderRightColor: 'transparent',
              transform: [{ rotate: `${confidence * 360 - 90}deg` }],
            },
          ]}
        />
      </View>
      <View style={styles.gaugeCenter}>
        <Text style={[styles.gaugeValue, { fontSize: size * 0.2 }]}>
          {(confidence * 100).toFixed(0)}%
        </Text>
        <Text style={[styles.gaugeLabel, { fontSize: size * 0.12 }]}>
          {getConfidenceLabel(confidence)}
        </Text>
      </View>
    </View>
  );
};

interface PredictionCardProps {
  prediction: MLLeadScore;
  onPress: () => void;
}

const PredictionCard: React.FC<PredictionCardProps> = ({ prediction, onPress }) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return MaterialColors.secondary[600];
    if (confidence >= 0.6) return MaterialColors.primary[500];
    if (confidence >= 0.4) return MaterialColors.primary[400];
    return MaterialColors.error[500];
  };

  const getPredictionIcon = (prediction: string) => {
    return prediction === 'high_value' ? '⭐' : '⚪';
  };

  return (
    <TouchableOpacity style={styles.predictionCard} onPress={onPress}>
      <View style={styles.predictionHeader}>
        <Text style={styles.predictionLeadId}>Lead #{prediction.leadId}</Text>
        <Text style={styles.predictionIcon}>
          {getPredictionIcon(prediction.prediction)}
        </Text>
      </View>
      <View style={styles.predictionContent}>
        <View style={styles.predictionScore}>
          <Text style={styles.scoreLabel}>Score:</Text>
          <Text style={[styles.scoreValue, { color: getConfidenceColor(prediction.confidence) }]}>
            {(prediction.score * 100).toFixed(1)}%
          </Text>
        </View>
        <ConfidenceGauge confidence={prediction.confidence} size={60} />
      </View>
      <View style={styles.predictionFooter}>
        <Text style={styles.predictionDate}>
          {new Date(prediction.scoredAt).toLocaleDateString()}
        </Text>
        <Text style={styles.predictionModel}>
          {prediction.modelVersion}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export const PredictionConfidenceVisualization: React.FC<PredictionConfidenceVisualizationProps> = ({
  predictions,
  confidenceThreshold,
  onThresholdChange,
  onPredictionSelect,
}) => {
  const [selectedRange, setSelectedRange] = useState<string | null>(null);

  const confidenceRanges = useMemo((): ConfidenceRange[] => {
    const ranges = [
      { label: 'Very High', min: 0.8, max: 1.0, color: MaterialColors.secondary[600] },
      { label: 'High', min: 0.6, max: 0.8, color: MaterialColors.primary[500] },
      { label: 'Medium', min: 0.4, max: 0.6, color: MaterialColors.primary[400] },
      { label: 'Low', min: 0.2, max: 0.4, color: MaterialColors.primary[300] },
      { label: 'Very Low', min: 0.0, max: 0.2, color: MaterialColors.error[500] },
    ];

    return ranges.map(range => {
      const count = predictions.filter(p =>
        p.confidence >= range.min && p.confidence < range.max
      ).length;
      const percentage = predictions.length > 0 ? (count / predictions.length) * 100 : 0;

      return { ...range, count, percentage };
    });
  }, [predictions]);

  const filteredPredictions = useMemo(() => {
    if (!selectedRange) return predictions;

    const range = confidenceRanges.find(r => r.label === selectedRange);
    if (!range) return predictions;

    return predictions.filter(p =>
      p.confidence >= range.min && p.confidence < range.max
    );
  }, [predictions, selectedRange, confidenceRanges]);

  const thresholdOptions = [0.2, 0.4, 0.6, 0.8];

  const stats = useMemo(() => {
    const total = predictions.length;
    const highConfidence = predictions.filter(p => p.confidence >= confidenceThreshold).length;
    const lowConfidence = total - highConfidence;
    const averageConfidence = total > 0
      ? predictions.reduce((sum, p) => sum + p.confidence, 0) / total
      : 0;

    return {
      total,
      highConfidence,
      lowConfidence,
      averageConfidence,
      highConfidencePercentage: total > 0 ? (highConfidence / total) * 100 : 0,
    };
  }, [predictions, confidenceThreshold]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Prediction Confidence Analysis</Text>
        <Text style={styles.subtitle}>
          {stats.total} predictions • Avg: {(stats.averageConfidence * 100).toFixed(1)}%
        </Text>
      </View>

      {/* Confidence Threshold Controls */}
      <View style={styles.thresholdSection}>
        <Text style={styles.sectionTitle}>Confidence Threshold</Text>
        <View style={styles.thresholdButtons}>
          {thresholdOptions.map(threshold => (
            <TouchableOpacity
              key={threshold}
              style={[
                styles.thresholdButton,
                confidenceThreshold === threshold && styles.thresholdButtonActive,
              ]}
              onPress={() => onThresholdChange(threshold)}
            >
              <Text style={[
                styles.thresholdButtonText,
                confidenceThreshold === threshold && styles.thresholdButtonTextActive,
              ]}>
                {(threshold * 100).toFixed(0)}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.thresholdStats}>
          {stats.highConfidence} high confidence • {stats.lowConfidence} low confidence
        </Text>
      </View>

      {/* Confidence Distribution */}
      <View style={styles.distributionSection}>
        <Text style={styles.sectionTitle}>Confidence Distribution</Text>
        <View style={styles.confidenceBars}>
          {confidenceRanges.map(range => (
            <ConfidenceBar
              key={range.label}
              range={range}
              totalPredictions={predictions.length}
              onPress={() => setSelectedRange(
                selectedRange === range.label ? null : range.label
              )}
            />
          ))}
        </View>
        {selectedRange && (
          <Text style={styles.filterText}>
            Filtered to: {selectedRange} confidence ({filteredPredictions.length} predictions)
          </Text>
        )}
      </View>

      {/* Predictions List */}
      <View style={styles.predictionsSection}>
        <Text style={styles.sectionTitle}>
          Predictions {selectedRange ? `(${selectedRange})` : ''}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.predictionsList}>
          {filteredPredictions.slice(0, 20).map(prediction => (
            <PredictionCard
              key={prediction.leadId}
              prediction={prediction}
              onPress={() => onPredictionSelect(prediction)}
            />
          ))}
        </ScrollView>
        {filteredPredictions.length > 20 && (
          <Text style={styles.moreText}>
            +{filteredPredictions.length - 20} more predictions
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MaterialColors.neutral[50],
  },
  header: {
    padding: MaterialSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: MaterialColors.neutral[200],
  },
  title: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.xs,
  },
  subtitle: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
  },
  thresholdSection: {
    padding: MaterialSpacing.lg,
    backgroundColor: MaterialColors.surface,
    margin: MaterialSpacing.md,
    borderRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.md,
  },
  thresholdButtons: {
    flexDirection: 'row',
    gap: MaterialSpacing.sm,
    marginBottom: MaterialSpacing.sm,
  },
  thresholdButton: {
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: 8,
    backgroundColor: MaterialColors.neutral[100],
    borderWidth: 1,
    borderColor: MaterialColors.neutral[200],
  },
  thresholdButtonActive: {
    backgroundColor: MaterialColors.primary[500],
    borderColor: MaterialColors.primary[500],
  },
  thresholdButtonText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.neutral[700],
  },
  thresholdButtonTextActive: {
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  thresholdStats: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  distributionSection: {
    padding: MaterialSpacing.lg,
    backgroundColor: MaterialColors.surface,
    margin: MaterialSpacing.md,
    borderRadius: 12,
    elevation: 2,
  },
  confidenceBars: {
    gap: MaterialSpacing.md,
  },
  confidenceBarContainer: {
    marginBottom: MaterialSpacing.sm,
  },
  confidenceBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.xs,
  },
  confidenceRangeLabel: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[900],
    fontWeight: '600',
  },
  confidenceCount: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  confidenceBar: {
    height: 24,
    backgroundColor: MaterialColors.neutral[100],
    borderRadius: 12,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 12,
  },
  filterText: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.primary[600],
    marginTop: MaterialSpacing.sm,
    fontStyle: 'italic',
  },
  predictionsSection: {
    padding: MaterialSpacing.lg,
  },
  predictionsList: {
    marginBottom: MaterialSpacing.md,
  },
  predictionCard: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.md,
    marginRight: MaterialSpacing.md,
    minWidth: 200,
    elevation: 2,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.sm,
  },
  predictionLeadId: {
    ...MaterialTypography.titleSmall,
    color: MaterialColors.neutral[900],
  },
  predictionIcon: {
    fontSize: 20,
  },
  predictionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.sm,
  },
  predictionScore: {
    flex: 1,
  },
  scoreLabel: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  scoreValue: {
    ...MaterialTypography.titleMedium,
    fontWeight: '600',
  },
  predictionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  predictionDate: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
  },
  predictionModel: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
    backgroundColor: MaterialColors.neutral[100],
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
    borderRadius: 6,
  },
  moreText: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
    textAlign: 'center',
    marginTop: MaterialSpacing.sm,
  },
  gaugeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeBackground: {
    position: 'absolute',
  },
  gaugeCircle: {
    borderStyle: 'solid',
  },
  gaugeForeground: {
    position: 'absolute',
  },
  gaugeProgress: {
    borderStyle: 'solid',
  },
  gaugeCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeValue: {
    ...MaterialTypography.titleMedium,
    fontWeight: 'bold',
    color: MaterialColors.neutral[900],
  },
  gaugeLabel: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
    marginTop: 2,
  },
});

export default PredictionConfidenceVisualization;