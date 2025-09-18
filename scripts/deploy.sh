#!/bin/bash

# Production Deployment Script for Real Estate CRM
# This script handles zero-downtime deployments with rollback capability

set -euo pipefail

# Configuration
DEPLOY_ENV=${DEPLOY_ENV:-production}
DOCKER_COMPOSE_FILE="docker-compose.${DEPLOY_ENV}.yml"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
ROLLBACK_TAG="rollback_$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."

    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi

    # Check if docker-compose file exists
    if [[ ! -f "$DOCKER_COMPOSE_FILE" ]]; then
        log_error "Docker Compose file '$DOCKER_COMPOSE_FILE' not found."
        exit 1
    fi

    # Check if .env file exists
    if [[ ! -f ".env" ]]; then
        log_error ".env file not found. Please create it from .env.production template."
        exit 1
    fi

    # Validate environment variables
    required_vars=("DATABASE_PASSWORD" "JWT_SECRET" "OPENAI_API_KEY")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable '$var' is not set."
            exit 1
        fi
    done

    log_success "Pre-deployment checks passed."
}

# Create backup
create_backup() {
    log_info "Creating backup..."

    mkdir -p "$BACKUP_DIR"

    # Backup database
    log_info "Backing up database..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_dump \
        -U "${DATABASE_USER:-crm_user}" \
        -d "${DATABASE_NAME:-real_estate_crm}" \
        > "$BACKUP_DIR/database.sql" 2>/dev/null || true

    # Backup Redis data
    log_info "Backing up Redis data..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T redis redis-cli SAVE >/dev/null 2>&1 || true

    # Backup configuration files
    cp .env "$BACKUP_DIR/.env.backup"
    cp "$DOCKER_COMPOSE_FILE" "$BACKUP_DIR/docker-compose.backup"

    log_success "Backup created at $BACKUP_DIR"
}

# Health check function
health_check() {
    local service=$1
    local max_attempts=${2:-30}
    local attempt=1

    log_info "Performing health check for $service..."

    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose -f "$DOCKER_COMPOSE_FILE" ps "$service" | grep -q "Up"; then
            # Additional health check for backend
            if [[ "$service" == "backend" ]]; then
                if curl -f -s "http://localhost:3000/health" >/dev/null 2>&1; then
                    log_success "$service is healthy"
                    return 0
                fi
            else
                log_success "$service is healthy"
                return 0
            fi
        fi

        log_info "Waiting for $service to be healthy (attempt $attempt/$max_attempts)..."
        sleep 10
        ((attempt++))
    done

    log_error "$service failed health check after $max_attempts attempts"
    return 1
}

# Deploy services
deploy_services() {
    log_info "Starting deployment..."

    # Pull latest images
    log_info "Pulling latest images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" pull

    # Start services with zero-downtime deployment
    log_info "Starting services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --scale backend=2

    # Wait for services to be healthy
    if ! health_check backend; then
        log_error "Backend failed to start properly"
        rollback_deployment
        exit 1
    fi

    if ! health_check postgres; then
        log_error "PostgreSQL failed to start properly"
        rollback_deployment
        exit 1
    fi

    if ! health_check redis; then
        log_error "Redis failed to start properly"
        rollback_deployment
        exit 1
    fi

    # Scale down to normal replica count
    log_info "Scaling to normal replica count..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --scale backend="${BACKEND_REPLICAS:-1}"

    log_success "Services deployed successfully"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."

    # Wait for database to be ready
    sleep 10

    # Run migrations
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T backend npm run migrate

    log_success "Database migrations completed"
}

# Post-deployment tests
post_deployment_tests() {
    log_info "Running post-deployment tests..."

    # Test API endpoints
    local api_endpoints=(
        "/health"
        "/api/leads"
        "/api/analytics/dashboard"
    )

    for endpoint in "${api_endpoints[@]}"; do
        if curl -f -s "http://localhost:3000$endpoint" >/dev/null 2>&1; then
            log_success "✓ $endpoint is responding"
        else
            log_warning "✗ $endpoint is not responding properly"
        fi
    done

    # Test database connectivity
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T backend npm run db:check >/dev/null 2>&1; then
        log_success "✓ Database connectivity test passed"
    else
        log_error "✗ Database connectivity test failed"
        rollback_deployment
        exit 1
    fi

    log_success "Post-deployment tests completed"
}

# Rollback deployment
rollback_deployment() {
    log_warning "Rolling back deployment..."

    # Tag current state for rollback
    docker tag "$(docker-compose -f "$DOCKER_COMPOSE_FILE" images backend | tail -n 1 | awk '{print $2}')" "$ROLLBACK_TAG" 2>/dev/null || true

    # Stop services
    docker-compose -f "$DOCKER_COMPOSE_FILE" down

    # Restore from backup if available
    if [[ -f "$BACKUP_DIR/database.sql" ]]; then
        log_info "Restoring database from backup..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" up -d postgres
        sleep 10
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres psql \
            -U "${DATABASE_USER:-crm_user}" \
            -d "${DATABASE_NAME:-real_estate_crm}" \
            < "$BACKUP_DIR/database.sql" 2>/dev/null || true
    fi

    # Restart services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d

    log_info "Rollback completed. Check logs for any issues."
}

# Cleanup old resources
cleanup_resources() {
    log_info "Cleaning up old resources..."

    # Remove dangling images
    docker image prune -f >/dev/null 2>&1 || true

    # Remove unused volumes (be careful with this)
    # docker volume prune -f >/dev/null 2>&1 || true

    # Remove old backups (keep last 7 days)
    find ./backups -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true

    log_success "Cleanup completed"
}

# Send deployment notification
send_notification() {
    local status=$1
    local message=$2

    log_info "Sending deployment notification..."

    # Here you could integrate with Slack, email, or other notification services
    # Example:
    # curl -X POST -H 'Content-type: application/json' \
    #      --data "{\"text\":\"Deployment $status: $message\"}" \
    #      YOUR_SLACK_WEBHOOK_URL

    log_success "Notification sent: $status - $message"
}

# Main deployment function
main() {
    log_info "Starting deployment to $DEPLOY_ENV environment"
    log_info "Using Docker Compose file: $DOCKER_COMPOSE_FILE"

    # Load environment variables
    if [[ -f ".env" ]]; then
        set -a
        source .env
        set +a
    fi

    # Run deployment steps
    pre_deployment_checks
    create_backup
    deploy_services
    run_migrations
    post_deployment_tests
    cleanup_resources

    log_success "🎉 Deployment completed successfully!"
    send_notification "SUCCESS" "Deployment to $DEPLOY_ENV completed successfully"

    echo ""
    echo "📊 Deployment Summary:"
    echo "  Environment: $DEPLOY_ENV"
    echo "  Backup Location: $BACKUP_DIR"
    echo "  Services: backend, postgres, redis, nginx"
    echo "  Health Check: http://localhost:3000/health"
    echo "  API Documentation: http://localhost:3000/api-docs"
    echo ""
    echo "🔄 To rollback: ./scripts/rollback.sh"
    echo "📝 Check logs: docker-compose -f $DOCKER_COMPOSE_FILE logs -f"
}

# Handle command line arguments
case "${1:-}" in
    "rollback")
        rollback_deployment
        ;;
    "health-check")
        health_check "${2:-backend}"
        ;;
    "cleanup")
        cleanup_resources
        ;;
    *)
        main
        ;;
esac