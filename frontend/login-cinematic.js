(() => {
  const shell = document.getElementById('loginShell');
  if (!shell) return;

  const icon = paths => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  const paths = [
    '<path d="M3 21h18M5 18v-6h3v6M11 18V8h3v10M17 18V3h3v15"/>', // Análise (barras)
    '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z"/><path d="M12 8v5m0 3h.01"/>', // Gestão de risco (escudo)
    '<circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4"/><path d="m11 13 9-10m-4 0h4v4"/>' // Resultados (alvo)
  ];

  shell.querySelectorAll('.login-foot div>span').forEach((element, index) => {
    if (paths[index]) element.innerHTML = icon(paths[index]);
  });

  const revealBtn = shell.querySelector('#revealLoginPassword');
  if (revealBtn) {
    revealBtn.innerHTML = icon('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>');
  }

  function translateLogin() {
    const en = window.appLanguage === 'en-US';
    
    // Headline e textos
    const copy = shell.querySelector('.login-editorial');
    if (copy) {
      copy.innerHTML = en
        ? '<p>Your process. Your risk. Your decisions.</p><p>A workspace built to trade with intention.</p>'
        : '<p>Seu processo. Seu risco. Suas decisões.</p><p>Um workspace construído para operar com intenção.</p>';
    }

    // Pilares
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

    // Card texts
    const kicker = shell.querySelector('.login-kicker');
    if (kicker) kicker.textContent = en ? 'WELCOME BACK' : 'BEM-VINDO DE VOLTA';

    const title = shell.querySelector('.login-card h2');
    if (title) title.textContent = en ? 'Access your workspace' : 'Acesse seu workspace';

    const sub = shell.querySelector('.login-card>p');
    if (sub) sub.textContent = en ? 'Pick up where you left off and keep your method at the core of each decision.' : 'Continue de onde parou e mantenha seu método no centro de cada decisão.';

    const submitSpan = shell.querySelector('.login-submit span:first-child');
    if (submitSpan) submitSpan.textContent = en ? 'Enter workspace' : 'Entrar no workspace';

    const forgotBtn = shell.querySelector('.login-forgot-btn');
    if (forgotBtn) forgotBtn.textContent = en ? 'Forgot password' : 'Esqueci minha senha';

    // Seletores de idioma
    shell.querySelectorAll('[data-language-choice]').forEach(button => {
      const active = button.dataset.languageChoice === window.appLanguage;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    // Seletores de tema
    const currentTheme = document.body.dataset.theme === 'healthy' ? 'healthy' : 'gold';
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
