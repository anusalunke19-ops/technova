# TECHNOVA — SQL & MongoDB Commands Reference

> Quick reference for connecting, querying, and inspecting your databases during the DBMS viva.

---

## Part 1 — PostgreSQL Commands

### 1.1 Connect to PostgreSQL

```bash
# Open Command Prompt or PowerShell, navigate to PostgreSQL bin directory
# (adjust path based on your PostgreSQL installation version)
cd "C:\Program Files\PostgreSQL\16\bin"

# Connect to PostgreSQL
psql -U postgres
# Enter your password when prompted

# If PostgreSQL is not in PATH, use full path:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
```

### 1.2 Create and Connect to Database

```sql
-- List all databases
\l

-- Create the technova database (if it doesn't exist)
CREATE DATABASE technova;

-- Connect to technova database
\c technova

-- Check current database
SELECT current_database();
```

### 1.3 Run the Schema File

```sql
-- From psql, run the schema file to create all tables:
\i 'c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/models/pg/schema.sql'

-- Or from command line:
psql -U postgres -d technova -f "c:\Users\ANANYA\OneDrive\Desktop\dbms\backend\models\pg\schema.sql"
```

### 1.4 List All Tables

```sql
-- List all tables in current database
\dt

-- Expected output:
--              List of relations
--  Schema |       Name        | Type  |  Owner
-- --------+-------------------+-------+----------
--  public | customers         | table | postgres
--  public | inventory         | table | postgres
--  public | low_stock_alerts  | table | postgres
--  public | order_items       | table | postgres
--  public | orders            | table | postgres
--  public | payments          | table | postgres
```

### 1.5 Describe Table Structures

```sql
-- Describe a table (show columns, types, constraints)
\d customers
\d orders
\d order_items
\d payments
\d inventory
\d low_stock_alerts

-- Show only columns with types
\d+ customers
```

### 1.6 View All Records

```sql
-- View all customers
SELECT * FROM customers;

-- View all orders (with formatted output)
SELECT order_id, customer_id, status, total_amount, order_date 
FROM orders ORDER BY order_id;

-- View all order items
SELECT * FROM order_items;

-- View all payments
SELECT payment_id, order_id, amount, payment_status, payment_method, payment_reference 
FROM payments;

-- View all inventory (sorted by stock, lowest first)
SELECT * FROM inventory ORDER BY stock_quantity ASC;

-- View all active low-stock alerts
SELECT * FROM low_stock_alerts WHERE alert_status = 'active';

-- Count records in each table
SELECT 'customers' AS table_name, COUNT(*) FROM customers
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'inventory', COUNT(*) FROM inventory
UNION ALL SELECT 'low_stock_alerts', COUNT(*) FROM low_stock_alerts;
```

### 1.7 Query Relationships (JOINs)

```sql
-- Orders with customer names (INNER JOIN)
SELECT o.order_id, c.name AS customer_name, o.status, o.total_amount, o.order_date
FROM orders o
INNER JOIN customers c ON o.customer_id = c.customer_id;

-- Orders with payment details (LEFT JOIN)
SELECT o.order_id, o.status, o.total_amount, 
       p.payment_status, p.payment_method, p.payment_reference
FROM orders o
LEFT JOIN payments p ON o.order_id = p.order_id;

-- Full order details with items (JOIN + subquery)
SELECT o.order_id, o.status, o.total_amount,
       c.name AS customer,
       p.payment_status, p.payment_method
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
LEFT JOIN payments p ON o.order_id = p.order_id;

-- Order items for a specific order
SELECT oi.product_name, oi.quantity, oi.unit_price, oi.total_price
FROM order_items oi
WHERE oi.order_id = 1;

-- Low-stock alerts with product IDs
SELECT a.alert_id, i.product_id, a.current_stock, a.threshold, a.alert_status
FROM low_stock_alerts a
JOIN inventory i ON a.inventory_id = i.inventory_id
WHERE a.alert_status = 'active';
```

### 1.8 Aggregate Queries

```sql
-- Total revenue
SELECT SUM(total_amount) AS total_revenue FROM orders WHERE status != 'cancelled';

-- Orders per status
SELECT status, COUNT(*) AS count FROM orders GROUP BY status;

-- Average order amount
SELECT AVG(total_amount) AS avg_order_value FROM orders;

-- Payments by method
SELECT payment_method, COUNT(*) AS count, SUM(amount) AS total 
FROM payments 
WHERE payment_status = 'completed' 
GROUP BY payment_method;

-- Products with low stock (below threshold)
SELECT product_id, stock_quantity, threshold 
FROM inventory 
WHERE stock_quantity < threshold;

-- Top customers by order count
SELECT c.name, c.email, COUNT(o.order_id) AS total_orders, SUM(o.total_amount) AS total_spent
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.name, c.email
ORDER BY total_orders DESC;
```

### 1.9 View Constraints

```sql
-- View all constraints on a table
SELECT conname AS constraint_name, contype AS type, 
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'orders'::regclass;

-- View all foreign keys in the database
SELECT tc.table_name, kcu.column_name, 
       ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';

-- View all CHECK constraints
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE contype = 'c' AND connamespace = 'public'::regnamespace;
```

### 1.10 View Indexes

```sql
-- List all indexes
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public';
```

### 1.11 View Triggers

```sql
-- List all triggers
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- View trigger function source code
\df+ check_low_stock
\df+ update_updated_at_column
```

### 1.12 Test the Low-Stock Trigger

```sql
-- Check current stock for a product
SELECT * FROM inventory WHERE product_id = (SELECT product_id FROM inventory LIMIT 1);

-- Reduce stock below threshold to trigger alert
UPDATE inventory SET stock_quantity = 3 
WHERE inventory_id = 1;

-- Check if alert was auto-created
SELECT * FROM low_stock_alerts WHERE inventory_id = 1;

-- Restock above threshold
UPDATE inventory SET stock_quantity = 50 WHERE inventory_id = 1;

-- Check that alert was auto-resolved
SELECT * FROM low_stock_alerts WHERE inventory_id = 1;
```

### 1.13 Useful Admin Commands

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('technova'));

-- Check table sizes
SELECT relname AS table_name, 
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- View sequences (auto-increment counters)
\ds

-- Check current sequence values
SELECT last_value FROM customers_customer_id_seq;
SELECT last_value FROM orders_order_id_seq;
```

---

## Part 2 — MongoDB Commands

### 2.1 Connect to MongoDB

```bash
# Open MongoDB Shell
mongosh

# Or connect to specific URI
mongosh "mongodb://localhost:27017/technova"

# If using MongoDB Atlas (cloud):
mongosh "mongodb+srv://username:password@cluster.mongodb.net/technova"
```

### 2.2 Database Operations

```javascript
// List all databases
show dbs

// Switch to technova database
use technova

// Show current database
db

// List all collections
show collections
// Expected: categories, products
```

### 2.3 View All Documents

```javascript
// View all categories
db.categories.find().pretty()

// View all products (first 20)
db.products.find().pretty()

// Count documents
db.categories.countDocuments()   // Expected: 8
db.products.countDocuments()    // Expected: 52

// View specific fields only (projection)
db.products.find({}, { name: 1, brand: 1, price: 1, category_slug: 1 }).pretty()
```

### 2.4 Filter Queries

```javascript
// Find all smartphones
db.products.find({ category_slug: "smartphones" }).pretty()

// Find products by brand
db.products.find({ brand: "Apple" }).pretty()

// Find products under $500
db.products.find({ price: { $lt: 500 } }, { name: 1, price: 1 }).pretty()

// Find featured products
db.products.find({ is_featured: true }, { name: 1, brand: 1, price: 1 }).pretty()

// Find products with rating >= 4.8
db.products.find({ rating: { $gte: 4.8 } }, { name: 1, rating: 1 }).pretty()

// Find products between $100 and $500
db.products.find({ price: { $gte: 100, $lte: 500 } }, { name: 1, price: 1 }).pretty()
```

### 2.5 Text Search

```javascript
// Full-text search (requires text index — already created by Product.js)
db.products.find({ $text: { $search: "iPhone" } }, { name: 1, brand: 1, price: 1 }).pretty()

// Search for gaming products
db.products.find({ $text: { $search: "gaming wireless" } }).pretty()
```

### 2.6 Sort and Limit

```javascript
// Top 5 most expensive products
db.products.find({}, { name: 1, price: 1 }).sort({ price: -1 }).limit(5)

// Top 5 highest rated
db.products.find({}, { name: 1, rating: 1, review_count: 1 }).sort({ rating: -1 }).limit(5)

// Products sorted by name
db.products.find({}, { name: 1 }).sort({ name: 1 })
```

### 2.7 Aggregate Queries

```javascript
// Count products per category
db.products.aggregate([
  { $group: { _id: "$category_slug", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])

// Average price per category
db.products.aggregate([
  { $group: { _id: "$category_slug", avgPrice: { $avg: "$price" }, count: { $sum: 1 } } },
  { $sort: { avgPrice: -1 } }
])

// Most popular brands (by review count)
db.products.aggregate([
  { $group: { _id: "$brand", totalReviews: { $sum: "$review_count" }, productCount: { $sum: 1 } } },
  { $sort: { totalReviews: -1 } },
  { $limit: 10 }
])

// Price range per category
db.products.aggregate([
  { $group: { 
    _id: "$category_slug", 
    minPrice: { $min: "$price" }, 
    maxPrice: { $max: "$price" }, 
    avgPrice: { $avg: "$price" } 
  }}
])
```

### 2.8 View Indexes

```javascript
// List all indexes on products collection
db.products.getIndexes()

// Expected indexes:
// 1. _id (default)
// 2. { name: "text", brand: "text", description: "text", tags: "text" }
// 3. { category_id: 1 }
// 4. { price: 1 }
// 5. { rating: -1 }
```

### 2.9 View Document Structure (Schema)

```javascript
// View one product document to see the full structure
db.products.findOne({ name: "iPhone 15 Pro Max" })

// View one category document
db.categories.findOne()

// Check what attribute fields exist for smartphones
db.products.findOne({ category_slug: "smartphones" }).attributes
```

### 2.10 Useful Admin Commands

```javascript
// Database stats
db.stats()

// Collection stats
db.products.stats()

// Explain a query (show how index is used)
db.products.find({ category_slug: "smartphones" }).explain("executionStats")
```

---

## Part 3 — Running the Project

### 3.1 Prerequisites

```bash
# 1. Install MongoDB Community Server
#    Download: https://www.mongodb.com/try/download/community
#    After install, start the MongoDB service

# 2. Install PostgreSQL
#    Download: https://www.postgresql.org/download/windows/
#    Remember your postgres password during setup

# 3. Node.js is already installed (v24.14.0)
```

### 3.2 Configure Environment

```bash
# Edit backend/.env — set your actual PostgreSQL password:
# PG_PASSWORD=your_actual_postgres_password
```

### 3.3 Create PostgreSQL Database

```bash
psql -U postgres
CREATE DATABASE technova;
\q
```

### 3.4 Seed Databases

```bash
cd c:\Users\ANANYA\OneDrive\Desktop\dbms\backend

# Step 1: Seed MongoDB (must run FIRST — generates product IDs)
node seeds/seedMongo.js

# Step 2: Seed PostgreSQL (uses product IDs from step 1)
node seeds/seedPostgres.js
```

### 3.5 Start the Server

```bash
cd c:\Users\ANANYA\OneDrive\Desktop\dbms\backend

# Production mode
node server.js

# Development mode (auto-restart on changes)
npx nodemon server.js

# Expected output:
# ✅ MongoDB Connected: localhost
# ✅ PostgreSQL Connected successfully
# 🚀 TECHNOVA Server running on http://localhost:5000
```

### 3.6 Open the Website

Open browser and navigate to: **http://localhost:5000**

### 3.7 Test Login

Use these demo credentials:
- Email: `alex@example.com` | Password: `password123`
- Email: `sarah@example.com` | Password: `demo1234`
- Email: `demo@technova.com` | Password: `test123`
