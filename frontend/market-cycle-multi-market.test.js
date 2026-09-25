const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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

test('Ciclo de Mercado Multi-Mercado registra IBOV e BDRX e isola estados e snapshots', async () => {
  const env = createMockEnvironment();

  // Mock global fetch
  const mockFetchHistory = (symbol, price, score, state, above10 = true) => ({
    updatedAt: '2026-09-25T12:00:00Z',
    source: 'b3-indexes',
    market: symbol === 'BDRX' ? 'bdr' : 'stock_b3',
    cycle: {
      state,
      score,
      price,
      ema10: above10 ? price * 0.99 : price * 1.01,
      ema20: price * 0.98,
      ema200: price * 0.95,
      above10,
      above20: true,
      above200: true,
      ema10Above20: above10,
      atr21: 1500,
      atrPct: 1.2,
      ema10Slope: above10 ? 15.0 : -20.0,
      ema20Slope: 12.5,
      ema200Slope: 5.0,
      date: '20260924'
    },
    benchmark: {
      symbol,
      name: symbol === 'BDRX' ? 'Índice de BDRs Não Patrocinados (BDRX)' : 'Índice Bovespa (IBOV)',
      returns: { m1: 1.5, m3: 3.2 },
      history: Array.from({ length: 300 }, (_, i) => ({
        date: `2026010${(i % 28) + 1}`,
        close: price + i,
        ema10: price + i * 0.99,
        ema20: price + i * 0.98,
        ema200: price + i * 0.95,
        score,
        state
      }))
    },
    breadth: symbol === 'IBOV' ? { leader: 12, qualified: 20, watch: 8, 'below-threshold': 45 } : null
  });

  const fetchCalls = [];
  const originalFetch = global.fetch;
  let customHandler = null;
  global.fetch = async (url) => {
    fetchCalls.push(url);
    if (customHandler) return customHandler(url);
    const parsed = new URL(url);
    const market = parsed.searchParams.get('market') || 'stock_b3';
    if (market === 'bdr') {
      return {
        ok: true,
        json: async () => mockFetchHistory('BDRX', 28503.28, 95, 'healthy', true)
      };
    }
    return {
      ok: true,
      json: async () => mockFetchHistory('IBOV', 183965.91, 73, 'healthy', false)
    };
  };

  // Carrega e executa o frontend/market-cycle-v2.js no contexto simulado
  const code = fs.readFileSync(path.join(__dirname, 'market-cycle-v2.js'), 'utf8');
  const runCode = new Function('document', 'window', 'localStorage', 'MutationObserver', 'fetch', code);

  runCode(env.mockDocument, env.mockWindow, env.mockLocalStorage, env.mockWindow.MutationObserver, global.fetch);

  // Aguarda primeiro ciclo de microtasks do load inicial (stock_b3 padrão)
  await new Promise((resolve) => setTimeout(resolve, 50));

  // 1. Registro de Mercados
  assert.ok(env.mockWindow.MARKET_REGISTRY, 'MARKET_REGISTRY deve ser exportado');
  assert.equal(env.mockWindow.MARKET_REGISTRY.stock_b3.benchmarkSymbol, 'IBOV');
  assert.equal(env.mockWindow.MARKET_REGISTRY.bdr.benchmarkSymbol, 'BDRX');

  // 2. Estado padrão: Ações B3 (IBOV)
  assert.ok(env.rootElement.innerHTML.includes('Ações B3'), 'Deve renderizar Ações B3');
  assert.ok(env.rootElement.innerHTML.includes('IBOV · Diário'), 'Deve renderizar título diário do IBOV');
  assert.ok(env.rootElement.innerHTML.includes('183.966') || env.rootElement.innerHTML.includes('183.965'), 'Preço do IBOV');
  assert.ok(env.rootElement.innerHTML.includes('recuo abaixo da EMA 10'), 'Deve alertar recuo abaixo da EMA 10 para IBOV');
  assert.ok(env.rootElement.innerHTML.includes('data-market-regime="healthy"'), 'Deve conter data-market-regime="healthy"');
  assert.ok(env.rootElement.innerHTML.includes('mcv2-regime-item expansion active'), 'Segmento de Expansão deve estar ativo na régua');
  assert.ok(env.rootElement.innerHTML.includes('mcv2-hero-title-row'), 'Hero deve conter linha de título com ícone do regime');
  assert.ok(env.rootElement.innerHTML.includes('mcv2-hero-icon'), 'Hero deve conter ícone temático de regime');

  // Snapshot de Ações B3 deve ter sido persistido com score dinâmico
  const savedSnapshots1 = JSON.parse(env.storage.get('healthy-trend-market-cycle-snapshots-v1') || '{}');
  assert.ok(savedSnapshots1.stock_b3, 'Snapshot de stock_b3 deve existir');
  assert.equal(savedSnapshots1.stock_b3.benchmarkSymbol, 'IBOV');
  assert.equal(savedSnapshots1.stock_b3.score, 73);
  assert.equal(savedSnapshots1.stock_b3.indicators.above10, false);
  assert.equal(savedSnapshots1.stock_b3.classification, 'healthy');

  // 3. Alternar para BDRs (BDRX)
  await env.mockWindow.loadMarketCycleV2('bdr');

  // Renderização deve refletir BDRX e não IBOV
  assert.ok(env.rootElement.innerHTML.includes('BDRX · Diário'), 'Deve renderizar título diário do BDRX');
  assert.ok(env.rootElement.innerHTML.includes('28.503'), 'Preço do BDRX');
  assert.ok(env.rootElement.innerHTML.includes('BDRs'), 'Rótulo BDRs');
  assert.ok(env.rootElement.innerHTML.includes('EMA 10 ascendente'), 'Deve indicar EMA 10 ascendente para BDRX');
  assert.ok(!env.rootElement.innerHTML.includes('Como está a base do IBOV?'), 'Não deve exibir breadth do IBOV na tela de BDRs');
  assert.ok(env.rootElement.innerHTML.includes('data-market-regime="healthy"'), 'BDRX com estado saudável');
  assert.ok(env.rootElement.innerHTML.includes('mcv2-regime-item expansion active'), 'Segmento de Expansão ativo para BDRX');

  // Snapshot de BDRs deve ter sido persistido SEM sobrescrever ou apagar stock_b3
  const savedSnapshots2 = JSON.parse(env.storage.get('healthy-trend-market-cycle-snapshots-v1') || '{}');
  assert.ok(savedSnapshots2.stock_b3, 'Snapshot de stock_b3 deve ser preservado');
  assert.ok(savedSnapshots2.bdr, 'Snapshot de bdr deve ter sido criado');
  assert.equal(savedSnapshots2.bdr.benchmarkSymbol, 'BDRX');
  assert.equal(savedSnapshots2.bdr.score, 95);
  assert.equal(savedSnapshots2.bdr.indicators.above10, true);
  assert.equal(savedSnapshots2.bdr.classification, 'healthy');
  assert.equal(savedSnapshots2.stock_b3.score, 73, 'Score do IBOV preservado intacto em 73');
  assert.notEqual(savedSnapshots2.bdr.score, savedSnapshots2.stock_b3.score, 'BDRX e IBOV têm scores diferentes e dinâmicos');

  // 4. Alternar de volta para Ações B3
  await env.mockWindow.loadMarketCycleV2('stock_b3');
  assert.ok(env.rootElement.innerHTML.includes('IBOV · Diário'), 'Restaura IBOV');
  assert.ok(env.rootElement.innerHTML.includes('Como está a base do IBOV?'), 'Restaura breadth do IBOV');
  assert.ok(env.rootElement.innerHTML.includes('mcv2-regime-item expansion active'), 'Segmento ativo restaurado');

  // 5. Testar renderização de estado de Transição
  customHandler = async () => ({
    ok: true,
    json: async () => mockFetchHistory('IBOV', 175000, 51, 'transition', false)
  });
  await env.mockWindow.loadMarketCycleV2('stock_b3', true);
  assert.ok(env.rootElement.innerHTML.includes('data-market-regime="transition"'), 'Deve marcar data-market-regime="transition"');
  assert.ok(env.rootElement.innerHTML.includes('mcv2-regime-item transition active'), 'Segmento de Transição deve estar ativo');
  assert.ok(env.rootElement.innerHTML.includes('Mercado em transição'), 'Título Mercado em transição');

  // 6. Testar renderização de estado Defensivo
  customHandler = async () => ({
    ok: true,
    json: async () => mockFetchHistory('IBOV', 160000, 25, 'defensive', false)
  });
  await env.mockWindow.loadMarketCycleV2('stock_b3', true);
  assert.ok(env.rootElement.innerHTML.includes('data-market-regime="defensive"'), 'Deve marcar data-market-regime="defensive"');
  assert.ok(env.rootElement.innerHTML.includes('mcv2-regime-item defence active'), 'Segmento de Defesa deve estar ativo');
  assert.ok(env.rootElement.innerHTML.includes('Mercado defensivo'), 'Título Mercado defensivo');

  global.fetch = originalFetch;
});
