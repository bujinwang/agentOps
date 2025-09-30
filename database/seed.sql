-- Seed data for Real Estate CRM
-- This file provides initial data for testing and development

-- Insert sample users (passwords are 'password123' hashed with bcrypt)
INSERT INTO users (email, password_hash, first_name, last_name, created_at, updated_at) VALUES
('john.agent@realestate.com', '$2a$10$rGbQJ8qHj4Q7JzY8n8h8M.5xQZ7tPfJYFnOjY9s4N8hCxWvEhGp6K', 'John', 'Agent', NOW(), NOW()),
('sarah.broker@realestate.com', '$2a$10$rGbQJ8qHj4Q7JzY8n8h8M.5xQZ7tPfJYFnOjY9s4N8hCxWvEhGp6K', 'Sarah', 'Broker', NOW(), NOW());

-- Insert sample leads for user 1 (John Agent)
INSERT INTO leads (
    user_id, first_name, last_name, email, phone_number, source, status, priority,
    budget_min, budget_max, desired_location, property_type, bedrooms_min, bathrooms_min,
    notes, ai_summary, created_at, updated_at
) VALUES 
(
    1, 'Jane', 'Smith', 'jane.smith@email.com', '555-0101', 'Website Form', 'New', 'High',
    700000, 850000, 'Downtown Toronto', 'Condo', 2, 2.0,
    'Looking for modern condo with city views. Flexible on move-in date.',
    'High-priority lead seeking 2BR condo downtown with $700K-$850K budget. Interested in modern amenities and city views.',
    NOW(), NOW()
),
(
    1, 'Michael', 'Johnson', 'mjohnson@email.com', '555-0102', 'Referral', 'Contacted', 'Medium',
    450000, 600000, 'Mississauga', 'House', 3, 2.5,
    'First-time homebuyer, pre-approved for mortgage. Looking for family home.',
    'First-time buyer with mortgage pre-approval. Seeking 3BR family home in Mississauga, $450K-$600K range.',
    NOW() - INTERVAL '2 days', NOW()
),
(
    1, 'Emily', 'Brown', 'emily.brown@email.com', '555-0103', 'Facebook Ad', 'Qualified', 'High',
    800000, 1200000, 'North York', 'Townhouse', 3, 3.0,
    'Upgrading from current home. Needs larger space for growing family.',
    'Motivated upgrader seeking 3BR+ townhouse in North York. Budget $800K-$1.2M for growing family.',
    NOW() - INTERVAL '5 days', NOW()
),
(
    1, 'David', 'Wilson', 'dwilson@email.com', '555-0104', 'Walk-in', 'Showing Scheduled', 'Medium',
    350000, 450000, 'Scarborough', 'Condo', 1, 1.0,
    'Young professional, looking for investment property or first home.',
    'Young professional considering 1BR condo in Scarborough as investment or first home. Budget $350K-$450K.',
    NOW() - INTERVAL '1 week', NOW()
);

-- Insert sample interactions
INSERT INTO interactions (lead_id, user_id, type, content, interaction_date, created_at) VALUES
(1, 1, 'Lead Created', 'New lead added from website form submission', NOW(), NOW()),
(2, 1, 'Lead Created', 'Lead added from referral by existing client', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
(2, 1, 'Call Logged', 'Initial phone call - discussed budget and preferences', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(3, 1, 'Lead Created', 'Lead generated from Facebook advertising campaign', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
(3, 1, 'Email Sent', 'Sent property listings matching criteria', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
(3, 1, 'Status Change', 'Updated status to Qualified after initial meeting', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
(4, 1, 'Lead Created', 'Walk-in client from office visit', NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week'),
(4, 1, 'Meeting Scheduled', 'Property showing scheduled for this weekend', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

-- Insert sample tasks
INSERT INTO tasks (
    lead_id, user_id, title, description, due_date, priority, is_completed, created_at, updated_at
) VALUES
(1, 1, 'Send property listings', 'Send curated condo listings in downtown area matching budget', NOW() + INTERVAL '1 day', 'High', FALSE, NOW(), NOW()),
(2, 1, 'Schedule property viewing', 'Arrange viewing for 3 properties in Mississauga', NOW() + INTERVAL '2 days', 'Medium', FALSE, NOW(), NOW()),
(3, 1, 'Prepare CMA report', 'Create comparative market analysis for North York townhouses', NOW() + INTERVAL '3 days', 'High', FALSE, NOW(), NOW()),
(4, 1, 'Follow up after showing', 'Call client after weekend property showing for feedback', NOW() + INTERVAL '5 days', 'Medium', FALSE, NOW(), NOW()),
(1, 1, 'Research mortgage options', 'Compile list of mortgage brokers and rates for client', NOW() + INTERVAL '1 week', 'Low', FALSE, NOW(), NOW());

-- Insert some completed tasks for demonstration
INSERT INTO tasks (
    lead_id, user_id, title, description, due_date, priority, is_completed, completed_at, created_at, updated_at
) VALUES
(2, 1, 'Initial client call', 'Make first contact call to assess needs', NOW() - INTERVAL '1 day', 'High', TRUE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),
(3, 1, 'Send welcome package', 'Email welcome package and service overview', NOW() - INTERVAL '4 days', 'Medium', TRUE, NOW() - INTERVAL '4 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days');

-- Insert sample notifications
INSERT INTO notifications (user_id, title, message, type, priority, related_type, related_id, created_at) VALUES
(1, 'Welcome to Real Estate CRM', 'Your account has been set up successfully. Start by adding your first lead!', 'info', 'normal', NULL, NULL, NOW()),
(1, 'Lead Status Update', 'Jane Smith''s status changed to "Contacted"', 'lead_update', 'normal', 'lead', 1, NOW() - INTERVAL '2 hours'),
(1, 'Task Due Soon', 'Send property listings task is due tomorrow', 'task_update', 'high', 'task', 1, NOW() - INTERVAL '1 hour'),
(1, 'New Lead Added', 'Michael Johnson was added as a new lead', 'lead_update', 'normal', 'lead', 2, NOW() - INTERVAL '30 minutes'),
(2, 'System Maintenance', 'Scheduled maintenance will occur tonight from 2-4 AM EST', 'warning', 'normal', NULL, NULL, NOW() - INTERVAL '4 hours');

-- Verify data insertion
SELECT 'Users created:' as info, COUNT(*) as count FROM users
UNION ALL
SELECT 'Leads created:', COUNT(*) FROM leads
UNION ALL
SELECT 'Interactions created:', COUNT(*) FROM interactions
UNION ALL
SELECT 'Tasks created:', COUNT(*) FROM tasks
UNION ALL
SELECT 'Notifications created:', COUNT(*) FROM notifications;