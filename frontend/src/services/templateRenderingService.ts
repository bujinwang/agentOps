import { CommunicationTemplate, TemplateVariable, TemplateRenderingContext } from '../types/template';
import { templateVariableService } from './templateVariableService';

/**
 * Template Rendering Service
 *
 * Handles parsing, validation, and rendering of communication templates with variable substitution.
 * Supports multiple channels (email, SMS, in-app) with appropriate formatting.
 */
export class TemplateRenderingService {
  private static instance: TemplateRenderingService;
  private templateCache: Map<string, { template: CommunicationTemplate; rendered: string; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): TemplateRenderingService {
    if (!TemplateRenderingService.instance) {
      TemplateRenderingService.instance = new TemplateRenderingService();
    }
    return TemplateRenderingService.instance;
  }

  /**
   * Render a template with variable substitution
   */
  public async renderTemplate(
    template: CommunicationTemplate,
    context: TemplateRenderingContext
  ): Promise<{ content: string; subject?: string; usedVariables: Record<string, any>; missingVariables: string[] }> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(template.id, context);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Validate template
      const validation = await this.validateTemplate(template);
      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
      }

      // Populate variables
      const variableResult = await templateVariableService.populateVariables(template.content, context);

      // Render content based on channel
      let renderedContent = variableResult.content;
      let renderedSubject: string | undefined;

      if (template.channel === 'email' && template.subject) {
        const subjectResult = await templateVariableService.populateVariables(template.subject, context);
        renderedSubject = subjectResult.content;
      }

      // Apply channel-specific formatting
      renderedContent = this.applyChannelFormatting(renderedContent, template.channel);

      // Cache the result
      const result = {
        content: renderedContent,
        subject: renderedSubject,
        usedVariables: variableResult.usedVariables,
        missingVariables: variableResult.missingVariables
      };

      this.setCache(cacheKey, template, JSON.stringify(result));

      return result;
    } catch (error) {
      console.error('Template rendering failed:', error);
      throw new Error(`Failed to render template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Preview template with sample data
   */
  public async previewTemplate(
    template: CommunicationTemplate,
    sampleContext?: Partial<TemplateRenderingContext>
  ): Promise<{ content: string; subject?: string; usedVariables: Record<string, any>; missingVariables: string[] }> {
    const defaultContext: TemplateRenderingContext = {
      lead: {
        id: 'sample-lead-123',
        name: 'John Smith',
        email: 'john.smith@email.com',
        phone: '+1-555-0123',
        score: 85,
        budget: { min: 300000, max: 500000, currency: 'USD' },
        timeline: '3-6 months',
        propertyType: 'single-family',
        location: 'Downtown Seattle',
        status: 'active'
      },
      property: {
        id: 'sample-property-456',
        address: '123 Main St, Seattle, WA 98101',
        price: 425000,
        type: 'single-family',
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 2100,
        yearBuilt: 2015
      },
      agent: {
        id: 'sample-agent-789',
        name: 'Sarah Johnson',
        email: 'sarah@realestate.com',
        phone: '+1-555-0456',
        company: 'Premier Realty'
      },
      system: {
        currentDate: new Date().toLocaleDateString(),
        currentTime: new Date().toLocaleTimeString(),
        appName: 'RealEstate CRM'
      },
      ...sampleContext
    };

    return this.renderTemplate(template, defaultContext);
  }

  /**
   * Validate template structure and variables
   */
  public async validateTemplate(template: CommunicationTemplate): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic structure validation
    if (!template.id || !template.content) {
      errors.push('Template must have id and content');
    }

    if (!template.variables || !Array.isArray(template.variables)) {
      errors.push('Template must have variables array');
    }

    // Variable validation
    if (template.variables) {
      for (const variable of template.variables) {
        const varErrors = this.validateVariable(variable);
        errors.push(...varErrors);
      }
    }

    // Content validation - check for unmatched variables
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const contentVariables = new Set<string>();
    let match;

    while ((match = variablePattern.exec(template.content)) !== null) {
      contentVariables.add(match[1].trim());
    }

    if (template.subject) {
      while ((match = variablePattern.exec(template.subject)) !== null) {
        contentVariables.add(match[1].trim());
      }
    }

    // Check if all variables in content are defined
    const definedVariables = new Set(template.variables?.map(v => v.name) || []);
    for (const varName of contentVariables) {
      if (!definedVariables.has(varName)) {
        errors.push(`Variable '${varName}' used in content but not defined in template variables`);
      }
    }

    // Channel-specific validation
    if (template.channel === 'email' && !template.subject) {
      errors.push('Email templates must have a subject');
    }

    if (template.channel === 'sms' && template.content.length > 160) {
      errors.push('SMS content exceeds 160 character limit');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate individual variable
   */
  private validateVariable(variable: TemplateVariable): string[] {
    const errors: string[] = [];

    if (!variable.name || typeof variable.name !== 'string') {
      errors.push('Variable must have a valid name');
    }

    if (!['string', 'number', 'date', 'currency'].includes(variable.type)) {
      errors.push(`Variable '${variable.name}' has invalid type: ${variable.type}`);
    }

    if (!['lead', 'property', 'agent', 'system'].includes(variable.source)) {
      errors.push(`Variable '${variable.name}' has invalid source: ${variable.source}`);
    }

    if (variable.validation) {
      if (variable.validation.pattern && !this.isValidRegex(variable.validation.pattern)) {
        errors.push(`Variable '${variable.name}' has invalid regex pattern: ${variable.validation.pattern}`);
      }
    }

    return errors;
  }

  /**
   * Apply channel-specific formatting
   */
  private applyChannelFormatting(content: string, channel: string): string {
    switch (channel) {
      case 'email':
        return this.formatForEmail(content);
      case 'sms':
        return this.formatForSMS(content);
      case 'in_app':
        return this.formatForInApp(content);
      default:
        return content;
    }
  }

  /**
   * Format content for email
   */
  private formatForEmail(content: string): string {
    // Add basic HTML structure if not present
    if (!content.includes('<html>')) {
      content = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .highlight { background-color: #f0f8ff; padding: 10px; border-left: 4px solid #007bff; }
              .signature { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
            </style>
          </head>
          <body>
            ${content.replace(/\n/g, '<br>')}
          </body>
        </html>
      `;
    }
    return content;
  }

  /**
   * Format content for SMS
   */
  private formatForSMS(content: string): string {
    // Remove HTML tags and limit length
    content = content.replace(/<[^>]*>/g, '');
    if (content.length > 160) {
      content = content.substring(0, 157) + '...';
    }
    return content;
  }

  /**
   * Format content for in-app notifications
   */
  private formatForInApp(content: string): string {
    // Keep basic formatting but ensure it's suitable for mobile
    return content.replace(/\n/g, '\n');
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(templateId: string, context: TemplateRenderingContext): string {
    const contextHash = this.hashObject(context);
    return `${templateId}:${contextHash}`;
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): any | null {
    const cached = this.templateCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return JSON.parse(cached.rendered);
    }
    if (cached) {
      this.templateCache.delete(key);
    }
    return null;
  }

  /**
   * Set cache
   */
  private setCache(key: string, template: CommunicationTemplate, rendered: string): void {
    this.templateCache.set(key, {
      template,
      rendered,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.templateCache.clear();
  }

  /**
   * Get cache stats
   */
  public getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.templateCache.size,
      hitRate: 0 // Would need to track hits/misses for accurate rate
    };
  }

  /**
   * Simple object hash for caching
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Validate regex pattern
   */
  private isValidRegex(pattern: string): boolean {
    try {
      new RegExp(pattern);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const templateRenderingService = TemplateRenderingService.getInstance();