import {
  PropertySearchQuery,
  SearchResult,
  SearchFacets,
  SearchAPIResponse,
  SavedSearch,
  SavedSearchAPIResponse,
  SearchAnalytics,
  SearchAnalyticsAPIResponse,
  SearchSuggestion,
  SearchExportOptions
} from '../types/search';
import { Property } from '../types/property';

/**
 * Search API Service
 * Handles communication with search backend endpoints
 */
export class SearchAPIService {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = '/api/search', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Execute property search
   */
  async searchProperties(query: PropertySearchQuery): Promise<SearchResult> {
    try {
      const response = await this.makeRequest<SearchResult>('POST', '/properties', query);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Search failed');
      }

      return response.data;
    } catch (error) {
      console.error('Search API error:', error);
      throw error;
    }
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(partialQuery: string, limit: number = 10): Promise<SearchSuggestion[]> {
    try {
      const response = await this.makeRequest<SearchSuggestion[]>('GET', '/suggestions', {
        q: partialQuery,
        limit
      });

      return response.success && response.data ? response.data : [];
    } catch (error) {
      console.error('Suggestions API error:', error);
      return [];
    }
  }

  /**
   * Get search facets for current query
   */
  async getSearchFacets(query: PropertySearchQuery): Promise<SearchFacets> {
    try {
      const response = await this.makeRequest<SearchFacets>('POST', '/facets', query);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to get facets');
      }

      return response.data;
    } catch (error) {
      console.error('Facets API error:', error);
      // Return empty facets on error
      return {
        propertyTypes: [],
        priceRanges: [],
        bedroomCounts: [],
        bathroomCounts: [],
        cities: [],
        states: [],
        zipCodes: [],
        mlsStatuses: [],
        features: [],
        yearBuiltRanges: []
      };
    }
  }

  /**
   * Save a search query
   */
  async saveSearch(name: string, query: PropertySearchQuery, description?: string): Promise<SavedSearch> {
    try {
      const response = await this.makeRequest<SavedSearch>('POST', '/saved-searches', {
        name,
        query,
        description
      });

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to save search');
      }

      return response.data;
    } catch (error) {
      console.error('Save search API error:', error);
      throw error;
    }
  }

  /**
   * Get saved searches
   */
  async getSavedSearches(): Promise<SavedSearch[]> {
    try {
      const response = await this.makeRequest<SavedSearch[]>('GET', '/saved-searches');

      return response.success && response.data ? response.data : [];
    } catch (error) {
      console.error('Get saved searches API error:', error);
      return [];
    }
  }

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(searchId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest('DELETE', `/saved-searches/${searchId}`);

      return response.success;
    } catch (error) {
      console.error('Delete saved search API error:', error);
      return false;
    }
  }

  /**
   * Update a saved search
   */
  async updateSavedSearch(searchId: string, updates: Partial<SavedSearch>): Promise<SavedSearch | null> {
    try {
      const response = await this.makeRequest<SavedSearch>('PUT', `/saved-searches/${searchId}`, updates);

      return response.success && response.data ? response.data : null;
    } catch (error) {
      console.error('Update saved search API error:', error);
      return null;
    }
  }

  /**
   * Get search history
   */
  async getSearchHistory(limit: number = 50): Promise<any[]> {
    try {
      const response = await this.makeRequest<any[]>('GET', '/history', { limit });

      return response.success && response.data ? response.data : [];
    } catch (error) {
      console.error('Get search history API error:', error);
      return [];
    }
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(timeRange?: { start: Date; end: Date }): Promise<SearchAnalytics | null> {
    try {
      const params: any = {};
      if (timeRange) {
        params.startDate = timeRange.start.toISOString();
        params.endDate = timeRange.end.toISOString();
      }

      const response = await this.makeRequest<SearchAnalytics>('GET', '/analytics', params);

      return response.success && response.data ? response.data : null;
    } catch (error) {
      console.error('Get search analytics API error:', error);
      return null;
    }
  }

  /**
   * Export search results
   */
  async exportSearchResults(query: PropertySearchQuery, options: SearchExportOptions): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/export`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ query, options })
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Export API error:', error);
      throw error;
    }
  }

  /**
   * Get popular search terms
   */
  async getPopularSearchTerms(limit: number = 20): Promise<string[]> {
    try {
      const response = await this.makeRequest<string[]>('GET', '/popular-terms', { limit });

      return response.success && response.data ? response.data : [];
    } catch (error) {
      console.error('Get popular terms API error:', error);
      return [];
    }
  }

  /**
   * Get location suggestions
   */
  async getLocationSuggestions(partialLocation: string, limit: number = 10): Promise<string[]> {
    try {
      const response = await this.makeRequest<string[]>('GET', '/locations', {
        q: partialLocation,
        limit
      });

      return response.success && response.data ? response.data : [];
    } catch (error) {
      console.error('Get location suggestions API error:', error);
      return [];
    }
  }

  /**
   * Validate search query
   */
  validateSearchQuery(query: PropertySearchQuery): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate price range
    if (query.priceRange) {
      const { min, max } = query.priceRange;
      if (min !== undefined && max !== undefined && min > max) {
        errors.push('Minimum price cannot be greater than maximum price');
      }
      if (min !== undefined && min < 0) {
        errors.push('Minimum price cannot be negative');
      }
      if (max !== undefined && max < 0) {
        errors.push('Maximum price cannot be negative');
      }
    }

    // Validate bedroom range
    if (query.bedrooms) {
      const { min, max } = query.bedrooms;
      if (min !== undefined && max !== undefined && min > max) {
        errors.push('Minimum bedrooms cannot be greater than maximum bedrooms');
      }
      if (min !== undefined && min < 0) {
        errors.push('Minimum bedrooms cannot be negative');
      }
    }

    // Validate bathroom range
    if (query.bathrooms) {
      const { min, max } = query.bathrooms;
      if (min !== undefined && max !== undefined && min > max) {
        errors.push('Minimum bathrooms cannot be greater than maximum bathrooms');
      }
      if (min !== undefined && min < 0) {
        errors.push('Minimum bathrooms cannot be negative');
      }
    }

    // Validate square footage range
    if (query.squareFeet) {
      const { min, max } = query.squareFeet;
      if (min !== undefined && max !== undefined && min > max) {
        errors.push('Minimum square footage cannot be greater than maximum square footage');
      }
      if (min !== undefined && min < 0) {
        errors.push('Minimum square footage cannot be negative');
      }
    }

    // Validate year built range
    if (query.yearBuilt) {
      const { min, max } = query.yearBuilt;
      if (min !== undefined && max !== undefined && min > max) {
        errors.push('Minimum year built cannot be greater than maximum year built');
      }
      const currentYear = new Date().getFullYear();
      if (min !== undefined && (min < 1800 || min > currentYear)) {
        errors.push('Minimum year built must be between 1800 and current year');
      }
      if (max !== undefined && (max < 1800 || max > currentYear)) {
        errors.push('Maximum year built must be between 1800 and current year');
      }
    }

    // Validate pagination
    if (query.page !== undefined && query.page < 1) {
      errors.push('Page number must be greater than 0');
    }

    if (query.limit !== undefined && (query.limit < 1 || query.limit > 100)) {
      errors.push('Limit must be between 1 and 100');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Make HTTP request with proper headers and error handling
   */
  private async makeRequest<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<SearchAPIResponse & { data?: T }> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: response.status.toString(),
            message: `HTTP ${response.status}: ${response.statusText}`,
            details: await response.text().catch(() => undefined)
          }
        };
      }

      const data = await response.json();

      return {
        success: true,
        data,
        meta: {
          executionTime: parseInt(response.headers.get('X-Execution-Time') || '0'),
          cacheHit: response.headers.get('X-Cache-Hit') === 'true',
          totalQueries: parseInt(response.headers.get('X-Total-Queries') || '0')
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed',
          details: error
        }
      };
    }
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  /**
   * Build search query from simple parameters (for backward compatibility)
   */
  buildSearchQuery(params: {
    query?: string;
    city?: string;
    state?: string;
    minPrice?: number;
    maxPrice?: number;
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    sortBy?: string;
    page?: number;
    limit?: number;
  }): PropertySearchQuery {
    return {
      query: params.query,
      location: {
        city: params.city,
        state: params.state
      },
      priceRange: {
        min: params.minPrice,
        max: params.maxPrice
      },
      propertyTypes: params.propertyType ? [params.propertyType] : undefined,
      bedrooms: params.bedrooms ? { min: params.bedrooms } : undefined,
      bathrooms: params.bathrooms ? { min: params.bathrooms } : undefined,
      sortBy: (params.sortBy as any) || 'relevance',
      page: params.page || 1,
      limit: params.limit || 20
    };
  }
}

/**
 * Factory function to create search API service
 */
export function createSearchAPIService(baseUrl?: string, apiKey?: string): SearchAPIService {
  return new SearchAPIService(baseUrl, apiKey);
}

/**
 * Default search API service instance
 */
export const searchAPIService = new SearchAPIService();