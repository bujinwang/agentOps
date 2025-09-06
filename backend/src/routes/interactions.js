const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const Interaction = require('../models/Interaction');
const { authenticate } = require('../middleware/auth');
const { ERROR_MESSAGES, INTERACTION_TYPES } = require('../config/constants');
const { logger } = require('../config/logger');
const { sendResponse, sendError, validationErrorResponse, paginationMetadata } = require('../utils/responseFormatter');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();


// Enhanced interaction creation validation
const createInteractionValidation = [
  body('leadId')
    .isInt({ min: 1 })
    .withMessage('Lead ID must be a positive integer'),
  body('type')
    .isIn(Object.values(INTERACTION_TYPES))
    .withMessage('Invalid interaction type'),
  body('content')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Content must be less than 1000 characters')
    .matches(/^[\w\s\-\.,:!?'"]*$/)
    .withMessage('Content contains invalid characters'),
  body('interactionDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid interaction date format')
];

// Interaction update validation
const updateInteractionValidation = [
  body('type')
    .optional()
    .isIn(Object.values(INTERACTION_TYPES))
    .withMessage('Invalid interaction type'),
  body('content')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Content must be less than 1000 characters')
    .matches(/^[\w\s\-\.,:!?'"]*$/)
    .withMessage('Content contains invalid characters'),
  body('interactionDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid interaction date format')
];

// Get interactions with enhanced validation
router.get('/', authenticate, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Limit must be between 1 and 200')
    .toInt(),
  query('leadId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Lead ID must be a positive integer')
    .toInt(),
  query('type')
    .optional()
    .isIn(Object.values(INTERACTION_TYPES))
    .withMessage('Invalid interaction type')
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      leadId: req.query.leadId ? parseInt(req.query.leadId) : undefined,
      type: req.query.type
    };

    const result = await Interaction.getInteractions(userId, filters);

    sendResponse(res, result.data, 'Interactions retrieved successfully', 200, paginationMetadata(result.pagination.currentPage, result.pagination.limit, result.pagination.totalItems));
  } catch (error) {
    logger.error('Error getting interactions:', error);
    res.status(500).json({
      error: 'Failed to get interactions',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Get interactions for a specific lead with validation
router.get('/lead/:leadId', authenticate, [
  param('leadId')
    .isInt({ min: 1 })
    .withMessage('Lead ID must be a positive integer')
    .toInt()
], handleValidationErrors, async (req, res) => {
  try {
    const leadId = parseInt(req.params.leadId);
    const userId = req.user.user_id;

    if (isNaN(leadId)) {
      return res.status(400).json({
        error: 'Invalid lead ID',
        message: 'Lead ID must be a number'
      });
    }

    const interactions = await Interaction.getLeadInteractions(leadId, userId);

    sendResponse(res, interactions, 'Lead interactions retrieved successfully');
  } catch (error) {
    logger.error('Error getting lead interactions:', error);
    res.status(500).json({
      error: 'Failed to get lead interactions',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Get lead interactions (alias for backward compatibility) with validation
router.get('/leads/:leadId', authenticate, [
  param('leadId')
    .isInt({ min: 1 })
    .withMessage('Lead ID must be a positive integer')
    .toInt()
], handleValidationErrors, async (req, res) => {
  try {
    const leadId = parseInt(req.params.leadId);
    const userId = req.user.user_id;

    if (isNaN(leadId)) {
      return res.status(400).json({
        error: 'Invalid lead ID',
        message: 'Lead ID must be a number'
      });
    }

    const interactions = await Interaction.getLeadInteractions(leadId, userId);

    sendResponse(res, interactions, 'Lead interactions retrieved successfully');
  } catch (error) {
    logger.error('Error getting lead interactions:', error);
    res.status(500).json({
      error: 'Failed to get lead interactions',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Create new interaction with enhanced validation and proper error handling
router.post('/', authenticate, createInteractionValidation, handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { leadId, type, content, interactionDate } = req.body;

    // Validate lead exists and belongs to user
    const Lead = require('../models/Lead');
    const lead = await Lead.getById(leadId, userId);
    if (!lead) {
      return res.status(404).json({
        status: 'error',
        message: 'Lead not found or access denied',
        error: {
          code: 'NOT_FOUND_ERROR',
          timestamp: new Date().toISOString()
        }
      });
    }

    const interactionData = {
      userId,
      leadId,
      type,
      content: content || null,
      interactionDate: interactionDate || new Date().toISOString()
    };

    const interaction = await Interaction.create(interactionData);

    if (!interaction) {
      return sendError(res, 'Failed to create interaction', 'CREATE_ERROR', null, 500);
    }

    logger.info(`Interaction created successfully: ${interaction.type} for lead ${leadId} by user ${userId}`);

    sendResponse(res, interaction.toJSON(), 'Interaction created successfully', 201);
  } catch (error) {
    logger.error('Error creating interaction:', error);
    sendError(res, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR', null, 500);
  }
});

// Get single interaction by ID
router.get('/:id', authenticate, [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Interaction ID must be a positive integer')
    .toInt()
], handleValidationErrors, async (req, res) => {
  try {
    const interactionId = parseInt(req.params.id);
    const userId = req.user.user_id;

    const interaction = await Interaction.getById(interactionId, userId);

    if (!interaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Interaction not found',
        error: {
          code: 'NOT_FOUND_ERROR',
          timestamp: new Date().toISOString()
        }
      });
    }

    sendResponse(res, interaction.toJSON(), 'Interaction retrieved successfully');
  } catch (error) {
    logger.error('Error getting interaction:', error);
    sendError(res, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR', null, 500);
  }
});

// Update interaction
router.put('/:id', authenticate, [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Interaction ID must be a positive integer')
    .toInt()
], updateInteractionValidation, handleValidationErrors, async (req, res) => {
  try {
    const interactionId = parseInt(req.params.id);
    const userId = req.user.user_id;
    
    // Check if interaction exists
    const existingInteraction = await Interaction.getById(interactionId, userId);
    if (!existingInteraction) {
      return res.status(404).json({
        status: 'error',
        message: 'Interaction not found or access denied',
        error: {
          code: 'NOT_FOUND_ERROR',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate lead ownership if leadId is being changed
    if (req.body.leadId) {
      const Lead = require('../models/Lead');
      const lead = await Lead.getById(req.body.leadId, userId);
      if (!lead) {
        return res.status(404).json({
          status: 'error',
          message: 'Lead not found or access denied',
          error: {
            code: 'NOT_FOUND_ERROR',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    const updateData = {};
    if (req.body.type !== undefined) updateData.type = req.body.type;
    if (req.body.content !== undefined) updateData.content = req.body.content;
    if (req.body.interactionDate !== undefined) updateData.interactionDate = req.body.interactionDate;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid fields to update',
        error: {
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString()
        }
      });
    }

    const updatedInteraction = await Interaction.update(interactionId, userId, updateData);

    if (!updatedInteraction) {
      return sendError(res, 'Failed to update interaction', 'UPDATE_ERROR', null, 500);
    }

    logger.info(`Interaction updated successfully: ${interactionId} by user ${userId}`);

    sendResponse(res, updatedInteraction.toJSON(), 'Interaction updated successfully');
  } catch (error) {
    logger.error('Error updating interaction:', error);
    sendError(res, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR', null, 500);
  }
});

// Delete interaction
router.delete('/:id', authenticate, [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Interaction ID must be a positive integer')
    .toInt()
], handleValidationErrors, async (req, res) => {
  try {
    const interactionId = parseInt(req.params.id);
    const userId = req.user.user_id;

    // Check if interaction exists
    const interaction = await Interaction.getById(interactionId, userId);
    if (!interaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Interaction not found or access denied',
        error: {
          code: 'NOT_FOUND_ERROR',
          timestamp: new Date().toISOString()
        }
      });
    }

    const deleted = await Interaction.delete(interactionId, userId);

    if (!deleted) {
      return sendError(res, 'Failed to delete interaction', 'DELETE_ERROR', null, 500);
    }

    logger.info(`Interaction deleted successfully: ${interactionId} by user ${userId}`);

    sendResponse(res, null, 'Interaction deleted successfully', 200);
  } catch (error) {
    logger.error('Error deleting interaction:', error);
    sendError(res, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR', null, 500);
  }
});

module.exports = router;