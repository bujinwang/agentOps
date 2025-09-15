-- Revenue Tracking System Migration
-- Creates tables for comprehensive revenue analytics and commission tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Revenue Categories Table
CREATE TABLE revenue_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category_type VARCHAR(50) NOT NULL, -- 'sale', 'rental', 'referral', 'service', 'other'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Revenue Transactions Table
CREATE TABLE revenue_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    property_id UUID REFERENCES properties(id),
    lead_id UUID REFERENCES leads(id),
    agent_id UUID NOT NULL REFERENCES users(id),
    client_id UUID REFERENCES users(id),

    -- Transaction Details
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    category_id UUID NOT NULL REFERENCES revenue_categories(id),
    transaction_type VARCHAR(50) NOT NULL, -- 'income', 'expense', 'commission'

    -- Transaction Metadata
    transaction_date DATE NOT NULL,
    due_date DATE,
    payment_date DATE,
    payment_method VARCHAR(50), -- 'cash', 'check', 'wire', 'credit_card', etc.

    -- Status and Processing
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'cancelled', 'refunded'
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency VARCHAR(20), -- 'monthly', 'quarterly', 'yearly'

    -- Additional Details
    description TEXT,
    notes TEXT,
    external_reference VARCHAR(255), -- Reference to external systems

    -- Audit Fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Commission Structures Table
CREATE TABLE commission_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    structure_type VARCHAR(50) NOT NULL, -- 'percentage', 'flat_fee', 'tiered', 'split'

    -- Commission Calculation Rules
    base_percentage DECIMAL(5,2), -- For percentage-based commissions
    flat_amount DECIMAL(10,2), -- For flat fee commissions

    -- Tiered Structure (JSON for complex rules)
    tier_rules JSONB,

    -- Split Rules (for team commissions)
    split_rules JSONB,

    -- Conditions and Constraints
    min_amount DECIMAL(10,2),
    max_amount DECIMAL(10,2),
    effective_date DATE NOT NULL,
    expiry_date DATE,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agent Commissions Table
CREATE TABLE agent_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES revenue_transactions(id),
    agent_id UUID NOT NULL REFERENCES users(id),
    commission_structure_id UUID REFERENCES commission_structures(id),

    -- Commission Details
    gross_amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2),
    commission_amount DECIMAL(10,2) NOT NULL,

    -- Adjustments and Deductions
    adjustments DECIMAL(10,2) DEFAULT 0,
    bonuses DECIMAL(10,2) DEFAULT 0,
    penalties DECIMAL(10,2) DEFAULT 0,
    taxes DECIMAL(10,2) DEFAULT 0,

    -- Final Amounts
    net_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    outstanding_amount DECIMAL(10,2) GENERATED ALWAYS AS (net_amount - paid_amount) STORED,

    -- Payment Tracking
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'cancelled'
    payment_date DATE,
    payment_reference VARCHAR(255),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_by UUID REFERENCES users(id)
);

-- Commission Payments Table
CREATE TABLE commission_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES users(id),

    -- Payment Details
    payment_date DATE NOT NULL,
    payment_period_start DATE NOT NULL,
    payment_period_end DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,

    -- Payment Method
    payment_method VARCHAR(50) NOT NULL, -- 'direct_deposit', 'check', 'wire'
    reference_number VARCHAR(255),
    notes TEXT,

    -- Status
    status VARCHAR(50) DEFAULT 'processed', -- 'pending', 'processed', 'failed', 'cancelled'

    -- Audit
    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Commission Payment Details (junction table)
CREATE TABLE commission_payment_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES commission_payments(id),
    commission_id UUID NOT NULL REFERENCES agent_commissions(id),

    -- Amount Details
    amount_paid DECIMAL(10,2) NOT NULL,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(payment_id, commission_id)
);

-- Revenue Analytics Aggregates (for fast queries)
CREATE TABLE revenue_analytics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    agent_id UUID REFERENCES users(id),
    category_id UUID REFERENCES revenue_categories(id),

    -- Aggregated Amounts
    total_revenue DECIMAL(15,2) DEFAULT 0,
    total_commissions DECIMAL(15,2) DEFAULT 0,
    total_expenses DECIMAL(15,2) DEFAULT 0,
    net_income DECIMAL(15,2) DEFAULT 0,

    -- Transaction Counts
    transaction_count INTEGER DEFAULT 0,
    commission_count INTEGER DEFAULT 0,

    -- Performance Metrics
    average_transaction_value DECIMAL(10,2),
    conversion_rate DECIMAL(5,2),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(date, agent_id, category_id)
);

-- Revenue Goals and Targets
CREATE TABLE revenue_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES users(id),
    category_id UUID REFERENCES revenue_categories(id),

    -- Goal Details
    goal_type VARCHAR(50) NOT NULL, -- 'monthly', 'quarterly', 'yearly'
    target_amount DECIMAL(15,2) NOT NULL,
    target_date DATE NOT NULL,

    -- Progress Tracking
    current_amount DECIMAL(15,2) DEFAULT 0,
    progress_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN target_amount > 0 THEN (current_amount / target_amount) * 100 ELSE 0 END
    ) STORED,

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'achieved', 'expired', 'cancelled'

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_revenue_transactions_agent_date ON revenue_transactions(agent_id, transaction_date);
CREATE INDEX idx_revenue_transactions_property ON revenue_transactions(property_id);
CREATE INDEX idx_revenue_transactions_lead ON revenue_transactions(lead_id);
CREATE INDEX idx_revenue_transactions_status ON revenue_transactions(status);
CREATE INDEX idx_revenue_transactions_category ON revenue_transactions(category_id);

CREATE INDEX idx_agent_commissions_agent ON agent_commissions(agent_id);
CREATE INDEX idx_agent_commissions_transaction ON agent_commissions(transaction_id);
CREATE INDEX idx_agent_commissions_payment_status ON agent_commissions(payment_status);

CREATE INDEX idx_commission_payments_agent ON commission_payments(agent_id);
CREATE INDEX idx_commission_payments_period ON commission_payments(payment_period_start, payment_period_end);

CREATE INDEX idx_revenue_analytics_daily_date ON revenue_analytics_daily(date);
CREATE INDEX idx_revenue_analytics_daily_agent ON revenue_analytics_daily(agent_id);

CREATE INDEX idx_revenue_goals_agent ON revenue_goals(agent_id);
CREATE INDEX idx_revenue_goals_target_date ON revenue_goals(target_date);

-- Insert Default Revenue Categories
INSERT INTO revenue_categories (name, description, category_type) VALUES
('Property Sale', 'Revenue from property sales and closings', 'sale'),
('Property Rental', 'Revenue from rental property income', 'rental'),
('Referral Fee', 'Commission from client referrals', 'referral'),
('Consultation Fee', 'Revenue from consultation services', 'service'),
('Marketing Fee', 'Revenue from marketing services', 'service'),
('Other Income', 'Miscellaneous revenue sources', 'other');

-- Insert Default Commission Structure
INSERT INTO commission_structures (
    name,
    description,
    structure_type,
    base_percentage,
    effective_date
) VALUES (
    'Standard Agent Commission',
    'Standard 3% commission on property sales',
    'percentage',
    3.00,
    CURRENT_DATE
);

-- Create trigger for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to relevant tables
CREATE TRIGGER update_revenue_categories_updated_at BEFORE UPDATE ON revenue_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_revenue_transactions_updated_at BEFORE UPDATE ON revenue_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commission_structures_updated_at BEFORE UPDATE ON commission_structures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_commissions_updated_at BEFORE UPDATE ON agent_commissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commission_payments_updated_at BEFORE UPDATE ON commission_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_revenue_analytics_daily_updated_at BEFORE UPDATE ON revenue_analytics_daily FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_revenue_goals_updated_at BEFORE UPDATE ON revenue_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Commission Disputes Table
CREATE TABLE commission_disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commission_id UUID NOT NULL REFERENCES agent_commissions(id),
    raised_by UUID NOT NULL REFERENCES users(id),
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'closed'
    resolution TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Commission Audit Trail Table
CREATE TABLE commission_audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commission_id UUID NOT NULL REFERENCES agent_commissions(id),
    action VARCHAR(100) NOT NULL, -- 'created', 'calculated', 'adjusted', 'paid', etc.
    performed_by UUID NOT NULL REFERENCES users(id),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agent Commission Structures (junction table for agent-specific structures)
CREATE TABLE agent_commission_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES users(id),
    commission_structure_id UUID NOT NULL REFERENCES commission_structures(id),
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, commission_structure_id)
);

-- Indexes for Commission Disputes
CREATE INDEX idx_commission_disputes_commission ON commission_disputes(commission_id);
CREATE INDEX idx_commission_disputes_status ON commission_disputes(status);
CREATE INDEX idx_commission_disputes_raised_by ON commission_disputes(raised_by);

-- Indexes for Commission Audit Trail
CREATE INDEX idx_commission_audit_trail_commission ON commission_audit_trail(commission_id);
CREATE INDEX idx_commission_audit_trail_action ON commission_audit_trail(action);
CREATE INDEX idx_commission_audit_trail_performed_by ON commission_audit_trail(performed_by);

-- Indexes for Agent Commission Structures
CREATE INDEX idx_agent_commission_structures_agent ON agent_commission_structures(agent_id);

-- Triggers for Commission Disputes and Audit Trail
CREATE TRIGGER update_commission_disputes_updated_at BEFORE UPDATE ON commission_disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE revenue_categories IS 'Defines different types of revenue streams in the system';
COMMENT ON TABLE revenue_transactions IS 'Main table for all revenue transactions and financial activities';
COMMENT ON TABLE commission_structures IS 'Defines how commissions are calculated for different scenarios';
COMMENT ON TABLE agent_commissions IS 'Tracks individual commission calculations for each transaction';
COMMENT ON TABLE commission_payments IS 'Records actual commission payments made to agents';
COMMENT ON TABLE commission_payment_details IS 'Links payments to specific commission records';
COMMENT ON TABLE revenue_analytics_daily IS 'Pre-aggregated data for fast analytics queries';
COMMENT ON TABLE revenue_goals IS 'Agent revenue targets and progress tracking';
COMMENT ON TABLE commission_disputes IS 'Tracks commission disputes and their resolution';
COMMENT ON TABLE commission_audit_trail IS 'Audit trail for all commission-related actions';
COMMENT ON TABLE agent_commission_structures IS 'Links agents to their specific commission structures';