import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import {
  MaterialColors,
  MaterialElevation,
  MaterialSpacing,
  MaterialTypography
} from '../styles/MaterialDesign';
import { useResponsive } from '../hooks/useResponsive';

interface MaterialSnackbarProps {
  message: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  duration?: number;
  onDismiss: () => void;
  type?: 'default' | 'success' | 'error' | 'warning';
  position?: 'top' | 'bottom';
}

const MaterialSnackbar: React.FC<MaterialSnackbarProps> = ({
  message,
  action,
  duration = 4000,
  onDismiss,
  type = 'default',
  position = 'bottom',
}) => {
  const slideAnim = useRef(new Animated.Value(position === 'bottom' ? 100 : -100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Responsive utilities
  const { deviceType, getResponsiveSpacing, getResponsiveFontSize, getTouchTargetSize } = useResponsive();

  // Responsive dimensions
  const responsiveSpacing = getResponsiveSpacing(MaterialSpacing.md);
  const responsiveMessageSize = getResponsiveFontSize(14); // bodyMedium base
  const responsiveActionSize = getResponsiveFontSize(14); // labelMedium base
  const touchTargetSize = getTouchTargetSize(44);

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss after duration
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: position === 'bottom' ? 100 : -100,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const handleActionPress = () => {
    if (action) {
      action.onPress();
    }
    handleDismiss();
  };

  const getBackgroundColor = () => {
    const colors = {
      default: MaterialColors.neutral[800],
      success: MaterialColors.secondary[600],
      error: MaterialColors.error[600],
      warning: MaterialColors.warning[600],
    };
    return colors[type];
  };

  const getActionColor = () => {
    return type === 'default' ? MaterialColors.secondary[200] : MaterialColors.onPrimary;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          left: responsiveSpacing,
          right: responsiveSpacing,
          paddingHorizontal: responsiveSpacing,
          paddingVertical: getResponsiveSpacing(MaterialSpacing.sm),
          minHeight: touchTargetSize,
        },
        position === 'top' ? styles.topPosition : styles.bottomPosition,
      ]}
    >
      <View style={styles.content}>
        <Text
          style={[
            styles.message,
            {
              color: MaterialColors.onPrimary,
              fontSize: responsiveMessageSize,
              marginRight: getResponsiveSpacing(MaterialSpacing.sm),
            }
          ]}
          numberOfLines={2}
        >
          {message}
        </Text>

        {action && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                paddingHorizontal: responsiveSpacing,
                paddingVertical: getResponsiveSpacing(MaterialSpacing.xs),
                marginLeft: getResponsiveSpacing(MaterialSpacing.sm),
                minWidth: touchTargetSize,
                minHeight: touchTargetSize,
              }
            ]}
            onPress={handleActionPress}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionText, { color: getActionColor(), fontSize: responsiveActionSize }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        )}

        {!action && (
          <TouchableOpacity
            style={[
              styles.dismissButton,
              {
                paddingHorizontal: getResponsiveSpacing(MaterialSpacing.sm),
                paddingVertical: getResponsiveSpacing(MaterialSpacing.xs),
                marginLeft: getResponsiveSpacing(MaterialSpacing.sm),
                minWidth: touchTargetSize,
                minHeight: touchTargetSize,
              }
            ]}
            onPress={handleDismiss}
            activeOpacity={0.8}
          >
            <Text style={[styles.dismissText, { color: MaterialColors.onPrimary, fontSize: responsiveActionSize }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    borderRadius: 8,
    ...MaterialElevation.level4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    // All positioning and sizing is now applied responsively
  },
  topPosition: {
    top: 60,
  },
  bottomPosition: {
    bottom: 80,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: {
    ...MaterialTypography.bodyMedium,
    flex: 1,
    // marginRight is now applied responsively
  },
  actionButton: {
    borderRadius: 4,
    // All padding and sizing is now applied responsively
  },
  actionText: {
    ...MaterialTypography.labelMedium,
    fontWeight: '600',
  },
  dismissButton: {
    // All padding and sizing is now applied responsively
  },
  dismissText: {
    fontWeight: '600',
    // fontSize is now applied responsively
  },
});

export default MaterialSnackbar;