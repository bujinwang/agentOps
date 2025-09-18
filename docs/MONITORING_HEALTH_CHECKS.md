# 🔍 Monitoring & Health Checks Guide

This comprehensive guide covers the monitoring and health check system implemented for the Real Estate CRM system, providing real-time visibility into application health, performance, and system status.

## 📊 Overview

The monitoring system provides multi-layer observability with:
- **Real-time Health Checks**: Application, database, cache, and external service monitoring
- **Performance Metrics**: Response times, throughput, error rates, and resource usage
- **Automated Alerting**: Intelligent alerting with configurable thresholds
- **Visual Dashboards**: Grafana dashboards for comprehensive monitoring
- **Historical Data**: Prometheus-based metrics storage and querying

## 🏥 Health Check System

### Health Check Endpoints

#### Basic Health Check
```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

**Status Codes:**
- `200`: Healthy
- `503`: Unhealthy (service unavailable)

#### Detailed Health Check
```bash
GET /health/detailed
```

**Response:**
```json
{
  "overall": "healthy",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 45,
      "poolStats": {
        "totalCount": 10,
        "idleCount": 7,
        "waitingCount": 0
      }
    },
    "cache": {
      "status": "healthy",
      "responseTime": 12,
      "cacheLayers": {
        "memory": true,
        "redis": true
      }
    },
    "application": {
      "status": "healthy",
      "metrics": {
        "avgResponseTime": 245.67,
        "avgMemoryUsage": 0.75,
        "errorRate": 0.002
      }
    }
  },
  "metrics": {
    "uptime": 3600,
    "memory": {
      "rss": 104857600,
      "heapTotal": 67108864,
      "heapUsed": 45000000
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Health Status Endpoint
```bash
GET /health/status
```

Returns the current cached health status for faster responses.

### Health Check Components

#### 1. Database Health Check
- **Connection Test**: Verifies database connectivity
- **Query Test**: Executes a simple SELECT query
- **Pool Statistics**: Monitors connection pool usage
- **Timeout**: 5 seconds maximum response time

#### 2. Cache Health Check
- **Connection Test**: Verifies Redis connectivity
- **Read/Write Test**: Performs cache operations
- **Layer Status**: Checks both memory and Redis layers
- **Timeout**: 3 seconds maximum response time

#### 3. Application Health Check
- **Performance Metrics**: Response times, memory usage, error rates
- **Threshold Comparison**: Compares against configured baselines
- **Service Dependencies**: Checks internal service health

#### 4. External Services Health Check
- **API Connectivity**: Tests external API endpoints
- **Response Validation**: Verifies expected responses
- **Timeout**: 10 seconds maximum response time

### Health Check Configuration

```javascript
const HEALTH_CONFIG = {
  cache: {
    enabled: true,
    ttl: 30,           // Cache health status for 30 seconds
    maxFailures: 3     // Allow 3 failures before marking unhealthy
  },
  timeouts: {
    database: 5000,    // 5 seconds
    redis: 3000,       // 3 seconds
    external: 10000    // 10 seconds
  },
  thresholds: {
    responseTime: 2000,  // 2 seconds max response time
    memoryUsage: 0.9,    // 90% max memory usage
    errorRate: 0.05      // 5% max error rate
  }
};
```

## 📈 Performance Monitoring

### Performance Metrics Endpoints

#### Application Performance Metrics
```bash
GET /api/performance/metrics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "uptime": 3600,
    "responseTimes": {
      "count": 150,
      "avg": 245.67,
      "p95": 890.12,
      "p99": 2100.45,
      "slowest": 3200.00
    }
  }
}
```

#### System Monitoring
```bash
GET /api/monitoring/system
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uptime": 3600,
    "memory": {
      "rss": 104857600,
      "heapTotal": 67108864,
      "heapUsed": 45000000,
      "external": 2048000
    },
    "cpu": {
      "user": 120000,
      "system": 30000
    },
    "platform": "linux",
    "arch": "x64",
    "nodeVersion": "v18.17.0",
    "environment": "production",
    "pid": 12345
  }
}
```

#### Service Monitoring
```bash
GET /api/monitoring/services
```

Returns detailed status of all monitored services.

#### Application Metrics
```bash
GET /api/monitoring/metrics
```

Returns historical performance data for analysis.

### Cache Monitoring

#### Cache Statistics
```bash
GET /api/cache/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "hits": 1250,
      "misses": 340,
      "sets": 890,
      "deletes": 45,
      "errors": 2,
      "hitRate": "78.62"
    },
    "memory": {
      "items": 245,
      "size": 245,
      "hitRate": "82.45"
    },
    "redis": {
      "available": true
    }
  }
}
```

#### Cache Health Check
```bash
GET /api/cache/health
```

Returns cache layer health status.

### Database Monitoring

#### Database Statistics
```bash
GET /api/database/stats
```

**Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "connections": {
    "total": 10,
    "idle": 7,
    "waiting": 0
  },
  "queries": {
    "avgQueryTime": 45.67,
    "slowQueries": 2,
    "totalQueries": 1500
  },
  "performance": {
    "avgQueryTime": 45.67,
    "slowQueryCount": 2,
    "totalQueries": 1500
  }
}
```

## 🚨 Alerting System

### Alert Types

#### Performance Alerts
- **High Response Time**: Average response time exceeds threshold
- **High Error Rate**: Error rate exceeds configured percentage
- **Memory Usage**: Memory usage exceeds safety threshold
- **CPU Usage**: CPU utilization exceeds safety threshold

#### System Alerts
- **Service Down**: Critical services become unavailable
- **Database Issues**: Connection problems or slow queries
- **Cache Issues**: Cache layer failures or high miss rates
- **External Service**: Third-party API failures

#### Security Alerts
- **Failed Logins**: High number of authentication failures
- **Suspicious Activity**: Unusual request patterns
- **Rate Limit Exceeded**: Traffic exceeds configured limits

### Alert Configuration

Alerts are configured in `monitoring/alert_rules.yml`:

```yaml
groups:
  - name: application_performance
    rules:
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"
```

### Alert Severity Levels

- **Critical**: Immediate action required (service down, data loss)
- **Warning**: Monitor closely, may require action
- **Info**: Track for trends, no immediate action needed

## 📊 Grafana Dashboards

### Available Dashboards

#### 1. Real Estate CRM - Overview
- **Application Health Status**: Overall system health
- **Response Time Metrics**: 50th, 95th, 99th percentiles
- **HTTP Request Rate**: Total requests and error rates
- **Error Rate Percentage**: Real-time error monitoring
- **Database Connections**: Active connection monitoring
- **Cache Hit Rate**: Cache performance metrics
- **System Resources**: CPU and memory usage

#### 2. Application Performance Dashboard
- **Request Latency**: Detailed response time analysis
- **Throughput**: Requests per second over time
- **Error Analysis**: Error patterns and trends
- **Memory Usage**: Heap and external memory monitoring
- **Garbage Collection**: GC pause times and frequency

#### 3. System Resources Dashboard
- **CPU Usage**: User and system CPU utilization
- **Memory Usage**: RAM and swap usage
- **Disk I/O**: Read/write operations and latency
- **Network I/O**: Bandwidth usage and errors
- **Load Average**: System load over time

#### 4. Database Performance Dashboard
- **Connection Pool**: Active and idle connections
- **Query Performance**: Slow query analysis
- **Transaction Rate**: TPS and transaction latency
- **Lock Contention**: Blocking and waiting queries
- **Storage Usage**: Database size and growth

### Dashboard Access

```bash
# Grafana Web Interface
URL: http://localhost:3001
Username: admin
Password: admin (change on first login)

# Dashboard URLs
Overview: http://localhost:3001/d/real-estate-crm-overview
Performance: http://localhost:3001/d/app-performance
System: http://localhost:3001/d/system-resources
Database: http://localhost:3001/d/database-performance
```

## 🔧 Monitoring Configuration

### Prometheus Configuration

The monitoring stack uses Prometheus for metrics collection:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'real-estate-crm-backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']
    scrape_interval: 30s

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']
    scrape_interval: 30s
```

### Alert Manager Configuration

Alerts are managed through AlertManager:

```yaml
# alertmanager.yml
route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'email-notifications'

receivers:
  - name: 'email-notifications'
    email_configs:
      - to: 'alerts@your-domain.com'
        from: 'alertmanager@your-domain.com'
        smarthost: 'smtp.gmail.com:587'
```

## 📈 Custom Metrics

### Application Metrics

The system exposes custom application metrics:

```javascript
// Response time histogram
http_request_duration_seconds_bucket{le="0.1"} 150
http_request_duration_seconds_bucket{le="0.5"} 450
http_request_duration_seconds_bucket{le="1.0"} 780
http_request_duration_seconds_bucket{le="2.0"} 920
http_request_duration_seconds_bucket{le="5.0"} 980
http_request_duration_seconds_bucket{le="+Inf"} 1000
http_request_duration_seconds_count 1000
http_request_duration_seconds_sum 2456.78

// Request counter
http_requests_total{method="GET",status="200"} 850
http_requests_total{method="POST",status="201"} 120
http_requests_total{method="GET",status="404"} 25
http_requests_total{method="POST",status="500"} 5

// Cache metrics
cache_hits_total 1250
cache_misses_total 340
cache_sets_total 890
cache_deletes_total 45
```

### Business Metrics

Track business-specific metrics:

```javascript
// Lead processing metrics
lead_processing_duration_seconds{stage="validation"} 0.15
lead_processing_duration_seconds{stage="scoring"} 0.45
lead_processing_duration_seconds{stage="enrichment"} 1.20

// Conversion metrics
lead_conversions_total{status="qualified"} 45
lead_conversions_total{status="contacted"} 120
lead_conversions_total{status="converted"} 15

// API usage metrics
api_requests_total{endpoint="/api/leads",method="GET"} 500
api_requests_total{endpoint="/api/leads",method="POST"} 50
api_requests_total{endpoint="/api/analytics",method="GET"} 200
```

## 🔍 Troubleshooting with Monitoring

### High Response Times

**Symptoms:**
- Response time alerts firing
- Slow API responses
- User complaints about performance

**Investigation Steps:**
1. Check `/api/performance/metrics` for response time percentiles
2. Review Grafana dashboard for response time trends
3. Check database query performance
4. Monitor cache hit rates
5. Review system resource usage

### High Error Rates

**Symptoms:**
- Error rate alerts firing
- Increased 5xx HTTP status codes
- Service degradation

**Investigation Steps:**
1. Check `/health/detailed` for service status
2. Review application logs for error patterns
3. Monitor database connection issues
4. Check external service dependencies
5. Review rate limiting and security events

### Memory Issues

**Symptoms:**
- Memory usage alerts firing
- Application restarts due to OOM
- Slow garbage collection

**Investigation Steps:**
1. Check `/api/monitoring/system` for memory usage
2. Review heap dump analysis
3. Monitor cache memory usage
4. Check for memory leaks in application code
5. Review database connection pool usage

### Database Issues

**Symptoms:**
- Slow query alerts firing
- High connection counts
- Database timeout errors

**Investigation Steps:**
1. Check `/api/database/stats` for connection pool status
2. Review slow query logs
3. Monitor database performance metrics
4. Check for connection leaks
5. Review query optimization opportunities

## 🚀 Production Monitoring Setup

### Docker Compose Monitoring

The production setup includes a complete monitoring stack:

```yaml
# docker-compose.prod.yml monitoring services
prometheus:
  image: prom/prometheus:latest
  ports:
    - "9090:9090"
  volumes:
    - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

grafana:
  image: grafana/grafana:latest
  ports:
    - "3001:3000"
  environment:
    GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:-admin}
```

### Monitoring Deployment

```bash
# Start monitoring stack
docker-compose -f docker-compose.prod.yml up -d prometheus grafana

# Access monitoring
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/admin)
```

### Alert Integration

Configure alerts to notify your team:

```bash
# Email alerts
alertmanager --config.file=./monitoring/alertmanager.yml

# Slack integration
# Webhook URL in alertmanager.yml
```

## 📋 Monitoring Checklist

### Daily Monitoring
- [ ] Check application health status
- [ ] Review error rates and response times
- [ ] Monitor system resource usage
- [ ] Verify database performance
- [ ] Check cache hit rates

### Weekly Monitoring
- [ ] Review performance trends
- [ ] Analyze error patterns
- [ ] Check log aggregation
- [ ] Verify backup completion
- [ ] Review security events

### Monthly Monitoring
- [ ] Performance capacity planning
- [ ] Cost optimization analysis
- [ ] Security audit review
- [ ] Compliance monitoring
- [ ] SLA compliance verification

### Alert Response
- [ ] Acknowledge alerts promptly
- [ ] Investigate root causes
- [ ] Implement fixes
- [ ] Document incident response
- [ ] Review and improve monitoring

---

**Effective monitoring ensures system reliability, performance, and user satisfaction. Regular monitoring and proactive alerting prevent issues before they impact users.**

*Built with enterprise-grade observability and monitoring capabilities* 📊