# MLS Integration Deployment Guide

## Overview

This guide covers deploying the MLS Property Synchronization system to production.

## Prerequisites

- PostgreSQL database
- Node.js 18+ with TypeScript
- AWS S3 bucket (for property images)
- MLS provider credentials (RETS or REST API)

---

## 1. Database Setup

### Run Migration

```bash
psql -U postgres -d real_estate_crm < database/migrations/003_create_properties_and_mls_tables.sql
```

### Verify Tables Created

```sql
-- Check tables exist
\dt properties*
\dt mls_*

-- Verify structure
\d properties
\d mls_sync_status
```

---

## 2. Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/real_estate_crm

# AWS S3 (Required for image storage)
AWS_S3_ENABLED=true
AWS_S3_BUCKET=real-estate-crm-properties
AWS_S3_REGION=us-east-1
AWS_S3_ACCESS_KEY_ID=your_access_key
AWS_S3_SECRET_ACCESS_KEY=your_secret_key

# Optional: CloudFront CDN
AWS_CLOUDFRONT_URL=https://your-cdn-domain.cloudfront.net

# MLS Sync (Enable automatic sync)
ENABLE_MLS_SYNC=true

# Server
PORT=3000
NODE_ENV=production
```

### AWS S3 Setup

1. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://real-estate-crm-properties --region us-east-1
   ```

2. **Configure Public Access**
   ```bash
   # Block public access OFF for public property images
   aws s3api put-public-access-block \
     --bucket real-estate-crm-properties \
     --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
   ```

3. **Set Bucket Policy** (public read for property images)
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::real-estate-crm-properties/*"
       }
     ]
   }
   ```

4. **Optional: Setup CloudFront CDN**
   - Create CloudFront distribution
   - Point origin to S3 bucket
   - Enable HTTPS
   - Set `AWS_CLOUDFRONT_URL` environment variable

---

## 3. MLS Provider Configuration

### Option A: RETS Provider (Most Common)

```typescript
// Contact your MLS provider for credentials
const retsConfig = {
  providerId: 'my_mls_rets',
  providerName: 'My Regional MLS',
  providerType: 'RETS',
  loginUrl: 'https://rets.example-mls.com/login',
  credentials: {
    username: 'YOUR_USERNAME',
    password: 'YOUR_PASSWORD',
    userAgent: 'YourCompany/1.0',
  },
  fieldMapping: {
    // Map MLS fields to internal fields
    'ListingKey': 'listingId',
    'StandardStatus': 'status',
    'ListPrice': 'price',
    // ... add more field mappings
  },
};
```

### Option B: Mock Provider (Testing Only)

```bash
# No credentials needed - generates 50 fake properties
# Great for testing and development
```

### Configure Provider in Database

```sql
INSERT INTO mls_provider_configurations (
  provider_id,
  provider_name,
  provider_type,
  config_json,
  is_active
) VALUES (
  'my_mls_rets',
  'My Regional MLS',
  'RETS',
  '{
    "loginUrl": "https://rets.example-mls.com/login",
    "credentials": {
      "username": "USERNAME",
      "password": "PASSWORD"
    }
  }',
  true
);
```

---

## 4. Start Application

```bash
cd backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start production server
npm run start

# Or for development
npm run dev:ts
```

### Verify Startup

Check logs for:
```
✅ Database connected successfully
✅ MLS sync job started
🚀 Server running on port 3000
```

---

## 5. Test MLS Sync

### Manual Sync Trigger

```bash
# Get JWT token first
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your_password"}' \
  | jq -r '.data.token')

# Trigger full sync
curl -X POST http://localhost:3000/api/v1/admin/mls/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "my_mls_rets",
    "syncType": "full"
  }'
```

### Check Sync Status

```bash
curl http://localhost:3000/api/v1/admin/mls/status \
  -H "Authorization: Bearer $TOKEN" | jq
```

### View Synced Properties

```bash
curl http://localhost:3000/api/v1/properties \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 6. Monitoring & Troubleshooting

### Check Sync History

```sql
SELECT 
  sync_id,
  provider_id,
  sync_type,
  status,
  properties_fetched,
  properties_added,
  properties_updated,
  started_at,
  completed_at
FROM mls_sync_history
ORDER BY started_at DESC
LIMIT 10;
```

### Check Sync Errors

```sql
SELECT 
  error_id,
  provider_id,
  listing_id,
  error_message,
  created_at
FROM mls_sync_errors
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### View Sync Statistics

```bash
curl http://localhost:3000/api/v1/admin/mls/statistics \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Common Issues

#### 1. "Provider not initialized"
- Check MLS credentials are correct
- Verify RETS URL is accessible
- Check firewall/network allows outbound HTTPS

#### 2. "Failed to upload to S3"
- Verify AWS credentials are set
- Check S3 bucket exists
- Verify IAM permissions for S3 operations

#### 3. "Image processing failed"
- Check Sharp library is installed correctly
- Verify image URLs are accessible
- Check memory limits (image processing is intensive)

#### 4. Properties not syncing
- Check `mls_sync_status` table for enabled=false
- Verify `sync_interval_hours` hasn't been reached
- Check `last_sync_error` field for issues

---

## 7. Scheduled Sync Configuration

### Sync Intervals

Default: Checks every hour, syncs based on provider interval

```sql
-- Update sync interval for a provider
UPDATE mls_sync_status
SET sync_interval_hours = 6  -- Sync every 6 hours
WHERE provider_id = 'my_mls_rets';
```

### Enable/Disable Auto Sync

```bash
# Enable auto sync globally
export ENABLE_MLS_SYNC=true

# Disable specific provider
curl -X PUT http://localhost:3000/api/v1/admin/mls/provider/my_mls_rets/toggle \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

---

## 8. Production Best Practices

### Performance

- **Batch Size**: Default 1000 properties per batch
- **Sync Frequency**: 4-6 hours recommended for incremental
- **Image Processing**: CPU intensive - consider dedicated worker
- **Database**: Add indexes on frequently queried fields

### Security

- **MLS Credentials**: Store in secure secret manager (AWS Secrets Manager, HashiCorp Vault)
- **API Keys**: Rotate regularly
- **Access Control**: Limit admin endpoints to authorized users only
- **Audit Logging**: Track all sync operations

### Scaling

- **Horizontal Scaling**: Run multiple sync workers with locking
- **Database**: Consider read replicas for property queries
- **CDN**: Use CloudFront for image delivery
- **Caching**: Cache property lists with Redis

---

## 9. API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/admin/mls/sync` | Trigger manual sync |
| POST | `/api/v1/admin/mls/sync/:providerId/cancel` | Cancel running sync |
| GET | `/api/v1/admin/mls/status` | Get all providers status |
| GET | `/api/v1/admin/mls/status/:providerId` | Get specific provider status |
| GET | `/api/v1/admin/mls/history` | Get recent sync history |
| GET | `/api/v1/admin/mls/history/:providerId` | Get provider sync history |
| GET | `/api/v1/admin/mls/errors/:providerId` | Get sync errors |
| GET | `/api/v1/admin/mls/statistics` | Get global statistics |
| PUT | `/api/v1/admin/mls/provider/:providerId/toggle` | Enable/disable provider |
| PUT | `/api/v1/admin/mls/provider/:providerId/interval` | Update sync interval |
| GET | `/api/v1/properties` | List all properties |
| GET | `/api/v1/properties/:id` | Get property details |

---

## 10. Support & Resources

- **MLS Provider Documentation**: Consult your MLS for field mappings
- **RETS Standard**: https://www.reso.org/rets-standard/
- **AWS S3 Documentation**: https://docs.aws.amazon.com/s3/
- **Sharp Image Processing**: https://sharp.pixelplumbing.com/

---

## Checklist

- [ ] Database migration completed
- [ ] Environment variables configured
- [ ] AWS S3 bucket created and configured
- [ ] MLS provider credentials obtained
- [ ] Provider configuration added to database
- [ ] Application started successfully
- [ ] Test sync completed successfully
- [ ] Properties visible in API
- [ ] Images uploaded to S3
- [ ] Scheduled sync enabled
- [ ] Monitoring dashboard configured
- [ ] Error alerts configured
