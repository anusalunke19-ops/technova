const express = require('express');
const router = express.Router();
const { simulatePayment, getPaymentByOrderId } = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');

router.post('/simulate', authenticateToken, simulatePayment);
router.get('/:orderId', authenticateToken, getPaymentByOrderId);

module.exports = router;
