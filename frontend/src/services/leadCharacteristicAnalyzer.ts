import { TemplateRenderingContext } from '../types/template';

export interface LeadCharacteristics {
  // Basic Information
  hasName: boolean;
  hasEmail: boolean;
  hasPhone: boolean;

  // Scoring and Status
  leadScore: number;
  leadStage: string;
  engagementLevel: 'low' | 'medium' | 'high';

  // Property Preferences
  propertyType?: string;
  budgetRange?: {
    min: number;
    max: number;
  };
  bedroomPreference?: number;
  bathroomPreference?: number;
  locationPreference?: string;

  // Timeline and Urgency
  timeline: 'immediate' | '1-3 months' | '3-6 months' | '6-12 months' | '1+ years' | 'browsing';
  urgencyLevel: 'low' | 'medium' | 'high';

  // Behavioral Data
  daysSinceLastContact: number;
  totalInteractions: number;
  responseRate: number;
  preferredChannel: 'email' | 'sms' | 'phone' | 'in_app';

  // Demographic Data
  ageGroup?: '18-25' | '26-35' | '36-45' | '46-55' | '56-65' | '65+';
  incomeLevel?: 'low' | 'middle' | 'high' | 'premium';
  familyStatus?: 'single' | 'couple' | 'family' | 'investor';

  // Communication Preferences
  communicationFrequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  bestTimeToContact: 'morning' | 'afternoon' | 'evening';
  preferredContentType: 'property_details' | 'market_updates' | 'lifestyle' | 'investment';

  // Custom Characteristics
  customTags: string[];
  riskFactors: string[];
  opportunities: string[];
}

export interface CharacteristicWeights {
  leadScore: number;
  engagementLevel: number;
  timeline: number;
  propertyPreferences: number;
  behavioralData: number;
  demographicData: number;
  communicationPreferences: number;
  customFactors: number;
}

export interface LeadAnalysisResult {
  characteristics: LeadCharacteristics;
  confidence: number;
  analysisTime: number;
  dataCompleteness: number;
  recommendations: string[];
}

class LeadCharacteristicAnalyzer {
  private static instance: LeadCharacteristicAnalyzer;

  // Default weights for characteristic scoring
  private defaultWeights: CharacteristicWeights = {
    leadScore: 0.25,
    engagementLevel: 0.20,
    timeline: 0.15,
    propertyPreferences: 0.15,
    behavioralData: 0.10,
    demographicData: 0.08,
    communicationPreferences: 0.05,
    customFactors: 0.02,
  };

  private constructor() {}

  public static getInstance(): LeadCharacteristicAnalyzer {
    if (!LeadCharacteristicAnalyzer.instance) {
      LeadCharacteristicAnalyzer.instance = new LeadCharacteristicAnalyzer();
    }
    return LeadCharacteristicAnalyzer.instance;
  }

  /**
   * Analyze lead data and extract characteristics
   */
  public analyzeLead(leadData: Record<string, any>): LeadAnalysisResult {
    const startTime = Date.now();

    const characteristics = this.extractCharacteristics(leadData);
    const confidence = this.calculateConfidence(characteristics);
    const dataCompleteness = this.calculateDataCompleteness(leadData);
    const recommendations = this.generateRecommendations(characteristics, dataCompleteness);

    const analysisTime = Date.now() - startTime;

    return {
      characteristics,
      confidence,
      analysisTime,
      dataCompleteness,
      recommendations,
    };
  }

  /**
   * Extract characteristics from lead data
   */
  private extractCharacteristics(leadData: Record<string, any>): LeadCharacteristics {
    return {
      // Basic Information
      hasName: !!(leadData.first_name || leadData.last_name || leadData.full_name),
      hasEmail: !!leadData.email,
      hasPhone: !!leadData.phone,

      // Scoring and Status
      leadScore: this.normalizeLeadScore(leadData.score || leadData.lead_score || 0),
      leadStage: this.normalizeLeadStage(leadData.stage || leadData.lead_stage || 'new'),
      engagementLevel: this.calculateEngagementLevel(leadData),

      // Property Preferences
      propertyType: this.normalizePropertyType(leadData.property_type || leadData.propertyType),
      budgetRange: this.extractBudgetRange(leadData),
      bedroomPreference: leadData.bedrooms || leadData.bedroom_preference,
      bathroomPreference: leadData.bathrooms || leadData.bathroom_preference,
      locationPreference: leadData.location || leadData.location_preference,

      // Timeline and Urgency
      timeline: this.normalizeTimeline(leadData.timeline || leadData.purchase_timeline),
      urgencyLevel: this.calculateUrgencyLevel(leadData),

      // Behavioral Data
      daysSinceLastContact: this.calculateDaysSinceLastContact(leadData),
      totalInteractions: leadData.interaction_count || leadData.total_interactions || 0,
      responseRate: this.calculateResponseRate(leadData),
      preferredChannel: this.determinePreferredChannel(leadData),

      // Demographic Data
      ageGroup: this.determineAgeGroup(leadData),
      incomeLevel: this.determineIncomeLevel(leadData),
      familyStatus: this.determineFamilyStatus(leadData),

      // Communication Preferences
      communicationFrequency: this.determineCommunicationFrequency(leadData),
      bestTimeToContact: this.determineBestTimeToContact(leadData),
      preferredContentType: this.determinePreferredContentType(leadData),

      // Custom Characteristics
      customTags: this.extractCustomTags(leadData),
      riskFactors: this.identifyRiskFactors(leadData),
      opportunities: this.identifyOpportunities(leadData),
    };
  }

  /**
   * Normalize lead score to 0-100 scale
   */
  private normalizeLeadScore(score: any): number {
    if (typeof score === 'number') {
      if (score >= 0 && score <= 100) return score;
      if (score > 100) return 100;
      return Math.max(0, score);
    }

    if (typeof score === 'string') {
      const numScore = parseFloat(score);
      if (!isNaN(numScore)) return this.normalizeLeadScore(numScore);
    }

    return 50; // Default neutral score
  }

  /**
   * Normalize lead stage
   */
  private normalizeLeadStage(stage: any): string {
    if (typeof stage !== 'string') return 'new';

    const normalized = stage.toLowerCase().trim();

    const stageMappings: Record<string, string> = {
      'new': 'new',
      'contacted': 'contacted',
      'qualified': 'qualified',
      'showing': 'showing',
      'proposal': 'proposal',
      'negotiating': 'negotiating',
      'closing': 'closing',
      'closed': 'closed',
      'lost': 'lost',
      'nurture': 'nurture',
    };

    return stageMappings[normalized] || 'new';
  }

  /**
   * Calculate engagement level based on various factors
   */
  private calculateEngagementLevel(leadData: Record<string, any>): 'low' | 'medium' | 'high' {
    let score = 0;

    // Lead score contribution
    const leadScore = this.normalizeLeadScore(leadData.score || leadData.lead_score);
    score += leadScore * 0.4;

    // Interaction count contribution
    const interactions = leadData.interaction_count || leadData.total_interactions || 0;
    score += Math.min(interactions * 5, 30); // Max 30 points for interactions

    // Response rate contribution
    const responseRate = this.calculateResponseRate(leadData);
    score += responseRate * 20; // 0-20 points

    // Recency contribution
    const daysSinceContact = this.calculateDaysSinceLastContact(leadData);
    if (daysSinceContact <= 7) score += 10;
    else if (daysSinceContact <= 30) score += 5;

    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Normalize property type
   */
  private normalizePropertyType(type: any): string | undefined {
    if (!type || typeof type !== 'string') return undefined;

    const normalized = type.toLowerCase().trim();

    const typeMappings: Record<string, string> = {
      'house': 'house',
      'single-family': 'house',
      'single family': 'house',
      'home': 'house',
      'condo': 'condo',
      'condominium': 'condo',
      'townhouse': 'townhouse',
      'town home': 'townhouse',
      'apartment': 'apartment',
      'apt': 'apartment',
      'land': 'land',
      'lot': 'land',
      'commercial': 'commercial',
      'business': 'commercial',
      'multi-family': 'multi-family',
      'duplex': 'multi-family',
    };

    return typeMappings[normalized] || type;
  }

  /**
   * Extract budget range from lead data
   */
  private extractBudgetRange(leadData: Record<string, any>): { min: number; max: number } | undefined {
    const budget = leadData.budget || leadData.budget_range || leadData.price_range;

    if (!budget) return undefined;

    if (typeof budget === 'string') {
      // Parse string like "$300,000 - $500,000" or "300k-500k"
      const rangeMatch = budget.match(/[\$]?(\d+(?:,\d+)*(?:\.\d+)?)[k]?\s*[-–]\s*[\$]?(\d+(?:,\d+)*(?:\.\d+)?)[k]?/i);

      if (rangeMatch) {
        let min = parseFloat(rangeMatch[1].replace(/,/g, ''));
        let max = parseFloat(rangeMatch[2].replace(/,/g, ''));

        // Handle 'k' notation (300k = 300,000)
        if (budget.toLowerCase().includes('k')) {
          min *= 1000;
          max *= 1000;
        }

        return { min, max };
      }
    }

    if (typeof budget === 'number') {
      // Assume it's the maximum budget
      return { min: budget * 0.8, max: budget };
    }

    return undefined;
  }

  /**
   * Normalize timeline
   */
  private normalizeTimeline(timeline: any): 'immediate' | '1-3 months' | '3-6 months' | '6-12 months' | '1+ years' | 'browsing' {
    if (!timeline) return 'browsing';

    if (typeof timeline === 'string') {
      const normalized = timeline.toLowerCase().trim();

      const timelineMappings: Record<string, string> = {
        'immediate': 'immediate',
        'immediately': 'immediate',
        'now': 'immediate',
        'asap': 'immediate',
        '1-3 months': '1-3 months',
        '1-3': '1-3 months',
        '3-6 months': '3-6 months',
        '3-6': '3-6 months',
        '6-12 months': '6-12 months',
        '6-12': '6-12 months',
        '1+ years': '1+ years',
        '1+ year': '1+ years',
        'long term': '1+ years',
        'browsing': 'browsing',
        'just looking': 'browsing',
        'no rush': 'browsing',
      };

      return (timelineMappings[normalized] as any) || 'browsing';
    }

    return 'browsing';
  }

  /**
   * Calculate urgency level
   */
  private calculateUrgencyLevel(leadData: Record<string, any>): 'low' | 'medium' | 'high' {
    const timeline = this.normalizeTimeline(leadData.timeline || leadData.purchase_timeline);
    const leadScore = this.normalizeLeadScore(leadData.score || leadData.lead_score);

    if (timeline === 'immediate' || leadScore >= 80) return 'high';
    if (timeline === '1-3 months' || leadScore >= 60) return 'medium';
    return 'low';
  }

  /**
   * Calculate days since last contact
   */
  private calculateDaysSinceLastContact(leadData: Record<string, any>): number {
    const lastContact = leadData.last_contact_date || leadData.last_contact;

    if (!lastContact) return 999; // Very old

    try {
      const lastContactDate = new Date(lastContact);
      const now = new Date();
      const diffTime = now.getTime() - lastContactDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } catch {
      return 999;
    }
  }

  /**
   * Calculate response rate
   */
  private calculateResponseRate(leadData: Record<string, any>): number {
    const totalSent = leadData.messages_sent || leadData.emails_sent || 0;
    const totalResponses = leadData.responses_received || leadData.replies_received || 0;

    if (totalSent === 0) return 0;

    return Math.min(totalResponses / totalSent, 1); // Cap at 100%
  }

  /**
   * Determine preferred communication channel
   */
  private determinePreferredChannel(leadData: Record<string, any>): 'email' | 'sms' | 'phone' | 'in_app' {
    // Check explicit preference
    const explicitPreference = leadData.preferred_channel || leadData.communication_preference;
    if (explicitPreference) {
      const normalized = explicitPreference.toLowerCase();
      if (['email', 'sms', 'phone', 'in_app'].includes(normalized)) {
        return normalized as any;
      }
    }

    // Infer from usage patterns
    const emailCount = leadData.email_interactions || 0;
    const smsCount = leadData.sms_interactions || 0;
    const phoneCount = leadData.phone_interactions || 0;
    const appCount = leadData.app_interactions || 0;

    const maxCount = Math.max(emailCount, smsCount, phoneCount, appCount);

    if (maxCount === emailCount) return 'email';
    if (maxCount === smsCount) return 'sms';
    if (maxCount === phoneCount) return 'phone';
    if (maxCount === appCount) return 'in_app';

    return 'email'; // Default
  }

  /**
   * Determine age group
   */
  private determineAgeGroup(leadData: Record<string, any>): '18-25' | '26-35' | '36-45' | '46-55' | '56-65' | '65+' | undefined {
    const age = leadData.age || leadData.birth_year;

    if (!age) return undefined;

    if (typeof age === 'number') {
      if (age >= 18 && age <= 25) return '18-25';
      if (age >= 26 && age <= 35) return '26-35';
      if (age >= 36 && age <= 45) return '36-45';
      if (age >= 46 && age <= 55) return '46-55';
      if (age >= 56 && age <= 65) return '56-65';
      if (age >= 66) return '65+';
    }

    if (typeof age === 'string' && age.includes('-')) {
      // Birth year range
      const currentYear = new Date().getFullYear();
      const birthYear = parseInt(age.split('-')[0]);
      if (!isNaN(birthYear)) {
        const calculatedAge = currentYear - birthYear;
        return this.determineAgeGroup({ age: calculatedAge });
      }
    }

    return undefined;
  }

  /**
   * Determine income level
   */
  private determineIncomeLevel(leadData: Record<string, any>): 'low' | 'middle' | 'high' | 'premium' | undefined {
    const income = leadData.income || leadData.annual_income || leadData.household_income;
    const budget = this.extractBudgetRange(leadData);

    if (!income && !budget) return undefined;

    // Use budget as income proxy if income not available
    const incomeValue = typeof income === 'number' ? income : (budget ? budget.max * 0.3 : 0);

    if (incomeValue >= 200000) return 'premium';
    if (incomeValue >= 100000) return 'high';
    if (incomeValue >= 50000) return 'middle';
    if (incomeValue > 0) return 'low';

    return undefined;
  }

  /**
   * Determine family status
   */
  private determineFamilyStatus(leadData: Record<string, any>): 'single' | 'couple' | 'family' | 'investor' | undefined {
    const maritalStatus = leadData.marital_status || leadData.marital;
    const householdSize = leadData.household_size || leadData.family_size;
    const isInvestor = leadData.is_investor || leadData.investor;

    if (isInvestor) return 'investor';

    if (maritalStatus) {
      const normalized = maritalStatus.toLowerCase();
      if (normalized.includes('married') || normalized.includes('couple')) return 'couple';
      if (normalized.includes('single')) return 'single';
    }

    if (householdSize) {
      if (householdSize >= 3) return 'family';
      if (householdSize === 2) return 'couple';
      if (householdSize === 1) return 'single';
    }

    return undefined;
  }

  /**
   * Determine communication frequency preference
   */
  private determineCommunicationFrequency(leadData: Record<string, any>): 'daily' | 'weekly' | 'bi-weekly' | 'monthly' {
    const preference = leadData.communication_frequency || leadData.contact_frequency;

    if (!preference) {
      // Infer from engagement level
      const engagement = this.calculateEngagementLevel(leadData);
      switch (engagement) {
        case 'high': return 'weekly';
        case 'medium': return 'bi-weekly';
        case 'low': return 'monthly';
      }
    }

    if (typeof preference === 'string') {
      const normalized = preference.toLowerCase();
      if (normalized.includes('daily')) return 'daily';
      if (normalized.includes('weekly')) return 'weekly';
      if (normalized.includes('bi') || normalized.includes('twice')) return 'bi-weekly';
      if (normalized.includes('monthly')) return 'monthly';
    }

    return 'bi-weekly'; // Default
  }

  /**
   * Determine best time to contact
   */
  private determineBestTimeToContact(leadData: Record<string, any>): 'morning' | 'afternoon' | 'evening' {
    const preference = leadData.best_time || leadData.contact_time_preference;

    if (preference && typeof preference === 'string') {
      const normalized = preference.toLowerCase();
      if (normalized.includes('morning') || normalized.includes('am')) return 'morning';
      if (normalized.includes('afternoon')) return 'afternoon';
      if (normalized.includes('evening') || normalized.includes('pm')) return 'evening';
    }

    // Default based on typical real estate buyer patterns
    return 'evening';
  }

  /**
   * Determine preferred content type
   */
  private determinePreferredContentType(leadData: Record<string, any>): 'property_details' | 'market_updates' | 'lifestyle' | 'investment' {
    const preference = leadData.content_preference || leadData.content_type;

    if (preference && typeof preference === 'string') {
      const normalized = preference.toLowerCase();
      if (normalized.includes('property') || normalized.includes('home')) return 'property_details';
      if (normalized.includes('market') || normalized.includes('price')) return 'market_updates';
      if (normalized.includes('lifestyle') || normalized.includes('neighborhood')) return 'lifestyle';
      if (normalized.includes('investment') || normalized.includes('roi')) return 'investment';
    }

    // Infer from lead characteristics
    const isInvestor = this.determineFamilyStatus(leadData) === 'investor';
    const highBudget = this.extractBudgetRange(leadData)?.max >= 500000;

    if (isInvestor || highBudget) return 'investment';
    return 'property_details';
  }

  /**
   * Extract custom tags
   */
  private extractCustomTags(leadData: Record<string, any>): string[] {
    const tags = leadData.tags || leadData.custom_tags || [];

    if (Array.isArray(tags)) return tags;

    if (typeof tags === 'string') {
      return tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }

    return [];
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(leadData: Record<string, any>): string[] {
    const risks: string[] = [];

    // Low engagement
    if (this.calculateEngagementLevel(leadData) === 'low') {
      risks.push('low_engagement');
    }

    // Old contact
    if (this.calculateDaysSinceLastContact(leadData) > 90) {
      risks.push('stale_contact');
    }

    // Low response rate
    if (this.calculateResponseRate(leadData) < 0.1) {
      risks.push('low_response_rate');
    }

    // Missing critical information
    if (!leadData.email && !leadData.phone) {
      risks.push('incomplete_contact_info');
    }

    return risks;
  }

  /**
   * Identify opportunities
   */
  private identifyOpportunities(leadData: Record<string, any>): string[] {
    const opportunities: string[] = [];

    // High engagement
    if (this.calculateEngagementLevel(leadData) === 'high') {
      opportunities.push('high_engagement');
    }

    // High lead score
    if (this.normalizeLeadScore(leadData.score || leadData.lead_score) >= 80) {
      opportunities.push('high_lead_score');
    }

    // Urgent timeline
    if (this.calculateUrgencyLevel(leadData) === 'high') {
      opportunities.push('urgent_timeline');
    }

    // Premium budget
    const budget = this.extractBudgetRange(leadData);
    if (budget && budget.max >= 750000) {
      opportunities.push('premium_budget');
    }

    return opportunities;
  }

  /**
   * Calculate confidence in the analysis
   */
  private calculateConfidence(characteristics: LeadCharacteristics): number {
    let confidence = 0;
    let totalFactors = 0;

    // Basic information completeness
    totalFactors += 3;
    if (characteristics.hasName) confidence += 1;
    if (characteristics.hasEmail) confidence += 1;
    if (characteristics.hasPhone) confidence += 1;

    // Lead score and stage
    totalFactors += 2;
    if (characteristics.leadScore > 0) confidence += 1;
    if (characteristics.leadStage !== 'new') confidence += 1;

    // Property preferences
    totalFactors += 4;
    if (characteristics.propertyType) confidence += 1;
    if (characteristics.budgetRange) confidence += 1;
    if (characteristics.bedroomPreference) confidence += 1;
    if (characteristics.locationPreference) confidence += 1;

    // Behavioral data
    totalFactors += 3;
    if (characteristics.totalInteractions > 0) confidence += 1;
    if (characteristics.daysSinceLastContact < 999) confidence += 1;
    if (characteristics.responseRate >= 0) confidence += 1;

    return totalFactors > 0 ? (confidence / totalFactors) * 100 : 0;
  }

  /**
   * Calculate data completeness
   */
  private calculateDataCompleteness(leadData: Record<string, any>): number {
    const requiredFields = [
      'first_name', 'last_name', 'email', 'phone',
      'score', 'stage', 'timeline', 'budget',
      'property_type', 'location'
    ];

    const presentFields = requiredFields.filter(field => {
      const value = leadData[field];
      return value !== null && value !== undefined && value !== '';
    });

    return (presentFields.length / requiredFields.length) * 100;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(characteristics: LeadCharacteristics, dataCompleteness: number): string[] {
    const recommendations: string[] = [];

    if (dataCompleteness < 70) {
      recommendations.push('Consider collecting more lead information to improve personalization accuracy');
    }

    if (characteristics.engagementLevel === 'low') {
      recommendations.push('Focus on re-engagement campaigns for this lead');
    }

    if (characteristics.urgencyLevel === 'high') {
      recommendations.push('Prioritize immediate follow-up for this high-urgency lead');
    }

    if (characteristics.timeline === 'browsing') {
      recommendations.push('Use nurturing campaigns to build interest over time');
    }

    if (characteristics.riskFactors.includes('stale_contact')) {
      recommendations.push('Re-establish contact with personalized re-engagement content');
    }

    if (characteristics.opportunities.includes('premium_budget')) {
      recommendations.push('Consider premium property recommendations and VIP service');
    }

    return recommendations;
  }

  /**
   * Update characteristic weights for scoring
   */
  public updateWeights(weights: Partial<CharacteristicWeights>): void {
    this.defaultWeights = { ...this.defaultWeights, ...weights };
  }

  /**
   * Get current weights
   */
  public getWeights(): CharacteristicWeights {
    return { ...this.defaultWeights };
  }
}

export const leadCharacteristicAnalyzer = LeadCharacteristicAnalyzer.getInstance();