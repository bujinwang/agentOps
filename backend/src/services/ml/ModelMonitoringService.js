const { Pool } = require('pg');
const tf = require('@tensorflow/tfjs-node');

class ModelMonitoringService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });

    this.monitoringInterval = null;
    this.driftThreshold = 0.1; // 10% change triggers alert
    this.performanceWindow = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  }

  /**
   * Start monitoring service
   */
  async startMonitoring() {
    console.log('Starting ML model monitoring service...');

    // Run initial monitoring
    await this.performMonitoring();

    // Set up periodic monitoring (every hour)
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performMonitoring();
      } catch (error) {
        console.error('Monitoring cycle failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    console.log('ML monitoring service started');
  }

  /**
   * Stop monitoring service
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('ML monitoring service stopped');
    }
  }

  /**
   * Perform comprehensive monitoring cycle
   */
  async performMonitoring() {
    try {
      console.log('Performing ML model monitoring cycle...');

      // Track model performance metrics
      await this.trackModelPerformance();

      // Detect model drift
      const driftDetected = await this.detectModelDrift();

      // Monitor prediction distribution
      await this.monitorPredictionDistribution();

      // Check model health
      const healthStatus = await this.checkModelHealth();

      // Log monitoring results
      await this.logMonitoringResults({
        timestamp: new Date(),
        driftDetected,
        healthStatus,
        metrics: await this.calculateModelMetrics()
      });

      // Trigger alerts if needed
      if (driftDetected || healthStatus.status !== 'healthy') {
        await this.triggerAlerts(driftDetected, healthStatus);
      }

      console.log('Monitoring cycle completed');
    } catch (error) {
      console.error('Monitoring cycle failed:', error);
      throw error;
    }
  }

  /**
   * Track model performance metrics
   */
  async trackModelPerformance() {
    try {
      // Get recent scoring data
      const query = `
        SELECT
          model_version,
          score,
          confidence,
          scored_at,
          -- Get actual conversion outcome (if available)
          CASE
            WHEN l.converted_at IS NOT NULL AND l.converted_at > s.scored_at THEN 1
            WHEN l.status = 'converted' AND l.updated_at > s.scored_at THEN 1
            ELSE 0
          END as actual_outcome
        FROM lead_scores s
        JOIN leads l ON s.lead_id = l.id
        WHERE s.scored_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
        ORDER BY s.scored_at DESC
        LIMIT 1000
      `;

      const result = await this.pool.query(query);
      const scoringData = result.rows;

      if (scoringData.length === 0) {
        console.log('No recent scoring data to analyze');
        return;
      }

      // Calculate performance metrics
      const metrics = this.calculatePerformanceMetrics(scoringData);

      // Store metrics
      await this.storePerformanceMetrics(metrics);

      console.log(`Tracked performance for ${scoringData.length} predictions:`, metrics);
    } catch (error) {
      console.error('Failed to track model performance:', error);
      throw error;
    }
  }

  /**
   * Detect model drift
   * @returns {Promise<boolean>} True if drift detected
   */
  async detectModelDrift() {
    try {
      // Get baseline metrics (from last month)
      const baselineQuery = `
        SELECT AVG(accuracy) as avg_accuracy, AVG(precision) as avg_precision
        FROM model_performance
        WHERE recorded_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
        AND recorded_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
      `;

      const currentQuery = `
        SELECT AVG(accuracy) as avg_accuracy, AVG(precision) as avg_precision
        FROM model_performance
        WHERE recorded_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
      `;

      const [baselineResult, currentResult] = await Promise.all([
        this.pool.query(baselineQuery),
        this.pool.query(currentQuery)
      ]);

      const baseline = baselineResult.rows[0];
      const current = currentResult.rows[0];

      if (!baseline.avg_accuracy || !current.avg_accuracy) {
        console.log('Insufficient data for drift detection');
        return false;
      }

      // Calculate drift
      const accuracyDrift = Math.abs(current.avg_accuracy - baseline.avg_accuracy) / baseline.avg_accuracy;
      const precisionDrift = Math.abs(current.avg_precision - baseline.avg_precision) / baseline.avg_precision;

      const maxDrift = Math.max(accuracyDrift, precisionDrift);

      console.log(`Model drift detection: accuracy=${accuracyDrift.toFixed(4)}, precision=${precisionDrift.toFixed(4)}, max=${maxDrift.toFixed(4)}`);

      return maxDrift > this.driftThreshold;
    } catch (error) {
      console.error('Failed to detect model drift:', error);
      return false;
    }
  }

  /**
   * Monitor prediction distribution
   */
  async monitorPredictionDistribution() {
    try {
      const query = `
        SELECT
          FLOOR(score * 10) / 10 as score_bucket,
          COUNT(*) as count
        FROM lead_scores
        WHERE scored_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        GROUP BY FLOOR(score * 10) / 10
        ORDER BY score_bucket
      `;

      const result = await this.pool.query(query);
      const distribution = result.rows;

      // Analyze distribution for anomalies
      const analysis = this.analyzeDistribution(distribution);

      // Store distribution analysis
      await this.storeDistributionAnalysis(analysis);

      console.log('Prediction distribution analysis:', analysis);
    } catch (error) {
      console.error('Failed to monitor prediction distribution:', error);
      throw error;
    }
  }

  /**
   * Check model health
   * @returns {Promise<Object>} Health status
   */
  async checkModelHealth() {
    try {
      const healthChecks = {
        modelExists: await this.checkActiveModelExists(),
        recentPredictions: await this.checkRecentPredictions(),
        errorRate: await this.checkErrorRate(),
        responseTime: await this.checkResponseTime()
      };

      const overallStatus = this.determineOverallHealth(healthChecks);

      return {
        status: overallStatus,
        checks: healthChecks,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Failed to check model health:', error);
      return {
        status: 'error',
        checks: { error: error.message },
        timestamp: new Date()
      };
    }
  }

  /**
   * Calculate comprehensive model metrics
   * @returns {Promise<Object>} Model metrics
   */
  async calculateModelMetrics() {
    try {
      const query = `
        SELECT
          model_version,
          COUNT(*) as total_predictions,
          AVG(score) as avg_score,
          STDDEV(score) as score_stddev,
          AVG(confidence) as avg_confidence,
          COUNT(CASE WHEN score > 0.8 THEN 1 END) as high_score_predictions,
          COUNT(CASE WHEN score < 0.2 THEN 1 END) as low_score_predictions
        FROM lead_scores
        WHERE scored_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
        GROUP BY model_version
        ORDER BY model_version DESC
        LIMIT 5
      `;

      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Failed to calculate model metrics:', error);
      return [];
    }
  }

  /**
   * Trigger alerts for issues
   * @param {boolean} driftDetected - Whether drift was detected
   * @param {Object} healthStatus - Health status object
   */
  async triggerAlerts(driftDetected, healthStatus) {
    try {
      const alerts = [];

      if (driftDetected) {
        alerts.push({
          type: 'drift',
          severity: 'high',
          message: 'Model drift detected - performance has degraded significantly',
          timestamp: new Date()
        });
      }

      if (healthStatus.status === 'unhealthy') {
        alerts.push({
          type: 'health',
          severity: 'high',
          message: 'Model health check failed - immediate attention required',
          details: healthStatus.checks,
          timestamp: new Date()
        });
      } else if (healthStatus.status === 'warning') {
        alerts.push({
          type: 'health',
          severity: 'medium',
          message: 'Model health warnings detected',
          details: healthStatus.checks,
          timestamp: new Date()
        });
      }

      if (alerts.length > 0) {
        await this.storeAlerts(alerts);
        console.log('Alerts triggered:', alerts.length);
      }
    } catch (error) {
      console.error('Failed to trigger alerts:', error);
      throw error;
    }
  }

  // Helper methods

  calculatePerformanceMetrics(scoringData) {
    const total = scoringData.length;
    const withOutcomes = scoringData.filter(s => s.actual_outcome !== null);

    if (withOutcomes.length === 0) {
      return {
        totalPredictions: total,
        accuracy: null,
        precision: null,
        recall: null,
        f1Score: null,
        avgConfidence: scoringData.reduce((sum, s) => sum + s.confidence, 0) / total
      };
    }

    // Calculate confusion matrix
    let truePositives = 0, falsePositives = 0, trueNegatives = 0, falseNegatives = 0;

    for (const item of withOutcomes) {
      const predicted = item.score > 0.5 ? 1 : 0;
      const actual = item.actual_outcome;

      if (predicted === 1 && actual === 1) truePositives++;
      else if (predicted === 1 && actual === 0) falsePositives++;
      else if (predicted === 0 && actual === 0) trueNegatives++;
      else if (predicted === 0 && actual === 1) falseNegatives++;
    }

    const accuracy = (truePositives + trueNegatives) / withOutcomes.length;
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

    return {
      totalPredictions: total,
      evaluatedPredictions: withOutcomes.length,
      accuracy,
      precision,
      recall,
      f1Score,
      avgConfidence: scoringData.reduce((sum, s) => sum + s.confidence, 0) / total
    };
  }

  analyzeDistribution(distribution) {
    const total = distribution.reduce((sum, bucket) => sum + parseInt(bucket.count), 0);
    const buckets = distribution.length;

    // Check for unusual patterns
    const highScoreBuckets = distribution.filter(b => parseFloat(b.score_bucket) > 0.7);
    const lowScoreBuckets = distribution.filter(b => parseFloat(b.score_bucket) < 0.3);

    const highScorePercentage = highScoreBuckets.reduce((sum, b) => sum + parseInt(b.count), 0) / total;
    const lowScorePercentage = lowScoreBuckets.reduce((sum, b) => sum + parseInt(b.count), 0) / total;

    return {
      totalPredictions: total,
      bucketCount: buckets,
      highScorePercentage,
      lowScorePercentage,
      distribution: distribution,
      anomalies: this.detectDistributionAnomalies(distribution, total)
    };
  }

  detectDistributionAnomalies(distribution, total) {
    const anomalies = [];

    // Check for empty buckets (gaps in distribution)
    const buckets = distribution.map(b => parseFloat(b.score_bucket)).sort((a, b) => a - b);
    for (let i = 0; i < buckets.length - 1; i++) {
      if (buckets[i + 1] - buckets[i] > 0.2) { // Gap larger than 0.2
        anomalies.push(`Gap in score distribution between ${buckets[i]} and ${buckets[i + 1]}`);
      }
    }

    // Check for extreme concentrations
    const maxBucket = distribution.reduce((max, b) => parseInt(b.count) > parseInt(max.count) ? b : max);
    const maxPercentage = parseInt(maxBucket.count) / total;

    if (maxPercentage > 0.5) {
      anomalies.push(`Extreme concentration in score bucket ${maxBucket.score_bucket} (${(maxPercentage * 100).toFixed(1)}% of predictions)`);
    }

    return anomalies;
  }

  async checkActiveModelExists() {
    try {
      const result = await this.pool.query(
        "SELECT COUNT(*) as count FROM ml_models WHERE status = 'active'"
      );
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('Failed to check active model:', error);
      return false;
    }
  }

  async checkRecentPredictions() {
    try {
      const result = await this.pool.query(`
        SELECT COUNT(*) as count
        FROM lead_scores
        WHERE scored_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
      `);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('Failed to check recent predictions:', error);
      return false;
    }
  }

  async checkErrorRate() {
    try {
      const query = `
        SELECT
          COALESCE(SUM(error_count), 0) AS errors,
          COALESCE(SUM(total_predictions), 0) AS total
        FROM model_usage_stats
        WHERE date >= CURRENT_DATE - INTERVAL '7 days'
      `;

      const result = await this.pool.query(query);
      const row = result.rows[0] || { errors: 0, total: 0 };

      const errors = Number(row.errors) || 0;
      const total = Number(row.total) || 0;

      if (total === 0) {
        return 0;
      }

      return errors / total;
    } catch (error) {
      console.error('Failed to check error rate:', error);
      return 1.0; // High error rate indicates issue
    }
  }

  async checkResponseTime() {
    try {
      const query = `
        SELECT
          AVG(response_time_avg) AS avg_response_time
        FROM model_usage_stats
        WHERE date >= CURRENT_DATE - INTERVAL '7 days'
          AND response_time_avg IS NOT NULL
      `;

      const result = await this.pool.query(query);
      const avgResponse = result.rows[0]?.avg_response_time;

      if (!avgResponse) {
        return 0;
      }

      return Number(avgResponse);
    } catch (error) {
      console.error('Failed to check response time:', error);
      return 10000; // Very slow response indicates issue
    }
  }

  determineOverallHealth(healthChecks) {
    const issues = [];

    if (!healthChecks.modelExists) issues.push('No active model');
    if (!healthChecks.recentPredictions) issues.push('No recent predictions');
    if (healthChecks.errorRate > 0.1) issues.push('High error rate');
    if (healthChecks.responseTime > 5000) issues.push('Slow response time');

    if (issues.length === 0) return 'healthy';
    if (issues.length <= 2) return 'warning';
    return 'unhealthy';
  }

  async storePerformanceMetrics(metrics) {
    const query = `
      INSERT INTO model_performance (
        model_id, metric_name, metric_value, recorded_at
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `;

    const values = [
      ['accuracy', metrics.accuracy],
      ['precision', metrics.precision],
      ['recall', metrics.recall],
      ['f1_score', metrics.f1Score],
      ['avg_confidence', metrics.avgConfidence]
    ].filter(([_, value]) => value !== null);

    for (const [metricName, value] of values) {
      await this.pool.query(query, ['current_model', metricName, value]);
    }
  }

  async storeDistributionAnalysis(analysis) {
    const query = `
      INSERT INTO model_performance (
        model_id, metric_name, metric_value, recorded_at
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `;

    await this.pool.query(query, [
      'current_model',
      'distribution_analysis',
      JSON.stringify(analysis)
    ]);
  }

  async storeAlerts(alerts) {
    const query = `
      INSERT INTO model_performance (
        model_id, metric_name, metric_value, recorded_at
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `;

    for (const alert of alerts) {
      await this.pool.query(query, [
        'current_model',
        `alert_${alert.type}`,
        JSON.stringify(alert)
      ]);
    }
  }

  async logMonitoringResults(results) {
    const query = `
      INSERT INTO model_performance (
        model_id, metric_name, metric_value, recorded_at
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `;

    await this.pool.query(query, [
      'current_model',
      'monitoring_cycle',
      JSON.stringify(results)
    ]);
  }

  /**
   * Clean up resources
   */
  async close() {
    this.stopMonitoring();
    await this.pool.end();
  }
}

module.exports = ModelMonitoringService;
