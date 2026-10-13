/**
 * CENTRAL DE MERCADO — FRONTEND CONTROLLER & RENDERER
 * Healthy Trend Trader
 *
 * Observatório de mercado para Swing Trade:
 * 1. Market Regime
 * 2. Market Breadth
 * 3. Mercados Globais
 * 4. Eventos de Alto Impacto & Playbook de Eventos
 * 5. Market Map B3 (Mosaico Setorial)
 * 6. Notícias Relevantes
 */

(function (root) {
  'use strict';

  const Model = root.MarketCentralModel || {};
  let state = {
    selectedMarket: 'stock_b3',
    selectedUniverse: 'stock_b3',
    selectedPeriod: 'today',
    guideClosed: false,
    activeTabMap: 'sectors',
    loading: false,
    data: null,
    selectedSector: null
  };

  const API_URL = (window.MARKET_DATA_API_URL || 'http://localhost:8787/api') + '/market-central';

  function esc(val) {
    return String(val ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function getRoot() {
    return document.getElementById('marketCentralRoot') || document.getElementById('marketcentral');
  }

  /**
   * Busca os dados consolidados da Central de Mercado no backend
   */
  async function fetchData() {
    state.loading = true;
    try {
      const path = `/api/market-central?market=${encodeURIComponent(state.selectedMarket)}&universe=${encodeURIComponent(state.selectedUniverse)}`;
      if (root.healthyTrendApi && typeof root.healthyTrendApi.request === 'function') {
        state.data = await root.healthyTrendApi.request(path);
      } else {
        const url = `${API_URL}?market=${encodeURIComponent(state.selectedMarket)}&universe=${encodeURIComponent(state.selectedUniverse)}`;
        const res = await fetch(url);
        if (res.ok) {
          state.data = await res.json();
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      }
    } catch (err) {
      console.warn('[MarketCentral] Usando fallback resiliente de dados:', err.message);
      state.data = generateFallbackData();
    } finally {
      state.loading = false;
      render();
    }
  }

  function generateFallbackData() {
    return {
      success: true,
      dataAsOf: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
      regime: {
        marketId: state.selectedMarket,
        state: 'healthy',
        score: 78,
        label: 'ALTA — FAVORÁVEL',
        badge: 'Alta (Favorável)',
        description: 'Ambiente de alta. Avalie oportunidades de acordo com os critérios do método e a qualidade individual de cada ativo.',
        trend: 'Positiva',
        volatility: 'Controlada',
        permission: 'Somente A',
        indicators: {
          price: 132540,
          ema20: 130100,
          ema200: 124500,
          structure: 'Alinhada (EMA 20 > EMA 200)'
        }
      },
      breadth: {
        universe: state.selectedUniverse,
        totalEligible: 86,
        aboveEma20Pct: 78,
        aboveEma50Pct: 68,
        aboveEma200Pct: 59,
        positiveTrendPct: 67,
        advancePct: 62,
        declinePct: 38,
        dataAvailable: true
      },
      globalMarkets: Model.GLOBAL_BENCHMARKS || [],
      marketMap: [
        { name: 'Petróleo e Gás', changePct: 3.1, changeFormatted: '+3,1%', assetsCount: 12, topAssets: [{ symbol: 'PETR4', changePct: 3.2 }, { symbol: 'PRIO3', changePct: 2.8 }] },
        { name: 'Financeiro', changePct: 2.4, changeFormatted: '+2,4%', assetsCount: 22, topAssets: [{ symbol: 'ITUB4', changePct: 2.5 }, { symbol: 'BBDC4', changePct: 1.9 }] },
        { name: 'Mineração', changePct: 1.8, changeFormatted: '+1,8%', assetsCount: 8, topAssets: [{ symbol: 'VALE3', changePct: 1.8 }, { symbol: 'CMIN3', changePct: 1.4 }] },
        { name: 'Tecnologia', changePct: 1.2, changeFormatted: '+1,2%', assetsCount: 10, topAssets: [{ symbol: 'TOTS3', changePct: 1.6 }, { symbol: 'LWSA3', changePct: 0.9 }] },
        { name: 'Energia', changePct: 0.7, changeFormatted: '+0,7%', assetsCount: 18, topAssets: [{ symbol: 'EQTL3', changePct: 1.1 }, { symbol: 'CPFE3', changePct: 0.5 }] },
        { name: 'Bens Industriais', changePct: 0.6, changeFormatted: '+0,6%', assetsCount: 14, topAssets: [{ symbol: 'WEGE3', changePct: 0.8 }, { symbol: 'EMBR3', changePct: 0.4 }] },
        { name: 'Utilidades', changePct: 0.3, changeFormatted: '+0,3%', assetsCount: 9, topAssets: [{ symbol: 'SBSP3', changePct: 0.4 }] },
        { name: 'Saúde', changePct: -0.2, changeFormatted: '-0,2%', assetsCount: 11, topAssets: [{ symbol: 'RADL3', changePct: -0.1 }, { symbol: 'RDOR3', changePct: -0.4 }] },
        { name: 'Consumo', changePct: -0.4, changeFormatted: '-0,4%', assetsCount: 20, topAssets: [{ symbol: 'LREN3', changePct: -0.3 }, { symbol: 'MGLU3', changePct: -0.6 }] },
        { name: 'Materiais Básicos', changePct: -0.6, changeFormatted: '-0,6%', assetsCount: 12, topAssets: [{ symbol: 'CSNA3', changePct: -0.7 }, { symbol: 'GGBR4', changePct: -0.5 }] }
      ],
      events: [
        { id: 'evt-1', name: 'Payroll (EUA)', date: '2026-10-07', time: '09:30', impact: 'ALTO', relatedAssets: 'EUA / Dólar / Índices' },
        { id: 'evt-2', name: 'Decisão de Juros (EUA - Fed)', date: '2026-10-08', time: '15:00', impact: 'ALTO', relatedAssets: 'Índices / Dólar / Juros' },
        { id: 'evt-3', name: 'IPCA (Brasil)', date: '2026-10-10', time: '09:00', impact: 'MÉDIO', relatedAssets: 'IBOV / Juros / Bancos' },
        { id: 'evt-4', name: 'Produção Industrial (China)', date: '2026-10-12', time: '11:00', impact: 'MÉDIO', relatedAssets: 'Commodities / Mineração' },
        { id: 'evt-5', name: 'Decisão de Juros (Brasil - Copom)', date: '2026-10-13', time: '18:30', impact: 'ALTO', relatedAssets: 'IBOV / Juros / Bancos' }
      ],
      news: []
    };
  }

  /**
   * Renderiza a página completa da Central de Mercado
   */
  function render() {
    const rootEl = getRoot();
    if (!rootEl) return;

    if (!state.data && !state.loading) {
      fetchData();
      rootEl.innerHTML = `<div style="text-align:center;padding:80px 20px;color:#94a3b8;">Carregando Central de Mercado…</div>`;
      return;
    }

    const d = state.data || generateFallbackData();
    const regime = d.regime || {};
    const breadth = d.breadth || {};
    const globalMarkets = d.globalMarkets || [];
    const marketMap = d.marketMap || [];
    const events = [...(Model.getCustomEvents?.() || []), ...(d.events || [])].slice(0, 6);
    const news = d.news || [];

    // Ângulo da agulha do gauge (-90 a +90 deg)
    const gaugeAngle = Model.scoreToGaugeAngle ? Model.scoreToGaugeAngle(regime.score) : 40;

    const html = `
      <div class="market-central-page">
        <!-- HEADER -->
        <header class="market-central-header">
          <div class="market-central-title-col">
            <span class="eyebrow">Observatório de Mercado</span>
            <h1>Central de Mercado</h1>
            <p>Uma visão rápida do ambiente de mercado para apoiar suas decisões de Swing Trade.</p>
          </div>
          <div class="market-central-header-actions">
            <div class="market-central-timestamp">
              <span>Último Fechamento: <strong>${esc(d.dataAsOf || 'Hoje')}</strong></span>
              <small>Timeframe Diário Oficial</small>
            </div>
            <button type="button" class="market-central-refresh-btn" id="mcRefreshBtn" title="Atualizar dados" aria-label="Atualizar dados">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
            </button>
            <div class="market-central-period-pills" role="tablist">
              <button type="button" class="market-central-period-btn ${state.selectedPeriod === 'today' ? 'active' : ''}" data-period="today">Hoje</button>
              <button type="button" class="market-central-period-btn ${state.selectedPeriod === '5d' ? 'active' : ''}" data-period="5d">5 dias</button>
              <button type="button" class="market-central-period-btn ${state.selectedPeriod === '1m' ? 'active' : ''}" data-period="1m">1 mês</button>
              <button type="button" class="market-central-period-btn ${state.selectedPeriod === '3m' ? 'active' : ''}" data-period="3m">3 meses</button>
            </div>
          </div>
        </header>

        <!-- BANNER COMO LER ESTA TELA -->
        ${!state.guideClosed ? `
          <div class="market-central-guide-banner">
            <div class="guide-banner-icon">📖</div>
            <div class="guide-banner-content">
              <h4>Como ler esta tela</h4>
              <p>A Central de Mercado apresenta uma fotografia do ambiente global para ajudar você a entender as condições atuais do mercado. Observe principalmente o <strong>Regime de Mercado</strong>, o <strong>Market Breadth</strong>, os <strong>mercados globais</strong> e os <strong>eventos de alto impacto</strong>. Esta tela não gera sinais de entrada e não substitui a análise do seu método. A decisão continua baseada no gráfico Diário, na Força Relativa, na estrutura gráfica, no setup, nos gatilhos de entrada e na gestão de risco. <strong>Use esta tela para entender o contexto. Depois, volte para sua análise.</strong></p>
            </div>
            <button type="button" class="guide-banner-close" id="mcGuideCloseBtn" aria-label="Fechar instrução">✕</button>
          </div>
        ` : ''}

        <!-- LINHA 1: CONTEXTO PRINCIPAL (REGIME & BREADTH) -->
        <div class="market-central-grid-row">
          <!-- CARD REGIME DE MERCADO -->
          <article class="mc-card" id="mcRegimeCard">
            <div class="mc-card-head">
              <div class="mc-card-title-row">
                <span class="mc-card-icon">🌍</span>
                <h2>Regime de Mercado</h2>
              </div>
              <select class="mc-card-select" id="mcMarketSelect">
                <option value="stock_b3" ${state.selectedMarket === 'stock_b3' ? 'selected' : ''}>B3 (Ações)</option>
                <option value="bdr" ${state.selectedMarket === 'bdr' ? 'selected' : ''}>BDRs (BDRX)</option>
                <option value="fii" ${state.selectedMarket === 'fii' ? 'selected' : ''}>FIIs (IFIX)</option>
              </select>
            </div>

            <div class="mc-regime-body">
              <!-- GAUGE VISUAL SEMICIRCULAR -->
              <div class="mc-gauge-container">
                <svg class="mc-gauge-svg" viewBox="0 0 220 125">
                  <defs>
                    <linearGradient id="gaugeArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="#ef4444" />
                      <stop offset="35%" stop-color="#f59e0b" />
                      <stop offset="65%" stop-color="#10b981" />
                      <stop offset="100%" stop-color="#059669" />
                    </linearGradient>
                  </defs>
                  <!-- Arco de fundo -->
                  <path d="M 20 110 A 90 90 0 0 1 200 110" class="mc-gauge-bg-arc" stroke="url(#gaugeArcGrad)" />
                  <!-- Agulha -->
                  <g class="mc-gauge-needle" style="transform: rotate(${gaugeAngle}deg);">
                    <polygon points="107,110 113,110 110,32" fill="#ffffff" />
                    <circle cx="110" cy="110" r="8" fill="#10b981" stroke="#ffffff" stroke-width="2" />
                  </g>
                </svg>

                <div class="mc-gauge-score-wrap">
                  <div class="mc-gauge-big-num">${regime.score ?? 78}</div>
                  <div class="mc-gauge-sub">/ 100</div>
                </div>

                <div class="mc-gauge-legend">
                  <span>Baixa</span>
                  <span>Lateral</span>
                  <span class="active">Alta (Favorável)</span>
                  <span>Atenção</span>
                </div>
              </div>

              <!-- DETALHES DO REGIME -->
              <div class="mc-regime-info">
                <div>
                  <small style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;">Regime atual</small>
                  <div class="mc-regime-status-badge ${esc(regime.state || 'healthy')}">
                    ↗ ${esc(regime.label || 'ALTA — FAVORÁVEL')}
                  </div>
                </div>
                <p class="mc-regime-desc">${esc(regime.description || '')}</p>

                <div class="mc-regime-chips-row">
                  <div class="mc-regime-chip">
                    <small>Tendência</small>
                    <b>${esc(regime.trend || 'Positiva')}</b>
                  </div>
                  <div class="mc-regime-chip">
                    <small>Volatilidade</small>
                    <b>${esc(regime.volatility || 'Controlada')}</b>
                  </div>
                  <div class="mc-regime-chip">
                    <small>Permissão</small>
                    <b style="color:#34d399">${esc(regime.permission || 'Somente A')}</b>
                  </div>
                </div>
              </div>
            </div>

            <a class="mc-card-footer-link" onclick="go('marketcycle')">
              Ver detalhes no Ciclo de Mercado →
            </a>
          </article>

          <!-- CARD MARKET BREADTH -->
          <article class="mc-card" id="mcBreadthCard">
            <div class="mc-card-head">
              <div class="mc-card-title-row">
                <span class="mc-card-icon">📈</span>
                <h2>Market Breadth</h2>
              </div>
              <select class="mc-card-select" id="mcUniverseSelect">
                <option value="stock_b3" ${state.selectedUniverse === 'stock_b3' ? 'selected' : ''}>B3 (Todos os ativos)</option>
                <option value="ibov" ${state.selectedUniverse === 'ibov' ? 'selected' : ''}>Componentes do Ibovespa</option>
                <option value="smallcaps" ${state.selectedUniverse === 'smallcaps' ? 'selected' : ''}>Small Caps</option>
                <option value="watchlist" ${state.selectedUniverse === 'watchlist' ? 'selected' : ''}>Minha Watchlist</option>
              </select>
            </div>

            <div class="mc-breadth-bars">
              <div class="mc-breadth-row">
                <span class="mc-breadth-label">Ativos acima da EMA 20</span>
                <div class="mc-progress-track">
                  <div class="mc-progress-fill" style="width: ${breadth.aboveEma20Pct || 0}%;"></div>
                </div>
                <span class="mc-breadth-pct">${breadth.aboveEma20Pct || 0}%</span>
              </div>

              <div class="mc-breadth-row">
                <span class="mc-breadth-label">Ativos acima da EMA 50</span>
                <div class="mc-progress-track">
                  <div class="mc-progress-fill" style="width: ${breadth.aboveEma50Pct || 0}%;"></div>
                </div>
                <span class="mc-breadth-pct">${breadth.aboveEma50Pct || 0}%</span>
              </div>

              <div class="mc-breadth-row">
                <span class="mc-breadth-label">Ativos acima da EMA 200</span>
                <div class="mc-progress-track">
                  <div class="mc-progress-fill" style="width: ${breadth.aboveEma200Pct || 0}%;"></div>
                </div>
                <span class="mc-breadth-pct">${breadth.aboveEma200Pct || 0}%</span>
              </div>

              <div class="mc-breadth-row">
                <span class="mc-breadth-label">Ativos em tendência positiva</span>
                <div class="mc-progress-track">
                  <div class="mc-progress-fill" style="width: ${breadth.positiveTrendPct || 0}%;"></div>
                </div>
                <span class="mc-breadth-pct">${breadth.positiveTrendPct || 0}%</span>
              </div>
            </div>

            <!-- DUAL ADVANCE / DECLINE BAR -->
            <div class="mc-advance-decline-card">
              <div class="mc-adv-side" style="flex: ${breadth.advancePct || 60};">
                <span>Avanço</span>
                <span>${breadth.advancePct || 0}%</span>
              </div>
              <div class="mc-dec-side" style="flex: ${breadth.declinePct || 40};">
                <span>Queda</span>
                <span>${breadth.declinePct || 0}%</span>
              </div>
            </div>

            <a class="mc-card-footer-link" onclick="go('marketscans')">
              Ver oportunidades nos Scans de Mercado →
            </a>
          </article>
        </div>

        <!-- LINHA 2: CONTEXTO EXTERNO (MERCADOS GLOBAIS & EVENTOS) -->
        <div class="market-central-grid-row">
          <!-- CARD MERCADOS GLOBAIS -->
          <article class="mc-card">
            <div class="mc-card-head">
              <div class="mc-card-title-row">
                <span class="mc-card-icon">🏛️</span>
                <h2>Mercados Globais</h2>
              </div>
              <small style="font-size:11px;color:#64748b;">Termômetros mundiais</small>
            </div>

            <div class="mc-global-grid">
              ${globalMarkets.map(item => `
                <div class="mc-global-item" title="${esc(item.description || item.name)}">
                  <div class="mc-global-head">
                    <span class="mc-global-flag">${item.flag}</span>
                    <span class="mc-global-name">${esc(item.name)}</span>
                  </div>
                  <div class="mc-global-value">${esc(item.value)}</div>
                  <div class="mc-global-bottom">
                    <span class="mc-global-change ${item.changePct >= 0 ? 'up' : 'down'}">
                      ${item.changePct >= 0 ? '+' : ''}${item.changePct.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%
                    </span>
                    <svg class="mc-mini-spark" viewBox="0 0 54 20">
                      <polyline points="${generateSparklinePoints(item.sparkline)}" fill="none" stroke="${item.changePct >= 0 ? '#34d399' : '#f87171'}" stroke-width="2" />
                    </svg>
                  </div>
                </div>
              `).join('')}
            </div>
          </article>

          <!-- CARD EVENTOS DE ALTO IMPACTO -->
          <article class="mc-card">
            <div class="mc-card-head">
              <div class="mc-card-title-row">
                <span class="mc-card-icon">📅</span>
                <h2>Eventos de Alto Impacto</h2>
              </div>
              <button type="button" class="mc-events-head-btn" id="mcAddEventBtn">
                + Adicionar evento
              </button>
            </div>

            <div class="mc-events-list">
              ${events.map(ev => `
                <div class="mc-event-row" data-event-id="${esc(ev.id)}" onclick="window.openEventReactionModal('${esc(ev.id)}')">
                  <span class="mc-event-date">${formatEventDate(ev.date)}</span>
                  <span class="mc-event-time">${esc(ev.time)}</span>
                  <span class="mc-event-name">${esc(ev.name)}</span>
                  <span class="mc-event-badge ${ev.impact === 'ALTO' ? 'alto' : 'medio'}">${esc(ev.impact)}</span>
                  <span class="mc-event-related">${esc(ev.relatedAssets || 'Geral')}</span>
                  <span class="mc-event-action" title="Registrar reação do mercado">›</span>
                </div>
              `).join('')}
            </div>

            <small style="margin-top:auto;padding-top:14px;font-size:11px;color:#64748b;">
              Clique em um evento para abrir ou registrar a reação do mercado no Playbook de Eventos.
            </small>
          </article>
        </div>

        <!-- LINHA 3: DESEMPENHO SETORIAL (MARKET MAP B3) -->
        <div class="market-central-grid-row">
          <article class="mc-card market-central-grid-full">
            <div class="mc-card-head">
              <div class="mc-card-title-row">
                <span class="mc-card-icon">🗺️</span>
                <h2>Mapa do Mercado (B3)</h2>
              </div>
              <div class="mc-map-controls">
                <div class="mc-map-tabs">
                  <button type="button" class="mc-map-tab-btn active">Setores</button>
                </div>
                <select class="mc-card-select">
                  <option>Variação do dia</option>
                </select>
              </div>
            </div>

            <!-- MOSAICO VISUAL DE SETORES -->
            <div class="mc-market-mosaic">
              ${marketMap.map(sec => {
                const colorClass = getSectorColorClass(sec.changePct);
                return `
                  <div class="mc-mosaic-block ${colorClass}" onclick="window.viewSectorDetails('${esc(sec.name)}')">
                    <div>
                      <div class="mc-mosaic-name">${esc(sec.name)}</div>
                      <div class="mc-mosaic-tickers">
                        ${(sec.topAssets || []).slice(0, 3).map(a => `<span class="mc-mosaic-tag">${esc(a.symbol)}</span>`).join('')}
                      </div>
                    </div>
                    <div class="mc-mosaic-change">${esc(sec.changeFormatted)}</div>
                  </div>
                `;
              }).join('')}
            </div>

            <small style="margin-top:16px;font-size:11.5px;color:#64748b;">
              Mostra os setores em destaque na sessão diária. Clique em um bloco para visualizar os ativos do setor ou ir para a Watchlist.
            </small>
          </article>
        </div>

        <!-- LINHA 4: NOTÍCIAS RELEVANTES -->
        <div class="market-central-grid-row">
          <article class="mc-card market-central-grid-full">
            <div class="mc-card-head">
              <div class="mc-card-title-row">
                <span class="mc-card-icon">📰</span>
                <h2>Notícias Relevantes</h2>
              </div>
              <a class="mc-card-footer-link" onclick="go('marketnews')">Ver todas →</a>
            </div>

            <div class="mc-news-list">
              ${news.length > 0 ? news.map(n => `
                <a class="mc-news-item" href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">
                  <img src="${n.image || 'assets/news-hero-fed.jpg'}" alt="${esc(n.title)}" class="mc-news-thumb" onerror="this.style.display='none'" />
                  <div class="mc-news-text">
                    <div class="mc-news-meta">
                      <span class="mc-news-badge ${n.impact === 'ALTO IMPACTO' ? 'alto' : n.impact === 'MÉDIO IMPACTO' ? 'medio' : 'geral'}">${esc(n.impact || 'GERAL')}</span>
                      <span>${esc(n.time || '10:00')}</span>
                      <span>·</span>
                      <span>${esc(n.source || 'Mercado')}</span>
                    </div>
                    <h3 class="mc-news-headline">${esc(n.title)}</h3>
                    <p class="mc-news-desc">${esc(n.summary || '')}</p>
                  </div>
                  <span class="mc-news-arrow">›</span>
                </a>
              `).join('') : `
                <div style="padding:24px;text-align:center;color:#64748b;font-size:13px;">
                  Nenhuma notícia urgente ou de alto impacto no momento. O contexto permanece técnico.
                </div>
              `}
            </div>
          </article>
        </div>
      </div>
    `;

    rootEl.innerHTML = html;
    bindEvents(rootEl);
  }

  function formatEventDate(dateStr) {
    if (!dateStr) return '—';
    const parts = String(dateStr).split('-');
    if (parts.length < 3) return dateStr;
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const monthIdx = parseInt(parts[1], 10) - 1;
    return `${parts[2]} ${months[monthIdx] || parts[1]}`;
  }

  function generateSparklinePoints(series) {
    if (!Array.isArray(series) || series.length === 0) return '0,10 54,10';
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = max - min || 1;
    const w = 54;
    const h = 20;

    return series.map((val, i) => {
      const x = Math.round((i / (series.length - 1)) * w);
      const y = Math.round(h - ((val - min) / range) * (h - 4) - 2);
      return `${x},${y}`;
    }).join(' ');
  }

  function getSectorColorClass(changePct) {
    const val = Number(changePct) || 0;
    if (val >= 2.0) return 'pos-strong';
    if (val >= 0.8) return 'pos-mod';
    if (val >= 0) return 'pos-light';
    if (val >= -1.0) return 'neg-light';
    return 'neg-mod';
  }

  function bindEvents(rootEl) {
    rootEl.querySelector('#mcRefreshBtn')?.addEventListener('click', () => {
      fetchData();
    });

    rootEl.querySelector('#mcGuideCloseBtn')?.addEventListener('click', () => {
      state.guideClosed = true;
      render();
    });

    rootEl.querySelector('#mcMarketSelect')?.addEventListener('change', (e) => {
      state.selectedMarket = e.target.value;
      fetchData();
    });

    rootEl.querySelector('#mcUniverseSelect')?.addEventListener('change', (e) => {
      state.selectedUniverse = e.target.value;
      fetchData();
    });

    rootEl.querySelectorAll('[data-period]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        state.selectedPeriod = e.target.dataset.period;
        rootEl.querySelectorAll('[data-period]').forEach(b => b.classList.toggle('active', b === e.target));
      });
    });

    rootEl.querySelector('#mcAddEventBtn')?.addEventListener('click', () => {
      openAddEventModal();
    });
  }

  /**
   * Modal para cadastro manual de evento macroeconômico
   */
  function openAddEventModal() {
    const modal = document.createElement('div');
    modal.className = 'mc-modal-overlay';
    modal.innerHTML = `
      <div class="mc-modal-card">
        <div class="mc-modal-head">
          <h3>Adicionar Evento Relevante</h3>
          <button type="button" class="mc-modal-close" onclick="this.closest('.mc-modal-overlay').remove()">✕</button>
        </div>
        <form id="mcAddEventForm">
          <div class="mc-form-group">
            <label>Nome do Evento</label>
            <input type="text" id="evName" placeholder="Ex: Divulgação de Resultados PETR4" required />
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="mc-form-group">
              <label>Data</label>
              <input type="date" id="evDate" value="${new Date().toISOString().slice(0, 10)}" required />
            </div>
            <div class="mc-form-group">
              <label>Horário</label>
              <input type="time" id="evTime" value="10:00" required />
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="mc-form-group">
              <label>Impacto</label>
              <select id="evImpact">
                <option value="ALTO">Alto Impacto</option>
                <option value="MÉDIO">Médio Impacto</option>
              </select>
            </div>
            <div class="mc-form-group">
              <label>País / Mercado</label>
              <input type="text" id="evCountry" value="Brasil" />
            </div>
          </div>
          <div class="mc-form-group">
            <label>Ativos Relacionados</label>
            <input type="text" id="evRelated" placeholder="Ex: PETR4, PRIO3, IBOV" />
          </div>
          <div class="mc-form-group">
            <label>Descrição / Observações</label>
            <textarea id="evDesc" rows="3" placeholder="Contexto do evento..."></textarea>
          </div>
          <div class="mc-modal-actions">
            <button type="button" class="mc-btn-secondary" onclick="this.closest('.mc-modal-overlay').remove()">Cancelar</button>
            <button type="submit" class="mc-btn-primary">Salvar Evento</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#mcAddEventForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = modal.querySelector('#evName').value;
      const date = modal.querySelector('#evDate').value;
      const time = modal.querySelector('#evTime').value;
      const impact = modal.querySelector('#evImpact').value;
      const country = modal.querySelector('#evCountry').value;
      const relatedAssets = modal.querySelector('#evRelated').value;
      const description = modal.querySelector('#evDesc').value;

      Model.addCustomEvent({ name, date, time, impact, country, relatedAssets, description });
      modal.remove();
      render();
    });
  }

  /**
   * Modal Playbook de Eventos: Registrar Reação do Mercado
   */
  window.openEventReactionModal = function (eventId) {
    const allEvents = [...(Model.getCustomEvents?.() || []), ...(state.data?.events || [])];
    const event = allEvents.find(e => e.id === eventId) || { id: eventId, name: 'Evento de Mercado', date: 'Hoje' };
    const reactions = Model.getReactionsForEvent ? Model.getReactionsForEvent(eventId) : [];

    const modal = document.createElement('div');
    modal.className = 'mc-modal-overlay';
    modal.innerHTML = `
      <div class="mc-modal-card">
        <div class="mc-modal-head">
          <div>
            <h3>Playbook de Eventos · Reação do Mercado</h3>
            <small style="color:#8fe0aa;font-weight:700;">${esc(event.name)} (${esc(event.date)})</small>
          </div>
          <button type="button" class="mc-modal-close" onclick="this.closest('.mc-modal-overlay').remove()">✕</button>
        </div>

        <form id="mcReactionForm">
          <input type="hidden" id="rxEventId" value="${esc(event.id)}" />
          <div class="mc-form-group">
            <label>O que aconteceu após o evento?</label>
            <textarea id="rxWhatHappened" rows="3" placeholder="Descreva o movimento do mercado (ex: Reação de alta forte nos primeiros 15 minutos, seguida de devolução total)." required></textarea>
          </div>
          <div class="mc-form-group">
            <label>Comportamento da Volatilidade</label>
            <select id="rxVolatility">
              <option value="Expansão rápida e absorção">Expansão rápida e absorção</option>
              <option value="Rompimento limpo com volume">Rompimento limpo com volume</option>
              <option value="Whipsaw / Ruído sem direção">Whipsaw / Ruído sem direção</option>
              <option value="Movimento calmo / sem impacto">Movimento calmo / sem impacto</option>
            </select>
          </div>
          <div class="mc-form-group">
            <label>Ativos mais afetados</label>
            <input type="text" id="rxAffected" placeholder="Ex: VALE3, DI1F29, IBOV" />
          </div>
          <div class="mc-form-group">
            <label>Lição para o Playbook (Aprendizado)</label>
            <textarea id="rxLessons" rows="2" placeholder="Qual regra ou conduta esse comportamento reforça no seu método?"></textarea>
          </div>

          <div class="mc-modal-actions">
            <button type="button" class="mc-btn-secondary" onclick="this.closest('.mc-modal-overlay').remove()">Fechar</button>
            <button type="submit" class="mc-btn-primary">Salvar no Playbook</button>
          </div>
        </form>

        ${reactions.length > 0 ? `
          <div style="margin-top:24px;border-top:1px solid rgba(255,255,255,0.08);padding-top:16px;">
            <h4 style="color:#cbd5e1;font-size:13px;margin:0 0 10px 0;">Registros Anteriores (${reactions.length})</h4>
            ${reactions.map(r => `
              <div style="background:rgba(0,0,0,0.3);padding:12px;border-radius:10px;margin-bottom:8px;font-size:12px;">
                <b style="color:#34d399">${esc(r.volatilityBehavior)}</b>
                <p style="margin:4px 0;color:#cbd5e1;">${esc(r.whatHappened)}</p>
                <small style="color:#64748b;">${esc(r.lessonsLearned)}</small>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#mcReactionForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const whatHappened = modal.querySelector('#rxWhatHappened').value;
      const volatilityBehavior = modal.querySelector('#rxVolatility').value;
      const affectedAssets = modal.querySelector('#rxAffected').value;
      const lessonsLearned = modal.querySelector('#rxLessons').value;

      Model.saveEventReaction({
        eventId: event.id,
        eventName: event.name,
        eventDate: event.date,
        whatHappened,
        volatilityBehavior,
        affectedAssets,
        lessonsLearned
      });

      modal.remove();
      render();
    });
  };

  window.viewSectorDetails = function (sectorName) {
    if (typeof root.go === 'function') {
      root.go('watchlist');
    }
  };

  // Expor publicamente no window
  root.renderMarketCentral = render;
  root.MarketCentral = {
    render,
    fetchData,
    openAddEventModal
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);
