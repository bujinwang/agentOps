import AsyncStorage from '@react-native-async-storage/async-storage';
import { realTimeUpdateService } from './realTimeUpdateService';

export interface SyncConfig {
  enableAutoRefresh: boolean;
  refreshInterval: number; // in milliseconds
  enableBackgroundFetch: boolean;
  backgroundFetchInterval: number; // in minutes
  enableIncrementalSync: boolean;
  maxRetries: number;
  retryDelay: number; // in milliseconds
  enableSmartSync: boolean; // Only sync changed data
  syncPriority: 'high' | 'medium' | 'low';
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  nextSyncTime: Date | null;
  syncProgress: number; // 0-100
  pendingItems: number;
  failedItems: number;
  lastError: string | null;
}

export interface SyncItem {
  id: string;
  type: 'conversion' | 'lead' | 'workflow' | 'metric';
  data: any;
  lastModified: string;
  version: number;
  priority: 'high' | 'medium' | 'low';
}

class DataSyncService {
  private static instance: DataSyncService;
  private config: SyncConfig;
  private syncStatus: SyncStatus;
  private refreshTimer: NodeJS.Timeout | null = null;
  private backgroundFetchTimer: NodeJS.Timeout | null = null;
  private syncQueue: SyncItem[] = [];
  private isDestroyed = false;
  private eventListeners: Map<string, Function[]> = new Map();

  private constructor() {
    this.config = {
      enableAutoRefresh: true,
      refreshInterval: 30000, // 30 seconds
      enableBackgroundFetch: true,
      backgroundFetchInterval: 5, // 5 minutes
      enableIncrementalSync: true,
      maxRetries: 3,
      retryDelay: 1000,
      enableSmartSync: true,
      syncPriority: 'medium'
    };

    this.syncStatus = {
      isSyncing: false,
      lastSyncTime: null,
      nextSyncTime: null,
      syncProgress: 0,
      pendingItems: 0,
      failedItems: 0,
      lastError: null
    };

    this.initializeService();
  }

  static getInstance(): DataSyncService {
    if (!DataSyncService.instance) {
      DataSyncService.instance = new DataSyncService();
    }
    return DataSyncService.instance;
  }

  private async initializeService(): Promise<void> {
    try {
      // Load cached configuration
      const cachedConfig = await AsyncStorage.getItem('syncConfig');
      if (cachedConfig) {
        this.config = { ...this.config, ...JSON.parse(cachedConfig) };
      }

      // Load sync queue from cache
      const cachedQueue = await AsyncStorage.getItem('syncQueue');
      if (cachedQueue) {
        this.syncQueue = JSON.parse(cachedQueue);
        this.syncStatus.pendingItems = this.syncQueue.length;
      }

      // Load last sync time
      const lastSyncTime = await AsyncStorage.getItem('lastSyncTime');
      if (lastSyncTime) {
        this.syncStatus.lastSyncTime = new Date(lastSyncTime);
      }

      // Subscribe to real-time updates
      this.subscribeToRealTimeUpdates();

      // Start auto-refresh if enabled
      if (this.config.enableAutoRefresh) {
        this.startAutoRefresh();
      }

      // Start background fetch if enabled
      if (this.config.enableBackgroundFetch) {
        this.startBackgroundFetch();
      }

    } catch (error) {
      console.error('Failed to initialize data sync service:', error);
    }
  }

  /**
   * Real-time Update Integration
   */
  private subscribeToRealTimeUpdates(): void {
    realTimeUpdateService.subscribe('conversionMetricsUpdated', (data) => {
      this.handleRealTimeUpdate('conversion', data);
    });

    realTimeUpdateService.subscribe('leadUpdated', (data) => {
      this.handleRealTimeUpdate('lead', data);
    });

    realTimeUpdateService.subscribe('workflowUpdated', (data) => {
      this.handleRealTimeUpdate('workflow', data);
    });
  }

  private handleRealTimeUpdate(type: string, data: any): void {
    // Update local cache immediately
    this.updateLocalCache(type, data);

    // Emit sync event
    this.emitEvent('realTimeUpdate', { type, data });
  }

  /**
   * Auto-refresh Management
   */
  private startAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(() => {
      this.performAutoRefresh();
    }, this.config.refreshInterval);

    this.updateNextSyncTime();
  }

  private async performAutoRefresh(): Promise<void> {
    if (this.syncStatus.isSyncing) return;

    try {
      await this.performIncrementalSync();
    } catch (error) {
      console.error('Auto-refresh failed:', error);
    }
  }

  private updateNextSyncTime(): void {
    if (this.refreshTimer) {
      this.syncStatus.nextSyncTime = new Date(Date.now() + this.config.refreshInterval);
    }
  }

  /**
   * Background Fetch Management
   */
  private startBackgroundFetch(): void {
    if (this.backgroundFetchTimer) {
      clearInterval(this.backgroundFetchTimer);
    }

    this.backgroundFetchTimer = setInterval(() => {
      this.performBackgroundFetch();
    }, this.config.backgroundFetchInterval * 60 * 1000);
  }

  private async performBackgroundFetch(): Promise<void> {
    try {
      // Perform full sync in background
      await this.performFullSync();

      // Clean up old data
      await this.cleanupOldData();

    } catch (error) {
      console.error('Background fetch failed:', error);
    }
  }

  /**
   * Sync Operations
   */
  async performIncrementalSync(): Promise<void> {
    if (this.syncStatus.isSyncing) return;

    this.syncStatus.isSyncing = true;
    this.syncStatus.syncProgress = 0;
    this.emitEvent('syncStarted', { type: 'incremental' });

    try {
      // Get changes since last sync
      const changes = await this.getIncrementalChanges();

      if (changes.length > 0) {
        // Process changes in batches
        const batchSize = 10;
        for (let i = 0; i < changes.length; i += batchSize) {
          const batch = changes.slice(i, i + batchSize);
          await this.processBatch(batch);

          this.syncStatus.syncProgress = Math.round(((i + batch.length) / changes.length) * 100);
          this.emitEvent('syncProgress', { progress: this.syncStatus.syncProgress });
        }
      }

      // Update sync status
      this.syncStatus.lastSyncTime = new Date();
      this.syncStatus.syncProgress = 100;
      this.syncStatus.lastError = null;

      // Save sync time
      await AsyncStorage.setItem('lastSyncTime', this.syncStatus.lastSyncTime.toISOString());

      this.emitEvent('syncCompleted', {
        type: 'incremental',
        itemsProcessed: changes.length
      });

    } catch (error) {
      this.syncStatus.lastError = error instanceof Error ? error.message : 'Sync failed';
      this.emitEvent('syncFailed', { error: this.syncStatus.lastError });
      throw error;
    } finally {
      this.syncStatus.isSyncing = false;
      this.updateNextSyncTime();
    }
  }

  async performFullSync(): Promise<void> {
    if (this.syncStatus.isSyncing) return;

    this.syncStatus.isSyncing = true;
    this.emitEvent('syncStarted', { type: 'full' });

    try {
      // Sync all data types
      const syncPromises = [
        this.syncConversions(),
        this.syncLeads(),
        this.syncWorkflows(),
        this.syncMetrics()
      ];

      await Promise.all(syncPromises);

      this.syncStatus.lastSyncTime = new Date();
      this.syncStatus.lastError = null;

      await AsyncStorage.setItem('lastSyncTime', this.syncStatus.lastSyncTime.toISOString());

      this.emitEvent('syncCompleted', { type: 'full' });

    } catch (error) {
      this.syncStatus.lastError = error instanceof Error ? error.message : 'Full sync failed';
      this.emitEvent('syncFailed', { error: this.syncStatus.lastError });
      throw error;
    } finally {
      this.syncStatus.isSyncing = false;
    }
  }

  private async getIncrementalChanges(): Promise<SyncItem[]> {
    // In a real implementation, this would query the server for changes
    // For now, return pending items from queue
    return this.syncQueue;
  }

  private async processBatch(batch: SyncItem[]): Promise<void> {
    const promises = batch.map(item => this.processSyncItem(item));
    await Promise.all(promises);
  }

  private async processSyncItem(item: SyncItem): Promise<void> {
    try {
      // Update local cache
      await this.updateLocalCache(item.type, item.data);

      // Remove from queue
      this.syncQueue = this.syncQueue.filter(queueItem => queueItem.id !== item.id);
      this.syncStatus.pendingItems = this.syncQueue.length;

      // Save updated queue
      await AsyncStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));

    } catch (error) {
      console.error(`Failed to process sync item ${item.id}:`, error);
      this.syncStatus.failedItems++;
      throw error;
    }
  }

  private async syncConversions(): Promise<void> {
    // Sync conversion data
    console.log('Syncing conversions...');
  }

  private async syncLeads(): Promise<void> {
    // Sync lead data
    console.log('Syncing leads...');
  }

  private async syncWorkflows(): Promise<void> {
    // Sync workflow data
    console.log('Syncing workflows...');
  }

  private async syncMetrics(): Promise<void> {
    // Sync metrics data
    console.log('Syncing metrics...');
  }

  /**
   * Local Cache Management
   */
  private async updateLocalCache(type: string, data: any): Promise<void> {
    const cacheKey = `sync_${type}_${Date.now()}`;
    const cacheData = {
      data,
      timestamp: new Date().toISOString(),
      type
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
  }

  async getCachedData(type: string, maxAge: number = 3600000): Promise<any[]> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(`sync_${type}_`));

    const cachedData: any[] = [];

    for (const key of cacheKeys) {
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const parsed = JSON.parse(cached);
          const age = Date.now() - new Date(parsed.timestamp).getTime();

          if (age <= maxAge) {
            cachedData.push(parsed.data);
          } else {
            // Remove expired cache
            await AsyncStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.error(`Failed to parse cached data for ${key}:`, error);
      }
    }

    return cachedData;
  }

  private async cleanupOldData(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith('sync_'));

    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();

    for (const key of cacheKeys) {
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const parsed = JSON.parse(cached);
          const age = now - new Date(parsed.timestamp).getTime();

          if (age > maxAge) {
            await AsyncStorage.removeItem(key);
          }
        }
      } catch (error) {
        // Remove corrupted cache entries
        await AsyncStorage.removeItem(key);
      }
    }
  }

  /**
   * Queue Management
   */
  async addToSyncQueue(item: Omit<SyncItem, 'id'>): Promise<void> {
    const syncItem: SyncItem = {
      ...item,
      id: `${item.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.syncQueue.push(syncItem);
    this.syncStatus.pendingItems = this.syncQueue.length;

    await AsyncStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));

    this.emitEvent('itemQueued', syncItem);
  }

  async removeFromSyncQueue(itemId: string): Promise<void> {
    this.syncQueue = this.syncQueue.filter(item => item.id !== itemId);
    this.syncStatus.pendingItems = this.syncQueue.length;

    await AsyncStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
  }

  /**
   * Event System
   */
  private emitEvent(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }

  subscribe(eventType: string, listener: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  unsubscribe(eventType: string, listener: Function): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Configuration Management
   */
  async updateConfig(newConfig: Partial<SyncConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await AsyncStorage.setItem('syncConfig', JSON.stringify(this.config));

    // Restart timers with new config
    if (newConfig.enableAutoRefresh !== undefined) {
      if (newConfig.enableAutoRefresh) {
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
      }
    }

    if (newConfig.enableBackgroundFetch !== undefined) {
      if (newConfig.enableBackgroundFetch) {
        this.startBackgroundFetch();
      } else {
        this.stopBackgroundFetch();
      }
    }
  }

  getConfig(): SyncConfig {
    return { ...this.config };
  }

  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private stopBackgroundFetch(): void {
    if (this.backgroundFetchTimer) {
      clearInterval(this.backgroundFetchTimer);
      this.backgroundFetchTimer = null;
    }
  }

  /**
   * Cleanup
   */
  async destroy(): Promise<void> {
    this.isDestroyed = true;
    this.stopAutoRefresh();
    this.stopBackgroundFetch();
    this.eventListeners.clear();
    this.syncQueue = [];
  }
}

// Export singleton instance
export const dataSyncService = DataSyncService.getInstance();
export default dataSyncService;