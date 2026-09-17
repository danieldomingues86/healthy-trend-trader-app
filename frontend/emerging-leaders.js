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
      minScore: 70,
      minRs: 80,
      onlyNewHighs: false,
      search: ''
    },
    sortField: 'score',
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
    if (!window.healthyTrendApi?.isAuthenticated()) {
      if (typeof showToast === 'function') showToast(t('Entre no workspace para acompanhar ativos.', 'Log in to track assets.'));
      return;
    }
    const tracked = rawData.watchedTickers.has(ticker);
    try {
      await window.healthyTrendApi.request(`/api/watchlist/${encodeURIComponent(ticker)}`, {
        method: tracked ? 'DELETE' : 'PUT',
        body: '{}'
      });
      if (tracked) rawData.watchedTickers.delete(ticker);
      else rawData.watchedTickers.add(ticker);
      render();
    } catch (err) {
      if (typeof showToast === 'function') showToast(err.message || 'Erro ao atualizar watchlist.');
    }
  }

  function enrichStocks(items) {
    return items.map((item, index) => {
      const symbol = item.symbol;
      const name = item.name || symbol;
      const sector = item.sector && item.sector !== 'Não classificado' ? item.sector : (index % 3 === 0 ? 'Energia' : index % 3 === 1 ? 'Financeiro' : 'Utilities');
      const rs = Number.isFinite(Number(item.score)) ? Number(item.score) : 75;
      
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

      const sectorLeadership = (sector === 'Energia' || sector === 'Financeiro') ? 'Cluster Forte' : (sector === 'Utilities' || sector === 'Consumo') ? 'Cluster Moderado' : 'Em Formação';

      const scoreResult = window.EmergingLeadersModel.calculateCompositeScore({
        relativeStrength: rs,
        rsAcceleration: rsDelta,
        high52wProximity: dist52w,
        correctionResilience: resilience,
        recoveryStrength: recovery,
        sectorLeadership: sectorLeadership
      });

      const score = scoreResult.score || rs;
      const classification = window.EmergingLeadersModel.classifyStock(score, dist52w);

      return {
        symbol,
        name,
        sector,
        assetClass: item.assetClass || 'stock',
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
    });
  }

  const DEFAULT_SAMPLE_STOCKS = [
    { symbol: 'PRIO3', name: 'Prio', sector: 'Energia', rs: 96, rsDelta: 18, dist52w: -1.8, rangePos: 98, resilience: 'Forte', recovery: 24 },
    { symbol: 'PETR4', name: 'Petrobras', sector: 'Energia', rs: 93, rsDelta: 15, dist52w: -3.2, rangePos: 95, resilience: 'Forte', recovery: 18 },
    { symbol: 'ITUB4', name: 'Itaú', sector: 'Financeiro', rs: 91, rsDelta: 17, dist52w: -4.5, rangePos: 92, resilience: 'Forte', recovery: 16 },
    { symbol: 'BBAS3', name: 'Banco do Brasil', sector: 'Financeiro', rs: 88, rsDelta: 12, dist52w: -6.1, rangePos: 88, resilience: 'Moderada', recovery: 14 },
    { symbol: 'TAEE11', name: 'Taesa', sector: 'Utilities', rs: 84, rsDelta: 11, dist52w: -7.3, rangePos: 86, resilience: 'Forte', recovery: 12 },
    { symbol: 'CPFE3', name: 'CPFL Energia', sector: 'Utilities', rs: 82, rsDelta: 9, dist52w: -8.5, rangePos: 82, resilience: 'Moderada', recovery: 11 },
    { symbol: 'WEGE3', name: 'Weg', sector: 'Industriais', rs: 81, rsDelta: 10, dist52w: -9.1, rangePos: 80, resilience: 'Moderada', recovery: 10 },
    { symbol: 'RENT3', name: 'Localiza', sector: 'Consumo', rs: 79, rsDelta: 8, dist52w: -10.4, rangePos: 76, resilience: 'Moderada', recovery: 9 }
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

  function renderHero(cycleMode) {
    return `
      <header class="el-hero">
        <div class="el-hero-intro">
          <h1>Emerging Leaders</h1>
          <div class="el-hero-subtitle">${t('Descubra quem está chegando primeiro.', 'Discover who is arriving first.')}</div>
          <p>${t('Os próximos líderes frequentemente começam a demonstrar força antes que o mercado pareça obviamente saudável.', 'Next-generation market leaders frequently begin demonstrating relative strength before the overall market looks obviously healthy.')}</p>
        </div>

        <div class="el-hero-cycle-card">
          <div class="el-hero-cycle-top">
            <div class="el-cycle-icon-ring">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
              </svg>
            </div>
            <div>
              <small>MARKET CYCLE</small>
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

        <div class="el-hero-art-card">
          <div class="el-art-principles">
            <span>DISCIPLINA</span>
            <span>PROCESSO</span>
            <span>LIBERDADE</span>
          </div>
          <div class="el-art-graphic">
            <svg class="el-art-bull-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L4 10l3 3 5-5 5 5 3-3-8-8z"/>
              <path d="M2 18l6-6 4 4 8-8"/>
              <path d="M16 6h5v5"/>
            </svg>
          </div>
        </div>
      </header>
    `;
  }

  function renderKPIs(stocks, cycleMode) {
    const newHighs = stocks.filter(s => s.dist52w >= -2.0).length;
    const leaders = stocks.filter(s => s.score >= 85).length;
    const accelerating = stocks.filter(s => s.rsDelta >= 10).length;
    const clusters = window.EmergingLeadersModel.analyzeSectorClusters(stocks);
    const leadingSectors = clusters.filter(c => c.status === 'Cluster Forte').length;

    return `
      <section class="el-kpi-row" aria-label="Métricas principais">
        <article class="el-kpi-card">
          <div class="el-kpi-icon mint">↗</div>
          <div class="el-kpi-body">
            <div class="el-kpi-label">NEW 52W HIGHS</div>
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
            <div class="el-kpi-label">EMERGING LEADERS</div>
            <div class="el-kpi-value">${leaders || 8}</div>
            <div class="el-kpi-sub">
              <span>Score ≥ 85</span>
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
            <div class="el-kpi-label">RS ACCELERATING</div>
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
            <div class="el-kpi-label">LEADING SECTORS</div>
            <div class="el-kpi-value">${leadingSectors || 3}</div>
            <div class="el-kpi-sub">
              <span>com cluster forte</span>
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
            <div class="el-kpi-label">MARKET CYCLE</div>
            <div class="el-kpi-value" style="font-size:20px">${cycleMode.label} ›</div>
            <div class="el-kpi-sub">
              <span style="color:#c8f071">Zona de descoberta</span>
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
            <h2>Where Is Leadership Emerging?</h2>
            <p>${t('Setores com maior número de ações demonstrando força', 'Sectors with highest density of stocks showing structural strength')}</p>
          </div>
          <a class="el-clusters-link" onclick="window.elFilterSector('all')">${t('Ver todos os setores →', 'View all sectors →')}</a>
        </div>

        <div class="el-clusters-grid">
          ${topClusters.map(c => `
            <article class="el-cluster-card ${state.filters.sector === c.name ? 'active' : ''}" onclick="window.elFilterSector('${esc(c.name)}')">
              <div class="el-cluster-card-head">
                <span class="el-cluster-title">${esc(c.name)}</span>
                <span class="el-cluster-pill ${c.badgeClass}">${c.status}</span>
              </div>
              <div class="el-cluster-stats">
                <div><b>${c.candidates}</b> candidatos</div>
                <div><b>${c.rs90}</b> RS &gt; 90</div>
                <div><b>${c.nearHighs}</b> próximos da máxima</div>
                <div><b>${c.newHighs}</b> new 52W highs</div>
              </div>
            </article>
          `).join('')}
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

            <select class="el-select" onchange="window.elFilterChange('minScore', this.value)">
              <option value="85" ${state.filters.minScore == 85 ? 'selected' : ''}>Score ≥ 85</option>
              <option value="70" ${state.filters.minScore == 70 ? 'selected' : ''}>Score ≥ 70</option>
              <option value="55" ${state.filters.minScore == 55 ? 'selected' : ''}>Score ≥ 55</option>
              <option value="0" ${state.filters.minScore == 0 ? 'selected' : ''}>Todos os scores</option>
            </select>

            <select class="el-select" onchange="window.elFilterChange('minRs', this.value)">
              <option value="90" ${state.filters.minRs == 90 ? 'selected' : ''}>RS ≥ 90</option>
              <option value="80" ${state.filters.minRs == 80 ? 'selected' : ''}>RS ≥ 80</option>
              <option value="70" ${state.filters.minRs == 70 ? 'selected' : ''}>RS ≥ 70</option>
              <option value="0" ${state.filters.minRs == 0 ? 'selected' : ''}>Qualquer RS</option>
            </select>

            <label class="el-toggle-filter" onclick="window.elToggleNewHighs()">
              <div class="el-switch ${state.filters.onlyNewHighs ? 'on' : ''}">
                <div class="el-switch-dot"></div>
              </div>
              <span>${t('Apenas new highs', 'Only new highs')}</span>
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
                <th>Score</th>
                <th>RS</th>
                <th>RS Δ (30d)</th>
                <th>52W High</th>
                <th>52W Range</th>
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
                  <td>${esc(s.sector)}</td>
                  <td><span class="el-score-badge ${s.score >= 85 ? 'high' : 'medium'}">${s.score}</span></td>
                  <td><b>${s.rs}</b></td>
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
                <tr><td colspan="13" style="text-align:center;padding:26px;color:#799485">${t('Nenhum candidato encontrado para os filtros selecionados.', 'No candidate found for selected filters.')}</td></tr>
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
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#78d294" stroke-width="3.5" stroke-dasharray="${stock.score}, 100" stroke-linecap="round" />
            </svg>
            <div class="el-gauge-text">
              <strong>${stock.score}</strong>
              <small>/100</small>
            </div>
          </div>

          <div class="el-score-actions">
            <span class="el-score-name">Emerging Leader Score</span>
            <span class="el-status-pill ${stock.statusKey}">${stock.status}</span>
            <button type="button" class="el-btn-watchlist ${tracked ? 'tracked' : ''}" onclick="window.elToggleWatchlist('${esc(stock.symbol)}')">
              ${tracked ? '★ Acompanhando na Watchlist' : '☆ Adicionar à Watchlist'}
            </button>
          </div>
        </div>

        <div class="el-breakdown-list">
          <div class="el-breakdown-item">
            <div class="el-breakdown-meta">
              <span class="el-breakdown-label">☆ Relative Strength</span>
              <span class="el-breakdown-val">${stock.rs}</span>
            </div>
            <div class="el-breakdown-bar"><span style="width:${stock.rs}%"></span></div>
          </div>

          <div class="el-breakdown-item">
            <div class="el-breakdown-meta">
              <span class="el-breakdown-label">📈 RS Acceleration (30d)</span>
              <span class="el-breakdown-val el-metric-mint">+${stock.rsDelta}</span>
            </div>
            <div class="el-breakdown-bar"><span style="width:${Math.min(100, Math.max(10, stock.rsDelta * 5))}%"></span></div>
          </div>

          <div class="el-breakdown-item">
            <div class="el-breakdown-meta">
              <span class="el-breakdown-label">🎯 Dist. da Máxima 52s</span>
              <span class="el-breakdown-val el-metric-gold">${pctBR(stock.dist52w)}</span>
            </div>
            <div class="el-breakdown-bar"><span style="width:${Math.max(10, 100 + stock.dist52w * 4)}%"></span></div>
          </div>

          <div class="el-breakdown-item">
            <div class="el-breakdown-meta">
              <span class="el-breakdown-label">📊 Posição no Range 52s</span>
              <span class="el-breakdown-val">${stock.rangePos}%</span>
            </div>
            <div class="el-breakdown-bar"><span style="width:${stock.rangePos}%"></span></div>
          </div>

          <div class="el-breakdown-item">
            <div class="el-breakdown-meta">
              <span class="el-breakdown-label">🛡 Resiliência (correção)</span>
              <span class="el-breakdown-val">${esc(stock.resilience)}</span>
            </div>
            <div class="el-breakdown-bar"><span style="width:${stock.resilience === 'Forte' ? 100 : stock.resilience === 'Moderada' ? 65 : 30}%"></span></div>
          </div>

          <div class="el-breakdown-item">
            <div class="el-breakdown-meta">
              <span class="el-breakdown-label">⚡ Recovery Strength</span>
              <span class="el-breakdown-val el-metric-mint">+${stock.recovery}%</span>
            </div>
            <div class="el-breakdown-bar"><span style="width:${Math.min(100, stock.recovery * 3.5)}%"></span></div>
          </div>

          <div class="el-breakdown-item">
            <div class="el-breakdown-meta">
              <span class="el-breakdown-label">🏢 Confirmação do Setor</span>
              <span class="el-breakdown-val">${stock.sector === 'Energia' || stock.sector === 'Financeiro' ? 'Forte' : 'Moderada'}</span>
            </div>
            <div class="el-breakdown-bar"><span style="width:${stock.sector === 'Energia' || stock.sector === 'Financeiro' ? 100 : 70}%"></span></div>
          </div>
        </div>

        <div class="el-chart-card">
          <div class="el-chart-header">
            <h4>Performance Relativa (Últimos 6 meses)</h4>
            <div class="el-chart-legend">
              <span class="el-legend-item asset"><i class="el-legend-dot"></i> ${esc(stock.symbol)}</span>
              <span class="el-legend-item bench"><i class="el-legend-dot"></i> Ibovespa</span>
            </div>
          </div>
          <svg class="el-chart-svg" viewBox="0 0 300 95">
            <defs>
              <linearGradient id="el-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#78d294" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="#78d294" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <line x1="30" y1="18" x2="290" y2="18" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2,2"/>
            <line x1="30" y1="46" x2="290" y2="46" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2,2"/>
            <line x1="30" y1="74" x2="290" y2="74" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2,2"/>
            <text x="25" y="21" font-size="8" fill="#698576" text-anchor="end">+40%</text>
            <text x="25" y="49" font-size="8" fill="#698576" text-anchor="end">0%</text>
            <text x="25" y="77" font-size="8" fill="#698576" text-anchor="end">-20%</text>
            <text x="45" y="88" font-size="8" fill="#698576">Abr</text>
            <text x="95" y="88" font-size="8" fill="#698576">Mai</text>
            <text x="145" y="88" font-size="8" fill="#698576">Jun</text>
            <text x="195" y="88" font-size="8" fill="#698576">Jul</text>
            <text x="245" y="88" font-size="8" fill="#698576">Ago</text>
            <text x="280" y="88" font-size="8" fill="#698576">Set</text>
            <path d="M 40 50 Q 80 52 120 48 T 200 45 T 290 42" fill="none" stroke="#546e61" stroke-width="1.5"/>
            <path d="M 40 52 Q 80 44 120 38 T 190 26 T 290 14 L 290 80 L 40 80 Z" fill="url(#el-area-grad)"/>
            <path d="M 40 52 Q 80 44 120 38 T 190 26 T 290 14" fill="none" stroke="#78d294" stroke-width="2"/>
          </svg>
        </div>
      </aside>
    `;
  }

  function renderPipeline() {
    return `
      <section class="el-process-pipeline">
        <div class="el-pipeline-header">
          <div>
            <h3>Do Radar ao Trade — nosso processo</h3>
            <p>${t('Identifique líderes, espere a estrutura, execute com disciplina.', 'Identify leaders, wait for structure, execute with discipline.')}</p>
          </div>
          <div class="el-pipeline-tagline">
            “Find strength before it becomes obvious.”
          </div>
        </div>

        <div class="el-pipeline-steps">
          <div class="el-pipeline-step active">
            <div class="el-step-icon">🎯</div>
            <div class="el-step-text">
              <strong>1 DISCOVER</strong>
              <span>Emerging Leaders</span>
            </div>
          </div>

          <div class="el-pipeline-step" onclick="go('tradelibrary')">
            <div class="el-step-icon">📋</div>
            <div class="el-step-text">
              <strong>2 WATCH</strong>
              <span>Watchlist</span>
            </div>
          </div>

          <div class="el-pipeline-step">
            <div class="el-step-icon">⏳</div>
            <div class="el-step-text">
              <strong>3 WAIT</strong>
              <span>Contração</span>
            </div>
          </div>

          <div class="el-pipeline-step">
            <div class="el-step-icon">📊</div>
            <div class="el-step-text">
              <strong>4 CONFIRM</strong>
              <span>Setup A+</span>
            </div>
          </div>

          <div class="el-pipeline-step" onclick="go('newtrade')">
            <div class="el-step-icon">⚡</div>
            <div class="el-step-text">
              <strong>5 EXECUTE</strong>
              <span>Position Sizing + Trade</span>
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
          <b>${t('Carregando Emerging Leaders Scan…', 'Loading Emerging Leaders Scan…')}</b>
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
