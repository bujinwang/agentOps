// Advanced Property Search Types and Interfaces

export type SearchSortBy = 'relevance' | 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc' | 'sqft_desc' | 'sqft_asc';
export type SearchSortOrder = 'asc' | 'desc';

// Search Query Interface
export interface PropertySearchQuery {
  // Full-text search
  query?: string;

  // Location filters
  location?: {
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    radius?: number; // miles from center point
    latitude?: number;
    longitude?: number;
  };

  // Price filters
  priceRange?: {
    min?: number;
    max?: number;
  };

  // Property characteristics
  propertyTypes?: string[];
  bedrooms?: {
    min?: number;
    max?: number;
  };
  bathrooms?: {
    min?: number;
    max?: number;
  };
  squareFeet?: {
    min?: number;
    max?: number;
  };
  yearBuilt?: {
    min?: number;
    max?: number;
  };

  // Property features
  features?: string[]; // pool, garage, basement, etc.
  hasGarage?: boolean;
  hasBasement?: boolean;
  hasPool?: boolean;

  // MLS-specific filters
  mlsStatus?: string[];
  mlsProvider?: string[];
  listingDateRange?: {
    start: Date;
    end: Date;
  };

  // Status and availability
  status?: string[];
  excludeOffMarket?: boolean;

  // Sorting and pagination
  sortBy?: SearchSortBy;
  sortOrder?: SearchSortOrder;
  page?: number;
  limit?: number;

  // Advanced options
  includeInactive?: boolean;
  onlyWithMedia?: boolean;
  onlyWithVirtualTour?: boolean;
}

// Search Result Interface
export interface SearchResult {
  properties: Property[];
  totalCount: number;
  facets: SearchFacets;
  executionTime: number; // milliseconds
  query: PropertySearchQuery;
  hasMore: boolean;
  nextPage?: number;
}

// Search Facets for Dynamic Filtering
export interface SearchFacets {
  propertyTypes: FacetItem[];
  priceRanges: FacetItem[];
  bedroomCounts: FacetItem[];
  bathroomCounts: FacetItem[];
  cities: FacetItem[];
  states: FacetItem[];
  zipCodes: FacetItem[];
  mlsStatuses: FacetItem[];
  features: FacetItem[];
  yearBuiltRanges: FacetItem[];
}

export interface FacetItem {
  value: string;
  label: string;
  count: number;
  selected?: boolean;
}

// Saved Search Interface
export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  query: PropertySearchQuery;
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  executionCount: number;
  isDefault?: boolean;
  notificationsEnabled?: boolean;
  notificationFrequency?: 'immediate' | 'daily' | 'weekly';
  tags?: string[];
}

// Search History Interface
export interface SearchHistoryItem {
  id: string;
  query: PropertySearchQuery;
  resultCount: number;
  executedAt: Date;
  executionTime: number;
  userId?: string;
  deviceInfo?: {
    platform: string;
    version: string;
  };
}

// Search Analytics Interface
export interface SearchAnalytics {
  totalSearches: number;
  uniqueUsers: number;
  averageExecutionTime: number;
  popularQueries: PopularQuery[];
  popularFilters: PopularFilter[];
  conversionRate: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface PopularQuery {
  query: string;
  count: number;
  averageResults: number;
  trend: 'up' | 'down' | 'stable';
}

export interface PopularFilter {
  filterType: string;
  filterValue: string;
  count: number;
  percentage: number;
}

// Search Suggestions Interface
export interface SearchSuggestion {
  type: 'query' | 'location' | 'property_type' | 'feature';
  value: string;
  label: string;
  count?: number; // How many results this would return
  category?: string;
}

// Advanced Search Options
export interface AdvancedSearchOptions {
  fuzzyMatching?: boolean;
  includeSynonyms?: boolean;
  boostRecentListings?: boolean;
  boostLocalResults?: boolean;
  excludeDuplicates?: boolean;
  includeInactiveListings?: boolean;
  maxDistance?: number; // for location-based search
  resultDiversity?: 'high' | 'medium' | 'low';
}

// Search Result Export Options
export interface SearchExportOptions {
  format: 'csv' | 'pdf' | 'excel';
  includeFields: string[];
  includeMedia: boolean;
  maxRecords: number;
  sortBy?: SearchSortBy;
  includeAnalytics?: boolean;
  branding?: {
    companyName?: string;
    logoUrl?: string;
    agentName?: string;
    agentContact?: string;
  };
}

// Search Performance Metrics
export interface SearchPerformanceMetrics {
  query: string;
  executionTime: number;
  resultCount: number;
  cacheHit: boolean;
  indexUsed: string[];
  optimizationSuggestions: string[];
  timestamp: Date;
}

// Search Cache Interface
export interface SearchCacheEntry {
  id: string;
  query: PropertySearchQuery;
  results: SearchResult;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessedAt: Date;
}

// Search Preferences Interface
export interface SearchPreferences {
  defaultSortBy: SearchSortBy;
  defaultSortOrder: SearchSortOrder;
  defaultPageSize: number;
  showAdvancedFilters: boolean;
  autoSaveSearches: boolean;
  enableNotifications: boolean;
  preferredPropertyTypes: string[];
  preferredPriceRange: {
    min?: number;
    max?: number;
  };
  preferredLocation?: {
    city?: string;
    state?: string;
    zipCode?: string;
  };
  theme: 'light' | 'dark' | 'auto';
  language: string;
}

// Search State Management
export interface SearchState {
  currentQuery: PropertySearchQuery;
  results: SearchResult | null;
  isLoading: boolean;
  error: string | null;
  savedSearches: SavedSearch[];
  searchHistory: SearchHistoryItem[];
  preferences: SearchPreferences;
  cache: Map<string, SearchCacheEntry>;
}

// Hook Return Types
export interface UsePropertySearchReturn {
  searchState: SearchState;
  executeSearch: (query: PropertySearchQuery) => Promise<void>;
  clearSearch: () => void;
  saveSearch: (name: string, description?: string) => Promise<SavedSearch>;
  loadSavedSearch: (searchId: string) => Promise<void>;
  deleteSavedSearch: (searchId: string) => Promise<void>;
  updatePreferences: (preferences: Partial<SearchPreferences>) => void;
  exportResults: (options: SearchExportOptions) => Promise<Blob>;
  getSuggestions: (partialQuery: string) => Promise<SearchSuggestion[]>;
}

export interface UseSearchHistoryReturn {
  history: SearchHistoryItem[];
  addToHistory: (query: PropertySearchQuery, resultCount: number, executionTime: number) => void;
  clearHistory: () => void;
  getRecentSearches: (limit?: number) => SearchHistoryItem[];
  searchHistory: (query: string) => SearchHistoryItem[];
}

export interface UseSearchAnalyticsReturn {
  analytics: SearchAnalytics | null;
  loadAnalytics: (timeRange?: { start: Date; end: Date }) => Promise<void>;
  trackSearch: (query: PropertySearchQuery, executionTime: number, resultCount: number) => void;
  getPopularQueries: () => PopularQuery[];
  getSearchTrends: () => any[];
}

// Component Props Types
export interface PropertySearchScreenProps {
  initialQuery?: Partial<PropertySearchQuery>;
  showAdvancedFilters?: boolean;
  enableSavedSearches?: boolean;
  enableHistory?: boolean;
  maxResultsPerPage?: number;
  onPropertySelect?: (property: Property) => void;
  onSearchExecute?: (query: PropertySearchQuery, results: SearchResult) => void;
}

export interface SearchFiltersProps {
  query: PropertySearchQuery;
  facets?: SearchFacets;
  onQueryChange: (query: PropertySearchQuery) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
}

export interface SearchResultsProps {
  results: SearchResult;
  isLoading: boolean;
  error?: string;
  onLoadMore?: () => void;
  onSortChange?: (sortBy: SearchSortBy, sortOrder: SearchSortOrder) => void;
  onPropertyPress?: (property: Property) => void;
  showMapView?: boolean;
  onToggleMapView?: () => void;
}

export interface SavedSearchesProps {
  searches: SavedSearch[];
  onLoadSearch: (search: SavedSearch) => void;
  onDeleteSearch: (searchId: string) => void;
  onCreateSearch: (query: PropertySearchQuery) => void;
  onEditSearch: (search: SavedSearch) => void;
  maxDisplay?: number;
}

export interface SearchHistoryProps {
  history: SearchHistoryItem[];
  onExecuteSearch: (query: PropertySearchQuery) => void;
  onClearHistory: () => void;
  maxDisplay?: number;
}

// API Response Types
export interface SearchAPIResponse {
  success: boolean;
  data?: SearchResult;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    executionTime: number;
    cacheHit: boolean;
    totalQueries: number;
  };
}

export interface SavedSearchAPIResponse {
  success: boolean;
  data?: SavedSearch;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface SearchAnalyticsAPIResponse {
  success: boolean;
  data?: SearchAnalytics;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Utility Types
export type SearchFilterValue = string | number | boolean | string[] | number[];
export type SearchFilterType = 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'range' | 'location';

export interface SearchFilterDefinition {
  key: string;
  type: SearchFilterType;
  label: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  advanced?: boolean;
}

// Import Property type (assuming it exists in property types)
import { Property } from './property';