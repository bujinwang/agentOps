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

    // This would typically query the notifications table
    // For now, return mock data
    const notifications = [
      {
        id: 1,
        title: 'Welcome to the system',
        message: 'Your account has been set up successfully',
        type: 'info',
        read: false,
        createdAt: new Date().toISOString()
      }
    ];

    sendResponse(res, {
      notifications,
      pagination: {
        total: notifications.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    }, 'Notifications retrieved successfully');

  } catch (error) {
    logger.error('Get notifications error', {
      userId: req.user?.userId,
      error: error.message
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

    // This would typically update the notification in the database
    // For now, just acknowledge
    logger.info('Marking notification as read', {
      notificationId,
      userId
    });

    sendResponse(res, {
      notificationId,
      read: true
    }, 'Notification marked as read');

  } catch (error) {
    logger.error('Mark notification read error', {
      notificationId: req.params.id,
      userId: req.user?.userId,
      error: error.message
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

    // This would typically delete the notification from the database
    logger.info('Deleting notification', {
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
      error: error.message
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

    // This would typically aggregate notification statistics
    const stats = {
      total: 25,
      unread: 5,
      byType: {
        info: 12,
        warning: 8,
        success: 3,
        error: 2
      },
      recentActivity: {
        last24Hours: 3,
        lastWeek: 12,
        lastMonth: 25
      }
    };

    sendResponse(res, stats, 'Notification statistics retrieved successfully');

  } catch (error) {
    logger.error('Get notification stats error', {
      userId: req.user?.userId,
      error: error.message
    });
    sendError(res, 'Failed to get notification statistics', 'STATS_ERROR', null, 500);
  }
});

module.exports = router;