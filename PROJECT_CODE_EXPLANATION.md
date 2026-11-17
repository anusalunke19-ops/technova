# TECHNOVA — Complete Project Code Explanation

> **Academic DBMS Project** — Hybrid E-Commerce Website  
> **Stack:** Node.js + Express.js | MongoDB (Mongoose) | PostgreSQL (pg) | HTML/CSS/JS Frontend

---

## Table of Contents
1. [Project Folder Structure](#1-project-folder-structure)
2. [Database Setup Explained](#2-database-setup-explained)
3. [Backend — File-by-File Explanation](#3-backend--file-by-file-explanation)
4. [Frontend — File-by-File Explanation](#4-frontend--file-by-file-explanation)
5. [Complete Execution Flows](#5-complete-execution-flows)
6. [Implementation Status](#6-implementation-status)

---

## 1. Project Folder Structure

```
c:\Users\ANANYA\OneDrive\Desktop\dbms\
│
├── dbms report.pdf                    ← Wireframe PDF (source of truth for UI design)
│
├── backend\                           ← Node.js/Express server
│   ├── .env                           ← Environment variables (DB URLs, JWT secret, port)
│   ├── .env.example                   ← Template for .env (safe to share)
│   ├── package.json                   ← npm dependencies and scripts
│   ├── package-lock.json              ← Exact dependency versions
│   ├── server.js                      ← Main entry point — starts Express server
│   │
│   ├── config\                        ← Database connection configuration
│   │   ├── mongodb.js                 ← MongoDB connection using Mongoose
│   │   └── postgresql.js              ← PostgreSQL connection using pg Pool
│   │
│   ├── middleware\                     ← Express middleware
│   │   ├── auth.js                    ← JWT authentication middleware
│   │   └── errorHandler.js            ← Global error handler
│   │
│   ├── models\                        ← Database models/schemas
│   │   ├── mongo\                     ← MongoDB Mongoose models
│   │   │   ├── Category.js            ← Category schema (name, slug, description)
│   │   │   └── Product.js             ← Product schema (name, price, attributes Map)
│   │   └── pg\                        ← PostgreSQL schemas
│   │       └── schema.sql             ← All CREATE TABLE + triggers + indexes
│   │
│   ├── controllers\                   ← Business logic for each API route
│   │   ├── authController.js          ← Register, login, logout, getMe
│   │   ├── productController.js       ← Products CRUD, search, compare, featured
│   │   ├── categoryController.js      ← List categories, get by slug
│   │   ├── cartController.js          ← In-memory cart: get/add/update/remove/clear
│   │   ├── wishlistController.js      ← In-memory wishlist: get/add/remove
│   │   ├── orderController.js         ← Create order (ACID transaction), list, get by ID
│   │   ├── paymentController.js       ← Simulate payment, get payment by order
│   │   ├── customerController.js      ← Profile get/update, password change
│   │   ├── inventoryController.js     ← Inventory CRUD, low-stock alerts
│   │   └── supportController.js       ← Returns, support tickets, order tracking
│   │
│   ├── routes\                        ← Express Router definitions
│   │   ├── auth.js                    ← /api/auth/*
│   │   ├── products.js                ← /api/products/*
│   │   ├── categories.js              ← /api/categories/*
│   │   ├── cart.js                     ← /api/cart/*
│   │   ├── wishlist.js                ← /api/wishlist/*
│   │   ├── orders.js                  ← /api/orders/*
│   │   ├── payments.js                ← /api/payments/*
│   │   ├── customers.js               ← /api/customers/*
│   │   ├── inventory.js               ← /api/inventory/*
│   │   └── support.js                 ← /api/support/*
│   │
│   ├── services\                      ← Business services
│   │   └── paymentService.js          ← Simulated payment gateway (demo cards)
│   │
│   ├── seeds\                         ← Database seed/populate scripts
│   │   ├── seedMongo.js               ← Seeds 8 categories + 52 products into MongoDB
│   │   └── seedPostgres.js            ← Creates tables + seeds customers, orders, inventory
│   │
│   └── node_modules\                  ← Installed npm packages (151 packages)
│
└── frontend\                          ← Static HTML/CSS/JS frontend
    ├── css\
    │   ├── global.css                 ← Design system: CSS variables, reset, layout grid
    │   └── components.css             ← UI components: cards, buttons, forms, badges
    │
    ├── js\
    │   ├── api.js                     ← ApiClient class — all fetch() calls to backend
    │   ├── auth.js                    ← Auth state manager (localStorage tokens)
    │   ├── cart.js                    ← CartManager + WishlistManager + UI helpers
    │   └── common.js                  ← Shared header/footer HTML generator
    │
    ├── index.html                     ← Homepage (hero banner, featured products, categories)
    ├── shop.html                      ← Shop All Products (filters, sort, pagination)
    ├── category.html                  ← Category page (dynamic via ?slug= parameter)
    ├── search.html                    ← Search results page
    ├── product.html                   ← Product detail page (gallery, specs, add-to-cart)
    ├── compare.html                   ← Product comparison (up to 3 side-by-side)
    ├── wishlist.html                  ← Saved products wishlist
    ├── cart.html                      ← Shopping cart (quantities, totals, checkout link)
    ├── checkout-shipping.html         ← Step 1: Shipping address + delivery method
    ├── checkout-payment.html          ← Step 2: Payment method selection (simulated)
    ├── checkout-review.html           ← Step 3: Review order + place order
    ├── order-confirmation.html        ← Order success page (confetti, order ID)
    ├── signin.html                    ← Login form
    ├── register.html                  ← Registration form
    ├── account-profile.html           ← My Account — profile, address, password
    ├── account-orders.html            ← My Orders — order history with status filters
    ├── order-details.html             ← Single order details + tracking timeline
    └── help.html                      ← Help center, returns, FAQ, contact form
```

---

## 2. Database Setup Explained

### Question 1: Where is MongoDB installed?

**MongoDB is NOT currently installed on your machine.** Your `.env` file configures it to connect to `mongodb://localhost:27017/technova`, which is a **local** MongoDB server on port 27017. When you ran the seed script, it failed with:

```
connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017
```

**You need to install MongoDB Community Server** from https://www.mongodb.com/try/download/community and start the `mongod` service, OR use a free cloud instance from MongoDB Atlas (mongodb+srv://... connection string in `.env`).

### Question 2: Where is PostgreSQL installed?

**PostgreSQL is NOT currently accessible from your command line.** Your `.env` configures:
- Host: `localhost`
- Port: `5432`
- Database: `technova`
- User: `postgres`
- Password: `your_password` (needs to be changed to your actual password)

You need to either:
- Install PostgreSQL from https://www.postgresql.org/download/windows/
- Or use a cloud-hosted PostgreSQL like Supabase, Neon, or ElephantSQL

### Question 3: Local or Online?

Currently configured for **local** databases (both `localhost`). Neither is currently running/installed. You can switch to online by changing the connection strings in `backend/.env`.

### Question 4: Database Names

| Database | Name | Configured In |
|----------|------|---------------|
| MongoDB | `technova` | `.env` line 5: `MONGODB_URI=mongodb://localhost:27017/technova` |
| PostgreSQL | `technova` | `.env` line 10: `PG_DATABASE=technova` |

### Question 5: Where is data stored?

- **MongoDB** stores data in its `dbPath` directory (default: `C:\data\db` on Windows, or `C:\Program Files\MongoDB\Server\<version>\data` depending on installation). Data is stored as BSON documents in collection files.
- **PostgreSQL** stores data in its `data` directory (default: `C:\Program Files\PostgreSQL\<version>\data`). Data is stored in binary table files.

### Question 6: Which file connects backend to MongoDB?

**File:** [`backend/config/mongodb.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/config/mongodb.js)

```javascript
const mongoose = require('mongoose');

async function connectMongoDB() {
  const conn = await mongoose.connect(
    process.env.MONGODB_URI || 'mongodb://localhost:27017/technova',
    { useNewUrlParser: true, useUnifiedTopology: true }
  );
  console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
}
```

**Called from:** [`backend/server.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/server.js) line 53: `await connectMongoDB();`

### Question 7: Which file connects backend to PostgreSQL?

**File:** [`backend/config/postgresql.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/config/postgresql.js)

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'technova',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  max: 10,                        // Maximum 10 concurrent connections
  idleTimeoutMillis: 30000,       // Close idle connections after 30s
  connectionTimeoutMillis: 2000,  // Fail connection attempt after 2s
});
```

**Called from:** [`backend/server.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/server.js) line 54: `await connectPostgres();`

### Question 8: Where are PostgreSQL tables created?

**File:** [`backend/models/pg/schema.sql`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/models/pg/schema.sql)

This SQL file contains all 6 `CREATE TABLE` statements. It is **executed** by the seed script:

**File:** [`backend/seeds/seedPostgres.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/seeds/seedPostgres.js) lines 21–24:
```javascript
const schemaPath = path.join(__dirname, '../models/pg/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
await client.query(schema);
```

### Question 9: Where are MongoDB collections created?

MongoDB collections are created **automatically** when data is first inserted. The schemas are defined in:
- [`backend/models/mongo/Category.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/models/mongo/Category.js) → creates `categories` collection
- [`backend/models/mongo/Product.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/models/mongo/Product.js) → creates `products` collection

### Question 10: Where is data inserted?

| Data | File | What it inserts |
|------|------|-----------------|
| MongoDB categories & products | [`backend/seeds/seedMongo.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/seeds/seedMongo.js) | 8 categories, 52 products |
| PostgreSQL customers, orders, inventory | [`backend/seeds/seedPostgres.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/seeds/seedPostgres.js) | 3 customers, 3 orders, 52 inventory records |
| New customers at runtime | [`backend/controllers/authController.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/controllers/authController.js) → `register()` |
| New orders at runtime | [`backend/controllers/orderController.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/controllers/orderController.js) → `createOrder()` |

### Question 11: How to open databases and see records?

**MongoDB:**
```bash
# Terminal command (after MongoDB is installed):
mongosh                              # Opens MongoDB shell
use technova                         # Switch to technova database
show collections                     # Lists: categories, products
db.categories.find().pretty()        # View all categories
db.products.find().pretty()          # View all products
db.products.find({category_slug: "smartphones"})  # Filter by category
```

**PostgreSQL:**
```bash
# Terminal command (after PostgreSQL is installed):
psql -U postgres                     # Opens psql shell (enter password)
\c technova                          # Connect to technova database
\dt                                  # List all tables
SELECT * FROM customers;             # View all customers
SELECT * FROM orders;                # View all orders
SELECT * FROM payments;              # View all payments
SELECT * FROM inventory;             # View all inventory
```

---

## 3. Backend — File-by-File Explanation

### 3.1 `backend/server.js` — Application Entry Point
**Location:** [`backend/server.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/server.js)  
**Purpose:** Initializes Express server, connects to both databases, registers all API routes, and serves the frontend.

**Key operations:**
1. Loads environment variables from `.env` using `dotenv`
2. Creates Express app with CORS, JSON parsing middleware
3. Serves frontend static files from `../frontend/`
4. Registers 10 API route groups under `/api/*`
5. Calls `connectMongoDB()` and `connectPostgres()` on startup
6. Starts listening on port 5000

**How to start:** `cd backend && node server.js`

### 3.2 `backend/config/mongodb.js` — MongoDB Connection
**Location:** [`backend/config/mongodb.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/config/mongodb.js)  
**Purpose:** Establishes connection to MongoDB using Mongoose ODM.  
**Exports:** `{ connectMongoDB, mongoose }`  
**Connection string:** `mongodb://localhost:27017/technova`  
**Used by:** `server.js` (startup), and indirectly by all Mongoose models.

### 3.3 `backend/config/postgresql.js` — PostgreSQL Connection
**Location:** [`backend/config/postgresql.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/config/postgresql.js)  
**Purpose:** Creates a PostgreSQL connection pool using the `pg` library.  
**Exports:** `{ pool, connectPostgres }`  
**Key detail:** Uses connection pooling (max 10 connections) for efficiency.  
**Used by:** All controllers that need PostgreSQL (`authController`, `orderController`, `paymentController`, `customerController`, `inventoryController`, `supportController`).

### 3.4 `backend/middleware/auth.js` — Authentication Middleware
**Location:** [`backend/middleware/auth.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/middleware/auth.js)  
**Purpose:** Validates JWT tokens on protected routes.

**Two middleware functions:**
- **`authenticateToken`** — Requires valid JWT. Returns 401 if missing, 403 if invalid. Attaches decoded user to `req.user`.
- **`optionalAuth`** — Does NOT block unauthenticated requests. Attaches `req.user` if token exists.

**Token verification:** `jwt.verify(token, process.env.JWT_SECRET)`  
**Token location:** `Authorization: Bearer <token>` header

### 3.5 `backend/middleware/errorHandler.js` — Global Error Handler
**Location:** [`backend/middleware/errorHandler.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/middleware/errorHandler.js)  
**Purpose:** Catches unhandled errors and returns consistent JSON error responses.  
**Handles:** Mongoose CastError (bad ObjectId), duplicate key (11000), validation errors, JWT errors.

### 3.6 `backend/models/mongo/Category.js` — Category Model
**Location:** [`backend/models/mongo/Category.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/models/mongo/Category.js)  
**Purpose:** Defines the MongoDB schema for product categories.

**Fields:**
| Field | Type | Purpose |
|-------|------|---------|
| `category_name` | String (required) | Display name, e.g., "Smartphones" |
| `slug` | String (unique) | URL-safe ID, e.g., "smartphones" |
| `description` | String | Category description |
| `icon` | String | Emoji icon, e.g., "📱" |
| `image` | String | Category image URL |
| `is_active` | Boolean (default true) | Soft delete flag |

**Collection name:** `categories` (auto-created by Mongoose)

### 3.7 `backend/models/mongo/Product.js` — Product Model
**Location:** [`backend/models/mongo/Product.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/models/mongo/Product.js)  
**Purpose:** Defines the MongoDB schema for products with flexible attributes.

**Fields:**
| Field | Type | Purpose |
|-------|------|---------|
| `name` | String (required) | Product name |
| `brand` | String (required) | Manufacturer brand |
| `price` | Number (required, min 0) | Current selling price |
| `original_price` | Number | Original price (for discount display) |
| `description` | String | Product description |
| `images` | [String] | Array of image URLs |
| `category_id` | ObjectId (ref: Category) | Foreign key to categories collection |
| `category_slug` | String (required) | Denormalized category slug for fast filtering |
| `attributes` | Map of Mixed | **Flexible key-value specs** (RAM, processor, etc.) |
| `rating` | Number (0–5) | Average rating |
| `review_count` | Number | Total reviews |
| `reviews` | [reviewSchema] | Embedded review documents |
| `tags` | [String] | Search/filter tags |
| `is_active` | Boolean | Soft delete flag |
| `is_featured` | Boolean | Featured on homepage |

**Key design decision — `attributes` as `Map`:**  
Different categories have different specs. A smartphone has `ram`, `processor`, `battery`. A headphone has `noise_cancellation`, `driver_size`. Using a `Map` allows each product to have category-specific attributes without changing the schema.

**Indexes (for search performance):**
```javascript
productSchema.index({ name: 'text', brand: 'text', description: 'text', tags: 'text' });
productSchema.index({ category_id: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
```

### 3.8 `backend/controllers/authController.js` — Authentication Logic
**Location:** [`backend/controllers/authController.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/controllers/authController.js)

**Functions:**
| Function | Route | Database | Purpose |
|----------|-------|----------|---------|
| `register()` | POST /api/auth/register | PostgreSQL | Creates new customer with bcrypt-hashed password |
| `login()` | POST /api/auth/login | PostgreSQL | Verifies credentials, returns JWT token |
| `logout()` | POST /api/auth/logout | — | Returns success (stateless JWT) |
| `getMe()` | GET /api/auth/me | PostgreSQL | Returns current user profile from token |

**Security measures:**
- Password hashed with `bcrypt.hash(password, 12)` — 12 salt rounds
- JWT generated with `customer_id`, `email`, `name` payload
- Token expires in 7 days (`JWT_EXPIRES_IN`)
- Email uniqueness checked before registration

### 3.9 `backend/controllers/productController.js` — Product Operations
**Location:** [`backend/controllers/productController.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/controllers/productController.js)

**Functions:**
| Function | Route | Purpose |
|----------|-------|---------|
| `getProducts()` | GET /api/products | List all products with pagination, sorting, price/rating/brand filters |
| `getProductById()` | GET /api/products/:id | Single product with category populated |
| `searchProducts()` | GET /api/products/search | Full-text search using MongoDB `$text` index |
| `getProductsByCategory()` | GET /api/products/category/:slug | Products filtered by category slug |
| `getFeaturedProducts()` | GET /api/products/featured | Products where `is_featured = true` |
| `compareProducts()` | GET /api/products/compare | Multiple products by comma-separated IDs |

**Key SQL-like vs NoSQL detail:** These all use MongoDB queries via Mongoose. The `$text` search uses MongoDB's text index on `name`, `brand`, `description`, `tags`.

### 3.10 `backend/controllers/orderController.js` — Order Creation (ACID Transaction)
**Location:** [`backend/controllers/orderController.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/controllers/orderController.js)

**This is the most complex controller — it uses PostgreSQL ACID transactions.**

**`createOrder()` — Step by step:**

1. **BEGIN transaction** — `await client.query('BEGIN')`
2. **Validate inputs** — Check items array and shipping address exist
3. **Fetch products from MongoDB** — `Product.find({ _id: { $in: productIds } })` to get real prices
4. **Verify all products exist** — If any product not found, ROLLBACK
5. **Lock inventory rows** — `SELECT * FROM inventory WHERE product_id = $1 FOR UPDATE` (row-level locking prevents concurrent overselling)
6. **Check stock sufficiency** — If `stock_quantity < item.quantity`, ROLLBACK
7. **Calculate totals on backend** — Never trusts frontend prices. Calculates subtotal, shipping (free over $100), tax (8%)
8. **INSERT into orders** — Creates order record
9. **INSERT into order_items** — Creates line items for each product
10. **INSERT into payments** — Creates pending payment record
11. **UPDATE inventory** — Deducts stock: `stock_quantity = stock_quantity - $1`
12. **COMMIT** — All or nothing. If any step fails, everything rolls back
13. **Clear cart** — `cartStore.delete(customerId)`

**Why this matters for DBMS viva:** This demonstrates **ACID properties**, **transactions**, **row-level locking**, and **cross-database integration** (MongoDB for products, PostgreSQL for orders).

### 3.11 `backend/controllers/paymentController.js` — Simulated Payments
**Location:** [`backend/controllers/paymentController.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/controllers/paymentController.js)

**`simulatePayment()`:**
1. Verifies order belongs to the authenticated customer
2. Checks if payment already completed (prevents double-pay)
3. Calls `paymentService.simulatePayment()` — the simulated gateway
4. Updates `payments` table with status and reference
5. If successful, updates order status from 'pending' to 'processing'

### 3.12 `backend/services/paymentService.js` — Payment Simulation Engine
**Location:** [`backend/services/paymentService.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/services/paymentService.js)

**Demo test cards:**
| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | ✅ Success |
| `4000 0000 0000 0002` | ❌ Card declined |
| `4000 0000 0000 9995` | ❌ Insufficient funds |

**Payment methods handled:** `card`, `paypal`, `apple_pay`  
**Reference format:** `TN-<UUID>-<timestamp>` (e.g., `TN-A1B2C3D4-M5N6O7`)  
**Important:** No real card data is stored. This is a simulation.

### 3.13 `backend/controllers/cartController.js` — Shopping Cart
**Location:** [`backend/controllers/cartController.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/controllers/cartController.js)

**Storage:** In-memory `Map()` (not persisted to database)  
**Key:** `customerId` → `[{ productId, quantity }]`

**Functions:** `getCart()`, `addToCart()`, `updateCartItem()`, `removeFromCart()`, `clearCart()`

**Important limitation:** Cart data is lost when the server restarts because it uses an in-memory Map instead of a database table.

### 3.14 `backend/controllers/inventoryController.js` — Stock Management
**Location:** [`backend/controllers/inventoryController.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/controllers/inventoryController.js)

**Functions:**
- `getInventory()` — All inventory sorted by stock (lowest first)
- `getInventoryByProductId()` — Stock for a specific product
- `updateInventory()` — Admin: update stock and threshold
- `getLowStockAlerts()` — Active alerts (auto-created by trigger)

### 3.15 `backend/seeds/seedMongo.js` — MongoDB Seeder
**Location:** [`backend/seeds/seedMongo.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/seeds/seedMongo.js)

**Inserts:**
- **8 categories:** Smartphones, Laptops, Tablets, Headphones & Earbuds, Smartwatches, Cameras, Computer Accessories, Gaming
- **52 products:** 8 smartphones, 8 laptops, 5 tablets, 8 headphones, 5 smartwatches, 5 cameras, 8 accessories, 5 gaming products
- **Saves product IDs** to `seeds/productIds.json` — used by PostgreSQL seeder to link inventory

### 3.16 `backend/seeds/seedPostgres.js` — PostgreSQL Seeder
**Location:** [`backend/seeds/seedPostgres.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/backend/seeds/seedPostgres.js)

**Operations:**
1. **Runs `schema.sql`** — Creates all 6 tables, indexes, triggers
2. **Clears existing data** — Deletes in FK-safe order
3. **Resets sequences** — `ALTER SEQUENCE ... RESTART WITH 1`
4. **Inserts inventory** — 52 records (one per product) with random stock
5. **Creates 3 demo customers:**
   - `alex@example.com` / `password123`
   - `sarah@example.com` / `demo1234`
   - `demo@technova.com` / `test123`
6. **Creates 3 sample orders** (delivered, shipped, processing) with payment records

---

## 4. Frontend — File-by-File Explanation

### Core JavaScript Files

| File | Purpose | Key Exports |
|------|---------|-------------|
| [`js/api.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/js/api.js) | Centralized HTTP client for all backend API calls | `window.api` (ApiClient instance) |
| [`js/auth.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/js/auth.js) | Manages JWT token in localStorage, login state | `window.Auth` |
| [`js/cart.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/js/cart.js) | Cart/wishlist managers, toast notifications, product card builder, formatters | `CartManager`, `WishlistManager`, `showToast`, `buildProductCard`, `formatCurrency`, `formatDate`, `renderStars` |
| [`js/common.js`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/js/common.js) | Shared header/footer HTML templates, search handler | `getHeaderHTML()`, `getFooterHTML()`, `initCommon()` |

### HTML Pages

| Page | URL | Purpose | Backend APIs Used |
|------|-----|---------|-------------------|
| [`index.html`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/index.html) | / | Homepage with hero, categories, featured products | `GET /api/products/featured`, `GET /api/categories` |
| [`shop.html`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/shop.html) | /shop.html | All products with filters, sort, pagination | `GET /api/products` |
| [`category.html`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/category.html) | /category.html?slug=X | Category-specific product listing | `GET /api/products/category/:slug`, `GET /api/categories/:slug` |
| [`search.html`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/search.html) | /search.html?q=X | Search results | `GET /api/products/search?q=X` |
| [`product.html`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/product.html) | /product.html?id=X | Product details, specs, add-to-cart | `GET /api/products/:id`, `GET /api/inventory/:id` |
| [`compare.html`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/compare.html) | /compare.html | Side-by-side comparison (localStorage) | `GET /api/products/compare?ids=...` |
| [`wishlist.html`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/wishlist.html) | /wishlist.html | Saved products | `GET /api/wishlist` |
| [`cart.html`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/cart.html) | /cart.html | Shopping cart with totals | `GET /api/cart`, `PUT/DELETE /api/cart/:id` |
| [`checkout-shipping.html`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/checkout-shipping.html) | /checkout-shipping.html | Shipping address form | — (saves to sessionStorage) |
| [`checkout-payment.html`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/checkout-payment.html) | /checkout-payment.html | Payment method selection | — (saves to sessionStorage) |
| [`checkout-review.html`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/checkout-review.html) | /checkout-review.html | Order review + place order | `POST /api/orders`, `POST /api/payments/simulate` |
| [`order-confirmation.html`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/order-confirmation.html) | /order-confirmation.html | Success page | — (reads from sessionStorage) |
| [`signin.html`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/signin.html) | /signin.html | Login form | `POST /api/auth/login` |
| [`register.html`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/register.html) | /register.html | Registration form | `POST /api/auth/register` |
| [`account-profile.html`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/account-profile.html) | /account-profile.html | Profile management | `GET/PUT /api/customers/profile` |
| [`account-orders.html`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/account-orders.html) | /account-orders.html | Order history | `GET /api/orders` |
| [`order-details.html`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/order-details.html) | /order-details.html?id=X | Single order tracking | `GET /api/orders/:id` |
| [`help.html`](file:///c:/Users/ANANYA/OneDrive/Desktop/dbms/frontend/help.html) | /help.html | Help, returns, FAQ, contact | `GET /api/support/track/:id`, `POST /api/support/returns` |

---

## 5. Complete Execution Flows

### Flow 1: Customer Registration

```
register.html form → submit event
  → api.register({ name, email, password })
    → POST /api/auth/register
      → authController.register()
        → pool.query('SELECT ... WHERE email = $1')     ← Check duplicate
        → bcrypt.hash(password, 12)                       ← Hash password
        → pool.query('INSERT INTO customers ...')         ← Insert into PostgreSQL
        → jwt.sign({ customer_id, email, name })          ← Generate JWT
      → Response: { token, customer }
  → Auth.setSession(token, customer)                      ← Save to localStorage
  → redirect to /index.html
```

### Flow 2: Customer Login

```
signin.html form → submit event
  → api.login({ email, password })
    → POST /api/auth/login
      → authController.login()
        → pool.query('SELECT * FROM customers WHERE email = $1')
        → bcrypt.compare(password, customer.password_hash)
        → jwt.sign(payload) → token
      → Response: { token, customer }
  → Auth.setSession(token, customer)
  → redirect to homepage or ?redirect= URL
```

### Flow 3: Product Search

```
search-input → Enter/click → /search.html?q=iPhone
  → api.searchProducts({ q: 'iPhone', page: 1, sort: '-rating' })
    → GET /api/products/search?q=iPhone
      → productController.searchProducts()
        → Product.find({ $text: { $search: 'iPhone' } })  ← MongoDB text search
        → Uses text index on (name, brand, description, tags)
        → Sort by text relevance score
      → Response: { products: [...], total: N }
  → buildProductCard() for each product → render grid
```

### Flow 4: Add to Cart

```
Product page → "Add to Cart" button click
  → CartManager.addToCart(productId)
    → Check Auth.isLoggedIn() — if not, redirect to signin
    → api.addToCart(productId, 1)
      → POST /api/cart { productId, quantity: 1 }
        → authenticateToken middleware → verify JWT
        → cartController.addToCart()
          → Product.findById(productId)                 ← Verify product exists (MongoDB)
          → cartStore.get(customerId) || []              ← In-memory Map
          → Push/increment item in cart array
          → cartStore.set(customerId, cart)
        → Response: { cartCount }
    → CartManager.updateBadge()                          ← Update badge number
    → showToast('Added to cart!', 'success')
```

### Flow 5: Complete Checkout (Order Placement)

```
checkout-review.html → "Place Order" button click
  → Collects: items (from cart), shippingAddress (sessionStorage), paymentMethod (sessionStorage)
  
  STEP 1: CREATE ORDER
  → api.createOrder({ items, shippingAddress, deliveryMethod })
    → POST /api/orders
      → orderController.createOrder()
        → BEGIN TRANSACTION (PostgreSQL)
        → Product.find({ _id: { $in: ids } })          ← Get real prices from MongoDB
        → SELECT * FROM inventory ... FOR UPDATE         ← Lock inventory rows (PostgreSQL)
        → Check stock ≥ requested quantity
        → Calculate: subtotal + shipping + tax = total   ← Backend price verification
        → INSERT INTO orders (...)                       ← Create order (PostgreSQL)
        → INSERT INTO order_items (...)                  ← Create line items (PostgreSQL)
        → INSERT INTO payments (..., 'pending')          ← Pending payment (PostgreSQL)
        → UPDATE inventory SET stock = stock - qty       ← Deduct stock (PostgreSQL)
        → COMMIT TRANSACTION
      → Response: { order: { order_id, items, total_amount } }

  STEP 2: SIMULATE PAYMENT
  → api.simulatePayment({ order_id, method: 'card', cardDetails })
    → POST /api/payments/simulate
      → paymentController.simulatePayment()
        → Verify order belongs to customer
        → paymentService.simulatePayment()              ← Check demo card number
        → UPDATE payments SET status='completed', reference='TN-...'
        → UPDATE orders SET status='processing'
      → Response: { success: true, reference: 'TN-ABC123-...' }

  → Save order to sessionStorage
  → redirect to /order-confirmation.html
```

### Flow 6: Inventory Deduction + Low-Stock Alert

```
When orderController.createOrder() runs:
  → UPDATE inventory SET stock_quantity = stock_quantity - 2 WHERE product_id = 'xyz'
    
    → PostgreSQL TRIGGER fires: trg_low_stock
      → Calls check_low_stock() function
        → IF new stock < threshold:
            → INSERT INTO low_stock_alerts (inventory_id, current_stock, threshold, 'active')
        → ELSE IF stock >= threshold:
            → UPDATE low_stock_alerts SET alert_status = 'resolved'
```

---

## 6. Implementation Status

### ✅ Fully Implemented
- Complete project folder structure (backend + frontend)
- Express server with 10 route groups
- MongoDB models (Category + Product) with text search indexes
- PostgreSQL schema (6 tables + triggers + indexes)
- JWT authentication (register, login, middleware)
- Password hashing with bcrypt (12 rounds)
- ACID transactions for order creation with row-level locking
- Simulated payment system (3 payment methods, demo cards)
- Low-stock alert trigger in PostgreSQL
- 52 product seed data across 8 categories
- 18 frontend HTML pages
- API client, auth state, cart/wishlist managers
- CSS design system with responsive layout

### ⚠️ Partially Implemented / Limitations
| Feature | Status | Detail |
|---------|--------|--------|
| Cart storage | In-memory Map | Cart data lost on server restart (not persisted to database) |
| Wishlist storage | In-memory Map | Same limitation as cart |
| Returns system | Console-only | `supportController.submitReturn()` logs to console, no DB table |
| Contact form | Console-only | `supportController.submitSupport()` logs to console, no DB table |
| Google Sign-In | Not implemented | Sign-in page has no Google OAuth integration |
| Invoice download | Not implemented | "Download Invoice" button on order-details has no backend endpoint |
| Coupon codes | Not implemented | No coupon/promo code backend logic |
| Product image upload | Not implemented | Products use external image URLs, no file upload |
| Order cancellation | Frontend UI only | No backend API to cancel orders |

### ❌ Not Yet Working (Blocked)
| Issue | Reason | Fix |
|-------|--------|-----|
| **MongoDB not connecting** | MongoDB is not installed on the system | Install MongoDB Community Server or use MongoDB Atlas |
| **PostgreSQL not connecting** | PostgreSQL is not installed or not in PATH | Install PostgreSQL or use a cloud service like Supabase |
| **Seed scripts cannot run** | Both databases unreachable | Install and start both database servers first |
| **Server cannot start** | `server.js` requires both DB connections to succeed | Fix database connections above |
| **`.env` password is placeholder** | `PG_PASSWORD=your_password` | Change to your actual PostgreSQL password |
