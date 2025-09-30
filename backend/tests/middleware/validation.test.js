const mockValidationResultImpl = jest.fn();

jest.mock('express-validator', () => {
  const actual = jest.requireActual('express-validator');
  return {
    ...actual,
    validationResult: mockValidationResultImpl
  };
});

const { validationResult } = require('express-validator');
const { validateRegister, validateLogin, validateLeadCreation, handleValidationErrors } = require('../../src/middleware/validation');
const { ValidationError } = require('../../src/middleware/errorHandler');

beforeEach(() => {
  mockValidationResultImpl.mockClear();
  mockValidationResultImpl.mockReturnValue({
    isEmpty: jest.fn().mockReturnValue(true),
    array: jest.fn().mockReturnValue([])
  });
});

describe('Validation Middleware', () => {
  describe('Auth Validation', () => {
    describe('validateRegister', () => {
      test('should validate valid registration data', async () => {
        const req = {
          body: {
            email: 'test@example.com',
            password: 'Password123',
            firstName: 'John',
            lastName: 'Doe'
          }
        };
        
        const validations = validateRegister;
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        expect(errors.isEmpty()).toBe(true);
      });

      test('should reject invalid email', async () => {
        const req = {
          body: {
            email: 'invalid-email',
            password: 'Password123',
            firstName: 'John',
            lastName: 'Doe'
          }
        };
        
        const validations = validateRegister;
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        expect(errors.isEmpty()).toBe(false);
        expect(errors.array()[0].msg).toContain('valid email');
      });

      test('should reject weak password', async () => {
        const req = {
          body: {
            email: 'test@example.com',
            password: 'weak',
            firstName: 'John',
            lastName: 'Doe'
          }
        };
        
        const validations = validateRegister;
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        expect(errors.isEmpty()).toBe(false);
        expect(errors.array()[0].msg).toContain('at least 8 characters');
      });

      test('should reject empty first name', async () => {
        const req = {
          body: {
            email: 'test@example.com',
            password: 'Password123',
            firstName: '',
            lastName: 'Doe'
          }
        };
        
        const validations = validateRegister;
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        expect(errors.isEmpty()).toBe(false);
        expect(errors.array()[0].msg).toContain('First name is required');
      });
    });

    describe('validateLogin', () => {
      test('should validate valid login data', async () => {
        const req = {
          body: {
            email: 'test@example.com',
            password: 'Password123'
          }
        };
        
        const validations = validateLogin;
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        expect(errors.isEmpty()).toBe(true);
      });

      test('should reject invalid email', async () => {
        const req = {
          body: {
            email: 'invalid-email',
            password: 'Password123'
          }
        };
        
        const validations = validateLogin;
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        expect(errors.isEmpty()).toBe(false);
        expect(errors.array()[0].msg).toContain('valid email');
      });

      test('should reject empty password', async () => {
        const req = {
          body: {
            email: 'test@example.com',
            password: ''
          }
        };
        
        const validations = validateLogin;
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        expect(errors.isEmpty()).toBe(false);
        expect(errors.array()[0].msg).toContain('Password is required');
      });
    });
  });

  describe('Lead Validation', () => {
    describe('validateLeadCreation', () => {
      test('should validate valid lead creation data', async () => {
        const req = {
          body: {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            phone: '+1234567890',
            status: 'New',
            priority: 'High',
            propertyType: 'House',
            source: 'Website Form',
            budgetMin: 200000,
            budgetMax: 500000,
            notes: 'Looking for a family home'
          }
        };
        
        const validations = validateLeadCreation;
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        expect(errors.isEmpty()).toBe(true);
      });

      test('should validate minimal required data', async () => {
        const req = {
          body: {
            firstName: 'Jane',
            lastName: 'Smith'
          }
        };
        
        const validations = validateLeadCreation;
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        expect(errors.isEmpty()).toBe(true);
      });

      test('should reject invalid status', async () => {
        const req = {
          body: {
            firstName: 'Jane',
            lastName: 'Smith',
            status: 'InvalidStatus'
          }
        };
        
        const validations = validateLeadCreation;
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        expect(errors.isEmpty()).toBe(false);
        expect(errors.array()[0].msg).toContain('Status must be one of');
      });

      test('should reject invalid email format', async () => {
        const req = {
          body: {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'invalid-email'
          }
        };
        
        const validations = validateLeadCreation;
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        expect(errors.isEmpty()).toBe(false);
        expect(errors.array()[0].msg).toContain('valid email');
      });

      test('should reject invalid phone format', async () => {
        const req = {
          body: {
            firstName: 'Jane',
            lastName: 'Smith',
            phone: 'invalid-phone'
          }
        };
        
        const validations = validateLeadCreation;
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        expect(errors.isEmpty()).toBe(false);
        expect(errors.array()[0].msg).toContain('valid phone number');
      });
    });
  });

  describe('handleValidationErrors', () => {
    test('should pass when no validation errors', () => {
      const req = { body: {} };
      const res = {};
      const next = jest.fn();
      
      // Mock validationResult to return no errors
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });
      
      handleValidationErrors(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
    });

    test('should call next with ValidationError when validation fails', () => {
      const req = { body: {} };
      const res = {};
      const next = jest.fn();
      
      const validationErrors = [
        {
          path: 'email',
          msg: 'Invalid email',
          value: 'invalid',
          location: 'body'
        }
      ];
      
      // Mock validationResult to return errors
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => validationErrors
      });
      
      handleValidationErrors(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = next.mock.calls[0][0];
      expect(error.message).toBe('Validation failed');
      expect(error.details).toEqual([
        {
          field: 'email',
          message: 'Invalid email',
          value: 'invalid',
          location: 'body'
        }
      ]);
    });
  });
});
