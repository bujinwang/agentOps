const express = require('express');
const { query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { ERROR_MESSAGES } = require('../config/constants');
const { logger } = require('../config/logger');
const { getDatabase } = require('../config/database');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please check your input',
      details: errors.array()
    });
  }
  next();
};

// Get dashboard statistics
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const db = getDatabase();

    // Get overall statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'New' THEN 1 END) as new_leads,
        COUNT(CASE WHEN status = 'Contacted' THEN 1 END) as contacted_leads,
        COUNT(CASE WHEN status = 'Qualified' THEN 1 END) as qualified_leads,
        COUNT(CASE WHEN status = 'Closed Won' THEN 1 END) as closed_won,
        COUNT(CASE WHEN status = 'Closed Lost' THEN 1 END) as closed_lost,
        COUNT(CASE WHEN priority = 'High' THEN 1 END) as high_priority_leads,
        COUNT(CASE WHEN follow_up_date <= NOW() THEN 1 END) as overdue_follow_ups,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN 1 END) as leads_this_month,
        CASE 
          WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(CASE WHEN status = 'Closed Won' THEN 1 END) * 100.0 / COUNT(*)), 1)
          ELSE 0 
        END as conversion_rate
      FROM leads
      WHERE user_id = $1
    `;

    // Get task statistics
    const taskStatsQuery = `
      SELECT 
        COUNT(CASE WHEN is_completed = false THEN 1 END) as active_tasks,
        COUNT(CASE WHEN is_completed = true THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN due_date <= NOW() AND is_completed = false THEN 1 END) as overdue_tasks
      FROM tasks
      WHERE user_id = $1
    `;

    // Get recent activity (interactions)
    const recentActivityQuery = `
      SELECT 
        i.interaction_id,
        i.type,
        i.content,
        i.interaction_date,
        i.created_at,
        l.first_name,
        l.last_name,
        l.email
      FROM interactions i
      LEFT JOIN leads l ON i.lead_id = l.lead_id
      WHERE i.user_id = $1
      ORDER BY i.interaction_date DESC
      LIMIT 10
    `;

    const [statsResult, taskStatsResult, recentActivityResult] = await Promise.all([
      db.query(statsQuery, [userId]),
      db.query(taskStatsQuery, [userId]),
      db.query(recentActivityQuery, [userId])
    ]);

    const stats = statsResult.rows[0];
    const taskStats = taskStatsResult.rows[0];
    
    // Format recent activity
    const recentActivity = recentActivityResult.rows.map(row => ({
      interactionId: row.interaction_id,
      type: row.type,
      content: row.content,
      interactionDate: row.interaction_date,
      createdAt: row.created_at,
      lead: row.first_name ? {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email
      } : null
    }));

    const dashboardStats = {
      totalLeads: parseInt(stats.total_leads),
      newLeads: parseInt(stats.new_leads),
      activeTasks: parseInt(taskStats.active_tasks),
      completedTasks: parseInt(taskStats.completed_tasks),
      leadsThisMonth: parseInt(stats.leads_this_month),
      conversionRate: parseFloat(stats.conversion_rate),
      recentActivity: recentActivity
    };

    res.json({
      message: 'Dashboard statistics retrieved successfully',
      data: dashboardStats
    });
  } catch (error) {
    logger.error('Error getting dashboard stats:', error);
    res.status(500).json({
      error: 'Failed to get dashboard statistics',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Get lead analytics by timeframe
router.get('/leads', authenticate, [
  query('timeframe').optional().isIn(['week', 'month', 'quarter']).withMessage('Timeframe must be week, month, or quarter')
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const timeframe = req.query.timeframe || 'month';
    const db = getDatabase();

    // Calculate date range based on timeframe
    let dateFilter = '';
    switch (timeframe) {
      case 'week':
        dateFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
        break;
      case 'quarter':
        dateFilter = "AND created_at >= NOW() - INTERVAL '90 days'";
        break;
    }

    // Get leads by status
    const statusQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM leads
      WHERE user_id = $1 ${dateFilter}
      GROUP BY status
      ORDER BY count DESC
    `;

    // Get leads by source
    const sourceQuery = `
      SELECT 
        source,
        COUNT(*) as count
      FROM leads
      WHERE user_id = $1 ${dateFilter}
      GROUP BY source
      ORDER BY count DESC
    `;

    // Get leads by priority
    const priorityQuery = `
      SELECT 
        priority,
        COUNT(*) as count
      FROM leads
      WHERE user_id = $1 ${dateFilter}
      GROUP BY priority
      ORDER BY count DESC
    `;

    // Get leads over time (daily for week, weekly for month, monthly for quarter)
    let timeGroupBy = 'DATE(created_at)';
    let timeOrderBy = 'DATE(created_at)';
    
    if (timeframe === 'month') {
      timeGroupBy = "DATE_TRUNC('week', created_at)";
      timeOrderBy = "DATE_TRUNC('week', created_at)";
    } else if (timeframe === 'quarter') {
      timeGroupBy = "DATE_TRUNC('month', created_at)";
      timeOrderBy = "DATE_TRUNC('month', created_at)";
    }

    const overTimeQuery = `
      SELECT 
        ${timeGroupBy} as date,
        COUNT(*) as count
      FROM leads
      WHERE user_id = $1 ${dateFilter}
      GROUP BY ${timeGroupBy}
      ORDER BY ${timeOrderBy}
    `;

    const [statusResult, sourceResult, priorityResult, overTimeResult] = await Promise.all([
      db.query(statusQuery, [userId]),
      db.query(sourceQuery, [userId]),
      db.query(priorityQuery, [userId]),
      db.query(overTimeQuery, [userId])
    ]);

    // Format results
    const leadsByStatus = statusResult.rows.map(row => ({
      status: row.status,
      count: parseInt(row.count)
    }));

    const leadsBySource = sourceResult.rows.map(row => ({
      source: row.source,
      count: parseInt(row.count)
    }));

    const leadsByPriority = priorityResult.rows.map(row => ({
      priority: row.priority,
      count: parseInt(row.count)
    }));

    const leadsOverTime = overTimeResult.rows.map(row => ({
      date: row.date,
      count: parseInt(row.count)
    }));

    const leadStats = {
      leadsByStatus,
      leadsBySource,
      leadsByPriority,
      leadsOverTime
    };

    res.json({
      message: 'Lead analytics retrieved successfully',
      data: leadStats
    });
  } catch (error) {
    logger.error('Error getting lead analytics:', error);
    res.status(500).json({
      error: 'Failed to get lead analytics',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

module.exports = router;