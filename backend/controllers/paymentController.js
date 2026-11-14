const { pool } = require('../config/postgresql');
const paymentService = require('../services/paymentService');

exports.simulatePayment = async (req, res) => {
  try {
    const { order_id, method, cardDetails } = req.body;
    if (!order_id || !method) return res.status(400).json({ success: false, message: 'Order ID and payment method required' });

    // Verify order belongs to customer
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE order_id = $1 AND customer_id = $2',
      [order_id, req.user.customer_id]
    );
    if (orderResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });
    const order = orderResult.rows[0];

    // Check if payment already exists
    const existingPayment = await pool.query('SELECT * FROM payments WHERE order_id = $1', [order_id]);
    if (existingPayment.rows.length > 0 && existingPayment.rows[0].payment_status === 'completed') {
      return res.status(400).json({ success: false, message: 'Order already paid' });
    }

    // Simulate payment
    const result = await paymentService.simulatePayment({ method, amount: order.total_amount, cardDetails });

    // Update or insert payment record
    if (existingPayment.rows.length > 0) {
      await pool.query(
        'UPDATE payments SET payment_status=$1, payment_reference=$2, payment_method=$3, payment_date=NOW() WHERE order_id=$4',
        [result.success ? 'completed' : 'failed', result.reference, method, order_id]
      );
    } else {
      await pool.query(
        'INSERT INTO payments (order_id, amount, payment_status, payment_method, payment_reference) VALUES ($1, $2, $3, $4, $5)',
        [order_id, order.total_amount, result.success ? 'completed' : 'failed', method, result.reference]
      );
    }

    // Update order status
    if (result.success) {
      await pool.query("UPDATE orders SET status = 'processing' WHERE order_id = $1", [order_id]);
    }

    res.json({ success: result.success, reference: result.reference, message: result.message, code: result.code });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ success: false, message: 'Payment processing failed' });
  }
};

exports.getPaymentByOrderId = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT p.*, o.customer_id FROM payments p JOIN orders o ON p.order_id = o.order_id WHERE p.order_id = $1',
      [req.params.orderId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (result.rows[0].customer_id !== req.user.customer_id) return res.status(403).json({ success: false, message: 'Access denied' });
    res.json({ success: true, payment: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get payment' });
  }
};
