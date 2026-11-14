/**
 * TECHNOVA Auth State Manager
 */

const Auth = {
  TOKEN_KEY: 'technova_token',
  USER_KEY: 'technova_user',

  getToken() { return localStorage.getItem(this.TOKEN_KEY); },
  getUser() {
    try { return JSON.parse(localStorage.getItem(this.USER_KEY)); } catch { return null; }
  },
  isLoggedIn() { return !!this.getToken(); },

  setSession(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  async logout() {
    try { await window.api.logout(); } catch {}
    this.clearSession();
    window.location.href = '/signin.html';
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/signin.html?redirect=' + encodeURIComponent(window.location.href);
      return false;
    }
    return true;
  },

  updateHeaderUI() {
    const user = this.getUser();
    const accountBtn = document.getElementById('account-btn');
    const accountLabel = document.getElementById('account-label');
    const logoutBtn = document.getElementById('logout-btn');

    if (accountBtn && user) {
      if (accountLabel) accountLabel.textContent = user.name ? user.name.split(' ')[0] : 'Account';
      accountBtn.href = '/account-profile.html';
      accountBtn.title = `Signed in as ${user.name}`;
    }
    if (logoutBtn) {
      if (user) {
        logoutBtn.style.display = 'flex';
        logoutBtn.addEventListener('click', (e) => { e.preventDefault(); Auth.logout(); });
      } else {
        logoutBtn.style.display = 'none';
      }
    }
  }
};

window.Auth = Auth;
