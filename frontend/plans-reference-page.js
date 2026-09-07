(function () {
  'use strict';
  let lastTrigger;
  const t = (pt, en) => subscriptionText(pt, en);

  function closeDetails() {
    const dialog = document.getElementById('plansReferenceDetails');
    if (dialog?.open) dialog.close();
  }

  function openDetails(section = 'plans-pricing') {
    const dialog = document.getElementById('plansReferenceDetails');
    if (!dialog) return;
    const content = dialog.querySelector('.plans-reference-details-content');
    lastTrigger = document.activeElement;
    const processGroups = {
      'process-market': ['Mercado', 'Market', ['marketmap', 'marketcycle', 'relativestrength', 'marketscans', 'fundamentals']],
      'process-decision': ['Decisão', 'Decision', ['rubric', 'risk', 'riskpolicy', 'portfolioheat']],
      'process-execution': ['Execução', 'Execution', ['today', 'newtrade', 'positions', 'positiondetail', 'dashboard']],
      'process-evolution': ['Evolução', 'Growth', ['analytics', 'journal', 'review', 'platformaccess', 'zen', 'habits', 'audiolibrary', 'wisdom', 'traderprofile']]
    };
    if (processGroups[section] || section.startsWith('features-')) {
      const group = processGroups[section];
      const basic = section === 'features-basic';
      const title = group ? t(group[0], group[1]) : basic ? 'Basic' : 'Professional';
      const inventory = getPlanFeatureInventory().filter(item => group ? group[2].includes(item.id) : !basic || !item.professional);
      content.innerHTML = `<section class="plans-reference-tools"><h2>${title}</h2><p>${t('Ferramentas disponíveis no produto atual. Selecione uma para abrir.', 'Tools available in the current product. Select one to open it.')}</p><ul>${inventory.map(item => `<li><button type="button" data-feature-route="${item.id === 'rubric' ? 'newtrade' : item.id}"><span>${item.label}</span><small>${item.professional ? 'Professional' : 'Basic + Professional'} →</small></button></li>`).join('')}</ul></section>`;
      content.querySelectorAll('[data-feature-route]').forEach(button => button.addEventListener('click', () => {
        closeDetails();
        go(button.dataset.featureRoute);
      }));
    } else if (section === 'depoimentos') {
      content.innerHTML = `<div class="plans-reference-empty"><h2>${t('Depoimentos', 'Testimonials')}</h2><p>${t('Ainda não há depoimentos publicados nesta versão.', 'There are no published testimonials in this version yet.')}</p></div>`;
    } else {
      renderAuditedPlan(content);
      content.querySelectorAll('.plans-hero,.plans-process,.plans-closing').forEach(element => element.remove());
    }
    if (!dialog.open) dialog.showModal();
    const target = content.querySelector(`#${section}`);
    if (target) dialog.scrollTop = target.offsetTop - 80;
    else dialog.scrollTop = 0;
  }

  function scrollReference(fraction) {
    const frame = document.getElementById('plansReferenceFrame');
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const croppedFraction = (1536 * fraction - 45) / 1491;
    window.scrollTo({ top: Math.max(0, window.scrollY + rect.top + rect.height * croppedFraction - 85), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  window.addEventListener('message', event => {
    const frame = document.getElementById('plansReferenceFrame');
    if (!frame || event.source !== frame.contentWindow || event.origin !== window.location.origin || event.data?.type !== 'healthy-plans-reference') return;
    switch (event.data.action) {
      case 'ready': frame.contentWindow.postMessage({ type: 'healthy-plans-state', plan: subscriptionState.plan, trialActive: trialIsActive() }, window.location.origin === 'null' ? '*' : window.location.origin); break;
      case 'process-market': case 'process-decision': case 'process-execution': case 'process-evolution':
      case 'features-basic': case 'features-professional': openDetails(event.data.action); break;
      case 'solucao': scrollReference(0.253); break;
      case 'planos': case 'comecar': scrollReference(0.678); break;
      case 'professional': openDetails('plans-comparison'); break;
      case 'faq': openDetails('plans-pricing'); break;
      case 'depoimentos': openDetails('depoimentos'); break;
      case 'entrar': go('today'); break;
      case 'choose-basic': setSubscriptionPlan('basic'); openDetails(); break;
      case 'choose-professional': setSubscriptionPlan('professional'); openDetails(); break;
    }
  });

  window.renderPlan = function () {
    syncSubscriptionMonth();
    const root = document.getElementById('plan');
    if (!root) return;
    const previousDialog = root.querySelector('#plansReferenceDetails');
    if (previousDialog?.open) previousDialog.close();
    root.innerHTML = `<div class="plans-reference-shell"><iframe id="plansReferenceFrame" class="plans-reference-frame" src="frontend/plans-reference.html" title="Healthy Trend Trader — ${t('Planos', 'Plans')}" scrolling="no"></iframe></div>
      <dialog id="plansReferenceDetails" class="plans-reference-details" aria-label="${t('Planos, recursos e assinatura', 'Plans, features and subscription')}"><header><span>${t('Seu plano e os recursos disponíveis', 'Your plan and available features')}</span><button type="button" class="plans-reference-close">${t('Fechar', 'Close')} ×</button></header><div class="plans-reference-details-content"></div></dialog>`;
    const dialog = root.querySelector('#plansReferenceDetails');
    root.querySelector('.plans-reference-close').addEventListener('click', closeDetails);
    dialog.addEventListener('close', () => {
      if (lastTrigger?.isConnected) lastTrigger.focus({ preventScroll: true });
    });
    applySubscriptionAccess();
  };
}());
