import {
  LeadScore,
  LeadData,
  ScoringResult,
  LeadScoringConfig,
  ScoringWeights,
  LeadGrade,
  ScoreBreakdown,
  ScoringFactor
} from '../types/leadScoring';
import leadScoreApiService from './leadScoreApiService';
import { conversionApiService } from './conversionApiService';
import { ConversionEvent, ConversionTimeline } from '../types/conversion';

class LeadScoringService {
  private config: LeadScoringConfig;

  constructor(config?: Partial<LeadScoringConfig>) {
    this.config = {
      weights: {
        budget: 0.25,
        timeline: 0.20,
        propertyType: 0.15,
        location: 0.15,
        engagement: 0.10,
        qualification: 0.10,
        marketFit: 0.05,
      },
      thresholds: {
        A: 85,
        B: 70,
        C: 55,
        D: 40,
      },
      factors: {
        budget: {
          high: 100,
          medium: 75,
          low: 50,
        },
        timeline: {
          urgent: 100,
          soon: 80,
          flexible: 60,
        },
        propertyType: {
          'single-family': 90,
          'condo': 85,
          'townhouse': 80,
          'multi-family': 75,
          'commercial': 70,
          'land': 65,
          'other': 60,
        },
        location: {
          preferred: 90,
          acceptable: 70,
          challenging: 50,
        },
        engagement: {
          high: 90,
          medium: 70,
          low: 40,
        },
        qualification: {
          preQualified: 95,
          qualified: 80,
          needsQualification: 60,
        },
      },
      ...config,
    };
  }

  /**
   * Calculate comprehensive lead score
   */
  async calculateScore(leadData: LeadData): Promise<ScoringResult> {
    const breakdown = this.calculateScoreBreakdown(leadData);
    const totalScore = this.calculateTotalScore(breakdown);
    const grade = this.calculateGrade(totalScore);
    const confidence = this.calculateConfidence(leadData);
    const factors = this.analyzeFactors(leadData, breakdown);
    const insights = this.generateInsights(leadData, breakdown, grade);
    const actions = this.generateActions(leadData, grade);
    const riskFactors = this.identifyRiskFactors(leadData, breakdown);

    const score: LeadScore = {
      id: `score_${leadData.id}_${Date.now()}`,
      leadId: leadData.id,
      totalScore,
      scoreBreakdown: breakdown,
      grade,
      confidence,
      factors,
      recommendations: actions,
      calculatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    return {
      score,
      insights,
      actions,
      riskFactors,
    };
  }

  /**
   * Calculate score breakdown by category
   */
  private calculateScoreBreakdown(leadData: LeadData): ScoreBreakdown {
    return {
      budget: this.scoreBudget(leadData.budget, leadData.marketData?.averagePrice),
      timeline: this.scoreTimeline(leadData.timeline),
      propertyType: this.scorePropertyType(leadData.propertyType),
      location: this.scoreLocation(leadData.location),
      engagement: this.scoreEngagement(leadData.engagementScore, leadData.inquiryCount, leadData.lastActivity),
      qualification: this.scoreQualification(leadData.qualificationStatus),
      marketFit: this.scoreMarketFit(leadData, leadData.marketData),
    };
  }

  /**
   * Calculate total weighted score
   */
  private calculateTotalScore(breakdown: ScoreBreakdown): number {
    const weights = this.config.weights;
    return (
      breakdown.budget * weights.budget +
      breakdown.timeline * weights.timeline +
      breakdown.propertyType * weights.propertyType +
      breakdown.location * weights.location +
      breakdown.engagement * weights.engagement +
      breakdown.qualification * weights.qualification +
      breakdown.marketFit * weights.marketFit
    );
  }

  /**
   * Calculate lead grade based on total score
   */
  private calculateGrade(totalScore: number): LeadGrade {
    const thresholds = this.config.thresholds;

    if (totalScore >= thresholds.A) return totalScore >= 95 ? 'A+' : 'A';
    if (totalScore >= thresholds.B) return totalScore >= 77.5 ? 'B+' : 'B';
    if (totalScore >= thresholds.C) return totalScore >= 62.5 ? 'C+' : 'C';
    if (totalScore >= thresholds.D) return 'D';
    return 'F';
  }

  /**
   * Calculate confidence in the score
   */
  private calculateConfidence(leadData: LeadData): number {
    let confidence = 100;
    const missingFields = [];

    if (!leadData.budget) { confidence -= 15; missingFields.push('budget'); }
    if (!leadData.timeline) { confidence -= 10; missingFields.push('timeline'); }
    if (!leadData.propertyType) { confidence -= 10; missingFields.push('property type'); }
    if (!leadData.location) { confidence -= 10; missingFields.push('location'); }
    if (!leadData.qualificationStatus) { confidence -= 15; missingFields.push('qualification'); }
    if (!leadData.engagementScore) { confidence -= 10; missingFields.push('engagement'); }

    // Reduce confidence if data is stale
    if (leadData.lastActivity) {
      const daysSinceActivity = (Date.now() - new Date(leadData.lastActivity).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActivity > 30) confidence -= Math.min(20, daysSinceActivity / 30 * 10);
    }

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Score individual factors
   */
  private scoreBudget(budget?: number, averagePrice?: number): number {
    if (!budget || !averagePrice) return 50;

    const ratio = budget / averagePrice;
    if (ratio >= 1.2) return this.config.factors.budget.high;      // High budget
    if (ratio >= 0.8) return this.config.factors.budget.medium;    // Medium budget
    return this.config.factors.budget.low;                        // Low budget
  }

  private scoreTimeline(timeline?: string): number {
    if (!timeline) return 60;

    const urgentKeywords = ['asap', 'immediately', 'urgent', 'now', 'today', 'this week'];
    const soonKeywords = ['this month', 'next month', 'soon', '1-2 months', 'within 2 months'];

    const lowerTimeline = timeline.toLowerCase();

    if (urgentKeywords.some(keyword => lowerTimeline.includes(keyword))) {
      return this.config.factors.timeline.urgent;
    }
    if (soonKeywords.some(keyword => lowerTimeline.includes(keyword))) {
      return this.config.factors.timeline.soon;
    }
    return this.config.factors.timeline.flexible;
  }

  private scorePropertyType(propertyType?: string): number {
    if (!propertyType) return 60;

    const normalizedType = propertyType.toLowerCase().replace(/[^a-z]/g, '');
    return this.config.factors.propertyType[normalizedType] || this.config.factors.propertyType.other;
  }

  private scoreLocation(location?: string): number {
    if (!location) return 70;

    // This would typically integrate with a location service
    // For now, we'll use a simple heuristic
    const preferredAreas = ['downtown', 'uptown', 'suburb', 'family-friendly'];
    const challengingAreas = ['industrial', 'high-crime', 'flood-zone'];

    const lowerLocation = location.toLowerCase();

    if (preferredAreas.some(area => lowerLocation.includes(area))) {
      return this.config.factors.location.preferred;
    }
    if (challengingAreas.some(area => lowerLocation.includes(area))) {
      return this.config.factors.location.challenging;
    }
    return this.config.factors.location.acceptable;
  }

  private scoreEngagement(engagementScore?: number, inquiryCount?: number, lastActivity?: string): number {
    let score = 50;

    // Engagement score from CRM
    if (engagementScore) {
      score = engagementScore;
    }

    // Boost based on inquiry count
    if (inquiryCount) {
      if (inquiryCount >= 5) score = Math.max(score, 90);
      else if (inquiryCount >= 3) score = Math.max(score, 75);
      else if (inquiryCount >= 1) score = Math.max(score, 60);
    }

    // Reduce score for stale leads
    if (lastActivity) {
      const daysSinceActivity = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActivity > 30) score *= 0.7;
      else if (daysSinceActivity > 14) score *= 0.85;
    }

    return Math.max(0, Math.min(100, score));
  }

  private scoreQualification(status?: string): number {
    if (!status) return 60;

    switch (status) {
      case 'preQualified':
        return this.config.factors.qualification.preQualified;
      case 'qualified':
        return this.config.factors.qualification.qualified;
      case 'needsQualification':
        return this.config.factors.qualification.needsQualification;
      default:
        return 60;
    }
  }

  private scoreMarketFit(leadData: LeadData, marketData?: any): number {
    if (!marketData) return 70;

    let score = 70;

    // Market trend adjustment
    if (marketData.marketTrend === 'hot') score += 10;
    else if (marketData.marketTrend === 'cool') score -= 10;

    // Competition adjustment
    if (marketData.competition) {
      if (marketData.competition < 5) score += 15;  // Low competition
      else if (marketData.competition > 15) score -= 15;  // High competition
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Analyze scoring factors for detailed breakdown
   */
  private analyzeFactors(leadData: LeadData, breakdown: ScoreBreakdown): ScoringFactor[] {
    const factors: ScoringFactor[] = [];

    factors.push({
      name: 'Budget Strength',
      value: breakdown.budget,
      weight: this.config.weights.budget,
      impact: breakdown.budget >= 75 ? 'positive' : breakdown.budget >= 50 ? 'neutral' : 'negative',
      description: `Budget alignment with market prices (${leadData.budget || 'unknown'})`
    });

    factors.push({
      name: 'Timeline Urgency',
      value: breakdown.timeline,
      weight: this.config.weights.timeline,
      impact: breakdown.timeline >= 80 ? 'positive' : breakdown.timeline >= 60 ? 'neutral' : 'negative',
      description: `Purchase timeline: ${leadData.timeline || 'unknown'}`
    });

    factors.push({
      name: 'Property Type Match',
      value: breakdown.propertyType,
      weight: this.config.weights.propertyType,
      impact: breakdown.propertyType >= 80 ? 'positive' : 'neutral',
      description: `Property type preference: ${leadData.propertyType || 'unknown'}`
    });

    factors.push({
      name: 'Location Suitability',
      value: breakdown.location,
      weight: this.config.weights.location,
      impact: breakdown.location >= 80 ? 'positive' : breakdown.location >= 60 ? 'neutral' : 'negative',
      description: `Location preference: ${leadData.location || 'unknown'}`
    });

    factors.push({
      name: 'Engagement Level',
      value: breakdown.engagement,
      weight: this.config.weights.engagement,
      impact: breakdown.engagement >= 75 ? 'positive' : breakdown.engagement >= 50 ? 'neutral' : 'negative',
      description: `Lead engagement and activity level`
    });

    factors.push({
      name: 'Qualification Status',
      value: breakdown.qualification,
      weight: this.config.weights.qualification,
      impact: breakdown.qualification >= 80 ? 'positive' : breakdown.qualification >= 60 ? 'neutral' : 'negative',
      description: `Pre-qualification and financial readiness`
    });

    factors.push({
      name: 'Market Fit',
      value: breakdown.marketFit,
      weight: this.config.weights.marketFit,
      impact: breakdown.marketFit >= 75 ? 'positive' : 'neutral',
      description: `Alignment with current market conditions`
    });

    return factors;
  }

  /**
   * Generate insights based on scoring
   */
  private generateInsights(leadData: LeadData, breakdown: ScoreBreakdown, grade: LeadGrade): string[] {
    const insights: string[] = [];

    // Grade-based insights
    if (grade === 'A+' || grade === 'A') {
      insights.push('High-quality lead with strong conversion potential');
    } else if (grade === 'B+' || grade === 'B') {
      insights.push('Good lead with solid fundamentals - focus on relationship building');
    } else if (grade === 'C+' || grade === 'C') {
      insights.push('Moderate lead requiring additional qualification');
    } else {
      insights.push('Low-priority lead - consider deprioritizing or nurturing');
    }

    // Factor-specific insights
    if (breakdown.budget >= 90) {
      insights.push('Strong budget position - excellent buying power');
    } else if (breakdown.budget < 60) {
      insights.push('Budget constraints may limit options');
    }

    if (breakdown.timeline >= 90) {
      insights.push('Urgent timeline - prioritize immediate response');
    }

    if (breakdown.engagement >= 80) {
      insights.push('Highly engaged lead - excellent response to marketing');
    } else if (breakdown.engagement < 50) {
      insights.push('Low engagement - may need re-engagement campaign');
    }

    return insights;
  }

  /**
   * Generate recommended actions
   */
  private generateActions(leadData: LeadData, grade: LeadGrade): string[] {
    const actions: string[] = [];

    if (grade === 'A+' || grade === 'A') {
      actions.push('Prioritize for immediate follow-up');
      actions.push('Schedule property showing within 24 hours');
      actions.push('Prepare personalized property recommendations');
    } else if (grade === 'B+' || grade === 'B') {
      actions.push('Follow up within 48 hours');
      actions.push('Send property market update');
      actions.push('Schedule discovery call');
    } else {
      actions.push('Add to nurture campaign');
      actions.push('Send educational content');
      actions.push('Monitor for engagement improvements');
    }

    // Specific actions based on factors
    if (leadData.qualificationStatus === 'needsQualification') {
      actions.push('Conduct qualification assessment');
    }

    if (leadData.engagementScore && leadData.engagementScore < 50) {
      actions.push('Implement re-engagement strategy');
    }

    return actions;
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(leadData: LeadData, breakdown: ScoreBreakdown): string[] {
    const risks: string[] = [];

    if (breakdown.budget < 60) {
      risks.push('Budget may be insufficient for target market');
    }

    if (breakdown.qualification < 70) {
      risks.push('Lead requires additional qualification');
    }

    if (breakdown.engagement < 50) {
      risks.push('Low engagement may indicate lack of serious intent');
    }

    if (leadData.lastActivity) {
      const daysSinceActivity = (Date.now() - new Date(leadData.lastActivity).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActivity > 30) {
        risks.push(`Lead inactive for ${Math.round(daysSinceActivity)} days`);
      }
    }

    return risks;
  }

  /**
   * Calculate and persist score to backend
   */
  async calculateAndPersistScore(leadData: LeadData): Promise<ScoringResult> {
    try {
      // Calculate score locally first
      const localResult = await this.calculateScore(leadData);

      // Try to sync with backend
      try {
        const syncedData = await leadScoreApiService.syncLeadScore(leadData.id, localResult.score);
        if (syncedData) {
          // Update local result with backend data if available
          localResult.score.calculatedAt = syncedData.score_last_calculated || localResult.score.calculatedAt;
        }
      } catch (syncError) {
        console.warn('Backend sync failed, using local calculation:', syncError);
        // Continue with local result if backend sync fails
      }

      return localResult;
    } catch (error) {
      console.error('Error calculating and persisting score:', error);
      throw error;
    }
  }

  /**
   * Get persisted score from backend
   */
  async getPersistedScore(leadId: number): Promise<LeadScore | null> {
    try {
      const backendData = await leadScoreApiService.getLeadScore(leadId);

      if (backendData && backendData.score !== null) {
        // Convert backend data to LeadScore format
        const score: LeadScore = {
          id: `backend_score_${leadId}_${Date.now()}`,
          leadId,
          totalScore: backendData.score,
          scoreBreakdown: backendData.score_breakdown || {},
          grade: this.mapCategoryToGrade(backendData.score_category),
          confidence: 90, // Assume high confidence for persisted scores
          factors: [], // Backend doesn't store detailed factors
          recommendations: [], // Backend doesn't store recommendations
          calculatedAt: backendData.score_last_calculated || backendData.updated_at,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };

        return score;
      }

      return null;
    } catch (error) {
      console.error('Error getting persisted score:', error);
      return null;
    }
  }

  /**
   * Update score with manual override
   */
  async updateScoreOverride(
    leadId: number,
    score: number,
    reason: string,
    userId?: number
  ): Promise<boolean> {
    try {
      const result = await leadScoreApiService.updateLeadScore(leadId, score, reason, userId);
      return result !== null;
    } catch (error) {
      console.error('Error updating score override:', error);
      return false;
    }
  }

  /**
   * Get score history from backend
   */
  async getScoreHistory(leadId: number): Promise<any[]> {
    try {
      const result = await leadScoreApiService.getLeadScoreHistory(leadId);
      return result.history || [];
    } catch (error) {
      console.error('Error getting score history:', error);
      return [];
    }
  }

  /**
   * Calculate score using backend algorithm
   */
  async calculateScoreWithBackend(leadData: LeadData): Promise<ScoringResult> {
    try {
      return await leadScoreApiService.calculateLeadScore(leadData);
    } catch (error) {
      console.error('Error calculating score with backend:', error);
      // Fallback to local calculation
      return await this.calculateScore(leadData);
    }
  }

  /**
   * Map category string to LeadGrade
   */
  private mapCategoryToGrade(category: string | null): LeadGrade {
    switch (category?.toLowerCase()) {
      case 'high':
        return 'A';
      case 'medium':
        return 'B';
      case 'low':
        return 'C';
      default:
        return 'F';
    }
  }

  /**
   * Get conversion data for a lead
   */
  async getConversionData(leadId: number): Promise<{
    timeline: ConversionTimeline | null;
    conversionProbability: number;
    currentStage: string;
    daysInFunnel: number;
  }> {
    try {
      const timelineResponse = await conversionApiService.getConversionTimeline(leadId);

      if (timelineResponse.success && timelineResponse.data) {
        const timeline = timelineResponse.data;
        const currentStage = timeline.lastEvent?.eventType || 'lead_created';
        const daysInFunnel = timeline.lastEvent
          ? Math.floor((Date.now() - new Date(timeline.lastEvent.eventTimestamp).getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        // Calculate conversion probability based on historical data and current progress
        const conversionProbability = await this.calculateConversionProbability(
          timeline,
          currentStage,
          daysInFunnel
        );

        return {
          timeline,
          conversionProbability,
          currentStage,
          daysInFunnel
        };
      }

      return {
        timeline: null,
        conversionProbability: 0.1, // Base probability for new leads
        currentStage: 'lead_created',
        daysInFunnel: 0
      };
    } catch (error) {
      console.error('Error getting conversion data:', error);
      return {
        timeline: null,
        conversionProbability: 0.1,
        currentStage: 'lead_created',
        daysInFunnel: 0
      };
    }
  }

  /**
   * Calculate conversion probability based on historical data
   */
  private async calculateConversionProbability(
    timeline: ConversionTimeline,
    currentStage: string,
    daysInFunnel: number
  ): Promise<number> {
    let probability = 0.1; // Base probability

    // Stage-based probability multipliers
    const stageMultipliers: Record<string, number> = {
      'lead_created': 0.1,
      'contact_made': 0.15,
      'qualified': 0.25,
      'showing_scheduled': 0.4,
      'showing_completed': 0.6,
      'offer_submitted': 0.75,
      'offer_accepted': 0.9,
      'sale_closed': 1.0
    };

    probability = stageMultipliers[currentStage] || 0.1;

    // Adjust based on engagement (number of events)
    const eventCount = timeline.events.length;
    if (eventCount > 5) probability *= 1.2; // Highly engaged
    else if (eventCount > 2) probability *= 1.1; // Moderately engaged

    // Adjust based on time in funnel (decay for stale leads)
    if (daysInFunnel > 90) probability *= 0.7; // Significantly decayed
    else if (daysInFunnel > 30) probability *= 0.85; // Moderately decayed

    // Adjust based on recent activity
    const lastEvent = timeline.lastEvent;
    if (lastEvent) {
      const daysSinceLastEvent = Math.floor(
        (Date.now() - new Date(lastEvent.eventTimestamp).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastEvent > 30) probability *= 0.8;
      else if (daysSinceLastEvent > 7) probability *= 0.9;
    }

    return Math.max(0, Math.min(1, probability));
  }

  /**
   * Enhanced calculateScore with conversion data integration
   */
  async calculateScoreWithConversion(leadData: LeadData): Promise<ScoringResult> {
    // Get base scoring result
    const baseResult = await this.calculateScore(leadData);

    // Get conversion data
    const conversionData = await this.getConversionData(leadData.id);

    // Enhance scoring with conversion factors
    const enhancedBreakdown = {
      ...baseResult.score.scoreBreakdown,
      conversionProgress: this.scoreConversionProgress(conversionData),
      conversionProbability: conversionData.conversionProbability * 100
    };

    // Recalculate total score with conversion factors
    const conversionWeight = 0.15; // 15% weight for conversion factors
    const conversionScore = (enhancedBreakdown.conversionProgress + enhancedBreakdown.conversionProbability) / 2;
    const enhancedTotalScore = baseResult.score.totalScore * (1 - conversionWeight) + conversionScore * conversionWeight;

    // Update the score with enhanced data
    const enhancedScore: LeadScore = {
      ...baseResult.score,
      totalScore: enhancedTotalScore,
      scoreBreakdown: enhancedBreakdown,
      grade: this.calculateGrade(enhancedTotalScore)
    };

    // Add conversion-specific insights
    const conversionInsights = this.generateConversionInsights(conversionData);
    const enhancedInsights = [...baseResult.insights, ...conversionInsights];

    // Add conversion-specific actions
    const conversionActions = this.generateConversionActions(conversionData);
    const enhancedActions = [...baseResult.actions, ...conversionActions];

    return {
      score: enhancedScore,
      insights: enhancedInsights,
      actions: enhancedActions,
      riskFactors: baseResult.riskFactors
    };
  }

  /**
   * Score conversion progress
   */
  private scoreConversionProgress(conversionData: {
    timeline: ConversionTimeline | null;
    conversionProbability: number;
    currentStage: string;
    daysInFunnel: number;
  }): number {
    const stageScores: Record<string, number> = {
      'lead_created': 10,
      'contact_made': 20,
      'qualified': 35,
      'showing_scheduled': 50,
      'showing_completed': 70,
      'offer_submitted': 85,
      'offer_accepted': 95,
      'sale_closed': 100
    };

    let score = stageScores[conversionData.currentStage] || 10;

    // Boost score based on engagement
    if (conversionData.timeline && conversionData.timeline.events.length > 3) {
      score += 10;
    }

    // Reduce score for slow progress
    if (conversionData.daysInFunnel > 60) {
      score *= 0.9;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate conversion-specific insights
   */
  private generateConversionInsights(conversionData: {
    timeline: ConversionTimeline | null;
    conversionProbability: number;
    currentStage: string;
    daysInFunnel: number;
  }): string[] {
    const insights: string[] = [];

    if (conversionData.conversionProbability > 0.7) {
      insights.push('High conversion probability - prioritize this lead');
    } else if (conversionData.conversionProbability < 0.3) {
      insights.push('Low conversion probability - consider nurturing strategies');
    }

    if (conversionData.daysInFunnel > 30) {
      insights.push(`Lead has been in funnel for ${conversionData.daysInFunnel} days - may need re-engagement`);
    }

    if (conversionData.timeline && conversionData.timeline.events.length > 5) {
      insights.push('Highly engaged lead with multiple touchpoints');
    }

    const advancedStages = ['showing_completed', 'offer_submitted', 'offer_accepted'];
    if (advancedStages.includes(conversionData.currentStage)) {
      insights.push(`Lead is in advanced stage: ${conversionData.currentStage.replace('_', ' ')}`);
    }

    return insights;
  }

  /**
   * Generate conversion-specific actions
   */
  private generateConversionActions(conversionData: {
    timeline: ConversionTimeline | null;
    conversionProbability: number;
    currentStage: string;
    daysInFunnel: number;
  }): string[] {
    const actions: string[] = [];

    if (conversionData.conversionProbability > 0.8) {
      actions.push('Fast-track this high-probability lead');
      actions.push('Schedule immediate follow-up');
    }

    if (conversionData.daysInFunnel > 14 && conversionData.currentStage === 'contact_made') {
      actions.push('Send follow-up email or call to move lead forward');
    }

    if (conversionData.currentStage === 'qualified' && conversionData.daysInFunnel < 7) {
      actions.push('Schedule property showing within 48 hours');
    }

    if (conversionData.currentStage === 'showing_completed') {
      actions.push('Follow up on showing feedback and prepare offer');
    }

    if (conversionData.conversionProbability < 0.4) {
      actions.push('Implement lead nurturing campaign');
      actions.push('Send educational content about buying process');
    }

    return actions;
  }

  /**
   * Update scoring configuration
   */
  updateConfig(newConfig: Partial<LeadScoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): LeadScoringConfig {
    return { ...this.config };
  }
}

// Export singleton instance
const leadScoringService = new LeadScoringService();
export default leadScoringService;