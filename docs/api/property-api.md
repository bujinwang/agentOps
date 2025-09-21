# 🏠 Property Management API

## Overview

The Property Management API provides comprehensive property listing management, MLS integration, media handling, and search capabilities for the Real Estate CRM system. This API handles all property-related operations including CRUD operations, MLS synchronization, and advanced search functionality.

## Base URL
```
https://api.realestate-crm.com/v1/properties
```

## Authentication
All Property API endpoints require JWT authentication with property management permissions.

---

## 🏠 Property Listings

### List Properties
Get all property listings with advanced filtering and search capabilities.

```http
GET /api/properties
```

**Query Parameters:**
- `status` (optional): Property status (active, pending, sold, off_market)
- `property_type` (optional): Type of property (single_family, condo, townhouse, multi_family, land, commercial)
- `listing_type` (optional): Listing type (sale, rent, sold, rented)
- `min_price` (optional): Minimum price
- `max_price` (optional): Maximum price
- `bedrooms` (optional): Number of bedrooms
- `bathrooms` (optional): Number of bathrooms
- `city` (optional): City location
- `zip_code` (optional): ZIP code
- `mls_id` (optional): MLS identifier
- `agent_id` (optional): Listing agent ID
- `sort` (optional): Sort field (price, created_at, updated_at)
- `order` (optional): Sort order (asc, desc)
- `limit` (optional): Number of results (default: 50, max: 100)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "mlsId": "MLS123456",
      "address": "123 Main Street",
      "city": "Seattle",
      "state": "WA",
      "zipCode": "98101",
      "propertyType": "single_family",
      "listingType": "sale",
      "price": 750000,
      "bedrooms": 3,
      "bathrooms": 2.5,
      "squareFeet": 2200,
      "lotSize": 0.25,
      "yearBuilt": 1995,
      "description": "Beautiful updated home in desirable neighborhood...",
      "features": ["hardwood_floors", "updated_kitchen", "garden"],
      "images": [
        {
          "id": "img_001",
          "url": "https://cdn.example.com/properties/123/main.jpg",
          "type": "main",
          "order": 1
        }
      ],
      "virtualTourUrl": "https://virtualtour.example.com/123",
      "listingAgent": {
        "id": 456,
        "name": "John Smith",
        "email": "john@agency.com",
        "phone": "(206) 555-0123"
      },
      "listingOffice": "Premier Realty",
      "status": "active",
      "listedAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T14:30:00Z",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "totalPages": 25,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "applied": {
      "property_type": "single_family",
      "min_price": 500000,
      "max_price": 1000000
    },
    "available": {
      "property_types": ["single_family", "condo", "townhouse"],
      "price_ranges": ["0-250k", "250k-500k", "500k-750k", "750k-1m", "1m+"],
      "bedroom_counts": [1, 2, 3, 4, 5]
    }
  }
}
```

### Get Property Details
Get detailed information about a specific property.

```http
GET /api/properties/{propertyId}
```

**Query Parameters:**
- `include` (optional): Comma-separated list of related data (agent, office, matches, history)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "mlsId": "MLS123456",
    "address": "123 Main Street",
    "city": "Seattle",
    "state": "WA",
    "zipCode": "98101",
    "coordinates": {
      "latitude": 47.6062,
      "longitude": -122.3321
    },
    "propertyType": "single_family",
    "listingType": "sale",
    "price": 750000,
    "bedrooms": 3,
    "bathrooms": 2.5,
    "squareFeet": 2200,
    "lotSize": 0.25,
    "yearBuilt": 1995,
    "description": "Beautiful updated home in desirable neighborhood...",
    "features": ["hardwood_floors", "updated_kitchen", "garden", "two_car_garage"],
    "appliances": ["dishwasher", "microwave", "washer", "dryer"],
    "heating": "forced_air",
    "cooling": "central_air",
    "parking": "attached_garage",
    "hoaFee": 150,
    "taxes": 8500,
    "images": [
      {
        "id": "img_001",
        "url": "https://cdn.example.com/properties/123/main.jpg",
        "type": "main",
        "caption": "Front exterior",
        "order": 1
      },
      {
        "id": "img_002",
        "url": "https://cdn.example.com/properties/123/living.jpg",
        "type": "interior",
        "caption": "Living room",
        "order": 2
      }
    ],
    "floorPlans": [
      {
        "id": "fp_001",
        "url": "https://cdn.example.com/properties/123/floorplan.pdf",
        "name": "Main Floor"
      }
    ],
    "virtualTourUrl": "https://virtualtour.example.com/123",
    "videoUrl": "https://video.example.com/123",
    "listingAgent": {
      "id": 456,
      "name": "John Smith",
      "email": "john@agency.com",
      "phone": "(206) 555-0123",
      "photo": "https://cdn.example.com/agents/456.jpg"
    },
    "listingOffice": {
      "id": 789,
      "name": "Premier Realty",
      "phone": "(206) 555-1000",
      "email": "info@premierrealty.com",
      "website": "https://premierrealty.com"
    },
    "status": "active",
    "listedAt": "2025-01-15T10:00:00Z",
    "expiresAt": "2025-04-15T10:00:00Z",
    "updatedAt": "2025-01-15T14:30:00Z",
    "createdAt": "2025-01-15T10:00:00Z",
    "viewCount": 245,
    "favoriteCount": 12,
    "leadMatches": [
      {
        "leadId": 101,
        "leadName": "Sarah Johnson",
        "matchScore": 0.89,
        "matchReasons": ["Budget match", "Bedroom count", "Location preference"]
      }
    ]
  }
}
```

### Create Property Listing
Create a new property listing.

```http
POST /api/properties
```

**Request Body:**
```json
{
  "mlsId": "MLS123456",
  "address": "123 Main Street",
  "city": "Seattle",
  "state": "WA",
  "zipCode": "98101",
  "propertyType": "single_family",
  "listingType": "sale",
  "price": 750000,
  "bedrooms": 3,
  "bathrooms": 2.5,
  "squareFeet": 2200,
  "lotSize": 0.25,
  "yearBuilt": 1995,
  "description": "Beautiful updated home in desirable neighborhood...",
  "features": ["hardwood_floors", "updated_kitchen", "garden"],
  "listingAgentId": 456,
  "listingOffice": "Premier Realty",
  "images": [
    {
      "url": "https://cdn.example.com/properties/123/main.jpg",
      "type": "main",
      "caption": "Front exterior",
      "order": 1
    }
  ],
  "virtualTourUrl": "https://virtualtour.example.com/123"
}
```

### Update Property Listing
Update an existing property listing.

```http
PUT /api/properties/{propertyId}
```

**Request Body:**
```json
{
  "price": 775000,
  "description": "Beautiful updated home in desirable neighborhood with new price!",
  "features": ["hardwood_floors", "updated_kitchen", "garden", "new_roof"],
  "status": "active"
}
```

### Delete Property Listing
Remove a property listing (admin only).

```http
DELETE /api/properties/{propertyId}
```

---

## 🖼️ Media Management

### Upload Property Images
Upload images for a property listing.

```http
POST /api/properties/{propertyId}/images
```

**Content-Type:** `multipart/form-data`

**Form Data:**
- `images[]`: Multiple image files
- `types[]`: Image types (main, interior, exterior, etc.)
- `captions[]`: Image captions
- `orders[]`: Display order

**Response:**
```json
{
  "success": true,
  "data": {
    "uploaded": [
      {
        "id": "img_001",
        "filename": "main.jpg",
        "url": "https://cdn.example.com/properties/123/main.jpg",
        "type": "main",
        "caption": "Front exterior",
        "order": 1,
        "size": 2048576,
        "uploadedAt": "2025-01-15T10:30:00Z"
      }
    ],
    "failed": [],
    "totalUploaded": 1
  }
}
```

### Get Property Images
Get all images for a property.

```http
GET /api/properties/{propertyId}/images
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "img_001",
      "url": "https://cdn.example.com/properties/123/main.jpg",
      "thumbnailUrl": "https://cdn.example.com/properties/123/main_thumb.jpg",
      "type": "main",
      "caption": "Front exterior",
      "order": 1,
      "size": 2048576,
      "dimensions": { "width": 1920, "height": 1080 },
      "uploadedAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

### Update Image Metadata
Update image captions, types, or order.

```http
PUT /api/properties/{propertyId}/images/{imageId}
```

**Request Body:**
```json
{
  "caption": "Beautiful front exterior with garden",
  "type": "exterior",
  "order": 1
}
```

### Delete Property Image
Remove an image from a property listing.

```http
DELETE /api/properties/{propertyId}/images/{imageId}
```

---

## 🔍 Advanced Search

### Search Properties
Advanced search with multiple criteria and filters.

```http
POST /api/properties/search
```

**Request Body:**
```json
{
  "query": {
    "text": "downtown seattle",
    "fields": ["address", "city", "description"]
  },
  "filters": {
    "propertyType": ["single_family", "condo"],
    "listingType": "sale",
    "priceRange": {
      "min": 500000,
      "max": 1000000
    },
    "bedrooms": {
      "min": 2,
      "max": 4
    },
    "bathrooms": {
      "min": 2
    },
    "squareFeet": {
      "min": 1500
    },
    "yearBuilt": {
      "min": 1990
    },
    "features": ["hardwood_floors", "updated_kitchen"],
    "location": {
      "city": "Seattle",
      "zipCodes": ["98101", "98102"],
      "radius": {
        "center": { "lat": 47.6062, "lng": -122.3321 },
        "distance": 5,
        "unit": "miles"
      }
    }
  },
  "sort": {
    "field": "price",
    "order": "asc"
  },
  "pagination": {
    "page": 1,
    "limit": 20
  },
  "include": ["agent", "office", "matches"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [...], // Property objects
    "total": 156,
    "searchMetadata": {
      "query": "downtown seattle",
      "filtersApplied": 8,
      "searchTime": 45,
      "relevanceScores": true
    },
    "facets": {
      "propertyType": {
        "single_family": 89,
        "condo": 45,
        "townhouse": 22
      },
      "priceRanges": {
        "500k-750k": 67,
        "750k-1m": 44,
        "1m+": 45
      },
      "bedrooms": {
        "2": 23,
        "3": 78,
        "4": 55
      }
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Get Search Suggestions
Get autocomplete suggestions for search queries.

```http
GET /api/properties/search/suggestions
```

**Query Parameters:**
- `q`: Search query
- `limit`: Number of suggestions (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "text": "downtown seattle",
        "type": "location",
        "count": 89
      },
      {
        "text": "single family homes",
        "type": "property_type",
        "count": 156
      },
      {
        "text": "updated kitchen",
        "type": "feature",
        "count": 67
      }
    ]
  }
}
```

---

## 🤖 Lead-Property Matching

### Get Property Matches for Lead
Get AI-powered property recommendations for a specific lead.

```http
GET /api/properties/matches/{leadId}
```

**Query Parameters:**
- `limit` (optional): Number of matches to return (default: 20)
- `min_score` (optional): Minimum match score (0.0-1.0)

**Response:**
```json
{
  "success": true,
  "data": {
    "lead": {
      "id": 101,
      "name": "Sarah Johnson",
      "budget": 800000,
      "bedrooms": 3,
      "bathrooms": 2,
      "location": "Seattle"
    },
    "matches": [
      {
        "propertyId": 123,
        "matchScore": 0.92,
        "matchReasons": [
          "Budget perfectly aligned ($750k vs $800k budget)",
          "Bedroom count matches (3 bedrooms)",
          "Location in preferred area",
          "Features match preferences (updated kitchen, hardwood floors)"
        ],
        "property": {
          "id": 123,
          "address": "123 Main Street",
          "price": 750000,
          "bedrooms": 3,
          "bathrooms": 2.5,
          "images": [...]
        },
        "recommendation": {
          "priority": "high",
          "action": "Schedule showing within 24 hours",
          "reason": "Excellent match with high conversion probability"
        }
      }
    ],
    "summary": {
      "totalMatches": 15,
      "highMatches": 5,
      "mediumMatches": 8,
      "lowMatches": 2,
      "averageScore": 0.78
    }
  }
}
```

### Create Manual Property Match
Manually create a property recommendation for a lead.

```http
POST /api/properties/matches
```

**Request Body:**
```json
{
  "leadId": 101,
  "propertyId": 123,
  "matchScore": 0.85,
  "matchReasons": [
    "Budget within range",
    "Location preference match",
    "Bedroom count suitable"
  ],
  "notes": "Lead expressed interest in this property type",
  "priority": "medium"
}
```

### Update Match Status
Update the status of a property-lead match.

```http
PUT /api/properties/matches/{matchId}/status
```

**Request Body:**
```json
{
  "status": "viewed",
  "notes": "Lead viewed property and requested more information",
  "followUpDate": "2025-01-20T10:00:00Z"
}
```

---

## 📊 Property Analytics

### Get Property Performance
Get performance analytics for a specific property.

```http
GET /api/properties/{propertyId}/analytics
```

**Query Parameters:**
- `period` (optional): Time period (7d, 30d, 90d) - default: 30d

**Response:**
```json
{
  "success": true,
  "data": {
    "propertyId": 123,
    "period": "30d",
    "metrics": {
      "views": 245,
      "favorites": 12,
      "inquiries": 8,
      "showings": 3,
      "offers": 1,
      "daysOnMarket": 15,
      "priceChanges": 1,
      "lastActivity": "2025-01-15T14:30:00Z"
    },
    "trends": {
      "dailyViews": [
        { "date": "2025-01-08", "views": 8 },
        { "date": "2025-01-09", "views": 12 },
        { "date": "2025-01-10", "views": 15 }
      ],
      "inquiryTrend": [
        { "date": "2025-01-08", "inquiries": 0 },
        { "date": "2025-01-09", "inquiries": 2 },
        { "date": "2025-01-10", "inquiries": 1 }
      ]
    },
    "insights": [
      {
        "type": "performance",
        "metric": "views",
        "value": 245,
        "benchmark": 180,
        "assessment": "above_average",
        "recommendation": "Continue current marketing strategy"
      },
      {
        "type": "opportunity",
        "metric": "inquiries",
        "value": 8,
        "benchmark": 12,
        "assessment": "below_average",
        "recommendation": "Consider price reduction or enhanced marketing"
      }
    ]
  }
}
```

### Get Market Analytics
Get market analytics and comparables for a property.

```http
GET /api/properties/{propertyId}/market-analysis
```

**Response:**
```json
{
  "success": true,
  "data": {
    "property": {
      "id": 123,
      "address": "123 Main Street",
      "price": 750000
    },
    "comparables": [
      {
        "id": 124,
        "address": "125 Main Street",
        "price": 725000,
        "soldDate": "2025-01-10T00:00:00Z",
        "daysOnMarket": 18,
        "similarity": 0.92
      }
    ],
    "marketTrends": {
      "priceGrowth": 0.052,
      "inventoryChange": -0.15,
      "daysOnMarket": 28,
      "buyerDemand": "high"
    },
    "valuation": {
      "estimatedValue": 765000,
      "confidence": 0.85,
      "range": {
        "low": 740000,
        "high": 790000
      },
      "factors": {
        "location": 1.05,
        "condition": 1.02,
        "market": 1.03
      }
    },
    "recommendations": [
      {
        "type": "pricing",
        "action": "Consider 2-3% price increase",
        "reason": "Market trending upward with strong demand",
        "confidence": 0.78
      }
    ]
  }
}
```

---

## 🔄 MLS Integration

### Sync MLS Data
Trigger MLS data synchronization for a property.

```http
POST /api/properties/{propertyId}/mls-sync
```

**Request Body:**
```json
{
  "force": false,
  "fields": ["price", "status", "images"],
  "notifyOnChanges": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "syncId": "mls_sync_12345",
    "status": "queued",
    "estimatedCompletion": "2025-01-15T10:32:00Z",
    "changesDetected": null
  }
}
```

### Get MLS Sync Status
Check the status of an MLS synchronization job.

```http
GET /api/properties/mls-sync/{syncId}/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "syncId": "mls_sync_12345",
    "status": "completed",
    "startedAt": "2025-01-15T10:30:00Z",
    "completedAt": "2025-01-15T10:31:45Z",
    "changes": {
      "price": {
        "old": 750000,
        "new": 765000,
        "changed": true
      },
      "status": {
        "old": "active",
        "new": "active",
        "changed": false
      }
    },
    "errors": []
  }
}
```

### Bulk MLS Sync
Synchronize multiple properties from MLS.

```http
POST /api/properties/mls-sync/bulk
```

**Request Body:**
```json
{
  "mlsIds": ["MLS123456", "MLS123457", "MLS123458"],
  "force": false,
  "priority": "normal",
  "notifyOnCompletion": true
}
```

---

## 📋 Property Management

### Get Agent Properties
Get all properties listed by a specific agent.

```http
GET /api/properties/agent/{agentId}
```

**Query Parameters:**
- `status` (optional): Property status filter
- `limit` (optional): Number of results

### Update Property Status
Update the status of a property listing.

```http
PUT /api/properties/{propertyId}/status
```

**Request Body:**
```json
{
  "status": "pending",
  "reason": "Under contract",
  "notes": "Accepted offer of $760,000",
  "effectiveDate": "2025-01-15T10:00:00Z"
}
```

### Get Property History
Get the complete history of changes for a property.

```http
GET /api/properties/{propertyId}/history
```

**Query Parameters:**
- `limit` (optional): Number of history entries
- `include` (optional): Types of changes to include

**Response:**
```json
{
  "success": true,
  "data": {
    "propertyId": 123,
    "history": [
      {
        "id": "hist_001",
        "timestamp": "2025-01-15T10:00:00Z",
        "action": "status_change",
        "field": "status",
        "oldValue": "active",
        "newValue": "pending",
        "reason": "Under contract",
        "userId": 456,
        "userName": "John Smith"
      },
      {
        "id": "hist_002",
        "timestamp": "2025-01-15T09:30:00Z",
        "action": "price_change",
        "field": "price",
        "oldValue": 750000,
        "newValue": 765000,
        "reason": "Market adjustment",
        "userId": 456,
        "userName": "John Smith"
      }
    ]
  }
}
```

---

## 🚨 Error Handling

### Common Error Responses

**Property Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "PROPERTY_NOT_FOUND",
    "message": "Property not found",
    "details": {
      "propertyId": 999
    }
  }
}
```

**MLS Sync Failed:**
```json
{
  "success": false,
  "error": {
    "code": "MLS_SYNC_FAILED",
    "message": "MLS synchronization failed",
    "details": {
      "syncId": "mls_sync_12345",
      "reason": "Invalid MLS credentials",
      "retryable": false
    }
  }
}
```

**Invalid Property Data:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PROPERTY_DATA",
    "message": "Property data validation failed",
    "details": {
      "field": "price",
      "value": -1000,
      "reason": "Price cannot be negative"
    }
  }
}
```

---

## 📊 Rate Limiting

- **Property Search**: 200 requests per minute
- **Property Details**: 500 requests per minute
- **Property Creation/Update**: 100 requests per minute
- **Image Upload**: 50 requests per minute
- **MLS Sync**: 20 requests per minute

---

## 🔍 Best Practices

### Property Search
1. **Use Filters Effectively**: Combine multiple filters for precise results
2. **Pagination**: Always use pagination for large result sets
3. **Sorting**: Sort by relevance or price for better user experience
4. **Caching**: Search results are cached for improved performance

### Media Management
1. **Image Optimization**: Images are automatically optimized for web delivery
2. **Progressive Loading**: Large image galleries load progressively
3. **CDN Delivery**: All media is delivered via CDN for fast loading
4. **Backup Storage**: All media is backed up automatically

### MLS Integration
1. **Scheduled Sync**: Regular MLS synchronization prevents data staleness
2. **Change Detection**: Only changed properties are updated to minimize API calls
3. **Error Handling**: Robust error handling for MLS API failures
4. **Rate Limiting**: Respect MLS API rate limits to avoid throttling

This comprehensive Property Management API provides all the tools needed to manage property listings, handle MLS integration, and provide advanced search capabilities in the Real Estate CRM system.