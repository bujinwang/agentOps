import React from 'react';
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
  MaterialTypography 
} from '../styles/MaterialDesign';

interface MaterialLeadCardProps {
  lead: {
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
    createdAt: string;
  };
  onPress: () => void;
  elevation?: number;
}

const MaterialLeadCard: React.FC<MaterialLeadCardProps> = ({
  lead,
  onPress,
  elevation = 1,
}) => {
  const scaleValue = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.98,
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
    };
    return colors[status as keyof typeof colors] || MaterialColors.neutral[500];
  };

  const getPriorityColor = (priority: string): string => {
    const colors = {
      'High': MaterialColors.error[500],
      'Medium': MaterialColors.warning[500],
      'Low': MaterialColors.secondary[500],
    };
    return colors[priority as keyof typeof colors] || MaterialColors.neutral[500];
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
    >
      <Animated.View
        style={[
          styles.container,
          { transform: [{ scale: scaleValue }] },
          getElevationStyle(elevation),
        ]}
      >
        {/* Header with Name and Priority */}
        <View style={styles.header}>
          <View style={styles.nameContainer}>
            <Text style={styles.name} numberOfLines={1}>
              {lead.firstName} {lead.lastName}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {lead.email}
            </Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(lead.priority) }]}>
            <Text style={styles.priorityText}>{lead.priority}</Text>
          </View>
        </View>

        {/* Contact Information */}
        {lead.phoneNumber && (
          <Text style={styles.phone} numberOfLines={1}>
            📞 {lead.phoneNumber}
          </Text>
        )}

        {/* Budget Information */}
        {(lead.budgetMin || lead.budgetMax) && (
          <Text style={styles.budget} numberOfLines={1}>
            💰 {formatCurrency(lead.budgetMin || 0)} - {formatCurrency(lead.budgetMax || 0)}
          </Text>
        )}

        {/* Location */}
        {lead.desiredLocation && (
          <Text style={styles.location} numberOfLines={1}>
            📍 {lead.desiredLocation}
          </Text>
        )}

        {/* AI Summary */}
        {lead.aiSummary && (
          <View style={styles.aiContainer}>
            <Text style={styles.aiIcon}>🤖</Text>
            <Text style={styles.aiSummary} numberOfLines={2}>
              {lead.aiSummary}
            </Text>
          </View>
        )}

        {/* Footer with Status and Date */}
        <View style={styles.footer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lead.status) }]}>
            <Text style={styles.statusText}>{lead.status}</Text>
          </View>
          <Text style={styles.date}>
            {new Date(lead.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </Animated.View>
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
  container: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.md,
    marginHorizontal: MaterialSpacing.sm,
    marginVertical: MaterialSpacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: MaterialSpacing.sm,
  },
  nameContainer: {
    flex: 1,
    marginRight: MaterialSpacing.sm,
  },
  name: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    marginBottom: 2,
  },
  email: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  priorityBadge: {
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
    borderRadius: 12,
  },
  priorityText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  phone: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[700],
    marginBottom: MaterialSpacing.xs,
  },
  budget: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.secondary[600],
    fontWeight: '500',
    marginBottom: MaterialSpacing.xs,
  },
  location: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
    marginBottom: MaterialSpacing.sm,
  },
  aiContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: MaterialSpacing.md,
    paddingTop: MaterialSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[200],
  },
  aiIcon: {
    fontSize: 14,
    marginRight: MaterialSpacing.xs,
  },
  aiSummary: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[700],
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: MaterialSpacing.sm,
    paddingTop: MaterialSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[200],
  },
  statusBadge: {
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
    borderRadius: 12,
  },
  statusText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  date: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[500],
  },
});

export default MaterialLeadCard;