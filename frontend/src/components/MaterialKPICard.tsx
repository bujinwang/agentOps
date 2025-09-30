import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {
  MaterialColors,
  MaterialElevation,
  MaterialSpacing,
  MaterialTypography,
  MaterialShape,
} from '../styles/MaterialDesign';
import { BusinessIcon, StatusIcon } from './MaterialIcon';
import { useResponsive } from '../hooks/useResponsive';

interface MaterialKPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
  icon?: string;
  onPress?: () => void;
  elevation?: number;
}

const MaterialKPICard: React.FC<MaterialKPICardProps> = ({
  title,
  value,
  subtitle,
  trend = 'neutral',
  trendValue,
  icon,
  color = MaterialColors.primary[500],
  onPress,
  elevation = 1,
}) => {
  const responsive = useResponsive();
  const scaleValue = useRef(new Animated.Value(1)).current;

  const dynamicStyles = useMemo(() => ({
    container: {
      minWidth: responsive.isDesktop ? 240 : responsive.isTablet ? 200 : 160,
      minHeight: responsive.getTouchTargetSize(104),
      padding: responsive.getResponsivePadding(MaterialSpacing.lg, {
        mobile: MaterialSpacing.md,
        tablet: MaterialSpacing.lg,
        desktop: MaterialSpacing.xl,
      }),
    },
    value: {
      fontSize: responsive.getResponsiveFontSize(28),
    },
    subtitle: {
      fontSize: responsive.getResponsiveFontSize(14),
    },
    title: {
      fontSize: responsive.getResponsiveFontSize(12),
    },
    trendValue: {
      fontSize: responsive.getResponsiveFontSize(13),
    },
  }), [responsive]);

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return MaterialColors.secondary[500];
      case 'down':
        return MaterialColors.error[500];
      default:
        return MaterialColors.neutral[500];
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return 'trending_up';
      case 'down':
        return 'trending_down';
      default:
        return 'trending_flat';
    }
  };

  const content = (
    <View style={[styles.card, dynamicStyles.container, getElevationStyle(elevation)]}>
      <View style={styles.header}>
        <Text style={[styles.title, dynamicStyles.title, { color: MaterialColors.neutral[600] }]} numberOfLines={1}>
          {title}
        </Text>
        {icon && (
          <BusinessIcon
            name={icon}
            size={responsive.isMobile ? 20 : 24}
            color={color}
          />
        )}
      </View>

      <View style={styles.valueContainer}>
        <Text style={[styles.value, dynamicStyles.value, { color: MaterialColors.onSurface }]} numberOfLines={1}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, dynamicStyles.subtitle]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {trendValue && (
        <View style={styles.trendRow}>
          <StatusIcon
            name={getTrendIcon()}
            size={16}
            color={getTrendColor()}
            state={trend === 'up' ? 'success' : trend === 'down' ? 'error' : 'default'}
          />
          <Text style={[styles.trendValue, dynamicStyles.trendValue, { color: getTrendColor() }]}>
            {trendValue}
          </Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
          {content}
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return content;
};

const getElevationStyle = (level: number) => {
  const elevations = {
    0: MaterialElevation.level0,
    1: MaterialElevation.level1,
    2: MaterialElevation.level2,
    3: MaterialElevation.level3,
    4: MaterialElevation.level4,
    5: MaterialElevation.level5,
  };

  return elevations[level as keyof typeof elevations] || MaterialElevation.level1;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: MaterialColors.surface,
    borderRadius: MaterialShape.large,
    gap: MaterialSpacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: MaterialSpacing.sm,
  },
  title: {
    ...MaterialTypography.labelMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueContainer: {
    gap: 4,
  },
  value: {
    ...MaterialTypography.headlineSmall,
    fontWeight: '600',
  },
  subtitle: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MaterialSpacing.xs,
  },
  trendValue: {
    ...MaterialTypography.labelMedium,
    fontWeight: '600',
  },
});

export default MaterialKPICard;
