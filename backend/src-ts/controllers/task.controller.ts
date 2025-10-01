/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { body, query as queryValidator, param, validationResult } from 'express-validator';
import { TaskService } from '../services/task.service';
import { successResponse, errorResponse } from '../utils/response';
import { TaskFilters, PaginationOptions } from '../models/task.model';

const taskService = new TaskService();

// Validation rules
export const createTaskValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('priority')
    .optional()
    .trim(),
  body('leadId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Lead ID must be a positive integer'),
];

export const updateTaskValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid task ID is required'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('priority')
    .optional()
    .trim(),
  body('leadId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Lead ID must be a positive integer'),
];

export const getTasksValidation = [
  queryValidator('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  queryValidator('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  queryValidator('priority')
    .optional()
    .trim(),
  queryValidator('isCompleted')
    .optional()
    .isBoolean()
    .withMessage('isCompleted must be a boolean'),
  queryValidator('leadId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Lead ID must be a positive integer'),
  queryValidator('sortBy')
    .optional()
    .isIn(['created_at', 'updated_at', 'due_date', 'priority', 'title'])
    .withMessage('Invalid sort field'),
  queryValidator('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Sort order must be ASC or DESC'),
];

export const taskIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid task ID is required'),
];

// Controllers
export async function createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    if (!req.user) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const taskData = {
      ...req.body,
      userId: req.user.userId,
    };

    const task = await taskService.createTask(taskData);

    res.status(201).json(successResponse(task, 'Task created successfully'));
  } catch (error) {
    next(error);
  }
}

export async function getTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    if (!req.user) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const taskId = parseInt(req.params.id, 10);
    const task = await taskService.getTask(taskId, req.user.userId);

    res.status(200).json(successResponse(task));
  } catch (error) {
    next(error);
  }
}

export async function getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    if (!req.user) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const filters: TaskFilters = {
      leadId: req.query.leadId ? parseInt(req.query.leadId as string, 10) : undefined,
      priority: req.query.priority as string,
      isCompleted: req.query.isCompleted === 'true' ? true : req.query.isCompleted === 'false' ? false : undefined,
    };

    const pagination: PaginationOptions = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'ASC' | 'DESC',
    };

    const result = await taskService.getTasks(req.user.userId, filters, pagination);

    res.status(200).json(successResponse(result));
  } catch (error) {
    next(error);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    if (!req.user) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const taskId = parseInt(req.params.id, 10);
    const task = await taskService.updateTask(taskId, req.user.userId, req.body);

    res.status(200).json(successResponse(task, 'Task updated successfully'));
  } catch (error) {
    next(error);
  }
}

export async function completeTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    if (!req.user) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const taskId = parseInt(req.params.id, 10);
    const task = await taskService.completeTask(taskId, req.user.userId);

    res.status(200).json(successResponse(task, 'Task marked as completed'));
  } catch (error) {
    next(error);
  }
}

export async function incompleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    if (!req.user) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const taskId = parseInt(req.params.id, 10);
    const task = await taskService.incompleteTask(taskId, req.user.userId);

    res.status(200).json(successResponse(task, 'Task marked as incomplete'));
  } catch (error) {
    next(error);
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    if (!req.user) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const taskId = parseInt(req.params.id, 10);
    await taskService.deleteTask(taskId, req.user.userId);

    res.status(200).json(successResponse(null, 'Task deleted successfully'));
  } catch (error) {
    next(error);
  }
}

export async function getTaskStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const stats = await taskService.getTaskStats(req.user.userId);

    res.status(200).json(successResponse(stats));
  } catch (error) {
    next(error);
  }
}
