import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PerformanceInsight, InsightImpact } from '../../types/insights';
import { useTheme } from '../../contexts/ThemeContext';
import { accessibilityManager } from '../../utils/accessibility';
import { MaterialColors, MaterialElevation, MaterialSpacing, MaterialTypography } from '../../styles/MaterialDesign';

interface InsightCardProps {
  insight: PerformanceInsight;
  onPress?: () => void;
  onRecommendationPress?: (recommendationId: string) => void;
}

const InsightCard: React.FC<InsightCardProps> = ({
  insight,
  onPress,
  onRecommendationPress
}) => {
  const { theme } = useTheme();

  const getImpactColor = (impact: InsightImpact) => {
    switch (impact) {
      case 'high': return MaterialColors.error[500];
      case 'medium': return MaterialColors.warning[500];
      case 'low': return MaterialColors.secondary[500];
      default: return MaterialColors.neutral[600];
    }
  };

  const getImpactIcon = (impact: InsightImpact) => {
    switch (impact) {
      case 'high': return 'alert-circle';
      case 'medium': return 'alert';
      case 'low': return 'check-circle';
      default: return 'information';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'timing': return 'clock-outline';
      case 'strategy': return 'target';
      case 'prioritization': return 'sort-variant';
      case 'follow_up': return 'phone-outgoing';
      case 'quality': return 'star-outline';
      case 'conversion': return 'trending-up';
      default: return 'lightbulb-outline';
    }
  };

  const formatConfidence = (confidence: number) => {
    if (confidence >= 90) return 'Very High';
    if (confidence >= 80) return 'High';
    if (confidence >= 70) return 'Medium';
    if (confidence >= 60) return 'Low';
    return 'Very Low';
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: MaterialColors.surface,
          borderColor: MaterialColors.neutral[300],
          shadowColor: '#000000'
        }
      ]}
      onPress={onPress}
      accessibilityLabel={accessibilityManager.generateAccessibilityLabel(
        `Insight: ${insight.title}`,
        `${insight.description}. Impact: ${insight.impact}. Confidence: ${formatConfidence(insight.confidence)}`
      )}
      accessibilityRole="button"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons
            name={getCategoryIcon(insight.category)}
            size={24}
            color={MaterialColors.primary[500]}
            style={styles.categoryIcon}
          />
          <Text
            style={[styles.title, { color: MaterialColors.onSurface }]}
            numberOfLines={2}
          >
            {insight.title}
          </Text>
        </View>

        <View style={styles.impactRow}>
          <MaterialCommunityIcons
            name={getImpactIcon(insight.impact)}
            size={20}
            color={getImpactColor(insight.impact)}
          />
          <Text
            style={[styles.impactText, { color: getImpactColor(insight.impact) }]}
          >
            {insight.impact.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text
        style={[styles.description, { color: MaterialColors.neutral[700] }]}
        numberOfLines={3}
      >
        {insight.description}
      </Text>

      {/* Confidence and Category */}
      <View style={styles.metaRow}>
        <View style={styles.confidenceContainer}>
          <Text style={[styles.confidenceLabel, { color: MaterialColors.neutral[600] }]}>
            Confidence:
          </Text>
          <Text style={[styles.confidenceValue, { color: MaterialColors.primary[500] }]}>
            {formatConfidence(insight.confidence)}
          </Text>
        </View>

        <View style={[styles.categoryBadge, { backgroundColor: MaterialColors.secondary[100] }]}>
          <Text style={[styles.categoryText, { color: MaterialColors.secondary[800] }]}>
            {insight.category}
          </Text>
        </View>
      </View>

      {/* Recommendations */}
      {insight.recommendations && insight.recommendations.length > 0 && (
        <View style={styles.recommendationsContainer}>
          <Text style={[styles.recommendationsTitle, { color: MaterialColors.onSurface }]}>
            Key Recommendations:
          </Text>
          {insight.recommendations.slice(0, 2).map((rec, index) => (
            <TouchableOpacity
              key={rec.id}
              style={[
                styles.recommendationItem,
                { borderColor: MaterialColors.neutral[200] }
              ]}
              onPress={() => onRecommendationPress?.(rec.id)}
              accessibilityLabel={accessibilityManager.generateAccessibilityLabel(
                `Recommendation: ${rec.action}`,
                rec.rationale
              )}
            >
              <MaterialCommunityIcons
                name="lightbulb-on-outline"
                size={16}
                color={MaterialColors.primary[500]}
                style={styles.recommendationIcon}
              />
              <Text
                style={[styles.recommendationText, { color: MaterialColors.onSurface }]}
                numberOfLines={2}
              >
                {rec.action}
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={16}
                color={MaterialColors.neutral[500]}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Timestamp */}
      <Text style={[styles.timestamp, { color: MaterialColors.neutral[500] }]}>
        {new Date(insight.generatedAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  categoryIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    flex: 1,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  impactText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: 12,
    marginRight: 4,
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  recommendationsContainer: {
    marginTop: 8,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  recommendationIcon: {
    marginRight: 8,
  },
  recommendationText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  timestamp: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 8,
  },
});

export default InsightCard;