import { UserModel, UserCreate, User } from '../models/user.model';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import { AppError } from '../middleware/error.middleware';

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  async register(userData: UserCreate): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await UserModel.findByEmail(userData.email);
    if (existingUser) {
      throw new AppError(409, 'USER_EXISTS', 'User with this email already exists');
    }

    // Create user
    const user = await UserModel.create(userData);

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.userId,
      email: user.email,
    });
    const refreshToken = generateRefreshToken({
      userId: user.userId,
      email: user.email,
    });

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Verify password
    const isValid = await UserModel.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.userId,
      email: user.email,
    });
    const refreshToken = generateRefreshToken({
      userId: user.userId,
      email: user.email,
    });

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(token: string): Promise<{ accessToken: string }> {
    try {
      const payload = verifyToken(token);
      
      // Generate new access token
      const accessToken = generateAccessToken({
        userId: payload.userId,
        email: payload.email,
      });

      return { accessToken };
    } catch (error: any) {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', error.message || 'Invalid or expired refresh token');
    }
  }

  async getCurrentUser(userId: number): Promise<User | null> {
    return UserModel.findById(userId);
  }
}
