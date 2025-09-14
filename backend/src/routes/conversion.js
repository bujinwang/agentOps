const express = require('express');
const router = express.Router();
const ConversionService = require('../services/ConversionService');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/conversion/stages
 * Get all conversion stages
 */
router.get('/stages', async (req, res) => {
  try {
    const stages = await ConversionService.getConversionStages();
    res.json({
      success: true,
      data: stages
    });
  } catch (error) {
    console.error('Error fetching conversion stages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversion stages'
    });
  }
});

/**
 * PUT /api/conversion/leads/:leadId/stage
 * Update lead conversion stage
 */
router.put('/leads/:leadId/stage', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { stageId, notes } = req.body;
    const userId = req.user.userId;

    if (!stageId) {
      return res.status(400).json({
        success: false,
        error: 'Stage ID is required'
      });
    }

    const updatedLead = await ConversionService.updateLeadStage(
      parseInt(leadId),
      parseInt(stageId),
      userId,
      notes
    );

    res.json({
      success: true,
      data: updatedLead,
      message: 'Lead conversion stage updated successfully'
    });
  } catch (error) {
    console.error('Error updating lead stage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lead conversion stage'
    });
  }
});

/**
 * PUT /api/conversion/leads/:leadId/probability
 * Update lead conversion probability
 */
router.put('/leads/:leadId/probability', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { probability, notes } = req.body;
    const userId = req.user.userId;

    if (probability === undefined || probability < 0 || probability > 1) {
      return res.status(400).json({
        success: false,
        error: 'Probability must be between 0 and 1'
      });
    }

    const updatedLead = await ConversionService.updateConversionProbability(
      parseInt(leadId),
      parseFloat(probability),
      userId,
      notes
    );

    res.json({
      success: true,
      data: updatedLead,
      message: 'Lead conversion probability updated successfully'
    });
  } catch (error) {
    console.error('Error updating conversion probability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update conversion probability'
    });
  }
});

/**
 * GET /api/conversion/funnel
 * Get conversion funnel data
 */
router.get('/funnel', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    const funnelData = await ConversionService.getConversionFunnel(
      userId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: funnelData
    });
  } catch (error) {
    console.error('Error fetching conversion funnel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversion funnel data'
    });
  }
});

/**
 * GET /api/conversion/leads/:leadId/history
 * Get lead conversion history
 */
router.get('/leads/:leadId/history', async (req, res) => {
  try {
    const { leadId } = req.params;

    const history = await ConversionService.getLeadConversionHistory(
      parseInt(leadId)
    );

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching lead conversion history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead conversion history'
    });
  }
});

/**
 * GET /api/conversion/metrics
 * Get conversion metrics for date range
 */
router.get('/metrics', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }

    const metrics = await ConversionService.getConversionMetrics(
      userId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching conversion metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversion metrics'
    });
  }
});

/**
 * POST /api/conversion/metrics/update
 * Update conversion metrics for today
 */
router.post('/metrics/update', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.body;

    const metrics = await ConversionService.updateConversionMetrics(
      userId,
      date
    );

    res.json({
      success: true,
      data: metrics,
      message: 'Conversion metrics updated successfully'
    });
  } catch (error) {
    console.error('Error updating conversion metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update conversion metrics'
    });
  }
});

/**
 * GET /api/conversion/leads
 * Get leads by conversion stage
 */
router.get('/leads', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { stageId } = req.query;

    const leads = await ConversionService.getLeadsByStage(
      userId,
      stageId ? parseInt(stageId) : null
    );

    res.json({
      success: true,
      data: leads
    });
  } catch (error) {
    console.error('Error fetching leads by stage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leads by conversion stage'
    });
  }
});

module.exports = router;