
// Application Constants

// Lead Status Options
const LEAD_STATUS = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  SHOWING_SCHEDULED: 'Showing Scheduled',
  OFFER_MADE: 'Offer Made',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
  ARCHIVED: 'Archived'
};

// Lead Priority Options
const LEAD_PRIORITY = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
};

// Property Types
const PROPERTY_TYPES = [
  'Condo',
  'House',
  'Townhouse',
  'Land',
  'Commercial',
  'Multi-Family'
];

// Lead Sources
const LEAD_SOURCES = [
  'Website Form',
  'Facebook Ad',
  'Google Ad',
  'Referral',
  'Walk-in',
  'Phone Call',
  'Email',
  'Social Media',
  'Manual Entry'
];

// Interaction Types
const INTERACTION_TYPES = {
  LEAD_CREATED: 'Lead Created',
  EMAIL_SENT: 'Email Sent',
  CALL_LOGGED: 'Call Logged',
  SMS_SENT: 'SMS Sent',
  NOTE_ADDED: 'Note Added',
  STATUS_CHANGE: 'Status Change',
  MEETING_SCHEDULED: 'Meeting Scheduled',
  PROPERTY_VIEWING: 'Property Viewing',
  OFFER_MADE: 'Offer Made',
  DEAL_CLOSED: 'Deal Closed'
};

// Notification Types
const NOTIFICATION_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  SUCCESS: 'success',
  ERROR: 'error',
  REMINDER: 'reminder'
};

// Task Priority
const TASK_PRIORITY = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
};

// Cache TTL in seconds
const CACHE_TTL = {
  LEADS_LIST: 300,      // 5 minutes
  LEAD_DETAIL: 1800,    // 30 minutes
  USER_PROFILE: 1800,   // 30 minutes
  DASHBOARD_DATA: 600,  // 10 minutes
  DEFAULT: 3600         // 1 hour
};

// Pagination Defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 200
};

// JWT Configuration
const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '7d',
  REFRESH_TOKEN_EXPIRY: '30d',
  ALGORITHM: 'HS256'
};

// Rate Limiting
const RATE_LIMITS = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
  AUTH_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  AUTH_MAX_REQUESTS: 5
};

// OpenAI Configuration
const OPENAI_CONFIG = {
  MODEL: 'gpt-3.5-turbo',
  MAX_TOKENS: 150,
  TEMPERATURE: 0.3,
  SYSTEM_PROMPT: `You are a real estate lead analysis assistant. Analyze lead information and provide:
1. A brief professional summary (max 2 sentences)
2. Priority level (High/Medium/Low)
Be concise and professional.`
};

// Validation Rules
const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  NAME_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 255,
  PHONE_MAX_LENGTH: 50,
  NOTES_MAX_LENGTH: 5000,
  BUDGET_MIN: 0,
  BUDGET_MAX: 999999999.99
};

// Error Messages
const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_NOT_FOUND: 'User not found',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  INVALID_TOKEN: 'Invalid or expired token',
  UNAUTHORIZED: 'Unauthorized access',
  
  // Validation
  INVALID_EMAIL: 'Please provide a valid email address',
  INVALID_PASSWORD: 'Password must be at least 8 characters long',
  REQUIRED_FIELD: (field) => `${field} is required`,
  
  // Leads
  LEAD_NOT_FOUND: 'Lead not found',
  LEAD_ACCESS_DENIED: 'Access denied to this lead',
  INVALID_LEAD_STATUS: 'Invalid lead status',
  INVALID_LEAD_PRIORITY: 'Invalid lead priority',
  
  // Database
  DATABASE_ERROR: 'Database operation failed',
  CONNECTION_ERROR: 'Database connection failed',
  
  // Server
  INTERNAL_SERVER_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable'
};

module.exports = {
  LEAD_STATUS,
  LEAD_PRIORITY,
  PROPERTY_TYPES,
  LEAD_SOURCES,
  INTERACTION_TYPES,
  NOTIFICATION_TYPES,
  TASK_PRIORITY,
  CACHE_TTL,
  PAGINATION,
  JWT_CONFIG,
  RATE_LIMITS,
  OPENAI_CONFIG,
  VALIDATION_RULES,
  ERROR_MESSAGES
};
