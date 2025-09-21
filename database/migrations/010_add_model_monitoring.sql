-- Migration: 010_add_model_monitoring.sql
-- Description: Add model monitoring, drift detection, and performance tracking tables
-- Date: 2025-09-18

-- Create model monitoring configuration table
CREATE TABLE IF NOT EXISTS model_monitoring_config (
  id SERIAL PRIMARY KEY,
  model_id VARCHAR(255) NOT NULL,
  monitoring_type VARCHAR(100) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  threshold DECIMAL(5,4),
  check_interval_minutes INTEGER NOT NULL DEFAULT 60,
  last_check TIMESTAMP,
  config JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(model_id, monitoring_type),
  INDEX idx_model_monitoring_config_model_id (model_id),
  INDEX idx_model_monitoring_config_enabled (enabled)
);

-- Create model health checks table
CREATE TABLE IF NOT EXISTS model_health_checks (
  id SERIAL PRIMARY KEY,
  model_id VARCHAR(255) NOT NULL,
  check_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  score DECIMAL(5,4),
  details JSONB,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_model_health_checks_model_id (model_id),
  INDEX idx_model_health_checks_status (status),
  INDEX idx_model_health_checks_checked_at (checked_at)
);

-- Create prediction monitoring table
CREATE TABLE IF NOT EXISTS prediction_monitoring (
  id SERIAL PRIMARY KEY,
  model_id VARCHAR(255) NOT NULL,
  lead_id INTEGER,
  prediction DECIMAL(3,2) NOT NULL,
  confidence DECIMAL(3,2),
  actual_outcome DECIMAL(3,2),
  prediction_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  outcome_timestamp TIMESTAMP,
  feedback_received BOOLEAN DEFAULT false,
  feedback JSONB,
  INDEX idx_prediction_monitoring_model_id (model_id),
  INDEX idx_prediction_monitoring_lead_id (lead_id),
  INDEX idx_prediction_monitoring_prediction_timestamp (prediction_timestamp),
  INDEX idx_prediction_monitoring_feedback_received (feedback_received)
);

-- Create model retraining triggers table
CREATE TABLE IF NOT EXISTS retraining_triggers (
  id SERIAL PRIMARY KEY,
  trigger_id VARCHAR(255) UNIQUE NOT NULL,
  model_id VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(100) NOT NULL,
  threshold DECIMAL(5,4) NOT NULL,
  current_value DECIMAL(5,4),
  triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  action_taken VARCHAR(255),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  INDEX idx_retraining_triggers_model_id (model_id),
  INDEX idx_retraining_triggers_trigger_type (trigger_type),
  INDEX idx_retraining_triggers_resolved (resolved)
);

-- Create automated alerts table
CREATE TABLE IF NOT EXISTS model_alerts (
  id SERIAL PRIMARY KEY,
  alert_id VARCHAR(255) UNIQUE NOT NULL,
  model_id VARCHAR(255) NOT NULL,
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL DEFAULT 'medium',
  message TEXT NOT NULL,
  details JSONB,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by VARCHAR(255),
  acknowledged_at TIMESTAMP,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_model_alerts_model_id (model_id),
  INDEX idx_model_alerts_alert_type (alert_type),
  INDEX idx_model_alerts_severity (severity),
  INDEX idx_model_alerts_acknowledged (acknowledged),
  INDEX idx_model_alerts_resolved (resolved)
);

-- Create model usage statistics table
CREATE TABLE IF NOT EXISTS model_usage_stats (
  id SERIAL PRIMARY KEY,
  model_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  total_predictions INTEGER NOT NULL DEFAULT 0,
  avg_confidence DECIMAL(5,4),
  avg_prediction DECIMAL(3,2),
  unique_leads INTEGER NOT NULL DEFAULT 0,
  response_time_avg DECIMAL(8,2), -- in milliseconds
  error_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(model_id, date),
  INDEX idx_model_usage_stats_date (date),
  INDEX idx_model_usage_stats_model_id_date (model_id, date)
);

-- Create data quality monitoring table
CREATE TABLE IF NOT EXISTS data_quality_checks (
  id SERIAL PRIMARY KEY,
  check_id VARCHAR(255) UNIQUE NOT NULL,
  check_type VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  column_name VARCHAR(100),
  status VARCHAR(50) NOT NULL,
  value DECIMAL(10,4),
  threshold DECIMAL(10,4),
  details JSONB,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_data_quality_checks_check_type (check_type),
  INDEX idx_data_quality_checks_status (status),
  INDEX idx_data_quality_checks_checked_at (checked_at)
);

-- Create model comparison table for A/B testing
CREATE TABLE IF NOT EXISTS model_comparisons (
  id SERIAL PRIMARY KEY,
  comparison_id VARCHAR(255) UNIQUE NOT NULL,
  model_a_id VARCHAR(255) NOT NULL,
  model_b_id VARCHAR(255) NOT NULL,
  test_period_start TIMESTAMP NOT NULL,
  test_period_end TIMESTAMP,
  metric_name VARCHAR(100) NOT NULL,
  model_a_value DECIMAL(10,4),
  model_b_value DECIMAL(10,4),
  winner VARCHAR(10), -- 'A', 'B', or 'tie'
  confidence DECIMAL(5,4),
  statistical_significance BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_model_comparisons_model_a_id (model_a_id),
  INDEX idx_model_comparisons_model_b_id (model_b_id),
  INDEX idx_model_comparisons_test_period (test_period_start, test_period_end)
);

-- Create system health monitoring table
CREATE TABLE IF NOT EXISTS system_health_metrics (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,4) NOT NULL,
  unit VARCHAR(50),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tags JSONB,
  INDEX idx_system_health_metrics_metric_name (metric_name),
  INDEX idx_system_health_metrics_recorded_at (recorded_at)
);

-- Add additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_model_health_checks_model_type ON model_health_checks(model_id, check_type);
CREATE INDEX IF NOT EXISTS idx_prediction_monitoring_outcome ON prediction_monitoring(actual_outcome, outcome_timestamp);
CREATE INDEX IF NOT EXISTS idx_model_alerts_created_unresolved ON model_alerts(created_at) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_model_usage_stats_performance ON model_usage_stats(avg_confidence, response_time_avg);

-- Add comments for documentation
COMMENT ON TABLE model_monitoring_config IS 'Configuration for different types of model monitoring checks';
COMMENT ON TABLE model_health_checks IS 'Results of automated model health checks';
COMMENT ON TABLE prediction_monitoring IS 'Tracking of predictions vs actual outcomes for model evaluation';
COMMENT ON TABLE retraining_triggers IS 'Automated triggers for model retraining based on performance thresholds';
COMMENT ON TABLE model_alerts IS 'System alerts for model performance issues and anomalies';
COMMENT ON TABLE model_usage_stats IS 'Daily usage statistics for ML models';
COMMENT ON TABLE data_quality_checks IS 'Data quality monitoring for training and prediction data';
COMMENT ON TABLE model_comparisons IS 'Results of A/B testing between different models';
COMMENT ON TABLE system_health_metrics IS 'Overall system health metrics including ML service performance';

-- Insert default monitoring configurations
INSERT INTO model_monitoring_config (model_id, monitoring_type, threshold, check_interval_minutes, config) VALUES
('baseline_initial', 'accuracy_drift', 0.05, 1440, '{"description": "Monitor for accuracy degradation", "baseline_accuracy": 0.75}'::jsonb),
('baseline_initial', 'prediction_distribution', 0.10, 720, '{"description": "Monitor for changes in prediction distribution"}'::jsonb),
('baseline_initial', 'data_drift', 0.08, 1440, '{"description": "Monitor for changes in input data distribution"}'::jsonb)
ON CONFLICT (model_id, monitoring_type) DO NOTHING;

-- Insert initial data quality checks
INSERT INTO data_quality_checks (check_id, check_type, table_name, status, value, threshold, details) VALUES
('leads_conversion_rate', 'conversion_rate', 'leads', 'unknown', NULL, 0.05, '{"description": "Monitor conversion rate stability"}'::jsonb),
('lead_scores_distribution', 'score_distribution', 'lead_scores', 'unknown', NULL, 0.15, '{"description": "Monitor score distribution changes"}'::jsonb),
('features_missing_values', 'missing_data', 'lead_features', 'unknown', NULL, 0.10, '{"description": "Monitor feature data completeness"}'::jsonb)
ON CONFLICT (check_id) DO NOTHING;