/**
 * Database Migration Management
 * Integrates migration system with application startup
 */

const MigrationRunner = require('./migrationRunner');
const { logger } = require('../config/logger');

class MigrationManager {
  constructor() {
    this.runner = new MigrationRunner();
    this.isInitialized = false;
  }

  /**
   * Initialize migration system and run pending migrations
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing database migration system...');
      
      // Initialize migration system
      await this.runner.initialize();
      
      // Validate existing migrations
      const validationIssues = await this.runner.validateMigrations();
      if (validationIssues.length > 0) {
        logger.error('Migration integrity issues found:', validationIssues);
        throw new Error('Migration validation failed');
      }
      
      // Run pending migrations
      const results = await this.runner.migrate();
      
      if (results.length > 0) {
        logger.info(`Executed ${results.length} migrations successfully`);
      } else {
        logger.info('Database is up to date');
      }
      
      // Get current version
      const currentVersion = await this.runner.getCurrentVersion();
      logger.info(`Database schema version: ${currentVersion || 'initial'}`);
      
      this.isInitialized = true;
      logger.info('Migration system initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize migration system:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async getStatus() {
    try {
      const executed = await this.runner.getExecutedMigrations();
      const available = this.runner.getAvailableMigrations();
      const currentVersion = await this.runner.getCurrentVersion();
      
      return {
        currentVersion,
        executedCount: executed.length,
        availableCount: available.length,
        pendingCount: available.length - executed.length,
        executed: executed.map(m => ({
          version: m.version,
          description: m.description,
          executedAt: m.executed_at
        })),
        pending: available
          .filter(m => !executed.find(e => e.version === m.version))
          .map(m => ({
            version: m.version,
            description: m.description
          }))
      };
    } catch (error) {
      logger.error('Failed to get migration status:', error);
      throw error;
    }
  }

  /**
   * Run migrations manually (for admin operations)
   */
  async runMigrations() {
    try {
      logger.info('Running migrations manually...');
      const results = await this.runner.migrate();
      logger.info(`Executed ${results.length} migrations`);
      return results;
    } catch (error) {
      logger.error('Migration execution failed:', error);
      throw error;
    }
  }

  /**
   * Rollback last migration (for admin operations)
   */
  async rollback() {
    try {
      logger.warn('Rolling back last migration...');
      const rolledBack = await this.runner.rollback();
      if (rolledBack) {
        logger.info(`Rolled back migration: ${rolledBack.version}`);
      } else {
        logger.info('No migrations to rollback');
      }
      return rolledBack;
    } catch (error) {
      logger.error('Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Create a new migration (for development)
   */
  async createMigration(name) {
    try {
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
      const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
      const filepath = path.join(__dirname, 'versions', filename);
      
      const template = `-- Description: ${name}
-- Created: ${new Date().toISOString()}

-- Up Migration
-- Add your up migration here

-- Down Migration  
-- Add your down migration here (optional)
`;
      
      fs.writeFileSync(filepath, template);
      logger.info(`Created migration: ${filename}`);
      return { filename, filepath };
    } catch (error) {
      logger.error('Failed to create migration:', error);
      throw error;
    }
  }
}

// Export singleton instance
const migrationManager = new MigrationManager();

module.exports = migrationManager;