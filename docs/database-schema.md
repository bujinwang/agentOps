# 🗄️ Real Estate CRM Database Schema

## Overview

This document provides the complete database schema for the Real Estate CRM system, featuring advanced ML capabilities, comprehensive audit trails, and enterprise-grade data management.

## Schema Version
- **Version**: 2.0.0
- **Generated**: January 15, 2025
- **Database**: PostgreSQL 13+
- **Character Set**: UTF-8

## Database Architecture

### Core Design Principles
- **ACID Compliance**: Full transactional integrity
- **Normalized Structure**: Optimized for complex queries and relationships
- **Indexing Strategy**: Composite indexes for performance
- **Partitioning**: Time-based partitioning for large tables
- **Audit Trails**: Complete data change tracking
- **ML Integration**: Specialized tables for machine learning operations

---

## 📊 Core CRM Tables

### users
**Purpose**: User authentication and profile management
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'agent',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_active (is_active),
    INDEX idx_users_created_at (created_at)
);
```

**Relationships**:
- One-to-many with `leads`
- One-to-many with `audit_log`
- Referenced by workflow and notification tables

### leads
**Purpose**: Lead information and lifecycle management
```sql
CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    budget DECIMAL(12,2),
    timeline VARCHAR(100),
    property_type VARCHAR(100),
    location TEXT,
    status VARCHAR(50) DEFAULT 'new',
    score DECIMAL(5,2),
    conversion_probability DECIMAL(5,2),
    engagement_score DECIMAL(5,2),
    source VARCHAR(100),
    campaign VARCHAR(255),
    tags TEXT[],
    custom_fields JSONB,
    last_activity_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_leads_user_id (user_id),
    INDEX idx_leads_email (email),
    INDEX idx_leads_status (status),
    INDEX idx_leads_score (score),
    INDEX idx_leads_source (source),
    INDEX idx_leads_created_at (created_at),
    INDEX idx_leads_tags (tags),
    INDEX idx_leads_budget (budget),
    INDEX idx_leads_conversion_prob (conversion_probability),
    INDEX idx_leads_engagement_score (engagement_score)
);
```

**Relationships**:
- Many-to-one with `users`
- One-to-many with `lead_scores`
- One-to-many with `conversion_events`
- Referenced by workflow executions and notifications

---

## 🤖 ML-Specific Tables

### ml_models
**Purpose**: ML model registry and metadata
```sql
CREATE TABLE ml_models (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- scoring, classification, regression
    algorithm VARCHAR(100) NOT NULL,
    framework VARCHAR(100) NOT NULL,
    accuracy DECIMAL(5,4),
    precision DECIMAL(5,4),
    recall DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    auc DECIMAL(5,4),
    status VARCHAR(50) DEFAULT 'training', -- active, training, retired, failed
    version VARCHAR(50) NOT NULL,
    hyperparameters JSONB,
    feature_importance JSONB,
    training_metrics JSONB,
    model_data JSONB, -- Serialized model or reference
    model_size_bytes INTEGER,
    training_samples INTEGER,
    validation_samples INTEGER,
    test_samples INTEGER,
    training_duration_seconds INTEGER,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_trained TIMESTAMP,
    deployed_at TIMESTAMP,
    retired_at TIMESTAMP,

    -- Indexes
    INDEX idx_ml_models_model_id (model_id),
    INDEX idx_ml_models_type (type),
    INDEX idx_ml_models_status (status),
    INDEX idx_ml_models_accuracy (accuracy),
    INDEX idx_ml_models_created_at (created_at)
);
```

### ml_features
**Purpose**: Feature engineering metadata and statistics
```sql
CREATE TABLE ml_features (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    type VARCHAR(50) NOT NULL, -- numeric, categorical, text, datetime
    description TEXT,
    importance DECIMAL(5,4),
    statistics JSONB, -- mean, std, min, max, distribution
    categories TEXT[], -- For categorical features
    missing_rate DECIMAL(5,4),
    correlation_matrix JSONB,
    feature_engineering JSONB, -- preprocessing steps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_ml_features_name (name),
    INDEX idx_ml_features_type (type),
    INDEX idx_ml_features_importance (importance)
);
```

### lead_scores
**Purpose**: ML scoring history and predictions
```sql
CREATE TABLE lead_scores (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    model_id INTEGER REFERENCES ml_models(id),
    score DECIMAL(5,2) NOT NULL,
    confidence DECIMAL(5,2),
    probability DECIMAL(5,2),
    features JSONB, -- Feature values used for scoring
    feature_importance JSONB, -- Per-prediction feature importance
    prediction_time_ms INTEGER,
    model_version VARCHAR(50),
    scored_by VARCHAR(100), -- API, batch, manual
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_lead_scores_lead_id (lead_id),
    INDEX idx_lead_scores_model_id (model_id),
    INDEX idx_lead_scores_score (score),
    INDEX idx_lead_scores_created_at (created_at),
    INDEX idx_lead_scores_lead_model (lead_id, model_id)
);
```

### ml_model_performance
**Purpose**: Real-time model performance tracking
```sql
CREATE TABLE ml_model_performance (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES ml_models(id),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    batch_size INTEGER,
    processing_time_ms INTEGER,

    -- Indexes
    INDEX idx_ml_perf_model_id (model_id),
    INDEX idx_ml_perf_metric (metric_name),
    INDEX idx_ml_perf_recorded_at (recorded_at),
    INDEX idx_ml_perf_model_metric (model_id, metric_name)
);
```

---

## 🔄 Workflow & Automation Tables

### workflow_templates
**Purpose**: Automated workflow templates
```sql
CREATE TABLE workflow_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    trigger_type VARCHAR(100) NOT NULL,
    trigger_conditions JSONB,
    steps JSONB, -- Workflow step definitions
    settings JSONB, -- max_executions, time_window, etc.
    is_active BOOLEAN DEFAULT true,
    version VARCHAR(50) DEFAULT '1.0.0',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_workflow_templates_category (category),
    INDEX idx_workflow_templates_active (is_active),
    INDEX idx_workflow_templates_trigger (trigger_type)
);
```

### workflow_executions
**Purpose**: Workflow execution tracking
```sql
CREATE TABLE workflow_executions (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES workflow_templates(id),
    lead_id INTEGER REFERENCES leads(id),
    execution_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER,
    progress DECIMAL(5,2),
    execution_data JSONB,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_workflow_executions_template (template_id),
    INDEX idx_workflow_executions_lead (lead_id),
    INDEX idx_workflow_executions_status (status),
    INDEX idx_workflow_executions_started (started_at),
    INDEX idx_workflow_executions_execution_id (execution_id)
);
```

### notification_queue
**Purpose**: Automated notification management
```sql
CREATE TABLE notification_queue (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    notification_type VARCHAR(50) NOT NULL,
    channel VARCHAR(50) NOT NULL, -- email, sms, push
    priority VARCHAR(20) DEFAULT 'normal',
    content JSONB,
    template_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_notifications_lead (lead_id),
    INDEX idx_notifications_type (notification_type),
    INDEX idx_notifications_channel (channel),
    INDEX idx_notifications_status (status),
    INDEX idx_notifications_scheduled (scheduled_at),
    INDEX idx_notifications_created (created_at)
);
```

---

## 📊 Analytics & Reporting Tables

### conversion_events
**Purpose**: Lead conversion funnel tracking
```sql
CREATE TABLE conversion_events (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    from_stage VARCHAR(100),
    to_stage VARCHAR(100),
    conversion_probability DECIMAL(5,2),
    trigger_type VARCHAR(50),
    trigger_details JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_conversion_events_lead (lead_id),
    INDEX idx_conversion_events_from_stage (from_stage),
    INDEX idx_conversion_events_to_stage (to_stage),
    INDEX idx_conversion_events_created (created_at),
    INDEX idx_conversion_events_trigger (trigger_type)
);
```

### dashboard_metrics
**Purpose**: Cached dashboard metrics for performance
```sql
CREATE TABLE dashboard_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(255) UNIQUE NOT NULL,
    metric_value JSONB,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cache_ttl INTEGER DEFAULT 300,
    source VARCHAR(100),

    -- Indexes
    INDEX idx_dashboard_metrics_name (metric_name),
    INDEX idx_dashboard_metrics_updated (last_updated),
    INDEX idx_dashboard_metrics_source (source)
);
```

### interactions
**Purpose**: Lead interaction tracking
```sql
CREATE TABLE interactions (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(50) NOT NULL, -- call, email, meeting, note
    direction VARCHAR(20), -- inbound, outbound
    status VARCHAR(50), -- completed, scheduled, cancelled
    subject VARCHAR(255),
    content TEXT,
    duration INTEGER, -- seconds for calls
    outcome VARCHAR(100),
    sentiment VARCHAR(20), -- positive, neutral, negative
    metadata JSONB,
    scheduled_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_interactions_lead (lead_id),
    INDEX idx_interactions_user (user_id),
    INDEX idx_interactions_type (type),
    INDEX idx_interactions_status (status),
    INDEX idx_interactions_created (created_at),
    INDEX idx_interactions_scheduled (scheduled_at),
    INDEX idx_interactions_completed (completed_at)
);
```

---

## 🔐 Security & Audit Tables

### audit_log
**Purpose**: Complete audit trail for compliance
```sql
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    location JSONB, -- Geolocation data
    risk_score DECIMAL(5,2),
    anomaly_detected BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_audit_log_user (user_id),
    INDEX idx_audit_log_action (action),
    INDEX idx_audit_log_resource (resource_type, resource_id),
    INDEX idx_audit_log_created (created_at),
    INDEX idx_audit_log_ip (ip_address),
    INDEX idx_audit_log_risk (risk_score),
    INDEX idx_audit_log_anomaly (anomaly_detected)
);
```

### user_sessions
**Purpose**: Session management and security tracking
```sql
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    location JSONB,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_token (session_token),
    INDEX idx_sessions_refresh (refresh_token),
    INDEX idx_sessions_active (is_active),
    INDEX idx_sessions_expires (expires_at),
    INDEX idx_sessions_last_activity (last_activity_at)
);
```

---

## 🏠 Property Management Tables

### properties
**Purpose**: Property listings and management
```sql
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    mls_id VARCHAR(100) UNIQUE,
    address TEXT NOT NULL,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    property_type VARCHAR(50),
    listing_type VARCHAR(20), -- sale, rent, sold, rented
    price DECIMAL(12,2),
    bedrooms INTEGER,
    bathrooms DECIMAL(3,1),
    square_feet INTEGER,
    lot_size DECIMAL(10,2),
    year_built INTEGER,
    description TEXT,
    features TEXT[],
    images TEXT[],
    virtual_tour_url VARCHAR(500),
    listing_agent_id INTEGER REFERENCES users(id),
    listing_office VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    listed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_properties_mls_id (mls_id),
    INDEX idx_properties_type (property_type),
    INDEX idx_properties_listing_type (listing_type),
    INDEX idx_properties_price (price),
    INDEX idx_properties_bedrooms (bedrooms),
    INDEX idx_properties_city (city),
    INDEX idx_properties_status (status),
    INDEX idx_properties_listed_at (listed_at),
    INDEX idx_properties_updated_at (updated_at)
);
```

### property_lead_matches
**Purpose**: Property recommendations for leads
```sql
CREATE TABLE property_lead_matches (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    property_id INTEGER REFERENCES properties(id),
    match_score DECIMAL(5,2),
    match_reasons TEXT[],
    recommended_by VARCHAR(50), -- ml, manual, rule
    is_viewed BOOLEAN DEFAULT false,
    is_favorited BOOLEAN DEFAULT false,
    viewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_property_matches_lead (lead_id),
    INDEX idx_property_matches_property (property_id),
    INDEX idx_property_matches_score (match_score),
    INDEX idx_property_matches_viewed (is_viewed),
    INDEX idx_property_matches_created (created_at)
);
```

---

## 📋 Task Management Tables

### tasks
**Purpose**: Task creation and management
```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    assigned_to INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50), -- call, email, meeting, follow_up
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    estimated_duration INTEGER, -- minutes
    actual_duration INTEGER, -- minutes
    tags TEXT[],
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_tasks_lead (lead_id),
    INDEX idx_tasks_assigned_to (assigned_to),
    INDEX idx_tasks_created_by (created_by),
    INDEX idx_tasks_type (type),
    INDEX idx_tasks_priority (priority),
    INDEX idx_tasks_status (status),
    INDEX idx_tasks_due_date (due_date),
    INDEX idx_tasks_completed (completed_at),
    INDEX idx_tasks_created (created_at)
);
```

### task_templates
**Purpose**: Reusable task templates
```sql
CREATE TABLE task_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    type VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'medium',
    estimated_duration INTEGER,
    template_data JSONB,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_task_templates_category (category),
    INDEX idx_task_templates_type (type),
    INDEX idx_task_templates_active (is_active)
);
```

---

## 🔧 System Management Tables

### system_settings
**Purpose**: Application configuration and settings
```sql
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    key VARCHAR(255) NOT NULL,
    value JSONB,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_system_settings_category (category),
    INDEX idx_system_settings_key (key),
    INDEX idx_system_settings_system (is_system),
    UNIQUE KEY uk_system_settings_key (key)
);
```

### api_logs
**Purpose**: API request logging and monitoring
```sql
CREATE TABLE api_logs (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_api_logs_request_id (request_id),
    INDEX idx_api_logs_user (user_id),
    INDEX idx_api_logs_method (method),
    INDEX idx_api_logs_endpoint (endpoint),
    INDEX idx_api_logs_status (status_code),
    INDEX idx_api_logs_created (created_at),
    INDEX idx_api_logs_response_time (response_time_ms)
);
```

---

## 📊 Performance & Monitoring Tables

### performance_metrics
**Purpose**: Application performance tracking
```sql
CREATE TABLE performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(10,4),
    metric_unit VARCHAR(50),
    tags JSONB,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_performance_metrics_name (metric_name),
    INDEX idx_performance_metrics_recorded (recorded_at),
    INDEX idx_performance_metrics_tags (tags)
);
```

### error_logs
**Purpose**: Application error tracking
```sql
CREATE TABLE error_logs (
    id SERIAL PRIMARY KEY,
    error_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB,
    severity VARCHAR(20) DEFAULT 'error',
    status VARCHAR(20) DEFAULT 'new',
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_error_logs_error_id (error_id),
    INDEX idx_error_logs_user (user_id),
    INDEX idx_error_logs_type (error_type),
    INDEX idx_error_logs_severity (severity),
    INDEX idx_error_logs_status (status),
    INDEX idx_error_logs_created (created_at),
    INDEX idx_error_logs_resolved (resolved_at)
);
```

---

## 🔗 Database Relationships

### Core Relationships
```
users (1) ──── (many) leads
users (1) ──── (many) audit_log
users (1) ──── (many) user_sessions

leads (1) ──── (many) lead_scores
leads (1) ──── (many) conversion_events
leads (1) ──── (many) interactions
leads (1) ──── (many) tasks
leads (1) ──── (many) property_lead_matches

ml_models (1) ──── (many) lead_scores
ml_models (1) ──── (many) ml_model_performance

workflow_templates (1) ──── (many) workflow_executions

properties (1) ──── (many) property_lead_matches
```

### Foreign Key Constraints
All foreign key relationships include:
- `ON DELETE CASCADE` for dependent data
- `ON UPDATE CASCADE` for referential integrity
- Proper indexing on foreign key columns

---

## 📊 Indexing Strategy

### Primary Indexes
- All primary keys are automatically indexed
- Composite primary keys where appropriate

### Foreign Key Indexes
- All foreign key columns are indexed
- Composite indexes for common query patterns

### Performance Indexes
```sql
-- Complex query optimization
CREATE INDEX idx_leads_complex_search ON leads (
    status, score, source, created_at, budget
) WHERE status = 'active';

CREATE INDEX idx_conversion_funnel ON conversion_events (
    lead_id, from_stage, to_stage, created_at
);

CREATE INDEX idx_ml_performance_time ON ml_model_performance (
    model_id, metric_name, recorded_at
);

-- JSONB indexes for dynamic queries
CREATE INDEX idx_leads_custom_fields ON leads USING GIN (custom_fields);
CREATE INDEX idx_audit_log_old_values ON audit_log USING GIN (old_values);
CREATE INDEX idx_audit_log_new_values ON audit_log USING GIN (new_values);
```

---

## 🔄 Data Partitioning

### Time-Based Partitioning
```sql
-- Partition audit_log by month
CREATE TABLE audit_log_y2025m01 PARTITION OF audit_log
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Partition lead_scores by quarter
CREATE TABLE lead_scores_q1_2025 PARTITION OF lead_scores
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
```

### Benefits
- Improved query performance
- Easier data management
- Better backup strategies
- Regulatory compliance (data retention)

---

## 🔒 Security Features

### Row-Level Security (RLS)
```sql
-- Enable RLS on sensitive tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY leads_user_policy ON leads
    FOR ALL USING (user_id = current_user_id() OR role = 'admin');
```

### Data Encryption
- Sensitive fields encrypted at rest
- TLS 1.3 for data in transit
- Key rotation policies
- Secure key management

### Audit Trail
- Complete change tracking
- Immutable audit logs
- Compliance reporting
- Anomaly detection

---

## 📈 Database Maintenance

### Automated Tasks
- **Daily**: Index maintenance and statistics updates
- **Weekly**: Partition rotation and cleanup
- **Monthly**: Long-term data archiving
- **Quarterly**: Comprehensive performance analysis

### Backup Strategy
- **Daily**: Incremental backups
- **Weekly**: Full backups
- **Monthly**: Offsite storage
- **Point-in-Time**: Recovery capability

### Monitoring
- **Performance**: Query execution times, connection pooling
- **Storage**: Table sizes, index usage, disk space
- **Security**: Failed login attempts, unusual queries
- **Availability**: Replication lag, failover status

---

## 🚀 Migration Strategy

### Version Control
- All schema changes tracked in migrations
- Rollback capability for all changes
- Zero-downtime migration support
- Automated testing for migrations

### Migration Files
Located in `database/migrations/` with naming convention:
```
YYYYMMDD_HHMM_description.sql
```

### Migration Best Practices
- **Backward Compatibility**: Ensure old code works with new schema
- **Data Migration**: Handle data transformation carefully
- **Testing**: Comprehensive testing before production deployment
- **Rollback Plan**: Always have a rollback strategy

---

## 📊 Database Statistics

### Table Sizes (Estimated)
- **leads**: 1M+ records (primary growth table)
- **lead_scores**: 5M+ records (ML predictions)
- **interactions**: 2M+ records (activity tracking)
- **audit_log**: 10M+ records (compliance)
- **ml_model_performance**: 1M+ records (monitoring)

### Performance Targets
- **Query Response**: <100ms for 95% of queries
- **Concurrent Users**: 2000+ simultaneous connections
- **Data Ingestion**: 1000+ leads/minute
- **ML Scoring**: 500+ predictions/second

### Monitoring Queries
```sql
-- Table size monitoring
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage analysis
SELECT indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Query performance monitoring
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

This comprehensive database schema supports the full range of Real Estate CRM functionality with enterprise-grade performance, security, and scalability.