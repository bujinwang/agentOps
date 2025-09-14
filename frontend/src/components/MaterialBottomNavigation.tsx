import React from 'react';
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
  MaterialTypography
} from '../styles/MaterialDesign';
import { NavigationIcon } from './MaterialIcon';
import { useResponsive } from '../hooks/useResponsive';

interface NavigationItem {
  key: string;
  title: string;
  icon: string;
  badge?: number;
}

interface MaterialBottomNavigationProps {
  items: NavigationItem[];
  activeItem: string;
  onItemPress: (key: string) => void;
  backgroundColor?: string;
  activeColor?: string;
  inactiveColor?: string;
  showLabels?: boolean;
}

const MaterialBottomNavigation: React.FC<MaterialBottomNavigationProps> = ({
  items,
  activeItem,
  onItemPress,
  backgroundColor = MaterialColors.surface,
  activeColor = MaterialColors.primary[500],
  inactiveColor = MaterialColors.neutral[500],
  showLabels = true,
}) => {
  const {
    deviceType,
    getResponsiveSpacing,
    getTouchTargetSize,
    getResponsiveFontSize,
    isLandscape,
  } = useResponsive();

  // Responsive dimensions
  const navigationHeight = deviceType === 'desktop' ? 88 : deviceType === 'tablet' ? 84 : 80;
  const itemMinWidth = deviceType === 'desktop' ? 72 : deviceType === 'tablet' ? 68 : 60;
  const responsiveSpacing = getResponsiveSpacing(MaterialSpacing.md);
  const responsiveLabelSize = getResponsiveFontSize(11); // labelSmall base

  // Adjust for landscape orientation on mobile
  const adjustedHeight = isLandscape && deviceType === 'mobile' ? navigationHeight - 8 : navigationHeight;

  // Show labels based on device and orientation
  const shouldShowLabels = showLabels && !(deviceType === 'mobile' && isLandscape && items.length > 4);

  const scaleValues = items.map(() => new Animated.Value(1));

  const handlePressIn = (index: number) => {
    Animated.spring(scaleValues[index], {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (index: number) => {
    Animated.spring(scaleValues[index], {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const renderIcon = (item: NavigationItem, isActive: boolean) => {
    const iconColor = isActive ? activeColor : inactiveColor;
    const iconState = isActive ? 'active' : 'default';
    const iconSize = deviceType === 'desktop' ? 28 : deviceType === 'tablet' ? 26 : 24;

    return (
      <NavigationIcon
        name={item.icon}
        color={iconColor}
        state={iconState}
        size={iconSize}
        accessibilityLabel={`${item.title} tab`}
      />
    );
  };

  const renderBadge = (badge?: number) => {
    if (!badge || badge === 0) return null;

    return (
      <View style={styles.badgeContainer}>
        <View style={[styles.badge, { backgroundColor: MaterialColors.error[500] }]}>
          <Text style={styles.badgeText}>
            {badge > 99 ? '99+' : badge.toString()}
          </Text>
        </View>
      </View>
    );
  };

  const renderItem = (item: NavigationItem, index: number) => {
    const isActive = activeItem === item.key;
    const scaleValue = scaleValues[index];

    return (
      <TouchableOpacity
        key={item.key}
        style={styles.itemContainer}
        onPress={() => onItemPress(item.key)}
        onPressIn={() => handlePressIn(index)}
        onPressOut={() => handlePressOut(index)}
        activeOpacity={0.9}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={`${item.title} tab${isActive ? ', selected' : ''}`}
      >
        <Animated.View
          style={[
            styles.itemContent,
            { transform: [{ scale: scaleValue }] },
          ]}
        >
          <View style={styles.iconContainer}>
            {renderIcon(item, isActive)}
            {renderBadge(item.badge)}
          </View>
          {shouldShowLabels && (
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? activeColor : inactiveColor,
                  fontSize: responsiveLabelSize,
                },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
          )}
          {isActive && (
            <View
              style={[
                styles.activeIndicator,
                { backgroundColor: activeColor },
              ]}
            />
          )}
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, {
      backgroundColor,
      height: adjustedHeight,
      paddingHorizontal: responsiveSpacing,
    }]}>
      <View style={styles.content}>
        {items.map((item, index) => renderItem(item, index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: MaterialSpacing.sm,
    ...MaterialElevation.level3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  itemContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: MaterialSpacing.sm,
  },
  itemContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: MaterialSpacing.xs,
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -8,
    zIndex: 1,
  },
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    ...MaterialElevation.level2,
  },
  badgeText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
    fontSize: 10,
    fontWeight: '600',
  },
  label: {
    ...MaterialTypography.labelSmall,
    textAlign: 'center',
    marginTop: MaterialSpacing.xs,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    transform: [{ translateX: -12 }],
    width: 24,
    height: 3,
    borderRadius: 2,
  },
});

export default MaterialBottomNavigation;