const { Pool } = require('pg');
const tf = require('@tensorflow/tfjs-node');

class ExplainabilityService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });

    this.featureImportanceCache = new Map();
  }

  /**
   * Generate comprehensive explanation for a lead score
   * @param {number} leadId - Lead ID
   * @param {number} score - ML score
   * @param {Object} features - Features used in scoring
   * @returns {Promise<Object>} Explanation object
   */
  async generateExplanation(leadId, score, features) {
    try {
      const explanation = {
        leadId,
        score,
        confidence: this.calculateConfidence(score),
        topFactors: await this.identifyTopFactors(features, score),
        featureContributions: await this.calculateFeatureContributions(features),
        similarLeads: await this.findSimilarLeads(leadId, features),
        scoreDistribution: await this.getScoreDistribution(),
        recommendations: this.generateRecommendations(score, features),
        generatedAt: new Date().toISOString()
      };

      return explanation;
    } catch (error) {
      console.error('Failed to generate explanation:', error);
      throw error;
    }
  }

  /**
   * Calculate confidence score for the prediction
   * @param {number} score - ML score (0-1)
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(score) {
    // Higher confidence when score is closer to extremes (0 or 1)
    // Lower confidence when score is around 0.5 (uncertain)
    const distanceFromMiddle = Math.abs(score - 0.5) * 2;
    return Math.min(distanceFromMiddle, 1.0);
  }

  /**
   * Identify the top factors that influenced the score
   * @param {Object} features - Feature values
   * @param {number} score - ML score
   * @returns {Promise<Array>} Top contributing factors
   */
  async identifyTopFactors(features, score) {
    try {
      const factors = [];

      // Analyze each feature's contribution
      for (const [featureName, value] of Object.entries(features)) {
        const contribution = await this.calculateFeatureImpact(featureName, value, score);
        if (Math.abs(contribution.impact) > 0.1) { // Only include significant factors
          factors.push({
            feature: featureName,
            value: value,
            impact: contribution.impact,
            direction: contribution.direction,
            explanation: contribution.explanation
          });
        }
      }

      // Sort by absolute impact and return top 5
      return factors
        .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
        .slice(0, 5);
    } catch (error) {
      console.error('Failed to identify top factors:', error);
      return [];
    }
  }

  /**
   * Calculate feature contributions using simplified SHAP-like approach
   * @param {Object} features - Feature values
   * @returns {Promise<Object>} Feature contribution breakdown
   */
  async calculateFeatureContributions(features) {
    try {
      const contributions = {};
      let totalContribution = 0;

      for (const [featureName, value] of Object.entries(features)) {
        // Simplified contribution calculation
        // In production, this would use actual SHAP values or feature importance
        const contribution = this.calculateSimplifiedContribution(featureName, value);
        contributions[featureName] = contribution;
        totalContribution += contribution;
      }

      // Normalize contributions
      const normalizedContributions = {};
      for (const [featureName, contribution] of Object.entries(contributions)) {
        normalizedContributions[featureName] = contribution / totalContribution;
      }

      return {
        raw: contributions,
        normalized: normalizedContributions,
        total: totalContribution
      };
    } catch (error) {
      console.error('Failed to calculate feature contributions:', error);
      return { raw: {}, normalized: {}, total: 0 };
    }
  }

  /**
   * Find similar leads for comparison
   * @param {number} leadId - Current lead ID
   * @param {Object} features - Current lead features
   * @returns {Promise<Array>} Similar leads
   */
  async findSimilarLeads(leadId, features) {
    try {
      // Find leads with similar feature profiles
      const query = `
        SELECT
          l.id,
          l.first_name,
          l.last_name,
          ls.score,
          ls.confidence,
          ls.scored_at
        FROM leads l
        JOIN lead_scores ls ON l.id = ls.lead_id
        WHERE l.id != $1
        AND ls.scored_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
        ORDER BY
          -- Similarity based on key features
          ABS(COALESCE(lf.features->>'totalInteractions', '0')::float - $2) +
          ABS(COALESCE(lf.features->>'avgBudget', '0')::float - $3) +
          ABS(COALESCE(lf.features->>'leadAge', '0')::float - $4)
        LIMIT 5
      `;

      const result = await this.pool.query(query, [
        leadId,
        features.totalInteractions || 0,
        features.avgBudget || 0,
        features.leadAge || 0
      ]);

      return result.rows.map(lead => ({
        id: lead.id,
        name: `${lead.first_name} ${lead.last_name}`,
        score: lead.score,
        confidence: lead.confidence,
        similarity: this.calculateSimilarity(features, lead)
      }));
    } catch (error) {
      console.error('Failed to find similar leads:', error);
      return [];
    }
  }

  /**
   * Get overall score distribution for context
   * @returns {Promise<Object>} Score distribution data
   */
  async getScoreDistribution() {
    try {
      const query = `
        SELECT
          CASE
            WHEN score < 0.2 THEN '0.0-0.2'
            WHEN score < 0.4 THEN '0.2-0.4'
            WHEN score < 0.6 THEN '0.4-0.6'
            WHEN score < 0.8 THEN '0.6-0.8'
            ELSE '0.8-1.0'
          END as bucket,
          COUNT(*) as count
        FROM lead_scores
        WHERE scored_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
        GROUP BY bucket
        ORDER BY bucket
      `;

      const result = await this.pool.query(query);
      const distribution = result.rows;

      const total = distribution.reduce((sum, row) => sum + parseInt(row.count), 0);

      return {
        buckets: distribution.map(row => ({
          range: row.bucket,
          count: parseInt(row.count),
          percentage: (parseInt(row.count) / total * 100).toFixed(1)
        })),
        total
      };
    } catch (error) {
      console.error('Failed to get score distribution:', error);
      return { buckets: [], total: 0 };
    }
  }

  /**
   * Generate actionable recommendations based on score and features
   * @param {number} score - ML score
   * @param {Object} features - Feature values
   * @returns {Array} Recommendations
   */
  generateRecommendations(score, features) {
    const recommendations = [];

    if (score > 0.8) {
      recommendations.push({
        type: 'action',
        priority: 'high',
        message: 'High-value lead detected - prioritize immediate follow-up',
        actions: ['Schedule meeting within 24 hours', 'Prepare personalized proposal', 'Assign senior sales rep']
      });
    } else if (score > 0.6) {
      recommendations.push({
        type: 'action',
        priority: 'medium',
        message: 'Promising lead - nurture with targeted content',
        actions: ['Add to email nurture sequence', 'Send property recommendations', 'Schedule follow-up call']
      });
    } else if (score < 0.3) {
      recommendations.push({
        type: 'assessment',
        priority: 'low',
        message: 'Low-potential lead - consider re-qualification',
        actions: ['Review lead qualification criteria', 'Consider lead recycling program', 'Focus resources elsewhere']
      });
    }

    // Feature-based recommendations
    if (features.lastInteractionDays > 30) {
      recommendations.push({
        type: 'engagement',
        priority: 'medium',
        message: 'Lead has been inactive - re-engagement needed',
        actions: ['Send re-engagement email', 'Make follow-up call', 'Update lead status']
      });
    }

    if (features.totalInteractions < 3) {
      recommendations.push({
        type: 'engagement',
        priority: 'medium',
        message: 'Limited interaction history - gather more data',
        actions: ['Send survey or questionnaire', 'Request feedback', 'Schedule discovery call']
      });
    }

    return recommendations;
  }

  /**
   * Calculate feature impact on score
   * @param {string} featureName - Feature name
   * @param {number} value - Feature value
   * @param {number} score - Overall score
   * @returns {Promise<Object>} Feature impact analysis
   */
  async calculateFeatureImpact(featureName, value, score) {
    try {
      // Get feature importance weights (cached)
      const importanceWeights = await this.getFeatureImportanceWeights();

      const weight = importanceWeights[featureName] || 0.1;
      const normalizedValue = this.normalizeFeatureValue(featureName, value);

      // Calculate impact (simplified)
      const impact = weight * normalizedValue * (score > 0.5 ? 1 : -1);
      const direction = impact > 0 ? 'positive' : 'negative';

      return {
        impact: Math.abs(impact),
        direction,
        explanation: this.generateFeatureExplanation(featureName, value, direction)
      };
    } catch (error) {
      console.error('Failed to calculate feature impact:', error);
      return { impact: 0, direction: 'neutral', explanation: 'Unable to analyze' };
    }
  }

  /**
   * Get cached feature importance weights
   * @returns {Promise<Object>} Feature importance weights
   */
  async getFeatureImportanceWeights() {
    // In production, this would be calculated from actual model feature importances
    // For now, return predefined weights based on domain knowledge
    return {
      totalInteractions: 0.25,
      emailInteractions: 0.15,
      phoneInteractions: 0.20,
      meetingInteractions: 0.25,
      lastInteractionDays: -0.15, // Negative because older interactions are less valuable
      engagementScore: 0.30,
      avgBudget: 0.20,
      propertyCount: 0.15,
      leadAge: 0.10,
      profileCompleteness: 0.15,
      hasEmail: 0.10,
      hasPhone: 0.10
    };
  }

  /**
   * Calculate simplified feature contribution
   * @param {string} featureName - Feature name
   * @param {number} value - Feature value
   * @returns {number} Contribution value
   */
  calculateSimplifiedContribution(featureName, value) {
    const weights = {
      totalInteractions: value * 0.1,
      emailInteractions: value * 0.05,
      phoneInteractions: value * 0.08,
      meetingInteractions: value * 0.15,
      lastInteractionDays: Math.max(0, 30 - value) * 0.02, // Less recent is better
      engagementScore: value * 0.2,
      avgBudget: Math.min(value / 100000, 1) * 0.15,
      propertyCount: Math.min(value / 5, 1) * 0.1,
      leadAge: Math.min(value / 30, 1) * 0.05,
      profileCompleteness: value * 0.12,
      hasEmail: value * 0.08,
      hasPhone: value * 0.08
    };

    return weights[featureName] || value * 0.01;
  }

  /**
   * Normalize feature value for comparison
   * @param {string} featureName - Feature name
   * @param {number} value - Feature value
   * @returns {number} Normalized value (0-1)
   */
  normalizeFeatureValue(featureName, value) {
    const normalizers = {
      totalInteractions: (v) => Math.min(v / 50, 1),
      emailInteractions: (v) => Math.min(v / 20, 1),
      phoneInteractions: (v) => Math.min(v / 10, 1),
      meetingInteractions: (v) => Math.min(v / 5, 1),
      lastInteractionDays: (v) => Math.max(0, 1 - v / 90), // Less recent is better
      engagementScore: (v) => v, // Already 0-1
      avgBudget: (v) => Math.min(v / 1000000, 1),
      propertyCount: (v) => Math.min(v / 10, 1),
      leadAge: (v) => Math.min(v / 365, 1),
      profileCompleteness: (v) => v, // Already 0-1
      hasEmail: (v) => v, // Already 0-1
      hasPhone: (v) => v // Already 0-1
    };

    const normalizer = normalizers[featureName] || ((v) => Math.min(v, 1));
    return normalizer(value);
  }

  /**
   * Generate human-readable explanation for feature impact
   * @param {string} featureName - Feature name
   * @param {number} value - Feature value
   * @param {string} direction - Impact direction
   * @returns {string} Explanation text
   */
  generateFeatureExplanation(featureName, value, direction) {
    const explanations = {
      totalInteractions: `${value} total interactions ${direction === 'positive' ? 'increases' : 'decreases'} the score because engaged leads are more likely to convert.`,
      emailInteractions: `${value} email interactions ${direction === 'positive' ? 'positively' : 'negatively'} impacts the score as email engagement indicates interest.`,
      phoneInteractions: `${value} phone interactions ${direction === 'positive' ? 'strongly supports' : 'reduces'} the score due to direct communication.`,
      meetingInteractions: `${value} meetings ${direction === 'positive' ? 'significantly boosts' : 'lowers'} the score as in-person meetings show serious intent.`,
      lastInteractionDays: `${value} days since last interaction ${direction === 'positive' ? 'helps' : 'hurts'} the score - more recent activity is better.`,
      engagementScore: `Engagement score of ${value.toFixed(2)} ${direction === 'positive' ? 'supports' : 'reduces'} the prediction due to overall activity level.`,
      avgBudget: `Average budget of $${value.toLocaleString()} ${direction === 'positive' ? 'increases' : 'decreases'} conversion likelihood.`,
      propertyCount: `${value} properties viewed ${direction === 'positive' ? 'indicates' : 'suggests lower'} interest level.`,
      leadAge: `${value} days as a lead ${direction === 'positive' ? 'shows' : 'indicates'} established relationship.`,
      profileCompleteness: `${(value * 100).toFixed(0)}% profile completeness ${direction === 'positive' ? 'builds' : 'reduces'} confidence in the lead.`,
      hasEmail: `${value ? 'Having' : 'Missing'} email ${direction === 'positive' ? 'enables' : 'limits'} communication options.`,
      hasPhone: `${value ? 'Having' : 'Missing'} phone ${direction === 'positive' ? 'allows' : 'prevents'} direct contact.`
    };

    return explanations[featureName] || `${featureName} with value ${value} ${direction === 'positive' ? 'positively' : 'negatively'} influences the score.`;
  }

  /**
   * Calculate similarity between leads
   * @param {Object} features1 - First lead features
   * @param {Object} lead2 - Second lead data
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(features1, lead2) {
    // Simple similarity calculation based on key features
    let similarity = 0;
    let totalFeatures = 0;

    const keyFeatures = ['totalInteractions', 'avgBudget', 'leadAge'];

    for (const feature of keyFeatures) {
      if (features1[feature] !== undefined && lead2[feature] !== undefined) {
        const diff = Math.abs(features1[feature] - lead2[feature]);
        const maxValue = Math.max(features1[feature], lead2[feature]) || 1;
        similarity += 1 - (diff / maxValue);
        totalFeatures++;
      }
    }

    return totalFeatures > 0 ? similarity / totalFeatures : 0;
  }

  /**
   * Get feature importance analysis for model transparency
   * @returns {Promise<Object>} Feature importance data
   */
  async getFeatureImportanceAnalysis() {
    try {
      const weights = await this.getFeatureImportanceWeights();

      // Sort features by importance
      const sortedFeatures = Object.entries(weights)
        .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
        .map(([feature, weight]) => ({
          feature,
          importance: Math.abs(weight),
          direction: weight > 0 ? 'positive' : 'negative'
        }));

      return {
        topFeatures: sortedFeatures.slice(0, 10),
        allFeatures: sortedFeatures,
        analysisDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get feature importance analysis:', error);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = ExplainabilityService;