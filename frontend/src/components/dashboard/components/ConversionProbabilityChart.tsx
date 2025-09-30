import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import {
  MaterialColors,
  MaterialSpacing,
  MaterialTypography,
  MaterialElevation,
} from '../../../styles/MaterialDesign';

interface ConversionProbabilityChartProps {
  data: Array<{ leadId: number; probability: number; confidence?: number }>;
  loading?: boolean;
}

const ConversionProbabilityChart: React.FC<ConversionProbabilityChartProps> = ({
  data,
  loading = false,
}) => {
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="small" color={MaterialColors.primary[500]} />
        <Text style={styles.loadingText}>Calculating conversion probabilities…</Text>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.placeholderText}>No predictive conversion data available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conversion Probability</Text>
      {data.slice(0, 5).map((item) => (
        <View key={item.leadId} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.leadLabel}>Lead #{item.leadId}</Text>
            <Text style={styles.probabilityLabel}>{(item.probability * 100).toFixed(1)}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, Math.max(0, item.probability * 100))}%` },
              ]}
            />
          </View>
          {typeof item.confidence === 'number' && (
            <Text style={styles.confidenceText}>
              Confidence {Math.round(item.confidence * 100)}%
            </Text>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    marginVertical: MaterialSpacing.md,
    padding: MaterialSpacing.lg,
    ...MaterialElevation.level1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  title: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.md,
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
  row: {
    marginBottom: MaterialSpacing.md,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: MaterialSpacing.xs,
  },
  leadLabel: {
    ...MaterialTypography.labelLarge,
    color: MaterialColors.neutral[700],
  },
  probabilityLabel: {
    ...MaterialTypography.labelLarge,
    color: MaterialColors.secondary[700],
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: MaterialColors.neutral[200],
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: MaterialColors.secondary[500],
  },
  confidenceText: {
    marginTop: MaterialSpacing.xs,
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
  },
});

export default ConversionProbabilityChart;
