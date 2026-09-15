(function () {
  'use strict';
  const root = document.getElementById('marketcycle');
  if (!root) return;

  const api = () => `${window.MARKET_DATA_API_URL || 'http://localhost:8787/api'}/market-cycle`;
  const t = (pt, en) => window.appLanguage === 'en-US' ? en : pt;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const hasNumber = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const number = (value, digits = 0) => hasNumber(value) ? Number(value).toLocaleString(window.appLanguage === 'en-US' ? 'en-US' : 'pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—';
  const percent = value => hasNumber(value) ? `${Number(value) >= 0 ? '+' : ''}${number(value, 1)}%` : '—';
  function parseDate(value) {
    if (hasNumber(value) && Number(value) > 100000000) {
      const timestamp = Number(value) < 100000000000 ? Number(value) * 1000 : Number(value);
      const parsedTimestamp = new Date(timestamp);
      return Number.isFinite(parsedTimestamp.getTime()) ? parsedTimestamp : null;
    }
    const raw = String(value || '').trim();
    const normalized = /^\d{8}$/.test(raw) ? `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}` : raw.slice(0,10);
    const parsed = new Date(`${normalized}T12:00:00Z`);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  const dateLabel = value => {
    const parsed = parseDate(value);
    return parsed ? parsed.toLocaleDateString(window.appLanguage === 'en-US' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';
  };
  const icon = name => ({
    trend: '<svg viewBox="0 0 24 24"><path d="M3 18 9 12l4 4 8-10M16 6h5v5"/></svg>',
    averages: '<svg viewBox="0 0 24 24"><path d="M3 17c4-8 7-2 11-8 2-3 4-3 7-5M3 20h18"/></svg>',
    permission: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="10"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/></svg>'
  })[name] || '';

  const ranges = [
    ['1m', 22, '1M'], ['3m', 64, '3M'], ['6m', 128, '6M'], ['1y', 260, '1A'], ['2y', 520, '2A']
  ];
  let state = { status: 'loading', payload: null, error: '', range: '1y' };

  function syncActiveLayout() {
    const active = root.classList.contains('active');
    document.documentElement.classList.toggle('market-cycle-active', active);
    document.body.classList.toggle('market-cycle-active', active);
  }
  syncActiveLayout();
  new MutationObserver(syncActiveLayout).observe(root, { attributes: true, attributeFilter: ['class'] });
  const originalGo = window.go;
  if (typeof originalGo === 'function') {
    window.go = function marketCycleAwareNavigation(...args) {
      const result = originalGo.apply(this, args);
      requestAnimationFrame(syncActiveLayout);
      return result;
    };
  }
  setTimeout(syncActiveLayout, 0);

  function regime(cycle) {
    const key = cycle?.state === 'healthy' ? 'healthy' : cycle?.state === 'defensive' ? 'defensive' : 'transition';
    return {
      healthy: {
        label: t('Mercado saudável', 'Healthy market'),
        interpretation: t('O contexto está a favor. Procure somente cenários A+ que respeitem integralmente o seu plano.', 'The context is favourable. Look only for A+ setups that fully respect your plan.'),
        permission: t('Somente A+', 'A+ only'),
        context: t('O preço e a estrutura das médias sustentam uma leitura favorável. Ainda assim, cada nova posição precisa confirmar o setup e respeitar o risco.', 'Price and moving-average structure support a favourable reading. Every new position must still confirm the setup and respect risk.')
      },
      transition: {
        label: t('Mercado em transição', 'Market in transition'),
        interpretation: t('O ambiente exige atenção e seletividade. Preserve capital e aceite apenas oportunidades com evidências claras.', 'The environment calls for attention and selectivity. Preserve capital and accept only opportunities with clear evidence.'),
        permission: t('Seletividade máxima', 'Maximum selectivity'),
        context: t('Preço e médias ainda não confirmam uma estrutura totalmente alinhada. A prioridade é observar a evolução antes de ampliar exposição.', 'Price and averages do not yet confirm a fully aligned structure. Observe the evolution before increasing exposure.')
      },
      defensive: {
        label: t('Mercado defensivo', 'Defensive market'),
        interpretation: t('O ambiente pede proteção. Preserve capital e evite novas exposições até a estrutura melhorar.', 'The environment calls for protection. Preserve capital and avoid new exposure until structure improves.'),
        permission: t('Preservar capital', 'Preserve capital'),
        context: t('O índice está abaixo das referências de tendência acompanhadas pelo método. O foco deve permanecer na defesa e na gestão do risco.', 'The index is below the trend references tracked by the method. Keep the focus on defence and risk management.')
      }
    }[key];
  }

  function marketStatus(dataDate, source) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const open = !['Sat', 'Sun'].includes(values.weekday) && Number(values.hour) >= 10 && Number(values.hour) < 18;
    const close = parseDate(dataDate);
    let businessDays = 0;
    if (close) {
      const cursor = new Date(close);
      const today = new Date();
      today.setUTCHours(12,0,0,0);
      for (cursor.setUTCDate(cursor.getUTCDate() + 1); cursor < today; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        if (cursor.getUTCDay() !== 0 && cursor.getUTCDay() !== 6) businessDays += 1;
      }
    }
    const stale = businessDays > 1;
    const officialB3 = String(source || '').includes('b3-');
    return `<div class="mcv2-status ${open ? 'open' : 'closed'} ${stale ? 'stale' : ''}"><i></i><div><b>${stale ? t('Dados desatualizados', 'Stale data') : open ? t('Mercado aberto', 'Market open') : t('Mercado fechado', 'Market closed')}</b><span>${stale ? t('Aguardando um fechamento mais recente da B3.', 'Waiting for a newer B3 close.') : open ? t('Leitura intradiária não altera o fechamento oficial.', 'Intraday movement does not alter the official close.') : t('Próxima leitura no próximo pregão.', 'Next reading on the next trading session.')}</span></div><small>${officialB3 ? t('Fechamento oficial B3', 'Official B3 close') : t('Fonte de contingência', 'Contingency source')}: ${dateLabel(dataDate)}</small></div>`;
  }

  function scoreChange(series) {
    if (!Array.isArray(series) || series.length < 11) return null;
    const current = Number(series.at(-1)?.score), previous = Number(series.at(-11)?.score);
    return Number.isFinite(current) && Number.isFinite(previous) ? { value: current - previous, sessions: 10 } : null;
  }

  function MarketCycleGauge(cycle, history) {
    const score = Math.max(0, Math.min(100, Number(cycle.score) || 0));
    const progress = score * 1.8;
    const change = scoreChange(history);
    return `<div class="mcv2-gauge-wrap"><div class="mcv2-gauge" style="--score:${score};--arc:${progress}deg" role="img" aria-label="${t('Score do mercado', 'Market score')}: ${score} de 100"><div><strong>${number(score)}</strong><span>/100</span><small>${t('Score do mercado', 'Market score')}</small></div></div>${change ? `<div class="mcv2-score-change ${change.value < 0 ? 'down' : 'up'}"><b>${change.value === 0 ? '→' : change.value > 0 ? '↗' : '↘'} ${change.value > 0 ? '+' : ''}${number(change.value)} ${t('pontos', 'points')}</b><span>${t('nos últimos', 'over the last')} ${change.sessions} ${t('pregões', 'sessions')}</span></div>` : ''}</div>`;
  }

  function MarketCycleFactors(cycle, info) {
    const slopePositive = hasNumber(cycle.ema20Slope) && Number(cycle.ema20Slope) > 0 && (!hasNumber(cycle.ema200Slope) || Number(cycle.ema200Slope) >= 0);
    const structure = cycle.ema20 > cycle.ema200;
    return `<aside class="mcv2-factors"><p>${t('Principais fatores', 'Main factors')}</p>
      <div>${icon('trend')}<span><small>${t('Tendência', 'Trend')}</small><b>${info.label}</b></span></div>
      <div>${icon('averages')}<span><small>${t('Estrutura de médias', 'Moving-average structure')}</small><b>EMA 20 ${structure ? '>' : '≤'} EMA 200 · ${slopePositive ? t('ascendente', 'rising') : t('sem confirmação', 'unconfirmed')}</b></span></div>
      <div>${icon('permission')}<span><small>${t('Permissão operacional', 'Trading permission')}</small><b>${info.permission}</b></span></div>
    </aside>`;
  }

  function MarketCycleHero(cycle, history) {
    const info = regime(cycle);
    return `<section class="mcv2-hero"><div class="mcv2-diagnosis"><p>${t('Situação atual do mercado', 'Current market situation')}</p><h2>${info.label}</h2><span>${info.interpretation}</span><div><button type="button" class="primary" onclick="go('newtrade')">${t('Planejar trade →', 'Plan trade →')}</button><button type="button" class="secondary" onclick="go('relativestrength')">${t('Ver Força Relativa →', 'View Relative Strength →')}</button></div></div>${MarketCycleGauge(cycle, history)}${MarketCycleFactors(cycle, info)}</section>`;
  }

  function regimeIcon(type) {
    const icons = {
      defence: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10.5c0-3.8 2.6-6.2 7-6.2s7 2.4 7 6.2v2.1c0 3.6-2.7 6.2-7 6.2s-7-2.6-7-6.2v-2.1Z"/><path d="M7.2 7.3 5.5 5.6m11.3 1.7 1.7-1.7M9 12.3h.1m5.8 0h.1M10 15.6c1.2.8 2.8.8 4 0"/></svg>',
      transition: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.6 8.3A7.3 7.3 0 0 0 6.2 6.7L4.5 8.4"/><path d="m4.5 4.9.1 3.5 3.5-.1M5.4 15.7a7.3 7.3 0 0 0 12.4 1.6l1.7-1.7"/><path d="m19.5 19.1-.1-3.5-3.5.1"/></svg>',
      expansion: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15.7v-4.2c0-2.5 1.8-4.4 4.4-4.4h5.2c2.6 0 4.4 1.9 4.4 4.4v4.2"/><path d="M8.2 7.2 6.1 4.8m9.7 2.4 2.1-2.4M8.5 15.7v3.1m7-3.1v3.1M10.2 12.2h.1m3.4 0h.1M9.4 15c1.7 1 3.5 1 5.2 0"/></svg>'
    };
    return icons[type];
  }

  function MarketRegimeBar(cycle) {
    const position = Math.max(4, Math.min(96, Number(cycle.score) || 50));
    return `<section class="mcv2-regime" aria-label="${t('Posição atual no regime de mercado', 'Current market regime position')}"><div class="mcv2-regime-item defence"><span class="mcv2-regime-icon">${regimeIcon('defence')}</span><div><b>${t('Defesa', 'Defence')}</b><span>${t('Preservar capital. Ficar de fora.', 'Preserve capital. Stay out.')}</span></div></div><div class="mcv2-regime-item transition"><span class="mcv2-regime-icon">${regimeIcon('transition')}</span><div><b>${t('Transição', 'Transition')}</b><span>${t('Atenção e seletividade.', 'Attention and selectivity.')}</span></div></div><div class="mcv2-regime-item expansion"><span class="mcv2-regime-icon">${regimeIcon('expansion')}</span><div><b>${t('Expansão', 'Expansion')}</b><span>${t('Ambiente favorável para oportunidades.', 'Favourable environment for opportunities.')}</span></div></div><i style="left:${position}%" title="${t('Score atual', 'Current score')}: ${number(cycle.score)}/100"></i></section>`;
  }

  function MarketBreadth(breadth) {
    if (!breadth || !Object.values(breadth).some(hasNumber)) return '';
    const items = [
      ['leader', t('Líderes', 'Leaders')],
      ['qualified', t('Qualificados', 'Qualified')],
      ['watch', t('Em acompanhamento', 'On watch')],
      ['below-threshold', t('Abaixo do filtro', 'Below filter')]
    ];
    return `<section class="mcv2-breadth" aria-label="${t('Amplitude do mercado', 'Market breadth')}"><header><div><p>${t('Amplitude do mercado', 'Market breadth')}</p><h2>${t('Como está a base do IBOV?', 'How broad is IBOV strength?')}</h2></div><button type="button" data-open-scans>${t('Ver oportunidades nos Scans →', 'View opportunities in Scans →')}</button></header><div>${items.map(([key, label]) => `<article class="${key}"><b>${number(breadth[key] || 0)}</b><span>${label}</span></article>`).join('')}</div><small>${t('A amplitude mostra quantos ativos sustentam a leitura atual. Para analisar líderes e qualificados, use os Scans de Mercado.', 'Breadth shows how many assets support the current reading. Use Market Scans to analyse leaders and qualified assets.')}</small></section>`;
  }

  function visibleSeries(history) {
    const requested = ranges.find(([id]) => id === state.range)?.[1] || 260;
    return history.slice(-requested);
  }

  function linePath(rows, field, x, y) {
    let path = '', active = false;
    rows.forEach((row, index) => {
      const value = Number(row[field]);
      if (!Number.isFinite(value)) { active = false; return; }
      path += `${active ? 'L' : 'M'}${x(index).toFixed(1)},${y(value).toFixed(1)} `;
      active = true;
    });
    return path;
  }

  function IbovDailyChart(history, source) {
    const rows = visibleSeries(history);
    if (rows.length < 2) return `<div class="mcv2-empty">${t('Histórico insuficiente para desenhar o gráfico.', 'Insufficient history to draw the chart.')}</div>`;
    const values = rows.flatMap(row => [row.close, row.ema20, row.ema200]).map(Number).filter(Number.isFinite);
    const min = Math.min(...values), max = Math.max(...values), spread = max - min || 1;
    const W = 1000, H = 330, left = 66, right = 16, top = 18, bottom = 48;
    const x = index => left + index / Math.max(1, rows.length - 1) * (W - left - right);
    const y = value => top + (max - value) / spread * (H - top - bottom);
    const ticks = Array.from({ length: 5 }, (_, index) => min + spread * index / 4).reverse();
    const dateTicks = Array.from(new Set(Array.from({ length: 6 }, (_, index) => Math.round(index * (rows.length - 1) / 5))));
    const availableRanges = ranges.filter(([, days]) => history.length >= days);
    const officialB3 = String(source || '').includes('b3-');
    const sourceCopy = officialB3 ? t('série oficial B3', 'official B3 series') : t('fonte de contingência', 'contingency source');
    return `<div class="mcv2-chart-head"><div><h2>IBOVESPA · ${t('Diário', 'Daily')}</h2><p>${t('Preço e médias móveis', 'Price and moving averages')} · ${sourceCopy}</p></div><div class="mcv2-ranges" role="group" aria-label="${t('Período do gráfico', 'Chart period')}">${availableRanges.map(([id,, label]) => `<button type="button" data-market-range="${id}" class="${state.range === id ? 'active' : ''}" aria-pressed="${state.range === id}">${label}</button>`).join('')}</div></div>
      <div class="mcv2-chart-scroll"><svg class="mcv2-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('Gráfico diário do Ibovespa com EMA 20 e EMA 200', 'Daily Ibovespa chart with 20 and 200 EMA')}">
        <defs><linearGradient id="mcv2-area" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#21945d" stop-opacity=".22"/><stop offset="1" stop-color="#21945d" stop-opacity="0"/></linearGradient></defs>
        <rect x="${left}" y="${top}" width="${W-left-right}" height="${H-top-bottom}" rx="8" class="mcv2-plot-bg"/>
        ${ticks.map(value => `<line x1="${left}" y1="${y(value)}" x2="${W-right}" y2="${y(value)}" class="mcv2-gridline"/><text x="${left-10}" y="${y(value)+4}" text-anchor="end">${number(value)}</text>`).join('')}
        ${dateTicks.map(index => `<text x="${x(index)}" y="${H-18}" text-anchor="${index === 0 ? 'start' : index === rows.length-1 ? 'end' : 'middle'}">${dateLabel(rows[index].date).replace(/ de /g,' ')}</text>`).join('')}
        <path class="mcv2-price-area" d="${linePath(rows,'close',x,y)} L${x(rows.length-1)},${H-bottom} L${left},${H-bottom} Z"/>
        <path class="mcv2-line ema200" d="${linePath(rows,'ema200',x,y)}"/><path class="mcv2-line ema20" d="${linePath(rows,'ema20',x,y)}"/><path class="mcv2-line price" d="${linePath(rows,'close',x,y)}"/>
        ${rows.map((row,index) => `<circle tabindex="0" cx="${x(index)}" cy="${y(row.close)}" r="7" class="mcv2-hit"><title>${dateLabel(row.date)}\nIBOV: ${number(row.close)}\nEMA 20: ${number(row.ema20)}\nEMA 200: ${number(row.ema200)}\nScore: ${number(row.score)}/100</title></circle>`).join('')}
      </svg></div><div class="mcv2-legend"><span class="price"><i></i>${t('Preço', 'Price')}</span><span class="ema20"><i></i>EMA 20</span><span class="ema200"><i></i>EMA 200</span></div>`;
  }

  function checkRow(label, value, pass) {
    return `<div class="${pass ? 'pass' : 'attention'}"><span>${label}</span><b>${value}</b><i aria-label="${pass ? t('Confirmado', 'Confirmed') : t('Atenção', 'Attention')}">${pass ? '✓' : '!'}</i></div>`;
  }

  function MarketTransparentReading(cycle) {
    const info = regime(cycle);
    const slopes = hasNumber(cycle.ema20Slope) && Number(cycle.ema20Slope) > 0 && (!hasNumber(cycle.ema200Slope) || Number(cycle.ema200Slope) >= 0);
    return `<aside class="mcv2-reading"><section><h3>${t('Leitura transparente', 'Transparent reading')}</h3>${checkRow(t('Preço acima da EMA 20','Price above 20 EMA'), number(cycle.price), cycle.above20)}${checkRow(t('Preço acima da EMA 200','Price above 200 EMA'), number(cycle.price), cycle.above200)}${checkRow(t('Inclinação das médias','Moving-average slope'), slopes ? t('Positiva','Positive') : t('Sem confirmação','Unconfirmed'), slopes)}${checkRow(t('Score do mercado','Market score'), `${number(cycle.score)}/100`, cycle.state === 'healthy')}</section><section class="mcv2-context"><h3>${t('Contexto atual', 'Current context')} ${icon('info')}</h3><p>${info.context}</p></section><blockquote>“${t('Grandes lucros exigem suportar pequenas dores.', 'Great profits require enduring small pains.')}”</blockquote></aside>`;
  }

  function changeFrom(row, previous, field) {
    const a = Number(row?.[field]), b = Number(previous?.[field]);
    return Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? (a / b - 1) * 100 : null;
  }

  function MarketEvidenceCards(cycle, history) {
    const current = history.at(-1), previous = history.at(-2);
    const score = scoreChange(history);
    const cards = [
      [t('Preço atual','Current price'), number(cycle.price), percent(changeFrom(current,previous,'close'))],
      ['EMA 20', number(cycle.ema20), percent(changeFrom(current,previous,'ema20'))],
      ['EMA 200', number(cycle.ema200), percent(changeFrom(current,previous,'ema200'))],
      [t('Variação do score','Score change'), score ? `${score.value > 0 ? '+' : ''}${number(score.value)} ${t('pontos','points')}` : '—', score ? `${t('últimos','last')} ${score.sessions} ${t('pregões','sessions')}` : t('Histórico insuficiente','Insufficient history')]
    ];
    return `<div class="mcv2-evidence">${cards.map(([label,value,detail]) => `<article><small>${label}</small><b>${value}</b><span>${detail}</span></article>`).join('')}</div>`;
  }

  function renderLoading() {
    root.innerHTML = `<div class="mcv2-page is-loading"><div class="mcv2-shell"><div class="mcv2-loading"><i></i><b>${t('Lendo o ambiente do mercado…', 'Reading the market environment…')}</b><span>${t('Carregando fechamento, médias e histórico oficial da B3.', 'Loading close, averages and official B3 history.')}</span></div></div></div>`;
  }

  function renderError(message) {
    root.innerHTML = `<div class="mcv2-page is-error"><div class="mcv2-shell"><div class="mcv2-loading"><b>${t('Não foi possível ler o Ciclo de Mercado.', 'Market Cycle could not be loaded.')}</b><span>${esc(message)}</span><button type="button" data-market-retry>${t('Tentar novamente', 'Try again')}</button></div></div></div>`;
  }

  function renderEmpty() {
    root.innerHTML = `<div class="mcv2-page is-empty"><div class="mcv2-shell"><div class="mcv2-loading"><b>${t('Ainda não há histórico suficiente.', 'There is not enough history yet.')}</b><span>${t('A leitura aparecerá assim que o fechamento oficial da B3 tiver observações suficientes para calcular o ambiente sem inventar dados.', 'The reading will appear as soon as the official B3 close has enough observations to calculate the environment without inventing data.')}</span><button type="button" data-market-retry>${t('Consultar novamente', 'Check again')}</button></div></div></div>`;
  }

  function render() {
    syncActiveLayout();
    if (state.status === 'loading') return renderLoading();
    if (state.status === 'error') return renderError(state.error);
    const payload = state.payload, cycle = payload?.cycle || {}, history = Array.isArray(payload?.benchmark?.history) ? payload.benchmark.history : [];
    if (!hasNumber(cycle.price) || history.length < 2) return renderEmpty();
    const info = regime(cycle);
    root.innerHTML = `<div class="mcv2-page regime-${cycle.state || 'transition'}"><div class="mcv2-shell"><header class="mcv2-heading"><div><p>The Healthy Trend Trader / <b>${t('Ciclo de Mercado','Market Cycle')}</b></p><h1>${t('Ciclo de Mercado','Market Cycle')}</h1><em>${t('Antes de escolher o cavalo, entenda a pista.','Before choosing the horse, understand the track.')}</em></div>${marketStatus(cycle.date || history.at(-1)?.date, payload.source)}<blockquote>“${t('O mercado não é ON/OFF.<br>É um ambiente para se posicionar.','The market is not ON/OFF.<br>It is an environment to position within.')}”</blockquote></header>${MarketCycleHero(cycle,history)}${MarketRegimeBar(cycle)}<section class="mcv2-analysis"><article class="mcv2-chart-card">${IbovDailyChart(history,payload.source)}${MarketEvidenceCards(cycle,history)}</article>${MarketTransparentReading(cycle)}</section>${MarketBreadth(payload.breadth)}<footer><span>${info.permission}</span><b>${t('Disciplina gera liberdade.','Discipline creates freedom.')}</b></footer></div></div>`;
  }

  async function load(force = false) {
    if (!force && state.payload) { render(); return; }
    state.status = 'loading'; render();
    try {
      const response = await fetch(api());
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      state = { ...state, status: 'ready', payload, error: '' };
      const history = Array.isArray(payload?.benchmark?.history) ? payload.benchmark.history : [];
      if (!ranges.some(([id, days]) => id === state.range && history.length >= days)) {
        state.range = ranges.filter(([, days]) => history.length >= days).at(-1)?.[0] || '1m';
      }
      render();
    } catch (error) {
      state = { ...state, status: 'error', error: error.message || t('Falha ao consultar os dados solicitados.', 'Failed to query the requested data.') };
      render();
    }
  }

  root.addEventListener('click', event => {
    const range = event.target.closest('[data-market-range]')?.dataset.marketRange;
    if (range) { state.range = range; render(); return; }
    if (event.target.closest('[data-open-scans]')) { go('marketscans'); return; }
    if (event.target.closest('[data-market-retry]')) load(true);
  });

  window.renderMarketCycle = render;
  window.loadMarketCycleV2 = load;
  window.addEventListener('healthyTrend:authenticated', () => load(true));
  load();
}());
