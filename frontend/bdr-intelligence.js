(function (root) {
  'use strict';

  /**
   * HEALTHY TREND TRADER — PAINEL DE INTELIGÊNCIA BDR (FRONTEND CONTROLLER)
   *
   * Arquitetura em 4 Blocos de Largura Total (100% Full-Width Dark Workspace):
   * - BLOCO 1: Identificação, Cotações Sincronizadas e Diagnóstico Geral.
   * - BLOCO 2: Três Fatores de Análise (1. Mercado de Origem EMA 10/30, 2. Empresa Ação Original EMA 10/72, 3. Câmbio USD/BRL).
   * - BLOCO 3: Decomposição do Preço da BDR (Esquerda) e Orientação para Tomada de Decisão em 3 Níveis (Direita).
   * - BLOCO 4: Matriz de Interpretação Completa (Todas as 27 combinações em largura total com destaque para o cenário ativo).
   */

  const state = {
    loading: false,
    loaded: false,
    selectedTicker: 'AAPL34',
    selectedData: null,
    catalog: [],
    catalogBySymbol: new Map(),
    matrixFilter: 'ALL', // 'ALL' | 'POSITIVE' | 'TRANSITION' | 'NEGATIVE'
    updatedAt: null,
    error: null
  };

  function esc(val) {
    return String(val ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatBrl(val, decimals = 2) {
    const n = Number(val);
    if (!Number.isFinite(n)) return '—';
    return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function formatUsd(val, decimals = 2) {
    const n = Number(val);
    if (!Number.isFinite(n)) return '—';
    return 'US$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function formatNumberPt(val, decimals = 2) {
    const n = Number(val);
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function formatSignedPct(val, decimals = 2) {
    const n = Number(val);
    if (!Number.isFinite(n)) return '—';
    const sign = n > 0 ? '+' : '';
    return sign + n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + '%';
  }

  function formatTimestampPt(isoStr) {
    if (!isoStr) return 'Dados em cache';
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return String(isoStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }

  function renderBrandLogo(bdrSymbol, underlyingSymbol) {
    if (typeof root.OpportunityRadarModel?.resolveAssetLogoUrl === 'function') {
      const sym = String(bdrSymbol || '').trim().toUpperCase();
      const brand = root.OpportunityRadarModel.getAssetBrandDetails(sym) || {
        brandText: (underlyingSymbol || sym).slice(0, 4),
        bg: '#134e4a',
        fg: '#ffffff'
      };
      const logoUrl = root.OpportunityRadarModel.resolveAssetLogoUrl(sym);
      return `
        <div class="bdr-brand-logo" data-ticker="${esc(sym)}">
          <div class="bdr-brand-logo-fallback" style="background:${esc(brand.bg)};color:${esc(brand.fg)};">
            ${esc(brand.brandText)}
          </div>
          ${logoUrl ? `<img src="${esc(logoUrl)}" alt="${esc(sym)}" class="bdr-brand-logo-img" onload="this.style.opacity='1';this.previousElementSibling.style.display='none';" onerror="this.style.display='none';" />` : ''}
        </div>
      `;
    }
    return `
      <div class="bdr-brand-logo">
        <div class="bdr-brand-logo-fallback">${esc((underlyingSymbol || bdrSymbol || 'BDR').slice(0, 4))}</div>
      </div>
    `;
  }

  /**
   * Renderiza gráfico SVG amplo de candles diários com médias móveis sincronizadas (EMA 10/30 ou EMA 10/72)
   */
  function renderFactorMiniChartSvg(series, options = {}) {
    if (!Array.isArray(series) || series.length < 3) {
      return `
        <div class="bdr-mini-chart-empty">
          <span>Série gráfica diária indisponível</span>
        </div>
      `;
    }

    const items = series.slice(-26);
    const width = 260;
    const height = 112;
    const padTop = 10;
    const padBottom = 10;
    const padX = 8;

    const fastKey = options.fastKey || null;
    const slowKey = options.slowKey || null;

    let minVal = Infinity;
    let maxVal = -Infinity;

    for (const c of items) {
      const low = Number(c.low ?? c.close);
      const high = Number(c.high ?? c.close);
      if (Number.isFinite(low) && low < minVal) minVal = low;
      if (Number.isFinite(high) && high > maxVal) maxVal = high;
      if (fastKey && Number.isFinite(Number(c[fastKey]))) {
        minVal = Math.min(minVal, Number(c[fastKey]));
        maxVal = Math.max(maxVal, Number(c[fastKey]));
      }
      if (slowKey && Number.isFinite(Number(c[slowKey]))) {
        minVal = Math.min(minVal, Number(c[slowKey]));
        maxVal = Math.max(maxVal, Number(c[slowKey]));
      }
    }

    if (!Number.isFinite(minVal) || !Number.isFinite(maxVal)) {
      return '<div class="bdr-mini-chart-empty"><span>Sem dados</span></div>';
    }

    const range = Math.max(maxVal - minVal, maxVal * 0.005, 0.0001);
    const usableH = height - padTop - padBottom;
    const usableW = width - padX * 2;
    const stepX = items.length > 1 ? usableW / (items.length - 1) : usableW;
    const candleW = Math.max(3.2, Math.min(6.4, (usableW / items.length) * 0.6));

    const toY = (v) => padTop + (1 - (v - minVal) / range) * usableH;

    const candlesSvg = items.map((c, i) => {
      const x = padX + i * stepX;
      const open = Number(c.open ?? c.close);
      const close = Number(c.close);
      const high = Number(c.high ?? Math.max(open, close));
      const low = Number(c.low ?? Math.min(open, close));
      const isUp = close >= open;
      const color = isUp ? '#10b981' : '#ef4444';

      const yHigh = toY(high);
      const yLow = toY(low);
      const yTop = toY(Math.max(open, close));
      const yBot = toY(Math.min(open, close));
      const bodyH = Math.max(2.0, yBot - yTop);

      return `
        <line x1="${x.toFixed(1)}" y1="${yHigh.toFixed(1)}" x2="${x.toFixed(1)}" y2="${yLow.toFixed(1)}" stroke="${color}" stroke-width="1.2" stroke-opacity="0.88" />
        <rect x="${(x - candleW / 2).toFixed(1)}" y="${yTop.toFixed(1)}" width="${candleW.toFixed(1)}" height="${bodyH.toFixed(1)}" rx="1" fill="${color}" />
      `;
    }).join('');

    const buildLinePath = (key) => {
      if (!key) return '';
      const pts = [];
      items.forEach((c, i) => {
        const val = Number(c[key]);
        if (Number.isFinite(val)) {
          const x = padX + i * stepX;
          const y = toY(val);
          pts.push(`${pts.length === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
        }
      });
      return pts.join(' ');
    };

    const fastPath = buildLinePath(fastKey);
    const slowPath = buildLinePath(slowKey);
    const fastColor = options.fastColor || '#38bdf8';
    const slowColor = options.slowColor || '#c084fc';

    return `
      <svg class="bdr-factor-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1="${(height * 0.25).toFixed(0)}" x2="${width}" y2="${(height * 0.25).toFixed(0)}" stroke="rgba(148,163,184,0.11)" stroke-dasharray="2,2" />
        <line x1="0" y1="${(height * 0.50).toFixed(0)}" x2="${width}" y2="${(height * 0.50).toFixed(0)}" stroke="rgba(148,163,184,0.11)" stroke-dasharray="2,2" />
        <line x1="0" y1="${(height * 0.75).toFixed(0)}" x2="${width}" y2="${(height * 0.75).toFixed(0)}" stroke="rgba(148,163,184,0.11)" stroke-dasharray="2,2" />
        ${candlesSvg}
        ${slowPath ? `<path d="${slowPath}" fill="none" stroke="${slowColor}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />` : ''}
        ${fastPath ? `<path d="${fastPath}" fill="none" stroke="${fastColor}" stroke-width="2.0" stroke-linecap="round" stroke-linejoin="round" />` : ''}
      </svg>
    `;
  }

  function buildFallbackFromModel(ticker) {
    if (!root.BdrIntelligenceModel) return null;
    const sym = String(ticker || 'AAPL34').trim().toUpperCase();
    const meta = root.BdrIntelligenceModel.getBdrMetadata(sym);

    const bdrCandles = [];
    const underlyingCandles = [];
    const benchmarkCandles = [];
    const fxCandles = [];

    for (let i = 0; i < 80; i++) {
      const day = String((i % 28) + 1).padStart(2, '0');
      const month = String(Math.floor(i / 28) + 9).padStart(2, '0');
      const date = `2026-${month}-${day}`;
      const uClose = Number((180 + i * 0.22 + Math.sin(i * 0.4) * 1.1).toFixed(2));
      const fxClose = Number((5.85 - i * 0.004 + Math.cos(i * 0.3) * 0.015).toFixed(4));
      const bClose = Number((uClose * fxClose * meta.conversionFactor).toFixed(2));
      const idxClose = Number((20400 + i * 15 + Math.sin(i * 0.35) * 45).toFixed(2));

      underlyingCandles.push({ date, open: uClose * 0.995, high: uClose * 1.008, low: uClose * 0.992, close: uClose });
      fxCandles.push({ date, open: fxClose * 1.003, high: fxClose * 1.006, low: fxClose * 0.996, close: fxClose });
      bdrCandles.push({ date, open: bClose * 1.002, high: bClose * 1.009, low: bClose * 0.994, close: bClose });
      benchmarkCandles.push({ date, open: idxClose * 0.997, high: idxClose * 1.005, low: idxClose * 0.995, close: idxClose });
    }

    return root.BdrIntelligenceModel.evaluateBdrIntelligence({
      ...meta,
      bdrCandles,
      underlyingCandles,
      benchmarkCandles,
      fxCandles,
      rsScore: 88
    });
  }

  async function fetchBdrIntelligence(ticker, options = {}) {
    const targetTicker = String(ticker || state.selectedTicker || 'AAPL34').trim().toUpperCase();
    state.loading = true;
    state.error = null;
    if (options.renderLoading !== false) {
      renderBdrIntelligencePage();
    }

    try {
      const force = options.force ? '&force=1' : '';
      const res = await fetch(`/api/bdr-intelligence?ticker=${encodeURIComponent(targetTicker)}${force}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const payload = await res.json();
      state.selectedTicker = payload.selectedTicker || targetTicker;
      state.selectedData = payload.selected;
      state.catalog = Array.isArray(payload.catalog) ? payload.catalog : [];
      state.updatedAt = payload.updatedAt || new Date().toISOString();
      state.loaded = true;

      state.catalogBySymbol.clear();
      for (const item of state.catalog) {
        if (item && item.bdrSymbol) {
          state.catalogBySymbol.set(item.bdrSymbol, item);
        }
      }
    } catch (err) {
      console.warn('[BdrIntelligence] Usando avaliação local de contingência:', err.message);
      const fallback = buildFallbackFromModel(targetTicker);
      if (fallback) {
        state.selectedTicker = fallback.bdrSymbol;
        state.selectedData = fallback;
        if (!state.catalog.length && root.BdrIntelligenceModel?.BDR_CATALOG) {
          state.catalog = Object.values(root.BdrIntelligenceModel.BDR_CATALOG).map((m) => ({
            bdrSymbol: m.bdrSymbol,
            underlyingSymbol: m.underlyingSymbol,
            companyName: m.name,
            exchange: m.exchange,
            benchmarkName: m.benchmarkName,
            watchlistBadge: fallback.watchlistBadge
          }));
        }
        state.loaded = true;
      } else {
        state.error = 'Não foi possível carregar os dados de Inteligência BDR.';
      }
    } finally {
      state.loading = false;
      renderBdrIntelligencePage();
    }
  }

  function isTickerInWatchlist(ticker) {
    if (typeof root.getWatchlistOpportunities !== 'function') return false;
    const list = root.getWatchlistOpportunities() || [];
    const clean = String(ticker || '').trim().toUpperCase();
    return list.some((item) => String(item.ticker || '').trim().toUpperCase() === clean);
  }

  function getDiagnosisIconSvg(tone) {
    if (tone === 'good') {
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    }
    if (tone === 'info') {
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    }
    if (tone === 'bad') {
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    }
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  }

  function renderLevelIcon(tone) {
    if (tone === 'good') {
      return `<span class="bdr-level-dot tone-good" aria-hidden="true">✓</span>`;
    }
    if (tone === 'warn' || tone === 'info') {
      return `<span class="bdr-level-dot tone-warn" aria-hidden="true">!</span>`;
    }
    return `<span class="bdr-level-dot tone-bad" aria-hidden="true">✕</span>`;
  }

  function renderBdrIntelligencePage() {
    const container = document.getElementById('bdrIntelligenceRoot') || document.getElementById('bdrintelligence');
    if (!container) return;

    if (!state.loaded && !state.loading) {
      fetchBdrIntelligence(state.selectedTicker, { renderLoading: true });
      return;
    }

    if (state.loading && !state.selectedData) {
      container.innerHTML = `
        <div class="bdr-intel-shell">
          <div class="bdr-intel-loading">
            <div class="bdr-intel-spinner"></div>
            <p>Sincronizando ciclo internacional (EMA 10/30), estrutura da ação original (EMA 10/72) e impacto cambial...</p>
          </div>
        </div>
      `;
      return;
    }

    const d = state.selectedData || buildFallbackFromModel(state.selectedTicker);
    if (!d) {
      container.innerHTML = `
        <div class="bdr-intel-shell">
          <div class="bdr-intel-error">${esc(state.error || 'Dados indisponíveis.')}</div>
        </div>
      `;
      return;
    }

    const mFactor = d.factors.originMarket;
    const cFactor = d.factors.company;
    const fxFactor = d.factors.fx;
    const decomp = d.decomposition;
    const decision = d.decision;
    const dq = d.dataQuality;
    const inWatchlist = isTickerInWatchlist(d.bdrSymbol);

    const bdrChangeClass = Number(d.quotes.bdrChangePct) >= 0 ? 'is-up' : 'is-down';
    const undChangeClass = Number(d.quotes.underlyingChangePct) >= 0 ? 'is-up' : 'is-down';
    const fxChangeClass = Number(d.quotes.fxChangePct) >= 0 ? 'is-up' : 'is-down';
    const theoChangeClass = Number(decomp.theoreticalBdrChangePct) >= 0 ? 'is-up' : 'is-down';

    const catalogOptions = (state.catalog.length ? state.catalog : [d]).map((item) => {
      const sym = item.bdrSymbol;
      const uSym = item.underlyingSymbol || '';
      const name = item.companyName || sym;
      const isSel = sym === d.bdrSymbol ? 'selected' : '';
      return `<option value="${esc(sym)}" ${isSel}>${esc(sym)} — ${esc(name)} (${esc(uSym)})</option>`;
    }).join('');

    const fullMatrix = Array.isArray(d.matrix) ? d.matrix : [];
    const filteredMatrix = state.matrixFilter === 'ALL'
      ? fullMatrix
      : fullMatrix.filter((row) => row.market === state.matrixFilter);

    container.innerHTML = `
      <div class="bdr-intel-shell">
        <!-- HEADER DA PÁGINA -->
        <header class="bdr-intel-header">
          <div class="bdr-intel-header-left">
            <div class="bdr-intel-globe-icon" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                <path d="M2 12h20"/>
              </svg>
            </div>
            <div class="bdr-intel-titles">
              <h1>Inteligência BDR</h1>
              <p>Análise integrada: mercado de origem, empresa e câmbio</p>
            </div>
          </div>

          <div class="bdr-intel-header-right">
            <span class="bdr-sync-badge status-${esc(dq.status.toLowerCase())}" title="${esc(dq.warningMessage || 'Séries diárias sincronizadas')}">
              <span class="bdr-sync-dot"></span>
              ${esc(dq.badgeText)}
            </span>
            <button type="button" class="bdr-refresh-btn" onclick="window.BdrIntelligence.refresh()" title="Sincronizar cotações diárias">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
              </svg>
              <span>Última atualização: ${esc(formatTimestampPt(d.updatedAt))}</span>
            </button>
          </div>
        </header>

        ${dq.warningMessage ? `
          <div class="bdr-data-quality-alert status-${esc(dq.status.toLowerCase())}" role="status">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>${esc(dq.warningMessage)}</span>
          </div>
        ` : ''}

        <!-- ===============================================================
             BLOCO 1 — IDENTIFICAÇÃO, COTAÇÕES E DIAGNÓSTICO GERAL (100% WIDTH)
             =============================================================== -->
        <section class="bdr-block-1" aria-label="Bloco 1 — Identificação e diagnóstico geral">
          <div class="bdr-top-card">
            <div class="bdr-top-identity-row">
              <div class="bdr-selector-group">
                <div class="bdr-select-wrap">
                  <select id="bdrIntelTickerSelect" class="bdr-ticker-select" aria-label="Selecionar ativo BDR" onchange="window.BdrIntelligence.selectTicker(this.value)">
                    ${catalogOptions}
                  </select>
                </div>

                <div class="bdr-company-identity">
                  ${renderBrandLogo(d.bdrSymbol, d.underlyingSymbol)}
                  <div class="bdr-company-names">
                    <div class="bdr-company-title-line">
                      <strong class="bdr-company-name">${esc(d.companyName)}</strong>
                      <span class="bdr-tag-pill">BDR</span>
                    </div>
                    <span class="bdr-company-sector">${esc(d.sector)} · Ação original: <strong>${esc(d.underlyingSymbol)}</strong></span>
                  </div>
                </div>
              </div>

              <div class="bdr-origin-meta-group">
                <div class="bdr-meta-item">
                  <span class="bdr-meta-flag" aria-hidden="true">🇺🇸</span>
                  <div class="bdr-meta-copy">
                    <small>Bolsa de origem</small>
                    <strong>${esc(d.exchangeDisplay)}</strong>
                  </div>
                </div>

                <div class="bdr-meta-divider" aria-hidden="true"></div>

                <div class="bdr-meta-item">
                  <span class="bdr-meta-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  </span>
                  <div class="bdr-meta-copy">
                    <small>Índice de referência</small>
                    <strong>${esc(d.benchmarkName)}</strong>
                  </div>
                </div>
              </div>

              <div class="bdr-top-actions">
                <button type="button" class="bdr-action-btn" onclick="window.go && window.go('charts', '${esc(d.bdrSymbol)}')" title="Abrir gráfico diário de ${esc(d.bdrSymbol)}">
                  Gráfico B3 ↗
                </button>
                <button type="button" class="bdr-watchlist-star-btn ${inWatchlist ? 'is-saved' : ''}" onclick="window.BdrIntelligence.toggleWatchlist('${esc(d.bdrSymbol)}')" title="${inWatchlist ? 'Ativo monitorado na Watchlist' : 'Adicionar BDR à Watchlist'}">
                  <span>${inWatchlist ? '★ Na Watchlist' : '☆ Watchlist'}</span>
                </button>
              </div>
            </div>

            <div class="bdr-top-quotes-row">
              <div class="bdr-quote-block">
                <small>${esc(d.bdrSymbol)} (B3 · Cotação Efetiva)</small>
                <div class="bdr-quote-values">
                  <strong class="bdr-quote-price">${formatBrl(d.quotes.bdrPriceBrl)}</strong>
                  <span class="bdr-quote-delta ${bdrChangeClass}">${formatSignedPct(d.quotes.bdrChangePct)}</span>
                </div>
              </div>

              <div class="bdr-quote-block">
                <small>${esc(d.underlyingSymbol)} (${esc(d.country)} · Ação Original)</small>
                <div class="bdr-quote-values">
                  <strong class="bdr-quote-price">${formatUsd(d.quotes.underlyingPriceUsd)}</strong>
                  <span class="bdr-quote-delta ${undChangeClass}">${formatSignedPct(d.quotes.underlyingChangePct)}</span>
                </div>
              </div>

              <div class="bdr-quote-block">
                <small>USD/BRL (Câmbio Diário)</small>
                <div class="bdr-quote-values">
                  <strong class="bdr-quote-price">${formatBrl(d.quotes.fxRate, 2)}</strong>
                  <span class="bdr-quote-delta ${fxChangeClass}">${formatSignedPct(d.quotes.fxChangePct)}</span>
                </div>
              </div>

              <div class="bdr-quote-block bdr-parity-block" title="Proporção oficial de conversão entre a ação original e a BDR negociada na B3">
                <small>Fator de conversão</small>
                <div class="bdr-quote-values">
                  <strong class="bdr-parity-value">${esc(d.parityLabel)}</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- BANNER DE DIAGNÓSTICO GERAL -->
          <div class="bdr-diagnosis-banner tone-${esc(d.diagnosis.tone)}" role="region" aria-label="Diagnóstico Geral">
            <div class="bdr-diagnosis-left">
              <div class="bdr-diagnosis-icon" aria-hidden="true">
                ${getDiagnosisIconSvg(d.diagnosis.tone)}
              </div>
              <div class="bdr-diagnosis-titles">
                <span class="bdr-diagnosis-eyebrow">Diagnóstico Geral · Orientação: ${esc(d.diagnosis.guidance)}</span>
                <h2 class="bdr-diagnosis-status">${esc(d.diagnosis.status)}</h2>
              </div>
            </div>
            <div class="bdr-diagnosis-divider" aria-hidden="true"></div>
            <div class="bdr-diagnosis-right">
              <p class="bdr-diagnosis-explanation">${esc(d.diagnosis.explanation)}</p>
            </div>
          </div>
        </section>

        <!-- ===============================================================
             BLOCO 2 — TRÊS FATORES DE ANÁLISE (3 COLUNAS PROPORCIONAIS)
             =============================================================== -->
        <section class="bdr-factors-grid" aria-label="Bloco 2 — Três fatores de análise">
          <!-- CARD A: 1. MERCADO DE ORIGEM (EMA 10 e EMA 30 no Diário) -->
          <article class="bdr-factor-card factor-market">
            <header class="bdr-factor-head">
              <div class="bdr-factor-title-wrap">
                <div class="bdr-factor-icon icon-market" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                </div>
                <div>
                  <h3>1. Mercado de Origem</h3>
                  <span>Ciclo do mercado internacional (Diário · EMA 10/30)</span>
                </div>
              </div>
              <span class="bdr-factor-badge tone-${esc(mFactor.tone)}">${esc(mFactor.classification)}</span>
            </header>

            <div class="bdr-factor-body">
              <dl class="bdr-factor-metrics">
                <div class="bdr-metric-row">
                  <dt>Índice:</dt>
                  <dd><strong>${esc(mFactor.benchmarkName)}</strong></dd>
                </div>
                <div class="bdr-metric-row">
                  <dt>Cotação / Var.:</dt>
                  <dd class="font-numeric">${formatNumberPt(mFactor.price, 2)} <small class="${Number(mFactor.dayChangePct) >= 0 ? 'is-up' : 'is-down'}">(${formatSignedPct(mFactor.dayChangePct)})</small></dd>
                </div>
                <div class="bdr-metric-row">
                  <dt>EMA 10:</dt>
                  <dd class="font-numeric">${formatNumberPt(mFactor.ema10, 2)}</dd>
                </div>
                <div class="bdr-metric-row">
                  <dt>EMA 30:</dt>
                  <dd class="font-numeric">${formatNumberPt(mFactor.ema30, 2)}</dd>
                </div>
                <div class="bdr-metric-row">
                  <dt>Alinhamento:</dt>
                  <dd class="align-${esc(mFactor.alignmentDirection)}"><strong>${esc(mFactor.alignment)}</strong></dd>
                </div>
                <div class="bdr-metric-row">
                  <dt>Estrutura:</dt>
                  <dd>${esc(mFactor.structure)}</dd>
                </div>
              </dl>

              <div class="bdr-factor-chart-box">
                ${renderFactorMiniChartSvg(mFactor.chartSeries, { fastKey: 'ema10', slowKey: 'ema30', fastColor: '#38bdf8', slowColor: '#c084fc' })}
                <div class="bdr-chart-legend">
                  <span><i style="background:#38bdf8"></i>EMA 10</span>
                  <span><i style="background:#c084fc"></i>EMA 30</span>
                </div>
              </div>
            </div>

            <footer class="bdr-factor-foot">
              <p>${esc(mFactor.summary)}</p>
            </footer>
          </article>

          <!-- CARD B: 2. EMPRESA / AÇÃO ORIGINAL (EMA 10 e EMA 72 no Diário) -->
          <article class="bdr-factor-card factor-company">
            <header class="bdr-factor-head">
              <div class="bdr-factor-title-wrap">
                <div class="bdr-factor-icon icon-company" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                </div>
                <div>
                  <h3>2. Empresa (Ação Original)</h3>
                  <span>Força e estrutura individual (Diário · EMA 10/72)</span>
                </div>
              </div>
              <span class="bdr-factor-badge tone-${esc(cFactor.tone)}">${esc(cFactor.classification)}</span>
            </header>

            <div class="bdr-factor-body">
              <dl class="bdr-factor-metrics">
                <div class="bdr-metric-row">
                  <dt>Ativo:</dt>
                  <dd><strong>${esc(cFactor.underlyingSymbol)} (${esc(d.country)})</strong> · ${formatUsd(cFactor.price)}</dd>
                </div>
                <div class="bdr-metric-row">
                  <dt>Variação diária:</dt>
                  <dd class="font-numeric ${undChangeClass}"><strong>${formatSignedPct(cFactor.dayChangePct)}</strong></dd>
                </div>
                <div class="bdr-metric-row">
                  <dt>EMA 10:</dt>
                  <dd class="font-numeric">${formatUsd(cFactor.ema10)}</dd>
                </div>
                <div class="bdr-metric-row">
                  <dt>EMA 72:</dt>
                  <dd class="font-numeric">${formatUsd(cFactor.ema72)}</dd>
                </div>
                <div class="bdr-metric-row">
                  <dt>Alinhamento:</dt>
                  <dd class="align-${esc(cFactor.alignmentDirection)}"><strong>${esc(cFactor.alignment)}</strong></dd>
                </div>
                <div class="bdr-metric-row">
                  <dt>Força relativa:</dt>
                  <dd><strong>${esc(cFactor.relativeStrengthLabel)}</strong> ${Number.isFinite(cFactor.rsScore) ? `(RS ${cFactor.rsScore})` : ''}</dd>
                </div>
                <div class="bdr-metric-row">
                  <dt>Padrão:</dt>
                  <dd>${esc(cFactor.pattern)}</dd>
                </div>
              </dl>

              <div class="bdr-factor-chart-box">
                ${renderFactorMiniChartSvg(cFactor.chartSeries, { fastKey: 'ema10', slowKey: 'ema72', fastColor: '#34d399', slowColor: '#c084fc' })}
                <div class="bdr-chart-legend">
                  <span><i style="background:#34d399"></i>EMA 10</span>
                  <span><i style="background:#c084fc"></i>EMA 72</span>
                </div>
              </div>
            </div>

            <footer class="bdr-factor-foot">
              <p>${esc(cFactor.summary)}</p>
            </footer>
          </article>

          <!-- CARD C: 3. CÂMBIO (USD/BRL) -->
          <article class="bdr-factor-card factor-fx">
            <header class="bdr-factor-head">
              <div class="bdr-factor-title-wrap">
                <div class="bdr-factor-icon icon-fx" aria-hidden="true">$</div>
                <div>
                  <h3>3. Câmbio (USD/BRL)</h3>
                  <span>Impacto cambial sobre a BDR em reais</span>
                </div>
              </div>
              <span class="bdr-factor-badge tone-${esc(fxFactor.tone)}">${esc(fxFactor.classification)}</span>
            </header>

            <div class="bdr-factor-body">
              <dl class="bdr-factor-metrics">
                <div class="bdr-metric-row">
                  <dt>Cotação:</dt>
                  <dd class="font-numeric"><strong>${formatBrl(fxFactor.rate, 2)}</strong> <small>(${formatNumberPt(fxFactor.rate, 4)})</small></dd>
                </div>
                <div class="bdr-metric-row">
                  <dt>Variação diária:</dt>
                  <dd class="font-numeric ${fxChangeClass}"><strong>${formatSignedPct(fxFactor.dayChangePct)}</strong></dd>
                </div>
                <div class="bdr-metric-row">
                  <dt>Direção:</dt>
                  <dd class="align-${esc(fxFactor.directionCode)}"><strong>${esc(fxFactor.direction)}</strong></dd>
                </div>
                <div class="bdr-metric-row">
                  <dt>Impacto na BDR:</dt>
                  <dd class="impact-${esc(fxFactor.bdrImpact.toLowerCase())}"><strong>${esc(fxFactor.bdrImpact)}</strong></dd>
                </div>
                <div class="bdr-metric-row">
                  <dt>Intensidade:</dt>
                  <dd><strong>${esc(fxFactor.intensity)}</strong></dd>
                </div>
              </dl>

              <div class="bdr-factor-chart-box">
                ${renderFactorMiniChartSvg(fxFactor.chartSeries)}
                <div class="bdr-chart-legend">
                  <span><i style="background:#a855f7"></i>USD/BRL Diário</span>
                </div>
              </div>
            </div>

            <footer class="bdr-fx-note-box">
              <span class="bdr-fx-note-icon" aria-hidden="true">i</span>
              <p>${esc(fxFactor.explanation)}</p>
            </footer>
          </article>
        </section>

        <!-- ===============================================================
             BLOCO 3 — DECOMPOSIÇÃO DO PREÇO (ESQUERDA) & ORIENTAÇÃO (DIREITA)
             =============================================================== -->
        <section class="bdr-middle-split" aria-label="Bloco 3 — Decomposição do preço e orientação de decisão">
          <!-- ESQUERDA: DECOMPOSIÇÃO DO PREÇO DA BDR -->
          <article class="bdr-panel-card bdr-decomposition-card">
            <header class="bdr-panel-head">
              <div class="bdr-panel-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
              </div>
              <div>
                <h3>Decomposição do Preço da BDR</h3>
                <span>De onde vem a movimentação do ativo? (${esc(decomp.dominantDriverLabel)})</span>
              </div>
            </header>

            <div class="bdr-decomposition-content">
              <div class="bdr-decomp-table-wrap">
                <table class="bdr-decomp-table" aria-label="Tabela de decomposição de variação da BDR">
                  <thead>
                    <tr>
                      <th>Componente</th>
                      <th class="col-right">Cotação Base</th>
                      <th class="col-right">Variação Diária</th>
                      <th class="col-right">Contribuição na BDR</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div class="bdr-comp-cell">
                          <span class="bdr-comp-dot dot-stock"></span>
                          <span>Ação original (<strong>${esc(d.underlyingSymbol)}</strong>)</span>
                        </div>
                      </td>
                      <td class="col-right font-numeric">${formatUsd(decomp.underlyingPriceUsd)}</td>
                      <td class="col-right font-numeric ${undChangeClass}"><strong>${formatSignedPct(decomp.underlyingContributionPct)}</strong></td>
                      <td class="col-right font-numeric ${undChangeClass}"><strong>${formatSignedPct(decomp.underlyingContributionPct)}</strong></td>
                    </tr>
                    <tr>
                      <td>
                        <div class="bdr-comp-cell">
                          <span class="bdr-comp-dot dot-fx">$</span>
                          <span>USD/BRL (câmbio)</span>
                        </div>
                      </td>
                      <td class="col-right font-numeric">${formatBrl(decomp.fxRate, 4)}</td>
                      <td class="col-right font-numeric ${fxChangeClass}"><strong>${formatSignedPct(decomp.fxContributionPct)}</strong></td>
                      <td class="col-right font-numeric ${fxChangeClass}"><strong>${formatSignedPct(decomp.fxContributionPct)}</strong></td>
                    </tr>
                    <tr class="bdr-theo-highlight-row">
                      <td>
                        <div class="bdr-comp-cell">
                          <span class="bdr-comp-layers-icon" aria-hidden="true">❖</span>
                          <div>
                            <strong>BDR teórica (${esc(d.bdrSymbol)})</strong>
                            <small>Paridade: ${esc(d.parityLabel)}</small>
                          </div>
                        </div>
                      </td>
                      <td class="col-right font-numeric"><strong>${formatBrl(decomp.theoreticalPriceBrl)}</strong></td>
                      <td class="col-right font-numeric ${theoChangeClass}" colspan="2">
                        <strong class="bdr-theo-total-val">${formatSignedPct(decomp.theoreticalBdrChangePct)}</strong>
                      </td>
                    </tr>
                    <tr class="bdr-observed-b3-row">
                      <td>
                        <div class="bdr-comp-cell">
                          <span class="bdr-comp-dot dot-b3">B3</span>
                          <div>
                            <strong>Cotação efetiva na B3 (${esc(d.bdrSymbol)})</strong>
                            <small>Preço efetivamente negociado</small>
                          </div>
                        </div>
                      </td>
                      <td class="col-right font-numeric"><strong>${formatBrl(decomp.observedPriceBrl)}</strong></td>
                      <td class="col-right font-numeric ${bdrChangeClass}">
                        <strong>${formatSignedPct(decomp.observedBdrChangePct)}</strong>
                      </td>
                      <td class="col-right font-numeric">
                        <span class="bdr-spread-tag" title="Diferença entre o preço efetivamente negociado na B3 e o preço teórico de paridade">
                          Dif.: ${formatSignedPct(decomp.priceDifferencePct)} (${formatBrl(decomp.priceDifferenceBrl)})
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="bdr-decomp-aside">
                <div class="bdr-formula-box">
                  <small>Fórmula de Paridade Teórica:</small>
                  <code>Preço teórico da BDR = Preço da ação original × USD/BRL × Fator</code>
                  <span class="bdr-formula-calc">
                    ${formatUsd(decomp.underlyingPriceUsd)} × ${formatNumberPt(decomp.fxRate, 4)} × ${formatNumberPt(decomp.conversionFactor, 4)} = <strong>${formatBrl(decomp.theoreticalPriceBrl)}</strong>
                  </span>
                </div>

                <div class="bdr-auto-message-box">
                  <span class="bdr-auto-message-icon" aria-hidden="true">i</span>
                  <p>${esc(decomp.message)}</p>
                </div>
              </div>
            </div>
          </article>

          <!-- DIREITA: ORIENTAÇÃO PARA TOMADA DE DECISÃO -->
          <article class="bdr-panel-card bdr-decision-card">
            <header class="bdr-panel-head">
              <div class="bdr-panel-icon icon-target" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </div>
              <div>
                <h3>Orientação para Tomada de Decisão</h3>
                <span>Hierarquia estrutural em 3 níveis (a força da empresa ou o câmbio não compensam ciclo negativo)</span>
              </div>
            </header>

            <div class="bdr-decision-levels">
              <div class="bdr-decision-level-row">
                ${renderLevelIcon(decision.levels.level1.tone)}
                <div class="bdr-level-copy">
                  <strong>Nível 1 — Mercado de origem (${esc(decision.levels.level1.status)}):</strong>
                  <span>${esc(decision.levels.level1.text)}</span>
                </div>
              </div>

              <div class="bdr-decision-level-row">
                ${renderLevelIcon(decision.levels.level2.tone)}
                <div class="bdr-level-copy">
                  <strong>Nível 2 — Qualidade individual (${esc(decision.levels.level2.status)}):</strong>
                  <span>${esc(decision.levels.level2.text)}</span>
                </div>
              </div>

              <div class="bdr-decision-level-row">
                ${renderLevelIcon(decision.levels.level3.tone)}
                <div class="bdr-level-copy">
                  <strong>Nível 3 — Condição cambial (${esc(decision.levels.level3.status)}):</strong>
                  <span>${esc(decision.levels.level3.text)}</span>
                </div>
              </div>
            </div>

            <footer class="bdr-decision-callout tone-${esc(decision.tone)}">
              <span class="bdr-decision-arrow" aria-hidden="true">→</span>
              <div class="bdr-decision-callout-body">
                <strong>Orientação: ${esc(decision.guidance)}.</strong>
                <p>${esc(decision.detailCallout)}</p>
              </div>
            </footer>
          </article>
        </section>

        <!-- ===============================================================
             BLOCO 4 — MATRIZ DE INTERPRETAÇÃO COMPLETA (100% WIDTH)
             =============================================================== -->
        <section class="bdr-matrix-section" aria-label="Bloco 4 — Matriz de Interpretação Completa">
          <header class="bdr-matrix-header">
            <div class="bdr-matrix-intro">
              <div class="bdr-matrix-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
              </div>
              <div>
                <h3>Matriz de Interpretação Completa (${fullMatrix.length} combinações operacionais)</h3>
                <p>Hierarquia de decisão: Ciclo do Mercado de Origem (Nível 1) → Estrutura da Empresa (Nível 2) → Ajuste Cambial (Nível 3)</p>
              </div>
            </div>

            <div class="bdr-matrix-filter-pills" role="tablist" aria-label="Filtrar matriz por ciclo de mercado">
              <button type="button" class="bdr-matrix-filter-btn ${state.matrixFilter === 'ALL' ? 'active' : ''}" onclick="window.BdrIntelligence.setMatrixFilter('ALL')">
                Todas (${fullMatrix.length})
              </button>
              <button type="button" class="bdr-matrix-filter-btn ${state.matrixFilter === 'POSITIVE' ? 'active' : ''}" onclick="window.BdrIntelligence.setMatrixFilter('POSITIVE')">
                Ciclo Positivo (9)
              </button>
              <button type="button" class="bdr-matrix-filter-btn ${state.matrixFilter === 'TRANSITION' ? 'active' : ''}" onclick="window.BdrIntelligence.setMatrixFilter('TRANSITION')">
                Ciclo de Transição (9)
              </button>
              <button type="button" class="bdr-matrix-filter-btn ${state.matrixFilter === 'NEGATIVE' ? 'active' : ''}" onclick="window.BdrIntelligence.setMatrixFilter('NEGATIVE')">
                Ciclo Negativo (9)
              </button>
            </div>
          </header>

          <div class="bdr-full-matrix-wrap">
            <table class="bdr-full-matrix-table" aria-label="Tabela completa da Matriz de Interpretação">
              <thead>
                <tr>
                  <th>Nível 1: Mercado de Origem</th>
                  <th>Nível 2: Empresa (Ação Original)</th>
                  <th>Nível 3: Câmbio (USD/BRL)</th>
                  <th>Diagnóstico Geral</th>
                  <th>Orientação Operacional</th>
                  <th>Fundamentação Metodológica</th>
                </tr>
              </thead>
              <tbody>
                ${filteredMatrix.map((row) => {
                  const isCurrent = row.id === decision.ruleId;
                  const mTone = row.market === 'POSITIVE' ? 'good' : (row.market === 'TRANSITION' ? 'warn' : 'bad');
                  const cTone = row.company === 'POSITIVE' ? 'good' : (row.company === 'RECOVERY' ? 'warn' : 'bad');
                  const fTone = row.fx === 'FAVORABLE' ? 'good' : (row.fx === 'NEUTRAL' ? 'info' : 'bad');
                  return `
                    <tr class="${isCurrent ? 'is-active-matrix-row' : ''}">
                      <td>
                        <span class="bdr-m-pill tone-${mTone}">${esc(row.marketLabel)}</span>
                        ${isCurrent ? '<span class="bdr-current-row-badge">ATUAL</span>' : ''}
                      </td>
                      <td><span class="bdr-m-pill tone-${cTone}">${esc(row.companyLabel)}</span></td>
                      <td><span class="bdr-m-pill tone-${fTone}">${esc(row.fxLabel)}</span></td>
                      <td><span class="bdr-m-topdiag tone-${esc(row.tone)}">${esc(row.topDiagnosis)}</span></td>
                      <td><strong class="bdr-m-guidance tone-${esc(row.tone)}">→ ${esc(row.guidance)}</strong></td>
                      <td class="bdr-m-explanation">${esc(row.explanation)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    `;
  }

  function getWatchlistSummaryForTicker(symbol) {
    const clean = String(symbol || '').trim().toUpperCase();
    if (!root.BdrIntelligenceModel?.isBdrTicker(clean)) return null;

    if (state.catalogBySymbol.has(clean)) {
      return state.catalogBySymbol.get(clean).watchlistBadge;
    }

    if (!state.loaded && !state.loading && typeof fetch === 'function') {
      fetch('/api/bdr-intelligence?ticker=' + encodeURIComponent(clean))
        .then((r) => (r.ok ? r.json() : null))
        .then((payload) => {
          if (payload && Array.isArray(payload.catalog)) {
            state.catalog = payload.catalog;
            state.loaded = true;
            state.catalogBySymbol.clear();
            for (const item of payload.catalog) {
              if (item && item.bdrSymbol) state.catalogBySymbol.set(item.bdrSymbol, item);
            }
            if (document.getElementById('watchlist')?.classList.contains('active') && typeof root.renderWatchlistPage === 'function') {
              root.renderWatchlistPage();
            }
          }
        })
        .catch(() => {});
    }

    const fallback = buildFallbackFromModel(clean);
    return fallback ? fallback.watchlistBadge : null;
  }

  function renderWatchlistCompactBadge(symbol) {
    const summary = getWatchlistSummaryForTicker(symbol);
    if (!summary) return '';

    return `
      <div class="wl-bdr-intel-strip" onclick="event.stopPropagation(); window.openBdrIntelligence('${esc(summary.bdrSymbol)}');" title="Clique para abrir o Painel de Inteligência BDR de ${esc(summary.bdrSymbol)}">
        <span class="wl-bdr-intel-tag">🌐 BDR (${esc(summary.underlyingSymbol)})</span>
        <span class="wl-bdr-factor-chip tone-${esc(summary.originCycleTone)}" title="Ciclo do mercado de origem">Ciclo: ${esc(summary.originCycle.replace('Ciclo ', ''))}</span>
        <span class="wl-bdr-factor-chip tone-${esc(summary.companyStrengthTone)}" title="Força individual da ação original">Ação: ${esc(summary.companyStrength.replace('Estrutura ', ''))}</span>
        <span class="wl-bdr-factor-chip tone-${esc(summary.fxImpactTone)}" title="Impacto cambial USD/BRL">Câmbio: ${esc(summary.fxImpact.replace('Câmbio ', ''))}</span>
        <span class="wl-bdr-diag-chip tone-${esc(summary.diagnosisTone)}">→ ${esc(summary.consolidatedDiagnosis)}</span>
      </div>
    `;
  }

  function openBdrIntelligence(ticker) {
    const clean = String(ticker || state.selectedTicker || 'AAPL34').trim().toUpperCase();
    state.selectedTicker = clean;
    if (typeof root.go === 'function') {
      root.go('bdrintelligence', clean);
    } else {
      fetchBdrIntelligence(clean);
    }
  }

  const BdrIntelligence = {
    state,
    render: function (extraTicker) {
      if (extraTicker && typeof extraTicker === 'string') {
        const clean = extraTicker.trim().toUpperCase();
        if (clean && clean !== state.selectedTicker) {
          state.selectedTicker = clean;
          fetchBdrIntelligence(clean);
          return;
        }
      }
      if (!state.loaded) {
        fetchBdrIntelligence(state.selectedTicker);
      } else {
        renderBdrIntelligencePage();
      }
    },
    selectTicker: function (ticker) {
      const clean = String(ticker || '').trim().toUpperCase();
      if (!clean) return;
      state.selectedTicker = clean;
      fetchBdrIntelligence(clean);
    },
    refresh: function () {
      fetchBdrIntelligence(state.selectedTicker, { force: true });
    },
    setMatrixFilter: function (filter) {
      state.matrixFilter = filter || 'ALL';
      renderBdrIntelligencePage();
    },
    toggleWatchlist: async function (ticker) {
      const clean = String(ticker || state.selectedTicker || '').trim().toUpperCase();
      if (!clean) return;
      if (isTickerInWatchlist(clean) && typeof root.removeFromWatchlist === 'function') {
        await root.removeFromWatchlist(clean);
      } else if (typeof root.addToWatchlist === 'function') {
        const d = state.selectedData;
        await root.addToWatchlist(clean, {
          origin: 'scans',
          name: d?.companyName || clean,
          sector: 'BDRs Internacionais',
          price: d?.quotes?.bdrPriceBrl,
          rsScore: d?.factors?.company?.rsScore,
          thesis: d?.diagnosis?.explanation || ''
        });
      }
      renderBdrIntelligencePage();
    },
    getWatchlistSummaryForTicker,
    renderWatchlistCompactBadge,
    openBdrIntelligence
  };

  root.BdrIntelligence = BdrIntelligence;
  root.renderBdrIntelligencePage = BdrIntelligence.render;
  root.openBdrIntelligence = openBdrIntelligence;

})(typeof globalThis !== 'undefined' ? globalThis : this);
