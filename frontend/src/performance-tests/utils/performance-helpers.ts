/**
 * Performance Testing Utilities
 * Shared utilities for performance testing across the application
 */

import { performance } from 'perf_hooks';

// Performance thresholds (in milliseconds)
export const PERFORMANCE_THRESHOLDS = {
  FAST_RESPONSE: 200,      // Fast operations (< 200ms)
  ACCEPTABLE_RESPONSE: 500, // Acceptable operations (< 500ms)
  SLOW_RESPONSE: 2000,     // Slow operations (< 2s)
  MAX_RESPONSE: 5000,      // Maximum acceptable (< 5s)
};

// Memory thresholds (in MB)
export const MEMORY_THRESHOLDS = {
  LOW_USAGE: 50,      // Low memory usage (< 50MB)
  MODERATE_USAGE: 100, // Moderate usage (< 100MB)
  HIGH_USAGE: 200,    // High usage (< 200MB)
  CRITICAL_USAGE: 500, // Critical usage threshold
};

// Component render thresholds (in milliseconds)
export const RENDER_THRESHOLDS = {
  FAST_RENDER: 50,      // Fast component render (< 50ms)
  ACCEPTABLE_RENDER: 100, // Acceptable render (< 100ms)
  SLOW_RENDER: 200,     // Slow render threshold (< 200ms)
};

/**
 * Measure execution time of an async operation
 */
export const measureExecutionTime = async <T>(
  operation: () => Promise<T>
): Promise<{ result: T; executionTime: number }> => {
  const startTime = performance.now();
  const result = await operation();
  const endTime = performance.now();

  return {
    result,
    executionTime: endTime - startTime
  };
};

/**
 * Measure execution time of a sync operation
 */
export const measureSyncExecutionTime = <T>(
  operation: () => T
): { result: T; executionTime: number } => {
  const startTime = performance.now();
  const result = operation();
  const endTime = performance.now();

  return {
    result,
    executionTime: endTime - startTime
  };
};

/**
 * Get current memory usage
 */
export const getMemoryUsage = (): { heapUsed: number; heapTotal: number; external: number } => {
  const memUsage = process.memoryUsage();
  return {
    heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
    heapTotal: memUsage.heapTotal / 1024 / 1024, // MB
    external: memUsage.external / 1024 / 1024   // MB
  };
};

/**
 * Monitor memory usage over time
 */
export const monitorMemoryUsage = (
  operation: () => Promise<void> | void,
  samples: number = 10
): Promise<{
  initialMemory: { heapUsed: number; heapTotal: number; external: number };
  finalMemory: { heapUsed: number; heapTotal: number; external: number };
  memoryIncrease: { heapUsed: number; heapTotal: number; external: number };
  peakMemory: { heapUsed: number; heapTotal: number; external: number };
}> => {
  return new Promise(async (resolve) => {
    const initialMemory = getMemoryUsage();
    let peakMemory = { ...initialMemory };

    // Monitor memory during operation
    const monitorInterval = setInterval(() => {
      const currentMemory = getMemoryUsage();
      if (currentMemory.heapUsed > peakMemory.heapUsed) {
        peakMemory = { ...currentMemory };
      }
    }, 100); // Sample every 100ms

    // Execute operation
    if (operation.constructor.name === 'AsyncFunction') {
      await (operation as () => Promise<void>)();
    } else {
      (operation as () => void)();
    }

    // Stop monitoring
    clearInterval(monitorInterval);

    const finalMemory = getMemoryUsage();
    const memoryIncrease = {
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
      external: finalMemory.external - initialMemory.external
    };

    resolve({
      initialMemory,
      finalMemory,
      memoryIncrease,
      peakMemory
    });
  });
};

/**
 * Generate performance test data
 */
export const generateTestData = {
  /**
   * Generate array of property objects for testing
   */
  properties: (count: number) => Array(count).fill(null).map((_, index) => ({
    id: index + 1,
    address: `${index + 1} Test Street`,
    city: 'Test City',
    state: 'TS',
    zip_code: '12345',
    price: 250000 + (index * 5000),
    bedrooms: 3,
    bathrooms: 2,
    square_feet: 1800 + (index * 50),
    property_type: 'single_family' as const,
    status: 'active' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })),

  /**
   * Generate array of lead objects for testing
   */
  leads: (count: number) => Array(count).fill(null).map((_, index) => ({
    id: index + 1,
    budget: 300000 + (index * 10000),
    timeline: index % 2 === 0 ? 'immediate' : '3-6 months',
    property_type: 'single_family',
    financing: 'pre-approved',
    location: 'downtown',
    created_at: new Date().toISOString()
  })),

  /**
   * Generate CMA request data
   */
  cmaRequest: (propertyId: number = 1) => ({
    subject_property_id: propertyId,
    search_criteria: {
      subject_property_id: propertyId,
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
  })
};

/**
 * Performance assertion helpers
 */
export const performanceAssertions = {
  /**
   * Assert response time is within acceptable limits
   */
  assertResponseTime: (executionTime: number, threshold: number = PERFORMANCE_THRESHOLDS.ACCEPTABLE_RESPONSE) => {
    if (executionTime > threshold) {
      throw new Error(`Performance assertion failed: ${executionTime}ms exceeds threshold of ${threshold}ms`);
    }
  },

  /**
   * Assert memory usage is within acceptable limits
   */
  assertMemoryUsage: (memoryIncrease: number, threshold: number = MEMORY_THRESHOLDS.MODERATE_USAGE) => {
    if (memoryIncrease > threshold) {
      throw new Error(`Memory assertion failed: ${memoryIncrease}MB exceeds threshold of ${threshold}MB`);
    }
  },

  /**
   * Assert operation completed successfully
   */
  assertSuccess: (result: any) => {
    if (!result || (result.success !== undefined && !result.success)) {
      throw new Error('Operation assertion failed: Operation did not complete successfully');
    }
  }
};

/**
 * Load testing utilities
 */
export const loadTesting = {
  /**
   * Generate concurrent operations
   */
  concurrentOperations: async <T>(
    operation: () => Promise<T>,
    concurrency: number,
    totalOperations: number
  ): Promise<{
    results: T[];
    totalTime: number;
    averageTime: number;
    successRate: number;
  }> => {
    const startTime = performance.now();
    const promises: Promise<T>[] = [];

    // Create concurrent operations
    for (let i = 0; i < totalOperations; i++) {
      promises.push(operation());
    }

    // Execute with concurrency limit
    const results: T[] = [];
    const batches = Math.ceil(totalOperations / concurrency);

    for (let batch = 0; batch < batches; batch++) {
      const batchStart = batch * concurrency;
      const batchEnd = Math.min(batchStart + concurrency, totalOperations);
      const batchPromises = promises.slice(batchStart, batchEnd);

      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / totalOperations;
    const successRate = results.length / totalOperations;

    return {
      results,
      totalTime,
      averageTime,
      successRate
    };
  },

  /**
   * Sustained load testing
   */
  sustainedLoad: async (
    operation: () => Promise<any>,
    duration: number, // milliseconds
    interval: number = 100 // milliseconds between operations
  ): Promise<{
    totalOperations: number;
    totalTime: number;
    operationsPerSecond: number;
    averageResponseTime: number;
  }> => {
    const startTime = performance.now();
    let operationCount = 0;
    const responseTimes: number[] = [];

    const runOperation = async () => {
      const opStartTime = performance.now();
      try {
        await operation();
        const opEndTime = performance.now();
        responseTimes.push(opEndTime - opStartTime);
        operationCount++;
      } catch (error) {
        // Operation failed, but continue testing
        console.warn('Operation failed during load test:', error);
      }
    };

    // Run operations at specified interval
    const operationInterval = setInterval(runOperation, interval);

    // Stop after duration
    await new Promise(resolve => setTimeout(resolve, duration));
    clearInterval(operationInterval);

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const operationsPerSecond = operationCount / (totalTime / 1000);
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    return {
      totalOperations: operationCount,
      totalTime,
      operationsPerSecond,
      averageResponseTime
    };
  }
};

/**
 * Performance reporting utilities
 */
export const performanceReporting = {
  /**
   * Generate performance test report
   */
  generateReport: (testResults: any[]) => {
    const summary = {
      totalTests: testResults.length,
      passedTests: testResults.filter(r => r.passed).length,
      failedTests: testResults.filter(r => !r.passed).length,
      averageResponseTime: testResults.reduce((sum, r) => sum + r.executionTime, 0) / testResults.length,
      maxResponseTime: Math.max(...testResults.map(r => r.executionTime)),
      minResponseTime: Math.min(...testResults.map(r => r.executionTime)),
      timestamp: new Date().toISOString()
    };

    return {
      summary,
      details: testResults,
      recommendations: generateRecommendations(testResults)
    };
  }
};

/**
 * Generate performance recommendations based on test results
 */
function generateRecommendations(testResults: any[]): string[] {
  const recommendations: string[] = [];

  const avgResponseTime = testResults.reduce((sum, r) => sum + r.executionTime, 0) / testResults.length;
  const slowTests = testResults.filter(r => r.executionTime > PERFORMANCE_THRESHOLDS.ACCEPTABLE_RESPONSE);

  if (avgResponseTime > PERFORMANCE_THRESHOLDS.ACCEPTABLE_RESPONSE) {
    recommendations.push('Consider optimizing database queries and adding appropriate indexes');
  }

  if (slowTests.length > testResults.length * 0.2) {
    recommendations.push('Review and optimize slow-performing operations');
  }

  if (testResults.some(r => r.memoryIncrease > MEMORY_THRESHOLDS.MODERATE_USAGE)) {
    recommendations.push('Investigate memory usage patterns and potential memory leaks');
  }

  return recommendations;
}