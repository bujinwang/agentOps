const express = require('express');
const { query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { ERROR_MESSAGES, NOTIFICATION_TYPES } = require('../config/constants');
const { logger } = require('../config/logger');
const { getDatabase } = require('../config/database');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please check your input',
      details: errors.array()
    });
  }
  next();
};

// Get notifications with filtering
router.get('/', authenticate, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('read').optional().isBoolean().withMessage('Read filter must be a boolean'),
  query('type').optional().isIn(Object.values(NOTIFICATION_TYPES)).withMessage('Invalid notification type'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      read: req.query.read !== undefined ? req.query.read === 'true' : undefined,
      type: req.query.type
    };

    const db = getDatabase();

    let whereConditions = ['user_id = $1'];
    let queryParams = [userId];
    let paramIndex = 1;

    if (filters.read !== undefined) {
      paramIndex++;
      whereConditions.push(`is_read = $${paramIndex}`);
      queryParams.push(filters.read);
    }

    if (filters.type) {
      paramIndex++;
      whereConditions.push(`type = $${paramIndex}`);
      queryParams.push(filters.type);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const notificationsQuery = `
      SELECT 
        notification_id,
        title,
        message,
        type,
        is_read,
        created_at,
        updated_at,
        related_id,
        related_type,
        action_url
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;

    const offset = (filters.page - 1) * filters.limit;
    queryParams.push(filters.limit, offset);

    const countQuery = `SELECT COUNT(*) as total FROM notifications ${whereClause}`;
    const countParams = queryParams.slice(0, paramIndex);

    const [notificationsResult, countResult] = await Promise.all([
      db.query(notificationsQuery, queryParams),
      db.query(countQuery, countParams)
    ]);

    const totalItems = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalItems / filters.limit);

    const notifications = notificationsResult.rows.map(row => ({
      id: row.notification_id,
      title: row.title,
      message: row.message,
      type: row.type,
      read: row.is_read,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      relatedId: row.related_id,
      relatedType: row.related_type,
      actionUrl: row.action_url
    }));

    // Count unread notifications
    const unreadCountQuery = `SELECT COUNT(*) as unread FROM notifications ${whereClause.replace('is_read', 'is_read = false')}`;
    const unreadResult = await db.query(unreadCountQuery, countParams);
    const unreadCount = parseInt(unreadResult.rows[0].unread);

    res.json({
      message: 'Notifications retrieved successfully',
      data: notifications,
      total: totalItems,
      unread: unreadCount,
      pagination: {
        currentPage: filters.page,
        totalPages: totalPages,
        totalItems: totalItems,
        limit: filters.limit,
        hasNext: filters.page < totalPages,
        hasPrev: filters.page > 1
      }
    });
  } catch (error) {
    logger.error('Error getting notifications:', error);
    res.status(500).json({
      error: 'Failed to get notifications',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.user_id;

    if (isNaN(notificationId)) {
      return res.status(400).json({
        error: 'Invalid notification ID',
        message: 'Notification ID must be a number'
      });
    }

    const db = getDatabase();
    
    const updateQuery = `
      UPDATE notifications
      SET is_read = true, updated_at = NOW()
      WHERE notification_id = $1 AND user_id = $2
      RETURNING notification_id
    `;

    const result = await db.query(updateQuery, [notificationId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Notification not found',
        message: 'Notification not found or access denied'
      });
    }

    logger.info(`Notification marked as read: ${notificationId} by user ${userId}`);

    res.json({
      message: 'Notification marked as read successfully'
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({
      error: 'Failed to mark notification as read',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', authenticate, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const db = getDatabase();
    
    const updateQuery = `
      UPDATE notifications
      SET is_read = true, updated_at = NOW()
      WHERE user_id = $1 AND is_read = false
    `;

    const result = await db.query(updateQuery, [userId]);
    
    logger.info(`All notifications marked as read for user ${userId}`);

    res.json({
      message: 'All notifications marked as read successfully',
      updatedCount: result.rowCount
    });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({
      error: 'Failed to mark all notifications as read',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Create a new notification (for internal use or admin)
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { title, message, type, relatedId, relatedType, actionUrl } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Title and message are required'
      });
    }

    const db = getDatabase();
    
    const insertQuery = `
      INSERT INTO notifications (
        user_id, title, message, type, related_id, related_type, action_url, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      userId, title, message, type || 'info', 
      relatedId || null, relatedType || null, actionUrl || null
    ];

    const result = await db.query(insertQuery, values);
    
    if (result.rows.length === 0) {
      return res.status(500).json({
        error: 'Failed to create notification',
        message: 'Unable to create notification'
      });
    }

    const notification = result.rows[0];
    
    logger.info(`Notification created: ${title} for user ${userId}`);

    res.status(201).json({
      message: 'Notification created successfully',
      data: {
        id: notification.notification_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: notification.is_read,
        createdAt: notification.created_at,
        relatedId: notification.related_id,
        relatedType: notification.related_type,
        actionUrl: notification.action_url
      }
    });
  } catch (error) {
    logger.error('Error creating notification:', error);
    res.status(500).json({
      error: 'Failed to create notification',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

module.exports = router;