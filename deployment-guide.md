# Real Estate CRM - Deployment Guide

This guide covers deploying the entire Real Estate CRM system to production.

## Architecture Overview

The system consists of:
- **React Native Mobile App** (iOS/Android)
- **n8n Backend** (API workflows)
- **PostgreSQL Database** (data storage)
- **OpenAI Integration** (AI processing)

## Deployment Options

### Option 1: Cloud-Native Deployment (Recommended)

#### Database: Managed PostgreSQL
- **AWS RDS**, **Google Cloud SQL**, or **Azure Database**
- Automated backups and scaling
- High availability with read replicas

#### n8n Backend: Container Deployment
- **Docker** on **AWS ECS**, **Google Cloud Run**, or **Azure Container Instances**
- Auto-scaling based on demand
- Load balancing for high availability

#### Mobile App: App Store Distribution
- **iOS App Store** and **Google Play Store**
- Code signing and app store optimization
- Push notifications via Firebase or native services

### Option 2: Self-Hosted Deployment

#### VPS/Server Setup
- **DigitalOcean**, **Linode**, or **AWS EC2**
- Minimum: 2 CPU cores, 4GB RAM, 50GB storage
- Ubuntu 20.04 LTS or similar

#### Services Setup
- PostgreSQL database
- n8n instance with PM2 process manager
- Nginx reverse proxy
- SSL certificates via Let's Encrypt

## Step-by-Step Deployment

### 1. Database Setup

#### Option A: Managed Database (Recommended)
```bash
# Example: AWS RDS PostgreSQL
# 1. Create RDS instance via AWS Console
# 2. Configure security groups for access
# 3. Run schema creation

psql -h your-rds-endpoint.amazonaws.com -U crm_user -d realestate_crm -f schema.sql
psql -h your-rds-endpoint.amazonaws.com -U crm_user -d realestate_crm -f database/seed.sql
```

#### Option B: Self-Hosted PostgreSQL
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE realestate_crm;
CREATE USER crm_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE realestate_crm TO crm_user;
\\q

# Import schema
psql -U crm_user -d realestate_crm -f schema.sql
psql -U crm_user -d realestate_crm -f database/seed.sql
```

### 2. n8n Backend Deployment

#### Option A: Docker Deployment
```yaml
# docker-compose.production.yml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=your_admin_password
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=your-database-host
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n_user
      - DB_POSTGRESDB_PASSWORD=n8n_password
      - JWT_SECRET=your-super-secret-jwt-key-change-in-production
      - OPENAI_API_KEY=your-openai-api-key
      - NODE_FUNCTION_ALLOW_EXTERNAL=bcryptjs,jsonwebtoken
      - WEBHOOK_URL=https://your-domain.com/
    volumes:
      - n8n_data:/home/node/.n8n
    restart: unless-stopped

volumes:
  n8n_data:
```

#### Option B: Direct Installation
```bash
# Install Node.js and n8n
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g n8n pm2

# Set environment variables
export JWT_SECRET="your-super-secret-jwt-key-change-in-production"
export OPENAI_API_KEY="your-openai-api-key"
export NODE_FUNCTION_ALLOW_EXTERNAL="bcryptjs,jsonwebtoken"
export DB_TYPE="postgresdb"
export DB_POSTGRESDB_HOST="localhost"
export DB_POSTGRESDB_DATABASE="n8n"
export DB_POSTGRESDB_USER="n8n_user"
export DB_POSTGRESDB_PASSWORD="n8n_password"

# Start n8n with PM2
pm2 start n8n --name "n8n-crm"
pm2 startup
pm2 save
```

### 3. Reverse Proxy & SSL (Self-Hosted)

#### Nginx Configuration
```nginx
# /etc/nginx/sites-available/realestate-crm
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location /webhook/ {
        proxy_pass http://localhost:5678/webhook/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://localhost:5678/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support for n8n UI
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

#### SSL Certificate Setup
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 4. React Native App Build & Distribution

#### iOS Build & Distribution
```bash
# Navigate to iOS directory
cd frontend/ios

# Install dependencies
pod install

# Build for App Store
xcodebuild -workspace RealEstateCRM.xcworkspace \
           -scheme RealEstateCRM \
           -configuration Release \
           -archivePath RealEstateCRM.xcarchive \
           archive

# Export for App Store
xcodebuild -exportArchive \
           -archivePath RealEstateCRM.xcarchive \
           -exportPath ./build \
           -exportOptionsPlist exportOptions.plist
```

#### Android Build & Distribution
```bash
# Generate signed APK
cd frontend/android
./gradlew assembleRelease

# Generate signed AAB for Play Store
./gradlew bundleRelease

# APK location: android/app/build/outputs/apk/release/
# AAB location: android/app/build/outputs/bundle/release/
```

## Environment Configuration

### Production Environment Variables

#### n8n Backend
```bash
# Security
JWT_SECRET=generate-a-secure-256-bit-key-here
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=secure-admin-password

# Database
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=your-database-host
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=realestate_crm
DB_POSTGRESDB_USER=crm_user
DB_POSTGRESDB_PASSWORD=secure-database-password

# External APIs
OPENAI_API_KEY=sk-your-openai-api-key
NODE_FUNCTION_ALLOW_EXTERNAL=bcryptjs,jsonwebtoken

# URLs
WEBHOOK_URL=https://your-domain.com/
N8N_HOST=your-domain.com
N8N_PORT=443
N8N_PROTOCOL=https
```

#### React Native App Configuration
```typescript
// frontend/src/config/production.ts
export const config = {
  API_BASE_URL: 'https://your-domain.com',
  API_TIMEOUT: 10000,
  ENVIRONMENT: 'production',
  DEBUG: false,
};
```

## Security Hardening

### Database Security
```sql
-- Create read-only user for analytics
CREATE USER crm_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE realestate_crm TO crm_readonly;
GRANT USAGE ON SCHEMA public TO crm_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO crm_readonly;

-- Enable row-level security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_leads ON leads FOR ALL TO crm_user USING (user_id = current_setting('app.current_user_id')::integer);
```

### Server Security
```bash
# Firewall setup
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades

# Fail2ban for brute force protection
sudo apt install fail2ban
```

### Application Security
- Regular dependency updates
- API rate limiting
- Input validation and sanitization
- Secure session management
- HTTPS everywhere
- Database connection encryption

## Monitoring & Maintenance

### Health Monitoring
```bash
# n8n health check endpoint
curl https://your-domain.com/healthz

# Database health check
pg_isready -h your-database-host -p 5432 -U crm_user
```

### Log Management
```bash
# n8n logs with PM2
pm2 logs n8n-crm

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Backup Strategy

#### Database Backups
```bash
#!/bin/bash
# daily-backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="realestate_crm"

# Create backup
pg_dump -h your-database-host -U crm_user $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://your-backup-bucket/database/
```

#### n8n Workflow Backups
```bash
# Export all workflows
curl -u admin:password https://your-domain.com/rest/workflows > workflows_backup.json

# Backup n8n data directory
tar -czf n8n_data_backup_$(date +%Y%m%d).tar.gz /home/node/.n8n/
```

### Performance Monitoring

#### Database Performance
```sql
-- Monitor slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Monitor connections
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';
```

#### Application Metrics
- API response times
- Error rates
- Active users
- Lead conversion metrics
- System resource usage

## Scaling Considerations

### Horizontal Scaling
- Load balancer for multiple n8n instances
- Database read replicas
- CDN for static assets
- Microservices architecture

### Vertical Scaling
- Increase server resources
- Database optimization
- Connection pooling
- Caching layers (Redis)

### Cost Optimization
- Reserved instances for predictable workloads
- Spot instances for development
- Database connection pooling
- Efficient query optimization
- Image and asset optimization

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check network connectivity
   - Verify credentials
   - Check connection limits

2. **n8n Workflow Failures**
   - Review execution logs
   - Verify environment variables
   - Check external API limits

3. **Mobile App Connection Issues**
   - Verify API endpoint URLs
   - Check SSL certificate validity
   - Review CORS settings

4. **Performance Issues**
   - Monitor database queries
   - Check server resources
   - Review n8n workflow efficiency

### Emergency Procedures

1. **Database Recovery**
   ```bash
   # Restore from backup
   psql -h your-host -U crm_user -d realestate_crm < backup_file.sql
   ```

2. **n8n Recovery**
   ```bash
   # Restart n8n service
   pm2 restart n8n-crm
   
   # Restore workflows
   curl -u admin:password -X POST -H "Content-Type: application/json" \
        -d @workflows_backup.json \
        https://your-domain.com/rest/workflows/import
   ```

## Conclusion

This deployment guide provides a comprehensive approach to deploying the Real Estate CRM system. Choose the deployment option that best fits your requirements, resources, and technical expertise. Remember to regularly update dependencies, monitor system health, and maintain proper backups.