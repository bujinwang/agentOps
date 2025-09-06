const { logger } = require('./logger');
const { promisify } = require('util');

// Prometheus-style metrics collection
class MetricsRegistry {
  constructor() {
    this.metrics = new Map();
    this.startTime = Date.now();
  }

  // Counter metric
  createCounter(name, help, labels = []) {
    const counter = {
      type: 'counter',
      name,
      help,
      labels,
      values: new Map()
    };
    
    this.metrics.set(name, counter);
    return counter;
  }

  // Gauge metric
  createGauge(name, help, labels = []) {
    const gauge = {
      type: 'gauge',
      name,
      help,
      labels,
      values: new Map()
    };
    
    this.metrics.set(name, gauge);
    return gauge;
  }

  // Histogram metric
  createHistogram(name, help, buckets = [0.1, 0.5, 1, 2, 5], labels = []) {
    const histogram = {
      type: 'histogram',
      name,
      help,
      buckets,
      labels,
      values: new Map(),
      sum: 0,
      count: 0
    };
    
    this.metrics.set(name, histogram);
    return histogram;
  }

  // Increment counter
  incrementCounter(name, labels = {}, value = 1) {
    const counter = this.metrics.get(name);
    if (!counter || counter.type !== 'counter') {
      throw new Error(`Counter ${name} not found`);
    }

    const key = this._serializeLabels(labels);
    const currentValue = counter.values.get(key) || 0;
    counter.values.set(key, currentValue + value);
  }

  // Set gauge value
  setGauge(name, labels = {}, value) {
    const gauge = this.metrics.get(name);
    if (!gauge || gauge.type !== 'gauge') {
      throw new Error(`Gauge ${name} not found`);
    }

    const key = this._serializeLabels(labels);
    gauge.values.set(key, value);
  }

  // Observe histogram value
  observeHistogram(name, labels = {}, value) {
    const histogram = this.metrics.get(name);
    if (!histogram || histogram.type !== 'histogram') {
      throw new Error(`Histogram ${name} not found`);
    }

    const key = this._serializeLabels(labels);
    const bucketKey = `${key}_buckets`;
    
    if (!histogram.values.has(bucketKey)) {
      histogram.values.set(bucketKey, {});
      histogram.buckets.forEach(bucket => {
        histogram.values.get(bucketKey)[bucket] = 0;
      });
    }

    // Update buckets
    const buckets = histogram.values.get(bucketKey);
    histogram.buckets.forEach(bucket => {
      if (value <= bucket) {
        buckets[bucket]++;
      }
    });

    histogram.sum += value;
    histogram.count++;
  }

  // Get metric value
  getMetric(name) {
    return this.metrics.get(name);
  }

  // Get all metrics in Prometheus format
  getMetricsAsPrometheus() {
    let output = '';

    this.metrics.forEach((metric, name) => {
      output += `# HELP ${name} ${metric.help}\n`;
      output += `# TYPE ${name} ${metric.type}\n`;

      if (metric.type === 'histogram') {
        // Output histogram buckets
        metric.values.forEach((buckets, labelKey) => {
          if (labelKey.endsWith('_buckets')) {
            const labels = this._deserializeLabels(labelKey.replace('_buckets', ''));
            const labelStr = this._formatLabels(labels);
            
            Object.entries(buckets).forEach(([bucket, count]) => {
              output += `${name}_bucket${labelStr}le="${bucket}"} ${count}\n`;
            });
            
            output += `${name}_sum${labelStr} ${metric.sum}\n`;
            output += `${name}_count${labelStr} ${metric.count}\n`;
          }
        });
      } else {
        // Output counter and gauge values
        metric.values.forEach((value, labelKey) => {
          const labels = this._deserializeLabels(labelKey);
          const labelStr = this._formatLabels(labels);
          output += `${name}${labelStr} ${value}\n`;
        });
      }
      
      output += '\n';
    });

    return output;
  }

  // Helper methods
  _serializeLabels(labels) {
    return JSON.stringify(labels);
  }

  _deserializeLabels(str) {
    try {
      return JSON.parse(str);
    } catch {
      return {};
    }
  }

  _formatLabels(labels) {
    const entries = Object.entries(labels);
    if (entries.length === 0) return ' ';
    
    const labelStr = entries.map(([k, v]) => `${k}="${v}"`).join(',');
    return `{${labelStr}}`;
  }
}

// Create global metrics registry
const metricsRegistry = new MetricsRegistry();

// Initialize application metrics
const initializeMetrics = () => {
  // HTTP request metrics
  metricsRegistry.createCounter('http_requests_total', 'Total HTTP requests', ['method', 'status', 'endpoint']);
  metricsRegistry.createHistogram('http_request_duration_seconds', 'HTTP request duration in seconds', [0.1, 0.5, 1, 2, 5], ['method', 'endpoint']);
  metricsRegistry.createCounter('http_errors_total', 'Total HTTP errors', ['method', 'status', 'endpoint', 'error_type']);

  // Application metrics
  metricsRegistry.createGauge('app_active_connections', 'Number of active connections');
  metricsRegistry.createGauge('app_memory_usage_bytes', 'Memory usage in bytes', ['type']);
  metricsRegistry.createGauge('app_cpu_usage_percent', 'CPU usage percentage');
  metricsRegistry.createGauge('app_uptime_seconds', 'Application uptime in seconds');

  // Database metrics
  metricsRegistry.createCounter('database_queries_total', 'Total database queries', ['operation', 'table']);
  metricsRegistry.createHistogram('database_query_duration_seconds', 'Database query duration', [0.01, 0.1, 0.5, 1], ['operation', 'table']);
  metricsRegistry.createCounter('database_errors_total', 'Total database errors', ['operation', 'error_type']);

  // Redis metrics
  metricsRegistry.createCounter('redis_operations_total', 'Total Redis operations', ['operation']);
  metricsRegistry.createHistogram('redis_operation_duration_seconds', 'Redis operation duration', [0.001, 0.01, 0.1], ['operation']);
  metricsRegistry.createGauge('redis_connected_clients', 'Number of connected Redis clients');

  // Business metrics
  metricsRegistry.createCounter('leads_created_total', 'Total leads created', ['source', 'priority']);
  metricsRegistry.createCounter('leads_converted_total', 'Total leads converted');
  metricsRegistry.createCounter('interactions_created_total', 'Total interactions created', ['type']);
  metricsRegistry.createCounter('notifications_sent_total', 'Total notifications sent', ['type', 'channel']);

  logger.info('Metrics initialized');
};

// Metrics middleware for HTTP requests
const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const originalEnd = res.end;

  res.end = function(chunk, encoding) {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    const status = res.statusCode;
    const method = req.method;
    const endpoint = req.route ? req.route.path : req.path;

    // Record request metrics
    metricsRegistry.incrementCounter('http_requests_total', {
      method,
      status: status.toString(),
      endpoint
    });

    // Record duration
    metricsRegistry.observeHistogram('http_request_duration_seconds', {
      method,
      endpoint
    }, duration);

    // Record errors
    if (status >= 400) {
      const errorType = status >= 500 ? 'server_error' : 'client_error';
      metricsRegistry.incrementCounter('http_errors_total', {
        method,
        status: status.toString(),
        endpoint,
        error_type: errorType
      });
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Update system metrics
const updateSystemMetrics = () => {
  const memUsage = process.memoryUsage();
  
  metricsRegistry.setGauge('app_memory_usage_bytes', { type: 'rss' }, memUsage.rss);
  metricsRegistry.setGauge('app_memory_usage_bytes', { type: 'heap_used' }, memUsage.heapUsed);
  metricsRegistry.setGauge('app_memory_usage_bytes', { type: 'heap_total' }, memUsage.heapTotal);
  metricsRegistry.setGauge('app_memory_usage_bytes', { type: 'external' }, memUsage.external);
  
  metricsRegistry.setGauge('app_uptime_seconds', {}, process.uptime());

  // CPU usage (simplified)
  const cpuUsage = process.cpuUsage();
  const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000 * 100).toFixed(2);
  metricsRegistry.setGauge('app_cpu_usage_percent', {}, parseFloat(cpuPercent));
};

// Metrics endpoint
const metricsEndpoint = (req, res) => {
  try {
    updateSystemMetrics();
    const metrics = metricsRegistry.getMetricsAsPrometheus();
    
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    logger.error('Error generating metrics', error);
    res.status(500).send('# Error generating metrics\n');
  }
};

// Business metrics helpers
const recordLeadCreated = (source, priority) => {
  metricsRegistry.incrementCounter('leads_created_total', { source, priority });
};

const recordLeadConverted = () => {
  metricsRegistry.incrementCounter('leads_converted_total', {});
};

const recordInteractionCreated = (type) => {
  metricsRegistry.incrementCounter('interactions_created_total', { type });
};

const recordNotificationSent = (type, channel) => {
  metricsRegistry.incrementCounter('notifications_sent_total', { type, channel });
};

const recordDatabaseQuery = (operation, table, duration) => {
  metricsRegistry.incrementCounter('database_queries_total', { operation, table });
  metricsRegistry.observeHistogram('database_query_duration_seconds', { operation, table }, duration);
};

const recordDatabaseError = (operation, errorType) => {
  metricsRegistry.incrementCounter('database_errors_total', { operation, error_type: errorType });
};

const recordRedisOperation = (operation, duration) => {
  metricsRegistry.incrementCounter('redis_operations_total', { operation });
  metricsRegistry.observeHistogram('redis_operation_duration_seconds', { operation }, duration);
};

module.exports = {
  metricsRegistry,
  initializeMetrics,
  metricsMiddleware,
  metricsEndpoint,
  recordLeadCreated,
  recordLeadConverted,
  recordInteractionCreated,
  recordNotificationSent,
  recordDatabaseQuery,
  recordDatabaseError,
  recordRedisOperation
};