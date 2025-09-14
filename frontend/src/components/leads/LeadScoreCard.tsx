import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LeadScore, ScoringFactor } from '../../types/leadScoring';
import { MaterialColors, MaterialSpacing, MaterialTypography, MaterialElevation } from '../../styles/MaterialDesign';
import { accessibilityManager } from '../../utils/accessibility';

interface LeadScoreCardProps {
  score: LeadScore;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const LeadScoreCard: React.FC<LeadScoreCardProps> = ({
  score,
  onRefresh,
  refreshing = false
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getImpactColor = (impact: 'positive' | 'negative' | 'neutral'): string => {
    switch (impact) {
      case 'positive':
        return MaterialColors.secondary[600];
      case 'negative':
        return MaterialColors.error[500];
      case 'neutral':
      default:
        return MaterialColors.neutral[600];
    }
  };

  const getImpactIcon = (impact: 'positive' | 'negative' | 'neutral'): string => {
    switch (impact) {
      case 'positive':
        return 'trending-up';
      case 'negative':
        return 'trending-down';
      case 'neutral':
      default:
        return 'trending-neutral';
    }
  };

  const formatFactorValue = (factor: ScoringFactor): string => {
    return `${factor.value.toFixed(1)} (${(factor.weight * 100).toFixed(0)}% weight)`;
  };

  const renderScoreOverview = () => (
    <View style={styles.overviewContainer}>
      <View style={styles.scoreHeader}>
        <View style={styles.scoreDisplay}>
          <Text style={[styles.totalScore, { color: MaterialColors.primary[600] }]}>
            {score.totalScore.toFixed(1)}
          </Text>
          <Text style={[styles.scoreLabel, { color: MaterialColors.neutral[600] }]}>
            Total Score
          </Text>
        </View>

        <View style={styles.gradeDisplay}>
          <Text style={[styles.grade, { color: MaterialColors.secondary[600] }]}>
            Grade {score.grade}
          </Text>
          <Text style={[styles.confidence, { color: MaterialColors.neutral[600] }]}>
            {score.confidence.toFixed(0)}% Confidence
          </Text>
        </View>
      </View>

      <View style={styles.confidenceBar}>
        <View
          style={[
            styles.confidenceFill,
            {
              width: `${score.confidence}%`,
              backgroundColor: MaterialColors.primary[500]
            }
          ]}
        />
      </View>
    </View>
  );

  const renderScoreBreakdown = () => (
    <View style={styles.breakdownContainer}>
      <Text style={[styles.sectionTitle, { color: MaterialColors.onSurface }]}>
        Score Breakdown
      </Text>

      {Object.entries(score.scoreBreakdown).map(([key, value]) => (
        <View key={key} style={styles.breakdownItem}>
          <View style={styles.breakdownLabel}>
            <Text style={[styles.breakdownText, { color: MaterialColors.onSurface }]}>
              {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
            </Text>
          </View>
          <View style={styles.breakdownValue}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${value}%`,
                    backgroundColor: value >= 75 ? MaterialColors.secondary[500] :
                                   value >= 50 ? MaterialColors.primary[500] :
                                   MaterialColors.warning[500]
                  }
                ]}
              />
            </View>
            <Text style={[styles.breakdownNumber, { color: MaterialColors.neutral[600] }]}>
              {value.toFixed(1)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderFactors = () => (
    <View style={styles.factorsContainer}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection('factors')}
        accessibilityLabel={`${expandedSections.has('factors') ? 'Collapse' : 'Expand'} scoring factors`}
        accessibilityState={{ expanded: expandedSections.has('factors') }}
      >
        <Text style={[styles.sectionTitle, { color: MaterialColors.onSurface }]}>
          Scoring Factors
        </Text>
        <MaterialCommunityIcons
          name={expandedSections.has('factors') ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={MaterialColors.neutral[600]}
        />
      </TouchableOpacity>

      {expandedSections.has('factors') && (
        <View style={styles.factorsList}>
          {score.factors.map((factor, index) => (
            <View key={index} style={styles.factorItem}>
              <View style={styles.factorHeader}>
                <MaterialCommunityIcons
                  name={getImpactIcon(factor.impact) as any}
                  size={20}
                  color={getImpactColor(factor.impact)}
                  style={styles.factorIcon}
                />
                <View style={styles.factorInfo}>
                  <Text style={[styles.factorName, { color: MaterialColors.onSurface }]}>
                    {factor.name}
                  </Text>
                  <Text style={[styles.factorValue, { color: MaterialColors.neutral[600] }]}>
                    {formatFactorValue(factor)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.factorDescription, { color: MaterialColors.neutral[600] }]}>
                {factor.description}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderInsights = () => (
    <View style={styles.insightsContainer}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection('insights')}
        accessibilityLabel={`${expandedSections.has('insights') ? 'Collapse' : 'Expand'} insights`}
        accessibilityState={{ expanded: expandedSections.has('insights') }}
      >
        <Text style={[styles.sectionTitle, { color: MaterialColors.onSurface }]}>
          Key Insights
        </Text>
        <MaterialCommunityIcons
          name={expandedSections.has('insights') ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={MaterialColors.neutral[600]}
        />
      </TouchableOpacity>

      {expandedSections.has('insights') && (
        <View style={styles.insightsList}>
          {score.factors
            .filter(factor => factor.impact === 'positive' || factor.impact === 'negative')
            .slice(0, 3)
            .map((factor, index) => (
              <View key={index} style={styles.insightItem}>
                <MaterialCommunityIcons
                  name={factor.impact === 'positive' ? 'thumb-up' : 'thumb-down'}
                  size={16}
                  color={getImpactColor(factor.impact)}
                  style={styles.insightIcon}
                />
                <Text style={[styles.insightText, { color: MaterialColors.onSurface }]}>
                  {factor.impact === 'positive' ? 'Strength' : 'Concern'}: {factor.name}
                </Text>
              </View>
            ))}
        </View>
      )}
    </View>
  );

  const renderRecommendations = () => (
    <View style={styles.recommendationsContainer}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection('recommendations')}
        accessibilityLabel={`${expandedSections.has('recommendations') ? 'Collapse' : 'Expand'} recommendations`}
        accessibilityState={{ expanded: expandedSections.has('recommendations') }}
      >
        <Text style={[styles.sectionTitle, { color: MaterialColors.onSurface }]}>
          Recommended Actions
        </Text>
        <MaterialCommunityIcons
          name={expandedSections.has('recommendations') ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={MaterialColors.neutral[600]}
        />
      </TouchableOpacity>

      {expandedSections.has('recommendations') && (
        <View style={styles.recommendationsList}>
          {score.recommendations.map((recommendation, index) => (
            <View key={index} style={styles.recommendationItem}>
              <MaterialCommunityIcons
                name="lightbulb-on-outline"
                size={16}
                color={MaterialColors.primary[500]}
                style={styles.recommendationIcon}
              />
              <Text style={[styles.recommendationText, { color: MaterialColors.onSurface }]}>
                {recommendation}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderMetadata = () => (
    <View style={styles.metadataContainer}>
      <Text style={[styles.metadataText, { color: MaterialColors.neutral[600] }]}>
        Calculated: {new Date(score.calculatedAt).toLocaleString()}
      </Text>
      {score.expiresAt && (
        <Text style={[styles.metadataText, { color: MaterialColors.neutral[600] }]}>
          Expires: {new Date(score.expiresAt).toLocaleString()}
        </Text>
      )}
      {onRefresh && (
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
          accessibilityLabel="Refresh lead score"
          accessibilityState={{ disabled: refreshing }}
        >
          <MaterialCommunityIcons
            name={refreshing ? 'loading' : 'refresh'}
            size={16}
            color={MaterialColors.primary[500]}
          />
          <Text style={[styles.refreshText, { color: MaterialColors.primary[500] }]}>
            {refreshing ? 'Refreshing...' : 'Refresh Score'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {renderScoreOverview()}
      {renderScoreBreakdown()}
      {renderFactors()}
      {renderInsights()}
      {renderRecommendations()}
      {renderMetadata()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MaterialColors.surface,
  },
  contentContainer: {
    padding: MaterialSpacing.md,
  },
  overviewContainer: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.lg,
    marginBottom: MaterialSpacing.md,
    ...MaterialElevation.level2,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.md,
  },
  scoreDisplay: {
    alignItems: 'center',
  },
  totalScore: {
    ...MaterialTypography.displaySmall,
    fontWeight: 'bold',
  },
  scoreLabel: {
    ...MaterialTypography.bodyMedium,
    marginTop: MaterialSpacing.xs,
  },
  gradeDisplay: {
    alignItems: 'flex-end',
  },
  grade: {
    ...MaterialTypography.headlineSmall,
    fontWeight: '600',
  },
  confidence: {
    ...MaterialTypography.bodySmall,
    marginTop: MaterialSpacing.xs,
  },
  confidenceBar: {
    height: 4,
    backgroundColor: MaterialColors.neutral[200],
    borderRadius: 2,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 2,
  },
  breakdownContainer: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.lg,
    marginBottom: MaterialSpacing.md,
    ...MaterialElevation.level2,
  },
  sectionTitle: {
    ...MaterialTypography.titleLarge,
    marginBottom: MaterialSpacing.md,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.sm,
  },
  breakdownLabel: {
    flex: 1,
  },
  breakdownText: {
    ...MaterialTypography.bodyLarge,
  },
  breakdownValue: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: MaterialColors.neutral[200],
    borderRadius: 4,
    marginRight: MaterialSpacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownNumber: {
    ...MaterialTypography.bodyMedium,
    fontWeight: '500',
    width: 35,
    textAlign: 'right',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: MaterialSpacing.sm,
  },
  factorsContainer: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    marginBottom: MaterialSpacing.md,
    ...MaterialElevation.level2,
  },
  factorsList: {
    padding: MaterialSpacing.lg,
    paddingTop: 0,
  },
  factorItem: {
    marginBottom: MaterialSpacing.md,
    paddingBottom: MaterialSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: MaterialColors.neutral[200],
  },
  factorHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: MaterialSpacing.xs,
  },
  factorIcon: {
    marginRight: MaterialSpacing.sm,
    marginTop: 2,
  },
  factorInfo: {
    flex: 1,
  },
  factorName: {
    ...MaterialTypography.titleMedium,
    marginBottom: MaterialSpacing.xs,
  },
  factorValue: {
    ...MaterialTypography.bodyMedium,
  },
  factorDescription: {
    ...MaterialTypography.bodyMedium,
    marginLeft: 28,
  },
  insightsContainer: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    marginBottom: MaterialSpacing.md,
    ...MaterialElevation.level2,
  },
  insightsList: {
    padding: MaterialSpacing.lg,
    paddingTop: 0,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: MaterialSpacing.sm,
  },
  insightIcon: {
    marginRight: MaterialSpacing.sm,
    marginTop: 2,
  },
  insightText: {
    ...MaterialTypography.bodyMedium,
    flex: 1,
  },
  recommendationsContainer: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    marginBottom: MaterialSpacing.md,
    ...MaterialElevation.level2,
  },
  recommendationsList: {
    padding: MaterialSpacing.lg,
    paddingTop: 0,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: MaterialSpacing.sm,
  },
  recommendationIcon: {
    marginRight: MaterialSpacing.sm,
    marginTop: 2,
  },
  recommendationText: {
    ...MaterialTypography.bodyMedium,
    flex: 1,
  },
  metadataContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: MaterialSpacing.sm,
  },
  metadataText: {
    ...MaterialTypography.bodySmall,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: MaterialSpacing.sm,
  },
  refreshText: {
    ...MaterialTypography.bodySmall,
    marginLeft: MaterialSpacing.xs,
  },
});

export default LeadScoreCard;