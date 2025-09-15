import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RealTimeConfig {
  enableWebSocket: boolean;
  webSocketUrl: string;
  reconnectInterval: number; // in milliseconds
  maxReconnectAttempts: number;
  heartbeatInterval: number; // in milliseconds
  enableBackgroundSync: boolean;
  syncInterval: number; // in minutes
  enableOfflineCache: boolean;
  cacheExpiryHours: number;
}

export interface RealTimeEvent {
  type: string;
  payload: any;
  timestamp: string;
  source: 'websocket' | 'polling' | 'cache' | 'client';
}

export interface SyncStatus {
  isConnected: boolean;
  lastSync: Date | null;
  pendingUpdates: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
}

class RealTimeUpdateService {
  private static instance: RealTimeUpdateService;
  private config: RealTimeConfig;
  private webSocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private syncTimer: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private isConnected = false;
  private lastHeartbeat = Date.now();
  private pendingUpdates: RealTimeEvent[] = [];
  private cache: Map<string, { data: any; timestamp: number; expiry: number }> = new Map();

  private constructor() {
    this.config = {
      enableWebSocket: true,
      webSocketUrl: 'ws://localhost:8080/ws',
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      enableBackgroundSync: true,
      syncInterval: 5,
      enableOfflineCache: true,
      cacheExpiryHours: 24
    };
    this.initializeService();
  }

  static getInstance(): RealTimeUpdateService {
    if (!RealTimeUpdateService.instance) {
      RealTimeUpdateService.instance = new RealTimeUpdateService();
    }
    return RealTimeUpdateService.instance;
  }

  private async initializeService(): Promise<void> {
    try {
      // Load cached configuration
      const cachedConfig = await AsyncStorage.getItem('realTimeConfig');
      if (cachedConfig) {
        this.config = { ...this.config, ...JSON.parse(cachedConfig) };
      }

      // Load pending updates from cache
      const cachedUpdates = await AsyncStorage.getItem('pendingUpdates');
      if (cachedUpdates) {
        this.pendingUpdates = JSON.parse(cachedUpdates);
      }

      // Load cached data
      if (this.config.enableOfflineCache) {
        await this.loadCacheFromStorage();
      }

      // Initialize WebSocket connection if enabled
      if (this.config.enableWebSocket) {
        this.connectWebSocket();
      }

      // Start background sync if enabled
      if (this.config.enableBackgroundSync) {
        this.startBackgroundSync();
      }

    } catch (error) {
      console.error('Failed to initialize real-time service:', error);
    }
  }

  /**
   * WebSocket Connection Management
   */
  private connectWebSocket(): void {
    if (!this.config.enableWebSocket) return;

    try {
      this.webSocket = new WebSocket(this.config.webSocketUrl);

      this.webSocket.onopen = () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emitEvent('connectionStatusChanged', { connected: true });

        // Send pending updates
        this.sendPendingUpdates();
      };

      this.webSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.webSocket.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.stopHeartbeat();
        this.emitEvent('connectionStatusChanged', { connected: false });

        // Attempt reconnection
        this.attemptReconnection();
      };

      this.webSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnected = false;
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.attemptReconnection();
    }
  }

  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`);

    setTimeout(() => {
      this.connectWebSocket();
    }, this.config.reconnectInterval);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
        this.webSocket.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
        this.lastHeartbeat = Date.now();
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private async sendPendingUpdates(): Promise<void> {
    if (this.pendingUpdates.length === 0 || !this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
      return;
    }

    for (const update of this.pendingUpdates) {
      try {
        this.webSocket.send(JSON.stringify(update));
      } catch (error) {
        console.error('Failed to send pending update:', error);
        break; // Stop sending if one fails
      }
    }

    // Clear sent updates
    this.pendingUpdates = [];
    await AsyncStorage.setItem('pendingUpdates', JSON.stringify(this.pendingUpdates));
  }

  private handleWebSocketMessage(message: any): void {
    const event: RealTimeEvent = {
      type: message.type,
      payload: message.payload,
      timestamp: message.timestamp || new Date().toISOString(),
      source: 'websocket'
    };

    // Cache the event if offline caching is enabled
    if (this.config.enableOfflineCache) {
      this.cacheEvent(event);
    }

    // Emit the event to listeners
    this.emitEvent(event.type, event.payload);

    // Handle specific event types
    switch (event.type) {
      case 'conversionUpdate':
        this.handleConversionUpdate(event.payload);
        break;
      case 'leadScoreUpdate':
        this.handleLeadScoreUpdate(event.payload);
        break;
      case 'workflowUpdate':
        this.handleWorkflowUpdate(event.payload);
        break;
    }
  }

  /**
   * Event Handling
   */
  private handleConversionUpdate(data: any): void {
    // Update conversion metrics cache
    this.updateCache('conversionMetrics', data);
    this.emitEvent('conversionMetricsUpdated', data);
  }

  private handleLeadScoreUpdate(data: any): void {
    // Update lead data cache
    this.updateCache(`lead_${data.leadId}`, data);
    this.emitEvent('leadUpdated', data);
  }

  private handleWorkflowUpdate(data: any): void {
    // Update workflow data cache
    this.updateCache(`workflow_${data.workflowId}`, data);
    this.emitEvent('workflowUpdated', data);
  }

  /**
   * Background Sync Management
   */
  private startBackgroundSync(): void {
    this.syncTimer = setInterval(() => {
      this.performBackgroundSync();
    }, this.config.syncInterval * 60 * 1000);
  }

  private async performBackgroundSync(): Promise<void> {
    try {
      // Sync pending updates
      await this.syncPendingUpdates();

      // Refresh critical data
      await this.refreshCriticalData();

      // Clean up expired cache
      this.cleanExpiredCache();

      this.emitEvent('backgroundSyncCompleted', {
        timestamp: new Date().toISOString(),
        pendingUpdatesCount: this.pendingUpdates.length
      });

    } catch (error) {
      console.error('Background sync failed:', error);
      this.emitEvent('backgroundSyncFailed', { error: error.message });
    }
  }

  private async syncPendingUpdates(): Promise<void> {
    if (this.pendingUpdates.length === 0) return;

    // In a real implementation, this would send updates to the server
    // For now, we'll just clear them after a delay to simulate sync
    await new Promise(resolve => setTimeout(resolve, 1000));

    const syncedUpdates = this.pendingUpdates.splice(0);
    console.log(`Synced ${syncedUpdates.length} pending updates`);

    // Save updated pending updates to storage
    await AsyncStorage.setItem('pendingUpdates', JSON.stringify(this.pendingUpdates));
  }

  private async refreshCriticalData(): Promise<void> {
    // Refresh conversion metrics, funnel data, etc.
    // This would typically call the respective services
    console.log('Refreshing critical data...');
  }

  /**
   * Caching System
   */
  private async loadCacheFromStorage(): Promise<void> {
    try {
      const cachedData = await AsyncStorage.getItem('realTimeCache');
      if (cachedData) {
        const parsedCache = JSON.parse(cachedData);
        this.cache = new Map(Object.entries(parsedCache));
      }
    } catch (error) {
      console.error('Failed to load cache from storage:', error);
    }
  }

  private async saveCacheToStorage(): Promise<void> {
    try {
      const cacheObject = Object.fromEntries(this.cache);
      await AsyncStorage.setItem('realTimeCache', JSON.stringify(cacheObject));
    } catch (error) {
      console.error('Failed to save cache to storage:', error);
    }
  }

  private cacheEvent(event: RealTimeEvent): void {
    const key = `${event.type}_${Date.now()}`;
    const expiry = Date.now() + (this.config.cacheExpiryHours * 60 * 60 * 1000);

    this.cache.set(key, {
      data: event,
      timestamp: Date.now(),
      expiry
    });

    // Save to storage periodically
    this.saveCacheToStorage();
  }

  private updateCache(key: string, data: any): void {
    const expiry = Date.now() + (this.config.cacheExpiryHours * 60 * 60 * 1000);

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry
    });

    this.saveCacheToStorage();
  }

  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    // Remove expired cache
    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, cached] of this.cache.entries()) {
      if (cached.expiry <= now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`Cleaned ${expiredKeys.length} expired cache entries`);
      this.saveCacheToStorage();
    }
  }

  /**
   * Event System
   */
  private addEventListener(eventType: string, listener: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

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

  /**
   * Public API Methods
   */
  subscribe(eventType: string, listener: Function): void {
    this.addEventListener(eventType, listener);
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

  async sendUpdate(eventType: string, payload: any): Promise<void> {
    const event: RealTimeEvent = {
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
      source: 'client'
    };

    // Add to pending updates if offline
    if (!this.isConnected) {
      this.pendingUpdates.push(event);
      await AsyncStorage.setItem('pendingUpdates', JSON.stringify(this.pendingUpdates));
    }

    // Send via WebSocket if connected
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify(event));
    }
  }

  getSyncStatus(): SyncStatus {
    const connectionQuality = this.calculateConnectionQuality();

    return {
      isConnected: this.isConnected,
      lastSync: this.pendingUpdates.length === 0 ? new Date() : null,
      pendingUpdates: this.pendingUpdates.length,
      connectionQuality
    };
  }

  private calculateConnectionQuality(): 'excellent' | 'good' | 'poor' | 'offline' {
    if (!this.isConnected) return 'offline';

    const timeSinceHeartbeat = Date.now() - this.lastHeartbeat;

    if (timeSinceHeartbeat < 10000) return 'excellent';
    if (timeSinceHeartbeat < 30000) return 'good';
    return 'poor';
  }

  getCachedDataForKey(key: string): any {
    return this.getCachedData(key);
  }

  async updateConfig(newConfig: Partial<RealTimeConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await AsyncStorage.setItem('realTimeConfig', JSON.stringify(this.config));

    // Restart services with new config
    if (newConfig.enableWebSocket !== undefined) {
      if (newConfig.enableWebSocket) {
        this.connectWebSocket();
      } else {
        this.disconnectWebSocket();
      }
    }

    if (newConfig.enableBackgroundSync !== undefined) {
      if (newConfig.enableBackgroundSync) {
        this.startBackgroundSync();
      } else {
        this.stopBackgroundSync();
      }
    }
  }

  getConfig(): RealTimeConfig {
    return { ...this.config };
  }

  private disconnectWebSocket(): void {
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }
    this.stopHeartbeat();
  }

  private stopBackgroundSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Cleanup method
   */
  async cleanup(): Promise<void> {
    this.disconnectWebSocket();
    this.stopBackgroundSync();
    this.eventListeners.clear();
    this.cache.clear();
    this.pendingUpdates = [];
  }
}

// Export singleton instance
export const realTimeUpdateService = RealTimeUpdateService.getInstance();
export default realTimeUpdateService;