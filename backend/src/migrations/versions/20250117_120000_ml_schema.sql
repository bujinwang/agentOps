-- Migration: ML Schema Setup
-- Description: Creates tables and indexes for ML model management, lead scoring, and feature storage
-- Date: 2025-01-17
-- Version: 1.0

-- =====================================================
-- ML Models Table
-- Stores trained ML models and their metadata
-- =====================================================

CREATE TABLE IF NOT EXISTS ml_models (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(255) UNIQUE NOT NULL,
    model_type VARCHAR(100) NOT NULL, -- 'baseline', 'advanced', 'ensemble'
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'deprecated'
    accuracy DECIMAL(5,4), -- 0.0000 to 1.0000
    precision DECIMAL(5,4), -- 0.0000 to 1.0000
    recall DECIMAL(5,4), -- 0.0000 to 1.0000
    f1_score DECIMAL(5,4), -- 0.0000 to 1.0000
    training_date TIMESTAMP NOT NULL,
    model_data JSONB, -- Stores TensorFlow.js model JSON and weights
    metadata JSONB, -- Additional model metadata (feature count, training config, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_accuracy_range CHECK (accuracy >= 0 AND accuracy <= 1),
    CONSTRAINT chk_precision_range CHECK (precision >= 0 AND precision <= 1),
    CONSTRAINT chk_recall_range CHECK (recall >= 0 AND recall <= 1),
    CONSTRAINT chk_f1_range CHECK (f1_score >= 0 AND f1_score <= 1),
    CONSTRAINT chk_model_type CHECK (model_type IN ('baseline', 'advanced', 'ensemble')),
    CONSTRAINT chk_status CHECK (status IN ('active', 'inactive', 'deprecated'))
);

-- Indexes for ML models
CREATE INDEX IF NOT EXISTS idx_ml_models_status ON ml_models(status);
CREATE INDEX IF NOT EXISTS idx_ml_models_type ON ml_models(model_type);
CREATE INDEX IF NOT EXISTS idx_ml_models_training_date ON ml_models(training_date DESC);
CREATE INDEX IF NOT EXISTS idx_ml_models_accuracy ON ml_models(accuracy DESC);

-- =====================================================
-- Lead Features Table
-- Stores extracted features for ML scoring
-- =====================================================

CREATE TABLE IF NOT EXISTS lead_features (
    lead_id INTEGER PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
    features JSONB NOT NULL, -- Feature vector as JSON
    feature_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(100) NOT NULL DEFAULT 'ml_pipeline', -- Source of feature extraction

    CONSTRAINT chk_features_not_empty CHECK (jsonb_object_length(features) > 0)
);

-- Indexes for lead features
CREATE INDEX IF NOT EXISTS idx_lead_features_updated ON lead_features(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_lead_features_version ON lead_features(feature_version);
CREATE INDEX IF NOT EXISTS idx_lead_features_source ON lead_features(source);

-- GIN index for JSONB features (for complex queries)
CREATE INDEX IF NOT EXISTS idx_lead_features_gin ON lead_features USING GIN (features);

-- =====================================================
-- Lead Scores Table
-- Stores ML scoring results and history
-- =====================================================

CREATE TABLE IF NOT EXISTS lead_scores (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    score DECIMAL(3,2) NOT NULL, -- 0.00 to 1.00 (conversion probability)
    score_type VARCHAR(50) NOT NULL DEFAULT 'ml', -- 'ml', 'rule_based', 'manual'
    confidence DECIMAL(3,2), -- 0.00 to 1.00 (model confidence)
    model_version VARCHAR(50), -- Version of model used for scoring
    features_used JSONB, -- Array of feature names used in scoring
    scored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_score_range CHECK (score >= 0 AND score <= 1),
    CONSTRAINT chk_confidence_range CHECK (confidence >= 0 AND confidence <= 1),
    CONSTRAINT chk_score_type CHECK (score_type IN ('ml', 'rule_based', 'manual'))
);

-- Indexes for lead scores
CREATE INDEX IF NOT EXISTS idx_lead_scores_lead_id ON lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_scored_at ON lead_scores(scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_scores_score ON lead_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_lead_scores_type ON lead_scores(score_type);
CREATE INDEX IF NOT EXISTS idx_lead_scores_model_version ON lead_scores(model_version);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_lead_scores_lead_type ON lead_scores(lead_id, score_type);
CREATE INDEX IF NOT EXISTS idx_lead_scores_lead_recent ON lead_scores(lead_id, scored_at DESC);

-- =====================================================
-- Model Performance Table
-- Stores model performance metrics and monitoring data
-- =====================================================

CREATE TABLE IF NOT EXISTS model_performance (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(255) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_model_performance_model_id
        FOREIGN KEY (model_id) REFERENCES ml_models(model_id) ON DELETE CASCADE
);

-- Indexes for model performance
CREATE INDEX IF NOT EXISTS idx_model_performance_model_id ON model_performance(model_id);
CREATE INDEX IF NOT EXISTS idx_model_performance_metric ON model_performance(metric_name);
CREATE INDEX IF NOT EXISTS idx_model_performance_recorded ON model_performance(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_performance_composite ON model_performance(model_id, metric_name, recorded_at DESC);

-- =====================================================
-- Training Snapshots Table
-- Stores snapshots of training data for reproducibility
-- =====================================================

CREATE TABLE IF NOT EXISTS training_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_id VARCHAR(255) UNIQUE NOT NULL,
    data_range_start TIMESTAMP NOT NULL,
    data_range_end TIMESTAMP NOT NULL,
    record_count INTEGER NOT NULL,
    feature_count INTEGER NOT NULL,
    conversion_rate DECIMAL(5,4), -- 0.0000 to 1.0000
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_record_count_positive CHECK (record_count > 0),
    CONSTRAINT chk_feature_count_positive CHECK (feature_count > 0),
    CONSTRAINT chk_conversion_rate_range CHECK (conversion_rate >= 0 AND conversion_rate <= 1)
);

-- Indexes for training snapshots
CREATE INDEX IF NOT EXISTS idx_training_snapshots_created ON training_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_snapshots_range ON training_snapshots(data_range_start, data_range_end);

-- =====================================================
-- Triggers for Automatic Timestamps
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for ml_models
DROP TRIGGER IF EXISTS update_ml_models_updated_at ON ml_models;
CREATE TRIGGER update_ml_models_updated_at
    BEFORE UPDATE ON ml_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Views for Analytics and Reporting
-- =====================================================

-- View for latest scores per lead
CREATE OR REPLACE VIEW latest_lead_scores AS
SELECT DISTINCT ON (lead_id)
    ls.*,
    l.first_name,
    l.last_name,
    l.email,
    l.created_at as lead_created_at
FROM lead_scores ls
JOIN leads l ON ls.lead_id = l.id
ORDER BY lead_id, scored_at DESC;

-- View for model performance summary
CREATE OR REPLACE VIEW model_performance_summary AS
SELECT
    model_id,
    metric_name,
    AVG(metric_value) as avg_value,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value,
    COUNT(*) as sample_count,
    MIN(recorded_at) as first_recorded,
    MAX(recorded_at) as last_recorded
FROM model_performance
GROUP BY model_id, metric_name;

-- View for scoring statistics
CREATE OR REPLACE VIEW scoring_statistics AS
SELECT
    DATE_TRUNC('day', scored_at) as date,
    COUNT(*) as total_scores,
    COUNT(DISTINCT lead_id) as unique_leads,
    AVG(score) as avg_score,
    AVG(confidence) as avg_confidence,
    COUNT(CASE WHEN score > 0.8 THEN 1 END) as high_scores,
    COUNT(CASE WHEN score < 0.2 THEN 1 END) as low_scores
FROM lead_scores
GROUP BY DATE_TRUNC('day', scored_at)
ORDER BY date DESC;

-- =====================================================
-- Initial Data Setup
-- =====================================================

-- Insert a placeholder for initial model (will be replaced by actual trained models)
INSERT INTO ml_models (
    model_id, model_type, version, status, accuracy, training_date,
    model_data, metadata
) VALUES (
    'placeholder_model',
    'baseline',
    '0.1.0',
    'inactive',
    0.5,
    CURRENT_TIMESTAMP,
    '{"placeholder": true}'::jsonb,
    '{"description": "Placeholder model - replace with trained model"}'::jsonb
) ON CONFLICT (model_id) DO NOTHING;

-- =====================================================
-- Permissions and Security
-- =====================================================

-- Note: Actual permissions should be set based on your application's security model
-- These are example grants that may need to be adjusted

-- Grant permissions for the application user (adjust username as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ml_models TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON lead_features TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON lead_scores TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON model_performance TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON training_snapshots TO your_app_user;

-- Grant permissions on sequences
-- GRANT USAGE ON SEQUENCE ml_models_id_seq TO your_app_user;
-- GRANT USAGE ON SEQUENCE lead_scores_id_seq TO your_app_user;
-- GRANT USAGE ON SEQUENCE model_performance_id_seq TO your_app_user;
-- GRANT USAGE ON SEQUENCE training_snapshots_id_seq TO your_app_user;

-- =====================================================
-- Migration Metadata
-- =====================================================

-- This migration creates the complete ML schema for lead scoring
-- Run this migration with: npm run migrate
-- Verify with: SELECT * FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'ml_%';