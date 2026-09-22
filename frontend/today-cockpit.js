(function () {
  const api = window.MARKET_DATA_API_URL || 'http://localhost:8787/api';
  let market = { cycle: null, ranking: null, scans: null, error: null };
  let loading = false;
  let loadedAt = 0;
  const dashboardStorageKey = 'healthy-home-widget-dashboard-v4';
  const dashboardLayoutVersion = 5;
  const widgetRegistry = window.HomeWidgetRegistry;
  const defaultWidgetLayout = window.DesktopLayout.normalize([], widgetRegistry.all());
  let layoutEngine = null;
  let pendingRender = false;
  let dashboardEditing = false;
  let galleryOpen = false;
  let widgetLayout = null;

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const pct = (value) => Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  const freshness = () => window.TodayCockpitModel.marketDataState({ source: market.cycle?.source || market.scans?.source, updatedAt: market.cycle?.updatedAt || market.scans?.updatedAt });
  const realPositions = () => (operationalState?.positions || []).filter((position) => position.mode === 'real' && !operationMetrics(position).closed);
  const heatLimit = () => typeof window.portfolioHeatLimitPct === 'function' ? window.portfolioHeatLimitPct() : 3;
  const heat = () => realPositions().reduce((total, position) => total + operationMetrics(position).riskPct, 0);
  const healthy = () => Boolean(market.cycle?.cycle && Number(market.cycle.cycle.price) > Number(market.cycle.cycle.ema20) && Number(market.cycle.cycle.price) > Number(market.cycle.cycle.ema200));
  const updateText = (value) => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'sem atualização disponível';
  const firstName = () => String(profileState?.name || 'Trader').trim().split(/\s+/)[0] || 'Trader';

  function renderCurrentDate() {
    // The header deliberately no longer exposes a current-date pill.
    document.getElementById('currentDatePill')?.remove();
  }

  function preparedPositions() {
    return realPositions().map((position) => ({ id: position.id, asset: position.asset, mode: position.mode, riskPct: operationMetrics(position).riskPct }));
  }

  function actionMarkup(action) {
    return `<section class="today-next-action"><div><small>SUA PRÓXIMA AÇÃO</small><h2>${esc(action.title)}</h2><p>${esc(action.detail)}</p></div><button type="button" data-next-action>${esc(action.action)} →</button></section>`;
  }

  function runAction(action) {
    if (action.page === 'position' && action.positionId) return openPosition(action.positionId);
    go(action.page);
  }

  function getWidgetLayout() {
    if (widgetLayout) return widgetLayout.map((item) => ({ ...item })).sort((left, right) => left.order - right.order);
    let source = [];
    try {
      const stored = JSON.parse(localStorage.getItem(dashboardStorageKey));
      // v4 and v5 share the key so existing selections/order survive the migration.
      if ([4, 5].includes(stored?.layoutVersion) && Array.isArray(stored.items)) source = stored.items;
    } catch (_) { /* Malformed storage falls back to the registry defaults. */ }
    widgetLayout = window.DesktopLayout.normalize(source, widgetRegistry.all());
    saveWidgetLayout(widgetLayout);
    return widgetLayout.map((item) => ({ ...item }));
  }

  function saveWidgetLayout(layout) {
    widgetLayout = window.DesktopLayout.normalize(layout, widgetRegistry.all());
    try { localStorage.setItem(dashboardStorageKey, JSON.stringify({ layoutVersion: dashboardLayoutVersion, items: widgetLayout })); } catch (_) { /* Storage can be unavailable in private contexts. */ }
  }

  function updateWidgetLayout(change) {
    const layout = getWidgetLayout();
    const next = change(layout)
      .sort((left, right) => left.order - right.order)
      .map((item, index) => ({ ...item, order: index }));
    saveWidgetLayout(next);
    render();
  }

  function widgetShell(item, widget, content) {
    const details = widget.route ? `<button class="dashboard-widget-details" type="button" data-widget-page="${esc(widget.route)}">Ver detalhes <span>→</span></button>` : '';
    const editControls = dashboardEditing ? `<div class="dashboard-widget-edit-controls" aria-label="Editar ${esc(widget.name)}"><span class="dashboard-widget-drag-handle" title="Arraste pelo cabeçalho para reorganizar">⠿</span><button type="button" class="danger" data-widget-remove="${item.id}" aria-label="Remover ${esc(widget.name)}">×</button></div>` : '';
    const edge = dashboardEditing ? `<span class="dashboard-widget-resize-handle" aria-label="Redimensionar ${esc(widget.name)}"></span>` : '';
    return `<article class="dashboard-widget" data-widget-id="${item.id}" data-columns="${item.columns}"><div class="desktop-widget-body"><header class="dashboard-widget-header"><div><span class="dashboard-widget-kicker">${esc(widget.category)}</span><h2>${esc(widget.name)}</h2></div>${editControls}</header><div class="dashboard-widget-content">${content}</div>${details}</div>${edge}</article>`;

  }

  function galleryMarkup(layout) {
    if (!galleryOpen) return '';
    const active = new Set(layout.filter((item) => item.active).map((item) => item.id));
    const cards = widgetRegistry.all().map((widget) => `<article class="widget-gallery-card"><span class="widget-gallery-icon">${widget.icon}</span><div><span class="widget-gallery-category">${esc(widget.category)}</span><h3>${esc(widget.name)}</h3><p>${esc(widget.description)}</p></div><div class="widget-gallery-card-footer"><span class="widget-gallery-state ${active.has(widget.id) ? 'active' : ''}">${active.has(widget.id) ? 'Adicionado' : 'Disponível'}</span><button type="button" data-widget-add="${widget.id}" ${active.has(widget.id) ? 'disabled' : ''}>${active.has(widget.id) ? 'Já está no painel' : 'Adicionar ao painel'}</button></div></article>`).join('');
    return `<div class="widget-gallery-backdrop" data-gallery-close><section class="widget-gallery" role="dialog" aria-modal="true" aria-label="Galeria de widgets" data-gallery-panel><header><div><span class="eyebrow">MONTE SEU TRADING DESKTOP</span><h2>Widget Gallery</h2><p>Escolha as informações que você quer ter à vista antes de entrar nas telas completas.</p></div><button type="button" class="widget-gallery-close" data-gallery-close aria-label="Fechar galeria">×</button></header><div class="widget-gallery-grid">${cards}</div></section></div>`;
  }

  function bindDashboard(root, action) {
    root.querySelector('[data-dashboard-edit]')?.addEventListener('click', () => { dashboardEditing = !dashboardEditing; render(); });
    root.querySelector('[data-dashboard-reset]')?.addEventListener('click', () => { saveWidgetLayout(defaultWidgetLayout); render(); });
    root.querySelector('[data-gallery-open]')?.addEventListener('click', () => { galleryOpen = true; render(); });
    root.querySelectorAll('[data-gallery-close]').forEach((button) => button.addEventListener('click', (event) => { if (event.target === button || button.matches('[data-gallery-close]')) { galleryOpen = false; render(); } }));
    root.querySelector('[data-gallery-panel]')?.addEventListener('click', (event) => event.stopPropagation());
    root.querySelectorAll('[data-widget-add]').forEach((button) => button.addEventListener('click', () => updateWidgetLayout((layout) => {
      const highestOrder = Math.max(-1, ...layout.filter((item) => item.active).map((item) => item.order));
      return layout.map((item) => item.id === button.dataset.widgetAdd ? { ...item, active: true, order: highestOrder + 1 } : item);
    })));
    root.querySelectorAll('[data-routine-toggle]').forEach((input) => input.addEventListener('change', () => { window.DailyRoutineController?.handleToggleItem(input.dataset.routineToggle); render(); }));
    root.querySelectorAll('[data-habit-toggle]').forEach((input) => input.addEventListener('change', () => { window.cycleHabitDay?.(input.dataset.habitToggle, new Date().getDate()); render(); }));
    root.querySelectorAll('[data-priority-toggle]').forEach((input) => input.addEventListener('change', () => { window.PersonalDesktopState.togglePriority(input.dataset.priorityToggle); render(); }));
    root.querySelectorAll('[data-priority-remove]').forEach((button) => button.addEventListener('click', () => { window.PersonalDesktopState.removePriority(button.dataset.priorityRemove); render(); }));
    root.querySelector('[data-priority-form]')?.addEventListener('submit', (event) => { event.preventDefault(); window.PersonalDesktopState.addPriority(event.currentTarget.querySelector('input').value.trim()); render(); });
    root.querySelector('[data-personal-notes]')?.addEventListener('input', (event) => window.PersonalDesktopState.update({ note: event.target.value }));
    root.querySelectorAll('[data-reminder-remove]').forEach((button) => button.addEventListener('click', () => { window.PersonalDesktopState.removeReminder(button.dataset.reminderRemove); render(); }));
    root.querySelector('[data-reminder-form]')?.addEventListener('submit', (event) => { event.preventDefault(); window.PersonalDesktopState.addReminder(event.currentTarget.querySelector('input').value.trim()); render(); });
    root.querySelector('[data-focus-title]')?.addEventListener('input', (event) => window.PersonalDesktopState.update({ focus: { ...window.PersonalDesktopState.get().focus, title: event.target.value } }));
    root.querySelector('[data-focus-text]')?.addEventListener('input', (event) => window.PersonalDesktopState.update({ focus: { ...window.PersonalDesktopState.get().focus, text: event.target.value } }));
    root.querySelectorAll('[data-widget-page]').forEach((button) => button.addEventListener('click', () => go(button.dataset.widgetPage)));
    root.querySelector('[data-dashboard-action]')?.addEventListener('click', () => runAction(action));
    root.querySelectorAll('[data-widget-remove]').forEach((button) => button.addEventListener('click', () => updateWidgetLayout((layout) => layout.map((item) => item.id === button.dataset.widgetRemove ? { ...item, active: false } : item))));
    layoutEngine = window.DesktopLayout.mount(root.querySelector('.dashboard-grid'), {
      editing: dashboardEditing,
      onCommit: visible => {
        const byId = new Map(visible.map(item => [item.id, item]));
        const inactive = getWidgetLayout().filter(item => !byId.has(item.id));
        saveWidgetLayout([
          ...visible.map(item => ({ ...item, active: true })),
          ...inactive.map((item, index) => ({ ...item, order: visible.length + index }))
        ]);
      },
      onIdle: () => { if (pendingRender) { pendingRender = false; render(); } }
    });
  }

  function renderTopHeat() {
    const actions = document.querySelector('.topbar .top-actions');
    if (!actions) return;
    let meter = document.getElementById('topHeatMeter');
    if (!meter) {
      meter = document.createElement('button');
      meter.type = 'button';
      meter.id = 'topHeatMeter';
      meter.className = 'top-heat-meter';
      meter.title = 'Abrir Portfolio Heat';
      meter.addEventListener('click', () => go('portfolioheat'));
      actions.prepend(meter);
    }
    const value = heat(), limit = heatLimit(), rawUsage = limit ? value / limit * 100 : 0, usage = Math.min(100, rawUsage);
    meter.classList.toggle('warn', rawUsage >= 80 && rawUsage < 100);
    meter.classList.toggle('critical', rawUsage >= 100);
    meter.innerHTML = `<span>HEAT</span><i><em style="width:${usage}%"></em></i><b>${pct(value)} / ${pct(limit)}</b>`;
  }

  function render() {
    if (layoutEngine?.busy) { pendingRender = true; return; }
    layoutEngine?.destroy();
    const root = document.getElementById('today');
    if (!root) return;
    root.classList.add('today-cockpit-page');
    const source = freshness();
    const scanSummary = window.TodayCockpitModel.summarizeScans(market.scans);
    const leaders = Array.isArray(market.ranking?.items) ? market.ranking.items.filter((item) => Number(item.score) >= 90).length : 0;
    const candidates = scanSummary.matches;
    const currentHeat = heat(), limit = heatLimit(), rawUsage = limit ? currentHeat / limit * 100 : 0, usage = Math.min(100, rawUsage);
    const heatExceeded = rawUsage >= 100;
    const heatWarning = !heatExceeded && rawUsage >= 80;
    const heatTitle = heatExceeded ? 'Portfolio Heat excedido' : heatWarning ? 'Portfolio Heat em alerta' : 'Risco sob controle';
    const heatDetail = heatExceeded ? 'O risco agregado ultrapassou o limite da política. Tome providência antes de assumir qualquer nova exposição.' : heatWarning ? 'O risco agregado está próximo do limite. Revise as posições antes de ampliar a exposição.' : 'Ongoing Risk das posições reais abertas, pelo mesmo cálculo da tela Portfolio Heat.';
    const heatStatus = heatExceeded ? '<span class="today-heat-status critical">HEAT EXCEDIDO · TOMAR PROVIDÊNCIA</span>' : heatWarning ? '<span class="today-heat-status warn">ALERTA · PRÓXIMO DO LIMITE</span>' : '';
    const positions = preparedPositions();
    const action = window.TodayCockpitModel.buildNextAction({ heat: currentHeat, heatLimit: limit, positions, drafts: operationalState?.drafts || [], healthyMarket: healthy(), opportunityCount: candidates });
    const portfolioContent = `<div class="dashboard-risk-state ${heatExceeded ? 'critical' : heatWarning ? 'warn' : ''}"><span>${heatExceeded ? 'HEAT EXCEDIDO' : heatWarning ? 'EM ALERTA' : 'RISCO SOB CONTROLE'}</span><strong>${pct(currentHeat)}</strong><small>de ${pct(limit)} permitido</small></div><p>${heatExceeded ? 'O risco agregado ultrapassou o limite da política.' : heatWarning ? 'O risco agregado está próximo do limite.' : 'Acompanhe o risco agregado das posições reais abertas.'}</p><div class="dashboard-progress"><i style="width:${usage}%"></i></div><div class="dashboard-facts"><span><b>${positions.length}</b> posições reais</span><span><b>${operationalState?.drafts?.length || 0}</b> planos salvos</span></div>`;
    const opportunitiesContent = loading && !market.ranking && !market.scans ? `<div class="dashboard-widget-state">Carregando leitura de mercado…</div>` : `<p>Leituras compactas dos filtros atuais; a decisão completa continua nas telas oficiais.</p><div class="dashboard-opportunity-metrics"><div><strong>${market.ranking ? leaders : '—'}</strong><span>Líderes RS</span></div><div><strong>${market.scans ? candidates : '—'}</strong><span>Ativos nos scans</span></div><div><strong>${market.scans ? scanSummary.available : '—'}</strong><span>Scans ativos</span></div></div>`;
    const actionContent = `<span class="dashboard-action-kind">${esc(action.kind)}</span><h3>${esc(action.title)}</h3><p>${esc(action.detail)}</p><button class="dashboard-primary-action" type="button" data-dashboard-action>${esc(action.action)} <span>→</span></button>`;
    const rankingItems = Array.isArray(market.ranking?.items) ? market.ranking.items.slice(0, 3) : [];
    const watchlistItems = Array.isArray(operationalState?.watchlist) ? operationalState.watchlist.slice(0, 3) : [];
    const challenge = window.CourageChallengeModel?.getState?.();
    const attemptSummary = challenge ? window.CourageChallengeModel?.calculateChallengeMetrics?.(challenge) : null;
    const personal = window.PersonalDesktopState.get();
    const routine = window.DailyRoutineModel?.getTodayRoutineState?.();
    const routineItems = Array.isArray(routine?.items) ? routine.items : [];
    const habits = Array.isArray(window.habitState?.habits) ? window.habitState.habits : [];
    const empty = (message) => `<div class="dashboard-widget-state">${esc(message)}</div>`;
    const renderContext = {
      renderPortfolio: () => portfolioContent,
      renderOpportunities: () => opportunitiesContent,
      renderNextAction: () => actionContent,
      renderRelativeStrength: () => rankingItems.length ? `<div class="dashboard-rs-list">${rankingItems.map((item, index) => `<div><span>${index + 1}</span><b>${esc(item.symbol || item.ticker || '—')}</b><strong>${Number(item.score || 0).toFixed(0)}</strong></div>`).join('')}</div>` : empty('O ranking de Relative Strength ainda não está disponível.'),
      renderMarketCycle: () => market.cycle?.cycle ? `<div class="dashboard-cycle ${healthy() ? 'healthy' : 'defensive'}"><strong>${healthy() ? 'SAUDÁVEL' : 'DEFENSIVO'}</strong><span>IBOV ${pct((Number(market.cycle.cycle.price || 0) / Number(market.cycle.cycle.ema20 || 1) - 1) * 100)} vs. média de 20 dias</span></div>` : empty('A leitura do Ciclo de Mercado ainda não está disponível.'),
      renderWatchlist: () => watchlistItems.length ? `<div class="dashboard-watchlist">${watchlistItems.map((item) => `<span><b>${esc(item.symbol || item.ticker || item.asset || '—')}</b>${esc(item.status || item.stage || 'Em acompanhamento')}</span>`).join('')}</div>` : empty('Nenhum ativo na Watchlist exige atenção agora.'),
      renderWealth: () => typeof window.portfolioHeatSnapshot === 'function' ? `<div class="dashboard-wealth"><span>Portfolio Heat</span><strong>${pct(window.portfolioHeatSnapshot()?.heat || 0)}</strong><small>Use a tela de Patrimônio para a evolução completa.</small></div>` : empty('Ainda não há uma leitura de patrimônio disponível.'),
      renderChallenge: () => window.CourageChallengeModel?.isChallengeActive?.(challenge) ? `<div class="dashboard-challenge"><strong>${attemptSummary?.correctExecutions || 0} / ${attemptSummary?.targetGoal || challenge?.targetGoal || 0}</strong><span>operações dentro do sizing correto</span><small>Under ${attemptSummary?.underSizingCount || 0} · Over ${attemptSummary?.overSizingCount || 0}</small></div>` : empty('Nenhum Desafio A/A+ está ativo no momento.')
      ,renderChecklist: () => routineItems.length ? `<div class="personal-checklist">${routineItems.slice(0,6).map(item => `<label><input type="checkbox" data-routine-toggle="${item.id}" ${item.completed ? 'checked' : ''}><span>${esc(item.name)}</span></label>`).join('')}</div>` : empty('Configure a Rotina Diária para começar seu checklist.')
      ,renderPriorities: () => `<div class="personal-list">${personal.priorities.map(item => `<label><input type="checkbox" data-priority-toggle="${item.id}" ${item.done ? 'checked' : ''}><span>${esc(item.text)}</span><button type="button" data-priority-remove="${item.id}">×</button></label>`).join('') || '<p>Nenhuma prioridade definida. Escolha até três coisas importantes.</p>'}<form data-priority-form><input maxlength="90" placeholder="Adicionar prioridade" ${personal.priorities.length >= 3 ? 'disabled' : ''}><button ${personal.priorities.length >= 3 ? 'disabled' : ''}>+</button></form></div>`
      ,renderNotes: () => `<textarea class="personal-notes" data-personal-notes placeholder="Escreva uma nota rápida…">${esc(personal.note)}</textarea><small class="personal-muted">Salvo automaticamente.</small>`
      ,renderReminders: () => `<div class="personal-list">${personal.reminders.map(item => `<span>${esc(item.text)}<button type="button" data-reminder-remove="${item.id}">×</button></span>`).join('') || '<p>Nenhum lembrete para hoje.</p>'}<form data-reminder-form><input maxlength="80" placeholder="Novo lembrete"><button>+</button></form></div>`
      ,renderHabits: () => habits.length ? `<div class="personal-checklist">${habits.slice(0,5).map(item => { const done = window.habitState?.records?.[window.habitKey?.(item.id, new Date().getDate())] === 'done'; return `<label><input type="checkbox" data-habit-toggle="${item.id}" ${done ? 'checked' : ''}><span>${esc(item.name || item.title)}</span></label>`; }).join('')}</div>` : empty('Adicione hábitos para acompanhar sua consistência.')
      ,renderFocus: () => `<div class="personal-focus"><input data-focus-title value="${esc(personal.focus.title)}" aria-label="Intenção do foco"><textarea data-focus-text aria-label="Frase do foco">${esc(personal.focus.text)}</textarea></div>`
    };
    const layout = getWidgetLayout();
    const activeLayout = layout.filter((item) => item.active);
    const widgetsMarkup = activeLayout.map((item) => { const widget = widgetRegistry.get(item.id); return widget ? widgetShell(item, widget, widget.render(renderContext)) : ''; }).join('');
    root.innerHTML = `<main class="today-dashboard"><header class="today-dashboard-header"><div><span class="eyebrow">TRADING DESKTOP</span><h1>Bom dia, ${esc(firstName())}.</h1><p>O essencial do seu sistema antes de entrar nas telas completas.</p></div><div class="today-dashboard-actions"><button type="button" class="dashboard-edit-toggle ${dashboardEditing ? 'active' : ''}" data-dashboard-edit>${dashboardEditing ? 'Concluir personalização' : 'Personalizar painel'}</button>${dashboardEditing ? '<button type="button" class="dashboard-add-widget" data-gallery-open>+ Adicionar Widget</button><button type="button" class="dashboard-reset" data-dashboard-reset>Restaurar padrão</button>' : ''}</div></header><div class="today-dashboard-context"><span class="today-source ${source.kind}">${source.label}</span><span>${healthy() ? 'Mercado saudável para observar cenários A+' : 'Mercado defensivo: priorize proteção e gestão'}</span><span>Atualizado: ${esc(updateText(market.cycle?.updatedAt || market.scans?.updatedAt))}</span></div>${dashboardEditing ? '<div class="dashboard-edit-hint">Organize seu Desktop: arraste os widgets para reposicionar e redimensione pelas laterais. Suas preferências são salvas automaticamente.</div>' : ''}<section class="dashboard-grid" aria-label="Widgets do painel">${widgetsMarkup}</section>${!activeLayout.length ? '<section class="dashboard-empty"><h2>Seu painel está vazio</h2><p>Abra a galeria ou restaure o painel padrão para exibir os widgets.</p><button type="button" data-gallery-open>Adicionar widget</button></section>' : ''}</main>${galleryMarkup(layout)}`;
    bindDashboard(root, action);
    renderTopHeat();
  }

  async function load() {
    if (loading) return;
    if (loadedAt && Date.now() - loadedAt < 5 * 60 * 1000) { render(); return; }
    loading = true;
    render();
    try {
      const requests = await Promise.allSettled([
        fetch(`${api}/market-cycle`).then(async (response) => { const value = await response.json(); if (!response.ok) throw new Error(value.error); return value; }),
        fetch(`${api}/relative-strength?limit=100`).then(async (response) => { const value = await response.json(); if (!response.ok) throw new Error(value.error); return value; }),
        fetch(`${api}/market-scans`).then(async (response) => { const value = await response.json(); if (!response.ok) throw new Error(value.error); return value; })
      ]);
      market = {
        cycle: requests[0].status === 'fulfilled' ? requests[0].value : null,
        ranking: requests[1].status === 'fulfilled' ? requests[1].value : null,
        scans: requests[2].status === 'fulfilled' ? requests[2].value : null,
        error: requests.some((request) => request.status === 'rejected') ? 'partial' : null
      };
      loadedAt = Date.now();
    } catch (error) {
      market = { cycle: null, ranking: null, scans: null, error };
    } finally {
      loading = false;
      render();
    }
  }

  const previousGo = go;
  go = function (id) { previousGo(id); if (id === 'today') load(); else renderTopHeat(); };
  window.addEventListener('healthyTrend:authenticated', load);
  window.addEventListener('healthyTrend:workspace-synced', render);
  renderCurrentDate();
  render();
  if (document.getElementById('today')?.classList.contains('active')) load();
}());
