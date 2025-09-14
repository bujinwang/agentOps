import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ConversionTimeline as TimelineData, ConversionEvent } from '../types/conversion';

const { width: screenWidth } = Dimensions.get('window');

interface ConversionTimelineProps {
  timeline: TimelineData | null;
  isLoading?: boolean;
  onEventPress?: (event: ConversionEvent) => void;
  maxHeight?: number;
}

const ConversionTimeline: React.FC<ConversionTimelineProps> = ({
  timeline,
  isLoading = false,
  onEventPress,
  maxHeight = 400
}) => {
  const sortedEvents = useMemo(() => {
    if (!timeline?.events) return [];
    return [...timeline.events].sort((a, b) =>
      new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime()
    );
  }, [timeline]);

  const getEventIcon = (eventType: string): string => {
    const iconMap: Record<string, string> = {
      'contact_made': 'phone',
      'qualified': 'check-circle',
      'showing_scheduled': 'calendar-today',
      'showing_completed': 'home',
      'offer_submitted': 'attach-money',
      'offer_accepted': 'thumb-up',
      'sale_closed': 'celebration'
    };
    return iconMap[eventType] || 'radio-button-unchecked';
  };

  const getEventColor = (eventType: string): string => {
    const colorMap: Record<string, string> = {
      'contact_made': '#4CAF50',
      'qualified': '#2196F3',
      'showing_scheduled': '#FF9800',
      'showing_completed': '#9C27B0',
      'offer_submitted': '#FF5722',
      'offer_accepted': '#795548',
      'sale_closed': '#FFD700'
    };
    return colorMap[eventType] || '#9E9E9E';
  };

  const formatEventDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatEventType = (eventType: string): string => {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <View style={{
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200
      }}>
        <Text style={{ fontSize: 16, color: '#666' }}>Loading timeline...</Text>
      </View>
    );
  }

  if (!timeline || !sortedEvents.length) {
    return (
      <View style={{
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200
      }}>
        <MaterialIcons name="timeline" size={48} color="#ccc" />
        <Text style={{ fontSize: 16, color: '#666', marginTop: 10 }}>
          No conversion events yet
        </Text>
        <Text style={{ fontSize: 14, color: '#999', marginTop: 5, textAlign: 'center' }}>
          Events will appear here as the lead progresses through the conversion funnel
        </Text>
      </View>
    );
  }

  return (
    <View style={{
      backgroundColor: '#fff',
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <View style={{
        padding: 16,
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef'
      }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>
          Conversion Timeline
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
          {sortedEvents.length} event{sortedEvents.length !== 1 ? 's' : ''} • Lead #{timeline.leadId}
        </Text>
      </View>

      {/* Timeline */}
      <ScrollView style={{ maxHeight }}>
        <View style={{ padding: 16 }}>
          {sortedEvents.map((event, index) => {
            const isLastEvent = index === sortedEvents.length - 1;
            const eventColor = getEventColor(event.eventType);

            return (
              <View key={event.id} style={{ flexDirection: 'row', marginBottom: 16 }}>
                {/* Timeline line and dot */}
                <View style={{ width: 40, alignItems: 'center' }}>
                  <View style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: eventColor,
                    borderWidth: 2,
                    borderColor: '#fff',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2,
                    shadowRadius: 1,
                    elevation: 2
                  }} />
                  {!isLastEvent && (
                    <View style={{
                      width: 2,
                      height: 40,
                      backgroundColor: '#e9ecef',
                      marginTop: 8
                    }} />
                  )}
                </View>

                {/* Event content */}
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#f8f9fa',
                    borderRadius: 8,
                    padding: 12,
                    marginLeft: 12,
                    borderLeftWidth: 3,
                    borderLeftColor: eventColor,
                    opacity: onEventPress ? 1 : 0.9
                  }}
                  onPress={() => onEventPress?.(event)}
                  disabled={!onEventPress}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: eventColor,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 8
                    }}>
                      <MaterialIcons
                        name={getEventIcon(event.eventType) as any}
                        size={14}
                        color="#fff"
                      />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', flex: 1 }}>
                      {formatEventType(event.eventType)}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#666' }}>
                      {formatEventDate(event.eventTimestamp)}
                    </Text>
                  </View>

                  <Text style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
                    {event.eventDescription}
                  </Text>

                  {/* Event data preview */}
                  {event.eventData && Object.keys(event.eventData).length > 0 && (
                    <View style={{
                      backgroundColor: '#fff',
                      borderRadius: 6,
                      padding: 8,
                      marginTop: 8
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>
                        Event Details:
                      </Text>
                      {Object.entries(event.eventData).slice(0, 3).map(([key, value]) => (
                        <Text key={key} style={{ fontSize: 12, color: '#666' }}>
                          <Text style={{ fontWeight: '600' }}>{key}:</Text> {String(value)}
                        </Text>
                      ))}
                      {Object.keys(event.eventData).length > 3 && (
                        <Text style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>
                          ... and {Object.keys(event.eventData).length - 3} more details
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Action indicator for touchable events */}
                  {onEventPress && (
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 8
                    }}>
                      <Text style={{ fontSize: 12, color: '#1976D2', fontWeight: '600' }}>
                        Tap for details
                      </Text>
                      <MaterialIcons name="chevron-right" size={14} color="#1976D2" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={{
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
        alignItems: 'center'
      }}>
        <Text style={{ fontSize: 12, color: '#666' }}>
          Timeline shows the complete conversion journey
        </Text>
      </View>
    </View>
  );
};

export default ConversionTimeline;