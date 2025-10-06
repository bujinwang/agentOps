import { Router } from 'express';
import {
  findMatches,
  findMatchesValidation,
  getLeadMatches,
  getLeadMatchesValidation,
  getMatchById,
  batchMatchLeads,
  rateMatch,
  rateMatchValidation,
  dismissMatch,
  dismissMatchValidation,
  updateMatchStatus,
  updateStatusValidation,
  getStatistics,
  getLeadPreferences,
  updateLeadPreferences,
  updatePreferencesValidation,
} from '../controllers/match.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

// All match routes require authentication
router.use(authenticateJWT);

/**
 * @route   POST /api/v1/matches/find/:leadId
 * @desc    Find new matches for a lead (runs matching algorithm)
 * @access  Private
 * @query   limit (optional, default 20), minScore (optional, default 40)
 */
router.post('/find/:leadId', findMatchesValidation, findMatches);

/**
 * @route   GET /api/v1/matches/lead/:leadId
 * @desc    Get existing matches for a lead
 * @access  Private
 * @query   status, minScore, page, limit
 */
router.get('/lead/:leadId', getLeadMatchesValidation, getLeadMatches);

/**
 * @route   GET /api/v1/matches/:matchId
 * @desc    Get match details by ID (auto-marks as viewed)
 * @access  Private
 */
router.get('/:matchId', getMatchById);

/**
 * @route   POST /api/v1/matches/batch
 * @desc    Batch match all active leads
 * @access  Private
 * @body    minScore (optional)
 */
router.post('/batch', batchMatchLeads);

/**
 * @route   PUT /api/v1/matches/:matchId/rate
 * @desc    Rate a match (1-5 stars)
 * @access  Private
 * @body    rating (required), notes (optional)
 */
router.put('/:matchId/rate', rateMatchValidation, rateMatch);

/**
 * @route   PUT /api/v1/matches/:matchId/status
 * @desc    Update match status
 * @access  Private
 * @body    status (viewed, interested, contacted, scheduled, converted), notes
 */
router.put('/:matchId/status', updateStatusValidation, updateMatchStatus);

/**
 * @route   DELETE /api/v1/matches/:matchId
 * @desc    Dismiss a match
 * @access  Private
 * @body    reason (optional)
 */
router.delete('/:matchId', dismissMatchValidation, dismissMatch);

/**
 * @route   GET /api/v1/matches/statistics
 * @desc    Get match performance statistics
 * @access  Private
 */
router.get('/statistics', getStatistics);

/**
 * @route   GET /api/v1/leads/:leadId/preferences
 * @desc    Get lead preferences
 * @access  Private
 */
router.get('/leads/:leadId/preferences', getLeadPreferences);

/**
 * @route   PUT /api/v1/leads/:leadId/preferences
 * @desc    Update lead preferences
 * @access  Private
 * @body    budgetMin, budgetMax, preferredCities, etc.
 */
router.put('/leads/:leadId/preferences', updatePreferencesValidation, updateLeadPreferences);

export default router;
