const EnrichmentService = require('../../EnrichmentService');
const PropertyDataProvider = require('../../providers/PropertyDataProvider');
const SocialMediaProvider = require('../../providers/SocialMediaProvider');
const CreditReportingProvider = require('../../providers/CreditReportingProvider');
const CacheService = require('../../CacheService');

// Performance test utilities
const { performance } = require('perf_hooks');

describe('Enrichment Pipeline Performance Tests', () => {
  let enrichmentService;
  let mockPropertyProvider;
  let mockSocialProvider;
  let mockCreditProvider;
  let mockCacheService;

  const mockLead = {
    id: 123,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phoneNumber: '+1234567890',
    address: '123 Main St, Anytown, USA',
    enrichmentConsent: true,
    creditDataConsent: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock providers with realistic response times
    mockPropertyProvider = {
      doEnrich: jest.fn(),
      getHealthStatus: jest.fn().mockResolvedValue({ status: 'healthy' }),
    };

    mockSocialProvider = {
      doEnrich: jest.fn(),
      getHealthStatus: jest.fn().mockResolvedValue({ status: 'healthy' }),
    };

    mockCreditProvider = {
      doEnrich: jest.fn(),
      getHealthStatus: jest.fn().mockResolvedValue({ status: 'healthy' }),
    };

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      getStats: jest.fn().mockResolvedValue({ hits: 10, misses: 5 }),
    };

    // Mock constructors
    PropertyDataProvider.mockImplementation(() => mockPropertyProvider);
    SocialMediaProvider.mockImplementation(() => mockSocialProvider);
    CreditReportingProvider.mockImplementation(() => mockCreditProvider);
    CacheService.mockImplementation(() => mockCacheService);

    enrichmentService = new EnrichmentService();
  });

  describe('Single Lead Enrichment Performance', () => {
    it('should complete single lead enrichment within 2 seconds', async () => {
      // Setup fast API responses
      mockPropertyProvider.doEnrich.mockResolvedValue({
        propertyValue: 450000,
        confidence: 0.95,
      });

      mockSocialProvider.doEnrich.mockResolvedValue({
        professionalTitle: 'Engineer',
        confidence: 0.87,
      });

      mockCreditProvider.doEnrich.mockResolvedValue({
        creditScore: 750,
        confidence: 0.92,
      });

      const startTime = performance.now();

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['property', 'social', 'credit'],
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // 2 seconds
      expect(result.qualityScore).toBeGreaterThan(80);
    });

    it('should handle cached responses in under 100ms', async () => {
      const cachedResult = {
        enrichmentId: 'cached-123',
        qualityScore: 85,
        data: { property: { propertyValue: 400000 } },
      };

      mockCacheService.get.mockResolvedValue(cachedResult);

      const startTime = performance.now();

      const result = await enrichmentService.enrichLead(mockLead.id);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // 100ms for cached response
      expect(result).toEqual(cachedResult);
    });
  });

  describe('Concurrent Load Performance', () => {
    it('should handle 10 concurrent enrichments within 5 seconds', async () => {
      const leadIds = Array.from({ length: 10 }, (_, i) => i + 1);

      // Setup mock responses with slight delays to simulate real API calls
      mockPropertyProvider.doEnrich.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          propertyValue: 450000,
          confidence: 0.95,
        }), Math.random() * 500)) // 0-500ms random delay
      );

      mockSocialProvider.doEnrich.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          professionalTitle: 'Engineer',
          confidence: 0.87,
        }), Math.random() * 300))
      );

      mockCreditProvider.doEnrich.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          creditScore: 750,
          confidence: 0.92,
        }), Math.random() * 400))
      );

      const startTime = performance.now();

      const promises = leadIds.map(leadId =>
        enrichmentService.enrichLead(leadId, {
          sources: ['property', 'social', 'credit'],
        })
      );

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      expect(totalDuration).toBeLessThan(5000); // 5 seconds for 10 concurrent requests
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.qualityScore).toBeGreaterThan(80);
      });
    });

    it('should maintain performance under sustained load', async () => {
      const iterations = 20;
      const durations = [];

      mockPropertyProvider.doEnrich.mockResolvedValue({
        propertyValue: 450000,
        confidence: 0.95,
      });

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();

        await enrichmentService.enrichLead(mockLead.id + i, {
          sources: ['property'],
        });

        const endTime = performance.now();
        durations.push(endTime - startTime);

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      expect(avgDuration).toBeLessThan(500); // Average under 500ms
      expect(maxDuration).toBeLessThan(1000); // Max under 1 second
      expect(minDuration).toBeGreaterThan(10); // Min over 10ms (realistic)
    });
  });

  describe('Batch Processing Performance', () => {
    it('should process batches efficiently', async () => {
      const batchSizes = [5, 10, 25, 50];
      const performanceResults = {};

      mockPropertyProvider.doEnrich.mockResolvedValue({
        propertyValue: 450000,
        confidence: 0.95,
      });

      for (const batchSize of batchSizes) {
        const leadIds = Array.from({ length: batchSize }, (_, i) => i + 1);

        const startTime = performance.now();

        const result = await enrichmentService.enrichLeadsBatch(leadIds, {
          sources: ['property'],
        });

        const endTime = performance.now();
        const duration = endTime - startTime;

        performanceResults[batchSize] = {
          duration,
          perLeadTime: duration / batchSize,
          successRate: result.successful / result.total,
        };

        // Cleanup for next iteration
        jest.clearAllMocks();
        mockPropertyProvider.doEnrich.mockResolvedValue({
          propertyValue: 450000,
          confidence: 0.95,
        });
      }

      // Verify batch processing is more efficient than individual requests
      expect(performanceResults[50].perLeadTime).toBeLessThan(
        performanceResults[5].perLeadTime * 1.5
      );
    });

    it('should handle maximum batch size efficiently', async () => {
      const maxBatchSize = 50;
      const leadIds = Array.from({ length: maxBatchSize }, (_, i) => i + 1);

      mockPropertyProvider.doEnrich.mockResolvedValue({
        propertyValue: 450000,
        confidence: 0.95,
      });

      const startTime = performance.now();

      const result = await enrichmentService.enrichLeadsBatch(leadIds, {
        sources: ['property'],
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(10000); // 10 seconds for max batch
      expect(result.total).toBe(maxBatchSize);
      expect(result.successful).toBe(maxBatchSize);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not have memory leaks during sustained operation', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 100;

      mockPropertyProvider.doEnrich.mockResolvedValue({
        propertyValue: 450000,
        confidence: 0.95,
      });

      for (let i = 0; i < iterations; i++) {
        await enrichmentService.enrichLead(mockLead.id + i, {
          sources: ['property'],
        });
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB for 100 iterations)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle large result sets without memory issues', async () => {
      const largeResult = {
        propertyValue: 450000,
        transactionHistory: Array.from({ length: 1000 }, (_, i) => ({
          date: `202${i % 10}-01-01`,
          price: 400000 + (i * 1000),
        })),
        confidence: 0.95,
      };

      mockPropertyProvider.doEnrich.mockResolvedValue(largeResult);

      const startTime = performance.now();
      const startMemory = process.memoryUsage();

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['property'],
      });

      const endTime = performance.now();
      const endMemory = process.memoryUsage();

      const duration = endTime - startTime;
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;

      expect(duration).toBeLessThan(2000); // Should handle large data quickly
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
      expect(result.data.property.transactionHistory).toHaveLength(1000);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle API failures gracefully without performance degradation', async () => {
      const iterations = 10;
      const durations = [];

      // Alternate between success and failure
      let callCount = 0;
      mockPropertyProvider.doEnrich.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 0) {
          return Promise.reject(new Error('API temporarily unavailable'));
        }
        return Promise.resolve({
          propertyValue: 450000,
          confidence: 0.95,
        });
      });

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();

        try {
          await enrichmentService.enrichLead(mockLead.id + i, {
            sources: ['property'],
          });
        } catch (error) {
          // Expected for some calls
        }

        const endTime = performance.now();
        durations.push(endTime - startTime);
      }

      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      expect(avgDuration).toBeLessThan(1000); // Average under 1 second even with errors
      expect(maxDuration).toBeLessThan(3000); // Max under 3 seconds
    });

    it('should recover quickly from temporary service outages', async () => {
      // Simulate service outage followed by recovery
      let outageMode = true;

      mockPropertyProvider.doEnrich.mockImplementation(() => {
        if (outageMode) {
          outageMode = false; // Recover after first failure
          return Promise.reject(new Error('Service temporarily unavailable'));
        }
        return Promise.resolve({
          propertyValue: 450000,
          confidence: 0.95,
        });
      });

      const startTime = performance.now();

      // First call should fail
      try {
        await enrichmentService.enrichLead(mockLead.id, {
          sources: ['property'],
        });
      } catch (error) {
        // Expected
      }

      // Second call should succeed
      const result = await enrichmentService.enrichLead(mockLead.id + 1, {
        sources: ['property'],
      });

      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      expect(totalDuration).toBeLessThan(3000); // Recovery within 3 seconds
      expect(result.qualityScore).toBeGreaterThan(80);
    });
  });

  describe('Cache Performance', () => {
    it('should demonstrate significant performance improvement with caching', async () => {
      const iterations = 20;
      const uncachedDurations = [];
      const cachedDurations = [];

      // Setup uncached scenario
      mockCacheService.get.mockResolvedValue(null);
      mockPropertyProvider.doEnrich.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          propertyValue: 450000,
          confidence: 0.95,
        }), 200)) // 200ms API call
      );

      // Measure uncached performance
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await enrichmentService.enrichLead(mockLead.id + i, {
          sources: ['property'],
        });
        const endTime = performance.now();
        uncachedDurations.push(endTime - startTime);
      }

      // Setup cached scenario
      mockCacheService.get.mockResolvedValue({
        enrichmentId: 'cached-123',
        qualityScore: 85,
        data: { property: { propertyValue: 450000 } },
      });

      // Measure cached performance
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await enrichmentService.enrichLead(mockLead.id + i + iterations, {
          sources: ['property'],
        });
        const endTime = performance.now();
        cachedDurations.push(endTime - startTime);
      }

      const avgUncached = uncachedDurations.reduce((sum, d) => sum + d, 0) / uncachedDurations.length;
      const avgCached = cachedDurations.reduce((sum, d) => sum + d, 0) / cachedDurations.length;

      const performanceImprovement = ((avgUncached - avgCached) / avgUncached) * 100;

      expect(avgCached).toBeLessThan(avgUncached);
      expect(performanceImprovement).toBeGreaterThan(80); // At least 80% improvement
      expect(avgCached).toBeLessThan(50); // Cached responses under 50ms
    });

    it('should maintain cache performance under high load', async () => {
      const concurrentRequests = 50;
      const cachedResult = {
        enrichmentId: 'cached-123',
        qualityScore: 85,
        data: { property: { propertyValue: 450000 } },
      };

      mockCacheService.get.mockResolvedValue(cachedResult);

      const startTime = performance.now();

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        enrichmentService.enrichLead(mockLead.id + i, {
          sources: ['property'],
        })
      );

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      expect(totalDuration).toBeLessThan(1000); // All cached requests complete within 1 second
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.enrichmentId).toBe('cached-123');
      });
    });
  });

  describe('Resource Utilization', () => {
    it('should maintain stable CPU usage during load', async () => {
      // This test would require actual CPU monitoring in a real environment
      // For now, we'll test that the service doesn't block the event loop

      const startTime = Date.now();
      const testDuration = 5000; // 5 seconds

      mockPropertyProvider.doEnrich.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          propertyValue: 450000,
          confidence: 0.95,
        }), 100))
      );

      const promises = [];

      // Generate continuous load
      while (Date.now() - startTime < testDuration) {
        promises.push(
          enrichmentService.enrichLead(Math.random() * 1000, {
            sources: ['property'],
          })
        );

        // Allow event loop to process
        await new Promise(resolve => setImmediate(resolve));
      }

      const results = await Promise.all(promises);

      expect(results.length).toBeGreaterThan(10); // At least some requests completed
      results.forEach(result => {
        expect(result).toHaveProperty('qualityScore');
      });
    });

    it('should handle database connection pooling efficiently', async () => {
      // This would test actual database performance in integration tests
      // For unit tests, we'll verify the service can handle multiple DB operations

      const concurrentDbOperations = 20;
      const mockDbResults = Array.from({ length: concurrentDbOperations }, (_, i) => ({
        id: i + 1,
        enrichmentData: { property: { propertyValue: 400000 + (i * 1000) } },
      }));

      // Mock database operations
      const mockLeadModel = {
        findByPk: jest.fn(),
        update: jest.fn().mockResolvedValue([1]),
      };

      // Simulate concurrent database operations
      const promises = mockDbResults.map((result, index) => {
        mockLeadModel.findByPk.mockResolvedValueOnce(result);
        return enrichmentService.enrichLead(result.id, {
          sources: ['property'],
        });
      });

      const startTime = performance.now();
      const results = await Promise.all(promises);
      const endTime = performance.now();

      const totalDuration = endTime - startTime;
      const avgDuration = totalDuration / concurrentDbOperations;

      expect(avgDuration).toBeLessThan(200); // Average under 200ms per operation
      expect(results).toHaveLength(concurrentDbOperations);
    });
  });
});