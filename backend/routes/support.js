const express = require('express');
const router = express.Router();
const { submitReturn, submitSupport, trackOrder } = require('../controllers/supportController');
const { optionalAuth } = require('../middleware/auth');

router.post('/returns', optionalAuth, submitReturn);
router.post('/contact', optionalAuth, submitSupport);
router.get('/track/:orderId', trackOrder);

module.exports = router;
