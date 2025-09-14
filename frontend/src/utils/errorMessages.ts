// User-friendly error message templates and utilities
// Provides consistent, actionable error messages across the Real Estate CRM app

export interface ErrorTemplate {
  title: string;
  message: string;
  helpText?: string;
  actionText?: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ErrorContext {
  field?: string;
  value?: any;
  min?: number;
  max?: number;
  expectedFormat?: string;
  retryCount?: number;
}

// Error message templates organized by category
export const errorTemplates = {
  // Authentication Errors
  auth: {
    invalidCredentials: {
      title: 'Sign In Failed',
      message: 'The email or password you entered doesn\'t match our records.',
      helpText: 'Please double-check your email and password, or use "Forgot Password" if you\'ve forgotten your credentials.',
      actionText: 'Try Again',
      severity: 'medium' as const,
    },

    accountLocked: {
      title: 'Account Temporarily Locked',
      message: 'Your account has been temporarily locked due to too many sign-in attempts.',
      helpText: 'For security reasons, please wait 15 minutes before trying again, or contact support if you need immediate access.',
      actionText: 'Wait and Retry',
      severity: 'high' as const,
    },

    networkError: {
      title: 'Connection Problem',
      message: 'Unable to connect to our servers right now.',
      helpText: 'Please check your internet connection and try again. If the problem persists, our servers might be temporarily unavailable.',
      actionText: 'Retry',
      severity: 'medium' as const,
    },

    sessionExpired: {
      title: 'Session Expired',
      message: 'Your session has expired for security reasons.',
      helpText: 'Please sign in again to continue using the app.',
      actionText: 'Sign In Again',
      severity: 'low' as const,
    },

    emailExists: {
      title: 'Email Already Registered',
      message: 'This email address is already associated with an account.',
      helpText: 'Try signing in with this email, or use a different email address to create a new account.',
      actionText: 'Try Signing In',
      severity: 'low' as const,
    },

    weakPassword: {
      title: 'Password Too Weak',
      message: 'Your password doesn\'t meet our security requirements.',
      helpText: 'Use at least 8 characters with a mix of letters, numbers, and symbols for better security.',
      actionText: 'Update Password',
      severity: 'medium' as const,
    },
  },

  // Validation Errors
  validation: {
    required: (context: ErrorContext = {}) => ({
      title: 'Required Information',
      message: `${context.field || 'This field'} is required to continue.`,
      helpText: `Please provide ${context.field?.toLowerCase() || 'the required information'} to complete this action.`,
      actionText: 'Add Information',
      severity: 'low' as const,
    }),

    invalidEmail: {
      title: 'Invalid Email Format',
      message: 'Please enter a valid email address.',
      helpText: 'A valid email looks like: yourname@example.com',
      actionText: 'Fix Email',
      severity: 'low' as const,
    },

    passwordTooShort: (context: ErrorContext = {}) => ({
      title: 'Password Too Short',
      message: `Your password must be at least ${context.min || 8} characters long.`,
      helpText: 'Create a stronger password with letters, numbers, and symbols for better security.',
      actionText: 'Make Password Longer',
      severity: 'medium' as const,
    }),

    passwordsDontMatch: {
      title: 'Passwords Don\'t Match',
      message: 'The passwords you entered don\'t match.',
      helpText: 'Please make sure both password fields contain exactly the same text.',
      actionText: 'Check Passwords',
      severity: 'low' as const,
    }),

    invalidPhone: {
      title: 'Invalid Phone Number',
      message: 'Please enter a valid phone number.',
      helpText: 'Include area code and use format: (555) 123-4567',
      actionText: 'Fix Phone Number',
      severity: 'low' as const,
    }),

    invalidDate: (context: ErrorContext = {}) => ({
      title: 'Invalid Date',
      message: 'Please enter a valid date.',
      helpText: `Use the format: ${context.expectedFormat || 'YYYY-MM-DD'} (e.g., 2024-01-15)`,
      actionText: 'Fix Date',
      severity: 'low' as const,
    }),

    futureDateRequired: {
      title: 'Future Date Required',
      message: 'This date must be in the future.',
      helpText: 'Please select a date that hasn\'t passed yet.',
      actionText: 'Choose Future Date',
      severity: 'low' as const,
    },

    maxLengthExceeded: (context: ErrorContext = {}) => ({
      title: 'Text Too Long',
      message: `Please keep it under ${context.max || 255} characters.`,
      helpText: `Current length: ${context.value?.length || 0} characters. Try shortening your text.`,
      actionText: 'Shorten Text',
      severity: 'low' as const,
    }),

    invalidNumber: {
      title: 'Invalid Number',
      message: 'Please enter a valid number.',
      helpText: 'Use only digits (0-9) and decimal points if needed.',
      actionText: 'Enter Valid Number',
      severity: 'low' as const,
    }),

    budgetRangeInvalid: {
      title: 'Invalid Budget Range',
      message: 'Maximum budget must be higher than minimum budget.',
      helpText: 'Please adjust your budget range so the maximum is greater than the minimum.',
      actionText: 'Fix Budget Range',
      severity: 'low' as const,
    },
  },

  // Network and Server Errors
  network: {
    timeout: {
      title: 'Request Timed Out',
      message: 'The request took too long to complete.',
      helpText: 'This might be due to a slow connection. Please try again, or check your internet connection.',
      actionText: 'Retry',
      severity: 'medium' as const,
    },

    serverError: {
      title: 'Server Error',
      message: 'Our servers are experiencing issues right now.',
      helpText: 'We\'ve been notified and are working to fix this. Please try again in a few minutes.',
      actionText: 'Try Again Later',
      severity: 'high' as const,
    },

    maintenance: {
      title: 'Under Maintenance',
      message: 'The app is currently under maintenance.',
      helpText: 'We\'re making improvements and will be back soon. Please check back in a few minutes.',
      actionText: 'Check Back Later',
      severity: 'medium' as const,
    },

    offline: {
      title: 'You\'re Offline',
      message: 'No internet connection detected.',
      helpText: 'Please check your Wi-Fi or mobile data connection and try again.',
      actionText: 'Check Connection',
      severity: 'medium' as const,
    },
  },

  // Data and Business Logic Errors
  data: {
    notFound: (context: ErrorContext = {}) => ({
      title: 'Not Found',
      message: `${context.field || 'The requested item'} could not be found.`,
      helpText: 'This might have been deleted or you might not have permission to view it.',
      actionText: 'Go Back',
      severity: 'low' as const,
    }),

    duplicateEntry: (context: ErrorContext = {}) => ({
      title: 'Duplicate Entry',
      message: `${context.field || 'This entry'} already exists.`,
      helpText: 'Please use a different value or check if this item was already created.',
      actionText: 'Use Different Value',
      severity: 'low' as const,
    }),

    permissionDenied: {
      title: 'Permission Denied',
      message: 'You don\'t have permission to perform this action.',
      helpText: 'Please contact your administrator if you need access to this feature.',
      actionText: 'Contact Admin',
      severity: 'medium' as const,
    },

    quotaExceeded: {
      title: 'Limit Reached',
      message: 'You\'ve reached the maximum limit for this action.',
      helpText: 'Please contact support to increase your limits or try again later.',
      actionText: 'Contact Support',
      severity: 'medium' as const,
    },
  },
};

// Utility functions for generating error messages
export const getAuthError = (errorType: keyof typeof errorTemplates.auth, context?: ErrorContext): ErrorTemplate => {
  const template = errorTemplates.auth[errorType] as any;
  if (typeof template === 'function') {
    return template(context);
  }
  return template;
};

export const getValidationError = (errorType: keyof typeof errorTemplates.validation, context?: ErrorContext): ErrorTemplate => {
  const template = errorTemplates.validation[errorType] as any;
  if (typeof template === 'function') {
    return template(context);
  }
  return template;
};

export const getNetworkError = (errorType: keyof typeof errorTemplates.network, context?: ErrorContext): ErrorTemplate => {
  const template = errorTemplates.network[errorType] as any;
  if (typeof template === 'function') {
    return template(context);
  }
  return template;
};

export const getDataError = (errorType: keyof typeof errorTemplates.data, context?: ErrorContext): ErrorTemplate => {
  const template = errorTemplates.data[errorType] as any;
  if (typeof template === 'function') {
    return template(context);
  }
  return template;
};

// Generic error message generator
export const generateErrorMessage = (
  category: 'auth' | 'validation' | 'network' | 'data',
  errorType: string,
  context?: ErrorContext
): ErrorTemplate => {
  const categoryTemplates = errorTemplates[category];
  const template = categoryTemplates[errorType as keyof typeof categoryTemplates];

  if (!template) {
    // Fallback for unknown error types
    return {
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred.',
      helpText: 'Please try again, or contact support if the problem persists.',
      actionText: 'Try Again',
      severity: 'medium',
    };
  }

  if (typeof template === 'function') {
    return template(context);
  }

  return template;
};

// Error message formatter for different display contexts
export const formatErrorForDisplay = (
  error: ErrorTemplate,
  displayContext: 'alert' | 'inline' | 'toast' | 'modal' = 'alert'
): {
  title: string;
  message: string;
  details?: string;
  action?: string;
} => {
  switch (displayContext) {
    case 'alert':
      return {
        title: error.title,
        message: error.message,
        details: error.helpText,
        action: error.actionText,
      };

    case 'inline':
      return {
        title: error.title,
        message: error.message,
        details: error.helpText,
      };

    case 'toast':
      return {
        title: error.title,
        message: error.message,
        action: error.actionText,
      };

    case 'modal':
      return {
        title: error.title,
        message: error.message,
        details: error.helpText,
        action: error.actionText,
      };

    default:
      return {
        title: error.title,
        message: error.message,
      };
  }
};

// Error severity color mapping
export const getErrorSeverityColor = (severity: ErrorTemplate['severity']): string => {
  switch (severity) {
    case 'low':
      return '#4CAF50'; // Green
    case 'medium':
      return '#FF9800'; // Orange
    case 'high':
      return '#F44336'; // Red
    default:
      return '#666';
  }
};

// Error severity icon mapping
export const getErrorSeverityIcon = (severity: ErrorTemplate['severity']): string => {
  switch (severity) {
    case 'low':
      return 'ℹ️'; // Info
    case 'medium':
      return '⚠️'; // Warning
    case 'high':
      return '❌'; // Error
    default:
      return '❓';
  }
};

export default errorTemplates;