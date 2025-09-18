import { Injectable } from '../types/di';
import { TrainingDataset, ModelVersion, ModelMetrics, DriftAnalysis, ABTest, ABTestResult, RetrainingSchedule, DataQualityReport } from '../types/ml';
import { ModelTrainingService } from './modelTrainingService';
import { MLScoringService } from './mlScoringService';
import { FeatureEngineeringService } from './featureEngineeringService';

@Injectable()
export class ModelRetrainingService {
  private static instance: ModelRetrainingService;
  private modelTrainingService: ModelTrainingService;
  private mlScoringService: MLScoringService;
  private featureEngineeringService: FeatureEngineeringService;

  // Retraining configuration
  private retrainingSchedule: RetrainingSchedule = {
    enabled: true,
    frequency: 'daily', // daily, weekly, monthly
    time: '02:00', // 2 AM
    dataWindow: 30, // days
    minDataPoints: 1000,
    performanceThreshold: 0.05, // 5% degradation threshold
    autoDeploy: true,
  };

  // A/B testing configuration
  private abTestConfig = {
    enabled: true,
    testDuration: 7, // days
    trafficSplit: 0.1, // 10% traffic to new model
    confidenceThreshold: 0.95, // 95% confidence required
    minSampleSize: 1000,
  };

  // Active A/B tests
  private activeABTests = new Map<string, ABTest>();

  // Retraining history
  private retrainingHistory: RetrainingEvent[] = [];

  private constructor() {
    this.modelTrainingService = ModelTrainingService.getInstance();
    this.mlScoringService = MLScoringService.getInstance();
    this.featureEngineeringService = FeatureEngineeringService.getInstance();

    // Start automated retraining
    this.startAutomatedRetraining();
  }

  public static getInstance(): ModelRetrainingService {
    if (!ModelRetrainingService.instance) {
      ModelRetrainingService.instance = new ModelRetrainingService();
    }
    return ModelRetrainingService.instance;
  }

  /**
   * Trigger manual model retraining
   */
  public async triggerRetraining(options: {
    modelId?: string;
    dataWindow?: number;
    force?: boolean;
  } = {}): Promise<RetrainingResult> {
    const startTime = new Date().toISOString();
    console.log(`Starting model retraining at ${startTime}`);

    try {
      // Validate retraining conditions
      const validation = await this.validateRetrainingConditions(options);
      if (!validation.canRetraining && !options.force) {
        return {
          success: false,
          reason: validation.reason,
          nextRetrainingTime: validation.nextRetrainingTime,
        };
      }

      // Prepare training data
      const trainingData = await this.prepareTrainingData(options.dataWindow || this.retrainingSchedule.dataWindow);

      // Validate data quality
      const dataQuality = await this.validateDataQuality(trainingData);
      if (!dataQuality.passed && !options.force) {
        return {
          success: false,
          reason: `Data quality validation failed: ${dataQuality.issues.join(', ')}`,
          dataQuality,
        };
      }

      // Train new model
      const newModel = await this.trainNewModel(trainingData, options.modelId);

      // Compare with current model
      const comparison = await this.compareModels(newModel);

      // Decide on deployment strategy
      const deploymentDecision = await this.decideDeploymentStrategy(newModel, comparison);

      const result: RetrainingResult = {
        success: true,
        newModel,
        comparison,
        deploymentDecision,
        dataQuality,
        trainingData: {
          size: trainingData.features.length,
          dateRange: trainingData.metadata?.dateRange || {
            start: new Date(Date.now() - (options.dataWindow || 30) * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
          conversionRate: trainingData.metadata?.conversionRate || 0,
        },
        startedAt: startTime,
        completedAt: new Date().toISOString(),
      };

      // Log retraining event
      this.logRetrainingEvent({
        type: 'manual',
        result,
        triggeredBy: 'user',
        timestamp: new Date().toISOString(),
      });

      console.log(`Model retraining completed successfully`);
      return result;

    } catch (error) {
      console.error('Model retraining failed:', error);

      const result: RetrainingResult = {
        success: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
        startedAt: startTime,
        completedAt: new Date().toISOString(),
      };

      // Log failed retraining event
      this.logRetrainingEvent({
        type: 'manual',
        result,
        triggeredBy: 'user',
        timestamp: new Date().toISOString(),
      });

      return result;
    }
  }

  /**
   * Start A/B test between two models
   */
  public async startABTest(
    challengerModelId: string,
    championModelId?: string,
    config: Partial<typeof this.abTestConfig> = {}
  ): Promise<ABTest> {
    const testConfig = { ...this.abTestConfig, ...config };
    const championId = championModelId || await this.getCurrentChampionModelId();

    if (!championId) {
      throw new Error('No champion model available for A/B testing');
    }

    const abTest: ABTest = {
      id: `ab_test_${Date.now()}`,
      championModelId: championId,
      challengerModelId,
      status: 'running',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + testConfig.testDuration * 24 * 60 * 60 * 1000).toISOString(),
      trafficSplit: testConfig.trafficSplit,
      championResults: {
        requests: 0,
        conversions: 0,
        conversionRate: 0,
        averageScore: 0,
      },
      challengerResults: {
        requests: 0,
        conversions: 0,
        conversionRate: 0,
        averageScore: 0,
      },
      config: testConfig,
    };

    this.activeABTests.set(abTest.id, abTest);

    console.log(`Started A/B test ${abTest.id} between ${championId} and ${challengerModelId}`);
    return abTest;
  }

  /**
   * Get A/B test results
   */
  public async getABTestResults(testId: string): Promise<ABTestResult | null> {
    const abTest = this.activeABTests.get(testId);
    if (!abTest) {
      return null;
    }

    // Check if test should end
    if (new Date() > new Date(abTest.endTime)) {
      abTest.status = 'completed';
    }

    // Calculate statistical significance
    const significance = this.calculateStatisticalSignificance(abTest);

    const result: ABTestResult = {
      testId,
      status: abTest.status,
      championModelId: abTest.championModelId,
      challengerModelId: abTest.challengerModelId,
      duration: Math.floor((new Date().getTime() - new Date(abTest.startTime).getTime()) / (24 * 60 * 60 * 1000)),
      championResults: abTest.championResults,
      challengerResults: abTest.challengerResults,
      winner: significance.winner,
      confidence: significance.confidence,
      improvement: significance.improvement,
      recommendation: this.generateABTestRecommendation(significance),
    };

    return result;
  }

  /**
   * Deploy A/B test winner
   */
  public async deployABTestWinner(testId: string): Promise<boolean> {
    const testResult = await this.getABTestResults(testId);
    if (!testResult || testResult.status !== 'completed') {
      throw new Error('A/B test not completed or not found');
    }

    if (testResult.winner === 'challenger' && testResult.confidence >= this.abTestConfig.confidenceThreshold) {
      // Deploy challenger model as new champion
      await this.deployModel(testResult.challengerModelId);
      console.log(`Deployed challenger model ${testResult.challengerModelId} as new champion`);
      return true;
    }

    return false;
  }

  /**
   * Detect model drift
   */
  public async detectModelDrift(modelId?: string): Promise<DriftAnalysis> {
    const targetModelId = modelId || await this.getCurrentChampionModelId();
    if (!targetModelId) {
      throw new Error('No model available for drift detection');
    }

    // Get recent predictions and actual outcomes
    const recentData = await this.getRecentPredictionData(30); // Last 30 days

    if (recentData.length < 100) {
      return {
        modelId: targetModelId,
        driftDetected: false,
        confidence: 0,
        driftMetrics: {},
        analysis: 'Insufficient data for drift detection',
        timestamp: new Date().toISOString(),
      };
    }

    // Calculate drift metrics
    const driftMetrics = this.calculateDriftMetrics(recentData);

    // Determine if drift is significant
    const driftDetected = this.isDriftSignificant(driftMetrics);
    const confidence = this.calculateDriftConfidence(driftMetrics);

    const analysis = driftDetected
      ? `Model drift detected with ${confidence.toFixed(1)}% confidence. Key issues: ${Object.entries(driftMetrics)
          .filter(([_, value]) => value > 0.1)
          .map(([key, _]) => key)
          .join(', ')}`
      : 'No significant model drift detected';

    return {
      modelId: targetModelId,
      driftDetected,
      confidence,
      driftMetrics,
      analysis,
      timestamp: new Date().toISOString(),
      recommendations: driftDetected ? [
        'Consider retraining the model with recent data',
        'Monitor performance closely over the next few days',
        'Review recent changes in lead behavior patterns',
      ] : [],
    };
  }

  /**
   * Get retraining schedule
   */
  public getRetrainingSchedule(): RetrainingSchedule {
    return { ...this.retrainingSchedule };
  }

  /**
   * Update retraining schedule
   */
  public updateRetrainingSchedule(schedule: Partial<RetrainingSchedule>): void {
    this.retrainingSchedule = { ...this.retrainingSchedule, ...schedule };
    console.log('Updated retraining schedule:', this.retrainingSchedule);
  }

  /**
   * Get retraining history
   */
  public getRetrainingHistory(limit: number = 10): RetrainingEvent[] {
    return this.retrainingHistory.slice(-limit);
  }

  /**
   * Get active A/B tests
   */
  public getActiveABTests(): ABTest[] {
    return Array.from(this.activeABTests.values()).filter(test => test.status === 'running');
  }

  /**
   * Get A/B test configuration
   */
  public getABTestConfig(): typeof this.abTestConfig {
    return { ...this.abTestConfig };
  }

  /**
   * Update A/B test configuration
   */
  public updateABTestConfig(config: Partial<typeof this.abTestConfig>): void {
    this.abTestConfig = { ...this.abTestConfig, ...config };
    console.log('Updated A/B test configuration:', this.abTestConfig);
  }

  // Private methods

  private async validateRetrainingConditions(options: any): Promise<{
    canRetraining: boolean;
    reason?: string;
    nextRetrainingTime?: string;
  }> {
    // Check if retraining is enabled
    if (!this.retrainingSchedule.enabled) {
      return {
        canRetraining: false,
        reason: 'Automated retraining is disabled',
      };
    }

    // Check minimum data requirements
    const recentDataCount = await this.getRecentDataCount(this.retrainingSchedule.dataWindow);
    if (recentDataCount < this.retrainingSchedule.minDataPoints) {
      return {
        canRetraining: false,
        reason: `Insufficient data: ${recentDataCount} data points, minimum ${this.retrainingSchedule.minDataPoints} required`,
        nextRetrainingTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Check again tomorrow
      };
    }

    // Check if last retraining was too recent
    const lastRetraining = this.retrainingHistory
      .filter(event => event.result.success)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (lastRetraining) {
      const hoursSinceLastRetraining = (Date.now() - new Date(lastRetraining.timestamp).getTime()) / (60 * 60 * 1000);
      const minHoursBetweenRetraining = this.getMinHoursBetweenRetraining();

      if (hoursSinceLastRetraining < minHoursBetweenRetraining) {
        return {
          canRetraining: false,
          reason: `Too soon since last retraining: ${hoursSinceLastRetraining.toFixed(1)} hours ago, minimum ${minHoursBetweenRetraining} hours required`,
          nextRetrainingTime: new Date(Date.now() + (minHoursBetweenRetraining - hoursSinceLastRetraining) * 60 * 60 * 1000).toISOString(),
        };
      }
    }

    return { canRetraining: true };
  }

  private async prepareTrainingData(dataWindow: number): Promise<TrainingDataset> {
    // In a real implementation, this would fetch data from database
    // For now, generate mock data
    const features = [];
    const labels = [];

    const dataSize = Math.max(1000, await this.getRecentDataCount(dataWindow));

    for (let i = 0; i < dataSize; i++) {
      const feature = await this.featureEngineeringService.extractLeadFeatures({
        id: i + 1,
        name: `Lead ${i + 1}`,
        email: `lead${i + 1}@example.com`,
        leadScore: Math.random() * 100,
        engagementLevel: Math.random() > 0.5 ? 'high' : 'medium',
        source: 'website',
        createdAt: new Date(Date.now() - Math.random() * dataWindow * 24 * 60 * 60 * 1000).toISOString(),
        lastActivity: new Date().toISOString(),
        totalInteractions: Math.floor(Math.random() * 20) + 1,
        conversionEvents: Math.floor(Math.random() * 3),
      });

      features.push(feature);
      labels.push(Math.random() > 0.7 ? 1 : 0); // 30% conversion rate
    }

    return {
      features,
      labels,
      metadata: {
        source: 'automated_retraining',
        dateRange: {
          start: new Date(Date.now() - dataWindow * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        sampleSize: dataSize,
        conversionRate: labels.filter(l => l === 1).length / labels.length,
        featureCount: 20,
      },
    };
  }

  private async validateDataQuality(trainingData: TrainingDataset): Promise<DataQualityReport> {
    const issues: string[] = [];

    // Check data size
    if (trainingData.features.length < 100) {
      issues.push('Insufficient training data');
    }

    // Check feature completeness
    const incompleteFeatures = trainingData.features.filter(f =>
      Object.values(f).some(v => v === null || v === undefined)
    ).length;

    if (incompleteFeatures > 0) {
      issues.push(`${incompleteFeatures} features have missing values`);
    }

    // Check label distribution
    const positiveLabels = trainingData.labels.filter(l => l === 1).length;
    const negativeLabels = trainingData.labels.filter(l => l === 0).length;
    const conversionRate = positiveLabels / trainingData.labels.length;

    if (conversionRate < 0.05 || conversionRate > 0.95) {
      issues.push(`Unbalanced labels: ${conversionRate.toFixed(3)} conversion rate`);
    }

    // Check for data drift
    const driftAnalysis = await this.detectFeatureDrift(trainingData);
    if (driftAnalysis.driftDetected) {
      issues.push(`Feature drift detected: ${driftAnalysis.analysis}`);
    }

    return {
      passed: issues.length === 0,
      issues,
      metrics: {
        dataSize: trainingData.features.length,
        conversionRate,
        positiveLabels,
        negativeLabels,
        completeness: 1 - (incompleteFeatures / trainingData.features.length),
      },
      driftAnalysis,
    };
  }

  private async trainNewModel(trainingData: TrainingDataset, modelId?: string): Promise<ModelVersion> {
    // Use hyperparameter tuning to find best configuration
    const bestConfig = await this.modelTrainingService.tuneHyperparameters(trainingData, 'gradient_boosting');

    // Train the model with best configuration
    const newModel = await this.modelTrainingService.trainGradientBoostingModel(trainingData, bestConfig);

    return newModel;
  }

  private async compareModels(newModel: ModelVersion): Promise<ModelComparison> {
    const currentModel = await this.getCurrentChampionModel();

    if (!currentModel) {
      return {
        newModel,
        currentModel: null,
        improvement: null,
        statisticalSignificance: null,
        recommendation: 'deploy',
      };
    }

    // Compare performance metrics
    const improvement = {
      accuracy: newModel.performance.accuracy - currentModel.performance.accuracy,
      precision: newModel.performance.precision - currentModel.performance.precision,
      recall: newModel.performance.recall - currentModel.performance.recall,
      f1Score: newModel.performance.f1Score - currentModel.performance.f1Score,
    };

    // Calculate statistical significance (simplified)
    const significance = this.calculateModelSignificance(newModel, currentModel);

    let recommendation: 'deploy' | 'ab_test' | 'reject';
    if (improvement.f1Score > 0.02 && significance.confidence > 0.8) {
      recommendation = 'deploy';
    } else if (improvement.f1Score > 0.01) {
      recommendation = 'ab_test';
    } else {
      recommendation = 'reject';
    }

    return {
      newModel,
      currentModel,
      improvement,
      statisticalSignificance: significance,
      recommendation,
    };
  }

  private async decideDeploymentStrategy(newModel: ModelVersion, comparison: ModelComparison): Promise<DeploymentDecision> {
    if (comparison.recommendation === 'deploy' && this.retrainingSchedule.autoDeploy) {
      return {
        action: 'immediate_deploy',
        reason: 'Model shows significant improvement and auto-deploy is enabled',
        riskLevel: 'low',
      };
    } else if (comparison.recommendation === 'ab_test') {
      return {
        action: 'ab_test',
        reason: 'Model shows moderate improvement, A/B testing recommended',
        riskLevel: 'medium',
        testDuration: this.abTestConfig.testDuration,
        trafficSplit: this.abTestConfig.trafficSplit,
      };
    } else {
      return {
        action: 'reject',
        reason: 'Model does not show sufficient improvement',
        riskLevel: 'low',
      };
    }
  }

  private async startAutomatedRetraining(): Promise<void> {
    if (!this.retrainingSchedule.enabled) {
      return;
    }

    // Schedule daily retraining
    const checkInterval = 60 * 60 * 1000; // Check every hour

    setInterval(async () => {
      try {
        const now = new Date();
        const [hours, minutes] = this.retrainingSchedule.time.split(':').map(Number);

        if (now.getHours() === hours && now.getMinutes() >= minutes && now.getMinutes() < minutes + 5) {
          // It's time for retraining
          console.log('Starting scheduled model retraining');

          const result = await this.triggerRetraining({ force: false });

          if (result.success) {
            console.log('Scheduled retraining completed successfully');
          } else {
            console.log('Scheduled retraining skipped:', result.reason);
          }
        }
      } catch (error) {
        console.error('Scheduled retraining failed:', error);
      }
    }, checkInterval);
  }

  private async getRecentDataCount(days: number): Promise<number> {
    // Mock implementation - in real system, query database
    return Math.floor(Math.random() * 2000) + 500; // 500-2500 data points
  }

  private getMinHoursBetweenRetraining(): number {
    switch (this.retrainingSchedule.frequency) {
      case 'daily': return 20; // At least 20 hours between retraining
      case 'weekly': return 24 * 7 - 2; // Almost a week
      case 'monthly': return 24 * 30 - 24; // Almost a month
      default: return 24;
    }
  }

  private async getCurrentChampionModelId(): Promise<string | null> {
    // Mock implementation - in real system, query database for active model
    return 'champion_model_v1';
  }

  private async getCurrentChampionModel(): Promise<ModelVersion | null> {
    const modelId = await this.getCurrentChampionModelId();
    if (!modelId) return null;

    // Mock implementation - in real system, load model from storage
    return {
      id: modelId,
      modelId,
      version: '1.0.0',
      status: 'active',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      metrics: {
        accuracy: 0.82,
        loss: 0.4,
        precision: 0.78,
        recall: 0.85,
        f1Score: 0.81,
        truePositives: 850,
        falsePositives: 240,
        trueNegatives: 1200,
        falseNegatives: 150,
        evaluatedAt: new Date().toISOString(),
        sampleSize: 2440,
      },
      config: {
        type: 'gradient_boosting',
        learningRate: 0.1,
        epochs: 100,
        maxDepth: 6,
        nEstimators: 100,
      },
      trainingData: {
        size: 2440,
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        conversionRate: 0.35,
      },
      performance: {
        accuracy: 0.82,
        precision: 0.78,
        recall: 0.85,
        f1Score: 0.81,
      },
    };
  }

  private calculateStatisticalSignificance(abTest: ABTest): ABTestSignificance {
    const championRate = abTest.championResults.conversionRate;
    const challengerRate = abTest.challengerResults.conversionRate;
    const totalRequests = abTest.championResults.requests + abTest.challengerResults.requests;

    if (totalRequests < this.abTestConfig.minSampleSize) {
      return {
        winner: null,
        confidence: 0,
        improvement: 0,
        statisticalSignificance: false,
      };
    }

    // Simplified statistical significance calculation
    const improvement = challengerRate - championRate;
    const standardError = Math.sqrt((championRate * (1 - championRate) / abTest.championResults.requests) +
                                   (challengerRate * (1 - challengerRate) / abTest.challengerResults.requests));
    const zScore = Math.abs(improvement) / standardError;
    const confidence = Math.min(1, zScore / 1.96); // Approximate p-value to confidence

    let winner: 'champion' | 'challenger' | null = null;
    if (confidence >= this.abTestConfig.confidenceThreshold) {
      winner = improvement > 0 ? 'challenger' : 'champion';
    }

    return {
      winner,
      confidence,
      improvement,
      statisticalSignificance: confidence >= this.abTestConfig.confidenceThreshold,
    };
  }

  private generateABTestRecommendation(significance: ABTestSignificance): string {
    if (!significance.statisticalSignificance) {
      return 'Continue testing to reach statistical significance';
    }

    if (significance.winner === 'challenger') {
      return `Deploy challenger model - shows ${(significance.improvement * 100).toFixed(1)}% improvement with ${(significance.confidence * 100).toFixed(1)}% confidence`;
    } else {
      return 'Keep champion model - challenger did not show significant improvement';
    }
  }

  private async getRecentPredictionData(days: number): Promise<any[]> {
    // Mock implementation - in real system, query prediction history
    return Array.from({ length: Math.floor(Math.random() * 500) + 100 }, (_, i) => ({
      prediction: Math.random(),
      actual: Math.random() > 0.7 ? 1 : 0,
      timestamp: new Date(Date.now() - Math.random() * days * 24 * 60 * 60 * 1000).toISOString(),
    }));
  }

  private calculateDriftMetrics(data: any[]): Record<string, number> {
    // Simplified drift detection
    const recent = data.slice(-Math.floor(data.length / 2));
    const older = data.slice(0, Math.floor(data.length / 2));

    const recentAccuracy = this.calculateAccuracy(recent);
    const olderAccuracy = this.calculateAccuracy(older);

    return {
      accuracyDrift: Math.abs(recentAccuracy - olderAccuracy),
      predictionDrift: this.calculatePredictionDrift(recent, older),
      distributionDrift: this.calculateDistributionDrift(recent, older),
    };
  }

  private calculateAccuracy(data: any[]): number {
    const correct = data.filter(d => Math.round(d.prediction) === d.actual).length;
    return correct / data.length;
  }

  private calculatePredictionDrift(recent: any[], older: any[]): number {
    const recentAvg = recent.reduce((sum, d) => sum + d.prediction, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.prediction, 0) / older.length;
    return Math.abs(recentAvg - olderAvg);
  }

  private calculateDistributionDrift(recent: any[], older: any[]): number {
    const recentStd = this.calculateStd(recent.map(d => d.prediction));
    const olderStd = this.calculateStd(older.map(d => d.prediction));
    return Math.abs(recentStd - olderStd);
  }

  private calculateStd(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length);
  }

  private isDriftSignificant(metrics: Record<string, number>): boolean {
    return Object.values(metrics).some(value => value > this.retrainingSchedule.performanceThreshold);
  }

  private calculateDriftConfidence(metrics: Record<string, number>): number {
    const maxDrift = Math.max(...Object.values(metrics));
    return Math.min(1, maxDrift / this.retrainingSchedule.performanceThreshold);
  }

  private calculateModelSignificance(newModel: ModelVersion, currentModel: ModelVersion): ModelSignificance {
    // Simplified significance calculation
    const improvement = newModel.performance.f1Score - currentModel.performance.f1Score;
    const pooledStd = Math.sqrt(
      (newModel.metrics.precision * (1 - newModel.metrics.precision) / newModel.metrics.sampleSize) +
      (currentModel.metrics.precision * (1 - currentModel.metrics.precision) / currentModel.metrics.sampleSize)
    );

    const zScore = Math.abs(improvement) / pooledStd;
    const confidence = Math.min(1, zScore / 1.96);

    return {
      confidence,
      statisticalSignificance: confidence >= 0.8,
      effectSize: improvement,
    };
  }

  private async detectFeatureDrift(trainingData: TrainingDataset): Promise<any> {
    // Simplified feature drift detection
    return {
      driftDetected: Math.random() > 0.8, // 20% chance of drift
      analysis: 'Feature distribution appears stable',
    };
  }

  private async deployModel(modelId: string): Promise<void> {
    // Mock deployment - in real system, update model registry and restart services
    console.log(`Deploying model ${modelId} as new champion`);
  }

  private logRetrainingEvent(event: RetrainingEvent): void {
    this.retrainingHistory.push(event);

    // Keep only last 100 events
    if (this.retrainingHistory.length > 100) {
      this.retrainingHistory = this.retrainingHistory.slice(-100);
    }
  }
}

// Types and interfaces

interface RetrainingResult {
  success: boolean;
  reason?: string;
  newModel?: ModelVersion;
  comparison?: ModelComparison;
  deploymentDecision?: DeploymentDecision;
  dataQuality?: DataQualityReport;
  trainingData?: {
    size: number;
    dateRange: { start: string; end: string };
    conversionRate: number;
  };
  startedAt: string;
  completedAt: string;
  nextRetrainingTime?: string;
}

interface ModelComparison {
  newModel: ModelVersion;
  currentModel: ModelVersion | null;
  improvement: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  statisticalSignificance: ModelSignificance;
  recommendation: 'deploy' | 'ab_test' | 'reject';
}

interface DeploymentDecision {
  action: 'immediate_deploy' | 'ab_test' | 'reject';
  reason: string;
  riskLevel: 'low' | 'medium' | 'high';
  testDuration?: number;
  trafficSplit?: number;
}

interface ModelSignificance {
  confidence: number;
  statisticalSignificance: boolean;
  effectSize: number;
}

interface ABTestSignificance {
  winner: 'champion' | 'challenger' | null;
  confidence: number;
  improvement: number;
  statisticalSignificance: boolean;
}

interface RetrainingEvent {
  type: 'scheduled' | 'manual';
  result: RetrainingResult;
  triggeredBy: string;
  timestamp: string;
}

export const modelRetrainingService = ModelRetrainingService.getInstance();