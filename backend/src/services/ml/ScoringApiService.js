const { Pool } = require('pg');
const Redis = require('redis');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');

class ScoringApiService {
  constructor(mlScoringService, featureEngineeringService, explainabilityService) {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });

    this.redis = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.mlScoringService = mlScoringService;
    this.featureEngineeringService = featureEngineeringService;
    this.explainabilityService = explainabilityService;

    this.rateLimiters = this.setupRateLimiters();
  }

  /**
   * Set up rate limiters for API endpoints
   */
  setupRateLimiters() {
    return {
      scoring: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many scoring requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      }),

      batchScoring: rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 20, // limit each IP to 20 batch requests per windowMs
        message: 'Too many batch scoring requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      }),

      explainability: rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 50,
        message: 'Too many explainability requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      })
    };
  }

  /**
   * Get validation rules for scoring endpoints
   */
  getValidationRules() {
    return {
      scoreLead: [
        param('leadId').isInt({ min: 1 }).withMessage('Lead ID must be a positive integer')
      ],

      scoreLeadWithData: [
        body('leadId').optional().isInt({ min: 1 }).withMessage('Lead ID must be a positive integer'),
        body('firstName').optional().isString().trim().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
        body('lastName').optional().isString().trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
        body('email').optional().isEmail().normalizeEmail().withMessage('Must be a valid email address'),
        body('phone').optional().isString().trim().matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Must be a valid phone number'),
        body('createdAt').optional().isISO8601().withMessage('Created date must be ISO 8601 format')
      ],

      batchScore: [
        body('leadIds').isArray({ min: 1, max: 50 }).withMessage('Lead IDs must be an array of 1-50 items'),
        body('leadIds.*').isInt({ min: 1 }).withMessage('Each lead ID must be a positive integer')
      ]
    };
  }

  /**
   * Score a single lead by ID
   */
  async scoreLead(req, res) {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { leadId } = req.params;

      // Check if lead exists
      const leadExists = await this.checkLeadExists(leadId);
      if (!leadExists) {
        return res.status(404).json({
          error: 'Lead not found',
          leadId: leadId
        });
      }

      // Perform scoring
      const result = await this.mlScoringService.scoreLead(parseInt(leadId));

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Score lead API error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to score lead'
      });
    }
  }

  /**
   * Score a lead with provided data (no database lookup)
   */
  async scoreLeadWithData(req, res) {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const leadData = req.body;

      // Extract features from provided data
      const features = await this.extractFeaturesFromData(leadData);

      // Get active model
      const activeModel = this.mlScoringService.getActiveModel();
      if (!activeModel) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'No active ML model available'
        });
      }

      // Perform scoring
      const score = await this.mlScoringService.performScoring(features, activeModel);
      const confidence = this.mlScoringService.calculateConfidence(score.prediction);

      const result = {
        score: score.prediction,
        confidence,
        modelVersion: activeModel.version,
        featuresUsed: Object.keys(features),
        scoredAt: new Date().toISOString()
      };

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Score lead with data API error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to score lead with provided data'
      });
    }
  }

  /**
   * Score multiple leads in batch
   */
  async batchScoreLeads(req, res) {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { leadIds } = req.body;

      // Check if all leads exist
      const existingLeads = await this.checkLeadsExist(leadIds);
      const missingLeads = leadIds.filter(id => !existingLeads.includes(id));

      if (missingLeads.length > 0) {
        return res.status(400).json({
          error: 'Some leads not found',
          missingLeads: missingLeads
        });
      }

      // Perform batch scoring
      const results = await this.mlScoringService.scoreLeadsBatch(leadIds);

      res.json({
        success: true,
        data: {
          totalRequested: leadIds.length,
          results: results
        }
      });

    } catch (error) {
      console.error('Batch score leads API error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to batch score leads'
      });
    }
  }

  /**
   * Get scoring history for a lead
   */
  async getLeadScoringHistory(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { leadId } = req.params;
      const { limit = 10, offset = 0 } = req.query;

      const query = `
        SELECT
          id,
          score,
          confidence,
          model_version,
          features_used,
          scored_at
        FROM lead_scores
        WHERE lead_id = $1
        ORDER BY scored_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.pool.query(query, [leadId, limit, offset]);

      res.json({
        success: true,
        data: {
          leadId: parseInt(leadId),
          history: result.rows,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            count: result.rows.length
          }
        }
      });

    } catch (error) {
      console.error('Get lead scoring history API error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve scoring history'
      });
    }
  }

  /**
   * Get lead insights and explanations
   */
  async getLeadInsights(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { leadId } = req.params;

      // Get latest scoring result
      const latestScore = await this.getLatestScore(leadId);
      if (!latestScore) {
        return res.status(404).json({
          error: 'No scoring data found',
          leadId: leadId
        });
      }

      // Get lead data and features
      const leadData = await this.mlScoringService.getLeadData(leadId);
      const features = await this.featureEngineeringService.extractLeadFeatures(leadData);

      // Generate explanation
      const explanation = await this.explainabilityService.generateExplanation(
        leadId,
        latestScore.score,
        features
      );

      res.json({
        success: true,
        data: {
          leadId: parseInt(leadId),
          latestScore: latestScore,
          explanation: explanation
        }
      });

    } catch (error) {
      console.error('Get lead insights API error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate lead insights'
      });
    }
  }

  /**
   * Get feature importance analysis
   */
  async getFeatureImportance(req, res) {
    try {
      const analysis = await this.explainabilityService.getFeatureImportanceAnalysis();

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
  }

  /**
   * Get model performance metrics
   */
  async getModelMetrics(req, res) {
    try {
      const query = `
        SELECT
          model_id,
          metric_name,
          metric_value,
          recorded_at
        FROM model_performance
        WHERE recorded_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
        ORDER BY recorded_at DESC
        LIMIT 100
      `;

      const result = await this.pool.query(query);

      // Group metrics by model
      const metricsByModel = {};
      result.rows.forEach(row => {
        if (!metricsByModel[row.model_id]) {
          metricsByModel[row.model_id] = [];
        }
        metricsByModel[row.model_id].push({
          metric: row.metric_name,
          value: row.metric_value,
          recordedAt: row.recorded_at
        });
      });

      res.json({
        success: true,
        data: {
          models: metricsByModel,
          timeRange: 'Last 7 days'
        }
      });

    } catch (error) {
      console.error('Get model metrics API error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve model metrics'
      });
    }
  }

  // Helper methods

  async checkLeadExists(leadId) {
    try {
      const result = await this.pool.query('SELECT 1 FROM leads WHERE id = $1', [leadId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Failed to check lead existence:', error);
      return false;
    }
  }

  async checkLeadsExist(leadIds) {
    try {
      const query = 'SELECT id FROM leads WHERE id = ANY($1)';
      const result = await this.pool.query(query, [leadIds]);
      return result.rows.map(row => row.id);
    } catch (error) {
      console.error('Failed to check leads existence:', error);
      return [];
    }
  }

  async extractFeaturesFromData(leadData) {
    // Convert provided data to feature format
    return {
      leadAge: leadData.createdAt ? this.calculateLeadAge(leadData.createdAt) : 0,
      hasEmail: leadData.email ? 1 : 0,
      hasPhone: leadData.phone ? 1 : 0,
      nameLength: (leadData.firstName || '').length + (leadData.lastName || '').length,
      profileCompleteness: this.calculateProfileCompletenessFromData(leadData),
      // Add other features as needed
      totalInteractions: 0, // Would need interaction data
      emailInteractions: 0,
      phoneInteractions: 0,
      meetingInteractions: 0,
      websiteInteractions: 0,
      interactionFrequency: 0,
      lastInteractionDays: 999,
      responseTimeAvg: 0,
      engagementScore: 0,
      avgBudget: 0,
      propertyCount: 0,
      avgBedrooms: 0,
      avgBathrooms: 0,
      avgSquareFeet: 0,
      daysSinceUpdate: 0,
      isActive: 0
    };
  }

  calculateLeadAge(createdAt) {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  }

  calculateProfileCompletenessFromData(leadData) {
    const fields = ['firstName', 'lastName', 'email', 'phone'];
    const filledFields = fields.filter(field => leadData[field]).length;
    return filledFields / fields.length;
  }

  async getLatestScore(leadId) {
    try {
      const query = `
        SELECT score, confidence, model_version, features_used, scored_at
        FROM lead_scores
        WHERE lead_id = $1
        ORDER BY scored_at DESC
        LIMIT 1
      `;

      const result = await this.pool.query(query, [leadId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Failed to get latest score:', error);
      return null;
    }
  }

  /**
   * Get API endpoint definitions for documentation
   */
  getApiEndpoints() {
    return {
      scoring: {
        'POST /api/ml/scoring/lead/:leadId': 'Score a lead by ID',
        'POST /api/ml/scoring/data': 'Score a lead with provided data',
        'POST /api/ml/scoring/batch': 'Score multiple leads',
        'GET /api/ml/scoring/lead/:leadId/history': 'Get scoring history for a lead'
      },
      explainability: {
        'GET /api/ml/insights/lead/:leadId': 'Get detailed insights and explanations',
        'GET /api/ml/features/importance': 'Get feature importance analysis'
      },
      monitoring: {
        'GET /api/ml/metrics': 'Get model performance metrics'
      }
    };
  }

  /**
   * Clean up resources
   */
  async close() {
    await this.pool.end();
    await this.redis.disconnect();
  }
}

module.exports = ScoringApiService;