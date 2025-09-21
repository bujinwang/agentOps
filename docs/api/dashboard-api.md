# 📊 Dashboard & Real-Time Analytics API

## Overview

The Dashboard API provides real-time analytics, insights, and visualization data for the Real Estate CRM system. This API powers the predictive lead insights dashboard with live updates and comprehensive analytics.

## Base URL
```
https://api.realestate-crm.com/v1/dashboard
```

## Authentication
All Dashboard API endpoints require JWT authentication with dashboard access permissions.

---

## 📈 Lead Insights Dashboard

### Get Lead Insights Overview
Get comprehensive lead insights with ML-powered analytics.

```http
GET /api/dashboard/leads/insights
```

**Query Parameters:**
- `period` (optional): Time period (1h, 24h, 7d, 30d) - default: 24h
- `filter` (optional): Filter criteria (high_value, urgent, new, etc.)
- `limit` (optional): Number of insights to return - default: 50
- `sort` (optional): Sort field (score, created_at, priority) - default: score

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalLeads": 1250,
      "highValueLeads": 85,
      "urgentLeads": 42,
      "conversionRate": 0.156,
      "averageScore": 72.3
    },
    "insights": [
      {
        "leadId": 123,
        "name": "Sarah Johnson",
        "email": "sarah.j@example.com",
        "currentScore": 89.5,
        "conversionProbability": 0.78,
        "priority": "urgent",
        "insights": [
          "High budget matches premium properties",
          "Timeline indicates motivated buyer",
          "Previous engagement shows strong interest"
        ],
        "recommendations": [
          {
            "type": "contact",
            "action": "Schedule property showing within 24 hours",
            "priority": "high",
            "reason": "Lead shows high conversion probability"
          },
          {
            "type": "pricing",
            "action": "Focus on properties in $800K-$1.2M range",
            "priority": "medium",
            "reason": "Budget analysis shows optimal price range"
          }
        ],
        "trends": {
          "scoreChange": 5.2,
          "engagementIncrease": 15.8,
          "lastActivity": "2025-01-15T14:30:00Z"
        }
      }
    ],
    "filters": {
      "applied": ["high_value"],
      "available": ["high_value", "urgent", "new", "engaged", "cold"]
    },
    "lastUpdated": "2025-01-15T15:45:00Z"
  }
}
```

### Get Lead Scoring Trends
Get historical scoring trends and analytics.

```http
GET /api/dashboard/leads/scoring-trends
```

**Query Parameters:**
- `period` (optional): Time period (7d, 30d, 90d) - default: 30d
- `groupBy` (optional): Grouping (day, week, month) - default: day
- `leadIds` (optional): Comma-separated list of lead IDs to analyze

**Response:**
```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "date": "2025-01-15",
        "averageScore": 74.2,
        "highValueCount": 12,
        "scoreDistribution": {
          "excellent": 8,
          "good": 15,
          "moderate": 22,
          "low": 5
        },
        "topImprovers": [
          {
            "leadId": 123,
            "name": "Sarah Johnson",
            "scoreIncrease": 12.5,
            "reason": "Increased engagement and budget clarification"
          }
        ]
      }
    ],
    "insights": {
      "overallTrend": "improving",
      "averageImprovement": 3.2,
      "bestPerformingSegment": "first_time_buyers",
      "concerningTrends": [
        {
          "segment": "investor_leads",
          "issue": "Declining engagement",
          "recommendation": "Target with investment-focused content"
        }
      ]
    }
  }
}
```

### Get Conversion Funnel Analytics
Get detailed conversion funnel analysis with bottleneck identification.

```http
GET /api/dashboard/conversion/funnel
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
      "stages": [
        {
          "name": "Lead Created",
          "count": 1000,
          "percentage": 100.0,
          "conversionRate": 1.0,
          "averageTime": "0 days"
        },
        {
          "name": "Initial Contact",
          "count": 750,
          "percentage": 75.0,
          "conversionRate": 0.75,
          "averageTime": "2.3 days",
          "bottleneck": false
        },
        {
          "name": "Property Showing",
          "count": 320,
          "percentage": 32.0,
          "conversionRate": 0.427,
          "averageTime": "8.7 days",
          "bottleneck": true,
          "bottleneckReason": "Long delay between contact and showing"
        },
        {
          "name": "Offer Submitted",
          "count": 156,
          "percentage": 15.6,
          "conversionRate": 0.488,
          "averageTime": "12.4 days"
        },
        {
          "name": "Closed Deal",
          "count": 78,
          "percentage": 7.8,
          "conversionRate": 0.5,
          "averageTime": "45.2 days"
        }
      ],
      "overallConversionRate": 0.078,
      "averageTimeToConversion": "68.6 days"
    },
    "insights": [
      {
        "type": "bottleneck",
        "stage": "Property Showing",
        "impact": "high",
        "recommendation": "Implement automated showing scheduling",
        "potentialImprovement": 0.15
      },
      {
        "type": "opportunity",
        "stage": "Initial Contact",
        "impact": "medium",
        "recommendation": "Improve initial response time",
        "potentialImprovement": 0.08
      }
    ],
    "segmentation": {
      "bySource": {
        "website": { "conversionRate": 0.095, "count": 420 },
        "referral": { "conversionRate": 0.112, "count": 280 },
        "social_media": { "conversionRate": 0.067, "count": 300 }
      },
      "byBudget": {
        "under_500k": { "conversionRate": 0.082, "count": 600 },
        "500k_1m": { "conversionRate": 0.091, "count": 300 },
        "over_1m": { "conversionRate": 0.105, "count": 100 }
      }
    }
  }
}
```

---

## 📊 Performance Metrics Dashboard

### Get Performance Overview
Get comprehensive performance metrics and KPIs.

```http
GET /api/dashboard/performance/overview
```

**Query Parameters:**
- `period` (optional): Time period (1h, 24h, 7d, 30d) - default: 24h
- `metrics` (optional): Comma-separated list of metrics to include

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalLeads": 1250,
      "activeLeads": 890,
      "convertedLeads": 98,
      "conversionRate": 0.078,
      "averageLeadScore": 72.3,
      "responseTime": "2.3 hours"
    },
    "metrics": {
      "leadGeneration": {
        "daily": 42,
        "weekly": 294,
        "monthly": 1250,
        "growth": 0.156
      },
      "leadQuality": {
        "averageScore": 72.3,
        "highValuePercentage": 6.8,
        "qualifiedPercentage": 45.2
      },
      "conversionMetrics": {
        "overallRate": 0.078,
        "bySource": {
          "website": 0.095,
          "referral": 0.112,
          "social_media": 0.067
        },
        "byAgent": {
          "agent_1": 0.089,
          "agent_2": 0.076,
          "agent_3": 0.092
        }
      },
      "engagementMetrics": {
        "emailOpenRate": 0.423,
        "responseRate": 0.156,
        "meetingBookedRate": 0.089
      }
    },
    "trends": {
      "conversionTrend": [
        { "date": "2025-01-08", "rate": 0.072 },
        { "date": "2025-01-09", "rate": 0.075 },
        { "date": "2025-01-10", "rate": 0.078 }
      ],
      "leadQualityTrend": [
        { "date": "2025-01-08", "score": 71.2 },
        { "date": "2025-01-09", "score": 72.1 },
        { "date": "2025-01-10", "score": 72.3 }
      ]
    },
    "alerts": [
      {
        "type": "performance",
        "severity": "warning",
        "message": "Response time increased by 15%",
        "metric": "responseTime",
        "threshold": "3 hours",
        "current": "2.3 hours"
      }
    ]
  }
}
```

### Get Agent Performance Analytics
Get detailed performance analytics for individual agents.

```http
GET /api/dashboard/performance/agents
```

**Query Parameters:**
- `period` (optional): Time period (7d, 30d, 90d) - default: 30d
- `agentIds` (optional): Comma-separated list of agent IDs
- `metrics` (optional): Specific metrics to include

**Response:**
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "agentId": "agent_1",
        "name": "John Smith",
        "metrics": {
          "leadsAssigned": 145,
          "leadsConverted": 13,
          "conversionRate": 0.089,
          "averageResponseTime": "1.8 hours",
          "averageLeadScore": 74.2,
          "revenueGenerated": 4250000
        },
        "performance": {
          "rank": 1,
          "percentile": 95,
          "trends": {
            "conversionTrend": "improving",
            "responseTimeTrend": "stable",
            "leadQualityTrend": "improving"
          }
        },
        "insights": [
          "Top performer in conversion rate",
          "Excellent response time",
          "Strong lead quality management"
        ]
      }
    ],
    "leaderboard": {
      "byConversionRate": ["agent_1", "agent_3", "agent_2"],
      "byRevenue": ["agent_1", "agent_2", "agent_3"],
      "byResponseTime": ["agent_3", "agent_1", "agent_2"]
    },
    "benchmarks": {
      "averageConversionRate": 0.082,
      "averageResponseTime": "2.4 hours",
      "topPerformerConversionRate": 0.089
    }
  }
}
```

---

## 🎯 ML Model Performance Dashboard

### Get ML Model Performance
Get real-time ML model performance metrics and insights.

```http
GET /api/dashboard/ml/performance
```

**Query Parameters:**
- `period` (optional): Time period (1h, 24h, 7d, 30d) - default: 24h
- `models` (optional): Comma-separated list of model IDs

**Response:**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "modelId": "lead-scoring-v2.1",
        "name": "Lead Scoring Model",
        "status": "active",
        "performance": {
          "accuracy": 0.945,
          "precision": 0.92,
          "recall": 0.89,
          "f1Score": 0.905,
          "auc": 0.958
        },
        "usage": {
          "predictionsLast24h": 1250,
          "averageLatency": 45,
          "errorRate": 0.002,
          "throughput": 25.5
        },
        "health": {
          "driftScore": 0.023,
          "dataQuality": 0.987,
          "lastRetrained": "2025-01-14T06:00:00Z"
        }
      }
    ],
    "systemHealth": {
      "overallAccuracy": 0.942,
      "averageLatency": 42,
      "totalPredictions": 125000,
      "activeModels": 3,
      "alerts": [
        {
          "type": "drift",
          "severity": "warning",
          "model": "lead-scoring-v2.1",
          "message": "Data drift detected in budget feature",
          "recommendation": "Schedule model retraining"
        }
      ]
    },
    "trends": {
      "accuracyTrend": [
        { "date": "2025-01-08", "accuracy": 0.938 },
        { "date": "2025-01-09", "accuracy": 0.941 },
        { "date": "2025-01-10", "accuracy": 0.942 }
      ],
      "latencyTrend": [
        { "date": "2025-01-08", "latency": 48 },
        { "date": "2025-01-09", "latency": 45 },
        { "date": "2025-01-10", "latency": 42 }
      ]
    }
  }
}
```

### Get ML Insights & Recommendations
Get AI-powered insights and actionable recommendations.

```http
GET /api/dashboard/ml/insights
```

**Query Parameters:**
- `category` (optional): Insight category (leads, market, performance)
- `limit` (optional): Number of insights to return - default: 20

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "id": "insight_001",
        "category": "leads",
        "type": "opportunity",
        "title": "High-Value Lead Cluster Identified",
        "description": "AI detected 15 leads with similar high-value characteristics",
        "impact": "high",
        "confidence": 0.89,
        "data": {
          "leadCount": 15,
          "averageBudget": 950000,
          "commonTraits": ["urgent_timeline", "premium_location", "large_family"]
        },
        "recommendations": [
          {
            "action": "Create targeted marketing campaign",
            "priority": "high",
            "expectedImpact": "25% conversion increase",
            "timeline": "1 week"
          },
          {
            "action": "Assign dedicated agent",
            "priority": "medium",
            "expectedImpact": "15% response improvement"
          }
        ]
      },
      {
        "id": "insight_002",
        "category": "market",
        "type": "trend",
        "title": "Market Price Growth Accelerating",
        "description": "AI analysis shows 8.5% YoY price growth in target segments",
        "impact": "medium",
        "confidence": 0.92,
        "data": {
          "growthRate": 0.085,
          "segments": ["single_family", "condo", "townhouse"],
          "timeframe": "12 months"
        },
        "recommendations": [
          {
            "action": "Adjust pricing strategy",
            "priority": "high",
            "expectedImpact": "12% revenue increase"
          }
        ]
      }
    ],
    "summary": {
      "totalInsights": 24,
      "highImpact": 8,
      "mediumImpact": 12,
      "lowImpact": 4,
      "categories": {
        "leads": 12,
        "market": 6,
        "performance": 4,
        "operational": 2
      }
    }
  }
}
```

---

## 🔄 Real-Time Updates

### Subscribe to Dashboard Updates
Establish WebSocket connection for real-time dashboard updates.

```javascript
// Client-side WebSocket connection
const socket = io('https://api.realestate-crm.com', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Subscribe to lead insights updates
socket.on('lead-insights-update', (data) => {
  console.log('Lead insights updated:', data);
  // Update dashboard with new data
});

// Subscribe to performance metrics updates
socket.on('performance-update', (data) => {
  console.log('Performance metrics updated:', data);
  // Update performance dashboard
});

// Subscribe to ML insights updates
socket.on('ml-insights-update', (data) => {
  console.log('ML insights updated:', data);
  // Update insights panel
});
```

### Get Real-Time Update Status
Check the status of real-time update systems.

```http
GET /api/dashboard/realtime/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "websocket": {
      "status": "healthy",
      "connections": 1250,
      "messageRate": 45.2,
      "uptime": "99.9%"
    },
    "cache": {
      "status": "healthy",
      "hitRate": 0.945,
      "size": 250000,
      "evictions": 1250
    },
    "processing": {
      "status": "healthy",
      "queueDepth": 12,
      "processingRate": 89.5,
      "averageLatency": 45
    }
  }
}
```

---

## 📋 Workflow Dashboard

### Get Active Workflows Overview
Get overview of all active automated workflows.

```http
GET /api/dashboard/workflows/active
```

**Query Parameters:**
- `status` (optional): Filter by status (active, paused, completed)
- `type` (optional): Filter by workflow type
- `limit` (optional): Number of workflows to return

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalActive": 45,
      "completedToday": 23,
      "failedToday": 2,
      "averageCompletionTime": "4.2 hours"
    },
    "workflows": [
      {
        "id": "workflow_001",
        "name": "High-Value Lead Follow-up",
        "type": "follow_up",
        "status": "active",
        "leadId": 123,
        "leadName": "Sarah Johnson",
        "currentStep": 3,
        "totalSteps": 5,
        "startedAt": "2025-01-15T09:00:00Z",
        "estimatedCompletion": "2025-01-15T13:00:00Z",
        "progress": 0.6,
        "nextAction": {
          "type": "email",
          "scheduled": "2025-01-15T11:00:00Z",
          "description": "Send property recommendations"
        }
      }
    ],
    "performance": {
      "successRate": 0.956,
      "averageProcessingTime": "4.2 hours",
      "bottlenecks": [
        {
          "step": "property_search",
          "averageTime": "45 minutes",
          "issue": "External API latency"
        }
      ]
    }
  }
}
```

### Get Workflow Performance Analytics
Get detailed analytics on workflow performance and effectiveness.

```http
GET /api/dashboard/workflows/performance
```

**Query Parameters:**
- `period` (optional): Time period (7d, 30d, 90d) - default: 30d
- `workflowTypes` (optional): Comma-separated list of workflow types

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "totalExecuted": 1250,
      "successRate": 0.956,
      "averageCompletionTime": "4.2 hours",
      "costSavings": 45000
    },
    "byType": {
      "follow_up": {
        "executed": 450,
        "successRate": 0.942,
        "averageTime": "3.8 hours",
        "conversionImpact": 0.156
      },
      "enrichment": {
        "executed": 380,
        "successRate": 0.968,
        "averageTime": "2.1 hours",
        "dataQualityImprovement": 0.234
      },
      "notification": {
        "executed": 420,
        "successRate": 0.952,
        "averageTime": "1.2 hours",
        "responseRateImprovement": 0.189
      }
    },
    "efficiency": {
      "timeSaved": "1250 hours",
      "costSavings": 45000,
      "errorReduction": 0.023,
      "productivityIncrease": 0.312
    },
    "insights": [
      {
        "type": "optimization",
        "title": "Follow-up Workflow Bottleneck",
        "description": "Property search step taking 45+ minutes",
        "recommendation": "Implement caching for property searches",
        "potentialImprovement": "35% faster execution"
      }
    ]
  }
}
```

---

## 📊 Custom Dashboard Configuration

### Create Custom Dashboard
Create a personalized dashboard configuration.

```http
POST /api/dashboard/custom
```

**Request Body:**
```json
{
  "name": "My Lead Dashboard",
  "description": "Personalized dashboard for lead management",
  "widgets": [
    {
      "type": "lead_insights",
      "position": { "x": 0, "y": 0, "width": 6, "height": 4 },
      "config": {
        "filter": "high_value",
        "limit": 20,
        "sort": "score"
      }
    },
    {
      "type": "conversion_funnel",
      "position": { "x": 6, "y": 0, "width": 6, "height": 4 },
      "config": {
        "period": "30d",
        "includeStages": true
      }
    },
    {
      "type": "performance_metrics",
      "position": { "x": 0, "y": 4, "width": 12, "height": 3 },
      "config": {
        "metrics": ["conversion_rate", "response_time", "lead_quality"]
      }
    }
  ],
  "refreshInterval": 300,
  "isPublic": false
}
```

### Get Custom Dashboards
Retrieve user's custom dashboard configurations.

```http
GET /api/dashboard/custom
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "dashboard_001",
      "name": "My Lead Dashboard",
      "description": "Personalized dashboard for lead management",
      "widgets": [...],
      "lastModified": "2025-01-15T10:30:00Z",
      "isActive": true,
      "usage": {
        "views": 145,
        "lastViewed": "2025-01-15T15:45:00Z"
      }
    }
  ]
}
```

### Update Custom Dashboard
Modify an existing custom dashboard configuration.

```http
PUT /api/dashboard/custom/{dashboardId}
```

**Request Body:**
```json
{
  "widgets": [
    {
      "type": "ml_insights",
      "position": { "x": 0, "y": 7, "width": 12, "height": 3 },
      "config": {
        "category": "leads",
        "limit": 10
      }
    }
  ],
  "refreshInterval": 180
}
```

---

## 📈 Export & Reporting

### Export Dashboard Data
Export dashboard data in various formats.

```http
POST /api/dashboard/export
```

**Request Body:**
```json
{
  "type": "lead_insights",
  "format": "csv",
  "filters": {
    "period": "30d",
    "score": { "gte": 70 }
  },
  "fields": ["name", "email", "score", "conversion_probability", "last_activity"],
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "exportId": "export_12345",
    "status": "processing",
    "estimatedCompletion": "2025-01-15T10:32:00Z",
    "downloadUrl": "https://api.realestate-crm.com/v1/dashboard/export/12345/download"
  }
}
```

### Get Export Status
Check the status of a data export job.

```http
GET /api/dashboard/export/{exportId}/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "exportId": "export_12345",
    "status": "completed",
    "fileSize": "2.3MB",
    "recordCount": 1250,
    "downloadUrl": "https://api.realestate-crm.com/v1/dashboard/export/12345/download",
    "expiresAt": "2025-01-16T10:30:00Z"
  }
}
```

---

## ⚙️ Dashboard Settings

### Get Dashboard Preferences
Retrieve user's dashboard preferences and settings.

```http
GET /api/dashboard/preferences
```

**Response:**
```json
{
  "success": true,
  "data": {
    "theme": "auto",
    "refreshInterval": 300,
    "defaultPeriod": "30d",
    "notifications": {
      "email": true,
      "push": false,
      "insights": true,
      "alerts": true
    },
    "widgets": {
      "visible": ["lead_insights", "conversion_funnel", "performance_metrics"],
      "order": ["performance_metrics", "lead_insights", "conversion_funnel"]
    },
    "filters": {
      "default": "high_value",
      "saved": ["urgent", "new_leads", "premium_budget"]
    }
  }
}
```

### Update Dashboard Preferences
Modify dashboard preferences and settings.

```http
PUT /api/dashboard/preferences
```

**Request Body:**
```json
{
  "theme": "dark",
  "refreshInterval": 180,
  "notifications": {
    "push": true,
    "insights": false
  },
  "widgets": {
    "visible": ["lead_insights", "ml_performance", "conversion_funnel"],
    "order": ["lead_insights", "conversion_funnel", "ml_performance"]
  }
}
```

---

## 🚨 Error Handling

### Common Error Responses

**Dashboard Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "DASHBOARD_NOT_FOUND",
    "message": "Custom dashboard not found",
    "details": {
      "dashboardId": "dashboard_999"
    }
  }
}
```

**Real-Time Connection Failed:**
```json
{
  "success": false,
  "error": {
    "code": "REALTIME_CONNECTION_FAILED",
    "message": "Failed to establish real-time connection",
    "details": {
      "reason": "WebSocket connection timeout",
      "retryAfter": 30
    }
  }
}
```

**Export Limit Exceeded:**
```json
{
  "success": false,
  "error": {
    "code": "EXPORT_LIMIT_EXCEEDED",
    "message": "Export request exceeds size limit",
    "details": {
      "maxRecords": 10000,
      "requestedRecords": 15000,
      "suggestion": "Use filters to reduce export size"
    }
  }
}
```

---

## 📊 Rate Limiting

- **Dashboard Data**: 200 requests per minute
- **Real-Time Updates**: 500 requests per minute
- **Export Requests**: 10 requests per hour
- **Custom Dashboards**: 100 requests per minute

---

## 🔍 Best Practices

### Performance Optimization
1. **Caching Strategy**: Dashboard data is cached for 5 minutes to improve performance
2. **Incremental Updates**: Use WebSocket for real-time updates instead of polling
3. **Pagination**: Large datasets are paginated to maintain responsiveness
4. **Filtering**: Apply filters to reduce data transfer and processing

### Real-Time Updates
1. **Connection Management**: Implement automatic reconnection for WebSocket failures
2. **Message Batching**: Group multiple updates to reduce network overhead
3. **Selective Updates**: Subscribe only to relevant data streams
4. **Offline Handling**: Gracefully handle network disconnections

### Data Export
1. **Asynchronous Processing**: Large exports are processed asynchronously
2. **Format Selection**: Choose appropriate format (CSV, JSON, PDF) for use case
3. **Compression**: Large exports are compressed to reduce download time
4. **Expiration**: Export links expire after 24 hours for security

This comprehensive Dashboard API provides all the tools needed to build powerful, real-time analytics dashboards with ML-powered insights and comprehensive performance monitoring.