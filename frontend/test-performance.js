// Simple Node.js performance test runner
// This bypasses React Native Jest setup issues

const { performance } = require('perf_hooks');

// Import our performance helpers
const { measureExecutionTime, monitorMemoryUsage, generateTestData, MEMORY_THRESHOLDS } = require('./performance-helpers');


// Test 1: Memory usage for lead scoring
async function testLeadScoringMemory() {
  console.log('\n=== Testing Lead Scoring Memory Usage ===');

  const leads = generateTestData.leads(500);

  const memoryResult = await monitorMemoryUsage(async () => {
    // Simulate lead scoring algorithm
    const scoredLeads = leads.map(lead => {
      let score = 0;

      // Budget scoring (0-25 points)
      if (lead.budget && lead.budget > 500000) score += 25;
      else if (lead.budget && lead.budget > 400000) score += 20;
      else if (lead.budget && lead.budget > 300000) score += 15;
      else if (lead.budget && lead.budget > 200000) score += 10;

      // Timeline scoring (0-20 points)
      if (lead.timeline === 'immediate') score += 20;
      else if (lead.timeline === '1-3 months') score += 15;
      else if (lead.timeline === '3-6 months') score += 10;
      else if (lead.timeline === '6+ months') score += 5;

      // Financing scoring (0-15 points)
      if (lead.financing === 'cash') score += 15;
      else if (lead.financing === 'pre-approved') score += 12;
      else if (lead.financing === 'pre-qualified') score += 8;

      // Location scoring (0-20 points)
      if (lead.location === 'downtown') score += 20;
      else if (lead.location === 'suburban') score += 15;
      else if (lead.location === 'rural') score += 10;

      // Property type scoring (0-10 points)
      if (lead.property_type === 'single_family') score += 10;
      else if (lead.property_type === 'condo') score += 8;
      else if (lead.property_type === 'townhouse') score += 6;

      // Determine grade
      let grade = 'F';
      if (score >= 80) grade = 'A';
      else if (score >= 65) grade = 'B';
      else if (score >= 50) grade = 'C';
      else if (score >= 35) grade = 'D';

      return {
        ...lead,
        score,
        grade,
        category: score >= 70 ? 'hot' : score >= 50 ? 'warm' : 'cold',
        priority: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low'
      };
    });

    // Generate analytics
    const analytics = {
      totalLeads: scoredLeads.length,
      averageScore: scoredLeads.reduce((sum, lead) => sum + lead.score, 0) / scoredLeads.length,
      gradeDistribution: scoredLeads.reduce((dist, lead) => {
        dist[lead.grade] = (dist[lead.grade] || 0) + 1;
        return dist;
      }, {}),
      hotLeads: scoredLeads.filter(lead => lead.category === 'hot').length,
      highPriority: scoredLeads.filter(lead => lead.priority === 'high').length,
      topPerformers: scoredLeads
        .filter(lead => lead.score >= 80)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
    };

    return {
      scoredLeads,
      analytics
    };
  });

  const memoryIncreaseMB = memoryResult.memoryIncrease.heapUsed / (1024 * 1024);
  console.log(`Lead scoring memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);

  if (memoryResult.memoryIncrease.heapUsed > MEMORY_THRESHOLDS.MODERATE_USAGE) {
    console.log('❌ FAIL: Memory usage exceeded moderate threshold');
    return false;
  } else {
    console.log('✅ PASS: Memory usage within acceptable limits');
    return true;
  }
}

// Test 2: Property data processing
async function testPropertyProcessingMemory() {
  console.log('\n=== Testing Property Processing Memory Usage ===');

  const properties = generateTestData.properties(1000);

  const memoryResult = await monitorMemoryUsage(async () => {
    // Simulate property processing
    const processedProperties = properties.map(p => ({
      ...p,
      age: new Date().getFullYear() - 2000, // Default age calculation
      marketValue: p.price * 1.05, // 5% market adjustment
      roi: ((p.price * 1.05) - p.price) / p.price * 100,
      status: p.status === 'active' ? 'market_ready' : 'off_market'
    }));

    // Generate market analytics
    const analytics = {
      totalProperties: processedProperties.length,
      averagePrice: processedProperties.reduce((sum, p) => sum + p.price, 0) / processedProperties.length,
      averageAge: processedProperties.reduce((sum, p) => sum + p.age, 0) / processedProperties.length,
      marketValue: processedProperties.reduce((sum, p) => sum + p.marketValue, 0),
      byType: processedProperties.reduce((types, p) => {
        types[p.property_type] = (types[p.property_type] || 0) + 1;
        return types;
      }, {}),
      topProperties: processedProperties
        .sort((a, b) => b.roi - a.roi)
        .slice(0, 5)
    };

    return {
      processedProperties,
      analytics
    };
  });

  const memoryIncreaseMB = memoryResult.memoryIncrease.heapUsed / (1024 * 1024);
  console.log(`Property processing memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);

  if (memoryResult.memoryIncrease.heapUsed > MEMORY_THRESHOLDS.HEAVY_USAGE) {
    console.log('❌ FAIL: Memory usage exceeded heavy threshold');
    return false;
  } else {
    console.log('✅ PASS: Memory usage within acceptable limits');
    return true;
  }
}

// Test 3: CMA analysis performance
async function testCMAAnalysisPerformance() {
  console.log('\n=== Testing CMA Analysis Performance ===');

  const properties = generateTestData.properties(200);
  const subjectProperty = generateTestData.properties(1)[0];

  const executionResult = await measureExecutionTime(async () => {
    // Simulate CMA analysis
    const comparables = properties.filter(p =>
      p.city === subjectProperty.city &&
      p.property_type === subjectProperty.property_type &&
      Math.abs(p.price - subjectProperty.price) / subjectProperty.price < 0.3
    );

    const analysis = {
      subjectProperty,
      comparables: comparables.slice(0, 6), // Top 6 comparables
      averagePrice: comparables.reduce((sum, p) => sum + p.price, 0) / comparables.length,
      priceRange: {
        min: Math.min(...comparables.map(p => p.price)),
        max: Math.max(...comparables.map(p => p.price))
      },
      marketTrend: comparables.length > 3 ? 'stable' : 'limited_data',
      confidence: comparables.length >= 5 ? 'high' : comparables.length >= 3 ? 'medium' : 'low'
    };

    return analysis;
  });

  console.log(`CMA analysis execution time: ${executionResult.executionTime.toFixed(2)}ms`);

  if (executionResult.executionTime > 500) { // 500ms threshold
    console.log('❌ FAIL: CMA analysis took too long');
    return false;
  } else {
    console.log('✅ PASS: CMA analysis completed within time limits');
    return true;
  }
}

// Run all tests
async function runPerformanceTests() {
  console.log('🚀 Starting Performance Tests...\n');

  const results = await Promise.all([
    testLeadScoringMemory(),
    testPropertyProcessingMemory(),
    testCMAAnalysisPerformance()
  ]);

  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All performance tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️ Some performance tests failed');
    process.exit(1);
  }
}

// Run tests
runPerformanceTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});