import { Router } from 'express';
import {
  triggerSync,
  triggerSyncValidation,
  cancelSync,
  getAllSyncStatus,
  getProviderSyncStatus,
  getProviderSyncHistory,
  getRecentSyncHistory,
  getProviderSyncErrors,
  getSyncStatistics,
  toggleProviderSync,
  toggleSyncValidation,
  updateSyncInterval,
  updateIntervalValidation,
  providerIdValidation,
} from '../controllers/mls-admin.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

// All MLS admin routes require authentication
// In production, add additional admin role check
router.use(authenticateJWT);

/**
 * @route   POST /api/v1/admin/mls/sync
 * @desc    Trigger manual MLS sync
 * @access  Private/Admin
 * @body    { providerId: string, syncType?: 'full' | 'incremental' }
 */
router.post('/sync', triggerSyncValidation, triggerSync);

/**
 * @route   POST /api/v1/admin/mls/sync/:providerId/cancel
 * @desc    Cancel running sync
 * @access  Private/Admin
 */
router.post('/sync/:providerId/cancel', providerIdValidation, cancelSync);

/**
 * @route   GET /api/v1/admin/mls/status
 * @desc    Get sync status for all providers
 * @access  Private/Admin
 */
router.get('/status', getAllSyncStatus);

/**
 * @route   GET /api/v1/admin/mls/status/:providerId
 * @desc    Get sync status for a specific provider
 * @access  Private/Admin
 */
router.get('/status/:providerId', providerIdValidation, getProviderSyncStatus);

/**
 * @route   GET /api/v1/admin/mls/history
 * @desc    Get recent sync history across all providers
 * @access  Private/Admin
 * @query   { limit?: number }
 */
router.get('/history', getRecentSyncHistory);

/**
 * @route   GET /api/v1/admin/mls/history/:providerId
 * @desc    Get sync history for a specific provider
 * @access  Private/Admin
 * @query   { limit?: number }
 */
router.get('/history/:providerId', providerIdValidation, getProviderSyncHistory);

/**
 * @route   GET /api/v1/admin/mls/errors/:providerId
 * @desc    Get sync errors for a provider
 * @access  Private/Admin
 * @query   { limit?: number }
 */
router.get('/errors/:providerId', providerIdValidation, getProviderSyncErrors);

/**
 * @route   GET /api/v1/admin/mls/statistics
 * @desc    Get sync statistics across all providers
 * @access  Private/Admin
 */
router.get('/statistics', getSyncStatistics);

/**
 * @route   PUT /api/v1/admin/mls/provider/:providerId/toggle
 * @desc    Enable/disable sync for a provider
 * @access  Private/Admin
 * @body    { enabled: boolean }
 */
router.put('/provider/:providerId/toggle', toggleSyncValidation, toggleProviderSync);

/**
 * @route   PUT /api/v1/admin/mls/provider/:providerId/interval
 * @desc    Update sync interval for a provider
 * @access  Private/Admin
 * @body    { intervalHours: number }
 */
router.put('/provider/:providerId/interval', updateIntervalValidation, updateSyncInterval);

export default router;
