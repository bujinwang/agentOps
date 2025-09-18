const { Pool } = require('pg');

class MLModel {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });
  }

  /**
   * Create a new ML model record
   * @param {Object} modelData - Model data
   * @returns {Promise<Object>} Created model
   */
  async create(modelData) {
    try {
      const query = `
        INSERT INTO ml_models (
          model_id, model_type, version, status, accuracy, precision, recall,
          f1_score, training_date, model_data, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const values = [
        modelData.modelId,
        modelData.modelType,
        modelData.version || '1.0.0',
        modelData.status || 'active',
        modelData.accuracy || 0,
        modelData.precision || 0,
        modelData.recall || 0,
        modelData.f1Score || 0,
        modelData.trainingDate || new Date(),
        JSON.stringify(modelData.modelData || {}),
        JSON.stringify(modelData.metadata || {})
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Failed to create ML model:', error);
      throw error;
    }
  }

  /**
   * Find model by ID
   * @param {string} modelId - Model ID
   * @returns {Promise<Object|null>} Model data or null
   */
  async findById(modelId) {
    try {
      const query = 'SELECT * FROM ml_models WHERE model_id = $1';
      const result = await this.pool.query(query, [modelId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Failed to find ML model:', error);
      throw error;
    }
  }

  /**
   * Find active model
   * @returns {Promise<Object|null>} Active model or null
   */
  async findActive() {
    try {
      const query = 'SELECT * FROM ml_models WHERE status = $1 ORDER BY training_date DESC LIMIT 1';
      const result = await this.pool.query(query, ['active']);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Failed to find active ML model:', error);
      throw error;
    }
  }

  /**
   * Find all models with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of models
   */
  async findAll(filters = {}) {
    try {
      let query = 'SELECT * FROM ml_models WHERE 1=1';
      const values = [];
      let paramCount = 1;

      if (filters.status) {
        query += ` AND status = $${paramCount}`;
        values.push(filters.status);
        paramCount++;
      }

      if (filters.modelType) {
        query += ` AND model_type = $${paramCount}`;
        values.push(filters.modelType);
        paramCount++;
      }

      if (filters.minAccuracy) {
        query += ` AND accuracy >= $${paramCount}`;
        values.push(filters.minAccuracy);
        paramCount++;
      }

      query += ' ORDER BY training_date DESC';

      if (filters.limit) {
        query += ` LIMIT $${paramCount}`;
        values.push(filters.limit);
        paramCount++;
      }

      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Failed to find ML models:', error);
      throw error;
    }
  }

  /**
   * Update model
   * @param {string} modelId - Model ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated model
   */
  async update(modelId, updates) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updates).forEach(key => {
        if (key === 'metadata' || key === 'modelData') {
          fields.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(updates[key]));
        } else {
          fields.push(`${key} = $${paramCount}`);
          values.push(updates[key]);
        }
        paramCount++;
      });

      fields.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE ml_models
        SET ${fields.join(', ')}
        WHERE model_id = $${paramCount}
        RETURNING *
      `;

      values.push(modelId);

      const result = await this.pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Failed to update ML model:', error);
      throw error;
    }
  }

  /**
   * Delete model
   * @param {string} modelId - Model ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(modelId) {
    try {
      const query = 'DELETE FROM ml_models WHERE model_id = $1';
      const result = await this.pool.query(query, [modelId]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Failed to delete ML model:', error);
      throw error;
    }
  }

  /**
   * Get model statistics
   * @returns {Promise<Object>} Model statistics
   */
  async getStatistics() {
    try {
      const query = `
        SELECT
          COUNT(*) as total_models,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_models,
          COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_models,
          AVG(accuracy) as avg_accuracy,
          MAX(accuracy) as max_accuracy,
          MIN(training_date) as oldest_model,
          MAX(training_date) as newest_model
        FROM ml_models
      `;

      const result = await this.pool.query(query);
      return result.rows[0];
    } catch (error) {
      console.error('Failed to get model statistics:', error);
      throw error;
    }
  }

  /**
   * Get model performance history
   * @param {string} modelId - Model ID
   * @param {number} days - Number of days to look back
   * @returns {Promise<Array>} Performance history
   */
  async getPerformanceHistory(modelId, days = 30) {
    try {
      const query = `
        SELECT
          mp.metric_name,
          mp.metric_value,
          mp.recorded_at
        FROM model_performance mp
        WHERE mp.model_id = $1
        AND mp.recorded_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
        ORDER BY mp.recorded_at DESC
      `;

      const result = await this.pool.query(query, [modelId]);
      return result.rows;
    } catch (error) {
      console.error('Failed to get model performance history:', error);
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

module.exports = MLModel;