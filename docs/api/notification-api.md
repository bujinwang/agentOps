# 🔔 Notification Management API

## Overview

The Notification Management API provides comprehensive notification handling, scheduling, and delivery capabilities for the Real Estate CRM system. This API manages automated notifications, user preferences, delivery channels, and notification analytics across email, SMS, push notifications, and in-app notifications.

## Base URL
```
https://api.realestate-crm.com/v1/notifications
```

## Authentication
All Notification API endpoints require JWT authentication with notification management permissions.

---

## 📧 Notification Management

### List Notifications
Get all notifications with advanced filtering and search.

```http
GET /api/notifications
```

**Query Parameters:**
- `status` (optional): Filter by status (pending, sent, delivered, failed, cancelled)
- `type` (optional): Filter by type (email, sms, push, in_app)
- `priority` (optional): Filter by priority (low, normal, high, urgent)
- `recipient_id` (optional): Filter by recipient user ID
- `lead_id` (optional): Filter by associated lead ID
- `scheduled_from` (optional): Filter by scheduled date range start
- `scheduled_to` (optional): Filter by scheduled date range end
- `limit` (optional): Number of results (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "type": "email",
      "priority": "high",
      "status": "delivered",
      "subject": "New Lead Alert: Sarah Johnson",
      "recipient": {
        "id": 456,
        "name": "John Smith",
        "email": "john@agency.com"
      },
      "lead": {
        "id": 101,
        "name": "Sarah Johnson"
      },
      "content": {
        "subject": "New Lead Alert: Sarah Johnson",
        "body": "A new high-value lead has been assigned to you...",
        "template": "lead_assigned"
      },
      "scheduledAt": "2025-01-15T10:00:00Z",
      "sentAt": "2025-01-15T10:00:05Z",
      "deliveredAt": "2025-01-15T10:00:12Z",
      "openedAt": "2025-01-15T10:15:30Z",
      "clickedAt": null,
      "metadata": {
        "source": "lead_assignment_workflow",
        "campaign": "hot_lead_alerts",
        "urgency": "high"
      },
      "createdAt": "2025-01-15T09:45:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "totalPages": 25,
    "hasNext": true,
    "hasPrev": false
  },
  "summary": {
    "total": 1250,
    "pending": 45,
    "sent": 1100,
    "delivered": 1050,
    "failed": 25,
    "cancelled": 30
  }
}
```

### Get Notification Details
Get detailed information about a specific notification.

```http
GET /api/notifications/{notificationId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "type": "email",
    "priority": "high",
    "status": "delivered",
    "subject": "New Lead Alert: Sarah Johnson",
    "recipient": {
      "id": 456,
      "name": "John Smith",
      "email": "john@agency.com",
      "phone": "(206) 555-0123"
    },
    "lead": {
      "id": 101,
      "name": "Sarah Johnson",
      "email": "sarah@example.com"
    },
    "content": {
      "subject": "New Lead Alert: Sarah Johnson",
      "htmlBody": "<html><body><h1>New High-Value Lead</h1>...</body></html>",
      "textBody": "New High-Value Lead\n\nA new lead has been assigned...",
      "template": "lead_assigned",
      "variables": {
        "lead_name": "Sarah Johnson",
        "lead_email": "sarah@example.com",
        "agent_name": "John Smith"
      }
    },
    "delivery": {
      "channel": "email",
      "provider": "sendgrid",
      "messageId": "sg_123456789",
      "scheduledAt": "2025-01-15T10:00:00Z",
      "sentAt": "2025-01-15T10:00:05Z",
      "deliveredAt": "2025-01-15T10:00:12Z",
      "openedAt": "2025-01-15T10:15:30Z",
      "clickedAt": null,
      "bouncedAt": null,
      "complainedAt": null
    },
    "analytics": {
      "opens": 1,
      "clicks": 0,
      "bounces": 0,
      "complaints": 0,
      "unsubscribes": 0,
      "deliveryTime": 7,
      "firstOpenDelay": 930
    },
    "metadata": {
      "source": "lead_assignment_workflow",
      "campaign": "hot_lead_alerts",
      "urgency": "high",
      "automation_id": "workflow_001"
    },
    "createdAt": "2025-01-15T09:45:00Z",
    "updatedAt": "2025-01-15T10:15:30Z"
  }
}
```

### Create Notification
Create and send a notification immediately or schedule it for later.

```http
POST /api/notifications
```

**Request Body:**
```json
{
  "type": "email",
  "priority": "high",
  "recipientId": 456,
  "leadId": 101,
  "content": {
    "subject": "Urgent: High-Value Lead Requires Attention",
    "template": "urgent_lead_alert",
    "variables": {
      "lead_name": "Sarah Johnson",
      "lead_score": 89.5,
      "time_sensitive": true
    }
  },
  "scheduledAt": "2025-01-15T10:00:00Z",
  "metadata": {
    "source": "manual",
    "campaign": "urgent_leads",
    "follow_up_required": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notification": {
      "id": 124,
      "type": "email",
      "status": "scheduled",
      "scheduledAt": "2025-01-15T10:00:00Z"
    },
    "message": "Notification scheduled successfully"
  }
}
```

### Update Notification
Update notification content or scheduling.

```http
PUT /api/notifications/{notificationId}
```

**Request Body:**
```json
{
  "subject": "URGENT: High-Value Lead Requires Immediate Attention",
  "priority": "urgent",
  "scheduledAt": "2025-01-15T09:30:00Z",
  "content": {
    "variables": {
      "urgency_level": "critical"
    }
  }
}
```

### Cancel Notification
Cancel a scheduled notification.

```http
PUT /api/notifications/{notificationId}/cancel
```

**Request Body:**
```json
{
  "reason": "Lead already contacted by another agent",
  "notifyRecipient": false
}
```

---

## 📨 Bulk Notifications

### Send Bulk Notifications
Send notifications to multiple recipients.

```http
POST /api/notifications/bulk
```

**Request Body:**
```json
{
  "type": "email",
  "priority": "normal",
  "recipients": [
    { "userId": 456, "leadId": 101 },
    { "userId": 457, "leadId": 102 },
    { "userId": 458, "leadId": 103 }
  ],
  "content": {
    "subject": "Weekly Lead Summary",
    "template": "weekly_digest",
    "variables": {
      "week_start": "2025-01-08",
      "week_end": "2025-01-14"
    }
  },
  "scheduledAt": "2025-01-15T09:00:00Z",
  "batchOptions": {
    "maxBatchSize": 50,
    "delayBetweenBatches": 300,
    "respectUserPreferences": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "batchId": "batch_12345",
    "totalRecipients": 150,
    "scheduledNotifications": 145,
    "skippedRecipients": 5,
    "skipReasons": {
      "unsubscribed": 3,
      "preferences_disabled": 2
    },
    "estimatedCompletion": "2025-01-15T09:15:00Z"
  }
}
```

### Get Bulk Notification Status
Check the status of a bulk notification batch.

```http
GET /api/notifications/bulk/{batchId}/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "batchId": "batch_12345",
    "status": "completed",
    "progress": {
      "total": 145,
      "sent": 145,
      "delivered": 140,
      "failed": 5,
      "pending": 0
    },
    "startedAt": "2025-01-15T09:00:00Z",
    "completedAt": "2025-01-15T09:12:30Z",
    "averageDeliveryTime": 8.5,
    "failureReasons": {
      "invalid_email": 2,
      "mailbox_full": 1,
      "temporary_failure": 2
    }
  }
}
```

---

## 📋 Notification Templates

### List Templates
Get all available notification templates.

```http
GET /api/notifications/templates
```

**Query Parameters:**
- `type` (optional): Filter by notification type (email, sms, push)
- `category` (optional): Filter by category (lead_alerts, system, marketing)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "template_001",
      "name": "Lead Assignment Alert",
      "type": "email",
      "category": "lead_alerts",
      "subject": "New Lead Assigned: {{lead_name}}",
      "description": "Notification sent when a lead is assigned to an agent",
      "variables": [
        {
          "name": "lead_name",
          "description": "Lead's full name",
          "required": true,
          "example": "Sarah Johnson"
        },
        {
          "name": "lead_score",
          "description": "Lead's ML score",
          "required": false,
          "example": "89.5"
        }
      ],
      "usage": {
        "totalSent": 1250,
        "openRate": 0.78,
        "clickRate": 0.23,
        "lastUsed": "2025-01-15T10:00:00Z"
      },
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### Get Template Details
Get detailed information about a notification template.

```http
GET /api/notifications/templates/{templateId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "template_001",
    "name": "Lead Assignment Alert",
    "type": "email",
    "category": "lead_alerts",
    "subject": "New Lead Assigned: {{lead_name}}",
    "htmlBody": "<html><body><h1>New Lead Assignment</h1>...</body></html>",
    "textBody": "New Lead Assignment\n\nYou have been assigned...",
    "variables": [
      {
        "name": "lead_name",
        "description": "Lead's full name",
        "required": true,
        "default": "",
        "validation": "string"
      }
    ],
    "settings": {
      "priority": "high",
      "requiresConfirmation": false,
      "allowUnsubscribe": true,
      "trackOpens": true,
      "trackClicks": true
    },
    "analytics": {
      "totalSent": 1250,
      "openRate": 0.78,
      "clickRate": 0.23,
      "bounceRate": 0.02,
      "unsubscribeRate": 0.005
    },
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-14T16:30:00Z"
  }
}
```

### Create Template
Create a new notification template.

```http
POST /api/notifications/templates
```

**Request Body:**
```json
{
  "name": "Property Showing Reminder",
  "type": "email",
  "category": "appointment",
  "subject": "Reminder: Property Showing with {{lead_name}}",
  "htmlBody": "<html><body><h1>Upcoming Property Showing</h1>...</body></html>",
  "textBody": "Upcoming Property Showing\n\nYou have a property showing scheduled...",
  "variables": [
    {
      "name": "lead_name",
      "required": true
    },
    {
      "name": "property_address",
      "required": true
    },
    {
      "name": "showing_time",
      "required": true
    }
  ],
  "settings": {
    "priority": "normal",
    "trackOpens": true,
    "trackClicks": true
  }
}
```

---

## 📊 Notification Analytics

### Get Notification Performance
Get comprehensive notification performance analytics.

```http
GET /api/notifications/analytics/performance
```

**Query Parameters:**
- `period` (optional): Time period (7d, 30d, 90d) - default: 30d
- `type` (optional): Filter by notification type
- `template_id` (optional): Filter by template ID

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalSent": 5000,
      "delivered": 4850,
      "opened": 3120,
      "clicked": 780,
      "bounced": 125,
      "complained": 25,
      "unsubscribed": 15,
      "deliveryRate": 0.97,
      "openRate": 0.642,
      "clickRate": 0.161,
      "bounceRate": 0.026
    },
    "byType": {
      "email": {
        "sent": 3500,
        "delivered": 3400,
        "opened": 2380,
        "clicked": 680,
        "openRate": 0.7,
        "clickRate": 0.2
      },
      "sms": {
        "sent": 1000,
        "delivered": 980,
        "clicked": 80,
        "deliveryRate": 0.98,
        "clickRate": 0.082
      },
      "push": {
        "sent": 500,
        "delivered": 470,
        "opened": 235,
        "clicked": 20,
        "deliveryRate": 0.94,
        "openRate": 0.5
      }
    },
    "byTemplate": [
      {
        "templateId": "template_001",
        "templateName": "Lead Assignment Alert",
        "sent": 1250,
        "openRate": 0.78,
        "clickRate": 0.23,
        "performance": "excellent"
      }
    ],
    "trends": {
      "deliveryTrend": [
        { "date": "2025-01-08", "rate": 0.965 },
        { "date": "2025-01-09", "rate": 0.968 },
        { "date": "2025-01-10", "rate": 0.97 }
      ],
      "openTrend": [
        { "date": "2025-01-08", "rate": 0.635 },
        { "date": "2025-01-09", "rate": 0.64 },
        { "date": "2025-01-10", "rate": 0.642 }
      ]
    }
  }
}
```

### Get Template Performance
Get performance analytics for a specific template.

```http
GET /api/notifications/templates/{templateId}/performance
```

**Query Parameters:**
- `period` (optional): Time period (7d, 30d, 90d) - default: 30d

**Response:**
```json
{
  "success": true,
  "data": {
    "templateId": "template_001",
    "templateName": "Lead Assignment Alert",
    "period": "30d",
    "performance": {
      "sent": 1250,
      "delivered": 1225,
      "opened": 975,
      "clicked": 293,
      "bounced": 20,
      "complained": 5,
      "deliveryRate": 0.98,
      "openRate": 0.796,
      "clickRate": 0.239,
      "bounceRate": 0.016,
      "complaintRate": 0.004
    },
    "timing": {
      "averageDeliveryTime": 8.5,
      "averageFirstOpen": 15.2,
      "averageFirstClick": 45.8,
      "peakOpenHours": ["09:00-10:00", "14:00-15:00"]
    },
    "content": {
      "subjectLength": 28,
      "bodyLength": 450,
      "linkCount": 2,
      "imageCount": 1
    },
    "comparison": {
      "vsAverage": {
        "openRate": 1.23,
        "clickRate": 1.45,
        "performance": "above_average"
      }
    }
  }
}
```

---

## ⚙️ Notification Preferences

### Get User Preferences
Get notification preferences for a user.

```http
GET /api/notifications/preferences/{userId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": 456,
    "channels": {
      "email": {
        "enabled": true,
        "frequency": "immediate",
        "types": {
          "lead_assigned": true,
          "urgent_alerts": true,
          "daily_digest": false,
          "weekly_summary": true
        }
      },
      "sms": {
        "enabled": true,
        "types": {
          "urgent_alerts": true,
          "meeting_reminders": true,
          "lead_emergency": true
        }
      },
      "push": {
        "enabled": false,
        "types": {
          "lead_assigned": false,
          "meeting_reminders": false
        }
      },
      "in_app": {
        "enabled": true,
        "sound": true,
        "vibration": true,
        "badge": true
      }
    },
    "schedule": {
      "quietHours": {
        "enabled": true,
        "start": "22:00",
        "end": "08:00",
        "timezone": "America/Los_Angeles"
      },
      "weekends": {
        "email": false,
        "sms": true,
        "push": false
      }
    },
    "unsubscribed": {
      "marketing": true,
      "system": false,
      "urgent": false
    },
    "updatedAt": "2025-01-14T16:30:00Z"
  }
}
```

### Update User Preferences
Update notification preferences for a user.

```http
PUT /api/notifications/preferences/{userId}
```

**Request Body:**
```json
{
  "channels": {
    "email": {
      "enabled": true,
      "frequency": "daily_digest",
      "types": {
        "daily_digest": true,
        "weekly_summary": false
      }
    },
    "sms": {
      "enabled": false
    }
  },
  "schedule": {
    "quietHours": {
      "enabled": true,
      "start": "23:00",
      "end": "07:00"
    }
  }
}
```

---

## 🔄 Notification Automation

### Create Notification Rule
Create automated notification rules.

```http
POST /api/notifications/automation/rules
```

**Request Body:**
```json
{
  "name": "High-Value Lead Alert",
  "description": "Automatically notify agents of high-value leads",
  "trigger": {
    "type": "lead_score_threshold",
    "conditions": {
      "score": { "gte": 80 },
      "budget": { "gte": 500000 }
    }
  },
  "actions": [
    {
      "type": "send_notification",
      "template": "high_value_lead_alert",
      "channels": ["email", "push"],
      "priority": "high",
      "delay": 0
    },
    {
      "type": "create_task",
      "title": "Follow up with high-value lead",
      "assignee": "round_robin",
      "priority": "high"
    }
  ],
  "conditions": {
    "userPreferences": true,
    "businessHours": true,
    "maxFrequency": "1_per_day"
  },
  "isActive": true
}
```

### List Automation Rules
Get all automated notification rules.

```http
GET /api/notifications/automation/rules
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "rule_001",
      "name": "High-Value Lead Alert",
      "description": "Automatically notify agents of high-value leads",
      "trigger": {
        "type": "lead_score_threshold",
        "conditions": {
          "score": { "gte": 80 },
          "budget": { "gte": 500000 }
        }
      },
      "actions": [
        {
          "type": "send_notification",
          "template": "high_value_lead_alert",
          "channels": ["email", "push"]
        }
      ],
      "isActive": true,
      "stats": {
        "totalTriggered": 245,
        "successRate": 0.956,
        "lastTriggered": "2025-01-15T10:00:00Z"
      },
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

## 📧 Email Management

### Send Test Email
Send a test email to verify configuration.

```http
POST /api/notifications/test/email
```

**Request Body:**
```json
{
  "recipient": "test@example.com",
  "subject": "Test Email from CRM System",
  "body": "This is a test email to verify the notification system.",
  "template": "test_email"
}
```

### Get Email Delivery Status
Check the delivery status of sent emails.

```http
GET /api/notifications/email/{messageId}/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "sg_123456789",
    "status": "delivered",
    "deliveredAt": "2025-01-15T10:00:12Z",
    "opens": [
      {
        "timestamp": "2025-01-15T10:15:30Z",
        "ip": "192.168.1.100",
        "userAgent": "Gmail"
      }
    ],
    "clicks": [],
    "bounces": [],
    "complaints": []
  }
}
```

---

## 🚨 Error Handling

### Common Error Responses

**Notification Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "NOTIFICATION_NOT_FOUND",
    "message": "Notification not found",
    "details": {
      "notificationId": 999
    }
  }
}
```

**Template Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "TEMPLATE_NOT_FOUND",
    "message": "Notification template not found",
    "details": {
      "templateId": "template_999"
    }
  }
}
```

**Delivery Failed:**
```json
{
  "success": false,
  "error": {
    "code": "DELIVERY_FAILED",
    "message": "Notification delivery failed",
    "details": {
      "notificationId": 123,
      "channel": "email",
      "reason": "Invalid recipient email address",
      "providerError": "550 5.1.1 The email account does not exist"
    }
  }
}
```

---

## 📊 Rate Limiting

- **Individual Notifications**: 100 requests per minute
- **Bulk Notifications**: 20 requests per minute
- **Template Operations**: 50 requests per minute
- **Analytics Queries**: 100 requests per minute

---

## 🔍 Best Practices

### Template Design
1. **Personalization**: Use recipient data to personalize content
2. **Mobile Optimization**: Ensure emails work well on mobile devices
3. **Clear CTAs**: Include clear, compelling call-to-action buttons
4. **A/B Testing**: Test different subject lines and content variations

### Automation Rules
1. **Smart Triggers**: Use meaningful conditions for automated notifications
2. **Frequency Limits**: Respect user preferences and avoid notification fatigue
3. **Business Hours**: Consider time zones and business hours for scheduling
4. **Performance Monitoring**: Track delivery rates and engagement metrics

### Analytics & Optimization
1. **Real-time Monitoring**: Monitor delivery and engagement in real-time
2. **Performance Tracking**: Track open rates, click rates, and conversions
3. **A/B Testing**: Test different templates and sending times
4. **User Preferences**: Always respect user notification preferences

This comprehensive Notification Management API provides all the tools needed for automated notifications, user preferences, delivery tracking, and performance analytics in the Real Estate CRM system.