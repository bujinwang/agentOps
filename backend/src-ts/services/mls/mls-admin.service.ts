/**
 * MLS Admin Service
 * 
 * Provides administrative functions for managing MLS synchronization:
 * - Trigger manual syncs
 * - View sync status
 * - View sync history
 * - View sync errors
 * - Manage provider configurations
 */

import { MLSSyncService, MLSSyncResult } from './mls-sync.service';
import { MLSSyncStatusModel } from '../../models/mls-sync-status.model';
import { MLSSyncHistoryModel } from '../../models/mls-sync-history.model';
import { AppError } from '../../middleware/error.middleware';
import { query } from '../../config/database';

export interface ProviderSyncConfig {
  providerId: string;
  providerName: string;
  providerType: 'RETS' | 'MOCK';
  enabled: boolean;
}

export class MLSAdminService {
  private activeSyncs: Map<string, MLSSyncService> = new Map();

  /**
   * Trigger manual sync for a provider
   */
  async triggerSync(
    providerId: string,
    syncType: 'full' | 'incremental' = 'incremental',
    _triggeredBy: string = 'admin'
  ): Promise<MLSSyncResult> {
    // Check if sync is already running for this provider
    if (this.activeSyncs.has(providerId)) {
      throw new AppError(409, 'SYNC_IN_PROGRESS', 'A sync is already running for this provider');
    }

    // Get provider configuration
    const providerConfig = await this.getProviderConfig(providerId);

    if (!providerConfig) {
      throw new AppError(404, 'PROVIDER_NOT_FOUND', `Provider ${providerId} not found`);
    }

    // Create sync service
    const syncService = new MLSSyncService({
      providerId: providerConfig.providerId,
      providerName: providerConfig.providerName,
      providerType: providerConfig.providerType,
      loginUrl: providerConfig.loginUrl,
      credentials: providerConfig.credentials,
      fieldMapping: providerConfig.fieldMapping,
      syncOptions: {
        batchSize: 1000,
        includeMedia: true,
        autoRetry: true,
        maxRetries: 3,
      },
    });

    try {
      // Mark sync as active
      this.activeSyncs.set(providerId, syncService);

      // Initialize provider
      await syncService.initialize();

      // Perform sync
      let result: MLSSyncResult;
      if (syncType === 'full') {
        result = await syncService.performFullSync();
      } else {
        result = await syncService.performIncrementalSync();
      }

      // Cleanup
      await syncService.cleanup();
      this.activeSyncs.delete(providerId);

      return result;
    } catch (error) {
      // Cleanup on error
      await syncService.cleanup();
      this.activeSyncs.delete(providerId);
      throw error;
    }
  }

  /**
   * Cancel a running sync
   */
  async cancelSync(providerId: string): Promise<void> {
    const syncService = this.activeSyncs.get(providerId);

    if (!syncService) {
      throw new AppError(404, 'NO_ACTIVE_SYNC', 'No active sync found for this provider');
    }

    // Cleanup and remove
    await syncService.cleanup();
    this.activeSyncs.delete(providerId);

    // Mark sync as cancelled in history
    const runningSyncs = await MLSSyncHistoryModel.findRunning();
    for (const sync of runningSyncs) {
      if (sync.providerId === providerId) {
        await MLSSyncHistoryModel.cancel(sync.syncId);
      }
    }
  }

  /**
   * Get sync status for all providers
   */
  async getAllSyncStatus(): Promise<any[]> {
    const statuses = await MLSSyncStatusModel.findAll();
    
    return statuses.map(status => ({
      providerId: status.providerId,
      providerName: status.providerName,
      providerType: status.providerType,
      syncEnabled: status.syncEnabled,
      lastSyncStarted: status.lastSyncStartedAt,
      lastSyncCompleted: status.lastSyncCompletedAt,
      lastSyncDuration: status.lastSyncDurationSeconds,
      lastSyncStatus: status.lastSyncStatus,
      lastSyncError: status.lastSyncError,
      propertiesAddedLastSync: status.propertiesAddedLastSync,
      propertiesUpdatedLastSync: status.propertiesUpdatedLastSync,
      propertiesErroredLastSync: status.propertiesErroredLastSync,
      consecutiveFailures: status.consecutiveFailures,
      totalSyncCount: status.totalSyncCount,
      totalSuccessCount: status.totalSuccessCount,
      totalFailureCount: status.totalFailureCount,
      isRunning: this.activeSyncs.has(status.providerId),
    }));
  }

  /**
   * Get sync status for a specific provider
   */
  async getProviderSyncStatus(providerId: string): Promise<any> {
    const status = await MLSSyncStatusModel.findByProviderId(providerId);

    if (!status) {
      throw new AppError(404, 'PROVIDER_NOT_FOUND', `Provider ${providerId} not found`);
    }

    return {
      providerId: status.providerId,
      providerName: status.providerName,
      providerType: status.providerType,
      syncEnabled: status.syncEnabled,
      syncIntervalHours: status.syncIntervalHours,
      lastSyncStarted: status.lastSyncStartedAt,
      lastSyncCompleted: status.lastSyncCompletedAt,
      lastSyncDuration: status.lastSyncDurationSeconds,
      lastSyncStatus: status.lastSyncStatus,
      lastSyncError: status.lastSyncError,
      statistics: {
        totalPropertiesSynced: status.totalPropertiesSynced,
        addedLastSync: status.propertiesAddedLastSync,
        updatedLastSync: status.propertiesUpdatedLastSync,
        deletedLastSync: status.propertiesDeletedLastSync,
        erroredLastSync: status.propertiesErroredLastSync,
      },
      health: {
        consecutiveFailures: status.consecutiveFailures,
        totalSyncCount: status.totalSyncCount,
        totalSuccessCount: status.totalSuccessCount,
        totalFailureCount: status.totalFailureCount,
        successRate: status.totalSyncCount > 0 
          ? (status.totalSuccessCount / status.totalSyncCount * 100).toFixed(2) + '%'
          : 'N/A',
      },
      isRunning: this.activeSyncs.has(providerId),
    };
  }

  /**
   * Get sync history for a provider
   */
  async getProviderSyncHistory(providerId: string, limit: number = 50): Promise<any[]> {
    const history = await MLSSyncHistoryModel.findByProviderId(providerId, limit);

    return history.map(h => ({
      syncId: h.syncId,
      syncType: h.syncType,
      startedAt: h.startedAt,
      completedAt: h.completedAt,
      duration: h.durationSeconds,
      status: h.status,
      propertiesFetched: h.propertiesFetched,
      propertiesAdded: h.propertiesAdded,
      propertiesUpdated: h.propertiesUpdated,
      propertiesDeleted: h.propertiesDeleted,
      propertiesErrored: h.propertiesErrored,
      mediaDownloaded: h.mediaDownloaded,
      mediaFailed: h.mediaFailed,
      errorMessage: h.errorMessage,
      triggeredBy: h.triggeredBy,
    }));
  }

  /**
   * Get recent sync history across all providers
   */
  async getRecentSyncHistory(limit: number = 50): Promise<any[]> {
    const history = await MLSSyncHistoryModel.findRecent(limit);

    return history.map(h => ({
      syncId: h.syncId,
      providerId: h.providerId,
      syncType: h.syncType,
      startedAt: h.startedAt,
      completedAt: h.completedAt,
      duration: h.durationSeconds,
      status: h.status,
      propertiesFetched: h.propertiesFetched,
      propertiesAdded: h.propertiesAdded,
      propertiesUpdated: h.propertiesUpdated,
      propertiesErrored: h.propertiesErrored,
      triggeredBy: h.triggeredBy,
    }));
  }

  /**
   * Get sync errors for a provider
   */
  async getProviderSyncErrors(providerId: string, limit: number = 100): Promise<any[]> {
    const result = await query(
      `SELECT * FROM mls_sync_errors 
       WHERE provider_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [providerId, limit]
    );

    return result.rows.map(row => ({
      errorId: row.error_id,
      syncId: row.sync_id,
      errorType: row.error_type,
      errorMessage: row.error_message,
      errorContext: row.error_context,
      mlsListingId: row.mls_listing_id,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      retryStatus: row.retry_status,
      nextRetryAt: row.next_retry_at,
      resolved: row.resolved,
      createdAt: row.created_at,
    }));
  }

  /**
   * Get sync statistics across all providers
   */
  async getSyncStatistics(): Promise<any> {
    const allStats = await MLSSyncHistoryModel.getStatistics();
    const statuses = await MLSSyncStatusModel.findAll();

    const totalProperties = statuses.reduce((sum, s) => sum + s.totalPropertiesSynced, 0);
    const activeProviders = statuses.filter(s => s.syncEnabled).length;
    const runningSync = this.activeSyncs.size;

    return {
      totalProviders: statuses.length,
      activeProviders,
      runningSyncs: runningSync,
      totalProperties,
      syncStatistics: {
        totalSyncs: allStats.totalSyncs,
        successfulSyncs: allStats.successfulSyncs,
        failedSyncs: allStats.failedSyncs,
        averageDuration: Math.round(allStats.averageDuration),
        totalPropertiesAdded: allStats.totalPropertiesAdded,
        totalPropertiesUpdated: allStats.totalPropertiesUpdated,
        successRate: allStats.totalSyncs > 0
          ? ((allStats.successfulSyncs / allStats.totalSyncs) * 100).toFixed(2) + '%'
          : 'N/A',
      },
    };
  }

  /**
   * Enable/disable sync for a provider
   */
  async toggleProviderSync(providerId: string, enabled: boolean): Promise<void> {
    await MLSSyncStatusModel.update(providerId, { syncEnabled: enabled });
  }

  /**
   * Update sync interval for a provider
   */
  async updateSyncInterval(providerId: string, intervalHours: number): Promise<void> {
    if (intervalHours < 1 || intervalHours > 24) {
      throw new AppError(400, 'INVALID_INTERVAL', 'Sync interval must be between 1 and 24 hours');
    }

    await MLSSyncStatusModel.update(providerId, { syncIntervalHours: intervalHours });
  }

  /**
   * Get provider configuration from database
   */
  private async getProviderConfig(providerId: string): Promise<any> {
    const result = await query(
      'SELECT * FROM mls_provider_configurations WHERE provider_id = $1 AND is_active = true',
      [providerId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      providerId: row.provider_id,
      providerName: row.provider_name,
      providerType: row.provider_type,
      loginUrl: row.login_url,
      credentials: {
        // In production, fetch from AWS Secrets Manager
        username: process.env[`MLS_${providerId.toUpperCase()}_USERNAME`] || 'test',
        password: process.env[`MLS_${providerId.toUpperCase()}_PASSWORD`] || 'test',
        userAgent: 'Real-Estate-CRM/1.0',
      },
      fieldMapping: row.field_mapping,
    };
  }

  /**
   * Check if any syncs are currently running
   */
  hasActiveSyncs(): boolean {
    return this.activeSyncs.size > 0;
  }

  /**
   * Get list of providers with active syncs
   */
  getActiveProviders(): string[] {
    return Array.from(this.activeSyncs.keys());
  }
}
