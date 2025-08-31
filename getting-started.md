# Real Estate CRM - Getting Started Guide

Welcome to your AI-powered Real Estate CRM! This guide will help you get the entire system up and running quickly.

## Quick Start (5 Minutes)

### 1. Start the Database
```bash
# Clone the project and start PostgreSQL with Docker
git clone <your-repo-url>
cd agentOps-1

# Copy environment file
cp .env.example .env

# Start database with sample data
docker-compose up -d postgres

# Wait for database to be ready (about 30 seconds)
docker-compose logs postgres
```

### 2. Set Up n8n Backend
```bash
# Install and start n8n
npm install -g n8n

# Set environment variables
export JWT_SECRET="your-super-secret-jwt-key-change-in-production"
export OPENAI_API_KEY="sk-your-openai-api-key"  # Optional for AI features
export NODE_FUNCTION_ALLOW_EXTERNAL="bcryptjs,jsonwebtoken"

# Start n8n
n8n start
```

Access n8n at `http://localhost:5678` and import the workflows from `n8n-workflows/` directory.

### 3. Install Mobile App Dependencies
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# For iOS (Mac only)
cd ios && pod install && cd ..

# Start Metro bundler
npm start
```

### 4. Run the Mobile App
```bash
# In a new terminal, run on your preferred platform
npm run ios     # for iOS Simulator
npm run android # for Android Emulator
```

## System Overview

### What You Built

Your Real Estate CRM consists of:

1. **📱 React Native Mobile App**
   - Authentication (Login/Register)
   - Lead management (Create, View, Edit)
   - AI-powered lead analysis
   - Professional UI with status tracking

2. **🔄 n8n Backend Workflows**
   - JWT-based authentication
   - RESTful API endpoints
   - Database operations
   - OpenAI integration for lead insights

3. **🗄️ PostgreSQL Database**
   - Users, leads, interactions, and tasks
   - Sample data included
   - Optimized indexes for performance

4. **🤖 AI Integration**
   - Automatic lead summarization
   - Priority suggestions
   - Requirements analysis

## User Accounts

### Demo Accounts (from seed data)
- **Email**: `john.agent@realestate.com`
- **Password**: `password123`
- **Role**: Real Estate Agent with sample leads

- **Email**: `sarah.broker@realestate.com`  
- **Password**: `password123`
- **Role**: Real Estate Broker

### Create New Account
Use the registration screen in the mobile app or API endpoint:
```bash
curl -X POST http://localhost:5678/webhook/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newagent@realestate.com",
    "password": "securepassword123",
    "firstName": "New",
    "lastName": "Agent"
  }'
```

## Key Features Walkthrough

### 1. Authentication
- **Login Screen**: Secure JWT-based authentication
- **Registration**: New user account creation with validation
- **Session Management**: Automatic token storage and refresh

### 2. Lead Management
- **Lead List**: View all leads with filtering and search
- **Add Lead**: Create new leads with comprehensive forms
- **Lead Details**: Full lead information with AI insights
- **Status Updates**: Track lead progress through sales pipeline

### 3. AI-Powered Features
- **Lead Analysis**: Automatic summarization of lead requirements
- **Priority Scoring**: AI suggests lead priority levels
- **Smart Insights**: Professional summaries for quick understanding

### 4. Data Management
- **Real-time Sync**: All data syncs immediately across devices
- **Interaction Logging**: Track all activities and status changes
- **Comprehensive Search**: Find leads by name, email, location, or requirements

## API Endpoints

Your n8n backend provides these REST APIs:

### Authentication
- `POST /webhook/auth/register` - Create new user account
- `POST /webhook/auth/login` - Authenticate and get JWT token

### Lead Management (Protected - Requires JWT)
- `GET /webhook/leads` - Get leads list with filtering
- `POST /webhook/leads` - Create new lead with AI analysis
- `GET /webhook/leads/{id}` - Get detailed lead information
- `PUT /webhook/leads/{id}/status` - Update lead status

### Example API Usage
```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:5678/webhook/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.agent@realestate.com","password":"password123"}' \
  | jq -r '.token')

# Get leads list
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5678/webhook/leads

# Create new lead
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "source": "Website Form",
    "budgetMin": "500000",
    "budgetMax": "750000",
    "desiredLocation": "Downtown Toronto",
    "notes": "First-time homebuyer, pre-approved"
  }' \
  http://localhost:5678/webhook/leads
```

## Database Structure

### Core Tables
- **users**: Agent/broker accounts with authentication
- **leads**: Lead information with AI insights
- **interactions**: Activity tracking and history
- **tasks**: Follow-up reminders and to-dos

### Sample Data Included
- 2 demo user accounts
- 4 sample leads with different statuses
- Interaction history
- Sample tasks and follow-ups

## Customization Options

### 1. Lead Fields
Modify lead form fields in:
- `frontend/src/screens/leads/AddLeadScreen.tsx`
- `frontend/src/types/index.ts`
- `schema.sql` (database structure)

### 2. Lead Statuses
Update available statuses:
- Database: `leads.status` field constraints
- Frontend: Status arrays in lead screens
- n8n: Status validation in workflows

### 3. AI Prompts
Customize AI analysis in:
- `n8n-workflows/4-create-lead.json`
- "Prepare AI Analysis" node
- Modify prompts for different insights

### 4. UI Styling
Update app appearance:
- `frontend/src/screens/*/styles`
- Color scheme in navigation files
- Component styling throughout

## Development Workflow

### 1. Database Changes
```bash
# Modify schema.sql
# Restart database container
docker-compose down && docker-compose up -d postgres

# Or apply changes manually
psql -h localhost -U crm_user -d realestate_crm -f your-changes.sql
```

### 2. n8n Workflow Changes
- Modify workflows in n8n web interface
- Export updated JSON files
- Version control workflow exports

### 3. Mobile App Changes
```bash
# Make changes to React Native code
# Hot reload is enabled by default
npm start

# For new dependencies
npm install package-name
cd ios && pod install && cd .. # for iOS dependencies
```

### 4. Testing
```bash
# Test API endpoints
curl -X GET http://localhost:5678/webhook/health

# Test database connection
docker-compose exec postgres psql -U crm_user -d realestate_crm -c "SELECT COUNT(*) FROM leads;"

# Test mobile app
npm test # if tests are configured
```

## Production Deployment

### Quick Deploy Options

1. **Vercel/Netlify** (Frontend only - for web version)
2. **Railway/Render** (n8n backend)
3. **PlanetScale/Supabase** (PostgreSQL database)
4. **App Store/Google Play** (Mobile apps)

See `deployment-guide.md` for detailed production setup.

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check if PostgreSQL is running
   docker-compose ps
   
   # Check logs
   docker-compose logs postgres
   
   # Restart if needed
   docker-compose restart postgres
   ```

2. **n8n Workflows Not Working**
   ```bash
   # Check environment variables
   echo $JWT_SECRET
   echo $OPENAI_API_KEY
   
   # Restart n8n
   pkill -f n8n && n8n start
   ```

3. **Mobile App Won't Connect**
   - Check API_BASE_URL in app configuration
   - Verify n8n is running on correct port
   - Check network connectivity

4. **AI Features Not Working**
   - Verify OPENAI_API_KEY is set
   - Check OpenAI API credits/limits
   - Review n8n workflow execution logs

### Getting Help

1. **Check Logs**
   - n8n: Web interface → Executions
   - Database: `docker-compose logs postgres`
   - Mobile: Metro bundler console

2. **Verify Configuration**
   - Environment variables
   - Database connections
   - API endpoints

3. **Test Components**
   - Database queries manually
   - API endpoints with curl
   - Mobile app on different devices

## Next Steps

### Immediate Enhancements
1. **Task Management**: Implement the tasks feature
2. **Notifications**: Add push notifications for follow-ups
3. **Analytics**: Create dashboard with lead metrics
4. **Email Integration**: Connect with email providers

### Advanced Features
1. **Property Matching**: Integrate with MLS systems
2. **Calendar Integration**: Sync with showing schedules  
3. **Document Management**: Upload and manage contracts
4. **Team Collaboration**: Multi-agent features

### Learning Resources
- **n8n Documentation**: https://docs.n8n.io/
- **React Native Guides**: https://reactnative.dev/docs/getting-started
- **PostgreSQL Tutorials**: https://www.postgresql.org/docs/
- **OpenAI API Reference**: https://platform.openai.com/docs/

## Support

Your Real Estate CRM is designed to be production-ready and scalable. The architecture supports:
- **Multi-tenant usage** (multiple agents/brokers)
- **High availability** deployment
- **API rate limiting** and security
- **Data export/import** capabilities
- **Compliance features** for real estate regulations

Happy selling! 🏠✨