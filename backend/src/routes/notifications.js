const express = require('express');
const { extractUserFromToken } = require('../middleware/jwtExtractor');
const NotificationService = require('../services/NotificationService');
const { logger } = require('../config/logger');
const { sendResponse, sendError } = require('../utils/responseFormatter');

const router = express.Router();

// All routes require authentication
router.use(extractUserFromToken);

/**
 * POST /api/notifications/trigger/lead-status-change
 * Trigger notification for lead status change
 * Replaces n8n webhook trigger
 */
router.post('/trigger/lead-status-change', async (req, res) => {
  try {
    const { leadId, oldStatus, newStatus } = req.body;

    if (!leadId) {
      return sendError(res, 'Lead ID is required', 'VALIDATION_ERROR', null, 400);
    }

    logger.info('Lead status change notification trigger', {
      leadId,
      oldStatus,
      newStatus,
      userId: req.user.userId
    });

    const result = await NotificationService.createStatusChangeNotification(
      leadId,
      oldStatus,
      newStatus,
      req.user.userId
    );

    if (result.success) {
      sendResponse(res, result, 'Status change notification created successfully');
    } else {
      sendError(res, 'Failed to create status change notification', 'NOTIFICATION_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Lead status change notification error', {
      leadId: req.body.leadId,
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to create status change notification', 'NOTIFICATION_ERROR', null, 500);
  }
});

/**
 * POST /api/notifications/trigger/task-completed
 * Trigger notification for task completion
 * Replaces n8n webhook trigger
 */
router.post('/trigger/task-completed', async (req, res) => {
  try {
    const { taskId } = req.body;

    if (!taskId) {
      return sendError(res, 'Task ID is required', 'VALIDATION_ERROR', null, 400);
    }

    logger.info('Task completion notification trigger', {
      taskId,
      userId: req.user.userId
    });

    const result = await NotificationService.createTaskCompletionNotification(
      taskId,
      req.user.userId
    );

    if (result.success) {
      sendResponse(res, result, 'Task completion notification created successfully');
    } else {
      sendError(res, 'Failed to create task completion notification', 'NOTIFICATION_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Task completion notification error', {
      taskId: req.body.taskId,
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to create task completion notification', 'NOTIFICATION_ERROR', null, 500);
  }
});

/**
 * POST /api/notifications/send
 * Send a custom notification
 * Replaces n8n notification sending
 */
router.post('/send', async (req, res) => {
  try {
    const {
      type,
      title,
      message,
      priority = 'normal',
      userId,
      relatedId,
      relatedType,
      actionUrl
    } = req.body;

    // Use provided userId or current user's ID
    const targetUserId = userId || req.user.userId;

    const notification = {
      user_id: targetUserId,
      title,
      message,
      type: type || 'info',
      related_id: relatedId,
      related_type: relatedType,
      action_url: actionUrl,
      created_at: new Date().toISOString()
    };

    logger.info('Sending custom notification', {
      type,
      title,
      targetUserId,
      senderId: req.user.userId
    });

    const result = await NotificationService.createNotification(notification);

    if (result.success) {
      sendResponse(res, {
        notificationId: result.id,
        type,
        title,
        targetUserId
      }, 'Notification sent successfully');
    } else {
      sendError(res, 'Failed to send notification', 'NOTIFICATION_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Send notification error', {
      type: req.body.type,
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to send notification', 'NOTIFICATION_ERROR', null, 500);
  }
});

/**
 * GET /api/notifications
 * Get user notifications
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      limit = 50,
      offset = 0,
      type,
      read,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const { getDatabase } = require('../config/database');
    const db = getDatabase();

    // Build query conditions
    let whereConditions = ['user_id = $1'];
    let queryParams = [userId];
    let paramIndex = 2;

    if (type) {
      whereConditions.push(`type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    if (read !== undefined) {
      whereConditions.push(`read = $${paramIndex}`);
      queryParams.push(read === 'true');
      paramIndex++;
    }

    // Note: No expiration filter since expires_at column doesn't exist in current schema

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM notifications WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get notifications with pagination
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const allowedSortFields = ['created_at', 'updated_at'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';

    const notificationsQuery = `
      SELECT
        notification_id as id,
        title,
        message,
        type,
        read,
        related_id,
        related_type,
        action_url,
        created_at,
        updated_at
      FROM notifications
      WHERE ${whereClause}
      ORDER BY ${sortField} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(parseInt(limit), parseInt(offset));
    const notificationsResult = await db.query(notificationsQuery, queryParams);

    const notifications = notificationsResult.rows.map(notification => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      read: notification.read,
      relatedId: notification.related_id,
      relatedType: notification.related_type,
      actionUrl: notification.action_url,
      createdAt: notification.created_at,
      updatedAt: notification.updated_at
    }));

    sendResponse(res, {
      notifications,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    }, 'Notifications retrieved successfully');

  } catch (error) {
    logger.error('Get notifications error', {
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get notifications', 'NOTIFICATION_ERROR', null, 500);
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.userId;

    const { getDatabase } = require('../config/database');
    const db = getDatabase();

    // Update notification as read
    const updateQuery = `
      UPDATE notifications
      SET read = true, updated_at = NOW()
      WHERE notification_id = $1 AND user_id = $2
      RETURNING notification_id as id, read, updated_at
    `;

    const result = await db.query(updateQuery, [notificationId, userId]);

    if (result.rows.length === 0) {
      return sendError(res, 'Notification not found or access denied', 'NOTIFICATION_ERROR', null, 404);
    }

    const notification = result.rows[0];

    logger.info('Marked notification as read', {
      notificationId,
      userId
    });

    sendResponse(res, {
      notificationId: notification.id,
      read: notification.read,
      updatedAt: notification.updated_at
    }, 'Notification marked as read');

  } catch (error) {
    logger.error('Mark notification read error', {
      notificationId: req.params.id,
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to mark notification as read', 'NOTIFICATION_ERROR', null, 500);
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.userId;

    const { getDatabase } = require('../config/database');
    const db = getDatabase();

    // Delete notification (only if it belongs to the user)
    const deleteQuery = `
      DELETE FROM notifications
      WHERE notification_id = $1 AND user_id = $2
      RETURNING notification_id as id
    `;

    const result = await db.query(deleteQuery, [notificationId, userId]);

    if (result.rows.length === 0) {
      return sendError(res, 'Notification not found or access denied', 'NOTIFICATION_ERROR', null, 404);
    }

    logger.info('Deleted notification', {
      notificationId,
      userId
    });

    sendResponse(res, {
      notificationId,
      deleted: true
    }, 'Notification deleted successfully');

  } catch (error) {
    logger.error('Delete notification error', {
      notificationId: req.params.id,
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to delete notification', 'NOTIFICATION_ERROR', null, 500);
  }
});

/**
 * POST /api/notifications/daily-reminders
 * Manually trigger daily reminder notifications
 * Useful for testing or manual execution
 */
router.post('/daily-reminders', async (req, res) => {
  try {
    logger.info('Manual daily reminders trigger', {
      userId: req.user.userId
    });

    const result = await NotificationService.runDailyNotifications();

    if (result.success) {
      sendResponse(res, result, 'Daily reminder notifications completed successfully');
    } else {
      sendError(res, 'Failed to run daily reminders', 'NOTIFICATION_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Daily reminders trigger error', {
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to trigger daily reminders', 'NOTIFICATION_ERROR', null, 500);
  }
});

/**
 * GET /api/notifications/stats
 * Get notification statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.userId;

    const { getDatabase } = require('../config/database');
    const db = getDatabase();

    // Get total and unread counts
    const countQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE read = false) as unread,
        COUNT(*) FILTER (WHERE read = false AND created_at >= NOW() - INTERVAL '24 hours') as unread_last_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as total_last_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as total_last_week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as total_last_month
      FROM notifications
      WHERE user_id = $1
    `;

    const countResult = await db.query(countQuery, [userId]);
    const counts = countResult.rows[0];

    // Get breakdown by type
    const typeQuery = `
      SELECT
        type,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE read = false) as unread_count
      FROM notifications
      WHERE user_id = $1
      GROUP BY type
    `;

    const typeResult = await db.query(typeQuery, [userId]);
    const byType = {};
    const byTypeUnread = {};

    typeResult.rows.forEach(row => {
      byType[row.type] = parseInt(row.count);
      byTypeUnread[row.type] = parseInt(row.unread_count);
    });

    // Note: Priority breakdown not available since priority column doesn't exist in current schema
    const byPriority = {};

    const stats = {
      total: parseInt(counts.total),
      unread: parseInt(counts.unread),
      byType,
      byTypeUnread,
      byPriority,
      recentActivity: {
        last24Hours: parseInt(counts.total_last_24h),
        lastWeek: parseInt(counts.total_last_week),
        lastMonth: parseInt(counts.total_last_month),
        unreadLast24Hours: parseInt(counts.unread_last_24h)
      },
      // Additional computed metrics
      readRate: counts.total > 0 ? ((counts.total - counts.unread) / counts.total * 100).toFixed(1) : '0.0'
    };

    sendResponse(res, stats, 'Notification statistics retrieved successfully');

  } catch (error) {
    logger.error('Get notification stats error', {
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get notification statistics', 'STATS_ERROR', null, 500);
  }
});

module.exports = router;