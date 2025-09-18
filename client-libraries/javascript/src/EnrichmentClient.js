const axios = require('axios');
const crypto = require('crypto');

/**
 * Lead Enrichment API Client
 */
class EnrichmentClient {
  /**
   * Create a new EnrichmentClient instance
   * @param {Object} config - Client configuration
   */
  constructor(config = {}) {
    this.config = {
      baseUrl: 'https://api.yourcompany.com/v1',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableMetrics: true,
      ...config
    };

    if (!this.config.apiKey) {
      throw new Error('API key is required');
    }

    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'EnrichmentClient/1.0.0'
      }
    });

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastResponseTime: 0
    };

    this.requestInterceptors = [];
    this.responseInterceptors = [];

    this.setupInterceptors();
    this.setupRetryLogic();
  }

  /**
   * Setup axios interceptors for metrics and error handling
   * @private
   */
  setupInterceptors() {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      (config) => {
        // Apply custom request interceptors
        for (const interceptor of this.requestInterceptors) {
          config = interceptor(config);
        }

        if (this.config.enableMetrics) {
          config.metadata = { startTime: Date.now() };
          this.metrics.totalRequests++;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        // Apply custom response interceptors
        for (const interceptor of this.responseInterceptors) {
          response = interceptor.success(response);
        }

        if (this.config.enableMetrics && response.config.metadata) {
          const responseTime = Date.now() - response.config.metadata.startTime;
          this.updateMetrics(responseTime, true);
        }

        return response;
      },
      (error) => {
        // Apply custom error interceptors
        for (const interceptor of this.responseInterceptors) {
          if (interceptor.error) {
            error = interceptor.error(error);
          }
        }

        if (this.config.enableMetrics && error.config?.metadata) {
          const responseTime = Date.now() - error.config.metadata.startTime;
          this.updateMetrics(responseTime, false);
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Setup retry logic for failed requests
   * @private
   */
  setupRetryLogic() {
    this.httpClient.interceptors.response.use(null, (error) => {
      const config = error.config;

      if (!config || !this.shouldRetry(error)) {
        return Promise.reject(error);
      }

      config.retryCount = config.retryCount || 0;

      if (config.retryCount >= this.config.retryAttempts) {
        return Promise.reject(error);
      }

      config.retryCount++;

      const delay = this.calculateRetryDelay(config.retryCount);
      return new Promise(resolve => {
        setTimeout(() => resolve(this.httpClient(config)), delay);
      });
    });
  }

  /**
   * Update metrics with response time
   * @private
   */
  updateMetrics(responseTime, success) {
    this.metrics.lastResponseTime = responseTime;

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update rolling average
    const totalRequests = this.metrics.successfulRequests + this.metrics.failedRequests;
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
  }

  /**
   * Determine if request should be retried
   * @private
   */
  shouldRetry(error) {
    if (!error.response) return true; // Network errors
    return error.response.status >= 500; // Server errors
  }

  /**
   * Calculate retry delay with exponential backoff
   * @private
   */
  calculateRetryDelay(retryCount) {
    return this.config.retryDelay * Math.pow(2, retryCount - 1);
  }

  /**
   * Handle and normalize API errors
   * @private
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const apiError = new Error(error.response.data?.error || 'API Error');
      apiError.code = error.response.data?.code || 'API_ERROR';
      apiError.statusCode = error.response.status;
      apiError.details = error.response.data?.details;
      return apiError;
    } else if (error.request) {
      // Network error
      const networkError = new Error('Network Error');
      networkError.code = 'NETWORK_ERROR';
      return networkError;
    } else {
      // Other error
      const clientError = new Error(error.message || 'Unknown Error');
      clientError.code = 'CLIENT_ERROR';
      return clientError;
    }
  }

  // ===== ENRICHMENT METHODS =====

  /**
   * Trigger enrichment for a specific lead
   * @param {number} leadId - Lead identifier
   * @param {Object} options - Enrichment options
   * @returns {Promise<Object>} Enrichment result
   */
  async enrichLead(leadId, options = {}) {
    const response = await this.httpClient.post(
      `/enrichment/webhook/leads/${leadId}/enrich`,
      options
    );
    return response.data;
  }

  /**
   * Get enrichment status for a lead
   * @param {number} leadId - Lead identifier
   * @returns {Promise<Object>} Enrichment status
   */
  async getEnrichmentStatus(leadId) {
    const response = await this.httpClient.get(
      `/enrichment/webhook/leads/${leadId}/enrichment-status`
    );
    return response.data.data;
  }

  /**
   * Trigger enrichment for multiple leads
   * @param {Array<number>} leadIds - Array of lead identifiers
   * @param {Object} options - Enrichment options
   * @returns {Promise<Object>} Batch enrichment result
   */
  async enrichLeadsBatch(leadIds, options = {}) {
    const response = await this.httpClient.post(
      '/enrichment/webhook/leads/batch-enrich',
      { leadIds, options }
    );
    return response.data;
  }

  // ===== CONSENT MANAGEMENT METHODS =====

  /**
   * Grant enrichment consent for a lead
   * @param {number} leadId - Lead identifier
   * @param {Object} consentData - Consent information
   * @returns {Promise<Object>} Consent result
   */
  async grantConsent(leadId, consentData) {
    const response = await this.httpClient.post(
      `/enrichment/consent/${leadId}/grant`,
      consentData
    );
    return response.data.data;
  }

  /**
   * Withdraw enrichment consent for a lead
   * @param {number} leadId - Lead identifier
   * @param {string} reason - Withdrawal reason
   * @returns {Promise<Object>} Withdrawal result
   */
  async withdrawConsent(leadId, reason) {
    const response = await this.httpClient.post(
      `/enrichment/consent/${leadId}/withdraw`,
      { reason }
    );
    return response.data;
  }

  /**
   * Get consent status for a lead
   * @param {number} leadId - Lead identifier
   * @returns {Promise<Object>} Consent status
   */
  async getConsentStatus(leadId) {
    const response = await this.httpClient.get(
      `/enrichment/consent/${leadId}/status`
    );
    return response.data.data;
  }

  // ===== DATA MANAGEMENT METHODS =====

  /**
   * Delete enrichment data for a lead (GDPR compliance)
   * @param {number} leadId - Lead identifier
   * @param {Object} options - Deletion options
   * @returns {Promise<Object>} Deletion result
   */
  async deleteEnrichmentData(leadId, options = {}) {
    const response = await this.httpClient.post(
      `/enrichment/data/${leadId}/delete`,
      options
    );
    return response.data.data;
  }

  /**
   * Export enrichment data for portability (GDPR)
   * @param {number} leadId - Lead identifier
   * @returns {Promise<Object>} Export data
   */
  async exportEnrichmentData(leadId) {
    const response = await this.httpClient.get(
      `/enrichment/data/${leadId}/portability`
    );
    return response.data.data;
  }

  // ===== MONITORING METHODS =====

  /**
   * Get service health status
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    const response = await this.httpClient.get('/enrichment/health');
    return response.data;
  }

  /**
   * Get compliance report
   * @returns {Promise<Object>} Compliance report
   */
  async getComplianceReport() {
    const response = await this.httpClient.get('/enrichment/compliance/report');
    return response.data.data;
  }

  // ===== UTILITY METHODS =====

  /**
   * Add a request interceptor
   * @param {Function} interceptor - Request interceptor function
   */
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add a response interceptor
   * @param {Function} successInterceptor - Success response interceptor
   * @param {Function} errorInterceptor - Error response interceptor
   */
  addResponseInterceptor(successInterceptor, errorInterceptor) {
    this.responseInterceptors.push({
      success: successInterceptor,
      error: errorInterceptor
    });
  }

  /**
   * Get client metrics
   * @returns {Object} Client metrics
   */
  getMetrics() {
    const totalRequests = this.metrics.successfulRequests + this.metrics.failedRequests;
    const successRate = totalRequests > 0
      ? (this.metrics.successfulRequests / totalRequests * 100).toFixed(2) + '%'
      : '0%';

    return {
      ...this.metrics,
      successRate,
      averageResponseTime: Math.round(this.metrics.averageResponseTime) + 'ms'
    };
  }

  /**
   * Reset client metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastResponseTime: 0
    };
  }
}

/**
 * Verify webhook signature
 * @param {Object} payload - Webhook payload
 * @param {string} signature - Received signature
 * @param {string} secret - Webhook secret
 * @returns {boolean} Whether signature is valid
 */
function verifyWebhookSignature(payload, signature, secret) {
  if (!secret) return false;

  const payloadString = JSON.stringify(payload);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    return false;
  }
}

module.exports = {
  EnrichmentClient,
  verifyWebhookSignature
};