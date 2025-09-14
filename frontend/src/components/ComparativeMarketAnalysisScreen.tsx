import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Text, Button, Card, FAB, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Property } from '../types/property';
import {
  ComparativeMarketAnalysis,
  CMASearchCriteria,
  CMAStatus,
  ComparableProperty,
} from '../types/cma';
import { cmaApiService } from '../services/cmaApiService';

import ComparablePropertiesList from './ComparablePropertiesList';
import CMAStatisticsCard from './CMAStatisticsCard';
import PriceRangeChart from './PriceRangeChart';
import MarketTrendChart from './MarketTrendChart';
import CMAReportGenerator from './CMAReportGenerator';

interface RouteParams {
  propertyId: number;
  property?: Property;
}

const ComparativeMarketAnalysisScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { propertyId, property } = route.params as RouteParams;

  const [cma, setCma] = useState<ComparativeMarketAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'comparables' | 'trends' | 'report'>('overview');

  useEffect(() => {
    loadCMA();
  }, [propertyId]);

  const loadCMA = async () => {
    try {
      setLoading(true);
      const response = await cmaApiService.getCMAAnalysis(propertyId.toString());

      if (response.success && response.data) {
        setCma(response.data);
      } else {
        // If no CMA exists, create one
        await createNewCMA();
      }
    } catch (error) {
      console.error('Error loading CMA:', error);
      Alert.alert('Error', 'Failed to load comparative market analysis');
    } finally {
      setLoading(false);
    }
  };

  const createNewCMA = async () => {
    try {
      const searchCriteria: Partial<CMASearchCriteria> = {
        subject_property_id: propertyId,
        search_radius_miles: 1.0,
        max_comparables: 6,
        date_range: {
          start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months ago
          end: new Date().toISOString().split('T')[0],
        },
        property_types: property ? [property.property_type] : [],
        min_bedrooms: property?.details?.bedrooms ? property.details.bedrooms - 1 : undefined,
        max_bedrooms: property?.details?.bedrooms ? property.details.bedrooms + 1 : undefined,
        min_bathrooms: property?.details?.bathrooms ? property.details.bathrooms - 1 : undefined,
        max_bathrooms: property?.details?.bathrooms ? property.details.bathrooms + 1 : undefined,
        min_square_feet: property?.details?.square_feet ? property.details.square_feet * 0.8 : undefined,
        max_square_feet: property?.details?.square_feet ? property.details.square_feet * 1.2 : undefined,
        min_data_quality_score: 70,
        require_verified_only: true,
        exclude_distressed_sales: true,
      };

      const response = await cmaApiService.createCMAAnalysis({
        subject_property_id: propertyId,
        search_criteria: searchCriteria,
      });

      if (response.success && response.data) {
        setCma(response.data);
      }
    } catch (error) {
      console.error('Error creating CMA:', error);
      Alert.alert('Error', 'Failed to create comparative market analysis');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCMA();
    setRefreshing(false);
  };

  const updateCMAStatus = async (status: CMAStatus) => {
    if (!cma) return;

    try {
      const response = await cmaApiService.updateCMAAnalysis(cma.id, { status });
      if (response.success && response.data) {
        setCma(response.data);
      }
    } catch (error) {
      console.error('Error updating CMA status:', error);
      Alert.alert('Error', 'Failed to update CMA status');
    }
  };

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent}>
      <CMAStatisticsCard
        statistics={cma!.statistics}
        priceRange={cma!.price_range}
        onRefresh={onRefresh}
      />

      <Card style={styles.sectionCard}>
        <Card.Title
          title="Market Position"
          left={(props) => <MaterialCommunityIcons {...props} name="chart-line" />}
        />
        <Card.Content>
          <Text style={styles.marketPosition}>
            Subject Property Value: ${cma!.price_range.subject_property_value?.toLocaleString() || 'Calculating...'}
          </Text>
          <Text style={styles.marketPosition}>
            Estimated Range: ${cma!.price_range.estimated_value_range.low.toLocaleString()} - ${cma!.price_range.estimated_value_range.high.toLocaleString()}
          </Text>
          <Chip
            mode="outlined"
            style={styles.confidenceChip}
            textStyle={styles.confidenceText}
          >
            {cma!.price_range.estimated_value_range.confidence_level.toUpperCase()} CONFIDENCE
          </Chip>
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard}>
        <Card.Title
          title="Key Recommendations"
          left={(props) => <MaterialCommunityIcons {...props} name="lightbulb" />}
        />
        <Card.Content>
          {cma!.recommendations.slice(0, 3).map((rec, index) => (
            <View key={rec.id} style={styles.recommendation}>
              <Text style={styles.recommendationTitle}>{rec.title}</Text>
              <Text style={styles.recommendationDesc}>{rec.description}</Text>
              <View style={styles.recommendationMeta}>
                <Chip mode="outlined">{rec.type}</Chip>
                <Chip mode="outlined">{rec.confidence_level}</Chip>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderComparablesTab = () => (
    <ComparablePropertiesList
      comparables={cma!.comparables}
      subjectProperty={cma!.subject_property}
      onComparableSelect={(comparable) => {
        // Navigate to property detail or show modal
        console.log('Selected comparable:', comparable);
      }}
    />
  );

  const renderTrendsTab = () => (
    <ScrollView style={styles.tabContent}>
      <MarketTrendChart
        trends={cma!.market_trends}
        timeframe="6_months"
      />

      <Card style={styles.sectionCard}>
        <Card.Title
          title="Market Forecast"
          left={(props) => <MaterialCommunityIcons {...props} name="crystal-ball" />}
        />
        <Card.Content>
          <Text style={styles.forecastText}>
            {cma!.market_forecast.forecast_period_months} Month Projection
          </Text>
          <Text style={styles.forecastChange}>
            Expected Change: {cma!.market_forecast.price_projection.expected_change_percentage > 0 ? '+' : ''}
            {cma!.market_forecast.price_projection.expected_change_percentage.toFixed(1)}%
          </Text>
          <Text style={styles.forecastConfidence}>
            Confidence: {cma!.market_forecast.forecast_confidence}
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderReportTab = () => (
    <CMAReportGenerator
      cma={cma!}
      onGenerateReport={(format) => {
        console.log('Generate report in format:', format);
        // Implement report generation
      }}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Analyzing market data...</Text>
      </View>
    );
  }

  if (!cma) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color="#F44336" />
        <Text style={styles.errorText}>Failed to load CMA data</Text>
        <Button mode="contained" onPress={loadCMA}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Comparative Market Analysis</Text>
        <Text style={styles.subtitle}>
          {cma.subject_property.address}, {cma.subject_property.city}
        </Text>
        <View style={styles.statusContainer}>
          <Chip
            mode="outlined"
            style={[styles.statusChip, { borderColor: getStatusColor(cma.analysis_status) }]}
          >
            {cma.analysis_status.toUpperCase()}
          </Chip>
          <Text style={styles.analysisDate}>
            {new Date(cma.analysis_date).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {[
          { key: 'overview', label: 'Overview', icon: 'view-dashboard' },
          { key: 'comparables', label: 'Comparables', icon: 'home-group' },
          { key: 'trends', label: 'Trends', icon: 'trending-up' },
          { key: 'report', label: 'Report', icon: 'file-chart' },
        ].map((tab) => (
          <Button
            key={tab.key}
            mode={activeTab === tab.key ? 'contained' : 'outlined'}
            onPress={() => setActiveTab(tab.key as any)}
            style={styles.tabButton}
            icon={tab.icon}
          >
            {tab.label}
          </Button>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'comparables' && renderComparablesTab()}
        {activeTab === 'trends' && renderTrendsTab()}
        {activeTab === 'report' && renderReportTab()}
      </View>

      {/* FAB for actions */}
      <FAB
        icon="refresh"
        style={styles.fab}
        onPress={onRefresh}
        loading={refreshing}
      />
    </View>
  );
};

const getStatusColor = (status: CMAStatus): string => {
  switch (status) {
    case 'completed': return '#4CAF50';
    case 'in_progress': return '#FF9800';
    case 'draft': return '#2196F3';
    case 'archived': return '#9E9E9E';
    default: return '#9E9E9E';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusChip: {
    marginRight: 12,
  },
  analysisDate: {
    fontSize: 14,
    color: '#666666',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  contentContainer: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  sectionCard: {
    marginBottom: 16,
  },
  marketPosition: {
    fontSize: 16,
    marginBottom: 8,
  },
  confidenceChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  recommendation: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recommendationDesc: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  recommendationMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  forecastText: {
    fontSize: 16,
    marginBottom: 8,
  },
  forecastChange: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 4,
  },
  forecastConfidence: {
    fontSize: 14,
    color: '#666666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1976D2',
  },
});

export default ComparativeMarketAnalysisScreen;