import React, { useMemo, useRef } from 'react';
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
  MaterialTypography,
  MaterialShape,
} from '../styles/MaterialDesign';
import { BusinessIcon } from './MaterialIcon';
import { useResponsive } from '../hooks/useResponsive';

interface LeadSummary {
  leadId: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  budgetMin?: number;
  budgetMax?: number;
  desiredLocation?: string;
  aiSummary?: string;
  status: string;
  priority: string;
  score?: number;
  scoreCategory?: 'High' | 'Medium' | 'Low';
  scoreLastCalculated?: string;
  createdAt: string;
}

interface MaterialLeadCardProps {
  lead: LeadSummary;
  onPress: () => void;
  elevation?: number;
  showScoreIndicator?: boolean;
}

const MaterialLeadCard: React.FC<MaterialLeadCardProps> = ({
  lead,
  onPress,
  elevation = 1,
  showScoreIndicator = true,
}) => {
  const responsive = useResponsive();
  const scaleValue = useRef(new Animated.Value(1)).current;

  const dynamicStyles = useMemo(() => ({
    container: {
      minHeight: responsive.getTouchTargetSize(120),
      padding: responsive.getResponsivePadding(MaterialSpacing.lg, {
        mobile: MaterialSpacing.md,
        tablet: MaterialSpacing.lg,
        desktop: MaterialSpacing.xl,
      }),
      borderRadius: MaterialShape.large,
    },
    name: {
      fontSize: responsive.getResponsiveFontSize(18),
    },
    meta: {
      fontSize: responsive.getResponsiveFontSize(13),
    },
    date: {
      fontSize: responsive.getResponsiveFontSize(12),
    },
    flexBasis: responsive.isDesktop
      ? `${100 / responsive.getGridColumns({ desktop: 3, tablet: 2, mobile: 1 })}%`
      : '100%',
  }), [responsive]);

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  const getStatusColor = (status: string): string => {
    const colors = {
      'New': MaterialColors.primary[500],
      'Contacted': MaterialColors.secondary[500],
      'Qualified': MaterialColors.warning[500],
      'Showing Scheduled': MaterialColors.neutral[600],
      'Offer Made': MaterialColors.error[500],
      'Closed Won': MaterialColors.secondary[700],
      'Closed Lost': MaterialColors.neutral[500],
      'Archived': MaterialColors.neutral[400],
    } as const;
    return colors[status as keyof typeof colors] ?? MaterialColors.neutral[500];
  };

  const getPriorityColor = (priority: string): string => {
    const colors = {
      High: MaterialColors.error[500],
      Medium: MaterialColors.warning[500],
      Low: MaterialColors.secondary[500],
    } as const;
    return colors[priority as keyof typeof colors] ?? MaterialColors.neutral[500];
  };

  const getScoreColor = (score?: number, category?: string): string => {
    if (!score) return MaterialColors.neutral[400];
    if (category === 'High') return MaterialColors.secondary[600];
    if (category === 'Medium') return MaterialColors.warning[600];
    if (category === 'Low') return MaterialColors.error[600];
    if (score >= 80) return MaterialColors.secondary[600];
    if (score >= 60) return MaterialColors.warning[600];
    return MaterialColors.error[600];
  };

  const renderScoreIndicator = () => {
    if (!showScoreIndicator || !lead.score) return null;
    const scoreColor = getScoreColor(lead.score, lead.scoreCategory);

    return (
      <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
        <BusinessIcon
          name="star"
          size={14}
          color={MaterialColors.onPrimary}
          state="active"
        />
        <Text style={styles.scoreText}>{lead.score}</Text>
      </View>
    );
  };

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const cardContent = (
    <Animated.View
      style={[
        styles.card,
        dynamicStyles.container,
        { transform: [{ scale: scaleValue }] },
        getElevationStyle(elevation),
        { flexBasis: dynamicStyles.flexBasis },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.nameContainer}>
          <Text style={[styles.name, dynamicStyles.name]} numberOfLines={1}>
            {lead.firstName} {lead.lastName}
          </Text>
          <Text style={[styles.email, dynamicStyles.meta]} numberOfLines={1}>
            {lead.email}
          </Text>
        </View>
        <View style={styles.badgesContainer}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(lead.priority) }]}>
            <Text style={styles.badgeText}>{lead.priority}</Text>
          </View>
          {renderScoreIndicator()}
        </View>
      </View>

      <View style={styles.metaSection}>
        {lead.phoneNumber && (
          <Text style={[styles.metaText, dynamicStyles.meta]} numberOfLines={1}>
            📞 {lead.phoneNumber}
          </Text>
        )}
        {(lead.budgetMin || lead.budgetMax) && (
          <Text style={[styles.metaText, dynamicStyles.meta]} numberOfLines={1}>
            💰 {formatCurrency(lead.budgetMin ?? 0)} - {formatCurrency(lead.budgetMax ?? 0)}
          </Text>
        )}
        {lead.desiredLocation && (
          <Text style={[styles.metaText, dynamicStyles.meta]} numberOfLines={1}>
            📍 {lead.desiredLocation}
          </Text>
        )}
        {lead.aiSummary && (
          <Text style={[styles.aiSummary, dynamicStyles.meta]} numberOfLines={2}>
            🤖 {lead.aiSummary}
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lead.status) }]}>
          <Text style={styles.badgeText}>{lead.status}</Text>
        </View>
        <Text style={[styles.date, dynamicStyles.date]}>
          {new Date(lead.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </Animated.View>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.92}
      style={styles.touchWrapper}
    >
      {cardContent}
    </TouchableOpacity>
  );
};

const getElevationStyle = (level: number) => {
  const elevations = {
    0: MaterialElevation.level0,
    1: MaterialElevation.level1,
    2: MaterialElevation.level2,
    3: MaterialElevation.level3,
    4: MaterialElevation.level4,
    5: MaterialElevation.level5,
  };
  return elevations[level as keyof typeof elevations] || MaterialElevation.level1;
};

const styles = StyleSheet.create({
  touchWrapper: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: MaterialColors.surface,
    gap: MaterialSpacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: MaterialSpacing.md,
  },
  nameContainer: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.onSurface,
  },
  email: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MaterialSpacing.sm,
  },
  priorityBadge: {
    borderRadius: MaterialShape.full,
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
  },
  badgeText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MaterialSpacing.xs,
    borderRadius: MaterialShape.full,
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
    backgroundColor: MaterialColors.secondary[500],
  },
  scoreText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  metaSection: {
    gap: 4,
  },
  metaText: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[700],
  },
  aiSummary: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.secondary[600],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    borderRadius: MaterialShape.full,
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
  },
  date: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[600],
  },
});

export default MaterialLeadCard;
