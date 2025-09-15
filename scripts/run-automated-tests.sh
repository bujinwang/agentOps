#!/bin/bash

# Automated Test Runner Script
# This script orchestrates all automated tests for the Real Estate CRM

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"
TEST_RESULTS_DIR="$PROJECT_ROOT/test-results"
COVERAGE_DIR="$PROJECT_ROOT/coverage"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$TEST_RESULTS_DIR/automated_test_run_$TIMESTAMP.log"

# Test configuration
PARALLEL_JOBS=${PARALLEL_JOBS:-4}
TEST_TIMEOUT=${TEST_TIMEOUT:-300000} # 5 minutes
COVERAGE_THRESHOLD=${COVERAGE_THRESHOLD:-70}

# Create directories
mkdir -p "$TEST_RESULTS_DIR"
mkdir -p "$COVERAGE_DIR"

# Logging function
log() {
    echo -e "$(date +"%Y-%m-%d %H:%M:%S") - $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    echo -e "${RED}❌ Error: $1${NC}" >&2
    log "ERROR: $1"
    exit 1
}

# Success message
success() {
    echo -e "${GREEN}✅ $1${NC}"
    log "SUCCESS: $1"
}

# Warning message
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    log "WARNING: $1"
}

# Info message
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    log "INFO: $1"
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        error_exit "Node.js is not installed"
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        error_exit "npm is not installed"
    fi

    # Check Deno for backend
    if ! command -v deno &> /dev/null; then
        error_exit "Deno is not installed"
    fi

    # Check if directories exist
    if [ ! -d "$FRONTEND_DIR" ]; then
        error_exit "Frontend directory not found: $FRONTEND_DIR"
    fi

    if [ ! -d "$BACKEND_DIR" ]; then
        error_exit "Backend directory not found: $BACKEND_DIR"
    fi

    success "Prerequisites check passed"
}

# Setup test environment
setup_environment() {
    info "Setting up test environment..."

    # Install frontend dependencies if needed
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        info "Installing frontend dependencies..."
        cd "$FRONTEND_DIR"
        npm ci || error_exit "Failed to install frontend dependencies"
        cd "$PROJECT_ROOT"
    fi

    # Setup backend dependencies
    info "Setting up backend dependencies..."
    cd "$BACKEND_DIR"
    deno cache --reload src/deps.ts || warning "Failed to cache backend dependencies"
    cd "$PROJECT_ROOT"

    success "Test environment setup completed"
}

# Run frontend linting
run_frontend_lint() {
    info "Running frontend linting..."

    cd "$FRONTEND_DIR"
    if npm run lint > "$TEST_RESULTS_DIR/frontend-lint-$TIMESTAMP.log" 2>&1; then
        success "Frontend linting passed"
    else
        warning "Frontend linting failed - check $TEST_RESULTS_DIR/frontend-lint-$TIMESTAMP.log"
        return 1
    fi
    cd "$PROJECT_ROOT"
}

# Run frontend unit tests
run_frontend_unit_tests() {
    info "Running frontend unit tests..."

    cd "$FRONTEND_DIR"
    if npm run test:unit -- --watchAll=false --verbose --testTimeout=$TEST_TIMEOUT \
        --outputFile="$TEST_RESULTS_DIR/frontend-unit-results-$TIMESTAMP.json" \
        --json > "$TEST_RESULTS_DIR/frontend-unit-$TIMESTAMP.log" 2>&1; then
        success "Frontend unit tests passed"
    else
        warning "Frontend unit tests failed - check $TEST_RESULTS_DIR/frontend-unit-$TIMESTAMP.log"
        return 1
    fi
    cd "$PROJECT_ROOT"
}

# Run frontend component tests
run_frontend_component_tests() {
    info "Running frontend component tests..."

    cd "$FRONTEND_DIR"
    if npm run test:component -- --watchAll=false --verbose --testTimeout=$TEST_TIMEOUT \
        --outputFile="$TEST_RESULTS_DIR/frontend-component-results-$TIMESTAMP.json" \
        --json > "$TEST_RESULTS_DIR/frontend-component-$TIMESTAMP.log" 2>&1; then
        success "Frontend component tests passed"
    else
        warning "Frontend component tests failed - check $TEST_RESULTS_DIR/frontend-component-$TIMESTAMP.log"
        return 1
    fi
    cd "$PROJECT_ROOT"
}

# Run frontend integration tests
run_frontend_integration_tests() {
    info "Running frontend integration tests..."

    cd "$FRONTEND_DIR"
    if npm run test:integration -- --watchAll=false --verbose --testTimeout=$TEST_TIMEOUT \
        --outputFile="$TEST_RESULTS_DIR/frontend-integration-results-$TIMESTAMP.json" \
        --json > "$TEST_RESULTS_DIR/frontend-integration-$TIMESTAMP.log" 2>&1; then
        success "Frontend integration tests passed"
    else
        warning "Frontend integration tests failed - check $TEST_RESULTS_DIR/frontend-integration-$TIMESTAMP.log"
        return 1
    fi
    cd "$PROJECT_ROOT"
}

# Run frontend coverage analysis
run_frontend_coverage() {
    info "Running frontend coverage analysis..."

    cd "$FRONTEND_DIR"
    if npm run test:coverage > "$TEST_RESULTS_DIR/frontend-coverage-$TIMESTAMP.log" 2>&1; then
        success "Frontend coverage analysis completed"

        # Run coverage analysis script
        if npm run test:coverage:analysis > "$TEST_RESULTS_DIR/frontend-coverage-analysis-$TIMESTAMP.log" 2>&1; then
            success "Frontend coverage analysis script completed"
        else
            warning "Frontend coverage analysis script failed"
        fi
    else
        warning "Frontend coverage generation failed"
        return 1
    fi
    cd "$PROJECT_ROOT"
}

# Run frontend accessibility tests
run_frontend_accessibility_tests() {
    info "Running frontend accessibility tests..."

    cd "$FRONTEND_DIR"
    if npm run test:accessibility > "$TEST_RESULTS_DIR/frontend-accessibility-$TIMESTAMP.log" 2>&1; then
        success "Frontend accessibility tests passed"
    else
        warning "Frontend accessibility tests failed - check $TEST_RESULTS_DIR/frontend-accessibility-$TIMESTAMP.log"
        return 1
    fi
    cd "$PROJECT_ROOT"
}

# Run frontend performance tests
run_frontend_performance_tests() {
    info "Running frontend performance tests..."

    cd "$FRONTEND_DIR"
    if npm run test:performance > "$TEST_RESULTS_DIR/frontend-performance-$TIMESTAMP.log" 2>&1; then
        success "Frontend performance tests passed"
    else
        warning "Frontend performance tests failed - check $TEST_RESULTS_DIR/frontend-performance-$TIMESTAMP.log"
        return 1
    fi
    cd "$PROJECT_ROOT"
}

# Run backend tests
run_backend_tests() {
    info "Running backend tests..."

    cd "$BACKEND_DIR"
    if deno test --allow-all --coverage=coverage --parallel \
        > "$TEST_RESULTS_DIR/backend-test-$TIMESTAMP.log" 2>&1; then
        success "Backend tests passed"

        # Generate coverage report
        if deno coverage coverage --lcov > "$COVERAGE_DIR/backend-coverage-$TIMESTAMP.lcov" 2>&1; then
            success "Backend coverage report generated"
        else
            warning "Backend coverage report generation failed"
        fi
    else
        warning "Backend tests failed - check $TEST_RESULTS_DIR/backend-test-$TIMESTAMP.log"
        return 1
    fi
    cd "$PROJECT_ROOT"
}

# Run E2E tests
run_e2e_tests() {
    info "Running E2E tests..."

    cd "$FRONTEND_DIR"
    if npm run test:e2e > "$TEST_RESULTS_DIR/e2e-test-$TIMESTAMP.log" 2>&1; then
        success "E2E tests passed"
    else
        warning "E2E tests failed - check $TEST_RESULTS_DIR/e2e-test-$TIMESTAMP.log"
        return 1
    fi
    cd "$PROJECT_ROOT"
}

# Generate test summary report
generate_summary_report() {
    info "Generating test summary report..."

    local report_file="$TEST_RESULTS_DIR/test-summary-$TIMESTAMP.md"

    cat > "$report_file" << EOF
# Automated Test Run Summary
**Date:** $(date)
**Timestamp:** $TIMESTAMP
**Test Environment:** $(hostname)

## Test Results Overview

### Frontend Tests
- ✅ Linting: $([ -f "$TEST_RESULTS_DIR/frontend-lint-$TIMESTAMP.log" ] && echo "Completed" || echo "Not run")
- ✅ Unit Tests: $([ -f "$TEST_RESULTS_DIR/frontend-unit-$TIMESTAMP.log" ] && echo "Completed" || echo "Not run")
- ✅ Component Tests: $([ -f "$TEST_RESULTS_DIR/frontend-component-$TIMESTAMP.log" ] && echo "Completed" || echo "Not run")
- ✅ Integration Tests: $([ -f "$TEST_RESULTS_DIR/frontend-integration-$TIMESTAMP.log" ] && echo "Completed" || echo "Not run")
- ✅ Coverage Analysis: $([ -f "$TEST_RESULTS_DIR/frontend-coverage-$TIMESTAMP.log" ] && echo "Completed" || echo "Not run")
- ✅ Accessibility Tests: $([ -f "$TEST_RESULTS_DIR/frontend-accessibility-$TIMESTAMP.log" ] && echo "Completed" || echo "Not run")
- ✅ Performance Tests: $([ -f "$TEST_RESULTS_DIR/frontend-performance-$TIMESTAMP.log" ] && echo "Completed" || echo "Not run")

### Backend Tests
- ✅ Backend Tests: $([ -f "$TEST_RESULTS_DIR/backend-test-$TIMESTAMP.log" ] && echo "Completed" || echo "Not run")
- ✅ Backend Coverage: $([ -f "$COVERAGE_DIR/backend-coverage-$TIMESTAMP.lcov" ] && echo "Generated" || echo "Not generated")

### E2E Tests
- ✅ E2E Tests: $([ -f "$TEST_RESULTS_DIR/e2e-test-$TIMESTAMP.log" ] && echo "Completed" || echo "Not run")

## Coverage Summary

### Frontend Coverage
\`\`\`
$(cat "$FRONTEND_DIR/coverage/coverage-summary.txt" 2>/dev/null || echo "Coverage report not available")
\`\`\`

### Backend Coverage
- Coverage report: $COVERAGE_DIR/backend-coverage-$TIMESTAMP.lcov

## Log Files
- Main log: $LOG_FILE
- Frontend logs: $TEST_RESULTS_DIR/frontend-*-$TIMESTAMP.log
- Backend logs: $TEST_RESULTS_DIR/backend-*-$TIMESTAMP.log
- E2E logs: $TEST_RESULTS_DIR/e2e-*-$TIMESTAMP.log

## Next Steps
1. Review detailed logs for any failures
2. Address failing tests
3. Update test cases as needed
4. Run coverage analysis for improvement recommendations
EOF

    success "Test summary report generated: $report_file"
}

# Main execution function
main() {
    local start_time=$(date +%s)
    local exit_code=0

    log "Starting automated test run..."

    # Run all test phases
    check_prerequisites || exit_code=1
    setup_environment || exit_code=1

    # Frontend tests
    run_frontend_lint || exit_code=1
    run_frontend_unit_tests || exit_code=1
    run_frontend_component_tests || exit_code=1
    run_frontend_integration_tests || exit_code=1
    run_frontend_coverage || exit_code=1
    run_frontend_accessibility_tests || exit_code=1
    run_frontend_performance_tests || exit_code=1

    # Backend tests
    run_backend_tests || exit_code=1

    # E2E tests
    run_e2e_tests || exit_code=1

    # Generate summary
    generate_summary_report

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    if [ $exit_code -eq 0 ]; then
        success "All automated tests completed successfully in ${duration}s"
        log "Test run completed successfully"
    else
        warning "Some tests failed - check logs for details"
        log "Test run completed with failures"
    fi

    log "Total execution time: ${duration}s"
    exit $exit_code
}

# Handle command line arguments
case "${1:-}" in
    "lint")
        check_prerequisites && run_frontend_lint
        ;;
    "unit")
        check_prerequisites && setup_environment && run_frontend_unit_tests
        ;;
    "component")
        check_prerequisites && setup_environment && run_frontend_component_tests
        ;;
    "integration")
        check_prerequisites && setup_environment && run_frontend_integration_tests
        ;;
    "coverage")
        check_prerequisites && setup_environment && run_frontend_coverage
        ;;
    "accessibility")
        check_prerequisites && setup_environment && run_frontend_accessibility_tests
        ;;
    "performance")
        check_prerequisites && setup_environment && run_frontend_performance_tests
        ;;
    "backend")
        check_prerequisites && run_backend_tests
        ;;
    "e2e")
        check_prerequisites && setup_environment && run_e2e_tests
        ;;
    "setup")
        check_prerequisites && setup_environment
        ;;
    *)
        main
        ;;
esac