/**
 * CENTRAL DE MERCADO — FRONTEND CONTROLLER & RENDERER
 * Healthy Trend Trader
 *
 * Observatório de mercado para Swing Trade:
 * 1. Market Regime
 * 2. Market Breadth
 * 3. Mercados Globais
 * 4. Eventos de Alto Impacto & Playbook de Eventos
 * 5. Mapa do Mercado (B3)
 * 6. Notícias Relevantes
 *
 * Refinamento visual: Clean, Claro, Organizado & Premium (Imagem 2)
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
      dataAsOf: '2026-10-06',
      updatedAt: new Date().toISOString(),
      regime: {
        marketId: state.selectedMarket,
        state: 'healthy',
        score: 78,
        label: 'ALTA — FAVORÁVEL',
        badge: 'Alta (Favorável)',
        description: 'Mercado com tendência positiva e boa participação dos ativos.',
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
      globalMarkets: Model.GLOBAL_BENCHMARKS || [
        { symbol: 'SPX', name: 'S&P 500', flag: '🇺🇸', value: '5.728,41', changePct: 0.82, trend: 'up', sparkline: [5680, 5695, 5705, 5700, 5715, 5722, 5728.41] },
        { symbol: 'NDX', name: 'Nasdaq', flag: '🇺🇸', value: '18.024,17', changePct: 1.14, trend: 'up', sparkline: [17810, 17860, 17920, 17890, 17980, 18010, 18024.17] },
        { symbol: 'DJI', name: 'Dow Jones', flag: '🇺🇸', value: '42.331,12', changePct: 0.42, trend: 'up', sparkline: [42150, 42200, 42240, 42210, 42280, 42310, 42331.12] },
        { symbol: 'VIX', name: 'VIX', flag: '📊', value: '17,21', changePct: -4.20, trend: 'down', sparkline: [19.8, 19.1, 18.5, 18.9, 17.8, 17.5, 17.21] },
        { symbol: 'DXY', name: 'Dólar (DXY)', flag: '🇺🇸', value: '101,63', changePct: 0.31, trend: 'up', sparkline: [100.9, 101.1, 101.3, 101.2, 101.5, 101.58, 101.63] },
        { symbol: 'GOLD', name: 'Ouro', flag: '🪙', value: '2.664,80', changePct: 0.62, trend: 'up', sparkline: [2640, 2646, 2652, 2650, 2658, 2661, 2664.8] },
        { symbol: 'WTI', name: 'Petróleo (WTI)', flag: '🛢️', value: '73,15', changePct: 1.80, trend: 'up', sparkline: [71.2, 71.8, 72.3, 72.0, 72.6, 72.9, 73.15] },
        { symbol: 'BTC', name: 'Bitcoin', flag: '₿', value: '62.431,00', changePct: 0.94, trend: 'up', sparkline: [61200, 61600, 61900, 61750, 62100, 62300, 62431] }
      ],
      marketMap: [
        { name: 'Financeiro', changePct: 2.4, changeFormatted: '+2,4%', assetsCount: 22 },
        { name: 'Mineração', changePct: 1.8, changeFormatted: '+1,8%', assetsCount: 8 },
        { name: 'Petróleo e Gás', changePct: 3.1, changeFormatted: '+3,1%', assetsCount: 12 },
        { name: 'Energia', changePct: 0.7, changeFormatted: '+0,7%', assetsCount: 18 },
        { name: 'Tecnologia', changePct: 1.2, changeFormatted: '+1,2%', assetsCount: 10 },
        { name: 'Consumo', changePct: -0.4, changeFormatted: '-0,4%', assetsCount: 20 },
        { name: 'Bens Industriais', changePct: 0.6, changeFormatted: '+0,6%', assetsCount: 14 },
        { name: 'Saúde', changePct: -0.2, changeFormatted: '-0,2%', assetsCount: 11 },
        { name: 'Utilidades', changePct: 0.3, changeFormatted: '+0,3%', assetsCount: 9 },
        { name: 'Telecom', changePct: 0.8, changeFormatted: '+0,8%', assetsCount: 6 },
        { name: 'Materiais Básicos', changePct: -0.6, changeFormatted: '-0,6%', assetsCount: 12 }
      ],
      events: [
        { id: 'evt-payroll', name: 'Payroll (EUA)', date: '2026-10-07', time: '09:30', impact: 'ALTO', relatedAssets: 'EUA / Dólar / Índices' },
        { id: 'evt-fed-rate', name: 'Decisão de Juros (EUA - Fed)', date: '2026-10-08', time: '15:00', impact: 'ALTO', relatedAssets: 'Índices / Dólar / Juros' },
        { id: 'evt-ipca', name: 'IPCA (Brasil)', date: '2026-10-10', time: '09:00', impact: 'MÉDIO', relatedAssets: 'IBOV / Juros / Bancos' },
        { id: 'evt-china-pmi', name: 'Produção Industrial (China)', date: '2026-10-12', time: '11:00', impact: 'MÉDIO', relatedAssets: 'Commodities / Mineração' },
        { id: 'evt-copom', name: 'Decisão de Juros (Brasil - Copom)', date: '2026-10-13', time: '10:00', impact: 'ALTO', relatedAssets: 'IBOV / Juros / Bancos' }
      ],
      news: [
        { id: 'news-1', title: 'Fed sinaliza que pode manter juros elevados por mais tempo', summary: 'Powell reforça postura cautelosa diante da inflação persistente.', time: '09:12', impact: 'ALTO IMPACTO', image: 'assets/news-hero-fed.jpg' },
        { id: 'news-2', title: 'Petrobras anuncia novo plano de investimentos', summary: 'Companhia prevê aumento na produção nos próximos anos.', time: '08:45', impact: 'ALTO IMPACTO', image: 'assets/news-thumb-petroleo.jpg' },
        { id: 'news-3', title: 'Vale divulga dados operacionais acima do esperado', summary: 'Produção de minério cresce 4% no trimestre.', time: '07:30', impact: 'MÉDIO IMPACTO', image: 'assets/news-thumb-mineracao.jpg' },
        { id: 'news-4', title: 'China anuncia novos estímulos à economia', summary: 'Medidas podem beneficiar commodities e mercados emergentes.', time: '06:55', impact: 'MÉDIO IMPACTO', image: 'assets/news-thumb-china.jpg' },
        { id: 'news-5', title: 'Ibovespa opera em alta com exterior positivo', summary: 'Índice acompanha bom humor nos mercados globais.', time: '06:20', impact: 'GERAL', image: 'assets/news-thumb-spx.jpg' }
      ]
    };
  }

  function getNewsThumbUrl(n) {
    if (n.image && typeof n.image === 'string' && !n.image.startsWith('http')) return n.image;
    const title = (n.title || '').toLowerCase();
    if (title.includes('fed') || title.includes('juros')) return 'assets/news-hero-fed.jpg';
    if (title.includes('petrobras') || title.includes('petróleo')) return 'assets/news-thumb-petroleo.jpg';
    if (title.includes('vale') || title.includes('minério')) return 'assets/news-thumb-mineracao.jpg';
    if (title.includes('china')) return 'assets/news-thumb-china.jpg';
    return 'assets/news-thumb-spx.jpg';
  }

  function getFormattedHeaderDate() {
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const dayName = days[now.getDay()];
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return {
      top: `${day} de ${month} de ${year}`,
      bottom: `${dayName} · ${hours}:${mins}`
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
      rootEl.innerHTML = `<div style="text-align:center;padding:80px 20px;color:#64748b;">Carregando Central de Mercado…</div>`;
      return;
    }

    const d = state.data || generateFallbackData();
    const regime = d.regime || {};
    const breadth = d.breadth || {};
    const globalMarkets = d.globalMarkets || [];
    const marketMap = d.marketMap || [];
    const events = [...(Model.getCustomEvents?.() || []), ...(d.events || [])].slice(0, 5);
    const news = (d.news && d.news.length > 0) ? d.news.slice(0, 5) : generateFallbackData().news;

    // Ângulo da agulha do gauge (-90 a +90 deg)
    const gaugeAngle = Model.scoreToGaugeAngle ? Model.scoreToGaugeAngle(regime.score ?? 78) : 50.4;
    const headerDate = getFormattedHeaderDate();

    const html = `
      <div class="market-central-page">
        <!-- HEADER -->
        <header class="market-central-header">
          <div class="market-central-title-col">
            <h1>Central de Mercado</h1>
            <p>Uma visão rápida do ambiente de mercado para apoiar suas decisões de Swing Trade.</p>
          </div>
          <div class="market-central-header-actions">
            <div class="market-central-timestamp">
              <span><strong>${esc(headerDate.top)}</strong></span>
              <small>${esc(headerDate.bottom)}</small>
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
              <p>A Central de Mercado apresenta uma fotografia rápida do ambiente global para ajudar o trader a entender para que lado o mercado está pendendo. Observe principalmente o Regime de Mercado, o Market Breadth, o comportamento dos principais mercados globais e os eventos de alto impacto. Esta tela não gera sinais de entrada e não substitui a análise do seu método. A decisão continua baseada no gráfico Diário, no setup, na Força Relativa e na gestão de risco.</p>
            </div>
            <button type="button" class="guide-banner-close" id="mcGuideCloseBtn" aria-label="Fechar instrução">✕</button>
          </div>
        ` : ''}

        <!-- LINHA 1: REGIME DE MERCADO & MARKET BREADTH -->
        <div class="market-central-grid-row">
          <!-- CARD REGIME DE MERCADO -->
          <article class="mc-card" id="mcRegimeCard">
            <div class="mc-card-head">
              <div class="mc-card-title-row">
                <span class="mc-card-icon">🌍</span>
                <h2>Regime de Mercado</h2>
                <span class="mc-card-info-icon" title="Leitura consolidada da tendência e permissão do método">ⓘ</span>
              </div>
              <select class="mc-card-select" id="mcMarketSelect">
                <option value="stock_b3" ${state.selectedMarket === 'stock_b3' ? 'selected' : ''}>B3 (Todos os ativos)</option>
                <option value="bdr" ${state.selectedMarket === 'bdr' ? 'selected' : ''}>BDRs (BDRX)</option>
                <option value="fii" ${state.selectedMarket === 'fii' ? 'selected' : ''}>FIIs (IFIX)</option>
              </select>
            </div>

            <div class="mc-regime-body">
              <!-- GAUGE SEMICIRCULAR REFINADO (SEM SOBREPOSIÇÃO) -->
              <div class="mc-gauge-container">
                <svg class="mc-gauge-svg" viewBox="0 0 280 155" aria-label="Medidor de Regime de Mercado">
                  <!-- Legendas Externas com respiro -->
                  <text x="140" y="24" text-anchor="middle" class="mc-gauge-lbl-alta">ALTA</text>
                  <text x="140" y="36" text-anchor="middle" class="mc-gauge-lbl-sub">(Favorável)</text>

                  <text x="42" y="86" text-anchor="middle" class="mc-gauge-lbl-muted">Lateral</text>

                  <text x="40" y="132" text-anchor="middle" class="mc-gauge-lbl-baixa">Baixa</text>
                  <text x="40" y="144" text-anchor="middle" class="mc-gauge-lbl-sub-muted">(Desfavorável)</text>

                  <text x="240" y="132" text-anchor="middle" class="mc-gauge-lbl-muted">Atenção</text>

                  <!-- 4 Arcos Coloridos Precisos (cx=140, cy=125, r=80, stroke-width=14) -->
                  <!-- Segmento 1: Baixa (Vermelho) -->
                  <path d="M 60 125 A 80 80 0 0 1 78.7 73.6" fill="none" stroke="#ef4444" stroke-width="14" stroke-linecap="round" />
                  <!-- Segmento 2: Lateral (Laranja/Amarelo) -->
                  <path d="M 78.7 73.6 A 80 80 0 0 1 126.1 46.2" fill="none" stroke="#f59e0b" stroke-width="14" />
                  <!-- Segmento 3: Alta (Verde Esmeralda) -->
                  <path d="M 126.1 46.2 A 80 80 0 0 1 205.5 79.1" fill="none" stroke="#10b981" stroke-width="14" />
                  <!-- Segmento 4: Atenção (Teal/Verde) -->
                  <path d="M 205.5 79.1 A 80 80 0 0 1 220 125" fill="none" stroke="#059669" stroke-width="14" stroke-linecap="round" />

                  <!-- Ponteiro / Agulha: gira a partir de (140, 125) sem sobrepor o número -->
                  <g transform="rotate(${gaugeAngle}, 140, 125)">
                    <line x1="140" y1="125" x2="140" y2="60" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round" />
                    <polygon points="137,68 143,68 140,54" fill="#1e293b" />
                    <circle cx="140" cy="125" r="5.5" fill="#1e293b" />
                  </g>

                  <!-- Número central destacado com respiro e sem sobreposição -->
                  <text x="140" y="102" text-anchor="middle" class="mc-svg-score-num">${regime.score ?? 78}</text>
                  <text x="140" y="118" text-anchor="middle" class="mc-svg-score-sub">/ 100</text>
                </svg>
              </div>

              <!-- DETALHES DO REGIME (LADO DIREITO) -->
              <div class="mc-regime-info">
                <div>
                  <span class="mc-regime-kicker">Regime atual</span>
                  <div class="mc-regime-status-row">
                    <div class="mc-regime-icon-circle">↗</div>
                    <span class="mc-regime-status-title">${esc(regime.label || 'ALTA — FAVORÁVEL')}</span>
                  </div>
                </div>
                <p class="mc-regime-desc">${esc(regime.description || 'Mercado com tendência positiva e boa participação dos ativos.')}</p>

                <div class="mc-regime-metrics-row">
                  <div class="mc-regime-metric-col">
                    <small>Tendência</small>
                    <strong class="text-pos">${esc(regime.trend || 'Positiva')}</strong>
                  </div>
                  <div class="mc-regime-metric-col">
                    <small>Volatilidade</small>
                    <strong>${esc(regime.volatility || 'Controlada')}</strong>
                  </div>
                  <div class="mc-regime-metric-col">
                    <small>Força</small>
                    <strong>${regime.score ?? 78} / 100</strong>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <!-- CARD MARKET BREADTH -->
          <article class="mc-card" id="mcBreadthCard">
            <div class="mc-card-head">
              <div class="mc-card-title-row">
                <span class="mc-card-icon">📈</span>
                <h2>Market Breadth</h2>
                <span class="mc-card-info-icon" title="Amplitude e participação dos ativos nas médias móveis">ⓘ</span>
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
                  <div class="mc-progress-fill" style="width: ${breadth.aboveEma20Pct || 78}%;"></div>
                </div>
                <span class="mc-breadth-pct">${breadth.aboveEma20Pct || 78}%</span>
              </div>

              <div class="mc-breadth-row">
                <span class="mc-breadth-label">Ativos acima da EMA 50</span>
                <div class="mc-progress-track">
                  <div class="mc-progress-fill" style="width: ${breadth.aboveEma50Pct || 68}%;"></div>
                </div>
                <span class="mc-breadth-pct">${breadth.aboveEma50Pct || 68}%</span>
              </div>

              <div class="mc-breadth-row">
                <span class="mc-breadth-label">Ativos acima da EMA 200</span>
                <div class="mc-progress-track">
                  <div class="mc-progress-fill" style="width: ${breadth.aboveEma200Pct || 59}%;"></div>
                </div>
                <span class="mc-breadth-pct">${breadth.aboveEma200Pct || 59}%</span>
              </div>

              <div class="mc-breadth-row">
                <span class="mc-breadth-label">Ativos em tendência positiva</span>
                <div class="mc-progress-track">
                  <div class="mc-progress-fill" style="width: ${breadth.positiveTrendPct || 67}%;"></div>
                </div>
                <span class="mc-breadth-pct">${breadth.positiveTrendPct || 67}%</span>
              </div>
            </div>

            <!-- DUAL ADVANCE / DECLINE BAR -->
            <div class="mc-advance-decline-card">
              <div class="mc-adv-side" style="flex: ${breadth.advancePct || 62};">
                <span>Avanço</span>
                <strong>${breadth.advancePct || 62}%</strong>
              </div>
              <div class="mc-dec-side" style="flex: ${breadth.declinePct || 38};">
                <span>Queda</span>
                <strong>${breadth.declinePct || 38}%</strong>
              </div>
            </div>
          </article>
        </div>

        <!-- LINHA 2: MERCADOS GLOBAIS & EVENTOS DE ALTO IMPACTO -->
        <div class="market-central-grid-row">
          <!-- CARD MERCADOS GLOBAIS -->
          <article class="mc-card">
            <div class="mc-card-head">
              <div class="mc-card-title-row">
                <span class="mc-card-icon">🏛️</span>
                <h2>Mercados Globais</h2>
                <span class="mc-card-info-icon" title="Termômetros e referências do mercado mundial">ⓘ</span>
              </div>
            </div>

            <div class="mc-global-grid">
              ${globalMarkets.map(item => `
                <div class="mc-global-item" title="${esc(item.description || item.name)}">
                  <div class="mc-global-head">
                    <span class="mc-global-flag">${item.flag || '🌐'}</span>
                    <span class="mc-global-name">${esc(item.name)}</span>
                  </div>
                  <div class="mc-global-value">${esc(item.value)}</div>
                  <div class="mc-global-bottom">
                    <span class="mc-global-change ${item.changePct >= 0 ? 'up' : 'down'}">
                      ${item.changePct >= 0 ? '+' : ''}${item.changePct.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%
                    </span>
                    <svg class="mc-mini-spark" viewBox="0 0 52 18">
                      <polyline points="${generateSparklinePoints(item.sparkline)}" fill="none" stroke="${item.changePct >= 0 ? '#10b981' : '#ef4444'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
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
                <span class="mc-card-info-icon" title="Divulgações e decisões macro com impacto na volatilidade">ⓘ</span>
              </div>
              <button type="button" class="mc-events-head-btn" id="mcAddEventBtn">
                + Adicionar evento
              </button>
            </div>

            <div class="mc-events-table-wrap">
              <div class="mc-events-table-head">
                <span>Data ⬍</span>
                <span>Horário</span>
                <span>Evento</span>
                <span>Impacto</span>
                <span>Ativos relacionados</span>
                <span></span>
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
            </div>
          </article>
        </div>

        <!-- LINHA 3: MAPA DO MERCADO (B3) & NOTÍCIAS RELEVANTES -->
        <div class="market-central-grid-row">
          <!-- CARD MAPA DO MERCADO (B3) -->
          <article class="mc-card" id="mcMarketMapCard">
            <div class="mc-card-head">
              <div class="mc-card-title-row">
                <span class="mc-card-icon">🗺️</span>
                <h2>Mapa do Mercado (B3)</h2>
                <span class="mc-card-info-icon" title="Visão de calor setorial das ações na B3">ⓘ</span>
              </div>
              <div class="mc-map-controls">
                <div class="mc-map-tabs">
                  <button type="button" class="mc-map-tab-btn active">Setores</button>
                  <button type="button" class="mc-map-tab-btn">Ativos</button>
                  <button type="button" class="mc-map-tab-btn">Variação do dia</button>
                </div>
              </div>
            </div>

            <!-- MOSAICO VISUAL DE SETORES -->
            <div class="mc-market-mosaic">
              ${marketMap.map(sec => {
                const isPos = (sec.changePct || 0) >= 0;
                return `
                  <div class="mc-mosaic-block ${isPos ? 'pos' : 'neg'}" onclick="window.viewSectorDetails('${esc(sec.name)}')">
                    <div class="mc-mosaic-info">
                      <span class="mc-mosaic-name">${esc(sec.name)}</span>
                      <span class="mc-mosaic-change">${esc(sec.changeFormatted)}</span>
                    </div>
                    <div class="mc-mosaic-texture">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </article>

          <!-- CARD NOTÍCIAS RELEVANTES -->
          <article class="mc-card" id="mcNewsCard">
            <div class="mc-card-head">
              <div class="mc-card-title-row">
                <span class="mc-card-icon">📰</span>
                <h2>Notícias Relevantes</h2>
                <span class="mc-card-info-icon" title="Notícias essenciais para o contexto do pregão">ⓘ</span>
              </div>
              <a class="mc-news-all-btn" onclick="go('marketnews')">Ver todas</a>
            </div>

            <div class="mc-news-list">
              ${news.slice(0, 5).map(n => `
                <a class="mc-news-item" href="${esc(n.url || '#')}" target="_blank" rel="noopener noreferrer">
                  <div class="mc-news-thumb-wrap">
                    <img src="${getNewsThumbUrl(n)}" alt="${esc(n.title)}" class="mc-news-thumb" onerror="this.onerror=null;this.src='assets/news-hero-fed.jpg'" />
                  </div>
                  <div class="mc-news-text">
                    <div class="mc-news-meta">
                      <span class="mc-news-badge ${n.impact === 'ALTO IMPACTO' ? 'alto' : n.impact === 'MÉDIO IMPACTO' ? 'medio' : 'geral'}">${esc(n.impact || 'GERAL')}</span>
                      <span class="mc-news-time">${esc(n.time || '10:00')}</span>
                    </div>
                    <h3 class="mc-news-headline" title="${esc(n.title)}">${esc(n.title)}</h3>
                    <p class="mc-news-desc">${esc(n.summary || '')}</p>
                  </div>
                  <span class="mc-news-arrow">›</span>
                </a>
              `).join('')}
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
    if (!Array.isArray(series) || series.length === 0) return '0,9 52,9';
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = max - min || 1;
    const w = 52;
    const h = 18;

    return series.map((val, i) => {
      const x = Math.round((i / (series.length - 1)) * w);
      const y = Math.round(h - ((val - min) / range) * (h - 4) - 2);
      return `${x},${y}`;
    }).join(' ');
  }

  function bindEvents(rootEl) {
    rootEl.querySelector('#mcRefreshBtn')?.addEventListener('click', () => {
      fetchData();
    });

    rootEl.querySelector('#mcGuideCloseBtn')?.addEventListener('click', () => {
      state.guideClosed = true;
      const banner = rootEl.querySelector('.market-central-guide-banner');
      if (banner) banner.classList.add('is-closed');
    });

    rootEl.querySelector('#mcMarketSelect')?.addEventListener('change', (e) => {
      state.selectedMarket = e.target.value;
      fetchData();
    });

    rootEl.querySelector('#mcUniverseSelect')?.addEventListener('change', (e) => {
      state.selectedUniverse = e.target.value;
      fetchData();
    });

    rootEl.querySelectorAll('.market-central-period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedPeriod = btn.dataset.period;
        rootEl.querySelectorAll('.market-central-period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    rootEl.querySelector('#mcAddEventBtn')?.addEventListener('click', () => {
      openAddEventModal();
    });
  }

  /**
   * Modal para Adicionar Evento Macroeconômico Customizado
   */
  function openAddEventModal() {
    const existing = document.getElementById('mcAddEventModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'mcAddEventModal';
    modal.className = 'mc-modal-backdrop';
    modal.innerHTML = `
      <div class="mc-modal-card">
        <div class="mc-modal-header">
          <h3>Adicionar Evento de Alto Impacto</h3>
          <button type="button" class="mc-modal-close-btn" onclick="document.getElementById('mcAddEventModal').remove()">✕</button>
        </div>
        <form class="mc-modal-form" id="mcAddEventForm">
          <div class="mc-modal-field">
            <label>Nome do Evento *</label>
            <input type="text" id="evName" placeholder="Ex: Decisão de Juros Copom" required />
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="mc-modal-field">
              <label>Data *</label>
              <input type="date" id="evDate" value="${new Date().toISOString().slice(0, 10)}" required />
            </div>
            <div class="mc-modal-field">
              <label>Horário</label>
              <input type="time" id="evTime" value="10:00" />
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="mc-modal-field">
              <label>Impacto Previsto</label>
              <select id="evImpact">
                <option value="ALTO" selected>ALTO</option>
                <option value="MÉDIO">MÉDIO</option>
              </select>
            </div>
            <div class="mc-modal-field">
              <label>Ativos / Mercados Afetados</label>
              <input type="text" id="evAssets" placeholder="Ex: IBOV / Dólar / DI" />
            </div>
          </div>
          <div class="mc-modal-field">
            <label>Descrição / Observações</label>
            <textarea id="evDesc" rows="3" placeholder="Contexto ou expectativas do mercado..."></textarea>
          </div>
          <div class="mc-modal-actions">
            <button type="button" class="mc-modal-cancel-btn" onclick="document.getElementById('mcAddEventModal').remove()">Cancelar</button>
            <button type="submit" class="mc-modal-submit-btn">Salvar Evento</button>
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
      const relatedAssets = modal.querySelector('#evAssets').value;
      const description = modal.querySelector('#evDesc').value;

      try {
        Model.addCustomEvent({ name, date, time, impact, relatedAssets, description });
        modal.remove();
        render();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  /**
   * Playbook de Eventos: Modal para registrar a reação do mercado
   */
  window.openEventReactionModal = function (eventId) {
    const existing = document.getElementById('mcReactionModal');
    if (existing) existing.remove();

    const d = state.data || generateFallbackData();
    const allEvents = [...(Model.getCustomEvents?.() || []), ...(d.events || [])];
    const event = allEvents.find(e => e.id === eventId);
    if (!event) return;

    const reactions = Model.getReactionsForEvent ? Model.getReactionsForEvent(eventId) : [];
    const latestReaction = reactions[0] || null;

    const modal = document.createElement('div');
    modal.id = 'mcReactionModal';
    modal.className = 'mc-modal-backdrop';
    modal.innerHTML = `
      <div class="mc-modal-card" style="max-width: 620px;">
        <div class="mc-modal-header">
          <div>
            <h3>Playbook de Eventos: Reação do Mercado</h3>
            <span style="font-size:12px;color:#64748b;">${esc(event.name)} (${esc(event.date)} às ${esc(event.time)})</span>
          </div>
          <button type="button" class="mc-modal-close-btn" onclick="document.getElementById('mcReactionModal').remove()">✕</button>
        </div>

        <form class="mc-modal-form" id="mcReactionForm">
          <div class="mc-modal-field">
            <label>O que aconteceu após o evento? (Reação de Preço)</label>
            <textarea id="rxWhatHappened" rows="3" placeholder="Ex: Abertura em gap de alta de 1,2%, absorção rápida nas médias e fechamento na máxima..." required>${esc(latestReaction?.whatHappened || '')}</textarea>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="mc-modal-field">
              <label>Comportamento da Volatilidade</label>
              <select id="rxVolatility">
                <option value="Expansão rápida seguida de absorção" ${latestReaction?.volatilityBehavior?.includes('absorção') ? 'selected' : ''}>Expansão rápida seguida de absorção</option>
                <option value="Volatilidade unidirecional sem retorno" ${latestReaction?.volatilityBehavior?.includes('unidirecional') ? 'selected' : ''}>Volatilidade unidirecional sem retorno</option>
                <option value="Falso rompimento com reversão rápida" ${latestReaction?.volatilityBehavior?.includes('reversão') ? 'selected' : ''}>Falso rompimento com reversão rápida</option>
                <option value="Reação fraca / neutra" ${latestReaction?.volatilityBehavior?.includes('neutra') ? 'selected' : ''}>Reação fraca / neutra</option>
              </select>
            </div>
            <div class="mc-modal-field">
              <label>Ativos mais impactados</label>
              <input type="text" id="rxAffected" placeholder="Ex: DI1F29, PETR4, Dólar Futuro" value="${esc(latestReaction?.affectedAssets || '')}" />
            </div>
          </div>

          <div class="mc-modal-field">
            <label>Lição para o Playbook (O que fazer na próxima vez?)</label>
            <textarea id="rxLessons" rows="2" placeholder="Ex: Aguardar a primeira vela de 15m fechar antes de considerar qualquer ajuste nos stops...">${esc(latestReaction?.lessonsLearned || '')}</textarea>
          </div>

          <div class="mc-modal-actions">
            <button type="button" class="mc-modal-cancel-btn" onclick="document.getElementById('mcReactionModal').remove()">Fechar</button>
            <button type="submit" class="mc-modal-submit-btn">Salvar no Playbook</button>
          </div>
        </form>
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
