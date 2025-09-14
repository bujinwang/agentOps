import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { MaterialSpacing } from '../../styles/MaterialDesign';
import SkeletonCard, { LeadCardSkeleton, TaskCardSkeleton, CompactCardSkeleton } from './SkeletonCard';

interface SkeletonListProps {
  // List configuration
  count?: number;
  cardType?: 'lead' | 'task' | 'compact' | 'custom';

  // Custom card props
  cardHeight?: number;
  animated?: boolean;

  // Layout
  horizontal?: boolean;
  showsHorizontalScrollIndicator?: boolean;
  showsVerticalScrollIndicator?: boolean;

  // Theming
  theme?: 'light' | 'dark' | 'auto';

  // Accessibility
  accessibilityLabel?: string;
}

const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  cardType = 'lead',
  cardHeight,
  animated = true,
  horizontal = false,
  showsHorizontalScrollIndicator = false,
  showsVerticalScrollIndicator = true,
  theme = 'auto',
  accessibilityLabel = 'Loading list',
}) => {
  const renderSkeletonCard = ({ index }: { index: number }) => {
    const key = `skeleton-${index}`;

    switch (cardType) {
      case 'lead':
        return (
          <LeadCardSkeleton
            key={key}
            animated={animated}
            theme={theme}
            accessibilityLabel={`${accessibilityLabel} item ${index + 1}`}
          />
        );
      case 'task':
        return (
          <TaskCardSkeleton
            key={key}
            animated={animated}
            theme={theme}
            accessibilityLabel={`${accessibilityLabel} item ${index + 1}`}
          />
        );
      case 'compact':
        return (
          <CompactCardSkeleton
            key={key}
            animated={animated}
            theme={theme}
            accessibilityLabel={`${accessibilityLabel} item ${index + 1}`}
          />
        );
      case 'custom':
        return (
          <SkeletonCard
            key={key}
            height={cardHeight || 120}
            animated={animated}
            theme={theme}
            accessibilityLabel={`${accessibilityLabel} item ${index + 1}`}
          />
        );
      default:
        return (
          <LeadCardSkeleton
            key={key}
            animated={animated}
            theme={theme}
            accessibilityLabel={`${accessibilityLabel} item ${index + 1}`}
          />
        );
    }
  };

  const skeletonData = Array.from({ length: count }, (_, index) => ({ id: index }));

  if (horizontal) {
    return (
      <View style={styles.horizontalContainer}>
        <FlatList
          data={skeletonData}
          renderItem={renderSkeletonCard}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.horizontalContent}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="list"
        />
      </View>
    );
  }

  return (
    <FlatList
      data={skeletonData}
      renderItem={renderSkeletonCard}
      keyExtractor={(item) => item.id.toString()}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.verticalContent}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="list"
    />
  );
};

// Specialized Skeleton List Components
export const LeadListSkeleton: React.FC<Omit<SkeletonListProps, 'cardType'>> = (props) => (
  <SkeletonList {...props} cardType="lead" accessibilityLabel="Loading leads" />
);

export const TaskListSkeleton: React.FC<Omit<SkeletonListProps, 'cardType'>> = (props) => (
  <SkeletonList {...props} cardType="task" accessibilityLabel="Loading tasks" />
);

export const CompactListSkeleton: React.FC<Omit<SkeletonListProps, 'cardType'>> = (props) => (
  <SkeletonList {...props} cardType="compact" accessibilityLabel="Loading items" />
);

export const HorizontalCardSkeleton: React.FC<Omit<SkeletonListProps, 'horizontal' | 'cardType'>> = (props) => (
  <SkeletonList {...props} horizontal={true} cardType="compact" />
);

const styles = StyleSheet.create({
  horizontalContainer: {
    height: 140, // Fixed height for horizontal scrolling
  },
  horizontalContent: {
    paddingHorizontal: MaterialSpacing.sm,
  },
  verticalContent: {
    paddingVertical: MaterialSpacing.sm,
  },
});

export default SkeletonList;