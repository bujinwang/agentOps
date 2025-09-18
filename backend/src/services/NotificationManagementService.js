const { logger } = require('../config/logger');
const { sendResponse, sendError } = require('../utils/responseFormatter');

/**
 * Notification Management Service - Extracted from n8n notifications workflow
 * Handles user notifications with CRUD operations
 */
class NotificationManagementService {
  constructor() {
    this.db = require('../config/database');
  }

  /**
   * Get notifications for a user
   * @param {number} userId - User ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Notifications data
   */
  async getNotifications(userId, filters = {}) {
    try {
      const { limit = 50, type, read } = filters;

      logger.info('Getting notifications', { userId, filters });

      // Build query with filters
      let whereClause = 'user_id = $1';
      const params = [userId];
      let paramIndex = 2;

      if (type) {
        whereClause += ` AND type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }

      if (read !== undefined) {
        whereClause += ` AND read = $${paramIndex}`;
        params.push(read);
        paramIndex++;
      }

      const query = `
        SELECT
          notification_id,
          user_id,
          title,
          message,
          type,
          related_id,
          related_type,
          action_url,
          read,
          created_at,
          updated_at
        FROM notifications
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex}
      `;

      params.push(limit);

      const result = await this.db.query(query, params);

      const notifications = result.rows.map(notification => ({
        id: notification.notification_id,
        userId: notification.user_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        relatedId: notification.related_id,
        relatedType: notification.related_type,
        actionUrl: notification.action_url,
        read: notification.read,
        createdAt: notification.created_at,
        updatedAt: notification.updated_at
      }));

      logger.info('Notifications retrieved', {
        userId,
        count: notifications.length,
        filters
      });

      return {
        success: true,
        notifications,
        count: notifications.length
      };

    } catch (error) {
      logger.error('Error getting notifications', {
        userId,
        filters,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to get notifications: ${error.message}`);
    }
  }

  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Created notification
   */
  async createNotification(notificationData) {
    try {
      const {
        userId,
        title,
        message,
        type = 'info',
        relatedId,
        relatedType,
        actionUrl
      } = notificationData;

      if (!userId || !title || !message) {
        throw new Error('User ID, title, and message are required');
      }

      logger.info('Creating notification', {
        userId,
        title,
        type,
        relatedType,
        relatedId
      });

      const query = `
        INSERT INTO notifications
        (user_id, title, message, type, related_id, related_type, action_url, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING notification_id, created_at
      `;

      const params = [
        userId,
        title,
        message,
        type,
        relatedId || null,
        relatedType || null,
        actionUrl || null
      ];

      const result = await this.db.query(query, params);

      const notification = {
        id: result.rows[0].notification_id,
        userId,
        title,
        message,
        type,
        relatedId,
        relatedType,
        actionUrl,
        read: false,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].created_at
      };

      logger.info('Notification created', {
        notificationId: notification.id,
        userId,
        type
      });

      return {
        success: true,
        notification
      };

    } catch (error) {
      logger.error('Error creating notification', {
        notificationData,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to create notification: ${error.message}`);
    }
  }

  /**
   * Mark notification as read
   * @param {number} notificationId - Notification ID
   * @param {number} userId - User ID (for security)
   * @returns {Promise<Object>} Update result
   */
  async markAsRead(notificationId, userId) {
    try {
      logger.info('Marking notification as read', {
        notificationId,
        userId
      });

      const query = `
        UPDATE notifications
        SET read = true, updated_at = NOW()
        WHERE notification_id = $1 AND user_id = $2
        RETURNING notification_id, read, updated_at
      `;

      const result = await this.db.query(query, [notificationId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Notification not found or access denied');
      }

      const updatedNotification = {
        id: result.rows[0].notification_id,
        read: result.rows[0].read,
        updatedAt: result.rows[0].updated_at
      };

      logger.info('Notification marked as read', {
        notificationId,
        userId
      });

      return {
        success: true,
        notification: updatedNotification
      };

    } catch (error) {
      logger.error('Error marking notification as read', {
        notificationId,
        userId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  async markAllAsRead(userId) {
    try {
      logger.info('Marking all notifications as read', { userId });

      const query = `
        UPDATE notifications
        SET read = true, updated_at = NOW()
        WHERE user_id = $1 AND read = false
        RETURNING COUNT(*) as updated_count
      `;

      const result = await this.db.query(query, [userId]);
      const updatedCount = parseInt(result.rows[0].updated_count);

      logger.info('All notifications marked as read', {
        userId,
        updatedCount
      });

      return {
        success: true,
        updatedCount,
        message: `${updatedCount} notifications marked as read`
      };

    } catch (error) {
      logger.error('Error marking all notifications as read', {
        userId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }
  }

  /**
   * Delete a notification
   * @param {number} notificationId - Notification ID
   * @param {number} userId - User ID (for security)
   * @returns {Promise<Object>} Delete result
   */
  async deleteNotification(notificationId, userId) {
    try {
      logger.info('Deleting notification', {
        notificationId,
        userId
      });

      const query = `
        DELETE FROM notifications
        WHERE notification_id = $1 AND user_id = $2
        RETURNING notification_id
      `;

      const result = await this.db.query(query, [notificationId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Notification not found or access denied');
      }

      logger.info('Notification deleted', {
        notificationId,
        userId
      });

      return {
        success: true,
        notificationId: result.rows[0].notification_id,
        deleted: true
      };

    } catch (error) {
      logger.error('Error deleting notification', {
        notificationId,
        userId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
  }

  /**
   * Get notification statistics for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Notification stats
   */
  async getNotificationStats(userId) {
    try {
      logger.info('Getting notification stats', { userId });

      const query = `
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN read = false THEN 1 END) as unread,
          COUNT(CASE WHEN type = 'info' THEN 1 END) as info_count,
          COUNT(CASE WHEN type = 'warning' THEN 1 END) as warning_count,
          COUNT(CASE WHEN type = 'success' THEN 1 END) as success_count,
          COUNT(CASE WHEN type = 'error' THEN 1 END) as error_count,
          MAX(created_at) as last_notification_date,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24_hours,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30_days
        FROM notifications
        WHERE user_id = $1
      `;

      const result = await this.db.query(query, [userId]);
      const stats = result.rows[0];

      const notificationStats = {
        total: parseInt(stats.total) || 0,
        unread: parseInt(stats.unread) || 0,
        byType: {
          info: parseInt(stats.info_count) || 0,
          warning: parseInt(stats.warning_count) || 0,
          success: parseInt(stats.success_count) || 0,
          error: parseInt(stats.error_count) || 0
        },
        recentActivity: {
          last24Hours: parseInt(stats.last_24_hours) || 0,
          last7Days: parseInt(stats.last_7_days) || 0,
          last30Days: parseInt(stats.last_30_days) || 0
        },
        lastNotificationDate: stats.last_notification_date,
        readRate: parseInt(stats.total) > 0
          ? Math.round(((parseInt(stats.total) - parseInt(stats.unread)) / parseInt(stats.total)) * 100)
          : 0
      };

      logger.info('Notification stats retrieved', {
        userId,
        total: notificationStats.total,
        unread: notificationStats.unread,
        readRate: notificationStats.readRate
      });

      return {
        success: true,
        stats: notificationStats
      };

    } catch (error) {
      logger.error('Error getting notification stats', {
        userId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to get notification stats: ${error.message}`);
    }
  }

  /**
   * Get unread notification count for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Unread count
   */
  async getUnreadCount(userId) {
    try {
      const query = `
        SELECT COUNT(*) as unread_count
        FROM notifications
        WHERE user_id = $1 AND read = false
      `;

      const result = await this.db.query(query, [userId]);
      const unreadCount = parseInt(result.rows[0].unread_count) || 0;

      return {
        success: true,
        unreadCount
      };

    } catch (error) {
      logger.error('Error getting unread count', {
        userId,
        error: error.message
      });
      throw new Error(`Failed to get unread count: ${error.message}`);
    }
  }

  /**
   * Bulk create notifications
   * @param {Array} notifications - Array of notification objects
   * @returns {Promise<Object>} Bulk creation result
   */
  async bulkCreateNotifications(notifications) {
    try {
      if (!Array.isArray(notifications) || notifications.length === 0) {
        throw new Error('Notifications array is required');
      }

      logger.info('Bulk creating notifications', {
        count: notifications.length
      });

      const values = [];
      const params = [];
      let paramIndex = 1;

      notifications.forEach(notification => {
        const {
          userId,
          title,
          message,
          type = 'info',
          relatedId,
          relatedType,
          actionUrl
        } = notification;

        values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, NOW())`);
        params.push(
          userId,
          title,
          message,
          type,
          relatedId || null,
          relatedType || null,
          actionUrl || null
        );
        paramIndex += 7;
      });

      const query = `
        INSERT INTO notifications
        (user_id, title, message, type, related_id, related_type, action_url, created_at)
        VALUES ${values.join(', ')}
        RETURNING notification_id
      `;

      const result = await this.db.query(query, params);
      const createdIds = result.rows.map(row => row.notification_id);

      logger.info('Bulk notifications created', {
        requested: notifications.length,
        created: createdIds.length
      });

      return {
        success: true,
        createdCount: createdIds.length,
        notificationIds: createdIds
      };

    } catch (error) {
      logger.error('Error bulk creating notifications', {
        count: notifications?.length,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to bulk create notifications: ${error.message}`);
    }
  }
}

module.exports = new NotificationManagementService();