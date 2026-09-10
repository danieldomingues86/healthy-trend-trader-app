(function () {
  const api = window.MARKET_DATA_API_URL || 'http://localhost:8787/api';
  let market = { cycle: null, ranking: null, scans: null, error: null };
  let loading = false;
  let loadedAt = 0;

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const pct = (value) => Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  const freshness = () => window.TodayCockpitModel.marketDataState({ source: market.cycle?.source || market.scans?.source, updatedAt: market.cycle?.updatedAt || market.scans?.updatedAt });
  const realPositions = () => (operationalState?.positions || []).filter((position) => position.mode === 'real' && !operationMetrics(position).closed);
  const heatLimit = () => typeof PORTFOLIO_HEAT_LIMIT_PCT === 'number' ? PORTFOLIO_HEAT_LIMIT_PCT : 3;
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
    const value = heat(), limit = heatLimit(), usage = Math.min(100, limit ? value / limit * 100 : 0);
    meter.classList.toggle('warn', usage >= 80);
    meter.innerHTML = `<span>HEAT</span><i><em style="width:${usage}%"></em></i><b>${pct(value)} / ${pct(limit)}</b>`;
  }

  function render() {
    const root = document.getElementById('today');
    if (!root) return;
    root.classList.add('today-cockpit-page');
    const source = freshness();
    const scanSummary = window.TodayCockpitModel.summarizeScans(market.scans);
    const leaders = Array.isArray(market.ranking?.items) ? market.ranking.items.filter((item) => Number(item.score) >= 90).length : 0;
    const candidates = scanSummary.matches;
    const currentHeat = heat(), limit = heatLimit(), usage = Math.min(100, limit ? currentHeat / limit * 100 : 0);
    const positions = preparedPositions();
    const action = window.TodayCockpitModel.buildNextAction({ heat: currentHeat, heatLimit: limit, positions, drafts: operationalState?.drafts || [], healthyMarket: healthy(), opportunityCount: candidates });
    const permissionTitle = source.kind === 'unavailable' ? 'Leitura de mercado indisponível' : healthy() ? 'Mercado saudável' : 'Mercado defensivo';
    const permissionDetail = source.kind === 'unavailable' ? 'Não vamos assumir uma permissão operacional sem dados.' : healthy() ? 'O contexto permite procurar somente cenários A+ completos.' : 'Priorize proteção e gestão das posições abertas.';
    root.innerHTML = `<main class="today-cockpit">
      <section class="today-cockpit-hero"><div><div class="eyebrow">SEU SISTEMA OPERACIONAL DE TRADING</div><h1>Bom dia, ${esc(firstName())}.</h1><p>Permissão, risco e oportunidades reunidos para mostrar o que merece sua atenção agora.</p></div><aside class="today-permission"><div class="today-permission-header"><small>Market permission · IBOV</small><span class="today-source ${source.kind}">${source.label}</span></div><h2>${permissionTitle}</h2><p>${permissionDetail}</p><small style="margin-top:13px">Fonte: ${esc(market.cycle?.source || market.scans?.source || 'não disponível')} · ${esc(updateText(market.cycle?.updatedAt || market.scans?.updatedAt))}</small></aside></section>
      <section class="today-cockpit-grid"><article class="today-cockpit-card"><span class="today-card-kicker">PORTFÓLIO</span><h2>Risco sob controle</h2><p>Ongoing Risk das posições reais abertas, pelo mesmo cálculo da tela Portfolio Heat.</p><div class="today-heat-layout"><div class="today-heat-number"><strong>${pct(currentHeat)}</strong><span>de ${pct(limit)} permitido</span></div><div><div class="today-heat-bar ${usage >= 80 ? 'warn' : ''}"><i style="width:${usage}%"></i></div><div class="today-heat-scale"><span>0%</span><span>${Math.round(usage)}% do limite utilizado</span></div></div></div><div class="today-account-facts"><div><small>Posições reais</small><b>${positions.length}</b></div><div><small>Paper trading</small><b>${(operationalState?.positions || []).filter((item) => item.mode === 'paper').length}</b></div><div><small>Planos salvos</small><b>${operationalState?.drafts?.length || 0}</b></div></div></article>
      <article class="today-cockpit-card"><span class="today-card-kicker">OPORTUNIDADES</span><h2>Onde olhar agora</h2><p>Filtros reduzem o universo. A Rubric e o gráfico continuam validando a decisão.</p><div class="today-opportunity-list"><button type="button" data-page-target="relativestrength"><small>Líderes RS</small><strong>${market.ranking ? leaders : '—'}</strong><span>score igual ou superior a 90</span></button><button type="button" data-page-target="marketscans"><small>Ativos nos scans</small><strong>${market.scans ? candidates : '—'}</strong><span>ativos únicos encontrados</span></button><button type="button" data-page-target="marketscans"><small>Scans ativos</small><strong>${market.scans ? scanSummary.available : '—'}</strong><span>${scanSummary.unavailable} ainda em preparação</span></button></div></article></section>
      ${actionMarkup(action)}
    </main>`;
    root.querySelectorAll('[data-page-target]').forEach((button) => button.addEventListener('click', () => go(button.dataset.pageTarget)));
    root.querySelector('[data-next-action]')?.addEventListener('click', () => runAction(action));
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

  const previousRenderOperationalApp = renderOperationalApp;
  renderOperationalApp = function () { previousRenderOperationalApp(); render(); };
  const previousSetupAccountMenu = setupAccountMenu;
  setupAccountMenu = function () { previousSetupAccountMenu(); renderCurrentDate(); renderTopHeat(); };
  const previousGo = go;
  go = function (id) { previousGo(id); if (id === 'today') load(); else renderTopHeat(); };
  window.addEventListener('healthyTrend:authenticated', load);
  window.addEventListener('healthyTrend:workspace-synced', render);
  renderCurrentDate();
  render();
  if (document.getElementById('today')?.classList.contains('active')) load();
}());
