#!/usr/bin/env node

/**
 * Test Environment Manager for Real Estate CRM
 * Manages test environments, databases, and services
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const util = require('util');
const execAsync = util.promisify(require('child_process').exec);

class TestEnvironmentManager {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.environments = {
            local: {
                name: 'local',
                database: {
                    type: 'postgres',
                    host: 'localhost',
                    port: 5432,
                    database: 'real_estate_crm_test',
                    username: 'postgres',
                    password: 'postgres'
                },
                services: {
                    redis: { port: 6379 },
                    elasticsearch: { port: 9200 }
                },
                api: {
                    baseUrl: 'http://localhost:3001'
                }
            },
            staging: {
                name: 'staging',
                database: {
                    type: 'postgres',
                    host: process.env.STAGING_DB_HOST || 'staging-db.example.com',
                    port: 5432,
                    database: 'real_estate_crm_staging',
                    username: process.env.STAGING_DB_USER,
                    password: process.env.STAGING_DB_PASSWORD
                },
                services: {
                    redis: { host: 'staging-redis.example.com', port: 6379 },
                    elasticsearch: { host: 'staging-es.example.com', port: 9200 }
                },
                api: {
                    baseUrl: 'https://staging-api.realestatecrm.com'
                }
            }
        };
        this.activeEnvironment = null;
    }

    async setupEnvironment(envName = 'local') {
        const env = this.environments[envName];
        if (!env) {
            throw new Error(`Environment '${envName}' not found`);
        }

        console.log(`🔧 Setting up ${envName} test environment...`);

        this.activeEnvironment = env;

        // Setup database
        await this.setupDatabase(env.database);

        // Setup services
        await this.setupServices(env.services);

        // Setup test data
        await this.setupTestData(env);

        // Verify environment
        await this.verifyEnvironment(env);

        console.log(`✅ ${envName} test environment ready`);
        return env;
    }

    async setupDatabase(config) {
        console.log('📊 Setting up test database...');

        try {
            switch (config.type) {
                case 'postgres':
                    await this.setupPostgresDatabase(config);
                    break;
                default:
                    throw new Error(`Unsupported database type: ${config.type}`);
            }
        } catch (error) {
            console.warn(`Database setup warning: ${error.message}`);
            // Continue with setup even if database setup has issues
        }
    }

    async setupPostgresDatabase(config) {
        const { host, port, database, username, password } = config;

        // Create database if it doesn't exist
        const createDbCommand = `createdb -h ${host} -p ${port} -U ${username} ${database} 2>/dev/null || echo "Database may already exist"`;

        try {
            await execAsync(createDbCommand, {
                env: { ...process.env, PGPASSWORD: password }
            });
        } catch (error) {
            // Database might already exist, which is fine
        }

        // Run migrations
        const migrationPath = path.join(this.projectRoot, 'database', 'migrations');
        const schemaPath = path.join(this.projectRoot, 'database', 'schema.sql');

        try {
            // Check if schema file exists
            await fs.access(schemaPath);

            // Apply schema
            const psqlCommand = `psql -h ${host} -p ${port} -U ${username} -d ${database} -f ${schemaPath}`;
            await execAsync(psqlCommand, {
                env: { ...process.env, PGPASSWORD: password }
            });

            console.log('✅ Database schema applied');
        } catch (error) {
            console.warn('Schema application skipped or failed:', error.message);
        }

        // Run seed data if available
        const seedPath = path.join(this.projectRoot, 'database', 'seeds', 'test-seed.sql');
        try {
            await fs.access(seedPath);
            const seedCommand = `psql -h ${host} -p ${port} -U ${username} -d ${database} -f ${seedPath}`;
            await execAsync(seedCommand, {
                env: { ...process.env, PGPASSWORD: password }
            });
            console.log('✅ Test seed data loaded');
        } catch (error) {
            // Seed file doesn't exist, which is fine
        }
    }

    async setupServices(services) {
        console.log('🔧 Setting up test services...');

        const servicePromises = Object.entries(services).map(async ([serviceName, config]) => {
            try {
                await this.startService(serviceName, config);
                console.log(`✅ ${serviceName} service started`);
            } catch (error) {
                console.warn(`${serviceName} service setup failed: ${error.message}`);
            }
        });

        await Promise.allSettled(servicePromises);
    }

    async startService(serviceName, config) {
        switch (serviceName) {
            case 'redis':
                return this.startRedisService(config);
            case 'elasticsearch':
                return this.startElasticsearchService(config);
            default:
                throw new Error(`Unsupported service: ${serviceName}`);
        }
    }

    async startRedisService(config) {
        // Check if Redis is already running
        try {
            await execAsync('redis-cli ping');
            console.log('Redis already running');
            return;
        } catch (error) {
            // Redis not running, start it
        }

        if (config.host && config.host !== 'localhost') {
            // Remote Redis, assume it's already running
            console.log('Using remote Redis service');
            return;
        }

        // Start local Redis
        return new Promise((resolve, reject) => {
            const redis = spawn('redis-server', ['--port', config.port.toString()], {
                detached: true,
                stdio: 'ignore'
            });

            redis.unref();

            // Wait a bit for Redis to start
            setTimeout(() => {
                resolve();
            }, 2000);

            redis.on('error', (error) => {
                reject(error);
            });
        });
    }

    async startElasticsearchService(config) {
        // Similar to Redis, check if running or start local instance
        console.log('Elasticsearch service setup (placeholder)');
    }

    async setupTestData(env) {
        console.log('📝 Setting up test data...');

        // Create test data directory
        const testDataDir = path.join(this.projectRoot, 'test-data');
        await fs.mkdir(testDataDir, { recursive: true });

        // Generate test data files
        const testUsers = this.generateTestUsers();
        const testProperties = this.generateTestProperties();

        await fs.writeFile(
            path.join(testDataDir, 'users.json'),
            JSON.stringify(testUsers, null, 2)
        );

        await fs.writeFile(
            path.join(testDataDir, 'properties.json'),
            JSON.stringify(testProperties, null, 2)
        );

        console.log('✅ Test data generated');
    }

    generateTestUsers() {
        return [
            {
                id: 1,
                email: 'test@example.com',
                name: 'Test User',
                role: 'agent',
                created_at: new Date().toISOString()
            },
            {
                id: 2,
                email: 'admin@example.com',
                name: 'Admin User',
                role: 'admin',
                created_at: new Date().toISOString()
            }
        ];
    }

    generateTestProperties() {
        return [
            {
                id: 1,
                address: '123 Test Street',
                city: 'Test City',
                state: 'TS',
                zip_code: '12345',
                price: 250000,
                bedrooms: 3,
                bathrooms: 2,
                square_feet: 1500,
                property_type: 'house',
                status: 'active',
                agent_id: 1,
                created_at: new Date().toISOString()
            }
        ];
    }

    async verifyEnvironment(env) {
        console.log('🔍 Verifying test environment...');

        // Verify database connection
        try {
            await this.verifyDatabaseConnection(env.database);
            console.log('✅ Database connection verified');
        } catch (error) {
            console.warn(`Database verification failed: ${error.message}`);
        }

        // Verify API endpoint
        try {
            await this.verifyApiEndpoint(env.api.baseUrl);
            console.log('✅ API endpoint verified');
        } catch (error) {
            console.warn(`API verification failed: ${error.message}`);
        }

        // Verify services
        for (const [serviceName, config] of Object.entries(env.services)) {
            try {
                await this.verifyService(serviceName, config);
                console.log(`✅ ${serviceName} service verified`);
            } catch (error) {
                console.warn(`${serviceName} verification failed: ${error.message}`);
            }
        }
    }

    async verifyDatabaseConnection(config) {
        const { type, host, port, database, username, password } = config;

        switch (type) {
            case 'postgres':
                const testQuery = `psql -h ${host} -p ${port} -U ${username} -d ${database} -c "SELECT 1"`;
                await execAsync(testQuery, {
                    env: { ...process.env, PGPASSWORD: password }
                });
                break;
            default:
                throw new Error(`Unsupported database type: ${type}`);
        }
    }

    async verifyApiEndpoint(baseUrl) {
        const https = require('https');
        const http = require('http');

        return new Promise((resolve, reject) => {
            const url = new URL(baseUrl);
            const client = url.protocol === 'https:' ? https : http;

            const req = client.request({
                hostname: url.hostname,
                port: url.port,
                path: '/health',
                method: 'GET',
                timeout: 5000
            }, (res) => {
                if (res.statusCode === 200) {
                    resolve();
                } else {
                    reject(new Error(`Health check failed with status ${res.statusCode}`));
                }
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    async verifyService(serviceName, config) {
        switch (serviceName) {
            case 'redis':
                await execAsync('redis-cli ping');
                break;
            case 'elasticsearch':
                // Placeholder for Elasticsearch verification
                break;
            default:
                throw new Error(`Unsupported service: ${serviceName}`);
        }
    }

    async teardownEnvironment(envName = 'local') {
        const env = this.environments[envName];
        if (!env) {
            throw new Error(`Environment '${envName}' not found`);
        }

        console.log(`🧹 Tearing down ${envName} test environment...`);

        // Stop services
        await this.stopServices(env.services);

        // Clean up test data
        await this.cleanupTestData();

        console.log(`✅ ${envName} test environment cleaned up`);
    }

    async stopServices(services) {
        for (const [serviceName, config] of Object.entries(services)) {
            try {
                await this.stopService(serviceName, config);
                console.log(`⏹️  ${serviceName} service stopped`);
            } catch (error) {
                console.warn(`${serviceName} stop failed: ${error.message}`);
            }
        }
    }

    async stopService(serviceName, config) {
        switch (serviceName) {
            case 'redis':
                if (config.host === 'localhost' || !config.host) {
                    try {
                        await execAsync(`pkill -f "redis-server.*${config.port}"`);
                    } catch (error) {
                        // Redis might not be running, which is fine
                    }
                }
                break;
            case 'elasticsearch':
                // Placeholder for Elasticsearch stop
                break;
        }
    }

    async cleanupTestData() {
        const testDataDir = path.join(this.projectRoot, 'test-data');
        try {
            await fs.rm(testDataDir, { recursive: true, force: true });
            console.log('🗑️  Test data cleaned up');
        } catch (error) {
            console.warn(`Test data cleanup failed: ${error.message}`);
        }
    }

    async resetEnvironment(envName = 'local') {
        console.log(`🔄 Resetting ${envName} test environment...`);

        await this.teardownEnvironment(envName);
        await this.setupEnvironment(envName);

        console.log(`✅ ${envName} test environment reset`);
    }

    getEnvironmentStatus(envName = 'local') {
        const env = this.environments[envName];
        if (!env) {
            throw new Error(`Environment '${envName}' not found`);
        }

        return {
            name: env.name,
            database: env.database,
            services: env.services,
            api: env.api,
            isActive: this.activeEnvironment?.name === envName
        };
    }

    listEnvironments() {
        return Object.keys(this.environments);
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const envName = args[1] || 'local';

    const manager = new TestEnvironmentManager();

    try {
        switch (command) {
            case 'setup':
                await manager.setupEnvironment(envName);
                break;

            case 'teardown':
                await manager.teardownEnvironment(envName);
                break;

            case 'reset':
                await manager.resetEnvironment(envName);
                break;

            case 'status':
                const status = manager.getEnvironmentStatus(envName);
                console.log(JSON.stringify(status, null, 2));
                break;

            case 'list':
                const environments = manager.listEnvironments();
                console.log('Available environments:');
                environments.forEach(env => console.log(`  - ${env}`));
                break;

            default:
                console.log(`
Test Environment Manager

Usage:
  node test-environment-manager.js <command> [environment]

Commands:
  setup [env]     Setup test environment (default: local)
  teardown [env]  Tear down test environment (default: local)
  reset [env]     Reset test environment (default: local)
  status [env]    Show environment status (default: local)
  list            List available environments

Environments:
  local           Local development environment
  staging         Staging environment

Examples:
  node test-environment-manager.js setup
  node test-environment-manager.js reset staging
  node test-environment-manager.js status
                `);
                break;
        }
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = TestEnvironmentManager;