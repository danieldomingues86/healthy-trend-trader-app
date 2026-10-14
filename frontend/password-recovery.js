/* ═══════════════════════════════════════════════════════════════════════
   THE HEALTHY TREND TRADER — PASSWORD RECOVERY & RESET
   Gerenciamento completo do fluxo de recuperação e redefinição de senha
   ═══════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const text = (pt, en) => window.appLanguage === 'en-US' ? en : pt;

  const svgIcons = {
    envelope: '<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    alert: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>'
  };

  function showEmailInlineError(message) {
    let errorElem = document.getElementById('loginEmailError');
    if (!errorElem) {
      errorElem = document.createElement('div');
      errorElem.id = 'loginEmailError';
      errorElem.className = 'login-field-error';
      const emailField = document.getElementById('loginEmail')?.closest('.login-field');
      emailField?.appendChild(errorElem);
    }
    errorElem.textContent = message || '';
    errorElem.style.display = message ? 'block' : 'none';
  }

  function clearEmailInlineError() {
    const errorElem = document.getElementById('loginEmailError');
    if (errorElem) {
      errorElem.textContent = '';
      errorElem.style.display = 'none';
    }
  }

  function openConfirmationModal(email) {
    document.getElementById('passwordRecoveryLayer')?.remove();

    const layer = document.createElement('div');
    layer.id = 'passwordRecoveryLayer';
    layer.className = 'password-recovery-layer';
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    layer.setAttribute('aria-labelledby', 'prModalTitle');

    layer.innerHTML = `
      <div class="password-recovery-dialog">
        <button type="button" class="pr-close-btn" aria-label="${text('Fechar', 'Close')}">×</button>
        <div class="pr-icon-badge" aria-hidden="true">${svgIcons.envelope}</div>
        <h3 id="prModalTitle">${text('Verifique seu e-mail', 'Check your email')}</h3>
        <p class="pr-message">
          ${text(
            'Se este e-mail estiver cadastrado, enviaremos um link para você redefinir sua senha com segurança.',
            'If this email is registered, we will send a link for you to securely reset your password.'
          )}
        </p>
        <div class="pr-email-pill">
          <span>✉</span>
          <strong>${email}</strong>
        </div>
        <p class="pr-note">
          ${text(
            'Não recebeu o e-mail? Verifique também sua pasta de spam. Você poderá solicitar um novo link após o intervalo de segurança definido pelo sistema.',
            'Did not receive the email? Please check your spam folder. You will be able to request a new link after the security cooldown.'
          )}
        </p>
        <button type="button" class="pr-confirm-btn" id="prConfirmBtn">
          ${text('Entendi', 'Got it')}
        </button>
      </div>
    `;

    document.body.appendChild(layer);

    const close = () => {
      layer.remove();
      document.getElementById('loginEmail')?.focus();
    };

    layer.querySelector('.pr-close-btn')?.addEventListener('click', close);
    layer.querySelector('#prConfirmBtn')?.addEventListener('click', close);
    layer.addEventListener('click', (event) => {
      if (event.target === layer) close();
    });
    layer.querySelector('#prConfirmBtn')?.focus();
  }

  async function handleForgotPasswordClick() {
    const emailInput = document.getElementById('loginEmail');
    const rawEmail = emailInput?.value || '';
    const email = rawEmail.trim();

    if (!email) {
      showEmailInlineError(text('Informe seu e-mail para recuperar a senha.', 'Enter your email to recover your password.'));
      emailInput?.focus();
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showEmailInlineError(text('Informe um endereço de e-mail válido.', 'Enter a valid email address.'));
      emailInput?.focus();
      return;
    }

    clearEmailInlineError();

    const forgotBtn = document.querySelector('.login-forgot-btn');
    const originalText = forgotBtn ? forgotBtn.textContent : '';
    if (forgotBtn) {
      forgotBtn.disabled = true;
      forgotBtn.textContent = text('Enviando…', 'Sending…');
    }

    try {
      let appUrl = null;
      if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
        appUrl = window.location.origin;
      }
      const api = window.healthyTrendApi;
      if (api && typeof api.request === 'function') {
        await api.request('/api/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email, appUrl })
        });
      } else {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, appUrl })
        });
        if (!res.ok) throw new Error('Falha na requisição');
      }

      openConfirmationModal(email);
    } catch (err) {
      showEmailInlineError(
        text(
          'Não foi possível processar a recuperação no momento. Tente novamente mais tarde.',
          'Unable to process password recovery at this time. Please try again later.'
        )
      );
    } finally {
      if (forgotBtn) {
        forgotBtn.disabled = false;
        forgotBtn.textContent = originalText || text('Esqueci minha senha', 'Forgot password');
      }
    }
  }

  /* ── 2. Fluxo da Tela de Redefinição de Senha ────────────────────────── */
  function getResetTokenFromUrl() {
    const searchParams = new URLSearchParams(window.location.search);
    let token = searchParams.get('token') || searchParams.get('reset_token');
    if (!token && window.location.hash) {
      const hashQuery = window.location.hash.includes('?')
        ? window.location.hash.split('?')[1]
        : window.location.hash.replace(/^#/, '');
      const hashParams = new URLSearchParams(hashQuery);
      token = hashParams.get('token') || hashParams.get('reset_token');
    }
    return token ? token.trim() : null;
  }

  function clearResetTokenFromUrl() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      url.searchParams.delete('reset_token');
      const cleanPath = url.pathname.replace(/\/reset-password\/?$/, '/');
      window.history.replaceState(null, '', cleanPath + (url.search || ''));
    } catch (_) {}
  }

  function setupPasswordToggle(inputId, toggleBtnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(toggleBtnId);
    if (!input || !btn) return;

    btn.innerHTML = svgIcons.eye;

    const reveal = () => { input.type = 'text'; };
    const conceal = () => { input.type = 'password'; };

    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); reveal(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt => btn.addEventListener(evt, conceal));
    btn.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') reveal();
    });
    btn.addEventListener('keyup', conceal);
    btn.addEventListener('blur', conceal);
  }

  function showResetCard(html) {
    const loginCard = document.querySelector('.login-card');
    const container = document.querySelector('.login-card-col');
    if (!container) return;

    if (loginCard) loginCard.style.display = 'none';

    let resetCard = document.getElementById('resetPasswordCard');
    if (!resetCard) {
      resetCard = document.createElement('div');
      resetCard.id = 'resetPasswordCard';
      resetCard.className = 'login-card';
      container.appendChild(resetCard);
    }
    resetCard.innerHTML = html;
  }

  function restoreLoginCard() {
    const resetCard = document.getElementById('resetPasswordCard');
    if (resetCard) resetCard.remove();

    const loginCard = document.querySelector('.login-card');
    if (loginCard) {
      loginCard.style.display = '';
      document.getElementById('loginEmail')?.focus();
    }
    clearResetTokenFromUrl();
  }

  function renderInvalidOrExpiredTokenView() {
    showResetCard(`
      <div class="pr-status-view">
        <div class="pr-status-icon error" aria-hidden="true">${svgIcons.alert}</div>
        <h3>${text('Link inválido ou expirado', 'Invalid or expired link')}</h3>
        <p>
          ${text(
            'Este link de recuperação é inválido, já foi utilizado ou ultrapassou o prazo de validade de 30 minutos.',
            'This recovery link is invalid, has already been used, or has expired after 30 minutes.'
          )}
        </p>
        <button type="button" class="login-submit" id="prBackToLoginBtn">
          <span>${text('Solicitar novo link', 'Request new link')}</span>
          <span class="submit-arrow" aria-hidden="true">→</span>
        </button>
      </div>
    `);

    document.getElementById('prBackToLoginBtn')?.addEventListener('click', restoreLoginCard);
  }

  function renderResetSuccessView() {
    showResetCard(`
      <div class="pr-status-view">
        <div class="pr-status-icon success" aria-hidden="true">${svgIcons.check}</div>
        <h3>${text('Senha alterada com sucesso!', 'Password changed successfully!')}</h3>
        <p>
          ${text(
            'Sua nova senha já está ativa. Você já pode acessar seu workspace com suas novas credenciais.',
            'Your new password is now active. You can now access your workspace with your new credentials.'
          )}
        </p>
        <button type="button" class="login-submit" id="prGoToLoginBtn">
          <span>${text('Ir para o login', 'Go to login')}</span>
          <span class="submit-arrow" aria-hidden="true">→</span>
        </button>
      </div>
    `);

    document.getElementById('prGoToLoginBtn')?.addEventListener('click', () => {
      restoreLoginCard();
      document.getElementById('loginPassword')?.focus();
    });
  }

  function renderResetForm(token) {
    showResetCard(`
      <div class="login-kicker">${text('SEGURANÇA DA CONTA', 'ACCOUNT SECURITY')}</div>
      <h2>${text('Redefinir sua senha', 'Reset your password')}</h2>
      <p>${text('Crie uma nova senha segura para acessar o seu workspace.', 'Create a secure new password to access your workspace.')}</p>

      <form id="resetPasswordForm" class="login-form">
        <div class="login-field password-field">
          <label for="newPassword">${text('Nova senha', 'New password')}</label>
          <div class="password-input">
            <span aria-hidden="true" class="login-input-icon">🔒</span>
            <input id="newPassword" type="password" placeholder="••••••••••" autocomplete="new-password" required minlength="10">
            <button id="revealNewPassword" type="button" class="password-visibility" aria-label="${text('Mostrar senha', 'Show password')}">◉</button>
          </div>
        </div>

        <div class="login-field password-field">
          <label for="confirmNewPassword">${text('Confirmar nova senha', 'Confirm new password')}</label>
          <div class="password-input">
            <span aria-hidden="true" class="login-input-icon">🔒</span>
            <input id="confirmNewPassword" type="password" placeholder="••••••••••" autocomplete="new-password" required minlength="10">
            <button id="revealConfirmPassword" type="button" class="password-visibility" aria-label="${text('Mostrar senha', 'Show password')}">◉</button>
          </div>
        </div>

        <p class="password-policy-hint">
          ${text('A senha precisa ter no mínimo 10 caracteres.', 'The password must contain at least 10 characters.')}
        </p>

        <button class="login-submit" type="submit" id="submitResetPassword">
          <span>${text('Redefinir senha', 'Reset password')}</span>
          <span class="submit-arrow" aria-hidden="true">→</span>
        </button>

        <p class="pr-feedback" id="prFormFeedback" aria-live="polite"></p>

        <div style="text-align: center;">
          <button type="button" class="reset-back-btn" id="prBackToLoginLink">
            ${text('← Voltar ao login', '← Back to login')}
          </button>
        </div>
      </form>
    `);

    setupPasswordToggle('newPassword', 'revealNewPassword');
    setupPasswordToggle('confirmNewPassword', 'revealConfirmPassword');

    document.getElementById('prBackToLoginLink')?.addEventListener('click', restoreLoginCard);

    const form = document.getElementById('resetPasswordForm');
    const feedback = document.getElementById('prFormFeedback');
    const submitBtn = document.getElementById('submitResetPassword');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const p1 = document.getElementById('newPassword')?.value || '';
      const p2 = document.getElementById('confirmNewPassword')?.value || '';

      if (feedback) {
        feedback.textContent = '';
        feedback.className = 'pr-feedback';
      }

      if (p1.length < 10) {
        if (feedback) {
          feedback.textContent = text('A senha precisa ter ao menos 10 caracteres.', 'Password must be at least 10 characters long.');
          feedback.className = 'pr-feedback error';
        }
        document.getElementById('newPassword')?.focus();
        return;
      }

      if (p1 !== p2) {
        if (feedback) {
          feedback.textContent = text('As senhas não coincidem.', 'Passwords do not match.');
          feedback.className = 'pr-feedback error';
        }
        document.getElementById('confirmNewPassword')?.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        const span = submitBtn.querySelector('span:first-child');
        if (span) span.textContent = text('Salvando nova senha…', 'Saving new password…');
      }

      try {
        const api = window.healthyTrendApi;
        if (api && typeof api.request === 'function') {
          await api.request('/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, newPassword: p1 })
          });
        } else {
          const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword: p1 })
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json.error || 'Falha ao redefinir senha.');
        }

        renderResetSuccessView();
      } catch (err) {
        if (feedback) {
          feedback.textContent = err.message || text('Não foi possível redefinir a senha.', 'Unable to reset password.');
          feedback.className = 'pr-feedback error';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          const span = submitBtn.querySelector('span:first-child');
          if (span) span.textContent = text('Redefinir senha', 'Reset password');
        }
      }
    });
  }

  async function initializeResetPasswordFlowIfTokenPresent() {
    const token = getResetTokenFromUrl();
    if (!token) return;

    // Show loading skeleton / temporary message
    showResetCard(`
      <div class="pr-status-view">
        <p style="color:#9ca3af;">${text('Verificando link de recuperação…', 'Verifying recovery link…')}</p>
      </div>
    `);

    try {
      let result;
      const api = window.healthyTrendApi;
      if (api && typeof api.request === 'function') {
        result = await api.request(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
      } else {
        const res = await fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
        result = await res.json().catch(() => ({}));
      }

      if (result?.valid) {
        renderResetForm(token);
      } else {
        renderInvalidOrExpiredTokenView();
      }
    } catch (_) {
      renderInvalidOrExpiredTokenView();
    }
  }

  function init() {
    const emailInput = document.getElementById('loginEmail');
    if (emailInput) {
      emailInput.addEventListener('input', clearEmailInlineError);
    }

    const forgotBtn = document.querySelector('.login-forgot-btn');
    if (forgotBtn) {
      forgotBtn.addEventListener('click', handleForgotPasswordClick);
    }

    initializeResetPasswordFlowIfTokenPresent();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export globally for testing or manual invocation
  window.healthyTrendPasswordRecovery = {
    handleForgotPasswordClick,
    openConfirmationModal,
    showEmailInlineError,
    clearEmailInlineError
  };
})();
