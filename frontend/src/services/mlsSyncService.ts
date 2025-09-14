import {
  IMLSSyncManager,
  MLSSyncStatus,
  MLSSyncOptions,
  MLSPropertyData,
  MLSError,
  MLSConfig,
  IMLSService
} from '../types/mls';

/**
 * MLS Synchronization Manager
 * Handles background sync operations, scheduling, and status tracking
 */
export class MLSSyncManager implements IMLSSyncManager {
  private activeSyncs: Map<string, MLSSyncStatus> = new Map();
  private syncQueue: Array<{ id: string; options: MLSSyncOptions }> = [];
  private isProcessing: boolean = false;

  constructor(
    private mlsService: IMLSService,
    private config: MLSConfig
  ) {}

  /**
   * Start a new synchronization operation
   */
  async startSync(options: MLSSyncOptions = {
    fullSync: false,
    skipDuplicates: false,
    validateData: true
  }): Promise<string> {
    const syncId = this.generateSyncId();

    const syncStatus: MLSSyncStatus = {
      id: syncId,
      status: 'running',
      startTime: new Date(),
      recordsProcessed: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      recordsFailed: 0,
      progress: 0,
      errors: []
    };

    this.activeSyncs.set(syncId, syncStatus);

    // Start sync in background
    this.performSync(syncId, options).catch(error => {
      console.error(`Sync ${syncId} failed:`, error);
      this.updateSyncStatus(syncId, {
        status: 'failed',
        endTime: new Date(),
        errors: [{
          id: this.generateErrorId(),
          timestamp: new Date(),
          type: 'api',
          message: error.message,
          retryable: true
        }]
      });
    });

    return syncId;
  }

  /**
   * Stop a running synchronization
   */
  async stopSync(syncId: string): Promise<void> {
    const syncStatus = this.activeSyncs.get(syncId);
    if (!syncStatus || syncStatus.status !== 'running') {
      throw new Error(`Sync ${syncId} is not running`);
    }

    this.updateSyncStatus(syncId, {
      status: 'paused',
      endTime: new Date()
    });
  }

  /**
   * Get synchronization status
   */
  async getSyncStatus(syncId: string): Promise<MLSSyncStatus> {
    const status = this.activeSyncs.get(syncId);
    if (!status) {
      throw new Error(`Sync ${syncId} not found`);
    }
    return status;
  }

  /**
   * Get all active synchronizations
   */
  async getActiveSyncs(): Promise<MLSSyncStatus[]> {
    return Array.from(this.activeSyncs.values()).filter(
      sync => sync.status === 'running'
    );
  }

  /**
   * Schedule recurring synchronization
   */
  async scheduleSync(cronExpression: string, options: MLSSyncOptions = {
    fullSync: false,
    skipDuplicates: false,
    validateData: true
  }): Promise<string> {
    const syncId = this.generateSyncId();

    // In a real implementation, this would integrate with a job scheduler
    // For now, we'll simulate scheduling
    console.log(`Scheduled sync ${syncId} with cron: ${cronExpression}`);

    // Store the scheduled sync configuration
    this.syncQueue.push({ id: syncId, options });

    return syncId;
  }

  /**
   * Perform the actual synchronization
   */
  private async performSync(syncId: string, options: MLSSyncOptions): Promise<void> {
    try {
      // Validate connection first
      const isConnected = await this.mlsService.validateConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to MLS provider');
      }

      // Get properties from MLS
      const properties = await this.mlsService.getProperties(options);

      // Process properties in batches
      const batchSize = 50;
      const totalBatches = Math.ceil(properties.length / batchSize);

      for (let i = 0; i < properties.length; i += batchSize) {
        // Check if sync was stopped
        const currentStatus = this.activeSyncs.get(syncId);
        if (currentStatus?.status === 'paused') {
          break;
        }

        const batch = properties.slice(i, i + batchSize);
        await this.processBatch(syncId, batch, options);

        // Update progress
        const progress = Math.round(((i + batch.length) / properties.length) * 100);
        this.updateSyncStatus(syncId, { progress });
      }

      // Mark sync as completed
      this.updateSyncStatus(syncId, {
        status: 'completed',
        endTime: new Date()
      });

    } catch (error) {
      console.error(`Sync ${syncId} error:`, error);
      this.updateSyncStatus(syncId, {
        status: 'failed',
        endTime: new Date(),
        errors: [{
          id: this.generateErrorId(),
          timestamp: new Date(),
          type: 'api',
          message: error.message,
          retryable: true,
          resolved: false
        }]
      });
    }
  }

  /**
   * Process a batch of properties
   */
  private async processBatch(
    syncId: string,
    properties: MLSPropertyData[],
    options: MLSSyncOptions
  ): Promise<void> {
    for (const property of properties) {
      try {
        await this.processProperty(syncId, property, options);

        // Update counters
        const status = this.activeSyncs.get(syncId);
        if (status) {
          status.recordsProcessed++;
          this.activeSyncs.set(syncId, status);
        }

      } catch (error) {
        console.error(`Failed to process property ${property.mlsId}:`, error);

        // Record error
        const status = this.activeSyncs.get(syncId);
        if (status) {
          status.recordsFailed++;
          status.errors.push({
            id: this.generateErrorId(),
            timestamp: new Date(),
            type: 'data',
            message: `Failed to process property ${property.mlsId}: ${error.message}`,
            mlsRecordId: property.mlsId,
            retryable: true,
            resolved: false
          });
          this.activeSyncs.set(syncId, status);
        }
      }
    }
  }

  /**
   * Process individual property
   */
  private async processProperty(
    syncId: string,
    property: MLSPropertyData,
    options: MLSSyncOptions
  ): Promise<void> {
    // Check for duplicates if not skipping
    if (!options.skipDuplicates) {
      const duplicates = await this.checkForDuplicates(property);
      if (duplicates.length > 0) {
        // Handle duplicates based on configuration
        await this.handleDuplicates(property, duplicates);
        return;
      }
    }

    // Validate data if requested
    if (options.validateData) {
      await this.validatePropertyData(property);
    }

    // Save or update property
    const existingProperty = await this.findExistingProperty(property.mlsId);

    if (existingProperty) {
      await this.updateExistingProperty(existingProperty.id, property);
      this.incrementCounter(syncId, 'recordsUpdated');
    } else {
      await this.createNewProperty(property);
      this.incrementCounter(syncId, 'recordsCreated');
    }
  }

  /**
   * Check for duplicate properties
   */
  private async checkForDuplicates(property: MLSPropertyData): Promise<any[]> {
    // This would integrate with the duplicate detection service
    // For now, return empty array (no duplicates)
    return [];
  }

  /**
   * Handle duplicate properties
   */
  private async handleDuplicates(property: MLSPropertyData, duplicates: any[]): Promise<void> {
    // Implement duplicate resolution logic
    // This would integrate with the duplicate resolver
    console.log(`Found ${duplicates.length} duplicates for property ${property.mlsId}`);
  }

  /**
   * Validate property data
   */
  private async validatePropertyData(property: MLSPropertyData): Promise<void> {
    // Basic validation
    if (!property.mlsId) {
      throw new Error('MLS ID is required');
    }

    if (!property.address.streetName || !property.address.city || !property.address.state) {
      throw new Error('Complete address information is required');
    }

    if (property.price <= 0) {
      throw new Error('Valid price is required');
    }
  }

  /**
   * Find existing property by MLS ID
   */
  private async findExistingProperty(mlsId: string): Promise<any | null> {
    // This would query the database
    // For now, return null (simulate not found)
    return null;
  }

  /**
   * Update existing property
   */
  private async updateExistingProperty(propertyId: string, property: MLSPropertyData): Promise<void> {
    // This would update the database
    console.log(`Updating property ${propertyId} with MLS data ${property.mlsId}`);
  }

  /**
   * Create new property
   */
  private async createNewProperty(property: MLSPropertyData): Promise<void> {
    // This would insert into the database
    console.log(`Creating new property from MLS data ${property.mlsId}`);
  }

  /**
   * Update sync status
   */
  private updateSyncStatus(syncId: string, updates: Partial<MLSSyncStatus>): void {
    const status = this.activeSyncs.get(syncId);
    if (status) {
      Object.assign(status, updates);
      this.activeSyncs.set(syncId, status);
    }
  }

  /**
   * Increment counter in sync status
   */
  private incrementCounter(syncId: string, counter: keyof Pick<MLSSyncStatus, 'recordsUpdated' | 'recordsCreated' | 'recordsFailed'>): void {
    const status = this.activeSyncs.get(syncId);
    if (status) {
      status[counter]++;
      this.activeSyncs.set(syncId, status);
    }
  }

  /**
   * Generate unique sync ID
   */
  private generateSyncId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up completed syncs (keep only recent ones)
   */
  private cleanupOldSyncs(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    const oldSyncIds: string[] = [];

    for (const [syncId, status] of this.activeSyncs) {
      if (status.endTime && status.endTime.getTime() < cutoffTime) {
        oldSyncIds.push(syncId);
      }
    }

    oldSyncIds.forEach(syncId => this.activeSyncs.delete(syncId));
  }
}

/**
 * Factory function to create MLS sync manager
 */
export function createMLSSyncManager(mlsService: IMLSService, config: MLSConfig): IMLSSyncManager {
  return new MLSSyncManager(mlsService, config);
}

/**
 * Background sync scheduler
 */
export class MLSSyncScheduler {
  private scheduledSyncs: Map<string, NodeJS.Timeout> = new Map();
  private syncManager: IMLSSyncManager;

  constructor(syncManager: IMLSSyncManager) {
    this.syncManager = syncManager;
  }

  /**
   * Schedule recurring sync
   */
  scheduleRecurringSync(
    syncId: string,
    intervalMinutes: number,
    options: MLSSyncOptions
  ): void {
    // Clear existing schedule if any
    this.cancelScheduledSync(syncId);

    const intervalMs = intervalMinutes * 60 * 1000;
    const timeoutId = setInterval(async () => {
      try {
        await this.syncManager.startSync(options);
      } catch (error) {
        console.error(`Scheduled sync ${syncId} failed:`, error);
      }
    }, intervalMs);

    this.scheduledSyncs.set(syncId, timeoutId);
  }

  /**
   * Cancel scheduled sync
   */
  cancelScheduledSync(syncId: string): void {
    const timeoutId = this.scheduledSyncs.get(syncId);
    if (timeoutId) {
      clearInterval(timeoutId);
      this.scheduledSyncs.delete(syncId);
    }
  }

  /**
   * Cancel all scheduled syncs
   */
  cancelAllScheduledSyncs(): void {
    for (const [syncId, timeoutId] of this.scheduledSyncs) {
      clearInterval(timeoutId);
    }
    this.scheduledSyncs.clear();
  }

  /**
   * Get scheduled syncs
   */
  getScheduledSyncs(): string[] {
    return Array.from(this.scheduledSyncs.keys());
  }
}

/**
 * Sync progress tracker
 */
export class MLSSyncProgressTracker {
  private progressCallbacks: Map<string, (progress: number) => void> = new Map();

  /**
   * Register progress callback
   */
  onProgress(syncId: string, callback: (progress: number) => void): void {
    this.progressCallbacks.set(syncId, callback);
  }

  /**
   * Unregister progress callback
   */
  offProgress(syncId: string): void {
    this.progressCallbacks.delete(syncId);
  }

  /**
   * Notify progress update
   */
  notifyProgress(syncId: string, progress: number): void {
    const callback = this.progressCallbacks.get(syncId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Clear all callbacks
   */
  clear(): void {
    this.progressCallbacks.clear();
  }
}