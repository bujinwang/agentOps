const express = require('express');
const { query, validationResult } = require('express-validator');
const Lead = require('../models/Lead');
const Task = require('../models/Task');
const { authenticate } = require('../middleware/auth');
const { ERROR_MESSAGES, LEAD_STATUS, LEAD_PRIORITY, TASK_PRIORITY } = require('../config/constants');
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

// Search leads
router.get('/leads', authenticate, [
  query('q').trim().notEmpty().withMessage('Search query is required'),
  query('status').optional().isIn(Object.values(LEAD_STATUS)).withMessage('Invalid status filter'),
  query('priority').optional().isIn(Object.values(LEAD_PRIORITY)).withMessage('Invalid priority filter'),
  query('source').optional().isLength({ max: 100 }).withMessage('Source filter too long'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const searchQuery = req.query.q;
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      source: req.query.source,
      limit: parseInt(req.query.limit) || 50
    };

    const db = getDatabase();
    
    // Build search conditions
    let whereConditions = ['user_id = $1'];
    let queryParams = [userId];
    let paramIndex = 1;

    // Add search condition
    paramIndex++;
    whereConditions.push(`(first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
    queryParams.push(`%${searchQuery}%`);

    // Add filters
    if (filters.status) {
      paramIndex++;
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(filters.status);
    }

    if (filters.priority) {
      paramIndex++;
      whereConditions.push(`priority = $${paramIndex}`);
      queryParams.push(filters.priority);
    }

    if (filters.source) {
      paramIndex++;
      whereConditions.push(`source = $${paramIndex}`);
      queryParams.push(filters.source);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const searchQuerySQL = `
      SELECT * FROM leads
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN first_name ILIKE $${paramIndex + 1} THEN 1
          WHEN last_name ILIKE $${paramIndex + 1} THEN 2
          WHEN email ILIKE $${paramIndex + 1} THEN 3
          ELSE 4
        END,
        created_at DESC
      LIMIT $${paramIndex + 2}
    `;

    queryParams.push(`%${searchQuery}%`, filters.limit);

    const result = await db.query(searchQuerySQL, queryParams);

    const leads = result.rows.map(row => {
      const lead = new Lead(row);
      return lead.toJSON();
    });

    res.json({
      message: 'Lead search completed successfully',
      data: leads,
      searchQuery: searchQuery,
      resultCount: leads.length
    });
  } catch (error) {
    logger.error('Error searching leads:', error);
    res.status(500).json({
      error: 'Failed to search leads',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Search tasks
router.get('/tasks', authenticate, [
  query('q').trim().notEmpty().withMessage('Search query is required'),
  query('completed').optional().isBoolean().withMessage('Completed filter must be a boolean'),
  query('priority').optional().isIn(Object.values(TASK_PRIORITY)).withMessage('Invalid priority filter'),
  query('leadId').optional().isInt({ min: 1 }).withMessage('Lead ID must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const searchQuery = req.query.q;
    const filters = {
      completed: req.query.completed !== undefined ? req.query.completed === 'true' : undefined,
      priority: req.query.priority,
      leadId: req.query.leadId ? parseInt(req.query.leadId) : undefined,
      limit: parseInt(req.query.limit) || 50
    };

    const db = getDatabase();
    
    // Build search conditions
    let whereConditions = ['t.user_id = $1'];
    let queryParams = [userId];
    let paramIndex = 1;

    // Add search condition
    paramIndex++;
    whereConditions.push(`(t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
    queryParams.push(`%${searchQuery}%`);

    // Add filters
    if (filters.completed !== undefined) {
      paramIndex++;
      whereConditions.push(`t.is_completed = $${paramIndex}`);
      queryParams.push(filters.completed);
    }

    if (filters.priority) {
      paramIndex++;
      whereConditions.push(`t.priority = $${paramIndex}`);
      queryParams.push(filters.priority);
    }

    if (filters.leadId) {
      paramIndex++;
      whereConditions.push(`t.lead_id = $${paramIndex}`);
      queryParams.push(filters.leadId);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const searchQuerySQL = `
      SELECT 
        t.*,
        l.first_name,
        l.last_name,
        l.email
      FROM tasks t
      LEFT JOIN leads l ON t.lead_id = l.lead_id
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN t.title ILIKE $${paramIndex + 1} THEN 1
          WHEN t.description ILIKE $${paramIndex + 1} THEN 2
          ELSE 3
        END,
        t.created_at DESC
      LIMIT $${paramIndex + 2}
    `;

    queryParams.push(`%${searchQuery}%`, filters.limit);

    const result = await db.query(searchQuerySQL, queryParams);

    const tasks = result.rows.map(row => {
      const task = new Task(row);
      const taskJSON = task.toJSON();
      
      // Add lead information if available
      if (row.first_name) {
        taskJSON.lead = {
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email
        };
      }
      
      return taskJSON;
    });

    res.json({
      message: 'Task search completed successfully',
      data: tasks,
      searchQuery: searchQuery,
      resultCount: tasks.length
    });
  } catch (error) {
    logger.error('Error searching tasks:', error);
    res.status(500).json({
      error: 'Failed to search tasks',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

module.exports = router;