const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Import ML services
const MLScoringService = require('../services/ml/MLScoringService');
const FeatureEngineeringService = require('../services/ml/FeatureEngineeringService');
const ModelTrainingService = require('../services/ml/ModelTrainingService');
const ModelMonitoringService = require('../services/ml/ModelMonitoringService');
const ExplainabilityService = require('../services/ml/ExplainabilityService');
const ScoringApiService = require('../services/ml/ScoringApiService');

// Initialize services
let mlScoringService;
let featureEngineeringService;
let modelTrainingService;
let modelMonitoringService;
let explainabilityService;
let scoringApiService;

// Initialize services on first request
async function initializeServices() {
  if (!mlScoringService) {
    mlScoringService = new MLScoringService();
    await mlScoringService.initialize();
  }

  if (!featureEngineeringService) {
    featureEngineeringService = new FeatureEngineeringService();
  }

  if (!modelTrainingService) {
    modelTrainingService = new ModelTrainingService();
  }

  if (!modelMonitoringService) {
    modelMonitoringService = new ModelMonitoringService();
    await modelMonitoringService.startMonitoring();
  }

  if (!explainabilityService) {
    explainabilityService = new ExplainabilityService();
  }

  if (!scoringApiService) {
    scoringApiService = new ScoringApiService(
      mlScoringService,
      featureEngineeringService,
      explainabilityService
    );
  }
}

// Rate limiters for admin operations
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 admin requests per windowMs
  message: 'Too many admin requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation rules
const trainModelValidation = [
  body('modelType').optional().isIn(['baseline', 'advanced', 'ensemble']).withMessage('Model type must be baseline, advanced, or ensemble'),
  body('forceRetrain').optional().isBoolean().withMessage('forceRetrain must be a boolean')
];

const deployModelValidation = [
  param('modelId').isString().notEmpty().withMessage('Model ID is required'),
  body('setAsActive').optional().isBoolean().withMessage('setAsActive must be a boolean')
];

// Routes

/**
 * GET /api/ml/models
 * Get list of all ML models
 */
router.get('/models', async (req, res) => {
  try {
    await initializeServices();

    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });

    const query = `
      SELECT
        model_id,
        model_type,
        version,
        status,
        accuracy,
        precision,
        recall,
        f1_score,
        training_date,
        created_at
      FROM ml_models
      ORDER BY training_date DESC
    `;

    const result = await pool.query(query);
    await pool.end();

    res.json({
      success: true,
      data: {
        models: result.rows,
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('Get models API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve models'
    });
  }
});

/**
 * GET /api/ml/models/:modelId
 * Get details of a specific model
 */
router.get('/models/:modelId', [
  param('modelId').isString().notEmpty().withMessage('Model ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    await initializeServices();

    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });

    const query = `
      SELECT
        model_id,
        model_type,
        version,
        status,
        accuracy,
        precision,
        recall,
        f1_score,
        training_date,
        metadata,
        created_at
      FROM ml_models
      WHERE model_id = $1
    `;

    const result = await pool.query(query, [req.params.modelId]);
    await pool.end();

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Model not found',
        modelId: req.params.modelId
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get model API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve model'
    });
  }
});

/**
 * POST /api/ml/models/train
 * Train a new ML model
 */
router.post('/models/train',
  authenticateToken,
  requireRole(['admin']),
  adminRateLimit,
  trainModelValidation,
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    await initializeServices();

    const { modelType = 'advanced', forceRetrain = false } = req.body;

    // Check if retraining is needed
    if (!forceRetrain) {
      const needsRetrain = await checkIfRetrainingNeeded();
      if (!needsRetrain) {
        return res.json({
          success: true,
          message: 'Model retraining not needed - current model performing well',
          data: { retrainingSkipped: true }
        });
      }
    }

    // Start training process
    console.log(`Starting ${modelType} model training...`);

    const trainingResult = await modelTrainingService.triggerRetraining();

    if (trainingResult) {
      res.json({
        success: true,
        message: `${modelType} model training completed successfully`,
        data: {
          trainingCompleted: true,
          modelType: modelType
        }
      });
    } else {
      res.status(500).json({
        error: 'Training failed',
        message: 'Model training process failed'
      });
    }

  } catch (error) {
    console.error('Train model API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to train model'
    });
  }
  });

/**
 * POST /api/ml/models/:modelId/deploy
 * Deploy a specific model as active
 */
router.post('/models/:modelId/deploy',
  authenticateToken,
  requireRole(['admin']),
  adminRateLimit,
  deployModelValidation,
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    await initializeServices();

    const { modelId } = req.params;
    const { setAsActive = true } = req.body;

    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });

    // Check if model exists
    const checkQuery = 'SELECT status FROM ml_models WHERE model_id = $1';
    const checkResult = await pool.query(checkQuery, [modelId]);

    if (checkResult.rows.length === 0) {
      await pool.end();
      return res.status(404).json({
        error: 'Model not found',
        modelId: modelId
      });
    }

    if (setAsActive) {
      // Set all other models to inactive
      await pool.query("UPDATE ml_models SET status = 'inactive' WHERE status = 'active'");

      // Set this model as active
      await pool.query("UPDATE ml_models SET status = 'active' WHERE model_id = $1", [modelId]);

      // Reload models in the scoring service
      await mlScoringService.loadActiveModels();
    }

    await pool.end();

    res.json({
      success: true,
      message: `Model ${modelId} ${setAsActive ? 'deployed as active' : 'deployment prepared'}`,
      data: {
        modelId: modelId,
        deployed: true,
        setAsActive: setAsActive
      }
    });

  } catch (error) {
    console.error('Deploy model API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to deploy model'
    });
  }
  });

/**
 * DELETE /api/ml/models/:modelId
 * Delete a model (admin only)
 */
router.delete('/models/:modelId',
  authenticateToken,
  requireRole(['admin']),
  adminRateLimit,
  [
  param('modelId').isString().notEmpty().withMessage('Model ID is required')
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    await initializeServices();

    const { modelId } = req.params;

    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });

    // Check if model is active
    const checkQuery = 'SELECT status FROM ml_models WHERE model_id = $1';
    const checkResult = await pool.query(checkQuery, [modelId]);

    if (checkResult.rows.length === 0) {
      await pool.end();
      return res.status(404).json({
        error: 'Model not found',
        modelId: modelId
      });
    }

    if (checkResult.rows[0].status === 'active') {
      await pool.end();
      return res.status(400).json({
        error: 'Cannot delete active model',
        message: 'Deploy another model as active before deleting this one'
      });
    }

    // Delete model
    await pool.query('DELETE FROM ml_models WHERE model_id = $1', [modelId]);
    await pool.end();

    res.json({
      success: true,
      message: `Model ${modelId} deleted successfully`,
      data: {
        modelId: modelId,
        deleted: true
      }
    });

  } catch (error) {
    console.error('Delete model API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete model'
    });
  }
  });

/**
 * GET /api/ml/features/extract/:leadId
 * Extract features for a specific lead
 */
router.get('/features/extract/:leadId', [
  param('leadId').isInt({ min: 1 }).withMessage('Lead ID must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    await initializeServices();

    const { leadId } = req.params;

    // Check if lead exists
    const leadExists = await checkLeadExists(leadId);
    if (!leadExists) {
      return res.status(404).json({
        error: 'Lead not found',
        leadId: leadId
      });
    }

    // Extract features
    const leadData = await mlScoringService.getLeadData(leadId);
    const features = await featureEngineeringService.extractLeadFeatures(leadData);

    res.json({
      success: true,
      data: {
        leadId: parseInt(leadId),
        features: features,
        extractedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Extract features API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to extract features'
    });
  }
});

/**
 * GET /api/ml/health
 * Get ML service health status
 */
router.get('/health', async (req, res) => {
  try {
    await initializeServices();

    const healthStatus = await modelMonitoringService.checkModelHealth();

    res.json({
      success: true,
      data: {
        service: 'ML Service',
        status: healthStatus.status,
        timestamp: new Date().toISOString(),
        checks: healthStatus.checks
      }
    });

  } catch (error) {
    console.error('Health check API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check service health'
    });
  }
});

// Helper functions

async function checkLeadExists(leadId) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
  });

  try {
    const result = await pool.query('SELECT 1 FROM leads WHERE id = $1', [leadId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Failed to check lead existence:', error);
    return false;
  } finally {
    await pool.end();
  }
}

async function checkIfRetrainingNeeded() {
  // Simple logic: retrain if no recent training or performance degradation
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
  });

  try {
    // Check if we have a recent model (within last 7 days)
    const recentModelQuery = `
      SELECT COUNT(*) as count
      FROM ml_models
      WHERE training_date >= CURRENT_TIMESTAMP - INTERVAL '7 days'
    `;

    const result = await pool.query(recentModelQuery);
    const hasRecentModel = result.rows[0].count > 0;

    return !hasRecentModel;
  } catch (error) {
    console.error('Failed to check retraining need:', error);
    return true; // Default to retraining if check fails
  } finally {
    await pool.end();
  }
}

module.exports = router;
