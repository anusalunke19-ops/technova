/**
 * TECHNOVA Auth State Manager
 * Handles login tokens, persistent session, and header UI synchronization
 */

const Auth = {
  TOKEN_KEY: 'technova_token',
  USER_KEY: 'technova_user',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getUser() {
    try {
      const data = localStorage.getItem(this.USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  setSession(token, user) {
    if (token) localStorage.setItem(this.TOKEN_KEY, token);
    if (user) localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.updateHeaderUI();
  },

  clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.updateHeaderUI();
  },

  async logout() {
    try {
      if (window.api && typeof window.api.logout === 'function') {
        await window.api.logout();
      }
    } catch (e) {
      // Ignore network errors on logout
    }
    this.clearSession();
    window.location.href = '/signin.html';
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      const currentUrl = window.location.pathname + window.location.search;
      window.location.href = '/signin.html?redirect=' + encodeURIComponent(currentUrl);
      return false;
    }
    return true;
  },

  updateHeaderUI() {
    const user = this.getUser();
    const accountBtn = document.getElementById('account-btn');
    const accountLabel = document.getElementById('account-label');
    let logoutBtn = document.getElementById('logout-btn');

    if (accountBtn) {
      if (user && user.name) {
        const firstName = user.name.trim().split(' ')[0] || 'Account';
        if (accountLabel) accountLabel.textContent = firstName;
        accountBtn.href = '/account-profile.html';
        accountBtn.title = `Signed in as ${user.name} (${user.email || ''})`;
      } else {
        if (accountLabel) accountLabel.textContent = 'Sign In';
        accountBtn.href = '/signin.html';
        accountBtn.title = 'Sign In to your TECHNOVA account';
      }
    }

    if (user) {
      // If logout button doesn't exist, inject it into header actions
      if (!logoutBtn && accountBtn && accountBtn.parentElement) {
        logoutBtn = document.createElement('a');
        logoutBtn.id = 'logout-btn';
        logoutBtn.href = '/signin.html';
        logoutBtn.className = 'header-action-btn';
        logoutBtn.title = 'Sign Out';
        logoutBtn.innerHTML = '<span>🚪</span><span class="action-label">Logout</span>';
        accountBtn.parentElement.appendChild(logoutBtn);
      }
      if (logoutBtn) {
        logoutBtn.style.display = 'flex';
        logoutBtn.onclick = (e) => {
          e.preventDefault();
          Auth.logout();
        };
      }
    } else {
      if (logoutBtn) {
        logoutBtn.style.display = 'none';
      }
    }
  }
};

window.Auth = Auth;

// Universal header and search initialization on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  Auth.updateHeaderUI();

  // Wire search input if on pages other than search.html (search.html has its own dedicated handler)
  if (!window.location.pathname.endsWith('search.html')) {
    const sBtn = document.getElementById('search-btn');
    const sInput = document.getElementById('search-input');
    if (sBtn && sInput && !sBtn._wired) {
      sBtn._wired = true;
      const doSearchRedirect = () => {
        const q = sInput.value.trim();
        if (q) window.location.href = `/search.html?q=${encodeURIComponent(q)}`;
      };
      sBtn.addEventListener('click', (e) => {
        e.preventDefault();
        doSearchRedirect();
      });
      sInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          doSearchRedirect();
        }
      });
    }
  }
});
