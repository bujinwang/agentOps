# 🏗️ Real Estate CRM API Documentation

## Overview

This comprehensive API documentation covers all endpoints for the Real Estate CRM system, featuring advanced ML capabilities, real-time analytics, and comprehensive automation.

## API Architecture

### Base URL
```
https://api.realestate-crm.com/v1
```

### Authentication
All API endpoints require JWT authentication:
```http
Authorization: Bearer <your-jwt-token>
```

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": { ... }
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## API Categories

### 🔐 Authentication & Authorization
- **Base Path**: `/api/auth`
- **Description**: User authentication, registration, and session management
- **Endpoints**: 8 endpoints
- **Documentation**: [Authentication API](./auth-api.md)

### 👥 User Management
- **Base Path**: `/api/users`
- **Description**: User profiles, roles, and permissions
- **Endpoints**: 6 endpoints
- **Documentation**: [User Management API](./user-api.md)

### 🏠 Lead Management
- **Base Path**: `/api/leads`
- **Description**: Complete lead lifecycle management
- **Endpoints**: 12 endpoints
- **Documentation**: [Lead Management API](./lead-api.md)

### 🤖 ML Scoring & Intelligence
- **Base Path**: `/api/ml`
- **Description**: ML model management, scoring, and analytics
- **Endpoints**: 15 endpoints
- **Documentation**: [ML Scoring API](./ml-api.md)

### 📊 Analytics & Dashboard
- **Base Path**: `/api/analytics`
- **Description**: Real-time analytics, dashboards, and reporting
- **Endpoints**: 10 endpoints
- **Documentation**: [Analytics API](./analytics-api.md)

### 🔄 Workflow Automation
- **Base Path**: `/api/workflows`
- **Description**: Automated workflows, templates, and execution
- **Endpoints**: 12 endpoints
- **Documentation**: [Workflow API](./workflow-api.md)

### 📈 Conversion Tracking
- **Base Path**: `/api/conversion`
- **Description**: Lead conversion funnel tracking and analytics
- **Endpoints**: 8 endpoints
- **Documentation**: [Conversion Tracking API](./conversion-api.md)

### 🏢 Property Management
- **Base Path**: `/api/properties`
- **Description**: Property listings, MLS integration, and management
- **Endpoints**: 14 endpoints
- **Documentation**: [Property Management API](./property-api.md)

### 📧 Notifications & Communication
- **Base Path**: `/api/notifications`
- **Description**: Automated notifications, scheduling, and communication
- **Endpoints**: 9 endpoints
- **Documentation**: [Notifications API](./notification-api.md)

### 📋 Task Management
- **Base Path**: `/api/tasks`
- **Description**: Task creation, assignment, and tracking
- **Endpoints**: 8 endpoints
- **Documentation**: [Task Management API](./task-api.md)

### 📊 Dashboard & Insights
- **Base Path**: `/api/dashboard`
- **Description**: Real-time dashboard data and insights
- **Endpoints**: 6 endpoints
- **Documentation**: [Dashboard API](./dashboard-api.md)

### 🔍 Search & Filtering
- **Base Path**: `/api/search`
- **Description**: Advanced search across all entities
- **Endpoints**: 4 endpoints
- **Documentation**: [Search API](./search-api.md)

### 📊 Enrichment Services
- **Base Path**: `/api/enrichment`
- **Description**: Data enrichment from external sources
- **Endpoints**: 6 endpoints
- **Documentation**: [Enrichment API](./enrichment-api.md)

### 🔧 System Management
- **Base Path**: `/api/system`
- **Description**: System health, monitoring, and maintenance
- **Endpoints**: 8 endpoints
- **Documentation**: [System Management API](./system-api.md)

## Real-Time APIs

### WebSocket Endpoints
- **Base URL**: `wss://api.realestate-crm.com`
- **Authentication**: JWT token in connection parameters
- **Documentation**: [WebSocket API](./websocket-api.md)

### Server-Sent Events
- **Base Path**: `/api/events`
- **Description**: Push notifications and real-time updates
- **Documentation**: [Server-Sent Events API](./sse-api.md)

## Rate Limiting

### Global Limits
- **Authenticated Users**: 1000 requests per minute
- **Anonymous Users**: 100 requests per minute
- **ML Scoring**: 500 requests per minute
- **File Uploads**: 50 requests per minute

### Burst Limits
- **Short Bursts**: 200 requests per 10 seconds
- **File Operations**: 10 concurrent uploads

## Pagination

### Standard Pagination
```http
GET /api/leads?page=1&limit=50&sort=created_at&order=desc
```

### Cursor-Based Pagination
```http
GET /api/leads?cursor=eyJpZCI6MTIzfQ&limit=50
```

### Response Format
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "totalPages": 25,
    "hasNext": true,
    "hasPrev": false,
    "nextCursor": "eyJpZCI6MTI0fQ"
  }
}
```

## Filtering & Sorting

### Filter Operators
- `eq`: Equal to
- `ne`: Not equal to
- `gt`: Greater than
- `gte`: Greater than or equal
- `lt`: Less than
- `lte`: Less than or equal
- `in`: In array
- `nin`: Not in array
- `like`: Pattern matching
- `between`: Range filtering

### Usage Examples
```http
# Simple filtering
GET /api/leads?status=active&budget[gte]=500000

# Complex filtering
GET /api/leads?status[in]=active,pending&created_at[between]=2025-01-01,2025-01-31

# Sorting
GET /api/leads?sort=score:desc,created_at:asc
```

## Error Codes

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **204**: No Content
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **409**: Conflict
- **422**: Unprocessable Entity
- **429**: Too Many Requests
- **500**: Internal Server Error
- **502**: Bad Gateway
- **503**: Service Unavailable

### Application Error Codes
- **VALIDATION_ERROR**: Input validation failed
- **AUTHENTICATION_ERROR**: Authentication failed
- **AUTHORIZATION_ERROR**: Insufficient permissions
- **RESOURCE_NOT_FOUND**: Requested resource not found
- **RESOURCE_CONFLICT**: Resource conflict
- **RATE_LIMIT_EXCEEDED**: Rate limit exceeded
- **EXTERNAL_SERVICE_ERROR**: External service error
- **DATABASE_ERROR**: Database operation failed
- **ML_MODEL_ERROR**: ML model operation failed

## SDKs & Client Libraries

### Official SDKs
- **JavaScript/TypeScript**: `npm install @realestate-crm/sdk`
- **Python**: `pip install realestate-crm-sdk`
- **Java**: Maven/Gradle dependency available
- **.NET**: NuGet package available

### Community SDKs
- **Go**: Community-maintained
- **PHP**: Community-maintained
- **Ruby**: Community-maintained

## Testing

### Sandbox Environment
- **Base URL**: `https://sandbox-api.realestate-crm.com/v1`
- **Rate Limits**: Relaxed for testing
- **Data**: Automatically reset daily

### Test Data
```bash
# Generate test data
curl -X POST https://sandbox-api.realestate-crm.com/v1/test/generate-data \
  -H "Authorization: Bearer <token>" \
  -d '{"leads": 100, "properties": 50}'
```

## Support & Resources

### Documentation Resources
- **Interactive API Explorer**: `https://api.realestate-crm.com/docs`
- **OpenAPI Specification**: `https://api.realestate-crm.com/v1/openapi.json`
- **Postman Collection**: Available in `/docs` directory
- **Code Examples**: GitHub repository with examples

### Support Channels
- **API Status**: `https://status.realestate-crm.com`
- **Developer Forum**: Community discussions and support
- **Email Support**: `api-support@realestate-crm.com`
- **Premium Support**: 24/7 phone and chat support

### Changelog
- **Version**: v1.0.0 (Current)
- **Last Updated**: January 15, 2025
- **Breaking Changes**: None in current version

---

## Quick Start Examples

### 1. Authenticate User
```bash
curl -X POST https://api.realestate-crm.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

### 2. Create Lead
```bash
curl -X POST https://api.realestate-crm.com/v1/leads \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "email": "john@example.com",
    "budget": 500000,
    "propertyType": "single-family"
  }'
```

### 3. Get ML Score
```bash
curl https://api.realestate-crm.com/v1/leads/123/score \
  -H "Authorization: Bearer <token>"
```

### 4. Get Dashboard Data
```bash
curl https://api.realestate-crm.com/v1/dashboard/leads/insights \
  -H "Authorization: Bearer <token>"
```

This comprehensive API documentation ensures developers can effectively integrate with and extend the Real Estate CRM system.