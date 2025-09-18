import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { MaterialColors, MaterialSpacing, MaterialTypography } from '../../../styles/MaterialDesign';
import { ModelMetrics, ModelVersion, DriftDetection, ModelHealth } from '../../../types/ml';

const { width: screenWidth } = Dimensions.get('window');

interface ModelAccuracyTrackingDashboardProps {
  modelVersions: ModelVersion[];
  currentMetrics: ModelMetrics;
  driftDetection: DriftDetection;
  modelHealth: ModelHealth;
  onRefresh: () => void;
  onModelSelect: (modelId: string) => void;
}

interface MetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  format: 'percentage' | 'number' | 'decimal';
  status: 'good' | 'warning' | 'critical';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  previousValue,
  format,
  status
}) => {
  const formatValue = (val: number) => {
    switch (format) {
      case 'percentage':
        return `${(val * 100).toFixed(1)}%`;
      case 'decimal':
        return val.toFixed(3);
      default:
        return val.toFixed(2);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return MaterialColors.secondary[600];
      case 'warning':
        return MaterialColors.primary[500];
      case 'critical':
        return MaterialColors.error[500];
      default:
        return MaterialColors.primary[500];
    }
  };

  const change = previousValue ? ((value - previousValue) / previousValue) * 100 : 0;
  const changeText = change !== 0 ? `${change > 0 ? '+' : ''}${change.toFixed(1)}%` : '';

  return (
    <View style={[styles.metricCard, { borderLeftColor: getStatusColor() }]}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={[styles.metricValue, { color: getStatusColor() }]}>
        {formatValue(value)}
      </Text>
      {changeText !== '' && (
        <Text style={[styles.metricChange, {
          color: change >= 0 ? MaterialColors.secondary[600] : MaterialColors.error[500]
        }]}>
          {changeText}
        </Text>
      )}
    </View>
  );
};

interface ModelVersionRowProps {
  version: ModelVersion;
  isSelected: boolean;
  onSelect: () => void;
}

const ModelVersionRow: React.FC<ModelVersionRowProps> = ({
  version,
  isSelected,
  onSelect
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return MaterialDesign.colors.success;
      case 'training':
        return MaterialDesign.colors.warning;
      case 'deprecated':
        return MaterialDesign.colors.error;
      default:
        return MaterialDesign.colors.textSecondary;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.versionRow, isSelected && styles.selectedVersionRow]}
      onPress={onSelect}
    >
      <View style={styles.versionHeader}>
        <Text style={styles.versionId}>{version.version}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(version.status) }]}>
          <Text style={styles.statusText}>{version.status.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.versionMetrics}>
        <Text style={styles.metricText}>Accuracy: {(version.performance.accuracy * 100).toFixed(1)}%</Text>
        <Text style={styles.metricText}>Precision: {(version.performance.precision * 100).toFixed(1)}%</Text>
        <Text style={styles.metricText}>Recall: {(version.performance.recall * 100).toFixed(1)}%</Text>
        <Text style={styles.metricText}>F1-Score: {version.performance.f1Score.toFixed(3)}</Text>
      </View>
      <Text style={styles.versionDate}>
        Created: {new Date(version.createdAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );
};

interface DriftAlertProps {
  drift: DriftDetection;
}

const DriftAlert: React.FC<DriftAlertProps> = ({ drift }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return MaterialColors.error[500];
      case 'high':
        return MaterialColors.error[500];
      case 'medium':
        return MaterialColors.primary[500];
      case 'low':
        return MaterialColors.secondary[500];
      default:
        return MaterialColors.neutral[600];
    }
  };

  if (!drift.detected) {
    return (
      <View style={[styles.alertCard, { borderLeftColor: MaterialColors.secondary[600] }]}>
        <Text style={styles.alertTitle}>✅ Model Stable</Text>
        <Text style={styles.alertMessage}>No significant drift detected</Text>
      </View>
    );
  }

  return (
    <View style={[styles.alertCard, { borderLeftColor: getSeverityColor(drift.severity) }]}>
      <Text style={[styles.alertTitle, { color: getSeverityColor(drift.severity) }]}>
        ⚠️ Model Drift Detected
      </Text>
      <Text style={styles.alertMessage}>
        Severity: {drift.severity.toUpperCase()}
      </Text>
      <Text style={styles.alertDetails}>
        Feature Drift: {(drift.metrics.featureDrift * 100).toFixed(1)}%
      </Text>
      <Text style={styles.alertDetails}>
        Prediction Drift: {(drift.metrics.predictionDrift * 100).toFixed(1)}%
      </Text>
      <Text style={styles.alertDetails}>
        Accuracy Drop: {(drift.metrics.accuracyDrop * 100).toFixed(1)}%
      </Text>
      {drift.recommendations && drift.recommendations.length > 0 && (
        <View style={styles.recommendations}>
          <Text style={styles.recommendationsTitle}>Recommendations:</Text>
          {drift.recommendations.map((rec, index) => (
            <Text key={index} style={styles.recommendationText}>• {rec}</Text>
          ))}
        </View>
      )}
    </View>
  );
};

interface HealthStatusProps {
  health: ModelHealth;
}

const HealthStatus: React.FC<HealthStatusProps> = ({ health }) => {
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return MaterialColors.secondary[600];
      case 'warning':
        return MaterialColors.primary[500];
      case 'critical':
        return MaterialColors.error[500];
      default:
        return MaterialColors.neutral[600];
    }
  };

  const getCheckIcon = (status: string) => {
    return status === 'pass' ? '✅' : '❌';
  };

  return (
    <View style={styles.healthContainer}>
      <View style={[styles.healthHeader, { borderLeftColor: getHealthColor(health.status) }]}>
        <Text style={[styles.healthTitle, { color: getHealthColor(health.status) }]}>
          {health.status === 'healthy' ? '🟢' : health.status === 'warning' ? '🟡' : '🔴'} Model Health: {health.status.toUpperCase()}
        </Text>
        <Text style={styles.healthLastChecked}>
          Last checked: {new Date(health.lastChecked).toLocaleString()}
        </Text>
      </View>

      <View style={styles.healthChecks}>
        <View style={styles.checkRow}>
          <Text style={styles.checkLabel}>Accuracy:</Text>
          <Text style={styles.checkValue}>
            {getCheckIcon(health.checks.accuracy.status)} {(health.checks.accuracy.current * 100).toFixed(1)}%
          </Text>
        </View>
        <View style={styles.checkRow}>
          <Text style={styles.checkLabel}>Drift:</Text>
          <Text style={styles.checkValue}>
            {getCheckIcon(health.checks.drift.status)} {health.checks.drift.severity}
          </Text>
        </View>
        <View style={styles.checkRow}>
          <Text style={styles.checkLabel}>Performance:</Text>
          <Text style={styles.checkValue}>
            {getCheckIcon(health.checks.performance.status)} {health.checks.performance.latency}ms
          </Text>
        </View>
        <View style={styles.checkRow}>
          <Text style={styles.checkLabel}>Data Quality:</Text>
          <Text style={styles.checkValue}>
            {getCheckIcon(health.checks.dataQuality.status)} {(health.checks.dataQuality.completeness * 100).toFixed(1)}%
          </Text>
        </View>
      </View>
    </View>
  );
};

export const ModelAccuracyTrackingDashboard: React.FC<ModelAccuracyTrackingDashboardProps> = ({
  modelVersions,
  currentMetrics,
  driftDetection,
  modelHealth,
  onRefresh,
  onModelSelect
}) => {
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  const selectedModel = useMemo(() => {
    return modelVersions.find(v => v.id === selectedModelId) || modelVersions[0];
  }, [modelVersions, selectedModelId]);

  const previousMetrics = useMemo(() => {
    if (!selectedModel) return null;
    const sortedVersions = [...modelVersions].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const currentIndex = sortedVersions.findIndex(v => v.id === selectedModel.id);
    return currentIndex > 0 ? sortedVersions[currentIndex - 1].metrics : null;
  }, [modelVersions, selectedModel]);

  const getMetricStatus = (current: number, previous?: number): 'good' | 'warning' | 'critical' => {
    if (!previous) return 'good';
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 2) return 'good';
    if (Math.abs(change) < 5) return 'warning';
    return 'critical';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Model Performance Dashboard</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Current Metrics Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Model Performance</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Accuracy"
            value={currentMetrics.accuracy}
            previousValue={previousMetrics?.accuracy}
            format="percentage"
            status={getMetricStatus(currentMetrics.accuracy, previousMetrics?.accuracy)}
          />
          <MetricCard
            title="Precision"
            value={currentMetrics.precision}
            previousValue={previousMetrics?.precision}
            format="percentage"
            status={getMetricStatus(currentMetrics.precision, previousMetrics?.precision)}
          />
          <MetricCard
            title="Recall"
            value={currentMetrics.recall}
            previousValue={previousMetrics?.recall}
            format="percentage"
            status={getMetricStatus(currentMetrics.recall, previousMetrics?.recall)}
          />
          <MetricCard
            title="F1-Score"
            value={currentMetrics.f1Score}
            previousValue={previousMetrics?.f1Score}
            format="decimal"
            status={getMetricStatus(currentMetrics.f1Score, previousMetrics?.f1Score)}
          />
        </View>
      </View>

      {/* Model Health Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Model Health Status</Text>
        <HealthStatus health={modelHealth} />
      </View>

      {/* Drift Detection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Drift Detection</Text>
        <DriftAlert drift={driftDetection} />
      </View>

      {/* Model Versions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Model Versions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.versionsContainer}>
          {modelVersions.map((version) => (
            <ModelVersionRow
              key={version.id}
              version={version}
              isSelected={version.id === selectedModelId}
              onSelect={() => {
                setSelectedModelId(version.id);
                onModelSelect(version.id);
              }}
            />
          ))}
        </ScrollView>
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        <Text style={styles.timeRangeLabel}>Time Range:</Text>
        <View style={styles.timeRangeButtons}>
          {(['1h', '24h', '7d', '30d'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.timeRangeButton, timeRange === range && styles.selectedTimeRangeButton]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[styles.timeRangeButtonText, timeRange === range && styles.selectedTimeRangeButtonText]}>
                {range}
              </Text>
            </TouchableOpacity>
          ))}
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
    fontSize: MaterialTypography.headlineSmall.fontSize,
    fontWeight: 'bold',
    color: MaterialColors.neutral[900],
  },
  refreshButton: {
    backgroundColor: MaterialColors.primary[500],
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  section: {
    padding: MaterialSpacing.lg,
  },
  sectionTitle: {
    fontSize: MaterialTypography.titleMedium.fontSize,
    fontWeight: '600',
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MaterialSpacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: (screenWidth - MaterialSpacing.lg * 2 - MaterialSpacing.md) / 2,
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.md,
    borderLeftWidth: 4,
    shadowColor: MaterialColors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricTitle: {
    fontSize: MaterialTypography.bodyMedium.fontSize,
    color: MaterialColors.neutral[600],
    marginBottom: MaterialSpacing.xs,
  },
  metricValue: {
    fontSize: MaterialTypography.headlineSmall.fontSize,
    fontWeight: 'bold',
    marginBottom: MaterialSpacing.xs,
  },
  metricChange: {
    fontSize: MaterialTypography.labelSmall.fontSize,
    fontWeight: '600',
  },
  healthContainer: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.md,
    shadowColor: MaterialColors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  healthHeader: {
    borderLeftWidth: 4,
    paddingLeft: MaterialSpacing.md,
    marginBottom: MaterialSpacing.md,
  },
  healthTitle: {
    fontSize: MaterialTypography.titleSmall.fontSize,
    fontWeight: '600',
    marginBottom: MaterialSpacing.xs,
  },
  healthLastChecked: {
    fontSize: MaterialTypography.labelSmall.fontSize,
    color: MaterialColors.neutral[600],
  },
  healthChecks: {
    gap: MaterialSpacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkLabel: {
    fontSize: MaterialTypography.bodyMedium.fontSize,
    color: MaterialColors.neutral[600],
  },
  checkValue: {
    fontSize: MaterialTypography.bodyMedium.fontSize,
    fontWeight: '600',
    color: MaterialColors.neutral[900],
  },
  alertCard: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.md,
    borderLeftWidth: 4,
    shadowColor: MaterialColors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertTitle: {
    fontSize: MaterialTypography.titleSmall.fontSize,
    fontWeight: '600',
    marginBottom: MaterialSpacing.xs,
  },
  alertMessage: {
    fontSize: MaterialTypography.bodyMedium.fontSize,
    color: MaterialColors.neutral[600],
    marginBottom: MaterialSpacing.sm,
  },
  alertDetails: {
    fontSize: MaterialTypography.bodyMedium.fontSize,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.xs,
  },
  recommendations: {
    marginTop: MaterialSpacing.sm,
  },
  recommendationsTitle: {
    fontSize: MaterialTypography.bodyMedium.fontSize,
    fontWeight: '600',
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.xs,
  },
  recommendationText: {
    fontSize: MaterialTypography.labelSmall.fontSize,
    color: MaterialColors.neutral[600],
    marginBottom: MaterialSpacing.xs,
  },
  versionsContainer: {
    maxHeight: 300,
  },
  versionRow: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.md,
    marginRight: MaterialSpacing.md,
    minWidth: 280,
    shadowColor: MaterialColors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedVersionRow: {
    borderColor: MaterialColors.primary[500],
    borderWidth: 2,
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.sm,
  },
  versionId: {
    fontSize: MaterialTypography.titleSmall.fontSize,
    fontWeight: '600',
    color: MaterialColors.neutral[900],
  },
  statusBadge: {
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
    borderRadius: 6,
  },
  statusText: {
    fontSize: MaterialTypography.labelSmall.fontSize,
    fontWeight: '600',
    color: MaterialColors.onPrimary,
  },
  versionMetrics: {
    marginBottom: MaterialSpacing.sm,
  },
  metricText: {
    fontSize: MaterialTypography.labelSmall.fontSize,
    color: MaterialColors.neutral[600],
    marginBottom: MaterialSpacing.xs,
  },
  versionDate: {
    fontSize: MaterialTypography.labelSmall.fontSize,
    color: MaterialColors.neutral[500],
  },
  timeRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: MaterialSpacing.lg,
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[200],
  },
  timeRangeLabel: {
    fontSize: MaterialTypography.bodyMedium.fontSize,
    color: MaterialColors.neutral[600],
    marginRight: MaterialSpacing.md,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    gap: MaterialSpacing.sm,
  },
  timeRangeButton: {
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: 8,
    backgroundColor: MaterialColors.surface,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[200],
  },
  selectedTimeRangeButton: {
    backgroundColor: MaterialColors.primary[500],
    borderColor: MaterialColors.primary[500],
  },
  timeRangeButtonText: {
    fontSize: MaterialTypography.bodyMedium.fontSize,
    color: MaterialColors.neutral[600],
  },
  selectedTimeRangeButtonText: {
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
});

export default ModelAccuracyTrackingDashboard;