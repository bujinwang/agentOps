const { logger } = require('../config/logger');
const { sendResponse, sendError } = require('../utils/responseFormatter');

/**
 * MLS Sync Service - Extracted from n8n MLS sync workflow
 * Handles scheduled MLS data synchronization
 */
class MLSSyncService {
  constructor() {
    this.db = require('../config/database');
    this.redis = require('../config/redis');
    this.isRunning = false;
    this.currentSyncId = null;
  }

  /**
   * Check if MLS sync is currently available/running
   * @returns {Promise<boolean>} True if sync can start
   */
  async isSyncAvailable() {
    try {
      // Check Redis cache for current sync status
      const syncStatus = await this.redis.get('mls:sync:status');

      if (syncStatus === 'running') {
        logger.info('MLS sync already running, skipping');
        return false;
      }

      // Check database for recent sync attempts
      const recentSyncQuery = await this.db.query(`
        SELECT sync_id, status, started_at
        FROM mls_sync_logs
        WHERE started_at > NOW() - INTERVAL '5 minutes'
        AND status = 'running'
        ORDER BY started_at DESC
        LIMIT 1
      `);

      if (recentSyncQuery.rows.length > 0) {
        logger.info('Recent MLS sync still running', {
          syncId: recentSyncQuery.rows[0].sync_id,
          startedAt: recentSyncQuery.rows[0].started_at
        });
        return false;
      }

      return true;

    } catch (error) {
      logger.error('Error checking MLS sync availability', {
        error: error.message,
        stack: error.stack
      });
      // On error, assume sync is not available to prevent conflicts
      return false;
    }
  }

  /**
   * Start MLS synchronization process
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync result
   */
  async startSync(options = {}) {
    try {
      if (!(await this.isSyncAvailable())) {
        return {
          success: false,
          message: 'MLS sync already running',
          status: 'skipped'
        };
      }

      // Generate sync ID and set running status
      const syncId = `mls_sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.currentSyncId = syncId;

      // Set Redis status
      await this.redis.set('mls:sync:status', 'running', 'EX', 3600); // 1 hour expiry

      // Log sync start in database
      await this.db.query(`
        INSERT INTO mls_sync_logs (sync_id, status, started_at, options)
        VALUES ($1, 'running', NOW(), $2)
      `, [syncId, JSON.stringify(options)]);

      logger.info('Starting MLS sync', { syncId, options });

      // Start async sync process
      this.processSync(syncId, options).catch(error => {
        logger.error('MLS sync process error', {
          syncId,
          error: error.message,
          stack: error.stack
        });
      });

      return {
        success: true,
        syncId,
        status: 'started',
        message: 'MLS sync initiated successfully'
      };

    } catch (error) {
      logger.error('Error starting MLS sync', {
        options,
        error: error.message,
        stack: error.stack
      });

      // Clean up Redis status on error
      await this.redis.del('mls:sync:status');

      throw new Error(`Failed to start MLS sync: ${error.message}`);
    }
  }

  /**
   * Process the actual MLS sync (extracted from n8n workflow)
   * @param {string} syncId - Sync identifier
   * @param {Object} options - Sync options
   */
  async processSync(syncId, options = {}) {
    try {
      const {
        fullSync = false,
        validateData = true,
        skipDuplicates = false
      } = options;

      logger.info('Processing MLS sync', { syncId, options });

      // Simulate MLS data fetching (replace with actual MLS API calls)
      const mlsData = await this.fetchMLSData(fullSync);

      // Process and validate data
      const processedData = await this.processMLSData(mlsData, validateData);

      // Handle duplicates if not skipping
      if (!skipDuplicates) {
        await this.handleDuplicates(processedData);
      }

      // Update database
      const updateResult = await this.updateDatabase(processedData);

      // Mark sync as completed
      await this.completeSync(syncId, updateResult);

      logger.info('MLS sync completed successfully', {
        syncId,
        recordsProcessed: updateResult.recordsProcessed,
        recordsUpdated: updateResult.recordsUpdated,
        recordsCreated: updateResult.recordsCreated
      });

    } catch (error) {
      logger.error('MLS sync processing error', {
        syncId,
        error: error.message,
        stack: error.stack
      });

      // Mark sync as failed
      await this.failSync(syncId, error.message);
    }
  }

  /**
   * Fetch data from MLS (placeholder - replace with actual MLS API)
   * @param {boolean} fullSync - Whether to do full sync
   * @returns {Promise<Array>} MLS data
   */
  async fetchMLSData(fullSync = false) {
    logger.info('Fetching MLS data', { fullSync });

    try {
      const db = this.db.getDatabase();

      const baseQuery = `
        SELECT
          p.id,
          p.mls_number,
          p.mls_provider,
          p.address,
          p.details,
          p.price,
          p.status,
          p.property_type,
          p.description,
          p.public_remarks,
          p.marketing,
          p.updated_at,
          p.last_synced_at,
          p.mls_listing_date,
          COALESCE(
            (
              SELECT json_agg(json_build_object(
                'url', pm.url,
                'type', pm.media_type,
                'isPrimary', pm.is_primary,
                'title', pm.title,
                'description', pm.description
              ) ORDER BY pm.is_primary DESC, pm.sort_order ASC)
              FROM property_media pm
              WHERE pm.property_id = p.id
            ), '[]'::json
          ) AS photos
        FROM properties p
        WHERE p.mls_number IS NOT NULL
        ${fullSync ? '' : "AND p.updated_at >= NOW() - INTERVAL '6 hours'"}
        ORDER BY p.updated_at DESC
        LIMIT 1000
      `;

      const result = await db.query(baseQuery);

      const properties = result.rows.map((row) => {
        const address = row.address || {};
        const details = row.details || {};
        const marketing = row.marketing || {};

        const formatted = {
          mlsNumber: row.mls_number,
          mlsProvider: row.mls_provider || null,
          address: address.street || address.full || '',
          street: address.street || null,
          city: address.city || null,
          state: address.state || null,
          zipCode: address.zip_code || null,
          latitude: address.latitude || null,
          longitude: address.longitude || null,
          price: row.price ? Number(row.price) : 0,
          status: row.status || 'active',
          propertyType: row.property_type || 'unknown',
          bedrooms: details.bedrooms ?? null,
          bathrooms: details.bathrooms ?? null,
          halfBathrooms: details.half_bathrooms ?? null,
          squareFeet: details.square_feet ?? null,
          lotSize: details.lot_size ?? null,
          yearBuilt: details.year_built ?? null,
          description: row.description || row.public_remarks || '',
          listingAgent: marketing.listing_agent || marketing.agent || null,
          listingOffice: marketing.listing_office || null,
          photos: Array.isArray(row.photos) ? row.photos : [],
          lastUpdated: row.updated_at ? row.updated_at.toISOString() : null,
          lastSyncedAt: row.last_synced_at ? row.last_synced_at.toISOString() : null,
          listingDate: row.mls_listing_date ? row.mls_listing_date.toISOString() : null,
        };

        return formatted;
      });

      const lastUpdated = properties.reduce((latest, property) => {
        if (!property.lastUpdated) return latest;
        const timestamp = new Date(property.lastUpdated).getTime();
        return timestamp > latest ? timestamp : latest;
      }, 0);

      return {
        properties,
        lastSyncTimestamp: lastUpdated ? new Date(lastUpdated).toISOString() : null,
      };
    } catch (error) {
      logger.error('Failed to fetch MLS data from database', {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(`Failed to fetch MLS data: ${error.message}`);
    }
  }

  /**
   * Process and validate MLS data
   * @param {Object} mlsData - Raw MLS data
   * @param {boolean} validateData - Whether to validate
   * @returns {Promise<Array>} Processed data
   */
  async processMLSData(mlsData, validateData = true) {
    const processed = [];

    for (const property of mlsData.properties) {
      try {
        // Validate data if requested
        if (validateData) {
          this.validatePropertyData(property);
        }

        // Normalize property data
        const normalizedProperty = {
          mls_number: property.mlsNumber,
          address: property.address,
          city: property.city || 'Unknown',
          state: property.state || 'Unknown',
          zip_code: property.zipCode || property.zip || 'Unknown',
          price: property.price || 0,
          status: property.status || 'Active',
          property_type: property.propertyType || 'Unknown',
          bedrooms: property.bedrooms || 0,
          bathrooms: property.bathrooms || 0,
          square_feet: property.squareFeet || property.sqft || 0,
          lot_size: property.lotSize || 0,
          year_built: property.yearBuilt || null,
          description: property.description || property.remarks || '',
          listing_agent: property.listingAgent || null,
          listing_office: property.listingOffice || null,
          photos: property.photos || [],
          last_updated: property.lastUpdated || new Date().toISOString(),
          source: 'MLS'
        };

        processed.push(normalizedProperty);

      } catch (error) {
        logger.warn('Error processing property', {
          mlsNumber: property.mlsNumber,
          error: error.message
        });
      }
    }

    return processed;
  }

  /**
   * Handle duplicate MLS entries
   * @param {Array} properties - Processed properties
   */
  async handleDuplicates(properties) {
    for (const property of properties) {
      // Check for existing property by MLS number
      const existing = await this.db.query(
        'SELECT property_id FROM properties WHERE mls_number = $1',
        [property.mls_number]
      );

      if (existing.rows.length > 0) {
        // Update existing property
        property.existing_id = existing.rows[0].property_id;
        property.is_update = true;
      } else {
        property.is_new = true;
      }
    }
  }

  /**
   * Update database with processed MLS data
   * @param {Array} properties - Processed properties
   * @returns {Promise<Object>} Update results
   */
  async updateDatabase(properties) {
    let created = 0;
    let updated = 0;

    for (const property of properties) {
      try {
        if (property.is_update) {
          // Update existing property
          await this.db.query(`
            UPDATE properties SET
              address = $2, city = $3, state = $4, zip_code = $5,
              price = $6, status = $7, property_type = $8,
              bedrooms = $9, bathrooms = $10, square_feet = $11,
              lot_size = $12, year_built = $13, description = $14,
              listing_agent = $15, listing_office = $16, photos = $17,
              last_updated = $18, updated_at = NOW()
            WHERE property_id = $1
          `, [
            property.existing_id,
            property.address, property.city, property.state, property.zip_code,
            property.price, property.status, property.property_type,
            property.bedrooms, property.bathrooms, property.square_feet,
            property.lot_size, property.year_built, property.description,
            property.listing_agent, property.listing_office, JSON.stringify(property.photos),
            property.last_updated
          ]);
          updated++;

        } else {
          // Insert new property
          await this.db.query(`
            INSERT INTO properties (
              mls_number, address, city, state, zip_code, price, status,
              property_type, bedrooms, bathrooms, square_feet, lot_size,
              year_built, description, listing_agent, listing_office,
              photos, last_updated, source, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
          `, [
            property.mls_number, property.address, property.city, property.state, property.zip_code,
            property.price, property.status, property.property_type,
            property.bedrooms, property.bathrooms, property.square_feet,
            property.lot_size, property.year_built, property.description,
            property.listing_agent, property.listing_office, JSON.stringify(property.photos),
            property.last_updated, property.source
          ]);
          created++;
        }

      } catch (error) {
        logger.error('Error updating property in database', {
          mlsNumber: property.mls_number,
          error: error.message
        });
      }
    }

    return {
      recordsProcessed: properties.length,
      recordsCreated: created,
      recordsUpdated: updated
    };
  }

  /**
   * Validate property data
   * @param {Object} property - Property data to validate
   */
  validatePropertyData(property) {
    if (!property.mlsNumber) {
      throw new Error('MLS number is required');
    }

    if (!property.address) {
      throw new Error('Address is required');
    }

    if (property.price !== undefined && (isNaN(property.price) || property.price < 0)) {
      throw new Error('Invalid price');
    }

    const validStatuses = ['Active', 'Pending', 'Sold', 'Off Market'];
    if (property.status && !validStatuses.includes(property.status)) {
      throw new Error('Invalid property status');
    }
  }

  /**
   * Mark sync as completed
   * @param {string} syncId - Sync identifier
   * @param {Object} results - Sync results
   */
  async completeSync(syncId, results) {
    try {
      // Update database log
      await this.db.query(`
        UPDATE mls_sync_logs
        SET status = 'completed', completed_at = NOW(), results = $2
        WHERE sync_id = $1
      `, [syncId, JSON.stringify(results)]);

      // Clear Redis status
      await this.redis.del('mls:sync:status');

      // Update last sync timestamp
      await this.redis.set('mls:last_sync', new Date().toISOString());

      this.isRunning = false;
      this.currentSyncId = null;

      logger.info('MLS sync marked as completed', { syncId, results });

    } catch (error) {
      logger.error('Error completing MLS sync', {
        syncId,
        error: error.message
      });
    }
  }

  /**
   * Mark sync as failed
   * @param {string} syncId - Sync identifier
   * @param {string} errorMessage - Error message
   */
  async failSync(syncId, errorMessage) {
    try {
      // Update database log
      await this.db.query(`
        UPDATE mls_sync_logs
        SET status = 'failed', completed_at = NOW(), error_message = $2
        WHERE sync_id = $1
      `, [syncId, errorMessage]);

      // Clear Redis status
      await this.redis.del('mls:sync:status');

      this.isRunning = false;
      this.currentSyncId = null;

      logger.error('MLS sync marked as failed', { syncId, errorMessage });

    } catch (error) {
      logger.error('Error marking MLS sync as failed', {
        syncId,
        error: error.message
      });
    }
  }

  /**
   * Get sync status and progress
   * @param {string} syncId - Optional specific sync ID
   * @returns {Promise<Object>} Sync status
   */
  async getSyncStatus(syncId = null) {
    try {
      const status = await this.redis.get('mls:sync:status') || 'idle';
      const lastSync = await this.redis.get('mls:last_sync');

      let currentSync = null;
      if (syncId || this.currentSyncId) {
        const syncQuery = await this.db.query(`
          SELECT sync_id, status, started_at, completed_at, results, error_message
          FROM mls_sync_logs
          WHERE sync_id = $1
          ORDER BY started_at DESC
          LIMIT 1
        `, [syncId || this.currentSyncId]);

        if (syncQuery.rows.length > 0) {
          currentSync = syncQuery.rows[0];
        }
      }

      return {
        status,
        lastSync,
        currentSync,
        isRunning: this.isRunning
      };

    } catch (error) {
      logger.error('Error getting MLS sync status', {
        syncId,
        error: error.message
      });
      throw new Error(`Failed to get sync status: ${error.message}`);
    }
  }

  /**
   * Get sync errors
   * @returns {Promise<Array>} Recent sync errors
   */
  async getSyncErrors() {
    try {
      const errorsQuery = await this.db.query(`
        SELECT sync_id, error_message, started_at
        FROM mls_sync_logs
        WHERE status = 'failed'
        AND started_at > NOW() - INTERVAL '24 hours'
        ORDER BY started_at DESC
        LIMIT 10
      `);

      return errorsQuery.rows;

    } catch (error) {
      logger.error('Error getting MLS sync errors', {
        error: error.message
      });
      throw new Error(`Failed to get sync errors: ${error.message}`);
    }
  }

  /**
   * Get sync progress for a specific sync ID
   * @param {string} syncId - Sync identifier
   * @returns {Promise<Object>} Sync progress
   */
  async getSyncProgress(syncId) {
    try {
      const progressQuery = await this.db.query(`
        SELECT sync_id, status, started_at, completed_at, results, error_message
        FROM mls_sync_logs
        WHERE sync_id = $1
      `, [syncId]);

      if (progressQuery.rows.length === 0) {
        return {
          success: false,
          error: 'Sync not found',
          statusCode: 404
        };
      }

      const sync = progressQuery.rows[0];

      // Calculate progress based on status and time
      let progress = 0;
      if (sync.status === 'completed') {
        progress = 100;
      } else if (sync.status === 'running') {
        // Estimate progress based on time elapsed (simple estimation)
        const startedAt = new Date(sync.started_at);
        const now = new Date();
        const elapsedMinutes = (now - startedAt) / (1000 * 60);

        // Assume sync takes about 30 minutes max
        progress = Math.min(95, Math.max(5, (elapsedMinutes / 30) * 100));
      }

      return {
        success: true,
        data: {
          syncId: sync.sync_id,
          status: sync.status,
          progress: Math.round(progress),
          startedAt: sync.started_at,
          completedAt: sync.completed_at,
          results: sync.results,
          error: sync.error_message,
          recordsProcessed: sync.results?.recordsProcessed || 0,
          recordsUpdated: sync.results?.recordsUpdated || 0,
          recordsCreated: sync.results?.recordsCreated || 0
        }
      };

    } catch (error) {
      logger.error('Error getting MLS sync progress', {
        syncId,
        error: error.message
      });
      return {
        success: false,
        error: 'Failed to get sync progress',
        statusCode: 500
      };
    }
  }
}

module.exports = new MLSSyncService();
