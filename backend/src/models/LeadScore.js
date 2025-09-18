const { Pool } = require('pg');

class LeadScore {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });
  }

  /**
   * Create a new lead score record
   * @param {Object} scoreData - Score data
   * @returns {Promise<Object>} Created score record
   */
  async create(scoreData) {
    try {
      const query = `
        INSERT INTO lead_scores (
          lead_id, score, score_type, confidence, model_version,
          features_used, scored_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [
        scoreData.leadId,
        scoreData.score,
        scoreData.scoreType || 'ml',
        scoreData.confidence || 0,
        scoreData.modelVersion || 'unknown',
        JSON.stringify(scoreData.featuresUsed || []),
        scoreData.scoredAt || new Date()
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Failed to create lead score:', error);
      throw error;
    }
  }

  /**
   * Find scores by lead ID
   * @param {number} leadId - Lead ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of score records
   */
  async findByLeadId(leadId, options = {}) {
    try {
      const { limit = 10, offset = 0, scoreType } = options;

      let query = 'SELECT * FROM lead_scores WHERE lead_id = $1';
      const values = [leadId];
      let paramCount = 2;

      if (scoreType) {
        query += ` AND score_type = $${paramCount}`;
        values.push(scoreType);
        paramCount++;
      }

      query += ` ORDER BY scored_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      values.push(limit, offset);

      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Failed to find lead scores:', error);
      throw error;
    }
  }

  /**
   * Get latest score for a lead
   * @param {number} leadId - Lead ID
   * @param {string} scoreType - Score type filter
   * @returns {Promise<Object|null>} Latest score or null
   */
  async getLatestScore(leadId, scoreType = null) {
    try {
      let query = 'SELECT * FROM lead_scores WHERE lead_id = $1';
      const values = [leadId];

      if (scoreType) {
        query += ' AND score_type = $2';
        values.push(scoreType);
      }

      query += ' ORDER BY scored_at DESC LIMIT 1';

      const result = await this.pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Failed to get latest lead score:', error);
      throw error;
    }
  }

  /**
   * Get score statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Score statistics
   */
  async getStatistics(filters = {}) {
    try {
      const { startDate, endDate, scoreType } = filters;

      let query = `
        SELECT
          COUNT(*) as total_scores,
          AVG(score) as avg_score,
          MIN(score) as min_score,
          MAX(score) as max_score,
          STDDEV(score) as score_stddev,
          AVG(confidence) as avg_confidence,
          COUNT(DISTINCT lead_id) as unique_leads
        FROM lead_scores
        WHERE 1=1
      `;

      const values = [];
      let paramCount = 1;

      if (startDate) {
        query += ` AND scored_at >= $${paramCount}`;
        values.push(startDate);
        paramCount++;
      }

      if (endDate) {
        query += ` AND scored_at <= $${paramCount}`;
        values.push(endDate);
        paramCount++;
      }

      if (scoreType) {
        query += ` AND score_type = $${paramCount}`;
        values.push(scoreType);
        paramCount++;
      }

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Failed to get score statistics:', error);
      throw error;
    }
  }

  /**
   * Get score distribution
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Score distribution buckets
   */
  async getScoreDistribution(filters = {}) {
    try {
      const { startDate, endDate, scoreType, buckets = 10 } = filters;

      let query = `
        SELECT
          FLOOR(score * ${buckets}) / ${buckets} as bucket,
          COUNT(*) as count
        FROM lead_scores
        WHERE 1=1
      `;

      const values = [];
      let paramCount = 1;

      if (startDate) {
        query += ` AND scored_at >= $${paramCount}`;
        values.push(startDate);
        paramCount++;
      }

      if (endDate) {
        query += ` AND scored_at <= $${paramCount}`;
        values.push(endDate);
        paramCount++;
      }

      if (scoreType) {
        query += ` AND score_type = $${paramCount}`;
        values.push(scoreType);
        paramCount++;
      }

      query += ' GROUP BY bucket ORDER BY bucket';

      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Failed to get score distribution:', error);
      throw error;
    }
  }

  /**
   * Get scoring trends over time
   * @param {Object} options - Trend options
   * @returns {Promise<Array>} Scoring trends
   */
  async getScoringTrends(options = {}) {
    try {
      const { interval = 'day', days = 30, scoreType } = options;

      let query = `
        SELECT
          DATE_TRUNC('${interval}', scored_at) as period,
          COUNT(*) as total_scores,
          AVG(score) as avg_score,
          AVG(confidence) as avg_confidence,
          COUNT(DISTINCT lead_id) as unique_leads
        FROM lead_scores
        WHERE scored_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
      `;

      const values = [];
      let paramCount = 1;

      if (scoreType) {
        query += ` AND score_type = $${paramCount}`;
        values.push(scoreType);
        paramCount++;
      }

      query += `
        GROUP BY period
        ORDER BY period DESC
      `;

      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Failed to get scoring trends:', error);
      throw error;
    }
  }

  /**
   * Delete scores for a lead
   * @param {number} leadId - Lead ID
   * @param {string} scoreType - Optional score type filter
   * @returns {Promise<number>} Number of deleted records
   */
  async deleteByLeadId(leadId, scoreType = null) {
    try {
      let query = 'DELETE FROM lead_scores WHERE lead_id = $1';
      const values = [leadId];

      if (scoreType) {
        query += ' AND score_type = $2';
        values.push(scoreType);
      }

      const result = await this.pool.query(query, values);
      return result.rowCount;
    } catch (error) {
      console.error('Failed to delete lead scores:', error);
      throw error;
    }
  }

  /**
   * Bulk create scores
   * @param {Array} scoresData - Array of score data
   * @returns {Promise<Array>} Created score records
   */
  async bulkCreate(scoresData) {
    try {
      if (scoresData.length === 0) return [];

      const values = [];
      const placeholders = [];

      scoresData.forEach((score, index) => {
        const baseIndex = index * 7;
        placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7})`);
        values.push(
          score.leadId,
          score.score,
          score.scoreType || 'ml',
          score.confidence || 0,
          score.modelVersion || 'unknown',
          JSON.stringify(score.featuresUsed || []),
          score.scoredAt || new Date()
        );
      });

      const query = `
        INSERT INTO lead_scores (
          lead_id, score, score_type, confidence, model_version,
          features_used, scored_at
        ) VALUES ${placeholders.join(', ')}
        RETURNING *
      `;

      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Failed to bulk create lead scores:', error);
      throw error;
    }
  }

  /**
   * Clean up old scores
   * @param {number} daysOld - Remove scores older than this many days
   * @returns {Promise<number>} Number of deleted records
   */
  async cleanupOldScores(daysOld = 365) {
    try {
      const query = `
        DELETE FROM lead_scores
        WHERE scored_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
      `;

      const result = await this.pool.query(query);
      return result.rowCount;
    } catch (error) {
      console.error('Failed to cleanup old scores:', error);
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

module.exports = LeadScore;