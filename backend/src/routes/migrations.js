/**
 * Migration Management API Routes
 * Provides endpoints for managing database migrations
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const migrationManager = require('../migrations');
const { logger } = require('../config/logger');
const { sendResponse, sendError } = require('../utils/responseFormatter');

const router = express.Router();

// Get migration status
router.get('/status', authenticate, async (req, res) => {
  try {
    const status = await migrationManager.getStatus();
    
    sendResponse(res, {
      currentVersion: status.currentVersion,
      executedCount: status.executedCount,
      availableCount: status.availableCount,
      pendingCount: status.pendingCount,
      executed: status.executed,
      pending: status.pending
    }, 'Migration status retrieved successfully');
  } catch (error) {
    logger.error('Error getting migration status:', error);
    sendError(res, 'Failed to get migration status', 'MIGRATION_ERROR', null, 500);
  }
});

// Run pending migrations
router.post('/migrate', authenticate, async (req, res) => {
  try {
    const results = await migrationManager.runMigrations();
    
    sendResponse(res, {
      executed: results.length,
      migrations: results.map(r => ({
        version: r.version,
        success: r.success
      }))
    }, 'Migrations executed successfully', results.length > 0 ? 201 : 200);
  } catch (error) {
    logger.error('Error running migrations:', error);
    sendError(res, 'Failed to execute migrations', 'MIGRATION_ERROR', null, 500);
  }
});

// Rollback last migration
router.post('/rollback', authenticate, async (req, res) => {
  try {
    const rolledBack = await migrationManager.rollback();
    
    if (rolledBack) {
      sendResponse(res, {
        version: rolledBack.version,
        description: rolledBack.description,
        executedAt: rolledBack.executed_at
      }, 'Migration rolled back successfully');
    } else {
      sendResponse(res, null, 'No migrations to rollback', 200);
    }
  } catch (error) {
    logger.error('Error rolling back migration:', error);
    sendError(res, 'Failed to rollback migration', 'MIGRATION_ERROR', null, 500);
  }
});

// Validate migration integrity
router.get('/validate', authenticate, async (req, res) => {
  try {
    const issues = await migrationManager.runner.validateMigrations();
    
    if (issues.length > 0) {
      sendResponse(res, {
        valid: false,
        issues: issues.map(issue => ({
          version: issue.version,
          issue: issue.issue,
          expectedChecksum: issue.expectedChecksum,
          actualChecksum: issue.actualChecksum
        }))
      }, 'Migration validation failed', 400);
    } else {
      sendResponse(res, { valid: true }, 'All migrations are valid');
    }
  } catch (error) {
    logger.error('Error validating migrations:', error);
    sendError(res, 'Failed to validate migrations', 'VALIDATION_ERROR', null, 500);
  }
});

// Get current schema version
router.get('/version', authenticate, async (req, res) => {
  try {
    const currentVersion = await migrationManager.runner.getCurrentVersion();
    
    sendResponse(res, {
      version: currentVersion,
      timestamp: new Date().toISOString()
    }, 'Current schema version retrieved successfully');
  } catch (error) {
    logger.error('Error getting schema version:', error);
    sendError(res, 'Failed to get schema version', 'VERSION_ERROR', null, 500);
  }
});

// Create new migration (for development)
router.post('/create', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return sendError(res, 'Migration name is required', 'VALIDATION_ERROR', null, 400);
    }
    
    const migration = await migrationManager.createMigration(name.trim());
    
    sendResponse(res, {
      filename: migration.filename,
      filepath: migration.filepath,
      name: name.trim()
    }, 'Migration created successfully', 201);
  } catch (error) {
    logger.error('Error creating migration:', error);
    sendError(res, 'Failed to create migration', 'CREATE_ERROR', null, 500);
  }
});

module.exports = router;