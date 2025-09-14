-- Migration: 005_add_communication_templates.sql
-- Description: Add database schema for personalized communication templates system
-- Date: 2025-01-14

-- Create communication_templates table
CREATE TABLE IF NOT EXISTS communication_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  subject_template TEXT,
  content_template TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create template_variants table for A/B testing
CREATE TABLE IF NOT EXISTS template_variants (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES communication_templates(id) ON DELETE CASCADE,
  variant_name VARCHAR(100) NOT NULL,
  subject_template TEXT,
  content_template TEXT NOT NULL,
  is_control BOOLEAN DEFAULT false,
  weight DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create template_usage table for tracking sends and responses
CREATE TABLE IF NOT EXISTS template_usage (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES communication_templates(id) ON DELETE CASCADE,
  variant_id INTEGER REFERENCES template_variants(id) ON DELETE SET NULL,
  lead_id INTEGER NOT NULL,
  communication_type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'push'
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  response_data JSONB,
  delivery_status VARCHAR(50) DEFAULT 'sent'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_communication_templates_category ON communication_templates(category);
CREATE INDEX IF NOT EXISTS idx_communication_templates_active ON communication_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_template_variants_template_id ON template_variants(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_template_id ON template_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_lead_id ON template_usage(lead_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_sent_at ON template_usage(sent_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to communication_templates
CREATE TRIGGER update_communication_templates_updated_at
  BEFORE UPDATE ON communication_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample templates
INSERT INTO communication_templates (name, category, subject_template, content_template, variables, conditions) VALUES
(
  'Welcome New Lead',
  'onboarding',
  'Welcome to {{agentName}}''s Real Estate Services!',
  'Hi {{leadName}},

Welcome to my real estate services! I''m excited to help you find your dream home in {{preferredLocation}}.

Based on your interest in {{propertyType}} properties, I''ve put together some great options that match your budget of ${{budget}}.

Would you like to schedule a call to discuss your requirements?

Best regards,
{{agentName}}
{{agentPhone}}
{{agentEmail}}',
  '{"leadName": "string", "agentName": "string", "preferredLocation": "string", "propertyType": "string", "budget": "number", "agentPhone": "string", "agentEmail": "string"}',
  '{"leadScore": {"min": 70}, "daysSinceContact": {"max": 1}}'
),
(
  'Follow-up After Viewing',
  'followup',
  'Thoughts on the {{propertyAddress}} viewing?',
  'Hi {{leadName}},

I hope you enjoyed viewing {{propertyAddress}} yesterday. I''d love to hear your thoughts on the property.

Did anything stand out to you? Are there any questions I can answer about the home or the neighborhood?

I''m here to help make your home buying journey smooth and successful.

Best,
{{agentName}}',
  '{"leadName": "string", "propertyAddress": "string", "agentName": "string"}',
  '{"lastViewing": {"daysAgo": {"max": 2}}, "leadScore": {"min": 60}}'
),
(
  'Price Drop Alert',
  'engagement',
  'Great news: Price reduction on {{propertyAddress}}!',
  'Hi {{leadName}},

Exciting news! The property at {{propertyAddress}} that you were interested in has had a price reduction of ${{priceReduction}}.

The new price is ${{newPrice}}, which brings it within your budget range.

This is a great opportunity - would you like to schedule another viewing?

Best regards,
{{agentName}}
{{agentPhone}}',
  '{"leadName": "string", "propertyAddress": "string", "priceReduction": "number", "newPrice": "number", "agentName": "string", "agentPhone": "string"}',
  '{"budgetExceeded": true, "priceDrop": {"min": 5000}}'
);

-- Create A/B test variants for the welcome template
INSERT INTO template_variants (template_id, variant_name, subject_template, content_template, is_control, weight) VALUES
(
  1,
  'Control - Standard Welcome',
  'Welcome to {{agentName}}''s Real Estate Services!',
  'Hi {{leadName}},

Welcome to my real estate services! I''m excited to help you find your dream home in {{preferredLocation}}.

Based on your interest in {{propertyType}} properties, I''ve put together some great options that match your budget of ${{budget}}.

Would you like to schedule a call to discuss your requirements?

Best regards,
{{agentName}}
{{agentPhone}}
{{agentEmail}}',
  true,
  0.5
),
(
  1,
  'Variant A - Personalized Greeting',
  'Welcome {{leadName}} - Let''s Find Your Dream Home!',
  'Hi {{leadName}},

I''m thrilled you''ve chosen me to help you find your perfect home in {{preferredLocation}}!

As someone interested in {{propertyType}} properties with a ${{budget}} budget, I''ve already identified several excellent options that match your preferences.

Ready to see some amazing properties? Let''s schedule a quick call!

Warm regards,
{{agentName}}
{{agentPhone}}
{{agentEmail}}',
  false,
  0.25
),
(
  1,
  'Variant B - Question-Focused',
  'Welcome! What''s Your Home Buying Timeline?',
  'Hi {{leadName}},

Welcome to my real estate services! I specialize in helping buyers like you find their ideal home in {{preferredLocation}}.

You''re looking for {{propertyType}} properties in the ${{budget}} range - that''s a great starting point!

What''s your timeline for buying? Are you looking to move in the next 3 months, 6 months, or further out?

I''d love to discuss your specific needs and show you some fantastic options.

Best,
{{agentName}}
{{agentPhone}}
{{agentEmail}}',
  false,
  0.25
);

-- Add comments for documentation
COMMENT ON TABLE communication_templates IS 'Stores communication templates with variable substitution and conditional logic';
COMMENT ON TABLE template_variants IS 'A/B testing variants for templates with traffic distribution weights';
COMMENT ON TABLE template_usage IS 'Tracks template usage, delivery, and engagement metrics for analytics';
COMMENT ON COLUMN communication_templates.variables IS 'JSON schema defining available template variables and their types';
COMMENT ON COLUMN communication_templates.conditions IS 'JSON conditions for when to use this template (lead score, timing, etc.)';
COMMENT ON COLUMN template_variants.weight IS 'Traffic distribution weight for A/B testing (0.0-1.0)';
COMMENT ON COLUMN template_usage.response_data IS 'Additional response tracking data (conversions, follow-ups, etc.)';