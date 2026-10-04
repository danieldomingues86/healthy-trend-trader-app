(function () {
  'use strict';

  const defaultTicker = 'PETR4';
  let currentTicker = defaultTicker;
  let tickerData = null;
  let searchUniverse = [];
  let chartInstance = null;
  let candleSeries = null;
  let lineSeries = null;
  let ema9Series = null;
  let ema30Series = null;
  let ema21Series = null;
  let volumeSeries = null;
  let activeBenchmark = null;
  let disciplineState = null;
  let selectedNoteCategory = 'plano';

  const NOTES_STORAGE_KEY = 'healthy-trend-ticker-notes';
  const INDICATORS_STORAGE_KEY = 'healthy-trend-chart-indicators';
  const SETTINGS_STORAGE_KEY = 'healthy-trend-chart-settings';

  let indicatorPrefs = loadIndicatorPrefs();
  let chartSettings = loadChartSettings();

  const ICONS = {
    search: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    trophy: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
    relativeStrength: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    marketCycle: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
    trend: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>`,
    structure: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    trigger: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>`,
    volatility: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    fundamentals: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="21" x2="21" y2="21"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="5 6 12 3 19 6"/><line x1="4" y1="10" x2="4" y2="21"/><line x1="20" y1="10" x2="20" y2="21"/><line x1="8" y1="14" x2="8" y2="17"/><line x1="12" y1="14" x2="12" y2="17"/><line x1="16" y1="14" x2="16" y2="17"/></svg>`,
    context: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    rubric: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><polyline points="9 11 12 14 22 4"/></svg>`,
    liquidity: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
    chevronDown: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
    check: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    star: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
    starFilled: `<svg width="14" height="14" viewBox="0 0 24 24" fill="#059669" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
    trash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    lightbulb: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>`
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatAssetClassBadge(rawClass) {
    const c = String(rawClass || '').trim().toLowerCase();
    if (c === 'stock_ibov' || c === 'ibov') return 'IBOV';
    if (c === 'stock_other' || c === 'stock' || c === 'stock_b3') return 'B3';
    if (c === 'bdr') return 'BDR';
    if (c === 'fii') return 'FII';
    if (c === 'index') return 'Índice';
    if (c === 'nasdaq') return 'Nasdaq';
    if (c === 'etf') return 'ETF';
    return 'B3';
  }

  function loadIndicatorPrefs() {
    try {
      const raw = localStorage.getItem(INDICATORS_STORAGE_KEY);
      if (raw) return Object.assign({ ema9: true, ema30: true, ema21: false, volume: true }, JSON.parse(raw));
    } catch (e) {}
    return { ema9: true, ema30: true, ema21: false, volume: true };
  }

  function saveIndicatorPrefs(prefs) {
    try {
      localStorage.setItem(INDICATORS_STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {}
  }

  function loadChartSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) return Object.assign({ type: 'candles', grid: 'smooth', scale: 'normal' }, JSON.parse(raw));
    } catch (e) {}
    return { type: 'candles', grid: 'smooth', scale: 'normal' };
  }

  function saveChartSettings(s) {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(s));
    } catch (e) {}
  }

  function isTickerInWatchlist(symbol) {
    const sym = String(symbol || currentTicker || '').trim().toUpperCase();
    if (!sym) return false;
    if (typeof window.getWatchlistOpportunities === 'function') {
      const list = window.getWatchlistOpportunities();
      if (Array.isArray(list) && list.some(it => String(it.ticker || it.symbol || '').toUpperCase() === sym)) {
        return true;
      }
    }
    try {
      const raw = localStorage.getItem('healthy-trend-watchlist-v2');
      if (!raw) return false;
      const items = JSON.parse(raw);
      return Array.isArray(items) && items.some(it => String(it.ticker || it.symbol || '').toUpperCase() === sym);
    } catch (e) {
      return false;
    }
  }

  function updateWatchlistButtonState() {
    const btn = document.getElementById('btnToggleWatchlist');
    if (!btn) return;
    const inList = isTickerInWatchlist(currentTicker);
    if (inList) {
      btn.classList.add('active');
      btn.innerHTML = `<span>${ICONS.starFilled}</span> Na Watchlist`;
      btn.title = 'Clique para remover este ativo da sua Watchlist';
    } else {
      btn.classList.remove('active');
      btn.innerHTML = `<span>${ICONS.star}</span> Adicionar à Watchlist`;
      btn.title = 'Clique para adicionar este ativo à sua Watchlist';
    }
  }

  async function toggleWatchlistForCurrentTicker() {
    const sym = String(currentTicker || '').trim().toUpperCase();
    if (!sym) return;
    const inList = isTickerInWatchlist(sym);
    if (inList) {
      if (typeof window.removeFromWatchlist === 'function') {
        await window.removeFromWatchlist(sym);
      } else {
        try {
          const raw = localStorage.getItem('healthy-trend-watchlist-v2');
          const items = raw ? JSON.parse(raw) : [];
          const next = items.filter(it => String(it.ticker || it.symbol || '').toUpperCase() !== sym);
          localStorage.setItem('healthy-trend-watchlist-v2', JSON.stringify(next));
        } catch (e) {}
      }
    } else {
      const context = {
        origin: 'ticker-chart',
        name: tickerData?.tickerInfo?.name || sym,
        sector: tickerData?.tickerInfo?.sector || '',
        price: tickerData?.tickerInfo?.price || 0,
        rsScore: tickerData?.relativeStrength?.score || 80,
        atrPct: tickerData?.volatility?.atrPct || 2.0,
        status: 'observando',
        thesis: `Acompanhamento gráfico no Diário: tendência ${tickerData?.trend?.formula || 'alta'}, Força Relativa ${tickerData?.relativeStrength?.classification || 'Forte'}.`
      };
      if (typeof window.addToWatchlist === 'function') {
        await window.addToWatchlist(sym, context);
      } else {
        try {
          const raw = localStorage.getItem('healthy-trend-watchlist-v2');
          const items = raw ? JSON.parse(raw) : [];
          items.unshift({
            ticker: sym,
            name: context.name,
            sector: context.sector,
            status: context.status,
            thesis: context.thesis,
            created_at: new Date().toISOString()
          });
          localStorage.setItem('healthy-trend-watchlist-v2', JSON.stringify(items));
        } catch (e) {}
      }
    }
    updateWatchlistButtonState();
  }

  function loadAllTickerNotes() {
    try {
      const raw = localStorage.getItem(NOTES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function getTickerNotes(symbol) {
    const sym = String(symbol || currentTicker).trim().toUpperCase();
    const all = loadAllTickerNotes();
    return Array.isArray(all[sym]) ? all[sym] : [];
  }

  function saveTickerNote(symbol, text, category) {
    const sym = String(symbol || currentTicker).trim().toUpperCase();
    if (!text || !text.trim()) return;
    const all = loadAllTickerNotes();
    if (!Array.isArray(all[sym])) all[sym] = [];
    all[sym].unshift({
      id: 'note_' + Date.now(),
      text: text.trim(),
      category: category || 'plano',
      createdAt: new Date().toISOString()
    });
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {}
    updateNotesBadge();
    renderNotesList();
  }

  function deleteTickerNote(symbol, noteId) {
    const sym = String(symbol || currentTicker).trim().toUpperCase();
    const all = loadAllTickerNotes();
    if (Array.isArray(all[sym])) {
      all[sym] = all[sym].filter(n => n.id !== noteId);
      try {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(all));
      } catch (e) {}
    }
    updateNotesBadge();
    renderNotesList();
  }

  function updateNotesBadge() {
    const badge = document.getElementById('chartNotesCountBadge');
    if (!badge) return;
    const notes = getTickerNotes(currentTicker);
    if (notes.length > 0) {
      badge.textContent = notes.length;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }

  function renderNotesList() {
    const container = document.getElementById('chartNotesList');
    if (!container) return;
    const notes = getTickerNotes(currentTicker);
    if (!notes.length) {
      container.innerHTML = `
        <div class="chart-notes-empty">
          Nenhuma anotação para <b>${currentTicker}</b> ainda.<br>
          Escreva acima para registrar pontos de entrada, stops e observações técnicas.
        </div>
      `;
      return;
    }

    container.innerHTML = notes.map(n => {
      const d = new Date(n.createdAt);
      const dateFormatted = isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const catLabel = n.category === 'plano' ? 'Setup / Plano' : (n.category === 'suporte' ? 'Suporte / Resistência' : (n.category === 'aviso' ? 'Aviso / Risco' : 'Geral'));
      return `
        <div class="chart-note-item">
          <div class="chart-note-item-head">
            <span class="chart-note-item-cat ${n.category || 'plano'}">${catLabel}</span>
            <span class="chart-note-item-time">${dateFormatted}</span>
          </div>
          <div class="chart-note-item-body">${escapeHtml(n.text)}</div>
          <button class="btn-chart-note-delete" data-id="${n.id}">${ICONS.trash} Excluir</button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-chart-note-delete').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        deleteTickerNote(currentTicker, id);
      };
    });
  }

  function resetChartZoom() {
    if (!chartInstance || !tickerData?.ohlc?.length) return;
    const totalBars = tickerData.ohlc.length;
    // Exibe aproximadamente 75 barras recentes (~3.5 meses de pregões)
    // Zoom muito mais próximo para enxergar com clareza candles e médias
    const barsToShow = Math.min(totalBars, 75);
    chartInstance.timeScale().setVisibleLogicalRange({
      from: Math.max(0, totalBars - barsToShow),
      to: totalBars + 4
    });
  }

  function applyIndicatorVisibility() {
    if (ema9Series) ema9Series.applyOptions({ visible: !!indicatorPrefs.ema9 });
    if (ema30Series) ema30Series.applyOptions({ visible: !!indicatorPrefs.ema30 });
    if (volumeSeries) volumeSeries.applyOptions({ visible: !!indicatorPrefs.volume });
    if (ema21Series) {
      ema21Series.applyOptions({ visible: !!indicatorPrefs.ema21 });
    } else if (indicatorPrefs.ema21 && chartInstance && tickerData?.ohlc) {
      ensureEma21Series();
    }

    const lEma9 = document.querySelector('.legend-ema9');
    if (lEma9) lEma9.style.display = indicatorPrefs.ema9 ? 'inline' : 'none';
    const lEma30 = document.querySelector('.legend-ema30');
    if (lEma30) lEma30.style.display = indicatorPrefs.ema30 ? 'inline' : 'none';
    const lVol = document.querySelector('.legend-vol');
    if (lVol) lVol.style.display = indicatorPrefs.volume ? 'inline' : 'none';
    const lEma21 = document.querySelector('.legend-ema21');
    if (lEma21) lEma21.style.display = indicatorPrefs.ema21 ? 'inline' : 'none';
  }

  function ensureEma21Series() {
    if (!chartInstance || !tickerData?.ohlc) return;
    if (!ema21Series) {
      ema21Series = chartInstance.addLineSeries({
        color: '#3b82f6',
        lineWidth: 2,
        title: 'EMA 21',
        visible: !!indicatorPrefs.ema21
      });
    }
    const closes = tickerData.ohlc.map(c => c.close);
    if (window.TickerChartModel) {
      const rawEma = window.TickerChartModel.calculateEma(closes, 21);
      const data = tickerData.ohlc.map((c, idx) => ({
        time: c.time,
        value: rawEma[idx]
      })).filter(p => Number.isFinite(p.value));
      ema21Series.setData(data);
    }
  }

  function applyChartSettings() {
    if (!chartInstance) return;
    const isGold = document.documentElement.getAttribute('data-theme') === 'gold';
    let gridColor = isGold ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9';
    if (chartSettings.grid === 'hidden') {
      gridColor = 'transparent';
    }
    chartInstance.applyOptions({
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor }
      },
      rightPriceScale: {
        mode: chartSettings.scale === 'log' ? 1 : 0,
        scaleMargins: { top: 0.08, bottom: 0.24 }
      }
    });

    if (volumeSeries) {
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.82, bottom: 0 }
      });
    }

    if (candleSeries) {
      if (chartSettings.type === 'line') {
        candleSeries.applyOptions({ visible: false });
        if (!lineSeries) {
          lineSeries = chartInstance.addLineSeries({
            color: '#10b981',
            lineWidth: 2,
            title: currentTicker
          });
          const lineData = tickerData.ohlc.map(c => ({ time: c.time, value: c.close }));
          lineSeries.setData(lineData);
        } else {
          lineSeries.applyOptions({ visible: true });
        }
      } else {
        candleSeries.applyOptions({ visible: true });
        if (lineSeries) lineSeries.applyOptions({ visible: false });
      }
    }
  }

  function closeAllPopovers() {
    document.querySelectorAll('.chart-popover').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.chart-toolbar-btn').forEach(b => {
      if (b.id !== 'btnToggleWatchlist') b.classList.remove('active');
    });
  }

  function togglePopover(popoverId, btnId) {
    const popover = document.getElementById(popoverId);
    const btn = document.getElementById(btnId);
    if (!popover || !btn) return;
    const isCurrentlyActive = popover.classList.contains('active');
    closeAllPopovers();
    if (!isCurrentlyActive) {
      popover.classList.add('active');
      btn.classList.add('active');
    }
  }

  const tickerDataCache = new Map();
  const TICKER_CACHE_TTL_MS = 60 * 1000; // 1 minuto de cache em memória antes de exigir revalidação

  function formatSessionDate(dateStr) {
    if (!dateStr) return '—';
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return String(dateStr);
  }

  // Carrega e inicializa o estado de disciplina
  function initDiscipline() {
    if (window.TickerChartModel) {
      disciplineState = window.TickerChartModel.loadDisciplineState();
    }
  }

  // Busca o universo pesquisável do backend (com cache para evitar requests repetidos)
  async function loadUniverse() {
    if (searchUniverse && searchUniverse.length > 0) return;
    try {
      const res = window.healthyTrendApi ? await window.healthyTrendApi.request('/api/market-data/ticker-universe') : await fetch('/api/market-data/ticker-universe').then(r => r.json());
      searchUniverse = Array.isArray(res) ? res : [];
    } catch (err) {
      console.warn('Falha ao carregar universo de busca:', err);
    }
  }

  // Renderiza imediatamente o skeleton da tela para eliminar qualquer tela em branco
  function renderLoadingSkeleton(sym) {
    const root = document.getElementById('tickerChartRoot');
    if (!root) return;

    root.innerHTML = `
      <!-- 1. HEADER & SEARCH -->
      <div class="ticker-chart-header">
        <div class="ticker-chart-title-area">
          <h1>Gráficos</h1>
          <p class="ticker-chart-subtitle">Análise completa do ativo no gráfico Diário.</p>
        </div>

        <div class="ticker-search-container">
          <div class="ticker-search-input-wrapper">
            <input type="text" class="ticker-search-input" id="tickerSearchInput" value="${sym}" placeholder="Pesquisar ticker (ex: PETR4, VALE3, AAPL, VOD...)" autocomplete="off" />
            <span class="ticker-search-icon">
              ${ICONS.search}
            </span>
          </div>
          <div class="ticker-search-dropdown" id="tickerSearchDropdown"></div>
        </div>

        <div class="ticker-discipline-top-widget" id="btnOpenDisciplineDrawer" title="Clique para ver seu histórico de disciplina do diário">
          ${renderDonutMini(disciplineState)}
          <div class="discipline-info-wrap">
            <div class="discipline-info-title">Disciplina do Diário</div>
            <div class="discipline-info-sub">${disciplineState ? disciplineState.sessionsToday : 1} / 2 visualizações hoje</div>
          </div>
          <div class="discipline-status-pill ${getDisciplinePillClass(disciplineState)}">
            <div class="discipline-status-headline"><span>●</span> ${getDisciplinePillText(disciplineState)}</div>
            <div class="discipline-status-subtext">Próxima análise: amanhã, após o fechamento</div>
          </div>
        </div>
      </div>

      <!-- 2. TICKER HERO SKELETON -->
      <div class="ticker-hero-card ticker-skeleton-loading">
        <div class="ticker-hero-left">
          <div class="ticker-monogram-badge">${getMonogram(sym)}</div>
          <div class="ticker-title-group">
            <div class="ticker-symbol-row">
              <span class="ticker-hero-symbol">${sym}</span>
              <span class="ticker-skeleton-line" style="width: 80px; height: 24px; border-radius: 6px;"></span>
              <span class="ticker-skeleton-line" style="width: 100px; height: 20px; border-radius: 6px;"></span>
            </div>
            <div class="ticker-hero-name" style="color: #94a3b8; font-size: 13px;">Sincronizando cotação e dados do ativo...</div>
          </div>
        </div>

        <div class="ticker-hero-meta-columns">
          <div class="ticker-meta-col">
            <span class="ticker-meta-label">Setor</span>
            <span class="ticker-skeleton-line" style="width: 90px; height: 16px;"></span>
          </div>
          <div class="ticker-meta-col">
            <span class="ticker-meta-label">Subsetor</span>
            <span class="ticker-skeleton-line" style="width: 110px; height: 16px;"></span>
          </div>
          <div class="ticker-meta-col">
            <span class="ticker-meta-label">Valor de Mercado</span>
            <span class="ticker-skeleton-line" style="width: 80px; height: 16px;"></span>
          </div>
          <div class="ticker-meta-col">
            <span class="ticker-meta-label">Volume Médio (21d)</span>
            <span class="ticker-skeleton-line" style="width: 70px; height: 16px;"></span>
          </div>
        </div>

        <div class="ticker-hero-actions">
          <button class="btn-watchlist-toggle" disabled style="opacity: 0.6; cursor: wait;">
            <span>${ICONS.star}</span> Watchlist
          </button>
        </div>
      </div>

      <!-- 3. MAIN CHART SKELETON & VISÃO DO ATIVO GRID -->
      <div class="ticker-main-grid">
        <div class="ticker-chart-card">
          <div class="ticker-chart-toolbar">
            <div class="chart-toolbar-left">
              <div class="chart-timeframe-badge">D</div>
              <div class="chart-timeframe-select-wrap">
                <span>Diário (oficial)</span>
                ${ICONS.chevronDown}
              </div>
            </div>
            <div class="chart-toolbar-right">
              <div class="chart-official-method-badge">
                <span>${ICONS.lightbulb}</span> Você opera pelo gráfico Diário
              </div>
            </div>
          </div>

          <div class="ticker-chart-skeleton-wrap">
            <div class="ticker-chart-spinner"></div>
            <div class="ticker-chart-skeleton-text">
              Carregando gráfico Diário e médias do ativo <strong>${sym}</strong>...
            </div>
            <div class="ticker-chart-skeleton-sub">
              Sincronizando séries históricas B3 e indicadores do método
            </div>
          </div>
        </div>

        <div class="ticker-summary-card ticker-skeleton-loading">
          <div class="summary-card-head">
            <div class="summary-card-head-left">
              <div class="summary-trophy-badge">${ICONS.trophy}</div>
              <div class="summary-titles">
                <div class="summary-title">Visão do Ativo</div>
                <div class="summary-subtitle">Baseado no seu método e no rubric atual.</div>
              </div>
            </div>
            <div class="summary-grade-box" style="opacity: 0.5;">...</div>
          </div>
          <div class="summary-checklist">
            <div class="summary-check-row"><div class="summary-check-left"><span class="summary-check-icon">${ICONS.relativeStrength}</span><span>Força Relativa</span></div><div class="summary-check-right"><span class="vision-status good">...</span></div></div>
            <div class="summary-check-row"><div class="summary-check-left"><span class="summary-check-icon">${ICONS.marketCycle}</span><span>Ciclo de Mercado</span></div><div class="summary-check-right"><span class="vision-status good">...</span></div></div>
            <div class="summary-check-row"><div class="summary-check-left"><span class="summary-check-icon">${ICONS.trend}</span><span>Tendência</span></div><div class="summary-check-right"><span class="vision-status good">...</span></div></div>
            <div class="summary-check-row"><div class="summary-check-left"><span class="summary-check-icon">${ICONS.structure}</span><span>Estrutura</span></div><div class="summary-check-right"><span class="vision-status good">...</span></div></div>
            <div class="summary-check-row"><div class="summary-check-left"><span class="summary-check-icon">${ICONS.trigger}</span><span>Gatilho</span></div><div class="summary-check-right"><span class="vision-status good">...</span></div></div>
            <div class="summary-check-row"><div class="summary-check-left"><span class="summary-check-icon">${ICONS.volatility}</span><span>Volatilidade</span></div><div class="summary-check-right"><span class="vision-status good">...</span></div></div>
            <div class="summary-check-row"><div class="summary-check-left"><span class="summary-check-icon">${ICONS.fundamentals}</span><span>Fundamentos</span></div><div class="summary-check-right"><span class="vision-status good">...</span></div></div>
            <div class="summary-check-row"><div class="summary-check-left"><span class="summary-check-icon">${ICONS.context}</span><span>Contexto</span></div><div class="summary-check-right"><span class="vision-status good">...</span></div></div>
          </div>
        </div>
      </div>

      <!-- 4. METHOD INDICATORS ROW SKELETON -->
      <div class="method-widgets-row">
        ${[
          { name: 'Força Relativa', icon: ICONS.relativeStrength },
          { name: 'Ciclo de Mercado', icon: ICONS.marketCycle },
          { name: 'Tendência', icon: ICONS.trend },
          { name: 'Volatilidade (ATR)', icon: ICONS.volatility },
          { name: 'Estrutura', icon: ICONS.structure },
          { name: 'Gatilho', icon: ICONS.trigger }
        ].map((item) => `
          <div class="method-card ticker-skeleton-loading">
            <div class="method-card-head">
              <div class="method-card-head-left">
                <div class="method-card-icon">${item.icon}</div>
                <span class="method-card-title">${item.name}</span>
              </div>
            </div>
            <div class="method-card-body">
              <span class="ticker-skeleton-line" style="width: 80px; height: 28px;"></span>
              <span class="ticker-skeleton-line" style="width: 100%; height: 13px; margin-top: 6px;"></span>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- DISCIPLINA FLYOUT DRAWER & OVERLAY -->
      <div class="discipline-drawer-overlay" id="disciplineDrawerOverlay"></div>
      <div class="discipline-drawer" id="disciplineDrawer"></div>
    `;

    setupSearchEvents();
    setupDisciplineDrawerEvents();
  }

  // Busca dados analíticos completos do ticker
  async function loadTickerData(symbol) {
    const sym = String(symbol || defaultTicker).trim().toUpperCase();
    currentTicker = sym;
    const root = document.getElementById('tickerChartRoot');
    if (!root) return;

    // Se já estiver em cache recente (< 1 min), renderiza imediatamente (0ms) e revalida em segundo plano
    const cachedEntry = tickerDataCache.get(sym);
    const isFresh = Boolean(cachedEntry && (Date.now() - cachedEntry.timestamp < TICKER_CACHE_TTL_MS));
    if (isFresh) {
      tickerData = cachedEntry.data;
      renderAll();
    } else if (!tickerData || tickerData.tickerInfo?.symbol !== sym) {
      // Exibe skeleton completo instantaneamente para eliminar a tela branca
      renderLoadingSkeleton(sym);
    }

    try {
      const url = `/api/market-data/ticker-chart?ticker=${encodeURIComponent(sym)}&_t=${Date.now()}`;
      const res = window.healthyTrendApi ? await window.healthyTrendApi.request(url) : await fetch(url, { cache: 'no-cache' }).then(r => r.json());
      if (res.error) throw new Error(res.error);
      tickerData = res;
      tickerDataCache.set(sym, { data: res, timestamp: Date.now() });
      renderAll();
    } catch (err) {
      console.error('Erro ao carregar dados do ticker:', err);
      if (!isFresh && (!tickerData || tickerData.tickerInfo?.symbol !== sym)) {
        root.innerHTML = `
          <div style="padding: 40px; text-align: center; color: #64748b;">
            <h3>Não foi possível carregar os dados para ${sym}</h3>
            <p>${err.message || 'Verifique se o ticker está cadastrado no sistema.'}</p>
            <button class="primary" onclick="window.loadTickerChart('${defaultTicker}')" style="margin-top: 16px;">Voltar para ${defaultTicker}</button>
          </div>
        `;
      }
    }
  }

  function renderTriggerBanner(trigger) {
    if (!trigger || !trigger.hasTrigger) return '';

    const entryPriceFormatted = trigger.entry ? `R$ ${formatNumber(trigger.entry)}` : '';
    const stopPriceFormatted = trigger.stop ? `R$ ${formatNumber(trigger.stop)}` : '';
    const entryText = entryPriceFormatted ? `${trigger.entryLabel || '1 tick acima da máxima'} (${entryPriceFormatted})` : (trigger.entryLabel || '1 tick acima da máxima');
    const stopText = stopPriceFormatted ? `${trigger.stopLabel || '1 tick abaixo da mínima'} (${stopPriceFormatted})` : (trigger.stopLabel || '1 tick abaixo da mínima');

    return `
      <!-- 2.5 BANNER DE DESTAQUE: GATILHO IDENTIFICADO -->
      <div class="trigger-alert-banner">
        <div class="trigger-alert-banner-left">
          <div class="trigger-alert-icon-wrap">
            ${ICONS.trigger}
          </div>
          <div class="trigger-alert-info">
            <div class="trigger-alert-title-row">
              <span class="trigger-alert-title">🎯 GATILHO DE COMPRA IDENTIFICADO</span>
              <span class="trigger-alert-pattern-badge">${escapeHtml(trigger.name)} (${escapeHtml(trigger.grade || 'A')})</span>
              <span class="trigger-alert-rule-tag">Acima da EMA 9 e EMA 30</span>
            </div>
            <div class="trigger-alert-desc">
              ${escapeHtml(trigger.detail || trigger.description || 'Condição de entrada válida no gráfico Diário segundo as regras do método.')}
            </div>
          </div>
        </div>
        <div class="trigger-alert-banner-right">
          <div class="trigger-alert-plan-item entry">
            <span class="plan-label">ENTRADA</span>
            <span class="plan-value">${escapeHtml(entryText)}</span>
          </div>
          <div class="trigger-alert-plan-item stop">
            <span class="plan-label">STOP</span>
            <span class="plan-value">${escapeHtml(stopText)}</span>
          </div>
          <div class="trigger-alert-actions">
            <button class="btn-trigger-simulate" id="btnSimulateTriggerTrade" type="button" title="Acompanhar esta oportunidade virtualmente no Simulador de Trades">
              ▶ SIMULAR TRADE
            </button>
            <button class="btn-trigger-newtrade" id="btnNewTradeFromTrigger" type="button" title="Registrar operação real no Diário">
              + NOVO TRADE
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function classifyRelativeStrength(score, classification) {
    if (window.TradingRubrics && typeof window.TradingRubrics.classifyRelativeStrength === 'function') {
      return window.TradingRubrics.classifyRelativeStrength(score, classification);
    }
    if (window.TickerChartModel && typeof window.TickerChartModel.classifyRelativeStrength === 'function') {
      return window.TickerChartModel.classifyRelativeStrength(score, classification);
    }
    const hasScore = score !== null && score !== undefined && score !== '' && !Number.isNaN(Number(score));
    const s = hasScore ? Number(score) : null;
    const c = String(classification || '').toLowerCase();
    if ((hasScore && s >= 90) || c.includes('líd') || c.includes('lead')) return { score: s, tier: 'leader', label: 'Líder', status: 'good', statusClass: 'good', color: '#15803d', icon: '🟢', dot: '●', display: s !== null ? `Líder (${s})` : 'Líder' };
    if ((hasScore && s >= 70) || c.includes('fort') || c.includes('qualif')) return { score: s, tier: 'strong', label: 'Forte', status: 'good', statusClass: 'good', color: '#15803d', icon: '🟢', dot: '●', display: s !== null ? `Forte (${s})` : 'Forte' };
    if ((hasScore && s < 40) || c.includes('frac') || c.includes('lag') || c.includes('abaixo')) return { score: s, tier: 'weak', label: 'Fraco', status: 'bad', statusClass: 'bad', color: '#b91c1c', icon: '🔴', dot: '●', display: s !== null ? `Fraco (${s})` : 'Fraco' };
    return { score: s, tier: 'neutral', label: 'Neutro', status: 'neutral', statusClass: 'neutral', color: '#64748b', icon: '🟡', dot: '●', display: s !== null ? `Neutro (${s})` : 'Neutro' };
  }

  function getRubricGradeVisual(grade) {
    if (window.TradingRubrics && typeof window.TradingRubrics.getRubricGradeVisual === 'function') {
      return window.TradingRubrics.getRubricGradeVisual(grade);
    }
    if (window.TickerChartModel && typeof window.TickerChartModel.getRubricGradeVisual === 'function') {
      return window.TickerChartModel.getRubricGradeVisual(grade);
    }
    const g = String(grade || '').trim().toUpperCase();
    if (g === 'A+' || g === 'A') return { grade: g || 'A', status: 'good', statusClass: 'grade-a', badgeClass: 'good', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', icon: '🏆', title: g === 'A+' ? 'Rare Trade (A+)' : 'Alta Qualidade (A)', summaryText: 'Setup com alta probabilidade segundo o seu método.' };
    if (g === 'B') return { grade: 'B', status: 'good', statusClass: 'grade-b', badgeClass: 'good', color: '#a16207', bg: '#fefce8', border: '#fef08a', icon: '✅', title: 'Bom Edge (B)', summaryText: 'Setup dentro dos parâmetros de risco controlado.' };
    if (g === 'C') return { grade: 'C', status: 'neutral', statusClass: 'grade-c', badgeClass: 'neutral', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa', icon: '⚠️', title: 'Edge Pequeno (C)', summaryText: 'Qualidade limítrofe. Exige cautela e dimensionamento reduzido.' };
    return { grade: g || 'D', status: 'bad', statusClass: 'grade-d', badgeClass: 'bad', color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5', icon: '⛔', title: 'Sem Edge (D)', summaryText: 'Sem Edge. Bloqueio automático com risco nominal zero (0%).' };
  }

  function getRsStatus(score, classification) {
    return classifyRelativeStrength(score, classification).statusClass;
  }

  function getTrendStatus(status) {
    const s = String(status || '').toLowerCase();
    if (s.includes('baix')) return 'bad';
    if (s.includes('neutr') || s.includes('transi')) return 'neutral';
    return 'good';
  }

  function getCycleStatus(regime) {
    const r = String(regime || '').toLowerCase();
    if (r.includes('defens') || r.includes('baixa') || r.includes('negat')) return 'bad';
    if (r.includes('transi') || r.includes('neutr')) return 'neutral';
    return 'good';
  }

  function getVolatilityStatus(regime, atrPct) {
    const r = String(regime || '').toLowerCase();
    const pct = Number(atrPct) || 0;
    // CUIDADO: Volatilidade baixa é BOA para Trend Following (good/verde)
    if (r.includes('baix') || (pct > 0 && pct < 3.5)) return 'good';
    if (r.includes('elevad') || r.includes('alt') || pct > 6.0) return 'bad';
    return 'neutral';
  }

  function getStructureStatus(label) {
    const l = String(label || '').toLowerCase();
    if (l.includes('degrad') || l.includes('fals')) return 'bad';
    if (l.includes('neutr')) return 'neutral';
    return 'good';
  }

  function renderRsSparkline(status) {
    if (status === 'bad') {
      return `
        <svg width="100%" height="28" viewBox="0 0 140 28" fill="none">
          <defs>
            <linearGradient id="rsAreaGradBad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ef4444" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="#ef4444" stop-opacity="0.0"/>
            </linearGradient>
          </defs>
          <path d="M5 6 Q 35 10, 65 18 T 135 24 L 135 28 L 5 28 Z" fill="url(#rsAreaGradBad)"/>
          <path d="M5 6 Q 35 10, 65 18 T 135 24" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round"/>
          <circle cx="135" cy="24" r="3" fill="#ef4444"/>
        </svg>
      `;
    }
    if (status === 'neutral') {
      return `
        <svg width="100%" height="28" viewBox="0 0 140 28" fill="none">
          <defs>
            <linearGradient id="rsAreaGradNeu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#94a3b8" stop-opacity="0.2"/>
              <stop offset="100%" stop-color="#94a3b8" stop-opacity="0.0"/>
            </linearGradient>
          </defs>
          <path d="M5 16 Q 35 14, 65 15 T 135 14 L 135 28 L 5 28 Z" fill="url(#rsAreaGradNeu)"/>
          <path d="M5 16 Q 35 14, 65 15 T 135 14" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round"/>
          <circle cx="135" cy="14" r="3" fill="#94a3b8"/>
        </svg>
      `;
    }
    return `
      <svg width="100%" height="28" viewBox="0 0 140 28" fill="none">
        <defs>
          <linearGradient id="rsAreaGradGood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#10b981" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        <path d="M5 24 Q 35 22, 65 15 T 135 4 L 135 28 L 5 28 Z" fill="url(#rsAreaGradGood)"/>
        <path d="M5 24 Q 35 22, 65 15 T 135 4" stroke="#10b981" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="135" cy="4" r="3" fill="#10b981"/>
      </svg>
    `;
  }

  function renderAll() {
    const root = document.getElementById('tickerChartRoot');
    if (!root || !tickerData) return;

    const lastCandleDate = (tickerData.ohlc && tickerData.ohlc.length) ? tickerData.ohlc[tickerData.ohlc.length - 1].time : null;
    const sessionDateRaw = tickerData.tickerInfo.sessionDate || tickerData.tickerInfo.date || lastCandleDate;
    const sessionDateFormatted = formatSessionDate(sessionDateRaw);

    // Avalia status semânticos (good = verde, neutral = cinza, bad = vermelho)
    const gradeVisual = getRubricGradeVisual(tickerData.rubric?.finalGrade);
    const rsStatus = getRsStatus(tickerData.relativeStrength?.score, tickerData.relativeStrength?.classification);
    const trendStatus = getTrendStatus(tickerData.trend?.status);
    const cycleStatus = getCycleStatus(tickerData.marketCycle?.regime);
    // CUIDADO: Volatilidade baixa é BOA para Trend Following (good/verde)
    const volStatus = getVolatilityStatus(tickerData.volatility?.regime, tickerData.volatility?.atrPct);
    const structureStatus = getStructureStatus(tickerData.structure?.label);
    const triggerStatus = Boolean(tickerData.trigger && tickerData.trigger.hasTrigger) ? 'good' : 'neutral';
    const fundStatus = tickerData.fundamentals?.available !== false ? 'good' : 'neutral';
    const contextStatus = (trendStatus === 'good' && cycleStatus === 'good') ? 'good' : (trendStatus === 'bad' ? 'bad' : 'neutral');

    // Constrói HTML estrutural
    root.innerHTML = `
      <!-- 1. HEADER & SEARCH -->
      <div class="ticker-chart-header">
        <div class="ticker-chart-title-area">
          <h1>Gráficos</h1>
          <p class="ticker-chart-subtitle">Análise completa do ativo no gráfico Diário.</p>
        </div>

        <div class="ticker-search-container">
          <div class="ticker-search-input-wrapper">
            <input type="text" class="ticker-search-input" id="tickerSearchInput" placeholder="Pesquisar ticker (ex: PETR4, VALE3, AAPL, VOD...)" autocomplete="off" />
            <span class="ticker-search-icon">
              ${ICONS.search}
            </span>
          </div>
          <div class="ticker-search-dropdown" id="tickerSearchDropdown"></div>
        </div>

        <div class="ticker-discipline-top-widget" id="btnOpenDisciplineDrawer" title="Clique para ver seu histórico de disciplina do diário">
          ${renderDonutMini(disciplineState)}
          <div class="discipline-info-wrap">
            <div class="discipline-info-title">Disciplina do Diário</div>
            <div class="discipline-info-sub">${disciplineState ? disciplineState.sessionsToday : 1} / 2 visualizações hoje</div>
          </div>
          <div class="discipline-status-pill ${getDisciplinePillClass(disciplineState)}">
            <div class="discipline-status-headline"><span>●</span> ${getDisciplinePillText(disciplineState)}</div>
            <div class="discipline-status-subtext">Próxima análise: amanhã, após o fechamento</div>
          </div>
        </div>
      </div>

      <!-- 2. TICKER HERO BAR -->
      <div class="ticker-hero-card">
        <div class="ticker-hero-left">
          <div class="ticker-monogram-badge">${getMonogram(tickerData.tickerInfo.symbol)}</div>
          <div class="ticker-title-group">
            <div class="ticker-symbol-row">
              <span class="ticker-hero-symbol">${tickerData.tickerInfo.symbol}</span>
              <span class="ticker-hero-price">R$ ${formatNumber(tickerData.tickerInfo.price)}</span>
              <span class="ticker-hero-change ${tickerData.tickerInfo.dayChange >= 0 ? 'positive' : 'negative'}">
                ${tickerData.tickerInfo.dayChange >= 0 ? '+' : ''}${formatNumber(tickerData.tickerInfo.dayChange)} (${tickerData.tickerInfo.dayChangePct >= 0 ? '+' : ''}${formatNumber(tickerData.tickerInfo.dayChangePct)}%) ${tickerData.tickerInfo.dayChange >= 0 ? '▲' : '▼'}
              </span>
            </div>
            <div class="ticker-hero-name">${tickerData.tickerInfo.name} <span class="ticker-session-dot">•</span> <span class="ticker-session-tag">Fechamento: ${sessionDateFormatted}</span></div>
          </div>
        </div>

        <div class="ticker-hero-meta-columns">
          <div class="ticker-meta-col">
            <span class="ticker-meta-label">Último Pregão</span>
            <span class="ticker-meta-value highlight-session">${sessionDateFormatted}</span>
          </div>
          <div class="ticker-meta-col">
            <span class="ticker-meta-label">Setor</span>
            <span class="ticker-meta-value">${tickerData.tickerInfo.sector || '—'}</span>
          </div>
          <div class="ticker-meta-col">
            <span class="ticker-meta-label">Subsetor</span>
            <span class="ticker-meta-value">${tickerData.tickerInfo.subSector || '—'}</span>
          </div>
          <div class="ticker-meta-col">
            <span class="ticker-meta-label">Valor de Mercado</span>
            <span class="ticker-meta-value">${tickerData.tickerInfo.marketCapFormatted || '—'}</span>
          </div>
          <div class="ticker-meta-col">
            <span class="ticker-meta-label">Volume Médio (21d)</span>
            <span class="ticker-meta-value">${tickerData.tickerInfo.volumeAvg21Formatted || '—'}</span>
          </div>
        </div>

        <div class="ticker-hero-actions">
          <button class="btn-watchlist-toggle ${isTickerInWatchlist(tickerData.tickerInfo.symbol) ? 'active' : ''}" id="btnToggleWatchlist">
            <span>${isTickerInWatchlist(tickerData.tickerInfo.symbol) ? ICONS.starFilled : ICONS.star}</span>
            ${isTickerInWatchlist(tickerData.tickerInfo.symbol) ? 'Na Watchlist' : 'Adicionar à Watchlist'}
          </button>
          <button class="btn-icon-more" id="btnMoreTickerOptions" title="Mais opções">⋮</button>
        </div>
      </div>

      <!-- 2.5 BANNER DE DESTAQUE: GATILHO IDENTIFICADO (apenas quando houver gatilho de compra válido) -->
      ${renderTriggerBanner(tickerData.trigger)}

      <!-- 3. MAIN CHART & VISÃO DO ATIVO GRID -->
      <div class="ticker-main-grid">
        <div class="ticker-chart-card">
          <div class="ticker-chart-toolbar">
            <div class="chart-toolbar-left">
              <div class="chart-timeframe-badge">D</div>
              <div class="chart-timeframe-select-wrap" title="O Healthy Trend Trader opera estritamente no gráfico Diário para eliminar o ruído intraday.">
                <span>Diário (oficial)</span>
                ${ICONS.chevronDown}
              </div>

              <!-- INDICADORES POPOVER -->
              <div class="chart-toolbar-btn-wrap">
                <button class="chart-toolbar-btn" id="btnChartIndicators" type="button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
                  Indicadores
                </button>
                <div class="chart-popover chart-indicators-popover" id="popoverIndicators">
                  <div class="chart-popover-head">
                    <span class="chart-popover-title">Indicadores Técnicos</span>
                    <button class="chart-popover-close" id="btnCloseIndicatorsPopover" type="button">✕</button>
                  </div>
                  <div class="chart-indicator-list">
                    <label class="chart-indicator-item">
                      <div class="chart-indicator-left">
                        <span class="indicator-color-dot" style="background: #0d9488;"></span>
                        <span>EMA 9 (Curta / Rastreio)</span>
                      </div>
                      <input type="checkbox" id="chkIndEma9" ${indicatorPrefs.ema9 ? 'checked' : ''} />
                    </label>
                    <label class="chart-indicator-item">
                      <div class="chart-indicator-left">
                        <span class="indicator-color-dot" style="background: #d97706;"></span>
                        <span>EMA 30 (Média do Método)</span>
                      </div>
                      <input type="checkbox" id="chkIndEma30" ${indicatorPrefs.ema30 ? 'checked' : ''} />
                    </label>
                    <label class="chart-indicator-item">
                      <div class="chart-indicator-left">
                        <span class="indicator-color-dot" style="background: #3b82f6;"></span>
                        <span>EMA 21 (Pullback)</span>
                      </div>
                      <input type="checkbox" id="chkIndEma21" ${indicatorPrefs.ema21 ? 'checked' : ''} />
                    </label>
                    <label class="chart-indicator-item">
                      <div class="chart-indicator-left">
                        <span class="indicator-color-dot" style="background: #10b981;"></span>
                        <span>Volume Diário</span>
                      </div>
                      <input type="checkbox" id="chkIndVolume" ${indicatorPrefs.volume ? 'checked' : ''} />
                    </label>
                  </div>
                </div>
              </div>

              <!-- COMPARAR POPOVER -->
              <div class="chart-toolbar-btn-wrap">
                <button class="chart-toolbar-btn" id="btnChartCompare" type="button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7M11 18H8a2 2 0 0 1-2-2V9"/></svg>
                  Comparar
                </button>
                <div class="chart-popover chart-compare-popover" id="popoverCompare">
                  <div class="chart-popover-head">
                    <span class="chart-popover-title">Comparar Desempenho</span>
                    <button class="chart-popover-close" id="btnCloseComparePopover" type="button">✕</button>
                  </div>
                  <div class="chart-compare-grid">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600;">Benchmarks Rápidos:</div>
                    <div class="compare-pills-row">
                      <button class="btn-compare-pill" data-bench="IBOV" type="button">IBOV</button>
                      <button class="btn-compare-pill" data-bench="SMLL" type="button">SMLL</button>
                      <button class="btn-compare-pill" data-bench="IFIX" type="button">IFIX</button>
                      <button class="btn-compare-pill" data-bench="BDRX" type="button">BDRX</button>
                      <button class="btn-compare-pill" data-bench="SPX" type="button">S&P 500</button>
                    </div>
                    <div class="compare-input-row">
                      <input type="text" class="compare-ticker-input" id="compareTickerInput" placeholder="Outro ativo (ex: VALE3)" />
                      <button class="btn-compare-apply" id="btnApplyCustomCompare" type="button">Comparar</button>
                    </div>
                    <div id="compareActiveStatus"></div>
                  </div>
                </div>
              </div>

              <!-- ANOTAÇÕES BUTTON -->
              <div class="chart-toolbar-btn-wrap">
                <button class="chart-toolbar-btn" id="btnChartNotes" type="button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  Anotações
                  <span class="chart-notes-count-badge" id="chartNotesCountBadge" style="display: none;">0</span>
                </button>
              </div>

              <!-- CONFIGURAÇÕES POPOVER -->
              <div class="chart-toolbar-btn-wrap">
                <button class="chart-toolbar-btn" id="btnChartSettings" type="button" title="Configurações do gráfico">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
                <div class="chart-popover chart-settings-popover" id="popoverSettings">
                  <div class="chart-popover-head">
                    <span class="chart-popover-title">Configurações</span>
                    <button class="chart-popover-close" id="btnCloseSettingsPopover" type="button">✕</button>
                  </div>
                  <div class="chart-settings-group">
                    <label class="chart-settings-label">Estilo do Gráfico</label>
                    <select class="chart-settings-select" id="selChartType">
                      <option value="candles" ${chartSettings.type === 'candles' ? 'selected' : ''}>Candlesticks (Padrão)</option>
                      <option value="line" ${chartSettings.type === 'line' ? 'selected' : ''}>Linha de Fechamento</option>
                    </select>
                  </div>
                  <div class="chart-settings-group">
                    <label class="chart-settings-label">Linhas de Grade</label>
                    <select class="chart-settings-select" id="selChartGrid">
                      <option value="smooth" ${chartSettings.grid === 'smooth' ? 'selected' : ''}>Grade Suave</option>
                      <option value="hidden" ${chartSettings.grid === 'hidden' ? 'selected' : ''}>Sem Grade (Oculta)</option>
                    </select>
                  </div>
                  <div class="chart-settings-group">
                    <label class="chart-settings-label">Escala de Preço</label>
                    <select class="chart-settings-select" id="selChartScale">
                      <option value="normal" ${chartSettings.scale === 'normal' ? 'selected' : ''}>Linear / Normal</option>
                      <option value="log" ${chartSettings.scale === 'log' ? 'selected' : ''}>Logarítmica</option>
                    </select>
                  </div>
                  <button class="btn-chart-reset-all" id="btnResetChartZoomFromSettings" type="button">Restaurar Zoom Inicial</button>
                </div>
              </div>
            </div>

            <div class="chart-toolbar-right">
              <button class="chart-toolbar-btn" id="btnChartResetZoom" type="button" title="Restaurar zoom inicial próximo">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                Zoom Padrão
              </button>
              <button class="chart-toolbar-btn" id="btnChartFullscreen" type="button" title="Tela cheia">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
              </button>
            </div>
          </div>

          <div class="chart-canvas-wrapper" id="lightweightChartContainer">
            <div class="chart-legend-overlay" id="chartLegendOverlay">
              <div class="legend-row-main" id="legendMainRow">
                <span>${tickerData.tickerInfo.symbol} · 1D · ${escapeHtml(tickerData.tickerInfo.assetClass || 'B3')}</span>
                <span>Abr ${formatNumber(tickerData.ohlc.at(-1)?.open)}</span>
                <span>Máx ${formatNumber(tickerData.ohlc.at(-1)?.high)}</span>
                <span>Mín ${formatNumber(tickerData.ohlc.at(-1)?.low)}</span>
                <span>Fch ${formatNumber(tickerData.ohlc.at(-1)?.close)}</span>
                <span style="color: ${tickerData.tickerInfo.dayChange >= 0 ? '#10b981' : '#ef4444'}">
                  ${tickerData.tickerInfo.dayChange >= 0 ? '+' : ''}${formatNumber(tickerData.tickerInfo.dayChange)} (${tickerData.tickerInfo.dayChangePct >= 0 ? '+' : ''}${formatNumber(tickerData.tickerInfo.dayChangePct)}%)
                </span>
              </div>
              <div class="legend-row-indicators" id="legendIndicatorsRow">
                <span class="legend-ema9" style="display: ${indicatorPrefs.ema9 ? 'inline' : 'none'}">EMA 9: ${formatNumber(tickerData.indicators.ema9.at(-1)?.value)}</span>
                <span class="legend-ema30" style="display: ${indicatorPrefs.ema30 ? 'inline' : 'none'}">EMA 30: ${formatNumber(tickerData.indicators.ema30.at(-1)?.value)}</span>
                <span class="legend-ema21" style="display: ${indicatorPrefs.ema21 ? 'inline' : 'none'}; color: #3b82f6; font-weight: 700;">EMA 21: —</span>
                <span class="legend-vol" style="display: ${indicatorPrefs.volume ? 'inline' : 'none'}">Volume: ${(tickerData.ohlc.at(-1)?.volume / 1e6).toFixed(1)}M</span>
                <span id="legendCompareTag" style="display: none;"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- VISÃO DO ATIVO CARD -->
        <div class="ticker-summary-card">
          <div class="summary-card-head">
            <div class="summary-card-head-left">
              <div class="summary-trophy-badge">${ICONS.trophy}</div>
              <div class="summary-titles">
                <div class="summary-title">Visão do Ativo</div>
                <div class="summary-subtitle">Baseado no seu método e no rubric atual.</div>
              </div>
            </div>
            <div class="summary-grade-box ${gradeVisual.statusClass}">
              ${tickerData.rubric.finalGrade}
            </div>
          </div>

          <div class="summary-checklist">
            <div class="summary-check-row">
              <div class="summary-check-left">
                <span class="summary-check-icon">${ICONS.relativeStrength}</span> Força Relativa
              </div>
              <div class="summary-check-right">
                <span class="vision-status ${rsStatus}">● ${escapeHtml(tickerData.relativeStrength.classification)} (${tickerData.relativeStrength.score})</span>
              </div>
            </div>
            <div class="summary-check-row">
              <div class="summary-check-left">
                <span class="summary-check-icon">${ICONS.marketCycle}</span> Ciclo de Mercado
              </div>
              <div class="summary-check-right">
                <span class="vision-status ${cycleStatus}">● ${escapeHtml(tickerData.marketCycle.regime)}</span>
              </div>
            </div>
            <div class="summary-check-row">
              <div class="summary-check-left">
                <span class="summary-check-icon">${ICONS.trend}</span> Tendência
              </div>
              <div class="summary-check-right">
                <span class="vision-status ${trendStatus}">● ${escapeHtml(tickerData.trend.formula || tickerData.trend.status)}</span>
              </div>
            </div>
            <div class="summary-check-row">
              <div class="summary-check-left">
                <span class="summary-check-icon">${ICONS.structure}</span> Estrutura
              </div>
              <div class="summary-check-right">
                <span class="vision-status ${structureStatus}">● ${escapeHtml(tickerData.structure.label)}</span>
              </div>
            </div>
            <div class="summary-check-row">
              <div class="summary-check-left">
                <span class="summary-check-icon">${ICONS.trigger}</span> Gatilho
              </div>
              <div class="summary-check-right">
                ${Boolean(tickerData.trigger && tickerData.trigger.hasTrigger)
                  ? `<span class="vision-status good">● ${escapeHtml(tickerData.trigger.name)} (${escapeHtml(tickerData.trigger.grade || 'A')})</span>`
                  : `<span class="vision-status neutral">● Nenhum gatilho</span>`
                }
              </div>
            </div>
            <div class="summary-check-row">
              <div class="summary-check-left">
                <span class="summary-check-icon">${ICONS.volatility}</span> Volatilidade
              </div>
              <div class="summary-check-right">
                <span class="vision-status ${volStatus}">● ${escapeHtml(tickerData.volatility.regime)} (ATR ${formatNumber(tickerData.volatility.atr21)} | ${formatNumber(tickerData.volatility.atrPct)}%)</span>
              </div>
            </div>
            <div class="summary-check-row">
              <div class="summary-check-left">
                <span class="summary-check-icon">${ICONS.fundamentals}</span> Fundamentos
              </div>
              <div class="summary-check-right">
                <span class="vision-status ${fundStatus}">● Fortes</span>
              </div>
            </div>
            <div class="summary-check-row">
              <div class="summary-check-left">
                <span class="summary-check-icon">${ICONS.context}</span> Contexto
              </div>
              <div class="summary-check-right">
                <span class="vision-status ${contextStatus}">● ${escapeHtml(tickerData.context?.title || 'Contexto')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. METHOD INDICATOR WIDGETS (ROW 1 - 6 CARDS) -->
      <div class="method-widgets-row">
        <!-- Card 1: Força Relativa -->
        <div class="method-card">
          <div class="method-card-head">
            <div class="method-card-head-left">
              <div class="method-card-icon">${ICONS.relativeStrength}</div>
              <div class="method-card-title">Força Relativa</div>
            </div>
            <div class="method-card-badge ${rsStatus}">${escapeHtml(tickerData.relativeStrength.classification)}</div>
          </div>
          <div class="method-card-body">
            <div class="method-rs-top-split">
              <div class="method-big-score">${tickerData.relativeStrength.score}</div>
              <div class="method-rs-metrics-stack">
                <div class="method-rs-metric-line">
                  <span class="rs-label">Ranking Geral</span>
                  <span class="rs-val">${tickerData.relativeStrength.rank} / ${tickerData.relativeStrength.totalUniverse}</span>
                </div>
                <div class="method-rs-metric-line">
                  <span class="rs-label">RS (3M)</span>
                  <span class="rs-val ${tickerData.relativeStrength.rs3m >= 0 ? 'rs-pos' : 'rs-neg'}">${tickerData.relativeStrength.rs3m >= 0 ? '+' : ''}${tickerData.relativeStrength.rs3m}%</span>
                </div>
              </div>
            </div>
            <div class="method-rs-badge-row">
              <span class="method-leader-pill ${rsStatus}">${escapeHtml(tickerData.relativeStrength.classification)}</span>
              <span class="method-percentile-text">${tickerData.relativeStrength.percentile}</span>
            </div>
            <div class="method-micro-visual">
              ${renderRsSparkline(rsStatus)}
            </div>
          </div>
        </div>

        <!-- Card 2: Ciclo de Mercado -->
        <div class="method-card">
          <div class="method-card-head">
            <div class="method-card-head-left">
              <div class="method-card-icon">${ICONS.marketCycle}</div>
              <div class="method-card-title">Ciclo de Mercado</div>
            </div>
            <div class="method-card-badge neutral">${escapeHtml(tickerData.marketCycle.benchmark)}</div>
          </div>
          <div class="method-card-body">
            <div class="method-cycle-status ${cycleStatus}">
              <span>●</span> ${escapeHtml(tickerData.marketCycle.regime)}
            </div>
            <div class="method-card-desc">${escapeHtml(tickerData.marketCycle.description)}</div>
            <div class="method-card-subline">
              Score Institucional: <b>${tickerData.marketCycle.score} / 100</b>
            </div>
            <div class="method-micro-visual">
              <div class="mini-volume-bars">
                <span class="vol-bar" style="height: 8px;"></span>
                <span class="vol-bar" style="height: 12px;"></span>
                <span class="vol-bar" style="height: 16px;"></span>
                <span class="vol-bar ${cycleStatus === 'good' ? 'active' : ''}" style="height: 22px;"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 3: Tendência -->
        <div class="method-card">
          <div class="method-card-head">
            <div class="method-card-head-left">
              <div class="method-card-icon">${ICONS.trend}</div>
              <div class="method-card-title">Tendência</div>
            </div>
            <div class="method-card-badge ${trendStatus}">${escapeHtml(tickerData.trend.status)}</div>
          </div>
          <div class="method-card-body">
            <div class="method-trend-headline ${trendStatus}">${escapeHtml(tickerData.trend.status)}</div>
            <div class="trend-formula-pill ${trendStatus}">${escapeHtml(tickerData.trend.formula)}</div>
            <div class="method-checklist-mini">
              <div>
                <span class="check-icon ${tickerData.trend.priceAboveEma9 ? 'good' : 'neutral'}">${tickerData.trend.priceAboveEma9 ? ICONS.check : '—'}</span>
                Preço acima da EMA 9
              </div>
              <div>
                <span class="check-icon ${tickerData.trend.ema9AboveEma30 ? 'good' : 'neutral'}">${tickerData.trend.ema9AboveEma30 ? ICONS.check : '—'}</span>
                EMA 9 acima da EMA 30
              </div>
              <div>
                <span class="check-icon ${tickerData.trend.bothSlopingUp ? 'good' : 'neutral'}">${tickerData.trend.bothSlopingUp ? ICONS.check : '—'}</span>
                Ambas inclinadas para cima
              </div>
            </div>
          </div>
        </div>

        <!-- Card 4: Volatilidade (ATR) -->
        <div class="method-card">
          <div class="method-card-head">
            <div class="method-card-head-left">
              <div class="method-card-icon">${ICONS.volatility}</div>
              <div class="method-card-title">Volatilidade (ATR)</div>
            </div>
            <div class="method-card-badge ${volStatus}">${escapeHtml(tickerData.volatility.regime)}</div>
          </div>
          <div class="method-card-body">
            <div class="method-atr-table">
              <div class="method-atr-row">
                <span class="atr-label">ATR (21):</span>
                <b>R$ ${formatNumber(tickerData.volatility.atr21)}</b>
              </div>
              <div class="method-atr-row">
                <span class="atr-label">ATR %:</span>
                <b>${formatNumber(tickerData.volatility.atrPct)}%</b>
              </div>
              <div class="method-atr-row">
                <span class="atr-label">Regime:</span>
                <b class="atr-regime-val ${volStatus}">${escapeHtml(tickerData.volatility.regime)}</b>
              </div>
            </div>
            <div class="method-micro-visual">
              <div class="mini-atr-histogram">
                <span style="height: 6px;"></span>
                <span style="height: 8px;"></span>
                <span style="height: 10px;"></span>
                <span style="height: 7px;"></span>
                <span style="height: 9px;"></span>
                <span style="height: 12px; background: ${volStatus === 'good' ? '#10b981' : (volStatus === 'bad' ? '#ef4444' : '#38bdf8')};"></span>
                <span style="height: 11px; background: ${volStatus === 'good' ? '#10b981' : (volStatus === 'bad' ? '#ef4444' : '#38bdf8')};"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 5: Estrutura -->
        <div class="method-card">
          <div class="method-card-head">
            <div class="method-card-head-left">
              <div class="method-card-icon">${ICONS.structure}</div>
              <div class="method-card-title">Estrutura</div>
            </div>
            <div class="method-card-badge ${structureStatus}">${tickerData.structure.label === 'Contração' || tickerData.structure.label === 'Pullback' ? 'Saudável' : escapeHtml(tickerData.structure.label)}</div>
          </div>
          <div class="method-card-body">
            <div class="method-structure-label ${structureStatus}">
              <span class="structure-arrow ${structureStatus}">▲</span> ${escapeHtml(tickerData.structure.label)}
            </div>
            <div class="method-card-desc">${escapeHtml(tickerData.structure.description)}</div>
            <div class="method-micro-visual">
              <svg width="100%" height="24" viewBox="0 0 120 24" fill="none">
                <path d="M5 20 L35 6 L65 16 L95 4 L115 8" stroke="${structureStatus === 'bad' ? '#ef4444' : (structureStatus === 'neutral' ? '#94a3b8' : '#10b981')}" stroke-width="2" stroke-linecap="round"/>
                <circle cx="65" cy="16" r="3" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Card 6: Gatilho -->
        <div class="method-card ${Boolean(tickerData.trigger && tickerData.trigger.hasTrigger) ? 'method-card-trigger-highlight' : 'method-card-trigger-neutral'}">
          <div class="method-card-head">
            <div class="method-card-head-left">
              <div class="method-card-icon trigger-icon ${!Boolean(tickerData.trigger && tickerData.trigger.hasTrigger) ? 'neutral-icon' : ''}">${ICONS.trigger}</div>
              <div class="method-card-title">Gatilho</div>
            </div>
            ${Boolean(tickerData.trigger && tickerData.trigger.hasTrigger)
              ? `<div class="method-trigger-grade-badge">${escapeHtml(tickerData.trigger.grade || 'A')}</div>`
              : `<div class="method-trigger-neutral-badge">Neutro</div>`
            }
          </div>
          <div class="method-card-body">
            <div class="method-trigger-name ${!Boolean(tickerData.trigger && tickerData.trigger.hasTrigger) ? 'neutral' : ''}">
              ${Boolean(tickerData.trigger && tickerData.trigger.hasTrigger) ? escapeHtml(tickerData.trigger.name) : 'Nenhum gatilho encontrado'}
            </div>
            <div class="method-card-desc">
              ${Boolean(tickerData.trigger && tickerData.trigger.hasTrigger)
                ? escapeHtml(tickerData.trigger.description || 'Padrão válido de compra acima da EMA 9 e EMA 30.')
                : 'Nenhum padrão de entrada válido identificado no gráfico Diário.'
              }
            </div>
            ${Boolean(tickerData.trigger && tickerData.trigger.hasTrigger) ? `
            <div class="method-micro-visual" style="display: flex; justify-content: flex-end; padding-right: 12px;">
              <div class="mini-candlestick-diagram">
                <div class="mini-candle mother">
                  <div class="mini-candle-wick"></div>
                  <div class="mini-candle-body"></div>
                  <div class="mini-candle-wick"></div>
                </div>
                <div class="mini-candle inside">
                  <div class="mini-candle-wick"></div>
                  <div class="mini-candle-body"></div>
                  <div class="mini-candle-wick"></div>
                </div>
              </div>
            </div>
            ` : `
            <div class="method-trigger-neutral-hint">Aguardando padrão com preço acima da EMA 9 e EMA 30</div>
            `}
          </div>
        </div>
      </div>

      <!-- 5. DETAILED ANALYSIS WIDGETS (ROW 2 - 4 CARDS) -->
      <div class="detailed-widgets-row">
        <!-- Rubric do Ativo -->
        <div class="detailed-card">
          <div class="detailed-card-head">
            <div class="detailed-card-head-left">
              <span class="detailed-card-icon">${ICONS.rubric}</span>
              <span class="detailed-card-title">Rubric do Ativo</span>
            </div>
          </div>
          <div class="rubric-split-layout">
            <table class="rubric-criteria-table">
              <thead>
                <tr>
                  <th style="text-align: left; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; padding: 2px 6px 6px;">Critério</th>
                  <th style="text-align: center; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; padding: 2px 6px 6px;">Status</th>
                  <th style="text-align: right; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; padding: 2px 6px 6px;">Observação</th>
                </tr>
              </thead>
              <tbody>
                ${tickerData.rubric.criteria.map(c => {
                  const isPass = c.status === true;
                  const isFail = c.status === false;
                  return `
                    <tr>
                      <td style="color: #475569; font-weight: 500;">${escapeHtml(c.name)}</td>
                      <td class="rubric-check-td ${isPass ? 'pass' : (isFail ? 'fail' : 'neutral')}">
                        ${isPass ? ICONS.check : (isFail ? `<span class="rubric-fail-dot">✕</span>` : '—')}
                      </td>
                      <td class="rubric-obs-td ${isPass ? 'pass' : (isFail ? 'fail' : 'neutral')}" style="font-weight: 600; text-align: right;">${escapeHtml(c.obs)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            <div class="rubric-final-box ${gradeVisual.statusClass}">
              <div class="rubric-final-label">Nota Final</div>
              <div class="rubric-final-grade">${tickerData.rubric.finalGrade}</div>
              <div class="rubric-final-text">${gradeVisual.summaryText || tickerData.rubric.summaryText}</div>
            </div>
          </div>
        </div>

        <!-- Fundamentos -->
        <div class="detailed-card">
          <div class="detailed-card-head">
            <div class="detailed-card-head-left">
              <span class="detailed-card-icon">${ICONS.fundamentals}</span>
              <span class="detailed-card-title">Fundamentos</span>
            </div>
            <a class="detailed-card-link" id="btnGoFundamentals" href="javascript:void(0)" onclick="if (typeof window.openFundamentalsForTicker === 'function') { window.openFundamentalsForTicker('${escapeHtml(tickerData.tickerInfo.symbol)}'); } else if (typeof window.go === 'function') { window.go('fundamentals'); }">Ver mais →</a>
          </div>
          <div class="fundamentals-grid">
            <div class="fundamental-metric-box">
              <span class="fundamental-label">ROE</span>
              <span class="fundamental-val">${tickerData.fundamentals.roe.value}</span>
              <span class="fundamental-tag">${tickerData.fundamentals.roe.tag}</span>
            </div>
            <div class="fundamental-metric-box">
              <span class="fundamental-label">Margem Líquida</span>
              <span class="fundamental-val">${tickerData.fundamentals.netMargin.value}</span>
              <span class="fundamental-tag">${tickerData.fundamentals.netMargin.tag}</span>
            </div>
            <div class="fundamental-metric-box">
              <span class="fundamental-label">Dív. Líq/EBITDA</span>
              <span class="fundamental-val">${tickerData.fundamentals.netDebtToEbitda.value}</span>
              <span class="fundamental-tag">${tickerData.fundamentals.netDebtToEbitda.tag}</span>
            </div>
            <div class="fundamental-metric-box">
              <span class="fundamental-label">P/L</span>
              <span class="fundamental-val">${tickerData.fundamentals.pe.value}</span>
              <span class="fundamental-tag">${tickerData.fundamentals.pe.tag}</span>
            </div>
            <div class="fundamental-metric-box">
              <span class="fundamental-label">P/VP</span>
              <span class="fundamental-val">${tickerData.fundamentals.pvp.value}</span>
              <span class="fundamental-tag">${tickerData.fundamentals.pvp.tag}</span>
            </div>
            <div class="fundamental-metric-box">
              <span class="fundamental-label">Crescimento LPA</span>
              <span class="fundamental-val">${tickerData.fundamentals.growth.value}</span>
              <span class="fundamental-tag">${tickerData.fundamentals.growth.tag}</span>
            </div>
          </div>
        </div>

        <!-- Liquidez -->
        <div class="detailed-card">
          <div class="detailed-card-head">
            <div class="detailed-card-head-left">
              <span class="detailed-card-icon">${ICONS.liquidity}</span>
              <span class="detailed-card-title">Liquidez</span>
            </div>
          </div>
          <div class="liquidity-rows">
            <div class="liquidity-row">
              <span class="liquidity-label">Volume Médio (21d)</span>
              <span class="liquidity-val">${tickerData.liquidity.volumeAvg21Formatted}</span>
            </div>
            <div class="liquidity-row">
              <span class="liquidity-label">Liquidez Financeira</span>
              <span class="liquidity-val">${tickerData.liquidity.financialLiquidity}</span>
            </div>
            <div class="liquidity-row">
              <span class="liquidity-label">Spread Médio</span>
              <span class="liquidity-val">
                ${tickerData.liquidity.spread}
                <span class="ticker-search-score-badge good" style="font-size: 10px;">${tickerData.liquidity.spreadRating}</span>
              </span>
            </div>
            <div class="liquidity-micro-bars">
              <svg width="100%" height="20" viewBox="0 0 120 20" fill="none">
                <rect x="10" y="8" width="5" height="12" rx="1" fill="#cbd5e1"/>
                <rect x="22" y="10" width="5" height="10" rx="1" fill="#cbd5e1"/>
                <rect x="34" y="6" width="5" height="14" rx="1" fill="#cbd5e1"/>
                <rect x="46" y="11" width="5" height="9" rx="1" fill="#cbd5e1"/>
                <rect x="58" y="4" width="5" height="16" rx="1" fill="#cbd5e1"/>
                <rect x="70" y="7" width="5" height="13" rx="1" fill="#cbd5e1"/>
                <rect x="82" y="3" width="5" height="17" rx="1" fill="#10b981"/>
                <rect x="94" y="5" width="5" height="15" rx="1" fill="#10b981"/>
                <rect x="106" y="2" width="5" height="18" rx="1" fill="#10b981"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Contexto -->
        <div class="detailed-card">
          <div class="detailed-card-head">
            <div class="detailed-card-head-left">
              <span class="detailed-card-icon">${ICONS.context}</span>
              <span class="detailed-card-title">Contexto</span>
            </div>
          </div>
          <div class="context-content">
            <div class="context-title">${tickerData.context.title}</div>
            <div class="context-desc">${tickerData.context.description}</div>
            <div class="context-checklist">
              <div><span class="check-icon">${ICONS.check}</span> Preço acima da EMA 10</div>
              <div><span class="check-icon">${ICONS.check}</span> EMA 10 > EMA 20 > EMA 50</div>
              <div><span class="check-icon">${ICONS.check}</span> Rumo às máximas históricas</div>
              <div><span class="check-icon">${ICONS.check}</span> Líder do setor</div>
            </div>
          </div>
        </div>
      </div>

      <!-- DISCIPLINA FLYOUT DRAWER & OVERLAY -->
      <div class="discipline-drawer-overlay" id="disciplineDrawerOverlay"></div>
      <div class="discipline-drawer" id="disciplineDrawer">
        <div class="discipline-drawer-head">
          <div class="discipline-drawer-title">Disciplina do Diário</div>
          <button class="discipline-drawer-close" id="btnCloseDisciplineDrawer">✕</button>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; font-size: 13px; color: #166534;">
          <b>● Dentro da regra</b><br>
          Você já analisou o <b>Diário</b> hoje. O próximo momento planejado de análise é às <b>18:00</b> (após o fechamento).
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #334155;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">🕒 Última análise:</span>
            <b>${disciplineState?.lastAnalysisTime || '09:14'}</b>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">⏱️ Tempo sem consultar:</span>
            <b>${getDurationSince(disciplineState?.lastInteractionAt)}</b>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">📅 Próxima análise permitida:</span>
            <b>18:00 (Fechamento)</b>
          </div>
        </div>

        <div class="discipline-quote-box">
          "Paciência também é uma posição."
        </div>

        <div>
          <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">
            Sua Semana — Sessões de Gráfico
          </div>
          ${renderWeeklyBars(disciplineState)}
        </div>

        <div class="patience-gauge-card">
          <div class="patience-score-donut">
            ${getPatienceScore(disciplineState)}%
          </div>
          <div>
            <div style="font-size: 13.5px; font-weight: 800; color: #0f172a;">Boa disciplina</div>
            <div style="font-size: 11.5px; color: #64748b;">Você está reduzindo o número de consultas compulsivas. Continue assim!</div>
          </div>
        </div>
      </div>

      <!-- 8. ANOTAÇÕES FLYOUT DRAWER & OVERLAY -->
      <div class="chart-notes-overlay" id="chartNotesOverlay"></div>
      <div class="chart-notes-drawer" id="chartNotesDrawer">
        <div class="chart-notes-head">
          <div class="chart-notes-title-wrap">
            <div class="chart-notes-title">Anotações: ${tickerData.tickerInfo.symbol}</div>
            <div class="chart-notes-subtitle">Diário e planos operacionais para este ativo</div>
          </div>
          <button class="chart-notes-close" id="btnCloseChartNotesDrawer" type="button">✕</button>
        </div>

        <div class="chart-note-form">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b;">Categoria da Anotação</div>
          <div class="chart-note-cat-pills" id="chartNoteCatPills">
            <button type="button" class="note-cat-pill active" data-cat="plano">Setup / Plano</button>
            <button type="button" class="note-cat-pill" data-cat="suporte">Suporte / Resistência</button>
            <button type="button" class="note-cat-pill" data-cat="aviso">Aviso / Risco</button>
            <button type="button" class="note-cat-pill" data-cat="geral">Geral</button>
          </div>
          <textarea class="chart-note-textarea" id="txtChartNote" placeholder="Ex: Rompimento de pivô na EMA 9 com confirmação de volume. Stop inicial abaixo de 36.20."></textarea>
          <button type="button" class="btn-chart-save-note" id="btnSaveChartNote">+ Salvar Anotação</button>
        </div>

        <div>
          <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">
            Histórico de Anotações
          </div>
          <div class="chart-notes-list" id="chartNotesList"></div>
        </div>
      </div>
    `;

    // Renderiza o gráfico TradingView Lightweight Charts
    initLightweightChart(tickerData);

    // Conecta eventos de UI
    setupEventListeners();
  }

  function renderDonutMini(state) {
    const sessions = state ? state.sessionsToday : 1;
    const max = 2;
    const pct = Math.min(1, sessions / max);
    const circumference = 2 * Math.PI * 15;
    const offset = circumference - pct * circumference;
    const color = sessions <= 2 ? '#059669' : (sessions <= 5 ? '#f59e0b' : '#ef4444');

    return `
      <div class="discipline-donut-wrap">
        <svg class="discipline-donut-svg" viewBox="0 0 38 38">
          <circle class="discipline-donut-bg" cx="19" cy="19" r="15"></circle>
          <circle class="discipline-donut-fg" cx="19" cy="19" r="15"
            style="stroke: ${color}; stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset};"></circle>
        </svg>
        <span class="discipline-donut-text">${sessions}/${max}</span>
      </div>
    `;
  }

  function getDisciplinePillClass(state) {
    const s = state ? state.sessionsToday : 1;
    if (s <= 2) return '';
    if (s <= 5) return 'warn';
    return 'danger';
  }

  function getDisciplinePillText(state) {
    const s = state ? state.sessionsToday : 1;
    if (s <= 2) return 'Dentro da regra';
    if (s <= 5) return 'Atenção';
    return 'Excesso de consultas';
  }

  function getDurationSince(timestamp) {
    if (!timestamp) return '5h 27m';
    const diffMs = Math.max(0, Date.now() - Number(timestamp));
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  }

  function getPatienceScore(state) {
    if (window.TickerChartModel) {
      return window.TickerChartModel.evaluatePatienceIndex(state).patienceScore;
    }
    return 72;
  }

  function renderWeeklyBars(state) {
    const evalRes = window.TickerChartModel ? window.TickerChartModel.evaluatePatienceIndex(state) : null;
    const days = evalRes ? evalRes.weekDays : [
      { label: 'Seg', date: '29/09', sessions: 8, status: 'danger' },
      { label: 'Ter', date: '30/09', sessions: 6, status: 'warn' },
      { label: 'Qua', date: '01/10', sessions: 4, status: 'warn' },
      { label: 'Qui', date: '02/10', sessions: 1, status: 'good' },
      { label: 'Sex', date: '03/10', sessions: 0, status: 'zero' }
    ];

    const maxSessions = Math.max(8, ...days.map(d => d.sessions));

    return `
      <div class="weekly-bars-container">
        ${days.map(d => {
          const heightPct = d.sessions > 0 ? Math.max(10, Math.round((d.sessions / maxSessions) * 100)) : 4;
          return `
            <div class="weekly-bar-item">
              <span class="weekly-bar-count">${d.sessions}</span>
              <div class="weekly-bar-fill ${d.status}" style="height: ${heightPct}%;"></div>
              <span class="weekly-bar-label">${d.label}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function getMonogram(sym) {
    const s = String(sym || 'PTR').replace(/[^A-Z]/g, '');
    return s.slice(0, 3) || 'PTR';
  }

  function formatNumber(v) {
    const num = Number(v);
    if (!Number.isFinite(num)) return '—';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Inicializa o Lightweight Charts
  function initLightweightChart(data) {
    const container = document.getElementById('lightweightChartContainer');
    if (!container || !window.LightweightCharts) return;

    if (chartInstance) {
      try { chartInstance.remove(); } catch {}
      chartInstance = null;
    }

    const isGold = document.documentElement.getAttribute('data-theme') === 'gold';
    const chartBg = isGold ? '#0f1715' : '#ffffff';
    const textColor = isGold ? '#e2e8f0' : '#475569';
    const gridColor = isGold ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9';

    const initialHeight = (container && container.clientHeight > 0) ? container.clientHeight : 520;

    chartInstance = window.LightweightCharts.createChart(container, {
      width: container.clientWidth,
      height: initialHeight,
      layout: {
        background: { type: 'solid', color: chartBg },
        textColor: textColor,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor }
      },
      crosshair: {
        mode: 1 // Magnet
      },
      rightPriceScale: {
        borderColor: gridColor,
        scaleMargins: { top: 0.08, bottom: 0.24 }
      },
      timeScale: {
        borderColor: gridColor,
        timeVisible: true,
        secondsVisible: false
      }
    });

    // Candlestick Series
    candleSeries = chartInstance.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
      visible: chartSettings.type !== 'line'
    });
    candleSeries.setData(data.ohlc);

    // Line Series (opcional, para visualização de linha)
    lineSeries = chartInstance.addLineSeries({
      color: '#10b981',
      lineWidth: 2,
      title: data.tickerInfo.symbol,
      visible: chartSettings.type === 'line'
    });
    const lineData = data.ohlc.map(c => ({ time: c.time, value: c.close }));
    lineSeries.setData(lineData);

    // EMA 9 Line
    ema9Series = chartInstance.addLineSeries({
      color: '#0d9488',
      lineWidth: 2,
      title: 'EMA 9',
      visible: !!indicatorPrefs.ema9
    });
    ema9Series.setData(data.indicators.ema9);

    // EMA 30 Line
    ema30Series = chartInstance.addLineSeries({
      color: '#d97706',
      lineWidth: 2,
      title: 'EMA 30',
      visible: !!indicatorPrefs.ema30
    });
    ema30Series.setData(data.indicators.ema30);

    // EMA 21 Line (se ativada pelo usuário)
    if (indicatorPrefs.ema21) {
      ensureEma21Series();
    }

    // Volume Histogram Series (ancorado na base para não sobrepor os candles)
    volumeSeries = chartInstance.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '', // Escala overlay no mesmo painel
      lastValueVisible: false, // Mantém a régua vertical da direita exclusiva para os preços
      priceLineVisible: false, // Não traça linha horizontal no preço
      visible: !!indicatorPrefs.volume
    });

    // Aplica scaleMargins diretamente na escala de preço do volume:
    // top: 0.82 garante que as maiores barras ocupem no máximo 18% da altura do gráfico
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0
      }
    });

    const volumeData = data.ohlc.map(c => ({
      time: c.time,
      value: c.volume || 0,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
    }));
    volumeSeries.setData(volumeData);

    // Aplica configurações visuais (grade suave/oculta, escala logarítmica)
    applyChartSettings();

    // Zoom inicial próximo (exibe ~75 barras com 4 barras de respiro à direita)
    resetChartZoom();

    // Atualiza a legenda ao mover o crosshair
    chartInstance.subscribeCrosshairMove(param => {
      const legendMain = document.getElementById('legendMainRow');
      const legendInd = document.getElementById('legendIndicatorsRow');
      if (!legendMain || !legendInd) return;

      if (!param || !param.time || !param.seriesData) {
        // Restaura o candle mais recente
        const last = data.ohlc.at(-1);
        legendMain.innerHTML = `
          <span>${data.tickerInfo.symbol} · 1D · B3</span>
          <span>Abr ${formatNumber(last?.open)}</span>
          <span>Máx ${formatNumber(last?.high)}</span>
          <span>Mín ${formatNumber(last?.low)}</span>
          <span>Fch ${formatNumber(last?.close)}</span>
          <span style="color: ${data.tickerInfo.dayChange >= 0 ? '#10b981' : '#ef4444'}">
            ${data.tickerInfo.dayChange >= 0 ? '+' : ''}${formatNumber(data.tickerInfo.dayChange)} (${data.tickerInfo.dayChangePct >= 0 ? '+' : ''}${formatNumber(data.tickerInfo.dayChangePct)}%)
          </span>
        `;
        legendInd.innerHTML = `
          <span class="legend-ema9" style="display: ${indicatorPrefs.ema9 ? 'inline' : 'none'}">EMA 9: ${formatNumber(data.indicators.ema9.at(-1)?.value)}</span>
          <span class="legend-ema30" style="display: ${indicatorPrefs.ema30 ? 'inline' : 'none'}">EMA 30: ${formatNumber(data.indicators.ema30.at(-1)?.value)}</span>
          <span class="legend-ema21" style="display: ${indicatorPrefs.ema21 ? 'inline' : 'none'}; color: #3b82f6; font-weight: 700;">EMA 21: ${formatNumber(ema21Series ? data.ohlc.at(-1)?.close : null)}</span>
          <span class="legend-vol" style="display: ${indicatorPrefs.volume ? 'inline' : 'none'}">Volume: ${(last?.volume / 1e6).toFixed(1)}M</span>
          <span id="legendCompareTag" style="display: ${activeBenchmark ? 'inline-block' : 'none'};" class="chart-comparison-active-tag">${activeBenchmark ? 'vs ' + activeBenchmark : ''}</span>
        `;
        return;
      }

      const bar = param.seriesData.get(candleSeries) || param.seriesData.get(lineSeries);
      const e9 = param.seriesData.get(ema9Series);
      const e30 = param.seriesData.get(ema30Series);
      const e21 = ema21Series ? param.seriesData.get(ema21Series) : null;
      const vol = param.seriesData.get(volumeSeries);

      if (bar) {
        const change = bar.close - (bar.open !== undefined ? bar.open : bar.close);
        const changePct = bar.open ? (change / bar.open) * 100 : 0;
        legendMain.innerHTML = `
          <span>${data.tickerInfo.symbol} · ${param.time}</span>
          ${bar.open !== undefined ? `<span>Abr ${formatNumber(bar.open)}</span>` : ''}
          ${bar.high !== undefined ? `<span>Máx ${formatNumber(bar.high)}</span>` : ''}
          ${bar.low !== undefined ? `<span>Mín ${formatNumber(bar.low)}</span>` : ''}
          <span>Fch ${formatNumber(bar.close)}</span>
          <span style="color: ${change >= 0 ? '#10b981' : '#ef4444'}">
            ${change >= 0 ? '+' : ''}${formatNumber(change)} (${changePct >= 0 ? '+' : ''}${formatNumber(changePct)}%)
          </span>
        `;
      }
      if (e9 || e30 || vol || e21) {
        legendInd.innerHTML = `
          <span class="legend-ema9" style="display: ${indicatorPrefs.ema9 ? 'inline' : 'none'}">EMA 9: ${formatNumber(e9?.value)}</span>
          <span class="legend-ema30" style="display: ${indicatorPrefs.ema30 ? 'inline' : 'none'}">EMA 30: ${formatNumber(e30?.value)}</span>
          <span class="legend-ema21" style="display: ${indicatorPrefs.ema21 ? 'inline' : 'none'}; color: #3b82f6; font-weight: 700;">EMA 21: ${formatNumber(e21?.value)}</span>
          <span class="legend-vol" style="display: ${indicatorPrefs.volume ? 'inline' : 'none'}">Volume: ${vol?.value ? (vol.value / 1e6).toFixed(1) + 'M' : '—'}</span>
          <span id="legendCompareTag" style="display: ${activeBenchmark ? 'inline-block' : 'none'};" class="chart-comparison-active-tag">${activeBenchmark ? 'vs ' + activeBenchmark : ''}</span>
        `;
      }
    });

    // Resize automático responsivo
    const resizeObserver = new ResizeObserver(() => {
      if (chartInstance && container) {
        chartInstance.resize(container.clientWidth, container.clientHeight || 480);
      }
    });
    resizeObserver.observe(container);
  }

  // Mostra o Modal de Disciplina ("SUA ANÁLISE JÁ FOI FEITA")
  function showDisciplineModal(targetTicker) {
    // Remove modal anterior se houver
    const old = document.getElementById('disciplineModalOverlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.className = 'discipline-modal-overlay';
    overlay.id = 'disciplineModalOverlay';

    overlay.innerHTML = `
      <div class="discipline-modal-card">
        <button class="discipline-modal-close" id="btnModalClose">✕</button>

        <div class="discipline-icon-badge">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
            <line x1="2" y1="2" x2="22" y2="22" stroke="#ef4444"></line>
          </svg>
        </div>

        <h2 class="discipline-modal-title">SUA ANÁLISE JÁ FOI FEITA</h2>
        <p class="discipline-modal-sub">
          Você opera pelo gráfico <b>Diário</b>.<br>
          Hoje você já realizou suas <b>2 sessões planejadas</b>.
        </p>

        <div class="discipline-warning-box">
          <div class="discipline-warning-icon">ℹ</div>
          <div class="discipline-warning-text">
            Desde então, nenhum novo candle Diário foi concluído.<br>
            O mercado não exige uma nova decisão agora.
          </div>
        </div>

        <div class="discipline-question-title">O que você está buscando agora?</div>

        <div class="discipline-motives-grid">
          ${window.TickerChartModel.MOTIVE_OPTIONS.map((m, idx) => `
            <label class="motive-radio-label">
              <input type="radio" name="disciplineMotive" value="${m.id}" ${idx === 0 ? 'checked' : ''} />
              <span>${m.label}</span>
            </label>
          `).join('')}
        </div>

        <div class="discipline-modal-actions">
          <button class="btn-discipline-leave" id="btnDisciplineLeave">
            <span>↶ NÃO PRECISO OLHAR</span>
            <span class="btn-discipline-leave-sub">Voltar para o Dashboard</span>
          </button>

          <button class="btn-discipline-bypass" id="btnDisciplineBypass">
            <span>📊 PRECISO CONSULTAR MESMO ASSIM</span>
            <span class="btn-discipline-bypass-sub">Continuar para o gráfico</span>
          </button>
        </div>

        <div class="discipline-quote-box">
          "Seu edge não está em olhar mais. Está em esperar melhor."
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Eventos do Modal
    document.getElementById('btnModalClose').onclick = () => overlay.remove();

    document.getElementById('btnDisciplineLeave').onclick = () => {
      overlay.remove();
      if (typeof window.go === 'function') {
        window.go('dashboard');
      }
    };

    document.getElementById('btnDisciplineBypass').onclick = () => {
      const selectedMotive = document.querySelector('input[name="disciplineMotive"]:checked')?.value || 'outro';
      if (window.TickerChartModel && disciplineState) {
        disciplineState = window.TickerChartModel.logBypassMotive(disciplineState, selectedMotive, targetTicker);
        window.TickerChartModel.saveDisciplineState(disciplineState);
      }
      overlay.remove();
      loadTickerData(targetTicker);
    };
  }

  function setupSearchEvents() {
    const searchInput = document.getElementById('tickerSearchInput');
    const dropdown = document.getElementById('tickerSearchDropdown');

    if (searchInput && dropdown) {
      searchInput.oninput = (e) => {
        const query = e.target.value.trim().toUpperCase();
        if (!query) {
          dropdown.classList.remove('active');
          dropdown.innerHTML = '';
          return;
        }

        const filtered = searchUniverse.filter(item =>
          item.symbol.includes(query) || (item.name && item.name.toUpperCase().includes(query))
        ).slice(0, 10);

        if (!filtered.length) {
          dropdown.innerHTML = `<div style="padding: 12px 16px; font-size: 12.5px; color: #64748b;">Nenhum ativo encontrado para "${query}".</div>`;
          dropdown.classList.add('active');
          return;
        }

        dropdown.innerHTML = filtered.map(item => {
          const hasScore = item.score !== null && item.score !== undefined && Number.isFinite(Number(item.score));
          const rsInfo = classifyRelativeStrength(item.score);
          return `
          <div class="ticker-search-item" data-symbol="${item.symbol}">
            <div class="ticker-search-item-left">
              <span class="ticker-search-sym">${item.symbol}</span>
              <span class="ticker-search-name">${item.name || ''}</span>
            </div>
            <div class="ticker-search-item-right">
              <span class="ticker-search-class-badge">${formatAssetClassBadge(item.assetClass)}</span>
              ${hasScore ? `<span class="ticker-search-score-badge ${rsInfo.statusClass}" title="Força Relativa ${rsInfo.label}: ${rsInfo.score}">${item.score}</span>` : ''}
            </div>
          </div>
        `;
        }).join('');

        dropdown.classList.add('active');

        // Click no item do dropdown
        dropdown.querySelectorAll('.ticker-search-item').forEach(el => {
          el.onclick = () => {
            const sym = el.getAttribute('data-symbol');
            dropdown.classList.remove('active');
            searchInput.value = '';
            handleTickerSelect(sym);
          };
        });
      };

      // Pressionar Enter seleciona o primeiro item ou ticker digitado
      searchInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          const first = dropdown.querySelector('.ticker-search-item');
          if (first) {
            const sym = first.getAttribute('data-symbol');
            dropdown.classList.remove('active');
            searchInput.value = '';
            handleTickerSelect(sym);
          } else if (searchInput.value.trim()) {
            const sym = searchInput.value.trim().toUpperCase();
            dropdown.classList.remove('active');
            searchInput.value = '';
            handleTickerSelect(sym);
          }
        } else if (e.key === 'Escape') {
          dropdown.classList.remove('active');
        }
      };

      // Fecha dropdown ao clicar fora
      document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.remove('active');
        }
      });
    }
  }

  function setupDisciplineDrawerEvents() {
    const btnOpenDrawer = document.getElementById('btnOpenDisciplineDrawer');
    const drawer = document.getElementById('disciplineDrawer');
    const overlay = document.getElementById('disciplineDrawerOverlay');
    const btnCloseDrawer = document.getElementById('btnCloseDisciplineDrawer');

    if (btnOpenDrawer && drawer && overlay) {
      btnOpenDrawer.onclick = () => {
        drawer.classList.add('active');
        overlay.classList.add('active');
      };

      const closeFn = () => {
        drawer.classList.remove('active');
        overlay.classList.remove('active');
      };

      if (btnCloseDrawer) btnCloseDrawer.onclick = closeFn;
      overlay.onclick = closeFn;
    }
  }

  function setupPopoverEvents() {
    // 1. Indicadores Popover
    const btnIndicators = document.getElementById('btnChartIndicators');
    const btnCloseIndicators = document.getElementById('btnCloseIndicatorsPopover');
    if (btnIndicators) {
      btnIndicators.onclick = (e) => {
        e.stopPropagation();
        togglePopover('popoverIndicators', 'btnChartIndicators');
      };
    }
    if (btnCloseIndicators) {
      btnCloseIndicators.onclick = (e) => {
        e.stopPropagation();
        closeAllPopovers();
      };
    }

    const chkE9 = document.getElementById('chkIndEma9');
    const chkE30 = document.getElementById('chkIndEma30');
    const chkE21 = document.getElementById('chkIndEma21');
    const chkVol = document.getElementById('chkIndVolume');

    if (chkE9) chkE9.onchange = () => { indicatorPrefs.ema9 = chkE9.checked; saveIndicatorPrefs(indicatorPrefs); applyIndicatorVisibility(); };
    if (chkE30) chkE30.onchange = () => { indicatorPrefs.ema30 = chkE30.checked; saveIndicatorPrefs(indicatorPrefs); applyIndicatorVisibility(); };
    if (chkE21) chkE21.onchange = () => { indicatorPrefs.ema21 = chkE21.checked; saveIndicatorPrefs(indicatorPrefs); applyIndicatorVisibility(); };
    if (chkVol) chkVol.onchange = () => { indicatorPrefs.volume = chkVol.checked; saveIndicatorPrefs(indicatorPrefs); applyIndicatorVisibility(); };

    // 2. Comparar Popover
    const btnCompare = document.getElementById('btnChartCompare');
    const btnCloseCompare = document.getElementById('btnCloseComparePopover');
    if (btnCompare) {
      btnCompare.onclick = (e) => {
        e.stopPropagation();
        togglePopover('popoverCompare', 'btnChartCompare');
      };
    }
    if (btnCloseCompare) {
      btnCloseCompare.onclick = (e) => {
        e.stopPropagation();
        closeAllPopovers();
      };
    }

    // Benchmark quick pills
    document.querySelectorAll('.btn-compare-pill').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const bench = btn.getAttribute('data-bench');
        applyComparison(bench);
      };
    });

    const btnCustomCompare = document.getElementById('btnApplyCustomCompare');
    const inputCustomCompare = document.getElementById('compareTickerInput');
    if (btnCustomCompare && inputCustomCompare) {
      btnCustomCompare.onclick = (e) => {
        e.stopPropagation();
        const sym = inputCustomCompare.value.trim().toUpperCase();
        if (sym) applyComparison(sym);
      };
      inputCustomCompare.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const sym = inputCustomCompare.value.trim().toUpperCase();
          if (sym) applyComparison(sym);
        }
      };
    }

    function applyComparison(bench) {
      activeBenchmark = bench;
      document.querySelectorAll('.btn-compare-pill').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-bench') === bench);
      });
      const statusDiv = document.getElementById('compareActiveStatus');
      if (statusDiv) {
        statusDiv.innerHTML = `
          <div class="compare-active-banner">
            <span>Comparando com <b>${bench}</b></span>
            <button class="btn-compare-remove" id="btnRemoveCompare" type="button">Remover</button>
          </div>
        `;
        const btnRemove = document.getElementById('btnRemoveCompare');
        if (btnRemove) {
          btnRemove.onclick = (e) => {
            e.stopPropagation();
            removeComparison();
          };
        }
      }
      const tag = document.getElementById('legendCompareTag');
      if (tag) {
        tag.textContent = 'vs ' + bench;
        tag.style.display = 'inline-block';
      }
    }

    function removeComparison() {
      activeBenchmark = null;
      document.querySelectorAll('.btn-compare-pill').forEach(b => b.classList.remove('active'));
      const statusDiv = document.getElementById('compareActiveStatus');
      if (statusDiv) statusDiv.innerHTML = '';
      const tag = document.getElementById('legendCompareTag');
      if (tag) tag.style.display = 'none';
      const input = document.getElementById('compareTickerInput');
      if (input) input.value = '';
    }

    // 3. Settings Popover
    const btnSettings = document.getElementById('btnChartSettings');
    const btnCloseSettings = document.getElementById('btnCloseSettingsPopover');
    if (btnSettings) {
      btnSettings.onclick = (e) => {
        e.stopPropagation();
        togglePopover('popoverSettings', 'btnChartSettings');
      };
    }
    if (btnCloseSettings) {
      btnCloseSettings.onclick = (e) => {
        e.stopPropagation();
        closeAllPopovers();
      };
    }

    const selType = document.getElementById('selChartType');
    const selGrid = document.getElementById('selChartGrid');
    const selScale = document.getElementById('selChartScale');
    if (selType) selType.onchange = () => { chartSettings.type = selType.value; saveChartSettings(chartSettings); applyChartSettings(); };
    if (selGrid) selGrid.onchange = () => { chartSettings.grid = selGrid.value; saveChartSettings(chartSettings); applyChartSettings(); };
    if (selScale) selScale.onchange = () => { chartSettings.scale = selScale.value; saveChartSettings(chartSettings); applyChartSettings(); };

    const btnResetZoomSettings = document.getElementById('btnResetChartZoomFromSettings');
    if (btnResetZoomSettings) {
      btnResetZoomSettings.onclick = () => {
        resetChartZoom();
        closeAllPopovers();
      };
    }

    // 4. Zoom Padrão Toolbar Button
    const btnResetZoom = document.getElementById('btnChartResetZoom');
    if (btnResetZoom) {
      btnResetZoom.onclick = () => resetChartZoom();
    }

    // Fecha popovers ao clicar fora de qualquer popover ou botão
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.chart-popover') && !e.target.closest('.chart-toolbar-btn')) {
        closeAllPopovers();
      }
    });
  }

  function setupNotesDrawerEvents() {
    const btnNotes = document.getElementById('btnChartNotes');
    const drawer = document.getElementById('chartNotesDrawer');
    const overlay = document.getElementById('chartNotesOverlay');
    const btnClose = document.getElementById('btnCloseChartNotesDrawer');

    if (btnNotes && drawer && overlay) {
      btnNotes.onclick = () => {
        closeAllPopovers();
        drawer.classList.add('active');
        overlay.classList.add('active');
        renderNotesList();
      };

      const closeFn = () => {
        drawer.classList.remove('active');
        overlay.classList.remove('active');
      };

      if (btnClose) btnClose.onclick = closeFn;
      overlay.onclick = closeFn;

      // Category pills
      document.querySelectorAll('#chartNoteCatPills .note-cat-pill').forEach(pill => {
        pill.onclick = () => {
          document.querySelectorAll('#chartNoteCatPills .note-cat-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          selectedNoteCategory = pill.getAttribute('data-cat') || 'plano';
        };
      });

      // Save note button
      const btnSave = document.getElementById('btnSaveChartNote');
      const txtNote = document.getElementById('txtChartNote');
      if (btnSave && txtNote) {
        btnSave.onclick = () => {
          const val = txtNote.value.trim();
          if (val) {
            saveTickerNote(currentTicker, val, selectedNoteCategory);
            txtNote.value = '';
          }
        };
      }

      // Initial badge & list
      updateNotesBadge();
      renderNotesList();
    }
  }

  function setupWatchlistButtonEvents() {
    updateWatchlistButtonState();

    const btnWatchlist = document.getElementById('btnToggleWatchlist');
    if (btnWatchlist) {
      btnWatchlist.onclick = async () => {
        await toggleWatchlistForCurrentTicker();
      };
    }

    // Sincronização reativa quando a Watchlist for modificada em qualquer lugar
    window.addEventListener('healthyTrend:watchlist-changed', () => {
      updateWatchlistButtonState();
    });
  }

  function setupEventListeners() {
    setupSearchEvents();
    setupDisciplineDrawerEvents();
    setupPopoverEvents();
    setupNotesDrawerEvents();
    setupWatchlistButtonEvents();
    setupTriggerBannerEvents();

    const btnGoFundamentals = document.getElementById('btnGoFundamentals');
    if (btnGoFundamentals) {
      btnGoFundamentals.onclick = (e) => {
        e.preventDefault();
        const sym = tickerData?.tickerInfo?.symbol || currentTicker;
        if (typeof window.openFundamentalsForTicker === 'function') {
          window.openFundamentalsForTicker(sym);
        } else if (typeof window.go === 'function') {
          window.go('fundamentals');
        }
      };
    }

    // Fullscreen no gráfico
    const btnFullscreen = document.getElementById('btnChartFullscreen');
    const chartCard = document.querySelector('.ticker-chart-card');
    if (btnFullscreen && chartCard) {
      btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          chartCard.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }
  }

  function setupTriggerBannerEvents() {
    const btnSimulate = document.getElementById('btnSimulateTriggerTrade');
    if (btnSimulate) {
      btnSimulate.onclick = async () => {
        if (btnSimulate.classList.contains('simulated')) return;
        const trig = tickerData?.trigger;
        if (!trig) return;
        const sym = tickerData?.tickerInfo?.symbol || currentTicker;
        if (window.TradeSimulator && typeof window.TradeSimulator.addSimulation === 'function') {
          await window.TradeSimulator.addSimulation({
            symbol: sym,
            triggerName: trig.name,
            grade: trig.grade || 'A',
            sector: tickerData?.tickerInfo?.sector || '',
            companyName: tickerData?.tickerInfo?.name || sym,
            entryPrice: trig.entry,
            stopLoss: trig.stop
          });
          btnSimulate.classList.add('simulated');
          btnSimulate.innerHTML = '✓ Simulação ativa (Aguardando entrada)';
        }
      };
    }

    const btnNewTrade = document.getElementById('btnNewTradeFromTrigger');
    if (btnNewTrade) {
      btnNewTrade.onclick = () => {
        if (typeof window.go === 'function') {
          window.go('newtrade');
          const symInput = document.getElementById('tradeTicker');
          if (symInput && tickerData?.tickerInfo?.symbol) {
            symInput.value = tickerData.tickerInfo.symbol;
            symInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      };
    }
  }

  function handleTickerSelect(sym) {
    if (window.TickerChartModel && disciplineState) {
      const access = window.TickerChartModel.registerChartAccess(disciplineState);
      disciplineState = access.state;
      window.TickerChartModel.saveDisciplineState(disciplineState);
      if (access.shouldShowDisciplineModal) {
        showDisciplineModal(sym);
        return;
      }
    }
    loadTickerData(sym);
  }

  // Ponto de entrada chamado ao navegar para a tela 'charts'
  function onOpenChartsPage(requestedTicker) {
    initDiscipline();
    const target = requestedTicker || currentTicker || defaultTicker;

    if (window.TickerChartModel && disciplineState) {
      const access = window.TickerChartModel.registerChartAccess(disciplineState);
      disciplineState = access.state;
      window.TickerChartModel.saveDisciplineState(disciplineState);
      if (access.shouldShowDisciplineModal) {
        showDisciplineModal(target);
        return;
      }
    }

    loadUniverse();
    loadTickerData(target);
  }

  // Expõe no window para integração com o app
  window.loadTickerChart = (ticker) => {
    onOpenChartsPage(ticker);
  };

  // Observa mudanças de navegação
  window.addEventListener('healthyTrend:navigate', (e) => {
    if (e.detail?.page === 'charts') {
      onOpenChartsPage(e.detail?.ticker);
    }
  });

  // Inicialização no DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    initDiscipline();
    loadUniverse();
    // Se a página inicial ativa for charts
    const chartsPage = document.getElementById('charts');
    if (chartsPage && chartsPage.classList.contains('active')) {
      onOpenChartsPage();
    }
  });
})();
