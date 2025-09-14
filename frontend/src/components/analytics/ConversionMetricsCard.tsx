import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  MaterialColors,
  MaterialElevation,
  MaterialSpacing,
  MaterialTypography
} from '../../styles/MaterialDesign';

interface ConversionMetrics {
  total_leads: number;
  leads_in_pipeline: number;
  conversion_rate: number;
  average_deal_size: number;
  pipeline_value: number;
  leads_won: number;
  leads_lost: number;
  average_conversion_time: number;
}

interface ConversionMetricsCardProps {
  metrics: ConversionMetrics;
  onPress?: () => void;
  showDetails?: boolean;
}

const ConversionMetricsCard: React.FC<ConversionMetricsCardProps> = ({
  metrics,
  onPress,
  showDetails = true,
}) => {
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

  const getWinRate = (): number => {
    const totalClosed = metrics.leads_won + metrics.leads_lost;
    return totalClosed > 0 ? (metrics.leads_won / totalClosed) * 100 : 0;
  };

  const getPipelineHealth = (): { score: number; color: string; label: string } => {
    const winRate = getWinRate();
    const conversionRate = metrics.conversion_rate;

    // Simple health scoring based on win rate and conversion rate
    const score = (winRate + conversionRate) / 2;

    if (score >= 25) return { score, color: MaterialColors.secondary[500], label: 'Excellent' };
    if (score >= 15) return { score, color: MaterialColors.primary[500], label: 'Good' };
    if (score >= 10) return { score, color: MaterialColors.warning[500], label: 'Fair' };
    return { score, color: MaterialColors.error[500], label: 'Needs Attention' };
  };

  const health = getPipelineHealth();

  const MetricItem: React.FC<{
    label: string;
    value: string;
    color?: string;
    subtitle?: string;
  }> = ({ label, value, color, subtitle }) => (
    <View style={styles.metricItem}>
      <Text style={[styles.metricLabel, { color: color || MaterialColors.neutral[600] }]}>
        {label}
      </Text>
      <Text style={[styles.metricValue, { color: color || MaterialColors.neutral[900] }]}>
        {value}
      </Text>
      {subtitle && (
        <Text style={styles.metricSubtitle}>{subtitle}</Text>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      style={[styles.container, showDetails && styles.containerDetailed]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Conversion Metrics</Text>
        <View style={[styles.healthIndicator, { backgroundColor: health.color }]}>
          <Text style={styles.healthText}>{health.label}</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <MetricItem
          label="Pipeline Value"
          value={formatCurrency(metrics.pipeline_value)}
          color={MaterialColors.secondary[600]}
        />
        <MetricItem
          label="Avg Deal Size"
          value={formatCurrency(metrics.average_deal_size)}
          color={MaterialColors.primary[600]}
        />
        <MetricItem
          label="Win Rate"
          value={formatPercentage(getWinRate())}
          color={getWinRate() > 20 ? MaterialColors.secondary[500] : MaterialColors.warning[500]}
        />
        <MetricItem
          label="Conversion Rate"
          value={formatPercentage(metrics.conversion_rate)}
          color={metrics.conversion_rate > 15 ? MaterialColors.secondary[500] : MaterialColors.error[500]}
        />
      </View>

      {showDetails && (
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Leads in Pipeline:</Text>
            <Text style={styles.detailValue}>{metrics.leads_in_pipeline}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Leads:</Text>
            <Text style={styles.detailValue}>{metrics.total_leads}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Deals Won:</Text>
            <Text style={[styles.detailValue, { color: MaterialColors.secondary[600] }]}>
              {metrics.leads_won}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Deals Lost:</Text>
            <Text style={[styles.detailValue, { color: MaterialColors.error[500] }]}>
              {metrics.leads_lost}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Avg Conversion Time:</Text>
            <Text style={styles.detailValue}>
              {metrics.average_conversion_time > 0
                ? `${Math.round(metrics.average_conversion_time)} days`
                : 'N/A'
              }
            </Text>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Pipeline Health Score: {health.score.toFixed(1)}/50
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.lg,
    ...MaterialElevation.level2,
  },
  containerDetailed: {
    padding: MaterialSpacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.lg,
  },
  title: {
    ...MaterialTypography.titleLarge,
    color: MaterialColors.neutral[900],
    fontWeight: '600',
  },
  healthIndicator: {
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.xs,
    borderRadius: 16,
  },
  healthText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onSecondary,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: MaterialSpacing.lg,
  },
  metricItem: {
    width: '50%',
    marginBottom: MaterialSpacing.md,
    paddingHorizontal: MaterialSpacing.xs,
  },
  metricLabel: {
    ...MaterialTypography.bodySmall,
    marginBottom: MaterialSpacing.xs,
  },
  metricValue: {
    ...MaterialTypography.titleMedium,
    fontWeight: '700',
    marginBottom: MaterialSpacing.xs,
  },
  metricSubtitle: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
  },
  detailsSection: {
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[200],
    paddingTop: MaterialSpacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.sm,
  },
  detailLabel: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
  },
  detailValue: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[900],
    fontWeight: '500',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[200],
    paddingTop: MaterialSpacing.md,
    alignItems: 'center',
  },
  footerText: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
  },
});

export default ConversionMetricsCard;