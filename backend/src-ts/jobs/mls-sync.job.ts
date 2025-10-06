/**
 * MLS Sync Scheduled Job
 * 
 * This job runs periodically to synchronize properties from MLS providers.
 * By default, runs every 4 hours for each enabled provider.
 */

import * as cron from 'node-cron';
import { MLSAdminService } from '../services/mls/mls-admin.service';
import { MLSSyncStatusModel } from '../models/mls-sync-status.model';

export class MLSSyncJob {
  private mlsAdminService: MLSAdminService;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.mlsAdminService = new MLSAdminService();
  }

  /**
   * Start the scheduled sync job
   * Default: runs every hour and checks which providers need syncing
   */
  start(): void {
    if (this.cronJob) {
      console.log('⚠️  MLS sync job is already running');
      return;
    }

    // Run every hour (check which providers need syncing)
    // Cron format: minute hour day month weekday
    this.cronJob = cron.schedule('0 * * * *', async () => {
      await this.executeScheduledSync();
    });

    console.log('✅ MLS sync job started (runs every hour)');
    console.log('   Will check each provider\'s sync interval and sync if needed');
  }

  /**
   * Stop the scheduled sync job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('✅ MLS sync job stopped');
    }
  }

  /**
   * Execute scheduled sync for all enabled providers
   */
  private async executeScheduledSync(): Promise<void> {
    // Prevent overlapping syncs
    if (this.isRunning) {
      console.log('⏭️  Skipping sync - previous sync still running');
      return;
    }

    this.isRunning = true;

    try {
      console.log('🔄 Checking providers that need syncing...');

      // Get all enabled providers
      const enabledProviders = await MLSSyncStatusModel.findEnabled();

      console.log(`📊 Found ${enabledProviders.length} enabled provider(s)`);

      // Check each provider and sync if needed
      for (const provider of enabledProviders) {
        try {
          // Check if enough time has passed since last sync
          const shouldSync = await MLSSyncStatusModel.shouldSync(provider.providerId);

          if (shouldSync) {
            console.log(`🔄 Starting scheduled sync for: ${provider.providerName}`);

            // Trigger incremental sync
            await this.mlsAdminService.triggerSync(
              provider.providerId,
              'incremental',
              'scheduled'
            );

            console.log(`✅ Scheduled sync completed for: ${provider.providerName}`);
          } else {
            const hoursSinceLastSync = provider.lastSyncCompletedAt
              ? Math.floor((Date.now() - provider.lastSyncCompletedAt.getTime()) / (1000 * 60 * 60))
              : null;

            console.log(`⏭️  Skipping ${provider.providerName} - synced ${hoursSinceLastSync}h ago (interval: ${provider.syncIntervalHours}h)`);
          }
        } catch (error) {
          console.error(`❌ Error syncing provider ${provider.providerName}:`, error);
          // Continue with next provider
        }
      }

      console.log('✅ Scheduled sync check completed');
    } catch (error) {
      console.error('❌ Error in scheduled sync job:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run sync immediately (for testing)
   */
  async runNow(): Promise<void> {
    console.log('🔄 Running manual sync check...');
    await this.executeScheduledSync();
  }

  /**
   * Get job status
   */
  getStatus(): { running: boolean; active: boolean } {
    return {
      running: this.isRunning,
      active: this.cronJob !== null,
    };
  }
}

// Export singleton instance
export const mlsSyncJob = new MLSSyncJob();
