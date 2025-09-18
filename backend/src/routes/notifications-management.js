const express = require('express');
const { extractUserFromToken } = require('../middleware/jwtExtractor');
const NotificationManagementService = require('../services/NotificationManagementService');
const { logger } = require('../config/logger');
const { sendResponse, sendError } = require('../utils/responseFormatter');

const router = express.Router();

// All routes require authentication
router.use(extractUserFromToken);

/**
 * GET /api/notifications-management
 * Get notifications for the authenticated user
 * Replaces n8n notifications workflow
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const filters = {
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      type: req.query.type,
      read: req.query.read ? req.query.read === 'true' : undefined
    };

    logger.info('Get notifications request', {
      userId,
      filters
    });

    const result = await NotificationManagementService.getNotifications(userId, filters);

    if (result.success) {
      sendResponse(res, {
        notifications: result.notifications,
        count: result.count
      }, 'Notifications retrieved successfully');
    } else {
      sendError(res, 'Failed to get notifications', 'GET_NOTIFICATIONS_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Get notifications error', {
      userId: req.user?.userId,
      filters: req.query,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get notifications', 'GET_NOTIFICATIONS_ERROR', null, 500);
  }
});

/**
 * POST /api/notifications-management
 * Create a new notification
 * Replaces n8n notifications workflow
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const notificationData = {
      userId,
      ...req.body
    };

    logger.info('Create notification request', {
      userId,
      title: notificationData.title,
      type: notificationData.type
    });

    const result = await NotificationManagementService.createNotification(notificationData);

    if (result.success) {
      sendResponse(res, result.notification, 'Notification created successfully', 201);
    } else {
      sendError(res, 'Failed to create notification', 'CREATE_NOTIFICATION_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Create notification error', {
      userId: req.user?.userId,
      notificationData: req.body,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to create notification', 'CREATE_NOTIFICATION_ERROR', null, 500);
  }
});

/**
 * PUT /api/notifications-management/:id/read
 * Mark a notification as read
 * Replaces n8n notifications workflow
 */
router.put('/:id/read', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.userId;

    logger.info('Mark notification read request', {
      notificationId,
      userId
    });

    const result = await NotificationManagementService.markAsRead(notificationId, userId);

    if (result.success) {
      sendResponse(res, result.notification, 'Notification marked as read successfully');
    } else {
      sendError(res, 'Failed to mark notification as read', 'MARK_READ_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Mark notification read error', {
      notificationId: req.params.id,
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to mark notification as read', 'MARK_READ_ERROR', null, 500);
  }
});

/**
 * PUT /api/notifications-management/mark-all-read
 * Mark all notifications as read for the authenticated user
 * Replaces n8n notifications workflow
 */
router.put('/mark-all-read', async (req, res) => {
  try {
    const userId = req.user.userId;

    logger.info('Mark all notifications read request', { userId });

    const result = await NotificationManagementService.markAllAsRead(userId);

    if (result.success) {
      sendResponse(res, {
        updatedCount: result.updatedCount,
        message: result.message
      }, 'All notifications marked as read successfully');
    } else {
      sendError(res, 'Failed to mark all notifications as read', 'MARK_ALL_READ_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Mark all notifications read error', {
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to mark all notifications as read', 'MARK_ALL_READ_ERROR', null, 500);
  }
});

/**
 * DELETE /api/notifications-management/:id
 * Delete a notification
 */
router.delete('/:id', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.userId;

    logger.info('Delete notification request', {
      notificationId,
      userId
    });

    const result = await NotificationManagementService.deleteNotification(notificationId, userId);

    if (result.success) {
      sendResponse(res, {
        notificationId: result.notificationId,
        deleted: result.deleted
      }, 'Notification deleted successfully');
    } else {
      sendError(res, 'Failed to delete notification', 'DELETE_NOTIFICATION_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Delete notification error', {
      notificationId: req.params.id,
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to delete notification', 'DELETE_NOTIFICATION_ERROR', null, 500);
  }
});

/**
 * GET /api/notifications-management/stats
 * Get notification statistics for the authenticated user
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.userId;

    logger.info('Get notification stats request', { userId });

    const result = await NotificationManagementService.getNotificationStats(userId);

    if (result.success) {
      sendResponse(res, result.stats, 'Notification statistics retrieved successfully');
    } else {
      sendError(res, 'Failed to get notification statistics', 'STATS_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Get notification stats error', {
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get notification statistics', 'STATS_ERROR', null, 500);
  }
});

/**
 * GET /api/notifications-management/unread-count
 * Get unread notification count for the authenticated user
 */
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await NotificationManagementService.getUnreadCount(userId);

    if (result.success) {
      sendResponse(res, {
        unreadCount: result.unreadCount
      }, 'Unread count retrieved successfully');
    } else {
      sendError(res, 'Failed to get unread count', 'UNREAD_COUNT_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Get unread count error', {
      userId: req.user?.userId,
      error: error.message
    });
    sendError(res, 'Failed to get unread count', 'UNREAD_COUNT_ERROR', null, 500);
  }
});

/**
 * POST /api/notifications-management/bulk
 * Bulk create notifications
 */
router.post('/bulk', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notifications } = req.body;

    if (!Array.isArray(notifications)) {
      return sendError(res, 'Notifications must be an array', 'VALIDATION_ERROR', null, 400);
    }

    // Add userId to each notification
    const notificationsWithUserId = notifications.map(notification => ({
      userId,
      ...notification
    }));

    logger.info('Bulk create notifications request', {
      userId,
      count: notifications.length
    });

    const result = await NotificationManagementService.bulkCreateNotifications(notificationsWithUserId);

    if (result.success) {
      sendResponse(res, {
        createdCount: result.createdCount,
        notificationIds: result.notificationIds
      }, 'Notifications created successfully', 201);
    } else {
      sendError(res, 'Failed to create notifications', 'BULK_CREATE_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Bulk create notifications error', {
      userId: req.user?.userId,
      count: req.body?.notifications?.length,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to create notifications', 'BULK_CREATE_ERROR', null, 500);
  }
});

/**
 * GET /api/notifications-management/types
 * Get available notification types
 */
router.get('/types', async (req, res) => {
  try {
    const notificationTypes = [
      {
        type: 'info',
        description: 'General information notifications',
        icon: 'ℹ️'
      },
      {
        type: 'warning',
        description: 'Warning or caution notifications',
        icon: '⚠️'
      },
      {
        type: 'success',
        description: 'Success or completion notifications',
        icon: '✅'
      },
      {
        type: 'error',
        description: 'Error or failure notifications',
        icon: '❌'
      }
    ];

    sendResponse(res, {
      types: notificationTypes
    }, 'Notification types retrieved successfully');

  } catch (error) {
    logger.error('Get notification types error', {
      error: error.message
    });
    sendError(res, 'Failed to get notification types', 'TYPES_ERROR', null, 500);
  }
});

module.exports = router;