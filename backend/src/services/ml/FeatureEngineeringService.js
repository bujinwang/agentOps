const { Pool } = require('pg');
const natural = require('natural');
const { removeStopwords } = require('stopword');

class FeatureEngineeringService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });

    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
  }

  /**
   * Extract comprehensive features for a lead
   * @param {Object} leadData - Lead profile data
   * @returns {Promise<Object>} Extracted features
   */
  async extractLeadFeatures(leadData) {
    try {
      const features = {};

      // Basic profile features
      features.profileCompleteness = this.calculateProfileCompleteness(leadData);
      features.leadAge = this.calculateLeadAge(leadData.created_at);
      features.hasPhone = leadData.phone ? 1 : 0;
      features.hasEmail = leadData.email ? 1 : 0;
      features.emailDomain = this.extractEmailDomain(leadData.email);

      // Interaction features
      const interactionFeatures = await this.extractInteractionFeatures(leadData.id);
      Object.assign(features, interactionFeatures);

      // Property preference features
      const propertyFeatures = await this.extractPropertyFeatures(leadData.id);
      Object.assign(features, propertyFeatures);

      // Behavioral features
      const behavioralFeatures = await this.extractBehavioralFeatures(leadData.id);
      Object.assign(features, behavioralFeatures);

      // Temporal features
      const temporalFeatures = await this.extractTemporalFeatures(leadData.id);
      Object.assign(features, temporalFeatures);

      // Text analysis features
      const textFeatures = this.extractTextFeatures(leadData);
      Object.assign(features, textFeatures);

      return features;
    } catch (error) {
      console.error('Failed to extract lead features:', error);
      throw error;
    }
  }

  /**
   * Extract behavioral features from lead interactions
   * @param {number} leadId - Lead ID
   * @returns {Promise<Object>} Behavioral features
   */
  async extractBehavioralFeatures(leadId) {
    try {
      const query = `
        SELECT type, created_at, metadata
        FROM lead_interactions
        WHERE lead_id = $1
        ORDER BY created_at DESC
        LIMIT 100
      `;

      const result = await this.pool.query(query, [leadId]);
      const interactions = result.rows;

      return {
        totalInteractions: interactions.length,
        emailInteractions: interactions.filter(i => i.type === 'email').length,
        phoneInteractions: interactions.filter(i => i.type === 'phone').length,
        meetingInteractions: interactions.filter(i => i.type === 'meeting').length,
        websiteInteractions: interactions.filter(i => i.type === 'website').length,
        interactionFrequency: this.calculateInteractionFrequency(interactions),
        lastInteractionDays: this.calculateDaysSinceLastInteraction(interactions),
        responseTimeAvg: this.calculateAverageResponseTime(interactions),
        engagementScore: this.calculateEngagementScore(interactions)
      };
    } catch (error) {
      console.error('Failed to extract behavioral features:', error);
      return {
        totalInteractions: 0,
        emailInteractions: 0,
        phoneInteractions: 0,
        meetingInteractions: 0,
        websiteInteractions: 0,
        interactionFrequency: 0,
        lastInteractionDays: 999,
        responseTimeAvg: 0,
        engagementScore: 0
      };
    }
  }

  /**
   * Extract property preference features
   * @param {number} leadId - Lead ID
   * @returns {Promise<Object>} Property features
   */
  async extractPropertyFeatures(leadId) {
    try {
      const query = `
        SELECT p.price_range_min, p.price_range_max, p.property_type,
               p.bedrooms, p.bathrooms, p.square_feet, p.location
        FROM lead_properties lp
        JOIN properties p ON lp.property_id = p.id
        WHERE lp.lead_id = $1
      `;

      const result = await this.pool.query(query, [leadId]);
      const properties = result.rows;

      if (properties.length === 0) {
        return {
          avgBudget: 0,
          propertyCount: 0,
          preferredPropertyType: 'unknown',
          avgBedrooms: 0,
          avgBathrooms: 0,
          avgSquareFeet: 0
        };
      }

      const avgBudget = properties.reduce((sum, p) => {
        const min = p.price_range_min || 0;
        const max = p.price_range_max || 0;
        return sum + ((min + max) / 2);
      }, 0) / properties.length;

      const propertyTypeCounts = {};
      properties.forEach(p => {
        propertyTypeCounts[p.property_type] = (propertyTypeCounts[p.property_type] || 0) + 1;
      });

      const preferredPropertyType = Object.keys(propertyTypeCounts).reduce((a, b) =>
        propertyTypeCounts[a] > propertyTypeCounts[b] ? a : b, 'unknown'
      );

      return {
        avgBudget,
        propertyCount: properties.length,
        preferredPropertyType,
        avgBedrooms: properties.reduce((sum, p) => sum + (p.bedrooms || 0), 0) / properties.length,
        avgBathrooms: properties.reduce((sum, p) => sum + (p.bathrooms || 0), 0) / properties.length,
        avgSquareFeet: properties.reduce((sum, p) => sum + (p.square_feet || 0), 0) / properties.length
      };
    } catch (error) {
      console.error('Failed to extract property features:', error);
      return {
        avgBudget: 0,
        propertyCount: 0,
        preferredPropertyType: 'unknown',
        avgBedrooms: 0,
        avgBathrooms: 0,
        avgSquareFeet: 0
      };
    }
  }

  /**
   * Extract temporal features
   * @param {number} leadId - Lead ID
   * @returns {Promise<Object>} Temporal features
   */
  async extractTemporalFeatures(leadId) {
    try {
      const query = `
        SELECT created_at, updated_at
        FROM leads
        WHERE id = $1
      `;

      const result = await this.pool.query(query, [leadId]);
      const lead = result.rows[0];

      if (!lead) {
        return {
          leadAge: 0,
          daysSinceUpdate: 0,
          isActive: 0
        };
      }

      const leadAge = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceUpdate = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      const isActive = daysSinceUpdate < 30 ? 1 : 0;

      return {
        leadAge,
        daysSinceUpdate,
        isActive
      };
    } catch (error) {
      console.error('Failed to extract temporal features:', error);
      return {
        leadAge: 0,
        daysSinceUpdate: 0,
        isActive: 0
      };
    }
  }

  /**
   * Extract text-based features from lead data
   * @param {Object} leadData - Lead profile data
   * @returns {Object} Text features
   */
  extractTextFeatures(leadData) {
    const features = {
      nameLength: (leadData.first_name + ' ' + leadData.last_name).length,
      hasMiddleName: leadData.middle_name ? 1 : 0,
      emailLength: leadData.email ? leadData.email.length : 0,
      phoneLength: leadData.phone ? leadData.phone.length : 0
    };

    // Email domain analysis
    if (leadData.email) {
      const domain = leadData.email.split('@')[1];
      features.isGmail = domain === 'gmail.com' ? 1 : 0;
      features.isYahoo = domain === 'yahoo.com' ? 1 : 0;
      features.isHotmail = ['hotmail.com', 'outlook.com', 'live.com'].includes(domain) ? 1 : 0;
      features.isCorporate = !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com'].includes(domain) ? 1 : 0;
    } else {
      features.isGmail = 0;
      features.isYahoo = 0;
      features.isHotmail = 0;
      features.isCorporate = 0;
    }

    return features;
  }

  /**
   * Calculate profile completeness score
   * @param {Object} leadData - Lead profile data
   * @returns {number} Completeness score (0-1)
   */
  calculateProfileCompleteness(leadData) {
    const fields = ['first_name', 'last_name', 'email', 'phone', 'address'];
    const filledFields = fields.filter(field => leadData[field]).length;
    return filledFields / fields.length;
  }

  /**
   * Calculate lead age in days
   * @param {string} createdAt - Creation timestamp
   * @returns {number} Age in days
   */
  calculateLeadAge(createdAt) {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Extract email domain
   * @param {string} email - Email address
   * @returns {string} Domain or 'unknown'
   */
  extractEmailDomain(email) {
    if (!email) return 'unknown';
    return email.split('@')[1] || 'unknown';
  }

  /**
   * Calculate interaction frequency
   * @param {Array} interactions - Lead interactions
   * @returns {number} Interactions per day
   */
  calculateInteractionFrequency(interactions) {
    if (interactions.length < 2) return 0;

    const sortedInteractions = interactions.sort((a, b) =>
      new Date(a.created_at) - new Date(b.created_at)
    );

    const firstInteraction = new Date(sortedInteractions[0].created_at);
    const lastInteraction = new Date(sortedInteractions[sortedInteractions.length - 1].created_at);
    const daysDiff = (lastInteraction - firstInteraction) / (1000 * 60 * 60 * 24);

    return daysDiff > 0 ? interactions.length / daysDiff : interactions.length;
  }

  /**
   * Calculate days since last interaction
   * @param {Array} interactions - Lead interactions
   * @returns {number} Days since last interaction
   */
  calculateDaysSinceLastInteraction(interactions) {
    if (interactions.length === 0) return 999;

    const lastInteraction = new Date(Math.max(...interactions.map(i => new Date(i.created_at))));
    return Math.floor((Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate average response time
   * @param {Array} interactions - Lead interactions
   * @returns {number} Average response time in hours
   */
  calculateAverageResponseTime(interactions) {
    if (interactions.length < 2) return 0;

    const sortedInteractions = interactions.sort((a, b) =>
      new Date(a.created_at) - new Date(b.created_at)
    );

    let totalResponseTime = 0;
    let responseCount = 0;

    for (let i = 1; i < sortedInteractions.length; i++) {
      const timeDiff = new Date(sortedInteractions[i].created_at) - new Date(sortedInteractions[i-1].created_at);
      totalResponseTime += timeDiff;
      responseCount++;
    }

    return responseCount > 0 ? (totalResponseTime / responseCount) / (1000 * 60 * 60) : 0;
  }

  /**
   * Calculate engagement score
   * @param {Array} interactions - Lead interactions
   * @returns {number} Engagement score (0-1)
   */
  calculateEngagementScore(interactions) {
    if (interactions.length === 0) return 0;

    const recentInteractions = interactions.filter(i => {
      const daysSince = (Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30; // Last 30 days
    });

    const engagementFactors = {
      total: interactions.length * 0.1,
      recent: recentInteractions.length * 0.3,
      diversity: new Set(interactions.map(i => i.type)).size * 0.2,
      frequency: this.calculateInteractionFrequency(interactions) * 0.4
    };

    const score = Object.values(engagementFactors).reduce((sum, factor) => sum + factor, 0);
    return Math.min(score, 1.0);
  }

  /**
   * Extract interaction features
   * @param {number} leadId - Lead ID
   * @returns {Promise<Object>} Interaction features
   */
  async extractInteractionFeatures(leadId) {
    try {
      const query = `
        SELECT COUNT(*) as total_count,
               COUNT(CASE WHEN type = 'email' THEN 1 END) as email_count,
               COUNT(CASE WHEN type = 'phone' THEN 1 END) as phone_count,
               COUNT(CASE WHEN type = 'meeting' THEN 1 END) as meeting_count,
               COUNT(CASE WHEN type = 'website' THEN 1 END) as website_count,
               MAX(created_at) as last_interaction,
               MIN(created_at) as first_interaction
        FROM lead_interactions
        WHERE lead_id = $1
      `;

      const result = await this.pool.query(query, [leadId]);
      const stats = result.rows[0];

      return {
        totalInteractions: parseInt(stats.total_count) || 0,
        emailInteractions: parseInt(stats.email_count) || 0,
        phoneInteractions: parseInt(stats.phone_count) || 0,
        meetingInteractions: parseInt(stats.meeting_count) || 0,
        websiteInteractions: parseInt(stats.website_count) || 0,
        daysSinceLastInteraction: stats.last_interaction ?
          Math.floor((Date.now() - new Date(stats.last_interaction).getTime()) / (1000 * 60 * 60 * 24)) : 999,
        interactionSpan: stats.first_interaction && stats.last_interaction ?
          Math.floor((new Date(stats.last_interaction) - new Date(stats.first_interaction)) / (1000 * 60 * 60 * 24)) : 0
      };
    } catch (error) {
      console.error('Failed to extract interaction features:', error);
      return {
        totalInteractions: 0,
        emailInteractions: 0,
        phoneInteractions: 0,
        meetingInteractions: 0,
        websiteInteractions: 0,
        daysSinceLastInteraction: 999,
        interactionSpan: 0
      };
    }
  }

  /**
   * Normalize features for ML model input
   * @param {Object} features - Raw features
   * @returns {Object} Normalized features
   */
  normalizeFeatures(features) {
    const normalized = { ...features };

    // Normalize numerical features to 0-1 range
    const numericalFields = [
      'profileCompleteness', 'leadAge', 'totalInteractions', 'emailInteractions',
      'phoneInteractions', 'meetingInteractions', 'websiteInteractions',
      'interactionFrequency', 'lastInteractionDays', 'responseTimeAvg',
      'engagementScore', 'avgBudget', 'propertyCount', 'avgBedrooms',
      'avgBathrooms', 'avgSquareFeet', 'daysSinceUpdate', 'nameLength',
      'emailLength', 'phoneLength', 'interactionSpan'
    ];

    numericalFields.forEach(field => {
      if (typeof normalized[field] === 'number') {
        // Simple min-max normalization (in production, use learned parameters)
        normalized[field] = Math.max(0, Math.min(1, normalized[field] / 100));
      }
    });

    return normalized;
  }

  /**
   * Select most important features
   * @param {Object} features - Normalized features
   * @returns {Object} Selected features
   */
  selectImportantFeatures(features) {
    // For now, return all features (in production, use feature selection algorithms)
    // This could be enhanced with techniques like:
    // - Recursive Feature Elimination
    // - LASSO regularization
    // - Mutual Information
    // - Principal Component Analysis

    const importantFeatures = [
      'profileCompleteness', 'leadAge', 'totalInteractions', 'interactionFrequency',
      'lastInteractionDays', 'engagementScore', 'avgBudget', 'propertyCount',
      'isCorporate', 'daysSinceUpdate', 'isActive'
    ];

    const selected = {};
    importantFeatures.forEach(feature => {
      if (features.hasOwnProperty(feature)) {
        selected[feature] = features[feature];
      }
    });

    return selected;
  }

  /**
   * Clean up resources
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = FeatureEngineeringService;