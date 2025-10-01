/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { body, query as queryValidator, param, validationResult } from 'express-validator';
import { LeadService } from '../services/lead.service';
import { successResponse, errorResponse } from '../utils/response';
import { LeadFilters, PaginationOptions } from '../models/lead.model';

const leadService = new LeadService();

// Validation rules
export const createLeadValidation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 255 })
    .withMessage('First name must be less than 255 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 255 })
    .withMessage('Last name must be less than 255 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Invalid phone format'),
  body('source')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Source must be less than 100 characters'),
  body('status')
    .optional()
    .trim(),
  body('priority')
    .optional()
    .trim(),
  body('budgetMin')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget min must be a positive number'),
  body('budgetMax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget max must be a positive number'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Notes must be less than 5000 characters'),
];

export const updateLeadValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid lead ID is required'),
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('First name must be less than 255 characters'),
  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Last name must be less than 255 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Invalid phone format'),
  body('source')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Source must be less than 100 characters'),
  body('status')
    .optional()
    .trim(),
  body('priority')
    .optional()
    .trim(),
  body('budgetMin')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget min must be a positive number'),
  body('budgetMax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget max must be a positive number'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Notes must be less than 5000 characters'),
];

export const getLeadsValidation = [
  queryValidator('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  queryValidator('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  queryValidator('status')
    .optional()
    .trim(),
  queryValidator('priority')
    .optional()
    .trim(),
  queryValidator('sortBy')
    .optional()
    .isIn(['created_at', 'updated_at', 'first_name', 'last_name', 'priority', 'status'])
    .withMessage('Invalid sort field'),
  queryValidator('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Sort order must be ASC or DESC'),
  queryValidator('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term must be less than 100 characters'),
  queryValidator('minBudget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min budget must be a positive number'),
  queryValidator('maxBudget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max budget must be a positive number'),
];

export const leadIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid lead ID is required'),
];

// Controllers
export async function createLead(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const leadData = {
      ...req.body,
      userId: req.user.userId,
    };

    const lead = await leadService.createLead(leadData);

    res.status(201).json(successResponse(lead, 'Lead created successfully'));
  } catch (error) {
    next(error);
  }
}

export async function getLead(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const leadId = parseInt(req.params.id, 10);
    const lead = await leadService.getLead(leadId, req.user.userId);

    res.status(200).json(successResponse(lead));
  } catch (error) {
    next(error);
  }
}

export async function getLeads(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const filters: LeadFilters = {
      status: req.query.status as any,
      priority: req.query.priority as any,
      source: req.query.source as string,
      search: req.query.search as string,
      minBudget: req.query.minBudget ? parseFloat(req.query.minBudget as string) : undefined,
      maxBudget: req.query.maxBudget ? parseFloat(req.query.maxBudget as string) : undefined,
    };

    const pagination: PaginationOptions = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'ASC' | 'DESC',
    };

    const result = await leadService.getLeads(req.user.userId, filters, pagination);

    res.status(200).json(successResponse(result));
  } catch (error) {
    next(error);
  }
}

export async function updateLead(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const leadId = parseInt(req.params.id, 10);
    const lead = await leadService.updateLead(leadId, req.user.userId, req.body);

    res.status(200).json(successResponse(lead, 'Lead updated successfully'));
  } catch (error) {
    next(error);
  }
}

export async function deleteLead(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const leadId = parseInt(req.params.id, 10);
    await leadService.deleteLead(leadId, req.user.userId);

    res.status(200).json(successResponse(null, 'Lead deleted successfully'));
  } catch (error) {
    next(error);
  }
}

export async function getLeadStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const stats = await leadService.getLeadStats(req.user.userId);

    res.status(200).json(successResponse(stats));
  } catch (error) {
    next(error);
  }
}
