const cron = require('node-cron');
const pool = require('../config/database');
const NotificationService = require('./NotificationService');
const { logger } = require('../config/logger');

class NotificationScheduler {
  constructor() {
    this.dailyJob = null;
    this.isRunning = false;
  }

  /**
   * Start the notification scheduler
   */
  start() {
    // Run daily at 9:00 AM Toronto time
    this.dailyJob = cron.schedule('0 9 * * *', async () => {
      try {
        await this.sendDailyReminders();
      } catch (error) {
        logger.error('Daily reminders failed:', error);
      }
    }, {
      timezone: 'America/Toronto'
    });

    logger.info('Notification scheduler started - runs daily at 9:00 AM Toronto time');
  }

  /**
   * Stop the notification scheduler
   */
  stop() {
    if (this.dailyJob) {
      this.dailyJob.stop();
      this.dailyJob = null;
      logger.info('Notification scheduler stopped');
    }
  }

  /**
   * Send daily reminder notifications
   */
  async sendDailyReminders() {
    if (this.isRunning) {
      logger.info('Daily reminders already running, skipping...');
      return;
    }

    try {
      this.isRunning = true;
      logger.info('Starting daily reminder notifications...');

      // Send overdue task reminders
      await this.sendOverdueTaskReminders();

      // Send inactive lead reminders
      await this.sendInactiveLeadReminders();

      // Send due tomorrow reminders
      await this.sendDueTomorrowReminders();

      logger.info('Daily reminder notifications completed');

    } catch (error) {
      logger.error('Daily reminders failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Send reminders for overdue tasks
   */
  async sendOverdueTaskReminders() {
    try {
      const query = `
        SELECT t.*, l.first_name, l.last_name, l.email, u.user_id
        FROM tasks t
        LEFT JOIN leads l ON t.lead_id = l.lead_id
        JOIN users u ON t.created_by = u.user_id OR l.assigned_to = u.user_id
        WHERE t.due_date < NOW() AND t.completed = false
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.related_type = 'task' AND n.related_id = t.task_id
          AND n.type = 'reminder' AND n.created_at > NOW() - INTERVAL '1 day'
        )
      `;

      const result = await pool.query(query);

      for (const task of result.rows) {
        const daysOverdue = Math.ceil((new Date() - new Date(task.due_date)) / (1000 * 60 * 60 * 24));

        await NotificationService.createNotification({
          user_id: task.user_id,
          title: `Overdue Task: ${task.title}`,
          message: `Task "${task.title}" was due ${daysOverdue} days ago${task.first_name ? ` for ${task.first_name} ${task.last_name}` : ''}`,
          type: 'warning',
          related_id: task.task_id,
          related_type: 'task',
          action_url: `/tasks/${task.task_id}`
        });
      }

      logger.info(`Sent ${result.rows.length} overdue task reminders`);

    } catch (error) {
      logger.error('Failed to send overdue task reminders:', error);
    }
  }

  /**
   * Send reminders for inactive leads
   */
  async sendInactiveLeadReminders() {
    try {
      const query = `
        SELECT l.*, u.user_id
        FROM leads l
        JOIN users u ON l.assigned_to = u.user_id OR l.created_by = u.user_id
        WHERE l.status NOT IN ('Closed Won', 'Closed Lost')
        AND NOT EXISTS (
          SELECT 1 FROM interactions i
          WHERE i.lead_id = l.lead_id
          AND i.interaction_date > NOW() - INTERVAL '7 days'
        )
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.related_type = 'lead' AND n.related_id = l.lead_id
          AND n.type = 'reminder' AND n.created_at > NOW() - INTERVAL '1 day'
        )
      `;

      const result = await pool.query(query);

      for (const lead of result.rows) {
        await NotificationService.createNotification({
          user_id: lead.user_id,
          title: `Follow up needed: ${lead.first_name} ${lead.last_name}`,
          message: `Lead ${lead.first_name} ${lead.last_name} has had no activity in 7+ days. Consider reaching out to maintain engagement.`,
          type: 'reminder',
          related_id: lead.lead_id,
          related_type: 'lead',
          action_url: `/leads/${lead.lead_id}`
        });
      }

      logger.info(`Sent ${result.rows.length} inactive lead reminders`);

    } catch (error) {
      logger.error('Failed to send inactive lead reminders:', error);
    }
  }

  /**
   * Send reminders for tasks due tomorrow
   */
  async sendDueTomorrowReminders() {
    try {
      const query = `
        SELECT t.*, l.first_name, l.last_name, l.email, u.user_id
        FROM tasks t
        LEFT JOIN leads l ON t.lead_id = l.lead_id
        JOIN users u ON t.created_by = u.user_id OR l.assigned_to = u.user_id
        WHERE DATE(t.due_date) = DATE(NOW() + INTERVAL '1 day')
        AND t.completed = false
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.related_type = 'task' AND n.related_id = t.task_id
          AND n.type = 'reminder' AND n.created_at > NOW() - INTERVAL '1 day'
        )
      `;

      const result = await pool.query(query);

      for (const task of result.rows) {
        await NotificationService.createNotification({
          user_id: task.user_id,
          title: `Task due tomorrow: ${task.title}`,
          message: `Don't forget: "${task.title}" is due tomorrow${task.first_name ? ` for ${task.first_name} ${task.last_name}` : ''}`,
          type: 'info',
          related_id: task.task_id,
          related_type: 'task',
          action_url: `/tasks/${task.task_id}`
        });
      }

      logger.info(`Sent ${result.rows.length} due tomorrow reminders`);

    } catch (error) {
      logger.error('Failed to send due tomorrow reminders:', error);
    }
  }

  /**
   * Send notification for lead status change
   */
  async sendLeadStatusChangeNotification(leadData) {
    try {
      const userId = leadData.assigned_to || leadData.created_by;

      if (!userId) {
        logger.warn('No user found for lead status change notification');
        return;
      }

      const statusType = leadData.status === 'Closed Won' ? 'success' :
                        leadData.status === 'Closed Lost' ? 'error' : 'info';

      const oldStatusText = leadData.old_status ? ` (was ${leadData.old_status})` : '';

      await NotificationService.createNotification({
        user_id: userId,
        title: `Lead status updated: ${leadData.first_name} ${leadData.last_name}`,
        message: `Lead ${leadData.first_name} ${leadData.last_name} status changed to ${leadData.status}${oldStatusText}`,
        type: statusType,
        related_id: leadData.lead_id,
        related_type: 'lead',
        action_url: `/leads/${leadData.lead_id}`
      });

      logger.info(`Sent lead status change notification for lead ${leadData.lead_id}`);

    } catch (error) {
      logger.error('Failed to send lead status change notification:', error);
    }
  }

  /**
   * Send notification for task completion
   */
  async sendTaskCompletionNotification(taskData) {
    try {
      if (!taskData.created_by) {
        logger.warn('No creator found for task completion notification');
        return;
      }

      // Get lead name if task is associated with a lead
      let leadName = '';
      if (taskData.lead_id) {
        const leadQuery = await pool.query(
          'SELECT first_name, last_name FROM leads WHERE lead_id = $1',
          [taskData.lead_id]
        );
        if (leadQuery.rows.length > 0) {
          const lead = leadQuery.rows[0];
          leadName = ` for ${lead.first_name} ${lead.last_name}`;
        }
      }

      await NotificationService.createNotification({
        user_id: taskData.created_by,
        title: `Task completed: ${taskData.title}`,
        message: `Great job! You completed "${taskData.title}"${leadName}`,
        type: 'success',
        related_id: taskData.task_id,
        related_type: 'task',
        action_url: `/tasks/${taskData.task_id}`
      });

      logger.info(`Sent task completion notification for task ${taskData.task_id}`);

    } catch (error) {
      logger.error('Failed to send task completion notification:', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isScheduled: this.dailyJob !== null,
      nextRun: this.dailyJob ? this.dailyJob.nextDates() : null
    };
  }
}

module.exports = new NotificationScheduler();