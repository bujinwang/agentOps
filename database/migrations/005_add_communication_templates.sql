-- Migration: 005_add_communication_templates.sql
-- Description: Add communication templates system with A/B testing support
-- Date: 2025-01-15

-- =====================================================
-- COMMUNICATION TEMPLATES SYSTEM
-- =====================================================

-- Template Categories Enum
CREATE TYPE template_category AS ENUM (
    'initial_contact',
    'follow_up',
    'property_showing',
    'proposal',
    'negotiation',
    'closing',
    'thank_you',
    'nurturing',
    're_engagement'
);

-- Communication Channels Enum
CREATE TYPE communication_channel AS ENUM (
    'email',
    'sms',
    'in_app',
    'push'
);

-- Template Status Enum
CREATE TYPE template_status AS ENUM (
    'draft',
    'active',
    'archived',
    'testing'
);

-- Variable Types Enum
CREATE TYPE variable_type AS ENUM (
    'string',
    'number',
    'date',
    'currency',
    'boolean',
    'array'
);

-- Variable Sources Enum
CREATE TYPE variable_source AS ENUM (
    'lead',
    'property',
    'agent',
    'system',
    'custom'
);

-- Condition Operators Enum
CREATE TYPE condition_operator AS ENUM (
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'greater_than',
    'less_than',
    'between',
    'in',
    'not_in',
    'exists',
    'not_exists'
);

-- =====================================================
-- CORE TEMPLATE TABLES
-- =====================================================

-- Main templates table
CREATE TABLE communication_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category template_category NOT NULL,
    channel communication_channel NOT NULL,
    status template_status NOT NULL DEFAULT 'draft',
    subject VARCHAR(500), -- for email templates
    content TEXT NOT NULL, -- HTML for email, text for SMS
    tags TEXT[] DEFAULT '{}',
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_default_template_per_category_channel
        EXCLUDE (category WITH =, channel WITH =)
        WHERE (is_default = true)
);

-- Template versions for change tracking
CREATE TABLE template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES communication_templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    subject VARCHAR(500),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    change_log TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Constraints
    UNIQUE(template_id, version)
);

-- Template variables
CREATE TABLE template_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES communication_templates(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    type variable_type NOT NULL,
    source variable_source NOT NULL,
    description TEXT,
    required BOOLEAN NOT NULL DEFAULT false,
    fallback TEXT NOT NULL,
    validation JSONB, -- VariableValidation as JSON
    examples TEXT[] DEFAULT '{}',
    category VARCHAR(100),

    -- Constraints
    UNIQUE(template_id, name)
);

-- Template conditions for matching
CREATE TABLE template_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES communication_templates(id) ON DELETE CASCADE,
    variable VARCHAR(100) NOT NULL,
    operator condition_operator NOT NULL,
    value JSONB NOT NULL,
    weight INTEGER NOT NULL DEFAULT 50 CHECK (weight >= 0 AND weight <= 100),
    description TEXT,

    -- Indexes
    INDEX idx_template_conditions_template_id ON template_conditions(template_id),
    INDEX idx_template_conditions_variable ON template_conditions(variable)
);

-- =====================================================
-- A/B TESTING TABLES
-- =====================================================

-- A/B Tests table
CREATE TABLE ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_id UUID NOT NULL REFERENCES communication_templates(id),
    category template_category NOT NULL,
    channel communication_channel NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'completed', 'paused', 'cancelled')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- A/B Test variants
CREATE TABLE ab_test_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    template_id UUID NOT NULL REFERENCES communication_templates(id),
    subject VARCHAR(500),
    content TEXT NOT NULL,
    weight INTEGER NOT NULL DEFAULT 50 CHECK (weight >= 0 AND weight <= 100),
    is_control BOOLEAN NOT NULL DEFAULT false,

    -- Constraints
    UNIQUE(test_id, name)
);

-- A/B Test criteria
CREATE TABLE ab_test_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    target_metric VARCHAR(50) NOT NULL
        CHECK (target_metric IN ('open_rate', 'click_rate', 'response_rate', 'conversion_rate')),
    minimum_sample_size INTEGER NOT NULL DEFAULT 1000,
    confidence_level DECIMAL(3,2) NOT NULL DEFAULT 0.95
        CHECK (confidence_level >= 0.80 AND confidence_level <= 0.99),
    test_duration INTEGER NOT NULL DEFAULT 14, -- days
    winner_threshold DECIMAL(5,2) NOT NULL DEFAULT 5.00 -- percentage
);

-- A/B Test results
CREATE TABLE ab_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES ab_test_variants(id),
    sent INTEGER NOT NULL DEFAULT 0,
    delivered INTEGER NOT NULL DEFAULT 0,
    opened INTEGER NOT NULL DEFAULT 0,
    clicked INTEGER NOT NULL DEFAULT 0,
    responded INTEGER NOT NULL DEFAULT 0,
    converted INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(test_id, variant_id)
);

-- =====================================================
-- TEMPLATE PERFORMANCE TRACKING
-- =====================================================

-- Template performance metrics
CREATE TABLE template_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES communication_templates(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    sent INTEGER NOT NULL DEFAULT 0,
    delivered INTEGER NOT NULL DEFAULT 0,
    opened INTEGER NOT NULL DEFAULT 0,
    clicked INTEGER NOT NULL DEFAULT 0,
    responded INTEGER NOT NULL DEFAULT 0,
    converted INTEGER NOT NULL DEFAULT 0,
    bounced INTEGER NOT NULL DEFAULT 0,
    unsubscribed INTEGER NOT NULL DEFAULT 0,
    average_response_time INTEGER, -- in minutes
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(template_id, date)
);

-- Template usage tracking
CREATE TABLE template_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES communication_templates(id),
    lead_id INTEGER REFERENCES leads(id),
    agent_id INTEGER REFERENCES users(id),
    channel communication_channel NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    converted_at TIMESTAMP WITH TIME ZONE,
    variables_used JSONB, -- variables that were populated
    performance_data JSONB, -- additional tracking data
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TEMPLATE ORGANIZATION
-- =====================================================

-- Template folders for organization
CREATE TABLE template_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES template_folders(id) ON DELETE CASCADE,
    color VARCHAR(7), -- hex color code
    icon VARCHAR(50),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Template tags
CREATE TABLE template_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) NOT NULL,
    description TEXT,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Template folder assignments
CREATE TABLE template_folder_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES communication_templates(id) ON DELETE CASCADE,
    folder_id UUID NOT NULL REFERENCES template_folders(id) ON DELETE CASCADE,

    -- Constraints
    UNIQUE(template_id, folder_id)
);

-- Template tag assignments
CREATE TABLE template_tag_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES communication_templates(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES template_tags(id) ON DELETE CASCADE,

    -- Constraints
    UNIQUE(template_id, tag_id)
);

-- =====================================================
-- TEMPLATE APPROVAL WORKFLOW
-- =====================================================

-- Approval workflows
CREATE TABLE approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    auto_approve_threshold INTEGER, -- usage count for auto-approval
    require_review_for template_category[] DEFAULT '{}',
    notify_on_approval BOOLEAN NOT NULL DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Approval workflow approvers
CREATE TABLE approval_workflow_approvers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),

    -- Constraints
    UNIQUE(workflow_id, user_id)
);

-- Template approvals
CREATE TABLE template_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES communication_templates(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES template_versions(id),
    requested_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested')),
    review_comments TEXT,
    changes_requested TEXT,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    approval_deadline TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- TEMPLATE RECOMMENDATION SYSTEM
-- =====================================================

-- Personalization rules
CREATE TABLE personalization_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Personalization rule conditions
CREATE TABLE personalization_rule_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES personalization_rules(id) ON DELETE CASCADE,
    variable VARCHAR(100) NOT NULL,
    operator condition_operator NOT NULL,
    value JSONB NOT NULL,
    weight INTEGER NOT NULL DEFAULT 50 CHECK (weight >= 0 AND weight <= 100)
);

-- Personalization rule actions
CREATE TABLE personalization_rule_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES personalization_rules(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL
        CHECK (type IN ('set_variable', 'modify_content', 'change_template', 'add_attachment')),
    target VARCHAR(255) NOT NULL,
    value JSONB NOT NULL
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Template search and filtering indexes
CREATE INDEX idx_communication_templates_category ON communication_templates(category);
CREATE INDEX idx_communication_templates_channel ON communication_templates(channel);
CREATE INDEX idx_communication_templates_status ON communication_templates(status);
CREATE INDEX idx_communication_templates_created_by ON communication_templates(created_by);
CREATE INDEX idx_communication_templates_priority ON communication_templates(priority);
CREATE INDEX idx_communication_templates_is_default ON communication_templates(is_default);

-- Template variable indexes
CREATE INDEX idx_template_variables_template_id ON template_variables(template_id);
CREATE INDEX idx_template_variables_name ON template_variables(name);
CREATE INDEX idx_template_variables_source ON template_variables(source);

-- Performance tracking indexes
CREATE INDEX idx_template_performance_template_id ON template_performance(template_id);
CREATE INDEX idx_template_performance_date ON template_performance(date);
CREATE INDEX idx_template_usage_template_id ON template_usage(template_id);
CREATE INDEX idx_template_usage_lead_id ON template_usage(lead_id);
CREATE INDEX idx_template_usage_sent_at ON template_usage(sent_at);

-- A/B testing indexes
CREATE INDEX idx_ab_tests_template_id ON ab_tests(template_id);
CREATE INDEX idx_ab_tests_status ON ab_tests(status);
CREATE INDEX idx_ab_test_variants_test_id ON ab_test_variants(test_id);
CREATE INDEX idx_ab_test_results_test_id ON ab_test_results(test_id);

-- Organization indexes
CREATE INDEX idx_template_folders_parent_id ON template_folders(parent_id);
CREATE INDEX idx_template_folder_assignments_template_id ON template_folder_assignments(template_id);
CREATE INDEX idx_template_folder_assignments_folder_id ON template_folder_assignments(folder_id);
CREATE INDEX idx_template_tag_assignments_template_id ON template_tag_assignments(template_id);
CREATE INDEX idx_template_tag_assignments_tag_id ON template_tag_assignments(tag_id);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_communication_templates_updated_at
    BEFORE UPDATE ON communication_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_folders_updated_at
    BEFORE UPDATE ON template_folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_tests_updated_at
    BEFORE UPDATE ON ab_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personalization_rules_updated_at
    BEFORE UPDATE ON personalization_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTIONS FOR TEMPLATE MATCHING
-- =====================================================

-- Function to calculate template match score
CREATE OR REPLACE FUNCTION calculate_template_match_score(
    template_id UUID,
    lead_data JSONB DEFAULT NULL,
    context_data JSONB DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    total_conditions INTEGER;
    matched_conditions INTEGER;
    total_weight INTEGER := 0;
    matched_weight INTEGER := 0;
    condition_record RECORD;
    variable_value JSONB;
    matches BOOLEAN;
BEGIN
    -- Count total conditions and their weights
    SELECT COUNT(*), COALESCE(SUM(weight), 0)
    INTO total_conditions, total_weight
    FROM template_conditions
    WHERE template_conditions.template_id = calculate_template_match_score.template_id;

    -- If no conditions, return 100 (perfect match)
    IF total_conditions = 0 THEN
        RETURN 100;
    END IF;

    -- Evaluate each condition
    matched_conditions := 0;
    matched_weight := 0;

    FOR condition_record IN
        SELECT * FROM template_conditions
        WHERE template_conditions.template_id = calculate_template_match_score.template_id
    LOOP
        -- Get variable value from lead_data or context_data
        variable_value := lead_data->condition_record.variable;
        IF variable_value IS NULL THEN
            variable_value := context_data->condition_record.variable;
        END IF;

        -- Evaluate condition based on operator
        matches := FALSE;
        CASE condition_record.operator
            WHEN 'equals' THEN
                matches := variable_value = condition_record.value;
            WHEN 'not_equals' THEN
                matches := variable_value != condition_record.value;
            WHEN 'contains' THEN
                matches := variable_value::text LIKE '%' || condition_record.value::text || '%';
            WHEN 'greater_than' THEN
                matches := (variable_value::numeric) > (condition_record.value::numeric);
            WHEN 'less_than' THEN
                matches := (variable_value::numeric) < (condition_record.value::numeric);
            WHEN 'exists' THEN
                matches := variable_value IS NOT NULL;
            WHEN 'not_exists' THEN
                matches := variable_value IS NULL;
            ELSE
                matches := FALSE;
        END CASE;

        IF matches THEN
            matched_conditions := matched_conditions + 1;
            matched_weight := matched_weight + condition_record.weight;
        END IF;
    END LOOP;

    -- Calculate weighted score
    IF total_weight > 0 THEN
        RETURN ((matched_weight::DECIMAL / total_weight::DECIMAL) * 100)::INTEGER;
    ELSE
        RETURN ((matched_conditions::DECIMAL / total_conditions::DECIMAL) * 100)::INTEGER;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Insert default template tags
INSERT INTO template_tags (name, color, description, created_by) VALUES
('urgent', '#FF5722', 'High-priority communications', 1),
('personalized', '#2196F3', 'Highly personalized content', 1),
('automated', '#4CAF50', 'Automated workflow triggers', 1),
('manual', '#FF9800', 'Manual agent communications', 1),
('follow-up', '#9C27B0', 'Follow-up communications', 1),
('closing', '#FFD700', 'Deal closing communications', 1);

-- Insert sample approval workflow
INSERT INTO approval_workflows (name, description, auto_approve_threshold, require_review_for, created_by) VALUES
('Standard Template Approval', 'Standard approval workflow for communication templates', 100,
 ARRAY['closing', 'negotiation'], 1);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Add comment to track migration
COMMENT ON DATABASE CURRENT_DATABASE IS 'Migration 005_add_communication_templates completed on ' || NOW()::text;