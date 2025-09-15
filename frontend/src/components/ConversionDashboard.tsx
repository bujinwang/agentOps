import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ConversionFunnel from './ConversionFunnel';
import { useConversionTracking } from '../hooks/useConversionTracking';
import {
  ConversionFunnelData,
  ConversionMetrics,
  ConversionFunnelStage
} from '../types/conversion';

const { width: screenWidth } = Dimensions.get('window');

interface ConversionDashboardProps {
  showFilters?: boolean;
  showExport?: boolean;
  enableRealTime?: boolean;
  refreshInterval?: number;
}

interface DashboardFilters {
  dateRange: {
    start: string | null;
    end: string | null;
  };
  agentId?: number;
  propertyType?: string;
  leadSource?: string;
  scoreRange: {
    min: number;
    max: number;
  };
}

const ConversionDashboard: React.FC<ConversionDashboardProps> = ({
  showFilters = true,
  showExport = true,
  enableRealTime = true,
  refreshInterval = 30000
}) => {
  const {
    funnelData,
    metrics,
    analytics,
    isLoadingFunnel,
    isLoadingMetrics,
    isLoadingAnalytics,
    funnelError,
    metricsError,
    analyticsError,
    lastUpdated,
    isRealTimeEnabled,
    refreshAll,
    updateRealTimeEnabled,
    logConversionEvent
  } = useConversionTracking({
    enableRealTimeUpdates: enableRealTime,
    autoRefreshInterval: refreshInterval
  });

  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: {
      start: null,
      end: null
    },
    scoreRange: {
      min: 0,
      max: 100
    }
  });

  const [selectedStage, setSelectedStage] = useState<ConversionFunnelStage | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate key metrics
  const keyMetrics = useMemo(() => {
    if (!funnelData || !metrics) return null;

    return {
      totalLeads: funnelData.totalLeads,
      conversionRate: funnelData.overallConversionRate * 100,
      averageTime: funnelData.averageTimeToConvert,
      topStage: analytics?.stageMetrics?.find(s => s.conversionRate === Math.max(...(analytics.stageMetrics?.map(s => s.conversionRate) || [0])))?.stageName || 'N/A'
    };
  }, [funnelData, metrics, analytics]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAll();
    setIsRefreshing(false);
  };

  // Handle stage selection
  const handleStagePress = (stage: ConversionFunnelStage) => {
    setSelectedStage(stage);
    // Could navigate to detailed stage view or show modal
    Alert.alert(
      `Stage: ${stage.name}`,
      `Leads: ${stage.leadsInStage}\nConversion: ${(stage.conversionRate * 100).toFixed(1)}%\nAvg Time: ${stage.averageDaysInStage.toFixed(1)} days`,
      [{ text: 'OK' }]
    );
  };

  // Handle export
  const handleExport = () => {
    Alert.alert(
      'Export Options',
      'Choose export format:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'PDF Report', onPress: () => exportReport('pdf') },
        { text: 'Excel Data', onPress: () => exportReport('excel') },
        { text: 'CSV Data', onPress: () => exportReport('csv') }
      ]
    );
  };

  const exportReport = (format: string) => {
    // Implementation would integrate with export service
    Alert.alert('Export', `Exporting as ${format.toUpperCase()}...`);
  };

  // Toggle real-time updates
  const toggleRealTime = () => {
    updateRealTimeEnabled(!isRealTimeEnabled);
  };

  // Error display
  const renderError = (error: string | null, title: string) => {
    if (!error) return null;

    return (
      <View style={{
        backgroundColor: '#ffebee',
        padding: 12,
        margin: 8,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#f44336'
      }}>
        <Text style={{ fontSize: 14, color: '#c62828', fontWeight: '600' }}>
          {title}
        </Text>
        <Text style={{ fontSize: 12, color: '#c62828', marginTop: 4 }}>
          {error}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f5f5f5' }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={['#2196F3']}
        />
      }
    >
      {/* Header */}
      <View style={{
        backgroundColor: '#fff',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#333' }}>
              Conversion Dashboard
            </Text>
            {lastUpdated && (
              <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: 'row' }}>
            {/* Real-time toggle */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 8,
                backgroundColor: isRealTimeEnabled ? '#e8f5e8' : '#f5f5f5',
                borderRadius: 20,
                marginRight: 8
              }}
              onPress={toggleRealTime}
            >
              <MaterialIcons
                name={isRealTimeEnabled ? 'sync' : 'sync-disabled'}
                size={16}
                color={isRealTimeEnabled ? '#4CAF50' : '#666'}
              />
              <Text style={{
                fontSize: 12,
                color: isRealTimeEnabled ? '#4CAF50' : '#666',
                marginLeft: 4
              }}>
                Live
              </Text>
            </TouchableOpacity>

            {/* Export button */}
            {showExport && (
              <TouchableOpacity
                style={{
                  padding: 8,
                  backgroundColor: '#2196F3',
                  borderRadius: 20
                }}
                onPress={handleExport}
              >
                <MaterialIcons name="download" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Error Messages */}
      {renderError(funnelError, 'Funnel Data Error')}
      {renderError(metricsError, 'Metrics Error')}
      {renderError(analyticsError, 'Analytics Error')}

      {/* Key Metrics Cards */}
      {keyMetrics && (
        <View style={{
          flexDirection: 'row',
          padding: 16,
          justifyContent: 'space-between'
        }}>
          <View style={{
            flex: 1,
            backgroundColor: '#fff',
            padding: 16,
            marginRight: 8,
            borderRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2
          }}>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
              Total Leads
            </Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#333' }}>
              {keyMetrics.totalLeads.toLocaleString()}
            </Text>
          </View>

          <View style={{
            flex: 1,
            backgroundColor: '#fff',
            padding: 16,
            marginRight: 8,
            borderRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2
          }}>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
              Conversion Rate
            </Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#4CAF50' }}>
              {keyMetrics.conversionRate.toFixed(1)}%
            </Text>
          </View>

          <View style={{
            flex: 1,
            backgroundColor: '#fff',
            padding: 16,
            borderRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2
          }}>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
              Avg Time
            </Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FF9800' }}>
              {keyMetrics.averageTime.toFixed(1)}d
            </Text>
          </View>
        </View>
      )}

      {/* Conversion Funnel */}
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 12 }}>
          Conversion Funnel
        </Text>
        <ConversionFunnel
          funnelData={funnelData}
          isLoading={isLoadingFunnel}
          onStagePress={handleStagePress}
          showMetrics={true}
        />
      </View>

      {/* Analytics Insights */}
      {analytics && (
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 12 }}>
            Analytics Insights
          </Text>

          {/* Bottlenecks */}
          {analytics.bottlenecks.length > 0 && (
            <View style={{
              backgroundColor: '#fff3e0',
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              borderLeftWidth: 4,
              borderLeftColor: '#FF9800'
            }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#e65100', marginBottom: 8 }}>
                ⚠️ Potential Bottlenecks
              </Text>
              {analytics.bottlenecks.map((bottleneck, index) => (
                <Text key={index} style={{ fontSize: 14, color: '#e65100', marginBottom: 4 }}>
                  • {bottleneck}
                </Text>
              ))}
            </View>
          )}

          {/* Recommendations */}
          {analytics.recommendations.length > 0 && (
            <View style={{
              backgroundColor: '#e8f5e8',
              padding: 12,
              borderRadius: 8,
              borderLeftWidth: 4,
              borderLeftColor: '#4CAF50'
            }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#2e7d32', marginBottom: 8 }}>
                💡 Recommendations
              </Text>
              {analytics.recommendations.map((recommendation, index) => (
                <Text key={index} style={{ fontSize: 14, color: '#2e7d32', marginBottom: 4 }}>
                  • {recommendation}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Loading States */}
      {(isLoadingFunnel || isLoadingMetrics || isLoadingAnalytics) && (
        <View style={{
          padding: 20,
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Text style={{ fontSize: 16, color: '#666' }}>
            Updating dashboard data...
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

export default ConversionDashboard;