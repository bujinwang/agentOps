/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/auth.service';
import { successResponse, errorResponse } from '../utils/response';

const authService = new AuthService();

// Validation rules
export const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required'),
];

export const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Controllers
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse(
        'VALIDATION_ERROR',
        'Invalid input data',
        errors.array()
      ));
      return;
    }

    const result = await authService.register(req.body);

    res.status(201).json(successResponse(result, 'User registered successfully'));
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse(
        'VALIDATION_ERROR',
        'Invalid input data',
        errors.array()
      ));
      return;
    }

    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.status(200).json(successResponse(result, 'Login successful'));
  } catch (error) {
    next(error);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      res.status(400).json(errorResponse(
        'MISSING_REFRESH_TOKEN',
        'Refresh token is required'
      ));
      return;
    }

    const result = await authService.refreshToken(refreshToken);

    res.status(200).json(successResponse(result));
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json(errorResponse(
        'UNAUTHORIZED',
        'Authentication required'
      ));
      return;
    }

    const user = await authService.getCurrentUser(req.user.userId);
    
    if (!user) {
      res.status(404).json(errorResponse(
        'USER_NOT_FOUND',
        'User not found'
      ));
      return;
    }

    res.status(200).json(successResponse(user));
  } catch (error) {
    next(error);
  }
}
