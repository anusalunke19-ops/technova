const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'technova',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function connectPostgres() {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL Connected successfully');
    client.release();
  } catch (error) {
    console.error('❌ PostgreSQL Connection Error:', error.message);
    throw error;
  }
}

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error', err);
});

module.exports = { pool, connectPostgres };
