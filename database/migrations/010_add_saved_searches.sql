-- Migration: Add saved searches functionality
-- Date: 2025-01-14
-- Description: Creates tables and indexes for storing user saved searches

-- Saved searches table
CREATE TABLE IF NOT EXISTS saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    search_query JSONB NOT NULL, -- Store the complete search query as JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_executed_at TIMESTAMP WITH TIME ZONE,
    execution_count INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    notifications_enabled BOOLEAN DEFAULT FALSE,
    notification_frequency VARCHAR(20) DEFAULT 'daily' CHECK (notification_frequency IN ('immediate', 'daily', 'weekly')),
    tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of tags for organization
    is_active BOOLEAN DEFAULT TRUE
);

-- Search history table for analytics
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    search_query JSONB NOT NULL,
    result_count INTEGER DEFAULT 0,
    execution_time INTEGER DEFAULT 0, -- milliseconds
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    device_info JSONB, -- Store device/platform information
    ip_address INET,
    user_agent TEXT,
    source VARCHAR(50) DEFAULT 'app' -- app, web, api
);

-- Search analytics table for aggregated data
CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    total_searches INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    average_execution_time INTEGER DEFAULT 0,
    popular_queries JSONB DEFAULT '[]'::jsonb, -- Array of {query, count, avg_results}
    popular_filters JSONB DEFAULT '{}'::jsonb, -- Object with filter usage stats
    conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(date)
);

-- Indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saved_searches_user_id
ON saved_searches (user_id, is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saved_searches_updated_at
ON saved_searches (updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saved_searches_tags
ON saved_searches USING GIN (tags);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_history_user_id
ON search_history (user_id, executed_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_history_executed_at
ON search_history (executed_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_history_query
ON search_history USING GIN (search_query);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_analytics_date
ON search_analytics (date DESC);

-- Function to update search execution count
CREATE OR REPLACE FUNCTION update_saved_search_execution(search_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE saved_searches
    SET
        execution_count = execution_count + 1,
        last_executed_at = NOW(),
        updated_at = NOW()
    WHERE id = search_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log search execution
CREATE OR REPLACE FUNCTION log_search_execution(
    p_user_id INTEGER,
    p_search_query JSONB,
    p_result_count INTEGER,
    p_execution_time INTEGER,
    p_device_info JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_source VARCHAR(50) DEFAULT 'app'
)
RETURNS UUID AS $$
DECLARE
    history_id UUID;
BEGIN
    INSERT INTO search_history (
        user_id,
        search_query,
        result_count,
        execution_time,
        device_info,
        ip_address,
        user_agent,
        source
    ) VALUES (
        p_user_id,
        p_search_query,
        p_result_count,
        p_execution_time,
        p_device_info,
        p_ip_address,
        p_user_agent,
        p_source
    ) RETURNING id INTO history_id;

    RETURN history_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update search analytics
CREATE OR REPLACE FUNCTION update_search_analytics(
    search_date DATE,
    execution_time INTEGER,
    result_count INTEGER,
    user_id INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    existing_record search_analytics%ROWTYPE;
    popular_queries JSONB;
    popular_filters JSONB;
BEGIN
    -- Get or create analytics record for the date
    SELECT * INTO existing_record
    FROM search_analytics
    WHERE date = search_date;

    IF NOT FOUND THEN
        -- Create new record
        INSERT INTO search_analytics (
            date,
            total_searches,
            unique_users,
            average_execution_time
        ) VALUES (
            search_date,
            1,
            CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END,
            execution_time
        );
    ELSE
        -- Update existing record
        UPDATE search_analytics
        SET
            total_searches = total_searches + 1,
            unique_users = CASE
                WHEN user_id IS NOT NULL AND user_id NOT IN (
                    SELECT DISTINCT sh.user_id
                    FROM search_history sh
                    WHERE sh.user_id IS NOT NULL
                    AND DATE(sh.executed_at) = search_date
                    AND sh.user_id != user_id
                ) THEN unique_users + 1
                ELSE unique_users
            END,
            average_execution_time = ((average_execution_time * total_searches) + execution_time) / (total_searches + 1),
            updated_at = NOW()
        WHERE date = search_date;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get popular search terms
CREATE OR REPLACE FUNCTION get_popular_search_terms(
    days_back INTEGER DEFAULT 30,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    search_term TEXT,
    search_count BIGINT,
    avg_results NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (search_query->>'query')::TEXT as search_term,
        COUNT(*) as search_count,
        AVG(result_count)::NUMERIC as avg_results
    FROM search_history
    WHERE
        executed_at >= NOW() - INTERVAL '1 day' * days_back
        AND search_query->>'query' IS NOT NULL
        AND (search_query->>'query')::TEXT != ''
    GROUP BY search_query->>'query'
    ORDER BY search_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old search history (optional maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_search_history(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM search_history
    WHERE executed_at < NOW() - INTERVAL '1 day' * days_to_keep;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_saved_searches_updated_at
    BEFORE UPDATE ON saved_searches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_search_analytics_updated_at
    BEFORE UPDATE ON search_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON saved_searches TO PUBLIC;
GRANT SELECT, INSERT ON search_history TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON search_analytics TO PUBLIC;

GRANT EXECUTE ON FUNCTION update_saved_search_execution TO PUBLIC;
GRANT EXECUTE ON FUNCTION log_search_execution TO PUBLIC;
GRANT EXECUTE ON FUNCTION update_search_analytics TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_popular_search_terms TO PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_old_search_history TO PUBLIC;

-- Add comments for documentation
COMMENT ON TABLE saved_searches IS 'Stores user-saved search queries for quick access and reuse';
COMMENT ON TABLE search_history IS 'Tracks all search executions for analytics and optimization';
COMMENT ON TABLE search_analytics IS 'Aggregated search analytics data by date';

COMMENT ON FUNCTION update_saved_search_execution IS 'Updates execution count and timestamp when a saved search is used';
COMMENT ON FUNCTION log_search_execution IS 'Logs a search execution with all relevant metadata';
COMMENT ON FUNCTION update_search_analytics IS 'Updates daily search analytics with new execution data';
COMMENT ON FUNCTION get_popular_search_terms IS 'Returns most popular search terms over a time period';
COMMENT ON FUNCTION cleanup_old_search_history IS 'Removes old search history records for maintenance';

COMMENT ON INDEX idx_saved_searches_user_id IS 'Index for fast user-specific saved search queries';
COMMENT ON INDEX idx_search_history_user_id IS 'Index for user-specific search history';
COMMENT ON INDEX idx_search_history_executed_at IS 'Index for time-based search history queries';