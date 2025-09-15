#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Performance Regression Check Script
 * Analyzes k6 load test results against baseline performance metrics
 * Used in CI/CD pipeline to prevent performance regressions
 */

class PerformanceRegressionChecker {
  constructor() {
    this.baselineFile = path.join(__dirname, 'performance-baseline.json');
    this.thresholds = {
      responseTime: 1.2, // 20% degradation allowed
      errorRate: 0.05,   // 5% error rate increase allowed
      throughput: 0.8,   // 20% throughput decrease allowed
    };
  }

  /**
   * Load baseline performance metrics
   */
  loadBaseline() {
    try {
      if (fs.existsSync(this.baselineFile)) {
        const baselineData = fs.readFileSync(this.baselineFile, 'utf8');
        return JSON.parse(baselineData);
      }
    } catch (error) {
      console.warn('Warning: Could not load baseline file:', error.message);
    }
    return null;
  }

  /**
   * Save current results as new baseline
   */
  saveBaseline(results) {
    try {
      const baseline = {
        timestamp: new Date().toISOString(),
        metrics: this.extractKeyMetrics(results),
      };
      fs.writeFileSync(this.baselineFile, JSON.stringify(baseline, null, 2));
      console.log('✅ New performance baseline saved');
    } catch (error) {
      console.error('❌ Failed to save baseline:', error.message);
    }
  }

  /**
   * Extract key metrics from k6 results
   */
  extractKeyMetrics(data) {
    const metrics = data.metrics || {};

    return {
      http_req_duration: {
        avg: metrics.http_req_duration?.values?.avg || 0,
        p95: metrics.http_req_duration?.values?.['p(95)'] || 0,
        p99: metrics.http_req_duration?.values?.['p(99)'] || 0,
      },
      http_req_failed: {
        rate: metrics.http_req_failed?.values?.rate || 0,
      },
      http_reqs: {
        rate: metrics.http_reqs?.values?.rate || 0,
        count: metrics.http_reqs?.values?.count || 0,
      },
      search_response_time: {
        p95: metrics.search_response_time?.values?.['p(95)'] || 0,
      },
      property_load_time: {
        p95: metrics.property_load_time?.values?.['p(95)'] || 0,
      },
      iteration_duration: {
        avg: metrics.iteration_duration?.values?.avg || 0,
      },
    };
  }

  /**
   * Check for performance regressions
   */
  checkRegression(currentMetrics, baselineMetrics) {
    const regressions = [];
    const improvements = [];

    // Check response time regression
    const responseTimeRatio = currentMetrics.http_req_duration.avg / baselineMetrics.http_req_duration.avg;
    if (responseTimeRatio > this.thresholds.responseTime) {
      regressions.push({
        metric: 'Average Response Time',
        current: `${currentMetrics.http_req_duration.avg.toFixed(2)}ms`,
        baseline: `${baselineMetrics.http_req_duration.avg.toFixed(2)}ms`,
        change: `+${((responseTimeRatio - 1) * 100).toFixed(1)}%`,
        threshold: `${((this.thresholds.responseTime - 1) * 100).toFixed(1)}%`,
      });
    } else if (responseTimeRatio < 0.95) { // 5% improvement
      improvements.push({
        metric: 'Average Response Time',
        improvement: `${((1 - responseTimeRatio) * 100).toFixed(1)}%`,
      });
    }

    // Check 95th percentile response time
    const p95Ratio = currentMetrics.http_req_duration.p95 / baselineMetrics.http_req_duration.p95;
    if (p95Ratio > this.thresholds.responseTime) {
      regressions.push({
        metric: '95th Percentile Response Time',
        current: `${currentMetrics.http_req_duration.p95.toFixed(2)}ms`,
        baseline: `${baselineMetrics.http_req_duration.p95.toFixed(2)}ms`,
        change: `+${((p95Ratio - 1) * 100).toFixed(1)}%`,
        threshold: `${((this.thresholds.responseTime - 1) * 100).toFixed(1)}%`,
      });
    }

    // Check error rate increase
    const errorRateIncrease = currentMetrics.http_req_failed.rate - baselineMetrics.http_req_failed.rate;
    if (errorRateIncrease > this.thresholds.errorRate) {
      regressions.push({
        metric: 'Error Rate',
        current: `${(currentMetrics.http_req_failed.rate * 100).toFixed(2)}%`,
        baseline: `${(baselineMetrics.http_req_failed.rate * 100).toFixed(2)}%`,
        change: `+${(errorRateIncrease * 100).toFixed(2)}%`,
        threshold: `${(this.thresholds.errorRate * 100).toFixed(2)}%`,
      });
    }

    // Check throughput decrease
    const throughputRatio = currentMetrics.http_reqs.rate / baselineMetrics.http_reqs.rate;
    if (throughputRatio < this.thresholds.throughput) {
      regressions.push({
        metric: 'Request Throughput',
        current: `${currentMetrics.http_reqs.rate.toFixed(2)} req/s`,
        baseline: `${baselineMetrics.http_reqs.rate.toFixed(2)} req/s`,
        change: `-${((1 - throughputRatio) * 100).toFixed(1)}%`,
        threshold: `-${((1 - this.thresholds.throughput) * 100).toFixed(1)}%`,
      });
    }

    // Check search performance
    if (currentMetrics.search_response_time.p95 && baselineMetrics.search_response_time.p95) {
      const searchRatio = currentMetrics.search_response_time.p95 / baselineMetrics.search_response_time.p95;
      if (searchRatio > this.thresholds.responseTime) {
        regressions.push({
          metric: 'Search Response Time (95th)',
          current: `${currentMetrics.search_response_time.p95.toFixed(2)}ms`,
          baseline: `${baselineMetrics.search_response_time.p95.toFixed(2)}ms`,
          change: `+${((searchRatio - 1) * 100).toFixed(1)}%`,
          threshold: `${((this.thresholds.responseTime - 1) * 100).toFixed(1)}%`,
        });
      }
    }

    // Check property load performance
    if (currentMetrics.property_load_time.p95 && baselineMetrics.property_load_time.p95) {
      const propertyRatio = currentMetrics.property_load_time.p95 / baselineMetrics.property_load_time.p95;
      if (propertyRatio > this.thresholds.responseTime) {
        regressions.push({
          metric: 'Property Load Time (95th)',
          current: `${currentMetrics.property_load_time.p95.toFixed(2)}ms`,
          baseline: `${baselineMetrics.property_load_time.p95.toFixed(2)}ms`,
          change: `+${((propertyRatio - 1) * 100).toFixed(1)}%`,
          threshold: `${((this.thresholds.responseTime - 1) * 100).toFixed(1)}%`,
        });
      }
    }

    return { regressions, improvements };
  }

  /**
   * Generate performance report
   */
  generateReport(currentMetrics, baselineMetrics, regressions, improvements) {
    const report = {
      timestamp: new Date().toISOString(),
      status: regressions.length > 0 ? 'FAILED' : 'PASSED',
      summary: {
        totalRegressions: regressions.length,
        totalImprovements: improvements.length,
        hasRegression: regressions.length > 0,
      },
      current: currentMetrics,
      baseline: baselineMetrics,
      regressions,
      improvements,
      thresholds: this.thresholds,
    };

    return report;
  }

  /**
   * Print formatted report to console
   */
  printReport(report) {
    console.log('\n🚀 Performance Regression Check Report');
    console.log('=' .repeat(50));
    console.log(`Status: ${report.status === 'PASSED' ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Regressions: ${report.summary.totalRegressions}`);
    console.log(`Improvements: ${report.summary.totalImprovements}`);

    if (report.regressions.length > 0) {
      console.log('\n⚠️  Performance Regressions Detected:');
      console.log('-'.repeat(40));
      report.regressions.forEach((regression, index) => {
        console.log(`${index + 1}. ${regression.metric}`);
        console.log(`   Current: ${regression.current}`);
        console.log(`   Baseline: ${regression.baseline}`);
        console.log(`   Change: ${regression.change} (Threshold: ${regression.threshold})`);
        console.log('');
      });
    }

    if (report.improvements.length > 0) {
      console.log('\n🎉 Performance Improvements:');
      console.log('-'.repeat(30));
      report.improvements.forEach((improvement, index) => {
        console.log(`${index + 1}. ${improvement.metric}: ${improvement.improvement} improvement`);
      });
    }

    console.log('\n📊 Key Metrics Comparison:');
    console.log('-'.repeat(30));
    console.log(`Response Time: ${report.current.http_req_duration.avg.toFixed(2)}ms (baseline: ${report.baseline.http_req_duration.avg.toFixed(2)}ms)`);
    console.log(`95th Percentile: ${report.current.http_req_duration.p95.toFixed(2)}ms (baseline: ${report.baseline.http_req_duration.p95.toFixed(2)}ms)`);
    console.log(`Error Rate: ${(report.current.http_req_failed.rate * 100).toFixed(2)}% (baseline: ${(report.baseline.http_req_failed.rate * 100).toFixed(2)}%)`);
    console.log(`Throughput: ${report.current.http_reqs.rate.toFixed(2)} req/s (baseline: ${report.baseline.http_reqs.rate.toFixed(2)} req/s)`);
  }

  /**
   * Main execution method
   */
  async run(resultsFile) {
    try {
      console.log('🔍 Starting Performance Regression Check...');

      // Load test results
      if (!fs.existsSync(resultsFile)) {
        throw new Error(`Results file not found: ${resultsFile}`);
      }

      const resultsData = fs.readFileSync(resultsFile, 'utf8');
      const results = JSON.parse(resultsData);

      // Extract current metrics
      const currentMetrics = this.extractKeyMetrics(results);

      // Load baseline
      const baseline = this.loadBaseline();

      if (!baseline) {
        console.log('📝 No baseline found. Saving current results as baseline...');
        this.saveBaseline(results);
        console.log('✅ Baseline established. Future runs will check for regressions.');
        return 0; // Success
      }

      // Check for regressions
      const { regressions, improvements } = this.checkRegression(currentMetrics, baseline.metrics);

      // Generate report
      const report = this.generateReport(currentMetrics, baseline.metrics, regressions, improvements);

      // Print report
      this.printReport(report);

      // Save report
      const reportFile = path.join(__dirname, 'performance-report.json');
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

      // Update baseline if no regressions (only on main branch)
      if (regressions.length === 0 && process.env.CI && process.env.GITHUB_REF === 'refs/heads/main') {
        console.log('🔄 Updating baseline with improved performance...');
        this.saveBaseline(results);
      }

      // Return exit code
      return regressions.length > 0 ? 1 : 0;

    } catch (error) {
      console.error('❌ Performance regression check failed:', error.message);
      return 1;
    }
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length !== 1) {
    console.error('Usage: node performance-regression-check.js <results-file>');
    console.error('Example: node performance-regression-check.js load-test-results.json');
    process.exit(1);
  }

  const checker = new PerformanceRegressionChecker();
  checker.run(args[0]).then(exitCode => {
    process.exit(exitCode);
  });
}

module.exports = PerformanceRegressionChecker;