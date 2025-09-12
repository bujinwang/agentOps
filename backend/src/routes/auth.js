
const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate, refreshToken, generateTokens } = require('../middleware/auth');
const { ERROR_MESSAGES, VALIDATION_RULES } = require('../config/constants');
const { logger } = require('../config/logger');
const { authRateLimiter } = require('../config/rateLimiting');
const { apiSecurityHeaders } = require('../middleware/securityHeaders');

const router = express.Router();

// Apply security headers to all auth routes
router.use(apiSecurityHeaders);

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please check your input',
      details: errors.array()
    });
  }
  next();
};

// Register validation
const registerValidation = [
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
    .withMessage(`First name must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`Last name must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`)
];

// Login validation
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Register endpoint
router.post('/register', authRateLimiter, registerValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if email already exists
    const emailExists = await User.emailExists(email);
    if (emailExists) {
      return res.status(409).json({
        error: 'Email already exists',
        message: ERROR_MESSAGES.EMAIL_ALREADY_EXISTS
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName
    });

    // Generate tokens
    const tokens = generateTokens(user);

    logger.info(`User registered successfully: ${user.email}`);

    res.status(201).json({
      message: 'User registered successfully',
      data: {
        user: user.toJSON(),
        tokens
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Login endpoint
router.post('/login', authRateLimiter, loginValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const userResult = await User.findByEmail(email);

    // Always perform password verification to prevent timing attacks
    let passwordHash = '';
    let user = null;
    const loginAttemptTime = Date.now();

    if (userResult) {
      ({ user, passwordHash } = userResult);
    } else {
      // Use a dummy hash for timing attack prevention
      passwordHash = '$2a$10$dummy.hash.for.timing.attack.prevention';
    }

    // Verify password (timing-safe comparison)
    const isPasswordValid = await User.verifyPassword(password, passwordHash);

    // Return same error regardless of whether user exists or password is wrong
    if (!userResult || !isPasswordValid) {
      const failureReason = !userResult ? 'user_not_found' : 'invalid_password';
      logger.warn(`Failed login attempt`, {
        email,
        reason: failureReason,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - loginAttemptTime
      });

      return res.status(401).json({
        error: 'Invalid credentials',
        message: ERROR_MESSAGES.INVALID_CREDENTIALS
      });
    }

    // Generate tokens
    const tokens = generateTokens(user);

    logger.info(`User login successful`, {
      userId: user.user_id,
      email: user.email,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - loginAttemptTime
    });

    res.json({
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        tokens
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Refresh token endpoint
router.post('/refresh', authRateLimiter, refreshToken);

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    res.json({
      message: 'User profile retrieved successfully',
      data: {
        user: req.user.toJSON()
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Update user profile
router.put('/profile', authenticate, [
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`First name must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`Last name must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`)
], handleValidationErrors, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    const updateData = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;

    const updatedUser = await req.user.updateProfile(updateData);

    logger.info(`User profile updated: ${updatedUser.email}`);

    res.json({
      message: 'Profile updated successfully',
      data: {
        user: updatedUser.toJSON()
      }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Change password endpoint
router.put('/change-password', authenticate, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: VALIDATION_RULES.PASSWORD_MIN_LENGTH })
    .withMessage(`New password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters long`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
], handleValidationErrors, async (req, res) => {
  try {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;

    // Find user with password hash
    const userResult = await User.findByEmail(user.email);
    
    if (!userResult) {
      return res.status(404).json({
        error: 'User not found',
        message: ERROR_MESSAGES.USER_NOT_FOUND
      });
    }

    const { passwordHash } = userResult;

    // Verify current password
    const isCurrentPasswordValid = await User.verifyPassword(currentPassword, passwordHash);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Invalid current password',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    await user.updateProfile({ password: newPassword });

    logger.info(`Password changed for user: ${user.email}`);

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Error changing password:', error);
    res.status(500).json({
      error: 'Failed to change password',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

module.exports = router;
