import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RiskAssessment as RiskAssessmentType, RiskFactor } from '../../../types/dashboard';
import { predictiveAnalyticsService } from '../../../services/predictiveAnalyticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RiskAssessmentProps {
  leadId: number;
  assessment?: RiskAssessmentType;
  loading?: boolean;
  onMitigationPress?: (strategy: string) => void;
  compact?: boolean;
}

const RiskAssessment: React.FC<RiskAssessmentProps> = ({
  leadId,
  assessment: initialAssessment,
  loading = false,
  onMitigationPress,
  compact = false,
}) => {
  const [assessment, setAssessment] = useState<RiskAssessmentType | undefined>(initialAssessment);
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null);
  const [animatedValue] = useState(new Animated.Value(0));

  // Load assessment data if not provided
  useEffect(() => {
    const loadAssessment = async () => {
      if (!initialAssessment && leadId) {
        try {
          const analytics = await predictiveAnalyticsService.generatePredictiveAnalytics(leadId, {
            includeRisk: true,
          });
          setAssessment(analytics.riskAssessment);
        } catch (error) {
          console.error('Failed to load risk assessment:', error);
        }
      }
    };

    loadAssessment();
  }, [leadId, initialAssessment]);

  // Animate on data load
  useEffect(() => {
    if (assessment) {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [assessment, animatedValue]);

  // Get risk level color
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return '#dc3545';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  // Get risk level icon
  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'check-circle';
      default:
        return 'help';
    }
  };

  // Get overall risk level
  const getOverallRiskLevel = (risk: number) => {
    if (risk >= 0.7) return 'high';
    if (risk >= 0.4) return 'medium';
    return 'low';
  };

  // Calculate risk distribution
  const riskDistribution = useMemo(() => {
    if (!assessment?.riskFactors) return { high: 0, medium: 0, low: 0 };

    return assessment.riskFactors.reduce(
      (acc, factor) => {
        acc[factor.level as keyof typeof acc]++;
        return acc;
      },
      { high: 0, medium: 0, low: 0 }
    );
  }, [assessment]);

  // Get mitigation effectiveness
  const getMitigationEffectiveness = (strategy: string) => {
    // Mock effectiveness calculation
    const effectiveness = Math.random() * 0.4 + 0.6; // 60-100%
    return effectiveness;
  };

  if (loading || !assessment) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <View style={styles.header}>
          <Text style={[styles.title, compact && styles.compactTitle]}>
            Risk Assessment
          </Text>
          <View style={styles.loadingIndicator} />
        </View>
        <Text style={styles.loadingText}>
          {loading ? 'Assessing risks...' : 'Loading risk data...'}
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
          Risk Assessment
        </Text>
        <View style={styles.overallRiskBadge}>
          <View
            style={[
              styles.riskDot,
              { backgroundColor: getRiskColor(getOverallRiskLevel(assessment.overallRisk)) },
            ]}
          />
          <Text style={styles.overallRiskText}>
            {getOverallRiskLevel(assessment.overallRisk).toUpperCase()} RISK
          </Text>
        </View>
      </View>

      {/* Overall Risk Score */}
      <View style={styles.overallRiskContainer}>
        <Text style={styles.overallRiskLabel}>Overall Risk Score</Text>
        <View style={styles.riskScoreContainer}>
          <Text style={styles.riskScore}>
            {Math.round(assessment.overallRisk * 100)}%
          </Text>
          <View style={styles.riskScoreBar}>
            <View
              style={[
                styles.riskScoreFill,
                {
                  width: `${assessment.overallRisk * 100}%`,
                  backgroundColor: getRiskColor(getOverallRiskLevel(assessment.overallRisk)),
                },
              ]}
            />
          </View>
        </View>
        <Text style={styles.confidenceText}>
          {Math.round(assessment.confidence * 100)}% confidence in assessment
        </Text>
      </View>

      {/* Risk Distribution */}
      {!compact && (
        <View style={styles.distributionContainer}>
          <Text style={styles.sectionTitle}>Risk Distribution</Text>
          <View style={styles.distributionBars}>
            {Object.entries(riskDistribution).map(([level, count]) => (
              <View key={level} style={styles.distributionItem}>
                <View style={styles.distributionLabel}>
                  <View
                    style={[
                      styles.distributionDot,
                      { backgroundColor: getRiskColor(level) },
                    ]}
                  />
                  <Text style={styles.distributionText}>
                    {level.toUpperCase()}: {count}
                  </Text>
                </View>
                <View style={styles.distributionBar}>
                  <View
                    style={[
                      styles.distributionFill,
                      {
                        width: count > 0 ? `${(count / Math.max(...Object.values(riskDistribution))) * 100}%` : '0%',
                        backgroundColor: getRiskColor(level),
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Risk Factors */}
      <View style={[styles.sectionContainer, compact && styles.compactSection]}>
        <Text style={[styles.sectionTitle, compact && styles.compactSectionTitle]}>
          Key Risk Factors
        </Text>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.factorsContainer}
        >
          {assessment.riskFactors.map((factor, index) => (
            <TouchableOpacity
              key={factor.name}
              style={[
                styles.factorItem,
                compact && styles.compactFactor,
                expandedFactor === factor.name && styles.expandedFactor,
              ]}
              onPress={() => setExpandedFactor(
                expandedFactor === factor.name ? null : factor.name
              )}
              activeOpacity={0.7}
            >
              <View style={styles.factorHeader}>
                <View style={styles.factorInfo}>
                  <Icon
                    name={getRiskIcon(factor.level)}
                    size={20}
                    color={getRiskColor(factor.level)}
                  />
                  <View style={styles.factorText}>
                    <Text style={styles.factorName} numberOfLines={1}>
                      {factor.name}
                    </Text>
                    <Text style={styles.factorLevel}>
                      {factor.level.toUpperCase()} RISK
                    </Text>
                  </View>
                </View>
                <View style={styles.factorMetrics}>
                  <Text style={styles.factorImpact}>
                    {Math.round(factor.impact * 100)}%
                  </Text>
                  <Text style={styles.factorProbability}>
                    {Math.round(factor.probability * 100)}%
                  </Text>
                </View>
              </View>

              {expandedFactor === factor.name && (
                <View style={styles.factorDetails}>
                  <Text style={styles.factorDescription}>
                    {factor.description}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Mitigation Strategies */}
      {!compact && assessment.mitigationStrategies && assessment.mitigationStrategies.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Mitigation Strategies</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {assessment.mitigationStrategies.map((strategy, index) => {
              const effectiveness = getMitigationEffectiveness(strategy);

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.strategyItem}
                  onPress={() => onMitigationPress?.(strategy)}
                  activeOpacity={0.7}
                >
                  <View style={styles.strategyHeader}>
                    <Text style={styles.strategyTitle} numberOfLines={2}>
                      {strategy}
                    </Text>
                    <View style={styles.strategyEffectiveness}>
                      <Text style={styles.effectivenessText}>
                        {Math.round(effectiveness * 100)}% effective
                      </Text>
                    </View>
                  </View>

                  <View style={styles.strategyActions}>
                    <TouchableOpacity
                      style={styles.strategyButton}
                      onPress={() => Alert.alert('Strategy Applied', `${strategy} has been applied.`)}
                    >
                      <Icon name="check" size={14} color="#ffffff" />
                      <Text style={styles.strategyButtonText}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Risk Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryStats}>
          <Text style={styles.summaryText}>
            {assessment.riskFactors.length} risk factors identified
          </Text>
          <Text style={styles.summaryText}>
            {assessment.mitigationStrategies?.length || 0} mitigation strategies available
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshButton}>
          <Icon name="refresh" size={16} color="#007AFF" />
          <Text style={styles.refreshText}>Re-assess</Text>
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
  overallRiskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  overallRiskText: {
    fontSize: 11,
    color: '#666666',
    fontWeight: 'bold',
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
  overallRiskContainer: {
    marginBottom: 20,
  },
  overallRiskLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  riskScoreContainer: {
    marginBottom: 8,
  },
  riskScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 8,
  },
  riskScoreBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
  },
  riskScoreFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
  },
  distributionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  compactSectionTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  distributionBars: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  distributionItem: {
    marginBottom: 12,
  },
  distributionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  distributionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  distributionText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  distributionBar: {
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
  },
  distributionFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  compactSection: {
    marginBottom: 12,
  },
  factorsContainer: {
    paddingBottom: 8,
  },
  factorItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  compactFactor: {
    padding: 8,
  },
  expandedFactor: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
    borderWidth: 1,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  factorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  factorText: {
    marginLeft: 8,
    flex: 1,
  },
  factorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
  factorLevel: {
    fontSize: 11,
    color: '#666666',
    marginTop: 2,
  },
  factorMetrics: {
    alignItems: 'flex-end',
  },
  factorImpact: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: 'bold',
  },
  factorProbability: {
    fontSize: 11,
    color: '#666666',
    marginTop: 2,
  },
  factorDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  factorDescription: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 18,
  },
  strategyItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 200,
  },
  strategyHeader: {
    marginBottom: 12,
  },
  strategyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  strategyEffectiveness: {
    alignItems: 'flex-end',
  },
  effectivenessText: {
    fontSize: 11,
    color: '#28a745',
    fontWeight: '500',
  },
  strategyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  strategyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  strategyButtonText: {
    fontSize: 12,
    color: '#ffffff',
    marginLeft: 4,
    fontWeight: '500',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  summaryStats: {
    flex: 1,
  },
  summaryText: {
    fontSize: 11,
    color: '#999999',
    marginBottom: 2,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  refreshText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
  },
});

export default RiskAssessment;