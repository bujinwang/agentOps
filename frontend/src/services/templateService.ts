import {
  CommunicationTemplate,
  TemplateVariable,
  TemplateCondition,
  TemplateRenderContext,
  TemplatePreview,
  TemplateValidationResult,
  TemplateRenderContext as TemplateContext
} from '../types/communication';

export class TemplateService {
  private static instance: TemplateService;

  private constructor() {}

  static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  /**
   * Render a template with provided context data
   */
  renderTemplate(
    template: CommunicationTemplate,
    context: TemplateRenderContext
  ): { subject?: string; content: string; errors: string[] } {
    const errors: string[] = [];

    try {
      // Merge all context data
      const mergedContext = {
        ...context.leadData,
        ...context.agentData,
        ...context.templateData,
        ...context.customVariables,
      };

      // Render subject if present
      let subject: string | undefined;
      if (template.subjectTemplate) {
        subject = this.renderContent(template.subjectTemplate, mergedContext, template.variables);
      }

      // Render content
      const content = this.renderContent(template.contentTemplate, mergedContext, template.variables);

      return { subject, content, errors };
    } catch (error) {
      errors.push(`Template rendering failed: ${error.message}`);
      return {
        subject: template.subjectTemplate,
        content: template.contentTemplate,
        errors
      };
    }
  }

  /**
   * Render template content with variable substitution
   */
  private renderContent(
    content: string,
    context: Record<string, any>,
    variables: Record<string, TemplateVariable>
  ): string {
    let rendered = content;

    // Replace variables in format {{variableName}}
    const variableRegex = /\{\{([^}]+)\}\}/g;
    rendered = rendered.replace(variableRegex, (match, variableName) => {
      const trimmedName = variableName.trim();

      // Check if variable is defined in template
      if (!variables[trimmedName]) {
        console.warn(`Undefined variable: ${trimmedName}`);
        return match; // Keep original placeholder
      }

      // Get value from context
      const value = this.getNestedValue(context, trimmedName);

      if (value === undefined || value === null) {
        // Use default value if available
        const defaultValue = variables[trimmedName].defaultValue;
        return defaultValue !== undefined ? String(defaultValue) : match;
      }

      return String(value);
    });

    return rendered;
  }

  /**
   * Get nested object value by dot notation path
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Validate template conditions against lead data
   */
  validateConditions(
    conditions: TemplateCondition[],
    leadData: Record<string, any>
  ): boolean {
    if (!conditions || conditions.length === 0) {
      return true; // No conditions means always valid
    }

    // Evaluate each condition
    const results = conditions.map(condition => this.evaluateCondition(condition, leadData));

    // Combine results with logical operators
    return this.combineConditions(results, conditions);
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: TemplateCondition, data: Record<string, any>): boolean {
    const fieldValue = this.getNestedValue(data, condition.field);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return typeof fieldValue === 'number' && fieldValue > condition.value;
      case 'less_than':
        return typeof fieldValue === 'number' && fieldValue < condition.value;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(condition.value);
      case 'in_range':
        if (!Array.isArray(condition.value) || condition.value.length !== 2) return false;
        const [min, max] = condition.value;
        return typeof fieldValue === 'number' && fieldValue >= min && fieldValue <= max;
      default:
        return false;
    }
  }

  /**
   * Combine condition results with logical operators
   */
  private combineConditions(results: boolean[], conditions: TemplateCondition[]): boolean {
    let result = results[0];

    for (let i = 1; i < results.length; i++) {
      const logicalOp = conditions[i].logicalOperator || 'AND';
      if (logicalOp === 'AND') {
        result = result && results[i];
      } else if (logicalOp === 'OR') {
        result = result || results[i];
      }
    }

    return result;
  }

  /**
   * Generate preview of template with sample data
   */
  generatePreview(
    template: CommunicationTemplate,
    sampleData?: Partial<TemplateRenderContext>
  ): TemplatePreview {
    const defaultSampleData: TemplateRenderContext = {
      leadData: {
        leadName: 'John Smith',
        preferredLocation: 'Downtown Vancouver',
        propertyType: 'Condo',
        budget: 800000,
        leadScore: 85
      },
      agentData: {
        agentName: 'Sarah Johnson',
        agentPhone: '(555) 123-4567',
        agentEmail: 'sarah@realestate.com'
      },
      templateData: {},
      customVariables: {},
      ...sampleData
    };

    const { subject, content, errors } = this.renderTemplate(template, defaultSampleData);

    return {
      subject,
      content,
      variables: defaultSampleData,
      validationErrors: errors
    };
  }

  /**
   * Validate template structure and variables
   */
  validateTemplate(template: CommunicationTemplate): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingVariables: string[] = [];
    const unusedVariables: string[] = [];

    // Check required fields
    if (!template.name?.trim()) {
      errors.push('Template name is required');
    }

    if (!template.contentTemplate?.trim()) {
      errors.push('Template content is required');
    }

    if (!template.category?.trim()) {
      errors.push('Template category is required');
    }

    // Extract variables from content
    const contentVariables = this.extractVariables(template.contentTemplate);
    const subjectVariables = template.subjectTemplate ? this.extractVariables(template.subjectTemplate) : [];
    const allUsedVariables = [...new Set([...contentVariables, ...subjectVariables])];

    // Check for undefined variables
    const definedVariables = Object.keys(template.variables || {});
    for (const usedVar of allUsedVariables) {
      if (!definedVariables.includes(usedVar)) {
        missingVariables.push(usedVar);
        errors.push(`Variable '${usedVar}' is used but not defined`);
      }
    }

    // Check for unused variables
    for (const definedVar of definedVariables) {
      if (!allUsedVariables.includes(definedVar)) {
        unusedVariables.push(definedVar);
        warnings.push(`Variable '${definedVar}' is defined but not used`);
      }
    }

    // Validate variable definitions
    for (const [varName, varDef] of Object.entries(template.variables || {})) {
      if (!varDef.name) {
        errors.push(`Variable '${varName}' missing name`);
      }
      if (!varDef.type) {
        errors.push(`Variable '${varName}' missing type`);
      }
      if (!['string', 'number', 'boolean', 'date'].includes(varDef.type)) {
        errors.push(`Variable '${varName}' has invalid type: ${varDef.type}`);
      }
    }

    // Validate conditions
    if (template.conditions) {
      for (let i = 0; i < template.conditions.length; i++) {
        const condition = template.conditions[i];
        if (!condition.field) {
          errors.push(`Condition ${i + 1} missing field`);
        }
        if (!condition.operator) {
          errors.push(`Condition ${i + 1} missing operator`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingVariables,
      unusedVariables
    };
  }

  /**
   * Extract variable names from template content
   */
  private extractVariables(content: string): string[] {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const matches = [];
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      matches.push(match[1].trim());
    }

    return matches;
  }

  /**
   * Select best template for lead based on conditions and scoring
   */
  selectTemplateForLead(
    templates: CommunicationTemplate[],
    leadData: Record<string, any>
  ): CommunicationTemplate | null {
    const validTemplates = templates.filter(template =>
      template.isActive && this.validateConditions(template.conditions, leadData)
    );

    if (validTemplates.length === 0) {
      return null;
    }

    // For now, return the first valid template
    // In the future, this could include scoring logic
    return validTemplates[0];
  }

  /**
   * Get template suggestions based on lead characteristics
   */
  getTemplateSuggestions(
    templates: CommunicationTemplate[],
    leadData: Record<string, any>
  ): { template: CommunicationTemplate; score: number; reasons: string[] }[] {
    return templates
      .filter(template => template.isActive)
      .map(template => {
        const score = this.calculateTemplateScore(template, leadData);
        const reasons = this.getTemplateMatchReasons(template, leadData);

        return { template, score, reasons };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate how well a template matches lead data
   */
  private calculateTemplateScore(template: CommunicationTemplate, leadData: Record<string, any>): number {
    let score = 0;

    // Base score for valid conditions
    if (this.validateConditions(template.conditions, leadData)) {
      score += 50;
    }

    // Bonus for matching lead score ranges
    const leadScore = leadData.leadScore;
    if (leadScore) {
      const scoreConditions = template.conditions.filter(c => c.field === 'leadScore');
      if (scoreConditions.some(c => this.evaluateCondition(c, leadData))) {
        score += 25;
      }
    }

    // Bonus for recent activity
    const lastActivity = leadData.lastActivity;
    if (lastActivity) {
      const daysSince = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) score += 15;
      else if (daysSince < 30) score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Get reasons why a template matches a lead
   */
  private getTemplateMatchReasons(template: CommunicationTemplate, leadData: Record<string, any>): string[] {
    const reasons: string[] = [];

    if (this.validateConditions(template.conditions, leadData)) {
      reasons.push('Matches lead conditions');
    }

    const leadScore = leadData.leadScore;
    if (leadScore) {
      reasons.push(`Lead score: ${leadScore}`);
    }

    const category = template.category;
    if (category) {
      reasons.push(`Category: ${category}`);
    }

    return reasons;
  }
}

// Export singleton instance
export const templateService = TemplateService.getInstance();