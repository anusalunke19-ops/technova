const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, changePassword } = require('../controllers/customerController');
const { authenticateToken } = require('../middleware/auth');

router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/password', authenticateToken, changePassword);

module.exports = router;
