import {
  TaskModel,
  Task,
  TaskCreate,
  TaskUpdate,
  TaskFilters,
  PaginationOptions,
  PaginatedTasks,
} from '../models/task.model';
import { AppError } from '../middleware/error.middleware';

export class TaskService {
  async createTask(taskData: TaskCreate): Promise<Task> {
    // Validate required fields
    if (!taskData.title || taskData.title.trim().length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Task title is required');
    }

    // Validate due date if provided
    if (taskData.dueDate) {
      const dueDate = new Date(taskData.dueDate);
      if (isNaN(dueDate.getTime())) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid due date format');
      }
    }

    return TaskModel.create(taskData);
  }

  async getTask(taskId: number, userId: number): Promise<Task> {
    const task = await TaskModel.findById(taskId, userId);

    if (!task) {
      throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
    }

    return task;
  }

  async getTasks(
    userId: number,
    filters: TaskFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PaginatedTasks> {
    // Validate pagination
    if (pagination.page < 1) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Page must be greater than 0');
    }

    if (pagination.limit < 1 || pagination.limit > 100) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Limit must be between 1 and 100');
    }

    return TaskModel.findAll(userId, filters, pagination);
  }

  async updateTask(taskId: number, userId: number, updateData: TaskUpdate): Promise<Task> {
    // Validate due date if provided
    if (updateData.dueDate) {
      const dueDate = new Date(updateData.dueDate);
      if (isNaN(dueDate.getTime())) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid due date format');
      }
    }

    const task = await TaskModel.update(taskId, userId, updateData);

    if (!task) {
      throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
    }

    return task;
  }

  async completeTask(taskId: number, userId: number): Promise<Task> {
    const task = await TaskModel.complete(taskId, userId);

    if (!task) {
      throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
    }

    return task;
  }

  async incompleteTask(taskId: number, userId: number): Promise<Task> {
    const task = await TaskModel.incomplete(taskId, userId);

    if (!task) {
      throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
    }

    return task;
  }

  async deleteTask(taskId: number, userId: number): Promise<void> {
    const deleted = await TaskModel.delete(taskId, userId);

    if (!deleted) {
      throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
    }
  }

  async getTaskStats(userId: number): Promise<{ completed: number; pending: number }> {
    return TaskModel.countByStatus(userId);
  }
}
