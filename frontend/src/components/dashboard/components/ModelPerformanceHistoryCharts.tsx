import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialColors, MaterialSpacing, MaterialTypography } from '../../../styles/MaterialDesign';
import { ModelMetrics, ModelVersion } from '../../../types/ml';

const { width: screenWidth } = Dimensions.get('window');

interface ModelPerformanceHistoryChartsProps {
  modelVersions: ModelVersion[];
  selectedMetrics: string[];
  onMetricToggle: (metric: string) => void;
  onVersionSelect: (version: ModelVersion) => void;
}

interface MetricLineProps {
  versions: ModelVersion[];
  metric: keyof ModelMetrics;
  color: string;
  label: string;
}

const MetricLine: React.FC<MetricLineProps> = ({ versions, metric, color, label }) => {
  const numericValues = versions.map(v => {
    const val = v.metrics[metric];
    return typeof val === 'number' ? val : 0;
  });

  const maxValue = Math.max(...numericValues);
  const minValue = Math.min(...numericValues);
  const range = maxValue - minValue || 1;

  return (
    <View style={styles.metricLine}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.lineContainer}>
        {versions.map((version, index) => {
          const rawValue = version.metrics[metric];
          const value = typeof rawValue === 'number' ? rawValue : 0;
          const normalizedValue = (value - minValue) / range;
          const x = (index / (versions.length - 1)) * (screenWidth - 120);
          const y = (1 - normalizedValue) * 80;

          return (
            <View key={version.id}>
              {/* Line to next point */}
              {index < versions.length - 1 && (
                <View
                  style={[
                    styles.lineSegment,
                    {
                      left: x,
                      top: y,
                      width: (screenWidth - 120) / (versions.length - 1),
                      height: 2,
                      backgroundColor: color,
                    }
                  ]}
                />
              )}
              {/* Data point */}
              <TouchableOpacity
                style={[
                  styles.dataPoint,
                  { left: x - 4, top: y - 4, backgroundColor: color }
                ]}
                onPress={() => console.log(`${label}: ${value.toFixed(3)}`)}
              >
                <Text style={styles.dataPointValue}>
                  {value.toFixed(2)}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
      <View style={styles.versionLabels}>
        {versions.map((version, index) => (
          <Text key={version.id} style={styles.versionLabel}>
            v{version.version}
          </Text>
        ))}
      </View>
    </View>
  );
};

interface PerformanceCardProps {
  version: ModelVersion;
  isSelected: boolean;
  onPress: () => void;
}

const PerformanceCard: React.FC<PerformanceCardProps> = ({ version, isSelected, onPress }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return MaterialColors.secondary[600];
      case 'deprecated':
        return MaterialColors.primary[500];
      case 'archived':
        return MaterialColors.neutral[500];
      default:
        return MaterialColors.primary[400];
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <TouchableOpacity
      style={[styles.performanceCard, isSelected && styles.performanceCardSelected]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.versionNumber}>v{version.version}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(version.status) }]}>
          <Text style={styles.statusText}>{version.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricName}>Accuracy</Text>
          <Text style={styles.metricValue}>{(version.performance.accuracy * 100).toFixed(1)}%</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricName}>Precision</Text>
          <Text style={styles.metricValue}>{(version.performance.precision * 100).toFixed(1)}%</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricName}>Recall</Text>
          <Text style={styles.metricValue}>{(version.performance.recall * 100).toFixed(1)}%</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricName}>F1-Score</Text>
          <Text style={styles.metricValue}>{(version.performance.f1Score * 100).toFixed(1)}%</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.createdDate}>
          Created: {formatDate(version.createdAt)}
        </Text>
        {version.activatedAt && (
          <Text style={styles.activatedDate}>
            Activated: {formatDate(version.activatedAt)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

interface MetricToggleProps {
  metric: string;
  isSelected: boolean;
  color: string;
  onToggle: () => void;
}

const MetricToggle: React.FC<MetricToggleProps> = ({ metric, isSelected, color, onToggle }) => {
  return (
    <TouchableOpacity
      style={[styles.metricToggle, isSelected && { backgroundColor: color }]}
      onPress={onToggle}
    >
      <View style={[styles.metricIndicator, { backgroundColor: color }]} />
      <Text style={[styles.metricToggleText, isSelected && styles.metricToggleTextSelected]}>
        {metric}
      </Text>
    </TouchableOpacity>
  );
};

export const ModelPerformanceHistoryCharts: React.FC<ModelPerformanceHistoryChartsProps> = ({
  modelVersions,
  selectedMetrics,
  onMetricToggle,
  onVersionSelect,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<ModelVersion | null>(null);

  const sortedVersions = useMemo(() => {
    return [...modelVersions].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [modelVersions]);

  const availableMetrics = [
    { key: 'accuracy', label: 'Accuracy', color: MaterialColors.secondary[600] },
    { key: 'precision', label: 'Precision', color: MaterialColors.primary[500] },
    { key: 'recall', label: 'Recall', color: MaterialColors.primary[400] },
    { key: 'f1Score', label: 'F1-Score', color: MaterialColors.primary[300] },
  ];

  const handleVersionSelect = (version: ModelVersion) => {
    setSelectedVersion(version);
    onVersionSelect(version);
  };

  const stats = useMemo(() => {
    if (sortedVersions.length === 0) return null;

    const latest = sortedVersions[sortedVersions.length - 1];
    const previous = sortedVersions[sortedVersions.length - 2];

    if (!previous) return { latest };

    const accuracyChange = latest.performance.accuracy - previous.performance.accuracy;
    const precisionChange = latest.performance.precision - previous.performance.precision;
    const recallChange = latest.performance.recall - previous.performance.recall;
    const f1Change = latest.performance.f1Score - previous.performance.f1Score;

    return {
      latest,
      previous,
      changes: {
        accuracy: accuracyChange,
        precision: precisionChange,
        recall: recallChange,
        f1Score: f1Change,
      }
    };
  }, [sortedVersions]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Model Performance History</Text>
        <Text style={styles.subtitle}>
          {sortedVersions.length} versions • Tracking {selectedMetrics.length} metrics
        </Text>
      </View>

      {/* Performance Overview */}
      {stats && (
        <View style={styles.overviewSection}>
          <Text style={styles.sectionTitle}>Latest Performance</Text>
          <View style={styles.overviewGrid}>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewLabel}>Accuracy</Text>
              <Text style={styles.overviewValue}>
                {(stats.latest.performance.accuracy * 100).toFixed(1)}%
              </Text>
              {stats.changes && (
                <Text style={[
                  styles.overviewChange,
                  { color: stats.changes.accuracy >= 0 ? MaterialColors.secondary[600] : MaterialColors.error[500] }
                ]}>
                  {stats.changes.accuracy >= 0 ? '+' : ''}{(stats.changes.accuracy * 100).toFixed(1)}%
                </Text>
              )}
            </View>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewLabel}>Precision</Text>
              <Text style={styles.overviewValue}>
                {(stats.latest.performance.precision * 100).toFixed(1)}%
              </Text>
              {stats.changes && (
                <Text style={[
                  styles.overviewChange,
                  { color: stats.changes.precision >= 0 ? MaterialColors.secondary[600] : MaterialColors.error[500] }
                ]}>
                  {stats.changes.precision >= 0 ? '+' : ''}{(stats.changes.precision * 100).toFixed(1)}%
                </Text>
              )}
            </View>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewLabel}>Recall</Text>
              <Text style={styles.overviewValue}>
                {(stats.latest.performance.recall * 100).toFixed(1)}%
              </Text>
              {stats.changes && (
                <Text style={[
                  styles.overviewChange,
                  { color: stats.changes.recall >= 0 ? MaterialColors.secondary[600] : MaterialColors.error[500] }
                ]}>
                  {stats.changes.recall >= 0 ? '+' : ''}{(stats.changes.recall * 100).toFixed(1)}%
                </Text>
              )}
            </View>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewLabel}>F1-Score</Text>
              <Text style={styles.overviewValue}>
                {(stats.latest.performance.f1Score * 100).toFixed(1)}%
              </Text>
              {stats.changes && (
                <Text style={[
                  styles.overviewChange,
                  { color: stats.changes.f1Score >= 0 ? MaterialColors.secondary[600] : MaterialColors.error[500] }
                ]}>
                  {stats.changes.f1Score >= 0 ? '+' : ''}{(stats.changes.f1Score * 100).toFixed(1)}%
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Metric Selection */}
      <View style={styles.metricsSection}>
        <Text style={styles.sectionTitle}>Select Metrics to Display</Text>
        <View style={styles.metricsGridCard}>
          {availableMetrics.map(metric => (
            <MetricToggle
              key={metric.key}
              metric={metric.label}
              isSelected={selectedMetrics.includes(metric.key)}
              color={metric.color}
              onToggle={() => onMetricToggle(metric.key)}
            />
          ))}
        </View>
      </View>

      {/* Performance Charts */}
      {selectedMetrics.length > 0 && (
        <View style={styles.chartsSection}>
          <Text style={styles.sectionTitle}>Performance Trends</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartsContainer}>
            {selectedMetrics.map(metricKey => {
              const metric = availableMetrics.find(m => m.key === metricKey);
              if (!metric) return null;

              return (
                <View key={metricKey} style={styles.chartWrapper}>
                  <MetricLine
                    versions={sortedVersions}
                    metric={metricKey as keyof ModelMetrics}
                    color={metric.color}
                    label={metric.label}
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Version History */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Version History</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyList}>
          {sortedVersions.map(version => (
            <PerformanceCard
              key={version.id}
              version={version}
              isSelected={selectedVersion?.id === version.id}
              onPress={() => handleVersionSelect(version)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Version Details */}
      {selectedVersion && (
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Version Details</Text>
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Version {selectedVersion.version}</Text>
            <Text style={styles.detailsInfo}>
              Status: {selectedVersion.status}
            </Text>
            <Text style={styles.detailsInfo}>
              Created: {new Date(selectedVersion.createdAt).toLocaleString()}
            </Text>
            {selectedVersion.activatedAt && (
              <Text style={styles.detailsInfo}>
                Activated: {new Date(selectedVersion.activatedAt).toLocaleString()}
              </Text>
            )}
            <Text style={styles.detailsInfo}>
              Training Data: {selectedVersion.trainingData.size} samples
            </Text>
            <Text style={styles.detailsInfo}>
              Conversion Rate: {(selectedVersion.trainingData.conversionRate * 100).toFixed(1)}%
            </Text>
          </View>
        </View>
      )}
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
  overviewSection: {
    padding: MaterialSpacing.lg,
  },
  sectionTitle: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.md,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MaterialSpacing.md,
  },
  overviewCard: {
    flex: 1,
    minWidth: 80,
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.md,
    alignItems: 'center',
    elevation: 2,
  },
  overviewLabel: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
    marginBottom: MaterialSpacing.xs,
  },
  overviewValue: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[900],
    fontWeight: 'bold',
  },
  overviewChange: {
    ...MaterialTypography.bodySmall,
    fontWeight: '600',
    marginTop: MaterialSpacing.xs,
  },
  metricsSection: {
    padding: MaterialSpacing.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MaterialSpacing.sm,
  },
  metricToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: 20,
    backgroundColor: MaterialColors.neutral[100],
    borderWidth: 1,
    borderColor: MaterialColors.neutral[200],
  },
  metricIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: MaterialSpacing.sm,
  },
  metricToggleText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.neutral[700],
  },
  metricToggleTextSelected: {
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  chartsSection: {
    padding: MaterialSpacing.lg,
  },
  chartsContainer: {
    marginBottom: MaterialSpacing.md,
  },
  chartWrapper: {
    width: screenWidth - 40,
    marginRight: MaterialSpacing.md,
  },
  metricLine: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.lg,
    elevation: 2,
  },
  metricLabel: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.md,
  },
  lineContainer: {
    height: 100,
    position: 'relative',
    marginBottom: MaterialSpacing.md,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
  },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataPointValue: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
    fontWeight: 'bold',
  },
  versionLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  versionLabel: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  historySection: {
    padding: MaterialSpacing.lg,
  },
  historyList: {
    marginBottom: MaterialSpacing.md,
  },
  performanceCard: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.lg,
    marginRight: MaterialSpacing.md,
    minWidth: 200,
    elevation: 2,
  },
  performanceCardSelected: {
    borderWidth: 2,
    borderColor: MaterialColors.primary[500],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.md,
  },
  versionNumber: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[900],
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
    borderRadius: 12,
  },
  statusText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  metricsGridCard: {
    marginBottom: MaterialSpacing.md,
  },
  metricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.sm,
  },
  metricName: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[700],
  },
  metricValue: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[900],
    fontWeight: '600',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[200],
    paddingTop: MaterialSpacing.sm,
  },
  createdDate: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  activatedDate: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
    marginTop: MaterialSpacing.xs,
  },
  detailsSection: {
    padding: MaterialSpacing.lg,
  },
  detailsCard: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.lg,
    elevation: 2,
  },
  detailsTitle: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.md,
  },
  detailsInfo: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[700],
    marginBottom: MaterialSpacing.sm,
  },
});

export default ModelPerformanceHistoryCharts;