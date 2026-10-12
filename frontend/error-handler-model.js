(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ErrorHandlerModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const KINDS = {
    CONNECTION_FAILURE: 'CONNECTION_FAILURE',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    RATE_LIMITED: 'RATE_LIMITED',
    UNEXPECTED: 'UNEXPECTED'
  };

  const ICONS = {
    CONNECTION_FAILURE: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e09f3e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="2" y1="2" x2="22" y2="22"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/><path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"/><path d="M5 13a10 10 0 0 1 5.24-2.76"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
    SERVICE_UNAVAILABLE: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e09f3e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/><line x1="12" y1="18" x2="18" y2="18"/></svg>`,
    INVALID_CREDENTIALS: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/></svg>`,
    SESSION_EXPIRED: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e09f3e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    RATE_LIMITED: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e09f3e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    UNEXPECTED: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
  };

  function getLanguage(context) {
    if (context && context.language) return context.language;
    if (typeof window !== 'undefined' && window.appLanguage) return window.appLanguage;
    return 'pt-BR';
  }

  function classifyError(rawError, context = {}) {
    const status = Number(context.status ?? rawError?.status ?? rawError?.statusCode ?? 0);
    const rawMsg = String(rawError?.message || rawError?.error || rawError || '');
    const isLoginPath = context.path === '/api/auth/login' || context.action === 'login';

    // 1. Falha de conexão / Offline / DNS / Failed to fetch
    const isNetworkError = (
      status === 0 && (
        /failed to fetch|networkerror|network error|econnrefused|net::err|load failed|conexão falhou/i.test(rawMsg) ||
        rawError instanceof TypeError ||
        rawError?.isNetworkError === true ||
        (typeof navigator !== 'undefined' && navigator.onLine === false)
      )
    );

    if (isNetworkError) {
      return KINDS.CONNECTION_FAILURE;
    }

    // 2. Servidor indisponível / 503 / 502 / 504 / backend não configurado
    if (status === 503 || status === 502 || status === 504 ||
        /ainda não configurada no servidor|temporariamente indisponível|service unavailable|bad gateway|gateway timeout/i.test(rawMsg)) {
      return KINDS.SERVICE_UNAVAILABLE;
    }

    // 3. Credenciais inválidas (login)
    if (status === 401 && (isLoginPath || /e-mail ou senha|credenciais|senha incorreta|invalid credentials/i.test(rawMsg))) {
      return KINDS.INVALID_CREDENTIALS;
    }

    // 4. Sessão expirada (requisições autenticadas fora do login)
    if (status === 401 && !isLoginPath) {
      return KINDS.SESSION_EXPIRED;
    }

    // 5. Limite de tentativas (429)
    if (status === 429 || /too many requests|muitas tentativas|taxa limite|rate limit/i.test(rawMsg)) {
      return KINDS.RATE_LIMITED;
    }

    // 6. Erro inesperado
    return KINDS.UNEXPECTED;
  }

  function getFriendlyDetails(kind, context = {}) {
    const isEn = getLanguage(context) === 'en-US';

    switch (kind) {
      case KINDS.CONNECTION_FAILURE:
        return {
          kind: KINDS.CONNECTION_FAILURE,
          title: isEn ? 'Unable to connect' : 'Não foi possível conectar',
          message: isEn
            ? 'The Healthy Trend Trader server is not responding at the moment. This might be temporary instability.'
            : 'O servidor do Healthy Trend Trader não está respondendo neste momento. Isso pode ser uma instabilidade temporária.',
          adviceHeading: isEn ? 'What can you do?' : 'O que você pode fazer?',
          advice: isEn
            ? 'Check your internet connection and try again in a few moments.'
            : 'Verifique sua conexão com a internet e tente novamente em alguns instantes.',
          primaryActionLabel: isEn ? 'Try again' : 'Tentar novamente',
          secondaryNote: isEn
            ? 'If the problem persists, please try again later.'
            : 'Se o problema persistir, tente novamente mais tarde.',
          canRetry: true,
          iconKey: KINDS.CONNECTION_FAILURE,
          status: context.status || 0
        };

      case KINDS.SERVICE_UNAVAILABLE:
        return {
          kind: KINDS.SERVICE_UNAVAILABLE,
          title: isEn ? 'Server unavailable' : 'Servidor indisponível',
          message: isEn
            ? 'Our server is temporarily unavailable. We are experiencing instability. Try again in a few moments.'
            : 'Nosso servidor está temporariamente indisponível. Estamos com uma instabilidade. Tente novamente em alguns instantes.',
          adviceHeading: isEn ? 'What can you do?' : 'O que você pode fazer?',
          advice: isEn
            ? 'Wait a few moments and try again.'
            : 'Aguarde alguns instantes e tente novamente.',
          primaryActionLabel: isEn ? 'Try again' : 'Tentar novamente',
          secondaryNote: isEn
            ? 'If the problem persists, please try again later.'
            : 'Se o problema persistir, tente novamente mais tarde.',
          canRetry: true,
          iconKey: KINDS.SERVICE_UNAVAILABLE,
          status: context.status || 503
        };

      case KINDS.INVALID_CREDENTIALS:
        return {
          kind: KINDS.INVALID_CREDENTIALS,
          title: isEn ? 'Unable to sign in' : 'Não foi possível entrar',
          message: isEn
            ? 'Unable to sign in. Please verify your email and password.'
            : 'Não foi possível entrar. Verifique seu e-mail e sua senha.',
          adviceHeading: isEn ? 'What can you do?' : 'O que você pode fazer?',
          advice: isEn
            ? 'Make sure you entered the correct email and password and try again.'
            : 'Certifique-se de que digitou o e-mail e a senha corretos e tente novamente.',
          primaryActionLabel: isEn ? 'Try again' : 'Tentar novamente',
          secondaryNote: isEn
            ? 'Forgot your password? Use the account recovery option.'
            : 'Esqueceu sua senha? Use a opção de recuperação de acesso.',
          canRetry: true,
          iconKey: KINDS.INVALID_CREDENTIALS,
          status: context.status || 401
        };

      case KINDS.SESSION_EXPIRED:
        return {
          kind: KINDS.SESSION_EXPIRED,
          title: isEn ? 'Session expired' : 'Sessão expirada',
          message: isEn
            ? 'Your session has expired. Please sign in again to continue.'
            : 'Sua sessão expirou. Entre novamente para continuar.',
          adviceHeading: isEn ? 'What can you do?' : 'O que você pode fazer?',
          advice: isEn
            ? 'Sign in again to safely resume your work.'
            : 'Faça login novamente para retomar seu trabalho com segurança.',
          primaryActionLabel: isEn ? 'Sign in again' : 'Entrar novamente',
          secondaryNote: '',
          canRetry: false,
          iconKey: KINDS.SESSION_EXPIRED,
          status: context.status || 401
        };

      case KINDS.RATE_LIMITED:
        return {
          kind: KINDS.RATE_LIMITED,
          title: isEn ? 'Too many attempts' : 'Muitas tentativas',
          message: isEn
            ? 'Too many attempts in a short time. Please wait a moment before trying again.'
            : 'Muitas tentativas seguidas. Por favor, aguarde alguns instantes antes de tentar novamente.',
          adviceHeading: isEn ? 'What can you do?' : 'O que você pode fazer?',
          advice: isEn
            ? 'Wait a few minutes before attempting to sign in again.'
            : 'Aguarde alguns minutos para que o sistema libere novas tentativas.',
          primaryActionLabel: isEn ? 'Try again' : 'Tentar novamente',
          secondaryNote: isEn
            ? 'For security, access is temporarily paused after multiple failed attempts.'
            : 'Por segurança, o acesso é temporariamente pausado após várias tentativas.',
          canRetry: true,
          iconKey: KINDS.RATE_LIMITED,
          status: context.status || 429
        };

      case KINDS.UNEXPECTED:
      default:
        return {
          kind: KINDS.UNEXPECTED,
          title: isEn ? 'Unable to complete request' : 'Não foi possível concluir',
          message: isEn
            ? 'Could not complete your request. Please try again. If the problem persists, contact support.'
            : 'Não foi possível concluir sua solicitação. Tente novamente. Se o problema persistir, entre em contato com o suporte.',
          adviceHeading: isEn ? 'What can you do?' : 'O que você pode fazer?',
          advice: isEn
            ? 'Try again in a few moments or reload the page if needed.'
            : 'Tente novamente em instantes ou recarregue a página se necessário.',
          primaryActionLabel: isEn ? 'Try again' : 'Tentar novamente',
          secondaryNote: isEn
            ? 'If the problem persists, please contact support.'
            : 'Se o problema persistir, entre em contato com o suporte.',
          canRetry: true,
          iconKey: KINDS.UNEXPECTED,
          status: context.status || 500
        };
    }
  }

  class FriendlyError extends Error {
    constructor(rawError, context = {}) {
      const kind = classifyError(rawError, context);
      const details = getFriendlyDetails(kind, context);
      super(details.message);

      this.name = 'FriendlyError';
      this.kind = details.kind;
      this.title = details.title;
      this.adviceHeading = details.adviceHeading;
      this.advice = details.advice;
      this.primaryActionLabel = details.primaryActionLabel;
      this.secondaryNote = details.secondaryNote;
      this.canRetry = details.canRetry;
      this.iconKey = details.iconKey;
      this.status = details.status;
      this.isFriendly = true;
      this.originalError = rawError;
    }
  }

  function createFriendlyError(rawError, context = {}) {
    if (rawError && rawError.isFriendly) return rawError;
    return new FriendlyError(rawError, context);
  }

  function logDiagnostic(error, context = {}) {
    try {
      const status = context.status ?? error?.status ?? 0;
      const path = context.path || 'unknown';
      const method = context.method || 'GET';
      const kind = classifyError(error, context);

      // Nunca logar credenciais, senhas ou tokens
      console.warn(`[HealthyTrendApi Diagnostic] [${method} ${path}] -> ${kind} (status: ${status})`);
    } catch (_) {}
  }

  function renderErrorCardHtml(details, options = {}) {
    const onRetryCall = options.onRetry || 'window.retryLogin && window.retryLogin()';
    const retryId = options.retryId || 'loginRetryBtn';
    const iconSvg = ICONS[details.iconKey] || ICONS.CONNECTION_FAILURE;

    return `
      <div class="login-error-card" role="alert" aria-live="assertive">
        <div class="login-error-header">
          <span class="login-error-icon" aria-hidden="true">${iconSvg}</span>
          <h3 class="login-error-title">${details.title}</h3>
        </div>
        <p class="login-error-desc">${details.message}</p>
        <div class="login-error-advice-box">
          <b class="login-error-advice-title">${details.adviceHeading}</b>
          <p class="login-error-advice-text">${details.advice}</p>
        </div>
        ${details.canRetry ? `
        <button type="button" class="login-error-retry-btn" id="${retryId}" onclick="${onRetryCall}">
          ${details.primaryActionLabel}
        </button>
        ` : ''}
        ${details.secondaryNote ? `
        <small class="login-error-secondary-note">${details.secondaryNote}</small>
        ` : ''}
      </div>
    `.trim();
  }

  return {
    KINDS,
    ICONS,
    classifyError,
    getFriendlyDetails,
    FriendlyError,
    createFriendlyError,
    logDiagnostic,
    renderErrorCardHtml
  };
});
