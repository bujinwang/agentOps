
/**
 * Advanced Search Functionality for Leads
 * Provides comprehensive search with multiple filters
 */

const { getDatabase } = require('../config/database');
const Lead = require('./Lead');

class LeadSearch {
  /**
   * Advanced search with comprehensive filters
   * @param {number} userId - User ID performing the search
   * @param {Object} filters - Search filters
   * @returns {Object} Search results with pagination
   */
  static async searchLeads(userId, filters = {}) {
    const db = getDatabase();
    const {
      searchTerm,
      status,
      priority,
      source,
      propertyType,
      dateFrom,
      dateTo,
      budgetMin,
      budgetMax,
      bedroomsMin,
      bathroomsMin,
      location,
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = filters;

    const validPage = Math.max(1, parseInt(page));
    const validLimit = Math.min(Math.max(1, parseInt(limit)), 200);
    const offset = (validPage - 1) * validLimit;

    let whereConditions = ['user_id = $1'];
    let queryParams = [userId];
    let paramIndex = 1;

    // Text search across multiple fields
    if (searchTerm) {
      paramIndex++;
      whereConditions.push(`(
        first_name ILIKE $${paramIndex} OR 
        last_name ILIKE $${paramIndex} OR 
        email ILIKE $${paramIndex} OR 
        desired_location ILIKE $${paramIndex} OR 
        notes ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${searchTerm}%`);
    }

    // Status filter
    if (status) {
      paramIndex++;
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(status);
    }

    // Priority filter
    if (priority) {
      paramIndex++;
      whereConditions.push(`priority = $${paramIndex}`);
      queryParams.push(priority);
    }

    // Source filter
    if (source) {
      paramIndex++;
      whereConditions.push(`source = $${paramIndex}`);
      queryParams.push(source);
    }

    // Property type filter
    if (propertyType) {
      paramIndex++;
      whereConditions.push(`property_type = $${paramIndex}`);
      queryParams.push(propertyType);
    }

    // Date range filters
    if (dateFrom) {
      paramIndex++;
      whereConditions.push(`created_at >= $${paramIndex}`);
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      paramIndex++;
      whereConditions.push(`created_at <= $${paramIndex}`);
      queryParams.push(dateTo);
    }

    // Budget range filters
    if (budgetMin !== undefined && budgetMin !== null) {
      paramIndex++;
      whereConditions.push(`budget_min >= $${paramIndex}`);
      queryParams.push(budgetMin);
    }

    if (budgetMax !== undefined && budgetMax !== null) {
      paramIndex++;
      whereConditions.push(`budget_max <= $${paramIndex}`);
      queryParams.push(budgetMax);
    }

    // Bedrooms filter
    if (bedroomsMin !== undefined && bedroomsMin !== null) {
      paramIndex++;
      whereConditions.push(`bedrooms_min >= $${paramIndex}`);
      queryParams.push(bedroomsMin);
    }

    // Bathrooms filter
    if (bathroomsMin !== undefined && bathroomsMin !== null) {
      paramIndex++;
      whereConditions.push(`bathrooms_min >= $${paramIndex}`);
      queryParams.push(bathroomsMin);
    }

    // Location filter
    if (location) {
      paramIndex++;
      whereConditions.push(`desired_location ILIKE $${paramIndex}`);
      queryParams.push(`%${location}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const sortField = sortBy.replace(/([A-Z])/g, '_$1').toLowerCase();
    const sortDirection = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const searchQuery = `
      SELECT * FROM leads
      ${whereClause}
      ORDER BY ${sortField} ${sortDirection}
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;

    queryParams.push(validLimit, offset);

    const countQuery = `SELECT COUNT(*) as total FROM leads ${whereClause}`;
    const countParams = queryParams.slice(0, paramIndex);

    const [leadsResult, countResult] = await Promise.all([
      db.query(searchQuery, queryParams),
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

  /**
   * Get search suggestions based on partial input
   * @param {number} userId - User ID
   * @param {string} partial - Partial search term
   * @param {string} field - Field to search in
   * @returns {Array} Array of suggestions
   */
  static async getSearchSuggestions(userId, partial, field = 'all') {
    const db = getDatabase();
    const validFields = ['first_name', 'last_name', 'email', 'desired_location', 'source', 'all'];
    
    if (!validFields.includes(field)) {
      field = 'all';
    }

    let whereCondition = 'user_id = $1';
    let query = '';
    let params = [userId];

    if (field === 'all') {
      whereCondition += ` AND (
        first_name ILIKE $2 OR
        last_name ILIKE $2 OR
        email ILIKE $2 OR
        desired_location ILIKE $2 OR
        source ILIKE $2
      )`;
      params.push(`%${partial}%`);
      
      query = `
        SELECT DISTINCT
          CASE
            WHEN first_name ILIKE $2 THEN first_name
            WHEN last_name ILIKE $2 THEN last_name
            WHEN email ILIKE $2 THEN email
            WHEN desired_location ILIKE $2 THEN desired_location
            WHEN source ILIKE $2 THEN source
          END as suggestion,
          CASE
            WHEN first_name ILIKE $2 THEN 'first_name'
            WHEN last_name ILIKE $2 THEN 'last_name'
            WHEN email ILIKE $2 THEN 'email'
            WHEN desired_location ILIKE $2 THEN 'desired_location'
            WHEN source ILIKE $2 THEN 'source'
          END as field
        FROM leads
        WHERE ${whereCondition}
        LIMIT 10
      `;
    } else {
      whereCondition += ` AND ${field} ILIKE $2`;
      params.push(`%${partial}%`);
      
      query = `
        SELECT DISTINCT ${field} as suggestion, '${field}' as field
        FROM leads
        WHERE ${whereCondition}
        LIMIT 10
      `;
    }

    const result = await db.query(query, params);
    return result.rows;
  }
}

module.exports = LeadSearch;