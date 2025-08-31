# n8n Workflows for Real Estate CRM

This directory contains n8n workflow exports that implement the backend API for the Real Estate CRM application.

## Workflow Files

1. **1-user-registration.json** - User registration API endpoint
2. **2-user-login.json** - User login and JWT token generation
3. **3-jwt-auth-template.json** - Reusable JWT authentication template
4. **4-create-lead.json** - Create new lead with AI analysis
5. **5-get-leads-list.json** - Get leads list with filtering and pagination
6. **6-get-lead-detail.json** - Get detailed lead information
7. **7-update-lead-status.json** - Update lead status with interaction logging

## Setup Instructions

### Prerequisites

1. **n8n Installation**:
   ```bash
   # Option 1: Global installation
   npm install -g n8n

   # Option 2: Docker
   docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n
   ```

2. **Database Setup**:
   - Ensure PostgreSQL is running with the CRM schema
   - Create database credentials in n8n

3. **Environment Variables**:
   ```bash
   export JWT_SECRET="your-super-secret-jwt-key-change-in-production"
   export OPENAI_API_KEY="your-openai-api-key"
   export NODE_FUNCTION_ALLOW_EXTERNAL="bcryptjs,jsonwebtoken"
   ```

### Import Workflows

1. **Start n8n**:
   ```bash
   n8n start
   # Access at http://localhost:5678
   ```

2. **Import Each Workflow**:
   - Go to n8n web interface
   - Click "Import" in the workflows section
   - Upload each JSON file from this directory
   - Configure credentials for each workflow

### Required Credentials

Create these credentials in n8n:

1. **PostgreSQL Database**:
   - Name: "Real Estate CRM Database"
   - Host: localhost (or your database host)
   - Port: 5432
   - Database: realestate_crm
   - Username: crm_user
   - Password: crm_password

2. **OpenAI API**:
   - Name: "OpenAI API"
   - API Key: Your OpenAI API key

### Webhook URLs

After importing, your API endpoints will be available at:

- `POST /webhook/auth/register` - User registration
- `POST /webhook/auth/login` - User login
- `POST /webhook/leads` - Create lead (protected)
- `GET /webhook/leads` - Get leads list (protected)
- `GET /webhook/leads/{leadId}` - Get lead detail (protected)
- `PUT /webhook/leads/{leadId}/status` - Update lead status (protected)

### Environment Configuration

Set these in your n8n environment:

```bash
# JWT Secret (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# OpenAI API Key (REQUIRED for AI features)
OPENAI_API_KEY=sk-your-openai-api-key

# Enable external packages
NODE_FUNCTION_ALLOW_EXTERNAL=bcryptjs,jsonwebtoken

# Database connection (if using environment variables)
DATABASE_URL=postgresql://crm_user:crm_password@localhost:5432/realestate_crm
```

## Workflow Details

### Authentication Flows

#### User Registration (1-user-registration.json)
- Validates input fields
- Checks for existing email
- Hashes password with bcryptjs
- Creates user record
- Returns success response

#### User Login (2-user-login.json)
- Validates credentials
- Verifies password hash
- Generates JWT token (7-day expiration)
- Returns user data and token

#### JWT Authentication Template (3-jwt-auth-template.json)
- Reusable authentication logic
- Extracts and verifies JWT tokens
- Returns authentication context
- Use this at the beginning of protected workflows

### Lead Management Flows

#### Create Lead (4-create-lead.json)
- JWT authentication
- Input validation
- AI analysis with OpenAI
- Database insertion
- Interaction logging
- Success response with AI insights

#### Get Leads List (5-get-leads-list.json)
- JWT authentication
- Dynamic query building with filters
- Pagination support
- Formatted response with metadata

#### Get Lead Detail (6-get-lead-detail.json)
- JWT authentication
- Single lead retrieval
- User ownership verification
- Complete lead data formatting

#### Update Lead Status (7-update-lead-status.json)
- JWT authentication
- Status validation
- Database update
- Interaction logging
- Success confirmation

## API Usage Examples

### Register User
```bash
curl -X POST http://localhost:5678/webhook/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@realestate.com",
    "password": "securepassword123",
    "firstName": "John",
    "lastName": "Agent"
  }'
```

### Login User
```bash
curl -X POST http://localhost:5678/webhook/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@realestate.com",
    "password": "securepassword123"
  }'
```

### Create Lead (Protected)
```bash
curl -X POST http://localhost:5678/webhook/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "firstName": "Jane",
    "lastName": "Buyer",
    "email": "jane@example.com",
    "source": "Website Form",
    "budgetMin": "500000",
    "budgetMax": "750000",
    "desiredLocation": "Downtown Toronto"
  }'
```

### Get Leads List (Protected)
```bash
curl -X GET "http://localhost:5678/webhook/leads?status=New&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### Common Issues

1. **"Module not found" errors**:
   - Ensure `NODE_FUNCTION_ALLOW_EXTERNAL` includes required packages
   - Restart n8n after setting environment variables

2. **JWT verification fails**:
   - Check JWT_SECRET consistency between login and protected endpoints
   - Verify token format in Authorization header

3. **Database connection errors**:
   - Verify PostgreSQL credentials in n8n
   - Ensure database schema is created
   - Check network connectivity

4. **OpenAI API errors**:
   - Verify API key is valid and has credits
   - Check rate limits
   - AI processing continues even if OpenAI fails

### Testing Workflows

1. Use n8n's "Test" feature for individual workflows
2. Check execution logs for detailed error information
3. Verify database records after operations
4. Test with sample data from `database/seed.sql`

## Security Notes

- JWT_SECRET must be kept secure and consistent
- Use HTTPS in production
- Implement rate limiting for public endpoints
- Regularly rotate API keys and secrets
- Validate all user inputs
- Use prepared statements for database queries

## Performance Optimization

- Index database queries appropriately
- Implement caching for frequent reads
- Use connection pooling for database
- Monitor n8n workflow execution times
- Consider async processing for AI operations

## Monitoring and Logging

n8n provides built-in execution logging. For production:

1. Enable detailed logging in n8n settings
2. Set up external monitoring (e.g., Prometheus)
3. Monitor database performance
4. Track API response times
5. Set up alerts for failures