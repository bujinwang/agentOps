-- Migration: Create Properties and MLS Sync Tables
-- Story: 3.2 - MLS Integration and Property Synchronization System
-- Created: 2024-10-01

-- ============================================================================
-- PROPERTIES TABLE
-- ============================================================================
CREATE TABLE properties (
    property_id SERIAL PRIMARY KEY,
    
    -- MLS Reference
    mls_listing_id VARCHAR(100) NOT NULL UNIQUE,
    mls_provider VARCHAR(50) NOT NULL, -- 'RETS', 'REST_API', etc.
    
    -- Basic Information
    address VARCHAR(500) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(50) DEFAULT 'USA',
    
    -- Property Details
    property_type VARCHAR(100) NOT NULL, -- 'House', 'Condo', 'Townhouse', 'Land', 'Commercial'
    property_subtype VARCHAR(100), -- Additional detail like 'Single Family', 'Duplex'
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- 'Active', 'Pending', 'Sold', 'Withdrawn', 'Expired'
    
    -- Pricing
    price DECIMAL(12, 2) NOT NULL,
    original_price DECIMAL(12, 2),
    price_per_sqft DECIMAL(10, 2),
    
    -- Physical Characteristics
    bedrooms INTEGER,
    bathrooms DECIMAL(3, 1), -- Allows for half baths (e.g., 2.5)
    square_feet INTEGER,
    lot_size INTEGER, -- in square feet
    year_built INTEGER,
    
    -- Features (stored as JSON for flexibility)
    interior_features JSONB, -- {"fireplace": true, "hardwood_floors": true, ...}
    exterior_features JSONB, -- {"pool": true, "deck": true, ...}
    appliances JSONB, -- ["dishwasher", "refrigerator", "washer", "dryer"]
    parking_features JSONB, -- {"garage_spaces": 2, "carport": false, ...}
    
    -- Additional Info
    description TEXT,
    remarks TEXT, -- Agent remarks
    
    -- Location Details
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    neighborhood VARCHAR(200),
    school_district VARCHAR(200),
    
    -- Listing Information
    listed_date DATE,
    sold_date DATE,
    days_on_market INTEGER,
    listing_agent_name VARCHAR(200),
    listing_agent_phone VARCHAR(20),
    listing_agent_email VARCHAR(200),
    listing_office VARCHAR(200),
    
    -- MLS Sync Metadata
    mls_data_raw JSONB, -- Store raw MLS data for reference
    last_synced_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    sync_status VARCHAR(50) DEFAULT 'synced', -- 'synced', 'error', 'pending'
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for properties table
CREATE INDEX idx_properties_mls_listing_id ON properties(mls_listing_id);
CREATE INDEX idx_properties_mls_provider ON properties(mls_provider);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_property_type ON properties(property_type);
CREATE INDEX idx_properties_city_state ON properties(city, state);
CREATE INDEX idx_properties_price ON properties(price);
CREATE INDEX idx_properties_bedrooms_bathrooms ON properties(bedrooms, bathrooms);
CREATE INDEX idx_properties_location ON properties(latitude, longitude);
CREATE INDEX idx_properties_listed_date ON properties(listed_date);
CREATE INDEX idx_properties_last_synced ON properties(last_synced_at);

-- ============================================================================
-- PROPERTY MEDIA TABLE
-- ============================================================================
CREATE TABLE property_media (
    media_id SERIAL PRIMARY KEY,
    property_id INTEGER NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    
    -- Media Information
    media_type VARCHAR(50) NOT NULL DEFAULT 'image', -- 'image', 'video', '3d_tour', 'floor_plan'
    media_url TEXT NOT NULL, -- Original MLS URL
    
    -- Storage Information
    s3_bucket VARCHAR(200),
    s3_key VARCHAR(500), -- S3 object key
    s3_url TEXT, -- CloudFront/S3 public URL
    
    -- Image Variants (for images only)
    thumbnail_url TEXT, -- 200x150
    medium_url TEXT, -- 800x600
    large_url TEXT, -- 1920x1440
    
    -- Metadata
    display_order INTEGER DEFAULT 0, -- Order to display media
    caption TEXT,
    width INTEGER,
    height INTEGER,
    file_size BIGINT, -- in bytes
    
    -- Processing Status
    processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    processing_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for property_media table
CREATE INDEX idx_property_media_property_id ON property_media(property_id);
CREATE INDEX idx_property_media_type ON property_media(media_type);
CREATE INDEX idx_property_media_display_order ON property_media(property_id, display_order);
CREATE INDEX idx_property_media_processing_status ON property_media(processing_status);

-- ============================================================================
-- MLS SYNC STATUS TABLE
-- ============================================================================
CREATE TABLE mls_sync_status (
    sync_status_id SERIAL PRIMARY KEY,
    
    -- Provider Information
    provider_id VARCHAR(100) NOT NULL UNIQUE, -- Unique identifier for MLS provider
    provider_name VARCHAR(200) NOT NULL,
    provider_type VARCHAR(50) NOT NULL, -- 'RETS', 'REST_API'
    
    -- Sync Configuration
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_interval_hours INTEGER DEFAULT 4,
    
    -- Last Sync Information
    last_sync_started_at TIMESTAMPTZ,
    last_sync_completed_at TIMESTAMPTZ,
    last_sync_duration_seconds INTEGER,
    last_sync_status VARCHAR(50), -- 'success', 'partial', 'failed'
    last_sync_error TEXT,
    
    -- Sync Statistics
    total_properties_synced INTEGER DEFAULT 0,
    properties_added_last_sync INTEGER DEFAULT 0,
    properties_updated_last_sync INTEGER DEFAULT 0,
    properties_deleted_last_sync INTEGER DEFAULT 0,
    properties_errored_last_sync INTEGER DEFAULT 0,
    
    -- Health Metrics
    consecutive_failures INTEGER DEFAULT 0,
    total_sync_count INTEGER DEFAULT 0,
    total_success_count INTEGER DEFAULT 0,
    total_failure_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for mls_sync_status table
CREATE INDEX idx_mls_sync_status_provider ON mls_sync_status(provider_id);
CREATE INDEX idx_mls_sync_status_enabled ON mls_sync_status(sync_enabled);
CREATE INDEX idx_mls_sync_status_last_sync ON mls_sync_status(last_sync_completed_at);

-- ============================================================================
-- MLS SYNC HISTORY TABLE
-- ============================================================================
CREATE TABLE mls_sync_history (
    sync_history_id SERIAL PRIMARY KEY,
    
    -- Sync Information
    sync_id VARCHAR(100) NOT NULL UNIQUE, -- UUID for this sync run
    provider_id VARCHAR(100) NOT NULL,
    sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'manual'
    
    -- Sync Execution
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    status VARCHAR(50) NOT NULL, -- 'running', 'success', 'partial', 'failed', 'cancelled'
    
    -- Statistics
    properties_fetched INTEGER DEFAULT 0,
    properties_added INTEGER DEFAULT 0,
    properties_updated INTEGER DEFAULT 0,
    properties_deleted INTEGER DEFAULT 0,
    properties_errored INTEGER DEFAULT 0,
    media_downloaded INTEGER DEFAULT 0,
    media_failed INTEGER DEFAULT 0,
    
    -- Error Information
    error_message TEXT,
    error_details JSONB,
    
    -- Metadata
    triggered_by VARCHAR(100), -- 'system', 'admin', 'user_id'
    sync_config JSONB, -- Configuration used for this sync
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for mls_sync_history table
CREATE INDEX idx_mls_sync_history_sync_id ON mls_sync_history(sync_id);
CREATE INDEX idx_mls_sync_history_provider ON mls_sync_history(provider_id);
CREATE INDEX idx_mls_sync_history_started ON mls_sync_history(started_at DESC);
CREATE INDEX idx_mls_sync_history_status ON mls_sync_history(status);

-- ============================================================================
-- MLS SYNC ERRORS TABLE
-- ============================================================================
CREATE TABLE mls_sync_errors (
    error_id SERIAL PRIMARY KEY,
    
    -- Sync Reference
    sync_history_id INTEGER REFERENCES mls_sync_history(sync_history_id) ON DELETE CASCADE,
    sync_id VARCHAR(100),
    provider_id VARCHAR(100) NOT NULL,
    
    -- Error Details
    error_type VARCHAR(100) NOT NULL, -- 'authentication', 'network', 'data_validation', 'rate_limit', 'unknown'
    error_message TEXT NOT NULL,
    error_stack TEXT,
    error_context JSONB, -- Additional context (property ID, URL, request data, etc.)
    
    -- Property Reference (if applicable)
    mls_listing_id VARCHAR(100),
    property_id INTEGER REFERENCES properties(property_id) ON DELETE SET NULL,
    
    -- Retry Information
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    last_retry_at TIMESTAMPTZ,
    retry_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'retrying', 'success', 'failed', 'abandoned'
    
    -- Resolution
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for mls_sync_errors table
CREATE INDEX idx_mls_sync_errors_sync_id ON mls_sync_errors(sync_id);
CREATE INDEX idx_mls_sync_errors_provider ON mls_sync_errors(provider_id);
CREATE INDEX idx_mls_sync_errors_error_type ON mls_sync_errors(error_type);
CREATE INDEX idx_mls_sync_errors_retry_status ON mls_sync_errors(retry_status);
CREATE INDEX idx_mls_sync_errors_resolved ON mls_sync_errors(resolved);
CREATE INDEX idx_mls_sync_errors_next_retry ON mls_sync_errors(next_retry_at) WHERE retry_status = 'pending';

-- ============================================================================
-- MLS PROVIDER CONFIGURATIONS TABLE
-- ============================================================================
CREATE TABLE mls_provider_configurations (
    config_id SERIAL PRIMARY KEY,
    
    -- Provider Information
    provider_id VARCHAR(100) NOT NULL UNIQUE,
    provider_name VARCHAR(200) NOT NULL,
    provider_type VARCHAR(50) NOT NULL, -- 'RETS', 'REST_API'
    
    -- Connection Settings (encrypted in production)
    login_url TEXT NOT NULL,
    api_endpoint TEXT,
    
    -- Credentials (store in AWS Secrets Manager in production)
    credentials_secret_name VARCHAR(200), -- Reference to AWS Secrets Manager
    
    -- Rate Limiting
    rate_limit_requests_per_minute INTEGER DEFAULT 60,
    rate_limit_requests_per_hour INTEGER DEFAULT 1000,
    
    -- Field Mapping Configuration
    field_mapping JSONB NOT NULL, -- Map MLS fields to internal schema
    
    -- Sync Configuration
    batch_size INTEGER DEFAULT 1000,
    max_concurrent_requests INTEGER DEFAULT 10,
    timeout_seconds INTEGER DEFAULT 30,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_health_check TIMESTAMPTZ,
    health_status VARCHAR(50), -- 'healthy', 'degraded', 'unhealthy'
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for mls_provider_configurations table
CREATE INDEX idx_mls_provider_config_provider ON mls_provider_configurations(provider_id);
CREATE INDEX idx_mls_provider_config_active ON mls_provider_configurations(is_active);
CREATE INDEX idx_mls_provider_config_health ON mls_provider_configurations(health_status);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE properties IS 'Stores property listings synchronized from MLS providers';
COMMENT ON TABLE property_media IS 'Stores media (images, videos) for properties with S3 references';
COMMENT ON TABLE mls_sync_status IS 'Tracks current sync status for each MLS provider';
COMMENT ON TABLE mls_sync_history IS 'Audit trail of all sync operations';
COMMENT ON TABLE mls_sync_errors IS 'Logs and tracks sync errors for retry and monitoring';
COMMENT ON TABLE mls_provider_configurations IS 'Configuration for MLS provider connections';

-- ============================================================================
-- SAMPLE DATA (for development/testing)
-- ============================================================================

-- Insert sample MLS provider configuration
INSERT INTO mls_provider_configurations (
    provider_id,
    provider_name,
    provider_type,
    login_url,
    credentials_secret_name,
    field_mapping
) VALUES (
    'sample_rets_provider',
    'Sample RETS MLS Provider',
    'RETS',
    'https://rets.sample-mls.com/login',
    'mls/sample_rets_provider',
    '{
        "ListingId": "mls_listing_id",
        "ListPrice": "price",
        "StreetAddress": "address",
        "City": "city",
        "StateOrProvince": "state",
        "PostalCode": "postal_code",
        "PropertyType": "property_type",
        "BedroomsTotal": "bedrooms",
        "BathroomsTotal": "bathrooms",
        "BuildingAreaTotal": "square_feet",
        "YearBuilt": "year_built",
        "StandardStatus": "status",
        "ListingContractDate": "listed_date",
        "CloseDate": "sold_date"
    }'::jsonb
);

-- Insert initial sync status
INSERT INTO mls_sync_status (
    provider_id,
    provider_name,
    provider_type,
    sync_enabled
) VALUES (
    'sample_rets_provider',
    'Sample RETS MLS Provider',
    'RETS',
    true
);

-- ============================================================================
-- ROLLBACK (for development)
-- ============================================================================

-- To rollback this migration, run:
-- DROP TABLE IF EXISTS mls_sync_errors CASCADE;
-- DROP TABLE IF EXISTS mls_sync_history CASCADE;
-- DROP TABLE IF EXISTS mls_sync_status CASCADE;
-- DROP TABLE IF EXISTS property_media CASCADE;
-- DROP TABLE IF EXISTS properties CASCADE;
-- DROP TABLE IF EXISTS mls_provider_configurations CASCADE;
