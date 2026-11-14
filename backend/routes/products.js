const express = require('express');
const router = express.Router();
const {
  getProducts, getProductById, searchProducts,
  getProductsByCategory, getFeaturedProducts, compareProducts
} = require('../controllers/productController');

router.get('/', getProducts);
router.get('/search', searchProducts);
router.get('/featured', getFeaturedProducts);
router.get('/compare', compareProducts);
router.get('/category/:slug', getProductsByCategory);
router.get('/:id', getProductById);

module.exports = router;
