import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Line, Circle, Text as SvgText, G, Rect } from 'react-native-svg';

import { MarketTrend, MarketTimeframe, CMAMetricType } from '../types/cma';

const chartWidth = 300;
const chartHeight = 200;

interface MarketTrendChartProps {
  trends: MarketTrend[];
  timeframe?: MarketTimeframe;
  metric?: CMAMetricType;
}

const MarketTrendChart: React.FC<MarketTrendChartProps> = ({
  trends,
  timeframe = '6_months',
  metric = 'price_per_sqft',
}) => {
  // Filter trends by timeframe and metric
  const filteredTrends = trends.filter(trend =>
    trend.timeframe === timeframe && trend.metric === metric
  );

  if (filteredTrends.length === 0) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.noDataText}>No trend data available for the selected parameters</Text>
        </Card.Content>
      </Card>
    );
  }

  // Sort by timeframe (assuming trends are in chronological order)
  const sortedTrends = [...filteredTrends].sort((a, b) => {
    const order = ['1_month', '3_months', '6_months', '1_year', '2_years', '5_years'];
    return order.indexOf(a.timeframe) - order.indexOf(b.timeframe);
  });

  // Calculate chart dimensions
  const values = sortedTrends.map(t => t.current_value);
  const minValue = Math.min(...values) * 0.95;
  const maxValue = Math.max(...values) * 1.05;
  const valueRange = maxValue - minValue;

  const getYPosition = (value: number) => {
    return chartHeight - 40 - ((value - minValue) / valueRange) * (chartHeight - 80);
  };

  const getXPosition = (index: number) => {
    const spacing = chartWidth / Math.max(sortedTrends.length - 1, 1);
    return 40 + index * spacing;
  };

  const formatValue = (value: number) => {
    if (metric === 'price_per_sqft') {
      return `$${value.toFixed(0)}`;
    }
    if (metric === 'sale_to_list_ratio') {
      return `${(value * 100).toFixed(1)}%`;
    }
    if (metric === 'days_on_market') {
      return `${value.toFixed(0)} days`;
    }
    return value.toLocaleString();
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'up': return '#4CAF50';
      case 'down': return '#F44336';
      case 'stable': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return 'trending-up';
      case 'down': return 'trending-down';
      case 'stable': return 'trending-neutral';
      default: return 'minus';
    }
  };

  const formatTimeframe = (tf: MarketTimeframe) => {
    switch (tf) {
      case '1_month': return '1 Month';
      case '3_months': return '3 Months';
      case '6_months': return '6 Months';
      case '1_year': return '1 Year';
      case '2_years': return '2 Years';
      case '5_years': return '5 Years';
      default: return tf;
    }
  };

  const formatMetric = (m: CMAMetricType) => {
    switch (m) {
      case 'price_per_sqft': return 'Price per Sqft';
      case 'total_price': return 'Total Price';
      case 'days_on_market': return 'Days on Market';
      case 'sale_to_list_ratio': return 'Sale-to-List Ratio';
      case 'inventory_levels': return 'Inventory Levels';
      case 'market_absorption': return 'Market Absorption';
      default: return m;
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Title
        title="Market Trend Analysis"
        subtitle={`${formatMetric(metric)} over ${formatTimeframe(timeframe)}`}
        left={(props) => <MaterialCommunityIcons {...props} name="chart-line" />}
      />
      <Card.Content>
        {/* Trend Summary */}
        <View style={styles.trendSummary}>
          <View style={styles.trendIndicator}>
            <MaterialCommunityIcons
              name={getTrendIcon(sortedTrends[sortedTrends.length - 1]?.direction || 'stable')}
              size={24}
              color={getTrendColor(sortedTrends[sortedTrends.length - 1]?.direction || 'stable')}
            />
            <Text style={styles.trendDirection}>
              {sortedTrends[sortedTrends.length - 1]?.direction.toUpperCase() || 'STABLE'}
            </Text>
          </View>

          <View style={styles.trendStats}>
            <Text style={styles.currentValue}>
              Current: {formatValue(sortedTrends[sortedTrends.length - 1]?.current_value || 0)}
            </Text>
            <Text style={styles.changeValue}>
              Change: {sortedTrends[sortedTrends.length - 1]?.change_percentage > 0 ? '+' : ''}
              {sortedTrends[sortedTrends.length - 1]?.change_percentage.toFixed(1) || 0}%
            </Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartContainer}>
          <Svg width={chartWidth + 40} height={chartHeight}>
            {/* Grid lines */}
            <G>
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const y = 20 + ratio * (chartHeight - 60);
                const value = minValue + ratio * valueRange;
                return (
                  <G key={index}>
                    <Line
                      x1={40}
                      y1={y}
                      x2={chartWidth + 40}
                      y2={y}
                      stroke="#E0E0E0"
                      strokeWidth={1}
                      strokeDasharray="2,2"
                    />
                    <SvgText
                      x={20}
                      y={y + 4}
                      fontSize="10"
                      fill="#666666"
                      textAnchor="end"
                    >
                      {formatValue(value)}
                    </SvgText>
                  </G>
                );
              })}
            </G>

            {/* Trend line */}
            {sortedTrends.map((trend, index) => {
              if (index === 0) return null;

              const prevTrend = sortedTrends[index - 1];
              const x1 = getXPosition(index - 1);
              const y1 = getYPosition(prevTrend.current_value);
              const x2 = getXPosition(index);
              const y2 = getYPosition(trend.current_value);

              return (
                <Line
                  key={`line-${index}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={getTrendColor(trend.direction)}
                  strokeWidth={3}
                />
              );
            })}

            {/* Data points */}
            {sortedTrends.map((trend, index) => {
              const x = getXPosition(index);
              const y = getYPosition(trend.current_value);

              return (
                <G key={`point-${index}`}>
                  <Circle
                    cx={x}
                    cy={y}
                    r={6}
                    fill={getTrendColor(trend.direction)}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                  <SvgText
                    x={x}
                    y={y - 15}
                    fontSize="10"
                    fill="#333333"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {formatValue(trend.current_value)}
                  </SvgText>
                </G>
              );
            })}

            {/* Time labels */}
            {sortedTrends.map((trend, index) => (
              <SvgText
                key={`label-${index}`}
                x={getXPosition(index)}
                y={chartHeight - 10}
                fontSize="10"
                fill="#666666"
                textAnchor="middle"
              >
                {formatTimeframe(trend.timeframe)}
              </SvgText>
            ))}
          </Svg>
        </View>

        {/* Detailed Trend Data */}
        <View style={styles.trendDetails}>
          <Text style={styles.detailsTitle}>Trend Details</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.detailsGrid}>
              {sortedTrends.map((trend, index) => (
                <View key={index} style={styles.detailItem}>
                  <Text style={styles.detailTimeframe}>{formatTimeframe(trend.timeframe)}</Text>
                  <Text style={styles.detailValue}>{formatValue(trend.current_value)}</Text>
                  <View style={styles.detailChange}>
                    <MaterialCommunityIcons
                      name={getTrendIcon(trend.direction)}
                      size={14}
                      color={getTrendColor(trend.direction)}
                    />
                    <Text style={[styles.detailChangeText, { color: getTrendColor(trend.direction) }]}>
                      {trend.change_percentage > 0 ? '+' : ''}{trend.change_percentage.toFixed(1)}%
                    </Text>
                  </View>
                  <Chip
                    mode="outlined"
                    style={[styles.significanceChip, {
                      borderColor: trend.significance === 'high' ? '#F44336' :
                                   trend.significance === 'medium' ? '#FF9800' : '#4CAF50'
                    }]}
                    textStyle={{
                      color: trend.significance === 'high' ? '#F44336' :
                             trend.significance === 'medium' ? '#FF9800' : '#4CAF50',
                      fontSize: 10
                    }}
                  >
                    {trend.significance.toUpperCase()}
                  </Chip>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Market Insights */}
        <View style={styles.insightsContainer}>
          <Text style={styles.insightsTitle}>Market Insights</Text>
          <View style={styles.insightsList}>
            {sortedTrends[sortedTrends.length - 1] && (
              <>
                <View style={styles.insight}>
                  <MaterialCommunityIcons name="lightbulb" size={16} color="#FF9800" />
                  <Text style={styles.insightText}>
                    {sortedTrends[sortedTrends.length - 1].direction === 'up'
                      ? 'Market is trending upward, consider pricing at the higher end of the range'
                      : sortedTrends[sortedTrends.length - 1].direction === 'down'
                      ? 'Market is trending downward, consider pricing more competitively'
                      : 'Market is stable, use median pricing strategy'
                    }
                  </Text>
                </View>

                <View style={styles.insight}>
                  <MaterialCommunityIcons name="chart-timeline-variant" size={16} color="#1976D2" />
                  <Text style={styles.insightText}>
                    {Math.abs(sortedTrends[sortedTrends.length - 1].change_percentage) > 5
                      ? `Significant ${sortedTrends[sortedTrends.length - 1].change_percentage > 0 ? 'increase' : 'decrease'} of ${Math.abs(sortedTrends[sortedTrends.length - 1].change_percentage).toFixed(1)}%`
                      : 'Market showing moderate stability'
                    }
                  </Text>
                </View>
              </>
            )}
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
  noDataText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    padding: 32,
  },
  trendSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trendDirection: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  trendStats: {
    alignItems: 'flex-end',
  },
  currentValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  changeValue: {
    fontSize: 14,
    color: '#666666',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  trendDetails: {
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  detailItem: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  detailTimeframe: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 4,
  },
  detailChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  detailChangeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  significanceChip: {
    backgroundColor: 'transparent',
  },
  insightsContainer: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 12,
  },
  insightsList: {
    gap: 12,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
    lineHeight: 20,
  },
});

export default MarketTrendChart;