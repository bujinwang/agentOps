import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { PredictiveTimelineData, TimelinePoint } from '../../../types/dashboard';
import { predictiveAnalyticsService } from '../../../services/predictiveAnalyticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ConversionTimelineProps {
  leadIds: number[];
  timeHorizon?: number; // days
  loading?: boolean;
  onTimelinePointPress?: (point: TimelinePoint, leadId: number) => void;
  height?: number;
}

const ConversionTimeline: React.FC<ConversionTimelineProps> = ({
  leadIds,
  timeHorizon = 90,
  loading = false,
  onTimelinePointPress,
  height = 300,
}) => {
  const [timelineData, setTimelineData] = useState<PredictiveTimelineData[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [animatedValues] = useState<Map<string, Animated.Value>>(
    new Map(leadIds.map(id => [`lead_${id}`, new Animated.Value(0)]))
  );

  // Load timeline data
  useEffect(() => {
    const loadTimelineData = async () => {
      try {
        const data = await predictiveAnalyticsService.generatePredictiveTimeline(
          leadIds,
          timeHorizon
        );
        setTimelineData(data);

        // Animate timeline appearance
        data.forEach((timeline, index) => {
          const animatedValue = animatedValues.get(`lead_${timeline.leadId}`);
          if (animatedValue) {
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: 500,
              delay: index * 100,
              useNativeDriver: true,
            }).start();
          }
        });
      } catch (error) {
        console.error('Failed to load timeline data:', error);
      }
    };

    if (leadIds.length > 0) {
      loadTimelineData();
    }
  }, [leadIds, timeHorizon, animatedValues]);

  // Calculate timeline bounds
  const timelineBounds = useMemo(() => {
    if (timelineData.length === 0) return null;

    const allPoints = timelineData.flatMap(timeline => timeline.timeline);
    const probabilities = allPoints.map(p => p.probability);
    const dates = allPoints.map(p => new Date(p.date).getTime());

    return {
      minProbability: Math.min(...probabilities),
      maxProbability: Math.max(...probabilities),
      startDate: new Date(Math.min(...dates)),
      endDate: new Date(Math.max(...dates)),
    };
  }, [timelineData]);

  // Generate timeline grid lines
  const gridLines = useMemo(() => {
    if (!timelineBounds) return [];

    const lines = [];
    const { minProbability, maxProbability } = timelineBounds;

    // Probability grid lines (0%, 25%, 50%, 75%, 100%)
    for (let i = 0; i <= 4; i++) {
      const probability = i * 0.25;
      const y = ((maxProbability - probability) / (maxProbability - minProbability)) * height;

      lines.push({
        type: 'probability',
        value: probability,
        y: Math.max(0, Math.min(height, y)),
        label: `${Math.round(probability * 100)}%`,
      });
    }

    return lines;
  }, [timelineBounds, height]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Get color for confidence level
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#28a745'; // High confidence - green
    if (confidence >= 0.6) return '#ffc107'; // Medium confidence - yellow
    return '#dc3545'; // Low confidence - red
  };

  // Calculate point position
  const getPointPosition = (point: TimelinePoint) => {
    if (!timelineBounds) return { x: 0, y: 0 };

    const { minProbability, maxProbability, startDate, endDate } = timelineBounds;

    // X position based on date
    const pointDate = new Date(point.date).getTime();
    const totalTime = endDate.getTime() - startDate.getTime();
    const elapsedTime = pointDate - startDate.getTime();
    const x = totalTime > 0 ? (elapsedTime / totalTime) * (SCREEN_WIDTH - 80) : 0;

    // Y position based on probability (inverted)
    const y = ((maxProbability - point.probability) / (maxProbability - minProbability)) * height;

    return { x: Math.max(0, Math.min(SCREEN_WIDTH - 80, x)), y };
  };

  if (loading) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Conversion Timeline</Text>
          <View style={styles.loadingIndicator} />
        </View>
        <Text style={styles.loadingText}>Generating predictive timeline...</Text>
      </View>
    );
  }

  if (timelineData.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Conversion Timeline</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="timeline" size={48} color="#cccccc" />
          <Text style={styles.emptyText}>No timeline data available</Text>
          <Text style={styles.emptySubtext}>
            Select leads to view their conversion predictions
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Conversion Timeline</Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#28a745' }]} />
            <Text style={styles.legendText}>High Confidence</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ffc107' }]} />
            <Text style={styles.legendText}>Medium Confidence</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#dc3545' }]} />
            <Text style={styles.legendText}>Low Confidence</Text>
          </View>
        </View>
      </View>

      <View style={styles.timelineContainer}>
        {/* Grid lines */}
        {gridLines.map((line, index) => (
          <View key={`grid-${index}`} style={[styles.gridLine, { top: line.y }]}>
            <Text style={styles.gridLabel}>{line.label}</Text>
          </View>
        ))}

        {/* Timeline lines for each lead */}
        {timelineData.map((timeline, leadIndex) => {
          const animatedValue = animatedValues.get(`lead_${timeline.leadId}`) || new Animated.Value(1);
          const color = `hsl(${(leadIndex * 137.5) % 360}, 70%, 50%)`; // Generate distinct colors

          return (
            <Animated.View
              key={timeline.leadId}
              style={[
                styles.timelineLine,
                {
                  opacity: animatedValue,
                  transform: [{ scaleY: animatedValue }],
                },
              ]}
            >
              {/* Timeline points */}
              {timeline.timeline.map((point, pointIndex) => {
                const position = getPointPosition(point);
                const isSelected = selectedLeadId === timeline.leadId;

                return (
                  <TouchableOpacity
                    key={`${timeline.leadId}-${pointIndex}`}
                    style={[
                      styles.timelinePoint,
                      {
                        left: position.x,
                        top: position.y,
                        backgroundColor: getConfidenceColor(point.confidence),
                        borderColor: isSelected ? '#007AFF' : 'transparent',
                        borderWidth: isSelected ? 2 : 0,
                        transform: [{ scale: isSelected ? 1.2 : 1 }],
                      },
                    ]}
                    onPress={() => {
                      setSelectedLeadId(timeline.leadId);
                      onTimelinePointPress?.(point, timeline.leadId);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.pointInner} />
                  </TouchableOpacity>
                );
              })}

              {/* Connecting line */}
              <View style={styles.connectingLine}>
                {timeline.timeline.slice(1).map((point, pointIndex) => {
                  const currentPos = getPointPosition(point);
                  const prevPos = getPointPosition(timeline.timeline[pointIndex]);

                  const distance = currentPos.x - prevPos.x;
                  const slope = (currentPos.y - prevPos.y) / distance;
                  const angle = Math.atan(slope) * (180 / Math.PI);

                  return (
                    <View
                      key={`line-${timeline.leadId}-${pointIndex}`}
                      style={[
                        styles.lineSegment,
                        {
                          left: prevPos.x,
                          top: prevPos.y,
                          width: Math.abs(distance),
                          height: 2,
                          backgroundColor: color,
                          transform: [
                            { translateX: distance > 0 ? 0 : -Math.abs(distance) },
                            { rotate: `${angle}deg` },
                          ],
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </Animated.View>
          );
        })}

        {/* Lead labels */}
        <View style={styles.labelsContainer}>
          {timelineData.map((timeline, index) => {
            const animatedValue = animatedValues.get(`lead_${timeline.leadId}`) || new Animated.Value(1);
            const color = `hsl(${(index * 137.5) % 360}, 70%, 50%)`;

            return (
              <Animated.View
                key={`label-${timeline.leadId}`}
                style={[
                  styles.labelItem,
                  {
                    opacity: animatedValue,
                    transform: [{ translateY: animatedValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }) }],
                  },
                ]}
              >
                <View style={[styles.labelDot, { backgroundColor: color }]} />
                <Text style={styles.labelText}>Lead {timeline.leadId}</Text>
                <Text style={styles.confidenceText}>
                  {Math.round(timeline.confidence * 100)}% confidence
                </Text>
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* Timeline controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setSelectedLeadId(null)}
        >
          <Icon name="clear" size={16} color="#666666" />
          <Text style={styles.controlText}>Clear Selection</Text>
        </TouchableOpacity>

        <View style={styles.timeRange}>
          <Text style={styles.timeRangeText}>
            {timelineBounds ? `${formatDate(timelineBounds.startDate.toISOString())} - ${formatDate(timelineBounds.endDate.toISOString())}` : ''}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#666666',
  },
  loadingIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderTopColor: 'transparent',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#666666',
    fontSize: 16,
    marginTop: 8,
  },
  emptySubtext: {
    color: '#999999',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  timelineContainer: {
    position: 'relative',
    flex: 1,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#e9ecef',
  },
  gridLabel: {
    position: 'absolute',
    left: -30,
    top: -8,
    fontSize: 10,
    color: '#666666',
    width: 25,
    textAlign: 'right',
  },
  timelineLine: {
    position: 'absolute',
    left: 40,
    right: 40,
    top: 0,
    bottom: 0,
  },
  timelinePoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  pointInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  connectingLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
  },
  labelsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 120,
  },
  labelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 6,
  },
  labelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  labelText: {
    fontSize: 11,
    color: '#333333',
    flex: 1,
  },
  confidenceText: {
    fontSize: 9,
    color: '#666666',
    marginTop: 2,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  controlText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
  },
  timeRange: {
    flex: 1,
    alignItems: 'center',
  },
  timeRangeText: {
    fontSize: 11,
    color: '#999999',
  },
});

export default ConversionTimeline;