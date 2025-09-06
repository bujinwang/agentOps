
/**
 * Database Migration CLI Tool
 * Usage: node cli.js [command] [options]
 */

const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const MigrationRunner = require('./migrationRunner');
const { logger } = require('../config/logger');
const { connectDatabase } = require('../config/database');

const runner = new MigrationRunner();

// Initialize database connection
async function initializeDatabase() {
  try {
    await connectDatabase();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

program
  .name('migration-cli')
  .description('Database migration management tool')
  .version('1.0.0');

program
  .command('migrate')
  .description('Run all pending migrations')
  .action(async () => {
    try {
      await initializeDatabase();
      const results = await runner.migrate();
      if (results.length > 0) {
        console.log(`✅ Successfully executed ${results.length} migrations`);
        results.forEach(result => {
          console.log(`  - ${result.version}: ${result.success ? '✅' : '❌'}`);
        });
      } else {
        console.log('✅ No pending migrations');
      }
      process.exit(0);
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('rollback')
  .description('Rollback the last migration')
  .action(async () => {
    try {
      await initializeDatabase();
      const rolledBack = await runner.rollback();
      if (rolledBack) {
        console.log(`✅ Rolled back migration: ${rolledBack.version}`);
      } else {
        console.log('ℹ️  No migrations to rollback');
      }
      process.exit(0);
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show migration status')
  .action(async () => {
    try {
      await initializeDatabase();
      const executed = await runner.getExecutedMigrations();
      const available = runner.getAvailableMigrations();
      const currentVersion = await runner.getCurrentVersion();
      
      console.log('\n📊 Migration Status');
      console.log('===================');
      console.log(`Current Version: ${currentVersion || 'None'}`);
      console.log(`Executed: ${executed.length}`);
      console.log(`Available: ${available.length}`);
      console.log(`Pending: ${available.length - executed.length}`);
      
      if (available.length > 0) {
        console.log('\n📋 Available Migrations:');
        available.forEach(migration => {
          const isExecuted = executed.some(e => e.version === migration.version);
          console.log(`  ${isExecuted ? '✅' : '⏳'} ${migration.version} - ${migration.description}`);
        });
      }
      
      process.exit(0);
    } catch (error) {
      console.error('❌ Status check failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('create <name>')
  .description('Create a new migration file')
  .action((name) => {
    try {
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
      const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
      const filepath = path.join(__dirname, 'versions', filename);
      
      const template = `-- Migration: ${name}
-- Created at: ${new Date().toISOString()}

-- Up Migration
-- Add your up migration here

-- Down Migration  
-- Add your down migration here
`;
      
      fs.writeFileSync(filepath, template);
      console.log(`✅ Created migration: ${filename}`);
      console.log(`📁 Location: ${filepath}`);
      process.exit(0);
    } catch (error) {
      console.error('❌ Failed to create migration:', error.message);
      process.exit(1);
    }
  });

program
  .command('reset')
  .description('Reset database by rolling back all migrations')
  .option('-f, --force', 'Force reset without confirmation')
  .action(async (options) => {
    try {
      await initializeDatabase();
      
      if (!options.force) {
        console.log('⚠️  WARNING: This will rollback ALL migrations!');
        console.log('Use --force flag to skip this confirmation.');
        process.exit(1);
      }
      
      // Rollback all migrations
      let rolledBackCount = 0;
      let lastMigration;
      do {
        lastMigration = await runner.rollback();
        if (lastMigration) {
          rolledBackCount++;
        }
      } while (lastMigration);
      
      console.log(`✅ Rolled back ${rolledBackCount} migrations`);
      process.exit(0);
    } catch (error) {
      console.error('❌ Reset failed:', error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();