# Enrichment API JavaScript Client

A comprehensive JavaScript/TypeScript client library for the Lead Enrichment API, providing easy integration with real estate CRM systems.

## Features

- 🚀 **Promise-based API** - Modern async/await support
- 🔒 **TypeScript Support** - Full type definitions included
- 🛡️ **Built-in Security** - Automatic request signing and validation
- 📊 **Rich Monitoring** - Request/response metrics and error tracking
- 🔄 **Auto Retry** - Intelligent retry logic with exponential backoff
- 📱 **Browser & Node.js** - Works in both environments
- 🎯 **Webhook Handling** - Built-in webhook signature verification

## Installation

```bash
npm install @yourcompany/enrichment-client
# or
yarn add @yourcompany/enrichment-client
```

## Quick Start

```javascript
import { EnrichmentClient } from '@yourcompany/enrichment-client';

const client = new EnrichmentClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.yourcompany.com/v1',
  timeout: 30000,
});

// Enrich a lead
const result = await client.enrichLead(123, {
  sources: ['property', 'social'],
  webhookUrl: 'https://your-app.com/webhook'
});

console.log('Enrichment completed:', result.qualityScore);
```

## Configuration

```javascript
const client = new EnrichmentClient({
  // Required
  apiKey: 'your-api-key',

  // Optional
  baseUrl: 'https://api.yourcompany.com/v1',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  enableMetrics: true,
  webhookSecret: 'your-webhook-secret',
});
```

## API Reference

### EnrichmentClient

#### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | - | Your API key |
| `baseUrl` | `string` | `'https://api.yourcompany.com/v1'` | API base URL |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `retryAttempts` | `number` | `3` | Number of retry attempts |
| `retryDelay` | `number` | `1000` | Base delay between retries |
| `enableMetrics` | `boolean` | `true` | Enable request metrics |
| `webhookSecret` | `string` | - | Secret for webhook verification |

### Methods

#### Enrichment

##### `enrichLead(leadId, options?)`
Trigger enrichment for a specific lead.

```javascript
const result = await client.enrichLead(123, {
  sources: ['property', 'social', 'credit'],
  forceRefresh: false,
  priority: 'normal',
  webhookUrl: 'https://your-app.com/webhook'
});
```

##### `getEnrichmentStatus(leadId)`
Get enrichment status for a lead.

```javascript
const status = await client.getEnrichmentStatus(123);
console.log('Status:', status.status);
console.log('Quality Score:', status.qualityScore);
```

##### `enrichLeadsBatch(leadIds, options?)`
Trigger enrichment for multiple leads.

```javascript
const result = await client.enrichLeadsBatch([123, 124, 125], {
  sources: ['property', 'social'],
  priority: 'normal'
});
```

#### Consent Management

##### `grantConsent(leadId, consentData)`
Grant enrichment consent for a lead.

```javascript
const consent = await client.grantConsent(123, {
  consentText: 'I consent to data enrichment',
  consentVersion: '1.0',
  consentType: 'comprehensive',
  expiresAt: '2026-01-15T00:00:00Z'
});
```

##### `withdrawConsent(leadId, reason)`
Withdraw enrichment consent for a lead.

```javascript
await client.withdrawConsent(123, 'User requested deletion');
```

##### `getConsentStatus(leadId)`
Get consent status for a lead.

```javascript
const status = await client.getConsentStatus(123);
console.log('Consent granted:', status.consentGranted);
```

#### Data Management

##### `deleteEnrichmentData(leadId, options?)`
Delete enrichment data for a lead (GDPR compliance).

```javascript
await client.deleteEnrichmentData(123, {
  requestType: 'gdpr',
  reason: 'User right to erasure'
});
```

##### `exportEnrichmentData(leadId)`
Export enrichment data for portability (GDPR).

```javascript
const data = await client.exportEnrichmentData(123);
console.log('Export data:', data.dataPackage);
```

#### Monitoring

##### `getHealthStatus()`
Get service health status.

```javascript
const health = await client.getHealthStatus();
console.log('Service status:', health.status);
```

##### `getComplianceReport()`
Get compliance report.

```javascript
const report = await client.getComplianceReport();
console.log('Consent rate:', report.consentRate);
```

### Webhook Handling

#### Webhook Verification

```javascript
import { verifyWebhookSignature } from '@yourcompany/enrichment-client';

app.post('/webhook/enrichment', (req, res) => {
  const signature = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];

  if (!verifyWebhookSignature(req.body, signature, 'your-webhook-secret')) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook
  const { eventType, leadId, enrichmentId } = req.body;

  switch (eventType) {
    case 'enrichment_completed':
      handleEnrichmentCompleted(leadId, req.body.data);
      break;
    case 'enrichment_failed':
      handleEnrichmentFailed(leadId, req.body.error);
      break;
  }

  res.sendStatus(200);
});
```

#### Webhook Event Types

- `enrichment_completed` - Enrichment process finished successfully
- `enrichment_failed` - Enrichment process failed
- `consent_changed` - Consent status changed
- `data_deleted` - Enrichment data was deleted

### Error Handling

```javascript
try {
  const result = await client.enrichLead(leadId);
} catch (error) {
  switch (error.code) {
    case 'VALIDATION_ERROR':
      console.error('Invalid request:', error.details);
      break;
    case 'RATE_LIMIT_EXCEEDED':
      console.error('Rate limit exceeded, retrying...');
      await delay(60000); // Wait 1 minute
      return retry();
    case 'AUTHENTICATION_ERROR':
      console.error('Authentication failed');
      break;
    default:
      console.error('Unknown error:', error);
  }
}
```

### Metrics and Monitoring

```javascript
// Enable metrics collection
const client = new EnrichmentClient({
  apiKey: 'your-api-key',
  enableMetrics: true
});

// Get metrics
const metrics = client.getMetrics();
console.log('Total requests:', metrics.totalRequests);
console.log('Success rate:', metrics.successRate);
console.log('Average response time:', metrics.averageResponseTime);
```

## TypeScript Support

```typescript
import {
  EnrichmentClient,
  EnrichmentResult,
  ConsentData,
  EnrichmentOptions
} from '@yourcompany/enrichment-client';

const client = new EnrichmentClient({
  apiKey: 'your-api-key'
});

const result: EnrichmentResult = await client.enrichLead(123);
const consent: ConsentData = await client.grantConsent(123, {
  consentText: 'I consent...',
  consentVersion: '1.0'
});
```

## Advanced Usage

### Custom Request Interceptor

```javascript
const client = new EnrichmentClient({
  apiKey: 'your-api-key'
});

// Add custom headers to all requests
client.addRequestInterceptor((config) => {
  config.headers['X-Custom-Header'] = 'custom-value';
  return config;
});
```

### Custom Response Interceptor

```javascript
client.addResponseInterceptor((response) => {
  // Log all successful responses
  console.log(`Request to ${response.config.url} succeeded`);
  return response;
}, (error) => {
  // Log all errors
  console.error(`Request failed:`, error.message);
  return Promise.reject(error);
});
```

### Batch Processing with Progress

```javascript
const leadIds = [1, 2, 3, 4, 5];
const batchSize = 2;

for (let i = 0; i < leadIds.length; i += batchSize) {
  const batch = leadIds.slice(i, i + batchSize);

  try {
    const result = await client.enrichLeadsBatch(batch);
    console.log(`Processed batch ${i / batchSize + 1}: ${result.successful} successful`);

    // Optional: Add delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.error(`Batch ${i / batchSize + 1} failed:`, error.message);
  }
}
```

## Examples

### Complete Lead Enrichment Workflow

```javascript
async function enrichLeadWorkflow(leadId) {
  const client = new EnrichmentClient({
    apiKey: process.env.ENRICHMENT_API_KEY
  });

  try {
    // Check consent first
    const consentStatus = await client.getConsentStatus(leadId);
    if (!consentStatus.consentGranted) {
      // Grant consent
      await client.grantConsent(leadId, {
        consentText: 'I consent to data enrichment for real estate purposes',
        consentVersion: '1.0',
        consentType: 'comprehensive'
      });
    }

    // Start enrichment
    const enrichment = await client.enrichLead(leadId, {
      sources: ['property', 'social', 'credit'],
      webhookUrl: `${process.env.APP_URL}/webhook/enrichment`
    });

    console.log(`Enrichment started: ${enrichment.enrichmentId}`);

    // Poll for status (or use webhooks)
    let status;
    do {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      status = await client.getEnrichmentStatus(leadId);
    } while (status.status === 'processing');

    if (status.status === 'completed') {
      console.log(`Enrichment completed with quality score: ${status.qualityScore}`);
      return status.data;
    } else {
      throw new Error(`Enrichment failed: ${status.error}`);
    }

  } catch (error) {
    console.error('Enrichment workflow failed:', error);
    throw error;
  }
}
```

### Compliance-Aware Processing

```javascript
async function processLeadsWithCompliance(leadIds) {
  const client = new EnrichmentClient({
    apiKey: process.env.ENRICHMENT_API_KEY
  });

  const results = {
    processed: 0,
    consented: 0,
    enriched: 0,
    errors: []
  };

  for (const leadId of leadIds) {
    try {
      // Check consent
      const consent = await client.getConsentStatus(leadId);

      if (!consent.consentGranted) {
        // Skip leads without consent
        continue;
      }

      results.consented++;

      // Check if already enriched recently
      const status = await client.getEnrichmentStatus(leadId);
      if (status.status === 'completed' &&
          new Date() - new Date(status.lastUpdated) < 24 * 60 * 60 * 1000) {
        // Skip if enriched within last 24 hours
        results.processed++;
        continue;
      }

      // Enrich the lead
      await client.enrichLead(leadId, {
        sources: ['property', 'social']
      });

      results.processed++;
      results.enriched++;

    } catch (error) {
      results.errors.push({
        leadId,
        error: error.message
      });
    }
  }

  return results;
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- 📧 **Email**: support@yourcompany.com
- 📚 **Documentation**: https://docs.yourcompany.com/enrichment-client
- 🐛 **Issues**: https://github.com/yourcompany/enrichment-client/issues
- 💬 **Discussions**: https://github.com/yourcompany/enrichment-client/discussions