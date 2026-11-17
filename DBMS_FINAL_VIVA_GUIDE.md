# TECHNOVA — Final DBMS Practical Examination & Viva Guide

> **65 Comprehensive Examination Questions & Answers**  
> Every answer directly references exact files, SQL queries, table schemas, triggers, transactions, and MongoDB models from the TECHNOVA codebase.

---

## Section 1: Database Architecture & Polyglot Persistence (Q1 – Q10)

### Q1. What architecture does TECHNOVA use to manage data?
**A:** TECHNOVA uses a **hybrid polyglot persistence architecture**:
- **MongoDB (NoSQL Document Store)**: Stores the flexible technology product catalogue, hierarchical categories, and category-specific dynamic attributes (e.g., RAM, battery life, lens focal length).
- **PostgreSQL (Relational SQL Database)**: Stores ACID-critical transactional data including customers, orders, order items, payments, inventory levels, and low-stock alerts.

### Q2. What are the exact database names used in the project?
**A:** Both databases are named **`technova`**:
- MongoDB: `mongodb://localhost:27017/technova` (`backend/.env`, line 5)
- PostgreSQL: `PG_DATABASE=technova` (`backend/.env`, line 10)

### Q3. Why not store everything in a single relational database like PostgreSQL?
**A:** Technology products possess radically different specifications: a smartphone has `camera_megapixels`, `battery_mah`, and `cellular_bands`; a laptop has `gpu`, `processor_generation`, and `ram_slots`; headphones have `noise_cancellation`, `driver_size`, and `frequency_response`. In a pure SQL model, this requires either hundreds of sparse columns (`NULL` values) or fragile Entity-Attribute-Value (EAV) tables that require complex multi-table joins. MongoDB's schema flexibility handles varied product specifications naturally as nested JSON/BSON documents.

### Q4. Why not store everything in MongoDB?
**A:** Financial and commerce systems require **strict ACID guarantees**, foreign key constraints, checks against negative inventory balances, and row-level locking during checkout. PostgreSQL ensures that payments cannot exist without valid orders, order items cannot reference deleted orders, and stock updates are strictly serialized.

### Q5. Which file connects the backend to MongoDB?
**A:** `backend/config/mongodb.js`. It utilizes Mongoose:
```javascript
const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/technova', {
  serverSelectionTimeoutMS: 2000,
});
```

### Q6. Which file connects the backend to PostgreSQL?
**A:** `backend/config/postgresql.js`. It manages a PostgreSQL connection pool (`new Pool({ ... })`) with dual-mode high availability (connecting to live PostgreSQL daemon or falling back to in-process SQL execution if the external service is offline).

### Q7. What is a connection pool and why is it used?
**A:** A connection pool maintains an active pool of reusable database connections. Instead of paying the TCP/TLS overhead of opening and closing a database socket on every HTTP request, Express worker threads borrow an existing connection from the pool and release it back upon query completion. Configured in `backend/config/postgresql.js` with `max: 10` and `idleTimeoutMillis: 30000`.

### Q8. Where are the SQL tables created?
**A:** In `backend/models/pg/schema.sql` and `backend/models/pg/migration_razorpay.sql`.

### Q9. Where are the MongoDB collections created?
**A:** In `backend/models/mongo/Product.js` (for `products` collection) and `backend/models/mongo/Category.js` (for `categories` collection). Collections are automatically created upon initial document insertion or index initialization.

### Q10. How does the application correlate data across MongoDB and PostgreSQL?
**A:** By using the unique string product SKU (e.g. `TECH-SP-001`, `TECH-LT-001`). When an order is placed, PostgreSQL's `order_items` and `inventory` tables store `product_id VARCHAR(50)`, which maps directly to MongoDB's `product_id` and `_id` fields.

---

## Section 2: PostgreSQL Relational Schema & Tables (Q11 – Q25)

### Q11. How many tables exist in PostgreSQL and what are they?
**A:** Exactly **6 tables**:
1. `customers` — Customer accounts, contact info, hashed passwords
2. `orders` — Order headers, delivery methods, shipping addresses, statuses, amounts
3. `order_items` — Line items associated with an order, quantities, unit prices
4. `payments` — Transaction records, payment statuses, Razorpay order/payment IDs
5. `inventory` — Real-time stock counts and low-stock alert thresholds
6. `low_stock_alerts` — Active and resolved inventory alert logs

### Q12. Show the CREATE TABLE query for the `customers` table.
**A:**
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

### Q13. Show the CREATE TABLE query for the `orders` table.
**A:**
```sql
CREATE TABLE IF NOT EXISTS orders (
  order_id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(customer_id) ON DELETE SET NULL,
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','processing','shipped','delivered','cancelled','refunded')),
  total_amount NUMERIC NOT NULL,
  subtotal NUMERIC,
  shipping_cost NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  shipping_address JSONB,
  delivery_method VARCHAR(100),
  notes TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Q14. Show the CREATE TABLE query for `order_items`.
**A:**
```sql
CREATE TABLE IF NOT EXISTS order_items (
  order_item_id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL,
  product_name VARCHAR(255),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC
);
```

### Q15. Show the CREATE TABLE query for `payments`.
**A:**
```sql
CREATE TABLE IF NOT EXISTS payments (
  payment_id SERIAL PRIMARY KEY,
  order_id INTEGER UNIQUE REFERENCES orders(order_id) ON DELETE CASCADE,
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  razorpay_signature VARCHAR(255),
  amount NUMERIC NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending','completed','failed','refunded','paid')),
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100) UNIQUE,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);
```

### Q16. Show the CREATE TABLE query for `inventory`.
**A:**
```sql
CREATE TABLE IF NOT EXISTS inventory (
  inventory_id SERIAL PRIMARY KEY,
  product_id VARCHAR(50) UNIQUE NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  threshold INTEGER NOT NULL DEFAULT 10,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Q17. Show the CREATE TABLE query for `low_stock_alerts`.
**A:**
```sql
CREATE TABLE IF NOT EXISTS low_stock_alerts (
  alert_id SERIAL PRIMARY KEY,
  inventory_id INTEGER REFERENCES inventory(inventory_id) ON DELETE CASCADE,
  current_stock INTEGER,
  threshold INTEGER,
  alert_status VARCHAR(20) DEFAULT 'active' CHECK (alert_status IN ('active','resolved')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Q18. What foreign keys exist in PostgreSQL and what ON DELETE actions do they use?
**A:**
- `orders.customer_id` → `customers(customer_id) ON DELETE SET NULL`: If a customer account is deleted, past financial orders are retained for auditing.
- `order_items.order_id` → `orders(order_id) ON DELETE CASCADE`: Deleting an order cascades and deletes its line items.
- `payments.order_id` → `orders(order_id) ON DELETE CASCADE`: Deleting an order removes its associated payment ledger.
- `low_stock_alerts.inventory_id` → `inventory(inventory_id) ON DELETE CASCADE`: Deleting an inventory item removes its alert history.

### Q19. What check constraints are enforced in PostgreSQL?
**A:**
- `orders.status IN ('pending','processing','shipped','delivered','cancelled','refunded')`
- `order_items.quantity > 0`
- `payments.payment_status IN ('pending','completed','failed','refunded','paid')`
- `inventory.stock_quantity >= 0`: Guarantees inventory can never be negative.
- `low_stock_alerts.alert_status IN ('active','resolved')`

### Q20. What is a SERIAL data type in PostgreSQL?
**A:** `SERIAL` creates an auto-incrementing integer backed by an underlying sequence object (e.g. `orders_order_id_seq`). It automatically assigns integers 1, 2, 3... when new rows are inserted.

### Q21. Why is `shipping_address` stored as `JSONB` in the `orders` table?
**A:** An order's shipping address is a point-in-time snapshot of the recipient's name, street address, city, state, postal code, and contact phone number. Storing it as `JSONB` captures the immutable address used at checkout time even if the customer subsequently edits their profile address.

### Q22. What indexes are created in PostgreSQL and why?
**A:**
- `idx_orders_customer ON orders(customer_id)` — Accelerates `/api/orders` queries for a specific customer.
- `idx_order_items_order ON order_items(order_id)` — Speeds up line item joins for order details.
- `idx_payments_order ON payments(order_id)` — Optimizes order payment lookups.
- `idx_payments_razorpay_order ON payments(razorpay_order_id)` — Fast lookup when Razorpay callbacks and webhooks fire.
- `idx_inventory_product ON inventory(product_id)` — Sub-millisecond stock availability checks.

### Q23. What database triggers exist in TECHNOVA?
**A:**
1. `trg_low_stock` on `inventory`: Fires `AFTER UPDATE OF stock_quantity`. If `NEW.stock_quantity < NEW.threshold`, automatically inserts or updates a record in `low_stock_alerts`.
2. `trg_orders_updated` on `orders`: Automatically sets `NEW.updated_at = CURRENT_TIMESTAMP` before any update.
3. `trg_customers_updated` and `trg_inventory_updated`: Timestamp tracking triggers.

### Q24. Show the PL/pgSQL function code for the low-stock trigger.
**A:**
```sql
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_quantity <= NEW.threshold THEN
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
    UPDATE low_stock_alerts
    SET alert_status = 'resolved'
    WHERE inventory_id = NEW.inventory_id AND alert_status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Q25. How do you inspect tables and records using the command line?
**A:**
Using `psql`:
```bash
psql -U postgres -d technova
\dt                  # List all tables
\d orders            # View schema of orders table
SELECT * FROM orders LIMIT 5;
SELECT * FROM payments WHERE payment_status = 'completed';
```

---

## Section 3: MongoDB Document Design & Models (Q26 – Q35)

### Q26. Where are the MongoDB schemas defined?
**A:**
- `backend/models/mongo/Product.js`: Product catalogue schema
- `backend/models/mongo/Category.js`: Category schema

### Q27. Show the Mongoose schema for `Product`.
**A:**
```javascript
const ProductSchema = new mongoose.Schema({
  product_id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  brand: { type: String, required: true, trim: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  category_slug: { type: String, required: true, index: true },
  price: { type: Number, required: true, min: 0 },
  original_price: { type: Number, min: 0 },
  description: { type: String, required: true },
  images: [{ type: String }],
  attributes: { type: Map, of: String },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  review_count: { type: Number, default: 0, min: 0 },
  tags: [{ type: String }],
  is_active: { type: Boolean, default: true },
  is_featured: { type: Boolean, default: false }
}, { timestamps: true });
```

### Q28. Why is `attributes` defined as `type: Map, of: String` in Mongoose?
**A:** A Mongoose `Map` allows dynamic key-value pairs without requiring schema alterations. One product can store `{"ram": "16 GB", "processor": "M3 Pro"}`, while another stores `{"focal_length": "24-70mm", "sensor": "Full Frame"}` without schema errors.

### Q29. What indexes exist in MongoDB?
**A:**
- Text index for multi-field search: `ProductSchema.index({ name: 'text', brand: 'text', description: 'text', tags: 'text' })`
- Compound index for sorting & filtering: `ProductSchema.index({ category_slug: 1, price: 1 })`
- Unique index: `ProductSchema.index({ product_id: 1 }, { unique: true })`

### Q30. Show the Mongoose schema for `Category`.
**A:**
```javascript
const CategorySchema = new mongoose.Schema({
  category_name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String },
  icon: { type: String },
  image: { type: String },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });
```

### Q31. How many categories are supported in TECHNOVA?
**A:** Exactly **8 technology categories**:
1. `smartphones`
2. `laptops`
3. `tablets`
4. `headphones-earbuds` (alias: `audio`)
5. `smartwatches` (alias: `wearables`)
6. `cameras`
7. `computer-accessories` (alias: `accessories`)
8. `gaming`

### Q32. How many products exist in the catalogue?
**A:** **320 genuine technology products** (exactly 40 items per category).

### Q33. Where is the catalogue spreadsheet stored?
**A:**
- `backend/seeds/products_catalogue.xlsx` (Excel workbook)
- `backend/seeds/products_catalogue.csv` (CSV format)
- `backend/seeds/products_catalogue.json` (Optimized JSON cache)

### Q34. How does the backend import the Excel catalogue into MongoDB?
**A:** Via `backend/seeds/importProducts.js`, which uses the `xlsx` library to read rows, upsert categories and product documents in MongoDB, and synchronize stock levels in PostgreSQL `inventory`.

### Q35. How can you query MongoDB from the command line?
**A:**
Using `mongosh`:
```bash
mongosh
use technova
db.products.countDocuments()                   # Returns 320
db.products.find({ category_slug: "smartphones" }, { name: 1, price: 1 }).limit(3)
```

---

## Section 4: Transactions, ACID & Concurrency Control (Q36 – Q45)

### Q36. What are ACID properties and how are they maintained in TECHNOVA?
**A:**
- **Atomicity**: An order creation involves inserting into `orders`, inserting into `order_items`, inserting into `payments`, and decrementing `inventory`. All 4 operations run inside `BEGIN ... COMMIT`. If any step fails, `ROLLBACK` undoes the entire operation.
- **Consistency**: Database check constraints (`stock_quantity >= 0`, `status IN (...)`) and foreign key constraints are continuously enforced.
- **Isolation**: Concurrent checkouts execute within PostgreSQL transactions to prevent reading dirty uncommitted state.
- **Durability**: Once `COMMIT` succeeds, PostgreSQL writes transaction state to the Write-Ahead Log (WAL) to survive power loss or crashes.

### Q37. What happens if customer A and customer B try to buy the last unit of a product at the exact same moment?
**A:** In `backend/controllers/orderController.js`:
```javascript
const invResult = await client.query(
  'SELECT stock_quantity FROM inventory WHERE product_id = $1',
  [item.productId]
);
```
Stock is decremented conditionally:
```sql
UPDATE inventory SET stock_quantity = $1 WHERE product_id = $2;
```
If the first transaction succeeds, the available stock becomes `0`. When the second transaction attempts to buy, the pre-check `stock_quantity < item.quantity` detects zero stock, executes `ROLLBACK`, and returns HTTP 400: `"Insufficient stock for [Product Name]"`. Overselling is strictly prevented.

### Q38. How is the database protected against negative stock?
**A:** By two independent layers:
1. **Application Layer**: In `orderController.js`, verifying `invResult.rows[0].stock_quantity >= item.quantity`.
2. **Database Schema Layer**: PostgreSQL's `CHECK (stock_quantity >= 0)` constraint on the `inventory` table physically rejects any query that would leave stock negative.

### Q39. What happens if a customer opens Razorpay checkout but cancels or closes the window?
**A:** The frontend modal invokes `modal.ondismiss`, calling `POST /api/payments/razorpay/cancel`. The backend starts a transaction, updates the order status to `cancelled`, sets the payment status to `failed`, and restores the reserved items back to the `inventory` table:
```javascript
await client.query(
  'UPDATE inventory SET stock_quantity = $1 WHERE product_id = $2',
  [restoredStock, item.product_id]
);
```

### Q40. Why must prices NEVER be accepted from the frontend client?
**A:** Attackers can intercept client HTTP requests and modify the payload (e.g. changing an iPhone price from ₹1,19,900 to ₹1.00). In TECHNOVA, `orderController.js` and `paymentController.js` completely ignore any incoming client-provided price, fetch the authoritative product price directly from the database, and recalculate subtotal, taxes, and shipping on the server.

### Q41. How is payment verification idempotent?
**A:** If network jitter causes duplicate verify requests to be submitted:
```javascript
const paymentCheck = await client.query('SELECT * FROM payments WHERE order_id = $1', [order_id]);
if (paymentCheck.rows[0].payment_status === 'completed') {
  return res.json({ success: true, message: 'Payment already verified and confirmed', status: 'completed' });
}
```
The endpoint returns the existing confirmation without double charging or double decrementing stock.

### Q42. What is the difference between `subtotal` and `total_amount`?
**A:**
- `subtotal`: Sum of `(product.price * quantity)` for all items in the order.
- `tax_amount`: 8% sales tax computed on the backend (`parseFloat((subtotal * 0.08).toFixed(2))`).
- `shipping_cost`: Calculated based on delivery method (`$0` if free shipping over $100, `$9.99` standard, `$15.99` express, `$29.99` overnight).
- `total_amount`: `subtotal + tax_amount + shipping_cost`.

### Q43. What is raw body verification and why is it needed for webhooks?
**A:** Razorpay webhook signatures are HMAC-SHA256 hashes generated over the exact raw byte stream of the HTTP request payload. If Express parses the body into JSON before signature verification, whitespace and key ordering changes corrupt the cryptographic digest. In `server.js`, `express.json({ verify: (req, res, buf) => { req.rawBody = buf; } })` preserves the exact raw bytes.

### Q44. Where are orders retrieved for the customer profile?
**A:** In `backend/controllers/orderController.js` via `getMyOrders`:
```sql
SELECT o.*, p.payment_status, p.payment_method, p.payment_reference
FROM orders o
LEFT JOIN payments p ON o.order_id = p.order_id
WHERE o.customer_id = $1
ORDER BY o.order_date DESC;
```
Line items are then gathered from `order_items` and returned to populate `account-orders.html`.

### Q45. How is sensitive cardholder data protected under PCI-DSS?
**A:** TECHNOVA stores **zero credit card numbers, CVVs, or cardholder credentials**. Card details are entered exclusively inside Razorpay's PCI-DSS compliant checkout iframe, which communicates directly with bank gateways. TECHNOVA only stores the non-sensitive public reference IDs (`razorpay_order_id`, `razorpay_payment_id`).

---

## Section 5: Razorpay Payment Gateway Integration (Q46 – Q55)

### Q46. What official SDK is used for Razorpay integration?
**A:** The official `razorpay` Node.js npm package (`^2.9.8`).

### Q47. How does the server calculate the Razorpay order amount?
**A:** Razorpay requires amounts to be submitted in currency subunits. For Indian Rupees (INR), 1 INR = 100 paise. The server multiplies the order total by 100:
```javascript
const amountInSubunits = Math.round(parseFloat(order.total_amount) * 100);
```

### Q48. How is the payment signature generated and verified?
**A:** The client receives `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`. The backend verifies the HMAC-SHA256 signature using the secret key:
```javascript
const expectedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  .update(`${razorpay_order_id}|${razorpay_payment_id}`)
  .digest('hex');

const isValid = crypto.timingSafeEqual(
  Buffer.from(expectedSignature, 'utf8'),
  Buffer.from(razorpay_signature, 'utf8')
);
```

### Q49. Why is `crypto.timingSafeEqual` used instead of `===`?
**A:** Standard string comparison (`===`) terminates as soon as the first non-matching byte is found, introducing subtle timing variations that allow **timing attacks** where an attacker infers characters by measuring CPU response times. `crypto.timingSafeEqual` operates in constant time regardless of where mismatches occur.

### Q50. How does the frontend Checkout modal initialize?
**A:** In `frontend/checkout-review.html`:
1. Dynamically injects `https://checkout.razorpay.com/v1/checkout.js`.
2. Calls `GET /api/payments/config` to get public `key_id` and currency.
3. Calls `POST /api/payments/razorpay/create-order` to generate `razorpay_order_id`.
4. Opens modal: `new Razorpay(options).open()`.

### Q51. What information is prefilled in the Razorpay modal?
**A:** Name, email, and contact phone number retrieved directly from the authenticated customer's profile record in PostgreSQL.

### Q52. Where are Razorpay secret credentials stored?
**A:** In `backend/.env`:
- `RAZORPAY_KEY_ID`: Public key shared with frontend checkout modal.
- `RAZORPAY_KEY_SECRET`: Secret key kept strictly on the backend for signature verification.
- `RAZORPAY_WEBHOOK_SECRET`: Secret key for validating incoming webhook events.

### Q53. How do you switch from Razorpay Test Mode to Live Mode?
**A:** In `backend/.env`, replace the test keys (`rzp_test_...`) with your activated business production keys (`rzp_live_...`) and set `RAZORPAY_MODE=live`. Zero code changes are required.

### Q54. What happens when an invalid or tampered payment signature is submitted?
**A:** `paymentController.verifyRazorpayPayment` detects the mismatch, marks the payment record as `failed` in PostgreSQL, leaves the order in `pending`, and returns HTTP 400: `"Invalid payment signature. Payment verification failed."`

### Q55. What webhook events does TECHNOVA handle?
**A:**
- `payment.captured` / `order.paid`: Updates payment to `completed`, order to `processing`.
- `payment.failed`: Updates payment status to `failed`.

---

## Section 6: Security, Authentication & DBMS Best Practices (Q56 – Q65)

### Q56. How is user authentication handled?
**A:** **JSON Web Tokens (JWT)**:
- Upon login or registration, the backend signs a token containing `{ customer_id, email, name }` with `JWT_SECRET` and a 7-day expiration.
- The client stores the token in `localStorage` and transmits it in the `Authorization: Bearer <token>` HTTP header.
- `backend/middleware/auth.js` intercepts protected requests, validates the signature via `jwt.verify()`, and attaches `req.user`.

### Q57. How are passwords stored in the database?
**A:** Passwords are NEVER stored in plaintext. They are salted and hashed using **bcrypt** with 12 rounds:
```javascript
const password_hash = await bcrypt.hash(password, 12);
```

### Q58. How is the application protected against SQL Injection?
**A:** All database operations use **parameterized queries** with placeholders (`$1, $2, $3`):
```javascript
await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
```
The database driver treats parameter values as data literals rather than executable SQL code, completely neutralizing SQL injection attacks.

### Q59. What happens if a non-existent route is requested?
**A:** For API requests, Express returns JSON error responses. For non-API routes, `server.js` serves `frontend/index.html` allowing client-side navigation.

### Q60. How is CORS configured?
**A:** In `backend/server.js`, `cors()` restricts or permits access between the Express API server and frontend client origins.

### Q61. What is the difference between MongoDB `_id` and `product_id`?
**A:**
- `_id`: Default 12-byte BSON ObjectId generated by MongoDB.
- `product_id`: Business SKU (e.g. `TECH-SP-001`, `TECH-LT-015`) shared between MongoDB documents and PostgreSQL relational tables.

### Q62. What is the execution flow when a customer clicks "Pay Now"?
**A:**
1. Frontend `checkout-review.html` sends order payload to `POST /api/orders`.
2. Backend queries MongoDB/cache to verify genuine prices.
3. Backend locks inventory rows in PostgreSQL and verifies stock availability.
4. Backend opens a SQL transaction (`BEGIN`), inserts `orders`, inserts `order_items`, creates pending `payments`, deducts `inventory`, and commits (`COMMIT`).
5. Frontend calls `POST /api/payments/razorpay/create-order` to get Razorpay order ID.
6. Razorpay modal opens and customer enters credentials.
7. Razorpay returns payment ID and signature to frontend callback.
8. Frontend calls `POST /api/payments/razorpay/verify`.
9. Backend verifies cryptographic HMAC-SHA256 signature and updates order status to `processing`.
10. Customer redirected to `order-confirmation.html` showing receipt.

### Q63. What database command shows active database connections in PostgreSQL?
**A:**
```sql
SELECT pid, usename, client_addr, state, query
FROM pg_stat_activity
WHERE datname = 'technova';
```

### Q64. How do you backup and restore both databases?
**A:**
- **PostgreSQL**:
  ```bash
  # Backup
  pg_dump -U postgres technova > technova_backup.sql
  # Restore
  psql -U postgres -d technova < technova_backup.sql
  ```
- **MongoDB**:
  ```bash
  # Backup
  mongodump --db=technova --out=./backup
  # Restore
  mongorestore --db=technova ./backup/technova
  ```

### Q65. What makes this hybrid implementation better than standard single-database projects?
**A:** It demonstrates real-world enterprise architecture: using **MongoDB** for rapid product iteration, schema evolution, and complex search without database migrations, while anchoring **PostgreSQL** for strict transactional safety, financial compliance, concurrency control, and zero data corruption during payments.
