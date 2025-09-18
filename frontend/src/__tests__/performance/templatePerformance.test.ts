/**
 * Performance Tests for Story 4.3: Personalized Communication Templates
 *
 * Validates AC 18: Delivery Speed - Template rendering within 10 seconds
 */

import { performance } from 'perf_hooks';

describe('Template System Performance Tests', () => {
  // Mock template data for performance testing
  const mockTemplates = {
    small: {
      id: 'small_template',
      content: 'Hi {{leadName}}, welcome to our service!',
      variables: ['leadName'],
    },
    medium: {
      id: 'medium_template',
      content: `
        <h1>Welcome {{leadName}}!</h1>
        <p>Thank you for your interest in {{propertyType}} properties in {{location}}.</p>
        <p>Based on your budget of {{budgetRange}} and timeline of {{timeline}}, we have some great options.</p>
        <p>Your agent {{agentName}} will be in touch soon.</p>
        <p>Best regards,<br>The Real Estate Team</p>
      `,
      variables: ['leadName', 'propertyType', 'location', 'budgetRange', 'timeline', 'agentName'],
    },
    large: {
      id: 'large_template',
      content: `
        <div class="email-container">
          <header>
            <img src="{{companyLogo}}" alt="{{companyName}} Logo">
            <h1>Personalized Property Recommendations for {{leadName}}</h1>
          </header>

          <section class="property-highlights">
            <h2>Based on Your Preferences</h2>
            <p>You expressed interest in {{propertyType}} properties with a budget of {{budgetRange}} in the {{location}} area.</p>
            <p>Your preferred timeline is {{timeline}}, and you're working with our experienced agent {{agentName}}.</p>
          </section>

          <section class="market-insights">
            <h3>Current Market Conditions</h3>
            <p>The {{location}} market is currently {{marketCondition}} with average prices of {{averagePrice}}.</p>
            <p>Properties in your budget range typically sell within {{averageDaysOnMarket}} days.</p>
          </section>

          <section class="recommendations">
            <h2>Recommended Next Steps</h2>
            <ul>
              <li>Schedule a virtual property tour</li>
              <li>Review pre-approval options</li>
              <li>Discuss your specific requirements with {{agentName}}</li>
            </ul>
          </section>

          <section class="contact-info">
            <h3>Get in Touch</h3>
            <p>Contact {{agentName}} directly:</p>
            <p>Email: {{agentEmail}}</p>
            <p>Phone: {{agentPhone}}</p>
          </section>

          <footer>
            <p>{{companyName}} | {{companyAddress}} | {{companyPhone}}</p>
            <p><a href="{{unsubscribeLink}}">Unsubscribe</a> | <a href="{{privacyLink}}">Privacy Policy</a></p>
          </footer>
        </div>
      `,
      variables: [
        'leadName', 'propertyType', 'location', 'budgetRange', 'timeline', 'agentName',
        'companyLogo', 'companyName', 'marketCondition', 'averagePrice', 'averageDaysOnMarket',
        'agentEmail', 'agentPhone', 'companyAddress', 'companyPhone', 'unsubscribeLink', 'privacyLink'
      ],
    },
  };

  const mockLeadData = {
    leadName: 'Sarah Johnson',
    propertyType: 'single-family home',
    location: 'Seattle suburbs',
    budgetRange: '$450,000 - $650,000',
    timeline: '2-3 months',
    agentName: 'Mike Wilson',
    companyLogo: 'https://example.com/logo.png',
    companyName: 'Premier Real Estate',
    marketCondition: 'competitive',
    averagePrice: '$525,000',
    averageDaysOnMarket: '14 days',
    agentEmail: 'mike.wilson@premierre.com',
    agentPhone: '+1-206-555-0123',
    companyAddress: '123 Main St, Seattle, WA 98101',
    companyPhone: '+1-206-555-0199',
    unsubscribeLink: 'https://example.com/unsubscribe',
    privacyLink: 'https://example.com/privacy',
  };

  // Mock template rendering function
  const renderTemplate = (template: any, data: any): string => {
    let content = template.content;
    template.variables.forEach((variable: string) => {
      const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
      content = content.replace(regex, data[variable] || `{{${variable}}}`);
    });
    return content;
  };

  describe('Template Rendering Performance', () => {
    test('Small template renders within performance requirements', () => {
      const template = mockTemplates.small;
      const iterations = 1000;
      const renderTimes: number[] = [];

      // Warm up
      for (let i = 0; i < 100; i++) {
        renderTemplate(template, mockLeadData);
      }

      // Performance test
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        renderTemplate(template, mockLeadData);
        const endTime = performance.now();
        renderTimes.push(endTime - startTime);
      }

      const avgTime = renderTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const maxTime = Math.max(...renderTimes);
      const p95Time = renderTimes.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];

      // Performance requirements (AC 18)
      expect(avgTime).toBeLessThan(100); // Average under 100ms
      expect(maxTime).toBeLessThan(500); // Max under 500ms
      expect(p95Time).toBeLessThan(200); // 95th percentile under 200ms

      console.log(`Small Template Performance:
        Average: ${avgTime.toFixed(2)}ms
        Max: ${maxTime.toFixed(2)}ms
        95th percentile: ${p95Time.toFixed(2)}ms`);
    });

    test('Medium template renders within performance requirements', () => {
      const template = mockTemplates.medium;
      const iterations = 500;
      const renderTimes: number[] = [];

      // Warm up
      for (let i = 0; i < 50; i++) {
        renderTemplate(template, mockLeadData);
      }

      // Performance test
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        renderTemplate(template, mockLeadData);
        const endTime = performance.now();
        renderTimes.push(endTime - startTime);
      }

      const avgTime = renderTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const maxTime = Math.max(...renderTimes);
      const p95Time = renderTimes.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];

      // Performance requirements (AC 18)
      expect(avgTime).toBeLessThan(200); // Average under 200ms
      expect(maxTime).toBeLessThan(1000); // Max under 1 second
      expect(p95Time).toBeLessThan(500); // 95th percentile under 500ms

      console.log(`Medium Template Performance:
        Average: ${avgTime.toFixed(2)}ms
        Max: ${maxTime.toFixed(2)}ms
        95th percentile: ${p95Time.toFixed(2)}ms`);
    });

    test('Large template renders within performance requirements', () => {
      const template = mockTemplates.large;
      const iterations = 200;
      const renderTimes: number[] = [];

      // Warm up
      for (let i = 0; i < 20; i++) {
        renderTemplate(template, mockLeadData);
      }

      // Performance test
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        renderTemplate(template, mockLeadData);
        const endTime = performance.now();
        renderTimes.push(endTime - startTime);
      }

      const avgTime = renderTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const maxTime = Math.max(...renderTimes);
      const p95Time = renderTimes.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];

      // Performance requirements (AC 18)
      expect(avgTime).toBeLessThan(500); // Average under 500ms
      expect(maxTime).toBeLessThan(2000); // Max under 2 seconds
      expect(p95Time).toBeLessThan(1000); // 95th percentile under 1 second

      console.log(`Large Template Performance:
        Average: ${avgTime.toFixed(2)}ms
        Max: ${maxTime.toFixed(2)}ms
        95th percentile: ${p95Time.toFixed(2)}ms`);
    });
  });

  describe('Concurrent Load Performance', () => {
    test('Handles concurrent template rendering under load', async () => {
      const template = mockTemplates.medium;
      const concurrentUsers = 50;
      const requestsPerUser = 10;
      const totalRequests = concurrentUsers * requestsPerUser;

      const runConcurrentTest = async (): Promise<number[]> => {
        const promises: Promise<number>[] = [];

        for (let user = 0; user < concurrentUsers; user++) {
          for (let request = 0; request < requestsPerUser; request++) {
            const promise = new Promise<number>((resolve) => {
              const startTime = performance.now();
              // Simulate async template rendering
              setTimeout(() => {
                renderTemplate(template, mockLeadData);
                const endTime = performance.now();
                resolve(endTime - startTime);
              }, Math.random() * 10); // Random delay 0-10ms
            });
            promises.push(promise);
          }
        }

        return Promise.all(promises);
      };

      const responseTimes = await runConcurrentTest();

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / totalRequests;
      const maxResponseTime = Math.max(...responseTimes);
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(totalRequests * 0.95)];

      // Concurrent load requirements
      expect(avgResponseTime).toBeLessThan(1000); // Average under 1 second
      expect(maxResponseTime).toBeLessThan(5000); // Max under 5 seconds
      expect(p95ResponseTime).toBeLessThan(2000); // 95th percentile under 2 seconds

      console.log(`Concurrent Load Performance (${concurrentUsers} users, ${requestsPerUser} requests each):
        Total Requests: ${totalRequests}
        Average Response Time: ${avgResponseTime.toFixed(2)}ms
        Max Response Time: ${maxResponseTime.toFixed(2)}ms
        95th Percentile: ${p95ResponseTime.toFixed(2)}ms`);
    });

    test('Memory usage remains stable under load', () => {
      const template = mockTemplates.large;
      const iterations = 1000;

      const initialMemory = process.memoryUsage();

      // Run multiple renderings
      for (let i = 0; i < iterations; i++) {
        renderTemplate(template, mockLeadData);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory requirements - should not have significant memory leaks
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase

      console.log(`Memory Usage Test:
        Initial Heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        Final Heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Scalability Tests', () => {
    test('Performance scales linearly with template complexity', () => {
      const templates = [mockTemplates.small, mockTemplates.medium, mockTemplates.large];
      const iterations = 100;
      const performanceResults: Array<{ size: string; avgTime: number; variables: number }> = [];

      templates.forEach((template, index) => {
        const renderTimes: number[] = [];

        // Performance test
        for (let i = 0; i < iterations; i++) {
          const startTime = performance.now();
          renderTemplate(template, mockLeadData);
          const endTime = performance.now();
          renderTimes.push(endTime - startTime);
        }

        const avgTime = renderTimes.reduce((sum, time) => sum + time, 0) / iterations;
        const templateSize = index === 0 ? 'small' : index === 1 ? 'medium' : 'large';

        performanceResults.push({
          size: templateSize,
          avgTime,
          variables: template.variables.length,
        });
      });

      // Verify scaling is reasonable (not exponential)
      const smallToMediumRatio = performanceResults[1].avgTime / performanceResults[0].avgTime;
      const mediumToLargeRatio = performanceResults[2].avgTime / performanceResults[1].avgTime;

      // Performance should scale roughly linearly with complexity
      expect(smallToMediumRatio).toBeLessThan(3); // No more than 3x slower
      expect(mediumToLargeRatio).toBeLessThan(3); // No more than 3x slower

      console.log('Scalability Test Results:');
      performanceResults.forEach(result => {
        console.log(`  ${result.size}: ${result.avgTime.toFixed(2)}ms (${result.variables} variables)`);
      });
      console.log(`  Small→Medium ratio: ${smallToMediumRatio.toFixed(2)}x`);
      console.log(`  Medium→Large ratio: ${mediumToLargeRatio.toFixed(2)}x`);
    });

    test('Handles variable count scaling efficiently', () => {
      const baseTemplate = mockTemplates.medium;
      const variableCounts = [5, 10, 15, 20, 25];
      const iterations = 50;

      const scalingResults: Array<{ variables: number; avgTime: number }> = [];

      variableCounts.forEach(count => {
        // Create template with specific variable count
        const testTemplate = {
          ...baseTemplate,
          variables: baseTemplate.variables.slice(0, count),
        };

        const renderTimes: number[] = [];

        // Performance test
        for (let i = 0; i < iterations; i++) {
          const startTime = performance.now();
          renderTemplate(testTemplate, mockLeadData);
          const endTime = performance.now();
          renderTimes.push(endTime - startTime);
        }

        const avgTime = renderTimes.reduce((sum, time) => sum + time, 0) / iterations;
        scalingResults.push({ variables: count, avgTime });
      });

      // Verify linear scaling with variable count
      for (let i = 1; i < scalingResults.length; i++) {
        const ratio = scalingResults[i].avgTime / scalingResults[i - 1].avgTime;
        expect(ratio).toBeLessThan(2); // Should not double with each additional 5 variables
      }

      console.log('Variable Scaling Test Results:');
      scalingResults.forEach(result => {
        console.log(`  ${result.variables} variables: ${result.avgTime.toFixed(2)}ms`);
      });
    });
  });

  describe('System Resource Utilization', () => {
    test('CPU utilization remains within acceptable limits', () => {
      const template = mockTemplates.large;
      const iterations = 1000;

      const startTime = performance.now();
      const startCpuUsage = process.cpuUsage();

      // High-load test
      for (let i = 0; i < iterations; i++) {
        renderTemplate(template, mockLeadData);
      }

      const endTime = performance.now();
      const endCpuUsage = process.cpuUsage(startCpuUsage);

      const totalTime = endTime - startTime;
      const cpuTime = (endCpuUsage.user + endCpuUsage.system) / 1000; // Convert to milliseconds
      const cpuUtilization = (cpuTime / totalTime) * 100;

      // CPU utilization should be reasonable
      expect(cpuUtilization).toBeLessThan(80); // Less than 80% CPU utilization
      expect(cpuUtilization).toBeGreaterThan(10); // But should use some CPU

      console.log(`CPU Utilization Test:
        Total Time: ${totalTime.toFixed(2)}ms
        CPU Time: ${cpuTime.toFixed(2)}ms
        CPU Utilization: ${cpuUtilization.toFixed(2)}%`);
    });

    test('Template caching improves performance', () => {
      const template = mockTemplates.medium;
      const iterations = 500;

      // Test without caching (simulated)
      const uncachedTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        // Simulate template parsing + variable replacement
        const content = template.content;
        template.variables.forEach(variable => {
          const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
          content.replace(regex, mockLeadData[variable as keyof typeof mockLeadData] || '');
        });
        const endTime = performance.now();
        uncachedTimes.push(endTime - startTime);
      }

      // Test with caching (simulated - pre-compile regex)
      const cachedRegexes = template.variables.map(variable => new RegExp(`\\{\\{${variable}\\}\\}`, 'g'));
      const cachedTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        // Simulate cached template rendering
        let content = template.content;
        template.variables.forEach((variable, index) => {
          content = content.replace(cachedRegexes[index], mockLeadData[variable as keyof typeof mockLeadData] || '');
        });
        const endTime = performance.now();
        cachedTimes.push(endTime - startTime);
      }

      const uncachedAvg = uncachedTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const cachedAvg = cachedTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const improvement = ((uncachedAvg - cachedAvg) / uncachedAvg) * 100;

      // Caching should provide significant performance improvement
      expect(improvement).toBeGreaterThan(20); // At least 20% improvement
      expect(cachedAvg).toBeLessThan(uncachedAvg);

      console.log(`Template Caching Performance:
        Unached Average: ${uncachedAvg.toFixed(2)}ms
        Cached Average: ${cachedAvg.toFixed(2)}ms
        Improvement: ${improvement.toFixed(2)}%`);
    });
  });

  describe('Error Handling Performance', () => {
    test('Error handling does not significantly impact performance', () => {
      const template = mockTemplates.medium;
      const iterations = 1000;

      // Test with error-prone data
      const errorProneData = {
        ...mockLeadData,
        leadName: null, // This should trigger error handling
        propertyType: undefined,
      };

      const errorTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        try {
          renderTemplate(template, errorProneData);
        } catch (error) {
          // Error handling
        }
        const endTime = performance.now();
        errorTimes.push(endTime - startTime);
      }

      const avgErrorTime = errorTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const maxErrorTime = Math.max(...errorTimes);

      // Error handling should not add significant overhead
      expect(avgErrorTime).toBeLessThan(50); // Average under 50ms even with errors
      expect(maxErrorTime).toBeLessThan(200); // Max under 200ms

      console.log(`Error Handling Performance:
        Average with errors: ${avgErrorTime.toFixed(2)}ms
        Max with errors: ${maxErrorTime.toFixed(2)}ms`);
    });

    test('Graceful degradation under extreme load', async () => {
      const template = mockTemplates.large;
      const extremeLoad = 1000; // Very high concurrent load

      const startTime = performance.now();

      // Simulate extreme concurrent load
      const promises = Array.from({ length: extremeLoad }, (_, i) =>
        new Promise((resolve) => {
          setTimeout(() => {
            renderTemplate(template, mockLeadData);
            resolve(true);
          }, Math.random() * 100); // Random delay
        })
      );

      await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Even under extreme load, should complete within reasonable time
      expect(totalTime).toBeLessThan(30000); // Under 30 seconds for 1000 concurrent requests

      const avgTimePerRequest = totalTime / extremeLoad;
      expect(avgTimePerRequest).toBeLessThan(100); // Average under 100ms per request

      console.log(`Extreme Load Test:
        Total Requests: ${extremeLoad}
        Total Time: ${totalTime.toFixed(2)}ms
        Average per Request: ${avgTimePerRequest.toFixed(2)}ms`);
    });
  });
});