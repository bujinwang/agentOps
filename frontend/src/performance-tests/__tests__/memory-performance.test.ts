/**
 * Memory Performance Tests
 * Tests memory usage patterns and leak detection
 */

import { monitorMemoryUsage, getMemoryUsage, generateTestData, MEMORY_THRESHOLDS } from '../utils/performance-helpers';

describe('Memory Performance Tests', () => {
  // Note: Memory tests can take longer, so we don't set a global timeout
  // Individual tests handle their own timing as needed

  describe('Data Processing Memory Usage', () => {
    it('should handle large property dataset processing efficiently', async () => {
      const properties = generateTestData.properties(1000);
      let processedProperties: any[] = [];
      let statistics: any = {};

      const memoryResult = await monitorMemoryUsage(async () => {
        // Process large dataset
        processedProperties = properties.map(property => ({
          ...property,
          pricePerSqft: property.price / property.square_feet,
          isLuxury: property.price > 500000,
          marketValue: property.price * 1.05,
          investmentPotential: property.price < 400000 ? 'high' : 'medium'
        }));

        // Perform additional computations
        statistics = {
          averagePrice: processedProperties.reduce((sum, p) => sum + p.price, 0) / processedProperties.length,
          averagePricePerSqft: processedProperties.reduce((sum, p) => sum + p.pricePerSqft, 0) / processedProperties.length,
          luxuryCount: processedProperties.filter(p => p.isLuxury).length,
          totalValue: processedProperties.reduce((sum, p) => sum + p.marketValue, 0)
        };

        // Simulate complex filtering and sorting
        const sortedByPrice = [...processedProperties].sort((a, b) => b.price - a.price);
        const highValueProperties = sortedByPrice.filter(p => p.price > 400000);
        const groupedByCity = processedProperties.reduce((groups, property) => {
          const city = property.city;
          if (!groups[city]) groups[city] = [];
          groups[city].push(property);
          return groups;
        }, {} as Record<string, any[]>);
      });

      expect(memoryResult.memoryIncrease.heapUsed).toBeLessThan(MEMORY_THRESHOLDS.MODERATE_USAGE);
      expect(processedProperties.length).toBe(1000);
      expect(statistics.averagePrice).toBeDefined();
      console.log(`Large dataset processing memory: ${memoryResult.memoryIncrease.heapUsed.toFixed(2)}MB increase`);
    });

    it('should efficiently process lead scoring data', async () => {
      const leads = generateTestData.leads(500);
      let scoredLeads: any[] = [];
      let analytics: any = {};

      const memoryResult = await monitorMemoryUsage(async () => {
        // Simulate lead scoring algorithm
        scoredLeads = leads.map(lead => {
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
          let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
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
        analytics = {
          totalLeads: scoredLeads.length,
          averageScore: scoredLeads.reduce((sum, lead) => sum + lead.score, 0) / scoredLeads.length,
          gradeDistribution: scoredLeads.reduce((dist, lead) => {
            dist[lead.grade] = (dist[lead.grade] || 0) + 1;
            return dist;
          }, {} as Record<string, number>),
          hotLeads: scoredLeads.filter(lead => lead.category === 'hot').length,
          highPriority: scoredLeads.filter(lead => lead.priority === 'high').length,
          topPerformers: scoredLeads
            .filter(lead => lead.score >= 80)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
        };
      });

      expect(memoryResult.memoryIncrease.heapUsed).toBeLessThan(MEMORY_THRESHOLDS.MODERATE_USAGE);
      expect(scoredLeads.length).toBe(500);
      expect(analytics.averageScore).toBeDefined();
      console.log(`Lead scoring memory: ${memoryResult.memoryIncrease.heapUsed.toFixed(2)}MB increase`);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not have memory leaks during repeated operations', async () => {
      const memoryReadings: number[] = [];
      let operationCount = 0;

      // Perform operations multiple times to detect memory leaks
      for (let i = 0; i < 20; i++) {
        const testData = generateTestData.properties(100);

        // Perform memory-intensive operations
        const processed = testData.map(property => ({
          ...property,
          analysis: {
            pricePerSqft: property.price / property.square_feet,
            marketComparison: Math.random() > 0.5 ? 'above' : 'below',
            investmentScore: Math.floor(Math.random() * 100),
            riskFactors: Array(Math.floor(Math.random() * 5)).fill(null).map(() => ({
              type: ['market', 'location', 'condition'][Math.floor(Math.random() * 3)],
              severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
              description: `Risk factor ${Math.random()}`
            }))
          }
        }));

        // Simulate complex data manipulation
        const grouped = processed.reduce((groups, property) => {
          const city = property.city;
          if (!groups[city]) groups[city] = [];
          groups[city].push(property);
          return groups;
        }, {} as Record<string, typeof processed>);

        const analyzed = Object.entries(grouped).map(([city, properties]) => ({
          city,
          count: properties.length,
          averagePrice: properties.reduce((sum, p) => sum + p.price, 0) / properties.length,
          averageScore: properties.reduce((sum, p) => sum + p.analysis.investmentScore, 0) / properties.length,
          highRiskCount: properties.filter(p => p.analysis.riskFactors.some(r => r.severity === 'high')).length
        }));

        operationCount++;

        // Record memory usage
        const memoryUsage = getMemoryUsage();
        memoryReadings.push(memoryUsage.heapUsed);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const initialMemory = memoryReadings[0];
      const finalMemory = memoryReadings[memoryReadings.length - 1];
      const memoryIncrease = finalMemory - initialMemory;

      // Memory should not increase significantly over multiple operations
      expect(memoryIncrease).toBeLessThan(MEMORY_THRESHOLDS.LOW_USAGE);
      expect(operationCount).toBe(20);

      console.log(`Memory leak test: ${initialMemory.toFixed(2)}MB → ${finalMemory.toFixed(2)}MB (+${memoryIncrease.toFixed(2)}MB over ${operationCount} operations)`);
    });

    it('should clean up large data structures properly', async () => {
      const initialMemory = getMemoryUsage();

      // Create large nested data structure
      let largeDataStructure = {
        properties: generateTestData.properties(2000),
        leads: generateTestData.leads(1000),
        analytics: {
          marketTrends: Array(100).fill(null).map((_, i) => ({
            period: `2024-${String(i + 1).padStart(2, '0')}`,
            averagePrice: 300000 + (i * 2000),
            volume: 100 + (i * 5),
            trend: i > 50 ? 'up' : 'down'
          })),
          neighborhoodStats: Array(50).fill(null).map((_, i) => ({
            name: `Neighborhood ${i + 1}`,
            averagePrice: 250000 + (i * 10000),
            properties: Array(20).fill(null).map((_, j) => ({
              id: i * 20 + j,
              price: 200000 + (Math.random() * 200000),
              sold: Math.random() > 0.3
            }))
          }))
        },
        reports: Array(10).fill(null).map((_, i) => ({
          id: i + 1,
          title: `Report ${i + 1}`,
          data: Array(500).fill(null).map(() => ({
            metric: Math.random(),
            value: Math.random() * 1000000,
            category: ['sales', 'rentals', 'investments'][Math.floor(Math.random() * 3)]
          }))
        }))
      };

      // Process the large data structure
      const summary = {
        totalProperties: largeDataStructure.properties.length,
        totalLeads: largeDataStructure.leads.length,
        totalReports: largeDataStructure.reports.length,
        averagePropertyPrice: largeDataStructure.properties.reduce((sum, p) => sum + p.price, 0) / largeDataStructure.properties.length,
        marketTrend: largeDataStructure.analytics.marketTrends.slice(-1)[0].trend,
        topNeighborhoods: largeDataStructure.analytics.neighborhoodStats
          .sort((a, b) => b.averagePrice - a.averagePrice)
          .slice(0, 5)
          .map(n => ({ name: n.name, price: n.averagePrice }))
      };

      // Clean up the large data structure
      largeDataStructure = null as any;

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const afterCleanupMemory = getMemoryUsage();
      const memoryAfterCleanup = initialMemory.heapUsed - afterCleanupMemory.heapUsed;

      expect(summary.totalProperties).toBe(2000);
      expect(summary.totalLeads).toBe(1000);
      expect(memoryAfterCleanup).toBeGreaterThan(-MEMORY_THRESHOLDS.LOW_USAGE);

      console.log(`Large data cleanup: ${initialMemory.heapUsed.toFixed(2)}MB → ${afterCleanupMemory.heapUsed.toFixed(2)}MB (${memoryAfterCleanup > 0 ? '+' : ''}${memoryAfterCleanup.toFixed(2)}MB)`);
    });
  });

  describe('Memory Usage Patterns', () => {
    it('should maintain stable memory usage during sustained operations', async () => {
      const memoryReadings: number[] = [];
      const testDuration = 10000; // 10 seconds
      const interval = 500; // Sample every 500ms
      const samples = testDuration / interval;

      const startTime = performance.now();

      // Monitor memory during sustained operations
      const monitoringPromise = new Promise<void>((resolve) => {
        let sampleCount = 0;
        const monitorInterval = setInterval(() => {
          const memoryUsage = getMemoryUsage();
          memoryReadings.push(memoryUsage.heapUsed);

          // Perform some memory operations
          const testData = generateTestData.properties(50);
          const processed = testData.map(p => ({
            ...p,
            computed: {
              pricePerSqft: p.price / p.square_feet,
              age: new Date().getFullYear() - 2000, // Default age calculation
              value: p.price * (1 + Math.random() * 0.2)
            }
          }));

          sampleCount++;
          if (sampleCount >= samples) {
            clearInterval(monitorInterval);
            resolve();
          }
        }, interval);
      });

      await monitoringPromise;

      const endTime = performance.now();
      const actualDuration = endTime - startTime;

      // Analyze memory stability
      const initialMemory = memoryReadings[0];
      const finalMemory = memoryReadings[memoryReadings.length - 1];
      const memoryIncrease = finalMemory - initialMemory;
      const maxMemory = Math.max(...memoryReadings);
      const minMemory = Math.min(...memoryReadings);
      const memoryVariance = maxMemory - minMemory;

      expect(memoryIncrease).toBeLessThan(MEMORY_THRESHOLDS.MODERATE_USAGE);
      expect(memoryVariance).toBeLessThan(MEMORY_THRESHOLDS.LOW_USAGE);
      expect(actualDuration).toBeGreaterThan(testDuration * 0.9); // Ensure test ran for expected duration

      console.log(`Memory stability test (${samples} samples over ${(actualDuration / 1000).toFixed(1)}s):`);
      console.log(`  Initial: ${initialMemory.toFixed(2)}MB`);
      console.log(`  Final: ${finalMemory.toFixed(2)}MB`);
      console.log(`  Increase: +${memoryIncrease.toFixed(2)}MB`);
      console.log(`  Variance: ${memoryVariance.toFixed(2)}MB`);
      console.log(`  Peak: ${maxMemory.toFixed(2)}MB`);
    });
  });
});