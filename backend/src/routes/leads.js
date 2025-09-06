const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Lead = require('../models/Lead');
const Interaction = require('../models/Interaction');
const { authenticate } = require('../middleware/auth');
const { ERROR_MESSAGES, LEAD_STATUS, LEAD_PRIORITY, VALIDATION_RULES, INTERACTION_TYPES } = require('../config/constants');
const { logger } = require('../config/logger');
const { sendResponse, sendError, validationErrorResponse, paginationMetadata } = require('../utils/responseFormatter');

const router = express.Router();

// Validation middleware with standardized response
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(validationErrorResponse(errors.array()));
  }
  next();
};

// Lead creation validation
const createLeadValidation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`First name must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`Last name must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: VALIDATION_RULES.EMAIL_MAX_LENGTH })
    .withMessage(`Email must be less than ${VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`),
  body('phoneNumber')
    .optional()
    .isLength({ max: VALIDATION_RULES.PHONE_MAX_LENGTH })
    .withMessage(`Phone number must be less than ${VALIDATION_RULES.PHONE_MAX_LENGTH} characters`),
  body('source')
    .trim()
    .notEmpty()
    .withMessage('Lead source is required'),
  body('priority')
    .optional()
    .isIn(Object.values(LEAD_PRIORITY))
    .withMessage('Invalid priority value'),
  body('budgetMin')
    .optional()
    .isFloat({ min: VALIDATION_RULES.BUDGET_MIN })
    .withMessage('Budget minimum must be a positive number'),
  body('budgetMax')
    .optional()
    .isFloat({ min: VALIDATION_RULES.BUDGET_MIN })
    .withMessage('Budget maximum must be a positive number'),
  body('propertyType')
    .optional()
    .isIn(['Condo', 'House', 'Townhouse', 'Land', 'Commercial', 'Multi-Family'])
    .withMessage('Invalid property type'),
  body('bedroomsMin')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Bedrooms must be a positive number'),
  body('bathroomsMin')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Bathrooms must be a positive number'),
  body('notes')
    .optional()
    .isLength({ max: VALIDATION_RULES.NOTES_MAX_LENGTH })
    .withMessage(`Notes must be less than ${VALIDATION_RULES.NOTES_MAX_LENGTH} characters`)
];

// Update lead validation
const updateLeadValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`First name must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`Last name must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: VALIDATION_RULES.EMAIL_MAX_LENGTH })
    .withMessage(`Email must be less than ${VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`),
  body('status')
    .optional()
    .isIn(Object.values(LEAD_STATUS))
    .withMessage('Invalid lead status'),
  body('priority')
    .optional()
    .isIn(Object.values(LEAD_PRIORITY))
    .withMessage('Invalid priority value')
];

// Get all leads with filtering and pagination
router.get('/', authenticate, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit must be between 1 and 200'),
  query('status').optional().isIn(Object.values(LEAD_STATUS)).withMessage('Invalid status filter'),
  query('priority').optional().isIn(Object.values(LEAD_PRIORITY)).withMessage('Invalid priority filter'),
  query('searchTerm').optional().isLength({ max: 100 }).withMessage('Search term too long'),
  query('sortBy').optional().isIn(['created_at', 'updated_at', 'first_name', 'last_name']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Sort order must be ASC or DESC')
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      status: req.query.status,
      priority: req.query.priority,
      searchTerm: req.query.searchTerm,
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    const result = await Lead.getLeads(userId, filters);

    res.json({
      message: 'Leads retrieved successfully',
      data: result.data.map(lead => lead.toJSON()),
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Error getting leads:', error);
    res.status(500).json({
      error: 'Failed to get leads',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Get lead by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const userId = req.user.user_id;

    if (isNaN(leadId)) {
      return res.status(400).json({
        error: 'Invalid lead ID',
        message: 'Lead ID must be a number'
      });
    }

    const lead = await Lead.getById(leadId, userId);

    if (!lead) {
      return res.status(404).json({
        error: 'Lead not found',
        message: ERROR_MESSAGES.LEAD_NOT_FOUND
      });
    }

    res.json({
      message: 'Lead retrieved successfully',
      data: lead.toJSON()
    });
  } catch (error) {
    logger.error('Error getting lead:', error);
    res.status(500).json({
      error: 'Failed to get lead',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Create new lead with interaction logging
router.post('/', authenticate, createLeadValidation, handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const leadData = {
      userId,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phoneNumber: req.body.phoneNumber,
      source: req.body.source,
      priority: req.body.priority || LEAD_PRIORITY.MEDIUM,
      budgetMin: req.body.budgetMin,
      budgetMax: req.body.budgetMax,
      desiredLocation: req.body.desiredLocation,
      propertyType: req.body.propertyType,
      bedroomsMin: req.body.bedroomsMin,
      bathroomsMin: req.body.bathroomsMin,
      notes: req.body.notes,
      aiSummary: req.body.aiSummary
    };

    const lead = await Lead.create(leadData);

    if (!lead) {
      return sendError(res, 'Failed to create lead', 'CREATE_ERROR', null, 500);
    }

    // Log interaction for lead creation
    try {
      await Interaction.create({
        userId,
        leadId: lead.lead_id,
        type: INTERACTION_TYPES.LEAD_CREATED,
        content: `Lead created via ${lead.source} with ${lead.priority} priority`
      });
    } catch (interactionError) {
      logger.warn('Failed to log lead creation interaction:', interactionError);
    }

    logger.info(`Lead created successfully: ${lead.email} by user ${userId}`);

    sendResponse(res, lead.toJSON(), 'Lead created successfully', 201);
  } catch (error) {
    logger.error('Error creating lead:', error);
    sendError(res, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR', null, 500);
  }
});

// Update lead status with interaction logging
router.put('/:id/status', authenticate, [
  body('status')
    .isIn(Object.values(LEAD_STATUS))
    .withMessage('Invalid lead status')
], handleValidationErrors, async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const userId = req.user.user_id;
    const newStatus = req.body.status;

    if (isNaN(leadId)) {
      return sendError(res, 'Invalid lead ID', 'VALIDATION_ERROR', null, 400);
    }

    // Get current lead to compare status
    const currentLead = await Lead.getById(leadId, userId);
    if (!currentLead) {
      return sendError(res, ERROR_MESSAGES.LEAD_NOT_FOUND, 'NOT_FOUND_ERROR', null, 404);
    }

    const oldStatus = currentLead.status;
    const lead = await Lead.updateStatus(leadId, userId, newStatus);

    if (!lead) {
      return sendError(res, ERROR_MESSAGES.LEAD_NOT_FOUND, 'NOT_FOUND_ERROR', null, 404);
    }

    // Log status change interaction
    try {
      await Interaction.create({
        userId,
        leadId,
        type: INTERACTION_TYPES.STATUS_CHANGE,
        content: `Status changed from ${oldStatus} to ${newStatus}`
      });
    } catch (interactionError) {
      logger.warn('Failed to log status change interaction:', interactionError);
    }

    logger.info(`Lead status updated: ${leadId} from ${oldStatus} to ${newStatus} by user ${userId}`);

    sendResponse(res, lead.toJSON(), 'Lead status updated successfully');
  } catch (error) {
    logger.error('Error updating lead status:', error);
    sendError(res, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR', null, 500);
  }
});

// Update lead
router.put('/:id', authenticate, updateLeadValidation, handleValidationErrors, async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const userId = req.user.user_id;

    if (isNaN(leadId)) {
      return res.status(400).json({
        error: 'Invalid lead ID',
        message: 'Lead ID must be a number'
      });
    }

    const lead = await Lead.getById(leadId, userId);

    if (!lead) {
      return res.status(404).json({
        error: 'Lead not found',
        message: ERROR_MESSAGES.LEAD_NOT_FOUND
      });
    }

    const updateData = {};
    const allowedFields = ['firstName', 'lastName', 'email', 'phoneNumber', 'source', 'status', 'priority', 'budgetMin', 'budgetMax', 'desiredLocation', 'propertyType', 'bedroomsMin', 'bathroomsMin', 'notes', 'aiSummary'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        // Convert camelCase to snake_case for database
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateData[dbField] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        message: 'Please provide at least one field to update'
      });
    }

    const updatedLead = await lead.update(updateData);

    logger.info(`Lead updated: ${leadId} by user ${userId}`);

    res.json({
      message: 'Lead updated successfully',
      data: updatedLead.toJSON()
    });
  } catch (error) {
    logger.error('Error updating lead:', error);
    res.status(500).json({
      error: 'Failed to update lead',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Delete lead
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const userId = req.user.user_id;

    if (isNaN(leadId)) {
      return res.status(400).json({
        error: 'Invalid lead ID',
        message: 'Lead ID must be a number'
      });
    }

    const deleted = await Lead.delete(leadId, userId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Lead not found',
        message: ERROR_MESSAGES.LEAD_NOT_FOUND
      });
    }

    logger.info(`Lead deleted: ${leadId} by user ${userId}`);

    res.json({
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting lead:', error);
    res.status(500).json({
      error: 'Failed to delete lead',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Assign lead to a different user
router.post('/:id/assign', authenticate, [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Lead ID must be a positive integer')
    .toInt(),
  body('toUserId')
    .isInt({ min: 1 })
    .withMessage('Target user ID must be a positive integer')
    .toInt(),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Assignment notes must be less than 500 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const fromUserId = req.user.user_id;
    const toUserId = req.body.toUserId;
    const assignmentNotes = req.body.notes;

    // Validate that the target user exists
    const User = require('../models/User');
    const targetUser = await User.findById(toUserId);
    if (!targetUser) {
      return res.status(404).json({
        status: 'error',
        message: 'Target user not found',
        error: {
          code: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user is trying to assign to themselves
    if (fromUserId === toUserId) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot assign lead to yourself',
        error: {
          code: 'INVALID_ASSIGNMENT',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Assign the lead
    const assignedLead = await Lead.assignLead(leadId, fromUserId, toUserId, assignmentNotes);

    logger.info(`Lead assigned successfully: ${leadId} from user ${fromUserId} to user ${toUserId}`);

    sendResponse(res, assignedLead.toJSON(), 'Lead assigned successfully', 200);
  } catch (error) {
    logger.error('Error assigning lead:', error);
    
    if (error.message === 'Lead not found or access denied') {
      return res.status(404).json({
        status: 'error',
        message: 'Lead not found or access denied',
        error: {
          code: 'NOT_FOUND_ERROR',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    sendError(res, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR', null, 500);
  }
});

// Get unassigned leads
router.get('/unassigned', authenticate, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Limit must be between 1 and 200')
    .toInt()
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Verify user has permission to view unassigned leads (admin/manager role)
    // For now, allow any authenticated user to view unassigned leads
    const result = await Lead.getUnassignedLeads(limit, page);

    sendResponse(res, result.data.map(lead => lead.toJSON()), 'Unassigned leads retrieved successfully', 200, {
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Error getting unassigned leads:', error);
    sendError(res, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR', null, 500);
  }
});

// Get leads assigned to current user
router.get('/my-leads', authenticate, [
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
  query('status')
    .optional()
    .isIn(Object.values(LEAD_STATUS))
    .withMessage('Invalid lead status'),
  query('priority')
    .optional()
    .isIn(Object.values(LEAD_PRIORITY))
    .withMessage('Invalid lead priority'),
  query('searchTerm')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search term must be less than 100 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      status: req.query.status,
      priority: req.query.priority,
      searchTerm: req.query.searchTerm
    };

    const result = await Lead.getAssignedLeads(userId, filters);

    sendResponse(res, {
      leads: result.data.map(lead => lead.toJSON()),
      summary: {
        totalLeads: result.pagination.totalItems,
        totalPages: result.pagination.totalPages,
        currentPage: result.pagination.currentPage
      }
    }, 'My assigned leads retrieved successfully', 200);
  } catch (error) {
    logger.error('Error getting assigned leads:', error);
    sendError(res, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR', null, 500);
  }
});

module.exports = router;