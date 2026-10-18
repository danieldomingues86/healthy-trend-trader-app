(function (root) {
  'use strict';

  const state = {
    loaded: false,
    loading: false,
    updatedAt: null,
    dataAsOf: null,
    marketCycleState: 'healthy',
    items: [],
    filters: {
      market: 'ALL',
      grade: 'ALL',
      trigger: 'ALL',
      search: ''
    }
  };

  const BRAND_LOGOS = {
    PETR4: { bg: '#008542', fg: '#ffd100', text: 'BR' },
    PETR3: { bg: '#008542', fg: '#ffd100', text: 'BR' },
    WEGE3: { bg: '#00579d', fg: '#ffffff', text: 'WEG' },
    ITUB4: { bg: '#003399', fg: '#ff7800', text: 'itaú' },
    ITSA4: { bg: '#003399', fg: '#ffd100', text: 'ITSA' },
    VALE3: { bg: '#007e7a', fg: '#e5a93c', text: 'VALE' },
    ABEV3: { bg: '#1446a0', fg: '#ffffff', text: 'ambev' },
    SANB11: { bg: '#ec0000', fg: '#ffffff', text: 'SAN' },
    GGBR4: { bg: '#002b49', fg: '#ffffff', text: 'GO' },
    GOAU4: { bg: '#002b49', fg: '#ffffff', text: 'GO' },
    SUZB3: { bg: '#00965e', fg: '#ffffff', text: 'SUZ' },
    MGLU3: { bg: '#0086ff', fg: '#ffffff', text: 'MGLU' },
    BPAC11: { bg: '#001e62', fg: '#ffffff', text: 'BTG' },
    RENT3: { bg: '#008744', fg: '#ffffff', text: 'LOC' },
    RAIL3: { bg: '#1b365d', fg: '#ffffff', text: 'RUMO' },
    ENGI11: { bg: '#0073cf', fg: '#ff6b00', text: 'ENGI' },
    TOTS3: { bg: '#112233', fg: '#00d1b2', text: 'TOTV' },
    YDUQ3: { bg: '#004b87', fg: '#00c389', text: 'YDUQ' },
    COGN3: { bg: '#5c2d91', fg: '#ffffff', text: 'COGN' },
    SMFT3: { bg: '#1c1c1c', fg: '#ffb800', text: 'SMFT' },
    CEAB3: { bg: '#1f2937', fg: '#ffffff', text: 'C&A' },
    LJQQ3: { bg: '#007a33', fg: '#ffd100', text: 'QQ' },
    MOVI3: { bg: '#f26522', fg: '#ffffff', text: 'MOVI' },
    ARML3: { bg: '#1d428a', fg: '#fdb927', text: 'ARML' },
    BBAS3: { bg: '#fcf000', fg: '#0038a8', text: 'BB' },
    BBDC4: { bg: '#cc092f', fg: '#ffffff', text: 'BRAD' },
    PRIO3: { bg: '#0f2c59', fg: '#00b4d8', text: 'PRIO' }
  };

  const FALLBACK_PALETTE = [
    { bg: '#134e4a', fg: '#ffffff' },
    { bg: '#1e3a8a', fg: '#ffffff' },
    { bg: '#3b0764', fg: '#ffffff' },
    { bg: '#14532d', fg: '#ffffff' },
    { bg: '#7c2d12', fg: '#ffffff' },
    { bg: '#0f172a', fg: '#e2e8f0' }
  ];

  function esc(val) {
    return String(val ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatCurrency(val) {
    const num = Number(val);
    if (!Number.isFinite(num)) return '—';
    return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatNumberPt(val, decimals = 1) {
    const num = Number(val);
    if (!Number.isFinite(num)) return '—';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function formatUpdatedAt(isoString, fallbackDate) {
    const raw = isoString || fallbackDate;
    if (!raw) return 'Dados em cache';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }

  function renderAssetLogo(symbol) {
    const sym = String(symbol || '').trim().toUpperCase();
    const brand = BRAND_LOGOS[sym];
    if (brand) {
      return `<div class="radar-asset-logo" style="background:${brand.bg};color:${brand.fg};">${esc(brand.text)}</div>`;
    }
    const prefix = sym.replace(/[0-9]+$/, '').slice(0, 3) || sym.slice(0, 2);
    let hash = 0;
    for (let i = 0; i < sym.length; i++) {
      hash = (hash * 31 + sym.charCodeAt(i)) % FALLBACK_PALETTE.length;
    }
    const palette = FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length];
    return `<div class="radar-asset-logo" style="background:${palette.bg};color:${palette.fg};">${esc(prefix)}</div>`;
  }

  function renderCandleIcon(triggerId) {
    const isInside = triggerId === 'INSIDE_BAR';
    const secondColor = isInside ? '#e03e3e' : '#159967';
    return `
      <span class="radar-candle-svg" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <line x1="5" y1="2" x2="5" y2="14" stroke="#159967" stroke-width="1.4" stroke-linecap="round"/>
          <rect x="3.2" y="4.5" width="3.6" height="7" rx="0.8" fill="#159967"/>
          <line x1="11" y1="3.5" x2="11" y2="12.5" stroke="${secondColor}" stroke-width="1.4" stroke-linecap="round"/>
          <rect x="9.2" y="6" width="3.6" height="4.5" rx="0.8" fill="${secondColor}"/>
        </svg>
      </span>
    `;
  }

  async function fetchRadarData(force = false) {
    if (state.loading) return;
    state.loading = true;
    updateRefreshSpinner(true);

    try {
      let payload = null;
      if (root.healthyTrendApi && typeof root.healthyTrendApi.request === 'function') {
        payload = await root.healthyTrendApi.request('/api/opportunity-radar');
      } else {
        const res = await fetch('/api/opportunity-radar');
        if (res.ok) payload = await res.json();
      }

      if (payload && Array.isArray(payload.items)) {
        state.items = payload.items;
        state.updatedAt = payload.updatedAt || null;
        state.dataAsOf = payload.dataAsOf || null;
        state.marketCycleState = payload.marketCycleState || 'healthy';
        state.loaded = true;
      }
    } catch (err) {
      console.warn('[Radar de Oportunidades] Falha ao carregar dados:', err);
    } finally {
      state.loading = false;
      updateRefreshSpinner(false);
      renderOpportunityRadarDom();
    }
  }

  function updateRefreshSpinner(spinning) {
    const btn = document.getElementById('radarRefreshBtn');
    if (btn) {
      btn.classList.toggle('spinning', Boolean(spinning));
    }
  }

  function getFilteredItems() {
    if (root.OpportunityRadarModel && typeof root.OpportunityRadarModel.filterOpportunities === 'function') {
      return root.OpportunityRadarModel.filterOpportunities(state.items, state.filters);
    }
    return state.items;
  }

  function getFilterOptions() {
    if (root.OpportunityRadarModel && typeof root.OpportunityRadarModel.extractFilterOptions === 'function') {
      return root.OpportunityRadarModel.extractFilterOptions(state.items);
    }
    return { markets: ['IBOV', 'IFIX', 'BDRs'], sectors: [], triggers: [], grades: ['A', 'B', 'C', 'D'] };
  }

  function renderTableRows(filteredItems) {
    if (state.loading && !state.loaded) {
      return `
        <div class="radar-empty-state">
          <div class="radar-empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>
            </svg>
          </div>
          <h3>Consolidando oportunidades pelos motores do sistema...</h3>
          <p>Avaliando Força Relativa (3M), Ciclo de Mercado, Tendência Diária (EMA 9 > EMA 30) e gatilhos confirmados.</p>
        </div>
      `;
    }

    if (!filteredItems.length) {
      return `
        <div class="radar-empty-state">
          <div class="radar-empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/>
            </svg>
          </div>
          <h3>Nenhuma oportunidade pronta para entrada no momento</h3>
          <p>Nenhum ativo atende simultaneamente a todos os critérios obrigatórios e aos filtros selecionados. O método exige paciência até que o contexto e o gatilho estejam confirmados.</p>
        </div>
      `;
    }

    const rowsHtml = filteredItems.map((item) => {
      const marketLower = String(item.market || 'IBOV').toLowerCase();
      const tierClass = item.rsTier === 'leader' ? 'tier-leader' : '';
      return `
        <tr data-ticker="${esc(item.symbol)}">
          <td>
            <div class="radar-asset-cell">
              ${renderAssetLogo(item.symbol)}
              <div class="radar-asset-info">
                <span class="radar-asset-symbol">${esc(item.symbol)}</span>
                <span class="radar-asset-name">${esc(item.name)}</span>
              </div>
            </div>
          </td>
          <td class="col-center">
            <span class="radar-grade-badge grade-${esc(String(item.grade || 'B').toLowerCase())}" title="${esc(item.rubricSummary || ('Grade ' + (item.grade || 'B')))}">
              ${esc(item.grade || 'B')}
            </span>
          </td>
          <td class="col-center">
            <span class="radar-market-badge market-${esc(marketLower)}">${esc(item.market)}</span>
          </td>
          <td class="col-center">
            <div class="radar-rs-cell ${tierClass}">
              <span class="radar-rs-score">${esc(item.rsScore)}</span>
              <span class="radar-rs-label">${esc(item.rsLabel)}</span>
            </div>
          </td>
          <td class="col-center">
            <span class="radar-green-pill">${esc(item.marketCycle)}</span>
          </td>
          <td class="col-center">
            <span class="radar-green-pill">${esc(item.trend)}</span>
          </td>
          <td>
            <div class="radar-trigger-cell">
              ${renderCandleIcon(item.triggerId)}
              <span>${esc(item.triggerName)}</span>
            </div>
          </td>
          <td>
            <span class="radar-price-val">${formatCurrency(item.entry)}</span>
          </td>
          <td>
            <div class="radar-stop-cell">
              <span class="radar-price-val">${formatCurrency(item.stop)}</span>
              <span class="radar-stop-pct">(-${formatNumberPt(item.stopPct, 1)}%)</span>
            </div>
          </td>
          <td class="col-center">
            <span class="radar-rr-val">${formatNumberPt(item.rr, 1)}</span>
          </td>
          <td class="col-center">
            <span class="radar-status-pill">↗ Pronto para entrada</span>
          </td>
          <td class="col-right">
            <button type="button" class="radar-btn-chart" onclick="window.openRadarTickerChart('${esc(item.symbol)}')">
              Ver gráfico <span aria-hidden="true">→</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="radar-table-wrap">
        <table class="radar-table" aria-label="Ativos prontos para entrada">
          <thead>
            <tr>
              <th>ATIVO</th>
              <th class="col-center">GRADE</th>
              <th class="col-center">MERCADO</th>
              <th class="col-center">RS (3M)</th>
              <th class="col-center">CICLO DE MERCADO</th>
              <th class="col-center">TENDÊNCIA (EMA 9 &gt; 30)</th>
              <th>GATILHO</th>
              <th>ENTRADA PLANEJADA</th>
              <th>STOP INICIAL</th>
              <th class="col-center">R:R</th>
              <th class="col-center">SITUAÇÃO</th>
              <th class="col-right"></th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderOpportunityRadarDom() {
    const container = document.getElementById('opportunityRadarRoot');
    if (!container) return;

    const filteredItems = getFilteredItems();
    const options = getFilterOptions();
    const updatedLabel = formatUpdatedAt(state.updatedAt, state.dataAsOf);

    const gradeLabels = {
      'A': 'Grade A (Alta Qualidade)',
      'B': 'Grade B (Bom Edge)',
      'C': 'Grade C (Edge Pequeno)',
      'D': 'Grade D (Sem Edge)'
    };
    const availableGrades = options.grades && options.grades.length > 0 ? options.grades : ['A', 'B', 'C', 'D'];
    const gradeOptionsHtml = availableGrades.map((g) => {
      const selected = state.filters.grade === g ? 'selected' : '';
      const label = gradeLabels[g] || `Grade ${g}`;
      return `<option value="${esc(g)}" ${selected}>${esc(label)}</option>`;
    }).join('');

    const triggerOptionsHtml = options.triggers.map((trig) => {
      const selected = state.filters.trigger === trig.id ? 'selected' : '';
      return `<option value="${esc(trig.id)}" ${selected}>${esc(trig.name)}</option>`;
    }).join('');

    container.innerHTML = `
      <div class="radar-shell">
        <div class="radar-breadcrumb">
          Análise de Mercado <span>›</span> <strong>Radar de Oportunidades</strong>
        </div>

        <header class="radar-header">
          <div class="radar-header-left">
            <div class="radar-target-circle" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <circle cx="12" cy="12" r="5"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                <path d="M16 8l4.5-4.5M17 3.5h3.5V7"/>
              </svg>
            </div>
            <div class="radar-header-titles">
              <h1>Radar de Oportunidades</h1>
              <p>Ativos prontos para entrada de acordo com o seu método no gráfico Diário.</p>
            </div>
          </div>

          <div class="radar-header-right">
            <div class="radar-engine-badge">
              <div class="radar-engine-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </div>
              <div class="radar-engine-text">
                <strong>Baseado em todo o motor do sistema</strong>
                <span>RS &gt; 80 · Ciclo · Tendência · Gatilhos · Grade Oficial</span>
              </div>
            </div>

            <div class="radar-updated-card">
              <div class="radar-updated-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div class="radar-updated-info">
                <small>Última atualização</small>
                <strong id="radarUpdatedValue">${esc(updatedLabel)}</strong>
              </div>
              <button type="button" id="radarRefreshBtn" class="radar-refresh-btn ${state.loading ? 'spinning' : ''}" title="Atualizar oportunidades" onclick="window.refreshOpportunityRadar()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                  <path d="M16 16h5v5"/>
                </svg>
              </button>
            </div>
          </div>
        </header>

        <section class="radar-filters-row" aria-label="Filtros do Radar de Oportunidades">
          <div class="radar-filter-card">
            <label for="radarFilterMarket">Mercado</label>
            <select id="radarFilterMarket">
              <option value="ALL" ${state.filters.market === 'ALL' ? 'selected' : ''}>Todos (IBOV, IFIX, BDRs)</option>
              <option value="IBOV" ${state.filters.market === 'IBOV' ? 'selected' : ''}>IBOV</option>
              <option value="IFIX" ${state.filters.market === 'IFIX' ? 'selected' : ''}>IFIX</option>
              <option value="BDRs" ${state.filters.market === 'BDRs' ? 'selected' : ''}>BDRs</option>
            </select>
          </div>

          <div class="radar-filter-card">
            <label for="radarFilterGrade">Grade</label>
            <select id="radarFilterGrade">
              <option value="ALL" ${state.filters.grade === 'ALL' ? 'selected' : ''}>Todos</option>
              ${gradeOptionsHtml}
            </select>
          </div>

          <div class="radar-filter-card">
            <label for="radarFilterTrigger">Gatilho</label>
            <select id="radarFilterTrigger">
              <option value="ALL" ${state.filters.trigger === 'ALL' ? 'selected' : ''}>Todos</option>
              ${triggerOptionsHtml}
            </select>
          </div>

          <div class="radar-search-card">
            <div class="radar-search-input-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" id="radarSearchInput" placeholder="Buscar ativo..." value="${esc(state.filters.search)}" autocomplete="off" />
            </div>
          </div>
        </section>

        <section class="radar-main-card">
          <div class="radar-ready-banner">
            <div class="radar-ready-left">
              <span class="radar-ready-icon" aria-hidden="true">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="9"/>
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M15.5 8.5L19 5"/>
                </svg>
              </span>
              <span class="radar-ready-title">Prontos para entrada</span>
              <span class="radar-ready-count" id="radarReadyCountBadge">${filteredItems.length}</span>
            </div>
            <span class="radar-ready-desc">Ativos que atendem a todos os critérios do seu método e possuem gatilho de entrada confirmado.</span>
          </div>

          <div id="radarTableRegion">
            ${renderTableRows(filteredItems)}
          </div>
        </section>

        <section class="radar-bottom-grid" aria-label="Informações e avisos operacionais">
          <div class="radar-info-card">
            <div class="radar-info-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </div>
            <div class="radar-info-body">
              <h3>Critérios utilizados</h3>
              <ul class="radar-criteria-list">
                <li><span class="radar-check-icon">✓</span> Força Relativa (3M) &gt; 80</li>
                <li><span class="radar-check-icon">✓</span> Ciclo de Mercado</li>
                <li><span class="radar-check-icon">✓</span> Preço &gt; EMA 9 &gt; EMA 30 (Diário)</li>
                <li><span class="radar-check-icon">✓</span> Gatilhos: Inside Bar, 123 Buy, PFR de Compra</li>
              </ul>
            </div>
          </div>

          <div class="radar-info-card">
            <div class="radar-info-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
                <path d="M22 12A10 10 0 0 0 12 2v10z"/>
              </svg>
            </div>
            <div class="radar-info-body">
              <h3>Mercados disponíveis</h3>
              <ul class="radar-markets-list">
                <li><span class="radar-market-badge market-ibov">IBOV</span> Ações do mercado brasileiro (B3)</li>
                <li><span class="radar-market-badge market-ifix">IFIX</span> Fundos de Investimento Imobiliário (FIIs)</li>
                <li><span class="radar-market-badge market-bdrs">BDRs</span> Ativos internacionais negociados na B3</li>
              </ul>
            </div>
          </div>

          <div class="radar-info-card radar-warn-card">
            <div class="radar-info-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18h6"/>
                <path d="M10 22h4"/>
                <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
              </svg>
            </div>
            <div class="radar-info-body">
              <h3>Importante</h3>
              <p class="radar-warn-text">
                Gatilho identificado no fechamento não significa entrada disponível no próximo pregão.
                Sempre valide o preço de entrada, stop, risco e gestão da posição antes de operar.
              </p>
            </div>
          </div>
        </section>
      </div>
    `;

    bindFilterEvents();
  }

  function updateTableAndCounterOnly() {
    const filteredItems = getFilteredItems();
    const countEl = document.getElementById('radarReadyCountBadge');
    if (countEl) countEl.textContent = String(filteredItems.length);
    const region = document.getElementById('radarTableRegion');
    if (region) region.innerHTML = renderTableRows(filteredItems);
  }

  function bindFilterEvents() {
    const marketEl = document.getElementById('radarFilterMarket');
    const gradeEl = document.getElementById('radarFilterGrade');
    const triggerEl = document.getElementById('radarFilterTrigger');
    const searchEl = document.getElementById('radarSearchInput');

    if (marketEl) {
      marketEl.addEventListener('change', (e) => {
        state.filters.market = e.target.value || 'ALL';
        updateTableAndCounterOnly();
      });
    }
    if (gradeEl) {
      gradeEl.addEventListener('change', (e) => {
        state.filters.grade = e.target.value || 'ALL';
        updateTableAndCounterOnly();
      });
    }
    if (triggerEl) {
      triggerEl.addEventListener('change', (e) => {
        state.filters.trigger = e.target.value || 'ALL';
        updateTableAndCounterOnly();
      });
    }
    if (searchEl) {
      searchEl.addEventListener('input', (e) => {
        state.filters.search = e.target.value || '';
        updateTableAndCounterOnly();
      });
    }
  }

  function renderOpportunityRadar() {
    renderOpportunityRadarDom();
    if (!state.loaded && !state.loading) {
      fetchRadarData(false);
    }
  }

  function refreshOpportunityRadar() {
    fetchRadarData(true);
  }

  function openRadarTickerChart(symbol) {
    const sym = String(symbol || '').trim().toUpperCase();
    if (!sym) return;
    root.__pendingChartsTicker = sym;
    if (typeof root.go === 'function') {
      root.go('charts', sym);
    }
    if (typeof root.loadTickerChart === 'function' && root.__pendingChartsTicker === sym) {
      root.__pendingChartsTicker = null;
      root.loadTickerChart(sym);
    }
  }

  root.renderOpportunityRadar = renderOpportunityRadar;
  root.refreshOpportunityRadar = refreshOpportunityRadar;
  root.openRadarTickerChart = openRadarTickerChart;
})(typeof globalThis !== 'undefined' ? globalThis : this);
