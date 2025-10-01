# Quick Start Guide - Real Estate CRM API

> Get up and running in 5 minutes

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ running
- Database created and schema loaded

## 1. Install Dependencies

```bash
cd backend
npm install
```

## 2. Configure Environment

Create `.env` file:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=real_estate_crm
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT Secrets (change these!)
JWT_SECRET=your_random_secret_key_here_min_32_chars
JWT_REFRESH_SECRET=your_random_refresh_secret_here_min_32_chars

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3001,http://localhost:19000
```

## 3. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev:ts

# Production mode
npm run build
npm start
```

Server starts at: `http://localhost:3000`

## 4. Test the API

### Health Check

```bash
curl http://localhost:3000/health
```

### Register a User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Save the `accessToken` from the response!**

### Create a Lead

```bash
TOKEN="paste_your_token_here"

curl -X POST http://localhost:3000/api/v1/leads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "+1-555-0100",
    "priority": "High"
  }'
```

## 5. Run Tests

```bash
# Run all tests
npm run test:ts

# Run with coverage
npm run test:ts -- --coverage

# Run specific test
npm run test:ts -- auth.test.ts
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:ts` | Start development server with auto-reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production server |
| `npm run test:ts` | Run test suite |
| `npm run test:ts -- --watch` | Run tests in watch mode |
| `npm run test:ts -- --coverage` | Run tests with coverage report |

## API Endpoints Summary

### Authentication (4 endpoints)
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get current user

### Leads (6 endpoints)
- `POST /api/v1/leads` - Create lead
- `GET /api/v1/leads` - List leads
- `GET /api/v1/leads/:id` - Get lead
- `PUT /api/v1/leads/:id` - Update lead
- `DELETE /api/v1/leads/:id` - Delete lead
- `GET /api/v1/leads/stats` - Get statistics

### Tasks (8 endpoints)
- `POST /api/v1/tasks` - Create task
- `GET /api/v1/tasks` - List tasks
- `GET /api/v1/tasks/:id` - Get task
- `PUT /api/v1/tasks/:id` - Update task
- `DELETE /api/v1/tasks/:id` - Delete task
- `POST /api/v1/tasks/:id/complete` - Complete task
- `POST /api/v1/tasks/:id/incomplete` - Incomplete task
- `GET /api/v1/tasks/stats` - Get statistics

### Interactions (6 endpoints)
- `POST /api/v1/interactions` - Log interaction
- `GET /api/v1/interactions` - List interactions
- `GET /api/v1/interactions/:id` - Get interaction
- `DELETE /api/v1/interactions/:id` - Delete interaction
- `GET /api/v1/interactions/leads/:leadId/timeline` - Get timeline
- `GET /api/v1/interactions/stats` - Get statistics

## Documentation

- **Complete API Reference:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Testing Guide:** [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- **Project Overview:** [README_TYPESCRIPT.md](./README_TYPESCRIPT.md)

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change PORT in .env
PORT=3001
```

### Database Connection Error

1. Verify PostgreSQL is running
2. Check database credentials in `.env`
3. Ensure database exists: `createdb real_estate_crm`
4. Load schema: `psql real_estate_crm < ../schema.sql`

### TypeScript Errors

```bash
# Clean and rebuild
rm -rf dist/
npm run build
```

### Test Failures

```bash
# Run tests with verbose output
npm run test:ts -- --verbose

# Check database connection
psql -h localhost -U your_user -d real_estate_crm -c "SELECT NOW();"
```

## Support

For issues or questions:
- Check the complete documentation in `API_DOCUMENTATION.md`
- Review test examples in `backend/src-ts/__tests__/`
- See `TESTING_GUIDE.md` for testing help

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Sprint:** Sprint 3 Complete
