// Property Status Badge Component
// Displays property status with appropriate colors, icons, and styling

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Badge, useTheme } from 'react-native-paper';
import { PropertyStatus } from '../types/property';

interface PropertyStatusBadgeProps {
  status: PropertyStatus;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  showLabel?: boolean;
  style?: any;
}

const PropertyStatusBadge: React.FC<PropertyStatusBadgeProps> = ({
  status,
  size = 'medium',
  showIcon = true,
  showLabel = true,
  style,
}) => {
  const theme = useTheme();

  // Status configuration with colors, icons, and labels
  const getStatusConfig = (status: PropertyStatus) => {
    switch (status) {
      case 'active':
        return {
          label: 'Active',
          color: '#4CAF50', // Green
          backgroundColor: '#E8F5E8',
          icon: '✓',
          description: 'Property is actively listed and available'
        };
      case 'pending':
        return {
          label: 'Pending',
          color: '#FF9800', // Orange
          backgroundColor: '#FFF3E0',
          icon: '⏳',
          description: 'Property is under contract or pending approval'
        };
      case 'sold':
        return {
          label: 'Sold',
          color: '#F44336', // Red
          backgroundColor: '#FFEBEE',
          icon: '🏠',
          description: 'Property has been sold'
        };
      case 'withdrawn':
        return {
          label: 'Withdrawn',
          color: '#9E9E9E', // Grey
          backgroundColor: '#F5F5F5',
          icon: '🚫',
          description: 'Property listing has been withdrawn'
        };
      case 'expired':
        return {
          label: 'Expired',
          color: '#607D8B', // Blue Grey
          backgroundColor: '#ECEFF1',
          icon: '⏰',
          description: 'Property listing has expired'
        };
      case 'off_market':
        return {
          label: 'Off Market',
          color: '#795548', // Brown
          backgroundColor: '#EFEBE9',
          icon: '🔒',
          description: 'Property is temporarily off market'
        };
      default:
        return {
          label: String(status).charAt(0).toUpperCase() + String(status).slice(1),
          color: '#9E9E9E',
          backgroundColor: '#F5F5F5',
          icon: '?',
          description: 'Unknown status'
        };
    }
  };

  const config = getStatusConfig(status);

  // Size configurations
  const getSizeConfig = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small':
        return {
          fontSize: 10,
          iconSize: 8,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 8,
        };
      case 'large':
        return {
          fontSize: 14,
          iconSize: 12,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
        };
      default: // medium
        return {
          fontSize: 12,
          iconSize: 10,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 12,
        };
    }
  };

  const sizeConfig = getSizeConfig(size);

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: config.backgroundColor,
      borderRadius: sizeConfig.borderRadius,
      paddingHorizontal: sizeConfig.paddingHorizontal,
      paddingVertical: sizeConfig.paddingVertical,
      borderWidth: 1,
      borderColor: config.color,
      ...style,
    },
    icon: {
      fontSize: sizeConfig.iconSize,
      color: config.color,
      marginRight: showLabel ? 4 : 0,
      fontWeight: 'bold',
    },
    label: {
      fontSize: sizeConfig.fontSize,
      color: config.color,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });

  return (
    <View style={styles.container}>
      {showIcon && (
        <Text style={styles.icon}>
          {config.icon}
        </Text>
      )}
      {showLabel && (
        <Text style={styles.label}>
          {config.label}
        </Text>
      )}
    </View>
  );
};

// Status Badge with Tooltip (for web platforms)
interface PropertyStatusBadgeWithTooltipProps extends PropertyStatusBadgeProps {
  showTooltip?: boolean;
}

export const PropertyStatusBadgeWithTooltip: React.FC<PropertyStatusBadgeWithTooltipProps> = ({
  showTooltip = true,
  ...props
}) => {
  const config = getStatusConfig(props.status);

  if (showTooltip) {
    return (
      <View>
        <PropertyStatusBadge {...props} />
        {/* Tooltip would be implemented with a tooltip library */}
      </View>
    );
  }

  return <PropertyStatusBadge {...props} />;
};

// Helper function to get status configuration (for use in other components)
export const getStatusConfig = (status: PropertyStatus) => {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        color: '#4CAF50',
        backgroundColor: '#E8F5E8',
        icon: '✓',
        description: 'Property is actively listed and available'
      };
    case 'pending':
      return {
        label: 'Pending',
        color: '#FF9800',
        backgroundColor: '#FFF3E0',
        icon: '⏳',
        description: 'Property is under contract or pending approval'
      };
    case 'sold':
      return {
        label: 'Sold',
        color: '#F44336',
        backgroundColor: '#FFEBEE',
        icon: '🏠',
        description: 'Property has been sold'
      };
    case 'withdrawn':
      return {
        label: 'Withdrawn',
        color: '#9E9E9E',
        backgroundColor: '#F5F5F5',
        icon: '🚫',
        description: 'Property listing has been withdrawn'
      };
    case 'expired':
      return {
        label: 'Expired',
        color: '#607D8B',
        backgroundColor: '#ECEFF1',
        icon: '⏰',
        description: 'Property listing has expired'
      };
    case 'off_market':
      return {
        label: 'Off Market',
        color: '#795548',
        backgroundColor: '#EFEBE9',
        icon: '🔒',
        description: 'Property is temporarily off market'
      };
    default:
      return {
        label: String(status).charAt(0).toUpperCase() + String(status).slice(1),
        color: '#9E9E9E',
        backgroundColor: '#F5F5F5',
        icon: '?',
        description: 'Unknown status'
      };
  }
};

// Status priority for sorting (higher number = higher priority in lists)
export const getStatusPriority = (status: PropertyStatus): number => {
  switch (status) {
    case 'active': return 5;
    case 'pending': return 4;
    case 'off_market': return 3;
    case 'withdrawn': return 2;
    case 'expired': return 1;
    case 'sold': return 0;
    default: return -1;
  }
};

// Status transition availability
export const canTransitionTo = (fromStatus: PropertyStatus, toStatus: PropertyStatus): boolean => {
  const validTransitions: Record<PropertyStatus, PropertyStatus[]> = {
    active: ['pending', 'sold', 'withdrawn', 'off_market'],
    pending: ['active', 'sold', 'withdrawn'],
    sold: ['active'], // Rare case for relisting
    withdrawn: ['active'],
    expired: ['active'],
    off_market: ['active', 'withdrawn'],
  };

  return validTransitions[fromStatus]?.includes(toStatus) ?? false;
};

export default PropertyStatusBadge;