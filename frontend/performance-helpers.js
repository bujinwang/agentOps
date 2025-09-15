// Simple JavaScript performance helpers for Node.js testing
// This bypasses TypeScript compilation issues

const { performance } = require('perf_hooks');

// Memory thresholds
const MEMORY_THRESHOLDS = {
  LIGHT_USAGE: 5 * 1024 * 1024, // 5MB
  MODERATE_USAGE: 20 * 1024 * 1024, // 20MB
  HEAVY_USAGE: 50 * 1024 * 1024, // 50MB
};

// Performance measurement utilities
async function measureExecutionTime(fn) {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();

  return {
    result,
    executionTime: endTime - startTime
  };
}

function measureSyncExecutionTime(fn) {
  const startTime = performance.now();
  const result = fn();
  const endTime = performance.now();

  return {
    result,
    executionTime: endTime - startTime
  };
}

// Memory monitoring
async function monitorMemoryUsage(fn) {
  const initialMemory = process.memoryUsage();

  const result = await fn();

  const finalMemory = process.memoryUsage();

  const memoryIncrease = {
    heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
    heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
    external: finalMemory.external - initialMemory.external,
    rss: finalMemory.rss - initialMemory.rss
  };

  return {
    result,
    initialMemory,
    finalMemory,
    memoryIncrease
  };
}

// Test data generation
const generateTestData = {
  leads: (count) => {
    const locations = ['downtown', 'suburban', 'rural'];
    const timelines = ['immediate', '1-3 months', '3-6 months', '6+ months'];
    const financings = ['cash', 'pre-approved', 'pre-qualified', 'conventional'];
    const propertyTypes = ['single_family', 'condo', 'townhouse'];

    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Lead ${i + 1}`,
      email: `lead${i + 1}@example.com`,
      phone: `555-010${String(i + 1).padStart(3, '0')}`,
      budget: Math.floor(Math.random() * 1000000) + 200000,
      timeline: timelines[Math.floor(Math.random() * timelines.length)],
      financing: financings[Math.floor(Math.random() * financings.length)],
      location: locations[Math.floor(Math.random() * locations.length)],
      property_type: propertyTypes[Math.floor(Math.random() * propertyTypes.length)],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  },

  properties: (count) => {
    const cities = ['Springfield', 'Riverside', 'Oakwood', 'Maple Valley'];
    const states = ['IL', 'CA', 'WA', 'OR'];
    const propertyTypes = ['single_family', 'condo', 'townhouse'];
    const statuses = ['active', 'pending', 'sold'];

    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      address: `${123 + i} Main St`,
      city: cities[Math.floor(Math.random() * cities.length)],
      state: states[Math.floor(Math.random() * states.length)],
      zip_code: String(60000 + Math.floor(Math.random() * 10000)),
      price: Math.floor(Math.random() * 1000000) + 100000,
      bedrooms: Math.floor(Math.random() * 5) + 1,
      bathrooms: Math.floor(Math.random() * 4) + 1,
      square_feet: Math.floor(Math.random() * 3000) + 800,
      property_type: propertyTypes[Math.floor(Math.random() * propertyTypes.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  }
};

// Performance assertions
const performanceAssertions = {
  assertMemoryUsage: (memoryIncrease, threshold) => {
    if (memoryIncrease.heapUsed > threshold) {
      throw new Error(`Memory usage ${memoryIncrease.heapUsed} exceeded threshold ${threshold}`);
    }
  },

  assertExecutionTime: (executionTime, threshold) => {
    if (executionTime > threshold) {
      throw new Error(`Execution time ${executionTime}ms exceeded threshold ${threshold}ms`);
    }
  }
};

// Load testing framework
async function concurrentOperations(operations, concurrency = 5) {
  const results = [];
  const batches = [];

  // Split operations into batches
  for (let i = 0; i < operations.length; i += concurrency) {
    batches.push(operations.slice(i, i + concurrency));
  }

  // Execute batches sequentially
  for (const batch of batches) {
    const batchResults = await Promise.all(batch.map(op => op()));
    results.push(...batchResults);
  }

  return results;
}

async function sustainedLoad(operation, duration = 30000, interval = 100) {
  const startTime = Date.now();
  const results = [];

  while (Date.now() - startTime < duration) {
    const result = await operation();
    results.push(result);

    // Wait for next interval
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return results;
}

// Performance reporting
function generateReport(results, type = 'performance') {
  const report = {
    type,
    timestamp: new Date().toISOString(),
    summary: {
      totalOperations: results.length,
      averageExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0) / results.length,
      minExecutionTime: Math.min(...results.map(r => r.executionTime)),
      maxExecutionTime: Math.max(...results.map(r => r.executionTime)),
      p95ExecutionTime: results.sort((a, b) => a.executionTime - b.executionTime)[Math.floor(results.length * 0.95)].executionTime
    },
    memory: results[0]?.memoryIncrease ? {
      averageHeapIncrease: results.reduce((sum, r) => sum + r.memoryIncrease.heapUsed, 0) / results.length,
      maxHeapIncrease: Math.max(...results.map(r => r.memoryIncrease.heapUsed))
    } : null
  };

  return report;
}

module.exports = {
  MEMORY_THRESHOLDS,
  measureExecutionTime,
  measureSyncExecutionTime,
  monitorMemoryUsage,
  generateTestData,
  performanceAssertions,
  concurrentOperations,
  sustainedLoad,
  generateReport
};