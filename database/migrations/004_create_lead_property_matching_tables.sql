-- ============================================================================
-- Migration 004: Lead-Property Matching System
-- Description: Tables for intelligent lead-to-property matching with scoring
-- Story: 3.3 - Lead-to-Property Matching
-- Created: 2024
-- ============================================================================

-- ============================================================================
-- Table: lead_preferences
-- Description: Stores lead preferences for property matching
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_preferences (
    preference_id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
    
    -- Budget preferences
    budget_min DECIMAL(12, 2),
    budget_max DECIMAL(12, 2),
    
    -- Location preferences
    preferred_cities TEXT[], -- Array of preferred cities
    preferred_states TEXT[], -- Array of preferred states
    preferred_zip_codes TEXT[], -- Array of preferred ZIP codes
    max_distance_miles INTEGER, -- Maximum distance from preferred location
    
    -- Property characteristics
    min_bedrooms INTEGER,
    max_bedrooms INTEGER,
    min_bathrooms DECIMAL(3, 1),
    max_bathrooms DECIMAL(3, 1),
    min_square_feet INTEGER,
    max_square_feet INTEGER,
    min_lot_size INTEGER,
    max_lot_size INTEGER,
    
    -- Property type preferences
    preferred_property_types TEXT[], -- ['House', 'Townhouse', 'Condo', etc.]
    preferred_property_subtypes TEXT[],
    
    -- Additional preferences
    must_have_features TEXT[], -- Required features
    nice_to_have_features TEXT[], -- Preferred but not required
    deal_breakers TEXT[], -- Features to avoid
    
    -- Preference weights (for custom scoring)
    budget_weight DECIMAL(3, 2) DEFAULT 0.30,
    location_weight DECIMAL(3, 2) DEFAULT 0.25,
    bedrooms_weight DECIMAL(3, 2) DEFAULT 0.15,
    bathrooms_weight DECIMAL(3, 2) DEFAULT 0.10,
    property_type_weight DECIMAL(3, 2) DEFAULT 0.10,
    features_weight DECIMAL(3, 2) DEFAULT 0.10,
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_budget_range CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max),
    CONSTRAINT check_bedroom_range CHECK (min_bedrooms IS NULL OR max_bedrooms IS NULL OR min_bedrooms <= max_bedrooms),
    CONSTRAINT check_sqft_range CHECK (min_square_feet IS NULL OR max_square_feet IS NULL OR min_square_feet <= max_square_feet)
);

-- Indexes for lead_preferences
CREATE INDEX idx_lead_preferences_lead ON lead_preferences(lead_id);
CREATE INDEX idx_lead_preferences_active ON lead_preferences(is_active);
CREATE INDEX idx_lead_preferences_budget ON lead_preferences(budget_min, budget_max);

COMMENT ON TABLE lead_preferences IS 'Stores detailed property preferences for each lead to enable intelligent matching';

-- ============================================================================
-- Table: lead_property_matches
-- Description: Stores matches between leads and properties with scoring
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_property_matches (
    match_id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
    property_id INTEGER NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    
    -- Match scoring (0-100)
    overall_score DECIMAL(5, 2) NOT NULL,
    budget_score DECIMAL(5, 2),
    location_score DECIMAL(5, 2),
    bedrooms_score DECIMAL(5, 2),
    bathrooms_score DECIMAL(5, 2),
    property_type_score DECIMAL(5, 2),
    features_score DECIMAL(5, 2),
    
    -- Match quality tier
    match_quality VARCHAR(20) CHECK (match_quality IN ('Excellent', 'Good', 'Fair', 'Poor')),
    
    -- Match details
    distance_miles DECIMAL(8, 2), -- Distance from lead's preferred location
    price_difference DECIMAL(12, 2), -- Difference from lead's budget
    matching_features TEXT[], -- Features that match lead preferences
    missing_features TEXT[], -- Features lead wants but property doesn't have
    
    -- Match status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending',      -- New match, not yet viewed
        'viewed',       -- Agent has seen the match
        'interested',   -- Lead showed interest
        'contacted',    -- Agent contacted lead about property
        'scheduled',    -- Showing scheduled
        'dismissed',    -- Match dismissed by agent
        'converted'     -- Lead toured/made offer on property
    )),
    
    -- Agent interaction
    agent_rating INTEGER CHECK (agent_rating BETWEEN 1 AND 5), -- Agent's rating of match quality
    agent_notes TEXT,
    dismissed_reason VARCHAR(200),
    
    -- Lead feedback
    lead_interested BOOLEAN,
    lead_feedback TEXT,
    
    -- Timestamps
    matched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    viewed_at TIMESTAMP WITH TIME ZONE,
    contacted_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    match_version INTEGER DEFAULT 1, -- For tracking algorithm changes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_lead_property_match UNIQUE(lead_id, property_id),
    CONSTRAINT check_overall_score CHECK (overall_score BETWEEN 0 AND 100)
);

-- Indexes for lead_property_matches
CREATE INDEX idx_matches_lead ON lead_property_matches(lead_id);
CREATE INDEX idx_matches_property ON lead_property_matches(property_id);
CREATE INDEX idx_matches_score ON lead_property_matches(overall_score DESC);
CREATE INDEX idx_matches_quality ON lead_property_matches(match_quality);
CREATE INDEX idx_matches_status ON lead_property_matches(status);
CREATE INDEX idx_matches_matched_at ON lead_property_matches(matched_at DESC);
CREATE INDEX idx_matches_lead_status ON lead_property_matches(lead_id, status);
CREATE INDEX idx_matches_quality_score ON lead_property_matches(match_quality, overall_score DESC);

COMMENT ON TABLE lead_property_matches IS 'Stores scored matches between leads and properties with detailed metrics';

-- ============================================================================
-- Table: match_notifications
-- Description: Tracks notifications sent to agents about new matches
-- ============================================================================
CREATE TABLE IF NOT EXISTS match_notifications (
    notification_id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES lead_property_matches(match_id) ON DELETE CASCADE,
    lead_id INTEGER NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
    property_id INTEGER NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'new_match',
        'excellent_match',
        'lead_interest',
        'price_change',
        'status_change',
        'reminder'
    )),
    
    notification_title VARCHAR(200) NOT NULL,
    notification_message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Delivery status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending',
        'sent',
        'delivered',
        'read',
        'failed'
    )),
    
    -- Delivery channels
    sent_via_email BOOLEAN DEFAULT FALSE,
    sent_via_push BOOLEAN DEFAULT FALSE,
    sent_via_sms BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Indexes for match_notifications
CREATE INDEX idx_notifications_match ON match_notifications(match_id);
CREATE INDEX idx_notifications_user ON match_notifications(user_id);
CREATE INDEX idx_notifications_status ON match_notifications(status);
CREATE INDEX idx_notifications_created ON match_notifications(created_at DESC);
CREATE INDEX idx_notifications_pending ON match_notifications(status, scheduled_for) 
    WHERE status = 'pending';

COMMENT ON TABLE match_notifications IS 'Tracks notifications sent to agents about property matches';

-- ============================================================================
-- Table: match_feedback
-- Description: Stores feedback on match quality for algorithm improvement
-- ============================================================================
CREATE TABLE IF NOT EXISTS match_feedback (
    feedback_id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES lead_property_matches(match_id) ON DELETE CASCADE,
    lead_id INTEGER NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
    property_id INTEGER NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Feedback type
    feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN (
        'good_match',
        'poor_match',
        'lead_converted',
        'lead_rejected',
        'algorithm_improvement'
    )),
    
    -- Ratings (1-5)
    accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5),
    relevance_rating INTEGER CHECK (relevance_rating BETWEEN 1 AND 5),
    usefulness_rating INTEGER CHECK (usefulness_rating BETWEEN 1 AND 5),
    
    -- Detailed feedback
    what_worked_well TEXT,
    what_could_improve TEXT,
    specific_issues TEXT[],
    suggestions TEXT,
    
    -- Match outcome
    outcome VARCHAR(50) CHECK (outcome IN (
        'lead_interested',
        'showing_scheduled',
        'offer_made',
        'closed_deal',
        'lead_not_interested',
        'wrong_criteria',
        'other'
    )),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for match_feedback
CREATE INDEX idx_feedback_match ON match_feedback(match_id);
CREATE INDEX idx_feedback_type ON match_feedback(feedback_type);
CREATE INDEX idx_feedback_outcome ON match_feedback(outcome);
CREATE INDEX idx_feedback_created ON match_feedback(created_at DESC);
CREATE INDEX idx_feedback_rating ON match_feedback(accuracy_rating, relevance_rating);

COMMENT ON TABLE match_feedback IS 'Collects feedback on match quality to improve the matching algorithm';

-- ============================================================================
-- Table: matching_algorithm_metrics
-- Description: Tracks performance metrics of the matching algorithm
-- ============================================================================
CREATE TABLE IF NOT EXISTS matching_algorithm_metrics (
    metric_id SERIAL PRIMARY KEY,
    
    -- Algorithm version
    algorithm_version VARCHAR(50) NOT NULL,
    
    -- Performance metrics
    total_matches_created INTEGER DEFAULT 0,
    excellent_matches INTEGER DEFAULT 0,
    good_matches INTEGER DEFAULT 0,
    fair_matches INTEGER DEFAULT 0,
    poor_matches INTEGER DEFAULT 0,
    
    -- Conversion metrics
    matches_viewed INTEGER DEFAULT 0,
    matches_contacted INTEGER DEFAULT 0,
    matches_converted INTEGER DEFAULT 0,
    matches_dismissed INTEGER DEFAULT 0,
    
    -- Success rates
    view_rate DECIMAL(5, 2),
    contact_rate DECIMAL(5, 2),
    conversion_rate DECIMAL(5, 2),
    dismissal_rate DECIMAL(5, 2),
    
    -- Average scores
    avg_overall_score DECIMAL(5, 2),
    avg_agent_rating DECIMAL(3, 2),
    avg_accuracy_rating DECIMAL(3, 2),
    
    -- Time period
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for matching_algorithm_metrics
CREATE INDEX idx_algorithm_metrics_version ON matching_algorithm_metrics(algorithm_version);
CREATE INDEX idx_algorithm_metrics_period ON matching_algorithm_metrics(period_start, period_end);

COMMENT ON TABLE matching_algorithm_metrics IS 'Tracks performance metrics for the matching algorithm over time';

-- ============================================================================
-- Sample Data: Insert default preferences for existing leads
-- ============================================================================

-- Create basic preferences for all existing leads based on their current data
INSERT INTO lead_preferences (
    lead_id,
    budget_min,
    budget_max,
    preferred_cities,
    preferred_states,
    min_bedrooms,
    max_bedrooms,
    min_bathrooms,
    max_bathrooms,
    preferred_property_types
)
SELECT 
    lead_id,
    budget_min,
    budget_max,
    CASE 
        WHEN location IS NOT NULL THEN ARRAY[location]
        ELSE ARRAY[]::TEXT[]
    END as preferred_cities,
    ARRAY[]::TEXT[] as preferred_states,
    CASE 
        WHEN bedrooms IS NOT NULL THEN bedrooms
        ELSE NULL
    END as min_bedrooms,
    CASE 
        WHEN bedrooms IS NOT NULL THEN bedrooms + 1
        ELSE NULL
    END as max_bedrooms,
    CASE 
        WHEN bathrooms IS NOT NULL THEN bathrooms
        ELSE NULL
    END as min_bathrooms,
    CASE 
        WHEN bathrooms IS NOT NULL THEN bathrooms + 0.5
        ELSE NULL
    END as max_bathrooms,
    CASE 
        WHEN property_type IS NOT NULL THEN ARRAY[property_type]
        ELSE ARRAY[]::TEXT[]
    END as preferred_property_types
FROM leads
WHERE status = 'active'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Views for reporting and analytics
-- ============================================================================

-- View: Active matches with lead and property details
CREATE OR REPLACE VIEW v_active_matches AS
SELECT 
    m.match_id,
    m.lead_id,
    l.first_name || ' ' || l.last_name as lead_name,
    l.email as lead_email,
    l.phone_number as lead_phone,
    m.property_id,
    p.address as property_address,
    p.city as property_city,
    p.state as property_state,
    p.price as property_price,
    p.bedrooms as property_bedrooms,
    p.bathrooms as property_bathrooms,
    m.overall_score,
    m.match_quality,
    m.status as match_status,
    m.distance_miles,
    m.price_difference,
    m.matched_at,
    m.viewed_at
FROM lead_property_matches m
JOIN leads l ON m.lead_id = l.lead_id
JOIN properties p ON m.property_id = p.property_id
WHERE m.status IN ('pending', 'viewed', 'interested', 'contacted', 'scheduled')
    AND l.status = 'active'
    AND p.status = 'Active';

COMMENT ON VIEW v_active_matches IS 'Shows all active matches with lead and property details';

-- View: Match statistics by lead
CREATE OR REPLACE VIEW v_match_statistics_by_lead AS
SELECT 
    l.lead_id,
    l.first_name || ' ' || l.last_name as lead_name,
    COUNT(*) as total_matches,
    COUNT(*) FILTER (WHERE m.match_quality = 'Excellent') as excellent_matches,
    COUNT(*) FILTER (WHERE m.match_quality = 'Good') as good_matches,
    COUNT(*) FILTER (WHERE m.status = 'viewed') as viewed_matches,
    COUNT(*) FILTER (WHERE m.status = 'contacted') as contacted_matches,
    COUNT(*) FILTER (WHERE m.status = 'converted') as converted_matches,
    AVG(m.overall_score) as avg_match_score,
    MAX(m.overall_score) as best_match_score,
    MAX(m.matched_at) as last_match_date
FROM leads l
LEFT JOIN lead_property_matches m ON l.lead_id = m.lead_id
WHERE l.status = 'active'
GROUP BY l.lead_id, l.first_name, l.last_name;

COMMENT ON VIEW v_match_statistics_by_lead IS 'Provides match statistics for each active lead';

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Record migration
INSERT INTO schema_migrations (version, description, applied_at)
VALUES (4, 'Create lead-property matching tables', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;

SELECT 'Migration 004: Lead-Property Matching System - COMPLETED' as status;
