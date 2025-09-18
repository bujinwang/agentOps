import { CommunicationTemplate, TemplateCategory, CommunicationChannel } from '../types/template';
import { LeadCharacteristics } from './leadCharacteristicAnalyzer';

export interface FallbackTemplateResult {
  template: CommunicationTemplate | null;
  fallbackReason: string;
  confidence: number;
  alternatives: CommunicationTemplate[];
  suggestions: string[];
}

export interface FallbackStrategy {
  id: string;
  name: string;
  description: string;
  priority: number;
  condition: (characteristics: LeadCharacteristics, availableTemplates: CommunicationTemplate[]) => boolean;
  selector: (characteristics: LeadCharacteristics, availableTemplates: CommunicationTemplate[]) => CommunicationTemplate | null;
  reason: string;
}

class FallbackTemplateSelector {
  private static instance: FallbackTemplateSelector;
  private strategies: FallbackStrategy[] = [];

  private constructor() {
    this.initializeStrategies();
  }

  public static getInstance(): FallbackTemplateSelector {
    if (!FallbackTemplateSelector.instance) {
      FallbackTemplateSelector.instance = new FallbackTemplateSelector();
    }
    return FallbackTemplateSelector.instance;
  }

  /**
   * Initialize fallback strategies
   */
  private initializeStrategies(): void {
    this.strategies = [
      // Strategy 1: Category-based fallback (highest priority)
      {
        id: 'category_fallback',
        name: 'Category-Based Fallback',
        description: 'Find template in same category with different channel',
        priority: 100,
        condition: (characteristics, templates) => {
          // Always try category fallback first
          return templates.length > 0;
        },
        selector: (characteristics, templates) => {
          // Try to find template in preferred category but different channel
          const preferredCategory = this.inferPreferredCategory(characteristics);
          const categoryTemplates = templates.filter(t => t.category === preferredCategory);

          if (categoryTemplates.length > 0) {
            // Prefer email templates as fallback
            const emailTemplate = categoryTemplates.find(t => t.channel === 'email');
            if (emailTemplate) return emailTemplate;

            // Otherwise return first active template in category
            return categoryTemplates.find(t => t.status === 'active') || categoryTemplates[0];
          }

          return null;
        },
        reason: 'Found template in preferred category',
      },

      // Strategy 2: Channel-based fallback
      {
        id: 'channel_fallback',
        name: 'Channel-Based Fallback',
        description: 'Find template in preferred channel with different category',
        priority: 90,
        condition: (characteristics, templates) => {
          return templates.some(t => t.channel === characteristics.preferredChannel);
        },
        selector: (characteristics, templates) => {
          const channelTemplates = templates.filter(t => t.channel === characteristics.preferredChannel);

          if (channelTemplates.length > 0) {
            // Prefer follow-up or nurturing templates for channel fallback
            const preferredCategories: TemplateCategory[] = ['follow_up', 'nurturing', 'initial_contact'];

            for (const category of preferredCategories) {
              const template = channelTemplates.find(t => t.category === category && t.status === 'active');
              if (template) return template;
            }

            // Return first active template in preferred channel
            return channelTemplates.find(t => t.status === 'active') || channelTemplates[0];
          }

          return null;
        },
        reason: 'Found template in preferred communication channel',
      },

      // Strategy 3: Performance-based fallback
      {
        id: 'performance_fallback',
        name: 'Performance-Based Fallback',
        description: 'Select template with best performance metrics',
        priority: 80,
        condition: (characteristics, templates) => {
          return templates.some(t => t.performance && t.performance.conversionRate > 0);
        },
        selector: (characteristics, templates) => {
          // Sort templates by performance metrics
          const sortedTemplates = templates
            .filter(t => t.status === 'active')
            .sort((a, b) => {
              const aPerf = a.performance;
              const bPerf = b.performance;

              if (!aPerf && !bPerf) return 0;
              if (!aPerf) return 1;
              if (!bPerf) return -1;

              // Primary: conversion rate
              const convDiff = (bPerf.conversionRate || 0) - (aPerf.conversionRate || 0);
              if (convDiff !== 0) return convDiff;

              // Secondary: open rate
              const openDiff = (bPerf.openRate || 0) - (aPerf.openRate || 0);
              if (openDiff !== 0) return openDiff;

              // Tertiary: usage count
              return (bPerf.usageCount || 0) - (aPerf.usageCount || 0);
            });

          return sortedTemplates.length > 0 ? sortedTemplates[0] : null;
        },
        reason: 'Selected highest-performing template based on conversion metrics',
      },

      // Strategy 4: Generic category fallback
      {
        id: 'generic_category_fallback',
        name: 'Generic Category Fallback',
        description: 'Use generic templates when specific category not available',
        priority: 70,
        condition: (characteristics, templates) => {
          return templates.some(t => t.category === 'nurturing' || t.category === 'initial_contact');
        },
        selector: (characteristics, templates) => {
          // Prefer nurturing templates for generic fallback
          const nurturingTemplates = templates.filter(t =>
            t.category === 'nurturing' && t.status === 'active'
          );

          if (nurturingTemplates.length > 0) {
            return nurturingTemplates[0];
          }

          // Fallback to initial contact
          const initialContactTemplates = templates.filter(t =>
            t.category === 'initial_contact' && t.status === 'active'
          );

          if (initialContactTemplates.length > 0) {
            return initialContactTemplates[0];
          }

          return null;
        },
        reason: 'Using generic nurturing template as fallback',
      },

      // Strategy 5: Universal fallback (lowest priority)
      {
        id: 'universal_fallback',
        name: 'Universal Fallback',
        description: 'Use any available active template',
        priority: 10,
        condition: (characteristics, templates) => {
          return templates.some(t => t.status === 'active');
        },
        selector: (characteristics, templates) => {
          const activeTemplates = templates.filter(t => t.status === 'active');

          if (activeTemplates.length === 0) return null;

          // Prefer email channel for universal fallback
          const emailTemplates = activeTemplates.filter(t => t.channel === 'email');
          if (emailTemplates.length > 0) {
            return emailTemplates[0];
          }

          // Return first active template
          return activeTemplates[0];
        },
        reason: 'Using universal fallback template',
      },
    ];

    // Sort strategies by priority (highest first)
    this.strategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Select fallback template based on lead characteristics
   */
  public selectFallback(
    characteristics: LeadCharacteristics,
    availableTemplates: CommunicationTemplate[],
    preferredChannel?: CommunicationChannel,
    preferredCategory?: TemplateCategory
  ): FallbackTemplateResult {
    // Filter out inactive templates
    const activeTemplates = availableTemplates.filter(t => t.status === 'active');

    if (activeTemplates.length === 0) {
      return {
        template: null,
        fallbackReason: 'No active templates available',
        confidence: 0,
        alternatives: [],
        suggestions: [
          'Create at least one active template',
          'Check template status settings',
          'Verify template approval workflow',
        ],
      };
    }

    // Try each strategy in priority order
    for (const strategy of this.strategies) {
      if (strategy.condition(characteristics, activeTemplates)) {
        const template = strategy.selector(characteristics, activeTemplates);

        if (template) {
          const alternatives = this.findAlternatives(template, activeTemplates);
          const suggestions = this.generateSuggestions(characteristics, template, activeTemplates);

          return {
            template,
            fallbackReason: strategy.reason,
            confidence: this.calculateFallbackConfidence(strategy, characteristics),
            alternatives,
            suggestions,
          };
        }
      }
    }

    // If no strategy worked, return the first available template
    const fallbackTemplate = activeTemplates[0];

    return {
      template: fallbackTemplate,
      fallbackReason: 'No suitable fallback strategy found, using first available template',
      confidence: 20,
      alternatives: activeTemplates.slice(1, 4),
      suggestions: [
        'Consider creating more templates for better matching',
        'Review template categories and channels',
        'Check lead characteristic analysis for completeness',
      ],
    };
  }

  /**
   * Infer preferred category based on lead characteristics
   */
  private inferPreferredCategory(characteristics: LeadCharacteristics): TemplateCategory {
    // High urgency -> immediate contact
    if (characteristics.urgencyLevel === 'high') {
      return 'initial_contact';
    }

    // Low engagement -> nurturing
    if (characteristics.engagementLevel === 'low') {
      return 'nurturing';
    }

    // Stale contact -> re-engagement
    if (characteristics.daysSinceLastContact > 60) {
      return 're_engagement';
    }

    // High score -> proposal/follow-up
    if (characteristics.leadScore >= 80) {
      return 'proposal';
    }

    // Default to follow-up
    return 'follow_up';
  }

  /**
   * Find alternative templates
   */
  private findAlternatives(
    selectedTemplate: CommunicationTemplate,
    allTemplates: CommunicationTemplate[]
  ): CommunicationTemplate[] {
    return allTemplates
      .filter(t => t.id !== selectedTemplate.id && t.status === 'active')
      .sort((a, b) => {
        // Prefer same category
        if (a.category === selectedTemplate.category && b.category !== selectedTemplate.category) {
          return -1;
        }
        if (b.category === selectedTemplate.category && a.category !== selectedTemplate.category) {
          return 1;
        }

        // Then same channel
        if (a.channel === selectedTemplate.channel && b.channel !== selectedTemplate.channel) {
          return -1;
        }
        if (b.channel === selectedTemplate.channel && a.channel !== selectedTemplate.channel) {
          return 1;
        }

        // Finally by performance
        const aPerf = a.performance?.conversionRate || 0;
        const bPerf = b.performance?.conversionRate || 0;
        return bPerf - aPerf;
      })
      .slice(0, 3);
  }

  /**
   * Calculate fallback confidence
   */
  private calculateFallbackConfidence(
    strategy: FallbackStrategy,
    characteristics: LeadCharacteristics
  ): number {
    let confidence = strategy.priority / 2; // Base confidence from strategy priority

    // Adjust based on lead characteristics match
    if (characteristics.leadScore >= 70) confidence += 10;
    if (characteristics.engagementLevel === 'high') confidence += 5;
    if (characteristics.urgencyLevel === 'high') confidence += 5;

    // Cap at 80% for fallback templates
    return Math.min(confidence, 80);
  }

  /**
   * Generate suggestions for improvement
   */
  private generateSuggestions(
    characteristics: LeadCharacteristics,
    selectedTemplate: CommunicationTemplate,
    allTemplates: CommunicationTemplate[]
  ): string[] {
    const suggestions: string[] = [];

    // Check template coverage
    const categories = new Set(allTemplates.map(t => t.category));
    const channels = new Set(allTemplates.map(t => t.channel));

    const missingCategories = this.getMissingCategories(characteristics, categories);
    const missingChannels = this.getMissingChannels(characteristics, channels);

    if (missingCategories.length > 0) {
      suggestions.push(`Consider creating templates for categories: ${missingCategories.join(', ')}`);
    }

    if (missingChannels.length > 0) {
      suggestions.push(`Consider creating templates for channels: ${missingChannels.join(', ')}`);
    }

    // Check template performance
    const lowPerformingTemplates = allTemplates.filter(t =>
      t.performance && t.performance.conversionRate < 0.01
    );

    if (lowPerformingTemplates.length > 0) {
      suggestions.push('Some templates have low conversion rates - consider A/B testing improvements');
    }

    // Check template recency
    const staleTemplates = allTemplates.filter(t => {
      if (!t.updatedAt) return false;
      const daysSinceUpdate = (Date.now() - new Date(t.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 90;
    });

    if (staleTemplates.length > 0) {
      suggestions.push('Some templates are outdated - consider reviewing and updating content');
    }

    // Lead-specific suggestions
    if (characteristics.leadScore === 50) { // Default score indicates potentially incomplete data
      suggestions.push('Lead data may be incomplete - consider collecting more information for better matching');
    }

    if (characteristics.riskFactors.length > 0) {
      suggestions.push('Lead has risk factors - consider creating specialized templates for at-risk leads');
    }

    return suggestions;
  }

  /**
   * Get missing categories based on lead characteristics
   */
  private getMissingCategories(
    characteristics: LeadCharacteristics,
    availableCategories: Set<string>
  ): string[] {
    const neededCategories: TemplateCategory[] = [];

    if (characteristics.urgencyLevel === 'high' && !availableCategories.has('initial_contact')) {
      neededCategories.push('initial_contact');
    }

    if (characteristics.engagementLevel === 'low' && !availableCategories.has('nurturing')) {
      neededCategories.push('nurturing');
    }

    if (characteristics.daysSinceLastContact > 60 && !availableCategories.has('re_engagement')) {
      neededCategories.push('re_engagement');
    }

    if (characteristics.leadScore >= 80 && !availableCategories.has('proposal')) {
      neededCategories.push('proposal');
    }

    return neededCategories;
  }

  /**
   * Get missing channels based on lead characteristics
   */
  private getMissingChannels(
    characteristics: LeadCharacteristics,
    availableChannels: Set<string>
  ): string[] {
    const neededChannels: CommunicationChannel[] = [];

    const supportedChannels: CommunicationChannel[] = ['email', 'sms', 'in_app'];
    if (characteristics.preferredChannel &&
        supportedChannels.includes(characteristics.preferredChannel as CommunicationChannel) &&
        !availableChannels.has(characteristics.preferredChannel)) {
      neededChannels.push(characteristics.preferredChannel as CommunicationChannel);
    }

    // Always suggest having email as backup
    if (!availableChannels.has('email')) {
      neededChannels.push('email');
    }

    return neededChannels;
  }

  /**
   * Get fallback statistics
   */
  public getFallbackStats(): {
    totalStrategies: number;
    strategyUsage: Record<string, number>;
    averageConfidence: number;
    commonReasons: string[];
  } {
    // This would track actual usage in a real implementation
    return {
      totalStrategies: this.strategies.length,
      strategyUsage: {},
      averageConfidence: 50,
      commonReasons: [
        'Found template in preferred category',
        'Found template in preferred communication channel',
        'Selected highest-performing template',
        'Using generic nurturing template',
        'Using universal fallback template',
      ],
    };
  }

  /**
   * Add custom fallback strategy
   */
  public addCustomStrategy(strategy: FallbackStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove fallback strategy
   */
  public removeStrategy(strategyId: string): boolean {
    const initialLength = this.strategies.length;
    this.strategies = this.strategies.filter(s => s.id !== strategyId);
    return this.strategies.length < initialLength;
  }

  /**
   * Get all fallback strategies
   */
  public getStrategies(): FallbackStrategy[] {
    return [...this.strategies];
  }

  /**
   * Update strategy priority
   */
  public updateStrategyPriority(strategyId: string, newPriority: number): boolean {
    const strategy = this.strategies.find(s => s.id === strategyId);
    if (!strategy) return false;

    strategy.priority = newPriority;
    this.strategies.sort((a, b) => b.priority - a.priority);
    return true;
  }

  /**
   * Validate fallback setup
   */
  public validateSetup(templates: CommunicationTemplate[]): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const activeTemplates = templates.filter(t => t.status === 'active');

    if (activeTemplates.length === 0) {
      issues.push('No active templates available for fallback');
    }

    if (activeTemplates.length < 3) {
      recommendations.push('Consider having at least 3 active templates for better fallback options');
    }

    // Check category diversity
    const categories = new Set(activeTemplates.map(t => t.category));
    if (categories.size < 3) {
      recommendations.push('Consider templates in more categories for better fallback matching');
    }

    // Check channel diversity
    const channels = new Set(activeTemplates.map(t => t.channel));
    if (channels.size < 2) {
      recommendations.push('Consider templates in multiple channels for better fallback coverage');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }
}

export const fallbackTemplateSelector = FallbackTemplateSelector.getInstance();