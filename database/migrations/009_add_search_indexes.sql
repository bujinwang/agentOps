-- Migration: Add search indexes for advanced property search
-- Date: 2025-01-14
-- Description: Creates optimized indexes for fast property search and filtering operations

-- Full-text search index for property descriptions and titles
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_fulltext_search
ON properties USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '')));

-- Composite index for common search filters (price, property_type, bedrooms, bathrooms)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_common_filters
ON properties (price, property_type, bedrooms, bathrooms, square_feet);

-- Index for location-based searches (city, state, zip_code)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_location
ON properties (address->>'city', address->>'state', address->>'zip_code');

-- Index for date-based searches (created_at, updated_at, listing dates)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_dates
ON properties (created_at, updated_at, mls_listing_date, mls_updated_date);

-- Index for MLS-specific searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_mls_search
ON properties (mls_id, mls_status, mls_provider) WHERE mls_id IS NOT NULL;

-- Partial index for active properties only (most common search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_active_only
ON properties (price, property_type, bedrooms, bathrooms)
WHERE status = 'active' AND deleted_at IS NULL;

-- Index for year built and property features
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_year_features
ON properties (year_built, garage_spaces, parking_spaces);

-- GIN index for array fields (interior_features, appliances)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_features
ON properties USING GIN (interior_features, appliances);

-- Index for geospatial searches (if latitude/longitude available)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_location_coords
ON properties (address->>'latitude', address->>'longitude')
WHERE address->>'latitude' IS NOT NULL AND address->>'longitude' IS NOT NULL;

-- Create a functional index for price ranges (useful for range queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_price_ranges
ON properties (price / 100000); -- Group by price ranges of $100k

-- Index for sorting by multiple criteria
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_sort_multi
ON properties (price DESC, created_at DESC, square_feet DESC);

-- Create a view for search-optimized property data
CREATE OR REPLACE VIEW search_properties AS
SELECT
    p.id,
    p.title,
    p.description,
    p.price,
    p.property_type,
    p.bedrooms,
    p.bathrooms,
    p.square_feet,
    p.year_built,
    p.status,
    p.created_at,
    p.updated_at,
    -- Extract address components for easier querying
    p.address->>'street' as street_address,
    p.address->>'city' as city,
    p.address->>'state' as state,
    p.address->>'zip_code' as zip_code,
    p.address->>'latitude' as latitude,
    p.address->>'longitude' as longitude,
    -- MLS data
    p.mls_id,
    p.mls_listing_id,
    p.mls_status,
    p.mls_provider,
    p.mls_listing_date,
    p.mls_data_quality_score,
    -- Media count
    (SELECT COUNT(*) FROM property_media pm WHERE pm.property_id = p.id AND pm.is_primary = true) as primary_media_count,
    (SELECT COUNT(*) FROM property_media pm WHERE pm.property_id = p.id) as total_media_count,
    -- Features as text for full-text search
    array_to_string(p.interior_features, ' ') as interior_features_text,
    array_to_string(p.appliances, ' ') as appliances_text,
    -- Full-text search vector
    to_tsvector('english',
        COALESCE(p.title, '') || ' ' ||
        COALESCE(p.description, '') || ' ' ||
        COALESCE(p.address->>'street', '') || ' ' ||
        COALESCE(p.address->>'city', '') || ' ' ||
        COALESCE(p.address->>'state', '') || ' ' ||
        COALESCE(array_to_string(p.interior_features, ' '), '')
    ) as search_vector
FROM properties p
WHERE p.deleted_at IS NULL;

-- Grant permissions on the search view
GRANT SELECT ON search_properties TO PUBLIC;

-- Create a function for advanced search with ranking
CREATE OR REPLACE FUNCTION search_properties_advanced(
    search_query TEXT DEFAULT NULL,
    min_price NUMERIC DEFAULT NULL,
    max_price NUMERIC DEFAULT NULL,
    property_types TEXT[] DEFAULT NULL,
    min_bedrooms INTEGER DEFAULT NULL,
    max_bedrooms INTEGER DEFAULT NULL,
    min_bathrooms NUMERIC DEFAULT NULL,
    max_bathrooms NUMERIC DEFAULT NULL,
    min_sqft INTEGER DEFAULT NULL,
    max_sqft INTEGER DEFAULT NULL,
    city_filter TEXT DEFAULT NULL,
    state_filter TEXT DEFAULT NULL,
    zip_filter TEXT DEFAULT NULL,
    mls_status_filter TEXT[] DEFAULT NULL,
    sort_by TEXT DEFAULT 'relevance',
    sort_order TEXT DEFAULT 'desc',
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    price NUMERIC,
    property_type TEXT,
    bedrooms INTEGER,
    bathrooms NUMERIC,
    square_feet INTEGER,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    mls_id TEXT,
    mls_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    relevance_score NUMERIC
) AS $$
DECLARE
    sql_query TEXT;
    where_clauses TEXT[] := ARRAY[]::TEXT[];
    order_clause TEXT;
BEGIN
    -- Build WHERE clauses
    IF search_query IS NOT NULL AND search_query != '' THEN
        where_clauses := array_append(where_clauses,
            format('search_vector @@ plainto_tsquery(''english'', %L)', search_query));
    END IF;

    IF min_price IS NOT NULL THEN
        where_clauses := array_append(where_clauses,
            format('price >= %s', min_price));
    END IF;

    IF max_price IS NOT NULL THEN
        where_clauses := array_append(where_clauses,
            format('price <= %s', max_price));
    END IF;

    IF property_types IS NOT NULL AND array_length(property_types, 1) > 0 THEN
        where_clauses := array_append(where_clauses,
            format('property_type = ANY(%L)', property_types));
    END IF;

    IF min_bedrooms IS NOT NULL THEN
        where_clauses := array_append(where_clauses,
            format('bedrooms >= %s', min_bedrooms));
    END IF;

    IF max_bedrooms IS NOT NULL THEN
        where_clauses := array_append(where_clauses,
            format('bedrooms <= %s', max_bedrooms));
    END IF;

    IF min_bathrooms IS NOT NULL THEN
        where_clauses := array_append(where_clauses,
            format('bathrooms >= %s', min_bathrooms));
    END IF;

    IF max_bathrooms IS NOT NULL THEN
        where_clauses := array_append(where_clauses,
            format('bathrooms <= %s', max_bathrooms));
    END IF;

    IF min_sqft IS NOT NULL THEN
        where_clauses := array_append(where_clauses,
            format('square_feet >= %s', min_sqft));
    END IF;

    IF max_sqft IS NOT NULL THEN
        where_clauses := array_append(where_clauses,
            format('square_feet <= %s', max_sqft));
    END IF;

    IF city_filter IS NOT NULL THEN
        where_clauses := array_append(where_clauses,
            format('city ILIKE %L', '%' || city_filter || '%'));
    END IF;

    IF state_filter IS NOT NULL THEN
        where_clauses := array_append(where_clauses,
            format('state = %L', state_filter));
    END IF;

    IF zip_filter IS NOT NULL THEN
        where_clauses := array_append(where_clauses,
            format('zip_code = %L', zip_filter));
    END IF;

    IF mls_status_filter IS NOT NULL AND array_length(mls_status_filter, 1) > 0 THEN
        where_clauses := array_append(where_clauses,
            format('mls_status = ANY(%L)', mls_status_filter));
    END IF;

    -- Build ORDER BY clause
    CASE sort_by
        WHEN 'price' THEN
            order_clause := format('price %s', sort_order);
        WHEN 'date' THEN
            order_clause := format('created_at %s', sort_order);
        WHEN 'sqft' THEN
            order_clause := format('square_feet %s NULLS LAST', sort_order);
        WHEN 'relevance' THEN
            IF search_query IS NOT NULL AND search_query != '' THEN
                order_clause := format('ts_rank(search_vector, plainto_tsquery(''english'', %L)) DESC', search_query);
            ELSE
                order_clause := 'created_at DESC';
            END IF;
        ELSE
            order_clause := 'created_at DESC';
    END CASE;

    -- Build final query
    sql_query := format('
        SELECT
            id, title, description, price, property_type,
            bedrooms, bathrooms, square_feet, city, state, zip_code,
            mls_id, mls_status, created_at,
            CASE
                WHEN %L IS NOT NULL AND %L != ''''
                THEN ts_rank(search_vector, plainto_tsquery(''english'', %L))
                ELSE 1.0
            END as relevance_score
        FROM search_properties
        WHERE status = ''active''',
        search_query, search_query, search_query);

    IF array_length(where_clauses, 1) > 0 THEN
        sql_query := sql_query || ' AND ' || array_to_string(where_clauses, ' AND ');
    END IF;

    sql_query := sql_query || format('
        ORDER BY %s
        LIMIT %s OFFSET %s',
        order_clause, limit_count, offset_count);

    -- Execute the dynamic query
    RETURN QUERY EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the search function
GRANT EXECUTE ON FUNCTION search_properties_advanced TO PUBLIC;

-- Add comments for documentation
COMMENT ON FUNCTION search_properties_advanced IS 'Advanced property search function with full-text search, filtering, and ranking';
COMMENT ON VIEW search_properties IS 'Optimized view for property search operations with pre-computed search vectors';
COMMENT ON INDEX idx_properties_fulltext_search IS 'Full-text search index for property titles and descriptions';
COMMENT ON INDEX idx_properties_common_filters IS 'Composite index for common search filters';
COMMENT ON INDEX idx_properties_location IS 'Index for location-based searches';
COMMENT ON INDEX idx_properties_active_only IS 'Partial index for active properties only';