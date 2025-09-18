const tf = require('@tensorflow/tfjs-node');
const { Pool } = require('pg');
const Redis = require('redis');
const { promisify } = require('util');

class MLScoringService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });

    this.redis = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.models = new Map();
    this.modelCache = new Map();
    this.scoringQueue = [];
    this.isProcessing = false;
  }

  /**
   * Initialize the ML scoring service
   */
  async initialize() {
    try {
      await this.redis.connect();
      await this.loadActiveModels();
      console.log('ML Scoring Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ML Scoring Service:', error);
      throw error;
    }
  }

  /**
   * Load all active models from database
   */
  async loadActiveModels() {
    try {
      const query = `
        SELECT model_id, model_type, version, model_data, metadata
        FROM ml_models
        WHERE status = 'active'
        ORDER BY training_date DESC
      `;

      const result = await this.pool.query(query);

      for (const row of result.rows) {
        const model = await tf.loadLayersModel(tf.io.fromMemory(
          Buffer.from(row.model_data.model_json),
          row.model_data.weights
        ));

        this.models.set(row.model_id, {
          model,
          type: row.model_type,
          version: row.version,
          metadata: row.metadata
        });
      }

      console.log(`Loaded ${this.models.size} active ML models`);
    } catch (error) {
      console.error('Failed to load active models:', error);
      throw error;
    }
  }

  /**
   * Score a single lead using ML model
   * @param {number} leadId - Lead ID to score
   * @returns {Promise<Object>} Scoring result
   */
  async scoreLead(leadId) {
    try {
      // Check cache first
      const cacheKey = `lead_score:${leadId}`;
      const cachedResult = await this.redis.get(cacheKey);

      if (cachedResult) {
        return JSON.parse(cachedResult);
      }

      // Get lead data and features
      const leadData = await this.getLeadData(leadId);
      const features = await this.extractFeatures(leadData);

      // Get active model
      const activeModel = this.getActiveModel();
      if (!activeModel) {
        throw new Error('No active ML model available');
      }

      // Perform scoring
      const score = await this.performScoring(features, activeModel);
      const confidence = this.calculateConfidence(score);
      const insights = await this.generateInsights(features, score);

      const result = {
        leadId,
        score: score.prediction,
        confidence,
        modelVersion: activeModel.version,
        featuresUsed: Object.keys(features),
        insights,
        scoredAt: new Date().toISOString()
      };

      // Cache result for 1 hour
      await this.redis.setex(cacheKey, 3600, JSON.stringify(result));

      // Store scoring history
      await this.storeScoringResult(result);

      return result;
    } catch (error) {
      console.error(`Failed to score lead ${leadId}:`, error);
      throw error;
    }
  }

  /**
   * Score multiple leads in batch
   * @param {number[]} leadIds - Array of lead IDs to score
   * @returns {Promise<Object[]>} Array of scoring results
   */
  async scoreLeadsBatch(leadIds) {
    const results = [];

    for (const leadId of leadIds) {
      try {
        const result = await this.scoreLead(leadId);
        results.push(result);
      } catch (error) {
        console.error(`Failed to score lead ${leadId} in batch:`, error);
        results.push({
          leadId,
          error: error.message,
          scoredAt: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * Get lead data from database
   * @param {number} leadId - Lead ID
   * @returns {Promise<Object>} Lead data
   */
  async getLeadData(leadId) {
    const query = `
      SELECT l.*,
             json_agg(li.*) as interactions,
             json_agg(p.*) as properties
      FROM leads l
      LEFT JOIN lead_interactions li ON l.id = li.lead_id
      LEFT JOIN lead_properties lp ON l.id = lp.lead_id
      LEFT JOIN properties p ON lp.property_id = p.id
      WHERE l.id = $1
      GROUP BY l.id
    `;

    const result = await this.pool.query(query, [leadId]);

    if (result.rows.length === 0) {
      throw new Error(`Lead ${leadId} not found`);
    }

    return result.rows[0];
  }

  /**
   * Extract features for ML scoring
   * @param {Object} leadData - Lead data
   * @returns {Promise<Object>} Extracted features
   */
  async extractFeatures(leadData) {
    // This will be implemented by FeatureEngineeringService
    // For now, return basic features
    return {
      leadAge: this.calculateLeadAge(leadData.created_at),
      interactionCount: leadData.interactions?.length || 0,
      propertyCount: leadData.properties?.length || 0,
      lastInteractionDays: this.calculateDaysSinceLastInteraction(leadData.interactions),
      emailEngagement: this.calculateEmailEngagement(leadData.interactions),
      phoneEngagement: this.calculatePhoneEngagement(leadData.interactions),
      propertyBudget: this.extractPropertyBudget(leadData.properties)
    };
  }

  /**
   * Perform ML scoring using the model
   * @param {Object} features - Extracted features
   * @param {Object} modelInfo - Model information
   * @returns {Promise<Object>} Scoring result
   */
  async performScoring(features, modelInfo) {
    try {
      // Convert features to tensor
      const featureArray = Object.values(features);
      const inputTensor = tf.tensor2d([featureArray], [1, featureArray.length]);

      // Make prediction
      const prediction = modelInfo.model.predict(inputTensor);
      const predictionData = await prediction.data();

      // Clean up tensors
      inputTensor.dispose();
      prediction.dispose();

      return {
        prediction: predictionData[0],
        rawOutput: predictionData
      };
    } catch (error) {
      console.error('ML prediction failed:', error);
      throw error;
    }
  }

  /**
   * Calculate confidence score
   * @param {Object} score - Raw scoring result
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(score) {
    // Simple confidence calculation based on prediction strength
    const confidence = Math.abs(score.prediction - 0.5) * 2;
    return Math.min(confidence, 1.0);
  }

  /**
   * Generate insights for the scoring result
   * @param {Object} features - Features used
   * @param {Object} score - Scoring result
   * @returns {Promise<Object>} Insights object
   */
  async generateInsights(features, score) {
    // This will be enhanced by ExplainabilityService
    return {
      topFactors: this.identifyTopFactors(features),
      riskLevel: this.calculateRiskLevel(score.prediction),
      recommendations: this.generateRecommendations(score.prediction)
    };
  }

  /**
   * Get the currently active model
   * @returns {Object} Active model info
   */
  getActiveModel() {
    // Return the most recent model (could be enhanced with A/B testing)
    const modelIds = Array.from(this.models.keys());
    if (modelIds.length === 0) return null;

    return this.models.get(modelIds[0]);
  }

  /**
   * Store scoring result in database
   * @param {Object} result - Scoring result
   */
  async storeScoringResult(result) {
    const query = `
      INSERT INTO lead_scores (lead_id, score, score_type, confidence, model_version, features_used, scored_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await this.pool.query(query, [
      result.leadId,
      result.score,
      'ml',
      result.confidence,
      result.modelVersion,
      JSON.stringify(result.featuresUsed),
      result.scoredAt
    ]);
  }

  // Helper methods for feature calculation
  calculateLeadAge(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    return Math.floor((now - created) / (1000 * 60 * 60 * 24));
  }

  calculateDaysSinceLastInteraction(interactions) {
    if (!interactions || interactions.length === 0) return 999;
    const lastInteraction = new Date(Math.max(...interactions.map(i => new Date(i.created_at))));
    const now = new Date();
    return Math.floor((now - lastInteraction) / (1000 * 60 * 60 * 24));
  }

  calculateEmailEngagement(interactions) {
    if (!interactions) return 0;
    const emailInteractions = interactions.filter(i => i.type === 'email');
    return emailInteractions.length;
  }

  calculatePhoneEngagement(interactions) {
    if (!interactions) return 0;
    const phoneInteractions = interactions.filter(i => i.type === 'phone');
    return phoneInteractions.length;
  }

  extractPropertyBudget(properties) {
    if (!properties || properties.length === 0) return 0;
    // Extract budget from property preferences
    return properties.reduce((sum, prop) => sum + (prop.budget || 0), 0) / properties.length;
  }

  identifyTopFactors(features) {
    // Simple factor identification based on feature values
    const factors = [];
    if (features.interactionCount > 5) factors.push('High engagement');
    if (features.leadAge < 7) factors.push('Recent lead');
    if (features.propertyBudget > 500000) factors.push('High budget');
    return factors;
  }

  calculateRiskLevel(score) {
    if (score > 0.8) return 'High';
    if (score > 0.6) return 'Medium';
    return 'Low';
  }

  generateRecommendations(score) {
    if (score > 0.8) {
      return ['Prioritize this lead', 'Schedule immediate follow-up'];
    } else if (score > 0.6) {
      return ['Moderate priority', 'Nurture with targeted content'];
    } else {
      return ['Low priority', 'Add to drip campaign'];
    }
  }

  /**
   * Clean up resources
   */
  async close() {
    await this.pool.end();
    await this.redis.disconnect();

    // Clean up TensorFlow memory
    for (const modelInfo of this.models.values()) {
      modelInfo.model.dispose();
    }
  }
}

module.exports = MLScoringService;