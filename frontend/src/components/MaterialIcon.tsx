import React, { useEffect, useRef } from 'react';
import { ViewStyle, TextStyle, Animated } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import {
  MaterialColors,
  MaterialIcons,
  MaterialIconSizes,
  MaterialIconThemes,
  MaterialIconStates,
  MaterialIconAnimations,
  MaterialIconContexts,
} from '../styles/MaterialDesign';

interface MaterialIconProps {
  // Icon identification
  name: string;
  category?: keyof typeof MaterialIcons;
  
  // Styling
  size?: keyof typeof MaterialIconSizes | number;
  color?: string;
  
  // State and behavior
  state?: 'default' | 'active' | 'inactive' | 'disabled' | 'hover' | 'pressed' | 'loading' | 'success' | 'error' | 'warning' | 'info';
  variant?: 'filled' | 'outlined' | 'rounded' | 'sharp' | 'two-tone';
  
  // Accessibility
  accessibilityLabel?: string;
  
  // Layout
  style?: ViewStyle | TextStyle;
  
  // Interaction
  onPress?: () => void;
  
  // Theming
  theme?: 'light' | 'dark' | 'auto';
  context?: keyof typeof MaterialIconContexts;
  
  // Animation
  animated?: boolean;
  animationPreset?: keyof typeof MaterialIconAnimations;
  customAnimation?: {
    duration?: number;
    easing?: string;
    loop?: boolean;
  };
}

const MaterialIcon: React.FC<MaterialIconProps> = ({
  name,
  category,
  size = 'md',
  color,
  state = 'default',
  variant = 'filled',
  accessibilityLabel,
  style,
  onPress,
  theme = 'light',
  context,
  animated = false,
  animationPreset = 'standard',
  customAnimation,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const rotationValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(1)).current;

  // Resolve icon name from category if provided
  const getIconName = (): string => {
    if (category && MaterialIcons[category] && MaterialIcons[category][name]) {
      return MaterialIcons[category][name];
    }
    return name;
  };

  // Resolve icon size with context awareness
  const getIconSize = (): number => {
    if (typeof size === 'number') {
      return size;
    }
    
    // Use context-specific size if available
    if (context && MaterialIconContexts[context]) {
      return MaterialIconContexts[context].defaultSize;
    }
    
    return MaterialIconSizes[size] || MaterialIconSizes.md;
  };

  // Resolve icon color with enhanced theming
  const getIconColor = (): string => {
    if (color) {
      return color;
    }

    // Context-specific colors
    if (context && MaterialIconContexts[context]) {
      const contextConfig = MaterialIconContexts[context];
      switch (state) {
        case 'active':
          return contextConfig.activeColor || contextConfig.primaryColor;
        case 'inactive':
          return contextConfig.inactiveColor || contextConfig.secondaryColor;
        case 'success':
          return contextConfig.successColor || MaterialColors.secondary[600];
        case 'error':
          return contextConfig.errorColor || MaterialColors.error[500];
        case 'warning':
          return contextConfig.warningColor || MaterialColors.warning[600];
      }
    }

    // Theme-based colors
    const themeColors = MaterialIconThemes[theme];
    return themeColors[state] || themeColors.default;
  };

  // Get state-based styling
  const getStateStyle = () => {
    const stateConfig = MaterialIconStates[state] || MaterialIconStates.default;
    return {
      opacity: stateConfig.opacity,
      transform: [
        { scaleX: stateConfig.scale },
        { scaleY: stateConfig.scale },
        { rotate: `${stateConfig.rotation}deg` },
      ],
    };
  };

  // Setup animations
  useEffect(() => {
    if (!animated) return;

    const animationConfig = customAnimation || MaterialIconAnimations[animationPreset];
    const stateConfig = MaterialIconStates[state] || MaterialIconStates.default;

    // Animate to state values
    Animated.parallel([
      Animated.timing(scaleValue, {
        toValue: stateConfig.scale,
        duration: animationConfig.duration,
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: stateConfig.opacity,
        duration: animationConfig.duration,
        useNativeDriver: true,
      }),
      state === 'loading' ? 
        Animated.loop(
          Animated.timing(rotationValue, {
            toValue: 1,
            duration: animationConfig.duration * 2,
            useNativeDriver: true,
          })
        ) :
        Animated.timing(rotationValue, {
          toValue: 0,
          duration: animationConfig.duration,
          useNativeDriver: true,
        }),
    ]).start();
  }, [state, animated, animationPreset, customAnimation]);

  const iconName = getIconName();
  const iconSize = getIconSize();
  const iconColor = getIconColor();
  const stateStyle = getStateStyle();

  const iconStyle: TextStyle = {
    fontSize: iconSize,
    color: iconColor,
    ...(!animated && stateStyle),
    ...style,
  };

  const animatedStyle = animated ? {
    opacity: opacityValue,
    transform: [
      { scaleX: scaleValue },
      { scaleY: scaleValue },
      {
        rotate: rotationValue.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ] as any,
  } : {};

  const IconComponent = animated ? Animated.createAnimatedComponent(Icon) : Icon;

  return (
    <IconComponent
      name={iconName as any}
      size={iconSize}
      color={iconColor}
      accessibilityLabel={accessibilityLabel || `${category || 'icon'} ${name}`}
      style={[iconStyle, animatedStyle]}
      onPress={onPress}
    />
  );
};

// Enhanced Specialized Icon Components
export const NavigationIcon: React.FC<Omit<MaterialIconProps, 'category' | 'context'>> = (props) => (
  <MaterialIcon 
    {...props} 
    category="navigation" 
    context="navigation"
    size={props.size || 'navigation'} 
  />
);

export const ActionIcon: React.FC<Omit<MaterialIconProps, 'category' | 'context'>> = (props) => (
  <MaterialIcon 
    {...props} 
    category="actions" 
    context="action"
    size={props.size || 'button'} 
  />
);

export const StatusIcon: React.FC<Omit<MaterialIconProps, 'category' | 'context'>> = (props) => {
  const getStatusState = (): MaterialIconProps['state'] => {
    if (props.state) return props.state;
    
    // Auto-determine state based on icon name
    const iconName = props.name.toLowerCase();
    if (iconName.includes('check') || iconName.includes('done')) return 'success';
    if (iconName.includes('error') || iconName.includes('close')) return 'error';
    if (iconName.includes('warning') || iconName.includes('alert')) return 'warning';
    if (iconName.includes('info') || iconName.includes('help')) return 'info';
    
    return 'default';
  };

  return (
    <MaterialIcon
      {...props}
      category="status"
      context="status"
      state={getStatusState()}
      size={props.size || 'sm'}
      animated={props.animated ?? true}
    />
  );
};

export const RealEstateIcon: React.FC<Omit<MaterialIconProps, 'category'>> = (props) => (
  <MaterialIcon {...props} category="realEstate" size={props.size || 'md'} />
);

export const BusinessIcon: React.FC<Omit<MaterialIconProps, 'category'>> = (props) => (
  <MaterialIcon {...props} category="business" size={props.size || 'md'} />
);

// Enhanced Icon Button with State Management
interface IconButtonProps extends MaterialIconProps {
  onPress: () => void;
  disabled?: boolean;
  rippleColor?: string;
  borderless?: boolean;
  pressedState?: boolean;
  hoverState?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  disabled = false,
  pressedState = false,
  hoverState = false,
  rippleColor,
  borderless = true,
  ...iconProps
}) => {
  const getButtonState = (): MaterialIconProps['state'] => {
    if (disabled) return 'disabled';
    if (pressedState) return 'pressed';
    if (hoverState) return 'hover';
    return iconProps.state || 'default';
  };

  return (
    <MaterialIcon
      {...iconProps}
      state={getButtonState()}
      context="action"
      animated={iconProps.animated ?? true}
      animationPreset="subtle"
      onPress={disabled ? undefined : iconProps.onPress}
    />
  );
};

// Icon Variant Utilities
export const createIconVariant = (
  baseProps: Partial<MaterialIconProps>
) => {
  return (props: MaterialIconProps) => (
    <MaterialIcon {...baseProps} {...props} />
  );
};

export const createThemedIconSet = (theme: 'light' | 'dark') => {
  return {
    NavigationIcon: (props: Omit<MaterialIconProps, 'theme'>) => (
      <NavigationIcon {...props} theme={theme} />
    ),
    ActionIcon: (props: Omit<MaterialIconProps, 'theme'>) => (
      <ActionIcon {...props} theme={theme} />
    ),
    StatusIcon: (props: Omit<MaterialIconProps, 'theme'>) => (
      <StatusIcon {...props} theme={theme} />
    ),
  };
};

export default MaterialIcon;