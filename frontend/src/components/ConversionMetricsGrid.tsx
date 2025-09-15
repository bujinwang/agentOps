import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ConversionMetrics } from '../types/conversion';

const { width: screenWidth } = Dimensions.get('window');

interface ConversionMetricsGridProps {
  metrics: ConversionMetrics | null;
  isLoading?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
  trendValue
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'trending-flat';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return '#4CAF50';
      case 'down':
        return '#f44336';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <View style={{
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 16,
      margin: 4,
      minWidth: (screenWidth - 32) / 2 - 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: color + '20',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12
        }}>
          <MaterialIcons name={icon as any} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', fontWeight: '600' }}>
            {title}
          </Text>
          {trend && trendValue !== undefined && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <MaterialIcons
                name={getTrendIcon() as any}
                size={12}
                color={getTrendColor()}
              />
              <Text style={{ fontSize: 10, color: getTrendColor(), marginLeft: 2 }}>
                {Math.abs(trendValue)}%
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Value */}
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>

      {/* Subtitle */}
      {subtitle && (
        <Text style={{ fontSize: 12, color: '#666' }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
};

const ConversionMetricsGrid: React.FC<ConversionMetricsGridProps> = ({
  metrics,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <View style={{
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200
      }}>
        <Text style={{ fontSize: 16, color: '#666' }}>Loading metrics...</Text>
      </View>
    );
  }

  if (!metrics) {
    return (
      <View style={{
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200
      }}>
        <MaterialIcons name="analytics" size={48} color="#ccc" />
        <Text style={{ fontSize: 16, color: '#666', marginTop: 10 }}>
          No metrics data available
        </Text>
      </View>
    );
  }

  // Calculate trends (simplified - would use historical data)
  const conversionTrend = metrics.conversionTrends.length > 1
    ? metrics.conversionTrends[metrics.conversionTrends.length - 1].rate >
      metrics.conversionTrends[metrics.conversionTrends.length - 2].rate
      ? 'up' : 'down'
    : 'stable';

  const conversionTrendValue = metrics.conversionTrends.length > 1
    ? Math.abs(
        ((metrics.conversionTrends[metrics.conversionTrends.length - 1].rate -
          metrics.conversionTrends[metrics.conversionTrends.length - 2].rate) /
          metrics.conversionTrends[metrics.conversionTrends.length - 2].rate) * 100
      )
    : 0;

  const topStage = metrics.topConversionStages[0];

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 16 }}>
        Key Performance Indicators
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {/* Total Conversions */}
        <MetricCard
          title="Total Conversions"
          value={metrics.totalConversions}
          subtitle="Completed sales"
          icon="check-circle"
          color="#4CAF50"
          trend={conversionTrend}
          trendValue={conversionTrendValue}
        />

        {/* Conversion Rate */}
        <MetricCard
          title="Conversion Rate"
          value={`${(metrics.conversionRate * 100).toFixed(1)}%`}
          subtitle="Overall success rate"
          icon="trending-up"
          color="#2196F3"
          trend={conversionTrend}
          trendValue={conversionTrendValue}
        />

        {/* Average Time */}
        <MetricCard
          title="Avg Time to Convert"
          value={`${metrics.averageTimeToConvert.toFixed(1)}d`}
          subtitle="Days from lead to sale"
          icon="schedule"
          color="#FF9800"
        />

        {/* Top Performing Stage */}
        <MetricCard
          title="Top Stage"
          value={topStage?.stage || 'N/A'}
          subtitle={`${topStage?.count || 0} conversions`}
          icon="star"
          color="#9C27B0"
        />
      </View>

      {/* Top Conversion Stages */}
      {metrics.topConversionStages.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 }}>
            Top Performing Stages
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row' }}>
              {metrics.topConversionStages.slice(0, 5).map((stage, index) => (
                <View
                  key={stage.stage}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 8,
                    padding: 12,
                    marginRight: 8,
                    minWidth: 120,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2
                  }}
                >
                  <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                    {stage.stage}
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>
                    {stage.count}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#666' }}>
                    {stage.percentage.toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Conversion Trends */}
      {metrics.conversionTrends.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 }}>
            Conversion Trends
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row' }}>
              {metrics.conversionTrends.slice(-7).map((trend, index) => (
                <View
                  key={trend.date}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 8,
                    padding: 12,
                    marginRight: 8,
                    minWidth: 80,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2
                  }}
                >
                  <Text style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>
                    {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>
                    {trend.conversions}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#666' }}>
                    {(trend.rate * 100).toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default ConversionMetricsGrid;