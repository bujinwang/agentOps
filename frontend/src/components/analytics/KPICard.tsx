import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  MaterialColors,
  MaterialElevation,
  MaterialSpacing,
  MaterialTypography
} from '../../styles/MaterialDesign';

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  color?: string;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  format?: 'number' | 'currency' | 'percentage' | 'text';
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = MaterialColors.primary[500],
  onPress,
  size = 'medium',
  format = 'number',
}) => {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'number':
      default:
        return val.toLocaleString();
    }
  };

  const getTrendColor = () => {
    if (!trend) return MaterialColors.neutral[500];

    switch (trend.direction) {
      case 'up':
        return MaterialColors.secondary[600];
      case 'down':
        return MaterialColors.error[500];
      case 'neutral':
      default:
        return MaterialColors.neutral[500];
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;

    switch (trend.direction) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      case 'neutral':
      default:
        return '→';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.smallContainer,
          value: styles.smallValue,
          title: styles.smallTitle,
        };
      case 'large':
        return {
          container: styles.largeContainer,
          value: styles.largeValue,
          title: styles.largeTitle,
        };
      case 'medium':
      default:
        return {
          container: styles.mediumContainer,
          value: styles.mediumValue,
          title: styles.mediumTitle,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const CardContent = () => (
    <View style={[styles.container, sizeStyles.container]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.title, sizeStyles.title]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {trend && (
          <View style={[styles.trendContainer, { backgroundColor: getTrendColor() }]}>
            <Text style={styles.trendIcon}>{getTrendIcon()}</Text>
            <Text style={styles.trendValue}>{Math.abs(trend.value).toFixed(1)}%</Text>
          </View>
        )}
      </View>

      <View style={styles.valueContainer}>
        <Text style={[styles.value, sizeStyles.value, { color }]}>
          {formatValue(value)}
        </Text>
        {trend && (
          <Text style={styles.trendLabel}>
            {trend.label}
          </Text>
        )}
      </View>

      {subtitle && (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      )}

      {trend && (
        <View style={styles.trendDetails}>
          <Text style={[styles.trendDirection, { color: getTrendColor() }]}>
            {trend.direction === 'up' ? 'Increased' : trend.direction === 'down' ? 'Decreased' : 'Stable'}
            {' '}by {Math.abs(trend.value).toFixed(1)}% {trend.label.toLowerCase()}
          </Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.touchableContainer, sizeStyles.container]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <CardContent />
      </TouchableOpacity>
    );
  }

  return <CardContent />;
};

const styles = StyleSheet.create({
  touchableContainer: {
    borderRadius: 12,
  },
  container: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.lg,
    ...MaterialElevation.level2,
  },
  smallContainer: {
    minHeight: 100,
    padding: MaterialSpacing.md,
  },
  mediumContainer: {
    minHeight: 120,
    padding: MaterialSpacing.lg,
  },
  largeContainer: {
    minHeight: 140,
    padding: MaterialSpacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: MaterialSpacing.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: MaterialSpacing.sm,
  },
  title: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[800],
    flex: 1,
  },
  smallTitle: {
    ...MaterialTypography.bodyMedium,
  },
  mediumTitle: {
    ...MaterialTypography.titleMedium,
  },
  largeTitle: {
    ...MaterialTypography.headlineSmall,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
    borderRadius: 12,
  },
  trendIcon: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
    marginRight: MaterialSpacing.xs,
  },
  trendValue: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  valueContainer: {
    marginBottom: MaterialSpacing.sm,
  },
  value: {
    ...MaterialTypography.headlineMedium,
    fontWeight: 'bold',
  },
  smallValue: {
    ...MaterialTypography.titleLarge,
  },
  mediumValue: {
    ...MaterialTypography.headlineMedium,
  },
  largeValue: {
    ...MaterialTypography.headlineLarge,
  },
  trendLabel: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
    marginTop: MaterialSpacing.xs,
  },
  subtitle: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[700],
    marginBottom: MaterialSpacing.sm,
  },
  trendDetails: {
    marginTop: MaterialSpacing.sm,
  },
  trendDirection: {
    ...MaterialTypography.bodySmall,
    fontWeight: '500',
  },
});

export default KPICard;