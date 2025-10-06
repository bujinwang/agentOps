import { query } from '../config/database';

export interface Property {
  propertyId: number;
  mlsListingId: string;
  mlsProvider: string;
  
  // Basic Information
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  
  // Property Details
  propertyType: string;
  propertySubtype: string | null;
  status: string;
  
  // Pricing
  price: number;
  originalPrice: number | null;
  pricePerSqft: number | null;
  
  // Physical Characteristics
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  lotSize: number | null;
  yearBuilt: number | null;
  
  // Features
  interiorFeatures: Record<string, any> | null;
  exteriorFeatures: Record<string, any> | null;
  appliances: string[] | null;
  parkingFeatures: Record<string, any> | null;
  
  // Additional Info
  description: string | null;
  remarks: string | null;
  
  // Location Details
  latitude: number | null;
  longitude: number | null;
  neighborhood: string | null;
  schoolDistrict: string | null;
  
  // Listing Information
  listedDate: Date | null;
  soldDate: Date | null;
  daysOnMarket: number | null;
  listingAgentName: string | null;
  listingAgentPhone: string | null;
  listingAgentEmail: string | null;
  listingOffice: string | null;
  
  // MLS Sync Metadata
  mlsDataRaw: Record<string, any> | null;
  lastSyncedAt: Date;
  syncStatus: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyCreate {
  mlsListingId: string;
  mlsProvider: string;
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
  interiorFeatures?: Record<string, any>;
  exteriorFeatures?: Record<string, any>;
  appliances?: string[];
  parkingFeatures?: Record<string, any>;
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
  mlsDataRaw?: Record<string, any>;
}

export interface PropertyUpdate {
  status?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  description?: string;
  remarks?: string;
  soldDate?: Date;
  daysOnMarket?: number;
  lastSyncedAt?: Date;
  syncStatus?: string;
  mlsDataRaw?: Record<string, any>;
}

export interface PropertyFilters {
  status?: string;
  propertyType?: string;
  city?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minSquareFeet?: number;
  maxSquareFeet?: number;
  mlsProvider?: string;
  search?: string; // Search in address, city, description
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedProperties {
  properties: Property[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class PropertyModel {
  static async create(propertyData: PropertyCreate): Promise<Property> {
    const result = await query(
      `INSERT INTO properties (
        mls_listing_id, mls_provider, address, city, state, postal_code, country,
        property_type, property_subtype, status, price, original_price,
        bedrooms, bathrooms, square_feet, lot_size, year_built,
        interior_features, exterior_features, appliances, parking_features,
        description, remarks, latitude, longitude, neighborhood, school_district,
        listed_date, sold_date, days_on_market,
        listing_agent_name, listing_agent_phone, listing_agent_email, listing_office,
        mls_data_raw, last_synced_at, sync_status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
              $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
              $33, $34, $35, NOW(), 'synced', NOW(), NOW())
      RETURNING *`,
      [
        propertyData.mlsListingId,
        propertyData.mlsProvider,
        propertyData.address,
        propertyData.city,
        propertyData.state,
        propertyData.postalCode,
        propertyData.country || 'USA',
        propertyData.propertyType,
        propertyData.propertySubtype || null,
        propertyData.status,
        propertyData.price,
        propertyData.originalPrice || null,
        propertyData.bedrooms || null,
        propertyData.bathrooms || null,
        propertyData.squareFeet || null,
        propertyData.lotSize || null,
        propertyData.yearBuilt || null,
        JSON.stringify(propertyData.interiorFeatures || null),
        JSON.stringify(propertyData.exteriorFeatures || null),
        JSON.stringify(propertyData.appliances || null),
        JSON.stringify(propertyData.parkingFeatures || null),
        propertyData.description || null,
        propertyData.remarks || null,
        propertyData.latitude || null,
        propertyData.longitude || null,
        propertyData.neighborhood || null,
        propertyData.schoolDistrict || null,
        propertyData.listedDate || null,
        propertyData.soldDate || null,
        propertyData.daysOnMarket || null,
        propertyData.listingAgentName || null,
        propertyData.listingAgentPhone || null,
        propertyData.listingAgentEmail || null,
        propertyData.listingOffice || null,
        JSON.stringify(propertyData.mlsDataRaw || null),
      ]
    );

    return this.mapRow(result.rows[0]);
  }

  static async findById(propertyId: number): Promise<Property | null> {
    const result = await query(
      'SELECT * FROM properties WHERE property_id = $1',
      [propertyId]
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async findByMlsListingId(mlsListingId: string, mlsProvider: string): Promise<Property | null> {
    const result = await query(
      'SELECT * FROM properties WHERE mls_listing_id = $1 AND mls_provider = $2',
      [mlsListingId, mlsProvider]
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async findAll(
    filters: PropertyFilters = {},
    pagination: PaginationOptions
  ): Promise<PaginatedProperties> {
    const { page, limit, sortBy = 'created_at', sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.propertyType) {
      conditions.push(`property_type = $${paramIndex}`);
      params.push(filters.propertyType);
      paramIndex++;
    }

    if (filters.city) {
      conditions.push(`city = $${paramIndex}`);
      params.push(filters.city);
      paramIndex++;
    }

    if (filters.state) {
      conditions.push(`state = $${paramIndex}`);
      params.push(filters.state);
      paramIndex++;
    }

    if (filters.minPrice !== undefined) {
      conditions.push(`price >= $${paramIndex}`);
      params.push(filters.minPrice);
      paramIndex++;
    }

    if (filters.maxPrice !== undefined) {
      conditions.push(`price <= $${paramIndex}`);
      params.push(filters.maxPrice);
      paramIndex++;
    }

    if (filters.minBedrooms !== undefined) {
      conditions.push(`bedrooms >= $${paramIndex}`);
      params.push(filters.minBedrooms);
      paramIndex++;
    }

    if (filters.maxBedrooms !== undefined) {
      conditions.push(`bedrooms <= $${paramIndex}`);
      params.push(filters.maxBedrooms);
      paramIndex++;
    }

    if (filters.minBathrooms !== undefined) {
      conditions.push(`bathrooms >= $${paramIndex}`);
      params.push(filters.minBathrooms);
      paramIndex++;
    }

    if (filters.maxBathrooms !== undefined) {
      conditions.push(`bathrooms <= $${paramIndex}`);
      params.push(filters.maxBathrooms);
      paramIndex++;
    }

    if (filters.minSquareFeet !== undefined) {
      conditions.push(`square_feet >= $${paramIndex}`);
      params.push(filters.minSquareFeet);
      paramIndex++;
    }

    if (filters.maxSquareFeet !== undefined) {
      conditions.push(`square_feet <= $${paramIndex}`);
      params.push(filters.maxSquareFeet);
      paramIndex++;
    }

    if (filters.mlsProvider) {
      conditions.push(`mls_provider = $${paramIndex}`);
      params.push(filters.mlsProvider);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(`(address ILIKE $${paramIndex} OR city ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM properties ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results
    const validSortColumns = ['created_at', 'updated_at', 'price', 'listed_date', 'bedrooms', 'bathrooms', 'square_feet'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const result = await query(
      `SELECT * FROM properties 
       ${whereClause}
       ORDER BY ${safeSortBy} ${safeSortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const properties = result.rows.map(row => this.mapRow(row));
    const totalPages = Math.ceil(total / limit);

    return {
      properties,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  static async update(propertyId: number, updateData: PropertyUpdate): Promise<Property | null> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Build SET clause dynamically
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        
        // Handle JSON fields
        if (['mlsDataRaw'].includes(key)) {
          updates.push(`${snakeKey} = $${paramIndex}`);
          params.push(JSON.stringify(value));
        } else {
          updates.push(`${snakeKey} = $${paramIndex}`);
          params.push(value);
        }
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      return this.findById(propertyId);
    }

    updates.push(`updated_at = NOW()`);
    params.push(propertyId);

    const result = await query(
      `UPDATE properties 
       SET ${updates.join(', ')}
       WHERE property_id = $${paramIndex}
       RETURNING *`,
      params
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async batchUpsert(properties: PropertyCreate[]): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    for (const propertyData of properties) {
      const existing = await this.findByMlsListingId(propertyData.mlsListingId, propertyData.mlsProvider);
      
      if (existing) {
        await this.update(existing.propertyId, {
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
        updated++;
      } else {
        await this.create(propertyData);
        inserted++;
      }
    }

    return { inserted, updated };
  }

  static async delete(propertyId: number): Promise<boolean> {
    const result = await query(
      'DELETE FROM properties WHERE property_id = $1',
      [propertyId]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  static async countByStatus(): Promise<Record<string, number>> {
    const result = await query(
      `SELECT status, COUNT(*) as count 
       FROM properties 
       GROUP BY status`
    );

    return result.rows.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {} as Record<string, number>);
  }

  private static mapRow(row: any): Property {
    return {
      propertyId: row.property_id,
      mlsListingId: row.mls_listing_id,
      mlsProvider: row.mls_provider,
      address: row.address,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
      country: row.country,
      propertyType: row.property_type,
      propertySubtype: row.property_subtype,
      status: row.status,
      price: parseFloat(row.price),
      originalPrice: row.original_price ? parseFloat(row.original_price) : null,
      pricePerSqft: row.price_per_sqft ? parseFloat(row.price_per_sqft) : null,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms ? parseFloat(row.bathrooms) : null,
      squareFeet: row.square_feet,
      lotSize: row.lot_size,
      yearBuilt: row.year_built,
      interiorFeatures: row.interior_features,
      exteriorFeatures: row.exterior_features,
      appliances: row.appliances,
      parkingFeatures: row.parking_features,
      description: row.description,
      remarks: row.remarks,
      latitude: row.latitude ? parseFloat(row.latitude) : null,
      longitude: row.longitude ? parseFloat(row.longitude) : null,
      neighborhood: row.neighborhood,
      schoolDistrict: row.school_district,
      listedDate: row.listed_date,
      soldDate: row.sold_date,
      daysOnMarket: row.days_on_market,
      listingAgentName: row.listing_agent_name,
      listingAgentPhone: row.listing_agent_phone,
      listingAgentEmail: row.listing_agent_email,
      listingOffice: row.listing_office,
      mlsDataRaw: row.mls_data_raw,
      lastSyncedAt: row.last_synced_at,
      syncStatus: row.sync_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
