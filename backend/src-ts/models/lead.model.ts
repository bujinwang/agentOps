import { query } from '../config/database';

export interface Lead {
  leadId: number;
  userId: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  source: string | null;
  status: string;
  priority: string;
  budgetMin: number | null;
  budgetMax: number | null;
  notes: string | null;
  aiSummary: string | null;
  score: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadCreate {
  userId: number;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  source?: string;
  status?: string;
  priority?: string;
  budgetMin?: number;
  budgetMax?: number;
  notes?: string;
}

export interface LeadUpdate {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  source?: string;
  status?: string;
  priority?: string;
  budgetMin?: number;
  budgetMax?: number;
  notes?: string;
  aiSummary?: string;
  score?: number;
}

export interface LeadFilters {
  status?: Lead['status'];
  priority?: Lead['priority'];
  source?: string;
  search?: string;
  minBudget?: number;
  maxBudget?: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedLeads {
  leads: Lead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class LeadModel {
  static async create(leadData: LeadCreate): Promise<Lead> {
    const {
      userId,
      firstName,
      lastName,
      email = null,
      phoneNumber = null,
      source = null,
      status = 'New',
      priority = 'Medium',
      budgetMin = null,
      budgetMax = null,
      notes = null,
    } = leadData;

    const result = await query(
      `INSERT INTO leads (
        user_id, first_name, last_name, email, phone_number, source, 
        status, priority, budget_min, budget_max, notes, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *`,
      [userId, firstName, lastName, email, phoneNumber, source, status, priority, budgetMin, budgetMax, notes]
    );

    return this.mapRow(result.rows[0]);
  }

  static async findById(leadId: number, userId: number): Promise<Lead | null> {
    const result = await query(
      'SELECT * FROM leads WHERE lead_id = $1 AND user_id = $2',
      [leadId, userId]
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async findAll(
    userId: number,
    filters: LeadFilters = {},
    pagination: PaginationOptions
  ): Promise<PaginatedLeads> {
    const { page, limit, sortBy = 'created_at', sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = ['user_id = $1'];
    const params: any[] = [userId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.priority) {
      conditions.push(`priority = $${paramIndex}`);
      params.push(filters.priority);
      paramIndex++;
    }

    if (filters.source) {
      conditions.push(`source = $${paramIndex}`);
      params.push(filters.source);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(`(first_name ILIKE $ OR last_name ILIKE $ OR email ILIKE $ OR phone_number ILIKE $)`)
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.minBudget !== undefined) {
      conditions.push(`(budget_min >= $ OR budget_max >= $)`)
      params.push(filters.minBudget);
      paramIndex++;
    }

    if (filters.maxBudget !== undefined) {
      conditions.push(`(budget_min <= $ OR budget_max <= $)`)
      params.push(filters.maxBudget);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM leads WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results
    const validSortColumns = ['created_at', 'updated_at', 'first_name', 'last_name', 'priority', 'status'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const result = await query(
      `SELECT * FROM leads 
       WHERE ${whereClause}
       ORDER BY ${safeSortBy} ${safeSortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const leads = result.rows.map(row => this.mapRow(row));
    const totalPages = Math.ceil(total / limit);

    return {
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  static async update(leadId: number, userId: number, updateData: LeadUpdate): Promise<Lead | null> {
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
      return this.findById(leadId, userId);
    }

    updates.push(`updated_at = NOW()`);
    params.push(leadId, userId);

    const result = await query(
      `UPDATE leads 
       SET ${updates.join(', ')}
       WHERE lead_id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      params
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async delete(leadId: number, userId: number): Promise<boolean> {
    const result = await query(
      'DELETE FROM leads WHERE lead_id = $1 AND user_id = $2',
      [leadId, userId]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  static async countByStatus(userId: number): Promise<Record<string, number>> {
    const result = await query(
      `SELECT status, COUNT(*) as count 
       FROM leads 
       WHERE user_id = $1 
       GROUP BY status`,
      [userId]
    );

    return result.rows.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {} as Record<string, number>);
  }

  private static mapRow(row: any): Lead {
    return {
      leadId: row.lead_id,
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phoneNumber: row.phone_number,
      source: row.source,
      status: row.status,
      priority: row.priority,
      budgetMin: row.budget_min,
      budgetMax: row.budget_max,
      notes: row.notes,
      aiSummary: row.ai_summary,
      score: row.score,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
