// Lead Score Indicator Component
// Displays lead score with visual indicators and accessibility support

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { LeadScoreCategory } from '../types';

interface LeadScoreIndicatorProps {
  score: number;
  category: LeadScoreCategory;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  showPercentage?: boolean;
  accessibilityLabel?: string;
}

const LeadScoreIndicator: React.FC<LeadScoreIndicatorProps> = ({
  score,
  category,
  size = 'medium',
  showLabel = true,
  showPercentage = true,
  accessibilityLabel
}) => {
  const { theme, themeState } = useTheme();
  const isDark = themeState.currentTheme === 'dark';

  // Get color based on score category
  const getScoreColor = (category: LeadScoreCategory): string => {
    switch (category) {
      case 'High':
        return theme.colors.primary[600] || '#4CAF50';
      case 'Medium':
        return theme.colors.secondary[600] || '#FF9800';
      case 'Low':
        return theme.colors.error || '#F44336';
      default:
        return theme.colors.onSurface || '#757575';
    }
  };

  // Get size dimensions
  const getSizeStyles = (size: string) => {
    switch (size) {
      case 'small':
        return {
          container: { paddingHorizontal: 8, paddingVertical: 4 },
          circle: { width: 12, height: 12 },
          text: { fontSize: 12 }
        };
      case 'large':
        return {
          container: { paddingHorizontal: 16, paddingVertical: 8 },
          circle: { width: 20, height: 20 },
          text: { fontSize: 16 }
        };
      default: // medium
        return {
          container: { paddingHorizontal: 12, paddingVertical: 6 },
          circle: { width: 16, height: 16 },
          text: { fontSize: 14 }
        };
    }
  };

  const scoreColor = getScoreColor(category);
  const sizeStyles = getSizeStyles(size);

  // Generate stars based on score (0-5 stars)
  const getStars = (score: number): string => {
    const starCount = Math.round((score / 100) * 5);
    return '★'.repeat(starCount) + '☆'.repeat(5 - starCount);
  };

  const defaultLabel = `Lead score: ${score} out of 100, category ${category}`;
  const a11yLabel = accessibilityLabel || defaultLabel;

  return (
    <View
      style={[
        styles.container,
        sizeStyles.container,
        {
          backgroundColor: isDark ? theme.colors.surface : theme.colors.background,
          borderColor: scoreColor,
          borderWidth: 1
        }
      ]}
      accessible={true}
      accessibilityLabel={a11yLabel}
      accessibilityRole="text"
      accessibilityValue={{ text: `${score}%` }}
    >
      {/* Score Circle Indicator */}
      <View
        style={[
          styles.scoreCircle,
          sizeStyles.circle,
          { backgroundColor: scoreColor }
        ]}
        accessible={false}
      />

      {/* Score Text */}
      <View style={styles.textContainer}>
        {showLabel && (
          <Text
            style={[
              styles.labelText,
              sizeStyles.text,
              { color: theme.colors.onSurface }
            ]}
            accessible={false}
          >
            Score
          </Text>
        )}

        <Text
          style={[
            styles.scoreText,
            sizeStyles.text,
            { color: scoreColor, fontWeight: 'bold' }
          ]}
          accessible={false}
        >
          {showPercentage ? `${score}%` : score}
        </Text>

        {/* Star Rating for Large Size */}
        {size === 'large' && (
          <Text
            style={[
              styles.starsText,
              { color: scoreColor }
            ]}
            accessible={false}
          >
            {getStars(score)}
          </Text>
        )}
      </View>

      {/* Category Badge */}
      <View
        style={[
          styles.categoryBadge,
          { backgroundColor: scoreColor }
        ]}
        accessible={false}
      >
        <Text
          style={[
            styles.categoryText,
            { color: theme.colors.surface || '#FFFFFF' }
          ]}
          accessible={false}
        >
          {category}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  scoreCircle: {
    borderRadius: 50,
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
  },
  labelText: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 2,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  starsText: {
    fontSize: 14,
    marginTop: 2,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});

export default LeadScoreIndicator;