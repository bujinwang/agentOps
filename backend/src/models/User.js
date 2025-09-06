
const { getDatabase } = require('../config/database');
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

  // Create a new user
  static async create(userData) {
    const db = getDatabase();
    const { email, password, firstName, lastName } = userData;

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING user_id, email, first_name, last_name, created_at, updated_at
    `;

    const values = [email, passwordHash, firstName, lastName];
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Failed to create user');
    }

    return new User(result.rows[0]);
  }

  // Find user by email
  static async findByEmail(email) {
    const db = getDatabase();
    const query = `
      SELECT user_id, email, password_hash, first_name, last_name, created_at, updated_at
      FROM users
      WHERE email = $1
      LIMIT 1
    `;

    const result = await db.query(query, [email]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return {
      user: new User(result.rows[0]),
      passwordHash: result.rows[0].password_hash
    };
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

  // Check if email exists
  static async emailExists(email) {
    const db = getDatabase();
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM users WHERE email = $1
      ) as exists
    `;

    const result = await db.query(query, [email]);
    return result.rows[0].exists;
  }

  // Update user profile
  async updateProfile(updateData) {
    const db = getDatabase();
    const { firstName, lastName } = updateData;

    const query = `
      UPDATE users
      SET first_name = $1, last_name = $2, updated_at = NOW()
      WHERE user_id = $3
      RETURNING user_id, email, first_name, last_name, created_at, updated_at
    `;

    const values = [firstName, lastName, this.user_id];
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Failed to update user profile');
    }

    // Update instance
    Object.assign(this, result.rows[0]);
    return this;
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Get user dashboard data
  static async getDashboardData(userId) {
    const db = getDatabase();
    
    // Get user stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'New' THEN 1 END) as new_leads,
        COUNT(CASE WHEN status = 'Contacted' THEN 1 END) as contacted_leads,
        COUNT(CASE WHEN status = 'Qualified' THEN 1 END) as qualified_leads,
        COUNT(CASE WHEN status = 'Closed Won' THEN 1 END) as closed_won,
        COUNT(CASE WHEN priority = 'High' THEN 1 END) as high_priority_leads,
        COUNT(CASE WHEN follow_up_date <= NOW() THEN 1 END) as overdue_follow_ups
      FROM leads
      WHERE user_id = $1
    `;

    const statsResult = await db.query(statsQuery, [userId]);

    // Get recent leads
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

    const recentLeadsResult = await db.query(recentLeadsQuery, [userId]);

    // Get upcoming tasks
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

    const upcomingTasksResult = await db.query(upcomingTasksQuery, [userId]);

    return {
      stats: statsResult.rows[0],
      recentLeads: recentLeadsResult.rows,
      upcomingTasks: upcomingTasksResult.rows
    };
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