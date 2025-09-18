const express = require('express');
const router = express.Router();
const LeadScoreService = require('../services/LeadScoreService');
const { authenticateToken } = require('../middleware/auth');
const { sendResponse, sendError } = require('../utils/responseHelper');

/**
 * @route GET /api/leads/:leadId/score
 * @desc Get lead score data
 * @access Private
 */
router.get('/:leadId/score', authenticateToken, async (req, res) => {
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
 * @route PUT /api/leads/:leadId/score
 * @desc Update lead score with manual override
 * @access Private
 */
router.put('/:leadId/score', authenticateToken, async (req, res) => {
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
 * @route GET /api/leads/:leadId/score/history
 * @desc Get score history for lead
 * @access Private
 */
router.get('/:leadId/score/history', authenticateToken, async (req, res) => {
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
 * @route POST /api/leads/:leadId/calculate-score
 * @desc Calculate enhanced lead score
 * @access Private
 */
router.post('/:leadId/calculate-score', authenticateToken, async (req, res) => {
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