import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface RevenueKPICardProps {
  title: string;
  value: string;
  change: number;
  icon: string;
  color: string;
  size?: 'small' | 'medium' | 'large';
}

const RevenueKPICard: React.FC<RevenueKPICardProps> = ({
  title,
  value,
  change,
  icon,
  color,
  size = 'medium'
}) => {
  const isPositive = change >= 0;
  const changeColor = isPositive ? '#28a745' : '#dc3545';
  const changeIcon = isPositive ? 'trending-up' : 'trending-down';

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.smallContainer,
          title: styles.smallTitle,
          value: styles.smallValue,
          change: styles.smallChange
        };
      case 'large':
        return {
          container: styles.largeContainer,
          title: styles.largeTitle,
          value: styles.largeValue,
          change: styles.largeChange
        };
      default:
        return {
          container: styles.mediumContainer,
          title: styles.mediumTitle,
          value: styles.mediumValue,
          change: styles.mediumChange
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View style={[styles.container, sizeStyles.container, { backgroundColor: color + '15' }]}>
      <View style={styles.card}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: color + '30' }]}>
          <MaterialCommunityIcons
            name={icon as any}
            size={size === 'large' ? 32 : size === 'small' ? 20 : 24}
            color={color}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.title, sizeStyles.title]}>{title}</Text>
          <Text style={[styles.value, sizeStyles.value]}>{value}</Text>

          {/* Change Indicator */}
          <View style={styles.changeContainer}>
            <MaterialCommunityIcons
              name={changeIcon as any}
              size={14}
              color={changeColor}
            />
            <Text style={[styles.change, sizeStyles.change, { color: changeColor }]}>
              {isPositive ? '+' : ''}{change.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    margin: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  change: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Size variants
  smallContainer: {
    minWidth: 140,
  },
  smallTitle: {
    fontSize: 10,
  },
  smallValue: {
    fontSize: 16,
  },
  smallChange: {
    fontSize: 10,
  },

  mediumContainer: {
    minWidth: 160,
  },
  mediumTitle: {
    fontSize: 12,
  },
  mediumValue: {
    fontSize: 20,
  },
  mediumChange: {
    fontSize: 12,
  },

  largeContainer: {
    minWidth: 180,
  },
  largeTitle: {
    fontSize: 14,
  },
  largeValue: {
    fontSize: 24,
  },
  largeChange: {
    fontSize: 14,
  },
});

export default RevenueKPICard;