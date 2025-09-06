const request = require('supertest');
const app = require('../../src/server');
const { 
  AppError, 
  ValidationError, 
  AuthenticationError, 
  NotFoundError,
  errorHandler 
} = require('../../src/middleware/errorHandler');

describe('Error Handler Middleware', () => {
  describe('Custom Error Classes', () => {
    test('should create AppError with correct properties', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR', { details: 'test' });
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.status).toBe('fail');
      expect(error.errorCode).toBe('TEST_ERROR');
      expect(error.details).toEqual({ details: 'test' });
      expect(error.isOperational).toBe(true);
    });

    test('should create ValidationError', () => {
      const error = new ValidationError('Validation failed', ['field1', 'field2']);
      
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(['field1', 'field2']);
    });

    test('should create AuthenticationError', () => {
      const error = new AuthenticationError('Authentication failed');
      
      expect(error.message).toBe('Authentication failed');
      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe('AUTHENTICATION_ERROR');
    });

    test('should create NotFoundError', () => {
      const error = new NotFoundError('Resource not found');
      
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('NOT_FOUND_ERROR');
    });
  });

  describe('Error Handler Middleware', () => {
    let testApp;

    beforeEach(() => {
      testApp = require('express')();
      testApp.use(express.json());
      
      // Test route that throws different errors
      testApp.get('/test-validation-error', (req, res, next) => {
        next(new ValidationError('Validation failed', ['field1 is required']));
      });

      testApp.get('/test-auth-error', (req, res, next) => {
        next(new AuthenticationError('Invalid token'));
      });

      testApp.get('/test-not-found-error', (req, res, next) => {
        next(new NotFoundError('User not found'));
      });

      testApp.get('/test-server-error', (req, res, next) => {
        next(new Error('Internal server error'));
      });

      testApp.use(errorHandler);
    });

    test('should handle validation errors in development', async () => {
      process.env.NODE_ENV = 'development';
      
      const response = await request(testApp)
        .get('/test-validation-error')
        .expect(400);

      expect(response.body.status).toBe('fail');
      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.details).toEqual(['field1 is required']);
      expect(response.body.error.stack).toBeDefined();
    });

    test('should handle authentication errors', async () => {
      const response = await request(testApp)
        .get('/test-auth-error')
        .expect(401);

      expect(response.body.status).toBe('fail');
      expect(response.body.error.message).toBe('Invalid token');
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    test('should handle not found errors', async () => {
      const response = await request(testApp)
        .get('/test-not-found-error')
        .expect(404);

      expect(response.body.status).toBe('fail');
      expect(response.body.error.message).toBe('User not found');
      expect(response.body.error.code).toBe('NOT_FOUND_ERROR');
    });

    test('should handle server errors in production', async () => {
      process.env.NODE_ENV = 'production';
      
      const response = await request(testApp)
        .get('/test-server-error')
        .expect(500);

      expect(response.body.status).toBe('error');
      expect(response.body.error.message).toBe('Internal server error');
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('Async Error Catcher', () => {
    const { asyncErrorCatcher } = require('../../src/middleware/errorHandler');

    test('should catch async errors', async () => {
      const asyncFn = jest.fn().mockRejectedValue(new Error('Async error'));
      const wrappedFn = asyncErrorCatcher(asyncFn);
      const next = jest.fn();

      await wrappedFn({}, {}, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Error Boundary', () => {
    const { errorBoundary } = require('../../src/middleware/errorHandler');

    test('should handle successful operations', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await errorBoundary(operation);
      
      expect(result).toBe('success');
    });

    test('should handle failed operations with fallback', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const fallback = 'fallback value';
      const result = await errorBoundary(operation, fallback);
      
      expect(result).toBe('fallback value');
    });
  });

  describe('Retry Mechanism', () => {
    const { retryWithExponentialBackoff } = require('../../src/middleware/errorHandler');

    test('should retry failed operations', async () => {
      let attempts = 0;
      const operation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve('success');
      });

      const result = await retryWithExponentialBackoff(operation, 3, 100);
      
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    test('should throw error after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));
      
      await expect(retryWithExponentialBackoff(operation, 2, 100))
        .rejects.toThrow('Persistent failure');
    });
  });
});