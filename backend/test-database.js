// Test script to check database connectivity and table existence

const { Pool } = require('pg');

async function testDatabase() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'realestate_crm',
    user: process.env.DB_USER || 'crm_user',
    password: process.env.DB_PASSWORD || 'crm_password',
    ssl: false,
  };

  console.log('Testing database connection with config:', {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    // Don't log password
  });

  const pool = new Pool(config);

  try {
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connected successfully');

    // Check current database
    const dbResult = await client.query('SELECT current_database()');
    console.log('Current database:', dbResult.rows[0].current_database);

    // Check if users table exists
    const tableResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    console.log('Users table exists:', tableResult.rows[0].exists);

    // List all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('Tables in database:');
    tablesResult.rows.forEach(row => {
      console.log('  -', row.table_name);
    });

    // Check migration tracking table
    const migrationResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);
    
    console.log('Migrations table exists:', migrationResult.rows[0].exists);

    if (migrationResult.rows[0].exists) {
      const migrations = await client.query('SELECT * FROM migrations ORDER BY version');
      console.log('Applied migrations:');
      migrations.rows.forEach(row => {
        console.log('  - Version:', row.version, 'Applied:', row.applied_at);
      });
    }

    client.release();
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

testDatabase();