import { CommunicationTemplate, ABTestVariant, TemplateVariable, TemplateCondition } from '../types/template';

export interface TemplateVariation {
  id: string;
  baseTemplateId: string;
  name: string;
  description: string;
  changes: VariationChange[];
  subject?: string;
  content: string;
  variables: TemplateVariable[];
  conditions: TemplateCondition[];
  isActive: boolean;
  performance?: {
    impressions: number;
    conversions: number;
    conversionRate: number;
    lastUpdated: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VariationChange {
  type: 'content' | 'subject' | 'variable' | 'condition' | 'style';
  field: string;
  oldValue: any;
  newValue: any;
  description: string;
}

export interface VariationSuggestion {
  type: 'content' | 'subject' | 'structure' | 'call_to_action';
  description: string;
  confidence: number;
  expectedImpact: 'low' | 'medium' | 'high';
  implementation: {
    field: string;
    changes: VariationChange[];
  };
}

export interface VariationComparison {
  baseTemplate: CommunicationTemplate;
  variations: TemplateVariation[];
  metrics: {
    field: string;
    baseValue: any;
    variations: Record<string, any>;
    bestPerformer?: string;
  }[];
}

class TemplateVariationService {
  private static instance: TemplateVariationService;
  private variations: Map<string, TemplateVariation[]> = new Map();

  private constructor() {}

  public static getInstance(): TemplateVariationService {
    if (!TemplateVariationService.instance) {
      TemplateVariationService.instance = new TemplateVariationService();
    }
    return TemplateVariationService.instance;
  }

  /**
   * Create a new template variation
   */
  public createVariation(
    baseTemplate: CommunicationTemplate,
    changes: VariationChange[],
    name?: string,
    description?: string
  ): TemplateVariation {
    const variationId = `variation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Apply changes to create new content
    const { subject, content, variables, conditions } = this.applyChanges(baseTemplate, changes);

    const variation: TemplateVariation = {
      id: variationId,
      baseTemplateId: baseTemplate.id,
      name: name || `Variation of ${baseTemplate.name}`,
      description: description || `A/B test variation with ${changes.length} modifications`,
      changes,
      subject,
      content,
      variables,
      conditions,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store variation
    const templateVariations = this.variations.get(baseTemplate.id) || [];
    templateVariations.push(variation);
    this.variations.set(baseTemplate.id, templateVariations);

    return variation;
  }

  /**
   * Generate suggested variations for A/B testing
   */
  public generateSuggestions(
    template: CommunicationTemplate,
    targetMetric: 'open_rate' | 'click_rate' | 'response_rate' | 'conversion_rate',
    count: number = 3
  ): VariationSuggestion[] {
    const suggestions: VariationSuggestion[] = [];

    // Content-based suggestions
    if (targetMetric === 'open_rate') {
      suggestions.push(
        {
          type: 'subject',
          description: 'Add urgency words to subject line',
          confidence: 0.8,
          expectedImpact: 'high',
          implementation: {
            field: 'subject',
            changes: [{
              type: 'subject',
              field: 'subject',
              oldValue: template.subject,
              newValue: this.addUrgencyToSubject(template.subject || ''),
              description: 'Added urgency words like "Limited Time" or "Act Now"',
            }],
          },
        },
        {
          type: 'subject',
          description: 'Personalize subject line with lead name',
          confidence: 0.7,
          expectedImpact: 'medium',
          implementation: {
            field: 'subject',
            changes: [{
              type: 'subject',
              field: 'subject',
              oldValue: template.subject,
              newValue: this.personalizeSubject(template.subject || ''),
              description: 'Added lead name personalization to subject',
            }],
          },
        }
      );
    }

    if (targetMetric === 'click_rate' || targetMetric === 'conversion_rate') {
      suggestions.push(
        {
          type: 'call_to_action',
          description: 'Make call-to-action more prominent',
          confidence: 0.75,
          expectedImpact: 'high',
          implementation: {
            field: 'content',
            changes: [{
              type: 'content',
              field: 'content',
              oldValue: template.content,
              newValue: this.enhanceCallToAction(template.content),
              description: 'Enhanced call-to-action with stronger language and visual prominence',
            }],
          },
        },
        {
          type: 'content',
          description: 'Add social proof elements',
          confidence: 0.6,
          expectedImpact: 'medium',
          implementation: {
            field: 'content',
            changes: [{
              type: 'content',
              field: 'content',
              oldValue: template.content,
              newValue: this.addSocialProof(template.content),
              description: 'Added testimonials or success statistics',
            }],
          },
        }
      );
    }

    // Structure-based suggestions
    suggestions.push(
      {
        type: 'structure',
        description: 'Reorder content sections for better flow',
        confidence: 0.65,
        expectedImpact: 'medium',
        implementation: {
          field: 'content',
          changes: [{
            type: 'content',
            field: 'content',
            oldValue: template.content,
            newValue: this.reorderContent(template.content),
            description: 'Reordered content to lead with benefits first',
          }],
        },
      }
    );

    // Sort by expected impact and confidence
    suggestions.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      const impactDiff = impactOrder[b.expectedImpact] - impactOrder[a.expectedImpact];
      if (impactDiff !== 0) return impactDiff;
      return b.confidence - a.confidence;
    });

    return suggestions.slice(0, count);
  }

  /**
   * Apply changes to create variation content
   */
  private applyChanges(
    template: CommunicationTemplate,
    changes: VariationChange[]
  ): {
    subject?: string;
    content: string;
    variables: TemplateVariable[];
    conditions: TemplateCondition[];
  } {
    let subject = template.subject;
    let content = template.content;
    let variables = [...template.variables];
    let conditions = [...template.conditions];

    for (const change of changes) {
      switch (change.type) {
        case 'content':
          content = change.newValue;
          break;
        case 'subject':
          subject = change.newValue;
          break;
        case 'variable':
          // Update specific variable
          const varIndex = variables.findIndex(v => v.name === change.field);
          if (varIndex >= 0) {
            variables[varIndex] = { ...variables[varIndex], ...change.newValue };
          }
          break;
        case 'condition':
          // Update specific condition
          const condIndex = conditions.findIndex(c => c.id === change.field);
          if (condIndex >= 0) {
            conditions[condIndex] = { ...conditions[condIndex], ...change.newValue };
          }
          break;
      }
    }

    return { subject, content, variables, conditions };
  }

  /**
   * Add urgency to subject line
   */
  private addUrgencyToSubject(subject: string): string {
    const urgencyWords = ['Limited Time', 'Act Now', 'Don\'t Miss', 'Urgent', 'Breaking'];

    // Remove existing urgency words first
    let cleanSubject = subject;
    urgencyWords.forEach(word => {
      cleanSubject = cleanSubject.replace(new RegExp(word, 'gi'), '').trim();
    });

    // Add random urgency word
    const urgencyWord = urgencyWords[Math.floor(Math.random() * urgencyWords.length)];
    return `${urgencyWord}: ${cleanSubject}`;
  }

  /**
   * Personalize subject line
   */
  private personalizeSubject(subject: string): string {
    if (subject.includes('{{leadName}}') || subject.includes('{{firstName}}')) {
      return subject; // Already personalized
    }

    // Add personalization at the beginning
    return `{{leadName}}, ${subject}`;
  }

  /**
   * Enhance call-to-action
   */
  private enhanceCallToAction(content: string): string {
    const ctaPatterns = [
      /call\s+us|contact\s+us|schedule\s+a\s+showing|get\s+in\s+touch/gi,
      /learn\s+more|find\s+out\s+more|see\s+details/gi,
      /view\s+properties|browse\s+homes|search\s+listings/gi,
    ];

    let enhancedContent = content;

    ctaPatterns.forEach(pattern => {
      enhancedContent = enhancedContent.replace(pattern, (match) => {
        return `<strong style="color: #007bff;">${match.toUpperCase()}</strong>`;
      });
    });

    return enhancedContent;
  }

  /**
   * Add social proof elements
   */
  private addSocialProof(content: string): string {
    const socialProofText = `
<div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
  <p style="margin: 0; color: #6c757d; font-size: 14px;">
    <strong>⭐ Trusted by 500+ Happy Homebuyers</strong><br>
    "Found my dream home in just 2 weeks!"
  </p>
</div>
`;

    // Insert social proof after the main content but before CTA
    const ctaIndex = content.toLowerCase().indexOf('call') !== -1 ?
      content.toLowerCase().indexOf('call') : content.length;

    return content.slice(0, ctaIndex) + socialProofText + content.slice(ctaIndex);
  }

  /**
   * Reorder content for better flow
   */
  private reorderContent(content: string): string {
    // Simple reordering - move benefits before features
    // This is a simplified implementation
    const benefitPatterns = [
      /amazing|great|excellent|wonderful|fantastic/gi,
      /save\s+time|save\s+money|convenient|easy/gi,
      /professional|experienced|trusted|reliable/gi,
    ];

    // For now, just return the original content
    // A more sophisticated implementation would analyze and reorder content sections
    return content;
  }

  /**
   * Get all variations for a template
   */
  public getVariations(templateId: string): TemplateVariation[] {
    return this.variations.get(templateId) || [];
  }

  /**
   * Get a specific variation
   */
  public getVariation(templateId: string, variationId: string): TemplateVariation | null {
    const variations = this.variations.get(templateId) || [];
    return variations.find(v => v.id === variationId) || null;
  }

  /**
   * Update variation performance
   */
  public updateVariationPerformance(
    templateId: string,
    variationId: string,
    impressions: number,
    conversions: number
  ): boolean {
    const variations = this.variations.get(templateId);
    if (!variations) return false;

    const variation = variations.find(v => v.id === variationId);
    if (!variation) return false;

    variation.performance = {
      impressions,
      conversions,
      conversionRate: impressions > 0 ? conversions / impressions : 0,
      lastUpdated: new Date().toISOString(),
    };

    variation.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Compare variations
   */
  public compareVariations(
    baseTemplate: CommunicationTemplate,
    variations: TemplateVariation[]
  ): VariationComparison {
    const metrics: VariationComparison['metrics'] = [];

    // Compare subject lines
    if (baseTemplate.subject || variations.some(v => v.subject)) {
      const subjectComparison: Record<string, any> = { base: baseTemplate.subject };
      variations.forEach(v => {
        subjectComparison[v.id] = v.subject;
      });

      metrics.push({
        field: 'subject',
        baseValue: baseTemplate.subject,
        variations: subjectComparison,
      });
    }

    // Compare content length
    const contentComparison: Record<string, any> = { base: baseTemplate.content.length };
    variations.forEach(v => {
      contentComparison[v.id] = v.content.length;
    });

    metrics.push({
      field: 'contentLength',
      baseValue: baseTemplate.content.length,
      variations: contentComparison,
    });

    // Compare variable count
    const variableComparison: Record<string, any> = { base: baseTemplate.variables.length };
    variations.forEach(v => {
      variableComparison[v.id] = v.variables.length;
    });

    metrics.push({
      field: 'variableCount',
      baseValue: baseTemplate.variables.length,
      variations: variableComparison,
    });

    // Find best performers based on performance data
    variations.forEach(variation => {
      if (variation.performance) {
        metrics.forEach(metric => {
          if (variation.performance!.conversionRate > 0.01) { // At least 1% conversion
            metric.bestPerformer = variation.id;
          }
        });
      }
    });

    return {
      baseTemplate,
      variations,
      metrics,
    };
  }

  /**
   * Generate A/B test variants from suggestions
   */
  public generateTestVariants(
    template: CommunicationTemplate,
    suggestions: VariationSuggestion[]
  ): ABTestVariant[] {
    const variants: ABTestVariant[] = [];

    // Control variant (original template)
    variants.push({
      id: `control_${Date.now()}`,
      name: 'Control',
      templateId: template.id,
      subject: template.subject,
      content: template.content,
      variables: template.variables,
      weight: 50, // 50% traffic
      isControl: true,
    });

    // Generate variants from suggestions
    suggestions.forEach((suggestion, index) => {
      const variation = this.createVariation(
        template,
        suggestion.implementation.changes,
        `Variant ${index + 1}: ${suggestion.description}`,
        suggestion.description
      );

      variants.push({
        id: variation.id,
        name: variation.name,
        templateId: template.id,
        subject: variation.subject,
        content: variation.content,
        variables: variation.variables,
        weight: Math.floor(50 / suggestions.length), // Distribute remaining traffic
        isControl: false,
      });
    });

    return variants;
  }

  /**
   * Clean up old variations
   */
  public cleanupOldVariations(maxAgeDays: number = 90): void {
    const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);

    for (const [templateId, variations] of this.variations) {
      const activeVariations = variations.filter(variation => {
        const updatedTime = new Date(variation.updatedAt).getTime();
        return updatedTime > cutoffTime || variation.isActive;
      });

      if (activeVariations.length > 0) {
        this.variations.set(templateId, activeVariations);
      } else {
        this.variations.delete(templateId);
      }
    }
  }

  /**
   * Get variation statistics
   */
  public getVariationStatistics(): {
    totalVariations: number;
    activeVariations: number;
    templatesWithVariations: number;
    averageChangesPerVariation: number;
  } {
    let totalVariations = 0;
    let activeVariations = 0;
    let totalChanges = 0;

    for (const variations of this.variations.values()) {
      totalVariations += variations.length;
      activeVariations += variations.filter(v => v.isActive).length;
      totalChanges += variations.reduce((sum, v) => sum + v.changes.length, 0);
    }

    return {
      totalVariations,
      activeVariations,
      templatesWithVariations: this.variations.size,
      averageChangesPerVariation: totalVariations > 0 ? totalChanges / totalVariations : 0,
    };
  }

  /**
   * Export variations for a template
   */
  public exportVariations(templateId: string): TemplateVariation[] {
    return this.variations.get(templateId) || [];
  }

  /**
   * Import variations for a template
   */
  public importVariations(templateId: string, variations: TemplateVariation[]): void {
    const existingVariations = this.variations.get(templateId) || [];
    const importedVariations = variations.map(v => ({
      ...v,
      id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      baseTemplateId: templateId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    this.variations.set(templateId, [...existingVariations, ...importedVariations]);
  }
}

export const templateVariationService = TemplateVariationService.getInstance();