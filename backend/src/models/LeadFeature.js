const { Pool } = require('pg');

class LeadFeature {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });
  }

  /**
   * Create or update lead features
   * @param {number} leadId - Lead ID
   * @param {Object} features - Feature data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Created/updated feature record
   */
  async upsert(leadId, features, options = {}) {
    try {
      const { version = '1.0.0', source = 'ml_pipeline' } = options;

      const query = `
        INSERT INTO lead_features (
          lead_id, features, feature_version, last_updated, source
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
        ON CONFLICT (lead_id)
        DO UPDATE SET
          features = EXCLUDED.features,
          feature_version = EXCLUDED.feature_version,
          last_updated = CURRENT_TIMESTAMP,
          source = EXCLUDED.source
        RETURNING *
      `;

      const values = [
        leadId,
        JSON.stringify(features),
        version,
        source
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Failed to upsert lead features:', error);
      throw error;
    }
  }

  /**
   * Find features by lead ID
   * @param {number} leadId - Lead ID
   * @returns {Promise<Object|null>} Feature record or null
   */
  async findByLeadId(leadId) {
    try {
      const query = 'SELECT * FROM lead_features WHERE lead_id = $1';
      const result = await this.pool.query(query, [leadId]);

      if (result.rows.length === 0) {
        return null;
      }

      const record = result.rows[0];
      return {
        ...record,
        features: JSON.parse(record.features)
      };
    } catch (error) {
      console.error('Failed to find lead features:', error);
      throw error;
    }
  }

  /**
   * Find features by multiple lead IDs
   * @param {Array<number>} leadIds - Array of lead IDs
   * @returns {Promise<Array>} Array of feature records
   */
  async findByLeadIds(leadIds) {
    try {
      if (leadIds.length === 0) return [];

      const placeholders = leadIds.map((_, index) => `$${index + 1}`).join(',');
      const query = `SELECT * FROM lead_features WHERE lead_id IN (${placeholders})`;

      const result = await this.pool.query(query, leadIds);

      return result.rows.map(record => ({
        ...record,
        features: JSON.parse(record.features)
      }));
    } catch (error) {
      console.error('Failed to find lead features by IDs:', error);
      throw error;
    }
  }

  /**
   * Update features for a lead
   * @param {number} leadId - Lead ID
   * @param {Object} updates - Feature updates
   * @returns {Promise<Object>} Updated feature record
   */
  async update(leadId, updates) {
    try {
      const existing = await this.findByLeadId(leadId);

      if (!existing) {
        throw new Error(`Features not found for lead ${leadId}`);
      }

      const updatedFeatures = { ...existing.features, ...updates };

      const query = `
        UPDATE lead_features
        SET features = $1, last_updated = CURRENT_TIMESTAMP
        WHERE lead_id = $2
        RETURNING *
      `;

      const result = await this.pool.query(query, [JSON.stringify(updatedFeatures), leadId]);

      const record = result.rows[0];
      return {
        ...record,
        features: JSON.parse(record.features)
      };
    } catch (error) {
      console.error('Failed to update lead features:', error);
      throw error;
    }
  }

  /**
   * Delete features for a lead
   * @param {number} leadId - Lead ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(leadId) {
    try {
      const query = 'DELETE FROM lead_features WHERE lead_id = $1';
      const result = await this.pool.query(query, [leadId]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Failed to delete lead features:', error);
      throw error;
    }
  }

  /**
   * Get feature statistics
   * @returns {Promise<Object>} Feature statistics
   */
  async getStatistics() {
    try {
      const query = `
        SELECT
          COUNT(*) as total_features,
          COUNT(DISTINCT lead_id) as leads_with_features,
          AVG(jsonb_object_length(features)) as avg_feature_count,
          MAX(last_updated) as latest_update,
          MIN(last_updated) as oldest_update,
          COUNT(DISTINCT feature_version) as unique_versions
        FROM lead_features
      `;

      const result = await this.pool.query(query);
      return result.rows[0];
    } catch (error) {
      console.error('Failed to get feature statistics:', error);
      throw error;
    }
  }

  /**
   * Get features updated within a time range
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Feature records
   */
  async getRecentlyUpdated(options = {}) {
    try {
      const { hours = 24, limit = 100 } = options;

      const query = `
        SELECT * FROM lead_features
        WHERE last_updated >= CURRENT_TIMESTAMP - INTERVAL '${hours} hours'
        ORDER BY last_updated DESC
        LIMIT $1
      `;

      const result = await this.pool.query(query, [limit]);

      return result.rows.map(record => ({
        ...record,
        features: JSON.parse(record.features)
      }));
    } catch (error) {
      console.error('Failed to get recently updated features:', error);
      throw error;
    }
  }

  /**
   * Get feature value distribution for analysis
   * @param {string} featureName - Name of the feature to analyze
   * @returns {Promise<Object>} Feature distribution
   */
  async getFeatureDistribution(featureName) {
    try {
      const query = `
        SELECT
          CASE
            WHEN (features->>$1)::float < 0.2 THEN '0.0-0.2'
            WHEN (features->>$1)::float < 0.4 THEN '0.2-0.4'
            WHEN (features->>$1)::float < 0.6 THEN '0.4-0.6'
            WHEN (features->>$1)::float < 0.8 THEN '0.6-0.8'
            ELSE '0.8-1.0'
          END as bucket,
          COUNT(*) as count
        FROM lead_features
        WHERE features ? $1
        GROUP BY bucket
        ORDER BY bucket
      `;

      const result = await this.pool.query(query, [featureName]);
      return result.rows;
    } catch (error) {
      console.error('Failed to get feature distribution:', error);
      throw error;
    }
  }

  /**
   * Bulk upsert features for multiple leads
   * @param {Array} featuresData - Array of {leadId, features, version, source}
   * @returns {Promise<Array>} Upserted feature records
   */
  async bulkUpsert(featuresData) {
    try {
      if (featuresData.length === 0) return [];

      const values = [];
      const placeholders = [];

      featuresData.forEach((data, index) => {
        const baseIndex = index * 5;
        placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5})`);
        values.push(
          data.leadId,
          JSON.stringify(data.features),
          data.version || '1.0.0',
          new Date(),
          data.source || 'bulk_import'
        );
      });

      const query = `
        INSERT INTO lead_features (
          lead_id, features, feature_version, last_updated, source
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (lead_id)
        DO UPDATE SET
          features = EXCLUDED.features,
          feature_version = EXCLUDED.feature_version,
          last_updated = EXCLUDED.last_updated,
          source = EXCLUDED.source
        RETURNING *
      `;

      const result = await this.pool.query(query, values);

      return result.rows.map(record => ({
        ...record,
        features: JSON.parse(record.features)
      }));
    } catch (error) {
      console.error('Failed to bulk upsert lead features:', error);
      throw error;
    }
  }

  /**
   * Find leads with similar features
   * @param {number} leadId - Reference lead ID
   * @param {Object} features - Reference features
   * @param {number} limit - Maximum number of similar leads
   * @returns {Promise<Array>} Similar leads with similarity scores
   */
  async findSimilarLeads(leadId, features, limit = 10) {
    try {
      // This is a simplified similarity search
      // In production, you might use more sophisticated similarity algorithms
      const query = `
        SELECT
          lead_id,
          features,
          -- Simple similarity based on common feature values
          (
            CASE WHEN (features->>'totalInteractions')::float = $1 THEN 1 ELSE 0 END +
            CASE WHEN (features->>'hasEmail')::float = $2 THEN 1 ELSE 0 END +
            CASE WHEN (features->>'hasPhone')::float = $3 THEN 1 ELSE 0 END
          ) as similarity_score
        FROM lead_features
        WHERE lead_id != $4
        ORDER BY similarity_score DESC
        LIMIT $5
      `;

      const result = await this.pool.query(query, [
        features.totalInteractions || 0,
        features.hasEmail || 0,
        features.hasPhone || 0,
        leadId,
        limit
      ]);

      return result.rows.map(record => ({
        leadId: record.lead_id,
        features: JSON.parse(record.features),
        similarityScore: parseInt(record.similarity_score)
      }));
    } catch (error) {
      console.error('Failed to find similar leads:', error);
      throw error;
    }
  }

  /**
   * Clean up old features
   * @param {number} daysOld - Remove features older than this many days
   * @returns {Promise<number>} Number of deleted records
   */
  async cleanupOldFeatures(daysOld = 90) {
    try {
      const query = `
        DELETE FROM lead_features
        WHERE last_updated < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
      `;

      const result = await this.pool.query(query);
      return result.rowCount;
    } catch (error) {
      console.error('Failed to cleanup old features:', error);
      throw error;
    }
  }

  /**
   * Get feature engineering statistics
   * @returns {Promise<Object>} Feature engineering stats
   */
  async getFeatureEngineeringStats() {
    try {
      const stats = await this.getStatistics();

      // Get additional feature engineering insights
      const featureQuery = `
        SELECT
          COUNT(*) as features_with_interactions,
          AVG((features->>'totalInteractions')::float) as avg_interactions,
          AVG((features->>'leadAge')::float) as avg_lead_age,
          COUNT(CASE WHEN (features->>'hasEmail')::float = 1 THEN 1 END) as leads_with_email,
          COUNT(CASE WHEN (features->>'hasPhone')::float = 1 THEN 1 END) as leads_with_phone
        FROM lead_features
        WHERE features ? 'totalInteractions'
      `;

      const featureResult = await this.pool.query(featureQuery);
      const featureStats = featureResult.rows[0];

      return {
        ...stats,
        ...featureStats,
        emailCoverage: stats.total_features > 0 ? (featureStats.leads_with_email / stats.total_features) * 100 : 0,
        phoneCoverage: stats.total_features > 0 ? (featureStats.leads_with_phone / stats.total_features) * 100 : 0
      };
    } catch (error) {
      console.error('Failed to get feature engineering stats:', error);
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

module.exports = LeadFeature;