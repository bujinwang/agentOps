# 🤖 ML Scoring & Intelligence API

## Overview

The ML API provides comprehensive machine learning capabilities for lead scoring, model management, feature engineering, and predictive analytics. This API powers the intelligent automation features of the Real Estate CRM system.

## Base URL
```
https://api.realestate-crm.com/v1/ml
```

## Authentication
All ML API endpoints require JWT authentication with ML-specific permissions.

---

## 🔢 Lead Scoring

### Get Lead Score
Get the current ML score for a specific lead.

```http
GET /api/ml/leads/{leadId}/score
```

**Parameters:**
- `leadId` (path): Lead ID
- `model` (query, optional): Specific model to use (default: active model)
- `explain` (query, optional): Include feature importance (default: false)

**Response:**
```json
{
  "success": true,
  "data": {
    "leadId": 123,
    "score": 78.5,
    "confidence": 0.92,
    "modelVersion": "v2.1.0",
    "scoredAt": "2025-01-15T10:30:00Z",
    "predictionTime": 45,
    "features": {
      "budget": 500000,
      "timeline": "3-6 months",
      "propertyType": "single-family",
      "location": "seattle"
    },
    "explanation": {
      "featureImportance": {
        "budget": 0.35,
        "timeline": 0.25,
        "propertyType": 0.20,
        "location": 0.20
      },
      "decisionFactors": [
        "High budget indicates strong purchasing power",
        "Timeline suggests motivated buyer",
        "Single-family preference matches market demand"
      ]
    }
  }
}
```

### Batch Lead Scoring
Score multiple leads in a single request.

```http
POST /api/ml/leads/batch-score
```

**Request Body:**
```json
{
  "leadIds": [123, 124, 125],
  "model": "v2.1.0",
  "priority": "normal"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "batch-score-12345",
    "status": "processing",
    "estimatedCompletion": "2025-01-15T10:32:00Z",
    "totalLeads": 3,
    "completed": 0
  }
}
```

### Get Batch Scoring Results
Retrieve results from a batch scoring job.

```http
GET /api/ml/batch/{jobId}/results
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "batch-score-12345",
    "status": "completed",
    "completedAt": "2025-01-15T10:31:30Z",
    "results": [
      {
        "leadId": 123,
        "score": 78.5,
        "confidence": 0.92,
        "error": null
      },
      {
        "leadId": 124,
        "score": 65.2,
        "confidence": 0.88,
        "error": null
      }
    ],
    "summary": {
      "total": 3,
      "successful": 3,
      "failed": 0,
      "averageScore": 71.85,
      "averageConfidence": 0.90
    }
  }
}
```

---

## 🎯 Model Management

### List ML Models
Get all available ML models with their metadata.

```http
GET /api/ml/models
```

**Query Parameters:**
- `status` (optional): Filter by status (active, training, retired)
- `type` (optional): Filter by model type (scoring, classification, regression)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "model-001",
      "name": "Lead Scoring v2.1",
      "type": "scoring",
      "algorithm": "xgboost",
      "accuracy": 0.945,
      "status": "active",
      "createdAt": "2025-01-10T08:00:00Z",
      "lastTrained": "2025-01-14T06:00:00Z",
      "version": "v2.1.0",
      "metrics": {
        "precision": 0.92,
        "recall": 0.89,
        "f1Score": 0.905,
        "auc": 0.958
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

### Get Model Details
Get detailed information about a specific model.

```http
GET /api/ml/models/{modelId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "model-001",
    "name": "Lead Scoring v2.1",
    "description": "Advanced lead scoring model using XGBoost",
    "type": "scoring",
    "algorithm": "xgboost",
    "framework": "scikit-learn",
    "accuracy": 0.945,
    "status": "active",
    "createdAt": "2025-01-10T08:00:00Z",
    "lastTrained": "2025-01-14T06:00:00Z",
    "version": "v2.1.0",
    "hyperparameters": {
      "maxDepth": 6,
      "learningRate": 0.1,
      "nEstimators": 100
    },
    "featureImportance": {
      "budget": 0.35,
      "timeline": 0.25,
      "property_type": 0.20,
      "location_score": 0.15,
      "credit_score": 0.05
    },
    "metrics": {
      "trainAccuracy": 0.968,
      "validationAccuracy": 0.945,
      "testAccuracy": 0.942,
      "precision": 0.92,
      "recall": 0.89,
      "f1Score": 0.905,
      "auc": 0.958
    },
    "trainingData": {
      "totalSamples": 50000,
      "trainSamples": 35000,
      "validationSamples": 10000,
      "testSamples": 5000,
      "featureCount": 25
    }
  }
}
```

### Create New Model
Create a new ML model for training.

```http
POST /api/ml/models
```

**Request Body:**
```json
{
  "name": "Lead Scoring v3.0",
  "description": "Next generation lead scoring with deep learning",
  "type": "scoring",
  "algorithm": "neural_network",
  "hyperparameters": {
    "layers": [64, 32, 16],
    "activation": "relu",
    "learningRate": 0.001,
    "epochs": 100
  },
  "trainingConfig": {
    "dataSource": "leads_2025",
    "validationSplit": 0.2,
    "earlyStopping": true,
    "patience": 10
  }
}
```

### Update Model Status
Activate, deactivate, or retire a model.

```http
PUT /api/ml/models/{modelId}/status
```

**Request Body:**
```json
{
  "status": "active",
  "reason": "Better performance than previous model"
}
```

### Delete Model
Remove a model (only inactive models can be deleted).

```http
DELETE /api/ml/models/{modelId}
```

---

## 📊 Model Performance & Monitoring

### Get Model Performance Metrics
Get real-time performance metrics for a model.

```http
GET /api/ml/models/{modelId}/performance
```

**Query Parameters:**
- `period` (optional): Time period (1h, 24h, 7d, 30d) - default: 24h
- `metrics` (optional): Comma-separated list of metrics

**Response:**
```json
{
  "success": true,
  "data": {
    "modelId": "model-001",
    "period": "24h",
    "metrics": {
      "predictionCount": 1250,
      "averageLatency": 45,
      "errorRate": 0.002,
      "accuracy": 0.945,
      "driftScore": 0.023
    },
    "performance": {
      "p50Latency": 42,
      "p95Latency": 78,
      "p99Latency": 125,
      "throughput": 25.5
    },
    "alerts": [
      {
        "type": "drift",
        "severity": "warning",
        "message": "Data drift detected in budget feature",
        "timestamp": "2025-01-15T09:30:00Z"
      }
    ]
  }
}
```

### Get Model Drift Analysis
Analyze data drift and concept drift for a model.

```http
GET /api/ml/models/{modelId}/drift
```

**Response:**
```json
{
  "success": true,
  "data": {
    "modelId": "model-001",
    "driftAnalysis": {
      "overallDrift": 0.023,
      "featureDrift": {
        "budget": 0.045,
        "timeline": 0.012,
        "property_type": 0.008,
        "location": 0.031
      },
      "conceptDrift": {
        "score": 0.015,
        "confidence": 0.89,
        "detectedAt": "2025-01-15T08:15:00Z"
      }
    },
    "recommendations": [
      {
        "type": "retraining",
        "priority": "medium",
        "reason": "Budget feature drift exceeds threshold",
        "suggestedAction": "Schedule model retraining within 7 days"
      }
    ]
  }
}
```

---

## 🔧 Feature Engineering

### Get Feature Metadata
Get information about available features for ML models.

```http
GET /api/ml/features
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "budget",
      "type": "numeric",
      "description": "Lead's budget in USD",
      "range": [100000, 2000000],
      "importance": 0.35,
      "missingRate": 0.02,
      "distribution": {
        "mean": 650000,
        "std": 250000,
        "skewness": 0.8
      }
    },
    {
      "name": "timeline",
      "type": "categorical",
      "description": "Purchase timeline preference",
      "categories": ["1-3 months", "3-6 months", "6-12 months", "1+ years"],
      "importance": 0.25,
      "missingRate": 0.01
    }
  ]
}
```

### Analyze Feature Importance
Get feature importance analysis for a specific model.

```http
GET /api/ml/models/{modelId}/feature-importance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "modelId": "model-001",
    "globalImportance": {
      "budget": 0.35,
      "timeline": 0.25,
      "property_type": 0.20,
      "location_score": 0.15,
      "credit_score": 0.05
    },
    "localImportance": {
      "lead_123": {
        "budget": 0.42,
        "timeline": 0.28,
        "property_type": 0.18,
        "location_score": 0.12
      }
    },
    "shapValues": {
      "lead_123": {
        "budget": 0.15,
        "timeline": 0.08,
        "property_type": -0.03,
        "location_score": 0.12
      }
    }
  }
}
```

---

## 🎯 Predictive Analytics

### Get Conversion Predictions
Get conversion probability predictions for leads.

```http
POST /api/ml/predict/conversion
```

**Request Body:**
```json
{
  "leadIds": [123, 124, 125],
  "timeframe": "30d",
  "includeFactors": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "predictions": [
      {
        "leadId": 123,
        "conversionProbability": 0.78,
        "confidence": 0.89,
        "estimatedValue": 425000,
        "timeToConversion": "15-30 days",
        "keyFactors": [
          "High budget alignment",
          "Urgent timeline",
          "Strong property type match"
        ]
      }
    ],
    "modelInfo": {
      "version": "v2.1.0",
      "accuracy": 0.92,
      "lastUpdated": "2025-01-14T06:00:00Z"
    }
  }
}
```

### Get Market Insights
Get AI-powered market insights and recommendations.

```http
GET /api/ml/insights/market
```

**Query Parameters:**
- `location` (optional): Filter by location
- `propertyType` (optional): Filter by property type
- `timeframe` (optional): Analysis timeframe (7d, 30d, 90d)

**Response:**
```json
{
  "success": true,
  "data": {
    "marketTrends": {
      "priceGrowth": 0.052,
      "inventoryChange": -0.15,
      "daysOnMarket": 28,
      "buyerDemand": "high"
    },
    "recommendations": [
      {
        "type": "pricing",
        "action": "Consider 3-5% price increase",
        "reason": "Market trending upward with low inventory",
        "confidence": 0.87
      },
      {
        "type": "marketing",
        "action": "Focus on urgent buyer messaging",
        "reason": "High buyer demand detected",
        "confidence": 0.92
      }
    ],
    "insights": [
      {
        "category": "pricing",
        "insight": "Comparable properties selling 4% above asking price",
        "impact": "high",
        "data": {
          "averagePremium": 0.04,
          "sampleSize": 150,
          "timeframe": "30d"
        }
      }
    ]
  }
}
```

---

## 🔄 Model Training & Updates

### Start Model Retraining
Initiate automated model retraining.

```http
POST /api/ml/models/{modelId}/retrain
```

**Request Body:**
```json
{
  "reason": "Performance degradation detected",
  "priority": "high",
  "dataSource": "leads_2025_q1",
  "validationSplit": 0.2,
  "hyperparameterTuning": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "retrain-12345",
    "modelId": "model-001",
    "status": "queued",
    "estimatedDuration": "2-3 hours",
    "queuedAt": "2025-01-15T10:30:00Z"
  }
}
```

### Get Training Status
Check the status of a model training job.

```http
GET /api/ml/training/{jobId}/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "retrain-12345",
    "status": "training",
    "progress": 0.65,
    "currentStage": "hyperparameter_tuning",
    "metrics": {
      "currentAccuracy": 0.938,
      "bestAccuracy": 0.945,
      "epochsCompleted": 45,
      "totalEpochs": 100
    },
    "estimatedCompletion": "2025-01-15T12:15:00Z",
    "startedAt": "2025-01-15T10:30:00Z"
  }
}
```

### Deploy Trained Model
Deploy a successfully trained model to production.

```http
POST /api/ml/models/{modelId}/deploy
```

**Request Body:**
```json
{
  "validationResults": {
    "accuracy": 0.952,
    "precision": 0.94,
    "recall": 0.91
  },
  "aBTest": {
    "enabled": true,
    "trafficSplit": 0.1,
    "duration": "7d"
  },
  "rollbackPlan": {
    "previousModel": "model-001",
    "monitoringPeriod": "24h"
  }
}
```

---

## 📈 Analytics & Reporting

### Get ML Performance Dashboard
Get comprehensive ML performance metrics.

```http
GET /api/ml/analytics/dashboard
```

**Query Parameters:**
- `period` (optional): Time period (1h, 24h, 7d, 30d)
- `models` (optional): Comma-separated list of model IDs

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalPredictions": 125000,
      "averageAccuracy": 0.945,
      "averageLatency": 45,
      "activeModels": 3,
      "alertsCount": 2
    },
    "modelPerformance": [
      {
        "modelId": "model-001",
        "name": "Lead Scoring v2.1",
        "predictions": 75000,
        "accuracy": 0.948,
        "latency": 42,
        "driftScore": 0.015,
        "status": "active"
      }
    ],
    "systemHealth": {
      "cpuUsage": 0.65,
      "memoryUsage": 0.72,
      "queueDepth": 12,
      "errorRate": 0.001
    },
    "trends": {
      "accuracyTrend": [
        { "date": "2025-01-08", "accuracy": 0.942 },
        { "date": "2025-01-09", "accuracy": 0.945 },
        { "date": "2025-01-10", "accuracy": 0.948 }
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

### Get Model Comparison Report
Compare performance between different models.

```http
GET /api/ml/analytics/models/compare
```

**Query Parameters:**
- `modelIds`: Comma-separated list of model IDs to compare
- `metrics`: Comma-separated list of metrics (accuracy, precision, recall, latency)
- `period`: Time period for comparison

**Response:**
```json
{
  "success": true,
  "data": {
    "comparison": {
      "models": ["model-001", "model-002"],
      "metrics": {
        "accuracy": {
          "model-001": 0.948,
          "model-002": 0.935,
          "difference": 0.013,
          "winner": "model-001"
        },
        "latency": {
          "model-001": 42,
          "model-002": 38,
          "difference": 4,
          "winner": "model-002"
        }
      }
    },
    "recommendations": [
      {
        "type": "deployment",
        "model": "model-001",
        "reason": "Higher accuracy outweighs latency difference",
        "confidence": 0.89
      }
    ]
  }
}
```

---

## ⚙️ Configuration & Settings

### Get ML Configuration
Get current ML system configuration.

```http
GET /api/ml/config
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activeModel": "model-001",
    "fallbackModel": "model-baseline",
    "scoring": {
      "maxBatchSize": 1000,
      "timeout": 30000,
      "caching": {
        "enabled": true,
        "ttl": 3600,
        "maxSize": 10000
      }
    },
    "training": {
      "autoRetrain": true,
      "retrainThreshold": 0.05,
      "maxTrainingTime": 7200000,
      "validationSplit": 0.2
    },
    "monitoring": {
      "driftDetection": true,
      "alertThresholds": {
        "accuracyDrop": 0.05,
        "latencyIncrease": 100
      }
    }
  }
}
```

### Update ML Configuration
Update ML system configuration (admin only).

```http
PUT /api/ml/config
```

**Request Body:**
```json
{
  "scoring": {
    "maxBatchSize": 1500,
    "timeout": 45000
  },
  "monitoring": {
    "alertThresholds": {
      "accuracyDrop": 0.03
    }
  }
}
```

---

## 🚨 Error Handling

### Common Error Responses

**Model Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "MODEL_NOT_FOUND",
    "message": "ML model not found",
    "details": {
      "modelId": "model-999"
    }
  }
}
```

**Model Training Failed:**
```json
{
  "success": false,
  "error": {
    "code": "MODEL_TRAINING_FAILED",
    "message": "Model training failed due to insufficient data",
    "details": {
      "reason": "Training dataset too small",
      "minSamples": 10000,
      "actualSamples": 5000
    }
  }
}
```

**Prediction Timeout:**
```json
{
  "success": false,
  "error": {
    "code": "PREDICTION_TIMEOUT",
    "message": "ML prediction timed out",
    "details": {
      "timeout": 30000,
      "modelId": "model-001"
    }
  }
}
```

---

## 📊 Rate Limiting

- **Individual Scoring**: 500 requests per minute
- **Batch Scoring**: 50 requests per minute
- **Model Management**: 100 requests per minute
- **Analytics**: 200 requests per minute

---

## 🔍 Best Practices

### Scoring Requests
1. **Cache Results**: ML scores are cached for 1 hour to improve performance
2. **Batch Processing**: Use batch scoring for multiple leads to reduce latency
3. **Async Processing**: For large batches, use async processing with job tracking

### Model Management
1. **Version Control**: All models are versioned with Git-like semantics
2. **A/B Testing**: New models can be tested with traffic splitting
3. **Gradual Rollout**: Models are deployed gradually to monitor performance

### Monitoring
1. **Real-time Alerts**: Set up alerts for accuracy drops and latency increases
2. **Performance Tracking**: Monitor prediction latency and throughput
3. **Drift Detection**: Automatic detection of data and concept drift

This comprehensive ML API provides all the tools needed to leverage advanced machine learning capabilities for intelligent lead scoring and predictive analytics in the Real Estate CRM system.