import React, { useEffect, useRef } from 'react';
import { View, ViewStyle, ActivityIndicator, Animated } from 'react-native';
import { MaterialColors, MaterialSpacing } from '../../styles/MaterialDesign';
import { useTheme } from '../../contexts/ThemeContext';

interface LoadingIndicatorProps {
  // Size variants
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';

  // Color variants
  color?: 'primary' | 'secondary' | 'surface' | 'onSurface' | 'custom';
  customColor?: string;

  // Layout
  style?: ViewStyle;
  centered?: boolean;
  fullScreen?: boolean;

  // Animation
  animated?: boolean;
  animationType?: 'spinner' | 'pulse' | 'bounce';

  // Accessibility
  accessibilityLabel?: string;
  hideFromScreenReader?: boolean;

  // Theming
  theme?: 'light' | 'dark' | 'auto';
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'md',
  color = 'primary',
  customColor,
  style,
  centered = false,
  fullScreen = false,
  animated = true,
  animationType = 'spinner',
  accessibilityLabel = 'Loading',
  hideFromScreenReader = false,
  theme = 'auto',
}) => {
  const { theme: currentTheme } = useTheme();
  const pulseValue = useRef(new Animated.Value(1)).current;
  const bounceValue = useRef(new Animated.Value(0)).current;

  // Resolve theme
  const resolvedTheme = theme === 'auto' ? currentTheme : theme;

  // Size mappings
  const sizeMap = {
    xs: 16,
    sm: 24,
    md: 32,
    lg: 48,
    xl: 64,
  };

  // Color mappings
  const getColor = (): string => {
    if (customColor) return customColor;

    const themeColors = resolvedTheme === 'dark' ? MaterialColors.surface : MaterialColors.primary;

    switch (color) {
      case 'primary':
        return resolvedTheme === 'dark' ? MaterialColors.primary[400] : MaterialColors.primary[600];
      case 'secondary':
        return resolvedTheme === 'dark' ? MaterialColors.secondary[400] : MaterialColors.secondary[600];
      case 'surface':
        return resolvedTheme === 'dark' ? MaterialColors.surface[400] : MaterialColors.surface[800];
      case 'onSurface':
        return resolvedTheme === 'dark' ? MaterialColors.surface[100] : MaterialColors.surface[900];
      default:
        return resolvedTheme === 'dark' ? MaterialColors.primary[400] : MaterialColors.primary[600];
    }
  };

  // Setup animations
  useEffect(() => {
    if (!animated) return;

    if (animationType === 'pulse') {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }

    if (animationType === 'bounce') {
      const bounceAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceValue, {
            toValue: -10,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(bounceValue, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
      bounceAnimation.start();
      return () => bounceAnimation.stop();
    }
  }, [animated, animationType, pulseValue, bounceValue]);

  const indicatorSize = sizeMap[size];
  const indicatorColor = getColor();

  // Container styles
  const containerStyle: ViewStyle = {
    alignItems: centered ? 'center' : undefined,
    justifyContent: centered ? 'center' : undefined,
    padding: MaterialSpacing.md,
    ...style,
  };

  if (fullScreen) {
    containerStyle.flex = 1;
    containerStyle.width = '100%';
    containerStyle.height = '100%';
  }

  // Animation styles
  const animatedStyle = animated ? {
    transform: animationType === 'pulse' ? [{ scale: pulseValue }] :
               animationType === 'bounce' ? [{ translateY: bounceValue }] : [],
  } : {};

  const accessibilityProps = hideFromScreenReader ? {
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants' as const,
  } : {
    accessibilityLabel,
    accessibilityRole: 'progressbar' as const,
  };

  return (
    <View style={containerStyle} {...accessibilityProps}>
      <Animated.View style={animatedStyle}>
        <ActivityIndicator
          size={indicatorSize > 32 ? 'large' : 'small'}
          color={indicatorColor}
          animating={animated}
        />
      </Animated.View>
    </View>
  );
};

// Specialized Loading Components
export const InlineLoader: React.FC<Omit<LoadingIndicatorProps, 'centered' | 'fullScreen'>> = (props) => (
  <LoadingIndicator {...props} size="sm" centered={false} fullScreen={false} />
);

export const CenteredLoader: React.FC<Omit<LoadingIndicatorProps, 'centered' | 'fullScreen'>> = (props) => (
  <LoadingIndicator {...props} centered={true} fullScreen={false} />
);

export const FullScreenLoader: React.FC<Omit<LoadingIndicatorProps, 'centered' | 'fullScreen'>> = (props) => (
  <LoadingIndicator {...props} centered={true} fullScreen={true} />
);

export const SkeletonLoader: React.FC<Omit<LoadingIndicatorProps, 'animationType'>> = (props) => (
  <LoadingIndicator {...props} animationType="pulse" color="surface" />
);

export default LoadingIndicator;