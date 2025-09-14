-- Migration: Add property status management functionality
-- Date: 2025-01-14
-- Description: Creates tables and functions for comprehensive property status tracking and management

-- Status changes history table
CREATE TABLE IF NOT EXISTS status_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    old_status property_status NOT NULL,
    new_status property_status NOT NULL,
    changed_by INTEGER NOT NULL REFERENCES users(id),
    change_reason status_change_reason NOT NULL,
    custom_reason TEXT,
    change_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    transition_type status_transition_type DEFAULT 'user_initiated',
    mls_update BOOLEAN DEFAULT FALSE,
    mls_transaction_id VARCHAR(100),
    automated BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status transition rules table
CREATE TABLE IF NOT EXISTS status_transition_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_status property_status NOT NULL,
    to_status property_status NOT NULL,
    requires_reason BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE,
    allowed_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
    validation_rules JSONB DEFAULT '[]'::jsonb,
    automatic_transitions JSONB DEFAULT '[]'::jsonb,
    notifications JSONB DEFAULT '[]'::jsonb,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(from_status, to_status)
);

-- Status validation rules table
CREATE TABLE IF NOT EXISTS status_validation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('required_field', 'date_validation', 'business_rule', 'custom_validation')),
    field_name VARCHAR(100),
    validation_function TEXT NOT NULL,
    error_message TEXT NOT NULL,
    severity status_validation_severity DEFAULT 'error',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status automatic transitions table
CREATE TABLE IF NOT EXISTS status_automatic_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES status_transition_rules(id) ON DELETE CASCADE,
    trigger_condition TEXT NOT NULL,
    delay_days INTEGER,
    notification_days_before INTEGER,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status notification rules table
CREATE TABLE IF NOT EXISTS status_notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES status_transition_rules(id) ON DELETE CASCADE,
    notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('email', 'push', 'sms', 'in_app')),
    recipient_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
    recipient_users INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    template_id VARCHAR(100),
    subject_template TEXT,
    message_template TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status bulk operations table
CREATE TABLE IF NOT EXISTS status_bulk_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id VARCHAR(100) NOT NULL UNIQUE,
    property_ids INTEGER[] NOT NULL,
    new_status property_status NOT NULL,
    change_reason status_change_reason NOT NULL,
    custom_reason TEXT,
    notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    results JSONB DEFAULT '[]'::jsonb,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Status analytics table
CREATE TABLE IF NOT EXISTS status_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    period status_analytics_period NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status_distribution JSONB DEFAULT '{}'::jsonb,
    status_percentages JSONB DEFAULT '{}'::jsonb,
    total_transitions INTEGER DEFAULT 0,
    transitions_by_type JSONB DEFAULT '{}'::jsonb,
    top_transition_paths JSONB DEFAULT '[]'::jsonb,
    average_status_duration JSONB DEFAULT '{}'::jsonb,
    status_change_frequency DECIMAL(10,2) DEFAULT 0,
    mls_sync_success_rate DECIMAL(5,2) DEFAULT 0,
    automated_transition_success_rate DECIMAL(5,2) DEFAULT 0,
    manual_transition_avg_time INTEGER DEFAULT 0,
    status_trends JSONB DEFAULT '[]'::jsonb,
    transition_trends JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(property_id, period, start_date, end_date)
);

-- Status alerts table
CREATE TABLE IF NOT EXISTS status_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('warning', 'error', 'info')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    action_required BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by INTEGER REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE
);

-- Status approval workflows table
CREATE TABLE IF NOT EXISTS status_approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    trigger_transitions JSONB NOT NULL,
    approvers JSONB NOT NULL,
    approval_criteria TEXT,
    auto_approve_after_days INTEGER,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status custom reasons table
CREATE TABLE IF NOT EXISTS status_custom_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reason status_change_reason NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    requires_additional_info BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_changes_property_id
ON status_changes (property_id, change_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_changes_changed_by
ON status_changes (changed_by, change_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_changes_change_date
ON status_changes (change_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_changes_new_status
ON status_changes (new_status, change_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_transition_rules_active
ON status_transition_rules (from_status, to_status, active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_bulk_operations_status
ON status_bulk_operations (status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_bulk_operations_created_by
ON status_bulk_operations (created_by, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_analytics_property_period
ON status_analytics (property_id, period, start_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_alerts_property_type
ON status_alerts (property_id, alert_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_alerts_acknowledged
ON status_alerts (acknowledged, created_at DESC);

-- Partial indexes for active records
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_validation_rules_active
ON status_validation_rules (rule_type) WHERE active = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_automatic_transitions_active
ON status_automatic_transitions (rule_id) WHERE active = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_notification_rules_active
ON status_notification_rules (rule_id) WHERE active = TRUE;

-- GIN indexes for JSONB fields
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_changes_metadata
ON status_changes USING GIN (metadata);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_transition_rules_validation
ON status_transition_rules USING GIN (validation_rules);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_transition_rules_notifications
ON status_transition_rules USING GIN (notifications);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_analytics_distribution
ON status_analytics USING GIN (status_distribution);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_analytics_transitions
ON status_analytics USING GIN (transitions_by_type);

-- Functions for status management

-- Function to record status change
CREATE OR REPLACE FUNCTION record_status_change(
    p_property_id INTEGER,
    p_old_status property_status,
    p_new_status property_status,
    p_changed_by INTEGER,
    p_change_reason status_change_reason,
    p_custom_reason TEXT DEFAULT NULL,
    p_transition_type status_transition_type DEFAULT 'user_initiated',
    p_mls_update BOOLEAN DEFAULT FALSE,
    p_mls_transaction_id VARCHAR(100) DEFAULT NULL,
    p_automated BOOLEAN DEFAULT FALSE,
    p_requires_approval BOOLEAN DEFAULT FALSE,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    change_id UUID;
BEGIN
    INSERT INTO status_changes (
        property_id,
        old_status,
        new_status,
        changed_by,
        change_reason,
        custom_reason,
        transition_type,
        mls_update,
        mls_transaction_id,
        automated,
        requires_approval,
        metadata,
        notes
    ) VALUES (
        p_property_id,
        p_old_status,
        p_new_status,
        p_changed_by,
        p_change_reason,
        p_custom_reason,
        p_transition_type,
        p_mls_update,
        p_mls_transaction_id,
        p_automated,
        p_requires_approval,
        p_metadata,
        p_notes
    ) RETURNING id INTO change_id;

    -- Update property status
    UPDATE properties
    SET status = p_new_status,
        updated_at = NOW()
    WHERE id = p_property_id;

    RETURN change_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get status history for a property
CREATE OR REPLACE FUNCTION get_property_status_history(p_property_id INTEGER)
RETURNS TABLE (
    id UUID,
    old_status property_status,
    new_status property_status,
    changed_by INTEGER,
    change_reason status_change_reason,
    custom_reason TEXT,
    change_date TIMESTAMP WITH TIME ZONE,
    transition_type status_transition_type,
    changed_by_name VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sc.id,
        sc.old_status,
        sc.new_status,
        sc.changed_by,
        sc.change_reason,
        sc.custom_reason,
        sc.change_date,
        sc.transition_type,
        COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as changed_by_name
    FROM status_changes sc
    LEFT JOIN users u ON sc.changed_by = u.id
    WHERE sc.property_id = p_property_id
    ORDER BY sc.change_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to validate status transition
CREATE OR REPLACE FUNCTION validate_status_transition(
    p_from_status property_status,
    p_to_status property_status,
    p_user_role VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE (
    is_valid BOOLEAN,
    error_message TEXT,
    requires_approval BOOLEAN
) AS $$
DECLARE
    rule_record RECORD;
    user_allowed BOOLEAN := FALSE;
BEGIN
    -- Find applicable transition rule
    SELECT * INTO rule_record
    FROM status_transition_rules
    WHERE from_status = p_from_status
      AND to_status = p_to_status
      AND active = TRUE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Invalid status transition', FALSE;
        RETURN;
    END IF;

    -- Check if user role is allowed
    IF p_user_role IS NOT NULL THEN
        user_allowed := p_user_role = ANY(rule_record.allowed_roles);
        IF NOT user_allowed AND array_length(rule_record.allowed_roles, 1) > 0 THEN
            RETURN QUERY SELECT FALSE, 'User role not authorized for this transition', FALSE;
            RETURN;
        END IF;
    END IF;

    -- Return validation result
    RETURN QUERY SELECT TRUE, NULL::TEXT, rule_record.requires_approval;
END;
$$ LANGUAGE plpgsql;

-- Function to get status analytics
CREATE OR REPLACE FUNCTION get_status_analytics(
    p_property_id INTEGER DEFAULT NULL,
    p_period status_analytics_period DEFAULT 'month',
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    status_dist JSONB;
    transitions JSONB;
BEGIN
    -- Calculate status distribution
    WITH status_counts AS (
        SELECT
            status,
            COUNT(*) as count
        FROM properties
        WHERE (p_property_id IS NULL OR id = p_property_id)
          AND created_at >= p_start_date
          AND (updated_at <= p_end_date OR updated_at IS NULL)
        GROUP BY status
    )
    SELECT jsonb_object_agg(status, count) INTO status_dist
    FROM status_counts;

    -- Calculate transitions
    WITH transition_counts AS (
        SELECT
            transition_type,
            COUNT(*) as count
        FROM status_changes
        WHERE (p_property_id IS NULL OR property_id = p_property_id)
          AND change_date >= p_start_date
          AND change_date <= p_end_date
        GROUP BY transition_type
    )
    SELECT jsonb_object_agg(transition_type, count) INTO transitions
    FROM transition_counts;

    -- Build result
    result := jsonb_build_object(
        'period', p_period,
        'start_date', p_start_date,
        'end_date', p_end_date,
        'status_distribution', COALESCE(status_dist, '{}'::jsonb),
        'total_transitions', (
            SELECT COUNT(*) FROM status_changes
            WHERE (p_property_id IS NULL OR property_id = p_property_id)
              AND change_date >= p_start_date
              AND change_date <= p_end_date
        ),
        'transitions_by_type', COALESCE(transitions, '{}'::jsonb)
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create status alert
CREATE OR REPLACE FUNCTION create_status_alert(
    p_alert_type VARCHAR(20),
    p_title VARCHAR(200),
    p_message TEXT,
    p_property_id INTEGER DEFAULT NULL,
    p_action_required BOOLEAN DEFAULT FALSE,
    p_action_url VARCHAR(500) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    alert_id UUID;
BEGIN
    INSERT INTO status_alerts (
        alert_type,
        title,
        message,
        property_id,
        action_required,
        action_url
    ) VALUES (
        p_alert_type,
        p_title,
        p_message,
        p_property_id,
        p_action_required,
        p_action_url
    ) RETURNING id INTO alert_id;

    RETURN alert_id;
END;
$$ LANGUAGE plpgsql;

-- Function to acknowledge status alert
CREATE OR REPLACE FUNCTION acknowledge_status_alert(
    p_alert_id UUID,
    p_user_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE status_alerts
    SET acknowledged = TRUE,
        acknowledged_by = p_user_id,
        acknowledged_at = NOW()
    WHERE id = p_alert_id
      AND acknowledged = FALSE;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_status_transition_rules_updated_at
    BEFORE UPDATE ON status_transition_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_status_validation_rules_updated_at
    BEFORE UPDATE ON status_validation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_status_automatic_transitions_updated_at
    BEFORE UPDATE ON status_automatic_transitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_status_notification_rules_updated_at
    BEFORE UPDATE ON status_notification_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_status_analytics_updated_at
    BEFORE UPDATE ON status_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_status_approval_workflows_updated_at
    BEFORE UPDATE ON status_approval_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default transition rules
INSERT INTO status_transition_rules (
    from_status, to_status, requires_reason, requires_approval, allowed_roles
) VALUES
    ('active', 'pending', TRUE, FALSE, ARRAY['agent', 'admin']),
    ('active', 'sold', TRUE, TRUE, ARRAY['agent', 'admin']),
    ('active', 'withdrawn', TRUE, FALSE, ARRAY['agent', 'admin', 'seller']),
    ('active', 'expired', FALSE, FALSE, ARRAY[]),
    ('pending', 'active', TRUE, FALSE, ARRAY['agent', 'admin']),
    ('pending', 'sold', TRUE, TRUE, ARRAY['agent', 'admin']),
    ('pending', 'withdrawn', TRUE, FALSE, ARRAY['agent', 'admin', 'seller']),
    ('sold', 'active', TRUE, TRUE, ARRAY['admin']),
    ('withdrawn', 'active', TRUE, FALSE, ARRAY['agent', 'admin']),
    ('expired', 'active', TRUE, FALSE, ARRAY['agent', 'admin'])
ON CONFLICT (from_status, to_status) DO NOTHING;

-- Insert default custom reasons
INSERT INTO status_custom_reasons (reason, label, description, requires_additional_info) VALUES
    ('contract_signed', 'Contract Signed', 'Property is under contract', FALSE),
    ('price_change', 'Price Change', 'Listing price has been updated', FALSE),
    ('property_sold', 'Property Sold', 'Property has been sold', TRUE),
    ('withdrawn_by_seller', 'Withdrawn by Seller', 'Seller decided to withdraw the listing', TRUE),
    ('inspection_issues', 'Inspection Issues', 'Issues found during inspection', TRUE),
    ('financing_fallen_through', 'Financing Fallen Through', 'Buyer financing did not go through', TRUE),
    ('buyer_backed_out', 'Buyer Backed Out', 'Buyer decided not to proceed', TRUE),
    ('other', 'Other', 'Other reason for status change', TRUE)
ON CONFLICT (reason) DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON status_changes TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON status_transition_rules TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON status_validation_rules TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON status_automatic_transitions TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON status_notification_rules TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON status_bulk_operations TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON status_analytics TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON status_alerts TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON status_approval_workflows TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON status_custom_reasons TO PUBLIC;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION record_status_change TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_property_status_history TO PUBLIC;
GRANT EXECUTE ON FUNCTION validate_status_transition TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_status_analytics TO PUBLIC;
GRANT EXECUTE ON FUNCTION create_status_alert TO PUBLIC;
GRANT EXECUTE ON FUNCTION acknowledge_status_alert TO PUBLIC;

-- Add comments for documentation
COMMENT ON TABLE status_changes IS 'Tracks all property status changes with full audit trail';
COMMENT ON TABLE status_transition_rules IS 'Defines valid status transitions and their requirements';
COMMENT ON TABLE status_validation_rules IS 'Custom validation rules for status transitions';
COMMENT ON TABLE status_bulk_operations IS 'Tracks bulk status change operations';
COMMENT ON TABLE status_analytics IS 'Aggregated analytics data for status changes and trends';
COMMENT ON TABLE status_alerts IS 'System-generated alerts for status-related issues';
COMMENT ON TABLE status_approval_workflows IS 'Approval workflows for sensitive status changes';

COMMENT ON FUNCTION record_status_change IS 'Records a status change and updates the property';
COMMENT ON FUNCTION get_property_status_history IS 'Retrieves complete status history for a property';
COMMENT ON FUNCTION validate_status_transition IS 'Validates if a status transition is allowed';
COMMENT ON FUNCTION get_status_analytics IS 'Generates status analytics for reporting';
COMMENT ON FUNCTION create_status_alert IS 'Creates a new status alert';
COMMENT ON FUNCTION acknowledge_status_alert IS 'Marks a status alert as acknowledged';