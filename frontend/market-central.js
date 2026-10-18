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
    if (typeof document === 'undefined') return null;
    return document.getElementById('marketCentralRoot') || document.getElementById('marketcentral');
  }

  function getEffectiveChange(item, period = 'today') {
    if (!item) return 0;
    if (item.returns && typeof item.returns[period] === 'number') {
      return item.returns[period];
    }
    if (period === 'today' && typeof item.changePct === 'number') {
      return item.changePct;
    }
    return typeof item.changePct === 'number' ? item.changePct : 0;
  }

  function formatChangePct(val) {
    const num = Number(val) || 0;
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
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
      console.warn('[MarketCentral] Usando dados em memória/fallback resiliente:', err.message);
      if (!state.data) {
        state.data = generateFallbackData();
      }
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
        { symbol: 'SPX', name: 'S&P 500', flag: '🇺🇸', value: '5.728,41', changePct: 0.82, returns: { today: 0.82, '5d': 1.65, '1m': 3.40, '3m': 7.80 }, trend: 'up', sparkline: [5680, 5695, 5705, 5700, 5715, 5722, 5728.41] },
        { symbol: 'NDX', name: 'Nasdaq', flag: '🇺🇸', value: '18.024,17', changePct: 1.14, returns: { today: 1.14, '5d': 2.30, '1m': 4.80, '3m': 9.20 }, trend: 'up', sparkline: [17810, 17860, 17920, 17890, 17980, 18010, 18024.17] },
        { symbol: 'DJI', name: 'Dow Jones', flag: '🇺🇸', value: '42.331,12', changePct: 0.42, returns: { today: 0.42, '5d': 0.85, '1m': 2.10, '3m': 5.40 }, trend: 'up', sparkline: [42150, 42200, 42240, 42210, 42280, 42310, 42331.12] },
        { symbol: 'VIX', name: 'VIX', flag: '📊', value: '17,21', changePct: -4.20, returns: { today: -4.20, '5d': -8.50, '1m': -12.40, '3m': -15.10 }, trend: 'down', sparkline: [19.8, 19.1, 18.5, 18.9, 17.8, 17.5, 17.21] },
        { symbol: 'DXY', name: 'Dólar (DXY)', flag: '🇺🇸', value: '101,63', changePct: 0.31, returns: { today: 0.31, '5d': 0.72, '1m': 1.15, '3m': -0.80 }, trend: 'up', sparkline: [100.9, 101.1, 101.3, 101.2, 101.5, 101.58, 101.63] },
        { symbol: 'GOLD', name: 'Ouro', flag: '🪙', value: '2.664,80', changePct: 0.62, returns: { today: 0.62, '5d': 1.80, '1m': 4.20, '3m': 11.50 }, trend: 'up', sparkline: [2640, 2646, 2652, 2650, 2658, 2661, 2664.8] },
        { symbol: 'WTI', name: 'Petróleo (WTI)', flag: '🛢️', value: '73,15', changePct: 1.80, returns: { today: 1.80, '5d': 3.50, '1m': 5.80, '3m': -4.20 }, trend: 'up', sparkline: [71.2, 71.8, 72.3, 72.0, 72.6, 72.9, 73.15] },
        { symbol: 'BTC', name: 'Bitcoin', flag: '₿', value: '62.431,00', changePct: 0.94, returns: { today: 0.94, '5d': 4.10, '1m': 8.60, '3m': 18.20 }, trend: 'up', sparkline: [61200, 61600, 61900, 61750, 62100, 62300, 62431] }
      ],
      marketMap: [
        { name: 'Financeiro', changePct: 2.4, changeFormatted: '+2,4%', returns: { today: 2.4, '5d': 3.8, '1m': 7.2, '3m': 12.5 }, assetsCount: 22 },
        { name: 'Mineração', changePct: 1.8, changeFormatted: '+1,8%', returns: { today: 1.8, '5d': 2.9, '1m': 5.4, '3m': -2.1 }, assetsCount: 8 },
        { name: 'Petróleo e Gás', changePct: 3.1, changeFormatted: '+3,1%', returns: { today: 3.1, '5d': 5.2, '1m': 9.8, '3m': 18.4 }, assetsCount: 12 },
        { name: 'Energia', changePct: 0.7, changeFormatted: '+0,7%', returns: { today: 0.7, '5d': 1.6, '1m': 4.1, '3m': 8.2 }, assetsCount: 18 },
        { name: 'Tecnologia', changePct: 1.2, changeFormatted: '+1,2%', returns: { today: 1.2, '5d': 2.4, '1m': 6.5, '3m': 14.1 }, assetsCount: 10 },
        { name: 'Consumo', changePct: -0.4, changeFormatted: '-0,4%', returns: { today: -0.4, '5d': -1.2, '1m': -3.5, '3m': -6.8 }, assetsCount: 20 },
        { name: 'Bens Industriais', changePct: 0.6, changeFormatted: '+0,6%', returns: { today: 0.6, '5d': 1.8, '1m': 4.9, '3m': 10.2 }, assetsCount: 14 },
        { name: 'Saúde', changePct: -0.2, changeFormatted: '-0,2%', returns: { today: -0.2, '5d': -0.8, '1m': 1.5, '3m': 3.2 }, assetsCount: 11 },
        { name: 'Utilidades', changePct: 0.3, changeFormatted: '+0,3%', returns: { today: 0.3, '5d': 1.1, '1m': 3.2, '3m': 6.9 }, assetsCount: 9 },
        { name: 'Telecom', changePct: 0.8, changeFormatted: '+0,8%', returns: { today: 0.8, '5d': 1.9, '1m': 4.4, '3m': 8.6 }, assetsCount: 6 },
        { name: 'Materiais Básicos', changePct: -0.6, changeFormatted: '-0,6%', returns: { today: -0.6, '5d': -1.5, '1m': -2.8, '3m': -5.4 }, assetsCount: 12 }
      ],
      events: [
        { id: 'evt-payroll', name: 'Payroll (EUA)', date: '2026-10-07', time: '09:30', impact: 'ALTO', relatedAssets: 'EUA / Dólar / Índices' },
        { id: 'evt-fed-rate', name: 'Decisão de Juros (EUA - Fed)', date: '2026-10-08', time: '15:00', impact: 'ALTO', relatedAssets: 'Índices / Dólar / Juros' },
        { id: 'evt-ipca', name: 'IPCA (Brasil)', date: '2026-10-10', time: '09:00', impact: 'MÉDIO', relatedAssets: 'IBOV / Juros / Bancos' },
        { id: 'evt-china-pmi', name: 'Produção Industrial (China)', date: '2026-10-12', time: '11:00', impact: 'MÉDIO', relatedAssets: 'Commodities / Mineração' },
        { id: 'evt-copom', name: 'Decisão de Juros (Brasil - Copom)', date: '2026-10-13', time: '10:00', impact: 'ALTO', relatedAssets: 'IBOV / Juros / Bancos' }
      ],
      assets: [
        { symbol: 'PETR4', name: 'Petrobras PN', sector: 'Petróleo e Gás', price: 37.82, changePct: 3.10, changeFormatted: '+3,10%', returns: { today: 3.10, '5d': 5.20, '1m': 14.00, '3m': 37.70 }, score: 88 },
        { symbol: 'VALE3', name: 'Vale ON', sector: 'Mineração', price: 61.40, changePct: 1.80, changeFormatted: '+1,80%', returns: { today: 1.80, '5d': 2.90, '1m': 5.10, '3m': -2.50 }, score: 55 },
        { symbol: 'ITUB4', name: 'Itaú Unibanco', sector: 'Financeiro', price: 34.50, changePct: 2.40, changeFormatted: '+2,40%', returns: { today: 2.40, '5d': 3.90, '1m': 8.20, '3m': 15.60 }, score: 82 },
        { symbol: 'BBDC4', name: 'Bradesco PN', sector: 'Financeiro', price: 14.92, changePct: 1.15, changeFormatted: '+1,15%', returns: { today: 1.15, '5d': 2.10, '1m': 4.80, '3m': 9.40 }, score: 68 },
        { symbol: 'BBAS3', name: 'Banco do Brasil', sector: 'Financeiro', price: 28.10, changePct: 2.10, changeFormatted: '+2,10%', returns: { today: 2.10, '5d': 3.50, '1m': 7.60, '3m': 13.80 }, score: 79 },
        { symbol: 'WEGE3', name: 'WEG ON', sector: 'Bens Industriais', price: 54.20, changePct: 0.60, changeFormatted: '+0,60%', returns: { today: 0.60, '5d': 2.40, '1m': 6.90, '3m': 18.20 }, score: 92 },
        { symbol: 'PRIO3', name: 'PRIO ON', sector: 'Petróleo e Gás', price: 46.80, changePct: 2.85, changeFormatted: '+2,85%', returns: { today: 2.85, '5d': 4.80, '1m': 11.20, '3m': 22.50 }, score: 85 },
        { symbol: 'RENT3', name: 'Localiza ON', sector: 'Consumo', price: 42.10, changePct: -1.20, changeFormatted: '-1,20%', returns: { today: -1.20, '5d': -2.50, '1m': -5.10, '3m': -8.90 }, score: 61 },
        { symbol: 'MGLU3', name: 'Magazine Luiza', sector: 'Consumo', price: 9.30, changePct: -2.40, changeFormatted: '-2,40%', returns: { today: -2.40, '5d': -4.80, '1m': -9.20, '3m': -16.40 }, score: 45 },
        { symbol: 'GGBR4', name: 'Gerdau PN', sector: 'Materiais Básicos', price: 18.75, changePct: -0.60, changeFormatted: '-0,60%', returns: { today: -0.60, '5d': -1.40, '1m': -2.90, '3m': -6.10 }, score: 58 },
        { symbol: 'ELET3', name: 'Eletrobras ON', sector: 'Energia', price: 39.40, changePct: 0.70, changeFormatted: '+0,70%', returns: { today: 0.70, '5d': 1.80, '1m': 4.50, '3m': 9.10 }, score: 74 },
        { symbol: 'VIVT3', name: 'Telefônica Brasil', sector: 'Telecom', price: 51.60, changePct: 0.80, changeFormatted: '+0,80%', returns: { today: 0.80, '5d': 1.90, '1m': 4.20, '3m': 8.50 }, score: 77 }
      ],
      news: [],
      newsStatus: 'loading'
    };
  }

  function renderNewsThumb(n) {
    if (n.image && typeof n.image === 'string' && n.image.startsWith('https://')) {
      return `<img src="${esc(n.image)}" alt="${esc(n.title)}" class="mc-news-thumb" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="mc-news-thumb-fallback" style="display:none;"><span>${esc((n.source || 'N')[0])}</span></div>`;
    }
    return `<div class="mc-news-thumb-fallback"><span>${esc((n.source || 'N')[0])}</span></div>`;
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

    // Dispara a busca em background se ainda não buscou, sem travar a interface
    if (!state.data && !state.loading) {
      fetchData();
    }

    const d = state.data || generateFallbackData();
    const period = state.selectedPeriod || 'today';
    const regime = d.regime || {};
    const breadth = d.breadth || {};
    const globalMarkets = d.globalMarkets || [];
    const marketMap = d.marketMap || [];
    const rawEvents = [...(Model.getCustomEvents?.() || []), ...(d.events || [])];
    const seenEventIds = new Set();
    const events = [];
    for (const ev of rawEvents) {
      if (ev && ev.id && !seenEventIds.has(ev.id)) {
        seenEventIds.add(ev.id);
        events.push(ev);
      }
    }
    const displayEvents = events.slice(0, 8);
    const news = (d.news && d.news.length > 0) ? d.news.slice(0, 5) : [];
    const assets = d.assets || [];

    // Cálculo dinâmico de avanço e queda para o período selecionado
    let advPct = breadth.advancePct ?? 62;
    let decPct = breadth.declinePct ?? 38;
    if (assets && assets.length > 0) {
      let upCount = 0;
      let downCount = 0;
      assets.forEach(it => {
        const val = getEffectiveChange(it, period);
        if (val > 0) upCount++;
        else if (val < 0) downCount++;
      });
      const tot = upCount + downCount;
      if (tot > 0) {
        advPct = Math.round((upCount / tot) * 100);
        decPct = 100 - advPct;
      }
    }

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
              <div class="mc-adv-side" style="flex: ${advPct};">
                <span>Avanço</span>
                <strong>${advPct}%</strong>
              </div>
              <div class="mc-dec-side" style="flex: ${decPct};">
                <span>Queda</span>
                <strong>${decPct}%</strong>
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
              ${globalMarkets.map(item => {
                const change = getEffectiveChange(item, period);
                const isPos = change >= 0;
                return `
                <div class="mc-global-item" title="${esc(item.description || item.name)}">
                  <div class="mc-global-head">
                    <span class="mc-global-flag">${item.flag || '🌐'}</span>
                    <span class="mc-global-name">${esc(item.name)}</span>
                  </div>
                  <div class="mc-global-value">${esc(item.value)}</div>
                  <div class="mc-global-bottom">
                    <span class="mc-global-change ${isPos ? 'up' : 'down'}">
                      ${formatChangePct(change)}
                    </span>
                    <svg class="mc-mini-spark" viewBox="0 0 52 18">
                      <polyline points="${generateSparklinePoints(item.sparkline)}" fill="none" stroke="${isPos ? '#10b981' : '#ef4444'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </div>
                </div>
              `;}).join('')}
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
                ${displayEvents.map(ev => `
                  <div class="mc-event-row" data-event-id="${esc(ev.id)}" onclick="window.openEventReactionModal('${esc(ev.id)}')">
                    <span class="mc-event-date">${formatEventDate(ev.date || ev.eventDate)}</span>
                    <span class="mc-event-time">${esc(ev.time || ev.eventTime || '10:00')}</span>
                    <span class="mc-event-name">${esc(ev.name)}</span>
                    <span class="mc-event-badge ${(ev.impact === 'ALTO' || ev.impact >= 4) ? 'alto' : 'medio'}">${esc(ev.impact === 'ALTO' || ev.impact >= 4 ? 'ALTO' : 'MÉDIO')}</span>
                    <span class="mc-event-related">${esc(ev.relatedAssets || ev.affectedAssets || 'Geral')}</span>
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
                <div class="mc-map-tabs" role="tablist" aria-label="Visualização do Mapa de Mercado">
                  <button type="button" role="tab" id="mcTabSectors" data-tab="sectors" class="mc-map-tab-btn ${state.activeTabMap === 'sectors' ? 'active' : ''}" aria-selected="${state.activeTabMap === 'sectors' ? 'true' : 'false'}" tabindex="${state.activeTabMap === 'sectors' ? '0' : '-1'}">Setores</button>
                  <button type="button" role="tab" id="mcTabAssets" data-tab="assets" class="mc-map-tab-btn ${state.activeTabMap === 'assets' ? 'active' : ''}" aria-selected="${state.activeTabMap === 'assets' ? 'true' : 'false'}" tabindex="${state.activeTabMap === 'assets' ? '0' : '-1'}">Ativos</button>
                  <button type="button" role="tab" id="mcTabVariation" data-tab="variation" class="mc-map-tab-btn ${state.activeTabMap === 'variation' ? 'active' : ''}" aria-selected="${state.activeTabMap === 'variation' ? 'true' : 'false'}" tabindex="${state.activeTabMap === 'variation' ? '0' : '-1'}">Variação do dia</button>
                </div>
              </div>
            </div>

            <!-- CONTEÚDO DINÂMICO CONFORME O SELETOR ATIVO -->
            <div class="mc-map-content-container" id="mcMapContentContainer" role="tabpanel" aria-labelledby="mcTab${state.activeTabMap.charAt(0).toUpperCase() + state.activeTabMap.slice(1)}">
              ${renderMarketMapContent(state.activeTabMap, marketMap, assets, period)}
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
            </div>

            ${news && news.length > 0 ? `
              <div class="mc-news-list">
                ${news.slice(0, 5).map(n => `
                  <a class="mc-news-item" href="${esc(n.url || '#')}" target="_blank" rel="noopener noreferrer">
                    <div class="mc-news-thumb-wrap">
                      ${renderNewsThumb(n)}
                    </div>
                    <div class="mc-news-text">
                      <div class="mc-news-meta">
                        <span class="mc-news-source">${esc(n.source || 'Mercado')}</span>
                        <span class="mc-news-badge ${n.impact === 'ALTO IMPACTO' ? 'alto' : n.impact === 'MÉDIO IMPACTO' ? 'medio' : 'geral'}">${esc(n.impact || 'GERAL')}</span>
                        <span class="mc-news-time">${esc(n.time || '—')}</span>
                      </div>
                      <h3 class="mc-news-headline" title="${esc(n.title)}">${esc(n.title)}</h3>
                      <p class="mc-news-desc">${esc(n.summary || '')}</p>
                    </div>
                    <span class="mc-news-arrow">›</span>
                  </a>
                `).join('')}
              </div>
            ` : (state.loading ? `
              <div class="mc-news-empty-state">
                <div class="mc-news-empty-icon">⏳</div>
                <div class="mc-news-empty-text">
                  <h4>Sincronizando notícias...</h4>
                  <p>Buscando atualizações dos veículos credenciados em segundo plano. As análises de regime e amplitude já estão disponíveis.</p>
                </div>
              </div>
            ` : `
              <div class="mc-news-empty-state">
                <div class="mc-news-empty-icon">📰</div>
                <div class="mc-news-empty-text">
                  <h4>Feed em atualização</h4>
                  <p>Notícias dos veículos credenciados em processamento. O regime técnico e a saúde de mercado operam normalmente.</p>
                </div>
              </div>
            `)}
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

  /**
   * Renderiza o conteúdo dinâmico do Mapa de Mercado conforme a aba ativa
   * @param {'sectors'|'assets'|'variation'} activeTab
   * @param {Array} marketMap
   * @param {Array} assets
   * @param {'today'|'5d'|'1m'|'3m'} period
   */
  function renderMarketMapContent(activeTab, marketMap, assets, period = 'today') {
    if (activeTab === 'assets') {
      if (!assets || assets.length === 0) {
        return `<div class="mc-map-empty">Nenhum ativo disponível para este universo no momento.</div>`;
      }
      return `
        <div class="mc-market-mosaic mc-assets-mosaic">
          ${assets.map(it => {
            const chg = getEffectiveChange(it, period);
            const isPos = chg >= 0;
            const chgFormatted = formatChangePct(chg);
            return `
              <div class="mc-mosaic-block mc-asset-block ${isPos ? 'pos' : 'neg'}" onclick="go('charts', '${esc(it.symbol)}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')go('charts', '${esc(it.symbol)}')" title="${esc(it.symbol)} - ${esc(it.name)} (${esc(it.sector)}): ${esc(chgFormatted)}">
                <div class="mc-mosaic-info">
                  <div class="mc-asset-head">
                    <span class="mc-mosaic-sym">${esc(it.symbol)}</span>
                    ${it.price ? `<span class="mc-mosaic-price">R$ ${it.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>` : ''}
                  </div>
                  <span class="mc-mosaic-change">${esc(chgFormatted)}</span>
                </div>
                <div class="mc-mosaic-meta">
                  <span class="mc-mosaic-sec-name">${esc(it.sector || it.name)}</span>
                </div>
                <div class="mc-mosaic-texture">
                  <span></span><span></span><span></span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (activeTab === 'variation') {
      if (!assets || assets.length === 0) {
        return `<div class="mc-map-empty">Nenhum dado de variação disponível no momento.</div>`;
      }
      const periodLabelMap = {
        today: 'do Dia',
        '5d': '(5 Dias)',
        '1m': '(1 Mês)',
        '3m': '(3 Meses)'
      };
      const periodLabel = periodLabelMap[period] || 'do Período';
      const sorted = [...assets].sort((a, b) => getEffectiveChange(b, period) - getEffectiveChange(a, period));
      const topGainers = sorted.filter(it => getEffectiveChange(it, period) > 0).slice(0, 8);
      const topLosers = [...sorted].reverse().filter(it => getEffectiveChange(it, period) < 0).slice(0, 8);

      return `
        <div class="mc-variation-container">
          <div class="mc-variation-grid">
            <!-- COLUNA TOP ALTAS -->
            <div class="mc-variation-col gainers">
              <div class="mc-variation-col-head">
                <span class="mc-var-title-icon">▲</span>
                <span class="mc-var-col-title">Maiores Altas ${periodLabel}</span>
                <span class="mc-var-badge up">${topGainers.length} ativos</span>
              </div>
              <div class="mc-var-list">
                ${topGainers.length > 0 ? topGainers.map((it, idx) => {
                  const chg = getEffectiveChange(it, period);
                  const chgFormatted = formatChangePct(chg);
                  return `
                  <div class="mc-var-row up" onclick="go('charts', '${esc(it.symbol)}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')go('charts', '${esc(it.symbol)}')">
                    <span class="mc-var-rank">${idx + 1}º</span>
                    <div class="mc-var-info">
                      <strong class="mc-var-sym">${esc(it.symbol)}</strong>
                      <span class="mc-var-name">${esc(it.name)}</span>
                    </div>
                    ${it.price ? `<span class="mc-var-price">R$ ${it.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>` : ''}
                    <span class="mc-var-val pos">${esc(chgFormatted)}</span>
                  </div>
                `;}).join('') : '<div class="mc-var-empty">Nenhuma alta expressiva no período</div>'}
              </div>
            </div>

            <!-- COLUNA TOP BAIXAS -->
            <div class="mc-variation-col losers">
              <div class="mc-variation-col-head">
                <span class="mc-var-title-icon">▼</span>
                <span class="mc-var-col-title">Maiores Baixas ${periodLabel}</span>
                <span class="mc-var-badge down">${topLosers.length} ativos</span>
              </div>
              <div class="mc-var-list">
                ${topLosers.length > 0 ? topLosers.map((it, idx) => {
                  const chg = getEffectiveChange(it, period);
                  const chgFormatted = formatChangePct(chg);
                  return `
                  <div class="mc-var-row down" onclick="go('charts', '${esc(it.symbol)}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')go('charts', '${esc(it.symbol)}')">
                    <span class="mc-var-rank">${idx + 1}º</span>
                    <div class="mc-var-info">
                      <strong class="mc-var-sym">${esc(it.symbol)}</strong>
                      <span class="mc-var-name">${esc(it.name)}</span>
                    </div>
                    ${it.price ? `<span class="mc-var-price">R$ ${it.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>` : ''}
                    <span class="mc-var-val neg">${esc(chgFormatted)}</span>
                  </div>
                `;}).join('') : '<div class="mc-var-empty">Nenhuma baixa expressiva no período</div>'}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Default: 'sectors'
    if (!marketMap || marketMap.length === 0) {
      return `<div class="mc-map-empty">Nenhum dado setorial disponível no momento.</div>`;
    }
    const sortedSectors = [...marketMap].sort((a, b) => getEffectiveChange(b, period) - getEffectiveChange(a, period));
    return `
      <div class="mc-market-mosaic">
        ${sortedSectors.map(sec => {
          const chg = getEffectiveChange(sec, period);
          const isPos = chg >= 0;
          const chgFormatted = formatChangePct(chg);
          return `
            <div class="mc-mosaic-block ${isPos ? 'pos' : 'neg'}" onclick="window.viewSectorDetails('${esc(sec.name)}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')window.viewSectorDetails('${esc(sec.name)}')">
              <div class="mc-mosaic-info">
                <span class="mc-mosaic-name">${esc(sec.name)}</span>
                <span class="mc-mosaic-change">${esc(chgFormatted)}</span>
              </div>
              <div class="mc-mosaic-meta">
                <span class="mc-mosaic-count">${sec.assetsCount ? `${sec.assetsCount} ativos` : ''}</span>
              </div>
              <div class="mc-mosaic-texture">
                <span></span><span></span><span></span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Atualiza visualmente o seletor de tabs e troca o conteúdo do mapa
   */
  function updateMapTabsUI(rootEl) {
    const tabBtns = rootEl.querySelectorAll('.mc-map-tab-btn');
    tabBtns.forEach(btn => {
      const isSelected = btn.getAttribute('data-tab') === state.activeTabMap;
      btn.classList.toggle('active', isSelected);
      btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      btn.setAttribute('tabindex', isSelected ? '0' : '-1');
    });

    const contentContainer = rootEl.querySelector('#mcMapContentContainer');
    if (contentContainer) {
      const d = state.data || generateFallbackData();
      contentContainer.setAttribute('aria-labelledby', `mcTab${state.activeTabMap.charAt(0).toUpperCase() + state.activeTabMap.slice(1)}`);
      contentContainer.innerHTML = renderMarketMapContent(state.activeTabMap, d.marketMap || [], d.assets || [], state.selectedPeriod);
    }
  }

  function bindEvents(rootEl) {
    // Seletores do Mapa de Mercado (Setores, Ativos, Variação do dia)
    const tabBtns = Array.from(rootEl.querySelectorAll('.mc-map-tab-btn'));
    tabBtns.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (!targetTab || state.activeTabMap === targetTab) return;
        state.activeTabMap = targetTab;
        updateMapTabsUI(rootEl);
      });

      btn.addEventListener('keydown', (e) => {
        let targetIdx = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          targetIdx = (idx + 1) % tabBtns.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          targetIdx = (idx - 1 + tabBtns.length) % tabBtns.length;
        } else if (e.key === 'Home') {
          targetIdx = 0;
        } else if (e.key === 'End') {
          targetIdx = tabBtns.length - 1;
        }
        if (targetIdx >= 0) {
          e.preventDefault();
          const targetBtn = tabBtns[targetIdx];
          targetBtn.focus();
          const targetTab = targetBtn.getAttribute('data-tab');
          if (targetTab && state.activeTabMap !== targetTab) {
            state.activeTabMap = targetTab;
            updateMapTabsUI(rootEl);
          }
        }
      });
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

    // Seletor de Período — atualização instantânea em memória (<16ms)
    rootEl.querySelectorAll('.market-central-period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetPeriod = btn.dataset.period;
        if (!targetPeriod || state.selectedPeriod === targetPeriod) return;
        state.selectedPeriod = targetPeriod;
        render();
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
        if (window.EventPlaybook && typeof window.EventPlaybook.refresh === 'function') {
          window.EventPlaybook.refresh();
        }
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
    const epEvent = (window.EventPlaybookModel?.getEventById && window.EventPlaybookModel.getEventById(eventId)) || null;
    const event = epEvent || allEvents.find(e => e.id === eventId);
    if (!event) return;

    const reactions = Model.getReactionsForEvent ? Model.getReactionsForEvent(eventId) : [];
    const latestReaction = epEvent || reactions[0] || null;

    const modal = document.createElement('div');
    modal.id = 'mcReactionModal';
    modal.className = 'mc-modal-backdrop';
    modal.innerHTML = `
      <div class="mc-modal-card" style="max-width: 620px;">
        <div class="mc-modal-header">
          <div>
            <h3>Registro de Eventos: Reação do Mercado</h3>
            <span style="font-size:12px;color:#64748b;">${esc(event.name)} (${esc(event.date || event.eventDate)} às ${esc(event.time || event.eventTime || '10:00')})</span>
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

          <div class="mc-modal-actions" style="display:flex;justify-content:space-between;align-items:center;">
            <button type="button" class="mc-modal-link-btn" style="background:transparent;border:none;color:#10b981;cursor:pointer;font-size:13px;font-weight:600;padding:6px 0;display:inline-flex;align-items:center;gap:4px;" onclick="document.getElementById('mcReactionModal')?.remove(); if (window.EventPlaybook && typeof window.EventPlaybook.selectEvent === 'function') { window.EventPlaybook.selectEvent('${esc(event.id)}'); if (window.go) window.go('eventplaybook'); } else if (window.go) { window.go('eventplaybook'); }">
              Abrir no Event Playbook ↗
            </button>
            <div style="display:flex;gap:8px;">
              <button type="button" class="mc-modal-cancel-btn" onclick="document.getElementById('mcReactionModal').remove()">Fechar</button>
              <button type="submit" class="mc-modal-submit-btn">Salvar no Playbook</button>
            </div>
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
        eventDate: event.date || event.eventDate,
        whatHappened,
        volatilityBehavior,
        affectedAssets,
        lessonsLearned
      });

      if (window.EventPlaybook && typeof window.EventPlaybook.refresh === 'function') {
        window.EventPlaybook.refresh();
      }

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
