import * as tf from '@tensorflow/tfjs';
import { Injectable } from '../types/di';
import { LeadProfile, LeadFeatures, MLLeadScore, ModelMetrics, TrainingDataset } from '../types/ml';

@Injectable()
export class MLScoringService {
  private static instance: MLScoringService;
  private models: Map<string, tf.LayersModel> = new Map();
  private modelMetadata: Map<string, ModelMetadata> = new Map();
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): MLScoringService {
    if (!MLScoringService.instance) {
      MLScoringService.instance = new MLScoringService();
    }
    return MLScoringService.instance;
  }

  /**
   * Initialize the ML service with TensorFlow.js
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize TensorFlow.js
      await tf.ready();

      // Set backend to CPU for Node.js environment
      await tf.setBackend('cpu');

      console.log('ML Scoring Service initialized with TensorFlow.js');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize ML Scoring Service:', error);
      throw new Error('ML service initialization failed');
    }
  }

  /**
   * Train a new ML model for lead scoring
   */
  public async trainModel(
    trainingData: TrainingDataset,
    modelConfig: ModelConfig = DEFAULT_MODEL_CONFIG
  ): Promise<ModelMetrics> {
    await this.ensureInitialized();

    try {
      console.log(`Training ML model with ${trainingData.features.length} samples`);

      // Prepare training data
      const { inputs, labels } = await this.prepareTrainingData(trainingData);

      // Create and compile model
      const model = this.createModel(modelConfig);

      // Train the model
      const history = await model.fit(inputs, labels, {
        epochs: modelConfig.epochs,
        batchSize: modelConfig.batchSize,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(`Epoch ${epoch + 1}: loss = ${logs?.loss?.toFixed(4)}, val_loss = ${logs?.val_loss?.toFixed(4)}`);
          }
        }
      });

      // Generate unique model ID
      const modelId = `ml_model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store model and metadata
      this.models.set(modelId, model);
      this.modelMetadata.set(modelId, {
        id: modelId,
        type: modelConfig.type,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        config: modelConfig,
        metrics: await this.evaluateModel(model, inputs, labels),
        trainingHistory: history.history
      });

      console.log(`Model trained successfully: ${modelId}`);
      return this.modelMetadata.get(modelId)!.metrics;

    } catch (error) {
      console.error('Model training failed:', error);
      throw new Error('Model training failed');
    }
  }

  /**
   * Score a lead using the ML model
   */
  public async scoreLead(
    leadData: LeadProfile,
    modelId?: string
  ): Promise<MLLeadScore> {
    await this.ensureInitialized();

    try {
      // Use latest model if none specified
      const targetModelId = modelId || this.getLatestModelId();
      if (!targetModelId) {
        throw new Error('No trained model available');
      }

      const model = this.models.get(targetModelId);
      if (!model) {
        throw new Error(`Model ${targetModelId} not found`);
      }

      // Extract features from lead data
      const features = await this.extractFeatures(leadData);

      // Convert to tensor
      const inputTensor = tf.tensor2d([features], [1, features.length]);

      // Make prediction
      const prediction = model.predict(inputTensor) as tf.Tensor;
      const score = (await prediction.data())[0];

      // Clean up tensors
      inputTensor.dispose();
      prediction.dispose();

      // Calculate confidence based on prediction probability
      const confidence = Math.abs(score - 0.5) * 2; // 0-1 scale

      const mlScore: MLLeadScore = {
        leadId: leadData.id,
        score: Math.round(score * 100) / 100, // Round to 2 decimal places
        confidence: Math.round(confidence * 100) / 100,
        modelId: targetModelId,
        modelVersion: this.modelMetadata.get(targetModelId)?.version || 'unknown',
        scoredAt: new Date().toISOString(),
        featuresUsed: Object.keys(features),
        prediction: score > 0.5 ? 'high_value' : 'low_value',
        insights: await this.generateInsights(score, features, leadData)
      };

      console.log(`Lead ${leadData.id} scored: ${mlScore.score} (confidence: ${mlScore.confidence})`);
      return mlScore;

    } catch (error) {
      console.error('Lead scoring failed:', error);
      throw new Error('Lead scoring failed');
    }
  }

  /**
   * Score multiple leads in batch
   */
  public async scoreLeadsBatch(
    leads: LeadProfile[],
    modelId?: string
  ): Promise<MLLeadScore[]> {
    const scores: MLLeadScore[] = [];

    // Process in batches to avoid memory issues
    const batchSize = 50;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const batchPromises = batch.map(lead => this.scoreLead(lead, modelId));
      const batchResults = await Promise.all(batchPromises);
      scores.push(...batchResults);
    }

    return scores;
  }

  /**
   * Get model metrics and performance
   */
  public async getModelMetrics(modelId?: string): Promise<ModelMetrics> {
    const targetModelId = modelId || this.getLatestModelId();
    if (!targetModelId) {
      throw new Error('No trained model available');
    }

    const metadata = this.modelMetadata.get(targetModelId);
    if (!metadata) {
      throw new Error(`Model ${targetModelId} not found`);
    }

    return metadata.metrics;
  }

  /**
   * List all available models
   */
  public getAvailableModels(): ModelMetadata[] {
    return Array.from(this.modelMetadata.values());
  }

  /**
   * Delete a model
   */
  public async deleteModel(modelId: string): Promise<boolean> {
    const model = this.models.get(modelId);
    if (model) {
      model.dispose();
      this.models.delete(modelId);
      this.modelMetadata.delete(modelId);
      return true;
    }
    return false;
  }

  /**
   * Get service health status
   */
  public getHealthStatus(): ServiceHealth {
    return {
      isHealthy: this.isInitialized,
      modelCount: this.models.size,
      latestModelId: this.getLatestModelId(),
      memoryUsage: tf.memory(),
      backend: tf.getBackend()
    };
  }

  // Private helper methods

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private getLatestModelId(): string | null {
    if (this.modelMetadata.size === 0) return null;

    let latestModel: ModelMetadata | null = null;
    let latestTime = 0;

    for (const metadata of this.modelMetadata.values()) {
      const modelTime = new Date(metadata.createdAt).getTime();
      if (modelTime > latestTime) {
        latestTime = modelTime;
        latestModel = metadata;
      }
    }

    return latestModel?.id || null;
  }

  private async prepareTrainingData(trainingData: TrainingDataset): Promise<{
    inputs: tf.Tensor2D;
    labels: tf.Tensor2D;
  }> {
    const features = trainingData.features.map(f => this.featureArrayToVector(f));
    const inputs = tf.tensor2d(features, [features.length, features[0].length]);
    const labels = tf.tensor2d(trainingData.labels.map(l => [l]), [trainingData.labels.length, 1]);

    return { inputs, labels };
  }

  private featureArrayToVector(features: LeadFeatures): number[] {
    // Convert feature object to numerical array
    return [
      features.leadScore || 0,
      features.engagementScore || 0,
      features.propertyMatch || 0,
      features.budgetFit || 0,
      features.timelineFit || 0,
      features.locationPreference || 0,
      features.responseRate || 0,
      features.contactFrequency || 0,
      features.sessionDuration || 0,
      features.pageViews || 0,
      features.emailOpens || 0,
      features.formSubmissions || 0,
      features.callDuration || 0,
      features.meetingCount || 0,
      features.daysSinceFirstContact || 0,
      features.daysSinceLastActivity || 0,
      features.totalInteractions || 0,
      features.conversionEvents || 0,
      features.sourceQuality || 0,
      features.behavioralScore || 0
    ];
  }

  private createModel(config: ModelConfig): tf.LayersModel {
    const model = tf.sequential();

    // Input layer
    model.add(tf.layers.dense({
      inputShape: [20], // Number of features
      units: config.hiddenLayers[0] || 64,
      activation: 'relu'
    }));

    // Hidden layers
    for (let i = 1; i < config.hiddenLayers.length; i++) {
      model.add(tf.layers.dense({
        units: config.hiddenLayers[i],
        activation: 'relu'
      }));
    }

    // Output layer
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));

    // Compile model
    model.compile({
      optimizer: tf.train.adam(config.learningRate),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  private async evaluateModel(
    model: tf.LayersModel,
    inputs: tf.Tensor2D,
    labels: tf.Tensor2D
  ): Promise<ModelMetrics> {
    const evaluation = await model.evaluate(inputs, labels) as tf.Tensor[];
    const loss = (await evaluation[0].data())[0];
    const accuracy = (await evaluation[1].data())[0];

    // Calculate additional metrics
    const predictions = model.predict(inputs) as tf.Tensor;
    const predData = await predictions.data();
    const labelData = await labels.data();

    let truePositives = 0, falsePositives = 0, trueNegatives = 0, falseNegatives = 0;

    for (let i = 0; i < predData.length; i++) {
      const predicted = predData[i] > 0.5 ? 1 : 0;
      const actual = labelData[i];

      if (predicted === 1 && actual === 1) truePositives++;
      else if (predicted === 1 && actual === 0) falsePositives++;
      else if (predicted === 0 && actual === 0) trueNegatives++;
      else if (predicted === 0 && actual === 1) falseNegatives++;
    }

    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

    // Clean up tensors
    predictions.dispose();

    return {
      accuracy,
      loss,
      precision,
      recall,
      f1Score,
      truePositives,
      falsePositives,
      trueNegatives,
      falseNegatives,
      evaluatedAt: new Date().toISOString(),
      sampleSize: predData.length
    };
  }

  private async extractFeatures(leadData: LeadProfile): Promise<Record<string, number>> {
    // This would integrate with the feature engineering service
    // For now, return mock features
    return {
      leadScore: leadData.leadScore || 0,
      engagementScore: 0.75, // Mock value
      propertyMatch: 0.8, // Mock value
      budgetFit: 0.7, // Mock value
      timelineFit: 0.6, // Mock value
      locationPreference: 0.9, // Mock value
      responseRate: 0.4, // Mock value
      contactFrequency: 0.3, // Mock value
      sessionDuration: 0.5, // Mock value
      pageViews: 0.6, // Mock value
      emailOpens: 0.7, // Mock value
      formSubmissions: 0.2, // Mock value
      callDuration: 0.4, // Mock value
      meetingCount: 0.1, // Mock value
      daysSinceFirstContact: 0.8, // Mock value
      daysSinceLastActivity: 0.9, // Mock value
      totalInteractions: 0.6, // Mock value
      conversionEvents: 0.3, // Mock value
      sourceQuality: 0.7, // Mock value
      behavioralScore: 0.65 // Mock value
    };
  }

  private async generateInsights(
    score: number,
    features: Record<string, number>,
    leadData: LeadProfile
  ): Promise<string[]> {
    const insights: string[] = [];

    if (score > 0.8) {
      insights.push('High conversion probability - prioritize this lead');
    } else if (score > 0.6) {
      insights.push('Good conversion potential - engage promptly');
    } else {
      insights.push('Lower conversion probability - nurture over time');
    }

    // Add feature-specific insights
    if (features.engagementScore > 0.8) {
      insights.push('Strong engagement patterns indicate high interest');
    }

    if (features.responseRate > 0.7) {
      insights.push('Excellent response rate shows active communication');
    }

    if (features.propertyMatch > 0.9) {
      insights.push('Perfect property match increases conversion likelihood');
    }

    return insights;
  }
}

// Types and interfaces

interface ModelMetadata {
  id: string;
  type: string;
  version: string;
  createdAt: string;
  config: ModelConfig;
  metrics: ModelMetrics;
  trainingHistory: any;
}

interface ModelConfig {
  type: 'neural_network' | 'gradient_boosting' | 'ensemble';
  hiddenLayers: number[];
  learningRate: number;
  epochs: number;
  batchSize: number;
}

interface ServiceHealth {
  isHealthy: boolean;
  modelCount: number;
  latestModelId: string | null;
  memoryUsage: tf.MemoryInfo;
  backend: string;
}

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  type: 'neural_network',
  hiddenLayers: [64, 32, 16],
  learningRate: 0.001,
  epochs: 50,
  batchSize: 32
};

export const mlScoringService = MLScoringService.getInstance();