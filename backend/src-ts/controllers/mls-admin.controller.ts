/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { MLSAdminService } from '../services/mls/mls-admin.service';
import { successResponse, errorResponse } from '../utils/response';

const mlsAdminService = new MLSAdminService();

// Validation rules
export const triggerSyncValidation = [
  body('providerId')
    .trim()
    .notEmpty()
    .withMessage('Provider ID is required'),
  body('syncType')
    .optional()
    .isIn(['full', 'incremental'])
    .withMessage('Sync type must be "full" or "incremental"'),
];

export const providerIdValidation = [
  param('providerId')
    .trim()
    .notEmpty()
    .withMessage('Provider ID is required'),
];

export const toggleSyncValidation = [
  param('providerId')
    .trim()
    .notEmpty()
    .withMessage('Provider ID is required'),
  body('enabled')
    .isBoolean()
    .withMessage('Enabled must be a boolean'),
];

export const updateIntervalValidation = [
  param('providerId')
    .trim()
    .notEmpty()
    .withMessage('Provider ID is required'),
  body('intervalHours')
    .isInt({ min: 1, max: 24 })
    .withMessage('Interval must be between 1 and 24 hours'),
];

// Controllers

/**
 * Trigger manual MLS sync
 */
export async function triggerSync(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    const { providerId, syncType = 'incremental' } = req.body;
    const triggeredBy = req.user ? `user_${req.user.userId}` : 'admin';

    console.log(`🔄 Manual sync triggered for ${providerId} by ${triggeredBy}`);

    // Trigger sync in background (don't wait for completion)
    mlsAdminService.triggerSync(providerId, syncType, triggeredBy)
      .then(result => {
        console.log(`✅ Sync completed for ${providerId}:`, {
          added: result.propertiesAdded,
          updated: result.propertiesUpdated,
          errors: result.propertiesErrored,
        });
      })
      .catch(error => {
        console.error(`❌ Sync failed for ${providerId}:`, error);
      });

    res.status(202).json(successResponse(
      { providerId, syncType, status: 'started' },
      'Sync started. Check status endpoint for progress.'
    ));
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel running sync
 */
export async function cancelSync(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    const { providerId } = req.params;

    await mlsAdminService.cancelSync(providerId);

    res.status(200).json(successResponse(
      { providerId, status: 'cancelled' },
      'Sync cancelled successfully'
    ));
  } catch (error) {
    next(error);
  }
}

/**
 * Get sync status for all providers
 */
export async function getAllSyncStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const statuses = await mlsAdminService.getAllSyncStatus();

    res.status(200).json(successResponse({ providers: statuses }));
  } catch (error) {
    next(error);
  }
}

/**
 * Get sync status for a specific provider
 */
export async function getProviderSyncStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    const { providerId } = req.params;

    const status = await mlsAdminService.getProviderSyncStatus(providerId);

    res.status(200).json(successResponse(status));
  } catch (error) {
    next(error);
  }
}

/**
 * Get sync history for a provider
 */
export async function getProviderSyncHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    const { providerId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const history = await mlsAdminService.getProviderSyncHistory(providerId, limit);

    res.status(200).json(successResponse({ history }));
  } catch (error) {
    next(error);
  }
}

/**
 * Get recent sync history across all providers
 */
export async function getRecentSyncHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const history = await mlsAdminService.getRecentSyncHistory(limit);

    res.status(200).json(successResponse({ history }));
  } catch (error) {
    next(error);
  }
}

/**
 * Get sync errors for a provider
 */
export async function getProviderSyncErrors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    const { providerId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

    const syncErrors = await mlsAdminService.getProviderSyncErrors(providerId, limit);

    res.status(200).json(successResponse({ errors: syncErrors }));
  } catch (error) {
    next(error);
  }
}

/**
 * Get sync statistics
 */
export async function getSyncStatistics(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await mlsAdminService.getSyncStatistics();

    res.status(200).json(successResponse(stats));
  } catch (error) {
    next(error);
  }
}

/**
 * Enable/disable sync for a provider
 */
export async function toggleProviderSync(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    const { providerId } = req.params;
    const { enabled } = req.body;

    await mlsAdminService.toggleProviderSync(providerId, enabled);

    res.status(200).json(successResponse(
      { providerId, enabled },
      `Sync ${enabled ? 'enabled' : 'disabled'} for provider`
    ));
  } catch (error) {
    next(error);
  }
}

/**
 * Update sync interval for a provider
 */
export async function updateSyncInterval(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input data', errors.array()));
      return;
    }

    const { providerId } = req.params;
    const { intervalHours } = req.body;

    await mlsAdminService.updateSyncInterval(providerId, intervalHours);

    res.status(200).json(successResponse(
      { providerId, intervalHours },
      'Sync interval updated successfully'
    ));
  } catch (error) {
    next(error);
  }
}
