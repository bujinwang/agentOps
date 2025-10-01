import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNotifications, Notification } from '../../contexts/NotificationContext';
import { getRelativeTime, formatDateTime } from '../../utils/validation';
import { useScreenLayout } from '../../hooks/useScreenLayout';

interface NotificationsScreenProps {
  navigation: any;
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation }) => {
  const { containerStyle, contentStyle, responsive, theme } = useScreenLayout();
  const {
    notifications,
    unreadCount,
    isLoading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const dynamicStyles = useMemo(() => ({
    button: { minHeight: responsive.getTouchTargetSize(44) },
    filterButton: { minHeight: responsive.getTouchTargetSize(36) },
    notificationCard: { 
      minHeight: responsive.getTouchTargetSize(80),
      padding: responsive.getSpacing(12),
    },
  }), [responsive]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshNotifications();
    setIsRefreshing(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.actionUrl && notification.relatedId) {
      switch (notification.relatedType) {
        case 'lead':
          navigation.navigate('LeadDetail', { leadId: notification.relatedId });
          break;
        case 'task':
          navigation.navigate('TaskDetail', { taskId: notification.relatedId });
          break;
        default:
          break;
      }
    }
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0) return;
    
    Alert.alert(
      'Mark All Read',
      'Mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Mark All Read', 
          onPress: markAllAsRead 
        },
      ]
    );
  };

  const getNotificationIcon = (type: Notification['type']): string => {
    switch (type) {
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'error': return '❌';
      case 'reminder': return '🔔';
      default: return '📢';
    }
  };

  const getNotificationColor = (type: Notification['type']): string => {
    switch (type) {
      case 'info': return '#2196F3';
      case 'warning': return '#FF9800';
      case 'success': return '#4CAF50';
      case 'error': return '#f44336';
      case 'reminder': return '#9C27B0';
      default: return '#666';
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, dynamicStyles.notificationCard, !item.read && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationIcon}>
          <Text style={styles.iconText}>{getNotificationIcon(item.type)}</Text>
        </View>
        
        <View style={styles.notificationContent}>
          <View style={styles.notificationMeta}>
            <Text style={[styles.notificationTitle, !item.read && styles.unreadText]}>
              {item.title}
            </Text>
            <Text style={styles.notificationTime}>
              {getRelativeTime(item.createdAt)}
            </Text>
          </View>

          <Text style={[styles.notificationMessage, !item.read && styles.unreadMessage]}>
            {item.message}
          </Text>

          <Text style={styles.notificationDate}>
            {formatDateTime(item.createdAt)}
          </Text>
        </View>

        {!item.read && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterTab, dynamicStyles.filterButton, filter === 'all' && styles.activeFilterTab]}
        onPress={() => setFilter('all')}
      >
        <Text style={[styles.filterTabText, filter === 'all' && styles.activeFilterTabText]}>
          All ({notifications.length})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterTab, dynamicStyles.filterButton, filter === 'unread' && styles.activeFilterTab]}
        onPress={() => setFilter('unread')}
      >
        <Text style={[styles.filterTabText, filter === 'unread' && styles.activeFilterTabText]}>
          Unread ({unreadCount})
        </Text>
      </TouchableOpacity>

      {unreadCount > 0 && (
        <TouchableOpacity
          style={[styles.markAllReadButton, dynamicStyles.button]}
          onPress={handleMarkAllRead}
        >
          <Text style={styles.markAllReadText}>Mark All Read</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>🔔</Text>
      <Text style={styles.emptyStateTitle}>
        {filter === 'unread' ? 'All Caught Up!' : 'No Notifications'}
      </Text>
      <Text style={styles.emptyStateText}>
        {filter === 'unread' 
          ? 'You have no unread notifications'
          : 'Notifications will appear here when you have updates'
        }
      </Text>
    </View>
  );

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  if (isLoading && notifications.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <Text style={styles.headerSubtitle}>
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {/* Filter Tabs */}
      {renderFilterTabs()}

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderNotificationItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  activeFilterTab: {
    backgroundColor: '#2196F3',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeFilterTabText: {
    color: '#fff',
  },
  markAllReadButton: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#e3f2fd',
  },
  markAllReadText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    fontWeight: '600',
    color: '#000',
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  unreadMessage: {
    color: '#333',
  },
  notificationDate: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
    marginLeft: 8,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 24,
  },
});

export default NotificationsScreen;