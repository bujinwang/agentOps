# 🚀 Developer Onboarding Guide

Welcome to the Real Estate CRM System! This comprehensive guide will help you get up and running quickly and understand the project's architecture, development processes, and best practices.

## 🎯 Quick Start (15 minutes)

### 1. Environment Setup
```bash
# Clone and setup
git clone <repository-url>
cd real-estate-crm
cp .env.example .env

# Start infrastructure
docker-compose up -d postgres redis

# Backend setup
cd backend
npm install
npm run migrate
npm run dev

# Frontend setup (new terminal)
cd frontend
npm install
npm start
```

### 2. First API Call
```bash
# Test backend health
curl http://localhost:3000/health

# View API documentation
open http://localhost:3000/api-docs
```

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Native  │    │   Express.js    │    │   PostgreSQL    │
│   Mobile App    │◄──►│   API Server    │◄──►│   Database      │
│                 │    │                 │    │                 │
│ • Offline-first │    │ • REST API      │    │ • ACID          │
│ • Real-time     │    │ • JWT Auth      │    │ • JSON storage  │
│ • PWA ready     │    │ • Rate limiting │    │ • Indexing      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                           ▲
                           │
                    ┌─────────────────┐
                    │     Redis       │
                    │   Cache &       │
                    │   Sessions      │
                    └─────────────────┘
```

### Key Components

#### Backend Services (Express.js)
- **Authentication Service**: JWT-based user management
- **Lead Management**: CRUD operations with AI scoring
- **Conversion Tracking**: Funnel analytics and metrics
- **Notification System**: Automated email/SMS workflows
- **Analytics Engine**: Real-time reporting and insights

#### Database Schema
```sql
-- Core tables
users (id, email, password_hash, role, created_at)
leads (id, user_id, first_name, last_name, email, status, score)
interactions (id, lead_id, type, notes, created_at)
tasks (id, lead_id, user_id, title, status, due_date)
conversions (id, lead_id, stage, probability, converted_at)
notifications (id, user_id, type, message, sent_at)
```

#### AI/ML Integration
- **Lead Scoring**: ML model for lead qualification
- **Conversion Prediction**: Probability forecasting
- **Automated Workflows**: Intelligent task automation

## 🛠️ Development Workflow

### Daily Development Cycle

1. **Morning Standup**
   ```bash
   # Check project status
   git status
   git pull origin main

   # Review assigned tasks
   # Check API documentation for recent changes
   ```

2. **Development**
   ```bash
   # Backend development
   cd backend && npm run dev

   # Frontend development
   cd frontend && npm start

   # Run tests
   npm test
   ```

3. **Code Quality**
   ```bash
   # Lint code
   npm run lint

   # Run tests with coverage
   npm run test:coverage

   # Security audit
   npm audit
   ```

4. **Commit & Push**
   ```bash
   # Follow conventional commits
   git commit -m "feat: add lead scoring endpoint"
   git push origin feature/branch-name
   ```

### Branch Strategy

```
main (production)
├── develop (staging)
│   ├── feature/lead-scoring
│   ├── feature/conversion-tracking
│   └── bugfix/auth-validation
```

### Commit Conventions

```bash
# Features
git commit -m "feat: add ML-powered lead scoring"

# Bug fixes
git commit -m "fix: resolve JWT token validation error"

# Documentation
git commit -m "docs: update API documentation"

# Refactoring
git commit -m "refactor: optimize database queries"

# Testing
git commit -m "test: add conversion tracking tests"
```

## 🔧 Development Tools

### Essential Tools

#### Backend Development
```bash
# Development server
npm run dev

# Testing
npm test                    # Unit tests
npm run test:integration    # Integration tests
npm run test:e2e           # End-to-end tests

# Database
npm run migrate            # Run migrations
npm run migrate:rollback   # Rollback migrations
npm run seed               # Seed database

# Code quality
npm run lint               # ESLint
npm run format             # Prettier
npm run type-check         # TypeScript check
```

#### Frontend Development
```bash
# Development
npm start                  # Metro bundler
npm run ios               # iOS simulator
npm run android           # Android emulator

# Testing
npm test                   # Jest tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### BMAD Method Integration

#### Available AI Agents

| Agent | Command | Purpose |
|-------|---------|---------|
| **💻 Dev** | `@dev` | Code implementation and debugging |
| **🏗️ Architect** | `@architect` | System design and documentation |
| **📝 PO** | `@po` | Requirements and user stories |
| **🧪 QA** | `@qa` | Testing and quality assurance |
| **🎨 UX** | `@ux-expert` | UI/UX design and specs |
| **🏃 SM** | `@sm` | Agile process and story management |

#### Common BMAD Commands

```bash
# Create user story
@sm draft

# Generate API documentation
@dev document-api

# Review code quality
@qa review

# Design system architecture
@architect create-system-diagram

# Create UI specifications
@ux-expert design-mobile-interface
```

## 🔒 Security Best Practices

### Authentication
```javascript
// Always use JWT tokens
const token = localStorage.getItem('authToken');
const response = await fetch('/api/leads', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Input Validation
```javascript
// Backend validation
const { body, validationResult } = require('express-validator');

const validateLead = [
  body('email').isEmail().normalizeEmail(),
  body('firstName').trim().notEmpty().isLength({ max: 50 }),
  body('phone').optional().isMobilePhone('any')
];

// Frontend validation
const validateForm = (data) => {
  const errors = {};
  if (!data.email || !/\S+@\S+\.\S+/.test(data.email)) {
    errors.email = 'Valid email required';
  }
  return errors;
};
```

### Security Headers
```javascript
// Automatic security headers (configured in middleware)
// - X-Content-Type-Options: nosniff
// - X-XSS-Protection: 1; mode=block
// - X-Frame-Options: DENY
// - Content-Security-Policy: restrictive
// - Strict-Transport-Security: max-age=31536000
```

## 🧪 Testing Strategy

### Test Types

#### Unit Tests
```javascript
// backend/src/services/__tests__/LeadService.test.js
const LeadService = require('../LeadService');

describe('LeadService', () => {
  test('should create lead with valid data', async () => {
    const leadData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com'
    };

    const result = await LeadService.createLead(leadData);
    expect(result.success).toBe(true);
    expect(result.data.email).toBe(leadData.email);
  });
});
```

#### Integration Tests
```javascript
// Test API endpoints
const request = require('supertest');
const app = require('../server');

describe('Lead API', () => {
  test('GET /api/leads should return leads', async () => {
    const response = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
```

#### E2E Tests
```javascript
// frontend/__tests__/LeadCreation.e2e.js
describe('Lead Creation Flow', () => {
  it('should create lead successfully', async () => {
    // Navigate to lead creation screen
    await device.launchApp();
    await element(by.id('create-lead-button')).tap();

    // Fill form
    await element(by.id('firstName-input')).typeText('John');
    await element(by.id('email-input')).typeText('john@example.com');

    // Submit
    await element(by.id('submit-button')).tap();

    // Verify success
    await expect(element(by.text('Lead created successfully'))).toBeVisible();
  });
});
```

### Testing Commands
```bash
# Backend tests
cd backend
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
npm run test:integration    # Integration tests only

# Frontend tests
cd frontend
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
```

## 🚀 Deployment

### Development Deployment
```bash
# Local deployment
docker-compose up -d

# With debugging
docker-compose -f docker-compose.debug.yml up -d
```

### Staging Deployment
```bash
# Build and deploy
npm run build:staging
npm run deploy:staging

# Health checks
curl https://staging-api.yourdomain.com/health
```

### Production Deployment
```bash
# Zero-downtime deployment
npm run build:production
npm run deploy:production

# Verify deployment
curl https://api.yourdomain.com/health
curl https://api.yourdomain.com/metrics
```

## 📊 Monitoring & Debugging

### Health Checks
```bash
# Application health
curl http://localhost:3000/health

# Detailed health
curl http://localhost:3000/health/detailed

# Database stats
curl http://localhost:3000/api/database/stats

# Application metrics
curl http://localhost:3000/metrics
```

### Logging
```bash
# View application logs
docker-compose logs backend

# View database logs
docker-compose logs postgres

# View Redis logs
docker-compose logs redis

# Follow logs in real-time
docker-compose logs -f backend
```

### Debugging
```bash
# Backend debugging
cd backend
npm run debug  # Starts with --inspect flag

# Frontend debugging
cd frontend
npm start --reset-cache  # Clear Metro cache

# Database debugging
docker-compose exec postgres psql -U user -d real_estate_crm
```

## 📚 Resources & Documentation

### Essential Reading
- **README.md**: Project overview and setup
- **docs/SECURITY.md**: Security implementation guide
- **docs/architecture/**: System architecture documentation
- **docs/stories/**: User story specifications

### API Documentation
- **Swagger UI**: `http://localhost:3000/api-docs`
- **OpenAPI Spec**: `http://localhost:3000/api-docs.json`

### Development Tools
- **VS Code Extensions**: Recommended extensions in `.vscode/extensions.json`
- **ESLint Config**: `.eslintrc.js`
- **Prettier Config**: `.prettierrc`

## 🤝 Code Review Process

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Security review completed
- [ ] Performance impact assessed
```

### Review Guidelines
1. **Code Quality**: Follows project standards
2. **Security**: No security vulnerabilities
3. **Testing**: Adequate test coverage
4. **Documentation**: Code and API docs updated
5. **Performance**: No performance regressions

## 🆘 Getting Help

### Quick Help
```bash
# BMAD help
@orchestrator help

# Generate troubleshooting guide
@dev troubleshoot

# Search documentation
@architect find-documentation
```

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community support
- **Team Chat**: Daily standups and quick questions
- **Documentation**: Comprehensive guides in `docs/`

### Escalation Path
1. **Self-help**: Check documentation and existing issues
2. **Team member**: Ask colleague for immediate help
3. **Tech lead**: For complex technical issues
4. **Product owner**: For requirements clarification

## 🎯 Development Milestones

### Week 1: Getting Started
- [ ] Environment setup completed
- [ ] First API call successful
- [ ] Basic CRUD operations working
- [ ] Development workflow understood

### Week 2: Core Development
- [ ] Authentication flow implemented
- [ ] Lead management working
- [ ] Basic testing in place
- [ ] Code review process followed

### Week 3: Advanced Features
- [ ] AI integration working
- [ ] Performance optimization
- [ ] Security best practices applied
- [ ] Documentation updated

### Week 4: Production Ready
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Deployment process mastered

## 🏆 Success Metrics

### Code Quality
- **Test Coverage**: > 80%
- **Code Quality**: A grade on CodeClimate
- **Security**: No high/critical vulnerabilities
- **Performance**: < 500ms API response time

### Development Velocity
- **PR Review Time**: < 24 hours
- **Build Time**: < 5 minutes
- **Test Execution**: < 3 minutes
- **Deployment Frequency**: Daily

---

**Welcome aboard!** 🚀

This guide will evolve as the project grows. Feel free to contribute improvements and ask questions. Happy coding!

*Built with ❤️ using the BMAD Method*