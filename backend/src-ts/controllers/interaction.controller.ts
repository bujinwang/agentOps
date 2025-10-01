/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { body, query as queryValidator, param, validationResult } from 'express-validator';
import { InteractionService } from '../services/interaction.service';
import { successResponse, errorResponse } from '../utils/response';
import { InteractionFilters, PaginationOptions } from '../models/interaction.model';

const interactionService = new InteractionService();

// Validation rules
export const createInteractionValidation = [
  body('leadId')
    .isInt({ min: 1 })
    .withMessage('Valid lead ID is required'),
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Interaction type is required')
    .isLength({ max: 100 })
    .withMessage('Type must be less than 100 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Content must be less than 10000 characters'),
  body('interactionDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
];

export const getInteractionsValidation = [
  queryValidator('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  queryValidator('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  queryValidator('leadId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Lead ID must be a positive integer'),
  queryValidator('type')
    .optional()
    .trim(),
  queryValidator('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  queryValidator('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  queryValidator('sortBy')
    .optional()
    .isIn(['interaction_date', 'created_at', 'type'])
    .withMessage('Invalid sort field'),
  queryValidator('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Sort order must be ASC or DESC'),
];

export const getLeadTimelineValidation = [
  param('leadId').isInt({ min: 1 }).withMessage('Valid lead ID is required'),
  queryValidator('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  queryValidator('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export const interactionIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid interaction ID is required'),
];

// Controllers
export async function createInteraction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    if (!req.user) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const interactionData = {
      ...req.body,
      userId: req.user.userId,
    };

    const interaction = await interactionService.createInteraction(interactionData);

    res.status(201).json(successResponse(interaction, 'Interaction logged successfully'));
  } catch (error) {
    next(error);
  }
}

export async function getInteraction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    if (!req.user) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const interactionId = parseInt(req.params.id, 10);
    const interaction = await interactionService.getInteraction(interactionId, req.user.userId);

    res.status(200).json(successResponse(interaction));
  } catch (error) {
    next(error);
  }
}

export async function getInteractions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    if (!req.user) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const filters: InteractionFilters = {
      leadId: req.query.leadId ? parseInt(req.query.leadId as string, 10) : undefined,
      type: req.query.type as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    };

    const pagination: PaginationOptions = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'ASC' | 'DESC',
    };

    const result = await interactionService.getInteractions(req.user.userId, filters, pagination);

    res.status(200).json(successResponse(result));
  } catch (error) {
    next(error);
  }
}

export async function getLeadTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    if (!req.user) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const leadId = parseInt(req.params.leadId, 10);
    const pagination: PaginationOptions = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      sortBy: 'interaction_date',
      sortOrder: 'DESC',
    };

    const result = await interactionService.getLeadTimeline(leadId, req.user.userId, pagination);

    res.status(200).json(successResponse(result));
  } catch (error) {
    next(error);
  }
}

export async function deleteInteraction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    if (!req.user) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const interactionId = parseInt(req.params.id, 10);
    await interactionService.deleteInteraction(interactionId, req.user.userId);

    res.status(200).json(successResponse(null, 'Interaction deleted successfully'));
  } catch (error) {
    next(error);
  }
}

export async function getInteractionStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const stats = await interactionService.getInteractionStats(req.user.userId);

    res.status(200).json(successResponse(stats));
  } catch (error) {
    next(error);
  }
}
