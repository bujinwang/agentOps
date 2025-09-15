import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const searchResponseTime = new Trend('search_response_time');
const propertyLoadTime = new Trend('property_load_time');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '5m', target: 200 },   // Stay at 200 users
    { duration: '2m', target: 500 },   // Ramp up to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
    { duration: '2m', target: 1000 },  // Ramp up to 1000 users
    { duration: '5m', target: 1000 },  // Stay at 1000 users
    { duration: '2m', target: 0 },     // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate should be below 10%
    search_response_time: ['p(95)<300'], // Search responses under 300ms
    property_load_time: ['p(95)<1000'], // Property pages under 1s
  },
};

// Base URL for the application
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const searchQueries = [
  'downtown apartment',
  'luxury condo',
  'single family home',
  'townhouse',
  'commercial property',
  'vacant land',
  'waterfront property',
  'mountain view',
  'golf course',
  'pool house'
];

const priceRanges = [
  '0-200000',
  '200000-400000',
  '400000-600000',
  '600000-800000',
  '800000-1000000',
  '1000000+'
];

const propertyTypes = [
  'apartment',
  'condo',
  'house',
  'townhouse',
  'commercial',
  'land'
];

// Helper functions
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomUser() {
  const users = [
    { email: 'test1@example.com', password: 'password123' },
    { email: 'test2@example.com', password: 'password123' },
    { email: 'test3@example.com', password: 'password123' },
    { email: 'agent1@example.com', password: 'password123' },
    { email: 'agent2@example.com', password: 'password123' },
  ];
  return getRandomItem(users);
}

// Main test function
export default function () {
  const user = generateRandomUser();

  // User authentication
  const loginPayload = JSON.stringify({
    email: user.email,
    password: user.password
  });

  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 500ms': (r) => r.timings.duration < 500,
  });

  if (loginResponse.status !== 200) {
    errorRate.add(1);
    return;
  }

  const authToken = loginResponse.json().token;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };

  // Property search scenario
  const searchPayload = JSON.stringify({
    query: getRandomItem(searchQueries),
    priceRange: getRandomItem(priceRanges),
    propertyType: getRandomItem(propertyTypes),
    location: 'downtown',
    limit: 20,
    offset: 0
  });

  const searchStart = new Date().getTime();
  const searchResponse = http.post(`${BASE_URL}/api/properties/search`, searchPayload, {
    headers,
  });

  const searchDuration = new Date().getTime() - searchStart;
  searchResponseTime.add(searchDuration);

  check(searchResponse, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 300ms': (r) => r.timings.duration < 300,
    'search returns results': (r) => r.json().properties && r.json().properties.length > 0,
  });

  if (searchResponse.status !== 200) {
    errorRate.add(1);
  }

  // Property details scenario (if search returned results)
  if (searchResponse.status === 200 && searchResponse.json().properties.length > 0) {
    const properties = searchResponse.json().properties;
    const randomProperty = getRandomItem(properties);

    const propertyStart = new Date().getTime();
    const propertyResponse = http.get(`${BASE_URL}/api/properties/${randomProperty.id}`, {
      headers,
    });

    const propertyDuration = new Date().getTime() - propertyStart;
    propertyLoadTime.add(propertyDuration);

    check(propertyResponse, {
      'property status is 200': (r) => r.status === 200,
      'property load time < 1000ms': (r) => r.timings.duration < 1000,
      'property has details': (r) => r.json().id && r.json().title,
    });

    if (propertyResponse.status !== 200) {
      errorRate.add(1);
    }

    // Simulate user browsing multiple properties
    for (let i = 0; i < Math.min(3, properties.length); i++) {
      const prop = properties[i];
      http.get(`${BASE_URL}/api/properties/${prop.id}`, { headers });
      sleep(0.5); // Simulate user thinking time
    }
  }

  // Lead creation scenario (occasional)
  if (Math.random() < 0.3) { // 30% of users create leads
    const leadPayload = JSON.stringify({
      propertyId: Math.floor(Math.random() * 1000) + 1,
      name: 'Test User',
      email: `test${Math.floor(Math.random() * 1000)}@example.com`,
      phone: '+1-555-0123',
      message: 'I am interested in this property. Please contact me.',
      source: 'website'
    });

    const leadResponse = http.post(`${BASE_URL}/api/leads`, leadPayload, {
      headers,
    });

    check(leadResponse, {
      'lead creation status is 201': (r) => r.status === 201,
      'lead response time < 1000ms': (r) => r.timings.duration < 1000,
    });

    if (leadResponse.status !== 201) {
      errorRate.add(1);
    }
  }

  // Agent dashboard scenario (for agent users)
  if (user.email.includes('agent')) {
    const dashboardResponse = http.get(`${BASE_URL}/api/agent/dashboard`, {
      headers,
    });

    check(dashboardResponse, {
      'dashboard status is 200': (r) => r.status === 200,
      'dashboard response time < 2000ms': (r) => r.timings.duration < 2000,
    });

    if (dashboardResponse.status !== 200) {
      errorRate.add(1);
    }
  }

  // Random sleep to simulate user behavior
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

// Setup function - runs before the test starts
export function setup() {
  console.log('Starting load test setup...');

  // Health check
  const healthResponse = http.get(`${BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    console.error('Application health check failed!');
    return;
  }

  console.log('Load test setup completed successfully');
  return {};
}

// Teardown function - runs after the test completes
export function teardown(data) {
  console.log('Load test completed');
}

// Handle summary - custom summary output
export function handleSummary(data) {
  const summary = {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data, null, 2),
    'performance-report.html': htmlReport(data),
  };

  return summary;
}

function textSummary(data, options) {
  return `
📊 Load Test Summary
====================

Test Duration: ${data.metrics.iteration_duration.values.avg}ms avg iteration
Total Requests: ${data.metrics.http_reqs.values.count}
Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%

Response Times:
- Average: ${Math.round(data.metrics.http_req_duration.values.avg)}ms
- 95th percentile: ${Math.round(data.metrics.http_req_duration.values['p(95)'])}ms
- 99th percentile: ${Math.round(data.metrics.http_req_duration.values['p(99)'])}ms

Custom Metrics:
- Search Response Time (95th): ${Math.round(data.metrics.search_response_time.values['p(95)'])}ms
- Property Load Time (95th): ${Math.round(data.metrics.property_load_time.values['p(95)'])}ms
- Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%

Threshold Results:
${Object.entries(data.metrics)
  .filter(([key, metric]) => metric.thresholds)
  .map(([key, metric]) => {
    const thresholds = metric.thresholds;
    return `- ${key}: ${thresholds.every(t => t.ok) ? '✅ PASS' : '❌ FAIL'}`;
  })
  .join('\n')}
`;
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
        h1, h2 { color: #333; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>🚀 Real Estate CRM Load Test Report</h1>

    <div class="metric">
        <h2>📈 Performance Summary</h2>
        <p><strong>Total Requests:</strong> ${data.metrics.http_reqs.values.count}</p>
        <p><strong>Average Response Time:</strong> ${Math.round(data.metrics.http_req_duration.values.avg)}ms</p>
        <p><strong>95th Percentile:</strong> ${Math.round(data.metrics.http_req_duration.values['p(95)'])}ms</p>
        <p><strong>Error Rate:</strong> ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%</p>
    </div>

    <div class="metric">
        <h2>🎯 Custom Metrics</h2>
        <p><strong>Search Response Time (95th):</strong> ${Math.round(data.metrics.search_response_time.values['p(95)'])}ms</p>
        <p><strong>Property Load Time (95th):</strong> ${Math.round(data.metrics.property_load_time.values['p(95)'])}ms</p>
    </div>

    <div class="metric">
        <h2>📋 Threshold Results</h2>
        <table>
            <tr><th>Metric</th><th>Status</th><th>Value</th></tr>
            ${Object.entries(data.metrics)
              .filter(([key, metric]) => metric.thresholds)
              .map(([key, metric]) => {
                const thresholds = metric.thresholds;
                const status = thresholds.every(t => t.ok) ? 'pass' : 'fail';
                return `<tr><td>${key}</td><td class="${status}">${status.toUpperCase()}</td><td>${JSON.stringify(metric.values)}</td></tr>`;
              })
              .join('')}
        </table>
    </div>
</body>
</html>
`;
}