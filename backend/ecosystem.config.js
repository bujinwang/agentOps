module.exports = {
  apps: [
    {
      name: 'realestate-crm-api',
      script: 'src/server.js',
      instances: 'max', // Use all available CPUs
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        watch: true,
        ignore_watch: ['node_modules', 'logs', 'tests'],
        watch_options: {
          followSymlinks: false
        }
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000
      },
      // Logging
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      
      // Auto restart
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      
      // Health monitoring
      health_monitor: {
        http: ['http://localhost:3000/health', 'http://localhost:3001/health'],
        interval: 30000,
        timeout: 5000,
        retries: 3,
        followRedirect: true,
        allowRedirects: true
      },
      
      // Advanced options
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      wait_ready: true,
      
      // Environment variables
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        JWT_SECRET: process.env.JWT_SECRET,
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_NAME: process.env.DB_NAME,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD,
        REDIS_HOST: process.env.REDIS_HOST,
        REDIS_PORT: process.env.REDIS_PORT,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD
      }
    },
    
    // Background job worker
    {
      name: 'realestate-crm-worker',
      script: 'src/jobs/worker.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      env_development: {
        NODE_ENV: 'development',
        watch: true
      },
      error_file: './logs/worker-err.log',
      out_file: './logs/worker-out.log',
      log_file: './logs/worker-combined.log',
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s'
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['production-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/realestate-crm.git',
      path: '/var/www/realestate-crm',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get install git -y',
      'post-setup': 'ls -la',
      env: {
        NODE_ENV: 'production'
      }
    },
    
    staging: {
      user: 'deploy',
      host: ['staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/realestate-crm.git',
      path: '/var/www/realestate-crm-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};