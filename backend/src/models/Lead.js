
const { getDatabase, executeQuery, executeBatch } = require('../config/database');
const CacheService = require('../services/CacheService');
const { LEAD_PRIORITY, INTERACTION_TYPES } = require('../config/constants');

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

    // Enrichment fields
    this.enrichment_consent = data.enrichment_consent;
    this.consent_granted_at = data.consent_granted_at;
    this.consent_expires_at = data.consent_expires_at;
    this.consent_withdrawn_at = data.consent_withdrawn_at;
    this.consent_withdrawal_reason = data.consent_withdrawal_reason;
    this.consent_id = data.consent_id;
    this.credit_data_consent = data.credit_data_consent;
    this.ccpa_consent = data.ccpa_consent;
    this.permissible_purpose_declared = data.permissible_purpose_declared;
    this.enrichment_data = data.enrichment_data;
    this.enrichment_status = data.enrichment_status;
    this.last_enrichment_at = data.last_enrichment_at;
    this.enrichment_quality_score = data.enrichment_quality_score;
    this.enrichment_confidence = data.enrichment_confidence;
    this.enrichment_sources = data.enrichment_sources;
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

  // Get leads with filtering and caching
  static async getLeads(userId, filters = {}, pagination = {}) {
    const { status, priority, searchTerm, page = 1, limit = 50 } = filters;

    const validPage = Math.max(1, parseInt(page));
    const validLimit = Math.min(Math.max(1, parseInt(limit)), 200);

    // Try to get from cache first
    const cachedResult = await CacheService.getLeadList(userId, filters, { page: validPage, limit: validLimit });
    if (cachedResult) {
      return cachedResult;
    }

    const db = getDatabase();
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
      executeQuery(leadsQuery, queryParams),
      executeQuery(countQuery, countParams)
    ]);

    const totalItems = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalItems / validLimit);

    const result = {
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

    // Cache the result
    await CacheService.setLeadList(userId, filters, { page: validPage, limit: validLimit }, result);

    return result;
  }

  // Get lead by ID with optimized query
  static async getById(leadId, userId) {
    const query = 'SELECT * FROM leads WHERE lead_id = $1 AND user_id = $2 LIMIT 1';
    const result = await executeQuery(query, [leadId, userId]);
    return result.rows.length > 0 ? new Lead(result.rows[0]) : null;
  }

  // Update lead status with optimized query
  static async updateStatus(leadId, userId, newStatus) {
    const query = `
      UPDATE leads
      SET status = $1, updated_at = NOW()
      WHERE lead_id = $2 AND user_id = $3
      RETURNING *
    `;
    const result = await executeQuery(query, [newStatus, leadId, userId]);
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

    const result = await executeQuery(query, values);
    
    if (result.rows.length > 0) {
      Object.assign(this, result.rows[0]);
    }
    
    return this;
  }

  // Delete lead with optimized query
  static async delete(leadId, userId) {
    const query = 'DELETE FROM leads WHERE lead_id = $1 AND user_id = $2 RETURNING lead_id';
    const result = await executeQuery(query, [leadId, userId]);
    return result.rows.length > 0;
  }

  // Assign lead to a different user
  static async assignLead(leadId, fromUserId, toUserId, assignmentNotes = null) {
    const db = getDatabase();
    
    // First verify the lead belongs to the fromUser
    const checkQuery = 'SELECT * FROM leads WHERE lead_id = $1 AND user_id = $2 LIMIT 1';
    const checkResult = await executeQuery(checkQuery, [leadId, fromUserId]);
    
    if (checkResult.rows.length === 0) {
      throw new Error('Lead not found or access denied');
    }
    
    const lead = checkResult.rows[0];
    const oldUserId = lead.user_id;
    
    // Update the lead assignment
    const updateQuery = `
      UPDATE leads
      SET user_id = $1, updated_at = NOW()
      WHERE lead_id = $2 AND user_id = $3
      RETURNING *
    `;
    
    const result = await executeQuery(updateQuery, [toUserId, leadId, fromUserId]);
    
    if (result.rows.length === 0) {
      throw new Error('Failed to assign lead');
    }
    
    // Log the assignment as an interaction
    try {
      const Interaction = require('./Interaction');
      const assignmentContent = assignmentNotes
        ? `Lead assigned to user ${toUserId}. Notes: ${assignmentNotes}`
        : `Lead assigned to user ${toUserId}`;
      
      await Interaction.create({
        userId: fromUserId,
        leadId: leadId,
        type: INTERACTION_TYPES.NOTE_ADDED, // Using NOTE_ADDED for assignment logging
        content: assignmentContent
      });
    } catch (interactionError) {
      // Log the error but don't fail the assignment
      console.warn('Failed to log lead assignment interaction:', interactionError);
    }
    
    return new Lead(result.rows[0]);
  }

  // Get unassigned leads (leads with no user assignment) with optimized query
  static async getUnassignedLeads(limit = 50, page = 1) {
    const validPage = Math.max(1, parseInt(page));
    const validLimit = Math.min(Math.max(1, parseInt(limit)), 200);
    const offset = (validPage - 1) * validLimit;

    const query = `
      SELECT * FROM leads
      WHERE user_id IS NULL OR user_id = 0
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await executeQuery(query, [validLimit, offset]);
    
    return {
      data: result.rows.map(row => new Lead(row)),
      pagination: {
        currentPage: validPage,
        totalPages: Math.ceil(result.rows.length / validLimit),
        totalItems: result.rows.length,
        limit: validLimit
      }
    };
  }

  // Get leads assigned to a specific user
  static async getAssignedLeads(userId, filters = {}, pagination = {}) {
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
    
    const query = `
      SELECT * FROM leads
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;
    
    queryParams.push(validLimit, offset);
    
    const countQuery = `SELECT COUNT(*) as total FROM leads ${whereClause}`;
    const countParams = queryParams.slice(0, paramIndex);
    
    const [leadsResult, countResult] = await Promise.all([
      executeQuery(query, queryParams),
      executeQuery(countQuery, countParams)
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
      updated_at: this.updated_at,
      // Enrichment fields
      enrichment_consent: this.enrichment_consent,
      consent_granted_at: this.consent_granted_at,
      consent_expires_at: this.consent_expires_at,
      consent_withdrawn_at: this.consent_withdrawn_at,
      consent_withdrawal_reason: this.consent_withdrawal_reason,
      consent_id: this.consent_id,
      credit_data_consent: this.credit_data_consent,
      ccpa_consent: this.ccpa_consent,
      permissible_purpose_declared: this.permissible_purpose_declared,
      enrichment_data: this.enrichment_data,
      enrichment_status: this.enrichment_status,
      last_enrichment_at: this.last_enrichment_at,
      enrichment_quality_score: this.enrichment_quality_score,
      enrichment_confidence: this.enrichment_confidence,
      enrichment_sources: this.enrichment_sources,
    };
  }
}

module.exports = Lead;
