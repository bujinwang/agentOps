import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { MaterialColors, MaterialSpacing, MaterialShape } from '../../styles/MaterialDesign';
import { useTheme } from '../../contexts/ThemeContext';

interface SkeletonCardProps {
  // Animation
  animated?: boolean;
  animationDuration?: number;

  // Layout
  height?: number;
  width?: 'full' | 'auto';

  // Theming
  theme?: 'light' | 'dark' | 'auto';

  // Accessibility
  accessibilityLabel?: string;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({
  animated = true,
  animationDuration = 1500,
  height = 120,
  width = 'full',
  theme = 'auto',
  accessibilityLabel = 'Loading content',
}) => {
  const { theme: currentTheme } = useTheme();
  const shimmerValue = useRef(new Animated.Value(0)).current;

  const resolvedTheme = theme === 'auto' ? currentTheme : theme;

  useEffect(() => {
    if (!animated) return;

    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: animationDuration,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: animationDuration,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, [animated, animationDuration, shimmerValue]);

  const shimmerOpacity = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const skeletonColor = resolvedTheme === 'dark'
    ? MaterialColors.surface[700]
    : MaterialColors.neutral[200];

  const shimmerColor = resolvedTheme === 'dark'
    ? MaterialColors.surface[500]
    : MaterialColors.neutral[100];

  const containerStyle = {
    height,
    width: width === 'full' ? '100%' as const : undefined,
    backgroundColor: skeletonColor,
    borderRadius: MaterialShape.medium,
    padding: MaterialSpacing.md,
    marginHorizontal: MaterialSpacing.sm,
    marginVertical: MaterialSpacing.xs,
  };

  return (
    <View
      style={containerStyle}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
    >
      {/* Header skeleton */}
      <View style={styles.header}>
        <View style={styles.nameSkeleton}>
          <Animated.View
            style={[
              styles.skeletonLine,
              styles.nameLine,
              { backgroundColor: shimmerColor, opacity: shimmerOpacity }
            ]}
          />
          <Animated.View
            style={[
              styles.skeletonLine,
              styles.emailLine,
              { backgroundColor: shimmerColor, opacity: shimmerOpacity }
            ]}
          />
        </View>
        <View style={styles.badgesSkeleton}>
          <Animated.View
            style={[
              styles.skeletonBadge,
              { backgroundColor: shimmerColor, opacity: shimmerOpacity }
            ]}
          />
        </View>
      </View>

      {/* Content lines skeleton */}
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.skeletonLine,
            styles.contentLine,
            { backgroundColor: shimmerColor, opacity: shimmerOpacity }
          ]}
        />
        <Animated.View
          style={[
            styles.skeletonLine,
            styles.contentLine,
            { backgroundColor: shimmerColor, opacity: shimmerOpacity }
          ]}
        />
        <Animated.View
          style={[
            styles.skeletonLine,
            styles.contentLineShort,
            { backgroundColor: shimmerColor, opacity: shimmerOpacity }
          ]}
        />
      </View>

      {/* Footer skeleton */}
      <View style={styles.footer}>
        <Animated.View
          style={[
            styles.skeletonBadge,
            styles.statusBadge,
            { backgroundColor: shimmerColor, opacity: shimmerOpacity }
          ]}
        />
        <Animated.View
          style={[
            styles.skeletonLine,
            styles.dateLine,
            { backgroundColor: shimmerColor, opacity: shimmerOpacity }
          ]}
        />
      </View>
    </View>
  );
};

// Specialized Skeleton Components
export const LeadCardSkeleton: React.FC<Omit<SkeletonCardProps, 'height'>> = (props) => (
  <SkeletonCard {...props} height={140} />
);

export const TaskCardSkeleton: React.FC<Omit<SkeletonCardProps, 'height'>> = (props) => (
  <SkeletonCard {...props} height={100} />
);

export const CompactCardSkeleton: React.FC<Omit<SkeletonCardProps, 'height'>> = (props) => (
  <SkeletonCard {...props} height={80} />
);

export const LeadDetailSkeleton: React.FC<Omit<SkeletonCardProps, 'height' | 'width'>> = (props) => (
  <View style={styles.detailSkeletonContainer}>
    {[180, 140, 200].map((height, index) => (
      <View key={`lead-detail-skeleton-${index}`} style={styles.detailSkeletonBlock}>
        <SkeletonCard {...props} height={height} />
      </View>
    ))}
  </View>
);

export const TaskDetailSkeleton: React.FC<Omit<SkeletonCardProps, 'height' | 'width'>> = (props) => (
  <View style={styles.detailSkeletonContainer}>
    {[160, 120, 140].map((height, index) => (
      <View key={`task-detail-skeleton-${index}`} style={styles.detailSkeletonBlock}>
        <SkeletonCard {...props} height={height} />
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: MaterialSpacing.sm,
  },
  nameSkeleton: {
    flex: 1,
    marginRight: MaterialSpacing.sm,
  },
  badgesSkeleton: {
    alignItems: 'flex-end',
  },
  content: {
    marginBottom: MaterialSpacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: MaterialSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[200],
  },
  skeletonLine: {
    borderRadius: MaterialShape.small,
    marginBottom: MaterialSpacing.xs,
  },
  skeletonBadge: {
    borderRadius: MaterialShape.small,
    height: 20,
  },
  nameLine: {
    height: 16,
    width: '80%',
  },
  emailLine: {
    height: 12,
    width: '60%',
  },
  contentLine: {
    height: 14,
    width: '90%',
  },
  contentLineShort: {
    height: 14,
    width: '70%',
  },
  statusBadge: {
    width: 60,
  },
  dateLine: {
    height: 12,
    width: 80,
  },
  detailSkeletonContainer: {
    width: '100%',
  },
  detailSkeletonBlock: {
    marginBottom: MaterialSpacing.sm,
  },
});

export default SkeletonCard;
