import { Router } from 'express';
import {
  createInteraction,
  createInteractionValidation,
  getInteraction,
  getInteractions,
  getInteractionsValidation,
  getLeadTimeline,
  getLeadTimelineValidation,
  deleteInteraction,
  interactionIdValidation,
  getInteractionStats,
} from '../controllers/interaction.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

// All interaction routes require authentication
router.use(authenticateJWT);

/**
 * @route   GET /api/v1/interactions/stats
 * @desc    Get interaction statistics by type
 * @access  Private
 */
router.get('/stats', getInteractionStats);

/**
 * @route   GET /api/v1/interactions/leads/:leadId/timeline
 * @desc    Get timeline of all interactions for a specific lead
 * @access  Private
 */
router.get('/leads/:leadId/timeline', getLeadTimelineValidation, getLeadTimeline);

/**
 * @route   GET /api/v1/interactions
 * @desc    Get all interactions with filtering and pagination
 * @access  Private
 */
router.get('/', getInteractionsValidation, getInteractions);

/**
 * @route   POST /api/v1/interactions
 * @desc    Log a new interaction
 * @access  Private
 */
router.post('/', createInteractionValidation, createInteraction);

/**
 * @route   GET /api/v1/interactions/:id
 * @desc    Get a specific interaction by ID
 * @access  Private
 */
router.get('/:id', interactionIdValidation, getInteraction);

/**
 * @route   DELETE /api/v1/interactions/:id
 * @desc    Delete an interaction
 * @access  Private
 */
router.delete('/:id', interactionIdValidation, deleteInteraction);

export default router;
