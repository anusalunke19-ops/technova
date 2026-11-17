/**
 * TECHNOVA Cart Manager
 */

const CartManager = {
  CART_KEY: 'technova_cart_local',

  // Local cart for guest users
  getLocalCart() {
    try { return JSON.parse(localStorage.getItem(this.CART_KEY)) || []; } catch { return []; }
  },
  saveLocalCart(cart) { localStorage.setItem(this.CART_KEY, JSON.stringify(cart)); },

  async getCount() {
    if (!window.Auth.isLoggedIn()) {
      const cart = this.getLocalCart();
      return cart.reduce((s, i) => s + i.quantity, 0);
    }
    try {
      const data = await window.api.getCart();
      return data.items ? data.items.reduce((s, i) => s + i.quantity, 0) : 0;
    } catch { return 0; }
  },

  async updateBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = await this.getCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  },

  async addToCart(productId, quantity = 1) {
    if (!window.Auth.isLoggedIn()) {
      showToast('Please sign in to add items to cart', 'info');
      setTimeout(() => { window.location.href = '/signin.html'; }, 1500);
      return false;
    }
    try {
      await window.api.addToCart(productId, quantity);
      await this.updateBadge();
      showToast('Added to cart!', 'success');
      return true;
    } catch (err) {
      showToast(err.message || 'Failed to add to cart', 'error');
      return false;
    }
  },

  async removeFromCart(productId) {
    try {
      await window.api.removeFromCart(productId);
      await this.updateBadge();
      return true;
    } catch { return false; }
  }
};

window.CartManager = CartManager;

// ===== Toast Notification =====
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
window.showToast = showToast;

// ===== Star Rating Helper =====
function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let stars = '';
  for (let i = 0; i < 5; i++) {
    if (i < full) stars += '★';
    else if (i === full && half) stars += '½';
    else stars += '☆';
  }
  return stars;
}
window.renderStars = renderStars;

// ===== Discount Calculator =====
function calcDiscount(price, originalPrice) {
  if (!originalPrice || originalPrice <= price) return null;
  return Math.round((1 - price / originalPrice) * 100);
}
window.calcDiscount = calcDiscount;

// ===== Product Card Builder =====
function buildProductCard(product) {
  const discount = calcDiscount(product.price, product.original_price);
  const attrs = (product.attributes instanceof Map)
    ? Object.fromEntries(product.attributes)
    : (product.attributes || {});
  return `
    <div class="product-card">
      <div class="product-card-image">
        <img src="${product.images?.[0] || 'https://via.placeholder.com/400x400?text=No+Image'}" 
             alt="${product.name}" loading="lazy"
             onerror="this.src='https://via.placeholder.com/400x400?text=${encodeURIComponent(product.name)}'">
        <div class="product-card-badges">
          ${discount ? `<span class="product-badge-sale">-${discount}%</span>` : ''}
          ${product.is_featured ? '<span class="product-badge-new">Featured</span>' : ''}
        </div>
        <div class="product-card-actions">
          <a href="/wishlist.html" onclick="event.preventDefault(); WishlistManager.toggle('${product._id}', '${product.name}')" 
             class="product-card-action-btn" title="Add to Wishlist">♡</a>
          <a href="/compare.html?add=${product._id}" class="product-card-action-btn" title="Compare">⚖</a>
        </div>
      </div>
      <div class="product-card-body">
        <div class="product-card-brand">${product.brand}</div>
        <a href="/product.html?id=${product._id}" class="product-card-name">${product.name}</a>
        <div class="product-card-rating">
          <span class="stars">${renderStars(product.rating || 0)}</span>
          <span class="rating-count">(${(product.review_count || 0).toLocaleString()})</span>
        </div>
        <div class="product-card-price">
          <span class="price-current">$${product.price.toFixed(2)}</span>
          ${product.original_price > product.price ? `<span class="price-original">$${product.original_price.toFixed(2)}</span>` : ''}
          ${discount ? `<span class="price-discount">-${discount}%</span>` : ''}
        </div>
      </div>
      <div class="product-card-footer">
        <button class="btn-add-cart" onclick="CartManager.addToCart('${product._id}')">
          🛒 Add to Cart
        </button>
      </div>
    </div>
  `;
}
window.buildProductCard = buildProductCard;

// ===== Format Currency =====
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
window.formatCurrency = formatCurrency;

// ===== Format Date =====
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
window.formatDate = formatDate;

// ===== Wishlist Manager =====
const WishlistManager = {
  async toggle(productId, productName) {
    if (!window.Auth.isLoggedIn()) {
      showToast('Please sign in to use wishlist', 'info');
      return;
    }
    try {
      await window.api.addToWishlist(productId);
      showToast(`${productName} added to wishlist ♡`, 'success');
      await this.updateBadge();
    } catch (err) {
      showToast(err.message || 'Failed to update wishlist', 'error');
    }
  },

  async updateBadge() {
    const badge = document.getElementById('wishlist-badge');
    if (!badge || !window.Auth.isLoggedIn()) return;
    try {
      const data = await window.api.getWishlist();
      const count = data.items ? data.items.length : 0;
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    } catch {}
  }
};
window.WishlistManager = WishlistManager;
