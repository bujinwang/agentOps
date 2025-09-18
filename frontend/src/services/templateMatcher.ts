import { CommunicationTemplate, TemplateCategory, CommunicationChannel, TemplateCondition } from '../types/template';
import { LeadCharacteristics } from './leadCharacteristicAnalyzer';

export interface TemplateMatch {
  template: CommunicationTemplate;
  score: number;
  confidence: number;
  matchedConditions: string[];
  reasoning: string[];
}

export interface TemplateMatchingOptions {
  channel?: CommunicationChannel;
  category?: TemplateCategory;
  maxResults?: number;
  minScore?: number;
  includeFallbacks?: boolean;
}

export interface MatchingRule {
  id: string;
  name: string;
  priority: number;
  condition: (characteristics: LeadCharacteristics, template: CommunicationTemplate) => boolean;
  score: (characteristics: LeadCharacteristics, template: CommunicationTemplate) => number;
  reasoning: string;
}

class TemplateMatcher {
  private static instance: TemplateMatcher;
  private matchingRules: MatchingRule[] = [];

  private constructor() {
    this.initializeMatchingRules();
  }

  public static getInstance(): TemplateMatcher {
    if (!TemplateMatcher.instance) {
      TemplateMatcher.instance = new TemplateMatcher();
    }
    return TemplateMatcher.instance;
  }

  /**
   * Initialize the matching rules for template selection
   */
  private initializeMatchingRules(): void {
    this.matchingRules = [
      // High Priority Rules
      {
        id: 'urgency_match',
        name: 'Urgency Level Match',
        priority: 100,
        condition: (characteristics, template) => {
          if (characteristics.urgencyLevel === 'high') {
            return template.category === 'initial_contact' || template.category === 'follow_up';
          }
          return true;
        },
        score: (characteristics, template) => {
          if (characteristics.urgencyLevel === 'high' && template.category === 'initial_contact') {
            return 20;
          }
          return 0;
        },
        reasoning: 'High urgency leads get immediate, direct communication',
      },

      {
        id: 'timeline_match',
        name: 'Timeline Match',
        priority: 90,
        condition: (characteristics, template) => {
          const timelineMap: Record<string, TemplateCategory[]> = {
            'immediate': ['initial_contact', 'property_showing'],
            '1-3 months': ['follow_up', 'proposal'],
            '3-6 months': ['follow_up', 'nurturing'],
            '6-12 months': ['nurturing', 're_engagement'],
            '1+ years': ['nurturing', 're_engagement'],
            'browsing': ['nurturing', 'thank_you'],
          };

          const allowedCategories = timelineMap[characteristics.timeline] || [];
          return allowedCategories.includes(template.category);
        },
        score: (characteristics, template) => {
          const timelineWeights: Record<string, number> = {
            'immediate': 25,
            '1-3 months': 20,
            '3-6 months': 15,
            '6-12 months': 10,
            '1+ years': 5,
            'browsing': 5,
          };

          return timelineWeights[characteristics.timeline] || 0;
        },
        reasoning: 'Template category matches lead\'s purchase timeline',
      },

      {
        id: 'engagement_match',
        name: 'Engagement Level Match',
        priority: 85,
        condition: (characteristics, template) => {
          const engagementMap: Record<string, TemplateCategory[]> = {
            'high': ['follow_up', 'proposal', 'property_showing'],
            'medium': ['follow_up', 'nurturing', 're_engagement'],
            'low': ['initial_contact', 'nurturing', 're_engagement'],
          };

          const allowedCategories = engagementMap[characteristics.engagementLevel] || [];
          return allowedCategories.includes(template.category);
        },
        score: (characteristics, template) => {
          const engagementWeights: Record<string, number> = {
            'high': 20,
            'medium': 15,
            'low': 10,
          };

          return engagementWeights[characteristics.engagementLevel] || 0;
        },
        reasoning: 'Template matches lead\'s engagement level',
      },

      {
        id: 'lead_score_match',
        name: 'Lead Score Match',
        priority: 80,
        condition: (characteristics, template) => {
          // High-scoring leads get premium content
          if (characteristics.leadScore >= 80) {
            return template.category !== 'nurturing';
          }
          // Low-scoring leads get basic nurturing
          if (characteristics.leadScore <= 30) {
            return template.category === 'nurturing' || template.category === 'initial_contact';
          }
          return true;
        },
        score: (characteristics, template) => {
          const score = characteristics.leadScore;
          if (score >= 80 && template.category === 'proposal') return 15;
          if (score <= 30 && template.category === 'nurturing') return 10;
          return Math.floor(score / 10); // 0-10 points based on score
        },
        reasoning: 'Template quality matches lead score',
      },

      {
        id: 'property_type_match',
        name: 'Property Type Match',
        priority: 75,
        condition: (characteristics, template) => {
          if (!characteristics.propertyType) return true;

          // Check if template content mentions the property type
          const content = template.content.toLowerCase();
          const propertyType = characteristics.propertyType.toLowerCase();

          return content.includes(propertyType) ||
                 content.includes('property') ||
                 content.includes('home');
        },
        score: (characteristics, template) => {
          if (!characteristics.propertyType) return 0;

          const content = template.content.toLowerCase();
          const propertyType = characteristics.propertyType.toLowerCase();

          if (content.includes(propertyType)) return 15;
          if (content.includes('property') || content.includes('home')) return 5;
          return 0;
        },
        reasoning: 'Template content matches preferred property type',
      },

      {
        id: 'budget_match',
        name: 'Budget Range Match',
        priority: 70,
        condition: (characteristics, template) => {
          if (!characteristics.budgetRange) return true;

          const content = template.content.toLowerCase();
          const budget = characteristics.budgetRange;

          // Check for price mentions in template
          if (budget.max >= 500000 && content.includes('luxury')) return true;
          if (budget.max <= 200000 && content.includes('affordable')) return true;
          if (budget.max >= 750000 && content.includes('premium')) return true;

          return true; // Don't exclude, just score lower
        },
        score: (characteristics, template) => {
          if (!characteristics.budgetRange) return 0;

          const content = template.content.toLowerCase();
          const budget = characteristics.budgetRange;

          if (budget.max >= 500000 && content.includes('luxury')) return 10;
          if (budget.max <= 200000 && content.includes('affordable')) return 10;
          if (budget.max >= 750000 && content.includes('premium')) return 15;

          return 5; // Generic property mention
        },
        reasoning: 'Template tone matches budget expectations',
      },

      {
        id: 'channel_preference_match',
        name: 'Channel Preference Match',
        priority: 65,
        condition: (characteristics, template) => {
          return template.channel === characteristics.preferredChannel;
        },
        score: (characteristics, template) => {
          return template.channel === characteristics.preferredChannel ? 10 : 0;
        },
        reasoning: 'Template uses lead\'s preferred communication channel',
      },

      {
        id: 'stage_match',
        name: 'Lead Stage Match',
        priority: 60,
        condition: (characteristics, template) => {
          const stageMap: Record<string, TemplateCategory[]> = {
            'new': ['initial_contact'],
            'contacted': ['follow_up', 'initial_contact'],
            'qualified': ['follow_up', 'property_showing', 'proposal'],
            'showing': ['property_showing', 'proposal', 'negotiation'],
            'proposal': ['proposal', 'negotiation', 'closing'],
            'negotiating': ['negotiation', 'closing'],
            'closing': ['closing', 'thank_you'],
            'closed': ['thank_you'],
            'lost': ['re_engagement'],
            'nurture': ['nurturing', 're_engagement'],
          };

          const allowedCategories = stageMap[characteristics.leadStage] || [];
          return allowedCategories.includes(template.category);
        },
        score: (characteristics, template) => {
          const stageWeights: Record<string, number> = {
            'qualified': 15,
            'showing': 20,
            'proposal': 25,
            'negotiating': 20,
            'closing': 15,
            'new': 5,
            'contacted': 8,
            'lost': 3,
            'nurture': 5,
          };

          return stageWeights[characteristics.leadStage] || 0;
        },
        reasoning: 'Template matches current lead stage in sales funnel',
      },

      {
        id: 'content_preference_match',
        name: 'Content Preference Match',
        priority: 55,
        condition: (characteristics, template) => {
          const contentTypeMap: Record<string, string[]> = {
            'property_details': ['property', 'home', 'house', 'condo'],
            'market_updates': ['market', 'price', 'trend', 'analysis'],
            'lifestyle': ['neighborhood', 'community', 'lifestyle', 'amenities'],
            'investment': ['investment', 'roi', 'return', 'appreciation'],
          };

          const keywords = contentTypeMap[characteristics.preferredContentType] || [];
          const content = template.content.toLowerCase();

          return keywords.some(keyword => content.includes(keyword));
        },
        score: (characteristics, template) => {
          const contentTypeMap: Record<string, string[]> = {
            'property_details': ['property', 'home', 'house', 'condo'],
            'market_updates': ['market', 'price', 'trend', 'analysis'],
            'lifestyle': ['neighborhood', 'community', 'lifestyle', 'amenities'],
            'investment': ['investment', 'roi', 'return', 'appreciation'],
          };

          const keywords = contentTypeMap[characteristics.preferredContentType] || [];
          const content = template.content.toLowerCase();

          const matches = keywords.filter(keyword => content.includes(keyword)).length;
          return matches * 8; // 8 points per keyword match
        },
        reasoning: 'Template content matches lead\'s content preferences',
      },

      {
        id: 'performance_match',
        name: 'Performance-Based Match',
        priority: 50,
        condition: (characteristics, template) => {
          // Prefer templates with good performance metrics
          if (template.performance) {
            return template.performance.conversionRate > 0.01 || // At least 1% conversion
                   template.performance.openRate > 0.2; // At least 20% open rate
          }
          return true;
        },
        score: (characteristics, template) => {
          if (!template.performance) return 0;

          let score = 0;

          // Conversion rate scoring
          if (template.performance.conversionRate > 0.05) score += 10; // 5%+ conversion
          else if (template.performance.conversionRate > 0.02) score += 5; // 2%+ conversion

          // Open rate scoring
          if (template.performance.openRate > 0.4) score += 8; // 40%+ open rate
          else if (template.performance.openRate > 0.2) score += 4; // 20%+ open rate

          // Response rate scoring
          if (template.performance.responseRate > 0.15) score += 6; // 15%+ response rate
          else if (template.performance.responseRate > 0.08) score += 3; // 8%+ response rate

          return score;
        },
        reasoning: 'Template has proven performance metrics',
      },

      {
        id: 'recency_match',
        name: 'Recency Match',
        priority: 45,
        condition: (characteristics, template) => {
          const daysSinceContact = characteristics.daysSinceLastContact;

          if (daysSinceContact > 90) {
            return template.category === 're_engagement' || template.category === 'nurturing';
          }
          if (daysSinceContact > 30) {
            return template.category !== 'initial_contact';
          }

          return true;
        },
        score: (characteristics, template) => {
          const daysSinceContact = characteristics.daysSinceLastContact;

          if (daysSinceContact <= 7) return 10; // Recent contact
          if (daysSinceContact <= 30) return 5; // Within last month
          if (daysSinceContact <= 90) return 2; // Within last quarter
          return 0; // Stale contact
        },
        reasoning: 'Template appropriate for contact recency',
      },

      // Template Condition Matching
      {
        id: 'template_conditions',
        name: 'Template Conditions Match',
        priority: 40,
        condition: (characteristics, template) => {
          if (!template.conditions || template.conditions.length === 0) return true;

          return template.conditions.every(condition =>
            this.evaluateTemplateCondition(characteristics, condition)
          );
        },
        score: (characteristics, template) => {
          if (!template.conditions || template.conditions.length === 0) return 0;

          const matchedConditions = template.conditions.filter(condition =>
            this.evaluateTemplateCondition(characteristics, condition)
          );

          return matchedConditions.length * 5; // 5 points per matched condition
        },
        reasoning: 'Template conditions match lead characteristics',
      },
    ];

    // Sort rules by priority (highest first)
    this.matchingRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Find the best matching templates for given lead characteristics
   */
  public findMatches(
    characteristics: LeadCharacteristics,
    templates: CommunicationTemplate[],
    options: TemplateMatchingOptions = {}
  ): TemplateMatch[] {
    const {
      channel,
      category,
      maxResults = 5,
      minScore = 10,
      includeFallbacks = true,
    } = options;

    // Filter templates by basic criteria
    let filteredTemplates = templates.filter(template => {
      if (channel && template.channel !== channel) return false;
      if (category && template.category !== category) return false;
      if (template.status !== 'active') return false;
      return true;
    });

    // Calculate match scores for each template
    const matches: TemplateMatch[] = filteredTemplates.map(template => {
      const score = this.calculateMatchScore(characteristics, template);
      const confidence = this.calculateConfidence(score);
      const matchedConditions = this.getMatchedConditions(characteristics, template);
      const reasoning = this.getMatchReasoning(characteristics, template);

      return {
        template,
        score,
        confidence,
        matchedConditions,
        reasoning,
      };
    });

    // Sort by score (highest first)
    matches.sort((a, b) => b.score - a.score);

    // Filter by minimum score
    let finalMatches = matches.filter(match => match.score >= minScore);

    // If no matches meet minimum score and fallbacks are enabled, include some anyway
    if (finalMatches.length === 0 && includeFallbacks && matches.length > 0) {
      finalMatches = matches.slice(0, Math.min(3, matches.length));
    }

    return finalMatches.slice(0, maxResults);
  }

  /**
   * Calculate match score for a template
   */
  private calculateMatchScore(characteristics: LeadCharacteristics, template: CommunicationTemplate): number {
    let totalScore = 0;

    for (const rule of this.matchingRules) {
      if (rule.condition(characteristics, template)) {
        totalScore += rule.score(characteristics, template);
      }
    }

    // Cap at 100
    return Math.min(totalScore, 100);
  }

  /**
   * Calculate confidence in the match
   */
  private calculateConfidence(score: number): number {
    // Confidence based on score ranges
    if (score >= 80) return 95;
    if (score >= 60) return 85;
    if (score >= 40) return 70;
    if (score >= 20) return 50;
    return 30;
  }

  /**
   * Get list of matched conditions
   */
  private getMatchedConditions(characteristics: LeadCharacteristics, template: CommunicationTemplate): string[] {
    const matched: string[] = [];

    for (const rule of this.matchingRules) {
      if (rule.condition(characteristics, template)) {
        matched.push(rule.name);
      }
    }

    return matched;
  }

  /**
   * Get reasoning for the match
   */
  private getMatchReasoning(characteristics: LeadCharacteristics, template: CommunicationTemplate): string[] {
    const reasoning: string[] = [];

    for (const rule of this.matchingRules) {
      if (rule.condition(characteristics, template)) {
        reasoning.push(rule.reasoning);
      }
    }

    return reasoning;
  }

  /**
   * Evaluate a template condition against lead characteristics
   */
  private evaluateTemplateCondition(characteristics: LeadCharacteristics, condition: TemplateCondition): boolean {
    const { variable, operator, value } = condition;
    let characteristicValue: any;

    // Map template variable to lead characteristic
    switch (variable) {
      case 'leadScore':
        characteristicValue = characteristics.leadScore;
        break;
      case 'urgencyLevel':
        characteristicValue = characteristics.urgencyLevel;
        break;
      case 'timeline':
        characteristicValue = characteristics.timeline;
        break;
      case 'engagementLevel':
        characteristicValue = characteristics.engagementLevel;
        break;
      case 'propertyType':
        characteristicValue = characteristics.propertyType;
        break;
      case 'budget':
        characteristicValue = characteristics.budgetRange?.max || 0;
        break;
      case 'preferredChannel':
        characteristicValue = characteristics.preferredChannel;
        break;
      case 'daysSinceLastContact':
        characteristicValue = characteristics.daysSinceLastContact;
        break;
      default:
        return false;
    }

    // Evaluate condition
    switch (operator) {
      case 'equals':
        return characteristicValue === value;
      case 'contains':
        return String(characteristicValue).toLowerCase().includes(String(value).toLowerCase());
      case 'greater_than':
        return Number(characteristicValue) > Number(value);
      case 'less_than':
        return Number(characteristicValue) < Number(value);
      case 'between':
        const [min, max] = Array.isArray(value) ? value : [value, value];
        const numValue = Number(characteristicValue);
        return numValue >= Number(min) && numValue <= Number(max);
      default:
        return false;
    }
  }

  /**
   * Get the best template for given characteristics
   */
  public getBestMatch(
    characteristics: LeadCharacteristics,
    templates: CommunicationTemplate[],
    options: TemplateMatchingOptions = {}
  ): TemplateMatch | null {
    const matches = this.findMatches(characteristics, templates, { ...options, maxResults: 1 });

    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Get template recommendations with explanations
   */
  public getRecommendations(
    characteristics: LeadCharacteristics,
    templates: CommunicationTemplate[],
    options: TemplateMatchingOptions = {}
  ): {
    primary: TemplateMatch | null;
    alternatives: TemplateMatch[];
    suggestions: string[];
  } {
    const matches = this.findMatches(characteristics, templates, { ...options, maxResults: 10 });

    const suggestions: string[] = [];

    if (matches.length === 0) {
      suggestions.push('No suitable templates found. Consider creating templates for this lead profile.');
    } else if (matches[0].score < 30) {
      suggestions.push('Best match has low confidence. Consider improving lead data or template conditions.');
    }

    // Add suggestions based on characteristics
    if (characteristics.urgencyLevel === 'high' && !matches.some(m => m.template.category === 'initial_contact')) {
      suggestions.push('Consider creating immediate response templates for high-urgency leads.');
    }

    if (characteristics.engagementLevel === 'low' && !matches.some(m => m.template.category === 're_engagement')) {
      suggestions.push('Consider re-engagement templates for low-engagement leads.');
    }

    return {
      primary: matches.length > 0 ? matches[0] : null,
      alternatives: matches.slice(1),
      suggestions,
    };
  }

  /**
   * Add a custom matching rule
   */
  public addCustomRule(rule: MatchingRule): void {
    this.matchingRules.push(rule);
    this.matchingRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove a matching rule
   */
  public removeRule(ruleId: string): void {
    this.matchingRules = this.matchingRules.filter(rule => rule.id !== ruleId);
  }

  /**
   * Get all matching rules
   */
  public getRules(): MatchingRule[] {
    return [...this.matchingRules];
  }

  /**
   * Update rule priority
   */
  public updateRulePriority(ruleId: string, newPriority: number): void {
    const rule = this.matchingRules.find(r => r.id === ruleId);
    if (rule) {
      rule.priority = newPriority;
      this.matchingRules.sort((a, b) => b.priority - a.priority);
    }
  }
}

export const templateMatcher = TemplateMatcher.getInstance();