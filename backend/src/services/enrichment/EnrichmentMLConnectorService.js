const mlScoringService = require('../mlScoringService');
const featureEngineeringService = require('../featureEngineeringService');
const realTimeScoringService = require('../realTimeScoringService');

class EnrichmentMLConnectorService {
  constructor() {
    this.featureMappings = this.setupFeatureMappings();
    this.confidenceThresholds = {
      high: 0.8,
      medium: 0.6,
      low: 0.4,
    };
  }

  /**
   * Setup feature mappings from enrichment data to ML features
   * @private
   */
  setupFeatureMappings() {
    return {
      // Property-based features
      propertyValue: {
        mlFeature: 'property_value',
        transform: (value) => this.normalizePropertyValue(value),
        weight: 0.25,
      },
      ownershipStatus: {
        mlFeature: 'property_owner',
        transform: (status) => status === 'owner' ? 1 : 0,
        weight: 0.15,
      },
      mortgageBalance: {
        mlFeature: 'mortgage_amount',
        transform: (value) => this.normalizeMortgageAmount(value),
        weight: 0.20,
      },
      transactionHistory: {
        mlFeature: 'transaction_frequency',
        transform: (history) => this.calculateTransactionFrequency(history),
        weight: 0.10,
      },

      // Social media features
      linkedinConnections: {
        mlFeature: 'social_connections',
        transform: (count) => this.normalizeConnectionCount(count),
        weight: 0.10,
      },
      professionalTitle: {
        mlFeature: 'job_title_score',
        transform: (title) => this.scoreProfessionalTitle(title),
        weight: 0.15,
      },
      company: {
        mlFeature: 'company_size_score',
        transform: (company) => this.scoreCompany(company),
        weight: 0.12,
      },

      // Credit features
      creditScore: {
        mlFeature: 'credit_score_normalized',
        transform: (score) => this.normalizeCreditScore(score),
        weight: 0.30,
      },
      paymentHistory: {
        mlFeature: 'payment_history_score',
        transform: (history) => this.scorePaymentHistory(history),
        weight: 0.25,
      },
      debtToIncomeRatio: {
        mlFeature: 'dti_ratio',
        transform: (ratio) => Math.min(ratio, 1.0), // Cap at 100%
        weight: 0.20,
      },

      // Quality and confidence features
      dataQualityScore: {
        mlFeature: 'data_quality_score',
        transform: (score) => score / 100, // Normalize to 0-1
        weight: 0.05,
      },
      enrichmentConfidence: {
        mlFeature: 'enrichment_confidence',
        transform: (confidence) => confidence,
        weight: 0.08,
      },
    };
  }

  /**
   * Process enriched data and enhance ML scoring
   * @param {number} leadId - Lead ID
   * @param {Object} enrichmentResult - Enrichment result data
   * @returns {Promise<Object>} Enhanced ML features
   */
  async processEnrichedData(leadId, enrichmentResult) {
    try {
      // Extract features from enrichment data
      const extractedFeatures = this.extractFeaturesFromEnrichment(enrichmentResult);

      // Validate feature quality
      const validatedFeatures = await this.validateFeatures(extractedFeatures);

      // Enhance existing ML features
      const enhancedFeatures = await this.enhanceMLFeatures(leadId, validatedFeatures);

      // Update real-time scoring if available
      await this.updateRealTimeScoring(leadId, enhancedFeatures);

      return {
        leadId,
        features: enhancedFeatures,
        enrichmentQuality: enrichmentResult.qualityScore,
        confidence: enrichmentResult.confidence,
        featureCount: Object.keys(validatedFeatures).length,
        processedAt: new Date(),
      };

    } catch (error) {
      console.error(`Failed to process enriched data for lead ${leadId}:`, error);
      return {
        leadId,
        error: error.message,
        features: {},
        processedAt: new Date(),
      };
    }
  }

  /**
   * Extract ML features from enrichment data
   * @private
   */
  extractFeaturesFromEnrichment(enrichmentResult) {
    const features = {};

    if (!enrichmentResult.data) return features;

    // Process each enrichment data source
    Object.entries(enrichmentResult.data).forEach(([source, data]) => {
      if (!data) return;

      switch (source) {
        case 'property':
          this.extractPropertyFeatures(data, features);
          break;
        case 'social':
          this.extractSocialFeatures(data, features);
          break;
        case 'credit':
          this.extractCreditFeatures(data, features);
          break;
      }
    });

    // Add quality and confidence features
    features.data_quality_score = enrichmentResult.qualityScore / 100;
    features.enrichment_confidence = enrichmentResult.confidence;

    return features;
  }

  /**
   * Extract property-related features
   * @private
   */
  extractPropertyFeatures(propertyData, features) {
    if (propertyData.propertyValue) {
      features.property_value = this.normalizePropertyValue(propertyData.propertyValue);
    }

    if (propertyData.ownershipStatus) {
      features.property_owner = propertyData.ownershipStatus === 'owner' ? 1 : 0;
    }

    if (propertyData.mortgageBalance) {
      features.mortgage_amount = this.normalizeMortgageAmount(propertyData.mortgageBalance);
    }

    if (propertyData.transactionHistory) {
      features.transaction_frequency = this.calculateTransactionFrequency(propertyData.transactionHistory);
    }
  }

  /**
   * Extract social media related features
   * @private
   */
  extractSocialFeatures(socialData, features) {
    if (socialData.connections) {
      features.social_connections = this.normalizeConnectionCount(socialData.connections);
    }

    if (socialData.professionalTitle) {
      features.job_title_score = this.scoreProfessionalTitle(socialData.professionalTitle);
    }

    if (socialData.company) {
      features.company_size_score = this.scoreCompany(socialData.company);
    }
  }

  /**
   * Extract credit-related features
   * @private
   */
  extractCreditFeatures(creditData, features) {
    if (creditData.creditScore) {
      features.credit_score_normalized = this.normalizeCreditScore(creditData.creditScore);
    }

    if (creditData.paymentHistory) {
      features.payment_history_score = this.scorePaymentHistory(creditData.paymentHistory);
    }

    if (creditData.debtToIncomeRatio) {
      features.dti_ratio = Math.min(creditData.debtToIncomeRatio, 1.0);
    }
  }

  /**
   * Validate extracted features
   * @private
   */
  async validateFeatures(features) {
    const validatedFeatures = {};

    for (const [featureName, value] of Object.entries(features)) {
      if (this.isValidFeatureValue(value)) {
        validatedFeatures[featureName] = value;
      } else {
        console.warn(`Invalid feature value for ${featureName}:`, value);
      }
    }

    return validatedFeatures;
  }

  /**
   * Enhance existing ML features with enrichment data
   * @private
   */
  async enhanceMLFeatures(leadId, enrichmentFeatures) {
    try {
      // Get existing ML features for this lead
      const existingFeatures = await this.getExistingMLFeatures(leadId);

      // Merge and enhance features
      const enhancedFeatures = {
        ...existingFeatures,
        ...enrichmentFeatures,
      };

      // Apply feature engineering
      const engineeredFeatures = await featureEngineeringService.engineerFeatures(enhancedFeatures);

      // Calculate feature importance weights
      const weightedFeatures = this.applyFeatureWeights(engineeredFeatures);

      return weightedFeatures;

    } catch (error) {
      console.error(`Failed to enhance ML features for lead ${leadId}:`, error);
      return enrichmentFeatures; // Return original features if enhancement fails
    }
  }

  /**
   * Update real-time scoring with enhanced features
   * @private
   */
  async updateRealTimeScoring(leadId, features) {
    try {
      await realTimeScoringService.updateLeadFeatures(leadId, features);
    } catch (error) {
      console.warn(`Failed to update real-time scoring for lead ${leadId}:`, error);
    }
  }

  /**
   * Get existing ML features for a lead
   * @private
   */
  async getExistingMLFeatures(leadId) {
    try {
      // This would integrate with the existing ML feature storage
      // For now, return empty object
      return {};
    } catch (error) {
      console.error(`Failed to get existing ML features for lead ${leadId}:`, error);
      return {};
    }
  }

  /**
   * Apply feature importance weights
   * @private
   */
  applyFeatureWeights(features) {
    const weightedFeatures = {};

    for (const [featureName, value] of Object.entries(features)) {
      const mapping = this.featureMappings[featureName];
      if (mapping) {
        // Apply weight to the feature value
        weightedFeatures[featureName] = value * mapping.weight;
      } else {
        weightedFeatures[featureName] = value;
      }
    }

    return weightedFeatures;
  }

  /**
   * Check if feature value is valid
   * @private
   */
  isValidFeatureValue(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'number' && isNaN(value)) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    return true;
  }

  // Feature transformation methods
  normalizePropertyValue(value) {
    // Normalize property values to a 0-1 scale
    // Assuming typical range of $100k to $5M
    const minValue = 100000;
    const maxValue = 5000000;
    return Math.min(Math.max((value - minValue) / (maxValue - minValue), 0), 1);
  }

  normalizeMortgageAmount(amount) {
    // Normalize mortgage amounts similar to property values
    const minAmount = 0;
    const maxAmount = 2000000;
    return Math.min(Math.max((amount - minAmount) / (maxAmount - minAmount), 0), 1);
  }

  calculateTransactionFrequency(history) {
    if (!Array.isArray(history) || history.length === 0) return 0;

    // Calculate transactions per year
    const now = new Date();
    const oldestTransaction = new Date(Math.min(...history.map(t => new Date(t.date))));
    const yearsDiff = (now - oldestTransaction) / (1000 * 60 * 60 * 24 * 365);

    if (yearsDiff <= 0) return 0;

    return history.length / yearsDiff;
  }

  normalizeConnectionCount(count) {
    // Normalize connection count (assuming 0-50000 range)
    return Math.min(count / 50000, 1);
  }

  scoreProfessionalTitle(title) {
    if (!title) return 0;

    const titleLower = title.toLowerCase();

    // High-level executive titles
    if (titleLower.includes('ceo') || titleLower.includes('cfo') ||
        titleLower.includes('cto') || titleLower.includes('president')) {
      return 1.0;
    }

    // Mid-level management
    if (titleLower.includes('director') || titleLower.includes('manager') ||
        titleLower.includes('vp') || titleLower.includes('head')) {
      return 0.7;
    }

    // Professional roles
    if (titleLower.includes('engineer') || titleLower.includes('developer') ||
        titleLower.includes('analyst') || titleLower.includes('consultant')) {
      return 0.5;
    }

    // Entry-level or unspecified
    return 0.3;
  }

  scoreCompany(company) {
    if (!company) return 0;

    const companyLower = company.toLowerCase();

    // Large corporations
    if (companyLower.includes('google') || companyLower.includes('amazon') ||
        companyLower.includes('microsoft') || companyLower.includes('apple')) {
      return 1.0;
    }

    // Medium-sized companies
    if (companyLower.includes('inc') || companyLower.includes('llc') ||
        companyLower.includes('corp')) {
      return 0.6;
    }

    // Small businesses or unknown
    return 0.3;
  }

  normalizeCreditScore(score) {
    // Normalize FICO scores (300-850) to 0-1 scale
    return Math.min(Math.max((score - 300) / (850 - 300), 0), 1);
  }

  scorePaymentHistory(history) {
    if (!history) return 0;

    const historyLower = history.toLowerCase();

    if (historyLower.includes('excellent')) return 1.0;
    if (historyLower.includes('good')) return 0.8;
    if (historyLower.includes('fair')) return 0.6;
    if (historyLower.includes('poor')) return 0.3;

    return 0.5; // Default for unknown
  }

  /**
   * Get feature importance analysis
   * @returns {Object} Feature importance analysis
   */
  getFeatureImportanceAnalysis() {
    const analysis = {
      totalFeatures: Object.keys(this.featureMappings).length,
      featureWeights: {},
      topFeatures: [],
      categories: {
        property: [],
        social: [],
        credit: [],
        quality: [],
      },
    };

    // Calculate feature weights
    for (const [featureName, mapping] of Object.entries(this.featureMappings)) {
      analysis.featureWeights[featureName] = mapping.weight;

      // Categorize features
      if (featureName.includes('property') || featureName.includes('mortgage') ||
          featureName.includes('transaction')) {
        analysis.categories.property.push(featureName);
      } else if (featureName.includes('social') || featureName.includes('linkedin') ||
                 featureName.includes('company') || featureName.includes('job')) {
        analysis.categories.social.push(featureName);
      } else if (featureName.includes('credit') || featureName.includes('payment') ||
                 featureName.includes('dti')) {
        analysis.categories.credit.push(featureName);
      } else {
        analysis.categories.quality.push(featureName);
      }
    }

    // Get top features by weight
    analysis.topFeatures = Object.entries(analysis.featureWeights)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([feature, weight]) => ({ feature, weight }));

    return analysis;
  }

  /**
   * Get enrichment impact on ML scoring
   * @param {number} leadId - Lead ID
   * @returns {Promise<Object>} Impact analysis
   */
  async getEnrichmentImpact(leadId) {
    try {
      // Get lead's enrichment data
      const lead = await require('../../models/Lead').getById(leadId, 1); // Assuming user ID 1 for now
      if (!lead || !lead.enrichmentData) {
        return { leadId, hasEnrichmentData: false };
      }

      // Calculate feature contributions
      const features = this.extractFeaturesFromEnrichment(lead.enrichmentData);
      const featureContributions = {};

      for (const [featureName, value] of Object.entries(features)) {
        const mapping = this.featureMappings[featureName];
        if (mapping) {
          featureContributions[featureName] = {
            value,
            weight: mapping.weight,
            contribution: value * mapping.weight,
          };
        }
      }

      // Calculate total enrichment impact
      const totalContribution = Object.values(featureContributions)
        .reduce((sum, feature) => sum + feature.contribution, 0);

      return {
        leadId,
        hasEnrichmentData: true,
        enrichmentQuality: lead.enrichmentData.qualityScore,
        featureContributions,
        totalContribution,
        topContributingFeatures: Object.entries(featureContributions)
          .sort(([,a], [,b]) => b.contribution - a.contribution)
          .slice(0, 5)
          .map(([feature, data]) => ({ feature, ...data })),
      };

    } catch (error) {
      console.error(`Failed to get enrichment impact for lead ${leadId}:`, error);
      return { leadId, error: error.message };
    }
  }
}

module.exports = new EnrichmentMLConnectorService();