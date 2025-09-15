import { useState, useEffect, useCallback } from 'react';
import {
  MLSSyncStatus,
  MLSSyncOptions,
  MLSError,
  UseMLSSyncReturn
} from '../types/mls';
import { createMLSSyncManager } from '../services/mlsSyncService';
import { createMLSService } from '../services/mlsApiService';

/**
 * Custom hook for managing MLS synchronization operations
 */
export const useMLSSync = (config?: any): UseMLSSyncReturn => {
  const [syncStatus, setSyncStatus] = useState<MLSSyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncHistory, setSyncHistory] = useState<MLSSyncStatus[]>([]);

  // Initialize MLS services
  const mlsService = createMLSService(config || {
    provider: 'reso',
    endpoint: 'https://api.example.com',
    credentials: {
      username: 'demo',
      password: 'demo',
      clientId: 'demo-client',
      clientSecret: 'demo-secret'
    },
    rateLimit: 1000,
    syncInterval: 60,
    enabled: true
  });

  const syncManager = createMLSSyncManager(mlsService, config || {
    provider: 'reso',
    endpoint: 'https://api.example.com',
    credentials: {
      username: 'demo',
      password: 'demo',
      clientId: 'demo-client',
      clientSecret: 'demo-secret'
    },
    rateLimit: 1000,
    syncInterval: 60,
    enabled: true
  });

  /**
   * Start a new synchronization
   */
  const startSync = useCallback(async (options?: MLSSyncOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      const syncId = await syncManager.startSync(options);

      // Poll for status updates
      const pollStatus = async () => {
        try {
          const status = await syncManager.getSyncStatus(syncId);
          setSyncStatus(status);

          if (status.status === 'running') {
            // Continue polling if still running
            setTimeout(pollStatus, 2000);
          } else {
            // Sync completed, refresh history
            await getSyncHistory();
          }
        } catch (err) {
          console.error('Error polling sync status:', err);
        }
      };

      // Start polling
      setTimeout(pollStatus, 1000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start sync';
      setError(errorMessage);
      console.error('Sync start error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [syncManager]);

  /**
   * Stop the current synchronization
   */
  const stopSync = useCallback(async () => {
    if (!syncStatus || syncStatus.status !== 'running') {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await syncManager.stopSync(syncStatus.id);
      // Refresh status
      const updatedStatus = await syncManager.getSyncStatus(syncStatus.id);
      setSyncStatus(updatedStatus);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop sync';
      setError(errorMessage);
      console.error('Sync stop error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [syncManager, syncStatus]);

  /**
   * Get synchronization history
   */
  const getSyncHistory = useCallback(async (): Promise<MLSSyncStatus[]> => {
    try {
      const activeSyncs = await syncManager.getActiveSyncs();
      setSyncHistory(activeSyncs);
      return activeSyncs;
    } catch (err) {
      console.error('Error fetching sync history:', err);
      return [];
    }
  }, [syncManager]);

  /**
   * Get current sync status
   */
  const getCurrentStatus = useCallback(async () => {
    try {
      const activeSyncs = await syncManager.getActiveSyncs();
      if (activeSyncs.length > 0) {
        setSyncStatus(activeSyncs[0]);
      } else {
        setSyncStatus(null);
      }
    } catch (err) {
      console.error('Error fetching current status:', err);
      setSyncStatus(null);
    }
  }, [syncManager]);

  /**
   * Schedule recurring sync
   */
  const scheduleSync = useCallback(async (intervalMinutes: number, options?: MLSSyncOptions) => {
    try {
      const syncId = await syncManager.scheduleSync(`*/${intervalMinutes} * * * *`, options);
      return syncId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to schedule sync';
      setError(errorMessage);
      console.error('Schedule sync error:', err);
      throw err;
    }
  }, [syncManager]);

  /**
   * Clear any current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Refresh current status and history
   */
  const refresh = useCallback(async () => {
    await Promise.all([getCurrentStatus(), getSyncHistory()]);
  }, [getCurrentStatus, getSyncHistory]);

  // Load initial data
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    syncStatus,
    isLoading,
    error,
    startSync,
    stopSync,
    getSyncHistory
  };
};

/**
 * Hook for MLS sync progress tracking
 */
export const useMLSSyncProgress = (syncId?: string) => {
  const [progress, setProgress] = useState<number>(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!syncId) return;

    // Simulate progress updates (in real implementation, this would connect to WebSocket or polling)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setIsComplete(true);
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [syncId]);

  return { progress, isComplete };
};

/**
 * Hook for MLS sync statistics
 */
export const useMLSSyncStats = () => {
  const [stats, setStats] = useState({
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageDuration: 0,
    lastSyncTime: null as Date | null
  });

  const updateStats = useCallback((newStats: Partial<typeof stats>) => {
    setStats(prev => ({ ...prev, ...newStats }));
  }, []);

  return { stats, updateStats };
};

/**
 * Hook for MLS sync notifications
 */
export const useMLSSyncNotifications = () => {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: Date;
  }>>([]);

  const addNotification = useCallback((notification: Omit<typeof notifications[0], 'id' | 'timestamp'>) => {
    const newNotification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date()
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // Keep last 10
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications
  };
};

export default useMLSSync;