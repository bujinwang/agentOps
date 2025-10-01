import { Router } from 'express';
import {
  createTask,
  createTaskValidation,
  getTask,
  getTasks,
  getTasksValidation,
  updateTask,
  updateTaskValidation,
  deleteTask,
  taskIdValidation,
  completeTask,
  incompleteTask,
  getTaskStats,
} from '../controllers/task.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

// All task routes require authentication
router.use(authenticateJWT);

/**
 * @route   GET /api/v1/tasks/stats
 * @desc    Get task statistics (completed vs pending)
 * @access  Private
 */
router.get('/stats', getTaskStats);

/**
 * @route   GET /api/v1/tasks
 * @desc    Get all tasks with filtering and pagination
 * @access  Private
 */
router.get('/', getTasksValidation, getTasks);

/**
 * @route   POST /api/v1/tasks
 * @desc    Create a new task
 * @access  Private
 */
router.post('/', createTaskValidation, createTask);

/**
 * @route   GET /api/v1/tasks/:id
 * @desc    Get a specific task by ID
 * @access  Private
 */
router.get('/:id', taskIdValidation, getTask);

/**
 * @route   PUT /api/v1/tasks/:id
 * @desc    Update a task
 * @access  Private
 */
router.put('/:id', updateTaskValidation, updateTask);

/**
 * @route   POST /api/v1/tasks/:id/complete
 * @desc    Mark a task as completed
 * @access  Private
 */
router.post('/:id/complete', taskIdValidation, completeTask);

/**
 * @route   POST /api/v1/tasks/:id/incomplete
 * @desc    Mark a task as incomplete
 * @access  Private
 */
router.post('/:id/incomplete', taskIdValidation, incompleteTask);

/**
 * @route   DELETE /api/v1/tasks/:id
 * @desc    Delete a task
 * @access  Private
 */
router.delete('/:id', taskIdValidation, deleteTask);

export default router;
