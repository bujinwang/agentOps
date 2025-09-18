// Machine Learning Types and Interfaces for Lead Scoring

export interface LeadProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  leadScore: number;
  engagementLevel: 'low' | 'medium' | 'high';
  propertyType?: string;
  budgetRange?: string;
  timeline?: string;
  location?: string;
  source: string;
  createdAt: string;
  lastActivity: string;
  totalInteractions: number;
  conversionEvents: number;
  behavioralScore?: number;
}

export interface LeadInteraction {
  id: number;
  leadId: number;
  type: 'email' | 'website' | 'phone' | 'social' | 'meeting';
  action: 'sent' | 'opened' | 'clicked' | 'viewed' | 'page_view' | 'form_submit' | 'call' | 'meeting_scheduled';
  timestamp: string;
  duration?: number; // For calls/meetings
  metadata?: Record<string, any>;
}

export interface BehavioralFeatures {
  responseRate: number;
  clickRate: number;
  conversionRate: number;
  engagementVelocity: number;
  recencyScore: number;
  emailOpens: number;
  pageViews: number;
  formSubmissions: number;
  callDuration: number;
  meetingCount: number;
  channelPreferences: Record<string, number>;
  interactionPatterns: Record<string, number>;
  engagementTrends: Record<string, boolean>;
}

export interface TemporalFeatures {
  daysSinceCreation: number;
  daysSinceLastActivity: number;
  interactionCadence: Record<string, number>;
  timePatterns: Record<string, number>;
  seasonalPatterns: Record<string, number>;
  dayOfWeekPatterns: Record<string, number>;
  hourOfDayPatterns: Record<string, number>;
  lifecycleStage: string;
  engagementMaturity: number;
}

export interface DriftAnalysis {
  modelId: string;
  driftDetected: boolean;
  confidence: number;
  driftMetrics: Record<string, number>;
  analysis: string;
  timestamp: string;
  recommendations?: string[];
}

export interface ABTest {
  id: string;
  championModelId: string;
  challengerModelId: string;
  status: 'running' | 'completed' | 'stopped';
  startTime: string;
  endTime: string;
  trafficSplit: number;
  championResults: {
    requests: number;
    conversions: number;
    conversionRate: number;
    averageScore: number;
  };
  challengerResults: {
    requests: number;
    conversions: number;
    conversionRate: number;
    averageScore: number;
  };
  config: {
    enabled: boolean;
    testDuration: number;
    trafficSplit: number;
    confidenceThreshold: number;
    minSampleSize: number;
  };
}

export interface ABTestResult {
  testId: string;
  status: string;
  championModelId: string;
  challengerModelId: string;
  duration: number;
  championResults: {
    requests: number;
    conversions: number;
    conversionRate: number;
    averageScore: number;
  };
  challengerResults: {
    requests: number;
    conversions: number;
    conversionRate: number;
    averageScore: number;
  };
  winner: 'champion' | 'challenger' | null;
  confidence: number;
  improvement: number;
  recommendation: string;
}

export interface RetrainingSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  dataWindow: number;
  minDataPoints: number;
  performanceThreshold: number;
  autoDeploy: boolean;
}

export interface DataQualityReport {
  passed: boolean;
  issues: string[];
  metrics: {
    dataSize: number;
    conversionRate: number;
    positiveLabels: number;
    negativeLabels: number;
    completeness: number;
  };
  driftAnalysis: DriftAnalysis;
}

export interface LeadFeatures {
  // Demographic features
  leadScore: number;
  engagementScore: number;

  // Property matching features
  propertyMatch: number;
  budgetFit: number;
  timelineFit: number;
  locationPreference: number;

  // Behavioral features
  responseRate: number;
  contactFrequency: number;
  sessionDuration: number;
  pageViews: number;
  emailOpens: number;
  formSubmissions: number;

  // Communication features
  callDuration: number;
  meetingCount: number;

  // Temporal features
  daysSinceFirstContact: number;
  daysSinceLastActivity: number;
  totalInteractions: number;
  conversionEvents: number;

  // Source quality features
  sourceQuality: number;
  behavioralScore: number;
}

export interface MLLeadScore {
  leadId: number;
  score: number; // 0-1 probability score
  confidence: number; // 0-1 confidence level
  modelId: string;
  modelVersion: string;
  scoredAt: string;
  featuresUsed: string[];
  prediction: 'high_value' | 'low_value';
  insights: string[];
  explanation?: ScoreExplanation;
}

export interface ScoreExplanation {
  topFeatures: Array<{
    feature: string;
    importance: number;
    value: number;
    contribution: number;
  }>;
  similarLeads: Array<{
    leadId: number;
    similarity: number;
    outcome: 'converted' | 'not_converted';
  }>;
  riskFactors: string[];
  opportunities: string[];
}

export interface ModelMetrics {
  accuracy: number;
  loss: number;
  precision: number;
  recall: number;
  f1Score: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  evaluatedAt: string;
  sampleSize: number;
  auc?: number;
  confusionMatrix?: number[][];
}

export interface TrainingDataset {
  features: LeadFeatures[];
  labels: number[]; // 0 or 1 for conversion
  metadata?: {
    source: string;
    dateRange: {
      start: string;
      end: string;
    };
    sampleSize: number;
    conversionRate: number;
    featureCount: number;
  };
}

export interface TrainingExample {
  leadId: number;
  features: LeadFeatures;
  label: number; // 0 or 1
  weight?: number;
  metadata?: Record<string, any>;
}

export interface ModelConfig {
  type: 'neural_network' | 'gradient_boosting' | 'ensemble' | 'logistic_regression';
  hiddenLayers?: number[];
  learningRate?: number;
  epochs?: number;
  batchSize?: number;
  maxDepth?: number;
  nEstimators?: number;
  regularization?: {
    type: 'l1' | 'l2' | 'elastic_net';
    strength: number;
  };
  earlyStopping?: {
    enabled: boolean;
    patience: number;
    minDelta: number;
  };
}

export interface ModelVersion {
  id: string;
  modelId: string;
  version: string;
  status: 'training' | 'active' | 'deprecated' | 'archived';
  createdAt: string;
  activatedAt?: string;
  deprecatedAt?: string;
  metrics: ModelMetrics;
  config: ModelConfig;
  trainingData: {
    size: number;
    dateRange: {
      start: string;
      end: string;
    };
    conversionRate: number;
  };
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
}

export interface FeatureEngineeringConfig {
  enabled: boolean;
  normalization: 'standard' | 'minmax' | 'robust' | 'none';
  scaling: 'standard' | 'minmax' | 'robust' | 'none';
  encoding: {
    categorical: 'onehot' | 'label' | 'target' | 'frequency';
    missing: 'mean' | 'median' | 'mode' | 'constant';
  };
  selection: {
    method: 'correlation' | 'mutual_info' | 'chi2' | 'f_test' | 'wrapper';
    k?: number;
    threshold?: number;
  };
  interaction: {
    enabled: boolean;
    maxFeatures: number;
    polynomialDegree: number;
  };
}

export interface CrossValidationResults {
  folds: number;
  scores: {
    accuracy: number[];
    precision: number[];
    recall: number[];
    f1Score: number[];
    auc: number[];
  };
  meanScores: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
  };
  stdScores: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
  };
  bestFold: number;
  worstFold: number;
}

export interface DriftDetection {
  detected: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metrics: {
    featureDrift: number;
    predictionDrift: number;
    accuracyDrop: number;
  };
  affectedFeatures: string[];
  detectedAt: string;
  recommendations: string[];
}

export interface ModelHealth {
  status: 'healthy' | 'warning' | 'critical';
  checks: {
    accuracy: {
      status: 'pass' | 'fail';
      current: number;
      threshold: number;
      message: string;
    };
    drift: {
      status: 'pass' | 'fail';
      severity: 'low' | 'medium' | 'high';
      message: string;
    };
    performance: {
      status: 'pass' | 'fail';
      latency: number;
      threshold: number;
      message: string;
    };
    dataQuality: {
      status: 'pass' | 'fail';
      completeness: number;
      threshold: number;
      message: string;
    };
  };
  lastChecked: string;
  nextCheck: string;
}

export interface ScoringStatistics {
  totalRequests: number;
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  cacheHitRate: number;
  modelUsage: Record<string, number>;
  timeRange: {
    start: string;
    end: string;
  };
  peakUsage: {
    timestamp: string;
    requestsPerMinute: number;
  };
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  rank: number;
  category: 'demographic' | 'behavioral' | 'temporal' | 'interaction';
  description: string;
  correlation: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface LeadInsights {
  leadId: number;
  overallScore: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  conversionProbability: number;
  recommendedActions: string[];
  keyFactors: FeatureImportance[];
  similarProfiles: Array<{
    leadId: number;
    similarity: number;
    outcome: 'converted' | 'lost';
    commonFactors: string[];
  }>;
  timeToAction: {
    urgent: boolean;
    recommended: string;
    deadline: string;
  };
  engagement: {
    level: 'low' | 'medium' | 'high';
    trend: 'improving' | 'stable' | 'declining';
    lastActivity: string;
    nextBestAction: string;
  };
}

export interface PredictionResult {
  leadId: number;
  predictedScore: number;
  predictedClass: 'high_value' | 'low_value';
  confidence: number;
  modelVersion: string;
  features: Record<string, number>;
  timestamp: string;
}

export interface ConversionResult {
  leadId: number;
  converted: boolean;
  conversionType?: 'sale' | 'meeting' | 'inquiry' | 'engagement';
  conversionValue?: number;
  conversionDate: string;
  timeToConvert: number; // days
  touchpoints: number;
  finalScore: number;
}

export interface ABLTestResult {
  testId: string;
  variantA: {
    name: string;
    sampleSize: number;
    conversions: number;
    conversionRate: number;
    confidence: number;
  };
  variantB: {
    name: string;
    sampleSize: number;
    conversions: number;
    conversionRate: number;
    confidence: number;
  };
  winner: 'A' | 'B' | 'tie';
  improvement: number;
  statisticalSignificance: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  testDuration: number;
  recommendedAction: 'implement_winner' | 'continue_testing' | 'no_clear_winner';
}

export interface ModelRetrainingTrigger {
  type: 'scheduled' | 'performance' | 'drift' | 'manual';
  triggeredAt: string;
  reason: string;
  currentMetrics: ModelMetrics;
  threshold: {
    metric: string;
    value: number;
    operator: 'lt' | 'gt' | 'lte' | 'gte';
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface BatchScoringRequest {
  leads: LeadProfile[];
  modelId?: string;
  priority: 'low' | 'medium' | 'high';
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface BatchScoringResult {
  requestId: string;
  status: 'processing' | 'completed' | 'failed';
  totalLeads: number;
  processedLeads: number;
  results: MLLeadScore[];
  errors: Array<{
    leadId: number;
    error: string;
  }>;
  processingTime: number;
  completedAt?: string;
}

export interface ModelComparison {
  models: Array<{
    modelId: string;
    metrics: ModelMetrics;
    rank: number;
    strengths: string[];
    weaknesses: string[];
  }>;
  bestModel: string;
  comparisonCriteria: string[];
  recommendation: string;
  confidence: number;
}

export interface FeatureStoreEntry {
  leadId: number;
  features: LeadFeatures;
  version: string;
  createdAt: string;
  updatedAt: string;
  source: string;
  quality: {
    completeness: number;
    accuracy: number;
    freshness: number;
  };
  metadata: Record<string, any>;
}

export interface TrainingDataSnapshot {
  id: string;
  createdAt: string;
  dataRange: {
    start: string;
    end: string;
  };
  statistics: {
    totalLeads: number;
    convertedLeads: number;
    conversionRate: number;
    featureCompleteness: number;
    dataQuality: number;
  };
  features: string[];
  usedForTraining: boolean;
  modelVersions: string[];
}