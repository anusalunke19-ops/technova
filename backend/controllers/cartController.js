const { findProductByIdOrSku, findProductsByIdsOrSkus } = require('../utils/productLookup');

// In-memory cart store: { customerId: [{ productId, quantity }] }
const cartStore = new Map();

exports.getCart = async (req, res) => {
  try {
    const customerId = String(req.user.customer_id);
    const cartItems = cartStore.get(customerId) || [];
    if (cartItems.length === 0) return res.json({ success: true, items: [], total: 0 });

    const productIds = cartItems.map(i => i.productId);
    const products = await findProductsByIdsOrSkus(productIds);
    const productMap = new Map();
    products.forEach(p => {
      productMap.set(String(p._id), p);
      if (p.product_id) productMap.set(String(p.product_id), p);
    });

    const items = cartItems.map(item => {
      const product = productMap.get(String(item.productId));
      if (!product) return null;
      return {
        productId: item.productId,
        quantity: item.quantity,
        product: {
          _id: product._id,
          product_id: product.product_id,
          name: product.name,
          brand: product.brand,
          price: product.price,
          images: product.images,
          category_slug: product.category_slug,
        },
      };
    }).filter(Boolean);

    const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    res.json({ success: true, items, total: parseFloat(total.toFixed(2)) });
  } catch (error) {
    console.error('getCart error:', error);
    res.status(500).json({ success: false, message: 'Failed to get cart' });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const customerId = String(req.user.customer_id);
    const { productId, quantity = 1 } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'Product ID required' });

    const product = await findProductByIdOrSku(productId);
    if (!product || !product.is_active) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const cart = cartStore.get(customerId) || [];
    const existingIndex = cart.findIndex(i => String(i.productId) === String(productId));
    const qtyToAdd = Math.max(1, parseInt(quantity) || 1);

    if (existingIndex >= 0) {
      cart[existingIndex].quantity += qtyToAdd;
    } else {
      cart.push({ productId: String(product.product_id || product._id), quantity: qtyToAdd });
    }
    cartStore.set(customerId, cart);

    res.json({
      success: true,
      message: 'Added to cart',
      cartCount: cart.reduce((s, i) => s + i.quantity, 0),
    });
  } catch (error) {
    console.error('addToCart error:', error);
    res.status(500).json({ success: false, message: 'Failed to add to cart' });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const customerId = String(req.user.customer_id);
    const { productId } = req.params;
    const { quantity } = req.body;
    const cart = cartStore.get(customerId) || [];
    const index = cart.findIndex(i => String(i.productId) === String(productId));
    if (index === -1) return res.status(404).json({ success: false, message: 'Item not in cart' });

    const newQty = parseInt(quantity);
    if (isNaN(newQty) || newQty <= 0) {
      cart.splice(index, 1);
    } else {
      cart[index].quantity = newQty;
    }
    cartStore.set(customerId, cart);
    res.json({ success: true, message: 'Cart updated', cartCount: cart.reduce((s, i) => s + i.quantity, 0) });
  } catch (error) {
    console.error('updateCartItem error:', error);
    res.status(500).json({ success: false, message: 'Failed to update cart' });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const customerId = String(req.user.customer_id);
    const { productId } = req.params;
    let cart = cartStore.get(customerId) || [];
    cart = cart.filter(i => String(i.productId) !== String(productId));
    cartStore.set(customerId, cart);
    res.json({ success: true, message: 'Item removed from cart', cartCount: cart.reduce((s, i) => s + i.quantity, 0) });
  } catch (error) {
    console.error('removeFromCart error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove from cart' });
  }
};

exports.clearCart = async (req, res) => {
  try {
    const customerId = String(req.user.customer_id);
    cartStore.delete(customerId);
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('clearCart error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
};

exports.cartStore = cartStore;
