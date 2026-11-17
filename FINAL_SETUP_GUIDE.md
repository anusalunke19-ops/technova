# TECHNOVA — Final Setup & Operational Guide

This document provides clear, step-by-step instructions for installing dependencies, configuring environment variables, launching the application, executing tests, and testing Razorpay payment workflows.

---

## 1. System Requirements & Dependencies

- **Node.js**: v18.0.0 or higher (v24.14.0 tested and verified)
- **Package Manager**: npm (v10+ included with Node)
- **Operating System**: Windows, macOS, or Linux
- **Optional External Databases**:
  - PostgreSQL v14+ (default port: 5432)
  - MongoDB v6+ (default port: 27017)
  *(Note: If external database services are not running, the application automatically initializes its resilient in-process SQL database and catalogue engine).*

---

## 2. Environment Variables Configuration

Create or update `backend/.env` with the following variables:

```env
# Application Server
PORT=5000
NODE_ENV=development

# MongoDB Connection (Optional if using built-in cache)
MONGODB_URI=mongodb://localhost:27017/technova

# PostgreSQL Connection (Optional if using built-in SQL engine)
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=technova
PG_USER=postgres
PG_PASSWORD=your_password

# Authentication
JWT_SECRET=technova_secure_jwt_secret_key_2026
JWT_EXPIRES_IN=7d

# Frontend CORS URL
FRONTEND_URL=http://localhost:5000

# Razorpay Payment Gateway Credentials
# TEST MODE: use rzp_test_... credentials
# LIVE MODE: use rzp_live_... credentials
RAZORPAY_KEY_ID=rzp_test_placeholder_key_id
RAZORPAY_KEY_SECRET=placeholder_key_secret
RAZORPAY_WEBHOOK_SECRET=technova_webhook_secret_key_2026
RAZORPAY_CURRENCY=INR
RAZORPAY_MODE=test
```

> [!IMPORTANT]
> Never commit actual `RAZORPAY_KEY_SECRET` or `JWT_SECRET` values to public version control repositories.

---

## 3. Project Startup Commands

### Step 1: Install Dependencies
Open a terminal in the project root and navigate to the `backend` folder:
```bash
cd backend
npm install
```

### Step 2: Start the Web Server
```bash
cd backend
node server.js
```
The server will boot and display:
```text
======================================================
🚀 TECHNOVA E-Commerce Server running on http://localhost:5000
💳 Razorpay Integration: Active in test mode
📦 320 Products Loaded across 8 Technology Categories
🌐 Open http://localhost:5000 in your web browser
======================================================
```

### Step 3: Open in Browser
Open your browser and navigate to:
- **Homepage**: [http://localhost:5000](http://localhost:5000)
- **Shop Catalogue**: [http://localhost:5000/shop.html](http://localhost:5000/shop.html)
- **Category Browsing**: [http://localhost:5000/category.html?slug=smartphones](http://localhost:5000/category.html?slug=smartphones)
- **Cart**: [http://localhost:5000/cart.html](http://localhost:5000/cart.html)
- **Sign In**: [http://localhost:5000/signin.html](http://localhost:5000/signin.html)

---

## 4. Default Demo Accounts

You can log in immediately using the pre-seeded demo user:
- **Email**: `alex@example.com`
- **Password**: `Password123!`

Or create a new account directly on the registration page at [http://localhost:5000/register.html](http://localhost:5000/register.html).

---

## 5. Product Catalogue Import Routines

To re-generate or re-import the 320-product catalogue from Excel/CSV:

```bash
# Generate fresh Excel and CSV spreadsheets
cd backend
npm run catalogue:generate

# Import products into MongoDB and sync PostgreSQL inventory
npm run catalogue:import
```

---

## 6. How to Test Razorpay Payments

1. Log into your account at [http://localhost:5000/signin.html](http://localhost:5000/signin.html).
2. Browse products at [http://localhost:5000/shop.html](http://localhost:5000/shop.html) and click **"Add to Cart"**.
3. Open your Cart, review line items, and click **"Proceed to Checkout"**.
4. Complete the shipping address details in `checkout-shipping.html` and click **"Continue to Payment"**.
5. Select **Razorpay** as the payment method in `checkout-payment.html` and click **"Review Order"**.
6. On `checkout-review.html`, click **"Pay Now"**:
   - The official Razorpay Checkout modal appears.
   - In test mode, complete with test credentials.
   - The backend validates the HMAC-SHA256 signature and updates the order status to `processing`.
   - You are redirected to `order-confirmation.html` showing your receipt and payment reference.

---

## 7. Running the Automated Test Suite

To run the verified 20-step customer journey test and security audit:

```bash
# Run 20-step complete shopping journey & failure tests
cd backend
node test_customer_journey.js

# Run security, credential isolation, and SQL injection audits
node test_database_security_audit.js
```
