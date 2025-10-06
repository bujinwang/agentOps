import {
  PropertyModel,
  Property,
  PropertyCreate,
  PropertyUpdate,
  PropertyFilters,
  PaginationOptions,
  PaginatedProperties,
} from '../models/property.model';
import { PropertyMediaModel, PropertyMediaCreate } from '../models/property-media.model';
import { AppError } from '../middleware/error.middleware';

export class PropertyService {
  async createProperty(propertyData: PropertyCreate): Promise<Property> {
    // Validate required fields
    if (!propertyData.mlsListingId || propertyData.mlsListingId.trim().length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'MLS listing ID is required');
    }

    if (!propertyData.address || propertyData.address.trim().length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Address is required');
    }

    if (!propertyData.city || propertyData.city.trim().length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'City is required');
    }

    if (!propertyData.state || propertyData.state.trim().length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'State is required');
    }

    if (propertyData.price === undefined || propertyData.price <= 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Valid price is required');
    }

    // Check for duplicate
    const existing = await PropertyModel.findByMlsListingId(
      propertyData.mlsListingId,
      propertyData.mlsProvider
    );

    if (existing) {
      throw new AppError(409, 'PROPERTY_EXISTS', 'Property with this MLS listing ID already exists');
    }

    return PropertyModel.create(propertyData);
  }

  async getProperty(propertyId: number): Promise<Property> {
    const property = await PropertyModel.findById(propertyId);

    if (!property) {
      throw new AppError(404, 'PROPERTY_NOT_FOUND', 'Property not found');
    }

    return property;
  }

  async getPropertyWithMedia(propertyId: number): Promise<Property & { media: any[] }> {
    const property = await this.getProperty(propertyId);
    const media = await PropertyMediaModel.findByPropertyId(propertyId);

    return {
      ...property,
      media,
    };
  }

  async getProperties(
    filters: PropertyFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PaginatedProperties> {
    // Validate pagination
    if (pagination.page < 1) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Page must be greater than 0');
    }

    if (pagination.limit < 1 || pagination.limit > 100) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Limit must be between 1 and 100');
    }

    // Validate price range
    if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
      if (filters.minPrice > filters.maxPrice) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Min price cannot be greater than max price');
      }
    }

    // Validate bedroom range
    if (filters.minBedrooms !== undefined && filters.maxBedrooms !== undefined) {
      if (filters.minBedrooms > filters.maxBedrooms) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Min bedrooms cannot be greater than max bedrooms');
      }
    }

    return PropertyModel.findAll(filters, pagination);
  }

  async updateProperty(propertyId: number, updateData: PropertyUpdate): Promise<Property> {
    // Validate price if provided
    if (updateData.price !== undefined && updateData.price <= 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Price must be greater than 0');
    }

    const property = await PropertyModel.update(propertyId, updateData);

    if (!property) {
      throw new AppError(404, 'PROPERTY_NOT_FOUND', 'Property not found');
    }

    return property;
  }

  async deleteProperty(propertyId: number): Promise<void> {
    const deleted = await PropertyModel.delete(propertyId);

    if (!deleted) {
      throw new AppError(404, 'PROPERTY_NOT_FOUND', 'Property not found');
    }
  }

  async addPropertyMedia(propertyId: number, mediaList: PropertyMediaCreate[]): Promise<any[]> {
    // Verify property exists
    await this.getProperty(propertyId);

    // Validate media URLs
    for (const media of mediaList) {
      if (!media.mediaUrl || media.mediaUrl.trim().length === 0) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Media URL is required');
      }
    }

    // Add propertyId to each media item
    const mediaWithPropertyId = mediaList.map(media => ({
      ...media,
      propertyId,
    }));

    return PropertyMediaModel.batchCreate(mediaWithPropertyId);
  }

  async getPropertyStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPropertyType: Record<string, number>;
    averagePrice: number;
    medianPrice: number;
  }> {
    const byStatus = await PropertyModel.countByStatus();
    
    // Calculate total from status counts
    const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

    // TODO: Implement additional statistics queries
    // For now, return basic stats
    return {
      total,
      byStatus,
      byPropertyType: {}, // To be implemented
      averagePrice: 0, // To be implemented
      medianPrice: 0, // To be implemented
    };
  }

  async searchProperties(
    searchTerm: string,
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PaginatedProperties> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Search term is required');
    }

    return PropertyModel.findAll(
      { search: searchTerm },
      pagination
    );
  }

  async getPropertiesByCity(
    city: string,
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PaginatedProperties> {
    if (!city || city.trim().length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'City is required');
    }

    return PropertyModel.findAll(
      { city },
      pagination
    );
  }

  async getPropertiesByPriceRange(
    minPrice: number,
    maxPrice: number,
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PaginatedProperties> {
    if (minPrice < 0 || maxPrice < 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Prices must be positive');
    }

    if (minPrice > maxPrice) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Min price cannot be greater than max price');
    }

    return PropertyModel.findAll(
      { minPrice, maxPrice },
      pagination
    );
  }

  async getFeaturedProperties(limit: number = 10): Promise<Property[]> {
    // Get recently listed properties with images
    const result = await PropertyModel.findAll(
      { status: 'Active' },
      { page: 1, limit, sortBy: 'listed_date', sortOrder: 'DESC' }
    );

    return result.properties;
  }
}
