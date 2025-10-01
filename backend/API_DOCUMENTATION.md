# Real Estate CRM API - Complete Documentation

> **Sprint 3 Complete** - Full-featured TypeScript backend with 24 production-ready endpoints

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Auth API](#auth-api)
  - [Leads API](#leads-api)
  - [Tasks API](#tasks-api)
  - [Interactions API](#interactions-api)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## Overview

### Base URL
```
http://localhost:3000/api/v1
```

### Features
- ✅ JWT-based authentication
- ✅ RESTful API design
- ✅ Pagination & filtering
- ✅ Comprehensive validation
- ✅ Type-safe TypeScript
- ✅ Secure by default

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... }
  }
}
```

---

## Quick Start

### 1. Start the Server
```bash
cd backend
npm run dev:ts
```

### 2. Register a User
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@example.com",
    "password": "securepass123",
    "firstName": "Jane",
    "lastName": "Agent"
  }'
```

### 3. Login & Get Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@example.com",
    "password": "securepass123"
  }'
```

Save the `accessToken` from the response!

### 4. Use Protected Endpoints
```bash
curl http://localhost:3000/api/v1/leads \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Token Lifecycle
- **Access Token:** Valid for 24 hours
- **Refresh Token:** Valid for 7 days

---

## API Endpoints

## Auth API

### 1. Register User

**Endpoint:** `POST /api/v1/auth/register`  
**Auth Required:** No

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "userId": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "createdAt": "2024-10-01T00:00:00.000Z",
      "updatedAt": "2024-10-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

---

### 2. Login

**Endpoint:** `POST /api/v1/auth/login`  
**Auth Required:** No

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  },
  "message": "Login successful"
}
```

---

### 3. Refresh Token

**Endpoint:** `POST /api/v1/auth/refresh`  
**Auth Required:** No

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "new_access_token_here"
  }
}
```

---

### 4. Get Current User

**Endpoint:** `GET /api/v1/auth/me`  
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "userId": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2024-10-01T00:00:00.000Z",
    "updatedAt": "2024-10-01T00:00:00.000Z"
  }
}
```

---

## Leads API

### 1. Create Lead

**Endpoint:** `POST /api/v1/leads`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john@example.com",
  "phoneNumber": "+1-555-0100",
  "source": "website",
  "status": "New",
  "priority": "High",
  "budgetMin": 300000,
  "budgetMax": 500000,
  "notes": "Looking for a 3-bedroom house"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "leadId": 1,
    "userId": 1,
    "firstName": "John",
    "lastName": "Smith",
    "email": "john@example.com",
    "phoneNumber": "+1-555-0100",
    "source": "website",
    "status": "New",
    "priority": "High",
    "budgetMin": 300000,
    "budgetMax": 500000,
    "notes": "Looking for a 3-bedroom house",
    "aiSummary": null,
    "score": null,
    "createdAt": "2024-10-01T00:00:00.000Z",
    "updatedAt": "2024-10-01T00:00:00.000Z"
  },
  "message": "Lead created successfully"
}
```

---

### 2. List Leads

**Endpoint:** `GET /api/v1/leads`  
**Auth Required:** Yes

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20, max: 100) - Items per page
- `status` (string) - Filter by status
- `priority` (string) - Filter by priority
- `source` (string) - Filter by source
- `search` (string) - Search in name, email, phone
- `minBudget` (number) - Minimum budget
- `maxBudget` (number) - Maximum budget
- `sortBy` (string) - Sort field (created_at, updated_at, first_name, etc.)
- `sortOrder` (string) - ASC or DESC

**Example:**
```bash
GET /api/v1/leads?status=New&priority=High&page=1&limit=10&sortBy=created_at&sortOrder=DESC
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "leads": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

---

### 3. Get Lead by ID

**Endpoint:** `GET /api/v1/leads/:id`  
**Auth Required:** Yes

**Response:** `200 OK`

---

### 4. Update Lead

**Endpoint:** `PUT /api/v1/leads/:id`  
**Auth Required:** Yes

**Request Body:** (all fields optional)
```json
{
  "status": "Contacted",
  "priority": "Medium",
  "notes": "Updated notes"
}
```

**Response:** `200 OK`

---

### 5. Delete Lead

**Endpoint:** `DELETE /api/v1/leads/:id`  
**Auth Required:** Yes

**Response:** `200 OK`

---

### 6. Get Lead Statistics

**Endpoint:** `GET /api/v1/leads/stats`  
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "New": 15,
    "Contacted": 8,
    "Qualified": 5,
    "Closed Won": 2
  }
}
```

---

## Tasks API

### 1. Create Task

**Endpoint:** `POST /api/v1/tasks`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "title": "Follow up with John Smith",
  "description": "Call to discuss property requirements",
  "dueDate": "2024-10-05T10:00:00Z",
  "priority": "High",
  "leadId": 1
}
```

**Response:** `201 Created`

---

### 2. List Tasks

**Endpoint:** `GET /api/v1/tasks`  
**Auth Required:** Yes

**Query Parameters:**
- `page` (number) - Page number
- `limit` (number) - Items per page
- `leadId` (number) - Filter by lead
- `priority` (string) - Filter by priority
- `isCompleted` (boolean) - Filter by completion status
- `sortBy` (string) - Sort field
- `sortOrder` (string) - ASC or DESC

**Example:**
```bash
GET /api/v1/tasks?isCompleted=false&priority=High&sortBy=due_date&sortOrder=ASC
```

**Response:** `200 OK`

---

### 3. Get Task by ID

**Endpoint:** `GET /api/v1/tasks/:id`  
**Auth Required:** Yes

---

### 4. Update Task

**Endpoint:** `PUT /api/v1/tasks/:id`  
**Auth Required:** Yes

---

### 5. Complete Task

**Endpoint:** `POST /api/v1/tasks/:id/complete`  
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "taskId": 1,
    "isCompleted": true,
    "completedAt": "2024-10-01T12:00:00.000Z",
    ...
  },
  "message": "Task marked as completed"
}
```

---

### 6. Mark Task Incomplete

**Endpoint:** `POST /api/v1/tasks/:id/incomplete`  
**Auth Required:** Yes

---

### 7. Delete Task

**Endpoint:** `DELETE /api/v1/tasks/:id`  
**Auth Required:** Yes

---

### 8. Get Task Statistics

**Endpoint:** `GET /api/v1/tasks/stats`  
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "completed": 15,
    "pending": 8
  }
}
```

---

## Interactions API

### 1. Log Interaction

**Endpoint:** `POST /api/v1/interactions`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "leadId": 1,
  "type": "Call Logged",
  "content": "Discussed 3-bedroom requirements. Budget confirmed at $400-500K.",
  "interactionDate": "2024-10-01T14:30:00Z"
}
```

**Common Interaction Types:**
- Call Logged
- Email Sent
- SMS Sent
- Note Added
- Meeting Scheduled
- Status Change

**Response:** `201 Created`

---

### 2. List Interactions

**Endpoint:** `GET /api/v1/interactions`  
**Auth Required:** Yes

**Query Parameters:**
- `page` (number) - Page number
- `limit` (number) - Items per page (default: 50)
- `leadId` (number) - Filter by lead
- `type` (string) - Filter by type
- `startDate` (ISO8601) - Filter by date range
- `endDate` (ISO8601) - Filter by date range
- `sortBy` (string) - Sort field
- `sortOrder` (string) - ASC or DESC

**Response:** `200 OK`

---

### 3. Get Lead Timeline

**Endpoint:** `GET /api/v1/interactions/leads/:leadId/timeline`  
**Auth Required:** Yes

**Description:** Get complete timeline of all interactions for a specific lead, sorted by date.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "interactions": [
      {
        "interactionId": 3,
        "leadId": 1,
        "type": "Call Logged",
        "content": "Follow-up call scheduled",
        "interactionDate": "2024-10-01T16:00:00.000Z"
      },
      {
        "interactionId": 2,
        "leadId": 1,
        "type": "Email Sent",
        "content": "Sent property listings",
        "interactionDate": "2024-10-01T10:00:00.000Z"
      },
      {
        "interactionId": 1,
        "leadId": 1,
        "type": "Note Added",
        "content": "Initial contact made",
        "interactionDate": "2024-10-01T09:00:00.000Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### 4. Get Interaction by ID

**Endpoint:** `GET /api/v1/interactions/:id`  
**Auth Required:** Yes

---

### 5. Delete Interaction

**Endpoint:** `DELETE /api/v1/interactions/:id`  
**Auth Required:** Yes

---

### 6. Get Interaction Statistics

**Endpoint:** `GET /api/v1/interactions/stats`  
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "Call Logged": 25,
    "Email Sent": 40,
    "SMS Sent": 15,
    "Note Added": 30,
    "Meeting Scheduled": 8
  }
}
```

---

## Error Handling

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Authentication required |
| `MISSING_TOKEN` | 401 | No auth token provided |
| `INVALID_TOKEN` | 401 | Invalid or expired token |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `USER_EXISTS` | 409 | Email already registered |
| `LEAD_NOT_FOUND` | 404 | Lead doesn't exist |
| `TASK_NOT_FOUND` | 404 | Task doesn't exist |
| `INTERACTION_NOT_FOUND` | 404 | Interaction doesn't exist |
| `NOT_FOUND` | 404 | Route not found |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected error |

---

## Examples

### Complete Workflow Example

```bash
#!/bin/bash

# 1. Register
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@realty.com",
    "password": "secure123",
    "firstName": "Jane",
    "lastName": "Agent"
  }')

# Extract token
TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.accessToken')

# 2. Create a lead
LEAD_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/leads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Buyer",
    "email": "john@email.com",
    "phoneNumber": "+1-555-0100",
    "priority": "High",
    "budgetMin": 400000,
    "budgetMax": 600000
  }')

LEAD_ID=$(echo $LEAD_RESPONSE | jq -r '.data.leadId')

# 3. Create a task for the lead
curl -s -X POST http://localhost:3000/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Call John Buyer\",
    \"leadId\": $LEAD_ID,
    \"dueDate\": \"2024-10-05T10:00:00Z\",
    \"priority\": \"High\"
  }"

# 4. Log an interaction
curl -s -X POST http://localhost:3000/api/v1/interactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"leadId\": $LEAD_ID,
    \"type\": \"Email Sent\",
    \"content\": \"Sent initial email with property listings\"
  }"

# 5. View lead timeline
curl -s http://localhost:3000/api/v1/interactions/leads/$LEAD_ID/timeline \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 6. Get statistics
echo "Lead Stats:"
curl -s http://localhost:3000/api/v1/leads/stats \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo "Task Stats:"
curl -s http://localhost:3000/api/v1/tasks/stats \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo "Interaction Stats:"
curl -s http://localhost:3000/api/v1/interactions/stats \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

## Rate Limiting

Currently no rate limiting is enforced. For production deployment, consider implementing rate limiting middleware.

---

## Changelog

### Sprint 3 (Completed)
- ✅ Week 1: Authentication API
- ✅ Week 2: Lead Management API
- ✅ Week 3: Task Management API
- ✅ Week 4: Interaction Logging API

**Total:** 24 production-ready endpoints

---

## Support

For issues or questions:
- Check the comprehensive README_TYPESCRIPT.md
- Review the TypeScript source code in `src-ts/`
- Contact: dev-team@example.com

---

**API Version:** 1.0.0  
**Last Updated:** 2024-10-01  
**Status:** Production Ready ✅
