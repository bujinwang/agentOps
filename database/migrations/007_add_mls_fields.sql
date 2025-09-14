-- Migration: Add MLS-specific fields to properties table
-- Date: 2025-01-14
-- Description: Adds MLS integration fields to support comprehensive property data import and synchronization

-- Add MLS-specific columns to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS mls_id VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS mls_listing_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS mls_provider VARCHAR(20) CHECK (mls_provider IN ('rets', 'reso', 'custom')),
ADD COLUMN IF NOT EXISTS mls_status VARCHAR(20) DEFAULT 'active' CHECK (mls_status IN ('active', 'pending', 'sold', 'expired', 'cancelled')),
ADD COLUMN IF NOT EXISTS mls_last_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mls_raw_data JSONB,
ADD COLUMN IF NOT EXISTS mls_agent_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS mls_office_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS mls_listing_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mls_updated_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mls_off_market_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mls_contract_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mls_closed_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mls_expiration_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mls_property_subtype VARCHAR(50),
ADD COLUMN IF NOT EXISTS mls_style VARCHAR(50),
ADD COLUMN IF NOT EXISTS mls_stories INTEGER,
ADD COLUMN IF NOT EXISTS mls_garage_spaces INTEGER,
ADD COLUMN IF NOT EXISTS mls_parking_spaces INTEGER,
ADD COLUMN IF NOT EXISTS mls_heating VARCHAR(100),
ADD COLUMN IF NOT EXISTS mls_cooling VARCHAR(100),
ADD COLUMN IF NOT EXISTS mls_fireplace BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mls_basement VARCHAR(100),
ADD COLUMN IF NOT EXISTS mls_roof VARCHAR(100),
ADD COLUMN IF NOT EXISTS mls_exterior VARCHAR(200),
ADD COLUMN IF NOT EXISTS mls_interior_features TEXT[],
ADD COLUMN IF NOT EXISTS mls_appliances TEXT[],
ADD COLUMN IF NOT EXISTS mls_county VARCHAR(50),
ADD COLUMN IF NOT EXISTS mls_neighborhood VARCHAR(100),
ADD COLUMN IF NOT EXISTS mls_remarks TEXT,
ADD COLUMN IF NOT EXISTS mls_data_quality_score INTEGER CHECK (mls_data_quality_score >= 0 AND mls_data_quality_score <= 100),
ADD COLUMN IF NOT EXISTS mls_duplicate_candidates JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS mls_sync_errors JSONB DEFAULT '[]'::jsonb;

-- Create index for MLS ID lookups
CREATE INDEX IF NOT EXISTS idx_properties_mls_id ON properties(mls_id) WHERE mls_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_mls_listing_id ON properties(mls_listing_id) WHERE mls_listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_mls_provider ON properties(mls_provider) WHERE mls_provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_mls_status ON properties(mls_status) WHERE mls_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_mls_last_sync ON properties(mls_last_sync) WHERE mls_last_sync IS NOT NULL;

-- Create partial index for active MLS listings
CREATE INDEX IF NOT EXISTS idx_properties_active_mls ON properties(mls_id, mls_status) WHERE mls_id IS NOT NULL AND mls_status = 'active';

-- Create GIN index for JSONB fields for efficient querying
CREATE INDEX IF NOT EXISTS idx_properties_mls_raw_data ON properties USING GIN(mls_raw_data) WHERE mls_raw_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_mls_duplicate_candidates ON properties USING GIN(mls_duplicate_candidates) WHERE jsonb_array_length(mls_duplicate_candidates) > 0;
CREATE INDEX IF NOT EXISTS idx_properties_mls_sync_errors ON properties USING GIN(mls_sync_errors) WHERE jsonb_array_length(mls_sync_errors) > 0;

-- Add comments for documentation
COMMENT ON COLUMN properties.mls_id IS 'Unique MLS identifier for the property';
COMMENT ON COLUMN properties.mls_listing_id IS 'MLS listing number/ID';
COMMENT ON COLUMN properties.mls_provider IS 'MLS provider type (rets, reso, custom)';
COMMENT ON COLUMN properties.mls_status IS 'Current MLS listing status';
COMMENT ON COLUMN properties.mls_last_sync IS 'Timestamp of last MLS data synchronization';
COMMENT ON COLUMN properties.mls_raw_data IS 'Original MLS data in JSON format for debugging and reference';
COMMENT ON COLUMN properties.mls_agent_id IS 'MLS agent identifier';
COMMENT ON COLUMN properties.mls_office_id IS 'MLS office identifier';
COMMENT ON COLUMN properties.mls_data_quality_score IS 'Data quality score (0-100) for MLS imported data';
COMMENT ON COLUMN properties.mls_duplicate_candidates IS 'Array of potential duplicate property records';
COMMENT ON COLUMN properties.mls_sync_errors IS 'Array of synchronization errors encountered';

-- Create a view for MLS properties with commonly queried fields
CREATE OR REPLACE VIEW mls_properties AS
SELECT
    p.id,
    p.mls_id,
    p.mls_listing_id,
    p.mls_provider,
    p.mls_status,
    p.mls_last_sync,
    p.title,
    p.description,
    p.price,
    p.address,
    p.bedrooms,
    p.bathrooms,
    p.square_feet,
    p.property_type,
    p.mls_listing_date,
    p.mls_updated_date,
    p.mls_agent_id,
    p.mls_office_id,
    p.mls_data_quality_score,
    jsonb_array_length(p.mls_sync_errors) as error_count,
    jsonb_array_length(p.mls_duplicate_candidates) as duplicate_count
FROM properties p
WHERE p.mls_id IS NOT NULL;

-- Grant permissions on the view
GRANT SELECT ON mls_properties TO PUBLIC;

-- Add RLS policy for MLS properties (if using RLS)
-- ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY mls_properties_policy ON properties FOR ALL USING (mls_id IS NOT NULL OR user_id = current_user_id());

-- Insert sample MLS configuration data (for development/testing)
INSERT INTO properties (
    id, title, description, price, property_type, bedrooms, bathrooms, square_feet,
    address, mls_id, mls_listing_id, mls_provider, mls_status, mls_data_quality_score,
    created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Sample MLS Property',
    'This is a sample property imported from MLS for testing purposes',
    450000,
    'single_family',
    3,
    2,
    2000,
    '{"street": "123 Sample St", "city": "Sample City", "state": "CA", "zip_code": "12345"}'::jsonb,
    'SAMPLE001',
    'MLS123456',
    'rets',
    'active',
    95,
    NOW(),
    NOW()
) ON CONFLICT (mls_id) DO NOTHING;