import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import apiService from '../../services/api';
import { styles } from '../../styles/ml/PredictionConfidenceStyles';

interface PredictionConfidence {
  confidenceScore: number;
  confidenceLevel: string;
  dataCompleteness: number;
  featureCoverage: number;
  uncertaintyFactors: string[];
  score: number;
  confidenceIntervals: {
    lower: number;
    upper: number;
    margin: number;
  };
}

interface PredictionConfidenceGaugeProps {
  leadId: number;
}

export const PredictionConfidenceGauge: React.FC<PredictionConfidenceGaugeProps> = ({
  leadId
}) => {
  const [confidence, setConfidence] = useState<PredictionConfidence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfidenceData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getLeadInsights(leadId);

      // Transform API response to expected format
      const explanation = response.data.explanation;
      const confidenceData: PredictionConfidence = {
        confidenceScore: explanation.confidence,
        confidenceLevel: explanation.confidence > 0.8 ? 'high' : explanation.confidence > 0.6 ? 'medium' : 'low',
        dataCompleteness: explanation.topFactors.length / 10, // Mock calculation
        featureCoverage: explanation.topFactors.length / 10, // Mock calculation
        uncertaintyFactors: explanation.confidence < 0.7 ? ['Limited historical data', 'Incomplete feature set'] : [],
        score: explanation.score,
        confidenceIntervals: {
          lower: Math.max(0, explanation.score - 0.1),
          upper: Math.min(1, explanation.score + 0.1),
          margin: 0.1
        }
      };

      setConfidence(confidenceData);
    } catch (err) {
      console.error('Failed to load confidence data:', err);
      setError('Failed to load confidence data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfidenceData();
  }, [leadId]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading confidence data...</Text>
      </View>
    );
  }

  if (error || !confidence) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <MaterialIcons name="error-outline" size={48} color="#FF3B30" />
        <Text style={{ marginTop: 16, color: '#666', textAlign: 'center' }}>
          {error || 'No confidence data available'}
        </Text>
        <TouchableOpacity
          style={{ marginTop: 16, padding: 12, backgroundColor: '#007AFF', borderRadius: 8 }}
          onPress={loadConfidenceData}
        >
          <Text style={{ color: 'white' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high':
        return '#34C759';
      case 'medium':
        return '#FF9500';
      case 'low':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getConfidenceIcon = (level: string) => {
    switch (level) {
      case 'high':
        return 'verified';
      case 'medium':
        return 'warning';
      case 'low':
        return 'error';
      default:
        return 'help';
    }
  };

  const getConfidenceDescription = (level: string) => {
    switch (level) {
      case 'high':
        return 'High confidence prediction with reliable data';
      case 'medium':
        return 'Moderate confidence - consider additional verification';
      case 'low':
        return 'Low confidence - limited data available';
      default:
        return 'Confidence level undetermined';
    }
  };

  const renderConfidenceMeter = () => {
    const segments = [
      { label: 'Low', color: '#FF3B30', range: [0, 0.4] },
      { label: 'Medium', color: '#FF9500', range: [0.4, 0.7] },
      { label: 'High', color: '#34C759', range: [0.7, 1.0] }
    ];

    return (
      <View style={styles.confidenceMeter}>
        {segments.map((segment, index) => (
          <View key={segment.label} style={styles.meterSegment}>
            <View
              style={[
                styles.meterBar,
                {
                  backgroundColor: segment.color,
                  opacity: confidence.confidenceScore >= segment.range[0] ? 1 : 0.3
                }
              ]}
            />
            <Text style={styles.meterLabel}>{segment.label}</Text>
          </View>
        ))}

        {/* Confidence Indicator */}
        <View
          style={[
            styles.confidenceIndicator,
            {
              left: `${confidence.confidenceScore * 100}%`,
              backgroundColor: getConfidenceColor(confidence.confidenceLevel)
            }
          ]}
        >
          <View style={styles.indicatorArrow} />
          <View style={styles.indicatorDot} />
        </View>
      </View>
    );
  };

  const renderUncertaintyFactors = () => {
    if (confidence.uncertaintyFactors.length === 0) {
      return (
        <View style={styles.uncertaintySection}>
          <Text style={styles.uncertaintyTitle}>No Uncertainty Factors</Text>
          <Text style={styles.uncertaintyText}>
            This prediction has high reliability with no identified uncertainty factors.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.uncertaintySection}>
        <Text style={styles.uncertaintyTitle}>Uncertainty Factors</Text>
        {confidence.uncertaintyFactors.map((factor, index) => (
          <View key={index} style={styles.uncertaintyItem}>
            <MaterialIcons name="warning" size={16} color="#FF9500" />
            <Text style={styles.uncertaintyText}>{factor}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderDataQualityMetrics = () => (
    <View style={styles.qualityMetrics}>
      <View style={styles.metric}>
        <Text style={styles.metricLabel}>Data Completeness</Text>
        <View style={styles.metricBar}>
          <View
            style={[
              styles.metricFill,
              {
                width: `${confidence.dataCompleteness * 100}%`,
                backgroundColor: confidence.dataCompleteness > 0.8 ? '#34C759' :
                               confidence.dataCompleteness > 0.6 ? '#FF9500' : '#FF3B30'
              }
            ]}
          />
        </View>
        <Text style={styles.metricValue}>
          {(confidence.dataCompleteness * 100).toFixed(1)}%
        </Text>
      </View>

      <View style={styles.metric}>
        <Text style={styles.metricLabel}>Feature Coverage</Text>
        <View style={styles.metricBar}>
          <View
            style={[
              styles.metricFill,
              {
                width: `${confidence.featureCoverage * 100}%`,
                backgroundColor: confidence.featureCoverage > 0.8 ? '#34C759' :
                               confidence.featureCoverage > 0.6 ? '#FF9500' : '#FF3B30'
              }
            ]}
          />
        </View>
        <Text style={styles.metricValue}>
          {(confidence.featureCoverage * 100).toFixed(1)}%
        </Text>
      </View>
    </View>
  );

  const renderConfidenceIntervals = () => (
    <View style={styles.intervalsSection}>
      <Text style={styles.intervalsTitle}>Prediction Range</Text>
      <View style={styles.intervalDisplay}>
        <View style={styles.intervalBar}>
          <View
            style={[
              styles.intervalRange,
              {
                left: `${confidence.confidenceIntervals.lower * 100}%`,
                width: `${(confidence.confidenceIntervals.upper - confidence.confidenceIntervals.lower) * 100}%`,
                backgroundColor: getConfidenceColor(confidence.confidenceLevel)
              }
            ]}
          />
          <View
            style={[
              styles.intervalPoint,
              {
                left: `${confidence.score * 100}%`,
                backgroundColor: '#007AFF'
              }
            ]}
          />
        </View>

        <View style={styles.intervalLabels}>
          <Text style={styles.intervalLabel}>
            {(confidence.confidenceIntervals.lower * 100).toFixed(1)}%
          </Text>
          <Text style={[styles.intervalLabel, styles.intervalCurrent]}>
            {(confidence.score * 100).toFixed(1)}%
          </Text>
          <Text style={styles.intervalLabel}>
            {(confidence.confidenceIntervals.upper * 100).toFixed(1)}%
          </Text>
        </View>
      </View>

      <Text style={styles.intervalNote}>
        ±{confidence.confidenceIntervals.margin.toFixed(1)}% margin of error
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.confidenceOverview}>
          <View style={[styles.confidenceIcon, { backgroundColor: getConfidenceColor(confidence.confidenceLevel) }]}>
            <MaterialIcons
              name={getConfidenceIcon(confidence.confidenceLevel)}
              size={24}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.confidenceInfo}>
            <Text style={styles.confidenceLevel}>
              {confidence.confidenceLevel.charAt(0).toUpperCase() + confidence.confidenceLevel.slice(1)} Confidence
            </Text>
            <Text style={styles.confidenceScore}>
              {(confidence.confidenceScore * 100).toFixed(1)}% confidence score
            </Text>
          </View>
        </View>

        <Text style={styles.confidenceDescription}>
          {getConfidenceDescription(confidence.confidenceLevel)}
        </Text>
      </View>

      {renderConfidenceMeter()}

      {renderDataQualityMetrics()}

      {renderConfidenceIntervals()}

      {renderUncertaintyFactors()}
    </View>
  );
};