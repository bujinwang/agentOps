import { CommunicationTemplate, TemplateRenderingContext, CommunicationChannel } from '../types/template';
import { LeadCharacteristics, LeadAnalysisResult, leadCharacteristicAnalyzer } from './leadCharacteristicAnalyzer';
import { TemplateMatch, templateMatcher, TemplateMatchingOptions } from './templateMatcher';
import { templateVariableService } from './templateVariableService';

export interface PersonalizationRequest {
  leadData: Record<string, any>;
  context?: Partial<TemplateRenderingContext>;
  channel?: CommunicationChannel;
  category?: string;
  purpose?: 'initial_contact' | 'follow_up' | 'nurturing' | 're_engagement' | 'conversion';
}

export interface PersonalizationResult {
  template: CommunicationTemplate | null;
  populatedContent: string;
  variables: Record<string, any>;
  confidence: number;
  reasoning: string[];
  alternatives: TemplateMatch[];
  analysis: LeadAnalysisResult;
  performance: {
    analysisTime: number;
    matchingTime: number;
    renderingTime: number;
    totalTime: number;
  };
}

export interface PersonalizationOptions {
  maxAlternatives?: number;
  minConfidence?: number;
  includeFallbacks?: boolean;
  skipAnalysis?: boolean;
  customWeights?: Record<string, number>;
}

class PersonalizationEngine {
  private static instance: PersonalizationEngine;
  private analysisCache: Map<string, { result: LeadAnalysisResult; timestamp: number }> = new Map();
  private matchCache: Map<string, { result: TemplateMatch[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): PersonalizationEngine {
    if (!PersonalizationEngine.instance) {
      PersonalizationEngine.instance = new PersonalizationEngine();
    }
    return PersonalizationEngine.instance;
  }

  /**
   * Main personalization method
   */
  public async personalize(
    request: PersonalizationRequest,
    templates: CommunicationTemplate[],
    options: PersonalizationOptions = {}
  ): Promise<PersonalizationResult> {
    const startTime = Date.now();

    const {
      maxAlternatives = 3,
      minConfidence = 30,
      includeFallbacks = true,
      skipAnalysis = false,
      customWeights,
    } = options;

    // Step 1: Analyze lead characteristics
    const analysisStart = Date.now();
    let analysis: LeadAnalysisResult;

    if (skipAnalysis) {
      // Use minimal analysis for performance
      analysis = {
        characteristics: this.createMinimalCharacteristics(request.leadData),
        confidence: 50,
        analysisTime: 0,
        dataCompleteness: 50,
        recommendations: [],
      };
    } else {
      analysis = this.analyzeLead(request.leadData, customWeights);
    }
    const analysisTime = Date.now() - analysisStart;

    // Step 2: Find matching templates
    const matchingStart = Date.now();
    const matches = this.findMatchingTemplates(
      analysis.characteristics,
      templates,
      {
        channel: request.channel,
        category: request.category as any,
        maxResults: maxAlternatives + 1, // +1 for primary
        minScore: minConfidence,
        includeFallbacks,
      }
    );
    const matchingTime = Date.now() - matchingStart;

    // Step 3: Select best template
    const primaryMatch = matches.length > 0 ? matches[0] : null;
    const alternatives = matches.slice(1);

    // Step 4: Populate template content
    const renderingStart = Date.now();
    const { populatedContent, variables } = this.populateTemplate(
      primaryMatch?.template || null,
      analysis.characteristics,
      request.context
    );
    const renderingTime = Date.now() - renderingStart;

    const totalTime = Date.now() - startTime;

    // Step 5: Generate reasoning
    const reasoning = this.generateReasoning(
      analysis.characteristics,
      primaryMatch,
      request.purpose
    );

    return {
      template: primaryMatch?.template || null,
      populatedContent,
      variables,
      confidence: primaryMatch?.confidence || 0,
      reasoning,
      alternatives,
      analysis,
      performance: {
        analysisTime,
        matchingTime,
        renderingTime,
        totalTime,
      },
    };
  }

  /**
   * Analyze lead characteristics with caching
   */
  private analyzeLead(
    leadData: Record<string, any>,
    customWeights?: Record<string, number>
  ): LeadAnalysisResult {
    // Create cache key from lead data
    const cacheKey = this.createCacheKey(leadData);

    // Check cache
    const cached = this.analysisCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.result;
    }

    // Update weights if provided
    if (customWeights) {
      const weights = leadCharacteristicAnalyzer.getWeights();
      leadCharacteristicAnalyzer.updateWeights(customWeights as any);
    }

    // Perform analysis
    const result = leadCharacteristicAnalyzer.analyzeLead(leadData);

    // Cache result
    this.analysisCache.set(cacheKey, { result, timestamp: Date.now() });

    return result;
  }

  /**
   * Find matching templates with caching
   */
  private findMatchingTemplates(
    characteristics: LeadCharacteristics,
    templates: CommunicationTemplate[],
    options: TemplateMatchingOptions
  ): TemplateMatch[] {
    // Create cache key
    const cacheKey = this.createMatchCacheKey(characteristics, options);

    // Check cache
    const cached = this.matchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.result;
    }

    // Find matches
    const result = templateMatcher.findMatches(characteristics, templates, options);

    // Cache result
    this.matchCache.set(cacheKey, { result, timestamp: Date.now() });

    return result;
  }

  /**
   * Populate template with lead data
   */
  private populateTemplate(
    template: CommunicationTemplate | null,
    characteristics: LeadCharacteristics,
    context?: Partial<TemplateRenderingContext>
  ): { populatedContent: string; variables: Record<string, any> } {
    if (!template) {
      return {
        populatedContent: '',
        variables: {},
      };
    }

    // Create rendering context
    const renderingContext: TemplateRenderingContext = {
      lead: this.convertCharacteristicsToLeadData(characteristics),
      property: context?.property || {},
      agent: context?.agent || {},
      system: context?.system || {},
      custom: context?.custom || {},
    };

    // Populate variables
    const result = templateVariableService.populateVariables(
      template.content,
      renderingContext
    );

    return {
      populatedContent: result.content,
      variables: result.usedVariables,
    };
  }

  /**
   * Create minimal characteristics for performance optimization
   */
  private createMinimalCharacteristics(leadData: Record<string, any>): LeadCharacteristics {
    return {
      hasName: !!(leadData.first_name || leadData.last_name || leadData.full_name),
      hasEmail: !!leadData.email,
      hasPhone: !!leadData.phone,
      leadScore: leadData.score || leadData.lead_score || 50,
      leadStage: leadData.stage || leadData.lead_stage || 'new',
      engagementLevel: 'medium',
      timeline: leadData.timeline || 'browsing',
      urgencyLevel: 'medium',
      daysSinceLastContact: 30,
      totalInteractions: leadData.interaction_count || 0,
      responseRate: 0.1,
      preferredChannel: 'email',
      communicationFrequency: 'bi-weekly',
      bestTimeToContact: 'evening',
      preferredContentType: 'property_details',
      customTags: [],
      riskFactors: [],
      opportunities: [],
    };
  }

  /**
   * Convert characteristics back to lead data format
   */
  private convertCharacteristicsToLeadData(characteristics: LeadCharacteristics): Record<string, any> {
    return {
      full_name: characteristics.hasName ? 'Lead Name' : 'Valued Customer',
      first_name: 'Lead',
      last_name: 'Customer',
      email: characteristics.hasEmail ? 'lead@example.com' : '',
      phone: characteristics.hasPhone ? '+1234567890' : '',
      score: characteristics.leadScore,
      stage: characteristics.leadStage,
      timeline: characteristics.timeline,
      property_type: characteristics.propertyType,
      budget: characteristics.budgetRange?.max,
      bedrooms: characteristics.bedroomPreference,
      bathrooms: characteristics.bathroomPreference,
      location: characteristics.locationPreference,
      interaction_count: characteristics.totalInteractions,
      days_since_last_contact: characteristics.daysSinceLastContact,
      response_rate: characteristics.responseRate,
      preferred_channel: characteristics.preferredChannel,
      age_group: characteristics.ageGroup,
      income_level: characteristics.incomeLevel,
      family_status: characteristics.familyStatus,
      communication_frequency: characteristics.communicationFrequency,
      best_time_to_contact: characteristics.bestTimeToContact,
      preferred_content_type: characteristics.preferredContentType,
      tags: characteristics.customTags,
    };
  }

  /**
   * Generate reasoning for the personalization decision
   */
  private generateReasoning(
    characteristics: LeadCharacteristics,
    primaryMatch: TemplateMatch | null,
    purpose?: string
  ): string[] {
    const reasoning: string[] = [];

    if (!primaryMatch) {
      reasoning.push('No suitable template found for the lead characteristics');
      return reasoning;
    }

    reasoning.push(`Selected template "${primaryMatch.template.name}" with ${primaryMatch.confidence}% confidence`);

    // Add reasoning based on key characteristics
    if (characteristics.urgencyLevel === 'high') {
      reasoning.push('High urgency lead - prioritized immediate response template');
    }

    if (characteristics.engagementLevel === 'low') {
      reasoning.push('Low engagement lead - selected re-engagement focused template');
    }

    if (characteristics.timeline === 'immediate') {
      reasoning.push('Immediate timeline - selected direct contact template');
    }

    if (characteristics.leadScore >= 80) {
      reasoning.push('High lead score - selected premium content template');
    }

    if (purpose) {
      reasoning.push(`Purpose: ${purpose} - template category matches communication goal`);
    }

    // Add performance reasoning
    if (primaryMatch.template.performance) {
      const perf = primaryMatch.template.performance;
      if (perf.conversionRate > 0.05) {
        reasoning.push(`Template has proven ${Math.round(perf.conversionRate * 100)}% conversion rate`);
      }
      if (perf.openRate > 0.4) {
        reasoning.push(`Template has ${Math.round(perf.openRate * 100)}% open rate`);
      }
    }

    return reasoning;
  }

  /**
   * Create cache key from lead data
   */
  private createCacheKey(leadData: Record<string, any>): string {
    // Create a deterministic key from key lead fields
    const keyFields = [
      leadData.id || leadData.lead_id,
      leadData.email,
      leadData.score || leadData.lead_score,
      leadData.stage || leadData.lead_stage,
      leadData.timeline,
      leadData.last_contact_date || leadData.last_contact,
    ];

    return keyFields.map(field => String(field || '')).join('|');
  }

  /**
   * Create cache key for template matching
   */
  private createMatchCacheKey(
    characteristics: LeadCharacteristics,
    options: TemplateMatchingOptions
  ): string {
    const keyParts = [
      characteristics.leadScore,
      characteristics.leadStage,
      characteristics.timeline,
      characteristics.engagementLevel,
      characteristics.preferredChannel,
      options.channel || '',
      options.category || '',
      options.maxResults || 5,
    ];

    return keyParts.join('|');
  }

  /**
   * Get personalization recommendations
   */
  public async getRecommendations(
    request: PersonalizationRequest,
    templates: CommunicationTemplate[],
    options: PersonalizationOptions = {}
  ): Promise<{
    primary: PersonalizationResult;
    alternatives: PersonalizationResult[];
    suggestions: string[];
  }> {
    const primary = await this.personalize(request, templates, options);

    // Generate alternatives by slightly modifying the request
    const alternatives: PersonalizationResult[] = [];

    if (primary.alternatives.length > 0) {
      for (const altMatch of primary.alternatives.slice(0, 2)) {
        const altResult = await this.personalize(
          { ...request, category: altMatch.template.category },
          [altMatch.template],
          { ...options, skipAnalysis: true }
        );
        alternatives.push(altResult);
      }
    }

    // Generate suggestions
    const suggestions = this.generateSuggestions(primary, alternatives);

    return {
      primary,
      alternatives,
      suggestions,
    };
  }

  /**
   * Generate suggestions for improvement
   */
  private generateSuggestions(
    primary: PersonalizationResult,
    alternatives: PersonalizationResult[]
  ): string[] {
    const suggestions: string[] = [];

    if (primary.confidence < 50) {
      suggestions.push('Consider collecting more lead data to improve personalization accuracy');
    }

    if (primary.analysis.dataCompleteness < 70) {
      suggestions.push('Lead profile is incomplete - consider data enrichment strategies');
    }

    if (primary.analysis.characteristics.riskFactors.length > 0) {
      suggestions.push('Lead has risk factors - consider risk-mitigation templates');
    }

    if (primary.analysis.characteristics.opportunities.length > 0) {
      suggestions.push('Lead has opportunities - consider premium content options');
    }

    if (alternatives.length === 0) {
      suggestions.push('Limited template options - consider expanding template library');
    }

    if (primary.performance.totalTime > 2000) {
      suggestions.push('Personalization is slow - consider caching or optimization');
    }

    return suggestions;
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.analysisCache.clear();
    this.matchCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    analysisCacheSize: number;
    matchCacheSize: number;
    analysisCacheHitRate: number;
    matchCacheHitRate: number;
  } {
    // In a real implementation, you'd track hit/miss rates
    return {
      analysisCacheSize: this.analysisCache.size,
      matchCacheSize: this.matchCache.size,
      analysisCacheHitRate: 0, // Would need to track this
      matchCacheHitRate: 0, // Would need to track this
    };
  }

  /**
   * Batch personalize multiple leads
   */
  public async batchPersonalize(
    requests: PersonalizationRequest[],
    templates: CommunicationTemplate[],
    options: PersonalizationOptions = {}
  ): Promise<PersonalizationResult[]> {
    const results: PersonalizationResult[] = [];

    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request =>
        this.personalize(request, templates, options)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to prevent resource exhaustion
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Validate personalization setup
   */
  public validateSetup(templates: CommunicationTemplate[]): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check template coverage
    const categories = new Set(templates.map(t => t.category));
    const requiredCategories = [
      'initial_contact',
      'follow_up',
      'nurturing',
      're_engagement',
      'proposal',
    ];

    for (const category of requiredCategories) {
      if (!categories.has(category as any)) {
        issues.push(`Missing templates for category: ${category}`);
      }
    }

    // Check channel coverage
    const channels = new Set(templates.map(t => t.channel));
    const requiredChannels = ['email', 'sms', 'in_app'];

    for (const channel of requiredChannels) {
      if (!channels.has(channel as any)) {
        recommendations.push(`Consider adding templates for channel: ${channel}`);
      }
    }

    // Check template quality
    const activeTemplates = templates.filter(t => t.status === 'active');
    if (activeTemplates.length < 10) {
      recommendations.push('Consider creating more active templates for better personalization');
    }

    // Check variable usage
    const templatesWithVariables = templates.filter(t =>
      t.content.includes('{{') && t.content.includes('}}')
    );

    if (templatesWithVariables.length < templates.length * 0.5) {
      recommendations.push('Many templates lack dynamic variables - consider adding personalization');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }
}

export const personalizationEngine = PersonalizationEngine.getInstance();