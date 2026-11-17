require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const { Pool } = require('pg');

const Category = require('../models/mongo/Category');
const Product = require('../models/mongo/Product');

/**
 * TECHNOVA Product & Inventory Importer
 * Imports products from products_catalogue.xlsx into MongoDB (Catalogue)
 * and PostgreSQL (Inventory Synchronization).
 * Idempotent: safe to run multiple times without duplicating data.
 */

const categoriesDefinition = [
  { category_name: 'Smartphones', slug: 'smartphones', description: 'Latest flagship, mid-range, and budget smartphones', icon: '📱', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400' },
  { category_name: 'Laptops', slug: 'laptops', description: 'High-performance ultrabooks, gaming laptops, and creator workstations', icon: '💻', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400' },
  { category_name: 'Tablets', slug: 'tablets', description: 'Versatile tablets for productivity, creativity, and streaming', icon: '📟', image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400' },
  { category_name: 'Headphones & Earbuds', slug: 'headphones-earbuds', description: 'Audiophile headphones, ANC over-ears, and wireless earbuds', icon: '🎧', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' },
  { category_name: 'Smartwatches', slug: 'smartwatches', description: 'Advanced fitness trackers, GPS sports watches, and luxury wearables', icon: '⌚', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400' },
  { category_name: 'Cameras', slug: 'cameras', description: 'Mirrorless, DSLR, action cameras, and professional creator gear', icon: '📷', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400' },
  { category_name: 'Computer Accessories', slug: 'computer-accessories', description: 'Monitors, ergonomic keyboards, precision mice, docks, and storage', icon: '🖥️', image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400' },
  { category_name: 'Gaming', slug: 'gaming', description: 'Consoles, controllers, VR headsets, mechanical keyboards, and gaming gear', icon: '🎮', image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=400' }
];

async function runImporter() {
  console.log('====================================================');
  console.log('🚀 TECHNOVA Product & Inventory Importer');
  console.log('====================================================\n');

  // 1. Locate Catalogue File
  const excelPath = path.join(__dirname, 'products_catalogue.xlsx');
  const csvPath = path.join(__dirname, 'products_catalogue.csv');

  let rows = [];

  if (fs.existsSync(excelPath)) {
    console.log(`📖 Reading Excel file: ${excelPath}`);
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  } else if (fs.existsSync(csvPath)) {
    console.log(`📖 Reading CSV file: ${csvPath}`);
    const workbook = xlsx.readFile(csvPath);
    const sheetName = workbook.SheetNames[0];
    rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  } else {
    console.error(`❌ Neither products_catalogue.xlsx nor products_catalogue.csv found in ${__dirname}`);
    process.exit(1);
  }

  console.log(`📦 Loaded ${rows.length} product rows from file\n`);

  // 2. Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/technova';
  let mongoConnected = false;
  try {
    console.log(`🔌 Connecting to MongoDB: ${mongoUri}...`);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    mongoConnected = true;
    console.log('✅ Connected to MongoDB successfully\n');
  } catch (mErr) {
    console.error(`⚠️ MongoDB Connection Error: ${mErr.message}`);
    console.error('Make sure MongoDB is installed and running, or configure MONGODB_URI in .env');
  }

  // 3. Connect to PostgreSQL
  const pgPool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'technova',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'password',
    connectionTimeoutMillis: 5000,
  });

  let pgConnected = false;
  let pgClient = null;
  try {
    console.log('🔌 Connecting to PostgreSQL...');
    pgClient = await pgPool.connect();
    pgConnected = true;
    console.log('✅ Connected to PostgreSQL successfully\n');
  } catch (pErr) {
    console.error(`⚠️ PostgreSQL Connection Error: ${pErr.message}`);
    console.error('Make sure PostgreSQL is running, or check PG_* settings in .env\n');
  }

  // 4. Upsert Categories in MongoDB
  const categoryMap = new Map();
  if (mongoConnected) {
    console.log('🔄 Ensuring all 8 categories exist in MongoDB...');
    for (const cat of categoriesDefinition) {
      const doc = await Category.findOneAndUpdate(
        { slug: cat.slug },
        { $set: cat },
        { upsert: true, new: true }
      );
      categoryMap.set(cat.slug, doc._id);
    }
    console.log(`✅ ${categoryMap.size} categories verified in MongoDB\n`);
  }

  // 5. Process and Upsert Products
  let mongoSuccess = 0;
  let mongoFailed = 0;
  let pgSuccess = 0;
  let pgFailed = 0;
  const processedProducts = [];

  console.log('🔄 Processing product records...');

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];

    // Validation
    const productId = String(row.product_id || '').trim();
    const name = String(row.name || '').trim();
    const brand = String(row.brand || '').trim();
    const categorySlug = String(row.category_slug || '').trim();
    const price = parseFloat(row.price);

    if (!name || !brand || !categorySlug || isNaN(price)) {
      console.warn(`⚠️ Row ${idx + 1} skipped: Missing required fields (name, brand, category_slug, price)`);
      mongoFailed++;
      continue;
    }

    // Parse attributes
    let parsedAttributes = new Map();
    if (row.attributes) {
      try {
        const parsed = typeof row.attributes === 'string' ? JSON.parse(row.attributes) : row.attributes;
        if (typeof parsed === 'object' && parsed !== null) {
          parsedAttributes = new Map(Object.entries(parsed));
        }
      } catch {
        parsedAttributes = new Map([['details', String(row.attributes)]]);
      }
    }

    // Parse tags
    let tagsArray = [];
    if (row.tags) {
      tagsArray = String(row.tags).split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    }

    // Parse images
    const images = [];
    if (row.image_url) {
      images.push(...String(row.image_url).split(',').map(s => s.trim()).filter(Boolean));
    }

    const categoryId = categoryMap.get(categorySlug) || null;

    const productPayload = {
      product_id: productId || undefined,
      name,
      brand,
      price,
      original_price: !isNaN(parseFloat(row.original_price)) ? parseFloat(row.original_price) : price,
      description: row.description || '',
      images: images.length > 0 ? images : ['https://via.placeholder.com/600x600?text=' + encodeURIComponent(name)],
      category_id: categoryId,
      category_slug: categorySlug,
      attributes: parsedAttributes,
      rating: !isNaN(parseFloat(row.rating)) ? parseFloat(row.rating) : 4.5,
      review_count: !isNaN(parseInt(row.review_count)) ? parseInt(row.review_count) : 100,
      tags: tagsArray,
      is_active: String(row.is_active).toLowerCase() !== 'false',
      is_featured: String(row.is_featured).toLowerCase() === 'true',
    };

    // Upsert into MongoDB
    let savedDoc = null;
    if (mongoConnected) {
      try {
        const query = productId ? { product_id: productId } : { name, brand };
        savedDoc = await Product.findOneAndUpdate(
          query,
          { $set: productPayload },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        mongoSuccess++;
        processedProducts.push({
          mongoId: String(savedDoc._id),
          customId: productId || String(savedDoc._id),
          name: savedDoc.name,
          stock: parseInt(row.stock_quantity) || 50,
          threshold: 10,
        });
      } catch (err) {
        console.error(`❌ Failed to upsert product "${name}" in MongoDB:`, err.message);
        mongoFailed++;
      }
    } else {
      // Offline fallback tracking
      processedProducts.push({
        mongoId: `mock_${idx + 1}`,
        customId: productId || `TECH-PR-${idx + 1}`,
        name,
        stock: parseInt(row.stock_quantity) || 50,
        threshold: 10,
      });
    }
  }

  // 6. Synchronize Inventory with PostgreSQL
  if (pgConnected && pgClient) {
    console.log('\n🔄 Synchronizing Inventory with PostgreSQL...');
    try {
      // Ensure inventory table exists
      await pgClient.query(`
        CREATE TABLE IF NOT EXISTS inventory (
          inventory_id SERIAL PRIMARY KEY,
          product_id VARCHAR(50) UNIQUE NOT NULL,
          stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
          threshold INTEGER NOT NULL DEFAULT 10,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      for (const item of processedProducts) {
        try {
          // Upsert using the customId and mongoId to maintain logical cross-database references
          await pgClient.query(`
            INSERT INTO inventory (product_id, stock_quantity, threshold, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (product_id) DO UPDATE SET
              stock_quantity = EXCLUDED.stock_quantity,
              threshold = EXCLUDED.threshold,
              updated_at = NOW()
          `, [item.mongoId, item.stock, item.threshold]);

          // Also insert custom product_id reference if different
          if (item.customId && item.customId !== item.mongoId) {
            await pgClient.query(`
              INSERT INTO inventory (product_id, stock_quantity, threshold, updated_at)
              VALUES ($1, $2, $3, NOW())
              ON CONFLICT (product_id) DO UPDATE SET
                stock_quantity = EXCLUDED.stock_quantity,
                threshold = EXCLUDED.threshold,
                updated_at = NOW()
            `, [item.customId, item.stock, item.threshold]);
          }

          pgSuccess++;
        } catch (invErr) {
          console.error(`❌ Inventory insert error for ${item.customId}:`, invErr.message);
          pgFailed++;
        }
      }
      console.log(`✅ Synchronized ${pgSuccess} inventory records in PostgreSQL`);
    } catch (err) {
      console.error('❌ PostgreSQL inventory sync error:', err.message);
    } finally {
      pgClient.release();
      await pgPool.end();
    }
  }

  // Save product IDs mapping for seeds
  const idsPath = path.join(__dirname, 'productIds.json');
  fs.writeFileSync(idsPath, JSON.stringify(processedProducts.map(p => p.mongoId), null, 2));
  console.log(`💾 Saved ${processedProducts.length} product IDs to seeds/productIds.json`);

  // Disconnect Mongo
  if (mongoConnected) {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }

  console.log('\n====================================================');
  console.log('📊 IMPORT COMPLETED');
  console.log('====================================================');
  console.log(`MongoDB Products Imported/Updated : ${mongoSuccess}`);
  console.log(`MongoDB Failed Rows               : ${mongoFailed}`);
  if (pgConnected) {
    console.log(`PostgreSQL Inventory Synced       : ${pgSuccess}`);
    console.log(`PostgreSQL Failed Records         : ${pgFailed}`);
  } else {
    console.log('PostgreSQL Inventory Status       : Pending (Database not reachable)');
  }
  console.log('====================================================\n');
}

runImporter().catch(err => {
  console.error('Fatal importer error:', err);
  process.exit(1);
});
