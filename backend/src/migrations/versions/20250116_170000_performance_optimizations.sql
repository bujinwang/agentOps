-- Description: Performance optimizations for database queries
-- Created: 2025-01-16T17:00:00.000Z

-- Up Migration

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_leads_user_status ON leads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_user_priority ON leads(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_leads_user_created_at ON leads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status_priority ON leads(status, priority);
-- Removed: idx_leads_follow_up_overdue - NOW() is not IMMUTABLE
CREATE INDEX IF NOT EXISTS idx_leads_budget_range ON leads(budget_min, budget_max) WHERE budget_min IS NOT NULL AND budget_max IS NOT NULL;

-- Partial indexes for frequently filtered data
CREATE INDEX IF NOT EXISTS idx_leads_active ON leads(created_at) WHERE status NOT IN ('Closed Won', 'Lost');
CREATE INDEX IF NOT EXISTS idx_leads_high_priority ON leads(created_at) WHERE priority = 'High';
CREATE INDEX IF NOT EXISTS idx_leads_unassigned ON leads(created_at) WHERE user_id IS NULL;

-- Interaction performance indexes
CREATE INDEX IF NOT EXISTS idx_interactions_lead_date ON interactions(lead_id, interaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_user_date ON interactions(user_id, interaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_type_date ON interactions(type, interaction_date DESC);

-- Task performance indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_status ON tasks(lead_id, is_completed);
-- Removed: idx_tasks_due_soon and idx_tasks_overdue - NOW() is not IMMUTABLE

-- Notification performance indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type_unread ON notifications(type, read) WHERE read = false;
-- Removed: idx_notifications_created_recent - NOW() is not IMMUTABLE

-- User performance indexes
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
-- Removed: idx_users_created_recent - NOW() is not IMMUTABLE

-- Full-text search indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_leads_search ON leads USING gin(to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone_number, '') || ' ' || COALESCE(notes, '')));
CREATE INDEX IF NOT EXISTS idx_tasks_search ON tasks USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '')));

-- Foreign key constraint optimizations (if not already present)
-- These help with CASCADE operations and referential integrity checks
ALTER TABLE leads DROP CONSTRAINT IF EXISTS fk_leads_user_id;
ALTER TABLE leads ADD CONSTRAINT fk_leads_user_id FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL;

ALTER TABLE interactions DROP CONSTRAINT IF EXISTS fk_interactions_lead_id;
ALTER TABLE interactions ADD CONSTRAINT fk_interactions_lead_id FOREIGN KEY (lead_id) REFERENCES leads(lead_id) ON DELETE CASCADE;

ALTER TABLE interactions DROP CONSTRAINT IF EXISTS fk_interactions_user_id;
ALTER TABLE interactions ADD CONSTRAINT fk_interactions_user_id FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_notifications_user_id;
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_lead_id;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_lead_id FOREIGN KEY (lead_id) REFERENCES leads(lead_id) ON DELETE CASCADE;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_user_id;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_user_id FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Create a view for dashboard statistics to improve query performance
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
  u.user_id,
  COUNT(DISTINCT l.lead_id) as total_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'New' THEN l.lead_id END) as new_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'Contacted' THEN l.lead_id END) as contacted_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'Qualified' THEN l.lead_id END) as qualified_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'Closed Won' THEN l.lead_id END) as closed_won,
  COUNT(DISTINCT CASE WHEN l.priority = 'High' THEN l.lead_id END) as high_priority_leads,
  COUNT(DISTINCT CASE WHEN l.follow_up_date <= NOW() THEN l.lead_id END) as overdue_follow_ups,
  COUNT(DISTINCT t.task_id) as total_tasks,
  COUNT(DISTINCT CASE WHEN t.is_completed = false THEN t.task_id END) as active_tasks,
  COUNT(DISTINCT CASE WHEN t.is_completed = true THEN t.task_id END) as completed_tasks,
  COUNT(DISTINCT CASE WHEN t.due_date <= NOW() AND t.is_completed = false THEN t.task_id END) as overdue_tasks,
  COUNT(DISTINCT n.notification_id) as total_notifications,
  COUNT(DISTINCT CASE WHEN n.read = false THEN n.notification_id END) as unread_notifications
FROM users u
LEFT JOIN leads l ON u.user_id = l.user_id
LEFT JOIN tasks t ON u.user_id = t.user_id
LEFT JOIN notifications n ON u.user_id = n.user_id
GROUP BY u.user_id;

-- Note: Cannot create indexes on regular views in PostgreSQL
-- Consider creating a materialized view for better performance if needed

-- Down Migration
DROP VIEW IF EXISTS dashboard_stats;

-- Drop composite indexes
DROP INDEX IF EXISTS idx_leads_user_status;
DROP INDEX IF EXISTS idx_leads_user_priority;
DROP INDEX IF EXISTS idx_leads_user_created_at;
DROP INDEX IF EXISTS idx_leads_status_priority;
DROP INDEX IF EXISTS idx_leads_follow_up_overdue;
DROP INDEX IF EXISTS idx_leads_budget_range;
DROP INDEX IF EXISTS idx_leads_active;
DROP INDEX IF EXISTS idx_leads_high_priority;
DROP INDEX IF EXISTS idx_leads_unassigned;
DROP INDEX IF EXISTS idx_interactions_lead_date;
DROP INDEX IF EXISTS idx_interactions_user_date;
DROP INDEX IF EXISTS idx_interactions_type_date;
DROP INDEX IF EXISTS idx_tasks_user_status;
DROP INDEX IF EXISTS idx_tasks_lead_status;
DROP INDEX IF EXISTS idx_tasks_due_soon;
DROP INDEX IF EXISTS idx_tasks_overdue;
DROP INDEX IF EXISTS idx_notifications_user_unread;
DROP INDEX IF EXISTS idx_notifications_type_unread;
DROP INDEX IF EXISTS idx_notifications_created_recent;
DROP INDEX IF EXISTS idx_users_email_lower;
DROP INDEX IF EXISTS idx_users_created_recent;
DROP INDEX IF EXISTS idx_leads_search;
DROP INDEX IF EXISTS idx_tasks_search;
-- Removed: DROP INDEX idx_dashboard_stats_user - cannot create indexes on regular views