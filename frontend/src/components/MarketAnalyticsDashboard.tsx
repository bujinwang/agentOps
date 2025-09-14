import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Card, Text, Button, Chip, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { marketAnalyticsService } from '../services/marketAnalyticsService';
import {
  MarketTrend,
  MarketTimeframe,
  CMAMetricType,
  NeighborhoodAnalysis,
} from '../types/cma';

interface MarketAnalyticsDashboardProps {
  location: {
    latitude: number;
    longitude: number;
    radius?: number;
  };
  onAnalyticsUpdate?: (data: any) => void;
}

const MarketAnalyticsDashboard: React.FC<MarketAnalyticsDashboardProps> = ({
  location,
  onAnalyticsUpdate,
}) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'trends' | 'neighborhood' | 'seasonal' | 'forecast' | 'economic'>('trends');

  // Data states
  const [trendsData, setTrendsData] = useState<any>(null);
  const [neighborhoodData, setNeighborhoodData] = useState<any>(null);
  const [seasonalData, setSeasonalData] = useState<any>(null);
  const [forecastData, setForecastData] = useState<any>(null);
  const [economicData, setEconomicData] = useState<any>(null);

  useEffect(() => {
    loadAnalyticsData();
  }, [location]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Load all analytics data in parallel
      const [trends, neighborhood, seasonal, forecast, economic] = await Promise.all([
        marketAnalyticsService.getMarketTrendsAnalysis(location),
        marketAnalyticsService.generateNeighborhoodReport(location),
        marketAnalyticsService.getSeasonalAnalysis(location),
        marketAnalyticsService.generateMarketForecast(location),
        marketAnalyticsService.getEconomicIndicators(location),
      ]);

      if (trends.success) setTrendsData(trends.data);
      if (neighborhood.success) setNeighborhoodData(neighborhood.data);
      if (seasonal.success) setSeasonalData(seasonal.data);
      if (forecast.success) setForecastData(forecast.data);
      if (economic.success) setEconomicData(economic.data);

      if (onAnalyticsUpdate) {
        onAnalyticsUpdate({
          trends: trends.data,
          neighborhood: neighborhood.data,
          seasonal: seasonal.data,
          forecast: forecast.data,
          economic: economic.data,
        });
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
      Alert.alert('Error', 'Failed to load market analytics data');
    } finally {
      setLoading(false);
    }
  };

  const renderTrendsTab = () => {
    if (!trendsData) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No trends data available</Text>
        </View>
      );
    }

    const { trends, analysis } = trendsData;

    return (
      <ScrollView style={styles.tabContent}>
        {/* Overall Direction */}
        <Card style={styles.card}>
          <Card.Title
            title="Market Direction"
            left={(props) => <MaterialCommunityIcons {...props} name="chart-line" />}
          />
          <Card.Content>
            <View style={styles.directionContainer}>
              <Chip
                mode="outlined"
                style={[styles.directionChip, {
                  borderColor: getDirectionColor(analysis.overall_direction)
                }]}
                textStyle={{ color: getDirectionColor(analysis.overall_direction) }}
              >
                {analysis.overall_direction.toUpperCase()}
              </Chip>
              <Text style={styles.confidenceText}>
                Confidence: {analysis.confidence_level}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Key Insights */}
        <Card style={styles.card}>
          <Card.Title
            title="Key Insights"
            left={(props) => <MaterialCommunityIcons {...props} name="lightbulb" />}
          />
          <Card.Content>
            {analysis.key_insights.map((insight: string, index: number) => (
              <View key={index} style={styles.insight}>
                <MaterialCommunityIcons name="circle-small" size={16} color="#1976D2" />
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Seasonal Patterns */}
        <Card style={styles.card}>
          <Card.Title
            title="Seasonal Patterns"
            left={(props) => <MaterialCommunityIcons {...props} name="calendar" />}
          />
          <Card.Content>
            <View style={styles.seasonalContainer}>
              <View style={styles.seasonalItem}>
                <Text style={styles.seasonalLabel}>Peak Months:</Text>
                <Text style={styles.seasonalValue}>
                  {analysis.seasonal_patterns.peak_months.map((m: number) =>
                    new Date(2024, m - 1, 1).toLocaleString('default', { month: 'short' })
                  ).join(', ')}
                </Text>
              </View>
              <View style={styles.seasonalItem}>
                <Text style={styles.seasonalLabel}>Low Months:</Text>
                <Text style={styles.seasonalValue}>
                  {analysis.seasonal_patterns.low_months.map((m: number) =>
                    new Date(2024, m - 1, 1).toLocaleString('default', { month: 'short' })
                  ).join(', ')}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    );
  };

  const renderNeighborhoodTab = () => {
    if (!neighborhoodData) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No neighborhood data available</Text>
        </View>
      );
    }

    const { neighborhood, market_report } = neighborhoodData;

    return (
      <ScrollView style={styles.tabContent}>
        {/* Neighborhood Overview */}
        <Card style={styles.card}>
          <Card.Title
            title={neighborhood.neighborhood_name || 'Neighborhood Analysis'}
            left={(props) => <MaterialCommunityIcons {...props} name="home-group" />}
          />
          <Card.Content>
            <View style={styles.neighborhoodStats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>${neighborhood.market_metrics.average_price_per_sqft.toFixed(0)}</Text>
                <Text style={styles.statLabel}>Avg Price/Sqft</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{neighborhood.market_metrics.average_days_on_market}</Text>
                <Text style={styles.statLabel}>Avg DOM</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{neighborhood.neighborhood_rating}/10</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* SWOT Analysis */}
        <Card style={styles.card}>
          <Card.Title
            title="SWOT Analysis"
            left={(props) => <MaterialCommunityIcons {...props} name="chart-pie" />}
          />
          <Card.Content>
            <View style={styles.swotContainer}>
              <View style={styles.swotSection}>
                <Text style={[styles.swotTitle, { color: '#4CAF50' }]}>Strengths</Text>
                {market_report.strengths.map((strength: string, index: number) => (
                  <Text key={index} style={styles.swotItem}>• {strength}</Text>
                ))}
              </View>

              <View style={styles.swotSection}>
                <Text style={[styles.swotTitle, { color: '#F44336' }]}>Weaknesses</Text>
                {market_report.weaknesses.map((weakness: string, index: number) => (
                  <Text key={index} style={styles.swotItem}>• {weakness}</Text>
                ))}
              </View>

              <View style={styles.swotSection}>
                <Text style={[styles.swotTitle, { color: '#FF9800' }]}>Opportunities</Text>
                {market_report.opportunities.map((opportunity: string, index: number) => (
                  <Text key={index} style={styles.swotItem}>• {opportunity}</Text>
                ))}
              </View>

              <View style={styles.swotSection}>
                <Text style={[styles.swotTitle, { color: '#9C27B0' }]}>Threats</Text>
                {market_report.threats.map((threat: string, index: number) => (
                  <Text key={index} style={styles.swotItem}>• {threat}</Text>
                ))}
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    );
  };

  const renderSeasonalTab = () => {
    if (!seasonalData) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No seasonal data available</Text>
        </View>
      );
    }

    const { seasonal_patterns, insights } = seasonalData;

    return (
      <ScrollView style={styles.tabContent}>
        {/* Seasonal Patterns */}
        <Card style={styles.card}>
          <Card.Title
            title="Seasonal Performance"
            left={(props) => <MaterialCommunityIcons {...props} name="calendar-clock" />}
          />
          <Card.Content>
            <View style={styles.seasonalPatterns}>
              <View style={styles.patternSection}>
                <Text style={styles.patternTitle}>Peak Season</Text>
                <Text style={styles.patternMonths}>
                  {seasonal_patterns.peak_season.months.map((m: number) =>
                    new Date(2024, m - 1, 1).toLocaleString('default', { month: 'short' })
                  ).join(', ')}
                </Text>
                <Text style={styles.patternPerformance}>
                  Avg Performance: {seasonal_patterns.peak_season.average_performance.toFixed(1)}%
                </Text>
              </View>

              <View style={styles.patternSection}>
                <Text style={styles.patternTitle}>Off Season</Text>
                <Text style={styles.patternMonths}>
                  {seasonal_patterns.off_season.months.map((m: number) =>
                    new Date(2024, m - 1, 1).toLocaleString('default', { month: 'short' })
                  ).join(', ')}
                </Text>
                <Text style={styles.patternPerformance}>
                  Avg Performance: {seasonal_patterns.off_season.average_performance.toFixed(1)}%
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Seasonal Adjustments */}
        <Card style={styles.card}>
          <Card.Title
            title="Monthly Adjustments"
            left={(props) => <MaterialCommunityIcons {...props} name="percent" />}
          />
          <Card.Content>
            <View style={styles.adjustmentsGrid}>
              {Object.entries(seasonal_patterns.seasonal_adjustments).map(([month, adjustment]) => (
                <View key={month} style={styles.adjustmentItem}>
                  <Text style={styles.adjustmentMonth}>
                    {new Date(2024, parseInt(month) - 1, 1).toLocaleString('default', { month: 'short' })}
                  </Text>
                  <Text style={[styles.adjustmentValue, {
                    color: (adjustment as number) > 0 ? '#4CAF50' : '#F44336'
                  }]}>
                    {(adjustment as number) > 0 ? '+' : ''}{(adjustment as number).toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Seasonal Insights */}
        <Card style={styles.card}>
          <Card.Title
            title="Seasonal Insights"
            left={(props) => <MaterialCommunityIcons {...props} name="lightbulb-outline" />}
          />
          <Card.Content>
            {insights.map((insight: string, index: number) => (
              <View key={index} style={styles.insight}>
                <MaterialCommunityIcons name="circle-small" size={16} color="#1976D2" />
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      </ScrollView>
    );
  };

  const renderForecastTab = () => {
    if (!forecastData) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No forecast data available</Text>
        </View>
      );
    }

    const { forecast, economic_indicators, risk_assessment, scenarios } = forecastData;

    return (
      <ScrollView style={styles.tabContent}>
        {/* Main Forecast */}
        <Card style={styles.card}>
          <Card.Title
            title={`${forecast.forecast_period_months} Month Forecast`}
            left={(props) => <MaterialCommunityIcons {...props} name="crystal-ball" />}
          />
          <Card.Content>
            <View style={styles.forecastMain}>
              <Text style={styles.forecastChange}>
                Expected Change: {forecast.price_projection.expected_change_percentage > 0 ? '+' : ''}
                {forecast.price_projection.expected_change_percentage.toFixed(1)}%
              </Text>
              <Text style={styles.forecastRange}>
                Range: {forecast.price_projection.confidence_interval.low.toFixed(1)}% to {forecast.price_projection.confidence_interval.high.toFixed(1)}%
              </Text>
              <Chip
                mode="outlined"
                style={[styles.sentimentChip, {
                  borderColor: getDirectionColor(forecast.price_projection.direction)
                }]}
              >
                {forecast.price_projection.direction.toUpperCase()}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Economic Indicators */}
        <Card style={styles.card}>
          <Card.Title
            title="Economic Indicators"
            left={(props) => <MaterialCommunityIcons {...props} name="chart-bar" />}
          />
          <Card.Content>
            <View style={styles.economicGrid}>
              <View style={styles.economicItem}>
                <Text style={styles.economicLabel}>Interest Rates</Text>
                <Text style={styles.economicValue}>{economic_indicators.interest_rates.current}%</Text>
                <Text style={styles.economicTrend}>
                  Predicted: {economic_indicators.interest_rates.predicted[0]}%
                </Text>
              </View>

              <View style={styles.economicItem}>
                <Text style={styles.economicLabel}>Employment</Text>
                <Text style={styles.economicValue}>{economic_indicators.employment.current_rate}%</Text>
                <Chip mode="outlined">
                  {economic_indicators.employment.trend}
                </Chip>
              </View>

              <View style={styles.economicItem}>
                <Text style={styles.economicLabel}>GDP Growth</Text>
                <Text style={styles.economicValue}>{economic_indicators.economic_growth.gdp_growth}%</Text>
                <Text style={styles.economicTrend}>
                  Forecast: {economic_indicators.economic_growth.forecast[0]}%
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Risk Assessment */}
        <Card style={styles.card}>
          <Card.Title
            title="Risk Assessment"
            left={(props) => <MaterialCommunityIcons {...props} name="shield-alert" />}
          />
          <Card.Content>
            <View style={styles.riskContainer}>
              <Chip
                mode="outlined"
                style={[styles.riskChip, {
                  borderColor: risk_assessment.overall_risk === 'high' ? '#F44336' :
                               risk_assessment.overall_risk === 'medium' ? '#FF9800' : '#4CAF50'
                }]}
              >
                {risk_assessment.overall_risk.toUpperCase()} RISK
              </Chip>

              <Text style={styles.riskTitle}>Key Risk Factors:</Text>
              {risk_assessment.risk_factors.slice(0, 3).map((risk: any, index: number) => (
                <View key={index} style={styles.riskFactor}>
                  <Text style={styles.riskName}>{risk.name}</Text>
                  <Text style={styles.riskDetails}>
                    Probability: {risk.probability}%, Impact: {risk.impact}
                  </Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    );
  };

  const renderEconomicTab = () => {
    if (!economicData) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No economic data available</Text>
        </View>
      );
    }

    const { national_indicators, regional_indicators, market_drivers, analysis } = economicData;

    return (
      <ScrollView style={styles.tabContent}>
        {/* Market Sentiment */}
        <Card style={styles.card}>
          <Card.Title
            title="Market Sentiment"
            left={(props) => <MaterialCommunityIcons {...props} name="gauge" />}
          />
          <Card.Content>
            <View style={styles.sentimentContainer}>
              <Chip
                mode="outlined"
                style={[styles.sentimentChip, {
                  borderColor: analysis.overall_market_sentiment === 'bullish' ? '#4CAF50' :
                               analysis.overall_market_sentiment === 'bearish' ? '#F44336' : '#FF9800'
                }]}
                textStyle={{
                  color: analysis.overall_market_sentiment === 'bullish' ? '#4CAF50' :
                         analysis.overall_market_sentiment === 'bearish' ? '#F44336' : '#FF9800'
                }}
              >
                {analysis.overall_market_sentiment.toUpperCase()}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* National Indicators */}
        <Card style={styles.card}>
          <Card.Title
            title="National Economic Indicators"
            left={(props) => <MaterialCommunityIcons {...props} name="earth" />}
          />
          <Card.Content>
            <View style={styles.indicatorsGrid}>
              <View style={styles.indicator}>
                <Text style={styles.indicatorLabel}>Inflation Rate</Text>
                <Text style={styles.indicatorValue}>{national_indicators.inflation_rate}%</Text>
              </View>
              <View style={styles.indicator}>
                <Text style={styles.indicatorLabel}>Unemployment</Text>
                <Text style={styles.indicatorValue}>{national_indicators.unemployment_rate}%</Text>
              </View>
              <View style={styles.indicator}>
                <Text style={styles.indicatorLabel}>GDP Growth</Text>
                <Text style={styles.indicatorValue}>{national_indicators.gdp_growth}%</Text>
              </View>
              <View style={styles.indicator}>
                <Text style={styles.indicatorLabel}>Housing Starts</Text>
                <Text style={styles.indicatorValue}>{national_indicators.housing_starts.toLocaleString()}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Market Drivers */}
        <Card style={styles.card}>
          <Card.Title
            title="Key Market Drivers"
            left={(props) => <MaterialCommunityIcons {...props} name="cog" />}
          />
          <Card.Content>
            {market_drivers.slice(0, 5).map((driver: any, index: number) => (
              <View key={index} style={styles.driver}>
                <View style={styles.driverHeader}>
                  <Text style={styles.driverName}>{driver.name}</Text>
                  <View style={styles.driverBadges}>
                    <Chip mode="outlined">
                      {driver.strength}
                    </Chip>
                    <Chip mode="outlined" style={{
                      borderColor: driver.impact_on_housing === 'positive' ? '#4CAF50' : '#F44336'
                    }}>
                      {driver.impact_on_housing}
                    </Chip>
                  </View>
                </View>
                <Text style={styles.driverValue}>
                  Current: {driver.current_value}
                  {driver.trend !== 'stable' && ` (${driver.trend})`}
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      </ScrollView>
    );
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'up': return '#4CAF50';
      case 'down': return '#F44336';
      case 'stable': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Analyzing market data...</Text>
        <ProgressBar indeterminate style={styles.loadingBar} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {[
          { key: 'trends', label: 'Trends', icon: 'chart-line' },
          { key: 'neighborhood', label: 'Neighborhood', icon: 'home-group' },
          { key: 'seasonal', label: 'Seasonal', icon: 'calendar' },
          { key: 'forecast', label: 'Forecast', icon: 'crystal-ball' },
          { key: 'economic', label: 'Economic', icon: 'earth' },
        ].map((tab) => (
          <Button
            key={tab.key}
            mode={activeTab === tab.key ? 'contained' : 'outlined'}
            onPress={() => setActiveTab(tab.key as any)}
            style={styles.tabButton}
            icon={tab.icon}
            compact
          >
            {tab.label}
          </Button>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {activeTab === 'trends' && renderTrendsTab()}
        {activeTab === 'neighborhood' && renderNeighborhoodTab()}
        {activeTab === 'seasonal' && renderSeasonalTab()}
        {activeTab === 'forecast' && renderForecastTab()}
        {activeTab === 'economic' && renderEconomicTab()}
      </View>

      {/* Refresh Button */}
      <Button
        mode="contained"
        onPress={loadAnalyticsData}
        style={styles.refreshButton}
        icon="refresh"
        loading={loading}
      >
        Refresh Analytics
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 2,
  },
  contentContainer: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  loadingBar: {
    marginTop: 16,
    width: 200,
  },
  directionContainer: {
    alignItems: 'center',
  },
  directionChip: {
    marginBottom: 8,
  },
  confidenceText: {
    fontSize: 14,
    color: '#666666',
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
    marginLeft: 8,
  },
  seasonalContainer: {
    gap: 16,
  },
  seasonalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seasonalLabel: {
    fontSize: 14,
    color: '#666666',
  },
  seasonalValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1976D2',
  },
  neighborhoodStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  swotContainer: {
    gap: 16,
  },
  swotSection: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
  },
  swotTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  swotItem: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
  },
  seasonalPatterns: {
    gap: 16,
  },
  patternSection: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
  },
  patternTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  patternMonths: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
  },
  patternPerformance: {
    fontSize: 14,
    color: '#666666',
  },
  adjustmentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  adjustmentItem: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  adjustmentMonth: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  adjustmentValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  forecastMain: {
    alignItems: 'center',
  },
  forecastChange: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  forecastRange: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  sentimentChip: {
    backgroundColor: 'transparent',
  },
  economicGrid: {
    gap: 16,
  },
  economicItem: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
  },
  economicLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  economicValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 4,
  },
  economicTrend: {
    fontSize: 12,
    color: '#999999',
  },
  riskContainer: {
    gap: 12,
  },
  riskChip: {
    alignSelf: 'flex-start',
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  riskFactor: {
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 6,
  },
  riskName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
  },
  riskDetails: {
    fontSize: 12,
    color: '#666666',
  },
  sentimentContainer: {
    alignItems: 'center',
  },
  indicatorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  indicator: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 120,
  },
  indicatorLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  indicatorValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  driver: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    flex: 1,
  },
  driverBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  driverValue: {
    fontSize: 14,
    color: '#333333',
  },
  refreshButton: {
    margin: 16,
  },
});

export default MarketAnalyticsDashboard;