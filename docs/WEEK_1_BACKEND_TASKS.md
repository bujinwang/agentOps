# Week 1 - Backend Developer Tasks

> **⚠️ SECURITY NOTE:** All credentials, passwords, tokens, and API keys in this document are EXAMPLE VALUES for development/testing purposes only. Never use these values in production. Generate strong, unique secrets for production environments.

## Story 3.1: Backend API Migration - Week 1

**Owner:** Backend Developer  
**Week:** 1 of 14  
**Focus:** Express.js Foundation + JWT Authentication

---

## Monday - Project Setup

### Morning (4 hours)
**Task 1.1: Create Express.js Application**

```bash
# Create backend structure
cd backend
npm init -y

# Install core dependencies
npm install express cors helmet compression body-parser
npm install dotenv pg pg-pool
npm install jsonwebtoken bcryptjs

# Install TypeScript and dev dependencies
npm install -D typescript @types/node @types/express
npm install -D @types/jsonwebtoken @types/bcryptjs
npm install -D ts-node nodemon
npm install -D eslint prettier eslint-config-prettier
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Initialize TypeScript
npx tsc --init
```

**Deliverables:**
- [ ] `package.json` configured
- [ ] `tsconfig.json` configured with strict mode
- [ ] All dependencies installed
- [ ] TypeScript compiling successfully

**File Structure to Create:**
```
backend/src/
├── app.ts                  # Express app setup
├── server.ts               # Server startup
├── config/
│   └── database.ts         # DB connection config
├── middleware/
│   ├── auth.middleware.ts  # JWT verification
│   ├── validate.middleware.ts # Request validation
│   └── error.middleware.ts # Error handling
├── routes/
│   └── auth.routes.ts      # Auth endpoints
├── controllers/
│   └── auth.controller.ts  # Auth logic
├── services/
│   └── auth.service.ts     # Business logic
├── models/
│   └── user.model.ts       # User model
├── utils/
│   ├── response.ts         # Response formatter
│   └── jwt.ts              # JWT utilities
└── types/
    └── express.d.ts        # Type definitions
```

### Afternoon (4 hours)
**Task 1.2: Setup Middleware Stack**

Create `src/app.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/auth', authRoutes);

// Error handling (must be last)
app.use(errorHandler);

export default app;
```

Create `src/server.ts`:
```typescript
import app from './app';
import { connectDatabase } from './config/database';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected');

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
```

**Deliverables:**
- [ ] Express app structure created
- [ ] Middleware stack configured
- [ ] Health check endpoint working
- [ ] Server starts successfully
- [ ] Can access http://localhost:3000/health

---

## Tuesday - Authentication System

### Morning (4 hours)
**Task 2.1: Database Connection & User Model**

Create `src/config/database.ts`:
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function connectDatabase() {
  try {
    const client = await pool.connect();
    console.log('Database connection test successful');
    client.release();
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

export default pool;
```

Create `src/models/user.model.ts`:
```typescript
import { query } from '../config/database';
import bcrypt from 'bcryptjs';

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

export class UserModel {
  static async create(userData: UserCreate): Promise<User> {
    const { email, password, firstName, lastName } = userData;
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING user_id, email, first_name, last_name, created_at, updated_at`,
      [email, passwordHash, firstName, lastName]
    );
    
    return this.mapRow(result.rows[0]);
  }

  static async findByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) return null;
    
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
```

**Deliverables:**
- [ ] Database connection established
- [ ] Connection pool configured
- [ ] User model with CRUD operations
- [ ] Password hashing implemented (bcrypt, 12 rounds)
- [ ] Parameterized queries (SQL injection safe)

### Afternoon (4 hours)
**Task 2.2: JWT Utilities & Middleware**

Create `src/utils/jwt.ts`:
```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'EXAMPLE_FALLBACK_CHANGE_IN_PRODUCTION';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: number;
  email: string;
}

export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
```

Create `src/middleware/auth.middleware.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token required',
        },
      });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  }
}
```

**Deliverables:**
- [ ] JWT generation functions
- [ ] JWT verification functions
- [ ] Auth middleware protecting routes
- [ ] Access token (24h) and refresh token (7d)
- [ ] Proper error responses for invalid tokens

---

## Wednesday - Auth Endpoints

### Morning (4 hours)
**Task 2.3: Auth Controller & Service**

Create `src/services/auth.service.ts`:
```typescript
import { UserModel, UserCreate } from '../models/user.model';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';

export class AuthService {
  async register(userData: UserCreate) {
    // Check if user exists
    const existingUser = await UserModel.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
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

  async login(email: string, password: string) {
    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValid = await UserModel.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password');
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

  async refreshToken(token: string) {
    const payload = verifyToken(token);
    
    // Generate new access token
    const accessToken = generateAccessToken({
      userId: payload.userId,
      email: payload.email,
    });

    return { accessToken };
  }
}
```

Create `src/controllers/auth.controller.ts`:
```typescript
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { body, validationResult } from 'express-validator';

const authService = new AuthService();

export const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
];

export async function register(req: Request, res: Response) {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array(),
        },
      });
    }

    const result = await authService.register(req.body);

    return res.status(201).json({
      success: true,
      data: result,
      message: 'User registered successfully',
    });
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: error.message,
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: 'Failed to register user',
      },
    });
  }
}

export const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

export async function login(req: Request, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array(),
        },
      });
    }

    const { email, password } = req.body;
    const result = await authService.login(email, password);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Login successful',
    });
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token required',
        },
      });
    }

    const result = await authService.refreshToken(refreshToken);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
        },
    });
  }
}
```

**Deliverables:**
- [ ] Auth service with business logic
- [ ] Auth controller with request handling
- [ ] Input validation using express-validator
- [ ] Proper error responses with codes
- [ ] Password never returned in responses

### Afternoon (4 hours)
**Task 2.4: Auth Routes & Testing**

Create `src/routes/auth.routes.ts`:
```typescript
import { Router } from 'express';
import {
  register,
  registerValidation,
  login,
  loginValidation,
  refreshToken,
} from '../controllers/auth.controller';

const router = Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/refresh', refreshToken);

export default router;
```

**Manual Testing:**
```bash
# Test registration
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "examplePass123",
    "firstName": "Test",
    "lastName": "User"
  }'

# Test login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'

# Test protected route
curl http://localhost:3000/api/v1/protected \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Deliverables:**
- [ ] Auth routes configured
- [ ] POST /api/v1/auth/register works
- [ ] POST /api/v1/auth/login returns JWT
- [ ] POST /api/v1/auth/refresh works
- [ ] Manual testing completed

---

## Thursday - Testing Setup

### Morning (4 hours)
**Task 3.1: Test Framework Setup**

```bash
# Install testing dependencies
npm install -D jest ts-jest @types/jest
npm install -D supertest @types/supertest

# Create jest config
npx ts-jest config:init
```

Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

Create `src/__tests__/auth.test.ts`:
```typescript
import request from 'supertest';
import app from '../app';

describe('Auth API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'examplePass123',
          firstName: 'New',
          lastName: 'User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'examplePass123',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 409 for duplicate email', async () => {
      // Register once
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'examplePass123',
          firstName: 'Test',
          lastName: 'User',
        });

      // Try again
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'examplePass123',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeAll(async () => {
      // Create test user
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'testlogin@example.com',
          password: 'examplePass123',
          firstName: 'Test',
          lastName: 'Login',
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'testlogin@example.com',
          password: 'examplePass123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'testlogin@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
```

**Run tests:**
```bash
npm test
npm run test:coverage
```

**Deliverables:**
- [ ] Jest test framework configured
- [ ] Test database setup (or use mock)
- [ ] At least 5 unit tests for auth endpoints
- [ ] All tests passing
- [ ] Coverage >80% for auth code

### Afternoon (4 hours)
**Task 3.2: Error Handling & Validation**

Create `src/middleware/error.middleware.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Handle PostgreSQL errors
  if (err.name === 'QueryError' || (err as any).code?.startsWith('23')) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed',
      },
    });
  }

  // Default 500 error
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
```

Create `src/utils/response.ts`:
```typescript
export function successResponse(data: any, message?: string) {
  return {
    success: true,
    data,
    message,
  };
}

export function errorResponse(code: string, message: string, details?: any) {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}
```

**Deliverables:**
- [ ] Centralized error handling middleware
- [ ] Custom AppError class
- [ ] Consistent error response format
- [ ] Response utility functions
- [ ] All errors return proper HTTP codes

---

## Friday - Documentation & Review

### Morning (4 hours)
**Task 4.1: API Documentation**

```bash
# Install Swagger dependencies
npm install swagger-jsdoc swagger-ui-express
npm install -D @types/swagger-jsdoc @types/swagger-ui-express
```

Create `src/config/swagger.ts`:
```typescript
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Real Estate CRM API',
      version: '1.0.0',
      description: 'API documentation for Real Estate CRM',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
```

Add to `src/app.ts`:
```typescript
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

Add JSDoc comments to routes:
```typescript
/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: User already exists
 */
router.post('/register', registerValidation, register);
```

**Deliverables:**
- [ ] Swagger documentation setup
- [ ] All auth endpoints documented
- [ ] Access docs at http://localhost:3000/api-docs
- [ ] Request/response schemas defined
- [ ] Try-it-out feature working

### Afternoon (4 hours)
**Task 4.2: Code Review & Cleanup**

**Checklist:**
- [ ] Code follows TypeScript best practices
- [ ] All functions have proper types
- [ ] No `any` types without good reason
- [ ] ESLint passes (no warnings)
- [ ] Prettier formatting applied
- [ ] All console.logs removed or replaced with proper logging
- [ ] Environment variables documented in .env.example
- [ ] README.md updated with setup instructions
- [ ] All tests passing
- [ ] Coverage >80%

Create `.env.example`:
```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/real_estate_crm

# JWT
JWT_SECRET=CHANGE_ME_TO_LONG_RANDOM_STRING_IN_PRODUCTION

# CORS
CORS_ORIGIN=http://localhost:3001,http://localhost:19000
```

Update `backend/README.md`:
```markdown
# Backend API

Express.js TypeScript API for Real Estate CRM.

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Copy environment file:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

3. Update .env with your database credentials

4. Run migrations:
   \`\`\`bash
   npm run migrate
   \`\`\`

5. Start development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## API Documentation

Swagger docs available at: http://localhost:3000/api-docs

## Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token

## Testing

Run all tests:
\`\`\`bash
npm test
\`\`\`

Run with coverage:
\`\`\`bash
npm run test:coverage
\`\`\`
```

**Deliverables:**
- [ ] Code reviewed and cleaned
- [ ] README.md comprehensive
- [ ] .env.example complete
- [ ] All linting/formatting passes
- [ ] Ready for demo

---

## Week 1 Daily Standup Template

### Daily Standup Format (15 min, 9:00 AM)

**What did I complete yesterday?**
- [ ] List specific tasks completed

**What will I work on today?**
- [ ] List planned tasks for today

**Any blockers or concerns?**
- [ ] List blockers (escalate if critical)

---

## Week 1 Success Checklist

### Technical Deliverables
- [ ] Express.js app with TypeScript running
- [ ] JWT authentication system working
- [ ] POST /api/v1/auth/register endpoint complete
- [ ] POST /api/v1/auth/login endpoint complete
- [ ] POST /api/v1/auth/refresh endpoint complete
- [ ] JWT middleware protects routes
- [ ] Request validation with express-validator
- [ ] Error handling middleware
- [ ] Test framework setup (Jest)
- [ ] At least 5 unit tests passing
- [ ] Test coverage >80% for auth code
- [ ] Swagger documentation at /api-docs
- [ ] All endpoints documented
- [ ] README.md updated
- [ ] Code linted and formatted

### Quality Gates
- [ ] All tests passing
- [ ] ESLint: 0 errors, 0 warnings
- [ ] Prettier: All files formatted
- [ ] Coverage: >80% lines, functions, branches
- [ ] Security: No hardcoded secrets
- [ ] Types: No implicit `any` types

### Documentation
- [ ] API endpoints documented in Swagger
- [ ] README.md with setup instructions
- [ ] .env.example complete
- [ ] Inline code comments for complex logic

---

## End of Week 1 Demo

### Prepare Demo (Friday afternoon)

**What to demonstrate:**
1. Start the server
2. Show health check: GET /health
3. Register a new user: POST /auth/register
4. Login with user: POST /auth/login (get JWT)
5. Try accessing protected route without token (401)
6. Access protected route with token (200)
7. Show Swagger docs at /api-docs
8. Run tests: npm test (show coverage)
9. Show code quality: npm run lint

**Demo Script:**
```bash
# 1. Start server
npm run dev

# 2. Health check
curl http://localhost:3000/health

# 3. Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"examplePass123","firstName":"Demo","lastName":"User"}'

# 4. Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"examplePass123"}'

# 5. Save token from response, then:
export TOKEN="PASTE_YOUR_JWT_TOKEN_FROM_LOGIN_RESPONSE"

# 6. Protected route test (when implemented)
curl http://localhost:3000/api/v1/protected \
  -H "Authorization: Bearer $TOKEN"

# 7. Open Swagger docs
open http://localhost:3000/api-docs

# 8. Run tests
npm test
npm run test:coverage

# 9. Linting
npm run lint
```

---

## Week 1 Risks & Mitigation

### Potential Risks

**Risk 1: Database connection issues**
- Mitigation: Test connection early Monday
- Fallback: Use mock database for development

**Risk 2: TypeScript configuration problems**
- Mitigation: Use proven tsconfig.json template
- Fallback: Ask Tech Lead for help

**Risk 3: JWT implementation complexity**
- Mitigation: Follow established patterns
- Fallback: Use jsonwebtoken library examples

**Risk 4: Test coverage not reaching 80%**
- Mitigation: Write tests alongside code
- Fallback: Focus on critical paths first

---

## Communication

### Daily Updates
Post in #sprint-3 at end of day:
```
✅ Completed: [List tasks]
🚧 In Progress: [Current task]
📅 Tomorrow: [Planned tasks]
🚨 Blockers: [None or list]
```

### When to Escalate
Escalate immediately if:
- Blocked for >2 hours
- Database connection fails
- Major architectural decisions needed
- Timeline concerns

### Who to Contact
- **Technical questions:** Tech Lead
- **Requirements:** Product Owner
- **Process/blockers:** Scrum Master
- **Infrastructure:** DevOps Engineer

---

## End of Week 1 Status Report

### Metrics to Report
- [ ] Lines of code written: ____
- [ ] Tests written: ____
- [ ] Test coverage: ____%
- [ ] Endpoints completed: ____/3
- [ ] Hours spent: ____/40

### Next Week Preview
- Week 2 focus: Lead management endpoints
- Prepare for: CRUD operations, validation, pagination
- Dependencies: Database schema must be finalized

---

**Week 1 Owner:** Backend Developer  
**Status:** 🚀 READY TO START  
**Start Date:** [Monday date]
