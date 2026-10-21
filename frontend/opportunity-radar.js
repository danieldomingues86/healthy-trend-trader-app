(function (root) {
  'use strict';

  const SESSION_KEY_SELECTION = 'healthy-trend-radar-selection-session';

  const state = {
    loaded: false,
    loading: false,
    updatedAt: null,
    dataAsOf: null,
    marketCycleState: 'healthy',
    marketCycles: null,
    items: [],
    filters: {
      market: 'ALL',
      grade: 'ALL',
      trigger: 'ALL',
      search: ''
    },
    selectedTickers: [],
    selectionExpanded: false,
    fallbackCatalog: {}
  };

  const BRAND_LOGOS = (root.OpportunityRadarModel && root.OpportunityRadarModel.BRAND_LOGOS) || {
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

  const FALLBACK_PALETTE = (root.OpportunityRadarModel && root.OpportunityRadarModel.FALLBACK_PALETTE) || [
    { bg: '#134e4a', fg: '#ffffff' },
    { bg: '#1e3a8a', fg: '#ffffff' },
    { bg: '#3b0764', fg: '#ffffff' },
    { bg: '#14532d', fg: '#ffffff' },
    { bg: '#7c2d12', fg: '#ffffff' },
    { bg: '#0f172a', fg: '#e2e8f0' }
  ];

  const LOGO_CACHE_KEY = 'htt_asset_logos_status_v1';

  // Cache persistente na sessão do navegador para evitar requisições redundantes ou 404 repetidos
  const logoStatusCache = (function initLogoStatusCache() {
    const memory = new Map();
    try {
      const raw = sessionStorage.getItem(LOGO_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          for (const [k, v] of Object.entries(parsed)) {
            memory.set(k, v);
          }
        }
      }
    } catch {
      // sessionStorage indisponível ou inacessível
    }

    function save() {
      try {
        const obj = Object.fromEntries(memory.entries());
        sessionStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(obj));
      } catch {
        // quota ou restrições de storage
      }
    }

    return {
      isLoaded(sym) {
        return memory.get(sym) === 'loaded';
      },
      isFailed(sym) {
        return memory.get(sym) === 'failed';
      },
      markLoaded(sym) {
        if (!sym) return;
        memory.set(sym, 'loaded');
        save();
      },
      markFailed(sym) {
        if (!sym) return;
        memory.set(sym, 'failed');
        save();
      }
    };
  })();

  // Handlers globais reutilizáveis para eventos de carregamento assíncrono das imagens de ativos
  root.handleAssetLogoLoad = function (imgEl, symbol) {
    if (!imgEl) return;
    const sym = String(symbol || '').trim().toUpperCase();
    logoStatusCache.markLoaded(sym);
    imgEl.classList.add('is-loaded');
    const container = imgEl.closest('.radar-asset-logo');
    if (container) {
      container.classList.add('has-loaded-logo');
      const fallback = container.querySelector('.radar-asset-logo-fallback');
      if (fallback) fallback.style.display = 'none';
    }
  };

  root.handleAssetLogoError = function (imgEl, symbol) {
    if (!imgEl) return;
    const sym = String(symbol || '').trim().toUpperCase();
    logoStatusCache.markFailed(sym);
    imgEl.style.display = 'none';
    const container = imgEl.closest('.radar-asset-logo');
    if (container) {
      container.classList.add('has-failed-logo');
      const fallback = container.querySelector('.radar-asset-logo-fallback');
      if (fallback) fallback.style.display = 'flex';
    }
  };

  root.handleRadarLogoLoad = root.handleAssetLogoLoad;
  root.handleRadarLogoError = root.handleAssetLogoError;

  function initRenderedLogos(rootEl) {
    if (!rootEl) return;
    const imgs = rootEl.querySelectorAll('.radar-asset-logo-img:not(.is-loaded)');
    imgs.forEach((img) => {
      const sym = img.getAttribute('data-ticker') || img.getAttribute('alt');
      if (img.complete) {
        if (img.naturalWidth > 0) {
          root.handleAssetLogoLoad(img, sym);
        } else {
          root.handleAssetLogoError(img, sym);
        }
      }
    });
  }

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

  function formatSignedPercent(val) {
    const num = Number(val);
    if (!Number.isFinite(num)) return '—';
    const sign = num > 0 ? '+' : '';
    return sign + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
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
    const sym = root.OpportunityRadarModel?.normalizeTicker(symbol) || String(symbol || '').trim().toUpperCase();
    const brand = root.OpportunityRadarModel?.getAssetBrandDetails(sym) || (function () {
      const b = BRAND_LOGOS[sym];
      if (b) return { brandText: b.text, bg: b.bg, fg: b.fg };
      const prefix = sym.replace(/[0-9]+$/, '').slice(0, 3) || sym.slice(0, 2);
      let hash = 0;
      for (let i = 0; i < sym.length; i++) hash = (hash * 31 + sym.charCodeAt(i)) % FALLBACK_PALETTE.length;
      const pal = FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length];
      return { brandText: prefix || sym.slice(0, 2), bg: pal.bg, fg: pal.fg };
    })();
    const logoUrl = root.OpportunityRadarModel?.resolveAssetLogoUrl(sym) || (sym ? `https://icons.brapi.dev/icons/${sym}.svg` : null);

    // 1. Caso sem URL ou já confirmado como falho/indisponível nesta sessão: exibe fallback direto sem requisitar imagem
    if (!logoUrl || logoStatusCache.isFailed(sym)) {
      return `
        <div class="radar-asset-logo has-failed-logo is-fallback" data-ticker="${esc(sym)}" title="${esc(sym)}">
          <div class="radar-asset-logo-fallback" style="background:${brand.bg};color:${brand.fg};">
            <span class="radar-asset-logo-fallback-text">${esc(brand.brandText)}</span>
          </div>
        </div>
      `;
    }

    // 2. Caso já validado e confirmado em cache: renderiza imagem pronta diretamente
    if (logoStatusCache.isLoaded(sym)) {
      return `
        <div class="radar-asset-logo has-loaded-logo" data-ticker="${esc(sym)}" title="${esc(sym)}">
          <div class="radar-asset-logo-fallback" style="display:none;background:${brand.bg};color:${brand.fg};">
            <span class="radar-asset-logo-fallback-text">${esc(brand.brandText)}</span>
          </div>
          <img
            src="${esc(logoUrl)}"
            alt="${esc(sym)}"
            data-ticker="${esc(sym)}"
            class="radar-asset-logo-img is-loaded"
            loading="lazy"
            decoding="async"
            onload="window.handleAssetLogoLoad && window.handleAssetLogoLoad(this, '${esc(sym)}')"
            onerror="window.handleAssetLogoError && window.handleAssetLogoError(this, '${esc(sym)}')"
          />
        </div>
      `;
    }

    // 3. Primeiro carregamento: fallback pronto no DOM + imagem carregando de forma assíncrona com transição suave
    return `
      <div class="radar-asset-logo" data-ticker="${esc(sym)}" title="${esc(sym)}">
        <div class="radar-asset-logo-fallback" style="background:${brand.bg};color:${brand.fg};">
          <span class="radar-asset-logo-fallback-text">${esc(brand.brandText)}</span>
        </div>
        <img
          src="${esc(logoUrl)}"
          alt="${esc(sym)}"
          data-ticker="${esc(sym)}"
          class="radar-asset-logo-img"
          loading="lazy"
          decoding="async"
          onload="window.handleAssetLogoLoad && window.handleAssetLogoLoad(this, '${esc(sym)}')"
          onerror="window.handleAssetLogoError && window.handleAssetLogoError(this, '${esc(sym)}')"
        />
      </div>
    `;
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

  // =========================================================================
  // PERSISTENCE (SESSION-BASED: STARTS EMPTY ON FRESH SESSIONS, PRESERVES DURING NAVIGATION)
  // =========================================================================

  function loadSelectionFromStorage() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY_SELECTION);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((t) => String(t || '').trim().toUpperCase()).filter(Boolean);
        }
      }
    } catch {
      // Ignora erro de JSON corrompido
    }
    return [];
  }

  function saveSelectionToStorage(tickers) {
    try {
      const clean = Array.isArray(tickers)
        ? tickers.map((t) => String(t || '').trim().toUpperCase()).filter(Boolean)
        : [];
      sessionStorage.setItem(SESSION_KEY_SELECTION, JSON.stringify(clean));
    } catch (e) {
      console.warn('[Radar de Oportunidades] Erro ao salvar seleção na sessão:', e);
    }
  }

  function initSelection() {
    // A seleção inicia sempre vazia em uma nova sessão do usuário.
    // Preserva apenas as seleções explícitas feitas pelo usuário nesta sessão de trabalho.
    state.selectedTickers = loadSelectionFromStorage();
  }

  // =========================================================================
  // DATA FETCHING
  // =========================================================================

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
        state.marketCycles = payload.marketCycles || null;
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

  function getActiveMarketName(marketKey) {
    const key = String(marketKey || state.filters.market || 'ALL').toUpperCase();
    if (key === 'ALL') return 'Ações B3, BDRs e FIIs';
    if (key === 'IBOV') return 'Ações B3';
    if (key === 'IFIX') return 'FIIs';
    if (key === 'BDRS') return 'BDRs';
    return key;
  }

  function getActiveMarketCycle() {
    const marketFilter = state.filters.market || 'ALL';
    const cycles = state.marketCycles || {};

    let cycle = null;
    if (marketFilter === 'ALL') {
      cycle = cycles.ALL || null;
    } else if (marketFilter === 'IBOV') {
      cycle = cycles.IBOV || cycles.stock_b3 || null;
    } else if (marketFilter === 'IFIX') {
      cycle = cycles.IFIX || cycles.fii || null;
    } else if (marketFilter === 'BDRs') {
      cycle = cycles.BDRs || cycles.bdr || null;
    }

    if (cycle && cycle.state) {
      return {
        state: cycle.state,
        isDefensive: cycle.state !== 'healthy',
        marketName: getActiveMarketName(marketFilter),
        score: cycle.score
      };
    }

    if (marketFilter === 'BDRs') {
      return {
        state: 'defensive',
        isDefensive: true,
        marketName: 'BDRs',
        score: 24
      };
    }

    const isDef = (state.marketCycleState || 'healthy') !== 'healthy';
    return {
      state: isDef ? 'defensive' : 'healthy',
      isDefensive: isDef,
      marketName: getActiveMarketName(marketFilter),
      score: 50
    };
  }

  function renderHeaderCyclePill() {
    const cycle = getActiveMarketCycle();
    const isDefensive = cycle.isDefensive;

    return `
      <div class="radar-cycle-status-pill ${isDefensive ? 'defensive' : 'healthy'}" id="radarHeaderCyclePill">
        <span class="radar-cycle-status-dot" aria-hidden="true"></span>
        <div class="radar-cycle-status-info">
          <div class="radar-cycle-status-label">
            Ciclo de Mercado: <strong>${isDefensive ? 'DEFESA' : 'EXPANSÃO'}</strong>
          </div>
          <span class="radar-cycle-status-sub">
            ${isDefensive ? 'Tendência atual desfavorável para novas operações.' : 'Mercado favorável para novas operações.'}
          </span>
        </div>
      </div>
    `;
  }

  function renderDefenseCard(cycle) {
    const marketName = cycle?.marketName || 'BDRs';
    return `
      <div class="radar-defense-panel" role="alert" aria-label="Mercado em Modo Defesa">
        <div class="radar-defense-art">
          <img
            src="assets/opportunity-radar/defense-bear.jpg"
            alt="Modo Defesa - Preservação de Capital"
            class="radar-defense-bear-img"
            loading="eager"
          />
          <div class="radar-defense-art-overlay" aria-hidden="true"></div>
        </div>

        <div class="radar-defense-content">
          <div class="radar-defense-shield-badge">
            <span class="radar-defense-shield-icon" aria-hidden="true">🛡️</span>
            <span>MODO DEFESA</span>
          </div>

          <h2 class="radar-defense-title">Ciclo de Mercado em MODO DEFESA</h2>

          <p class="radar-defense-desc">
            O mercado de <strong>${esc(marketName)}</strong> está em tendência negativa no momento. Para proteger seu capital, o método recomenda <strong>NÃO abrir novas operações</strong> até que o ciclo volte a ficar favorável.
          </p>

          <div class="radar-defense-callout">
            <div class="radar-defense-callout-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div class="radar-defense-callout-text">
              <strong>Evite operar novos trades</strong>
              <span>Aguarde o mercado voltar para um ciclo positivo.</span>
            </div>
          </div>

          <div class="radar-defense-footer">
            <button type="button" class="radar-defense-btn-cycle" onclick="go('marketcycle')">
              Ver Ciclo de Mercado completo <span aria-hidden="true">→</span>
            </button>
            <span class="radar-defense-rule-hint">Regra de ouro: Primeiro a permissão do mercado, depois o setup.</span>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // TABLE RENDERING
  // =========================================================================

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

    const activeCycle = getActiveMarketCycle();
    // Se o mercado selecionado estiver em DEFESA, exibe o painel cinematográfico do Urso no lugar da lista
    if (activeCycle.isDefensive) {
      return renderDefenseCard(activeCycle);
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
      const sym = item.symbol;
      const marketLower = String(item.market || 'IBOV').toLowerCase();
      const tierClass = item.rsTier === 'leader' ? 'tier-leader' : '';
      const isSelected = root.OpportunityRadarModel.isSelected(state.selectedTickers, sym);

      return `
        <tr data-ticker="${esc(sym)}">
          <td>
            <div class="radar-asset-cell" onclick="window.openRadarTickerChart('${esc(sym)}')" style="cursor: pointer;" title="Abrir gráfico diário de ${esc(sym)}">
              ${renderAssetLogo(sym)}
              <div class="radar-asset-info">
                <span class="radar-asset-symbol">${esc(sym)}</span>
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
            <span class="radar-status-pill" title="Ativo pronto para entrada">↗ Pronto</span>
          </td>
          <td class="col-actions">
            <div class="radar-row-actions">
              <button type="button" class="radar-btn-paper-trading" onclick="window.openAddToPaperTradingModal('${esc(sym)}')">
                + Paper Trading
              </button>
              <button type="button" class="radar-btn-view-chart" onclick="window.openRadarTickerChart('${esc(sym)}')">
                Ver gráfico <span aria-hidden="true">→</span>
              </button>
              <button type="button" class="radar-btn-select ${isSelected ? 'selected' : ''}" onclick="window.toggleRadarRowSelection('${esc(sym)}')">
                ${isSelected ? '✓ Selecionado' : '+ Selecionar'}
              </button>
            </div>
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
              <th class="col-actions">AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  // =========================================================================
  // "MINHA SELEÇÃO" SECTION (TOP VISIBLE BAR, CHIPS & PROFIT CSV EXPORT)
  // =========================================================================

  function renderMinhaSelecaoSection() {
    const tickers = state.selectedTickers || [];
    const count = tickers.length;
    const enriched = root.OpportunityRadarModel.enrichSelectedItems(tickers, state.items, state.fallbackCatalog);

    if (count === 0) {
      return `
        <section class="radar-selection-bar is-empty" id="radarSelectionBar" aria-label="Minha seleção para o próximo pregão">
          <div class="radar-sel-bar-main">
            <div class="radar-sel-bar-title-wrap">
              <div class="radar-sel-target-badge" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <circle cx="12" cy="12" r="9"/>
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M15.5 8.5L19 5"/>
                </svg>
              </div>
              <div class="radar-sel-bar-label">
                <div class="radar-sel-bar-title-row">
                  <strong>Ativos selecionados <span class="radar-sel-count-pill empty">(0)</span></strong>
                </div>
                <span class="radar-sel-empty-text">Nenhum ativo selecionado. Clique em <strong>+ Selecionar</strong> em qualquer oportunidade na tabela abaixo.</span>
              </div>
            </div>
            <div class="radar-sel-bar-actions">
              <button type="button" class="radar-btn-sel-export disabled" disabled title="Selecione ao menos um ativo na tabela para exportar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Exportar CSV (Profit)
              </button>
            </div>
          </div>
        </section>
      `;
    }

    const chipsHtml = enriched.map((item) => {
      const sym = item.symbol;
      const changeVal = item.change1dPct;
      const changeClass = Number(changeVal) >= 0 ? 'positive' : 'negative';
      const changeFormatted = Number.isFinite(Number(changeVal)) ? formatSignedPercent(changeVal) : '';

      return `
        <div class="radar-sel-chip" data-ticker="${esc(sym)}">
          <span class="radar-sel-chip-sym" onclick="window.openRadarTickerChart('${esc(sym)}')" title="Abrir gráfico diário de ${esc(sym)}">${esc(sym)}</span>
          <span class="radar-sel-chip-price">${formatCurrency(item.price)}</span>
          ${changeFormatted ? `<span class="radar-sel-chip-change ${changeClass}">${esc(changeFormatted)}</span>` : ''}
          <button type="button" class="radar-sel-chip-remove" onclick="window.removeRadarSelectionTicker('${esc(sym)}')" title="Remover ${esc(sym)} da seleção" aria-label="Remover ${esc(sym)}">✕</button>
        </div>
      `;
    }).join('');

    const cardsHtml = enriched.map((item) => {
      const sym = item.symbol;
      const changeVal = item.change1dPct;
      const changeClass = Number(changeVal) >= 0 ? 'positive' : 'negative';
      const changeFormatted = Number.isFinite(Number(changeVal)) ? formatSignedPercent(changeVal) : '';

      return `
        <div class="radar-sel-card" data-ticker="${esc(sym)}">
          <div class="radar-sel-card-logo" onclick="window.openRadarTickerChart('${esc(sym)}')" style="cursor: pointer;" title="Abrir gráfico diário de ${esc(sym)}">
            ${renderAssetLogo(sym)}
          </div>
          <div class="radar-sel-card-content">
            <div class="radar-sel-card-top">
              <strong class="radar-sel-card-symbol" onclick="window.openRadarTickerChart('${esc(sym)}')" title="Ver gráfico de ${esc(sym)}">${esc(sym)}</strong>
              <button type="button" class="radar-sel-card-remove" onclick="window.removeRadarSelectionTicker('${esc(sym)}')" title="Remover ${esc(sym)} da seleção" aria-label="Remover ${esc(sym)}">✕</button>
            </div>
            <div class="radar-sel-card-name">${esc(item.name || sym)}</div>
            <div class="radar-sel-card-price-row">
              <span class="radar-sel-card-price">${formatCurrency(item.price)}</span>
              ${changeFormatted ? `<span class="radar-sel-card-change ${changeClass}">${esc(changeFormatted)}</span>` : ''}
            </div>
            <div class="radar-sel-card-sector">${esc(item.sector || 'Ações B3')}</div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <section class="radar-selection-bar has-items" id="radarSelectionBar" aria-label="Minha seleção para o próximo pregão">
        <div class="radar-sel-bar-main">
          <div class="radar-sel-bar-title-wrap">
            <div class="radar-sel-target-badge active" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div class="radar-sel-bar-label">
              <div class="radar-sel-bar-title-row">
                <strong>Ativos selecionados <span class="radar-sel-count-pill active" id="radarSelCountPill">(${count})</span></strong>
                <span class="radar-sel-hint">Prontos para exportar ao Profit Chart</span>
              </div>
            </div>
          </div>

          <div class="radar-sel-bar-actions">
            <button type="button" class="radar-btn-sel-toggle-expand" onclick="window.toggleRadarSelectionDetails()" title="Expandir ou recolher detalhes dos ativos">
              <span>${state.selectionExpanded ? 'Recolher detalhes ▲' : 'Ver detalhes ▼'}</span>
            </button>
            <button type="button" class="radar-btn-sel-clear" onclick="window.clearRadarSelectionWithConfirm()" title="Limpar todos os ativos selecionados">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Limpar seleção
            </button>
            <button type="button" class="radar-btn-sel-export active" onclick="window.exportRadarSelectionProfitCsv()" title="Exportar arquivo CSV com os ativos selecionados para o Profit Chart">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exportar CSV (Profit)
            </button>
          </div>
        </div>

        <div class="radar-sel-chips-row" id="radarSelChipsRow">
          ${chipsHtml}
        </div>

        ${state.selectionExpanded ? `
          <div class="radar-sel-details-panel">
            <div class="radar-selection-cards-wrap">
              ${cardsHtml}
            </div>
            <div class="radar-selection-disclaimer">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <span>O arquivo CSV será gerado apenas com os tickers selecionados, no formato compatível com a importação de listas do Profit Chart.</span>
            </div>
          </div>
        ` : ''}
      </section>
    `;
  }

  // =========================================================================
  // ACTIONS & INTERACTIONS
  // =========================================================================

  function toggleRadarRowSelection(symbol) {
    const sym = root.OpportunityRadarModel.normalizeTicker(symbol);
    if (!sym) return;

    state.selectedTickers = root.OpportunityRadarModel.toggleSelection(state.selectedTickers, sym);
    saveSelectionToStorage(state.selectedTickers);

    // Salva fallback se disponível
    const found = state.items.find((i) => i.symbol === sym);
    if (found) {
      state.fallbackCatalog[sym] = {
        name: found.name,
        price: found.lastPrice || found.entry,
        change1dPct: found.change1dPct,
        sector: found.sector,
        market: found.market
      };
    }

    updateRowSelectionButtonsOnly();
    updateSelectionUiOnly();
  }

  function removeRadarSelectionTicker(symbol) {
    const sym = root.OpportunityRadarModel.normalizeTicker(symbol);
    if (!sym) return;

    state.selectedTickers = root.OpportunityRadarModel.removeSelection(state.selectedTickers, sym);
    saveSelectionToStorage(state.selectedTickers);

    updateRowSelectionButtonsOnly();
    updateSelectionUiOnly();
  }

  function clearRadarSelectionWithConfirm() {
    const count = state.selectedTickers.length;
    if (count === 0) return;

    const confirmed = window.confirm(`Deseja realmente limpar todos os ${count} ativo(s) da sua seleção?`);
    if (!confirmed) return;

    state.selectedTickers = [];
    saveSelectionToStorage(state.selectedTickers);

    updateRowSelectionButtonsOnly();
    updateSelectionUiOnly();

    if (typeof root.showToast === 'function') {
      root.showToast('Seleção de ativos esvaziada.', 'info');
    }
  }

  function exportRadarSelectionProfitCsv() {
    const count = state.selectedTickers.length;
    if (count === 0) {
      if (typeof root.showToast === 'function') {
        root.showToast('Nenhum ativo selecionado para exportação.', 'warn');
      } else {
        alert('Nenhum ativo selecionado para exportação.');
      }
      return;
    }

    const result = root.OpportunityRadarModel.generateProfitChartCsv(state.selectedTickers, new Date());
    if (!result.success) {
      if (typeof root.showToast === 'function') {
        root.showToast(result.error, 'error');
      } else {
        alert(result.error);
      }
      return;
    }

    try {
      const blob = new Blob([result.csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', result.filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (typeof root.showToast === 'function') {
        root.showToast(`Exportação concluída! ${result.count} ativo(s) prontos para o Profit Chart.`, 'success');
      }
    } catch (err) {
      console.error('[Radar de Oportunidades] Falha no download do CSV:', err);
      if (typeof root.showToast === 'function') {
        root.showToast('Erro ao baixar o arquivo CSV.', 'error');
      }
    }
  }

  /**
   * Navega diretamente para a tela Gráficos existente carregando o ticker selecionado no gráfico Diário.
   */
  function openRadarTickerChart(symbol) {
    const sym = String(symbol || '').trim().toUpperCase();
    if (!sym) return;

    root.__chartReturnSource = 'opportunityradar';
    root.__radarLastViewedTicker = sym;
    root.__pendingChartsTicker = sym;
    if (typeof root.go === 'function') {
      root.go('charts', sym);
    }
    if (typeof root.loadTickerChart === 'function') {
      root.loadTickerChart(sym);
    }
  }

  // =========================================================================
  // DOM UPDATES (TARGETED TO PRESERVE FOCUS & FILTERS)
  // =========================================================================

  function updateRowSelectionButtonsOnly() {
    const rows = document.querySelectorAll('#radarTableRegion tr[data-ticker]');
    rows.forEach((row) => {
      const sym = row.getAttribute('data-ticker');
      const btn = row.querySelector('.radar-btn-select');
      if (btn) {
        const isSel = root.OpportunityRadarModel.isSelected(state.selectedTickers, sym);
        btn.classList.toggle('selected', isSel);
        btn.textContent = isSel ? '✓ Selecionado' : '+ Selecionar';
      }
    });
  }

  function updateSelectionUiOnly() {
    const container = document.getElementById('radarSelectionContainer');
    if (container) {
      container.innerHTML = renderMinhaSelecaoSection();
      initRenderedLogos(container);
    }
  }

  function updateTableAndCounterOnly() {
    const activeCycle = getActiveMarketCycle();
    const filteredItems = getFilteredItems();

    const pillContainer = document.getElementById('radarHeaderCycleContainer');
    if (pillContainer) {
      pillContainer.innerHTML = renderHeaderCyclePill();
    }

    const countEl = document.getElementById('radarReadyCountBadge');
    if (countEl) {
      countEl.textContent = activeCycle.isDefensive ? '0' : String(filteredItems.length);
    }

    const descEl = document.getElementById('radarReadyDesc');
    if (descEl) {
      descEl.textContent = activeCycle.isDefensive
        ? 'Mercado em modo defesa. Preservar capital e aguardar o alinhamento do ciclo.'
        : 'Ativos que atendem a todos os critérios do seu método e possuem gatilho de entrada confirmado.';
    }

    const mainCard = document.querySelector('.radar-main-card');
    if (mainCard) {
      mainCard.classList.toggle('is-defensive', Boolean(activeCycle.isDefensive));
    }

    const tableRegion = document.getElementById('radarTableRegion');
    if (tableRegion) {
      tableRegion.innerHTML = renderTableRows(filteredItems);
      initRenderedLogos(tableRegion);
    }
  }

  // =========================================================================
  // MAIN SCREEN DOM SHELL
  // =========================================================================

  function renderOpportunityRadarDom() {
    const container = document.getElementById('opportunityRadarRoot');
    if (!container) return;

    const activeCycle = getActiveMarketCycle();
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
            <div id="radarHeaderCycleContainer">
              ${renderHeaderCyclePill()}
            </div>

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
              <input type="text" id="radarSearchInput" placeholder="Buscar por ticker ou nome..." value="${esc(state.filters.search)}" autocomplete="off" style="text-transform: uppercase;" />
            </div>
          </div>
        </section>

        <!-- Seção Persistente no Topo: Minha Seleção para Monitoramento e Exportação Profit Chart -->
        <div id="radarSelectionContainer">
          ${renderMinhaSelecaoSection()}
        </div>

        <!-- Tabela Principal de Ativos Prontos para Entrada (Largura total sem painel lateral) -->
        <section class="radar-main-card ${activeCycle.isDefensive ? 'is-defensive' : ''}">
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
              <span class="radar-ready-count" id="radarReadyCountBadge">${activeCycle.isDefensive ? '0' : filteredItems.length}</span>
            </div>
            <span class="radar-ready-desc" id="radarReadyDesc">${activeCycle.isDefensive ? 'Mercado em modo defesa. Preservar capital e aguardar o alinhamento do ciclo.' : 'Ativos que atendem a todos os critérios do seu método e possuem gatilho de entrada confirmado.'}</span>
          </div>

          <div id="radarTableRegion">
            ${renderTableRows(filteredItems)}
          </div>
        </section>

        <!-- Cards informativos inferiores -->
        <section class="radar-bottom-grid" aria-label="Informações e avisos operacionais">
          <div class="radar-info-card radar-requirements-card">
            <div class="radar-info-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </div>
            <div class="radar-info-body">
              <div class="radar-info-header">
                <h3>Requisitos Obrigatórios de Entrada</h3>
                <p class="radar-info-desc">O ativo deve atender a todos os critérios abaixo para ser considerado uma oportunidade.</p>
              </div>
              <ul class="radar-criteria-list">
                <li><span class="radar-check-icon"><svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#159967"/><path d="M6 10.2L8.7 13 14 7.5" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span> Força Relativa (3M) &gt; 80</li>
                <li><span class="radar-check-icon"><svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#159967"/><path d="M6 10.2L8.7 13 14 7.5" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span> Ciclo de Mercado Positivo</li>
                <li><span class="radar-check-icon"><svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#159967"/><path d="M6 10.2L8.7 13 14 7.5" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span> Preço &gt; EMA 9 &gt; EMA 30 (Diário)</li>
                <li><span class="radar-check-icon"><svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#159967"/><path d="M6 10.2L8.7 13 14 7.5" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span> Gatilhos: Inside Bar, 123 Buy, PFR de Compra</li>
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
                Gatilho identificado no fechamento não significa entrada automática no próximo pregão.
                Sempre valide o preço de entrada, stop, risco e gestão da posição antes de operar.
              </p>
            </div>
          </div>
        </section>
      </div>
    `;

    bindFilterEvents();
    initRenderedLogos(container);
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
        e.target.value = (e.target.value || '').toUpperCase();
        state.filters.search = e.target.value;
        updateTableAndCounterOnly();
      });
    }
  }

  // =========================================================================
  // PUBLIC API & EXTERNAL BRIDGE
  // =========================================================================

  function renderOpportunityRadar() {
    initSelection();
    renderOpportunityRadarDom();
    if (!state.loaded && !state.loading) {
      fetchRadarData(false);
    }
  }

  function refreshOpportunityRadar() {
    fetchRadarData(true);
  }

  // Bridge global para que todas as outras telas (Emerging Leaders, Fundamentos,
  // Relative Strength, Market Scans, Gráficos) adicionem ativos diretamente à Minha Seleção
  root.addToWatchlist = async function (symbol, context = {}) {
    const sym = root.OpportunityRadarModel
      ? root.OpportunityRadarModel.normalizeTicker(symbol)
      : String(symbol || '').trim().toUpperCase();
    if (!sym) return;

    const prev = loadSelectionFromStorage();
    const next = root.OpportunityRadarModel
      ? root.OpportunityRadarModel.addSelection(prev, sym)
      : (prev.includes(sym) ? prev : [...prev, sym]);

    saveSelectionToStorage(next);
    state.selectedTickers = next;

    if (context && (context.name || context.price || context.sector)) {
      state.fallbackCatalog[sym] = {
        name: context.name,
        price: context.price,
        change1dPct: context.change1dPct ?? context.changePct,
        sector: context.sector,
        market: context.market
      };
    }

    updateRowSelectionButtonsOnly();
    updateSelectionUiOnly();

    if (typeof root.showToast === 'function') {
      root.showToast(`${sym} adicionado à Minha Seleção no Radar de Oportunidades.`, 'success');
    }
  };

  root.toggleRadarSelectionDetails = function () {
    state.selectionExpanded = !state.selectionExpanded;
    updateSelectionUiOnly();
  };

  root.highlightRadarTickerRow = function (symbol) {
    const sym = String(symbol || '').trim().toUpperCase();
    if (!sym) return;
    const row = document.querySelector(`#radarTableRegion tr[data-ticker="${sym}"]`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.classList.remove('radar-row-highlight');
      void row.offsetWidth; // trigger reflow
      row.classList.add('radar-row-highlight');
      setTimeout(() => {
        row.classList.remove('radar-row-highlight');
      }, 2500);
    }
  };

  root.getRadarSelectedTickers = function () {
    return state.selectedTickers || loadSelectionFromStorage();
  };

  root.openAddToPaperTradingModal = function (symbol) {
    const sym = String(symbol || '').trim().toUpperCase();
    const item = state.items.find(x => x.symbol === sym);
    if (!item) {
      if (typeof root.showToast === 'function') root.showToast('Oportunidade não encontrada no Radar.');
      return;
    }

    const existing = document.getElementById('paperPendingModal');
    if (existing) existing.remove();

    const equity = typeof root.getOperationalEquity === 'function' ? root.getOperationalEquity() : (root.OPERATIONAL_EQUITY || 100000);
    let riskPct = 0.002;
    if (root.TradingRubrics && typeof root.TradingRubrics.normalizePolicy === 'function' && root.riskPolicyState) {
      const pol = root.TradingRubrics.normalizePolicy(root.riskPolicyState);
      const gradeObj = (pol.grades || []).find(g => g.grade === (item.grade || 'A'));
      if (gradeObj && Number(gradeObj.riskPct) > 0) riskPct = Number(gradeObj.riskPct);
    }

    const suggestedQty = root.PaperTradingPendingModel
      ? root.PaperTradingPendingModel.calculatePendingQuantity({
          equity,
          riskPct,
          entry: item.entry,
          stop: item.stop,
          lot: 100
        })
      : Math.max(100, Math.floor((equity * riskPct) / (Math.abs(item.entry - item.stop) || 1) / 100) * 100);

    const initialQty = suggestedQty > 0 ? suggestedQty : 100;
    const initialRisk = Math.abs(item.entry - item.stop) * initialQty;
    const initialRiskPct = equity > 0 ? (initialRisk / equity) * 100 : 0;

    const overlay = document.createElement('div');
    overlay.id = 'paperPendingModal';
    overlay.className = 'paper-pending-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'paperPendingModalTitle');

    overlay.innerHTML = `
      <div class="paper-pending-modal-card" onclick="event.stopPropagation()">
        <header class="paper-pending-modal-header">
          <div class="paper-pending-asset-brand">
            <div class="paper-pending-logo-wrap">
              ${renderAssetLogo(sym)}
            </div>
            <div class="paper-pending-asset-titles">
              <h2 id="paperPendingModalTitle">${esc(sym)}</h2>
              <p>${esc(item.name || sym)} · ${esc(item.market || 'B3')}</p>
            </div>
          </div>
          <button type="button" class="paper-pending-modal-close" onclick="window.closeAddToPaperTradingModal()" aria-label="Fechar">×</button>
        </header>

        <div style="margin-top: 14px; display: flex; align-items: center; gap: 8px;">
          <span class="paper-pending-trigger-badge">
            Gatilho: ${esc(item.triggerName || item.triggerId || 'Gatilho Técnico')}
          </span>
          <span class="radar-grade-badge grade-${esc(String(item.grade || 'B').toLowerCase())}">
            Grade ${esc(item.grade || 'B')}
          </span>
        </div>

        <div class="paper-pending-callout">
          <span class="paper-pending-callout-icon">⏱</span>
          <div>
            <strong>Aguardando execução no pregão</strong>
            <p>A posição será adicionada ao Paper Trading em modo pendente. No fechamento diário, o sistema avaliará se a máxima atingiu o preço planejado sem violar o stop.</p>
          </div>
        </div>

        <form id="paperPendingForm" onsubmit="window.submitAddToPaperTradingModal(event, '${esc(sym)}')">
          <div class="paper-pending-form-grid">
            <div class="paper-pending-field">
              <label for="paperPendingEntry">Preço de Entrada (R$)</label>
              <input type="number" id="paperPendingEntry" step="0.01" min="0.01" value="${Number(item.entry).toFixed(2)}" required oninput="window.recalculatePendingModalRisk()" />
            </div>

            <div class="paper-pending-field">
              <label for="paperPendingStop">Stop Inicial (R$)</label>
              <input type="number" id="paperPendingStop" step="0.01" min="0.01" value="${Number(item.stop).toFixed(2)}" required oninput="window.recalculatePendingModalRisk()" />
            </div>

            <div class="paper-pending-field">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label for="paperPendingQty">Quantidade (ações)</label>
                <div style="display: flex; gap: 4px;">
                  <button type="button" class="paper-pending-stepper-btn" onclick="window.adjustPendingModalQty(-100)" title="Diminuir 100 ações">-100</button>
                  <button type="button" class="paper-pending-stepper-btn" onclick="window.adjustPendingModalQty(100)" title="Aumentar 100 ações">+100</button>
                </div>
              </div>
              <input type="number" id="paperPendingQty" step="1" min="1" value="${initialQty}" required oninput="window.recalculatePendingModalRisk()" />
            </div>

            <div class="paper-pending-field">
              <label for="paperPendingValidity">Validade da ordem</label>
              <select id="paperPendingValidity">
                <option value="1" selected>1 pregão (fechamento de hoje)</option>
                <option value="2">2 pregões</option>
                <option value="3">3 pregões</option>
              </select>
            </div>

            <div class="paper-pending-risk-summary" id="paperPendingRiskSummary">
              <span>Distância Stop: <strong id="paperPendingDistVal">R$ ${(Math.abs(item.entry - item.stop)).toFixed(2)}</strong></span>
              <span>Risco Estimado: <strong id="paperPendingRiskVal">R$ ${initialRisk.toFixed(2)} (${initialRiskPct.toFixed(2)}%)</strong></span>
            </div>

            <div class="paper-pending-field full-width">
              <label for="paperPendingNotes">Observações / Tese (opcional)</label>
              <textarea id="paperPendingNotes" rows="2" placeholder="Ex: Gatilho confirmado com volume no gráfico diário...">${esc(item.notes || '')}</textarea>
            </div>
          </div>

          <div class="paper-pending-modal-actions">
            <button type="button" class="paper-pending-btn-cancel" onclick="window.closeAddToPaperTradingModal()">Cancelar</button>
            <button type="submit" class="paper-pending-btn-submit" id="paperPendingSubmitBtn">
              + Adicionar ao Paper Trading
            </button>
          </div>
        </form>
      </div>
    `;

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) window.closeAddToPaperTradingModal();
    });

    document.body.appendChild(overlay);
    setTimeout(() => {
      document.getElementById('paperPendingQty')?.focus();
    }, 50);
  };

  root.recalculatePendingModalRisk = function () {
    const entryEl = document.getElementById('paperPendingEntry');
    const stopEl = document.getElementById('paperPendingStop');
    const qtyEl = document.getElementById('paperPendingQty');
    const distVal = document.getElementById('paperPendingDistVal');
    const riskVal = document.getElementById('paperPendingRiskVal');
    if (!entryEl || !stopEl || !qtyEl || !distVal || !riskVal) return;

    const entry = Number(entryEl.value) || 0;
    const stop = Number(stopEl.value) || 0;
    const qty = Number(qtyEl.value) || 0;
    const equity = typeof root.getOperationalEquity === 'function' ? root.getOperationalEquity() : (root.OPERATIONAL_EQUITY || 100000);

    const dist = Math.abs(entry - stop);
    const risk = dist * qty;
    const riskPct = equity > 0 ? (risk / equity) * 100 : 0;

    distVal.textContent = 'R$ ' + dist.toFixed(2);
    riskVal.textContent = `R$ ${risk.toFixed(2)} (${riskPct.toFixed(2)}%)`;
  };

  root.closeAddToPaperTradingModal = function () {
    const el = document.getElementById('paperPendingModal');
    if (el) el.remove();
  };

  root.submitAddToPaperTradingModal = async function (event, symbol) {
    if (event && event.preventDefault) event.preventDefault();
    const sym = String(symbol || '').trim().toUpperCase();
    const item = state.items.find(x => x.symbol === sym);
    if (!item) return;

    const entryEl = document.getElementById('paperPendingEntry');
    const stopEl = document.getElementById('paperPendingStop');
    const qtyEl = document.getElementById('paperPendingQty');
    const valEl = document.getElementById('paperPendingValidity');
    const notesEl = document.getElementById('paperPendingNotes');
    const submitBtn = document.getElementById('paperPendingSubmitBtn');

    const entry = Number(entryEl?.value) || 0;
    const stop = Number(stopEl?.value) || 0;
    const qty = Number(qtyEl?.value) || 0;
    const validitySessions = Number(valEl?.value) || 1;
    const notes = String(notesEl?.value || '').trim();

    if (entry <= 0 || stop <= 0 || qty <= 0) {
      if (typeof root.showToast === 'function') root.showToast('Preencha entrada, stop e quantidade válidos.');
      return;
    }

    if (stop >= entry) {
      if (typeof root.showToast === 'function') root.showToast('Para compra, o stop deve estar abaixo da entrada.');
      return;
    }

    if (!root.healthyTrendApi?.isAuthenticated()) {
      if (typeof root.showToast === 'function') root.showToast('Entre no workspace para salvar ordens no Paper Trading.');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Salvando…';
    }

    try {
      const payload = {
        ticker: sym,
        name: item.name || sym,
        market: item.market || 'Ações',
        direction: 'long',
        setup: item.triggerName || item.triggerId || 'Setup Técnico',
        setupTrigger: item.triggerId || '123_COMPRA',
        entryPrice: entry,
        stopPrice: stop,
        plannedQuantity: qty,
        grade: item.grade || 'A',
        rubricScore: item.rubricScore || 85,
        rsScore: item.rsScore || 80,
        notes,
        validitySessions,
        mode: 'paper'
      };

      await root.healthyTrendApi.request('/api/trades/pending', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      root.closeAddToPaperTradingModal();
      if (typeof root.showToast === 'function') {
        root.showToast(`Ordem de ${sym} adicionada ao Paper Trading (Aguardando execução).`);
      }

      if (typeof root.syncOperationalFromDatabase === 'function') {
        await root.syncOperationalFromDatabase();
      }

      if (typeof root.go === 'function') {
        root.go('positions');
      }
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '+ Adicionar ao Paper Trading';
      }
      if (typeof root.showToast === 'function') {
        root.showToast(err.message || 'Erro ao adicionar ordem ao Paper Trading.');
      }
    }
  };

  root.adjustPendingModalQty = function (delta) {
    const qtyEl = document.getElementById('paperPendingQty');
    if (!qtyEl) return;
    const current = Number(qtyEl.value) || 0;
    const next = Math.max(1, current + delta);
    qtyEl.value = next;
    root.recalculatePendingModalRisk();
  };

  root.renderOpportunityRadar = renderOpportunityRadar;
  root.refreshOpportunityRadar = refreshOpportunityRadar;
  root.openRadarTickerChart = openRadarTickerChart;
  root.toggleRadarRowSelection = toggleRadarRowSelection;
  root.removeRadarSelectionTicker = removeRadarSelectionTicker;
  root.clearRadarSelectionWithConfirm = clearRadarSelectionWithConfirm;
  root.exportRadarSelectionProfitCsv = exportRadarSelectionProfitCsv;
  root.openAddToPaperTradingModal = root.openAddToPaperTradingModal;
  root.closeAddToPaperTradingModal = root.closeAddToPaperTradingModal;
  root.submitAddToPaperTradingModal = root.submitAddToPaperTradingModal;
  root.recalculatePendingModalRisk = root.recalculatePendingModalRisk;
  root.adjustPendingModalQty = root.adjustPendingModalQty;

})(typeof globalThis !== 'undefined' ? globalThis : this);
