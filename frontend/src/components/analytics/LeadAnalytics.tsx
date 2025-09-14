import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MaterialColors, MaterialSpacing, MaterialTypography, MaterialElevation } from '../../styles/MaterialDesign';
import { useResponsive } from '../../hooks/useResponsive';
import useLeadAnalytics from '../../hooks/useLeadAnalytics';
import KPICard from './KPICard';
import TrendChart from './TrendChart';
import ComparisonChart from './ComparisonChart';
import ConversionFunnel from './ConversionFunnel';
import leadScoringService from '../../services/LeadScoringService';

const { width: screenWidth } = Dimensions.get('window');

interface LeadAnalyticsProps {
  timeRange?: '7d' | '30d' | '90d' | '1y';
  onLeadSelect?: (leadId: number) => void;
  showFilters?: boolean;
}

const LeadAnalytics: React.FC<LeadAnalyticsProps> = ({
  timeRange = '30d',
  onLeadSelect,
  showFilters = true
}) => {
  const { deviceType, getResponsiveSpacing } = useResponsive();
  const {
    data: analyticsData,
    loading,
    error,
    refresh,
    setTimeRange,
    timeRange: selectedTimeRange
  } = useLeadAnalytics({
    timeRange,
    autoLoad: true,
    refreshInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  });

  const timeRangeOptions = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
    { key: '1y', label: '1 Year' }
  ];

  const renderTimeRangeSelector = () => {
    if (!showFilters) return null;

    return (
      <View style={styles.timeRangeContainer}>
        <Text style={[styles.timeRangeLabel, { color: MaterialColors.onSurface }]}>
          Time Range:
        </Text>
        <View style={styles.timeRangeOptions}>
          {timeRangeOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.timeRangeOption,
                selectedTimeRange === option.key && styles.timeRangeOptionSelected
              ]}
              onPress={() => setTimeRange(option.key as any)}
              accessibilityLabel={`${option.label} time range`}
              accessibilityState={{ selected: selectedTimeRange === option.key }}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  selectedTimeRange === option.key && styles.timeRangeTextSelected,
                  { color: selectedTimeRange === option.key ? MaterialColors.primary[600] : MaterialColors.neutral[600] }
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderKPIs = () => {
    if (!analyticsData) return null;

    const { summary } = analyticsData;

    const kpiData = [
      {
        title: 'Total Leads',
        value: summary.totalLeads,
        trend: { value: 12.5, label: 'vs last period', direction: 'up' as const },
        icon: <MaterialCommunityIcons name="account-group" size={24} color={MaterialColors.primary[500]} />,
        color: MaterialColors.primary[500],
      },
      {
        title: 'Avg Lead Score',
        value: summary.averageScore,
        format: 'number' as const,
        trend: { value: 3.2, label: 'vs last period', direction: 'up' as const },
        icon: <MaterialCommunityIcons name="star" size={24} color={MaterialColors.secondary[500]} />,
        color: MaterialColors.secondary[500],
      },
      {
        title: 'High-Quality Leads',
        value: summary.highQualityLeads,
        subtitle: `${Math.round((summary.highQualityLeads / summary.totalLeads) * 100)}% of total`,
        trend: { value: 8.1, label: 'vs last period', direction: 'up' as const },
        icon: <MaterialCommunityIcons name="crown" size={24} color={MaterialColors.warning[500]} />,
        color: MaterialColors.warning[500],
      },
      {
        title: 'Conversion Rate',
        value: summary.conversionRate,
        format: 'percentage' as const,
        trend: { value: 5.3, label: 'vs last period', direction: 'up' as const },
        icon: <MaterialCommunityIcons name="trending-up" size={24} color={MaterialColors.secondary[600]} />,
        color: MaterialColors.secondary[600],
      },
    ];

    return (
      <View style={styles.kpiGrid}>
        {kpiData.map((kpi, index) => (
          <View key={index} style={styles.kpiCard}>
            <KPICard {...kpi} />
          </View>
        ))}
      </View>
    );
  };

  const renderScoreDistribution = () => {
    if (!analyticsData) return null;

    return (
      <View style={styles.chartSection}>
        <Text style={[styles.sectionTitle, { color: MaterialColors.onSurface }]}>
          Lead Score Distribution
        </Text>
        <View style={styles.chartContainer}>
          <ComparisonChart
            title="Leads by Grade"
            data={analyticsData.scoreDistribution.map((item: any) => ({
              label: item.grade,
              values: { count: item.count, percentage: item.percentage }
            }))}
            categories={['count', 'percentage']}
            categoryLabels={{ count: 'Lead Count', percentage: 'Percentage' }}
            categoryColors={{
              count: MaterialColors.primary[500],
              percentage: MaterialColors.secondary[500]
            }}
          />
        </View>
      </View>
    );
  };

  const renderScoreTrends = () => {
    if (!analyticsData) return null;

    return (
      <View style={styles.chartSection}>
        <Text style={[styles.sectionTitle, { color: MaterialColors.onSurface }]}>
          Lead Score Trends
        </Text>
        <View style={styles.chartContainer}>
          <TrendChart
            title="Average Lead Score Over Time"
            data={analyticsData.scoreTrends}
            trendColor={MaterialColors.primary[500]}
          />
        </View>
      </View>
    );
  };

  const renderConversionAnalysis = () => {
    if (!analyticsData) return null;

    return (
      <View style={styles.chartSection}>
        <Text style={[styles.sectionTitle, { color: MaterialColors.onSurface }]}>
          Conversion Analysis
        </Text>
        <View style={styles.chartContainer}>
          <ComparisonChart
            title="Conversion Rate by Lead Grade"
            data={analyticsData.conversionByGrade.map((item: any) => ({
              label: item.grade,
              values: { converted: item.conversionRate, total: 100 }
            }))}
            categories={['converted', 'total']}
            categoryLabels={{ converted: 'Conversion %', total: 'Benchmark' }}
            categoryColors={{
              converted: MaterialColors.secondary[500],
              total: MaterialColors.neutral[400]
            }}
          />
        </View>
      </View>
    );
  };

  const renderPropertyTypeAnalysis = () => {
    if (!analyticsData) return null;

    return (
      <View style={styles.chartSection}>
        <Text style={[styles.sectionTitle, { color: MaterialColors.onSurface }]}>
          Property Type Performance
        </Text>
        <View style={styles.chartContainer}>
          <ComparisonChart
            title="Average Score by Property Type"
            data={analyticsData.propertyTypePerformance.map((item: any) => ({
              label: item.type,
              values: { score: item.avgScore, count: item.leadCount }
            }))}
            categories={['score', 'count']}
            categoryLabels={{ score: 'Avg Score', count: 'Lead Count' }}
            categoryColors={{
              score: MaterialColors.primary[500],
              count: MaterialColors.secondary[500]
            }}
          />
        </View>
      </View>
    );
  };

  const responsiveSpacing = getResponsiveSpacing(MaterialSpacing.md);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={[styles.loadingText, { color: MaterialColors.onSurface }]}>
          Loading lead analytics...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={[styles.errorText, { color: MaterialColors.error[500] }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={refresh}
          accessibilityLabel="Retry loading analytics"
        >
          <Text style={[styles.retryText, { color: MaterialColors.primary[500] }]}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: responsiveSpacing }}
      showsVerticalScrollIndicator={false}
    >
      {renderTimeRangeSelector()}
      {renderKPIs()}
      {renderScoreDistribution()}
      {renderScoreTrends()}
      {renderConversionAnalysis()}
      {renderPropertyTypeAnalysis()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MaterialColors.background,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: MaterialSpacing.lg,
    padding: MaterialSpacing.md,
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    ...MaterialElevation.level1,
  },
  timeRangeLabel: {
    ...MaterialTypography.bodyMedium,
    marginRight: MaterialSpacing.md,
  },
  timeRangeOptions: {
    flexDirection: 'row',
    flex: 1,
  },
  timeRangeOption: {
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: 8,
    marginRight: MaterialSpacing.sm,
  },
  timeRangeOptionSelected: {
    backgroundColor: MaterialColors.primary[50],
  },
  timeRangeText: {
    ...MaterialTypography.bodyMedium,
    textAlign: 'center',
  },
  timeRangeTextSelected: {
    fontWeight: '600',
  },
  kpiGrid: {
    flexDirection: screenWidth > 600 ? 'row' : 'column',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  kpiCard: {
    width: screenWidth > 600 ? '48%' : '100%',
    marginBottom: MaterialSpacing.md,
  },
  chartSection: {
    marginBottom: MaterialSpacing.xl,
  },
  sectionTitle: {
    ...MaterialTypography.titleLarge,
    marginBottom: MaterialSpacing.md,
  },
  chartContainer: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.lg,
    ...MaterialElevation.level2,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...MaterialTypography.bodyLarge,
    textAlign: 'center',
  },
  errorText: {
    ...MaterialTypography.bodyLarge,
    textAlign: 'center',
    marginBottom: MaterialSpacing.md,
  },
  retryButton: {
    padding: MaterialSpacing.sm,
    backgroundColor: MaterialColors.primary[50],
    borderRadius: 8,
  },
  retryText: {
    ...MaterialTypography.bodyMedium,
    fontWeight: '600',
  },
});

export default LeadAnalytics;