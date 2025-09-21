-- Migration: 009_add_ml_scoring.sql
-- Description: Add ML models, features, and scoring tables for lead scoring engine
-- Date: 2025-09-18

-- Create ML models table
CREATE TABLE IF NOT EXISTS ml_models (
  id SERIAL PRIMARY KEY,
  model_id VARCHAR(255) UNIQUE NOT NULL,
  model_type VARCHAR(100) NOT NULL,
  version VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  accuracy DECIMAL(5,4),
  precision DECIMAL(5,4),
  recall DECIMAL(5,4),
  f1_score DECIMAL(5,4),
  auc_score DECIMAL(5,4),
  training_date TIMESTAMP NOT NULL,
  model_data JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create feature store table
CREATE TABLE IF NOT EXISTS lead_features (
  lead_id INTEGER PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  features JSONB NOT NULL,
  feature_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR(100) NOT NULL DEFAULT 'ml_scoring',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create scoring history table
CREATE TABLE IF NOT EXISTS lead_scores (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  score DECIMAL(3,2) NOT NULL CHECK (score >= 0 AND score <= 1),
  score_type VARCHAR(50) NOT NULL DEFAULT 'ml',
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  model_version VARCHAR(50),
  features_used JSONB,
  insights JSONB,
  scored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lead_scores_lead_id (lead_id),
  INDEX idx_lead_scores_scored_at (scored_at),
  INDEX idx_lead_scores_score_type (score_type),
  INDEX idx_lead_scores_model_version (model_version)
);

-- Create model performance tracking table
CREATE TABLE IF NOT EXISTS model_performance (
  id SERIAL PRIMARY KEY,
  model_id VARCHAR(255) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,4) NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_model_performance_model_id (model_id),
  INDEX idx_model_performance_recorded_at (recorded_at),
  INDEX idx_model_performance_metric_name (metric_name)
);

-- Create training snapshots table
CREATE TABLE IF NOT EXISTS training_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_id VARCHAR(255) UNIQUE NOT NULL,
  data_range_start TIMESTAMP NOT NULL,
  data_range_end TIMESTAMP NOT NULL,
  record_count INTEGER NOT NULL,
  feature_count INTEGER NOT NULL,
  conversion_rate DECIMAL(5,4),
  model_metrics JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create feature importance tracking table
CREATE TABLE IF NOT EXISTS feature_importance (
  id SERIAL PRIMARY KEY,
  model_id VARCHAR(255) NOT NULL,
  feature_name VARCHAR(100) NOT NULL,
  importance_score DECIMAL(5,4) NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_feature_importance_model_id (model_id),
  INDEX idx_feature_importance_recorded_at (recorded_at)
);

-- Create model drift detection table
CREATE TABLE IF NOT EXISTS model_drift (
  id SERIAL PRIMARY KEY,
  model_id VARCHAR(255) NOT NULL,
  drift_type VARCHAR(100) NOT NULL,
  drift_score DECIMAL(5,4) NOT NULL,
  threshold DECIMAL(5,4) NOT NULL,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  details JSONB,
  INDEX idx_model_drift_model_id (model_id),
  INDEX idx_model_drift_detected_at (detected_at)
);

-- Create A/B testing table
CREATE TABLE IF NOT EXISTS ab_tests (
  id SERIAL PRIMARY KEY,
  test_id VARCHAR(255) UNIQUE NOT NULL,
  test_name VARCHAR(255) NOT NULL,
  model_a_id VARCHAR(255) NOT NULL,
  model_b_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP,
  winner_model_id VARCHAR(255),
  test_metrics JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ab_tests_status (status),
  INDEX idx_ab_tests_start_date (start_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ml_models_status ON ml_models(status);
CREATE INDEX IF NOT EXISTS idx_ml_models_training_date ON ml_models(training_date DESC);
CREATE INDEX IF NOT EXISTS idx_lead_features_last_updated ON lead_features(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_lead_scores_lead_id_scored_at ON lead_scores(lead_id, scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_performance_model_id_metric ON model_performance(model_id, metric_name);

-- Add comments for documentation
COMMENT ON TABLE ml_models IS 'Stores trained ML models with metadata and performance metrics';
COMMENT ON TABLE lead_features IS 'Feature store for ML model inputs extracted from lead data';
COMMENT ON TABLE lead_scores IS 'Historical scoring results with confidence and insights';
COMMENT ON TABLE model_performance IS 'Time-series performance metrics for ML models';
COMMENT ON TABLE training_snapshots IS 'Snapshots of training data for reproducibility';
COMMENT ON TABLE feature_importance IS 'Feature importance scores for model interpretability';
COMMENT ON TABLE model_drift IS 'Model drift detection and monitoring';
COMMENT ON TABLE ab_tests IS 'A/B testing framework for model comparison';

-- Insert initial baseline model record (will be populated by training service)
INSERT INTO ml_models (
  model_id,
  model_type,
  version,
  status,
  accuracy,
  training_date,
  metadata
) VALUES (
  'baseline_initial',
  'baseline',
  '1.0.0',
  'inactive',
  0.75,
  CURRENT_TIMESTAMP,
  '{"description": "Initial baseline model - logistic regression", "training_size": 0, "features": []}'::jsonb
) ON CONFLICT (model_id) DO NOTHING;