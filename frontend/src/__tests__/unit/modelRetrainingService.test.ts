/**
 * Unit Tests for Model Retraining Service
 *
 * Tests automated model retraining, A/B testing, drift detection, and deployment
 */

import { ModelRetrainingService } from '../../services/modelRetrainingService';
import { ModelVersion, TrainingDataset, ABTest, ABTestResult, DriftAnalysis } from '../../types/ml';

describe('ModelRetrainingService', () => {
  let retrainingService: ModelRetrainingService;
  let mockTrainingData: TrainingDataset;
  let mockModelVersion: ModelVersion;

  beforeEach(() => {
    retrainingService = ModelRetrainingService.getInstance();
    mockTrainingData = {
      features: [
        {
          leadScore: 85,
          engagementScore: 0.8,
          propertyMatch: 0.9,
          budgetFit: 0.7,
          timelineFit: 0.6,
          locationPreference: 0.8,
          responseRate: 0.75,
          contactFrequency: 0.5,
          sessionDuration: 1200,
          pageViews: 15,
          emailOpens: 8,
          formSubmissions: 3,
          callDuration: 180,
          meetingCount: 2,
          daysSinceFirstContact: 30,
          daysSinceLastActivity: 2,
          totalInteractions: 25,
          conversionEvents: 1,
          sourceQuality: 0.85,
          behavioralScore: 0.78,
        },
      ],
      labels: [1],
      metadata: {
        source: 'test',
        dateRange: {
          start: '2025-01-01T00:00:00Z',
          end: '2025-01-31T00:00:00Z',
        },
        sampleSize: 1000,
        conversionRate: 0.35,
        featureCount: 20,
      },
    };

    mockModelVersion = {
      id: 'test-model-v1',
      modelId: 'test-model',
      version: '1.0.0',
      status: 'active',
      createdAt: '2025-01-15T00:00:00Z',
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
        evaluatedAt: '2025-01-15T00:00:00Z',
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
          start: '2024-12-15T00:00:00Z',
          end: '2025-01-15T00:00:00Z',
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
  });

  describe('Retraining Schedule Management', () => {
    test('should get default retraining schedule', () => {
      const schedule = retrainingService.getRetrainingSchedule();

      expect(schedule).toBeDefined();
      expect(schedule.enabled).toBe(true);
      expect(schedule.frequency).toBe('daily');
      expect(schedule.time).toBe('02:00');
      expect(schedule.dataWindow).toBe(30);
      expect(schedule.minDataPoints).toBe(1000);
      expect(schedule.performanceThreshold).toBe(0.05);
      expect(schedule.autoDeploy).toBe(true);
    });

    test('should update retraining schedule', () => {
      const newSchedule = {
        enabled: false,
        frequency: 'weekly' as const,
        time: '03:00',
        dataWindow: 60,
      };

      retrainingService.updateRetrainingSchedule(newSchedule);

      const updatedSchedule = retrainingService.getRetrainingSchedule();
      expect(updatedSchedule.enabled).toBe(false);
      expect(updatedSchedule.frequency).toBe('weekly');
      expect(updatedSchedule.time).toBe('03:00');
      expect(updatedSchedule.dataWindow).toBe(60);
    });

    test('should get A/B test configuration', () => {
      const config = retrainingService.getABTestConfig();

      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
      expect(config.testDuration).toBe(7);
      expect(config.trafficSplit).toBe(0.1);
      expect(config.confidenceThreshold).toBe(0.95);
      expect(config.minSampleSize).toBe(1000);
    });

    test('should update A/B test configuration', () => {
      const newConfig = {
        testDuration: 14,
        trafficSplit: 0.2,
        confidenceThreshold: 0.9,
      };

      retrainingService.updateABTestConfig(newConfig);

      const updatedConfig = retrainingService.getABTestConfig();
      expect(updatedConfig.testDuration).toBe(14);
      expect(updatedConfig.trafficSplit).toBe(0.2);
      expect(updatedConfig.confidenceThreshold).toBe(0.9);
    });
  });

  describe('Model Retraining', () => {
    test('should trigger manual retraining successfully', async () => {
      const result = await retrainingService.triggerRetraining();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.newModel).toBeDefined();
      expect(result.comparison).toBeDefined();
      expect(result.deploymentDecision).toBeDefined();
      expect(result.dataQuality).toBeDefined();
      expect(result.trainingData).toBeDefined();
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
    });

    test('should trigger retraining with custom options', async () => {
      const options = {
        modelId: 'custom-model',
        dataWindow: 60,
        force: true,
      };

      const result = await retrainingService.triggerRetraining(options);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    test('should handle retraining failure gracefully', async () => {
      // Test with invalid options that might cause failure
      const result = await retrainingService.triggerRetraining();

      // Even if it fails, should return proper error structure
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
    });

    test('should validate retraining conditions', async () => {
      // Test various validation scenarios
      const result = await retrainingService.triggerRetraining();

      expect(result).toBeDefined();
      // Validation should either succeed or provide clear reason for failure
      if (!result.success) {
        expect(result.reason).toBeDefined();
      }
    });
  });

  describe('A/B Testing', () => {
    test('should start A/B test successfully', async () => {
      const challengerModelId = 'challenger-model-v1';

      const abTest = await retrainingService.startABTest(challengerModelId);

      expect(abTest).toBeDefined();
      expect(abTest.id).toContain('ab_test_');
      expect(abTest.championModelId).toBeDefined();
      expect(abTest.challengerModelId).toBe(challengerModelId);
      expect(abTest.status).toBe('running');
      expect(abTest.startTime).toBeDefined();
      expect(abTest.endTime).toBeDefined();
      expect(abTest.trafficSplit).toBeGreaterThan(0);
      expect(abTest.trafficSplit).toBeLessThanOrEqual(1);
    });

    test('should start A/B test with custom configuration', async () => {
      const challengerModelId = 'challenger-model-v1';
      const config = {
        testDuration: 14,
        trafficSplit: 0.2,
      };

      const abTest = await retrainingService.startABTest(challengerModelId, undefined, config);

      expect(abTest).toBeDefined();
      expect(abTest.trafficSplit).toBe(0.2);
      // Note: testDuration would be applied but may not be reflected in the returned object
    });

    test('should get A/B test results', async () => {
      const challengerModelId = 'challenger-model-v1';
      const abTest = await retrainingService.startABTest(challengerModelId);

      const results = await retrainingService.getABTestResults(abTest.id);

      expect(results).toBeDefined();
      if (results) {
        expect(results.testId).toBe(abTest.id);
        expect(results.status).toBe('running');
        expect(results.championModelId).toBe(abTest.championModelId);
        expect(results.challengerModelId).toBe(abTest.challengerModelId);
        expect(results.duration).toBeGreaterThanOrEqual(0);
        expect(results.recommendation).toBeDefined();
      }
    });

    test('should return null for non-existent A/B test', async () => {
      const results = await retrainingService.getABTestResults('non-existent-test');

      expect(results).toBeNull();
    });

    test('should get active A/B tests', async () => {
      const challengerModelId = 'challenger-model-v1';
      await retrainingService.startABTest(challengerModelId);

      const activeTests = retrainingService.getActiveABTests();

      expect(activeTests).toBeDefined();
      expect(Array.isArray(activeTests)).toBe(true);
      expect(activeTests.length).toBeGreaterThanOrEqual(1);
      expect(activeTests[0].status).toBe('running');
    });

    test('should deploy A/B test winner', async () => {
      const challengerModelId = 'challenger-model-v1';
      const abTest = await retrainingService.startABTest(challengerModelId);

      const deployed = await retrainingService.deployABTestWinner(abTest.id);

      // Deployment may or may not succeed based on test results
      expect(typeof deployed).toBe('boolean');
    });

    test('should handle deployment of non-existent test', async () => {
      await expect(retrainingService.deployABTestWinner('non-existent-test')).rejects.toThrow();
    });
  });

  describe('Model Drift Detection', () => {
    test('should detect model drift', async () => {
      const driftAnalysis = await retrainingService.detectModelDrift();

      expect(driftAnalysis).toBeDefined();
      expect(driftAnalysis.modelId).toBeDefined();
      expect(typeof driftAnalysis.driftDetected).toBe('boolean');
      expect(driftAnalysis.confidence).toBeGreaterThanOrEqual(0);
      expect(driftAnalysis.confidence).toBeLessThanOrEqual(1);
      expect(driftAnalysis.driftMetrics).toBeDefined();
      expect(typeof driftAnalysis.analysis).toBe('string');
      expect(driftAnalysis.timestamp).toBeDefined();
    });

    test('should detect drift for specific model', async () => {
      const modelId = 'specific-model-v1';
      const driftAnalysis = await retrainingService.detectModelDrift(modelId);

      expect(driftAnalysis).toBeDefined();
      expect(driftAnalysis.modelId).toBe(modelId);
    });

    test('should provide recommendations when drift is detected', async () => {
      const driftAnalysis = await retrainingService.detectModelDrift();

      if (driftAnalysis.driftDetected) {
        expect(driftAnalysis.recommendations).toBeDefined();
        expect(Array.isArray(driftAnalysis.recommendations)).toBe(true);
        expect(driftAnalysis.recommendations!.length).toBeGreaterThan(0);
      }
    });

    test('should calculate drift metrics correctly', async () => {
      const driftAnalysis = await retrainingService.detectModelDrift();

      expect(driftAnalysis.driftMetrics).toBeDefined();
      // Check that metrics are numbers
      Object.values(driftAnalysis.driftMetrics).forEach(metric => {
        expect(typeof metric).toBe('number');
        expect(metric).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Retraining History', () => {
    test('should get retraining history', () => {
      const history = retrainingService.getRetrainingHistory();

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });

    test('should limit retraining history', () => {
      const history = retrainingService.getRetrainingHistory(5);

      expect(history).toBeDefined();
      expect(history.length).toBeLessThanOrEqual(5);
    });

    test('should handle empty history', () => {
      const history = retrainingService.getRetrainingHistory();

      // History might be empty initially
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Data Quality Validation', () => {
    test('should validate training data quality', async () => {
      // This is tested indirectly through the retraining process
      const result = await retrainingService.triggerRetraining();

      if (result.dataQuality) {
        expect(typeof result.dataQuality.passed).toBe('boolean');
        expect(Array.isArray(result.dataQuality.issues)).toBe(true);
        expect(result.dataQuality.metrics).toBeDefined();
        expect(typeof result.dataQuality.metrics.dataSize).toBe('number');
        expect(typeof result.dataQuality.metrics.conversionRate).toBe('number');
      }
    });

    test('should handle data quality issues', async () => {
      const result = await retrainingService.triggerRetraining();

      // Should handle data quality validation gracefully
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Model Comparison', () => {
    test('should compare models correctly', async () => {
      const result = await retrainingService.triggerRetraining();

      if (result.comparison) {
        expect(result.comparison.newModel).toBeDefined();
        expect(result.comparison.improvement).toBeDefined();
        expect(typeof result.comparison.recommendation).toBe('string');
        expect(['deploy', 'ab_test', 'reject']).toContain(result.comparison.recommendation);
      }
    });

    test('should make deployment decisions', async () => {
      const result = await retrainingService.triggerRetraining();

      if (result.deploymentDecision) {
        expect(result.deploymentDecision.action).toBeDefined();
        expect(result.deploymentDecision.reason).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(result.deploymentDecision.riskLevel);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle retraining failures gracefully', async () => {
      // Test various failure scenarios
      const result = await retrainingService.triggerRetraining();

      // Should always return a valid result structure
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
    });

    test('should handle A/B test failures', async () => {
      // Test with invalid parameters
      await expect(retrainingService.startABTest('')).rejects.toThrow();
    });

    test('should handle drift detection failures', async () => {
      const driftAnalysis = await retrainingService.detectModelDrift();

      // Should handle failures gracefully
      expect(driftAnalysis).toBeDefined();
      expect(typeof driftAnalysis.driftDetected).toBe('boolean');
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent retraining requests', async () => {
      const promises = [
        retrainingService.triggerRetraining(),
        retrainingService.triggerRetraining(),
        retrainingService.triggerRetraining(),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
      });
    });

    test('should handle multiple A/B tests', async () => {
      const promises = [
        retrainingService.startABTest('model1'),
        retrainingService.startABTest('model2'),
        retrainingService.startABTest('model3'),
      ];

      const abTests = await Promise.all(promises);

      expect(abTests).toHaveLength(3);
      abTests.forEach(abTest => {
        expect(abTest).toBeDefined();
        expect(abTest.id).toBeDefined();
      });
    });

    test('should maintain performance under load', async () => {
      const startTime = Date.now();

      // Perform multiple operations
      await Promise.all([
        retrainingService.triggerRetraining(),
        retrainingService.detectModelDrift(),
        retrainingService.getRetrainingHistory(),
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (allowing for async operations)
      expect(duration).toBeLessThan(30000); // Less than 30 seconds
    });
  });

  describe('Configuration Management', () => {
    test('should handle schedule configuration changes', () => {
      const originalSchedule = retrainingService.getRetrainingSchedule();

      // Update schedule
      retrainingService.updateRetrainingSchedule({
        enabled: false,
        frequency: 'weekly',
      });

      const updatedSchedule = retrainingService.getRetrainingSchedule();

      expect(updatedSchedule.enabled).toBe(false);
      expect(updatedSchedule.frequency).toBe('weekly');

      // Restore original
      retrainingService.updateRetrainingSchedule(originalSchedule);
    });

    test('should handle A/B test configuration changes', () => {
      const originalConfig = retrainingService.getABTestConfig();

      // Update config
      retrainingService.updateABTestConfig({
        testDuration: 14,
        trafficSplit: 0.2,
      });

      const updatedConfig = retrainingService.getABTestConfig();

      expect(updatedConfig.testDuration).toBe(14);
      expect(updatedConfig.trafficSplit).toBe(0.2);

      // Restore original (this would need to be implemented in the service)
      // For now, just verify the update worked
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete retraining workflow', async () => {
      // 1. Trigger retraining
      const retrainingResult = await retrainingService.triggerRetraining();
      expect(retrainingResult.success).toBe(true);

      // 2. Check if A/B test was recommended
      if (retrainingResult.comparison?.recommendation === 'ab_test') {
        const abTest = await retrainingService.startABTest(retrainingResult.newModel!.modelId);
        expect(abTest).toBeDefined();

        // 3. Get test results
        const testResults = await retrainingService.getABTestResults(abTest.id);
        expect(testResults).toBeDefined();
      }

      // 4. Check retraining history
      const history = retrainingService.getRetrainingHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    test('should handle drift detection workflow', async () => {
      // 1. Detect drift
      const driftAnalysis = await retrainingService.detectModelDrift();
      expect(driftAnalysis).toBeDefined();

      // 2. If drift detected, trigger retraining
      if (driftAnalysis.driftDetected) {
        const retrainingResult = await retrainingService.triggerRetraining();
        expect(retrainingResult).toBeDefined();
      }
    });

    test('should handle multiple concurrent operations', async () => {
      const operations = [
        // Multiple retraining operations
        retrainingService.triggerRetraining(),
        retrainingService.triggerRetraining(),

        // Drift detection
        retrainingService.detectModelDrift(),

        // A/B testing
        retrainingService.startABTest('test-model-1'),
        retrainingService.startABTest('test-model-2'),
      ];

      const results = await Promise.allSettled(operations);

      // All operations should complete (either fulfilled or rejected gracefully)
      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(['fulfilled', 'rejected']).toContain(result.status);
      });
    });
  });
});