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
import { DealValuePrediction as DealValuePredictionType, ComparableDeal } from '../../../types/dashboard';
import { predictiveAnalyticsService } from '../../../services/predictiveAnalyticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DealValuePredictionProps {
  leadId: number;
  prediction?: DealValuePredictionType;
  loading?: boolean;
  onComparablePress?: (comparable: ComparableDeal) => void;
  compact?: boolean;
}

const DealValuePrediction: React.FC<DealValuePredictionProps> = ({
  leadId,
  prediction: initialPrediction,
  loading = false,
  onComparablePress,
  compact = false,
}) => {
  const [prediction, setPrediction] = useState<DealValuePredictionType | undefined>(initialPrediction);
  const [animatedValue] = useState(new Animated.Value(0));

  // Load prediction data if not provided
  useEffect(() => {
    const loadPrediction = async () => {
      if (!initialPrediction && leadId) {
        try {
          const analytics = await predictiveAnalyticsService.generatePredictiveAnalytics(leadId, {
            includeValue: true,
          });
          setPrediction(analytics.dealValuePrediction);
        } catch (error) {
          console.error('Failed to load deal value prediction:', error);
        }
      }
    };

    loadPrediction();
  }, [leadId, initialPrediction]);

  // Animate on data load
  useEffect(() => {
    if (prediction) {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [prediction, animatedValue]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#28a745';
    if (confidence >= 0.6) return '#ffc107';
    return '#dc3545';
  };

  // Get confidence level text
  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  // Calculate range width for visualization
  const rangeWidth = useMemo(() => {
    if (!prediction) return 0;
    const { range } = prediction;
    return ((range.max - range.min) / range.max) * 100;
  }, [prediction]);

  // Calculate position of estimated value within range
  const estimatedPosition = useMemo(() => {
    if (!prediction) return 0;
    const { estimatedValue, range } = prediction;
    const totalRange = range.max - range.min;
    const position = (estimatedValue - range.min) / totalRange;
    return Math.max(0, Math.min(100, position * 100));
  }, [prediction]);

  if (loading || !prediction) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <View style={styles.header}>
          <Text style={[styles.title, compact && styles.compactTitle]}>
            Deal Value Prediction
          </Text>
          <View style={styles.loadingIndicator} />
        </View>
        <Text style={styles.loadingText}>
          {loading ? 'Analyzing deal value...' : 'Loading prediction data...'}
        </Text>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        compact && styles.compactContainer,
        { opacity: animatedValue },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, compact && styles.compactTitle]}>
          Deal Value Prediction
        </Text>
        <View style={styles.confidenceBadge}>
          <View
            style={[
              styles.confidenceDot,
              { backgroundColor: getConfidenceColor(prediction.confidence) },
            ]}
          />
          <Text style={styles.confidenceText}>
            {getConfidenceLevel(prediction.confidence)} Confidence
          </Text>
        </View>
      </View>

      {/* Main Value Display */}
      <View style={styles.valueContainer}>
        <Text style={[styles.estimatedValue, compact && styles.compactValue]}>
          {formatCurrency(prediction.estimatedValue)}
        </Text>
        <Text style={styles.valueLabel}>Estimated Deal Value</Text>
      </View>

      {/* Confidence Range Visualization */}
      <View style={styles.rangeContainer}>
        <View style={styles.rangeLabels}>
          <Text style={styles.rangeLabel}>
            {formatCurrency(prediction.range.min)}
          </Text>
          <Text style={styles.rangeLabel}>
            {formatCurrency(prediction.range.max)}
          </Text>
        </View>

        <View style={styles.rangeBar}>
          <View style={styles.rangeTrack} />
          <View
            style={[
              styles.rangeFill,
              {
                width: `${rangeWidth}%`,
                left: `${(100 - rangeWidth) / 2}%`,
              },
            ]}
          />
          <View
            style={[
              styles.estimatedMarker,
              { left: `${estimatedPosition}%` },
            ]}
          >
            <View style={styles.markerLine} />
            <View style={styles.markerDot} />
          </View>
        </View>

        <Text style={styles.rangeDescription}>
          {Math.round(rangeWidth)}% confidence range
        </Text>
      </View>

      {/* Value Factors */}
      {!compact && prediction.factors && prediction.factors.length > 0 && (
        <View style={styles.factorsContainer}>
          <Text style={styles.sectionTitle}>Value Drivers</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {prediction.factors.map((factor, index) => (
              <View key={index} style={styles.factorItem}>
                <View style={styles.factorHeader}>
                  <Text style={styles.factorName}>{factor.name}</Text>
                  <Text
                    style={[
                      styles.factorImpact,
                      {
                        color: factor.impact > 0 ? '#28a745' : '#dc3545',
                      },
                    ]}
                  >
                    {factor.impact > 0 ? '+' : ''}{Math.round(factor.impact * 100)}%
                  </Text>
                </View>
                <Text style={styles.factorContribution}>
                  {formatCurrency(factor.contribution)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Comparable Deals */}
      {!compact && prediction.comparables && prediction.comparables.length > 0 && (
        <View style={styles.comparablesContainer}>
          <Text style={styles.sectionTitle}>Similar Deals</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {prediction.comparables.slice(0, 3).map((comparable, index) => (
              <TouchableOpacity
                key={index}
                style={styles.comparableItem}
                onPress={() => onComparablePress?.(comparable)}
                activeOpacity={0.7}
              >
                <Text style={styles.comparableValue}>
                  {formatCurrency(comparable.value)}
                </Text>
                <Text style={styles.comparableSimilarity}>
                  {Math.round(comparable.similarity * 100)}% similar
                </Text>
                <Text style={styles.comparableDate}>
                  {new Date(comparable.factors.closedDate || '').toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="refresh" size={16} color="#007AFF" />
          <Text style={styles.actionText}>Refresh</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Icon name="share" size={16} color="#007AFF" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Icon name="info" size={16} color="#007AFF" />
          <Text style={styles.actionText}>Details</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
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
  compactContainer: {
    padding: 12,
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
  compactTitle: {
    fontSize: 16,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  confidenceText: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '500',
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
  valueContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  estimatedValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  compactValue: {
    fontSize: 24,
  },
  valueLabel: {
    fontSize: 14,
    color: '#666666',
  },
  rangeContainer: {
    marginBottom: 20,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rangeLabel: {
    fontSize: 12,
    color: '#666666',
  },
  rangeBar: {
    height: 20,
    position: 'relative',
    marginBottom: 8,
  },
  rangeTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 9,
    height: 2,
    backgroundColor: '#e9ecef',
    borderRadius: 1,
  },
  rangeFill: {
    position: 'absolute',
    top: 6,
    height: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    borderRadius: 4,
  },
  estimatedMarker: {
    position: 'absolute',
    top: 0,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerLine: {
    position: 'absolute',
    top: 2,
    width: 2,
    height: 16,
    backgroundColor: '#007AFF',
    borderRadius: 1,
  },
  markerDot: {
    width: 8,
    height: 8,
    backgroundColor: '#007AFF',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  rangeDescription: {
    fontSize: 11,
    color: '#999999',
    textAlign: 'center',
  },
  factorsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  factorItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 140,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  factorName: {
    fontSize: 12,
    color: '#666666',
    flex: 1,
  },
  factorImpact: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  factorContribution: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  comparablesContainer: {
    marginBottom: 20,
  },
  comparableItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  comparableValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  comparableSimilarity: {
    fontSize: 11,
    color: '#28a745',
    marginBottom: 2,
  },
  comparableDate: {
    fontSize: 10,
    color: '#999999',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  actionText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default DealValuePrediction;