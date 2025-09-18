const axios = require('axios');
const crypto = require('crypto');
const { WebhookLog } = require('../../models/WebhookLog');

class WebhookService {
  constructor() {
    this.webhooks = new Map(); // Cache for webhook configurations
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Register a webhook endpoint
   * @param {string} webhookId - Unique webhook identifier
   * @param {Object} config - Webhook configuration
   */
  registerWebhook(webhookId, config) {
    this.webhooks.set(webhookId, {
      ...config,
      registeredAt: new Date(),
      isActive: true,
    });
  }

  /**
   * Unregister a webhook endpoint
   * @param {string} webhookId - Webhook identifier
   */
  unregisterWebhook(webhookId) {
    this.webhooks.delete(webhookId);
  }

  /**
   * Send enrichment completion notification
   * @param {number} leadId - Lead ID
   * @param {Object} enrichmentResult - Enrichment result data
   * @param {string} eventType - Event type (enrichment_completed, enrichment_failed, etc.)
   */
  async sendEnrichmentNotification(leadId, enrichmentResult, eventType = 'enrichment_completed') {
    const payload = {
      eventType,
      leadId,
      timestamp: new Date(),
      enrichmentId: enrichmentResult.enrichmentId,
      qualityScore: enrichmentResult.qualityScore,
      confidence: enrichmentResult.confidence,
      sources: enrichmentResult.sources,
      data: this.sanitizeWebhookData(enrichmentResult.data),
    };

    // Send to all registered webhooks
    const promises = [];
    for (const [webhookId, config] of this.webhooks) {
      if (config.isActive && this.shouldSendToWebhook(config, eventType)) {
        promises.push(this.sendToWebhook(webhookId, config, payload));
      }
    }

    // Wait for all webhooks to complete (with timeout)
    const results = await Promise.allSettled(promises);

    // Log results
    await this.logWebhookResults(leadId, results, payload);

    return results;
  }

  /**
   * Send consent change notification
   * @param {number} leadId - Lead ID
   * @param {Object} consentData - Consent change data
   */
  async sendConsentNotification(leadId, consentData) {
    const payload = {
      eventType: 'consent_changed',
      leadId,
      timestamp: new Date(),
      consentId: consentData.id,
      action: consentData.action, // granted, withdrawn, expired
      grantedAt: consentData.grantedAt,
      expiresAt: consentData.expiresAt,
      withdrawnAt: consentData.withdrawnAt,
      reason: consentData.reason,
    };

    const promises = [];
    for (const [webhookId, config] of this.webhooks) {
      if (config.isActive && config.events.includes('consent_changed')) {
        promises.push(this.sendToWebhook(webhookId, config, payload));
      }
    }

    const results = await Promise.allSettled(promises);
    await this.logWebhookResults(leadId, results, payload);

    return results;
  }

  /**
   * Send data deletion notification
   * @param {number} leadId - Lead ID
   * @param {Object} deletionData - Deletion details
   */
  async sendDeletionNotification(leadId, deletionData) {
    const payload = {
      eventType: 'data_deleted',
      leadId,
      timestamp: new Date(),
      requestType: deletionData.requestType,
      deletedAt: deletionData.deletedAt,
      dataRemoved: deletionData.dataRemoved,
    };

    const promises = [];
    for (const [webhookId, config] of this.webhooks) {
      if (config.isActive && config.events.includes('data_deleted')) {
        promises.push(this.sendToWebhook(webhookId, config, payload));
      }
    }

    const results = await Promise.allSettled(promises);
    await this.logWebhookResults(leadId, results, payload);

    return results;
  }

  /**
   * Send to individual webhook with retry logic
   * @private
   */
  async sendToWebhook(webhookId, config, payload) {
    const signature = this.generateSignature(payload, config.secret);
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'RealEstateCRM-Webhook/1.0',
      'X-Webhook-ID': webhookId,
      'X-Signature': signature,
      'X-Timestamp': Date.now().toString(),
    };

    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.post(config.url, payload, {
          headers,
          timeout: this.timeout,
          validateStatus: (status) => status < 500, // Retry on server errors
        });

        // Success
        return {
          webhookId,
          success: true,
          attempt,
          statusCode: response.status,
          responseTime: response.config.metadata?.endTime - response.config.metadata?.startTime,
        };

      } catch (error) {
        lastError = error;

        if (attempt < this.maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    // All retries failed
    throw {
      webhookId,
      success: false,
      attempts: this.maxRetries,
      lastError: lastError.message,
      statusCode: lastError.response?.status,
    };
  }

  /**
   * Check if webhook should receive this event type
   * @private
   */
  shouldSendToWebhook(config, eventType) {
    return config.events && config.events.includes(eventType);
  }

  /**
   * Sanitize webhook data to remove sensitive information
   * @private
   */
  sanitizeWebhookData(data) {
    if (!data) return data;

    const sanitized = { ...data };

    // Remove sensitive credit data
    if (sanitized.credit) {
      sanitized.credit = {
        ...sanitized.credit,
        creditScore: sanitized.credit.scoreVerified ? sanitized.credit.creditScore : undefined,
        scoreVerified: sanitized.credit.scoreVerified,
        creditRating: sanitized.credit.creditRating,
        // Remove detailed payment history and other sensitive data
        paymentHistory: undefined,
        debtToIncomeRatio: undefined,
      };
    }

    return sanitized;
  }

  /**
   * Generate webhook signature for security
   * @private
   */
  generateSignature(payload, secret) {
    if (!secret) return '';

    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadString);
    return hmac.digest('hex');
  }

  /**
   * Log webhook delivery results
   * @private
   */
  async logWebhookResults(leadId, results, payload) {
    const logEntries = results.map(result => ({
      leadId,
      webhookId: result.value?.webhookId || result.reason?.webhookId,
      eventType: payload.eventType,
      success: result.status === 'fulfilled' ? result.value.success : false,
      attempt: result.value?.attempt || result.reason?.attempts,
      statusCode: result.value?.statusCode || result.reason?.statusCode,
      error: result.status === 'rejected' ? result.reason.lastError : null,
      responseTime: result.value?.responseTime,
      payload: JSON.stringify(payload),
      sentAt: new Date(),
    }));

    // Batch insert logs
    try {
      await WebhookLog.bulkCreate(logEntries);
    } catch (error) {
      console.error('Failed to log webhook results:', error);
    }
  }

  /**
   * Get webhook delivery statistics
   * @param {string} webhookId - Optional webhook ID filter
   * @returns {Promise<Object>} Statistics
   */
  async getWebhookStats(webhookId = null) {
    try {
      const whereClause = webhookId ? { webhookId } : {};

      const [total, successful, failed] = await Promise.all([
        WebhookLog.count({ where: whereClause }),
        WebhookLog.count({ where: { ...whereClause, success: true } }),
        WebhookLog.count({ where: { ...whereClause, success: false } }),
      ]);

      const successRate = total > 0 ? (successful / total) * 100 : 0;

      // Get recent failures
      const recentFailures = await WebhookLog.findAll({
        where: { ...whereClause, success: false },
        order: [['sentAt', 'DESC']],
        limit: 10,
        attributes: ['webhookId', 'eventType', 'error', 'statusCode', 'sentAt'],
      });

      return {
        total,
        successful,
        failed,
        successRate: Math.round(successRate * 100) / 100,
        recentFailures: recentFailures.map(failure => failure.toJSON()),
      };
    } catch (error) {
      console.error('Failed to get webhook stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Test webhook endpoint
   * @param {string} webhookId - Webhook ID
   * @returns {Promise<Object>} Test result
   */
  async testWebhook(webhookId) {
    const config = this.webhooks.get(webhookId);
    if (!config) {
      throw new Error('Webhook not found');
    }

    const testPayload = {
      eventType: 'test',
      timestamp: new Date(),
      test: true,
      message: 'This is a test webhook notification',
    };

    try {
      const result = await this.sendToWebhook(webhookId, config, testPayload);
      return {
        success: true,
        message: 'Webhook test successful',
        details: result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Webhook test failed',
        error: error.message,
        details: error,
      };
    }
  }

  /**
   * Get registered webhooks
   * @returns {Array} List of registered webhooks
   */
  getRegisteredWebhooks() {
    return Array.from(this.webhooks.entries()).map(([id, config]) => ({
      id,
      url: config.url,
      events: config.events,
      isActive: config.isActive,
      registeredAt: config.registeredAt,
    }));
  }

  /**
   * Clean up old webhook logs (retention policy)
   * @param {number} daysOld - Remove logs older than this many days
   */
  async cleanupOldLogs(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deletedCount = await WebhookLog.destroy({
        where: {
          sentAt: { [require('sequelize').Op.lt]: cutoffDate },
        },
      });

      console.log(`Cleaned up ${deletedCount} old webhook logs`);
      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup webhook logs:', error);
      return 0;
    }
  }
}

module.exports = new WebhookService();