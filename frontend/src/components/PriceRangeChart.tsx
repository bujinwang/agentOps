import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';

import { PriceRange } from '../types/cma';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 64; // Account for padding
const chartHeight = 200;

interface PriceRangeChartProps {
  priceRange: PriceRange;
  subjectPropertyValue?: number;
}

const PriceRangeChart: React.FC<PriceRangeChartProps> = ({
  priceRange,
  subjectPropertyValue,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate chart dimensions and ranges
  const minPrice = Math.max(0, priceRange.estimated_value_range.low * 0.95);
  const maxPrice = priceRange.estimated_value_range.high * 1.05;
  const priceRangeWidth = maxPrice - minPrice;

  // Calculate positions
  const getXPosition = (price: number) => {
    return ((price - minPrice) / priceRangeWidth) * (chartWidth - 100) + 50;
  };

  const subjectX = subjectPropertyValue ? getXPosition(subjectPropertyValue) : null;
  const lowX = getXPosition(priceRange.estimated_value_range.low);
  const highX = getXPosition(priceRange.estimated_value_range.high);
  const averageX = getXPosition(priceRange.estimated_value_range.low +
    (priceRange.estimated_value_range.high - priceRange.estimated_value_range.low) / 2);

  // Generate price labels
  const priceLabels = [];
  const numLabels = 5;
  for (let i = 0; i <= numLabels; i++) {
    const price = minPrice + (priceRangeWidth * i) / numLabels;
    priceLabels.push({
      price,
      x: getXPosition(price),
      label: formatCurrency(price),
    });
  }

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
        title="Price Range Analysis"
        subtitle="Estimated market value with confidence intervals"
        left={(props) => <MaterialCommunityIcons {...props} name="chart-bar" />}
      />
      <Card.Content>
        {/* Confidence Level Indicator */}
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>Analysis Confidence:</Text>
          <Chip
            mode="outlined"
            style={[styles.confidenceChip, { borderColor: getConfidenceColor(priceRange.estimated_value_range.confidence_level) }]}
            textStyle={{ color: getConfidenceColor(priceRange.estimated_value_range.confidence_level) }}
          >
            {priceRange.estimated_value_range.confidence_level.toUpperCase()}
          </Chip>
        </View>

        {/* Price Range Chart */}
        <View style={styles.chartContainer}>
          <Svg width={chartWidth} height={chartHeight}>
            {/* Background grid lines */}
            <G>
              {priceLabels.map((label, index) => (
                <G key={index}>
                  <Line
                    x1={label.x}
                    y1={20}
                    x2={label.x}
                    y2={chartHeight - 60}
                    stroke="#E0E0E0"
                    strokeWidth={1}
                    strokeDasharray={index > 0 && index < numLabels ? "2,2" : undefined}
                  />
                  <SvgText
                    x={label.x}
                    y={chartHeight - 30}
                    fontSize="10"
                    fill="#666666"
                    textAnchor="middle"
                  >
                    {label.label}
                  </SvgText>
                </G>
              ))}
            </G>

            {/* Price range bar */}
            <Rect
              x={lowX}
              y={60}
              width={highX - lowX}
              height={40}
              fill={getConfidenceColor(priceRange.estimated_value_range.confidence_level)}
              opacity={0.3}
              rx={4}
            />

            {/* Price range bar border */}
            <Rect
              x={lowX}
              y={60}
              width={highX - lowX}
              height={40}
              fill="none"
              stroke={getConfidenceColor(priceRange.estimated_value_range.confidence_level)}
              strokeWidth={2}
              rx={4}
            />

            {/* Average price line */}
            <Line
              x1={averageX}
              y1={50}
              x2={averageX}
              y2={110}
              stroke="#1976D2"
              strokeWidth={3}
            />

            {/* Subject property value line */}
            {subjectX && (
              <Line
                x1={subjectX}
                y1={40}
                x2={subjectX}
                y2={120}
                stroke="#F44336"
                strokeWidth={3}
                strokeDasharray="5,5"
              />
            )}

            {/* Labels */}
            <SvgText
              x={averageX}
              y={35}
              fontSize="12"
              fill="#1976D2"
              fontWeight="bold"
              textAnchor="middle"
            >
              Average: {formatCurrency(priceRange.estimated_value_range.low +
                (priceRange.estimated_value_range.high - priceRange.estimated_value_range.low) / 2)}
            </SvgText>

            {subjectX && (
              <SvgText
                x={subjectX}
                y={135}
                fontSize="12"
                fill="#F44336"
                fontWeight="bold"
                textAnchor="middle"
              >
                Subject: {formatCurrency(subjectPropertyValue!)}
              </SvgText>
            )}

            {/* Range labels */}
            <SvgText
              x={lowX}
              y={120}
              fontSize="10"
              fill="#666666"
              textAnchor="middle"
            >
              Low: {formatCurrency(priceRange.estimated_value_range.low)}
            </SvgText>

            <SvgText
              x={highX}
              y={120}
              fontSize="10"
              fill="#666666"
              textAnchor="middle"
            >
              High: {formatCurrency(priceRange.estimated_value_range.high)}
            </SvgText>
          </Svg>
        </View>

        {/* Price Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Estimated Range:</Text>
            <Text style={styles.statValue}>
              {formatCurrency(priceRange.estimated_value_range.low)} - {formatCurrency(priceRange.estimated_value_range.high)}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Range Width:</Text>
            <Text style={styles.statValue}>
              {formatCurrency(priceRange.estimated_value_range.high - priceRange.estimated_value_range.low)}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Price per Sqft Range:</Text>
            <Text style={styles.statValue}>
              ${priceRange.price_per_sqft_range.low.toFixed(0)} - ${priceRange.price_per_sqft_range.high.toFixed(0)}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Confidence Score:</Text>
            <Text style={styles.statValue}>{priceRange.confidence_score}%</Text>
          </View>
        </View>

        {/* Confidence Factors */}
        <View style={styles.factorsContainer}>
          <Text style={styles.factorsTitle}>Confidence Factors:</Text>
          <View style={styles.factorsGrid}>
            <View style={styles.factor}>
              <Text style={styles.factorLabel}>Comparable Quality</Text>
              <Text style={styles.factorValue}>{priceRange.confidence_factors.comparable_quality}%</Text>
            </View>
            <View style={styles.factor}>
              <Text style={styles.factorLabel}>Market Data Freshness</Text>
              <Text style={styles.factorValue}>{priceRange.confidence_factors.market_data_freshness}%</Text>
            </View>
            <View style={styles.factor}>
              <Text style={styles.factorLabel}>Adjustment Accuracy</Text>
              <Text style={styles.factorValue}>{priceRange.confidence_factors.adjustment_accuracy}%</Text>
            </View>
            <View style={styles.factor}>
              <Text style={styles.factorLabel}>Market Conditions</Text>
              <Text style={styles.factorValue}>{priceRange.confidence_factors.market_conditions}%</Text>
            </View>
          </View>
        </View>

        {/* Adjustment Summary */}
        {priceRange.adjustment_breakdown.net_adjustment !== 0 && (
          <View style={styles.adjustmentContainer}>
            <Text style={styles.adjustmentTitle}>Net Adjustments:</Text>
            <View style={styles.adjustmentRow}>
              <Text style={styles.adjustmentLabel}>Positive:</Text>
              <Text style={[styles.adjustmentValue, { color: '#4CAF50' }]}>
                +{formatCurrency(priceRange.adjustment_breakdown.positive)}
              </Text>
            </View>
            <View style={styles.adjustmentRow}>
              <Text style={styles.adjustmentLabel}>Negative:</Text>
              <Text style={[styles.adjustmentValue, { color: '#F44336' }]}>
                -{formatCurrency(Math.abs(priceRange.adjustment_breakdown.negative))}
              </Text>
            </View>
            <View style={[styles.adjustmentRow, styles.netAdjustment]}>
              <Text style={styles.adjustmentLabel}>Net:</Text>
              <Text style={[styles.adjustmentValue, {
                color: priceRange.adjustment_breakdown.net_adjustment >= 0 ? '#4CAF50' : '#F44336'
              }]}>
                {priceRange.adjustment_breakdown.net_adjustment >= 0 ? '+' : ''}
                {formatCurrency(priceRange.adjustment_breakdown.net_adjustment)}
              </Text>
            </View>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
  },
  confidenceChip: {
    backgroundColor: 'transparent',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statsContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  factorsContainer: {
    marginBottom: 16,
  },
  factorsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 12,
  },
  factorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  factor: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  factorLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 4,
  },
  factorValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  adjustmentContainer: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
  },
  adjustmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 12,
  },
  adjustmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  netAdjustment: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 8,
    marginTop: 8,
  },
  adjustmentLabel: {
    fontSize: 14,
    color: '#666666',
  },
  adjustmentValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PriceRangeChart;