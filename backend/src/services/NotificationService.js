const { logger } = require('../config/logger');
const { sendResponse, sendError } = require('../utils/responseFormatter');

/**
 * Notification Service - Extracted from n8n notification triggers workflow
 * Handles complex notification creation and scheduling
 */
class NotificationService {
  constructor() {
    this.db = require('../config/database');
  }

  /**
   * Create notifications for overdue tasks
   * Extracted from daily reminder cron job
   */
  async createOverdueNotifications() {
    try {
      logger.info('Starting overdue task notifications creation');

      // Complex query extracted from n8n workflow
      const overdueQuery = `
        SELECT t.*, l.first_name, l.last_name, l.email, u.user_id
        FROM tasks t
        LEFT JOIN leads l ON t.lead_id = l.lead_id
        JOIN users u ON t.created_by = u.user_id OR l.assigned_to = u.user_id
        WHERE t.due_date < NOW()
        AND t.completed = false
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.related_type = 'task'
          AND n.related_id = t.task_id
          AND n.type = 'reminder'
          AND n.created_at > NOW() - INTERVAL '1 day'
        )
      `;

      const overdueTasks = await this.db.query(overdueQuery);
      const notifications = [];

      for (const task of overdueTasks.rows) {
        const daysOverdue = Math.ceil(
          (new Date() - new Date(task.due_date)) / (1000 * 60 * 60 * 24)
        );

        const notification = {
          user_id: task.user_id,
          title: `Overdue Task: ${task.title}`,
          message: `Task "${task.title}" was due ${daysOverdue} days ago${
            task.first_name ? ` for ${task.first_name} ${task.last_name}` : ''
          }`,
          type: 'warning',
          related_id: task.task_id,
          related_type: 'task',
          action_url: `/tasks/${task.task_id}`,
          created_at: new Date().toISOString()
        };

        notifications.push(notification);
      }

      // Batch insert notifications
      if (notifications.length > 0) {
        await this.batchCreateNotifications(notifications);
        logger.info(`Created ${notifications.length} overdue task notifications`);
      }

      return {
        success: true,
        notificationsCreated: notifications.length,
        type: 'overdue_tasks'
      };

    } catch (error) {
      logger.error('Error creating overdue notifications', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to create overdue notifications: ${error.message}`);
    }
  }

  /**
   * Create notifications for inactive leads
   * Extracted from daily reminder cron job
   */
  async createInactiveLeadNotifications() {
    try {
      logger.info('Starting inactive lead notifications creation');

      // Complex query extracted from n8n workflow
      const inactiveQuery = `
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
          WHERE n.related_type = 'lead'
          AND n.related_id = l.lead_id
          AND n.type = 'reminder'
          AND n.created_at > NOW() - INTERVAL '1 day'
        )
      `;

      const inactiveLeads = await this.db.query(inactiveQuery);
      const notifications = [];

      for (const lead of inactiveLeads.rows) {
        const notification = {
          user_id: lead.user_id,
          title: `Follow up needed: ${lead.first_name} ${lead.last_name}`,
          message: `Lead ${lead.first_name} ${lead.last_name} has had no activity in 7+ days. Consider reaching out to maintain engagement.`,
          type: 'reminder',
          related_id: lead.lead_id,
          related_type: 'lead',
          action_url: `/leads/${lead.lead_id}`,
          created_at: new Date().toISOString()
        };

        notifications.push(notification);
      }

      // Batch insert notifications
      if (notifications.length > 0) {
        await this.batchCreateNotifications(notifications);
        logger.info(`Created ${notifications.length} inactive lead notifications`);
      }

      return {
        success: true,
        notificationsCreated: notifications.length,
        type: 'inactive_leads'
      };

    } catch (error) {
      logger.error('Error creating inactive lead notifications', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to create inactive lead notifications: ${error.message}`);
    }
  }

  /**
   * Create notifications for tasks due tomorrow
   * Extracted from daily reminder cron job
   */
  async createDueTomorrowNotifications() {
    try {
      logger.info('Starting due tomorrow notifications creation');

      // Complex query extracted from n8n workflow
      const dueTomorrowQuery = `
        SELECT t.*, l.first_name, l.last_name, l.email, u.user_id
        FROM tasks t
        LEFT JOIN leads l ON t.lead_id = l.lead_id
        JOIN users u ON t.created_by = u.user_id OR l.assigned_to = u.user_id
        WHERE DATE(t.due_date) = DATE(NOW() + INTERVAL '1 day')
        AND t.completed = false
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.related_type = 'task'
          AND n.related_id = t.task_id
          AND n.type = 'reminder'
          AND n.created_at > NOW() - INTERVAL '1 day'
        )
      `;

      const dueTomorrowTasks = await this.db.query(dueTomorrowQuery);
      const notifications = [];

      for (const task of dueTomorrowTasks.rows) {
        const notification = {
          user_id: task.user_id,
          title: `Task due tomorrow: ${task.title}`,
          message: `Don't forget: "${task.title}" is due tomorrow${
            task.first_name ? ` for ${task.first_name} ${task.last_name}` : ''
          }`,
          type: 'info',
          related_id: task.task_id,
          related_type: 'task',
          action_url: `/tasks/${task.task_id}`,
          created_at: new Date().toISOString()
        };

        notifications.push(notification);
      }

      // Batch insert notifications
      if (notifications.length > 0) {
        await this.batchCreateNotifications(notifications);
        logger.info(`Created ${notifications.length} due tomorrow notifications`);
      }

      return {
        success: true,
        notificationsCreated: notifications.length,
        type: 'due_tomorrow'
      };

    } catch (error) {
      logger.error('Error creating due tomorrow notifications', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to create due tomorrow notifications: ${error.message}`);
    }
  }

  /**
   * Create notification for lead status change
   * Extracted from webhook trigger
   */
  async createStatusChangeNotification(leadId, oldStatus, newStatus, userId) {
    try {
      logger.info('Creating status change notification', {
        leadId,
        oldStatus,
        newStatus,
        userId
      });

      // Get lead details
      const leadQuery = await this.db.query(
        'SELECT first_name, last_name FROM leads WHERE lead_id = $1',
        [leadId]
      );

      if (leadQuery.rows.length === 0) {
        throw new Error('Lead not found');
      }

      const lead = leadQuery.rows[0];

      // Determine notification type based on status
      let notificationType = 'info';
      if (newStatus === 'Closed Won') {
        notificationType = 'success';
      } else if (newStatus === 'Closed Lost') {
        notificationType = 'error';
      }

      const notification = {
        user_id: userId,
        title: `Lead status updated: ${lead.first_name} ${lead.last_name}`,
        message: `Lead ${lead.first_name} ${lead.last_name} status changed to ${newStatus}${
          oldStatus ? ` (was ${oldStatus})` : ''
        }`,
        type: notificationType,
        related_id: leadId,
        related_type: 'lead',
        action_url: `/leads/${leadId}`,
        created_at: new Date().toISOString()
      };

      await this.createNotification(notification);

      logger.info('Status change notification created', {
        leadId,
        notificationId: notification.id
      });

      return {
        success: true,
        type: 'status_change'
      };

    } catch (error) {
      logger.error('Error creating status change notification', {
        leadId,
        oldStatus,
        newStatus,
        userId,
        error: error.message
      });
      throw new Error(`Failed to create status change notification: ${error.message}`);
    }
  }

  /**
   * Create notification for task completion
   * Extracted from webhook trigger
   */
  async createTaskCompletionNotification(taskId, userId) {
    try {
      logger.info('Creating task completion notification', {
        taskId,
        userId
      });

      // Get task and lead details
      const taskQuery = await this.db.query(`
        SELECT t.title, l.first_name, l.last_name
        FROM tasks t
        LEFT JOIN leads l ON t.lead_id = l.lead_id
        WHERE t.task_id = $1
      `, [taskId]);

      if (taskQuery.rows.length === 0) {
        throw new Error('Task not found');
      }

      const task = taskQuery.rows[0];

      const notification = {
        user_id: userId,
        title: `Task completed: ${task.title}`,
        message: `Great job! You completed "${task.title}"${
          task.first_name ? ` for ${task.first_name} ${task.last_name}` : ''
        }`,
        type: 'success',
        related_id: taskId,
        related_type: 'task',
        action_url: `/tasks/${taskId}`,
        created_at: new Date().toISOString()
      };

      await this.createNotification(notification);

      logger.info('Task completion notification created', {
        taskId,
        notificationId: notification.id
      });

      return {
        success: true,
        type: 'task_completion'
      };

    } catch (error) {
      logger.error('Error creating task completion notification', {
        taskId,
        userId,
        error: error.message
      });
      throw new Error(`Failed to create task completion notification: ${error.message}`);
    }
  }

  /**
   * Batch create multiple notifications
   * @param {Array} notifications - Array of notification objects
   */
  async batchCreateNotifications(notifications) {
    try {
      if (!notifications || notifications.length === 0) {
        return { success: true, count: 0 };
      }

      const values = notifications.map((_, index) =>
        `($${index * 8 + 1}, $${index * 8 + 2}, $${index * 8 + 3}, $${index * 8 + 4}, $${index * 8 + 5}, $${index * 8 + 6}, $${index * 8 + 7}, $${index * 8 + 8})`
      ).join(', ');

      const params = notifications.flatMap(notification => [
        notification.user_id,
        notification.title,
        notification.message,
        notification.type,
        notification.related_id,
        notification.related_type,
        notification.action_url,
        notification.created_at
      ]);

      const query = `
        INSERT INTO notifications
        (user_id, title, message, type, related_id, related_type, action_url, created_at)
        VALUES ${values}
      `;

      await this.db.query(query, params);

      logger.info(`Batch created ${notifications.length} notifications`);

      return {
        success: true,
        count: notifications.length
      };

    } catch (error) {
      logger.error('Error batch creating notifications', {
        count: notifications.length,
        error: error.message
      });
      throw new Error(`Failed to batch create notifications: ${error.message}`);
    }
  }

  /**
   * Create a single notification
   * @param {Object} notification - Notification object
   */
  async createNotification(notification) {
    try {
      const query = `
        INSERT INTO notifications
        (user_id, title, message, type, related_id, related_type, action_url, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING notification_id
      `;

      const params = [
        notification.user_id,
        notification.title,
        notification.message,
        notification.type,
        notification.related_id,
        notification.related_type,
        notification.action_url,
        notification.created_at
      ];

      const result = await this.db.query(query, params);

      return {
        success: true,
        id: result.rows[0].notification_id
      };

    } catch (error) {
      logger.error('Error creating notification', {
        notification,
        error: error.message
      });
      throw new Error(`Failed to create notification: ${error.message}`);
    }
  }

  /**
   * Run all daily notification jobs
   * Replacement for n8n cron trigger
   */
  async runDailyNotifications() {
    try {
      logger.info('Starting daily notification job');

      const results = await Promise.allSettled([
        this.createOverdueNotifications(),
        this.createInactiveLeadNotifications(),
        this.createDueTomorrowNotifications()
      ]);

      const summary = {
        overdue: results[0].status === 'fulfilled' ? results[0].value : { error: results[0].reason },
        inactive: results[1].status === 'fulfilled' ? results[1].value : { error: results[1].reason },
        dueTomorrow: results[2].status === 'fulfilled' ? results[2].value : { error: results[2].reason }
      };

      logger.info('Daily notification job completed', summary);

      return {
        success: true,
        summary,
        totalNotifications: Object.values(summary).reduce((sum, result) => {
          return sum + (result.notificationsCreated || 0);
        }, 0)
      };

    } catch (error) {
      logger.error('Error running daily notifications', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Daily notifications failed: ${error.message}`);
    }
  }
}

module.exports = new NotificationService();