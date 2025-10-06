/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { body, param, query as queryValidator, validationResult } from 'express-validator';
import { MatchService } from '../services/matching/match.service';
import { successResponse, errorResponse } from '../utils/response';

const matchService = new MatchService();

// Validation rules
export const findMatchesValidation = [
  param('leadId').isInt().withMessage('Lead ID must be an integer'),
  queryValidator('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  queryValidator('minScore').optional().isFloat({ min: 0, max: 100 }).withMessage('Min score must be between 0 and 100'),
];

export const getLeadMatchesValidation = [
  param('leadId').isInt().withMessage('Lead ID must be an integer'),
  queryValidator('status').optional().isIn(['pending', 'viewed', 'interested', 'contacted', 'scheduled', 'dismissed', 'converted']),
  queryValidator('minScore').optional().isFloat({ min: 0, max: 100 }),
  queryValidator('page').optional().isInt({ min: 1 }),
  queryValidator('limit').optional().isInt({ min: 1, max: 100 }),
];

export const rateMatchValidation = [
  param('matchId').isInt().withMessage('Match ID must be an integer'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('notes').optional().isString(),
];

export const dismissMatchValidation = [
  param('matchId').isInt().withMessage('Match ID must be an integer'),
  body('reason').optional().isString(),
];

export const updateStatusValidation = [
  param('matchId').isInt().withMessage('Match ID must be an integer'),
  body('status').isIn(['viewed', 'interested', 'contacted', 'scheduled', 'converted']).withMessage('Invalid status'),
  body('notes').optional().isString(),
];

export const updatePreferencesValidation = [
  param('leadId').isInt().withMessage('Lead ID must be an integer'),
  body('budgetMin').optional().isFloat({ min: 0 }),
  body('budgetMax').optional().isFloat({ min: 0 }),
  body('preferredCities').optional().isArray(),
  body('preferredStates').optional().isArray(),
  body('minBedrooms').optional().isInt({ min: 0 }),
  body('maxBedrooms').optional().isInt({ min: 0 }),
  body('minBathrooms').optional().isFloat({ min: 0 }),
  body('maxBathrooms').optional().isFloat({ min: 0 }),
  body('preferredPropertyTypes').optional().isArray(),
  body('mustHaveFeatures').optional().isArray(),
  body('niceToHaveFeatures').optional().isArray(),
  body('dealBreakers').optional().isArray(),
];

/**
 * Find new matches for a lead
 * POST /api/v1/matches/find/:leadId
 */
export async function findMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    const leadId = parseInt(req.params.leadId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const minScore = req.query.minScore ? parseFloat(req.query.minScore as string) : undefined;

    const result = await matchService.findMatchesForLead(leadId, { limit, minScore });

    res.status(200).json(successResponse(result, 'Matches found successfully'));
  } catch (error) {
    next(error);
  }
}

/**
 * Get existing matches for a lead
 * GET /api/v1/matches/lead/:leadId
 */
export async function getLeadMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    const leadId = parseInt(req.params.leadId);
    const status = req.query.status as string | undefined;
    const minScore = req.query.minScore ? parseFloat(req.query.minScore as string) : undefined;
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    const result = await matchService.getLeadMatches(leadId, { status, minScore, page, limit });

    res.status(200).json(successResponse(result));
  } catch (error) {
    next(error);
  }
}

/**
 * Get match details by ID
 * GET /api/v1/matches/:matchId
 */
export async function getMatchById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const matchId = parseInt(req.params.matchId);

    const match = await matchService.getMatchById(matchId);

    res.status(200).json(successResponse(match));
  } catch (error) {
    next(error);
  }
}

/**
 * Batch match all active leads
 * POST /api/v1/matches/batch
 */
export async function batchMatchLeads(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const minScore = req.body.minScore || 40;

    const stats = await matchService.batchMatchAllLeads({ minScore });

    res.status(200).json(successResponse(stats, 'Batch matching completed'));
  } catch (error) {
    next(error);
  }
}

/**
 * Rate a match
 * PUT /api/v1/matches/:matchId/rate
 */
export async function rateMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    const matchId = parseInt(req.params.matchId);
    const { rating, notes } = req.body;

    const match = await matchService.rateMatch(matchId, rating, notes);

    res.status(200).json(successResponse(match, 'Match rated successfully'));
  } catch (error) {
    next(error);
  }
}

/**
 * Dismiss a match
 * DELETE /api/v1/matches/:matchId
 */
export async function dismissMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    const matchId = parseInt(req.params.matchId);
    const { reason } = req.body;

    const result = await matchService.dismissMatch(matchId, reason);

    res.status(200).json(successResponse(result));
  } catch (error) {
    next(error);
  }
}

/**
 * Update match status
 * PUT /api/v1/matches/:matchId/status
 */
export async function updateMatchStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    const matchId = parseInt(req.params.matchId);
    const { status, notes } = req.body;

    const match = await matchService.updateMatchStatus(matchId, status, notes);

    res.status(200).json(successResponse(match, 'Match status updated'));
  } catch (error) {
    next(error);
  }
}

/**
 * Get match statistics
 * GET /api/v1/matches/statistics
 */
export async function getStatistics(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await matchService.getStatistics();

    res.status(200).json(successResponse(stats));
  } catch (error) {
    next(error);
  }
}

/**
 * Get lead preferences
 * GET /api/v1/leads/:leadId/preferences
 */
export async function getLeadPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const leadId = parseInt(req.params.leadId);

    const preferences = await matchService.getLeadPreferences(leadId);

    res.status(200).json(successResponse(preferences));
  } catch (error) {
    next(error);
  }
}

/**
 * Update lead preferences
 * PUT /api/v1/leads/:leadId/preferences
 */
export async function updateLeadPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    const leadId = parseInt(req.params.leadId);
    const preferences = req.body;

    const updated = await matchService.updateLeadPreferences(leadId, preferences);

    res.status(200).json(successResponse(updated, 'Preferences updated successfully'));
  } catch (error) {
    next(error);
  }
}
