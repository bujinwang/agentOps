# 🔍 Global Search & Discovery API

## Overview

The Global Search & Discovery API provides comprehensive search capabilities across all entities in the Real Estate CRM system. This API enables intelligent search, filtering, faceted navigation, and advanced query capabilities for leads, properties, users, tasks, and documents.

## Base URL
```
https://api.realestate-crm.com/v1/search
```

## Authentication
All Search API endpoints require JWT authentication with search permissions.

---

## 🔎 Global Search

### Universal Search
Search across all entities in the system with intelligent ranking.

```http
GET /api/search
```

**Query Parameters:**
- `q`: Search query (required)
- `entity_types`: Comma-separated list of entity types to search (leads, properties, users, tasks, documents)
- `limit`: Number of results per entity type (default: 20, max: 100)
- `offset`: Pagination offset
- `sort`: Sort field (relevance, created_at, updated_at)
- `filters`: Additional filters as JSON string

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "downtown seattle condo",
    "totalResults": 156,
    "searchTime": 45,
    "results": {
      "leads": {
        "total": 45,
        "items": [
          {
            "id": 101,
            "type": "lead",
            "name": "Sarah Johnson",
            "email": "sarah@example.com",
            "score": 89.5,
            "location": "Seattle, WA",
            "budget": 750000,
            "relevance": 0.95,
            "highlights": {
              "name": "<mark>Sarah</mark> <mark>Johnson</mark>",
              "location": "<mark>Seattle</mark>, WA"
            },
            "lastActivity": "2025-01-15T10:30:00Z"
          }
        ]
      },
      "properties": {
        "total": 89,
        "items": [
          {
            "id": 123,
            "type": "property",
            "address": "456 Pine Street, Seattle, WA",
            "propertyType": "condo",
            "price": 725000,
            "relevance": 0.92,
            "highlights": {
              "address": "456 Pine Street, <mark>Seattle</mark>, WA",
              "propertyType": "<mark>condo</mark>"
            }
          }
        ]
      },
      "users": {
        "total": 12,
        "items": [
          {
            "id": 456,
            "type": "user",
            "name": "John Smith",
            "email": "john@agency.com",
            "role": "agent",
            "specialties": ["downtown", "condos"],
            "relevance": 0.78,
            "highlights": {
              "specialties": ["<mark>downtown</mark>", "<mark>condos</mark>"]
            }
          }
        ]
      },
      "tasks": {
        "total": 8,
        "items": [
          {
            "id": 234,
            "type": "task",
            "title": "Show downtown condo to Sarah Johnson",
            "status": "pending",
            "relevance": 0.85,
            "highlights": {
              "title": "Show <mark>downtown</mark> <mark>condo</mark> to <mark>Sarah</mark> <mark>Johnson</mark>"
            }
          }
        ]
      },
      "documents": {
        "total": 2,
        "items": [
          {
            "id": 345,
            "type": "document",
            "title": "Downtown Seattle Market Analysis",
            "contentType": "pdf",
            "relevance": 0.88,
            "highlights": {
              "title": "<mark>Downtown</mark> <mark>Seattle</mark> Market Analysis"
            }
          }
        ]
      }
    },
    "facets": {
      "entity_types": {
        "leads": 45,
        "properties": 89,
        "users": 12,
        "tasks": 8,
        "documents": 2
      },
      "property_types": {
        "condo": 67,
        "single_family": 22
      },
      "price_ranges": {
        "0-500k": 12,
        "500k-1m": 156,
        "1m+": 23
      }
    },
    "suggestions": [
      "downtown seattle luxury condos",
      "seattle downtown real estate",
      "condos downtown seattle wa"
    ]
  }
}
```

### Advanced Search Query
Perform complex searches with boolean operators and field-specific queries.

```http
POST /api/search/advanced
```

**Request Body:**
```json
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "downtown seattle",
            "fields": ["address", "city", "description"],
            "fuzziness": "AUTO"
          }
        },
        {
          "range": {
            "price": {
              "gte": 500000,
              "lte": 1000000
            }
          }
        }
      ],
      "should": [
        {
          "term": {
            "property_type": "condo"
          }
        },
        {
          "term": {
            "features": "parking"
          }
        }
      ],
      "must_not": [
        {
          "term": {
            "status": "sold"
          }
        }
      ]
    }
  },
  "entity_types": ["properties"],
  "sort": [
    {
      "relevance": "desc"
    },
    {
      "price": "asc"
    }
  ],
  "aggregations": {
    "price_ranges": {
      "range": {
        "field": "price",
        "ranges": [
          { "to": 500000 },
          { "from": 500000, "to": 1000000 },
          { "from": 1000000 }
        ]
      }
    },
    "property_types": {
      "terms": {
        "field": "property_type"
      }
    }
  },
  "size": 20,
  "from": 0
}
```

---

## 👥 Lead Search

### Search Leads
Advanced search specifically for leads with ML-powered ranking.

```http
GET /api/search/leads
```

**Query Parameters:**
- `q`: Search query
- `score_min`: Minimum lead score
- `score_max`: Maximum lead score
- `budget_min`: Minimum budget
- `budget_max`: Maximum budget
- `location`: Location filter
- `status`: Lead status filter
- `assigned_to`: Assigned agent filter
- `created_from`: Created date from
- `created_to`: Created date to
- `sort`: Sort field (score, created_at, last_activity)
- `limit`: Number of results

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "luxury buyer seattle",
    "total": 67,
    "results": [
      {
        "id": 101,
        "name": "Sarah Johnson",
        "email": "sarah@example.com",
        "phone": "(206) 555-0123",
        "score": 92.3,
        "conversionProbability": 0.78,
        "budget": 850000,
        "timeline": "3-6 months",
        "location": "Seattle, WA",
        "propertyType": "condo",
        "status": "qualified",
        "assignedTo": {
          "id": 456,
          "name": "John Smith"
        },
        "lastActivity": "2025-01-15T10:30:00Z",
        "tags": ["luxury", "condo", "seattle"],
        "relevance": 0.96,
        "highlights": {
          "tags": ["<mark>luxury</mark>", "condo", "<mark>seattle</mark>"]
        }
      }
    ],
    "facets": {
      "score_ranges": {
        "90-100": 23,
        "80-89": 34,
        "70-79": 10
      },
      "budget_ranges": {
        "0-500k": 5,
        "500k-1m": 45,
        "1m+": 17
      },
      "locations": {
        "Seattle, WA": 45,
        "Bellevue, WA": 12,
        "Kirkland, WA": 10
      }
    },
    "mlInsights": {
      "averageScore": 82.4,
      "topPerformingSegment": "luxury_buyers",
      "recommendedActions": [
        "Prioritize leads with score > 85",
        "Focus on 3-6 month timeline leads"
      ]
    }
  }
}
```

### Lead Similarity Search
Find leads similar to a given lead using ML clustering.

```http
GET /api/search/leads/{leadId}/similar
```

**Query Parameters:**
- `limit`: Number of similar leads to return (default: 10)
- `min_similarity`: Minimum similarity score (0.0-1.0, default: 0.7)

**Response:**
```json
{
  "success": true,
  "data": {
    "sourceLead": {
      "id": 101,
      "name": "Sarah Johnson",
      "score": 92.3,
      "budget": 850000
    },
    "similarLeads": [
      {
        "id": 102,
        "name": "Michael Chen",
        "similarity": 0.89,
        "sharedTraits": ["budget_range", "timeline", "property_type"],
        "differences": ["location"],
        "recommendations": [
          "Cross-sell Seattle properties to Michael",
          "Similar conversion probability"
        ]
      },
      {
        "id": 103,
        "name": "Emily Davis",
        "similarity": 0.85,
        "sharedTraits": ["budget_range", "property_type"],
        "differences": ["timeline"],
        "recommendations": [
          "Emily has longer timeline - nurture accordingly"
        ]
      }
    ],
    "clusterInsights": {
      "clusterSize": 15,
      "averageScore": 88.2,
      "commonTraits": ["luxury_budget", "condo_preference", "urban_location"],
      "conversionRate": 0.72
    }
  }
}
```

---

## 🏠 Property Search

### Advanced Property Search
Comprehensive property search with location-based and feature filtering.

```http
GET /api/search/properties
```

**Query Parameters:**
- `q`: General search query
- `property_type`: Property type filter
- `listing_type`: Sale/rent filter
- `min_price`: Minimum price
- `max_price`: Maximum price
- `bedrooms`: Number of bedrooms
- `bathrooms`: Number of bathrooms
- `min_sqft`: Minimum square footage
- `max_sqft`: Maximum square footage
- `year_built_min`: Minimum year built
- `features`: Comma-separated features
- `location`: Location search
- `radius`: Search radius in miles
- `lat`: Latitude for radius search
- `lng`: Longitude for radius search
- `sort`: Sort field
- `limit`: Number of results

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "downtown seattle condo",
    "total": 89,
    "results": [
      {
        "id": 123,
        "mlsId": "MLS123456",
        "address": "456 Pine Street",
        "city": "Seattle",
        "state": "WA",
        "zipCode": "98101",
        "propertyType": "condo",
        "listingType": "sale",
        "price": 725000,
        "bedrooms": 2,
        "bathrooms": 2,
        "squareFeet": 1200,
        "yearBuilt": 2015,
        "features": ["parking", "gym", "concierge"],
        "images": [
          {
            "url": "https://cdn.example.com/properties/123/main.jpg",
            "type": "main"
          }
        ],
        "distance": 0.3,
        "relevance": 0.94,
        "highlights": {
          "address": "456 Pine Street",
          "city": "<mark>Seattle</mark>",
          "propertyType": "<mark>condo</mark>"
        },
        "agent": {
          "id": 456,
          "name": "John Smith"
        }
      }
    ],
    "facets": {
      "price_ranges": {
        "0-500k": 12,
        "500k-750k": 45,
        "750k-1m": 23,
        "1m+": 9
      },
      "bedrooms": {
        "1": 15,
        "2": 38,
        "3": 28,
        "4+": 8
      },
      "property_types": {
        "condo": 67,
        "townhouse": 15,
        "single_family": 7
      },
      "features": {
        "parking": 78,
        "gym": 45,
        "concierge": 23,
        "balcony": 56
      }
    },
    "mapBounds": {
      "north": 47.6205,
      "south": 47.5952,
      "east": -122.3200,
      "west": -122.3500
    },
    "marketInsights": {
      "averagePrice": 685000,
      "pricePerSqft": 571,
      "daysOnMarket": 18,
      "inventory": 89
    }
  }
}
```

### Property Recommendations
Get AI-powered property recommendations for a lead.

```http
GET /api/search/properties/recommend/{leadId}
```

**Query Parameters:**
- `limit`: Number of recommendations (default: 10)
- `min_score`: Minimum recommendation score

**Response:**
```json
{
  "success": true,
  "data": {
    "lead": {
      "id": 101,
      "name": "Sarah Johnson",
      "budget": 850000,
      "preferences": {
        "propertyType": "condo",
        "bedrooms": 2,
        "location": "downtown"
      }
    },
    "recommendations": [
      {
        "propertyId": 123,
        "matchScore": 0.94,
        "matchReasons": [
          "Budget perfectly aligned ($725k vs $850k budget)",
          "Condo type matches preference",
          "2 bedrooms meets requirement",
          "Downtown location ideal",
          "Modern building with desired amenities"
        ],
        "property": {
          "id": 123,
          "address": "456 Pine Street",
          "price": 725000,
          "bedrooms": 2,
          "propertyType": "condo"
        },
        "insights": {
          "marketValue": "below_market",
          "urgency": "high",
          "competition": "medium"
        }
      }
    ],
    "marketContext": {
      "averagePrice": 785000,
      "inventory": 156,
      "priceTrend": "stable",
      "buyerDemand": "high"
    }
  }
}
```

---

## 👤 User Search

### Search Users
Find users by name, role, specialty, or other attributes.

```http
GET /api/search/users
```

**Query Parameters:**
- `q`: Search query
- `role`: Role filter
- `specialties`: Comma-separated specialties
- `location`: Location filter
- `performance_min`: Minimum performance score
- `active_only`: Only active users (default: true)

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "luxury specialist seattle",
    "total": 8,
    "results": [
      {
        "id": 456,
        "name": "John Smith",
        "email": "john@agency.com",
        "role": "senior_agent",
        "specialties": ["luxury", "condos", "downtown"],
        "location": "Seattle, WA",
        "performance": {
          "score": 92.3,
          "dealsClosed": 34,
          "revenue": 12500000
        },
        "relevance": 0.96,
        "highlights": {
          "specialties": ["<mark>luxury</mark>", "condos", "<mark>downtown</mark>"],
          "location": "<mark>Seattle</mark>, WA"
        }
      }
    ],
    "facets": {
      "roles": {
        "senior_agent": 3,
        "agent": 4,
        "manager": 1
      },
      "specialties": {
        "luxury": 5,
        "condos": 6,
        "downtown": 4,
        "investment": 3
      }
    }
  }
}
```

---

## 📋 Task Search

### Search Tasks
Find tasks by content, status, assignee, or related entities.

```http
GET /api/search/tasks
```

**Query Parameters:**
- `q`: Search query
- `status`: Task status filter
- `assigned_to`: Assignee filter
- `lead_id`: Related lead filter
- `priority`: Priority filter
- `due_from`: Due date from
- `due_to`: Due date to
- `overdue`: Include overdue tasks

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "follow up sarah johnson",
    "total": 12,
    "results": [
      {
        "id": 234,
        "title": "Follow up with Sarah Johnson",
        "description": "Call Sarah to discuss downtown condo options",
        "type": "call",
        "status": "pending",
        "priority": "high",
        "assignedTo": {
          "id": 456,
          "name": "John Smith"
        },
        "lead": {
          "id": 101,
          "name": "Sarah Johnson"
        },
        "dueDate": "2025-01-16T14:00:00Z",
        "relevance": 0.98,
        "highlights": {
          "title": "<mark>Follow</mark> <mark>up</mark> with <mark>Sarah</mark> <mark>Johnson</mark>",
          "description": "Call <mark>Sarah</mark> to discuss downtown condo options"
        }
      }
    ],
    "facets": {
      "status": {
        "pending": 8,
        "in_progress": 3,
        "completed": 1
      },
      "priority": {
        "high": 6,
        "medium": 4,
        "low": 2
      },
      "types": {
        "call": 7,
        "email": 3,
        "meeting": 2
      }
    }
  }
}
```

---

## 📄 Document Search

### Search Documents
Search through documents, contracts, and attachments.

```http
GET /api/search/documents
```

**Query Parameters:**
- `q`: Search query
- `type`: Document type filter
- `entity_id`: Related entity ID
- `entity_type`: Related entity type
- `date_from`: Date from
- `date_to`: Date to
- `author`: Author filter

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "contract sarah johnson",
    "total": 5,
    "results": [
      {
        "id": 345,
        "title": "Purchase Contract - Sarah Johnson",
        "type": "contract",
        "contentType": "pdf",
        "size": 2048576,
        "entity": {
          "id": 101,
          "type": "lead",
          "name": "Sarah Johnson"
        },
        "author": {
          "id": 456,
          "name": "John Smith"
        },
        "createdAt": "2025-01-15T10:00:00Z",
        "relevance": 0.92,
        "highlights": {
          "title": "Purchase Contract - <mark>Sarah</mark> <mark>Johnson</mark>",
          "content": "...signed by <mark>Sarah</mark> <mark>Johnson</mark>..."
        },
        "preview": "This Purchase and Sale Agreement..."
      }
    ],
    "facets": {
      "types": {
        "contract": 3,
        "report": 1,
        "document": 1
      },
      "content_types": {
        "pdf": 4,
        "docx": 1
      }
    }
  }
}
```

---

## 🔧 Search Administration

### Get Search Analytics
Get search performance and usage analytics.

```http
GET /api/search/analytics
```

**Query Parameters:**
- `period`: Time period (7d, 30d, 90d) - default: 30d

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "usage": {
      "totalSearches": 12500,
      "uniqueUsers": 89,
      "averageResults": 24.5,
      "averageResponseTime": 45,
      "popularQueries": [
        { "query": "downtown seattle", "count": 234 },
        { "query": "luxury condo", "count": 189 },
        { "query": "single family home", "count": 156 }
      ]
    },
    "performance": {
      "searchSuccessRate": 0.945,
      "zeroResultsRate": 0.023,
      "clickThroughRate": 0.678,
      "entityDistribution": {
        "leads": 0.35,
        "properties": 0.42,
        "users": 0.15,
        "tasks": 0.06,
        "documents": 0.02
      }
    },
    "trends": {
      "dailySearches": [
        { "date": "2025-01-08", "searches": 345 },
        { "date": "2025-01-09", "searches": 412 },
        { "date": "2025-01-10", "searches": 389 }
      ]
    }
  }
}
```

### Reindex Search Data
Trigger reindexing of search data (admin only).

```http
POST /api/search/reindex
```

**Request Body:**
```json
{
  "entity_types": ["leads", "properties", "users"],
  "full_reindex": false,
  "priority": "normal"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "reindex_12345",
    "status": "queued",
    "entityTypes": ["leads", "properties", "users"],
    "estimatedDuration": "15-20 minutes",
    "progress": {
      "total": 12500,
      "completed": 0,
      "percentage": 0
    }
  }
}
```

---

## 🔄 Saved Searches

### Save Search
Save a search query for future use.

```http
POST /api/search/saved
```

**Request Body:**
```json
{
  "name": "Downtown Luxury Condos",
  "description": "High-end condos in downtown Seattle",
  "query": {
    "q": "downtown seattle luxury condo",
    "entity_types": "properties",
    "filters": {
      "min_price": 750000,
      "max_price": 2000000,
      "property_type": "condo"
    }
  },
  "is_public": false,
  "notifications": {
    "enabled": true,
    "frequency": "daily",
    "new_results_only": true
  }
}
```

### List Saved Searches
Get user's saved searches.

```http
GET /api/search/saved
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "saved_001",
      "name": "Downtown Luxury Condos",
      "description": "High-end condos in downtown Seattle",
      "query": { ... },
      "lastRun": "2025-01-15T10:00:00Z",
      "resultCount": 23,
      "newResults": 3,
      "notifications": {
        "enabled": true,
        "lastNotification": "2025-01-15T09:00:00Z"
      },
      "createdAt": "2025-01-10T08:00:00Z"
    }
  ]
}
```

### Execute Saved Search
Run a saved search query.

```http
GET /api/search/saved/{savedId}/execute
```

**Response:**
```json
{
  "success": true,
  "data": {
    "savedSearch": {
      "id": "saved_001",
      "name": "Downtown Luxury Condos"
    },
    "results": { ... }, // Same format as regular search
    "newResults": 3,
    "lastRun": "2025-01-15T10:00:00Z"
  }
}
```

---

## 🚨 Error Handling

### Common Error Responses

**Search Query Too Broad:**
```json
{
  "success": false,
  "error": {
    "code": "QUERY_TOO_BROAD",
    "message": "Search query is too broad, please add more specific terms",
    "details": {
      "query": "a",
      "suggestion": "Try adding location, property type, or price range"
    }
  }
}
```

**Search Service Unavailable:**
```json
{
  "success": false,
  "error": {
    "code": "SEARCH_UNAVAILABLE",
    "message": "Search service is temporarily unavailable",
    "details": {
      "retryAfter": 30,
      "incidentId": "search_001"
    }
  }
}
```

**Invalid Search Syntax:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SEARCH_SYNTAX",
    "message": "Invalid search query syntax",
    "details": {
      "query": "price:>500000 AND",
      "error": "Incomplete boolean expression",
      "suggestion": "Complete the boolean expression or remove the operator"
    }
  }
}
```

---

## 📊 Rate Limiting

- **Global Search**: 100 requests per minute
- **Entity-Specific Search**: 200 requests per minute
- **Advanced Search**: 50 requests per minute
- **Search Analytics**: 100 requests per minute

---

## 🔍 Best Practices

### Query Optimization
1. **Specific Keywords**: Use specific terms rather than general words
2. **Field-Specific Search**: Use field prefixes for targeted results
3. **Boolean Operators**: Use AND, OR, NOT for complex queries
4. **Phrase Search**: Use quotes for exact phrases

### Result Filtering
1. **Facet Navigation**: Use facets to narrow down results
2. **Range Filters**: Use price, date, and numeric ranges effectively
3. **Location Search**: Combine text search with geographic filters
4. **Relevance Sorting**: Sort by relevance for best results

### Performance Considerations
1. **Pagination**: Always use pagination for large result sets
2. **Caching**: Search results are cached for improved performance
3. **Indexing**: Regular reindexing ensures up-to-date results
4. **Load Balancing**: Distributed search for high availability

This comprehensive Global Search & Discovery API provides intelligent search capabilities across all entities in the Real Estate CRM system, enabling users to find exactly what they need quickly and efficiently.