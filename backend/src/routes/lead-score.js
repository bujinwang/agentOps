const express = require('express');
const router = express.Router();
const LeadScoreService = require('../services/LeadScoreService');
const { authenticate } = require('../middleware/auth');
const { sendResponse, sendError } = require('../utils/responseFormatter');

/**
 * @swagger
 * /api/leads/{leadId}/score:
 *   get:
 *     summary: Get lead score data
 *     description: Retrieve the current score data for a specific lead
 *     tags: [Lead Scoring]
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
 *         description: Lead score data retrieved successfully
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
 *                     lead_id:
 *                       type: integer
 *                       description: Lead ID
 *                     score:
 *                       type: number
 *                       format: float
 *                       description: Current lead score
 *                     factors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           factor:
 *                             type: string
 *                             description: Scoring factor name
 *                           weight:
 *                             type: number
 *                             format: float
 *                             description: Factor weight
 *                           value:
 *                             type: number
 *                             format: float
 *                             description: Factor value
 *                     last_updated:
 *                       type: string
 *                       format: date-time
 *                       description: Last score update timestamp
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get('/:leadId/score', authenticate, async (req, res) => {
  try {
    const { leadId } = req.params;

    const result = await LeadScoreService.getLeadScore(leadId);

    if (!result.success) {
      return sendError(res, result.error, result.statusCode);
    }

    sendResponse(res, result.data, result.message);
  } catch (error) {
    console.error('Error in get lead score route:', error);
    sendError(res, 'Internal server error', 500);
  }
});

/**
 * @swagger
 * /api/leads/{leadId}/score:
 *   put:
 *     summary: Update lead score with manual override
 *     description: Manually update a lead's score with override capability
 *     tags: [Lead Scoring]
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
 *               - score
 *               - reason
 *             properties:
 *               score:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 100
 *                 description: New score value (0-100)
 *               reason:
 *                 type: string
 *                 minLength: 1
 *                 description: Reason for manual score override
 *               notes:
 *                 type: string
 *                 description: Additional notes about the score change
 *     responses:
 *       200:
 *         description: Lead score updated successfully
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
 *                     lead_id:
 *                       type: integer
 *                       description: Lead ID
 *                     score:
 *                       type: number
 *                       format: float
 *                       description: Updated score
 *                     override_reason:
 *                       type: string
 *                       description: Reason for override
 *                     updated_by:
 *                       type: integer
 *                       description: User ID who made the change
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       description: Update timestamp
 *                 message:
 *                   type: string
 *                   example: "Lead score updated successfully"
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.put('/:leadId/score', authenticate, async (req, res) => {
  try {
    const { leadId } = req.params;
    const scoreData = req.body;
    const userId = req.user?.userId;

    // Validate required fields
    if (!scoreData.score || scoreData.score < 0 || scoreData.score > 100) {
      return sendError(res, 'Valid score (0-100) is required', 400);
    }

    if (!scoreData.reason || scoreData.reason.trim().length === 0) {
      return sendError(res, 'Reason for score override is required', 400);
    }

    const result = await LeadScoreService.updateLeadScore(leadId, scoreData, userId);

    if (!result.success) {
      return sendError(res, result.error, result.statusCode);
    }

    sendResponse(res, result.data, result.message);
  } catch (error) {
    console.error('Error in update lead score route:', error);
    sendError(res, 'Internal server error', 500);
  }
});

/**
 * @swagger
 * /api/leads/{leadId}/score/history:
 *   get:
 *     summary: Get lead score history
 *     description: Retrieve the complete scoring history for a specific lead
 *     tags: [Lead Scoring]
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
 *         description: Lead score history retrieved successfully
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
 *                       score_id:
 *                         type: integer
 *                         description: Score history entry ID
 *                       lead_id:
 *                         type: integer
 *                         description: Lead ID
 *                       previous_score:
 *                         type: number
 *                         format: float
 *                         description: Previous score value
 *                       new_score:
 *                         type: number
 *                         format: float
 *                         description: New score value
 *                       change_reason:
 *                         type: string
 *                         enum: [automatic, manual_override, system_update]
 *                         description: Reason for score change
 *                       override_reason:
 *                         type: string
 *                         description: Manual override reason (if applicable)
 *                       changed_by:
 *                         type: integer
 *                         description: User ID who made the change
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         description: Change timestamp
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get('/:leadId/score/history', authenticate, async (req, res) => {
  try {
    const { leadId } = req.params;

    const result = await LeadScoreService.getScoreHistory(leadId);

    if (!result.success) {
      return sendError(res, result.error, result.statusCode);
    }

    sendResponse(res, result.data, result.message);
  } catch (error) {
    console.error('Error in get score history route:', error);
    sendError(res, 'Internal server error', 500);
  }
});

/**
 * @swagger
 * /api/leads/{leadId}/calculate-score:
 *   post:
 *     summary: Calculate enhanced lead score
 *     description: Calculate a new lead score using advanced algorithms and machine learning models
 *     tags: [Lead Scoring]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               use_ml_model:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to use machine learning model for scoring
 *               factors:
 *                 type: object
 *                 description: Custom scoring factors to override defaults
 *                 properties:
 *                   budget_weight:
 *                     type: number
 *                     format: float
 *                     minimum: 0
 *                     maximum: 1
 *                     description: Weight for budget factor
 *                   timeline_weight:
 *                     type: number
 *                     format: float
 *                     minimum: 0
 *                     maximum: 1
 *                     description: Weight for timeline factor
 *                   property_type_weight:
 *                     type: number
 *                     format: float
 *                     minimum: 0
 *                     maximum: 1
 *                     description: Weight for property type factor
 *               recalculate_existing:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to recalculate if score already exists
 *     responses:
 *       200:
 *         description: Lead score calculated successfully
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
 *                     lead_id:
 *                       type: integer
 *                       description: Lead ID
 *                     calculated_score:
 *                       type: number
 *                       format: float
 *                       description: Newly calculated score
 *                     scoring_method:
 *                       type: string
 *                       enum: [traditional, ml_enhanced, hybrid]
 *                       description: Scoring method used
 *                     factors_used:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           factor:
 *                             type: string
 *                             description: Factor name
 *                           value:
 *                             type: number
 *                             format: float
 *                             description: Factor value
 *                           weight:
 *                             type: number
 *                             format: float
 *                             description: Factor weight
 *                           contribution:
 *                             type: number
 *                             format: float
 *                             description: Factor contribution to score
 *                     confidence_level:
 *                       type: number
 *                       format: float
 *                       minimum: 0
 *                       maximum: 1
 *                       description: Confidence level in the calculated score
 *                     calculated_at:
 *                       type: string
 *                       format: date-time
 *                       description: Calculation timestamp
 *                 message:
 *                   type: string
 *                   example: "Lead score calculated successfully"
 *       400:
 *         $ref: '#/components/responses/400'
 *       401:
 *         $ref: '#/components/responses/401'
 *       404:
 *         $ref: '#/components/responses/404'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post('/:leadId/calculate-score', authenticate, async (req, res) => {
  try {
    const { leadId } = req.params;
    const leadData = req.body;

    // Validate leadId
    if (!leadId || isNaN(parseInt(leadId))) {
      return sendError(res, 'Valid lead ID is required', 400);
    }

    const result = await LeadScoreService.calculateLeadScore(leadId, leadData);

    if (!result.success) {
      return sendError(res, result.error, result.statusCode);
    }

    sendResponse(res, result.data, result.message);
  } catch (error) {
    console.error('Error in calculate lead score route:', error);
    sendError(res, 'Internal server error', 500);
  }
});

module.exports = router;