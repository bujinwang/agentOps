# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Real Estate CRM system designed as a three-tier mobile application with AI integration:

- **Frontend**: React Native mobile application for real estate agents
- **Backend**: n8n workflow automation platform serving as the API layer
- **Database**: PostgreSQL for persistent data storage
- **AI Integration**: OpenAI for lead summarization and prioritization

## Architecture

The application follows a unique architecture where n8n serves as the backend API layer through webhooks, replacing traditional server frameworks. This design centralizes business logic and automation within n8n workflows.

### Key Components

1. **React Native Mobile App** (`frontend/`)
   - User interface for real estate agents
   - JWT-based authentication
   - RESTful API communication with n8n backend

2. **n8n Workflows** (Backend logic)
   - API endpoints via webhook nodes
   - Authentication and authorization using JWT
   - Database operations with PostgreSQL
   - AI integration with OpenAI
   - Business logic orchestration

3. **PostgreSQL Database**
   - Tables: `users`, `leads`, `interactions`, `tasks`
   - Manual timestamp management (`updated_at` set via application logic)
   - Comprehensive indexing for performance

4. **AI Services**
   - OpenAI integration for lead analysis
   - Automated summary generation
   - Priority suggestions for leads

## Database Schema

The system uses four main tables:
- **users**: Authentication and user management
- **leads**: Core lead information with AI-generated insights
- **interactions**: Activity logging for leads
- **tasks**: Follow-up and task management

Key considerations:
- Manual timestamp management (no database triggers)
- Soft deletes via status changes where applicable
- Foreign key relationships with appropriate cascade rules

## API Patterns

All API endpoints are implemented as n8n webhooks with consistent patterns:

### Authentication Flow
- Registration: `POST /api/v1/auth/register`
- Login: `POST /api/v1/auth/login` (returns JWT)
- Protected endpoints require `Authorization: Bearer <jwt>` header

### JWT Verification Pattern
Standard JWT verification implemented in n8n workflows:
1. Extract token from Authorization header
2. Verify JWT signature and expiration
3. Extract user context (`userId`) for data access
4. Return 401 for invalid/missing tokens

### Lead Management
- Create: `POST /api/v1/leads` (with AI processing)
- List: `GET /api/v1/leads` (with filtering and pagination)
- Details: `GET /api/v1/leads/{leadId}`
- Update: `PUT /api/v1/leads/{leadId}/status`

## Development Workflow

This project is primarily a documentation and planning repository. The actual implementation consists of:

1. **n8n Workflows**: Created through the n8n visual interface
2. **React Native App**: Mobile application (implementation in `frontend/`)
3. **Database Setup**: PostgreSQL schema defined in `schema.sql`

### Key Dependencies
- **n8n Environment**: Requires `bcryptjs` and `jsonwebtoken` libraries
- **Database**: PostgreSQL with proper indexes
- **AI Services**: OpenAI API integration

### Security Considerations
- JWT secrets must be securely stored (n8n credentials or environment variables)
- Password hashing using bcryptjs with salt rounds ≥ 10
- User data isolation (all queries filter by authenticated user_id)
- Input validation in all n8n workflows

## AI Integration

The system includes AI-powered features:
- **Lead Summarization**: Automatic analysis of lead requirements
- **Priority Suggestions**: AI-driven lead priority assignment
- **Future Extensions**: Natural language processing for communications

AI processing is optional and can be bypassed if services are unavailable.

## Important Notes

- This is a planning/documentation repository - source code directories (`frontend/src`, `backend/src`) are currently empty
- The backend logic is implemented as n8n workflows, not traditional server code
- Database timestamps are managed manually through application logic
- All user data access is strictly filtered by authenticated user context