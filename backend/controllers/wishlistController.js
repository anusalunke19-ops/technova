const { findProductByIdOrSku, findProductsByIdsOrSkus } = require('../utils/productLookup');

// In-memory wishlist store
const wishlistStore = new Map();

exports.getWishlist = async (req, res) => {
  try {
    const customerId = String(req.user.customer_id);
    const wishlistItems = wishlistStore.get(customerId) || [];
    if (wishlistItems.length === 0) return res.json({ success: true, items: [] });
    const products = await findProductsByIdsOrSkus(wishlistItems);
    res.json({ success: true, items: products });
  } catch (error) {
    console.error('getWishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to get wishlist' });
  }
};

exports.addToWishlist = async (req, res) => {
  try {
    const customerId = String(req.user.customer_id);
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'Product ID required' });

    const product = await findProductByIdOrSku(productId);
    if (!product || !product.is_active) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const wishlist = wishlistStore.get(customerId) || [];
    const targetId = String(product.product_id || product._id);
    if (!wishlist.includes(targetId)) {
      wishlist.push(targetId);
      wishlistStore.set(customerId, wishlist);
    }
    res.json({ success: true, message: 'Added to wishlist', wishlistCount: wishlist.length });
  } catch (error) {
    console.error('addToWishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to add to wishlist' });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const customerId = String(req.user.customer_id);
    const { productId } = req.params;
    let wishlist = wishlistStore.get(customerId) || [];
    wishlist = wishlist.filter(id => String(id) !== String(productId));
    wishlistStore.set(customerId, wishlist);
    res.json({ success: true, message: 'Removed from wishlist', wishlistCount: wishlist.length });
  } catch (error) {
    console.error('removeFromWishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove from wishlist' });
  }
};
