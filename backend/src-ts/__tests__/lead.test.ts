import request from 'supertest';
import app from '../app';
import { query } from '../config/database';

describe('Lead API', () => {
  let authToken: string;
  let userId: number;
  let testLeadId: number;

  // Setup: Create a test user and get auth token
  beforeAll(async () => {
    // Clean up any existing test data
    await query('DELETE FROM leads WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE $1)', ['testlead%@example.com']);
    await query('DELETE FROM users WHERE email LIKE $1', ['testlead%@example.com']);

    // Create test user
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'testleaduser@example.com',
        password: 'testPass123',
        firstName: 'Lead',
        lastName: 'Tester',
      });

    authToken = registerResponse.body.data.accessToken;
    userId = registerResponse.body.data.user.userId;
  });

  // Cleanup after all tests
  afterAll(async () => {
    await query('DELETE FROM leads WHERE user_id = $1', [userId]);
    await query('DELETE FROM users WHERE user_id = $1', [userId]);
    
    // Close database connection
    const pool = (await import('../config/database')).default;
    await pool.end();
  });

  describe('POST /api/v1/leads', () => {
    it('should create a new lead with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@example.com',
          phoneNumber: '+1-555-0100',
          source: 'website',
          status: 'New',
          priority: 'High',
          budgetMin: 400000,
          budgetMax: 600000,
          notes: 'Looking for a 3-bedroom house',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('John');
      expect(response.body.data.lastName).toBe('Smith');
      expect(response.body.data.email).toBe('john.smith@example.com');
      expect(response.body.data.userId).toBe(userId);
      expect(response.body.data.leadId).toBeDefined();

      testLeadId = response.body.data.leadId;
    });

    it('should create lead without optional fields', async () => {
      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('Jane');
      expect(response.body.data.lastName).toBe('Doe');
      expect(response.body.data.status).toBe('New');
      expect(response.body.data.priority).toBe('Medium');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/leads')
        .send({
          firstName: 'Test',
          lastName: 'Lead',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing firstName', async () => {
      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lastName: 'Doe',
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Test',
          lastName: 'Lead',
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for negative budget', async () => {
      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Test',
          lastName: 'Lead',
          budgetMin: -1000,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/leads/:id', () => {
    it('should get a specific lead', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.leadId).toBe(testLeadId);
      expect(response.body.data.firstName).toBe('John');
      expect(response.body.data.lastName).toBe('Smith');
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .get('/api/v1/leads/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('LEAD_NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/leads', () => {
    beforeAll(async () => {
      // Create multiple leads for testing pagination
      await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'Lead', lastName: 'One', status: 'New', priority: 'Low' });
      
      await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'Lead', lastName: 'Two', status: 'Contacted', priority: 'Medium' });
      
      await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'Lead', lastName: 'Three', status: 'Qualified', priority: 'High', budgetMin: 250000, budgetMax: 350000 });
    });

    it('should get all leads with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.leads).toBeInstanceOf(Array);
      expect(response.body.data.leads.length).toBeGreaterThan(0);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
      expect(response.body.data.pagination.total).toBeGreaterThan(0);
    });

    it('should filter leads by status', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'Qualified' });

      expect(response.status).toBe(200);
      expect(response.body.data.leads).toBeInstanceOf(Array);
      expect(response.body.data.leads.every((lead: any) => lead.status === 'Qualified')).toBe(true);
    });

    it('should filter leads by priority', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ priority: 'High' });

      expect(response.status).toBe(200);
      expect(response.body.data.leads.every((lead: any) => lead.priority === 'High')).toBe(true);
    });

    it('should search leads by name', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: 'John' });

      expect(response.status).toBe(200);
      expect(response.body.data.leads).toBeInstanceOf(Array);
      expect(response.body.data.leads.some((lead: any) => 
        lead.firstName?.includes('John') || lead.lastName?.includes('John')
      )).toBe(true);
    });

    it('should sort leads by first name ascending', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ sortBy: 'first_name', sortOrder: 'ASC' });

      expect(response.status).toBe(200);
      const names = response.body.data.leads.map((lead: any) => lead.firstName);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('should filter by budget range', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ minBudget: 200000, maxBudget: 600000 });

      expect(response.status).toBe(200);
      expect(response.body.data.leads.every((lead: any) => 
        (lead.budgetMin === null && lead.budgetMax === null) || 
        (lead.budgetMin >= 200000 || lead.budgetMax >= 200000)
      )).toBe(true);
    });

    it('should return 400 for invalid page number', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/v1/leads/:id', () => {
    it('should update a lead', async () => {
      const response = await request(app)
        .put(`/api/v1/leads/${testLeadId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Smith Updated',
          status: 'Contacted',
          priority: 'Medium',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('John');
      expect(response.body.data.lastName).toBe('Smith Updated');
      expect(response.body.data.status).toBe('Contacted');
      expect(response.body.data.priority).toBe('Medium');
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .put('/api/v1/leads/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LEAD_NOT_FOUND');
    });

    it('should return 400 for invalid email in update', async () => {
      const response = await request(app)
        .put(`/api/v1/leads/${testLeadId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/leads/stats', () => {
    it('should get lead statistics by status', async () => {
      const response = await request(app)
        .get('/api/v1/leads/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(typeof response.body.data).toBe('object');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/leads/stats');

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/leads/:id', () => {
    let deleteLeadId: number;

    beforeAll(async () => {
      const createResponse = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Lead',
          lastName: 'ToDelete',
        });
      
      deleteLeadId = createResponse.body.data.leadId;
    });

    it('should delete a lead', async () => {
      const response = await request(app)
        .delete(`/api/v1/leads/${deleteLeadId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify it's deleted
      const getResponse = await request(app)
        .get(`/api/v1/leads/${deleteLeadId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .delete('/api/v1/leads/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LEAD_NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete(`/api/v1/leads/${testLeadId}`);

      expect(response.status).toBe(401);
    });
  });
});
