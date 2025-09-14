import {
  IMLSService,
  MLSConfig,
  MLSPropertyData,
  MLSAPIResponse,
  MLSSyncOptions,
  MLSProvider,
  MLSError
} from '../types/mls';

/**
 * MLS API Service - Handles communication with MLS providers
 * Supports RETS, RESO Web API, and custom MLS integrations
 */
export class MLSAPIService implements IMLSService {
  private config: MLSConfig;
  private authToken?: string;
  private tokenExpiry?: Date;
  private rateLimitRemaining: number = 0;
  private rateLimitResetTime?: Date;

  constructor(config: MLSConfig) {
    this.config = config;
  }

  /**
   * Authenticate with MLS provider
   */
  async authenticate(): Promise<boolean> {
    try {
      switch (this.config.provider) {
        case 'rets':
          return await this.authenticateRETS();
        case 'reso':
          return await this.authenticateRESO();
        case 'custom':
          return await this.authenticateCustom();
        default:
          throw new Error(`Unsupported MLS provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('MLS Authentication failed:', error);
      return false;
    }
  }

  /**
   * RETS Authentication (Real Estate Transaction Standard)
   */
  private async authenticateRETS(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.endpoint}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'RealEstateCRM/1.0',
          'RETS-Version': 'RETS/1.8'
        },
        body: new URLSearchParams({
          username: this.config.credentials.username,
          password: this.config.credentials.password
        })
      });

      if (!response.ok) {
        throw new Error(`RETS Auth failed: ${response.status}`);
      }

      const authHeader = response.headers.get('Set-Cookie');
      if (authHeader) {
        // Extract session cookie
        this.authToken = authHeader.split(';')[0].split('=')[1];
        this.tokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        return true;
      }

      return false;
    } catch (error) {
      console.error('RETS Authentication error:', error);
      return false;
    }
  }

  /**
   * RESO Web API Authentication
   */
  private async authenticateRESO(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.endpoint}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${this.config.credentials.clientId}:${this.config.credentials.clientSecret}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'read'
        })
      });

      if (!response.ok) {
        throw new Error(`RESO Auth failed: ${response.status}`);
      }

      const data = await response.json();
      this.authToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000));
      return true;
    } catch (error) {
      console.error('RESO Authentication error:', error);
      return false;
    }
  }

  /**
   * Custom MLS Provider Authentication
   */
  private async authenticateCustom(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.endpoint}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: this.config.credentials.username,
          password: this.config.credentials.password,
          clientId: this.config.credentials.clientId
        })
      });

      if (!response.ok) {
        throw new Error(`Custom Auth failed: ${response.status}`);
      }

      const data = await response.json();
      this.authToken = data.token;
      this.tokenExpiry = new Date(Date.now() + (data.expiresIn || 3600) * 1000);
      return true;
    } catch (error) {
      console.error('Custom Authentication error:', error);
      return false;
    }
  }

  /**
   * Get properties from MLS
   */
  async getProperties(options: MLSSyncOptions = {
    fullSync: false,
    skipDuplicates: false,
    validateData: true
  }): Promise<MLSPropertyData[]> {
    await this.ensureAuthenticated();

    try {
      switch (this.config.provider) {
        case 'rets':
          return await this.getPropertiesRETS(options);
        case 'reso':
          return await this.getPropertiesRESO(options);
        case 'custom':
          return await this.getPropertiesCustom(options);
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('Get properties error:', error);
      throw error;
    }
  }

  /**
   * Get single property by MLS ID
   */
  async getPropertyById(mlsId: string): Promise<MLSPropertyData | null> {
    await this.ensureAuthenticated();

    try {
      switch (this.config.provider) {
        case 'rets':
          return await this.getPropertyByIdRETS(mlsId);
        case 'reso':
          return await this.getPropertyByIdRESO(mlsId);
        case 'custom':
          return await this.getPropertyByIdCustom(mlsId);
        default:
          return null;
      }
    } catch (error) {
      console.error(`Get property ${mlsId} error:`, error);
      return null;
    }
  }

  /**
   * Validate connection to MLS provider
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.authenticate();
      return !!this.authToken;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(): Promise<{ remaining: number; resetTime: Date }> {
    return {
      remaining: this.rateLimitRemaining,
      resetTime: this.rateLimitResetTime || new Date(Date.now() + 60000)
    };
  }

  /**
   * Ensure we have valid authentication
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.authToken || (this.tokenExpiry && this.tokenExpiry <= new Date())) {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        throw new Error('Failed to authenticate with MLS provider');
      }
    }
  }

  /**
   * RETS: Get properties
   */
  private async getPropertiesRETS(options: MLSSyncOptions): Promise<MLSPropertyData[]> {
    const query = this.buildRETSQuery(options);
    const response = await this.makeRETSRequest('GET', `/properties?${query}`);

    if (!response.success || !response.data) {
      throw new Error('Failed to fetch properties from RETS');
    }

    return this.transformRETSData(response.data);
  }

  /**
   * RESO: Get properties
   */
  private async getPropertiesRESO(options: MLSSyncOptions): Promise<MLSPropertyData[]> {
    const params = this.buildRESOParams(options);
    const response = await this.makeRESORequest('GET', '/properties', params);

    if (!response.success || !response.data) {
      throw new Error('Failed to fetch properties from RESO');
    }

    return this.transformRESOData(response.data);
  }

  /**
   * Custom: Get properties
   */
  private async getPropertiesCustom(options: MLSSyncOptions): Promise<MLSPropertyData[]> {
    const params = this.buildCustomParams(options);
    const response = await this.makeCustomRequest('GET', '/properties', params);

    if (!response.success || !response.data) {
      throw new Error('Failed to fetch properties from custom provider');
    }

    return this.transformCustomData(response.data);
  }

  /**
   * Get single property implementations
   */
  private async getPropertyByIdRETS(mlsId: string): Promise<MLSPropertyData | null> {
    const response = await this.makeRETSRequest('GET', `/properties/${mlsId}`);
    return response.success && response.data ? this.transformRETSData([response.data])[0] : null;
  }

  private async getPropertyByIdRESO(mlsId: string): Promise<MLSPropertyData | null> {
    const response = await this.makeRESORequest('GET', `/properties/${mlsId}`);
    return response.success && response.data ? this.transformRESOData([response.data])[0] : null;
  }

  private async getPropertyByIdCustom(mlsId: string): Promise<MLSPropertyData | null> {
    const response = await this.makeCustomRequest('GET', `/properties/${mlsId}`);
    return response.success && response.data ? this.transformCustomData([response.data])[0] : null;
  }

  /**
   * Build query parameters for different providers
   */
  private buildRETSQuery(options: MLSSyncOptions): string {
    const params = new URLSearchParams();

    if (options.dateRange) {
      params.append('modifiedAfter', options.dateRange.start.toISOString());
      params.append('modifiedBefore', options.dateRange.end.toISOString());
    }

    if (options.propertyTypes?.length) {
      params.append('propertyType', options.propertyTypes.join(','));
    }

    if (options.statusFilter?.length) {
      params.append('status', options.statusFilter.join(','));
    }

    if (options.maxRecords) {
      params.append('limit', options.maxRecords.toString());
    }

    return params.toString();
  }

  private buildRESOParams(options: MLSSyncOptions): Record<string, string> {
    const params: Record<string, string> = {};

    if (options.dateRange) {
      params['ModificationTimestamp'] = `gt=${options.dateRange.start.toISOString()}`;
    }

    if (options.propertyTypes?.length) {
      params['PropertyType'] = options.propertyTypes.join(',');
    }

    if (options.statusFilter?.length) {
      params['StandardStatus'] = options.statusFilter.join(',');
    }

    if (options.maxRecords) {
      params['$top'] = options.maxRecords.toString();
    }

    return params;
  }

  private buildCustomParams(options: MLSSyncOptions): Record<string, any> {
    const params: Record<string, any> = {};

    if (options.dateRange) {
      params.updated_after = options.dateRange.start.toISOString();
      params.updated_before = options.dateRange.end.toISOString();
    }

    if (options.propertyTypes?.length) {
      params.property_types = options.propertyTypes;
    }

    if (options.statusFilter?.length) {
      params.statuses = options.statusFilter;
    }

    if (options.maxRecords) {
      params.limit = options.maxRecords;
    }

    return params;
  }

  /**
   * Make HTTP requests to different providers
   */
  private async makeRETSRequest(method: string, endpoint: string, body?: any): Promise<MLSAPIResponse<any>> {
    const headers: Record<string, string> = {
      'User-Agent': 'RealEstateCRM/1.0',
      'RETS-Version': 'RETS/1.8'
    };

    if (this.authToken) {
      headers['Cookie'] = `RETS-Session=${this.authToken}`;
    }

    const response = await fetch(`${this.config.endpoint}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    this.updateRateLimit(response.headers);

    if (!response.ok) {
      throw new Error(`RETS API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.text();
    return { success: true, data: this.parseRETSData(data) };
  }

  private async makeRESORequest(method: string, endpoint: string, params?: Record<string, string>): Promise<MLSAPIResponse<any>> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.authToken}`,
      'Accept': 'application/json'
    };

    let url = `${this.config.endpoint}${endpoint}`;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const response = await fetch(url, { method, headers });
    this.updateRateLimit(response.headers);

    if (!response.ok) {
      throw new Error(`RESO API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  }

  private async makeCustomRequest(method: string, endpoint: string, params?: Record<string, any>): Promise<MLSAPIResponse<any>> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(`${this.config.endpoint}${endpoint}`, {
      method,
      headers,
      body: params ? JSON.stringify(params) : undefined
    });

    this.updateRateLimit(response.headers);

    if (!response.ok) {
      throw new Error(`Custom API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  }

  /**
   * Update rate limit tracking
   */
  private updateRateLimit(headers: Headers): void {
    const remaining = headers.get('X-RateLimit-Remaining');
    const reset = headers.get('X-RateLimit-Reset');

    if (remaining) {
      this.rateLimitRemaining = parseInt(remaining, 10);
    }

    if (reset) {
      this.rateLimitResetTime = new Date(parseInt(reset, 10) * 1000);
    }
  }

  /**
   * Data transformation methods (simplified for demo)
   */
  private parseRETSData(data: string): any {
    // Parse RETS XML/CSV response
    // This would be more complex in real implementation
    return JSON.parse(data);
  }

  private transformRETSData(data: any[]): MLSPropertyData[] {
    return data.map(item => ({
      mlsId: item.ListingID,
      listingId: item.ListingID,
      propertyType: item.PropertyType,
      status: item.StandardStatus?.toLowerCase() || 'active',
      price: parseFloat(item.ListPrice) || 0,
      address: {
        streetNumber: item.StreetNumber || '',
        streetName: item.StreetName || '',
        city: item.City || '',
        state: item.StateOrProvince || '',
        zipCode: item.PostalCode || '',
        country: 'US'
      },
      details: {
        bedrooms: parseInt(item.BedroomsTotal) || 0,
        bathrooms: parseFloat(item.BathroomsTotal) || 0,
        squareFeet: parseFloat(item.LivingArea) || 0,
        yearBuilt: parseInt(item.YearBuilt) || undefined
      },
      media: [],
      agent: {
        id: item.ListAgentKey || '',
        name: item.ListAgentFullName || '',
        email: item.ListAgentEmail || '',
        phone: item.ListAgentPreferredPhone || ''
      },
      office: {
        id: item.ListOfficeKey || '',
        name: item.ListOfficeName || ''
      },
      dates: {
        listed: new Date(item.ListingContractDate || Date.now()),
        updated: new Date(item.ModificationTimestamp || Date.now())
      },
      rawData: item
    }));
  }

  private transformRESOData(data: any[]): MLSPropertyData[] {
    return data.map(item => ({
      mlsId: item.ListingId,
      listingId: item.ListingId,
      propertyType: item.PropertyType,
      status: item.StandardStatus?.toLowerCase() || 'active',
      price: parseFloat(item.ListPrice?.Price) || 0,
      address: {
        streetNumber: item.PropertyAddress?.StreetNumber || '',
        streetName: item.PropertyAddress?.StreetName || '',
        city: item.PropertyAddress?.City || '',
        state: item.PropertyAddress?.StateOrProvince || '',
        zipCode: item.PropertyAddress?.PostalCode || '',
        country: item.PropertyAddress?.Country || 'US'
      },
      details: {
        bedrooms: parseInt(item.Rooms?.BedroomsTotal) || 0,
        bathrooms: parseFloat(item.Rooms?.BathroomsTotal) || 0,
        squareFeet: parseFloat(item.Building?.BuildingAreaTotal) || 0,
        yearBuilt: parseInt(item.Building?.YearBuilt) || undefined
      },
      media: [],
      agent: {
        id: item.ListAgent?.ListAgentKey || '',
        name: item.ListAgent?.ListAgentFullName || '',
        email: item.ListAgent?.ListAgentEmail || '',
        phone: item.ListAgent?.ListAgentPreferredPhone || ''
      },
      office: {
        id: item.ListOffice?.ListOfficeKey || '',
        name: item.ListOffice?.ListOfficeName || ''
      },
      dates: {
        listed: new Date(item.ListingContractDate || Date.now()),
        updated: new Date(item.ModificationTimestamp || Date.now())
      },
      rawData: item
    }));
  }

  private transformCustomData(data: any[]): MLSPropertyData[] {
    return data.map(item => ({
      mlsId: item.id,
      listingId: item.listing_id,
      propertyType: item.property_type,
      status: item.status || 'active',
      price: parseFloat(item.price) || 0,
      address: {
        streetNumber: item.address?.street_number || '',
        streetName: item.address?.street_name || '',
        city: item.address?.city || '',
        state: item.address?.state || '',
        zipCode: item.address?.zip_code || '',
        country: item.address?.country || 'US'
      },
      details: {
        bedrooms: parseInt(item.bedrooms) || 0,
        bathrooms: parseFloat(item.bathrooms) || 0,
        squareFeet: parseFloat(item.square_feet) || 0,
        yearBuilt: parseInt(item.year_built) || undefined
      },
      media: [],
      agent: {
        id: item.agent?.id || '',
        name: item.agent?.name || '',
        email: item.agent?.email || '',
        phone: item.agent?.phone || ''
      },
      office: {
        id: item.office?.id || '',
        name: item.office?.name || ''
      },
      dates: {
        listed: new Date(item.listed_date || Date.now()),
        updated: new Date(item.updated_date || Date.now())
      },
      rawData: item
    }));
  }
}

/**
 * Factory function to create MLS service instances
 */
export function createMLSService(config: MLSConfig): IMLSService {
  return new MLSAPIService(config);
}

/**
 * Utility function to get default MLS configurations
 */
export function getDefaultMLSConfigs(): MLSConfig[] {
  return [
    {
      provider: 'rets',
      endpoint: 'https://rets.example.com',
      credentials: {
        username: 'your_username',
        password: 'your_password'
      },
      rateLimit: 100,
      syncInterval: 60,
      enabled: false
    },
    {
      provider: 'reso',
      endpoint: 'https://reso.example.com',
      credentials: {
        username: 'your_username',
        password: 'your_password',
        clientId: 'your_client_id',
        clientSecret: 'your_client_secret'
      },
      rateLimit: 1000,
      syncInterval: 30,
      enabled: false
    }
  ];
}