import { query } from '../config/database';
import bcrypt from 'bcrypt';

export interface User {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreate {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

export class UserModel {
  static async create(userData: UserCreate): Promise<User> {
    const { email, password, firstName, lastName } = userData;
    
    // Hash password with 12 salt rounds
    const passwordHash = await bcrypt.hash(password, 12);
    
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING user_id, email, first_name, last_name, created_at, updated_at`,
      [email, passwordHash, firstName, lastName]
    );
    
    return this.mapRow(result.rows[0]);
  }

  static async findByEmail(email: string): Promise<UserWithPassword | null> {
    const result = await query(
      'SELECT user_id, email, password_hash, first_name, last_name, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      ...this.mapRow(row),
      passwordHash: row.password_hash
    };
  }

  static async findById(userId: number): Promise<User | null> {
    const result = await query(
      'SELECT user_id, email, first_name, last_name, created_at, updated_at FROM users WHERE user_id = $1',
      [userId]
    );
    
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private static mapRow(row: any): User {
    return {
      userId: row.user_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
