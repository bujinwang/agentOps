/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { body, query as queryValidator, param, validationResult } from 'express-validator';
import { PropertyService } from '../services/property.service';
import { successResponse, errorResponse } from '../utils/response';
import { PropertyFilters, PaginationOptions } from '../models/property.model';

const propertyService = new PropertyService();

// Validation rules
export const createPropertyValidation = [
  body('mlsListingId')
    .trim()
    .notEmpty()
    .withMessage('MLS listing ID is required')
    .isLength({ max: 100 })
    .withMessage('MLS listing ID must be less than 100 characters'),
  body('mlsProvider')
    .trim()
    .notEmpty()
    .withMessage('MLS provider is required'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters'),
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('postalCode')
    .trim()
    .notEmpty()
    .withMessage('Postal code is required'),
  body('propertyType')
    .trim()
    .notEmpty()
    .withMessage('Property type is required'),
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('bedrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Bedrooms must be a non-negative integer'),
  body('bathrooms')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Bathrooms must be a non-negative number'),
  body('squareFeet')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Square feet must be a non-negative integer'),
];

export const updatePropertyValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid property ID is required'),
  body('status')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Status cannot be empty'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('bedrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Bedrooms must be a non-negative integer'),
  body('bathrooms')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Bathrooms must be a non-negative number'),
  body('squareFeet')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Square feet must be a non-negative integer'),
];

export const getPropertiesValidation = [
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
  queryValidator('propertyType')
    .optional()
    .trim(),
  queryValidator('city')
    .optional()
    .trim(),
  queryValidator('state')
    .optional()
    .trim(),
  queryValidator('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min price must be a non-negative number'),
  queryValidator('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max price must be a non-negative number'),
  queryValidator('minBedrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Min bedrooms must be a non-negative integer'),
  queryValidator('maxBedrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Max bedrooms must be a non-negative integer'),
  queryValidator('minBathrooms')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min bathrooms must be a non-negative number'),
  queryValidator('maxBathrooms')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max bathrooms must be a non-negative number'),
  queryValidator('minSquareFeet')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Min square feet must be a non-negative integer'),
  queryValidator('maxSquareFeet')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Max square feet must be a non-negative integer'),
  queryValidator('search')
    .optional()
    .trim(),
  queryValidator('sortBy')
    .optional()
    .isIn(['created_at', 'updated_at', 'price', 'listed_date', 'bedrooms', 'bathrooms', 'square_feet'])
    .withMessage('Invalid sort field'),
  queryValidator('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Sort order must be ASC or DESC'),
];

export const propertyIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid property ID is required'),
];

// Controllers
export async function createProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    const property = await propertyService.createProperty(req.body);

    res.status(201).json(successResponse(property, 'Property created successfully'));
  } catch (error) {
    next(error);
  }
}

export async function getProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    const propertyId = parseInt(req.params.id, 10);
    const includeMedia = req.query.includeMedia === 'true';

    const property = includeMedia
      ? await propertyService.getPropertyWithMedia(propertyId)
      : await propertyService.getProperty(propertyId);

    res.status(200).json(successResponse(property));
  } catch (error) {
    next(error);
  }
}

export async function getProperties(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    const filters: PropertyFilters = {
      status: req.query.status as string,
      propertyType: req.query.propertyType as string,
      city: req.query.city as string,
      state: req.query.state as string,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      minBedrooms: req.query.minBedrooms ? parseInt(req.query.minBedrooms as string, 10) : undefined,
      maxBedrooms: req.query.maxBedrooms ? parseInt(req.query.maxBedrooms as string, 10) : undefined,
      minBathrooms: req.query.minBathrooms ? parseFloat(req.query.minBathrooms as string) : undefined,
      maxBathrooms: req.query.maxBathrooms ? parseFloat(req.query.maxBathrooms as string) : undefined,
      minSquareFeet: req.query.minSquareFeet ? parseInt(req.query.minSquareFeet as string, 10) : undefined,
      maxSquareFeet: req.query.maxSquareFeet ? parseInt(req.query.maxSquareFeet as string, 10) : undefined,
      mlsProvider: req.query.mlsProvider as string,
      search: req.query.search as string,
    };

    const pagination: PaginationOptions = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'ASC' | 'DESC',
    };

    const result = await propertyService.getProperties(filters, pagination);

    res.status(200).json(successResponse(result));
  } catch (error) {
    next(error);
  }
}

export async function updateProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    const propertyId = parseInt(req.params.id, 10);
    const property = await propertyService.updateProperty(propertyId, req.body);

    res.status(200).json(successResponse(property, 'Property updated successfully'));
  } catch (error) {
    next(error);
  }
}

export async function deleteProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    const propertyId = parseInt(req.params.id, 10);
    await propertyService.deleteProperty(propertyId);

    res.status(200).json(successResponse(null, 'Property deleted successfully'));
  } catch (error) {
    next(error);
  }
}

export async function getPropertyStatistics(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await propertyService.getPropertyStatistics();

    res.status(200).json(successResponse(stats));
  } catch (error) {
    next(error);
  }
}

export async function searchProperties(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const searchTerm = req.query.q as string;

    if (!searchTerm) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Search term (q) is required'));
      return;
    }

    const pagination: PaginationOptions = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };

    const result = await propertyService.searchProperties(searchTerm, pagination);

    res.status(200).json(successResponse(result));
  } catch (error) {
    next(error);
  }
}

export async function getFeaturedProperties(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    if (limit < 1 || limit > 50) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Limit must be between 1 and 50'));
      return;
    }

    const properties = await propertyService.getFeaturedProperties(limit);

    res.status(200).json(successResponse(properties));
  } catch (error) {
    next(error);
  }
}
