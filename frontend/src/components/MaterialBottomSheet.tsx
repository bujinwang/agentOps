import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import {
  MaterialColors,
  MaterialElevation,
  MaterialSpacing,
  MaterialTypography,
  MaterialShape,
} from '../styles/MaterialDesign';
import { useResponsive } from '../hooks/useResponsive';

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

const ANIMATION_DURATION = 220;

const MaterialBottomSheet: React.FC<MaterialBottomSheetProps> = ({
  visible,
  onDismiss,
  title,
  children,
  height,
  backgroundColor = MaterialColors.surface,
  showDragIndicator = true,
  enableSwipe = true,
}) => {
  const responsive = useResponsive();
  const slideAnim = useRef(new Animated.Value(visible ? 0 : responsive.height)).current;
  const opacityAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  const {
    sheetWidth,
    sheetMaxHeight,
    sheetPadding,
    dragIndicatorWidth,
    containerPaddingBottom,
    horizontalInset,
  } = useMemo(() => {
    const computedMaxHeight = Math.min(
      height ?? responsive.height * (responsive.isDesktop ? 0.7 : responsive.isTablet ? 0.8 : 0.88),
      responsive.height * (responsive.isLandscape ? 0.95 : 0.9)
    );

    const maxContentWidth = responsive.getMaxContentWidth({
      tablet: 760,
      desktop: 960,
    });

    const width = responsive.isDesktop
      ? Math.min(responsive.width * 0.6, maxContentWidth)
      : responsive.isTablet
        ? Math.min(responsive.width * 0.9, maxContentWidth)
        : responsive.width;

    return {
      sheetWidth: width,
      sheetMaxHeight: computedMaxHeight,
      sheetPadding: responsive.getResponsivePadding(MaterialSpacing.lg, {
        mobile: MaterialSpacing.md,
        tablet: MaterialSpacing.lg,
        desktop: MaterialSpacing.xl,
      }),
      dragIndicatorWidth: responsive.scaleValue(42),
      containerPaddingBottom:
        Platform.OS === 'ios'
          ? responsive.getResponsivePadding(MaterialSpacing.lg, { mobile: MaterialSpacing.lg }) + 16
          : responsive.getResponsivePadding(MaterialSpacing.md, { mobile: MaterialSpacing.md }),
      horizontalInset: responsive.isDesktop ? responsive.getResponsivePadding(MaterialSpacing.xl, { desktop: 48 }) : 0,
    };
  }, [height, responsive]);

  useEffect(() => {
    slideAnim.setValue(visible ? 0 : sheetMaxHeight);
    opacityAnim.setValue(visible ? 1 : 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 9,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: sheetMaxHeight,
          friction: 9,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onDismiss();
      });
    }
  }, [visible, sheetMaxHeight, onDismiss, slideAnim, opacityAnim]);

  useEffect(() => {
    if (!visible) {
      slideAnim.setValue(sheetMaxHeight);
      opacityAnim.setValue(0);
    }
  }, [sheetMaxHeight, visible, slideAnim, opacityAnim]);

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
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: opacityAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          onPress={handleBackdropPress}
          activeOpacity={1}
        />
      </Animated.View>

      <View style={[styles.wrapper, { paddingHorizontal: horizontalInset }]} pointerEvents={visible ? 'auto' : 'none'}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor,
              transform: [{ translateY: slideAnim }],
              maxHeight: sheetMaxHeight,
              width: sheetWidth,
              paddingHorizontal: sheetPadding,
              paddingBottom: containerPaddingBottom,
            },
          ]}
        >
          {showDragIndicator && (
            <TouchableOpacity
              style={styles.dragIndicatorContainer}
              onPress={handleDrag}
              activeOpacity={0.8}
            >
              <View style={[styles.dragIndicator, { width: dragIndicatorWidth }]} />
            </TouchableOpacity>
          )}

          {title && (
            <View style={styles.header}>
              <Text style={[styles.title, { color: MaterialColors.onSurface }]}>{title}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onDismiss}
                activeOpacity={0.8}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView
            style={styles.content}
            contentContainerStyle={{ paddingBottom: sheetPadding / 2 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </>
  );
};

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
  const { getTouchTargetSize, getResponsiveSpacing, getResponsiveFontSize } = useResponsive();
  const buttonHeight = getTouchTargetSize(48);
  const horizontalPadding = getResponsiveSpacing(MaterialSpacing.md);
  const fontSize = getResponsiveFontSize(16);

  return (
    <TouchableOpacity
      style={[styles.actionButton, { minHeight: buttonHeight, paddingHorizontal: horizontalPadding }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.actionContent}>
        {icon && (
          <Text
            style={[
              styles.actionIcon,
              { color: destructive ? MaterialColors.error[500] : color },
            ]}
          >
            {icon}
          </Text>
        )}
        <Text
          style={[
            styles.actionLabel,
            {
              color: destructive ? MaterialColors.error[500] : MaterialColors.onSurface,
              fontWeight: destructive ? '600' : '500',
              fontSize,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export const MaterialBottomSheetDivider = () => (
  <View style={styles.divider} />
);

export const MaterialBottomSheetSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: MaterialColors.onSurfaceVariant }]}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 1000,
  },
  sheet: {
    borderTopLeftRadius: MaterialShape.extraLarge,
    borderTopRightRadius: MaterialShape.extraLarge,
    paddingTop: MaterialSpacing.sm,
    ...MaterialElevation.level4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  dragIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: MaterialSpacing.sm,
  },
  dragIndicator: {
    height: 4,
    borderRadius: 2,
    backgroundColor: MaterialColors.neutral[400],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: MaterialSpacing.md,
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
    width: '100%',
    borderRadius: MaterialShape.medium,
    marginTop: MaterialSpacing.sm,
    backgroundColor: MaterialColors.surface,
    ...MaterialElevation.level1,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MaterialSpacing.sm,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionLabel: {
    ...MaterialTypography.bodyLarge,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: MaterialColors.neutral[200],
    marginVertical: MaterialSpacing.sm,
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
export {
  MaterialBottomSheetAction,
  MaterialBottomSheetDivider,
  MaterialBottomSheetSection,
};
