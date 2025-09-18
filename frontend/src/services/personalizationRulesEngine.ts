import { CommunicationTemplate, TemplateCondition, TemplateCategory, CommunicationChannel } from '../types/template';
import { LeadCharacteristics } from './leadCharacteristicAnalyzer';

export interface PersonalizationRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  isActive: boolean;
  category: 'scoring' | 'filtering' | 'modification' | 'fallback';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  performance?: {
    matches: number;
    conversions: number;
    effectiveness: number;
  };
}

export interface RuleCondition {
  type: 'lead_property' | 'template_property' | 'context_property' | 'time_based' | 'performance_based';
  property: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'between' | 'in' | 'not_in';
  value: any;
  weight?: number;
}

export interface RuleAction {
  type: 'boost_score' | 'reduce_score' | 'set_category' | 'set_channel' | 'add_tag' | 'remove_tag' | 'modify_content' | 'set_fallback';
  value: any;
  reason?: string;
}

export interface RuleEvaluationResult {
  rule: PersonalizationRule;
  matched: boolean;
  score: number;
  actions: RuleAction[];
  reasoning: string[];
}

export interface RulesEngineOptions {
  maxRules?: number;
  enablePerformanceTracking?: boolean;
  categoryWeights?: Record<string, number>;
}

class PersonalizationRulesEngine {
  private static instance: PersonalizationRulesEngine;
  private rules: Map<string, PersonalizationRule> = new Map();
  private ruleExecutionCache: Map<string, RuleEvaluationResult[]> = new Map();

  private constructor() {
    this.initializeDefaultRules();
  }

  public static getInstance(): PersonalizationRulesEngine {
    if (!PersonalizationRulesEngine.instance) {
      PersonalizationRulesEngine.instance = new PersonalizationRulesEngine();
    }
    return PersonalizationRulesEngine.instance;
  }

  /**
   * Initialize default personalization rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: PersonalizationRule[] = [
      // High-priority scoring rules
      {
        id: 'high_score_boost',
        name: 'High Lead Score Premium Boost',
        description: 'Boost premium templates for high-scoring leads',
        priority: 100,
        conditions: [
          {
            type: 'lead_property',
            property: 'leadScore',
            operator: 'greater_than',
            value: 80,
            weight: 1.0,
          },
        ],
        actions: [
          {
            type: 'boost_score',
            value: 25,
            reason: 'High lead score indicates premium content preference',
          },
        ],
        isActive: true,
        category: 'scoring',
        tags: ['premium', 'scoring'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      {
        id: 'urgent_timeline_priority',
        name: 'Urgent Timeline Priority',
        description: 'Prioritize immediate response for urgent leads',
        priority: 95,
        conditions: [
          {
            type: 'lead_property',
            property: 'urgencyLevel',
            operator: 'equals',
            value: 'high',
            weight: 1.0,
          },
        ],
        actions: [
          {
            type: 'set_category',
            value: 'initial_contact',
            reason: 'Urgent leads need immediate attention',
          },
          {
            type: 'boost_score',
            value: 20,
            reason: 'Urgency requires immediate response',
          },
        ],
        isActive: true,
        category: 'filtering',
        tags: ['urgency', 'timeline'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      {
        id: 'low_engagement_nurture',
        name: 'Low Engagement Nurture Focus',
        description: 'Focus on nurturing content for low engagement leads',
        priority: 90,
        conditions: [
          {
            type: 'lead_property',
            property: 'engagementLevel',
            operator: 'equals',
            value: 'low',
            weight: 1.0,
          },
        ],
        actions: [
          {
            type: 'set_category',
            value: 'nurturing',
            reason: 'Low engagement leads need nurturing content',
          },
          {
            type: 'add_tag',
            value: 're-engagement',
            reason: 'Focus on re-establishing connection',
          },
        ],
        isActive: true,
        category: 'filtering',
        tags: ['engagement', 'nurturing'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      {
        id: 'stale_contact_reengagement',
        name: 'Stale Contact Re-engagement',
        description: 'Use re-engagement templates for stale contacts',
        priority: 85,
        conditions: [
          {
            type: 'lead_property',
            property: 'daysSinceLastContact',
            operator: 'greater_than',
            value: 60,
            weight: 1.0,
          },
        ],
        actions: [
          {
            type: 'set_category',
            value: 're_engagement',
            reason: 'Stale contact needs re-engagement strategy',
          },
          {
            type: 'reduce_score',
            value: 10,
            reason: 'Stale contacts may be less responsive',
          },
        ],
        isActive: true,
        category: 'filtering',
        tags: ['recency', 're-engagement'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      {
        id: 'premium_budget_luxury',
        name: 'Premium Budget Luxury Content',
        description: 'Show luxury content for high budget leads',
        priority: 80,
        conditions: [
          {
            type: 'lead_property',
            property: 'budgetRange.max',
            operator: 'greater_than',
            value: 750000,
            weight: 1.0,
          },
        ],
        actions: [
          {
            type: 'add_tag',
            value: 'luxury',
            reason: 'High budget indicates luxury property interest',
          },
          {
            type: 'boost_score',
            value: 15,
            reason: 'Premium budget matches premium content',
          },
        ],
        isActive: true,
        category: 'modification',
        tags: ['budget', 'luxury'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      {
        id: 'investor_focus',
        name: 'Investor Focus Content',
        description: 'Tailor content for investor leads',
        priority: 75,
        conditions: [
          {
            type: 'lead_property',
            property: 'familyStatus',
            operator: 'equals',
            value: 'investor',
            weight: 1.0,
          },
        ],
        actions: [
          {
            type: 'add_tag',
            value: 'investment',
            reason: 'Investors need ROI-focused content',
          },
          {
            type: 'set_category',
            value: 'proposal',
            reason: 'Investors respond to detailed proposals',
          },
        ],
        isActive: true,
        category: 'modification',
        tags: ['investor', 'roi'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      {
        id: 'channel_preference_boost',
        name: 'Channel Preference Boost',
        description: 'Boost templates matching preferred channel',
        priority: 70,
        conditions: [
          {
            type: 'lead_property',
            property: 'preferredChannel',
            operator: 'equals',
            value: 'email', // This will be dynamic
            weight: 1.0,
          },
        ],
        actions: [
          {
            type: 'boost_score',
            value: 10,
            reason: 'Matches lead\'s preferred communication channel',
          },
        ],
        isActive: true,
        category: 'scoring',
        tags: ['channel', 'preference'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      {
        id: 'performance_based_boost',
        name: 'Performance-Based Template Boost',
        description: 'Boost templates with proven performance',
        priority: 65,
        conditions: [
          {
            type: 'template_property',
            property: 'performance.conversionRate',
            operator: 'greater_than',
            value: 0.03,
            weight: 1.0,
          },
        ],
        actions: [
          {
            type: 'boost_score',
            value: 12,
            reason: 'Template has proven conversion performance',
          },
        ],
        isActive: true,
        category: 'scoring',
        tags: ['performance', 'conversion'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      {
        id: 'time_based_evening_boost',
        name: 'Evening Contact Time Boost',
        description: 'Boost templates for evening contact preference',
        priority: 60,
        conditions: [
          {
            type: 'lead_property',
            property: 'bestTimeToContact',
            operator: 'equals',
            value: 'evening',
            weight: 1.0,
          },
          {
            type: 'time_based',
            property: 'current_hour',
            operator: 'between',
            value: [17, 21], // 5 PM to 9 PM
            weight: 0.5,
          },
        ],
        actions: [
          {
            type: 'boost_score',
            value: 8,
            reason: 'Optimal contact time for lead',
          },
        ],
        isActive: true,
        category: 'scoring',
        tags: ['timing', 'contact'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // Fallback rules
      {
        id: 'fallback_generic',
        name: 'Generic Fallback Template',
        description: 'Fallback to generic template when no match found',
        priority: 10,
        conditions: [
          {
            type: 'context_property',
            property: 'no_matches_found',
            operator: 'equals',
            value: true,
            weight: 1.0,
          },
        ],
        actions: [
          {
            type: 'set_fallback',
            value: 'generic_welcome',
            reason: 'No specific match found, using generic template',
          },
        ],
        isActive: true,
        category: 'fallback',
        tags: ['fallback', 'generic'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultRules.forEach(rule => this.rules.set(rule.id, rule));
  }

  /**
   * Evaluate all active rules against lead characteristics and template
   */
  public evaluateRules(
    characteristics: LeadCharacteristics,
    template: CommunicationTemplate,
    context?: Record<string, any>
  ): RuleEvaluationResult[] {
    const cacheKey = this.createCacheKey(characteristics, template, context);
    const cached = this.ruleExecutionCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const results: RuleEvaluationResult[] = [];
    const activeRules = Array.from(this.rules.values())
      .filter(rule => rule.isActive)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of activeRules) {
      const result = this.evaluateRule(rule, characteristics, template, context);
      if (result.matched) {
        results.push(result);
      }
    }

    // Cache results
    this.ruleExecutionCache.set(cacheKey, results);

    return results;
  }

  /**
   * Evaluate a single rule
   */
  private evaluateRule(
    rule: PersonalizationRule,
    characteristics: LeadCharacteristics,
    template: CommunicationTemplate,
    context?: Record<string, any>
  ): RuleEvaluationResult {
    let totalScore = 0;
    let totalWeight = 0;
    const reasoning: string[] = [];

    for (const condition of rule.conditions) {
      const conditionMet = this.evaluateCondition(condition, characteristics, template, context);
      const weight = condition.weight || 1.0;

      if (conditionMet) {
        totalScore += weight;
        reasoning.push(`✓ ${condition.property} ${condition.operator} ${condition.value}`);
      } else {
        reasoning.push(`✗ ${condition.property} ${condition.operator} ${condition.value}`);
      }

      totalWeight += weight;
    }

    const matched = totalScore >= (totalWeight * 0.8); // 80% of conditions must match
    const finalScore = matched ? (totalScore / totalWeight) * 100 : 0;

    return {
      rule,
      matched,
      score: finalScore,
      actions: matched ? rule.actions : [],
      reasoning,
    };
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: RuleCondition,
    characteristics: LeadCharacteristics,
    template: CommunicationTemplate,
    context?: Record<string, any>
  ): boolean {
    let actualValue: any;

    // Get the actual value based on condition type
    switch (condition.type) {
      case 'lead_property':
        actualValue = this.getLeadPropertyValue(characteristics, condition.property);
        break;
      case 'template_property':
        actualValue = this.getTemplatePropertyValue(template, condition.property);
        break;
      case 'context_property':
        actualValue = context?.[condition.property];
        break;
      case 'time_based':
        actualValue = this.getTimeBasedValue(condition.property);
        break;
      case 'performance_based':
        actualValue = this.getPerformanceValue(characteristics, template, condition.property);
        break;
      default:
        return false;
    }

    // Evaluate the condition
    return this.evaluateOperator(actualValue, condition.operator, condition.value);
  }

  /**
   * Get lead property value
   */
  private getLeadPropertyValue(characteristics: LeadCharacteristics, property: string): any {
    const propertyMap: Record<string, any> = {
      'leadScore': characteristics.leadScore,
      'leadStage': characteristics.leadStage,
      'engagementLevel': characteristics.engagementLevel,
      'timeline': characteristics.timeline,
      'urgencyLevel': characteristics.urgencyLevel,
      'daysSinceLastContact': characteristics.daysSinceLastContact,
      'totalInteractions': characteristics.totalInteractions,
      'responseRate': characteristics.responseRate,
      'preferredChannel': characteristics.preferredChannel,
      'budgetRange.max': characteristics.budgetRange?.max,
      'budgetRange.min': characteristics.budgetRange?.min,
      'propertyType': characteristics.propertyType,
      'familyStatus': characteristics.familyStatus,
      'bestTimeToContact': characteristics.bestTimeToContact,
      'communicationFrequency': characteristics.communicationFrequency,
      'preferredContentType': characteristics.preferredContentType,
    };

    return propertyMap[property];
  }

  /**
   * Get template property value
   */
  private getTemplatePropertyValue(template: CommunicationTemplate, property: string): any {
    const propertyMap: Record<string, any> = {
      'category': template.category,
      'channel': template.channel,
      'status': template.status,
      'performance.conversionRate': template.performance?.conversionRate,
      'performance.openRate': template.performance?.openRate,
      'performance.responseRate': template.performance?.responseRate,
      'performance.usageCount': template.performance?.usageCount,
    };

    return propertyMap[property];
  }

  /**
   * Get time-based value
   */
  private getTimeBasedValue(property: string): any {
    const now = new Date();

    switch (property) {
      case 'current_hour':
        return now.getHours();
      case 'current_day':
        return now.getDay(); // 0 = Sunday, 6 = Saturday
      case 'current_month':
        return now.getMonth();
      case 'is_weekend':
        return now.getDay() === 0 || now.getDay() === 6;
      case 'is_business_hours':
        const hour = now.getHours();
        return hour >= 9 && hour <= 17 && now.getDay() >= 1 && now.getDay() <= 5;
      default:
        return null;
    }
  }

  /**
   * Get performance-based value
   */
  private getPerformanceValue(
    characteristics: LeadCharacteristics,
    template: CommunicationTemplate,
    property: string
  ): any {
    // This could integrate with historical performance data
    // For now, return template performance metrics
    return this.getTemplatePropertyValue(template, property);
  }

  /**
   * Evaluate operator
   */
  private evaluateOperator(actualValue: any, operator: string, expectedValue: any): boolean {
    if (actualValue === null || actualValue === undefined) {
      return false;
    }

    switch (operator) {
      case 'equals':
        return actualValue === expectedValue;
      case 'not_equals':
        return actualValue !== expectedValue;
      case 'greater_than':
        return Number(actualValue) > Number(expectedValue);
      case 'less_than':
        return Number(actualValue) < Number(expectedValue);
      case 'contains':
        return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
      case 'not_contains':
        return !String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
      case 'between':
        const [min, max] = Array.isArray(expectedValue) ? expectedValue : [expectedValue, expectedValue];
        const numValue = Number(actualValue);
        return numValue >= Number(min) && numValue <= Number(max);
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
      case 'not_in':
        return !Array.isArray(expectedValue) || !expectedValue.includes(actualValue);
      default:
        return false;
    }
  }

  /**
   * Apply rule actions to template matching results
   */
  public applyRuleActions(
    template: CommunicationTemplate,
    ruleResults: RuleEvaluationResult[],
    baseScore: number
  ): {
    modifiedTemplate: CommunicationTemplate;
    finalScore: number;
    appliedActions: RuleAction[];
    reasoning: string[];
  } {
    let modifiedTemplate = { ...template };
    let finalScore = baseScore;
    const appliedActions: RuleAction[] = [];
    const reasoning: string[] = [];

    // Sort rule results by priority
    const sortedResults = ruleResults.sort((a, b) => b.rule.priority - a.rule.priority);

    for (const result of sortedResults) {
      for (const action of result.actions) {
        appliedActions.push(action);

        switch (action.type) {
          case 'boost_score':
            finalScore += action.value;
            reasoning.push(`+${action.value} points: ${action.reason}`);
            break;
          case 'reduce_score':
            finalScore -= action.value;
            reasoning.push(`-${action.value} points: ${action.reason}`);
            break;
          case 'set_category':
            modifiedTemplate.category = action.value;
            reasoning.push(`Category changed to ${action.value}: ${action.reason}`);
            break;
          case 'set_channel':
            modifiedTemplate.channel = action.value;
            reasoning.push(`Channel changed to ${action.value}: ${action.reason}`);
            break;
          case 'add_tag':
            if (!modifiedTemplate.tags.includes(action.value)) {
              modifiedTemplate.tags = [...modifiedTemplate.tags, action.value];
              reasoning.push(`Tag added: ${action.value} - ${action.reason}`);
            }
            break;
          case 'remove_tag':
            modifiedTemplate.tags = modifiedTemplate.tags.filter(tag => tag !== action.value);
            reasoning.push(`Tag removed: ${action.value} - ${action.reason}`);
            break;
          case 'modify_content':
            // This would require more complex content modification logic
            reasoning.push(`Content modification: ${action.reason}`);
            break;
        }
      }
    }

    // Cap final score at 100
    finalScore = Math.min(Math.max(finalScore, 0), 100);

    return {
      modifiedTemplate,
      finalScore,
      appliedActions,
      reasoning,
    };
  }

  /**
   * Create cache key for rule evaluation
   */
  private createCacheKey(
    characteristics: LeadCharacteristics,
    template: CommunicationTemplate,
    context?: Record<string, any>
  ): string {
    const keyParts = [
      characteristics.leadScore,
      characteristics.leadStage,
      characteristics.engagementLevel,
      template.id,
      template.category,
      template.channel,
      JSON.stringify(context || {}),
    ];

    return keyParts.join('|');
  }

  /**
   * Add a new personalization rule
   */
  public addRule(rule: Omit<PersonalizationRule, 'createdAt' | 'updatedAt'>): string {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRule: PersonalizationRule = {
      ...rule,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rules.set(id, newRule);
    this.clearCache();

    return id;
  }

  /**
   * Update an existing rule
   */
  public updateRule(id: string, updates: Partial<PersonalizationRule>): boolean {
    const existingRule = this.rules.get(id);
    if (!existingRule) return false;

    const updatedRule = {
      ...existingRule,
      ...updates,
      updatedAt: new Date(),
    };

    this.rules.set(id, updatedRule);
    this.clearCache();

    return true;
  }

  /**
   * Delete a rule
   */
  public deleteRule(id: string): boolean {
    const deleted = this.rules.delete(id);
    if (deleted) {
      this.clearCache();
    }
    return deleted;
  }

  /**
   * Get all rules
   */
  public getRules(category?: string): PersonalizationRule[] {
    const rules = Array.from(this.rules.values());

    if (category) {
      return rules.filter(rule => rule.category === category);
    }

    return rules;
  }

  /**
   * Get rule by ID
   */
  public getRule(id: string): PersonalizationRule | null {
    return this.rules.get(id) || null;
  }

  /**
   * Enable/disable a rule
   */
  public toggleRule(id: string): boolean {
    const rule = this.rules.get(id);
    if (!rule) return false;

    rule.isActive = !rule.isActive;
    rule.updatedAt = new Date();
    this.clearCache();

    return true;
  }

  /**
   * Clear execution cache
   */
  public clearCache(): void {
    this.ruleExecutionCache.clear();
  }

  /**
   * Get rule performance statistics
   */
  public getRulePerformance(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [id, rule] of this.rules) {
      stats[id] = {
        name: rule.name,
        category: rule.category,
        isActive: rule.isActive,
        priority: rule.priority,
        performance: rule.performance || {
          matches: 0,
          conversions: 0,
          effectiveness: 0,
        },
      };
    }

    return stats;
  }

  /**
   * Validate rule configuration
   */
  public validateRule(rule: Partial<PersonalizationRule>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rule.name || rule.name.trim().length === 0) {
      errors.push('Rule name is required');
    }

    if (!rule.conditions || rule.conditions.length === 0) {
      errors.push('At least one condition is required');
    }

    if (!rule.actions || rule.actions.length === 0) {
      errors.push('At least one action is required');
    }

    if (rule.priority !== undefined && (rule.priority < 0 || rule.priority > 100)) {
      errors.push('Priority must be between 0 and 100');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const personalizationRulesEngine = PersonalizationRulesEngine.getInstance();