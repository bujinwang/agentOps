-- Migration: Personalized Communication Templates
-- Date: 2025-01-12
-- Description: Add database schema for dynamic communication templates with personalization, A/B testing, and workflow integration

-- Create personalized communication templates table
CREATE TABLE personalized_templates (
    template_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    channel VARCHAR(50) NOT NULL DEFAULT 'email', -- email, sms, push
    subject_template TEXT, -- For email templates
    content_template TEXT NOT NULL,
    variables JSONB DEFAULT '{}', -- Available variables for personalization
    conditions JSONB DEFAULT '{}', -- Conditions for template selection
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

-- Create template variants for A/B testing
CREATE TABLE template_variants (
    variant_id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES personalized_templates(template_id) ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL,
    subject_template TEXT, -- For email variants
    content_template TEXT NOT NULL,
    variables JSONB DEFAULT '{}',
    is_control BOOLEAN DEFAULT false, -- Control variant for A/B testing
    weight DECIMAL(3,2) DEFAULT 1.0, -- Traffic distribution weight
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, variant_name)
);

-- Create A/B testing experiments table
CREATE TABLE ab_experiments (
    experiment_id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES personalized_templates(template_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- draft, running, completed, paused
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    target_metric VARCHAR(100) NOT NULL DEFAULT 'open_rate', -- open_rate, click_rate, response_rate, conversion_rate
    confidence_threshold DECIMAL(3,2) DEFAULT 0.95, -- Statistical significance threshold
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create experiment results tracking
CREATE TABLE experiment_results (
    result_id SERIAL PRIMARY KEY,
    experiment_id INTEGER NOT NULL REFERENCES ab_experiments(experiment_id) ON DELETE CASCADE,
    variant_id INTEGER NOT NULL REFERENCES template_variants(variant_id) ON DELETE CASCADE,
    lead_id INTEGER NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
    metric_value DECIMAL(5,4), -- Actual metric value (e.g., 0.1234 for 12.34%)
    conversion_occurred BOOLEAN DEFAULT false,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(experiment_id, variant_id, lead_id)
);

-- Create personalization rules table
CREATE TABLE personalization_rules (
    rule_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL, -- Lead characteristics that trigger this rule
    template_priority JSONB DEFAULT '[]', -- Ordered list of preferred templates
    score_weight DECIMAL(3,2) DEFAULT 1.0, -- How much this rule affects template selection
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create template usage tracking
CREATE TABLE template_usage (
    usage_id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES personalized_templates(template_id) ON DELETE SET NULL,
    variant_id INTEGER REFERENCES template_variants(variant_id) ON DELETE SET NULL,
    lead_id INTEGER NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
    workflow_id INTEGER REFERENCES workflow_configurations(workflow_id) ON DELETE SET NULL,
    channel VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'sent', -- sent, delivered, opened, clicked, responded, bounced
    error_message TEXT
);

-- Add indexes for performance
CREATE INDEX idx_personalized_templates_user_category ON personalized_templates(user_id, category);
CREATE INDEX idx_personalized_templates_channel ON personalized_templates(channel);
CREATE INDEX idx_template_variants_template ON template_variants(template_id);
CREATE INDEX idx_ab_experiments_template ON ab_experiments(template_id);
CREATE INDEX idx_ab_experiments_status ON ab_experiments(status);
CREATE INDEX idx_experiment_results_experiment ON experiment_results(experiment_id);
CREATE INDEX idx_experiment_results_variant ON experiment_results(variant_id);
CREATE INDEX idx_experiment_results_lead ON experiment_results(lead_id);
CREATE INDEX idx_personalization_rules_user ON personalization_rules(user_id);
CREATE INDEX idx_template_usage_template ON template_usage(template_id);
CREATE INDEX idx_template_usage_lead ON template_usage(lead_id);
CREATE INDEX idx_template_usage_workflow ON template_usage(workflow_id);
CREATE INDEX idx_template_usage_status ON template_usage(status);
CREATE INDEX idx_template_usage_sent_at ON template_usage(sent_at);

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_personalized_templates_updated_at
    BEFORE UPDATE ON personalized_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_experiments_updated_at
    BEFORE UPDATE ON ab_experiments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personalization_rules_updated_at
    BEFORE UPDATE ON personalization_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default templates for immediate use
INSERT INTO personalized_templates (user_id, name, description, category, channel, subject_template, content_template, variables, conditions) VALUES
(1, 'Welcome New Lead', 'Welcome message for new leads with property preferences', 'welcome', 'email',
 'Welcome to Our Real Estate Services, {{lead.firstName}}!',
 'Dear {{lead.firstName}},

Thank you for your interest in {{lead.propertyType}} properties in {{lead.location}}!

Based on your budget of {{lead.budget | currency}} and timeline of {{lead.timeline}}, I''ve identified some properties that might interest you.

Would you like to schedule a viewing or discuss your requirements in more detail?

Best regards,
{{agent.name}}
{{agent.phone}}
{{agent.email}}',
 '{"lead": ["firstName", "propertyType", "location", "budget", "timeline"], "agent": ["name", "phone", "email"]}',
 '{"leadSource": "new", "budget": {"min": 100000}}'),

(1, 'Follow-up High Interest', 'Follow-up for leads showing high engagement', 'followup', 'email',
 'Following up on your interest in {{lead.location}} properties',
 'Hi {{lead.firstName}},

I noticed you''ve been actively looking at {{lead.propertyType}} properties in {{lead.location}}. I wanted to follow up and see if you have any questions or would like to schedule a viewing.

We have some new listings that match your criteria of {{lead.budget | currency}} budget and {{lead.timeline}} timeline.

Please let me know how I can assist you further!

Best,
{{agent.name}}',
 '{"lead": ["firstName", "location", "propertyType", "budget", "timeline"], "agent": ["name"]}',
 '{"engagementScore": {"min": 7}, "lastContact": {"days": 7}}'),

(1, 'Price Objection Response', 'Response to leads concerned about pricing', 'objection', 'email',
 'Addressing your questions about {{lead.location}} market pricing',
 'Hello {{lead.firstName}},

Thank you for your interest in {{lead.location}} properties. I understand pricing is an important consideration.

The current market in {{lead.location}} shows that properties in your budget range of {{lead.budget | currency}} are competitively priced. Many sellers are motivated and open to negotiations.

I''d be happy to provide a detailed market analysis and discuss financing options that might work for you.

Would you like to discuss this further?

Warm regards,
{{agent.name}}',
 '{"lead": ["firstName", "location", "budget"], "agent": ["name"]}',
 '{"objectionType": "price", "budget": {"max": 500000}}');

-- Insert default variants for A/B testing
INSERT INTO template_variants (template_id, variant_name, subject_template, content_template, variables, is_control, weight) VALUES
(1, 'Control', 'Welcome to Our Real Estate Services, {{lead.firstName}}!',
 'Dear {{lead.firstName}},

Thank you for your interest in {{lead.propertyType}} properties in {{lead.location}}!

Based on your budget of {{lead.budget | currency}} and timeline of {{lead.timeline}}, I''ve identified some properties that might interest you.

Would you like to schedule a viewing or discuss your requirements in more detail?

Best regards,
{{agent.name}}
{{agent.phone}}
{{agent.email}}',
 '{"lead": ["firstName", "propertyType", "location", "budget", "timeline"], "agent": ["name", "phone", "email"]}', true, 0.5),

(1, 'Personalized', 'Welcome {{lead.firstName}} - Properties in {{lead.location}} await!',
 'Hi {{lead.firstName}},

I''m excited you''re looking for {{lead.propertyType}} properties in {{lead.location}}!

With your {{lead.budget | currency}} budget and {{lead.timeline}} timeline, I have some amazing options perfect for you.

Let''s chat about what you''re looking for - I''m here to help make your property search amazing!

Cheers,
{{agent.name}}
{{agent.phone}}',
 '{"lead": ["firstName", "propertyType", "location", "budget", "timeline"], "agent": ["name", "phone"]}', false, 0.5);