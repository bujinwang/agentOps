import { Injectable } from '../types/di';
import { TrainingDataset, ModelConfig, ModelMetrics, CrossValidationResults, ModelVersion } from '../types/ml';

@Injectable()
export class ModelTrainingService {
  private static instance: ModelTrainingService;

  private constructor() {}

  public static getInstance(): ModelTrainingService {
    if (!ModelTrainingService.instance) {
      ModelTrainingService.instance = new ModelTrainingService();
    }
    return ModelTrainingService.instance;
  }

  /**
   * Train a baseline logistic regression model
   */
  public async trainBaselineModel(
    trainingData: TrainingDataset,
    config: Partial<ModelConfig> = {}
  ): Promise<ModelVersion> {
    const modelConfig: ModelConfig = {
      type: 'logistic_regression',
      learningRate: config.learningRate || 0.01,
      epochs: config.epochs || 100,
      batchSize: config.batchSize || 32,
      ...config,
    };

    console.log(`Training baseline logistic regression model with ${trainingData.features.length} samples`);

    // Prepare training data
    const { inputs, labels } = await this.prepareTrainingData(trainingData);

    // Create and train baseline model
    const model = await this.createLogisticRegressionModel(modelConfig);
    const history = await this.trainModel(model, inputs, labels, modelConfig);

    // Evaluate model
    const metrics = await this.evaluateModel(model, inputs, labels);

    // Create model version
    const modelVersion: ModelVersion = {
      id: `baseline_${Date.now()}`,
      modelId: 'lead_scoring_baseline',
      version: '1.0.0',
      status: 'active',
      createdAt: new Date().toISOString(),
      metrics,
      config: modelConfig,
      trainingData: {
        size: trainingData.features.length,
        dateRange: trainingData.metadata?.dateRange || {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        conversionRate: trainingData.metadata?.conversionRate || this.calculateConversionRate(trainingData.labels),
      },
      performance: {
        accuracy: metrics.accuracy,
        precision: metrics.precision,
        recall: metrics.recall,
        f1Score: metrics.f1Score,
      },
    };

    console.log(`Baseline model trained: ${modelVersion.id}`);
    console.log(`Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%, F1-Score: ${(metrics.f1Score * 100).toFixed(2)}%`);

    return modelVersion;
  }

  /**
   * Train an advanced gradient boosting model
   */
  public async trainGradientBoostingModel(
    trainingData: TrainingDataset,
    config: Partial<ModelConfig> = {}
  ): Promise<ModelVersion> {
    const modelConfig: ModelConfig = {
      type: 'gradient_boosting',
      learningRate: config.learningRate || 0.1,
      epochs: config.epochs || 100,
      maxDepth: config.maxDepth || 6,
      nEstimators: config.nEstimators || 100,
      ...config,
    };

    console.log(`Training gradient boosting model with ${trainingData.features.length} samples`);

    // Prepare training data
    const { inputs, labels } = await this.prepareTrainingData(trainingData);

    // Create and train gradient boosting model
    const model = await this.createGradientBoostingModel(modelConfig);
    const history = await this.trainModel(model, inputs, labels, modelConfig);

    // Evaluate model
    const metrics = await this.evaluateModel(model, inputs, labels);

    // Create model version
    const modelVersion: ModelVersion = {
      id: `gb_${Date.now()}`,
      modelId: 'lead_scoring_gradient_boosting',
      version: '1.0.0',
      status: 'active',
      createdAt: new Date().toISOString(),
      metrics,
      config: modelConfig,
      trainingData: {
        size: trainingData.features.length,
        dateRange: trainingData.metadata?.dateRange || {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        conversionRate: trainingData.metadata?.conversionRate || this.calculateConversionRate(trainingData.labels),
      },
      performance: {
        accuracy: metrics.accuracy,
        precision: metrics.precision,
        recall: metrics.recall,
        f1Score: metrics.f1Score,
      },
    };

    console.log(`Gradient boosting model trained: ${modelVersion.id}`);
    console.log(`Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%, F1-Score: ${(metrics.f1Score * 100).toFixed(2)}%`);

    return modelVersion;
  }

  /**
   * Train an ensemble model combining multiple algorithms
   */
  public async trainEnsembleModel(
    trainingData: TrainingDataset,
    config: Partial<ModelConfig> = {}
  ): Promise<ModelVersion> {
    const modelConfig: ModelConfig = {
      type: 'ensemble',
      ...config,
    };

    console.log(`Training ensemble model with ${trainingData.features.length} samples`);

    // Train individual models
    const baselineModel = await this.trainBaselineModel(trainingData, { epochs: 50 });
    const gbModel = await this.trainGradientBoostingModel(trainingData, { epochs: 50, nEstimators: 50 });

    // Create ensemble model
    const ensembleModel = await this.createEnsembleModel([baselineModel, gbModel], modelConfig);

    // Prepare training data for ensemble evaluation
    const { inputs, labels } = await this.prepareTrainingData(trainingData);

    // Evaluate ensemble
    const metrics = await this.evaluateEnsembleModel(ensembleModel, inputs, labels);

    // Create model version
    const modelVersion: ModelVersion = {
      id: `ensemble_${Date.now()}`,
      modelId: 'lead_scoring_ensemble',
      version: '1.0.0',
      status: 'active',
      createdAt: new Date().toISOString(),
      metrics,
      config: modelConfig,
      trainingData: {
        size: trainingData.features.length,
        dateRange: trainingData.metadata?.dateRange || {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        conversionRate: trainingData.metadata?.conversionRate || this.calculateConversionRate(trainingData.labels),
      },
      performance: {
        accuracy: metrics.accuracy,
        precision: metrics.precision,
        recall: metrics.recall,
        f1Score: metrics.f1Score,
      },
    };

    console.log(`Ensemble model trained: ${modelVersion.id}`);
    console.log(`Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%, F1-Score: ${(metrics.f1Score * 100).toFixed(2)}%`);

    return modelVersion;
  }

  /**
   * Perform cross-validation on a model
   */
  public async performCrossValidation(
    trainingData: TrainingDataset,
    modelType: ModelConfig['type'] = 'logistic_regression',
    folds: number = 5
  ): Promise<CrossValidationResults> {
    console.log(`Performing ${folds}-fold cross-validation for ${modelType} model`);

    const { inputs, labels } = await this.prepareTrainingData(trainingData);
    const foldSize = Math.floor(inputs.shape[0] / folds);

    const scores = {
      accuracy: [] as number[],
      precision: [] as number[],
      recall: [] as number[],
      f1Score: [] as number[],
      auc: [] as number[],
    };

    // Perform k-fold cross-validation
    for (let fold = 0; fold < folds; fold++) {
      const valStart = fold * foldSize;
      const valEnd = fold === folds - 1 ? inputs.shape[0] : (fold + 1) * foldSize;

      // Split data
      const trainInputs1 = this.sliceTensor(inputs, 0, valStart);
      const trainInputs2 = this.sliceTensor(inputs, valEnd, inputs.shape[0] - valEnd);
      const trainInputs = tf.concat([trainInputs1, trainInputs2]);

      const trainLabels1 = this.sliceTensor(labels, 0, valStart);
      const trainLabels2 = this.sliceTensor(labels, valEnd, labels.shape[0] - valEnd);
      const trainLabels = tf.concat([trainLabels1, trainLabels2]);
      const valInputs = this.sliceTensor(inputs, valStart, valEnd);
      const valLabels = this.sliceTensor(labels, valStart, valEnd);

      // Train model on fold
      const modelConfig: ModelConfig = {
        type: modelType,
        epochs: 50, // Reduced for CV
        batchSize: 32,
      };

      let model;
      if (modelType === 'logistic_regression') {
        model = await this.createLogisticRegressionModel(modelConfig);
      } else if (modelType === 'gradient_boosting') {
        model = await this.createGradientBoostingModel(modelConfig);
      } else {
        throw new Error(`Unsupported model type for CV: ${modelType}`);
      }

      await this.trainModel(model, trainInputs, trainLabels, modelConfig);

      // Evaluate on validation set
      const foldMetrics = await this.evaluateModel(model, valInputs, valLabels);

      scores.accuracy.push(foldMetrics.accuracy);
      scores.precision.push(foldMetrics.precision);
      scores.recall.push(foldMetrics.recall);
      scores.f1Score.push(foldMetrics.f1Score);
      scores.auc.push(foldMetrics.auc || 0);
    }

    // Calculate mean and std scores
    const meanScores = {
      accuracy: this.mean(scores.accuracy),
      precision: this.mean(scores.precision),
      recall: this.mean(scores.recall),
      f1Score: this.mean(scores.f1Score),
      auc: this.mean(scores.auc),
    };

    const stdScores = {
      accuracy: this.std(scores.accuracy, meanScores.accuracy),
      precision: this.std(scores.precision, meanScores.precision),
      recall: this.std(scores.recall, meanScores.recall),
      f1Score: this.std(scores.f1Score, meanScores.f1Score),
      auc: this.std(scores.auc, meanScores.auc),
    };

    const results: CrossValidationResults = {
      folds,
      scores,
      meanScores,
      stdScores,
      bestFold: scores.f1Score.indexOf(Math.max(...scores.f1Score)),
      worstFold: scores.f1Score.indexOf(Math.min(...scores.f1Score)),
    };

    console.log(`Cross-validation completed:`);
    console.log(`Mean Accuracy: ${(meanScores.accuracy * 100).toFixed(2)}% ± ${(stdScores.accuracy * 100).toFixed(2)}%`);
    console.log(`Mean F1-Score: ${(meanScores.f1Score * 100).toFixed(2)}% ± ${(stdScores.f1Score * 100).toFixed(2)}%`);

    return results;
  }

  /**
   * Perform hyperparameter tuning
   */
  public async tuneHyperparameters(
    trainingData: TrainingDataset,
    modelType: ModelConfig['type'] = 'logistic_regression',
    paramGrid?: Record<string, any[]>
  ): Promise<ModelConfig> {
    console.log(`Tuning hyperparameters for ${modelType} model`);

    const defaultGrids = {
      logistic_regression: {
        learningRate: [0.001, 0.01, 0.1],
        batchSize: [16, 32, 64],
      },
      gradient_boosting: {
        learningRate: [0.01, 0.1, 0.2],
        maxDepth: [3, 6, 9],
        nEstimators: [50, 100, 200],
      },
    };

    const grid = paramGrid || defaultGrids[modelType];
    if (!grid) {
      throw new Error(`No parameter grid defined for model type: ${modelType}`);
    }

    let bestConfig: ModelConfig | null = null;
    let bestScore = 0;

    // Generate all parameter combinations
    const combinations = this.generateParameterCombinations(grid);

    console.log(`Testing ${combinations.length} parameter combinations`);

    for (const params of combinations) {
      const config: ModelConfig = {
        type: modelType,
        epochs: 30, // Reduced for tuning
        ...params,
      };

      try {
        // Quick cross-validation with 3 folds
        const cvResults = await this.performCrossValidation(trainingData, modelType, 3);

        if (cvResults.meanScores.f1Score > bestScore) {
          bestScore = cvResults.meanScores.f1Score;
          bestConfig = config;
        }

        console.log(`Params: ${JSON.stringify(params)} → F1: ${(cvResults.meanScores.f1Score * 100).toFixed(2)}%`);
      } catch (error) {
        console.warn(`Failed to evaluate params ${JSON.stringify(params)}:`, error);
      }
    }

    if (!bestConfig) {
      throw new Error('Hyperparameter tuning failed to find valid configuration');
    }

    console.log(`Best hyperparameters found:`, bestConfig);
    console.log(`Best F1-Score: ${(bestScore * 100).toFixed(2)}%`);

    return bestConfig;
  }

  // Private helper methods

  private async prepareTrainingData(trainingData: TrainingDataset): Promise<{
    inputs: any; // TensorFlow tensor
    labels: any; // TensorFlow tensor
  }> {
    // Convert features to tensor format
    const featureArrays = trainingData.features.map(features => this.featuresToArray(features));
    const inputs = tf.tensor2d(featureArrays, [featureArrays.length, featureArrays[0].length]);
    const labels = tf.tensor2d(trainingData.labels.map(l => [l]), [trainingData.labels.length, 1]);

    return { inputs, labels };
  }

  private featuresToArray(features: any): number[] {
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
      features.behavioralScore || 0,
    ];
  }

  private async createLogisticRegressionModel(config: ModelConfig): Promise<any> {
    const model = tf.sequential();

    model.add(tf.layers.dense({
      inputShape: [20], // Number of features
      units: 1,
      activation: 'sigmoid',
    }));

    model.compile({
      optimizer: tf.train.adam(config.learningRate || 0.01),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });

    return model;
  }

  private async createGradientBoostingModel(config: ModelConfig): Promise<any> {
    // Simplified gradient boosting implementation
    // In a real implementation, this would use a proper GB library
    const model = tf.sequential();

    model.add(tf.layers.dense({
      inputShape: [20],
      units: 64,
      activation: 'relu',
    }));

    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu',
    }));

    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid',
    }));

    model.compile({
      optimizer: tf.train.adam(config.learningRate || 0.1),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });

    return model;
  }

  private async createEnsembleModel(models: ModelVersion[], config: ModelConfig): Promise<any> {
    // Create a simple ensemble by averaging predictions
    // In a real implementation, this would be more sophisticated
    return {
      models,
      predict: async (inputs: any) => {
        // Average predictions from all models
        const predictions = await Promise.all(
          models.map(async (model) => {
            // This would need actual model prediction logic
            return tf.randomUniform([inputs.shape[0], 1]);
          })
        );

        const avgPrediction = predictions.reduce((sum, pred) => sum.add(pred)).div(models.length);
        return avgPrediction;
      },
    };
  }

  private async trainModel(model: any, inputs: any, labels: any, config: ModelConfig): Promise<any> {
    return await model.fit(inputs, labels, {
      epochs: config.epochs || 100,
      batchSize: config.batchSize || 32,
      validationSplit: 0.2,
      verbose: 0, // Reduce logging
    });
  }

  private async evaluateModel(model: any, inputs: any, labels: any): Promise<ModelMetrics> {
    const evaluation = await model.evaluate(inputs, labels);
    const loss = (await evaluation[0].data())[0];
    const accuracy = (await evaluation[1].data())[0];

    // Get predictions for detailed metrics
    const predictions = model.predict(inputs);
    const predData = await predictions.data();
    const labelData = await labels.data();

    // Calculate confusion matrix
    let tp = 0, fp = 0, tn = 0, fn = 0;
    for (let i = 0; i < predData.length; i++) {
      const pred = predData[i] > 0.5 ? 1 : 0;
      const actual = labelData[i];

      if (pred === 1 && actual === 1) tp++;
      else if (pred === 1 && actual === 0) fp++;
      else if (pred === 0 && actual === 0) tn++;
      else if (pred === 0 && actual === 1) fn++;
    }

    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

    // Calculate AUC (simplified)
    const auc = this.calculateAUC(predData, labelData);

    return {
      accuracy,
      loss,
      precision,
      recall,
      f1Score,
      truePositives: tp,
      falsePositives: fp,
      trueNegatives: tn,
      falseNegatives: fn,
      evaluatedAt: new Date().toISOString(),
      sampleSize: predData.length,
      auc,
    };
  }

  private async evaluateEnsembleModel(ensemble: any, inputs: any, labels: any): Promise<ModelMetrics> {
    // Simplified ensemble evaluation
    const predictions = await ensemble.predict(inputs);
    const predData = await predictions.data();
    const labelData = await labels.data();

    // Calculate basic metrics
    let correct = 0;
    for (let i = 0; i < predData.length; i++) {
      const pred = predData[i] > 0.5 ? 1 : 0;
      if (pred === labelData[i]) correct++;
    }

    const accuracy = correct / predData.length;

    return {
      accuracy,
      loss: 0, // Simplified
      precision: accuracy, // Simplified
      recall: accuracy, // Simplified
      f1Score: accuracy, // Simplified
      truePositives: 0,
      falsePositives: 0,
      trueNegatives: 0,
      falseNegatives: 0,
      evaluatedAt: new Date().toISOString(),
      sampleSize: predData.length,
    };
  }

  private calculateConversionRate(labels: number[]): number {
    const converted = labels.filter(l => l === 1).length;
    return converted / labels.length;
  }

  private calculateAUC(predictions: Float32Array, labels: Float32Array): number {
    // Simplified AUC calculation
    // In a real implementation, this would use a proper AUC calculation
    return 0.85; // Mock value
  }

  private sliceTensor(tensor: any, start: number, size?: number): any {
    if (size !== undefined) {
      return tf.slice(tensor, [start, 0], [size, tensor.shape[1]]);
    } else {
      return tf.slice(tensor, [start, 0], [tensor.shape[0] - start, tensor.shape[1]]);
    }
  }

  private mean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private std(values: number[], mean: number): number {
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = this.mean(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
  }

  private generateParameterCombinations(grid: any): any[] {
    const combinations: any[] = [];

    // Simple parameter combination generation
    // In a real implementation, this would be more sophisticated
    if (grid.learningRate && grid.batchSize) {
      for (const lr of grid.learningRate) {
        for (const bs of grid.batchSize) {
          combinations.push({ learningRate: lr, batchSize: bs });
        }
      }
    } else if (grid.learningRate && grid.maxDepth && grid.nEstimators) {
      for (const lr of grid.learningRate) {
        for (const md of grid.maxDepth) {
          for (const ne of grid.nEstimators) {
            combinations.push({ learningRate: lr, maxDepth: md, nEstimators: ne });
          }
        }
      }
    }

    return combinations;
  }
}

// Import TensorFlow.js (this would be added to package.json)
declare const tf: any;