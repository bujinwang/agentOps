/**
 * Mock MLS Provider for Testing
 * 
 * This provider simulates MLS behavior without requiring real credentials.
 * Useful for development, testing, and demonstrations.
 */

import {
  BaseMLSProvider,
  MLSProviderConfig,
  MLSPropertyData,
  MLSSyncOptions,
  MLSMediaData,
} from './base-mls-provider';

export class MockMLSProvider extends BaseMLSProvider {
  private mockProperties: MLSPropertyData[] = [];

  constructor(config: MLSProviderConfig) {
    super(config);
    this.generateMockProperties();
  }

  async connect(): Promise<void> {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 500));
    this.connected = true;
    console.log(`✅ Connected to Mock MLS provider: ${this.config.providerName}`);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    console.log(`✅ Disconnected from Mock MLS provider`);
  }

  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    return {
      healthy: this.connected,
      message: this.connected ? 'Mock provider healthy' : 'Not connected',
    };
  }

  async fetchProperties(options: MLSSyncOptions): Promise<MLSPropertyData[]> {
    if (!this.connected) {
      throw new Error('Not connected. Call connect() first.');
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    let properties = [...this.mockProperties];

    // Filter by sync type
    if (options.syncType === 'incremental' && options.lastSyncTimestamp) {
      properties = properties.filter(p => 
        p.modifiedTimestamp && p.modifiedTimestamp > options.lastSyncTimestamp!
      );
    }

    // Apply batch size limit
    if (options.batchSize) {
      properties = properties.slice(0, options.batchSize);
    }

    // Apply max properties limit
    if (options.maxProperties) {
      properties = properties.slice(0, options.maxProperties);
    }

    return properties;
  }

  async fetchPropertyById(listingId: string): Promise<MLSPropertyData | null> {
    if (!this.connected) {
      throw new Error('Not connected');
    }

    return this.mockProperties.find(p => p.listingId === listingId) || null;
  }

  async getMetadata(): Promise<{
    resourceClasses: string[];
    availableFields: string[];
    version: string;
  }> {
    return {
      resourceClasses: ['ResidentialProperty', 'CommercialProperty'],
      availableFields: Object.keys(this.config.fieldMapping),
      version: 'Mock/1.0.0',
    };
  }

  /**
   * Generate mock property data for testing
   */
  private generateMockProperties(): void {
    const cities = ['Seattle', 'Bellevue', 'Redmond', 'Kirkland', 'Tacoma'];
    const propertyTypes = ['House', 'Condo', 'Townhouse'];
    const statuses = ['Active', 'Pending', 'Sold'];
    const streets = ['Main St', 'Oak Ave', 'Pine Rd', 'Maple Dr', 'Cedar Ln'];

    for (let i = 1; i <= 50; i++) {
      const city = cities[Math.floor(Math.random() * cities.length)];
      const propertyType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const street = streets[Math.floor(Math.random() * streets.length)];

      const property: MLSPropertyData = {
        listingId: `MOCK${String(i).padStart(6, '0')}`,
        address: `${1000 + i} ${street}`,
        city,
        state: 'WA',
        postalCode: `981${String(i).padStart(2, '0')}`,
        country: 'USA',
        propertyType,
        propertySubtype: propertyType === 'House' ? 'Single Family' : undefined,
        status,
        price: 300000 + (i * 10000) + Math.floor(Math.random() * 100000),
        originalPrice: 300000 + (i * 10000) + Math.floor(Math.random() * 150000),
        bedrooms: 2 + Math.floor(Math.random() * 4),
        bathrooms: 1.5 + Math.floor(Math.random() * 2.5),
        squareFeet: 1200 + (i * 50) + Math.floor(Math.random() * 800),
        lotSize: 5000 + Math.floor(Math.random() * 5000),
        yearBuilt: 1990 + Math.floor(Math.random() * 30),
        description: `Beautiful ${propertyType.toLowerCase()} in ${city}. This property features...`,
        remarks: `Agent remarks for property ${i}`,
        latitude: 47.6 + (Math.random() * 0.5),
        longitude: -122.3 + (Math.random() * 0.5),
        neighborhood: `${city} Heights`,
        schoolDistrict: `${city} School District`,
        listedDate: new Date(Date.now() - (i * 86400000)), // i days ago
        soldDate: status === 'Sold' ? new Date() : undefined,
        daysOnMarket: i,
        listingAgentName: `Agent ${i % 10}`,
        listingAgentPhone: `+1-555-01${String(i).padStart(2, '0')}`,
        listingAgentEmail: `agent${i % 10}@realty.com`,
        listingOffice: `Realty Office ${i % 5}`,
        features: {
          interior: {
            hardwoodFloors: Math.random() > 0.5,
            fireplace: Math.random() > 0.6,
            updatedKitchen: Math.random() > 0.4,
          },
          exterior: {
            pool: Math.random() > 0.8,
            deck: Math.random() > 0.5,
            fencedYard: Math.random() > 0.4,
          },
          appliances: ['Dishwasher', 'Refrigerator', 'Microwave'],
          parking: {
            type: 'Garage',
            spaces: 1 + Math.floor(Math.random() * 2),
          },
        },
        media: this.generateMockMedia(i),
        modifiedTimestamp: new Date(Date.now() - (Math.random() * 86400000 * 7)),
        rawData: { mockData: true, id: i },
      };

      this.mockProperties.push(property);
    }

    console.log(`📊 Generated ${this.mockProperties.length} mock properties`);
  }

  /**
   * Generate mock media URLs
   */
  private generateMockMedia(propertyId: number): MLSMediaData[] {
    const mediaCount = 3 + Math.floor(Math.random() * 5);
    const media: MLSMediaData[] = [];

    for (let i = 0; i < mediaCount; i++) {
      media.push({
        url: `https://via.placeholder.com/800x600?text=Property+${propertyId}+Image+${i + 1}`,
        type: 'image',
        order: i,
        caption: `Property ${propertyId} - Image ${i + 1}`,
      });
    }

    return media;
  }

  /**
   * Add a mock property (for testing updates)
   */
  addMockProperty(property: MLSPropertyData): void {
    this.mockProperties.push(property);
  }

  /**
   * Update a mock property (for testing updates)
   */
  updateMockProperty(listingId: string, updates: Partial<MLSPropertyData>): void {
    const index = this.mockProperties.findIndex(p => p.listingId === listingId);
    if (index !== -1) {
      this.mockProperties[index] = {
        ...this.mockProperties[index],
        ...updates,
        modifiedTimestamp: new Date(),
      };
    }
  }

  /**
   * Remove a mock property (for testing deletions)
   */
  removeMockProperty(listingId: string): void {
    this.mockProperties = this.mockProperties.filter(p => p.listingId !== listingId);
  }

  /**
   * Get all mock properties (for testing)
   */
  getAllMockProperties(): MLSPropertyData[] {
    return [...this.mockProperties];
  }
}
