# 📋 Task Management API

## Overview

The Task Management API provides comprehensive task creation, assignment, tracking, and workflow management capabilities for the Real Estate CRM system. This API handles all task-related operations including automated task generation, assignment algorithms, progress tracking, and performance analytics.

## Base URL
```
https://api.realestate-crm.com/v1/tasks
```

## Authentication
All Task API endpoints require JWT authentication with task management permissions.

---

## 📝 Task Creation & Management

### List Tasks
Get all tasks with advanced filtering and search capabilities.

```http
GET /api/tasks
```

**Query Parameters:**
- `status` (optional): Filter by status (pending, in_progress, completed, cancelled)
- `priority` (optional): Filter by priority (low, medium, high, urgent)
- `assigned_to` (optional): Filter by assigned user ID
- `created_by` (optional): Filter by creator user ID
- `lead_id` (optional): Filter by associated lead ID
- `type` (optional): Filter by task type (call, email, meeting, follow_up)
- `due_date_from` (optional): Filter by due date range start
- `due_date_to` (optional): Filter by due date range end
- `overdue` (optional): Filter for overdue tasks only (true/false)
- `limit` (optional): Number of results (default: 50, max: 100)
- `sort` (optional): Sort field (created_at, due_date, priority)
- `order` (optional): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "title": "Follow up with Sarah Johnson",
      "description": "Call Sarah to discuss property preferences and schedule viewing",
      "type": "call",
      "priority": "high",
      "status": "pending",
      "assignedTo": {
        "id": 456,
        "name": "John Smith",
        "email": "john@agency.com"
      },
      "createdBy": {
        "id": 789,
        "name": "System",
        "email": "system@agency.com"
      },
      "lead": {
        "id": 101,
        "name": "Sarah Johnson",
        "email": "sarah@example.com"
      },
      "dueDate": "2025-01-16T14:00:00Z",
      "estimatedDuration": 30,
      "actualDuration": null,
      "completedAt": null,
      "tags": ["follow_up", "hot_lead"],
      "metadata": {
        "source": "lead_score_threshold",
        "priority_reason": "High-value lead with urgent timeline"
      },
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 245,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "summary": {
    "total": 245,
    "pending": 89,
    "in_progress": 34,
    "completed": 115,
    "cancelled": 7,
    "overdue": 12
  }
}
```

### Get Task Details
Get detailed information about a specific task.

```http
GET /api/tasks/{taskId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Follow up with Sarah Johnson",
    "description": "Call Sarah to discuss property preferences and schedule viewing",
    "type": "call",
    "priority": "high",
    "status": "pending",
    "assignedTo": {
      "id": 456,
      "name": "John Smith",
      "email": "john@agency.com",
      "phone": "(206) 555-0123"
    },
    "createdBy": {
      "id": 789,
      "name": "System",
      "email": "system@agency.com"
    },
    "lead": {
      "id": 101,
      "name": "Sarah Johnson",
      "email": "sarah@example.com",
      "phone": "(206) 555-0456"
    },
    "dueDate": "2025-01-16T14:00:00Z",
    "estimatedDuration": 30,
    "actualDuration": null,
    "completedAt": null,
    "tags": ["follow_up", "hot_lead"],
    "metadata": {
      "source": "lead_score_threshold",
      "priority_reason": "High-value lead with urgent timeline",
      "automated": true,
      "template_id": "follow_up_hot_lead"
    },
    "comments": [
      {
        "id": 234,
        "content": "Sarah mentioned she's looking for a 3-bedroom home in the $700K-$900K range",
        "author": {
          "id": 456,
          "name": "John Smith"
        },
        "createdAt": "2025-01-15T11:30:00Z"
      }
    ],
    "attachments": [
      {
        "id": 345,
        "filename": "property_options.pdf",
        "url": "https://cdn.example.com/tasks/123/property_options.pdf",
        "uploadedBy": {
          "id": 456,
          "name": "John Smith"
        },
        "uploadedAt": "2025-01-15T12:00:00Z"
      }
    ],
    "history": [
      {
        "timestamp": "2025-01-15T10:00:00Z",
        "action": "created",
        "user": "System",
        "details": "Task created via automated workflow"
      },
      {
        "timestamp": "2025-01-15T10:30:00Z",
        "action": "assigned",
        "user": "John Smith",
        "details": "Assigned to John Smith"
      }
    ],
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T12:00:00Z"
  }
}
```

### Create Task
Create a new task manually or via automation.

```http
POST /api/tasks
```

**Request Body:**
```json
{
  "title": "Schedule property showing for Sarah Johnson",
  "description": "Coordinate with Sarah to schedule a showing for the downtown condo",
  "type": "meeting",
  "priority": "high",
  "assignedToId": 456,
  "leadId": 101,
  "dueDate": "2025-01-17T10:00:00Z",
  "estimatedDuration": 60,
  "tags": ["showing", "hot_lead"],
  "metadata": {
    "property_id": 789,
    "showing_type": "in_person"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 124,
      "title": "Schedule property showing for Sarah Johnson",
      "status": "pending",
      "assignedTo": {
        "id": 456,
        "name": "John Smith"
      },
      "createdAt": "2025-01-15T13:00:00Z"
    },
    "message": "Task created successfully"
  }
}
```

### Update Task
Update task information and status.

```http
PUT /api/tasks/{taskId}
```

**Request Body:**
```json
{
  "title": "Schedule property showing for Sarah Johnson - URGENT",
  "status": "in_progress",
  "priority": "urgent",
  "dueDate": "2025-01-16T09:00:00Z",
  "actualDuration": 45,
  "tags": ["showing", "hot_lead", "urgent"]
}
```

### Delete Task
Remove a task (admin only or task creator).

```http
DELETE /api/tasks/{taskId}
```

**Query Parameters:**
- `reason` (optional): Reason for deletion

---

## 🔄 Task Status Management

### Update Task Status
Update the status of a task with optional completion details.

```http
PUT /api/tasks/{taskId}/status
```

**Request Body:**
```json
{
  "status": "completed",
  "outcome": "successful",
  "notes": "Successfully scheduled showing for January 18th at 2 PM",
  "actualDuration": 25,
  "completedAt": "2025-01-15T14:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": 123,
    "oldStatus": "in_progress",
    "newStatus": "completed",
    "completedAt": "2025-01-15T14:30:00Z",
    "automationsTriggered": [
      {
        "type": "notification",
        "recipient": "john.smith",
        "message": "Task completed: Follow up with Sarah Johnson"
      },
      {
        "type": "workflow",
        "name": "Post-Task Follow-up",
        "triggeredAt": "2025-01-15T14:30:05Z"
      }
    ]
  }
}
```

### Bulk Update Tasks
Update multiple tasks at once.

```http
PUT /api/tasks/bulk/status
```

**Request Body:**
```json
{
  "taskIds": [123, 124, 125],
  "status": "completed",
  "outcome": "successful",
  "notes": "Bulk completion via workflow automation"
}
```

---

## 👥 Task Assignment

### Assign Task
Assign a task to a user.

```http
PUT /api/tasks/{taskId}/assign
```

**Request Body:**
```json
{
  "assignedToId": 456,
  "reason": "John has the best relationship with this lead",
  "notifyAssignee": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": 123,
    "assignedTo": {
      "id": 456,
      "name": "John Smith",
      "email": "john@agency.com"
    },
    "assignedAt": "2025-01-15T15:00:00Z",
    "notificationSent": true
  }
}
```

### Reassign Task
Reassign a task from one user to another.

```http
PUT /api/tasks/{taskId}/reassign
```

**Request Body:**
```json
{
  "newAssigneeId": 457,
  "reason": "Jane has more availability this week",
  "transferNotes": "Please review the lead's previous communications",
  "notifyBoth": true
}
```

### Get Task Assignment Suggestions
Get AI-powered suggestions for task assignment.

```http
GET /api/tasks/{taskId}/assignment-suggestions
```

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": 123,
    "currentAssignee": {
      "id": 456,
      "name": "John Smith",
      "score": 0.85
    },
    "suggestions": [
      {
        "user": {
          "id": 457,
          "name": "Jane Doe",
          "role": "Senior Agent"
        },
        "score": 0.92,
        "reason": "Higher success rate with similar lead profiles",
        "availability": "Available next 2 hours",
        "workload": "Light workload today"
      },
      {
        "user": {
          "id": 458,
          "name": "Bob Wilson",
          "role": "Agent"
        },
        "score": 0.78,
        "reason": "Good performance with luxury properties",
        "availability": "Available in 4 hours",
        "workload": "Moderate workload"
      }
    ]
  }
}
```

---

## 📊 Task Analytics & Reporting

### Get Task Performance Metrics
Get comprehensive task performance analytics.

```http
GET /api/tasks/analytics/performance
```

**Query Parameters:**
- `period` (optional): Time period (7d, 30d, 90d) - default: 30d
- `user_id` (optional): Filter by specific user
- `team_id` (optional): Filter by team

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTasks": 1250,
      "completedTasks": 1100,
      "completionRate": 0.88,
      "averageCompletionTime": "4.2 hours",
      "overdueTasks": 45,
      "overdueRate": 0.036
    },
    "byType": {
      "call": {
        "total": 450,
        "completed": 420,
        "completionRate": 0.933,
        "averageTime": "15 minutes"
      },
      "email": {
        "total": 380,
        "completed": 365,
        "completionRate": 0.961,
        "averageTime": "8 minutes"
      },
      "meeting": {
        "total": 280,
        "completed": 245,
        "completionRate": 0.875,
        "averageTime": "2.5 hours"
      }
    },
    "byPriority": {
      "urgent": {
        "total": 120,
        "completed": 115,
        "completionRate": 0.958,
        "averageTime": "1.2 hours"
      },
      "high": {
        "total": 340,
        "completed": 310,
        "completionRate": 0.912,
        "averageTime": "3.8 hours"
      }
    },
    "trends": {
      "completionRateTrend": [
        { "date": "2025-01-08", "rate": 0.85 },
        { "date": "2025-01-09", "rate": 0.87 },
        { "date": "2025-01-10", "rate": 0.88 }
      ],
      "volumeTrend": [
        { "date": "2025-01-08", "tasks": 42 },
        { "date": "2025-01-09", "tasks": 48 },
        { "date": "2025-01-10", "tasks": 45 }
      ]
    }
  }
}
```

### Get User Task Performance
Get task performance metrics for a specific user.

```http
GET /api/tasks/analytics/users/{userId}
```

**Query Parameters:**
- `period` (optional): Time period (7d, 30d, 90d) - default: 30d

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 456,
      "name": "John Smith",
      "role": "Senior Agent"
    },
    "performance": {
      "totalTasks": 245,
      "completedTasks": 220,
      "completionRate": 0.898,
      "averageCompletionTime": "3.2 hours",
      "onTimeCompletionRate": 0.945,
      "overdueTasks": 8
    },
    "byType": {
      "call": { "completed": 85, "rate": 0.956 },
      "email": { "completed": 72, "rate": 0.987 },
      "meeting": { "completed": 45, "rate": 0.833 }
    },
    "productivity": {
      "tasksPerDay": 8.2,
      "tasksPerHour": 1.1,
      "peakHours": ["10:00-11:00", "14:00-15:00"],
      "focusTime": "85%"
    },
    "quality": {
      "averageTaskScore": 4.2,
      "customerSatisfaction": 4.6,
      "leadConversionRate": 0.156
    },
    "trends": {
      "completionTrend": [
        { "week": "2025-W01", "completed": 18 },
        { "week": "2025-W02", "completed": 22 },
        { "week": "2025-W03", "completed": 25 }
      ]
    }
  }
}
```

---

## 📋 Task Templates

### List Task Templates
Get all available task templates.

```http
GET /api/tasks/templates
```

**Query Parameters:**
- `category` (optional): Filter by category
- `type` (optional): Filter by task type

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "template_001",
      "name": "Initial Lead Follow-up",
      "description": "Standard follow-up sequence for new leads",
      "category": "lead_nurturing",
      "type": "call",
      "priority": "high",
      "estimatedDuration": 15,
      "templateData": {
        "title": "Follow up with {{lead.name}}",
        "description": "Initial contact to understand {{lead.name}}'s property needs",
        "tags": ["initial_contact", "lead_nurturing"]
      },
      "usage": {
        "totalUsed": 1250,
        "successRate": 0.89,
        "averageCompletionTime": "12 minutes"
      },
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### Create Task from Template
Create a new task using a template.

```http
POST /api/tasks/from-template
```

**Request Body:**
```json
{
  "templateId": "template_001",
  "leadId": 101,
  "assignedToId": 456,
  "dueDate": "2025-01-16T10:00:00Z",
  "customFields": {
    "urgency": "high",
    "notes": "Lead showed interest in downtown properties"
  }
}
```

---

## 💬 Task Comments & Collaboration

### Add Task Comment
Add a comment to a task.

```http
POST /api/tasks/{taskId}/comments
```

**Request Body:**
```json
{
  "content": "Spoke with Sarah - she's very interested in the downtown condo. She wants to schedule a showing for next week.",
  "isInternal": false,
  "notify": ["lead"],
  "attachments": [
    {
      "filename": "property_details.pdf",
      "url": "https://cdn.example.com/tasks/123/property_details.pdf"
    }
  ]
}
```

### Get Task Comments
Get all comments for a task.

```http
GET /api/tasks/{taskId}/comments
```

**Query Parameters:**
- `include_internal` (optional): Include internal comments (default: true for task assignee/creator)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 234,
      "content": "Spoke with Sarah - she's very interested in the downtown condo...",
      "author": {
        "id": 456,
        "name": "John Smith"
      },
      "isInternal": false,
      "attachments": [
        {
          "id": 345,
          "filename": "property_details.pdf",
          "url": "https://cdn.example.com/tasks/123/property_details.pdf"
        }
      ],
      "createdAt": "2025-01-15T14:30:00Z"
    }
  ]
}
```

---

## 📎 Task Attachments

### Upload Task Attachment
Upload a file attachment to a task.

```http
POST /api/tasks/{taskId}/attachments
```

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: File to upload
- `description` (optional): Description of the attachment

### Get Task Attachments
Get all attachments for a task.

```http
GET /api/tasks/{taskId}/attachments
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 345,
      "filename": "property_details.pdf",
      "originalName": "Downtown Condo Details.pdf",
      "url": "https://cdn.example.com/tasks/123/property_details.pdf",
      "size": 2048576,
      "mimeType": "application/pdf",
      "description": "Detailed property information for Sarah",
      "uploadedBy": {
        "id": 456,
        "name": "John Smith"
      },
      "uploadedAt": "2025-01-15T14:30:00Z"
    }
  ]
}
```

---

## 🔄 Task Automation

### Create Automated Task Rule
Create a rule for automatic task generation.

```http
POST /api/tasks/automation/rules
```

**Request Body:**
```json
{
  "name": "High-Value Lead Follow-up",
  "description": "Automatically create follow-up tasks for high-value leads",
  "trigger": {
    "type": "lead_score_threshold",
    "conditions": {
      "score": { "gte": 80 },
      "budget": { "gte": 500000 }
    }
  },
  "actions": [
    {
      "type": "create_task",
      "templateId": "template_001",
      "delay": 3600,
      "assignTo": "round_robin"
    },
    {
      "type": "send_notification",
      "recipient": "assigned_agent",
      "template": "urgent_lead_alert"
    }
  ],
  "isActive": true
}
```

### List Automation Rules
Get all automated task generation rules.

```http
GET /api/tasks/automation/rules
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "rule_001",
      "name": "High-Value Lead Follow-up",
      "description": "Automatically create follow-up tasks for high-value leads",
      "trigger": {
        "type": "lead_score_threshold",
        "conditions": {
          "score": { "gte": 80 },
          "budget": { "gte": 500000 }
        }
      },
      "actions": [
        {
          "type": "create_task",
          "templateId": "template_001",
          "delay": 3600
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

## 🚨 Error Handling

### Common Error Responses

**Task Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task not found",
    "details": {
      "taskId": 999
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
    "message": "You don't have permission to access this task",
    "details": {
      "requiredPermission": "tasks.read",
      "userRole": "agent"
    }
  }
}
```

**Invalid Task Status Transition:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot transition task to the specified status",
    "details": {
      "currentStatus": "completed",
      "requestedStatus": "in_progress",
      "allowedTransitions": ["cancelled"]
    }
  }
}
```

---

## 📊 Rate Limiting

- **Task Operations**: 200 requests per minute
- **Bulk Operations**: 20 requests per minute
- **File Uploads**: 50 requests per minute
- **Analytics Queries**: 100 requests per minute

---

## 🔍 Best Practices

### Task Creation
1. **Clear Titles**: Use descriptive, actionable task titles
2. **Detailed Descriptions**: Include all necessary context and instructions
3. **Appropriate Priorities**: Set realistic priorities based on business impact
4. **Realistic Due Dates**: Consider task complexity and assignee availability

### Task Management
1. **Regular Updates**: Keep task status and progress current
2. **Detailed Notes**: Document outcomes and learnings
3. **Collaboration**: Use comments for team communication
4. **Time Tracking**: Accurately track actual vs estimated duration

### Automation
1. **Smart Triggers**: Use meaningful conditions for automated task creation
2. **Template Usage**: Leverage templates for consistency
3. **Assignment Logic**: Implement intelligent task assignment
4. **Performance Monitoring**: Track automation effectiveness

This comprehensive Task Management API provides all the tools needed for task creation, assignment, tracking, automation, and performance analytics in the Real Estate CRM system.