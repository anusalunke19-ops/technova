/**
 * TECHNOVA Shared Header/Footer Injector
 * Renders common header + category nav + footer on all pages
 */

function getHeaderHTML(pageTitle = '') {
  return `
  <div class="announcement-bar">
    🎉 Free shipping on orders over $100! <a href="/shop.html">Shop Now →</a>
  </div>
  <header class="header">
    <div class="container header-inner">
      <a href="/index.html" class="header-logo">
        <div class="logo-mark">T</div>
        <span class="logo-text">TECH<span>NOVA</span></span>
      </a>
      <div class="search-bar">
        <div class="search-input-wrap">
          <input type="text" id="search-input" class="search-input" placeholder="Search phones, laptops, headphones..." autocomplete="off">
          <button class="search-btn" id="search-btn">🔍 Search</button>
        </div>
      </div>
      <div class="header-actions">
        <a href="/account-profile.html" id="account-btn" class="header-action-btn" title="My Account">
          <span>👤</span><span class="action-label" id="account-label">Account</span>
        </a>
        <a href="/wishlist.html" class="header-action-btn" title="Wishlist">
          <span>♡</span><span class="action-label">Wishlist</span>
          <span class="action-badge" id="wishlist-badge" style="display:none">0</span>
        </a>
        <a href="/cart.html" class="header-action-btn" title="Shopping Cart">
          <span>🛒</span><span class="action-label">Cart</span>
          <span class="action-badge" id="cart-badge" style="display:none">0</span>
        </a>
        <a href="/signin.html" id="logout-btn" class="header-action-btn" style="display:none" title="Sign Out">
          <span>🚪</span><span class="action-label">Logout</span>
        </a>
      </div>
    </div>
  </header>
  <nav class="category-nav">
    <div class="container">
      <div class="category-nav-inner">
        <a href="/shop.html" class="cat-nav-link" data-page="shop"><span class="cat-nav-icon">🏪</span>All Products</a>
        <a href="/category.html?slug=smartphones" class="cat-nav-link" data-page="smartphones"><span class="cat-nav-icon">📱</span>Smartphones</a>
        <a href="/category.html?slug=laptops" class="cat-nav-link" data-page="laptops"><span class="cat-nav-icon">💻</span>Laptops</a>
        <a href="/category.html?slug=tablets" class="cat-nav-link" data-page="tablets"><span class="cat-nav-icon">📟</span>Tablets</a>
        <a href="/category.html?slug=headphones-earbuds" class="cat-nav-link" data-page="headphones-earbuds"><span class="cat-nav-icon">🎧</span>Headphones</a>
        <a href="/category.html?slug=smartwatches" class="cat-nav-link" data-page="smartwatches"><span class="cat-nav-icon">⌚</span>Smartwatches</a>
        <a href="/category.html?slug=cameras" class="cat-nav-link" data-page="cameras"><span class="cat-nav-icon">📷</span>Cameras</a>
        <a href="/category.html?slug=computer-accessories" class="cat-nav-link" data-page="computer-accessories"><span class="cat-nav-icon">🖥️</span>Accessories</a>
        <a href="/category.html?slug=gaming" class="cat-nav-link" data-page="gaming"><span class="cat-nav-icon">🎮</span>Gaming</a>
      </div>
    </div>
  </nav>`;
}

function getFooterHTML() {
  return `
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="/index.html" class="footer-logo">
            <div class="logo-mark" style="width:32px;height:32px;font-size:1rem;">T</div>
            <span class="footer-logo-text">TECH<span>NOVA</span></span>
          </a>
          <p>Your premium destination for the latest technology products from top brands worldwide.</p>
        </div>
        <div>
          <div class="footer-heading">Shop</div>
          <div class="footer-links">
            <a href="/category.html?slug=smartphones">Smartphones</a>
            <a href="/category.html?slug=laptops">Laptops</a>
            <a href="/category.html?slug=headphones-earbuds">Headphones</a>
            <a href="/category.html?slug=gaming">Gaming</a>
          </div>
        </div>
        <div>
          <div class="footer-heading">Account</div>
          <div class="footer-links">
            <a href="/account-profile.html">My Profile</a>
            <a href="/account-orders.html">My Orders</a>
            <a href="/wishlist.html">Wishlist</a>
            <a href="/compare.html">Compare</a>
          </div>
        </div>
        <div>
          <div class="footer-heading">Support</div>
          <div class="footer-links">
            <a href="/help.html">Help Center</a>
            <a href="/help.html#returns">Returns</a>
            <a href="/help.html#contact">Contact Us</a>
            <a href="/help.html#track">Track Order</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 TECHNOVA. All rights reserved. | Academic Project</span>
        <div class="footer-social">
          <a href="#" aria-label="Twitter">𝕏</a>
          <a href="#" aria-label="Instagram">📷</a>
          <a href="#" aria-label="YouTube">▶</a>
        </div>
      </div>
    </div>
  </footer>
  <div id="toast-container" class="toast-container"></div>`;
}

function getScriptsHTML() {
  return `
  <script src="/js/api.js"><\/script>
  <script src="/js/auth.js"><\/script>
  <script src="/js/cart.js"><\/script>`;
}

function initCommon() {
  Auth.updateHeaderUI();
  CartManager.updateBadge();
  WishlistManager.updateBadge();

  // Search
  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.getElementById('search-input');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const q = searchInput.value.trim();
      if (q) window.location.href = `/search.html?q=${encodeURIComponent(q)}`;
    });
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') searchBtn.click();
    });
  }
}

window.getHeaderHTML = getHeaderHTML;
window.getFooterHTML = getFooterHTML;
window.getScriptsHTML = getScriptsHTML;
window.initCommon = initCommon;
