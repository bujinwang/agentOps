import {
  MLSPropertyData,
  MLSAddress,
  MLSPropertyDetails,
  MLSMedia,
  MLSListingAgent,
  MLSOffice,
  MLSDates
} from '../types/mls';

import {
  Property,
  PropertyAddress,
  PropertyDetails,
  PropertyMedia,
  MediaType
} from '../types/property';

/**
 * MLS Data Mapper
 * Maps MLS data formats to internal property data structures
 */
export class MLSDataMapper {

  /**
   * Map MLS property data to internal Property format
   */
  static mapMLSPropertyToInternal(mlsProperty: MLSPropertyData): Property {
    return {
      id: this.generateInternalId(mlsProperty.mlsId),
      user_id: 1, // Default user ID - would be set by context
      mls_number: mlsProperty.mlsId,
      property_type: this.mapPropertyType(mlsProperty.propertyType),
      status: this.mapPropertyStatus(mlsProperty.status),
      listing_type: this.mapListingType(mlsProperty.propertyType),
      price: mlsProperty.price,
      address: this.mapMLSAddressToInternal(mlsProperty.address),
      details: this.mapMLSDetailsToInternal(mlsProperty.details),
      features: this.mapMLSFeaturesToInternal(mlsProperty),
      title: this.generatePropertyTitle(mlsProperty),
      description: mlsProperty.details.description,
      public_remarks: mlsProperty.details.remarks,
      marketing: {
        show_instructions: '',
        occupancy: '',
        possession_date: '',
        showing_requirements: []
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      sync_status: 'synced'
    };
  }

  /**
   * Map MLS address to internal PropertyAddress format
   */
  static mapMLSAddressToInternal(mlsAddress: MLSAddress): PropertyAddress {
    return {
      street: `${mlsAddress.streetNumber} ${mlsAddress.streetName}`.trim(),
      city: mlsAddress.city,
      state: mlsAddress.state,
      zip_code: mlsAddress.zipCode,
      country: mlsAddress.country,
      latitude: mlsAddress.latitude,
      longitude: mlsAddress.longitude,
      neighborhood: mlsAddress.neighborhood,
      county: mlsAddress.county
    };
  }

  /**
   * Map MLS property details to internal PropertyDetails format
   */
  static mapMLSDetailsToInternal(mlsDetails: MLSPropertyDetails): PropertyDetails {
    return {
      bedrooms: mlsDetails.bedrooms,
      bathrooms: mlsDetails.bathrooms,
      half_bathrooms: mlsDetails.halfBathrooms,
      square_feet: mlsDetails.squareFeet,
      lot_size: mlsDetails.lotSize,
      year_built: mlsDetails.yearBuilt,
      garage_spaces: mlsDetails.garageSpaces,
      parking_spaces: mlsDetails.parkingSpaces,
      stories: mlsDetails.stories,
      hoa_fee: undefined, // Not typically in MLS data
      hoa_fee_period: undefined
    };
  }

  /**
   * Map MLS features to internal PropertyFeatures format
   */
  static mapMLSFeaturesToInternal(mlsProperty: MLSPropertyData): any {
    return {
      interior: mlsProperty.details.interiorFeatures || [],
      exterior: [],
      appliances: mlsProperty.details.appliances || [],
      utilities: [],
      community: []
    };
  }

  /**
   * Map MLS media to internal PropertyMedia format
   */
  static mapMLSMediaToInternal(mlsMedia: MLSMedia[], propertyId: number): PropertyMedia[] {
    return mlsMedia.map((media, index) => ({
      id: this.generateMediaId(propertyId, index),
      property_id: propertyId,
      media_type: this.mapMLSMediaType(media.type),
      url: media.url,
      thumbnail_url: this.generateThumbnailUrl(media.url),
      title: media.caption,
      description: media.caption,
      sort_order: media.sortOrder,
      file_size: undefined, // Would need to be fetched
      mime_type: this.inferMimeType(media.url),
      width: media.width,
      height: media.height,
      duration: undefined, // Duration not available in MLS media data
      is_primary: media.isPrimary,
      is_featured: media.sortOrder === 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  }

  /**
   * Generate internal property ID from MLS ID
   */
  private static generateInternalId(mlsId: string): number {
    // Simple hash function for demo - in production, use proper ID generation
    let hash = 0;
    for (let i = 0; i < mlsId.length; i++) {
      const char = mlsId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generate media ID
   */
  private static generateMediaId(propertyId: number, index: number): number {
    return propertyId * 1000 + index;
  }

  /**
   * Map MLS property type to internal format
   */
  private static mapPropertyType(mlsType: string): any {
    const typeMapping: { [key: string]: string } = {
      'Single Family': 'single_family',
      'Condo': 'condo',
      'Townhouse': 'townhouse',
      'Multi-Family': 'multi_family',
      'Land': 'land',
      'Commercial': 'commercial'
    };

    return typeMapping[mlsType] || 'other';
  }

  /**
   * Map MLS status to internal format
   */
  private static mapPropertyStatus(mlsStatus: string): any {
    const statusMapping: { [key: string]: string } = {
      'Active': 'active',
      'Pending': 'pending',
      'Sold': 'sold',
      'Off Market': 'off_market',
      'Withdrawn': 'withdrawn',
      'Expired': 'expired'
    };

    return statusMapping[mlsStatus] || 'active';
  }

  /**
   * Map listing type based on property type
   */
  private static mapListingType(propertyType: string): any {
    // Simple logic - could be enhanced based on MLS data
    if (propertyType.toLowerCase().includes('rental')) {
      return 'rent';
    }
    return 'sale';
  }

  /**
   * Map MLS media type to internal format
   */
  private static mapMLSMediaType(mlsType: string): MediaType {
    const typeMapping: { [key: string]: MediaType } = {
      'photo': 'photo',
      'image': 'photo',
      'video': 'video',
      'virtual_tour': 'virtual_tour',
      'floor_plan': 'floor_plan',
      'document': 'document'
    };

    return typeMapping[mlsType.toLowerCase()] || 'photo';
  }

  /**
   * Generate property title from MLS data
   */
  private static generatePropertyTitle(mlsProperty: MLSPropertyData): string {
    const address = mlsProperty.address;
    const details = mlsProperty.details;

    const parts = [
      `${details.bedrooms || 0} Bed`,
      `${details.bathrooms || 0} Bath`,
      address.city,
      address.state
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Generate thumbnail URL from full image URL
   */
  private static generateThumbnailUrl(fullUrl: string): string | undefined {
    // Simple thumbnail generation - in production, this would use image processing service
    if (fullUrl.includes('cloudinary') || fullUrl.includes('imgur')) {
      return fullUrl.replace('/upload/', '/upload/w_300,h_200,c_fill/');
    }
    return fullUrl; // Return original if can't generate thumbnail
  }

  /**
   * Infer MIME type from URL
   */
  private static inferMimeType(url: string): string | undefined {
    const extension = url.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo'
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
  }
}

/**
 * Utility functions for data mapping
 */
export const mlsDataMapper = {
  /**
   * Map single MLS property
   */
  mapProperty: (mlsProperty: MLSPropertyData): Property => {
    return MLSDataMapper.mapMLSPropertyToInternal(mlsProperty);
  },

  /**
   * Map multiple MLS properties
   */
  mapProperties: (mlsProperties: MLSPropertyData[]): Property[] => {
    return mlsProperties.map(property => MLSDataMapper.mapMLSPropertyToInternal(property));
  },

  /**
   * Map MLS media for a property
   */
  mapMedia: (mlsMedia: MLSMedia[], propertyId: number): PropertyMedia[] => {
    return MLSDataMapper.mapMLSMediaToInternal(mlsMedia, propertyId);
  },

  /**
   * Validate MLS data before mapping
   */
  validateMLSData: (mlsProperty: MLSPropertyData): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!mlsProperty.mlsId) {
      errors.push('MLS ID is required');
    }

    if (!mlsProperty.address?.streetName || !mlsProperty.address?.city) {
      errors.push('Complete address information is required');
    }

    if (!mlsProperty.price || mlsProperty.price <= 0) {
      errors.push('Valid price is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

export default mlsDataMapper;