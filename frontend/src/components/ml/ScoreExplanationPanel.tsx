import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import apiService from '../../services/api';
import { styles } from '../../styles/ml/ScoreExplanationStyles';

interface ScoreExplanation {
  leadId: number;
  score: number;
  confidence: number;
  topFactors: Array<{
    feature: string;
    value: number;
    impact: number;
    direction: string;
    explanation: string;
  }>;
  featureContributions: any;
  similarLeads: Array<{
    id: number;
    name: string;
    score: number;
    confidence: number;
    similarity: number;
  }>;
  scoreDistribution: any;
  recommendations: Array<{
    type: string;
    priority: string;
    message: string;
    actions: string[];
  }>;
  generatedAt: string;
}

interface ScoreExplanationPanelProps {
  leadId: number;
  onSimilarLeadSelect?: (leadId: number) => void;
}

export const ScoreExplanationPanel: React.FC<ScoreExplanationPanelProps> = ({
  leadId,
  onSimilarLeadSelect
}) => {
  const [explanation, setExplanation] = useState<ScoreExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExplanation = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getLeadInsights(leadId);
      setExplanation(response.data.explanation);
    } catch (err) {
      console.error('Failed to load lead insights:', err);
      setError('Failed to load lead insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExplanation();
  }, [leadId]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading lead insights...</Text>
      </View>
    );
  }

  if (error || !explanation) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <MaterialIcons name="error-outline" size={48} color="#FF3B30" />
        <Text style={{ marginTop: 16, color: '#666', textAlign: 'center' }}>
          {error || 'No insights data available'}
        </Text>
        <TouchableOpacity
          style={{ marginTop: 16, padding: 12, backgroundColor: '#007AFF', borderRadius: 8 }}
          onPress={loadExplanation}
        >
          <Text style={{ color: 'white' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#34C759';
    if (confidence >= 0.6) return '#FF9500';
    return '#FF3B30';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  const getOutcomeColor = (outcome?: string) => {
    switch (outcome) {
      case 'converted':
        return '#34C759';
      case 'lost':
        return '#FF3B30';
      default:
        return '#007AFF';
    }
  };

  const getOutcomeIcon = (outcome?: string) => {
    switch (outcome) {
      case 'converted':
        return 'check-circle';
      case 'lost':
        return 'cancel';
      default:
        return 'schedule';
    }
  };

  const renderFeatureContribution = (factor: ScoreExplanation['topFactors'][0], index: number) => {
    const isPositive = factor.impact > 0;
    const contributionPercent = Math.abs(factor.impact) * 100;

    return (
      <View key={factor.feature} style={styles.featureContribution}>
        <View style={styles.featureHeader}>
          <View style={styles.featureRank}>
            <Text style={styles.rankNumber}>#{index + 1}</Text>
          </View>

          <View style={styles.featureInfo}>
            <Text style={styles.featureName}>{factor.feature}</Text>
            <Text style={styles.featureDescription}>{factor.explanation}</Text>
          </View>

          <View style={styles.contributionInfo}>
            <Text style={[
              styles.contributionValue,
              { color: isPositive ? '#34C759' : '#FF3B30' }
            ]}>
              {isPositive ? '+' : ''}{(factor.impact * 100).toFixed(1)}pts
            </Text>
            <Text style={styles.contributionPercent}>
              {contributionPercent.toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.contributionBar}>
          <View
            style={[
              styles.contributionFill,
              {
                width: `${Math.min(contributionPercent, 100)}%`,
                backgroundColor: isPositive ? '#34C759' : '#FF3B30'
              }
            ]}
          />
        </View>
      </View>
    );
  };

  const renderSimilarLead = (similar: ScoreExplanation['similarLeads'][0]) => (
    <TouchableOpacity
      key={similar.id}
      style={styles.similarLead}
      onPress={() => onSimilarLeadSelect?.(similar.id)}
    >
      <View style={styles.similarLeadHeader}>
        <View style={[styles.outcomeIndicator, { backgroundColor: getOutcomeColor() }]}>
          <MaterialIcons
            name={getOutcomeIcon()}
            size={14}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.similarLeadInfo}>
          <Text style={styles.similarLeadId}>{similar.name}</Text>
          <Text style={styles.similarityScore}>
            {(similar.similarity * 100).toFixed(1)}% similar
          </Text>
        </View>

        <View style={styles.similarLeadScore}>
          <Text style={styles.scoreValue}>
            {(similar.score * 100).toFixed(1)}%
          </Text>
          <Text style={styles.scoreLabel}>Score</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRecommendation = (recommendation: string, index: number) => (
    <View key={index} style={styles.recommendation}>
      <View style={styles.recommendationIcon}>
        <MaterialIcons name="lightbulb" size={16} color="#FF9500" />
      </View>
      <Text style={styles.recommendationText}>{recommendation}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Score Overview */}
      <View style={styles.scoreOverview}>
        <View style={styles.scoreHeader}>
          <Text style={styles.scoreTitle}>Lead Score Explanation</Text>
          <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(explanation.confidence) }]}>
            <Text style={styles.confidenceText}>
              {getConfidenceLabel(explanation.confidence)}
            </Text>
          </View>
        </View>

        <View style={styles.scoreDisplay}>
          <Text style={styles.scoreValue}>
            {(explanation.score * 100).toFixed(1)}%
          </Text>
          <Text style={styles.scoreLabel}>Conversion Probability</Text>
        </View>

        <View style={styles.scoreBreakdown}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Score</Text>
            <Text style={styles.breakdownValue}>
              {(explanation.score * 100).toFixed(1)}%
            </Text>
          </View>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Confidence</Text>
            <Text style={styles.breakdownValue}>
              {(explanation.confidence * 100).toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Top Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Factors Influencing Score</Text>
        <Text style={styles.sectionSubtitle}>
          The most important features that contributed to this prediction
        </Text>

        {explanation.topFactors.slice(0, 5).map((factor, index) =>
          renderFeatureContribution(factor, index)
        )}
      </View>

      {/* Similar Leads */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Similar Leads</Text>
        <Text style={styles.sectionSubtitle}>
          Leads with similar characteristics and their outcomes
        </Text>

        {explanation.similarLeads.map(renderSimilarLead)}
      </View>

      {/* Recommendations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Recommendations</Text>
        <Text style={styles.sectionSubtitle}>
          Actionable insights based on this lead's profile
        </Text>

        {explanation.recommendations.map((rec, index) => renderRecommendation(rec.message, index))}
      </View>

      {/* Prediction Confidence Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prediction Confidence</Text>
        <View style={styles.confidenceDetails}>
          <View style={styles.confidenceMetric}>
            <Text style={styles.metricLabel}>Confidence Score</Text>
            <Text style={styles.metricValue}>
              {(explanation.confidence * 100).toFixed(1)}%
            </Text>
          </View>

          <View style={styles.confidenceMetric}>
            <Text style={styles.metricLabel}>Data Completeness</Text>
            <Text style={styles.metricValue}>
              {(explanation.topFactors.length / 10 * 100).toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};