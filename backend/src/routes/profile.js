const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { ERROR_MESSAGES, VALIDATION_RULES } = require('../config/constants');
const { logger } = require('../config/logger');

const router = express.Router();

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

// Profile update validation
const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`First name must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: VALIDATION_RULES.NAME_MAX_LENGTH })
    .withMessage(`Last name must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  body('phone')
    .optional()
    .isLength({ max: VALIDATION_RULES.PHONE_MAX_LENGTH })
    .withMessage(`Phone must be less than ${VALIDATION_RULES.PHONE_MAX_LENGTH} characters`),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object')
];

// Change password validation
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: VALIDATION_RULES.PASSWORD_MIN_LENGTH })
    .withMessage(`New password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters long`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Get user profile
router.get('/', authenticate, async (req, res) => {
  try {
    const user = req.user;
    
    // Get additional profile data if needed
    const db = require('../config/database').getDatabase();
    
    const profileQuery = `
      SELECT 
        u.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.created_at,
        u.updated_at,
        p.phone,
        p.preferences,
        p.avatar_url,
        p.timezone,
        p.language,
        p.email_notifications,
        p.push_notifications
      FROM users u
      LEFT JOIN user_profiles p ON u.user_id = p.user_id
      WHERE u.user_id = $1
    `;

    const result = await db.query(profileQuery, [user.user_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Profile not found',
        message: 'User profile not found'
      });
    }

    const profile = result.rows[0];
    
    res.json({
      message: 'Profile retrieved successfully',
      data: {
        userId: profile.user_id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        phone: profile.phone,
        avatarUrl: profile.avatar_url,
        timezone: profile.timezone,
        language: profile.language,
        emailNotifications: profile.email_notifications,
        pushNotifications: profile.push_notifications,
        preferences: profile.preferences,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      }
    });
  } catch (error) {
    logger.error('Error getting profile:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Update user profile
router.put('/', authenticate, updateProfileValidation, handleValidationErrors, async (req, res) => {
  try {
    const user = req.user;
    const updateData = {};
    
    // Collect update data
    if (req.body.firstName !== undefined) updateData.first_name = req.body.firstName;
    if (req.body.lastName !== undefined) updateData.last_name = req.body.lastName;
    if (req.body.phone !== undefined) updateData.phone = req.body.phone;
    if (req.body.preferences !== undefined) updateData.preferences = JSON.stringify(req.body.preferences);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        message: 'Please provide at least one field to update'
      });
    }

    // Update user basic info
    if (updateData.first_name || updateData.last_name) {
      const userUpdateData = {};
      if (updateData.first_name) userUpdateData.first_name = updateData.first_name;
      if (updateData.last_name) userUpdateData.last_name = updateData.last_name;

      const updatedUser = await user.updateProfile(userUpdateData);
      
      // Update req.user with new data
      req.user.first_name = updatedUser.first_name;
      req.user.last_name = updatedUser.last_name;
    }

    // Update profile-specific data if any
    if (updateData.phone || updateData.preferences) {
      const db = require('../config/database').getDatabase();
      
      // Check if profile exists
      const checkQuery = 'SELECT user_id FROM user_profiles WHERE user_id = $1';
      const checkResult = await db.query(checkQuery, [user.user_id]);
      
      if (checkResult.rows.length === 0) {
        // Create profile if it doesn't exist
        const insertQuery = `
          INSERT INTO user_profiles (user_id, phone, preferences, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
        `;
        await db.query(insertQuery, [
          user.user_id,
          updateData.phone || null,
          updateData.preferences || null
        ]);
      } else {
        // Update existing profile
        const fields = [];
        const values = [];
        let paramIndex = 0;

        if (updateData.phone !== undefined) {
          paramIndex++;
          fields.push(`phone = $${paramIndex}`);
          values.push(updateData.phone);
        }

        if (updateData.preferences !== undefined) {
          paramIndex++;
          fields.push(`preferences = $${paramIndex}`);
          values.push(updateData.preferences);
        }

        if (fields.length > 0) {
          paramIndex++;
          fields.push('updated_at = NOW()');
          values.push(user.user_id);

          const updateQuery = `
            UPDATE user_profiles
            SET ${fields.join(', ')}
            WHERE user_id = $${paramIndex}
          `;

          await db.query(updateQuery, values);
        }
      }
    }

    logger.info(`Profile updated for user: ${user.user_id}`);

    res.json({
      message: 'Profile updated successfully',
      data: {
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: updateData.phone,
        preferences: req.body.preferences
      }
    });
  } catch (error) {
    logger.error('Error updating profile:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Change password
router.put('/change-password', authenticate, changePasswordValidation, handleValidationErrors, async (req, res) => {
  try {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;

    // Get user's password hash
    const db = require('../config/database').getDatabase();
    const passwordQuery = 'SELECT password_hash FROM users WHERE user_id = $1';
    const passwordResult = await db.query(passwordQuery, [user.user_id]);
    
    if (passwordResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User not found'
      });
    }

    const currentPasswordHash = passwordResult.rows[0].password_hash;

    // Verify current password
    const isCurrentPasswordValid = await User.verifyPassword(currentPassword, currentPasswordHash);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Invalid current password',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const bcrypt = require('bcrypt');
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const updateQuery = `
      UPDATE users
      SET password_hash = $1, updated_at = NOW()
      WHERE user_id = $2
    `;

    await db.query(updateQuery, [newPasswordHash, user.user_id]);

    logger.info(`Password changed for user: ${user.user_id}`);

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

// Upload avatar
router.post('/avatar', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { avatarUrl } = req.body;

    if (!avatarUrl) {
      return res.status(400).json({
        error: 'Missing avatar URL',
        message: 'Avatar URL is required'
      });
    }

    const db = require('../config/database').getDatabase();
    
    // Check if profile exists
    const checkQuery = 'SELECT user_id FROM user_profiles WHERE user_id = $1';
    const checkResult = await db.query(checkQuery, [user.user_id]);
    
    if (checkResult.rows.length === 0) {
      // Create profile if it doesn't exist
      const insertQuery = `
        INSERT INTO user_profiles (user_id, avatar_url, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
      `;
      await db.query(insertQuery, [user.user_id, avatarUrl]);
    } else {
      // Update existing profile
      const updateQuery = `
        UPDATE user_profiles
        SET avatar_url = $1, updated_at = NOW()
        WHERE user_id = $2
      `;
      await db.query(updateQuery, [avatarUrl, user.user_id]);
    }

    logger.info(`Avatar updated for user: ${user.user_id}`);

    res.json({
      message: 'Avatar updated successfully',
      data: {
        avatarUrl: avatarUrl
      }
    });
  } catch (error) {
    logger.error('Error updating avatar:', error);
    res.status(500).json({
      error: 'Failed to update avatar',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

module.exports = router;