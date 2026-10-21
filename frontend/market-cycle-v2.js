(function () {
  'use strict';
  const root = document.getElementById('marketcycle');
  if (!root) return;

  const MARKET_REGISTRY = {
    stock_b3: {
      id: 'stock_b3',
      name: 'Ações B3',
      benchmarkSymbol: 'IBOV',
      benchmarkName: 'Índice Bovespa (IBOV)',
      badge: 'IBOV',
      hasBreadth: true
    },
    bdr: {
      id: 'bdr',
      name: 'BDRs',
      benchmarkSymbol: 'BDRX',
      benchmarkName: 'Índice de BDRs Não Patrocinados (BDRX)',
      badge: 'BDRX',
      hasBreadth: false
    },
    fii: {
      id: 'fii',
      name: 'FIIs',
      benchmarkSymbol: 'IFIX',
      benchmarkName: 'Índice de Fundos de Investimentos Imobiliários (IFIX)',
      badge: 'IFIX',
      hasBreadth: false
    }
  };

  const SNAPSHOTS_STORAGE_KEY = 'healthy-trend-market-cycle-snapshots-v1';

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

  let state = {
    currentMarket: 'stock_b3',
    markets: {
      stock_b3: { status: 'idle', payload: null, error: '', range: '1y' },
      bdr: { status: 'idle', payload: null, error: '', range: '1y' },
      fii: { status: 'idle', payload: null, error: '', range: '1y' }
    }
  };

  function getMarketSnapshot(marketId) {
    try {
      const saved = JSON.parse(localStorage.getItem(SNAPSHOTS_STORAGE_KEY) || '{}');
      return saved[marketId] || null;
    } catch {
      return null;
    }
  }

  function persistMarketSnapshot(marketId, payload) {
    if (!payload?.cycle || !hasNumber(payload.cycle.price)) return null;
    try {
      const saved = JSON.parse(localStorage.getItem(SNAPSHOTS_STORAGE_KEY) || '{}');
      const marketInfo = MARKET_REGISTRY[marketId] || MARKET_REGISTRY.stock_b3;
      const cycle = payload.cycle;
      const history = Array.isArray(payload.benchmark?.history) ? payload.benchmark.history : [];
      const snapshot = {
        market: marketId,
        marketLabel: marketInfo.name,
        benchmarkSymbol: marketInfo.benchmarkSymbol,
        benchmarkName: marketInfo.benchmarkName,
        classification: cycle.state,
        score: Number(cycle.score) || 0,
        evaluatedAt: new Date().toISOString(),
        dataDate: cycle.date || history.at(-1)?.date || null,
        dataVersion: payload.source || 'b3-indexes',
        ema9: Number(cycle.ema9) || null,
        ema30: Number(cycle.ema30) || null,
        above9: Boolean(cycle.above9),
        above30: Boolean(cycle.above30),
        structure: Boolean(cycle.structure),
        indicators: {
          price: Number(cycle.price) || null,
          ema9: Number(cycle.ema9) || null,
          ema30: Number(cycle.ema30) || null,
          above9: Boolean(cycle.above9),
          above30: Boolean(cycle.above30),
          structure: Boolean(cycle.structure),
          atr21: hasNumber(cycle.atr21) ? Number(cycle.atr21) : null,
          atrPct: hasNumber(cycle.atrPct) ? Number(cycle.atrPct) : null,
          ema9Slope: hasNumber(cycle.ema9Slope) ? Number(cycle.ema9Slope) : null,
          ema30Slope: hasNumber(cycle.ema30Slope) ? Number(cycle.ema30Slope) : null,
          ema10: Number(cycle.ema9) || null,
          ema20: Number(cycle.ema30) || null,
          ema200: Number(cycle.ema200) || null,
          above10: Boolean(cycle.above9),
          above20: Boolean(cycle.above30)
        }
      };
      saved[marketId] = snapshot;
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(saved));
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
          window.dispatchEvent(new CustomEvent('healthyTrend:marketCycleUpdated', { detail: { marketId, snapshot } }));
        } catch (_) {}
      }
      return snapshot;
    } catch (err) {
      console.warn('Erro ao salvar snapshot de ciclo:', err);
      return null;
    }
  }

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
    const key = cycle?.state === 'healthy' ? 'healthy' : 'defensive';
    return {
      healthy: {
        label: t('Mercado em expansão', 'Market in expansion'),
        interpretation: t('O preço está acima da EMA 9 e da EMA 30. Ambiente favorável para buscar oportunidades nos ativos.', 'Price is above 9 EMA and 30 EMA. Favourable environment to seek opportunities in assets.'),
        permission: t('Somente A', 'A only'),
        context: t('O preço do índice está estritamente acima da EMA 9 e da EMA 30 no gráfico diário. O mercado está saudável para buscar oportunidades e operar ativos que atendam aos demais critérios do método.', 'The index price is strictly above 9 EMA and 30 EMA on the daily chart. Market is healthy to seek opportunities and trade assets meeting method criteria.')
      },
      defensive: {
        label: t('Mercado em modo defesa', 'Market in defensive mode'),
        interpretation: t('Preço abaixo ou entre as médias EMA 9 e EMA 30. Preservar capital e evitar novas operações nesse mercado.', 'Price below or between 9 EMA and 30 EMA. Preserve capital and avoid new trades in this market.'),
        permission: t('Preservar capital', 'Preserve capital'),
        context: t('O preço do índice está abaixo ou localizado entre as médias EMA 9 e EMA 30 (ou igual a uma delas). A recomendação do método é modo Defesa: preservar capital e evitar novas exposições até a estrutura melhorar.', 'The index price is below or located between 9 EMA and 30 EMA. Method recommendation is Defensive mode: preserve capital and avoid new exposure.')
      }
    }[key];
  }

  function MarketSelector() {
    const current = state.currentMarket || 'stock_b3';
    const entries = Object.values(MARKET_REGISTRY);
    return `<div class="mcv2-market-pills" role="tablist" aria-label="${t('Seletor de Mercado', 'Market Selector')}">
      ${entries.map(item => `
        <button type="button" role="tab" data-market-select="${esc(item.id)}"
          class="mcv2-market-pill ${current === item.id ? 'active' : ''}"
          aria-selected="${current === item.id}"
          title="${esc(item.benchmarkName)}">
          <span class="mcv2-market-name">${esc(item.name)}</span>
          <span class="mcv2-market-ref">${esc(item.benchmarkSymbol)}</span>
        </button>
      `).join('')}
    </div>`;
  }

  function MarketFreshness(dataDate, source) {
    const formatted = dateLabel(dataDate);
    const provider = String(source || 'B3').toLowerCase().includes('b3') ? 'B3' : source || 'B3';
    const text = formatted === '—'
      ? t(`Último fechamento indisponível · Fonte: ${provider}`, `Latest close unavailable · Source: ${provider}`)
      : t(`Último fechamento: ${formatted} · Fonte: ${provider}`, `Latest close: ${formatted} · Source: ${provider}`);
    return `<span class="mcv2-freshness relative-data-freshness">
      <span class="rs-freshness-icon" aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </span>
      <span class="rs-freshness-text">${esc(text)}</span>
    </span>`;
  }

  function marketStatus(dataDate, source, marketInfo, snapshot) {
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
    const snapshotTime = snapshot?.evaluatedAt
      ? new Date(snapshot.evaluatedAt).toLocaleTimeString(window.appLanguage === 'en-US' ? 'en-US' : 'pt-BR', { hour: '2-digit', minute: '2-digit' })
      : null;

    return `<div class="mcv2-status ${open ? 'open' : 'closed'} ${stale ? 'stale' : ''}">
      <i></i>
      <div>
        <b>${stale ? t('Dados desatualizados', 'Stale data') : open ? t('Mercado aberto', 'Market open') : t('Mercado fechado', 'Market closed')}</b>
        <span>${stale ? t('Aguardando um fechamento mais recente da B3.', 'Waiting for a newer B3 close.') : open ? t('Leitura intradiária não altera o fechamento oficial.', 'Intraday movement does not alter the official close.') : t('Próxima leitura no próximo pregão.', 'Next reading on the next trading session.')}</span>
      </div>
      <div class="mcv2-status-dates">
        <small>${officialB3 ? t('Fechamento oficial B3', 'Official B3 close') : t('Fonte de contingência', 'Contingency source')}: ${dateLabel(dataDate)}</small>
        ${snapshotTime ? `<small class="mcv2-snapshot-tag">${t('Snapshot', 'Snapshot')}: ${snapshotTime}</small>` : ''}
      </div>
    </div>`;
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
    const isHealthy = cycle?.state === 'healthy';
    const slopePositive = hasNumber(cycle.ema9Slope) && Number(cycle.ema9Slope) > 0;
    const structure = (Number(cycle.ema9) > Number(cycle.ema30)) || Boolean(cycle.structure);
    const shortTerm = cycle.above9 ? t('Preço > EMA 9', 'Price > 9 EMA') : t('Preço ≤ EMA 9', 'Price ≤ 9 EMA');
    return `<aside class="mcv2-factors"><p>${t('Principais fatores', 'Main factors')}</p>
      <div>${icon('trend')}<span><small>${t('Tendência', 'Trend')}</small><b>${info.label} · ${shortTerm}</b></span></div>
      <div>${icon('averages')}<span><small>${t('Estrutura de médias', 'Moving-average structure')}</small><b>EMA 9 ${structure ? '>' : '≤'} EMA 30 · ${slopePositive ? t('ascendente', 'rising') : t('sem confirmação', 'unconfirmed')}</b></span></div>
      <div>${icon('permission')}<span><small>${t('Permissão operacional', 'Trading permission')}</small><b>${isHealthy ? t('Sim (Expansão)', 'Yes (Expansion)') : t('Não (Modo Defesa)', 'No (Defensive Mode)')}</b></span></div>
    </aside>`;
  }

  function MarketCycleHero(cycle, history, marketInfo) {
    const info = regime(cycle);
    const regimeKey = cycle?.state === 'healthy' ? 'expansion' : cycle?.state === 'defensive' ? 'defence' : 'transition';
    return `<section class="mcv2-hero">
      <div class="mcv2-diagnosis">
        <p>${t('Situação atual do mercado', 'Current market situation')} · ${esc(marketInfo.benchmarkSymbol)}</p>
        <div class="mcv2-hero-title-row">
          <span class="mcv2-hero-icon">${regimeIcon(regimeKey)}</span>
          <h2>${info.label}</h2>
        </div>
        <span>${info.interpretation}</span>
        <div>
          <button type="button" class="primary" onclick="go('newtrade')">${t('Planejar trade →', 'Plan trade →')}</button>
          <button type="button" class="secondary" onclick="go('relativestrength')">${t('Ver Força Relativa →', 'View Relative Strength →')}</button>
        </div>
      </div>
      ${MarketCycleGauge(cycle, history)}
      ${MarketCycleFactors(cycle, info)}
    </section>`;
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
    const activeSegment = cycle?.state === 'healthy' ? 'expansion' : 'defence';
    return `<section class="mcv2-regime" aria-label="${t('Posição atual no regime de mercado', 'Current market regime position')}">
      <div class="mcv2-regime-item defence ${activeSegment === 'defence' ? 'active' : ''}">
        <span class="mcv2-regime-icon">${regimeIcon('defence')}</span>
        <div><b>${t('Defesa', 'Defence')}</b><span>${t('Preservar capital. Evitar novas operações.', 'Preserve capital. Avoid new trades.')}</span></div>
      </div>
      <div class="mcv2-regime-item expansion ${activeSegment === 'expansion' ? 'active' : ''}">
        <span class="mcv2-regime-icon">${regimeIcon('expansion')}</span>
        <div><b>${t('Expansão', 'Expansion')}</b><span>${t('Ambiente favorável para operar os ativos.', 'Favourable environment for trading assets.')}</span></div>
      </div>
      <i style="left:${position}%" title="${t('Score atual', 'Current score')}: ${number(cycle.score)}/100"></i>
    </section>`;
  }

  function MarketBreadth(breadth, marketInfo) {
    if (marketInfo.hasBreadth && breadth && Object.values(breadth).some(hasNumber)) {
      const items = [
        ['leader', t('Líderes', 'Leaders')],
        ['qualified', t('Qualificados', 'Qualified')],
        ['watch', t('Em acompanhamento', 'On watch')],
        ['below-threshold', t('Abaixo do filtro', 'Below filter')]
      ];
      return `<section class="mcv2-breadth" aria-label="${t('Amplitude do mercado', 'Market breadth')}"><header><div><p>${t('Amplitude do mercado', 'Market breadth')}</p><h2>${t('Como está a base do IBOV?', 'How broad is IBOV strength?')}</h2></div><button type="button" data-open-scans>${t('Ver oportunidades nos Scans →', 'View opportunities in Scans →')}</button></header><div>${items.map(([key, label]) => `<article class="${key}"><b>${number(breadth[key] || 0)}</b><span>${label}</span></article>`).join('')}</div><small>${t('A amplitude mostra quantos ativos sustentam a leitura atual. Para analisar líderes e qualificados, use os Scans de Mercado.', 'Breadth shows how many assets support the current reading. Use Market Scans to analyse leaders and qualified assets.')}</small></section>`;
    }

    if (!marketInfo.hasBreadth) {
      const isFii = marketInfo.id === 'fii';
      return `<section class="mcv2-breadth mcv2-breadth-info" aria-label="${isFii ? t('Universo de FIIs', 'FII Universe') : t('Universo de BDRs', 'BDR Universe')}">
        <header>
          <div>
            <p>${isFii ? t('Universo de FIIs', 'FII Universe') : t('Universo de BDRs', 'BDR Universe')}</p>
            <h2>${isFii ? t('Amplitude e Seleção de FIIs na B3', 'Breadth & FII Selection on B3') : t('Amplitude e Seleção de BDRs na B3', 'Breadth & BDR Selection on B3')}</h2>
          </div>
          <button type="button" onclick="go('relativestrength')">${isFii ? t('Ver Força Relativa de FIIs →', 'View FII Relative Strength →') : t('Ver Força Relativa de BDRs →', 'View BDR Relative Strength →')}</button>
        </header>
        <div class="mcv2-breadth-note">
          <p>${isFii
            ? t('O índice IFIX afere o ciclo e a direção geral dos Fundos de Investimentos Imobiliários na B3. Para explorar os FIIs elegíveis, classificados por liderança e força relativa com benchmark IFIX dedicado, acesse a tela de Força Relativa.', 'The IFIX index tracks the cycle and overall direction for Real Estate Investment Funds on B3. To inspect eligible FIIs ranked by relative strength and leadership against the IFIX benchmark, visit the Relative Strength screen.')
            : t('O índice BDRX afere o ciclo e a direção geral dos certificados de ativos internacionais na B3. Para explorar os 34 BDRs elegíveis, classificados por liderança e força relativa sem misturar com ações locais, acesse a tela de Força Relativa.', 'The BDRX index tracks cycle and overall direction for global asset certificates on B3. To inspect the 34 eligible BDRs ranked by relative strength and leadership, visit the Relative Strength screen.')}</p>
        </div>
      </section>`;
    }

    return '';
  }

  function visibleSeries(history, currentRange = '1y') {
    const requested = ranges.find(([id]) => id === currentRange)?.[1] || 260;
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

  function MarketDailyChart(history, source, marketInfo, currentRange) {
    const rows = visibleSeries(history, currentRange);
    if (rows.length < 2) return `<div class="mcv2-empty">${t('Histórico insuficiente para desenhar o gráfico.', 'Insufficient history to draw the chart.')}</div>`;
    const values = rows.flatMap(row => [row.close, row.ema9 ?? row.ema10, row.ema30 ?? row.ema20]).map(Number).filter(Number.isFinite);
    const min = Math.min(...values), max = Math.max(...values), spread = max - min || 1;
    const W = 1000, H = 330, left = 66, right = 16, top = 18, bottom = 48;
    const x = index => left + index / Math.max(1, rows.length - 1) * (W - left - right);
    const y = value => top + (max - value) / spread * (H - top - bottom);
    const ticks = Array.from({ length: 5 }, (_, index) => min + spread * index / 4).reverse();
    const dateTicks = Array.from(new Set(Array.from({ length: 6 }, (_, index) => Math.round(index * (rows.length - 1) / 5))));
    const availableRanges = ranges.filter(([, days]) => history.length >= days);
    const officialB3 = String(source || '').includes('b3-');
    const sourceCopy = officialB3 ? t('série oficial B3', 'official B3 series') : t('fonte de contingência', 'contingency source');
    const chartLabel = `${esc(marketInfo.benchmarkSymbol)} · ${t('Diário', 'Daily')}`;

    return `<div class="mcv2-chart-head">
      <div>
        <h2>${chartLabel}</h2>
        <p>${t('Preço e médias móveis (EMA 9 e EMA 30)', 'Price and moving averages (9 and 30 EMA)')} · ${sourceCopy}</p>
      </div>
      <div class="mcv2-ranges" role="group" aria-label="${t('Período do gráfico', 'Chart period')}">
        ${availableRanges.map(([id,, label]) => `<button type="button" data-market-range="${id}" class="${currentRange === id ? 'active' : ''}" aria-pressed="${currentRange === id}">${label}</button>`).join('')}
      </div>
    </div>
    <div class="mcv2-chart-scroll">
      <svg class="mcv2-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('Gráfico diário de', 'Daily chart of')} ${esc(marketInfo.benchmarkSymbol)} ${t('com EMA 9 e EMA 30', 'with 9 and 30 EMA')}">
        <defs><linearGradient id="mcv2-area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#21945d" stop-opacity=".22"/><stop offset="1" stop-color="#21945d" stop-opacity="0"/></linearGradient></defs>
        <rect x="${left}" y="${top}" width="${W-left-right}" height="${H-top-bottom}" rx="8" class="mcv2-plot-bg"/>
        ${ticks.map(value => `<line x1="${left}" y1="${y(value)}" x2="${W-right}" y2="${y(value)}" class="mcv2-gridline"/><text x="${left-10}" y="${y(value)+4}" text-anchor="end">${number(value)}</text>`).join('')}
        ${dateTicks.map(index => `<text x="${x(index)}" y="${H-18}" text-anchor="${index === 0 ? 'start' : index === rows.length-1 ? 'end' : 'middle'}">${dateLabel(rows[index].date).replace(/ de /g,' ')}</text>`).join('')}
        <path class="mcv2-price-area" d="${linePath(rows,'close',x,y)} L${x(rows.length-1)},${H-bottom} L${left},${H-bottom} Z"/>
        <path class="mcv2-line ema30" d="${linePath(rows,'ema30',x,y) || linePath(rows,'ema20',x,y)}"/><path class="mcv2-line ema9" d="${linePath(rows,'ema9',x,y) || linePath(rows,'ema10',x,y)}"/><path class="mcv2-line price" d="${linePath(rows,'close',x,y)}"/>
        ${rows.map((row,index) => `<circle tabindex="0" cx="${x(index)}" cy="${y(row.close)}" r="7" class="mcv2-hit"><title>${dateLabel(row.date)}\n${esc(marketInfo.benchmarkSymbol)}: ${number(row.close)}\nEMA 9: ${number(row.ema9 ?? row.ema10)}\nEMA 30: ${number(row.ema30 ?? row.ema20)}\nScore: ${number(row.score)}/100</title></circle>`).join('')}
      </svg>
    </div>
    <div class="mcv2-legend">
      <span class="price"><i></i>${t('Preço', 'Price')}</span>
      <span class="ema9"><i></i>EMA 9</span>
      <span class="ema30"><i></i>EMA 30</span>
    </div>`;
  }

  function checkRow(label, value, pass) {
    return `<div class="${pass ? 'pass' : 'attention'}"><span>${label}</span><b>${value}</b><i aria-label="${pass ? t('Confirmado', 'Confirmed') : t('Atenção', 'Attention')}">${pass ? '✓' : '!'}</i></div>`;
  }

  function MarketTransparentReading(cycle, marketInfo) {
    const info = regime(cycle);
    const slopes = hasNumber(cycle.ema9Slope) && Number(cycle.ema9Slope) > 0 && (!hasNumber(cycle.ema30Slope) || Number(cycle.ema30Slope) >= 0);
    const hasAtr = hasNumber(cycle.atr21);
    const isHealthy = cycle?.state === 'healthy';
    const ema9Val = hasNumber(cycle.ema9) ? Number(cycle.ema9) : Number(cycle.ema10);
    const ema30Val = hasNumber(cycle.ema30) ? Number(cycle.ema30) : Number(cycle.ema20);
    const structureVal = (ema9Val > ema30Val) || Boolean(cycle.structure);
    const above9Val = hasNumber(cycle.above9) ? Boolean(cycle.above9) : (Number(cycle.price) > ema9Val);
    const above30Val = hasNumber(cycle.above30) ? Boolean(cycle.above30) : (Number(cycle.price) > ema30Val);

    return `<aside class="mcv2-reading">
      <section>
        <h3>${t('Leitura transparente', 'Transparent reading')} · ${esc(marketInfo.benchmarkSymbol)}</h3>
        ${checkRow(t('Preço acima da EMA 9 (Curto prazo)','Price above 9 EMA (Short term)'), number(cycle.price), above9Val)}
        ${checkRow(t('Preço acima da EMA 30 (Médio prazo)','Price above 30 EMA (Medium term)'), number(cycle.price), above30Val)}
        ${checkRow(t('Estrutura das médias','Moving-average structure'), structureVal ? 'EMA 9 > EMA 30' : 'EMA 9 ≤ EMA 30', structureVal)}
        ${checkRow(t('Inclinação das médias','Moving-average slope'), slopes ? t('Positiva','Positive') : t('Sem confirmação','Unconfirmed'), slopes)}
        ${checkRow(t('Permissão operacional','Trading permission'), isHealthy ? t('Sim (Expansão)','Yes (Expansion)') : t('Não (Modo Defesa)','No (Defensive Mode)'), isHealthy)}
        ${hasAtr ? checkRow('ATR 21 (Volatilidade)', `${number(cycle.atr21, 0)} (${percent(cycle.atrPct)})`, true) : ''}
        ${checkRow(t('Score do mercado','Market score'), `${number(cycle.score)}/100`, cycle.score >= 70)}
      </section>
      <section class="mcv2-context">
        <h3>${t('Contexto atual', 'Current context')} ${icon('info')}</h3>
        <p>${info.context}</p>
      </section>
      <blockquote>“${t('Grandes lucros exigem suportar pequenas dores.', 'Great profits require enduring small pains.')}”</blockquote>
    </aside>`;
  }

  function changeFrom(row, previous, field) {
    const a = Number(row?.[field]), b = Number(previous?.[field]);
    return Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? (a / b - 1) * 100 : null;
  }

  function MarketEvidenceCards(cycle, history, marketInfo) {
    const current = history.at(-1), previous = history.at(-2);
    const score = scoreChange(history);
    const ema9Val = hasNumber(cycle.ema9) ? Number(cycle.ema9) : Number(cycle.ema10);
    const ema30Val = hasNumber(cycle.ema30) ? Number(cycle.ema30) : Number(cycle.ema20);
    const above9Val = hasNumber(cycle.above9) ? Boolean(cycle.above9) : (Number(cycle.price) > ema9Val);
    const above30Val = hasNumber(cycle.above30) ? Boolean(cycle.above30) : (Number(cycle.price) > ema30Val);

    const cards = [
      [t('Preço atual','Current price'), number(cycle.price), percent(changeFrom(current,previous,'close'))],
      [
        'EMA 9 (Curto)',
        number(ema9Val),
        above9Val ? t('↗ Acima da média', '↗ Above average') : t('↘ Abaixo da média', '↘ Below average')
      ],
      [
        'EMA 30 (Médio)',
        number(ema30Val),
        above30Val ? t('↗ Acima da média', '↗ Above average') : t('↘ Abaixo da média', '↘ Below average')
      ],
      [
        t('Variação do score','Score change'),
        score ? `${score.value > 0 ? '+' : ''}${number(score.value)} ${t('pontos','points')}` : '—',
        score ? `${t('últimos','last')} ${score.sessions} ${t('pregões','sessions')}` : t('Histórico insuficiente','Insufficient history')
      ]
    ];
    return `<div class="mcv2-evidence">${cards.map(([label,value,detail]) => `<article><small>${label}</small><b>${value}</b><span>${detail}</span></article>`).join('')}</div>`;
  }

  function render() {
    syncActiveLayout();
    const currentMarket = state.currentMarket || 'stock_b3';
    const marketInfo = MARKET_REGISTRY[currentMarket] || MARKET_REGISTRY.stock_b3;
    const mState = state.markets[currentMarket] || { status: 'loading', payload: null, error: '', range: '1y' };

    if (mState.status === 'loading') {
      root.innerHTML = `<div class="mcv2-page is-loading">
        <div class="mcv2-shell">
          <header class="mcv2-heading">
            <div>
              <p>The Healthy Trend Trader / <b>${t('Ciclo de Mercado','Market Cycle')}</b></p>
              <h1>${t('Ciclo de Mercado','Market Cycle')}</h1>
              <em>${t('Antes de escolher o cavalo, entenda a pista.','Before choosing the horse, understand the track.')}</em>
            </div>
            <div class="mcv2-heading-center">
              ${MarketSelector()}
            </div>
            <blockquote>“${t('O mercado não é ON/OFF.<br>É um ambiente para se posicionar.','The market is not ON/OFF.<br>It is an environment to position within.')}”</blockquote>
          </header>
          <div class="mcv2-loading">
            <i></i>
            <b>${t(`Lendo o ambiente de ${marketInfo.name} (${marketInfo.benchmarkSymbol})…`, `Reading the market environment for ${marketInfo.name} (${marketInfo.benchmarkSymbol})…`)}</b>
            <span>${t('Carregando fechamento, médias e histórico oficial da B3.', 'Loading close, averages and official B3 history.')}</span>
          </div>
        </div>
      </div>`;
      return;
    }

    if (mState.status === 'error') {
      root.innerHTML = `<div class="mcv2-page is-error">
        <div class="mcv2-shell">
          <header class="mcv2-heading">
            <div>
              <p>The Healthy Trend Trader / <b>${t('Ciclo de Mercado','Market Cycle')}</b></p>
              <h1>${t('Ciclo de Mercado','Market Cycle')}</h1>
              <em>${t('Antes de escolher o cavalo, entenda a pista.','Before choosing the horse, understand the track.')}</em>
            </div>
            <div class="mcv2-heading-center">
              ${MarketSelector()}
            </div>
            <blockquote>“${t('O mercado não é ON/OFF.<br>É um ambiente para se posicionar.','The market is not ON/OFF.<br>It is an environment to position within.')}”</blockquote>
          </header>
          <div class="mcv2-loading">
            <b>${t(`Não foi possível ler o Ciclo de Mercado para ${marketInfo.name}.`, `Market Cycle could not be loaded for ${marketInfo.name}.`)}</b>
            <span>${esc(mState.error)}</span>
            <button type="button" data-market-retry>${t('Tentar novamente', 'Try again')}</button>
          </div>
        </div>
      </div>`;
      return;
    }

    const payload = mState.payload;
    const cycle = payload?.cycle || {};
    const history = Array.isArray(payload?.benchmark?.history) ? payload.benchmark.history : [];
    if (!hasNumber(cycle.price) || history.length < 2) {
      root.innerHTML = `<div class="mcv2-page is-empty">
        <div class="mcv2-shell">
          <header class="mcv2-heading">
            <div>
              <p>The Healthy Trend Trader / <b>${t('Ciclo de Mercado','Market Cycle')}</b></p>
              <h1>${t('Ciclo de Mercado','Market Cycle')}</h1>
              <em>${t('Antes de escolher o cavalo, entenda a pista.','Before choosing the horse, understand the track.')}</em>
            </div>
            <div class="mcv2-heading-center">
              ${MarketSelector()}
            </div>
            <blockquote>“${t('O mercado não é ON/OFF.<br>É um ambiente para se posicionar.','The market is not ON/OFF.<br>It is an environment to position within.')}”</blockquote>
          </header>
          <div class="mcv2-loading">
            <b>${t(`Ainda não há histórico suficiente para ${marketInfo.name} (${marketInfo.benchmarkSymbol}).`, `There is not enough history yet for ${marketInfo.name} (${marketInfo.benchmarkSymbol}).`)}</b>
            <span>${t('A leitura aparecerá assim que o fechamento oficial da B3 tiver observações suficientes para calcular o ambiente sem inventar dados.', 'The reading will appear as soon as the official B3 close has enough observations to calculate the environment without inventing data.')}</span>
            <button type="button" data-market-retry>${t('Consultar novamente', 'Check again')}</button>
          </div>
        </div>
      </div>`;
      return;
    }

    const snapshot = getMarketSnapshot(currentMarket);
    const info = regime(cycle);
    const activeRegime = cycle?.state === 'healthy' ? 'healthy' : 'defensive';
    root.innerHTML = `<div class="mcv2-page regime-${activeRegime}" data-market-regime="${activeRegime}">
      <div class="mcv2-shell">
        <header class="mcv2-heading">
          <div>
            <p>The Healthy Trend Trader / <b>${t('Ciclo de Mercado','Market Cycle')}</b></p>
            <h1>${t('Ciclo de Mercado','Market Cycle')}</h1>
            <em>${t('Antes de escolher o cavalo, entenda a pista.','Before choosing the horse, understand the track.')}</em>
          </div>
          <div class="mcv2-heading-center">
            ${MarketSelector()}
            ${MarketFreshness(cycle.date || history.at(-1)?.date, payload?.source)}
          </div>
          ${marketStatus(cycle.date || history.at(-1)?.date, payload.source, marketInfo, snapshot)}
          <blockquote>“${t('O mercado não é ON/OFF.<br>É um ambiente para se posicionar.','The market is not ON/OFF.<br>It is an environment to position within.')}”</blockquote>
        </header>
        ${MarketCycleHero(cycle, history, marketInfo)}
        ${MarketRegimeBar(cycle)}
        <section class="mcv2-analysis">
          <article class="mcv2-chart-card">
            ${MarketDailyChart(history, payload.source, marketInfo, mState.range)}
            ${MarketEvidenceCards(cycle, history, marketInfo)}
          </article>
          ${MarketTransparentReading(cycle, marketInfo)}
        </section>
        ${MarketBreadth(payload.breadth, marketInfo)}
        <footer>
          <span>${info.permission}</span>
          <b>${t('Disciplina gera liberdade.','Discipline creates freedom.')}</b>
        </footer>
      </div>
    </div>`;
  }

  async function load(marketId = state.currentMarket, force = false) {
    if (!MARKET_REGISTRY[marketId]) marketId = 'stock_b3';
    state.currentMarket = marketId;
    const current = state.markets[marketId];
    if (!force && current?.payload) {
      render();
      return;
    }
    state.markets[marketId] = { ...current, status: 'loading', error: '' };
    render();
    try {
      const response = await fetch(`${api()}?market=${marketId}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      const history = Array.isArray(payload?.benchmark?.history) ? payload.benchmark.history : [];
      let range = current.range || '1y';
      if (!ranges.some(([id, days]) => id === range && history.length >= days)) {
        range = ranges.filter(([, days]) => history.length >= days).at(-1)?.[0] || '1m';
      }
      state.markets[marketId] = { status: 'ready', payload, error: '', range };
      persistMarketSnapshot(marketId, payload);
      render();
    } catch (error) {
      state.markets[marketId] = {
        ...current,
        status: 'error',
        error: error.message || t('Falha ao consultar os dados solicitados.', 'Failed to query the requested data.')
      };
      render();
    }
  }

  root.addEventListener('click', event => {
    const marketSelect = event.target.closest('[data-market-select]')?.dataset.marketSelect;
    if (marketSelect && marketSelect !== state.currentMarket) {
      load(marketSelect);
      return;
    }
    const range = event.target.closest('[data-market-range]')?.dataset.marketRange;
    if (range) {
      if (state.markets[state.currentMarket]) {
        state.markets[state.currentMarket].range = range;
        render();
      }
      return;
    }
    if (event.target.closest('[data-open-scans]')) { go('marketscans'); return; }
    if (event.target.closest('[data-market-retry]')) load(state.currentMarket, true);
  });

  window.renderMarketCycle = render;
  window.loadMarketCycleV2 = load;
  window.MARKET_REGISTRY = MARKET_REGISTRY;
  window.getMarketCycleSnapshot = getMarketSnapshot;
  window.persistMarketCycleSnapshot = persistMarketSnapshot;
  window.addEventListener('healthyTrend:authenticated', () => load(state.currentMarket, true));
  load();
}());
