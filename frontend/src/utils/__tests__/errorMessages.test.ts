// Tests for enhanced error message utilities
// Ensures user-friendly error messages work correctly

import {
  getAuthError,
  getValidationError,
  getNetworkError,
  getDataError,
  formatErrorForDisplay,
  getErrorSeverityColor,
  getErrorSeverityIcon,
  generateErrorMessage,
} from '../errorMessages';

describe('Error Message Utilities', () => {
  describe('Authentication Errors', () => {
    it('should return user-friendly invalid credentials error', () => {
      const error = getAuthError('invalidCredentials');

      expect(error.title).toBe('Sign In Failed');
      expect(error.message).toContain('doesn\'t match our records');
      expect(error.helpText).toContain('double-check your email');
      expect(error.severity).toBe('medium');
    });

    it('should return account locked error', () => {
      const error = getAuthError('accountLocked');

      expect(error.title).toBe('Account Temporarily Locked');
      expect(error.message).toContain('temporarily locked');
      expect(error.helpText).toContain('wait 15 minutes');
      expect(error.severity).toBe('high');
    });

    it('should return email exists error', () => {
      const error = getAuthError('emailExists');

      expect(error.title).toBe('Email Already Registered');
      expect(error.message).toContain('already associated');
      expect(error.helpText).toContain('Try signing in');
      expect(error.severity).toBe('low');
    });
  });

  describe('Validation Errors', () => {
    it('should return required field error with field name', () => {
      const error = getValidationError('required', { field: 'Email' });

      expect(error.title).toBe('Required Information');
      expect(error.message).toContain('Email is required');
      expect(error.helpText).toContain('provide the required information');
      expect(error.severity).toBe('low');
    });

    it('should return invalid email error', () => {
      const error = getValidationError('invalidEmail');

      expect(error.title).toBe('Invalid Email Format');
      expect(error.message).toContain('valid email address');
      expect(error.helpText).toContain('yourname@example.com');
      expect(error.severity).toBe('low');
    });

    it('should return password too short error with min length', () => {
      const error = getValidationError('passwordTooShort', { min: 8 });

      expect(error.title).toBe('Password Too Short');
      expect(error.message).toContain('at least 8 characters');
      expect(error.helpText).toContain('Create a stronger password');
      expect(error.severity).toBe('medium');
    });

    it('should return passwords don\'t match error', () => {
      const error = getValidationError('passwordsDontMatch');

      expect(error.title).toBe('Passwords Don\'t Match');
      expect(error.message).toContain('don\'t match');
      expect(error.helpText).toContain('both password fields');
      expect(error.severity).toBe('low');
    });
  });

  describe('Network Errors', () => {
    it('should return timeout error', () => {
      const error = getNetworkError('timeout');

      expect(error.title).toBe('Request Timed Out');
      expect(error.message).toContain('took too long');
      expect(error.helpText).toContain('slow connection');
      expect(error.severity).toBe('medium');
    });

    it('should return server error', () => {
      const error = getNetworkError('serverError');

      expect(error.title).toBe('Server Error');
      expect(error.message).toContain('experiencing issues');
      expect(error.helpText).toContain('working to fix');
      expect(error.severity).toBe('high');
    });
  });

  describe('Error Formatting', () => {
    it('should format error for alert display', () => {
      const error = getAuthError('invalidCredentials');
      const formatted = formatErrorForDisplay(error, 'alert');

      expect(formatted.title).toBe('Sign In Failed');
      expect(formatted.message).toContain('doesn\'t match');
      expect(formatted.details).toContain('double-check');
      expect(formatted.action).toBe('Try Again');
    });

    it('should format error for inline display', () => {
      const error = getValidationError('required', { field: 'Name' });
      const formatted = formatErrorForDisplay(error, 'inline');

      expect(formatted.title).toBe('Required Information');
      expect(formatted.message).toContain('Name is required');
      expect(formatted.details).toContain('provide');
      expect(formatted.action).toBeUndefined();
    });
  });

  describe('Severity Utilities', () => {
    it('should return correct colors for severity levels', () => {
      expect(getErrorSeverityColor('low')).toBe('#4CAF50'); // Green
      expect(getErrorSeverityColor('medium')).toBe('#FF9800'); // Orange
      expect(getErrorSeverityColor('high')).toBe('#F44336'); // Red
    });

    it('should return correct icons for severity levels', () => {
      expect(getErrorSeverityIcon('low')).toBe('ℹ️');
      expect(getErrorSeverityIcon('medium')).toBe('⚠️');
      expect(getErrorSeverityIcon('high')).toBe('❌');
    });
  });

  describe('Generic Error Generation', () => {
    it('should generate auth error by category and type', () => {
      const error = generateErrorMessage('auth', 'invalidCredentials');

      expect(error.title).toBe('Sign In Failed');
      expect(error.message).toContain('doesn\'t match');
      expect(error.severity).toBe('medium');
    });

    it('should generate validation error by category and type', () => {
      const error = generateErrorMessage('validation', 'invalidEmail');

      expect(error.title).toBe('Invalid Email Format');
      expect(error.message).toContain('valid email');
      expect(error.severity).toBe('low');
    });

    it('should return fallback error for unknown types', () => {
      const error = generateErrorMessage('auth', 'unknownError');

      expect(error.title).toBe('Something Went Wrong');
      expect(error.message).toContain('unexpected error');
      expect(error.severity).toBe('medium');
    });
  });

  describe('Context-Aware Messages', () => {
    it('should include field name in required error', () => {
      const error = getValidationError('required', { field: 'Phone Number' });

      expect(error.message).toContain('Phone Number is required');
    });

    it('should include max length in exceeded error', () => {
      const error = getValidationError('maxLengthExceeded', { max: 100, value: 'x'.repeat(150) });

      expect(error.message).toContain('under 100 characters');
      expect(error.helpText).toContain('Current length: 150');
    });

    it('should include expected format in date error', () => {
      const error = getValidationError('invalidDate', { expectedFormat: 'MM/DD/YYYY' });

      expect(error.helpText).toContain('MM/DD/YYYY');
    });
  });
});