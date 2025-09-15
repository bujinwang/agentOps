// Comparative Market Analysis API Service
// Handles all CMA-related API operations including analysis creation, comparable search, and reporting

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ComparativeMarketAnalysis,
  ComparableProperty,
  CMASearchCriteria,
  CMAAPIResponse,
  CMAListResponse,
  CMADetailResponse,
  CMAReportResponse,
  CMAReport,
  CMAChart,
  CMAMap,
  MarketTrend,
  CMARecommendation,
  CMAExportFormat,
  CMACreateFormData,
  CMAUpdateFormData,
  CMAStatus,
  calculateSimilarityScore,
  calculatePriceRange,
  getMarketTrendDirection,
  CMA_DEFAULT_SEARCH_RADIUS,
  CMA_DEFAULT_MAX_COMPARABLES,
  CMA_DEFAULT_DATE_RANGE_MONTHS
} from '../types/cma';
import { Property } from '../types/property';

class CMApiService {
  private baseUrl: string;
  private authToken: string | null = null;
  private readonly TOKEN_KEY = '@cma_auth_token';
  private readonly BASE_URL_KEY = '@cma_base_url';

  constructor() {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      // Get base URL from environment or secure storage
      const envBaseUrl = process.env.EXPO_PUBLIC_CMA_API_URL ||
                        process.env.CMA_API_URL ||
                        'http://localhost:5678/webhook';

      // Try to get stored base URL, fallback to environment
      const storedBaseUrl = await AsyncStorage.getItem(this.BASE_URL_KEY);
      this.baseUrl = storedBaseUrl || envBaseUrl;

      // Get stored auth token
      this.authToken = await AsyncStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.warn('CMA Service initialization error:', error);
      // Fallback to environment defaults
      this.baseUrl = process.env.EXPO_PUBLIC_CMA_API_URL ||
                    process.env.CMA_API_URL ||
                    'http://localhost:5678/webhook';
      this.authToken = null;
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<CMAAPIResponse<T>> {
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        // If we can't parse the error response, use the default message
      }

      return {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: errorMessage,
          details: { status: response.status }
        }
      };
    }

    try {
      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (e) {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse response',
          details: e
        }
      };
    }
  }

  // =====================================================
  // CMA ANALYSIS OPERATIONS
  // =====================================================

  /**
   * Get all CMA analyses for the current user
   */
  async getCMAAnalyses(
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      status?: CMAStatus;
      subjectPropertyId?: number;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<CMAListResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        ...this.buildCMAFilterParams(filters)
      });

      const response = await fetch(`${this.baseUrl}/api/cma/analyses?${params}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const result = await this.handleResponse<ComparativeMarketAnalysis[]>(response);

      if (result.success && result.data) {
        // Add pagination info if available in response headers
        const totalCount = response.headers.get('X-Total-Count');
        const totalPages = response.headers.get('X-Total-Pages');

        return {
          success: true,
          data: result.data
        };
      }

      return result as CMAListResponse;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CMA_LIST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch CMA analyses',
          details: error
        }
      };
    }
  }

  /**
   * Get a single CMA analysis by ID
   */
  async getCMAAnalysis(id: string): Promise<CMADetailResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/cma/analyses/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<ComparativeMarketAnalysis>(response);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CMA_DETAIL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch CMA analysis',
          details: error
        }
      };
    }
  }

  /**
   * Create a new CMA analysis
   */
  async createCMAAnalysis(data: CMACreateFormData): Promise<CMADetailResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/cma/analyses`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      return await this.handleResponse<ComparativeMarketAnalysis>(response);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CMA_CREATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create CMA analysis',
          details: error
        }
      };
    }
  }

  /**
   * Update an existing CMA analysis
   */
  async updateCMAAnalysis(id: string, data: CMAUpdateFormData): Promise<CMADetailResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/cma/analyses/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      return await this.handleResponse<ComparativeMarketAnalysis>(response);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CMA_UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update CMA analysis',
          details: error
        }
      };
    }
  }

  /**
   * Delete a CMA analysis
   */
  async deleteCMAAnalysis(id: string): Promise<CMAAPIResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/cma/analyses/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (response.ok) {
        return { success: true };
      }

      return await this.handleResponse<void>(response);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CMA_DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete CMA analysis',
          details: error
        }
      };
    }
  }

  // =====================================================
  // COMPARABLE PROPERTY OPERATIONS
  // =====================================================

  /**
   * Search for comparable properties
   */
  async searchComparables(
    subjectProperty: Property,
    criteria: Partial<CMASearchCriteria>
  ): Promise<CMAAPIResponse<ComparableProperty[]>> {
    try {
      const searchCriteria: CMASearchCriteria = {
        subject_property_id: subjectProperty.id,
        search_radius_miles: criteria.search_radius_miles || CMA_DEFAULT_SEARCH_RADIUS,
        max_comparables: criteria.max_comparables || CMA_DEFAULT_MAX_COMPARABLES,
        date_range: {
          start: criteria.date_range?.start || this.getDefaultDateRange().start,
          end: criteria.date_range?.end || this.getDefaultDateRange().end
        },
        property_types: criteria.property_types || [subjectProperty.property_type],
        sale_types: criteria.sale_types || ['arms_length'],
        min_data_quality_score: criteria.min_data_quality_score || 70,
        require_verified_only: criteria.require_verified_only || false,
        exclude_distressed_sales: criteria.exclude_distressed_sales || false,
        min_bedrooms: criteria.min_bedrooms || Math.max(0, (subjectProperty.details?.bedrooms || 0) - 1),
        max_bedrooms: criteria.max_bedrooms || (subjectProperty.details?.bedrooms || 0) + 1,
        min_bathrooms: criteria.min_bathrooms || Math.max(0, (subjectProperty.details?.bathrooms || 0) - 1),
        max_bathrooms: criteria.max_bathrooms || (subjectProperty.details?.bathrooms || 0) + 1,
        min_square_feet: criteria.min_square_feet || Math.max(0, (subjectProperty.details?.square_feet || 0) * 0.8),
        max_square_feet: criteria.max_square_feet || (subjectProperty.details?.square_feet || 0) * 1.2,
        ...criteria
      };

      const response = await fetch(`${this.baseUrl}/api/cma/comparables/search`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          subject_property: subjectProperty,
          criteria: searchCriteria
        }),
      });

      const result = await this.handleResponse<ComparableProperty[]>(response);

      if (result.success && result.data) {
        // Calculate similarity scores for each comparable
        const comparablesWithScores = result.data.map(comp => ({
          ...comp,
          similarity_score: calculateSimilarityScore(subjectProperty, comp)
        }));

        // Sort by similarity score (highest first)
        comparablesWithScores.sort((a, b) => b.similarity_score - a.similarity_score);

        // Limit to max comparables
        const limitedComparables = comparablesWithScores.slice(0, searchCriteria.max_comparables);

        return {
          success: true,
          data: limitedComparables
        };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COMPARABLES_SEARCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to search comparables',
          details: error
        }
      };
    }
  }

  /**
   * Get comparables for a specific CMA analysis
   */
  async getCMAComparables(cmaId: string): Promise<CMAAPIResponse<ComparableProperty[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/cma/analyses/${cmaId}/comparables`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<ComparableProperty[]>(response);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CMA_COMPARABLES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch CMA comparables',
          details: error
        }
      };
    }
  }

  // =====================================================
  // CMA CALCULATION OPERATIONS
  // =====================================================

  /**
   * Calculate CMA statistics and analysis
   */
  async calculateCMA(
    subjectProperty: Property,
    comparables: ComparableProperty[],
    criteria: CMASearchCriteria
  ): Promise<CMAAPIResponse<{
    statistics: any;
    priceRange: any;
    recommendations: CMARecommendation[];
    marketTrends: MarketTrend[];
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/cma/calculate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          subject_property: subjectProperty,
          comparables,
          criteria
        }),
      });

      const result = await this.handleResponse<{
        statistics: any;
        priceRange: any;
        recommendations: CMARecommendation[];
        marketTrends: MarketTrend[];
      }>(response);

      if (result.success && result.data) {
        // Enhance recommendations with confidence levels
        const enhancedRecommendations = result.data.recommendations.map(rec => ({
          ...rec,
          confidence_level: this.calculateRecommendationConfidence(rec, comparables.length)
        }));

        return {
          success: true,
          data: {
            ...result.data,
            recommendations: enhancedRecommendations
          }
        };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CMA_CALCULATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to calculate CMA',
          details: error
        }
      };
    }
  }

  // =====================================================
  // REPORTING OPERATIONS
  // =====================================================

  /**
   * Generate CMA report
   */
  async generateCMAReport(
    cmaId: string,
    config?: {
      templateType?: string;
      includeSections?: string[];
      format?: CMAExportFormat;
    }
  ): Promise<CMAReportResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/cma/reports/generate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          cma_id: cmaId,
          config: config || {}
        }),
      });

      return await this.handleResponse<CMAReport>(response);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CMA_REPORT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate CMA report',
          details: error
        }
      };
    }
  }

  /**
   * Export CMA report
   */
  async exportCMAReport(
    cmaId: string,
    format: CMAExportFormat,
    options?: {
      includeCharts?: boolean;
      includeMaps?: boolean;
      templateType?: string;
    }
  ): Promise<Blob> {
    try {
      const params = new URLSearchParams({
        format,
        include_charts: (options?.includeCharts ?? true).toString(),
        include_maps: (options?.includeMaps ?? true).toString(),
        template_type: options?.templateType || 'standard'
      });

      const response = await fetch(
        `${this.baseUrl}/api/cma/analyses/${cmaId}/export?${params}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to export CMA report');
    }
  }

  // =====================================================
  // MARKET DATA OPERATIONS
  // =====================================================

  /**
   * Get market trends for an area
   */
  async getMarketTrends(
    location: {
      latitude: number;
      longitude: number;
      radius?: number;
    },
    timeframe: string = '6_months'
  ): Promise<CMAAPIResponse<MarketTrend[]>> {
    try {
      const params = new URLSearchParams({
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        radius: (location.radius || 5).toString(),
        timeframe
      });

      const response = await fetch(`${this.baseUrl}/api/cma/market/trends?${params}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<MarketTrend[]>(response);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MARKET_TRENDS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch market trends',
          details: error
        }
      };
    }
  }

  /**
   * Get neighborhood analysis
   */
  async getNeighborhoodAnalysis(
    location: {
      latitude: number;
      longitude: number;
    },
    propertyType?: string
  ): Promise<CMAAPIResponse<any>> {
    try {
      const params = new URLSearchParams({
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        property_type: propertyType || ''
      });

      const response = await fetch(`${this.baseUrl}/api/cma/neighborhood/analysis?${params}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<any>(response);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NEIGHBORHOOD_ANALYSIS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch neighborhood analysis',
          details: error
        }
      };
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private buildCMAFilterParams(filters?: {
    status?: CMAStatus;
    subjectPropertyId?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Record<string, string> {
    const params: Record<string, string> = {};

    if (filters?.status) {
      params.status = filters.status;
    }
    if (filters?.subjectPropertyId) {
      params.subject_property_id = filters.subjectPropertyId.toString();
    }
    if (filters?.dateFrom) {
      params.date_from = filters.dateFrom;
    }
    if (filters?.dateTo) {
      params.date_to = filters.dateTo;
    }

    return params;
  }

  private getDefaultDateRange(): { start: string; end: string } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - CMA_DEFAULT_DATE_RANGE_MONTHS);

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  }

  private calculateRecommendationConfidence(
    recommendation: CMARecommendation,
    comparableCount: number
  ): 'low' | 'medium' | 'high' | 'very_high' {
    // Base confidence on comparable count and recommendation type
    let confidence = 0;

    // More comparables = higher confidence
    if (comparableCount >= 6) confidence += 25;
    else if (comparableCount >= 4) confidence += 15;
    else if (comparableCount >= 2) confidence += 10;

    // Recommendation type affects confidence
    switch (recommendation.type) {
      case 'pricing':
        confidence += 20;
        break;
      case 'marketing':
        confidence += 15;
        break;
      case 'timing':
        confidence += 10;
        break;
      default:
        confidence += 5;
    }

    // Impact level affects confidence
    switch (recommendation.impact_level) {
      case 'high':
        confidence += 15;
        break;
      case 'medium':
        confidence += 10;
        break;
      case 'low':
        confidence += 5;
        break;
    }

    if (confidence >= 50) return 'very_high';
    if (confidence >= 35) return 'high';
    if (confidence >= 20) return 'medium';
    return 'low';
  }

  /**
   * Set authentication token with secure storage
   */
  async setAuthToken(token: string): Promise<void> {
    try {
      this.authToken = token;
      await AsyncStorage.setItem(this.TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store CMA auth token:', error);
      throw new Error('Failed to securely store authentication token');
    }
  }

  /**
   * Clear authentication token from secure storage
   */
  async clearAuthToken(): Promise<void> {
    try {
      this.authToken = null;
      await AsyncStorage.removeItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Failed to clear CMA auth token:', error);
      // Don't throw here as clearing should be graceful
    }
  }

  /**
   * Set custom base URL for different environments
   */
  async setBaseUrl(url: string): Promise<void> {
    try {
      // Validate URL format
      new URL(url);
      this.baseUrl = url;
      await AsyncStorage.setItem(this.BASE_URL_KEY, url);
    } catch (error) {
      console.error('Invalid CMA API URL:', error);
      throw new Error('Invalid API URL format');
    }
  }

  /**
   * Get current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Reset to default configuration
   */
  async resetToDefaults(): Promise<void> {
    try {
      const defaultUrl = process.env.EXPO_PUBLIC_CMA_API_URL ||
                        process.env.CMA_API_URL ||
                        'http://localhost:5678/webhook';

      this.baseUrl = defaultUrl;
      this.authToken = null;

      await AsyncStorage.multiRemove([this.BASE_URL_KEY, this.TOKEN_KEY]);
    } catch (error) {
      console.error('Failed to reset CMA configuration:', error);
    }
  }
}

// Export singleton instance
export const cmaApiService = new CMApiService();