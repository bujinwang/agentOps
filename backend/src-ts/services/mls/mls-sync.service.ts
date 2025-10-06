/**
 * MLS Synchronization Service
 * 
 * This service orchestrates the entire MLS sync process:
 * - Connects to MLS providers
 * - Fetches property data
 * - Transforms and validates data
 * - Updates database
 * - Tracks sync status and errors
 * - Handles retries
 */

import { BaseMLSProvider, MLSPropertyData, MLSSyncOptions } from './base-mls-provider';
import { RETSProvider } from './rets-provider';
import { MockMLSProvider } from './mock-mls-provider';
import { PropertyModel, PropertyCreate } from '../../models/property.model';
import { PropertyMediaModel, PropertyMediaCreate } from '../../models/property-media.model';
import { MLSSyncStatusModel } from '../../models/mls-sync-status.model';
import { MLSSyncHistoryModel } from '../../models/mls-sync-history.model';
import { S3StorageService } from '../storage/s3-storage.service';
import { ImageProcessingService } from '../storage/image-processing.service';

export interface MLSSyncServiceConfig {
  providerId: string;
  providerName: string;
  providerType: 'RETS' | 'REST_API' | 'MOCK';
  loginUrl: string;
  credentials: {
    username: string;
    password: string;
    userAgent?: string;
  };
  fieldMapping: Record<string, string>;
  syncOptions?: {
    batchSize?: number;
    includeMedia?: boolean;
    autoRetry?: boolean;
    maxRetries?: number;
  };
}

export interface MLSSyncResult {
  syncId: string;
  success: boolean;
  propertiesFetched: number;
  propertiesAdded: number;
  propertiesUpdated: number;
  propertiesErrored: number;
  mediaDownloaded: number;
  mediaFailed: number;
  duration: number;
  errors: Array<{ listingId: string; error: string }>;
}

export class MLSSyncService {
  private provider: BaseMLSProvider | null = null;
  private config: MLSSyncServiceConfig;
  private s3Service: S3StorageService;
  private imageService: ImageProcessingService;

  constructor(config: MLSSyncServiceConfig) {
    this.config = config;
    this.s3Service = new S3StorageService();
    this.imageService = new ImageProcessingService();
  }

  /**
   * Initialize MLS provider
   */
  async initialize(): Promise<void> {
    // Create appropriate provider based on type
    if (this.config.providerType === 'RETS') {
      this.provider = new RETSProvider({
        providerId: this.config.providerId,
        providerName: this.config.providerName,
        providerType: 'RETS',
        loginUrl: this.config.loginUrl,
        credentials: this.config.credentials,
        fieldMapping: this.config.fieldMapping,
      });
    } else if (this.config.providerType === 'MOCK') {
      this.provider = new MockMLSProvider({
        providerId: this.config.providerId,
        providerName: this.config.providerName,
        providerType: 'RETS', // Mock uses RETS interface
        loginUrl: this.config.loginUrl,
        credentials: this.config.credentials,
        fieldMapping: this.config.fieldMapping,
      });
    } else {
      throw new Error(`Unsupported provider type: ${this.config.providerType}`);
    }

    // Connect to provider
    await this.provider.connect();
  }

  /**
   * Perform full sync - fetch all active properties
   */
  async performFullSync(): Promise<MLSSyncResult> {
    if (!this.provider) {
      throw new Error('Provider not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    // Create sync history record
    const syncHistory = await MLSSyncHistoryModel.create({
      providerId: this.config.providerId,
      syncType: 'full',
      triggeredBy: 'system',
      syncConfig: {
        batchSize: this.config.syncOptions?.batchSize || 1000,
        includeMedia: this.config.syncOptions?.includeMedia || false,
      },
    });

    // Update sync status to "running"
    await MLSSyncStatusModel.recordSyncStart(this.config.providerId);

    let propertiesFetched = 0;
    let propertiesAdded = 0;
    let propertiesUpdated = 0;
    let propertiesErrored = 0;
    let mediaDownloaded = 0;
    let mediaFailed = 0;
    const errors: Array<{ listingId: string; error: string }> = [];

    try {
      console.log(`🔄 Starting full sync for provider: ${this.config.providerName}`);

      // Fetch properties from MLS
      const options: MLSSyncOptions = {
        syncType: 'full',
        batchSize: this.config.syncOptions?.batchSize || 1000,
        includeMedia: this.config.syncOptions?.includeMedia || false,
      };

      const mlsProperties = await this.provider.fetchProperties(options);
      propertiesFetched = mlsProperties.length;

      console.log(`📊 Fetched ${propertiesFetched} properties from MLS`);

      // Process each property
      for (const mlsProperty of mlsProperties) {
        try {
          // Transform to internal format
          const propertyData = this.transformToPropertyCreate(mlsProperty);

          // Check if property already exists
          const existing = await PropertyModel.findByMlsListingId(
            propertyData.mlsListingId,
            this.config.providerId
          );

          if (existing) {
            // Update existing property
            await PropertyModel.update(existing.propertyId, {
              price: propertyData.price,
              status: propertyData.status,
              bedrooms: propertyData.bedrooms,
              bathrooms: propertyData.bathrooms,
              squareFeet: propertyData.squareFeet,
              description: propertyData.description,
              lastSyncedAt: new Date(),
              syncStatus: 'synced',
              mlsDataRaw: propertyData.mlsDataRaw,
            });
            propertiesUpdated++;
          } else {
            // Create new property
            const newProperty = await PropertyModel.create(propertyData);
            propertiesAdded++;

            // Handle media
            if (mlsProperty.media && mlsProperty.media.length > 0) {
              const mediaResult = await this.syncPropertyMedia(
                newProperty.propertyId,
                mlsProperty.media
              );
              mediaDownloaded += mediaResult.success;
              mediaFailed += mediaResult.failed;
            }
          }
        } catch (error) {
          propertiesErrored++;
          errors.push({
            listingId: mlsProperty.listingId,
            error: String(error),
          });
          console.error(`❌ Error processing property ${mlsProperty.listingId}:`, error);
        }
      }

      const duration = Math.floor((Date.now() - startTime) / 1000);

      console.log(`✅ Full sync completed in ${duration}s`);
      console.log(`   Added: ${propertiesAdded}, Updated: ${propertiesUpdated}, Errors: ${propertiesErrored}`);

      // Update sync history
      await MLSSyncHistoryModel.complete(
        syncHistory.syncId,
        propertiesErrored > 0 ? 'partial' : 'success',
        {
          fetched: propertiesFetched,
          added: propertiesAdded,
          updated: propertiesUpdated,
          deleted: 0,
          errored: propertiesErrored,
          mediaDownloaded,
          mediaFailed,
        }
      );

      // Update sync status
      await MLSSyncStatusModel.recordSyncSuccess(this.config.providerId, duration, {
        added: propertiesAdded,
        updated: propertiesUpdated,
        deleted: 0,
        errored: propertiesErrored,
      });

      await MLSSyncStatusModel.incrementTotalCount(this.config.providerId, true);

      return {
        syncId: syncHistory.syncId,
        success: true,
        propertiesFetched,
        propertiesAdded,
        propertiesUpdated,
        propertiesErrored,
        mediaDownloaded,
        mediaFailed,
        duration,
        errors,
      };
    } catch (error) {
      console.error(`❌ Full sync failed:`, error);

      // Update sync history with failure
      await MLSSyncHistoryModel.complete(
        syncHistory.syncId,
        'failed',
        {
          fetched: propertiesFetched,
          added: propertiesAdded,
          updated: propertiesUpdated,
          deleted: 0,
          errored: propertiesErrored,
        },
        { message: String(error) }
      );

      // Update sync status with failure
      await MLSSyncStatusModel.recordSyncFailure(this.config.providerId, String(error));
      await MLSSyncStatusModel.incrementTotalCount(this.config.providerId, false);

      throw error;
    }
  }

  /**
   * Perform incremental sync - fetch only updated properties
   */
  async performIncrementalSync(): Promise<MLSSyncResult> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    // Get last sync timestamp
    const syncStatus = await MLSSyncStatusModel.findByProviderId(this.config.providerId);
    const lastSyncTimestamp = syncStatus?.lastSyncCompletedAt || undefined;

    if (!lastSyncTimestamp) {
      console.log('⚠️  No previous sync found. Performing full sync instead.');
      return this.performFullSync();
    }

    const startTime = Date.now();

    // Create sync history record
    const syncHistory = await MLSSyncHistoryModel.create({
      providerId: this.config.providerId,
      syncType: 'incremental',
      triggeredBy: 'system',
      syncConfig: {
        lastSyncTimestamp: lastSyncTimestamp.toISOString(),
      },
    });

    await MLSSyncStatusModel.recordSyncStart(this.config.providerId);

    let propertiesFetched = 0;
    let propertiesUpdated = 0;
    let propertiesErrored = 0;

    try {
      console.log(`🔄 Starting incremental sync (since ${lastSyncTimestamp.toISOString()})`);

      const options: MLSSyncOptions = {
        syncType: 'incremental',
        lastSyncTimestamp,
        batchSize: this.config.syncOptions?.batchSize || 1000,
      };

      const mlsProperties = await this.provider.fetchProperties(options);
      propertiesFetched = mlsProperties.length;

      console.log(`📊 Fetched ${propertiesFetched} updated properties`);

      // Process updates
      for (const mlsProperty of mlsProperties) {
        try {
          const propertyData = this.transformToPropertyCreate(mlsProperty);
          const existing = await PropertyModel.findByMlsListingId(
            propertyData.mlsListingId,
            this.config.providerId
          );

          if (existing) {
            await PropertyModel.update(existing.propertyId, {
              price: propertyData.price,
              status: propertyData.status,
              lastSyncedAt: new Date(),
              mlsDataRaw: propertyData.mlsDataRaw,
            });
            propertiesUpdated++;
          }
        } catch (error) {
          propertiesErrored++;
          console.error(`❌ Error updating property ${mlsProperty.listingId}:`, error);
        }
      }

      const duration = Math.floor((Date.now() - startTime) / 1000);

      console.log(`✅ Incremental sync completed in ${duration}s`);

      await MLSSyncHistoryModel.complete(
        syncHistory.syncId,
        'success',
        {
          fetched: propertiesFetched,
          added: 0,
          updated: propertiesUpdated,
          deleted: 0,
          errored: propertiesErrored,
        }
      );

      await MLSSyncStatusModel.recordSyncSuccess(this.config.providerId, duration, {
        added: 0,
        updated: propertiesUpdated,
        deleted: 0,
        errored: propertiesErrored,
      });

      await MLSSyncStatusModel.incrementTotalCount(this.config.providerId, true);

      return {
        syncId: syncHistory.syncId,
        success: true,
        propertiesFetched,
        propertiesAdded: 0,
        propertiesUpdated,
        propertiesErrored,
        mediaDownloaded: 0,
        mediaFailed: 0,
        duration,
        errors: [],
      };
    } catch (error) {

      await MLSSyncHistoryModel.complete(
        syncHistory.syncId,
        'failed',
        {
          fetched: propertiesFetched,
          added: 0,
          updated: propertiesUpdated,
          deleted: 0,
          errored: propertiesErrored,
        },
        { message: String(error) }
      );

      await MLSSyncStatusModel.recordSyncFailure(this.config.providerId, String(error));
      await MLSSyncStatusModel.incrementTotalCount(this.config.providerId, false);

      throw error;
    }
  }

  /**
   * Transform MLS property data to internal PropertyCreate format
   */
  private transformToPropertyCreate(mlsProperty: MLSPropertyData): PropertyCreate {
    return {
      mlsListingId: mlsProperty.listingId,
      mlsProvider: this.config.providerId,
      address: mlsProperty.address,
      city: mlsProperty.city,
      state: mlsProperty.state,
      postalCode: mlsProperty.postalCode,
      country: mlsProperty.country,
      propertyType: mlsProperty.propertyType,
      propertySubtype: mlsProperty.propertySubtype,
      status: mlsProperty.status,
      price: mlsProperty.price,
      originalPrice: mlsProperty.originalPrice,
      bedrooms: mlsProperty.bedrooms,
      bathrooms: mlsProperty.bathrooms,
      squareFeet: mlsProperty.squareFeet,
      lotSize: mlsProperty.lotSize,
      yearBuilt: mlsProperty.yearBuilt,
      interiorFeatures: mlsProperty.features?.interior,
      exteriorFeatures: mlsProperty.features?.exterior,
      appliances: mlsProperty.features?.appliances,
      parkingFeatures: mlsProperty.features?.parking,
      description: mlsProperty.description,
      remarks: mlsProperty.remarks,
      latitude: mlsProperty.latitude,
      longitude: mlsProperty.longitude,
      neighborhood: mlsProperty.neighborhood,
      schoolDistrict: mlsProperty.schoolDistrict,
      listedDate: mlsProperty.listedDate,
      soldDate: mlsProperty.soldDate,
      daysOnMarket: mlsProperty.daysOnMarket,
      listingAgentName: mlsProperty.listingAgentName,
      listingAgentPhone: mlsProperty.listingAgentPhone,
      listingAgentEmail: mlsProperty.listingAgentEmail,
      listingOffice: mlsProperty.listingOffice,
      mlsDataRaw: mlsProperty.rawData,
    };
  }

  /**
   * Sync property media
   * Downloads images, processes them, uploads to S3, and creates variants
   */
  private async syncPropertyMedia(
    propertyId: number,
    mediaList: Array<{ url: string; type: string; order: number; caption?: string }>
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    const enableS3Upload = process.env.AWS_S3_ENABLED === 'true';

    for (const media of mediaList) {
      try {
        let finalMediaUrl = media.url;
        let thumbnailUrl: string | undefined;
        let metadata: string | undefined;

        // Process and upload images if S3 is enabled
        if (enableS3Upload && media.type === 'image') {
          try {
            console.log(`📸 Processing image ${media.order + 1} for property ${propertyId}`);

            // Download and process image
            const processed = await this.imageService.processPropertyImage(media.url);

            // Upload original to S3
            const originalUpload = await this.s3Service.uploadBuffer(
              processed.original.buffer,
              {
                folder: `properties/${propertyId}`,
                filename: `image-${media.order}-original.webp`,
                contentType: 'image/webp',
                public: true,
                metadata: {
                  propertyId: propertyId.toString(),
                  order: media.order.toString(),
                  width: processed.original.metadata.width.toString(),
                  height: processed.original.metadata.height.toString(),
                },
              }
            );

            finalMediaUrl = originalUpload.cdnUrl || originalUpload.url;

            // Upload thumbnail
            const thumbnailUpload = await this.s3Service.uploadBuffer(
              processed.variants.thumbnail.buffer,
              {
                folder: `properties/${propertyId}`,
                filename: `image-${media.order}-thumbnail.jpg`,
                contentType: 'image/jpeg',
                public: true,
              }
            );

            thumbnailUrl = thumbnailUpload.cdnUrl || thumbnailUpload.url;

            // Store metadata
            metadata = JSON.stringify({
              original: processed.original.metadata,
              variants: {
                thumbnail: processed.variants.thumbnail.metadata,
                medium: processed.variants.medium.metadata,
                large: processed.variants.large.metadata,
              },
            });

            console.log(`✅ Uploaded image to S3: ${finalMediaUrl}`);
          } catch (error) {
            console.error(`⚠️  Failed to process/upload image, using original URL:`, error);
            // Fall back to original URL if S3 upload fails
          }
        }

        // Create media record
        const mediaData: PropertyMediaCreate = {
          propertyId,
          mediaType: media.type,
          mediaUrl: finalMediaUrl,
          thumbnailUrl,
          displayOrder: media.order,
          caption: media.caption,
          metadata,
        };

        await PropertyMediaModel.create(mediaData);
        success++;
        
        console.log(`✅ Saved media ${media.order + 1} for property ${propertyId}`);
      } catch (error) {
        failed++;
        console.error(`❌ Error creating media for property ${propertyId}:`, error);
      }
    }

    return { success, failed };
  }

  /**
   * Disconnect from provider
   */
  async cleanup(): Promise<void> {
    if (this.provider) {
      await this.provider.disconnect();
    }
  }
}
