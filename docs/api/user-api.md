# 👥 User Management API

## Overview

The User Management API provides comprehensive user authentication, profile management, role-based access control, and user lifecycle management for the Real Estate CRM system. This API handles all user-related operations including registration, authentication, permissions, and user data management.

## Base URL
```
https://api.realestate-crm.com/v1/users
```

## Authentication
Most User API endpoints require JWT authentication. Registration and login endpoints are public.

---

## 🔐 Authentication

### User Registration
Register a new user account.

```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "john.smith@example.com",
  "password": "SecurePass123!",
  "name": "John Smith",
  "phone": "(206) 555-0123",
  "role": "agent",
  "company": "Premier Realty",
  "licenseNumber": "123456789",
  "specialties": ["residential", "investment"],
  "acceptTerms": true,
  "marketingConsent": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "email": "john.smith@example.com",
      "name": "John Smith",
      "role": "agent",
      "status": "pending_verification",
      "createdAt": "2025-01-15T10:00:00Z"
    },
    "message": "Registration successful. Please check your email for verification.",
    "verificationRequired": true
  }
}
```

### User Login
Authenticate user and return JWT tokens.

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "john.smith@example.com",
  "password": "SecurePass123!",
  "rememberMe": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "email": "john.smith@example.com",
      "name": "John Smith",
      "role": "agent",
      "permissions": ["leads.read", "leads.write", "properties.read"],
      "lastLoginAt": "2025-01-15T10:30:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600,
      "tokenType": "Bearer"
    },
    "session": {
      "id": "sess_12345",
      "device": "Chrome 120.0",
      "ip": "192.168.1.100",
      "location": "Seattle, WA"
    }
  }
}
```

### Refresh Token
Refresh access token using refresh token.

```http
POST /api/auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "tokenType": "Bearer"
  }
}
```

### Logout
Invalidate user session and tokens.

```http
POST /api/auth/logout
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully",
    "sessionEnded": "2025-01-15T11:00:00Z"
  }
}
```

### Email Verification
Verify user email address.

```http
POST /api/auth/verify-email
```

**Request Body:**
```json
{
  "token": "email_verification_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully",
    "user": {
      "id": 123,
      "email": "john.smith@example.com",
      "status": "active"
    }
  }
}
```

### Password Reset Request
Request password reset email.

```http
POST /api/auth/forgot-password
```

**Request Body:**
```json
{
  "email": "john.smith@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password reset email sent",
    "resetTokenExpiresIn": 3600
  }
}
```

### Password Reset
Reset user password using reset token.

```http
POST /api/auth/reset-password
```

**Request Body:**
```json
{
  "token": "password_reset_token_here",
  "password": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully",
    "user": {
      "id": 123,
      "email": "john.smith@example.com"
    }
  }
}
```

---

## 👤 User Profile Management

### Get Current User Profile
Get the current authenticated user's profile.

```http
GET /api/users/me
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "email": "john.smith@example.com",
    "name": "John Smith",
    "phone": "(206) 555-0123",
    "role": "agent",
    "status": "active",
    "avatar": "https://cdn.example.com/avatars/123.jpg",
    "company": "Premier Realty",
    "licenseNumber": "123456789",
    "specialties": ["residential", "investment"],
    "bio": "Experienced real estate agent specializing in residential and investment properties...",
    "socialLinks": {
      "linkedin": "https://linkedin.com/in/johnsmith",
      "website": "https://johnsmithrealty.com"
    },
    "preferences": {
      "timezone": "America/Los_Angeles",
      "dateFormat": "MM/DD/YYYY",
      "currency": "USD",
      "notifications": {
        "email": true,
        "push": false,
        "sms": true
      }
    },
    "stats": {
      "leadsManaged": 245,
      "propertiesListed": 89,
      "dealsClosed": 34,
      "revenueGenerated": 12500000
    },
    "lastLoginAt": "2025-01-15T10:30:00Z",
    "createdAt": "2024-06-15T08:00:00Z",
    "updatedAt": "2025-01-14T16:45:00Z"
  }
}
```

### Update User Profile
Update the current user's profile information.

```http
PUT /api/users/me
```

**Request Body:**
```json
{
  "name": "John A. Smith",
  "phone": "(206) 555-0124",
  "bio": "Updated bio with new achievements...",
  "specialties": ["residential", "investment", "luxury"],
  "preferences": {
    "notifications": {
      "sms": false
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "name": "John A. Smith",
      "phone": "(206) 555-0124",
      "updatedAt": "2025-01-15T11:00:00Z"
    },
    "message": "Profile updated successfully"
  }
}
```

### Upload Avatar
Upload or update user avatar.

```http
POST /api/users/me/avatar
```

**Content-Type:** `multipart/form-data`

**Form Data:**
- `avatar`: Image file (max 5MB, JPG/PNG)

**Response:**
```json
{
  "success": true,
  "data": {
    "avatar": "https://cdn.example.com/avatars/123.jpg",
    "thumbnail": "https://cdn.example.com/avatars/123_thumb.jpg",
    "uploadedAt": "2025-01-15T11:15:00Z"
  }
}
```

### Change Password
Change the current user's password.

```http
PUT /api/users/me/password
```

**Request Body:**
```json
{
  "currentPassword": "CurrentPass123!",
  "newPassword": "NewSecurePass456!",
  "confirmPassword": "NewSecurePass456!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully",
    "changedAt": "2025-01-15T11:30:00Z"
  }
}
```

---

## 👥 User Administration

### List Users
Get all users with filtering and pagination (admin only).

```http
GET /api/users
```

**Query Parameters:**
- `role` (optional): Filter by role
- `status` (optional): Filter by status (active, inactive, suspended)
- `search` (optional): Search by name or email
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "email": "john.smith@example.com",
      "name": "John Smith",
      "role": "agent",
      "status": "active",
      "company": "Premier Realty",
      "createdAt": "2024-06-15T08:00:00Z",
      "lastLoginAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 245,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Get User Details
Get detailed information about a specific user (admin only).

```http
GET /api/users/{userId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "email": "john.smith@example.com",
    "name": "John Smith",
    "phone": "(206) 555-0123",
    "role": "agent",
    "status": "active",
    "avatar": "https://cdn.example.com/avatars/123.jpg",
    "company": "Premier Realty",
    "licenseNumber": "123456789",
    "specialties": ["residential", "investment"],
    "permissions": ["leads.read", "leads.write", "properties.read"],
    "stats": {
      "leadsManaged": 245,
      "propertiesListed": 89,
      "dealsClosed": 34,
      "revenueGenerated": 12500000,
      "averageResponseTime": "2.3 hours",
      "conversionRate": 0.139
    },
    "activity": {
      "lastLoginAt": "2025-01-15T10:30:00Z",
      "lastActivityAt": "2025-01-15T11:45:00Z",
      "loginCount": 156,
      "activeSessions": 2
    },
    "createdAt": "2024-06-15T08:00:00Z",
    "updatedAt": "2025-01-14T16:45:00Z"
  }
}
```

### Create User
Create a new user account (admin only).

```http
POST /api/users
```

**Request Body:**
```json
{
  "email": "jane.doe@example.com",
  "password": "TempPass123!",
  "name": "Jane Doe",
  "role": "agent",
  "company": "Premier Realty",
  "phone": "(206) 555-0456",
  "licenseNumber": "987654321",
  "specialties": ["commercial", "luxury"],
  "sendWelcomeEmail": true
}
```

### Update User
Update user information (admin only).

```http
PUT /api/users/{userId}
```

**Request Body:**
```json
{
  "name": "Jane A. Doe",
  "role": "senior_agent",
  "status": "active",
  "specialties": ["commercial", "luxury", "investment"]
}
```

### Delete User
Deactivate or delete a user account (admin only).

```http
DELETE /api/users/{userId}
```

**Query Parameters:**
- `permanent` (optional): Permanently delete (default: false, soft delete)

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": 124,
    "action": "deactivated",
    "message": "User account deactivated successfully"
  }
}
```

---

## 🔒 Role-Based Access Control

### List Roles
Get all available user roles and their permissions.

```http
GET /api/users/roles
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "admin",
      "name": "Administrator",
      "description": "Full system access",
      "permissions": [
        "users.*",
        "leads.*",
        "properties.*",
        "analytics.*",
        "system.*"
      ],
      "userCount": 3
    },
    {
      "id": "agent",
      "name": "Real Estate Agent",
      "description": "Standard agent permissions",
      "permissions": [
        "leads.read",
        "leads.write",
        "properties.read",
        "analytics.basic"
      ],
      "userCount": 45
    },
    {
      "id": "manager",
      "name": "Team Manager",
      "description": "Management permissions",
      "permissions": [
        "leads.*",
        "properties.*",
        "analytics.*",
        "users.team"
      ],
      "userCount": 8
    }
  ]
}
```

### Get Role Permissions
Get detailed permissions for a specific role.

```http
GET /api/users/roles/{roleId}/permissions
```

**Response:**
```json
{
  "success": true,
  "data": {
    "role": "agent",
    "permissions": {
      "leads": {
        "read": true,
        "write": true,
        "delete": false,
        "export": true
      },
      "properties": {
        "read": true,
        "write": true,
        "delete": false,
        "mls_sync": false
      },
      "analytics": {
        "basic": true,
        "advanced": false,
        "export": true
      },
      "users": {
        "read": false,
        "write": false,
        "team": true
      }
    },
    "restrictions": [
      "Cannot delete leads older than 90 days",
      "Limited to own team's data",
      "No access to system settings"
    ]
  }
}
```

### Update User Role
Change a user's role and permissions (admin only).

```http
PUT /api/users/{userId}/role
```

**Request Body:**
```json
{
  "role": "senior_agent",
  "reason": "Promotion based on performance",
  "effectiveDate": "2025-02-01T00:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": 123,
    "oldRole": "agent",
    "newRole": "senior_agent",
    "permissions": ["leads.*", "properties.*", "analytics.advanced"],
    "effectiveDate": "2025-02-01T00:00:00Z"
  }
}
```

---

## 📊 User Analytics

### Get User Activity
Get activity statistics for a user.

```http
GET /api/users/{userId}/activity
```

**Query Parameters:**
- `period` (optional): Time period (7d, 30d, 90d) - default: 30d

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": 123,
    "period": "30d",
    "activity": {
      "logins": 22,
      "leadsCreated": 15,
      "leadsUpdated": 89,
      "propertiesViewed": 156,
      "emailsSent": 67,
      "callsMade": 34,
      "meetingsScheduled": 12,
      "dealsClosed": 3
    },
    "performance": {
      "responseTime": "2.3 hours",
      "conversionRate": 0.139,
      "leadQualityScore": 74.5,
      "customerSatisfaction": 4.2
    },
    "trends": {
      "dailyActivity": [
        { "date": "2025-01-08", "actions": 12 },
        { "date": "2025-01-09", "actions": 18 },
        { "date": "2025-01-10", "actions": 15 }
      ]
    }
  }
}
```

### Get User Sessions
Get active and recent user sessions.

```http
GET /api/users/me/sessions
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activeSessions": [
      {
        "id": "sess_12345",
        "device": "Chrome 120.0 on Windows",
        "ip": "192.168.1.100",
        "location": "Seattle, WA",
        "startedAt": "2025-01-15T09:00:00Z",
        "lastActivity": "2025-01-15T11:45:00Z",
        "current": true
      },
      {
        "id": "sess_12346",
        "device": "Mobile Safari on iOS",
        "ip": "192.168.1.101",
        "location": "Seattle, WA",
        "startedAt": "2025-01-15T08:30:00Z",
        "lastActivity": "2025-01-15T09:15:00Z"
      }
    ],
    "recentSessions": [
      {
        "id": "sess_12344",
        "device": "Chrome 119.0 on macOS",
        "ip": "192.168.1.100",
        "location": "Seattle, WA",
        "startedAt": "2025-01-14T16:00:00Z",
        "endedAt": "2025-01-14T18:30:00Z"
      }
    ]
  }
}
```

### Revoke Session
Revoke a specific user session.

```http
DELETE /api/users/me/sessions/{sessionId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_12346",
    "revokedAt": "2025-01-15T12:00:00Z",
    "message": "Session revoked successfully"
  }
}
```

---

## 🔔 Notification Preferences

### Get Notification Settings
Get user's notification preferences.

```http
GET /api/users/me/notifications
```

**Response:**
```json
{
  "success": true,
  "data": {
    "email": {
      "enabled": true,
      "frequency": "immediate",
      "types": {
        "lead_assigned": true,
        "property_alerts": true,
        "task_reminders": true,
        "system_updates": false
      }
    },
    "push": {
      "enabled": false,
      "types": {
        "urgent_leads": false,
        "meeting_reminders": false
      }
    },
    "sms": {
      "enabled": true,
      "types": {
        "urgent_alerts": true,
        "meeting_reminders": true
      }
    },
    "in_app": {
      "enabled": true,
      "sound": true,
      "vibration": true
    }
  }
}
```

### Update Notification Settings
Update user's notification preferences.

```http
PUT /api/users/me/notifications
```

**Request Body:**
```json
{
  "email": {
    "enabled": true,
    "frequency": "daily_digest",
    "types": {
      "system_updates": true
    }
  },
  "push": {
    "enabled": true,
    "types": {
      "urgent_leads": true
    }
  }
}
```

---

## 📋 User Invitations

### Invite User
Send invitation to join the system (admin only).

```http
POST /api/users/invite
```

**Request Body:**
```json
{
  "email": "new.agent@example.com",
  "name": "New Agent",
  "role": "agent",
  "company": "Premier Realty",
  "message": "Welcome to our real estate team!",
  "expiresIn": 604800
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "invitationId": "inv_12345",
    "email": "new.agent@example.com",
    "expiresAt": "2025-01-22T10:00:00Z",
    "message": "Invitation sent successfully"
  }
}
```

### Accept Invitation
Accept user invitation using invitation token.

```http
POST /api/users/invite/accept
```

**Request Body:**
```json
{
  "token": "invitation_token_here",
  "password": "SecurePass123!",
  "name": "New Agent",
  "phone": "(206) 555-0789"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 125,
      "email": "new.agent@example.com",
      "name": "New Agent",
      "role": "agent",
      "status": "active"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

---

## 🚨 Error Handling

### Common Error Responses

**User Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found",
    "details": {
      "userId": 999
    }
  }
}
```

**Authentication Failed:**
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid email or password",
    "details": {
      "attemptsRemaining": 4
    }
  }
}
```

**Insufficient Permissions:**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "You don't have permission to perform this action",
    "details": {
      "requiredPermission": "users.write",
      "userRole": "agent"
    }
  }
}
```

**Invalid Token:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Authentication token is invalid or expired",
    "details": {
      "tokenType": "access"
    }
  }
}
```

---

## 📊 Rate Limiting

- **Authentication**: 10 requests per minute per IP
- **User Profile**: 100 requests per minute
- **User Administration**: 50 requests per minute
- **File Uploads**: 20 requests per minute

---

## 🔍 Best Practices

### Authentication
1. **Token Security**: Store tokens securely and rotate refresh tokens regularly
2. **Session Management**: Monitor active sessions and revoke suspicious ones
3. **Password Policies**: Enforce strong password requirements
4. **Multi-Factor**: Enable 2FA for enhanced security

### User Management
1. **Role-Based Access**: Use granular permissions for security
2. **Profile Completeness**: Encourage complete profile information
3. **Activity Monitoring**: Track user activity for security and analytics
4. **Data Privacy**: Respect user privacy and data protection regulations

### Performance
1. **Caching**: Cache user profiles and permissions
2. **Database Indexing**: Optimize queries for user data
3. **Session Storage**: Use Redis for efficient session management
4. **Background Processing**: Handle profile updates asynchronously

This comprehensive User Management API provides all the tools needed for user authentication, profile management, role-based access control, and user lifecycle management in the Real Estate CRM system.