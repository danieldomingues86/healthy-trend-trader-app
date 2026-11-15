(() => {
  const shell = document.getElementById('loginShell');
  if (!shell) return;

  const icon = paths => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  const paths = [
    '<path d="M4 20v-5h3.5v5H4Zm6.25 0v-9h3.5v9h-3.5ZM16.5 20V5H20v15h-3.5Z"/>', // Análise (barras ascendentes)
    '<path d="M12 3 4 6.5v5.8c0 5.1 3.4 8.2 8 9.7 4.6-1.5 8-4.6 8-9.7V6.5L12 3Z"/><path d="m9 12.2 2.1 2.1 4.2-4.2"/>', // Gestão de risco (escudo com check)
    '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><path d="m15.5 8.5 5-5m-3.5 0h3.5v3.5"/>' // Resultados (alvo com seta)
  ];

  shell.querySelectorAll('.login-foot div>span').forEach((element, index) => {
    if (paths[index]) element.innerHTML = icon(paths[index]);
  });

  // Ícones vetoriais limpos nos campos de E-mail e Senha
  const emailIcon = shell.querySelector('.login-email-input .login-input-icon');
  if (emailIcon) {
    emailIcon.innerHTML = icon('<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6 8.5-6"/>');
  }
  const passIcon = shell.querySelector('.password-input .login-input-icon');
  if (passIcon) {
    passIcon.innerHTML = icon('<rect x="5" y="11" width="14" height="10" rx="2.2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>');
  }

  const eyeOpenSvg = icon('<path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>');
  const eyeClosedSvg = icon('<path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.2 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.2 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="2" y1="2" x2="22" y2="22"/>');

  const revealBtn = shell.querySelector('#revealLoginPassword');
  const passwordInput = shell.querySelector('#loginPassword');
  if (revealBtn) {
    revealBtn.innerHTML = eyeOpenSvg;
    ['pointerup', 'pointercancel', 'pointerleave', 'keyup', 'blur'].forEach(evtName => {
      revealBtn.addEventListener(evtName, (event) => {
        if (passwordInput?.dataset.toggledVisible === 'true') {
          event.stopImmediatePropagation();
          passwordInput.type = 'text';
        }
      }, true);
    });
    revealBtn.addEventListener('click', (event) => {
      event.preventDefault();
      if (!passwordInput) return;
      const isVisible = passwordInput.dataset.toggledVisible === 'true';
      if (isVisible) {
        passwordInput.dataset.toggledVisible = 'false';
        passwordInput.type = 'password';
        revealBtn.innerHTML = eyeOpenSvg;
      } else {
        passwordInput.dataset.toggledVisible = 'true';
        passwordInput.type = 'text';
        revealBtn.innerHTML = eyeClosedSvg;
      }
    });
  }

  function translateLogin() {
    const en = window.appLanguage === 'en-US';

    // Headline principal
    const headline = shell.querySelector('.login-headline-area h1');
    if (headline) {
      headline.innerHTML = en
        ? 'Clarity to decide.<br><em>Discipline to<br>endure.</em>'
        : 'Clareza para decidir.<br><em>Disciplina para<br>permanecer.</em>';
    }

    // Textos auxiliares
    const copy = shell.querySelector('.login-editorial');
    if (copy) {
      copy.innerHTML = en
        ? '<p>Your process. Your risk. Your decisions.</p><p>A workspace built to trade with intention.</p>'
        : '<p>Seu processo. Seu risco. Suas decisões.</p><p>Um workspace construído para operar com intenção.</p>';
    }

    // Três pilares institucionais
    const labels = en
      ? [['ANALYSIS', 'with method'], ['RISK MANAGEMENT', 'with discipline'], ['RESULTS', 'over the long term']]
      : [['ANÁLISE', 'com método'], ['GESTÃO DE RISCO', 'com disciplina'], ['RESULTADOS', 'no longo prazo']];

    shell.querySelectorAll('.login-foot>div').forEach((element, index) => {
      const b = element.querySelector('b');
      const small = element.querySelector('small');
      if (b && labels[index]) b.textContent = labels[index][0];
      if (small && labels[index]) small.textContent = labels[index][1];
    });

    // Prompt de cadastro
    const signupPrompt = shell.querySelector('.login-signup-prompt');
    const signupButton = shell.querySelector('#openSignup');
    if (signupPrompt && signupButton) {
      const prefix = en ? 'New here? ' : 'Novo por aqui? ';
      const prefixElement = signupPrompt.querySelector('.login-signup-prefix');
      if (prefixElement) prefixElement.textContent = prefix;
      signupButton.textContent = en ? 'Create your account' : 'Crie sua conta';
    }

    // Textos do Card de Autenticação
    const kicker = shell.querySelector('.login-kicker');
    if (kicker) kicker.textContent = en ? 'WELCOME BACK' : 'BEM-VINDO DE VOLTA';

    const title = shell.querySelector('.login-card h2');
    if (title) title.textContent = en ? 'Access your workspace' : 'Acesse seu workspace';

    const sub = shell.querySelector('.login-card>p');
    if (sub) sub.textContent = en
      ? 'Pick up where you left off and keep your method at the core of each decision.'
      : 'Continue de onde parou e mantenha seu método no centro de cada decisão.';

    const emailLabel = shell.querySelector('label[for="loginEmail"]');
    if (emailLabel) emailLabel.textContent = en ? 'Email' : 'E-mail';

    const emailInput = shell.querySelector('#loginEmail');
    if (emailInput) emailInput.placeholder = en ? 'you@email.com' : 'seu@email.com';

    const passLabel = shell.querySelector('label[for="loginPassword"]');
    if (passLabel) passLabel.textContent = en ? 'Password' : 'Senha';

    const submitSpan = shell.querySelector('.login-submit span:first-child');
    if (submitSpan) submitSpan.textContent = en ? 'Enter workspace' : 'Entrar no workspace';

    const rememberLabel = shell.querySelector('.login-remember-label');
    if (rememberLabel) {
      rememberLabel.textContent = en ? 'Stay signed in' : 'Manter conectado';
    } else {
      const metaLabel = shell.querySelector('.login-meta label');
      if (metaLabel && metaLabel.lastChild && metaLabel.lastChild.nodeType === 3) {
        metaLabel.lastChild.textContent = en ? ' Stay signed in' : ' Manter conectado';
      }
    }

    const forgotBtn = shell.querySelector('.login-forgot-btn');
    if (forgotBtn) forgotBtn.textContent = en ? 'Forgot password' : 'Esqueci minha senha';

    // Seletores de idioma
    shell.querySelectorAll('[data-language-choice]').forEach(button => {
      const active = button.dataset.languageChoice === window.appLanguage;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    // Seletores de paleta
    const currentTheme = ['healthy', 'gold', 'pigeon'].includes(document.body.dataset.theme) ? document.body.dataset.theme : 'healthy';
    shell.querySelectorAll('[data-theme-choice]').forEach(button => {
      const active = button.dataset.themeChoice === currentTheme;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  const previousLanguage = window.applyLanguage;
  if (typeof previousLanguage === 'function') {
    window.applyLanguage = function (...args) {
      const result = previousLanguage.apply(this, args);
      translateLogin();
      return result;
    };
  }

  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-language-choice]')) {
      setTimeout(translateLogin, 0);
    }
  }, true);

  new MutationObserver(translateLogin).observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });

  function syncShellVisibilityIsolation() {
    const isHidden = shell.classList.contains('hidden');
    if (typeof window.setWorkspaceAuthState === 'function') {
      const expected = isHidden ? 'authenticated' : 'unauthenticated';
      if (document.body.dataset.authState !== expected) {
        window.setWorkspaceAuthState(isHidden);
      }
      return;
    }
    const app = document.querySelector('.app');
    if (isHidden) {
      document.body.dataset.authState = 'authenticated';
      document.documentElement.dataset.authState = 'authenticated';
      if (app) {
        app.removeAttribute('hidden');
        app.removeAttribute('aria-hidden');
        app.removeAttribute('inert');
        app.style.display = '';
      }
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    } else {
      document.body.dataset.authState = 'unauthenticated';
      document.documentElement.dataset.authState = 'unauthenticated';
      if (app) {
        app.setAttribute('hidden', '');
        app.setAttribute('aria-hidden', 'true');
        app.setAttribute('inert', '');
        app.style.display = 'none';
      }
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }
  }

  new MutationObserver(syncShellVisibilityIsolation).observe(shell, { attributes: true, attributeFilter: ['class'] });
  syncShellVisibilityIsolation();

  const feedback = document.createElement('p');
  feedback.id = 'loginMessage';
  feedback.className = 'login-demo';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  if (!document.getElementById('loginMessage')) {
    shell.querySelector('.login-form')?.append(feedback);
  }

  translateLogin();
})();
