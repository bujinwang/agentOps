const axios = require('axios');
const crypto = require('crypto');
const { Lead } = require('../../models/Lead');
const { EnrichmentAudit } = require('../../models/EnrichmentAudit');
const cacheService = require('./CacheService');
const complianceService = require('./ComplianceService');
const validationService = require('./ValidationService');

class EnrichmentService {
  constructor() {
    this.providers = {
      property: new PropertyDataProvider(),
      social: new SocialMediaProvider(),
      credit: new CreditReportingProvider(),
    };

    this.pipeline = new EnrichmentPipeline();
    this.cache = cacheService;
    this.compliance = complianceService;
    this.validator = validationService;
  }

  /**
   * Main enrichment method - orchestrates the entire enrichment process
   * @param {number} leadId - Lead ID to enrich
   * @param {Object} options - Enrichment options
   * @returns {Promise<Object>} Enrichment result
   */
  async enrichLead(leadId, options = {}) {
    const startTime = Date.now();
    const enrichmentId = crypto.randomUUID();

    try {
      // Step 1: Validate lead and check consent
      const lead = await this.validateLeadAndConsent(leadId);
      if (!lead) {
        throw new Error('Lead not found or consent not granted');
      }

      // Step 2: Check cache first
      const cachedResult = await this.cache.get(`enrichment:${leadId}`);
      if (cachedResult && !options.forceRefresh) {
        await this.logAuditEvent(enrichmentId, leadId, 'cache_hit', cachedResult);
        return cachedResult;
      }

      // Step 3: Execute enrichment pipeline
      const enrichmentResult = await this.pipeline.execute(lead, {
        enrichmentId,
        options,
        providers: this.providers,
      });

      // Step 4: Validate enriched data
      const validatedResult = await this.validator.validate(enrichmentResult);

      // Step 5: Update lead with enriched data
      await this.updateLeadWithEnrichment(leadId, validatedResult);

      // Step 6: Cache the result
      await this.cache.set(`enrichment:${leadId}`, validatedResult, 3600); // 1 hour TTL

      // Step 7: Log completion
      await this.logAuditEvent(enrichmentId, leadId, 'completed', validatedResult, {
        duration: Date.now() - startTime,
        dataQuality: validatedResult.qualityScore,
      });

      return validatedResult;

    } catch (error) {
      await this.logAuditEvent(enrichmentId, leadId, 'failed', null, {
        error: error.message,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Get enrichment status for a lead
   * @param {number} leadId - Lead ID
   * @returns {Promise<Object>} Status information
   */
  async getEnrichmentStatus(leadId) {
    const lead = await Lead.findByPk(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    const enrichmentData = lead.enrichmentData || {};
    const lastEnrichment = enrichmentData.lastEnrichmentAt;

    return {
      leadId,
      status: enrichmentData.status || 'not_started',
      lastEnrichmentAt: lastEnrichment,
      dataQuality: enrichmentData.qualityScore,
      sources: enrichmentData.sources || [],
      nextScheduledEnrichment: this.calculateNextEnrichment(lastEnrichment),
    };
  }

  /**
   * Manually trigger enrichment for multiple leads
   * @param {number[]} leadIds - Array of lead IDs
   * @param {Object} options - Enrichment options
   * @returns {Promise<Object>} Batch enrichment result
   */
  async enrichLeadsBatch(leadIds, options = {}) {
    const results = {
      total: leadIds.length,
      successful: 0,
      failed: 0,
      results: [],
    };

    for (const leadId of leadIds) {
      try {
        const result = await this.enrichLead(leadId, options);
        results.successful++;
        results.results.push({ leadId, status: 'success', data: result });
      } catch (error) {
        results.failed++;
        results.results.push({ leadId, status: 'failed', error: error.message });
      }

      // Rate limiting - small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Delete enrichment data for a lead (GDPR compliance)
   * @param {number} leadId - Lead ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteEnrichmentData(leadId) {
    try {
      // Check compliance requirements
      await this.compliance.validateDeletionRequest(leadId);

      // Remove from cache
      await this.cache.delete(`enrichment:${leadId}`);

      // Update lead record
      await Lead.update(
        {
          enrichmentData: null,
          enrichmentConsent: false,
        },
        { where: { id: leadId } }
      );

      // Log deletion
      await this.logAuditEvent(crypto.randomUUID(), leadId, 'data_deleted', null, {
        reason: 'GDPR/CCPA compliance',
      });

      return true;
    } catch (error) {
      await this.logAuditEvent(crypto.randomUUID(), leadId, 'deletion_failed', null, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Validate lead exists and consent is granted
   * @private
   */
  async validateLeadAndConsent(leadId) {
    const lead = await Lead.findByPk(leadId);
    if (!lead) return null;

    // Check if enrichment consent is granted
    if (!lead.enrichmentConsent) {
      throw new Error('Lead enrichment consent not granted');
    }

    // Check if consent is still valid (not expired)
    if (lead.consentExpiresAt && new Date() > lead.consentExpiresAt) {
      throw new Error('Lead enrichment consent has expired');
    }

    return lead;
  }

  /**
   * Update lead record with enriched data
   * @private
   */
  async updateLeadWithEnrichment(leadId, enrichmentResult) {
    const updateData = {
      enrichmentData: {
        ...enrichmentResult,
        lastEnrichmentAt: new Date(),
        status: 'completed',
      },
    };

    await Lead.update(updateData, { where: { id: leadId } });
  }

  /**
   * Calculate next scheduled enrichment
   * @private
   */
  calculateNextEnrichment(lastEnrichment) {
    if (!lastEnrichment) return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    const nextEnrichment = new Date(lastEnrichment);
    nextEnrichment.setDate(nextEnrichment.getDate() + 30); // 30 days from last enrichment
    return nextEnrichment;
  }

  /**
   * Log audit event for compliance
   * @private
   */
  async logAuditEvent(enrichmentId, leadId, eventType, data, metadata = {}) {
    await EnrichmentAudit.create({
      id: enrichmentId,
      leadId,
      eventType,
      data: JSON.stringify(data),
      metadata: JSON.stringify(metadata),
      timestamp: new Date(),
      ipAddress: 'system', // Would be populated from request context
      userAgent: 'EnrichmentService',
    });
  }
}

class EnrichmentPipeline {
  constructor() {
    this.steps = [
      'validate_input',
      'check_consent',
      'gather_property_data',
      'gather_social_data',
      'gather_credit_data',
      'validate_data_quality',
      'calculate_confidence_scores',
      'finalize_enrichment',
    ];
  }

  async execute(lead, context) {
    const result = {
      leadId: lead.id,
      enrichmentId: context.enrichmentId,
      sources: [],
      data: {},
      qualityScore: 0,
      confidence: 0,
      timestamp: new Date(),
    };

    for (const step of this.steps) {
      try {
        await this.executeStep(step, lead, result, context);
      } catch (error) {
        console.error(`Enrichment pipeline step ${step} failed:`, error);
        // Continue with other steps but mark as partial
        result.errors = result.errors || [];
        result.errors.push({ step, error: error.message });
      }
    }

    // Calculate overall quality score
    result.qualityScore = this.calculateQualityScore(result);
    result.confidence = this.calculateConfidence(result);

    return result;
  }

  async executeStep(step, lead, result, context) {
    switch (step) {
      case 'validate_input':
        this.validateInputData(lead);
        break;

      case 'check_consent':
        await this.checkConsent(lead);
        break;

      case 'gather_property_data':
        const propertyData = await context.providers.property.enrich(lead);
        if (propertyData) {
          result.data.property = propertyData;
          result.sources.push('property');
        }
        break;

      case 'gather_social_data':
        const socialData = await context.providers.social.enrich(lead);
        if (socialData) {
          result.data.social = socialData;
          result.sources.push('social');
        }
        break;

      case 'gather_credit_data':
        const creditData = await context.providers.credit.enrich(lead);
        if (creditData) {
          result.data.credit = creditData;
          result.sources.push('credit');
        }
        break;

      case 'validate_data_quality':
        await this.validateDataQuality(result);
        break;

      case 'calculate_confidence_scores':
        this.calculateConfidenceScores(result);
        break;

      case 'finalize_enrichment':
        this.finalizeEnrichment(result);
        break;
    }
  }

  validateInputData(lead) {
    if (!lead.email && !lead.phone) {
      throw new Error('Lead must have email or phone for enrichment');
    }
  }

  async checkConsent(lead) {
    if (!lead.enrichmentConsent) {
      throw new Error('Enrichment consent not granted');
    }
  }

  async validateDataQuality(result) {
    // Implement data quality validation logic
    const qualityChecks = {
      property: result.data.property ? this.validatePropertyData(result.data.property) : 0,
      social: result.data.social ? this.validateSocialData(result.data.social) : 0,
      credit: result.data.credit ? this.validateCreditData(result.data.credit) : 0,
    };

    result.qualityChecks = qualityChecks;
  }

  calculateConfidenceScores(result) {
    // Calculate confidence scores for each data source
    const confidenceScores = {};

    if (result.data.property) {
      confidenceScores.property = this.calculatePropertyConfidence(result.data.property);
    }
    if (result.data.social) {
      confidenceScores.social = this.calculateSocialConfidence(result.data.social);
    }
    if (result.data.credit) {
      confidenceScores.credit = this.calculateCreditConfidence(result.data.credit);
    }

    result.confidenceScores = confidenceScores;
  }

  finalizeEnrichment(result) {
    result.status = 'completed';
    result.completedAt = new Date();
  }

  calculateQualityScore(result) {
    if (!result.qualityChecks) return 0;

    const weights = { property: 0.4, social: 0.3, credit: 0.3 };
    let totalScore = 0;
    let totalWeight = 0;

    for (const [source, score] of Object.entries(result.qualityChecks)) {
      totalScore += score * weights[source];
      totalWeight += weights[source];
    }

    return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
  }

  calculateConfidence(result) {
    if (!result.confidenceScores) return 0;

    const scores = Object.values(result.confidenceScores);
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  }

  // Validation helper methods
  validatePropertyData(data) {
    // Implement property data validation logic
    return data.ownershipVerified ? 95 : 70;
  }

  validateSocialData(data) {
    // Implement social data validation logic
    return data.profileVerified ? 90 : 60;
  }

  validateCreditData(data) {
    // Implement credit data validation logic
    return data.scoreVerified ? 98 : 80;
  }

  // Confidence calculation helper methods
  calculatePropertyConfidence(data) {
    return data.confidence || 0.85;
  }

  calculateSocialConfidence(data) {
    return data.confidence || 0.75;
  }

  calculateCreditConfidence(data) {
    return data.confidence || 0.95;
  }
}

// Provider base class
class EnrichmentProvider {
  constructor(config) {
    this.config = config;
    this.rateLimiter = new RateLimiter(config.rateLimit || 100);
  }

  async enrich(lead) {
    // Check rate limit
    await this.rateLimiter.checkLimit();

    try {
      return await this.doEnrich(lead);
    } catch (error) {
      console.error(`${this.constructor.name} enrichment failed:`, error);
      throw error;
    }
  }

  async doEnrich(lead) {
    throw new Error('doEnrich must be implemented by subclass');
  }
}

// Property data provider
class PropertyDataProvider extends EnrichmentProvider {
  async doEnrich(lead) {
    // Mock property data enrichment
    // In real implementation, this would call external APIs
    return {
      ownershipStatus: 'owner',
      propertyValue: 450000,
      mortgageBalance: 250000,
      lastTransactionDate: '2023-06-15',
      propertyType: 'single-family',
      ownershipVerified: true,
      confidence: 0.9,
    };
  }
}

// Social media provider
class SocialMediaProvider extends EnrichmentProvider {
  async doEnrich(lead) {
    // Mock social media enrichment
    return {
      linkedinProfile: `https://linkedin.com/in/${lead.name.toLowerCase().replace(' ', '')}`,
      professionalTitle: 'Real Estate Investor',
      company: 'ABC Investments',
      industry: 'Real Estate',
      connections: 500,
      profileVerified: true,
      confidence: 0.8,
    };
  }
}

// Credit reporting provider
class CreditReportingProvider extends EnrichmentProvider {
  async doEnrich(lead) {
    // Mock credit data enrichment
    return {
      creditScore: 750,
      creditRating: 'Good',
      debtToIncomeRatio: 0.35,
      paymentHistory: 'excellent',
      scoreVerified: true,
      confidence: 0.95,
    };
  }
}

// Rate limiter utility
class RateLimiter {
  constructor(limit) {
    this.limit = limit;
    this.requests = [];
  }

  async checkLimit() {
    const now = Date.now();
    // Remove requests older than 1 minute
    this.requests = this.requests.filter(time => now - time < 60000);

    if (this.requests.length >= this.limit) {
      throw new Error('Rate limit exceeded');
    }

    this.requests.push(now);
  }
}

module.exports = new EnrichmentService();