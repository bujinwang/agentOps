// Comparative Market Analysis (CMA) Types
// Comprehensive type definitions for property market analysis and valuation

import { Property } from './property';

export type CMAStatus = 'draft' | 'in_progress' | 'completed' | 'archived';

export type PropertyAdjustmentType =
  | 'location'
  | 'size'
  | 'condition'
  | 'age'
  | 'features'
  | 'market_conditions'
  | 'time_adjustment'
  | 'custom';

export type MarketTrendDirection = 'up' | 'down' | 'stable' | 'volatile';

export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'very_high';

export type CMAMetricType =
  | 'price_per_sqft'
  | 'total_price'
  | 'days_on_market'
  | 'sale_to_list_ratio'
  | 'inventory_levels'
  | 'market_absorption';

export type MarketTimeframe =
  | '1_month'
  | '3_months'
  | '6_months'
  | '1_year'
  | '2_years'
  | '5_years';

// Property Adjustment Interface
export interface PropertyAdjustment {
  id: string;
  type: PropertyAdjustmentType;
  description: string;
  amount: number; // Positive or negative adjustment
  percentage?: number; // Alternative percentage-based adjustment
  justification: string;
  source?: string; // MLS, appraisal, market data, etc.
  confidence_level: ConfidenceLevel;
  applied: boolean;
  created_at: string;
}

// Comparable Property Interface
export interface ComparableProperty {
  id: number;
  property_id?: number; // Link to actual property if exists
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude?: number;
  longitude?: number;

  // Property Details
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  lot_size?: number;
  year_built?: number;
  garage_spaces?: number;
  pool?: boolean;
  waterfront?: boolean;

  // Sale Information
  sale_price: number;
  sale_date: string;
  original_list_price?: number;
  days_on_market: number;
  sale_type: 'arms_length' | 'short_sale' | 'foreclosure' | 'relocation' | 'estate_sale';

  // Calculated Metrics
  price_per_sqft: number;
  sale_to_list_ratio?: number;

  // Comparison Data
  distance_miles: number;
  similarity_score: number; // 0-100, higher is more similar
  adjustments: PropertyAdjustment[];
  adjusted_price: number;

  // Market Context
  market_conditions: string;
  neighborhood_rating?: number; // 1-10 scale
  school_district_rating?: number; // 1-10 scale

  // Metadata
  data_source: 'mls' | 'public_record' | 'appraisal' | 'manual_entry';
  data_quality_score: number; // 0-100
  last_updated: string;
  verified: boolean;
}

// CMA Search Criteria
export interface CMASearchCriteria {
  subject_property_id: number;
  search_radius_miles: number;
  max_comparables: number;
  date_range: {
    start: string;
    end: string;
  };

  // Property Filters
  property_types: string[];
  min_bedrooms?: number;
  max_bedrooms?: number;
  min_bathrooms?: number;
  max_bathrooms?: number;
  min_square_feet?: number;
  max_square_feet?: number;
  min_lot_size?: number;
  max_lot_size?: number;
  min_year_built?: number;
  max_year_built?: number;

  // Sale Filters
  min_sale_price?: number;
  max_sale_price?: number;
  sale_types: string[];
  max_days_on_market?: number;

  // Quality Filters
  min_data_quality_score: number;
  require_verified_only: boolean;
  exclude_distressed_sales: boolean;
}

// CMA Statistics
export interface CMAStatistics {
  comparables_count: number;
  average_price: number;
  median_price: number;
  price_range: {
    low: number;
    high: number;
    range: number;
  };

  average_price_per_sqft: number;
  median_price_per_sqft: number;
  price_per_sqft_range: {
    low: number;
    high: number;
    range: number;
  };

  average_days_on_market: number;
  median_days_on_market: number;
  average_sale_to_list_ratio: number;

  // Statistical Measures
  standard_deviation: number;
  coefficient_of_variation: number;
  confidence_interval_95: {
    low: number;
    high: number;
  };

  // Market Indicators
  market_absorption_rate: number; // Properties sold per month
  inventory_levels: number; // Months of inventory
  market_trend: MarketTrendDirection;
  market_strength: 'buyers' | 'sellers' | 'balanced';
}

// Price Range Analysis
export interface PriceRange {
  subject_property_value: number;
  estimated_value_range: {
    low: number;
    high: number;
    confidence_level: ConfidenceLevel;
  };

  price_per_sqft_range: {
    low: number;
    high: number;
    average: number;
  };

  // Adjustment Summary
  total_adjustments: number;
  adjustment_breakdown: {
    positive: number;
    negative: number;
    net_adjustment: number;
  };

  // Value Confidence
  confidence_score: number; // 0-100
  confidence_factors: {
    comparable_quality: number;
    market_data_freshness: number;
    adjustment_accuracy: number;
    market_conditions: number;
  };
}

// CMA Recommendation
export interface CMARecommendation {
  id: string;
  type: 'pricing' | 'marketing' | 'timing' | 'strategy';
  title: string;
  description: string;
  confidence_level: ConfidenceLevel;
  impact_level: 'low' | 'medium' | 'high';
  actionable: boolean;
  timeframe?: string;
  expected_outcome?: string;
  supporting_data: {
    metric: string;
    value: number;
    benchmark?: number;
    trend?: MarketTrendDirection;
  }[];
}

// Market Trend Analysis
export interface MarketTrend {
  timeframe: MarketTimeframe;
  metric: CMAMetricType;
  current_value: number;
  previous_value: number;
  change_amount: number;
  change_percentage: number;
  direction: MarketTrendDirection;
  significance: 'low' | 'medium' | 'high';
  data_points: number;
  confidence_level: ConfidenceLevel;
}

// Comparative Market Analysis Main Interface
export interface ComparativeMarketAnalysis {
  id: string;
  subject_property: Property;
  subject_property_value?: number;

  // Analysis Configuration
  search_criteria: CMASearchCriteria;
  analysis_date: string;
  analysis_status: CMAStatus;
  analyst_id?: number;
  analyst_name?: string;

  // Core Data
  comparables: ComparableProperty[];
  statistics: CMAStatistics;
  price_range: PriceRange;
  recommendations: CMARecommendation[];

  // Market Context
  market_trends: MarketTrend[];
  neighborhood_analysis: NeighborhoodAnalysis;
  market_forecast: MarketForecast;

  // Quality and Validation
  data_quality_score: number;
  validation_warnings: string[];
  data_sources: string[];

  // Metadata
  created_at: string;
  updated_at: string;
  version: number;
  notes?: string;
}

// Neighborhood Analysis
export interface NeighborhoodAnalysis {
  neighborhood_name: string;
  boundaries: {
    latitude_min: number;
    latitude_max: number;
    longitude_min: number;
    longitude_max: number;
  };

  demographics: {
    population: number;
    median_income: number;
    median_age: number;
    education_level: string;
  };

  market_metrics: {
    average_price: number;
    average_price_per_sqft: number;
    average_days_on_market: number;
    inventory_levels: number;
    market_trend: MarketTrendDirection;
  };

  amenities: {
    schools: SchoolRating[];
    transportation: TransportationAccess[];
    shopping_centers: number;
    parks_recreation: number;
    crime_rate: number;
  };

  comparables_in_neighborhood: number;
  neighborhood_rating: number; // 1-10 scale
}

// Market Forecast
export interface MarketForecast {
  forecast_period_months: number;
  price_projection: {
    expected_change_percentage: number;
    confidence_interval: {
      low: number;
      high: number;
    };
    direction: MarketTrendDirection;
  };

  market_indicators: {
    interest_rates: number;
    employment_rate: number;
    population_growth: number;
    economic_growth: number;
  };

  risk_factors: {
    interest_rate_sensitivity: 'low' | 'medium' | 'high';
    economic_uncertainty: 'low' | 'medium' | 'high';
    inventory_pressure: 'low' | 'medium' | 'high';
  };

  forecast_confidence: ConfidenceLevel;
  last_updated: string;
}

// School Rating
export interface SchoolRating {
  name: string;
  rating: number; // 1-10 scale
  type: 'elementary' | 'middle' | 'high' | 'district';
  distance_miles: number;
  test_scores?: {
    math: number;
    reading: number;
    science: number;
  };
}

// Transportation Access
export interface TransportationAccess {
  type: 'highway' | 'public_transit' | 'airport' | 'rail';
  name: string;
  distance_miles: number;
  accessibility_score: number; // 1-10 scale
}

// CMA Report Configuration
export interface CMAReportConfig {
  id: string;
  name: string;
  template_type: 'standard' | 'detailed' | 'executive' | 'custom';
  include_sections: {
    executive_summary: boolean;
    subject_property: boolean;
    comparables_analysis: boolean;
    market_trends: boolean;
    neighborhood_analysis: boolean;
    recommendations: boolean;
    methodology: boolean;
    appendices: boolean;
  };

  formatting: {
    color_scheme: string;
    logo_url?: string;
    company_name?: string;
    agent_name?: string;
    agent_license?: string;
    agent_contact?: {
      phone: string;
      email: string;
      website?: string;
    };
  };

  custom_sections?: CMAReportSection[];
  created_by: number;
  created_at: string;
  updated_at: string;
}

// CMA Report Section
export interface CMAReportSection {
  id: string;
  title: string;
  content_type: 'text' | 'chart' | 'table' | 'image' | 'map';
  content: any;
  order: number;
  required: boolean;
}

// CMA Report
export interface CMAReport {
  id: string;
  cma_id: string;
  config_id: string;
  generated_at: string;
  generated_by: number;

  content: {
    executive_summary: string;
    subject_property_analysis: any;
    comparables_data: ComparableProperty[];
    market_analysis: any;
    recommendations: CMARecommendation[];
    charts: CMAChart[];
    maps: CMAMap[];
  };

  metadata: {
    report_version: string;
    data_freshness_date: string;
    market_data_sources: string[];
    disclaimers: string[];
  };

  export_formats: {
    pdf: boolean;
    excel: boolean;
    word: boolean;
    html: boolean;
  };
}

// CMA Chart
export interface CMAChart {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'histogram';
  title: string;
  data: any;
  x_axis_label?: string;
  y_axis_label?: string;
  legend?: string[];
  colors?: string[];
}

// CMA Map
export interface CMAMap {
  id: string;
  type: 'comparables' | 'neighborhood' | 'market_area';
  center: {
    latitude: number;
    longitude: number;
  };
  zoom: number;
  markers: CMAMapMarker[];
  boundaries?: any; // GeoJSON boundaries
}

// CMA Map Marker
export interface CMAMapMarker {
  id: string;
  type: 'subject' | 'comparable' | 'landmark';
  position: {
    latitude: number;
    longitude: number;
  };
  title: string;
  description?: string;
  icon?: string;
  color?: string;
}

// API Response Types
export interface CMAAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    execution_time: number;
    total_count?: number;
    page?: number;
    page_size?: number;
  };
}

export interface CMAListResponse extends CMAAPIResponse<ComparativeMarketAnalysis[]> {}
export interface CMADetailResponse extends CMAAPIResponse<ComparativeMarketAnalysis> {}
export interface CMAReportResponse extends CMAAPIResponse<CMAReport> {}

// Form Types
export interface CMACreateFormData {
  subject_property_id: number;
  search_criteria: Partial<CMASearchCriteria>;
  notes?: string;
}

export interface CMAUpdateFormData {
  search_criteria?: Partial<CMASearchCriteria>;
  notes?: string;
  status?: CMAStatus;
}

// Utility Types
export type CMAExportFormat = 'pdf' | 'excel' | 'word' | 'html';
export type CMAChartType = 'price_comparison' | 'price_trends' | 'market_analysis' | 'neighborhood_comparison';

// Constants
export const CMA_DEFAULT_SEARCH_RADIUS = 1.0; // miles
export const CMA_DEFAULT_MAX_COMPARABLES = 6;
export const CMA_DEFAULT_DATE_RANGE_MONTHS = 6;
export const CMA_MIN_DATA_QUALITY_SCORE = 70;
export const CMA_CONFIDENCE_LEVELS: Record<ConfidenceLevel, number> = {
  low: 60,
  medium: 75,
  high: 85,
  very_high: 95
};

// Helper Functions
export function calculateSimilarityScore(
  subject: Property,
  comparable: ComparableProperty
): number {
  let score = 100;

  // Bedroom match
  const subjectBedrooms = subject.details?.bedrooms || 0;
  const compBedrooms = comparable.bedrooms;
  if (subjectBedrooms !== compBedrooms) {
    score -= Math.abs(subjectBedrooms - compBedrooms) * 10;
  }

  // Bathroom match
  const subjectBathrooms = subject.details?.bathrooms || 0;
  const compBathrooms = comparable.bathrooms;
  if (subjectBathrooms !== compBathrooms) {
    score -= Math.abs(subjectBathrooms - compBathrooms) * 15;
  }

  // Square footage match (within 20%)
  const subjectSqft = subject.details?.square_feet || 1;
  const compSqft = comparable.square_feet;
  const sqftDiff = Math.abs(subjectSqft - compSqft) / subjectSqft;
  if (sqftDiff > 0.2) {
    score -= sqftDiff * 20;
  }

  // Property type match
  if (subject.property_type !== comparable.property_type) {
    score -= 25;
  }

  // Distance penalty
  if (comparable.distance_miles > 1) {
    score -= comparable.distance_miles * 5;
  }

  return Math.max(0, Math.min(100, score));
}

export function calculatePriceRange(
  comparables: ComparableProperty[],
  confidenceLevel: ConfidenceLevel = 'medium'
): PriceRange['estimated_value_range'] {
  if (comparables.length === 0) {
    return { low: 0, high: 0, confidence_level: 'low' };
  }

  const prices = comparables.map(c => c.adjusted_price || c.sale_price);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const stdDev = Math.sqrt(
    prices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / prices.length
  );

  const confidenceMultiplier = CMA_CONFIDENCE_LEVELS[confidenceLevel] / 100;
  const range = stdDev * confidenceMultiplier;

  return {
    low: Math.max(0, avg - range),
    high: avg + range,
    confidence_level: confidenceLevel
  };
}

export function getMarketTrendDirection(
  current: number,
  previous: number,
  threshold: number = 0.05
): MarketTrendDirection {
  const change = (current - previous) / previous;

  if (Math.abs(change) < threshold) {
    return 'stable';
  }

  return change > 0 ? 'up' : 'down';
}

export function formatPriceRange(range: PriceRange['estimated_value_range']): string {
  const low = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(range.low);

  const high = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(range.high);

  return `${low} - ${high}`;
}

export function getConfidenceLevelDescription(level: ConfidenceLevel): string {
  switch (level) {
    case 'low': return 'Based on limited comparable data';
    case 'medium': return 'Based on moderate comparable data';
    case 'high': return 'Based on strong comparable data';
    case 'very_high': return 'Based on extensive high-quality data';
    default: return 'Unknown confidence level';
  }
}