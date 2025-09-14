import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LeadScore, LeadGrade } from '../../types/leadScoring';
import { MaterialColors, MaterialSpacing, MaterialTypography } from '../../styles/MaterialDesign';
import { accessibilityManager } from '../../utils/accessibility';

interface LeadScoreBadgeProps {
  score: LeadScore;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
  onPress?: () => void;
}

const LeadScoreBadge: React.FC<LeadScoreBadgeProps> = ({
  score,
  size = 'medium',
  showDetails = false,
  onPress
}) => {
  const getGradeColor = (grade: LeadGrade): string => {
    switch (grade) {
      case 'A+':
      case 'A':
        return MaterialColors.secondary[600];
      case 'B+':
      case 'B':
        return MaterialColors.primary[600];
      case 'C+':
      case 'C':
        return MaterialColors.warning[600];
      case 'D':
        return MaterialColors.error[600];
      case 'F':
        return MaterialColors.neutral[600];
      default:
        return MaterialColors.neutral[600];
    }
  };

  const getGradeIcon = (grade: LeadGrade): string => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'star';
      case 'B+':
      case 'B':
        return 'star-half-full';
      case 'C+':
      case 'C':
        return 'star-outline';
      case 'D':
        return 'alert-circle-outline';
      case 'F':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getGradeDescription = (grade: LeadGrade): string => {
    switch (grade) {
      case 'A+':
        return 'Exceptional Lead';
      case 'A':
        return 'Excellent Lead';
      case 'B+':
        return 'Very Good Lead';
      case 'B':
        return 'Good Lead';
      case 'C+':
        return 'Fair Lead';
      case 'C':
        return 'Average Lead';
      case 'D':
        return 'Poor Lead';
      case 'F':
        return 'Very Poor Lead';
      default:
        return 'Unknown';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.smallContainer,
          score: styles.smallScore,
          grade: styles.smallGrade,
          icon: 16,
        };
      case 'large':
        return {
          container: styles.largeContainer,
          score: styles.largeScore,
          grade: styles.largeGrade,
          icon: 24,
        };
      case 'medium':
      default:
        return {
          container: styles.mediumContainer,
          score: styles.mediumScore,
          grade: styles.mediumGrade,
          icon: 20,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const gradeColor = getGradeColor(score.grade);
  const gradeIcon = getGradeIcon(score.grade);
  const gradeDescription = getGradeDescription(score.grade);

  const accessibilityLabel = accessibilityManager.generateAccessibilityLabel(
    `Lead Score: ${score.totalScore.toFixed(1)} points, Grade ${score.grade}`,
    `${gradeDescription}. Confidence: ${score.confidence.toFixed(0)}%. ${showDetails ? 'Tap for details' : ''}`
  );

  return (
    <View
      style={[
        styles.container,
        sizeStyles.container,
        { backgroundColor: gradeColor + '15' } // 15% opacity
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ expanded: showDetails }}
    >
      {/* Score Display */}
      <View style={styles.scoreSection}>
        <Text
          style={[
            styles.score,
            sizeStyles.score,
            { color: gradeColor }
          ]}
        >
          {score.totalScore.toFixed(1)}
        </Text>
        <Text
          style={[
            styles.scoreLabel,
            sizeStyles.score,
            { color: gradeColor }
          ]}
        >
          pts
        </Text>
      </View>

      {/* Grade Display */}
      <View style={styles.gradeSection}>
        <MaterialCommunityIcons
          name={gradeIcon as any}
          size={sizeStyles.icon}
          color={gradeColor}
          style={styles.gradeIcon}
        />
        <Text
          style={[
            styles.grade,
            sizeStyles.grade,
            { color: gradeColor }
          ]}
        >
          {score.grade}
        </Text>
      </View>

      {/* Confidence Indicator */}
      <View style={styles.confidenceSection}>
        <View
          style={[
            styles.confidenceBar,
            {
              backgroundColor: gradeColor,
              width: `${score.confidence}%`
            }
          ]}
        />
        <Text
          style={[
            styles.confidenceText,
            { color: gradeColor }
          ]}
        >
          {score.confidence.toFixed(0)}%
        </Text>
      </View>

      {/* Details Toggle */}
      {onPress && (
        <MaterialCommunityIcons
          name={showDetails ? "chevron-up" : "chevron-down"}
          size={16}
          color={gradeColor}
          style={styles.detailsIcon}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: MaterialSpacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 120,
  },
  smallContainer: {
    minWidth: 100,
    padding: MaterialSpacing.xs,
  },
  mediumContainer: {
    minWidth: 120,
    padding: MaterialSpacing.sm,
  },
  largeContainer: {
    minWidth: 140,
    padding: MaterialSpacing.md,
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: MaterialSpacing.xs,
  },
  score: {
    ...MaterialTypography.headlineMedium,
    fontWeight: 'bold',
  },
  smallScore: {
    ...MaterialTypography.titleMedium,
  },
  mediumScore: {
    ...MaterialTypography.headlineMedium,
  },
  largeScore: {
    ...MaterialTypography.headlineLarge,
  },
  scoreLabel: {
    ...MaterialTypography.bodySmall,
    marginLeft: MaterialSpacing.xs,
  },
  gradeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: MaterialSpacing.xs,
  },
  gradeIcon: {
    marginRight: MaterialSpacing.xs,
  },
  grade: {
    ...MaterialTypography.titleMedium,
    fontWeight: '600',
  },
  smallGrade: {
    ...MaterialTypography.bodyMedium,
  },
  mediumGrade: {
    ...MaterialTypography.titleMedium,
  },
  largeGrade: {
    ...MaterialTypography.headlineSmall,
  },
  confidenceSection: {
    alignItems: 'center',
  },
  confidenceBar: {
    height: 3,
    borderRadius: 1.5,
    marginBottom: MaterialSpacing.xs,
    maxWidth: 80,
  },
  confidenceText: {
    ...MaterialTypography.labelSmall,
    fontWeight: '500',
  },
  detailsIcon: {
    position: 'absolute',
    top: MaterialSpacing.xs,
    right: MaterialSpacing.xs,
  },
});

export default LeadScoreBadge;