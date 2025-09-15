#!/usr/bin/env node

/**
 * Test Scheduler for Real Estate CRM
 * Handles automated test scheduling, parallel execution, and reporting
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const cron = require('node-cron');

class TestScheduler {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.testResultsDir = path.join(this.projectRoot, 'test-results');
        this.logsDir = path.join(this.testResultsDir, 'scheduler-logs');
        this.configFile = path.join(this.projectRoot, 'test-scheduler-config.json');
        this.isRunning = false;
        this.activeJobs = new Map();
    }

    async init() {
        // Create necessary directories
        await fs.mkdir(this.logsDir, { recursive: true });

        // Load or create default configuration
        await this.loadConfig();

        console.log('🕒 Test Scheduler initialized');
    }

    async loadConfig() {
        try {
            const configData = await fs.readFile(this.configFile, 'utf8');
            this.config = JSON.parse(configData);
        } catch (error) {
            // Create default configuration
            this.config = {
                schedules: {
                    'hourly-smoke': {
                        cron: '0 * * * *', // Every hour
                        tests: ['unit', 'lint'],
                        enabled: true,
                        description: 'Hourly smoke tests'
                    },
                    'daily-full': {
                        cron: '0 2 * * *', // Daily at 2 AM
                        tests: ['unit', 'component', 'integration', 'e2e'],
                        enabled: true,
                        description: 'Daily full test suite'
                    },
                    'weekly-comprehensive': {
                        cron: '0 3 * * 1', // Weekly on Monday at 3 AM
                        tests: ['unit', 'component', 'integration', 'e2e', 'accessibility', 'performance'],
                        enabled: true,
                        description: 'Weekly comprehensive tests'
                    }
                },
                notifications: {
                    slack: {
                        enabled: false,
                        webhook: '',
                        channels: ['#qa-alerts']
                    },
                    email: {
                        enabled: false,
                        recipients: [],
                        smtp: {}
                    }
                },
                parallel: {
                    maxJobs: 4,
                    timeout: 3600000 // 1 hour
                },
                reporting: {
                    generateHtml: true,
                    generateJson: true,
                    retention: 30 // days
                }
            };

            await this.saveConfig();
            console.log('📝 Created default test scheduler configuration');
        }
    }

    async saveConfig() {
        await fs.writeFile(this.configFile, JSON.stringify(this.config, null, 2));
    }

    async start() {
        if (this.isRunning) {
            console.log('⚠️  Test scheduler is already running');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Starting test scheduler...');

        // Schedule all enabled jobs
        for (const [jobName, jobConfig] of Object.entries(this.config.schedules)) {
            if (jobConfig.enabled) {
                this.scheduleJob(jobName, jobConfig);
            }
        }

        // Start cleanup job (daily at 4 AM)
        cron.schedule('0 4 * * *', () => this.cleanupOldResults());

        console.log('✅ Test scheduler started successfully');
    }

    scheduleJob(jobName, jobConfig) {
        console.log(`📅 Scheduling ${jobName}: ${jobConfig.description} (${jobConfig.cron})`);

        const job = cron.schedule(jobConfig.cron, async () => {
            try {
                await this.runScheduledTests(jobName, jobConfig);
            } catch (error) {
                console.error(`❌ Error in scheduled job ${jobName}:`, error);
                await this.sendNotification('error', `Scheduled test failure: ${jobName}`, error.message);
            }
        });

        this.activeJobs.set(jobName, job);
    }

    async runScheduledTests(jobName, jobConfig) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const jobId = `${jobName}-${timestamp}`;
        const logFile = path.join(this.logsDir, `${jobId}.log`);

        console.log(`🎯 Running scheduled tests: ${jobName}`);

        // Create log stream
        const logStream = fs.createWriteStream(logFile, { flags: 'a' });

        const results = {
            jobId,
            jobName,
            startTime: new Date().toISOString(),
            tests: jobConfig.tests,
            results: {},
            status: 'running'
        };

        try {
            // Run tests in parallel where possible
            const testPromises = jobConfig.tests.map(testType =>
                this.runTest(testType, logStream, jobId)
            );

            const testResults = await Promise.allSettled(testPromises);

            // Process results
            results.results = testResults.reduce((acc, result, index) => {
                const testType = jobConfig.tests[index];
                if (result.status === 'fulfilled') {
                    acc[testType] = { status: 'passed', ...result.value };
                } else {
                    acc[testType] = { status: 'failed', error: result.reason.message };
                }
                return acc;
            }, {});

            results.endTime = new Date().toISOString();
            results.duration = Date.parse(results.endTime) - Date.parse(results.startTime);
            results.status = Object.values(results.results).every(r => r.status === 'passed') ? 'success' : 'failure';

            // Generate reports
            await this.generateReports(results);

            // Send notifications
            await this.sendNotification(results.status, `Scheduled tests completed: ${jobName}`, results);

            console.log(`✅ Scheduled tests completed: ${jobName} (${results.status})`);

        } catch (error) {
            results.status = 'error';
            results.error = error.message;
            results.endTime = new Date().toISOString();

            logStream.write(`ERROR: ${error.message}\n`);
            await this.sendNotification('error', `Scheduled tests failed: ${jobName}`, error.message);

            console.error(`❌ Scheduled tests failed: ${jobName}`, error);
        } finally {
            logStream.end();
        }

        return results;
    }

    async runTest(testType, logStream, jobId) {
        return new Promise((resolve, reject) => {
            const testCommand = this.getTestCommand(testType);
            const testProcess = spawn(testCommand.command, testCommand.args, {
                cwd: this.projectRoot,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            testProcess.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                logStream.write(`[${testType}] ${text}`);
            });

            testProcess.stderr.on('data', (data) => {
                const text = data.toString();
                errorOutput += text;
                logStream.write(`[${testType}] ERROR: ${text}`);
            });

            testProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        output: output.trim(),
                        duration: Date.now() - Date.parse(jobId.split('-').pop())
                    });
                } else {
                    reject(new Error(`Test ${testType} failed with code ${code}: ${errorOutput}`));
                }
            });

            testProcess.on('error', (error) => {
                reject(new Error(`Failed to start test ${testType}: ${error.message}`));
            });
        });
    }

    getTestCommand(testType) {
        const commands = {
            lint: {
                command: 'bash',
                args: ['scripts/run-automated-tests.sh', 'lint']
            },
            unit: {
                command: 'bash',
                args: ['scripts/run-automated-tests.sh', 'unit']
            },
            component: {
                command: 'bash',
                args: ['scripts/run-automated-tests.sh', 'component']
            },
            integration: {
                command: 'bash',
                args: ['scripts/run-automated-tests.sh', 'integration']
            },
            e2e: {
                command: 'bash',
                args: ['scripts/run-automated-tests.sh', 'e2e']
            },
            accessibility: {
                command: 'bash',
                args: ['scripts/run-automated-tests.sh', 'accessibility']
            },
            performance: {
                command: 'bash',
                args: ['scripts/run-automated-tests.sh', 'performance']
            },
            coverage: {
                command: 'bash',
                args: ['scripts/run-automated-tests.sh', 'coverage']
            },
            backend: {
                command: 'bash',
                args: ['scripts/run-automated-tests.sh', 'backend']
            }
        };

        return commands[testType] || {
            command: 'echo',
            args: [`Unknown test type: ${testType}`]
        };
    }

    async generateReports(results) {
        const reportDir = path.join(this.testResultsDir, 'scheduled', results.jobId);
        await fs.mkdir(reportDir, { recursive: true });

        // JSON report
        if (this.config.reporting.generateJson) {
            await fs.writeFile(
                path.join(reportDir, 'results.json'),
                JSON.stringify(results, null, 2)
            );
        }

        // HTML report
        if (this.config.reporting.generateHtml) {
            const htmlReport = this.generateHtmlReport(results);
            await fs.writeFile(
                path.join(reportDir, 'results.html'),
                htmlReport
            );
        }

        // Summary text file
        const summary = this.generateSummary(results);
        await fs.writeFile(
            path.join(reportDir, 'summary.txt'),
            summary
        );
    }

    generateHtmlReport(results) {
        const statusColor = results.status === 'success' ? '#28a745' : '#dc3545';
        const duration = Math.round(results.duration / 1000);

        return `
<!DOCTYPE html>
<html>
<head>
    <title>Test Results: ${results.jobName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: ${statusColor}; color: white; padding: 20px; border-radius: 5px; }
        .test-result { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        .passed { border-color: #28a745; background: #d4edda; }
        .failed { border-color: #dc3545; background: #f8d7da; }
        .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Test Results: ${results.jobName}</h1>
        <p>Job ID: ${results.jobId}</p>
        <p>Status: ${results.status.toUpperCase()}</p>
        <p>Duration: ${duration}s</p>
        <p>Started: ${new Date(results.startTime).toLocaleString()}</p>
    </div>

    <div class="summary">
        <h2>Summary</h2>
        <p>Tests Run: ${results.tests.length}</p>
        <p>Passed: ${Object.values(results.results).filter(r => r.status === 'passed').length}</p>
        <p>Failed: ${Object.values(results.results).filter(r => r.status === 'failed').length}</p>
    </div>

    <h2>Test Details</h2>
    ${Object.entries(results.results).map(([testType, result]) => `
        <div class="test-result ${result.status}">
            <h3>${testType.toUpperCase()}</h3>
            <p>Status: ${result.status}</p>
            ${result.error ? `<p>Error: ${result.error}</p>` : ''}
            ${result.duration ? `<p>Duration: ${Math.round(result.duration / 1000)}s</p>` : ''}
        </div>
    `).join('')}
</body>
</html>`;
    }

    generateSummary(results) {
        const duration = Math.round(results.duration / 1000);
        const passed = Object.values(results.results).filter(r => r.status === 'passed').length;
        const failed = Object.values(results.results).filter(r => r.status === 'failed').length;

        return `
Test Scheduler Summary
======================

Job: ${results.jobName}
ID: ${results.jobId}
Status: ${results.status.toUpperCase()}
Duration: ${duration}s
Started: ${results.startTime}
Finished: ${results.endTime}

Tests Summary:
- Total: ${results.tests.length}
- Passed: ${passed}
- Failed: ${failed}

Test Results:
${Object.entries(results.results).map(([test, result]) =>
    `- ${test}: ${result.status.toUpperCase()}${result.error ? ` (${result.error})` : ''}`
).join('\n')}

Reports generated in: test-results/scheduled/${results.jobId}/
`;
    }

    async sendNotification(type, title, details) {
        // Slack notification
        if (this.config.notifications.slack.enabled) {
            await this.sendSlackNotification(type, title, details);
        }

        // Email notification
        if (this.config.notifications.email.enabled) {
            await this.sendEmailNotification(type, title, details);
        }
    }

    async sendSlackNotification(type, title, details) {
        // Implementation for Slack notifications
        console.log(`📤 Slack notification: ${title}`);
    }

    async sendEmailNotification(type, title, details) {
        // Implementation for email notifications
        console.log(`📧 Email notification: ${title}`);
    }

    async cleanupOldResults() {
        const retentionDays = this.config.reporting.retention;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        console.log(`🧹 Cleaning up test results older than ${retentionDays} days...`);

        try {
            const entries = await fs.readdir(this.testResultsDir);
            let cleanedCount = 0;

            for (const entry of entries) {
                const entryPath = path.join(this.testResultsDir, entry);
                const stats = await fs.stat(entryPath);

                if (stats.mtime < cutoffDate) {
                    await fs.rm(entryPath, { recursive: true, force: true });
                    cleanedCount++;
                }
            }

            console.log(`✅ Cleaned up ${cleanedCount} old test result directories`);
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }

    async stop() {
        if (!this.isRunning) {
            console.log('⚠️  Test scheduler is not running');
            return;
        }

        console.log('🛑 Stopping test scheduler...');

        // Stop all scheduled jobs
        for (const [jobName, job] of this.activeJobs) {
            job.stop();
            console.log(`⏹️  Stopped job: ${jobName}`);
        }

        this.activeJobs.clear();
        this.isRunning = false;

        console.log('✅ Test scheduler stopped');
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            activeJobs: Array.from(this.activeJobs.keys()),
            config: this.config
        };
    }
}

// CLI interface
async function main() {
    const scheduler = new TestScheduler();
    await scheduler.init();

    const command = process.argv[2];

    switch (command) {
        case 'start':
            await scheduler.start();
            // Keep process running
            process.on('SIGINT', async () => {
                await scheduler.stop();
                process.exit(0);
            });
            break;

        case 'stop':
            await scheduler.stop();
            break;

        case 'status':
            console.log(JSON.stringify(scheduler.getStatus(), null, 2));
            break;

        case 'run':
            const jobName = process.argv[3];
            if (!jobName) {
                console.error('Usage: node test-scheduler.js run <job-name>');
                process.exit(1);
            }
            const jobConfig = scheduler.config.schedules[jobName];
            if (!jobConfig) {
                console.error(`Job '${jobName}' not found`);
                process.exit(1);
            }
            await scheduler.runScheduledTests(jobName, jobConfig);
            break;

        default:
            console.log(`
Test Scheduler CLI

Usage:
  node test-scheduler.js <command>

Commands:
  start    Start the test scheduler
  stop     Stop the test scheduler
  status   Show scheduler status
  run <job> Run a specific scheduled job immediately

Examples:
  node test-scheduler.js start
  node test-scheduler.js run daily-full
  node test-scheduler.js status
            `);
            break;
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = TestScheduler;