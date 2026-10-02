(function () {
  'use strict';

  const defaultTicker = 'PETR4';
  let currentTicker = defaultTicker;
  let tickerData = null;
  let searchUniverse = [];
  let chartInstance = null;
  let candleSeries = null;
  let ema9Series = null;
  let ema30Series = null;
  let volumeSeries = null;
  let disciplineState = null;

  // Carrega e inicializa o estado de disciplina
  function initDiscipline() {
    if (window.TickerChartModel) {
      disciplineState = window.TickerChartModel.loadDisciplineState();
    }
  }

  // Busca o universo pesquisável do backend
  async function loadUniverse() {
    try {
      const res = await window.healthyTrendApi ? window.healthyTrendApi.request('/api/market-data/ticker-universe') : fetch('/api/market-data/ticker-universe').then(r => r.json());
      searchUniverse = Array.isArray(res) ? res : [];
    } catch (err) {
      console.warn('Falha ao carregar universo de busca:', err);
    }
  }

  // Busca dados analíticos completos do ticker
  async function loadTickerData(symbol) {
    const sym = String(symbol || defaultTicker).trim().toUpperCase();
    currentTicker = sym;
    const root = document.getElementById('tickerChartRoot');
    if (!root) return;

    try {
      const url = `/api/market-data/ticker-chart?ticker=${encodeURIComponent(sym)}`;
      const res = window.healthyTrendApi ? await window.healthyTrendApi.request(url) : await fetch(url).then(r => r.json());
      if (res.error) throw new Error(res.error);
      tickerData = res;
      renderAll();
    } catch (err) {
      console.error('Erro ao carregar dados do ticker:', err);
      root.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #64748b;">
          <h3>Não foi possível carregar os dados para ${sym}</h3>
          <p>${err.message || 'Verifique se o ticker está cadastrado no sistema.'}</p>
          <button class="primary" onclick="window.loadTickerChart('${defaultTicker}')" style="margin-top: 16px;">Voltar para ${defaultTicker}</button>
        </div>
      `;
    }
  }

  function renderAll() {
    const root = document.getElementById('tickerChartRoot');
    if (!root || !tickerData) return;

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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
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
            <span>●</span> ${getDisciplinePillText(disciplineState)}
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
            <div class="ticker-hero-name">${tickerData.tickerInfo.name}</div>
          </div>
        </div>

        <div class="ticker-hero-meta-columns">
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
          <button class="btn-watchlist-toggle" id="btnToggleWatchlist">
            <span>⭐</span> Adicionar à Watchlist
          </button>
          <button class="btn-icon-more" id="btnMoreTickerOptions" title="Mais opções">⋮</button>
        </div>
      </div>

      <!-- 3. MAIN CHART & VISÃO DO ATIVO GRID -->
      <div class="ticker-main-grid">
        <div class="ticker-chart-card">
          <div class="ticker-chart-toolbar">
            <div class="chart-toolbar-left">
              <div class="chart-timeframe-badge">D</div>
              <div class="chart-timeframe-select-wrap" title="O Healthy Trend Trader opera estritamente no gráfico Diário para eliminar o ruído intraday.">
                <span>Diário (oficial)</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
              <button class="chart-toolbar-btn" id="btnChartIndicators">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
                Indicadores
              </button>
              <button class="chart-toolbar-btn" id="btnChartCompare">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7M11 18H8a2 2 0 0 1-2-2V9"/></svg>
                Comparar
              </button>
              <button class="chart-toolbar-btn" id="btnChartNotes">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Anotações
              </button>
              <button class="chart-toolbar-btn" id="btnChartSettings">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </button>
            </div>
            <div class="chart-toolbar-right">
              <button class="chart-toolbar-btn" id="btnChartFullscreen" title="Tela cheia">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
              </button>
            </div>
          </div>

          <div class="chart-canvas-wrapper" id="lightweightChartContainer">
            <div class="chart-legend-overlay" id="chartLegendOverlay">
              <div class="legend-row-main" id="legendMainRow">
                <span>${tickerData.tickerInfo.symbol} · 1D · B3</span>
                <span>Abr ${formatNumber(tickerData.ohlc.at(-1)?.open)}</span>
                <span>Máx ${formatNumber(tickerData.ohlc.at(-1)?.high)}</span>
                <span>Mín ${formatNumber(tickerData.ohlc.at(-1)?.low)}</span>
                <span>Fch ${formatNumber(tickerData.ohlc.at(-1)?.close)}</span>
                <span style="color: ${tickerData.tickerInfo.dayChange >= 0 ? '#10b981' : '#ef4444'}">
                  ${tickerData.tickerInfo.dayChange >= 0 ? '+' : ''}${formatNumber(tickerData.tickerInfo.dayChange)} (${tickerData.tickerInfo.dayChangePct >= 0 ? '+' : ''}${formatNumber(tickerData.tickerInfo.dayChangePct)}%)
                </span>
              </div>
              <div class="legend-row-indicators" id="legendIndicatorsRow">
                <span class="legend-ema9">EMA 9: ${formatNumber(tickerData.indicators.ema9.at(-1)?.value)}</span>
                <span class="legend-ema30">EMA 30: ${formatNumber(tickerData.indicators.ema30.at(-1)?.value)}</span>
                <span class="legend-vol">Volume: ${(tickerData.ohlc.at(-1)?.volume / 1e6).toFixed(1)}M</span>
              </div>
            </div>
          </div>
        </div>

        <!-- VISÃO DO ATIVO CARD -->
        <div class="ticker-summary-card">
          <div>
            <div class="summary-card-head">
              <div class="summary-card-head-left">
                <div class="summary-trophy-badge">🏆</div>
                <div class="summary-titles">
                  <div class="summary-title">Visão do Ativo</div>
                  <div class="summary-subtitle">Baseado no seu método e no rubric atual.</div>
                </div>
              </div>
              <div class="summary-grade-box grade-${tickerData.rubric.finalGrade.toLowerCase()}">
                ${tickerData.rubric.finalGrade}
              </div>
            </div>

            <div class="summary-checklist">
              <div class="summary-check-row">
                <div class="summary-check-left">
                  <span>📈</span> Força Relativa
                </div>
                <div class="summary-check-right" style="color: #10b981;">
                  ${tickerData.relativeStrength.classification} (${tickerData.relativeStrength.score})
                </div>
              </div>
              <div class="summary-check-row">
                <div class="summary-check-left">
                  <span>🔄</span> Ciclo de Mercado
                </div>
                <div class="summary-check-right" style="color: ${tickerData.marketCycle.regime === 'Positivo' ? '#10b981' : '#f59e0b'};">
                  ● ${tickerData.marketCycle.regime}
                </div>
              </div>
              <div class="summary-check-row">
                <div class="summary-check-left">
                  <span>📈</span> Tendência
                </div>
                <div class="summary-check-right" style="color: #10b981;">
                  ● ${tickerData.trend.formula}
                </div>
              </div>
              <div class="summary-check-row">
                <div class="summary-check-left">
                  <span>☁️</span> Estrutura
                </div>
                <div class="summary-check-right" style="color: #10b981;">
                  ● ${tickerData.structure.label}
                </div>
              </div>
              <div class="summary-check-row">
                <div class="summary-check-left">
                  <span>🎯</span> Gatilho
                </div>
                <div class="summary-check-right" style="color: #10b981;">
                  ● ${tickerData.trigger.name}
                </div>
              </div>
              <div class="summary-check-row">
                <div class="summary-check-left">
                  <span>📊</span> Volatilidade
                </div>
                <div class="summary-check-right" style="color: #10b981;">
                  ● ${tickerData.volatility.regime} (ATR ${formatNumber(tickerData.volatility.atr21)} | ${formatNumber(tickerData.volatility.atrPct)}%)
                </div>
              </div>
              <div class="summary-check-row">
                <div class="summary-check-left">
                  <span>🏛️</span> Fundamentos
                </div>
                <div class="summary-check-right" style="color: #10b981;">
                  ● Fortes
                </div>
              </div>
              <div class="summary-check-row">
                <div class="summary-check-left">
                  <span>🎯</span> Contexto
                </div>
                <div class="summary-check-right" style="color: #10b981;">
                  ● Super Contexto
                </div>
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
              <div class="method-card-icon">📈</div>
              <div class="method-card-title">Força Relativa</div>
            </div>
            <div class="method-card-badge">${tickerData.relativeStrength.classification}</div>
          </div>
          <div class="method-card-body">
            <div class="method-big-score">${tickerData.relativeStrength.score}</div>
            <div class="method-card-desc">${tickerData.relativeStrength.percentile}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
              Ranking: <b>${tickerData.relativeStrength.rank} / ${tickerData.relativeStrength.totalUniverse}</b> · RS (3M): <b style="color: #10b981;">+${tickerData.relativeStrength.rs3m}%</b>
            </div>
          </div>
        </div>

        <!-- Card 2: Ciclo de Mercado -->
        <div class="method-card">
          <div class="method-card-head">
            <div class="method-card-head-left">
              <div class="method-card-icon">🎯</div>
              <div class="method-card-title">Ciclo de Mercado</div>
            </div>
            <div class="method-card-badge">${tickerData.marketCycle.benchmark}</div>
          </div>
          <div class="method-card-body">
            <div style="font-size: 20px; font-weight: 800; color: #10b981; display: flex; align-items: center; gap: 6px;">
              <span>●</span> ${tickerData.marketCycle.regime}
            </div>
            <div class="method-card-desc">${tickerData.marketCycle.description}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
              Score Institucional: <b>${tickerData.marketCycle.score} / 100</b>
            </div>
          </div>
        </div>

        <!-- Card 3: Tendência -->
        <div class="method-card">
          <div class="method-card-head">
            <div class="method-card-head-left">
              <div class="method-card-icon">📈</div>
              <div class="method-card-title">Tendência</div>
            </div>
            <div class="method-card-badge">${tickerData.trend.status}</div>
          </div>
          <div class="method-card-body">
            <div class="method-checklist-mini">
              <div><span style="color: #10b981;">✔</span> Preço acima da EMA 9</div>
              <div><span style="color: #10b981;">✔</span> EMA 9 acima da EMA 30</div>
              <div><span style="color: #10b981;">✔</span> Ambas inclinadas para cima</div>
            </div>
          </div>
        </div>

        <!-- Card 4: Volatilidade (ATR) -->
        <div class="method-card">
          <div class="method-card-head">
            <div class="method-card-head-left">
              <div class="method-card-icon">📉</div>
              <div class="method-card-title">Volatilidade (ATR)</div>
            </div>
            <div class="method-card-badge">${tickerData.volatility.regime}</div>
          </div>
          <div class="method-card-body">
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
              <span style="color: #64748b;">ATR (21):</span> <b>R$ ${formatNumber(tickerData.volatility.atr21)}</b>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
              <span style="color: #64748b;">ATR %:</span> <b>${formatNumber(tickerData.volatility.atrPct)}%</b>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <span style="color: #64748b;">Regime:</span> <b style="color: #10b981;">${tickerData.volatility.regime}</b>
            </div>
          </div>
        </div>

        <!-- Card 5: Estrutura -->
        <div class="method-card">
          <div class="method-card-head">
            <div class="method-card-head-left">
              <div class="method-card-icon">🗂️</div>
              <div class="method-card-title">Estrutura</div>
            </div>
          </div>
          <div class="method-card-body">
            <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
              ${tickerData.structure.label}
            </div>
            <div class="method-card-desc">${tickerData.structure.description}</div>
          </div>
        </div>

        <!-- Card 6: Gatilho -->
        <div class="method-card">
          <div class="method-card-head">
            <div class="method-card-head-left">
              <div class="method-card-icon">🎯</div>
              <div class="method-card-title">Gatilho</div>
            </div>
            <div class="method-card-badge gold">${tickerData.trigger.grade}</div>
          </div>
          <div class="method-card-body">
            <div style="font-size: 17px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
              ${tickerData.trigger.name}
            </div>
            <div class="method-card-desc">${tickerData.trigger.description}</div>
          </div>
        </div>
      </div>

      <!-- 5. DETAILED ANALYSIS WIDGETS (ROW 2 - 4 CARDS) -->
      <div class="detailed-widgets-row">
        <!-- Rubric do Ativo -->
        <div class="detailed-card">
          <div class="detailed-card-head">
            <div class="detailed-card-head-left">
              <span style="font-size: 14px;">📋</span>
              <span class="detailed-card-title">Rubric do Ativo</span>
            </div>
            <a class="detailed-card-link" onclick="window.go('newtrade')">Ver detalhes →</a>
          </div>
          <div class="rubric-split-layout">
            <table class="rubric-criteria-table">
              <tbody>
                ${tickerData.rubric.criteria.map(c => `
                  <tr>
                    <td style="color: #475569;">${c.name}</td>
                    <td>✔</td>
                    <td style="color: #0f172a; font-weight: 600; text-align: right;">${c.obs}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="rubric-final-box">
              <div class="rubric-final-label">Nota Final</div>
              <div class="rubric-final-grade">${tickerData.rubric.finalGrade}</div>
              <div class="rubric-final-text">${tickerData.rubric.summaryText}</div>
            </div>
          </div>
        </div>

        <!-- Fundamentos -->
        <div class="detailed-card">
          <div class="detailed-card-head">
            <div class="detailed-card-head-left">
              <span style="font-size: 14px;">🏛️</span>
              <span class="detailed-card-title">Fundamentos</span>
            </div>
            <a class="detailed-card-link" onclick="window.go('fundamentals')">Ver mais →</a>
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
              <span style="font-size: 14px;">📊</span>
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
                <span class="ticker-search-score-badge" style="font-size: 10px;">${tickerData.liquidity.spreadRating}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Contexto -->
        <div class="detailed-card">
          <div class="detailed-card-head">
            <div class="detailed-card-head-left">
              <span style="font-size: 14px;">🎯</span>
              <span class="detailed-card-title">Contexto</span>
            </div>
          </div>
          <div class="context-content">
            <div class="context-title">${tickerData.context.title}</div>
            <div class="context-desc">${tickerData.context.description}</div>
            <div class="context-checklist">
              <div><span style="color: #10b981;">✔</span> Preço acima da EMA 10</div>
              <div><span style="color: #10b981;">✔</span> EMA 10 > EMA 20 > EMA 50</div>
              <div><span style="color: #10b981;">✔</span> Rumo às máximas históricas</div>
              <div><span style="color: #10b981;">✔</span> Líder do setor</div>
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

    chartInstance = window.LightweightCharts.createChart(container, {
      width: container.clientWidth,
      height: 480,
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
        scaleMargins: { top: 0.1, bottom: 0.22 }
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
      wickDownColor: '#ef4444'
    });
    candleSeries.setData(data.ohlc);

    // EMA 9 Line
    ema9Series = chartInstance.addLineSeries({
      color: '#0d9488',
      lineWidth: 2,
      title: 'EMA 9'
    });
    ema9Series.setData(data.indicators.ema9);

    // EMA 30 Line
    ema30Series = chartInstance.addLineSeries({
      color: '#d97706',
      lineWidth: 2,
      title: 'EMA 30'
    });
    ema30Series.setData(data.indicators.ema30);

    // Volume Histogram Series
    volumeSeries = chartInstance.addHistogramSeries({
      color: '#64748b',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // Overlay no mesmo painel
      scaleMargins: { top: 0.8, bottom: 0 }
    });

    const volumeData = data.ohlc.map(c => ({
      time: c.time,
      value: c.volume || 0,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'
    }));
    volumeSeries.setData(volumeData);

    chartInstance.timeScale().fitContent();

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
          <span class="legend-ema9">EMA 9: ${formatNumber(data.indicators.ema9.at(-1)?.value)}</span>
          <span class="legend-ema30">EMA 30: ${formatNumber(data.indicators.ema30.at(-1)?.value)}</span>
          <span class="legend-vol">Volume: ${(last?.volume / 1e6).toFixed(1)}M</span>
        `;
        return;
      }

      const bar = param.seriesData.get(candleSeries);
      const e9 = param.seriesData.get(ema9Series);
      const e30 = param.seriesData.get(ema30Series);
      const vol = param.seriesData.get(volumeSeries);

      if (bar) {
        const change = bar.close - bar.open;
        const changePct = bar.open ? (change / bar.open) * 100 : 0;
        legendMain.innerHTML = `
          <span>${data.tickerInfo.symbol} · ${param.time}</span>
          <span>Abr ${formatNumber(bar.open)}</span>
          <span>Máx ${formatNumber(bar.high)}</span>
          <span>Mín ${formatNumber(bar.low)}</span>
          <span>Fch ${formatNumber(bar.close)}</span>
          <span style="color: ${change >= 0 ? '#10b981' : '#ef4444'}">
            ${change >= 0 ? '+' : ''}${formatNumber(change)} (${changePct >= 0 ? '+' : ''}${formatNumber(changePct)}%)
          </span>
        `;
      }
      if (e9 || e30 || vol) {
        legendInd.innerHTML = `
          <span class="legend-ema9">EMA 9: ${formatNumber(e9?.value)}</span>
          <span class="legend-ema30">EMA 30: ${formatNumber(e30?.value)}</span>
          <span class="legend-vol">Volume: ${vol?.value ? (vol.value / 1e6).toFixed(1) + 'M' : '—'}</span>
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

  function setupEventListeners() {
    // Busca e Autocomplete
    const searchInput = document.getElementById('tickerSearchInput');
    const dropdown = document.getElementById('tickerSearchDropdown');

    if (searchInput && dropdown) {
      searchInput.addEventListener('input', (e) => {
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

        dropdown.innerHTML = filtered.map(item => `
          <div class="ticker-search-item" data-symbol="${item.symbol}">
            <div class="ticker-search-item-left">
              <span class="ticker-search-sym">${item.symbol}</span>
              <span class="ticker-search-name">${item.name || ''}</span>
            </div>
            <div class="ticker-search-item-right">
              <span class="ticker-search-class-badge">${item.assetClass || 'B3'}</span>
              ${item.score ? `<span class="ticker-search-score-badge">${item.score}</span>` : ''}
            </div>
          </div>
        `).join('');

        dropdown.classList.add('active');

        // Click no item do dropdown
        dropdown.querySelectorAll('.ticker-search-item').forEach(el => {
          el.addEventListener('click', () => {
            const sym = el.getAttribute('data-symbol');
            dropdown.classList.remove('active');
            searchInput.value = '';
            handleTickerSelect(sym);
          });
        });
      });

      // Pressionar Enter seleciona o primeiro item ou ticker digitado
      searchInput.addEventListener('keydown', (e) => {
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
      });

      // Fecha dropdown ao clicar fora
      document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.remove('active');
        }
      });
    }

    // Toggle Watchlist
    const btnWatchlist = document.getElementById('btnToggleWatchlist');
    if (btnWatchlist) {
      btnWatchlist.addEventListener('click', () => {
        btnWatchlist.classList.toggle('active');
        const isActive = btnWatchlist.classList.contains('active');
        btnWatchlist.innerHTML = isActive ? '<span>★</span> Na Watchlist' : '<span>⭐</span> Adicionar à Watchlist';
        if (window.healthyTrendApi) {
          window.healthyTrendApi.request('/api/watchlist', {
            method: 'POST',
            body: { ticker: currentTicker }
          }).catch(() => {});
        }
      });
    }

    // Drawer de Disciplina
    const btnOpenDrawer = document.getElementById('btnOpenDisciplineDrawer');
    const drawer = document.getElementById('disciplineDrawer');
    const overlay = document.getElementById('disciplineDrawerOverlay');
    const btnCloseDrawer = document.getElementById('btnCloseDisciplineDrawer');

    if (btnOpenDrawer && drawer && overlay) {
      btnOpenDrawer.addEventListener('click', () => {
        drawer.classList.add('active');
        overlay.classList.add('active');
      });

      const closeFn = () => {
        drawer.classList.remove('active');
        overlay.classList.remove('active');
      };

      if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeFn);
      overlay.addEventListener('click', closeFn);
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
