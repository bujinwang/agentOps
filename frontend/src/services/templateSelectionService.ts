import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CommunicationTemplate,
  TemplateMatch,
  TemplateSelectionCriteria,
  TemplateCondition,
  ConditionOperator,
  TemplateRenderingContext,
  TemplateVariable
} from '../types/template';
import { templateVariableService } from './templateVariableService';

export interface TemplateScoringWeights {
  categoryMatch: number;      // 0-100
  conditionMatch: number;     // 0-100
  performanceScore: number;   // 0-100
  recencyBonus: number;       // 0-50
  priorityBonus: number;      // 0-50
}

export interface TemplateMatchResult {
  template: CommunicationTemplate;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  matchedConditions: string[];
  missingConditions: string[];
  variableCoverage: number;
  estimatedPerformance: {
    openRate: number;
    responseRate: number;
    conversionRate: number;
  };
}

class TemplateSelectionService {
  private static instance: TemplateSelectionService;
  private templates: Map<string, CommunicationTemplate> = new Map();
  private scoringWeights: TemplateScoringWeights;

  private constructor() {
    this.scoringWeights = {
      categoryMatch: 25,
      conditionMatch: 35,
      performanceScore: 25,
      recencyBonus: 10,
      priorityBonus: 5
    };
    this.initializeDefaultWeights();
    this.loadTemplates();
  }

  public static getInstance(): TemplateSelectionService {
    if (!TemplateSelectionService.instance) {
      TemplateSelectionService.instance = new TemplateSelectionService();
    }
    return TemplateSelectionService.instance;
  }

  private initializeDefaultWeights(): void {
    // Default scoring weights - can be customized per organization
    this.scoringWeights = {
      categoryMatch: 25,      // How well template category matches request
      conditionMatch: 35,     // How many conditions are satisfied
      performanceScore: 25,   // Historical performance of template
      recencyBonus: 10,       // Bonus for recently used templates
      priorityBonus: 5        // Template priority setting
    };
  }

  private async loadTemplates(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('communication-templates');
      if (stored) {
        const templateData = JSON.parse(stored);
        Object.entries(templateData).forEach(([id, template]: [string, any]) => {
          this.templates.set(id, template);
        });
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }

  private async saveTemplates(): Promise<void> {
    try {
      const templateData = Object.fromEntries(this.templates);
      await AsyncStorage.setItem('communication-templates', JSON.stringify(templateData));
    } catch (error) {
      console.error('Failed to save templates:', error);
    }
  }

  public async addTemplate(template: CommunicationTemplate): Promise<void> {
    this.templates.set(template.id, template);
    await this.saveTemplates();
  }

  public async updateTemplate(id: string, updates: Partial<CommunicationTemplate>): Promise<void> {
    const existing = this.templates.get(id);
    if (!existing) {
      throw new Error(`Template ${id} not found`);
    }

    const updated = { ...existing, ...updates };
    this.templates.set(id, updated);
    await this.saveTemplates();
  }

  public async deleteTemplate(id: string): Promise<void> {
    this.templates.delete(id);
    await this.saveTemplates();
  }

  public getTemplate(id: string): CommunicationTemplate | undefined {
    return this.templates.get(id);
  }

  public getAllTemplates(): CommunicationTemplate[] {
    return Array.from(this.templates.values());
  }

  public getTemplatesByCategory(category: string): CommunicationTemplate[] {
    return this.getAllTemplates().filter(t => t.category === category);
  }

  public getTemplatesByChannel(channel: string): CommunicationTemplate[] {
    return this.getAllTemplates().filter(t => t.channel === channel);
  }

  /**
   * Main template selection algorithm
   */
  public selectBestTemplate(
    criteria: TemplateSelectionCriteria,
    context?: TemplateRenderingContext
  ): TemplateMatchResult | null {
    const candidates = this.findCandidateTemplates(criteria);
    if (candidates.length === 0) {
      return null;
    }

    const scoredTemplates = candidates.map(template => this.scoreTemplate(template, criteria, context));
    scoredTemplates.sort((a, b) => b.score - a.score);

    const bestMatch = scoredTemplates[0];
    if (!bestMatch || bestMatch.score < (criteria.minScore || 0)) {
      return null;
    }

    return bestMatch;
  }

  /**
   * Get multiple template matches with ranking
   */
  public selectTemplates(
    criteria: TemplateSelectionCriteria,
    context?: TemplateRenderingContext,
    maxResults: number = 5
  ): TemplateMatchResult[] {
    const candidates = this.findCandidateTemplates(criteria);
    if (candidates.length === 0) {
      return [];
    }

    const scoredTemplates = candidates
      .map(template => this.scoreTemplate(template, criteria, context))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    return scoredTemplates.filter(result => result.score >= (criteria.minScore || 0));
  }

  /**
   * Find candidate templates based on basic criteria
   */
  private findCandidateTemplates(criteria: TemplateSelectionCriteria): CommunicationTemplate[] {
    let candidates = this.getAllTemplates().filter(template => {
      // Filter by status
      if (template.status !== 'active') {
        return false;
      }

      // Filter by category
      if (criteria.category && template.category !== criteria.category) {
        return false;
      }

      // Filter by channel
      if (criteria.channel && template.channel !== criteria.channel) {
        return false;
      }

      // Filter by excluded templates
      if (criteria.excludeTemplates?.includes(template.id)) {
        return false;
      }

      return true;
    });

    // If we have context, we can do more sophisticated filtering
    if (criteria.leadId || criteria.leadData) {
      candidates = candidates.filter(template => {
        return this.canPopulateTemplate(template, criteria);
      });
    }

    return candidates;
  }

  /**
   * Score a template based on multiple factors
   */
  private scoreTemplate(
    template: CommunicationTemplate,
    criteria: TemplateSelectionCriteria,
    context?: TemplateRenderingContext
  ): TemplateMatchResult {
    let totalScore = 0;
    const reasons: string[] = [];
    const matchedConditions: string[] = [];
    const missingConditions: string[] = [];

    // 1. Category match score
    const categoryScore = this.calculateCategoryMatch(template, criteria);
    totalScore += (categoryScore * this.scoringWeights.categoryMatch) / 100;
    if (categoryScore > 80) {
      reasons.push(`Excellent category match (${categoryScore}%)`);
    }

    // 2. Condition match score
    const conditionResult = this.evaluateConditions(template, criteria, context);
    const conditionScore = conditionResult.score;
    totalScore += (conditionScore * this.scoringWeights.conditionMatch) / 100;
    matchedConditions.push(...conditionResult.matched);
    missingConditions.push(...conditionResult.missing);

    if (conditionScore > 80) {
      reasons.push(`Strong condition match (${conditionResult.matched.length} conditions met)`);
    }

    // 3. Performance score
    const performanceScore = this.calculatePerformanceScore(template);
    totalScore += (performanceScore * this.scoringWeights.performanceScore) / 100;
    if (performanceScore > 70) {
      reasons.push(`Good historical performance (${performanceScore}%)`);
    }

    // 4. Recency bonus
    const recencyBonus = this.calculateRecencyBonus(template);
    totalScore += recencyBonus;
    if (recencyBonus > 0) {
      reasons.push(`Recent usage bonus (+${recencyBonus})`);
    }

    // 5. Priority bonus
    const priorityBonus = (template.priority / 10) * this.scoringWeights.priorityBonus;
    totalScore += priorityBonus;
    if (template.priority > 7) {
      reasons.push(`High priority template (+${priorityBonus})`);
    }

    // Calculate variable coverage
    const variableCoverage = this.calculateVariableCoverage(template, context);

    // Determine confidence level
    const confidence = this.determineConfidence(totalScore, conditionScore, variableCoverage);

    // Estimate performance
    const estimatedPerformance = this.estimatePerformance(template, conditionScore);

    return {
      template,
      score: Math.min(Math.max(totalScore, 0), 100),
      confidence,
      reasons,
      matchedConditions,
      missingConditions,
      variableCoverage,
      estimatedPerformance
    };
  }

  /**
   * Calculate how well template category matches the request
   */
  private calculateCategoryMatch(template: CommunicationTemplate, criteria: TemplateSelectionCriteria): number {
    if (!criteria.category) {
      return 50; // Neutral score if no category specified
    }

    if (template.category === criteria.category) {
      return 100;
    }

    // Check for related categories
    const categoryRelationships: Record<string, string[]> = {
      'initial_contact': ['follow_up'],
      'follow_up': ['initial_contact', 'nurturing'],
      'nurturing': ['follow_up', 're_engagement'],
      're_engagement': ['nurturing', 'follow_up']
    };

    const relatedCategories = categoryRelationships[criteria.category] || [];
    if (relatedCategories.includes(template.category)) {
      return 75;
    }

    return 25; // Low match for unrelated categories
  }

  /**
   * Evaluate template conditions against lead data
   */
  private evaluateConditions(
    template: CommunicationTemplate,
    criteria: TemplateSelectionCriteria,
    context?: TemplateRenderingContext
  ): { score: number; matched: string[]; missing: string[] } {
    if (template.conditions.length === 0) {
      return { score: 100, matched: [], missing: [] };
    }

    const matched: string[] = [];
    const missing: string[] = [];

    let totalWeight = 0;
    let matchedWeight = 0;

    template.conditions.forEach(condition => {
      totalWeight += condition.weight;

      if (this.evaluateCondition(condition, criteria, context)) {
        matched.push(`${condition.variable} ${condition.operator} ${condition.value}`);
        matchedWeight += condition.weight;
      } else {
        missing.push(`${condition.variable} ${condition.operator} ${condition.value}`);
      }
    });

    const score = totalWeight > 0 ? (matchedWeight / totalWeight) * 100 : 100;

    return { score, matched, missing };
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: TemplateCondition,
    criteria: TemplateSelectionCriteria,
    context?: TemplateRenderingContext
  ): boolean {
    // Get the value to test
    let testValue: any = null;

    // Try to get value from lead data first
    if (criteria.leadData) {
      testValue = this.getNestedValue(criteria.leadData, condition.variable);
    }

    // Fallback to context if available
    if (testValue === null && context) {
      testValue = this.getContextValue(condition.variable, context);
    }

    // If we can't get a value, check for "exists" conditions
    if (testValue === null) {
      return condition.operator === 'not_exists';
    }

    // Evaluate based on operator
    switch (condition.operator) {
      case 'equals':
        return testValue === condition.value;
      case 'not_equals':
        return testValue !== condition.value;
      case 'contains':
        return String(testValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'not_contains':
        return !String(testValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'greater_than':
        return Number(testValue) > Number(condition.value);
      case 'less_than':
        return Number(testValue) < Number(condition.value);
      case 'between':
        const [min, max] = condition.value;
        const numValue = Number(testValue);
        return numValue >= min && numValue <= max;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(testValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(testValue);
      case 'exists':
        return testValue !== null && testValue !== undefined;
      case 'not_exists':
        return testValue === null || testValue === undefined;
      default:
        return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get value from template rendering context
   */
  private getContextValue(variableName: string, context: TemplateRenderingContext): any {
    const definition = templateVariableService.getVariableDefinition(variableName);
    if (!definition) {
      return null;
    }

    switch (definition.source) {
      case 'lead':
        return context.lead?.[variableName] || context.lead?.[this.mapVariableToField(variableName)];
      case 'property':
        return context.property?.[variableName];
      case 'agent':
        return context.agent?.[variableName];
      case 'system':
        return this.getSystemValue(variableName);
      case 'custom':
        return context.custom?.[variableName];
      default:
        return null;
    }
  }

  /**
   * Map template variable to actual field name
   */
  private mapVariableToField(variableName: string): string {
    const fieldMappings: Record<string, string> = {
      'leadName': 'full_name',
      'leadFirstName': 'first_name',
      'leadLastName': 'last_name',
      'leadEmail': 'email',
      'leadPhone': 'phone',
      'leadScore': 'score',
      'leadStage': 'stage',
      'leadBudget': 'budget',
      'leadPropertyType': 'property_type',
      'leadBedrooms': 'bedrooms',
      'leadBathrooms': 'bathrooms',
      'leadLocation': 'location',
      'leadTimeline': 'timeline'
    };

    return fieldMappings[variableName] || variableName;
  }

  /**
   * Get system-level values
   */
  private getSystemValue(variableName: string): any {
    switch (variableName) {
      case 'currentDate':
        return new Date().toLocaleDateString();
      case 'currentTime':
        return new Date().toLocaleTimeString();
      default:
        return null;
    }
  }

  /**
   * Calculate template performance score
   */
  private calculatePerformanceScore(template: CommunicationTemplate): number {
    if (!template.performance) {
      return 50; // Neutral score for new templates
    }

    const perf = template.performance;
    if (perf.usageCount === 0) {
      return 50;
    }

    // Weighted score based on key metrics
    const openScore = perf.openRate * 0.3;
    const responseScore = perf.responseRate * 0.4;
    const conversionScore = perf.conversionRate * 0.3;

    return Math.min(openScore + responseScore + conversionScore, 100);
  }

  /**
   * Calculate recency bonus for recently used templates
   */
  private calculateRecencyBonus(template: CommunicationTemplate): number {
    if (!template.performance?.lastUsed) {
      return 0;
    }

    const daysSinceUsed = (Date.now() - new Date(template.performance.lastUsed).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceUsed <= 7) {
      return this.scoringWeights.recencyBonus; // Full bonus for last 7 days
    } else if (daysSinceUsed <= 30) {
      return this.scoringWeights.recencyBonus * 0.5; // Half bonus for last 30 days
    }

    return 0;
  }

  /**
   * Calculate variable coverage percentage
   */
  private calculateVariableCoverage(template: CommunicationTemplate, context?: TemplateRenderingContext): number {
    if (template.variables.length === 0) {
      return 100;
    }

    let coveredCount = 0;

    template.variables.forEach(variable => {
      const definition = templateVariableService.getVariableDefinition(variable.name);
      if (!definition) {
        return; // Skip unknown variables
      }

      let value: any = null;

      if (context) {
        value = this.getContextValue(variable.name, context);
      }

      // Check if we can get a value
      if (value !== null && value !== undefined) {
        coveredCount++;
      } else if (!variable.required) {
        // Non-required variables with fallbacks are considered covered
        coveredCount++;
      }
    });

    return (coveredCount / template.variables.length) * 100;
  }

  /**
   * Determine confidence level for the match
   */
  private determineConfidence(score: number, conditionScore: number, variableCoverage: number): 'high' | 'medium' | 'low' {
    const avgScore = (score + conditionScore + variableCoverage) / 3;

    if (avgScore >= 80) {
      return 'high';
    } else if (avgScore >= 60) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Estimate performance for this template in current context
   */
  private estimatePerformance(template: CommunicationTemplate, conditionMatch: number): {
    openRate: number;
    responseRate: number;
    conversionRate: number;
  } {
    if (!template.performance) {
      return { openRate: 25, responseRate: 15, conversionRate: 5 };
    }

    // Adjust performance based on condition match
    const adjustmentFactor = conditionMatch / 100;
    const basePerf = template.performance;

    return {
      openRate: Math.min(basePerf.openRate * adjustmentFactor, 100),
      responseRate: Math.min(basePerf.responseRate * adjustmentFactor, 100),
      conversionRate: Math.min(basePerf.conversionRate * adjustmentFactor, 100)
    };
  }

  /**
   * Check if template can be populated with available data
   */
  private canPopulateTemplate(template: CommunicationTemplate, criteria: TemplateSelectionCriteria): boolean {
    // Check required variables
    const requiredVariables = template.variables.filter(v => v.required);

    for (const variable of requiredVariables) {
      let hasValue = false;

      // Check lead data
      if (criteria.leadData) {
        const value = this.getNestedValue(criteria.leadData, variable.name);
        if (value !== null && value !== undefined) {
          hasValue = true;
        }
      }

      if (!hasValue) {
        return false; // Required variable cannot be populated
      }
    }

    return true;
  }

  /**
   * Update scoring weights
   */
  public updateScoringWeights(weights: Partial<TemplateScoringWeights>): void {
    this.scoringWeights = { ...this.scoringWeights, ...weights };
  }

  /**
   * Get current scoring weights
   */
  public getScoringWeights(): TemplateScoringWeights {
    return { ...this.scoringWeights };
  }

  /**
   * Get template recommendations for a lead
   */
  public getRecommendations(
    leadId: number,
    leadData: Record<string, any>,
    category: string,
    channel: string,
    context?: Record<string, any>
  ): TemplateMatchResult[] {
    const criteria: TemplateSelectionCriteria = {
      leadId,
      leadData,
      category: category as any,
      channel: channel as any,
      context,
      maxResults: 3
    };

    return this.selectTemplates(criteria);
  }

  /**
   * Get fallback template for when no good matches are found
   */
  public getFallbackTemplate(category: string, channel: string): CommunicationTemplate | null {
    const templates = this.getAllTemplates().filter(t =>
      t.category === category &&
      t.channel === channel &&
      t.status === 'active' &&
      t.isDefault
    );

    return templates.length > 0 ? templates[0] : null;
  }
}

export const templateSelectionService = TemplateSelectionService.getInstance();
export default templateSelectionService;