/* ==========================================================================
   Healthy Trend Trader — Força Relativa V3 (Diário e Semanal)
   Implementação de Swing Trade (Diário) e Position Trade (Semanal)
   Com Barra Lateral Interna de Filtros, Seletor de Modalidade e Cards 100% alinhados
   ========================================================================== */
(function () {
  'use strict';

  // Global State
  window.currentRelativeStrengthMarket = window.currentRelativeStrengthMarket || 'b3';
  window.currentRelativeStrengthTimeframe = window.currentRelativeStrengthTimeframe || 'daily';
  window.relativeStrengthSearchQuery = '';
  window.relativeStrengthSelectedGroup = '';
  window.relativeStrengthPageSize = 10;
  window.relativeStrengthCurrentPage = 1;

  function renderRelativeStrengthClassesPage() {
    return renderRelativeStrengthWorkspace();
  }
  window.renderRelativeStrengthClassesPage = renderRelativeStrengthClassesPage;

  const text = (pt, en) => window.appLanguage === 'en-US' ? en : pt;

  // Reversible sector localization dictionary
  const sectorNames = {
    'commercial services': ['Serviços comerciais', 'Commercial services'],
    'communications': ['Comunicações', 'Communications'],
    'consumer durables': ['Bens de consumo duráveis', 'Consumer durables'],
    'consumer non-durables': ['Bens de consumo não duráveis', 'Consumer non-durables'],
    'consumer services': ['Serviços ao consumidor', 'Consumer services'],
    'distribution services': ['Serviços de distribuição', 'Distribution services'],
    'electronic technology': ['Tecnologia eletrônica', 'Electronic technology'],
    'energy minerals': ['Energia e minerais', 'Energy minerals'],
    'finance': ['Financeiro', 'Financials'],
    'financials': ['Financeiro', 'Financials'],
    'health services': ['Serviços de saúde', 'Health services'],
    'health technology': ['Tecnologia em saúde', 'Health technology'],
    'industrial services': ['Serviços industriais', 'Industrial services'],
    'non-energy minerals': ['Materiais não energéticos', 'Non-energy minerals'],
    'process industries': ['Indústrias de processo', 'Process industries'],
    'producer manufacturing': ['Indústria de transformação', 'Producer manufacturing'],
    'retail trade': ['Comércio varejista', 'Retail trade'],
    'technology services': ['Serviços de tecnologia', 'Technology services'],
    'transportation': ['Transportes', 'Transportation'],
    'utilities': ['Serviços públicos', 'Utilities'],
    'comércio varejista': ['Comércio varejista', 'Retail trade'],
    'tecnologia eletrônica': ['Tecnologia eletrônica', 'Electronic technology'],
    'materiais não energéticos': ['Materiais não energéticos', 'Non-energy minerals'],
    'serviços de saúde': ['Serviços de saúde', 'Health services'],
    'financeiro': ['Financeiro', 'Financials'],
    'indústria de transformação': ['Indústria de transformação', 'Producer manufacturing'],
    'indústrias de processo': ['Indústrias de processo', 'Process industries'],
    'bens de consumo duráveis': ['Bens de consumo duráveis', 'Consumer durables'],
    'bens de consumo não duráveis': ['Bens de consumo não duráveis', 'Consumer non-durables'],
    'serviços de distribuição': ['Serviços de distribuição', 'Distribution services'],
    'serviços comerciais': ['Serviços comerciais', 'Commercial services'],
    'serviços ao consumidor': ['Serviços ao consumidor', 'Consumer services'],
    'energia e minerais': ['Energia e minerais', 'Energy minerals'],
    'transportes': ['Transportes', 'Transportation'],
    'serviços de tecnologia': ['Serviços de tecnologia', 'Technology services'],
    'serviços públicos': ['Serviços públicos', 'Utilities'],
    'serviços industriais': ['Serviços industriais', 'Industrial services'],
    'comunicações': ['Comunicações', 'Communications'],
    'tecnologia em saúde': ['Tecnologia em saúde', 'Health technology'],
    'logística': ['Logística', 'Logistics'],
    'lajes corporativas': ['Lajes corporativas', 'Corporate offices'],
    'papel/cri': ['Papel/CRI', 'Paper/CRI'],
    'shopping': ['Shopping', 'Shopping'],
    'híbridos': ['Híbridos', 'Hybrid'],
    'outros': ['Outros', 'Other'],
    'tecnologia': ['Tecnologia', 'Technology'],
    'comunicação': ['Comunicação', 'Communication'],
    'consumo': ['Consumo', 'Consumer'],
    'consumo cíclico': ['Consumo Cíclico', 'Cyclical Consumer'],
    'consumo não cíclico': ['Consumo Não Cíclico', 'Non-cyclical Consumer'],
    'petróleo, gás e biocomb.': ['Petróleo, Gás e Biocomb.', 'Oil, Gas & Biofuels'],
    'mineração e siderurgia': ['Mineração e Siderurgia', 'Mining & Steel'],
    'bens industriais': ['Bens Industriais', 'Industrial Goods'],
    'construção civil': ['Construção Civil', 'Civil Construction'],
    'educação': ['Educação', 'Education'],
    'saúde': ['Saúde', 'Healthcare'],
    'transporte e logística': ['Transporte e Logística', 'Transport & Logistics']
  };

  function localizedSector(value) {
    const source = String(value || '').trim();
    if (!source) return text('Não classificado', 'Unclassified');
    const pair = sectorNames[source.toLowerCase()];
    if (pair) return pair[window.appLanguage === 'en-US' ? 1 : 0];
    return source;
  }
  window.relativeClassSectorLabel = localizedSector;

  function formatDisplayDate(rawDate) {
    if (!rawDate) return '07/10/2026';
    const str = String(rawDate).trim();
    if (/^\d{8}$/.test(str)) {
      return `${str.slice(6, 8)}/${str.slice(4, 6)}/${str.slice(0, 4)}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const parts = str.slice(0, 10).split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return str;
  }

  function formatReturn(val) {
    if (!Number.isFinite(val)) return '—';
    const prefix = val >= 0 ? '+' : '';
    return `${prefix}${val.toFixed(1).replace('.', ',')}%`;
  }

  function getLeituraInfo(item, timeframe) {
    const score = Number(item.score ?? item.rsScore ?? 0);
    const trendState = item.weeklyTrend?.state || item.trendState;

    if (timeframe === 'weekly') {
      if (score >= 90) {
        if (trendState === 'BEARISH' || trendState === 'NEUTRAL') {
          return { label: text('Em observação', 'Under observation'), icon: '⏱️', tierClass: 'observation' };
        }
        return score >= 95
          ? { label: text('Líder Excepcional', 'Exceptional Leader'), icon: '🏆', tierClass: 'leader' }
          : { label: text('Líder', 'Leader'), icon: '🏆', tierClass: 'leader' };
      }
      if (score >= 80) return { label: text('Qualificado', 'Qualified'), icon: '📊', tierClass: 'qualified' };
      if (score >= 70) return { label: text('Acompanhar', 'Watch'), icon: '👁️', tierClass: 'watch' };
      if (score >= 50) return { label: text('Em observação', 'Under observation'), icon: '⏱️', tierClass: 'observation' };
      return { label: text('Abaixo do filtro', 'Below filter'), icon: '❗', tierClass: 'laggard' };
    } else {
      // Swing Trade (Diário)
      if (score >= 95) return { label: text('Líder Excepcional', 'Exceptional Leader'), icon: '🏆', tierClass: 'leader' };
      if (score >= 90) return { label: text('Líder', 'Leader'), icon: '🏆', tierClass: 'leader' };
      if (score >= 85) return { label: text('Força Alta', 'High Strength'), icon: '📊', tierClass: 'qualified' };
      if (score >= 80) return { label: text('Qualificado', 'Qualified'), icon: '📊', tierClass: 'qualified' };
      if (score >= 70) return { label: text('Acompanhar', 'Watch'), icon: '👁️', tierClass: 'watch' };
      if (score >= 50) return { label: text('Em observação', 'Under observation'), icon: '⏱️', tierClass: 'observation' };
      return { label: text('Abaixo do filtro', 'Below filter'), icon: '❗', tierClass: 'laggard' };
    }
  }

  function getScoreBadgeClass(score) {
    if (score >= 90) return 'rs-score-leader';
    if (score >= 80) return 'rs-score-qualified';
    if (score >= 70) return 'rs-score-watch';
    if (score >= 50) return 'rs-score-observation';
    return 'rs-score-laggard';
  }

  // --- Handlers & Global Switchers ---

  window.switchRelativeStrengthMarket = function (market) {
    window.currentRelativeStrengthMarket = market;
    window.relativeStrengthSearchQuery = '';
    window.relativeStrengthSelectedGroup = '';
    window.relativeStrengthCurrentPage = 1;
    if (market === 'b3' && window.relativeStrengthClassesState) {
      if (!['stock_ibov', 'stock_other', 'fii', 'bdr'].includes(window.relativeStrengthClassesState.selected)) {
        window.relativeStrengthClassesState.selected = 'stock_ibov';
      }
    }
    renderRelativeStrengthClassesPage();
    if (market === 'nasdaq' && typeof window.fetchNasdaqData === 'function') {
      window.fetchNasdaqData(window.currentRelativeStrengthTimeframe || 'daily').then(() => {
        renderRelativeStrengthClassesPage();
      }).catch(() => {});
    }
  };

  window.switchRelativeStrengthTimeframe = async function (timeframe) {
    if (window.currentRelativeStrengthTimeframe === timeframe) return;
    window.currentRelativeStrengthTimeframe = timeframe;
    window.relativeStrengthCurrentPage = 1;

    const state = window.relativeStrengthClassesState;
    if (state) {
      if (timeframe === 'weekly') {
        state.classes = state.weeklyClasses || (window.__relativeStrengthStaticCache && window.__relativeStrengthStaticCache.weekly) || state.classes;
      } else {
        state.classes = state.dailyClasses || (window.__relativeStrengthStaticCache && window.__relativeStrengthStaticCache.daily) || state.classes;
      }
    }

    renderRelativeStrengthClassesPage();

    if (window.currentRelativeStrengthMarket === 'nasdaq') {
      if (typeof window.fetchNasdaqData === 'function') {
        window.fetchNasdaqData(timeframe).then(() => renderRelativeStrengthClassesPage()).catch(() => {});
      }
    } else {
      if (typeof window.loadRelativeStrengthClassesForTimeframe === 'function') {
        window.loadRelativeStrengthClassesForTimeframe(timeframe).catch(() => {});
      }
    }
  };

  window.selectRelativeStrengthClass = function (classKey) {
    if (window.relativeStrengthClassesState) {
      window.relativeStrengthClassesState.selected = classKey;
    }
    window.relativeStrengthSelectedGroup = '';
    window.relativeStrengthCurrentPage = 1;
    renderRelativeStrengthClassesPage();
  };

  window.handleRelativeStrengthSearch = function (value) {
    window.relativeStrengthSearchQuery = String(value || '');
    window.relativeStrengthCurrentPage = 1;
    updateTableAndPaginationOnly();
  };

  window.handleRelativeStrengthGroupChange = function (value) {
    window.relativeStrengthSelectedGroup = String(value || '');
    window.relativeStrengthCurrentPage = 1;
    updateTableAndPaginationOnly();
  };

  window.handleRelativeStrengthPageSizeChange = function (value) {
    window.relativeStrengthPageSize = value === 'all' ? 'all' : Number(value);
    window.relativeStrengthCurrentPage = 1;
    updateTableAndPaginationOnly();
  };

  window.handleRelativeStrengthPageChange = function (page) {
    window.relativeStrengthCurrentPage = Number(page);
    updateTableAndPaginationOnly();
  };

  window.loadRelativeStrengthClassesForTimeframe = async function (timeframe = 'daily') {
    if (!window.relativeStrengthClassesState) return;
    const isWeekly = timeframe === 'weekly';
    const endpoint = `/api/relative-strength/classes${isWeekly ? '?timeframe=weekly' : ''}`;
    try {
      let payload;
      if (window.healthyTrendApi && typeof window.healthyTrendApi.request === 'function') {
        payload = await window.healthyTrendApi.request(endpoint);
      } else {
        const url = (window.MARKET_DATA_API_URL || 'http://localhost:8787/api') + endpoint;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Classes indisponíveis');
        payload = await res.json();
      }
      const classes = payload.classes || {};
      window.relativeStrengthClassesState.updatedAt = payload.updatedAt || null;
      window.relativeStrengthClassesState.dataAsOf = payload.dataAsOf || null;
      window.relativeStrengthClassesState.source = payload.source || null;
      window.relativeStrengthClassesState.timeframe = payload.timeframe || timeframe;
      if (isWeekly) {
        window.relativeStrengthClassesState.weeklyClasses = classes;
      } else {
        window.relativeStrengthClassesState.dailyClasses = classes;
      }
      if (window.currentRelativeStrengthTimeframe === timeframe) {
        window.relativeStrengthClassesState.classes = classes;
        renderRelativeStrengthClassesPage();
      }
      window.relativeStrengthClassesState.error = false;
    } catch (err) {
      console.info('[rs-v3] Cache offline ativo para classes de força relativa (' + timeframe + ').');
      const staticCache = window.__relativeStrengthStaticCache;
      if (staticCache && staticCache[timeframe]) {
        if (isWeekly) {
          window.relativeStrengthClassesState.weeklyClasses = window.relativeStrengthClassesState.weeklyClasses || staticCache.weekly;
        } else {
          window.relativeStrengthClassesState.dailyClasses = window.relativeStrengthClassesState.dailyClasses || staticCache.daily;
        }
        if (window.currentRelativeStrengthTimeframe === timeframe && (!window.relativeStrengthClassesState.classes || !window.relativeStrengthClassesState.classes.stock_ibov?.items?.length)) {
          window.relativeStrengthClassesState.classes = staticCache[timeframe];
          renderRelativeStrengthClassesPage();
        }
      }
    }
  };

  // --- Filter and Pagination Computations ---

  function getActiveDataset() {
    const market = window.currentRelativeStrengthMarket;
    const timeframe = window.currentRelativeStrengthTimeframe;

    if (market === 'nasdaq') {
      const nasdaqCache = window[`__nasdaqRelativeStrengthCache_${timeframe}`] ||
        (timeframe === 'weekly' ? window.__nasdaqRelativeStrengthCache_weekly : window.__nasdaqRelativeStrengthCache_daily) ||
        window.__nasdaqRelativeStrengthCache ||
        window.__relativeStrengthStaticCache?.nasdaq?.[timeframe];

      const ranking = nasdaqCache?.ranking || [];
      const sourceLabel = timeframe === 'weekly' ? 'Twelve Data (Semanal)' : (nasdaqCache?.source || 'Twelve Data');
      const dateLabel = nasdaqCache?.displayDate || formatDisplayDate(nasdaqCache?.baseDate || '2026-10-07');

      return {
        market: 'nasdaq',
        universeKey: 'nasdaq_100',
        universeLabel: 'Nasdaq-100',
        benchmarkLabel: 'QQQ',
        sourceLabel,
        dateLabel,
        items: ranking.map(item => ({
          ...item,
          name: item.companyName || item.name || item.symbol
        }))
      };
    }

    // B3
    const state = window.relativeStrengthClassesState || { classes: {}, selected: 'stock_ibov' };
    let key = state.selected || 'stock_ibov';
    if (key === 'stock') key = 'stock_ibov';

    const timeframeClasses = (timeframe === 'weekly' ? state.weeklyClasses : state.dailyClasses) || state.classes || {};
    let activeClass = timeframeClasses[key] || state.classes?.[key];

    if ((!activeClass || !activeClass.items?.length) && key === 'stock_ibov') {
      activeClass = timeframeClasses.stock || state.classes?.stock;
    }
    if ((!activeClass || !activeClass.items?.length) && window.__relativeStrengthStaticCache) {
      activeClass = window.__relativeStrengthStaticCache[timeframe]?.[key];
    }
    if ((!activeClass || !activeClass.items?.length) && key === 'stock_ibov' && typeof relativeStockFallback === 'function') {
      activeClass = relativeStockFallback();
    }
    if (!activeClass) {
      activeClass = { items: [] };
    }

    const universeLabels = {
      stock_ibov: text('Ações Ibovespa', 'Ibovespa stocks'),
      stock_other: text('Demais ações', 'Other stocks'),
      fii: text('FIIs', 'REITs'),
      bdr: text('BDRs', 'BDRs')
    };

    const benchmarkLabels = {
      stock_ibov: 'IBOV',
      stock_other: 'SMLL + B3',
      fii: 'IFIX',
      bdr: 'Universo BDR'
    };

    const rawDate = state.dataAsOf || state.updatedAt || window.__relativeStrengthStaticCache?.dataAsOf || '2026-10-07';
    const dateLabel = formatDisplayDate(rawDate);
    const sourceLabel = timeframe === 'weekly' ? 'B3 (COTAHIST · Semanal)' : 'B3 (COTAHIST)';

    return {
      market: 'b3',
      universeKey: key,
      universeLabel: universeLabels[key] || key,
      benchmarkLabel: benchmarkLabels[key] || 'IBOV',
      sourceLabel,
      dateLabel,
      items: activeClass.items || []
    };
  }

  function getFilteredAndPagedItems(allItems) {
    const query = (window.relativeStrengthSearchQuery || '').trim().toLowerCase();
    const groupFilter = (window.relativeStrengthSelectedGroup || '').trim();

    const filtered = (allItems || []).filter(item => {
      if (groupFilter) {
        const itemSec = String(item.sector || '').trim();
        const locSec = localizedSector(itemSec);
        if (itemSec !== groupFilter && locSec !== groupFilter) return false;
      }
      if (query) {
        const sym = String(item.symbol || '').toLowerCase();
        const name = String(item.name || item.companyName || '').toLowerCase();
        const sec = String(item.sector || '').toLowerCase();
        const locSec = localizedSector(item.sector).toLowerCase();
        if (!sym.includes(query) && !name.includes(query) && !sec.includes(query) && !locSec.includes(query)) {
          return false;
        }
      }
      return true;
    });

    const pageSize = window.relativeStrengthPageSize;
    if (pageSize === 'all' || !Number.isFinite(Number(pageSize))) {
      return { filtered, paged: filtered, totalPages: 1, currentPage: 1, totalCount: filtered.length };
    }

    const size = Number(pageSize);
    const totalPages = Math.max(1, Math.ceil(filtered.length / size));
    const currentPage = Math.min(Math.max(1, window.relativeStrengthCurrentPage || 1), totalPages);
    const start = (currentPage - 1) * size;
    const paged = filtered.slice(start, start + size);

    return { filtered, paged, totalPages, currentPage, totalCount: filtered.length };
  }

  // --- Render Sub-Components ---

  function renderSidebarMarkup(activeMarket, activeUniverseKey) {
    const isB3 = activeMarket === 'b3';
    return `
      <aside class="rs-internal-sidebar" aria-label="${text('Filtros de mercado e universo', 'Market and universe filters')}">
        <div class="rs-sidebar-section">
          <div class="rs-sidebar-heading">
            <span class="rs-sidebar-icon" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </span>
            <span>${text('MERCADO', 'MARKET')}</span>
          </div>
          <div class="rs-sidebar-options" role="radiogroup" aria-label="Mercado">
            <button type="button" class="rs-sidebar-option ${isB3 ? 'active' : ''}" onclick="window.switchRelativeStrengthMarket('b3')" role="radio" aria-checked="${isB3}">
              <span class="rs-radio-indicator"></span>
              <span class="rs-flag">🇧🇷</span>
              <span class="rs-option-text">B3</span>
            </button>
            <button type="button" class="rs-sidebar-option ${!isB3 ? 'active' : ''}" onclick="window.switchRelativeStrengthMarket('nasdaq')" role="radio" aria-checked="${!isB3}">
              <span class="rs-radio-indicator"></span>
              <span class="rs-flag">🇺🇸</span>
              <span class="rs-option-text">Nasdaq-100</span>
            </button>
          </div>
        </div>

        <div class="rs-sidebar-section">
          <div class="rs-sidebar-heading">
            <span class="rs-sidebar-icon" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </span>
            <span>${text('UNIVERSO', 'UNIVERSE')}</span>
          </div>
          <div class="rs-sidebar-options" role="radiogroup" aria-label="Universo">
            ${isB3 ? `
              <button type="button" class="rs-sidebar-option ${activeUniverseKey === 'stock_ibov' ? 'active' : ''}" onclick="window.selectRelativeStrengthClass('stock_ibov')" role="radio" aria-checked="${activeUniverseKey === 'stock_ibov'}">
                <span class="rs-radio-indicator"></span>
                <span class="rs-option-text">${text('Ações Ibovespa', 'Ibovespa stocks')}</span>
              </button>
              <button type="button" class="rs-sidebar-option ${activeUniverseKey === 'stock_other' ? 'active' : ''}" onclick="window.selectRelativeStrengthClass('stock_other')" role="radio" aria-checked="${activeUniverseKey === 'stock_other'}">
                <span class="rs-radio-indicator"></span>
                <span class="rs-option-text">${text('Demais ações', 'Other stocks')}</span>
              </button>
              <button type="button" class="rs-sidebar-option ${activeUniverseKey === 'fii' ? 'active' : ''}" onclick="window.selectRelativeStrengthClass('fii')" role="radio" aria-checked="${activeUniverseKey === 'fii'}">
                <span class="rs-radio-indicator"></span>
                <span class="rs-option-text">${text('FIIs', 'REITs')}</span>
              </button>
              <button type="button" class="rs-sidebar-option ${activeUniverseKey === 'bdr' ? 'active' : ''}" onclick="window.selectRelativeStrengthClass('bdr')" role="radio" aria-checked="${activeUniverseKey === 'bdr'}">
                <span class="rs-radio-indicator"></span>
                <span class="rs-option-text">BDRs</span>
              </button>
            ` : `
              <button type="button" class="rs-sidebar-option active" role="radio" aria-checked="true">
                <span class="rs-radio-indicator"></span>
                <span class="rs-option-text">${text('Componentes Nasdaq-100', 'Nasdaq-100 constituents')}</span>
              </button>
            `}
          </div>
        </div>
      </aside>
    `;
  }

  function renderClassificationStripMarkup(timeframe) {
    const isWeekly = timeframe === 'weekly';
    const cards = [
      {
        level: 'leader',
        icon: '🏆',
        title: text('Líder', 'Leader'),
        metric: 'RS ≥ 90',
        desc: isWeekly ? text('Tendência forte e consistente.', 'Strong, persistent trend.') : text('Tendência forte e consistente.', 'Strong, consistent trend.')
      },
      {
        level: 'qualified',
        icon: '📊',
        title: text('Qualificado', 'Qualified'),
        metric: 'RS 80 – 89',
        desc: text('Boa força relativa e estrutura positiva.', 'Good relative strength & positive structure.')
      },
      {
        level: 'watch',
        icon: '👁️',
        title: text('Acompanhar', 'Watch'),
        metric: 'RS 70 – 79',
        desc: text('Sinais mistos. Acompanhar evolução.', 'Mixed signals. Track development.')
      },
      {
        level: 'observation',
        icon: '⏱️',
        title: text('Em observação', 'Under observation'),
        metric: 'RS 50 – 69',
        desc: text('Força limitada. Aguardar confirmação.', 'Limited strength. Await confirmation.')
      },
      {
        level: 'laggard',
        icon: '❗',
        title: text('Abaixo do filtro', 'Below filter'),
        metric: 'RS < 50',
        desc: text('Fora do escopo no momento.', 'Out of scope for now.')
      }
    ];

    return `
      <section class="rs-classification-strip" aria-label="${text('Classificação da força relativa', 'Relative strength classification')}">
        ${cards.map(c => `
          <article class="rs-classification-card ${c.level}">
            <div class="rs-card-icon-box" aria-hidden="true">${c.icon}</div>
            <div class="rs-card-content">
              <div class="rs-card-title-row">
                <span class="rs-card-title">${c.title}</span>
                <span class="rs-card-metric">${c.metric}</span>
              </div>
              <p class="rs-card-desc">${c.desc}</p>
            </div>
          </article>
        `).join('')}
      </section>
    `;
  }

  function renderTableRows(pagedItems, timeframe, isFii) {
    if (!pagedItems || pagedItems.length === 0) {
      return `
        <tr>
          <td colspan="9">
            <div class="rs-table-empty">
              <span>🔍</span>
              <p>${text('Nenhum ativo encontrado para os filtros selecionados.', 'No assets found for the selected filters.')}</p>
            </div>
          </td>
        </tr>
      `;
    }

    return pagedItems.map((item, index) => {
      const rank = item.rank || (index + 1);
      const symbol = item.symbol;
      const company = item.name || item.companyName || symbol;
      const sector = localizedSector(item.sector || '—');
      const m1Val = item.m1;
      const m3Val = item.m3;
      const score = Number(item.score ?? item.rsScore ?? 0);
      const leitura = getLeituraInfo(item, timeframe);
      const scoreBadgeClass = getScoreBadgeClass(score);

      const m1Formatted = formatReturn(m1Val);
      const m3Formatted = formatReturn(m3Val);
      const m1Class = Number.isFinite(m1Val) ? (m1Val >= 0 ? 'rs-val-positive' : 'rs-val-negative') : '';
      const m3Class = Number.isFinite(m3Val) ? (m3Val >= 0 ? 'rs-val-positive' : 'rs-val-negative') : '';

      return `
        <tr class="rs-data-row" data-symbol="${symbol}">
          <td class="td-rank">${rank}</td>
          <td class="td-symbol"><b>${symbol}</b></td>
          <td class="td-company" title="${company}">${company}</td>
          <td class="td-group" title="${sector}">${sector}</td>
          <td class="td-m1 ${m1Class}">${m1Formatted}</td>
          <td class="td-m3 ${m3Class}">${m3Formatted}</td>
          <td class="td-rs">
            <span class="rs-score-pill ${scoreBadgeClass}">${score}</span>
          </td>
          <td class="td-reading">
            <span class="rs-reading-badge ${leitura.tierClass}">
              <span class="rs-reading-icon">${leitura.icon}</span>
              <span class="rs-reading-text">${leitura.label}</span>
            </span>
          </td>
          <td class="td-actions">
            <div class="rs-row-actions">
              <button type="button" class="rs-btn-analysis" onclick="window.openFundamentalsForTicker && window.openFundamentalsForTicker('${symbol}')" title="${text(`Ver análise de ${symbol}`, `View analysis for ${symbol}`)}">
                <span class="rs-btn-icon">📊</span> ${text('Ver análise', 'View analysis')}
              </button>
              <button type="button" class="rs-btn-watchlist" onclick="window.addToWatchlist && window.addToWatchlist('${symbol}', { origin: 'relative-strength', rsScore: ${score} })" title="${text(`Adicionar ${symbol} à Watchlist`, `Add ${symbol} to Watchlist`)}">
                + Watchlist
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderPaginationControls(currentPage, totalPages, totalCount) {
    if (totalPages <= 1) return '';

    let pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages = [1, 2, 3, 4, 5, '...', totalPages];
      } else if (currentPage >= totalPages - 3) {
        pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      } else {
        pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
      }
    }

    return `
      <div class="rs-pagination-bar" aria-label="${text('Paginação da tabela', 'Table pagination')}">
        <button type="button" class="rs-page-nav-btn prev" ${currentPage === 1 ? 'disabled' : ''} onclick="window.handleRelativeStrengthPageChange(${currentPage - 1})">
          ‹ ${text('Anterior', 'Previous')}
        </button>
        <div class="rs-page-numbers">
          ${pages.map(p => {
            if (p === '...') return `<span class="rs-page-ellipsis">…</span>`;
            return `<button type="button" class="rs-page-btn ${p === currentPage ? 'active' : ''}" onclick="window.handleRelativeStrengthPageChange(${p})">${p}</button>`;
          }).join('')}
        </div>
        <button type="button" class="rs-page-nav-btn next" ${currentPage === totalPages ? 'disabled' : ''} onclick="window.handleRelativeStrengthPageChange(${currentPage + 1})">
          ${text('Próximo', 'Next')} ›
        </button>
      </div>
    `;
  }

  function updateTableAndPaginationOnly() {
    const dataset = getActiveDataset();
    const { paged, totalPages, currentPage, totalCount } = getFilteredAndPagedItems(dataset.items);
    const tbody = document.getElementById('rsRankingTableBody');
    const paginationContainer = document.getElementById('rsPaginationContainer');
    const resultsCountEl = document.getElementById('rsResultsCount');

    if (tbody) {
      tbody.innerHTML = renderTableRows(paged, window.currentRelativeStrengthTimeframe, dataset.universeKey === 'fii');
    }
    if (paginationContainer) {
      paginationContainer.innerHTML = renderPaginationControls(currentPage, totalPages, totalCount);
    }
    if (resultsCountEl) {
      resultsCountEl.textContent = text(`Resultados: ${totalCount} ativos`, `Results: ${totalCount} assets`);
    }
  }

  // --- Main Full Layout Renderer ---

  async function renderRelativeStrengthWorkspace() {
    const root = document.getElementById('relativestrength');
    if (!root) return;

    root.classList.add('rs-workspace-active');

    // If market is nasdaq and cache is not yet fetched, fetch it
    const activeMarket = window.currentRelativeStrengthMarket;
    const activeTimeframe = window.currentRelativeStrengthTimeframe;

    if (activeMarket === 'nasdaq' && typeof window.fetchNasdaqData === 'function') {
      const cacheKey = `__nasdaqRelativeStrengthCache_${activeTimeframe}`;
      if (!window[cacheKey]) {
        await window.fetchNasdaqData(activeTimeframe);
      }
    }

    const dataset = getActiveDataset();
    const isFii = dataset.universeKey === 'fii';
    const isWeekly = activeTimeframe === 'weekly';

    // Sectors for group dropdown
    const rawSectors = [...new Set((dataset.items || []).map(i => i.sector).filter(Boolean))].sort();
    const sectorOptions = rawSectors.map(s => {
      const label = localizedSector(s);
      const isSel = (window.relativeStrengthSelectedGroup === s || window.relativeStrengthSelectedGroup === label);
      return `<option value="${s}" ${isSel ? 'selected' : ''}>${label}</option>`;
    }).join('');

    const { paged, totalPages, currentPage, totalCount } = getFilteredAndPagedItems(dataset.items);

    const subtitleText = isWeekly
      ? text('Selecione tendências estruturais de médio a longo prazo no gráfico Semanal.', 'Select structural medium-to-long term trends based on the Weekly chart.')
      : text('Selecione líderes para oportunidades no gráfico Diário.', 'Select leaders for opportunities based on the Daily chart.');

    const datePrefix = isWeekly ? text('Semana de referência: ', 'Reference week: ') : text('Último fechamento: ', 'Latest close: ');

    root.innerHTML = `
      <div class="rs-container">
        <!-- Breadcrumb -->
        <nav class="rs-breadcrumb" aria-label="Breadcrumb">
          <span class="rs-breadcrumb-root">${text('Análise de Mercado', 'Market Analysis')}</span>
          <span class="rs-breadcrumb-sep">›</span>
          <span class="rs-breadcrumb-current">${text('Força Relativa', 'Relative Strength')}</span>
        </nav>

        <!-- Main Workspace Split Grid -->
        <div class="rs-layout-grid">
          <!-- Left Internal Filter Sidebar -->
          ${renderSidebarMarkup(activeMarket, dataset.universeKey)}

          <!-- Right Content Area -->
          <div class="rs-main-content">
            <!-- Header with Title, Info Icon, and Modality Selector -->
            <header class="rs-main-header">
              <div class="rs-header-info">
                <div class="rs-header-title-wrap">
                  <h1 class="rs-header-title">${text('Força Relativa', 'Relative Strength')}</h1>
                  <span class="rs-info-badge" title="${text('A Força Relativa identifica ativos que sobem mais que o mercado em altas e caem menos em correções.', 'Relative Strength identifies assets outperforming the market.')}" aria-label="Informações sobre Força Relativa">ⓘ</span>
                </div>
                <p class="rs-header-subtitle">${subtitleText}</p>
              </div>

              <!-- Modality Selector -->
              <div class="rs-modality-selector-group" role="tablist" aria-label="${text('Modalidade de análise', 'Analysis modality')}">
                <div class="rs-modality-card">
                  <button type="button" class="rs-modality-btn ${!isWeekly ? 'active' : ''}" onclick="window.switchRelativeStrengthTimeframe('daily')" role="tab" aria-selected="${!isWeekly}">
                    <span class="rs-modality-btn-icon">📊</span>
                    <span class="rs-modality-btn-text">Swing Trade · Diário</span>
                  </button>
                  <span class="rs-modality-card-desc">${text('Oportunidades de curto a médio prazo com base no gráfico Diário.', 'Short-to-medium term opportunities based on the Daily chart.')}</span>
                </div>

                <div class="rs-modality-card">
                  <button type="button" class="rs-modality-btn ${isWeekly ? 'active' : ''}" onclick="window.switchRelativeStrengthTimeframe('weekly')" role="tab" aria-selected="${isWeekly}">
                    <span class="rs-modality-btn-icon">📈</span>
                    <span class="rs-modality-btn-text">Position Trade · Semanal</span>
                  </button>
                  <span class="rs-modality-card-desc">${text('Tendências estruturais de médio a longo prazo com base no gráfico Semanal.', 'Structural medium-to-long term trends based on the Weekly chart.')}</span>
                </div>
              </div>
            </header>

            <!-- 5 Classification Strip Cards -->
            ${renderClassificationStripMarkup(activeTimeframe)}

            <!-- Context Disclaimer Banner -->
            <div class="rs-context-disclaimer" role="note">
              <span class="rs-disclaimer-icon">ⓘ</span>
              <span class="rs-disclaimer-text">${text('A força relativa é contexto, não recomendação de compra ou venda.', 'Relative strength is context, not a buy or sell recommendation.')}</span>
            </div>

            <!-- Ranking Table Card -->
            <section class="rs-ranking-card" aria-label="${text('Ranking de Força Relativa', 'Relative Strength Ranking')}">
              <div class="rs-ranking-card-header">
                <div class="rs-ranking-title-group">
                  <span class="rs-ranking-icon" aria-hidden="true">📊</span>
                  <h2>${text('Ranking de Força Relativa', 'Relative Strength Ranking')}</h2>
                </div>
                <div class="rs-freshness-badge">
                  <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:4px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${datePrefix}${dataset.dateLabel}</span>
                  <span class="rs-freshness-sep">|</span>
                  <span>Fonte: ${dataset.sourceLabel}</span>
                </div>
              </div>

              <!-- Toolbar -->
              <div class="rs-ranking-toolbar">
                <div class="rs-toolbar-filters">
                  <div class="rs-search-box">
                    <span class="rs-search-icon" aria-hidden="true">🔍</span>
                    <input type="text" id="rsSearchInput" placeholder="${text('Buscar ativo, empresa ou setor...', 'Search asset, company or sector...')}" value="${window.relativeStrengthSearchQuery}" oninput="window.handleRelativeStrengthSearch(this.value)" aria-label="${text('Buscar ativo', 'Search asset')}">
                  </div>
                  <div class="rs-select-wrap">
                    <select id="rsGroupSelect" class="rs-select-group" onchange="window.handleRelativeStrengthGroupChange(this.value)" aria-label="${text('Filtrar por grupo ou setor', 'Filter by group or sector')}">
                      <option value="">${isFii ? text('Todos os segmentos', 'All segments') : text('Todos os grupos', 'All groups')}</option>
                      ${sectorOptions}
                    </select>
                  </div>
                </div>

                <div class="rs-toolbar-meta">
                  <span class="rs-results-count" id="rsResultsCount">${text(`Resultados: ${totalCount} ativos`, `Results: ${totalCount} assets`)}</span>
                  <div class="rs-per-page-wrap">
                    <select id="rsPerPageSelect" class="rs-select-per-page" onchange="window.handleRelativeStrengthPageSizeChange(this.value)" aria-label="${text('Itens por página', 'Items per page')}">
                      <option value="10" ${window.relativeStrengthPageSize === 10 ? 'selected' : ''}>10 ${text('por página', 'per page')}</option>
                      <option value="25" ${window.relativeStrengthPageSize === 25 ? 'selected' : ''}>25 ${text('por página', 'per page')}</option>
                      <option value="50" ${window.relativeStrengthPageSize === 50 ? 'selected' : ''}>50 ${text('por página', 'per page')}</option>
                      <option value="all" ${window.relativeStrengthPageSize === 'all' ? 'selected' : ''}>${text('Todos', 'All')}</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Table -->
              <div class="rs-table-wrapper">
                <table class="rs-table">
                  <thead>
                    <tr>
                      <th class="th-rank">#</th>
                      <th class="th-symbol">${text('Ativo', 'Asset')}</th>
                      <th class="th-company">${text('Empresa', 'Company')}</th>
                      <th class="th-group">${isFii ? text('Segmento', 'Segment') : text('Grupo', 'Group')}</th>
                      <th class="th-m1">1M</th>
                      <th class="th-m3">3M</th>
                      <th class="th-rs">RS</th>
                      <th class="th-reading">${text('Leitura', 'Reading')}</th>
                      <th class="th-actions">${text('Ações', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody id="rsRankingTableBody">
                    ${renderTableRows(paged, activeTimeframe, isFii)}
                  </tbody>
                </table>
              </div>

              <!-- Pagination -->
              <div id="rsPaginationContainer">
                ${renderPaginationControls(currentPage, totalPages, totalCount)}
              </div>
            </section>
          </div>
        </div>
      </div>
    `;
  }

  // Hook into the global render pipeline
  window.renderRelativeStrengthClassesPage = renderRelativeStrengthWorkspace;

  // Initial call if document is already ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(renderRelativeStrengthWorkspace, 20);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(renderRelativeStrengthWorkspace, 20);
    });
  }
}());
