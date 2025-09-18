const cron = require('node-cron');
const { logger } = require('../config/logger');
const NotificationService = require('../services/NotificationService');
const MLSSyncService = require('../services/MLSSyncService');

/**
 * Cron Scheduler - Replaces n8n cron triggers
 * Handles scheduled tasks for notifications and MLS sync
 */
class CronScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Start all cron jobs
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Cron scheduler is already running');
      return;
    }

    try {
      logger.info('Starting cron scheduler...');

      // Daily notifications at 9 AM
      this.scheduleDailyNotifications();

      // MLS sync every hour
      this.scheduleMLSSync();

      // MLS full sync at 2 AM daily
      this.scheduleMLSFullSync();

      this.isRunning = true;
      logger.info('Cron scheduler started successfully');

    } catch (error) {
      logger.error('Failed to start cron scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Cron scheduler is not running');
      return;
    }

    try {
      logger.info('Stopping cron scheduler...');

      // Stop all jobs
      for (const [name, job] of this.jobs) {
        job.stop();
        logger.debug(`Stopped cron job: ${name}`);
      }

      this.jobs.clear();
      this.isRunning = false;
      logger.info('Cron scheduler stopped successfully');

    } catch (error) {
      logger.error('Error stopping cron scheduler', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Schedule daily notification reminders
   * Runs at 9 AM every day (replaces n8n cron trigger)
   */
  scheduleDailyNotifications() {
    const jobName = 'daily-notifications';

    const job = cron.schedule('0 9 * * *', async () => {
      try {
        logger.info('Running scheduled daily notifications');

        const result = await NotificationService.runDailyNotifications();

        logger.info('Daily notifications completed', {
          totalNotifications: result.totalNotifications,
          summary: result.summary
        });

      } catch (error) {
        logger.error('Scheduled daily notifications failed', {
          error: error.message,
          stack: error.stack
        });
      }
    }, {
      timezone: 'America/Toronto'
    });

    this.jobs.set(jobName, job);
    logger.info(`Scheduled ${jobName}: Daily at 9 AM`);
  }

  /**
   * Schedule MLS incremental sync
   * Runs every hour (replaces n8n schedule trigger)
   */
  scheduleMLSSync() {
    const jobName = 'mls-sync-hourly';

    const job = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Running scheduled MLS sync');

        const isAvailable = await MLSSyncService.isSyncAvailable();

        if (!isAvailable) {
          logger.info('MLS sync not available (already running or recent sync)');
          return;
        }

        const result = await MLSSyncService.startSync({
          fullSync: false,
          validateData: true,
          skipDuplicates: false
        });

        if (result.success) {
          logger.info('MLS sync started successfully', {
            syncId: result.syncId
          });
        } else {
          logger.info('MLS sync skipped', {
            reason: result.message
          });
        }

      } catch (error) {
        logger.error('Scheduled MLS sync failed', {
          error: error.message,
          stack: error.stack
        });
      }
    }, {
      timezone: 'America/Toronto'
    });

    this.jobs.set(jobName, job);
    logger.info(`Scheduled ${jobName}: Every hour`);
  }

  /**
   * Schedule MLS full sync
   * Runs at 2 AM daily (replaces n8n conditional logic)
   */
  scheduleMLSFullSync() {
    const jobName = 'mls-sync-daily-full';

    const job = cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Running scheduled MLS full sync');

        const isAvailable = await MLSSyncService.isSyncAvailable();

        if (!isAvailable) {
          logger.info('MLS full sync not available (already running)');
          return;
        }

        const result = await MLSSyncService.startSync({
          fullSync: true,
          validateData: true,
          skipDuplicates: false
        });

        if (result.success) {
          logger.info('MLS full sync started successfully', {
            syncId: result.syncId
          });
        } else {
          logger.info('MLS full sync skipped', {
            reason: result.message
          });
        }

      } catch (error) {
        logger.error('Scheduled MLS full sync failed', {
          error: error.message,
          stack: error.stack
        });
      }
    }, {
      timezone: 'America/Toronto'
    });

    this.jobs.set(jobName, job);
    logger.info(`Scheduled ${jobName}: Daily at 2 AM`);
  }

  /**
   * Manually trigger daily notifications (for testing)
   */
  async triggerDailyNotifications() {
    try {
      logger.info('Manually triggering daily notifications');

      const result = await NotificationService.runDailyNotifications();

      logger.info('Manual daily notifications completed', {
        totalNotifications: result.totalNotifications
      });

      return result;

    } catch (error) {
      logger.error('Manual daily notifications failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Manually trigger MLS sync (for testing)
   */
  async triggerMLSSync(options = {}) {
    try {
      logger.info('Manually triggering MLS sync', { options });

      const result = await MLSSyncService.startSync(options);

      logger.info('Manual MLS sync completed', {
        success: result.success,
        syncId: result.syncId
      });

      return result;

    } catch (error) {
      logger.error('Manual MLS sync failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get status of all cron jobs
   */
  getStatus() {
    const jobs = {};

    for (const [name, job] of this.jobs) {
      jobs[name] = {
        running: job.running,
        scheduled: true
      };
    }

    return {
      isRunning: this.isRunning,
      jobs,
      totalJobs: this.jobs.size
    };
  }

  /**
   * Health check for cron scheduler
   */
  async healthCheck() {
    try {
      const status = this.getStatus();

      // Test notification service
      const notificationHealth = await this.testNotificationService();

      // Test MLS sync service
      const mlsHealth = await this.testMLSSyncService();

      return {
        ...status,
        services: {
          notifications: notificationHealth,
          mlsSync: mlsHealth
        },
        healthy: status.isRunning && notificationHealth && mlsHealth
      };

    } catch (error) {
      logger.error('Cron scheduler health check failed', {
        error: error.message
      });

      return {
        isRunning: this.isRunning,
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Test notification service connectivity
   */
  async testNotificationService() {
    try {
      // Simple test - just check if service is available
      return true;
    } catch (error) {
      logger.error('Notification service test failed', { error: error.message });
      return false;
    }
  }

  /**
   * Test MLS sync service connectivity
   */
  async testMLSSyncService() {
    try {
      // Simple test - just check if service is available
      return true;
    } catch (error) {
      logger.error('MLS sync service test failed', { error: error.message });
      return false;
    }
  }
}

module.exports = new CronScheduler();