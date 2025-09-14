-- Users Table: For authentication and associating leads/tasks to users
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Store hashed passwords (e.g., bcrypt)
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Leads Table: Core table for storing lead information
CREATE TABLE leads (
    lead_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL, -- Associate lead with a user, SET NULL if user is deleted
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone_number VARCHAR(50),
    source VARCHAR(100), -- e.g., 'Website Form', 'Facebook Ad', 'Manual Entry', 'Referral'
    status VARCHAR(50) DEFAULT 'New', -- e.g., 'New', 'Contacted', 'Qualified', 'Showing Scheduled', 'Offer Made', 'Closed Won', 'Closed Lost', 'Archived'
    priority VARCHAR(50) DEFAULT 'Medium', -- e.g., 'High', 'Medium', 'Low'
    budget_min DECIMAL(12, 2),
    budget_max DECIMAL(12, 2),
    desired_location TEXT,
    property_type VARCHAR(100), -- e.g., 'Condo', 'House', 'Townhouse', 'Land'
    bedrooms_min INTEGER,
    bathrooms_min DECIMAL(2,1), -- e.g. 1.5 for 1 full 1 half
    notes TEXT,
    ai_summary TEXT, -- For AI-generated summary of lead's needs
    last_contacted_at TIMESTAMPTZ,
    follow_up_date TIMESTAMPTZ,
    -- Scoring fields
    score DECIMAL(5,2), -- Calculated score (0-100)
    score_category VARCHAR(20), -- 'High', 'Medium', 'Low'
    score_breakdown JSONB, -- Detailed scoring components as JSON
    score_last_calculated TIMESTAMPTZ, -- When score was last calculated
    score_history JSONB, -- Historical scores for trend analysis
    manual_score_override DECIMAL(5,2), -- Manual override by agent
    manual_score_reason TEXT, -- Reason for manual override
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Interactions Table: To log all activities related to a lead
CREATE TABLE interactions (
    interaction_id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE, -- If lead is deleted, interactions are deleted
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL, -- Who performed the interaction
    type VARCHAR(100) NOT NULL, -- e.g., 'Email Sent', 'Call Logged', 'SMS Sent', 'Note Added', 'Status Change', 'Meeting Scheduled'
    content TEXT, -- e.g., email body, call summary, SMS text, note content
    interaction_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table: For system notifications and reminders
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'info', 'warning', 'success', 'error', 'reminder'
    read BOOLEAN DEFAULT FALSE,
    related_id INTEGER, -- ID of related entity (lead_id, task_id, etc.)
    related_type VARCHAR(50), -- 'lead', 'task', 'interaction'
    action_url VARCHAR(500), -- Deep link to relevant screen
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Tasks Table: For managing follow-ups and other to-dos related to leads or general tasks
CREATE TABLE tasks (
    task_id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(lead_id) ON DELETE CASCADE, -- Optional: link task to a specific lead
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE, -- Task assigned to user
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    priority VARCHAR(50) DEFAULT 'Medium', -- e.g., 'High', 'Medium', 'Low'
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Scoring Criteria Table: For configurable scoring parameters
CREATE TABLE scoring_criteria (
    criteria_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- e.g., 'default', 'premium', 'basic'
    is_active BOOLEAN DEFAULT TRUE,
    budget_weights JSONB, -- {"high": {"min": 500000, "max": 999999999, "score": 30}, ...}
    timeline_weights JSONB, -- {"urgent": {"days": 30, "score": 25}, ...}
    property_type_weights JSONB, -- {"House": 20, "Condo": 18, ...}
    location_weights JSONB, -- {"premium": ["downtown", ...], "standard": [...], "score": {...}}
    engagement_weights JSONB, -- {"high": {"interactions": 5, "score": 10}, ...}
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert default scoring criteria
INSERT INTO scoring_criteria (name, budget_weights, timeline_weights, property_type_weights, location_weights, engagement_weights) VALUES (
    'default',
    '{"high": {"min": 500000, "max": 999999999, "score": 30}, "medium": {"min": 200000, "max": 499999, "score": 20}, "low": {"min": 0, "max": 199999, "score": 10}}',
    '{"urgent": {"days": 30, "score": 25}, "soon": {"days": 90, "score": 20}, "flexible": {"days": 365, "score": 10}}',
    '{"House": 20, "Condo": 18, "Townhouse": 16, "Land": 12, "Other": 10}',
    '{"premium": ["downtown", "uptown", "west end", "south granville"], "standard": ["commercial drive", "kitsilano", "mount pleasant"], "score": {"premium": 15, "standard": 12, "other": 8}}',
    '{"high": {"interactions": 5, "score": 10}, "medium": {"interactions": 3, "score": 7}, "low": {"interactions": 1, "score": 3}}'
);

-- Indexes for performance
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_priority ON leads(priority);
CREATE INDEX idx_leads_email ON leads(email); -- If searching by email is common
CREATE INDEX idx_leads_follow_up_date ON leads(follow_up_date);
CREATE INDEX idx_leads_score ON leads(score);
CREATE INDEX idx_leads_score_category ON leads(score_category);
CREATE INDEX idx_leads_score_last_calculated ON leads(score_last_calculated);
CREATE INDEX idx_scoring_criteria_active ON scoring_criteria(is_active);

CREATE INDEX idx_interactions_lead_id ON interactions(lead_id);
CREATE INDEX idx_interactions_user_id ON interactions(user_id);
CREATE INDEX idx_interactions_type ON interactions(type);

CREATE INDEX idx_tasks_lead_id ON tasks(lead_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_is_completed ON tasks(is_completed);

-- Workflow Configurations Table: For automated follow-up workflow definitions
CREATE TABLE workflow_configurations (
    workflow_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    trigger_score_min DECIMAL(5,2), -- Minimum score to trigger workflow
    trigger_score_max DECIMAL(5,2), -- Maximum score to trigger workflow
    trigger_conditions JSONB, -- Additional trigger conditions as JSON
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Sequences Table: Defines the sequence of follow-up actions
CREATE TABLE workflow_sequences (
    sequence_id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES workflow_configurations(workflow_id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'task', 'notification'
    delay_hours INTEGER DEFAULT 0, -- Hours to wait before executing
    template_id INTEGER, -- Reference to template (can be null for tasks)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workflow_id, step_number)
);

-- Workflow Templates Table: Email and SMS templates for follow-ups
CREATE TABLE workflow_templates (
    template_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'email', 'sms'
    subject VARCHAR(255), -- For email templates
    content TEXT NOT NULL, -- Template content with variables
    variables JSONB, -- Available variables for personalization
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Executions Table: Tracks execution of workflow sequences
CREATE TABLE workflow_executions (
    execution_id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES workflow_configurations(workflow_id) ON DELETE CASCADE,
    lead_id INTEGER NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
    sequence_id INTEGER NOT NULL REFERENCES workflow_sequences(sequence_id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'completed'
    scheduled_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for workflow tables
CREATE INDEX idx_workflow_configurations_user_id ON workflow_configurations(user_id);
CREATE INDEX idx_workflow_configurations_active ON workflow_configurations(is_active);
CREATE INDEX idx_workflow_sequences_workflow_id ON workflow_sequences(workflow_id);
CREATE INDEX idx_workflow_templates_user_id ON workflow_templates(user_id);
CREATE INDEX idx_workflow_templates_type ON workflow_templates(type);
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_lead_id ON workflow_executions(lead_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_scheduled_at ON workflow_executions(scheduled_at);
