// Validation utilities for forms and input data

import { LoginForm, RegisterForm, LeadForm } from '../types';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone number validation regex (flexible format)
const PHONE_REGEX = /^\+?[\d\s\-\(\)]{10,}$/;

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Generic validation function
export const validate = (
  data: Record<string, any>,
  rules: Record<string, ValidationRule[]>
): ValidationResult => {
  const errors: Record<string, string> = {};

  Object.keys(rules).forEach(field => {
    const value = data[field];
    const fieldRules = rules[field];

    for (const rule of fieldRules) {
      const error = rule.validate(value, data);
      if (error) {
        errors[field] = error;
        break; // Stop at first error for this field
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Validation rule interface
interface ValidationRule {
  validate: (value: any, allData?: Record<string, any>) => string | null;
}

// Common validation rules
export const rules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value: any) => {
      if (value === null || value === undefined || value === '') {
        return message;
      }
      return null;
    },
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    validate: (value: string) => {
      if (value && !EMAIL_REGEX.test(value)) {
        return message;
      }
      return null;
    },
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value: string) => {
      if (value && value.length < min) {
        return message || `Must be at least ${min} characters long`;
      }
      return null;
    },
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value: string) => {
      if (value && value.length > max) {
        return message || `Must be no more than ${max} characters long`;
      }
      return null;
    },
  }),

  phone: (message = 'Please enter a valid phone number'): ValidationRule => ({
    validate: (value: string) => {
      if (value && !PHONE_REGEX.test(value)) {
        return message;
      }
      return null;
    },
  }),

  numeric: (message = 'Please enter a valid number'): ValidationRule => ({
    validate: (value: string) => {
      if (value && (isNaN(Number(value)) || value.trim() === '')) {
        return message;
      }
      return null;
    },
  }),

  positiveNumber: (message = 'Please enter a positive number'): ValidationRule => ({
    validate: (value: string) => {
      if (value && (isNaN(Number(value)) || Number(value) <= 0)) {
        return message;
      }
      return null;
    },
  }),

  match: (fieldName: string, message?: string): ValidationRule => ({
    validate: (value: string, allData: Record<string, any> = {}) => {
      if (value && allData[fieldName] && value !== allData[fieldName]) {
        return message || `Must match ${fieldName}`;
      }
      return null;
    },
  }),

  custom: (validateFn: (value: any, allData?: Record<string, any>) => string | null): ValidationRule => ({
    validate: validateFn,
  }),
};

// Specific form validators
export const validateLoginForm = (data: LoginForm): ValidationResult => {
  return validate(data, {
    email: [rules.required(), rules.email()],
    password: [rules.required(), rules.minLength(6)],
  });
};

export const validateRegisterForm = (data: RegisterForm): ValidationResult => {
  return validate(data, {
    email: [rules.required(), rules.email()],
    password: [rules.required(), rules.minLength(8, 'Password must be at least 8 characters long')],
    firstName: [rules.required(), rules.maxLength(100)],
    lastName: [rules.required(), rules.maxLength(100)],
  });
};

export const validateLeadForm = (data: LeadForm): ValidationResult => {
  const validationRules: Record<string, ValidationRule[]> = {
    firstName: [rules.required(), rules.maxLength(255)],
    lastName: [rules.required(), rules.maxLength(255)],
    email: [rules.required(), rules.email()],
    source: [rules.required()],
  };

  // Optional field validations
  if (data.phoneNumber) {
    validationRules.phoneNumber = [rules.phone()];
  }

  if (data.budgetMin) {
    validationRules.budgetMin = [rules.positiveNumber()];
  }

  if (data.budgetMax) {
    validationRules.budgetMax = [
      rules.positiveNumber(),
      rules.custom((value: string, allData: Record<string, any> = {}) => {
        const min = Number(allData.budgetMin);
        const max = Number(value);
        if (min && max && max < min) {
          return 'Maximum budget must be greater than minimum budget';
        }
        return null;
      }),
    ];
  }

  if (data.bedroomsMin) {
    validationRules.bedroomsMin = [rules.positiveNumber()];
  }

  if (data.bathroomsMin) {
    validationRules.bathroomsMin = [rules.positiveNumber()];
  }

  return validate(data, validationRules);
};

// Format validation errors for display
export const getErrorMessage = (
  errors: Record<string, string>,
  field: string
): string | undefined => {
  return errors[field];
};

// Check if a field has an error
export const hasError = (
  errors: Record<string, string>,
  field: string
): boolean => {
  return !!errors[field];
};

// Format phone number for display
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX for North American numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Return as-is for international numbers
  return phone;
};

// Format currency for display
export const formatCurrency = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '';
  
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

// Parse currency input
export const parseCurrency = (value: string): string => {
  return value.replace(/[$,\s]/g, '');
};