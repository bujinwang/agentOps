import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { offlineStorage } from '../services/offlineStorage';

interface SyncStatus {
  lastSyncTime: number;
  pendingActions: number;
  isOnline: boolean;
  syncInProgress: boolean;
}

interface UseOfflineSyncReturn {
  status: SyncStatus;
  syncNow: () => Promise<void>;
  clearOfflineData: () => Promise<void>;
  getStorageInfo: () => Promise<{ totalSize: number; breakdown: Record<string, number> }>;
}

export const useOfflineSync = (): UseOfflineSyncReturn => {
  const [status, setStatus] = useState<SyncStatus>({
    lastSyncTime: 0,
    pendingActions: 0,
    isOnline: true,
    syncInProgress: false,
  });

  useEffect(() => {
    // Initialize status
    const initializeStatus = async () => {
      const initialStatus = await offlineStorage.getSyncStatus();
      setStatus(initialStatus);
    };

    initializeStatus();

    // Subscribe to status changes
    const unsubscribe = offlineStorage.onStatusChange(setStatus);

    return unsubscribe;
  }, []);

  const syncNow = useCallback(async () => {
    try {
      if (!status.isOnline) {
        Alert.alert(
          'Offline Mode',
          'You are currently offline. Sync will happen automatically when you reconnect to the internet.'
        );
        return;
      }

      if (status.syncInProgress) {
        Alert.alert('Sync in Progress', 'A sync operation is already running.');
        return;
      }

      await offlineStorage.fullSync();
      
      Alert.alert(
        'Sync Complete',
        `Successfully synced ${status.pendingActions} pending actions.`
      );
    } catch (error) {
      console.error('Manual sync failed:', error);
      Alert.alert(
        'Sync Failed',
        'There was an error syncing your data. Please try again later.'
      );
    }
  }, [status.isOnline, status.syncInProgress, status.pendingActions]);

  const clearOfflineData = useCallback(async () => {
    Alert.alert(
      'Clear Offline Data',
      'This will remove all locally stored data. Any unsynced changes will be lost. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await offlineStorage.clearAllData();
              Alert.alert('Success', 'Offline data cleared successfully.');
            } catch (error) {
              console.error('Error clearing offline data:', error);
              Alert.alert('Error', 'Failed to clear offline data.');
            }
          },
        },
      ]
    );
  }, []);

  const getStorageInfo = useCallback(async () => {
    return await offlineStorage.getStorageSize();
  }, []);

  return {
    status,
    syncNow,
    clearOfflineData,
    getStorageInfo,
  };
};