const { logger } = require('../config/logger');
const { sendResponse, sendError } = require('../utils/responseFormatter');

/**
 * Search Service - Extracted from n8n search workflow
 * Handles complex search operations for leads and tasks
 */
class SearchService {
  constructor() {
    this.db = require('../config/database');
  }

  /**
   * Search leads with complex filtering and full-text search
   * @param {number} userId - User performing the search
   * @param {Object} filters - Search filters
   * @returns {Promise<Object>} Search results
   */
  async searchLeads(userId, filters = {}) {
    const startTime = Date.now();
    try {
      const {
        query = '',
        status,
        priority,
        source,
        limit = 50,
        offset = 0
      } = filters;

      // Build the complex search query (extracted from n8n workflow)
      const searchQuery = `
        WITH user_leads AS (
          SELECT * FROM leads
          WHERE (assigned_to = $1 OR created_by = $1)
        )
        SELECT
          lead_id,
          first_name,
          last_name,
          email,
          phone_number,
          source,
          status,
          priority,
          budget_min,
          budget_max,
          desired_location,
          property_type,
          bedrooms_min,
          bathrooms_min,
          notes,
          ai_summary,
          created_at,
          updated_at,
          last_contacted_at
        FROM user_leads
        WHERE (
          -- Full text search across multiple fields
          LOWER(first_name || ' ' || COALESCE(last_name, '') || ' ' ||
                COALESCE(email, '') || ' ' || COALESCE(phone_number, '') || ' ' ||
                COALESCE(notes, '') || ' ' || COALESCE(desired_location, '')) LIKE LOWER($2)
        )
        ${status ? 'AND status = $3' : ''}
        ${priority ? 'AND priority = $4' : ''}
        ${source ? 'AND source = $5' : ''}
        ORDER BY
          -- Prioritize exact matches in name and email
          CASE
            WHEN LOWER(first_name || ' ' || COALESCE(last_name, '')) LIKE LOWER($2) THEN 1
            WHEN LOWER(COALESCE(email, '')) LIKE LOWER($2) THEN 2
            ELSE 3
          END,
          updated_at DESC
        LIMIT $${status ? 6 : priority ? 5 : source ? 4 : 3}
        OFFSET $${status ? 7 : priority ? 6 : source ? 5 : 4}
      `;

      const queryParams = [
        userId,
        `%${query}%`
      ];

      if (status) queryParams.push(status);
      if (priority) queryParams.push(priority);
      if (source) queryParams.push(source);
      queryParams.push(limit, offset);

      const result = await this.db.query(searchQuery, queryParams);

      // Format results (extracted from n8n workflow)
      const formattedLeads = result.rows.map(lead => ({
        leadId: lead.lead_id,
        firstName: lead.first_name,
        lastName: lead.last_name,
        email: lead.email,
        phoneNumber: lead.phone_number,
        source: lead.source,
        status: lead.status,
        priority: lead.priority,
        budgetMin: lead.budget_min,
        budgetMax: lead.budget_max,
        desiredLocation: lead.desired_location,
        propertyType: lead.property_type,
        bedroomsMin: lead.bedrooms_min,
        bathroomsMin: lead.bathrooms_min,
        notes: lead.notes,
        aiSummary: lead.ai_summary,
        createdAt: lead.created_at,
        updatedAt: lead.updated_at,
        lastContactedAt: lead.last_contacted_at
      }));

      // Log the search execution
      const executionTime = Date.now() - startTime;
      await this.logSearchExecution(userId, {
        type: 'leads',
        query,
        filters: { status, priority, source, limit, offset }
      }, formattedLeads.length, executionTime);

      logger.info(`Lead search completed`, {
        userId,
        query,
        resultCount: formattedLeads.length,
        filters: { status, priority, source }
      });

      return {
        success: true,
        data: formattedLeads,
        count: formattedLeads.length,
        hasMore: formattedLeads.length === limit
      };

    } catch (error) {
      logger.error('Lead search error', {
        userId,
        filters,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Lead search failed: ${error.message}`);
    }
  }

  /**
   * Search tasks with complex filtering
   * @param {number} userId - User performing the search
   * @param {Object} filters - Search filters
   * @returns {Promise<Object>} Search results
   */
  async searchTasks(userId, filters = {}) {
    const startTime = Date.now();
    try {
      const {
        query = '',
        completed,
        priority,
        leadId,
        limit = 50,
        offset = 0
      } = filters;

      // Build the complex search query (extracted from n8n workflow)
      const searchQuery = `
        WITH user_tasks AS (
          SELECT t.*,
                 l.first_name,
                 l.last_name,
                 l.email as lead_email
          FROM tasks t
          LEFT JOIN leads l ON t.lead_id = l.lead_id
          WHERE t.created_by = $1
        )
        SELECT
          task_id,
          title,
          description,
          due_date,
          priority,
          completed,
          lead_id,
          first_name as lead_first_name,
          last_name as lead_last_name,
          lead_email,
          created_at,
          updated_at
        FROM user_tasks
        WHERE (
          -- Full text search across task fields
          LOWER(title || ' ' || COALESCE(description, '') || ' ' ||
                COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) LIKE LOWER($2)
        )
        ${completed !== undefined ? 'AND completed = $3' : ''}
        ${priority ? 'AND priority = $4' : ''}
        ${leadId ? 'AND lead_id = $5' : ''}
        ORDER BY
          -- Prioritize exact matches in title
          CASE
            WHEN LOWER(title) LIKE LOWER($2) THEN 1
            WHEN LOWER(COALESCE(description, '')) LIKE LOWER($2) THEN 2
            ELSE 3
          END,
          -- Show pending tasks first, then by due date
          completed ASC,
          CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
          due_date ASC,
          created_at DESC
        LIMIT $${completed !== undefined ? 6 : priority ? 5 : leadId ? 4 : 3}
        OFFSET $${completed !== undefined ? 7 : priority ? 6 : leadId ? 5 : 4}
      `;

      const queryParams = [
        userId,
        `%${query}%`
      ];

      if (completed !== undefined) queryParams.push(completed);
      if (priority) queryParams.push(priority);
      if (leadId) queryParams.push(leadId);
      queryParams.push(limit, offset);

      const result = await this.db.query(searchQuery, queryParams);

      // Format results (extracted from n8n workflow)
      const formattedTasks = result.rows.map(task => ({
        taskId: task.task_id,
        title: task.title,
        description: task.description,
        dueDate: task.due_date,
        priority: task.priority,
        completed: task.completed,
        leadId: task.lead_id,
        leadName: task.lead_first_name && task.lead_last_name
          ? `${task.lead_first_name} ${task.lead_last_name}`
          : null,
        leadEmail: task.lead_email,
        createdAt: task.created_at,
        updatedAt: task.updated_at
      }));

      // Log the search execution
      const executionTime = Date.now() - startTime;
      await this.logSearchExecution(userId, {
        type: 'tasks',
        query,
        filters: { completed, priority, leadId, limit, offset }
      }, formattedTasks.length, executionTime);

      logger.info(`Task search completed`, {
        userId,
        query,
        resultCount: formattedTasks.length,
        filters: { completed, priority, leadId }
      });

      return {
        success: true,
        data: formattedTasks,
        count: formattedTasks.length,
        hasMore: formattedTasks.length === limit
      };

    } catch (error) {
      logger.error('Task search error', {
        userId,
        filters,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Task search failed: ${error.message}`);
    }
  }

  /**
   * Unified search across leads and tasks
   * @param {number} userId - User performing the search
   * @param {Object} filters - Search filters
   * @returns {Promise<Object>} Combined search results
   */
  async unifiedSearch(userId, filters = {}) {
    const startTime = Date.now();
    try {
      const [leadsResult, tasksResult] = await Promise.all([
        this.searchLeads(userId, filters),
        this.searchTasks(userId, filters)
      ]);

      const totalResults = leadsResult.count + tasksResult.count;
      const executionTime = Date.now() - startTime;

      // Log the unified search execution
      await this.logSearchExecution(userId, {
        type: 'unified',
        query: filters.query || '',
        filters: { limit: filters.limit, offset: filters.offset }
      }, totalResults, executionTime);

      return {
        success: true,
        data: {
          leads: leadsResult.data,
          tasks: tasksResult.data
        },
        summary: {
          leadsCount: leadsResult.count,
          tasksCount: tasksResult.count,
          totalCount: totalResults
        }
      };

    } catch (error) {
      logger.error('Unified search error', {
        userId,
        filters,
        error: error.message
      });
      throw new Error(`Unified search failed: ${error.message}`);
    }
  }

  /**
   * Log search execution for analytics
   * @param {number} userId - User performing the search
   * @param {Object} searchQuery - The search query object
   * @param {number} resultCount - Number of results returned
   * @param {number} executionTime - Time taken to execute search in milliseconds
   */
  async logSearchExecution(userId, searchQuery, resultCount, executionTime) {
    try {
      await this.db.query('SELECT log_search_execution($1, $2, $3, $4)',
        [userId, JSON.stringify(searchQuery), resultCount, executionTime]);
    } catch (error) {
      // Log the error but don't fail the search
      logger.warn('Failed to log search execution', {
        userId,
        error: error.message
      });
    }
  }
}

module.exports = new SearchService();