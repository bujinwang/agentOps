import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ConversionFunnelData, ConversionFunnelStage } from '../types/conversion';

const { width: screenWidth } = Dimensions.get('window');

interface ConversionFunnelProps {
  funnelData: ConversionFunnelData | null;
  isLoading?: boolean;
  onStagePress?: (stage: ConversionFunnelStage) => void;
  showMetrics?: boolean;
}

const ConversionFunnel: React.FC<ConversionFunnelProps> = ({
  funnelData,
  isLoading = false,
  onStagePress,
  showMetrics = true
}) => {
  const maxLeads = useMemo(() => {
    if (!funnelData?.stages?.length) return 0;
    return Math.max(...funnelData.stages.map(stage => stage.leadsInStage));
  }, [funnelData]);

  const getStageColor = (index: number): string => {
    const colors = [
      '#4CAF50', // Green - Lead Created
      '#2196F3', // Blue - Contact Made
      '#FF9800', // Orange - Qualified
      '#9C27B0', // Purple - Showing Scheduled
      '#FF5722', // Red - Showing Completed
      '#795548', // Brown - Offer Submitted
      '#607D8B', // Blue Grey - Offer Accepted
      '#FFD700'  // Gold - Sale Closed
    ];
    return colors[index] || '#9E9E9E';
  };

  const getStageIcon = (stageName: string): string => {
    const iconMap: Record<string, string> = {
      'Lead Created': 'person-add',
      'Contact Made': 'phone',
      'Qualified': 'check-circle',
      'Showing Scheduled': 'calendar-today',
      'Showing Completed': 'home',
      'Offer Submitted': 'attach-money',
      'Offer Accepted': 'thumb-up',
      'Sale Closed': 'celebration'
    };
    return iconMap[stageName] || 'radio-button-unchecked';
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (days: number): string => {
    if (days < 1) {
      return `${Math.round(days * 24)}h`;
    }
    if (days < 30) {
      return `${Math.round(days)}d`;
    }
    return `${(days / 30).toFixed(1)}mo`;
  };

  if (isLoading) {
    return (
      <View style={{
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200
      }}>
        <Text style={{ fontSize: 16, color: '#666' }}>Loading funnel data...</Text>
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
        <MaterialIcons name="show-chart" size={48} color="#ccc" />
        <Text style={{ fontSize: 16, color: '#666', marginTop: 10 }}>
          No funnel data available
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }}>
      {/* Header */}
      <View style={{
        padding: 16,
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef'
      }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>
          {funnelData.funnelName}
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <Text style={{ fontSize: 14, color: '#666', flex: 1 }}>
            Total Leads: {formatNumber(funnelData.totalLeads)}
          </Text>
          <Text style={{ fontSize: 14, color: '#666' }}>
            Conversion Rate: {(funnelData.overallConversionRate * 100).toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Funnel Visualization */}
      <View style={{ padding: 16 }}>
        {funnelData.stages.map((stage, index) => {
          const widthPercentage = maxLeads > 0 ? (stage.leadsInStage / maxLeads) * 100 : 0;
          const stageColor = getStageColor(index);
          const isLastStage = index === funnelData.stages.length - 1;

          return (
            <TouchableOpacity
              key={stage.stage}
              style={{
                marginBottom: 8,
                opacity: onStagePress ? 1 : 0.9
              }}
              onPress={() => onStagePress?.(stage)}
              disabled={!onStagePress}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#fff',
                borderRadius: 8,
                padding: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2
              }}>
                {/* Stage Icon */}
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: stageColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12
                }}>
                  <MaterialIcons
                    name={getStageIcon(stage.name) as any}
                    size={20}
                    color="#fff"
                  />
                </View>

                {/* Stage Info */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', flex: 1 }}>
                      {stage.name}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#666' }}>
                      {formatNumber(stage.leadsInStage)} leads
                    </Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={{
                    height: 8,
                    backgroundColor: '#e9ecef',
                    borderRadius: 4,
                    marginBottom: 8,
                    overflow: 'hidden'
                  }}>
                    <View style={{
                      height: '100%',
                      width: `${Math.max(widthPercentage, 5)}%`,
                      backgroundColor: stageColor,
                      borderRadius: 4
                    }} />
                  </View>

                  {/* Metrics */}
                  {showMetrics && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#666' }}>
                        Rate: {(stage.conversionRate * 100).toFixed(1)}%
                      </Text>
                      <Text style={{ fontSize: 12, color: '#666' }}>
                        Avg Time: {formatTime(stage.averageDaysInStage)}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#666' }}>
                        Value: {formatCurrency(stage.totalValue)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Chevron for touchable stages */}
                {onStagePress && (
                  <MaterialIcons name="chevron-right" size={20} color="#ccc" />
                )}
              </View>

              {/* Connector line (except for last stage) */}
              {!isLastStage && (
                <View style={{
                  height: 20,
                  width: 2,
                  backgroundColor: '#e9ecef',
                  alignSelf: 'center',
                  marginTop: 4
                }} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Summary Footer */}
      <View style={{
        padding: 16,
        backgroundColor: '#f8f9fa',
        borderTopWidth: 1,
        borderTopColor: '#e9ecef'
      }}>
        <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
          Funnel shows conversion flow from lead creation to sale completion
        </Text>
        <Text style={{
          fontSize: 12,
          color: '#999',
          textAlign: 'center',
          marginTop: 4
        }}>
          Tap on any stage for detailed analytics
        </Text>
      </View>
    </ScrollView>
  );
};

export default ConversionFunnel;