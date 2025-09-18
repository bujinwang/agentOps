const express = require('express');
const router = express.Router();
const { param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Import ML services
const ModelMonitoringService = require('../services/ml/ModelMonitoringService');
const ExplainabilityService = require('../services/ml/ExplainabilityService');

// Initialize services
let modelMonitoringService;
let explainabilityService;

// Initialize services on first request
async function initializeServices() {
  if (!modelMonitoringService) {
    modelMonitoringService = new ModelMonitoringService();
    await modelMonitoringService.startMonitoring();
  }

  if (!explainabilityService) {
    explainabilityService = new ExplainabilityService();
  }
}

// Rate limiter for monitoring endpoints
const monitoringRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 monitoring requests per windowMs
  message: 'Too many monitoring requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all routes
router.use(monitoringRateLimit);

// Validation rules
const modelIdValidation = [
  param('modelId').isString().notEmpty().withMessage('Model ID is required')
];

const timeRangeValidation = [
  query('startDate').optional().isISO8601().withMessage('startDate must be ISO 8601 format'),
  query('endDate').optional().isISO8601().withMessage('endDate must be ISO 8601 format'),
  query('hours').optional().isInt({ min: 1, max: 168 }).withMessage('hours must be 1-168 (7 days)')
];

// Routes

/**
 * GET /api/model-monitoring/health
 * Get model monitoring service health
 */
router.get('/health', async (req, res) => {
  try {
    await initializeServices();

    const healthStatus = await modelMonitoringService.checkModelHealth();

    res.json({
      success: true,
      data: {
        service: 'Model Monitoring Service',
        status: healthStatus.status,
        timestamp: new Date().toISOString(),
        checks: healthStatus.checks,
        monitoring: {
          active: true,
          interval: '1 hour',
          lastCycle: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Monitoring health check error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check monitoring service health'
    });
  }
});

/**
 * GET /api/model-monitoring/metrics
 * Get comprehensive model performance metrics
 */
router.get('/metrics', timeRangeValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    await initializeServices();

    const { startDate, endDate, hours = 24 } = req.query;

    // Calculate time range
    let startTime, endTime = new Date();

    if (startDate && endDate) {
      startTime = new Date(startDate);
      endTime = new Date(endDate);
    } else {
      startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));
    }

    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });

    // Get comprehensive metrics
    const metricsQuery = `
      SELECT
        model_id,
        metric_name,
        AVG(CAST(metric_value AS DECIMAL)) as avg_value,
        MIN(CAST(metric_value AS DECIMAL)) as min_value,
        MAX(CAST(metric_value AS DECIMAL)) as max_value,
        COUNT(*) as sample_count,
        MIN(recorded_at) as first_recorded,
        MAX(recorded_at) as last_recorded
      FROM model_performance
      WHERE recorded_at >= $1 AND recorded_at <= $2
      GROUP BY model_id, metric_name
      ORDER BY model_id, metric_name
    `;

    const metricsResult = await pool.query(metricsQuery, [startTime, endTime]);

    // Get drift detection results
    const driftQuery = `
      SELECT
        model_id,
        metric_name,
        metric_value,
        recorded_at
      FROM model_performance
      WHERE metric_name LIKE 'alert_drift%'
      AND recorded_at >= $1
      ORDER BY recorded_at DESC
      LIMIT 10
    `;

    const driftResult = await pool.query(driftQuery, [startTime]);

    await pool.end();

    // Organize metrics by model
    const metricsByModel = {};
    metricsResult.rows.forEach(row => {
      if (!metricsByModel[row.model_id]) {
        metricsByModel[row.model_id] = {};
      }
      metricsByModel[row.model_id][row.metric_name] = {
        average: parseFloat(row.avg_value),
        min: parseFloat(row.min_value),
        max: parseFloat(row.max_value),
        sampleCount: parseInt(row.sample_count),
        timeRange: {
          start: row.first_recorded,
          end: row.last_recorded
        }
      };
    });

    res.json({
      success: true,
      data: {
        timeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          hours: hours
        },
        models: metricsByModel,
        alerts: {
          drift: driftResult.rows.map(row => ({
            modelId: row.model_id,
            type: row.metric_name.replace('alert_', ''),
            details: JSON.parse(row.metric_value),
            timestamp: row.recorded_at
          }))
        },
        summary: {
          totalModels: Object.keys(metricsByModel).length,
          totalAlerts: driftResult.rows.length
        }
      }
    });

  } catch (error) {
    console.error('Get metrics API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve model metrics'
    });
  }
});

/**
 * GET /api/model-monitoring/drift-detection
 * Get model drift detection results
 */
router.get('/drift-detection', timeRangeValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    await initializeServices();

    const { hours = 168 } = req.query; // Default to 7 days
    const startTime = new Date(Date.now() - (hours * 60 * 60 * 1000));

    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });

    // Get drift detection history
    const driftQuery = `
      SELECT
        model_id,
        metric_name,
        metric_value,
        recorded_at
      FROM model_performance
      WHERE metric_name LIKE 'alert_drift%'
      AND recorded_at >= $1
      ORDER BY recorded_at DESC
    `;

    const driftResult = await pool.query(driftQuery, [startTime]);

    // Get performance trends for drift analysis
    const trendQuery = `
      SELECT
        model_id,
        DATE_TRUNC('day', recorded_at) as date,
        AVG(CASE WHEN metric_name = 'accuracy' THEN CAST(metric_value AS DECIMAL) END) as avg_accuracy,
        AVG(CASE WHEN metric_name = 'precision' THEN CAST(metric_value AS DECIMAL) END) as avg_precision
      FROM model_performance
      WHERE metric_name IN ('accuracy', 'precision')
      AND recorded_at >= $1
      GROUP BY model_id, DATE_TRUNC('day', recorded_at)
      ORDER BY model_id, date DESC
    `;

    const trendResult = await pool.query(trendQuery, [startTime]);
    await pool.end();

    // Analyze trends for drift patterns
    const driftAnalysis = analyzeDriftPatterns(trendResult.rows);

    res.json({
      success: true,
      data: {
        timeRange: {
          start: startTime.toISOString(),
          end: new Date().toISOString(),
          hours: hours
        },
        alerts: driftResult.rows.map(row => ({
          modelId: row.model_id,
          type: row.metric_name.replace('alert_', ''),
          severity: JSON.parse(row.metric_value).severity || 'medium',
          details: JSON.parse(row.metric_value),
          timestamp: row.recorded_at
        })),
        trends: driftAnalysis,
        recommendations: generateDriftRecommendations(driftResult.rows, driftAnalysis)
      }
    });

  } catch (error) {
    console.error('Drift detection API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve drift detection results'
    });
  }
});

/**
 * GET /api/model-monitoring/performance/:modelId
 * Get detailed performance metrics for a specific model
 */
router.get('/performance/:modelId', modelIdValidation, timeRangeValidation, async (req, res) => {
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
    const { hours = 168 } = req.query; // Default to 7 days
    const startTime = new Date(Date.now() - (hours * 60 * 60 * 1000));

    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });

    // Get detailed performance metrics for the model
    const performanceQuery = `
      SELECT
        metric_name,
        metric_value,
        recorded_at
      FROM model_performance
      WHERE model_id = $1
      AND recorded_at >= $2
      ORDER BY recorded_at DESC
      LIMIT 1000
    `;

    const performanceResult = await pool.query(performanceQuery, [modelId, startTime]);

    // Get model information
    const modelQuery = `
      SELECT model_type, version, accuracy, training_date
      FROM ml_models
      WHERE model_id = $1
    `;

    const modelResult = await pool.query(modelQuery, [modelId]);
    await pool.end();

    if (modelResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Model not found',
        modelId: modelId
      });
    }

    const model = modelResult.rows[0];

    // Analyze performance trends
    const performanceAnalysis = analyzePerformanceTrends(performanceResult.rows);

    res.json({
      success: true,
      data: {
        modelId: modelId,
        modelInfo: {
          type: model.model_type,
          version: model.version,
          baselineAccuracy: parseFloat(model.accuracy),
          trainingDate: model.training_date
        },
        timeRange: {
          start: startTime.toISOString(),
          end: new Date().toISOString(),
          hours: hours
        },
        metrics: performanceResult.rows.map(row => ({
          metric: row.metric_name,
          value: parseFloat(row.metric_value),
          timestamp: row.recorded_at
        })),
        analysis: performanceAnalysis,
        recommendations: generatePerformanceRecommendations(performanceAnalysis)
      }
    });

  } catch (error) {
    console.error('Get model performance API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve model performance'
    });
  }
});

/**
 * GET /api/model-monitoring/feature-importance
 * Get current feature importance analysis
 */
router.get('/feature-importance', async (req, res) => {
  try {
    await initializeServices();

    const analysis = await explainabilityService.getFeatureImportanceAnalysis();

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Get feature importance API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve feature importance analysis'
    });
  }
});

/**
 * GET /api/model-monitoring/alerts
 * Get recent monitoring alerts
 */
router.get('/alerts', timeRangeValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    await initializeServices();

    const { hours = 24 } = req.query;
    const startTime = new Date(Date.now() - (hours * 60 * 60 * 1000));

    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });

    // Get all alerts
    const alertsQuery = `
      SELECT
        model_id,
        metric_name,
        metric_value,
        recorded_at
      FROM model_performance
      WHERE metric_name LIKE 'alert_%'
      AND recorded_at >= $1
      ORDER BY recorded_at DESC
      LIMIT 50
    `;

    const alertsResult = await pool.query(alertsQuery, [startTime]);
    await pool.end();

    const alerts = alertsResult.rows.map(row => ({
      modelId: row.model_id,
      type: row.metric_name.replace('alert_', ''),
      severity: JSON.parse(row.metric_value).severity || 'medium',
      message: JSON.parse(row.metric_value).message || 'Alert triggered',
      details: JSON.parse(row.metric_value),
      timestamp: row.recorded_at
    }));

    // Group alerts by type
    const alertsByType = {};
    alerts.forEach(alert => {
      if (!alertsByType[alert.type]) {
        alertsByType[alert.type] = [];
      }
      alertsByType[alert.type].push(alert);
    });

    res.json({
      success: true,
      data: {
        timeRange: {
          start: startTime.toISOString(),
          end: new Date().toISOString(),
          hours: hours
        },
        totalAlerts: alerts.length,
        alertsByType: alertsByType,
        recentAlerts: alerts.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('Get alerts API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve monitoring alerts'
    });
  }
});

// Helper functions

function analyzeDriftPatterns(trendData) {
  const analysis = {};

  // Group by model
  const models = {};
  trendData.forEach(row => {
    if (!models[row.model_id]) {
      models[row.model_id] = [];
    }
    models[row.model_id].push({
      date: row.date,
      accuracy: parseFloat(row.avg_accuracy),
      precision: parseFloat(row.avg_precision)
    });
  });

  // Analyze trends for each model
  Object.keys(models).forEach(modelId => {
    const data = models[modelId].sort((a, b) => new Date(a.date) - new Date(b.date));

    if (data.length >= 2) {
      const recent = data.slice(-3); // Last 3 days
      const older = data.slice(0, -3); // Previous days

      const recentAvgAccuracy = recent.reduce((sum, d) => sum + d.accuracy, 0) / recent.length;
      const olderAvgAccuracy = older.length > 0 ?
        older.reduce((sum, d) => sum + d.accuracy, 0) / older.length : recentAvgAccuracy;

      const accuracyChange = ((recentAvgAccuracy - olderAvgAccuracy) / olderAvgAccuracy) * 100;

      analysis[modelId] = {
        dataPoints: data.length,
        recentAvgAccuracy: recentAvgAccuracy,
        olderAvgAccuracy: olderAvgAccuracy,
        accuracyChangePercent: accuracyChange,
        trend: Math.abs(accuracyChange) > 5 ? (accuracyChange > 0 ? 'improving' : 'degrading') : 'stable',
        timeRange: {
          start: data[0].date,
          end: data[data.length - 1].date
        }
      };
    }
  });

  return analysis;
}

function analyzePerformanceTrends(performanceData) {
  const metrics = {};

  // Group by metric type
  performanceData.forEach(row => {
    if (!metrics[row.metric_name]) {
      metrics[row.metric_name] = [];
    }
    metrics[row.metric_name].push({
      value: parseFloat(row.metric_value),
      timestamp: row.recorded_at
    });
  });

  const analysis = {};

  Object.keys(metrics).forEach(metricName => {
    const data = metrics[metricName].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (data.length >= 2) {
      const values = data.map(d => d.value);
      const recent = values.slice(-5); // Last 5 measurements
      const older = values.slice(0, -5); // Previous measurements

      const recentAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
      const olderAvg = older.length > 0 ?
        older.reduce((sum, v) => sum + v, 0) / older.length : recentAvg;

      const changePercent = olderAvg !== 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

      analysis[metricName] = {
        currentValue: recent[recent.length - 1],
        recentAverage: recentAvg,
        changePercent: changePercent,
        trend: Math.abs(changePercent) > 10 ?
          (changePercent > 0 ? 'increasing' : 'decreasing') : 'stable',
        volatility: calculateVolatility(values),
        dataPoints: data.length
      };
    }
  });

  return analysis;
}

function calculateVolatility(values) {
  if (values.length < 2) return 0;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance) / mean; // Coefficient of variation
}

function generateDriftRecommendations(alerts, trends) {
  const recommendations = [];

  // Check for drift alerts
  const driftAlerts = alerts.filter(alert => alert.type === 'drift');
  if (driftAlerts.length > 0) {
    recommendations.push({
      type: 'immediate',
      priority: 'high',
      action: 'Schedule model retraining due to detected performance drift',
      reason: `${driftAlerts.length} drift alerts in the last ${driftAlerts.length} monitoring cycles`
    });
  }

  // Check for degrading trends
  Object.values(trends).forEach(modelAnalysis => {
    if (modelAnalysis.trend === 'degrading' && Math.abs(modelAnalysis.accuracyChangePercent) > 10) {
      recommendations.push({
        type: 'urgent',
        priority: 'high',
        action: 'Investigate model degradation and consider immediate retraining',
        reason: `Model accuracy decreased by ${modelAnalysis.accuracyChangePercent.toFixed(1)}%`
      });
    }
  });

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'maintenance',
      priority: 'low',
      action: 'Continue regular monitoring - no immediate action required',
      reason: 'Models are performing within acceptable parameters'
    });
  }

  return recommendations;
}

function generatePerformanceRecommendations(analysis) {
  const recommendations = [];

  Object.entries(analysis).forEach(([metric, data]) => {
    if (data.trend === 'decreasing' && Math.abs(data.changePercent) > 15) {
      recommendations.push({
        metric: metric,
        type: 'investigation',
        priority: 'medium',
        action: `Investigate ${metric} degradation`,
        reason: `${metric} decreased by ${data.changePercent.toFixed(1)}%`
      });
    }

    if (data.volatility > 0.2) {
      recommendations.push({
        metric: metric,
        type: 'optimization',
        priority: 'low',
        action: `Consider stabilizing ${metric} measurements`,
        reason: `High volatility detected (${(data.volatility * 100).toFixed(1)}% coefficient of variation)`
      });
    }
  });

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'monitoring',
      priority: 'low',
      action: 'Continue performance monitoring',
      reason: 'All metrics are stable and within acceptable ranges'
    });
  }

  return recommendations;
}

module.exports = router;