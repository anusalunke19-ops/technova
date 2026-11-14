const express = require('express');
const router = express.Router();
const { getCart, addToCart, updateCartItem, removeFromCart, clearCart } = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, getCart);
router.post('/', authenticateToken, addToCart);
router.put('/:productId', authenticateToken, updateCartItem);
router.delete('/:productId', authenticateToken, removeFromCart);
router.delete('/', authenticateToken, clearCart);

module.exports = router;
