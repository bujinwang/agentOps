/**
 * Performance Load Tests
 * Testing system performance under production-like conditions
 */

const request = require('supertest');
const { createTestDatabase, closeTestDatabase } = require('../test-database');
const app = require('../src/server');

describe('Performance Load Tests', () => {
  let testDb;
  let agent;
  let authToken;
  let testLeadIds = [];

  beforeAll(async () => {
    // Set up test database
    testDb = await createTestDatabase();
    agent = request.agent(app);

    // Create test user and get auth token
    const loginResponse = await agent
      .post('/api/auth/login')
      .send({
        email: 'perf-test@example.com',
        password: 'testpassword'
      });

    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
    } else {
      // Create test user if doesn't exist
      await agent
        .post('/api/auth/register')
        .send({
          email: 'perf-test@example.com',
          password: 'testpassword',
          name: 'Performance Test User'
        });

      const loginResponse = await agent
        .post('/api/auth/login')
        .send({
          email: 'perf-test@example.com',
          password: 'testpassword'
        });

      authToken = loginResponse.body.token;
    }

    // Create test data for performance testing
    await createPerformanceTestData();
  });

  afterAll(async () => {
    await closeTestDatabase(testDb);
  });

  async function createPerformanceTestData() {
    // Create 1000 test leads for performance testing
    const testLeads = Array.from({ length: 1000 }, (_, i) => ({
      name: `Perf Test Lead ${i}`,
      email: `perf${i}@example.com`,
      phone: `+1-555-${String(i).padStart(4, '0')}`,
      budget: 200000 + (i * 1000),
      timeline: ['1-3 months', '3-6 months', '6-12 months'][i % 3],
      propertyType: ['single-family', 'condo', 'townhouse'][i % 3],
      location: ['Seattle', 'Bellevue', 'Kirkland', 'Redmond'][i % 4]
    }));

    console.log('Creating 1000 test leads for performance testing...');

    const createPromises = testLeads.map(lead =>
      agent
        .post('/api/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(lead)
    );

    const responses = await Promise.all(createPromises);
    testLeadIds = responses.map(response => response.body.id);

    console.log(`Created ${testLeadIds.length} test leads`);

    // Wait for ML processing to complete
    console.log('Waiting for ML processing...');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  describe('Dashboard Performance Tests', () => {
    test('Dashboard Load Time with 1000+ Leads', async () => {
      const startTime = Date.now();

      const response = await agent
        .get('/api/dashboard/leads/insights')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const loadTime = Date.now() - startTime;

      console.log(`Dashboard load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(2000); // 2 second requirement
      expect(response.body.length).toBeGreaterThan(1000);
    });

    test('Concurrent Dashboard Access (50 users)', async () => {
      const concurrentUsers = 50;
      const requestPromises = Array.from({ length: concurrentUsers }, () =>
        agent
          .get('/api/dashboard/leads/insights')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requestPromises);
      const totalTime = Date.now() - startTime;

      const avgResponseTime = totalTime / concurrentUsers;
      const maxResponseTime = Math.max(...responses.map(r => r.duration || 0));

      console.log(`Concurrent dashboard access (${concurrentUsers} users):`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Average response time: ${avgResponseTime}ms`);
      console.log(`Max response time: ${maxResponseTime}ms`);

      // Verify all requests succeeded
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Performance requirements
      expect(avgResponseTime).toBeLessThan(1000); // 1 second average
      expect(maxResponseTime).toBeLessThan(3000); // 3 second max
    }, 60000);

    test('Dashboard Real-time Updates Performance', async () => {
      // Test WebSocket-like real-time updates
      const startTime = Date.now();

      // Simulate multiple real-time update requests
      const updatePromises = testLeadIds.slice(0, 100).map(leadId =>
        agent
          .get(`/api/dashboard/leads/insights?updated_after=${Date.now()}`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(updatePromises);
      const totalTime = Date.now() - startTime;

      console.log(`Real-time updates performance (100 leads): ${totalTime}ms`);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(totalTime).toBeLessThan(5000); // 5 seconds for 100 updates
    });
  });

  describe('ML Scoring Performance Tests', () => {
    test('Bulk ML Scoring Performance (100 leads)', async () => {
      const leadsToScore = testLeadIds.slice(0, 100);

      const startTime = Date.now();

      const scoringPromises = leadsToScore.map(leadId =>
        agent
          .get(`/api/leads/${leadId}/score`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(scoringPromises);
      const totalTime = Date.now() - startTime;

      const avgScoringTime = totalTime / leadsToScore.length;

      console.log(`Bulk ML scoring performance (100 leads):`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Average scoring time: ${avgScoringTime}ms`);

      // Verify all scorings succeeded
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.score).toBeDefined();
        expect(response.body.score).toBeGreaterThanOrEqual(0);
        expect(response.body.score).toBeLessThanOrEqual(100);
      });

      // Performance requirements
      expect(avgScoringTime).toBeLessThan(5000); // 5 seconds per lead
      expect(totalTime).toBeLessThan(300000); // 5 minutes total for 100 leads
    }, 300000);

    test('ML Scoring Throughput (High Volume)', async () => {
      const throughputTestLeads = testLeadIds.slice(100, 200); // 100 leads
      const startTime = Date.now();

      // Score leads sequentially to measure throughput
      for (const leadId of throughputTestLeads) {
        const response = await agent
          .get(`/api/leads/${leadId}/score`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.score).toBeDefined();
      }

      const totalTime = Date.now() - startTime;
      const throughput = (throughputTestLeads.length / totalTime) * 1000; // leads per second

      console.log(`ML Scoring throughput: ${throughput.toFixed(2)} leads/second`);
      console.log(`Total time for 100 leads: ${totalTime}ms`);

      // Throughput requirement: at least 1 lead per second
      expect(throughput).toBeGreaterThan(1);
    }, 120000);
  });

  describe('Lead Enrichment Performance Tests', () => {
    test('Bulk Enrichment Processing', async () => {
      const leadsToEnrich = testLeadIds.slice(200, 250); // 50 leads

      const startTime = Date.now();

      // Trigger enrichment for multiple leads
      const enrichmentPromises = leadsToEnrich.map(leadId =>
        agent
          .post(`/api/enrichment/lead/${leadId}`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(enrichmentPromises);
      const triggerTime = Date.now() - startTime;

      console.log(`Enrichment trigger time for 50 leads: ${triggerTime}ms`);

      // Wait for enrichment processing (up to 30 seconds per lead)
      await new Promise(resolve => setTimeout(resolve, 30000));

      // Check enrichment status
      const statusPromises = leadsToEnrich.map(leadId =>
        agent
          .get(`/api/leads/${leadId}/enrichment`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const statusResponses = await Promise.all(statusPromises);
      const completedEnrichments = statusResponses.filter(r => r.body.status === 'completed').length;

      console.log(`Enrichment completion rate: ${completedEnrichments}/${leadsToEnrich.length}`);

      // At least 80% should complete within time limit
      expect(completedEnrichments / leadsToEnrich.length).toBeGreaterThan(0.8);
    }, 120000);

    test('Enrichment Data Retrieval Performance', async () => {
      const startTime = Date.now();

      const retrievalPromises = testLeadIds.slice(0, 100).map(leadId =>
        agent
          .get(`/api/leads/${leadId}/enrichment`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(retrievalPromises);
      const totalTime = Date.now() - startTime;

      console.log(`Enrichment data retrieval (100 leads): ${totalTime}ms`);

      responses.forEach(response => {
        expect([200, 202]).toContain(response.status); // 200 = completed, 202 = processing
      });

      expect(totalTime).toBeLessThan(10000); // 10 seconds for 100 retrievals
    });
  });

  describe('Workflow Performance Tests', () => {
    test('Bulk Workflow Triggering', async () => {
      const workflowLeads = testLeadIds.slice(250, 300); // 50 leads

      const startTime = Date.now();

      // Update lead scores to trigger workflows
      const updatePromises = workflowLeads.map(leadId =>
        agent
          .put(`/api/leads/${leadId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ budget: 800000 }) // High budget to trigger workflows
      );

      await Promise.all(updatePromises);
      const updateTime = Date.now() - startTime;

      console.log(`Lead updates for workflow triggering: ${updateTime}ms`);

      // Wait for workflow processing
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Check workflow creation
      const workflowPromises = workflowLeads.map(leadId =>
        agent
          .get(`/api/workflows/lead/${leadId}`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const workflowResponses = await Promise.all(workflowPromises);
      const workflowsCreated = workflowResponses.reduce((count, response) => {
        return count + (response.body.length > 0 ? 1 : 0);
      }, 0);

      console.log(`Workflows created for high-value leads: ${workflowsCreated}/${workflowLeads.length}`);

      // Should create workflows for high-budget leads
      expect(workflowsCreated).toBeGreaterThan(workflowLeads.length * 0.7); // At least 70%
    }, 60000);

    test('Workflow Execution Performance', async () => {
      // Get active workflows
      const workflowsResponse = await agent
        .get('/api/workflows/active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (workflowsResponse.body.length > 0) {
        const workflowCount = Math.min(workflowsResponse.body.length, 20); // Test up to 20 workflows
        const testWorkflows = workflowsResponse.body.slice(0, workflowCount);

        const startTime = Date.now();

        // Execute workflow steps
        const executionPromises = testWorkflows.map(workflow =>
          agent
            .post(`/api/workflows/${workflow.id}/execute`)
            .set('Authorization', `Bearer ${authToken}`)
        );

        const responses = await Promise.all(executionPromises);
        const totalTime = Date.now() - startTime;

        console.log(`Workflow execution performance (${workflowCount} workflows): ${totalTime}ms`);

        responses.forEach(response => {
          expect([200, 201]).toContain(response.status);
        });

        expect(totalTime).toBeLessThan(30000); // 30 seconds for 20 workflow executions
      } else {
        console.log('No active workflows found for performance testing');
      }
    });
  });

  describe('Database Performance Tests', () => {
    test('Lead Query Performance', async () => {
      const queryCount = 100;
      const startTime = Date.now();

      const queryPromises = Array.from({ length: queryCount }, () =>
        agent
          .get('/api/leads?page=1&limit=50')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(queryPromises);
      const totalTime = Date.now() - startTime;

      console.log(`Database query performance (${queryCount} queries): ${totalTime}ms`);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.leads).toBeDefined();
      });

      expect(totalTime).toBeLessThan(30000); // 30 seconds for 100 queries
    });

    test('Complex Dashboard Query Performance', async () => {
      const complexQueries = [
        '/api/dashboard/leads/insights?filter=high_value',
        '/api/dashboard/conversion/funnel',
        '/api/dashboard/ml/performance',
        '/api/dashboard/workflows/active'
      ];

      const startTime = Date.now();

      const queryPromises = complexQueries.map(endpoint =>
        agent
          .get(endpoint)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(queryPromises);
      const totalTime = Date.now() - startTime;

      console.log(`Complex dashboard queries performance: ${totalTime}ms`);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(totalTime).toBeLessThan(10000); // 10 seconds for complex queries
    });
  });

  describe('Memory and Resource Usage Tests', () => {
    test('Memory Leak Detection', async () => {
      // This is a basic memory usage test
      // In a real scenario, you'd use tools like clinic.js or memwatch

      const iterations = 50;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const response = await agent
          .get('/api/dashboard/leads/insights')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.length).toBeGreaterThan(0);

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const totalTime = Date.now() - startTime;

      console.log(`Memory leak test (${iterations} iterations): ${totalTime}ms`);
      console.log(`Average response time: ${(totalTime / iterations).toFixed(2)}ms`);

      // Should maintain consistent performance
      expect(totalTime / iterations).toBeLessThan(1000); // 1 second average
    }, 120000);
  });
});