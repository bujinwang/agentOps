const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Task = require('../models/Task');
const { authenticate } = require('../middleware/auth');
const { ERROR_MESSAGES, TASK_PRIORITY } = require('../config/constants');
const { logger } = require('../config/logger');

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

// Task creation validation
const createTaskValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ max: 200 })
    .withMessage('Task title must be less than 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO date'),
  body('priority')
    .optional()
    .isIn(Object.values(TASK_PRIORITY))
    .withMessage('Invalid priority value'),
  body('leadId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Lead ID must be a positive integer')
];

// Task update validation
const updateTaskValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Task title must be less than 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO date'),
  body('priority')
    .optional()
    .isIn(Object.values(TASK_PRIORITY))
    .withMessage('Invalid priority value'),
  body('isCompleted')
    .optional()
    .isBoolean()
    .withMessage('Is completed must be a boolean'),
  body('leadId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Lead ID must be a positive integer')
];

// Get all tasks with filtering and pagination
router.get('/', authenticate, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit must be between 1 and 200'),
  query('leadId').optional().isInt({ min: 1 }).withMessage('Lead ID must be a positive integer'),
  query('completed').optional().isBoolean().withMessage('Completed must be a boolean'),
  query('priority').optional().isIn(Object.values(TASK_PRIORITY)).withMessage('Invalid priority filter'),
  query('overdue').optional().isBoolean().withMessage('Overdue must be a boolean'),
  query('sortBy').optional().isIn(['created_at', 'updated_at', 'due_date', 'priority', 'title']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Sort order must be ASC or DESC')
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      leadId: req.query.leadId ? parseInt(req.query.leadId) : undefined,
      completed: req.query.completed !== undefined ? req.query.completed === 'true' : undefined,
      priority: req.query.priority,
      overdue: req.query.overdue !== undefined ? req.query.overdue === 'true' : undefined,
      sortBy: req.query.sortBy || 'due_date',
      sortOrder: req.query.sortOrder || 'ASC'
    };

    const result = await Task.getTasks(userId, filters);

    res.json({
      message: 'Tasks retrieved successfully',
      data: result.data.map(task => task.toJSON()),
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Error getting tasks:', error);
    res.status(500).json({
      error: 'Failed to get tasks',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Get task by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.user.user_id;

    if (isNaN(taskId)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        message: 'Task ID must be a number'
      });
    }

    const task = await Task.getById(taskId, userId);

    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        message: 'Task not found or access denied'
      });
    }

    res.json({
      message: 'Task retrieved successfully',
      data: task.toJSON()
    });
  } catch (error) {
    logger.error('Error getting task:', error);
    res.status(500).json({
      error: 'Failed to get task',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Create new task
router.post('/', authenticate, createTaskValidation, handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const taskData = {
      userId,
      title: req.body.title,
      description: req.body.description,
      dueDate: req.body.dueDate,
      priority: req.body.priority || TASK_PRIORITY.MEDIUM,
      leadId: req.body.leadId
    };

    const task = await Task.create(taskData);

    if (!task) {
      return res.status(500).json({
        error: 'Failed to create task',
        message: 'Unable to create task'
      });
    }

    logger.info(`Task created successfully: ${task.title} by user ${userId}`);

    res.status(201).json({
      message: 'Task created successfully',
      data: task.toJSON()
    });
  } catch (error) {
    logger.error('Error creating task:', error);
    res.status(500).json({
      error: 'Failed to create task',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Update task
router.put('/:id', authenticate, updateTaskValidation, handleValidationErrors, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.user.user_id;

    if (isNaN(taskId)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        message: 'Task ID must be a number'
      });
    }

    const task = await Task.getById(taskId, userId);

    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        message: 'Task not found or access denied'
      });
    }

    const updateData = {};
    const allowedFields = ['title', 'description', 'dueDate', 'priority', 'isCompleted', 'leadId'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        // Convert camelCase to snake_case for database
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateData[dbField] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        message: 'Please provide at least one field to update'
      });
    }

    const updatedTask = await task.update(updateData);

    logger.info(`Task updated: ${taskId} by user ${userId}`);

    res.json({
      message: 'Task updated successfully',
      data: updatedTask.toJSON()
    });
  } catch (error) {
    logger.error('Error updating task:', error);
    res.status(500).json({
      error: 'Failed to update task',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Delete task
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.user.user_id;

    if (isNaN(taskId)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        message: 'Task ID must be a number'
      });
    }

    const deleted = await Task.delete(taskId, userId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Task not found',
        message: 'Task not found or access denied'
      });
    }

    logger.info(`Task deleted: ${taskId} by user ${userId}`);

    res.json({
      message: 'Task deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting task:', error);
    res.status(500).json({
      error: 'Failed to delete task',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

module.exports = router;