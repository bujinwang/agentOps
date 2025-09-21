# 📈 Conversion Tracking API

## Overview

The Conversion Tracking API provides comprehensive analytics and tracking capabilities for lead conversion funnels in the Real Estate CRM system. This API enables detailed analysis of the customer journey from initial contact to final conversion.

## Base URL
```
https://api.realestate-crm.com/v1/conversion
```

## Authentication
All Conversion API endpoints require JWT authentication with analytics access permissions.

---

## 🎯 Conversion Stages

### List Conversion Stages
Get all defined conversion stages in the funnel.

```http
GET /api/conversion/stages
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "stage_1",
      "name": "Lead Created",
      "description": "Initial lead capture",
      "order": 1,
      "isActive": true,
      "entryCriteria": {
        "autoEntry": true,
        "manualEntry": false
      },
      "exitCriteria": {
        "timeLimit": null,
        "actionRequired": false
      },
      "analytics": {
        "averageTime": "0 days",
        "conversionRate": 1.0,
        "dropOffRate": 0.0
      }
    },
    {
      "id": "stage_2",
      "name": "Initial Contact",
      "description": "First communication with lead",
      "order": 2,
      "isActive": true,
      "entryCriteria": {
        "autoEntry": false,
        "manualEntry": true,
        "requiredActions": ["phone_call", "email_sent"]
      },
      "exitCriteria": {
        "timeLimit": 259200,
        "actionRequired": true
      }
    }
  ]
}
```

### Get Stage Details
Get detailed information about a specific conversion stage.

```http
GET /api/conversion/stages/{stageId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "stage_2",
    "name": "Initial Contact",
    "description": "First communication with lead",
    "order": 2,
    "isActive": true,
    "entryCriteria": {
      "autoEntry": false,
      "manualEntry": true,
      "requiredActions": ["phone_call", "email_sent"],
      "conditions": [
        {
          "field": "lead_score",
          "operator": "gte",
          "value": 50
        }
      ]
    },
    "exitCriteria": {
      "timeLimit": 259200,
      "actionRequired": true,
      "successActions": ["meeting_scheduled", "property_tour"],
      "failureConditions": ["no_response_7_days"]
    },
    "automations": [
      {
        "trigger": "stage_entry",
        "action": "send_welcome_email",
        "delay": 0
      },
      {
        "trigger": "stage_exit_timeout",
        "action": "send_followup_email",
        "delay": 86400
      }
    ],
    "analytics": {
      "totalEntries": 1250,
      "currentInStage": 89,
      "averageTime": "2.3 days",
      "conversionRate": 0.756,
      "dropOffRate": 0.244,
      "bottleneckScore": 0.15
    }
  }
}
```

### Create Conversion Stage
Create a new conversion stage.

```http
POST /api/conversion/stages
```

**Request Body:**
```json
{
  "name": "Property Showing",
  "description": "Lead visits property with agent",
  "order": 3,
  "entryCriteria": {
    "autoEntry": false,
    "manualEntry": true,
    "requiredActions": ["meeting_scheduled"],
    "conditions": [
      {
        "field": "stage",
        "operator": "eq",
        "value": "initial_contact"
      }
    ]
  },
  "exitCriteria": {
    "timeLimit": 604800,
    "actionRequired": true,
    "successActions": ["offer_submitted"],
    "failureConditions": ["lead_lost", "timeout"]
  }
}
```

### Update Conversion Stage
Modify an existing conversion stage.

```http
PUT /api/conversion/stages/{stageId}
```

**Request Body:**
```json
{
  "name": "Updated Property Showing",
  "exitCriteria": {
    "timeLimit": 432000,
    "successActions": ["offer_submitted", "contract_signed"]
  }
}
```

---

## 📊 Conversion Funnel Analytics

### Get Conversion Funnel
Get the complete conversion funnel with stage-by-stage analytics.

```http
GET /api/conversion/funnel
```

**Query Parameters:**
- `period` (optional): Time period (7d, 30d, 90d) - default: 30d
- `segment` (optional): Lead segment to analyze
- `includeStages` (optional): Include detailed stage information

**Response:**
```json
{
  "success": true,
  "data": {
    "funnel": {
      "id": "funnel_main",
      "name": "Main Conversion Funnel",
      "period": "30d",
      "stages": [
        {
          "id": "stage_1",
          "name": "Lead Created",
          "order": 1,
          "entries": 1000,
          "exits": 1000,
          "conversionRate": 1.0,
          "averageTime": "0 days",
          "dropOffRate": 0.0,
          "bottleneck": false
        },
        {
          "id": "stage_2",
          "name": "Initial Contact",
          "order": 2,
          "entries": 1000,
          "exits": 750,
          "conversionRate": 0.75,
          "averageTime": "2.3 days",
          "dropOffRate": 0.25,
          "bottleneck": false
        },
        {
          "id": "stage_3",
          "name": "Property Showing",
          "order": 3,
          "entries": 750,
          "exits": 320,
          "conversionRate": 0.427,
          "averageTime": "8.7 days",
          "dropOffRate": 0.573,
          "bottleneck": true,
          "bottleneckReason": "Long delay between contact and showing"
        },
        {
          "id": "stage_4",
          "name": "Offer Submitted",
          "order": 4,
          "entries": 320,
          "exits": 156,
          "conversionRate": 0.488,
          "averageTime": "12.4 days",
          "dropOffRate": 0.512,
          "bottleneck": false
        },
        {
          "id": "stage_5",
          "name": "Closed Deal",
          "order": 5,
          "entries": 156,
          "exits": 78,
          "conversionRate": 0.5,
          "averageTime": "45.2 days",
          "dropOffRate": 0.5,
          "bottleneck": false
        }
      ],
      "summary": {
        "totalLeads": 1000,
        "totalConversions": 78,
        "overallConversionRate": 0.078,
        "averageTimeToConvert": "68.6 days",
        "bottlenecks": ["stage_3"],
        "topDropOffStage": "stage_3"
      }
    },
    "insights": [
      {
        "type": "bottleneck",
        "stage": "stage_3",
        "severity": "high",
        "description": "Property showing stage has 57.3% drop-off rate",
        "recommendation": "Implement automated showing scheduling",
        "potentialImprovement": 0.15,
        "estimatedImpact": "15% increase in conversions"
      },
      {
        "type": "opportunity",
        "stage": "stage_2",
        "severity": "medium",
        "description": "Initial contact conversion rate is strong at 75%",
        "recommendation": "Build on this momentum with immediate follow-up"
      }
    ]
  }
}
```

### Get Stage Performance
Get detailed performance metrics for a specific stage.

```http
GET /api/conversion/stages/{stageId}/performance
```

**Query Parameters:**
- `period` (optional): Time period (7d, 30d, 90d) - default: 30d
- `metrics` (optional): Comma-separated list of metrics

**Response:**
```json
{
  "success": true,
  "data": {
    "stageId": "stage_3",
    "stageName": "Property Showing",
    "period": "30d",
    "metrics": {
      "entries": 750,
      "exits": 320,
      "conversionRate": 0.427,
      "dropOffRate": 0.573,
      "averageTime": "8.7 days",
      "medianTime": "6.2 days",
      "timeDistribution": {
        "0-1_days": 0.15,
        "1-3_days": 0.25,
        "3-7_days": 0.35,
        "7-14_days": 0.20,
        "14+_days": 0.05
      }
    },
    "trends": {
      "conversionTrend": [
        { "date": "2025-01-08", "rate": 0.42 },
        { "date": "2025-01-09", "rate": 0.43 },
        { "date": "2025-01-10", "rate": 0.427 }
      ],
      "timeTrend": [
        { "date": "2025-01-08", "avgTime": "8.1 days" },
        { "date": "2025-01-09", "avgTime": "8.5 days" },
        { "date": "2025-01-10", "avgTime": "8.7 days" }
      ]
    },
    "segmentation": {
      "byLeadSource": {
        "website": { "conversionRate": 0.45, "count": 320 },
        "referral": { "conversionRate": 0.52, "count": 180 },
        "social_media": { "conversionRate": 0.38, "count": 250 }
      },
      "byLeadScore": {
        "high": { "conversionRate": 0.58, "count": 150 },
        "medium": { "conversionRate": 0.42, "count": 400 },
        "low": { "conversionRate": 0.31, "count": 200 }
      }
    }
  }
}
```

---

## 👥 Lead Stage Management

### Update Lead Stage
Move a lead to a different conversion stage.

```http
PUT /api/conversion/leads/{leadId}/stage
```

**Request Body:**
```json
{
  "stageId": "stage_3",
  "reason": "Lead scheduled property showing",
  "notes": "Showing scheduled for tomorrow at 2 PM",
  "metadata": {
    "scheduledBy": "john.smith",
    "propertyId": "prop_123",
    "showingType": "in_person"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leadId": 123,
    "previousStage": "stage_2",
    "newStage": "stage_3",
    "transitionTime": "2025-01-15T14:30:00Z",
    "automationsTriggered": [
      {
        "type": "email",
        "template": "showing_reminder",
        "scheduled": "2025-01-16T13:00:00Z"
      },
      {
        "type": "task",
        "title": "Prepare property materials",
        "assignee": "john.smith",
        "dueDate": "2025-01-16T12:00:00Z"
      }
    ],
    "stageHistory": [
      {
        "stageId": "stage_1",
        "enteredAt": "2025-01-10T09:00:00Z",
        "exitedAt": "2025-01-12T11:30:00Z",
        "duration": "2 days 2 hours"
      },
      {
        "stageId": "stage_2",
        "enteredAt": "2025-01-12T11:30:00Z",
        "exitedAt": "2025-01-15T14:30:00Z",
        "duration": "3 days 3 hours"
      },
      {
        "stageId": "stage_3",
        "enteredAt": "2025-01-15T14:30:00Z",
        "duration": "0 days"
      }
    ]
  }
}
```

### Get Lead Conversion History
Get the complete conversion history for a specific lead.

```http
GET /api/conversion/leads/{leadId}/history
```

**Query Parameters:**
- `includeEvents` (optional): Include detailed events - default: true
- `includeMetrics` (optional): Include performance metrics - default: false

**Response:**
```json
{
  "success": true,
  "data": {
    "leadId": 123,
    "leadName": "Sarah Johnson",
    "currentStage": "stage_3",
    "stageHistory": [
      {
        "stageId": "stage_1",
        "stageName": "Lead Created",
        "enteredAt": "2025-01-10T09:00:00Z",
        "exitedAt": "2025-01-12T11:30:00Z",
        "duration": "2 days 2 hours",
        "exitReason": "moved_to_initial_contact",
        "performance": {
          "timeInStage": "2 days 2 hours",
          "stageSLA": "3 days",
          "metSLA": true
        }
      },
      {
        "stageId": "stage_2",
        "stageName": "Initial Contact",
        "enteredAt": "2025-01-12T11:30:00Z",
        "exitedAt": "2025-01-15T14:30:00Z",
        "duration": "3 days 3 hours",
        "exitReason": "moved_to_property_showing",
        "events": [
          {
            "type": "email_sent",
            "timestamp": "2025-01-12T12:00:00Z",
            "details": { "template": "welcome_email" }
          },
          {
            "type": "phone_call",
            "timestamp": "2025-01-13T10:30:00Z",
            "details": { "duration": 15, "outcome": "positive" }
          }
        ]
      }
    ],
    "conversionMetrics": {
      "timeToConvert": "5 days 5 hours",
      "stagesCompleted": 2,
      "totalStages": 5,
      "progressPercentage": 40,
      "predictedCompletion": "2025-02-05T00:00:00Z",
      "conversionProbability": 0.78
    },
    "insights": [
      {
        "type": "positive",
        "message": "Lead progressing faster than average",
        "metric": "time_in_stage",
        "value": "3.1 days vs 4.2 days average"
      },
      {
        "type": "opportunity",
        "message": "High conversion probability detected",
        "metric": "ml_score",
        "value": 89.5
      }
    ]
  }
}
```

---

## 📊 Conversion Metrics

### Get Conversion Metrics
Get comprehensive conversion metrics and KPIs.

```http
GET /api/conversion/metrics
```

**Query Parameters:**
- `period` (optional): Time period (7d, 30d, 90d) - default: 30d
- `groupBy` (optional): Group results by (day, week, month) - default: day

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalLeads": 1250,
      "convertedLeads": 98,
      "conversionRate": 0.078,
      "averageConversionTime": "45.2 days",
      "medianConversionTime": "38.7 days",
      "conversionVelocity": 2.2
    },
    "stageMetrics": {
      "stage_1": {
        "entries": 1250,
        "exits": 1250,
        "conversionRate": 1.0,
        "averageTime": "0 days"
      },
      "stage_2": {
        "entries": 1250,
        "exits": 938,
        "conversionRate": 0.75,
        "averageTime": "2.3 days"
      },
      "stage_3": {
        "entries": 938,
        "exits": 402,
        "conversionRate": 0.429,
        "averageTime": "8.7 days"
      },
      "stage_4": {
        "entries": 402,
        "exits": 196,
        "conversionRate": 0.488,
        "averageTime": "12.4 days"
      },
      "stage_5": {
        "entries": 196,
        "exits": 98,
        "conversionRate": 0.5,
        "averageTime": "45.2 days"
      }
    },
    "trends": {
      "conversionRateTrend": [
        { "date": "2025-01-08", "rate": 0.072 },
        { "date": "2025-01-09", "rate": 0.075 },
        { "date": "2025-01-10", "rate": 0.078 }
      ],
      "conversionTimeTrend": [
        { "date": "2025-01-08", "avgTime": "46.1 days" },
        { "date": "2025-01-09", "avgTime": "45.8 days" },
        { "date": "2025-01-10", "avgTime": "45.2 days" }
      ]
    },
    "segmentation": {
      "bySource": {
        "website": { "conversionRate": 0.095, "count": 420 },
        "referral": { "conversionRate": 0.112, "count": 280 },
        "social_media": { "conversionRate": 0.067, "count": 300 },
        "direct": { "conversionRate": 0.089, "count": 250 }
      },
      "byBudget": {
        "under_500k": { "conversionRate": 0.082, "count": 600 },
        "500k_1m": { "conversionRate": 0.091, "count": 300 },
        "over_1m": { "conversionRate": 0.105, "count": 100 }
      },
      "byLeadScore": {
        "excellent": { "conversionRate": 0.156, "count": 125 },
        "good": { "conversionRate": 0.089, "count": 375 },
        "moderate": { "conversionRate": 0.056, "count": 500 },
        "low": { "conversionRate": 0.023, "count": 250 }
      }
    }
  }
}
```

### Update Conversion Metrics
Update or recalculate conversion metrics (admin only).

```http
POST /api/conversion/metrics/update
```

**Request Body:**
```json
{
  "recalculateFrom": "2025-01-01T00:00:00Z",
  "includeHistorical": true,
  "updateCache": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "metrics_update_12345",
    "status": "processing",
    "estimatedCompletion": "2025-01-15T10:35:00Z",
    "affectedRecords": 1250,
    "metricsUpdated": [
      "conversion_rates",
      "stage_performance",
      "time_to_convert",
      "funnel_analytics"
    ]
  }
}
```

---

## 🎯 Lead Conversion Probabilities

### Update Lead Conversion Probability
Update the conversion probability for a lead.

```http
PUT /api/conversion/leads/{leadId}/probability
```

**Request Body:**
```json
{
  "probability": 0.78,
  "confidence": 0.89,
  "factors": [
    "High lead score (89.5)",
    "Recent engagement increase",
    "Budget matches market demand",
    "Timeline indicates motivated buyer"
  ],
  "modelVersion": "v2.1.0",
  "lastCalculated": "2025-01-15T10:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leadId": 123,
    "previousProbability": 0.65,
    "newProbability": 0.78,
    "change": 0.13,
    "changeType": "increased",
    "factors": [
      "High lead score (89.5)",
      "Recent engagement increase",
      "Budget matches market demand",
      "Timeline indicates motivated buyer"
    ],
    "automationsTriggered": [
      {
        "type": "workflow",
        "template": "high_probability_nurture",
        "triggeredAt": "2025-01-15T10:30:05Z"
      },
      {
        "type": "notification",
        "recipient": "john.smith",
        "message": "Lead Sarah Johnson conversion probability increased to 78%"
      }
    ]
  }
}
```

### Get Conversion Probability History
Get the historical conversion probability data for a lead.

```http
GET /api/conversion/leads/{leadId}/probability/history
```

**Query Parameters:**
- `period` (optional): Time period to retrieve - default: 90d
- `includeFactors` (optional): Include factor details - default: false

**Response:**
```json
{
  "success": true,
  "data": {
    "leadId": 123,
    "currentProbability": 0.78,
    "history": [
      {
        "date": "2025-01-08",
        "probability": 0.45,
        "confidence": 0.82,
        "factors": ["Initial lead score", "Budget provided"]
      },
      {
        "date": "2025-01-10",
        "probability": 0.52,
        "confidence": 0.85,
        "factors": ["Email engagement", "Phone call completed"]
      },
      {
        "date": "2025-01-12",
        "probability": 0.65,
        "confidence": 0.87,
        "factors": ["Property preferences clarified", "Timeline confirmed"]
      },
      {
        "date": "2025-01-15",
        "probability": 0.78,
        "confidence": 0.89,
        "factors": ["High lead score", "Recent engagement", "Budget matches market"]
      }
    ],
    "trends": {
      "overallTrend": "increasing",
      "averageChange": 0.015,
      "volatility": 0.08,
      "prediction": {
        "nextWeek": 0.82,
        "nextMonth": 0.85,
        "confidence": 0.76
      }
    }
  }
}
```

---

## 📋 Leads by Stage

### Get Leads by Stage
Get all leads currently in a specific conversion stage.

```http
GET /api/conversion/leads
```

**Query Parameters:**
- `stage` (optional): Filter by stage ID
- `status` (optional): Filter by lead status (active, inactive, converted, lost)
- `limit` (optional): Number of leads to return - default: 50
- `sort` (optional): Sort field (probability, score, last_activity) - default: probability

**Response:**
```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "id": 123,
        "name": "Sarah Johnson",
        "email": "sarah@example.com",
        "stage": "stage_3",
        "stageName": "Property Showing",
        "probability": 0.78,
        "score": 89.5,
        "enteredStageAt": "2025-01-15T14:30:00Z",
        "timeInStage": "2 days 8 hours",
        "lastActivity": "2025-01-16T10:15:00Z",
        "nextAction": {
          "type": "meeting",
          "scheduled": "2025-01-18T14:00:00Z",
          "description": "Property showing at 123 Main St"
        },
        "insights": [
          "High conversion probability",
          "Recent engagement increase",
          "Budget matches premium properties"
        ]
      }
    ],
    "summary": {
      "totalLeads": 89,
      "stage": "stage_3",
      "averageProbability": 0.72,
      "averageTimeInStage": "6.3 days",
      "urgentCount": 12
    },
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 89,
      "totalPages": 2,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 📈 Conversion Analytics

### Get Conversion Velocity
Analyze conversion velocity and time-to-convert metrics.

```http
GET /api/conversion/velocity
```

**Query Parameters:**
- `period` (optional): Time period (30d, 90d, 1y) - default: 90d
- `segment` (optional): Lead segment to analyze

**Response:**
```json
{
  "success": true,
  "data": {
    "velocity": {
      "averageTimeToConvert": "45.2 days",
      "medianTimeToConvert": "38.7 days",
      "fastestConversion": "8.5 days",
      "slowestConversion": "156.2 days",
      "conversionVelocity": 2.2
    },
    "distribution": {
      "0-30_days": 0.35,
      "31-60_days": 0.42,
      "61-90_days": 0.18,
      "91+_days": 0.05
    },
    "trends": {
      "velocityTrend": [
        { "month": "2024-10", "avgTime": "52.1 days" },
        { "month": "2024-11", "avgTime": "48.3 days" },
        { "month": "2024-12", "avgTime": "45.2 days" }
      ]
    },
    "insights": [
      {
        "type": "improvement",
        "metric": "velocity",
        "value": "12.8% improvement",
        "period": "last_3_months",
        "drivers": ["Faster initial contact", "Improved showing scheduling"]
      },
      {
        "type": "opportunity",
        "segment": "high_value_leads",
        "finding": "Converting 25% faster than average",
        "recommendation": "Apply high-value strategies to all segments"
      }
    ]
  }
}
```

---

## 🚨 Error Handling

### Common Error Responses

**Stage Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "STAGE_NOT_FOUND",
    "message": "Conversion stage not found",
    "details": {
      "stageId": "stage_999"
    }
  }
}
```

**Invalid Stage Transition:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STAGE_TRANSITION",
    "message": "Cannot transition to specified stage",
    "details": {
      "leadId": 123,
      "currentStage": "stage_2",
      "requestedStage": "stage_5",
      "reason": "Must complete intermediate stages first"
    }
  }
}
```

**Lead Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "LEAD_NOT_FOUND",
    "message": "Lead not found in conversion system",
    "details": {
      "leadId": 999
    }
  }
}
```

---

## 📊 Rate Limiting

- **Funnel Analytics**: 50 requests per minute
- **Stage Management**: 100 requests per minute
- **Lead Operations**: 200 requests per minute
- **Metrics Updates**: 20 requests per minute

---

## 🔍 Best Practices

### Stage Management
1. **Clear Criteria**: Define explicit entry/exit criteria for each stage
2. **Automation**: Use automations to move leads between stages
3. **Validation**: Validate stage transitions to maintain data integrity
4. **Monitoring**: Monitor stage performance and bottleneck identification

### Analytics & Reporting
1. **Real-time Updates**: Keep conversion metrics updated in real-time
2. **Historical Tracking**: Maintain complete conversion history
3. **Segmentation**: Analyze conversion by multiple dimensions
4. **Predictive Insights**: Use ML to predict conversion probabilities

### Performance Optimization
1. **Caching**: Cache frequently accessed conversion metrics
2. **Async Processing**: Process complex analytics asynchronously
3. **Database Indexing**: Optimize queries for conversion analytics
4. **Batch Updates**: Use batch operations for bulk updates

This comprehensive Conversion Tracking API provides all the tools needed to analyze, track, and optimize the lead conversion process in the Real Estate CRM system.