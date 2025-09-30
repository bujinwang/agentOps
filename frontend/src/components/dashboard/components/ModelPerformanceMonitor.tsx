import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { DashboardMetrics } from '../../../types/dashboard';
import {
  MaterialColors,
  MaterialSpacing,
  MaterialTypography,
  MaterialElevation,
} from '../../../styles/MaterialDesign';

interface ModelPerformanceMonitorProps {
  metrics: DashboardMetrics | null;
  loading?: boolean;
}

const ModelPerformanceMonitor: React.FC<ModelPerformanceMonitorProps> = ({
  metrics,
  loading = false,
}) => {
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="small" color={MaterialColors.primary[500]} />
        <Text style={styles.loadingText}>Loading performance metrics…</Text>
      </View>
    );
  }

  if (!metrics) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.placeholderText}>Performance metrics are not available yet.</Text>
      </View>
    );
  }

  const topAgent = metrics.topPerformingAgents?.[0];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Model Performance</Text>

      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Conversion Rate</Text>
          <Text style={styles.kpiValue}>{metrics.conversionRate.toFixed(1)}%</Text>
          <Text style={styles.kpiHelper}>Rolling 30-day performance</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Avg Lead Score</Text>
          <Text style={styles.kpiValue}>{metrics.averageScore.toFixed(1)}</Text>
          <Text style={styles.kpiHelper}>Across active pipeline</Text>
        </View>
      </View>

      {topAgent ? (
        <View style={styles.agentCard}>
          <Text style={styles.sectionLabel}>Top Performer</Text>
          <Text style={styles.agentName}>{topAgent.name}</Text>
          <View style={styles.agentStatsRow}>
            <Text style={styles.agentStat}>{topAgent.leadsManaged} leads managed</Text>
            <Text style={styles.agentStat}>{topAgent.conversionRate.toFixed(1)}% win rate</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.placeholderText}>Top performer data not available.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    marginVertical: MaterialSpacing.md,
    padding: MaterialSpacing.lg,
    ...MaterialElevation.level2,
  },
  title: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.sm,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  loadingText: {
    marginTop: MaterialSpacing.sm,
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  placeholderText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
    textAlign: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: MaterialSpacing.md,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: MaterialColors.surfaceVariant,
    borderRadius: 10,
    padding: MaterialSpacing.md,
  },
  kpiLabel: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.neutral[600],
    marginBottom: MaterialSpacing.xs,
  },
  kpiValue: {
    ...MaterialTypography.headlineMedium,
    color: MaterialColors.primary[600],
  },
  kpiHelper: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
    marginTop: MaterialSpacing.xs,
  },
  agentCard: {
    marginTop: MaterialSpacing.lg,
    padding: MaterialSpacing.md,
    borderRadius: 10,
    backgroundColor: MaterialColors.primary[50],
  },
  sectionLabel: {
    ...MaterialTypography.labelLarge,
    color: MaterialColors.primary[700],
    marginBottom: MaterialSpacing.xs,
  },
  agentName: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.primary[900],
  },
  agentStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: MaterialSpacing.sm,
  },
  agentStat: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[700],
  },
});

export default ModelPerformanceMonitor;
