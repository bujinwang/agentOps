jest.mock('../src/middleware/validation', () => ({
  validateRevenueTransaction: () => (req, res, next) => next(),
  validateCommissionCalculation: () => (req, res, next) => next(),
  validateCommissionStructure: () => (req, res, next) => next(),
  validateRequest: () => (req, res, next) => next(),
  handleValidationErrors: (req, res, next) => next()
}));

const request = require('supertest');
const app = require('../src/server');
const revenueService = require('../src/services/revenueService');

const ADMIN_TOKEN = 'admin-token';
const AGENT_TOKEN = 'agent-token';

jest.mock('../src/middleware/auth', () => {
  const actual = jest.requireActual('../src/middleware/auth');

  const adminUser = {
    user_id: 1,
    email: 'admin.guard@example.com',
    first_name: 'Admin',
    last_name: 'Guard',
    role: 'admin',
    roles: ['admin']
  };

  const agentUser = {
    user_id: 2,
    email: 'agent.guard@example.com',
    first_name: 'Agent',
    last_name: 'Tester',
    role: 'agent',
    roles: ['agent']
  };

  const tokenUserMap = {
    'admin-token': adminUser,
    'agent-token': agentUser
  };

  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const token = authHeader.substring(7).trim();
    const user = tokenUserMap[token];

    if (!user) {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }

    req.user = {
      ...user,
      id: user.user_id
    };
    req.userId = user.user_id;
    next();
  };

  const requireRole = (roles = []) => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    if (roles.length === 0 || roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      error: 'Forbidden'
    });
  };

  return {
    ...actual,
    authenticateToken,
    requireRole
  };
});

describe('Admin role guard integration', () => {
  let adminToken;
  let agentToken;

  beforeAll(() => {
    adminToken = ADMIN_TOKEN;
    agentToken = AGENT_TOKEN;
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(revenueService, 'createRevenueCategory').mockResolvedValue({
      id: 'test-category-id',
      name: 'Test Category',
      description: 'Mocked category for tests',
      category_type: 'general',
      is_active: true
    });
  });

  test('should reject revenue category creation when unauthenticated', async () => {
    const response = await request(app)
      .post('/api/revenue/categories')
      .send({
        name: 'Unauthenticated Category',
        description: 'Should be rejected',
        categoryType: 'general'
      })
      .expect(401);

    expect(response.body.error).toBe('Authentication required');
    expect(revenueService.createRevenueCategory).not.toHaveBeenCalled();
  });

  test('should block non-admin user from creating revenue categories', async () => {
    const response = await request(app)
      .post('/api/revenue/categories')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        name: 'Agent Attempt',
        description: 'Agent should be blocked',
        categoryType: 'general'
      })
      .expect(403);

    expect(response.body.error).toBe('Forbidden');
    expect(revenueService.createRevenueCategory).not.toHaveBeenCalled();
  });

  test('should allow admin user to create revenue categories', async () => {
    const response = await request(app)
      .post('/api/revenue/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Admin Created Category',
        description: 'Admin access granted',
        categoryType: 'general'
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(revenueService.createRevenueCategory).toHaveBeenCalledTimes(1);
  });
});