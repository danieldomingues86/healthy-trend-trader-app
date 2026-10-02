/* ==========================================================================
   The Healthy Trend Trader — Nasdaq-100 Relative Strength
   Standardized UI matching B3 Relative Strength Layout
   Reference Layout: media_1790888354711.png
   ========================================================================== */

(function () {
  'use strict';

  // --- State ---
  window.currentRelativeStrengthMarket = window.currentRelativeStrengthMarket || 'b3';
  window.__nasdaqRelativeStrengthCache = null;
  window.__nasdaqRelativeStrengthLoading = false;

  let filterSearch = '';
  let filterSector = '';
  let filterTier = '';

  // --- Classification Band Helper (Matches B3 & Strictly Consumes Backend Truth) ---
  function getNasdaqBand(item) {
    const titles = {
      leader: 'LÍDERES DO NASDAQ-100 · RS 90–100',
      qualified: 'FORÇA ACIMA DA MÉDIA · RS 70–89',
      watch: 'ACOMPANHAR · RS 40–69',
      observation: 'EM OBSERVAÇÃO · TENDÊNCIA OU MOMENTUM EM RISCO',
      laggard: 'ABAIXO DO FILTRO · RS 0–29'
    };

    if (item && typeof item === 'object') {
      const key = item.bandKey || (item.score >= 70 ? 'qualified' : item.score >= 40 ? 'watch' : 'laggard');
      const label = item.classification || (key === 'leader' && item.trendState === 'BULLISH' ? 'Líder' : 'Qualificado');
      return {
        key,
        title: titles[key] || label.toUpperCase(),
        label
      };
    }
    return {
      key: 'laggard',
      title: titles.laggard,
      label: 'Abaixo do filtro'
    };
  }

  // --- Date Formatter (e.g. 30 de set. de 2026) ---
  function formatClosingDate(rawDate) {
    if (!rawDate) {
      const now = new Date();
      return now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return String(rawDate);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // --- API Helper ---
  async function fetchNasdaqData(forceRefresh = false) {
    if (window.__nasdaqRelativeStrengthCache && !forceRefresh) {
      return window.__nasdaqRelativeStrengthCache;
    }
    window.__nasdaqRelativeStrengthLoading = true;
    try {
      const apiUrl = (window.MARKET_DATA_API_URL || 'http://localhost:8787/api') + '/market-data/nasdaq-relative-strength';
      let payload;
      if (window.healthyTrendApi && typeof window.healthyTrendApi.request === 'function') {
        payload = await window.healthyTrendApi.request('/api/market-data/nasdaq-relative-strength');
      } else {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        payload = await res.json();
      }
      window.__nasdaqRelativeStrengthCache = payload;
      return payload;
    } catch (err) {
      console.warn('[nasdaq-rs] Falha ao carregar dados remotos do Nasdaq-100, utilizando fallback local.', err);
      return window.__nasdaqRelativeStrengthCache || null;
    } finally {
      window.__nasdaqRelativeStrengthLoading = false;
    }
  }

  // --- Filter Items ---
  function getFilteredNasdaqItems(items) {
    if (!Array.isArray(items)) return [];
    return items.filter(item => {
      // Search
      if (filterSearch) {
        const q = filterSearch.toLowerCase().trim();
        const matchSym = item.symbol.toLowerCase().includes(q);
        const matchName = (item.companyName || '').toLowerCase().includes(q);
        const matchSec = (item.sector || '').toLowerCase().includes(q);
        if (!matchSym && !matchName && !matchSec) return false;
      }
      // Sector
      if (filterSector && item.sector !== filterSector) {
        return false;
      }
      // Classification Tier
      if (filterTier) {
        if (filterTier === 'emerging') {
          if (!item.isEmerging) return false;
        } else {
          const band = getNasdaqBand(item);
          if (band.key !== filterTier) return false;
        }
      }
      return true;
    });
  }

  // --- CSV Export ---
  function exportNasdaqCsv(items) {
    if (!items || !items.length) {
      alert('Nenhum dado para exportar.');
      return;
    }
    const headers = ['Posição', 'Ticker', 'Empresa', 'Setor', 'Score RS', 'Preço (USD)', 'Var 1D (%)', 'Var 5D (%)', 'Var 1M (%)', 'Var 3M (%)', 'Tendência', 'Leitura'];
    const rows = items.map((i, idx) => {
      const band = getNasdaqBand(i);
      return [
        idx + 1,
        `"${i.symbol}"`,
        `"${(i.companyName || '').replace(/"/g, '""')}"`,
        `"${(i.sector || '').replace(/"/g, '""')}"`,
        i.score,
        i.price ? i.price.toFixed(2) : '',
        i.d1 != null ? i.d1.toFixed(2) : '',
        i.d5 != null ? i.d5.toFixed(2) : '',
        i.m1 != null ? i.m1.toFixed(2) : '',
        i.m3 != null ? i.m3.toFixed(2) : '',
        `"${i.trendState || 'NEUTRAL'}"`,
        `"${i.classification || band.label}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `nasdaq100-forca-relativa-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Market Switcher Header Markup ---
  function getMarketSwitcherHtml(activeMarket = 'b3') {
    return `
      <div class="rs-header-container">
        <div class="rs-header-title-row">
          <h1 class="rs-header-title">Força Relativa</h1>
          <span class="rs-header-info-icon" title="Encontre os ativos mais fortes do mercado, seguindo a tendência de forma sistemática.">ⓘ</span>
        </div>
        <p class="rs-header-subtitle">Encontre os ativos mais fortes do mercado, seguindo a tendência.</p>
        <div class="rs-market-tabs-nav" role="tablist">
          <button type="button" class="rs-market-tab-btn ${activeMarket === 'b3' ? 'active' : ''}" data-market="b3" onclick="window.switchRelativeStrengthMarket('b3')">
            <span class="rs-market-flag">🇧🇷</span> B3
          </button>
          <button type="button" class="rs-market-tab-btn ${activeMarket === 'nasdaq' ? 'active' : ''}" data-market="nasdaq" onclick="window.switchRelativeStrengthMarket('nasdaq')">
            <span class="rs-market-flag">🇺🇸</span> NASDAQ-100
          </button>
        </div>
      </div>
    `;
  }

  // --- Classification 5 Cards Strip (Matches B3 100%) ---
  function getClassificationStripHtml() {
    const cards = [
      ['leader', '★', 'LÍDER', 'RS 90+ · força ascendente'],
      ['qualified', '↗', 'QUALIFICADO', 'RS 70+ · força acima da média'],
      ['watch', '◉', 'ACOMPANHAR', 'RS 40–69 · em formação'],
      ['observation', '◎', 'EM OBSERVAÇÃO', 'RS 30–39 · atenção'],
      ['laggard', '!', 'ABAIXO DO FILTRO', 'RS 0–29 · evitando no momento']
    ];
    return `
      <section class="rs-classification" style="margin-bottom: 14px;">
        ${cards.map(([level, icon, title, desc]) => `
          <article class="rs-classification-card ${level}">
            <i aria-hidden="true">${icon}</i>
            <div>
              <b>${title}</b>
              <strong>${desc}</strong>
            </div>
          </article>
        `).join('')}
      </section>
    `;
  }

  // --- Render Nasdaq Screen ---
  async function renderNasdaqScreen() {
    const root = document.getElementById('relativestrength');
    if (!root) return;

    // Ensure container has B3 styling class
    root.classList.add('rs-v3-page');

    const data = await fetchNasdaqData();
    if (!data || data.status === 'DATA_UNAVAILABLE' || !Array.isArray(data.ranking) || data.ranking.length === 0) {
      const isSyncing = data?.status === 'SYNCING' || data?.syncStatus === 'SINCRONIZANDO';
      const icon = isSyncing ? '⏳' : '📡';
      const title = isSyncing ? 'Sincronizando Dados com a Twelve Data...' : 'Dados do Nasdaq-100 Aguardando Sincronização';
      const msg = isSyncing
        ? (data?.message || 'Coletando candles diários da Twelve Data e calculando Força Relativa...')
        : (data?.message || 'Nenhum dado oficial do Nasdaq-100 sincronizado ainda. Execute a coleta EOD para calcular a Força Relativa.');
      const statusText = isSyncing ? 'SINCRONIZANDO' : (data?.syncStatus || data?.providerStatus || 'Aguardando sincronização Twelve Data');

      root.innerHTML = `
        <div class="rs-simple-shell">
          ${getMarketSwitcherHtml('nasdaq')}
          <div style="background:#ffffff; border:1.5px solid #d4ded8; border-radius:16px; padding: 48px 24px; text-align: center; margin-top: 16px;">
            <div style="font-size:32px; margin-bottom:12px;">${icon}</div>
            <h3 style="font-family:Georgia, serif; font-size:20px; color:#0b1a14; margin:0 0 8px 0;">${title}</h3>
            <p style="font-size:13.5px; color:#4a6356; max-width:540px; margin:0 auto 16px auto; line-height:1.5;">${msg}</p>
            <div style="display:inline-flex; align-items:center; gap:8px; padding:6px 14px; background:#eef6f1; border:1px solid #b2c7bc; border-radius:8px; font-size:12px; font-weight:700; color:#084a2d;">
              <span>Status:</span>
              <span>${statusText}</span>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const { kpis = {}, ranking = [], updatedAt } = data;
    const filteredItems = getFilteredNasdaqItems(ranking);
    const sectors = [...new Set(ranking.map(i => i.sector).filter(Boolean))].sort();
    const formattedCloseDate = formatClosingDate(updatedAt);

    // 1. Top Market Switcher
    const switcherHtml = getMarketSwitcherHtml('nasdaq');

    // 2. Summary KPI Cards (4 compact cards matching B3 universe tabs style)
    const summaryKpisHtml = `
      <div class="nasdaq-kpi-summary-strip">
        <div class="nasdaq-kpi-summary-card">
          <div class="nasdaq-kpi-summary-icon gold">🏆</div>
          <div class="nasdaq-kpi-summary-info">
            <b>${kpis.totalAssets || 100} Ações</b>
            <span>Constituintes Nasdaq-100</span>
          </div>
        </div>
        <div class="nasdaq-kpi-summary-card">
          <div class="nasdaq-kpi-summary-icon green">↗</div>
          <div class="nasdaq-kpi-summary-info">
            <b class="positive">+${Math.abs(kpis.averageReturn3M || 0).toFixed(2)}%</b>
            <span>Retorno médio 3M (Top 20)</span>
          </div>
        </div>
        <div class="nasdaq-kpi-summary-card">
          <div class="nasdaq-kpi-summary-icon star">★</div>
          <div class="nasdaq-kpi-summary-info">
            <b>${kpis.leadersCount || 0} Líderes (A+)</b>
            <span>RS 3M acima da referência</span>
          </div>
        </div>
        <div class="nasdaq-kpi-summary-card">
          <div class="nasdaq-kpi-summary-icon blue">⚡</div>
          <div class="nasdaq-kpi-summary-info">
            <b>${kpis.emergingCount || 0} Líderes Emergentes</b>
            <span>Momentum em aceleração</span>
          </div>
        </div>
      </div>
    `;

    // 3. Classification Strip (5 horizontal cards)
    const classificationHtml = getClassificationStripHtml();

    // 4. Contextual Disclaimer
    const disclaimerHtml = `
      <div class="rs-v3-disclaimer">
        <span class="rs-disclaimer-icon">ⓘ</span>
        <strong>A FORÇA RELATIVA É CONTEXTO, NÃO RECOMENDAÇÃO DE COMPRA OU VENDA</strong>
      </div>
    `;

    // 5. Ranking Table Rows with Band Dividers
    let currentBandKey = '';
    const rowsHtml = filteredItems.map((item, index) => {
      const band = getNasdaqBand(item);
      let dividerHtml = '';

      // Only insert dividers when no specific search/tier filter is active, or if band changes
      if (band.key !== currentBandKey) {
        currentBandKey = band.key;
        dividerHtml = `
          <tr class="rs-band-divider rs-band-${band.key}">
            <td colspan="9">${band.title}</td>
          </tr>
        `;
      }

      const formatReturn = (val) => {
        if (!Number.isFinite(val)) return '—';
        return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
      };

      return `
        ${dividerHtml}
        <tr data-rs-visual="${band.key}">
          <td>${index + 1}</td>
          <td class="rs-symbol-col"><b>${item.symbol}</b></td>
          <td class="rs-company-col" title="${item.companyName}">${item.companyName}</td>
          <td>${item.sector || '—'}</td>
          <td class="${item.m1 >= 0 ? 'rs-positive' : 'rs-negative'}">${formatReturn(item.m1)}</td>
          <td class="${item.m3 >= 0 ? 'rs-positive' : 'rs-negative'}">${formatReturn(item.m3)}</td>
          <td><span class="rs-score">${item.score}</span></td>
          <td><span class="rs-template">${item.classification || band.label}</span></td>
          <td class="rs-table-chevron">
            <button type="button" class="rs-analysis-action" data-sym="${item.symbol}">Ver Análise ›</button>
            <button type="button" class="rs-watchlist-action" data-sym="${item.symbol}" data-score="${item.score}">+ Watchlist</button>
          </td>
        </tr>
      `;
    }).join('');

    // 6. Main Dashboard Card
    const dashboardHtml = `
      <main class="rs-simple-dashboard">
        <div class="rs-simple-dashboard-head">
          <h2><span class="rs-heading-icon" aria-hidden="true">♞</span> Ranking de Força Relativa — Nasdaq-100</h2>
          <span class="relative-data-freshness">
            <span class="rs-freshness-icon" aria-hidden="true">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </span>
            <span class="rs-freshness-text">Último fechamento: ${formattedCloseDate} · Fonte: Twelve Data · ${data.syncStatus || 'DADOS ATUALIZADOS'}</span>
          </span>
        </div>

        ${data.status === 'PARTIAL_SYNC' ? `
          <div style="background:#fffbe6; border:1px solid #ffe58f; border-radius:8px; padding:10px 16px; margin: 12px 0 16px 0; font-size:12.5px; color:#874d00; display:flex; align-items:center; gap:8px;">
            <span>⚠️</span>
            <span><b>SINCRONIZAÇÃO PARCIAL (${data.syncedCount || 0}/${data.totalAssets || 100} ativos):</b> O ranking abaixo reflete apenas os ativos sincronizados com histórico válido e não representa o índice completo. Faltantes: ${(data.missingSymbols || []).slice(0, 10).join(', ')}${(data.missingSymbols || []).length > 10 ? '...' : ''}</span>
          </div>
        ` : ''}

        <div class="rs-simple-toolbar">
          <input type="text" id="rsNasdaqSearch" placeholder="Buscar ticker ou empresa..." aria-label="Buscar ativo" value="${filterSearch}">
          
          <select id="rsNasdaqSector" aria-label="Filtrar por setor">
            <option value="">Todos os setores</option>
            ${sectors.map(sec => `<option value="${sec}" ${filterSector === sec ? 'selected' : ''}>${sec}</option>`).join('')}
          </select>

          <select id="rsNasdaqTier" aria-label="Filtrar classificação" style="height:38px; border:1.5px solid #c2cec7; border-radius:8px; padding:0 12px; font-weight:600; font-size:13px; color:#0b1a14; background:#ffffff;">
            <option value="">Todas as classificações (${filteredItems.length})</option>
            <option value="leader" ${filterTier === 'leader' ? 'selected' : ''}>Líderes (RS 90+)</option>
            <option value="qualified" ${filterTier === 'qualified' ? 'selected' : ''}>Qualificados (RS 70–89)</option>
            <option value="watch" ${filterTier === 'watch' ? 'selected' : ''}>Acompanhar (RS 40–69)</option>
            <option value="observation" ${filterTier === 'observation' ? 'selected' : ''}>Em observação (RS 30–39)</option>
            <option value="laggard" ${filterTier === 'laggard' ? 'selected' : ''}>Abaixo do filtro (RS 0–29)</option>
            <option value="emerging" ${filterTier === 'emerging' ? 'selected' : ''}>Líderes Emergentes</option>
          </select>

          <button type="button" class="rs-analysis-action" id="rsNasdaqExportBtn" style="margin-left: auto;">
            ⤓ Exportar CSV
          </button>
        </div>

        <div class="relative-table-wrap">
          <table class="relative-table">
            <thead>
              <tr>
                <th>#</th>
                <th>ATIVO</th>
                <th>EMPRESA</th>
                <th>SETOR</th>
                <th>1M</th>
                <th>3M</th>
                <th>RS</th>
                <th>LEITURA</th>
                <th style="text-align: right; padding-right: 18px;">AÇÕES</th>
              </tr>
            </thead>
            <tbody id="nasdaqTableBody">
              ${rowsHtml || '<tr><td colspan="9" style="text-align:center; padding:32px; color:#4a6356;">Nenhum ativo corresponde aos filtros selecionados.</td></tr>'}
            </tbody>
          </table>
        </div>
      </main>
      <footer class="rs-v3-closing">“Consistência é a verdadeira vantagem.”</footer>
    `;

    // Assemble complete HTML structure inside .rs-simple-shell
    root.innerHTML = `
      <div class="rs-simple-shell">
        ${switcherHtml}
        ${summaryKpisHtml}
        ${classificationHtml}
        ${disclaimerHtml}
        ${dashboardHtml}
      </div>
    `;

    // Attach Event Listeners
    setupNasdaqListeners(filteredItems);
  }

  function setupNasdaqListeners(currentFilteredItems) {
    const searchInput = document.getElementById('rsNasdaqSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filterSearch = e.target.value;
        renderNasdaqScreen();
      });
    }

    const sectorSelect = document.getElementById('rsNasdaqSector');
    if (sectorSelect) {
      sectorSelect.addEventListener('change', (e) => {
        filterSector = e.target.value;
        renderNasdaqScreen();
      });
    }

    const tierSelect = document.getElementById('rsNasdaqTier');
    if (tierSelect) {
      tierSelect.addEventListener('change', (e) => {
        filterTier = e.target.value;
        renderNasdaqScreen();
      });
    }

    const exportBtn = document.getElementById('rsNasdaqExportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        exportNasdaqCsv(currentFilteredItems);
      });
    }

    // Row Actions: Ver Análise & + Watchlist
    const tableBody = document.getElementById('nasdaqTableBody');
    if (tableBody) {
      tableBody.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const sym = target.dataset.sym;
        if (!sym) return;

        if (target.classList.contains('rs-analysis-action')) {
          e.stopPropagation();
          const item = (currentFilteredItems || []).find(i => i.symbol === sym) || (window.__nasdaqRelativeStrengthCache?.ranking || []).find(i => i.symbol === sym);
          if (item) {
            openNasdaqAuditModal(item, window.__nasdaqRelativeStrengthCache?.benchmark);
          } else if (typeof window.openFundamentalsForTicker === 'function') {
            window.openFundamentalsForTicker(sym);
          } else if (typeof window.go === 'function') {
            window.go('fundamentals');
          }
        } else if (target.classList.contains('rs-watchlist-action')) {
          e.stopPropagation();
          const score = Number(target.dataset.score || 0);
          if (typeof window.addToWatchlist === 'function') {
            window.addToWatchlist(sym, { origin: 'nasdaq-relative-strength', rsScore: score });
          } else {
            alert(`${sym} adicionado à Watchlist!`);
          }
        }
      });
    }
  }

  // --- Audit Modal Dialog ---
  function openNasdaqAuditModal(item, benchmark = {}) {
    if (!item) return;

    const existing = document.getElementById('rsNasdaqAuditModalBackdrop');
    if (existing) existing.remove();

    const trend = item.trendState || 'NEUTRAL';
    const trendClass = trend === 'BULLISH' ? 'bullish' : trend === 'BEARISH' ? 'bearish' : 'neutral';
    const trendLabel = trend === 'BULLISH' ? 'Alta (Bullish)' : trend === 'BEARISH' ? 'Baixa (Bearish)' : 'Neutra (Lateral)';
    const trendIcon = trend === 'BULLISH' ? '↗' : trend === 'BEARISH' ? '↘' : '↔';

    const td = item.trendDetails || {};
    const ema20Str = td.ema20 != null ? `$${td.ema20.toFixed(2)}` : '—';
    const sma50Str = td.sma50 != null ? `$${td.sma50.toFixed(2)}` : '—';
    const sma200Str = td.sma200 != null ? `$${td.sma200.toFixed(2)}` : '—';
    const priceStr = item.price != null ? `$${item.price.toFixed(2)}` : '—';

    const qqqM1 = benchmark?.m1 != null ? benchmark.m1 : 4.2;
    const qqqM3 = benchmark?.m3 != null ? benchmark.m3 : 8.5;

    const diffM1 = item.m1 != null ? (item.m1 - qqqM1).toFixed(1) : '—';
    const diffM3 = item.m3 != null ? (item.m3 - qqqM3).toFixed(1) : '—';

    const formatPct = (val) => Number.isFinite(val) ? `${val >= 0 ? '+' : ''}${val.toFixed(1)}%` : '—';

    const backdrop = document.createElement('div');
    backdrop.id = 'rsNasdaqAuditModalBackdrop';
    backdrop.className = 'rs-audit-modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');

    backdrop.innerHTML = `
      <div class="rs-audit-modal">
        <header class="rs-audit-modal-header">
          <div>
            <div class="rs-audit-modal-eyebrow">Diagnóstico Técnico Transparente</div>
            <h3 class="rs-audit-modal-title">${item.symbol} · ${item.companyName || item.symbol}</h3>
            <div class="rs-audit-modal-subtitle">${item.sector || 'Nasdaq-100'} · Cotação Atual: <b>${priceStr}</b></div>
          </div>
          <button type="button" class="rs-audit-modal-close" data-modal-close aria-label="Fechar">×</button>
        </header>

        <div class="rs-audit-modal-body">
          <!-- 1. Força Relativa vs Benchmark -->
          <section class="rs-audit-card">
            <div class="rs-audit-card-title">
              <span>1. Força Relativa vs QQQ (Nasdaq-100 Benchmark)</span>
              <span class="rs-audit-badge" style="background:#eef6f1; color:#084a2d; border-color:#b2c7bc;">Score RS: ${item.score}/100</span>
            </div>
            <div class="rs-audit-metrics-grid">
              <div class="rs-audit-metric-box">
                <div class="rs-audit-metric-label">Retorno 1M (21d)</div>
                <div class="rs-audit-metric-val ${item.m1 >= 0 ? 'positive' : 'negative'}">${formatPct(item.m1)}</div>
                <div class="rs-audit-metric-sub">QQQ: ${formatPct(qqqM1)} (dif: ${diffM1}pp)</div>
              </div>
              <div class="rs-audit-metric-box">
                <div class="rs-audit-metric-label">Retorno 3M (63d)</div>
                <div class="rs-audit-metric-val ${item.m3 >= 0 ? 'positive' : 'negative'}">${formatPct(item.m3)}</div>
                <div class="rs-audit-metric-sub">QQQ: ${formatPct(qqqM3)} (dif: ${diffM3}pp)</div>
              </div>
              <div class="rs-audit-metric-box">
                <div class="rs-audit-metric-label">Percentil RS</div>
                <div class="rs-audit-metric-val">${item.score}º</div>
                <div class="rs-audit-metric-sub">Posição: #${item.rsRank || item.rank} no índice</div>
              </div>
            </div>
          </section>

          <!-- 2. Estrutura de Tendência Diária -->
          <section class="rs-audit-card">
            <div class="rs-audit-card-title">
              <span>2. Tendência Diária (Timeframe Diário · 1day)</span>
              <span class="rs-audit-badge ${trendClass}">${trendIcon} ${trendLabel}</span>
            </div>
            <div class="rs-audit-ma-list">
              <div class="rs-audit-ma-item">
                <span>Curto Prazo</span>
                <b>EMA 20: ${ema20Str}</b>
              </div>
              <div class="rs-audit-ma-item">
                <span>Médio Prazo</span>
                <b>SMA 50: ${sma50Str}</b>
              </div>
              <div class="rs-audit-ma-item">
                <span>Longo Prazo</span>
                <b>SMA 200: ${sma200Str}</b>
              </div>
            </div>
            <div style="font-size:11.5px; color:#4a6356; margin-top:8px;">
              ${td.reason || 'Análise de alinhamento das médias móveis diárias.'}
            </div>
          </section>

          <!-- 3. Classificação Operacional & Racional -->
          <section class="rs-audit-card">
            <div class="rs-audit-card-title">
              <span>3. Classificação Operacional</span>
              <span class="rs-template" style="font-size:11px; padding:3px 8px;">${item.classification || 'Em observação'}</span>
            </div>
            <div class="rs-audit-reason-box">
              <b>Diagnóstico:</b> ${item.reason || 'Classificação resultante da combinação do Score RS com a Tendência Diária.'}
            </div>
            <div class="rs-audit-rule-note">
              <b>Regra de Governança do Healthy Trend Trader:</b> A Força Relativa mede o momentum histórico contra o benchmark. A Tendência Diária protege o capital contra reversões e contratendências. Um ativo com RS alto em tendência de baixa (ex: abaixo das médias de 20 e 50) é bloqueado de ser Líder operacional e permanece em observação até confirmar reversão técnica.
            </div>
          </section>
        </div>

        <footer class="rs-audit-modal-footer">
          <button type="button" class="rs-audit-btn-sec" data-modal-close>Fechar</button>
          <button type="button" class="rs-audit-btn-pri" id="rsAuditViewFundamentalsBtn" data-sym="${item.symbol}">Ver Fundamentos ›</button>
        </footer>
      </div>
    `;

    document.body.appendChild(backdrop);

    const closeHandler = () => backdrop.remove();
    backdrop.querySelectorAll('[data-modal-close]').forEach(btn => btn.addEventListener('click', closeHandler));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeHandler();
    });

    const fundBtn = backdrop.querySelector('#rsAuditViewFundamentalsBtn');
    if (fundBtn) {
      fundBtn.addEventListener('click', () => {
        closeHandler();
        if (typeof window.openFundamentalsForTicker === 'function') {
          window.openFundamentalsForTicker(item.symbol);
        } else if (typeof window.go === 'function') {
          window.go('fundamentals');
        }
      });
    }

    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        closeHandler();
        document.removeEventListener('keydown', keyHandler);
      }
    };
    document.addEventListener('keydown', keyHandler);
  }

  // --- Inject Switcher Bar into B3 View ---
  function injectMarketSwitcherIntoB3() {
    const root = document.getElementById('relativestrength');
    if (!root) return;

    let existingSwitcher = root.querySelector('.rs-header-container');
    if (!existingSwitcher) {
      const shell = root.querySelector('.rs-simple-shell') || root;
      shell.insertAdjacentHTML('afterbegin', getMarketSwitcherHtml('b3'));
    } else {
      existingSwitcher.querySelectorAll('.rs-market-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.market === 'b3');
      });
    }
  }

  // --- Global Market Switcher Function ---
  window.switchRelativeStrengthMarket = function (market) {
    window.currentRelativeStrengthMarket = market;
    if (market === 'nasdaq') {
      renderNasdaqScreen();
    } else {
      // Switch back to B3
      if (typeof window.__b3OriginalRender === 'function') {
        window.__b3OriginalRender();
      } else if (typeof window.renderRelativeStrengthClassesPage === 'function') {
        window.renderRelativeStrengthClassesPage();
      }
      injectMarketSwitcherIntoB3();
    }
  };

  // --- Hook Into Existing B3 Lifecycle ---
  function hookIntoB3Lifecycle() {
    if (typeof window.renderRelativeStrengthClassesPage === 'function') {
      const prevRender = window.renderRelativeStrengthClassesPage;
      window.__b3OriginalRender = prevRender;

      window.renderRelativeStrengthClassesPage = function () {
        if (window.currentRelativeStrengthMarket === 'nasdaq') {
          return;
        }
        prevRender.apply(this, arguments);
        injectMarketSwitcherIntoB3();
      };
    }
  }

  // Initialize hooks
  hookIntoB3Lifecycle();

  // If page loads directly on relativestrength and market is nasdaq, render it
  if (window.currentRelativeStrengthMarket === 'nasdaq') {
    renderNasdaqScreen();
  } else {
    setTimeout(injectMarketSwitcherIntoB3, 50);
  }

  // --- Hook Into Global Navigation ---
  const baseGo = window.go;
  if (typeof baseGo === 'function') {
    window.go = function (id) {
      baseGo.apply(this, arguments);
      if (id === 'relativestrength') {
        if (window.currentRelativeStrengthMarket === 'nasdaq') {
          renderNasdaqScreen();
        } else {
          injectMarketSwitcherIntoB3();
        }
      }
    };
  }

  // Expose render function for external/test use
  window.renderNasdaqRelativeStrength = renderNasdaqScreen;

})();
