# Story 3.2: MLS Integration API Endpoints

## Overview

Story 3.2 adds **18 new API endpoints** for property management and MLS synchronization.

---

## Property API (8 Endpoints)

### 1. List Properties
```
GET /api/v1/properties
```

**Query Parameters:**
- `status` - Filter by status (Active, Pending, Sold, etc.)
- `propertyType` - Filter by type (Residential, Commercial, Land)
- `minPrice` / `maxPrice` - Price range
- `bedrooms` / `bathrooms` - Min bedrooms/bathrooms
- `city` / `state` / `zipCode` - Location filters
- `sortBy` - Sort field (price, createdAt, etc.)
- `sortOrder` - asc or desc
- `page` / `limit` - Pagination

**Response:**
```json
{
  "success": true,
  "data": {
    "properties": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### 2. Get Property Details
```
GET /api/v1/properties/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "propertyId": 1,
    "mlsListingId": "MLS12345",
    "address": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "zipCode": "78701",
    "price": 500000,
    "bedrooms": 3,
    "bathrooms": 2,
    "squareFeet": 2000,
    "status": "Active",
    "propertyType": "Residential",
    "description": "Beautiful home...",
    "listedDate": "2024-01-15T00:00:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. Create Property
```
POST /api/v1/properties
```

**Body:**
```json
{
  "mlsListingId": "MLS12345",
  "address": "123 Main St",
  "city": "Austin",
  "state": "TX",
  "zipCode": "78701",
  "price": 500000,
  "bedrooms": 3,
  "bathrooms": 2,
  "status": "Active",
  "propertyType": "Residential"
}
```

### 4. Update Property
```
PUT /api/v1/properties/:id
```

**Body:** (Partial update supported)
```json
{
  "price": 485000,
  "status": "Pending"
}
```

### 5. Delete Property
```
DELETE /api/v1/properties/:id
```

### 6. Get Property Media
```
GET /api/v1/properties/:id/media
```

**Response:**
```json
{
  "success": true,
  "data": {
    "media": [
      {
        "mediaId": 1,
        "mediaType": "image",
        "mediaUrl": "https://cdn.example.com/properties/1/image-0.webp",
        "thumbnailUrl": "https://cdn.example.com/properties/1/image-0-thumb.jpg",
        "displayOrder": 0,
        "caption": "Front view"
      }
    ]
  }
}
```

### 7. Get Property Timeline
```
GET /api/v1/properties/:id/timeline
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timeline": [
      {
        "event": "created",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "details": "Property added from MLS sync"
      },
      {
        "event": "updated",
        "timestamp": "2024-01-20T14:15:00.000Z",
        "details": "Price changed from $500,000 to $485,000"
      }
    ]
  }
}
```

### 8. Advanced Search
```
GET /api/v1/properties/search
```

**Query Parameters:**
- `q` - Full-text search query
- `location` - Location search (city, neighborhood, zip)
- All parameters from List Properties

---

## MLS Admin API (10 Endpoints)

### 1. Trigger Manual Sync
```
POST /api/v1/admin/mls/sync
```

**Body:**
```json
{
  "providerId": "sample_rets_provider",
  "syncType": "full"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "providerId": "sample_rets_provider",
    "syncType": "full",
    "status": "started"
  },
  "message": "Sync started. Check status endpoint for progress."
}
```

### 2. Cancel Running Sync
```
POST /api/v1/admin/mls/sync/:providerId/cancel
```

**Response:**
```json
{
  "success": true,
  "data": {
    "providerId": "sample_rets_provider",
    "status": "cancelled"
  }
}
```

### 3. Get All Providers Status
```
GET /api/v1/admin/mls/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "providerId": "sample_rets_provider",
        "providerName": "Sample MLS",
        "currentStatus": "idle",
        "lastSyncAt": "2024-01-20T10:00:00.000Z",
        "nextSyncAt": "2024-01-20T16:00:00.000Z",
        "syncIntervalHours": 6,
        "enabled": true
      }
    ]
  }
}
```

### 4. Get Single Provider Status
```
GET /api/v1/admin/mls/status/:providerId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "providerId": "sample_rets_provider",
    "providerName": "Sample MLS",
    "currentStatus": "syncing",
    "syncProgress": {
      "fetched": 500,
      "processed": 450,
      "total": 1000,
      "percentage": 50
    },
    "lastSyncAt": "2024-01-20T10:00:00.000Z",
    "lastSyncResult": "success",
    "enabled": true
  }
}
```

### 5. Get Recent Sync History (All Providers)
```
GET /api/v1/admin/mls/history?limit=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "syncId": "abc-123",
        "providerId": "sample_rets_provider",
        "syncType": "incremental",
        "status": "completed",
        "propertiesFetched": 25,
        "propertiesAdded": 5,
        "propertiesUpdated": 20,
        "startedAt": "2024-01-20T10:00:00.000Z",
        "completedAt": "2024-01-20T10:05:00.000Z",
        "duration": 300
      }
    ]
  }
}
```

### 6. Get Provider Sync History
```
GET /api/v1/admin/mls/history/:providerId?limit=50
```

### 7. Get Sync Errors
```
GET /api/v1/admin/mls/errors/:providerId?limit=100
```

**Response:**
```json
{
  "success": true,
  "data": {
    "errors": [
      {
        "errorId": 1,
        "providerId": "sample_rets_provider",
        "syncId": "abc-123",
        "listingId": "MLS12345",
        "errorMessage": "Invalid property data: missing required field 'price'",
        "errorType": "validation_error",
        "createdAt": "2024-01-20T10:02:30.000Z"
      }
    ]
  }
}
```

### 8. Get Sync Statistics
```
GET /api/v1/admin/mls/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProviders": 3,
    "activeProviders": 2,
    "totalProperties": 1500,
    "totalSyncs": 150,
    "successfulSyncs": 145,
    "failedSyncs": 5,
    "last24Hours": {
      "syncs": 4,
      "propertiesAdded": 50,
      "propertiesUpdated": 200,
      "errors": 2
    }
  }
}
```

### 9. Enable/Disable Provider
```
PUT /api/v1/admin/mls/provider/:providerId/toggle
```

**Body:**
```json
{
  "enabled": false
}
```

### 10. Update Sync Interval
```
PUT /api/v1/admin/mls/provider/:providerId/interval
```

**Body:**
```json
{
  "intervalHours": 4
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "providerId": "sample_rets_provider",
    "intervalHours": 4
  },
  "message": "Sync interval updated successfully"
}
```

---

## Authentication

All endpoints require JWT authentication:

```
Authorization: Bearer <jwt_token>
```

Get token from login endpoint:
```
POST /api/v1/auth/login
```

---

## Error Responses

All endpoints use consistent error format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [...]
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` - Invalid request data
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Missing or invalid token
- `FORBIDDEN` - Insufficient permissions
- `INTERNAL_ERROR` - Server error

---

## Rate Limiting

- Standard endpoints: 100 requests/minute
- Admin endpoints: 30 requests/minute
- Sync trigger: 5 requests/minute

---

## Testing Endpoints

### Quick Test with Mock Provider

1. **Get Auth Token:**
```bash
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  | jq -r '.data.token')
```

2. **Trigger Sync:**
```bash
curl -X POST http://localhost:3000/api/v1/admin/mls/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"providerId":"sample_rets_provider","syncType":"full"}'
```

3. **Check Status:**
```bash
curl http://localhost:3000/api/v1/admin/mls/status \
  -H "Authorization: Bearer $TOKEN" | jq
```

4. **View Properties:**
```bash
curl http://localhost:3000/api/v1/properties \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Summary

**Total New Endpoints:** 18
- **Property API:** 8 endpoints
- **MLS Admin API:** 10 endpoints

**Total Project Endpoints:** 42
- Auth API: 4
- Lead API: 6
- Task API: 8
- Interaction API: 6
- Property API: 8
- MLS Admin API: 10

All endpoints are production-ready with proper validation, error handling, and authentication.
