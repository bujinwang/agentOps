-- Add notifications table for user notifications system
-- Migration: 013_add_notifications.sql

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info', -- info, warning, success, error, lead_update, task_update, etc.
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    related_id INTEGER, -- ID of related entity (lead, task, etc.)
    related_type VARCHAR(50), -- lead, task, property, etc.
    action_url TEXT, -- URL for action button
    data JSONB, -- Additional structured data
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_related ON notifications(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- Create trigger to set read_at when read becomes true
CREATE OR REPLACE FUNCTION set_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.read = TRUE AND OLD.read = FALSE THEN
        NEW.read_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notifications_read_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION set_notification_read_at();

-- Insert some sample notifications for testing
INSERT INTO notifications (user_id, title, message, type, priority, related_type, related_id, created_at) VALUES
(1, 'Welcome to Real Estate CRM', 'Your account has been set up successfully. Start by adding your first lead!', 'info', 'normal', NULL, NULL, NOW()),
(1, 'Lead Status Update', 'Jane Smith''s status changed to "Contacted"', 'lead_update', 'normal', 'lead', 1, NOW() - INTERVAL '2 hours'),
(1, 'Task Due Soon', 'Send property listings task is due tomorrow', 'task_update', 'high', 'task', 1, NOW() - INTERVAL '1 hour'),
(1, 'New Lead Added', 'Michael Johnson was added as a new lead', 'lead_update', 'normal', 'lead', 2, NOW() - INTERVAL '30 minutes'),
(2, 'System Maintenance', 'Scheduled maintenance will occur tonight from 2-4 AM EST', 'warning', 'normal', NULL, NULL, NOW() - INTERVAL '4 hours');

-- Add comment to table
COMMENT ON TABLE notifications IS 'User notifications and alerts system';
COMMENT ON COLUMN notifications.related_id IS 'ID of the related entity (lead, task, property, etc.)';
COMMENT ON COLUMN notifications.related_type IS 'Type of related entity for polymorphic relationships';
COMMENT ON COLUMN notifications.action_url IS 'URL for action button in notification UI';
COMMENT ON COLUMN notifications.data IS 'Additional structured data as JSON';
COMMENT ON COLUMN notifications.expires_at IS 'Optional expiration date for time-sensitive notifications';