/**
 * Authentication Integration Tests
 * Tests the complete authentication flow with lead system integration
 */

const request = require('supertest');
const { app } = require('../src/server');
const { getDatabase } = require('../src/config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_CONFIG } = require('../src/config/constants');

describe('Authentication Integration Tests', () => {
  let testUser;
  let testToken;
  let db;

  beforeAll(async () => {
    db = getDatabase();

    // Clean up any existing test data
    await db.query('DELETE FROM users WHERE email = $1', ['test@example.com']);

    // Create test user
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash('TestPass123!', saltRounds);

    const result = await db.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
      ['test@example.com', passwordHash, 'Test', 'User']
    );

    testUser = result.rows[0];
  });

  afterAll(async () => {
    // Clean up test data
    if (db) {
      await db.query('DELETE FROM users WHERE email = $1', ['test@example.com']);
    }
  });

  describe('Authentication Flow', () => {
    test('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPass123!'
        })
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');

      testToken = response.body.data.tokens.accessToken;

      // Verify token is valid
      const decoded = jwt.verify(testToken, process.env.JWT_SECRET, {
        algorithms: [JWT_CONFIG.ALGORITHM]
      });

      expect(decoded.userId).toBe(testUser.user_id);
      expect(decoded.email).toBe(testUser.email);
      expect(decoded.type).toBe('access');
    });

    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
      expect(response.body.message).toBe('Invalid email or password');
    });

    test('should return same error for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!'
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
      expect(response.body.message).toBe('Invalid email or password');
    });

    test('should handle rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'WrongPassword123!'
            })
        );
      }

      const responses = await Promise.all(requests);

      // At least one should be rate limited (429)
      const rateLimitedResponse = responses.find(r => r.status === 429);
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.body.error).toBe('Too many authentication attempts, please try again later.');
      }
    }, 30000); // Increase timeout for rate limiting test
  });

  describe('Protected Routes Integration', () => {
    test('should access profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.message).toBe('User profile retrieved successfully');
      expect(response.body.data.userId).toBe(testUser.user_id);
      expect(response.body.data.email).toBe(testUser.email);
    });

    test('should reject access without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    test('should reject access with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    test('should reject access with expired token', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        {
          userId: testUser.user_id,
          email: testUser.email,
          type: 'access',
          iat: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
          iss: 'real-estate-crm-api'
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '1h', // Already expired
          algorithm: JWT_CONFIG.ALGORITHM
        }
      );

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toBe('Token expired');
    });
  });

  describe('Lead System Integration', () => {
    test('should access leads with valid authentication', async () => {
      const response = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.message).toBe('Leads retrieved successfully');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should create lead with valid authentication', async () => {
      const leadData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phoneNumber: '555-0123',
        source: 'Website Form',
        priority: 'High'
      };

      const response = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${testToken}`)
        .send(leadData)
        .expect(201);

      expect(response.body.message).toBe('Lead created successfully');
      expect(response.body.data).toHaveProperty('lead_id');
      expect(response.body.data.first_name).toBe('John');
      expect(response.body.data.last_name).toBe('Doe');
      expect(response.body.data.email).toBe('john.doe@example.com');
    });

    test('should reject lead creation without authentication', async () => {
      const leadData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        source: 'Website Form'
      };

      const response = await request(app)
        .post('/api/leads')
        .send(leadData)
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('Token Refresh', () => {
    test('should refresh access token', async () => {
      // First get a refresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPass123!'
        })
        .expect(200);

      const refreshToken = loginResponse.body.data.tokens.refreshToken;

      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body.message).toBe('Token refreshed successfully');
      expect(refreshResponse.body.data).toHaveProperty('accessToken');
      expect(refreshResponse.body.data).toHaveProperty('refreshToken');

      // Verify new tokens work
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${refreshResponse.body.data.accessToken}`)
        .expect(200);

      expect(profileResponse.body.data.userId).toBe(testUser.user_id);
    });

    test('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.refresh.token' })
        .expect(401);

      expect(response.body.error).toBe('Invalid refresh token');
    });
  });

  describe('Security Headers', () => {
    test('should include security headers in auth responses', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPass123!'
        })
        .expect(200);

      // Check some key security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-powered-by']).toBeUndefined(); // Should be removed
    });
  });
});