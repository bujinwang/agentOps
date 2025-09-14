-- Comparative Market Analysis (CMA) Database Schema
-- Migration: 012_add_cma_tables.sql
-- Date: 2025-01-14
-- Description: Creates comprehensive database schema for CMA functionality

-- =====================================================
-- CMA ANALYSIS TABLES
-- =====================================================

-- Main CMA analysis table
CREATE TABLE IF NOT EXISTS cma_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    subject_property_value DECIMAL(12,2),
    analysis_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    analysis_status VARCHAR(20) DEFAULT 'draft' CHECK (analysis_status IN ('draft', 'in_progress', 'completed', 'archived')),
    analyst_id INTEGER REFERENCES users(id),
    analyst_name VARCHAR(255),

    -- Search criteria (stored as JSON for flexibility)
    search_criteria JSONB NOT NULL DEFAULT '{}',

    -- Analysis results (stored as JSON)
    statistics JSONB DEFAULT '{}',
    price_range JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',

    -- Market context
    market_trends JSONB DEFAULT '[]',
    neighborhood_analysis JSONB DEFAULT '{}',
    market_forecast JSONB DEFAULT '{}',

    -- Quality and validation
    data_quality_score INTEGER DEFAULT 0 CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
    validation_warnings TEXT[] DEFAULT '{}',
    data_sources TEXT[] DEFAULT '{}',

    -- Metadata
    version INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    CONSTRAINT cma_analyses_status_check CHECK (analysis_status IN ('draft', 'in_progress', 'completed', 'archived'))
);

-- Comparable properties table
CREATE TABLE IF NOT EXISTS cma_comparables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cma_id UUID NOT NULL REFERENCES cma_analyses(id) ON DELETE CASCADE,
    property_id INTEGER REFERENCES properties(id), -- Link to actual property if exists

    -- Property details
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),

    -- Property characteristics
    property_type VARCHAR(50) NOT NULL,
    bedrooms INTEGER DEFAULT 0,
    bathrooms DECIMAL(3,1) DEFAULT 0,
    square_feet INTEGER,
    lot_size INTEGER,
    year_built INTEGER,
    garage_spaces INTEGER,
    pool BOOLEAN DEFAULT FALSE,
    waterfront BOOLEAN DEFAULT FALSE,

    -- Sale information
    sale_price DECIMAL(12,2) NOT NULL,
    sale_date DATE NOT NULL,
    original_list_price DECIMAL(12,2),
    days_on_market INTEGER DEFAULT 0,
    sale_type VARCHAR(50) DEFAULT 'arms_length' CHECK (sale_type IN ('arms_length', 'short_sale', 'foreclosure', 'relocation', 'estate_sale')),

    -- Calculated metrics
    price_per_sqft DECIMAL(8,2),
    sale_to_list_ratio DECIMAL(4,3),

    -- Comparison data
    distance_miles DECIMAL(5,2) NOT NULL,
    similarity_score INTEGER DEFAULT 0 CHECK (similarity_score >= 0 AND similarity_score <= 100),
    adjustments JSONB DEFAULT '[]',
    adjusted_price DECIMAL(12,2),

    -- Market context
    market_conditions TEXT,
    neighborhood_rating INTEGER CHECK (neighborhood_rating >= 1 AND neighborhood_rating <= 10),
    school_district_rating INTEGER CHECK (school_district_rating >= 1 AND school_district_rating <= 10),

    -- Metadata
    data_source VARCHAR(50) DEFAULT 'mls' CHECK (data_source IN ('mls', 'public_record', 'appraisal', 'manual_entry')),
    data_quality_score INTEGER DEFAULT 70 CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
    verified BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Property adjustments table (for detailed adjustment tracking)
CREATE TABLE IF NOT EXISTS cma_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comparable_id UUID NOT NULL REFERENCES cma_comparables(id) ON DELETE CASCADE,
    adjustment_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL, -- Positive or negative
    percentage DECIMAL(5,2), -- Alternative percentage-based adjustment
    justification TEXT,
    source VARCHAR(100), -- MLS, appraisal, market data, etc.
    confidence_level VARCHAR(20) DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high', 'very_high')),
    applied BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Market trends table
CREATE TABLE IF NOT EXISTS cma_market_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cma_id UUID NOT NULL REFERENCES cma_analyses(id) ON DELETE CASCADE,
    timeframe VARCHAR(20) NOT NULL CHECK (timeframe IN ('1_month', '3_months', '6_months', '1_year', '2_years', '5_years')),
    metric VARCHAR(50) NOT NULL,
    current_value DECIMAL(12,2) NOT NULL,
    previous_value DECIMAL(12,2),
    change_amount DECIMAL(12,2),
    change_percentage DECIMAL(6,3),
    direction VARCHAR(20) DEFAULT 'stable' CHECK (direction IN ('up', 'down', 'stable', 'volatile')),
    significance VARCHAR(20) DEFAULT 'low' CHECK (significance IN ('low', 'medium', 'high')),
    data_points INTEGER DEFAULT 0,
    confidence_level VARCHAR(20) DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high', 'very_high')),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(cma_id, timeframe, metric)
);

-- CMA recommendations table
CREATE TABLE IF NOT EXISTS cma_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cma_id UUID NOT NULL REFERENCES cma_analyses(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    confidence_level VARCHAR(20) DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high', 'very_high')),
    impact_level VARCHAR(20) DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high')),
    actionable BOOLEAN DEFAULT TRUE,
    timeframe VARCHAR(100),
    expected_outcome TEXT,
    supporting_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CMA CONFIGURATION TABLES
-- =====================================================

-- CMA report configurations
CREATE TABLE IF NOT EXISTS cma_report_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) DEFAULT 'standard' CHECK (template_type IN ('standard', 'detailed', 'executive', 'custom')),

    -- Section configuration
    include_sections JSONB DEFAULT '{
        "executive_summary": true,
        "subject_property": true,
        "comparables_analysis": true,
        "market_trends": true,
        "neighborhood_analysis": true,
        "recommendations": true,
        "methodology": true,
        "appendices": true
    }',

    -- Formatting options
    formatting JSONB DEFAULT '{}',

    -- Custom sections
    custom_sections JSONB DEFAULT '[]',

    -- Metadata
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CMA report exports
CREATE TABLE IF NOT EXISTS cma_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cma_id UUID NOT NULL REFERENCES cma_analyses(id) ON DELETE CASCADE,
    config_id UUID REFERENCES cma_report_configs(id),

    -- Report content
    content JSONB NOT NULL,

    -- Metadata
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    generated_by INTEGER NOT NULL REFERENCES users(id),

    -- Export options
    export_formats JSONB DEFAULT '{"pdf": true, "excel": false, "word": false, "html": false}',

    -- File storage (if applicable)
    file_path VARCHAR(500),
    file_size INTEGER,
    download_count INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ANALYTICS AND AUDIT TABLES
-- =====================================================

-- CMA usage analytics
CREATE TABLE IF NOT EXISTS cma_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cma_id UUID REFERENCES cma_analyses(id) ON DELETE SET NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'created', 'viewed', 'exported', 'shared', etc.
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CMA data quality audit
CREATE TABLE IF NOT EXISTS cma_data_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cma_id UUID REFERENCES cma_analyses(id) ON DELETE CASCADE,
    comparable_id UUID REFERENCES cma_comparables(id) ON DELETE CASCADE,
    audit_type VARCHAR(50) NOT NULL, -- 'data_quality', 'verification', 'adjustment_review'
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    audited_by INTEGER REFERENCES users(id),
    audited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- CMA analyses indexes
CREATE INDEX IF NOT EXISTS idx_cma_analyses_subject_property ON cma_analyses(subject_property_id);
CREATE INDEX IF NOT EXISTS idx_cma_analyses_status ON cma_analyses(analysis_status);
CREATE INDEX IF NOT EXISTS idx_cma_analyses_date ON cma_analyses(analysis_date);
CREATE INDEX IF NOT EXISTS idx_cma_analyses_analyst ON cma_analyses(analyst_id);

-- Comparables indexes
CREATE INDEX IF NOT EXISTS idx_cma_comparables_cma_id ON cma_comparables(cma_id);
CREATE INDEX IF NOT EXISTS idx_cma_comparables_property_id ON cma_comparables(property_id);
CREATE INDEX IF NOT EXISTS idx_cma_comparables_location ON cma_comparables(city, state, zip_code);
CREATE INDEX IF NOT EXISTS idx_cma_comparables_sale_date ON cma_comparables(sale_date);
CREATE INDEX IF NOT EXISTS idx_cma_comparables_similarity ON cma_comparables(similarity_score);
CREATE INDEX IF NOT EXISTS idx_cma_comparables_distance ON cma_comparables(distance_miles);

-- Market trends indexes
CREATE INDEX IF NOT EXISTS idx_cma_market_trends_cma_id ON cma_market_trends(cma_id);
CREATE INDEX IF NOT EXISTS idx_cma_market_trends_timeframe ON cma_market_trends(timeframe);
CREATE INDEX IF NOT EXISTS idx_cma_market_trends_metric ON cma_market_trends(metric);

-- Recommendations indexes
CREATE INDEX IF NOT EXISTS idx_cma_recommendations_cma_id ON cma_recommendations(cma_id);
CREATE INDEX IF NOT EXISTS idx_cma_recommendations_type ON cma_recommendations(recommendation_type);

-- Report indexes
CREATE INDEX IF NOT EXISTS idx_cma_reports_cma_id ON cma_reports(cma_id);
CREATE INDEX IF NOT EXISTS idx_cma_reports_generated_by ON cma_reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_cma_reports_generated_at ON cma_reports(generated_at);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_cma_analytics_cma_id ON cma_analytics(cma_id);
CREATE INDEX IF NOT EXISTS idx_cma_analytics_user_id ON cma_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_cma_analytics_action ON cma_analytics(action);
CREATE INDEX IF NOT EXISTS idx_cma_analytics_created_at ON cma_analytics(created_at);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update CMA updated_at timestamp
CREATE OR REPLACE FUNCTION update_cma_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_cma_analyses_updated_at
    BEFORE UPDATE ON cma_analyses
    FOR EACH ROW EXECUTE FUNCTION update_cma_updated_at();

CREATE TRIGGER update_cma_report_configs_updated_at
    BEFORE UPDATE ON cma_report_configs
    FOR EACH ROW EXECUTE FUNCTION update_cma_updated_at();

-- Function to calculate similarity score
CREATE OR REPLACE FUNCTION calculate_property_similarity_score(
    subject_bedrooms INTEGER,
    subject_bathrooms DECIMAL,
    subject_sqft INTEGER,
    subject_property_type VARCHAR,
    comp_bedrooms INTEGER,
    comp_bathrooms DECIMAL,
    comp_sqft INTEGER,
    comp_property_type VARCHAR,
    distance_miles DECIMAL
) RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 100;
    sqft_diff DECIMAL;
BEGIN
    -- Bedroom match
    IF subject_bedrooms != comp_bedrooms THEN
        score := score - ABS(subject_bedrooms - comp_bedrooms) * 10;
    END IF;

    -- Bathroom match
    IF subject_bathrooms != comp_bathrooms THEN
        score := score - ABS(subject_bathrooms - comp_bathrooms) * 15;
    END IF;

    -- Square footage match (within 20%)
    IF subject_sqft > 0 THEN
        sqft_diff := ABS(subject_sqft - comp_sqft) / subject_sqft;
        IF sqft_diff > 0.2 THEN
            score := score - (sqft_diff * 20);
        END IF;
    END IF;

    -- Property type match
    IF subject_property_type != comp_property_type THEN
        score := score - 25;
    END IF;

    -- Distance penalty
    IF distance_miles > 1 THEN
        score := score - (distance_miles * 5);
    END IF;

    -- Ensure score is within bounds
    RETURN GREATEST(0, LEAST(100, score));
END;
$$ LANGUAGE plpgsql;

-- Function to calculate price statistics
CREATE OR REPLACE FUNCTION calculate_cma_price_statistics(comparables_data JSONB)
RETURNS JSONB AS $$
DECLARE
    prices DECIMAL[];
    price DECIMAL;
    count INTEGER;
    total DECIMAL := 0;
    mean DECIMAL;
    variance DECIMAL := 0;
    std_dev DECIMAL;
    result JSONB;
BEGIN
    -- Extract prices from comparables
    SELECT array_agg((comp->>'adjusted_price')::DECIMAL)
    INTO prices
    FROM jsonb_array_elements(comparables_data) AS comp
    WHERE comp->>'adjusted_price' IS NOT NULL;

    count := array_length(prices, 1);

    IF count = 0 THEN
        RETURN '{
            "count": 0,
            "average": 0,
            "median": 0,
            "standard_deviation": 0,
            "min": 0,
            "max": 0
        }'::JSONB;
    END IF;

    -- Calculate mean
    FOREACH price IN ARRAY prices LOOP
        total := total + price;
    END LOOP;
    mean := total / count;

    -- Calculate variance
    FOREACH price IN ARRAY prices LOOP
        variance := variance + POWER(price - mean, 2);
    END LOOP;
    variance := variance / count;
    std_dev := SQRT(variance);

    -- Sort prices for median
    SELECT array_agg(price ORDER BY price) INTO prices FROM unnest(prices) AS price;

    result := jsonb_build_object(
        'count', count,
        'average', ROUND(mean, 2),
        'median', ROUND(prices[count/2 + 1], 2),
        'standard_deviation', ROUND(std_dev, 2),
        'min', ROUND(prices[1], 2),
        'max', ROUND(prices[array_length(prices, 1)], 2)
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DATA VALIDATION CONSTRAINTS
-- =====================================================

-- Ensure comparables have valid coordinates if provided
ALTER TABLE cma_comparables
ADD CONSTRAINT valid_latitude CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
ADD CONSTRAINT valid_longitude CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- Ensure sale dates are not in the future
ALTER TABLE cma_comparables
ADD CONSTRAINT valid_sale_date CHECK (sale_date <= CURRENT_DATE);

-- Ensure positive values for key metrics
ALTER TABLE cma_comparables
ADD CONSTRAINT positive_sale_price CHECK (sale_price > 0),
ADD CONSTRAINT positive_square_feet CHECK (square_feet IS NULL OR square_feet > 0),
ADD CONSTRAINT positive_days_on_market CHECK (days_on_market >= 0);

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default CMA report configuration
INSERT INTO cma_report_configs (id, name, template_type, created_by)
VALUES (
    'default-standard-config',
    'Standard CMA Report',
    'standard',
    (SELECT id FROM users LIMIT 1)
) ON CONFLICT DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Add comment to track migration
COMMENT ON TABLE cma_analyses IS 'Main table for Comparative Market Analysis data and results';
COMMENT ON TABLE cma_comparables IS 'Comparable properties used in CMA analysis';
COMMENT ON TABLE cma_adjustments IS 'Detailed property adjustments for comparables';
COMMENT ON TABLE cma_market_trends IS 'Market trend analysis data';
COMMENT ON TABLE cma_recommendations IS 'CMA-based pricing and strategy recommendations';
COMMENT ON TABLE cma_report_configs IS 'CMA report template configurations';
COMMENT ON TABLE cma_reports IS 'Generated CMA reports and exports';
COMMENT ON TABLE cma_analytics IS 'CMA usage analytics and audit trail';
COMMENT ON TABLE cma_data_audit IS 'Data quality audit trail for CMA adjustments';