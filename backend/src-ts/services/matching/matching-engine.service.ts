/**
 * Matching Engine Service
 * 
 * Core algorithm for matching leads to properties with intelligent scoring
 */

import { query } from '../../config/database';

export interface LeadPreferences {
  leadId: number;
  budgetMin?: number;
  budgetMax?: number;
  preferredCities?: string[];
  preferredStates?: string[];
  preferredZipCodes?: string[];
  maxDistanceMiles?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minSquareFeet?: number;
  maxSquareFeet?: number;
  preferredPropertyTypes?: string[];
  mustHaveFeatures?: string[];
  niceToHaveFeatures?: string[];
  dealBreakers?: string[];
  
  // Weights for custom scoring
  budgetWeight?: number;
  locationWeight?: number;
  bedroomsWeight?: number;
  bathroomsWeight?: number;
  propertyTypeWeight?: number;
  featuresWeight?: number;
}

export interface Property {
  propertyId: number;
  mlsListingId: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  lotSize?: number;
  propertyType: string;
  propertySubtype?: string;
  status: string;
  latitude?: number;
  longitude?: number;
  features?: string[];
}

export interface PropertyMatch {
  leadId: number;
  propertyId: number;
  overallScore: number;
  budgetScore: number;
  locationScore: number;
  bedroomsScore: number;
  bathroomsScore: number;
  propertyTypeScore: number;
  featuresScore: number;
  matchQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  distanceMiles?: number;
  priceDifference?: number;
  matchingFeatures?: string[];
  missingFeatures?: string[];
}

export class MatchingEngineService {
  private readonly DEFAULT_WEIGHTS = {
    budget: 0.30,
    location: 0.25,
    bedrooms: 0.15,
    bathrooms: 0.10,
    propertyType: 0.10,
    features: 0.10,
  };

  /**
   * Find best matches for a lead
   */
  async findMatchesForLead(
    leadId: number,
    options: {
      limit?: number;
      minScore?: number;
    } = {}
  ): Promise<PropertyMatch[]> {
    const { limit = 20, minScore = 40 } = options;

    // Get lead preferences
    const preferences = await this.getLeadPreferences(leadId);
    if (!preferences) {
      throw new Error(`No preferences found for lead ${leadId}`);
    }

    // Get eligible properties
    const properties = await this.getEligibleProperties(preferences);

    // Score each property
    const matches: PropertyMatch[] = [];
    for (const property of properties) {
      const match = this.scoreProperty(preferences, property);
      
      // Filter by minimum score
      if (match.overallScore >= minScore) {
        matches.push(match);
      }
    }

    // Sort by score (highest first)
    matches.sort((a, b) => b.overallScore - a.overallScore);

    // Return top matches
    return matches.slice(0, limit);
  }

  /**
   * Batch match all active leads
   */
  async batchMatchAllLeads(options: { minScore?: number } = {}): Promise<{
    totalLeads: number;
    totalMatches: number;
    excellentMatches: number;
    goodMatches: number;
    fairMatches: number;
  }> {
    const { minScore = 40 } = options;

    // Get all active leads
    const leadsResult = await query(
      'SELECT lead_id FROM leads WHERE status = $1',
      ['active']
    );

    const stats = {
      totalLeads: leadsResult.rows.length,
      totalMatches: 0,
      excellentMatches: 0,
      goodMatches: 0,
      fairMatches: 0,
    };

    // Match each lead
    for (const lead of leadsResult.rows) {
      try {
        const matches = await this.findMatchesForLead(lead.lead_id, { minScore });
        
        // Save matches to database
        for (const match of matches) {
          await this.saveMatch(match);
          stats.totalMatches++;
          
          if (match.matchQuality === 'Excellent') stats.excellentMatches++;
          else if (match.matchQuality === 'Good') stats.goodMatches++;
          else if (match.matchQuality === 'Fair') stats.fairMatches++;
        }
      } catch (error) {
        console.error(`Error matching lead ${lead.lead_id}:`, error);
        // Continue with next lead
      }
    }

    return stats;
  }

  /**
   * Core scoring algorithm
   */
  private scoreProperty(preferences: LeadPreferences, property: Property): PropertyMatch {
    const weights = {
      budget: preferences.budgetWeight || this.DEFAULT_WEIGHTS.budget,
      location: preferences.locationWeight || this.DEFAULT_WEIGHTS.location,
      bedrooms: preferences.bedroomsWeight || this.DEFAULT_WEIGHTS.bedrooms,
      bathrooms: preferences.bathroomsWeight || this.DEFAULT_WEIGHTS.bathrooms,
      propertyType: preferences.propertyTypeWeight || this.DEFAULT_WEIGHTS.propertyType,
      features: preferences.featuresWeight || this.DEFAULT_WEIGHTS.features,
    };

    // Calculate individual scores (0-100)
    const budgetScore = this.scoreBudget(preferences, property);
    const locationScore = this.scoreLocation(preferences, property);
    const bedroomsScore = this.scoreBedrooms(preferences, property);
    const bathroomsScore = this.scoreBathrooms(preferences, property);
    const propertyTypeScore = this.scorePropertyType(preferences, property);
    const featuresScore = this.scoreFeatures(preferences, property);

    // Calculate weighted overall score
    const overallScore =
      budgetScore * weights.budget +
      locationScore * weights.location +
      bedroomsScore * weights.bedrooms +
      bathroomsScore * weights.bathrooms +
      propertyTypeScore * weights.propertyType +
      featuresScore * weights.features;

    // Determine match quality
    let matchQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    if (overallScore >= 80) matchQuality = 'Excellent';
    else if (overallScore >= 60) matchQuality = 'Good';
    else if (overallScore >= 40) matchQuality = 'Fair';
    else matchQuality = 'Poor';

    // Calculate additional metrics
    const priceDifference = this.calculatePriceDifference(preferences, property);
    const { matchingFeatures, missingFeatures } = this.analyzeFeatures(preferences, property);

    return {
      leadId: preferences.leadId,
      propertyId: property.propertyId,
      overallScore: Math.round(overallScore * 100) / 100,
      budgetScore: Math.round(budgetScore * 100) / 100,
      locationScore: Math.round(locationScore * 100) / 100,
      bedroomsScore: Math.round(bedroomsScore * 100) / 100,
      bathroomsScore: Math.round(bathroomsScore * 100) / 100,
      propertyTypeScore: Math.round(propertyTypeScore * 100) / 100,
      featuresScore: Math.round(featuresScore * 100) / 100,
      matchQuality,
      priceDifference,
      matchingFeatures,
      missingFeatures,
    };
  }

  /**
   * Score budget match (0-100)
   */
  private scoreBudget(preferences: LeadPreferences, property: Property): number {
    const { budgetMin, budgetMax } = preferences;
    const price = property.price;

    // No budget preference = neutral score
    if (!budgetMin && !budgetMax) return 50;

    // Within budget = perfect score
    if (
      (!budgetMin || price >= budgetMin) &&
      (!budgetMax || price <= budgetMax)
    ) {
      return 100;
    }

    // Calculate percentage over/under budget
    if (budgetMax && price > budgetMax) {
      const percentOver = ((price - budgetMax) / budgetMax) * 100;
      if (percentOver <= 10) return 70; // 10% over
      if (percentOver <= 20) return 40; // 20% over
      return 0; // More than 20% over
    }

    if (budgetMin && price < budgetMin) {
      const percentUnder = ((budgetMin - price) / budgetMin) * 100;
      if (percentUnder <= 20) return 60; // 20% under
      return 30; // More than 20% under
    }

    return 50;
  }

  /**
   * Score location match (0-100)
   */
  private scoreLocation(preferences: LeadPreferences, property: Property): number {
    const { preferredCities, preferredStates, preferredZipCodes } = preferences;

    // Exact city match
    if (preferredCities && preferredCities.length > 0) {
      if (preferredCities.some(city => 
        city.toLowerCase() === property.city.toLowerCase()
      )) {
        return 100;
      }
    }

    // ZIP code match
    if (preferredZipCodes && preferredZipCodes.length > 0) {
      if (preferredZipCodes.includes(property.zipCode)) {
        return 100;
      }
    }

    // State match
    if (preferredStates && preferredStates.length > 0) {
      if (preferredStates.some(state => 
        state.toLowerCase() === property.state.toLowerCase()
      )) {
        return 60;
      }
    }

    // No location preference = neutral
    if (
      (!preferredCities || preferredCities.length === 0) &&
      (!preferredStates || preferredStates.length === 0) &&
      (!preferredZipCodes || preferredZipCodes.length === 0)
    ) {
      return 50;
    }

    return 20; // Different location
  }

  /**
   * Score bedrooms match (0-100)
   */
  private scoreBedrooms(preferences: LeadPreferences, property: Property): number {
    const { minBedrooms, maxBedrooms } = preferences;
    const bedrooms = property.bedrooms;

    if (!minBedrooms && !maxBedrooms) return 50; // No preference
    if (!bedrooms) return 30; // No data

    // Exact match or within range
    if (
      (!minBedrooms || bedrooms >= minBedrooms) &&
      (!maxBedrooms || bedrooms <= maxBedrooms)
    ) {
      return 100;
    }

    // Within 1 bedroom
    const minDiff = minBedrooms ? Math.abs(bedrooms - minBedrooms) : 999;
    const maxDiff = maxBedrooms ? Math.abs(bedrooms - maxBedrooms) : 999;
    const closestDiff = Math.min(minDiff, maxDiff);

    if (closestDiff === 1) return 75;
    if (closestDiff === 2) return 50;
    return 20;
  }

  /**
   * Score bathrooms match (0-100)
   */
  private scoreBathrooms(preferences: LeadPreferences, property: Property): number {
    const { minBathrooms, maxBathrooms } = preferences;
    const bathrooms = property.bathrooms;

    if (!minBathrooms && !maxBathrooms) return 50; // No preference
    if (!bathrooms) return 30; // No data

    // Within range
    if (
      (!minBathrooms || bathrooms >= minBathrooms) &&
      (!maxBathrooms || bathrooms <= maxBathrooms)
    ) {
      return 100;
    }

    // Within 0.5 bathrooms
    const minDiff = minBathrooms ? Math.abs(bathrooms - minBathrooms) : 999;
    const maxDiff = maxBathrooms ? Math.abs(bathrooms - maxBathrooms) : 999;
    const closestDiff = Math.min(minDiff, maxDiff);

    if (closestDiff <= 0.5) return 75;
    if (closestDiff <= 1.0) return 50;
    return 20;
  }

  /**
   * Score property type match (0-100)
   */
  private scorePropertyType(preferences: LeadPreferences, property: Property): number {
    const { preferredPropertyTypes } = preferences;

    if (!preferredPropertyTypes || preferredPropertyTypes.length === 0) {
      return 50; // No preference
    }

    // Exact type match
    if (preferredPropertyTypes.some(type => 
      type.toLowerCase() === property.propertyType.toLowerCase()
    )) {
      return 100;
    }

    // Partial match (similar types)
    const similarTypes: Record<string, string[]> = {
      'House': ['Single Family', 'Townhouse'],
      'Condo': ['Apartment', 'Townhouse'],
      'Townhouse': ['House', 'Condo'],
    };

    for (const prefType of preferredPropertyTypes) {
      const similar = similarTypes[prefType] || [];
      if (similar.some(t => t.toLowerCase() === property.propertyType.toLowerCase())) {
        return 60;
      }
    }

    return 20; // Different type
  }

  /**
   * Score features match (0-100)
   */
  private scoreFeatures(preferences: LeadPreferences, property: Property): number {
    const { mustHaveFeatures, niceToHaveFeatures, dealBreakers } = preferences;
    const propertyFeatures = property.features || [];

    // Check deal breakers
    if (dealBreakers && dealBreakers.length > 0) {
      for (const dealBreaker of dealBreakers) {
        if (propertyFeatures.some(f => f.toLowerCase().includes(dealBreaker.toLowerCase()))) {
          return 0; // Has deal breaker
        }
      }
    }

    let score = 50; // Base score

    // Must-have features (critical)
    if (mustHaveFeatures && mustHaveFeatures.length > 0) {
      const matchedMustHave = mustHaveFeatures.filter(feature =>
        propertyFeatures.some(f => f.toLowerCase().includes(feature.toLowerCase()))
      );
      const mustHaveRatio = matchedMustHave.length / mustHaveFeatures.length;
      score = mustHaveRatio * 100;
    }

    // Nice-to-have features (bonus)
    if (niceToHaveFeatures && niceToHaveFeatures.length > 0) {
      const matchedNiceToHave = niceToHaveFeatures.filter(feature =>
        propertyFeatures.some(f => f.toLowerCase().includes(feature.toLowerCase()))
      );
      const niceToHaveBonus = (matchedNiceToHave.length / niceToHaveFeatures.length) * 20;
      score = Math.min(100, score + niceToHaveBonus);
    }

    return score;
  }

  /**
   * Calculate price difference from budget
   */
  private calculatePriceDifference(preferences: LeadPreferences, property: Property): number {
    const { budgetMin, budgetMax } = preferences;
    const price = property.price;

    if (budgetMax && price > budgetMax) {
      return price - budgetMax;
    }

    if (budgetMin && price < budgetMin) {
      return price - budgetMin;
    }

    return 0; // Within budget
  }

  /**
   * Analyze matching and missing features
   */
  private analyzeFeatures(
    preferences: LeadPreferences,
    property: Property
  ): { matchingFeatures: string[]; missingFeatures: string[] } {
    const propertyFeatures = property.features || [];
    const wantedFeatures = [
      ...(preferences.mustHaveFeatures || []),
      ...(preferences.niceToHaveFeatures || []),
    ];

    const matchingFeatures: string[] = [];
    const missingFeatures: string[] = [];

    for (const wanted of wantedFeatures) {
      const found = propertyFeatures.find(f => 
        f.toLowerCase().includes(wanted.toLowerCase())
      );
      if (found) {
        matchingFeatures.push(wanted);
      } else {
        missingFeatures.push(wanted);
      }
    }

    return { matchingFeatures, missingFeatures };
  }

  /**
   * Get lead preferences from database
   */
  private async getLeadPreferences(leadId: number): Promise<LeadPreferences | null> {
    const result = await query(
      `SELECT * FROM lead_preferences WHERE lead_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
      [leadId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      leadId: row.lead_id,
      budgetMin: row.budget_min,
      budgetMax: row.budget_max,
      preferredCities: row.preferred_cities,
      preferredStates: row.preferred_states,
      preferredZipCodes: row.preferred_zip_codes,
      maxDistanceMiles: row.max_distance_miles,
      minBedrooms: row.min_bedrooms,
      maxBedrooms: row.max_bedrooms,
      minBathrooms: row.min_bathrooms,
      maxBathrooms: row.max_bathrooms,
      minSquareFeet: row.min_square_feet,
      maxSquareFeet: row.max_square_feet,
      preferredPropertyTypes: row.preferred_property_types,
      mustHaveFeatures: row.must_have_features,
      niceToHaveFeatures: row.nice_to_have_features,
      dealBreakers: row.deal_breakers,
      budgetWeight: row.budget_weight,
      locationWeight: row.location_weight,
      bedroomsWeight: row.bedrooms_weight,
      bathroomsWeight: row.bathrooms_weight,
      propertyTypeWeight: row.property_type_weight,
      featuresWeight: row.features_weight,
    };
  }

  /**
   * Get eligible properties for matching
   */
  private async getEligibleProperties(preferences: LeadPreferences): Promise<Property[]> {
    // Build query with filters
    let queryText = `
      SELECT 
        property_id, mls_listing_id, address, city, state, postal_code,
        price, bedrooms, bathrooms, square_feet, lot_size,
        property_type, property_subtype, status,
        latitude, longitude
      FROM properties
      WHERE status = 'Active'
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Filter by budget (if specified)
    if (preferences.budgetMin || preferences.budgetMax) {
      if (preferences.budgetMin) {
        queryText += ` AND price >= $${paramIndex}`;
        params.push(preferences.budgetMin * 0.8); // Allow 20% under
        paramIndex++;
      }
      if (preferences.budgetMax) {
        queryText += ` AND price <= $${paramIndex}`;
        params.push(preferences.budgetMax * 1.2); // Allow 20% over
        paramIndex++;
      }
    }

    // Filter by location (if specified)
    if (preferences.preferredCities && preferences.preferredCities.length > 0) {
      queryText += ` AND LOWER(city) = ANY($${paramIndex}::text[])`;
      params.push(preferences.preferredCities.map(c => c.toLowerCase()));
      paramIndex++;
    }

    queryText += ` LIMIT 500`; // Limit for performance

    const result = await query(queryText, params);

    return result.rows.map(row => ({
      propertyId: row.property_id,
      mlsListingId: row.mls_listing_id,
      address: row.address,
      city: row.city,
      state: row.state,
      zipCode: row.postal_code,
      price: parseFloat(row.price),
      bedrooms: row.bedrooms,
      bathrooms: parseFloat(row.bathrooms),
      squareFeet: row.square_feet,
      lotSize: row.lot_size,
      propertyType: row.property_type,
      propertySubtype: row.property_subtype,
      status: row.status,
      latitude: row.latitude,
      longitude: row.longitude,
    }));
  }

  /**
   * Save match to database
   */
  private async saveMatch(match: PropertyMatch): Promise<void> {
    await query(
      `INSERT INTO lead_property_matches (
        lead_id, property_id, overall_score, budget_score, location_score,
        bedrooms_score, bathrooms_score, property_type_score, features_score,
        match_quality, price_difference, matching_features, missing_features, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (lead_id, property_id) 
      DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        budget_score = EXCLUDED.budget_score,
        location_score = EXCLUDED.location_score,
        bedrooms_score = EXCLUDED.bedrooms_score,
        bathrooms_score = EXCLUDED.bathrooms_score,
        property_type_score = EXCLUDED.property_type_score,
        features_score = EXCLUDED.features_score,
        match_quality = EXCLUDED.match_quality,
        price_difference = EXCLUDED.price_difference,
        matching_features = EXCLUDED.matching_features,
        missing_features = EXCLUDED.missing_features,
        updated_at = CURRENT_TIMESTAMP`,
      [
        match.leadId,
        match.propertyId,
        match.overallScore,
        match.budgetScore,
        match.locationScore,
        match.bedroomsScore,
        match.bathroomsScore,
        match.propertyTypeScore,
        match.featuresScore,
        match.matchQuality,
        match.priceDifference,
        match.matchingFeatures,
        match.missingFeatures,
        'pending',
      ]
    );
  }
}
