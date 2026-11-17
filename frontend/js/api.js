/**
 * TECHNOVA API Client
 * Centralized fetch wrapper for all backend API calls
 */

const API_BASE = (typeof window !== 'undefined' && window.location.port === '5000')
  ? `${window.location.origin}/api`
  : 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE;
  }

  getToken() {
    return localStorage.getItem('technova_token');
  }

  getHeaders(includeAuth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (includeAuth) {
      const token = this.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request(method, endpoint, body = null, auth = true) {
    const options = {
      method,
      headers: this.getHeaders(auth),
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${this.baseUrl}${endpoint}`, options);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // If unauthorized on a protected endpoint, clear stale token
      if ((res.status === 401 || res.status === 403) && auth) {
        if (typeof window !== 'undefined' && window.Auth) {
          window.Auth.clearSession();
        }
      }
      throw new Error(data.message || `HTTP ${res.status}`);
    }
    return data;
  }

  get(endpoint, auth = false) { return this.request('GET', endpoint, null, auth); }
  post(endpoint, body, auth = true) { return this.request('POST', endpoint, body, auth); }
  put(endpoint, body, auth = true) { return this.request('PUT', endpoint, body, auth); }
  delete(endpoint, auth = true) { return this.request('DELETE', endpoint, null, auth); }

  // ===== Auth =====
  register(data) { return this.post('/auth/register', data, false); }
  login(data) { return this.post('/auth/login', data, false); }
  logout() { return this.post('/auth/logout', {}, true); }
  getMe() { return this.get('/auth/me', true); }

  // ===== Products =====
  getProducts(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/products${q ? '?' + q : ''}`);
  }
  getProduct(id) { return this.get(`/products/${id}`); }
  getFeaturedProducts() { return this.get('/products/featured'); }
  searchProducts(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/products/search?${q}`);
  }
  getProductsByCategory(slug, params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/products/category/${slug}${q ? '?' + q : ''}`);
  }
  compareProducts(ids) { return this.get(`/products/compare?ids=${ids.join(',')}`); }

  // ===== Categories =====
  getCategories() { return this.get('/categories'); }
  getCategory(slug) { return this.get(`/categories/${slug}`); }

  // ===== Cart =====
  getCart() { return this.get('/cart', true); }
  addToCart(productId, quantity = 1) { return this.post('/cart', { productId, quantity }); }
  updateCartItem(productId, quantity) { return this.put(`/cart/${productId}`, { quantity }); }
  removeFromCart(productId) { return this.delete(`/cart/${productId}`); }
  clearCart() { return this.delete('/cart'); }

  // ===== Wishlist =====
  getWishlist() { return this.get('/wishlist', true); }
  addToWishlist(productId) { return this.post('/wishlist', { productId }); }
  removeFromWishlist(productId) { return this.delete(`/wishlist/${productId}`); }

  // ===== Orders =====
  createOrder(data) { return this.post('/orders', data); }
  getMyOrders(status = '') { return this.get(`/orders${status ? '?status=' + status : ''}`, true); }
  getOrder(id) { return this.get(`/orders/${id}`, true); }

  // ===== Payments =====
  getPaymentConfig() { return this.get('/payments/config', false); }
  createRazorpayOrder(data) { return this.post('/payments/razorpay/create-order', data, true); }
  verifyRazorpayPayment(data) { return this.post('/payments/razorpay/verify', data, true); }
  cancelRazorpayPayment(data) { return this.post('/payments/razorpay/cancel', data, true); }
  simulatePayment(data) { return this.post('/payments/simulate', data, true); }
  getPayment(orderId) { return this.get(`/payments/${orderId}`, true); }

  // ===== Customers =====
  getProfile() { return this.get('/customers/profile', true); }
  updateProfile(data) { return this.put('/customers/profile', data); }
  changePassword(data) { return this.put('/customers/password', data); }

  // ===== Inventory =====
  getInventory(productId) { return this.get(`/inventory/${productId}`); }

  // ===== Support =====
  submitReturn(data) { return this.post('/support/returns', data); }
  submitSupport(data) { return this.post('/support/contact', data); }
  trackOrder(orderId) { return this.get(`/support/track/${orderId}`); }
}

window.api = new ApiClient();
