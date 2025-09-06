const { body, param, query, validationResult } = require('express-validator');
const { VALIDATION_RULES, LEAD_STATUS, LEAD_PRIORITY, PROPERTY_TYPES, LEAD_SOURCES } = require('../config/constants');
const { ValidationError } = require('./errorHandler');

// Generic validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value,
      location: error.location
    }));
    
    return next(new ValidationError('Validation failed', errorDetails));
  }
  next();
};

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Limit must be between 1 and 200')
    .toInt(),
  query('sort')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort must be either "asc" or "desc"'),
  query('sortBy')
    .optional()
    .isAlphanumeric()
    .withMessage('SortBy must be alphanumeric')
];

// Auth validation
const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: VALIDATION_RULES.EMAIL_MAX_LENGTH })
    .withMessage(`Email must be less than ${VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`),
  body('password')
    .isLength({ min: VALIDATION_RULES.PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters long`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`First name must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`)
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name must contain only letters and spaces'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`Last name must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`)
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name must contain only letters and spaces'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
    .isLength({ max: VALIDATION_RULES.PHONE_MAX_LENGTH })
    .withMessage(`Phone must be less than ${VALIDATION_RULES.PHONE_MAX_LENGTH} characters`)
];

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isJWT()
    .withMessage('Invalid refresh token format')
];

// Lead validation
const validateLeadCreation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`First name must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`Last name must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('status')
    .optional()
    .isIn(Object.values(LEAD_STATUS))
    .withMessage(`Status must be one of: ${Object.values(LEAD_STATUS).join(', ')}`),
  body('priority')
    .optional()
    .isIn(Object.values(LEAD_PRIORITY))
    .withMessage(`Priority must be one of: ${Object.values(LEAD_PRIORITY).join(', ')}`),
  body('propertyType')
    .optional()
    .isIn(PROPERTY_TYPES)
    .withMessage(`Property type must be one of: ${PROPERTY_TYPES.join(', ')}`),
  body('source')
    .optional()
    .isIn(LEAD_SOURCES)
    .withMessage(`Source must be one of: ${LEAD_SOURCES.join(', ')}`),
  body('budgetMin')
    .optional()
    .isFloat({ min: VALIDATION_RULES.BUDGET_MIN })
    .withMessage(`Budget minimum must be at least ${VALIDATION_RULES.BUDGET_MIN}`)
    .toFloat(),
  body('budgetMax')
    .optional()
    .isFloat({ min: VALIDATION_RULES.BUDGET_MIN })
    .withMessage(`Budget maximum must be at least ${VALIDATION_RULES.BUDGET_MIN}`)
    .toFloat(),
  body('notes')
    .optional()
    .isLength({ max: VALIDATION_RULES.NOTES_MAX_LENGTH })
    .withMessage(`Notes must be less than ${VALIDATION_RULES.NOTES_MAX_LENGTH} characters`)
];

const validateLeadUpdate = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .isLength({ max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`First name must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty')
    .isLength({ max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`Last name must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('status')
    .optional()
    .isIn(Object.values(LEAD_STATUS))
    .withMessage(`Status must be one of: ${Object.values(LEAD_STATUS).join(', ')}`),
  body('priority')
    .optional()
    .isIn(Object.values(LEAD_PRIORITY))
    .withMessage(`Priority must be one of: ${Object.values(LEAD_PRIORITY).join(', ')}`),
  body('propertyType')
    .optional()
    .isIn(PROPERTY_TYPES)
    .withMessage(`Property type must be one of: ${PROPERTY_TYPES.join(', ')}`),
  body('source')
    .optional()
    .isIn(LEAD_SOURCES)
    .withMessage(`Source must be one of: ${LEAD_SOURCES.join(', ')}`),
  body('budgetMin')
    .optional()
    .isFloat({ min: VALIDATION_RULES.BUDGET_MIN })
    .withMessage(`Budget minimum must be at least ${VALIDATION_RULES.BUDGET_MIN}`)
    .toFloat(),
  body('budgetMax')
    .optional()
    .isFloat({ min: VALIDATION_RULES.BUDGET_MIN })
    .withMessage(`Budget maximum must be at least ${VALIDATION_RULES.BUDGET_MIN}`)
    .toFloat(),
  body('notes')
    .optional()
    .isLength({ max: VALIDATION_RULES.NOTES_MAX_LENGTH })
    .withMessage(`Notes must be less than ${VALIDATION_RULES.NOTES_MAX_LENGTH} characters`)
];

const validateLeadStatusUpdate = [
  body('status')
    .isIn(Object.values(LEAD_STATUS))
    .withMessage(`Status must be one of: ${Object.values(LEAD_STATUS).join(', ')}`),
  body('notes')
    .optional()
    .isLength({ max: VALIDATION_RULES.NOTES_MAX_LENGTH })
    .withMessage(`Notes must be less than ${VALIDATION_RULES.NOTES_MAX_LENGTH} characters`)
];

// Lead filtering validation
const validateLeadFilters = [
  query('status')
    .optional()
    .isIn(Object.values(LEAD_STATUS))
    .withMessage(`Status must be one of: ${Object.values(LEAD_STATUS).join(', ')}`),
  query('priority')
    .optional()
    .isIn(Object.values(LEAD_PRIORITY))
    .withMessage(`Priority must be one of: ${Object.values(LEAD_PRIORITY).join(', ')}`),
  query('propertyType')
    .optional()
    .isIn(PROPERTY_TYPES)
    .withMessage(`Property type must be one of: ${PROPERTY_TYPES.join(', ')}`),
  query('source')
    .optional()
    .isIn(LEAD_SOURCES)
    .withMessage(`Source must be one of: ${LEAD_SOURCES.join(', ')}`),
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search query must be less than 100 characters'),
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Date from must be a valid date'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Date to must be a valid date')
];

// User profile validation
const validateUserProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .isLength({ max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`First name must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty')
    .isLength({ max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`Last name must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
];

// ID validation
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer')
    .toInt()
];

// Export all validation middleware
module.exports = {
  handleValidationErrors,
  validatePagination,
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateLeadCreation,
  validateLeadUpdate,
  validateLeadStatusUpdate,
  validateLeadFilters,
  validateUserProfileUpdate,
  validateId
};