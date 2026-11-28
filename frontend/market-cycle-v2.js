(function () {
  'use strict';
  const root = document.getElementById('marketcycle');
  if (!root) return;

  const BENCHMARKS = [
    { id: 'IBOV', name: 'IBOV (Brasil)', symbol: '^BVSP', market: 'BR', flag: '🇧🇷', label: 'IBOV', sub: 'Brasil' },
    { id: 'IFIX', name: 'IFIX (FIIs)', symbol: 'IFIX', market: 'BR', flag: '🏢', label: 'IFIX', sub: 'FIIs' },
    { id: 'BDRX', name: 'BDRX (BDRs)', symbol: 'BDRX', market: 'BR', flag: '🌐', label: 'BDRX', sub: 'BDRs' },
    { id: 'SP500', name: 'S&P 500 (SPY)', symbol: 'SPY', market: 'US', flag: '🇺🇸', label: 'S&P 500', sub: 'EUA' },
    { id: 'NASDAQ', name: 'Nasdaq-100 (QQQ)', symbol: 'QQQ', market: 'US', flag: '🇺🇸', label: 'Nasdaq', sub: 'EUA' }
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
    },
    sp500: {
      id: 'sp500',
      name: 'S&P 500',
      benchmarkSymbol: 'SP500',
      benchmarkName: 'S&P 500 (SPY)',
      badge: 'SP500',
      hasBreadth: false
    },
    nasdaq: {
      id: 'nasdaq',
      name: 'Nasdaq-100',
      benchmarkSymbol: 'NASDAQ',
      benchmarkName: 'Nasdaq-100 (QQQ)',
      badge: 'NASDAQ',
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
        ema30: Number(cycle.ema30 ?? cycle.ema72) || null,
        ema72: Number(cycle.ema30 ?? cycle.ema72) || null,
        ema9: Number(cycle.ema10 ?? cycle.ema9) || null,
        above10: cycle.above10 !== undefined ? Boolean(cycle.above10) : Boolean(cycle.above9 ?? isUp),
        above30: cycle.above30 !== undefined ? Boolean(cycle.above30) : Boolean(cycle.above72 ?? isUp),
        above72: cycle.above30 !== undefined ? Boolean(cycle.above30) : Boolean(cycle.above72 ?? isUp),
        above9: cycle.above9 !== undefined ? Boolean(cycle.above9) : Boolean(cycle.above10 ?? isUp),
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
      direction: 'UP',
      volatility: 'QUIET',
      color: '#10b981',
      badgeClass: 'regime-up-quiet',
      icon: 'arrow-up'
    },
    UP_VOLATILE: {
      id: 'UP_VOLATILE',
      label: 'Up – Volatile',
      title: 'Up – Volatile',
      name: 'Tendência de alta com alta volatilidade',
      sublabel: 'Alta + alta volatilidade',
      direction: 'UP',
      volatility: 'VOLATILE',
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
      direction: 'SIDEWAYS',
      volatility: 'QUIET',
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
      direction: 'SIDEWAYS',
      volatility: 'VOLATILE',
      color: '#f97316',
      badgeClass: 'regime-sideways-volatile',
      icon: 'zigzag'
    },
    DOWN_QUIET: {
      id: 'DOWN_QUIET',
      label: 'Down – Quiet',
      title: 'Down – Quiet',
      name: 'Baixa com baixa volatilidade',
      sublabel: 'Baixa + baixa volatilidade',
      direction: 'DOWN',
      volatility: 'QUIET',
      color: '#6b7280',
      badgeClass: 'regime-down-quiet',
      icon: 'arrow-down-right'
    },
    DOWN_VOLATILE: {
      id: 'DOWN_VOLATILE',
      label: 'Down – Volatile',
      title: 'Down – Volatile',
      name: 'Baixa com alta volatilidade',
      sublabel: 'Baixa + alta volatilidade',
      direction: 'DOWN',
      volatility: 'VOLATILE',
      color: '#ef4444',
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

  const svgFlags = {
    br: `<svg class="mre-flag-circle" width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
      <clipPath id="mre-br-clip"><circle cx="16" cy="16" r="16"/></clipPath>
      <g clip-path="url(#mre-br-clip)">
        <rect width="32" height="32" fill="#009b3a"/>
        <polygon points="16,3.5 28.5,16 16,28.5 3.5,16" fill="#fedf00"/>
        <circle cx="16" cy="16" r="7.5" fill="#002776"/>
        <path d="M8.8 17.2 C12 14.5 19 14.5 23.2 17.5" stroke="#ffffff" stroke-width="1.3" fill="none"/>
      </g>
    </svg>`,
    us: `<svg class="mre-flag-circle" width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
      <clipPath id="mre-us-clip"><circle cx="16" cy="16" r="16"/></clipPath>
      <g clip-path="url(#mre-us-clip)">
        <rect width="32" height="32" fill="#bf0a30"/>
        <rect y="2.46" width="32" height="2.46" fill="#ffffff"/>
        <rect y="7.38" width="32" height="2.46" fill="#ffffff"/>
        <rect y="12.31" width="32" height="2.46" fill="#ffffff"/>
        <rect y="17.23" width="32" height="2.46" fill="#ffffff"/>
        <rect y="22.15" width="32" height="2.46" fill="#ffffff"/>
        <rect y="27.08" width="32" height="2.46" fill="#ffffff"/>
        <rect width="14" height="15" fill="#002868"/>
        <circle cx="3.5" cy="3.5" r="0.9" fill="#ffffff"/>
        <circle cx="7" cy="3.5" r="0.9" fill="#ffffff"/>
        <circle cx="10.5" cy="3.5" r="0.9" fill="#ffffff"/>
        <circle cx="5.25" cy="7.5" r="0.9" fill="#ffffff"/>
        <circle cx="8.75" cy="7.5" r="0.9" fill="#ffffff"/>
        <circle cx="3.5" cy="11.5" r="0.9" fill="#ffffff"/>
        <circle cx="7" cy="11.5" r="0.9" fill="#ffffff"/>
        <circle cx="10.5" cy="11.5" r="0.9" fill="#ffffff"/>
      </g>
    </svg>`
  };

  const svgIcons = {
    'chart-title': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 9l-5 5-4-4-3 3"/></svg>',
    'chart-section': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8M17 7h4v4"/></svg>',
    'target': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    'waveform': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h3l3-7 4 14 3-7 3 4h4"/></svg>',
    'layers': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    'arrow-up': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l10-10M17 17V7H7"/></svg>',
    'arrow-up-right': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l10-10M17 17V7H7"/></svg>',
    'arrow-left-right': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8L22 12L18 16M6 16L2 12L6 8M2 12H22"/></svg>',
    'zigzag': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8M17 7h4v4"/></svg>',
    'arrow-down-right': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7l10 10M17 7v10H7"/></svg>',
    'arrow-down': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7l10 10M17 7v10H7"/></svg>',
    'percent': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2"><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M20 4L4 20"/></svg>',
    'bars': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2"><path d="M12 20V10M18 20V4M6 20v-6"/></svg>',
    'bars-signal': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M2 20h20M5 16v4M11 11v9M17 6v14"/></svg>',
    'grid-fii': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>',
    'delta': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>',
    'alert-triangle': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    'candles': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v3M6 18v3M4 6h4v12H4zM18 6v3M18 15v3M16 9h4v6h-4z"/></svg>',
    'trophy': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2M4 22h16M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34M6 3h12v7a6 6 0 0 1-12 0V3z"/></svg>',
    'check': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
    'info': '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    'calendar': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    'refresh': '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>'
  };

  function calculateEmaSeries(values, period) {
    if (!Array.isArray(values) || values.length < period) return [];
    const k = 2 / (period + 1);
    const result = new Array(values.length).fill(null);
    let sum = 0;
    for (let i = 0; i < period; i++) sum += Number(values[i]);
    let currentEma = sum / period;
    result[period - 1] = Number(currentEma.toFixed(2));
    for (let i = period; i < values.length; i++) {
      currentEma = Number(values[i]) * k + currentEma * (1 - k);
      result[i] = Number(currentEma.toFixed(2));
    }
    return result;
  }

  function loadSavedEmaPrefs() {
    try {
      const raw = localStorage.getItem('mcv2_emas');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.showEma30 !== undefined) {
          return {
            showEma10: parsed.showEma10 !== undefined ? Boolean(parsed.showEma10) : true,
            showEma20: Boolean(parsed.showEma20),
            showEma30: Boolean(parsed.showEma30),
            showEma50: Boolean(parsed.showEma50),
            showEma72: Boolean(parsed.showEma72),
            showEma200: Boolean(parsed.showEma200)
          };
        }
      }
    } catch (_) {}
    return {
      showEma10: true,
      showEma20: false,
      showEma30: true,
      showEma50: false,
      showEma72: false,
      showEma200: false
    };
  }

  function saveEmaPrefs() {
    try {
      localStorage.setItem('mcv2_emas', JSON.stringify({
        showEma10: state.showEma10,
        showEma20: state.showEma20,
        showEma30: state.showEma30,
        showEma50: state.showEma50,
        showEma72: state.showEma72,
        showEma200: state.showEma200
      }));
    } catch (_) {}
  }

  const initialEmaPrefs = loadSavedEmaPrefs();

  let state = {
    currentBenchmark: 'IBOV',
    data: {},
    performance: null,
    loading: false,
    error: null,
    showEma10: initialEmaPrefs.showEma10,
    showEma20: initialEmaPrefs.showEma20,
    showEma30: initialEmaPrefs.showEma30,
    showEma50: initialEmaPrefs.showEma50,
    showEma72: initialEmaPrefs.showEma72,
    showEma200: initialEmaPrefs.showEma200,
    period: '1_ano',
    hoverCandle: null
  };

  function syncActiveLayout() {
    const active = root.classList.contains('active');
    document.documentElement.classList.toggle('market-cycle-active', active);
    document.body.classList.toggle('market-cycle-active', active);
  }
  syncActiveLayout();
  new MutationObserver(syncActiveLayout).observe(root, { attributes: true, attributeFilter: ['class'] });

  const CACHE_TTL_MS = 5 * 60 * 1000;
  let loadRequestSeq = 0;

  function normalizeIsoDate(value) {
    const raw = String(value || '').trim();
    if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    return '';
  }

  function formatDateTimeShort(isoValue) {
    if (!isoValue) return '';
    try {
      const parsed = new Date(isoValue);
      if (!Number.isFinite(parsed.getTime())) return '';
      return parsed.toLocaleString(window.appLanguage === 'en-US' ? 'en-US' : 'pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  }

  function getMarketOperatingStatus(market) {
    const isUs = market === 'US';
    try {
      const timeZone = isUs ? 'America/New_York' : 'America/Sao_Paulo';
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      });
      const parts = formatter.formatToParts(now);
      const getVal = type => parts.find(p => p.type === type)?.value;
      const weekday = getVal('weekday');
      const hour = parseInt(getVal('hour'), 10);
      const minute = parseInt(getVal('minute'), 10);
      const totalMinutes = hour * 60 + minute;

      const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekday);

      if (!isWeekday) {
        return {
          isOpen: false,
          label: t('Mercado fechado', 'Market closed'),
          marketBadge: isUs ? 'EUA (NYSE/NASDAQ)' : 'B3 (Brasil)'
        };
      }

      const openMinutes = isUs ? (9 * 60 + 30) : (10 * 60);
      const closeMinutes = isUs ? (16 * 60) : (17 * 60 + 55);

      const isOpen = totalMinutes >= openMinutes && totalMinutes < closeMinutes;
      return {
        isOpen,
        label: isOpen ? t('Mercado aberto', 'Market open') : t('Mercado fechado', 'Market closed'),
        marketBadge: isUs ? 'EUA (NYSE/NASDAQ)' : 'B3 (Brasil)'
      };
    } catch {
      return {
        isOpen: false,
        label: t('Mercado fechado', 'Market closed'),
        marketBadge: isUs ? 'EUA' : 'B3'
      };
    }
  }

  /**
   * Top Header com título, seletor centralizado e destacado de benchmarks (Brasil & EUA),
   * e badges contextuais de status do mercado, defasagem e data de referência.
   */
  /**
   * 1. Hero Banner Superior com Identificação, Arte Celestial e Status do Mercado
   */
  function renderHeroBanner(benchmarkInfo, dataDate, freshness = null) {
    const marketStatus = getMarketOperatingStatus(benchmarkInfo.market);
    const normalizedDataDate = normalizeIsoDate(dataDate);
    const expectedClosedDate = normalizeIsoDate(freshness?.expectedClosedDate);
    const isStale = Boolean(
      freshness?.isStale ||
      state.error ||
      (expectedClosedDate && normalizedDataDate && normalizedDataDate < expectedClosedDate)
    );
    const staleReason = freshness?.lastError || state.error || (
      expectedClosedDate && normalizedDataDate && normalizedDataDate < expectedClosedDate
        ? t(`Último pregão fechado esperado: ${dateLabel(expectedClosedDate)}`, `Expected last closed session: ${dateLabel(expectedClosedDate)}`)
        : ''
    );
    const lastUpdatedStr = formatDateTimeShort(freshness?.updatedAt);
    const staleTooltipParts = [
      t('Dados desatualizados: exibindo o último fechamento diário válido em cache.', 'Stale data: showing last valid cached daily close.')
    ];
    if (lastUpdatedStr) {
      staleTooltipParts.push(`${t('Última sincronização:', 'Last sync:')} ${lastUpdatedStr}`);
    }
    if (staleReason) {
      staleTooltipParts.push(`${t('Motivo:', 'Reason:')} ${staleReason}`);
    }

    const statusLabel = marketStatus.isOpen
      ? (isStale
        ? t('Pregão em andamento (Ciclo Diário)', 'Session in progress (Daily Cycle)')
        : t('Mercado aberto • Ciclo Diário', 'Market open • Daily Cycle'))
      : marketStatus.label;

    const statusTooltip = marketStatus.isOpen
      ? t('Pregão em andamento. O Ciclo de Mercado utiliza exclusivamente candles diários consolidados (último pregão fechado).', 'Trading session in progress. Market Cycle uses exclusively consolidated daily candles (last closed session).')
      : t('Status de operação da bolsa de referência.', 'Operating status of the reference exchange.');

    return `<div class="mre-hero-banner" role="banner">
      <div class="mre-hero-content">
        <div class="mre-title-row">
          <span class="mre-header-icon">${svgIcons['chart-title']}</span>
          <h1 class="mre-title">${t('Ciclo de Mercado', 'Market Cycle')}</h1>
        </div>
        <p class="mre-subtitle">${t('Regime de mercado atual, histórico e performance do seu sistema', 'Current market regime, history and performance of your system')}</p>
      </div>

      <div class="mre-header-controls">
        ${isStale ? `
          <div class="mre-badge-stale" role="status" data-stale-badge title="${esc(staleTooltipParts.join(' • '))}">
            ${svgIcons['alert-triangle']}
            <div class="mre-stale-text-col">
              <strong>${t('Dados desatualizados', 'Outdated data')}</strong>
              ${lastUpdatedStr || staleReason ? `<span class="mre-stale-sub">${esc([lastUpdatedStr ? `${t('Atualizado:', 'Updated:')} ${lastUpdatedStr}` : '', staleReason].filter(Boolean).join(' • '))}</span>` : ''}
            </div>
          </div>
        ` : ''}
        <div class="mre-badge-closed ${marketStatus.isOpen && !isStale ? 'is-open' : 'is-closed'}" title="${esc(statusTooltip)}">
          <span class="mre-closed-dot ${marketStatus.isOpen && !isStale ? 'is-open' : ''}"></span>
          <span>${esc(statusLabel)}</span>
        </div>
        <div class="mre-badge-date ${isStale ? 'is-stale' : ''}" title="${t('Data do último pregão diário fechado e validado', 'Last validated closed daily session date')}">
          ${svgIcons.calendar}
          <span>${t('Dados de:', 'Data from:')} ${esc(formatDateWithWeekday(dataDate))}</span>
        </div>
        <div class="mre-badge-market-origin" title="${t('Praça de negociação', 'Trading venue')}">
          <span class="mre-origin-flag">${benchmarkInfo.flag}</span>
          <span>${esc(marketStatus.marketBadge)}</span>
        </div>
        <button type="button" class="mre-refresh-btn ${state.loading ? 'is-loading' : ''}" data-refresh-benchmark title="${t('Sincronizar dados do benchmark', 'Sync benchmark data')}" aria-label="${t('Atualizar dados', 'Refresh data')}">
          ${svgIcons.refresh}
          <span>${state.loading ? t('Atualizando...', 'Refreshing...') : t('Atualizar', 'Refresh')}</span>
        </button>
      </div>
    </div>`;
  }

  /**
   * 2. Seletor de Benchmarks Brasil e Estados Unidos em 2 Blocos Elegantes
   */
  function renderBenchmarkSelector(benchmarkInfo) {
    return `<div class="mre-benchmarks-row mre-benchmark-center-panel" role="region" aria-label="${t('Seletor de Benchmarks', 'Benchmark Selector')}">
      <!-- Bloco BRASIL -->
      <div class="mre-benchmark-card mre-card-br">
        <div class="mre-benchmark-country-group">
          <span class="mre-flag-wrapper">${svgFlags.br}</span>
          <span class="mre-country-name">BRASIL</span>
        </div>
        <div class="mre-benchmark-btn-group" role="radiogroup" aria-label="${t('Mercado Brasileiro', 'Brazilian Market')}">
          ${BENCHMARKS.filter(b => b.market === 'BR').map(b => `
            <button type="button" 
                    class="mre-pill-btn ${b.id === benchmarkInfo.id ? 'active' : ''}" 
                    data-benchmark-pill="${esc(b.id)}"
                    aria-checked="${b.id === benchmarkInfo.id}"
                    role="radio"
                    title="${esc(b.name)}">
              <span class="mre-pill-icon">${b.id === 'IBOV' ? svgIcons['bars-signal'] : (b.id === 'IFIX' ? svgIcons['grid-fii'] : svgIcons['layers'])}</span>
              <span class="mre-pill-text">${esc(b.label || b.id)}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Bloco ESTADOS UNIDOS -->
      <div class="mre-benchmark-card mre-card-us">
        <div class="mre-benchmark-country-group">
          <span class="mre-flag-wrapper">${svgFlags.us}</span>
          <span class="mre-country-name">ESTADOS UNIDOS</span>
        </div>
        <div class="mre-benchmark-btn-group" role="radiogroup" aria-label="${t('Mercado Norte-Americano', 'US Market')}">
          ${BENCHMARKS.filter(b => b.market === 'US').map(b => `
            <button type="button" 
                    class="mre-pill-btn ${b.id === benchmarkInfo.id ? 'active' : ''}" 
                    data-benchmark-pill="${esc(b.id)}"
                    aria-checked="${b.id === benchmarkInfo.id}"
                    role="radio"
                    title="${esc(b.name)}">
              <span class="mre-pill-icon">${svgIcons['bars']}</span>
              <span class="mre-pill-text">${b.id === 'NASDAQ' ? 'Nasdaq-100 (QQQ)' : esc(b.label || b.id)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>`;
  }

  function renderVolatilityMetricsCard(currentRegime, dataDate) {
    const atr21 = hasNumber(currentRegime?.atr_21) ? number(currentRegime.atr_21, 2) : '—';
    const atrPct = hasNumber(currentRegime?.atr_percentage) ? `${number(currentRegime.atr_percentage, 2)}%` : '—';
    const atrSma252 = hasNumber(currentRegime?.atr_percentage_sma_252) ? `${number(currentRegime.atr_percentage_sma_252, 2)}%` : '—';
    const dev = hasNumber(currentRegime?.volatility_deviation) ? Number(currentRegime.volatility_deviation) : null;
    const devFormatted = dev !== null ? `${dev >= 0 ? '+' : ''}${number(dev, 1)}%` : '—';
    const devClass = dev !== null ? (dev > 0 ? 'is-elevated' : 'is-quiet') : '';

    return `<div class="mre-card mre-volatility-card">
      <div class="mre-card-header">
        <div class="mre-card-title-group">
          <span class="mre-card-header-icon">${svgIcons['chart-section']}</span>
          <h2 class="mre-card-title">${t('Principais Métricas de Volatilidade', 'Key Volatility Metrics')}</h2>
        </div>
      </div>
      <div class="mre-vol-grid">
        <div class="mre-vol-tile">
          <div class="mre-vol-tile-head">
            <span class="mre-vol-icon-box mre-icon-waveform">${svgIcons['waveform']}</span>
            <span class="mre-vol-tile-label">ATR (21)</span>
          </div>
          <div class="mre-vol-tile-value">${esc(atr21)}</div>
        </div>
        <div class="mre-vol-tile">
          <div class="mre-vol-tile-head">
            <span class="mre-vol-icon-box mre-icon-percent">${svgIcons['percent']}</span>
            <span class="mre-vol-tile-label">${t('ATR % (atual)', 'ATR % (current)')}</span>
          </div>
          <div class="mre-vol-tile-value">${esc(atrPct)}</div>
        </div>
        <div class="mre-vol-tile">
          <div class="mre-vol-tile-head">
            <span class="mre-vol-icon-box mre-icon-bars">${svgIcons['bars']}</span>
            <span class="mre-vol-tile-label">${t('ATR % — MM (252)', 'ATR % — SMA (252)')}</span>
          </div>
          <div class="mre-vol-tile-value">${esc(atrSma252)}</div>
        </div>
        <div class="mre-vol-tile ${devClass}">
          <div class="mre-vol-tile-head">
            <span class="mre-vol-icon-box mre-icon-alert ${devClass}">${svgIcons['alert-triangle']}</span>
            <span class="mre-vol-tile-label">${t('Desvio da Volatilidade', 'Volatility Deviation')}</span>
          </div>
          <div class="mre-vol-tile-value ${devClass}">${esc(devFormatted)}</div>
        </div>
      </div>
    </div>`;
  }

  /**
   * 5. Card 2: Regime Atual do Mercado (Hero Tile + Orientações Estruturais TF / VT)
   */
  function renderCurrentRegimeCard(currentRegime, dataDate) {
    const regCode = currentRegime?.regime || 'SIDEWAYS_VOLATILE';
    const meta = REGIME_METADATA[regCode] || REGIME_METADATA.SIDEWAYS_VOLATILE;

    const rawDir = String(currentRegime?.direction || meta.direction || '').toUpperCase();
    const rawVol = String(currentRegime?.volatility || meta.volatility || '').toUpperCase();
    const isUp = rawDir === 'UP';
    const isDown = rawDir === 'DOWN';
    const isVolatile = rawVol === 'VOLATILE';

    const dirLabel = isUp ? t('Alta', 'Up') : (isDown ? t('Baixa', 'Down') : t('Lateral', 'Sideways'));
    const volLabel = isVolatile ? t('Alta Volatilidade', 'High Volatility') : t('Baixa Volatilidade', 'Low Volatility');

    const price = Number(currentRegime?.close_price);
    const ema10 = Number(currentRegime?.ema_10 ?? currentRegime?.ema10);
    const ema30 = Number(currentRegime?.ema_30 ?? currentRegime?.ema30 ?? currentRegime?.ema_72 ?? currentRegime?.ema72);

    const hasEmas = Number.isFinite(price) && Number.isFinite(ema10) && Number.isFinite(ema30);
    const isAlignedUp = hasEmas && ema10 > ema30;
    const isPriceAboveBoth = hasEmas && price > ema10 && price > ema30;
    const isConfirmedFavorable = isAlignedUp && isPriceAboveBoth;

    // Detecção e explicação transparente de divergência legítima entre Regime e Ciclo
    let divergenceNotice = '';
    let tfGuidance = '';

    if (isConfirmedFavorable) {
      tfGuidance = t(
        'Ambiente favorável (EMA 10 e EMA 30 no Diário): médias alinhadas (Média 10 > Média 30) e preço acima das médias para condução, expansão e novos setups em confluência.',
        'Favorable environment (EMA 10 and EMA 30 on Daily): aligned moving averages (EMA 10 > EMA 30) and price above averages for trend continuation and setups.'
      );
    } else if (hasEmas && isPriceAboveBoth && !isAlignedUp) {
      // Divergência clássica: preço repicou acima das médias, mas alinhamento EMA 10/30 ainda negativo
      tfGuidance = t(
        'Regime em repique/recuperação de preços acima das médias, mas alinhamento EMA 10/30 ainda negativo (Média 10 ≤ Média 30 no Diário) — aguardar confirmação do cruzamento para novos setups em confluência.',
        'Regime in price recovery above moving averages, but EMA 10/30 alignment is still negative (EMA 10 ≤ EMA 30 on Daily) — await crossover confirmation for new trend setups.'
      );
      divergenceNotice = `<div class="mre-divergence-alert" title="${t('Divergência entre Preço e Alinhamento de Médias', 'Divergence between Price and Moving Average Alignment')}">
        <span class="mre-divergence-icon">⚠️</span>
        <div class="mre-divergence-text">
          <strong>${t('Repique com Médias Invertidas:', 'Price Bounce with Inverted EMAs:')}</strong>
          ${t('Preço acima das médias, porém EMA 10 ≤ EMA 30 no Diário. O Ciclo requer alinhamento positivo para autorizar novos setups em confluência.', 'Price is above averages, but EMA 10 ≤ EMA 30 on Daily. Cycle requires positive alignment to authorize new setups.')}
        </div>
      </div>`;
    } else {
      tfGuidance = t(
        'Contexto cauteloso no índice (EMA 10/30): dimensionar risco com disciplina, aguardando alinhamento positivo e preço acima das médias. Avaliar cada ativo líder por sua própria estrutura (EMA 10/72) e força.',
        'Cautious index context (EMA 10/30): size risk with discipline, awaiting positive alignment and price above averages. Evaluate each leader by its own structure (EMA 10/72) and strength.'
      );
    }

    const vtGuidance = isVolatile
      ? t('Requer atenção estrita ao filtro estrutural (preço > SMA200 do próprio ativo), operando reações táticas com saída temporal D7.', 'Requires strict structural filter adherence, operating tactical reactions with D7 time stop.')
      : t('Oscilações contidas: reversão à média com stops curtos e saídas ágeis nas bandas.', 'Contained swings: mean reversion with tight stops and swift band exits.');

    const refDate = currentRegime?.reference_date || dataDate;

    return `<div class="mre-card mre-current-card">
      <div class="mre-card-header mre-current-header">
        <div class="mre-card-title-group">
          <span class="mre-card-header-icon">${svgIcons['target']}</span>
          <h2 class="mre-card-title">${t('Regime Atual', 'Current Regime')}</h2>
        </div>
        <div class="mre-current-date-badge" title="${t('Data de referência do regime atual', 'Reference date of current regime')}">
          ${svgIcons.calendar}
          <span>${dateLabel(refDate)}</span>
        </div>
      </div>
      <div class="mre-current-content-vertical">
        <div class="mre-hero-tile ${meta.badgeClass}">
          <div class="mre-hero-circle">
            ${svgIcons[meta.icon] || svgIcons['arrow-up-right']}
          </div>
          <h3 class="mre-hero-title">${esc(meta.title)}</h3>
          <p class="mre-hero-subtitle">${esc(meta.sublabel || meta.name)}</p>
          <div class="mre-current-dim-chips">
            <span class="mre-dim-chip">Tendência: <strong>${esc(dirLabel)}</strong></span>
            <span class="mre-dim-chip">Volatilidade: <strong>${esc(volLabel)}</strong></span>
          </div>
          <div class="mre-hero-badge">
            ${t('REGIME ATUAL', 'CURRENT REGIME')}
          </div>
        </div>

        <div class="mre-strategy-guidance-vertical">
          ${divergenceNotice}
          <div class="mre-guidance-block mre-guidance-tf">
            <div class="mre-guidance-title">
              <span class="mre-guidance-icon">📈</span>
              <strong>Trend Following (TF)</strong>
            </div>
            <p class="mre-guidance-text">${tfGuidance}</p>
          </div>
          <div class="mre-guidance-block mre-guidance-vt">
            <div class="mre-guidance-title">
              <span class="mre-guidance-icon">⚡</span>
              <strong>Volatility Trading (VT)</strong>
            </div>
            <p class="mre-guidance-text">${vtGuidance}</p>
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * 6. Card 3: Os 6 Regimes de Mercado (Grid 2x3 com Realce Luminoso no Regime Ativo)
   */
  function renderSixRegimesCard(activeRegimeId) {
    const list = Object.values(REGIME_METADATA);
    return `<div class="mre-card mre-six-card">
      <div class="mre-card-header">
        <div class="mre-card-title-group">
          <span class="mre-card-header-icon">${svgIcons['layers']}</span>
          <h2 class="mre-card-title">${t('Os 6 Regimes de Mercado', 'The 6 Market Regimes')}</h2>
        </div>
      </div>
      <div class="mre-six-grid">
        ${list.map(r => {
          const isActive = r.id === activeRegimeId;
          return `<div class="mre-regime-box ${r.badgeClass} ${isActive ? 'is-active' : ''}" data-regime-id="${esc(r.id)}">
            <div class="mre-box-icon">
              ${svgIcons[r.icon] || svgIcons['arrow-up-right']}
            </div>
            <div class="mre-box-texts">
              <strong class="mre-box-title">${esc(r.title)}</strong>
              <span class="mre-box-sub">${esc(r.sublabel || r.name)}</span>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  /**
   * 6b. Card Explicativo Metodológico: Por que fazemos essa distinção? (Ciclo EMA 10/30 vs Ativos EMA 10/72)
   */
  function renderMethodologyDistinctionCard() {
    return `<div class="mre-card mre-distinction-card" data-methodology-distinction>
      <div class="mre-card-header mre-distinction-header">
        <div class="mre-card-title-group">
          <span class="mre-card-header-icon">${svgIcons.info}</span>
          <h2 class="mre-card-title">${t('Por que fazemos essa distinção?', 'Why do we make this distinction?')}</h2>
        </div>
        <div class="mre-distinction-badges">
          <span class="mre-distinction-pill mre-pill-market-emas">
            <strong>${t('Ciclo de Mercado (Diário):', 'Market Cycle (Daily):')}</strong> EMA 10 e EMA 30
          </span>
          <span class="mre-distinction-pill mre-pill-asset-emas">
            <strong>${t('Gráficos dos Ativos (Diário):', 'Asset Charts (Daily):')}</strong> EMA 10 e EMA 72
          </span>
        </div>
      </div>
      <div class="mre-distinction-body">
        <p>${t(
          'O mercado e os ativos não se movimentam na mesma velocidade. Em momentos de queda, muitos ativos tendem a cair juntos e apresentar estruturas semelhantes. Porém, quando começa uma recuperação, alguns ativos — especialmente os líderes — podem voltar a performar antes dos demais e antes de o mercado confirmar uma tendência de alta mais madura.',
          'The market and individual assets do not move at the same speed. During downturns, many assets tend to fall together and display similar structures. However, when a recovery begins, some assets — especially leaders — may start outperforming before the rest and before the market confirms a more mature uptrend.'
        )}</p>
        <p>${t(
          'Se utilizássemos a mesma leitura estrutural e mais lenta para o mercado e para os ativos, o sistema poderia demorar a reconhecer essa mudança. O ciclo geral ainda poderia indicar recuperação ou uma condição não totalmente confirmada, enquanto determinados ativos já estariam demonstrando força e apresentando oportunidades técnicas.',
          'If we used the same slower structural reading for both the market and individual assets, the system could take too long to recognize this shift. The broader cycle might still indicate recovery or an unconfirmed condition while specific assets are already demonstrating strength and presenting technical opportunities.'
        )}</p>
        <p>${t(
          'Por isso, usamos médias mais curtas (EMA 10 e EMA 30) no ciclo de mercado, para perceber as transições do ambiente com maior agilidade. Nos gráficos individuais, mantemos EMA 10 e EMA 72, pois precisamos de uma leitura estrutural mais ampla para avaliar cada ativo.',
          'Therefore, we use shorter moving averages (EMA 10 and EMA 30) in the market cycle to perceive environment transitions with greater agility. On individual charts, we keep EMA 10 and EMA 72 because we need a broader structural reading to evaluate each asset.'
        )}</p>
        <p>${t(
          'O ciclo de mercado contextualiza; não deve impedir a leitura individual dos ativos. O mercado ajuda a dimensionar o contexto e o risco, enquanto cada ativo precisa ser avaliado por sua própria estrutura e força. Assim, conseguimos reconhecer líderes e possíveis antecipações sem esperar que todo o mercado esteja alinhado.',
          'The market cycle contextualizes; it should not prevent the individual reading of assets. The market helps size context and risk, while each asset must be evaluated by its own structure and strength. This way, we can recognize leaders and early recoveries without waiting for the entire market to align.'
        )}</p>
      </div>
    </div>`;
  }

  /**
   * 3. Gráfico Histórico do Mercado (Full Width Dominante)
   */
  function renderHistorySection(benchmarkInfo, historyCandles, periods, distribution, dataDate, currentRegime) {
    const candles = Array.isArray(historyCandles) ? historyCandles : [];
    
    // Período de filtragem
    let count = 252; // 1 ano padrão
    if (state.period === '6_meses') count = 126;
    else if (state.period === '1_ano') count = 252;
    else if (state.period === '2_anos') count = 504;
    else if (state.period === 'max') count = candles.length;

    const filteredCandles = candles.slice(-Math.min(count, candles.length));
    const lastCandle = filteredCandles.at(-1) || {};
    const prevCandle = filteredCandles.length > 1 ? filteredCandles.at(-2) : null;
    
    const displayCandle = state.hoverCandle || lastCandle;
    const price = hasNumber(displayCandle.close) ? Number(displayCandle.close) : Number(currentRegime?.close_price || 0);
    const ema10Val = hasNumber(displayCandle.ema10) ? Number(displayCandle.ema10) : (state.showEma10 ? Number(currentRegime?.ema_10 || 0) : null);
    const ema20Val = hasNumber(displayCandle.ema20) ? Number(displayCandle.ema20) : null;
    const ema30Val = hasNumber(displayCandle.ema30)
      ? Number(displayCandle.ema30)
      : (hasNumber(displayCandle.ema72)
        ? Number(displayCandle.ema72)
        : (state.showEma30 ? Number(currentRegime?.ema_30 ?? currentRegime?.ema_72 ?? 0) : null));
    const ema50Val = hasNumber(displayCandle.ema50) ? Number(displayCandle.ema50) : null;
    const ema72Val = hasNumber(displayCandle.ema72) ? Number(displayCandle.ema72) : (state.showEma72 ? Number(currentRegime?.ema_72 || 0) : null);
    const ema200Val = hasNumber(displayCandle.ema200) ? Number(displayCandle.ema200) : null;
    
    let varPct = 0;
    if (prevCandle && hasNumber(lastCandle.close) && hasNumber(prevCandle.close) && prevCandle.close > 0) {
      varPct = ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100;
    }

    const chartSvg = renderCandlestickSvg(filteredCandles, benchmarkInfo.id);
    const logoChar = benchmarkInfo.id.startsWith('NAS') ? 'N' : (benchmarkInfo.id.startsWith('SP') ? 'S' : (benchmarkInfo.id === 'IFIX' ? 'F' : 'B'));

    return `<div class="mre-card mre-chart-card">
      <div class="mre-card-header mre-chart-header">
        <div class="mre-chart-head-left">
          <div class="mre-chart-logo-badge mre-logo-${benchmarkInfo.id.toLowerCase()}" title="${esc(benchmarkInfo.name)}">${logoChar}</div>
          <div class="mre-chart-ticker-group">
            <span class="mre-stat-ticker">${esc(benchmarkInfo.id)} (Diário)</span>
            <strong class="mre-stat-price">${number(price, 2)}</strong>
            <span class="mre-stat-var ${varPct >= 0 ? 'is-pos' : 'is-neg'}">
              ${varPct >= 0 ? '+' : ''}${number(varPct, 2)}%
            </span>
          </div>
          <div class="mre-chart-emas-inline">
            ${state.showEma10 && hasNumber(ema10Val) ? `<span class="mre-stat-ema mre-stat-ema10">EMA 10 <strong>${number(ema10Val, 2)}</strong></span>` : ''}
            ${state.showEma20 && hasNumber(ema20Val) ? `<span class="mre-stat-ema mre-stat-ema20">EMA 20 <strong>${number(ema20Val, 2)}</strong></span>` : ''}
            ${state.showEma30 && hasNumber(ema30Val) ? `<span class="mre-stat-ema mre-stat-ema30">EMA 30 <strong>${number(ema30Val, 2)}</strong></span>` : ''}
            ${state.showEma50 && hasNumber(ema50Val) ? `<span class="mre-stat-ema mre-stat-ema50">EMA 50 <strong>${number(ema50Val, 2)}</strong></span>` : ''}
            ${state.showEma72 && hasNumber(ema72Val) ? `<span class="mre-stat-ema mre-stat-ema72">EMA 72 <strong>${number(ema72Val, 2)}</strong></span>` : ''}
            ${state.showEma200 && hasNumber(ema200Val) ? `<span class="mre-stat-ema mre-stat-ema200">EMA 200 <strong>${number(ema200Val, 2)}</strong></span>` : ''}
          </div>
        </div>

        <div class="mre-chart-toolbar">
          <label class="mre-toggle-pill mre-toggle-ema10 ${state.showEma10 ? 'is-checked' : ''}" title="${t('Habilitar/Desabilitar EMA 10 (Oficial do Ciclo de Mercado)', 'Toggle EMA 10 (Official Market Cycle)')}">
            <input type="checkbox" data-toggle-ema="10" ${state.showEma10 ? 'checked' : ''} style="display:none;">
            <span class="mre-toggle-check">${svgIcons.check}</span>
            <span class="mre-toggle-text">EMA 10</span>
          </label>

          <label class="mre-toggle-pill mre-toggle-ema20 ${state.showEma20 ? 'is-checked' : ''}" title="${t('Habilitar/Desabilitar EMA 20', 'Toggle EMA 20')}">
            <input type="checkbox" data-toggle-ema="20" ${state.showEma20 ? 'checked' : ''} style="display:none;">
            <span class="mre-toggle-check">${svgIcons.check}</span>
            <span class="mre-toggle-text">EMA 20</span>
          </label>

          <label class="mre-toggle-pill mre-toggle-ema30 ${state.showEma30 ? 'is-checked' : ''}" title="${t('Habilitar/Desabilitar EMA 30 (Oficial do Ciclo de Mercado)', 'Toggle EMA 30 (Official Market Cycle)')}">
            <input type="checkbox" data-toggle-ema="30" ${state.showEma30 ? 'checked' : ''} style="display:none;">
            <span class="mre-toggle-check">${svgIcons.check}</span>
            <span class="mre-toggle-text">EMA 30</span>
          </label>

          <label class="mre-toggle-pill mre-toggle-ema50 ${state.showEma50 ? 'is-checked' : ''}" title="${t('Habilitar/Desabilitar EMA 50', 'Toggle EMA 50')}">
            <input type="checkbox" data-toggle-ema="50" ${state.showEma50 ? 'checked' : ''} style="display:none;">
            <span class="mre-toggle-check">${svgIcons.check}</span>
            <span class="mre-toggle-text">EMA 50</span>
          </label>

          <label class="mre-toggle-pill mre-toggle-ema200 ${state.showEma200 ? 'is-checked' : ''}" title="${t('Habilitar/Desabilitar EMA 200', 'Toggle EMA 200')}">
            <input type="checkbox" data-toggle-ema="200" ${state.showEma200 ? 'checked' : ''} style="display:none;">
            <span class="mre-toggle-check">${svgIcons.check}</span>
            <span class="mre-toggle-text">EMA 200</span>
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

      <div class="mre-chart-area-wrapper">
        ${chartSvg}
      </div>

      <div class="mre-timeline-section">
        <div class="mre-timeline-heading">
          <span>${t('Linha do Tempo dos Regimes', 'Regime Timeline')}</span>
          <span class="mre-card-info-icon" title="${t('Mapeamento cronológico das transições de regime de mercado.', 'Chronological mapping of market regime transitions.')}">${svgIcons.info}</span>
        </div>
        <div class="mre-ribbon-bar">
          ${renderRibbonSvg(filteredCandles)}
        </div>
        <div class="mre-timeline-legend">
          <span class="mre-legend-title">${t('Legenda dos Regimes:', 'Regime Legend:')}</span>
          <div class="mre-legend-items-row">
            <span class="mre-legend-item"><span class="mre-dot" style="background:#10b981;"></span> Up – Quiet</span>
            <span class="mre-legend-item"><span class="mre-dot" style="background:#f59e0b;"></span> Up – Volatile</span>
            <span class="mre-legend-item"><span class="mre-dot" style="background:#3b82f6;"></span> Sideways – Quiet</span>
            <span class="mre-legend-item"><span class="mre-dot" style="background:#f97316;"></span> Sideways – Volatile</span>
            <span class="mre-legend-item"><span class="mre-dot" style="background:#6b7280;"></span> Down – Quiet</span>
            <span class="mre-legend-item"><span class="mre-dot" style="background:#ef4444;"></span> Down – Volatile</span>
          </div>
        </div>
      </div>
    </div>`;
  }

  function renderRibbonSvg(candles) {
    if (!candles || !candles.length) return '';
    const W = 1200;
    const padLeft = 15;
    const padRight = 75;
    const plotW = W - padLeft - padRight;
    const total = candles.length;
    const stepX = plotW / Math.max(1, total - 1);

    const segments = [];
    let currentReg = null;
    let startIdx = 0;
    let count = 0;

    for (let i = 0; i < total; i++) {
      const reg = candles[i].regime || 'UP_QUIET';
      if (reg === currentReg) {
        count++;
      } else {
        if (currentReg) {
          segments.push({
            regime: currentReg,
            startIdx,
            endIdx: i - 1,
            count,
            startDate: candles[startIdx]?.date,
            endDate: candles[i - 1]?.date
          });
        }
        currentReg = reg;
        startIdx = i;
        count = 1;
      }
    }
    if (currentReg) {
      segments.push({
        regime: currentReg,
        startIdx,
        endIdx: total - 1,
        count,
        startDate: candles[startIdx]?.date,
        endDate: candles[total - 1]?.date
      });
    }

    const rects = segments.map(seg => {
      const x1 = Math.max(padLeft, padLeft + seg.startIdx * stepX - (stepX / 2));
      const x2 = Math.min(padLeft + plotW, padLeft + seg.endIdx * stepX + (stepX / 2));
      const w = Math.max(1.5, x2 - x1);
      const meta = REGIME_METADATA[seg.regime] || REGIME_METADATA.UP_QUIET;
      return `<rect x="${x1.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="14" fill="${meta.color}">
        <title>${esc(meta.label)}: ${seg.count} pregões (${dateLabel(seg.startDate)} a ${dateLabel(seg.endDate)})</title>
      </rect>`;
    });

    let hoverMarker = '';
    if (state.hoverCandle && state.hoverCandle.index >= 0 && state.hoverCandle.index < total) {
      const hx = padLeft + state.hoverCandle.index * stepX;
      hoverMarker = `<line x1="${hx.toFixed(1)}" y1="0" x2="${hx.toFixed(1)}" y2="14" stroke="#ffffff" stroke-width="2" />
        <circle cx="${hx.toFixed(1)}" cy="7" r="3.5" fill="#ffffff" />`;
    }

    return `<svg viewBox="0 0 ${W} 14" class="mre-ribbon-svg" preserveAspectRatio="none">
      <rect x="0" y="0" width="${W}" height="14" fill="#061a12" rx="6"/>
      <g class="mre-ribbon-segments">${rects.join('')}</g>
      ${hoverMarker}
    </svg>`;
  }

  function renderCandlestickSvg(candles, benchmarkId) {
    if (!candles || !candles.length) {
      return `<div class="mre-chart-empty">${t('Sem histórico disponível para este benchmark.', 'No history available for this benchmark.')}</div>`;
    }

    const W = 1200;
    const H = 380;
    const padTop = 15;
    const padBottom = 35;
    const padLeft = 15;
    const padRight = 75;
    const plotW = W - padLeft - padRight;
    const plotH = H - padTop - padBottom;

    // Calcular limites de preço considerando apenas as EMAs ativas
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const prevC = i > 0 ? candles[i - 1] : null;
      const close = Number(c.close);
      const hasRealOhlc = hasNumber(c.open) && hasNumber(c.high) && hasNumber(c.low) &&
        (Number(c.high) > Number(c.low) || Number(c.open) !== close);
      const open = hasRealOhlc
        ? Number(c.open)
        : (prevC && hasNumber(prevC.close) ? Number(prevC.close) : close);
      const high = hasRealOhlc
        ? Number(c.high)
        : Math.max(open, close) + Math.abs(close - open) * 0.25 + (close * 0.001);
      const low = hasRealOhlc
        ? Number(c.low)
        : Math.min(open, close) - Math.abs(close - open) * 0.25 - (close * 0.001);

      if (low < minPrice) minPrice = low;
      if (high > maxPrice) maxPrice = high;
      if (state.showEma10 && hasNumber(c.ema10)) {
        if (c.ema10 < minPrice) minPrice = c.ema10;
        if (c.ema10 > maxPrice) maxPrice = c.ema10;
      }
      if (state.showEma20 && hasNumber(c.ema20)) {
        if (c.ema20 < minPrice) minPrice = c.ema20;
        if (c.ema20 > maxPrice) maxPrice = c.ema20;
      }
      const cEma30 = hasNumber(c.ema30) ? c.ema30 : (hasNumber(c.ema72) ? c.ema72 : null);
      if (state.showEma30 && hasNumber(cEma30)) {
        if (cEma30 < minPrice) minPrice = cEma30;
        if (cEma30 > maxPrice) maxPrice = cEma30;
      }
      if (state.showEma50 && hasNumber(c.ema50)) {
        if (c.ema50 < minPrice) minPrice = c.ema50;
        if (c.ema50 > maxPrice) maxPrice = c.ema50;
      }
      if (state.showEma72 && hasNumber(c.ema72)) {
        if (c.ema72 < minPrice) minPrice = c.ema72;
        if (c.ema72 > maxPrice) maxPrice = c.ema72;
      }
      if (state.showEma200 && hasNumber(c.ema200)) {
        if (c.ema200 < minPrice) minPrice = c.ema200;
        if (c.ema200 > maxPrice) maxPrice = c.ema200;
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
        <line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${padLeft + plotW}" y2="${y.toFixed(1)}" stroke="rgba(255, 255, 255, 0.06)" stroke-dasharray="3 3"/>
        <text x="${padLeft + plotW + 12}" y="${(y + 4).toFixed(1)}" fill="#64748b" font-size="11.5" font-weight="600" font-family="Inter,sans-serif">${number(p, 0)}</text>
      `);
    }

    // Rótulos de data no eixo X
    const dateLabels = [];
    const dateStep = Math.max(1, Math.floor(candles.length / 8));
    for (let i = 0; i < candles.length; i += dateStep) {
      const x = getX(i);
      const d = parseDate(candles[i]?.date);
      const monthStr = d ? d.toLocaleDateString(window.appLanguage === 'en-US' ? 'en-US' : 'pt-BR', { month: 'short', year: '2-digit' }) : '';
      dateLabels.push(`<text x="${x.toFixed(1)}" y="${H - 10}" fill="#64748b" font-size="11" font-weight="500" text-anchor="middle" font-family="Inter,sans-serif">${esc(monthStr)}</text>`);
    }

    // Candlesticks (Wicks e Bodies) e séries de EMAs ativas
    const candleW = Math.max(2.0, Math.min(6.0, (plotW / candles.length) * 0.75));
    const candleElements = [];
    const ema10Points = [];
    const ema20Points = [];
    const ema30Points = [];
    const ema50Points = [];
    const ema72Points = [];
    const ema200Points = [];

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const x = getX(i);
      const prevC = i > 0 ? candles[i - 1] : null;
      const close = Number(c.close);
      const hasRealOhlc = hasNumber(c.open) && hasNumber(c.high) && hasNumber(c.low) &&
        (Number(c.high) > Number(c.low) || Number(c.open) !== close);

      const open = hasRealOhlc
        ? Number(c.open)
        : (prevC && hasNumber(prevC.close) ? Number(prevC.close) : close);
      const high = hasRealOhlc
        ? Number(c.high)
        : Math.max(open, close) + Math.abs(close - open) * 0.25 + (close * 0.001);
      const low = hasRealOhlc
        ? Number(c.low)
        : Math.min(open, close) - Math.abs(close - open) * 0.25 - (close * 0.001);

      const yHigh = getY(high);
      const yLow = getY(low);
      const yOpen = getY(open);
      const yClose = getY(close);

      const isBull = close >= open;
      const color = isBull ? '#10b981' : '#ef4444';
      const bodyY = Math.min(yOpen, yClose);
      const bodyH = Math.max(2.0, Math.abs(yClose - yOpen));

      candleElements.push(`
        <g class="mre-candle" data-index="${i}">
          <line x1="${x.toFixed(1)}" y1="${yHigh.toFixed(1)}" x2="${x.toFixed(1)}" y2="${yLow.toFixed(1)}" stroke="${color}" stroke-width="1.2"/>
          <rect x="${(x - candleW / 2).toFixed(1)}" y="${bodyY.toFixed(1)}" width="${candleW.toFixed(1)}" height="${bodyH.toFixed(1)}" fill="${color}" stroke="${color}" stroke-width="0.5" rx="0.5"/>
        </g>
      `);

      const cEma30 = hasNumber(c.ema30) ? c.ema30 : (hasNumber(c.ema72) ? c.ema72 : null);
      if (hasNumber(c.ema10)) ema10Points.push(`${x.toFixed(1)},${getY(c.ema10).toFixed(1)}`);
      if (hasNumber(c.ema20)) ema20Points.push(`${x.toFixed(1)},${getY(c.ema20).toFixed(1)}`);
      if (hasNumber(cEma30)) ema30Points.push(`${x.toFixed(1)},${getY(cEma30).toFixed(1)}`);
      if (hasNumber(c.ema50)) ema50Points.push(`${x.toFixed(1)},${getY(c.ema50).toFixed(1)}`);
      if (hasNumber(c.ema72)) ema72Points.push(`${x.toFixed(1)},${getY(c.ema72).toFixed(1)}`);
      if (hasNumber(c.ema200)) ema200Points.push(`${x.toFixed(1)},${getY(c.ema200).toFixed(1)}`);
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
          <line x1="${hx.toFixed(1)}" y1="${padTop}" x2="${hx.toFixed(1)}" y2="${padTop + plotH}" stroke="#64748b" stroke-dasharray="3 3" stroke-width="1.2" />
          <circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="4.5" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
        `;

        // Regime da data - usa rigorosamente a mesma classificação canônica da linha do tempo
        const regCode = hc.regime || (hc.direction === 'UP' ? 'UP_QUIET' : (hc.direction === 'DOWN' ? 'DOWN_VOLATILE' : 'SIDEWAYS_QUIET'));
        const regMeta = REGIME_METADATA[regCode] || REGIME_METADATA.UP_QUIET;

        // Linhas de médias ativas no tooltip
        const tipEmaRows = [];
        if (state.showEma10 && hasNumber(hc.ema10)) {
          tipEmaRows.push(`<div class="mre-tip-row">
            <span class="mre-tip-ema10" style="color:#10b981;">— EMA 10</span>
            <strong>${number(hc.ema10, 2)}</strong>
          </div>`);
        }
        if (state.showEma20 && hasNumber(hc.ema20)) {
          tipEmaRows.push(`<div class="mre-tip-row">
            <span class="mre-tip-ema20" style="color:#f59e0b;">— EMA 20</span>
            <strong>${number(hc.ema20, 2)}</strong>
          </div>`);
        }
        const hcEma30 = hasNumber(hc.ema30) ? hc.ema30 : (hasNumber(hc.ema72) ? hc.ema72 : null);
        if (state.showEma30 && hasNumber(hcEma30)) {
          tipEmaRows.push(`<div class="mre-tip-row">
            <span class="mre-tip-ema30" style="color:#3b82f6;">— EMA 30</span>
            <strong>${number(hcEma30, 2)}</strong>
          </div>`);
        }
        if (state.showEma50 && hasNumber(hc.ema50)) {
          tipEmaRows.push(`<div class="mre-tip-row">
            <span class="mre-tip-ema50" style="color:#a855f7;">— EMA 50</span>
            <strong>${number(hc.ema50, 2)}</strong>
          </div>`);
        }
        if (state.showEma72 && hasNumber(hc.ema72)) {
          tipEmaRows.push(`<div class="mre-tip-row">
            <span class="mre-tip-ema72" style="color:#3b82f6;">— EMA 72</span>
            <strong>${number(hc.ema72, 2)}</strong>
          </div>`);
        }
        if (state.showEma200 && hasNumber(hc.ema200)) {
          tipEmaRows.push(`<div class="mre-tip-row">
            <span class="mre-tip-ema200" style="color:#f97316;">— EMA 200</span>
            <strong>${number(hc.ema200, 2)}</strong>
          </div>`);
        }

        const tipWidth = 180;
        const tipHeight = 85 + tipEmaRows.length * 20;
        const tipX = hx > (W - 220) ? (hx - tipWidth - 15) : (hx + 15);
        const tipY = Math.max(padTop + 5, Math.min(hy - 40, padTop + plotH - tipHeight));

        tooltipHtml = `
          <foreignObject x="${tipX.toFixed(1)}" y="${tipY.toFixed(1)}" width="${tipWidth}" height="${tipHeight}" class="mre-tooltip-object">
            <div class="mre-floating-tooltip">
              <div class="mre-tip-header">${dateLabel(hc.date)} (Diário)</div>
              <div class="mre-tip-body">
                <div class="mre-tip-row">
                  <span class="mre-tip-symbol">■ ${esc(benchmarkId)}</span>
                  <strong>${number(hc.close, 2)}</strong>
                </div>
                ${tipEmaRows.join('')}
                <div class="mre-tip-row mre-tip-regime-row">
                  <span>Regime</span>
                  <span class="mre-tip-reg-badge" style="background:${regMeta.color}25; color:${regMeta.color}; border: 1px solid ${regMeta.color}50;">
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
        ${state.showEma200 && ema200Points.length > 1 ? `<polyline points="${ema200Points.join(' ')}" fill="none" stroke="#f97316" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>` : ''}
        ${state.showEma72 && ema72Points.length > 1 ? `<polyline points="${ema72Points.join(' ')}" fill="none" stroke="#60a5fa" stroke-width="2.0" stroke-dasharray="4 3" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>` : ''}
        ${state.showEma50 && ema50Points.length > 1 ? `<polyline points="${ema50Points.join(' ')}" fill="none" stroke="#a855f7" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>` : ''}
        ${state.showEma30 && ema30Points.length > 1 ? `<polyline points="${ema30Points.join(' ')}" fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>` : ''}
        ${state.showEma20 && ema20Points.length > 1 ? `<polyline points="${ema20Points.join(' ')}" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>` : ''}
        ${state.showEma10 && ema10Points.length > 1 ? `<polyline points="${ema10Points.join(' ')}" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>` : ''}
        <g class="mre-crosshair-group">${crosshairHtml}</g>
        ${tooltipHtml}
        <g class="mre-dates-axis">${dateLabels.join('')}</g>
      </svg>
    </div>`;
  }

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
    const benchmarkInfo = BENCHMARKS.find(b => b.id === state.currentBenchmark) || BENCHMARKS[0];
    const dataEntry = state.data[benchmarkInfo.id];
    const marketRegimeData = dataEntry?.marketRegime || {};
    const cycle = dataEntry?.cycle || {};
    const currentRegime = marketRegimeData.current || {
      regime: cycle?.state === 'healthy' ? 'UP_QUIET' : 'SIDEWAYS_VOLATILE',
      direction: cycle?.state === 'healthy' ? 'UP' : 'SIDEWAYS',
      volatility: 'VOLATILE',
      reference_date: cycle?.date,
      close_price: cycle?.price,
      ema_10: cycle?.ema10 ?? cycle?.ema9,
      ema_30: cycle?.ema30 ?? cycle?.ema72,
      ema_72: cycle?.ema72 ?? cycle?.ema30,
      atr_21: cycle?.atr21,
      atr_percentage: cycle?.atrPct,
      atr_percentage_sma_252: null,
      volatility_deviation: null
    };

    const historyCandles = dataEntry?.benchmark?.history || [];

    // 1. Garantir que todas as EMAs (incluindo EMA 10 e EMA 30 oficiais do Ciclo de Mercado) estejam calculadas para cada candle
    if (historyCandles.length > 0) {
      const closes = historyCandles.map(c => Number(c.close));
      const e10 = calculateEmaSeries(closes, 10);
      const e20 = calculateEmaSeries(closes, 20);
      const e30 = calculateEmaSeries(closes, Math.min(30, closes.length));
      const e50 = calculateEmaSeries(closes, 50);
      const e72 = calculateEmaSeries(closes, Math.min(72, closes.length));
      const e200 = closes.length >= 200 ? calculateEmaSeries(closes, 200) : [];
      for (let i = 0; i < historyCandles.length; i++) {
        const c = historyCandles[i];
        if (!hasNumber(c.ema10) && hasNumber(e10[i])) c.ema10 = e10[i];
        if (!hasNumber(c.ema20) && hasNumber(e20[i])) c.ema20 = e20[i];
        if (!hasNumber(c.ema30) && hasNumber(e30[i])) c.ema30 = e30[i];
        if (!hasNumber(c.ema50) && hasNumber(e50[i])) c.ema50 = e50[i];
        if (!hasNumber(c.ema72) && hasNumber(e72[i])) c.ema72 = e72[i];
        if (!hasNumber(c.ema200) && hasNumber(e200[i])) c.ema200 = e200[i];
      }
    }

    // 2. Anexar rigorosamente a classificação canônica do Market Regime Engine a cada candle
    const regimeByDate = new Map();
    if (Array.isArray(marketRegimeData.regimes)) {
      for (const r of marketRegimeData.regimes) {
        if (r.reference_date) {
          const iso = String(r.reference_date).trim();
          regimeByDate.set(iso, r);
          regimeByDate.set(iso.replace(/-/g, ''), r);
        }
      }
    }
    for (const c of historyCandles) {
      const rawDate = String(c.date || '').trim();
      const match = regimeByDate.get(rawDate) || regimeByDate.get(rawDate.replace(/-/g, ''));
      if (match) {
        c.regime = match.regime;
        c.direction = match.direction;
        c.volatility = match.volatility;
        if (hasNumber(match.ema_10)) c.ema10 = Number(match.ema_10);
        if (hasNumber(match.ema_30)) c.ema30 = Number(match.ema_30);
        if (hasNumber(match.ema_72) && !hasNumber(c.ema30)) c.ema30 = Number(match.ema_72);
      } else if (!c.regime) {
        const slowRef = hasNumber(c.ema30) ? c.ema30 : (c.ema72 || c.close);
        const isUp = c.close >= (c.ema10 || c.close) && c.close >= slowRef;
        const isDown = c.close < (c.ema10 || c.close) && c.close < slowRef;
        const dir = isUp ? 'UP' : (isDown ? 'DOWN' : 'SIDEWAYS');
        c.direction = dir;
        c.volatility = 'QUIET';
        c.regime = dir === 'UP' ? 'UP_QUIET' : (dir === 'DOWN' ? 'DOWN_QUIET' : 'SIDEWAYS_QUIET');
      }
    }

    // Sincronizar o último candle do gráfico com o Regime Atual quando compartilharem a mesma data de referência
    const lastHistoryCandle = historyCandles.at(-1);
    if (lastHistoryCandle && currentRegime?.reference_date) {
      const lastIso = normalizeIsoDate(lastHistoryCandle.date);
      const refIso = normalizeIsoDate(currentRegime.reference_date);
      if (lastIso && refIso && lastIso === refIso) {
        if (hasNumber(currentRegime.close_price)) lastHistoryCandle.close = Number(currentRegime.close_price);
        if (hasNumber(currentRegime.ema_10)) lastHistoryCandle.ema10 = Number(currentRegime.ema_10);
        if (hasNumber(currentRegime.ema_30)) lastHistoryCandle.ema30 = Number(currentRegime.ema_30);
        if (hasNumber(currentRegime.ema_72)) {
          lastHistoryCandle.ema72 = Number(currentRegime.ema_72);
          if (!hasNumber(currentRegime.ema_30)) lastHistoryCandle.ema30 = Number(currentRegime.ema_72);
        }
        if (currentRegime.regime) lastHistoryCandle.regime = currentRegime.regime;
      }
    }

    const periods = marketRegimeData.periods || [];
    const distribution = marketRegimeData.distribution || null;
    const dataDate = currentRegime?.reference_date || historyCandles.at(-1)?.date || cycle.date;
    const freshness = dataEntry?.freshness || marketRegimeData.freshness || null;

    const isUp = (currentRegime.direction || cycle.direction || '').toUpperCase() === 'UP';
    const activeRegime = cycle?.state === 'healthy' || (cycle?.state ? false : isUp) ? 'healthy' : 'defensive';

    root.innerHTML = `<div class="mre-workspace mcv2-page regime-${activeRegime}" data-current-benchmark="${esc(benchmarkInfo.id)}" data-market-regime="${activeRegime}">
      <div class="mre-shell">
        ${renderHeroBanner(benchmarkInfo, dataDate, freshness)}

        ${renderBenchmarkSelector(benchmarkInfo)}

        <div class="mre-main-visual-row">
          <div class="mre-chart-col">
            ${renderHistorySection(benchmarkInfo, historyCandles, periods, distribution, dataDate, currentRegime)}
          </div>
          <div class="mre-side-current-col">
            ${renderCurrentRegimeCard(currentRegime, dataDate)}
          </div>
        </div>

        ${renderMethodologyDistinctionCard()}

        <div class="mre-bottom-grid mre-bottom-split">
          ${renderVolatilityMetricsCard(currentRegime, dataDate)}
          ${renderSixRegimesCard(currentRegime?.regime || 'UP_VOLATILE')}
        </div>
      </div>
    </div>`;
  }
  function normalizeMarketId(marketId) {
    const s = String(marketId || '').trim().toUpperCase();
    if (s === 'SP500' || s === 'SPX' || s === 'SPY' || s.includes('S&P') || s.includes('SP500')) return 'SP500';
    if (s === 'NASDAQ' || s === 'NDX' || s === 'QQQ' || s.includes('NASD')) return 'NASDAQ';
    if (s.includes('BDR') || s === 'BDRX') return 'BDRX';
    if (s.includes('FII') || s === 'IFIX') return 'IFIX';
    return 'IBOV';
  }

  async function load(benchmarkInput = state.currentBenchmark, force = false) {
    const prefs = loadSavedEmaPrefs();
    state.showEma10 = prefs.showEma10;
    state.showEma20 = prefs.showEma20;
    state.showEma30 = prefs.showEma30;
    state.showEma50 = prefs.showEma50;
    state.showEma72 = prefs.showEma72;
    state.showEma200 = prefs.showEma200;

    const benchmarkId = normalizeMarketId(benchmarkInput);
    const valid = BENCHMARKS.find(b => b.id === benchmarkId) || BENCHMARKS[0];
    state.currentBenchmark = valid.id;
    state.hoverCandle = null;

    const cachedEntry = state.data[valid.id];
    const isCacheFresh = Boolean(
      cachedEntry &&
      cachedEntry._loadedAt &&
      (Date.now() - cachedEntry._loadedAt < CACHE_TTL_MS) &&
      !cachedEntry.freshness?.isStale
    );

    if (!force && isCacheFresh) {
      state.error = null;
      render();
      return;
    }

    const requestSeq = ++loadRequestSeq;
    state.loading = true;
    render();

    try {
      let marketParam = 'stock_b3';
      if (valid.id === 'IFIX') marketParam = 'fii';
      else if (valid.id === 'BDRX') marketParam = 'bdr';
      else if (valid.id === 'SP500') marketParam = 'sp500';
      else if (valid.id === 'NASDAQ') marketParam = 'nasdaq';

      const forceQuery = force ? '&force=1' : '';
      const [cycleRes, perfRes] = await Promise.all([
        fetch(`${(window.MARKET_DATA_API_URL || 'http://localhost:8787/api')}/market-cycle?market=${marketParam}&benchmark=${valid.id}${forceQuery}`),
        fetch(`${(window.MARKET_DATA_API_URL || 'http://localhost:8787/api')}/trading-analytics/performance-by-regime?benchmark=${valid.id}`)
      ]);

      if (cycleRes && cycleRes.ok) {
        const payload = await cycleRes.json();
        if (payload && typeof payload === 'object') {
          payload._loadedAt = Date.now();
          state.data[valid.id] = payload;
          persistMarketSnapshot(marketParam, payload);
          if (requestSeq === loadRequestSeq) {
            state.error = payload.freshness?.lastError || null;
          }
        }
      } else {
        const statusMsg = cycleRes ? `HTTP ${cycleRes.status}` : 'Sem resposta do servidor';
        if (state.data[valid.id]) {
          state.data[valid.id].freshness = {
            ...(state.data[valid.id].freshness || {}),
            isStale: true,
            isUpToDate: false,
            status: 'stale',
            lastError: statusMsg
          };
        }
        if (requestSeq === loadRequestSeq) {
          state.error = statusMsg;
        }
      }

      if (perfRes && perfRes.ok && requestSeq === loadRequestSeq) {
        state.performance = await perfRes.json();
      }
      if (requestSeq === loadRequestSeq) {
        state.loading = false;
        render();
      }
    } catch (err) {
      const errMsg = err?.message || String(err);
      console.warn('[market-regime] Erro ao carregar dados:', err);
      if (state.data[valid.id]) {
        state.data[valid.id].freshness = {
          ...(state.data[valid.id].freshness || {}),
          isStale: true,
          isUpToDate: false,
          status: 'stale',
          lastError: errMsg
        };
      }
      if (requestSeq === loadRequestSeq) {
        state.error = errMsg;
        state.loading = false;
        render();
      }
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

    // 1b. Botão de atualizar dados do benchmark atual
    const refreshBtn = event.target.closest('[data-refresh-benchmark]');
    if (refreshBtn) {
      load(state.currentBenchmark, true);
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
    // Toggle de EMAs (10, 20, 50, 72, 200)
    const emaToggle = event.target.closest('[data-toggle-ema]');
    if (emaToggle) {
      const type = emaToggle.getAttribute('data-toggle-ema');
      if (type === '10') state.showEma10 = emaToggle.checked;
      if (type === '20') state.showEma20 = emaToggle.checked;
      if (type === '30') state.showEma30 = emaToggle.checked;
      if (type === '50') state.showEma50 = emaToggle.checked;
      if (type === '72') state.showEma72 = emaToggle.checked;
      if (type === '200') state.showEma200 = emaToggle.checked;
      saveEmaPrefs();
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
