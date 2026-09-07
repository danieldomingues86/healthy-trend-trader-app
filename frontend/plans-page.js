(function () {
  'use strict';
  const t = (pt, en) => subscriptionText(pt, en);
  // Route membership follows the actual navigation guard, not marketing tiers.
  const features = [
    ['today', 'Hoje', 'Today'], ['newtrade', 'Novo Trade e registro de trades', 'New Trade and trade records'],
    ['positions', 'Posições e histórico', 'Positions and history'], ['positiondetail', 'Gestão da posição', 'Position management'],
    ['risk', 'Position Sizing', 'Position Sizing'], ['rubric', 'Trading Rubric', 'Trading Rubric'],
    ['riskpolicy', 'Política de Risco', 'Risk Policy'], ['dashboard', 'Patrimônio', 'Wealth'],
    ['portfolioheat', 'Portfolio Heat', 'Portfolio Heat'], ['fundamentals', 'Análise Fundamentalista', 'Fundamental Analysis'],
    ['marketmap', 'Panorama de Mercado', 'Market Overview'], ['marketcycle', 'Ciclo de Mercado', 'Market Cycle'],
    ['relativestrength', 'Força Relativa', 'Relative Strength'], ['marketscans', 'Scans de Mercado', 'Market Scans'],
    ['analytics', 'Analytics · Painel da Verdade', 'Analytics · Truth Panel'], ['journal', 'Diário do Trader', 'Trader Journal'],
    ['review', 'Revisão Semanal', 'Weekly Review'], ['platformaccess', 'Uso da plataforma e Monitor do Profit', 'Platform usage and Profit Monitor'],
    ['zen', 'Trader Zen e Biblioteca Mental', 'Trader Zen and Mental Library'], ['habits', 'Monitor de Hábitos', 'Habit Tracker'],
    ['wisdom', 'Sabedoria do Trader', 'Trader Wisdom'],
    ['traderprofile', 'Perfil do Trader', 'Trader Profile'], ['manual', 'Manual do software', 'Software Manual'],
    ['glossary', 'Glossário do método', 'Method Glossary'], ['materials', 'Healthy Trend Trader Materials · compras separadas', 'Healthy Trend Trader Materials · separate purchases'], ['settings', 'Configurações gerais', 'General settings'],
    ['profile', 'Meus Dados', 'My Details'], ['avatar', 'Avatar', 'Avatar']
  ];
  window.getPlanFeatureInventory = () => features.map(([id, pt, en]) => ({ id, label: t(pt, en), professional: professionalPages.has(id) }));
  const icon = (kind) => {
    const paths = {
      market: '<path d="M5 27V18h4v9M14 27V11h4v16M23 27V4h4v23"/>',
      decision: '<circle cx="16" cy="17" r="10"/><circle cx="16" cy="17" r="4"/><path d="m16 17 12-13M22 4h6v6"/>',
      execution: '<path d="m18 3-12 16h9l-2 10 13-17h-9z"/>',
      growth: '<path d="M16 29V17M16 21C5 23 3 13 3 7c9 0 14 4 13 14ZM16 17C15 7 22 3 29 3c0 9-4 15-13 14Z"/>'
    };
    return `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind]}</svg>`;
  };
  const list = (items) => `<ul class="plans-list">${items.map(item => `<li><span aria-hidden="true">✓</span>${item}</li>`).join('')}</ul>`;
  const names = (ids) => features.filter(([id]) => ids.includes(id)).map(([, pt, en]) => t(pt, en)).join(' · ');
  function comparison(plan) {
    const included = features.filter(([id]) => professionalPages.has(id) === (plan === 'professional'));
    return included.map(([id, pt, en]) => `<li data-plan-feature="${id}"><span aria-hidden="true">✓</span>${t(pt, en)}</li>`).join('');
  }
  function trialNotice() {
    if (trialIsActive()) return `<div class="plans-trial"><span class="plans-trial-days">${trialDaysRemaining()}<small>${t('dias', 'days')}</small></span><div><b>${t('Seu teste Professional está ativo.', 'Your Professional trial is active.')}</b><p>${t('Explore o processo completo antes de escolher seu plano.', 'Explore the complete process before choosing your plan.')}</p></div></div>`;
    if (!subscriptionState.trialUsed && !trialIsExpired()) return `<div class="plans-trial"><div><b>${t('Conheça o Professional por 7 dias grátis.', 'Try Professional free for 7 days.')}</b><p>${t('Explore todas as ferramentas antes de decidir.', 'Explore every tool before deciding.')}</p></div><button class="plans-action plans-action-outline" type="button" onclick="startFreeTrial()">${t('Ativar teste grátis', 'Start free trial')}</button></div>`;
    if (trialIsExpired()) return `<div class="plans-trial"><div><b>${t('Seu teste grátis chegou ao fim.', 'Your free trial has ended.')}</b><p>${t('Escolha seu plano para continuar. Seus registros estão preservados.', 'Choose your plan to continue. Your records are preserved.')}</p></div></div>`;
    return '';
  }
  function priceCard(plan) {
    const pro = plan === 'professional';
    const current = subscriptionState.plan === plan;
    const benefits = pro ? [t('Tudo do Basic', 'Everything in Basic'), t('Inteligência de mercado', 'Market intelligence'), t('Risco integrado ao contexto', 'Risk connected to context'), t('Revisão e analytics', 'Reviews and analytics'), t('Hábitos e performance', 'Habits and performance'), t('Novos trades ilimitados', 'Unlimited new trades')]
      : [t('Registro e gestão de trades', 'Trade records and management'), 'Position Sizing', t('Histórico de posições', 'Position history'), t('Até 50 novos trades por mês', 'Up to 50 new trades per month')];
    return `<article class="subscription-plan plans-price-card ${pro ? 'professional' : ''}" aria-labelledby="plans-${plan}-title">
      ${pro ? `<span class="plans-popular">${t('MAIS ESCOLHIDO', 'MOST POPULAR')}</span>` : ''}
      <div class="plans-tier"><img src="assets/favicon.svg" width="28" height="28" alt="">${pro ? 'PROFESSIONAL' : 'BASIC'}</div>
      <h3 id="plans-${plan}-title">${pro ? t('Conecte todo o seu processo.', 'Connect your entire process.') : t('Organize e execute.', 'Organise and execute.')}</h3>
      <div class="plans-price"><strong>R$ ${pro ? '69' : '29'}</strong><span>${t('/mês', '/month')}</span></div>
      <p class="plans-annual">${pro ? t('Anual: R$ 662,40 · R$ 55,20/mês', 'Annual: R$ 662.40 · R$ 55.20/month') : t('Anual: R$ 278,40 · R$ 23,20/mês', 'Annual: R$ 278.40 · R$ 23.20/month')} · ${t('20% de desconto', '20% off')}</p>
      ${list(benefits)}
      <div class="plans-current">${current ? t('✓ Seu plano atual', '✓ Your current plan') : pro && trialIsActive() ? t('Você está experimentando este plano', 'You are trying this plan') : ''}</div>
      <button class="plans-action ${pro ? '' : 'plans-action-outline'}" type="button" ${current ? 'disabled' : ''} onclick="setSubscriptionPlan('${plan}')">${current ? t('Plano atual', 'Current plan') : pro ? t('Desbloquear Professional', 'Unlock Professional') : t('Escolher Basic', 'Choose Basic')}${pro && !current ? '<span aria-hidden="true">→</span>' : ''}</button>
    </article>`;
  }
  window.renderAuditedPlan = function (targetRoot) {
    syncSubscriptionMonth();
    const root = targetRoot || document.getElementById('plan');
    if (!root) return;
    const steps = [
      ['market', t('Mercado', 'Market'), t('Entenda o ambiente antes de operar.', 'Understand the environment before trading.'), ['marketmap', 'marketcycle', 'relativestrength', 'marketscans', 'fundamentals']],
      ['decision', t('Decisão', 'Decision'), t('Transforme contexto em risco calculado.', 'Turn context into calculated risk.'), ['rubric', 'risk', 'riskpolicy', 'portfolioheat']],
      ['execution', t('Execução', 'Execution'), t('Opere com processo e disciplina.', 'Trade with process and discipline.'), ['today', 'newtrade', 'positions', 'dashboard']],
      ['growth', t('Evolução', 'Growth'), t('Aprenda, ajuste e evolua.', 'Learn, adjust and grow.'), ['journal', 'review', 'analytics', 'zen', 'habits', 'audiolibrary', 'wisdom', 'traderprofile', 'platformaccess']]
    ];
    root.innerHTML = `<div class="plans-landing">
      <section class="plans-hero" aria-labelledby="plans-heading">
        <div class="plans-hero-copy"><p class="plans-eyebrow">${t('Disciplina hoje. Liberdade amanhã.', 'Discipline today. Freedom tomorrow.')}</p>
        <h1 id="plans-heading">${t('Trading não precisa de mais ruído.', 'Trading does not need more noise.')}<em>${t('Precisa de um processo conectado.', 'It needs a connected process.')}</em></h1>
        <p class="plans-lead">${t('O Healthy Trend Trader reúne tudo que você precisa para operar com mais clareza, disciplina e performance em um único workspace.', 'Healthy Trend Trader brings together everything you need to trade with more clarity, discipline and performance in one workspace.')}</p>
        <button type="button" class="plans-action" data-plans-scroll="plans-comparison">${t('Conhecer o Professional', 'Discover Professional')}<span aria-hidden="true">→</span></button>
        <div class="plans-hero-benefits"><span>${icon('decision')}${t('Processo real,<br>no seu dia a dia', 'A real process,<br>every day')}</span><span>${icon('market')}${t('Mais foco<br>e disciplina', 'More focus<br>and discipline')}</span><span>${icon('growth')}${t('Evolução<br>contínua', 'Continuous<br>growth')}</span></div></div>
        <p class="plans-hero-quote">“${t('Consistência é<br>a verdadeira vantagem.', 'Consistency is<br>the true advantage.')}”</p>
        <span class="plans-landscape-caption">${t('Seu processo.<br>Um novo horizonte.', 'Your process.<br>A new horizon.')}</span>
      </section>
      <section class="plans-process" aria-labelledby="plans-process-title"><div class="plans-section-intro"><p class="plans-eyebrow">${t('Um ecossistema completo', 'A complete ecosystem')}</p><h2 id="plans-process-title">${t('Do cenário ao resultado.', 'From context to results.')}<em>${t('Tudo se conecta.', 'Everything connects.')}</em></h2><p>${t('Um fluxo simples e poderoso para transformar contexto em melhores decisões, execução disciplinada e evolução contínua.', 'A simple, powerful flow for turning context into better decisions, disciplined execution and continuous growth.')}</p></div>
        <div class="plans-process-map"><ol>${steps.map(([symbol, title, copy], index) => `<li><div class="plans-process-orbit">${icon(symbol)}<h3>${index + 1}. ${title}</h3><p>${copy}</p></div></li>`).join('')}</ol><p class="plans-map-signature"><img src="assets/favicon.svg" width="32" height="32" alt="">Healthy Trend Trader<span>${t('Seu processo em um só lugar', 'Your process in one place')}</span></p></div>
        <details class="plans-process-details"><summary>${t('Explore as ferramentas de cada etapa', 'Explore the tools in each stage')}<span aria-hidden="true">＋</span></summary><div>${steps.map(([, title, , ids]) => `<section><h3>${title}</h3><p>${names(ids)}</p></section>`).join('')}</div></details>
      </section>
      <section class="plans-comparison" id="plans-comparison" tabindex="-1" aria-labelledby="plans-comparison-title"><div class="plans-section-intro"><p class="plans-eyebrow">${t('Duas experiências. O mesmo propósito.', 'Two experiences. One purpose.')}</p><h2 id="plans-comparison-title">${t('Escolha o nível que te leva mais longe.', 'Choose the level that takes you further.')}</h2><p>${t('O Basic já ajuda você a organizar e executar. O Professional conecta todo o seu processo para você ir além.', 'Basic already helps you organise and execute. Professional connects your entire process so you can go further.')}</p><p class="plans-handwritten">${t('Mais ferramentas.<br>Mais clareza.<br>Mais contexto.<br>Mais controle.', 'More tools.<br>More clarity.<br>More context.<br>More control.')}</p></div>
        <article class="plans-experience plans-experience-basic"><span class="plans-label">BASIC</span><h3>${t('Comece com o essencial.', 'Start with the essentials.')}</h3><p class="plans-experience-lead">${t('Uma base sólida para organizar sua operação.', 'A solid foundation for organising your trading.')}</p><ul class="plans-list plans-feature-inventory">${comparison('basic')}</ul><p class="plans-experience-footer">${t('Ideal para quem está começando e quer mais organização.', 'Ideal for those getting started who want more organisation.')}</p></article>
        <article class="plans-experience plans-experience-pro"><span class="plans-label">PROFESSIONAL</span><h3>${t('Todo o seu processo,<br>sem limites.', 'Your entire process,<br>without limits.')}</h3><p class="plans-experience-lead">${t('Tudo do Basic + novos trades ilimitados.', 'Everything in Basic + unlimited new trades.')}</p><ul class="plans-list plans-feature-inventory">${comparison('professional')}</ul><p class="plans-experience-footer">${t('Para quem busca mais contexto, consistência, evolução e controle sobre o próprio processo.', 'For those seeking more context, consistency, growth and control over their own process.')}</p></article>
      </section>
      <section class="plans-pricing" id="plans-pricing" tabindex="-1" aria-labelledby="plans-pricing-title"><div class="plans-section-intro"><p class="plans-eyebrow">${t('Planos', 'Plans')}</p><h2 id="plans-pricing-title">${t('Escolha o plano ideal para a sua jornada.', 'Choose the right plan for your journey.')}</h2><p>${t('Mesma filosofia. Diferentes níveis de poder. Comece com o essencial e evolua quando estiver pronto para mais.', 'One philosophy. Different levels of power. Start with the essentials and grow when you are ready for more.')}</p></div><div class="plans-pricing-content">${trialNotice()}<div class="plans-pricing-grid">${priceCard('basic')}${priceCard('professional')}</div>
        <div class="plans-account-status" role="status"><b>${t('Seu plano atual: ', 'Your current plan: ')}${planName()}</b><p>${trialIsExpired() ? t('Escolha um plano para retomar o acesso à plataforma.', 'Choose a plan to resume access to the platform.') : isProfessional() ? t('Acesso completo e novos registros ilimitados.', 'Full access and unlimited new records.') : t(`${subscriptionState.tradesUsed} de ${BASIC_MONTHLY_LIMIT} novos trades usados neste mês.`, `${subscriptionState.tradesUsed} of ${BASIC_MONTHLY_LIMIT} new trades used this month.`)}</p><p>${t('Consulta e gestão do histórico já registrado sem limite em ambos os planos.', 'Unlimited viewing and management of existing records in both plans.')}</p></div>
        <p class="plans-billing-note">${t('Nesta versão, a seleção do plano não gera cobrança. Sua escolha fica salva neste dispositivo.', 'In this version, selecting a plan does not charge you. Your choice is saved on this device.')}</p></div></section>
      <section class="plans-closing" aria-labelledby="plans-closing-title"><div><p class="plans-eyebrow">${t('Seu próximo nível', 'Your next level')}</p><h2 id="plans-closing-title">${t('Mais processo hoje.<br>Mais liberdade amanhã.', 'More process today.<br>More freedom tomorrow.')}</h2><p>${t('O Healthy Trend Trader é seu aliado para melhores decisões, resultados mais consistentes e uma vida mais equilibrada.', 'Healthy Trend Trader is your ally for better decisions, more consistent results and a more balanced life.')}</p><button class="plans-action" type="button" data-plans-scroll="plans-pricing">${t('Começar agora', 'Start now')}<span aria-hidden="true">→</span></button></div><p class="plans-closing-quote">${t('Disciplina hoje.<br>Liberdade amanhã.', 'Discipline today.<br>Freedom tomorrow.')}</p></section>
    </div>`;
    root.querySelectorAll('[data-plans-scroll]').forEach(button => button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.plansScroll);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    }));
    const processMap = root.querySelector('.plans-process-map');
    if (processMap) processMap.insertAdjacentHTML('afterbegin', `<svg class="plans-process-flow" viewBox="0 0 1000 330" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="plansFlowGreen"><stop stop-color="#2ad987" stop-opacity=".05"/><stop offset=".5" stop-color="#76edb0" stop-opacity=".6"/><stop offset="1" stop-color="#2ad987" stop-opacity=".05"/></linearGradient></defs>${Array.from({length: 14}, (_, i) => `<path d="M0 ${50+i*6} C250 ${-60+i*9}, 300 ${390-i*7}, 530 ${230-i*5} S800 ${-50+i*9}, 1000 ${90+i*7}"/>`).join('')}<path class="plans-flow-gold" d="M30 160 C210 40 280 310 460 230 S750 10 960 130"/></svg>`);
    applySubscriptionAccess();
  };
  window.renderPlan = window.renderAuditedPlan;
}());
