const express = require('express');
const { pool } = require('../config/database');
const { logger } = require('../config/logger');

const router = express.Router();

// Get workflow analytics overview
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get overall workflow performance
    const overviewQuery = `
      SELECT
        COUNT(DISTINCT wc.workflow_id) as total_workflows,
        COUNT(DISTINCT we.execution_id) as total_executions,
        COUNT(DISTINCT CASE WHEN we.status = 'completed' THEN we.execution_id END) as completed_executions,
        COUNT(DISTINCT CASE WHEN we.status = 'failed' THEN we.execution_id END) as failed_executions,
        AVG(EXTRACT(EPOCH FROM (we.executed_at - we.scheduled_at))/3600) as avg_completion_hours,
        COUNT(DISTINCT CASE WHEN we.conversion_value IS NOT NULL THEN we.execution_id END) as total_conversions,
        SUM(we.conversion_value) as total_conversion_value
      FROM workflow_configurations wc
      LEFT JOIN workflow_executions we ON wc.workflow_id = we.workflow_id
      WHERE wc.user_id = $1
    `;

    const overviewResult = await pool.query(overviewQuery, [userId]);
    const overview = overviewResult.rows[0];

    // Calculate conversion rate
    const conversionRate = overview.total_executions > 0
      ? (overview.total_conversions / overview.total_executions * 100).toFixed(2)
      : 0;

    // Get workflow performance by workflow
    const workflowPerformanceQuery = `
      SELECT
        wc.workflow_id,
        wc.name,
        wc.trigger_score_min,
        wc.trigger_score_max,
        COUNT(we.execution_id) as total_executions,
        COUNT(CASE WHEN we.status = 'completed' THEN 1 END) as completed_executions,
        COUNT(CASE WHEN we.status = 'failed' THEN 1 END) as failed_executions,
        AVG(EXTRACT(EPOCH FROM (we.executed_at - we.scheduled_at))/3600) as avg_completion_hours,
        COUNT(CASE WHEN we.conversion_value IS NOT NULL THEN 1 END) as conversions,
        SUM(we.conversion_value) as conversion_value
      FROM workflow_configurations wc
      LEFT JOIN workflow_executions we ON wc.workflow_id = we.workflow_id
      WHERE wc.user_id = $1
      GROUP BY wc.workflow_id, wc.name, wc.trigger_score_min, wc.trigger_score_max
      ORDER BY total_executions DESC
    `;

    const workflowPerformanceResult = await pool.query(workflowPerformanceQuery, [userId]);

    // Get response rates by action type
    const responseRatesQuery = `
      SELECT
        ws.action_type,
        COUNT(we.execution_id) as total_sent,
        COUNT(CASE WHEN we.delivered_at IS NOT NULL THEN 1 END) as delivered,
        COUNT(CASE WHEN we.opened_at IS NOT NULL THEN 1 END) as opened,
        COUNT(CASE WHEN we.clicked_at IS NOT NULL THEN 1 END) as clicked,
        COUNT(CASE WHEN we.replied_at IS NOT NULL THEN 1 END) as replied,
        COUNT(CASE WHEN we.bounced = true THEN 1 END) as bounced
      FROM workflow_sequences ws
      JOIN workflow_executions we ON ws.sequence_id = we.sequence_id
      JOIN workflow_configurations wc ON ws.workflow_id = wc.workflow_id
      WHERE wc.user_id = $1
      GROUP BY ws.action_type
    `;

    const responseRatesResult = await pool.query(responseRatesQuery, [userId]);

    res.json({
      overview: {
        totalWorkflows: parseInt(overview.total_workflows) || 0,
        totalExecutions: parseInt(overview.total_executions) || 0,
        completedExecutions: parseInt(overview.completed_executions) || 0,
        failedExecutions: parseInt(overview.failed_executions) || 0,
        avgCompletionHours: parseFloat(overview.avg_completion_hours) || 0,
        totalConversions: parseInt(overview.total_conversions) || 0,
        totalConversionValue: parseFloat(overview.total_conversion_value) || 0,
        conversionRate: parseFloat(conversionRate)
      },
      workflowPerformance: workflowPerformanceResult.rows.map(row => ({
        workflowId: row.workflow_id,
        name: row.name,
        triggerScoreMin: row.trigger_score_min,
        triggerScoreMax: row.trigger_score_max,
        totalExecutions: parseInt(row.total_executions) || 0,
        completedExecutions: parseInt(row.completed_executions) || 0,
        failedExecutions: parseInt(row.failed_executions) || 0,
        avgCompletionHours: parseFloat(row.avg_completion_hours) || 0,
        conversions: parseInt(row.conversions) || 0,
        conversionValue: parseFloat(row.conversion_value) || 0
      })),
      responseRates: responseRatesResult.rows.map(row => ({
        actionType: row.action_type,
        totalSent: parseInt(row.total_sent) || 0,
        delivered: parseInt(row.delivered) || 0,
        opened: parseInt(row.opened) || 0,
        clicked: parseInt(row.clicked) || 0,
        replied: parseInt(row.replied) || 0,
        bounced: parseInt(row.bounced) || 0,
        deliveryRate: row.total_sent > 0 ? ((row.delivered / row.total_sent) * 100).toFixed(2) : '0.00',
        openRate: row.delivered > 0 ? ((row.opened / row.delivered) * 100).toFixed(2) : '0.00',
        clickRate: row.opened > 0 ? ((row.clicked / row.opened) * 100).toFixed(2) : '0.00',
        replyRate: row.delivered > 0 ? ((row.replied / row.delivered) * 100).toFixed(2) : '0.00'
      }))
    });

  } catch (error) {
    logger.error('Error fetching workflow analytics overview:', error);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

// Get workflow performance over time
router.get('/performance-timeline', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const timelineQuery = `
      SELECT
        DATE(we.executed_at) as date,
        COUNT(we.execution_id) as total_executions,
        COUNT(CASE WHEN we.status = 'completed' THEN 1 END) as completed_executions,
        COUNT(CASE WHEN we.status = 'failed' THEN 1 END) as failed_executions,
        COUNT(CASE WHEN we.conversion_value IS NOT NULL THEN 1 END) as conversions,
        SUM(we.conversion_value) as conversion_value
      FROM workflow_executions we
      JOIN workflow_configurations wc ON we.workflow_id = wc.workflow_id
      WHERE wc.user_id = $1
        AND we.executed_at >= $2
      GROUP BY DATE(we.executed_at)
      ORDER BY date
    `;

    const result = await pool.query(timelineQuery, [userId, startDate]);

    res.json({
      timeline: result.rows.map(row => ({
        date: row.date,
        totalExecutions: parseInt(row.total_executions) || 0,
        completedExecutions: parseInt(row.completed_executions) || 0,
        failedExecutions: parseInt(row.failed_executions) || 0,
        conversions: parseInt(row.conversions) || 0,
        conversionValue: parseFloat(row.conversion_value) || 0
      }))
    });

  } catch (error) {
    logger.error('Error fetching performance timeline:', error);
    res.status(500).json({ error: 'Failed to fetch performance timeline' });
  }
});

// Get detailed workflow analytics
router.get('/workflow/:workflowId', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { workflowId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get workflow details
    const workflowQuery = `
      SELECT * FROM workflow_configurations
      WHERE workflow_id = $1 AND user_id = $2
    `;

    const workflowResult = await pool.query(workflowQuery, [workflowId, userId]);
    if (workflowResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const workflow = workflowResult.rows[0];

    // Get sequence performance
    const sequenceQuery = `
      SELECT
        ws.sequence_id,
        ws.step_number,
        ws.action_type,
        ws.delay_hours,
        COUNT(we.execution_id) as total_executions,
        COUNT(CASE WHEN we.status = 'completed' THEN 1 END) as completed_executions,
        COUNT(CASE WHEN we.status = 'failed' THEN 1 END) as failed_executions,
        AVG(EXTRACT(EPOCH FROM (we.executed_at - we.scheduled_at))/3600) as avg_execution_time,
        COUNT(CASE WHEN we.delivered_at IS NOT NULL THEN 1 END) as delivered,
        COUNT(CASE WHEN we.opened_at IS NOT NULL THEN 1 END) as opened,
        COUNT(CASE WHEN we.clicked_at IS NOT NULL THEN 1 END) as clicked,
        COUNT(CASE WHEN we.replied_at IS NOT NULL THEN 1 END) as replied
      FROM workflow_sequences ws
      LEFT JOIN workflow_executions we ON ws.sequence_id = we.sequence_id
      WHERE ws.workflow_id = $1
      GROUP BY ws.sequence_id, ws.step_number, ws.action_type, ws.delay_hours
      ORDER BY ws.step_number
    `;

    const sequenceResult = await pool.query(sequenceQuery, [workflowId]);

    // Get recent executions
    const recentExecutionsQuery = `
      SELECT
        we.execution_id,
        we.status,
        we.scheduled_at,
        we.executed_at,
        we.error_message,
        we.conversion_value,
        we.conversion_type,
        l.first_name,
        l.last_name,
        l.email
      FROM workflow_executions we
      JOIN leads l ON we.lead_id = l.lead_id
      WHERE we.workflow_id = $1
      ORDER BY we.scheduled_at DESC
      LIMIT 50
    `;

    const recentExecutionsResult = await pool.query(recentExecutionsQuery, [workflowId]);

    res.json({
      workflow: {
        workflowId: workflow.workflow_id,
        name: workflow.name,
        description: workflow.description,
        triggerScoreMin: workflow.trigger_score_min,
        triggerScoreMax: workflow.trigger_score_max,
        isActive: workflow.is_active,
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at
      },
      sequencePerformance: sequenceResult.rows.map(row => ({
        sequenceId: row.sequence_id,
        stepNumber: row.step_number,
        actionType: row.action_type,
        delayHours: row.delay_hours,
        totalExecutions: parseInt(row.total_executions) || 0,
        completedExecutions: parseInt(row.completed_executions) || 0,
        failedExecutions: parseInt(row.failed_executions) || 0,
        avgExecutionTime: parseFloat(row.avg_execution_time) || 0,
        delivered: parseInt(row.delivered) || 0,
        opened: parseInt(row.opened) || 0,
        clicked: parseInt(row.clicked) || 0,
        replied: parseInt(row.replied) || 0
      })),
      recentExecutions: recentExecutionsResult.rows.map(row => ({
        executionId: row.execution_id,
        status: row.status,
        scheduledAt: row.scheduled_at,
        executedAt: row.executed_at,
        errorMessage: row.error_message,
        conversionValue: parseFloat(row.conversion_value) || null,
        conversionType: row.conversion_type,
        leadName: `${row.first_name} ${row.last_name}`,
        leadEmail: row.email
      }))
    });

  } catch (error) {
    logger.error('Error fetching workflow analytics:', error);
    res.status(500).json({ error: 'Failed to fetch workflow analytics' });
  }
});

// Track workflow response
router.post('/response', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { executionId, responseType, responseValue } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify execution belongs to user
    const verificationQuery = `
      SELECT we.execution_id
      FROM workflow_executions we
      JOIN workflow_configurations wc ON we.workflow_id = wc.workflow_id
      WHERE we.execution_id = $1 AND wc.user_id = $2
    `;

    const verificationResult = await pool.query(verificationQuery, [executionId, userId]);
    if (verificationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Execution not found or access denied' });
    }

    // Insert response
    const insertQuery = `
      INSERT INTO workflow_responses (execution_id, response_type, response_value)
      VALUES ($1, $2, $3)
      RETURNING response_id
    `;

    const result = await pool.query(insertQuery, [executionId, responseType, responseValue]);

    // Update execution based on response type
    let updateField = '';
    switch (responseType) {
      case 'delivered':
        updateField = 'delivered_at = CURRENT_TIMESTAMP';
        break;
      case 'opened':
        updateField = 'opened_at = CURRENT_TIMESTAMP';
        break;
      case 'clicked':
        updateField = 'clicked_at = CURRENT_TIMESTAMP';
        break;
      case 'replied':
        updateField = 'replied_at = CURRENT_TIMESTAMP';
        break;
      case 'bounced':
        updateField = 'bounced = true';
        break;
      case 'unsubscribed':
        updateField = 'unsubscribed = true';
        break;
    }

    if (updateField) {
      const updateQuery = `
        UPDATE workflow_executions
        SET ${updateField}
        WHERE execution_id = $1
      `;
      await pool.query(updateQuery, [executionId]);
    }

    res.json({
      success: true,
      responseId: result.rows[0].response_id
    });

  } catch (error) {
    logger.error('Error tracking workflow response:', error);
    res.status(500).json({ error: 'Failed to track response' });
  }
});

// Track conversion
router.post('/conversion', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { executionId, conversionValue, conversionType } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify execution belongs to user
    const verificationQuery = `
      SELECT we.execution_id
      FROM workflow_executions we
      JOIN workflow_configurations wc ON we.workflow_id = wc.workflow_id
      WHERE we.execution_id = $1 AND wc.user_id = $2
    `;

    const verificationResult = await pool.query(verificationQuery, [executionId, userId]);
    if (verificationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Execution not found or access denied' });
    }

    // Update execution with conversion data
    const updateQuery = `
      UPDATE workflow_executions
      SET conversion_value = $1, conversion_type = $2
      WHERE execution_id = $3
    `;

    await pool.query(updateQuery, [conversionValue, conversionType, executionId]);

    res.json({ success: true });

  } catch (error) {
    logger.error('Error tracking conversion:', error);
    res.status(500).json({ error: 'Failed to track conversion' });
  }
});

module.exports = router;