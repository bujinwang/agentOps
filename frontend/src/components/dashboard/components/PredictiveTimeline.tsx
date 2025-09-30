import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { PredictiveAnalytics } from '../../../types/dashboard';
import {
  MaterialColors,
  MaterialSpacing,
  MaterialTypography,
  MaterialElevation,
} from '../../../styles/MaterialDesign';

interface PredictiveTimelineProps {
  analytics: PredictiveAnalytics[];
  loading?: boolean;
}

const PredictiveTimeline: React.FC<PredictiveTimelineProps> = ({
  analytics,
  loading = false,
}) => {
  const timelineEvents = useMemo(() => {
    if (!analytics || analytics.length === 0) return [];

    const events: Array<{ label: string; date: string; probability: number; confidence?: number }> = [];

    analytics.forEach(item => {
      const forecast = item.conversionForecast;
      if (forecast?.estimatedTimeline) {
        const { optimistic, realistic, pessimistic } = forecast.estimatedTimeline;
        events.push(
          { label: 'Optimistic', date: optimistic, probability: forecast.probability * 100, confidence: forecast.confidence * 100 },
          { label: 'Realistic', date: realistic, probability: forecast.probability * 100, confidence: forecast.confidence * 100 },
          { label: 'Pessimistic', date: pessimistic, probability: forecast.probability * 100, confidence: forecast.confidence * 100 }
        );
      }
    });

    return events.slice(0, 6);
  }, [analytics]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="small" color={MaterialColors.primary[500]} />
        <Text style={styles.loadingText}>Generating timeline…</Text>
      </View>
    );
  }

  if (timelineEvents.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.placeholderText}>No predictive timeline available for the current leads.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Predictive Timeline</Text>
      {timelineEvents.map((event, index) => (
        <View key={`${event.label}-${index}`} style={[styles.timelineCard, index > 0 && styles.timelineSpacing]}>
          <View style={styles.timelineHeader}>
            <View style={[styles.timelineDot, { backgroundColor: MaterialColors.primary[400] }]} />
            <Text style={styles.timelineLabel}>{event.label}</Text>
          </View>
          <Text style={styles.timelineDate}>{event.date}</Text>
          <Text style={styles.timelineMetric}>
            Probability: {event.probability.toFixed(1)}%
          </Text>
          {event.confidence !== undefined && (
            <Text style={styles.timelineHelper}>Confidence: {event.confidence.toFixed(1)}%</Text>
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
  timelineCard: {
    backgroundColor: MaterialColors.surfaceVariant,
    borderRadius: 10,
    padding: MaterialSpacing.md,
  },
  timelineSpacing: {
    marginTop: MaterialSpacing.sm,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: MaterialSpacing.xs,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: MaterialSpacing.sm,
  },
  timelineLabel: {
    ...MaterialTypography.labelLarge,
    color: MaterialColors.primary[700],
  },
  timelineDate: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[800],
  },
  timelineMetric: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.secondary[700],
    marginTop: MaterialSpacing.xs,
  },
  timelineHelper: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
    marginTop: MaterialSpacing.xs,
  },
});

export default PredictiveTimeline;
