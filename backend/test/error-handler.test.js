const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const ErrorHandlerModel = require('../../frontend/error-handler-model.js');

test('ErrorHandlerModel: classifica TypeError e "Failed to fetch" como CONNECTION_FAILURE com mensagem amigável', () => {
  const fetchError = new TypeError('Failed to fetch');
  const classified = ErrorHandlerModel.classifyError(fetchError, { path: '/api/auth/login', action: 'login' });
  assert.strictEqual(classified, ErrorHandlerModel.KINDS.CONNECTION_FAILURE);

  const details = ErrorHandlerModel.getFriendlyDetails(classified, { language: 'pt-BR' });
  assert.strictEqual(details.title, 'Não foi possível conectar');
  assert.strictEqual(details.message, 'O servidor do Healthy Trend Trader não está respondendo neste momento. Isso pode ser uma instabilidade temporária.');
  assert.strictEqual(details.adviceHeading, 'O que você pode fazer?');
  assert.strictEqual(details.advice, 'Verifique sua conexão com a internet e tente novamente em alguns instantes.');
  assert.strictEqual(details.primaryActionLabel, 'Tentar novamente');
  assert.strictEqual(details.secondaryNote, 'Se o problema persistir, tente novamente mais tarde.');
  assert.strictEqual(details.canRetry, true);
  assert.ok(!details.message.includes('Failed to fetch'));
  assert.ok(!details.title.includes('Failed to fetch'));
});

test('ErrorHandlerModel: classifica HTTP 503, 502 e 504 como SERVICE_UNAVAILABLE', () => {
  const err503 = { status: 503, message: 'Service Unavailable' };
  const classified503 = ErrorHandlerModel.classifyError(err503);
  assert.strictEqual(classified503, ErrorHandlerModel.KINDS.SERVICE_UNAVAILABLE);

  const details = ErrorHandlerModel.getFriendlyDetails(classified503, { language: 'pt-BR' });
  assert.strictEqual(details.title, 'Servidor indisponível');
  assert.ok(details.message.includes('temporariamente indisponível'));
  assert.strictEqual(details.primaryActionLabel, 'Tentar novamente');
  assert.strictEqual(details.canRetry, true);

  const err502 = { status: 502, message: 'Bad Gateway' };
  assert.strictEqual(ErrorHandlerModel.classifyError(err502), ErrorHandlerModel.KINDS.SERVICE_UNAVAILABLE);
});

test('ErrorHandlerModel: classifica HTTP 401 no login como INVALID_CREDENTIALS', () => {
  const login401 = { status: 401, message: 'Credenciais inválidas' };
  const classified = ErrorHandlerModel.classifyError(login401, { path: '/api/auth/login', action: 'login' });
  assert.strictEqual(classified, ErrorHandlerModel.KINDS.INVALID_CREDENTIALS);

  const details = ErrorHandlerModel.getFriendlyDetails(classified, { language: 'pt-BR' });
  assert.strictEqual(details.title, 'Não foi possível entrar');
  assert.strictEqual(details.message, 'Não foi possível entrar. Verifique seu e-mail e sua senha.');
  assert.strictEqual(details.adviceHeading, 'O que você pode fazer?');
  assert.strictEqual(details.advice, 'Certifique-se de que digitou o e-mail e a senha corretos e tente novamente.');
  assert.strictEqual(details.primaryActionLabel, 'Tentar novamente');
  assert.ok(details.secondaryNote.includes('recuperação de acesso'));
  assert.strictEqual(details.canRetry, true);
});

test('ErrorHandlerModel: classifica HTTP 401 em rotas protegidas como SESSION_EXPIRED', () => {
  const session401 = { status: 401, message: 'Sessão inválida' };
  const classified = ErrorHandlerModel.classifyError(session401, { path: '/api/trades', action: 'get_trades' });
  assert.strictEqual(classified, ErrorHandlerModel.KINDS.SESSION_EXPIRED);

  const details = ErrorHandlerModel.getFriendlyDetails(classified, { language: 'pt-BR' });
  assert.strictEqual(details.title, 'Sessão expirada');
  assert.strictEqual(details.message, 'Sua sessão expirou. Entre novamente para continuar.');
  assert.strictEqual(details.primaryActionLabel, 'Entrar novamente');
  assert.strictEqual(details.canRetry, false);
});

test('ErrorHandlerModel: classifica HTTP 429 como RATE_LIMITED', () => {
  const rateLimit = { status: 429, message: 'Too Many Requests' };
  const classified = ErrorHandlerModel.classifyError(rateLimit, { path: '/api/auth/login' });
  assert.strictEqual(classified, ErrorHandlerModel.KINDS.RATE_LIMITED);

  const details = ErrorHandlerModel.getFriendlyDetails(classified, { language: 'pt-BR' });
  assert.strictEqual(details.title, 'Muitas tentativas');
  assert.ok(details.message.includes('Muitas tentativas seguidas'));
  assert.ok(details.advice.includes('alguns minutos'));
  assert.strictEqual(details.canRetry, true);
});

test('ErrorHandlerModel: classifica erros genéricos HTTP 500 como UNEXPECTED', () => {
  const err500 = { status: 500, message: 'Internal Server Error' };
  const classified = ErrorHandlerModel.classifyError(err500);
  assert.strictEqual(classified, ErrorHandlerModel.KINDS.UNEXPECTED);

  const details = ErrorHandlerModel.getFriendlyDetails(classified, { language: 'pt-BR' });
  assert.strictEqual(details.title, 'Não foi possível concluir');
  assert.ok(details.message.includes('Não foi possível concluir sua solicitação'));
  assert.strictEqual(details.primaryActionLabel, 'Tentar novamente');
  assert.strictEqual(details.canRetry, true);
});

test('ErrorHandlerModel.renderErrorCardHtml: renderiza card com estrutura visual da referência', () => {
  const friendly = ErrorHandlerModel.createFriendlyError(new TypeError('Failed to fetch'), { path: '/api/auth/login' });
  const html = ErrorHandlerModel.renderErrorCardHtml(friendly, {
    onRetry: 'window.retryLogin && window.retryLogin()',
    retryId: 'loginRetryBtn'
  });

  assert.ok(html.includes('class="login-error-card"'), 'Deve ter container login-error-card');
  assert.ok(html.includes('class="login-error-header"'), 'Deve ter login-error-header');
  assert.ok(html.includes('class="login-error-icon"'), 'Deve ter login-error-icon');
  assert.ok(html.includes('class="login-error-title"'), 'Deve ter login-error-title');
  assert.ok(html.includes('Não foi possível conectar'), 'Deve exibir título amigável');
  assert.ok(html.includes('class="login-error-desc"'), 'Deve ter login-error-desc');
  assert.ok(html.includes('class="login-error-advice-box"'), 'Deve ter sub-card de orientação');
  assert.ok(html.includes('O que você pode fazer?'), 'Deve ter título de orientação');
  assert.ok(html.includes('Verifique sua conexão com a internet'), 'Deve ter instrução de orientação');
  assert.ok(html.includes('id="loginRetryBtn"'), 'Deve ter botão Tentar novamente');
  assert.ok(html.includes('window.retryLogin'), 'Botão deve chamar window.retryLogin');
  assert.ok(html.includes('class="login-error-dismiss-btn"'), 'Deve ter botão de fechar/dispensar');
  assert.ok(html.includes('login-error-secondary-note'), 'Deve ter nota secundária');
  assert.ok(html.includes('Se o problema persistir, tente novamente mais tarde.'), 'Deve ter nota secundária correta');
  assert.ok(!html.includes('Failed to fetch'), 'NUNCA deve expor "Failed to fetch" na interface');
  assert.ok(!html.includes('TypeError'), 'NUNCA deve expor "TypeError"');
});

test('ErrorHandlerModel.logDiagnostic: não expõe credenciais ou senhas no console', () => {
  const logged = [];
  const originalWarn = console.warn;
  console.warn = (...args) => logged.push(args.join(' '));

  try {
    ErrorHandlerModel.logDiagnostic(new TypeError('Failed to fetch'), {
      path: '/api/auth/login',
      method: 'POST',
      status: 0,
      email: 'trader@test.com',
      password: 'supersecretpassword123'
    });

    assert.strictEqual(logged.length, 1);
    assert.ok(logged[0].includes('[HealthyTrendApi Diagnostic] [POST /api/auth/login] -> CONNECTION_FAILURE'));
    assert.ok(!logged[0].includes('supersecretpassword123'), 'NUNCA deve registrar senha');
    assert.ok(!logged[0].includes('trader@test.com'), 'NUNCA deve registrar email em log de diagnóstico');
  } finally {
    console.warn = originalWarn;
  }
});

test('index.html e assets: scripts e CSS de erro estão devidamente incluídos', () => {
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'frontend', 'login-cinematic.css'), 'utf8');

  // Script de erro carregado antes de auth-client.js
  const errorHandlerIndex = indexHtml.indexOf('frontend/error-handler-model.js');
  const authClientIndex = indexHtml.indexOf('frontend/auth-client.js');
  assert.ok(errorHandlerIndex > 0, 'index.html deve incluir frontend/error-handler-model.js');
  assert.ok(authClientIndex > 0, 'index.html deve incluir frontend/auth-client.js');
  assert.ok(errorHandlerIndex < authClientIndex, 'error-handler-model.js deve ser carregado antes de auth-client.js');

  // CSS possui os seletores do card de erro e ancoragem estável
  assert.ok(css.includes('#loginShell .login-form'), 'login-cinematic.css deve conter .login-form');
  assert.ok(css.includes('#loginShell #loginMessage'), 'login-cinematic.css deve conter #loginMessage com ancoragem');
  assert.ok(css.includes('position: absolute'), 'login-cinematic.css deve posicionar #loginMessage absolutamente para evitar reflow');
  assert.ok(css.includes('#loginShell .login-error-card'), 'login-cinematic.css deve estilizar .login-error-card');
  assert.ok(css.includes('#loginShell .login-error-header'), 'login-cinematic.css deve estilizar .login-error-header');
  assert.ok(css.includes('#loginShell .login-error-dismiss-btn'), 'login-cinematic.css deve estilizar .login-error-dismiss-btn');
  assert.ok(css.includes('#loginShell .login-error-advice-box'), 'login-cinematic.css deve estilizar .login-error-advice-box');
  assert.ok(css.includes('#loginShell .login-error-retry-btn'), 'login-cinematic.css deve estilizar .login-error-retry-btn');
  assert.ok(css.includes('#loginShell .login-error-secondary-note'), 'login-cinematic.css deve estilizar .login-error-secondary-note');
});

test('auth-client.js: preserva campos de input de login e fornece retryLogin', () => {
  const authClientJs = fs.readFileSync(path.join(root, 'frontend', 'auth-client.js'), 'utf8');

  // window.retryLogin e window.dismissLoginError existem
  assert.ok(authClientJs.includes('window.retryLogin = async'), 'auth-client.js deve expor window.retryLogin');
  assert.ok(authClientJs.includes('window.dismissLoginError = dismissLoginError'), 'auth-client.js deve expor window.dismissLoginError');
  // Trava de submissão duplicada (isLoginSubmitting)
  assert.ok(authClientJs.includes('let isLoginSubmitting = false;'), 'auth-client.js deve ter flag de concorrência');
  assert.ok(authClientJs.includes('if (isLoginSubmitting) return;'), 'enterWorkspace deve bloquear submissão duplicada');
  // Estado de carregamento do botão de retry
  assert.ok(authClientJs.includes('retryBtn.textContent = \'Tentando novamente…\';'), 'auth-client.js deve mudar texto do botão para "Tentando novamente…"');
  // Renderização amigável de erro
  assert.ok(authClientJs.includes('renderFriendlyLoginError'), 'auth-client.js deve usar renderFriendlyLoginError');
  // Preserva inputs (nenhuma linha no catch que limpe loginEmail ou loginPassword)
  const catchBlockMatch = authClientJs.match(/catch\s*\(error\)\s*\{([^}]+)\}/);
  assert.ok(catchBlockMatch, 'Deve ter bloco catch');
  assert.ok(!catchBlockMatch[1].includes('loginEmail.value = \'\''), 'Catch não deve limpar email');
  assert.ok(!catchBlockMatch[1].includes('loginPassword.value = \'\''), 'Catch não deve limpar senha');
});
