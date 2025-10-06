import { query } from '../config/database';

export interface MLSSyncStatus {
  syncStatusId: number;
  providerId: string;
  providerName: string;
  providerType: string;
  
  // Sync Configuration
  syncEnabled: boolean;
  syncIntervalHours: number;
  
  // Last Sync Information
  lastSyncStartedAt: Date | null;
  lastSyncCompletedAt: Date | null;
  lastSyncDurationSeconds: number | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  
  // Sync Statistics
  totalPropertiesSynced: number;
  propertiesAddedLastSync: number;
  propertiesUpdatedLastSync: number;
  propertiesDeletedLastSync: number;
  propertiesErroredLastSync: number;
  
  // Health Metrics
  consecutiveFailures: number;
  totalSyncCount: number;
  totalSuccessCount: number;
  totalFailureCount: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface MLSSyncStatusCreate {
  providerId: string;
  providerName: string;
  providerType: string;
  syncEnabled?: boolean;
  syncIntervalHours?: number;
}

export interface MLSSyncStatusUpdate {
  syncEnabled?: boolean;
  syncIntervalHours?: number;
  lastSyncStartedAt?: Date;
  lastSyncCompletedAt?: Date;
  lastSyncDurationSeconds?: number;
  lastSyncStatus?: string;
  lastSyncError?: string;
  propertiesAddedLastSync?: number;
  propertiesUpdatedLastSync?: number;
  propertiesDeletedLastSync?: number;
  propertiesErroredLastSync?: number;
  consecutiveFailures?: number;
}

export class MLSSyncStatusModel {
  static async create(statusData: MLSSyncStatusCreate): Promise<MLSSyncStatus> {
    const result = await query(
      `INSERT INTO mls_sync_status (
        provider_id, provider_name, provider_type, sync_enabled, sync_interval_hours,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *`,
      [
        statusData.providerId,
        statusData.providerName,
        statusData.providerType,
        statusData.syncEnabled !== undefined ? statusData.syncEnabled : true,
        statusData.syncIntervalHours || 4,
      ]
    );

    return this.mapRow(result.rows[0]);
  }

  static async findByProviderId(providerId: string): Promise<MLSSyncStatus | null> {
    const result = await query(
      'SELECT * FROM mls_sync_status WHERE provider_id = $1',
      [providerId]
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async findAll(): Promise<MLSSyncStatus[]> {
    const result = await query(
      'SELECT * FROM mls_sync_status ORDER BY provider_name ASC'
    );

    return result.rows.map(row => this.mapRow(row));
  }

  static async findEnabled(): Promise<MLSSyncStatus[]> {
    const result = await query(
      'SELECT * FROM mls_sync_status WHERE sync_enabled = true ORDER BY provider_name ASC'
    );

    return result.rows.map(row => this.mapRow(row));
  }

  static async update(providerId: string, updateData: MLSSyncStatusUpdate): Promise<MLSSyncStatus | null> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        updates.push(`${snakeKey} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      return this.findByProviderId(providerId);
    }

    updates.push(`updated_at = NOW()`);
    params.push(providerId);

    const result = await query(
      `UPDATE mls_sync_status 
       SET ${updates.join(', ')}
       WHERE provider_id = $${paramIndex}
       RETURNING *`,
      params
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async recordSyncStart(providerId: string): Promise<MLSSyncStatus | null> {
    return this.update(providerId, {
      lastSyncStartedAt: new Date(),
      lastSyncStatus: 'running',
      lastSyncError: undefined,
    });
  }

  static async recordSyncSuccess(
    providerId: string,
    durationSeconds: number,
    stats: {
      added: number;
      updated: number;
      deleted: number;
      errored: number;
    }
  ): Promise<MLSSyncStatus | null> {
    const status = await this.findByProviderId(providerId);
    if (!status) return null;

    return this.update(providerId, {
      lastSyncCompletedAt: new Date(),
      lastSyncDurationSeconds: durationSeconds,
      lastSyncStatus: stats.errored > 0 ? 'partial' : 'success',
      propertiesAddedLastSync: stats.added,
      propertiesUpdatedLastSync: stats.updated,
      propertiesDeletedLastSync: stats.deleted,
      propertiesErroredLastSync: stats.errored,
      consecutiveFailures: 0,
    });
  }

  static async recordSyncFailure(providerId: string, error: string): Promise<MLSSyncStatus | null> {
    const status = await this.findByProviderId(providerId);
    if (!status) return null;

    return this.update(providerId, {
      lastSyncCompletedAt: new Date(),
      lastSyncStatus: 'failed',
      lastSyncError: error,
      consecutiveFailures: status.consecutiveFailures + 1,
    });
  }

  static async incrementTotalCount(providerId: string, success: boolean): Promise<void> {
    await query(
      `UPDATE mls_sync_status 
       SET total_sync_count = total_sync_count + 1,
           ${success ? 'total_success_count = total_success_count + 1' : 'total_failure_count = total_failure_count + 1'},
           updated_at = NOW()
       WHERE provider_id = $1`,
      [providerId]
    );
  }

  static async shouldSync(providerId: string): Promise<boolean> {
    const status = await this.findByProviderId(providerId);
    if (!status || !status.syncEnabled) return false;

    // If never synced, should sync
    if (!status.lastSyncCompletedAt) return true;

    // Check if enough time has passed since last sync
    const hoursSinceLastSync = (Date.now() - status.lastSyncCompletedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastSync >= status.syncIntervalHours;
  }

  private static mapRow(row: any): MLSSyncStatus {
    return {
      syncStatusId: row.sync_status_id,
      providerId: row.provider_id,
      providerName: row.provider_name,
      providerType: row.provider_type,
      syncEnabled: row.sync_enabled,
      syncIntervalHours: row.sync_interval_hours,
      lastSyncStartedAt: row.last_sync_started_at,
      lastSyncCompletedAt: row.last_sync_completed_at,
      lastSyncDurationSeconds: row.last_sync_duration_seconds,
      lastSyncStatus: row.last_sync_status,
      lastSyncError: row.last_sync_error,
      totalPropertiesSynced: row.total_properties_synced,
      propertiesAddedLastSync: row.properties_added_last_sync,
      propertiesUpdatedLastSync: row.properties_updated_last_sync,
      propertiesDeletedLastSync: row.properties_deleted_last_sync,
      propertiesErroredLastSync: row.properties_errored_last_sync,
      consecutiveFailures: row.consecutive_failures,
      totalSyncCount: row.total_sync_count,
      totalSuccessCount: row.total_success_count,
      totalFailureCount: row.total_failure_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
