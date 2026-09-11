(() => {
  const text = (pt, en) => window.appLanguage === 'en-US' ? en : pt;
  const plans = {
    TRIAL: { icon: '🧪', title: () => text('Trial · 7 dias', 'Trial · 7 days'), description: () => text('Acesso completo por 7 dias. A validade é controlada pelo servidor.', 'Full access for 7 days. Validity is controlled by the server.'), tag: () => text('EXPERIMENTE', 'TRY IT') },
    BASIC: { icon: '🌱', title: () => text('Plano Básico', 'Basic plan'), description: () => text('O essencial para planejar e gerir as suas operações.', 'The essentials to plan and manage your trades.') },
    PROFESSIONAL: { icon: '💎', title: () => text('Plano Profissional', 'Professional plan'), description: () => text('A experiência completa: inteligência, processo e performance.', 'The complete experience: intelligence, process and performance.'), tag: () => text('COMPLETO', 'COMPLETE') }
  };
  let selectedPlan = null;
  function close() { document.getElementById('signupLayer')?.remove(); selectedPlan = null; }
  function planPicker() {
    return `<div class="signup-plan-grid">${Object.entries(plans).map(([id, plan]) => `<button class="signup-plan ${id.toLowerCase()}" type="button" data-signup-plan="${id}"><span class="signup-plan-icon">${plan.icon}</span>${plan.tag ? `<span class="signup-plan-tag">${plan.tag()}</span>` : ''}<strong>${plan.title()}</strong><small>${plan.description()}</small><span class="signup-plan-arrow">→</span></button>`).join('')}</div>`;
  }
  function form() {
    const plan = plans[selectedPlan];
    return `<button type="button" class="signup-back" data-signup-back>← ${text('Voltar aos planos', 'Back to plans')}</button><p class="signup-selected-plan">${text('Plano escolhido:', 'Selected plan:')} <b>${plan.icon} ${plan.title()}</b></p><form id="signupForm"><div class="signup-form-grid"><div class="signup-field full"><label for="signupName">${text('Nome', 'Name')}</label><input id="signupName" name="name" autocomplete="name" required maxlength="120"></div><div class="signup-field full"><label for="signupEmail">E-mail</label><input id="signupEmail" name="email" type="email" autocomplete="email" required maxlength="254"></div><div class="signup-field"><label for="signupPassword">${text('Senha', 'Password')}</label><input id="signupPassword" name="password" type="password" autocomplete="new-password" required minlength="10"></div><div class="signup-field"><label for="signupPasswordConfirmation">${text('Confirmar senha', 'Confirm password')}</label><input id="signupPasswordConfirmation" type="password" autocomplete="new-password" required minlength="10"></div></div><label class="signup-terms"><input id="signupTerms" type="checkbox" required><span>${text('Li e aceito os Termos de Uso e a Política de Privacidade.', 'I have read and accept the Terms of Use and Privacy Policy.')}</span></label><button class="signup-submit" type="submit">${text('Criar minha conta', 'Create my account')}</button><p class="signup-message" aria-live="polite"></p></form>`;
  }
  function render() {
    const layer = document.getElementById('signupLayer'); if (!layer) return;
    layer.innerHTML = `<section class="signup-dialog" role="dialog" aria-modal="true" aria-labelledby="signupTitle"><header><button class="signup-close" type="button" aria-label="${text('Fechar', 'Close')}">×</button><div class="signup-kicker">${text('Healthy Trend Trader', 'Healthy Trend Trader')}</div><h2 id="signupTitle">${selectedPlan ? text('Crie a sua conta.', 'Create your account.') : text('Escolha como quer começar.', 'Choose how you want to start.')}</h2><p>${selectedPlan ? text('Seus dados e o plano escolhido serão registrados com segurança na sua conta.', 'Your details and selected plan will be securely registered to your account.') : text('Comece com um teste completo ou entre diretamente no plano que faz sentido para você.', 'Start with a full trial or go directly to the plan that fits you.')}</p></header><div class="signup-body">${selectedPlan ? form() : planPicker()}</div></section>`;
    layer.querySelector('.signup-close').addEventListener('click', close);
    layer.addEventListener('click', event => { if (event.target === layer) close(); });
    layer.querySelectorAll('[data-signup-plan]').forEach(button => button.addEventListener('click', () => { selectedPlan = button.dataset.signupPlan; render(); }));
    layer.querySelector('[data-signup-back]')?.addEventListener('click', () => { selectedPlan = null; render(); });
    layer.querySelector('#signupForm')?.addEventListener('submit', register);
    layer.querySelector(selectedPlan ? '#signupName' : '[data-signup-plan]')?.focus();
  }
  function open() { if (document.getElementById('signupLayer')) return; const layer = document.createElement('div'); layer.id = 'signupLayer'; layer.className = 'signup-layer'; document.body.append(layer); render(); }
  async function register(event) {
    event.preventDefault();
    const formElement = event.currentTarget, message = formElement.querySelector('.signup-message'), submit = formElement.querySelector('button[type="submit"]');
    const password = formElement.querySelector('#signupPassword').value, confirmation = formElement.querySelector('#signupPasswordConfirmation').value;
    if (password !== confirmation) { message.textContent = text('As senhas não coincidem.', 'Passwords do not match.'); return; }
    submit.disabled = true; submit.textContent = text('Criando conta…', 'Creating account…'); message.textContent = '';
    try {
      const result = await window.healthyTrendApi.request('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: formElement.querySelector('#signupName').value, email: formElement.querySelector('#signupEmail').value, password, planType: selectedPlan, acceptedTerms: formElement.querySelector('#signupTerms').checked }) });
      window.healthyTrendAuth.completeSession(result, true); close();
    } catch (error) { message.textContent = error.message || text('Não foi possível criar a conta.', 'Could not create the account.'); }
    finally { submit.disabled = false; submit.textContent = text('Criar minha conta', 'Create my account'); }
  }
  document.addEventListener('DOMContentLoaded', () => document.getElementById('openSignup')?.addEventListener('click', open));
})();
