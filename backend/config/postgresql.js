const { Pool: PgPool } = require('pg');
const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let activePool = null;
let isPgMem = false;

const livePool = new PgPool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT) || 5432,
  database: process.env.PG_DATABASE || 'technova',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function initPgMem() {
  console.log('⚡ Initializing resilient PostgreSQL engine (pg-mem) with full SQL schema...');
  const db = newDb();

  const tables = [
    `CREATE TABLE IF NOT EXISTS customers (
      customer_id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(100),
      zip_code VARCHAR(20),
      country VARCHAR(100) DEFAULT 'United States',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS orders (
      order_id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(customer_id) ON DELETE SET NULL,
      order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(50) DEFAULT 'pending',
      total_amount NUMERIC NOT NULL,
      subtotal NUMERIC,
      shipping_cost NUMERIC DEFAULT 0,
      tax_amount NUMERIC DEFAULT 0,
      shipping_address JSONB,
      delivery_method VARCHAR(100),
      notes TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS order_items (
      order_item_id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
      product_id VARCHAR(50) NOT NULL,
      product_name VARCHAR(255),
      quantity INTEGER NOT NULL,
      unit_price NUMERIC NOT NULL,
      total_price NUMERIC
    );`,
    `CREATE TABLE IF NOT EXISTS payments (
      payment_id SERIAL PRIMARY KEY,
      order_id INTEGER UNIQUE REFERENCES orders(order_id) ON DELETE CASCADE,
      razorpay_order_id VARCHAR(100),
      razorpay_payment_id VARCHAR(100),
      razorpay_signature VARCHAR(255),
      amount NUMERIC NOT NULL,
      currency VARCHAR(10) DEFAULT 'INR',
      payment_status VARCHAR(50) DEFAULT 'pending',
      payment_method VARCHAR(50),
      payment_reference VARCHAR(100) UNIQUE,
      payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      metadata JSONB
    );`,
    `CREATE TABLE IF NOT EXISTS inventory (
      inventory_id SERIAL PRIMARY KEY,
      product_id VARCHAR(50) UNIQUE NOT NULL,
      stock_quantity INTEGER NOT NULL DEFAULT 50 CHECK (stock_quantity >= 0),
      threshold INTEGER NOT NULL DEFAULT 10,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS low_stock_alerts (
      alert_id SERIAL PRIMARY KEY,
      inventory_id INTEGER REFERENCES inventory(inventory_id) ON DELETE CASCADE,
      current_stock INTEGER,
      threshold INTEGER,
      alert_status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`
  ];

  for (const sql of tables) {
    db.public.none(sql);
  }

  // Seed demo customers with real bcrypt hashes for both Password123! and test123
  const hashPassword123 = bcrypt.hashSync('Password123!', 10);
  const hashTest123 = bcrypt.hashSync('test123', 10);
  try {
    db.public.none(`
      INSERT INTO customers (name, email, password_hash, phone, address, city, state, zip_code)
      VALUES 
        ('Alex Johnson', 'alex@example.com', '${hashPassword123}', '555-0101', '123 Tech Boulevard', 'San Francisco', 'CA', '94105'),
        ('John Doe', 'john.doe@example.com', '${hashPassword123}', '555-0102', '456 Silicon Way', 'San Jose', 'CA', '95110'),
        ('Demo Customer', 'demo@technova.com', '${hashTest123}', '555-0199', '789 Innovation Drive', 'Austin', 'TX', '78701');
    `);
  } catch (e) {
    console.warn('Customer seeding notice:', e.message);
  }

  // Seed all 320 products into PostgreSQL inventory table
  try {
    const catPath = path.join(__dirname, '../seeds/products_catalogue.json');
    if (fs.existsSync(catPath)) {
      const items = JSON.parse(fs.readFileSync(catPath, 'utf8'));
      let invId = 1;
      for (const item of items) {
        const pId = item.product_id;
        const stock = Math.max(50, parseInt(item.stock_quantity) || 50);
        try {
          db.public.none(`
            INSERT INTO inventory (inventory_id, product_id, stock_quantity, threshold)
            VALUES (${invId++}, '${pId}', ${stock}, 10)
            ON CONFLICT DO NOTHING;
          `);
        } catch (e) {}
      }
      console.log(`✅ Seeded ${items.length} inventory records into PostgreSQL database`);
    }
  } catch (e) {
    console.warn('Inventory seeding notice:', e.message);
  }

  const { Pool } = db.adapters.createPg();
  activePool = new Pool();
  isPgMem = true;
  console.log('✅ In-memory PostgreSQL instance ready for SQL transactions & queries');
  return activePool;
}

const poolProxy = {
  query: async function(...args) {
    if (!activePool) {
      await connectPostgres();
    }
    return activePool.query(...args);
  },
  connect: async function() {
    if (!activePool) {
      await connectPostgres();
    }
    return activePool.connect();
  },
  on: function(...args) {
    if (activePool && activePool.on) {
      return activePool.on(...args);
    }
  }
};

async function connectPostgres() {
  if (activePool) return activePool;

  try {
    const client = await livePool.connect();
    console.log('✅ Live PostgreSQL Connected successfully');
    client.release();
    activePool = livePool;
    isPgMem = false;
    return activePool;
  } catch (error) {
    console.warn('⚠️ Live PostgreSQL Connection unavailable:', error.message);
    activePool = await initPgMem();
    return activePool;
  }
}

module.exports = {
  pool: poolProxy,
  connectPostgres,
  isPgMem: () => isPgMem,
};
