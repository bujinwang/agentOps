import { Injectable } from '../types/di';
import { LeadProfile, LeadFeatures, LeadInteraction, BehavioralFeatures, TemporalFeatures } from '../types/ml';

@Injectable()
export class FeatureEngineeringService {
  private static instance: FeatureEngineeringService;

  private constructor() {}

  public static getInstance(): FeatureEngineeringService {
    if (!FeatureEngineeringService.instance) {
      FeatureEngineeringService.instance = new FeatureEngineeringService();
    }
    return FeatureEngineeringService.instance;
  }

  /**
   * Extract features from lead profile
   */
  public async extractLeadFeatures(lead: LeadProfile): Promise<LeadFeatures> {
    const features: LeadFeatures = {
      // Demographic features
      leadScore: lead.leadScore,
      engagementScore: this.calculateEngagementScore(lead),

      // Property matching features
      propertyMatch: await this.calculatePropertyMatch(lead),
      budgetFit: this.calculateBudgetFit(lead),
      timelineFit: this.calculateTimelineFit(lead),
      locationPreference: this.calculateLocationPreference(lead),

      // Behavioral features
      responseRate: 0, // Will be calculated from interactions
      contactFrequency: 0, // Will be calculated from interactions
      sessionDuration: 0, // Will be calculated from interactions
      pageViews: 0, // Will be calculated from interactions
      emailOpens: 0, // Will be calculated from interactions
      formSubmissions: 0, // Will be calculated from interactions

      // Communication features
      callDuration: 0, // Will be calculated from interactions
      meetingCount: 0, // Will be calculated from interactions

      // Temporal features
      daysSinceFirstContact: this.calculateDaysSinceFirstContact(lead),
      daysSinceLastActivity: this.calculateDaysSinceLastActivity(lead),
      totalInteractions: lead.totalInteractions,
      conversionEvents: lead.conversionEvents,

      // Source quality features
      sourceQuality: this.calculateSourceQuality(lead),
      behavioralScore: this.calculateBehavioralScore(lead),
    };

    return features;
  }

  /**
   * Extract behavioral features from lead interactions
   */
  public async extractBehavioralFeatures(interactions: LeadInteraction[]): Promise<BehavioralFeatures> {
    if (interactions.length === 0) {
      return this.getDefaultBehavioralFeatures();
    }

    // Calculate time-based metrics
    const now = new Date();
    const last30Days = interactions.filter(i =>
      (now.getTime() - new Date(i.timestamp).getTime()) < 30 * 24 * 60 * 60 * 1000
    );
    const last7Days = interactions.filter(i =>
      (now.getTime() - new Date(i.timestamp).getTime()) < 7 * 24 * 60 * 60 * 1000
    );

    // Email interactions
    const emailInteractions = interactions.filter(i => i.type === 'email');
    const emailOpens = emailInteractions.filter(i => i.action === 'opened').length;
    const emailClicks = emailInteractions.filter(i => i.action === 'clicked').length;

    // Website interactions
    const websiteInteractions = interactions.filter(i => i.type === 'website');
    const pageViews = websiteInteractions.filter(i => i.action === 'page_view').length;
    const formSubmissions = websiteInteractions.filter(i => i.action === 'form_submit').length;

    // Phone interactions
    const phoneInteractions = interactions.filter(i => i.type === 'phone');
    const totalCallDuration = phoneInteractions.reduce((sum, i) => sum + (i.duration || 0), 0);

    // Meeting interactions
    const meetingCount = interactions.filter(i => i.type === 'meeting').length;

    // Calculate rates and frequencies
    const responseRate = emailInteractions.length > 0 ? emailOpens / emailInteractions.length : 0;
    const clickRate = emailOpens > 0 ? emailClicks / emailOpens : 0;
    const conversionRate = interactions.length > 0 ? formSubmissions / interactions.length : 0;

    // Calculate engagement velocity (interactions per day over last 30 days)
    const engagementVelocity = last30Days.length / 30;

    // Calculate recency score (days since last interaction)
    const lastInteraction = interactions
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    const daysSinceLastInteraction = lastInteraction
      ? (now.getTime() - new Date(lastInteraction.timestamp).getTime()) / (24 * 60 * 60 * 1000)
      : 999;

    // Calculate channel preferences
    const channelPreferences = this.calculateChannelPreferences(interactions);

    return {
      responseRate,
      clickRate,
      conversionRate,
      engagementVelocity,
      recencyScore: Math.max(0, 1 - (daysSinceLastInteraction / 30)), // Decay over 30 days
      emailOpens,
      pageViews,
      formSubmissions,
      callDuration: totalCallDuration,
      meetingCount,
      channelPreferences,
      interactionPatterns: this.analyzeInteractionPatterns(interactions),
      engagementTrends: this.calculateEngagementTrends(interactions),
    };
  }

  /**
   * Extract temporal features
   */
  public async extractTemporalFeatures(lead: LeadProfile, interactions: LeadInteraction[]): Promise<TemporalFeatures> {
    const now = new Date();
    const createdDate = new Date(lead.createdAt);
    const lastActivityDate = new Date(lead.lastActivity);

    // Basic temporal features
    const daysSinceCreation = (now.getTime() - createdDate.getTime()) / (24 * 60 * 60 * 1000);
    const daysSinceLastActivity = (now.getTime() - lastActivityDate.getTime()) / (24 * 60 * 60 * 1000);

    // Interaction cadence
    const interactionCadence = this.calculateInteractionCadence(interactions);

    // Time-based patterns
    const timePatterns = this.analyzeTimePatterns(interactions);

    // Seasonal patterns
    const seasonalPatterns = this.analyzeSeasonalPatterns(interactions);

    // Day of week patterns
    const dayOfWeekPatterns = this.analyzeDayOfWeekPatterns(interactions);

    // Hour of day patterns
    const hourOfDayPatterns = this.analyzeHourOfDayPatterns(interactions);

    return {
      daysSinceCreation,
      daysSinceLastActivity,
      interactionCadence,
      timePatterns,
      seasonalPatterns,
      dayOfWeekPatterns,
      hourOfDayPatterns,
      lifecycleStage: this.determineLifecycleStage(daysSinceCreation, interactions.length),
      engagementMaturity: this.calculateEngagementMaturity(interactions),
    };
  }

  /**
   * Create complete feature vector for ML model
   */
  public async createFeatureVector(lead: LeadProfile, interactions: LeadInteraction[]): Promise<number[]> {
    const leadFeatures = await this.extractLeadFeatures(lead);
    const behavioralFeatures = await this.extractBehavioralFeatures(interactions);
    const temporalFeatures = await this.extractTemporalFeatures(lead, interactions);

    // Combine all features into a single vector
    const featureVector = [
      // Lead features (20 features)
      leadFeatures.leadScore,
      leadFeatures.engagementScore,
      leadFeatures.propertyMatch,
      leadFeatures.budgetFit,
      leadFeatures.timelineFit,
      leadFeatures.locationPreference,
      leadFeatures.responseRate,
      leadFeatures.contactFrequency,
      leadFeatures.sessionDuration,
      leadFeatures.pageViews,
      leadFeatures.emailOpens,
      leadFeatures.formSubmissions,
      leadFeatures.callDuration,
      leadFeatures.meetingCount,
      leadFeatures.daysSinceFirstContact,
      leadFeatures.daysSinceLastActivity,
      leadFeatures.totalInteractions,
      leadFeatures.conversionEvents,
      leadFeatures.sourceQuality,
      leadFeatures.behavioralScore,

      // Behavioral features (15 features)
      behavioralFeatures.responseRate,
      behavioralFeatures.clickRate,
      behavioralFeatures.conversionRate,
      behavioralFeatures.engagementVelocity,
      behavioralFeatures.recencyScore,
      behavioralFeatures.emailOpens,
      behavioralFeatures.pageViews,
      behavioralFeatures.formSubmissions,
      behavioralFeatures.callDuration,
      behavioralFeatures.meetingCount,
      behavioralFeatures.channelPreferences.email || 0,
      behavioralFeatures.channelPreferences.website || 0,
      behavioralFeatures.channelPreferences.phone || 0,
      behavioralFeatures.channelPreferences.social || 0,
      behavioralFeatures.interactionPatterns.burst || 0,

      // Temporal features (10 features)
      temporalFeatures.daysSinceCreation,
      temporalFeatures.daysSinceLastActivity,
      temporalFeatures.interactionCadence.average || 0,
      temporalFeatures.timePatterns.businessHours || 0,
      temporalFeatures.seasonalPatterns.quarter || 0,
      temporalFeatures.dayOfWeekPatterns.weekday || 0,
      temporalFeatures.hourOfDayPatterns.businessHours || 0,
      temporalFeatures.lifecycleStage === 'new' ? 1 : 0,
      temporalFeatures.lifecycleStage === 'engaged' ? 1 : 0,
      temporalFeatures.engagementMaturity,
    ];

    return featureVector;
  }

  // Private helper methods

  private calculateEngagementScore(lead: LeadProfile): number {
    // Simple engagement score based on lead score and activity
    const baseScore = lead.leadScore / 100; // Normalize to 0-1
    const activityBonus = Math.min(lead.totalInteractions / 10, 0.3); // Max 0.3 bonus
    return Math.min(baseScore + activityBonus, 1.0);
  }

  private async calculatePropertyMatch(lead: LeadProfile): Promise<number> {
    // Mock property matching algorithm
    // In real implementation, this would compare lead preferences with available properties
    const matchFactors = {
      hasPropertyType: lead.propertyType ? 0.3 : 0,
      hasBudget: lead.budgetRange ? 0.3 : 0,
      hasLocation: lead.location ? 0.2 : 0,
      hasTimeline: lead.timeline ? 0.2 : 0,
    };

    return Object.values(matchFactors).reduce((sum, factor) => sum + factor, 0);
  }

  private calculateBudgetFit(lead: LeadProfile): number {
    // Mock budget fit calculation
    if (!lead.budgetRange) return 0.5; // Neutral if no budget specified

    // Parse budget range and calculate fit score
    const budgetRanges = {
      'low': ['$0-$200k', '$200k-$400k'],
      'medium': ['$200k-$400k', '$400k-$600k'],
      'high': ['$400k-$600k', '$600k-$1M', '$1M+'],
    };

    // Simple scoring based on range presence
    return 0.8; // Mock high fit
  }

  private calculateTimelineFit(lead: LeadProfile): number {
    if (!lead.timeline) return 0.5;

    // Parse timeline and calculate urgency fit
    const urgentTimelines = ['immediately', '1-2 months', 'asap'];
    const isUrgent = urgentTimelines.some(t => lead.timeline?.toLowerCase().includes(t));

    return isUrgent ? 0.9 : 0.6;
  }

  private calculateLocationPreference(lead: LeadProfile): number {
    if (!lead.location) return 0.5;

    // Mock location scoring based on market demand
    const highDemandAreas = ['downtown', 'suburbs', 'uptown'];
    const isHighDemand = highDemandAreas.some(area =>
      lead.location?.toLowerCase().includes(area)
    );

    return isHighDemand ? 0.8 : 0.6;
  }

  private calculateDaysSinceFirstContact(lead: LeadProfile): number {
    const created = new Date(lead.createdAt);
    const now = new Date();
    return (now.getTime() - created.getTime()) / (24 * 60 * 60 * 1000);
  }

  private calculateDaysSinceLastActivity(lead: LeadProfile): number {
    const lastActivity = new Date(lead.lastActivity);
    const now = new Date();
    return (now.getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000);
  }

  private calculateSourceQuality(lead: LeadProfile): number {
    // Quality scores by lead source
    const sourceQualityMap: Record<string, number> = {
      'referral': 0.9,
      'website': 0.8,
      'social_media': 0.7,
      'paid_ad': 0.6,
      'cold_call': 0.4,
      'unknown': 0.5,
    };

    return sourceQualityMap[lead.source.toLowerCase()] || 0.5;
  }

  private calculateBehavioralScore(lead: LeadProfile): number {
    // Simple behavioral score based on engagement metrics
    const engagementFactors = {
      interactions: Math.min(lead.totalInteractions / 20, 1.0), // Max at 20 interactions
      conversions: Math.min(lead.conversionEvents / 5, 1.0), // Max at 5 conversions
      leadScore: lead.leadScore / 100,
    };

    const weightedScore =
      engagementFactors.interactions * 0.4 +
      engagementFactors.conversions * 0.4 +
      engagementFactors.leadScore * 0.2;

    return weightedScore;
  }

  private getDefaultBehavioralFeatures(): BehavioralFeatures {
    return {
      responseRate: 0,
      clickRate: 0,
      conversionRate: 0,
      engagementVelocity: 0,
      recencyScore: 0,
      emailOpens: 0,
      pageViews: 0,
      formSubmissions: 0,
      callDuration: 0,
      meetingCount: 0,
      channelPreferences: {
        email: 0,
        website: 0,
        phone: 0,
        social: 0,
      },
      interactionPatterns: {
        burst: 0,
        steady: 0,
        sporadic: 0,
      },
      engagementTrends: {
        increasing: false,
        decreasing: false,
        stable: true,
      },
    };
  }

  private calculateChannelPreferences(interactions: LeadInteraction[]): Record<string, number> {
    const channelCounts = interactions.reduce((counts, interaction) => {
      counts[interaction.type] = (counts[interaction.type] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const totalInteractions = interactions.length;
    const preferences: Record<string, number> = {};

    Object.entries(channelCounts).forEach(([channel, count]) => {
      preferences[channel] = count / totalInteractions;
    });

    return preferences;
  }

  private analyzeInteractionPatterns(interactions: LeadInteraction[]): Record<string, number> {
    if (interactions.length < 3) {
      return { burst: 0, steady: 0, sporadic: 1 };
    }

    // Sort interactions by timestamp
    const sortedInteractions = interactions.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Calculate time gaps between interactions
    const gaps: number[] = [];
    for (let i = 1; i < sortedInteractions.length; i++) {
      const gap = new Date(sortedInteractions[i].timestamp).getTime() -
                  new Date(sortedInteractions[i - 1].timestamp).getTime();
      gaps.push(gap / (24 * 60 * 60 * 1000)); // Convert to days
    }

    // Analyze patterns
    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const gapVariance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;
    const stdDev = Math.sqrt(gapVariance);

    // Classify pattern
    if (stdDev < avgGap * 0.3) {
      return { burst: 0, steady: 1, sporadic: 0 }; // Steady pattern
    } else if (stdDev > avgGap * 0.8) {
      return { burst: 0, steady: 0, sporadic: 1 }; // Sporadic pattern
    } else {
      return { burst: 1, steady: 0, sporadic: 0 }; // Burst pattern
    }
  }

  private calculateEngagementTrends(interactions: LeadInteraction[]): Record<string, boolean> {
    if (interactions.length < 5) {
      return { increasing: false, decreasing: false, stable: true };
    }

    // Split interactions into two halves
    const midpoint = Math.floor(interactions.length / 2);
    const firstHalf = interactions.slice(0, midpoint);
    const secondHalf = interactions.slice(midpoint);

    // Calculate average interactions per day for each half
    const firstHalfRate = firstHalf.length / this.calculateTimeSpan(firstHalf);
    const secondHalfRate = secondHalf.length / this.calculateTimeSpan(secondHalf);

    const ratio = secondHalfRate / firstHalfRate;

    return {
      increasing: ratio > 1.2,
      decreasing: ratio < 0.8,
      stable: ratio >= 0.8 && ratio <= 1.2,
    };
  }

  private calculateTimeSpan(interactions: LeadInteraction[]): number {
    if (interactions.length === 0) return 1;

    const timestamps = interactions.map(i => new Date(i.timestamp).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const spanDays = (maxTime - minTime) / (24 * 60 * 60 * 1000);

    return Math.max(spanDays, 1); // At least 1 day
  }

  private calculateInteractionCadence(interactions: LeadInteraction[]): Record<string, number> {
    if (interactions.length < 2) {
      return { average: 0, minimum: 0, maximum: 0 };
    }

    const sortedInteractions = interactions.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const gaps: number[] = [];
    for (let i = 1; i < sortedInteractions.length; i++) {
      const gap = new Date(sortedInteractions[i].timestamp).getTime() -
                  new Date(sortedInteractions[i - 1].timestamp).getTime();
      gaps.push(gap / (24 * 60 * 60 * 1000)); // Convert to days
    }

    return {
      average: gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length,
      minimum: Math.min(...gaps),
      maximum: Math.max(...gaps),
    };
  }

  private analyzeTimePatterns(interactions: LeadInteraction[]): Record<string, number> {
    const businessHours = interactions.filter(i => {
      const hour = new Date(i.timestamp).getHours();
      return hour >= 9 && hour <= 17; // 9 AM to 5 PM
    }).length;

    const weekend = interactions.filter(i => {
      const day = new Date(i.timestamp).getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    }).length;

    return {
      businessHours: interactions.length > 0 ? businessHours / interactions.length : 0,
      weekend: interactions.length > 0 ? weekend / interactions.length : 0,
    };
  }

  private analyzeSeasonalPatterns(interactions: LeadInteraction[]): Record<string, number> {
    const quarters = interactions.reduce((counts, i) => {
      const month = new Date(i.timestamp).getMonth();
      const quarter = Math.floor(month / 3) + 1;
      counts[quarter] = (counts[quarter] || 0) + 1;
      return counts;
    }, {} as Record<number, number>);

    const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
    const currentQuarterInteractions = quarters[currentQuarter] || 0;

    return {
      quarter: currentQuarter,
      currentQuarterActivity: interactions.length > 0 ? currentQuarterInteractions / interactions.length : 0,
    };
  }

  private analyzeDayOfWeekPatterns(interactions: LeadInteraction[]): Record<string, number> {
    const weekday = interactions.filter(i => {
      const day = new Date(i.timestamp).getDay();
      return day >= 1 && day <= 5; // Monday to Friday
    }).length;

    const weekend = interactions.filter(i => {
      const day = new Date(i.timestamp).getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    }).length;

    return {
      weekday: interactions.length > 0 ? weekday / interactions.length : 0,
      weekend: interactions.length > 0 ? weekend / interactions.length : 0,
    };
  }

  private analyzeHourOfDayPatterns(interactions: LeadInteraction[]): Record<string, number> {
    const businessHours = interactions.filter(i => {
      const hour = new Date(i.timestamp).getHours();
      return hour >= 9 && hour <= 17; // 9 AM to 5 PM
    }).length;

    const evening = interactions.filter(i => {
      const hour = new Date(i.timestamp).getHours();
      return hour >= 18 && hour <= 23; // 6 PM to 11 PM
    }).length;

    return {
      businessHours: interactions.length > 0 ? businessHours / interactions.length : 0,
      evening: interactions.length > 0 ? evening / interactions.length : 0,
    };
  }

  private determineLifecycleStage(daysSinceCreation: number, interactionCount: number): string {
    if (daysSinceCreation < 7) return 'new';
    if (daysSinceCreation < 30 && interactionCount > 5) return 'engaged';
    if (daysSinceCreation < 90 && interactionCount > 10) return 'qualified';
    if (daysSinceCreation >= 90) return 'mature';
    return 'nurturing';
  }

  private calculateEngagementMaturity(interactions: LeadInteraction[]): number {
    if (interactions.length === 0) return 0;

    // Factors contributing to engagement maturity
    const factors = {
      interactionCount: Math.min(interactions.length / 20, 1.0), // Max at 20 interactions
      timeSpan: Math.min(this.calculateTimeSpan(interactions) / 90, 1.0), // Max at 90 days
      channelDiversity: this.calculateChannelDiversity(interactions),
      interactionDepth: this.calculateInteractionDepth(interactions),
    };

    // Weighted average
    return (
      factors.interactionCount * 0.3 +
      factors.timeSpan * 0.2 +
      factors.channelDiversity * 0.25 +
      factors.interactionDepth * 0.25
    );
  }

  private calculateChannelDiversity(interactions: LeadInteraction[]): number {
    const channels = new Set(interactions.map(i => i.type));
    return Math.min(channels.size / 4, 1.0); // Max diversity with 4 channels
  }

  private calculateInteractionDepth(interactions: LeadInteraction[]): number {
    // Measure how deep the interactions are (beyond just views/opens)
    const deepInteractions = interactions.filter(i =>
      ['clicked', 'form_submit', 'call', 'meeting'].includes(i.action)
    ).length;

    return interactions.length > 0 ? deepInteractions / interactions.length : 0;
  }
}

export const featureEngineeringService = FeatureEngineeringService.getInstance();