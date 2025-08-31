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

-- Indexes for performance
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_priority ON leads(priority);
CREATE INDEX idx_leads_email ON leads(email); -- If searching by email is common
CREATE INDEX idx_leads_follow_up_date ON leads(follow_up_date);

CREATE INDEX idx_interactions_lead_id ON interactions(lead_id);
CREATE INDEX idx_interactions_user_id ON interactions(user_id);
CREATE INDEX idx_interactions_type ON interactions(type);

CREATE INDEX idx_tasks_lead_id ON tasks(lead_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_is_completed ON tasks(is_completed);
