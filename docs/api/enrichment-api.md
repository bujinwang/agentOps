# Lead Enrichment API Documentation

## Overview

The Lead Enrichment API provides comprehensive data enrichment capabilities for real estate leads, integrating multiple external data sources including property records, social media profiles, and credit information. The API ensures compliance with GDPR, CCPA, and FCRA regulations.

## Base URL
```
https://api.yourcompany.com/v1/enrichment
```

## Authentication
All API requests require authentication using JWT tokens:
```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting
- **Authenticated requests**: 1000 requests per hour
- **Webhook endpoints**: 5000 requests per hour
- Rate limit headers are included in all responses

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": "Additional error details"
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Invalid request parameters
- `AUTHENTICATION_ERROR`: Invalid or missing authentication
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SERVICE_UNAVAILABLE`: External service unavailable
- `COMPLIANCE_ERROR`: Compliance requirement not met

---

# API Endpoints

## Enrichment Management

### POST /webhook/leads/{leadId}/enrich
Trigger enrichment for a specific lead.

**Parameters:**
- `leadId` (path): Lead identifier
- `options` (body, optional): Enrichment options

**Request Body:**
```json
{
  "forceRefresh": false,
  "priority": "normal",
  "sources": ["property", "social", "credit"],
  "webhookUrl": "https://your-app.com/webhook/enrichment"
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "message": "Enrichment process started",
  "leadId": 123,
  "enrichmentId": "enr_abc123",
  "status": "processing"
}
```

### GET /webhook/leads/{leadId}/enrichment-status
Get enrichment status for a lead.

**Parameters:**
- `leadId` (path): Lead identifier

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "leadId": 123,
    "status": "completed",
    "qualityScore": 92,
    "confidence": 0.89,
    "sources": ["property", "social"],
    "lastUpdated": "2025-01-15T10:30:00Z",
    "processingTime": 2500,
    "data": {
      "property": {
        "ownershipStatus": "owner",
        "propertyValue": 450000,
        "confidence": 0.95
      },
      "social": {
        "professionalTitle": "Software Engineer",
        "company": "Tech Corp",
        "confidence": 0.87
      }
    }
  }
}
```

### POST /webhook/leads/batch-enrich
Trigger enrichment for multiple leads.

**Request Body:**
```json
{
  "leadIds": [123, 124, 125],
  "options": {
    "forceRefresh": false,
    "priority": "normal"
  }
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "message": "Batch enrichment process started",
  "leadIds": [123, 124, 125],
  "batchId": "batch_abc123",
  "total": 3,
  "status": "processing"
}
```

## Consent Management

### POST /consent/{leadId}/grant
Grant enrichment consent for a lead.

**Parameters:**
- `leadId` (path): Lead identifier

**Request Body:**
```json
{
  "consentText": "I consent to data enrichment for real estate purposes",
  "consentVersion": "1.0",
  "consentType": "comprehensive",
  "expiresAt": "2026-01-15T00:00:00Z",
  "grantedVia": "web_portal",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Enrichment consent granted",
  "data": {
    "consentId": "consent_abc123",
    "leadId": 123,
    "grantedAt": "2025-01-15T10:30:00Z",
    "expiresAt": "2026-01-15T00:00:00Z",
    "status": "active"
  }
}
```

### POST /consent/{leadId}/withdraw
Withdraw enrichment consent for a lead.

**Parameters:**
- `leadId` (path): Lead identifier

**Request Body:**
```json
{
  "reason": "User requested data deletion",
  "withdrawalType": "full",
  "ipAddress": "192.168.1.100"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Enrichment consent withdrawn",
  "leadId": 123,
  "withdrawnAt": "2025-01-15T10:30:00Z"
}
```

### GET /consent/{leadId}/status
Get consent status for a lead.

**Parameters:**
- `leadId` (path): Lead identifier

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "leadId": 123,
    "consentGranted": true,
    "consentId": "consent_abc123",
    "grantedAt": "2025-01-15T10:30:00Z",
    "expiresAt": "2026-01-15T00:00:00Z",
    "status": "active",
    "consentType": "comprehensive",
    "gdprCompliant": true,
    "ccpaCompliant": true
  }
}
```

## Data Management

### POST /data/{leadId}/delete
Delete enrichment data for a lead (GDPR compliance).

**Parameters:**
- `leadId` (path): Lead identifier

**Request Body:**
```json
{
  "requestType": "gdpr",
  "reason": "User right to erasure",
  "deleteAllData": true,
  "anonymizeInstead": false
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Data deletion request processed",
  "data": {
    "deletionId": "del_abc123",
    "leadId": 123,
    "status": "completed",
    "dataRemoved": ["property", "social", "credit"],
    "deletedAt": "2025-01-15T10:30:00Z"
  }
}
```

### GET /data/{leadId}/portability
Export enrichment data for portability (GDPR).

**Parameters:**
- `leadId` (path): Lead identifier

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Data portability package generated",
  "data": {
    "leadId": 123,
    "exportFormat": "json",
    "dataPackage": {
      "personalData": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "enrichmentData": {
        "property": {...},
        "social": {...},
        "credit": {...}
      },
      "consentHistory": [...],
      "processingHistory": [...]
    },
    "exportedAt": "2025-01-15T10:30:00Z",
    "expiresAt": "2025-01-22T10:30:00Z"
  }
}
```

## Monitoring & Analytics

### GET /compliance/report
Get compliance report.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalLeads": 1250,
    "consentedLeads": 1180,
    "consentRate": "94.4%",
    "gdprCompliant": 1180,
    "ccpaCompliant": 1150,
    "dataDeletionRequests": 5,
    "auditLogsGenerated": 2500,
    "lastAuditDate": "2025-01-15T06:00:00Z"
  }
}
```

### GET /health
Get enrichment service health status.

**Response (200 OK):**
```json
{
  "service": "enrichment",
  "status": "healthy",
  "version": "1.0",
  "timestamp": "2025-01-15T10:30:00Z",
  "uptime": "5d 2h 30m",
  "providers": {
    "property": {
      "status": "healthy",
      "responseTime": "450ms",
      "lastChecked": "2025-01-15T10:29:00Z"
    },
    "social": {
      "status": "healthy",
      "responseTime": "320ms",
      "lastChecked": "2025-01-15T10:29:00Z"
    },
    "credit": {
      "status": "degraded",
      "responseTime": "2500ms",
      "lastChecked": "2025-01-15T10:29:00Z"
    }
  },
  "metrics": {
    "totalEnrichments": 15420,
    "successRate": "96.8%",
    "averageProcessingTime": "850ms",
    "cacheHitRate": "78.5%"
  }
}
```

---

# Webhook Integration

## Webhook Configuration
Register webhooks to receive real-time notifications:

```javascript
const webhookConfig = {
  id: 'my-webhook',
  url: 'https://your-app.com/webhook/enrichment',
  secret: 'your-webhook-secret',
  events: ['enrichment_completed', 'enrichment_failed', 'consent_changed']
};

// Register webhook
await fetch('/api/v1/enrichment/webhook/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(webhookConfig)
});
```

## Webhook Payloads

### Enrichment Completed
```json
{
  "eventType": "enrichment_completed",
  "leadId": 123,
  "timestamp": "2025-01-15T10:30:00Z",
  "enrichmentId": "enr_abc123",
  "qualityScore": 92,
  "confidence": 0.89,
  "sources": ["property", "social"],
  "processingTime": 2500,
  "data": {
    "property": {
      "ownershipStatus": "owner",
      "propertyValue": 450000,
      "confidence": 0.95
    },
    "social": {
      "professionalTitle": "Software Engineer",
      "company": "Tech Corp",
      "confidence": 0.87
    }
  }
}
```

### Enrichment Failed
```json
{
  "eventType": "enrichment_failed",
  "leadId": 123,
  "timestamp": "2025-01-15T10:30:00Z",
  "enrichmentId": "enr_abc123",
  "error": "Provider timeout",
  "sources": ["property"],
  "retryCount": 2
}
```

### Consent Changed
```json
{
  "eventType": "consent_changed",
  "leadId": 123,
  "timestamp": "2025-01-15T10:30:00Z",
  "consentId": "consent_abc123",
  "action": "granted",
  "consentType": "comprehensive",
  "expiresAt": "2026-01-15T00:00:00Z"
}
```

## Webhook Security
All webhook payloads include an HMAC signature for verification:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

---

# Client Libraries

## JavaScript/Node.js

```javascript
const EnrichmentClient = require('@yourcompany/enrichment-client');

const client = new EnrichmentClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.yourcompany.com/v1'
});

// Enrich a lead
const result = await client.enrichLead(123, {
  sources: ['property', 'social'],
  webhookUrl: 'https://your-app.com/webhook'
});

console.log('Enrichment completed:', result.qualityScore);
```

## Python

```python
from enrichment_client import EnrichmentClient

client = EnrichmentClient(
    api_key='your-api-key',
    base_url='https://api.yourcompany.com/v1'
)

# Enrich a lead
result = client.enrich_lead(123, sources=['property', 'social'])
print(f'Enrichment completed: {result.quality_score}')
```

## PHP

```php
use YourCompany\\Enrichment\\Client;

$client = new Client([
    'api_key' => 'your-api-key',
    'base_url' => 'https://api.yourcompany.com/v1'
]);

// Enrich a lead
$result = $client->enrichLead(123, [
    'sources' => ['property', 'social']
]);

echo "Enrichment completed: {$result->qualityScore}\n";
```

---

# Data Structures

## Enrichment Result
```json
{
  "enrichmentId": "string",
  "leadId": "integer",
  "qualityScore": "number (0-100)",
  "confidence": "number (0-1)",
  "sources": ["array of strings"],
  "processingTime": "number (milliseconds)",
  "data": {
    "property": {
      "ownershipStatus": "string",
      "propertyValue": "number",
      "mortgageBalance": "number",
      "lastTransactionDate": "string (ISO 8601)",
      "propertyType": "string",
      "ownershipVerified": "boolean",
      "transactionHistory": ["array of transactions"],
      "confidence": "number (0-1)"
    },
    "social": {
      "linkedinProfile": "string (URL)",
      "professionalTitle": "string",
      "company": "string",
      "industry": "string",
      "connections": "number",
      "emailVerified": "boolean",
      "profileVerified": "boolean",
      "socialProfiles": ["array of profiles"],
      "confidence": "number (0-1)"
    },
    "credit": {
      "creditScore": "number",
      "creditRating": "string",
      "paymentHistory": "string",
      "debtToIncomeRatio": "number",
      "creditUtilization": "number",
      "scoreVerified": "boolean",
      "reportDate": "string (ISO 8601)",
      "creditFactors": ["array of strings"],
      "riskIndicators": ["array of strings"],
      "confidence": "number (0-1)"
    }
  },
  "lastUpdated": "string (ISO 8601)"
}
```

## Consent Record
```json
{
  "consentId": "string",
  "leadId": "integer",
  "consentText": "string",
  "consentVersion": "string",
  "consentType": "string",
  "grantedAt": "string (ISO 8601)",
  "expiresAt": "string (ISO 8601)",
  "withdrawnAt": "string (ISO 8601)",
  "status": "string",
  "gdprCompliant": "boolean",
  "ccpaCompliant": "boolean",
  "ipAddress": "string",
  "userAgent": "string"
}
```

---

# Best Practices

## Error Handling
```javascript
try {
  const result = await client.enrichLead(leadId);
  if (result.qualityScore < 80) {
    console.warn('Low quality enrichment result');
  }
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Implement exponential backoff
    await delay(Math.pow(2, retryCount) * 1000);
    return retry();
  }
  throw error;
}
```

## Webhook Handling
```javascript
app.post('/webhook/enrichment', (req, res) => {
  const signature = req.headers['x-signature'];

  if (!verifyWebhookSignature(req.body, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook
  const { eventType, leadId, enrichmentId } = req.body;

  switch (eventType) {
    case 'enrichment_completed':
      updateLeadEnrichment(leadId, req.body.data);
      break;
    case 'enrichment_failed':
      handleEnrichmentFailure(leadId, req.body.error);
      break;
  }

  res.sendStatus(200);
});
```

## Compliance Considerations
- Always obtain explicit consent before enrichment
- Implement proper data retention policies
- Provide data portability and deletion capabilities
- Maintain comprehensive audit logs
- Handle data subject rights requests promptly

## Performance Optimization
- Use batch enrichment for multiple leads
- Implement caching for frequently accessed data
- Monitor API rate limits and implement backoff strategies
- Use webhooks for asynchronous processing
- Implement proper error handling and retries

---

# Support

For API support, please contact:
- **Email**: api-support@yourcompany.com
- **Documentation**: https://docs.yourcompany.com/enrichment-api
- **Status Page**: https://status.yourcompany.com
- **Changelog**: https://docs.yourcompany.com/enrichment-api/changelog