import { Injectable } from '../types/di';
import {
  PredictiveAnalytics,
  ConversionForecast,
  DealValuePrediction,
  BehavioralPatterns,
  RiskAssessment,
  OpportunityScore,
  LeadInsights,
  PredictiveTimelineData,
  ScenarioAnalysis,
} from '../types/dashboard';
import { MLScoringService } from './mlScoringService';
import { RealTimeScoringService } from './realTimeScoringService';

@Injectable()
export class PredictiveAnalyticsService {
  private static instance: PredictiveAnalyticsService;
  private mlScoringService: MLScoringService;
  private realTimeScoringService: RealTimeScoringService;

  // Prediction models and algorithms
  private conversionModel: any = null;
  private valueModel: any = null;
  private riskModel: any = null;

  // Historical data for pattern analysis
  private historicalData: Map<number, any[]> = new Map();
  private patternCache: Map<string, BehavioralPatterns> = new Map();

  // Prediction confidence thresholds
  private readonly CONFIDENCE_THRESHOLDS = {
    HIGH: 0.8,
    MEDIUM: 0.6,
    LOW: 0.4,
  };

  private constructor() {
    this.mlScoringService = MLScoringService.getInstance();
    this.realTimeScoringService = RealTimeScoringService.getInstance();
    this.initializePredictionModels();
  }

  public static getInstance(): PredictiveAnalyticsService {
    if (!PredictiveAnalyticsService.instance) {
      PredictiveAnalyticsService.instance = new PredictiveAnalyticsService();
    }
    return PredictiveAnalyticsService.instance;
  }

  /**
   * Generate comprehensive predictive analytics for a lead
   */
  public async generatePredictiveAnalytics(
    leadId: number,
    options?: {
      includeTimeline?: boolean;
      includeValue?: boolean;
      includeRisk?: boolean;
      includeScenarios?: boolean;
      timeHorizon?: number; // days
    }
  ): Promise<PredictiveAnalytics> {
    const {
      includeTimeline = true,
      includeValue = true,
      includeRisk = true,
      includeScenarios = false,
      timeHorizon = 90,
    } = options || {};

    try {
      // Get lead data and historical patterns
      const leadData = await this.getLeadData(leadId);
      const historicalPatterns = await this.getHistoricalPatterns(leadId);

      // Generate predictions in parallel
      const [
        conversionForecast,
        dealValuePrediction,
        behavioralPatterns,
        riskAssessment,
        opportunityScore,
      ] = await Promise.all([
        includeTimeline ? this.generateConversionForecast(leadData, historicalPatterns, timeHorizon) : null,
        includeValue ? this.generateDealValuePrediction(leadData, historicalPatterns) : null,
        this.analyzeBehavioralPatterns(leadData, historicalPatterns),
        includeRisk ? this.assessRisk(leadData, historicalPatterns) : null,
        this.calculateOpportunityScore(leadData, historicalPatterns),
      ]);

      const analytics: PredictiveAnalytics = {
        leadId,
        conversionForecast: conversionForecast || undefined,
        dealValuePrediction: dealValuePrediction || undefined,
        behavioralPatterns,
        riskAssessment: riskAssessment || undefined,
        opportunityScore,
      };

      // Add scenario analysis if requested
      if (includeScenarios && conversionForecast) {
        analytics.scenarios = await this.generateScenarios(leadData, conversionForecast);
      }

      return analytics;

    } catch (error) {
      console.error(`Failed to generate predictive analytics for lead ${leadId}:`, error);
      throw new Error('Failed to generate predictive analytics');
    }
  }

  /**
   * Generate conversion forecast with timeline
   */
  private async generateConversionForecast(
    leadData: any,
    historicalPatterns: any[],
    timeHorizon: number
  ): Promise<ConversionForecast> {
    try {
      // Use ML model for conversion probability prediction
      const baseProbability = await this.predictConversionProbability(leadData);

      // Generate timeline with confidence intervals
      const timeline = await this.generateConversionTimeline(
        leadData,
        baseProbability,
        timeHorizon
      );

      // Identify key factors influencing conversion
      const factors = await this.identifyConversionFactors(leadData, historicalPatterns);

      // Generate scenarios
      const scenarios = this.generateConversionScenarios(baseProbability, factors);

      return {
        probability: baseProbability,
        confidence: this.calculateConfidence(baseProbability, historicalPatterns),
        estimatedTimeline: timeline,
        factors,
        scenarios,
      };

    } catch (error) {
      console.error('Failed to generate conversion forecast:', error);
      // Return fallback forecast
      return {
        probability: 0.5,
        confidence: 0.5,
        estimatedTimeline: {
          optimistic: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          realistic: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          pessimistic: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
        },
        factors: [],
        scenarios: [],
      };
    }
  }

  /**
   * Generate deal value prediction
   */
  private async generateDealValuePrediction(
    leadData: any,
    historicalPatterns: any[]
  ): Promise<DealValuePrediction> {
    try {
      // Predict deal value using regression model
      const estimatedValue = await this.predictDealValue(leadData);

      // Calculate confidence interval
      const confidence = this.calculateValueConfidence(estimatedValue, historicalPatterns);

      // Generate value range
      const range = this.calculateValueRange(estimatedValue, confidence);

      // Identify value drivers
      const factors = await this.identifyValueFactors(leadData, historicalPatterns);

      // Get comparable deals
      const comparables = await this.findComparableDeals(leadData);

      return {
        estimatedValue,
        confidence,
        range,
        factors,
        comparables,
      };

    } catch (error) {
      console.error('Failed to generate deal value prediction:', error);
      return {
        estimatedValue: 50000,
        confidence: 0.5,
        range: { min: 30000, max: 80000 },
        factors: [],
        comparables: [],
      };
    }
  }

  /**
   * Analyze behavioral patterns
   */
  private async analyzeBehavioralPatterns(
    leadData: any,
    historicalPatterns: any[]
  ): Promise<BehavioralPatterns> {
    try {
      const cacheKey = `behavioral_${leadData.id}`;
      if (this.patternCache.has(cacheKey)) {
        return this.patternCache.get(cacheKey)!;
      }

      // Analyze engagement patterns
      const engagementPatterns = this.analyzeEngagementPatterns(leadData, historicalPatterns);

      // Identify behavioral trends
      const trends = this.identifyBehavioralTrends(leadData, historicalPatterns);

      // Calculate pattern significance
      const significance = this.calculatePatternSignificance(engagementPatterns, trends);

      // Generate insights
      const insights = this.generateBehavioralInsights(engagementPatterns, trends);

      const patterns: BehavioralPatterns = {
        engagementPatterns,
        trends,
        significance,
        insights,
        lastAnalyzed: new Date().toISOString(),
      };

      // Cache results
      this.patternCache.set(cacheKey, patterns);

      return patterns;

    } catch (error) {
      console.error('Failed to analyze behavioral patterns:', error);
      return {
        engagementPatterns: [],
        trends: [],
        significance: 0.5,
        insights: [],
        lastAnalyzed: new Date().toISOString(),
      };
    }
  }

  /**
   * Assess conversion risk
   */
  private async assessRisk(
    leadData: any,
    historicalPatterns: any[]
  ): Promise<RiskAssessment> {
    try {
      // Calculate overall risk score
      const overallRisk = await this.calculateOverallRisk(leadData, historicalPatterns);

      // Identify risk factors
      const riskFactors = await this.identifyRiskFactors(leadData, historicalPatterns);

      // Generate mitigation strategies
      const mitigationStrategies = this.generateMitigationStrategies(riskFactors);

      // Calculate confidence in risk assessment
      const confidence = this.calculateRiskConfidence(riskFactors, historicalPatterns);

      return {
        overallRisk,
        riskFactors,
        mitigationStrategies,
        confidence,
      };

    } catch (error) {
      console.error('Failed to assess risk:', error);
      return {
        overallRisk: 0.5,
        riskFactors: [],
        mitigationStrategies: [],
        confidence: 0.5,
      };
    }
  }

  /**
   * Calculate opportunity score
   */
  private async calculateOpportunityScore(
    leadData: any,
    historicalPatterns: any[]
  ): Promise<number> {
    try {
      // Combine multiple factors for opportunity scoring
      const conversionProbability = await this.predictConversionProbability(leadData);
      const dealValue = await this.predictDealValue(leadData);
      const riskScore = await this.calculateOverallRisk(leadData, historicalPatterns);

      // Weighted scoring algorithm
      const weights = {
        conversion: 0.4,
        value: 0.4,
        risk: 0.2,
      };

      const opportunityScore =
        (conversionProbability * weights.conversion) +
        ((dealValue / 100000) * weights.value) + // Normalize value
        ((1 - riskScore) * weights.risk); // Invert risk (lower risk = higher score)

      return Math.min(Math.max(opportunityScore, 0), 1); // Clamp between 0 and 1

    } catch (error) {
      console.error('Failed to calculate opportunity score:', error);
      return 0.5;
    }
  }

  /**
   * Generate predictive timeline data
   */
  public async generatePredictiveTimeline(
    leadIds: number[],
    timeHorizon: number = 90
  ): Promise<PredictiveTimelineData[]> {
    try {
      const timelinePromises = leadIds.map(async (leadId) => {
        const leadData = await this.getLeadData(leadId);
        const forecast = await this.generateConversionForecast(leadData, [], timeHorizon);

        return {
          leadId,
          timeline: this.generateTimelinePoints(forecast, timeHorizon),
          confidence: forecast.confidence,
        };
      });

      return await Promise.all(timelinePromises);

    } catch (error) {
      console.error('Failed to generate predictive timeline:', error);
      return [];
    }
  }

  /**
   * Generate scenario analysis
   */
  private async generateScenarios(
    leadData: any,
    forecast: ConversionForecast
  ): Promise<ScenarioAnalysis[]> {
    const scenarios: ScenarioAnalysis[] = [];

    // Best case scenario
    scenarios.push({
      name: 'Best Case',
      probability: forecast.probability * 1.2,
      timeline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      value: forecast.probability * 1.5,
      factors: ['High engagement', 'Strong signals', 'Market conditions'],
      likelihood: 0.3,
    });

    // Realistic scenario
    scenarios.push({
      name: 'Realistic',
      probability: forecast.probability,
      timeline: forecast.estimatedTimeline.realistic,
      value: forecast.probability,
      factors: ['Current engagement level', 'Historical patterns'],
      likelihood: 0.5,
    });

    // Worst case scenario
    scenarios.push({
      name: 'Worst Case',
      probability: forecast.probability * 0.7,
      timeline: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
      value: forecast.probability * 0.6,
      factors: ['Low engagement', 'Competitive pressure', 'Economic factors'],
      likelihood: 0.2,
    });

    return scenarios;
  }

  // Private helper methods

  private async initializePredictionModels(): Promise<void> {
    try {
      // Initialize ML models for predictions
      // In a real implementation, this would load trained models
      this.conversionModel = { predict: (data: any) => Math.random() * 0.8 + 0.1 };
      this.valueModel = { predict: (data: any) => Math.random() * 200000 + 50000 };
      this.riskModel = { predict: (data: any) => Math.random() * 0.6 + 0.2 };
    } catch (error) {
      console.warn('Failed to initialize prediction models:', error);
    }
  }

  private async getLeadData(leadId: number): Promise<any> {
    // Mock implementation - in real system, fetch from API
    return {
      id: leadId,
      score: Math.random() * 100,
      engagementLevel: Math.random() > 0.5 ? 'high' : 'medium',
      activityCount: Math.floor(Math.random() * 20) + 1,
      lastActivity: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      source: 'website',
      propertyType: 'house',
      budget: Math.random() * 500000 + 100000,
    };
  }

  private async getHistoricalPatterns(leadId: number): Promise<any[]> {
    // Mock implementation - in real system, fetch historical data
    if (!this.historicalData.has(leadId)) {
      this.historicalData.set(leadId, Array.from({ length: 10 }, (_, i) => ({
        date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString(),
        score: Math.random() * 100,
        engagement: Math.random() > 0.5 ? 'high' : 'medium',
        activities: Math.floor(Math.random() * 5) + 1,
      })));
    }
    return this.historicalData.get(leadId) || [];
  }

  private async predictConversionProbability(leadData: any): Promise<number> {
    // Use ML model or fallback to rule-based prediction
    if (this.conversionModel) {
      return this.conversionModel.predict(leadData);
    }

    // Fallback rule-based prediction
    let probability = 0.3; // Base probability

    if (leadData.score > 80) probability += 0.3;
    else if (leadData.score > 60) probability += 0.2;
    else if (leadData.score > 40) probability += 0.1;

    if (leadData.engagementLevel === 'high') probability += 0.2;
    else if (leadData.engagementLevel === 'medium') probability += 0.1;

    if (leadData.activityCount > 10) probability += 0.1;
    else if (leadData.activityCount > 5) probability += 0.05;

    return Math.min(probability, 0.95);
  }

  private async predictDealValue(leadData: any): Promise<number> {
    // Use ML model or fallback to rule-based prediction
    if (this.valueModel) {
      return this.valueModel.predict(leadData);
    }

    // Fallback rule-based prediction
    let baseValue = 150000; // Base deal value

    if (leadData.propertyType === 'house') baseValue *= 1.2;
    else if (leadData.propertyType === 'condo') baseValue *= 0.8;

    if (leadData.budget) {
      baseValue = (baseValue + leadData.budget) / 2; // Average with provided budget
    }

    // Adjust based on score
    const scoreMultiplier = 0.5 + (leadData.score / 100) * 0.5;
    baseValue *= scoreMultiplier;

    return Math.max(baseValue, 50000);
  }

  private generateConversionTimeline(
    leadData: any,
    baseProbability: number,
    timeHorizon: number
  ): { optimistic: string; realistic: string; pessimistic: string } {
    const now = Date.now();
    const baseDays = 60; // Base conversion time

    // Adjust based on probability and engagement
    let timeMultiplier = 1;
    if (baseProbability > 0.7) timeMultiplier = 0.7;
    else if (baseProbability > 0.5) timeMultiplier = 0.9;
    else timeMultiplier = 1.2;

    if (leadData.engagementLevel === 'high') timeMultiplier *= 0.8;
    else if (leadData.engagementLevel === 'low') timeMultiplier *= 1.2;

    const realisticDays = Math.round(baseDays * timeMultiplier);
    const optimisticDays = Math.round(realisticDays * 0.6);
    const pessimisticDays = Math.round(realisticDays * 1.8);

    return {
      optimistic: new Date(now + optimisticDays * 24 * 60 * 60 * 1000).toISOString(),
      realistic: new Date(now + realisticDays * 24 * 60 * 60 * 1000).toISOString(),
      pessimistic: new Date(now + pessimisticDays * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  private async identifyConversionFactors(leadData: any, historicalPatterns: any[]): Promise<any[]> {
    const factors = [];

    // Score factor
    if (leadData.score > 80) {
      factors.push({
        name: 'High Lead Score',
        impact: 0.3,
        type: 'positive',
        description: 'Lead score above 80 indicates strong potential',
      });
    }

    // Engagement factor
    if (leadData.engagementLevel === 'high') {
      factors.push({
        name: 'High Engagement',
        impact: 0.25,
        type: 'positive',
        description: 'Consistent high engagement with marketing materials',
      });
    }

    // Activity factor
    if (leadData.activityCount > 10) {
      factors.push({
        name: 'High Activity',
        impact: 0.2,
        type: 'positive',
        description: 'Frequent interactions indicate strong interest',
      });
    }

    // Recent activity factor
    const daysSinceActivity = (Date.now() - new Date(leadData.lastActivity).getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceActivity < 7) {
      factors.push({
        name: 'Recent Activity',
        impact: 0.15,
        type: 'positive',
        description: 'Recent engagement suggests active interest',
      });
    }

    return factors;
  }

  private generateConversionScenarios(baseProbability: number, factors: any[]): any[] {
    // Generate optimistic, realistic, and pessimistic scenarios
    return [
      {
        name: 'Optimistic',
        probability: Math.min(baseProbability * 1.3, 0.95),
        conditions: ['All positive factors align', 'Market conditions favorable'],
        likelihood: 0.25,
      },
      {
        name: 'Realistic',
        probability: baseProbability,
        conditions: ['Current engagement maintained', 'Normal market conditions'],
        likelihood: 0.5,
      },
      {
        name: 'Pessimistic',
        probability: Math.max(baseProbability * 0.6, 0.05),
        conditions: ['Engagement decreases', 'Competitive pressure increases'],
        likelihood: 0.25,
      },
    ];
  }

  private calculateConfidence(probability: number, historicalPatterns: any[]): number {
    // Calculate confidence based on historical accuracy and data quality
    let confidence = 0.7; // Base confidence

    // Adjust based on historical pattern consistency
    if (historicalPatterns.length > 5) {
      confidence += 0.1;
    }

    // Adjust based on probability extremes
    if (probability > 0.8 || probability < 0.2) {
      confidence -= 0.1; // Less confident in extreme predictions
    }

    return Math.max(0.3, Math.min(confidence, 0.95));
  }

  private async identifyValueFactors(leadData: any, historicalPatterns: any[]): Promise<any[]> {
    const factors = [];

    // Property type factor
    if (leadData.propertyType) {
      factors.push({
        name: 'Property Type',
        impact: 0.2,
        type: leadData.propertyType === 'house' ? 'positive' : 'neutral',
        description: `${leadData.propertyType} typically commands ${leadData.propertyType === 'house' ? 'higher' : 'standard'} values`,
      });
    }

    // Budget factor
    if (leadData.budget) {
      factors.push({
        name: 'Budget Range',
        impact: 0.25,
        type: 'positive',
        description: `Lead has expressed budget of $${leadData.budget.toLocaleString()}`,
      });
    }

    // Score factor
    factors.push({
      name: 'Lead Score',
      impact: 0.15,
      type: leadData.score > 70 ? 'positive' : 'neutral',
      description: `Lead score of ${leadData.score} influences value expectation`,
    });

    return factors;
  }

  private calculateValueRange(estimatedValue: number, confidence: number): { min: number; max: number } {
    const range = estimatedValue * (1 - confidence) * 0.5; // 50% of uncertainty as range
    return {
      min: Math.max(estimatedValue - range, 25000),
      max: estimatedValue + range,
    };
  }

  private async findComparableDeals(leadData: any): Promise<any[]> {
    // Mock implementation - in real system, query similar deals
    return Array.from({ length: 3 }, (_, i) => ({
      id: `deal_${i + 1}`,
      value: leadData.budget * (0.8 + Math.random() * 0.4),
      propertyType: leadData.propertyType,
      similarity: 0.7 + Math.random() * 0.3,
      closedDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    }));
  }

  private analyzeEngagementPatterns(leadData: any, historicalPatterns: any[]): any[] {
    const patterns = [];

    // Analyze activity frequency
    const activityFrequency = historicalPatterns.reduce((sum, pattern) => sum + pattern.activities, 0) / historicalPatterns.length;

    patterns.push({
      type: 'activity_frequency',
      value: activityFrequency,
      trend: activityFrequency > 3 ? 'high' : activityFrequency > 1 ? 'medium' : 'low',
      significance: activityFrequency > 3 ? 0.8 : activityFrequency > 1 ? 0.6 : 0.4,
    });

    // Analyze engagement consistency
    const engagementLevels = historicalPatterns.map(p => p.engagement);
    const highEngagementRatio = engagementLevels.filter(e => e === 'high').length / engagementLevels.length;

    patterns.push({
      type: 'engagement_consistency',
      value: highEngagementRatio,
      trend: highEngagementRatio > 0.7 ? 'high' : highEngagementRatio > 0.4 ? 'medium' : 'low',
      significance: highEngagementRatio > 0.7 ? 0.9 : highEngagementRatio > 0.4 ? 0.7 : 0.5,
    });

    return patterns;
  }

  private identifyBehavioralTrends(leadData: any, historicalPatterns: any[]): any[] {
    const trends = [];

    // Score trend
    const scores = historicalPatterns.map(p => p.score);
    const scoreTrend = this.calculateTrend(scores);

    trends.push({
      type: 'score_trend',
      direction: scoreTrend > 0.1 ? 'increasing' : scoreTrend < -0.1 ? 'decreasing' : 'stable',
      magnitude: Math.abs(scoreTrend),
      significance: Math.abs(scoreTrend) > 0.2 ? 0.8 : 0.5,
    });

    // Activity trend
    const activities = historicalPatterns.map(p => p.activities);
    const activityTrend = this.calculateTrend(activities);

    trends.push({
      type: 'activity_trend',
      direction: activityTrend > 0.5 ? 'increasing' : activityTrend < -0.5 ? 'decreasing' : 'stable',
      magnitude: Math.abs(activityTrend),
      significance: Math.abs(activityTrend) > 1 ? 0.9 : 0.6,
    });

    return trends;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private calculatePatternSignificance(patterns: any[], trends: any[]): number {
    const patternSignificance = patterns.reduce((sum, p) => sum + p.significance, 0) / patterns.length;
    const trendSignificance = trends.reduce((sum, t) => sum + t.significance, 0) / trends.length;

    return (patternSignificance + trendSignificance) / 2;
  }

  private generateBehavioralInsights(patterns: any[], trends: any[]): any[] {
    const insights = [];

    // Generate insights based on patterns and trends
    patterns.forEach(pattern => {
      if (pattern.type === 'activity_frequency' && pattern.trend === 'high') {
        insights.push({
          type: 'positive',
          category: 'engagement',
          title: 'High Activity Frequency',
          description: 'Lead shows consistent high engagement with marketing materials',
          impact: 0.8,
          confidence: pattern.significance,
        });
      }
    });

    trends.forEach(trend => {
      if (trend.type === 'score_trend' && trend.direction === 'increasing') {
        insights.push({
          type: 'positive',
          category: 'progression',
          title: 'Improving Lead Score',
          description: 'Lead score has been trending upward, indicating growing interest',
          impact: 0.6,
          confidence: trend.significance,
        });
      }
    });

    return insights;
  }

  private async calculateOverallRisk(leadData: any, historicalPatterns: any[]): Promise<number> {
    if (this.riskModel) {
      return this.riskModel.predict(leadData);
    }

    // Fallback risk calculation
    let risk = 0.3; // Base risk

    // High score reduces risk
    if (leadData.score > 80) risk -= 0.2;
    else if (leadData.score < 40) risk += 0.2;

    // Engagement level affects risk
    if (leadData.engagementLevel === 'low') risk += 0.15;
    else if (leadData.engagementLevel === 'high') risk -= 0.1;

    // Recent activity reduces risk
    const daysSinceActivity = (Date.now() - new Date(leadData.lastActivity).getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceActivity > 30) risk += 0.1;
    else if (daysSinceActivity < 7) risk -= 0.1;

    return Math.max(0, Math.min(risk, 1));
  }

  private async identifyRiskFactors(leadData: any, historicalPatterns: any[]): Promise<any[]> {
    const factors = [];

    // Low score risk
    if (leadData.score < 40) {
      factors.push({
        name: 'Low Lead Score',
        severity: 'high',
        description: 'Lead score below 40 indicates lower conversion potential',
        probability: 0.8,
        impact: 0.6,
      });
    }

    // Low engagement risk
    if (leadData.engagementLevel === 'low') {
      factors.push({
        name: 'Low Engagement',
        severity: 'medium',
        description: 'Limited engagement with marketing materials',
        probability: 0.7,
        impact: 0.4,
      });
    }

    // Stale activity risk
    const daysSinceActivity = (Date.now() - new Date(leadData.lastActivity).getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceActivity > 30) {
      factors.push({
        name: 'Stale Activity',
        severity: 'medium',
        description: `No activity for ${Math.round(daysSinceActivity)} days`,
        probability: 0.6,
        impact: 0.3,
      });
    }

    return factors;
  }

  private generateMitigationStrategies(riskFactors: any[]): any[] {
    const strategies = [];

    riskFactors.forEach(factor => {
      switch (factor.name) {
        case 'Low Lead Score':
          strategies.push({
            name: 'Personalized Nurturing',
            description: 'Send targeted content to improve engagement and score',
            effectiveness: 0.7,
            effort: 'medium',
            timeline: '2-4 weeks',
          });
          break;
        case 'Low Engagement':
          strategies.push({
            name: 'Re-engagement Campaign',
            description: 'Launch re-engagement sequence with compelling offers',
            effectiveness: 0.6,
            effort: 'medium',
            timeline: '1-2 weeks',
          });
          break;
        case 'Stale Activity':
          strategies.push({
            name: 'Follow-up Outreach',
            description: 'Reach out directly to re-establish contact',
            effectiveness: 0.8,
            effort: 'low',
            timeline: '3-5 days',
          });
          break;
      }
    });

    return strategies;
  }

  private calculateRiskConfidence(riskFactors: any[], historicalPatterns: any[]): number {
    // Calculate confidence based on data quality and historical patterns
    let confidence = 0.7;

    if (riskFactors.length > 3) confidence += 0.1;
    if (historicalPatterns.length > 10) confidence += 0.1;
    if (historicalPatterns.length < 3) confidence -= 0.2;

    return Math.max(0.4, Math.min(confidence, 0.95));
  }

  private calculateValueConfidence(estimatedValue: number, historicalPatterns: any[]): number {
    // Calculate confidence based on historical data and estimation factors
    let confidence = 0.7;

    if (historicalPatterns.length > 5) confidence += 0.1;
    if (estimatedValue > 500000) confidence -= 0.1; // Less confident with high values
    if (estimatedValue < 50000) confidence -= 0.1; // Less confident with low values

    return Math.max(0.5, Math.min(confidence, 0.9));
  }

  private generateTimelinePoints(forecast: ConversionForecast, timeHorizon: number): any[] {
    const points = [];
    const now = Date.now();

    for (let i = 0; i <= timeHorizon; i += 7) { // Weekly points
      const date = new Date(now + i * 24 * 60 * 60 * 1000);
      const progress = i / timeHorizon;

      // Calculate probability at this point (simplified model)
      const probabilityAtPoint = forecast.probability * (1 - Math.exp(-progress * 2));

      points.push({
        date: date.toISOString(),
        probability: probabilityAtPoint,
        confidence: forecast.confidence * (1 - progress * 0.2), // Confidence decreases over time
      });
    }

    return points;
  }

  /**
   * Clear cache and reset service
   */
  public clearCache(): void {
    this.historicalData.clear();
    this.patternCache.clear();
  }

  /**
   * Update prediction models (for model retraining)
   */
  public updateModels(models: { conversion?: any; value?: any; risk?: any }): void {
    if (models.conversion) this.conversionModel = models.conversion;
    if (models.value) this.valueModel = models.value;
    if (models.risk) this.riskModel = models.risk;
  }
}

export const predictiveAnalyticsService = PredictiveAnalyticsService.getInstance();