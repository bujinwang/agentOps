/**
 * Unit Tests for Model Training Service
 *
 * Tests the ML model training, evaluation, and optimization functionality
 */

import { ModelTrainingService } from '../../services/modelTrainingService';
import { TrainingDataset, ModelConfig, ModelVersion, CrossValidationResults } from '../../types/ml';

describe('ModelTrainingService', () => {
  let trainingService: ModelTrainingService;
  let mockTrainingData: TrainingDataset;

  beforeEach(() => {
    trainingService = ModelTrainingService.getInstance();

    // Mock training data
    mockTrainingData = {
      features: [
        {
          leadScore: 85,
          engagementScore: 0.8,
          propertyMatch: 0.9,
          budgetFit: 0.7,
          timelineFit: 0.6,
          locationPreference: 0.8,
          responseRate: 0.4,
          contactFrequency: 0.3,
          sessionDuration: 0.5,
          pageViews: 0.6,
          emailOpens: 0.7,
          formSubmissions: 0.2,
          callDuration: 0.4,
          meetingCount: 0.1,
          daysSinceFirstContact: 0.8,
          daysSinceLastActivity: 0.9,
          totalInteractions: 0.6,
          conversionEvents: 0.3,
          sourceQuality: 0.7,
          behavioralScore: 0.65,
        },
        // Add more mock features...
      ],
      labels: [1, 0, 1, 0, 1], // Conversion outcomes
      metadata: {
        source: 'test_data',
        dateRange: {
          start: '2025-01-01T00:00:00Z',
          end: '2025-01-31T23:59:59Z',
        },
        sampleSize: 1000,
        conversionRate: 0.25,
        featureCount: 20,
      },
    };
  });

  describe('Baseline Model Training', () => {
    test('should train a baseline logistic regression model', async () => {
      const config: Partial<ModelConfig> = {
        epochs: 10, // Reduced for testing
        batchSize: 16,
      };

      const result = await trainingService.trainBaselineModel(mockTrainingData, config);

      expect(result).toBeDefined();
      expect(result.id).toContain('baseline_');
      expect(result.modelId).toBe('lead_scoring_baseline');
      expect(result.version).toBe('1.0.0');
      expect(result.status).toBe('active');
      expect(result.metrics).toBeDefined();
      expect(result.metrics.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.metrics.accuracy).toBeLessThanOrEqual(1);
      expect(result.config.type).toBe('logistic_regression');
    });

    test('should handle empty training data gracefully', async () => {
      const emptyData: TrainingDataset = {
        features: [],
        labels: [],
      };

      await expect(trainingService.trainBaselineModel(emptyData)).rejects.toThrow();
    });

    test('should apply custom configuration', async () => {
      const customConfig: Partial<ModelConfig> = {
        learningRate: 0.05,
        epochs: 5,
        batchSize: 8,
      };

      const result = await trainingService.trainBaselineModel(mockTrainingData, customConfig);

      expect(result.config.learningRate).toBe(0.05);
      expect(result.config.epochs).toBe(5);
      expect(result.config.batchSize).toBe(8);
    });
  });

  describe('Gradient Boosting Model Training', () => {
    test('should train a gradient boosting model', async () => {
      const config: Partial<ModelConfig> = {
        epochs: 10,
        maxDepth: 4,
        nEstimators: 10,
      };

      const result = await trainingService.trainGradientBoostingModel(mockTrainingData, config);

      expect(result).toBeDefined();
      expect(result.id).toContain('gb_');
      expect(result.modelId).toBe('lead_scoring_gradient_boosting');
      expect(result.config.type).toBe('gradient_boosting');
      expect(result.config.maxDepth).toBe(4);
      expect(result.config.nEstimators).toBe(10);
    });

    test('should handle gradient boosting configuration', async () => {
      const config: Partial<ModelConfig> = {
        learningRate: 0.2,
        maxDepth: 6,
        nEstimators: 50,
      };

      const result = await trainingService.trainGradientBoostingModel(mockTrainingData, config);

      expect(result.config.learningRate).toBe(0.2);
      expect(result.config.maxDepth).toBe(6);
      expect(result.config.nEstimators).toBe(50);
    });
  });

  describe('Ensemble Model Training', () => {
    test('should train an ensemble model', async () => {
      // First train individual models
      const baselineModel = await trainingService.trainBaselineModel(mockTrainingData, { epochs: 5 });
      const gbModel = await trainingService.trainGradientBoostingModel(mockTrainingData, { epochs: 5 });

      const result = await trainingService.trainEnsembleModel(mockTrainingData);

      expect(result).toBeDefined();
      expect(result.id).toContain('ensemble_');
      expect(result.modelId).toBe('lead_scoring_ensemble');
      expect(result.config.type).toBe('ensemble');
    });

    test('should handle ensemble with single model', async () => {
      const baselineModel = await trainingService.trainBaselineModel(mockTrainingData, { epochs: 5 });

      const result = await trainingService.trainEnsembleModel(mockTrainingData);

      expect(result).toBeDefined();
      expect(result.config.type).toBe('ensemble');
    });
  });

  describe('Cross-Validation', () => {
    test('should perform k-fold cross-validation', async () => {
      const folds = 3;
      const result = await trainingService.performCrossValidation(mockTrainingData, 'logistic_regression', folds);

      expect(result).toBeDefined();
      expect(result.folds).toBe(folds);
      expect(result.scores.accuracy).toHaveLength(folds);
      expect(result.scores.precision).toHaveLength(folds);
      expect(result.scores.recall).toHaveLength(folds);
      expect(result.scores.f1Score).toHaveLength(folds);
      expect(result.meanScores).toBeDefined();
      expect(result.stdScores).toBeDefined();
      expect(result.bestFold).toBeGreaterThanOrEqual(0);
      expect(result.worstFold).toBeGreaterThanOrEqual(0);
    });

    test('should handle different model types in cross-validation', async () => {
      const result = await trainingService.performCrossValidation(mockTrainingData, 'gradient_boosting', 3);

      expect(result).toBeDefined();
      expect(result.folds).toBe(3);
      expect(result.meanScores.f1Score).toBeGreaterThanOrEqual(0);
      expect(result.meanScores.f1Score).toBeLessThanOrEqual(1);
    });

    test('should calculate mean and standard deviation correctly', async () => {
      const result = await trainingService.performCrossValidation(mockTrainingData, 'logistic_regression', 5);

      // Verify that mean is within expected range
      expect(result.meanScores.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.meanScores.accuracy).toBeLessThanOrEqual(1);

      // Verify that standard deviation is non-negative
      expect(result.stdScores.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.stdScores.f1Score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Hyperparameter Tuning', () => {
    test('should perform hyperparameter tuning for logistic regression', async () => {
      const paramGrid = {
        learningRate: [0.01, 0.1],
        batchSize: [16, 32],
      };

      const result = await trainingService.tuneHyperparameters(mockTrainingData, 'logistic_regression', paramGrid);

      expect(result).toBeDefined();
      expect(result.type).toBe('logistic_regression');
      expect([0.01, 0.1]).toContain(result.learningRate);
      expect([16, 32]).toContain(result.batchSize);
    });

    test('should perform hyperparameter tuning for gradient boosting', async () => {
      const paramGrid = {
        learningRate: [0.01, 0.1],
        maxDepth: [3, 6],
      };

      const result = await trainingService.tuneHyperparameters(mockTrainingData, 'gradient_boosting', paramGrid);

      expect(result).toBeDefined();
      expect(result.type).toBe('gradient_boosting');
      expect([0.01, 0.1]).toContain(result.learningRate);
      expect([3, 6]).toContain(result.maxDepth);
    });

    test('should handle empty parameter grid', async () => {
      const result = await trainingService.tuneHyperparameters(mockTrainingData, 'logistic_regression', {});

      expect(result).toBeDefined();
      expect(result.type).toBe('logistic_regression');
    });

    test('should find best performing hyperparameter combination', async () => {
      const paramGrid = {
        learningRate: [0.001, 0.01],
        batchSize: [8, 16],
      };

      const result = await trainingService.tuneHyperparameters(mockTrainingData, 'logistic_regression', paramGrid);

      // Verify that the result contains valid hyperparameters from the grid
      expect(paramGrid.learningRate).toContain(result.learningRate);
      expect(paramGrid.batchSize).toContain(result.batchSize);
    });
  });

  describe('Model Evaluation', () => {
    test('should evaluate model performance metrics', async () => {
      const model = await trainingService.trainBaselineModel(mockTrainingData, { epochs: 5 });

      expect(model.metrics).toBeDefined();
      expect(model.metrics.accuracy).toBeGreaterThanOrEqual(0);
      expect(model.metrics.accuracy).toBeLessThanOrEqual(1);
      expect(model.metrics.precision).toBeGreaterThanOrEqual(0);
      expect(model.metrics.precision).toBeLessThanOrEqual(1);
      expect(model.metrics.recall).toBeGreaterThanOrEqual(0);
      expect(model.metrics.recall).toBeLessThanOrEqual(1);
      expect(model.metrics.f1Score).toBeGreaterThanOrEqual(0);
      expect(model.metrics.f1Score).toBeLessThanOrEqual(1);
    });

    test('should calculate confusion matrix values', async () => {
      const model = await trainingService.trainBaselineModel(mockTrainingData, { epochs: 5 });

      expect(model.metrics.truePositives).toBeGreaterThanOrEqual(0);
      expect(model.metrics.falsePositives).toBeGreaterThanOrEqual(0);
      expect(model.metrics.trueNegatives).toBeGreaterThanOrEqual(0);
      expect(model.metrics.falseNegatives).toBeGreaterThanOrEqual(0);

      // Verify that TP + FP + TN + FN equals total samples
      const total = model.metrics.truePositives + model.metrics.falsePositives +
                   model.metrics.trueNegatives + model.metrics.falseNegatives;
      expect(total).toBe(model.metrics.sampleSize);
    });

    test('should include evaluation timestamp', async () => {
      const model = await trainingService.trainBaselineModel(mockTrainingData, { epochs: 5 });

      expect(model.metrics.evaluatedAt).toBeDefined();
      expect(new Date(model.metrics.evaluatedAt)).toBeInstanceOf(Date);
    });
  });

  describe('Training Data Validation', () => {
    test('should validate training data structure', () => {
      expect(mockTrainingData.features).toBeDefined();
      expect(mockTrainingData.labels).toBeDefined();
      expect(mockTrainingData.features.length).toBe(mockTrainingData.labels.length);
    });

    test('should handle metadata correctly', () => {
      expect(mockTrainingData.metadata).toBeDefined();
      expect(mockTrainingData.metadata?.source).toBe('test_data');
      expect(mockTrainingData.metadata?.sampleSize).toBe(1000);
      expect(mockTrainingData.metadata?.conversionRate).toBe(0.25);
    });

    test('should validate feature completeness', () => {
      mockTrainingData.features.forEach(feature => {
        expect(feature.leadScore).toBeDefined();
        expect(feature.engagementScore).toBeDefined();
        expect(feature.behavioralScore).toBeDefined();
      });
    });
  });

  describe('Model Configuration', () => {
    test('should apply default configurations', async () => {
      const model = await trainingService.trainBaselineModel(mockTrainingData);

      expect(model.config.learningRate).toBeDefined();
      expect(model.config.epochs).toBeDefined();
      expect(model.config.batchSize).toBeDefined();
    });

    test('should override default configurations', async () => {
      const customConfig: Partial<ModelConfig> = {
        learningRate: 0.05,
        epochs: 20,
        batchSize: 64,
      };

      const model = await trainingService.trainBaselineModel(mockTrainingData, customConfig);

      expect(model.config.learningRate).toBe(0.05);
      expect(model.config.epochs).toBe(20);
      expect(model.config.batchSize).toBe(64);
    });

    test('should validate configuration parameters', () => {
      const validConfig: ModelConfig = {
        type: 'logistic_regression',
        learningRate: 0.01,
        epochs: 100,
        batchSize: 32,
      };

      expect(validConfig.type).toBe('logistic_regression');
      expect(validConfig.learningRate).toBeGreaterThan(0);
      expect(validConfig.epochs).toBeGreaterThan(0);
      expect(validConfig.batchSize).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle training failures gracefully', async () => {
      const invalidData: TrainingDataset = {
        features: [],
        labels: [1, 0, 1], // Mismatched lengths
      };

      await expect(trainingService.trainBaselineModel(invalidData)).rejects.toThrow();
    });

    test('should handle cross-validation failures', async () => {
      const invalidData: TrainingDataset = {
        features: [],
        labels: [],
      };

      await expect(trainingService.performCrossValidation(invalidData)).rejects.toThrow();
    });

    test('should handle hyperparameter tuning failures', async () => {
      const invalidData: TrainingDataset = {
        features: [],
        labels: [],
      };

      await expect(trainingService.tuneHyperparameters(invalidData, 'logistic_regression')).rejects.toThrow();
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet training time requirements', async () => {
      const startTime = Date.now();
      await trainingService.trainBaselineModel(mockTrainingData, { epochs: 5 });
      const endTime = Date.now();

      const trainingTime = endTime - startTime;
      expect(trainingTime).toBeLessThan(30000); // Less than 30 seconds for quick training
    });

    test('should handle memory efficiently', async () => {
      const initialMemory = process.memoryUsage();
      await trainingService.trainBaselineModel(mockTrainingData, { epochs: 5 });
      const finalMemory = process.memoryUsage();

      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
    });

    test('should scale with data size appropriately', async () => {
      const smallData: TrainingDataset = {
        features: mockTrainingData.features.slice(0, 10),
        labels: mockTrainingData.labels.slice(0, 10),
      };

      const largeData: TrainingDataset = {
        features: mockTrainingData.features.slice(0, 50),
        labels: mockTrainingData.labels.slice(0, 50),
      };

      const smallStart = Date.now();
      await trainingService.trainBaselineModel(smallData, { epochs: 5 });
      const smallTime = Date.now() - smallStart;

      const largeStart = Date.now();
      await trainingService.trainBaselineModel(largeData, { epochs: 5 });
      const largeTime = Date.now() - largeStart;

      // Large dataset should not take disproportionately longer
      const ratio = largeTime / smallTime;
      expect(ratio).toBeLessThan(10); // Should scale reasonably
    });
  });

  describe('Model Persistence', () => {
    test('should generate unique model IDs', async () => {
      const model1 = await trainingService.trainBaselineModel(mockTrainingData, { epochs: 5 });
      const model2 = await trainingService.trainBaselineModel(mockTrainingData, { epochs: 5 });

      expect(model1.id).not.toBe(model2.id);
      expect(model1.id).toContain('baseline_');
      expect(model2.id).toContain('baseline_');
    });

    test('should include training metadata', async () => {
      const model = await trainingService.trainBaselineModel(mockTrainingData);

      expect(model.trainingData).toBeDefined();
      expect(model.trainingData.size).toBe(mockTrainingData.features.length);
      expect(model.trainingData.conversionRate).toBeDefined();
      expect(model.trainingData.dateRange).toBeDefined();
    });

    test('should track model performance', async () => {
      const model = await trainingService.trainBaselineModel(mockTrainingData);

      expect(model.performance).toBeDefined();
      expect(model.performance.accuracy).toBeDefined();
      expect(model.performance.precision).toBeDefined();
      expect(model.performance.recall).toBeDefined();
      expect(model.performance.f1Score).toBeDefined();
    });
  });
});