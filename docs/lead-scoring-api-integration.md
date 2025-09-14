# Lead Scoring API Integration

## Overview

This document describes the backend integration for lead scoring persistence implemented in Story 3.4. The system now provides comprehensive API endpoints for managing lead scores with full database persistence and frontend synchronization.

## Architecture

### Components

1. **Database Schema**: Enhanced PostgreSQL schema with structured scoring fields
2. **n8n Workflows**: API endpoints for lead score management
3. **Frontend Services**: API client and synchronization logic
4. **Data Synchronization**: Real-time sync between frontend and backend

### Database Schema

The `leads` table includes the following scoring fields:

```sql
-- Core scoring fields
score DECIMAL(5,2)                    -- Calculated score (0-100)
score_category VARCHAR(20)            -- 'High', 'Medium', 'Low'
score_breakdown JSONB                 -- Detailed scoring components
score_last_calculated TIMESTAMPTZ     -- When score was last calculated
score_history JSONB                   -- Historical scores for trend analysis

-- Manual override capabilities
manual_score_override DECIMAL(5,2)    -- Manual override by agent
manual_score_reason TEXT             -- Reason for manual override
```

## API Endpoints

### 1. Get Lead Score
**Endpoint**: `GET /webhook/leads/:leadId/score`

Retrieves the current score data for a specific lead.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "lead_id": 123,
      "score": 85.5,
      "score_category": "High",
      "score_breakdown": {
        "budget": 90,
        "timeline": 85,
        "propertyType": 80,
        "location": 88,
        "engagement": 82,
        "qualification": 86
      },
      "score_last_calculated": "2024-01-15T10:30:00Z",
      "score_history": [...],
      "manual_score_override": null,
      "manual_score_reason": null
    }
  ]
}
```

### 2. Update Lead Score
**Endpoint**: `PUT /webhook/leads/:leadId/score`

Updates a lead's score with manual override.

**Request Body**:
```json
{
  "score": 92.0,
  "reason": "Premium client with urgent timeline",
  "userId": 1
}
```

### 3. Get Score History
**Endpoint**: `GET /webhook/leads/:leadId/score/history`

Retrieves the complete scoring history for a lead.

**Response**:
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "timestamp": "2024-01-15T10:30:00Z",
        "score": 85.5,
        "category": "High",
        "breakdown": {...},
        "calculation_type": "api_calculated"
      },
      {
        "timestamp": "2024-01-16T14:20:00Z",
        "manual_override": 92.0,
        "reason": "Premium client upgrade"
      }
    ],
    "lastCalculated": "2024-01-16T14:20:00Z"
  }
}
```

### 4. Calculate Score
**Endpoint**: `POST /webhook/leads/:leadId/calculate-score`

Calculates and saves a new score using the backend algorithm.

**Request Body**:
```json
{
  "budget_max": 500000,
  "timeline": "within 3 months",
  "property_type": "House",
  "desired_location": "Downtown",
  "source": "Website Form",
  "phone_number": "+1234567890",
  "qualification_status": "qualified"
}
```

## Frontend Integration

### API Service (`leadScoreApiService.ts`)

Provides TypeScript client for backend communication:

```typescript
import leadScoreApiService from '../services/leadScoreApiService';

// Get lead score
const scoreData = await leadScoreApiService.getLeadScore(leadId);

// Update with manual override
const success = await leadScoreApiService.updateLeadScore(leadId, 90, 'High-value client');

// Calculate new score
const result = await leadScoreApiService.calculateLeadScore(leadData);

// Sync local score with backend
const synced = await leadScoreApiService.syncLeadScore(leadId, localScore);
```

### Enhanced Lead Scoring Service

The main `leadScoringService` now includes backend persistence methods:

```typescript
// Calculate and persist score
const result = await leadScoringService.calculateAndPersistScore(leadData);

// Get persisted score
const persistedScore = await leadScoringService.getPersistedScore(leadId);

// Update manual override
const success = await leadScoringService.updateScoreOverride(leadId, 95, 'VIP client');

// Get score history
const history = await leadScoringService.getScoreHistory(leadId);
```

### Analytics Hook Integration

The `useLeadAnalytics` hook now includes backend synchronization:

```typescript
const {
  data: analyticsData,
  loading,
  error,
  refresh,
  setTimeRange,
  timeRange
} = useLeadAnalytics({
  timeRange: '30d',
  autoLoad: true,
  refreshInterval: 5 * 60 * 1000 // 5 minutes
});
```

## Data Synchronization

### Automatic Sync Process

1. **Local Calculation**: Frontend calculates scores using local algorithm
2. **Backend Sync**: Attempts to sync with backend API
3. **Conflict Resolution**: If backend exists, compares scores and updates if different
4. **Fallback**: Uses local calculation if backend unavailable
5. **History Tracking**: Maintains complete audit trail of all score changes

### Sync Logic

```typescript
// Automatic sync on score calculation
const syncWithBackend = async (leadId: number, localScore: LeadScore) => {
  try {
    const backendData = await leadScoreApiService.getLeadScore(leadId);

    if (!backendData?.score) {
      // No backend score, calculate and save
      await leadScoreApiService.calculateLeadScore(convertToLeadData(localScore));
    } else if (Math.abs(backendData.score - localScore.totalScore) > 5) {
      // Significant difference, update backend
      await leadScoreApiService.updateLeadScore(
        leadId,
        localScore.totalScore,
        'Synced from frontend calculation'
      );
    }
  } catch (error) {
    console.warn('Backend sync failed:', error);
  }
};
```

## Scoring Algorithm

### Enhanced Backend Algorithm

The backend scoring algorithm includes:

1. **Budget Scoring** (30% weight)
   - $1M+: 100 points
   - $750K+: 85 points
   - $500K+: 70 points
   - $300K+: 55 points
   - Under $300K: 40 points

2. **Timeline Scoring** (25% weight)
   - ASAP/Immediately: 100 points
   - Within 30 days: 85 points
   - Within 60 days: 70 points
   - 3-6 months: 55 points
   - Flexible: 40 points

3. **Property Type Scoring** (20% weight)
   - House/Single-Family: 90 points
   - Condo/Apartment: 80 points
   - Townhouse: 75 points
   - Multi-Family: 70 points
   - Land: 60 points

4. **Location Scoring** (15% weight)
   - Premium areas: 90 points
   - Standard areas: 70 points
   - Challenging areas: 50 points

5. **Engagement Scoring** (10% weight)
   - Referral source: 95 points
   - Website/Organic: 80 points
   - Facebook/Google: 70 points
   - Phone contact bonus: +10 points
   - Notes length bonus: +10 points

### Category Mapping

- **90+ points**: High (A grade)
- **70-89 points**: Medium (B grade)
- **Below 70 points**: Low (C grade)

## Error Handling

### Graceful Degradation

- **Backend Unavailable**: Falls back to local calculation
- **Network Errors**: Retries with exponential backoff
- **Data Conflicts**: Logs conflicts and uses latest timestamp
- **Invalid Data**: Validates input and provides meaningful error messages

### Logging and Monitoring

```typescript
// Comprehensive error logging
try {
  const result = await apiCall();
} catch (error) {
  console.error('API Error:', {
    endpoint: '/webhook/leads/score',
    leadId,
    error: error.message,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  });
  throw error;
}
```

## Performance Optimization

### Caching Strategy

- **Score Cache**: 2-hour expiration for frequently accessed scores
- **History Cache**: 24-hour expiration for score histories
- **Analytics Cache**: 5-minute refresh interval for dashboard data

### Batch Operations

```typescript
// Batch score retrieval for multiple leads
const batchScores = await Promise.allSettled(
  leadIds.map(id => leadScoreApiService.getLeadScore(id))
);
```

## Security Considerations

### Authentication

- JWT token validation on all API endpoints
- User-specific data isolation
- Audit logging for manual overrides

### Data Validation

- Input sanitization for all API parameters
- Score range validation (0-100)
- SQL injection prevention through parameterized queries

## Testing Strategy

### Unit Tests

```typescript
describe('LeadScoreApiService', () => {
  test('should retrieve lead score successfully', async () => {
    const mockResponse = { success: true, data: [testScoreData] };
    // Test implementation
  });

  test('should handle backend unavailability gracefully', async () => {
    // Test fallback behavior
  });
});
```

### Integration Tests

- API endpoint testing with real database
- Synchronization testing between frontend and backend
- Error scenario testing and recovery

## Deployment Considerations

### Environment Configuration

```typescript
// Environment-specific API URLs
const API_CONFIG = {
  development: 'http://localhost:5678',
  staging: 'https://api-staging.example.com',
  production: 'https://api.example.com'
};
```

### Database Migrations

Ensure database schema is updated before deploying:

```sql
-- Run these migrations in order
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score DECIMAL(5,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_category VARCHAR(20);
-- ... additional columns
```

## Future Enhancements

### Planned Features

1. **Real-time Sync**: WebSocket integration for instant updates
2. **Bulk Operations**: Batch scoring for multiple leads
3. **Advanced Analytics**: Machine learning-based scoring predictions
4. **Mobile Offline Support**: Enhanced offline scoring capabilities
5. **Audit Trail**: Complete audit logging for all score changes

### API Versioning

Future API versions will include:
- GraphQL integration for flexible queries
- Webhook notifications for score changes
- Advanced filtering and search capabilities

## Troubleshooting

### Common Issues

1. **Backend Connection Failed**
   - Check n8n workflow status
   - Verify database connectivity
   - Check API endpoint URLs

2. **Score Synchronization Issues**
   - Clear local cache
   - Check timestamp conflicts
   - Verify user permissions

3. **Performance Issues**
   - Check database indexes
   - Monitor API response times
   - Optimize batch operations

### Debug Mode

Enable debug logging:

```typescript
// Enable detailed logging
leadScoreApiService.debug = true;
```

This will provide comprehensive logs for troubleshooting integration issues.