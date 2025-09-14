import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Property,
  PropertyCreate,
  PropertyUpdate,
  PropertySearchFilters,
  PropertyListResponse,
  PropertyApiResponse,
  PropertyMedia,
  PropertyMediaCreate,
  PropertyMediaUpdate,
  PropertyAnalytics
} from '../types/property';
import { propertyApiService } from '../services/propertyApiService';

interface UsePropertiesOptions {
  pageSize?: number;
  autoLoad?: boolean;
  filters?: PropertySearchFilters;
}

interface UsePropertiesReturn {
  // Data
  properties: Property[];
  currentProperty: Property | null;
  propertyMedia: PropertyMedia[];
  propertyAnalytics: PropertyAnalytics | null;

  // Loading states
  isLoading: boolean;
  isLoadingProperty: boolean;
  isLoadingMedia: boolean;
  isLoadingAnalytics: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;

  // Pagination
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  } | null;

  // Errors
  error: string | null;
  propertyError: string | null;
  mediaError: string | null;
  analyticsError: string | null;

  // Actions
  loadProperties: (page?: number, filters?: PropertySearchFilters) => Promise<void>;
  loadProperty: (id: number) => Promise<void>;
  createProperty: (propertyData: PropertyCreate) => Promise<Property | null>;
  updateProperty: (id: number, propertyData: PropertyUpdate) => Promise<Property | null>;
  deleteProperty: (id: number) => Promise<boolean>;
  searchProperties: (filters: PropertySearchFilters, page?: number) => Promise<void>;

  // Media actions
  loadPropertyMedia: (propertyId: number) => Promise<void>;
  addPropertyMedia: (mediaData: PropertyMediaCreate) => Promise<PropertyMedia | null>;
  updatePropertyMedia: (mediaId: number, mediaData: PropertyMediaUpdate) => Promise<PropertyMedia | null>;
  deletePropertyMedia: (mediaId: number) => Promise<boolean>;
  setPrimaryMedia: (propertyId: number, mediaId: number) => Promise<boolean>;

  // Analytics
  loadPropertyAnalytics: (propertyId: number) => Promise<void>;
  recordPropertyView: (propertyId: number, viewData?: any) => Promise<boolean>;

  // Utility
  clearError: () => void;
  clearProperty: () => void;
  refresh: () => Promise<void>;
}

export function useProperties(options: UsePropertiesOptions = {}): UsePropertiesReturn {
  const { pageSize = 20, autoLoad = true, filters } = options;

  // State
  const [properties, setProperties] = useState<Property[]>([]);
  const [currentProperty, setCurrentProperty] = useState<Property | null>(null);
  const [propertyMedia, setPropertyMedia] = useState<PropertyMedia[]>([]);
  const [propertyAnalytics, setPropertyAnalytics] = useState<PropertyAnalytics | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProperty, setIsLoadingProperty] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  } | null>(null);

  // Errors
  const [error, setError] = useState<string | null>(null);
  const [propertyError, setPropertyError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Current page tracking
  const [currentPage, setCurrentPage] = useState(1);
  const [currentFilters, setCurrentFilters] = useState<PropertySearchFilters | undefined>(filters);

  // =====================================================
  // PROPERTY CRUD OPERATIONS
  // =====================================================

  const loadProperties = useCallback(async (page: number = 1, searchFilters?: PropertySearchFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      const filtersToUse = searchFilters || currentFilters;
      const response: PropertyListResponse = await propertyApiService.getProperties(page, pageSize, filtersToUse);

      if (response.success && response.data) {
        if (page === 1) {
          setProperties(response.data);
        } else {
          setProperties(prev => [...prev, ...response.data]);
        }

        if (response.pagination) {
          setPagination({
            page: response.pagination.page,
            pageSize: response.pagination.page_size,
            totalCount: response.pagination.total_count,
            totalPages: response.pagination.total_pages,
            hasMore: response.pagination.page < response.pagination.total_pages
          });
        }

        setCurrentPage(page);
        setCurrentFilters(filtersToUse);
      } else {
        setError(response.error || 'Failed to load properties');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load properties');
    } finally {
      setIsLoading(false);
    }
  }, [pageSize, currentFilters]);

  const loadProperty = useCallback(async (id: number) => {
    setIsLoadingProperty(true);
    setPropertyError(null);

    try {
      const response: PropertyApiResponse<Property> = await propertyApiService.getProperty(id);

      if (response.success && response.data) {
        setCurrentProperty(response.data);
      } else {
        setPropertyError(response.error || 'Failed to load property');
      }
    } catch (err) {
      setPropertyError(err instanceof Error ? err.message : 'Failed to load property');
    } finally {
      setIsLoadingProperty(false);
    }
  }, []);

  const createProperty = useCallback(async (propertyData: PropertyCreate): Promise<Property | null> => {
    setIsCreating(true);
    setError(null);

    try {
      const response: PropertyApiResponse<Property> = await propertyApiService.createProperty(propertyData);

      if (response.success && response.data) {
        // Add to the properties list
        setProperties(prev => [response.data!, ...prev]);
        return response.data;
      } else {
        setError(response.error || 'Failed to create property');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create property');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const updateProperty = useCallback(async (id: number, propertyData: PropertyUpdate): Promise<Property | null> => {
    setIsUpdating(true);
    setError(null);

    try {
      const response: PropertyApiResponse<Property> = await propertyApiService.updateProperty(id, propertyData);

      if (response.success && response.data) {
        // Update in the properties list
        setProperties(prev => prev.map(prop =>
          prop.id === id ? response.data! : prop
        ));

        // Update current property if it's the same one
        if (currentProperty?.id === id) {
          setCurrentProperty(response.data);
        }

        return response.data;
      } else {
        setError(response.error || 'Failed to update property');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update property');
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [currentProperty]);

  const deleteProperty = useCallback(async (id: number): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      const response: PropertyApiResponse<void> = await propertyApiService.deleteProperty(id);

      if (response.success) {
        // Remove from the properties list
        setProperties(prev => prev.filter(prop => prop.id !== id));

        // Clear current property if it's the deleted one
        if (currentProperty?.id === id) {
          setCurrentProperty(null);
        }

        return true;
      } else {
        setError(response.error || 'Failed to delete property');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete property');
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [currentProperty]);

  const searchProperties = useCallback(async (filters: PropertySearchFilters, page: number = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const response: PropertyListResponse = await propertyApiService.getProperties(page, pageSize, filters);

      if (response.success && response.data) {
        setProperties(response.data);

        if (response.pagination) {
          setPagination({
            page: response.pagination.page,
            pageSize: response.pagination.page_size,
            totalCount: response.pagination.total_count,
            totalPages: response.pagination.total_pages,
            hasMore: response.pagination.page < response.pagination.total_pages
          });
        }

        setCurrentPage(page);
        setCurrentFilters(filters);
      } else {
        setError(response.error || 'Failed to search properties');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search properties');
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  // =====================================================
  // PROPERTY MEDIA OPERATIONS
  // =====================================================

  const loadPropertyMedia = useCallback(async (propertyId: number) => {
    setIsLoadingMedia(true);
    setMediaError(null);

    try {
      const response: PropertyApiResponse<PropertyMedia[]> = await propertyApiService.getPropertyMedia(propertyId);

      if (response.success && response.data) {
        setPropertyMedia(response.data);
      } else {
        setMediaError(response.error || 'Failed to load property media');
      }
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Failed to load property media');
    } finally {
      setIsLoadingMedia(false);
    }
  }, []);

  const addPropertyMedia = useCallback(async (mediaData: PropertyMediaCreate): Promise<PropertyMedia | null> => {
    setIsLoadingMedia(true);
    setMediaError(null);

    try {
      const response: PropertyApiResponse<PropertyMedia> = await propertyApiService.addPropertyMedia(mediaData);

      if (response.success && response.data) {
        setPropertyMedia(prev => [...prev, response.data!]);
        return response.data;
      } else {
        setMediaError(response.error || 'Failed to add property media');
        return null;
      }
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Failed to add property media');
      return null;
    } finally {
      setIsLoadingMedia(false);
    }
  }, []);

  const updatePropertyMedia = useCallback(async (mediaId: number, mediaData: PropertyMediaUpdate): Promise<PropertyMedia | null> => {
    setIsLoadingMedia(true);
    setMediaError(null);

    try {
      const response: PropertyApiResponse<PropertyMedia> = await propertyApiService.updatePropertyMedia(mediaId, mediaData);

      if (response.success && response.data) {
        setPropertyMedia(prev => prev.map(media =>
          media.id === mediaId ? response.data! : media
        ));
        return response.data;
      } else {
        setMediaError(response.error || 'Failed to update property media');
        return null;
      }
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Failed to update property media');
      return null;
    } finally {
      setIsLoadingMedia(false);
    }
  }, []);

  const deletePropertyMedia = useCallback(async (mediaId: number): Promise<boolean> => {
    setIsLoadingMedia(true);
    setMediaError(null);

    try {
      const response: PropertyApiResponse<void> = await propertyApiService.deletePropertyMedia(mediaId);

      if (response.success) {
        setPropertyMedia(prev => prev.filter(media => media.id !== mediaId));
        return true;
      } else {
        setMediaError(response.error || 'Failed to delete property media');
        return false;
      }
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Failed to delete property media');
      return false;
    } finally {
      setIsLoadingMedia(false);
    }
  }, []);

  const setPrimaryMedia = useCallback(async (propertyId: number, mediaId: number): Promise<boolean> => {
    setIsLoadingMedia(true);
    setMediaError(null);

    try {
      const response: PropertyApiResponse<void> = await propertyApiService.setPrimaryMedia(propertyId, mediaId);

      if (response.success) {
        // Update the primary flag in local state
        setPropertyMedia(prev => prev.map(media => ({
          ...media,
          is_primary: media.id === mediaId
        })));
        return true;
      } else {
        setMediaError(response.error || 'Failed to set primary media');
        return false;
      }
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Failed to set primary media');
      return false;
    } finally {
      setIsLoadingMedia(false);
    }
  }, []);

  // =====================================================
  // ANALYTICS OPERATIONS
  // =====================================================

  const loadPropertyAnalytics = useCallback(async (propertyId: number) => {
    setIsLoadingAnalytics(true);
    setAnalyticsError(null);

    try {
      const response: PropertyApiResponse<PropertyAnalytics> = await propertyApiService.getPropertyAnalytics(propertyId);

      if (response.success && response.data) {
        setPropertyAnalytics(response.data);
      } else {
        setAnalyticsError(response.error || 'Failed to load property analytics');
      }
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : 'Failed to load property analytics');
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  const recordPropertyView = useCallback(async (propertyId: number, viewData?: any): Promise<boolean> => {
    try {
      const response: PropertyApiResponse<void> = await propertyApiService.recordPropertyView(propertyId, viewData || {});

      if (response.success) {
        // Update analytics if loaded
        if (propertyAnalytics) {
          setPropertyAnalytics(prev => prev ? {
            ...prev,
            total_views: prev.total_views + 1
          } : null);
        }
        return true;
      } else {
        setAnalyticsError(response.error || 'Failed to record property view');
        return false;
      }
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : 'Failed to record property view');
      return false;
    }
  }, [propertyAnalytics]);

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  const clearError = useCallback(() => {
    setError(null);
    setPropertyError(null);
    setMediaError(null);
    setAnalyticsError(null);
  }, []);

  const clearProperty = useCallback(() => {
    setCurrentProperty(null);
    setPropertyMedia([]);
    setPropertyAnalytics(null);
  }, []);

  const refresh = useCallback(async () => {
    await loadProperties(currentPage, currentFilters);
  }, [loadProperties, currentPage, currentFilters]);

  // =====================================================
  // EFFECTS
  // =====================================================

  // Auto-load properties on mount
  useEffect(() => {
    if (autoLoad) {
      loadProperties(1, filters);
    }
  }, [autoLoad, loadProperties, filters]);

  // Memoized computed values
  const hasMore = useMemo(() => pagination?.hasMore || false, [pagination]);
  const totalCount = useMemo(() => pagination?.totalCount || 0, [pagination]);

  return {
    // Data
    properties,
    currentProperty,
    propertyMedia,
    propertyAnalytics,

    // Loading states
    isLoading,
    isLoadingProperty,
    isLoadingMedia,
    isLoadingAnalytics,
    isCreating,
    isUpdating,
    isDeleting,

    // Pagination
    pagination,

    // Errors
    error,
    propertyError,
    mediaError,
    analyticsError,

    // Actions
    loadProperties,
    loadProperty,
    createProperty,
    updateProperty,
    deleteProperty,
    searchProperties,

    // Media actions
    loadPropertyMedia,
    addPropertyMedia,
    updatePropertyMedia,
    deletePropertyMedia,
    setPrimaryMedia,

    // Analytics
    loadPropertyAnalytics,
    recordPropertyView,

    // Utility
    clearError,
    clearProperty,
    refresh
  };
}