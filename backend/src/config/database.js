const { Pool } = require('pg');

let pool;

const connectDatabase = async () => {
  try {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'realestate_crm',
      user: process.env.DB_USER || 'crm_user',
      password: process.env.DB_PASSWORD || 'crm_password',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    pool = new Pool(config);

    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

const getDatabase = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return pool;
};

const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    console.log('Database connection closed');
  }
};

module.exports = {
  connectDatabase,
  getDatabase,
  closeDatabase,
};