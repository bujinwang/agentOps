import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { uploadQueue, UploadQueue } from '../utils/fileUpload';

export interface OfflineMediaItem {
  id: string;
  fileUri: string;
  uploadUrl: string;
  metadata: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    createdAt: Date;
  };
  retryCount: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

export interface UseOfflineMediaOptions {
  autoSync?: boolean;
  maxRetries?: number;
  onSyncStart?: () => void;
  onSyncProgress?: (completed: number, total: number) => void;
  onSyncComplete?: (results: OfflineMediaItem[]) => void;
  onSyncError?: (error: string) => void;
  onItemStatusChange?: (item: OfflineMediaItem) => void;
}

export interface UseOfflineMediaReturn {
  // State
  isOnline: boolean;
  isSyncing: boolean;
  queueItems: OfflineMediaItem[];
  syncProgress: { completed: number; total: number } | null;

  // Actions
  addToQueue: (fileUri: string, uploadUrl: string, metadata?: Partial<OfflineMediaItem['metadata']>) => string;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  retryFailed: () => void;
  forceSync: () => Promise<void>;

  // Queue management
  getQueueStatus: () => {
    total: number;
    pending: number;
    uploading: number;
    completed: number;
    failed: number;
  };
}

/**
 * Custom hook for managing offline media uploads with automatic sync
 */
export function useOfflineMedia(options: UseOfflineMediaOptions = {}): UseOfflineMediaReturn {
  const {
    autoSync = true,
    maxRetries = 3,
    onSyncStart,
    onSyncProgress,
    onSyncComplete,
    onSyncError,
    onItemStatusChange
  } = options;

  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueItems, setQueueItems] = useState<OfflineMediaItem[]>([]);
  const [syncProgress, setSyncProgress] = useState<{ completed: number; total: number } | null>(null);

  /**
   * Load queue items from storage
   */
  const loadQueueItems = useCallback(() => {
    try {
      const stored = localStorage.getItem('offline_media_queue');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const items = parsed.map((item: any) => ({
          ...item,
          metadata: {
            ...item.metadata,
            createdAt: new Date(item.metadata.createdAt)
          }
        }));
        setQueueItems(items);
      }
    } catch (error) {
      console.error('Error loading offline media queue:', error);
    }
  }, []);

  /**
   * Save queue items to storage
   */
  const saveQueueItems = useCallback((items: OfflineMediaItem[]) => {
    try {
      localStorage.setItem('offline_media_queue', JSON.stringify(items));
    } catch (error) {
      console.error('Error saving offline media queue:', error);
    }
  }, []);

  /**
   * Update queue item status
   */
  const updateItemStatus = useCallback((
    id: string,
    status: OfflineMediaItem['status'],
    error?: string
  ) => {
    setQueueItems(prevItems => {
      const updatedItems = prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, status };
          if (error) {
            updatedItem.error = error;
          }
          onItemStatusChange?.(updatedItem);
          return updatedItem;
        }
        return item;
      });
      saveQueueItems(updatedItems);
      return updatedItems;
    });
  }, [saveQueueItems, onItemStatusChange]);

  /**
   * Add item to offline queue
   */
  const addToQueue = useCallback((
    fileUri: string,
    uploadUrl: string,
    metadata: Partial<OfflineMediaItem['metadata']> = {}
  ): string => {
    const id = `offline_media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newItem: OfflineMediaItem = {
      id,
      fileUri,
      uploadUrl,
      metadata: {
        fileName: metadata.fileName || getFileNameFromUri(fileUri),
        fileSize: metadata.fileSize || 0,
        mimeType: metadata.mimeType || getMimeTypeFromUri(fileUri),
        createdAt: metadata.createdAt || new Date()
      },
      retryCount: 0,
      status: 'pending'
    };

    setQueueItems(prevItems => {
      const updatedItems = [...prevItems, newItem];
      saveQueueItems(updatedItems);
      return updatedItems;
    });

    // Start sync if online and auto-sync is enabled
    if (isOnline && autoSync) {
      syncQueue();
    }

    return id;
  }, [isOnline, autoSync, saveQueueItems]);

  /**
   * Remove item from queue
   */
  const removeFromQueue = useCallback((id: string) => {
    setQueueItems(prevItems => {
      const updatedItems = prevItems.filter(item => item.id !== id);
      saveQueueItems(updatedItems);
      return updatedItems;
    });
  }, [saveQueueItems]);

  /**
   * Clear entire queue
   */
  const clearQueue = useCallback(() => {
    setQueueItems([]);
    saveQueueItems([]);
  }, [saveQueueItems]);

  /**
   * Retry failed uploads
   */
  const retryFailed = useCallback(() => {
    setQueueItems(prevItems => {
      const updatedItems = prevItems.map(item => {
        if (item.status === 'failed' && item.retryCount < maxRetries) {
          return { ...item, status: 'pending' as const, error: undefined };
        }
        return item;
      });
      saveQueueItems(updatedItems);
      return updatedItems;
    });

    if (isOnline) {
      syncQueue();
    }
  }, [isOnline, maxRetries, saveQueueItems]);

  /**
   * Force sync queue
   */
  const forceSync = useCallback(async () => {
    if (!isOnline) {
      onSyncError?.('Cannot sync while offline');
      return;
    }

    await syncQueue();
  }, [isOnline]);

  /**
   * Sync queue with server
   */
  const syncQueue = useCallback(async () => {
    if (isSyncing || !isOnline) {
      return;
    }

    const pendingItems = queueItems.filter(item => item.status === 'pending');
    if (pendingItems.length === 0) {
      return;
    }

    setIsSyncing(true);
    setSyncProgress({ completed: 0, total: pendingItems.length });
    onSyncStart?.();

    let completed = 0;

    for (const item of pendingItems) {
      try {
        updateItemStatus(item.id, 'uploading');

        // Use the upload queue for actual upload
        const uploadId = uploadQueue.addToQueue(item.fileUri, item.uploadUrl, {
          onProgress: (progress) => {
            // Handle progress if needed
          }
        });

        // Wait for upload to complete (simplified - in real implementation,
        // you'd need to listen for upload completion events)
        await new Promise((resolve, reject) => {
          const checkStatus = () => {
            const status = uploadQueue.getQueueStatus();
            const uploadItem = status.items.find(i => i.id === uploadId);

            if (!uploadItem) {
              // Upload completed
              resolve(undefined);
            } else if (uploadItem.retryCount >= maxRetries) {
              // Upload failed
              reject(new Error('Upload failed after retries'));
            } else {
              // Still uploading, check again
              setTimeout(checkStatus, 1000);
            }
          };

          checkStatus();
        });

        updateItemStatus(item.id, 'completed');
        completed++;
        setSyncProgress({ completed, total: pendingItems.length });
        onSyncProgress?.(completed, pendingItems.length);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Sync failed';
        updateItemStatus(item.id, 'failed', errorMessage);
        completed++;
        setSyncProgress({ completed, total: pendingItems.length });
        onSyncProgress?.(completed, pendingItems.length);
      }
    }

    setIsSyncing(false);
    setSyncProgress(null);

    const finalItems = queueItems.filter(item => item.status !== 'completed');
    onSyncComplete?.(finalItems);
  }, [
    isSyncing,
    isOnline,
    queueItems,
    maxRetries,
    onSyncStart,
    onSyncProgress,
    onSyncComplete,
    updateItemStatus
  ]);

  /**
   * Get queue status summary
   */
  const getQueueStatus = useCallback(() => {
    const total = queueItems.length;
    const pending = queueItems.filter(item => item.status === 'pending').length;
    const uploading = queueItems.filter(item => item.status === 'uploading').length;
    const completed = queueItems.filter(item => item.status === 'completed').length;
    const failed = queueItems.filter(item => item.status === 'failed').length;

    return { total, pending, uploading, completed, failed };
  }, [queueItems]);

  /**
   * Monitor network connectivity
   */
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOnline = isOnline;
      const nowOnline = state.isConnected ?? true;

      setIsOnline(nowOnline);

      // Start sync when coming back online
      if (!wasOnline && nowOnline && autoSync) {
        syncQueue();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOnline, autoSync, syncQueue]);

  /**
   * Load queue on mount
   */
  useEffect(() => {
    loadQueueItems();
  }, [loadQueueItems]);

  /**
   * Auto-sync when online and items are pending
   */
  useEffect(() => {
    if (isOnline && autoSync && queueItems.some(item => item.status === 'pending')) {
      syncQueue();
    }
  }, [isOnline, autoSync, queueItems, syncQueue]);

  return {
    isOnline,
    isSyncing,
    queueItems,
    syncProgress,
    addToQueue,
    removeFromQueue,
    clearQueue,
    retryFailed,
    forceSync,
    getQueueStatus
  };
}

/**
 * Get file name from URI
 */
function getFileNameFromUri(uri: string): string {
  return uri.split('/').pop() || `file_${Date.now()}`;
}

/**
 * Get MIME type from URI
 */
function getMimeTypeFromUri(uri: string): string {
  const extension = uri.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo'
  };

  return mimeTypes[extension || ''] || 'application/octet-stream';
}