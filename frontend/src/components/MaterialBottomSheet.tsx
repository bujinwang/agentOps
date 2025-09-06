import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { 
  MaterialColors, 
  MaterialElevation, 
  MaterialSpacing, 
  MaterialTypography,
  MaterialShape 
} from '../styles/MaterialDesign';

interface MaterialBottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  children: React.ReactNode;
  height?: number;
  backgroundColor?: string;
  showDragIndicator?: boolean;
  enableSwipe?: boolean;
}

const MaterialBottomSheet: React.FC<MaterialBottomSheetProps> = ({
  visible,
  onDismiss,
  title,
  children,
  height = 300,
  backgroundColor = MaterialColors.surface,
  showDragIndicator = true,
  enableSwipe = true,
}) => {
  const slideAnim = new Animated.Value(visible ? 0 : height);
  const opacityAnim = new Animated.Value(visible ? 1 : 0);
  const { height: screenHeight } = Dimensions.get('window');

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: height,
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
    }
  }, [visible]);

  const handleBackdropPress = () => {
    onDismiss();
  };

  const handleDrag = () => {
    if (enableSwipe) {
      onDismiss();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: opacityAnim,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          onPress={handleBackdropPress}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Bottom Sheet Content */}
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor,
            transform: [{ translateY: slideAnim }],
            maxHeight: height,
          },
        ]}
      >
        {/* Drag Indicator */}
        {showDragIndicator && (
          <TouchableOpacity
            style={styles.dragIndicatorContainer}
            onPress={handleDrag}
            activeOpacity={0.8}
          >
            <View style={styles.dragIndicator} />
          </TouchableOpacity>
        )}

        {/* Header with Title */}
        {title && (
          <View style={styles.header}>
            <Text style={[styles.title, { color: MaterialColors.onSurface }]}>
              {title}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {children}
        </ScrollView>
      </Animated.View>
    </>
  );
};

// Material Design Action Button for Bottom Sheet
export const MaterialBottomSheetAction = ({
  label,
  onPress,
  icon,
  color = MaterialColors.primary[500],
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  icon?: string;
  color?: string;
  destructive?: boolean;
}) => {
  const handlePress = () => {
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.actionContent}>
        {icon && (
          <Text style={[styles.actionIcon, { color: destructive ? MaterialColors.error[500] : color }]}>
            {icon}
          </Text>
        )}
        <Text style={[
          styles.actionLabel,
          { 
            color: destructive ? MaterialColors.error[500] : MaterialColors.onSurface,
            fontWeight: destructive ? '600' : '500',
          }
        ]}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// Material Design Divider for Bottom Sheet
export const MaterialBottomSheetDivider = () => (
  <View style={styles.divider} />
);

// Material Design Section Header for Bottom Sheet
export const MaterialBottomSheetSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: MaterialColors.onSurfaceVariant }]}>
      {title}
    </Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  backdropTouchable: {
    flex: 1,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: MaterialSpacing.md,
    paddingTop: MaterialSpacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 34 : MaterialSpacing.md,
    zIndex: 1000,
    ...MaterialElevation.level3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  dragIndicatorContainer: {
    alignItems: 'center',
    marginBottom: MaterialSpacing.md,
  },
  dragIndicator: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: MaterialColors.neutral[400],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: MaterialSpacing.md,
    paddingHorizontal: MaterialSpacing.xs,
  },
  title: {
    ...MaterialTypography.titleLarge,
    flex: 1,
  },
  closeButton: {
    padding: MaterialSpacing.xs,
    marginLeft: MaterialSpacing.sm,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: MaterialColors.neutral[600],
  },
  content: {
    flex: 1,
  },
  actionButton: {
    paddingVertical: MaterialSpacing.md,
    paddingHorizontal: MaterialSpacing.sm,
    marginVertical: MaterialSpacing.xs,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 18,
    marginRight: MaterialSpacing.sm,
  },
  actionLabel: {
    ...MaterialTypography.bodyLarge,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: MaterialColors.neutral[200],
    marginVertical: MaterialSpacing.sm,
    marginHorizontal: -MaterialSpacing.md,
  },
  section: {
    marginBottom: MaterialSpacing.lg,
  },
  sectionTitle: {
    ...MaterialTypography.labelMedium,
    marginBottom: MaterialSpacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default MaterialBottomSheet;
export { MaterialBottomSheetAction, MaterialBottomSheetDivider, MaterialBottomSheetSection };