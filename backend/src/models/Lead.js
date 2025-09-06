
const { getDatabase } = require('../config/database');
const { LEAD_PRIORITY } = require('../config/constants');

class Lead {
  constructor(data) {
    this.lead_id = data.lead_id;
    this.user_id = data.user_id;
    this.first_name = data.first_name;
    this.last_name = data.last_name;
    this.email = data.email;
    this.phone_number = data.phone_number;
    this.source = data.source;
    this.status = data.status;
    this.priority = data.priority;
    this.budget_min = data.budget_min;
    this.budget_max = data.budget_max;
    this.desired_location = data.desired_location;
    this.property_type = data.property_type;
    this.bedrooms_min = data.bedrooms_min;
    this.bathrooms_min = data.bathrooms_min;
    this.notes = data.notes;
    this.ai_summary = data.ai_summary;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new lead
  static async create(leadData) {
    const db = getDatabase();
    const {
      userId,
      firstName,
      lastName,
      email,
      phoneNumber,
      source,
      priority,
      budgetMin,
      budgetMax,
      desiredLocation,
      propertyType,
      bedroomsMin,
      bathroomsMin,
      notes,
      aiSummary
    } = leadData;

    const query = `
      INSERT INTO leads (
        user_id, first_name, last_name, email, phone_number, source,
        priority, budget_min, budget_max, desired_location, property_type,
        bedrooms_min, bathrooms_min, notes, ai_summary, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      userId, firstName, lastName, email, phoneNumber || null, source,
      priority || LEAD_PRIORITY.MEDIUM, budgetMin || null, budgetMax || null,
      desiredLocation || null, propertyType || null, bedroomsMin || null,
      bathroomsMin || null, notes || null, aiSummary || null
    ];

    const result = await db.query(query, values);
    return result.rows.length > 0 ? new Lead(result.rows[0]) : null;
  }

  // Get leads with filtering
  static async getLeads(userId, filters = {}, pagination = {}) {
    const db = getDatabase();
    const { status, priority, searchTerm, page = 1, limit = 50 } = filters;

    const validPage = Math.max(1, parseInt(page));
    const validLimit = Math.min(Math.max(1, parseInt(limit)), 200);
    const offset = (validPage - 1) * validLimit;

    let whereConditions = ['user_id = $1'];
    let queryParams = [userId];
    let paramIndex = 1;

    if (status) {
      paramIndex++;
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(status);
    }

    if (priority) {
      paramIndex++;
      whereConditions.push(`priority = $${paramIndex}`);
      queryParams.push(priority);
    }

    if (searchTerm) {
      paramIndex++;
      whereConditions.push(`(first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      queryParams.push(`%${searchTerm}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const leadsQuery = `
      SELECT * FROM leads
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;

    queryParams.push(validLimit, offset);

    const countQuery = `SELECT COUNT(*) as total FROM leads ${whereClause}`;
    const countParams = queryParams.slice(0, paramIndex);

    const [leadsResult, countResult] = await Promise.all([
      db.query(leadsQuery, queryParams),
      db.query(countQuery, countParams)
    ]);

    const totalItems = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalItems / validLimit);

    return {
      data: leadsResult.rows.map(row => new Lead(row)),
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

  // Get lead by ID
  static async getById(leadId, userId) {
    const db = getDatabase();
    const query = 'SELECT * FROM leads WHERE lead_id = $1 AND user_id = $2 LIMIT 1';
    const result = await db.query(query, [leadId, userId]);
    return result.rows.length > 0 ? new Lead(result.rows[0]) : null;
  }

  // Update lead status
  static async updateStatus(leadId, userId, newStatus) {
    const db = getDatabase();
    const query = `
      UPDATE leads
      SET status = $1, updated_at = NOW()
      WHERE lead_id = $2 AND user_id = $3
      RETURNING *
    `;
    const result = await db.query(query, [newStatus, leadId, userId]);
    return result.rows.length > 0 ? new Lead(result.rows[0]) : null;
  }

  // Update lead
  async update(updateData) {
    const db = getDatabase();
    const fields = [];
    const values = [];
    let paramIndex = 0;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && key !== 'lead_id' && key !== 'user_id') {
        paramIndex++;
        fields.push(`${key} = $${paramIndex}`);
        values.push(updateData[key]);
      }
    });

    if (fields.length === 0) {
      return this;
    }

    paramIndex++;
    fields.push('updated_at = NOW()');
    values.push(this.lead_id);

    const query = `
      UPDATE leads
      SET ${fields.join(', ')}
      WHERE lead_id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    
    if (result.rows.length > 0) {
      Object.assign(this, result.rows[0]);
    }
    
    return this;
  }

  // Delete lead
  static async delete(leadId, userId) {
    const db = getDatabase();
    const query = 'DELETE FROM leads WHERE lead_id = $1 AND user_id = $2 RETURNING lead_id';
    const result = await db.query(query, [leadId, userId]);
    return result.rows.length > 0;
  }

  // Sanitize lead data for response
  toJSON() {
    return {
      lead_id: this.lead_id,
      user_id: this.user_id,
      first_name: this.first_name,
      last_name: this.last_name,
      email: this.email,
      phone_number: this.phone_number,
      source: this.source,
      status: this.status,
      priority: this.priority,
      budget_min: this.budget_min,
      budget_max: this.budget_max,
      desired_location: this.desired_location,
      property_type: this.property_type,
      bedrooms_min: this.bedrooms_min,
      bathrooms_min: this.bathrooms_min,
      notes: this.notes,
      ai_summary: this.ai_summary,
      last_contacted_at: this.last_contacted_at,
      follow_up_date: this.follow_up_date,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Lead;
