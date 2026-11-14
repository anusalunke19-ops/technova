const express = require('express');
const router = express.Router();
const { getInventory, getInventoryByProductId, updateInventory, getLowStockAlerts } = require('../controllers/inventoryController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', getInventory);
router.get('/alerts', authenticateToken, getLowStockAlerts);
router.get('/:productId', getInventoryByProductId);
router.put('/:productId', authenticateToken, updateInventory);

module.exports = router;
