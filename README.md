# Real Estate CRM - AI-Powered Mobile Application

A comprehensive Real Estate CRM system built with React Native, n8n workflow automation, PostgreSQL, and OpenAI integration.

## Architecture Overview

- **Frontend**: React Native mobile application
- **Backend**: n8n workflow automation (API via webhooks)
- **Database**: PostgreSQL with comprehensive schema
- **AI Integration**: OpenAI for lead analysis and prioritization

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js (v16 or higher)
- React Native development environment
- n8n instance (local or cloud)

### 1. Database Setup

Start the PostgreSQL database with Docker Compose:

```bash
# Copy environment variables
cp .env.example .env

# Start the database
docker-compose up -d postgres

# Optional: Start pgAdmin for database management
docker-compose up -d pgadmin
```

The database will be initialized with:
- Complete schema from `schema.sql`
- Sample data from `database/seed.sql`

**Database Access:**
- PostgreSQL: `localhost:5432`
- pgAdmin: `http://localhost:8080` (admin@realestate.com / admin123)

### 2. React Native App Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# For iOS
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on device/simulator
npm run ios     # for iOS
npm run android # for Android
```

### 3. n8n Setup

Set up n8n workflows for the backend API:

```bash
# Install n8n globally or run with Docker
npm install -g n8n
# OR
docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n

# Access n8n interface at http://localhost:5678
```

Import the workflow templates from the `n8n-workflows/` directory or create workflows based on the API contracts in `api_contracts_and_workflows.md`.

### 4. Environment Configuration

Update your `.env` file with:
- JWT secret key
- OpenAI API key
- n8n webhook URLs
- Database connection details

## Project Structure

```
├── frontend/                 # React Native mobile app
│   ├── src/
│   │   ├── screens/         # App screens (Auth, Leads, etc.)
│   │   ├── components/      # Reusable UI components
│   │   ├── services/        # API and external service calls
│   │   ├── navigation/      # App navigation setup
│   │   ├── context/         # React Context for state management
│   │   └── utils/          # Utility functions and helpers
│   └── assets/             # Images, fonts, etc.
├── backend/                 # Backend documentation and utilities
├── shared/                  # Shared types and utilities
├── database/               # Database scripts and migrations
├── n8n-workflows/          # n8n workflow exports
├── docs/                   # Additional documentation
└── schema.sql              # Database schema
```

## Database Schema

The system includes four main tables:
- **users**: Authentication and user management
- **leads**: Lead information with AI insights
- **interactions**: Activity tracking
- **tasks**: Follow-up and task management

## API Endpoints

All endpoints are implemented as n8n webhooks:

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login (returns JWT)

### Leads Management
- `GET /api/v1/leads` - List leads (with filtering)
- `POST /api/v1/leads` - Create new lead
- `GET /api/v1/leads/{id}` - Get lead details
- `PUT /api/v1/leads/{id}/status` - Update lead status

All protected endpoints require JWT authentication.

## Development Workflow

1. **Database Changes**: Update `schema.sql` and create migration scripts
2. **Frontend Development**: Work in `frontend/src/` directory
3. **API Changes**: Update n8n workflows and document in API contracts
4. **Testing**: Use seed data for development and testing

## AI Features

- **Lead Summarization**: Automatic analysis of lead requirements
- **Priority Suggestions**: AI-driven lead priority assignment
- **Future Enhancements**: Natural language processing for communications

## Security

- JWT-based authentication with secure token handling
- Password hashing using bcryptjs
- User data isolation (all queries filtered by user context)
- Input validation in all n8n workflows

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure PostgreSQL is running and credentials are correct
2. **n8n Webhooks**: Verify webhook URLs in React Native app configuration
3. **JWT Issues**: Check JWT secret consistency between n8n and app
4. **OpenAI Integration**: Verify API key and rate limits

### Logs

- Database logs: `docker-compose logs postgres`
- n8n logs: Check n8n console or Docker logs
- React Native logs: Metro bundler console

## Contributing

1. Follow the existing code structure and patterns
2. Update documentation for any API changes
3. Test with the provided seed data
4. Ensure security best practices are maintained

## License

[Add your license information here]