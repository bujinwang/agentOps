import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface MLSSyncHistory {
  syncHistoryId: number;
  syncId: string;
  providerId: string;
  syncType: string;
  
  // Sync Execution
  startedAt: Date;
  completedAt: Date | null;
  durationSeconds: number | null;
  status: string;
  
  // Statistics
  propertiesFetched: number;
  propertiesAdded: number;
  propertiesUpdated: number;
  propertiesDeleted: number;
  propertiesErrored: number;
  mediaDownloaded: number;
  mediaFailed: number;
  
  // Error Information
  errorMessage: string | null;
  errorDetails: Record<string, any> | null;
  
  // Metadata
  triggeredBy: string;
  syncConfig: Record<string, any> | null;
  
  // Timestamps
  createdAt: Date;
}

export interface MLSSyncHistoryCreate {
  providerId: string;
  syncType: string;
  triggeredBy: string;
  syncConfig?: Record<string, any>;
}

export interface MLSSyncHistoryUpdate {
  completedAt?: Date;
  durationSeconds?: number;
  status?: string;
  propertiesFetched?: number;
  propertiesAdded?: number;
  propertiesUpdated?: number;
  propertiesDeleted?: number;
  propertiesErrored?: number;
  mediaDownloaded?: number;
  mediaFailed?: number;
  errorMessage?: string;
  errorDetails?: Record<string, any>;
}

export class MLSSyncHistoryModel {
  static async create(historyData: MLSSyncHistoryCreate): Promise<MLSSyncHistory> {
    const syncId = uuidv4();

    const result = await query(
      `INSERT INTO mls_sync_history (
        sync_id, provider_id, sync_type, started_at, status,
        triggered_by, sync_config, created_at
      )
      VALUES ($1, $2, $3, NOW(), 'running', $4, $5, NOW())
      RETURNING *`,
      [
        syncId,
        historyData.providerId,
        historyData.syncType,
        historyData.triggeredBy,
        historyData.syncConfig ? JSON.stringify(historyData.syncConfig) : null,
      ]
    );

    return this.mapRow(result.rows[0]);
  }

  static async findById(syncHistoryId: number): Promise<MLSSyncHistory | null> {
    const result = await query(
      'SELECT * FROM mls_sync_history WHERE sync_history_id = $1',
      [syncHistoryId]
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async findBySyncId(syncId: string): Promise<MLSSyncHistory | null> {
    const result = await query(
      'SELECT * FROM mls_sync_history WHERE sync_id = $1',
      [syncId]
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async findByProviderId(
    providerId: string,
    limit: number = 50
  ): Promise<MLSSyncHistory[]> {
    const result = await query(
      `SELECT * FROM mls_sync_history 
       WHERE provider_id = $1 
       ORDER BY started_at DESC 
       LIMIT $2`,
      [providerId, limit]
    );

    return result.rows.map(row => this.mapRow(row));
  }

  static async findRecent(limit: number = 50): Promise<MLSSyncHistory[]> {
    const result = await query(
      `SELECT * FROM mls_sync_history 
       ORDER BY started_at DESC 
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => this.mapRow(row));
  }

  static async findRunning(): Promise<MLSSyncHistory[]> {
    const result = await query(
      `SELECT * FROM mls_sync_history 
       WHERE status = 'running' 
       ORDER BY started_at DESC`
    );

    return result.rows.map(row => this.mapRow(row));
  }

  static async update(syncId: string, updateData: MLSSyncHistoryUpdate): Promise<MLSSyncHistory | null> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        
        if (key === 'errorDetails') {
          updates.push(`${snakeKey} = $${paramIndex}`);
          params.push(JSON.stringify(value));
        } else {
          updates.push(`${snakeKey} = $${paramIndex}`);
          params.push(value);
        }
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      return this.findBySyncId(syncId);
    }

    params.push(syncId);

    const result = await query(
      `UPDATE mls_sync_history 
       SET ${updates.join(', ')}
       WHERE sync_id = $${paramIndex}
       RETURNING *`,
      params
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async complete(
    syncId: string,
    status: 'success' | 'partial' | 'failed',
    stats: {
      fetched: number;
      added: number;
      updated: number;
      deleted: number;
      errored: number;
      mediaDownloaded?: number;
      mediaFailed?: number;
    },
    error?: { message: string; details?: Record<string, any> }
  ): Promise<MLSSyncHistory | null> {
    const history = await this.findBySyncId(syncId);
    if (!history) return null;

    const completedAt = new Date();
    const durationSeconds = Math.floor((completedAt.getTime() - history.startedAt.getTime()) / 1000);

    return this.update(syncId, {
      completedAt,
      durationSeconds,
      status,
      propertiesFetched: stats.fetched,
      propertiesAdded: stats.added,
      propertiesUpdated: stats.updated,
      propertiesDeleted: stats.deleted,
      propertiesErrored: stats.errored,
      mediaDownloaded: stats.mediaDownloaded || 0,
      mediaFailed: stats.mediaFailed || 0,
      errorMessage: error?.message || undefined,
      errorDetails: error?.details || undefined,
    });
  }

  static async cancel(syncId: string): Promise<MLSSyncHistory | null> {
    return this.update(syncId, {
      completedAt: new Date(),
      status: 'cancelled',
    });
  }

  static async getStatistics(providerId?: string): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    averageDuration: number;
    totalPropertiesAdded: number;
    totalPropertiesUpdated: number;
  }> {
    const whereClause = providerId ? 'WHERE provider_id = $1' : '';
    const params = providerId ? [providerId] : [];

    const result = await query(
      `SELECT 
        COUNT(*) as total_syncs,
        COUNT(*) FILTER (WHERE status = 'success') as successful_syncs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_syncs,
        AVG(duration_seconds) FILTER (WHERE duration_seconds IS NOT NULL) as avg_duration,
        SUM(properties_added) as total_added,
        SUM(properties_updated) as total_updated
       FROM mls_sync_history
       ${whereClause}`,
      params
    );

    const row = result.rows[0];
    return {
      totalSyncs: parseInt(row.total_syncs, 10),
      successfulSyncs: parseInt(row.successful_syncs, 10),
      failedSyncs: parseInt(row.failed_syncs, 10),
      averageDuration: row.avg_duration ? parseFloat(row.avg_duration) : 0,
      totalPropertiesAdded: parseInt(row.total_added, 10) || 0,
      totalPropertiesUpdated: parseInt(row.total_updated, 10) || 0,
    };
  }

  private static mapRow(row: any): MLSSyncHistory {
    return {
      syncHistoryId: row.sync_history_id,
      syncId: row.sync_id,
      providerId: row.provider_id,
      syncType: row.sync_type,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationSeconds: row.duration_seconds,
      status: row.status,
      propertiesFetched: row.properties_fetched,
      propertiesAdded: row.properties_added,
      propertiesUpdated: row.properties_updated,
      propertiesDeleted: row.properties_deleted,
      propertiesErrored: row.properties_errored,
      mediaDownloaded: row.media_downloaded,
      mediaFailed: row.media_failed,
      errorMessage: row.error_message,
      errorDetails: row.error_details,
      triggeredBy: row.triggered_by,
      syncConfig: row.sync_config,
      createdAt: row.created_at,
    };
  }
}
