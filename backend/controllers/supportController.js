const { pool } = require('../config/postgresql');

exports.submitReturn = async (req, res) => {
  try {
    const { order_id, reason, details, email } = req.body;
    if (!order_id || !reason) return res.status(400).json({ success: false, message: 'Order ID and reason required' });
    // Log to console for demo (academic project)
    console.log('Return Request:', { order_id, reason, details, email, timestamp: new Date() });
    res.json({ success: true, message: 'Return request submitted successfully. Our team will contact you within 2-3 business days.', reference: `RET-${Date.now()}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to submit return request' });
  }
};

exports.submitSupport = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!email || !message) return res.status(400).json({ success: false, message: 'Email and message required' });
    console.log('Support Request:', { name, email, subject, message, timestamp: new Date() });
    res.json({ success: true, message: 'Your message has been received. We will respond within 24 hours.', reference: `SUP-${Date.now()}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to submit support request' });
  }
};

exports.trackOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await pool.query(
      'SELECT o.order_id, o.status, o.order_date, o.total_amount, p.payment_status FROM orders o LEFT JOIN payments p ON o.order_id = p.order_id WHERE o.order_id = $1',
      [orderId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to track order' });
  }
};
