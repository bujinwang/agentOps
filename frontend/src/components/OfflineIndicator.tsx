import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { getRelativeTime } from '../utils/validation';
import { StatusIcon } from './MaterialIcon';

interface OfflineIndicatorProps {
  onPress?: () => void;
  showDetails?: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  onPress, 
  showDetails = false 
}) => {
  const { status, syncNow } = useOfflineSync();
  const [fadeAnim] = React.useState(new Animated.Value(1));

  React.useEffect(() => {
    // Animate when sync status changes
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [status.syncInProgress, status.pendingActions, fadeAnim]);

  const getStatusColor = (): string => {
    if (!status.isOnline) return '#f44336';
    if (status.syncInProgress) return '#FF9800';
    if (status.pendingActions > 0) return '#FF9800';
    return '#4CAF50';
  };

  const getStatusText = (): string => {
    if (!status.isOnline) return 'Offline';
    if (status.syncInProgress) return 'Syncing...';
    if (status.pendingActions > 0) return `${status.pendingActions} pending`;
    return 'Synced';
  };

  const getStatusIcon = (): string => {
    switch (status) {
      case 'online':
        return 'wifi';
      case 'offline':
        return 'wifi_off';
      case 'connecting':
        return 'sync';
      default:
        return 'signal_wifi_statusbar_null';
    }
  };

  const getLastSyncText = (): string => {
    if (status.lastSyncTime === 0) return 'Never synced';
    return `Last sync: ${getRelativeTime(new Date(status.lastSyncTime))}`;
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (status.isOnline && !status.syncInProgress && status.pendingActions > 0) {
      syncNow();
    }
  };

  if (!showDetails && status.isOnline && status.pendingActions === 0 && !status.syncInProgress) {
    // Don't show indicator when everything is synced and online
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <TouchableOpacity
        style={[styles.indicator, { backgroundColor: getStatusColor() }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <StatusIcon
          name={getStatusIcon()}
          size={16}
          color={MaterialColors.onSurface}
          state={status === 'online' ? 'success' : status === 'offline' ? 'error' : 'warning'}
        />
        <View style={styles.textContainer}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
          {showDetails && (
            <Text style={styles.detailText}>{getLastSyncText()}</Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  detailText: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginTop: 2,
  },
});

export default OfflineIndicator;