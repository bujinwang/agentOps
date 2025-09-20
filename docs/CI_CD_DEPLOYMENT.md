# 🚀 CI/CD Deployment Guide

This comprehensive guide covers the automated CI/CD pipeline for the Real Estate CRM system, including setup, configuration, and deployment procedures.

## 📋 Overview

### Pipeline Architecture

The CI/CD pipeline provides:
- **Automated Testing**: Unit, integration, and end-to-end tests
- **Security Scanning**: Container and dependency vulnerability scanning
- **Performance Testing**: Load and performance regression testing
- **Multi-Environment Deployment**: Staging and production environments
- **Rollback Capabilities**: Automated rollback on deployment failures
- **Monitoring Integration**: Real-time deployment monitoring and alerting

### Pipeline Stages

```mermaid
graph TD
    A[Code Push] --> B[Quality Check]
    B --> C[Build & Test]
    C --> D{Branch Check}
    D -->|develop| E[Deploy Staging]
    D -->|main| F[Deploy Production]
    E --> G[Smoke Tests]
    F --> H[Production Tests]
    G --> I[Notifications]
    H --> I
    C --> J[Rollback]
    E --> J
    F --> J
```

## 🔧 Pipeline Configuration

### Required Secrets

Configure the following secrets in your GitHub repository:

#### Docker Registry Secrets
```bash
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-password
```

#### AWS Deployment Secrets
```bash
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
```

#### Application Secrets
```bash
# Production Database
PROD_DATABASE_URL=postgresql://user:password@host:5432/db

# JWT and Security
JWT_SECRET=your-production-jwt-secret
OPENAI_API_KEY=your-openai-api-key

# External Services
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Monitoring
DATADOG_API_KEY=your-datadog-api-key
```

#### Environment URLs
```bash
STAGING_URL=https://staging.your-domain.com
PROD_URL=https://your-domain.com
```

#### Notification Secrets
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Environment Configuration

#### Staging Environment
```yaml
# .github/workflows/ci-cd.yml environments
staging:
  AWS_REGION: us-east-1
  CLUSTER_NAME: real-estate-crm-staging
  SERVICE_NAME: real-estate-crm-backend-staging
```

#### Production Environment
```yaml
production:
  AWS_REGION: us-east-1
  CLUSTER_NAME: real-estate-crm-production
  SERVICE_NAME: real-estate-crm-backend-production
```

## 🚀 Deployment Workflows

### Automatic Deployments

#### Develop Branch → Staging
- **Trigger**: Push to `develop` branch
- **Environment**: Staging
- **Tests**: Full test suite + integration tests
- **Approval**: Automatic (no manual approval required)

#### Main Branch → Production
- **Trigger**: Push to `main` branch or manual trigger
- **Environment**: Production
- **Tests**: Full test suite + smoke tests + performance tests
- **Approval**: Required for production deployments

### Manual Deployments

#### Using GitHub Actions
```bash
# Trigger staging deployment
gh workflow run ci-cd.yml \
  --ref develop \
  -f environment=staging

# Trigger production deployment
gh workflow run ci-cd.yml \
  --ref main \
  -f environment=production
```

#### Using GitHub Web Interface
1. Go to **Actions** tab in your repository
2. Select **CI/CD Pipeline** workflow
3. Click **Run workflow**
4. Select target environment
5. Click **Run workflow**

## 🧪 Testing Strategy

### Test Types

#### 1. Unit Tests
```bash
# Run locally
npm run test:unit

# With coverage
npm run test:unit -- --coverage

# Watch mode
npm run test:unit -- --watch
```

#### 2. Integration Tests
```bash
# Run locally
npm run test:integration

# With Docker
docker-compose -f docker-compose.test.yml run --rm backend npm run test:integration
```

#### 3. End-to-End Tests
```bash
# Run locally
npm run test:e2e

# With Docker
docker-compose -f docker-compose.test.yml run --rm playwright npm run test:e2e
```

#### 4. Performance Tests
```bash
# Load testing with K6
docker-compose -f docker-compose.test.yml run --rm k6 run /scripts/k6-script.js

# Artillery load testing
docker-compose -f docker-compose.test.yml run --rm artillery run /config/load-test.yml
```

### Test Configuration

#### Jest Configuration (`jest.config.js`)
```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/index.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

#### Test Scripts (`package.json`)
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:performance": "k6 run tests/performance/k6-script.js",
    "test:smoke": "node tests/smoke/smoke-tests.js",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch"
  }
}
```

## 🔒 Security Scanning

### Container Security

#### Trivy Security Scan
```yaml
# Automatic scanning in CI/CD pipeline
- name: Security scan
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'image'
    scan-ref: 'real-estate-crm-backend:test-${{ github.run_id }}'
    format: 'sarif'
    output: 'trivy-results.sarif'
```

#### Dependency Scanning
```bash
# NPM audit
npm audit --audit-level=moderate

# Snyk (if configured)
snyk test --severity-threshold=medium
```

### Code Security

#### ESLint Security Rules
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:security/recommended'
  ],
  plugins: ['security'],
  rules: {
    'security/detect-object-injection': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error'
  }
};
```

## 📊 Monitoring & Alerting

### Deployment Monitoring

#### Real-time Metrics
- **Deployment Duration**: Time to complete deployment
- **Success Rate**: Percentage of successful deployments
- **Rollback Rate**: Frequency of rollbacks
- **Test Coverage**: Code coverage trends

#### Health Checks
```bash
# Post-deployment health verification
curl -f https://your-domain.com/health
curl -f https://your-domain.com/api/leads
```

### Alert Configuration

#### Slack Notifications
```yaml
# Success notification
- name: Notify success
  uses: 8398a7/action-slack@v3
  if: success()
  with:
    status: success
    text: "✅ Deployment successful - ${{ github.sha }}"

# Failure notification
- name: Notify failure
  uses: 8398a7/action-slack@v3
  if: failure()
  with:
    status: failure
    text: "❌ Deployment failed - ${{ github.sha }}"
```

#### Email Alerts
```yaml
# Production deployment alerts
- name: Email alert
  uses: dawidd6/action-send-mail@v3
  if: failure()
  with:
    server_address: smtp.gmail.com
    server_port: 587
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    to: alerts@your-domain.com
    subject: "🚨 Production Deployment Failed"
    body: "Deployment failed for commit ${{ github.sha }}"
```

## 🔄 Rollback Procedures

### Automatic Rollback

The pipeline includes automatic rollback capabilities:

```yaml
# Rollback job
rollback:
  name: 'Rollback Deployment'
  runs-on: ubuntu-latest
  if: failure()
  needs: [deploy-staging, deploy-production]

  steps:
    - name: Rollback deployment
      run: |
        # Find previous successful deployment
        aws codedeploy create-deployment \
          --application-name real-estate-crm-${{ github.event.inputs.environment }} \
          --deployment-group-name real-estate-crm-${{ github.event.inputs.environment }}-group \
          --revision '{"revisionType": "String", "string": {"content": "Rolling back"}}'
```

### Manual Rollback

#### Using AWS Console
1. Go to **AWS CodeDeploy** console
2. Select your application
3. Click **Deployments** tab
4. Find the failed deployment
5. Click **Rollback deployment**
6. Select previous successful deployment
7. Click **Rollback**

#### Using AWS CLI
```bash
# List recent deployments
aws codedeploy list-deployments \
  --application-name real-estate-crm-production \
  --include-only-statuses Succeeded Failed \
  --max-items 10

# Rollback to specific deployment
aws codedeploy create-deployment \
  --application-name real-estate-crm-production \
  --deployment-group-name real-estate-crm-prod-group \
  --revision '{"revisionType": "String", "string": {"content": "Manual rollback"}}'
```

## 📈 Performance Monitoring

### Performance Baselines

#### Response Time Targets
- **API Endpoints**: < 200ms average, < 500ms 95th percentile
- **Database Queries**: < 50ms average
- **Cache Operations**: < 10ms average
- **File Uploads**: < 2s for 10MB files

#### Throughput Targets
- **API Requests**: 1000 requests/second
- **Database Connections**: 100 active connections max
- **Cache Hit Rate**: > 85%
- **Error Rate**: < 1%

### Performance Testing

#### K6 Load Testing
```bash
# Run load tests
k6 run tests/performance/k6-script.js

# Run with custom options
k6 run \
  --vus 100 \
  --duration 30s \
  tests/performance/k6-script.js
```

#### Artillery Load Testing
```yaml
# artillery-config.yml
config:
  target: 'https://your-domain.com'
  phases:
    - duration: 60
      arrivalRate: 10
  defaults:
    headers:
      Authorization: 'Bearer {{token}}'

scenarios:
  - name: 'API Load Test'
    flow:
      - get:
          url: '/api/leads'
```

## 🚀 Deployment Strategies

### Blue-Green Deployment

```yaml
# Blue-green deployment configuration
deploy-production:
  steps:
    - name: Deploy to blue environment
      run: |
        # Deploy to blue environment
        aws ecs update-service \
          --cluster real-estate-crm-prod \
          --service real-estate-crm-backend-blue \
          --force-new-deployment

    - name: Health check blue environment
      run: |
        # Wait for deployment and health checks
        sleep 300
        curl -f https://blue.your-domain.com/health

    - name: Switch traffic to blue
      run: |
        # Update load balancer to route to blue
        aws elbv2 modify-listener \
          --listener-arn ${{ secrets.PROD_LISTENER_ARN }} \
          --default-actions Type=forward,TargetGroupArn=${{ secrets.BLUE_TARGET_GROUP }}
```

### Canary Deployment

```yaml
# Canary deployment with 10% traffic
deploy-production:
  steps:
    - name: Deploy canary version
      run: |
        aws ecs update-service \
          --cluster real-estate-crm-prod \
          --service real-estate-crm-backend-canary \
          --force-new-deployment

    - name: Route 10% traffic to canary
      run: |
        aws elbv2 modify-listener \
          --listener-arn ${{ secrets.PROD_LISTENER_ARN }} \
          --default-actions '[
            {
              "Type": "forward",
              "ForwardConfig": {
                "TargetGroups": [
                  {"TargetGroupArn": "${{ secrets.PROD_TARGET_GROUP }}", "Weight": 90},
                  {"TargetGroupArn": "${{ secrets.CANARY_TARGET_GROUP }}", "Weight": 10}
                ]
              }
            }
          ]'
```

## 📋 Troubleshooting

### Common Issues

#### Pipeline Not Triggering
```bash
# Check workflow permissions
# Ensure GitHub Actions has proper permissions

# Check branch protection rules
# Verify required status checks are configured

# Check workflow syntax
gh workflow run ci-cd.yml --list
```

#### Build Failures
```bash
# Check build logs
gh run list --workflow=ci-cd.yml

# View specific run logs
gh run view <run-id> --log

# Common issues:
# - Missing dependencies
# - Environment variable not set
# - Docker build cache issues
```

#### Deployment Failures
```bash
# Check AWS permissions
aws sts get-caller-identity

# Verify ECR permissions
aws ecr describe-repositories

# Check ECS service status
aws ecs describe-services \
  --cluster real-estate-crm-production \
  --services real-estate-crm-backend-production
```

#### Test Failures
```bash
# Run tests locally
npm run test:unit
npm run test:integration

# Check test environment
docker-compose -f docker-compose.test.yml ps

# View test logs
docker-compose -f docker-compose.test.yml logs backend
```

## 📊 Metrics & Reporting

### Deployment Metrics

#### Success Rate
```sql
-- Deployment success rate over time
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_deployments,
  COUNT(CASE WHEN status = 'SUCCEEDED' THEN 1 END) as successful_deployments,
  ROUND(
    COUNT(CASE WHEN status = 'SUCCEEDED' THEN 1 END)::decimal /
    COUNT(*)::decimal * 100, 2
  ) as success_rate
FROM deployments
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;
```

#### Deployment Duration
```sql
-- Average deployment duration
SELECT
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_seconds,
  MIN(EXTRACT(EPOCH FROM (completed_at - created_at))) as min_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (completed_at - created_at))) as max_duration_seconds
FROM deployments
WHERE status = 'SUCCEEDED'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days';
```

### Quality Metrics

#### Test Coverage Trends
```javascript
// Track test coverage over time
const coverageTrend = {
  unit: [],
  integration: [],
  e2e: []
};

// Store coverage data in database or external service
// Compare against previous deployments
// Alert on coverage regression
```

#### Performance Trends
```javascript
// Track performance metrics
const performanceMetrics = {
  responseTime: {
    avg: 0,
    p95: 0,
    p99: 0
  },
  throughput: 0,
  errorRate: 0
};

// Compare against baselines
// Alert on performance regression
// Generate performance reports
```

## 🎯 Best Practices

### Code Quality
- [ ] Use pre-commit hooks for linting
- [ ] Maintain test coverage above 80%
- [ ] Use semantic versioning
- [ ] Document breaking changes
- [ ] Code review requirements for main branch

### Security
- [ ] Regular dependency updates
- [ ] Security scanning in CI/CD
- [ ] Secret management with proper rotation
- [ ] Access control and least privilege
- [ ] Security headers and HTTPS enforcement

### Monitoring
- [ ] Comprehensive logging and metrics
- [ ] Alert configuration and escalation
- [ ] Performance monitoring and baselines
- [ ] Error tracking and analysis
- [ ] User experience monitoring

### Deployment
- [ ] Zero-downtime deployment strategies
- [ ] Automated rollback capabilities
- [ ] Environment consistency
- [ ] Configuration management
- [ ] Backup and recovery procedures

---

## 🎉 Deployment Success Checklist

### Pre-Deployment
- [ ] All tests passing locally
- [ ] Code review completed
- [ ] Security scan passed
- [ ] Performance tests completed
- [ ] Documentation updated

### Deployment
- [ ] Pipeline triggered successfully
- [ ] Build completed without errors
- [ ] Tests executed successfully
- [ ] Security scan passed
- [ ] Deployment completed successfully

### Post-Deployment
- [ ] Health checks passing
- [ ] Application responding correctly
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented
- [ ] Team notified of deployment

### Monitoring
- [ ] Performance metrics collected
- [ ] Error rates within acceptable limits
- [ ] User experience monitoring active
- [ ] Alert thresholds configured
- [ ] Incident response procedures documented

**Remember**: Successful deployments require planning, testing, monitoring, and the ability to rollback quickly when issues occur.

---

*Built with enterprise-grade CI/CD practices and comprehensive automation* 🏭