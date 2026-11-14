require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'technova',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL');

    // Run schema
    const schemaPath = path.join(__dirname, '../models/pg/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schema);
    console.log('✅ Schema created/verified');

    // Read product IDs from MongoDB seed
    let productIds = [];
    const idsPath = path.join(__dirname, 'productIds.json');
    if (fs.existsSync(idsPath)) {
      productIds = JSON.parse(fs.readFileSync(idsPath, 'utf8'));
      console.log(`Loaded ${productIds.length} product IDs from MongoDB seed`);
    } else {
      console.warn('⚠️  productIds.json not found. Run seedMongo.js first!');
      // Generate placeholder IDs so script can still run
      for (let i = 0; i < 52; i++) productIds.push(`placeholder_product_${i + 1}`);
    }

    // Clear existing data (order matters due to FKs)
    await client.query('DELETE FROM low_stock_alerts');
    await client.query('DELETE FROM payments');
    await client.query('DELETE FROM order_items');
    await client.query('DELETE FROM orders');
    await client.query('DELETE FROM inventory');
    await client.query('DELETE FROM customers');
    // Reset sequences
    await client.query('ALTER SEQUENCE customers_customer_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE orders_order_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE order_items_order_item_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE payments_payment_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE inventory_inventory_id_seq RESTART WITH 1');
    console.log('✅ Cleared existing data and reset sequences');

    // Stock ranges per category: smartphones(8), laptops(8), tablets(5), headphones(8), watches(5), cameras(5), accessories(8), gaming(5)
    const stockRanges = [
      ...Array(8).fill({ min: 50, max: 200, threshold: 10 }),  // smartphones
      ...Array(8).fill({ min: 20, max: 100, threshold: 5 }),   // laptops
      ...Array(5).fill({ min: 30, max: 120, threshold: 8 }),   // tablets
      ...Array(8).fill({ min: 100, max: 300, threshold: 20 }), // headphones
      ...Array(5).fill({ min: 40, max: 150, threshold: 10 }),  // smartwatches
      ...Array(5).fill({ min: 15, max: 60, threshold: 5 }),    // cameras
      ...Array(8).fill({ min: 80, max: 250, threshold: 15 }),  // accessories
      ...Array(5).fill({ min: 50, max: 180, threshold: 12 }),  // gaming
    ];

    for (let i = 0; i < productIds.length; i++) {
      const range = stockRanges[i] || { min: 50, max: 150, threshold: 10 };
      const stock = Math.floor(Math.random() * (range.max - range.min) + range.min);
      await client.query(
        'INSERT INTO inventory (product_id, stock_quantity, threshold) VALUES ($1, $2, $3) ON CONFLICT (product_id) DO UPDATE SET stock_quantity = $2, threshold = $3',
        [productIds[i], stock, range.threshold]
      );
    }
    console.log(`✅ Inventory inserted: ${productIds.length} records`);

    // Sample customers
    const hash1 = await bcrypt.hash('password123', 12);
    const hash2 = await bcrypt.hash('demo1234', 12);
    const hash3 = await bcrypt.hash('test123', 12);

    const c1 = await client.query(
      'INSERT INTO customers (name, email, password_hash, phone, address, city, state, zip_code, country) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING customer_id',
      ['Alex Johnson', 'alex@example.com', hash1, '555-0101', '123 Tech Street', 'San Francisco', 'CA', '94105', 'United States']
    );
    const c2 = await client.query(
      'INSERT INTO customers (name, email, password_hash, phone, address, city, state, zip_code, country) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING customer_id',
      ['Sarah Chen', 'sarah@example.com', hash2, '555-0202', '456 Innovation Ave', 'New York', 'NY', '10001', 'United States']
    );
    const c3 = await client.query(
      'INSERT INTO customers (name, email, password_hash, phone, address, city, state, zip_code, country) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING customer_id',
      ['Demo User', 'demo@technova.com', hash3, '555-0303', '789 Demo Lane', 'Austin', 'TX', '78701', 'United States']
    );
    console.log('✅ Sample customers created (3 accounts)');
    console.log('   📧 alex@example.com / password123');
    console.log('   📧 sarah@example.com / demo1234');
    console.log('   📧 demo@technova.com / test123');

    // Sample orders (only if real product IDs exist)
    if (productIds.length > 0 && !productIds[0].startsWith('placeholder')) {
      const shippingAddr1 = JSON.stringify({ name: 'Alex Johnson', address: '123 Tech Street', city: 'San Francisco', state: 'CA', zip: '94105', country: 'United States', email: 'alex@example.com', phone: '555-0101' });
      const shippingAddr2 = JSON.stringify({ name: 'Sarah Chen', address: '456 Innovation Ave', city: 'New York', state: 'NY', zip: '10001', country: 'United States', email: 'sarah@example.com', phone: '555-0202' });

      // Order 1 - delivered
      const o1 = await client.query(
        "INSERT INTO orders (customer_id, total_amount, subtotal, shipping_cost, tax_amount, shipping_address, delivery_method, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING order_id",
        [c1.rows[0].customer_id, 1299.98, 1199.99, 0, 99.99, shippingAddr1, 'standard', 'delivered']
      );
      await client.query('INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES ($1,$2,$3,$4,$5)', [o1.rows[0].order_id, productIds[0], 'iPhone 15 Pro Max', 1, 1199.99]);
      await client.query("INSERT INTO payments (order_id, amount, payment_status, payment_method, payment_reference) VALUES ($1,$2,$3,$4,$5)", [o1.rows[0].order_id, 1299.98, 'completed', 'card', 'TN-DEMO-001']);

      // Order 2 - shipped
      const o2 = await client.query(
        "INSERT INTO orders (customer_id, total_amount, subtotal, shipping_cost, tax_amount, shipping_address, delivery_method, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING order_id",
        [c2.rows[0].customer_id, 2199.97, 1999.99, 0, 199.98, shippingAddr2, 'express', 'shipped']
      );
      await client.query('INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES ($1,$2,$3,$4,$5)', [o2.rows[0].order_id, productIds[8], 'MacBook Pro 14" M3 Pro', 1, 1999.99]);
      await client.query("INSERT INTO payments (order_id, amount, payment_status, payment_method, payment_reference) VALUES ($1,$2,$3,$4,$5)", [o2.rows[0].order_id, 2199.97, 'completed', 'paypal', 'TN-DEMO-002']);

      // Order 3 - processing (multi-item)
      const o3 = await client.query(
        "INSERT INTO orders (customer_id, total_amount, subtotal, shipping_cost, tax_amount, shipping_address, delivery_method, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING order_id",
        [c1.rows[0].customer_id, 647.97, 559.98, 0, 47.99, shippingAddr1, 'standard', 'processing']
      );
      await client.query('INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES ($1,$2,$3,$4,$5)', [o3.rows[0].order_id, productIds[16], 'Sony WH-1000XM5', 1, 329.99]);
      await client.query('INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES ($1,$2,$3,$4,$5)', [o3.rows[0].order_id, productIds[36], 'Logitech MX Master 3S', 1, 99.99]);
      await client.query('INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES ($1,$2,$3,$4,$5)', [o3.rows[0].order_id, productIds[40], 'Keychron K2 Pro', 1, 99.99]);
      await client.query("INSERT INTO payments (order_id, amount, payment_status, payment_method, payment_reference) VALUES ($1,$2,$3,$4,$5)", [o3.rows[0].order_id, 647.97, 'completed', 'apple_pay', 'TN-DEMO-003']);

      console.log('✅ Sample orders and payments created (3 orders)');
    }

    console.log('\n✅ PostgreSQL seeding complete!');
  } catch (error) {
    console.error('❌ PostgreSQL seeding error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
