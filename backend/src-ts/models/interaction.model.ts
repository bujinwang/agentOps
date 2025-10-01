import { query } from '../config/database';

export interface Interaction {
  interactionId: number;
  leadId: number;
  userId: number | null;
  type: string;
  content: string | null;
  interactionDate: Date;
  createdAt: Date;
}

export interface InteractionCreate {
  leadId: number;
  userId: number;
  type: string;
  content?: string;
  interactionDate?: Date;
}

export interface InteractionFilters {
  leadId?: number;
  type?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedInteractions {
  interactions: Interaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class InteractionModel {
  static async create(interactionData: InteractionCreate): Promise<Interaction> {
    const {
      leadId,
      userId,
      type,
      content = null,
      interactionDate = new Date(),
    } = interactionData;

    const result = await query(
      `INSERT INTO interactions (
        lead_id, user_id, type, content, interaction_date, created_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *`,
      [leadId, userId, type, content, interactionDate]
    );

    return this.mapRow(result.rows[0]);
  }

  static async findById(interactionId: number, userId: number): Promise<Interaction | null> {
    const result = await query(
      'SELECT * FROM interactions WHERE interaction_id = $1 AND user_id = $2',
      [interactionId, userId]
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async findByLeadId(
    leadId: number,
    userId: number,
    pagination: PaginationOptions = { page: 1, limit: 50 }
  ): Promise<PaginatedInteractions> {
    const { page, limit, sortBy = 'interaction_date', sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) as total FROM interactions WHERE lead_id = $1 AND user_id = $2',
      [leadId, userId]
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results
    const validSortColumns = ['interaction_date', 'created_at', 'type'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'interaction_date';
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const result = await query(
      `SELECT * FROM interactions 
       WHERE lead_id = $1 AND user_id = $2
       ORDER BY ${safeSortBy} ${safeSortOrder}
       LIMIT $3 OFFSET $4`,
      [leadId, userId, limit, offset]
    );

    const interactions = result.rows.map(row => this.mapRow(row));
    const totalPages = Math.ceil(total / limit);

    return {
      interactions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  static async findAll(
    userId: number,
    filters: InteractionFilters = {},
    pagination: PaginationOptions
  ): Promise<PaginatedInteractions> {
    const { page, limit, sortBy = 'interaction_date', sortOrder = 'DESC' } = pagination;
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

    if (filters.type) {
      conditions.push(`type = $${paramIndex}`);
      params.push(filters.type);
      paramIndex++;
    }

    if (filters.startDate) {
      conditions.push(`interaction_date >= $${paramIndex}`);
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      conditions.push(`interaction_date <= $${paramIndex}`);
      params.push(filters.endDate);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM interactions WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results
    const validSortColumns = ['interaction_date', 'created_at', 'type'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'interaction_date';
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const result = await query(
      `SELECT * FROM interactions 
       WHERE ${whereClause}
       ORDER BY ${safeSortBy} ${safeSortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const interactions = result.rows.map(row => this.mapRow(row));
    const totalPages = Math.ceil(total / limit);

    return {
      interactions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  static async delete(interactionId: number, userId: number): Promise<boolean> {
    const result = await query(
      'DELETE FROM interactions WHERE interaction_id = $1 AND user_id = $2',
      [interactionId, userId]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  static async countByType(userId: number): Promise<Record<string, number>> {
    const result = await query(
      `SELECT type, COUNT(*) as count 
       FROM interactions 
       WHERE user_id = $1 
       GROUP BY type`,
      [userId]
    );

    return result.rows.reduce((acc, row) => {
      acc[row.type] = parseInt(row.count, 10);
      return acc;
    }, {} as Record<string, number>);
  }

  private static mapRow(row: any): Interaction {
    return {
      interactionId: row.interaction_id,
      leadId: row.lead_id,
      userId: row.user_id,
      type: row.type,
      content: row.content,
      interactionDate: row.interaction_date,
      createdAt: row.created_at,
    };
  }
}
