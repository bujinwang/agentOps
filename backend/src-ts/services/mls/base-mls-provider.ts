/**
 * Base MLS Provider Interface
 * 
 * This abstract class defines the contract that all MLS providers must implement.
 * It supports both RETS (Real Estate Transaction Standard) and modern REST APIs.
 */

export interface MLSProviderConfig {
  providerId: string;
  providerName: string;
  providerType: 'RETS' | 'REST_API';
  loginUrl: string;
  apiEndpoint?: string;
  credentials: {
    username: string;
    password: string;
    userAgent?: string;
  };
  rateLimits?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  fieldMapping: Record<string, string>;
}

export interface MLSPropertyData {
  listingId: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  propertyType: string;
  propertySubtype?: string;
  status: string;
  price: number;
  originalPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  lotSize?: number;
  yearBuilt?: number;
  description?: string;
  remarks?: string;
  latitude?: number;
  longitude?: number;
  neighborhood?: string;
  schoolDistrict?: string;
  listedDate?: Date;
  soldDate?: Date;
  daysOnMarket?: number;
  listingAgentName?: string;
  listingAgentPhone?: string;
  listingAgentEmail?: string;
  listingOffice?: string;
  features?: {
    interior?: Record<string, any>;
    exterior?: Record<string, any>;
    appliances?: string[];
    parking?: Record<string, any>;
  };
  media?: MLSMediaData[];
  modifiedTimestamp?: Date;
  rawData?: Record<string, any>;
}

export interface MLSMediaData {
  url: string;
  type: 'image' | 'video' | '3d_tour' | 'floor_plan';
  order: number;
  caption?: string;
}

export interface MLSSyncResult {
  success: boolean;
  propertiesFetched: number;
  propertiesProcessed: number;
  errors: MLSSyncError[];
  duration: number;
  lastModifiedTimestamp?: Date;
}

export interface MLSSyncError {
  listingId?: string;
  error: Error;
  errorType: 'authentication' | 'network' | 'data_validation' | 'rate_limit' | 'unknown';
  retryable: boolean;
}

export interface MLSSyncOptions {
  syncType: 'full' | 'incremental';
  lastSyncTimestamp?: Date;
  batchSize?: number;
  maxProperties?: number;
  includeMedia?: boolean;
}

/**
 * Abstract base class for MLS providers
 */
export abstract class BaseMLSProvider {
  protected config: MLSProviderConfig;
  protected connected: boolean = false;
  protected lastRequestTime: number = 0;

  constructor(config: MLSProviderConfig) {
    this.config = config;
  }

  /**
   * Establish connection to MLS provider
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from MLS provider
   */
  abstract disconnect(): Promise<void>;

  /**
   * Test connection health
   */
  abstract healthCheck(): Promise<{ healthy: boolean; message: string }>;

  /**
   * Fetch properties from MLS provider
   */
  abstract fetchProperties(options: MLSSyncOptions): Promise<MLSPropertyData[]>;

  /**
   * Fetch a single property by listing ID
   */
  abstract fetchPropertyById(listingId: string): Promise<MLSPropertyData | null>;

  /**
   * Get metadata about the MLS provider (classes, fields available)
   */
  abstract getMetadata(): Promise<{
    resourceClasses: string[];
    availableFields: string[];
    version: string;
  }>;

  /**
   * Transform raw MLS data to internal format
   */
  protected transformProperty(rawData: Record<string, any>): MLSPropertyData {
    const mapped: Record<string, any> = {};

    // Apply field mapping
    for (const [mlsField, internalField] of Object.entries(this.config.fieldMapping)) {
      if (rawData[mlsField] !== undefined) {
        mapped[internalField] = rawData[mlsField];
      }
    }

    // Ensure required fields with defaults
    return {
      listingId: mapped.mlsListingId || mapped.listingId || '',
      address: mapped.address || '',
      city: mapped.city || '',
      state: mapped.state || '',
      postalCode: mapped.postalCode || '',
      country: mapped.country || 'USA',
      propertyType: mapped.propertyType || 'Unknown',
      propertySubtype: mapped.propertySubtype,
      status: this.normalizeStatus(mapped.status),
      price: this.parsePrice(mapped.price),
      originalPrice: this.parsePrice(mapped.originalPrice),
      bedrooms: this.parseNumber(mapped.bedrooms),
      bathrooms: this.parseNumber(mapped.bathrooms),
      squareFeet: this.parseNumber(mapped.squareFeet),
      lotSize: this.parseNumber(mapped.lotSize),
      yearBuilt: this.parseNumber(mapped.yearBuilt),
      description: mapped.description,
      remarks: mapped.remarks,
      latitude: this.parseNumber(mapped.latitude),
      longitude: this.parseNumber(mapped.longitude),
      neighborhood: mapped.neighborhood,
      schoolDistrict: mapped.schoolDistrict,
      listedDate: this.parseDate(mapped.listedDate),
      soldDate: this.parseDate(mapped.soldDate),
      daysOnMarket: this.parseNumber(mapped.daysOnMarket),
      listingAgentName: mapped.listingAgentName,
      listingAgentPhone: mapped.listingAgentPhone,
      listingAgentEmail: mapped.listingAgentEmail,
      listingOffice: mapped.listingOffice,
      modifiedTimestamp: this.parseDate(mapped.modifiedTimestamp),
      rawData: rawData,
    };
  }

  /**
   * Normalize property status across different MLS providers
   */
  protected normalizeStatus(status: string | undefined): string {
    if (!status) return 'Unknown';

    const normalized = status.toUpperCase().trim();

    // Map common status values
    const statusMap: Record<string, string> = {
      'ACTIVE': 'Active',
      'ACT': 'Active',
      'PENDING': 'Pending',
      'PND': 'Pending',
      'SOLD': 'Sold',
      'SLD': 'Sold',
      'CLOSED': 'Sold',
      'WITHDRAWN': 'Withdrawn',
      'WTH': 'Withdrawn',
      'EXPIRED': 'Expired',
      'EXP': 'Expired',
      'CANCELLED': 'Withdrawn',
      'CAN': 'Withdrawn',
    };

    return statusMap[normalized] || status;
  }

  /**
   * Parse price values (handle strings, numbers, with commas/currency symbols)
   */
  protected parsePrice(value: any): number {
    if (value === undefined || value === null || value === '') return 0;
    
    if (typeof value === 'number') return value;
    
    // Remove currency symbols and commas
    const cleaned = String(value).replace(/[$,]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Parse numeric values
   */
  protected parseNumber(value: any): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    
    if (typeof value === 'number') return value;
    
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Parse date values
   */
  protected parseDate(value: any): Date | undefined {
    if (!value) return undefined;
    
    if (value instanceof Date) return value;
    
    try {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    } catch {
      return undefined;
    }
  }

  /**
   * Rate limiting: wait if necessary
   */
  protected async enforceRateLimit(): Promise<void> {
    if (!this.config.rateLimits) return;

    const minInterval = 60000 / this.config.rateLimits.requestsPerMinute; // ms per request
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Check if provider is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get provider configuration
   */
  getConfig(): MLSProviderConfig {
    return { ...this.config };
  }
}
