const { getDatabase } = require('../config/database');
const { INTERACTION_TYPES } = require('../config/constants');

class Interaction {
  constructor(data) {
    this.interaction_id = data.interaction_id;
    this.lead_id = data.lead_id;
    this.user_id = data.user_id;
    this.type = data.type;
    this.content = data.content;
    this.interaction_date = data.interaction_date;
    this.created_at = data.created_at;
  }

  // Create a new interaction
  static async create(interactionData) {
    const db = getDatabase();
    const {
      userId,
      leadId,
      type,
      content,
      interactionDate
    } = interactionData;

    const query = `
      INSERT INTO interactions (
        user_id, lead_id, type, content, interaction_date, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;

    const values = [
      userId, leadId, type, content || null, interactionDate || new Date()
    ];

    const result = await db.query(query, values);
    return result.rows.length > 0 ? new Interaction(result.rows[0]) : null;
  }

  // Update an interaction
  static async update(interactionId, userId, updateData) {
    const db = getDatabase();
    const { type, content, interactionDate } = updateData;
    
    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    if (type !== undefined) {
      fields.push(`type = $${paramIndex++}`);
      values.push(type);
    }
    
    if (content !== undefined) {
      fields.push(`content = $${paramIndex++}`);
      values.push(content);
    }
    
    if (interactionDate !== undefined) {
      fields.push(`interaction_date = $${paramIndex++}`);
      values.push(interactionDate);
    }
    
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }
    
    // Add updated_at timestamp
    fields.push(`updated_at = NOW()`);
    
    // Add WHERE clause parameters
    values.push(interactionId, userId);
    
    const query = `
      UPDATE interactions
      SET ${fields.join(', ')}
      WHERE interaction_id = $${paramIndex++} AND user_id = $${paramIndex++}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    return result.rows.length > 0 ? new Interaction(result.rows[0]) : null;
  }

  // Get interactions with filtering
  static async getInteractions(userId, filters = {}) {
    const db = getDatabase();
    const { 
      leadId, 
      type, 
      limit = 50, 
      page = 1 
    } = filters;

    const validPage = Math.max(1, parseInt(page));
    const validLimit = Math.min(Math.max(1, parseInt(limit)), 200);
    const offset = (validPage - 1) * validLimit;

    let whereConditions = ['i.user_id = $1'];
    let queryParams = [userId];
    let paramIndex = 1;

    if (leadId) {
      paramIndex++;
      whereConditions.push(`i.lead_id = $${paramIndex}`);
      queryParams.push(leadId);
    }

    if (type) {
      paramIndex++;
      whereConditions.push(`i.type = $${paramIndex}`);
      queryParams.push(type);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const interactionsQuery = `
      SELECT 
        i.interaction_id,
        i.lead_id,
        i.user_id,
        i.type,
        i.content,
        i.interaction_date,
        i.created_at,
        l.first_name,
        l.last_name,
        l.email
      FROM interactions i
      LEFT JOIN leads l ON i.lead_id = l.lead_id
      ${whereClause}
      ORDER BY i.interaction_date DESC
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;

    queryParams.push(validLimit, offset);

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM interactions i
      ${whereClause}
    `;
    const countParams = queryParams.slice(0, paramIndex);

    const [interactionsResult, countResult] = await Promise.all([
      db.query(interactionsQuery, queryParams),
      db.query(countQuery, countParams)
    ]);

    const totalItems = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalItems / validLimit);

    return {
      data: interactionsResult.rows.map(row => ({
        interactionId: row.interaction_id,
        leadId: row.lead_id,
        userId: row.user_id,
        type: row.type,
        content: row.content,
        interactionDate: row.interaction_date,
        createdAt: row.created_at,
        lead: row.first_name ? {
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email
        } : null
      })),
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

  // Get lead interactions
  static async getLeadInteractions(leadId, userId) {
    const db = getDatabase();
    const query = `
      SELECT 
        i.interaction_id,
        i.lead_id,
        i.user_id,
        i.type,
        i.content,
        i.interaction_date,
        i.created_at
      FROM interactions i
      WHERE i.lead_id = $1 AND i.user_id = $2
      ORDER BY i.interaction_date DESC
    `;

    const result = await db.query(query, [leadId, userId]);
    
    return result.rows.map(row => ({
      interactionId: row.interaction_id,
      leadId: row.lead_id,
      userId: row.user_id,
      type: row.type,
      content: row.content,
      interactionDate: row.interaction_date,
      createdAt: row.created_at
    }));
  }

  // Get interaction by ID
  static async getById(interactionId, userId) {
    const db = getDatabase();
    const query = 'SELECT * FROM interactions WHERE interaction_id = $1 AND user_id = $2 LIMIT 1';
    const result = await db.query(query, [interactionId, userId]);
    return result.rows.length > 0 ? new Interaction(result.rows[0]) : null;
  }

  // Delete interaction
  static async delete(interactionId, userId) {
    const db = getDatabase();
    const query = 'DELETE FROM interactions WHERE interaction_id = $1 AND user_id = $2 RETURNING interaction_id';
    const result = await db.query(query, [interactionId, userId]);
    return result.rows.length > 0;
  }

  // Sanitize interaction data for response
  toJSON() {
    return {
      interaction_id: this.interaction_id,
      lead_id: this.lead_id,
      user_id: this.user_id,
      type: this.type,
      content: this.content,
      interaction_date: this.interaction_date,
      created_at: this.created_at
    };
  }
}

module.exports = Interaction;