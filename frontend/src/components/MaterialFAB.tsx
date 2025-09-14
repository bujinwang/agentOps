import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
} from 'react-native';
import {
  MaterialColors,
  MaterialElevation,
  MaterialSpacing
} from '../styles/MaterialDesign';
import MaterialIcon from './MaterialIcon';
import { useResponsive } from '../hooks/useResponsive';

interface MaterialFABProps {
  icon: string;
  onPress: () => void;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  visible?: boolean;
  label?: string;
  extended?: boolean;
}

const MaterialFAB: React.FC<MaterialFABProps> = ({
  icon,
  onPress,
  color = MaterialColors.secondary[500],
  size = 'medium',
  position = 'bottom-right',
  visible = true,
  label,
  extended = false,
}) => {
  const scaleValue = new Animated.Value(visible ? 1 : 0);
  const translateY = new Animated.Value(visible ? 0 : 100);

  // Responsive utilities
  const { deviceType, getResponsiveSpacing, getTouchTargetSize, getResponsiveFontSize } = useResponsive();

  // Responsive dimensions
  const responsiveSpacing = getResponsiveSpacing(MaterialSpacing.md);
  const touchTargetSize = getTouchTargetSize(44);

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 0,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 100,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.9,
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

  const getSize = () => {
    const sizes = {
      small: {
        width: 40,
        height: 40,
        borderRadius: 20,
        fontSize: 20,
        iconSize: 20,
      },
      medium: {
        width: 56,
        height: 56,
        borderRadius: 28,
        fontSize: 24,
        iconSize: 24,
      },
      large: {
        width: 72,
        height: 72,
        borderRadius: 36,
        fontSize: 32,
        iconSize: 28,
      },
    };
    return sizes[size];
  };

  const getPositionStyle = () => {
    const baseSpacing = responsiveSpacing;
    const positions = {
      'bottom-right': {
        right: baseSpacing,
        bottom: baseSpacing,
      },
      'bottom-center': {
        left: '50%' as any,
        bottom: baseSpacing,
        transform: [{ translateX: -sizeStyles.width / 2 }],
      },
      'bottom-left': {
        left: baseSpacing,
        bottom: baseSpacing,
      },
    };
    return positions[position];
  };

  const sizeStyles = getSize();
  const positionStyle = getPositionStyle();

  const FABContent = () => (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      style={[
        styles.fab,
        {
          width: Math.max(sizeStyles.width, touchTargetSize),
          height: Math.max(sizeStyles.height, touchTargetSize),
          borderRadius: sizeStyles.borderRadius,
          backgroundColor: color,
          minWidth: touchTargetSize,
          minHeight: touchTargetSize,
        },
        positionStyle,
        extended && styles.extendedFab,
      ]}
    >
      <Animated.View
        style={[
          styles.fabContent,
          {
            transform: [{ scale: scaleValue }, { translateY }],
          },
          extended && styles.extendedFabContent,
        ]}
      >
        <MaterialIcon
          name={icon}
          category="actions"
          size={sizeStyles.iconSize}
          color={MaterialColors.onPrimary}
        />
        {extended && label && (
          <Text style={[styles.fabLabel, { fontSize: getResponsiveFontSize(14) }]}>{label}</Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );

  return FABContent();
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    color: MaterialColors.onPrimary,
    fontWeight: '300',
  },
  fabLabel: {
    color: MaterialColors.onPrimary,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: MaterialSpacing.sm,
  },
  extendedFab: {
    width: 'auto',
    paddingHorizontal: MaterialSpacing.lg,
    flexDirection: 'row',
  },
  extendedFabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default MaterialFAB;