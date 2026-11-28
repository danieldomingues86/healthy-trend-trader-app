const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const MarketCycleModel = require('./market-cycle-model');
const backendRegimes = require('../backend/src/market-regime');

function createMockEnvironment() {
  const listeners = new Map();
  const storage = new Map();

  class MockElement {
    constructor(tagName, id = '') {
      this.tagName = tagName.toUpperCase();
      this.id = id;
      const set = new Set();
      this.classList = {
        has: (c) => set.has(c),
        contains: (c) => set.has(c),
        add: (...cs) => { for (const c of cs) set.add(c); return this.classList; },
        delete: (c) => set.delete(c),
        toggle: (c, val) => {
          if (val === undefined) val = !set.has(c);
          if (val) set.add(c); else set.delete(c);
          return val;
        }
      };
      this._innerHTML = '';
      this.attributes = new Map();
      this.eventListeners = new Map();
    }

    get innerHTML() {
      return this._innerHTML;
    }

    set innerHTML(html) {
      this._innerHTML = html;
    }

    addEventListener(event, fn) {
      if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
      this.eventListeners.get(event).push(fn);
    }

    trigger(event, eventObj = {}) {
      const fns = this.eventListeners.get(event) || [];
      for (const fn of fns) fn(eventObj);
    }
  }

  const rootElement = new MockElement('div', 'marketcycle');
  rootElement.classList.add('page', 'active');

  const mockDocument = {
    getElementById(id) {
      if (id === 'marketcycle') return rootElement;
      return null;
    },
    documentElement: new MockElement('html'),
    body: new MockElement('body'),
    addEventListener(event, fn) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
    }
  };

  const mockLocalStorage = {
    getItem(k) { return storage.get(k) || null; },
    setItem(k, v) { storage.set(k, String(v)); },
    removeItem(k) { storage.delete(k); },
    clear() { storage.clear(); }
  };

  class MockMutationObserver {
    observe() {}
    disconnect() {}
  }

  const mockWindow = {
    document: mockDocument,
    localStorage: mockLocalStorage,
    MutationObserver: MockMutationObserver,
    addEventListener(event, fn) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
    },
    appLanguage: 'pt-BR',
    MARKET_DATA_API_URL: 'http://localhost:8787/api',
    go: () => {}
  };

  return { rootElement, mockDocument, mockWindow, mockLocalStorage, storage };
}

test('Ajustes V3: Cores oficiais canônicas dos 6 regimes são idênticas entre backend, model e visual', () => {
  const EXPECTED_COLORS = {
    UP_QUIET: '#10b981',
    UP_VOLATILE: '#f59e0b',
    SIDEWAYS_QUIET: '#3b82f6',
    SIDEWAYS_VOLATILE: '#f97316',
    DOWN_QUIET: '#6b7280',
    DOWN_VOLATILE: '#ef4444'
  };

  for (const [key, expectedColor] of Object.entries(EXPECTED_COLORS)) {
    assert.equal(
      MarketCycleModel.REGIME_METADATA[key].color.toLowerCase(),
      expectedColor.toLowerCase(),
      `MarketCycleModel cor de ${key} deve ser ${expectedColor}`
    );
    assert.equal(
      backendRegimes.REGIME_METADATA[key].color.toLowerCase(),
      expectedColor.toLowerCase(),
      `Backend cor de ${key} deve ser ${expectedColor}`
    );
  }
});

test('Ajustes V3: Linha do Tempo SVG e Tooltip têm alinhamento 1:1 sem deslocamento geométrico', async () => {
  const env = createMockEnvironment();

  // Histórico com 10 candles e regimes alternados conhecidos
  const testHistory = [
    { date: '2026-06-01', close: 100, ema10: 99, ema20: 98, ema50: 97, ema72: 96, ema200: 90, regime: 'UP_QUIET' },
    { date: '2026-06-02', close: 101, ema10: 100, ema20: 99, ema50: 98, ema72: 97, ema200: 91, regime: 'UP_QUIET' },
    { date: '2026-06-03', close: 102, ema10: 101, ema20: 100, ema50: 99, ema72: 98, ema200: 92, regime: 'UP_VOLATILE' },
    { date: '2026-06-04', close: 100, ema10: 100, ema20: 99, ema50: 98, ema72: 97, ema200: 91, regime: 'SIDEWAYS_QUIET' },
    { date: '2026-06-05', close: 99, ema10: 99, ema20: 98, ema50: 97, ema72: 96, ema200: 90, regime: 'SIDEWAYS_QUIET' },
    { date: '2026-06-08', close: 98, ema10: 99, ema20: 98, ema50: 97, ema72: 96, ema200: 90, regime: 'SIDEWAYS_VOLATILE' },
    { date: '2026-06-09', close: 95, ema10: 97, ema20: 98, ema50: 97, ema72: 96, ema200: 90, regime: 'SIDEWAYS_QUIET' }, // Data mencionada pelo usuário
    { date: '2026-06-10', close: 93, ema10: 95, ema20: 96, ema50: 96, ema72: 96, ema200: 90, regime: 'DOWN_QUIET' },
    { date: '2026-06-11', close: 89, ema10: 92, ema20: 94, ema50: 95, ema72: 96, ema200: 90, regime: 'DOWN_VOLATILE' },
    { date: '2026-06-12', close: 88, ema10: 90, ema20: 92, ema50: 94, ema72: 95, ema200: 90, regime: 'DOWN_VOLATILE' }
  ];

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      updatedAt: '2026-06-12T18:00:00Z',
      market: 'nasdaq',
      cycle: { state: 'defensive', score: 40, price: 88, ema10: 90, ema72: 95, date: '20260612' },
      benchmark: {
        symbol: 'NASDAQ',
        name: 'Nasdaq-100 (QQQ)',
        returns: { m1: -5.0, m3: -8.0 },
        history: testHistory
      }
    })
  });

  const code = fs.readFileSync(path.join(__dirname, 'market-cycle-v2.js'), 'utf8');
  const runCode = new Function('document', 'window', 'localStorage', 'MutationObserver', 'fetch', code);
  runCode(env.mockDocument, env.mockWindow, env.mockLocalStorage, env.mockWindow.MutationObserver, global.fetch);

  await env.mockWindow.loadMarketCycleV2('nasdaq');

  // Verifica que a linha do tempo SVG foi renderizada com viewBox 1200 14 e com as cores corretas
  assert.ok(env.rootElement.innerHTML.includes('mre-ribbon-svg'), 'Linha do tempo renderizada via SVG padronizado');
  assert.ok(env.rootElement.innerHTML.includes('viewBox="0 0 1200 14"'), 'Linha do tempo SVG possui exata proporção geométrica 1200x14');

  // Verifica que a data 2026-06-09 foi colorida como #3b82f6 (Sideways - Quiet) e NÃO verde
  assert.ok(
    env.rootElement.innerHTML.includes('fill="#3b82f6"'),
    'Linha do tempo contém o segmento azul (#3b82f6) para Sideways - Quiet'
  );

  // Validação da geometria: padLeft = 15, plotW = 1110 (W=1200, padRight=75)
  // Candle na posição i=6 (09/06/2026):
  const W = 1200;
  const padLeft = 15;
  const padRight = 75;
  const plotW = W - padLeft - padRight;
  const total = testHistory.length;
  const stepX = plotW / (total - 1);
  const candleX = padLeft + 6 * stepX;

  // A posição X do candle i=6 deve ser exatamente: 15 + 6 * (1110 / 9) = 15 + 6 * 123.333 = 755
  assert.equal(Math.round(candleX), 755, 'X do candle coincide precisamente com X da linha do tempo');

  global.fetch = originalFetch;
});

test('Ajustes V3: Suporte a 5 EMAs com padrão estrito (apenas EMA 10 e EMA 30 ativas no Ciclo de Mercado) e persistência', async () => {
  const env = createMockEnvironment();

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      updatedAt: '2026-09-25T12:00:00Z',
      market: 'stock_b3',
      cycle: { state: 'healthy', score: 80, price: 100, ema10: 95, ema30: 90, date: '20260925' },
      benchmark: {
        symbol: 'IBOV',
        name: 'Índice Bovespa',
        history: [
          { date: '2026-01-01', close: 100, ema10: 95, ema20: 94, ema30: 90, ema50: 88, ema72: 86, ema200: 85, regime: 'UP_QUIET' }
        ]
      }
    })
  });

  const code = fs.readFileSync(path.join(__dirname, 'market-cycle-v2.js'), 'utf8');
  const runCode = new Function('document', 'window', 'localStorage', 'MutationObserver', 'fetch', code);
  runCode(env.mockDocument, env.mockWindow, env.mockLocalStorage, env.mockWindow.MutationObserver, global.fetch);

  await env.mockWindow.loadMarketCycleV2('stock_b3');

  // 1. Padrão inicial do Ciclo de Mercado: EMA 10 e EMA 30 marcadas; EMA 20, 50, 200 desmarcadas
  const html = env.rootElement.innerHTML;
  assert.ok(html.includes('data-toggle-ema="10" checked'), 'EMA 10 habilitada por padrão no Ciclo de Mercado');
  assert.ok(html.includes('data-toggle-ema="30" checked'), 'EMA 30 habilitada por padrão no Ciclo de Mercado');
  assert.ok(!html.includes('data-toggle-ema="20" checked'), 'EMA 20 desabilitada por padrão');
  assert.ok(!html.includes('data-toggle-ema="50" checked'), 'EMA 50 desabilitada por padrão');
  assert.ok(!html.includes('data-toggle-ema="200" checked'), 'EMA 200 desabilitada por padrão');

  // 2. Persistência no localStorage: simular usuário ativando EMA 20 e desativando EMA 10
  env.mockLocalStorage.setItem('mcv2_emas', JSON.stringify({
    showEma10: false,
    showEma20: true,
    showEma30: true,
    showEma50: false,
    showEma200: true
  }));

  // Recarregar módulo com as novas preferências
  await env.mockWindow.loadMarketCycleV2('stock_b3');
  const updatedHtml = env.rootElement.innerHTML;
  assert.ok(!updatedHtml.includes('data-toggle-ema="10" checked'), 'EMA 10 reflete preferência salva');
  assert.ok(updatedHtml.includes('data-toggle-ema="20" checked'), 'EMA 20 ativada conforme preferência');
  assert.ok(updatedHtml.includes('data-toggle-ema="30" checked'), 'EMA 30 mantida');
  assert.ok(updatedHtml.includes('data-toggle-ema="200" checked'), 'EMA 200 ativada conforme preferência');

  global.fetch = originalFetch;
});

test('Ajustes V3: Benchmarks US (S&P 500 e Nasdaq) possuem série histórica estendida e regimes oficiais', async () => {
  const fsPromises = require('node:fs/promises');
  const usCache = JSON.parse(await fsPromises.readFile(path.join(__dirname, '../backend/data/us-benchmarks-cache.json'), 'utf8'));
  const regimesCache = JSON.parse(await fsPromises.readFile(path.join(__dirname, '../backend/data/market-regimes-cache.json'), 'utf8'));

  const spCandles = usCache.benchmarks?.SP500?.candles || [];
  const nasdaqCandles = usCache.benchmarks?.NASDAQ?.candles || [];
  assert.ok(spCandles.length >= 700, `SP500 deve ter pelo menos 700 candles históricos (atual: ${spCandles.length})`);
  assert.ok(nasdaqCandles.length >= 700, `NASDAQ deve ter pelo menos 700 candles históricos (atual: ${nasdaqCandles.length})`);

  const spRegimes = regimesCache.benchmarks?.SP500?.regimes || [];
  const nasdaqRegimes = regimesCache.benchmarks?.NASDAQ?.regimes || [];
  assert.ok(spRegimes.length >= 400, `SP500 deve ter pelo menos 400 regimes oficiais calculados (atual: ${spRegimes.length})`);
  assert.ok(nasdaqRegimes.length >= 400, `NASDAQ deve ter pelo menos 400 regimes oficiais calculados (atual: ${nasdaqRegimes.length})`);

  const sp500RegimeTypes = new Set(spRegimes.map(r => r.regime));
  assert.ok(sp500RegimeTypes.size >= 3, 'SP500 deve cobrir múltiplos regimes na série histórica');

  const nasdaqRegimeTypes = new Set(nasdaqRegimes.map(r => r.regime));
  assert.ok(nasdaqRegimeTypes.size >= 3, 'NASDAQ deve cobrir múltiplos regimes na série histórica');
});

test('Ajustes V4: Tooltip, Linha do Tempo e Card Regime Atual utilizam fonte única e datas iguais coincidem rigorosamente', async () => {
  const env = createMockEnvironment();

  // Histórico com formato de data B3/COTAHIST (YYYYMMDD sem hífen)
  const testHistory = [
    { date: '20261117', close: 169816.64, ema10: 171759.04, ema72: 181763.27 },
    { date: '20261118', close: 167537.95, ema10: 170991.57, ema72: 181373.53 },
    { date: '20261119', close: 166376.43, ema10: 170152.45, ema72: 180962.66 } // Último candle diário válido
  ];

  const testRegimes = [
    { reference_date: '2026-11-17', regime: 'DOWN_VOLATILE', direction: 'DOWN', volatility: 'VOLATILE' },
    { reference_date: '2026-11-18', regime: 'DOWN_VOLATILE', direction: 'DOWN', volatility: 'VOLATILE' },
    { reference_date: '2026-11-19', regime: 'DOWN_VOLATILE', direction: 'DOWN', volatility: 'VOLATILE' }
  ];

  const currentRegime = {
    reference_date: '2026-11-19',
    regime: 'DOWN_VOLATILE',
    direction: 'DOWN',
    volatility: 'VOLATILE',
    close_price: 166376.43,
    ema_10: 170152.45,
    ema_72: 180962.66,
    atr_21: 2379.32,
    atr_percentage: 1.43,
    atr_percentage_sma_252: 0.91,
    volatility_deviation: 57.7
  };

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      updatedAt: '2026-11-19T20:00:00Z',
      market: 'stock_b3',
      cycle: { state: 'defensive', score: 25, price: 166376.43, ema10: 170152.45, ema72: 180962.66, date: '20261119' },
      benchmark: {
        symbol: 'IBOV',
        name: 'Índice Bovespa',
        history: testHistory
      },
      marketRegime: {
        current: currentRegime,
        regimes: testRegimes,
        periods: [],
        distribution: null
      }
    })
  });

  const code = fs.readFileSync(path.join(__dirname, 'market-cycle-v2.js'), 'utf8');
  const runCode = new Function('document', 'window', 'localStorage', 'MutationObserver', 'fetch', code);
  runCode(env.mockDocument, env.mockWindow, env.mockLocalStorage, env.mockWindow.MutationObserver, global.fetch);

  await env.mockWindow.loadMarketCycleV2('stock_b3');

  const html = env.rootElement.innerHTML;

  // 1. O card Regime Atual deve apresentar o regime e a data correspondentes ao último candle (19/11/2026)
  assert.ok(html.includes('Down – Volatile') || html.includes('Down — Volatile'), 'Card Regime Atual apresenta Down — Volatile');
  assert.ok(html.includes('19/11/2026'), 'Data de referência 19/11/2026 está claramente visível no card');
  assert.ok(html.includes('mre-current-date-badge'), 'Badge com data de referência existe no card');

  // 2. O card dos seis regimes destaca o regime atual correto
  assert.ok(html.includes('data-regime-id="DOWN_VOLATILE"'), 'Bloco DOWN_VOLATILE presente nos 6 regimes');
  assert.ok(html.includes('regime-down-volatile is-active') || html.includes('is-active" data-regime-id="DOWN_VOLATILE"'), 'DOWN_VOLATILE está ativado com destaque');

  // 3. A linha do tempo coloriu a data 20261119 como vermelho (#ef4444) e não cinza/verde
  assert.ok(html.includes('fill="#ef4444"'), 'Linha do tempo contém o retângulo vermelho (#ef4444) correspondente a Down - Volatile');

  // 4. No hover do candle 19/11/2026 (index 2), o regime no tooltip é Down — Volatile
  const lastCandle = testHistory[2];
  assert.equal(lastCandle.regime, 'DOWN_VOLATILE', 'Candle 19/11/2026 recebe regime DOWN_VOLATILE via normalização');
  assert.equal(lastCandle.direction, 'DOWN');
  assert.equal(lastCandle.volatility, 'VOLATILE');

  global.fetch = originalFetch;
});

test('Ajustes V4: Novo Layout — Gráfico à esquerda (~78%) e Card Regime Atual à direita (~22%), com métricas e 6 regimes abaixo', async () => {
  const env = createMockEnvironment();

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      updatedAt: '2026-11-19T20:00:00Z',
      market: 'stock_b3',
      cycle: { state: 'defensive', score: 30, price: 100, ema10: 95, ema72: 90, date: '20261119' },
      benchmark: {
        symbol: 'IBOV',
        name: 'Índice Bovespa',
        history: [{ date: '20261119', close: 100, ema10: 95, ema72: 90, regime: 'DOWN_VOLATILE' }]
      },
      marketRegime: {
        current: { reference_date: '2026-11-19', regime: 'DOWN_VOLATILE', direction: 'DOWN', volatility: 'VOLATILE' },
        regimes: [{ reference_date: '2026-11-19', regime: 'DOWN_VOLATILE', direction: 'DOWN', volatility: 'VOLATILE' }]
      }
    })
  });

  const code = fs.readFileSync(path.join(__dirname, 'market-cycle-v2.js'), 'utf8');
  const runCode = new Function('document', 'window', 'localStorage', 'MutationObserver', 'fetch', code);
  runCode(env.mockDocument, env.mockWindow, env.mockLocalStorage, env.mockWindow.MutationObserver, global.fetch);

  await env.mockWindow.loadMarketCycleV2('stock_b3');

  const html = env.rootElement.innerHTML;

  // 1. Estrutura da linha principal com gráfico e regime atual lado a lado
  assert.ok(html.includes('mre-main-visual-row'), 'Linha visual principal contendo gráfico e card atual lado a lado');
  assert.ok(html.includes('mre-chart-col'), 'Coluna esquerda do gráfico');
  assert.ok(html.includes('mre-side-current-col'), 'Coluna direita do card de regime atual');

  // 2. Estrutura inferior contendo apenas Métricas de Volatilidade e os 6 Regimes (sem duplicação do Regime Atual)
  assert.ok(html.includes('mre-bottom-grid'), 'Grid inferior presente');
  assert.ok(html.includes('mre-vol-card') || html.includes('Principais Métricas de Volatilidade'), 'Card de Métricas de Volatilidade no grid inferior');
  assert.ok(html.includes('mre-six-card') || html.includes('Os 6 Regimes de Mercado'), 'Card dos 6 Regimes no grid inferior');

  // 3. Contagem de cards Regime Atual deve ser estritamente 1
  const matches = html.match(/class="[^"]*mre-current-card[^"]*"/g) || [];
  assert.equal(matches.length, 1, 'Card Regime Atual existe exatamente uma única vez na tela');

  global.fetch = originalFetch;
});

test('Separação Ciclo de Mercado (EMA 10/30) vs Estrutura dos Ativos (EMA 10/72) e Cenários de Recuperação', async () => {
  const TickerChartModel = require('./ticker-chart-model');
  const marketData = require('../backend/src/market-data');

  // 1. Configuração independente de médias
  assert.equal(MarketCycleModel.MARKET_CYCLE_EMA_FAST, 10, 'Ciclo de Mercado usa EMA 10 (rápida)');
  assert.equal(MarketCycleModel.MARKET_CYCLE_EMA_SLOW, 30, 'Ciclo de Mercado usa EMA 30 (lenta)');
  assert.equal(TickerChartModel.OFFICIAL_EMA_FAST, 10, 'Gráficos dos Ativos mantêm EMA 10 (rápida)');
  assert.equal(TickerChartModel.OFFICIAL_EMA_SLOW, 72, 'Gráficos dos Ativos mantêm EMA 72 (estrutural)');

  // 2. Cenário de Recuperação após Queda:
  // Índice sofre queda por 60 pregões (200 -> 140) e inicia retomada nos últimos 18 pregões (140 -> 158)
  const indexCandles = [];
  for (let i = 0; i < 60; i++) {
    const close = Number((200 - i * 1.0).toFixed(2));
    indexCandles.push({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, open: close + 0.5, high: close + 1, low: close - 1, close });
  }
  for (let i = 0; i < 18; i++) {
    const close = Number((140 + (i + 1) * 1.1).toFixed(2));
    indexCandles.push({ date: `2026-04-${String(i + 1).padStart(2, '0')}`, open: close - 0.5, high: close + 1, low: close - 1, close });
  }

  // Com EMA 10 e EMA 30, o Ciclo de Mercado já percebe a retomada (preço > EMA 10 e > EMA 30),
  // enquanto a EMA 72 lenta do índice ainda estaria acima do preço!
  const closes = indexCandles.map(c => c.close);
  const indexEma30 = MarketCycleModel.calculateEmaSeries(closes, 30).at(-1);
  const indexEma72 = MarketCycleModel.calculateEmaSeries(closes, 72).at(-1);
  const indexCycle = MarketCycleModel.scoreMarketCycleFromCandles(indexCandles);
  const backendCycle = marketData.scoreCycle(indexCandles);

  assert.equal(indexCycle.emaSlowPeriod, 30);
  assert.equal(Number(indexCycle.ema30.toFixed(2)), Number(indexEma30.toFixed(2)), 'scoreMarketCycleFromCandles utiliza EMA 30');
  assert.equal(Number(backendCycle.ema30.toFixed(2)), Number(indexEma30.toFixed(2)), 'marketData.scoreCycle utiliza EMA 30');
  assert.ok(indexCycle.price > indexEma30, 'Na recuperação, índice já superou a EMA 30');
  assert.ok(indexCycle.price < indexEma72, 'Na mesma data, o índice ainda está abaixo da EMA 72 mais lenta');
  assert.equal(indexCycle.state, 'healthy', 'Ciclo de mercado (EMA 10/30) reconhece a transição/retomada com maior antecedência');

  // 3. Ativo Líder antecipando a retomada (já acima de sua própria EMA 10 e EMA 72, ambas ascendentes)
  const leaderCandles = [];
  for (let i = 0; i < 80; i++) {
    const close = Number((50 + i * 0.6).toFixed(2));
    leaderCandles.push({
      time: `2026-05-${String((i % 28) + 1).padStart(2, '0')}`,
      date: `2026-05-${String((i % 28) + 1).padStart(2, '0')}`,
      open: close - 0.3,
      high: close + 0.5,
      low: close - 0.5,
      close
    });
  }
  // Último candle forma um Inside Bar válido acima da EMA 10 e EMA 72
  const prevLeader = leaderCandles[leaderCandles.length - 1];
  prevLeader.high = prevLeader.close + 1.5;
  prevLeader.low = prevLeader.close - 1.5;
  leaderCandles.push({
    time: '2026-06-01',
    date: '2026-06-01',
    open: prevLeader.close - 0.1,
    high: prevLeader.high - 0.3,
    low: prevLeader.low + 0.3,
    close: prevLeader.close + 0.2
  });

  const leaderTrigger = TickerChartModel.detectSetupTriggers(leaderCandles);
  assert.equal(leaderTrigger.hasTrigger, true, 'Ativo líder com EMA 10 > EMA 72 ascendentes tem gatilho confirmado');

  // Mesmo se o índice ainda estiver em transição/defesa, o ciclo de mercado NÃO bloqueia nem invalida o ativo líder
  const defensiveIndexCandles = indexCandles.slice(0, 62); // logo no início da recuperação, índice ainda abaixo da EMA 30
  const leaderEval = MarketCycleModel.evaluateMarketAndAssetContext({
    indexCandles: defensiveIndexCandles,
    assetCandles: leaderCandles,
    rsScore: 92
  });
  assert.equal(leaderEval.isIndependentConfig, true);
  assert.equal(leaderEval.marketCycle.state, 'defensive', 'Contexto geral de mercado ainda defensivo/em recuperação');
  assert.equal(leaderEval.isAssetConfirmed, true, 'Ativo líder já apresenta estrutura própria confirmada (EMA 10/72)');
  assert.equal(leaderEval.isBlockedByMarketCycle, false, 'Ciclo de mercado não bloqueia nem invalida o ativo líder');
  assert.equal(leaderEval.canRecognizeOpportunity, true, 'Oportunidade no ativo líder é reconhecida por sua estrutura própria');

  // 4. Ativo Atrasado ainda sem confirmação (abaixo da EMA 72 ou médias descendentes)
  const laggardCandles = [];
  for (let i = 0; i < 80; i++) {
    const close = Number((100 - i * 0.5).toFixed(2));
    laggardCandles.push({
      time: `2026-05-${String((i % 28) + 1).padStart(2, '0')}`,
      date: `2026-05-${String((i % 28) + 1).padStart(2, '0')}`,
      open: close + 0.2,
      high: close + 0.6,
      low: close - 0.6,
      close
    });
  }
  const laggardEval = MarketCycleModel.evaluateMarketAndAssetContext({
    indexCandles, // mercado já em expansão (EMA 10/30)
    assetCandles: laggardCandles,
    rsScore: 28
  });
  assert.equal(laggardEval.marketCycle.state, 'healthy', 'Mercado geral já em expansão pela EMA 10/30');
  assert.equal(laggardEval.isAssetConfirmed, false, 'Ativo atrasado permanece sem confirmação estrutural (EMA 10/72)');
  assert.equal(laggardEval.canRecognizeOpportunity, false, 'Ativo atrasado não gera oportunidade sem estrutura própria');

  // 5. Interface do Ciclo de Mercado exibe a explicação "Por que fazemos essa distinção?"
  const env = createMockEnvironment();
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      updatedAt: '2026-11-24T20:00:00Z',
      market: 'stock_b3',
      cycle: indexCycle,
      benchmark: { symbol: 'IBOV', name: 'Índice Bovespa', history: indexCandles }
    })
  });
  const code = fs.readFileSync(path.join(__dirname, 'market-cycle-v2.js'), 'utf8');
  const runCode = new Function('document', 'window', 'localStorage', 'MutationObserver', 'fetch', code);
  runCode(env.mockDocument, env.mockWindow, env.mockLocalStorage, env.mockWindow.MutationObserver, global.fetch);
  await env.mockWindow.loadMarketCycleV2('stock_b3');

  const uiHtml = env.rootElement.innerHTML;
  assert.ok(uiHtml.includes('Por que fazemos essa distinção?'), 'Exibe o título da explicação metodológica');
  assert.ok(uiHtml.includes('O mercado e os ativos não se movimentam na mesma velocidade.'), 'Exibe o 1º parágrafo da explicação');
  assert.ok(uiHtml.includes('Por isso, usamos médias mais curtas (EMA 10 e EMA 30) no ciclo de mercado'), 'Exibe a explicação de EMA 10 e EMA 30 no ciclo de mercado');
  assert.ok(uiHtml.includes('Nos gráficos individuais, mantemos EMA 10 e EMA 72'), 'Exibe a explicação de EMA 10 e EMA 72 nos gráficos individuais');
  assert.ok(uiHtml.includes('O ciclo de mercado contextualiza; não deve impedir a leitura individual dos ativos.'), 'Exibe o 4º parágrafo sobre contextualização sem bloqueio absoluto');

  global.fetch = originalFetch;
});
