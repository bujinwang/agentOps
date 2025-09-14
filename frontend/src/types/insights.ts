// Performance Insights Types for Lead Performance Analysis

export interface PerformanceInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  impact: InsightImpact;
  confidence: number; // 0-100
  category: InsightCategory;
  recommendations: InsightRecommendation[];
  data: any; // Type-specific data
  generatedAt: string;
  expiresAt?: string;
}

export type InsightType =
  | 'conversion_pattern'
  | 'bottleneck_identified'
  | 'timing_optimization'
  | 'follow_up_strategy'
  | 'lead_quality_trend'
  | 'performance_comparison'
  | 'predictive_forecast';

export type InsightImpact = 'high' | 'medium' | 'low';

export type InsightCategory =
  | 'timing'
  | 'strategy'
  | 'prioritization'
  | 'follow_up'
  | 'quality'
  | 'conversion';

export interface InsightRecommendation {
  id: string;
  action: string;
  rationale: string;
  expectedImpact: string;
  implementationEffort: 'low' | 'medium' | 'high';
  priority: 'high' | 'medium' | 'low';
}

export interface ConversionPatternInsight extends PerformanceInsight {
  type: 'conversion_pattern';
  data: {
    pattern: string;
    successRate: number;
    sampleSize: number;
    timeFrame: string;
    keyFactors: string[];
  };
}

export interface BottleneckInsight extends PerformanceInsight {
  type: 'bottleneck_identified';
  data: {
    stage: string;
    conversionRate: number;
    averageTime: number; // in hours
    bottleneckFactor: string;
    suggestedImprovement: string;
  };
}

export interface TimingOptimizationInsight extends PerformanceInsight {
  type: 'timing_optimization';
  data: {
    optimalTiming: string;
    currentTiming: string;
    improvement: number; // percentage
    confidence: number;
    basedOn: number; // sample size
  };
}

export interface FollowUpStrategyInsight extends PerformanceInsight {
  type: 'follow_up_strategy';
  data: {
    strategy: string;
    effectiveness: number;
    comparisonStrategies: Array<{
      name: string;
      effectiveness: number;
      sampleSize: number;
    }>;
  };
}

export interface LeadQualityTrendInsight extends PerformanceInsight {
  type: 'lead_quality_trend';
  data: {
    trend: 'improving' | 'declining' | 'stable';
    changeRate: number; // percentage change
    timeFrame: string;
    factors: string[];
    forecast: string;
  };
}

export interface PerformanceComparisonInsight extends PerformanceInsight {
  type: 'performance_comparison';
  data: {
    metric: string;
    agentPerformance: number;
    teamAverage: number;
    marketAverage: number;
    percentile: number;
    gap: number;
  };
}

export interface PredictiveForecastInsight extends PerformanceInsight {
  type: 'predictive_forecast';
  data: {
    forecastType: string;
    prediction: number;
    confidence: number;
    timeFrame: string;
    assumptions: string[];
    riskFactors: string[];
  };
}

export interface LeadPerformanceInsights {
  leadId: number;
  overallScore: number;
  conversionProbability: number;
  optimalFollowUpTime: string;
  riskFactors: string[];
  recommendations: InsightRecommendation[];
  insights: PerformanceInsight[];
  lastAnalyzed: string;
}

export interface PerformanceAnalysisResult {
  insights: PerformanceInsight[];
  summary: {
    totalInsights: number;
    highImpactCount: number;
    mediumImpactCount: number;
    lowImpactCount: number;
    averageConfidence: number;
  };
  recommendations: InsightRecommendation[];
  generatedAt: string;
  dataQuality: {
    sampleSize: number;
    timeFrame: string;
    confidence: number;
  };
}

export interface InsightsFilters {
  categories?: InsightCategory[];
  impact?: InsightImpact[];
  minConfidence?: number;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  leadId?: number;
}

export interface InsightsSettings {
  enabledCategories: InsightCategory[];
  minConfidenceThreshold: number;
  maxInsightsPerCategory: number;
  autoRefreshInterval: number; // in minutes
  cacheExpiration: number; // in hours
}

export interface InsightsCache {
  [key: string]: {
    data: PerformanceAnalysisResult;
    timestamp: string;
    expiresAt: string;
  };
}

// Recommendation Engine Types
export interface RecommendationRule {
  id: string;
  name: string;
  condition: string; // Expression to evaluate
  action: string;
  priority: number;
  category: InsightCategory;
  enabled: boolean;
}

export interface RecommendationContext {
  lead: any; // Lead data
  analytics: any; // Analytics data
  historical: any; // Historical performance data
  agent: any; // Agent performance data
}

export interface RecommendationResult {
  ruleId: string;
  confidence: number;
  recommendation: InsightRecommendation;
  context: RecommendationContext;
}

// Analytics Integration Types
export interface InsightsAnalyticsData {
  leadPerformance: {
    averageConversionTime: number;
    topPerformingSources: Array<{ source: string; conversionRate: number }>;
    optimalFollowUpWindows: Array<{ window: string; successRate: number }>;
    qualityScoreDistribution: { high: number; medium: number; low: number };
  };
  agentPerformance: {
    responseTimeDistribution: number[];
    conversionRateByExperience: Array<{ experience: string; rate: number }>;
    followUpEffectiveness: Array<{ timing: string; effectiveness: number }>;
  };
  predictiveMetrics: {
    leadQualityForecast: Array<{ date: string; quality: number }>;
    conversionRateForecast: Array<{ date: string; rate: number }>;
    optimalTimingForecast: Array<{ date: string; timing: string }>;
  };
}