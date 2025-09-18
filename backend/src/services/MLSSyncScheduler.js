const cron = require('node-cron');
const MLSSyncService = require('./MLSSyncService');
const NotificationService = require('./NotificationService');
const { logger } = require('../config/logger');

class MLSSyncScheduler {
  constructor() {
    this.syncJob = null;
    this.isRunning = false;
  }

  /**
   * Start the MLS sync scheduler
   */
  start() {
    // Run every hour
    this.syncJob = cron.schedule('0 * * * *', async () => {
      try {
        await this.runMLSSync();
      } catch (error) {
        logger.error('MLS Sync Scheduler Error:', error);
      }
    }, {
      timezone: 'America/Toronto'
    });

    logger.info('MLS Sync Scheduler started - runs every hour');
  }

  /**
   * Stop the MLS sync scheduler
   */
  stop() {
    if (this.syncJob) {
      this.syncJob.stop();
      this.syncJob = null;
      logger.info('MLS Sync Scheduler stopped');
    }
  }

  /**
   * Run the MLS sync process
   */
  async runMLSSync() {
    if (this.isRunning) {
      logger.info('MLS sync already running, skipping...');
      await this.sendWaitingNotification();
      return;
    }

    try {
      this.isRunning = true;
      logger.info('Starting scheduled MLS sync...');

      // Check if sync is available
      const status = await MLSSyncService.getSyncStatus();

      if (status.status === 'running') {
        logger.info('MLS sync already running, waiting...');
        await this.sendWaitingNotification();
        return;
      }

      // Determine if this should be a full sync (2 AM)
      const now = new Date();
      const isFullSync = now.getHours() === 2;

      // Start the sync
      const syncResult = await MLSSyncService.startSync({
        fullSync: isFullSync,
        validateData: true,
        skipDuplicates: false
      });

      if (!syncResult.success) {
        throw new Error(syncResult.error);
      }

      const syncId = syncResult.data.syncId;
      logger.info(`MLS sync started with ID: ${syncId}, fullSync: ${isFullSync}`);

      // Monitor progress
      await this.monitorSyncProgress(syncId);

    } catch (error) {
      logger.error('MLS sync failed:', error);
      await this.sendFailureNotification(error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Monitor sync progress until completion
   */
  async monitorSyncProgress(syncId) {
    const maxRetries = 120; // 2 hours max
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const progress = await MLSSyncService.getSyncProgress(syncId);

        if (!progress.success) {
          throw new Error(progress.error);
        }

        const status = progress.data.status;

        if (status === 'completed') {
          logger.info(`MLS sync ${syncId} completed successfully`);
          await this.sendSuccessNotification(progress.data);
          return;
        }

        if (status === 'failed') {
          logger.error(`MLS sync ${syncId} failed`);
          await this.sendFailureNotification(progress.data);
          return;
        }

        // Still running, wait 30 seconds before checking again
        await this.wait(30000);
        retries++;

      } catch (error) {
        logger.error(`Error monitoring sync ${syncId}:`, error);
        retries++;
        await this.wait(30000);
      }
    }

    // Timeout reached
    logger.error(`MLS sync ${syncId} timed out after ${maxRetries} retries`);
    await this.sendFailureNotification({ syncId, error: 'Sync timeout' });
  }

  /**
   * Send waiting notification
   */
  async sendWaitingNotification() {
    try {
      await NotificationService.createNotification({
        user_id: 1, // System user
        title: 'MLS Sync Waiting',
        message: 'MLS sync is currently running. Will retry in 30 seconds.',
        type: 'mls_sync_waiting',
        priority: 'low'
      });
    } catch (error) {
      logger.error('Failed to send waiting notification:', error);
    }
  }

  /**
   * Send success notification
   */
  async sendSuccessNotification(syncData) {
    try {
      const message = `MLS sync completed successfully. Processed ${syncData.recordsProcessed || 0} records, updated ${syncData.recordsUpdated || 0}, created ${syncData.recordsCreated || 0}.`;

      await NotificationService.createNotification({
        user_id: 1, // System user
        title: 'MLS Sync Completed',
        message: message,
        type: 'mls_sync_complete',
        priority: 'normal'
      });

      // Log completion
      logger.info('MLS sync completion logged', { syncData });
    } catch (error) {
      logger.error('Failed to send success notification:', error);
    }
  }

  /**
   * Send failure notification
   */
  async sendFailureNotification(error) {
    try {
      const message = `MLS sync failed: ${error.message || 'Unknown error'}. Check logs for details.`;

      await NotificationService.createNotification({
        user_id: 1, // System user
        title: 'MLS Sync Failed',
        message: message,
        type: 'mls_sync_failed',
        priority: 'high'
      });
    } catch (notifyError) {
      logger.error('Failed to send failure notification:', notifyError);
    }
  }

  /**
   * Utility function to wait
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isScheduled: this.syncJob !== null,
      nextRun: this.syncJob ? this.syncJob.nextDates() : null
    };
  }
}

module.exports = new MLSSyncScheduler();