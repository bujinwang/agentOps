const { getDatabase } = require('../config/database');
const { TASK_PRIORITY } = require('../config/constants');

class Task {
  constructor(data) {
    this.task_id = data.task_id;
    this.lead_id = data.lead_id;
    this.user_id = data.user_id;
    this.title = data.title;
    this.description = data.description;
    this.due_date = data.due_date;
    this.priority = data.priority;
    this.is_completed = data.is_completed;
    this.completed_at = data.completed_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new task
  static async create(taskData) {
    const db = getDatabase();
    const {
      userId,
      leadId,
      title,
      description,
      dueDate,
      priority
    } = taskData;

    const query = `
      INSERT INTO tasks (
        user_id, lead_id, title, description, due_date, priority, 
        is_completed, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, false, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      userId, leadId || null, title, description || null, 
      dueDate || null, priority || TASK_PRIORITY.MEDIUM
    ];

    const result = await db.query(query, values);
    return result.rows.length > 0 ? new Task(result.rows[0]) : null;
  }

  // Get tasks with filtering
  static async getTasks(userId, filters = {}) {
    const db = getDatabase();
    const { 
      leadId, 
      completed, 
      priority, 
      overdue, 
      page = 1, 
      limit = 50,
      sortBy = 'due_date',
      sortOrder = 'ASC'
    } = filters;

    const validPage = Math.max(1, parseInt(page));
    const validLimit = Math.min(Math.max(1, parseInt(limit)), 200);
    const offset = (validPage - 1) * validLimit;

    let whereConditions = ['user_id = $1'];
    let queryParams = [userId];
    let paramIndex = 1;

    if (leadId) {
      paramIndex++;
      whereConditions.push(`lead_id = $${paramIndex}`);
      queryParams.push(leadId);
    }

    if (completed !== undefined) {
      paramIndex++;
      whereConditions.push(`is_completed = $${paramIndex}`);
      queryParams.push(completed);
    }

    if (priority) {
      paramIndex++;
      whereConditions.push(`priority = $${paramIndex}`);
      queryParams.push(priority);
    }

    if (overdue) {
      whereConditions.push(`due_date < NOW() AND is_completed = false`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Validate sort fields
    const allowedSortFields = ['created_at', 'updated_at', 'due_date', 'priority', 'title'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'due_date';
    const sortDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    const tasksQuery = `
      SELECT * FROM tasks
      ${whereClause}
      ORDER BY ${sortField} ${sortDirection}
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;

    queryParams.push(validLimit, offset);

    const countQuery = `SELECT COUNT(*) as total FROM tasks ${whereClause}`;
    const countParams = queryParams.slice(0, paramIndex);

    const [tasksResult, countResult] = await Promise.all([
      db.query(tasksQuery, queryParams),
      db.query(countQuery, countParams)
    ]);

    const totalItems = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalItems / validLimit);

    return {
      data: tasksResult.rows.map(row => new Task(row)),
      pagination: {
        currentPage: validPage,
        totalPages: totalPages,
        totalItems: totalItems,
        limit: validLimit,
        hasNext: validPage < totalPages,
        hasPrev: validPage > 1
      }
    };
  }

  // Get task by ID
  static async getById(taskId, userId) {
    const db = getDatabase();
    const query = 'SELECT * FROM tasks WHERE task_id = $1 AND user_id = $2 LIMIT 1';
    const result = await db.query(query, [taskId, userId]);
    return result.rows.length > 0 ? new Task(result.rows[0]) : null;
  }

  // Update task
  async update(updateData) {
    const db = getDatabase();
    const fields = [];
    const values = [];
    let paramIndex = 0;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && key !== 'task_id' && key !== 'user_id') {
        paramIndex++;
        // Convert camelCase to snake_case for database
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(updateData[key]);
      }
    });

    if (fields.length === 0) {
      return this;
    }

    paramIndex++;
    fields.push('updated_at = NOW()');
    values.push(this.task_id);

    const query = `
      UPDATE tasks
      SET ${fields.join(', ')}
      WHERE task_id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    
    if (result.rows.length > 0) {
      Object.assign(this, result.rows[0]);
    }
    
    return this;
  }

  // Delete task
  static async delete(taskId, userId) {
    const db = getDatabase();
    const query = 'DELETE FROM tasks WHERE task_id = $1 AND user_id = $2 RETURNING task_id';
    const result = await db.query(query, [taskId, userId]);
    return result.rows.length > 0;
  }

  // Sanitize task data for response
  toJSON() {
    return {
      task_id: this.task_id,
      lead_id: this.lead_id,
      user_id: this.user_id,
      title: this.title,
      description: this.description,
      due_date: this.due_date,
      priority: this.priority,
      is_completed: this.is_completed,
      completed_at: this.completed_at,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Task;