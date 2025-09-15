import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ConversionFunnelData, ConversionFunnelStage } from '../types/conversion';

const { width: screenWidth } = Dimensions.get('window');

interface StageAnalyticsChartProps {
  funnelData: ConversionFunnelData | null;
  isLoading?: boolean;
  onStageSelect?: (stage: ConversionFunnelStage) => void;
  selectedStage?: ConversionFunnelStage | null;
}

interface StageBarProps {
  stage: ConversionFunnelStage;
  maxLeads: number;
  isSelected: boolean;
  onPress: () => void;
}

const StageBar: React.FC<StageBarProps> = ({
  stage,
  maxLeads,
  isSelected,
  onPress
}) => {
  const barWidth = useMemo(() => {
    return maxLeads > 0 ? (stage.leadsInStage / maxLeads) * (screenWidth - 64) : 0;
  }, [stage.leadsInStage, maxLeads]);

  const conversionColor = useMemo(() => {
    const rate = stage.conversionRate;
    if (rate >= 0.8) return '#4CAF50'; // Green - Excellent
    if (rate >= 0.6) return '#8BC34A'; // Light Green - Good
    if (rate >= 0.4) return '#FF9800'; // Orange - Fair
    if (rate >= 0.2) return '#FF5722'; // Red Orange - Poor
    return '#f44336'; // Red - Critical
  }, [stage.conversionRate]);

  const timeColor = useMemo(() => {
    const days = stage.averageDaysInStage;
    if (days <= 3) return '#4CAF50'; // Fast
    if (days <= 7) return '#8BC34A'; // Good
    if (days <= 14) return '#FF9800'; // Slow
    if (days <= 30) return '#FF5722'; // Very Slow
    return '#f44336'; // Critical
  }, [stage.averageDaysInStage]);

  return (
    <TouchableOpacity
      style={{
        backgroundColor: isSelected ? '#f0f8ff' : '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: isSelected ? 2 : 0,
        borderColor: isSelected ? '#2196F3' : 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
      }}
      onPress={onPress}
    >
      {/* Stage Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: conversionColor,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12
        }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
            {stage.order}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>
            {stage.name}
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            {stage.leadsInStage.toLocaleString()} leads
          </Text>
        </View>
        {isSelected && (
          <MaterialIcons name="check-circle" size={20} color="#2196F3" />
        )}
      </View>

      {/* Progress Bar */}
      <View style={{ marginBottom: 12 }}>
        <View style={{
          height: 24,
          backgroundColor: '#f5f5f5',
          borderRadius: 12,
          overflow: 'hidden',
          position: 'relative'
        }}>
          <View style={{
            height: '100%',
            width: Math.max(barWidth, 24),
            backgroundColor: conversionColor,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
              {stage.leadsInStage}
            </Text>
          </View>
        </View>
      </View>

      {/* Metrics Grid */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: conversionColor }}>
            {(stage.conversionRate * 100).toFixed(1)}%
          </Text>
          <Text style={{ fontSize: 10, color: '#666' }}>
            Conversion
          </Text>
        </View>

        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: timeColor }}>
            {stage.averageDaysInStage.toFixed(1)}d
          </Text>
          <Text style={{ fontSize: 10, color: '#666' }}>
            Avg Time
          </Text>
        </View>

        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>
            ${stage.totalValue.toLocaleString()}
          </Text>
          <Text style={{ fontSize: 10, color: '#666' }}>
            Value
          </Text>
        </View>
      </View>

      {/* Performance Indicator */}
      <View style={{ marginTop: 12, alignItems: 'center' }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: stage.conversionRate >= 0.6 ? '#e8f5e8' : '#ffebee',
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 12
        }}>
          <MaterialIcons
            name={stage.conversionRate >= 0.6 ? 'thumb-up' : 'warning'}
            size={12}
            color={stage.conversionRate >= 0.6 ? '#4CAF50' : '#f44336'}
          />
          <Text style={{
            fontSize: 10,
            color: stage.conversionRate >= 0.6 ? '#4CAF50' : '#f44336',
            marginLeft: 4,
            fontWeight: '600'
          }}>
            {stage.conversionRate >= 0.8 ? 'Excellent' :
             stage.conversionRate >= 0.6 ? 'Good' :
             stage.conversionRate >= 0.4 ? 'Fair' :
             stage.conversionRate >= 0.2 ? 'Poor' : 'Critical'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const StageAnalyticsChart: React.FC<StageAnalyticsChartProps> = ({
  funnelData,
  isLoading = false,
  onStageSelect,
  selectedStage
}) => {
  const maxLeads = useMemo(() => {
    if (!funnelData?.stages?.length) return 0;
    return Math.max(...funnelData.stages.map(stage => stage.leadsInStage));
  }, [funnelData]);

  const sortedStages = useMemo(() => {
    if (!funnelData?.stages) return [];
    return [...funnelData.stages].sort((a, b) => a.order - b.order);
  }, [funnelData?.stages]);

  const handleStagePress = (stage: ConversionFunnelStage) => {
    onStageSelect?.(stage);
  };

  if (isLoading) {
    return (
      <View style={{
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200
      }}>
        <Text style={{ fontSize: 16, color: '#666' }}>Loading stage analytics...</Text>
      </View>
    );
  }

  if (!funnelData || !funnelData.stages || funnelData.stages.length === 0) {
    return (
      <View style={{
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200
      }}>
        <MaterialIcons name="bar-chart" size={48} color="#ccc" />
        <Text style={{ fontSize: 16, color: '#666', marginTop: 10 }}>
          No stage data available
        </Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 16 }}>
        Stage-by-Stage Analytics
      </Text>

      {/* Summary Header */}
      <View style={{
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16
      }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 }}>
          {funnelData.funnelName}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 14, color: '#666' }}>
            Total Leads: {funnelData.totalLeads.toLocaleString()}
          </Text>
          <Text style={{ fontSize: 14, color: '#666' }}>
            Overall Rate: {(funnelData.overallConversionRate * 100).toFixed(1)}%
          </Text>
          <Text style={{ fontSize: 14, color: '#666' }}>
            Avg Time: {funnelData.averageTimeToConvert.toFixed(1)} days
          </Text>
        </View>
      </View>

      {/* Stage List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {sortedStages.map((stage) => (
          <StageBar
            key={stage.stage}
            stage={stage}
            maxLeads={maxLeads}
            isSelected={selectedStage?.stage === stage.stage}
            onPress={() => handleStagePress(stage)}
          />
        ))}
      </ScrollView>

      {/* Legend */}
      <View style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
      }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 12 }}>
          Performance Indicators
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 8 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50', marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: '#666' }}>Excellent (80%+)</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 8 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#8BC34A', marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: '#666' }}>Good (60-79%)</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 8 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF9800', marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: '#666' }}>Fair (40-59%)</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 8 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF5722', marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: '#666' }}>Poor (20-39%)</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#f44336', marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: '#666' }}>Critical (<20%)</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default StageAnalyticsChart;