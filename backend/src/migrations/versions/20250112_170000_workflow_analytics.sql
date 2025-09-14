-- Description: Add workflow analytics and tracking tables
-- Created: 2025-01-12T17:00:00.000Z

-- Up Migration

-- Workflow Analytics Table: Tracks overall workflow performance
CREATE TABLE IF NOT EXISTS workflow_analytics (
    analytics_id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES workflow_configurations(workflow_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_triggers INTEGER DEFAULT 0,
    completed_sequences INTEGER DEFAULT 0,
    failed_sequences INTEGER DEFAULT 0,
    avg_completion_time_hours DECIMAL(10,2),
    conversion_rate DECIMAL(5,2), -- Percentage of workflows that led to conversions
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workflow_id, period_start, period_end)
);

-- Workflow Responses Table: Tracks lead responses to workflow steps
CREATE TABLE IF NOT EXISTS workflow_responses (
    response_id SERIAL PRIMARY KEY,
    execution_id INTEGER NOT NULL REFERENCES workflow_executions(execution_id) ON DELETE CASCADE,
    response_type VARCHAR(50) NOT NULL, -- 'opened', 'clicked', 'replied', 'converted', 'unsubscribed'
    response_value TEXT, -- Additional data (e.g., reply content, conversion details)
    response_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Performance Metrics Table: Detailed step-by-step performance
CREATE TABLE IF NOT EXISTS workflow_performance (
    performance_id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES workflow_configurations(workflow_id) ON DELETE CASCADE,
    sequence_id INTEGER REFERENCES workflow_sequences(sequence_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    replied_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    unsubscribed_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workflow_id, sequence_id, metric_date)
);

-- Add tracking fields to workflow_executions table
ALTER TABLE workflow_executions
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bounced BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS unsubscribed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS conversion_value DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS conversion_type VARCHAR(50);

-- Indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_workflow_id ON workflow_analytics(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_period ON workflow_analytics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_user_id ON workflow_analytics(user_id);

CREATE INDEX IF NOT EXISTS idx_workflow_responses_execution_id ON workflow_responses(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_responses_type ON workflow_responses(response_type);
CREATE INDEX IF NOT EXISTS idx_workflow_responses_timestamp ON workflow_responses(response_timestamp);

CREATE INDEX IF NOT EXISTS idx_workflow_performance_workflow_id ON workflow_performance(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_performance_date ON workflow_performance(metric_date);
CREATE INDEX IF NOT EXISTS idx_workflow_performance_sequence_id ON workflow_performance(sequence_id);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_delivered_at ON workflow_executions(delivered_at);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_opened_at ON workflow_executions(opened_at);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_clicked_at ON workflow_executions(clicked_at);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_replied_at ON workflow_executions(replied_at);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_conversion ON workflow_executions(conversion_value, conversion_type);

-- Insert sample analytics data for existing workflows
INSERT INTO workflow_analytics (workflow_id, user_id, period_start, period_end, total_triggers, completed_sequences, failed_sequences, avg_completion_time_hours, conversion_rate)
SELECT
    wc.workflow_id,
    wc.user_id,
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE,
    25, -- Sample data
    20,
    2,
    48.5,
    15.0
FROM workflow_configurations wc
WHERE wc.workflow_id = 1;

-- Down Migration
DROP TABLE IF EXISTS workflow_performance;
DROP TABLE IF EXISTS workflow_responses;
DROP TABLE IF EXISTS workflow_analytics;

-- Remove added columns from workflow_executions
ALTER TABLE workflow_executions
DROP COLUMN IF EXISTS delivered_at,
DROP COLUMN IF EXISTS opened_at,
DROP COLUMN IF EXISTS clicked_at,
DROP COLUMN IF EXISTS replied_at,
DROP COLUMN IF EXISTS bounced,
DROP COLUMN IF EXISTS unsubscribed,
DROP COLUMN IF EXISTS conversion_value,
DROP COLUMN IF EXISTS conversion_type;