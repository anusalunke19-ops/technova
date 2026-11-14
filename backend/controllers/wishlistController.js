const Product = require('../models/mongo/Product');

// In-memory wishlist store
const wishlistStore = new Map();

exports.getWishlist = async (req, res) => {
  try {
    const customerId = String(req.user.customer_id);
    const wishlistItems = wishlistStore.get(customerId) || [];
    if (wishlistItems.length === 0) return res.json({ success: true, items: [] });
    const products = await Product.find({ _id: { $in: wishlistItems }, is_active: true });
    res.json({ success: true, items: products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get wishlist' });
  }
};

exports.addToWishlist = async (req, res) => {
  try {
    const customerId = String(req.user.customer_id);
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'Product ID required' });
    const product = await Product.findById(productId);
    if (!product || !product.is_active) return res.status(404).json({ success: false, message: 'Product not found' });
    const wishlist = wishlistStore.get(customerId) || [];
    if (!wishlist.includes(productId)) {
      wishlist.push(productId);
      wishlistStore.set(customerId, wishlist);
    }
    res.json({ success: true, message: 'Added to wishlist', wishlistCount: wishlist.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add to wishlist' });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const customerId = String(req.user.customer_id);
    const { productId } = req.params;
    let wishlist = wishlistStore.get(customerId) || [];
    wishlist = wishlist.filter(id => id !== productId);
    wishlistStore.set(customerId, wishlist);
    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove from wishlist' });
  }
};
