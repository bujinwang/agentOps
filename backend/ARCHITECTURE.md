
# Express.js API Architecture for Real Estate CRM

## System Overview

Migration from n8n workflows to a high-performance Express.js API with the following goals:
- **10-15x performance improvement** (1.5-3s → 100-200ms response times)
- **Better scalability** with connection pooling and caching
- **Improved maintainability** with proper MVC architecture
- **Background job processing** for AI analysis
- **Comprehensive error handling** and validation

## API Endpoints Migration

### Current n8n Endpoints → New Express.js Endpoints

| Method | n8n Endpoint | New Express Endpoint | Description |
|--------|--------------|---------------------|-------------|
| POST | `/webhook/auth/register` | `/api/auth/register` | User registration |
| POST | `/webhook/auth/login` | `/api/auth/login` | User login |
| POST | `/webhook/leads` | `/api/leads` | Create lead (protected) |
| GET | `/webhook/leads` | `/api/leads` | Get leads list (protected) |
| GET | `/webhook/leads/{leadId}` | `/api/leads/:id` | Get lead detail (protected) |
| PUT | `/webhook/leads/{leadId}/status` | `/api/leads/:id/status` | Update lead status (protected) |

## Technology Stack

### Core Dependencies
- **express**: ^4.18.2 - Web framework
- **pg**: ^8.11.3 - PostgreSQL client with connection pooling
- **bcrypt**: ^5.1.1 - Password hashing (faster than bcryptjs)
- **jsonwebtoken**: ^9.0.2 - JWT authentication
- **joi**: ^17.11.0 - Input validation
- **cors**: ^2.8.5 - CORS handling
- **helmet**: ^7.1.0 - Security headers
- **compression**: ^1.7.4 - Response compression
- **morgan**: ^1.10.0 - HTTP request logging

### Performance & Background Processing
- **bull**: ^4.12.2 - Redis-based job queue for AI processing
- **redis**: ^4.6.10 - Caching and session storage
- **express-rate-limit**: ^7.1.5 - Rate limiting

### AI Integration
- **openai**: ^4.20.1 - OpenAI API client
- **axios**: ^1.6.2 - HTTP client for external APIs

### Development & Monitoring
- **nodemon**: ^3.0.2 - Development auto-restart
- **winston**: ^3.11.0 - Structured logging
- **express-validator**: ^7.0.1 - Request validation
- **swagger-jsdoc**: ^6.2.8 - API documentation
- **swagger-ui-express**: ^5.0.0 - API documentation UI

## Architecture Design

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.js   # Database connection pool
│   │   ├── redis.js      # Redis client
│   │   ├── logger.js     # Winston logger setup
│   │   └── constants.js  # App constants
│   │
│   ├── controllers/      # Request handlers
│   │   ├── authController.js
│   │   ├── leadController.js
│   │   └── userController.js
│   │
│   ├── models/          # Database models
│   │   ├── User.js
│   │   ├── Lead.js
│   │   └── Interaction.js
│   │
│   ├── services/        # Business logic
│   │   ├── authService.js
│   │   ├── leadService.js
│   │   ├── aiService.js
│   │   └── cacheService.js
│   │
│   ├── middleware/      # Express middleware
│   │   ├── auth.js      # JWT authentication
│   │   ├── validation.js # Input validation
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   │
│   ├── routes/          # API routes
│   │   ├── auth.js
│   │   ├── leads.js
│   │   └── users.js
│   │
│   ├── jobs/            # Background jobs
│   │   ├── aiAnalysis.js
│   │   └── emailNotifications.js
│   │
│   ├── utils/           # Utility functions
│   │   ├── validators.js
│   │   ├── formatters.js
│   │   └── pagination.js
