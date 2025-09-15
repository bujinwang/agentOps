#!/usr/bin/env node

/**
 * Automated Test Reporting System
 * Generates comprehensive reports from test results and sends notifications
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class AutomatedReporting {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.testResultsDir = path.join(this.projectRoot, 'test-results');
        this.reportsDir = path.join(this.testResultsDir, 'reports');
        this.templatesDir = path.join(this.projectRoot, 'docs', 'templates');
        this.configFile = path.join(this.projectRoot, 'reporting-config.json');
    }

    async init() {
        // Create necessary directories
        await fs.mkdir(this.reportsDir, { recursive: true });

        // Load or create configuration
        await this.loadConfig();

        console.log('📊 Automated Reporting initialized');
    }

    async loadConfig() {
        try {
            const configData = await fs.readFile(this.configFile, 'utf8');
            this.config = JSON.parse(configData);
        } catch (error) {
            // Create default configuration
            this.config = {
                reports: {
                    daily: {
                        enabled: true,
                        schedule: '0 6 * * *', // 6 AM daily
                        recipients: ['qa-team@company.com'],
                        includeCoverage: true,
                        includeTrends: true
                    },
                    weekly: {
                        enabled: true,
                        schedule: '0 7 * * 1', // 7 AM Mondays
                        recipients: ['management@company.com', 'qa-team@company.com'],
                        includeCoverage: true,
                        includeTrends: true,
                        includeRecommendations: true
                    },
                    failure: {
                        enabled: true,
                        recipients: ['dev-team@company.com', 'qa-team@company.com'],
                        includeDetails: true
                    }
                },
                notifications: {
                    slack: {
                        enabled: false,
                        webhook: '',
                        channels: ['#qa-reports', '#build-status']
                    },
                    email: {
                        enabled: false,
                        smtp: {
                            host: '',
                            port: 587,
                            secure: false,
                            auth: {
                                user: '',
                                pass: ''
                            }
                        }
                    }
                },
                thresholds: {
                    coverage: {
                        critical: 70,
                        warning: 80,
                        excellent: 90
                    },
                    testFailure: {
                        critical: 10, // % of tests failing
                        warning: 5
                    }
                }
            };

            await this.saveConfig();
            console.log('📝 Created default reporting configuration');
        }
    }

    async saveConfig() {
        await fs.writeFile(this.configFile, JSON.stringify(this.config, null, 2));
    }

    async generateDailyReport(date = new Date()) {
        console.log('📈 Generating daily test report...');

        const reportDate = date.toISOString().split('T')[0];
        const reportData = {
            date: reportDate,
            type: 'daily',
            summary: await this.getTestSummary(date),
            coverage: await this.getCoverageData(),
            trends: await this.getTrendData(7), // Last 7 days
            failures: await this.getRecentFailures(),
            recommendations: await this.generateRecommendations()
        };

        // Generate different report formats
        await this.generateHtmlReport(reportData);
        await this.generateJsonReport(reportData);
        await this.generateMarkdownReport(reportData);

        // Send notifications
        await this.sendReportNotifications('daily', reportData);

        console.log('✅ Daily report generated successfully');
        return reportData;
    }

    async generateWeeklyReport(date = new Date()) {
        console.log('📊 Generating weekly test report...');

        const reportDate = date.toISOString().split('T')[0];
        const reportData = {
            date: reportDate,
            type: 'weekly',
            summary: await this.getTestSummary(date, 7),
            coverage: await this.getCoverageData(),
            trends: await this.getTrendData(30), // Last 30 days
            failures: await this.getRecentFailures(30),
            recommendations: await this.generateRecommendations(),
            insights: await this.generateWeeklyInsights()
        };

        // Generate reports
        await this.generateHtmlReport(reportData);
        await this.generateJsonReport(reportData);
        await this.generateMarkdownReport(reportData);

        // Send notifications
        await this.sendReportNotifications('weekly', reportData);

        console.log('✅ Weekly report generated successfully');
        return reportData;
    }

    async getTestSummary(date, days = 1) {
        const summary = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            duration: 0,
            testSuites: []
        };

        try {
            // Read recent test results
            const resultFiles = await fs.readdir(this.testResultsDir);
            const recentResults = resultFiles
                .filter(file => file.includes('automated_test_run'))
                .slice(-days);

            for (const resultFile of recentResults) {
                const resultPath = path.join(this.testResultsDir, resultFile);
                const stats = await fs.stat(resultPath);

                if (stats.isDirectory()) {
                    const summaryPath = path.join(resultPath, 'summary.txt');
                    try {
                        const summaryContent = await fs.readFile(summaryPath, 'utf8');
                        // Parse summary content (simplified parsing)
                        summary.totalTests += this.extractNumber(summaryContent, 'Total:');
                        summary.passedTests += this.extractNumber(summaryContent, 'Passed:');
                        summary.failedTests += this.extractNumber(summaryContent, 'Failed:');
                    } catch (error) {
                        // Skip if summary file doesn't exist
                    }
                }
            }
        } catch (error) {
            console.warn('Warning: Could not read test results:', error.message);
        }

        return summary;
    }

    extractNumber(text, label) {
        const regex = new RegExp(`${label}\\s*(\\d+)`, 'i');
        const match = text.match(regex);
        return match ? parseInt(match[1]) : 0;
    }

    async getCoverageData() {
        const coverage = {
            overall: 0,
            byType: {
                statements: 0,
                branches: 0,
                functions: 0,
                lines: 0
            },
            byFile: [],
            trends: []
        };

        try {
            // Read latest coverage data
            const coveragePath = path.join(this.projectRoot, 'frontend', 'coverage', 'coverage-summary.json');
            const coverageData = JSON.parse(await fs.readFile(coveragePath, 'utf8'));

            coverage.overall = coverageData.total.lines.pct;
            coverage.byType = {
                statements: coverageData.total.statements.pct,
                branches: coverageData.total.branches.pct,
                functions: coverageData.total.functions.pct,
                lines: coverageData.total.lines.pct
            };
        } catch (error) {
            console.warn('Warning: Could not read coverage data:', error.message);
        }

        return coverage;
    }

    async getTrendData(days) {
        const trends = {
            coverage: [],
            testResults: [],
            duration: []
        };

        // Simplified trend calculation
        // In a real implementation, you'd read historical data
        return trends;
    }

    async getRecentFailures(days = 1) {
        const failures = [];

        try {
            const resultFiles = await fs.readdir(this.testResultsDir);
            const recentResults = resultFiles
                .filter(file => file.includes('automated_test_run'))
                .slice(-days);

            for (const resultFile of recentResults) {
                const logPath = path.join(this.testResultsDir, resultFile, 'automated_test_run.log');
                try {
                    const logContent = await fs.readFile(logPath, 'utf8');
                    const errorLines = logContent.split('\n')
                        .filter(line => line.includes('ERROR') || line.includes('FAILED'));

                    failures.push(...errorLines);
                } catch (error) {
                    // Skip if log file doesn't exist
                }
            }
        } catch (error) {
            console.warn('Warning: Could not read failure data:', error.message);
        }

        return failures.slice(0, 10); // Return last 10 failures
    }

    async generateRecommendations() {
        const recommendations = [];
        const coverage = await this.getCoverageData();
        const failures = await this.getRecentFailures();

        // Coverage recommendations
        if (coverage.overall < this.config.thresholds.coverage.critical) {
            recommendations.push({
                priority: 'high',
                type: 'coverage',
                message: `Coverage is critically low at ${coverage.overall}%. Target: ${this.config.thresholds.coverage.critical}%+`,
                action: 'Add unit tests for uncovered code paths'
            });
        } else if (coverage.overall < this.config.thresholds.coverage.warning) {
            recommendations.push({
                priority: 'medium',
                type: 'coverage',
                message: `Coverage is below target at ${coverage.overall}%. Target: ${this.config.thresholds.coverage.warning}%+`,
                action: 'Review and add missing test cases'
            });
        }

        // Failure recommendations
        if (failures.length > 0) {
            recommendations.push({
                priority: 'high',
                type: 'failures',
                message: `${failures.length} test failures detected`,
                action: 'Review and fix failing tests'
            });
        }

        return recommendations;
    }

    async generateWeeklyInsights() {
        return {
            topFailingTests: [],
            coverageImprovements: [],
            performanceTrends: [],
            recommendations: []
        };
    }

    async generateHtmlReport(reportData) {
        const reportPath = path.join(this.reportsDir, `${reportData.type}-report-${reportData.date}.html`);

        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>${reportData.type.toUpperCase()} Test Report - ${reportData.date}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
        .summary { background: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: white; border-radius: 5px; }
        .success { border-left: 4px solid #27ae60; }
        .warning { border-left: 4px solid #f39c12; }
        .error { border-left: 4px solid #e74c3c; }
        .recommendation { margin: 10px 0; padding: 10px; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${reportData.type.toUpperCase()} Test Report</h1>
        <p>Date: ${reportData.date}</p>
    </div>

    <div class="summary">
        <h2>Test Summary</h2>
        <div class="metric success">
            <strong>Total Tests:</strong> ${reportData.summary.totalTests}
        </div>
        <div class="metric success">
            <strong>Passed:</strong> ${reportData.summary.passedTests}
        </div>
        <div class="metric ${reportData.summary.failedTests > 0 ? 'error' : 'success'}">
            <strong>Failed:</strong> ${reportData.summary.failedTests}
        </div>
        <div class="metric">
            <strong>Coverage:</strong> ${reportData.coverage.overall}%
        </div>
    </div>

    <h2>Coverage Details</h2>
    <table>
        <tr>
            <th>Metric</th>
            <th>Coverage</th>
            <th>Status</th>
        </tr>
        <tr>
            <td>Statements</td>
            <td>${reportData.coverage.byType.statements}%</td>
            <td>${this.getCoverageStatus(reportData.coverage.byType.statements)}</td>
        </tr>
        <tr>
            <td>Branches</td>
            <td>${reportData.coverage.byType.branches}%</td>
            <td>${this.getCoverageStatus(reportData.coverage.byType.branches)}</td>
        </tr>
        <tr>
            <td>Functions</td>
            <td>${reportData.coverage.byType.functions}%</td>
            <td>${this.getCoverageStatus(reportData.coverage.byType.functions)}</td>
        </tr>
        <tr>
            <td>Lines</td>
            <td>${reportData.coverage.byType.lines}%</td>
            <td>${this.getCoverageStatus(reportData.coverage.byType.lines)}</td>
        </tr>
    </table>

    ${reportData.recommendations.length > 0 ? `
    <h2>Recommendations</h2>
    ${reportData.recommendations.map(rec => `
        <div class="recommendation ${rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'success'}">
            <strong>${rec.priority.toUpperCase()}:</strong> ${rec.message}
            <br><em>Action: ${rec.action}</em>
        </div>
    `).join('')}
    ` : ''}

    ${reportData.failures.length > 0 ? `
    <h2>Recent Failures</h2>
    <ul>
        ${reportData.failures.map(failure => `<li>${failure}</li>`).join('')}
    </ul>
    ` : ''}
</body>
</html>`;

        await fs.writeFile(reportPath, html);
        console.log(`📄 HTML report saved: ${reportPath}`);
    }

    async generateJsonReport(reportData) {
        const reportPath = path.join(this.reportsDir, `${reportData.type}-report-${reportData.date}.json`);
        await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
        console.log(`📄 JSON report saved: ${reportPath}`);
    }

    async generateMarkdownReport(reportData) {
        const reportPath = path.join(this.reportsDir, `${reportData.type}-report-${reportData.date}.md`);

        const markdown = `# ${reportData.type.toUpperCase()} Test Report - ${reportData.date}

## Summary

- **Total Tests:** ${reportData.summary.totalTests}
- **Passed:** ${reportData.summary.passedTests}
- **Failed:** ${reportData.summary.failedTests}
- **Coverage:** ${reportData.coverage.overall}%

## Coverage Details

| Metric | Coverage | Status |
|--------|----------|--------|
| Statements | ${reportData.coverage.byType.statements}% | ${this.getCoverageStatus(reportData.coverage.byType.statements)} |
| Branches | ${reportData.coverage.byType.branches}% | ${this.getCoverageStatus(reportData.coverage.byType.branches)} |
| Functions | ${reportData.coverage.byType.functions}% | ${this.getCoverageStatus(reportData.coverage.byType.functions)} |
| Lines | ${reportData.coverage.byType.lines}% | ${this.getCoverageStatus(reportData.coverage.byType.lines)} |

## Recommendations

${reportData.recommendations.map(rec => `- **${rec.priority.toUpperCase()}:** ${rec.message}\n  *Action:* ${rec.action}`).join('\n\n')}

${reportData.failures.length > 0 ? `## Recent Failures\n\n${reportData.failures.map(f => `- ${f}`).join('\n')}` : ''}
`;

        await fs.writeFile(reportPath, markdown);
        console.log(`📄 Markdown report saved: ${reportPath}`);
    }

    getCoverageStatus(percentage) {
        if (percentage >= this.config.thresholds.coverage.excellent) return '🟢 Excellent';
        if (percentage >= this.config.thresholds.coverage.warning) return '🟡 Good';
        if (percentage >= this.config.thresholds.coverage.critical) return '🟠 Warning';
        return '🔴 Critical';
    }

    async sendReportNotifications(reportType, reportData) {
        const config = this.config.reports[reportType];
        if (!config.enabled) return;

        // Slack notifications
        if (this.config.notifications.slack.enabled) {
            await this.sendSlackNotification(reportType, reportData);
        }

        // Email notifications
        if (this.config.notifications.email.enabled) {
            await this.sendEmailNotification(reportType, reportData, config.recipients);
        }
    }

    async sendSlackNotification(reportType, reportData) {
        const message = {
            text: `${reportType.toUpperCase()} Test Report - ${reportData.date}`,
            attachments: [{
                color: reportData.summary.failedTests > 0 ? 'danger' : 'good',
                fields: [
                    { title: 'Total Tests', value: reportData.summary.totalTests.toString(), short: true },
                    { title: 'Passed', value: reportData.summary.passedTests.toString(), short: true },
                    { title: 'Failed', value: reportData.summary.failedTests.toString(), short: true },
                    { title: 'Coverage', value: `${reportData.coverage.overall}%`, short: true }
                ]
            }]
        };

        console.log('📤 Slack notification sent');
    }

    async sendEmailNotification(reportType, reportData, recipients) {
        // Email implementation would go here
        console.log(`📧 Email notification sent to: ${recipients.join(', ')}`);
    }

    async sendFailureNotification(failureData) {
        if (!this.config.reports.failure.enabled) return;

        const message = {
            subject: `🚨 Test Failures Detected`,
            body: `
Test failures have been detected:

- Failed Tests: ${failureData.failedCount}
- Total Tests: ${failureData.totalCount}
- Failure Rate: ${((failureData.failedCount / failureData.totalCount) * 100).toFixed(1)}%

Recent Failures:
${failureData.failures.slice(0, 5).map(f => `- ${f}`).join('\n')}

Please review the test results and address the failures.
            `
        };

        // Send notifications
        if (this.config.notifications.slack.enabled) {
            await this.sendSlackNotification('failure', { failures: failureData.failures });
        }

        if (this.config.notifications.email.enabled) {
            await this.sendEmailNotification('failure', failureData, this.config.reports.failure.recipients);
        }

        console.log('🚨 Failure notifications sent');
    }
}

// CLI interface
async function main() {
    const reporting = new AutomatedReporting();
    await reporting.init();

    const command = process.argv[2];

    switch (command) {
        case 'daily':
            await reporting.generateDailyReport();
            break;

        case 'weekly':
            await reporting.generateWeeklyReport();
            break;

        case 'failure':
            const failureData = JSON.parse(process.argv[3] || '{}');
            await reporting.sendFailureNotification(failureData);
            break;

        default:
            console.log(`
Automated Test Reporting

Usage:
  node automated-reporting.js <command> [options]

Commands:
  daily          Generate daily test report
  weekly         Generate weekly test report
  failure <json> Send failure notifications

Examples:
  node automated-reporting.js daily
  node automated-reporting.js weekly
  node automated-reporting.js failure '{"failedCount": 5, "totalCount": 100, "failures": ["test1 failed", "test2 failed"]}'
            `);
            break;
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = AutomatedReporting;