
/**
 * Database Migration System
 * Handles schema versioning and automated migrations
 */

const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../config/database');
const { logger } = require('../config/logger');

class MigrationRunner {
  constructor() {
    this.migrationsTable = 'schema_migrations';
    this.migrationsDir = path.join(__dirname, 'versions');
  }

  /**
   * Initialize migration system by creating migrations table
   */
  async initialize() {
    const db = getDatabase();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        version VARCHAR(255) PRIMARY KEY,
        description TEXT,
        executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER,
        checksum VARCHAR(64)
      );
    `;
    
    await db.query(createTableQuery);
    logger.info('Migration system initialized');
  }

  /**
   * Get list of executed migrations
   */
  async getExecutedMigrations() {
    const db = getDatabase();
    const query = `SELECT version, description, executed_at FROM ${this.migrationsTable} ORDER BY executed_at`;
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Check if a migration has been executed
   */
  async isMigrationExecuted(version) {
    const db = getDatabase();
    const query = `SELECT COUNT(*) as count FROM ${this.migrationsTable} WHERE version = $1`;
    const result = await db.query(query, [version]);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Record a completed migration
   */
  async recordMigration(version, description, executionTime, checksum) {
    const db = getDatabase();
    const query = `
      INSERT INTO ${this.migrationsTable} (version, description, execution_time_ms, checksum)
      VALUES ($1, $2, $3, $4)
    `;
    await db.query(query, [version, description, executionTime, checksum]);
  }

  /**
   * Get list of available migration files
   */
  getAvailableMigrations() {
    if (!fs.existsSync(this.migrationsDir)) {
      fs.mkdirSync(this.migrationsDir, { recursive: true });
      return [];
    }

    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return files.map(filename => {
      const version = filename.replace('.sql', '');
      const filepath = path.join(this.migrationsDir, filename);
      const content = fs.readFileSync(filepath, 'utf8');
      
      // Extract description from SQL comments
      const descriptionMatch = content.match(/--\s*Description:\s*(.+)/i);
      const description = descriptionMatch ? descriptionMatch[1].trim() : 'No description';
      
      // Calculate checksum
      const crypto = require('crypto');
      const checksum = crypto.createHash('sha256').update(content).digest('hex');
      
      return {
        version,
        filename,
        filepath,
        description,
        checksum,
        content
      };
    });
  }

  /**
   * Execute a single migration
   */
  async executeMigration(migration) {
    const startTime = Date.now();
    const db = getDatabase();
    
    logger.info(`Executing migration: ${migration.version} - ${migration.description}`);
    
    try {
      // Start transaction
      await db.query('BEGIN');
      
      // Execute migration SQL
      await db.query(migration.content);
      
      // Record migration
      const executionTime = Date.now() - startTime;
      await this.recordMigration(
        migration.version,
        migration.description,
        executionTime,
        migration.checksum
      );
      
      // Commit transaction
      await db.query('COMMIT');
      
      logger.info(`Migration ${migration.version} completed in ${executionTime}ms`);
      return true;
    } catch (error) {
      // Rollback on error
      await db.query('ROLLBACK');
      logger.error(`Migration ${migration.version} failed:`, error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async migrate() {
    logger.info('Starting migration process...');
    
    await this.initialize();
    
    const executedMigrations = await this.getExecutedMigrations();
    const executedVersions = new Set(executedMigrations.map(m => m.version));
    const availableMigrations = this.getAvailableMigrations();
    
    const pendingMigrations = availableMigrations.filter(m => 
      !executedVersions.has(m.version)
    );
    
    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations found');
      return [];
    }

    logger.info(`Found ${pendingMigrations.length} pending migrations`);

    const results = [];
    for (const migration of pendingMigrations) {
      const success = await this.executeMigration(migration);
      results.push({ version: migration.version, success });
    }

    logger.info('Migration process completed');
    return results;
  }

  /**
   * Rollback the last migration
   */
  async rollback() {
    logger.info('Starting rollback process...');
    
    const executedMigrations = await this.getExecutedMigrations();
    if (executedMigrations.length === 0) {
      logger.info('No migrations to rollback');
      return null;
    }

    const lastMigration = executedMigrations[executedMigrations.length - 1];
    logger.warn(`Rolling back migration: ${lastMigration.version}`);

    // Note: Rollback functionality would require storing down migrations
    // For now, we'll just remove the migration record
    const db = getDatabase();
    const query = `DELETE FROM ${this.migrationsTable} WHERE version = $1`;
    await db.query(query, [lastMigration.version]);

    logger.info(`Migration ${lastMigration.version} rolled back`);
    return lastMigration;
  }

  /**
   * Get current schema version
   */
  async getCurrentVersion() {
    const executedMigrations = await this.getExecutedMigrations();
    return executedMigrations.length > 0
      ? executedMigrations[executedMigrations.length - 1].version
      : null;
  }

  /**
   * Validate migration integrity by checking checksums
   */
  async validateMigrations() {
    const db = getDatabase();
    const query = `SELECT version, checksum FROM ${this.migrationsTable}`;
    const result = await db.query(query);
    
    const executedMigrations = result.rows;
    const availableMigrations = this.getAvailableMigrations();
    
    const issues = [];
    
    for (const executed of executedMigrations) {
      const available = availableMigrations.find(m => m.version === executed.version);
      if (available && available.checksum !== executed.checksum) {
        issues.push({
          version: executed.version,
          issue: 'Checksum mismatch - migration file has been modified',
          expectedChecksum: executed.checksum,
          actualChecksum: available.checksum
        });
      }
    }
    
    return issues;
  }
}

module.exports = MigrationRunner;