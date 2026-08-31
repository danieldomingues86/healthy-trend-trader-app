(() => {
  const API = window.HEALTHY_TREND_API_URL || 'http://localhost:8787';
  const TOKEN_KEY = 'healthy-trend-session-token';
  const memory = { token: null };

  function token() { return memory.token || localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ''; }
  function setToken(value, remember) {
    memory.token = value;
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, value);
  }
  function clearToken() { memory.token = null; localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); }
  function message(text) {
    let element = document.getElementById('loginMessage');
    if (!element) {
      element = document.createElement('p');
      element.id = 'loginMessage';
      element.className = 'login-demo';
      document.querySelector('.login-form')?.append(element);
    }
    element.textContent = text;
  }
  async function request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token()) headers.Authorization = `Bearer ${token()}`;
    const response = await fetch(`${API}${path}`, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a operação.');
    return payload;
  }
  window.healthyTrendApi = { request, isAuthenticated: () => Boolean(token()) };
  function enter(user) {
    document.getElementById('loginShell')?.classList.add('hidden');
    document.body.style.overflow = '';
    const avatar = document.querySelector('.avatar');
    if (avatar) avatar.textContent = (user.displayName || user.email || 'U').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
    if (typeof go === 'function') go('today');
    window.dispatchEvent(new CustomEvent('healthyTrend:authenticated', { detail: { user } }));
  }

  window.enterWorkspace = async (event) => {
    event.preventDefault();
    const submit = event.currentTarget.querySelector('[type="submit"]');
    const email = document.getElementById('loginEmail')?.value || '';
    const password = document.getElementById('loginPassword')?.value || '';
    const remember = Boolean(event.currentTarget.querySelector('input[type="checkbox"]')?.checked);
    submit.disabled = true;
    submit.textContent = 'Entrando…';
    message('');
    try {
      const result = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      setToken(result.token, remember);
      enter(result.user);
    } catch (error) {
      message(error.message);
    } finally {
      submit.disabled = false;
      submit.textContent = 'Entrar no workspace';
    }
  };

  window.signOutWorkspace = async () => {
    try { await request('/api/auth/logout', { method: 'POST' }); } catch (_) { /* local logout remains valid */ }
    clearToken();
    document.getElementById('loginShell')?.classList.remove('hidden');
    document.getElementById('loginPassword').value = '';
  };

  const originalAccountAction = window.accountAction;
  window.accountAction = (action) => action === 'signout' ? window.signOutWorkspace() : originalAccountAction?.(action);

  document.addEventListener('DOMContentLoaded', async () => {
    const passwordInput = document.getElementById('loginPassword');
    const revealButton = document.getElementById('revealLoginPassword');
    if (passwordInput && revealButton) {
      const reveal = () => { passwordInput.type = 'text'; };
      const conceal = () => { passwordInput.type = 'password'; };
      revealButton.addEventListener('pointerdown', (event) => { event.preventDefault(); reveal(); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((event) => revealButton.addEventListener(event, conceal));
      revealButton.addEventListener('keydown', (event) => { if (event.key === ' ' || event.key === 'Enter') reveal(); });
      revealButton.addEventListener('keyup', conceal);
      revealButton.addEventListener('blur', conceal);
    }
    if (!token()) return;
    try { enter((await request('/api/auth/me')).user); } catch (_) { clearToken(); }
  });
})();
