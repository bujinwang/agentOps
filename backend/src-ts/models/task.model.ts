import { query } from '../config/database';

export interface Task {
  taskId: number;
  leadId: number | null;
  userId: number;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: string;
  isCompleted: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskCreate {
  userId: number;
  leadId?: number;
  title: string;
  description?: string;
  dueDate?: Date;
  priority?: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  dueDate?: Date;
  priority?: string;
  leadId?: number;
}

export interface TaskFilters {
  leadId?: number;
  priority?: string;
  isCompleted?: boolean;
  dueBefore?: Date;
  dueAfter?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedTasks {
  tasks: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class TaskModel {
  static async create(taskData: TaskCreate): Promise<Task> {
    const {
      userId,
      leadId = null,
      title,
      description = null,
      dueDate = null,
      priority = 'Medium',
    } = taskData;

    const result = await query(
      `INSERT INTO tasks (
        user_id, lead_id, title, description, due_date, priority,
        is_completed, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, false, NOW(), NOW())
      RETURNING *`,
      [userId, leadId, title, description, dueDate, priority]
    );

    return this.mapRow(result.rows[0]);
  }

  static async findById(taskId: number, userId: number): Promise<Task | null> {
    const result = await query(
      'SELECT * FROM tasks WHERE task_id = $1 AND user_id = $2',
      [taskId, userId]
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async findAll(
    userId: number,
    filters: TaskFilters = {},
    pagination: PaginationOptions
  ): Promise<PaginatedTasks> {
    const { page, limit, sortBy = 'created_at', sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = ['user_id = $1'];
    const params: any[] = [userId];
    let paramIndex = 2;

    if (filters.leadId !== undefined) {
      conditions.push(`lead_id = $${paramIndex}`);
      params.push(filters.leadId);
      paramIndex++;
    }

    if (filters.priority) {
      conditions.push(`priority = $${paramIndex}`);
      params.push(filters.priority);
      paramIndex++;
    }

    if (filters.isCompleted !== undefined) {
      conditions.push(`is_completed = $${paramIndex}`);
      params.push(filters.isCompleted);
      paramIndex++;
    }

    if (filters.dueBefore) {
      conditions.push(`due_date <= $${paramIndex}`);
      params.push(filters.dueBefore);
      paramIndex++;
    }

    if (filters.dueAfter) {
      conditions.push(`due_date >= $${paramIndex}`);
      params.push(filters.dueAfter);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM tasks WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results
    const validSortColumns = ['created_at', 'updated_at', 'due_date', 'priority', 'title'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const result = await query(
      `SELECT * FROM tasks 
       WHERE ${whereClause}
       ORDER BY ${safeSortBy} ${safeSortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const tasks = result.rows.map(row => this.mapRow(row));
    const totalPages = Math.ceil(total / limit);

    return {
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  static async update(taskId: number, userId: number, updateData: TaskUpdate): Promise<Task | null> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Build SET clause dynamically
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        updates.push(`${snakeKey} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      return this.findById(taskId, userId);
    }

    updates.push(`updated_at = NOW()`);
    params.push(taskId, userId);

    const result = await query(
      `UPDATE tasks 
       SET ${updates.join(', ')}
       WHERE task_id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      params
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async complete(taskId: number, userId: number): Promise<Task | null> {
    const result = await query(
      `UPDATE tasks 
       SET is_completed = true, completed_at = NOW(), updated_at = NOW()
       WHERE task_id = $1 AND user_id = $2
       RETURNING *`,
      [taskId, userId]
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async incomplete(taskId: number, userId: number): Promise<Task | null> {
    const result = await query(
      `UPDATE tasks 
       SET is_completed = false, completed_at = NULL, updated_at = NOW()
       WHERE task_id = $1 AND user_id = $2
       RETURNING *`,
      [taskId, userId]
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async delete(taskId: number, userId: number): Promise<boolean> {
    const result = await query(
      'DELETE FROM tasks WHERE task_id = $1 AND user_id = $2',
      [taskId, userId]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  static async countByStatus(userId: number): Promise<{ completed: number; pending: number }> {
    const result = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE is_completed = true) as completed,
        COUNT(*) FILTER (WHERE is_completed = false) as pending
       FROM tasks 
       WHERE user_id = $1`,
      [userId]
    );

    return {
      completed: parseInt(result.rows[0].completed, 10),
      pending: parseInt(result.rows[0].pending, 10),
    };
  }

  private static mapRow(row: any): Task {
    return {
      taskId: row.task_id,
      leadId: row.lead_id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      dueDate: row.due_date,
      priority: row.priority,
      isCompleted: row.is_completed,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
