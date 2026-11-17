# TECHNOVA — Real Razorpay Payment Gateway Integration Guide

This document details the complete end-to-end integration of the **Razorpay Payment Gateway** into the TECHNOVA Hybrid E-Commerce platform.

---

## 1. Architecture & Security Overview

TECHNOVA utilizes a hybrid architecture where the relational transactional data (customers, orders, inventory, payments) lives in **PostgreSQL**, while the rich product catalogue lives in **MongoDB**.

### Security Core Principles:
1. **Server-Side Order Creation**: Amounts are NEVER trusted from the frontend. The backend validates prices from the database, checks inventory, calculates the total payable amount in paise (1 INR = 100 paise), and requests an official `order_id` from Razorpay's API.
2. **HMAC-SHA256 Signature Verification**: All client-side checkout submissions are verified on the backend using the secret key and the cryptographic digest:
   ```
   generated_signature = HMAC-SHA256(order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)
   ```
3. **Webhook Verification**: Asynchronous webhook events from Razorpay are verified using `req.rawBody` and the configured `RAZORPAY_WEBHOOK_SECRET` before updating transaction states.
4. **Credential Isolation**: Only the public `RAZORPAY_KEY_ID` is ever served to the frontend (via `GET /api/payments/config`). The `RAZORPAY_KEY_SECRET` is kept strictly within backend environment variables.
5. **No Card Data Storage**: No credit card, debit card, or CVV numbers are handled or saved on our servers. Razorpay's PCI-DSS compliant checkout modal handles the card details directly.

---

## 2. Configuration & Environment Variables

The backend configuration is managed in `backend/.env`.

```env
# Razorpay Credentials
RAZORPAY_KEY_ID=rzp_test_placeholder_key
RAZORPAY_KEY_SECRET=rzp_test_placeholder_secret
RAZORPAY_WEBHOOK_SECRET=technova_webhook_secret_key_2026
RAZORPAY_CURRENCY=INR
RAZORPAY_MODE=test
```

### Switching between Test Mode and Live Mode:
- **Test Mode**: Set `RAZORPAY_MODE=test`, provide test key credentials (`rzp_test_...`), and use Razorpay test cards/UPI handles.
- **Live Mode**: Set `RAZORPAY_MODE=live` and provide production merchant credentials (`rzp_live_...`). No code changes required!

---

## 3. Database Schema Updates (PostgreSQL)

The `payments` table and `orders` table in PostgreSQL were updated to track Razorpay identifiers and timestamps:

```sql
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON payments(razorpay_payment_id);
```

---

## 4. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/payments/config` | Returns `{ key_id, currency, mode }` to initialize Razorpay Checkout. |
| `POST` | `/api/payments/razorpay/create-order` | Server-calculated total, inventory lock, and Razorpay order generation. |
| `POST` | `/api/payments/razorpay/verify` | Verifies cryptographic signature, updates order to `'processing'`, payment to `'completed'`. |
| `POST` | `/api/payments/razorpay/cancel` | Handles checkout modal cancellation/dismissal, unlocks reserved stock. |
| `POST` | `/api/payments/webhook` | Listens to `payment.captured`, `payment.failed`, `order.paid` with signature verification. |
| `GET` | `/api/payments/:orderId` | Retrieves payment records and receipt data for a given order. |
| `POST` | `/api/payments/simulate` | Test helper for automated tests. |

---

## 5. Checkout Modal Flow (Frontend)

1. Customer proceeds from Cart → Shipping Address → Payment Page (`checkout-payment.html`).
2. When Razorpay is selected and "Proceed to Review" is clicked, user arrives at `checkout-review.html`.
3. Clicking **"Pay Now"**:
   - Calls `POST /api/orders` to create a pending order.
   - Calls `POST /api/payments/razorpay/create-order` to generate a Razorpay order.
   - Dynamically loads `https://checkout.razorpay.com/v1/checkout.js`.
   - Opens the Razorpay modal with prefilled customer details (name, email, phone).
4. If payment succeeds in modal:
   - Handler sends `{ order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature }` to `POST /api/payments/razorpay/verify`.
   - On success, cart is cleared and user is redirected to `order-confirmation.html?orderId=...`.
5. If modal is closed or cancelled:
   - `modal.ondismiss` fires and calls `POST /api/payments/razorpay/cancel`.
   - Stock is restored and customer is notified with an option to retry without re-entering checkout details.
