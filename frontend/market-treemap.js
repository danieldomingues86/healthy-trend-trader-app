/**
 * HEALTHY TREND TRADER - MARKET TREEMAP UI
 * Mapa Interativo de Setores da B3 (Treemap do Mercado Completo)
 */

(function (root) {
  'use strict';

  const state = {
    loading: false,
    loaded: false,
    data: null,
    filters: {
      universe: 'ALL',
      sector: 'ALL',
      period: '1d',
      search: ''
    },
    focusSector: null,
    popoverStock: null,
    popoverPos: { x: 0, y: 0 },
    popoverVisible: false
  };

  let resizeObserver = null;
  let searchDebounceTimer = null;
  let popoverHideTimer = null;

  function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getModel() {
    return root.MarketTreemapModel;
  }

  /**
   * Navega para a tela de Gráficos carregando o ticker selecionado.
   */
  function openTreemapTickerChart(ticker) {
    const sym = String(ticker || '').trim().toUpperCase();
    if (!sym) return;

    hidePopoverImmediate();

    root.__chartReturnSource = 'markettreemap';
    root.__pendingChartsTicker = sym;
    if (typeof root.go === 'function') {
      root.go('charts', sym);
    }
    if (typeof root.loadTickerChart === 'function') {
      root.loadTickerChart(sym);
    }
  }

  /**
   * Busca dados no backend (/api/market-treemap)
   */
  async function fetchTreemapData() {
    state.loading = true;
    renderLoadingIndicator(true);

    try {
      const query = new URLSearchParams({
        universe: state.filters.universe,
        sector: state.filters.sector,
        period: state.filters.period,
        search: state.filters.search
      });

      const endpoint = `/api/market-treemap?${query.toString()}`;
      let payload = null;

      if (root.healthyTrendApi && typeof root.healthyTrendApi.request === 'function') {
        payload = await root.healthyTrendApi.request(endpoint);
      } else {
        const resp = await fetch(endpoint);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        payload = await resp.json();
      }

      state.data = payload;
      state.loaded = true;
      state.loading = false;
      renderLoadingIndicator(false);
      renderTreemapDom();
    } catch (err) {
      console.error('[MarketTreemap] Falha ao carregar dados:', err);
      state.loading = false;
      renderLoadingIndicator(false);
      renderErrorState(err.message);
    }
  }

  /**
   * Renderiza a casca principal da tela
   */
  function renderMarketTreemap() {
    const container = document.getElementById('markettreemap');
    if (!container) return;

    if (!container.querySelector('.treemap-page-wrapper')) {
      container.innerHTML = `
        <div class="treemap-page-wrapper">
          <!-- Cabeçalho -->
          <header class="treemap-header">
            <div class="treemap-header-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </div>
            <div class="treemap-header-text">
              <h1>Setores</h1>
              <p>Panorama do mercado acionário da B3 por setor econômico, com tamanho proporcional ao Market Cap e variação diária.</p>
            </div>
          </header>

          <!-- Barra de Controles e Filtros -->
          <nav class="treemap-controls-bar" aria-label="Filtros da tela de Setores">
            <div class="treemap-filters-left">
              <!-- Universo -->
              <div class="treemap-select-wrap">
                <select id="treemapFilterUniverse" aria-label="Filtrar universo de ativos">
                  <option value="ALL" ${state.filters.universe === 'ALL' ? 'selected' : ''}>Mercado Completo</option>
                  <option value="IBOV" ${state.filters.universe === 'IBOV' ? 'selected' : ''}>Ibovespa</option>
                  <option value="SMALL" ${state.filters.universe === 'SMALL' ? 'selected' : ''}>Small Caps (&lt; R$ 10 bi)</option>
                </select>
                <span class="treemap-select-icon">▼</span>
              </div>

              <!-- Setor -->
              <div class="treemap-select-wrap">
                <select id="treemapFilterSector" aria-label="Filtrar por setor econômico">
                  <option value="ALL" ${state.filters.sector === 'ALL' ? 'selected' : ''}>Todos os Setores</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="Petróleo, Gás e Biocombustíveis">Petróleo, Gás e Biocombustíveis</option>
                  <option value="Materiais Básicos">Materiais Básicos</option>
                  <option value="Consumo Cíclico">Consumo Cíclico</option>
                  <option value="Utilidade Pública">Utilidade Pública</option>
                  <option value="Consumo Não Cíclico">Consumo Não Cíclico</option>
                  <option value="Bens Industriais">Bens Industriais</option>
                  <option value="Tecnologia da Informação">Tecnologia da Informação</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Telecomunicações">Telecomunicações</option>
                  <option value="Outros">Outros</option>
                </select>
                <span class="treemap-select-icon">▼</span>
              </div>

              <!-- Busca rápida -->
              <div class="treemap-search-wrap">
                <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  id="treemapSearchInput"
                  class="treemap-search-input"
                  placeholder="Buscar por ticker ou nome da empresa..."
                  value="${esc(state.filters.search)}"
                  autocomplete="off"
                />
                <button
                  type="button"
                  id="treemapSearchClear"
                  class="treemap-search-clear"
                  style="display: ${state.filters.search ? 'flex' : 'none'};"
                  title="Limpar busca"
                  aria-label="Limpar busca"
                >✕</button>
              </div>
            </div>

            <div class="treemap-controls-right">
              <!-- Escala de Cores e Legenda Explicativa do Gradiente -->
              <div class="treemap-scale-container" aria-label="Legenda do mapa de calor de variação diária">
                <div class="treemap-scale-bar-wrap">
                  <div class="treemap-scale-bar" role="img" aria-label="Gradiente de -10% a +10%"></div>
                  <div class="treemap-scale-labels" aria-hidden="true">
                    <span>−10%</span>
                    <span>−5%</span>
                    <span>0%</span>
                    <span>+5%</span>
                    <span>+10%</span>
                  </div>
                </div>
                <div class="treemap-scale-legend-items">
                  <div class="treemap-scale-legend-item negative" title="Variação diária negativa expressiva">
                    <span class="legend-swatch swatch-negative"></span>
                    <span class="legend-text"><strong>−10%</strong> Maiores perdedores</span>
                  </div>
                  <div class="treemap-scale-legend-item neutral" title="Variação diária neutra ou estável">
                    <span class="legend-swatch swatch-neutral"></span>
                    <span class="legend-text"><strong>0%</strong> Neutro</span>
                  </div>
                  <div class="treemap-scale-legend-item positive" title="Variação diária positiva expressiva">
                    <span class="legend-swatch swatch-positive"></span>
                    <span class="legend-text"><strong>+10%</strong> Maiores vencedores</span>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          <!-- Barra de Indicadores do Topo (5 KPIs) -->
          <section class="treemap-kpi-bar" id="treemapKpiBar" aria-label="Indicadores gerais do universo"></section>

          <!-- Barra de Retorno de Foco (visível apenas quando um setor está expandido) -->
          <div id="treemapFocusBarContainer"></div>

          <!-- Grade Principal de Setores / Treemap -->
          <main class="treemap-grid" id="treemapGridRegion" aria-label="Treemap de setores da B3"></main>
        </div>

        <!-- Tooltip Popover Flutuante Compartilhado -->
        <div class="treemap-popover" id="treemapPopover" role="dialog" aria-hidden="true"></div>
      `;

      bindUiEvents();
    }

    if (!state.loaded && !state.loading) {
      fetchTreemapData();
    } else if (state.loaded) {
      renderTreemapDom();
    }
  }

  /**
   * Associa os eventos de clique, teclado e filtros
   */
  function bindUiEvents() {
    const universeSelect = document.getElementById('treemapFilterUniverse');
    const sectorSelect = document.getElementById('treemapFilterSector');
    const searchInput = document.getElementById('treemapSearchInput');
    const searchClear = document.getElementById('treemapSearchClear');

    if (universeSelect) {
      universeSelect.addEventListener('change', (e) => {
        state.filters.universe = e.target.value || 'ALL';
        fetchTreemapData();
      });
    }

    if (sectorSelect) {
      sectorSelect.addEventListener('change', (e) => {
        state.filters.sector = e.target.value || 'ALL';
        state.focusSector = state.filters.sector !== 'ALL' ? state.filters.sector : null;
        fetchTreemapData();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value || '';
        state.filters.search = val;
        if (searchClear) searchClear.style.display = val ? 'flex' : 'none';

        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
          fetchTreemapData();
        }, 250);
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        state.filters.search = '';
        if (searchInput) searchInput.value = '';
        searchClear.style.display = 'none';
        fetchTreemapData();
      });
    }


    // Fecha o popover ao clicar fora ou rolar
    document.addEventListener('scroll', hidePopoverImmediate, { passive: true });
    window.addEventListener('resize', handleWindowResize, { passive: true });
  }

  /**
   * Renderiza os 5 KPIs do topo e o Grid de setores
   */
  function renderTreemapDom() {
    const model = getModel();
    if (!state.data || !model) return;

    renderKpiCards();
    renderFocusBar();
    renderSectorCards();
  }

  /**
   * Renderiza os 5 cards de KPI no topo
   */
  function renderKpiCards() {
    const kpiBar = document.getElementById('treemapKpiBar');
    if (!kpiBar || !state.data?.summary) return;

    const model = getModel();
    const sum = state.data.summary;

    const formattedMcap = model.formatMarketCap(sum.totalMarketCap);
    const avgChangeFormatted = model.formatSignedPercent(sum.avgChangePct);
    const avgChangeClass = Number(sum.avgChangePct) > 0 ? 'positive' : (Number(sum.avgChangePct) < 0 ? 'negative' : '');
    // Data de atualização formatada no fuso de São Paulo
    let dateStr = '—';
    if (sum.updatedAt) {
      try {
        const d = new Date(sum.updatedAt);
        dateStr = d.toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        dateStr = String(sum.updatedAt);
      }
    }

    kpiBar.innerHTML = `
      <!-- Card 1: Empresas exibidas -->
      <article class="treemap-kpi-card">
        <div class="treemap-kpi-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
            <line x1="9" y1="22" x2="9" y2="22.01"></line>
            <line x1="15" y1="22" x2="15" y2="22.01"></line>
            <line x1="9" y1="6" x2="9" y2="6.01"></line>
            <line x1="15" y1="6" x2="15" y2="6.01"></line>
            <line x1="9" y1="10" x2="9" y2="10.01"></line>
            <line x1="15" y1="10" x2="15" y2="10.01"></line>
            <line x1="9" y1="14" x2="9" y2="14.01"></line>
            <line x1="15" y1="14" x2="15" y2="14.01"></line>
            <line x1="9" y1="18" x2="9" y2="18.01"></line>
            <line x1="15" y1="18" x2="15" y2="18.01"></line>
          </svg>
        </div>
        <div class="treemap-kpi-data">
          <span class="treemap-kpi-label">Empresas exibidas</span>
          <strong class="treemap-kpi-value">${sum.totalCompanies}</strong>
        </div>
      </article>

      <!-- Card 2: Setores -->
      <article class="treemap-kpi-card">
        <div class="treemap-kpi-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
            <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
          </svg>
        </div>
        <div class="treemap-kpi-data">
          <span class="treemap-kpi-label">Setores</span>
          <strong class="treemap-kpi-value">${sum.totalSectors}</strong>
        </div>
      </article>

      <!-- Card 3: Market Cap total -->
      <article class="treemap-kpi-card">
        <div class="treemap-kpi-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          </svg>
        </div>
        <div class="treemap-kpi-data">
          <span class="treemap-kpi-label">Market Cap total</span>
          <strong class="treemap-kpi-value" title="${formattedMcap}">${formattedMcap}</strong>
        </div>
      </article>

      <!-- Card 4: Variação média diária -->
      <article class="treemap-kpi-card">
        <div class="treemap-kpi-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
        </div>
        <div class="treemap-kpi-data">
          <span class="treemap-kpi-label">Variação média (Dia)</span>
          <strong class="treemap-kpi-value ${avgChangeClass}">${avgChangeFormatted}</strong>
        </div>
      </article>

      <!-- Card 5: Última atualização -->
      <article class="treemap-kpi-card">
        <div class="treemap-kpi-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <div class="treemap-kpi-data">
          <span class="treemap-kpi-label">Última atualização</span>
          <strong class="treemap-kpi-value" style="font-size: 14.5px;">${esc(dateStr)}</strong>
        </div>
      </article>
    `;
  }

  /**
   * Barra de retorno quando em modo Foco
   */
  function renderFocusBar() {
    const container = document.getElementById('treemapFocusBarContainer');
    if (!container) return;

    if (!state.focusSector) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <div class="treemap-focus-back-bar">
        <span>Visualizando setor em destaque: <strong>${esc(state.focusSector)}</strong></span>
        <button type="button" class="treemap-focus-back-btn" onclick="window.clearTreemapFocus()">
          ← Voltar à Visão Geral (Todos os Setores)
        </button>
      </div>
    `;
  }

  /**
   * Renderiza os cards de setores com os contêineres de treemap
   */
  function renderSectorCards() {
    const grid = document.getElementById('treemapGridRegion');
    if (!grid || !state.data) return;

    const model = getModel();
    let sectors = state.data.sectors || [];

    if (state.focusSector) {
      sectors = sectors.filter((s) => s.name === state.focusSector);
      grid.classList.add('focus-mode');
    } else {
      grid.classList.remove('focus-mode');
    }

    if (sectors.length === 0) {
      grid.innerHTML = `
        <div class="treemap-empty-state" style="grid-column: 1/-1;">
          <p>Nenhuma empresa ou setor encontrado para os filtros selecionados.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = sectors.map((sec) => {
      const formattedMcap = model.formatMarketCap(sec.totalMarketCap);
      const isFocused = state.focusSector === sec.name;

      return `
        <article
          class="treemap-sector-card"
          data-sector-name="${esc(sec.name)}"
          style="--sector-accent: ${sec.accentColor};"
        >
          <header class="treemap-sector-header">
            <div class="treemap-sector-title-wrap">
              <span class="treemap-sector-accent"></span>
              <strong class="treemap-sector-title" title="${esc(sec.name)}">${esc(sec.name)}</strong>
            </div>
            <div class="treemap-sector-meta">
              <span>${formattedMcap} | ${sec.companyCount} ${sec.companyCount === 1 ? 'empresa' : 'empresas'}</span>
              <button
                type="button"
                class="treemap-sector-zoom-btn"
                onclick="window.focusTreemapSector('${esc(sec.name)}')"
                title="${isFocused ? 'Voltar à visão geral' : 'Expandir setor em tela cheia'}"
                aria-label="${isFocused ? 'Recolher setor' : 'Expandir setor'}"
              >
                ${isFocused
                  ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`
                  : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`
                }
              </button>
            </div>
          </header>
          <div class="treemap-sector-body" id="sectorBody_${sanitizeId(sec.name)}" data-sector="${esc(sec.name)}">
            <!-- Células do Treemap são desenhadas dinamicamente -->
          </div>
        </article>
      `;
    }).join('');

    // Dispara cálculo do layout geométrico para cada corpo de setor
    requestAnimationFrame(() => {
      sectors.forEach((sec) => {
        layoutSectorCells(sec);
      });
      initResizeObserver();
    });
  }

  /**
   * Particiona o contêiner do setor em células usando o algoritmo Squarified
   */
  function layoutSectorCells(sec) {
    const model = getModel();
    if (!model) return;

    const bodyEl = document.getElementById(`sectorBody_${sanitizeId(sec.name)}`);
    if (!bodyEl) return;

    const width = bodyEl.clientWidth;
    const height = bodyEl.clientHeight;
    if (width <= 0 || height <= 0) return;

    const companies = sec.companies || [];
    if (companies.length === 0) {
      bodyEl.innerHTML = '';
      return;
    }

    // Calcula coordenadas squarified
    const layout = model.layoutTreemap(companies, width, height, 2);

    const searchQuery = (state.filters.search || '').trim().toLowerCase();

    bodyEl.innerHTML = layout.map((box) => {
      const ret = box.changePct;
      const color = model.getColorForReturn(ret);
      const retFormatted = model.formatSignedPercent(ret);
      const mcapFormatted = model.formatMarketCap(box.marketCap);

      const isMatch = searchQuery && (
        box.ticker.toLowerCase().includes(searchQuery) ||
        box.name.toLowerCase().includes(searchQuery)
      );

      // Adapta tipografia ao tamanho do retângulo
      const showTicker = box.w >= 26 && box.h >= 18;
      const showName = box.w >= 68 && box.h >= 46;
      const showMcap = box.w >= 54 && box.h >= 38;
      const showChange = box.w >= 40 && box.h >= 28;

      let fontSize = '11px';
      if (box.w >= 140 && box.h >= 90) fontSize = '16px';
      else if (box.w >= 90 && box.h >= 65) fontSize = '14px';
      else if (box.w >= 60 && box.h >= 45) fontSize = '12px';
      else if (box.w < 35 || box.h < 25) fontSize = '9px';

      const jsonStr = esc(JSON.stringify(box));

      return `
        <div
          class="treemap-cell ${isMatch ? 'highlighted' : ''} ${searchQuery && !isMatch ? 'dimmed' : ''}"
          style="
            left: ${box.x}px;
            top: ${box.y}px;
            width: ${box.w}px;
            height: ${box.h}px;
            background: ${color};
          "
          data-stock='${jsonStr}'
          onmouseenter="window.handleTreemapCellHover(event, this)"
          onmouseleave="window.handleTreemapCellLeave(event)"
          onclick="window.handleTreemapCellClick(event, '${esc(box.ticker)}')"
          title="${esc(box.ticker)} - ${esc(box.name)}: ${esc(mcapFormatted)} (${retFormatted})"
          tabindex="0"
          role="button"
          aria-label="${esc(box.ticker)}, variação ${retFormatted}, Market Cap ${esc(mcapFormatted)}"
        >
          ${showTicker ? `<span class="treemap-cell-ticker" style="font-size: ${fontSize};">${esc(box.ticker)}</span>` : ''}
          ${showName ? `<span class="treemap-cell-name" style="font-size: calc(${fontSize} - 3px);">${esc(box.name)}</span>` : ''}
          ${showMcap ? `<span class="treemap-cell-mcap" style="font-size: calc(${fontSize} - 3px);">${esc(mcapFormatted)}</span>` : ''}
          ${showChange ? `<span class="treemap-cell-change" style="font-size: calc(${fontSize} - 2px);">${retFormatted}</span>` : ''}
        </div>
      `;
    }).join('');
  }

  /**
   * Inicializa o observador de redimensionamento responsivo
   */
  function initResizeObserver() {
    if (typeof ResizeObserver === 'undefined') return;

    if (resizeObserver) {
      resizeObserver.disconnect();
    }

    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const sectorName = entry.target.dataset.sector;
        if (!sectorName || !state.data?.sectors) continue;
        const sec = state.data.sectors.find((s) => s.name === sectorName);
        if (sec) {
          layoutSectorCells(sec);
        }
      }
    });

    const bodyEls = document.querySelectorAll('.treemap-sector-body');
    bodyEls.forEach((el) => resizeObserver.observe(el));
  }

  function handleWindowResize() {
    if (!state.data?.sectors) return;
    state.data.sectors.forEach((sec) => {
      layoutSectorCells(sec);
    });
  }

  // =========================================================================
  // TOOLTIP / POPOVER FLUTUANTE
  // =========================================================================

  function handleTreemapCellHover(event, cellEl) {
    clearTimeout(popoverHideTimer);
    try {
      const dataStr = cellEl.getAttribute('data-stock');
      if (!dataStr) return;
      const stock = JSON.parse(dataStr);
      showPopover(stock, cellEl);
    } catch (e) {
      // Ignora erro de parse
    }
  }

  function handleTreemapCellLeave() {
    popoverHideTimer = setTimeout(() => {
      hidePopoverImmediate();
    }, 120);
  }

  function handleTreemapCellClick(event, ticker) {
    event.stopPropagation();
    openTreemapTickerChart(ticker);
  }

  function showPopover(stock, cellEl) {
    const popover = document.getElementById('treemapPopover');
    if (!popover || !stock) return;

    const mcapFormatted = model.formatMarketCap(stock.companyMarketCap || stock.marketCap);
    const priceFormatted = model.formatPrice(stock.price);
    const changeFormatted = model.formatSignedPercent(stock.changePct);
    const changeClass = Number(stock.changePct) > 0 ? 'positive' : (Number(stock.changePct) < 0 ? 'negative' : '');

    let dateStr = '—';
    if (stock.updatedAt) {
      try {
        const d = new Date(stock.updatedAt);
        dateStr = d.toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        dateStr = String(stock.updatedAt);
      }
    }

    popover.innerHTML = `
      <div class="treemap-popover-header">
        <div class="treemap-popover-title-row">
          <div class="treemap-popover-title">
            <span>${esc(stock.ticker)}</span>
            <svg class="treemap-popover-ext-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </div>
        </div>
        <div class="treemap-popover-company">${esc(stock.fullName || stock.name)}</div>
      </div>

      <div class="treemap-popover-rows">
        <div class="treemap-popover-row">
          <span>Setor</span>
          <span>${esc(stock.sector)}</span>
        </div>
        <div class="treemap-popover-row">
          <span>Market Cap</span>
          <span>${esc(mcapFormatted)}</span>
        </div>
        <div class="treemap-popover-row">
          <span>Preço</span>
          <span>${esc(priceFormatted)}</span>
        </div>
        <div class="treemap-popover-row">
          <span>Variação (Dia)</span>
          <span class="change-val ${changeClass}">${changeFormatted}</span>
        </div>
        <div class="treemap-popover-row">
          <span>Última atualização</span>
          <span style="font-size: 11px;">${esc(dateStr)}</span>
        </div>
      </div>

      <button type="button" class="treemap-popover-btn" onclick="window.openTreemapTickerChart('${esc(stock.ticker)}')">
        Ver gráfico
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="7" y1="17" x2="17" y2="7"></line>
          <polyline points="7 7 17 7 17 17"></polyline>
        </svg>
      </button>
    `;

    // Posiciona próximo à célula sem estourar a tela
    const rect = cellEl.getBoundingClientRect();
    const popWidth = 265;
    const popHeight = 220;

    let left = rect.right + 8;
    if (left + popWidth > window.innerWidth - 16) {
      left = rect.left - popWidth - 8;
    }
    if (left < 16) left = 16;

    let top = rect.top;
    if (top + popHeight > window.innerHeight - 16) {
      top = window.innerHeight - popHeight - 16;
    }
    if (top < 16) top = 16;

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    popover.classList.add('visible');

    popover.onmouseenter = () => clearTimeout(popoverHideTimer);
    popover.onmouseleave = () => hidePopoverImmediate();
  }

  function hidePopoverImmediate() {
    const popover = document.getElementById('treemapPopover');
    if (popover) {
      popover.classList.remove('visible');
    }
  }

  // =========================================================================
  // FOCO E EXPANSÃO DE SETOR
  // =========================================================================

  function focusTreemapSector(sectorName) {
    if (state.focusSector === sectorName) {
      state.focusSector = null;
    } else {
      state.focusSector = sectorName;
    }
    renderFocusBar();
    renderSectorCards();
  }

  function clearTreemapFocus() {
    state.focusSector = null;
    const sectorSelect = document.getElementById('treemapFilterSector');
    if (sectorSelect) sectorSelect.value = 'ALL';
    state.filters.sector = 'ALL';
    renderFocusBar();
    renderSectorCards();
  }

  function sanitizeId(str) {
    return String(str || '').replace(/[^\w-]/g, '_');
  }

  function renderLoadingIndicator(isLoading) {
    const grid = document.getElementById('treemapGridRegion');
    if (!grid) return;
    if (isLoading && !state.loaded) {
      grid.innerHTML = `
        <div class="treemap-loading-state" style="grid-column: 1/-1;">
          <div class="treemap-spinner"></div>
          <p>Carregando mapa setorial da B3 e dados de mercado...</p>
        </div>
      `;
    }
  }

  function renderErrorState(message) {
    const grid = document.getElementById('treemapGridRegion');
    if (!grid) return;
    grid.innerHTML = `
      <div class="treemap-empty-state" style="grid-column: 1/-1;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p><strong>Não foi possível carregar a tela de Setores:</strong> ${esc(message)}</p>
        <button type="button" class="treemap-focus-back-btn" onclick="window.refreshMarketTreemap()">Tentar novamente</button>
      </div>
    `;
  }

  function refreshMarketTreemap() {
    fetchTreemapData();
  }

  // Exporta métodos públicos para acesso global
  root.renderMarketTreemap = renderMarketTreemap;
  root.refreshMarketTreemap = refreshMarketTreemap;
  root.openTreemapTickerChart = openTreemapTickerChart;
  root.focusTreemapSector = focusTreemapSector;
  root.clearTreemapFocus = clearTreemapFocus;
  root.handleTreemapCellHover = handleTreemapCellHover;
  root.handleTreemapCellLeave = handleTreemapCellLeave;
  root.handleTreemapCellClick = handleTreemapCellClick;

})(typeof window !== 'undefined' ? window : global);
