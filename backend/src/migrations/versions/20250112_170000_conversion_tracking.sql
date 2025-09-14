-- Description: Conversion tracking schema for lead progression analytics
-- Created: 2025-01-12T17:00:00.000Z

-- Up Migration

-- Conversion Stages Table: Defines standard conversion stages
CREATE TABLE IF NOT EXISTS conversion_stages (
    stage_id SERIAL PRIMARY KEY,
    stage_name VARCHAR(100) NOT NULL UNIQUE,
    stage_order INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert default conversion stages
INSERT INTO conversion_stages (stage_name, stage_order, description) VALUES
('New Lead', 1, 'Lead has been created but not yet contacted'),
('Initial Contact', 2, 'First contact attempt made'),
('Qualified', 3, 'Lead meets basic qualification criteria'),
('Needs Analysis', 4, 'Detailed requirements gathering'),
('Proposal Sent', 5, 'Formal proposal or quote provided'),
('Negotiation', 6, 'Terms being discussed'),
('Closed Won', 7, 'Deal successfully closed'),
('Closed Lost', 8, 'Deal lost or disqualified')
ON CONFLICT (stage_name) DO NOTHING;

-- Extend leads table with conversion tracking fields
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS conversion_stage_id INTEGER REFERENCES conversion_stages(stage_id),
ADD COLUMN IF NOT EXISTS conversion_probability DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS expected_close_date DATE,
ADD COLUMN IF NOT EXISTS conversion_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS conversion_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS conversion_score DECIMAL(5,2) DEFAULT 0.0;

-- Conversion Events Table: Tracks all conversion-related activities
CREATE TABLE IF NOT EXISTS conversion_events (
    event_id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    from_stage_id INTEGER REFERENCES conversion_stages(stage_id),
    to_stage_id INTEGER NOT NULL REFERENCES conversion_stages(stage_id),
    event_type VARCHAR(50) NOT NULL, -- 'stage_change', 'score_update', 'value_update', 'note'
    event_data JSONB, -- Flexible data storage for event details
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Conversion Metrics Table: Pre-calculated metrics for performance
CREATE TABLE IF NOT EXISTS conversion_metrics (
    metric_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    total_leads INTEGER DEFAULT 0,
    leads_in_pipeline INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0.0,
    average_deal_size DECIMAL(12,2) DEFAULT 0.0,
    pipeline_value DECIMAL(15,2) DEFAULT 0.0,
    leads_won INTEGER DEFAULT 0,
    leads_lost INTEGER DEFAULT 0,
    average_conversion_time INTEGER DEFAULT 0, -- days
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, metric_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversion_events_lead_id ON conversion_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_user_id ON conversion_events(user_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_created_at ON conversion_events(created_at);
CREATE INDEX IF NOT EXISTS idx_conversion_events_type ON conversion_events(event_type);

CREATE INDEX IF NOT EXISTS idx_leads_conversion_stage ON leads(conversion_stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_conversion_probability ON leads(conversion_probability);
CREATE INDEX IF NOT EXISTS idx_leads_conversion_score ON leads(conversion_score);

CREATE INDEX IF NOT EXISTS idx_conversion_metrics_user_date ON conversion_metrics(user_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_conversion_metrics_date ON conversion_metrics(metric_date);

-- Update existing leads to have default conversion stage
UPDATE leads
SET conversion_stage_id = (SELECT stage_id FROM conversion_stages WHERE stage_name = 'New Lead')
WHERE conversion_stage_id IS NULL AND status = 'New';

-- Down Migration
-- DROP TABLE IF EXISTS conversion_metrics;
-- DROP TABLE IF EXISTS conversion_events;
-- ALTER TABLE leads DROP COLUMN IF EXISTS conversion_score;
-- ALTER TABLE leads DROP COLUMN IF EXISTS conversion_completed_at;
-- ALTER TABLE leads DROP COLUMN IF EXISTS conversion_started_at;
-- ALTER TABLE leads DROP COLUMN IF EXISTS expected_close_date;
-- ALTER TABLE leads DROP COLUMN IF EXISTS estimated_value;
-- ALTER TABLE leads DROP COLUMN IF EXISTS conversion_probability;
-- ALTER TABLE leads DROP COLUMN IF EXISTS conversion_stage_id;
-- DROP TABLE IF EXISTS conversion_stages;