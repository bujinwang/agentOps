import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { MaterialColors, MaterialElevation, MaterialSpacing, MaterialTypography } from '../styles/MaterialDesign';
import { BusinessIcon, StatusIcon } from './MaterialIcon';

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
  trend,
  icon,
  color = MaterialColors.primary[500],
  onPress,
  elevation = 1,
}) => {
  const scaleValue = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const getTrendColor = () => {
    if (!trend) return MaterialColors.neutral[500];
    return trend.isPositive ? MaterialColors.secondary[500] : MaterialColors.error[500];
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

  const CardContent = () => (
    <View style={[styles.container, { backgroundColor: MaterialColors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: MaterialColors.neutral[700] }]} numberOfLines={1}>
          {title}
        </Text>
        {icon && (
          <BusinessIcon
            name={icon}
            size={24}
            color={color}
            style={styles.iconContainer}
          />
        )}
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.value, { color: MaterialColors.neutral[900] }]}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
        
        {subtitle && (
          <Text style={[styles.subtitle, { color: MaterialColors.neutral[600] }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      
      {trend && (
        <View style={styles.trend}>
          <Text style={[styles.trendIcon, { color: getTrendColor() }]}>
            <StatusIcon
              name={getTrendIcon()}
              size={16}
              color={getTrendColor()}
              state={trend === 'up' ? 'success' : trend === 'down' ? 'error' : 'default'}
            />
          </Text>
          <Text style={[styles.trendValue, { color: getTrendColor() }]}>
            {Math.abs(trend.value)}%
          </Text>
          <Text style={[styles.trendLabel, { color: MaterialColors.neutral[600] }]}>
            {trend.isPositive ? 'increase' : 'decrease'}
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
        <Animated.View
          style={[
            styles.animatedContainer,
            { transform: [{ scale: scaleValue }] },
            getElevationStyle(elevation),
          ]}
        >
          <CardContent />
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, getElevationStyle(elevation)]}>
      <CardContent />
    </View>
  );
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
  container: {
    borderRadius: 12,
    padding: MaterialSpacing.md,
    margin: MaterialSpacing.xs,
    minWidth: 140,
    minHeight: 100,
  },
  animatedContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.sm,
  },
  title: {
    ...MaterialTypography.labelMedium,
    flex: 1,
    marginRight: MaterialSpacing.sm,
  },
  icon: {
    fontSize: 20,
  },
  content: {
    marginBottom: MaterialSpacing.sm,
  },
  value: {
    ...MaterialTypography.headlineSmall,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    ...MaterialTypography.bodySmall,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: MaterialSpacing.xs,
  },
  trendIcon: {
    ...MaterialTypography.bodySmall,
    marginRight: 2,
  },
  trendValue: {
    ...MaterialTypography.bodySmall,
    fontWeight: '600',
    marginRight: 4,
  },
  trendLabel: {
    ...MaterialTypography.bodySmall,
  },
});

export default MaterialKPICard;