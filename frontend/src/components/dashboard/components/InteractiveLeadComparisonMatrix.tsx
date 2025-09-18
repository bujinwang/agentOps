import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { MaterialColors, MaterialSpacing, MaterialTypography } from '../../../styles/MaterialDesign';
import { LeadInsights, PredictiveAnalytics } from '../../../types/dashboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface InteractiveLeadComparisonMatrixProps {
  leads: LeadInsights[];
  predictiveAnalytics: PredictiveAnalytics[];
  selectedLeads?: number[];
  maxLeads?: number;
  onLeadSelect?: (leadIds: number[]) => void;
  onLeadPress?: (leadId: number) => void;
  loading?: boolean;
}

interface ComparisonMetric {
  key: string;
  label: string;
  format: 'number' | 'percentage' | 'currency' | 'date' | 'text';
  getValue: (lead: LeadInsights, analytics?: PredictiveAnalytics) => any;
  weight: number; // For scoring/ranking
}

const InteractiveLeadComparisonMatrix: React.FC<InteractiveLeadComparisonMatrixProps> = ({
  leads,
  predictiveAnalytics,
  selectedLeads = [],
  maxLeads = 4,
  onLeadSelect,
  onLeadPress,
  loading = false,
}) => {
  const [sortBy, setSortBy] = useState<string>('currentScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(
    new Set(['currentScore', 'conversionProbability', 'predictedDealValue', 'engagementLevel'])
  );

  // Comparison metrics configuration
  const comparisonMetrics: ComparisonMetric[] = [
    {
      key: 'currentScore',
      label: 'Lead Score',
      format: 'number',
      getValue: (lead) => lead.currentScore,
      weight: 0.3,
    },
    {
      key: 'conversionProbability',
      label: 'Conversion %',
      format: 'percentage',
      getValue: (lead) => lead.conversionProbability,
      weight: 0.25,
    },
    {
      key: 'predictedDealValue',
      label: 'Predicted Value',
      format: 'currency',
      getValue: (lead, analytics) => analytics?.dealValuePrediction?.estimatedValue || 0,
      weight: 0.2,
    },
    {
      key: 'engagementLevel',
      label: 'Engagement',
      format: 'text',
      getValue: (lead) => lead.engagementLevel,
      weight: 0.1,
    },
    {
      key: 'lastActivity',
      label: 'Last Activity',
      format: 'date',
      getValue: (lead) => lead.lastActivity,
      weight: 0.05,
    },
    {
      key: 'nextBestAction',
      label: 'Next Action',
      format: 'text',
      getValue: (lead) => lead.nextBestAction,
      weight: 0.1,
    },
  ];

  // Get analytics for a lead
  const getLeadAnalytics = (leadId: number) => {
    return predictiveAnalytics.find(analytics => analytics.leadId === leadId);
  };

  // Format values based on type
  const formatValue = (value: any, format: string) => {
    if (value === null || value === undefined) return 'N/A';

    switch (format) {
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'currency':
        return value > 0 ? `$${value.toLocaleString()}` : 'N/A';
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'number':
        return typeof value === 'number' ? value.toFixed(1) : value;
      default:
        return String(value);
    }
  };

  // Calculate comparison score for sorting
  const calculateComparisonScore = (lead: LeadInsights) => {
    const analytics = getLeadAnalytics(lead.leadId);
    let score = 0;

    comparisonMetrics.forEach(metric => {
      const value = metric.getValue(lead, analytics);
      if (typeof value === 'number') {
        score += value * metric.weight;
      }
    });

    return score;
  };

  // Sort and filter leads
  const processedLeads = useMemo(() => {
    let filtered = leads.filter(lead => selectedLeads.includes(lead.leadId));

    if (filtered.length === 0) {
      // If no leads selected, show top leads
      filtered = [...leads]
        .sort((a, b) => calculateComparisonScore(b) - calculateComparisonScore(a))
        .slice(0, maxLeads);
    }

    // Sort by selected metric
    const metric = comparisonMetrics.find(m => m.key === sortBy);
    if (metric) {
      filtered.sort((a, b) => {
        const aValue = metric.getValue(a, getLeadAnalytics(a.leadId));
        const bValue = metric.getValue(b, getLeadAnalytics(b.leadId));

        let comparison = 0;
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }

        return sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return filtered;
  }, [leads, selectedLeads, sortBy, sortOrder, maxLeads]);

  // Toggle metric visibility
  const toggleMetric = (metricKey: string) => {
    const newVisible = new Set(visibleMetrics);
    if (newVisible.has(metricKey)) {
      newVisible.delete(metricKey);
    } else {
      newVisible.add(metricKey);
    }
    setVisibleMetrics(newVisible);
  };

  // Handle lead selection
  const handleLeadToggle = (leadId: number) => {
    const newSelected = selectedLeads.includes(leadId)
      ? selectedLeads.filter(id => id !== leadId)
      : [...selectedLeads, leadId].slice(0, maxLeads);

    onLeadSelect?.(newSelected);
  };

  // Render metric header
  const renderMetricHeader = (metric: ComparisonMetric) => (
    <TouchableOpacity
      key={metric.key}
      style={[
        styles.metricHeader,
        sortBy === metric.key && styles.metricHeaderActive,
      ]}
      onPress={() => {
        if (sortBy === metric.key) {
          setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
        } else {
          setSortBy(metric.key);
          setSortOrder('desc');
        }
      }}
    >
      <Text style={[
        styles.metricHeaderText,
        sortBy === metric.key && styles.metricHeaderTextActive,
      ]}>
        {metric.label}
      </Text>
      {sortBy === metric.key && (
        <Text style={styles.sortIndicator}>
          {sortOrder === 'desc' ? '↓' : '↑'}
        </Text>
      )}
    </TouchableOpacity>
  );

  // Render lead cell
  const renderLeadCell = (lead: LeadInsights, metric: ComparisonMetric) => {
    const analytics = getLeadAnalytics(lead.leadId);
    const value = metric.getValue(lead, analytics);
    const formattedValue = formatValue(value, metric.format);

    // Color coding based on value ranges
    let backgroundColor = MaterialColors.surface;
    if (metric.key === 'currentScore') {
      if (value >= 80) backgroundColor = MaterialColors.secondary[50];
      else if (value >= 60) backgroundColor = MaterialColors.warning[50];
      else backgroundColor = MaterialColors.error[50];
    } else if (metric.key === 'conversionProbability') {
      if (value >= 0.8) backgroundColor = MaterialColors.secondary[50];
      else if (value >= 0.5) backgroundColor = MaterialColors.warning[50];
      else backgroundColor = MaterialColors.error[50];
    }

    return (
      <TouchableOpacity
        key={`${lead.leadId}-${metric.key}`}
        style={[styles.cell, { backgroundColor }]}
        onPress={() => onLeadPress?.(lead.leadId)}
      >
        <Text style={styles.cellText} numberOfLines={2}>
          {formattedValue}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render lead header
  const renderLeadHeader = (lead: LeadInsights) => (
    <View key={`header-${lead.leadId}`} style={styles.leadHeader}>
      <TouchableOpacity
        style={styles.leadHeaderContent}
        onPress={() => handleLeadToggle(lead.leadId)}
      >
        <View style={[
          styles.selectionIndicator,
          selectedLeads.includes(lead.leadId) && styles.selectionIndicatorSelected,
        ]} />
        <View style={styles.leadInfo}>
          <Text style={styles.leadName} numberOfLines={1}>
            {lead.name}
          </Text>
          <Text style={styles.leadEmail} numberOfLines={1}>
            {lead.email}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Lead Comparison Matrix</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading comparison data...</Text>
        </View>
      </View>
    );
  }

  const visibleMetricsList = comparisonMetrics.filter(metric => visibleMetrics.has(metric.key));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lead Comparison Matrix</Text>
        <Text style={styles.subtitle}>
          {processedLeads.length} leads • {visibleMetricsList.length} metrics
        </Text>
      </View>

      {/* Metric visibility toggles */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.metricToggles}
      >
        {comparisonMetrics.map(metric => (
          <TouchableOpacity
            key={metric.key}
            style={[
              styles.metricToggle,
              visibleMetrics.has(metric.key) && styles.metricToggleActive,
            ]}
            onPress={() => toggleMetric(metric.key)}
          >
            <Text style={[
              styles.metricToggleText,
              visibleMetrics.has(metric.key) && styles.metricToggleTextActive,
            ]}>
              {metric.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Comparison Matrix */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Headers Row */}
          <View style={styles.headerRow}>
            <View style={styles.metricColumn}>
              <Text style={styles.metricColumnText}>Lead</Text>
            </View>
            {visibleMetricsList.map(metric => renderMetricHeader(metric))}
          </View>

          {/* Data Rows */}
          {processedLeads.map(lead => (
            <View key={lead.leadId} style={styles.dataRow}>
              {renderLeadHeader(lead)}
              {visibleMetricsList.map(metric => renderLeadCell(lead, metric))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Summary Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Click on metric headers to sort • Toggle metrics above to show/hide
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    marginHorizontal: MaterialSpacing.sm,
    marginVertical: MaterialSpacing.xs,
    padding: MaterialSpacing.md,
    elevation: 2,
  },
  header: {
    marginBottom: MaterialSpacing.md,
  },
  title: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
  },
  subtitle: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
  },
  metricToggles: {
    marginBottom: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.xs,
  },
  metricToggle: {
    backgroundColor: MaterialColors.neutral[100],
    borderRadius: 16,
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    marginRight: MaterialSpacing.sm,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[200],
  },
  metricToggleActive: {
    backgroundColor: MaterialColors.primary[50],
    borderColor: MaterialColors.primary[300],
  },
  metricToggleText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.neutral[700],
  },
  metricToggleTextActive: {
    color: MaterialColors.primary[700],
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: MaterialColors.neutral[50],
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  metricColumn: {
    width: 120,
    padding: MaterialSpacing.md,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: MaterialColors.neutral[200],
  },
  metricColumnText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.neutral[800],
    fontWeight: '600',
  },
  metricHeader: {
    width: 100,
    padding: MaterialSpacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: MaterialColors.neutral[200],
  },
  metricHeaderActive: {
    backgroundColor: MaterialColors.primary[100],
  },
  metricHeaderText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[700],
    textAlign: 'center',
  },
  metricHeaderTextActive: {
    color: MaterialColors.primary[700],
    fontWeight: '600',
  },
  sortIndicator: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.primary[600],
    marginLeft: 4,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: MaterialColors.neutral[100],
  },
  leadHeader: {
    width: 120,
    padding: MaterialSpacing.sm,
    borderRightWidth: 1,
    borderRightColor: MaterialColors.neutral[200],
  },
  leadHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: MaterialColors.neutral[400],
    marginRight: MaterialSpacing.sm,
  },
  selectionIndicatorSelected: {
    backgroundColor: MaterialColors.primary[500],
    borderColor: MaterialColors.primary[500],
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[900],
    fontWeight: '500',
  },
  leadEmail: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[600],
  },
  cell: {
    width: 100,
    padding: MaterialSpacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: MaterialColors.neutral[200],
    backgroundColor: MaterialColors.surface,
  },
  cellHigh: {
    backgroundColor: MaterialColors.secondary[50],
  },
  cellMedium: {
    backgroundColor: MaterialColors.warning[50],
  },
  cellLow: {
    backgroundColor: MaterialColors.error[50],
  },
  cellText: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[800],
    textAlign: 'center',
  },
  footer: {
    marginTop: MaterialSpacing.md,
    paddingTop: MaterialSpacing.md,
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[200],
  },
  footerText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[600],
    textAlign: 'center',
  },
});

export default InteractiveLeadComparisonMatrix;