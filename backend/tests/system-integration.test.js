/**
 * System Integration Tests
 * Comprehensive end-to-end testing for all completed stories
 */

const request = require('supertest');
const { createTestDatabase, closeTestDatabase } = require('../test-database');
const app = require('../src/server');
const { MLScoringService } = require('../src/services/ml/MLScoringService');
const { EnrichmentService } = require('../src/services/enrichment/EnrichmentService');
const { WorkflowService } = require('../src/services/workflow/WorkflowService');

describe('System Integration Tests', () => {
  let testDb;
  let agent;
  let testLeadId;
  let authToken;

  beforeAll(async () => {
    // Set up test database and environment
    testDb = await createTestDatabase();
    agent = request.agent(app);

    // Create test user and get auth token
    const loginResponse = await agent
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword'
      });

    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
    } else {
      // Create test user if doesn't exist
      await agent
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'testpassword',
          name: 'Test User'
        });

      const loginResponse = await agent
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword'
        });

      authToken = loginResponse.body.token;
    }
  });

  afterAll(async () => {
    await closeTestDatabase(testDb);
  });

  describe('Complete Lead Lifecycle Integration', () => {
    test('Scenario 1: Lead Creation → ML Scoring → Enrichment → Workflow → Dashboard', async () => {
      // Step 1: Create new lead
      const leadData = {
        name: 'John Smith',
        email: 'john.smith@email.com',
        phone: '+1-555-0123',
        budget: 500000,
        timeline: '3-6 months',
        propertyType: 'single-family',
        location: 'Downtown Seattle'
      };

      const createResponse = await agent
        .post('/api/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(leadData)
        .expect(201);

      testLeadId = createResponse.body.id;
      expect(testLeadId).toBeDefined();

      // Step 2: Verify ML scoring triggers automatically
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for async processing

      const scoreResponse = await agent
        .get(`/api/leads/${testLeadId}/score`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(scoreResponse.body.score).toBeDefined();
      expect(scoreResponse.body.confidence).toBeGreaterThan(0);
      expect(scoreResponse.body.score).toBeGreaterThanOrEqual(0);
      expect(scoreResponse.body.score).toBeLessThanOrEqual(100);

      // Step 3: Verify lead enrichment is triggered
      const enrichmentResponse = await agent
        .get(`/api/leads/${testLeadId}/enrichment`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Enrichment might be pending or completed
      expect(['pending', 'completed', 'failed']).toContain(enrichmentResponse.body.status);

      // Step 4: Check if workflow is triggered based on score
      const workflowResponse = await agent
        .get(`/api/workflows/lead/${testLeadId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should have at least one workflow if score is above threshold
      if (scoreResponse.body.score > 50) {
        expect(workflowResponse.body.length).toBeGreaterThan(0);
      }

      // Step 5: Verify dashboard data includes the new lead
      const dashboardResponse = await agent
        .get('/api/dashboard/leads/insights')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const leadInDashboard = dashboardResponse.body.find(lead => lead.leadId === testLeadId);
      expect(leadInDashboard).toBeDefined();
      expect(leadInDashboard.currentScore).toBe(scoreResponse.body.score);

      // Step 6: Test real-time updates (simulate WebSocket)
      const updateResponse = await agent
        .put(`/api/leads/${testLeadId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ budget: 600000 })
        .expect(200);

      // Wait for real-time processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify score updates
      const updatedScoreResponse = await agent
        .get(`/api/leads/${testLeadId}/score`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Score should be different after budget update
      expect(updatedScoreResponse.body.score).not.toBe(scoreResponse.body.score);
    }, 30000); // 30 second timeout for integration test

    test('Scenario 2: Bulk Lead Processing Performance', async () => {
      const bulkLeads = Array.from({ length: 100 }, (_, i) => ({
        name: `Bulk Lead ${i}`,
        email: `bulk${i}@example.com`,
        phone: `+1-555-0${String(i).padStart(3, '0')}`,
        budget: 300000 + (i * 10000),
        timeline: i % 2 === 0 ? '1-3 months' : '3-6 months',
        propertyType: 'single-family',
        location: 'Seattle Area'
      }));

      const startTime = Date.now();

      // Create bulk leads
      const bulkCreatePromises = bulkLeads.map(lead =>
        agent
          .post('/api/leads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(lead)
      );

      const bulkResponses = await Promise.all(bulkCreatePromises);
      const bulkCreateTime = Date.now() - startTime;

      // Verify all leads created successfully
      bulkResponses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.id).toBeDefined();
      });

      // Performance check: Should create 100 leads in reasonable time
      expect(bulkCreateTime).toBeLessThan(30000); // 30 seconds max

      // Wait for ML processing
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify ML scoring for bulk leads
      const leadIds = bulkResponses.map(r => r.body.id);
      const scoringPromises = leadIds.slice(0, 10).map(id => // Test first 10
        agent
          .get(`/api/leads/${id}/score`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const scoringResponses = await Promise.all(scoringPromises);
      scoringResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.score).toBeDefined();
      });

      // Verify dashboard can handle bulk data
      const dashboardStartTime = Date.now();
      const dashboardResponse = await agent
        .get('/api/dashboard/leads/insights')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const dashboardLoadTime = Date.now() - dashboardStartTime;
      expect(dashboardLoadTime).toBeLessThan(3000); // 3 seconds max
      expect(dashboardResponse.body.length).toBeGreaterThan(100); // Should include our bulk leads
    }, 60000); // 60 second timeout for bulk test

    test('Scenario 3: Error Handling and Recovery', async () => {
      // Create lead with invalid data to test error handling
      const invalidLeadData = {
        name: '', // Invalid: empty name
        email: 'invalid-email', // Invalid: malformed email
        phone: 'invalid-phone',
        budget: -1000, // Invalid: negative budget
        propertyType: 'invalid-type'
      };

      const errorResponse = await agent
        .post('/api/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidLeadData)
        .expect(400);

      expect(errorResponse.body.errors).toBeDefined();
      expect(errorResponse.body.errors.length).toBeGreaterThan(0);

      // Test with valid data
      const validLeadData = {
        name: 'Error Test Lead',
        email: 'error.test@example.com',
        phone: '+1-555-9999',
        budget: 400000,
        timeline: '1-3 months',
        propertyType: 'condo',
        location: 'Bellevue, WA'
      };

      const successResponse = await agent
        .post('/api/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validLeadData)
        .expect(201);

      const errorTestLeadId = successResponse.body.id;

      // Verify system recovers and processes the valid lead
      await new Promise(resolve => setTimeout(resolve, 2000));

      const scoreResponse = await agent
        .get(`/api/leads/${errorTestLeadId}/score`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(scoreResponse.body.score).toBeDefined();
      expect(scoreResponse.body.score).toBeGreaterThanOrEqual(0);
      expect(scoreResponse.body.score).toBeLessThanOrEqual(100);
    }, 15000);

    test('Scenario 4: Data Consistency Across Stories', async () => {
      // Create a test lead
      const consistencyLeadData = {
        name: 'Consistency Test Lead',
        email: 'consistency.test@example.com',
        phone: '+1-555-7777',
        budget: 450000,
        timeline: '2-4 months',
        propertyType: 'townhouse',
        location: 'Kirkland, WA'
      };

      const createResponse = await agent
        .post('/api/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(consistencyLeadData)
        .expect(201);

      const consistencyLeadId = createResponse.body.id;

      // Wait for all async processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check data consistency across all services
      const [scoreData, enrichmentData, workflowData, dashboardData] = await Promise.all([
        agent.get(`/api/leads/${consistencyLeadId}/score`).set('Authorization', `Bearer ${authToken}`),
        agent.get(`/api/leads/${consistencyLeadId}/enrichment`).set('Authorization', `Bearer ${authToken}`),
        agent.get(`/api/workflows/lead/${consistencyLeadId}`).set('Authorization', `Bearer ${authToken}`),
        agent.get('/api/dashboard/leads/insights').set('Authorization', `Bearer ${authToken}`)
      ]);

      // Verify score data consistency
      expect(scoreData.status).toBe(200);
      expect(scoreData.body.score).toBeDefined();

      // Verify enrichment data (may be pending)
      expect([200, 202]).toContain(enrichmentData.status);

      // Verify workflow data
      expect(workflowData.status).toBe(200);
      expect(Array.isArray(workflowData.body)).toBe(true);

      // Verify dashboard includes the lead
      expect(dashboardData.status).toBe(200);
      const leadInDashboard = dashboardData.body.find(lead => lead.leadId === consistencyLeadId);
      expect(leadInDashboard).toBeDefined();

      // Cross-reference data consistency
      if (leadInDashboard) {
        expect(leadInDashboard.currentScore).toBe(scoreData.body.score);
        expect(leadInDashboard.name).toBe(consistencyLeadData.name);
        expect(leadInDashboard.email).toBe(consistencyLeadData.email);
      }
    }, 20000);
  });

  describe('Performance Integration Tests', () => {
    test('Dashboard Load Performance', async () => {
      const startTime = Date.now();

      const dashboardResponse = await agent
        .get('/api/dashboard/leads/insights')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const loadTime = Date.now() - startTime;

      // Performance requirement: <2 seconds
      expect(loadTime).toBeLessThan(2000);
      expect(dashboardResponse.body.length).toBeGreaterThan(0);
    });

    test('ML Scoring Response Time', async () => {
      // Use existing test lead or create new one
      const leadId = testLeadId || 1;

      const startTime = Date.now();

      const scoreResponse = await agent
        .get(`/api/leads/${leadId}/score`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;

      // Performance requirement: <5 seconds
      expect(responseTime).toBeLessThan(5000);
      expect(scoreResponse.body.score).toBeDefined();
    });

    test('Concurrent API Requests', async () => {
      const concurrentRequests = 50;
      const requestPromises = Array.from({ length: concurrentRequests }, () =>
        agent
          .get('/api/dashboard/leads/insights')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requestPromises);
      const totalTime = Date.now() - startTime;

      // Verify all requests succeeded
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Performance check: Average response time should be reasonable
      const avgResponseTime = totalTime / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(1000); // 1 second average
    }, 30000);
  });

  describe('Security Integration Tests', () => {
    test('Authentication Required for All Endpoints', async () => {
      const endpoints = [
        '/api/leads',
        '/api/dashboard/leads/insights',
        '/api/ml/scoring/lead/1',
        '/api/enrichment/lead/1',
        '/api/workflows'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(401);

        expect(response.body.message).toContain('authentication');
      }
    });

    test('Invalid Token Rejection', async () => {
      const response = await agent
        .get('/api/dashboard/leads/insights')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toContain('invalid');
    });

    test('Data Privacy and Access Control', async () => {
      // This would require setting up multiple test users
      // For now, verify basic access control is in place
      const leadResponse = await agent
        .get('/api/leads/99999') // Non-existent lead
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(leadResponse.body.message).toContain('not found');
    });
  });
});