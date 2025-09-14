import {
  CommunicationTemplate,
  TemplateCondition,
  TemplateRenderContext
} from '../types/communication';
import { templateService } from './templateService';

export interface PersonalizationRule {
  id: number;
  name: string;
  conditions: TemplateCondition[];
  priority: number;
  templateIds: number[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalizationScore {
  templateId: number;
  score: number;
  matchedConditions: string[];
  reasons: string[];
}

export interface LeadProfile {
  leadId: number;
  leadScore: number;
  propertyType?: string;
  budget?: number;
  location?: string;
  timeline?: string;
  lastActivity?: string;
  engagementLevel: 'low' | 'medium' | 'high';
  conversionStage?: string;
  preferredCommunication: 'email' | 'sms' | 'push';
  tags: string[];
  customAttributes: Record<string, any>;
}

export interface PersonalizationContext {
  leadProfile: LeadProfile;
  communicationHistory: Array<{
    templateId: number;
    sentAt: string;
    opened: boolean;
    clicked: boolean;
    responded: boolean;
  }>;
  currentTime: Date;
  campaignContext?: {
    campaignId: number;
    campaignType: string;
    sequenceStep: number;
  };
}

class PersonalizationService {
  private static instance: PersonalizationService;

  private constructor() {}

  static getInstance(): PersonalizationService {
    if (!PersonalizationService.instance) {
      PersonalizationService.instance = new PersonalizationService();
    }
    return PersonalizationService.instance;
  }

  /**
   * Select the best template for a lead based on personalization rules
   */
  selectBestTemplate(
    templates: CommunicationTemplate[],
    context: PersonalizationContext
  ): { template: CommunicationTemplate | null; score: number; reasons: string[] } {
    if (!templates.length) {
      return { template: null, score: 0, reasons: ['No templates available'] };
    }

    // Calculate scores for all valid templates
    const scoredTemplates = templates
      .filter(template => template.isActive)
      .map(template => this.calculateTemplateScore(template, context))
      .sort((a, b) => b.score - a.score);

    if (!scoredTemplates.length) {
      return { template: null, score: 0, reasons: ['No valid templates found'] };
    }

    const bestMatch = scoredTemplates[0];
    return {
      template: templates.find(t => t.id === bestMatch.templateId) || null,
      score: bestMatch.score,
      reasons: bestMatch.reasons
    };
  }

  /**
   * Calculate personalization score for a template
   */
  private calculateTemplateScore(
    template: CommunicationTemplate,
    context: PersonalizationContext
  ): PersonalizationScore {
    let score = 0;
    const reasons: string[] = [];
    const matchedConditions: string[] = [];

    // Base score for template validity
    if (this.validateTemplateConditions(template, context)) {
      score += 30;
      reasons.push('Template conditions match lead profile');
    }

    // Lead score alignment
    const leadScoreMatch = this.calculateLeadScoreMatch(template, context.leadProfile);
    score += leadScoreMatch.score;
    reasons.push(...leadScoreMatch.reasons);

    // Engagement level match
    const engagementMatch = this.calculateEngagementMatch(template, context.leadProfile);
    score += engagementMatch.score;
    reasons.push(...engagementMatch.reasons);

    // Communication preference match
    const communicationMatch = this.calculateCommunicationPreferenceMatch(template, context);
    score += communicationMatch.score;
    reasons.push(...communicationMatch.reasons);

    // Timing optimization
    const timingMatch = this.calculateTimingMatch(template, context);
    score += timingMatch.score;
    reasons.push(...timingMatch.reasons);

    // Campaign context
    if (context.campaignContext) {
      const campaignMatch = this.calculateCampaignMatch(template, context.campaignContext);
      score += campaignMatch.score;
      reasons.push(...campaignMatch.reasons);
    }

    // History-based personalization
    const historyMatch = this.calculateHistoryMatch(template, context.communicationHistory);
    score += historyMatch.score;
    reasons.push(...historyMatch.reasons);

    // Template category relevance
    const categoryMatch = this.calculateCategoryMatch(template, context.leadProfile);
    score += categoryMatch.score;
    reasons.push(...categoryMatch.reasons);

    return {
      templateId: template.id,
      score: Math.min(score, 100), // Cap at 100
      matchedConditions,
      reasons
    };
  }

  /**
   * Validate if template conditions match lead profile
   */
  private validateTemplateConditions(
    template: CommunicationTemplate,
    context: PersonalizationContext
  ): boolean {
    if (!template.conditions || template.conditions.length === 0) {
      return true; // No conditions means always valid
    }

    return templateService.validateConditions(template.conditions, context.leadProfile);
  }

  /**
   * Calculate lead score alignment score
   */
  private calculateLeadScoreMatch(
    template: CommunicationTemplate,
    leadProfile: LeadProfile
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    const leadScoreConditions = template.conditions.filter(c => c.field === 'leadScore');
    if (leadScoreConditions.length > 0) {
      for (const condition of leadScoreConditions) {
        if (this.evaluateLeadScoreCondition(condition, leadProfile.leadScore)) {
          score += 15;
          reasons.push(`Lead score ${leadProfile.leadScore} matches template condition`);
        }
      }
    } else {
      // No specific lead score conditions - give moderate score
      score += 8;
      reasons.push('Template suitable for general lead scores');
    }

    return { score, reasons };
  }

  /**
   * Evaluate lead score condition
   */
  private evaluateLeadScoreCondition(condition: TemplateCondition, leadScore: number): boolean {
    switch (condition.operator) {
      case 'greater_than':
        return leadScore > condition.value;
      case 'less_than':
        return leadScore < condition.value;
      case 'equals':
        return leadScore === condition.value;
      case 'in_range':
        if (Array.isArray(condition.value) && condition.value.length === 2) {
          const [min, max] = condition.value;
          return leadScore >= min && leadScore <= max;
        }
        return false;
      default:
        return false;
    }
  }

  /**
   * Calculate engagement level match
   */
  private calculateEngagementMatch(
    template: CommunicationTemplate,
    leadProfile: LeadProfile
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    // Match template category to engagement level
    const categoryEngagementMap: Record<string, string[]> = {
      'onboarding': ['low', 'medium'],
      'engagement': ['medium', 'high'],
      'nurturing': ['low', 'medium'],
      'followup': ['medium', 'high'],
      'closing': ['high'],
      'retention': ['high'],
      'reactivation': ['low']
    };

    const suitableEngagementLevels = categoryEngagementMap[template.category] || ['medium'];
    if (suitableEngagementLevels.includes(leadProfile.engagementLevel)) {
      score += 12;
      reasons.push(`Template category '${template.category}' matches engagement level '${leadProfile.engagementLevel}'`);
    }

    return { score, reasons };
  }

  /**
   * Calculate communication preference match
   */
  private calculateCommunicationPreferenceMatch(
    template: CommunicationTemplate,
    context: PersonalizationContext
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    // For now, assume email is the primary communication method
    // In a real implementation, this would check template type vs lead preference
    const preferredMethod = context.leadProfile.preferredCommunication;

    // Give bonus for matching preferred communication method
    if (preferredMethod === 'email') {
      score += 8;
      reasons.push('Matches preferred email communication');
    }

    return { score, reasons };
  }

  /**
   * Calculate timing optimization score
   */
  private calculateTimingMatch(
    template: CommunicationTemplate,
    context: PersonalizationContext
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    const now = context.currentTime;
    const lastActivity = context.leadProfile.lastActivity;

    if (lastActivity) {
      const daysSinceActivity = (now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);

      // Different templates work better at different times since last activity
      const timingRules: Record<string, { optimal: number[]; bonus: number }> = {
        'onboarding': { optimal: [0, 1], bonus: 10 },
        'followup': { optimal: [2, 7], bonus: 12 },
        'nurturing': { optimal: [7, 30], bonus: 8 },
        'engagement': { optimal: [1, 14], bonus: 10 },
        'reactivation': { optimal: [30, 90], bonus: 15 }
      };

      const rule = timingRules[template.category];
      if (rule) {
        const [min, max] = rule.optimal;
        if (daysSinceActivity >= min && daysSinceActivity <= max) {
          score += rule.bonus;
          reasons.push(`Optimal timing for ${template.category} template (${Math.round(daysSinceActivity)} days since activity)`);
        }
      }
    }

    return { score, reasons };
  }

  /**
   * Calculate campaign context match
   */
  private calculateCampaignMatch(
    template: CommunicationTemplate,
    campaignContext: PersonalizationContext['campaignContext']
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    if (!campaignContext) return { score: 0, reasons: [] };

    // Match template category to campaign type
    const campaignCategoryMap: Record<string, string[]> = {
      'nurture': ['nurturing', 'engagement'],
      'onboard': ['onboarding', 'followup'],
      'convert': ['closing', 'engagement'],
      'retain': ['retention', 'engagement'],
      'reactivate': ['reactivation', 'engagement']
    };

    const suitableCategories = campaignCategoryMap[campaignContext.campaignType] || [];
    if (suitableCategories.includes(template.category)) {
      score += 10;
      reasons.push(`Template category matches ${campaignContext.campaignType} campaign type`);
    }

    // Sequence step consideration
    if (campaignContext.sequenceStep === 1 && template.category === 'onboarding') {
      score += 8;
      reasons.push('Suitable for first step in campaign sequence');
    }

    return { score, reasons };
  }

  /**
   * Calculate history-based personalization
   */
  private calculateHistoryMatch(
    template: CommunicationTemplate,
    history: PersonalizationContext['communicationHistory']
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    if (!history || history.length === 0) {
      // New lead - prefer onboarding templates
      if (template.category === 'onboarding') {
        score += 15;
        reasons.push('Suitable for new leads without communication history');
      }
      return { score, reasons };
    }

    // Check if this template type has been sent recently
    const recentTemplates = history.filter(h =>
      (new Date().getTime() - new Date(h.sentAt).getTime()) / (1000 * 60 * 60 * 24) < 7
    );

    const recentTemplateIds = recentTemplates.map(h => h.templateId);

    // Avoid sending similar templates too frequently
    if (!recentTemplateIds.includes(template.id)) {
      score += 8;
      reasons.push('Template not recently sent to this lead');
    }

    // Check engagement with similar templates
    const similarCategoryHistory = history.filter(h => {
      // This would need template metadata to determine similarity
      // For now, assume different templates are different enough
      return true;
    });

    const engagementRate = similarCategoryHistory.filter(h => h.opened || h.clicked).length / similarCategoryHistory.length;

    if (engagementRate > 0.5) {
      score += 10;
      reasons.push('Lead has good engagement with similar communications');
    } else if (engagementRate < 0.2) {
      score -= 5;
      reasons.push('Lead has low engagement with similar communications');
    }

    return { score, reasons };
  }

  /**
   * Calculate category relevance
   */
  private calculateCategoryMatch(
    template: CommunicationTemplate,
    leadProfile: LeadProfile
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    // Category-specific scoring based on lead attributes
    switch (template.category) {
      case 'onboarding':
        if (!leadProfile.lastActivity) {
          score += 15;
          reasons.push('Ideal for new leads needing onboarding');
        }
        break;

      case 'closing':
        if (leadProfile.leadScore > 80 && leadProfile.conversionStage === 'final') {
          score += 15;
          reasons.push('Suitable for high-scoring leads ready to convert');
        }
        break;

      case 'nurturing':
        if (leadProfile.engagementLevel === 'low' && leadProfile.leadScore < 60) {
          score += 12;
          reasons.push('Good for nurturing low-engagement leads');
        }
        break;

      case 'engagement':
        if (leadProfile.engagementLevel === 'medium') {
          score += 10;
          reasons.push('Matches medium engagement level');
        }
        break;

      case 'followup':
        if (leadProfile.lastActivity) {
          const daysSince = (new Date().getTime() - new Date(leadProfile.lastActivity).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince > 1 && daysSince < 14) {
            score += 12;
            reasons.push('Appropriate timing for follow-up communication');
          }
        }
        break;

      default:
        score += 5;
        reasons.push('General purpose template');
    }

    return { score, reasons };
  }

  /**
   * Get personalization suggestions for a lead
   */
  getPersonalizationSuggestions(
    templates: CommunicationTemplate[],
    context: PersonalizationContext
  ): Array<{
    template: CommunicationTemplate;
    score: number;
    confidence: 'low' | 'medium' | 'high';
    reasons: string[];
  }> {
    const scoredTemplates = templates
      .filter(template => template.isActive)
      .map(template => {
        const result = this.calculateTemplateScore(template, context);
        const confidence = this.calculateConfidence(result.score);

        return {
          template,
          score: result.score,
          confidence,
          reasons: result.reasons
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5 suggestions

    return scoredTemplates;
  }

  /**
   * Calculate confidence level from score
   */
  private calculateConfidence(score: number): 'low' | 'medium' | 'high' {
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  /**
   * Create a lead profile from raw lead data
   */
  createLeadProfile(leadData: Record<string, any>): LeadProfile {
    return {
      leadId: leadData.id,
      leadScore: leadData.leadScore || 0,
      propertyType: leadData.propertyType,
      budget: leadData.budget,
      location: leadData.location || leadData.preferredLocation,
      timeline: leadData.timeline,
      lastActivity: leadData.lastActivity,
      engagementLevel: this.calculateEngagementLevel(leadData),
      conversionStage: leadData.conversionStage,
      preferredCommunication: leadData.preferredCommunication || 'email',
      tags: leadData.tags || [],
      customAttributes: leadData.customAttributes || {}
    };
  }

  /**
   * Calculate engagement level from lead data
   */
  private calculateEngagementLevel(leadData: Record<string, any>): 'low' | 'medium' | 'high' {
    let score = 0;

    // Lead score contribution
    if (leadData.leadScore > 70) score += 30;
    else if (leadData.leadScore > 40) score += 20;
    else score += 10;

    // Activity contribution
    if (leadData.lastActivity) {
      const daysSince = (new Date().getTime() - new Date(leadData.lastActivity).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) score += 25;
      else if (daysSince < 30) score += 15;
      else score += 5;
    }

    // Tags contribution
    const engagementTags = ['engaged', 'active', 'responsive'];
    const matchingTags = (leadData.tags || []).filter((tag: string) =>
      engagementTags.some(et => tag.toLowerCase().includes(et))
    );
    score += matchingTags.length * 10;

    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }
}

// Export singleton instance
export const personalizationService = PersonalizationService.getInstance();