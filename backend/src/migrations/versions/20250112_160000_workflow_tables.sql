-- Description: Add workflow tables for automated follow-up system
-- Created: 2025-01-12T16:00:00.000Z

-- Up Migration

-- Workflow Configurations Table: Stores workflow definitions
CREATE TABLE IF NOT EXISTS workflow_configurations (
    workflow_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_score_min INTEGER,
    trigger_score_max INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Sequences Table: Defines the steps in each workflow
CREATE TABLE IF NOT EXISTS workflow_sequences (
    sequence_id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES workflow_configurations(workflow_id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'task', 'notification'
    template_id INTEGER,
    delay_hours INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workflow_id, step_number)
);

-- Workflow Templates Table: Stores email/SMS templates
CREATE TABLE IF NOT EXISTS workflow_templates (
    template_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'email', 'sms'
    subject VARCHAR(255), -- Only for email templates
    content TEXT NOT NULL,
    variables JSONB DEFAULT '{}', -- Available template variables
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Executions Table: Tracks execution of workflow steps
CREATE TABLE IF NOT EXISTS workflow_executions (
    execution_id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES workflow_configurations(workflow_id) ON DELETE CASCADE,
    lead_id INTEGER NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
    sequence_id INTEGER NOT NULL REFERENCES workflow_sequences(sequence_id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
    scheduled_at TIMESTAMPTZ NOT NULL,
    executed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_configurations_user_id ON workflow_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_configurations_active ON workflow_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_configurations_score_range ON workflow_configurations(trigger_score_min, trigger_score_max);

CREATE INDEX IF NOT EXISTS idx_workflow_sequences_workflow_id ON workflow_sequences(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_sequences_active ON workflow_sequences(is_active);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_user_id ON workflow_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_type ON workflow_templates(type);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_default ON workflow_templates(is_default);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_lead_id ON workflow_executions(lead_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_scheduled_at ON workflow_executions(scheduled_at);

-- Insert default templates
INSERT INTO workflow_templates (user_id, name, type, subject, content, variables, is_default) VALUES
(1, 'Welcome Email', 'email', 'Welcome to Our Real Estate Services!',
 'Dear {{first_name}} {{last_name}},

Thank you for your interest in our real estate services! We''ve noticed you''re looking for {{property_type}} properties in the {{desired_location}} area with a budget of ${{budget_min}} - ${{budget_max}}.

We''d love to help you find your perfect home. Our team specializes in {{property_type}} properties and we have several listings that match your criteria.

Would you be available for a quick call this week to discuss your requirements in more detail?

Best regards,
John Agent
Real Estate Professional',
 '{"first_name": "Lead first name", "last_name": "Lead last name", "property_type": "Type of property", "desired_location": "Desired location", "budget_min": "Minimum budget", "budget_max": "Maximum budget"}',
 true),

(1, 'Follow-up Email', 'email', 'Following up on your property search',
 'Hi {{first_name}},

I wanted to follow up on your recent inquiry about {{property_type}} properties in {{desired_location}}. We have some new listings that came on the market that might interest you.

Your budget range: ${{budget_min}} - ${{budget_max}}
Your preferences: {{bedrooms_min}}+ bedrooms, {{bathrooms_min}}+ bathrooms

Would you like me to send you details about these properties?

Best,
John Agent',
 '{"first_name": "Lead first name", "property_type": "Type of property", "desired_location": "Desired location", "budget_min": "Minimum budget", "budget_max": "Maximum budget", "bedrooms_min": "Minimum bedrooms", "bathrooms_min": "Minimum bathrooms"}',
 true),

(1, 'Welcome SMS', 'sms', NULL,
 'Hi {{first_name}}! Thanks for your interest in {{property_type}} properties. We have {{bedrooms_min}}+ bedroom options in {{desired_location}} within your ${{budget_min}}-${{budget_max}} budget. Call me at 555-0101 to discuss!',
 '{"first_name": "Lead first name", "property_type": "Type of property", "bedrooms_min": "Minimum bedrooms", "desired_location": "Desired location", "budget_min": "Minimum budget", "budget_max": "Maximum budget"}',
 true),

(1, 'Follow-up SMS', 'sms', NULL,
 '{{first_name}}, just checking in on your {{property_type}} search in {{desired_location}}. We have new listings in your price range. Ready to view some properties?',
 '{"first_name": "Lead first name", "property_type": "Type of property", "desired_location": "Desired location"}',
 true);

-- Insert sample workflow configuration
INSERT INTO workflow_configurations (user_id, name, description, trigger_score_min, trigger_score_max, is_active) VALUES
(1, 'High Value Lead Follow-up', 'Automated follow-up sequence for high-value leads (score 70+)', 70, NULL, true);

-- Insert sample workflow sequences
INSERT INTO workflow_sequences (workflow_id, step_number, action_type, template_id, delay_hours, is_active) VALUES
(1, 1, 'email', 1, 0, true), -- Welcome email immediately
(1, 2, 'sms', 3, 24, true), -- Welcome SMS after 1 day
(1, 3, 'email', 2, 72, true), -- Follow-up email after 3 days
(1, 4, 'sms', 4, 168, true); -- Follow-up SMS after 1 week

-- Down Migration
DROP TABLE IF EXISTS workflow_executions;
DROP TABLE IF EXISTS workflow_sequences;
DROP TABLE IF EXISTS workflow_templates;
DROP TABLE IF EXISTS workflow_configurations;