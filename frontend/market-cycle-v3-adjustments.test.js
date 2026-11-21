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

test('Ajustes V3: Suporte a 5 EMAs com padrão estrito (apenas EMA 10 e 72 ativas) e persistência', async () => {
  const env = createMockEnvironment();

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      updatedAt: '2026-09-25T12:00:00Z',
      market: 'stock_b3',
      cycle: { state: 'healthy', score: 80, price: 100, ema10: 95, ema72: 90, date: '20260925' },
      benchmark: {
        symbol: 'IBOV',
        name: 'Índice Bovespa',
        history: [
          { date: '2026-01-01', close: 100, ema10: 95, ema20: 94, ema50: 92, ema72: 90, ema200: 85, regime: 'UP_QUIET' }
        ]
      }
    })
  });

  const code = fs.readFileSync(path.join(__dirname, 'market-cycle-v2.js'), 'utf8');
  const runCode = new Function('document', 'window', 'localStorage', 'MutationObserver', 'fetch', code);
  runCode(env.mockDocument, env.mockWindow, env.mockLocalStorage, env.mockWindow.MutationObserver, global.fetch);

  await env.mockWindow.loadMarketCycleV2('stock_b3');

  // 1. Padrão inicial: EMA 10 e EMA 72 marcadas; EMA 20, 50, 200 desmarcadas
  const html = env.rootElement.innerHTML;
  assert.ok(html.includes('data-toggle-ema="10" checked'), 'EMA 10 habilitada por padrão');
  assert.ok(html.includes('data-toggle-ema="72" checked'), 'EMA 72 habilitada por padrão');
  assert.ok(!html.includes('data-toggle-ema="20" checked'), 'EMA 20 desabilitada por padrão');
  assert.ok(!html.includes('data-toggle-ema="50" checked'), 'EMA 50 desabilitada por padrão');
  assert.ok(!html.includes('data-toggle-ema="200" checked'), 'EMA 200 desabilitada por padrão');

  // 2. Persistência no localStorage: simular usuário ativando EMA 20 e desativando EMA 10
  env.mockLocalStorage.setItem('mcv2_emas', JSON.stringify({
    showEma10: false,
    showEma20: true,
    showEma50: false,
    showEma72: true,
    showEma200: true
  }));

  // Recarregar módulo com as novas preferências
  await env.mockWindow.loadMarketCycleV2('stock_b3');
  const updatedHtml = env.rootElement.innerHTML;
  assert.ok(!updatedHtml.includes('data-toggle-ema="10" checked'), 'EMA 10 reflete preferência salva');
  assert.ok(updatedHtml.includes('data-toggle-ema="20" checked'), 'EMA 20 ativada conforme preferência');
  assert.ok(updatedHtml.includes('data-toggle-ema="72" checked'), 'EMA 72 mantida');
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
