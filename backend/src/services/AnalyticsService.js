const { logger } = require('../config/logger');
const { sendResponse, sendError } = require('../utils/responseFormatter');

/**
 * Analytics Service - Extracted from n8n analytics workflow
 * Handles dashboard statistics and lead analytics
 */
class AnalyticsService {
  constructor() {
    this.db = require('../config/database');
  }

  /**
   * Get dashboard statistics for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Dashboard stats
   */
  async getDashboardStats(userId) {
    try {
      logger.info('Getting dashboard stats', { userId });

      // Complex query extracted from n8n workflow
      const statsQuery = `
        WITH user_leads AS (
          SELECT * FROM leads
          WHERE (assigned_to = $1 OR created_by = $1)
        ),
        user_tasks AS (
          SELECT * FROM tasks
          WHERE created_by = $1
        ),
        user_interactions AS (
          SELECT i.* FROM interactions i
          JOIN user_leads l ON i.lead_id = l.lead_id
        ),
        stats AS (
          SELECT
            -- Total leads
            (SELECT COUNT(*) FROM user_leads) as total_leads,

            -- New leads (last 30 days)
            (SELECT COUNT(*) FROM user_leads WHERE created_at >= NOW() - INTERVAL '30 days') as new_leads,

            -- Active tasks
            (SELECT COUNT(*) FROM user_tasks WHERE completed = false) as active_tasks,

            -- Completed tasks (last 30 days)
            (SELECT COUNT(*) FROM user_tasks WHERE completed = true AND updated_at >= NOW() - INTERVAL '30 days') as completed_tasks,

            -- Leads this month
            (SELECT COUNT(*) FROM user_leads WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)) as leads_this_month,

            -- Conversion rate (Closed Won / Total Leads * 100)
            CASE
              WHEN (SELECT COUNT(*) FROM user_leads) > 0 THEN
                (SELECT COUNT(*) FROM user_leads WHERE status = 'Closed Won') * 100.0 / (SELECT COUNT(*) FROM user_leads)
              ELSE 0
            END as conversion_rate
        )
        SELECT
          total_leads,
          new_leads,
          active_tasks,
          completed_tasks,
          leads_this_month,
          ROUND(conversion_rate, 2) as conversion_rate
        FROM stats
      `;

      const statsResult = await this.db.query(statsQuery, [userId]);
      const stats = statsResult.rows[0];

      // Get recent activity
      const activityQuery = `
        WITH recent_activity AS (
          SELECT
            type,
            content,
            interaction_date,
            'interaction' as activity_type
          FROM user_interactions
          ORDER BY interaction_date DESC
          LIMIT 10
        )
        SELECT * FROM recent_activity
      `;

      const activityResult = await this.db.query(activityQuery);
      const recentActivity = activityResult.rows;

      const dashboardData = {
        totalLeads: parseInt(stats.total_leads) || 0,
        newLeads: parseInt(stats.new_leads) || 0,
        activeTasks: parseInt(stats.active_tasks) || 0,
        completedTasks: parseInt(stats.completed_tasks) || 0,
        leadsThisMonth: parseInt(stats.leads_this_month) || 0,
        conversionRate: parseFloat(stats.conversion_rate) || 0,
        recentActivity: recentActivity
      };

      logger.info('Dashboard stats retrieved', {
        userId,
        totalLeads: dashboardData.totalLeads,
        conversionRate: dashboardData.conversionRate
      });

      return {
        success: true,
        data: dashboardData
      };

    } catch (error) {
      logger.error('Error getting dashboard stats', {
        userId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to get dashboard stats: ${error.message}`);
    }
  }

  /**
   * Get lead statistics with various breakdowns
   * @param {number} userId - User ID
   * @param {string} timeframe - Timeframe filter
   * @returns {Promise<Object>} Lead statistics
   */
  async getLeadStats(userId, timeframe = 'month') {
    try {
      logger.info('Getting lead stats', { userId, timeframe });

      // Complex query extracted from n8n workflow
      const statsQuery = `
        WITH user_leads AS (
          SELECT * FROM leads
          WHERE (assigned_to = $1 OR created_by = $1)
          AND created_at >=
            CASE
              WHEN $2 = 'week' THEN NOW() - INTERVAL '7 days'
              WHEN $2 = 'quarter' THEN NOW() - INTERVAL '3 months'
              ELSE NOW() - INTERVAL '1 month'
            END
        ),
        -- Leads by Status
        leads_by_status AS (
          SELECT
            status,
            COUNT(*) as count
          FROM user_leads
          GROUP BY status
          ORDER BY count DESC
        ),
        -- Leads by Source
        leads_by_source AS (
          SELECT
            source,
            COUNT(*) as count
          FROM user_leads
          GROUP BY source
          ORDER BY count DESC
        ),
        -- Leads by Priority
        leads_by_priority AS (
          SELECT
            priority,
            COUNT(*) as count
          FROM user_leads
          GROUP BY priority
          ORDER BY count DESC
        ),
        -- Leads over Time
        leads_over_time AS (
          SELECT
            DATE(created_at) as date,
            COUNT(*) as count
          FROM user_leads
          WHERE created_at >=
            CASE
              WHEN $2 = 'week' THEN NOW() - INTERVAL '7 days'
              WHEN $2 = 'quarter' THEN NOW() - INTERVAL '3 months'
              ELSE NOW() - INTERVAL '1 month'
            END
          GROUP BY DATE(created_at)
          ORDER BY date
        )
        SELECT
          'status' as category,
          json_agg(json_build_object('status', status, 'count', count)) as data
        FROM leads_by_status
        UNION ALL
        SELECT
          'source' as category,
          json_agg(json_build_object('source', source, 'count', count)) as data
        FROM leads_by_source
        UNION ALL
        SELECT
          'priority' as category,
          json_agg(json_build_object('priority', priority, 'count', count)) as data
        FROM leads_by_priority
        UNION ALL
        SELECT
          'time' as category,
          json_agg(json_build_object('date', date, 'count', count)) as data
        FROM leads_over_time
      `;

      const result = await this.db.query(statsQuery, [userId, timeframe]);
      const rows = result.rows;

      // Process the results into organized format
      const response = {
        leadsByStatus: [],
        leadsBySource: [],
        leadsByPriority: [],
        leadsOverTime: []
      };

      // Process each category
      rows.forEach(row => {
        if (!row.category || !row.data) return;

        switch (row.category) {
          case 'status':
            response.leadsByStatus = row.data || [];
            break;
          case 'source':
            response.leadsBySource = row.data || [];
            break;
          case 'priority':
            response.leadsByPriority = row.data || [];
            break;
          case 'time':
            response.leadsOverTime = row.data || [];
            break;
        }
      });

      logger.info('Lead stats retrieved', {
        userId,
        timeframe,
        statusCount: response.leadsByStatus.length,
        sourceCount: response.leadsBySource.length
      });

      return {
        success: true,
        data: response
      };

    } catch (error) {
      logger.error('Error getting lead stats', {
        userId,
        timeframe,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to get lead stats: ${error.message}`);
    }
  }

  /**
   * Get comprehensive analytics report
   * @param {number} userId - User ID
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Analytics report
   */
  async getAnalyticsReport(userId, options = {}) {
    try {
      const { timeframe = 'month', includeRecentActivity = true } = options;

      logger.info('Getting analytics report', {
        userId,
        timeframe,
        includeRecentActivity
      });

      // Get dashboard stats and lead stats in parallel
      const [dashboardResult, leadStatsResult] = await Promise.all([
        this.getDashboardStats(userId),
        this.getLeadStats(userId, timeframe)
      ]);

      if (!dashboardResult.success || !leadStatsResult.success) {
        throw new Error('Failed to retrieve analytics data');
      }

      const report = {
        userId,
        timeframe,
        generatedAt: new Date().toISOString(),
        dashboard: dashboardResult.data,
        leadStats: leadStatsResult.data,
        summary: {
          totalLeads: dashboardResult.data.totalLeads,
          conversionRate: dashboardResult.data.conversionRate,
          activeTasks: dashboardResult.data.activeTasks,
          topLeadSource: this.getTopItem(leadStatsResult.data.leadsBySource, 'source'),
          topLeadStatus: this.getTopItem(leadStatsResult.data.leadsByStatus, 'status'),
          leadsTrend: this.calculateTrend(leadStatsResult.data.leadsOverTime)
        }
      };

      // Add recent activity if requested
      if (includeRecentActivity) {
        report.recentActivity = dashboardResult.data.recentActivity;
      }

      logger.info('Analytics report generated', {
        userId,
        totalLeads: report.summary.totalLeads,
        conversionRate: report.summary.conversionRate
      });

      return {
        success: true,
        report
      };

    } catch (error) {
      logger.error('Error getting analytics report', {
        userId,
        options,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to get analytics report: ${error.message}`);
    }
  }

  /**
   * Get top item from an array of objects
   * @param {Array} items - Array of items
   * @param {string} key - Key to extract
   * @returns {string} Top item value
   */
  getTopItem(items, key) {
    if (!items || items.length === 0) return 'N/A';

    const topItem = items.reduce((max, item) =>
      item.count > max.count ? item : max
    );

    return topItem[key] || 'N/A';
  }

  /**
   * Calculate trend from time series data
   * @param {Array} timeData - Time series data
   * @returns {string} Trend description
   */
  calculateTrend(timeData) {
    if (!timeData || timeData.length < 2) return 'insufficient_data';

    const recent = timeData.slice(-7); // Last 7 days
    const earlier = timeData.slice(-14, -7); // Previous 7 days

    if (recent.length === 0 || earlier.length === 0) return 'insufficient_data';

    const recentAvg = recent.reduce((sum, item) => sum + item.count, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, item) => sum + item.count, 0) / earlier.length;

    const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;

    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * Get performance metrics for analytics
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Performance metrics
   */
  async getPerformanceMetrics(userId) {
    try {
      logger.info('Getting performance metrics', { userId });

      const metricsQuery = `
        WITH user_leads AS (
          SELECT * FROM leads
          WHERE (assigned_to = $1 OR created_by = $1)
        ),
        user_tasks AS (
          SELECT * FROM tasks
          WHERE created_by = $1
        ),
        performance AS (
          SELECT
            -- Lead conversion metrics
            (SELECT COUNT(*) FROM user_leads WHERE status = 'Closed Won') as won_leads,
            (SELECT COUNT(*) FROM user_leads WHERE status = 'Closed Lost') as lost_leads,
            (SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400)
             FROM user_leads
             WHERE status IN ('Closed Won', 'Closed Lost') AND updated_at IS NOT NULL) as avg_lead_time,

            -- Task completion metrics
            (SELECT COUNT(*) FROM user_tasks WHERE completed = true) as completed_tasks,
            (SELECT COUNT(*) FROM user_tasks) as total_tasks,
            (SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400)
             FROM user_tasks
             WHERE completed = true AND updated_at IS NOT NULL) as avg_task_time,

            -- Activity metrics
            (SELECT COUNT(*) FROM interactions i JOIN user_leads l ON i.lead_id = l.lead_id) as total_interactions,
            (SELECT COUNT(*) FROM user_leads WHERE created_at >= NOW() - INTERVAL '30 days') as leads_last_30_days
        )
        SELECT * FROM performance
      `;

      const result = await this.db.query(metricsQuery, [userId]);
      const metrics = result.rows[0];

      const performanceData = {
        leads: {
          won: parseInt(metrics.won_leads) || 0,
          lost: parseInt(metrics.lost_leads) || 0,
          total: (parseInt(metrics.won_leads) || 0) + (parseInt(metrics.lost_leads) || 0),
          avgTimeToClose: Math.round((parseFloat(metrics.avg_lead_time) || 0) * 100) / 100,
          last30Days: parseInt(metrics.leads_last_30_days) || 0
        },
        tasks: {
          completed: parseInt(metrics.completed_tasks) || 0,
          total: parseInt(metrics.total_tasks) || 0,
          completionRate: parseInt(metrics.total_tasks) > 0
            ? Math.round((parseInt(metrics.completed_tasks) / parseInt(metrics.total_tasks)) * 100)
            : 0,
          avgTimeToComplete: Math.round((parseFloat(metrics.avg_task_time) || 0) * 100) / 100
        },
        interactions: {
          total: parseInt(metrics.total_interactions) || 0
        }
      };

      logger.info('Performance metrics retrieved', {
        userId,
        leadConversionRate: performanceData.leads.total > 0
          ? Math.round((performanceData.leads.won / performanceData.leads.total) * 100)
          : 0,
        taskCompletionRate: performanceData.tasks.completionRate
      });

      return {
        success: true,
        metrics: performanceData
      };

    } catch (error) {
      logger.error('Error getting performance metrics', {
        userId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to get performance metrics: ${error.message}`);
    }
  }
}

module.exports = new AnalyticsService();