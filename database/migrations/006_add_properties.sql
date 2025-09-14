-- Migration: 006_add_properties.sql
-- Description: Add comprehensive property management tables
-- Date: 2025-01-14

-- =====================================================
-- PROPERTY MANAGEMENT SYSTEM
-- =====================================================

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mls_number VARCHAR(50) UNIQUE,
  property_type VARCHAR(50) NOT NULL CHECK (property_type IN ('single_family', 'condo', 'townhouse', 'multi_family', 'land', 'commercial', 'other')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'sold', 'off_market', 'withdrawn', 'expired')),
  listing_type VARCHAR(20) DEFAULT 'sale' CHECK (listing_type IN ('sale', 'rent', 'both')),

  -- Pricing
  price DECIMAL(12,2),
  price_min DECIMAL(12,2),
  price_max DECIMAL(12,2),
  rent_price DECIMAL(10,2),
  rent_period VARCHAR(20) DEFAULT 'month' CHECK (rent_period IN ('month', 'week', 'day')),

  -- Address Information (stored as JSONB for flexibility)
  address JSONB NOT NULL DEFAULT '{
    "street": "",
    "city": "",
    "state": "",
    "zip_code": "",
    "country": "US",
    "latitude": null,
    "longitude": null,
    "neighborhood": "",
    "county": ""
  }',

  -- Property Details
  details JSONB DEFAULT '{
    "bedrooms": null,
    "bathrooms": null,
    "half_bathrooms": null,
    "square_feet": null,
    "lot_size": null,
    "year_built": null,
    "garage_spaces": null,
    "parking_spaces": null,
    "stories": null,
    "hoa_fee": null,
    "hoa_fee_period": "month"
  }',

  -- Property Features
  features JSONB DEFAULT '{
    "interior": [],
    "exterior": [],
    "appliances": [],
    "utilities": [],
    "community": []
  }',

  -- Descriptions
  title VARCHAR(200),
  description TEXT,
  public_remarks TEXT,

  -- Marketing Information
  marketing JSONB DEFAULT '{
    "show_instructions": "",
    "occupancy": "vacant",
    "possession_date": null,
    "showing_requirements": []
  }',

  -- System Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(20) DEFAULT 'local' CHECK (sync_status IN ('local', 'syncing', 'synced', 'error')),

  -- Constraints
  CONSTRAINT valid_price_range CHECK (
    (price_min IS NULL AND price_max IS NULL) OR
    (price_min IS NOT NULL AND price_max IS NOT NULL AND price_min <= price_max)
  ),
  CONSTRAINT valid_listing_price CHECK (
    (listing_type = 'rent' AND rent_price IS NOT NULL) OR
    (listing_type IN ('sale', 'both') AND price IS NOT NULL)
  )
);

-- Create property_media table for photos, videos, virtual tours
CREATE TABLE IF NOT EXISTS property_media (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('photo', 'video', 'virtual_tour', 'floor_plan', 'document')),
  url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  title VARCHAR(200),
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  file_size INTEGER,
  mime_type VARCHAR(100),
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- for videos
  is_primary BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure only one primary media per property
  CONSTRAINT unique_primary_per_property UNIQUE (property_id, is_primary) DEFERRABLE INITIALLY DEFERRED
);

-- Create property_history table for tracking changes
CREATE TABLE IF NOT EXISTS property_history (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed', 'price_changed')),
  old_values JSONB,
  new_values JSONB,
  change_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create property_views table for analytics
CREATE TABLE IF NOT EXISTS property_views (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id), -- null for anonymous views
  lead_id INTEGER REFERENCES leads(id), -- if viewed by a lead
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  view_duration INTEGER, -- seconds
  source VARCHAR(50) DEFAULT 'app' CHECK (source IN ('app', 'website', 'email', 'social')),
  ip_address INET,
  user_agent TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_listing_type ON properties(listing_type);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at);
CREATE INDEX IF NOT EXISTS idx_properties_updated_at ON properties(updated_at);

-- Address-based indexes for location queries
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties USING GIN ((address->'city'));
CREATE INDEX IF NOT EXISTS idx_properties_state ON properties USING GIN ((address->'state'));
CREATE INDEX IF NOT EXISTS idx_properties_zip_code ON properties USING GIN ((address->'zip_code'));
CREATE INDEX IF NOT EXISTS idx_properties_neighborhood ON properties USING GIN ((address->'neighborhood'));

-- Property details indexes
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON properties USING GIN ((details->'bedrooms'));
CREATE INDEX IF NOT EXISTS idx_properties_bathrooms ON properties USING GIN ((details->'bathrooms'));
CREATE INDEX IF NOT EXISTS idx_properties_square_feet ON properties USING GIN ((details->'square_feet'));

-- Media indexes
CREATE INDEX IF NOT EXISTS idx_property_media_property_id ON property_media(property_id);
CREATE INDEX IF NOT EXISTS idx_property_media_type ON property_media(media_type);
CREATE INDEX IF NOT EXISTS idx_property_media_sort_order ON property_media(property_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_property_media_primary ON property_media(property_id, is_primary) WHERE is_primary = true;

-- History indexes
CREATE INDEX IF NOT EXISTS idx_property_history_property_id ON property_history(property_id);
CREATE INDEX IF NOT EXISTS idx_property_history_action ON property_history(action);
CREATE INDEX IF NOT EXISTS idx_property_history_changed_at ON property_history(changed_at);

-- Views indexes
CREATE INDEX IF NOT EXISTS idx_property_views_property_id ON property_views(property_id);
CREATE INDEX IF NOT EXISTS idx_property_views_user_id ON property_views(user_id);
CREATE INDEX IF NOT EXISTS idx_property_views_lead_id ON property_views(lead_id);
CREATE INDEX IF NOT EXISTS idx_property_views_viewed_at ON property_views(viewed_at);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_media_updated_at
  BEFORE UPDATE ON property_media
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for property history
CREATE OR REPLACE FUNCTION log_property_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO property_history (property_id, user_id, action, new_values)
    VALUES (NEW.id, NEW.user_id, 'created', row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if important fields changed
    IF OLD.* IS DISTINCT FROM NEW.* THEN
      INSERT INTO property_history (property_id, user_id, action, old_values, new_values)
      VALUES (NEW.id, NEW.user_id, 'updated', row_to_json(OLD), row_to_json(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO property_history (property_id, user_id, action, old_values)
    VALUES (OLD.id, OLD.user_id, 'deleted', row_to_json(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_property_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON properties
  FOR EACH ROW EXECUTE FUNCTION log_property_changes();

-- Create function to get property summary
CREATE OR REPLACE FUNCTION get_property_summary(property_id INTEGER)
RETURNS JSONB AS $$
DECLARE
  property_record RECORD;
  media_count INTEGER;
  view_count INTEGER;
  result JSONB;
BEGIN
  SELECT * INTO property_record FROM properties WHERE id = property_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO media_count FROM property_media WHERE property_media.property_id = property_id;
  SELECT COUNT(*) INTO view_count FROM property_views WHERE property_views.property_id = property_id;

  result := jsonb_build_object(
    'id', property_record.id,
    'title', property_record.title,
    'property_type', property_record.property_type,
    'status', property_record.status,
    'price', property_record.price,
    'address', property_record.address,
    'bedrooms', property_record.details->'bedrooms',
    'bathrooms', property_record.details->'bathrooms',
    'square_feet', property_record.details->'square_feet',
    'media_count', media_count,
    'view_count', view_count,
    'created_at', property_record.created_at,
    'updated_at', property_record.updated_at
  );

  RETURN result;
END;
$$ language 'plpgsql';

-- Create function to update property primary media
CREATE OR REPLACE FUNCTION set_property_primary_media(property_id INTEGER, media_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  -- First, unset all primary flags for this property
  UPDATE property_media SET is_primary = false WHERE property_media.property_id = property_id;

  -- Then set the specified media as primary
  UPDATE property_media SET is_primary = true WHERE id = media_id AND property_media.property_id = property_id;

  RETURN FOUND;
END;
$$ language 'plpgsql';

-- Insert sample data for testing
INSERT INTO properties (
  user_id, property_type, status, price, address, details, title, description
) VALUES (
  1, -- Assuming user ID 1 exists
  'single_family',
  'active',
  450000.00,
  '{
    "street": "123 Main Street",
    "city": "Springfield",
    "state": "IL",
    "zip_code": "62701",
    "country": "US",
    "neighborhood": "Downtown",
    "latitude": 39.7817,
    "longitude": -89.6501
  }',
  '{
    "bedrooms": 3,
    "bathrooms": 2,
    "half_bathrooms": 1,
    "square_feet": 2200,
    "lot_size": 0.25,
    "year_built": 1995,
    "garage_spaces": 2,
    "stories": 2
  }',
  'Beautiful 3BR/2.5BA Home in Downtown Springfield',
  'This charming single-family home features hardwood floors, updated kitchen, and a spacious backyard. Perfect for families!'
) ON CONFLICT DO NOTHING;

-- Add sample media for the property
INSERT INTO property_media (
  property_id, media_type, url, title, sort_order, is_primary
) VALUES (
  1, -- property_id
  'photo',
  'https://example.com/property-1-main.jpg',
  'Front Exterior',
  1,
  true
), (
  1,
  'photo',
  'https://example.com/property-1-living.jpg',
  'Living Room',
  2,
  false
) ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE properties IS 'Main property listings table with comprehensive property information';
COMMENT ON TABLE property_media IS 'Media files (photos, videos, documents) associated with properties';
COMMENT ON TABLE property_history IS 'Audit trail of all property changes and updates';
COMMENT ON TABLE property_views IS 'Analytics for property view tracking and engagement metrics';

COMMENT ON COLUMN properties.address IS 'JSONB field containing structured address information';
COMMENT ON COLUMN properties.details IS 'JSONB field with property specifications (bedrooms, bathrooms, etc.)';
COMMENT ON COLUMN properties.features IS 'JSONB field with property features and amenities';
COMMENT ON COLUMN properties.marketing IS 'JSONB field with marketing and showing information';

COMMENT ON FUNCTION get_property_summary(property_id INTEGER) IS 'Returns a summary of property information including media and view counts';
COMMENT ON FUNCTION set_property_primary_media(property_id INTEGER, media_id INTEGER) IS 'Sets the primary media item for a property';