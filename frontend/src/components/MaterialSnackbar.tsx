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
        },
        position === 'top' ? styles.topPosition : styles.bottomPosition,
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.message, { color: MaterialColors.onPrimary }]} numberOfLines={2}>
          {message}
        </Text>

        {action && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleActionPress}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionText, { color: getActionColor() }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        )}

        {!action && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            activeOpacity={0.8}
          >
            <Text style={[styles.dismissText, { color: MaterialColors.onPrimary }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: MaterialSpacing.md,
    right: MaterialSpacing.md,
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    ...MaterialElevation.level6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
    marginRight: MaterialSpacing.sm,
  },
  actionButton: {
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.xs,
    marginLeft: MaterialSpacing.sm,
    borderRadius: 4,
  },
  actionText: {
    ...MaterialTypography.labelMedium,
    fontWeight: '600',
  },
  dismissButton: {
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
    marginLeft: MaterialSpacing.sm,
  },
  dismissText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MaterialSnackbar;