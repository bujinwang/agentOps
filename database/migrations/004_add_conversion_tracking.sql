-- Migration: Add Conversion Tracking System
-- Date: 2025-01-14
-- Description: Adds comprehensive conversion tracking tables and fields

-- Create conversion_events table for tracking individual conversion events
CREATE TABLE IF NOT EXISTS conversion_events (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'contact_made', 'showing_scheduled', 'offer_submitted', 'offer_accepted', 'sale_closed'
    event_description TEXT,
    event_data JSONB, -- Flexible storage for event-specific data
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversion_events_lead_id ON conversion_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_event_type ON conversion_events(event_type);
CREATE INDEX IF NOT EXISTS idx_conversion_events_timestamp ON conversion_events(event_timestamp);

-- Create conversion_funnels table for defining funnel stages
CREATE TABLE IF NOT EXISTS conversion_funnels (
    id SERIAL PRIMARY KEY,
    funnel_name VARCHAR(100) NOT NULL,
    funnel_description TEXT,
    stages JSONB NOT NULL, -- Array of stage definitions with order and criteria
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default conversion funnel
INSERT INTO conversion_funnels (funnel_name, funnel_description, stages, created_by) VALUES
('Standard Real Estate Conversion Funnel', 'Default funnel for tracking lead to sale conversion',
'[
    {"stage": "lead_created", "order": 1, "name": "Lead Created", "description": "Initial lead capture"},
    {"stage": "contact_made", "order": 2, "name": "Contact Made", "description": "First contact established"},
    {"stage": "qualified", "order": 3, "name": "Qualified", "description": "Lead meets basic criteria"},
    {"stage": "showing_scheduled", "order": 4, "name": "Showing Scheduled", "description": "Property showing arranged"},
    {"stage": "showing_completed", "order": 5, "name": "Showing Completed", "description": "Property showing finished"},
    {"stage": "offer_submitted", "order": 6, "name": "Offer Submitted", "description": "Purchase offer made"},
    {"stage": "offer_accepted", "order": 7, "name": "Offer Accepted", "description": "Offer accepted by seller"},
    {"stage": "sale_closed", "order": 8, "name": "Sale Closed", "description": "Transaction completed"}
]', NULL);

-- Add conversion tracking fields to existing leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversion_status VARCHAR(50) DEFAULT 'lead_created';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversion_start_date TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversion_complete_date TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversion_value DECIMAL(12,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversion_probability DECIMAL(5,4); -- 0.0000 to 1.0000
ALTER TABLE leads ADD COLUMN IF NOT EXISTS current_funnel_stage INTEGER DEFAULT 1;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversion_events_count INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_conversion_event TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversion_notes TEXT;

-- Create indexes for the new lead fields
CREATE INDEX IF NOT EXISTS idx_leads_conversion_status ON leads(conversion_status);
CREATE INDEX IF NOT EXISTS idx_leads_conversion_probability ON leads(conversion_probability);
CREATE INDEX IF NOT EXISTS idx_leads_current_funnel_stage ON leads(current_funnel_stage);

-- Create conversion_metrics table for aggregated analytics
CREATE TABLE IF NOT EXISTS conversion_metrics (
    id SERIAL PRIMARY KEY,
    metric_date DATE NOT NULL,
    funnel_id INTEGER REFERENCES conversion_funnels(id),
    total_leads INTEGER DEFAULT 0,
    leads_in_funnel INTEGER DEFAULT 0,
    conversion_rates JSONB, -- Stage-by-stage conversion rates
    average_conversion_time JSONB, -- Time spent in each stage
    bottleneck_stages JSONB, -- Stages with highest drop-off rates
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(metric_date, funnel_id)
);

-- Create index for metrics queries
CREATE INDEX IF NOT EXISTS idx_conversion_metrics_date ON conversion_metrics(metric_date);

-- Create function to update lead conversion counts
CREATE OR REPLACE FUNCTION update_lead_conversion_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update conversion_events_count
    UPDATE leads
    SET conversion_events_count = (
        SELECT COUNT(*) FROM conversion_events WHERE lead_id = leads.id
    ),
    last_conversion_event = (
        SELECT MAX(event_timestamp) FROM conversion_events WHERE lead_id = leads.id
    )
    WHERE id = COALESCE(NEW.lead_id, OLD.lead_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update conversion counts
DROP TRIGGER IF EXISTS trigger_update_conversion_counts ON conversion_events;
CREATE TRIGGER trigger_update_conversion_counts
    AFTER INSERT OR UPDATE OR DELETE ON conversion_events
    FOR EACH ROW EXECUTE FUNCTION update_lead_conversion_counts();

-- Create function to calculate conversion probability based on historical data
CREATE OR REPLACE FUNCTION calculate_conversion_probability(
    p_lead_score DECIMAL,
    p_days_since_creation INTEGER,
    p_events_count INTEGER,
    p_current_stage INTEGER
) RETURNS DECIMAL AS $$
DECLARE
    base_probability DECIMAL := 0.1; -- 10% base conversion rate
    score_multiplier DECIMAL;
    time_multiplier DECIMAL;
    engagement_multiplier DECIMAL;
    stage_multiplier DECIMAL;
BEGIN
    -- Score multiplier (higher score = higher probability)
    score_multiplier := LEAST(p_lead_score / 100.0, 2.0);

    -- Time multiplier (recent leads have higher probability)
    time_multiplier := GREATEST(1.0 - (p_days_since_creation / 365.0), 0.1);

    -- Engagement multiplier (more events = higher probability)
    engagement_multiplier := LEAST(1.0 + (p_events_count / 10.0), 3.0);

    -- Stage multiplier (later stages = higher probability)
    stage_multiplier := 1.0 + (p_current_stage / 10.0);

    -- Calculate final probability
    RETURN LEAST(base_probability * score_multiplier * time_multiplier * engagement_multiplier * stage_multiplier, 0.95);
END;
$$ LANGUAGE plpgsql;

-- Update existing leads with conversion probability
UPDATE leads
SET conversion_probability = calculate_conversion_probability(
    COALESCE(score, 50),
    EXTRACT(DAY FROM (NOW() - created_at)),
    COALESCE(conversion_events_count, 0),
    COALESCE(current_funnel_stage, 1)
)
WHERE conversion_probability IS NULL;

-- Create view for conversion funnel analytics
CREATE OR REPLACE VIEW conversion_funnel_analytics AS
SELECT
    cf.funnel_name,
    cfs.stage,
    cfs.name as stage_name,
    cfs.order as stage_order,
    COUNT(DISTINCT l.id) as leads_in_stage,
    COUNT(DISTINCT CASE WHEN l.conversion_status = cfs.stage THEN l.id END) as leads_at_stage,
    AVG(EXTRACT(EPOCH FROM (l.last_conversion_event - l.conversion_start_date))/86400) as avg_days_in_funnel,
    SUM(l.conversion_value) as total_conversion_value
FROM conversion_funnels cf
CROSS JOIN jsonb_array_elements(cf.stages) as s(stage_data)
CROSS JOIN LATERAL jsonb_to_record(s.stage_data) as cfs(stage text, name text, order int)
LEFT JOIN leads l ON l.current_funnel_stage >= cfs.order
WHERE cf.is_active = true
GROUP BY cf.funnel_name, cfs.stage, cfs.name, cfs.order
ORDER BY cf.funnel_name, cfs.order;

COMMENT ON TABLE conversion_events IS 'Tracks individual conversion events for leads';
COMMENT ON TABLE conversion_funnels IS 'Defines conversion funnel stages and configurations';
COMMENT ON TABLE conversion_metrics IS 'Stores aggregated conversion analytics data';
COMMENT ON TABLE conversion_funnel_analytics IS 'View for real-time conversion funnel analytics';
COMMENT ON FUNCTION calculate_conversion_probability IS 'Calculates conversion probability based on lead characteristics';