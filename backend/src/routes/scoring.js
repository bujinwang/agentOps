const express = require('express');
const router = express.Router();

// Import ML services
const MLScoringService = require('../services/ml/MLScoringService');
const FeatureEngineeringService = require('../services/ml/FeatureEngineeringService');
const ExplainabilityService = require('../services/ml/ExplainabilityService');
const ScoringApiService = require('../services/ml/ScoringApiService');

// Initialize services
let mlScoringService;
let featureEngineeringService;
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

// Apply rate limiters from ScoringApiService
router.use(async (req, res, next) => {
  await initializeServices();

  // Apply appropriate rate limiter based on endpoint
  if (req.path.includes('/batch')) {
    return scoringApiService.rateLimiters.batchScoring(req, res, next);
  } else if (req.path.includes('/insights') || req.path.includes('/features')) {
    return scoringApiService.rateLimiters.explainability(req, res, next);
  } else {
    return scoringApiService.rateLimiters.scoring(req, res, next);
  }
});

// Apply validation rules
const validationRules = scoringApiService.getValidationRules();

// Routes

/**
 * POST /api/scoring/lead/:leadId
 * Score a single lead by ID
 */
router.post('/lead/:leadId', validationRules.scoreLead, async (req, res) => {
  return scoringApiService.scoreLead(req, res);
});

/**
 * POST /api/scoring/data
 * Score a lead with provided data (no database lookup)
 */
router.post('/data', validationRules.scoreLeadWithData, async (req, res) => {
  return scoringApiService.scoreLeadWithData(req, res);
});

/**
 * POST /api/scoring/batch
 * Score multiple leads in batch
 */
router.post('/batch', validationRules.batchScore, async (req, res) => {
  return scoringApiService.batchScoreLeads(req, res);
});

/**
 * GET /api/scoring/lead/:leadId/history
 * Get scoring history for a lead
 */
router.get('/lead/:leadId/history', validationRules.scoreLead, async (req, res) => {
  return scoringApiService.getLeadScoringHistory(req, res);
});

/**
 * GET /api/scoring/insights/lead/:leadId
 * Get detailed insights and explanations for a lead
 */
router.get('/insights/lead/:leadId', validationRules.scoreLead, async (req, res) => {
  return scoringApiService.getLeadInsights(req, res);
});

/**
 * GET /api/scoring/features/importance
 * Get feature importance analysis
 */
router.get('/features/importance', async (req, res) => {
  return scoringApiService.getFeatureImportance(req, res);
});

/**
 * GET /api/scoring/metrics
 * Get model performance metrics
 */
router.get('/metrics', async (req, res) => {
  return scoringApiService.getModelMetrics(req, res);
});

/**
 * GET /api/scoring/health
 * Get scoring service health status
 */
router.get('/health', async (req, res) => {
  try {
    await initializeServices();

    const healthStatus = {
      service: 'Scoring Service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      endpoints: {
        singleLead: 'POST /api/scoring/lead/:leadId',
        withData: 'POST /api/scoring/data',
        batch: 'POST /api/scoring/batch',
        history: 'GET /api/scoring/lead/:leadId/history',
        insights: 'GET /api/scoring/insights/lead/:leadId',
        featureImportance: 'GET /api/scoring/features/importance',
        metrics: 'GET /api/scoring/metrics'
      }
    };

    res.json({
      success: true,
      data: healthStatus
    });

  } catch (error) {
    console.error('Scoring health check error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check scoring service health'
    });
  }
});

/**
 * GET /api/scoring/stats
 * Get scoring statistics
 */
router.get('/stats', async (req, res) => {
  try {
    await initializeServices();

    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });

    // Get scoring statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_scores,
        COUNT(DISTINCT lead_id) as unique_leads,
        AVG(score) as avg_score,
        MIN(score) as min_score,
        MAX(score) as max_score,
        AVG(confidence) as avg_confidence,
        COUNT(CASE WHEN score > 0.8 THEN 1 END) as high_scores,
        COUNT(CASE WHEN score < 0.2 THEN 1 END) as low_scores,
        MAX(scored_at) as last_score_time,
        MIN(scored_at) as first_score_time
      FROM lead_scores
      WHERE scored_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    `;

    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    // Get hourly distribution
    const hourlyQuery = `
      SELECT
        DATE_TRUNC('hour', scored_at) as hour,
        COUNT(*) as count
      FROM lead_scores
      WHERE scored_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', scored_at)
      ORDER BY hour DESC
    `;

    const hourlyResult = await pool.query(hourlyQuery);
    await pool.end();

    res.json({
      success: true,
      data: {
        period: 'Last 24 hours',
        summary: {
          totalScores: parseInt(stats.total_scores) || 0,
          uniqueLeads: parseInt(stats.unique_leads) || 0,
          averageScore: parseFloat(stats.avg_score) || 0,
          scoreRange: {
            min: parseFloat(stats.min_score) || 0,
            max: parseFloat(stats.max_score) || 0
          },
          averageConfidence: parseFloat(stats.avg_confidence) || 0,
          highScores: parseInt(stats.high_scores) || 0,
          lowScores: parseInt(stats.low_scores) || 0,
          timeRange: {
            first: stats.first_score_time,
            last: stats.last_score_time
          }
        },
        hourlyDistribution: hourlyResult.rows.map(row => ({
          hour: row.hour,
          count: parseInt(row.count)
        }))
      }
    });

  } catch (error) {
    console.error('Get scoring stats API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve scoring statistics'
    });
  }
});

/**
 * POST /api/scoring/test
 * Test scoring with sample data (for development/testing)
 */
router.post('/test', async (req, res) => {
  try {
    await initializeServices();

    // Sample test data
    const testData = {
      leadId: 999,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      createdAt: new Date().toISOString()
    };

    const features = await scoringApiService.extractFeaturesFromData(testData);
    const activeModel = mlScoringService.getActiveModel();

    if (!activeModel) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'No active ML model available for testing'
      });
    }

    const score = await mlScoringService.performScoring(features, activeModel);
    const confidence = mlScoringService.calculateConfidence(score.prediction);

    res.json({
      success: true,
      data: {
        testData: testData,
        features: features,
        score: score.prediction,
        confidence: confidence,
        modelVersion: activeModel.version,
        testMode: true
      }
    });

  } catch (error) {
    console.error('Test scoring API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to test scoring functionality'
    });
  }
});

module.exports = router;