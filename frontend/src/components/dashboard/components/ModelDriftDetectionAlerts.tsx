import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialColors, MaterialSpacing, MaterialTypography } from '../../../styles/MaterialDesign';
import { DriftDetection, ModelMetrics } from '../../../types/ml';

interface ModelDriftDetectionAlertsProps {
  driftDetection: DriftDetection;
  currentMetrics: ModelMetrics;
  baselineMetrics: ModelMetrics;
  onAcknowledgeDrift: (driftId: string) => void;
  onTriggerRetraining: () => void;
  onViewAffectedFeatures: (features: string[]) => void;
}

interface DriftMetricCardProps {
  label: string;
  current: number;
  baseline: number;
  threshold: number;
  unit: string;
  isDrifting: boolean;
}

const DriftMetricCard: React.FC<DriftMetricCardProps> = ({
  label,
  current,
  baseline,
  threshold,
  unit,
  isDrifting
}) => {
  const change = ((current - baseline) / baseline) * 100;
  const isSignificant = Math.abs(change) > threshold;

  return (
    <View style={[styles.metricCard, isDrifting && styles.metricCardDrifting]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricValues}>
        <Text style={styles.metricCurrent}>
          {current.toFixed(3)}{unit}
        </Text>
        <Text style={styles.metricBaseline}>
          Baseline: {baseline.toFixed(3)}{unit}
        </Text>
      </View>
      <View style={styles.metricChange}>
        <Text style={[
          styles.metricChangeText,
          isSignificant && styles.metricChangeSignificant
        ]}>
          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
        </Text>
        {isSignificant && (
          <Text style={styles.metricThreshold}>
            Threshold: ±{threshold.toFixed(1)}%
          </Text>
        )}
      </View>
    </View>
  );
};

interface DriftAlertCardProps {
  drift: DriftDetection;
  onAcknowledge: () => void;
  onRetraining: () => void;
  onViewFeatures: () => void;
}

const DriftAlertCard: React.FC<DriftAlertCardProps> = ({
  drift,
  onAcknowledge,
  onRetraining,
  onViewFeatures
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return MaterialColors.error[500];
      case 'high':
        return MaterialColors.error[600];
      case 'medium':
        return MaterialColors.primary[500];
      case 'low':
        return MaterialColors.primary[400];
      default:
        return MaterialColors.neutral[500];
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '🟡';
      case 'low':
        return 'ℹ️';
      default:
        return '📊';
    }
  };

  const handleAcknowledge = () => {
    Alert.alert(
      'Acknowledge Drift',
      'Are you sure you want to acknowledge this drift detection? This will mark it as reviewed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Acknowledge', onPress: onAcknowledge },
      ]
    );
  };

  const handleRetraining = () => {
    Alert.alert(
      'Trigger Retraining',
      'This will initiate model retraining with the latest data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Retraining', onPress: onRetraining },
      ]
    );
  };

  return (
    <View style={[styles.alertCard, { borderLeftColor: getSeverityColor(drift.severity) }]}>
      <View style={styles.alertHeader}>
        <View style={styles.alertTitleRow}>
          <Text style={styles.alertIcon}>{getSeverityIcon(drift.severity)}</Text>
          <Text style={[styles.alertTitle, { color: getSeverityColor(drift.severity) }]}>
            Model Drift Detected
          </Text>
        </View>
        <Text style={styles.alertSeverity}>
          {drift.severity.toUpperCase()} SEVERITY
        </Text>
      </View>

      <Text style={styles.alertMessage}>Model performance has deviated from expected baseline metrics.</Text>

      <View style={styles.driftMetrics}>
        <Text style={styles.metricsTitle}>Drift Metrics:</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricItemLabel}>Feature Drift:</Text>
            <Text style={styles.metricItemValue}>
              {(drift.metrics.featureDrift * 100).toFixed(1)}%
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricItemLabel}>Prediction Drift:</Text>
            <Text style={styles.metricItemValue}>
              {(drift.metrics.predictionDrift * 100).toFixed(1)}%
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricItemLabel}>Accuracy Drop:</Text>
            <Text style={styles.metricItemValue}>
              {(drift.metrics.accuracyDrop * 100).toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      {drift.affectedFeatures && drift.affectedFeatures.length > 0 && (
        <View style={styles.affectedFeatures}>
          <Text style={styles.featuresTitle}>Affected Features:</Text>
          <View style={styles.featuresList}>
            {drift.affectedFeatures.slice(0, 5).map((feature, index) => (
              <Text key={index} style={styles.featureTag}>
                {feature}
              </Text>
            ))}
            {drift.affectedFeatures.length > 5 && (
              <Text style={styles.moreFeatures}>
                +{drift.affectedFeatures.length - 5} more
              </Text>
            )}
          </View>
        </View>
      )}

      {drift.recommendations && drift.recommendations.length > 0 && (
        <View style={styles.recommendations}>
          <Text style={styles.recommendationsTitle}>Recommendations:</Text>
          {drift.recommendations.map((rec, index) => (
            <Text key={index} style={styles.recommendationText}>
              • {rec}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.alertActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.viewFeaturesButton]}
          onPress={onViewFeatures}
        >
          <Text style={styles.viewFeaturesButtonText}>View Features</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.acknowledgeButton]}
          onPress={handleAcknowledge}
        >
          <Text style={styles.acknowledgeButtonText}>Acknowledge</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.retrainingButton]}
          onPress={handleRetraining}
        >
          <Text style={styles.retrainingButtonText}>Retraining</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.alertTimestamp}>
        Detected: {new Date(drift.detectedAt).toLocaleString()}
      </Text>
    </View>
  );
};

interface DriftHistoryItemProps {
  drift: DriftDetection;
  onPress: () => void;
}

const DriftHistoryItem: React.FC<DriftHistoryItemProps> = ({ drift, onPress }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return MaterialColors.error[500];
      case 'high':
        return MaterialColors.error[600];
      case 'medium':
        return MaterialColors.primary[500];
      case 'low':
        return MaterialColors.primary[400];
      default:
        return MaterialColors.neutral[500];
    }
  };

  return (
    <TouchableOpacity style={styles.historyItem} onPress={onPress}>
      <View style={styles.historyHeader}>
        <Text style={[styles.historySeverity, { color: getSeverityColor(drift.severity) }]}>
          {drift.severity.toUpperCase()}
        </Text>
        <Text style={styles.historyDate}>
          {new Date(drift.detectedAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.historyAnalysis} numberOfLines={2}>
        Model performance has deviated from expected baseline metrics.
      </Text>
      <View style={styles.historyMetrics}>
        <Text style={styles.historyMetric}>
          Feature: {(drift.metrics.featureDrift * 100).toFixed(1)}%
        </Text>
        <Text style={styles.historyMetric}>
          Prediction: {(drift.metrics.predictionDrift * 100).toFixed(1)}%
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export const ModelDriftDetectionAlerts: React.FC<ModelDriftDetectionAlertsProps> = ({
  driftDetection,
  currentMetrics,
  baselineMetrics,
  onAcknowledgeDrift,
  onTriggerRetraining,
  onViewAffectedFeatures,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [driftHistory] = useState<DriftDetection[]>([
    // Mock history data - in real app this would come from props
    {
      ...driftDetection,
      detectedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      severity: 'medium' as const,
    },
    {
      ...driftDetection,
      detectedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      severity: 'low' as const,
    },
  ]);

  const driftMetrics = useMemo(() => {
    const featureDrift = Math.abs((currentMetrics.accuracy - baselineMetrics.accuracy) / baselineMetrics.accuracy);
    const predictionDrift = Math.abs((currentMetrics.precision - baselineMetrics.precision) / baselineMetrics.precision);
    const accuracyDrop = Math.max(0, baselineMetrics.accuracy - currentMetrics.accuracy);

    return {
      featureDrift,
      predictionDrift,
      accuracyDrop,
    };
  }, [currentMetrics, baselineMetrics]);

  const thresholds = {
    featureDrift: 0.05, // 5%
    predictionDrift: 0.10, // 10%
    accuracyDrop: 0.02, // 2%
  };

  const isDrifting = driftDetection.detected ||
    driftMetrics.featureDrift > thresholds.featureDrift ||
    driftMetrics.predictionDrift > thresholds.predictionDrift ||
    driftMetrics.accuracyDrop > thresholds.accuracyDrop;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Model Drift Detection</Text>
        <TouchableOpacity
          style={styles.historyToggle}
          onPress={() => setShowHistory(!showHistory)}
        >
          <Text style={styles.historyToggleText}>
            {showHistory ? 'Hide History' : 'Show History'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Current Drift Status */}
      <View style={styles.statusSection}>
        <View style={[styles.statusIndicator, isDrifting && styles.statusDrifting]}>
          <Text style={[styles.statusText, isDrifting && styles.statusTextDrifting]}>
            {isDrifting ? '🚨 DRIFT DETECTED' : '✅ MODEL STABLE'}
          </Text>
        </View>
      </View>

      {/* Drift Metrics Overview */}
      <View style={styles.metricsSection}>
        <Text style={styles.sectionTitle}>Drift Metrics</Text>
        <View style={styles.metricsGrid}>
          <DriftMetricCard
            label="Feature Drift"
            current={driftMetrics.featureDrift}
            baseline={0}
            threshold={thresholds.featureDrift}
            unit=""
            isDrifting={driftMetrics.featureDrift > thresholds.featureDrift}
          />
          <DriftMetricCard
            label="Prediction Drift"
            current={driftMetrics.predictionDrift}
            baseline={0}
            threshold={thresholds.predictionDrift}
            unit=""
            isDrifting={driftMetrics.predictionDrift > thresholds.predictionDrift}
          />
          <DriftMetricCard
            label="Accuracy Drop"
            current={driftMetrics.accuracyDrop}
            baseline={0}
            threshold={thresholds.accuracyDrop}
            unit=""
            isDrifting={driftMetrics.accuracyDrop > thresholds.accuracyDrop}
          />
        </View>
      </View>

      {/* Active Drift Alert */}
      {isDrifting && (
        <View style={styles.alertSection}>
          <Text style={styles.sectionTitle}>Active Alert</Text>
          <DriftAlertCard
            drift={driftDetection}
            onAcknowledge={() => onAcknowledgeDrift('current-model')}
            onRetraining={onTriggerRetraining}
            onViewFeatures={() => onViewAffectedFeatures(driftDetection.affectedFeatures || [])}
          />
        </View>
      )}

      {/* Drift History */}
      {showHistory && (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Drift History</Text>
          <ScrollView style={styles.historyList}>
            {driftHistory.map((drift, index) => (
              <DriftHistoryItem
                key={index}
                drift={drift}
                onPress={() => {
                  // Handle history item press
                  console.log('History item pressed:', drift);
                }}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Thresholds Information */}
      <View style={styles.thresholdsSection}>
        <Text style={styles.sectionTitle}>Detection Thresholds</Text>
        <View style={styles.thresholdsList}>
          <View style={styles.thresholdItem}>
            <Text style={styles.thresholdLabel}>Feature Drift:</Text>
            <Text style={styles.thresholdValue}>{(thresholds.featureDrift * 100).toFixed(1)}%</Text>
          </View>
          <View style={styles.thresholdItem}>
            <Text style={styles.thresholdLabel}>Prediction Drift:</Text>
            <Text style={styles.thresholdValue}>{(thresholds.predictionDrift * 100).toFixed(1)}%</Text>
          </View>
          <View style={styles.thresholdItem}>
            <Text style={styles.thresholdLabel}>Accuracy Drop:</Text>
            <Text style={styles.thresholdValue}>{(thresholds.accuracyDrop * 100).toFixed(1)}%</Text>
          </View>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: MaterialSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: MaterialColors.neutral[200],
  },
  title: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[900],
  },
  historyToggle: {
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    backgroundColor: MaterialColors.primary[500],
    borderRadius: 8,
  },
  historyToggleText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.onPrimary,
  },
  statusSection: {
    padding: MaterialSpacing.lg,
  },
  statusIndicator: {
    padding: MaterialSpacing.md,
    backgroundColor: MaterialColors.secondary[100],
    borderRadius: 12,
    alignItems: 'center',
  },
  statusDrifting: {
    backgroundColor: MaterialColors.error[100],
  },
  statusText: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.secondary[700],
    fontWeight: '600',
  },
  statusTextDrifting: {
    color: MaterialColors.error[700],
  },
  metricsSection: {
    padding: MaterialSpacing.lg,
  },
  sectionTitle: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.md,
  },
  metricsGrid: {
    gap: MaterialSpacing.md,
  },
  metricCard: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.md,
    elevation: 2,
  },
  metricCardDrifting: {
    borderLeftWidth: 4,
    borderLeftColor: MaterialColors.error[500],
  },
  metricLabel: {
    ...MaterialTypography.titleSmall,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.sm,
  },
  metricValues: {
    marginBottom: MaterialSpacing.sm,
  },
  metricCurrent: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[900],
    fontWeight: '600',
  },
  metricBaseline: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  metricChange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricChangeText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[700],
    fontWeight: '600',
  },
  metricChangeSignificant: {
    color: MaterialColors.error[600],
  },
  metricThreshold: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
  },
  alertSection: {
    padding: MaterialSpacing.lg,
  },
  alertCard: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.lg,
    borderLeftWidth: 4,
    elevation: 3,
  },
  alertHeader: {
    marginBottom: MaterialSpacing.md,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: MaterialSpacing.xs,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: MaterialSpacing.sm,
  },
  alertTitle: {
    ...MaterialTypography.headlineSmall,
    fontWeight: '600',
  },
  alertSeverity: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[600],
    fontWeight: '600',
  },
  alertMessage: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[800],
    marginBottom: MaterialSpacing.md,
  },
  driftMetrics: {
    marginBottom: MaterialSpacing.md,
  },
  metricsTitle: {
    ...MaterialTypography.titleSmall,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MaterialSpacing.sm,
  },
  metricItem: {
    flex: 1,
    minWidth: 80,
  },
  metricItemLabel: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  metricItemValue: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[900],
    fontWeight: '600',
  },
  metricsGridAlt: {
    gap: MaterialSpacing.sm,
  },
  affectedFeatures: {
    marginBottom: MaterialSpacing.md,
  },
  featuresTitle: {
    ...MaterialTypography.titleSmall,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.sm,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MaterialSpacing.sm,
  },
  featureTag: {
    ...MaterialTypography.labelSmall,
    backgroundColor: MaterialColors.primary[100],
    color: MaterialColors.primary[700],
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
    borderRadius: 6,
  },
  moreFeatures: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[500],
  },
  recommendations: {
    marginBottom: MaterialSpacing.md,
  },
  recommendationsTitle: {
    ...MaterialTypography.titleSmall,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.sm,
  },
  recommendationText: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[700],
    marginBottom: MaterialSpacing.xs,
  },
  alertActions: {
    flexDirection: 'row',
    gap: MaterialSpacing.sm,
    marginBottom: MaterialSpacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewFeaturesButton: {
    backgroundColor: MaterialColors.primary[100],
  },
  viewFeaturesButtonText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.primary[700],
  },
  acknowledgeButton: {
    backgroundColor: MaterialColors.secondary[100],
  },
  acknowledgeButtonText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.secondary[700],
  },
  retrainingButton: {
    backgroundColor: MaterialColors.error[100],
  },
  retrainingButtonText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.error[700],
  },
  alertTimestamp: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
  },
  historySection: {
    padding: MaterialSpacing.lg,
  },
  historyList: {
    maxHeight: 300,
  },
  historyItem: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 8,
    padding: MaterialSpacing.md,
    marginBottom: MaterialSpacing.sm,
    elevation: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.sm,
  },
  historySeverity: {
    ...MaterialTypography.labelMedium,
    fontWeight: '600',
  },
  historyDate: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
  },
  historyAnalysis: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[800],
    marginBottom: MaterialSpacing.sm,
  },
  historyMetrics: {
    flexDirection: 'row',
    gap: MaterialSpacing.md,
  },
  historyMetric: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  thresholdsSection: {
    padding: MaterialSpacing.lg,
    backgroundColor: MaterialColors.surface,
    margin: MaterialSpacing.md,
    borderRadius: 12,
    elevation: 2,
  },
  thresholdsList: {
    gap: MaterialSpacing.sm,
  },
  thresholdItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  thresholdLabel: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[700],
  },
  thresholdValue: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[900],
    fontWeight: '600',
  },
});

export default ModelDriftDetectionAlerts;