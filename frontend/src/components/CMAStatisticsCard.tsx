import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { CMAStatistics, PriceRange } from '../types/cma';

interface CMAStatisticsCardProps {
  statistics: CMAStatistics;
  priceRange: PriceRange;
  onRefresh?: () => void;
}

const CMAStatisticsCard: React.FC<CMAStatisticsCardProps> = ({
  statistics,
  priceRange,
  onRefresh,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getMarketStrengthColor = (strength: string) => {
    switch (strength) {
      case 'buyers': return '#4CAF50';
      case 'sellers': return '#F44336';
      case 'balanced': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'very_high': return '#4CAF50';
      case 'high': return '#8BC34A';
      case 'medium': return '#FF9800';
      case 'low': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Title
        title="Market Statistics"
        subtitle={`${statistics.comparables_count} comparable properties analyzed`}
        left={(props) => <MaterialCommunityIcons {...props} name="chart-bar" />}
        right={(props) => onRefresh && (
          <MaterialCommunityIcons
            {...props}
            name="refresh"
            onPress={onRefresh}
          />
        )}
      />
      <Card.Content>
        {/* Price Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Analysis</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Average Price</Text>
              <Text style={styles.statValue}>{formatCurrency(statistics.average_price)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Median Price</Text>
              <Text style={styles.statValue}>{formatCurrency(statistics.median_price)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Price Range</Text>
              <Text style={styles.statValue}>
                {formatCurrency(statistics.price_range.low)} - {formatCurrency(statistics.price_range.high)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Standard Deviation</Text>
              <Text style={styles.statValue}>{formatCurrency(statistics.standard_deviation)}</Text>
            </View>
          </View>
        </View>

        {/* Price per Square Foot */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price per Square Foot</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Average</Text>
              <Text style={styles.statValue}>${statistics.average_price_per_sqft.toFixed(0)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Median</Text>
              <Text style={styles.statValue}>${statistics.median_price_per_sqft.toFixed(0)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Range</Text>
              <Text style={styles.statValue}>
                ${statistics.price_per_sqft_range.low.toFixed(0)} - ${statistics.price_per_sqft_range.high.toFixed(0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Market Indicators */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Market Indicators</Text>
          <View style={styles.marketIndicators}>
            <View style={styles.indicatorRow}>
              <Text style={styles.indicatorLabel}>Market Strength:</Text>
              <Chip
                mode="outlined"
                style={[styles.marketChip, { borderColor: getMarketStrengthColor(statistics.market_strength) }]}
                textStyle={{ color: getMarketStrengthColor(statistics.market_strength) }}
              >
                {statistics.market_strength.toUpperCase()}
              </Chip>
            </View>

            <View style={styles.indicatorRow}>
              <Text style={styles.indicatorLabel}>Absorption Rate:</Text>
              <Text style={styles.indicatorValue}>
                {statistics.market_absorption_rate.toFixed(1)} properties/month
              </Text>
            </View>

            <View style={styles.indicatorRow}>
              <Text style={styles.indicatorLabel}>Months of Inventory:</Text>
              <Text style={styles.indicatorValue}>{statistics.inventory_levels.toFixed(1)}</Text>
            </View>

            <View style={styles.indicatorRow}>
              <Text style={styles.indicatorLabel}>Average DOM:</Text>
              <Text style={styles.indicatorValue}>{statistics.average_days_on_market.toFixed(0)} days</Text>
            </View>

            <View style={styles.indicatorRow}>
              <Text style={styles.indicatorLabel}>Sale-to-List Ratio:</Text>
              <Text style={styles.indicatorValue}>{formatPercentage(statistics.average_sale_to_list_ratio * 100)}</Text>
            </View>
          </View>
        </View>

        {/* Confidence and Quality */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analysis Quality</Text>
          <View style={styles.qualityGrid}>
            <View style={styles.qualityItem}>
              <Text style={styles.qualityLabel}>Confidence Level</Text>
              <Chip
                mode="outlined"
                style={[styles.confidenceChip, { borderColor: getConfidenceColor(priceRange.estimated_value_range.confidence_level) }]}
                textStyle={{ color: getConfidenceColor(priceRange.estimated_value_range.confidence_level) }}
              >
                {priceRange.estimated_value_range.confidence_level.toUpperCase()}
              </Chip>
            </View>

            <View style={styles.qualityItem}>
              <Text style={styles.qualityLabel}>Data Quality Score</Text>
              <Text style={styles.qualityValue}>{priceRange.confidence_score}%</Text>
            </View>

            <View style={styles.qualityItem}>
              <Text style={styles.qualityLabel}>Coefficient of Variation</Text>
              <Text style={styles.qualityValue}>{formatPercentage(statistics.coefficient_of_variation)}</Text>
            </View>
          </View>
        </View>

        {/* 95% Confidence Interval */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>95% Confidence Interval</Text>
          <View style={styles.confidenceInterval}>
            <Text style={styles.confidenceRange}>
              {formatCurrency(statistics.confidence_interval_95.low)} - {formatCurrency(statistics.confidence_interval_95.high)}
            </Text>
            <Text style={styles.confidenceNote}>
              95% confident that the true market value falls within this range
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    textAlign: 'center',
  },
  marketIndicators: {
    gap: 12,
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  indicatorLabel: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  indicatorValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1976D2',
  },
  marketChip: {
    backgroundColor: 'transparent',
  },
  qualityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  qualityItem: {
    flex: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  qualityLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
  qualityValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  confidenceChip: {
    backgroundColor: 'transparent',
  },
  confidenceInterval: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confidenceRange: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 4,
  },
  confidenceNote: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
});

export default CMAStatisticsCard;