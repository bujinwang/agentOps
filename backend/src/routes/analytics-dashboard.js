const express = require('express');
const { extractUserFromToken } = require('../middleware/jwtExtractor');
const AnalyticsService = require('../services/AnalyticsService');
const { logger } = require('../config/logger');
const { sendResponse, sendError } = require('../utils/responseFormatter');

const router = express.Router();

// All routes require authentication
router.use(extractUserFromToken);

/**
 * GET /api/analytics/dashboard
 * Get dashboard statistics
 * Replaces n8n analytics workflow
 */
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.userId;

    logger.info('Get dashboard stats request', { userId });

    const result = await AnalyticsService.getDashboardStats(userId);

    if (result.success) {
      sendResponse(res, result.data, 'Dashboard statistics retrieved successfully');
    } else {
      sendError(res, 'Failed to get dashboard statistics', 'DASHBOARD_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Get dashboard stats error', {
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get dashboard statistics', 'DASHBOARD_ERROR', null, 500);
  }
});

/**
 * GET /api/analytics/leads
 * Get lead statistics with breakdowns
 * Replaces n8n analytics workflow
 */
router.get('/leads', async (req, res) => {
  try {
    const userId = req.user.userId;
    const timeframe = req.query.timeframe || 'month';

    logger.info('Get lead stats request', {
      userId,
      timeframe
    });

    const result = await AnalyticsService.getLeadStats(userId, timeframe);

    if (result.success) {
      sendResponse(res, result.data, 'Lead statistics retrieved successfully');
    } else {
      sendError(res, 'Failed to get lead statistics', 'LEAD_STATS_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Get lead stats error', {
      userId: req.user?.userId,
      timeframe: req.query.timeframe,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get lead statistics', 'LEAD_STATS_ERROR', null, 500);
  }
});

/**
 * GET /api/analytics/report
 * Get comprehensive analytics report
 */
router.get('/report', async (req, res) => {
  try {
    const userId = req.user.userId;
    const options = {
      timeframe: req.query.timeframe || 'month',
      includeRecentActivity: req.query.includeActivity === 'true'
    };

    logger.info('Get analytics report request', {
      userId,
      options
    });

    const result = await AnalyticsService.getAnalyticsReport(userId, options);

    if (result.success) {
      sendResponse(res, result.report, 'Analytics report generated successfully');
    } else {
      sendError(res, 'Failed to generate analytics report', 'REPORT_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Get analytics report error', {
      userId: req.user?.userId,
      options: req.query,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to generate analytics report', 'REPORT_ERROR', null, 500);
  }
});

/**
 * GET /api/analytics/performance
 * Get performance metrics
 */
router.get('/performance', async (req, res) => {
  try {
    const userId = req.user.userId;

    logger.info('Get performance metrics request', { userId });

    const result = await AnalyticsService.getPerformanceMetrics(userId);

    if (result.success) {
      sendResponse(res, result.metrics, 'Performance metrics retrieved successfully');
    } else {
      sendError(res, 'Failed to get performance metrics', 'PERFORMANCE_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Get performance metrics error', {
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get performance metrics', 'PERFORMANCE_ERROR', null, 500);
  }
});

/**
 * GET /api/analytics/summary
 * Get analytics summary for quick overview
 */
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.userId;

    logger.info('Get analytics summary request', { userId });

    // Get dashboard stats for summary
    const result = await AnalyticsService.getDashboardStats(userId);

    if (result.success) {
      const summary = {
        totalLeads: result.data.totalLeads,
        newLeads: result.data.newLeads,
        conversionRate: result.data.conversionRate,
        activeTasks: result.data.activeTasks,
        recentActivityCount: result.data.recentActivity?.length || 0,
        lastUpdated: new Date().toISOString()
      };

      sendResponse(res, summary, 'Analytics summary retrieved successfully');
    } else {
      sendError(res, 'Failed to get analytics summary', 'SUMMARY_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Get analytics summary error', {
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get analytics summary', 'SUMMARY_ERROR', null, 500);
  }
});

/**
 * GET /api/analytics/export
 * Export analytics data (placeholder for future implementation)
 */
router.get('/export', async (req, res) => {
  try {
    const userId = req.user.userId;
    const format = (req.query.format || 'json').toString().toLowerCase();
    const timeframe = req.query.timeframe || 'month';

    logger.info('Export analytics request', {
      userId,
      format,
      timeframe
    });

    const result = await AnalyticsService.getAnalyticsReport(userId, {
      timeframe,
      includeRecentActivity: true
    });

    if (!result.success) {
      return sendError(res, 'Failed to export analytics data', 'EXPORT_ERROR', null, 500);
    }

    const report = result.report;
    const exportedAt = new Date().toISOString();

    if (format === 'csv') {
      const lines = [];
      const push = (section, metric, value) => {
        lines.push(`"${section}","${metric}","${String(value).replace(/"/g, '""')}"`);
      };

      push('Summary', 'Timeframe', report.timeframe);
      push('Summary', 'Generated At', report.generatedAt);
      push('Summary', 'Total Leads', report.dashboard.totalLeads);
      push('Summary', 'Conversion Rate (%)', report.dashboard.conversionRate);
      push('Summary', 'Active Tasks', report.dashboard.activeTasks);

      report.leadStats.leadsByStatus.forEach((item) =>
        push('Lead Status', item.status, item.count)
      );

      report.leadStats.leadsBySource.forEach((item) =>
        push('Lead Source', item.source, item.count)
      );

      report.leadStats.leadsByPriority.forEach((item) =>
        push('Lead Priority', item.priority, item.count)
      );

      report.leadStats.leadsOverTime.forEach((item) =>
        push('Lead Timeline', item.date, item.count)
      );

      if (report.recentActivity?.length) {
        report.recentActivity.forEach((activity) =>
          push('Recent Activity', activity.type, activity.interaction_date || activity.created_at)
        );
      }

      const header = 'Section,Metric,Value';
      const csv = [header, ...lines].join('\n');
      const filename = `analytics-${timeframe}-${exportedAt.split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csv);
    }

    if (format !== 'json') {
      return sendError(res, `Unsupported export format: ${format}`, 'EXPORT_INVALID_FORMAT', null, 400);
    }

    const exportData = {
      metadata: {
        userId,
        timeframe,
        format,
        exportedAt
      },
      data: report
    };

    sendResponse(res, exportData, 'Analytics data exported successfully');

  } catch (error) {
    logger.error('Export analytics error', {
      userId: req.user?.userId,
      format: req.query.format,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to export analytics data', 'EXPORT_ERROR', null, 500);
  }
});

/**
 * GET /api/analytics/trends
 * Get analytics trends over time
 */
router.get('/trends', async (req, res) => {
  try {
    const userId = req.user.userId;
    const period = req.query.period || '30days'; // 7days, 30days, 90days, 1year

    logger.info('Get analytics trends request', {
      userId,
      period
    });

    // Get lead stats for different timeframes to calculate trends
    const timeframes = ['week', 'month'];
    const trendPromises = timeframes.map(timeframe =>
      AnalyticsService.getLeadStats(userId, timeframe)
    );

    const results = await Promise.all(trendPromises);

    if (results.every(result => result.success)) {
      const trends = {
        period,
        leadTrends: {
          weekly: results[0].data,
          monthly: results[1].data
        },
        calculatedAt: new Date().toISOString()
      };

      sendResponse(res, trends, 'Analytics trends retrieved successfully');
    } else {
      sendError(res, 'Failed to get analytics trends', 'TRENDS_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Get analytics trends error', {
      userId: req.user?.userId,
      period: req.query.period,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get analytics trends', 'TRENDS_ERROR', null, 500);
  }
});

module.exports = router;
