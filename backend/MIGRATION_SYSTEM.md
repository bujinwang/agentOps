
# Database Migration System Documentation

## Overview

The Real Estate CRM now includes a comprehensive database migration system that provides version control for database schema changes, automated deployment, and management capabilities.

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

## Features

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

## Usage

### Command Line Interface

```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# Rollback last migration
npm run migrate:rollback

# Create new migration
npm run migrate:create "add lead assignment tracking"

# Validate migration integrity
npm run migrate:validate
```

### API Endpoints

```javascript
// Get migration status
GET /api/migrations/status

// Run pending migrations
POST /api/migrations/migrate

// Rollback last migration
POST /api/migrations/rollback

// Validate migration integrity
GET /api/migrations/validate

// Get current schema version
GET /api/migrations/version

// Create new migration (development)
POST /api/migrations/create
```

## Migration File Format

Migration files are stored in `backend/src/migrations/versions/` with the naming convention:
`YYYYMMDD_HHMMSS_description.sql`

### Template Structure
```sql
-- Description: Brief description of changes
-- Created: 2024-09-06T19:45:00.000Z

-- Up Migration
-- Add your schema changes here

-- Down Migration  
-- Add rollback logic here (optional)
```

### Example Migration
```sql
-- Description: Add lead assignment tracking
-- Created: 2024-09-06T19:45:00.000Z

-- Up Migration
ALTER TABLE leads ADD COLUMN assigned_by INTEGER REFERENCES users(user_id);
CREATE INDEX idx_leads_assigned_by ON leads(assigned_by);

-- Down Migration  
ALTER TABLE leads DROP COLUMN assigned_by;
DROP INDEX IF EXISTS idx_leads_assigned_by;
```

## Integration

### Server Startup
The migration system automatically runs pending migrations on server startup:
```javascript
// In server.js
await migrationManager.initialize();
```

### Database Connection
Integrated with existing PostgreSQL connection pool for optimal performance.

## Best Practices

### 1. Migration Creation
- Use descriptive names for migration files
- Keep migrations atomic and focused
- Always include both up and down migrations
- Test migrations in development before production

### 2. Migration Execution
- Monitor migration logs during deployment
- Validate migrations before production deployment
- Use transactions for complex schema changes
- Plan for rollback scenarios

### 3. Production Deployment
- Always backup database before migrations
- Test migrations on staging environment first
- Monitor application performance post-migration
- Have rollback plan ready

## Error Handling

### Common Issues
1. **Checksum Mismatch**: Migration file has been modified after execution
2. **Transaction Failure**: Migration failed and was rolled back
3. **Permission Errors**: Insufficient database permissions
4. **Connection Issues**: Database connectivity problems

### Resolution Steps
1. Check migration logs for detailed error information
2. Validate migration integrity using CLI or API
3. Review migration file syntax and logic
4. Ensure proper database permissions
5. Test rollback procedures

## Security Considerations

### Access Control
- Migration API endpoints require authentication
- Consider implementing role-based access for production
- Monitor migration execution logs
- Validate migration checksums regularly

### Data Safety
- All migrations run in transactions
- Automatic rollback on failure
- Checksum validation prevents corruption
- Comprehensive audit trail

## Monitoring

### Logs
Migration operations are logged with:
- Migration version and description
- Execution time and status
- Error details and stack traces
- Checksum validation results

### Metrics
- Migration execution count
- Success/failure rates
- Execution duration
- Pending migration count

## Troubleshooting

### Migration Failed
1. Check server logs for error details
2. Verify database connectivity
3