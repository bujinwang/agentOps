import { query } from '../config/database';

export interface PropertyMatch {
  matchId: number;
  leadId: number;
  propertyId: number;
  overallScore: number;
  budgetScore: number;
  locationScore: number;
  bedroomsScore: number;
  bathroomsScore: number;
  propertyTypeScore: number;
  featuresScore: number;
  matchQuality: string;
  distanceMiles: number | null;
  priceDifference: number | null;
  matchingFeatures: string[] | null;
  missingFeatures: string[] | null;
  status: string;
  agentRating: number | null;
  agentNotes: string | null;
  dismissedReason: string | null;
  leadInterested: boolean | null;
  leadFeedback: string | null;
  matchedAt: Date;
  viewedAt: Date | null;
  contactedAt: Date | null;
  dismissedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadPreference {
  preferenceId: number;
  leadId: number;
  budgetMin: number | null;
  budgetMax: number | null;
  preferredCities: string[] | null;
  preferredStates: string[] | null;
  preferredZipCodes: string[] | null;
  maxDistanceMiles: number | null;
  minBedrooms: number | null;
  maxBedrooms: number | null;
  minBathrooms: number | null;
  maxBathrooms: number | null;
  minSquareFeet: number | null;
  maxSquareFeet: number | null;
  preferredPropertyTypes: string[] | null;
  mustHaveFeatures: string[] | null;
  niceToHaveFeatures: string[] | null;
  dealBreakers: string[] | null;
  budgetWeight: number;
  locationWeight: number;
  bedroomsWeight: number;
  bathroomsWeight: number;
  propertyTypeWeight: number;
  featuresWeight: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchWithDetails extends PropertyMatch {
  leadName: string;
  leadEmail: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyPrice: number;
  propertyBedrooms: number;
  propertyBathrooms: number;
  propertyType: string;
}

export class MatchModel {
  /**
   * Find matches by lead ID
   */
  static async findByLeadId(
    leadId: number,
    options: {
      status?: string;
      minScore?: number;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<MatchWithDetails[]> {
    const { status, minScore, limit = 20, offset = 0 } = options;

    let queryText = `
      SELECT 
        m.*,
        l.first_name || ' ' || l.last_name as lead_name,
        l.email as lead_email,
        p.address as property_address,
        p.city as property_city,
        p.state as property_state,
        p.price as property_price,
        p.bedrooms as property_bedrooms,
        p.bathrooms as property_bathrooms,
        p.property_type
      FROM lead_property_matches m
      JOIN leads l ON m.lead_id = l.lead_id
      JOIN properties p ON m.property_id = p.property_id
      WHERE m.lead_id = $1
    `;

    const params: any[] = [leadId];
    let paramIndex = 2;

    if (status) {
      queryText += ` AND m.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (minScore) {
      queryText += ` AND m.overall_score >= $${paramIndex}`;
      params.push(minScore);
      paramIndex++;
    }

    queryText += ` ORDER BY m.overall_score DESC, m.matched_at DESC`;
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);
    return result.rows.map(this.mapRowToMatchWithDetails);
  }

  /**
   * Get match by ID
   */
  static async findById(matchId: number): Promise<MatchWithDetails | null> {
    const result = await query(
      `SELECT 
        m.*,
        l.first_name || ' ' || l.last_name as lead_name,
        l.email as lead_email,
        p.address as property_address,
        p.city as property_city,
        p.state as property_state,
        p.price as property_price,
        p.bedrooms as property_bedrooms,
        p.bathrooms as property_bathrooms,
        p.property_type
      FROM lead_property_matches m
      JOIN leads l ON m.lead_id = l.lead_id
      JOIN properties p ON m.property_id = p.property_id
      WHERE m.match_id = $1`,
      [matchId]
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToMatchWithDetails(result.rows[0]);
  }

  /**
   * Update match status
   */
  static async updateStatus(
    matchId: number,
    status: string,
    updates: {
      viewedAt?: Date;
      contactedAt?: Date;
      dismissedAt?: Date;
      dismissedReason?: string;
      agentNotes?: string;
    } = {}
  ): Promise<void> {
    const fields: string[] = ['status = $2', 'updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [matchId, status];
    let paramIndex = 3;

    if (updates.viewedAt) {
      fields.push(`viewed_at = $${paramIndex}`);
      params.push(updates.viewedAt);
      paramIndex++;
    }

    if (updates.contactedAt) {
      fields.push(`contacted_at = $${paramIndex}`);
      params.push(updates.contactedAt);
      paramIndex++;
    }

    if (updates.dismissedAt) {
      fields.push(`dismissed_at = $${paramIndex}`);
      params.push(updates.dismissedAt);
      paramIndex++;
    }

    if (updates.dismissedReason) {
      fields.push(`dismissed_reason = $${paramIndex}`);
      params.push(updates.dismissedReason);
      paramIndex++;
    }

    if (updates.agentNotes) {
      fields.push(`agent_notes = $${paramIndex}`);
      params.push(updates.agentNotes);
      paramIndex++;
    }

    await query(
      `UPDATE lead_property_matches SET ${fields.join(', ')} WHERE match_id = $1`,
      params
    );
  }

  /**
   * Rate a match
   */
  static async rateMatch(matchId: number, rating: number, notes?: string): Promise<void> {
    const params: any[] = [matchId, rating];
    let queryText = 'UPDATE lead_property_matches SET agent_rating = $2';

    if (notes) {
      queryText += ', agent_notes = $3';
      params.push(notes);
    }

    queryText += ', updated_at = CURRENT_TIMESTAMP WHERE match_id = $1';

    await query(queryText, params);
  }

  /**
   * Delete (dismiss) a match
   */
  static async dismiss(matchId: number, reason?: string): Promise<void> {
    await this.updateStatus(matchId, 'dismissed', {
      dismissedAt: new Date(),
      dismissedReason: reason,
    });
  }

  /**
   * Get match statistics
   */
  static async getStatistics(): Promise<{
    totalMatches: number;
    excellentMatches: number;
    goodMatches: number;
    fairMatches: number;
    viewedMatches: number;
    contactedMatches: number;
    convertedMatches: number;
    dismissedMatches: number;
    avgScore: number;
    avgRating: number;
  }> {
    const result = await query(`
      SELECT 
        COUNT(*) as total_matches,
        COUNT(*) FILTER (WHERE match_quality = 'Excellent') as excellent_matches,
        COUNT(*) FILTER (WHERE match_quality = 'Good') as good_matches,
        COUNT(*) FILTER (WHERE match_quality = 'Fair') as fair_matches,
        COUNT(*) FILTER (WHERE status = 'viewed') as viewed_matches,
        COUNT(*) FILTER (WHERE status = 'contacted') as contacted_matches,
        COUNT(*) FILTER (WHERE status = 'converted') as converted_matches,
        COUNT(*) FILTER (WHERE status = 'dismissed') as dismissed_matches,
        AVG(overall_score) as avg_score,
        AVG(agent_rating) as avg_rating
      FROM lead_property_matches
    `);

    const row = result.rows[0];
    return {
      totalMatches: parseInt(row.total_matches),
      excellentMatches: parseInt(row.excellent_matches),
      goodMatches: parseInt(row.good_matches),
      fairMatches: parseInt(row.fair_matches),
      viewedMatches: parseInt(row.viewed_matches),
      contactedMatches: parseInt(row.contacted_matches),
      convertedMatches: parseInt(row.converted_matches),
      dismissedMatches: parseInt(row.dismissed_matches),
      avgScore: parseFloat(row.avg_score) || 0,
      avgRating: parseFloat(row.avg_rating) || 0,
    };
  }

  /**
   * Count matches for a lead
   */
  static async countByLeadId(leadId: number, status?: string): Promise<number> {
    let queryText = 'SELECT COUNT(*) as count FROM lead_property_matches WHERE lead_id = $1';
    const params: any[] = [leadId];

    if (status) {
      queryText += ' AND status = $2';
      params.push(status);
    }

    const result = await query(queryText, params);
    return parseInt(result.rows[0].count);
  }

  /**
   * Map database row to MatchWithDetails
   */
  private static mapRowToMatchWithDetails(row: any): MatchWithDetails {
    return {
      matchId: row.match_id,
      leadId: row.lead_id,
      propertyId: row.property_id,
      overallScore: parseFloat(row.overall_score),
      budgetScore: parseFloat(row.budget_score),
      locationScore: parseFloat(row.location_score),
      bedroomsScore: parseFloat(row.bedrooms_score),
      bathroomsScore: parseFloat(row.bathrooms_score),
      propertyTypeScore: parseFloat(row.property_type_score),
      featuresScore: parseFloat(row.features_score),
      matchQuality: row.match_quality,
      distanceMiles: row.distance_miles ? parseFloat(row.distance_miles) : null,
      priceDifference: row.price_difference ? parseFloat(row.price_difference) : null,
      matchingFeatures: row.matching_features,
      missingFeatures: row.missing_features,
      status: row.status,
      agentRating: row.agent_rating,
      agentNotes: row.agent_notes,
      dismissedReason: row.dismissed_reason,
      leadInterested: row.lead_interested,
      leadFeedback: row.lead_feedback,
      matchedAt: row.matched_at,
      viewedAt: row.viewed_at,
      contactedAt: row.contacted_at,
      dismissedAt: row.dismissed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      leadName: row.lead_name,
      leadEmail: row.lead_email,
      propertyAddress: row.property_address,
      propertyCity: row.property_city,
      propertyState: row.property_state,
      propertyPrice: parseFloat(row.property_price),
      propertyBedrooms: row.property_bedrooms,
      propertyBathrooms: parseFloat(row.property_bathrooms),
      propertyType: row.property_type,
    };
  }
}

export class LeadPreferenceModel {
  /**
   * Get preferences for a lead
   */
  static async findByLeadId(leadId: number): Promise<LeadPreference | null> {
    const result = await query(
      'SELECT * FROM lead_preferences WHERE lead_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1',
      [leadId]
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToPreference(result.rows[0]);
  }

  /**
   * Create or update preferences
   */
  static async upsert(preferences: Partial<LeadPreference> & { leadId: number }): Promise<LeadPreference> {
    const existing = await this.findByLeadId(preferences.leadId);

    if (existing) {
      // Update existing
      const fields: string[] = [];
      const params: any[] = [preferences.leadId];
      let paramIndex = 2;

      const updateFields: Array<keyof LeadPreference> = [
        'budgetMin',
        'budgetMax',
        'preferredCities',
        'preferredStates',
        'preferredZipCodes',
        'maxDistanceMiles',
        'minBedrooms',
        'maxBedrooms',
        'minBathrooms',
        'maxBathrooms',
        'minSquareFeet',
        'maxSquareFeet',
        'preferredPropertyTypes',
        'mustHaveFeatures',
        'niceToHaveFeatures',
        'dealBreakers',
      ];

      for (const field of updateFields) {
        if (preferences[field] !== undefined) {
          fields.push(`${this.camelToSnake(field)} = $${paramIndex}`);
          params.push(preferences[field]);
          paramIndex++;
        }
      }

      if (fields.length > 0) {
        fields.push('updated_at = CURRENT_TIMESTAMP');
        await query(
          `UPDATE lead_preferences SET ${fields.join(', ')} WHERE lead_id = $1 AND is_active = true`,
          params
        );
      }

      return (await this.findByLeadId(preferences.leadId))!;
    } else {
      // Insert new
      const result = await query(
        `INSERT INTO lead_preferences (
          lead_id, budget_min, budget_max, preferred_cities, preferred_states,
          preferred_zip_codes, max_distance_miles, min_bedrooms, max_bedrooms,
          min_bathrooms, max_bathrooms, min_square_feet, max_square_feet,
          preferred_property_types, must_have_features, nice_to_have_features, deal_breakers
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
          preferences.leadId,
          preferences.budgetMin || null,
          preferences.budgetMax || null,
          preferences.preferredCities || null,
          preferences.preferredStates || null,
          preferences.preferredZipCodes || null,
          preferences.maxDistanceMiles || null,
          preferences.minBedrooms || null,
          preferences.maxBedrooms || null,
          preferences.minBathrooms || null,
          preferences.maxBathrooms || null,
          preferences.minSquareFeet || null,
          preferences.maxSquareFeet || null,
          preferences.preferredPropertyTypes || null,
          preferences.mustHaveFeatures || null,
          preferences.niceToHaveFeatures || null,
          preferences.dealBreakers || null,
        ]
      );

      return this.mapRowToPreference(result.rows[0]);
    }
  }

  /**
   * Map database row to LeadPreference
   */
  private static mapRowToPreference(row: any): LeadPreference {
    return {
      preferenceId: row.preference_id,
      leadId: row.lead_id,
      budgetMin: row.budget_min ? parseFloat(row.budget_min) : null,
      budgetMax: row.budget_max ? parseFloat(row.budget_max) : null,
      preferredCities: row.preferred_cities,
      preferredStates: row.preferred_states,
      preferredZipCodes: row.preferred_zip_codes,
      maxDistanceMiles: row.max_distance_miles,
      minBedrooms: row.min_bedrooms,
      maxBedrooms: row.max_bedrooms,
      minBathrooms: row.min_bathrooms ? parseFloat(row.min_bathrooms) : null,
      maxBathrooms: row.max_bathrooms ? parseFloat(row.max_bathrooms) : null,
      minSquareFeet: row.min_square_feet,
      maxSquareFeet: row.max_square_feet,
      preferredPropertyTypes: row.preferred_property_types,
      mustHaveFeatures: row.must_have_features,
      niceToHaveFeatures: row.nice_to_have_features,
      dealBreakers: row.deal_breakers,
      budgetWeight: parseFloat(row.budget_weight),
      locationWeight: parseFloat(row.location_weight),
      bedroomsWeight: parseFloat(row.bedrooms_weight),
      bathroomsWeight: parseFloat(row.bathrooms_weight),
      propertyTypeWeight: parseFloat(row.property_type_weight),
      featuresWeight: parseFloat(row.features_weight),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Convert camelCase to snake_case
   */
  private static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
