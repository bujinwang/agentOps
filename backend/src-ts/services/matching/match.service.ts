/**
 * Match Service
 * 
 * High-level service for lead-property matching operations
 */

import { MatchingEngineService } from './matching-engine.service';
import { MatchModel, LeadPreferenceModel } from '../../models/match.model';

export class MatchService {
  private engine: MatchingEngineService;

  constructor() {
    this.engine = new MatchingEngineService();
  }

  /**
   * Find matches for a specific lead
   */
  async findMatchesForLead(
    leadId: number,
    options: { limit?: number; minScore?: number } = {}
  ) {
    console.log(`🔍 Finding matches for lead ${leadId}...`);

    // Run matching engine
    const matches = await this.engine.findMatchesForLead(leadId, options);

    console.log(`✅ Found ${matches.length} matches for lead ${leadId}`);

    return {
      leadId,
      matches,
      totalMatches: matches.length,
      excellentMatches: matches.filter(m => m.matchQuality === 'Excellent').length,
      goodMatches: matches.filter(m => m.matchQuality === 'Good').length,
      fairMatches: matches.filter(m => m.matchQuality === 'Fair').length,
    };
  }

  /**
   * Get existing matches for a lead
   */
  async getLeadMatches(
    leadId: number,
    options: { status?: string; minScore?: number; page?: number; limit?: number } = {}
  ) {
    const { page = 1, limit = 20, status, minScore } = options;
    const offset = (page - 1) * limit;

    const matches = await MatchModel.findByLeadId(leadId, {
      status,
      minScore,
      limit,
      offset,
    });

    const total = await MatchModel.countByLeadId(leadId, status);

    return {
      matches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get match details by ID
   */
  async getMatchById(matchId: number) {
    const match = await MatchModel.findById(matchId);

    if (!match) {
      throw new Error('Match not found');
    }

    // Mark as viewed if not already
    if (!match.viewedAt && match.status === 'pending') {
      await MatchModel.updateStatus(matchId, 'viewed', {
        viewedAt: new Date(),
      });
      match.status = 'viewed';
      match.viewedAt = new Date();
    }

    return match;
  }

  /**
   * Batch match all active leads
   */
  async batchMatchAllLeads(options: { minScore?: number } = {}) {
    console.log('🔄 Starting batch matching for all active leads...');

    const stats = await this.engine.batchMatchAllLeads(options);

    console.log('✅ Batch matching completed:', stats);

    return stats;
  }

  /**
   * Rate a match
   */
  async rateMatch(matchId: number, rating: number, notes?: string) {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    await MatchModel.rateMatch(matchId, rating, notes);

    return await MatchModel.findById(matchId);
  }

  /**
   * Dismiss a match
   */
  async dismissMatch(matchId: number, reason?: string) {
    await MatchModel.dismiss(matchId, reason);

    return { success: true, message: 'Match dismissed' };
  }

  /**
   * Update match status
   */
  async updateMatchStatus(
    matchId: number,
    status: 'viewed' | 'interested' | 'contacted' | 'scheduled' | 'converted',
    notes?: string
  ) {
    const updates: any = {};

    if (status === 'viewed') {
      updates.viewedAt = new Date();
    } else if (status === 'contacted') {
      updates.contactedAt = new Date();
    }

    if (notes) {
      updates.agentNotes = notes;
    }

    await MatchModel.updateStatus(matchId, status, updates);

    return await MatchModel.findById(matchId);
  }

  /**
   * Get match statistics
   */
  async getStatistics() {
    return await MatchModel.getStatistics();
  }

  /**
   * Get lead preferences
   */
  async getLeadPreferences(leadId: number) {
    const preferences = await LeadPreferenceModel.findByLeadId(leadId);

    if (!preferences) {
      throw new Error('No preferences found for this lead');
    }

    return preferences;
  }

  /**
   * Update lead preferences
   */
  async updateLeadPreferences(
    leadId: number,
    preferences: {
      budgetMin?: number;
      budgetMax?: number;
      preferredCities?: string[];
      preferredStates?: string[];
      minBedrooms?: number;
      maxBedrooms?: number;
      minBathrooms?: number;
      maxBathrooms?: number;
      preferredPropertyTypes?: string[];
      mustHaveFeatures?: string[];
      niceToHaveFeatures?: string[];
      dealBreakers?: string[];
    }
  ) {
    const updated = await LeadPreferenceModel.upsert({
      leadId,
      ...preferences,
    });

    return updated;
  }
}
