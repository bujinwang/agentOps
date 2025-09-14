-- Migration: Add MLS sync tracking tables
-- Date: 2025-01-14
-- Description: Creates tables for tracking MLS synchronization status, history, and error management

-- MLS Sync Status Table
CREATE TABLE IF NOT EXISTS mls_sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_id VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'completed', 'failed', 'paused')),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    records_processed INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    progress DECIMAL(5,2) DEFAULT 0.00 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MLS Sync Errors Table
CREATE TABLE IF NOT EXISTS mls_sync_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_id VARCHAR(100) NOT NULL REFERENCES mls_sync_status(sync_id) ON DELETE CASCADE,
    error_type VARCHAR(50) NOT NULL CHECK (error_type IN ('api', 'data', 'validation', 'network', 'auth')),
    message TEXT NOT NULL,
    details JSONB,
    mls_record_id VARCHAR(100),
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    retryable BOOLEAN DEFAULT true,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MLS Sync History Table (for audit trail)
CREATE TABLE IF NOT EXISTS mls_sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_id VARCHAR(100) NOT NULL REFERENCES mls_sync_status(sync_id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'skipped')),
    mls_id VARCHAR(50),
    changes JSONB, -- Store what changed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MLS Duplicate Candidates Table
CREATE TABLE IF NOT EXISTS mls_duplicate_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    target_property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    match_reasons TEXT[] NOT NULL DEFAULT '{}',
    suggested_action VARCHAR(20) NOT NULL DEFAULT 'merge' CHECK (suggested_action IN ('merge', 'keep_both', 'skip')),
    merge_data JSONB,
    resolved BOOLEAN DEFAULT false,
    resolved_action VARCHAR(20) CHECK (resolved_action IN ('merged', 'kept_both', 'skipped')),
    resolved_by UUID, -- Could reference users table if exists
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure source and target are different
    CONSTRAINT different_properties CHECK (source_property_id != target_property_id),

    -- Ensure unique pairs (avoid duplicate candidate records)
    CONSTRAINT unique_duplicate_pair UNIQUE (source_property_id, target_property_id)
);

-- MLS Configuration Table
CREATE TABLE IF NOT EXISTS mls_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('rets', 'reso', 'custom')),
    name VARCHAR(100) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    credentials JSONB NOT NULL, -- Encrypted credentials
    rate_limit INTEGER DEFAULT 100,
    sync_interval INTEGER DEFAULT 60, -- minutes
    enabled BOOLEAN DEFAULT false,
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_provider UNIQUE (provider)
);

-- MLS Field Mappings Table
CREATE TABLE IF NOT EXISTS mls_field_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(20) NOT NULL,
    mls_field VARCHAR(100) NOT NULL,
    internal_field VARCHAR(100) NOT NULL,
    transform_function TEXT, -- SQL function or expression for transformation
    required BOOLEAN DEFAULT false,
    validation_rule TEXT, -- SQL expression for validation
    default_value TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_field_mapping UNIQUE (provider, mls_field, internal_field)
);

-- MLS Webhook Events Table (for real-time updates)
CREATE TABLE IF NOT EXISTS mls_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('property_created', 'property_updated', 'property_deleted', 'status_changed')),
    mls_id VARCHAR(50) NOT NULL,
    listing_id VARCHAR(100),
    event_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mls_sync_status_status ON mls_sync_status(status);
CREATE INDEX IF NOT EXISTS idx_mls_sync_status_start_time ON mls_sync_status(start_time);
CREATE INDEX IF NOT EXISTS idx_mls_sync_errors_sync_id ON mls_sync_errors(sync_id);
CREATE INDEX IF NOT EXISTS idx_mls_sync_errors_resolved ON mls_sync_errors(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_mls_sync_history_sync_id ON mls_sync_history(sync_id);
CREATE INDEX IF NOT EXISTS idx_mls_sync_history_property_id ON mls_sync_history(property_id);
CREATE INDEX IF NOT EXISTS idx_mls_duplicate_candidates_resolved ON mls_duplicate_candidates(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_mls_duplicate_candidates_confidence ON mls_duplicate_candidates(confidence) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_mls_config_enabled ON mls_config(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_mls_field_mappings_provider ON mls_field_mappings(provider, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_mls_webhook_events_processed ON mls_webhook_events(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_mls_webhook_events_created_at ON mls_webhook_events(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_mls_sync_status_updated_at BEFORE UPDATE ON mls_sync_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mls_sync_errors_updated_at BEFORE UPDATE ON mls_sync_errors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mls_duplicate_candidates_updated_at BEFORE UPDATE ON mls_duplicate_candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mls_config_updated_at BEFORE UPDATE ON mls_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mls_field_mappings_updated_at BEFORE UPDATE ON mls_field_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default MLS configurations (for development)
INSERT INTO mls_config (provider, name, endpoint, credentials, enabled) VALUES
('rets', 'Sample RETS Provider', 'https://sample-rets.example.com', '{"username": "sample_user", "password": "sample_pass"}'::jsonb, false),
('reso', 'Sample RESO Provider', 'https://sample-reso.example.com', '{"client_id": "sample_client", "client_secret": "sample_secret"}'::jsonb, false)
ON CONFLICT (provider) DO NOTHING;

-- Insert sample field mappings for RETS
INSERT INTO mls_field_mappings (provider, mls_field, internal_field, required, active) VALUES
('rets', 'ListingID', 'mls_listing_id', true, true),
('rets', 'ListPrice', 'price', true, true),
('rets', 'StreetNumber', 'address.street_number', true, true),
('rets', 'StreetName', 'address.street_name', true, true),
('rets', 'City', 'address.city', true, true),
('rets', 'StateOrProvince', 'address.state', true, true),
('rets', 'PostalCode', 'address.zip_code', true, true),
('rets', 'BedroomsTotal', 'bedrooms', false, true),
('rets', 'BathroomsTotal', 'bathrooms', false, true),
('rets', 'LivingArea', 'square_feet', false, true),
('rets', 'PropertyType', 'property_type', false, true),
('rets', 'PropertySubType', 'mls_property_subtype', false, true),
('rets', 'YearBuilt', 'year_built', false, true),
('rets', 'ListAgentFullName', 'mls_agent_name', false, true),
('rets', 'ListOfficeName', 'mls_office_name', false, true),
('rets', 'ListingContractDate', 'mls_listing_date', false, true),
('rets', 'ModificationTimestamp', 'mls_updated_date', false, true)
ON CONFLICT (provider, mls_field, internal_field) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE mls_sync_status IS 'Tracks the status and progress of MLS synchronization operations';
COMMENT ON TABLE mls_sync_errors IS 'Stores errors encountered during MLS synchronization';
COMMENT ON TABLE mls_sync_history IS 'Audit trail of changes made during MLS synchronization';
COMMENT ON TABLE mls_duplicate_candidates IS 'Potential duplicate property records identified during sync';
COMMENT ON TABLE mls_config IS 'MLS provider configurations and credentials';
COMMENT ON TABLE mls_field_mappings IS 'Field mapping configurations between MLS and internal data structures';
COMMENT ON TABLE mls_webhook_events IS 'Real-time webhook events from MLS providers';

-- Create views for common queries
CREATE OR REPLACE VIEW mls_sync_summary AS
SELECT
    s.sync_id,
    s.status,
    s.start_time,
    s.end_time,
    s.records_processed,
    s.records_updated,
    s.records_created,
    s.records_failed,
    s.progress,
    COUNT(e.id) as error_count
FROM mls_sync_status s
LEFT JOIN mls_sync_errors e ON s.sync_id = e.sync_id AND e.resolved = false
GROUP BY s.id, s.sync_id, s.status, s.start_time, s.end_time, s.records_processed,
         s.records_updated, s.records_created, s.records_failed, s.progress;

CREATE OR REPLACE VIEW mls_unresolved_errors AS
SELECT
    e.*,
    p.title as property_title,
    p.address->>'street' as property_address
FROM mls_sync_errors e
LEFT JOIN properties p ON e.property_id = p.id
WHERE e.resolved = false
ORDER BY e.created_at DESC;

CREATE OR REPLACE VIEW mls_pending_duplicates AS
SELECT
    d.*,
    sp.title as source_title,
    sp.address->>'street' as source_address,
    tp.title as target_title,
    tp.address->>'street' as target_address
FROM mls_duplicate_candidates d
JOIN properties sp ON d.source_property_id = sp.id
JOIN properties tp ON d.target_property_id = tp.id
WHERE d.resolved = false
ORDER BY d.confidence DESC, d.created_at DESC;

-- Grant permissions on views
GRANT SELECT ON mls_sync_summary TO PUBLIC;
GRANT SELECT ON mls_unresolved_errors TO PUBLIC;
GRANT SELECT ON mls_pending_duplicates TO PUBLIC;