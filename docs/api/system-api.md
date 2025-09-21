# 🔧 System Management API

## Overview

The System Management API provides comprehensive system administration, monitoring, configuration management, and maintenance capabilities for the Real Estate CRM system. This API enables administrators to manage system health, performance, security, backups, and operational aspects.

## Base URL
```
https://api.realestate-crm.com/v1/system
```

## Authentication
All System API endpoints require JWT authentication with admin-level permissions.

---

## 📊 System Health & Monitoring

### Get System Health Status
Get comprehensive system health and status information.

```http
GET /api/system/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "status": "healthy",
      "uptime": "15d 8h 32m",
      "lastHealthCheck": "2025-01-15T10:30:00Z",
      "version": "2.1.0",
      "environment": "production"
    },
    "services": {
      "api": {
        "status": "healthy",
        "responseTime": "45ms",
        "uptime": "15d 8h 32m",
        "version": "2.1.0"
      },
      "database": {
        "status": "healthy",
        "responseTime": "12ms",
        "connections": {
          "active": 23,
          "idle": 12,
          "total": 35,
          "max": 100
        },
        "version": "PostgreSQL 13.7"
      },
      "redis": {
        "status": "healthy",
        "responseTime": "2ms",
        "memory": {
          "used": "256MB",
          "available": "1.2GB",
          "percentage": 17.6
        },
        "connections": 45
      },
      "ml_service": {
        "status": "healthy",
        "responseTime": "150ms",
        "models": {
          "active": 5,
          "total": 8
        },
        "predictions_today": 1250
      },
      "notification_service": {
        "status": "healthy",
        "responseTime": "25ms",
        "queue_size": 12,
        "delivered_today": 890
      }
    },
    "resources": {
      "cpu": {
        "usage": 34.5,
        "cores": 8,
        "load_average": [1.2, 1.5, 1.8]
      },
      "memory": {
        "used": "4.2GB",
        "available": "7.8GB",
        "percentage": 35.0
      },
      "disk": {
        "used": "45.2GB",
        "available": "154.8GB",
        "percentage": 22.6
      },
      "network": {
        "bytes_in": "1.2GB",
        "bytes_out": "890MB",
        "connections": 1250
      }
    },
    "alerts": {
      "critical": 0,
      "warning": 2,
      "info": 5
    }
  }
}
```

### Get System Metrics
Get detailed system performance metrics and KPIs.

```http
GET /api/system/metrics
```

**Query Parameters:**
- `period` (optional): Time period (1h, 24h, 7d, 30d) - default: 24h
- `metrics` (optional): Comma-separated list of metrics to include

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "24h",
    "metrics": {
      "requests": {
        "total": 45620,
        "successful": 45230,
        "failed": 390,
        "average_response_time": "125ms",
        "p95_response_time": "450ms",
        "p99_response_time": "890ms"
      },
      "database": {
        "queries_per_second": 234.5,
        "slow_queries": 12,
        "connection_pool_usage": 0.65,
        "cache_hit_rate": 0.89
      },
      "users": {
        "active_users": 1250,
        "concurrent_sessions": 89,
        "login_attempts": 1450,
        "failed_logins": 23
      },
      "business": {
        "leads_created": 145,
        "properties_listed": 23,
        "deals_closed": 8,
        "conversion_rate": 0.078
      },
      "ml": {
        "predictions_made": 1250,
        "model_accuracy": 0.89,
        "feature_processing_time": "45ms",
        "model_training_jobs": 2
      }
    },
    "trends": {
      "response_time_trend": [
        { "timestamp": "2025-01-15T08:00:00Z", "value": 120 },
        { "timestamp": "2025-01-15T09:00:00Z", "value": 135 },
        { "timestamp": "2025-01-15T10:00:00Z", "value": 125 }
      ],
      "error_rate_trend": [
        { "timestamp": "2025-01-15T08:00:00Z", "value": 0.008 },
        { "timestamp": "2025-01-15T09:00:00Z", "value": 0.012 },
        { "timestamp": "2025-01-15T10:00:00Z", "value": 0.009 }
      ]
    }
  }
}
```

### Get System Logs
Retrieve system logs for monitoring and debugging.

```http
GET /api/system/logs
```

**Query Parameters:**
- `level` (optional): Log level (error, warn, info, debug)
- `service` (optional): Service name filter
- `from` (optional): Start timestamp
- `to` (optional): End timestamp
- `limit` (optional): Number of logs to return (default: 100, max: 1000)

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "timestamp": "2025-01-15T10:30:15Z",
        "level": "error",
        "service": "api",
        "message": "Database connection timeout",
        "details": {
          "error": "Connection timeout after 30 seconds",
          "query": "SELECT * FROM leads WHERE id = $1",
          "duration": 30045
        },
        "trace_id": "abc-123-def-456",
        "user_id": null
      },
      {
        "timestamp": "2025-01-15T10:29:45Z",
        "level": "warn",
        "service": "ml_service",
        "message": "High memory usage detected",
        "details": {
          "memory_usage": "85%",
          "threshold": "80%",
          "recommendation": "Consider scaling resources"
        }
      },
      {
        "timestamp": "2025-01-15T10:28:30Z",
        "level": "info",
        "service": "notification_service",
        "message": "Bulk notification sent successfully",
        "details": {
          "batch_id": "batch_12345",
          "recipients": 150,
          "delivered": 148,
          "failed": 2
        }
      }
    ],
    "pagination": {
      "has_more": true,
      "next_cursor": "2025-01-15T10:28:29Z"
    },
    "summary": {
      "total_logs": 1250,
      "error_count": 5,
      "warning_count": 23,
      "info_count": 1222
    }
  }
}
```

---

## ⚙️ Configuration Management

### Get System Configuration
Get current system configuration settings.

```http
GET /api/system/config
```

**Query Parameters:**
- `category` (optional): Configuration category filter
- `include_sensitive` (optional): Include sensitive values (admin only)

**Response:**
```json
{
  "success": true,
  "data": {
    "database": {
      "host": "db.internal.company.com",
      "port": 5432,
      "database": "real_estate_crm",
      "max_connections": 100,
      "connection_timeout": 30000
    },
    "redis": {
      "host": "redis.internal.company.com",
      "port": 6379,
      "password": "***",
      "ttl": 3600
    },
    "ml": {
      "model_path": "/opt/models",
      "batch_size": 32,
      "confidence_threshold": 0.8,
      "feature_cache_ttl": 1800
    },
    "notifications": {
      "smtp_host": "smtp.company.com",
      "smtp_port": 587,
      "from_email": "noreply@company.com",
      "rate_limit": 100
    },
    "security": {
      "jwt_secret": "***",
      "session_timeout": 3600,
      "password_min_length": 8,
      "max_login_attempts": 5
    },
    "features": {
      "ml_scoring": true,
      "automated_workflows": true,
      "real_time_updates": true,
      "advanced_analytics": true
    }
  }
}
```

### Update System Configuration
Update system configuration settings.

```http
PUT /api/system/config
```

**Request Body:**
```json
{
  "category": "ml",
  "settings": {
    "confidence_threshold": 0.85,
    "batch_size": 64
  },
  "reason": "Performance optimization",
  "rollback_on_failure": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "changes": [
      {
        "category": "ml",
        "key": "confidence_threshold",
        "old_value": 0.8,
        "new_value": 0.85
      },
      {
        "category": "ml",
        "key": "batch_size",
        "old_value": 32,
        "new_value": 64
      }
    ],
    "applied_at": "2025-01-15T11:00:00Z",
    "requires_restart": false,
    "rollback_available": true,
    "rollback_id": "rollback_12345"
  }
}
```

### Rollback Configuration Changes
Rollback configuration changes to a previous state.

```http
POST /api/system/config/rollback/{rollbackId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rollback_id": "rollback_12345",
    "changes_reverted": 2,
    "restarted_services": ["ml_service"],
    "completed_at": "2025-01-15T11:05:00Z"
  }
}
```

---

## 💾 Backup & Recovery

### Create System Backup
Initiate a system backup operation.

```http
POST /api/system/backup
```

**Request Body:**
```json
{
  "type": "full", // full, incremental, differential
  "include_data": true,
  "include_config": true,
  "include_logs": false,
  "compression": "gzip",
  "encryption": true,
  "retention_days": 30,
  "notification_emails": ["admin@company.com"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "backup_id": "backup_20250115_110000",
    "type": "full",
    "status": "in_progress",
    "estimated_completion": "2025-01-15T11:30:00Z",
    "size_estimate": "2.5GB",
    "progress": {
      "percentage": 0,
      "current_step": "Initializing backup",
      "steps_completed": 0,
      "total_steps": 8
    }
  }
}
```

### Get Backup Status
Check the status of a backup operation.

```http
GET /api/system/backup/{backupId}/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "backup_id": "backup_20250115_110000",
    "status": "completed",
    "started_at": "2025-01-15T11:00:00Z",
    "completed_at": "2025-01-15T11:25:30Z",
    "duration": "25m 30s",
    "size": "2.3GB",
    "compression_ratio": 0.75,
    "files_backed_up": 15420,
    "verification_status": "passed",
    "download_url": "https://backups.company.com/backup_20250115_110000.tar.gz.enc",
    "expires_at": "2025-02-14T11:25:30Z"
  }
}
```

### List Available Backups
Get list of available backup files.

```http
GET /api/system/backups
```

**Query Parameters:**
- `type` (optional): Backup type filter
- `status` (optional): Status filter (completed, failed)
- `from` (optional): Start date
- `to` (optional): End date

**Response:**
```json
{
  "success": true,
  "data": {
    "backups": [
      {
        "id": "backup_20250115_110000",
        "type": "full",
        "status": "completed",
        "created_at": "2025-01-15T11:25:30Z",
        "size": "2.3GB",
        "expires_at": "2025-02-14T11:25:30Z",
        "download_available": true
      },
      {
        "id": "backup_20250114_110000",
        "type": "incremental",
        "status": "completed",
        "created_at": "2025-01-14T11:15:20Z",
        "size": "450MB",
        "expires_at": "2025-02-13T11:15:20Z",
        "download_available": true
      }
    ],
    "summary": {
      "total_backups": 45,
      "total_size": "156GB",
      "oldest_backup": "2024-12-01T11:00:00Z",
      "newest_backup": "2025-01-15T11:25:30Z"
    }
  }
}
```

### Restore from Backup
Initiate a system restore operation.

```http
POST /api/system/restore/{backupId}
```

**Request Body:**
```json
{
  "target_environment": "staging",
  "components": ["database", "files", "config"],
  "validate_before_restore": true,
  "create_backup_before_restore": true,
  "notification_emails": ["admin@company.com"],
  "maintenance_mode": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "restore_id": "restore_20250115_120000",
    "backup_id": "backup_20250115_110000",
    "status": "scheduled",
    "scheduled_at": "2025-01-15T12:00:00Z",
    "estimated_duration": "45 minutes",
    "maintenance_mode_enabled": true,
    "rollback_available": true
  }
}
```

---

## 🚨 Alert Management

### Get System Alerts
Get current system alerts and notifications.

```http
GET /api/system/alerts
```

**Query Parameters:**
- `status` (optional): Alert status (active, acknowledged, resolved)
- `severity` (optional): Alert severity (critical, warning, info)
- `service` (optional): Service filter
- `limit` (optional): Number of alerts to return

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "alert_001",
        "severity": "critical",
        "status": "active",
        "title": "Database Connection Pool Exhausted",
        "description": "Database connection pool has reached maximum capacity",
        "service": "database",
        "created_at": "2025-01-15T10:45:00Z",
        "updated_at": "2025-01-15T10:45:00Z",
        "acknowledged_by": null,
        "resolved_at": null,
        "metrics": {
          "active_connections": 100,
          "max_connections": 100,
          "waiting_queries": 25
        },
        "recommendations": [
          "Increase connection pool size",
          "Optimize slow queries",
          "Consider database scaling"
        ]
      },
      {
        "id": "alert_002",
        "severity": "warning",
        "status": "acknowledged",
        "title": "High Memory Usage",
        "description": "System memory usage above 80% threshold",
        "service": "system",
        "created_at": "2025-01-15T10:30:00Z",
        "acknowledged_at": "2025-01-15T10:35:00Z",
        "acknowledged_by": "admin_user",
        "metrics": {
          "memory_usage": 85.2,
          "available_memory": "2.1GB",
          "threshold": 80
        }
      }
    ],
    "summary": {
      "total_alerts": 15,
      "active_alerts": 3,
      "acknowledged_alerts": 8,
      "resolved_alerts": 4,
      "by_severity": {
        "critical": 1,
        "warning": 8,
        "info": 6
      }
    }
  }
}
```

### Acknowledge Alert
Acknowledge an alert to indicate it's being addressed.

```http
PUT /api/system/alerts/{alertId}/acknowledge
```

**Request Body:**
```json
{
  "notes": "Investigating database connection issues",
  "assigned_to": "db_admin",
  "estimated_resolution": "2025-01-15T12:00:00Z"
}
```

### Resolve Alert
Mark an alert as resolved.

```http
PUT /api/system/alerts/{alertId}/resolve
```

**Request Body:**
```json
{
  "resolution": "Increased connection pool size from 100 to 150",
  "notes": "Issue resolved by scaling database connections",
  "preventive_measures": "Monitor connection pool usage with alerts at 80%"
}
```

---

## 🔄 Maintenance Operations

### Enable Maintenance Mode
Put the system into maintenance mode.

```http
POST /api/system/maintenance/enable
```

**Request Body:**
```json
{
  "reason": "Database schema migration",
  "estimated_duration": 30,
  "allowed_ips": ["192.168.1.100", "10.0.0.50"],
  "notification_message": "System is undergoing maintenance. Expected downtime: 30 minutes.",
  "auto_disable": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "maintenance_id": "maint_20250115_120000",
    "status": "enabled",
    "enabled_at": "2025-01-15T12:00:00Z",
    "estimated_completion": "2025-01-15T12:30:00Z",
    "auto_disable": true
  }
}
```

### Disable Maintenance Mode
Take the system out of maintenance mode.

```http
POST /api/system/maintenance/disable
```

**Request Body:**
```json
{
  "maintenance_id": "maint_20250115_120000",
  "completion_notes": "Database migration completed successfully"
}
```

### Get Maintenance Status
Check current maintenance mode status.

```http
GET /api/system/maintenance/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "maintenance_mode": true,
    "maintenance_id": "maint_20250115_120000",
    "reason": "Database schema migration",
    "enabled_at": "2025-01-15T12:00:00Z",
    "estimated_completion": "2025-01-15T12:30:00Z",
    "time_remaining": "15 minutes",
    "allowed_ips": ["192.168.1.100", "10.0.0.50"],
    "active_connections": 2
  }
}
```

---

## 🔐 Security Management

### Get Security Audit Logs
Get security-related audit logs and events.

```http
GET /api/system/security/audit
```

**Query Parameters:**
- `event_type` (optional): Security event type filter
- `user_id` (optional): User ID filter
- `from` (optional): Start timestamp
- `to` (optional): End timestamp

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "audit_001",
        "timestamp": "2025-01-15T10:45:00Z",
        "event_type": "failed_login",
        "user_id": null,
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0...",
        "details": {
          "username": "admin",
          "attempt_count": 3,
          "lockout_duration": 900
        },
        "severity": "medium",
        "location": {
          "country": "US",
          "city": "Seattle",
          "coordinates": [47.6062, -122.3321]
        }
      },
      {
        "id": "audit_002",
        "timestamp": "2025-01-15T10:30:00Z",
        "event_type": "permission_change",
        "user_id": 456,
        "ip_address": "10.0.0.50",
        "details": {
          "changed_by": "admin_user",
          "old_permissions": ["leads.read"],
          "new_permissions": ["leads.read", "leads.write"],
          "reason": "Role promotion"
        },
        "severity": "low"
      }
    ],
    "summary": {
      "total_events": 1250,
      "failed_logins": 23,
      "permission_changes": 8,
      "suspicious_activities": 3,
      "time_range": "24h"
    }
  }
}
```

### Update Security Settings
Update system security configuration.

```http
PUT /api/system/security/settings
```

**Request Body:**
```json
{
  "password_policy": {
    "min_length": 12,
    "require_uppercase": true,
    "require_lowercase": true,
    "require_numbers": true,
    "require_symbols": true,
    "max_age_days": 90
  },
  "session_policy": {
    "timeout_minutes": 60,
    "max_concurrent_sessions": 5,
    "require_mfa": true
  },
  "access_policy": {
    "max_login_attempts": 5,
    "lockout_duration_minutes": 15,
    "ip_whitelist_enabled": true,
    "allowed_ips": ["192.168.0.0/16", "10.0.0.0/8"]
  }
}
```

---

## 📈 Performance Optimization

### Run Performance Analysis
Execute comprehensive performance analysis.

```http
POST /api/system/performance/analyze
```

**Request Body:**
```json
{
  "analysis_type": "comprehensive",
  "duration_minutes": 30,
  "include_database": true,
  "include_cache": true,
  "include_network": true,
  "generate_report": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis_id": "perf_20250115_130000",
    "status": "running",
    "estimated_completion": "2025-01-15T13:35:00Z",
    "components": ["database", "cache", "network", "application"],
    "progress": {
      "percentage": 0,
      "current_step": "Collecting system metrics",
      "steps_completed": 0,
      "total_steps": 12
    }
  }
}
```

### Get Performance Recommendations
Get AI-powered performance optimization recommendations.

```http
GET /api/system/performance/recommendations
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "id": "rec_001",
        "category": "database",
        "priority": "high",
        "title": "Add Database Index",
        "description": "Add composite index on leads(status, created_at) to improve query performance",
        "impact": "high",
        "effort": "low",
        "current_performance": "Query time: 450ms",
        "expected_improvement": "Query time: 45ms (90% improvement)",
        "implementation": "CREATE INDEX idx_leads_status_created ON leads(status, created_at);"
      },
      {
        "id": "rec_002",
        "category": "cache",
        "priority": "medium",
        "title": "Increase Redis Memory",
        "description": "Increase Redis memory allocation to reduce cache misses",
        "impact": "medium",
        "effort": "medium",
        "current_performance": "Cache hit rate: 78%",
        "expected_improvement": "Cache hit rate: 92% (14% improvement)"
      },
      {
        "id": "rec_003",
        "category": "application",
        "priority": "low",
        "title": "Optimize ML Model Loading",
        "description": "Implement lazy loading for ML models to reduce startup time",
        "impact": "low",
        "effort": "high",
        "current_performance": "Startup time: 45s",
        "expected_improvement": "Startup time: 15s (67% improvement)"
      }
    ],
    "summary": {
      "total_recommendations": 15,
      "high_priority": 3,
      "medium_priority": 7,
      "low_priority": 5,
      "estimated_benefit": "35% performance improvement",
      "estimated_effort": "2 weeks"
    }
  }
}
```

---

## 🚨 Error Handling

### Common Error Responses

**Service Unavailable:**
```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "System service is temporarily unavailable",
    "details": {
      "service": "database",
      "retry_after": 30,
      "incident_id": "incident_12345"
    }
  }
}
```

**Insufficient Permissions:**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Admin privileges required for this operation",
    "details": {
      "required_role": "admin",
      "user_role": "manager"
    }
  }
}
```

**Maintenance Mode Active:**
```json
{
  "success": false,
  "error": {
    "code": "MAINTENANCE_MODE",
    "message": "System is currently in maintenance mode",
    "details": {
      "maintenance_id": "maint_20250115_120000",
      "reason": "Database migration",
      "estimated_completion": "2025-01-15T12:30:00Z"
    }
  }
}
```

---

## 📊 Rate Limiting

- **Health Checks**: 100 requests per minute
- **Metrics Queries**: 50 requests per minute
- **Configuration Updates**: 20 requests per minute
- **Backup Operations**: 10 requests per minute
- **Maintenance Operations**: 10 requests per minute

---

## 🔍 Best Practices

### Monitoring Strategy
1. **Multi-Level Monitoring**: Implement application, infrastructure, and business metrics
2. **Alert Thresholds**: Set appropriate alert thresholds based on historical data
3. **Automated Responses**: Implement automated responses to common issues
4. **Regular Reviews**: Review monitoring effectiveness and adjust as needed

### Backup Strategy
1. **Regular Backups**: Schedule regular backups during low-traffic periods
2. **Multiple Locations**: Store backups in multiple geographic locations
3. **Encryption**: Encrypt all backup data both in transit and at rest
4. **Testing**: Regularly test backup restoration procedures

### Security Management
1. **Regular Audits**: Conduct regular security audits and penetration testing
2. **Access Reviews**: Regularly review and update user access permissions
3. **Incident Response**: Maintain documented incident response procedures
4. **Compliance**: Ensure compliance with relevant security standards

This comprehensive System Management API provides all the tools needed for system administration, monitoring, configuration management, and maintenance operations in the Real Estate CRM system.