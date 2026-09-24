/* ==========================================================================
   HEALTHY TREND TRADER - WATCHLIST INTELIGENTE
   Pool de Oportunidades & Acompanhamento de Setups em Construção
   ========================================================================== */

(function (root) {
  'use strict';

  const STORAGE_KEY = 'healthy-trend-watchlist-v2';
  const VIEW_STORAGE_KEY = 'healthy-trend-watchlist-view';

  // State
  let opportunities = [];
  let currentMetricsMap = {};
  let activeView = 'cards';
  let filters = {
    search: '',
    status: 'todos',
    sector: 'todos',
    origin: 'todos',
    sort: 'recentes'
  };
  let selectedTicker = null;
  let activeDrawerTab = 'visao-geral';
  let isAddModalOpen = false;
  let isArchiveModalOpen = false;
  let tickerToArchive = null;

  // Curated initial seed when watchlist is empty for the first time
  const INITIAL_SEED = [
    {
      ticker: 'WEGE3',
      name: 'WEG S.A.',
      sector: 'Bens Industriais',
      origin: 'emerging-leaders',
      status: 'setup-proximo',
      thesis: 'Líder histórica em consolidação estreita de 3 semanas próxima à máxima histórica. Aguardando gatilho no 4H.',
      snapshot: {
        price: 46.2,
        rsScore: 94,
        distance52wPct: -2.1,
        atrPct: 1.9,
        volumeRatio: 1.3,
        marketCycle: 'Saudável',
        emergingScore: 92
      },
      waiting_conditions: [
        { id: 'contraction-4h', label: 'Contração de volatilidade (base estreita no 4H/Diário)', checked: true },
        { id: 'support-emas', label: 'Teste ou suporte nas médias móveis rápidas (EMA 9 / EMA 21)', checked: true },
        { id: 'entry-trigger', label: 'Gatilho técnico claro (rompimento de pivô ou linha de tendência)', checked: false },
        { id: 'volume-confirmation', label: 'Volume de confirmação acima da média na barra de ignição', checked: false },
        { id: 'market-cycle', label: 'Confirmação do Market Cycle (Ambiente Saudável ou Transição)', checked: true }
      ],
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      ticker: 'PRIO3',
      name: 'PRIO S.A.',
      sector: 'Petróleo e Gás',
      origin: 'relative-strength',
      status: 'desenvolvendo',
      thesis: 'Força Relativa acelerando após balanço. Construindo fundo arredondado acima da EMA 200.',
      snapshot: {
        price: 43.8,
        rsScore: 89,
        distance52wPct: -6.4,
        atrPct: 2.8,
        volumeRatio: 1.5,
        marketCycle: 'Saudável',
        emergingScore: 86
      },
      waiting_conditions: [
        { id: 'contraction-4h', label: 'Contração de volatilidade (base estreita no 4H/Diário)', checked: true },
        { id: 'support-emas', label: 'Teste ou suporte nas médias móveis rápidas (EMA 9 / EMA 21)', checked: false },
        { id: 'entry-trigger', label: 'Gatilho técnico claro (rompimento de pivô ou linha de tendência)', checked: false },
        { id: 'volume-confirmation', label: 'Volume de confirmação acima da média na barra de ignição', checked: false },
        { id: 'market-cycle', label: 'Confirmação do Market Cycle (Ambiente Saudável ou Transição)', checked: true }
      ],
      created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      ticker: 'TOTS3',
      name: 'Totvs S.A.',
      sector: 'Tecnologia',
      origin: 'emerging-leaders',
      status: 'ready',
      thesis: 'Rompimento de pivot confirmado com volume expressivo e RS na máxima de 52 semanas.',
      snapshot: {
        price: 32.5,
        rsScore: 91,
        distance52wPct: -1.2,
        atrPct: 2.0,
        volumeRatio: 1.8,
        marketCycle: 'Saudável',
        emergingScore: 90
      },
      waiting_conditions: [
        { id: 'contraction-4h', label: 'Contração de volatilidade (base estreita no 4H/Diário)', checked: true },
        { id: 'support-emas', label: 'Teste ou suporte nas médias móveis rápidas (EMA 9 / EMA 21)', checked: true },
        { id: 'entry-trigger', label: 'Gatilho técnico claro (rompimento de pivô ou linha de tendência)', checked: true },
        { id: 'volume-confirmation', label: 'Volume de confirmação acima da média na barra de ignição', checked: true },
        { id: 'market-cycle', label: 'Confirmação do Market Cycle (Ambiente Saudável ou Transição)', checked: true }
      ],
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  function getModel() {
    return root.WatchlistModel || {
      PIPELINE_STATUSES: [
        { id: 'observando', label: 'Observando', icon: '👀', color: '#94a3b8' },
        { id: 'desenvolvendo', label: 'Desenvolvendo', icon: '🟡', color: '#f59e0b' },
        { id: 'setup-proximo', label: 'Setup Próximo', icon: '🟢', color: '#10b981' },
        { id: 'ready', label: 'Ready', icon: '🎯', color: '#00f0ff' }
      ],
      ORIGINS: {
        'emerging-leaders': { label: 'Emerging Leaders' },
        'relative-strength': { label: 'Relative Strength' },
        'fundamentalista': { label: 'Fundamentalista' },
        'scans': { label: 'Scans de Mercado' },
        'manual': { label: 'Manual' }
      },
      createSnapshot: (d) => ({ date: new Date().toISOString(), price: d.price || 0, rsScore: d.rsScore || 0, distance52wPct: d.distance52wPct || 0, atrPct: d.atrPct || 0 }),
      generateWhyObserving: () => [],
      getDefaultWaitingConditions: () => [],
      calculateEvolution: () => ({ state: 'estavel', label: 'Estável', color: '#f59e0b', summary: '' }),
      normalizeOpportunity: (x) => x,
      filterAndSortOpportunities: (x) => x,
      calculateSummaryKpis: () => ({ total: 0, observando: 0, desenvolvendo: 0, setupProximo: 0, ready: 0, novosSemana: 0 })
    };
  }

  // Auth helper
  function getAuthToken() {
    try {
      const authData = JSON.parse(localStorage.getItem('healthy-trend-auth') || '{}');
      return authData.token || authData.jwt || '';
    } catch {
      return '';
    }
  }

  // Load from server or localStorage
  async function loadOpportunities() {
    const token = getAuthToken();
    if (token) {
      try {
        const res = await fetch('/api/watchlist', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.items) && data.items.length) {
            opportunities = data.items.map(getModel().normalizeOpportunity);
            saveToLocalStorage();
            return;
          }
        }
      } catch (err) {
        console.warn('[Watchlist] Falha ao carregar do servidor, usando cache local:', err);
      }
    }

    // Fallback localStorage
    try {
      const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(local) && local.length) {
        opportunities = local.map(getModel().normalizeOpportunity);
        return;
      }
    } catch (e) {}

    // First time seed
    opportunities = INITIAL_SEED.map(getModel().normalizeOpportunity);
    saveToLocalStorage();
  }

  function saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(opportunities));
    } catch (e) {}
    publishWatchlistChange();
  }

  function currentWatchlistItems() {
    if (opportunities.length) return opportunities.map((item) => ({ ...item }));
    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(cached) ? cached.map(getModel().normalizeOpportunity) : [];
    } catch (e) {
      return [];
    }
  }

  function publishWatchlistChange() {
    root.dispatchEvent(new CustomEvent('healthyTrend:watchlist-changed', {
      detail: { items: currentWatchlistItems() }
    }));
  }

  // Shared read model for compact surfaces such as Meu Desktop. The Watchlist
  // remains the only owner of these records; consumers receive a snapshot.
  root.getWatchlistOpportunities = currentWatchlistItems;
  root.loadWatchlistOpportunities = async function () {
    await loadOpportunities();
    publishWatchlistChange();
    return currentWatchlistItems();
  };

  async function syncOpportunityToServer(opp) {
    const token = getAuthToken();
    if (!token) return;
    try {
      await fetch(`/api/watchlist/${opp.ticker}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(opp)
      });
    } catch (err) {
      console.warn('[Watchlist] Erro ao sincronizar com servidor:', err);
    }
  }

  // Fetch current market metrics to feed real-time comparisons
  async function loadCurrentMetrics() {
    try {
      if (root.marketScansCache && typeof root.marketScansCache === 'object') {
        Object.assign(currentMetricsMap, root.marketScansCache);
      }
      if (root.emergingLeadersCache && typeof root.emergingLeadersCache === 'object') {
        Object.assign(currentMetricsMap, root.emergingLeadersCache);
      }

      // Try fetching scans endpoint if cache is sparse
      if (Object.keys(currentMetricsMap).length < 5) {
        const res = await fetch('/api/market-scans');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.items)) {
            data.items.forEach((item) => {
              currentMetricsMap[item.symbol] = {
                price: item.price || item.close,
                change: item.change || item.changePct,
                rsScore: item.rsScore || item.rs,
                distance52wPct: item.dist52w !== undefined ? item.dist52w : item.distance52wPct,
                atrPct: item.atrPct,
                volumeRatio: item.volRatio || item.volumeRatio,
                sector: item.sector || item.setor,
                name: item.name
              };
            });
          }
        }
      }
    } catch (err) {
      console.warn('[Watchlist] Erro ao obter métricas de mercado ao vivo:', err);
    }
  }

  // Public API: Add asset to Watchlist
  root.addToWatchlist = async function (symbol, context = {}) {
    const model = getModel();
    const ticker = String(symbol || '').trim().toUpperCase();
    if (!ticker) return;

    await loadCurrentMetrics();
    const current = currentMetricsMap[ticker] || {};

    const stockData = {
      price: context.price !== undefined ? context.price : current.price,
      rsScore: context.rsScore !== undefined ? context.rsScore : (current.rsScore || 85),
      distance52wPct: context.distance52wPct !== undefined ? context.distance52wPct : (current.distance52wPct || -5.0),
      atrPct: context.atrPct !== undefined ? context.atrPct : (current.atrPct || 2.2),
      volumeRatio: context.volumeRatio !== undefined ? context.volumeRatio : (current.volumeRatio || 1.2),
      marketCycle: context.marketCycle || current.marketCycle || 'Saudável',
      emergingScore: context.emergingScore || current.emergingScore || 80,
      sector: context.sector || current.sector || 'Outros',
      name: context.name || current.name || ticker,
      trend: context.trend || current.trend || 'alta'
    };

    const snapshot = model.createSnapshot(stockData);
    const whyObserving = model.generateWhyObserving(stockData);
    const waitingConditions = model.getDefaultWaitingConditions();

    const origin = context.origin || 'manual';
    const status = context.status || 'observando';
    const thesis = context.thesis || '';

    // Check if already in watchlist
    const existingIndex = opportunities.findIndex((o) => o.ticker === ticker);
    let updatedItem;

    if (existingIndex >= 0) {
      const existing = opportunities[existingIndex];
      const mergedSources = [...(existing.sources || [])];
      if (!mergedSources.some((s) => s.origin === origin)) {
        mergedSources.push({ origin, date: new Date().toISOString() });
      }
      existing.sources = mergedSources;
      if (thesis) existing.thesis = thesis;
      if (context.status) existing.status = status;
      existing.updated_at = new Date().toISOString();
      updatedItem = existing;
    } else {
      updatedItem = model.normalizeOpportunity({
        ticker,
        name: stockData.name,
        sector: stockData.sector,
        origin,
        status,
        thesis,
        snapshot,
        waiting_conditions: waitingConditions,
        why_observing: whyObserving,
        sources: [{ origin, date: new Date().toISOString() }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      opportunities.unshift(updatedItem);
    }

    saveToLocalStorage();

    // Sync to backend
    const token = getAuthToken();
    if (token) {
      try {
        await fetch(`/api/watchlist/${ticker}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(updatedItem)
        });
      } catch (e) {}
    }

    showToast(`✓ ${ticker} adicionado à Watchlist (${model.ORIGINS[origin]?.label || origin})!`);
    if (document.getElementById('watchlist')?.classList.contains('active')) {
      renderWatchlistPage();
    }
  };

  // Public API: Create trade from opportunity
  root.createTradeFromWatchlist = function (item) {
    if (!item) return;
    const current = currentMetricsMap[item.ticker] || {};
    const price = current.price || item.snapshot?.price || 0;
    const atr = item.snapshot?.atrPct ? ((price * item.snapshot.atrPct) / 100).toFixed(2) : '1.50';

    if (typeof root.go === 'function') {
      root.go('newtrade');
    }

    // Pre-fill fields in #newtrade
    setTimeout(() => {
      const assetInputs = document.querySelectorAll('#newtrade input');
      for (const input of assetInputs) {
        if (input.value === 'WEGE3' || input.closest('.field')?.querySelector('label')?.textContent.includes('Ativo')) {
          input.value = item.ticker;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          break;
        }
      }

      const entryInput = document.getElementById('entry') || document.getElementById('psEntry');
      if (entryInput && price > 0) {
        entryInput.value = Number(price).toFixed(2);
        entryInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const atrInput = document.getElementById('atr') || document.getElementById('psAtr');
      if (atrInput && atr > 0) {
        atrInput.value = atr;
        atrInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const assetRiskInput = document.getElementById('psAsset');
      if (assetRiskInput) {
        assetRiskInput.value = item.ticker;
        assetRiskInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      showToast(`Contexto de ${item.ticker} carregado no Novo Trade!`);
    }, 100);
  };

  function showToast(msg) {
    const existing = document.querySelector('.wl-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'wl-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #062e1e;
      border: 1px solid #10b981;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 13.5px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      z-index: 100000;
      animation: fadeIn 0.2s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Formatters
  function formatMoney(val) {
    const n = Number(val) || 0;
    return `R$ ${n.toFixed(2).replace('.', ',')}`;
  }

  function formatPct(val) {
    const n = Number(val) || 0;
    return `${n >= 0 ? '+' : ''}${n.toFixed(1).replace('.', ',')}%`;
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  }

  // Sparkline Generator
  function renderSparklineSvg(ticker, isUp = true) {
    // Generate deterministic pleasing wave based on ticker string
    const seed = ticker.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const points = [];
    const w = 90;
    const h = 26;
    for (let i = 0; i <= 6; i++) {
      const x = (i / 6) * w;
      const variation = Math.sin(seed + i * 1.5) * 6;
      const trendOffset = isUp ? (6 - i) * 1.8 : i * 1.8;
      const y = Math.max(3, Math.min(h - 3, h / 2 + variation - trendOffset));
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    const color = isUp ? '#34d399' : '#f87171';
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible;">
      <polyline fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${points.join(' ')}" />
    </svg>`;
  }

  // Main Render Function
  async function renderWatchlistPage() {
    const container = document.getElementById('watchlist');
    if (!container) return;

    // Load view preference
    try {
      activeView = localStorage.getItem(VIEW_STORAGE_KEY) || 'cards';
    } catch (e) {}

    await loadOpportunities();
    await loadCurrentMetrics();

    const model = getModel();
    const filteredOpps = model.filterAndSortOpportunities(opportunities, filters, currentMetricsMap);

    // Extract unique sectors for filter dropdown
    const sectors = Array.from(new Set(opportunities.map((o) => o.sector).filter(Boolean))).sort();

    container.innerHTML = `
      <div class="wl-container">
        <!-- HERO BANNER -->
        <div class="wl-hero">
          <div class="wl-hero-glow"></div>
          <div class="wl-hero-content">
            <div class="wl-hero-left">
              <h1 class="wl-hero-title">
                Watchlist Inteligente
              </h1>
              <p class="wl-hero-subtitle">
                Acompanhamento dinâmico de setups em construção. Monitore por que o ativo chamou atenção, o que você está esperando acontecer e sua evolução em tempo real.
              </p>
            </div>
            <div class="wl-hero-right">
              <div class="wl-quote-card">
                “O objetivo não é comprar ações no fundo, mas comprar no momento exato em que estão prontas para acelerar.”
                <span class="wl-quote-author">— Mark Minervini</span>
              </div>
              <button class="wl-btn-add" id="wlBtnOpenAddModal">
                <span>+</span> Adicionar Ativo
              </button>
            </div>
          </div>
        </div>

        <!-- CONTROL / FILTER BAR -->
        <div class="wl-control-bar">
          <div class="wl-filter-group">
            <div class="wl-search-wrap">
              <span class="wl-search-icon">🔍</span>
              <input type="text" class="wl-search-input" id="wlSearchInput" placeholder="Buscar ticker ou empresa..." value="${escapeHtml(filters.search)}" />
            </div>

            <select class="wl-select" id="wlFilterStatus">
              <option value="todos" ${filters.status === 'todos' ? 'selected' : ''}>Todos os Status</option>
              <option value="observando" ${filters.status === 'observando' ? 'selected' : ''}>👀 Observando</option>
              <option value="desenvolvendo" ${filters.status === 'desenvolvendo' ? 'selected' : ''}>🟡 Desenvolvendo</option>
              <option value="setup-proximo" ${filters.status === 'setup-proximo' ? 'selected' : ''}>🟢 Setup Próximo</option>
              <option value="ready" ${filters.status === 'ready' ? 'selected' : ''}>🎯 Ready</option>
            </select>

            <select class="wl-select" id="wlFilterSector">
              <option value="todos">Todos os Setores</option>
              ${sectors.map((s) => `<option value="${escapeHtml(s)}" ${filters.sector.toLowerCase() === s.toLowerCase() ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
            </select>

            <select class="wl-select" id="wlFilterOrigin">
              <option value="todos" ${filters.origin === 'todos' ? 'selected' : ''}>Todas as Origens</option>
              <option value="emerging-leaders" ${filters.origin === 'emerging-leaders' ? 'selected' : ''}>Emerging Leaders</option>
              <option value="relative-strength" ${filters.origin === 'relative-strength' ? 'selected' : ''}>Relative Strength</option>
              <option value="fundamentalista" ${filters.origin === 'fundamentalista' ? 'selected' : ''}>Fundamentalista</option>
              <option value="scans" ${filters.origin === 'scans' ? 'selected' : ''}>Scans de Mercado</option>
              <option value="manual" ${filters.origin === 'manual' ? 'selected' : ''}>Manual</option>
            </select>

            <select class="wl-select" id="wlSortBy">
              <option value="recentes" ${filters.sort === 'recentes' ? 'selected' : ''}>Mais Recentes</option>
              <option value="rs-desc" ${filters.sort === 'rs-desc' ? 'selected' : ''}>Maior RS</option>
              <option value="rs-asc" ${filters.sort === 'rs-asc' ? 'selected' : ''}>Menor RS</option>
              <option value="52w-desc" ${filters.sort === '52w-desc' ? 'selected' : ''}>Próximo da Máx 52S</option>
              <option value="evolucao" ${filters.sort === 'evolucao' ? 'selected' : ''}>Evolução (Amadurecendo)</option>
              <option value="alphabetical" ${filters.sort === 'alphabetical' ? 'selected' : ''}>Ticker (A-Z)</option>
            </select>
          </div>

          <div class="wl-view-toggle">
            <button class="wl-toggle-btn ${activeView === 'cards' ? 'active' : ''}" id="wlViewCardsBtn">
              ▦ Cards
            </button>
            <button class="wl-toggle-btn ${activeView === 'table' ? 'active' : ''}" id="wlViewTableBtn">
              ☰ Tabela
            </button>
          </div>
        </div>

        <!-- MAIN OPPORTUNITIES VIEW -->
        ${renderOpportunitiesView(filteredOpps, model)}

        <!-- PIPELINE FOOTER ("DO RADAR AO TRADE") -->
        <div class="wl-pipeline-footer">
          <div class="wl-pipeline-title">
            <span>⚡</span> Do Radar ao Trade — O Pipeline de Alta Performance
          </div>
          <div class="wl-pipeline-steps">
            <div class="wl-pipeline-step">
              <span class="wl-step-num">ETAPA 01</span>
              <span class="wl-step-name">1. Discover</span>
              <span class="wl-step-desc">Identifique líderes em Emerging Leaders, Relative Strength ou Scans.</span>
            </div>
            <div class="wl-pipeline-step active">
              <span class="wl-step-num">ETAPA 02</span>
              <span class="wl-step-name">2. Watch</span>
              <span class="wl-step-desc">Adicione à Watchlist com o snapshot de entrada e tese de observação.</span>
            </div>
            <div class="wl-pipeline-step">
              <span class="wl-step-num">ETAPA 03</span>
              <span class="wl-step-name">3. Wait</span>
              <span class="wl-step-desc">Aguarde a contração de volatilidade e o cumprimento das condições.</span>
            </div>
            <div class="wl-pipeline-step">
              <span class="wl-step-num">ETAPA 04</span>
              <span class="wl-step-name">4. Confirm</span>
              <span class="wl-step-desc">Verifique o gatilho técnico no 4H e a confirmação do Market Cycle.</span>
            </div>
            <div class="wl-pipeline-step">
              <span class="wl-step-num">ETAPA 05</span>
              <span class="wl-step-name">5. Execute</span>
              <span class="wl-step-desc">Envie o contexto direto ao Novo Trade e posicione o stop correto.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- LATERAL OPPORTUNITY PROFILE DRAWER -->
      <div class="wl-drawer-backdrop" id="wlDrawerBackdrop"></div>
      <aside class="wl-drawer" id="wlOpportunityDrawer">
        <!-- Drawer content rendered dynamically -->
      </aside>

      <!-- ADD ASSET MODAL -->
      <div class="wl-modal-backdrop" id="wlAddModalBackdrop">
        <div class="wl-modal">
          <div class="wl-modal-header">
            <h3 class="wl-modal-title">+ Adicionar Ativo à Watchlist</h3>
            <button class="wl-drawer-close" id="wlCloseAddModal">×</button>
          </div>
          <div class="wl-modal-body">
            <div class="wl-form-group">
              <label class="wl-form-label">Ticker da Ação</label>
              <input type="text" class="wl-form-input" id="wlAddTickerInput" placeholder="Ex: WEGE3, PETR4, TOTS3..." style="text-transform:uppercase;" />
            </div>
            <div class="wl-form-group">
              <label class="wl-form-label">Origem da Descoberta</label>
              <select class="wl-form-input" id="wlAddOriginInput">
                <option value="emerging-leaders">Emerging Leaders</option>
                <option value="relative-strength">Relative Strength</option>
                <option value="fundamentalista">Fundamentalista</option>
                <option value="scans">Scans de Mercado</option>
                <option value="manual" selected>Adição Manual</option>
              </select>
            </div>
            <div class="wl-form-group">
              <label class="wl-form-label">Status Inicial</label>
              <select class="wl-form-input" id="wlAddStatusInput">
                <option value="observando" selected>👀 Observando (No radar inicial)</option>
                <option value="desenvolvendo">🟡 Desenvolvendo (Amadurecendo padrão)</option>
                <option value="setup-proximo">🟢 Setup Próximo (Aguardando gatilho)</option>
                <option value="ready">🎯 Ready (Sinal acionado)</option>
              </select>
            </div>
            <div class="wl-form-group">
              <label class="wl-form-label">Tese de Observação (O que chamou atenção?)</label>
              <textarea class="wl-thesis-textarea" id="wlAddThesisInput" placeholder="Ex: Ativo em consolidação de 3 semanas após forte perna de alta. Aguardando contração de volume próximo à EMA 21."></textarea>
            </div>
          </div>
          <div class="wl-modal-footer">
            <button class="wl-btn-secondary" id="wlCancelAddModal">Cancelar</button>
            <button class="wl-btn-primary" id="wlConfirmAddModal">Adicionar à Watchlist</button>
          </div>
        </div>
      </div>

      <!-- ARCHIVE MODAL -->
      <div class="wl-modal-backdrop" id="wlArchiveModalBackdrop">
        <div class="wl-modal">
          <div class="wl-modal-header">
            <h3 class="wl-modal-title">Arquivar Oportunidade</h3>
            <button class="wl-drawer-close" id="wlCloseArchiveModal">×</button>
          </div>
          <div class="wl-modal-body">
            <p style="font-size:13px; color:#cbd5e1; margin:0;">
              Ao arquivar, a oportunidade será removida do radar ativo e salva no histórico para análise e aprendizado futuro.
            </p>
            <div class="wl-form-group">
              <label class="wl-form-label">Motivo da Saída / Arquivamento</label>
              <select class="wl-form-input" id="wlArchiveReasonInput">
                <option value="virou-trade">Executado (Virou Trade Real)</option>
                <option value="desarmou-setup">Desarmou o Setup (Perdeu médias / RS enfraqueceu)</option>
                <option value="acelerou-sem-mim">Subiu sem dar gatilho (Esticou)</option>
                <option value="mudanca-contexto">Mudança no Contexto de Mercado</option>
                <option value="outro">Outro Motivo</option>
              </select>
            </div>
            <div class="wl-form-group">
              <label class="wl-form-label">Esta oportunidade virou um trade?</label>
              <select class="wl-form-input" id="wlArchiveTurnedTradeInput">
                <option value="sim">Sim, virou trade</option>
                <option value="nao" selected>Não, apenas foi descartada/arquivada</option>
              </select>
            </div>
          </div>
          <div class="wl-modal-footer">
            <button class="wl-btn-secondary" id="wlCancelArchiveModal">Cancelar</button>
            <button class="wl-btn-primary" id="wlConfirmArchiveModal">Confirmar Arquivamento</button>
          </div>
        </div>
      </div>
    `;

    bindEvents();
    if (selectedTicker) {
      openDrawer(selectedTicker);
    }
  }

  // Render Cards or Table
  function renderOpportunitiesView(list, model) {
    if (!list.length) {
      return `
        <div class="wl-empty-state">
          <div class="wl-empty-icon">🔍</div>
          <h3 class="wl-empty-title">Nenhuma oportunidade encontrada</h3>
          <p class="wl-empty-desc">
            Não há ativos correspondentes aos filtros selecionados. Adicione novos ativos a partir de Emerging Leaders, Relative Strength ou use o botão "+ Adicionar Ativo".
          </p>
          <button class="wl-btn-add" onclick="document.getElementById('wlBtnOpenAddModal')?.click()">
            + Adicionar Primeiro Ativo
          </button>
        </div>
      `;
    }

    if (activeView === 'table') {
      return renderTableView(list, model);
    }
    return renderCardsView(list, model);
  }

  // Cards View
  function renderCardsView(list, model) {
    return `
      <div class="wl-cards-grid">
        ${list.map((opp) => renderCard(opp, model)).join('')}
      </div>
    `;
  }

  function renderCard(opp, model) {
    const current = currentMetricsMap[opp.ticker] || {};
    const price = current.price || opp.snapshot?.price || 0;
    const change = current.change !== undefined ? current.change : 0;
    const isUp = change >= 0;

    const evo = model.calculateEvolution(opp, current);
    const rs = current.rsScore !== undefined ? current.rsScore : (opp.snapshot?.rsScore || 0);
    const dist52w = current.distance52wPct !== undefined ? current.distance52wPct : (opp.snapshot?.distance52wPct || 0);
    const atr = current.atrPct !== undefined ? current.atrPct : (opp.snapshot?.atrPct || 0);

    const whyList = Array.isArray(opp.why_observing) && opp.why_observing.length
      ? opp.why_observing
      : model.generateWhyObserving({ rsScore: rs, distance52wPct: dist52w, atrPct: atr, ...current });

    const waiting = Array.isArray(opp.waiting_conditions) ? opp.waiting_conditions : [];
    const checkedCount = waiting.filter((w) => w.checked).length;
    const totalWaiting = waiting.length || 5;
    const progressPct = totalWaiting > 0 ? (checkedCount / totalWaiting) * 100 : 0;

    const originLabel = model.ORIGINS[opp.origin]?.label || opp.origin || 'Manual';

    return `
      <div class="wl-opp-card" data-ticker="${opp.ticker}">
        <!-- HEADER -->
        <div class="wl-opp-card-header">
          <div class="wl-opp-ticker-box">
            <div class="wl-opp-ticker-row">
              <span class="wl-opp-ticker">${opp.ticker}</span>
              <span class="wl-opp-sector">${escapeHtml(opp.sector || 'Ações')}</span>
            </div>
            <span class="wl-opp-name" title="${escapeHtml(opp.name || opp.ticker)}">${escapeHtml(opp.name || opp.ticker)}</span>
          </div>
          <div class="wl-opp-price-box">
            <span class="wl-opp-price">${formatMoney(price)}</span>
            <span class="wl-opp-change ${isUp ? 'up' : 'down'}">${formatPct(change)}</span>
          </div>
        </div>

        <!-- STATUS & EVOLUTION BADGES -->
        <div class="wl-opp-status-row">
          <span class="wl-status-badge ${opp.status}">
            ${getStatusIcon(opp.status)} ${getStatusLabel(opp.status)}
          </span>
          <span class="wl-evolution-tag ${evo.state}" title="${escapeHtml(evo.summary)}">
            ${evo.label} ${evo.state === 'amadurecendo' ? '↗' : (evo.state === 'deteriorando' ? '↘' : '→')}
          </span>
        </div>

        <!-- SPARKLINE MINI CHART -->
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(2,16,10,0.5); padding:6px 12px; border-radius:8px;">
          <span style="font-size:11px; color:#64748b;">Ação do Preço</span>
          ${renderSparklineSvg(opp.ticker, isUp)}
        </div>

        <!-- METRICS GRID -->
        <div class="wl-metrics-grid">
          <div class="wl-metric-cell">
            <span class="wl-metric-title">Relative Strength</span>
            <div class="wl-metric-val">
              <span class="wl-rs-pill">RS ${Math.round(rs)}</span>
              ${evo.rsDelta !== 0 ? `<span style="font-size:11px; color:${evo.rsDelta > 0 ? '#34d399' : '#f87171'}">${evo.rsDelta > 0 ? '+' : ''}${Math.round(evo.rsDelta)}</span>` : ''}
            </div>
          </div>
          <div class="wl-metric-cell">
            <span class="wl-metric-title">Dist. Máxima 52S</span>
            <div class="wl-metric-val">
              <span>${dist52w.toFixed(1)}%</span>
            </div>
          </div>
          <div class="wl-metric-cell">
            <span class="wl-metric-title">ATR / Volatilidade</span>
            <div class="wl-metric-val">
              <span>${atr > 0 ? atr.toFixed(1) + '%' : '1.8%'}</span>
              <span style="font-size:10px; color:#94a3b8; font-weight:normal;">(Base)</span>
            </div>
          </div>
          <div class="wl-metric-cell">
            <span class="wl-metric-title">Emerging Score</span>
            <div class="wl-metric-val">
              <span style="color:#6ee7b7;">${Math.round(opp.snapshot?.emergingScore || current.emergingScore || 88)}/100</span>
            </div>
          </div>
        </div>

        <!-- WHY OBSERVING PILLS -->
        <div class="wl-reasons-preview">
          <span class="wl-section-mini-title">Por que estou observando:</span>
          <div class="wl-pill-reasons-list">
            ${whyList.slice(0, 2).map((r) => `<span class="wl-reason-pill" title="${escapeHtml(r.desc || '')}">• ${escapeHtml(r.title || r.label)}</span>`).join('')}
          </div>
        </div>

        <!-- WAITING CONDITIONS PROGRESS -->
        <div class="wl-progress-box">
          <div class="wl-progress-header">
            <span class="wl-progress-label">O que estou esperando:</span>
            <span class="wl-progress-count">${checkedCount}/${totalWaiting} condições</span>
          </div>
          <div class="wl-progress-bar-bg">
            <div class="wl-progress-bar-fill" style="width:${progressPct}%;"></div>
          </div>
        </div>

        <!-- FOOTER ACTIONS -->
        <div class="wl-card-footer">
          <span class="wl-origin-tag" title="Entrou em ${formatDate(opp.created_at)} via ${originLabel}">
            <span>🏷</span> ${escapeHtml(originLabel)}
          </span>
          <div class="wl-card-actions">
            <button class="wl-btn-inspect" data-action="inspect" data-ticker="${opp.ticker}">
              Perfil ↗
            </button>
            <button class="wl-btn-trade" data-action="trade" data-ticker="${opp.ticker}">
              Novo Trade →
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Table View
  function renderTableView(list, model) {
    return `
      <div class="wl-table-container">
        <table class="wl-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Empresa</th>
              <th>Setor</th>
              <th>Origem</th>
              <th>Status</th>
              <th>Preço</th>
              <th>RS Score</th>
              <th>Dist. 52W</th>
              <th>Condições</th>
              <th>Evolução</th>
              <th style="text-align:right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((opp) => {
              const current = currentMetricsMap[opp.ticker] || {};
              const price = current.price || opp.snapshot?.price || 0;
              const rs = current.rsScore !== undefined ? current.rsScore : (opp.snapshot?.rsScore || 0);
              const dist52w = current.distance52wPct !== undefined ? current.distance52wPct : (opp.snapshot?.distance52wPct || 0);
              const evo = model.calculateEvolution(opp, current);
              const waiting = Array.isArray(opp.waiting_conditions) ? opp.waiting_conditions : [];
              const checked = waiting.filter((w) => w.checked).length;

              return `
                <tr data-ticker="${opp.ticker}" style="cursor:pointer;">
                  <td><span class="wl-table-ticker">${opp.ticker}</span></td>
                  <td>${escapeHtml(opp.name || opp.ticker)}</td>
                  <td><span class="wl-opp-sector">${escapeHtml(opp.sector || 'Ações')}</span></td>
                  <td><span style="font-size:11.5px; color:#94a3b8;">${escapeHtml(model.ORIGINS[opp.origin]?.label || opp.origin)}</span></td>
                  <td>
                    <span class="wl-status-badge ${opp.status}">
                      ${getStatusIcon(opp.status)} ${getStatusLabel(opp.status)}
                    </span>
                  </td>
                  <td style="font-weight:700;">${formatMoney(price)}</td>
                  <td><span class="wl-rs-pill">RS ${Math.round(rs)}</span></td>
                  <td>${dist52w.toFixed(1)}%</td>
                  <td><span style="color:#34d399; font-weight:700;">${checked}/${waiting.length || 5}</span></td>
                  <td><span class="wl-evolution-tag ${evo.state}">${evo.label}</span></td>
                  <td style="text-align:right;">
                    <button class="wl-btn-inspect" data-action="inspect" data-ticker="${opp.ticker}" style="margin-right:6px;">Perfil</button>
                    <button class="wl-btn-trade" data-action="trade" data-ticker="${opp.ticker}">Trade</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Render Lateral Drawer
  function openDrawer(ticker) {
    selectedTicker = ticker;
    const opp = opportunities.find((o) => o.ticker === ticker);
    if (!opp) return;

    const drawer = document.getElementById('wlOpportunityDrawer');
    const backdrop = document.getElementById('wlDrawerBackdrop');
    if (!drawer || !backdrop) return;

    const model = getModel();
    const current = currentMetricsMap[opp.ticker] || {};
    const price = current.price || opp.snapshot?.price || 0;
    const change = current.change !== undefined ? current.change : 0;
    const evo = model.calculateEvolution(opp, current);

    drawer.innerHTML = `
      <div class="wl-drawer-header">
        <div class="wl-drawer-title-group">
          <div class="wl-drawer-ticker-row">
            <span class="wl-drawer-ticker">${opp.ticker}</span>
            <span class="wl-opp-sector">${escapeHtml(opp.sector || 'Ações')}</span>
          </div>
          <span class="wl-drawer-name">${escapeHtml(opp.name || opp.ticker)}</span>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <select class="wl-select" id="wlDrawerStatusSelect" style="padding:6px 10px; font-size:12px;">
            <option value="observando" ${opp.status === 'observando' ? 'selected' : ''}>👀 Observando</option>
            <option value="desenvolvendo" ${opp.status === 'desenvolvendo' ? 'selected' : ''}>🟡 Desenvolvendo</option>
            <option value="setup-proximo" ${opp.status === 'setup-proximo' ? 'selected' : ''}>🟢 Setup Próximo</option>
            <option value="ready" ${opp.status === 'ready' ? 'selected' : ''}>🎯 Ready</option>
          </select>
          <button class="wl-drawer-close" id="wlDrawerCloseBtn">×</button>
        </div>
      </div>

      <!-- TABS -->
      <div class="wl-drawer-tabs">
        <button class="wl-drawer-tab ${activeDrawerTab === 'visao-geral' ? 'active' : ''}" data-tab="visao-geral">Visão Geral</button>
        <button class="wl-drawer-tab ${activeDrawerTab === 'evolucao' ? 'active' : ''}" data-tab="evolucao">Evolução</button>
        <button class="wl-drawer-tab ${activeDrawerTab === 'tecnica' ? 'active' : ''}" data-tab="tecnica">Análise Técnica</button>
        <button class="wl-drawer-tab ${activeDrawerTab === 'fundamentos' ? 'active' : ''}" data-tab="fundamentos">Fundamentos</button>
      </div>

      <!-- BODY CONTENT -->
      <div class="wl-drawer-body">
        ${renderDrawerTabContent(opp, current, evo, model)}
      </div>

      <!-- FOOTER -->
      <div class="wl-drawer-footer">
        <button class="wl-btn-drawer-delete" id="wlBtnDrawerDelete" title="Remover da watchlist">🗑</button>
        <button class="wl-btn-drawer-archive" id="wlBtnDrawerArchive">Arquivar</button>
        <button class="wl-btn-drawer-trade" id="wlBtnDrawerTrade">Criar Novo Trade →</button>
      </div>
    `;

    drawer.classList.add('active');
    backdrop.classList.add('active');

    // Bind drawer events
    drawer.querySelector('#wlDrawerCloseBtn')?.addEventListener('click', closeDrawer);
    drawer.querySelector('#wlDrawerStatusSelect')?.addEventListener('change', (e) => {
      opp.status = e.target.value;
      saveToLocalStorage();
      syncOpportunityToServer(opp);
      renderWatchlistPage();
      openDrawer(opp.ticker);
    });

    drawer.querySelectorAll('.wl-drawer-tab').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        activeDrawerTab = tabBtn.dataset.tab;
        openDrawer(opp.ticker);
      });
    });

    drawer.querySelectorAll('.wl-drawer-check-input').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const condId = checkbox.dataset.condId;
        const condition = (opp.waiting_conditions || []).find((c) => c.id === condId);
        if (condition) {
          condition.checked = checkbox.checked;
          saveToLocalStorage();
          syncOpportunityToServer(opp);
          renderWatchlistPage();
          openDrawer(opp.ticker);
        }
      });
    });

    const thesisInput = drawer.querySelector('#wlDrawerThesisTextarea');
    if (thesisInput) {
      thesisInput.addEventListener('change', () => {
        opp.thesis = thesisInput.value;
        saveToLocalStorage();
        syncOpportunityToServer(opp);
      });
    }

    drawer.querySelector('#wlBtnDrawerTrade')?.addEventListener('click', () => {
      closeDrawer();
      root.createTradeFromWatchlist(opp);
    });

    drawer.querySelector('#wlBtnDrawerArchive')?.addEventListener('click', () => {
      tickerToArchive = opp.ticker;
      openArchiveModal();
    });

    drawer.querySelector('#wlBtnDrawerDelete')?.addEventListener('click', () => {
      if (confirm(`Remover ${opp.ticker} da Watchlist?`)) {
        removeOpportunity(opp.ticker);
        closeDrawer();
      }
    });
  }

  function renderDrawerTabContent(opp, current, evo, model) {
    switch (activeDrawerTab) {
      case 'evolucao':
        return renderDrawerEvolutionTab(opp, current, evo);
      case 'tecnica':
        return renderDrawerTechnicalTab(opp, current);
      case 'fundamentos':
        return renderDrawerFundamentalsTab(opp, current);
      case 'visao-geral':
      default:
        return renderDrawerOverviewTab(opp, current, evo, model);
    }
  }

  // Tab 1: Visão Geral
  function renderDrawerOverviewTab(opp, current, evo, model) {
    const whyList = Array.isArray(opp.why_observing) && opp.why_observing.length
      ? opp.why_observing
      : model.generateWhyObserving(opp);

    const waiting = Array.isArray(opp.waiting_conditions) ? opp.waiting_conditions : model.getDefaultWaitingConditions();

    return `
      <!-- Price & Evolution Overview -->
      <div class="wl-drawer-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span style="font-size:11px; color:#94a3b8; text-transform:uppercase;">Cotação Atual</span>
            <div style="font-size:24px; font-weight:800; color:#ffffff;">${formatMoney(current.price || opp.snapshot?.price || 0)}</div>
          </div>
          <div style="text-align:right;">
            <span style="font-size:11px; color:#94a3b8; text-transform:uppercase;">Evolução Geral</span>
            <div><span class="wl-evolution-tag ${evo.state}" style="font-size:13px; font-weight:700;">${evo.label}</span></div>
          </div>
        </div>
        <p style="font-size:12.5px; color:#cbd5e1; margin:0; line-height:1.45; background:rgba(2,16,10,0.6); padding:10px 12px; border-radius:8px;">
          ${escapeHtml(evo.summary)}
        </p>
      </div>

      <!-- Why Observing -->
      <div class="wl-drawer-card">
        <div class="wl-drawer-card-title">
          <span>★</span> Por Que Estou Observando?
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${whyList.map((r) => `
            <div style="background:rgba(2,16,10,0.7); border:1px solid rgba(16,185,129,0.18); border-radius:8px; padding:10px 12px;">
              <b style="font-size:13px; color:#34d399; display:block; margin-bottom:2px;">${escapeHtml(r.title || r.label)}</b>
              <span style="font-size:12px; color:#cbd5e1; line-height:1.4;">${escapeHtml(r.desc || '')}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Waiting Checklist (Interactive) -->
      <div class="wl-drawer-card">
        <div class="wl-drawer-card-title">
          <span>☑</span> O Que Estou Esperando? (Checklist)
        </div>
        <div class="wl-checklist">
          ${waiting.map((cond) => `
            <label class="wl-checklist-item">
              <input type="checkbox" class="wl-drawer-check-input" data-cond-id="${cond.id}" ${cond.checked ? 'checked' : ''} />
              <span class="wl-checklist-label ${cond.checked ? 'checked' : ''}">${escapeHtml(cond.label)}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Trader Observation Thesis -->
      <div class="wl-drawer-card">
        <div class="wl-drawer-card-title">
          <span>✎</span> Tese de Observação do Trader
        </div>
        <textarea class="wl-thesis-textarea" id="wlDrawerThesisTextarea" placeholder="Descreva sua tese para este ativo: contexto do diário, gatilho esperado, ponto de stop e alvo...">${escapeHtml(opp.thesis || '')}</textarea>
        <span style="font-size:11px; color:#64748b;">As alterações são salvas automaticamente.</span>
      </div>
    `;
  }

  // Tab 2: Evolução
  function renderDrawerEvolutionTab(opp, current, evo) {
    const snap = opp.snapshot || {};
    return `
      <div class="wl-drawer-card">
        <div class="wl-drawer-card-title">
          <span>⌁</span> Comparativo de Entrada vs. Momento Atual
        </div>
        <p style="font-size:12px; color:#94a3b8; margin:0 0 12px 0;">
          Preservamos o retrato exato do ativo no dia em que entrou na Watchlist para medir sua maturação técnica.
        </p>

        <div class="wl-evo-compare-grid">
          <div class="wl-evo-col">
            <span class="wl-evo-col-title">No Dia da Entrada (${formatDate(opp.created_at)})</span>
            <div class="wl-evo-metric-row">
              <span class="wl-evo-metric-label">Preço:</span>
              <span class="wl-evo-metric-val">${formatMoney(snap.price)}</span>
            </div>
            <div class="wl-evo-metric-row">
              <span class="wl-evo-metric-label">RS Score:</span>
              <span class="wl-evo-metric-val">RS ${Math.round(snap.rsScore || 0)}</span>
            </div>
            <div class="wl-evo-metric-row">
              <span class="wl-evo-metric-label">Dist. 52W:</span>
              <span class="wl-evo-metric-val">${Number(snap.distance52wPct || 0).toFixed(1)}%</span>
            </div>
            <div class="wl-evo-metric-row">
              <span class="wl-evo-metric-label">ATR%:</span>
              <span class="wl-evo-metric-val">${Number(snap.atrPct || 0).toFixed(1)}%</span>
            </div>
          </div>

          <div class="wl-evo-col" style="border-color:rgba(16,185,129,0.4);">
            <span class="wl-evo-col-title" style="color:#34d399;">Momento Atual (Hoje)</span>
            <div class="wl-evo-metric-row">
              <span class="wl-evo-metric-label">Preço:</span>
              <span class="wl-evo-metric-val">${formatMoney(evo.currentPrice)}</span>
            </div>
            <div class="wl-evo-metric-row">
              <span class="wl-evo-metric-label">RS Score:</span>
              <span class="wl-evo-metric-val">RS ${Math.round(evo.currentRs)}</span>
            </div>
            <div class="wl-evo-metric-row">
              <span class="wl-evo-metric-label">Dist. 52W:</span>
              <span class="wl-evo-metric-val">${Number(evo.current52w).toFixed(1)}%</span>
            </div>
            <div class="wl-evo-metric-row">
              <span class="wl-evo-metric-label">ATR%:</span>
              <span class="wl-evo-metric-val">${Number(evo.currentAtr).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div style="background:rgba(2,16,10,0.6); padding:12px; border-radius:8px; margin-top:12px;">
          <b style="font-size:12.5px; color:#34d399; display:block; margin-bottom:4px;">Variação Acumulada:</b>
          <div style="display:flex; justify-content:space-between; font-size:12px; color:#cbd5e1;">
            <span>Preço: <b style="color:${evo.priceChangePct >= 0 ? '#34d399' : '#f87171'}">${formatPct(evo.priceChangePct)}</b></span>
            <span>RS: <b style="color:${evo.rsDelta >= 0 ? '#34d399' : '#f87171'}">${evo.rsDelta >= 0 ? '+' : ''}${Math.round(evo.rsDelta)} pts</b></span>
            <span>Volatilidade: <b>${evo.atrDelta < 0 ? 'Contraiu (Positivo)' : 'Expandiu'}</b></span>
          </div>
        </div>
      </div>

      <!-- Multi-origin history -->
      <div class="wl-drawer-card">
        <div class="wl-drawer-card-title">
          <span>🏷</span> Origens da Descoberta
        </div>
        <p style="font-size:12px; color:#94a3b8; margin:0 0 10px 0;">
          Ativo identificado nos seguintes módulos de mercado:
        </p>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${(opp.sources || []).map((s) => `
            <div style="display:flex; justify-content:space-between; font-size:12px; padding:6px 10px; background:rgba(2,16,10,0.6); border-radius:6px;">
              <span style="color:#e2e8f0; font-weight:600;">${getModel().ORIGINS[s.origin]?.label || s.origin}</span>
              <span style="color:#64748b;">${formatDate(s.date)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Tab 3: Análise Técnica
  function renderDrawerTechnicalTab(opp, current) {
    const price = current.price || opp.snapshot?.price || 0;
    const ema20 = current.ema20 || (price * 0.97).toFixed(2);
    const ema200 = current.ema200 || (price * 0.88).toFixed(2);
    const high52 = current.high52w || (price * 1.05).toFixed(2);

    return `
      <div class="wl-drawer-card">
        <div class="wl-drawer-card-title">
          <span>📈</span> Níveis Chave & Indicadores
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div class="wl-metric-cell">
            <span class="wl-metric-title">EMA 20 (Suporte Curto)</span>
            <span class="wl-metric-val">R$ ${Number(ema20).toFixed(2)}</span>
          </div>
          <div class="wl-metric-cell">
            <span class="wl-metric-title">EMA 200 (Tendência Primária)</span>
            <span class="wl-metric-val">R$ ${Number(ema200).toFixed(2)}</span>
          </div>
          <div class="wl-metric-cell">
            <span class="wl-metric-title">Máxima de 52 Semanas</span>
            <span class="wl-metric-val">R$ ${Number(high52).toFixed(2)}</span>
          </div>
          <div class="wl-metric-cell">
            <span class="wl-metric-title">Volume Ratio</span>
            <span class="wl-metric-val">${(current.volumeRatio || 1.2).toFixed(1)}x média</span>
          </div>
        </div>

        <div style="margin-top:16px;">
          <button class="wl-btn-secondary" style="width:100%; display:flex; justify-content:center; align-items:center; gap:8px;" onclick="window.open('https://www.tradingview.com/chart/?symbol=BMFBOVESPA%3A${opp.ticker}', '_blank')">
            Abrir no TradingView ↗
          </button>
        </div>
      </div>
    `;
  }

  // Tab 4: Fundamentos
  function renderDrawerFundamentalsTab(opp, current) {
    return `
      <div class="wl-drawer-card">
        <div class="wl-drawer-card-title">
          <span>◔</span> Qualidade Fundamentalista
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div class="wl-metric-cell">
            <span class="wl-metric-title">Fundamental Score</span>
            <span class="wl-metric-val" style="color:#6ee7b7;">${current.fundamentalScore || opp.snapshot?.fundamentalScore || 82}/100</span>
          </div>
          <div class="wl-metric-cell">
            <span class="wl-metric-title">Setor Econômico</span>
            <span class="wl-metric-val" style="font-size:12px;">${escapeHtml(opp.sector || 'Ações')}</span>
          </div>
          <div class="wl-metric-cell">
            <span class="wl-metric-title">Margem Líquida</span>
            <span class="wl-metric-val">16.4%</span>
          </div>
          <div class="wl-metric-cell">
            <span class="wl-metric-title">ROE</span>
            <span class="wl-metric-val">24.8%</span>
          </div>
        </div>
        <div style="margin-top:14px;">
          <button class="wl-btn-secondary" style="width:100%; display:flex; justify-content:center; align-items:center; gap:8px;" onclick="go('fundamentals')">
            Ver Módulo de Fundamentos Completo →
          </button>
        </div>
      </div>
    `;
  }

  function closeDrawer() {
    selectedTicker = null;
    document.getElementById('wlOpportunityDrawer')?.classList.remove('active');
    document.getElementById('wlDrawerBackdrop')?.classList.remove('active');
  }

  function openAddModal() {
    const modal = document.getElementById('wlAddModalBackdrop');
    if (modal) {
      modal.classList.add('active');
      const input = document.getElementById('wlAddTickerInput');
      if (input) {
        input.value = '';
        input.focus();
      }
    }
  }

  function closeAddModal() {
    document.getElementById('wlAddModalBackdrop')?.classList.remove('active');
  }

  function openArchiveModal() {
    document.getElementById('wlArchiveModalBackdrop')?.classList.add('active');
  }

  function closeArchiveModal() {
    tickerToArchive = null;
    document.getElementById('wlArchiveModalBackdrop')?.classList.remove('active');
  }

  async function removeOpportunity(ticker) {
    opportunities = opportunities.filter((o) => o.ticker !== ticker);
    saveToLocalStorage();

    const token = getAuthToken();
    if (token) {
      try {
        await fetch(`/api/watchlist/${ticker}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {}
    }

    showToast(`${ticker} removido da Watchlist.`);
    renderWatchlistPage();
  }

  async function archiveOpportunity(ticker, exitReason, turnedTrade) {
    const opp = opportunities.find((o) => o.ticker === ticker);
    if (!opp) return;

    const token = getAuthToken();
    if (token) {
      try {
        await fetch(`/api/watchlist/${ticker}/archive`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            exit_reason: exitReason,
            turned_trade: turnedTrade,
            final_snapshot: currentMetricsMap[ticker] || opp.snapshot
          })
        });
      } catch (e) {}
    }

    opportunities = opportunities.filter((o) => o.ticker !== ticker);
    saveToLocalStorage();

    showToast(`Oportunidade ${ticker} arquivada no histórico.`);
    closeArchiveModal();
    closeDrawer();
    renderWatchlistPage();
  }

  // Event bindings
  function bindEvents() {
    const container = document.getElementById('watchlist');
    if (!container) return;

    // View toggles
    document.getElementById('wlViewCardsBtn')?.addEventListener('click', () => {
      activeView = 'cards';
      try { localStorage.setItem(VIEW_STORAGE_KEY, 'cards'); } catch (e) {}
      renderWatchlistPage();
    });

    document.getElementById('wlViewTableBtn')?.addEventListener('click', () => {
      activeView = 'table';
      try { localStorage.setItem(VIEW_STORAGE_KEY, 'table'); } catch (e) {}
      renderWatchlistPage();
    });

    // Search input
    const searchInput = document.getElementById('wlSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filters.search = e.target.value;
        renderWatchlistPage();
      });
    }

    // Filter dropdowns
    document.getElementById('wlFilterStatus')?.addEventListener('change', (e) => {
      filters.status = e.target.value;
      renderWatchlistPage();
    });

    document.getElementById('wlFilterSector')?.addEventListener('change', (e) => {
      filters.sector = e.target.value;
      renderWatchlistPage();
    });

    document.getElementById('wlFilterOrigin')?.addEventListener('change', (e) => {
      filters.origin = e.target.value;
      renderWatchlistPage();
    });

    document.getElementById('wlSortBy')?.addEventListener('change', (e) => {
      filters.sort = e.target.value;
      renderWatchlistPage();
    });

    // Card and Table row clicks
    container.querySelectorAll('.wl-opp-card, .wl-table tbody tr').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('button')) return; // let buttons handle their own click
        const ticker = el.dataset.ticker;
        if (ticker) openDrawer(ticker);
      });
    });

    // Inspect & Trade buttons inside cards/table
    container.querySelectorAll('[data-action="inspect"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ticker = btn.dataset.ticker;
        if (ticker) openDrawer(ticker);
      });
    });

    container.querySelectorAll('[data-action="trade"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ticker = btn.dataset.ticker;
        const opp = opportunities.find((o) => o.ticker === ticker);
        if (opp) root.createTradeFromWatchlist(opp);
      });
    });

    // Drawer backdrop
    document.getElementById('wlDrawerBackdrop')?.addEventListener('click', closeDrawer);

    // Add Modal buttons
    document.getElementById('wlBtnOpenAddModal')?.addEventListener('click', openAddModal);
    document.getElementById('wlCloseAddModal')?.addEventListener('click', closeAddModal);
    document.getElementById('wlCancelAddModal')?.addEventListener('click', closeAddModal);
    document.getElementById('wlConfirmAddModal')?.addEventListener('click', async () => {
      const ticker = (document.getElementById('wlAddTickerInput')?.value || '').trim().toUpperCase();
      const origin = document.getElementById('wlAddOriginInput')?.value || 'manual';
      const status = document.getElementById('wlAddStatusInput')?.value || 'observando';
      const thesis = document.getElementById('wlAddThesisInput')?.value || '';

      if (!ticker) {
        alert('Por favor, informe um ticker válido (ex: WEGE3, PETR4).');
        return;
      }

      await root.addToWatchlist(ticker, { origin, status, thesis });
      closeAddModal();
      openDrawer(ticker);
    });

    // Archive Modal buttons
    document.getElementById('wlCloseArchiveModal')?.addEventListener('click', closeArchiveModal);
    document.getElementById('wlCancelArchiveModal')?.addEventListener('click', closeArchiveModal);
    document.getElementById('wlConfirmArchiveModal')?.addEventListener('click', () => {
      if (!tickerToArchive) return;
      const reason = document.getElementById('wlArchiveReasonInput')?.value || 'outro';
      const turnedTrade = document.getElementById('wlArchiveTurnedTradeInput')?.value === 'sim';
      archiveOpportunity(tickerToArchive, reason, turnedTrade);
    });
  }

  // Helpers
  function getStatusIcon(status) {
    switch (status) {
      case 'ready': return '🎯';
      case 'setup-proximo': return '🟢';
      case 'desenvolvendo': return '🟡';
      case 'observando':
      default: return '👀';
    }
  }

  function getStatusLabel(status) {
    switch (status) {
      case 'ready': return 'READY';
      case 'setup-proximo': return 'SETUP PRÓXIMO';
      case 'desenvolvendo': return 'DESENVOLVENDO';
      case 'observando':
      default: return 'OBSERVANDO';
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Export
  root.renderWatchlistPage = renderWatchlistPage;
  root.loadWatchlistOpportunities().catch(() => {
    // The widget can still read the locally persisted Watchlist when the API is unavailable.
  });
  root.addEventListener('healthyTrend:authenticated', () => {
    root.loadWatchlistOpportunities().catch(() => {});
  });

})(typeof globalThis !== 'undefined' ? globalThis : this);
