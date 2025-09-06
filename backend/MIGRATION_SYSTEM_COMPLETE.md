
# Database Migration System - Complete Documentation

## Overview

The Real Estate CRM now includes a comprehensive database migration system that provides version control for database schema changes, automated deployment, and management capabilities. This system ensures safe, reliable schema evolution in production environments.

## Architecture

```
backend/src/migrations/
├── migrationRunner.js     # Core migration engine with transaction support
├── index.js              # Migration manager interface
├── cli.js                # Command-line interface
├── versions/             # Migration files directory
│   └── 20240906_194500_initial_schema.sql
└── routes/migrations.js  # RESTful API endpoints
```

## Features Implemented

### 🔧 Core Capabilities
- **Transaction Safety**: All migrations run in database transactions
- **Checksum Validation**: Ensures migration integrity
- **Version Tracking**: Complete migration history
- **Rollback Support**: Ability to undo migrations
- **Concurrent Safety**: Safe for multiple server instances
- **Automated Execution**: Runs on server startup

### 📊 Management Interface
- **CLI Tools**: Command-line migration management
- **REST API**: HTTP endpoints for runtime management
- **Status Monitoring**: Real-time migration status
- **Validation**: Integrity checking capabilities

## Complete Implementation Summary

### 1. Migration Framework Components

#### **MigrationRunner** (`migrationRunner.js`)
- Core migration execution engine
- Transaction-based migration execution
- Checksum validation system
- Rollback functionality
- Comprehensive error handling

#### **MigrationManager** (`index.js`)
- High-level management interface
- Integration with application startup
- Status monitoring and reporting
- Administrative operations

#### **CLI Tool** (`cli.js`)
- Command-line interface for migration operations
- Interactive migration management
- Status reporting and validation
- Migration creation utilities

#### **API Routes** (`routes/migrations.js`)
- RESTful HTTP endpoints for migration management
- Authentication-protected operations
- Real-time status and validation
- Administrative capabilities

### 2. Database Schema Management

#### **Schema Migrations Table**
```sql
CREATE TABLE schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    description TEXT,
    executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER,
    checksum VARCHAR(64)
);
```

#### **Initial Migration** (`20240906_194500_initial_schema.sql`)
- Complete database schema creation
- All tables: users, leads, interactions, notifications, tasks
- Performance indexes on critical fields
- Foreign key relationships

### 3. Integration Points

#### **Server Integration**
```javascript
// In server.js - Automatic execution on startup
await migrationManager.initialize();
```

#### **Package.json Scripts**
```json
{
  "migrate": "node src/migrations/cli.js migrate",
  "migrate:status": "node src/migrations/cli.js status",
  "migrate:rollback": "node src/migrations/cli.js rollback",
  "migrate:create": "node src/migrations/cli.js create",
  "migrate:validate": "node src/migrations/cli.js validate"
}
```

## Usage Guide

### Command Line Operations

```bash
# Create a new migration
npm run migrate:create "add lead assignment tracking"

# Check current status
npm run migrate:status

# Run pending migrations
npm run migrate

# Validate migration integrity
npm run migrate:validate

# Rollback last migration (use with caution)
npm run migrate:rollback
```

### API Operations

```javascript
// Get migration status
GET /api/migrations/status
Authorization: Bearer <token>

// Run pending migrations
POST /api/migrations/migrate
Authorization: Bearer <token>

// Validate migration integrity
GET /api/migrations/validate
Authorization: Bearer <token>

// Get current schema version
GET /api/migrations/version
Authorization: Bearer <token>
```

## Migration File Format

### Naming Convention
`YYYYMMDD_HHMMSS_description.sql`

### Template Structure
```sql
-- Description: Brief description of changes
-- Created: 2024-09-07T10:00:00.000Z

-- Up Migration
-- Add your schema changes here

-- Down Migration  
-- Add rollback logic here (optional)
```

### Example Migration
```sql
-- Description: Add lead assignment tracking
-- Created: 2024-09-07T10:00:00.000Z

-- Up Migration
ALTER TABLE leads ADD COLUMN assigned_by INTEGER REFERENCES users(user_id);
CREATE INDEX idx_leads_assigned_by ON leads(assigned_by);

-- Down Migration
DROP INDEX IF EXISTS idx_leads_assigned_by;
ALTER TABLE leads DROP COLUMN assigned_by;
```

## Best Practices

### 1. Migration Creation
- Use descriptive names for migration files
- Keep migrations atomic and focused
- Always include both up and down migrations
- Test migrations in development before production