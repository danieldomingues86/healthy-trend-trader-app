(() => {
  const API = window.HEALTHY_TREND_API_URL || 'http://localhost:8787';
  const TOKEN_KEY = 'healthy-trend-session-token';
  const ACCESS_SESSION_KEY = 'healthy-trend-platform-access-session';
  const memory = { token: null };
  let platformAccessStarted = false;
  let platformAccessPreferences = { countOpenings: true, trackDuration: true, monitorEnabled: true, trackWindowEvents: false };

  function token() { return memory.token || localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ''; }
  function setToken(value, remember) {
    memory.token = value;
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, value);
  }
  function clearToken() { memory.token = null; localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); }
  function handleApiError(rawError, path, options, status = 0) {
    const method = options?.method || 'GET';
    const context = { path, method, status };
    if (window.ErrorHandlerModel) {
      window.ErrorHandlerModel.logDiagnostic(rawError, context);
      return window.ErrorHandlerModel.createFriendlyError(rawError, context);
    }
    return rawError instanceof Error ? rawError : new Error(String(rawError || 'Não foi possível concluir a operação.'));
  }

  function renderFriendlyLoginError(err) {
    let element = document.getElementById('loginMessage');
    if (!element) {
      element = document.createElement('div');
      element.id = 'loginMessage';
      element.className = 'login-demo';
      document.querySelector('.login-form')?.append(element);
    }
    if (!err) {
      element.innerHTML = '';
      element.style.display = 'none';
      return;
    }
    element.style.display = 'block';
    if (window.ErrorHandlerModel) {
      const friendly = window.ErrorHandlerModel.createFriendlyError(err, { path: '/api/auth/login', action: 'login', status: err.status });
      element.innerHTML = window.ErrorHandlerModel.renderErrorCardHtml(friendly, {
        onRetry: 'window.retryLogin && window.retryLogin()',
        retryId: 'loginRetryBtn'
      });
    } else {
      element.textContent = typeof err === 'string' ? err : (err.message || 'Não foi possível entrar.');
    }
  }

  function message(text) {
    if (!text) {
      renderFriendlyLoginError(null);
    } else {
      renderFriendlyLoginError(typeof text === 'string' ? new Error(text) : text);
    }
  }

  async function request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token()) headers.Authorization = `Bearer ${token()}`;
    const fetchOptions = { ...options, headers };
    if (fetchOptions.body && typeof fetchOptions.body === 'object' && !(fetchOptions.body instanceof FormData) && !(fetchOptions.body instanceof Blob)) {
      fetchOptions.body = JSON.stringify(fetchOptions.body);
    }
    let response;
    try {
      response = await fetch(`${API}${path}`, fetchOptions);
    } catch (networkError) {
      throw handleApiError(networkError, path, fetchOptions, 0);
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(payload.error || 'Não foi possível concluir a operação.');
      err.status = response.status;
      throw handleApiError(err, path, fetchOptions, response.status);
    }
    return payload;
  }
  async function uploadFile(path, file, headers = {}) {
    const requestHeaders = { 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name), ...headers };
    if (token()) requestHeaders.Authorization = `Bearer ${token()}`;
    let response;
    try {
      response = await fetch(`${API}${path}`, { method: 'POST', headers: requestHeaders, body: file });
    } catch (networkError) {
      throw handleApiError(networkError, path, { method: 'POST' }, 0);
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(payload.error || 'Não foi possível enviar o arquivo.');
      err.status = response.status;
      throw handleApiError(err, path, { method: 'POST' }, response.status);
    }
    return payload;
  }
  async function requestBlob(path) {
    const headers = {}; if (token()) headers.Authorization = `Bearer ${token()}`;
    let response;
    try {
      response = await fetch(`${API}${path}`, { headers });
    } catch (networkError) {
      throw handleApiError(networkError, path, { method: 'GET' }, 0);
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const err = new Error(payload.error || 'Não foi possível abrir o arquivo.');
      err.status = response.status;
      throw handleApiError(err, path, { method: 'GET' }, response.status);
    }
    return response.blob();
  }
  window.healthyTrendApi = { request, uploadFile, requestBlob, isAuthenticated: () => Boolean(token()) };
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
  async function startProfitMonitor() {
    if (!token()) return;
    try {
      const settings = await request('/api/platform-access/preferences');
      platformAccessPreferences = { ...platformAccessPreferences, ...(settings.preferences || {}) };
      if (platformAccessPreferences.monitorEnabled === false) return;
      await request('/api/platform-access/monitor/start', { method: 'POST', body: '{}' });
    } catch (_) { /* The local connector is optional when unavailable. */ }
  }
  function heartbeatPlatformAccess() {
    if (!platformAccessStarted || !token()) return;
    request(`/api/platform-access/sessions/${accessSessionId()}/heartbeat`, { method: 'POST', body: '{}' }).catch(() => { if (token()) { platformAccessStarted = false; sessionStorage.removeItem(ACCESS_SESSION_KEY); startPlatformAccess().catch(() => {}); } });
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
    window.syncSubscriptionFromAccount?.(user);
    document.getElementById('loginShell')?.classList.add('hidden');
    document.body.style.overflow = '';
    const avatar = document.querySelector('.avatar');
    if (avatar) avatar.textContent = (user.displayName || user.email || 'U').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
    if (typeof go === 'function') go('today');
    startPlatformAccess();
    startProfitMonitor();
    window.dispatchEvent(new CustomEvent('healthyTrend:authenticated', { detail: { user } }));
    // The account menu is rendered from the signed-in profile. Render it again
    // after login so the avatar is always an interactive control, even while
    // the user workspace is still being loaded from the server.
    window.setTimeout(() => window.setupAccountMenu?.(), 0);
  }
  function completeSession(result, remember = true) {
    setToken(result.token, remember);
    enter(result.user);
  }
  window.healthyTrendAuth = { completeSession, renderFriendlyLoginError };

  let isLoginSubmitting = false;

  window.retryLogin = async () => {
    if (isLoginSubmitting) return;
    const form = document.querySelector('.login-form');
    const fakeEvent = {
      preventDefault: () => {},
      currentTarget: form || document.createElement('form'),
      target: form,
      isRetry: true
    };
    await window.enterWorkspace(fakeEvent);
  };

  window.enterWorkspace = async (event) => {
    if (event?.preventDefault) event.preventDefault();
    if (isLoginSubmitting) return;

    const form = event?.currentTarget || document.querySelector('.login-form');
    const submit = form?.querySelector('[type="submit"]');
    const submitLabel = submit?.querySelector('span:first-child');
    const retryBtn = document.getElementById('loginRetryBtn');
    const isRetry = Boolean(event?.isRetry);

    const email = document.getElementById('loginEmail')?.value || '';
    const password = document.getElementById('loginPassword')?.value || '';
    const remember = Boolean(form?.querySelector('input[type="checkbox"]')?.checked);

    if (!email || !password) {
      renderFriendlyLoginError(new Error('Preencha seu e-mail e senha para continuar.'));
      return;
    }

    isLoginSubmitting = true;
    if (submit) submit.disabled = true;
    if (submitLabel) submitLabel.textContent = 'Entrando…';
    else if (submit) submit.textContent = 'Entrando…';

    if (isRetry && retryBtn) {
      retryBtn.disabled = true;
      retryBtn.textContent = 'Tentando novamente…';
    } else {
      renderFriendlyLoginError(null);
    }

    try {
      const result = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      completeSession(result, remember);
    } catch (error) {
      renderFriendlyLoginError(error);
    } finally {
      isLoginSubmitting = false;
      if (submit) submit.disabled = false;
      if (submitLabel) submitLabel.textContent = 'Entrar no workspace';
      else if (submit) submit.textContent = 'Entrar no workspace';
      const activeRetry = document.getElementById('loginRetryBtn');
      if (activeRetry) {
        activeRetry.disabled = false;
        activeRetry.textContent = 'Tentar novamente';
      }
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
