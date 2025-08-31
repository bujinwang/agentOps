import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNotifications } from '../contexts/NotificationContext';

interface NotificationBadgeProps {
  showZero?: boolean;
  style?: any;
  textStyle?: any;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  showZero = false, 
  style = {},
  textStyle = {}
}) => {
  const { unreadCount } = useNotifications();

  if (unreadCount === 0 && !showZero) {
    return null;
  }

  return (
    <View style={[styles.badge, style]}>
      <Text style={[styles.badgeText, textStyle]}>
        {unreadCount > 99 ? '99+' : unreadCount.toString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#f44336',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default NotificationBadge;