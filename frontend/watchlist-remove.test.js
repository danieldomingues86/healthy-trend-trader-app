const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Watchlist renderiza botão de remover nos cards e na tabela e suporta remoção de ativos', async () => {
  const storage = new Map();
  const listeners = new Map();
  const dispatchedEvents = [];

  class MockElement {
    constructor(tagName, id = '') {
      this.tagName = tagName.toUpperCase();
      this.id = id;
      this.dataset = {};
      const set = new Set();
      this.classList = {
        has: (c) => set.has(c),
        contains: (c) => set.has(c),
        add: (...cs) => { for (const c of cs) set.add(c); return this.classList; },
        remove: (...cs) => { for (const c of cs) set.delete(c); return this.classList; },
        toggle: (c, val) => {
          if (val === undefined) val = !set.has(c);
          if (val) set.add(c); else set.delete(c);
          return val;
        }
      };
      this._innerHTML = '';
      this.style = {};
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

    querySelector(sel) { return null; }
    querySelectorAll(sel) { return []; }
    closest(sel) { return null; }

    dispatchEvent(ev) {
      const fns = this.eventListeners.get(ev.type) || [];
      for (const fn of fns) fn(ev);
    }
  }

  const rootElement = new MockElement('div', 'watchlist');
  rootElement.classList.add('page', 'active');

  const origDocument = global.document;
  const origWindow = global.window;
  const origLocalStorage = global.localStorage;
  const origAddEventListener = global.addEventListener;
  const origDispatchEvent = global.dispatchEvent;
  const origCustomEvent = global.CustomEvent;
  const origFetch = global.fetch;

  global.document = {
    getElementById(id) {
      if (id === 'watchlist') return rootElement;
      return new MockElement('div', id);
    },
    querySelector(sel) { return null; },
    querySelectorAll(sel) { return []; },
    createElement(tag) { return new MockElement(tag); },
    body: new MockElement('body')
  };

  global.localStorage = {
    getItem(k) { return storage.get(k) || null; },
    setItem(k, v) { storage.set(k, String(v)); },
    removeItem(k) { storage.delete(k); },
    clear() { storage.clear(); }
  };

  global.addEventListener = (event, fn) => {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event).push(fn);
  };

  global.dispatchEvent = (ev) => {
    dispatchedEvents.push(ev);
    const fns = listeners.get(ev.type) || [];
    for (const fn of fns) fn(ev);
  };

  global.CustomEvent = class {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };

  global.window = global;
  global.confirm = () => true;

  // Pre-seed storage with 2 assets: A1MD34 and UGPA3
  const seedItems = [
    {
      ticker: 'A1MD34',
      name: 'A1MD34 BDR',
      sector: 'Outros',
      origin: 'relative-strength',
      status: 'observando',
      thesis: 'Observando setup',
      snapshot: { price: 25.0, rsScore: 85, distance52wPct: -5.0, atrPct: 2.2, emergingScore: 80 },
      created_at: new Date().toISOString()
    },
    {
      ticker: 'UGPA3',
      name: 'ULTRAPAR',
      sector: 'Petróleo e Gás',
      origin: 'fundamentalista',
      status: 'observando',
      thesis: 'Qualidade nos fundamentos',
      snapshot: { price: 38.43, rsScore: 85, distance52wPct: -5.0, atrPct: 2.2, emergingScore: 80 },
      created_at: new Date().toISOString()
    }
  ];
  storage.set('healthy-trend-watchlist-v2', JSON.stringify(seedItems));

  global.fetch = async () => ({ ok: true, json: async () => ({ items: [] }) });

  try {
    // Load and execute frontend/watchlist-model.js
    require('./watchlist-model');

    // Load and execute frontend/watchlist-page.js
    const pageCode = fs.readFileSync(path.join(__dirname, 'watchlist-page.js'), 'utf8');
    const runPage = new Function('document', 'window', 'localStorage', 'CustomEvent', 'fetch', pageCode);
    runPage(global.document, global.window, global.localStorage, global.CustomEvent, global.fetch);

    // Load opportunities from storage and render
    await global.loadWatchlistOpportunities();
    await global.renderWatchlistPage();

    const renderedHtml = rootElement.innerHTML;

    // 1. Verifica se ambos os ativos foram renderizados
    assert.ok(renderedHtml.includes('A1MD34'), 'Deve renderizar A1MD34');
    assert.ok(renderedHtml.includes('UGPA3'), 'Deve renderizar UGPA3');

    // 2. Verifica se o botão de remover foi renderizado para ambos
    assert.ok(renderedHtml.includes('data-action="remove" data-ticker="A1MD34"'), 'Card A1MD34 deve conter botão de remover');
    assert.ok(renderedHtml.includes('data-action="remove" data-ticker="UGPA3"'), 'Card UGPA3 deve conter botão de remover');
    assert.ok(renderedHtml.includes('wl-btn-remove'), 'Deve conter classe CSS wl-btn-remove');
    assert.ok(renderedHtml.includes('Remover'), 'Deve exibir o texto Remover no botão');

    // 3. Verifica se a função de remoção foi exportada no window/root
    assert.equal(typeof global.removeFromWatchlist, 'function', 'removeFromWatchlist deve ser exportada');

    // 4. Executa a remoção do ativo A1MD34
    await global.removeFromWatchlist('A1MD34');

    // 5. Após remoção, o storage deve conter apenas UGPA3
    const updatedStorage = JSON.parse(storage.get('healthy-trend-watchlist-v2') || '[]');
    assert.equal(updatedStorage.length, 1, 'Storage deve ter apenas 1 ativo restante');
    assert.equal(updatedStorage[0].ticker, 'UGPA3', 'Ativo restante deve ser UGPA3');

    // 6. O HTML re-renderizado deve conter UGPA3 e não mais A1MD34
    const newHtml = rootElement.innerHTML;
    assert.ok(!newHtml.includes('data-ticker="A1MD34"'), 'A1MD34 não deve mais estar na tela');
    assert.ok(newHtml.includes('data-ticker="UGPA3"'), 'UGPA3 deve permanecer na tela');

    // 7. Evento healthyTrend:watchlist-changed deve ter sido disparado
    const changeEvent = dispatchedEvents.find(e => e.type === 'healthyTrend:watchlist-changed');
    assert.ok(changeEvent, 'Evento healthyTrend:watchlist-changed deve ser emitido após remoção');
    assert.equal(changeEvent.detail.items.length, 1);
    assert.equal(changeEvent.detail.items[0].ticker, 'UGPA3');
  } finally {
    global.document = origDocument;
    global.window = origWindow;
    global.localStorage = origLocalStorage;
    global.addEventListener = origAddEventListener;
    global.dispatchEvent = origDispatchEvent;
    global.CustomEvent = origCustomEvent;
    global.fetch = origFetch;
  }
});
