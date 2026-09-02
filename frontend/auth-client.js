(() => {
  const API = window.HEALTHY_TREND_API_URL || 'http://localhost:8787';
  const TOKEN_KEY = 'healthy-trend-session-token';
  const ACCESS_SESSION_KEY = 'healthy-trend-platform-access-session';
  const memory = { token: null };
  let platformAccessStarted = false;
  let platformAccessPreferences = { countOpenings: true, trackDuration: true, trackWindowEvents: false };

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
  function createAccessSessionId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = Math.floor(Math.random() * 16);
      return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
    });
  }
  function accessSessionId() {
    let id = sessionStorage.getItem(ACCESS_SESSION_KEY);
    if (!id) { id = createAccessSessionId(); sessionStorage.setItem(ACCESS_SESSION_KEY, id); }
    return id;
  }
  async function startPlatformAccess() {
    if (platformAccessStarted || !token()) return;
    try {
      const settings = await request('/api/platform-access/preferences');
      platformAccessPreferences = { ...platformAccessPreferences, ...(settings.preferences || {}) };
      if (!platformAccessPreferences.countOpenings && !platformAccessPreferences.trackDuration) return;
      platformAccessStarted = true;
      await request('/api/platform-access/sessions', { method: 'POST', body: JSON.stringify({ sessionId: accessSessionId(), appVersion: window.HEALTHY_TREND_APP_VERSION || 'web-1.0.0' }) });
      window.dispatchEvent(new CustomEvent('healthyTrend:accessUpdated'));
    } catch (_) { platformAccessStarted = false; }
  }
  function heartbeatPlatformAccess() {
    if (!platformAccessStarted || !token()) return;
    request(`/api/platform-access/sessions/${accessSessionId()}/heartbeat`, { method: 'POST', body: '{}' }).catch(() => {});
  }
  function closePlatformAccess() {
    if (!platformAccessStarted || !token()) return;
    request(`/api/platform-access/sessions/${accessSessionId()}/close`, { method: 'POST', body: '{}', keepalive: true }).catch(() => {});
  }
  window.healthyTrendPlatformAccess = {
    preferences: () => ({ ...platformAccessPreferences }),
    async savePreferences(next) {
      const result = await request('/api/platform-access/preferences', { method: 'PUT', body: JSON.stringify(next) });
      platformAccessPreferences = { ...platformAccessPreferences, ...(result.preferences || {}) };
      window.dispatchEvent(new CustomEvent('healthyTrend:accessUpdated'));
      return platformAccessPreferences;
    }
  };
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
    closePlatformAccess();
    try { await request('/api/auth/logout', { method: 'POST' }); } catch (_) { /* local logout remains valid */ }
    clearToken();
    document.getElementById('loginShell')?.classList.remove('hidden');
    document.getElementById('loginPassword').value = '';
  };

  window.addEventListener('pagehide', closePlatformAccess);
  window.setInterval(heartbeatPlatformAccess, 60_000);

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
