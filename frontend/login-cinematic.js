(() => {
  const shell = document.getElementById('loginShell');
  if (!shell) return;
  const icon = paths => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  const paths = ['<path d="M3 21h18M5 18v-6h3v6M11 18V8h3v10M17 18V3h3v15"/>', '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z"/><path d="M12 8v5m0 3h.01"/>', '<circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4"/><path d="m11 13 9-10m-4 0h4v4"/>'];
  shell.querySelectorAll('.login-foot div>span').forEach((element,index) => element.innerHTML = icon(paths[index]));
  shell.querySelector('#revealLoginPassword').innerHTML = icon('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>');
  function translateLogin() {
    const en = window.appLanguage === 'en-US';
    const copy = shell.querySelector('.login-editorial');
    copy.innerHTML = en ? '<p>Your process. Your risk. Your decisions.</p><p>A workspace built to trade<br>with intention.</p>' : '<p>Seu processo. Seu risco. Suas decisões.</p><p>Um workspace construído para operar<br>com intenção.</p>';
    const labels = en ? [['ANALYSIS','with method'],['RISK MANAGEMENT','with discipline'],['RESULTS','over the long term']] : [['ANÁLISE','com método'],['GESTÃO DE RISCO','com disciplina'],['RESULTADOS','no longo prazo']];
    shell.querySelectorAll('.login-foot>div').forEach((element,index) => {element.querySelector('b').textContent=labels[index][0];element.querySelector('small').textContent=labels[index][1];});
    shell.querySelectorAll('.login-mantra>span').forEach((element,index) => element.textContent=(en?['PLAN','PROCESS','DISCIPLINE','FREEDOM']:['PLANO','PROCESSO','DISCIPLINA','LIBERDADE'])[index]);
    // Keep the existing button instance so the signup handler registered by
    // signup.js remains connected after a language change.
    const signupPrompt = shell.querySelector('.login-signup-prompt');
    const signupButton = shell.querySelector('#openSignup');
    if (signupPrompt && signupButton) {
      const prefix = en ? 'New here? ' : 'Novo por aqui? ';
      const prefixElement = signupPrompt.querySelector('.login-signup-prefix');
      if (prefixElement) prefixElement.textContent = prefix;
      signupButton.textContent = en ? 'Create your account' : 'Crie sua conta';
    }
    shell.querySelectorAll('[data-theme-choice]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.themeChoice === document.body.dataset.theme)));
    shell.querySelectorAll('[data-language-choice]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.languageChoice === window.appLanguage)));
  }
  const previousLanguage = window.applyLanguage;
  window.applyLanguage = function (...args) { const result=previousLanguage.apply(this,args);translateLogin();return result; };
  // Other product modules also decorate applyLanguage. Run once after the
  // language button's inline handler so this copy stays in sync regardless of
  // the order those modules were loaded.
  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-language-choice]')) setTimeout(translateLogin, 0);
  }, true);
  new MutationObserver(translateLogin).observe(document.body,{attributes:true,attributeFilter:['data-theme']});
  const feedback = document.createElement('p');
  feedback.id='loginMessage';feedback.className='login-demo';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  if(!document.getElementById('loginMessage')) shell.querySelector('.login-form').append(feedback);
  translateLogin();
})();
