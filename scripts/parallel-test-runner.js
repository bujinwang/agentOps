#!/usr/bin/env node

/**
 * Parallel Test Runner for Real Estate CRM
 * Optimizes test execution through intelligent parallelization
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

class ParallelTestRunner {
    constructor(options = {}) {
        this.projectRoot = path.resolve(__dirname, '..');
        this.maxWorkers = options.maxWorkers || Math.max(1, os.cpus().length - 1);
        this.testTimeout = options.timeout || 300000; // 5 minutes
        this.results = [];
        this.workers = [];
        this.startTime = Date.now();
    }

    async runParallelTests(testSuites) {
        console.log(`🚀 Starting parallel test execution with ${this.maxWorkers} workers`);

        // Distribute tests across workers
        const testGroups = this.distributeTests(testSuites);

        // Create worker promises
        const workerPromises = testGroups.map((testGroup, index) =>
            this.runWorker(testGroup, index)
        );

        // Wait for all workers to complete
        const results = await Promise.allSettled(workerPromises);

        // Process results
        const finalResults = this.processResults(results);

        console.log(`✅ Parallel execution completed in ${Date.now() - this.startTime}ms`);
        return finalResults;
    }

    distributeTests(testSuites) {
        const groups = Array.from({ length: this.maxWorkers }, () => []);

        // Simple round-robin distribution
        testSuites.forEach((testSuite, index) => {
            const workerIndex = index % this.maxWorkers;
            groups[workerIndex].push(testSuite);
        });

        return groups;
    }

    runWorker(testGroup, workerId) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(__filename, {
                workerData: {
                    testGroup,
                    workerId,
                    projectRoot: this.projectRoot,
                    timeout: this.testTimeout
                }
            });

            worker.on('message', (result) => {
                resolve(result);
            });

            worker.on('error', (error) => {
                reject(error);
            });

            worker.on('exit', (code) => {
                if (code !== 0) {
                    reject(new Error(`Worker ${workerId} exited with code ${code}`));
                }
            });

            this.workers.push(worker);
        });
    }

    processResults(results) {
        const finalResults = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            duration: Date.now() - this.startTime,
            workerResults: [],
            failures: []
        };

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const workerResult = result.value;
                finalResults.workerResults.push(workerResult);
                finalResults.totalTests += workerResult.totalTests;
                finalResults.passedTests += workerResult.passedTests;
                finalResults.failedTests += workerResult.failedTests;
                finalResults.skippedTests += workerResult.skippedTests;

                if (workerResult.failures) {
                    finalResults.failures.push(...workerResult.failures);
                }
            } else {
                console.error(`Worker ${index} failed:`, result.reason);
                finalResults.failures.push({
                    worker: index,
                    error: result.reason.message
                });
            }
        });

        return finalResults;
    }

    async runTestSuite(testSuite) {
        const { type, files, config } = testSuite;

        switch (type) {
            case 'jest':
                return this.runJestTests(files, config);
            case 'playwright':
                return this.runPlaywrightTests(files, config);
            case 'lighthouse':
                return this.runLighthouseTests(files, config);
            default:
                throw new Error(`Unsupported test type: ${type}`);
        }
    }

    async runJestTests(files, config = {}) {
        const { spawn } = require('child_process');
        const jestArgs = [
            '--passWithNoTests',
            '--verbose',
            '--json',
            '--outputFile', config.outputFile || 'test-results.json',
            '--testTimeout', this.testTimeout.toString()
        ];

        if (files && files.length > 0) {
            jestArgs.push('--testPathPattern', files.join('|'));
        }

        if (config.coverage) {
            jestArgs.push('--coverage');
        }

        return new Promise((resolve, reject) => {
            const jest = spawn('npx', ['jest', ...jestArgs], {
                cwd: path.join(this.projectRoot, 'frontend'),
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            jest.stdout.on('data', (data) => {
                output += data.toString();
            });

            jest.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            jest.on('close', (code) => {
                try {
                    const results = JSON.parse(output);
                    resolve({
                        type: 'jest',
                        exitCode: code,
                        results: results,
                        totalTests: results.numTotalTests || 0,
                        passedTests: results.numPassedTests || 0,
                        failedTests: results.numFailedTests || 0,
                        skippedTests: results.numPendingTests || 0,
                        duration: results.testResults ?
                            results.testResults.reduce((sum, suite) => sum + suite.perfStats.runtime, 0) : 0
                    });
                } catch (error) {
                    resolve({
                        type: 'jest',
                        exitCode: code,
                        error: errorOutput,
                        totalTests: 0,
                        passedTests: 0,
                        failedTests: 0,
                        skippedTests: 0,
                        duration: 0
                    });
                }
            });

            jest.on('error', (error) => {
                reject(error);
            });
        });
    }

    async runPlaywrightTests(files, config = {}) {
        const { spawn } = require('child_process');
        const pwArgs = ['test'];

        if (files && files.length > 0) {
            pwArgs.push(...files);
        }

        if (config.headed) {
            pwArgs.push('--headed');
        }

        if (config.workers) {
            pwArgs.push(`--workers=${config.workers}`);
        }

        return new Promise((resolve, reject) => {
            const playwright = spawn('npx', pwArgs, {
                cwd: path.join(this.projectRoot, 'frontend'),
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            playwright.stdout.on('data', (data) => {
                output += data.toString();
            });

            playwright.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            playwright.on('close', (code) => {
                // Parse Playwright output for test results
                const passed = (output.match(/✓/g) || []).length;
                const failed = (output.match(/✗/g) || []).length;

                resolve({
                    type: 'playwright',
                    exitCode: code,
                    output: output,
                    error: errorOutput,
                    totalTests: passed + failed,
                    passedTests: passed,
                    failedTests: failed,
                    skippedTests: 0,
                    duration: 0 // Would need to parse from output
                });
            });

            playwright.on('error', (error) => {
                reject(error);
            });
        });
    }

    async runLighthouseTests(urls, config = {}) {
        const lighthouse = require('lighthouse');
        const chromeLauncher = require('chrome-launcher');

        const results = [];

        for (const url of urls) {
            try {
                const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });

                const options = {
                    logLevel: 'info',
                    output: 'json',
                    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
                    port: chrome.port
                };

                const runnerResult = await lighthouse(url, options);
                const report = runnerResult.lhr;

                results.push({
                    url,
                    performance: report.categories.performance.score * 100,
                    accessibility: report.categories.accessibility.score * 100,
                    bestPractices: report.categories['best-practices'].score * 100,
                    seo: report.categories.seo.score * 100,
                    duration: report.timing.total
                });

                await chrome.kill();
            } catch (error) {
                results.push({
                    url,
                    error: error.message
                });
            }
        }

        return {
            type: 'lighthouse',
            results: results,
            totalTests: urls.length,
            passedTests: results.filter(r => !r.error && r.performance > 70).length,
            failedTests: results.filter(r => r.error || r.performance <= 70).length,
            skippedTests: 0,
            duration: results.reduce((sum, r) => sum + (r.duration || 0), 0)
        };
    }

    cleanup() {
        this.workers.forEach(worker => {
            if (!worker.terminated) {
                worker.terminate();
            }
        });
        this.workers = [];
    }
}

// Worker thread execution
if (!isMainThread) {
    const { testGroup, workerId, projectRoot, timeout } = workerData;

    async function runWorkerTests() {
        const runner = new ParallelTestRunner({ timeout });
        const results = [];

        for (const testSuite of testGroup) {
            try {
                const result = await runner.runTestSuite(testSuite);
                results.push(result);
            } catch (error) {
                results.push({
                    type: testSuite.type,
                    error: error.message,
                    totalTests: 0,
                    passedTests: 0,
                    failedTests: 1,
                    skippedTests: 0,
                    duration: 0
                });
            }
        }

        // Aggregate worker results
        const aggregatedResult = results.reduce((acc, result) => {
            acc.totalTests += result.totalTests;
            acc.passedTests += result.passedTests;
            acc.failedTests += result.failedTests;
            acc.skippedTests += result.skippedTests;
            acc.duration += result.duration;
            acc.testResults = acc.testResults || [];
            acc.testResults.push(result);
            return acc;
        }, {
            workerId,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            duration: 0,
            testResults: []
        });

        parentPort.postMessage(aggregatedResult);
    }

    runWorkerTests().catch(error => {
        parentPort.postMessage({
            workerId,
            error: error.message,
            totalTests: 0,
            passedTests: 0,
            failedTests: 1,
            skippedTests: 0,
            duration: 0
        });
    });
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'run':
            const testType = args[1] || 'unit';
            const runner = new ParallelTestRunner();

            // Define test suites based on type
            const testSuites = getTestSuites(testType);

            try {
                const results = await runner.runParallelTests(testSuites);
                console.log(JSON.stringify(results, null, 2));

                // Exit with appropriate code
                process.exit(results.failedTests > 0 ? 1 : 0);
            } catch (error) {
                console.error('Parallel test execution failed:', error);
                process.exit(1);
            } finally {
                runner.cleanup();
            }
            break;

        default:
            console.log(`
Parallel Test Runner

Usage:
  node parallel-test-runner.js run <test-type>

Test Types:
  unit         Run unit tests in parallel
  component    Run component tests in parallel
  integration  Run integration tests in parallel
  e2e          Run E2E tests (limited parallelism)
  performance  Run performance tests
  all          Run all test types

Examples:
  node parallel-test-runner.js run unit
  node parallel-test-runner.js run all
            `);
            break;
    }
}

function getTestSuites(testType) {
    const suites = {
        unit: [
            {
                type: 'jest',
                files: ['**/*.test.js', '**/*.test.ts'],
                config: { coverage: false }
            }
        ],
        component: [
            {
                type: 'jest',
                files: ['**/*.test.tsx', '**/component/**/*.test.*'],
                config: { coverage: false }
            }
        ],
        integration: [
            {
                type: 'jest',
                files: ['**/integration/**/*.test.*', '**/*.integration.test.*'],
                config: { coverage: false }
            }
        ],
        e2e: [
            {
                type: 'playwright',
                files: ['e2e/**/*.spec.ts'],
                config: { workers: 1 } // Sequential for E2E
            }
        ],
        performance: [
            {
                type: 'lighthouse',
                files: ['http://localhost:3000', 'http://localhost:3000/dashboard'],
                config: {}
            }
        ]
    };

    if (testType === 'all') {
        return Object.values(suites).flat();
    }

    return suites[testType] || suites.unit;
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ParallelTestRunner;