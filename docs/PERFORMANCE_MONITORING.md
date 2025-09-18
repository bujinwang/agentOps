# 🚀 Performance Monitoring Guide

This guide covers the comprehensive performance monitoring and caching system implemented for the Real Estate CRM system.

## 📊 Overview

The system includes multi-layer performance monitoring with real-time metrics, intelligent caching, and automated alerting to ensure optimal application performance.

### Key Features

- **Real-time Performance Metrics**: Response times, memory usage, CPU utilization
- **Intelligent Caching**: Multi-layer caching with Redis and in-memory fallback
- **Automated Alerting**: Performance threshold monitoring with alerts
- **Health Checks**: Comprehensive system health monitoring
- **Cache Management**: Cache statistics and management endpoints

## 🔍 Performance Metrics

### Response Time Monitoring

**What it tracks:**
- Individual request response times
- Average response time over time
- 95th and 99th percentile response times
- Slow request detection (>1s warning, >5s critical)

**Endpoints:**
```bash
# Get performance metrics
curl http://localhost:3000/api/performance/metrics

# Response example:
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

### Memory Usage Monitoring

**What it tracks:**
- Heap usage and limits
- External memory usage
- Memory usage percentage
- Garbage collection pressure

**Thresholds:**
- Warning: 80% memory usage
- Critical: 90% memory usage
- Heap dump: 95% memory usage

### CPU Usage Monitoring

**What it tracks:**
- User and system CPU time
- CPU usage percentage
- Process CPU utilization

**Thresholds:**
- Warning: 70% CPU usage
- Critical: 85% CPU usage

### Throughput Monitoring

**What it tracks:**
- Requests per minute
- Error rates per minute
- Average response time per minute
- Peak throughput periods

## 💾 Intelligent Caching System

### Multi-Layer Caching Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   In-Memory     │
│   Requests      │────►│   Cache         │
│                 │    │   (Fast)        │
└─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Redis Cache   │
                    │   (Persistent)  │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Database      │
                    │   (Fallback)    │
                    └─────────────────┘
```

### Cache Configuration

**Default Settings:**
```javascript
const cacheConfig = {
  defaultTTL: 300,        // 5 minutes
  maxMemoryItems: 1000,   // Max items in memory
  compressionThreshold: 1024, // Compress > 1KB
  cleanupInterval: 60000  // Clean every minute
};
```

### Cache Management Endpoints

```bash
# Get cache statistics
curl http://localhost:3000/api/cache/stats

# Response:
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

# Clear cache
curl -X POST http://localhost:3000/api/cache/clear \
  -H "Content-Type: application/json" \
  -d '{"pattern": "leads:*"}'

# Check cache health
curl http://localhost:3000/api/cache/health
```

### Cache Strategies

#### 1. Cache-Aside Pattern
```javascript
// Automatic cache-aside for API endpoints
app.use('/api/leads', cacheMiddleware({
  ttl: 300,  // 5 minutes
  keyFn: (req) => `leads:${req.user?.userId}:${JSON.stringify(req.query)}`,
  condition: (req) => req.method === 'GET' && !req.query.search
}));
```

#### 2. Write-Through Caching
```javascript
// Cache invalidation on data changes
const { cacheInvalidation } = require('./services/CacheService');

// Invalidate user cache after updates
await cacheInvalidation.invalidateUserCache(userId);
```

#### 3. Cache Warming
```javascript
// Pre-populate frequently accessed data
const warmCache = async () => {
  const popularLeads = await LeadService.getPopularLeads();
  for (const lead of popularLeads) {
    await cacheService.set(`lead:${lead.id}`, lead, 3600);
  }
};
```

## 🚨 Automated Alerting

### Alert Types

#### Performance Alerts
- **Slow Response Times**: Average response time exceeds thresholds
- **High Memory Usage**: Memory usage exceeds configured limits
- **High CPU Usage**: CPU utilization exceeds thresholds
- **Cache Issues**: Cache hit rate drops below acceptable levels

#### System Alerts
- **Database Connection Issues**: Connection pool exhaustion
- **Redis Connectivity**: Cache layer failures
- **External Service Failures**: API dependencies down

### Alert Configuration

```javascript
const alertConfig = {
  enabled: true,
  checkInterval: 30000,      // Check every 30 seconds
  cooldownPeriod: 300000,    // 5 minutes between alerts
  notificationChannels: ['log', 'email'],
  escalationThreshold: 3     // Escalate after 3 alerts
};
```

### Alert Response

**Immediate Actions:**
1. Log detailed alert information
2. Check system metrics dashboard
3. Identify root cause (memory leak, slow queries, etc.)
4. Apply temporary mitigation (cache clearing, service restart)

**Escalation Process:**
1. **Level 1**: Automatic alerts to development team
2. **Level 2**: Page on-call engineer (after 3 consecutive alerts)
3. **Level 3**: Escalate to management (service impacting issues)

## 📈 Monitoring Dashboard

### Real-time Metrics

Access the monitoring dashboard at:
- **Main Dashboard**: `http://localhost:3000/metrics`
- **Performance Metrics**: `http://localhost:3000/api/performance/metrics`
- **Cache Statistics**: `http://localhost:3000/api/cache/stats`
- **Database Stats**: `http://localhost:3000/api/database/stats`

### Key Metrics to Monitor

#### Application Performance
- **Response Time**: Keep < 500ms average, < 2s 95th percentile
- **Error Rate**: Maintain < 1% error rate
- **Throughput**: Monitor requests per minute trends

#### System Resources
- **Memory Usage**: Keep < 80% of available memory
- **CPU Usage**: Maintain < 70% CPU utilization
- **Disk I/O**: Monitor for I/O bottlenecks

#### Cache Performance
- **Hit Rate**: Target > 80% cache hit rate
- **Memory Usage**: Monitor cache memory consumption
- **Eviction Rate**: Track cache item evictions

## 🔧 Performance Optimization

### Database Optimization

```bash
# Check slow queries
curl http://localhost:3000/api/database/stats

# Clear query cache
curl -X POST http://localhost:3000/api/database/cache/clear
```

### Cache Optimization

```bash
# Monitor cache hit rates
curl http://localhost:3000/api/cache/stats

# Adjust cache TTL based on data freshness requirements
# Increase TTL for stable data, decrease for volatile data
```

### Application Optimization

#### Memory Management
```javascript
// Monitor memory usage in middleware
app.use((req, res, next) => {
  const startMemory = process.memoryUsage().heapUsed;

  res.on('finish', () => {
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDelta = endMemory - startMemory;

    if (memoryDelta > 10 * 1024 * 1024) { // 10MB increase
      logger.warn('High memory usage detected', {
        path: req.path,
        memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`
      });
    }
  });

  next();
});
```

#### Connection Pooling
```javascript
// Database connection pooling
const poolConfig = {
  max: 20,              // Maximum connections
  min: 5,               // Minimum connections
  idleTimeoutMillis: 30000,  // Close idle connections after 30s
  acquireTimeoutMillis: 60000 // Timeout for acquiring connection
};
```

## 📊 Performance Testing

### Load Testing Setup

```bash
# Install load testing tools
npm install -g artillery

# Create load test script
# artillery quick --count 50 --num 10 http://localhost:3000/api/leads
```

### Performance Benchmarks

**Target Performance Metrics:**
- **Response Time**: < 500ms average, < 2s 95th percentile
- **Concurrent Users**: Support 1000+ concurrent users
- **Throughput**: 1000+ requests per minute
- **Error Rate**: < 1% under normal load
- **Memory Usage**: < 80% of available memory
- **CPU Usage**: < 70% under peak load

### Stress Testing

```bash
# Stress test configuration
const stressTestConfig = {
  duration: 600,        // 10 minutes
  maxConcurrency: 200,  // Max 200 concurrent users
  failureThreshold: 0.05 // 5% failure rate threshold
};
```

## 🚀 Production Deployment

### Environment Configuration

```env
# Performance settings
NODE_ENV=production
PERFORMANCE_MONITORING_ENABLED=true
CACHE_ENABLED=true
COMPRESSION_ENABLED=true

# Monitoring
MONITORING_ENABLED=true
MONITORING_PROVIDER=datadog
MONITORING_API_KEY=your-api-key

# Auto-scaling
AUTO_SCALING_ENABLED=true
CPU_THRESHOLD=0.8
MEMORY_THRESHOLD=0.85
```

### Monitoring Integration

#### DataDog Integration
```javascript
const monitoring = require('./config/monitoring');

if (process.env.MONITORING_ENABLED) {
  monitoring.initialize({
    provider: 'datadog',
    apiKey: process.env.DATADOG_API_KEY,
    tags: {
      service: 'real-estate-crm',
      environment: process.env.NODE_ENV
    }
  });
}
```

#### Prometheus Integration
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'real-estate-crm'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

## 🔧 Troubleshooting Performance Issues

### High Response Times

**Symptoms:**
- API responses > 1 second
- Database query timeouts
- Cache miss rates > 50%

**Solutions:**
1. Check database query performance
2. Optimize cache hit rates
3. Implement database indexing
4. Add response compression

### High Memory Usage

**Symptoms:**
- Memory usage > 80%
- Frequent garbage collection
- Application restarts due to OOM

**Solutions:**
1. Monitor memory leaks with heap dumps
2. Optimize cache memory usage
3. Implement memory-efficient data structures
4. Add memory monitoring alerts

### High CPU Usage

**Symptoms:**
- CPU usage > 70%
- Slow response times
- System becomes unresponsive

**Solutions:**
1. Profile CPU usage with flame graphs
2. Optimize computationally expensive operations
3. Implement request queuing for high-load periods
4. Add CPU monitoring alerts

### Cache Issues

**Symptoms:**
- Low cache hit rates (< 50%)
- High cache memory usage
- Cache invalidation problems

**Solutions:**
1. Adjust cache TTL values
2. Implement cache warming strategies
3. Optimize cache key generation
4. Monitor cache performance metrics

## 📈 Performance Improvement Roadmap

### Immediate Improvements (Week 1-2)
- [ ] Implement response compression
- [ ] Add database query optimization
- [ ] Configure Redis clustering for cache
- [ ] Add performance monitoring alerts

### Medium-term Improvements (Month 1-2)
- [ ] Implement auto-scaling based on metrics
- [ ] Add distributed tracing
- [ ] Optimize database connection pooling
- [ ] Implement circuit breaker pattern

### Long-term Improvements (Month 3-6)
- [ ] Implement service mesh for microservices
- [ ] Add advanced caching strategies (CDN, edge caching)
- [ ] Implement predictive scaling
- [ ] Add AI-powered performance optimization

---

**Performance monitoring ensures your application remains fast, reliable, and scalable. Regular monitoring and optimization are key to maintaining excellent user experience.**

*Built with performance-first architecture* ⚡