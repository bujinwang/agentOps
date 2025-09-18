const { Lead } = require('../../models/Lead');
const { EnrichmentAudit } = require('../../models/EnrichmentAudit');

class EnrichmentMonitoringService {
  constructor() {
    this.metrics = {
      totalEnrichments: 0,
      successfulEnrichments: 0,
      failedEnrichments: 0,
      averageProcessingTime: 0,
      providerHealth: {},
      cacheHitRate: 0,
      qualityScoreDistribution: {},
      errorRateByProvider: {},
      enrichmentTriggers: {},
    };

    this.alerts = [];
    this.performanceHistory = [];
    this.healthCheckInterval = 5 * 60 * 1000; // 5 minutes

    // Start health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Record enrichment completion
   * @param {Object} enrichmentResult - Enrichment result
   * @param {number} processingTime - Processing time in milliseconds
   */
  recordEnrichmentCompletion(enrichmentResult, processingTime) {
    this.metrics.totalEnrichments++;

    if (enrichmentResult.qualityScore >= 80) {
      this.metrics.successfulEnrichments++;
    } else {
      this.metrics.failedEnrichments++;
    }

    // Update average processing time
    const totalTime = this.metrics.averageProcessingTime * (this.metrics.totalEnrichments - 1) + processingTime;
    this.metrics.averageProcessingTime = totalTime / this.metrics.totalEnrichments;

    // Track quality score distribution
    const scoreRange = Math.floor(enrichmentResult.qualityScore / 10) * 10;
    this.metrics.qualityScoreDistribution[scoreRange] =
      (this.metrics.qualityScoreDistribution[scoreRange] || 0) + 1;

    // Track provider performance
    if (enrichmentResult.sources) {
      enrichmentResult.sources.forEach(source => {
        if (!this.metrics.providerHealth[source]) {
          this.metrics.providerHealth[source] = {
            totalRequests: 0,
            successfulRequests: 0,
            averageResponseTime: 0,
          };
        }

        this.metrics.providerHealth[source].totalRequests++;
        if (enrichmentResult.qualityScore >= 80) {
          this.metrics.providerHealth[source].successfulRequests++;
        }
      });
    }

    // Store performance history
    this.performanceHistory.push({
      timestamp: new Date(),
      processingTime,
      qualityScore: enrichmentResult.qualityScore,
      sources: enrichmentResult.sources,
      confidence: enrichmentResult.confidence,
    });

    // Keep only last 1000 records
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-1000);
    }

    // Check for alerts
    this.checkForAlerts(enrichmentResult);
  }

  /**
   * Record enrichment failure
   * @param {string} error - Error message
   * @param {string} provider - Provider that failed
   */
  recordEnrichmentFailure(error, provider) {
    this.metrics.totalEnrichments++;
    this.metrics.failedEnrichments++;

    // Track error rate by provider
    this.metrics.errorRateByProvider[provider] =
      (this.metrics.errorRateByProvider[provider] || 0) + 1;

    // Create alert for high error rates
    const errorRate = this.metrics.errorRateByProvider[provider] / this.metrics.totalEnrichments;
    if (errorRate > 0.1) { // 10% error rate
      this.createAlert('high_error_rate', {
        provider,
        errorRate: (errorRate * 100).toFixed(2) + '%',
        error,
      });
    }
  }

  /**
   * Record cache performance
   * @param {boolean} isHit - Whether cache hit occurred
   */
  recordCachePerformance(isHit) {
    if (isHit) {
      this.metrics.cacheHitRate = (this.metrics.cacheHitRate * 0.9) + 0.1; // Exponential moving average
    } else {
      this.metrics.cacheHitRate = this.metrics.cacheHitRate * 0.9;
    }
  }

  /**
   * Record trigger execution
   * @param {string} triggerId - Trigger identifier
   * @param {boolean} success - Whether trigger executed successfully
   */
  recordTriggerExecution(triggerId, success) {
    if (!this.metrics.enrichmentTriggers[triggerId]) {
      this.metrics.enrichmentTriggers[triggerId] = {
        totalExecutions: 0,
        successfulExecutions: 0,
        lastExecution: null,
      };
    }

    this.metrics.enrichmentTriggers[triggerId].totalExecutions++;
    this.metrics.enrichmentTriggers[triggerId].lastExecution = new Date();

    if (success) {
      this.metrics.enrichmentTriggers[triggerId].successfulExecutions++;
    }
  }

  /**
   * Get comprehensive enrichment status
   * @returns {Object} Enrichment status
   */
  async getEnrichmentStatus() {
    const status = {
      overall: this.calculateOverallHealth(),
      metrics: { ...this.metrics },
      alerts: this.alerts.slice(-10), // Last 10 alerts
      recentPerformance: this.performanceHistory.slice(-20), // Last 20 enrichments
      providerStatus: await this.getProviderStatus(),
      systemLoad: await this.getSystemLoad(),
      timestamp: new Date(),
    };

    return status;
  }

  /**
   * Get detailed provider status
   * @returns {Object} Provider status
   */
  async getProviderStatus() {
    const providers = {
      property: await this.getServiceHealth('PropertyDataProvider'),
      social: await this.getServiceHealth('SocialMediaProvider'),
      credit: await this.getServiceHealth('CreditReportingProvider'),
    };

    return providers;
  }

  /**
   * Get service health status
   * @param {string} serviceName - Service name
   * @returns {Object} Service health
   */
  async getServiceHealth(serviceName) {
    try {
      const service = require(`./providers/${serviceName}`);
      const health = await service.getHealthStatus();

      return {
        status: health.overall,
        lastChecked: new Date(),
        details: health.providers,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Get system load metrics
   * @returns {Object} System load
   */
  async getSystemLoad() {
    try {
      // Get database connection status
      const dbStatus = await this.checkDatabaseHealth();

      // Get cache status
      const cacheStatus = await this.checkCacheHealth();

      // Get memory usage
      const memUsage = process.memoryUsage();

      return {
        database: dbStatus,
        cache: cacheStatus,
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        },
        uptime: Math.round(process.uptime()) + 's',
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Check database health
   * @returns {Object} Database health
   */
  async checkDatabaseHealth() {
    try {
      const startTime = Date.now();
      await Lead.findAll({ limit: 1 });
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime: responseTime + 'ms',
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check cache health
   * @returns {Object} Cache health
   */
  async checkCacheHealth() {
    try {
      const cacheService = require('./CacheService');
      const stats = await cacheService.getStats();

      return {
        status: 'healthy',
        hitRate: stats.hitRate,
        totalKeys: stats.totalKeys,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Calculate overall system health
   * @returns {string} Health status
   */
  calculateOverallHealth() {
    const errorRate = this.metrics.totalEnrichments > 0
      ? this.metrics.failedEnrichments / this.metrics.totalEnrichments
      : 0;

    const avgQualityScore = this.calculateAverageQualityScore();

    // Critical alerts
    const criticalAlerts = this.alerts.filter(alert => alert.severity === 'critical').length;

    if (criticalAlerts > 0 || errorRate > 0.2 || avgQualityScore < 70) {
      return 'critical';
    } else if (errorRate > 0.1 || avgQualityScore < 80) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  /**
   * Calculate average quality score
   * @returns {number} Average quality score
   */
  calculateAverageQualityScore() {
    if (this.performanceHistory.length === 0) return 0;

    const totalScore = this.performanceHistory.reduce((sum, record) => sum + record.qualityScore, 0);
    return totalScore / this.performanceHistory.length;
  }

  /**
   * Create an alert
   * @param {string} type - Alert type
   * @param {Object} data - Alert data
   * @param {string} severity - Alert severity
   */
  createAlert(type, data, severity = 'warning') {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      data,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    console.warn(`Enrichment Alert [${severity.toUpperCase()}]:`, type, data);
  }

  /**
   * Check for alerts based on enrichment result
   * @param {Object} enrichmentResult - Enrichment result
   */
  checkForAlerts(enrichmentResult) {
    // Low quality score alert
    if (enrichmentResult.qualityScore < 70) {
      this.createAlert('low_quality_score', {
        leadId: enrichmentResult.leadId,
        qualityScore: enrichmentResult.qualityScore,
        sources: enrichmentResult.sources,
      }, 'warning');
    }

    // Low confidence alert
    if (enrichmentResult.confidence < 0.6) {
      this.createAlert('low_confidence', {
        leadId: enrichmentResult.leadId,
        confidence: enrichmentResult.confidence,
        sources: enrichmentResult.sources,
      }, 'info');
    }

    // No data sources alert
    if (!enrichmentResult.sources || enrichmentResult.sources.length === 0) {
      this.createAlert('no_data_sources', {
        leadId: enrichmentResult.leadId,
        enrichmentId: enrichmentResult.enrichmentId,
      }, 'warning');
    }
  }

  /**
   * Acknowledge an alert
   * @param {string} alertId - Alert ID
   * @param {string} userId - User who acknowledged
   */
  acknowledgeAlert(alertId, userId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = new Date();
    }
  }

  /**
   * Get enrichment analytics
   * @param {Object} filters - Filters for analytics
   * @returns {Object} Analytics data
   */
  async getEnrichmentAnalytics(filters = {}) {
    const analytics = {
      summary: {
        totalEnrichments: this.metrics.totalEnrichments,
        successRate: this.metrics.totalEnrichments > 0
          ? (this.metrics.successfulEnrichments / this.metrics.totalEnrichments * 100).toFixed(2) + '%'
          : '0%',
        averageQualityScore: this.calculateAverageQualityScore().toFixed(2),
        averageProcessingTime: Math.round(this.metrics.averageProcessingTime) + 'ms',
        cacheHitRate: (this.metrics.cacheHitRate * 100).toFixed(2) + '%',
      },
      qualityDistribution: this.metrics.qualityScoreDistribution,
      providerPerformance: this.metrics.providerHealth,
      triggerPerformance: this.metrics.enrichmentTriggers,
      trends: this.calculateTrends(),
      filters: filters,
      generatedAt: new Date(),
    };

    return analytics;
  }

  /**
   * Calculate performance trends
   * @returns {Object} Trends data
   */
  calculateTrends() {
    if (this.performanceHistory.length < 10) {
      return { message: 'Insufficient data for trends' };
    }

    const recent = this.performanceHistory.slice(-50);
    const older = this.performanceHistory.slice(-100, -50);

    const recentAvgQuality = recent.reduce((sum, r) => sum + r.qualityScore, 0) / recent.length;
    const olderAvgQuality = older.reduce((sum, r) => sum + r.qualityScore, 0) / older.length;

    const recentAvgTime = recent.reduce((sum, r) => sum + r.processingTime, 0) / recent.length;
    const olderAvgTime = older.reduce((sum, r) => sum + r.processingTime, 0) / older.length;

    return {
      qualityScoreTrend: recentAvgQuality > olderAvgQuality ? 'improving' : 'declining',
      qualityScoreChange: ((recentAvgQuality - olderAvgQuality) / olderAvgQuality * 100).toFixed(2) + '%',
      processingTimeTrend: recentAvgTime < olderAvgTime ? 'improving' : 'declining',
      processingTimeChange: ((recentAvgTime - olderAvgTime) / olderAvgTime * 100).toFixed(2) + '%',
    };
  }

  /**
   * Get lead enrichment history
   * @param {number} leadId - Lead ID
   * @returns {Array} Enrichment history
   */
  async getLeadEnrichmentHistory(leadId) {
    try {
      const audits = await EnrichmentAudit.findAll({
        where: { leadId },
        order: [['timestamp', 'DESC']],
        limit: 20,
      });

      return audits.map(audit => ({
        timestamp: audit.timestamp,
        eventType: audit.eventType,
        data: audit.data ? JSON.parse(audit.data) : null,
        metadata: audit.metadata ? JSON.parse(audit.metadata) : null,
      }));
    } catch (error) {
      console.error(`Failed to get enrichment history for lead ${leadId}:`, error);
      return [];
    }
  }

  /**
   * Start health monitoring
   * @private
   */
  startHealthMonitoring() {
    setInterval(async () => {
      try {
        const health = await this.getEnrichmentStatus();

        // Create alerts for health issues
        if (health.overall === 'critical') {
          this.createAlert('system_health_critical', {
            overallStatus: health.overall,
            errorRate: health.metrics.failedEnrichments / health.metrics.totalEnrichments,
          }, 'critical');
        } else if (health.overall === 'warning') {
          this.createAlert('system_health_warning', {
            overallStatus: health.overall,
            averageQualityScore: this.calculateAverageQualityScore(),
          }, 'warning');
        }
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, this.healthCheckInterval);
  }

  /**
   * Reset metrics (for testing)
   */
  resetMetrics() {
    this.metrics = {
      totalEnrichments: 0,
      successfulEnrichments: 0,
      failedEnrichments: 0,
      averageProcessingTime: 0,
      providerHealth: {},
      cacheHitRate: 0,
      qualityScoreDistribution: {},
      errorRateByProvider: {},
      enrichmentTriggers: {},
    };

    this.alerts = [];
    this.performanceHistory = [];
  }
}

module.exports = new EnrichmentMonitoringService();