'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const StrategyModel = require('./strategy-workspace-model');
const { NavigationSystemModel, MODULES } = require('./navigation-system-model');

test('Dual Strategy Architecture: integridade estrutural no index.html e assets', () => {
  const indexPath = path.resolve(__dirname, '../index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf8');

  // 1. Inclusão dos assets css e js
  assert.ok(indexHtml.includes('frontend/strategy-workspace.css'), 'Deve incluir strategy-workspace.css');
  assert.ok(indexHtml.includes('frontend/strategy-workspace-model.js'), 'Deve incluir strategy-workspace-model.js');
  assert.ok(indexHtml.includes('frontend/strategy-workspace.js'), 'Deve incluir strategy-workspace.js');

  // 2. Elementos DOM no shell
  assert.ok(indexHtml.includes('id="strategyWorkspaceSelector"'), 'Topbar deve ter strategyWorkspaceSelector');
  assert.ok(indexHtml.includes('id="sidebarStrategyIndicator"'), 'Sidebar deve ter sidebarStrategyIndicator');
  assert.ok(indexHtml.includes('data-strategy-target="trend_following"'), 'Seletor deve ter botão Trend Following');
  assert.ok(indexHtml.includes('data-strategy-target="volatility_trading"'), 'Seletor deve ter botão Volatility Trading');
});

test('Dual Strategy Architecture: CSS de estratégia com isolamento de temas', () => {
  const cssPath = path.resolve(__dirname, 'strategy-workspace.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Classes essenciais
  assert.ok(css.includes('.strategy-workspace-selector'));
  assert.ok(css.includes('.strat-pill-btn'));
  assert.ok(css.includes('.strat-trend'));
  assert.ok(css.includes('.strat-volatility'));
  assert.ok(css.includes('.sidebar-strategy-indicator'));
  assert.ok(css.includes('.strat-badge-trend'));
  assert.ok(css.includes('.strat-badge-volatility'));

  // Suporte a temas Healthy, Gold e Pigeon Light
  assert.ok(css.includes('body:not([data-theme="healthy"]):not([data-theme="pigeon"])'));
  assert.ok(css.includes('body[data-theme="gold"]'));
  assert.ok(css.includes('body[data-theme="pigeon"]'));
});

test('Dual Strategy Architecture: Trend Following preserva 100% dos módulos do NavigationSystemModel', () => {
  const nav = new NavigationSystemModel();
  assert.equal(typeof nav.validateIntegrity, 'function');
  const integrity = nav.validateIntegrity();
  assert.equal(integrity.isValid, true, 'NavigationSystemModel deve manter 100% dos módulos válidos');
  assert.equal(MODULES.length, 46, 'Deve preservar exatamente os 46 módulos do software');
});

test('Dual Strategy Architecture: persistência, alternância e imutabilidade dos trades', () => {
  // 1. Reset para Trend Following
  StrategyModel.setActiveStrategy('trend_following', { force: true });
  assert.equal(StrategyModel.getActiveStrategy(), 'trend_following');

  // 2. Trades históricos
  const tradeA = { id: 't1', ticker: 'PETR4', strategyType: 'trend_following' };
  const tradeB = { id: 't2', ticker: 'VALE3', strategyType: 'volatility_trading' };
  const tradeLegacy = { id: 't3', ticker: 'WEGE3' }; // Legado sem tag explícita

  assert.equal(StrategyModel.getStrategyForTrade(tradeA), 'trend_following');
  assert.equal(StrategyModel.getStrategyForTrade(tradeB), 'volatility_trading');
  assert.equal(StrategyModel.getStrategyForTrade(tradeLegacy), 'trend_following');

  // 3. Alternar mundo ativo para Volatility Trading
  StrategyModel.setActiveStrategy('volatility_trading');
  assert.equal(StrategyModel.getActiveStrategy(), 'volatility_trading');

  // 4. Invariante: O trade NUNCA é reclassificado pela mudança de tela ou de mundo ativo
  assert.equal(StrategyModel.getStrategyForTrade(tradeA), 'trend_following');
  assert.equal(StrategyModel.getStrategyForTrade(tradeB), 'volatility_trading');
  assert.equal(StrategyModel.getStrategyForTrade(tradeLegacy), 'trend_following');

  // 5. Filtro de trades: isolado vs consolidado
  const allTrades = [tradeA, tradeB, tradeLegacy];
  const volFiltered = StrategyModel.filterTradesByStrategy(allTrades);
  assert.equal(volFiltered.length, 1);
  assert.equal(volFiltered[0].id, 't2');

  const consolidated = StrategyModel.filterTradesByStrategy(allTrades, null, { consolidated: true });
  assert.equal(consolidated.length, 3);

  // 6. Restaurar padrão Trend Following
  StrategyModel.setActiveStrategy('trend_following');
  assert.equal(StrategyModel.getActiveStrategy(), 'trend_following');
});
