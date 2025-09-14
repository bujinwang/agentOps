// Enhanced validation utilities with task validation

import { LoginForm, RegisterForm, LeadForm, TaskForm } from '../types';
import { getValidationError } from './errorMessages';

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

// Common validation rules with enhanced error messages
export const rules = {
  required: (fieldName?: string): ValidationRule => ({
    validate: (value: any) => {
      if (value === null || value === undefined || value === '') {
        const errorTemplate = getValidationError('required', { field: fieldName });
        return errorTemplate.message;
      }
      return null;
    },
  }),

  email: (): ValidationRule => ({
    validate: (value: string) => {
      if (value && !EMAIL_REGEX.test(value)) {
        const errorTemplate = getValidationError('invalidEmail');
        return errorTemplate.message;
      }
      return null;
    },
  }),

  minLength: (min: number, fieldName?: string): ValidationRule => ({
    validate: (value: string) => {
      if (value && value.length < min) {
        const errorTemplate = getValidationError('passwordTooShort', { min });
        return errorTemplate.message;
      }
      return null;
    },
  }),

  maxLength: (max: number, fieldName?: string): ValidationRule => ({
    validate: (value: string) => {
      if (value && value.length > max) {
        const errorTemplate = getValidationError('maxLengthExceeded', { max, value });
        return errorTemplate.message;
      }
      return null;
    },
  }),

  phone: (): ValidationRule => ({
    validate: (value: string) => {
      if (value && !PHONE_REGEX.test(value)) {
        const errorTemplate = getValidationError('invalidPhone');
        return errorTemplate.message;
      }
      return null;
    },
  }),

  numeric: (): ValidationRule => ({
    validate: (value: string) => {
      if (value && (isNaN(Number(value)) || value.trim() === '')) {
        const errorTemplate = getValidationError('invalidNumber');
        return errorTemplate.message;
      }
      return null;
    },
  }),

  positiveNumber: (): ValidationRule => ({
    validate: (value: string) => {
      if (value && (isNaN(Number(value)) || Number(value) <= 0)) {
        const errorTemplate = getValidationError('invalidNumber');
        return errorTemplate.message;
      }
      return null;
    },
  }),

  match: (fieldName: string): ValidationRule => ({
    validate: (value: string, allData: Record<string, any> = {}) => {
      if (value && allData[fieldName] && value !== allData[fieldName]) {
        const errorTemplate = getValidationError('passwordsDontMatch');
        return errorTemplate.message;
      }
      return null;
    },
  }),

  dateFormat: (): ValidationRule => ({
    validate: (value: string) => {
      if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const errorTemplate = getValidationError('invalidDate', { expectedFormat: 'YYYY-MM-DD' });
        return errorTemplate.message;
      }
      return null;
    },
  }),

  futureDate: (): ValidationRule => ({
    validate: (value: string) => {
      if (value) {
        const inputDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (inputDate < today) {
          const errorTemplate = getValidationError('futureDateRequired');
          return errorTemplate.message;
        }
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
    email: [
      rules.required('Email'),
      rules.email()
    ],
    password: [
      rules.required('Password'),
      rules.minLength(1, 'Password')
    ],
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

export const validateTaskForm = (data: TaskForm): ValidationResult => {
  const validationRules: Record<string, ValidationRule[]> = {
    title: [rules.required(), rules.maxLength(255)],
    priority: [rules.required()],
  };

  // Optional field validations
  if (data.description) {
    validationRules.description = [rules.maxLength(1000)];
  }

  if (data.dueDate) {
    validationRules.dueDate = [
      rules.custom((value: string) => {
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return 'Please enter a valid date';
          }
          return null;
        } catch {
          return 'Please enter a valid date';
        }
      }),
    ];
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

// Format date for display
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Format date and time for display
export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Get relative time (e.g., "2 hours ago", "3 days ago")
export const getRelativeTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return formatDate(d);
  }
};

// Validate and format URL
export const validateUrl = (url: string): string | null => {
  try {
    const validUrl = new URL(url);
    return validUrl.href;
  } catch {
    try {
      // Try adding https:// prefix
      const validUrl = new URL(`https://${url}`);
      return validUrl.href;
    } catch {
      return null;
    }
  }
};

// Generate initials from name
export const getInitials = (firstName?: string, lastName?: string): string => {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return `${first}${last}` || '?';
};