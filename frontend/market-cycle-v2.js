(function () {
  'use strict';
  const root = document.getElementById('marketcycle');
  if (!root) return;

  const BENCHMARKS = [
    { id: 'IBOV', name: 'IBOV (Brasil)', symbol: '^BVSP', market: 'BR', flag: '🇧🇷' },
    { id: 'IFIX', name: 'IFIX (FIIs)', symbol: 'IFIX', market: 'BR', flag: '🏢' },
    { id: 'BDRX', name: 'BDRX (BDRs)', symbol: 'BDRX', market: 'BR', flag: '🌐' }
  ];

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

  function getMarketSnapshot(marketId) {
    try {
      const saved = JSON.parse(localStorage.getItem(SNAPSHOTS_STORAGE_KEY) || '{}');
      return saved[marketId] || null;
    } catch {
      return null;
    }
  }

  function persistMarketSnapshot(marketId, payload) {
    if (!payload) return null;
    try {
      const saved = JSON.parse(localStorage.getItem(SNAPSHOTS_STORAGE_KEY) || '{}');
      const marketInfo = MARKET_REGISTRY[marketId] || MARKET_REGISTRY.stock_b3;
      const cycle = payload.cycle || {};
      const history = Array.isArray(payload.benchmark?.history) ? payload.benchmark.history : [];
      const currentRegime = payload.marketRegime?.current || {};
      const isUp = (currentRegime.direction || cycle.direction || '').toUpperCase() === 'UP';
      const isHealthy = cycle.state === 'healthy' || (cycle.state ? cycle.state === 'healthy' : isUp);
      const snapshot = {
        market: marketId,
        marketLabel: marketInfo.name,
        benchmarkSymbol: marketInfo.benchmarkSymbol,
        benchmarkName: marketInfo.benchmarkName,
        classification: isHealthy ? 'healthy' : 'defensive',
        score: Number(cycle.score) || (isHealthy ? 73 : 48),
        evaluatedAt: new Date().toISOString(),
        dataDate: cycle.date || history.at(-1)?.date || currentRegime.reference_date || null,
        dataVersion: payload.source || 'b3-indexes',
        ema10: Number(cycle.ema10 ?? cycle.ema9) || null,
        ema72: Number(cycle.ema72 ?? cycle.ema30) || null,
        ema9: Number(cycle.ema10 ?? cycle.ema9) || null,
        ema30: Number(cycle.ema72 ?? cycle.ema30) || null,
        above10: cycle.above10 !== undefined ? Boolean(cycle.above10) : Boolean(cycle.above9 ?? isUp),
        above72: cycle.above72 !== undefined ? Boolean(cycle.above72) : Boolean(cycle.above30 ?? isUp),
        above9: cycle.above9 !== undefined ? Boolean(cycle.above9) : Boolean(cycle.above10 ?? isUp),
        above30: cycle.above30 !== undefined ? Boolean(cycle.above30) : Boolean(cycle.above72 ?? isUp),
        rawPrice: Number(cycle.price || history.at(-1)?.close || currentRegime.close_price) || null,
        closePrice: Number(cycle.price || history.at(-1)?.close || currentRegime.close_price) || null,
        regime: currentRegime.regime || (isHealthy ? 'UP_QUIET' : 'DOWN_VOLATILE'),
        indicators: {
          above10: cycle.above10 !== undefined ? Boolean(cycle.above10) : Boolean(cycle.above9 ?? isUp),
          above72: cycle.above72 !== undefined ? Boolean(cycle.above72) : Boolean(cycle.above30 ?? isUp),
          above9: cycle.above9 !== undefined ? Boolean(cycle.above9) : Boolean(cycle.above10 ?? isUp),
          above30: cycle.above30 !== undefined ? Boolean(cycle.above30) : Boolean(cycle.above72 ?? isUp)
        }
      };
      saved[marketId] = snapshot;
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(saved));
      return snapshot;
    } catch {
      return null;
    }
  }

  const REGIME_METADATA = {
    UP_QUIET: {
      id: 'UP_QUIET',
      label: 'Up – Quiet',
      title: 'Up – Quiet',
      name: 'Tendência de alta com baixa volatilidade',
      sublabel: 'Alta + baixa volatilidade',
      direction: 'Up',
      volatility: 'Quiet',
      color: '#16a879',
      badgeClass: 'regime-up-quiet',
      icon: 'arrow-up'
    },
    UP_VOLATILE: {
      id: 'UP_VOLATILE',
      label: 'Up – Volatile',
      title: 'Up – Volatile',
      name: 'Tendência de alta com alta volatilidade',
      sublabel: 'Alta + alta volatilidade',
      direction: 'Up',
      volatility: 'Volatile',
      color: '#f59e0b',
      badgeClass: 'regime-up-volatile',
      icon: 'arrow-up-right'
    },
    SIDEWAYS_QUIET: {
      id: 'SIDEWAYS_QUIET',
      label: 'Sideways – Quiet',
      title: 'Sideways – Quiet',
      name: 'Lateral com baixa volatilidade',
      sublabel: 'Lateral + baixa volatilidade',
      direction: 'Sideways',
      volatility: 'Quiet',
      color: '#3b82f6',
      badgeClass: 'regime-sideways-quiet',
      icon: 'arrow-left-right'
    },
    SIDEWAYS_VOLATILE: {
      id: 'SIDEWAYS_VOLATILE',
      label: 'Sideways – Volatile',
      title: 'Sideways – Volatile',
      name: 'Lateral com alta volatilidade',
      sublabel: 'Lateral + alta volatilidade',
      direction: 'Sideways',
      volatility: 'Volatile',
      color: '#b45309',
      badgeClass: 'regime-sideways-volatile',
      icon: 'zigzag'
    },
    DOWN_QUIET: {
      id: 'DOWN_QUIET',
      label: 'Down – Quiet',
      title: 'Down – Quiet',
      name: 'Baixa com baixa volatilidade',
      sublabel: 'Baixa + baixa volatilidade',
      direction: 'Down',
      volatility: 'Quiet',
      color: '#64748b',
      badgeClass: 'regime-down-quiet',
      icon: 'arrow-down-right'
    },
    DOWN_VOLATILE: {
      id: 'DOWN_VOLATILE',
      label: 'Down – Volatile',
      title: 'Down – Volatile',
      name: 'Baixa com alta volatilidade',
      sublabel: 'Baixa + alta volatilidade',
      direction: 'Down',
      volatility: 'Volatile',
      color: '#dc4545',
      badgeClass: 'regime-down-volatile',
      icon: 'arrow-down'
    }
  };

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
    const normalized = /^\d{8}$/.test(raw) ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw.slice(0, 10);
    const parsed = new Date(`${normalized}T12:00:00Z`);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }

  const dateLabel = value => {
    const parsed = parseDate(value);
    return parsed ? parsed.toLocaleDateString(window.appLanguage === 'en-US' ? 'en-US' : 'pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) : '—';
  };

  function formatDateWithWeekday(value) {
    const d = parseDate(value);
    if (!d) return '—';
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    const weekdaysPt = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    const weekdaysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = (window.appLanguage === 'en-US' ? weekdaysEn : weekdaysPt)[d.getUTCDay()];
    return `${day}/${month}/${year} (${weekday})`;
  }

  const svgIcons = {
    'chart-title': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a879" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 9l-5 5-4-4-3 3"/></svg>',
    'chart-section': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a879" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8M17 7h4v4"/></svg>',
    'stack-section': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a879" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
    'arrow-up': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l10-10M17 17V7H7"/></svg>',
    'arrow-up-right': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l10-10M17 17V7H7"/></svg>',
    'arrow-left-right': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8L22 12L18 16M6 16L2 12L6 8M2 12H22"/></svg>',
    'zigzag': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8M17 7h4v4"/></svg>',
    'arrow-down-right': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7l10 10M17 7v10H7"/></svg>',
    'arrow-down': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7l10 10M17 7v10H7"/></svg>',
    'percent': '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a879" stroke-width="2.5"><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M20 4L4 20"/></svg>',
    'bars': '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a879" stroke-width="2.2"><path d="M12 20V10M18 20V4M6 20v-6"/></svg>',
    'bars-signal': '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a879" stroke-width="2.2"><path d="M2 20h20M5 16v4M11 12v8M17 8v12"/></svg>',
    'delta': '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>',
    'candles': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v3M6 18v3M4 6h4v12H4zM18 6v3M18 15v3M16 9h4v6h-4z"/></svg>',
    'trophy': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2M4 22h16M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34M6 3h12v7a6 6 0 0 1-12 0V3z"/></svg>',
    'alert': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    'chart': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>',
    'check': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
    'info': '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    'calendar': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    'clipboard-empty': '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#16a879" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14l2 2 4-4"/></svg>',
    'link': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
  };

  let state = {
    currentBenchmark: 'IBOV',
    data: {},
    performance: null,
    loading: false,
    error: null,
    showEma10: true,
    showEma72: true,
    period: '6_meses',
    hoverCandle: null
  };

  function syncActiveLayout() {
    const active = root.classList.contains('active');
    document.documentElement.classList.toggle('market-cycle-active', active);
    document.body.classList.toggle('market-cycle-active', active);
  }
  syncActiveLayout();
  new MutationObserver(syncActiveLayout).observe(root, { attributes: true, attributeFilter: ['class'] });

  /**
   * Top Header com título, status de mercado, data formatada e seletor em pills dos benchmarks brasileiros
   */
  function renderHeader(benchmarkInfo, dataDate) {
    return `<div class="mre-header">
      <div class="mre-title-block">
        <div class="mre-title-row">
          <span class="mre-header-icon">${svgIcons['chart-title']}</span>
          <h1 class="mre-title">${t('Ciclo de Mercado', 'Market Cycle')}</h1>
        </div>
        <p class="mre-subtitle">${t('Regime de mercado atual, histórico e performance do seu sistema', 'Current market regime, history and performance of your system')}</p>
      </div>
      <div class="mre-header-controls">
        <div class="mre-badge-closed">
          <span class="mre-closed-dot"></span>
          <span>${t('Mercado fechado', 'Market closed')}</span>
        </div>
        <div class="mre-badge-date">
          ${svgIcons.calendar}
          <span>${t('Dados de:', 'Data from:')} ${esc(formatDateWithWeekday(dataDate))}</span>
        </div>
        <div class="mre-benchmark-group">
          <span class="mre-benchmark-label">${t('Benchmark:', 'Benchmark:')}</span>
          <div class="mre-benchmark-pills" role="radiogroup">
            ${BENCHMARKS.map(b => `
              <button type="button" class="mre-pill-btn ${b.id === benchmarkInfo.id ? 'active' : ''}" data-benchmark-pill="${esc(b.id)}">
                ${esc(b.id)}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Card 1: Regime Atual do Mercado (Hero Tile Gradient)
   */
  function renderCurrentRegimeCard(currentRegime) {
    const regCode = currentRegime?.regime || 'UP_VOLATILE';
    const meta = REGIME_METADATA[regCode] || REGIME_METADATA.UP_VOLATILE;

    return `<div class="mre-card mre-current-card">
      <div class="mre-card-header">
        <h2 class="mre-card-title">
          ${t('Regime Atual do Mercado', 'Current Market Regime')}
          <span class="mre-card-info-icon" title="${t('Classificação diária consolidada combinando direção tendencial e patamar de volatilidade.', 'Consolidated daily classification combining trend direction and volatility level.')}">
            ${svgIcons.info}
          </span>
        </h2>
      </div>
      <div class="mre-hero-tile ${meta.badgeClass}">
        <div class="mre-hero-circle">
          ${svgIcons[meta.icon] || svgIcons['arrow-up-right']}
        </div>
        <h3 class="mre-hero-title">${esc(meta.title)}</h3>
        <p class="mre-hero-subtitle">${esc(meta.name)}</p>
        <div class="mre-hero-badge">
          ${t('REGIME ATUAL', 'CURRENT REGIME')}
        </div>
      </div>
      <div class="mre-strategy-guidance-box" style="margin-top: 14px; padding: 12px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); font-size: 11.5px; line-height: 1.45;">
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px; font-weight:700; color:#34d399;">
          <span>📈</span> <span>Trend Following:</span>
        </div>
        <div style="color:#cbd5e1; margin-bottom:8px;">${(meta.title || '').includes('ALTA') ? 'Ambiente favorável para condução, expansão e novos setups de continuação.' : 'Proteção de capital: não abrir novas compras em tendência sem confirmação de reversão.'}</div>
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px; font-weight:700; color:#38bdf8;">
          <span>⚡</span> <span>Volatility Trading (IFR2):</span>
        </div>
        <div style="color:#cbd5e1;">${(meta.title || '').includes('ALTA') ? 'Correções e sobrevendidos acima da SMA200 geram excelentes repiques de reversão à média curta.' : 'Requer atenção estrita ao filtro estrutural (preço > SMA200 do próprio ativo), operando repiques táticos com saída temporal D7.'}</div>
      </div>
    </div>`;
  }

  /**
   * Card 2: Principais Métricas de Volatilidade
   */
  function renderVolatilityMetricsCard(currentRegime, dataDate) {
    const atr21 = hasNumber(currentRegime?.atr_21) ? number(currentRegime.atr_21, 2) : '—';
    const atrPct = hasNumber(currentRegime?.atr_percentage) ? `${number(currentRegime.atr_percentage, 2)}%` : '—';
    const atrSma252 = hasNumber(currentRegime?.atr_percentage_sma_252) ? `${number(currentRegime.atr_percentage_sma_252, 2)}%` : '—';
    const dev = hasNumber(currentRegime?.volatility_deviation) ? Number(currentRegime.volatility_deviation) : null;
    const devFormatted = dev !== null ? `${dev >= 0 ? '+' : ''}${number(dev, 1)}%` : '—';
    const devClass = dev !== null ? (dev > 0 ? 'is-elevated' : 'is-quiet') : '';

    return `<div class="mre-card mre-volatility-card">
      <div class="mre-card-header">
        <h2 class="mre-card-title">
          ${t('Principais Métricas de Volatilidade', 'Key Volatility Metrics')}
          <span class="mre-card-info-icon" title="${t('Parâmetros quantitativos do modelo: ATR(21) de Wilder, ATR% normalizado e Média Móvel de 252 pregões.', 'Quantitative model parameters: Wilder ATR(21), normalized ATR% and 252-session Moving Average.')}">
            ${svgIcons.info}
          </span>
        </h2>
        <span class="mre-card-date-sub">
          ${t('Última atualização:', 'Last update:')} ${dateLabel(dataDate || currentRegime?.reference_date)}
        </span>
      </div>
      <div class="mre-metrics-list">
        <div class="mre-metric-row">
          <span class="mre-metric-label">
            <span class="mre-metric-icon">${svgIcons.percent}</span>
            ATR (21)
          </span>
          <strong class="mre-metric-val">${esc(atr21)}</strong>
        </div>
        <div class="mre-metric-row">
          <span class="mre-metric-label">
            <span class="mre-metric-icon">${svgIcons.bars}</span>
            ${t('ATR % (atual)', 'ATR % (current)')}
          </span>
          <strong class="mre-metric-val">${esc(atrPct)}</strong>
        </div>
        <div class="mre-metric-row">
          <span class="mre-metric-label">
            <span class="mre-metric-icon">${svgIcons['bars-signal']}</span>
            ${t('ATR % – MM (252)', 'ATR % – SMA (252)')}
          </span>
          <strong class="mre-metric-val">${esc(atrSma252)}</strong>
        </div>
        <div class="mre-metric-row">
          <span class="mre-metric-label">
            <span class="mre-metric-icon ${devClass}">${svgIcons.delta}</span>
            ${t('Desvio da Volatilidade', 'Volatility Deviation')}
          </span>
          <strong class="mre-metric-val ${devClass}">${esc(devFormatted)}</strong>
        </div>
      </div>
    </div>`;
  }

  /**
   * Card 3: Os 6 Regimes de Mercado (Grid 2x3 Pastel com Regime Ativo destacado)
   */
  function renderSixRegimesCard(activeRegimeId) {
    const list = Object.values(REGIME_METADATA);
    return `<div class="mre-card mre-six-card">
      <div class="mre-card-header">
        <h2 class="mre-card-title">
          ${t('Os 6 Regimes de Mercado', 'The 6 Market Regimes')}
          <span class="mre-card-info-icon" title="${t('Espaço amostral completo dos 6 estados possíveis gerados pelo motor.', 'Complete state space of the 6 possible regimes generated by the engine.')}">
            ${svgIcons.info}
          </span>
        </h2>
      </div>
      <div class="mre-six-grid">
        ${list.map(r => {
          const isActive = r.id === activeRegimeId;
          return `<div class="mre-regime-box ${r.badgeClass} ${isActive ? 'is-active' : ''}">
            <div class="mre-box-icon">
              ${svgIcons[r.icon]}
            </div>
            <div class="mre-box-texts">
              <strong class="mre-box-title">${esc(r.title)}</strong>
              <span class="mre-box-sub">${esc(r.sublabel)}</span>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  /**
   * Seção B: Histórico de Regimes e Preço do Índice (Candlesticks com EMAs)
   */
  function renderHistorySection(benchmarkInfo, historyCandles, periods, distribution, dataDate, currentRegime) {
    const candles = Array.isArray(historyCandles) ? historyCandles : [];
    
    // Período de filtragem
    let count = 126; // 6 meses padrão
    if (state.period === '1_ano') count = 252;
    else if (state.period === '2_anos') count = 504;
    else if (state.period === 'max') count = candles.length;

    const filteredCandles = candles.slice(-Math.min(count, candles.length));
    const lastCandle = filteredCandles.at(-1) || {};
    const prevCandle = filteredCandles.length > 1 ? filteredCandles.at(-2) : null;
    
    const displayCandle = state.hoverCandle || lastCandle;
    const price = hasNumber(displayCandle.close) ? Number(displayCandle.close) : Number(currentRegime?.close_price || 0);
    const ema10Val = hasNumber(displayCandle.ema10) ? Number(displayCandle.ema10) : Number(currentRegime?.ema_10 || 0);
    const ema72Val = hasNumber(displayCandle.ema72) ? Number(displayCandle.ema72) : Number(currentRegime?.ema_72 || 0);
    
    let varPct = 0;
    if (prevCandle && hasNumber(lastCandle.close) && hasNumber(prevCandle.close) && prevCandle.close > 0) {
      varPct = ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100;
    }

    const chartSvg = renderCandlestickSvg(filteredCandles, benchmarkInfo.id);

    return `<div class="mre-card mre-chart-card">
      <div class="mre-card-header mre-chart-header">
        <div class="mre-chart-title-group">
          <span class="mre-chart-icon">${svgIcons['chart-section']}</span>
          <h2 class="mre-card-title">
            ${t(`Histórico de Regimes e Preço do Índice (${benchmarkInfo.id})`, `Regime History and Index Price (${benchmarkInfo.id})`)}
            <span class="mre-card-info-icon" title="${t('Série histórica oficial de candles diários com as médias móveis operacionais exponenciais EMA 10 e EMA 72.', 'Official historical daily candle series with operational exponential moving averages EMA 10 and EMA 72.')}">
              ${svgIcons.info}
            </span>
          </h2>
        </div>

        <div class="mre-chart-toolbar">
          <label class="mre-toggle-label mre-toggle-ema10">
            <input type="checkbox" data-toggle-ema="10" ${state.showEma10 ? 'checked' : ''}>
            <span class="mre-custom-box mre-box-ema10"></span>
            <span class="mre-toggle-text">EMA 10</span>
          </label>

          <label class="mre-toggle-label mre-toggle-ema72">
            <input type="checkbox" data-toggle-ema="72" ${state.showEma72 ? 'checked' : ''}>
            <span class="mre-custom-box mre-box-ema72"></span>
            <span class="mre-toggle-text">EMA 72</span>
          </label>

          <div class="mre-badge-candles">
            ${svgIcons.candles}
            <span>${t('Candles', 'Candles')}</span>
          </div>

          <div class="mre-period-wrapper">
            <span class="mre-period-label">${t('Período:', 'Period:')}</span>
            <select class="mre-period-select" data-period-select aria-label="${t('Selecionar Período', 'Select Period')}">
              <option value="6_meses" ${state.period === '6_meses' ? 'selected' : ''}>${t('6 meses', '6 months')}</option>
              <option value="1_ano" ${state.period === '1_ano' ? 'selected' : ''}>${t('1 ano', '1 year')}</option>
              <option value="2_anos" ${state.period === '2_anos' ? 'selected' : ''}>${t('2 anos', '2 years')}</option>
              <option value="max" ${state.period === 'max' ? 'selected' : ''}>${t('Máximo', 'Maximum')}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="mre-stat-line">
        <span class="mre-stat-ticker">${esc(benchmarkInfo.id)} (Diário)</span>
        <strong class="mre-stat-price">${number(price, 2)}</strong>
        <span class="mre-stat-var ${varPct >= 0 ? 'is-pos' : 'is-neg'}">
          ${varPct >= 0 ? '+' : ''}${number(varPct, 2)}%
        </span>
        <span class="mre-stat-divider">—</span>
        <span class="mre-stat-ema mre-stat-ema10">EMA 10 <strong>${number(ema10Val, 2)}</strong></span>
        <span class="mre-stat-divider">—</span>
        <span class="mre-stat-ema mre-stat-ema72">EMA 72 <strong>${number(ema72Val, 2)}</strong></span>
      </div>

      <div class="mre-chart-area-wrapper">
        ${chartSvg}
      </div>

      <div class="mre-timeline-section">
        <div class="mre-timeline-heading">
          <span>${t('Linha do Tempo dos Regimes', 'Regime Timeline')}</span>
          <span class="mre-card-info-icon" title="${t('Mapeamento cronológico das transições de regime de mercado.', 'Chronological mapping of market regime transitions.')}">${svgIcons.info}</span>
        </div>
        <div class="mre-ribbon-bar">
          ${renderRibbonSegments(filteredCandles)}
        </div>
        <div class="mre-timeline-legend">
          <span class="mre-legend-title">${t('Legenda dos Regimes:', 'Regime Legend:')}</span>
          <div class="mre-legend-items-row">
            <span class="mre-legend-item"><span class="mre-dot" style="background:#16a879;"></span> Up – Quiet</span>
            <span class="mre-legend-item"><span class="mre-dot" style="background:#f59e0b;"></span> Up – Volatile</span>
            <span class="mre-legend-item"><span class="mre-dot" style="background:#3b82f6;"></span> Sideways – Quiet</span>
            <span class="mre-legend-item"><span class="mre-dot" style="background:#b45309;"></span> Sideways – Volatile</span>
            <span class="mre-legend-item"><span class="mre-dot" style="background:#64748b;"></span> Down – Quiet</span>
            <span class="mre-legend-item"><span class="mre-dot" style="background:#dc4545;"></span> Down – Volatile</span>
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Renderiza a Ribbon contínua dos regimes alinhada à escala temporal do gráfico
   */
  function renderRibbonSegments(candles) {
    if (!candles || !candles.length) return '';
    const total = candles.length;
    const segments = [];
    let curRegime = null;
    let curCount = 0;

    for (let i = 0; i < total; i++) {
      const c = candles[i];
      const isUp = c.close >= (c.ema10 || c.close) && c.close >= (c.ema72 || c.close);
      const isDown = c.close < (c.ema10 || c.close) && c.close < (c.ema72 || c.close);
      const dir = isUp ? 'UP' : (isDown ? 'DOWN' : 'SIDEWAYS');
      const reg = c.regime || (dir === 'UP' ? 'UP_QUIET' : (dir === 'DOWN' ? 'DOWN_VOLATILE' : 'SIDEWAYS_QUIET'));

      if (reg !== curRegime) {
        if (curRegime) segments.push({ regime: curRegime, count: curCount });
        curRegime = reg;
        curCount = 1;
      } else {
        curCount++;
      }
    }
    if (curRegime) segments.push({ regime: curRegime, count: curCount });

    return segments.map(seg => {
      const pct = (seg.count / total) * 100;
      const meta = REGIME_METADATA[seg.regime] || REGIME_METADATA.UP_QUIET;
      return `<span class="mre-ribbon-seg" style="width: ${pct.toFixed(2)}%; background-color: ${meta.color};" title="${esc(meta.label)}: ${seg.count} pregões"></span>`;
    }).join('');
  }

  /**
   * Renderiza os Candlesticks reais e curvas de EMA 10 / EMA 72 em SVG
   */
  function renderCandlestickSvg(candles, benchmarkId) {
    if (!candles || !candles.length) {
      return `<div class="mre-chart-empty">${t('Sem histórico disponível para este benchmark.', 'No history available for this benchmark.')}</div>`;
    }

    const W = 1200;
    const H = 340;
    const padTop = 15;
    const padBottom = 35;
    const padLeft = 15;
    const padRight = 75;
    const plotW = W - padLeft - padRight;
    const plotH = H - padTop - padBottom;

    // Calcular limites de preço
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (const c of candles) {
      const low = hasNumber(c.low) ? Number(c.low) : Number(c.close);
      const high = hasNumber(c.high) ? Number(c.high) : Number(c.close);
      if (low < minPrice) minPrice = low;
      if (high > maxPrice) maxPrice = high;
      if (state.showEma10 && hasNumber(c.ema10)) {
        if (c.ema10 < minPrice) minPrice = c.ema10;
        if (c.ema10 > maxPrice) maxPrice = c.ema10;
      }
      if (state.showEma72 && hasNumber(c.ema72)) {
        if (c.ema72 < minPrice) minPrice = c.ema72;
        if (c.ema72 > maxPrice) maxPrice = c.ema72;
      }
    }

    const pRange = maxPrice - minPrice || 1;
    const pMin = minPrice - pRange * 0.04;
    const pMax = maxPrice + pRange * 0.04;
    const pSpan = pMax - pMin || 1;

    const getX = i => padLeft + (i / Math.max(1, candles.length - 1)) * plotW;
    const getY = p => padTop + (1 - (p - pMin) / pSpan) * plotH;

    // Grade horizontal e escala de preços à direita
    const gridSteps = 6;
    const gridLines = [];
    const stepVal = pSpan / gridSteps;
    for (let s = 0; s <= gridSteps; s++) {
      const p = pMin + s * stepVal;
      const y = getY(p);
      gridLines.push(`
        <line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${padLeft + plotW}" y2="${y.toFixed(1)}" stroke="#e5ece8" stroke-dasharray="3 3"/>
        <text x="${padLeft + plotW + 10}" y="${(y + 4).toFixed(1)}" fill="#84978f" font-size="11.5" font-weight="500" font-family="Inter,sans-serif">${number(p, 0)}</text>
      `);
    }

    // Rótulos de data no eixo X
    const dateLabels = [];
    const dateStep = Math.max(1, Math.floor(candles.length / 8));
    for (let i = 0; i < candles.length; i += dateStep) {
      const x = getX(i);
      const d = parseDate(candles[i]?.date);
      const monthStr = d ? d.toLocaleDateString(window.appLanguage === 'en-US' ? 'en-US' : 'pt-BR', { month: 'short', year: '2-digit' }) : '';
      dateLabels.push(`<text x="${x.toFixed(1)}" y="${H - 10}" fill="#84978f" font-size="11" font-weight="500" text-anchor="middle" font-family="Inter,sans-serif">${esc(monthStr)}</text>`);
    }

    // Candlesticks (Wicks e Bodies)
    const candleW = Math.max(1.8, Math.min(5.5, (plotW / candles.length) * 0.75));
    const candleElements = [];
    const ema10Points = [];
    const ema72Points = [];

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const x = getX(i);
      const open = hasNumber(c.open) ? Number(c.open) : Number(c.close);
      const close = Number(c.close);
      const high = hasNumber(c.high) ? Number(c.high) : Math.max(open, close);
      const low = hasNumber(c.low) ? Number(c.low) : Math.min(open, close);

      const yHigh = getY(high);
      const yLow = getY(low);
      const yOpen = getY(open);
      const yClose = getY(close);

      const isBull = close >= open;
      const color = isBull ? '#16a879' : '#dc4545';
      const bodyY = Math.min(yOpen, yClose);
      const bodyH = Math.max(1.5, Math.abs(yClose - yOpen));

      candleElements.push(`
        <g class="mre-candle" data-index="${i}">
          <line x1="${x.toFixed(1)}" y1="${yHigh.toFixed(1)}" x2="${x.toFixed(1)}" y2="${yLow.toFixed(1)}" stroke="${color}" stroke-width="1.2"/>
          <rect x="${(x - candleW / 2).toFixed(1)}" y="${bodyY.toFixed(1)}" width="${candleW.toFixed(1)}" height="${bodyH.toFixed(1)}" fill="${color}" stroke="${color}" stroke-width="0.5" rx="0.5"/>
        </g>
      `);

      if (hasNumber(c.ema10)) {
        ema10Points.push(`${x.toFixed(1)},${getY(c.ema10).toFixed(1)}`);
      }
      if (hasNumber(c.ema72)) {
        ema72Points.push(`${x.toFixed(1)},${getY(c.ema72).toFixed(1)}`);
      }
    }

    // Tooltip interativo / Crosshair
    let crosshairHtml = '';
    let tooltipHtml = '';
    if (state.hoverCandle) {
      const hIdx = state.hoverCandle.index;
      if (hIdx >= 0 && hIdx < candles.length) {
        const hc = candles[hIdx];
        const hx = getX(hIdx);
        const hy = getY(hc.close);
        crosshairHtml = `
          <line x1="${hx.toFixed(1)}" y1="${padTop}" x2="${hx.toFixed(1)}" y2="${padTop + plotH}" stroke="#84978f" stroke-dasharray="3 3" stroke-width="1.2" />
          <circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="4.5" fill="#16a879" stroke="#ffffff" stroke-width="2"/>
        `;

        // Regime na data
        const isUp = hc.close >= (hc.ema10 || hc.close) && hc.close >= (hc.ema72 || hc.close);
        const isDown = hc.close < (hc.ema10 || hc.close) && hc.close < (hc.ema72 || hc.close);
        const dir = isUp ? 'UP' : (isDown ? 'DOWN' : 'SIDEWAYS');
        const regCode = hc.regime || (dir === 'UP' ? 'UP_QUIET' : (dir === 'DOWN' ? 'DOWN_VOLATILE' : 'SIDEWAYS_QUIET'));
        const regMeta = REGIME_METADATA[regCode] || REGIME_METADATA.UP_QUIET;

        // Posição da Tooltip (evitar corte à direita)
        const tipX = hx > (W - 240) ? (hx - 185) : (hx + 15);
        const tipY = Math.max(padTop + 10, Math.min(hy - 40, padTop + plotH - 120));

        tooltipHtml = `
          <foreignObject x="${tipX.toFixed(1)}" y="${tipY.toFixed(1)}" width="175" height="135" class="mre-tooltip-object">
            <div class="mre-floating-tooltip">
              <div class="mre-tip-header">${dateLabel(hc.date)} (Diário)</div>
              <div class="mre-tip-body">
                <div class="mre-tip-row">
                  <span class="mre-tip-symbol">■ ${esc(benchmarkId)}</span>
                  <strong>${number(hc.close, 2)}</strong>
                </div>
                <div class="mre-tip-row">
                  <span class="mre-tip-ema10">— EMA 10</span>
                  <strong>${number(hc.ema10, 2)}</strong>
                </div>
                <div class="mre-tip-row">
                  <span class="mre-tip-ema72">— EMA 72</span>
                  <strong>${number(hc.ema72, 2)}</strong>
                </div>
                <div class="mre-tip-row mre-tip-regime-row">
                  <span>Regime</span>
                  <span class="mre-tip-reg-badge" style="background:${regMeta.color}20; color:${regMeta.color}; border: 1px solid ${regMeta.color}40;">
                    ${esc(regMeta.label)}
                  </span>
                </div>
              </div>
            </div>
          </foreignObject>
        `;
      }
    }

    return `<div class="mre-svg-container">
      <svg viewBox="0 0 ${W} ${H}" class="mre-candlestick-svg" preserveAspectRatio="none" data-chart-svg>
        <g class="mre-grid-lines">${gridLines.join('')}</g>
        <g class="mre-candles-group">${candleElements.join('')}</g>
        ${state.showEma72 && ema72Points.length ? `<polyline points="${ema72Points.join(' ')}" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
        ${state.showEma10 && ema10Points.length ? `<polyline points="${ema10Points.join(' ')}" fill="none" stroke="#16a879" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
        <g class="mre-crosshair-group">${crosshairHtml}</g>
        ${tooltipHtml}
        <g class="mre-dates-axis">${dateLabels.join('')}</g>
      </svg>
    </div>`;
  }

  /**
   * Seção C: Performance do Meu Sistema por Regime (Tabela + Card Lateral)
   */
  function renderPerformanceSection(perfData, dataDate) {
    const rows = Array.isArray(perfData?.rows) && perfData.rows.length ? perfData.rows : [
      { regime: 'UP_QUIET', label: 'Up – Quiet', color: '#16a879', hasData: false },
      { regime: 'UP_VOLATILE', label: 'Up – Volatile', color: '#f59e0b', hasData: false },
      { regime: 'SIDEWAYS_QUIET', label: 'Sideways – Quiet', color: '#3b82f6', hasData: false },
      { regime: 'SIDEWAYS_VOLATILE', label: 'Sideways – Volatile', color: '#b45309', hasData: false },
      { regime: 'DOWN_QUIET', label: 'Down – Quiet', color: '#64748b', hasData: false },
      { regime: 'DOWN_VOLATILE', label: 'Down – Volatile', color: '#dc4545', hasData: false }
    ];

    const hasRealTrades = Boolean(perfData?.hasData && perfData?.totalTrades > 0);
    const canRank = Boolean(perfData?.canRank && perfData?.bestRegime);

    return `<div class="mre-card mre-performance-card">
      <div class="mre-card-header mre-perf-header">
        <div class="mre-perf-title-group">
          <span class="mre-perf-icon">${svgIcons['stack-section']}</span>
          <h2 class="mre-card-title">
            ${t('Performance do Meu Sistema por Regime', 'My System Performance by Regime')}
            <span class="mre-card-info-icon" title="${t('Estatísticas calculadas exclusivamente a partir de operações reais registradas e encerradas no Trading Log.', 'Statistics calculated exclusively from real trades recorded and closed in Trading Log.')}">
              ${svgIcons.info}
            </span>
          </h2>
        </div>
        <div class="mre-badge-perf-update">
          ${svgIcons['chart-section']}
          <span>${t('Dados reais do Trading Log • período: — • Última atualização:', 'Real Trading Log data • period: — • Last update:')} ${dateLabel(dataDate)}</span>
        </div>
      </div>

      <div class="mre-performance-layout">
        <!-- Tabela à esquerda -->
        <div class="mre-table-column">
          <div class="mre-table-responsive">
            <table class="mre-perf-table">
              <thead>
                <tr>
                  <th>${t('Regime', 'Regime')}</th>
                  <th>${t('Trades', 'Trades')}</th>
                  <th>${t('Win Rate', 'Win Rate')}</th>
                  <th>${t('Profit Factor', 'Profit Factor')}</th>
                  <th>${t('Expectancy (R)', 'Expectancy (R)')}</th>
                  <th>${t('Resultado (R)', 'Result (R)')}</th>
                  <th>${t('Drawdown Máx.', 'Max Drawdown')}</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map(r => {
                  const hasRowData = hasRealTrades && r.hasData && r.trades > 0;
                  const expClass = hasRowData && r.expectancy > 0 ? 'is-pos' : (hasRowData && r.expectancy < 0 ? 'is-neg' : '');
                  const resClass = hasRowData && r.resultadoR > 0 ? 'is-pos' : (hasRowData && r.resultadoR < 0 ? 'is-neg' : '');

                  return `<tr>
                    <td class="mre-col-regime">
                      <span class="mre-reg-dot" style="background-color: ${r.color || '#94a3b8'};"></span>
                      <strong class="mre-reg-name">${esc(r.label)}</strong>
                    </td>
                    <td>${hasRowData ? esc(r.trades) : `<span class="mre-insufficient-badge">${t('Dados insuficientes', 'Insufficient data')}</span>`}</td>
                    <td>${hasRowData ? `${number(r.winRate, 0)}%` : `<span class="mre-insufficient-badge">${t('Dados insuficientes', 'Insufficient data')}</span>`}</td>
                    <td>${hasRowData ? number(r.profitFactor, 2) : `<span class="mre-insufficient-badge">${t('Dados insuficientes', 'Insufficient data')}</span>`}</td>
                    <td class="${expClass}">${hasRowData ? `<strong>${r.expectancy >= 0 ? '+' : ''}${number(r.expectancy, 2)}R</strong>` : `<span class="mre-insufficient-badge">${t('Dados insuficientes', 'Insufficient data')}</span>`}</td>
                    <td class="${resClass}">${hasRowData ? `<strong>${r.resultadoR >= 0 ? '+' : ''}${number(r.resultadoR, 1)}R</strong>` : `<span class="mre-insufficient-badge">${t('Dados insuficientes', 'Insufficient data')}</span>`}</td>
                    <td class="${hasRowData ? 'is-neg' : ''}">${hasRowData ? `${number(r.maxDrawdown, 1)}%` : `<span class="mre-insufficient-badge">${t('Dados insuficientes', 'Insufficient data')}</span>`}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Coluna à direita -->
        <div class="mre-summary-column">
          ${!hasRealTrades || !canRank ? `
            <div class="mre-empty-trades-card">
              <div class="mre-empty-icon-circle">
                ${svgIcons['clipboard-empty']}
              </div>
              <h3 class="mre-empty-title">${t('Sem histórico de trades', 'No trade history')}</h3>
              <p class="mre-empty-desc">
                ${t('Não há registros de operações no Trading Log para calcular as métricas por regime.', 'There are no closed trade records in Trading Log to calculate metrics by regime.')}
              </p>
              <button type="button" class="mre-connect-btn" data-go-trades>
                ${svgIcons.link}
                <span>${t('Conectar Trading Log', 'Connect Trading Log')}</span>
              </button>
            </div>
          ` : `
            <div class="mre-summary-card is-best">
              <div class="mre-sum-icon mre-icon-best">${svgIcons.trophy}</div>
              <div class="mre-sum-content">
                <span class="mre-sum-sub">${t('Melhor Regime', 'Best Regime')}</span>
                <strong class="mre-sum-name">${esc(perfData.bestRegime?.label || '—')}</strong>
                <div class="mre-sum-metric is-pos">+${number(Math.abs(perfData.bestRegime?.expectancy || 0), 2)}R</div>
                <small class="mre-sum-footer">${t('Expectancy por trade', 'Expectancy per trade')}</small>
              </div>
            </div>

            <div class="mre-summary-card is-worst">
              <div class="mre-sum-icon mre-icon-worst">${svgIcons.alert}</div>
              <div class="mre-sum-content">
                <span class="mre-sum-sub">${t('Pior Regime', 'Worst Regime')}</span>
                <strong class="mre-sum-name">${esc(perfData.worstRegime?.label || '—')}</strong>
                <div class="mre-sum-metric is-neg">-${number(Math.abs(perfData.worstRegime?.expectancy || 0), 2)}R</div>
                <small class="mre-sum-footer">${t('Expectancy por trade', 'Expectancy per trade')}</small>
              </div>
            </div>

            <div class="mre-summary-card is-sample">
              <div class="mre-sum-icon mre-icon-sample">${svgIcons.chart}</div>
              <div class="mre-sum-content">
                <strong class="mre-sample-title">${t('Qualidade da Amostra', 'Sample Quality')}</strong>
                <p class="mre-sum-desc">${esc(perfData.sampleRecommendationText || t('Recomendação: pelo menos 30 trades por regime.', 'Recommendation: at least 30 trades per regime.'))}</p>
              </div>
              <div class="mre-check-circle" title="${t('Critério atendido', 'Criterion satisfied')}">
                ${svgIcons.check}
              </div>
            </div>
          `}
        </div>
      </div>
    </div>`;
  }

  /**
   * Renderização Principal
   */
  function render() {
    syncActiveLayout();
    const benchmarkInfo = BENCHMARKS.find(b => b.id === state.currentBenchmark) || BENCHMARKS[2] || BENCHMARKS[0];
    const dataEntry = state.data[benchmarkInfo.id];
    const marketRegimeData = dataEntry?.marketRegime || {};
    const cycle = dataEntry?.cycle || {};
    const currentRegime = marketRegimeData.current || {
      regime: cycle?.state === 'healthy' ? 'UP_QUIET' : 'UP_VOLATILE',
      direction: cycle?.state === 'healthy' ? 'UP' : 'UP',
      volatility: 'VOLATILE',
      reference_date: cycle?.date,
      close_price: cycle?.price,
      atr_21: cycle?.atr21,
      atr_percentage: cycle?.atrPct,
      atr_percentage_sma_252: null,
      volatility_deviation: null
    };

    const historyCandles = dataEntry?.benchmark?.history || [];
    const periods = marketRegimeData.periods || [];
    const distribution = marketRegimeData.distribution || null;
    const dataDate = cycle.date || historyCandles.at(-1)?.date || currentRegime?.reference_date;

    const isUp = (currentRegime.direction || cycle.direction || '').toUpperCase() === 'UP';
    const activeRegime = cycle?.state === 'healthy' || (cycle?.state ? false : isUp) ? 'healthy' : 'defensive';

    root.innerHTML = `<div class="mre-workspace mcv2-page regime-${activeRegime}" data-current-benchmark="${esc(benchmarkInfo.id)}" data-market-regime="${activeRegime}">
      <div class="mre-shell">
        ${renderHeader(benchmarkInfo, dataDate)}

        <div class="mre-top-grid">
          ${renderCurrentRegimeCard(currentRegime)}
          ${renderVolatilityMetricsCard(currentRegime, dataDate)}
          ${renderSixRegimesCard(currentRegime?.regime || 'UP_VOLATILE')}
        </div>

        <div class="mre-middle-row">
          ${renderHistorySection(benchmarkInfo, historyCandles, periods, distribution, dataDate, currentRegime)}
        </div>

        <div class="mre-bottom-row">
          ${renderPerformanceSection(state.performance, dataDate)}
        </div>
      </div>
    </div>`;
  }

  function normalizeMarketId(marketId) {
    const s = String(marketId || '').trim().toUpperCase();
    if (s.includes('BDR') || s === 'BDRX') return 'BDRX';
    if (s.includes('FII') || s === 'IFIX') return 'IFIX';
    return 'IBOV';
  }

  async function load(benchmarkInput = state.currentBenchmark, force = false) {
    const benchmarkId = normalizeMarketId(benchmarkInput);
    const valid = BENCHMARKS.find(b => b.id === benchmarkId) || BENCHMARKS[0];
    state.currentBenchmark = valid.id;

    if (!force && state.data[valid.id]) {
      render();
      return;
    }

    state.loading = true;
    render();

    try {
      const marketParam = valid.id === 'IFIX' ? 'fii' : (valid.id === 'BDRX' ? 'bdr' : 'stock_b3');
      const [cycleRes, perfRes] = await Promise.all([
        fetch(`${(window.MARKET_DATA_API_URL || 'http://localhost:8787/api')}/market-cycle?market=${marketParam}&benchmark=${valid.id}`),
        fetch(`${(window.MARKET_DATA_API_URL || 'http://localhost:8787/api')}/trading-analytics/performance-by-regime?benchmark=${valid.id}`)
      ]);

      if (cycleRes.ok) {
        state.data[valid.id] = await cycleRes.json();
        persistMarketSnapshot(marketParam, state.data[valid.id]);
      }
      if (perfRes.ok) {
        state.performance = await perfRes.json();
      }
      state.loading = false;
      render();
    } catch (err) {
      console.warn('[market-regime] Erro ao carregar dados:', err);
      state.loading = false;
      render();
    }
  }

  // Interatividade de eventos no root
  root.addEventListener('click', event => {
    // 1. Alternância de benchmark pills
    const pillBtn = event.target.closest('[data-benchmark-pill]');
    if (pillBtn) {
      const id = pillBtn.getAttribute('data-benchmark-pill');
      load(id);
      return;
    }

    // 2. Clique em conectar trading log
    const connectBtn = event.target.closest('[data-go-trades]');
    if (connectBtn) {
      if (typeof window.go === 'function') {
        window.go('trades');
      }
      return;
    }

    // 3. Clique nas caixas dos 6 regimes para inspeção visual
    const box = event.target.closest('.mre-regime-box');
    if (box) {
      document.querySelectorAll('.mre-regime-box').forEach(el => el.classList.remove('is-active'));
      box.classList.add('is-active');
      return;
    }
  });

  root.addEventListener('change', event => {
    // Toggle de EMA 10 e EMA 72
    const emaToggle = event.target.closest('[data-toggle-ema]');
    if (emaToggle) {
      const type = emaToggle.getAttribute('data-toggle-ema');
      if (type === '10') state.showEma10 = emaToggle.checked;
      if (type === '72') state.showEma72 = emaToggle.checked;
      render();
      return;
    }

    // Seletor de período
    const periodSel = event.target.closest('[data-period-select]');
    if (periodSel) {
      state.period = periodSel.value;
      state.hoverCandle = null;
      render();
      return;
    }
  });

  // Interatividade do mouse no gráfico para hover e tooltip
  root.addEventListener('mousemove', event => {
    const candleEl = event.target.closest('.mre-candle');
    if (candleEl) {
      const idx = parseInt(candleEl.getAttribute('data-index'), 10);
      if (Number.isFinite(idx) && (!state.hoverCandle || state.hoverCandle.index !== idx)) {
        state.hoverCandle = { index: idx };
        render();
      }
    }
  });

  root.addEventListener('mouseleave', () => {
    if (state.hoverCandle) {
      state.hoverCandle = null;
      render();
    }
  }, true);

  window.renderMarketCycle = render;
  window.loadMarketCycleV2 = load;
  window.normalizeMarketCycleId = normalizeMarketId;
  window.MARKET_REGISTRY = MARKET_REGISTRY;
  window.getMarketCycleSnapshot = getMarketSnapshot;
  window.persistMarketCycleSnapshot = persistMarketSnapshot;
  window.addEventListener('healthyTrend:authenticated', () => load(state.currentBenchmark, true));
  const initialMarket = normalizeMarketId(window.__pendingMarketCycle || state.currentBenchmark);
  window.__pendingMarketCycle = null;
  load(initialMarket);
}());
