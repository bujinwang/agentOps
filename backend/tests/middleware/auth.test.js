/**
 * Authentication Middleware Unit Tests
 * Tests JWT token generation, verification, and middleware functionality
 */

const jwt = require('jsonwebtoken');
const { generateTokens, verifyToken, authenticate } = require('../../src/middleware/auth');
const User = require('../../src/models/User');
const { JWT_CONFIG } = require('../../src/config/constants');

// Mock User model
jest.mock('../../src/models/User', () => ({
  findById: jest.fn(),
}));

// Mock constants
jest.mock('../../src/config/constants', () => ({
  JWT_CONFIG: {
    ACCESS_TOKEN_EXPIRY: '7d',
    REFRESH_TOKEN_EXPIRY: '30d',
    ALGORITHM: 'HS256'
  },
  ERROR_MESSAGES: {
    UNAUTHORIZED: 'Unauthorized access',
    INVALID_TOKEN: 'Invalid or expired token',
    USER_NOT_FOUND: 'User not found',
    INTERNAL_SERVER_ERROR: 'Internal server error'
  }
}));

describe('Authentication Middleware', () => {
  const mockUser = {
    user_id: 1,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User'
  };

  const mockToken = 'mock.jwt.token';
  const mockSecret = 'test-secret-key';

  beforeEach(() => {
    jest.clearAllMocks();
    if (User && User.findById) {
      User.findById.mockReset();
    }
    // Mock process.env
    process.env.JWT_SECRET = mockSecret;
  });

  describe('generateTokens', () => {
    test('should generate access and refresh tokens with correct payload', () => {
      const tokens = generateTokens(mockUser);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');

      // Verify access token payload
      const accessDecoded = jwt.verify(tokens.accessToken, mockSecret);
      expect(accessDecoded.userId).toBe(mockUser.user_id);
      expect(accessDecoded.email).toBe(mockUser.email);
      expect(accessDecoded.firstName).toBe(mockUser.first_name);
      expect(accessDecoded.lastName).toBe(mockUser.last_name);
      expect(accessDecoded.type).toBe('access');
      expect(accessDecoded.iss).toBe('real-estate-crm-api');

      // Verify refresh token payload
      const refreshDecoded = jwt.verify(tokens.refreshToken, mockSecret);
      expect(refreshDecoded.userId).toBe(mockUser.user_id);
      expect(refreshDecoded.type).toBe('refresh');
      expect(refreshDecoded.iss).toBe('real-estate-crm-api');
    });

    test('should generate tokens with unique JWT IDs', () => {
      const token1 = generateTokens(mockUser);
      const token2 = generateTokens(mockUser);

      const decoded1 = jwt.verify(token1.accessToken, mockSecret);
      const decoded2 = jwt.verify(token2.accessToken, mockSecret);

      expect(decoded1.jti).toBeDefined();
      expect(decoded2.jti).toBeDefined();
      expect(decoded1.jti).not.toBe(decoded2.jti);
    });
  });

  describe('verifyToken', () => {
    test('should verify valid access token', () => {
      const tokens = generateTokens(mockUser);
      const decoded = verifyToken(tokens.accessToken, 'access');

      expect(decoded.userId).toBe(mockUser.user_id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.type).toBe('access');
    });

    test('should verify valid refresh token', () => {
      const tokens = generateTokens(mockUser);
      const decoded = verifyToken(tokens.refreshToken, 'refresh');

      expect(decoded.userId).toBe(mockUser.user_id);
      expect(decoded.type).toBe('refresh');
    });

    test('should reject token with wrong type', () => {
      const tokens = generateTokens(mockUser);

      expect(() => {
        verifyToken(tokens.accessToken, 'refresh');
      }).toThrow('Invalid token type. Expected refresh, got access');
    });

    test('should reject expired token', () => {
      const expiredToken = jwt.sign(
        {
          userId: mockUser.user_id,
          email: mockUser.email,
          type: 'access',
          iss: 'real-estate-crm-api',
          iat: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
          exp: Math.floor(Date.now() / 1000) - 1800, // 30 minutes ago
        },
        mockSecret,
        { algorithm: 'HS256' }
      );

      expect(() => {
        verifyToken(expiredToken);
      }).toThrow('Token expired');
    });

    test('should reject token with invalid signature', () => {
      const invalidToken = jwt.sign(
        { userId: 1, email: 'test@example.com' },
        'wrong-secret',
        { algorithm: 'HS256' }
      );

      expect(() => {
        verifyToken(invalidToken);
      }).toThrow('Invalid token');
    });

    test('should reject token issued in future', () => {
      const futureToken = jwt.sign(
        {
          userId: mockUser.user_id,
          email: mockUser.email,
          type: 'access',
          iss: 'real-estate-crm-api',
          iat: Math.floor(Date.now() / 1000) + 3600, // 1 hour in future
        },
        mockSecret,
        { algorithm: 'HS256' }
      );

      expect(() => {
        verifyToken(futureToken);
      }).toThrow('Token issued in the future');
    });

    test('should reject token missing required claims', () => {
      const incompleteToken = jwt.sign(
        { email: 'test@example.com', iss: 'real-estate-crm-api' }, // Missing userId
        mockSecret,
        { algorithm: 'HS256' }
      );

      expect(() => {
        verifyToken(incompleteToken);
      }).toThrow('Token missing required claims');
    });
  });

  describe('authenticate middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
      mockReq = {
        headers: {},
        userId: null,
        user: null,
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
        get: jest.fn(() => 'jest-test-agent')
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      mockNext = jest.fn();
    });

    test('should reject request without authorization header', async () => {
      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'Unauthorized access'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject request with malformed authorization header', async () => {
      mockReq.headers.authorization = 'InvalidFormat';

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'Unauthorized access'
      });
    });

    test('should reject request with invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid.token.here';

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    });

    test('should reject request with valid token but non-existent user', async () => {
      const tokens = generateTokens(mockUser);
      mockReq.headers.authorization = `Bearer ${tokens.accessToken}`;

      User.findById.mockResolvedValue(null);

      await authenticate(mockReq, mockRes, mockNext);

      expect(User.findById).toHaveBeenCalledWith(mockUser.user_id);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'User not found',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    });

    test('should authenticate request with valid token and existing user', async () => {
      const tokens = generateTokens(mockUser);
      mockReq.headers.authorization = `Bearer ${tokens.accessToken}`;

      User.findById.mockResolvedValue(mockUser);

      await authenticate(mockReq, mockRes, mockNext);

      expect(User.findById).toHaveBeenCalledWith(mockUser.user_id);
      expect(mockReq.user).toEqual(mockUser);
      expect(mockReq.userId).toBe(mockUser.user_id);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should handle token verification errors gracefully', async () => {
      mockReq.headers.authorization = 'Bearer expired.token.here';

      // Mock jwt.verify to throw an error
      const originalVerify = jwt.verify;
      jwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Token verification failed');
      });

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'Internal server error',
        code: 'AUTHENTICATION_ERROR'
      });

      // Restore original function
      jwt.verify = originalVerify;
    });
  });
});
