const express = require('express');
const router = express.Router();
const ConversionService = require('../services/ConversionService');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/conversion/stages:
 *   get:
 *     summary: Get all conversion stages
 *     description: Retrieve all available conversion stages for leads
 *     tags: [Conversion]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conversion stages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       stage_id:
 *                         type: integer
 *                         description: Stage ID
 *                       stage_name:
 *                         type: string
 *                         description: Stage name
 *                       stage_order:
 *                         type: integer
 *                         description: Display order
 *                       description:
 *                         type: string
 *                         description: Stage description
 *                       is_active:
 *                         type: boolean
 *                         description: Whether stage is active
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
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
 * @swagger
 * /api/conversion/leads/{leadId}/stage:
 *   put:
 *     summary: Update lead conversion stage
 *     description: Update the conversion stage of a specific lead
 *     tags: [Conversion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lead ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stageId
 *             properties:
 *               stageId:
 *                 type: integer
 *                 description: New conversion stage ID
 *               notes:
 *                 type: string
 *                 description: Optional notes about the stage change
 *     responses:
 *       200:
 *         description: Lead conversion stage updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Lead'
 *                 message:
 *                   type: string
 *                   example: "Lead conversion stage updated successfully"
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
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
 * @swagger
 * /api/conversion/leads/{leadId}/probability:
 *   put:
 *     summary: Update lead conversion probability
 *     description: Update the conversion probability score for a specific lead
 *     tags: [Conversion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lead ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - probability
 *             properties:
 *               probability:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 1
 *                 description: Conversion probability (0.0 to 1.0)
 *               notes:
 *                 type: string
 *                 description: Optional notes about the probability update
 *     responses:
 *       200:
 *         description: Lead conversion probability updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Lead'
 *                 message:
 *                   type: string
 *                   example: "Lead conversion probability updated successfully"
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
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
 * @swagger
 * /api/conversion/funnel:
 *   get:
 *     summary: Get conversion funnel data
 *     description: Retrieve conversion funnel data showing lead progression through stages
 *     tags: [Conversion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for funnel data (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for funnel data (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Conversion funnel data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       stage_name:
 *                         type: string
 *                         description: Stage name
 *                       stage_order:
 *                         type: integer
 *                         description: Stage order
 *                       lead_count:
 *                         type: integer
 *                         description: Number of leads in this stage
 *                       avg_probability:
 *                         type: number
 *                         format: float
 *                         description: Average conversion probability
 *                       total_value:
 *                         type: number
 *                         format: float
 *                         description: Total estimated value
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
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
 * @swagger
 * /api/conversion/leads/{leadId}/history:
 *   get:
 *     summary: Get lead conversion history
 *     description: Retrieve the complete conversion history for a specific lead
 *     tags: [Conversion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: Lead conversion history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       event_id:
 *                         type: integer
 *                         description: Event ID
 *                       event_type:
 *                         type: string
 *                         enum: [stage_change, probability_update]
 *                         description: Type of conversion event
 *                       event_data:
 *                         type: object
 *                         description: Event-specific data
 *                       notes:
 *                         type: string
 *                         description: Optional notes
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         description: Event timestamp
 *                       from_stage:
 *                         type: string
 *                         description: Previous stage name
 *                       to_stage:
 *                         type: string
 *                         description: New stage name
 *                       first_name:
 *                         type: string
 *                         description: User who made the change
 *                       last_name:
 *                         type: string
 *                         description: User last name
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
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
 * @swagger
 * /api/conversion/metrics:
 *   get:
 *     summary: Get conversion metrics
 *     description: Retrieve conversion metrics for a specified date range
 *     tags: [Conversion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for metrics (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for metrics (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Conversion metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       user_id:
 *                         type: integer
 *                         description: User ID
 *                       metric_date:
 *                         type: string
 *                         format: date
 *                         description: Date of metrics
 *                       total_leads:
 *                         type: integer
 *                         description: Total leads
 *                       leads_in_pipeline:
 *                         type: integer
 *                         description: Leads in active pipeline
 *                       conversion_rate:
 *                         type: number
 *                         format: float
 *                         description: Conversion rate percentage
 *                       average_deal_size:
 *                         type: number
 *                         format: float
 *                         description: Average deal size
 *                       pipeline_value:
 *                         type: number
 *                         format: float
 *                         description: Total pipeline value
 *                       leads_won:
 *                         type: integer
 *                         description: Number of leads won
 *                       leads_lost:
 *                         type: integer
 *                         description: Number of leads lost
 *                       average_conversion_time:
 *                         type: number
 *                         format: float
 *                         description: Average conversion time in days
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
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
 * @swagger
 * /api/conversion/metrics/update:
 *   post:
 *     summary: Update conversion metrics
 *     description: Calculate and update conversion metrics for a specific date
 *     tags: [Conversion]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date for metrics calculation (defaults to today)
 *     responses:
 *       200:
 *         description: Conversion metrics updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_leads:
 *                       type: integer
 *                       description: Total leads
 *                     leads_in_pipeline:
 *                       type: integer
 *                       description: Leads in active pipeline
 *                     conversion_rate:
 *                       type: number
 *                       format: float
 *                       description: Conversion rate percentage
 *                     average_deal_size:
 *                       type: number
 *                       format: float
 *                       description: Average deal size
 *                     pipeline_value:
 *                       type: number
 *                       format: float
 *                       description: Total pipeline value
 *                     leads_won:
 *                       type: integer
 *                       description: Number of leads won
 *                     leads_lost:
 *                       type: integer
 *                       description: Number of leads lost
 *                     average_conversion_time:
 *                       type: number
 *                       format: float
 *                       description: Average conversion time in days
 *                     conversionRate:
 *                       type: number
 *                       format: float
 *                       description: Conversion rate percentage
 *                     date:
 *                       type: string
 *                       format: date
 *                       description: Date of metrics
 *                 message:
 *                   type: string
 *                   example: "Conversion metrics updated successfully"
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
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
 * @swagger
 * /api/conversion/leads:
 *   get:
 *     summary: Get leads by conversion stage
 *     description: Retrieve leads filtered by conversion stage with optional stage filtering
 *     tags: [Conversion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: stageId
 *         schema:
 *           type: integer
 *         description: Filter by specific conversion stage ID (optional)
 *     responses:
 *       200:
 *         description: Leads retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Lead'
 *                       - type: object
 *                         properties:
 *                           stage_name:
 *                             type: string
 *                             description: Current conversion stage name
 *                           stage_order:
 *                             type: integer
 *                             description: Stage display order
 *                           last_stage_change:
 *                             type: string
 *                             format: date-time
 *                             description: Timestamp of last stage change
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
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