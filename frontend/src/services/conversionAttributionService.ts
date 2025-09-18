import { TemplateRecommendation } from '../types/template';

export interface ConversionAttribution {
  templateId: string;
  leadId: number;
  conversionEvent: {
    type: 'sale' | 'appointment' | 'inquiry' | 'engagement';
    value: number;
    timestamp: string;
    attribution: number;
  };
  touchpoints: Array<{
    templateId: string;
    timestamp: string;
    interaction: 'sent' | 'opened' | 'clicked' | 'responded';
    weight: number;
  }>;
  totalAttribution: number;
  roi: number;
}

export interface AttributionModel {
  id: string;
  name: string;
  description: string;
  type: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'position_based' | 'custom';
  config: {
    decayFactor?: number; // For time decay
    firstTouchWeight?: number; // For position based
    lastTouchWeight?: number; // For position based
    customWeights?: Record<string, number>; // For custom models
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttributionResult {
  leadId: number;
  conversionId: string;
  conversionType: 'sale' | 'appointment' | 'inquiry' | 'engagement';
  conversionValue: number;
  totalAttribution: number;
  touchpoints: Array<{
    templateId: string;
    interactionType: 'sent' | 'opened' | 'clicked' | 'responded';
    timestamp: string;
    weight: number;
    attributedValue: number;
    position: number; // Position in customer journey
  }>;
  attributionModel: string;
  confidence: number;
  insights: string[];
}

export interface AttributionAnalytics {
  timeframe: {
    start: string;
    end: string;
  };
  summary: {
    totalConversions: number;
    totalAttributedValue: number;
    averageAttributionPerConversion: number;
    topAttributionTemplates: Array<{
      templateId: string;
      attributedValue: number;
      attributionRate: number;
      conversionCount: number;
    }>;
  };
  channelAttribution: Record<string, {
    attributedValue: number;
    conversionCount: number;
    attributionRate: number;
  }>;
  journeyAnalytics: {
    averageTouchpoints: number;
    commonPaths: Array<{
      path: string[];
      frequency: number;
      conversionRate: number;
    }>;
    timeToConversion: {
      average: number;
      median: number;
      distribution: Record<string, number>; // time ranges
    };
  };
  recommendations: TemplateRecommendation[];
}

export interface MultiTouchAttribution {
  leadId: number;
  touchpoints: Array<{
    templateId: string;
    interactionType: 'sent' | 'opened' | 'clicked' | 'responded';
    timestamp: string;
    channel: string;
    campaign?: string;
    position: number;
  }>;
  conversion: {
    id: string;
    type: 'sale' | 'appointment' | 'inquiry' | 'engagement';
    value: number;
    timestamp: string;
  };
  attributionResults: Record<string, AttributionResult>; // Keyed by model ID
}

class ConversionAttributionService {
  private static instance: ConversionAttributionService;
  private attributionModels: Map<string, AttributionModel> = new Map();
  private attributionCache: Map<string, AttributionResult> = new Map();

  private constructor() {
    this.initializeDefaultModels();
  }

  public static getInstance(): ConversionAttributionService {
    if (!ConversionAttributionService.instance) {
      ConversionAttributionService.instance = new ConversionAttributionService();
    }
    return ConversionAttributionService.instance;
  }

  /**
   * Initialize default attribution models
   */
  private initializeDefaultModels(): void {
    const defaultModels: AttributionModel[] = [
      {
        id: 'first_touch',
        name: 'First Touch',
        description: '100% credit to first interaction',
        type: 'first_touch',
        config: {},
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'last_touch',
        name: 'Last Touch',
        description: '100% credit to last interaction',
        type: 'last_touch',
        config: {},
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'linear',
        name: 'Linear',
        description: 'Equal credit to all interactions',
        type: 'linear',
        config: {},
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'time_decay',
        name: 'Time Decay',
        description: 'More credit to recent interactions',
        type: 'time_decay',
        config: { decayFactor: 0.5 },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'position_based',
        name: 'Position Based',
        description: '40% to first, 40% to last, 20% to middle interactions',
        type: 'position_based',
        config: { firstTouchWeight: 0.4, lastTouchWeight: 0.4 },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    defaultModels.forEach(model => {
      this.attributionModels.set(model.id, model);
    });
  }

  /**
   * Calculate attribution for a single conversion
   */
  public calculateAttribution(
    leadId: number,
    conversionId: string,
    conversionType: 'sale' | 'appointment' | 'inquiry' | 'engagement',
    conversionValue: number,
    touchpoints: Array<{
      templateId: string;
      interactionType: 'sent' | 'opened' | 'clicked' | 'responded';
      timestamp: string;
    }>,
    modelId: string = 'position_based'
  ): AttributionResult {
    const model = this.attributionModels.get(modelId);
    if (!model) {
      throw new Error(`Attribution model ${modelId} not found`);
    }

    const weights = this.calculateWeights(touchpoints, model);
    const totalAttribution = Math.min(weights.reduce((sum, w) => sum + w, 0), 1);

    const attributedTouchpoints = touchpoints.map((tp, index) => ({
      templateId: tp.templateId,
      interactionType: tp.interactionType,
      timestamp: tp.timestamp,
      weight: weights[index],
      attributedValue: weights[index] * conversionValue,
      position: index + 1,
    }));

    const confidence = this.calculateConfidence(touchpoints, totalAttribution);
    const insights = this.generateAttributionInsights(attributedTouchpoints, conversionType);

    const result: AttributionResult = {
      leadId,
      conversionId,
      conversionType,
      conversionValue,
      totalAttribution,
      touchpoints: attributedTouchpoints,
      attributionModel: modelId,
      confidence,
      insights,
    };

    // Cache result
    const cacheKey = `${leadId}_${conversionId}_${modelId}`;
    this.attributionCache.set(cacheKey, result);

    return result;
  }

  /**
   * Calculate weights based on attribution model
   */
  private calculateWeights(
    touchpoints: Array<any>,
    model: AttributionModel
  ): number[] {
    const n = touchpoints.length;
    const weights: number[] = new Array(n).fill(0);

    switch (model.type) {
      case 'first_touch':
        weights[0] = 1.0;
        break;

      case 'last_touch':
        weights[n - 1] = 1.0;
        break;

      case 'linear':
        const linearWeight = 1.0 / n;
        weights.fill(linearWeight);
        break;

      case 'time_decay':
        const decayFactor = model.config.decayFactor || 0.5;
        let totalWeight = 0;

        for (let i = n - 1; i >= 0; i--) {
          const timeWeight = Math.pow(decayFactor, n - 1 - i);
          weights[i] = timeWeight;
          totalWeight += timeWeight;
        }

        // Normalize to sum to 1
        weights.forEach((w, i) => weights[i] = w / totalWeight);
        break;

      case 'position_based':
        const firstWeight = model.config.firstTouchWeight || 0.4;
        const lastWeight = model.config.lastTouchWeight || 0.4;
        const middleWeight = (1 - firstWeight - lastWeight) / Math.max(1, n - 2);

        weights[0] = firstWeight;
        if (n > 1) {
          weights[n - 1] = lastWeight;
        }

        for (let i = 1; i < n - 1; i++) {
          weights[i] = middleWeight;
        }
        break;

      case 'custom':
        const customWeights = model.config.customWeights || {};
        touchpoints.forEach((tp, i) => {
          weights[i] = customWeights[tp.interactionType] || 0.1;
        });

        // Normalize
        const totalCustomWeight = weights.reduce((sum, w) => sum + w, 0);
        weights.forEach((w, i) => weights[i] = w / totalCustomWeight);
        break;
    }

    return weights;
  }

  /**
   * Calculate confidence in attribution
   */
  private calculateConfidence(touchpoints: Array<any>, totalAttribution: number): number {
    let confidence = 0.5; // Base confidence

    // More touchpoints = higher confidence
    confidence += Math.min(touchpoints.length * 0.1, 0.3);

    // Higher attribution = higher confidence
    confidence += totalAttribution * 0.2;

    // Recent interactions = higher confidence
    const recentInteractions = touchpoints.filter(tp => {
      const daysSince = (Date.now() - new Date(tp.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30;
    });
    confidence += (recentInteractions.length / touchpoints.length) * 0.1;

    return Math.min(confidence, 0.95);
  }

  /**
   * Generate attribution insights
   */
  private generateAttributionInsights(
    touchpoints: AttributionResult['touchpoints'],
    conversionType: string
  ): string[] {
    const insights: string[] = [];

    // Find most influential touchpoint
    const mostInfluential = touchpoints.reduce((max, current) =>
      current.weight > max.weight ? current : max
    );

    insights.push(`Most influential touchpoint: ${mostInfluential.interactionType} interaction with ${mostInfluential.templateId}`);

    // Analyze interaction sequence
    const interactionSequence = touchpoints.map(tp => tp.interactionType);
    const uniqueInteractions = [...new Set(interactionSequence)];

    if (uniqueInteractions.length > 1) {
      insights.push(`Customer journey included ${uniqueInteractions.length} different interaction types`);
    }

    // Time analysis
    if (touchpoints.length > 1) {
      const firstTouch = new Date(touchpoints[0].timestamp);
      const lastTouch = new Date(touchpoints[touchpoints.length - 1].timestamp);
      const journeyLength = (lastTouch.getTime() - firstTouch.getTime()) / (1000 * 60 * 60 * 24);

      insights.push(`Customer journey spanned ${Math.round(journeyLength)} days`);
    }

    // Conversion type insights
    switch (conversionType) {
      case 'sale':
        insights.push('High-value conversion - focus on nurturing similar high-intent leads');
        break;
      case 'appointment':
        insights.push('Appointment booking - template effective for lead qualification');
        break;
      case 'inquiry':
        insights.push('Initial inquiry - template successful at generating interest');
        break;
    }

    return insights;
  }

  /**
   * Generate comprehensive attribution analytics
   */
  public async generateAttributionAnalytics(
    timeframe: { start: string; end: string },
    modelId: string = 'position_based'
  ): Promise<AttributionAnalytics> {
    // This would fetch actual attribution data from database/cache
    // For now, return mock analytics structure

    const mockAnalytics: AttributionAnalytics = {
      timeframe,
      summary: {
        totalConversions: 1250,
        totalAttributedValue: 375000,
        averageAttributionPerConversion: 300,
        topAttributionTemplates: [
          { templateId: 'welcome_email', attributedValue: 75000, attributionRate: 0.25, conversionCount: 250 },
          { templateId: 'follow_up_offer', attributedValue: 60000, attributionRate: 0.20, conversionCount: 200 },
          { templateId: 'property_alert', attributedValue: 45000, attributionRate: 0.15, conversionCount: 150 },
        ],
      },
      channelAttribution: {
        email: { attributedValue: 225000, conversionCount: 750, attributionRate: 0.60 },
        sms: { attributedValue: 112500, conversionCount: 375, attributionRate: 0.30 },
        in_app: { attributedValue: 37500, conversionCount: 125, attributionRate: 0.10 },
      },
      journeyAnalytics: {
        averageTouchpoints: 3.2,
        commonPaths: [
          { path: ['sent', 'opened', 'clicked'], frequency: 450, conversionRate: 0.35 },
          { path: ['sent', 'opened', 'responded'], frequency: 320, conversionRate: 0.28 },
          { path: ['sent', 'clicked'], frequency: 280, conversionRate: 0.22 },
        ],
        timeToConversion: {
          average: 7.5,
          median: 5,
          distribution: {
            '0-1 days': 150,
            '2-3 days': 280,
            '4-7 days': 420,
            '8-14 days': 320,
            '15+ days': 80,
          },
        },
      },
      recommendations: [
        {
          templateId: 'welcome_email',
          score: 85,
          reasons: ['Highest attribution value', 'Strong first-touch impact'],
          confidence: 'high',
          expectedPerformance: {
            openRate: 0.45,
            responseRate: 0.12,
            conversionRate: 0.08,
          },
          similarTemplates: ['onboarding_flow', 'initial_contact'],
        },
      ],
    };

    return mockAnalytics;
  }

  /**
   * Perform multi-touch attribution analysis
   */
  public performMultiTouchAttribution(
    leadId: number,
    touchpoints: MultiTouchAttribution['touchpoints'],
    conversion: MultiTouchAttribution['conversion']
  ): MultiTouchAttribution {
    const attributionResults: Record<string, AttributionResult> = {};

    // Calculate attribution using all available models
    for (const model of this.attributionModels.values()) {
      if (!model.isActive) continue;

      try {
        const result = this.calculateAttribution(
          leadId,
          conversion.id,
          conversion.type,
          conversion.value,
          touchpoints.map(tp => ({
            templateId: tp.templateId,
            interactionType: tp.interactionType,
            timestamp: tp.timestamp,
          })),
          model.id
        );

        attributionResults[model.id] = result;
      } catch (error) {
        console.error(`Failed to calculate attribution for model ${model.id}:`, error);
      }
    }

    return {
      leadId,
      touchpoints,
      conversion,
      attributionResults,
    };
  }

  /**
   * Compare attribution models
   */
  public compareAttributionModels(
    conversions: Array<{
      leadId: number;
      conversionId: string;
      conversionType: 'sale' | 'appointment' | 'inquiry' | 'engagement';
      conversionValue: number;
      touchpoints: Array<{
        templateId: string;
        interactionType: 'sent' | 'opened' | 'clicked' | 'responded';
        timestamp: string;
      }>;
    }>
  ): Record<string, {
    totalAttributedValue: number;
    averageAttribution: number;
    topTemplates: Array<{ templateId: string; attributedValue: number }>;
  }> {
    const modelComparison: Record<string, any> = {};

    for (const model of this.attributionModels.values()) {
      if (!model.isActive) continue;

      const modelResults: AttributionResult[] = [];

      for (const conversion of conversions) {
        try {
          const result = this.calculateAttribution(
            conversion.leadId,
            conversion.conversionId,
            conversion.conversionType,
            conversion.conversionValue,
            conversion.touchpoints,
            model.id
          );
          modelResults.push(result);
        } catch (error) {
          console.error(`Failed to calculate attribution for conversion ${conversion.conversionId}:`, error);
        }
      }

      // Aggregate results
      const totalAttributedValue = modelResults.reduce((sum, r) => sum + r.totalAttribution * r.conversionValue, 0);
      const averageAttribution = modelResults.length > 0 ?
        modelResults.reduce((sum, r) => sum + r.totalAttribution, 0) / modelResults.length : 0;

      // Find top templates
      const templateAttribution: Record<string, number> = {};
      modelResults.forEach(result => {
        result.touchpoints.forEach(tp => {
          templateAttribution[tp.templateId] = (templateAttribution[tp.templateId] || 0) + tp.attributedValue;
        });
      });

      const topTemplates = Object.entries(templateAttribution)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([templateId, attributedValue]) => ({ templateId, attributedValue }));

      modelComparison[model.id] = {
        totalAttributedValue,
        averageAttribution,
        topTemplates,
      };
    }

    return modelComparison;
  }

  /**
   * Create custom attribution model
   */
  public createCustomModel(
    name: string,
    description: string,
    config: AttributionModel['config']
  ): AttributionModel {
    const model: AttributionModel = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      type: 'custom',
      config,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.attributionModels.set(model.id, model);
    return model;
  }

  /**
   * Get all attribution models
   */
  public getAttributionModels(): AttributionModel[] {
    return Array.from(this.attributionModels.values());
  }

  /**
   * Update attribution model
   */
  public updateAttributionModel(id: string, updates: Partial<AttributionModel>): boolean {
    const model = this.attributionModels.get(id);
    if (!model) return false;

    this.attributionModels.set(id, {
      ...model,
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Delete attribution model
   */
  public deleteAttributionModel(id: string): boolean {
    return this.attributionModels.delete(id);
  }

  /**
   * Clear attribution cache
   */
  public clearCache(): void {
    this.attributionCache.clear();
  }

  /**
   * Get service statistics
   */
  public getStatistics(): {
    totalModels: number;
    activeModels: number;
    cachedAttributions: number;
    attributionCalculations: number;
  } {
    return {
      totalModels: this.attributionModels.size,
      activeModels: Array.from(this.attributionModels.values()).filter(m => m.isActive).length,
      cachedAttributions: this.attributionCache.size,
      attributionCalculations: 0, // Would track actual calculations
    };
  }

  /**
   * Validate attribution setup
   */
  public validateAttributionSetup(): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const activeModels = Array.from(this.attributionModels.values()).filter(m => m.isActive);

    if (activeModels.length === 0) {
      issues.push('No active attribution models configured');
      recommendations.push('Enable at least one attribution model (Position Based recommended)');
    }

    if (activeModels.length < 2) {
      recommendations.push('Consider enabling multiple attribution models for comparison');
    }

    const hasCustomModel = activeModels.some(m => m.type === 'custom');
    if (!hasCustomModel) {
      recommendations.push('Consider creating a custom attribution model for your specific business needs');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }
}

export const conversionAttributionService = ConversionAttributionService.getInstance();