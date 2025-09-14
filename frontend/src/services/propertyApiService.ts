import {
  Property,
  PropertyCreate,
  PropertyUpdate,
  PropertySearchFilters,
  PropertyListResponse,
  PropertyApiResponse,
  PropertySearchResponse,
  PropertyMedia,
  PropertyMediaCreate,
  PropertyMediaUpdate,
  PropertyAnalytics,
  PropertyBulkOperation,
  PropertyBulkResult,
  PropertyExportOptions,
  PropertyImportResult,
  PropertyOfflineQueue,
  PropertySyncStatus
} from '../types/property';

class PropertyApiService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = 'http://localhost:5678/webhook';
    this.authToken = localStorage.getItem('authToken');
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

  private async handleResponse<T>(response: Response): Promise<PropertyApiResponse<T>> {
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
        error: errorMessage
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
        error: 'Failed to parse response'
      };
    }
  }

  // =====================================================
  // PROPERTY CRUD OPERATIONS
  // =====================================================

  /**
   * Get all properties for the current user
   */
  async getProperties(
    page: number = 1,
    pageSize: number = 20,
    filters?: PropertySearchFilters
  ): Promise<PropertyListResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        ...this.buildFilterParams(filters)
      });

      const response = await fetch(`${this.baseUrl}/api/properties?${params}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const result = await this.handleResponse<Property[]>(response);

      if (result.success && result.data) {
        // Add pagination info if available in response headers
        const totalCount = response.headers.get('X-Total-Count');
        const totalPages = response.headers.get('X-Total-Pages');

        return {
          success: true,
          data: result.data,
          pagination: totalCount ? {
            page,
            page_size: pageSize,
            total_count: parseInt(totalCount),
            total_pages: totalPages ? parseInt(totalPages) : Math.ceil(parseInt(totalCount) / pageSize)
          } : undefined
        };
      }

      return result as PropertyListResponse;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch properties'
      };
    }
  }

  /**
   * Get a single property by ID
   */
  async getProperty(id: number): Promise<PropertyApiResponse<Property>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/properties/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<Property>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch property'
      };
    }
  }

  /**
   * Create a new property
   */
  async createProperty(propertyData: PropertyCreate): Promise<PropertyApiResponse<Property>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/properties`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(propertyData),
      });

      return await this.handleResponse<Property>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create property'
      };
    }
  }

  /**
   * Update an existing property
   */
  async updateProperty(id: number, propertyData: PropertyUpdate): Promise<PropertyApiResponse<Property>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/properties/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(propertyData),
      });

      return await this.handleResponse<Property>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update property'
      };
    }
  }

  /**
   * Delete a property
   */
  async deleteProperty(id: number): Promise<PropertyApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/properties/${id}`, {
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
        error: error instanceof Error ? error.message : 'Failed to delete property'
      };
    }
  }

  // =====================================================
  // PROPERTY SEARCH
  // =====================================================

  /**
   * Advanced property search
   */
  async searchProperties(
    filters: PropertySearchFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PropertySearchResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        ...this.buildFilterParams(filters)
      });

      const response = await fetch(`${this.baseUrl}/api/properties/search?${params}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search properties'
      };
    }
  }

  /**
   * Build URL parameters from search filters
   */
  private buildFilterParams(filters?: PropertySearchFilters): Record<string, string> {
    if (!filters) return {};

    const params: Record<string, string> = {};

    // Property type
    if (filters.property_type?.length) {
      params.property_type = filters.property_type.join(',');
    }

    // Status
    if (filters.status?.length) {
      params.status = filters.status.join(',');
    }

    // Listing type
    if (filters.listing_type?.length) {
      params.listing_type = filters.listing_type.join(',');
    }

    // Price range
    if (filters.price_min !== undefined) {
      params.price_min = filters.price_min.toString();
    }
    if (filters.price_max !== undefined) {
      params.price_max = filters.price_max.toString();
    }

    // Property details
    if (filters.bedrooms_min !== undefined) {
      params.bedrooms_min = filters.bedrooms_min.toString();
    }
    if (filters.bedrooms_max !== undefined) {
      params.bedrooms_max = filters.bedrooms_max.toString();
    }

    if (filters.bathrooms_min !== undefined) {
      params.bathrooms_min = filters.bathrooms_min.toString();
    }
    if (filters.bathrooms_max !== undefined) {
      params.bathrooms_max = filters.bathrooms_max.toString();
    }

    if (filters.square_feet_min !== undefined) {
      params.square_feet_min = filters.square_feet_min.toString();
    }
    if (filters.square_feet_max !== undefined) {
      params.square_feet_max = filters.square_feet_max.toString();
    }

    // Location
    if (filters.city?.length) {
      params.city = filters.city.join(',');
    }
    if (filters.state?.length) {
      params.state = filters.state.join(',');
    }
    if (filters.zip_code?.length) {
      params.zip_code = filters.zip_code.join(',');
    }
    if (filters.neighborhood?.length) {
      params.neighborhood = filters.neighborhood.join(',');
    }

    // Features
    if (filters.features?.length) {
      params.features = filters.features.join(',');
    }

    // Other filters
    if (filters.has_media !== undefined) {
      params.has_media = filters.has_media.toString();
    }
    if (filters.mls_only !== undefined) {
      params.mls_only = filters.mls_only.toString();
    }

    // Sorting
    if (filters.sort_by) {
      params.sort_by = filters.sort_by;
    }
    if (filters.sort_order) {
      params.sort_order = filters.sort_order;
    }

    return params;
  }

  // =====================================================
  // PROPERTY MEDIA MANAGEMENT
  // =====================================================

  /**
   * Get media for a property
   */
  async getPropertyMedia(propertyId: number): Promise<PropertyApiResponse<PropertyMedia[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/properties/${propertyId}/media`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<PropertyMedia[]>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch property media'
      };
    }
  }

  /**
   * Add media to a property
   */
  async addPropertyMedia(mediaData: PropertyMediaCreate): Promise<PropertyApiResponse<PropertyMedia>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/properties/${mediaData.property_id}/media`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(mediaData),
      });

      return await this.handleResponse<PropertyMedia>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add property media'
      };
    }
  }

  /**
   * Update property media
   */
  async updatePropertyMedia(mediaId: number, mediaData: PropertyMediaUpdate): Promise<PropertyApiResponse<PropertyMedia>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/property-media/${mediaId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(mediaData),
      });

      return await this.handleResponse<PropertyMedia>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update property media'
      };
    }
  }

  /**
   * Delete property media
   */
  async deletePropertyMedia(mediaId: number): Promise<PropertyApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/property-media/${mediaId}`, {
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
        error: error instanceof Error ? error.message : 'Failed to delete property media'
      };
    }
  }

  /**
   * Set primary media for a property
   */
  async setPrimaryMedia(propertyId: number, mediaId: number): Promise<PropertyApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/properties/${propertyId}/media/${mediaId}/primary`, {
        method: 'PUT',
        headers: this.getHeaders(),
      });

      if (response.ok) {
        return { success: true };
      }

      return await this.handleResponse<void>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set primary media'
      };
    }
  }

  // =====================================================
  // ANALYTICS AND REPORTING
  // =====================================================

  /**
   * Get property analytics
   */
  async getPropertyAnalytics(propertyId: number): Promise<PropertyApiResponse<PropertyAnalytics>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/properties/${propertyId}/analytics`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<PropertyAnalytics>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch property analytics'
      };
    }
  }

  /**
   * Record property view
   */
  async recordPropertyView(
    propertyId: number,
    viewData: {
      lead_id?: number;
      view_duration?: number;
      source?: 'app' | 'website' | 'email' | 'social';
    }
  ): Promise<PropertyApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/properties/${propertyId}/view`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(viewData),
      });

      if (response.ok) {
        return { success: true };
      }

      return await this.handleResponse<void>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record property view'
      };
    }
  }

  // =====================================================
  // BULK OPERATIONS
  // =====================================================

  /**
   * Perform bulk operation on properties
   */
  async bulkOperation(operation: PropertyBulkOperation): Promise<PropertyApiResponse<PropertyBulkResult>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/properties/bulk`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(operation),
      });

      return await this.handleResponse<PropertyBulkResult>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform bulk operation'
      };
    }
  }

  // =====================================================
  // EXPORT/IMPORT
  // =====================================================

  /**
   * Export properties
   */
  async exportProperties(options: PropertyExportOptions): Promise<PropertyApiResponse<Blob>> {
    try {
      const params = new URLSearchParams();
      params.append('format', options.format);
      params.append('include_media', options.include_media.toString());
      params.append('include_history', options.include_history.toString());

      if (options.date_range) {
        params.append('start_date', options.date_range.start);
        params.append('end_date', options.date_range.end);
      }

      const response = await fetch(`${this.baseUrl}/api/properties/export?${params}`, {
        method: 'GET',
        headers: {
          ...this.getHeaders(),
          'Accept': 'application/octet-stream'
        },
      });

      if (!response.ok) {
        return await this.handleResponse<Blob>(response);
      }

      const blob = await response.blob();
      return {
        success: true,
        data: blob
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export properties'
      };
    }
  }

  /**
   * Import properties
   */
  async importProperties(file: File, format: 'csv' | 'json' | 'xml'): Promise<PropertyApiResponse<PropertyImportResult>> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', format);

      const response = await fetch(`${this.baseUrl}/api/properties/import`, {
        method: 'POST',
        headers: {
          'Authorization': this.getHeaders()['Authorization'] || ''
        },
        body: formData,
      });

      return await this.handleResponse<PropertyImportResult>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import properties'
      };
    }
  }

  // =====================================================
  // OFFLINE/SYNC FUNCTIONALITY
  // =====================================================

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<PropertyApiResponse<PropertySyncStatus>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/properties/sync/status`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<PropertySyncStatus>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sync status'
      };
    }
  }

  /**
   * Sync offline changes
   */
  async syncOfflineChanges(): Promise<PropertyApiResponse<{ synced_count: number; failed_count: number }>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/properties/sync`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<{ synced_count: number; failed_count: number }>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync offline changes'
      };
    }
  }

  /**
   * Queue offline operation
   */
  queueOfflineOperation(operation: PropertyOfflineQueue): void {
    const queue = this.getOfflineQueue();
    queue.push(operation);
    localStorage.setItem('property_offline_queue', JSON.stringify(queue));
  }

  /**
   * Get offline queue
   */
  getOfflineQueue(): PropertyOfflineQueue[] {
    try {
      const queue = localStorage.getItem('property_offline_queue');
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Clear offline queue
   */
  clearOfflineQueue(): void {
    localStorage.removeItem('property_offline_queue');
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
    localStorage.setItem('authToken', token);
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.authToken = null;
    localStorage.removeItem('authToken');
  }
}

// Export singleton instance
export const propertyApiService = new PropertyApiService();