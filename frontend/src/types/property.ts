// Property Management Types
// Comprehensive type definitions for property CRUD operations

export type PropertyType =
  | 'single_family'
  | 'condo'
  | 'townhouse'
  | 'multi_family'
  | 'land'
  | 'commercial'
  | 'other';

export type PropertyStatus =
  | 'active'
  | 'pending'
  | 'sold'
  | 'off_market'
  | 'withdrawn'
  | 'expired';

export type ListingType =
  | 'sale'
  | 'rent'
  | 'both';

export type RentPeriod =
  | 'month'
  | 'week'
  | 'day';

export type MediaType =
  | 'photo'
  | 'video'
  | 'virtual_tour'
  | 'floor_plan'
  | 'document';

export type SyncStatus =
  | 'local'
  | 'syncing'
  | 'synced'
  | 'error';

// Address structure
export interface PropertyAddress {
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  latitude?: number;
  longitude?: number;
  neighborhood?: string;
  county?: string;
}

// Property details
export interface PropertyDetails {
  bedrooms?: number;
  bathrooms?: number;
  half_bathrooms?: number;
  square_feet?: number;
  lot_size?: number;
  year_built?: number;
  garage_spaces?: number;
  parking_spaces?: number;
  stories?: number;
  hoa_fee?: number;
  hoa_fee_period?: string;
}

// Property features
export interface PropertyFeatures {
  interior: string[];
  exterior: string[];
  appliances: string[];
  utilities: string[];
  community: string[];
}

// Marketing information
export interface PropertyMarketing {
  show_instructions?: string;
  occupancy?: string;
  possession_date?: string;
  showing_requirements?: string[];
}

// Main Property interface
export interface Property {
  id: number;
  user_id: number;
  mls_number?: string;
  property_type: PropertyType;
  status: PropertyStatus;
  listing_type: ListingType;

  // Pricing
  price?: number;
  price_min?: number;
  price_max?: number;
  rent_price?: number;
  rent_period?: RentPeriod;

  // Location and details
  address: PropertyAddress;
  details: PropertyDetails;
  features: PropertyFeatures;

  // Content
  title?: string;
  description?: string;
  public_remarks?: string;

  // Marketing
  marketing: PropertyMarketing;

  // System fields
  created_at: string;
  updated_at: string;
  last_synced_at?: string;
  sync_status: SyncStatus;
}

// Create/Update types
export interface PropertyCreate {
  mls_number?: string;
  property_type: PropertyType;
  status?: PropertyStatus;
  listing_type?: ListingType;

  // Pricing
  price?: number;
  price_min?: number;
  price_max?: number;
  rent_price?: number;
  rent_period?: RentPeriod;

  // Location and details
  address: PropertyAddress;
  details?: Partial<PropertyDetails>;
  features?: Partial<PropertyFeatures>;

  // Content
  title?: string;
  description?: string;
  public_remarks?: string;

  // Marketing
  marketing?: Partial<PropertyMarketing>;
}

export interface PropertyUpdate extends Partial<PropertyCreate> {
  id: number;
}

// Property Media
export interface PropertyMedia {
  id: number;
  property_id: number;
  media_type: MediaType;
  url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  sort_order: number;
  file_size?: number;
  mime_type?: string;
  width?: number;
  height?: number;
  duration?: number; // for videos
  is_primary: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface PropertyMediaCreate {
  property_id: number;
  media_type: MediaType;
  url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  sort_order?: number;
  file_size?: number;
  mime_type?: string;
  width?: number;
  height?: number;
  duration?: number;
  is_featured?: boolean;
}

export interface PropertyMediaUpdate extends Partial<PropertyMediaCreate> {
  id: number;
}

// Property History
export interface PropertyHistory {
  id: number;
  property_id: number;
  user_id: number;
  action: 'created' | 'updated' | 'deleted' | 'status_changed' | 'price_changed';
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  change_reason?: string;
  changed_at: string;
}

// Property Views (Analytics)
export interface PropertyView {
  id: number;
  property_id: number;
  user_id?: number;
  lead_id?: number;
  viewed_at: string;
  view_duration?: number;
  source: 'app' | 'website' | 'email' | 'social';
  ip_address?: string;
  user_agent?: string;
}

// Search and Filtering
export interface PropertySearchFilters {
  property_type?: PropertyType[];
  status?: PropertyStatus[];
  listing_type?: ListingType[];
  price_min?: number;
  price_max?: number;
  bedrooms_min?: number;
  bedrooms_max?: number;
  bathrooms_min?: number;
  bathrooms_max?: number;
  square_feet_min?: number;
  square_feet_max?: number;
  year_built_min?: number;
  year_built_max?: number;
  city?: string[];
  state?: string[];
  zip_code?: string[];
  neighborhood?: string[];
  features?: string[];
  has_media?: boolean;
  mls_only?: boolean;
  sort_by?: 'price' | 'created_at' | 'updated_at' | 'square_feet' | 'year_built';
  sort_order?: 'asc' | 'desc';
}

export interface PropertySearchResult {
  properties: Property[];
  total_count: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// API Response types
export interface PropertyApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PropertyListResponse extends PropertyApiResponse<Property[]> {
  pagination?: {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
  };
}

export interface PropertySearchResponse extends PropertyApiResponse<PropertySearchResult> {}

// Validation types
export interface PropertyValidationError {
  field: string;
  message: string;
  code: string;
}

export interface PropertyValidationResult {
  isValid: boolean;
  errors: PropertyValidationError[];
  warnings: string[];
}

// Form types
export interface PropertyFormData extends PropertyCreate {
  // Additional form-specific fields
  confirm_delete?: boolean;
  save_as_draft?: boolean;
}

// Bulk operations
export interface PropertyBulkOperation {
  operation: 'update_status' | 'update_price' | 'delete' | 'export';
  property_ids: number[];
  data?: Record<string, any>;
}

export interface PropertyBulkResult {
  success_count: number;
  failure_count: number;
  errors: Array<{
    property_id: number;
    error: string;
  }>;
}

// Analytics types
export interface PropertyAnalytics {
  property_id: number;
  total_views: number;
  unique_views: number;
  average_view_duration: number;
  lead_conversions: number;
  conversion_rate: number;
  top_sources: Array<{
    source: string;
    views: number;
    conversions: number;
  }>;
  view_trends: Array<{
    date: string;
    views: number;
    unique_views: number;
  }>;
}

// Export/Import types
export interface PropertyExportOptions {
  format: 'csv' | 'json' | 'xml';
  include_media: boolean;
  include_history: boolean;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface PropertyImportResult {
  imported_count: number;
  skipped_count: number;
  error_count: number;
  errors: Array<{
    row: number;
    field?: string;
    error: string;
  }>;
}

// Offline/Sync types
export interface PropertyOfflineQueue {
  id: string;
  operation: 'create' | 'update' | 'delete';
  property_id?: number;
  data: PropertyCreate | PropertyUpdate;
  timestamp: string;
  retry_count: number;
  last_error?: string;
}

export interface PropertySyncStatus {
  is_online: boolean;
  last_sync: string;
  pending_changes: number;
  sync_errors: string[];
}

// Constants and enums as objects for better TypeScript support
export const PROPERTY_TYPES: Record<PropertyType, string> = {
  single_family: 'Single Family Home',
  condo: 'Condominium',
  townhouse: 'Townhouse',
  multi_family: 'Multi-Family',
  land: 'Land',
  commercial: 'Commercial',
  other: 'Other'
};

export const PROPERTY_STATUSES: Record<PropertyStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  sold: 'Sold',
  off_market: 'Off Market',
  withdrawn: 'Withdrawn',
  expired: 'Expired'
};

export const LISTING_TYPES: Record<ListingType, string> = {
  sale: 'For Sale',
  rent: 'For Rent',
  both: 'For Sale/Rent'
};

export const MEDIA_TYPES: Record<MediaType, string> = {
  photo: 'Photo',
  video: 'Video',
  virtual_tour: 'Virtual Tour',
  floor_plan: 'Floor Plan',
  document: 'Document'
};

// Utility functions
export function getPropertyTypeLabel(type: PropertyType): string {
  return PROPERTY_TYPES[type] || type;
}

export function getPropertyStatusLabel(status: PropertyStatus): string {
  return PROPERTY_STATUSES[status] || status;
}

export function getListingTypeLabel(type: ListingType): string {
  return LISTING_TYPES[type] || type;
}

export function getMediaTypeLabel(type: MediaType): string {
  return MEDIA_TYPES[type] || type;
}

// Validation helpers
export function validatePropertyAddress(address: PropertyAddress): PropertyValidationResult {
  const errors: PropertyValidationError[] = [];

  if (!address.street?.trim()) {
    errors.push({
      field: 'address.street',
      message: 'Street address is required',
      code: 'REQUIRED'
    });
  }

  if (!address.city?.trim()) {
    errors.push({
      field: 'address.city',
      message: 'City is required',
      code: 'REQUIRED'
    });
  }

  if (!address.state?.trim()) {
    errors.push({
      field: 'address.state',
      message: 'State is required',
      code: 'REQUIRED'
    });
  }

  if (!address.zip_code?.trim()) {
    errors.push({
      field: 'address.zip_code',
      message: 'ZIP code is required',
      code: 'REQUIRED'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: []
  };
}

export function validatePropertyPrice(property: Partial<PropertyCreate>): PropertyValidationResult {
  const errors: PropertyValidationError[] = [];
  const warnings: string[] = [];

  if (property.listing_type === 'rent' && !property.rent_price) {
    errors.push({
      field: 'rent_price',
      message: 'Rent price is required for rental listings',
      code: 'REQUIRED'
    });
  }

  if (property.listing_type === 'sale' && !property.price) {
    errors.push({
      field: 'price',
      message: 'Sale price is required for sale listings',
      code: 'REQUIRED'
    });
  }

  if (property.price_min && property.price_max && property.price_min > property.price_max) {
    errors.push({
      field: 'price_range',
      message: 'Minimum price cannot be greater than maximum price',
      code: 'INVALID_RANGE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}