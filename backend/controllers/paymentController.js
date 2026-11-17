const crypto = require('crypto');
const { pool } = require('../config/postgresql');
const razorpayConfig = require('../config/razorpay');
const paymentService = require('../services/paymentService');

/**
 * GET /api/payments/config
 * Returns public Razorpay configuration for checkout client
 */
exports.getPaymentConfig = async (req, res) => {
  try {
    res.json({
      success: true,
      key_id: razorpayConfig.getKeyId(),
      currency: razorpayConfig.getCurrency(),
      mode: razorpayConfig.getMode(),
      isConfigured: razorpayConfig.isConfigured,
    });
  } catch (error) {
    console.error('Error fetching payment config:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve payment configuration' });
  }
};

/**
 * POST /api/payments/razorpay/create-order
 * Creates a Razorpay order for an existing pending database order
 */
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    // 1. Fetch order from PostgreSQL
    let order = { order_id, total_amount: 199.99, status: 'pending' };
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE order_id = $1 AND customer_id = $2',
      [order_id, req.user.customer_id]
    );
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    order = orderResult.rows[0];

    // Check if order is already paid
    if (order.status !== 'pending' && order.status !== 'processing') {
      return res.status(400).json({
        success: false,
        message: `Order cannot be paid. Current status: ${order.status}`,
      });
    }

    // Amount in subunits (e.g., paise for INR: 100 paise = 1 INR)
    const amountInSubunits = Math.round(parseFloat(order.total_amount) * 100);
    const currency = razorpayConfig.getCurrency();

    let razorpayOrder;

    if (razorpayConfig.isConfigured && razorpayConfig.razorpay) {
      // Create order via official Razorpay SDK
      razorpayOrder = await razorpayConfig.razorpay.orders.create({
        amount: amountInSubunits,
        currency,
        receipt: `rcpt_${order.order_id}_${Date.now().toString(36)}`,
        notes: {
          order_id: String(order.order_id),
          customer_id: String(req.user.customer_id),
          customer_email: req.user.email,
        },
      });
    } else {
      // Standard official test-mode order identifier
      razorpayOrder = {
        id: `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        entity: 'order',
        amount: amountInSubunits,
        amount_paid: 0,
        amount_due: amountInSubunits,
        currency,
        receipt: `rcpt_${order.order_id}`,
        status: 'created',
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    // Update or insert payment record with razorpay_order_id in PostgreSQL
    const existingPayment = await pool.query('SELECT payment_id FROM payments WHERE order_id = $1', [order.order_id]);
    if (existingPayment.rows.length > 0) {
      await pool.query(
        `UPDATE payments SET
           razorpay_order_id = $1,
           payment_method = 'razorpay',
           amount = $2,
           currency = $3,
           updated_at = CURRENT_TIMESTAMP
         WHERE order_id = $4`,
        [razorpayOrder.id, order.total_amount, currency, order.order_id]
      );
    } else {
      await pool.query(
        `INSERT INTO payments (order_id, amount, currency, payment_status, payment_method, razorpay_order_id, created_at, updated_at)
         VALUES ($1, $2, $3, 'pending', 'razorpay', $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [order.order_id, order.total_amount, currency, razorpayOrder.id]
      );
    }

    // Fetch customer profile to prefill in Razorpay Checkout modal
    let customer = {};
    const customerResult = await pool.query(
      'SELECT name, email, phone FROM customers WHERE customer_id = $1',
      [req.user.customer_id]
    );
    customer = customerResult.rows[0] || {};

    res.json({
      success: true,
      order_id: order.order_id,
      razorpay_order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: razorpayConfig.getKeyId(),
      prefill: {
        name: customer.name || req.user.name,
        email: customer.email || req.user.email,
        contact: customer.phone || '',
      },
      notes: {
        order_id: order.order_id,
      },
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({
      success: false,
      message: error.error?.description || error.message || 'Failed to initialize Razorpay order',
    });
  }
};

/**
 * POST /api/payments/razorpay/verify
 * Verifies Razorpay HMAC SHA-256 signature and confirms order
 * Idempotent: safe against duplicate calls
 */
exports.verifyRazorpayPayment = async (req, res) => {
  let client;
  try {
    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification parameters',
      });
    }

    client = await pool.connect();

    // 1. Check existing payment status for idempotency
    const paymentCheck = await client.query(
      'SELECT * FROM payments WHERE order_id = $1',
      [order_id]
    );

    if (paymentCheck.rows.length > 0) {
      const current = paymentCheck.rows[0];
      if (current.payment_status === 'completed' || current.payment_status === 'paid') {
        // Already processed successfully! Return success idempotently
        return res.json({
          success: true,
          message: 'Payment already verified and confirmed',
          order_id,
          payment_id: current.razorpay_payment_id,
          status: 'completed',
        });
      }
    }

    // 2. Cryptographic HMAC SHA-256 Signature verification
    let isSignatureValid = false;
    try {
      isSignatureValid = razorpayConfig.verifyPaymentSignature({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });
    } catch (err) {
      console.error('Signature verification error:', err.message);
      isSignatureValid = false;
    }

    if (!isSignatureValid) {
      // Signature mismatch - mark as failed in PostgreSQL
      await client.query(
        `UPDATE payments SET 
          payment_status = 'failed',
          razorpay_payment_id = $1,
          razorpay_signature = $2,
          updated_at = CURRENT_TIMESTAMP
         WHERE order_id = $3`,
        [razorpay_payment_id, razorpay_signature, order_id]
      );

      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Payment verification failed.',
        code: 'INVALID_SIGNATURE',
      });
    }

    // 3. Atomically update payment and order in a PostgreSQL transaction
    await client.query('BEGIN');

    // Update payment record in PostgreSQL
    await client.query(
      `UPDATE payments SET
        payment_status = 'completed',
        razorpay_order_id = $1,
        razorpay_payment_id = $2,
        razorpay_signature = $3,
        payment_reference = $2,
        payment_method = 'razorpay',
        updated_at = CURRENT_TIMESTAMP
       WHERE order_id = $4`,
      [razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id]
    );

    // Update order status to 'processing' in PostgreSQL
    await client.query(
      `UPDATE orders SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE order_id = $1`,
      [order_id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Payment verified and order confirmed successfully',
      order_id,
      payment_id: razorpay_payment_id,
      razorpay_order_id,
      status: 'completed',
    });
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch {}
    }
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal error during payment verification',
    });
  } finally {
    if (client) client.release();
  }
};

/**
 * POST /api/payments/razorpay/cancel
 * Handles cancelled checkout or payment failure by customer
 * Releases reserved inventory back to stock
 */
exports.cancelRazorpayPayment = async (req, res) => {
  let client;
  try {
    const { order_id, reason } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // Fetch order and status
    const orderResult = await client.query(
      'SELECT * FROM orders WHERE order_id = $1 AND customer_id = $2',
      [order_id, req.user.customer_id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Only cancel if order is pending
    if (order.status === 'pending') {
      // 1. Fetch order items to release inventory
      const itemsResult = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [order_id]
      );

      for (const item of itemsResult.rows) {
        const curInv = await client.query(
          'SELECT stock_quantity FROM inventory WHERE product_id = $1',
          [item.product_id]
        );
        if (curInv.rows.length > 0) {
          const restored = curInv.rows[0].stock_quantity + parseInt(item.quantity);
          await client.query(
            'UPDATE inventory SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2',
            [restored, item.product_id]
          );
        }
      }

      // 2. Update order and payment status
      await client.query(
        `UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE order_id = $1`,
        [order_id]
      );

      await client.query(
        `UPDATE payments SET payment_status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE order_id = $1`,
        [order_id]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Payment was cancelled and inventory restored',
      order_id,
    });
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch {}
    }
    console.error('Cancel payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel payment' });
  } finally {
    if (client) client.release();
  }
};

/**
 * POST /api/payments/webhook
 * Razorpay Webhook listener for asynchronous events
 */
exports.handleRazorpayWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    return res.status(400).json({ success: false, message: 'Missing webhook signature' });
  }

  try {
    let isValid = false;
    if (razorpayConfig.isConfigured) {
      isValid = razorpayConfig.verifyWebhookSignature(req.rawBody, signature);
    } else {
      isValid = true; // test fallback
    }

    if (!isValid) {
      console.warn('⚠️ Webhook signature mismatch');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`🔔 Razorpay Webhook Event Received: ${event}`);

    const client = await pool.connect();
    try {
      if (event === 'payment.captured' || event === 'order.paid') {
        const paymentEntity = payload.payment?.entity;
        const razorpay_order_id = paymentEntity?.order_id || payload.order?.entity?.id;
        const razorpay_payment_id = paymentEntity?.id;

        if (razorpay_order_id) {
          await client.query('BEGIN');

          const pResult = await client.query(
            'SELECT order_id, payment_status FROM payments WHERE razorpay_order_id = $1',
            [razorpay_order_id]
          );

          if (pResult.rows.length > 0) {
            const current = pResult.rows[0];
            if (current.payment_status !== 'completed' && current.payment_status !== 'paid') {
              await client.query(
                `UPDATE payments SET
                  payment_status = 'completed',
                  razorpay_payment_id = COALESCE($1, razorpay_payment_id),
                  payment_reference = COALESCE($1, payment_reference),
                  updated_at = CURRENT_TIMESTAMP
                 WHERE razorpay_order_id = $2`,
                [razorpay_payment_id, razorpay_order_id]
              );

              await client.query(
                `UPDATE orders SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE order_id = $1`,
                [current.order_id]
              );
            }
          }

          await client.query('COMMIT');
        }
      } else if (event === 'payment.failed') {
        const paymentEntity = payload.payment?.entity;
        const razorpay_order_id = paymentEntity?.order_id;

        if (razorpay_order_id) {
          await client.query(
            `UPDATE payments SET payment_status = 'failed', updated_at = CURRENT_TIMESTAMP 
             WHERE razorpay_order_id = $1 AND payment_status = 'pending'`,
            [razorpay_order_id]
          );
        }
      }
    } finally {
      client.release();
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing error' });
  }
};

/**
 * GET /api/payments/:orderId
 * Retrieves payment record for an order
 */
exports.getPaymentByOrderId = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, o.customer_id 
       FROM payments p 
       JOIN orders o ON p.order_id = o.order_id 
       WHERE p.order_id = $1`,
      [req.params.orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    if (result.rows[0].customer_id !== req.user.customer_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, payment: result.rows[0] });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve payment record' });
  }
};

/**
 * POST /api/payments/simulate
 */
exports.simulatePayment = async (req, res) => {
  try {
    const { order_id, method, cardDetails } = req.body;
    if (!order_id || !method) {
      return res.status(400).json({ success: false, message: 'Order ID and payment method required' });
    }

    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE order_id = $1 AND customer_id = $2',
      [order_id, req.user.customer_id]
    );
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const order = orderResult.rows[0];

    const existingPayment = await pool.query('SELECT * FROM payments WHERE order_id = $1', [order_id]);
    if (existingPayment.rows.length > 0 && existingPayment.rows[0].payment_status === 'completed') {
      return res.status(400).json({ success: false, message: 'Order already paid' });
    }

    const result = await paymentService.simulatePayment({ method, amount: order.total_amount, cardDetails });

    if (existingPayment.rows.length > 0) {
      await pool.query(
        'UPDATE payments SET payment_status=$1, payment_reference=$2, payment_method=$3, updated_at=CURRENT_TIMESTAMP WHERE order_id=$4',
        [result.success ? 'completed' : 'failed', result.reference, method, order_id]
      );
    } else {
      await pool.query(
        'INSERT INTO payments (order_id, amount, payment_status, payment_method, payment_reference) VALUES ($1, $2, $3, $4, $5)',
        [order_id, order.total_amount, result.success ? 'completed' : 'failed', method, result.reference]
      );
    }

    if (result.success) {
      await pool.query("UPDATE orders SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE order_id = $1", [order_id]);
    }

    res.json({ success: result.success, reference: result.reference, message: result.message, code: result.code });
  } catch (error) {
    console.error('Simulate payment error:', error);
    res.status(500).json({ success: false, message: 'Payment processing failed' });
  }
};
