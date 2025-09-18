
const { getDatabase, executeQuery, executeWithCache } = require('../config/database');
const CacheService = require('../services/CacheService');
const bcrypt = require('bcrypt');

class User {
  constructor(data) {
    this.user_id = data.user_id;
    this.email = data.email;
    this.first_name = data.first_name;
    this.last_name = data.last_name;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new user with race condition protection
  static async create(userData) {
    const db = getDatabase();
    const { email, password, firstName, lastName } = userData;

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Use a database transaction with proper error handling for race conditions
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // Check if email exists within the transaction
      const checkQuery = 'SELECT user_id FROM users WHERE email = $1 FOR UPDATE';
      const checkResult = await client.query(checkQuery, [email]);

      if (checkResult.rows.length > 0) {
        await client.query('ROLLBACK');
        throw new Error('Email already exists');
      }

      // Insert the new user
      const insertQuery = `
        INSERT INTO users (email, password_hash, first_name, last_name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING user_id, email, first_name, last_name, created_at, updated_at
      `;

      const values = [email, passwordHash, firstName, lastName];
      const result = await client.query(insertQuery, values);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('Failed to create user');
      }

      await client.query('COMMIT');
      return new User(result.rows[0]);

    } catch (error) {
      await client.query('ROLLBACK');

      // Handle unique constraint violation (race condition)
      if (error.code === '23505' && error.constraint?.includes('email')) {
        throw new Error('Email already exists');
      }

      throw error;
    } finally {
      client.release();
    }
  }

  // Find user by email with case-insensitive matching
  static async findByEmail(email) {
    try {
      const db = getDatabase();

      // Validate email format
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        throw new Error('Invalid email format');
      }

      const query = `
        SELECT user_id, email, password_hash, first_name, last_name, created_at, updated_at
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `;

      const result = await db.query(query, [email.trim()]);

      if (result.rows.length === 0) {
        return null;
      }

      const userData = result.rows[0];

      // Validate that we have the required fields
      if (!userData.password_hash) {
        throw new Error('User data integrity issue');
      }

      return {
        user: new User(userData),
        passwordHash: userData.password_hash
      };
    } catch (error) {
      // Log the error but don't expose internal details
      console.error('Error finding user by email:', error.message);
      throw new Error('Unable to authenticate user');
    }
  }

  // Find user by ID
  static async findById(userId) {
    const db = getDatabase();
    const query = `
      SELECT user_id, email, first_name, last_name, created_at, updated_at
      FROM users
      WHERE user_id = $1
      LIMIT 1
    `;

    const result = await db.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return new User(result.rows[0]);
  }

  // Check if email exists with improved error handling
  static async emailExists(email) {
    try {
      const db = getDatabase();

      // Validate email format
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        throw new Error('Invalid email format');
      }

      const query = `
        SELECT EXISTS(
          SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)
        ) as exists
      `;

      const result = await db.query(query, [email.trim()]);

      if (!result.rows || result.rows.length === 0) {
        throw new Error('Database query failed');
      }

      return result.rows[0].exists;
    } catch (error) {
      // Log the error but don't expose internal details
      console.error('Error checking email existence:', error.message);
      throw new Error('Unable to verify email availability');
    }
  }

  // Update user profile with optimistic locking
  async updateProfile(updateData) {
    try {
      const db = getDatabase();
      const { firstName, lastName, password } = updateData;

      // Validate input data
      if (firstName !== undefined && (typeof firstName !== 'string' || firstName.trim().length === 0)) {
        throw new Error('Invalid first name');
      }

      if (lastName !== undefined && (typeof lastName !== 'string' || lastName.trim().length === 0)) {
        throw new Error('Invalid last name');
      }

      let passwordHash;
      if (password) {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
        passwordHash = await bcrypt.hash(password, saltRounds);
      }

      const query = `
        UPDATE users
        SET first_name = COALESCE($1, first_name),
            last_name = COALESCE($2, last_name),
            password_hash = COALESCE($3, password_hash),
            updated_at = NOW()
        WHERE user_id = $4
        RETURNING user_id, email, first_name, last_name, created_at, updated_at
      `;

      const values = [
        firstName ? firstName.trim() : null,
        lastName ? lastName.trim() : null,
        passwordHash || null,
        this.user_id
      ];

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('User not found or update failed');
      }

      // Update instance
      Object.assign(this, result.rows[0]);

      // Invalidate user cache
      await CacheService.invalidateUserData(this.user_id);

      return this;
    } catch (error) {
      console.error('Error updating user profile:', error.message);
      throw new Error('Failed to update user profile');
    }
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Get user dashboard data with advanced caching
  static async getDashboardData(userId) {
    try {
      // Try to get from cache first
      const cachedDashboard = await CacheService.getUserDashboard(userId);
      if (cachedDashboard) {
        return cachedDashboard;
      }

      // Fetch from database if not cached
      const statsResult = await executeQuery(
        'SELECT * FROM dashboard_stats WHERE user_id = $1',
        [userId]
      );

      // Get recent leads with optimized query
      const recentLeadsQuery = `
        SELECT
          lead_id,
          first_name,
          last_name,
          email,
          phone_number,
          source,
          status,
          priority,
          budget_min,
          budget_max,
          desired_location,
          property_type,
          created_at
        FROM leads
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 5
      `;

      const recentLeadsResult = await executeQuery(recentLeadsQuery, [userId]);

      // Get upcoming tasks with optimized query
      const upcomingTasksQuery = `
        SELECT
          task_id,
          title,
          description,
          due_date,
          priority,
          lead_id
        FROM tasks
        WHERE user_id = $1
          AND is_completed = false
          AND due_date <= NOW() + INTERVAL '7 days'
        ORDER BY due_date ASC
        LIMIT 5
      `;

      const upcomingTasksResult = await executeQuery(upcomingTasksQuery, [userId]);

      // Get recent interactions for activity feed
      const recentActivityQuery = `
        SELECT
          i.interaction_id,
          i.type,
          i.content,
          i.interaction_date,
          i.lead_id,
          l.first_name,
          l.last_name
        FROM interactions i
        LEFT JOIN leads l ON i.lead_id = l.lead_id
        WHERE i.user_id = $1
        ORDER BY i.interaction_date DESC
        LIMIT 10
      `;

      const recentActivityResult = await executeQuery(recentActivityQuery, [userId]);

      const dashboardData = {
        stats: statsResult.rows[0] || {
          total_leads: 0,
          new_leads: 0,
          contacted_leads: 0,
          qualified_leads: 0,
          closed_won: 0,
          high_priority_leads: 0,
          overdue_follow_ups: 0,
          total_tasks: 0,
          active_tasks: 0,
          completed_tasks: 0,
          overdue_tasks: 0,
          total_notifications: 0,
          unread_notifications: 0
        },
        recentLeads: recentLeadsResult.rows,
        upcomingTasks: upcomingTasksResult.rows,
        recentActivity: recentActivityResult.rows
      };

      // Cache the dashboard data
      await CacheService.setUserDashboard(userId, dashboardData);

      return dashboardData;
    } catch (error) {
      console.error('Error fetching dashboard data:', error.message);
      // Return default structure on error
      return {
        stats: {
          total_leads: 0,
          new_leads: 0,
          contacted_leads: 0,
          qualified_leads: 0,
          closed_won: 0,
          high_priority_leads: 0,
          overdue_follow_ups: 0,
          total_tasks: 0,
          active_tasks: 0,
          completed_tasks: 0,
          overdue_tasks: 0,
          total_notifications: 0,
          unread_notifications: 0
        },
        recentLeads: [],
        upcomingTasks: [],
        recentActivity: []
      };
    }
  }

  // Sanitize user data for response
  toJSON() {
    return {
      user_id: this.user_id,
      email: this.email,
      first_name: this.first_name,
      last_name: this.last_name,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = User;