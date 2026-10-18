const test = require('node:test');
const assert = require('node:assert/strict');

test('BrowserHistoryNavigation: ciclo completo de navegação Voltar e Avançar', () => {
  // Setup browser mock environment
  const historyStack = [];
  let historyIndex = -1;
  const eventListeners = {};

  const fakeHistory = {
    pushState(state, title, url) {
      // Discard future history if we were in the middle of stack
      if (historyIndex < historyStack.length - 1) {
        historyStack.splice(historyIndex + 1);
      }
      historyStack.push({ state, url });
      historyIndex = historyStack.length - 1;
      fakeLocation.hash = url;
    },
    replaceState(state, title, url) {
      if (historyIndex >= 0 && historyIndex < historyStack.length) {
        historyStack[historyIndex] = { state, url };
      } else {
        historyStack.push({ state, url });
        historyIndex = 0;
      }
      fakeLocation.hash = url;
    }
  };

  const fakeLocation = {
    hash: ''
  };

  const goCalls = [];
  const openPositionCalls = [];

  const fakeWindow = {
    history: fakeHistory,
    location: fakeLocation,
    addEventListener(name, handler) {
      eventListeners[name] = eventListeners[name] || [];
      eventListeners[name].push(handler);
    },
    go(id, ...args) {
      goCalls.push({ id, args });
    },
    openPosition(id) {
      openPositionCalls.push(id);
      fakeWindow.go('positiondetail');
    },
    operationalState: {
      positions: [{ id: 'pos-1', asset: 'PETR4' }]
    }
  };

  // Attach globals for loading modules
  global.window = fakeWindow;
  global.document = { readyState: 'complete' };

  // Clear module cache
  delete require.cache[require.resolve('./browser-history-navigation-model.js')];
  delete require.cache[require.resolve('./browser-history-navigation.js')];

  const Model = require('./browser-history-navigation-model.js');
  fakeWindow.BrowserHistoryNavigationModel = Model;

  const Nav = require('./browser-history-navigation.js');
  Nav._resetForTesting();
  Nav.init();

  // 1. Initial State verification
  assert.equal(historyStack.length, 1);
  assert.equal(historyStack[0].url, '#today');
  assert.deepEqual(historyStack[0].state, { pageId: 'today', extra: null });

  // 2. User navigates: Meu Desktop -> Watchlist -> Gestão da Posição
  fakeWindow.go('watchlist');
  assert.equal(historyStack.length, 2);
  assert.equal(historyStack[1].url, '#watchlist');
  assert.deepEqual(historyStack[1].state, { pageId: 'watchlist', extra: null });

  fakeWindow.openPosition('pos-1');
  assert.equal(historyStack.length, 3);
  assert.equal(historyStack[2].url, '#positiondetail:pos-1');
  assert.deepEqual(historyStack[2].state, { pageId: 'positiondetail', extra: 'pos-1' });

  // 3. Prevent duplicate entry when clicking current screen again
  fakeWindow.go('positiondetail');
  assert.equal(historyStack.length, 3, 'Não deve adicionar entrada duplicada para a mesma tela');

  // 4. User clicks Browser BACK button: Gestão da Posição -> Watchlist
  historyIndex = 1;
  const backToWatchlistEvent = { state: historyStack[historyIndex].state };
  fakeLocation.hash = historyStack[historyIndex].url;
  
  goCalls.length = 0;
  openPositionCalls.length = 0;
  eventListeners.popstate.forEach(handler => handler(backToWatchlistEvent));

  assert.equal(goCalls.length, 1);
  assert.equal(goCalls[0].id, 'watchlist');
  assert.equal(historyStack.length, 3, 'Histórico não deve ter novas entradas durante o popstate');

  // 5. User clicks Browser BACK button again: Watchlist -> Meu Desktop
  historyIndex = 0;
  const backToDesktopEvent = { state: historyStack[historyIndex].state };
  fakeLocation.hash = historyStack[historyIndex].url;

  goCalls.length = 0;
  eventListeners.popstate.forEach(handler => handler(backToDesktopEvent));

  assert.equal(goCalls.length, 1);
  assert.equal(goCalls[0].id, 'today');

  // 6. User clicks Browser FORWARD button: Meu Desktop -> Watchlist
  historyIndex = 1;
  const forwardToWatchlistEvent = { state: historyStack[historyIndex].state };
  fakeLocation.hash = historyStack[historyIndex].url;

  goCalls.length = 0;
  eventListeners.popstate.forEach(handler => handler(forwardToWatchlistEvent));

  assert.equal(goCalls.length, 1);
  assert.equal(goCalls[0].id, 'watchlist');

  // 7. User clicks Browser FORWARD button: Watchlist -> Gestão da Posição
  historyIndex = 2;
  const forwardToPositionDetailEvent = { state: historyStack[historyIndex].state };
  fakeLocation.hash = historyStack[historyIndex].url;

  goCalls.length = 0;
  openPositionCalls.length = 0;
  eventListeners.popstate.forEach(handler => handler(forwardToPositionDetailEvent));

  assert.equal(openPositionCalls.length, 1);
  assert.equal(openPositionCalls[0], 'pos-1', 'Deve restaurar a posição correta em Gestão da Posição');

  // 8. Future branch test: If user navigates Back to Watchlist, then opens 'charts:PETR4', future branch is replaced
  historyIndex = 1;
  fakeLocation.hash = historyStack[historyIndex].url;
  eventListeners.popstate.forEach(handler => handler({ state: historyStack[historyIndex].state }));

  fakeWindow.go('charts', 'PETR4');
  assert.equal(historyStack.length, 3);
  assert.equal(historyStack[2].url, '#charts:PETR4');
  assert.deepEqual(historyStack[2].state, { pageId: 'charts', extra: 'PETR4' });

  // Cleanup globals
  delete global.window;
  delete global.document;
});

test('BrowserHistoryNavigation: Cold start com URL contendo hash direto', () => {
  const historyStack = [];
  const fakeHistory = {
    replaceState(state, title, url) {
      historyStack.push({ state, url });
    },
    pushState(state, title, url) {
      historyStack.push({ state, url });
    }
  };

  const goCalls = [];
  const fakeWindow = {
    history: fakeHistory,
    location: { hash: '#watchlist' },
    addEventListener() {},
    go(id, ...args) {
      goCalls.push({ id, args });
    }
  };

  global.window = fakeWindow;
  global.document = { readyState: 'complete' };

  delete require.cache[require.resolve('./browser-history-navigation-model.js')];
  delete require.cache[require.resolve('./browser-history-navigation.js')];

  const Model = require('./browser-history-navigation-model.js');
  fakeWindow.BrowserHistoryNavigationModel = Model;

  // Requiring the module auto-initializes when document.readyState !== 'loading'
  require('./browser-history-navigation.js');

  assert.equal(historyStack.length, 1);
  assert.equal(historyStack[0].url, '#watchlist');
  assert.deepEqual(historyStack[0].state, { pageId: 'watchlist', extra: null });
  assert.equal(goCalls.length, 1);
  assert.equal(goCalls[0].id, 'watchlist');

  delete global.window;
  delete global.document;
});

test('BrowserHistoryNavigation: Navegação por múltiplas subseções e aliases sem efeitos colaterais', () => {
  const historyStack = [];
  let historyIndex = -1;
  const eventListeners = {};

  const fakeHistory = {
    pushState(state, title, url) {
      if (historyIndex < historyStack.length - 1) {
        historyStack.splice(historyIndex + 1);
      }
      historyStack.push({ state, url });
      historyIndex = historyStack.length - 1;
      fakeLocation.hash = url;
    },
    replaceState(state, title, url) {
      if (historyIndex >= 0 && historyIndex < historyStack.length) {
        historyStack[historyIndex] = { state, url };
      } else {
        historyStack.push({ state, url });
        historyIndex = 0;
      }
      fakeLocation.hash = url;
    }
  };

  const fakeLocation = { hash: '' };
  const goCalls = [];
  let sideEffectExecutionCount = 0;

  const fakeWindow = {
    history: fakeHistory,
    location: fakeLocation,
    addEventListener(name, handler) {
      eventListeners[name] = eventListeners[name] || [];
      eventListeners[name].push(handler);
    },
    go(id, ...args) {
      goCalls.push({ id, args });
    },
    // Mock financial execution function - MUST NEVER be called during navigation
    executeTradeOrder() {
      sideEffectExecutionCount++;
    }
  };

  global.window = fakeWindow;
  global.document = { readyState: 'complete' };

  delete require.cache[require.resolve('./browser-history-navigation-model.js')];
  delete require.cache[require.resolve('./browser-history-navigation.js')];

  const Model = require('./browser-history-navigation-model.js');
  fakeWindow.BrowserHistoryNavigationModel = Model;

  require('./browser-history-navigation.js');

  // Navigate: today -> opportunityradar -> relativestrength (using alias emergingleaders) -> marketcentral -> charts:VALE3
  fakeWindow.go('opportunityradar');
  fakeWindow.go('emergingleaders'); // legacy alias for relativestrength
  fakeWindow.go('marketcentral');
  fakeWindow.go('charts', 'VALE3');

  assert.equal(historyStack.length, 5);
  assert.equal(historyStack[1].url, '#opportunityradar');
  assert.equal(historyStack[2].url, '#relativestrength');
  assert.equal(historyStack[3].url, '#marketcentral');
  assert.equal(historyStack[4].url, '#charts:VALE3');

  // Verify navigating back through all screens
  const pop = (idx) => {
    historyIndex = idx;
    fakeLocation.hash = historyStack[idx].url;
    goCalls.length = 0;
    eventListeners.popstate.forEach(h => h({ state: historyStack[idx].state }));
  };

  // Back to marketcentral
  pop(3);
  assert.equal(goCalls[0].id, 'marketcentral');

  // Back to relativestrength
  pop(2);
  assert.equal(goCalls[0].id, 'relativestrength');

  // Back to opportunityradar
  pop(1);
  assert.equal(goCalls[0].id, 'opportunityradar');

  // Back to today
  pop(0);
  assert.equal(goCalls[0].id, 'today');

  // Forward to opportunityradar
  pop(1);
  assert.equal(goCalls[0].id, 'opportunityradar');

  // Forward to charts:VALE3
  pop(4);
  assert.equal(goCalls[0].id, 'charts');
  assert.equal(goCalls[0].args[0], 'VALE3');

  // Verify that financial side effect was never called
  assert.equal(sideEffectExecutionCount, 0, 'Voltar/Avançar não deve disparar operações financeiras ou efeitos colaterais');

  delete global.window;
  delete global.document;
});

