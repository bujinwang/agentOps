# 🔄 Workflow Automation API

## Overview

The Workflow API provides comprehensive automation capabilities for the Real Estate CRM system. This API manages automated workflows, templates, scheduling, and execution monitoring for lead nurturing, follow-ups, and business process automation.

## Base URL
```
https://api.realestate-crm.com/v1/workflows
```

## Authentication
All Workflow API endpoints require JWT authentication with workflow management permissions.

---

## 📋 Workflow Templates

### List Workflow Templates
Get all available workflow templates with their configurations.

```http
GET /api/workflows/templates
```

**Query Parameters:**
- `category` (optional): Filter by category (lead_nurturing, follow_up, enrichment)
- `status` (optional): Filter by status (active, draft, archived)
- `limit` (optional): Number of templates to return - default: 50

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "template_001",
      "name": "High-Value Lead Nurturing",
      "description": "Automated nurturing sequence for high-value leads",
      "category": "lead_nurturing",
      "status": "active",
      "triggerType": "lead_score_threshold",
      "triggerConditions": {
        "score": { "gte": 80 },
        "budget": { "gte": 500000 }
      },
      "steps": [
        {
          "id": "step_1",
          "name": "Initial Contact",
          "type": "email",
          "delay": 0,
          "template": "welcome_high_value",
          "conditions": []
        },
        {
          "id": "step_2",
          "name": "Property Recommendations",
          "type": "email",
          "delay": 86400,
          "template": "property_matches",
          "conditions": [
            { "field": "engagement_score", "operator": "gte", "value": 0.7 }
          ]
        }
      ],
      "createdBy": "user_123",
      "createdAt": "2025-01-10T08:00:00Z",
      "lastModified": "2025-01-14T10:30:00Z",
      "usage": {
        "totalExecutions": 1250,
        "successRate": 0.945,
        "averageCompletionTime": "4.2 days"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### Get Workflow Template Details
Get detailed information about a specific workflow template.

```http
GET /api/workflows/templates/{templateId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "template_001",
    "name": "High-Value Lead Nurturing",
    "description": "Automated nurturing sequence for high-value leads",
    "category": "lead_nurturing",
    "status": "active",
    "version": "2.1.0",
    "triggerType": "lead_score_threshold",
    "triggerConditions": {
      "score": { "gte": 80 },
      "budget": { "gte": 500000 },
      "timeline": "urgent"
    },
    "steps": [
      {
        "id": "step_1",
        "name": "Welcome Email",
        "type": "email",
        "delay": 0,
        "template": "welcome_high_value",
        "content": {
          "subject": "Welcome! Let's Find Your Dream Home",
          "body": "Dear {{lead.name}}, ..."
        },
        "conditions": [],
        "actions": [
          {
            "type": "update_lead",
            "data": { "status": "nurturing_started" }
          }
        ]
      },
      {
        "id": "step_2",
        "name": "Property Recommendations",
        "type": "email",
        "delay": 86400,
        "template": "property_matches",
        "conditions": [
          {
            "field": "engagement_score",
            "operator": "gte",
            "value": 0.7
          }
        ],
        "fallback": {
          "delay": 172800,
          "template": "follow_up_general"
        }
      }
    ],
    "settings": {
      "maxExecutions": 10,
      "timeWindow": "30 days",
      "allowParallel": false,
      "respectDoNotContact": true
    },
    "analytics": {
      "totalExecutions": 1250,
      "successRate": 0.945,
      "averageCompletionTime": "4.2 days",
      "conversionImpact": 0.156,
      "stepPerformance": {
        "step_1": { "completionRate": 0.98, "averageTime": "1 hour" },
        "step_2": { "completionRate": 0.89, "averageTime": "24 hours" }
      }
    }
  }
}
```

### Create Workflow Template
Create a new workflow template.

```http
POST /api/workflows/templates
```

**Request Body:**
```json
{
  "name": "New Lead Welcome Sequence",
  "description": "Automated welcome and onboarding for new leads",
  "category": "lead_nurturing",
  "triggerType": "lead_created",
  "triggerConditions": {
    "source": "website"
  },
  "steps": [
    {
      "name": "Welcome Email",
      "type": "email",
      "delay": 0,
      "template": "welcome_new_lead",
      "content": {
        "subject": "Welcome to Our Real Estate Services",
        "body": "Thank you for your interest..."
      }
    },
    {
      "name": "Follow-up Call",
      "type": "task",
      "delay": 86400,
      "assignee": "round_robin",
      "title": "Follow up with new lead",
      "description": "Call {{lead.name}} to discuss their requirements"
    }
  ],
  "settings": {
    "maxExecutions": 5,
    "timeWindow": "14 days",
    "allowParallel": false
  }
}
```

### Update Workflow Template
Modify an existing workflow template.

```http
PUT /api/workflows/templates/{templateId}
```

**Request Body:**
```json
{
  "name": "Updated High-Value Lead Nurturing",
  "steps": [
    {
      "id": "step_1",
      "name": "Personalized Welcome",
      "delay": 0
    },
    {
      "id": "step_2",
      "name": "Virtual Tour Invitation",
      "delay": 43200,
      "type": "email",
      "template": "virtual_tour_invite"
    }
  ]
}
```

### Delete Workflow Template
Remove a workflow template (only inactive templates can be deleted).

```http
DELETE /api/workflows/templates/{templateId}
```

---

## ⚙️ Workflow Execution

### List Active Workflows
Get all currently executing workflows.

```http
GET /api/workflows/executions
```

**Query Parameters:**
- `status` (optional): Filter by status (running, paused, completed, failed)
- `templateId` (optional): Filter by template ID
- `leadId` (optional): Filter by lead ID
- `limit` (optional): Number of executions to return - default: 50

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "execution_001",
      "templateId": "template_001",
      "templateName": "High-Value Lead Nurturing",
      "leadId": 123,
      "leadName": "Sarah Johnson",
      "status": "running",
      "currentStep": 2,
      "totalSteps": 5,
      "progress": 0.4,
      "startedAt": "2025-01-15T09:00:00Z",
      "estimatedCompletion": "2025-01-17T09:00:00Z",
      "lastActivity": "2025-01-15T14:30:00Z",
      "nextScheduledAction": {
        "stepId": "step_3",
        "type": "email",
        "scheduledAt": "2025-01-16T09:00:00Z",
        "description": "Send property recommendations"
      }
    }
  ],
  "summary": {
    "total": 45,
    "running": 32,
    "completed": 10,
    "failed": 3,
    "paused": 0
  }
}
```

### Get Workflow Execution Details
Get detailed information about a specific workflow execution.

```http
GET /api/workflows/executions/{executionId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "execution_001",
    "templateId": "template_001",
    "templateName": "High-Value Lead Nurturing",
    "leadId": 123,
    "leadName": "Sarah Johnson",
    "status": "running",
    "currentStep": 2,
    "totalSteps": 5,
    "progress": 0.4,
    "startedAt": "2025-01-15T09:00:00Z",
    "lastActivity": "2025-01-15T14:30:00Z",
    "steps": [
      {
        "id": "step_1",
        "name": "Welcome Email",
        "type": "email",
        "status": "completed",
        "executedAt": "2025-01-15T09:00:00Z",
        "result": {
          "emailId": "email_12345",
          "delivered": true,
          "opened": true,
          "clicked": false
        }
      },
      {
        "id": "step_2",
        "name": "Engagement Check",
        "type": "condition",
        "status": "completed",
        "executedAt": "2025-01-15T14:30:00Z",
        "result": {
          "condition": "engagement_score >= 0.7",
          "value": 0.85,
          "passed": true
        }
      },
      {
        "id": "step_3",
        "name": "Property Recommendations",
        "type": "email",
        "status": "scheduled",
        "scheduledAt": "2025-01-16T09:00:00Z"
      }
    ],
    "data": {
      "lead": {
        "score": 89.5,
        "engagement_score": 0.85,
        "last_activity": "2025-01-15T14:30:00Z"
      },
      "customFields": {
        "preferred_locations": ["seattle", "bellevue"],
        "budget_range": "800000-1200000"
      }
    },
    "logs": [
      {
        "timestamp": "2025-01-15T09:00:00Z",
        "level": "info",
        "message": "Workflow started for lead Sarah Johnson",
        "stepId": "start"
      },
      {
        "timestamp": "2025-01-15T09:00:05Z",
        "level": "info",
        "message": "Email sent successfully",
        "stepId": "step_1",
        "details": { "emailId": "email_12345" }
      }
    ]
  }
}
```

### Trigger Workflow Manually
Manually trigger a workflow for a specific lead.

```http
POST /api/workflows/executions/trigger
```

**Request Body:**
```json
{
  "templateId": "template_001",
  "leadId": 123,
  "priority": "high",
  "customData": {
    "source": "manual_trigger",
    "reason": "High-value lead identified",
    "agent": "john.smith"
  },
  "skipConditions": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "executionId": "execution_002",
    "status": "started",
    "message": "Workflow triggered successfully",
    "firstActionScheduled": "2025-01-15T15:00:00Z"
  }
}
```

### Pause Workflow Execution
Pause a running workflow execution.

```http
POST /api/workflows/executions/{executionId}/pause
```

**Request Body:**
```json
{
  "reason": "Lead requested to stop communications",
  "resumeAt": "2025-01-20T09:00:00Z"
}
```

### Resume Workflow Execution
Resume a paused workflow execution.

```http
POST /api/workflows/executions/{executionId}/resume
```

**Request Body:**
```json
{
  "reason": "Lead ready to continue",
  "priority": "normal"
}
```

### Cancel Workflow Execution
Cancel a workflow execution.

```http
POST /api/workflows/executions/{executionId}/cancel
```

**Request Body:**
```json
{
  "reason": "Lead converted - no longer needs nurturing",
  "finalStatus": "converted"
}
```

---

## 📊 Workflow Analytics

### Get Workflow Performance Metrics
Get comprehensive analytics on workflow performance.

```http
GET /api/workflows/analytics/performance
```

**Query Parameters:**
- `period` (optional): Time period (7d, 30d, 90d) - default: 30d
- `templateIds` (optional): Comma-separated list of template IDs
- `categories` (optional): Comma-separated list of categories

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalExecutions": 2500,
      "successRate": 0.945,
      "averageCompletionTime": "4.2 days",
      "conversionImpact": 0.156,
      "costSavings": 45000
    },
    "byTemplate": [
      {
        "templateId": "template_001",
        "templateName": "High-Value Lead Nurturing",
        "executions": 850,
        "successRate": 0.942,
        "averageTime": "3.8 days",
        "conversionRate": 0.189,
        "stepPerformance": {
          "step_1": { "completionRate": 0.98, "averageTime": "1 hour" },
          "step_2": { "completionRate": 0.89, "averageTime": "24 hours" },
          "step_3": { "completionRate": 0.76, "averageTime": "48 hours" }
        }
      }
    ],
    "byCategory": {
      "lead_nurturing": {
        "executions": 1200,
        "successRate": 0.938,
        "averageTime": "4.1 days",
        "conversionImpact": 0.142
      },
      "follow_up": {
        "executions": 800,
        "successRate": 0.952,
        "averageTime": "2.3 days",
        "conversionImpact": 0.178
      }
    },
    "trends": {
      "executionTrend": [
        { "date": "2025-01-08", "executions": 45 },
        { "date": "2025-01-09", "executions": 52 },
        { "date": "2025-01-10", "executions": 48 }
      ],
      "successRateTrend": [
        { "date": "2025-01-08", "rate": 0.942 },
        { "date": "2025-01-09", "rate": 0.945 },
        { "date": "2025-01-10", "rate": 0.947 }
      ]
    },
    "insights": [
      {
        "type": "bottleneck",
        "title": "Email Step 3 Performance Issue",
        "description": "Step 3 completion rate dropped to 76%",
        "recommendation": "Review email template and timing",
        "impact": "medium",
        "affectedExecutions": 125
      },
      {
        "type": "opportunity",
        "title": "High-Converting Template Identified",
        "description": "Template_001 shows 18.9% conversion rate",
        "recommendation": "Use as baseline for new templates",
        "impact": "high"
      }
    ]
  }
}
```

### Get Workflow Conversion Impact
Analyze the conversion impact of different workflows.

```http
GET /api/workflows/analytics/conversion-impact
```

**Query Parameters:**
- `period` (optional): Time period (30d, 90d, 1y) - default: 90d
- `attributionWindow` (optional): Attribution window in days - default: 30

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "totalConversions": 1250,
      "workflowAttributed": 890,
      "attributionRate": 0.712,
      "averageConversionTime": "12.3 days",
      "conversionValue": 42500000
    },
    "byWorkflow": [
      {
        "templateId": "template_001",
        "templateName": "High-Value Lead Nurturing",
        "conversions": 320,
        "attributionRate": 0.756,
        "averageTime": "10.2 days",
        "averageValue": 425000,
        "roi": 3.2
      },
      {
        "templateId": "template_002",
        "templateName": "Follow-up Automation",
        "conversions": 285,
        "attributionRate": 0.689,
        "averageTime": "14.1 days",
        "averageValue": 325000,
        "roi": 2.8
      }
    ],
    "attributionModel": {
      "type": "last_touch",
      "window": 30,
      "confidence": 0.89
    },
    "insights": [
      {
        "title": "Optimal Nurturing Duration",
        "finding": "10-14 day workflows show highest conversion rates",
        "recommendation": "Adjust workflow timing for optimal results"
      },
      {
        "title": "High-Value Lead Focus",
        "finding": "80% of conversions come from top 20% of leads",
        "recommendation": "Prioritize high-value lead workflows"
      }
    ]
  }
}
```

---

## ⚙️ Workflow Scheduling

### List Scheduled Workflows
Get all scheduled workflow executions.

```http
GET /api/workflows/scheduled
```

**Query Parameters:**
- `status` (optional): Filter by status (pending, running, completed)
- `from` (optional): Start date for scheduling window
- `to` (optional): End date for scheduling window

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "scheduled_001",
      "templateId": "template_001",
      "templateName": "High-Value Lead Nurturing",
      "leadId": 123,
      "leadName": "Sarah Johnson",
      "scheduledAt": "2025-01-16T09:00:00Z",
      "status": "pending",
      "priority": "normal",
      "conditions": {
        "lead_score": { "gte": 80 },
        "engagement_score": { "gte": 0.7 }
      },
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "summary": {
    "total": 150,
    "pending": 45,
    "running": 32,
    "completed": 73
  }
}
```

### Schedule Workflow Execution
Schedule a workflow to run at a specific time.

```http
POST /api/workflows/scheduled
```

**Request Body:**
```json
{
  "templateId": "template_001",
  "leadId": 123,
  "scheduledAt": "2025-01-20T09:00:00Z",
  "priority": "high",
  "conditions": {
    "lead_score": { "gte": 75 },
    "last_activity": { "within": "7 days" }
  },
  "customData": {
    "campaign": "winter_promotion",
    "source": "scheduled_nurture"
  }
}
```

### Update Scheduled Workflow
Modify a scheduled workflow execution.

```http
PUT /api/workflows/scheduled/{scheduledId}
```

**Request Body:**
```json
{
  "scheduledAt": "2025-01-21T14:00:00Z",
  "priority": "urgent",
  "conditions": {
    "lead_score": { "gte": 85 }
  }
}
```

### Cancel Scheduled Workflow
Cancel a scheduled workflow execution.

```http
DELETE /api/workflows/scheduled/{scheduledId}
```

**Request Body:**
```json
{
  "reason": "Lead already converted",
  "notify": false
}
```

---

## 🎯 Workflow Conditions & Triggers

### List Available Triggers
Get all available workflow triggers and their configurations.

```http
GET /api/workflows/triggers
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leadEvents": [
      {
        "type": "lead_created",
        "description": "Triggered when a new lead is created",
        "conditions": ["source", "budget", "property_type"],
        "delay": 0
      },
      {
        "type": "lead_score_changed",
        "description": "Triggered when lead score crosses threshold",
        "conditions": ["score_threshold", "direction"],
        "delay": 0
      },
      {
        "type": "lead_engagement",
        "description": "Triggered based on engagement patterns",
        "conditions": ["engagement_score", "activity_type", "time_window"],
        "delay": 3600
      }
    ],
    "timeBased": [
      {
        "type": "scheduled",
        "description": "Execute at specific time",
        "conditions": ["schedule", "timezone"],
        "delay": 0
      },
      {
        "type": "recurring",
        "description": "Execute on recurring schedule",
        "conditions": ["frequency", "interval"],
        "delay": 0
      }
    ],
    "external": [
      {
        "type": "webhook",
        "description": "Triggered by external webhook",
        "conditions": ["endpoint", "payload_schema"],
        "delay": 0
      },
      {
        "type": "api_call",
        "description": "Triggered by API request",
        "conditions": ["method", "endpoint"],
        "delay": 0
      }
    ]
  }
}
```

### Test Workflow Conditions
Test workflow trigger conditions against sample data.

```http
POST /api/workflows/conditions/test
```

**Request Body:**
```json
{
  "templateId": "template_001",
  "testData": {
    "lead": {
      "id": 123,
      "score": 85,
      "budget": 600000,
      "engagement_score": 0.8,
      "last_activity": "2025-01-15T10:00:00Z"
    },
    "customFields": {
      "timeline": "urgent",
      "source": "website"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "triggerMatched": true,
    "matchedConditions": [
      {
        "condition": "score >= 80",
        "value": 85,
        "matched": true
      },
      {
        "condition": "budget >= 500000",
        "value": 600000,
        "matched": true
      },
      {
        "condition": "timeline = urgent",
        "value": "urgent",
        "matched": true
      }
    ],
    "unmatchedConditions": [],
    "wouldExecute": true,
    "estimatedDelay": 0
  }
}
```

---

## 📧 Email Templates

### List Email Templates
Get all available email templates for workflows.

```http
GET /api/workflows/templates/email
```

**Query Parameters:**
- `category` (optional): Filter by category (welcome, nurture, follow_up)
- `status` (optional): Filter by status (active, draft)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "email_template_001",
      "name": "Welcome High-Value Lead",
      "category": "welcome",
      "status": "active",
      "subject": "Welcome! Let's Find Your Dream Home",
      "variables": ["lead.name", "lead.email", "agent.name"],
      "usage": {
        "totalSent": 1250,
        "openRate": 0.423,
        "clickRate": 0.156,
        "conversionRate": 0.089
      },
      "createdAt": "2025-01-10T08:00:00Z"
    }
  ]
}
```

### Get Email Template Details
Get detailed information about a specific email template.

```http
GET /api/workflows/templates/email/{templateId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "email_template_001",
    "name": "Welcome High-Value Lead",
    "description": "Personalized welcome email for high-value leads",
    "category": "welcome",
    "status": "active",
    "subject": "Welcome {{lead.name}}! Let's Find Your Dream Home",
    "htmlBody": "<html><body>...</body></html>",
    "textBody": "Welcome {{lead.name}}!...",
    "variables": [
      {
        "name": "lead.name",
        "description": "Lead's full name",
        "required": true,
        "example": "Sarah Johnson"
      },
      {
        "name": "agent.name",
        "description": "Assigned agent's name",
        "required": false,
        "example": "John Smith"
      }
    ],
    "attachments": [],
    "analytics": {
      "totalSent": 1250,
      "openRate": 0.423,
      "clickRate": 0.156,
      "bounceRate": 0.012,
      "unsubscribeRate": 0.008
    }
  }
}
```

### Create Email Template
Create a new email template.

```http
POST /api/workflows/templates/email
```

**Request Body:**
```json
{
  "name": "Property Recommendations",
  "description": "Email with personalized property recommendations",
  "category": "nurture",
  "subject": "{{lead.name}}, Check Out These Properties",
  "htmlBody": "<html><body><h1>Hi {{lead.name}}</h1>...</body></html>",
  "textBody": "Hi {{lead.name}},\n\nBased on your preferences...",
  "variables": [
    {
      "name": "lead.name",
      "required": true
    },
    {
      "name": "properties",
      "required": true
    }
  ]
}
```

---

## 🚨 Error Handling

### Common Error Responses

**Template Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "TEMPLATE_NOT_FOUND",
    "message": "Workflow template not found",
    "details": {
      "templateId": "template_999"
    }
  }
}
```

**Execution Failed:**
```json
{
  "success": false,
  "error": {
    "code": "EXECUTION_FAILED",
    "message": "Workflow execution failed",
    "details": {
      "executionId": "execution_001",
      "stepId": "step_2",
      "reason": "Email service unavailable",
      "retryable": true
    }
  }
}
```

**Condition Not Met:**
```json
{
  "success": false,
  "error": {
    "code": "CONDITION_NOT_MET",
    "message": "Workflow trigger conditions not satisfied",
    "details": {
      "templateId": "template_001",
      "conditions": [
        {
          "condition": "score >= 80",
          "required": 80,
          "actual": 65,
          "passed": false
        }
      ]
    }
  }
}
```

---

## 📊 Rate Limiting

- **Template Operations**: 100 requests per minute
- **Execution Management**: 200 requests per minute
- **Analytics Queries**: 50 requests per minute
- **Scheduling Operations**: 100 requests per minute

---

## 🔍 Best Practices

### Template Design
1. **Variable Usage**: Use clear, descriptive variable names
2. **Responsive Design**: Ensure emails work on all devices
3. **Personalization**: Leverage lead data for personalized content
4. **A/B Testing**: Test different subject lines and content

### Execution Management
1. **Condition Logic**: Use clear, testable conditions for triggers
2. **Error Handling**: Implement proper fallback mechanisms
3. **Performance**: Monitor execution times and resource usage
4. **Scalability**: Design workflows that can handle high volumes

### Analytics & Optimization
1. **Performance Tracking**: Monitor completion rates and conversion impact
2. **A/B Testing**: Test different workflow variations
3. **Continuous Improvement**: Use analytics to optimize workflows
4. **ROI Measurement**: Track the business impact of automation

This comprehensive Workflow API provides all the tools needed to create, manage, and optimize automated workflows for lead nurturing, follow-ups, and business process automation in the Real Estate CRM system.