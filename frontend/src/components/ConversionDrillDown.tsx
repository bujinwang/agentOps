import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  FlatList
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ConversionFunnelStage, ConversionEvent, ConversionTimeline } from '../types/conversion';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface DrillDownData {
  type: 'stage' | 'lead' | 'timeRange' | 'agent' | 'source';
  title: string;
  data: any;
  metrics?: {
    totalLeads: number;
    conversionRate: number;
    averageTime: number;
    topPerformers?: Array<{ name: string; value: number; percentage: number }>;
  };
}

interface ConversionDrillDownProps {
  isVisible: boolean;
  onClose: () => void;
  drillDownData: DrillDownData | null;
  onLeadSelect?: (leadId: number) => void;
  onStageSelect?: (stage: ConversionFunnelStage) => void;
  onTimeRangeSelect?: (start: string, end: string) => void;
}

interface LeadItem {
  id: number;
  name: string;
  email: string;
  score: number;
  currentStage: string;
  lastActivity: string;
  conversionProbability: number;
}

const ConversionDrillDown: React.FC<ConversionDrillDownProps> = ({
  isVisible,
  onClose,
  drillDownData,
  onLeadSelect,
  onStageSelect,
  onTimeRangeSelect
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'leads' | 'timeline' | 'insights'>('overview');
  const [sortBy, setSortBy] = useState<'score' | 'stage' | 'time' | 'probability'>('score');

  const sortedLeads = useMemo(() => {
    if (!drillDownData?.data?.leads) return [];

    return [...drillDownData.data.leads].sort((a: LeadItem, b: LeadItem) => {
      switch (sortBy) {
        case 'score':
          return b.score - a.score;
        case 'stage':
          return a.currentStage.localeCompare(b.currentStage);
        case 'time':
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        case 'probability':
          return b.conversionProbability - a.conversionProbability;
        default:
          return 0;
      }
    });
  }, [drillDownData?.data?.leads, sortBy]);

  const renderOverviewTab = () => {
    if (!drillDownData?.metrics) return null;

    const { metrics } = drillDownData;

    return (
      <ScrollView style={{ flex: 1 }}>
        {/* Key Metrics */}
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 16 }}>
            Key Metrics
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 16,
              margin: 4,
              minWidth: (screenWidth - 48) / 2 - 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3
            }}>
              <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Total Leads</Text>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#333' }}>
                {metrics.totalLeads.toLocaleString()}
              </Text>
            </View>

            <View style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 16,
              margin: 4,
              minWidth: (screenWidth - 48) / 2 - 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3
            }}>
              <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Conversion Rate</Text>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#4CAF50' }}>
                {(metrics.conversionRate * 100).toFixed(1)}%
              </Text>
            </View>

            <View style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 16,
              margin: 4,
              minWidth: (screenWidth - 48) / 2 - 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3
            }}>
              <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Avg Time</Text>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FF9800' }}>
                {metrics.averageTime.toFixed(1)}d
              </Text>
            </View>
          </View>
        </View>

        {/* Top Performers */}
        {metrics.topPerformers && metrics.topPerformers.length > 0 && (
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 16 }}>
              Top Performers
            </Text>

            {metrics.topPerformers.map((performer, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2
                }}
              >
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#2196F3',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12
                }}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                    {index + 1}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>
                    {performer.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#666' }}>
                    {performer.value} conversions ({performer.percentage.toFixed(1)}%)
                  </Text>
                </View>

                <View style={{
                  width: 60,
                  height: 8,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 4,
                  overflow: 'hidden'
                }}>
                  <View style={{
                    height: '100%',
                    width: `${performer.percentage}%`,
                    backgroundColor: '#4CAF50',
                    borderRadius: 4
                  }} />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderLeadsTab = () => {
    return (
      <View style={{ flex: 1 }}>
        {/* Sort Controls */}
        <View style={{
          backgroundColor: '#fff',
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#e9ecef'
        }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 }}>
            Sort Leads By
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {[
              { key: 'score', label: 'Lead Score' },
              { key: 'stage', label: 'Current Stage' },
              { key: 'time', label: 'Last Activity' },
              { key: 'probability', label: 'Conversion Probability' }
            ].map(option => (
              <TouchableOpacity
                key={option.key}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor: sortBy === option.key ? '#2196F3' : '#f5f5f5',
                  marginRight: 8,
                  marginBottom: 8
                }}
                onPress={() => setSortBy(option.key as any)}
              >
                <Text style={{
                  fontSize: 12,
                  color: sortBy === option.key ? '#fff' : '#666',
                  fontWeight: '500'
                }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Leads List */}
        <FlatList
          data={sortedLeads}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{
                backgroundColor: '#fff',
                margin: 8,
                marginHorizontal: 16,
                borderRadius: 12,
                padding: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2
              }}
              onPress={() => onLeadSelect?.(item.id)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#2196F3',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12
                }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#666' }}>
                    {item.email}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>
                    Score: {item.score}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#666' }}>
                    {(item.conversionProbability * 100).toFixed(0)}% likely
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  backgroundColor: '#e8f5e8',
                  borderRadius: 12
                }}>
                  <Text style={{ fontSize: 12, color: '#2e7d32', fontWeight: '500' }}>
                    {item.currentStage}
                  </Text>
                </View>

                <Text style={{ fontSize: 12, color: '#666' }}>
                  Last: {new Date(item.lastActivity).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{
              padding: 40,
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MaterialIcons name="people" size={48} color="#ccc" />
              <Text style={{ fontSize: 16, color: '#666', marginTop: 10 }}>
                No leads found
              </Text>
            </View>
          }
        />
      </View>
    );
  };

  const renderTimelineTab = () => {
    if (!drillDownData?.data?.timeline) return null;

    const timeline = drillDownData.data.timeline as ConversionTimeline;

    return (
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 16 }}>
            Conversion Timeline
          </Text>

          {timeline.events.map((event, index) => (
            <View
              key={event.id}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                marginBottom: 16
              }}
            >
              {/* Timeline Line */}
              <View style={{
                width: 2,
                backgroundColor: '#2196F3',
                marginRight: 16,
                height: 60,
                marginTop: 8
              }} />

              {/* Event Content */}
              <View style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 16,
                flex: 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#2196F3',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12
                  }}>
                    <MaterialIcons name="event" size={16} color="#fff" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>
                      {event.eventDescription}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#666' }}>
                      {new Date(event.eventTimestamp).toLocaleString()}
                    </Text>
                  </View>
                </View>

                <View style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 12,
                  alignSelf: 'flex-start'
                }}>
                  <Text style={{ fontSize: 12, color: '#666', fontWeight: '500' }}>
                    {event.eventType.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderInsightsTab = () => {
    if (!drillDownData?.data?.insights) return null;

    const insights = drillDownData.data.insights;

    return (
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 16 }}>
            Insights & Recommendations
          </Text>

          {insights.map((insight: any, index: number) => (
            <View
              key={index}
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialIcons
                  name={insight.type === 'opportunity' ? 'lightbulb' : 'warning'}
                  size={20}
                  color={insight.type === 'opportunity' ? '#4CAF50' : '#FF9800'}
                />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#333',
                  marginLeft: 8
                }}>
                  {insight.title}
                </Text>
              </View>

              <Text style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
                {insight.description}
              </Text>

              {insight.recommendation && (
                <View style={{
                  backgroundColor: '#e8f5e8',
                  padding: 12,
                  borderRadius: 8,
                  borderLeftWidth: 4,
                  borderLeftColor: '#4CAF50'
                }}>
                  <Text style={{ fontSize: 14, color: '#2e7d32', fontWeight: '500' }}>
                    💡 {insight.recommendation}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'overview':
        return renderOverviewTab();
      case 'leads':
        return renderLeadsTab();
      case 'timeline':
        return renderTimelineTab();
      case 'insights':
        return renderInsightsTab();
      default:
        return renderOverviewTab();
    }
  };

  if (!isVisible || !drillDownData) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        {/* Header */}
        <View style={{
          backgroundColor: '#fff',
          padding: 16,
          paddingTop: 50,
          borderBottomWidth: 1,
          borderBottomColor: '#e9ecef',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>
              {drillDownData.title}
            </Text>
            <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
              {drillDownData.type.charAt(0).toUpperCase() + drillDownData.type.slice(1)} Details
            </Text>
          </View>

          <TouchableOpacity
            style={{
              padding: 8,
              borderRadius: 20,
              backgroundColor: '#f5f5f5'
            }}
            onPress={onClose}
          >
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={{
          backgroundColor: '#fff',
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: '#e9ecef'
        }}>
          {[
            { key: 'overview', label: 'Overview', icon: 'dashboard' },
            { key: 'leads', label: 'Leads', icon: 'people' },
            { key: 'timeline', label: 'Timeline', icon: 'timeline' },
            { key: 'insights', label: 'Insights', icon: 'insights' }
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={{
                flex: 1,
                padding: 12,
                alignItems: 'center',
                borderBottomWidth: selectedTab === tab.key ? 2 : 0,
                borderBottomColor: selectedTab === tab.key ? '#2196F3' : 'transparent'
              }}
              onPress={() => setSelectedTab(tab.key as any)}
            >
              <MaterialIcons
                name={tab.icon as any}
                size={20}
                color={selectedTab === tab.key ? '#2196F3' : '#666'}
              />
              <Text style={{
                fontSize: 12,
                color: selectedTab === tab.key ? '#2196F3' : '#666',
                marginTop: 4,
                fontWeight: selectedTab === tab.key ? '600' : '400'
              }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {renderTabContent()}
      </View>
    </Modal>
  );
};

export default ConversionDrillDown;