# TECHNOVA — DBMS Viva Guide

> **50+ Viva Questions & Answers** based entirely on YOUR existing project code  
> Every answer references actual file paths, functions, and SQL from your implementation.

---

## Part A — Database Architecture & Setup

### Q1. What type of database architecture does your project use?
**A:** Polyglot persistence — a **hybrid architecture** using two different databases:
- **MongoDB** (NoSQL document database) — for the product catalog
- **PostgreSQL** (SQL relational database) — for customers, orders, payments, inventory

This is configured in `backend/.env` and connected in `backend/config/mongodb.js` and `backend/config/postgresql.js`.

### Q2. Why did you use two databases instead of one?
**A:** Each database is chosen for what it does best:
- **MongoDB** is ideal for the product catalog because different categories have different specifications (a smartphone has RAM, battery; headphones have noise_cancellation, driver_size). MongoDB's flexible schema (`Map` type in `backend/models/mongo/Product.js` line 19) handles this naturally without altering tables.
- **PostgreSQL** is ideal for transactional data (orders, payments, inventory) because it supports **ACID transactions**, **foreign keys**, **constraints**, and **triggers** — essential for financial data integrity.

### Q3. What is polyglot persistence?
**A:** Polyglot persistence means using multiple types of databases within a single application, each chosen for its strengths. In TECHNOVA:
- MongoDB (document store) → flexible product attributes
- PostgreSQL (relational) → transactional integrity for orders and payments

### Q4. What are your database names?
**A:** Both databases are named **`technova`**.
- MongoDB: `mongodb://localhost:27017/technova` (`.env` line 5)
- PostgreSQL: `PG_DATABASE=technova` (`.env` line 10)

### Q5. Which file connects to MongoDB?
**A:** `backend/config/mongodb.js` — uses Mongoose: `mongoose.connect('mongodb://localhost:27017/technova')`. Called from `backend/server.js` line 53.

### Q6. Which file connects to PostgreSQL?
**A:** `backend/config/postgresql.js` — uses `pg` Pool: `new Pool({ host, port, database, user, password })`. Called from `backend/server.js` line 54.

### Q7. What is a connection pool? Why do you use one for PostgreSQL?
**A:** A connection pool maintains a set of reusable database connections (configured in `backend/config/postgresql.js` with `max: 10`). Instead of opening/closing a connection for every query, connections are borrowed from the pool and returned. This improves performance and prevents connection exhaustion under load.

---

## Part B — PostgreSQL Tables (SQL)

### Q8. How many PostgreSQL tables did you create?
**A:** **6 tables**, all defined in `backend/models/pg/schema.sql`:
1. `customers` (line 4)
2. `orders` (line 20)
3. `order_items` (line 36)
4. `payments` (line 47)
5. `inventory` (line 59)
6. `low_stock_alerts` (line 68)

### Q9. Show me the CREATE TABLE statement for `customers`.
**A:** From `backend/models/pg/schema.sql` lines 4–17:
```sql
CREATE TABLE IF NOT EXISTS customers (
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
);
```

### Q10. What is a PRIMARY KEY? Show examples from your project.
**A:** A primary key uniquely identifies each row in a table. It is NOT NULL and UNIQUE. My project uses `SERIAL PRIMARY KEY` (auto-incrementing integer):
- `customers.customer_id`
- `orders.order_id`
- `order_items.order_item_id`
- `payments.payment_id`
- `inventory.inventory_id`
- `low_stock_alerts.alert_id`

### Q11. What FOREIGN KEYS exist in your project?
**A:** 
| Table | Column | References | On Delete |
|-------|--------|------------|-----------|
| `orders` | `customer_id` | `customers(customer_id)` | SET NULL |
| `order_items` | `order_id` | `orders(order_id)` | CASCADE |
| `payments` | `order_id` | `orders(order_id)` | CASCADE |
| `low_stock_alerts` | `inventory_id` | `inventory(inventory_id)` | CASCADE |

### Q12. What is ON DELETE CASCADE? Where do you use it?
**A:** ON DELETE CASCADE means when the parent row is deleted, all child rows referencing it are automatically deleted. In my project:
- Deleting an `order` automatically deletes its `order_items` and `payment`
- Deleting an `inventory` record deletes related `low_stock_alerts`

### Q13. What is ON DELETE SET NULL? Where do you use it?
**A:** ON DELETE SET NULL sets the foreign key column to NULL when the parent row is deleted. Used in `orders.customer_id REFERENCES customers(customer_id) ON DELETE SET NULL` — if a customer is deleted, their orders remain but `customer_id` becomes NULL.

### Q14. What constraints exist in your tables?
**A:**
- **NOT NULL:** `customers.name`, `customers.email`, `customers.password_hash`, `orders.total_amount`, `order_items.quantity`, `order_items.unit_price`
- **UNIQUE:** `customers.email`, `payments.order_id` (one payment per order), `payments.payment_reference`, `inventory.product_id`
- **CHECK:** `orders.status IN ('pending','processing','shipped','delivered','cancelled','refunded')`, `payments.payment_status IN ('pending','completed','failed','refunded')`, `order_items.quantity > 0`, `inventory.stock_quantity >= 0`
- **DEFAULT:** `customers.country DEFAULT 'United States'`, `orders.status DEFAULT 'pending'`, `timestamps DEFAULT CURRENT_TIMESTAMP`

### Q15. What is a CHECK constraint? Show from your project.
**A:** A CHECK constraint ensures column values satisfy a condition. From `schema.sql` line 24:
```sql
status VARCHAR(50) DEFAULT 'pending' 
  CHECK (status IN ('pending','processing','shipped','delivered','cancelled','refunded'))
```
This prevents invalid order statuses from being inserted.

### Q16. What is a GENERATED column? Where do you use one?
**A:** From `schema.sql` line 43:
```sql
total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
```
This column in `order_items` is automatically computed as `quantity × unit_price`. It cannot be manually set — PostgreSQL computes it. The `STORED` keyword means it's physically saved on disk.

### Q17. What is SERIAL in PostgreSQL?
**A:** `SERIAL` is an auto-incrementing integer type. When you INSERT a row without specifying the SERIAL column, PostgreSQL automatically assigns the next number. Example: `customer_id SERIAL PRIMARY KEY` starts at 1 and increments.

### Q18. What is JSONB and where do you use it?
**A:** JSONB is PostgreSQL's binary JSON type — it stores structured JSON data that can be queried and indexed. Used in:
- `orders.shipping_address JSONB` — stores the full shipping address as JSON
- `payments.metadata JSONB` — stores additional payment metadata

This is set in `orderController.js` line 64: `JSON.stringify(shippingAddress)`.

---

## Part C — MongoDB Collections (NoSQL)

### Q19. How many MongoDB collections does your project use?
**A:** **2 collections**, defined by Mongoose models:
1. `categories` — defined in `backend/models/mongo/Category.js`
2. `products` — defined in `backend/models/mongo/Product.js`

### Q20. Show the MongoDB product document structure.
**A:** From `backend/models/mongo/Product.js`:
```javascript
{
  _id: ObjectId("..."),           // Auto-generated MongoDB ID
  name: "iPhone 15 Pro Max",
  brand: "Apple",
  price: 1199.99,
  original_price: 1299.99,
  description: "The most powerful iPhone...",
  images: ["https://...image1.jpg", "https://...image2.jpg"],
  category_id: ObjectId("..."),   // Reference to categories collection
  category_slug: "smartphones",
  attributes: Map {               // Flexible key-value pairs!
    "ram" → "8 GB",
    "processor" → "A17 Pro",
    "battery" → "4422 mAh",
    "display" → "6.7-inch Super Retina XDR OLED"
  },
  rating: 4.9,
  review_count: 2847,
  tags: ["smartphone", "apple", "iphone", "5g"],
  is_active: true,
  is_featured: true,
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### Q21. What is the `attributes` field and why is it a Map?
**A:** The `attributes` field uses `Map of Mixed` type (line 19 of `Product.js`). Different product categories need different specifications:
- Smartphone: `ram`, `processor`, `battery`, `camera`
- Headphone: `noise_cancellation`, `driver_size`, `battery_life`
- Camera: `sensor`, `video`, `autofocus`, `iso_range`

A Map allows any key-value pairs without schema changes. In SQL, this would require either separate tables per category or many nullable columns.

### Q22. What indexes exist on the products collection?
**A:** From `Product.js` lines 29–32:
```javascript
productSchema.index({ name: 'text', brand: 'text', description: 'text', tags: 'text' });
productSchema.index({ category_id: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
```
- **Text index** — enables `$text` full-text search across name, brand, description, tags
- **category_id index** — speeds up category-based product filtering
- **price index** — speeds up price range queries
- **rating index (descending)** — speeds up "top rated" sorting

### Q23. How is MongoDB's `_id` different from PostgreSQL's SERIAL primary key?
**A:**
- MongoDB `_id` is a 12-byte **ObjectId** (e.g., `683f1a2b3c4d5e6f7a8b9c0d`) — globally unique, contains timestamp
- PostgreSQL SERIAL is an **auto-incrementing integer** (1, 2, 3...) — unique within the table only
- In this project, the MongoDB `_id` is stored as a string in PostgreSQL's `inventory.product_id` and `order_items.product_id` to link the two databases.

---

## Part D — Relationships & Cross-Database Links

### Q24. How are MongoDB and PostgreSQL connected?
**A:** Through **logical references** using the MongoDB ObjectId string. The `product_id` column in PostgreSQL tables (`inventory`, `order_items`) stores the MongoDB `_id` as a `VARCHAR(50)`. There is NO physical foreign key across databases — the application code (JavaScript) manages the relationship.

Example from `orderController.js` line 23:
```javascript
const productIds = items.map(i => i.productId);
const products = await Product.find({ _id: { $in: productIds } }); // MongoDB
```
Then line 37:
```javascript
const invResult = await client.query(
  'SELECT * FROM inventory WHERE product_id = $1 FOR UPDATE', // PostgreSQL
  [item.productId]
);
```

### Q25. What relationships exist between your PostgreSQL tables?
**A:**
- **customers → orders** (1:N) — One customer can have many orders
- **orders → order_items** (1:N) — One order can have many line items
- **orders → payments** (1:1) — One order has exactly one payment (`UNIQUE` on `payments.order_id`)
- **inventory → low_stock_alerts** (1:N) — One inventory record can have multiple alerts over time

### Q26. Is the relationship between orders and payments 1:1 or 1:N?
**A:** **1:1** — enforced by `order_id INTEGER UNIQUE REFERENCES orders(order_id)` in the `payments` table (line 49 of `schema.sql`). The `UNIQUE` constraint on `order_id` means each order can have at most one payment record.

---

## Part E — ACID Properties & Transactions

### Q27. What are ACID properties? Where are they demonstrated?
**A:** ACID stands for:
- **Atomicity** — All operations in a transaction succeed or all fail. Demonstrated in `orderController.js` with `BEGIN`/`COMMIT`/`ROLLBACK`.
- **Consistency** — The database moves from one valid state to another. CHECK constraints, NOT NULL, and UNIQUE constraints ensure this.
- **Isolation** — Concurrent transactions don't interfere. `FOR UPDATE` row-level locking in `orderController.js` line 38 prevents two users from buying the last item simultaneously.
- **Durability** — Committed data survives crashes. PostgreSQL writes to disk on COMMIT.

### Q28. Show me where you use a transaction in your code.
**A:** `backend/controllers/orderController.js`, `createOrder()` function:
```javascript
const client = await pool.connect();
await client.query('BEGIN');              // Start transaction

// ... validate, calculate, insert order, insert items, insert payment, deduct inventory ...

await client.query('COMMIT');             // All succeeded
// OR
await client.query('ROLLBACK');           // Something failed — undo everything
```

### Q29. What is row-level locking? Where do you use it?
**A:** Row-level locking (`FOR UPDATE`) locks specific rows so no other transaction can modify them until the current transaction finishes. From `orderController.js` line 37–38:
```javascript
const invResult = await client.query(
  'SELECT * FROM inventory WHERE product_id = $1 FOR UPDATE',
  [item.productId]
);
```
This prevents overselling: if two customers try to buy the last item simultaneously, one transaction locks the row and the other must wait.

### Q30. What happens if stock is insufficient during order placement?
**A:** The transaction is rolled back. From `orderController.js` lines 41–45:
```javascript
if (invResult.rows[0].stock_quantity < item.quantity) {
  await client.query('ROLLBACK');
  return res.status(400).json({ message: `Insufficient stock for ${product?.name}` });
}
```
No order is created, no inventory is deducted, no payment record is left behind.

### Q31. What happens if payment fails? Does inventory remain deducted?
**A:** In the current implementation:
1. `createOrder()` deducts inventory and creates a 'pending' payment within one transaction
2. `simulatePayment()` runs as a separate API call
3. If payment fails, `payments.payment_status` is set to 'failed' but the order and inventory deduction already committed

This is a known limitation — ideally, inventory should only be deducted after payment succeeds, or a reservation system should be used.

---

## Part F — Triggers & Functions

### Q32. What triggers exist in your database?
**A:** 4 triggers, defined in `backend/models/pg/schema.sql`:

| Trigger Name | Table | Event | Purpose |
|-------------|-------|-------|---------|
| `trg_low_stock` | `inventory` | AFTER UPDATE OF stock_quantity | Auto-creates/updates low-stock alerts |
| `trg_customers_updated` | `customers` | BEFORE UPDATE | Auto-updates `updated_at` timestamp |
| `trg_orders_updated` | `orders` | BEFORE UPDATE | Auto-updates `updated_at` timestamp |
| `trg_inventory_updated` | `inventory` | BEFORE UPDATE | Auto-updates `updated_at` timestamp |

### Q33. Explain the low-stock alert trigger.
**A:** From `schema.sql` lines 86–117:
```sql
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_quantity < NEW.threshold THEN
    IF NOT EXISTS (
      SELECT 1 FROM low_stock_alerts
      WHERE inventory_id = NEW.inventory_id AND alert_status = 'active'
    ) THEN
      INSERT INTO low_stock_alerts (inventory_id, current_stock, threshold, alert_status)
      VALUES (NEW.inventory_id, NEW.stock_quantity, NEW.threshold, 'active');
    ELSE
      UPDATE low_stock_alerts
      SET current_stock = NEW.stock_quantity
      WHERE inventory_id = NEW.inventory_id AND alert_status = 'active';
    END IF;
  ELSE
    UPDATE low_stock_alerts SET alert_status = 'resolved'
    WHERE inventory_id = NEW.inventory_id AND alert_status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Logic:**
- If stock drops below threshold → create an active alert (or update existing one)
- If stock is restocked above threshold → resolve the alert
- Fires automatically on every `UPDATE` to `stock_quantity` — no manual intervention needed

### Q34. What is PL/pgSQL?
**A:** PL/pgSQL is PostgreSQL's procedural language for writing stored functions and trigger procedures. The `check_low_stock()` function in `schema.sql` is written in PL/pgSQL, indicated by `LANGUAGE plpgsql`.

---

## Part G — Indexes

### Q35. What indexes exist in your PostgreSQL schema?
**A:** From `schema.sql` lines 78–83:
```sql
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_alerts_status ON low_stock_alerts(alert_status);
```

### Q36. Why do you create indexes? What performance benefit do they provide?
**A:** Indexes speed up SELECT queries by creating a sorted data structure (B-tree by default). Without indexes, PostgreSQL must scan every row (full table scan). For example:
- `idx_orders_customer` speeds up `SELECT * FROM orders WHERE customer_id = 5` — used when viewing "My Orders"
- `idx_inventory_product` speeds up `SELECT * FROM inventory WHERE product_id = 'abc'` — used during checkout

The tradeoff is slightly slower INSERT/UPDATE operations and additional storage.

---

## Part H — CRUD Operations

### Q37. Show a CREATE operation in your project.
**A:** Customer registration in `authController.js` line 28:
```javascript
const result = await pool.query(
  'INSERT INTO customers (name, email, password_hash, phone) VALUES ($1, $2, $3, $4) RETURNING customer_id, name, email',
  [name, email, password_hash, phone]
);
```

### Q38. Show a READ operation.
**A:** Fetching all products in `productController.js` lines 18–21:
```javascript
const [products, total] = await Promise.all([
  Product.find(filter).sort(sort).skip(skip).limit(parseInt(limit)).populate('category_id'),
  Product.countDocuments(filter)
]);
```

### Q39. Show an UPDATE operation.
**A:** Updating inventory stock in `orderController.js` lines 84–86:
```javascript
await client.query(
  'UPDATE inventory SET stock_quantity = stock_quantity - $1 WHERE product_id = $2',
  [item.quantity, item.productId]
);
```

### Q40. Show a DELETE operation.
**A:** Removing item from cart in `cartController.js` lines 80–81:
```javascript
cart = cart.filter(i => i.productId !== productId);
cartStore.set(customerId, cart);
```
(In PostgreSQL, the seed script uses: `DELETE FROM payments; DELETE FROM order_items;` etc.)

---

## Part I — Joins & Aggregation

### Q41. Where do you use a JOIN in your project?
**A:** `orderController.js` line 112–117, fetching orders with payment info:
```sql
SELECT o.*, p.payment_status, p.payment_method, p.payment_reference,
  (SELECT json_agg(json_build_object('product_id', oi.product_id, 'product_name', oi.product_name, 
   'quantity', oi.quantity, 'unit_price', oi.unit_price))
   FROM order_items oi WHERE oi.order_id = o.order_id) as items
FROM orders o
LEFT JOIN payments p ON o.order_id = p.order_id
WHERE o.customer_id = $1
ORDER BY o.order_date DESC
```

This is a **LEFT JOIN** — returns all orders even if no payment record exists yet.

### Q42. What is `json_agg` and `json_build_object`?
**A:** PostgreSQL aggregate functions:
- `json_build_object('key1', val1, 'key2', val2)` creates a JSON object from key-value pairs
- `json_agg(...)` collects multiple JSON objects into a JSON array
- Used in `orderController.js` to embed order items as a nested array inside each order result

### Q43. What is a subquery? Show one from your project.
**A:** From `orderController.js` line 113:
```sql
(SELECT json_agg(json_build_object(...)) FROM order_items oi WHERE oi.order_id = o.order_id) as items
```
This correlated subquery runs for each order row, collecting all order items into a JSON array column named `items`.

---

## Part J — Security & Authentication

### Q44. How do you hash passwords?
**A:** Using bcrypt with 12 salt rounds. From `authController.js` line 27:
```javascript
const password_hash = await bcrypt.hash(password, 12);
```
bcrypt generates a unique salt for each password and produces a hash like `$2b$12$...`. The original password cannot be recovered from the hash.

### Q45. How does JWT authentication work in your project?
**A:** 
1. User logs in → `authController.login()` verifies credentials → generates JWT: `jwt.sign({ customer_id, email, name }, JWT_SECRET, { expiresIn: '7d' })`
2. Token returned to frontend → stored in `localStorage` by `auth.js`
3. Every authenticated request includes `Authorization: Bearer <token>` header
4. `middleware/auth.js` verifies the token: `jwt.verify(token, JWT_SECRET)` → attaches `req.user`
5. Protected routes use `authenticateToken` middleware

### Q46. Why don't you store actual card numbers?
**A:** This is an academic project with simulated payments. `paymentService.js` only checks demo card numbers for simulation logic. The `payments` table stores only: `payment_method`, `payment_reference`, `payment_status` — never actual card data. This follows PCI-DSS principles.

---

## Part K — Normalization

### Q47. Is your database normalized? To what normal form?
**A:** The PostgreSQL schema is in **Third Normal Form (3NF)**:
- **1NF:** All columns have atomic values (no repeating groups). Exception: `shipping_address` uses JSONB for convenience.
- **2NF:** No partial dependencies — all non-key attributes depend on the entire primary key.
- **3NF:** No transitive dependencies — non-key attributes don't depend on other non-key attributes. Customer address is in the `customers` table, order items are in a separate `order_items` table.

### Q48. Where is denormalization used?
**A:** 
- `order_items.product_name` stores the product name at time of order (denormalized from MongoDB). This is intentional — if the product name changes later, the order history should still show the original name.
- `Product.category_slug` in MongoDB duplicates the category's slug for fast filtering without JOIN.

---

## Part L — Practical Questions

### Q49. How do you view all records in your database?
**A:**
```sql
-- PostgreSQL (in psql shell):
SELECT * FROM customers;
SELECT * FROM orders;
SELECT * FROM order_items;
SELECT * FROM payments;
SELECT * FROM inventory;
SELECT * FROM low_stock_alerts;
```
```javascript
// MongoDB (in mongosh):
db.categories.find().pretty()
db.products.find().pretty()
db.products.countDocuments()
```

### Q50. Where are your tables created? Show the exact file and line.
**A:** `backend/models/pg/schema.sql`:
- `customers` → line 4
- `orders` → line 20
- `order_items` → line 36
- `payments` → line 47
- `inventory` → line 59
- `low_stock_alerts` → line 68

Executed by `backend/seeds/seedPostgres.js` line 23: `await client.query(schema);`

### Q51. What happens when a customer places an order?
**A:** `orderController.createOrder()` in `backend/controllers/orderController.js`:
1. BEGIN transaction
2. Fetch product details from MongoDB (verify prices)
3. Lock inventory rows with `FOR UPDATE`
4. Check stock sufficiency
5. Calculate totals (subtotal + shipping + tax) on the backend
6. INSERT into `orders` table
7. INSERT into `order_items` table (one per product)
8. INSERT into `payments` table (status: 'pending')
9. UPDATE `inventory` (deduct stock quantities)
10. COMMIT transaction
11. Clear cart

### Q52. What is parameterized query? Why do you use $1, $2?
**A:** Parameterized queries prevent SQL injection. Instead of string concatenation:
```javascript
// DANGEROUS: `SELECT * FROM customers WHERE email = '${email}'`
// SAFE (what we use):
pool.query('SELECT * FROM customers WHERE email = $1', [email]);
```
The `$1` is a placeholder. The `pg` library safely escapes the value. All queries in the project use this pattern.

### Q53. What npm packages does your backend use and why?
**A:** From `package.json`:
| Package | Version | Purpose |
|---------|---------|---------|
| `express` | 4.18.2 | Web server framework |
| `mongoose` | 8.0.3 | MongoDB ODM (Object Document Mapper) |
| `pg` | 8.11.3 | PostgreSQL client library |
| `bcryptjs` | 2.4.3 | Password hashing |
| `jsonwebtoken` | 9.0.2 | JWT token generation/verification |
| `cors` | 2.8.5 | Cross-origin request handling |
| `dotenv` | 16.3.1 | Load `.env` environment variables |
| `express-validator` | 7.0.1 | Input validation (imported but not widely used) |
| `uuid` | 9.0.1 | Generate unique payment references |
| `nodemon` | 3.0.2 (dev) | Auto-restart server on file changes |

### Q54. How does the frontend communicate with the backend?
**A:** Through REST API calls using `fetch()`. The API client is in `frontend/js/api.js`:
```javascript
const API_BASE = 'http://localhost:5000/api';

async request(method, endpoint, body) {
  const res = await fetch(`${this.baseUrl}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  return await res.json();
}
```

### Q55. How is backend price verification implemented?
**A:** The frontend sends only `productId` and `quantity`. The backend fetches the actual price from MongoDB:
```javascript
// orderController.js line 24:
const products = await Product.find({ _id: { $in: productIds } });
// line 52:
const lineTotal = product.price * item.quantity;  // Uses DB price, not frontend price
```
This prevents price manipulation by malicious users.

### Q56. What is `populate()` in Mongoose?
**A:** Mongoose `populate()` replaces a reference ObjectId with the actual document from the referenced collection. From `productController.js` line 19:
```javascript
Product.find(filter).populate('category_id', 'category_name slug')
```
This fetches the product and automatically fills in `category_id` with the category document's `category_name` and `slug` fields — similar to a SQL JOIN.

### Q57. What is the difference between SQL and NoSQL? Use examples from your project.
**A:**
| Feature | SQL (PostgreSQL) | NoSQL (MongoDB) |
|---------|-----------------|-----------------|
| Schema | Fixed schema defined by CREATE TABLE | Flexible schema (Map type) |
| Relationships | Foreign keys enforce referential integrity | References are logical (application-level) |
| Transactions | ACID transactions with BEGIN/COMMIT/ROLLBACK | Available but not used in this project |
| Query language | SQL: `SELECT * FROM orders WHERE status = 'pending'` | MongoDB: `Product.find({ is_active: true })` |
| Best for | Structured transactional data (orders, payments) | Semi-structured catalogs with varying attributes |
| Used for in TECHNOVA | customers, orders, payments, inventory | categories, products |

### Q58. What are demo login credentials for testing?
**A:** Created by `backend/seeds/seedPostgres.js` lines 80–95:
- `alex@example.com` / `password123`
- `sarah@example.com` / `demo1234`
- `demo@technova.com` / `test123`

### Q59. What is `RETURNING` in PostgreSQL?
**A:** `RETURNING` returns the values of specified columns after an INSERT/UPDATE/DELETE, eliminating the need for a separate SELECT query. From `authController.js` line 29:
```sql
INSERT INTO customers (name, email, password_hash, phone) 
VALUES ($1, $2, $3, $4) 
RETURNING customer_id, name, email, phone, created_at
```

### Q60. How many products are in your seed data and across how many categories?
**A:** 52 products across 8 categories (from `seedMongo.js`):
- Smartphones: 8 (iPhone 15 Pro Max, Galaxy S24 Ultra, Pixel 8 Pro, etc.)
- Laptops: 8 (MacBook Pro, Dell XPS, ASUS ROG, etc.)
- Tablets: 5 (iPad Pro, Galaxy Tab, Surface Pro, etc.)
- Headphones & Earbuds: 8 (Sony WH-1000XM5, AirPods Pro, etc.)
- Smartwatches: 5 (Apple Watch 9, Galaxy Watch 6, etc.)
- Cameras: 5 (Sony A7 IV, Canon R6, GoPro, etc.)
- Computer Accessories: 8 (Logitech MX Master, monitors, keyboards, etc.)
- Gaming: 5 (PS5 controller, Xbox controller, gaming headsets, etc.)
