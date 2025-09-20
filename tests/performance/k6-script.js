// K6 Performance Test Script for Real Estate CRM
// Comprehensive load testing with multiple scenarios

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTimeTrend = new Trend('response_time_trend');

// Test configuration
export const options = {
  scenarios: {
    // Smoke test - basic functionality
    smoke_test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { test_type: 'smoke' },
    },

    // Load test - normal production load
    load_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 10 },   // Ramp up to 10 users
        { duration: '5m', target: 10 },   // Stay at 10 users
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 0 },    // Ramp down to 0 users
      ],
      tags: { test_type: 'load' },
    },

    // Stress test - maximum capacity
    stress_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 100 },
        { duration: '3m', target: 100 },
        { duration: '1m', target: 200 },
        { duration: '3m', target: 200 },
        { duration: '1m', target: 300 },
        { duration: '3m', target: 300 },
        { duration: '1m', target: 0 },
      ],
      tags: { test_type: 'stress' },
    },

    // Spike test - sudden traffic spikes
    spike_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '10s', target: 10 },
        { duration: '10s', target: 100 },  // Spike to 100 users
        { duration: '30s', target: 100 },  // Stay at spike
        { duration: '10s', target: 10 },   // Drop back down
        { duration: '10s', target: 0 },
      ],
      tags: { test_type: 'spike' },
    },

    // Breakpoint test - find system limits
    breakpoint_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '2m', target: 400 },
        { duration: '2m', target: 500 },
        { duration: '2m', target: 600 },
        { duration: '1m', target: 0 },
      ],
      tags: { test_type: 'breakpoint' },
    },
  },

  thresholds: {
    // HTTP request duration should be < 500ms for 95% of requests
    http_req_duration: ['p(95)<500'],

    // Error rate should be < 1%
    http_req_failed: ['rate<0.01'],

    // Custom error rate
    errors: ['rate<0.01'],
  },
};

// Base URL from environment
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const testUsers = [
  { email: 'test1@example.com', password: 'password123' },
  { email: 'test2@example.com', password: 'password123' },
  { email: 'test3@example.com', password: 'password123' },
];

// Authentication tokens cache
const authTokens = new Map();

// Setup function - runs before the test starts
export function setup() {
  // Pre-authenticate test users
  for (const user of testUsers) {
    const loginResponse = http.post(`${BASE_URL}/api/auth/login`, {
      email: user.email,
      password: user.password,
    });

    if (loginResponse.status === 200) {
      const responseBody = JSON.parse(loginResponse.body);
      authTokens.set(user.email, responseBody.token);
    }
  }

  return { authTokens: Object.fromEntries(authTokens) };
}

// Default function - main test scenario
export default function (data) {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  const token = data.authTokens[user.email];

  if (!token) {
    errorRate.add(1);
    return;
  }

  // Set authorization header
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Scenario 1: Health check
  const healthResponse = http.get(`${BASE_URL}/health`);
  check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);

  // Scenario 2: Get leads list
  const leadsResponse = http.get(`${BASE_URL}/api/leads?page=1&limit=10`, { headers });
  check(leadsResponse, {
    'leads list status is 200': (r) => r.status === 200,
    'leads list response time < 300ms': (r) => r.timings.duration < 300,
    'leads list has data': (r) => JSON.parse(r.body).data && JSON.parse(r.body).data.length >= 0,
  }) || errorRate.add(1);

  // Scenario 3: Get analytics dashboard
  const analyticsResponse = http.get(`${BASE_URL}/api/analytics/dashboard`, { headers });
  check(analyticsResponse, {
    'analytics status is 200': (r) => r.status === 200,
    'analytics response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  // Scenario 4: Create lead (write operation)
  const createLeadResponse = http.post(`${BASE_URL}/api/leads`, JSON.stringify({
    firstName: `Test${Math.floor(Math.random() * 1000)}`,
    lastName: `User${Math.floor(Math.random() * 1000)}`,
    email: `test${Math.floor(Math.random() * 1000)}@example.com`,
    phone: `555-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
    propertyType: ['house', 'condo', 'townhouse'][Math.floor(Math.random() * 3)],
    budget: Math.floor(Math.random() * 1000000) + 200000,
    timeline: ['immediate', '1-3 months', '3-6 months', '6+ months'][Math.floor(Math.random() * 4)],
  }), { headers });

  check(createLeadResponse, {
    'create lead status is 201': (r) => r.status === 201,
    'create lead response time < 400ms': (r) => r.timings.duration < 400,
  }) || errorRate.add(1);

  // Scenario 5: Search leads
  const searchResponse = http.get(`${BASE_URL}/api/search/leads?q=test&limit=5`, { headers });
  check(searchResponse, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);

  // Record custom metrics
  responseTimeTrend.add(healthResponse.timings.duration);

  // Random sleep between 1-3 seconds to simulate real user behavior
  sleep(Math.random() * 2 + 1);
}

// Teardown function - runs after the test completes
export function teardown(data) {
  // Cleanup test data if needed
  console.log('Test completed for user:', Object.keys(data.authTokens).length, 'authenticated users');
}

// Handle summary - custom summary output
export function handleSummary(data) {
  const summary = {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'performance-report.json': JSON.stringify(data, null, 2),
    'performance-summary.html': htmlReport(data),
  };

  return summary;
}

function textSummary(data, options) {
  return `
📊 Performance Test Summary
==========================

Test Duration: ${data.metrics.iteration_duration.values.avg}ms avg iteration
Total Requests: ${data.metrics.http_reqs.values.count}
Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%

Response Times:
  Average: ${Math.round(data.metrics.http_req_duration.values.avg)}ms
  95th percentile: ${Math.round(data.metrics.http_req_duration.values['p(95)'])}ms
  99th percentile: ${Math.round(data.metrics.http_req_duration.values['p(99)'])}ms

HTTP Status:
  2xx: ${data.metrics.http_req_duration.values.count - data.metrics.http_req_failed.values.count}
  4xx: ${data.metrics.http_req_failed.values.count * 0.5} (estimated)
  5xx: ${data.metrics.http_req_failed.values.count * 0.5} (estimated)

Custom Metrics:
  Error Rate: ${(data.metrics.errors?.values.rate || 0) * 100}%
  Response Time Trend: ${Math.round(data.metrics.response_time_trend?.values.avg || 0)}ms

Recommendations:
${generateRecommendations(data)}
`;
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Real Estate CRM Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .success { border-left: 5px solid #4CAF50; }
        .warning { border-left: 5px solid #FF9800; }
        .error { border-left: 5px solid #F44336; }
        h1, h2 { color: #333; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Real Estate CRM Performance Test Report</h1>
    <p><strong>Generated:</strong> ${new Date().toISOString()}</p>

    <h2>Key Metrics</h2>
    <div class="metric success">
        <strong>Average Response Time:</strong> ${Math.round(data.metrics.http_req_duration.values.avg)}ms
    </div>
    <div class="metric ${data.metrics.http_req_failed.values.rate < 0.01 ? 'success' : 'error'}">
        <strong>Error Rate:</strong> ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
    </div>
    <div class="metric success">
        <strong>95th Percentile:</strong> ${Math.round(data.metrics.http_req_duration.values['p(95)'])}ms
    </div>

    <h2>Detailed Results</h2>
    <table>
        <tr><th>Metric</th><th>Value</th><th>Status</th></tr>
        <tr><td>Total Requests</td><td>${data.metrics.http_reqs.values.count}</td><td>✅</td></tr>
        <tr><td>Failed Requests</td><td>${data.metrics.http_req_failed.values.count}</td><td>${data.metrics.http_req_failed.values.rate < 0.01 ? '✅' : '❌'}</td></tr>
        <tr><td>Average Response Time</td><td>${Math.round(data.metrics.http_req_duration.values.avg)}ms</td><td>${data.metrics.http_req_duration.values.avg < 500 ? '✅' : '⚠️'}</td></tr>
        <tr><td>95th Percentile</td><td>${Math.round(data.metrics.http_req_duration.values['p(95)'])}ms</td><td>${data.metrics.http_req_duration.values['p(95)'] < 500 ? '✅' : '⚠️'}</td></tr>
    </table>

    <h2>Recommendations</h2>
    <pre>${generateRecommendations(data)}</pre>
</body>
</html>
`;
}

function generateRecommendations(data) {
  const recommendations = [];

  if (data.metrics.http_req_duration.values.avg > 500) {
    recommendations.push('⚠️  Consider optimizing database queries or adding caching');
  }

  if (data.metrics.http_req_failed.values.rate > 0.01) {
    recommendations.push('❌ Investigate and fix error-causing requests');
  }

  if (data.metrics.http_req_duration.values['p(95)'] > 1000) {
    recommendations.push('⚠️  Review 95th percentile performance for outliers');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All performance metrics within acceptable ranges');
  }

  return recommendations.join('\n');
}