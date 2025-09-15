import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface MarketMetrics {
  period: string;
  avgPrice: number;
  medianPrice: number;
  totalListings: number;
  soldListings: number;
  daysOnMarket: number;
  priceChange: number;
}

interface MarketPerformanceChartProps {
  data: MarketMetrics[];
  timeRange: string;
}

const MarketPerformanceChart: React.FC<MarketPerformanceChartProps> = ({ data, timeRange }) => {
  const [selectedMetric, setSelectedMetric] = useState<'price' | 'volume' | 'days'>('price');

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPeriodLabel = (periodStr: string): string => {
    const date = new Date(periodStr + (periodStr.length === 7 ? '-01' : ''));
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  const getCurrentMetrics = () => {
    if (data.length === 0) return null;
    return data[data.length - 1];
  };

  const getPreviousMetrics = () => {
    if (data.length < 2) return null;
    return data[data.length - 2];
  };

  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const current = getCurrentMetrics();
  const previous = getPreviousMetrics();

  const renderMetricCard = (title: string, value: string, change: number, icon: string, color: string) => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        <MaterialCommunityIcons name={icon as any} size={20} color={color} />
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <View style={styles.changeContainer}>
        <MaterialCommunityIcons
          name={change >= 0 ? 'trending-up' : 'trending-down'}
          size={14}
          color={change >= 0 ? '#28a745' : '#dc3545'}
        />
        <Text style={[styles.changeText, { color: change >= 0 ? '#28a745' : '#dc3545' }]}>
          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
        </Text>
      </View>
    </View>
  );

  const renderTrendIndicator = (value: number, label: string) => (
    <View style={styles.trendItem}>
      <Text style={styles.trendLabel}>{label}</Text>
      <View style={styles.trendValue}>
        <MaterialCommunityIcons
          name={value >= 0 ? 'arrow-up' : 'arrow-down'}
          size={16}
          color={value >= 0 ? '#28a745' : '#dc3545'}
        />
        <Text style={[styles.trendNumber, { color: value >= 0 ? '#28a745' : '#dc3545' }]}>
          {value >= 0 ? '+' : ''}{value.toFixed(1)}%
        </Text>
      </View>
    </View>
  );

  if (!current) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="chart-line-variant"
            size={24}
            color="#007AFF"
          />
          <Text style={styles.title}>Market Performance</Text>
        </View>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="chart-line-variant"
            size={48}
            color="#6c757d"
          />
          <Text style={styles.emptyText}>No market data available</Text>
        </View>
      </View>
    );
  }

  const priceChange = previous ? calculateChange(current.avgPrice, previous.avgPrice) : 0;
  const volumeChange = previous ? calculateChange(current.soldListings, previous.soldListings) : 0;
  const domChange = previous ? calculateChange(current.daysOnMarket, previous.daysOnMarket) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="chart-line-variant"
          size={24}
          color="#007AFF"
        />
        <Text style={styles.title}>Market Performance</Text>
        <Text style={styles.subtitle}>{timeRange} analysis</Text>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        {renderMetricCard(
          'Average Price',
          formatCurrency(current.avgPrice),
          priceChange,
          'cash',
          '#007bff'
        )}
        {renderMetricCard(
          'Median Price',
          formatCurrency(current.medianPrice),
          priceChange,
          'chart-line',
          '#28a745'
        )}
        {renderMetricCard(
          'Total Listings',
          current.totalListings.toString(),
          volumeChange,
          'home-group',
          '#ffc107'
        )}
        {renderMetricCard(
          'Days on Market',
          current.daysOnMarket.toString(),
          domChange,
          'calendar-clock',
          '#6f42c1'
        )}
      </View>

      {/* Market Trends */}
      <View style={styles.trendsSection}>
        <Text style={styles.sectionTitle}>Market Trends</Text>
        <View style={styles.trendsContainer}>
          {renderTrendIndicator(priceChange, 'Price Change')}
          {renderTrendIndicator(volumeChange, 'Sales Volume')}
          {renderTrendIndicator(domChange, 'Days on Market')}
        </View>
      </View>

      {/* Market Health Indicators */}
      <View style={styles.healthSection}>
        <Text style={styles.sectionTitle}>Market Health</Text>
        <View style={styles.healthGrid}>
          <View style={styles.healthItem}>
            <Text style={styles.healthLabel}>Market Absorption</Text>
            <Text style={styles.healthValue}>
              {((current.soldListings / current.totalListings) * 100).toFixed(1)}%
            </Text>
            <Text style={styles.healthSubtext}>
              {current.soldListings} of {current.totalListings} listings sold
            </Text>
          </View>

          <View style={styles.healthItem}>
            <Text style={styles.healthLabel}>Price Velocity</Text>
            <Text style={styles.healthValue}>
              {priceChange >= 0 ? 'Rising' : 'Falling'}
            </Text>
            <Text style={styles.healthSubtext}>
              {priceChange >= 0 ? 'Seller\'s Market' : 'Buyer\'s Market'}
            </Text>
          </View>
        </View>
      </View>

      {/* Market Insights */}
      <View style={styles.insightsSection}>
        <Text style={styles.sectionTitle}>Market Insights</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightsScroll}>
          <View style={styles.insightCard}>
            <MaterialCommunityIcons name="lightbulb" size={20} color="#ffc107" />
            <Text style={styles.insightText}>
              {priceChange > 5 ? 'Strong seller\'s market with rising prices' :
               priceChange < -5 ? 'Buyer\'s market with declining prices' :
               'Balanced market with stable pricing'}
            </Text>
          </View>

          <View style={styles.insightCard}>
            <MaterialCommunityIcons name="speedometer" size={20} color="#28a745" />
            <Text style={styles.insightText}>
              Properties selling {current.daysOnMarket < 30 ? 'quickly' :
                                 current.daysOnMarket > 60 ? 'slowly' : 'at normal pace'}
            </Text>
          </View>

          <View style={styles.insightCard}>
            <MaterialCommunityIcons name="trending-up" size={20} color="#007bff" />
            <Text style={styles.insightText}>
              {volumeChange > 10 ? 'High sales volume indicates strong demand' :
               volumeChange < -10 ? 'Declining sales volume suggests market cooling' :
               'Stable sales volume with consistent demand'}
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 6,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  trendsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  trendsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  trendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendLabel: {
    fontSize: 14,
    color: '#495057',
  },
  trendValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  healthSection: {
    marginBottom: 20,
  },
  healthGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  healthItem: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  healthLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  healthValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  healthSubtext: {
    fontSize: 10,
    color: '#6c757d',
    textAlign: 'center',
  },
  insightsSection: {
    marginBottom: 10,
  },
  insightsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  insightCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginRight: 12,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  insightText: {
    fontSize: 12,
    color: '#495057',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});

export default MarketPerformanceChart;