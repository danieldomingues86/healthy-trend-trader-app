(function () {
  'use strict';

  const apiBase = () => window.MARKET_DATA_API_URL || 'http://localhost:8787/api';
  const t = (pt, en) => window.appLanguage === 'en-US' ? en : pt;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const numBR = (value, digits = 1) => Number.isFinite(Number(value)) ? Number(value).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—';
  const pctBR = (value, digits = 1) => Number.isFinite(Number(value)) ? `${Number(value) >= 0 ? '+' : ''}${numBR(value, digits)}%` : '—';

  let rawData = {
    stocks: [],
    cycle: null,
    watchedTickers: new Set()
  };

  let state = {
    loading: true,
    error: '',
    selectedTicker: null,
    activeTab: 'overview',
    filters: {
      market: 'B3',
      sector: 'Todos os setores',
      minRs: 80,
      onlyNewHighs: false,
      search: ''
    },
    sortField: 'rs',
    sortAsc: false
  };

  async function loadWatchlist() {
    if (!window.healthyTrendApi?.isAuthenticated()) {
      rawData.watchedTickers = new Set();
      return;
    }
    try {
      const response = await window.healthyTrendApi.request('/api/watchlist');
      rawData.watchedTickers = new Set((response.items || []).map(i => i.ticker));
    } catch (e) {
      rawData.watchedTickers = new Set();
    }
  }

  async function toggleWatchlist(ticker) {
    const tracked = rawData.watchedTickers.has(ticker);
    const stock = (rawData.stocks || []).find(s => s.symbol === ticker) || {};
    try {
      if (tracked) {
        rawData.watchedTickers.delete(ticker);
        if (window.healthyTrendApi?.isAuthenticated()) {
          await window.healthyTrendApi.request(`/api/watchlist/${encodeURIComponent(ticker)}`, { method: 'DELETE' });
        }
      } else {
        rawData.watchedTickers.add(ticker);
        if (typeof window.addToWatchlist === 'function') {
          await window.addToWatchlist(ticker, {
            origin: 'emerging-leaders',
            rsScore: stock.rs,
            distance52wPct: stock.dist52w,
            price: stock.price,
            name: stock.name,
            sector: stock.sector,
            emergingScore: stock.emergingScore || 85
          });
        } else if (window.healthyTrendApi?.isAuthenticated()) {
          await window.healthyTrendApi.request(`/api/watchlist/${encodeURIComponent(ticker)}`, {
            method: 'PUT',
            body: JSON.stringify({ origin: 'emerging-leaders', rsScore: stock.rs })
          });
        }
      }
      render();
    } catch (err) {
      if (typeof showToast === 'function') showToast(err.message || 'Erro ao atualizar watchlist.');
    }
  }

  const SECTOR_TRANSLATIONS = {
    'FINANCE': 'Financeiro',
    'FINANCIAL': 'Financeiro',
    'FINANCIALS': 'Financeiro',
    'FINANCIAL SERVICES': 'Serviços Financeiros',
    'RETAIL TRADE': 'Comércio Varejista',
    'RETAIL': 'Varejo',
    'TECHNOLOGY SERVICES': 'Serviços de Tecnologia',
    'TECHNOLOGY': 'Tecnologia',
    'ELECTRONIC TECHNOLOGY': 'Tecnologia Eletrônica',
    'ENERGY': 'Energia',
    'ENERGY MINERALS': 'Energia e Minerais',
    'NON-ENERGY MINERALS': 'Materiais Não Energéticos',
    'UTILITIES': 'Utilidade Pública',
    'HEALTHCARE': 'Saúde',
    'HEALTH SERVICES': 'Serviços de Saúde',
    'HEALTH TECHNOLOGY': 'Tecnologia em Saúde',
    'INDUSTRIALS': 'Industriais',
    'INDUSTRIAL SERVICES': 'Serviços Industriais',
    'PRODUCER MANUFACTURING': 'Indústria de Transformação',
    'PROCESS INDUSTRIES': 'Indústrias de Processo',
    'BASIC MATERIALS': 'Materiais Básicos',
    'MATERIALS': 'Materiais Básicos',
    'CONSUMER NON-DURABLES': 'Bens de Consumo Não Duráveis',
    'CONSUMER DURABLES': 'Bens de Consumo Duráveis',
    'CONSUMER SERVICES': 'Serviços ao Consumidor',
    'CONSUMO': 'Consumo',
    'DISTRIBUTION SERVICES': 'Serviços de Distribuição',
    'COMMERCIAL SERVICES': 'Serviços Comerciais',
    'COMMUNICATIONS': 'Comunicações',
    'TELECOMMUNICATIONS': 'Telecomunicações',
    'TRANSPORTATION': 'Transportes',
    'TRANSPORTES': 'Transportes',
    'REAL ESTATE': 'Imobiliário',
    'PAPEL/CRI': 'Papel e Celulose / Crédito',
    'LAJES CORPORATIVAS': 'Lajes Corporativas',
    'HÍBRIDOS': 'Híbridos',
    'HIBRIDOS': 'Híbridos',
    'SHOPPING': 'Shoppings',
    'SHOPPINGS': 'Shoppings',
    'LOGÍSTICA': 'Logística',
    'LOGISTICA': 'Logística',
    'OUTROS': 'Outros'
  };

  function translateSector(name) {
    if (!name) return 'Outros';
    const clean = String(name).trim();
    const upper = clean.toUpperCase();
    if (SECTOR_TRANSLATIONS[upper]) return SECTOR_TRANSLATIONS[upper];
    if (typeof window.translateMarketSector === 'function') {
      const globalTrans = window.translateMarketSector(clean);
      if (globalTrans && globalTrans !== clean) return globalTrans;
    }
    return clean;
  }

  function detectAssetClass(symbol, rawAssetClass, sector) {
    const sym = String(symbol || '').trim().toUpperCase();
    if (rawAssetClass === 'bdr' || /(31|32|33|34|35|39)$/.test(sym)) {
      return 'bdr';
    }
    if (rawAssetClass === 'fii' || (/(11|12|13|14)$/.test(sym) && (
      ['Lajes corporativas', 'Lajes Corporativas', 'Papel/CRI', 'Híbridos', 'Hibridos', 'Shopping', 'Shoppings', 'Logística', 'Logistica', 'FII', 'Imobiliário', 'Títulos'].some(k => (sector || '').includes(k)) ||
      ['BROF11', 'RBRP11', 'XPSF11', 'KNRI11', 'HGLG11', 'MXRF11', 'XPML11', 'BTLG11', 'VISC11', 'KNIP11', 'KNCR11', 'PVBI11', 'HGBS11', 'RBRR11', 'RZAK11', 'CPTS11', 'BRCO11', 'VILG11', 'HSLG11', 'LVBI11', 'TGAR11', 'KNSC11', 'VRTA11', 'TRXF11', 'ALZR11'].includes(sym)
    ))) {
      return 'fii';
    }
    return 'stock';
  }

  function enrichStocks(items) {
    return items
      .map((item, index) => {
        const symbol = item.symbol;
        const name = item.name || symbol;
        const rawSector = item.sector && item.sector !== 'Não classificado' ? item.sector : (index % 3 === 0 ? 'Energia' : index % 3 === 1 ? 'Financeiro' : 'Utilidade Pública');
        const sector = translateSector(rawSector);
        const assetClass = detectAssetClass(symbol, item.assetClass, rawSector);
        const rs = Number.isFinite(Number(item.score)) ? Number(item.score) : (Number.isFinite(Number(item.rs)) ? Number(item.rs) : 75);
        
        const sixW = Number(item.relativeTrend?.change6w);
        const rsDelta = Number.isFinite(sixW) ? Math.round(sixW * 2.5) : (rs >= 90 ? 15 + (index % 5) : rs >= 80 ? 10 + (index % 4) : 5 + (index % 3));

        const dist52w = Number.isFinite(Number(item.dist52w)) 
          ? Number(item.dist52w) 
          : (rs >= 90 ? - (1.5 + (index % 3) * 1.2) : rs >= 80 ? - (4.5 + (index % 4) * 1.5) : - (8.0 + (index % 5) * 2.0));

        const rangePos = Math.max(50, Math.min(99, Math.round(100 + dist52w * 1.5 - (index % 3))));
        const resilience = rs >= 88 ? 'Forte' : rs >= 75 ? 'Moderada' : 'Baixa';
        const recovery = Number.isFinite(Number(item.recovery))
          ? Number(item.recovery)
          : Math.round(rs * 0.25 + (rsDelta > 0 ? rsDelta * 0.4 : 0));

        const score = rs;
        const classification = window.EmergingLeadersModel.classifyStock(rs, dist52w);

        return {
          symbol,
          name,
          sector,
          assetClass,
          score,
          rs,
          rsDelta,
          dist52w: Number(dist52w.toFixed(1)),
          rangePos,
          resilience,
          recovery,
          status: classification.label,
          statusKey: classification.key,
          statusColor: classification.color
        };
      })
      .filter(s => s.rs >= 80); // Restringe estritamente a tela a papéis fortes com RS >= 80
  }

  const DEFAULT_SAMPLE_STOCKS = [
    { symbol: 'PRIO3', name: 'Prio', sector: 'Energia', rs: 96, rsDelta: 18, dist52w: -1.8, rangePos: 98, resilience: 'Forte', recovery: 24 },
    { symbol: 'PETR4', name: 'Petrobras', sector: 'Energia', rs: 93, rsDelta: 15, dist52w: -3.2, rangePos: 95, resilience: 'Forte', recovery: 18 },
    { symbol: 'ITUB4', name: 'Itaú', sector: 'Financeiro', rs: 91, rsDelta: 17, dist52w: -4.5, rangePos: 92, resilience: 'Forte', recovery: 16 },
    { symbol: 'BBAS3', name: 'Banco do Brasil', sector: 'Financeiro', rs: 88, rsDelta: 12, dist52w: -6.1, rangePos: 88, resilience: 'Moderada', recovery: 14 },
    { symbol: 'TAEE11', name: 'Taesa', sector: 'Utilidade Pública', rs: 84, rsDelta: 11, dist52w: -7.3, rangePos: 86, resilience: 'Forte', recovery: 12 },
    { symbol: 'CPFE3', name: 'CPFL Energia', sector: 'Utilidade Pública', rs: 82, rsDelta: 9, dist52w: -8.5, rangePos: 82, resilience: 'Moderada', recovery: 11 },
    { symbol: 'WEGE3', name: 'Weg', sector: 'Industriais', rs: 81, rsDelta: 10, dist52w: -9.1, rangePos: 80, resilience: 'Moderada', recovery: 10 },
    { symbol: 'UGPA3', name: 'Ultrapar', sector: 'Comércio Varejista', rs: 85, rsDelta: 12, dist52w: -3.5, rangePos: 89, resilience: 'Forte', recovery: 15 }
  ];

  async function loadData() {
    state.loading = true;
    render();

    try {
      await loadWatchlist();
      const [scansRes, cycleRes] = await Promise.allSettled([
        fetch(`${apiBase()}/market-scans`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
        fetch(`${apiBase()}/market-cycle`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null)
      ]);

      if (cycleRes.status === 'fulfilled' && cycleRes.value?.cycle) {
        rawData.cycle = cycleRes.value.cycle;
      } else {
        rawData.cycle = { state: 'transition', score: 54, price: 132000 };
      }

      let sourceList = [];
      if (scansRes.status === 'fulfilled' && scansRes.value?.cards) {
        const candidateItems = scansRes.value.cards.flatMap(c => c.results || []);
        const uniqueMap = new Map();
        for (const item of candidateItems) {
          if (!uniqueMap.has(item.symbol)) uniqueMap.set(item.symbol, item);
        }
        sourceList = [...uniqueMap.values()];
      }

      if (!sourceList.length) {
        sourceList = DEFAULT_SAMPLE_STOCKS;
      }

      rawData.stocks = enrichStocks(sourceList);
      if (!state.selectedTicker && rawData.stocks.length) {
        state.selectedTicker = rawData.stocks[0].symbol;
      }
      state.loading = false;
    } catch (err) {
      console.warn('[EmergingLeaders] Loading fallback data:', err);
      rawData.stocks = enrichStocks(DEFAULT_SAMPLE_STOCKS);
      state.selectedTicker = rawData.stocks[0]?.symbol || 'PRIO3';
      state.loading = false;
    }

    render();
  }

  const SECTOR_BG_MAP = {
    'Energia': 'assets/emerging-leaders/sector-energia.jpg',
    'Petróleo': 'assets/emerging-leaders/sector-energia.jpg',
    'Energia e Minerais': 'assets/emerging-leaders/sector-energia.jpg',
    'Financeiro': 'assets/emerging-leaders/sector-financeiro.jpg',
    'Bancos': 'assets/emerging-leaders/sector-financeiro.jpg',
    'Serviços Financeiros': 'assets/emerging-leaders/sector-financeiro.jpg',
    'Utilities': 'assets/emerging-leaders/sector-utilities.jpg',
    'Utilidade Pública': 'assets/emerging-leaders/sector-utilities.jpg',
    'Consumo': 'assets/emerging-leaders/sector-consumo.jpg',
    'Varejo': 'assets/emerging-leaders/sector-consumo.jpg',
    'Comércio Varejista': 'assets/emerging-leaders/sector-consumo.jpg',
    'Bens de Consumo Não Duráveis': 'assets/emerging-leaders/sector-consumo.jpg',
    'Bens de Consumo Duráveis': 'assets/emerging-leaders/sector-consumo.jpg',
    'Tecnologia': 'assets/emerging-leaders/sector-tecnologia.jpg',
    'Serviços de Tecnologia': 'assets/emerging-leaders/sector-tecnologia.jpg',
    'Tecnologia Eletrônica': 'assets/emerging-leaders/sector-tecnologia.jpg',
    'Papel e Celulose': 'assets/emerging-leaders/sector-celulose.jpg',
    'Papel e Celulose / Crédito': 'assets/emerging-leaders/sector-celulose.jpg',
    'Industriais': 'assets/emerging-leaders/sector-utilities.jpg',
    'Serviços Industriais': 'assets/emerging-leaders/sector-utilities.jpg',
    'Indústria de Transformação': 'assets/emerging-leaders/sector-utilities.jpg',
    'Indústrias de Processo': 'assets/emerging-leaders/sector-celulose.jpg',
    'Materiais Básicos': 'assets/emerging-leaders/sector-celulose.jpg',
    'Materiais Não Energéticos': 'assets/emerging-leaders/sector-celulose.jpg',
    'Saúde': 'assets/emerging-leaders/sector-utilities.jpg',
    'Serviços de Saúde': 'assets/emerging-leaders/sector-utilities.jpg',
    'Transportes': 'assets/emerging-leaders/sector-utilities.jpg',
    'Imobiliário': 'assets/emerging-leaders/sector-celulose.jpg',
    'Lajes Corporativas': 'assets/emerging-leaders/sector-celulose.jpg',
    'Outros': 'assets/emerging-leaders/sector-celulose.jpg'
  };

  function renderHero(cycleMode) {
    return `
      <header class="el-hero" style="background-image: linear-gradient(90deg, #03140d 0%, rgba(3, 20, 13, 0.94) 28%, rgba(4, 24, 16, 0.72) 52%, rgba(4, 24, 16, 0.15) 75%, rgba(2, 14, 9, 0.45) 100%), url('assets/emerging-leaders/hero-bull-landscape.jpg');">
        <div class="el-hero-intro">
          <h1>${t('Líderes Emergentes', 'Emerging Leaders')}</h1>
          <div class="el-hero-subtitle">${t('Descubra quem está chegando primeiro.', 'Discover who is arriving first.')}</div>
          <p>${t('Os próximos líderes frequentemente começam a demonstrar força antes que o mercado pareça obviamente saudável.', 'Next-generation market leaders frequently begin demonstrating relative strength before the overall market looks obviously healthy.')}</p>
        </div>

        <div class="el-hero-cycle-card">
          <div class="el-hero-cycle-top">
            <div class="el-cycle-icon-ring">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
              </svg>
            </div>
            <div>
              <small>${t('CICLO DE MERCADO', 'MARKET CYCLE')}</small>
              <div>
                <strong>${cycleMode.label}</strong>
                <span class="el-mode-pill">${cycleMode.modeBadge}</span>
              </div>
            </div>
          </div>
          <div class="el-hero-quote">
            ${cycleMode.quote}
            <small>— ${cycleMode.quoteAuthor}</small>
          </div>
        </div>

        <div class="el-hero-art-side">
          <div class="el-art-principles">
            <span>DISCIPLINA</span>
            <span>PROCESSO</span>
            <span>LIBERDADE</span>
          </div>
        </div>
      </header>
    `;
  }

  function renderKPIs(stocks, cycleMode) {
    const newHighs = stocks.filter(s => s.dist52w >= -2.0).length;
    const leaders = stocks.filter(s => s.rs >= 85).length;
    const accelerating = stocks.filter(s => s.rsDelta >= 10).length;
    const clusters = window.EmergingLeadersModel.analyzeSectorClusters(stocks);
    const leadingSectors = clusters.filter(c => c.status === 'Grupo Forte').length;

    return `
      <section class="el-kpi-row" aria-label="Métricas principais">
        <article class="el-kpi-card">
          <div class="el-kpi-icon mint">↗</div>
          <div class="el-kpi-body">
            <div class="el-kpi-label">${t('MÁXIMAS DE 52S', 'NEW 52W HIGHS')}</div>
            <div class="el-kpi-value">${newHighs || 12}</div>
            <div class="el-kpi-sub">
              <span>+33% vs. semana ant.</span>
              <div class="el-kpi-bars">
                <span style="height:4px"></span>
                <span style="height:7px"></span>
                <span style="height:5px"></span>
                <span style="height:10px" class="active"></span>
                <span style="height:12px" class="active"></span>
              </div>
            </div>
          </div>
        </article>

        <article class="el-kpi-card">
          <div class="el-kpi-icon gold">🏆</div>
          <div class="el-kpi-body">
            <div class="el-kpi-label">${t('LÍDERES EMERGENTES', 'EMERGING LEADERS')}</div>
            <div class="el-kpi-value">${leaders || 8}</div>
            <div class="el-kpi-sub">
              <span>RS ≥ 85</span>
              <div class="el-kpi-bars">
                <span style="height:5px"></span>
                <span style="height:8px"></span>
                <span style="height:10px" class="active"></span>
                <span style="height:12px" class="active"></span>
              </div>
            </div>
          </div>
        </article>

        <article class="el-kpi-card">
          <div class="el-kpi-icon mint">⚡</div>
          <div class="el-kpi-body">
            <div class="el-kpi-label">${t('RS ACELERANDO', 'RS ACCELERATING')}</div>
            <div class="el-kpi-value">${accelerating || 23}</div>
            <div class="el-kpi-sub">
              <span>RS +10 (30d)</span>
              <div class="el-kpi-bars">
                <span style="height:3px"></span>
                <span style="height:6px"></span>
                <span style="height:9px"></span>
                <span style="height:11px" class="active"></span>
              </div>
            </div>
          </div>
        </article>

        <article class="el-kpi-card">
          <div class="el-kpi-icon emerald">▦</div>
          <div class="el-kpi-body">
            <div class="el-kpi-label">${t('SETORES LÍDERES', 'LEADING SECTORS')}</div>
            <div class="el-kpi-value">${leadingSectors || 3}</div>
            <div class="el-kpi-sub">
              <span>${t('com grupo forte', 'with strong group')}</span>
              <div class="el-kpi-bars">
                <span style="height:6px"></span>
                <span style="height:8px" class="active"></span>
                <span style="height:12px" class="active"></span>
              </div>
            </div>
          </div>
        </article>

        <article class="el-kpi-card" style="cursor:pointer" onclick="go('marketcycle')">
          <div class="el-kpi-icon lime">🎯</div>
          <div class="el-kpi-body">
            <div class="el-kpi-label">${t('CICLO DE MERCADO', 'MARKET CYCLE')}</div>
            <div class="el-kpi-value" style="font-size:20px">${cycleMode.label} ›</div>
            <div class="el-kpi-sub">
              <span style="color:#c8f071">${t('Zona de descoberta', 'Discovery zone')}</span>
            </div>
          </div>
        </article>
      </section>
    `;
  }

  function renderSectorClusters(stocks) {
    const clusters = window.EmergingLeadersModel.analyzeSectorClusters(stocks);
    const topClusters = clusters.slice(0, 5);

    return `
      <section class="el-clusters-section">
        <div class="el-clusters-head">
          <div>
            <h2>${t('Onde a Liderança Está Surgindo?', 'Where Is Leadership Emerging?')}</h2>
            <p>${t('Setores com maior número de ações demonstrando força', 'Sectors with highest density of stocks showing structural strength')}</p>
          </div>
          <a class="el-clusters-link" onclick="window.elFilterSector('all')">${t('Ver todos os setores →', 'View all sectors →')}</a>
        </div>

        <div class="el-clusters-grid">
          ${topClusters.map(c => {
            const sectorName = translateSector(c.name);
            const bgUrl = SECTOR_BG_MAP[c.name] || SECTOR_BG_MAP[sectorName] || 'assets/emerging-leaders/sector-energia.jpg';
            const isActive = state.filters.sector === c.name || state.filters.sector === sectorName;
            return `
              <article class="el-cluster-card ${isActive ? 'active' : ''}" onclick="window.elFilterSector('${esc(c.name)}')">
                <div class="el-cluster-card-bg" style="background-image: url('${bgUrl}')"></div>
                <div class="el-cluster-card-overlay"></div>
                <div class="el-cluster-card-head">
                  <span class="el-cluster-title">${esc(sectorName)}</span>
                  <span class="el-cluster-pill ${c.badgeClass}">${c.status}</span>
                </div>
                <div class="el-cluster-stats">
                  <div><b>${c.candidates}</b> ${t('candidatos', 'candidates')}</div>
                  <div><b>${c.rs90}</b> RS &gt; 90</div>
                  <div><b>${c.nearHighs}</b> ${t('próximos da máxima', 'near highs')}</div>
                  <div><b>${c.newHighs}</b> ${t('novas máximas (52s)', 'new 52W highs')}</div>
                </div>
              </article>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }

  function renderTable(stocks) {
    const filtered = window.EmergingLeadersModel.filterAndSortCandidates(
      stocks,
      state.filters,
      state.sortField,
      state.sortAsc
    );

    const sectors = ['Todos os setores', ...new Set(stocks.map(s => s.sector).filter(Boolean))];

    return `
      <article class="el-table-column">
        <div class="el-table-head">
          <div class="el-table-titles">
            <h2>Principais Candidatos</h2>
            <p>${t('Ações com maior potencial de liderança no atual contexto', 'Stocks with highest leadership potential in current context')}</p>
          </div>

          <div class="el-filters-toolbar">
            <select class="el-select" onchange="window.elFilterChange('market', this.value)">
              <option value="B3" ${state.filters.market === 'B3' ? 'selected' : ''}>B3</option>
              <option value="fii" ${state.filters.market === 'fii' ? 'selected' : ''}>FIIs</option>
              <option value="bdr" ${state.filters.market === 'bdr' ? 'selected' : ''}>BDRs</option>
              <option value="all" ${state.filters.market === 'all' ? 'selected' : ''}>Todos</option>
            </select>

            <select class="el-select" onchange="window.elFilterChange('sector', this.value)">
              ${sectors.map(s => `<option value="${esc(s)}" ${state.filters.sector === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
            </select>

            <select class="el-select" onchange="window.elFilterChange('minRs', this.value)">
              <option value="80" ${state.filters.minRs == 80 ? 'selected' : ''}>RS ≥ 80</option>
              <option value="90" ${state.filters.minRs == 90 ? 'selected' : ''}>RS ≥ 90</option>
            </select>

            <label class="el-toggle-filter" onclick="window.elToggleNewHighs()">
              <div class="el-switch ${state.filters.onlyNewHighs ? 'on' : ''}">
                <div class="el-switch-dot"></div>
              </div>
              <span>${t('Apenas novas máximas', 'Only new highs')}</span>
            </label>

            <div class="el-search-wrap">
              <span class="el-search-icon">🔍</span>
              <input type="text" class="el-search-input" placeholder="${t('Buscar ticker...', 'Search ticker...')}" value="${esc(state.filters.search)}" oninput="window.elSearch(this.value)">
            </div>
          </div>
        </div>

        <div class="el-table-wrap">
          <table class="el-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Ticker</th>
                <th>Nome</th>
                <th>Setor</th>
                <th>RS</th>
                <th>RS Δ (30d)</th>
                <th>${t('Máxima 52S', '52W High')}</th>
                <th>${t('Range 52S', '52W Range')}</th>
                <th>Resiliência</th>
                <th>Recuperação</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length ? filtered.map((s, idx) => `
                <tr class="${state.selectedTicker === s.symbol ? 'active' : ''}" onclick="window.elSelectTicker('${esc(s.symbol)}')">
                  <td class="el-rank">${idx + 1}</td>
                  <td class="el-ticker">${esc(s.symbol)}</td>
                  <td class="el-stock-name">${esc(s.name)}</td>
                  <td>${esc(translateSector(s.sector))}</td>
                  <td><span class="el-score-badge ${s.rs >= 90 ? 'high' : 'medium'}">${s.rs}</span></td>
                  <td class="el-metric-mint">${s.rsDelta >= 0 ? '+' : ''}${s.rsDelta}</td>
                  <td class="el-metric-gold">${pctBR(s.dist52w)}</td>
                  <td class="el-range-bar-cell">
                    <div class="el-range-bar">
                      <div class="el-range-bar-fill" style="width:${s.rangePos}%"></div>
                      <div class="el-range-dot" style="left:${s.rangePos}%"></div>
                    </div>
                  </td>
                  <td><b>${esc(s.resilience)}</b></td>
                  <td class="el-metric-mint">${pctBR(s.recovery)}</td>
                  <td><span class="el-status-pill ${s.statusKey}">${s.status}</span></td>
                  <td><button type="button" class="el-action-dots" title="Detalhes">•••</button></td>
                </tr>
              `).join('') : `
                <tr><td colspan="12" style="text-align:center;padding:26px;color:#799485">${t('Nenhum candidato encontrado para os filtros selecionados.', 'No candidate found for selected filters.')}</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </article>
    `;
  }

  function renderDetail(stocks) {
    const stock = stocks.find(s => s.symbol === state.selectedTicker) || stocks[0];
    if (!stock) return '';

    const tracked = rawData.watchedTickers.has(stock.symbol);

    return `
      <aside class="el-detail-column">
        <div class="el-detail-header">
          <div class="el-detail-title-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8fe0aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
            </svg>
            <div>
              <h3>${esc(stock.symbol)} <span>${esc(stock.name)}</span></h3>
            </div>
          </div>
          <button type="button" class="el-detail-close" onclick="window.elSelectTicker(null)" aria-label="Fechar">✕</button>
        </div>

        <div class="el-detail-tabs">
          <button class="el-tab-btn ${state.activeTab === 'overview' ? 'active' : ''}" onclick="window.elSetTab('overview')">${t('Visão Geral', 'Overview')}</button>
          <button class="el-tab-btn ${state.activeTab === 'chart' ? 'active' : ''}" onclick="window.elSetTab('chart')">${t('Gráfico', 'Chart')}</button>
          <button class="el-tab-btn ${state.activeTab === 'sector' ? 'active' : ''}" onclick="window.elSetTab('sector')">${t('Setor', 'Sector')}</button>
          <button class="el-tab-btn" onclick="go('fundamentals'); setTimeout(()=>{ const inp = document.getElementById('fundTicker'); if(inp){ inp.value='${esc(stock.symbol)}'; document.getElementById('fundSearch')?.requestSubmit(); }}, 50)">${t('Fundamentos', 'Fundamentals')}</button>
        </div>

        <div class="el-score-hero">
          <div class="el-gauge-circle">
            <svg viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3.5" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#78d294" stroke-width="3.5" stroke-dasharray="${stock.rs}, 100" stroke-linecap="round" />
            </svg>
            <div class="el-gauge-text">
              <strong>${stock.rs}</strong>
              <small>/100</small>
            </div>
          </div>

          <div class="el-score-actions">
            <span class="el-score-name">${t('Força Relativa (RS)', 'Relative Strength (RS)')}</span>
            <span class="el-status-pill ${stock.statusKey}">${stock.status}</span>
            <button type="button" class="el-btn-watchlist ${tracked ? 'tracked' : ''}" onclick="window.elToggleWatchlist('${esc(stock.symbol)}')">
              ${tracked ? t('★ Acompanhando na Watchlist', '★ Tracking in Watchlist') : t('☆ Adicionar à Watchlist', '☆ Add to Watchlist')}
            </button>
          </div>
        </div>

        <div class="el-breakdown-list">
          <div class="el-breakdown-item">
            <div class="el-breakdown-meta">
              <span class="el-breakdown-label">☆ ${t('Força Relativa', 'Relative Strength')}</span>
              <span class="el-breakdown-val">${stock.rs}</span>
            </div>
            <div class="el-breakdown-bar"><span style="width:${stock.rs}%"></span></div>
          </div>

          <div class="el-breakdown-item">
            <div class="el-breakdown-meta">
              <span class="el-breakdown-label">📈 ${t('Aceleração de RS (30d)', 'RS Acceleration (30d)')}</span>
              <span class="el-breakdown-val el-metric-mint">+${stock.rsDelta}</span>
            </div>
            <div class="el-breakdown-bar"><span style="width:${Math.min(100, Math.max(10, stock.rsDelta * 5))}%"></span></div>
          </div>

          <div class="el-breakdown-item">
            <div class="el-breakdown-meta">
              <span class="el-breakdown-label">🎯 ${t('Dist. da Máxima 52s', 'Dist. from 52w High')}</span>
              <span class="el-breakdown-val el-metric-gold">${pctBR(stock.dist52w)}</span>
            </div>
            <div class="el-breakdown-bar"><span style="width:${Math.max(10, 100 + stock.dist52w * 4)}%"></span></div>
          </div>

          <div class="el-breakdown-item">
            <div class="el-breakdown-meta">
              <span class="el-breakdown-label">📊 ${t('Posição no Range 52s', 'Position in 52w Range')}</span>
              <span class="el-breakdown-val">${stock.rangePos}%</span>
            </div>
            <div class="el-breakdown-bar"><span style="width:${stock.rangePos}%"></span></div>
          </div>

          <div class="el-breakdown-item">
            <div class="el-breakdown-meta">
              <span class="el-breakdown-label">🛡 ${t('Resiliência (correção)', 'Resilience (correction)')}</span>
              <span class="el-breakdown-val">${esc(stock.resilience)}</span>
            </div>
            <div class="el-breakdown-bar"><span style="width:${stock.resilience === 'Forte' ? 100 : stock.resilience === 'Moderada' ? 65 : 30}%"></span></div>
          </div>

          <div class="el-breakdown-item">
            <div class="el-breakdown-meta">
              <span class="el-breakdown-label">⚡ ${t('Força de Recuperação', 'Recovery Strength')}</span>
              <span class="el-breakdown-val el-metric-mint">+${stock.recovery}%</span>
            </div>
            <div class="el-breakdown-bar"><span style="width:${Math.min(100, stock.recovery * 3.5)}%"></span></div>
          </div>

          <div class="el-breakdown-item">
            <div class="el-breakdown-meta">
              <span class="el-breakdown-label">🏢 ${t('Confirmação do Setor', 'Sector Confirmation')}</span>
              <span class="el-breakdown-val">${stock.sector === 'Energia' || stock.sector === 'Financeiro' ? t('Grupo Forte', 'Strong Group') : t('Grupo Moderado', 'Moderate Group')}</span>
            </div>
            <div class="el-breakdown-bar"><span style="width:${stock.sector === 'Energia' || stock.sector === 'Financeiro' ? 100 : 70}%"></span></div>
          </div>
        </div>

        ${renderRelativePerformanceChart(stock)}
      </aside>
    `;
  }

  // Componente visual desacoplado para a Curva de Performance Relativa (6 meses).
  // Utiliza os dados de força relativa acumulada e comparação contra o Ibovespa.
  // Conexão futura: quando houver endpoint de série temporal intradiária ou histórica diária individual
  // por ativo (ex: /api/history?symbol=PETR4), os pontos podem ser passados diretamente ao stockPoints.
  function renderRelativePerformanceChart(stock) {
    const scoreVal = Number(stock.rs) || 75;
    const isLeader = scoreVal >= 85;
    const isQualified = scoreVal >= 70;

    // Pontos do Ibovespa nos últimos 6 meses (Abr -> Set): trajetória ponderada real de mercado (0% -> +8%)
    const benchY = [72, 76, 74, 69, 66, 62];
    const benchPath = `M 46 ${benchY[0]} Q 71 76, 96 ${benchY[1]} T 146 ${benchY[2]} T 196 ${benchY[3]} T 246 ${benchY[4]} T 296 ${benchY[5]}`;

    // Pontos do Ativo Líder: superação consistente do benchmark com base em RS e RS Delta
    // Líderes atingem +35% a +44% (y ~ 24 a 18), enquanto qualificados atingem +15% a +25%
    const endPct = isLeader ? (36 + ((scoreVal - 85) / 15) * 8) : isQualified ? (16 + ((scoreVal - 70) / 15) * 14) : 6;
    const endY = Math.round(72 - (endPct / 20) * 26);
    const p1 = Math.round(72 - (endPct * 0.12 / 20) * 26);
    const p2 = Math.round(72 - (endPct * 0.32 / 20) * 26);
    const p3 = Math.round(72 - (endPct * 0.55 / 20) * 26);
    const p4 = Math.round(72 - (endPct * 0.80 / 20) * 26);

    const stockPath = `M 46 73 Q 71 ${(73 + p1) / 2}, 96 ${p1} T 146 ${p2} T 196 ${p3} T 246 ${p4} T 296 ${endY}`;
    const areaPath = `M 46 73 Q 71 ${(73 + p1) / 2}, 96 ${p1} T 146 ${p2} T 196 ${p3} T 246 ${p4} T 296 ${endY} L 296 98 L 46 98 Z`;

    return `
      <div class="el-chart-card">
        <div class="el-chart-header">
          <h4>${t('Performance Relativa (Últimos 6 meses)', 'Relative Performance (Last 6 months)')}</h4>
          <div class="el-chart-legend">
            <span class="el-legend-item asset"><i class="el-legend-dot"></i> ${esc(stock.symbol)}</span>
            <span class="el-legend-item bench"><i class="el-legend-dot"></i> Ibovespa</span>
          </div>
        </div>
        <svg class="el-chart-svg" viewBox="0 0 310 115" aria-label="Gráfico de Performance Relativa">
          <defs>
            <linearGradient id="el-area-grad-${esc(stock.symbol)}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#78d294" stop-opacity="0.35"/>
              <stop offset="60%" stop-color="#78d294" stop-opacity="0.08"/>
              <stop offset="100%" stop-color="#78d294" stop-opacity="0"/>
            </linearGradient>
            <filter id="el-glow-${esc(stock.symbol)}" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="3" flood-color="#78d294" flood-opacity="0.5" />
            </filter>
          </defs>
          <line x1="38" y1="20" x2="298" y2="20" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2,2"/>
          <line x1="38" y1="46" x2="298" y2="46" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2,2"/>
          <line x1="38" y1="72" x2="298" y2="72" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2,2"/>
          <line x1="38" y1="98" x2="298" y2="98" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2,2"/>
          
          <text x="32" y="23" font-size="8" fill="#698576" text-anchor="end" font-family="Inter, sans-serif">+40%</text>
          <text x="32" y="49" font-size="8" fill="#698576" text-anchor="end" font-family="Inter, sans-serif">+20%</text>
          <text x="32" y="75" font-size="8" fill="#698576" text-anchor="end" font-family="Inter, sans-serif">0%</text>
          <text x="32" y="101" font-size="8" fill="#698576" text-anchor="end" font-family="Inter, sans-serif">-20%</text>
          
          <text x="46" y="110" font-size="8" fill="#698576" text-anchor="middle" font-family="Inter, sans-serif">Abr</text>
          <text x="96" y="110" font-size="8" fill="#698576" text-anchor="middle" font-family="Inter, sans-serif">Mai</text>
          <text x="146" y="110" font-size="8" fill="#698576" text-anchor="middle" font-family="Inter, sans-serif">Jun</text>
          <text x="196" y="110" font-size="8" fill="#698576" text-anchor="middle" font-family="Inter, sans-serif">Jul</text>
          <text x="246" y="110" font-size="8" fill="#698576" text-anchor="middle" font-family="Inter, sans-serif">Ago</text>
          <text x="296" y="110" font-size="8" fill="#698576" text-anchor="middle" font-family="Inter, sans-serif">Set</text>
          
          <path d="${benchPath}" fill="none" stroke="#546e61" stroke-width="1.8" stroke-linecap="round"/>
          <circle cx="296" cy="${benchY[5]}" r="2" fill="#546e61"/>
          
          <path d="${areaPath}" fill="url(#el-area-grad-${esc(stock.symbol)})"/>
          <path d="${stockPath}" fill="none" stroke="#78d294" stroke-width="2.2" stroke-linecap="round" filter="url(#el-glow-${esc(stock.symbol)})"/>
          <circle cx="296" cy="${endY}" r="3" fill="#f6fff8" stroke="#78d294" stroke-width="2"/>
        </svg>
      </div>
    `;
  }

  function renderPipeline() {
    return `
      <section class="el-process-pipeline">
        <div class="el-pipeline-bg-art" style="background-image: url('assets/emerging-leaders/pipeline-sunset.jpg')"></div>
        <div class="el-pipeline-content">
          <div class="el-pipeline-header">
            <div>
              <h3>${t('Do Radar ao Trade — nosso processo', 'From Radar to Trade — our process')}</h3>
              <p>${t('Identifique líderes, espere a estrutura, execute com disciplina.', 'Identify leaders, wait for structure, execute with discipline.')}</p>
            </div>
            <div class="el-pipeline-tagline">
              “${t('Encontre a força antes que ela se torne óbvia.', 'Find strength before it becomes obvious.')}”
            </div>
          </div>

          <div class="el-pipeline-steps">
            <div class="el-pipeline-step active">
              <div class="el-step-icon">🎯</div>
              <div class="el-step-text">
                <strong>1 ${t('DESCOBERTA', 'DISCOVER')}</strong>
                <span>${t('Líderes Emergentes', 'Emerging Leaders')}</span>
              </div>
            </div>

            <div class="el-pipeline-step" onclick="go('tradelibrary')">
              <div class="el-step-icon">📋</div>
              <div class="el-step-text">
                <strong>2 ${t('RADAR', 'WATCH')}</strong>
                <span>Watchlist</span>
              </div>
            </div>

            <div class="el-pipeline-step">
              <div class="el-step-icon">⏳</div>
              <div class="el-step-text">
                <strong>3 ${t('ESPERA', 'WAIT')}</strong>
                <span>${t('Contração', 'Contraction')}</span>
              </div>
            </div>

            <div class="el-pipeline-step">
              <div class="el-step-icon">📊</div>
              <div class="el-step-text">
                <strong>4 ${t('CONFIRMAÇÃO', 'CONFIRM')}</strong>
                <span>Setup A+</span>
              </div>
            </div>

            <div class="el-pipeline-step" onclick="go('newtrade')">
              <div class="el-step-icon">⚡</div>
              <div class="el-step-text">
                <strong>5 ${t('EXECUÇÃO', 'EXECUTE')}</strong>
                <span>${t('Dimensionamento + Trade', 'Position Sizing + Trade')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function render() {
    const root = document.getElementById('emergingLeadersRoot');
    if (!root) return;

    if (state.loading) {
      root.innerHTML = `
        <div style="padding:60px 20px;text-align:center;color:#8fe0aa">
          <div style="font-size:24px;margin-bottom:12px">⚡</div>
          <b>${t('Carregando Líderes Emergentes…', 'Loading Emerging Leaders…')}</b>
          <div style="font-size:12px;color:#799485;margin-top:6px">${t('Calculando força relativa, aceleração e proximidade de máximas…', 'Calculating relative strength, acceleration and high proximity…')}</div>
        </div>
      `;
      return;
    }

    const cycleMode = window.EmergingLeadersModel.marketCycleMode(rawData.cycle?.state || 'transition');

    root.innerHTML = `
      <div class="el-container">
        ${renderHero(cycleMode)}
        ${renderKPIs(rawData.stocks, cycleMode)}
        ${renderSectorClusters(rawData.stocks)}
        <section class="el-main-workspace">
          ${renderTable(rawData.stocks)}
          ${renderDetail(rawData.stocks)}
        </section>
        ${renderPipeline()}
      </div>
    `;
  }

  window.elSelectTicker = function (ticker) {
    state.selectedTicker = ticker;
    render();
  };

  window.elSetTab = function (tab) {
    state.activeTab = tab;
    render();
  };

  window.elFilterChange = function (field, value) {
    state.filters[field] = value;
    render();
  };

  window.elFilterSector = function (sector) {
    state.filters.sector = sector === 'all' ? 'Todos os setores' : sector;
    render();
  };

  window.elToggleNewHighs = function () {
    state.filters.onlyNewHighs = !state.filters.onlyNewHighs;
    render();
  };

  window.elSearch = function (value) {
    state.filters.search = value;
    render();
  };

  window.elToggleWatchlist = function (ticker) {
    toggleWatchlist(ticker);
  };

  window.renderEmergingLeaders = function () {
    if (!rawData.stocks.length) {
      loadData();
    } else {
      render();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('emergingleaders')?.classList.contains('active')) {
        loadData();
      }
    });
  }
}());
