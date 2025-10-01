import { Router } from 'express';
import {
  createLead,
  createLeadValidation,
  getLead,
  getLeads,
  getLeadsValidation,
  updateLead,
  updateLeadValidation,
  deleteLead,
  leadIdValidation,
  getLeadStats,
} from '../controllers/lead.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

// All lead routes require authentication
router.use(authenticateJWT);

/**
 * @route   GET /api/v1/leads/stats
 * @desc    Get lead statistics by status
 * @access  Private
 */
router.get('/stats', getLeadStats);

/**
 * @route   GET /api/v1/leads
 * @desc    Get all leads with filtering and pagination
 * @access  Private
 */
router.get('/', getLeadsValidation, getLeads);

/**
 * @route   POST /api/v1/leads
 * @desc    Create a new lead
 * @access  Private
 */
router.post('/', createLeadValidation, createLead);

/**
 * @route   GET /api/v1/leads/:id
 * @desc    Get a specific lead by ID
 * @access  Private
 */
router.get('/:id', leadIdValidation, getLead);

/**
 * @route   PUT /api/v1/leads/:id
 * @desc    Update a lead
 * @access  Private
 */
router.put('/:id', updateLeadValidation, updateLead);

/**
 * @route   DELETE /api/v1/leads/:id
 * @desc    Delete a lead
 * @access  Private
 */
router.delete('/:id', leadIdValidation, deleteLead);

export default router;
