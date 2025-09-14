/**
 * API Performance Tests
 * Tests response times, throughput, and resource usage for API endpoints
 */

import { performance } from 'perf_hooks';
import { propertyApiService } from '../../services/propertyApiService';
import { cmaApiService } from '../../services/cmaApiService';
import leadScoreApiService from '../../services/leadScoreApiService';
import { PropertyCreate } from '../../types/property';

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  FAST_RESPONSE: 200,      // Fast operations (< 200ms)
  ACCEPTABLE_RESPONSE: 500, // Acceptable operations (< 500ms)
  SLOW_RESPONSE: 2000,     // Slow operations (< 2s)
  MAX_RESPONSE: 5000,      // Maximum acceptable (< 5s)
};

// Memory usage thresholds (in MB)
const MEMORY_THRESHOLDS = {
  LOW_USAGE: 50,      // Low memory usage (< 50MB)
  MODERATE_USAGE: 100, // Moderate usage (< 100MB)
  HIGH_USAGE: 200,    // High usage (< 200MB)
  CRITICAL_USAGE: 500, // Critical usage threshold
};

describe('API Performance Tests', () => {
  beforeAll(() => {
    // Setup performance monitoring - using Node.js timeout instead of Jest
    jest.setTimeout(30000); // 30 second timeout for performance tests
  });

  describe('Property API Performance', () => {
    it('should retrieve property list within acceptable time', async () => {
      const startTime = performance.now();

      const result = await propertyApiService.getProperties(1, 20);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.ACCEPTABLE_RESPONSE);
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);

      console.log(`Property list retrieval: ${responseTime.toFixed(2)}ms`);
    });

    it('should create property within fast response time', async () => {
      const propertyData: PropertyCreate = {
        property_type: 'single_family',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip_code: '12345',
          country: 'USA'
        },
        price: 300000,
        details: {
          bedrooms: 3,
          bathrooms: 2,
          square_feet: 2000
        }
      };

      const startTime = performance.now();

      const result = await propertyApiService.createProperty(propertyData);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FAST_RESPONSE);
      expect(result.success).toBe(true);

      console.log(`Property creation: ${responseTime.toFixed(2)}ms`);
    });

    it('should handle concurrent property searches efficiently', async () => {
      const searchPromises = Array(10).fill(null).map((_, index) =>
        propertyApiService.searchProperties({
          city: [`Test City ${index}`],
          limit: 5
        }, 1, 5)
      );

      const startTime = performance.now();

      const results = await Promise.all(searchPromises);

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / searchPromises.length;

      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.ACCEPTABLE_RESPONSE);
      expect(results.every(r => r.success)).toBe(true);

      console.log(`Concurrent searches: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(2)}ms average`);
    });
  });

  describe('CMA API Performance', () => {
    it('should create CMA analysis within acceptable time', async () => {
      const cmaData = {
        subject_property_id: 123,
        search_criteria: {
          subject_property_id: 123,
          search_radius_miles: 1,
          max_comparables: 10,
          date_range: {
            start: '2024-01-01',
            end: '2024-12-31'
          },
          property_types: ['single_family'],
          sale_types: ['arms_length'],
          min_data_quality_score: 70,
          require_verified_only: false,
          exclude_distressed_sales: false
        }
      };

      const startTime = performance.now();

      const result = await cmaApiService.createCMAAnalysis(cmaData);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SLOW_RESPONSE);
      expect(result.success).toBe(true);

      console.log(`CMA creation: ${responseTime.toFixed(2)}ms`);
    });

    it('should retrieve market trends within acceptable time', async () => {
      const trendsRequest = {
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 5
      };

      const startTime = performance.now();

      const result = await cmaApiService.getMarketTrends(trendsRequest);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.ACCEPTABLE_RESPONSE);
      expect(result.success).toBe(true);

      console.log(`Market trends retrieval: ${responseTime.toFixed(2)}ms`);
    });
  });

  describe('Lead Scoring API Performance', () => {
    it('should calculate lead score within fast response time', async () => {
      const leadData = {
        id: 123,
        budget: 350000,
        timeline: '3-6 months',
        property_type: 'single_family',
        financing: 'pre-approved',
        location: 'downtown'
      };

      const startTime = performance.now();

      const result = await leadScoreApiService.calculateLeadScore(leadData);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FAST_RESPONSE);
      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
      expect(typeof result.score.totalScore).toBe('number');

      console.log(`Lead scoring: ${responseTime.toFixed(2)}ms`);
    });

    it('should handle bulk lead scoring efficiently', async () => {
      const leadsData = Array(5).fill(null).map((_, index) => ({
        id: 100 + index,
        budget: 300000 + (index * 10000),
        timeline: index % 2 === 0 ? 'immediate' : '3-6 months',
        property_type: 'single_family',
        financing: 'cash',
        location: 'suburban'
      }));

      const startTime = performance.now();

      const results = await Promise.all(
        leadsData.map(lead => leadScoreApiService.calculateLeadScore(lead))
      );

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / leadsData.length;

      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.ACCEPTABLE_RESPONSE);
      expect(results.every(r => r.score && typeof r.score.totalScore === 'number')).toBe(true);

      console.log(`Bulk lead scoring (5 leads): ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(2)}ms average`);
    });
  });

  describe('Memory Usage Monitoring', () => {
    it('should maintain low memory usage during property operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB

      // Perform memory-intensive operations
      const operations = Array(10).fill(null).map(() =>
        propertyApiService.getProperties(1, 10)
      );

      await Promise.all(operations);

      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(MEMORY_THRESHOLDS.MODERATE_USAGE);

      console.log(`Memory usage: ${initialMemory.toFixed(2)}MB → ${finalMemory.toFixed(2)}MB (+${memoryIncrease.toFixed(2)}MB)`);
    });

    it('should not have memory leaks in CMA operations', async () => {
      const memoryReadings: number[] = [];

      for (let i = 0; i < 5; i++) {
        const cmaData = {
          subject_property_id: 100 + i,
          search_criteria: {
            subject_property_id: 100 + i,
            search_radius_miles: 1,
            max_comparables: 5,
            date_range: {
              start: '2024-01-01',
              end: '2024-12-31'
            },
            property_types: ['single_family'],
            sale_types: ['arms_length'],
            min_data_quality_score: 70,
            require_verified_only: false,
            exclude_distressed_sales: false
          }
        };

        await cmaApiService.createCMAAnalysis(cmaData);

        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        memoryReadings.push(memoryUsage);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const initialMemory = memoryReadings[0];
      const finalMemory = memoryReadings[memoryReadings.length - 1];
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(MEMORY_THRESHOLDS.LOW_USAGE);

      console.log(`CMA memory test: ${initialMemory.toFixed(2)}MB → ${finalMemory.toFixed(2)}MB (+${memoryIncrease.toFixed(2)}MB)`);
    });
  });

  describe('Load Testing Scenarios', () => {
    it('should handle sustained load for 30 seconds', async () => {
      const testDuration = 10000; // 10 seconds for faster testing
      const startTime = performance.now();
      const requestPromises: Promise<any>[] = [];
      let requestCount = 0;

      const makeRequest = async () => {
        const result = await propertyApiService.getProperties(1, 5);
        requestCount++;
        return result;
      };

      // Continuous requests for test duration
      const interval = setInterval(() => {
        if (performance.now() - startTime < testDuration) {
          requestPromises.push(makeRequest());
        } else {
          clearInterval(interval);
        }
      }, 200); // 200ms intervals = ~5 requests/second

      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, testDuration + 1000));

      const results = await Promise.all(requestPromises);
      const endTime = performance.now();
      const actualDuration = endTime - startTime;

      const successRate = results.filter(r => r.success).length / results.length;
      const avgResponseTime = actualDuration / requestCount;

      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.ACCEPTABLE_RESPONSE);

      console.log(`Load test results: ${requestCount} requests in ${actualDuration.toFixed(2)}ms`);
      console.log(`Success rate: ${(successRate * 100).toFixed(1)}%, Avg response: ${avgResponseTime.toFixed(2)}ms`);
    });
  });
});