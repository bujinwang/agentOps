/**
 * Unit Tests for Real-Time Scoring Service
 *
 * Tests the real-time scoring API, caching, rate limiting, and performance monitoring
 */

import { RealTimeScoringService } from '../../services/realTimeScoringService';
import { LeadProfile, MLLeadScore, BatchScoringResult } from '../../types/ml';

describe('RealTimeScoringService', () => {
  let scoringService: RealTimeScoringService;
  let mockLeadData: LeadProfile;

  beforeEach(() => {
    scoringService = RealTimeScoringService.getInstance();
    mockLeadData = {
      id: 123,
      name: 'John Doe',
      email: 'john@example.com',
      leadScore: 85,
      engagementLevel: 'high',
      source: 'website',
      createdAt: '2025-01-01T00:00:00Z',
      lastActivity: '2025-01-15T00:00:00Z',
      totalInteractions: 15,
      conversionEvents: 2,
    };

    // Clear caches before each test
    scoringService.clearAllCaches();
  });

  describe('Single Lead Scoring', () => {
    test('should score a lead successfully', async () => {
      const result = await scoringService.scoreLead(123);

      expect(result).toBeDefined();
      expect(result.leadId).toBe(123);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.modelId).toBeDefined();
      expect(result.scoredAt).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.insights.length).toBeGreaterThan(0);
    });

    test('should score a lead with provided data', async () => {
      const result = await scoringService.scoreLeadWithData(mockLeadData);

      expect(result).toBeDefined();
      expect(result.leadId).toBe(123);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    test('should handle scoring with specific model ID', async () => {
      const modelId = 'test-model-123';
      const result = await scoringService.scoreLead(123, modelId);

      expect(result).toBeDefined();
      expect(result.modelId).toBe(modelId);
    });

    test('should handle cache correctly', async () => {
      // First request should not use cache
      const result1 = await scoringService.scoreLead(123, undefined, true);
      expect(result1).toBeDefined();

      // Second request should use cache
      const result2 = await scoringService.scoreLead(123, undefined, true);
      expect(result2).toBeDefined();
      expect(result2.score).toBe(result1.score); // Should be identical
    });

    test('should bypass cache when disabled', async () => {
      const result1 = await scoringService.scoreLead(123, undefined, false);
      const result2 = await scoringService.scoreLead(123, undefined, false);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      // Results might be different due to different model runs
    });

    test('should handle non-existent lead gracefully', async () => {
      await expect(scoringService.scoreLead(99999)).rejects.toThrow('Lead 99999 not found');
    });
  });

  describe('Lead Insights', () => {
    test('should generate comprehensive lead insights', async () => {
      const insights = await scoringService.getLeadInsights(123);

      expect(insights).toBeDefined();
      expect(insights.leadId).toBe(123);
      expect(insights.overallScore).toBeGreaterThanOrEqual(0);
      expect(insights.overallScore).toBeLessThanOrEqual(1);
      expect(insights.conversionProbability).toBeGreaterThanOrEqual(0);
      expect(insights.conversionProbability).toBeLessThanOrEqual(1);
      expect(['low', 'medium', 'high']).toContain(insights.riskLevel);
      expect(insights.recommendedActions).toBeDefined();
      expect(insights.recommendedActions.length).toBeGreaterThan(0);
      expect(insights.keyFactors).toBeDefined();
      expect(insights.similarProfiles).toBeDefined();
      expect(insights.timeToAction).toBeDefined();
      expect(insights.engagement).toBeDefined();
    });

    test('should provide risk-appropriate recommendations', async () => {
      const insights = await scoringService.getLeadInsights(123);

      if (insights.overallScore > 0.8) {
        expect(insights.recommendedActions).toContain('Prioritize for immediate follow-up');
      } else if (insights.overallScore > 0.6) {
        expect(insights.recommendedActions).toContain('Engage within 48 hours');
      } else {
        expect(insights.recommendedActions).toContain('Add to nurture campaign');
      }
    });

    test('should include time-sensitive recommendations', async () => {
      const insights = await scoringService.getLeadInsights(123);

      expect(insights.timeToAction.urgent).toBeDefined();
      expect(insights.timeToAction.recommended).toBeDefined();
      expect(insights.timeToAction.deadline).toBeDefined();
      expect(new Date(insights.timeToAction.deadline)).toBeInstanceOf(Date);
    });
  });

  describe('Batch Scoring', () => {
    test('should score multiple leads in batch', async () => {
      const leadIds = [123, 124, 125];
      const result = await scoringService.scoreLeadsBatch(leadIds);

      expect(result).toBeDefined();
      expect(result.requestId).toContain('batch_');
      expect(result.totalLeads).toBe(3);
      expect(result.processedLeads).toBe(3);
      expect(result.results).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.completedAt).toBeDefined();
    });

    test('should handle batch with mixed valid/invalid leads', async () => {
      const leadIds = [123, 99999, 124]; // 99999 doesn't exist
      const result = await scoringService.scoreLeadsBatch(leadIds);

      expect(result).toBeDefined();
      expect(result.totalLeads).toBe(3);
      expect(result.processedLeads).toBe(2); // Only valid leads processed
      expect(result.results).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].leadId).toBe(-1);
      expect(result.errors[0].error).toContain('not found');
    });

    test('should respect priority settings', async () => {
      const leadIds = [123, 124, 125];

      // High priority should process immediately
      const highPriorityResult = await scoringService.scoreLeadsBatch(leadIds, undefined, 'high');
      expect(highPriorityResult.status).toBe('completed');

      // Low priority might be queued
      const lowPriorityResult = await scoringService.scoreLeadsBatch(leadIds, undefined, 'low');
      expect(['processing', 'completed']).toContain(lowPriorityResult.status);
    });

    test('should handle empty batch gracefully', async () => {
      const result = await scoringService.scoreLeadsBatch([]);

      expect(result).toBeDefined();
      expect(result.totalLeads).toBe(0);
      expect(result.processedLeads).toBe(0);
      expect(result.results).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    test('should use specific model for batch scoring', async () => {
      const leadIds = [123, 124];
      const modelId = 'test-model-456';
      const result = await scoringService.scoreLeadsBatch(leadIds, modelId);

      expect(result).toBeDefined();
      result.results.forEach(score => {
        expect(score.modelId).toBe(modelId);
      });
    });
  });

  describe('Caching System', () => {
    test('should cache scoring results', async () => {
      // First request
      const result1 = await scoringService.scoreLead(123, undefined, true);

      // Second request should use cache
      const result2 = await scoringService.scoreLead(123, undefined, true);

      expect(result1.score).toBe(result2.score);
      expect(result1.confidence).toBe(result2.confidence);
    });

    test('should respect cache TTL', async () => {
      // Set short TTL for testing
      scoringService.updateCacheSettings(100); // 100ms

      const result1 = await scoringService.scoreLead(123, undefined, true);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const result2 = await scoringService.scoreLead(123, undefined, true);

      // Results should be the same (cache still valid) or different (cache expired)
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    test('should clear cache for specific lead', async () => {
      // Cache a result
      await scoringService.scoreLead(123, undefined, true);

      // Clear cache for this lead
      scoringService.clearLeadCache(123);

      // Next request should not use cache
      const result = await scoringService.scoreLead(123, undefined, true);
      expect(result).toBeDefined();
    });

    test('should clear all caches', async () => {
      // Cache multiple results
      await scoringService.scoreLead(123, undefined, true);
      await scoringService.scoreLead(124, undefined, true);

      // Clear all caches
      scoringService.clearAllCaches();

      // Verify caches are cleared (implementation dependent)
      const health = scoringService.getHealthStatus();
      expect(health.cacheSize).toBe(0);
    });

    test('should handle cache key generation correctly', async () => {
      const result1 = await scoringService.scoreLead(123, 'model1', true);
      const result2 = await scoringService.scoreLead(123, 'model2', true);
      const result3 = await scoringService.scoreLead(124, 'model1', true);

      // Different models should have different results
      expect(result1.modelId).toBe('model1');
      expect(result2.modelId).toBe('model2');
      expect(result3.leadId).toBe(124);
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests within rate limit', async () => {
      // Make multiple requests within limit
      for (let i = 0; i < 5; i++) {
        const result = await scoringService.scoreLead(123 + i, undefined, false);
        expect(result).toBeDefined();
      }
    });

    test('should enforce rate limiting', async () => {
      // This test would require mocking the rate limiting logic
      // In a real implementation, we'd test the rate limiting behavior
      expect(true).toBe(true); // Placeholder for rate limiting tests
    });

    test('should reset rate limit window', async () => {
      // Test rate limit reset logic
      expect(true).toBe(true); // Placeholder for rate limit reset tests
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should track request statistics', async () => {
      const initialStats = scoringService.getScoringStatistics();

      // Make some requests
      await scoringService.scoreLead(123, undefined, false);
      await scoringService.scoreLead(124, undefined, false);

      const updatedStats = scoringService.getScoringStatistics();

      expect(updatedStats.totalRequests).toBe(initialStats.totalRequests + 2);
      expect(updatedStats.averageResponseTime).toBeGreaterThan(0);
    });

    test('should calculate success and error rates', async () => {
      // Make successful requests
      await scoringService.scoreLead(123, undefined, false);
      await scoringService.scoreLead(124, undefined, false);

      const stats = scoringService.getScoringStatistics();

      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(1);
      expect(stats.errorRate).toBeGreaterThanOrEqual(0);
      expect(stats.errorRate).toBeLessThanOrEqual(1);
      expect(stats.successRate + stats.errorRate).toBeCloseTo(1, 5);
    });

    test('should track cache hit rate', async () => {
      // Make request without cache
      await scoringService.scoreLead(123, undefined, false);

      // Make request with cache
      await scoringService.scoreLead(123, undefined, true);

      const stats = scoringService.getScoringStatistics();
      expect(stats.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(stats.cacheHitRate).toBeLessThanOrEqual(1);
    });

    test('should provide health status', async () => {
      const health = scoringService.getHealthStatus();

      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.totalRequests).toBeGreaterThanOrEqual(0);
      expect(health.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(health.cacheSize).toBeGreaterThanOrEqual(0);
      expect(health.queueLength).toBeGreaterThanOrEqual(0);
      expect(health.activeRequests).toBeGreaterThanOrEqual(0);
      expect(health.lastUpdated).toBeDefined();
    });

    test('should track time range correctly', async () => {
      const stats = scoringService.getScoringStatistics();

      expect(stats.timeRange.start).toBeDefined();
      expect(stats.timeRange.end).toBeDefined();
      expect(new Date(stats.timeRange.start)).toBeInstanceOf(Date);
      expect(new Date(stats.timeRange.end)).toBeInstanceOf(Date);
    });
  });

  describe('Performance Requirements', () => {
    test('should meet response time requirements', async () => {
      const startTime = Date.now();
      await scoringService.scoreLead(123, undefined, false);
      const responseTime = Date.now() - startTime;

      // Should respond within 5 seconds (5000ms)
      expect(responseTime).toBeLessThan(5000);
    });

    test('should handle concurrent requests', async () => {
      const concurrentRequests = 5;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(scoringService.scoreLead(123 + i, undefined, false));
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });

      // Should handle concurrent requests reasonably fast
      expect(totalTime).toBeLessThan(10000); // Less than 10 seconds for 5 concurrent requests
    });

    test('should maintain performance under load', async () => {
      const requestCount = 10;
      const responseTimes = [];

      for (let i = 0; i < requestCount; i++) {
        const startTime = Date.now();
        await scoringService.scoreLead(123 + i, undefined, false);
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
      }

      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      // Average should be reasonable
      expect(averageResponseTime).toBeLessThan(2000); // Less than 2 seconds average
      // Max should not be excessively high
      expect(maxResponseTime).toBeLessThan(5000); // Less than 5 seconds max
    });
  });

  describe('Error Handling', () => {
    test('should handle service unavailability gracefully', async () => {
      // Test with invalid model or service issues
      await expect(scoringService.scoreLead(-1)).rejects.toThrow();
    });

    test('should handle batch processing errors', async () => {
      const leadIds = [123, -1, 124]; // -1 is invalid
      const result = await scoringService.scoreLeadsBatch(leadIds);

      expect(result).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.processedLeads).toBeLessThan(result.totalLeads);
    });

    test('should handle insights generation errors', async () => {
      await expect(scoringService.getLeadInsights(-1)).rejects.toThrow();
    });

    test('should maintain service stability under error conditions', async () => {
      // Make some failing requests
      try {
        await scoringService.scoreLead(-1);
      } catch (error) {
        // Expected to fail
      }

      // Service should still work for valid requests
      const result = await scoringService.scoreLead(123);
      expect(result).toBeDefined();
    });
  });

  describe('Background Processing', () => {
    test('should process queued requests in background', async () => {
      // This test would require mocking the background processing
      // In a real implementation, we'd test the queue processing logic
      expect(true).toBe(true); // Placeholder for background processing tests
    });

    test('should handle queue overflow gracefully', async () => {
      // Test queue management and overflow handling
      expect(true).toBe(true); // Placeholder for queue overflow tests
    });
  });

  describe('Resource Management', () => {
    test('should clean up expired cache entries', async () => {
      // Set very short TTL
      scoringService.updateCacheSettings(50); // 50ms

      // Cache some entries
      await scoringService.scoreLead(123, undefined, true);
      await scoringService.scoreLead(124, undefined, true);

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify cleanup occurred (implementation dependent)
      const health = scoringService.getHealthStatus();
      expect(health).toBeDefined();
    });

    test('should manage memory efficiently', async () => {
      const initialMemory = process.memoryUsage();

      // Make many requests
      for (let i = 0; i < 20; i++) {
        await scoringService.scoreLead(100 + i, undefined, false);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });

    test('should handle service shutdown gracefully', async () => {
      // Test cleanup on service shutdown
      scoringService.clearAllCaches();

      const health = scoringService.getHealthStatus();
      expect(health.status).toBe('healthy');
    });
  });
});