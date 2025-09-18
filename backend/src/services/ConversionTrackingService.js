const { logger } = require('../config/logger');
const { sendResponse, sendError } = require('../utils/responseFormatter');

/**
 * Conversion Tracking Service - Extracted from n8n conversion tracking workflow
 * Handles lead conversion events, timelines, and funnel analytics
 */
class ConversionTrackingService {
  constructor() {
    this.db = require('../config/database');
  }

  /**
   * Log a conversion event for a lead
   * @param {number} leadId - Lead ID
   * @param {Object} eventData - Event data
   * @param {number} userId - User ID performing the action
   * @returns {Promise<Object>} Event result
   */
  async logConversionEvent(leadId, eventData, userId) {
    try {
      const { eventType, eventDescription, eventData: additionalData } = eventData;

      if (!eventType || !eventDescription) {
        throw new Error('Event type and description are required');
      }

      // Insert conversion event
      const query = `
        INSERT INTO conversion_events
        (lead_id, event_type, event_description, event_data, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING event_id, created_at
      `;

      const params = [
        leadId,
        eventType,
        eventDescription,
        JSON.stringify(additionalData || {}),
        userId
      ];

      const result = await this.db.query(query, params);

      logger.info('Conversion event logged', {
        leadId,
        eventType,
        eventId: result.rows[0].event_id,
        userId
      });

      return {
        success: true,
        eventId: result.rows[0].event_id,
        createdAt: result.rows[0].created_at
      };

    } catch (error) {
      logger.error('Error logging conversion event', {
        leadId,
        eventData,
        userId,
        error: error.message
      });
      throw new Error(`Failed to log conversion event: ${error.message}`);
    }
  }

  /**
   * Get conversion timeline for a lead
   * @param {number} leadId - Lead ID
   * @returns {Promise<Object>} Timeline data
   */
  async getConversionTimeline(leadId) {
    try {
      const query = `
        SELECT
          event_id,
          event_type,
          event_description,
          event_data,
          created_by,
          created_at
        FROM conversion_events
        WHERE lead_id = $1
        ORDER BY created_at DESC
      `;

      const result = await this.db.query(query, [leadId]);

      const timeline = result.rows.map(event => ({
        eventId: event.event_id,
        eventType: event.event_type,
        eventDescription: event.event_description,
        eventData: event.event_data,
        createdBy: event.created_by,
        createdAt: event.created_at
      }));

      logger.info('Conversion timeline retrieved', {
        leadId,
        eventCount: timeline.length
      });

      return {
        success: true,
        leadId,
        timeline,
        totalEvents: timeline.length
      };

    } catch (error) {
      logger.error('Error getting conversion timeline', {
        leadId,
        error: error.message
      });
      throw new Error(`Failed to get conversion timeline: ${error.message}`);
    }
  }

  /**
   * Update conversion status for a lead
   * @param {number} leadId - Lead ID
   * @param {string} newStatus - New conversion status
   * @param {string} newStage - New funnel stage
   * @param {number} userId - User ID performing the action
   * @returns {Promise<Object>} Update result
   */
  async updateConversionStatus(leadId, newStatus, newStage, userId) {
    try {
      // Update lead status
      const updateQuery = `
        UPDATE leads
        SET
          conversion_status = $2,
          current_funnel_stage = $3,
          updated_at = NOW()
        WHERE lead_id = $1
        RETURNING lead_id, conversion_status, current_funnel_stage, updated_at
      `;

      const updateResult = await this.db.query(updateQuery, [leadId, newStatus, newStage]);

      if (updateResult.rows.length === 0) {
        throw new Error('Lead not found');
      }

      const updatedLead = updateResult.rows[0];

      // Log the status change as a conversion event
      await this.logConversionEvent(
        leadId,
        {
          eventType: 'status_change',
          eventDescription: `Lead status updated to ${newStatus}`,
          eventData: {
            oldStatus: null, // Would need to be passed in from frontend
            newStatus,
            newStage,
            updatedBy: userId
          }
        },
        userId
      );

      logger.info('Conversion status updated', {
        leadId,
        newStatus,
        newStage,
        userId
      });

      return {
        success: true,
        leadId: updatedLead.lead_id,
        newStatus: updatedLead.conversion_status,
        newStage: updatedLead.current_funnel_stage,
        updatedAt: updatedLead.updated_at
      };

    } catch (error) {
      logger.error('Error updating conversion status', {
        leadId,
        newStatus,
        newStage,
        userId,
        error: error.message
      });
      throw new Error(`Failed to update conversion status: ${error.message}`);
    }
  }

  /**
   * Get conversion funnel analytics
   * @returns {Promise<Object>} Funnel data
   */
  async getConversionFunnel() {
    try {
      // This would typically query a conversion_funnel_analytics table
      // For now, return mock data structure
      const funnelData = {
        funnelName: 'Standard Real Estate Conversion Funnel',
        stages: [
          {
            stage: 'Lead Generation',
            count: 1000,
            percentage: 100,
            conversionRate: 100
          },
          {
            stage: 'Initial Contact',
            count: 750,
            percentage: 75,
            conversionRate: 75
          },
          {
            stage: 'Property Showing',
            count: 400,
            percentage: 40,
            conversionRate: 53.3
          },
          {
            stage: 'Offer Submitted',
            count: 150,
            percentage: 15,
            conversionRate: 37.5
          },
          {
            stage: 'Closed Won',
            count: 120,
            percentage: 12,
            conversionRate: 80
          }
        ],
        totalLeads: 1000,
        totalConversions: 120,
        overallConversionRate: 12,
        averageTimeToConvert: 45, // days
        lastUpdated: new Date().toISOString()
      };

      logger.info('Conversion funnel data retrieved');

      return {
        success: true,
        funnelData
      };

    } catch (error) {
      logger.error('Error getting conversion funnel', {
        error: error.message
      });
      throw new Error(`Failed to get conversion funnel: ${error.message}`);
    }
  }

  /**
   * Get conversion metrics for a user
   * @param {number} userId - User ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Conversion metrics
   */
  async getConversionMetrics(userId, filters = {}) {
    try {
      const { timeframe = 'month', leadId } = filters;

      // Build the query based on filters
      let whereClause = '(assigned_to = $1 OR created_by = $1)';
      const params = [userId];
      let paramIndex = 2;

      if (leadId) {
        whereClause += ` AND lead_id = $${paramIndex}`;
        params.push(leadId);
        paramIndex++;
      }

      // Add timeframe filter
      const timeframeFilter = this.getTimeframeFilter(timeframe);
      if (timeframeFilter) {
        whereClause += ` AND created_at >= ${timeframeFilter}`;
      }

      const metricsQuery = `
        WITH user_leads AS (
          SELECT * FROM leads WHERE ${whereClause}
        ),
        conversion_events AS (
          SELECT * FROM conversion_events ce
          WHERE ce.lead_id IN (SELECT lead_id FROM user_leads)
        )
        SELECT
          (SELECT COUNT(*) FROM user_leads) as total_leads,
          (SELECT COUNT(*) FROM user_leads WHERE conversion_status = 'Closed Won') as converted_leads,
          (SELECT COUNT(*) FROM user_leads WHERE conversion_status = 'Closed Lost') as lost_leads,
          (SELECT COUNT(*) FROM conversion_events) as total_events,
          (SELECT COUNT(DISTINCT lead_id) FROM conversion_events) as leads_with_events,
          (SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400)
           FROM user_leads
           WHERE conversion_status = 'Closed Won' AND updated_at IS NOT NULL) as avg_conversion_time
      `;

      const result = await this.db.query(metricsQuery, params);
      const metrics = result.rows[0];

      const conversionRate = metrics.total_leads > 0
        ? (metrics.converted_leads / metrics.total_leads) * 100
        : 0;

      const response = {
        totalLeads: parseInt(metrics.total_leads) || 0,
        convertedLeads: parseInt(metrics.converted_leads) || 0,
        lostLeads: parseInt(metrics.lost_leads) || 0,
        conversionRate: Math.round(conversionRate * 100) / 100,
        totalEvents: parseInt(metrics.total_events) || 0,
        leadsWithEvents: parseInt(metrics.leads_with_events) || 0,
        avgConversionTime: Math.round((parseFloat(metrics.avg_conversion_time) || 0) * 100) / 100,
        timeframe,
        generatedAt: new Date().toISOString()
      };

      logger.info('Conversion metrics retrieved', {
        userId,
        totalLeads: response.totalLeads,
        conversionRate: response.conversionRate
      });

      return {
        success: true,
        metrics: response
      };

    } catch (error) {
      logger.error('Error getting conversion metrics', {
        userId,
        filters,
        error: error.message
      });
      throw new Error(`Failed to get conversion metrics: ${error.message}`);
    }
  }

  /**
   * Get timeframe filter SQL
   * @param {string} timeframe - Timeframe string
   * @returns {string} SQL filter
   */
  getTimeframeFilter(timeframe) {
    const now = new Date();
    let startDate;

    switch (timeframe) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        return null;
    }

    return `'${startDate.toISOString()}'`;
  }
}

module.exports = new ConversionTrackingService();