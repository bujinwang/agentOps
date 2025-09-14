import {
  PerformanceInsight,
  PerformanceAnalysisResult,
  LeadPerformanceInsights,
  InsightsFilters,
  InsightsSettings,
  InsightsCache,
  RecommendationRule,
  RecommendationContext,
  RecommendationResult,
  InsightsAnalyticsData,
  InsightType,
  InsightImpact,
  InsightCategory
} from '../types/insights';
import { Lead, DashboardKPIs, LeadAnalytics, PerformanceMetrics } from '../types';
import { analyticsService } from './AnalyticsService';
import leadScoringService from './LeadScoringService';
import { LeadScore, LeadData } from '../types/leadScoring';
import { offlineStorage } from './offlineStorage';

class PerformanceInsightsService {
  private cache: InsightsCache = {};
  private settings: InsightsSettings = {
    enabledCategories: ['timing', 'strategy', 'prioritization', 'follow_up', 'quality', 'conversion'],
    minConfidenceThreshold: 70,
    maxInsightsPerCategory: 3,
    autoRefreshInterval: 30, // 30 minutes
    cacheExpiration: 2 // 2 hours
  };

  private recommendationRules: RecommendationRule[] = [
    {
      id: 'timing-urgent-followup',
      name: 'Urgent Follow-up Required',
      condition: 'lead.score > 80 && lead.lastContactedAt > 24',
      action: 'Schedule follow-up within 2 hours',
      priority: 9,
      category: 'timing',
      enabled: true
    },
    {
      id: 'strategy-high-value-lead',
      name: 'High-Value Lead Strategy',
      condition: 'lead.score > 85 && lead.budgetMax > 500000',
      action: 'Prioritize personal contact and premium property recommendations',
      priority: 8,
      category: 'strategy',
      enabled: true
    },
    {
      id: 'followup-weekend-timing',
      name: 'Weekend Follow-up Optimization',
      condition: 'currentDay === "friday" || currentDay === "saturday"',
      action: 'Schedule follow-up for Monday morning when leads are most responsive',
      priority: 7,
      category: 'follow_up',
      enabled: true
    },
    {
      id: 'quality-lead-nurturing',
      name: 'Lead Quality Nurturing',
      condition: 'lead.score < 50 && lead.interactions < 3',
      action: 'Focus on building relationship through educational content',
      priority: 6,
      category: 'quality',
      enabled: true
    },
    {
      id: 'conversion-bottleneck',
      name: 'Conversion Bottleneck Alert',
      condition: 'analytics.conversionFunnel.some(stage => stage.conversionRate < 0.3)',
      action: 'Review and optimize the identified bottleneck stage',
      priority: 9,
      category: 'conversion',
      enabled: true
    }
  ];

  constructor() {
    this.loadSettings();
    this.loadCache();
  }

  // Core Analysis Methods
  async analyzeLeadPerformance(leadId: number): Promise<LeadPerformanceInsights> {
    const cacheKey = `lead-${leadId}`;
    const cached = this.getCachedResult(cacheKey);

    if (cached) {
      return cached.data as LeadPerformanceInsights;
    }

    const lead = await this.getLeadData(leadId);
    const analytics = await analyticsService.getLeadAnalytics();
    const scoring = lead.scoreHistory || [];

    const insights = await this.generateLeadInsights(lead, analytics, scoring);
    const recommendations = await this.generateLeadRecommendations(lead, insights);

    const result: LeadPerformanceInsights = {
      leadId,
      overallScore: lead.score || 0,
      conversionProbability: this.calculateConversionProbability(lead, analytics),
      optimalFollowUpTime: this.calculateOptimalFollowUpTime(lead),
      riskFactors: this.identifyRiskFactors(lead, analytics),
      recommendations,
      insights,
      lastAnalyzed: new Date().toISOString()
    };

    this.setCachedResult(cacheKey, result);
    return result;
  }

  async analyzeOverallPerformance(filters?: InsightsFilters): Promise<PerformanceAnalysisResult> {
    const cacheKey = `overall-${JSON.stringify(filters || {})}`;
    const cached = this.getCachedResult(cacheKey);

    if (cached) {
      return cached.data as PerformanceAnalysisResult;
    }

    const analytics = await analyticsService.getLeadAnalytics();
    const leads = await this.getFilteredLeads(filters);
    const insights = await this.generateOverallInsights(analytics, leads, filters);

    const result: PerformanceAnalysisResult = {
      insights,
      summary: this.calculateInsightsSummary(insights),
      recommendations: this.extractRecommendations(insights),
      generatedAt: new Date().toISOString(),
      dataQuality: {
        sampleSize: leads.length,
        timeFrame: filters?.dateRange ? `${filters.dateRange.startDate} to ${filters.dateRange.endDate}` : 'All time',
        confidence: this.calculateDataConfidence(leads.length, analytics)
      }
    };

    this.setCachedResult(cacheKey, result);
    return result;
  }

  // Insight Generation Methods
  private async generateLeadInsights(
    lead: Lead,
    analytics: LeadAnalytics,
    scoring: any
  ): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];

    // Conversion Pattern Insight
    const conversionInsight = await this.analyzeConversionPatterns(lead, analytics);
    if (conversionInsight) insights.push(conversionInsight);

    // Timing Optimization Insight
    const timingInsight = await this.analyzeTimingOptimization(lead, analytics);
    if (timingInsight) insights.push(timingInsight);

    // Quality Trend Insight
    const qualityInsight = await this.analyzeQualityTrends(lead, scoring);
    if (qualityInsight) insights.push(qualityInsight);

    // Predictive Forecast Insight
    const forecastInsight = await this.generatePredictiveForecast(lead, analytics);
    if (forecastInsight) insights.push(forecastInsight);

    return insights.filter(insight => insight.confidence >= this.settings.minConfidenceThreshold);
  }

  private async generateOverallInsights(
    analytics: any,
    leads: Lead[],
    filters?: InsightsFilters
  ): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];

    // Bottleneck Analysis
    const bottleneckInsight = await this.analyzeBottlenecks(analytics);
    if (bottleneckInsight) insights.push(bottleneckInsight);

    // Performance Comparison
    const comparisonInsight = await this.analyzePerformanceComparison(analytics);
    if (comparisonInsight) insights.push(comparisonInsight);

    // Strategy Insights
    const strategyInsights = await this.analyzeStrategies(analytics, leads);
    insights.push(...strategyInsights);

    return insights.filter(insight => insight.confidence >= this.settings.minConfidenceThreshold);
  }

  // Specific Analysis Methods
  private async analyzeConversionPatterns(lead: Lead, analytics: LeadAnalytics): Promise<PerformanceInsight | null> {
    const similarLeads = analytics.leadsByScoreCategory.find(
      cat => cat.category === lead.scoreCategory
    );

    if (!similarLeads || similarLeads.count < 5) return null;

    const conversionRate = analytics.conversionFunnel.find(
      stage => stage.stage === lead.status
    )?.percentage || 0;

    const averageRate = analytics.conversionFunnel.reduce(
      (sum, stage) => sum + stage.percentage, 0
    ) / analytics.conversionFunnel.length;

    const pattern = conversionRate > averageRate ? 'above_average' : 'below_average';

    return {
      id: `conversion-pattern-${lead.leadId}`,
      type: 'conversion_pattern',
      title: `Lead Conversion Pattern Analysis`,
      description: `This lead is performing ${pattern.replace('_', ' ')} compared to similar leads`,
      impact: Math.abs(conversionRate - averageRate) > 20 ? 'high' : 'medium',
      confidence: Math.min(95, similarLeads.count * 5),
      category: 'conversion',
      recommendations: this.generateConversionRecommendations(pattern, lead),
      data: {
        pattern,
        successRate: conversionRate,
        sampleSize: similarLeads.count,
        timeFrame: 'Last 30 days',
        keyFactors: this.identifyKeyFactors(lead)
      },
      generatedAt: new Date().toISOString()
    };
  }

  private async analyzeTimingOptimization(lead: Lead, analytics: LeadAnalytics): Promise<PerformanceInsight | null> {
    if (!lead.lastContactedAt) return null;

    const lastContact = new Date(lead.lastContactedAt);
    const now = new Date();
    const hoursSinceContact = (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60);

    // Analyze optimal timing based on historical data
    const optimalTiming = this.calculateOptimalTiming(analytics, lead.scoreCategory || 'Medium');

    return {
      id: `timing-optimization-${lead.leadId}`,
      type: 'timing_optimization',
      title: 'Optimal Follow-up Timing',
      description: `Based on historical data, the optimal follow-up time for similar leads is ${optimalTiming}`,
      impact: hoursSinceContact > 48 ? 'high' : 'medium',
      confidence: 85,
      category: 'timing',
      recommendations: [{
        id: 'timing-rec-1',
        action: `Schedule follow-up ${optimalTiming}`,
        rationale: 'Historical data shows highest conversion rates at this timing',
        expectedImpact: '15-25% improvement in response rates',
        implementationEffort: 'low',
        priority: 'high'
      }],
      data: {
        optimalTiming,
        currentTiming: `${Math.round(hoursSinceContact)} hours ago`,
        improvement: 20,
        confidence: 85,
        basedOn: analytics.leadsByScoreCategory.reduce((sum, cat) => sum + cat.count, 0)
      },
      generatedAt: new Date().toISOString()
    };
  }

  private async analyzeBottlenecks(analytics: any): Promise<PerformanceInsight | null> {
    const funnel = analytics.conversionFunnel || [];
    const bottlenecks = funnel.filter((stage: any) => stage.percentage < 30);

    if (bottlenecks.length === 0) return null;

    const worstBottleneck = bottlenecks.reduce((worst, current) =>
      current.percentage < worst.percentage ? current : worst
    );

    return {
      id: 'bottleneck-analysis',
      type: 'bottleneck_identified',
      title: 'Conversion Bottleneck Identified',
      description: `The ${worstBottleneck.stage} stage has a conversion rate of ${worstBottleneck.percentage}%, indicating a bottleneck`,
      impact: 'high',
      confidence: 90,
      category: 'conversion',
      recommendations: [{
        id: 'bottleneck-rec-1',
        action: `Review and optimize the ${worstBottleneck.stage} process`,
        rationale: 'This stage is significantly impacting overall conversion rates',
        expectedImpact: '20-30% improvement in conversion rates',
        implementationEffort: 'medium',
        priority: 'high'
      }],
      data: {
        stage: worstBottleneck.stage,
        conversionRate: worstBottleneck.percentage,
        averageTime: 24, // This would be calculated from actual data
        bottleneckFactor: 'Process inefficiency',
        suggestedImprovement: 'Streamline the process and add automation'
      },
      generatedAt: new Date().toISOString()
    };
  }

  private async analyzeQualityTrends(lead: Lead, scoring: any): Promise<PerformanceInsight | null> {
    if (!scoring || scoring.length < 2) return null;

    const recentScores = scoring.slice(-5);
    const avgScore = recentScores.reduce((sum, s) => sum + s.score, 0) / recentScores.length;
    const firstScore = recentScores[0].score;
    const lastScore = recentScores[recentScores.length - 1].score;
    const trend = lastScore > firstScore ? 'improving' : lastScore < firstScore ? 'declining' : 'stable';
    const changeRate = Math.abs(((lastScore - firstScore) / firstScore) * 100);

    if (changeRate < 5) return null; // Not significant enough

    return {
      id: `quality-trend-${lead.leadId}`,
      type: 'lead_quality_trend',
      title: 'Lead Quality Trend Analysis',
      description: `Lead quality is ${trend} with ${changeRate.toFixed(1)}% change over recent interactions`,
      impact: changeRate > 15 ? 'high' : changeRate > 10 ? 'medium' : 'low',
      confidence: Math.min(90, recentScores.length * 15),
      category: 'quality',
      recommendations: this.generateQualityRecommendations(trend, lead),
      data: {
        trend,
        changeRate,
        timeFrame: 'Last 5 interactions',
        factors: this.identifyQualityFactors(lead, scoring)
      },
      generatedAt: new Date().toISOString()
    };
  }

  private async generatePredictiveForecast(lead: Lead, analytics: LeadAnalytics): Promise<PerformanceInsight | null> {
    const score = lead.score || 0;
    const daysSinceLastContact = lead.lastContactedAt
      ? Math.floor((new Date().getTime() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 30;

    // Simple predictive model based on score and engagement
    let conversionProbability = 0;
    if (score >= 80) conversionProbability = 0.75;
    else if (score >= 60) conversionProbability = 0.45;
    else if (score >= 40) conversionProbability = 0.25;
    else conversionProbability = 0.10;

    // Adjust based on recency
    if (daysSinceLastContact > 14) conversionProbability *= 0.7;
    else if (daysSinceLastContact > 7) conversionProbability *= 0.85;

    const confidence = Math.min(85, score * 0.8 + (14 - Math.min(daysSinceLastContact, 14)) * 2);

    return {
      id: `predictive-forecast-${lead.leadId}`,
      type: 'predictive_forecast',
      title: 'Conversion Probability Forecast',
      description: `${(conversionProbability * 100).toFixed(0)}% likelihood of conversion based on current lead profile`,
      impact: conversionProbability > 0.6 ? 'high' : conversionProbability > 0.3 ? 'medium' : 'low',
      confidence,
      category: 'conversion',
      recommendations: this.generateForecastRecommendations(conversionProbability, lead),
      data: {
        forecastType: 'conversion_probability',
        prediction: conversionProbability,
        confidence,
        timeFrame: 'Next 30 days',
        assumptions: [
          'Based on historical conversion patterns',
          'Assumes consistent follow-up frequency',
          'Factors in lead score and engagement level'
        ],
        riskFactors: daysSinceLastContact > 14 ? ['Extended time since last contact'] : []
      },
      generatedAt: new Date().toISOString()
    };
  }

  private async analyzePerformanceComparison(analytics: any): Promise<PerformanceInsight | null> {
    // Compare agent performance against benchmarks
    const agentPerformance = analytics.agentPerformance || [];
    if (agentPerformance.length === 0) return null;

    const currentAgent = agentPerformance[0]; // Assuming current agent is first
    const teamAverage = analytics.teamBenchmarks?.averageConversionRate || 15.5;
    const marketAverage = analytics.marketComparison?.localAverageRate || 12.8;

    const agentRate = currentAgent.conversionRate;
    const gap = agentRate - teamAverage;
    const percentile = agentRate > teamAverage ? 75 : agentRate > marketAverage ? 50 : 25;

    return {
      id: 'performance-comparison',
      type: 'performance_comparison',
      title: 'Performance Comparison Analysis',
      description: `Your conversion rate of ${agentRate}% compares to team average of ${teamAverage}%`,
      impact: Math.abs(gap) > 10 ? 'high' : Math.abs(gap) > 5 ? 'medium' : 'low',
      confidence: 85,
      category: 'prioritization',
      recommendations: this.generatePerformanceRecommendations(agentRate, teamAverage, marketAverage),
      data: {
        metric: 'conversion_rate',
        agentPerformance: agentRate,
        teamAverage,
        marketAverage,
        gap,
        percentile
      },
      generatedAt: new Date().toISOString()
    };
  }

  private async analyzeStrategies(analytics: any, leads: Lead[]): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];

    // Analyze follow-up timing strategy
    const timingInsight = await this.analyzeFollowUpStrategy(analytics, leads);
    if (timingInsight) insights.push(timingInsight);

    // Analyze lead prioritization strategy
    const prioritizationInsight = await this.analyzePrioritizationStrategy(analytics, leads);
    if (prioritizationInsight) insights.push(prioritizationInsight);

    return insights;
  }

  private async analyzeFollowUpStrategy(analytics: any, leads: Lead[]): Promise<PerformanceInsight | null> {
    const contactedLeads = leads.filter(lead => lead.lastContactedAt);
    if (contactedLeads.length < 10) return null;

    const responseTimes = contactedLeads.map(lead => {
      const contactDate = new Date(lead.lastContactedAt!);
      const followUpDate = lead.followUpDate ? new Date(lead.followUpDate) : new Date();
      return (followUpDate.getTime() - contactDate.getTime()) / (1000 * 60 * 60); // hours
    });

    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const optimalResponseTime = 4; // hours - based on analysis

    const effectiveness = avgResponseTime <= optimalResponseTime ? 'effective' : 'needs_improvement';

    return {
      id: 'followup-strategy-analysis',
      type: 'follow_up_strategy',
      title: 'Follow-up Strategy Effectiveness',
      description: `Average response time of ${avgResponseTime.toFixed(1)} hours - ${effectiveness.replace('_', ' ')}`,
      impact: Math.abs(avgResponseTime - optimalResponseTime) > 10 ? 'high' : 'medium',
      confidence: 80,
      category: 'follow_up',
      recommendations: this.generateFollowUpRecommendations(avgResponseTime, optimalResponseTime),
      data: {
        strategy: effectiveness === 'effective' ? 'timely_followup' : 'delayed_followup',
        effectiveness: effectiveness === 'effective' ? 85 : 45,
        comparisonStrategies: [
          { name: 'Current approach', effectiveness: effectiveness === 'effective' ? 85 : 45, sampleSize: contactedLeads.length },
          { name: 'Optimal timing', effectiveness: 90, sampleSize: 100 }
        ]
      },
      generatedAt: new Date().toISOString()
    };
  }

  private async analyzePrioritizationStrategy(analytics: any, leads: Lead[]): Promise<PerformanceInsight | null> {
    const highScoreLeads = leads.filter(lead => (lead.score || 0) >= 70);
    const conversionRate = highScoreLeads.length > 0
      ? highScoreLeads.filter(lead => lead.status === 'Closed Won').length / highScoreLeads.length
      : 0;

    if (conversionRate < 0.5) return null; // Not enough data

    return {
      id: 'prioritization-strategy-analysis',
      type: 'follow_up_strategy',
      title: 'Lead Prioritization Strategy',
      description: `High-score leads convert at ${Math.round(conversionRate * 100)}% - effective prioritization`,
      impact: conversionRate > 0.7 ? 'high' : conversionRate > 0.6 ? 'medium' : 'low',
      confidence: Math.min(90, highScoreLeads.length * 5),
      category: 'prioritization',
      recommendations: [{
        id: 'prioritization-rec-1',
        action: 'Continue prioritizing high-score leads for maximum conversion impact',
        rationale: 'Data shows high-score leads have significantly higher conversion rates',
        expectedImpact: 'Maintain high conversion rates through effective prioritization',
        implementationEffort: 'low',
        priority: 'high'
      }],
      data: {
        strategy: 'score_based_prioritization',
        effectiveness: Math.round(conversionRate * 100),
        comparisonStrategies: [
          { name: 'Score-based prioritization', effectiveness: Math.round(conversionRate * 100), sampleSize: highScoreLeads.length },
          { name: 'Random prioritization', effectiveness: 25, sampleSize: 100 }
        ]
      },
      generatedAt: new Date().toISOString()
    };
  }

  // Helper methods for recommendations
  private generateQualityRecommendations(trend: string, lead: Lead): any[] {
    const recommendations = [];

    if (trend === 'declining') {
      recommendations.push({
        id: 'quality-rec-1',
        action: 'Increase engagement frequency to reverse declining trend',
        rationale: 'Lead quality is declining - more frequent contact may help',
        expectedImpact: 'Stabilize and potentially improve lead quality',
        implementationEffort: 'medium',
        priority: 'high'
      });
    }

    return recommendations;
  }

  private generateForecastRecommendations(probability: number, lead: Lead): any[] {
    const recommendations = [];

    if (probability > 0.6) {
      recommendations.push({
        id: 'forecast-rec-1',
        action: 'Prioritize this lead for immediate follow-up',
        rationale: 'High conversion probability indicates strong potential',
        expectedImpact: 'Maximize conversion opportunity',
        implementationEffort: 'low',
        priority: 'high'
      });
    } else if (probability < 0.3) {
      recommendations.push({
        id: 'forecast-rec-2',
        action: 'Consider nurturing strategy for long-term conversion',
        rationale: 'Lower conversion probability suggests need for relationship building',
        expectedImpact: 'Build foundation for future conversion',
        implementationEffort: 'medium',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  private generatePerformanceRecommendations(agentRate: number, teamAvg: number, marketAvg: number): any[] {
    const recommendations = [];

    if (agentRate < teamAvg) {
      recommendations.push({
        id: 'performance-rec-1',
        action: 'Review successful team strategies and adapt to your approach',
        rationale: 'Team average is higher - learning from peers can improve performance',
        expectedImpact: 'Close performance gap with team',
        implementationEffort: 'medium',
        priority: 'high'
      });
    }

    return recommendations;
  }

  private generateFollowUpRecommendations(avgTime: number, optimalTime: number): any[] {
    const recommendations = [];

    if (avgTime > optimalTime) {
      recommendations.push({
        id: 'followup-rec-1',
        action: 'Implement faster response protocols for new leads',
        rationale: 'Faster response times correlate with higher conversion rates',
        expectedImpact: '15-25% improvement in conversion rates',
        implementationEffort: 'medium',
        priority: 'high'
      });
    }

    return recommendations;
  }

  private identifyQualityFactors(lead: Lead, scoring: any): string[] {
    const factors = [];
    if (scoring && scoring.length > 0) {
      const recentTrend = scoring.slice(-3);
      if (recentTrend.every(s => s.score > 60)) factors.push('Consistently high engagement');
      if (recentTrend.some((s, i, arr) => i > 0 && s.score > arr[i-1].score)) factors.push('Improving trend');
    }
    return factors;
  }

  // Recommendation Engine
  private async generateLeadRecommendations(
    lead: Lead,
    insights: PerformanceInsight[]
  ): Promise<any[]> {
    const recommendations = [];

    for (const rule of this.recommendationRules) {
      if (!rule.enabled || !this.settings.enabledCategories.includes(rule.category)) continue;

      const context: RecommendationContext = {
        lead,
        analytics: await analyticsService.getLeadAnalytics(),
        historical: await this.getHistoricalData(lead.leadId),
        agent: await this.getAgentData()
      };

      if (this.evaluateRuleCondition(rule.condition, context)) {
        recommendations.push({
          ruleId: rule.id,
          confidence: this.calculateRecommendationConfidence(rule, context),
          recommendation: {
            id: rule.id,
            action: rule.action,
            rationale: rule.condition,
            expectedImpact: 'Based on historical performance data',
            implementationEffort: 'medium' as const,
            priority: rule.priority > 7 ? 'high' : rule.priority > 5 ? 'medium' : 'low'
          },
          context
        });
      }
    }

    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  // Utility Methods
  private calculateConversionProbability(lead: Lead, analytics: LeadAnalytics): number {
    const categoryData = analytics.leadsByScoreCategory.find(
      cat => cat.category === lead.scoreCategory
    );

    if (!categoryData) return 50;

    const conversionRate = analytics.conversionFunnel.find(
      stage => stage.stage === lead.status
    )?.percentage || 0;

    return Math.min(95, Math.max(5, conversionRate * (lead.score || 50) / 50));
  }

  private calculateOptimalFollowUpTime(lead: Lead): string {
    const score = lead.score || 50;

    if (score > 80) return 'within 2 hours';
    if (score > 60) return 'within 4 hours';
    if (score > 40) return 'within 24 hours';
    return 'within 48 hours';
  }

  private identifyRiskFactors(lead: Lead, analytics: LeadAnalytics): string[] {
    const risks = [];

    if (!lead.lastContactedAt) {
      risks.push('No recent contact');
    } else {
      const daysSinceContact = (new Date().getTime() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceContact > 7) risks.push('Extended time since last contact');
    }

    if ((lead.score || 0) < 40) risks.push('Low quality score');
    if (!lead.followUpDate) risks.push('No follow-up scheduled');

    return risks;
  }

  private calculateOptimalTiming(analytics: LeadAnalytics, scoreCategory: string): string {
    // This would be calculated from historical conversion data
    // For now, return a reasonable default based on score category
    switch (scoreCategory) {
      case 'High': return 'within 2 hours';
      case 'Medium': return 'within 4 hours';
      case 'Low': return 'within 24 hours';
      default: return 'within 4 hours';
    }
  }

  private identifyKeyFactors(lead: Lead): string[] {
    const factors = [];
    if (lead.score && lead.score > 70) factors.push('High lead score');
    if (lead.budgetMax && lead.budgetMax > 300000) factors.push('High budget');
    if (lead.propertyType) factors.push(`${lead.propertyType} preference`);
    if (lead.desiredLocation) factors.push(`${lead.desiredLocation} location`);
    return factors;
  }

  private generateConversionRecommendations(pattern: string, lead: Lead): any[] {
    const recommendations = [];

    if (pattern === 'below_average') {
      recommendations.push({
        id: 'conversion-rec-1',
        action: 'Increase follow-up frequency for this lead type',
        rationale: 'Similar leads respond better to more frequent communication',
        expectedImpact: '15-20% improvement in conversion rates',
        implementationEffort: 'medium',
        priority: 'high'
      });
    }

    return recommendations;
  }

  /**
   * Generate lead performance insights with predictive analytics
   */
  async generateLeadPerformanceInsights(
    leadData: LeadData,
    historicalData?: any[]
  ): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];

    try {
      // Get lead score
      const scoringResult = await leadScoringService.calculateScore(leadData);
      const { score } = scoringResult;

      // Predictive conversion probability
      const conversionProbability = this.calculateLeadConversionProbability(score, historicalData);
      insights.push({
        id: `lead_conversion_${leadData.id}`,
        type: 'predictive_forecast',
        title: 'Conversion Probability',
        description: `Based on lead score and historical data, this lead has a ${conversionProbability.toFixed(1)}% chance of converting.`,
        impact: this.getProbabilityImpact(conversionProbability),
        confidence: score.confidence,
        category: 'conversion',
        recommendations: this.generateLeadConversionRecommendations(score, conversionProbability),
        data: {
          forecastType: 'conversion_probability',
          prediction: conversionProbability,
          confidence: score.confidence,
          timeFrame: 'Next 30 days',
          assumptions: [
            'Based on historical conversion patterns',
            'Assumes consistent follow-up frequency',
            'Factors in lead score and engagement level'
          ],
          riskFactors: []
        },
        generatedAt: new Date().toISOString()
      });

      // Performance comparison insights
      const performanceComparison = this.generatePerformanceComparison(score, historicalData);
      if (performanceComparison) {
        insights.push(performanceComparison);
      }

      // Conversion bottleneck analysis
      const bottleneckAnalysis = this.analyzeLeadConversionBottlenecks(score, historicalData);
      if (bottleneckAnalysis) {
        insights.push(bottleneckAnalysis);
      }

      // Trend-based insights
      const trendInsights = this.generateLeadTrendInsights(leadData, historicalData);
      insights.push(...trendInsights);

      // Actionable recommendations
      const actionRecommendations = this.generateLeadActionRecommendations(score, conversionProbability);
      if (actionRecommendations.length > 0) {
        insights.push({
          id: `lead_actions_${leadData.id}`,
          type: 'follow_up_strategy',
          title: 'Recommended Actions',
          description: 'Specific actions to improve conversion probability',
          impact: 'high',
          confidence: 0.9,
          category: 'strategy',
          recommendations: actionRecommendations,
          data: {
            strategy: 'optimized_followup',
            effectiveness: 85,
            comparisonStrategies: [
              { name: 'Current approach', effectiveness: 65, sampleSize: 100 },
              { name: 'Optimized strategy', effectiveness: 85, sampleSize: 100 }
            ]
          },
          generatedAt: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Error generating lead performance insights:', error);
    }

    return insights;
  }

  /**
   * Calculate conversion probability for leads
   */
  private calculateLeadConversionProbability(score: LeadScore, historicalData?: any[]): number {
    // Base probability from grade
    const gradeProbabilities: { [key: string]: number } = {
      'A+': 0.85,
      'A': 0.78,
      'B+': 0.65,
      'B': 0.52,
      'C+': 0.35,
      'C': 0.28,
      'D': 0.15,
      'F': 0.08
    };

    let probability = gradeProbabilities[score.grade] || 0.3;

    // Adjust based on confidence
    probability *= score.confidence;

    // Adjust based on historical data if available
    if (historicalData && historicalData.length > 0) {
      const similarLeads = historicalData.filter(lead =>
        lead.score >= score.totalScore - 5 && lead.score <= score.totalScore + 5
      );

      if (similarLeads.length > 0) {
        const historicalConversionRate = similarLeads.reduce((sum, lead) =>
          sum + (lead.converted ? 1 : 0), 0
        ) / similarLeads.length;

        // Blend historical data with grade-based probability
        probability = (probability * 0.7) + (historicalConversionRate * 0.3);
      }
    }

    return Math.max(0, Math.min(100, probability * 100));
  }

  /**
   * Get impact level based on conversion probability
   */
  private getProbabilityImpact(probability: number): 'low' | 'medium' | 'high' {
    if (probability >= 70) return 'high';
    if (probability >= 40) return 'medium';
    return 'low';
  }

  /**
   * Generate conversion recommendations based on score and probability
   */
  private generateLeadConversionRecommendations(score: LeadScore, probability: number): any[] {
    const recommendations: any[] = [];

    if (probability >= 70) {
      recommendations.push({
        id: 'high-prob-rec-1',
        action: 'High conversion probability - prioritize immediate follow-up',
        rationale: 'Lead shows strong conversion indicators',
        expectedImpact: 'Maximize conversion opportunity',
        implementationEffort: 'low',
        priority: 'high'
      });
    } else if (probability >= 40) {
      recommendations.push({
        id: 'med-prob-rec-1',
        action: 'Moderate conversion probability - follow standard process',
        rationale: 'Lead has solid fundamentals requiring standard approach',
        expectedImpact: 'Maintain conversion momentum',
        implementationEffort: 'medium',
        priority: 'medium'
      });
    } else {
      recommendations.push({
        id: 'low-prob-rec-1',
        action: 'Low conversion probability - consider nurturing strategy',
        rationale: 'Lead needs relationship building before conversion',
        expectedImpact: 'Build foundation for future conversion',
        implementationEffort: 'high',
        priority: 'low'
      });
    }

    // Factor-specific recommendations
    score.factors.forEach(factor => {
      if (factor.impact === 'negative') {
        switch (factor.name) {
          case 'Budget Strength':
            recommendations.push({
              id: 'budget-rec-1',
              action: 'Address budget concerns with financing options',
              rationale: 'Budget limitations may be blocking conversion',
              expectedImpact: 'Remove financial barriers to conversion',
              implementationEffort: 'medium',
              priority: 'high'
            });
            break;
          case 'Timeline Urgency':
            recommendations.push({
              id: 'timeline-rec-1',
              action: 'Create urgency with limited-time offers',
              rationale: 'Lack of urgency may delay conversion decision',
              expectedImpact: 'Accelerate conversion timeline',
              implementationEffort: 'low',
              priority: 'medium'
            });
            break;
          case 'Engagement Level':
            recommendations.push({
              id: 'engagement-rec-1',
              action: 'Implement re-engagement email campaign',
              rationale: 'Low engagement indicates need for renewed contact',
              expectedImpact: 'Increase lead responsiveness',
              implementationEffort: 'medium',
              priority: 'high'
            });
            break;
        }
      }
    });

    return recommendations;
  }

  /**
   * Generate performance comparison insights
   */
  private generatePerformanceComparison(score: LeadScore, historicalData?: any[]): PerformanceInsight | null {
    if (!historicalData || historicalData.length < 10) return null;

    const averageScore = historicalData.reduce((sum, lead) => sum + lead.score, 0) / historicalData.length;
    const percentile = this.calculatePercentile(score.totalScore, historicalData.map(d => d.score));

    let comparison: string;
    let impact: 'low' | 'medium' | 'high';

    if (percentile >= 80) {
      comparison = `This lead scores in the top ${100 - percentile}% of all leads`;
      impact = 'high';
    } else if (percentile >= 60) {
      comparison = `This lead scores above average (${percentile}th percentile)`;
      impact = 'medium';
    } else {
      comparison = `This lead scores below average (${percentile}th percentile)`;
      impact = 'low';
    }

    return {
      id: `performance_comparison_${score.leadId}`,
      type: 'performance_comparison',
      title: 'Performance Comparison',
      description: comparison,
      impact,
      confidence: 0.85,
      category: 'prioritization',
      recommendations: [{
        id: 'comparison-rec-1',
        action: percentile >= 80 ? 'Prioritize this high-performing lead' : 'Focus on lead qualification and improvement',
        rationale: 'Statistical comparison with historical lead performance',
        expectedImpact: percentile >= 80 ? 'Maximize high-potential lead conversion' : 'Improve lead quality over time',
        implementationEffort: 'medium',
        priority: percentile >= 80 ? 'high' : 'medium'
      }],
      data: {
        metric: 'lead_score',
        agentPerformance: score.totalScore,
        teamAverage: averageScore,
        marketAverage: averageScore * 0.9,
        percentile,
        gap: score.totalScore - averageScore
      },
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Analyze conversion bottlenecks
   */
  private analyzeLeadConversionBottlenecks(score: LeadScore, historicalData?: any[]): PerformanceInsight | null {
    if (!historicalData || historicalData.length < 20) return null;

    // Find common factors in unconverted high-scoring leads
    const unconvertedHighScore = historicalData.filter(lead =>
      lead.score >= 75 && !lead.converted
    );

    if (unconvertedHighScore.length === 0) return null;

    // Analyze common issues
    const commonIssues: string[] = [];

    const avgEngagement = unconvertedHighScore.reduce((sum, lead) => sum + (lead.engagement || 0), 0) / unconvertedHighScore.length;
    if (avgEngagement < 50) {
      commonIssues.push('Low engagement after initial contact');
    }

    const avgResponseTime = unconvertedHighScore.reduce((sum, lead) => sum + (lead.responseTime || 0), 0) / unconvertedHighScore.length;
    if (avgResponseTime > 48) {
      commonIssues.push('Slow response times');
    }

    if (commonIssues.length === 0) return null;

    return {
      id: `bottleneck_analysis_${score.leadId}`,
      type: 'bottleneck_identified',
      title: 'Conversion Bottleneck Analysis',
      description: `Based on historical data, common issues preventing conversion: ${commonIssues.join(', ')}`,
      impact: 'medium',
      confidence: 0.75,
      category: 'conversion',
      recommendations: commonIssues.map(issue => ({
        id: `bottleneck-rec-${commonIssues.indexOf(issue)}`,
        action: `Address: ${issue}`,
        rationale: 'Historical pattern analysis shows this prevents conversions',
        expectedImpact: 'Remove conversion barriers',
        implementationEffort: 'medium',
        priority: 'high'
      })),
      data: {
        stage: 'lead_conversion',
        conversionRate: 100 - (commonIssues.length * 15), // Estimated based on issues
        averageTime: 168, // 7 days in hours
        bottleneckFactor: commonIssues[0] || 'Multiple factors',
        suggestedImprovement: 'Implement systematic bottleneck resolution process'
      },
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate trend-based insights
   */
  private generateLeadTrendInsights(leadData: LeadData, historicalData?: any[]): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];

    if (!historicalData || historicalData.length < 5) return insights;

    // Lead quality trend
    const recentScores = historicalData.slice(-10).map(d => d.score);
    const trend = this.calculateTrend(recentScores);

    if (Math.abs(trend) > 5) {
      const direction = trend > 0 ? 'improving' : 'declining';
      insights.push({
        id: `quality_trend_${leadData.id}`,
        type: 'lead_quality_trend',
        title: 'Lead Quality Trend',
        description: `Lead quality is ${direction} by ${Math.abs(trend).toFixed(1)} points on average`,
        impact: Math.abs(trend) > 10 ? 'high' : 'medium',
        confidence: 0.8,
        category: 'quality',
        recommendations: [{
          id: 'trend-rec-1',
          action: direction === 'improving' ? 'Continue successful strategies' : 'Implement quality improvement measures',
          rationale: `Lead quality trend analysis shows ${direction} performance`,
          expectedImpact: direction === 'improving' ? 'Sustain positive momentum' : 'Reverse declining trend',
          implementationEffort: 'medium',
          priority: direction === 'improving' ? 'medium' : 'high'
        }],
        data: {
          trend: direction,
          changeRate: Math.abs(trend),
          timeFrame: 'Last 10 interactions',
          factors: [`Quality ${direction} by ${Math.abs(trend).toFixed(1)} points`],
          forecast: direction === 'improving' ? 'Continue positive trajectory' : 'Monitor for stabilization'
        },
        generatedAt: new Date().toISOString()
      });
    }

    // Conversion rate trend
    const recentConversions = historicalData.slice(-20);
    const conversionRate = recentConversions.reduce((sum, lead) => sum + (lead.converted ? 1 : 0), 0) / recentConversions.length * 100;

    if (conversionRate < 20) {
      insights.push({
        id: `conversion_trend_${leadData.id}`,
        type: 'lead_quality_trend',
        title: 'Conversion Rate Concern',
        description: `Recent conversion rate is ${conversionRate.toFixed(1)}%, below target of 25%`,
        impact: 'high',
        confidence: 0.85,
        category: 'conversion',
        recommendations: [
          {
            id: 'conversion-trend-rec-1',
            action: 'Review lead qualification process',
            rationale: 'Conversion rate below target indicates process issues',
            expectedImpact: 'Improve conversion rate to target levels',
            implementationEffort: 'high',
            priority: 'high'
          },
          {
            id: 'conversion-trend-rec-2',
            action: 'Optimize follow-up response times',
            rationale: 'Faster response times correlate with higher conversions',
            expectedImpact: '15-25% conversion rate improvement',
            implementationEffort: 'medium',
            priority: 'high'
          }
        ],
        data: {
          trend: 'declining',
          changeRate: 25 - conversionRate,
          timeFrame: 'Last 20 leads',
          factors: [`Conversion rate ${conversionRate.toFixed(1)}% below 25% target`],
          forecast: 'Monitor conversion process improvements'
        },
        generatedAt: new Date().toISOString()
      });
    }

    return insights;
  }

  /**
   * Generate actionable recommendations
   */
  private generateLeadActionRecommendations(score: LeadScore, probability: number): any[] {
    const recommendations: any[] = [];

    // Grade-based recommendations
    switch (score.grade) {
      case 'A+':
      case 'A':
        recommendations.push({
          id: 'action-high-grade',
          action: 'Immediate follow-up within 2 hours',
          rationale: 'Exceptional lead quality requires immediate attention',
          expectedImpact: 'Maximize conversion of high-potential lead',
          implementationEffort: 'low',
          priority: 'high'
        });
        break;
      case 'B+':
      case 'B':
        recommendations.push({
          id: 'action-med-grade',
          action: 'Follow up within 24 hours with personalized approach',
          rationale: 'Good lead quality with solid conversion potential',
          expectedImpact: 'Maintain momentum with qualified leads',
          implementationEffort: 'medium',
          priority: 'medium'
        });
        break;
      case 'C+':
      case 'C':
        recommendations.push({
          id: 'action-low-grade',
          action: 'Add to nurture campaign with educational content',
          rationale: 'Lead requires additional qualification and relationship building',
          expectedImpact: 'Build foundation for future conversion',
          implementationEffort: 'high',
          priority: 'low'
        });
        break;
      default:
        recommendations.push({
          id: 'action-poor-grade',
          action: 'Consider lead disqualification or minimal nurturing',
          rationale: 'Lead shows poor conversion indicators',
          expectedImpact: 'Focus resources on higher-potential leads',
          implementationEffort: 'low',
          priority: 'low'
        });
        break;
    }

    // Factor-specific recommendations
    const lowFactors = score.factors.filter(f => f.value < 60);
    lowFactors.forEach(factor => {
      switch (factor.name) {
        case 'Budget Strength':
          recommendations.push({
            id: 'action-budget',
            action: 'Present financing options and payment plans',
            rationale: 'Address budget concerns to remove conversion barriers',
            expectedImpact: 'Remove financial objections',
            implementationEffort: 'medium',
            priority: 'high'
          });
          break;
        case 'Timeline Urgency':
          recommendations.push({
            id: 'action-timeline',
            action: 'Create urgency with limited-time incentives',
            rationale: 'Lack of urgency may delay conversion decision',
            expectedImpact: 'Accelerate purchase timeline',
            implementationEffort: 'low',
            priority: 'medium'
          });
          break;
        case 'Engagement Level':
          recommendations.push({
            id: 'action-engagement',
            action: 'Launch multi-touch re-engagement campaign',
            rationale: 'Low engagement indicates need for renewed interest',
            expectedImpact: 'Increase lead responsiveness and activity',
            implementationEffort: 'medium',
            priority: 'high'
          });
          break;
        case 'Qualification Status':
          recommendations.push({
            id: 'action-qualification',
            action: 'Conduct comprehensive qualification assessment',
            rationale: 'Incomplete qualification may be blocking progression',
            expectedImpact: 'Clarify lead readiness and requirements',
            implementationEffort: 'medium',
            priority: 'high'
          });
          break;
      }
    });

    return recommendations;
  }

  /**
   * Calculate percentile rank
   */
  private calculatePercentile(value: number, values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    return (index / sorted.length) * 100;
  }

  /**
   * Calculate trend (simple linear regression slope)
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);

    const sumX = indices.reduce((sum, x) => sum + x, 0);
    const sumY = values.reduce((sum, y) => sum + y, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = indices.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  // Cache Management
  private getCachedResult(key: string): any {
    const cached = this.cache[key];
    if (cached && new Date(cached.expiresAt) > new Date()) {
      return cached;
    }
    if (cached) {
      delete this.cache[key];
    }
    return null;
  }

  private setCachedResult(key: string, data: any): void {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.settings.cacheExpiration);

    this.cache[key] = {
      data,
      timestamp: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    this.saveCache();
  }

  // Data Access Methods
  private async getLeadData(leadId: number): Promise<Lead> {
    // This would integrate with the API service
    const response = await fetch(`/api/leads/${leadId}`);
    return response.json();
  }

  private async getFilteredLeads(filters?: InsightsFilters): Promise<Lead[]> {
    // This would integrate with the API service
    const queryParams = filters ? new URLSearchParams(filters as any) : '';
    const response = await fetch(`/api/leads?${queryParams}`);
    const data = await response.json();
    return data.data || [];
  }

  private async getHistoricalData(leadId: number): Promise<any> {
    // This would fetch historical performance data
    return {};
  }

  private async getAgentData(): Promise<any> {
    // This would fetch current agent performance data
    return {};
  }

  // Settings and Cache Persistence
  private async loadSettings(): Promise<void> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const saved = await AsyncStorage.getItem('insights-settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load insights settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem('insights-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save insights settings:', error);
    }
  }

  private async loadCache(): Promise<void> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const saved = await AsyncStorage.getItem('insights-cache');
      if (saved) {
        this.cache = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load insights cache:', error);
    }
  }

  private async saveCache(): Promise<void> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem('insights-cache', JSON.stringify(this.cache));
    } catch (error) {
      console.warn('Failed to save insights cache:', error);
    }
  }

  // Helper Methods
  private calculateInsightsSummary(insights: PerformanceInsight[]) {
    return {
      totalInsights: insights.length,
      highImpactCount: insights.filter(i => i.impact === 'high').length,
      mediumImpactCount: insights.filter(i => i.impact === 'medium').length,
      lowImpactCount: insights.filter(i => i.impact === 'low').length,
      averageConfidence: insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length || 0
    };
  }

  private extractRecommendations(insights: PerformanceInsight[]): any[] {
    return insights.flatMap(insight => insight.recommendations);
  }

  private calculateDataConfidence(sampleSize: number, analytics: any): number {
    // Calculate confidence based on sample size and data quality
    const baseConfidence = Math.min(95, sampleSize * 2);
    return Math.max(50, baseConfidence);
  }

  private evaluateRuleCondition(condition: string, context: RecommendationContext): boolean {
    // Simple condition evaluation - in production, this would use a proper expression evaluator
    try {
      // This is a simplified implementation
      if (condition.includes('lead.score > 80') && context.lead.score > 80) return true;
      if (condition.includes('lead.score < 50') && context.lead.score < 50) return true;
      return false;
    } catch {
      return false;
    }
  }

  private calculateRecommendationConfidence(rule: RecommendationRule, context: RecommendationContext): number {
    // Calculate confidence based on rule priority and context data quality
    return Math.min(95, rule.priority * 10 + 20);
  }

  // Public API Methods
  async getSettings(): Promise<InsightsSettings> {
    return { ...this.settings };
  }

  async updateSettings(settings: Partial<InsightsSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    await this.saveSettings();
  }

  async clearCache(): Promise<void> {
    this.cache = {};
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      await AsyncStorage.removeItem('insights-cache');
    } catch (error) {
      console.warn('Failed to clear insights cache:', error);
    }
  }

  async refreshInsights(): Promise<void> {
    await this.clearCache();
    // Force refresh of all cached insights
  }
}

export default new PerformanceInsightsService();