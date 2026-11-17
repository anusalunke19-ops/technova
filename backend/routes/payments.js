const express = require('express');
const router = express.Router();
const {
  getPaymentConfig,
  createRazorpayOrder,
  verifyRazorpayPayment,
  cancelRazorpayPayment,
  handleRazorpayWebhook,
  getPaymentByOrderId,
  simulatePayment,
} = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');

// Public config route for checkout client
router.get('/config', getPaymentConfig);

// Razorpay routes (Protected)
router.post('/razorpay/create-order', authenticateToken, createRazorpayOrder);
router.post('/razorpay/verify', authenticateToken, verifyRazorpayPayment);
router.post('/razorpay/cancel', authenticateToken, cancelRazorpayPayment);

// Razorpay Webhook (Public, signature-verified via x-razorpay-signature)
router.post('/webhook', handleRazorpayWebhook);

// Order payment status (Protected)
router.get('/:orderId', authenticateToken, getPaymentByOrderId);

// Fallback demo simulation
router.post('/simulate', authenticateToken, simulatePayment);

module.exports = router;
