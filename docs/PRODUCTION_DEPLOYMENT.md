# 🚀 Production Deployment Guide

This comprehensive guide covers production deployment, configuration, monitoring, and maintenance for the Real Estate CRM system.

## 📋 Prerequisites

### System Requirements
- **Docker**: 20.10+ with Docker Compose
- **SSL Certificates**: Valid certificates for your domain
- **Domain**: Configured DNS pointing to your server
- **Security**: Firewall configured for required ports only

### Required Ports
```bash
# Application Ports
80    # HTTP (redirects to HTTPS)
443   # HTTPS (main application)
3000  # Backend API (internal)
5432  # PostgreSQL (internal)
6379  # Redis (internal)

# Monitoring Ports (optional)
9090  # Prometheus
3001  # Grafana
3100  # Loki
```

## 🔧 Production Configuration

### 1. Environment Setup

#### Create Production Environment File
```bash
# Copy the production template
cp .env.production .env

# Edit with your production values
nano .env
```

#### Required Environment Variables
```env
# Database
DATABASE_URL=postgresql://crm_user:your_secure_password@postgres:5432/real_estate_crm
DATABASE_PASSWORD=your_secure_password

# Security
JWT_SECRET=your-super-secure-jwt-secret-change-this-in-production
OPENAI_API_KEY=your-openai-api-key

# Domain
CORS_ORIGIN=https://your-domain.com

# SSL (if using Let's Encrypt)
SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
SSL_KEY_PATH=/etc/nginx/ssl/key.pem
```

### 2. SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt update
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates to nginx directory
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
sudo cp /etc/letsencrypt/live/your-domain.com/chain.pem nginx/ssl/ca.pem
```

#### Option B: Custom SSL Certificates
```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy your certificates
cp your-domain.crt nginx/ssl/cert.pem
cp your-domain.key nginx/ssl/key.pem
cp ca-bundle.crt nginx/ssl/ca.pem
```

### 3. Domain Configuration

#### DNS Setup
Ensure your domain DNS records point to your server:
```
Type: A
Name: your-domain.com
Value: YOUR_SERVER_IP

Type: A
Name: www.your-domain.com
Value: YOUR_SERVER_IP
```

#### Nginx Domain Configuration
Update `nginx/nginx.conf`:
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    # ... rest of configuration
}
```

## 🚀 Deployment Process

### Automated Deployment

#### Using the Deployment Script
```bash
# Make script executable
chmod +x scripts/deploy.sh

# Run production deployment
DEPLOY_ENV=production ./scripts/deploy.sh
```

#### Manual Deployment Steps
```bash
# 1. Build and start services
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# 2. Run database migrations
docker-compose -f docker-compose.prod.yml exec backend npm run migrate

# 3. Verify deployment
curl -k https://your-domain.com/health
curl -k https://your-domain.com/api/leads
```

### Zero-Downtime Deployment

The deployment script supports zero-downtime deployments:

1. **Health Checks**: Verifies all services are healthy before routing traffic
2. **Load Balancing**: Gradually shifts traffic to new instances
3. **Rollback**: Automatic rollback if health checks fail
4. **Monitoring**: Continuous monitoring during deployment

## 📊 Monitoring Setup

### 1. Prometheus & Grafana

#### Start Monitoring Stack
```bash
# Start monitoring services
docker-compose -f docker-compose.prod.yml up -d prometheus grafana loki promtail

# Access Grafana
open https://your-domain.com:3001
# Default credentials: admin/admin
```

#### Configure Grafana Dashboards

1. **Add Prometheus Data Source**
   - URL: `http://prometheus:9090`
   - Access: Server (default)

2. **Import Dashboards**
   - Application Performance Dashboard
   - System Resources Dashboard
   - Database Performance Dashboard
   - Business Metrics Dashboard

### 2. Application Monitoring

#### Health Check Endpoints
```bash
# Application health
curl https://your-domain.com/health

# Detailed health with metrics
curl https://your-domain.com/health/detailed

# Performance metrics
curl https://your-domain.com/api/performance/metrics

# Cache statistics
curl https://your-domain.com/api/cache/stats
```

#### Log Aggregation

Logs are automatically collected by Loki and visualized in Grafana:

- **Application Logs**: Backend service logs
- **Nginx Logs**: Access and error logs
- **Database Logs**: PostgreSQL logs
- **System Logs**: Docker container logs

## 🔒 Security Configuration

### 1. Firewall Setup

```bash
# UFW (Ubuntu/Debian)
sudo ufw enable
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 9090/tcp    # Prometheus (monitoring)
sudo ufw allow 3001/tcp    # Grafana (monitoring)
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

### 2. SSL/TLS Configuration

The nginx configuration includes:
- **TLS 1.2/1.3 only**: Disables older insecure protocols
- **Strong ciphers**: Uses only secure cipher suites
- **HSTS**: HTTP Strict Transport Security enabled
- **Security headers**: OWASP recommended headers

### 3. Database Security

```sql
-- Create production database user
CREATE USER crm_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE real_estate_crm TO crm_user;

-- Enable SSL connections
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = '/var/lib/postgresql/ssl/server.crt';
ALTER SYSTEM SET ssl_key_file = '/var/lib/postgresql/ssl/server.key';
```

### 4. Backup Security

```bash
# Encrypt backups
BACKUP_ENCRYPTION=true
BACKUP_ENCRYPTION_KEY=your-encryption-key

# Secure backup storage
BACKUP_S3_BUCKET=your-secure-backup-bucket
BACKUP_S3_REGION=us-east-1
BACKUP_S3_ACCESS_KEY=your-limited-access-key
BACKUP_S3_SECRET_KEY=your-limited-secret-key
```

## 🔄 Backup and Recovery

### Automated Backups

#### Database Backups
```bash
# Daily database backup (configured in docker-compose.prod.yml)
# Backups are stored in ./backups/ directory
# Automatic cleanup keeps last 30 days

# Manual backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump \
  -U crm_user -d real_estate_crm > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Configuration Backups
```bash
# Backup environment and configuration
tar -czf config_backup_$(date +%Y%m%d).tar.gz \
  .env docker-compose.prod.yml nginx/
```

### Recovery Procedures

#### Database Recovery
```bash
# Stop application
docker-compose -f docker-compose.prod.yml stop backend

# Restore database
docker-compose -f docker-compose.prod.yml exec -T postgres psql \
  -U crm_user -d real_estate_crm < backup_file.sql

# Restart application
docker-compose -f docker-compose.prod.yml start backend
```

#### Full System Recovery
```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Restore volumes from backup
# (Implement based on your backup strategy)

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

## 📈 Scaling and Performance

### Horizontal Scaling

#### Add More Backend Instances
```bash
# Scale backend service
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Update nginx configuration for load balancing
# (nginx.conf already configured for load balancing)
```

#### Database Scaling
```bash
# Add read replicas
# Configure PostgreSQL streaming replication
# Update connection strings in application
```

### Performance Optimization

#### Application Performance
```bash
# Enable performance monitoring
PERFORMANCE_MONITORING_ENABLED=true

# Adjust cache settings
CACHE_DEFAULT_TTL=600
CACHE_MAX_MEMORY_ITEMS=2000

# Optimize database connections
DATABASE_MAX_CONNECTIONS=30
DATABASE_IDLE_TIMEOUT=60000
```

#### System Performance
```bash
# Adjust Docker resource limits
BACKEND_MEMORY_LIMIT=2G
BACKEND_CPU_LIMIT=2.0

# Optimize nginx worker processes
worker_processes auto;
worker_connections 2048;
```

## 🔧 Maintenance Procedures

### Regular Maintenance Tasks

#### Weekly Tasks
```bash
# Update Docker images
docker-compose -f docker-compose.prod.yml pull

# Clean up unused Docker resources
docker system prune -f

# Rotate application logs
# (Configured in docker-compose.prod.yml)
```

#### Monthly Tasks
```bash
# Security updates
docker-compose -f docker-compose.prod.yml build --no-cache

# Database maintenance
docker-compose -f docker-compose.prod.yml exec postgres vacuumdb \
  --all --analyze --verbose

# SSL certificate renewal
sudo certbot renew
```

### Emergency Procedures

#### Service Outage Response
1. **Check service status**: `docker-compose -f docker-compose.prod.yml ps`
2. **View logs**: `docker-compose -f docker-compose.prod.yml logs [service]`
3. **Restart service**: `docker-compose -f docker-compose.prod.yml restart [service]`
4. **Check monitoring**: Review Grafana dashboards
5. **Escalate if needed**: Contact on-call engineer

#### Data Loss Recovery
1. **Assess impact**: Determine what data was lost
2. **Stop application**: Prevent further data corruption
3. **Restore from backup**: Use latest backup
4. **Verify integrity**: Run health checks
5. **Resume operations**: Gradually bring services back online

## 📊 Monitoring and Alerting

### Key Metrics to Monitor

#### Application Metrics
- **Response Time**: < 500ms average, < 2s 95th percentile
- **Error Rate**: < 1% of total requests
- **Throughput**: Requests per minute trends
- **Cache Hit Rate**: > 80% for optimal performance

#### System Metrics
- **CPU Usage**: < 70% sustained usage
- **Memory Usage**: < 80% of available memory
- **Disk Usage**: < 80% of available space
- **Network I/O**: Monitor for bottlenecks

#### Business Metrics
- **Lead Conversion Rate**: Track conversion funnel
- **User Activity**: Monitor user engagement
- **API Usage**: Track endpoint usage patterns
- **Error Patterns**: Identify common failure points

### Alert Configuration

Alerts are configured in `monitoring/alert_rules.yml`:

- **Critical**: Immediate response required (service down, data loss)
- **Warning**: Monitor closely, may require action
- **Info**: Track for trends, no immediate action needed

## 🚨 Troubleshooting

### Common Issues

#### Application Not Starting
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Check environment variables
docker-compose -f docker-compose.prod.yml exec backend env

# Verify database connectivity
docker-compose -f docker-compose.prod.yml exec backend npm run db:check
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Check connection from application
docker-compose -f docker-compose.prod.yml exec backend npm run db:check

# Verify connection string
docker-compose -f docker-compose.prod.yml exec backend env | grep DATABASE
```

#### SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Test SSL connection
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Renew certificates
sudo certbot renew
```

#### Performance Issues
```bash
# Check application metrics
curl https://your-domain.com/api/performance/metrics

# Monitor system resources
docker stats

# Check cache performance
curl https://your-domain.com/api/cache/stats
```

## 📞 Support and Escalation

### Support Levels

1. **Level 1**: Application monitoring and basic troubleshooting
2. **Level 2**: Infrastructure and system-level issues
3. **Level 3**: Critical incidents requiring immediate response

### Escalation Procedures

- **Business Hours**: Contact development team
- **After Hours**: Contact on-call engineer
- **Critical Issues**: Use emergency contact procedures

### Documentation Resources

- **Runbooks**: `docs/runbooks/` - Detailed troubleshooting guides
- **API Documentation**: `http://localhost:3000/api-docs`
- **Monitoring Dashboards**: Grafana dashboards
- **System Architecture**: `docs/architecture/`

---

## 🎯 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] DNS records updated
- [ ] Firewall configured
- [ ] Backup strategy implemented

### Deployment
- [ ] Services started successfully
- [ ] Database migrations completed
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] SSL certificates working

### Post-Deployment
- [ ] Application accessible via HTTPS
- [ ] API endpoints responding
- [ ] Monitoring dashboards working
- [ ] Backup verification completed
- [ ] Team notified of deployment

### Ongoing Maintenance
- [ ] Regular security updates
- [ ] Performance monitoring
- [ ] Backup verification
- [ ] Log rotation
- [ ] Certificate renewal

**Remember**: Always test deployments in staging before production, and have a rollback plan ready.

---

*Built with production-ready architecture and enterprise-grade reliability* 🏭