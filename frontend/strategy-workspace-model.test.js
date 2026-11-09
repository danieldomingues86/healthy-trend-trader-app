'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('./strategy-workspace-model');

test('StrategyWorkspaceModel: enums canônicos e configurações padrão', () => {
  assert.equal(Model.STRATEGIES.TREND_FOLLOWING, 'trend_following');
  assert.equal(Model.STRATEGIES.VOLATILITY_TRADING, 'volatility_trading');

  const trendCfg = Model.getStrategyConfig('trend_following');
  assert.equal(trendCfg.label, 'Trend Following');
  assert.equal(trendCfg.shortLabel, 'Tendência');
  assert.equal(trendCfg.icon, '📈');

  const volCfg = Model.getStrategyConfig('volatility_trading');
  assert.equal(volCfg.label, 'Volatility Trading');
  assert.equal(volCfg.shortLabel, 'Volatilidade');
  assert.equal(volCfg.icon, '⚡');

  const all = Model.getAllStrategies();
  assert.equal(all.length, 2);
  assert.ok(all.some(s => s.id === 'trend_following'));
  assert.ok(all.some(s => s.id === 'volatility_trading'));
});

test('StrategyWorkspaceModel: inicialização e alternância de mundos com persistência', () => {
  // Garantir estado inicial
  Model.setActiveStrategy('trend_following', { force: true });
  assert.equal(Model.getActiveStrategy(), 'trend_following');

  // Alternar para Volatility Trading
  const switched = Model.setActiveStrategy('volatility_trading');
  assert.equal(switched, true);
  assert.equal(Model.getActiveStrategy(), 'volatility_trading');

  // Alternar novamente via toggle
  Model.toggleStrategy();
  assert.equal(Model.getActiveStrategy(), 'trend_following');

  // Rejeição de estratégia inválida (preserva a atual)
  const invalidSwitch = Model.setActiveStrategy('crypto_scalping');
  assert.equal(invalidSwitch, false);
  assert.equal(Model.getActiveStrategy(), 'trend_following');
});

test('StrategyWorkspaceModel: emissão do evento global healthyTrend:strategyChanged', () => {
  let eventDispatched = null;

  // Mock de window e CustomEvent
  global.window = global.window || {};
  global.CustomEvent = class CustomEvent {
    constructor(name, options) {
      this.name = name;
      this.detail = options ? options.detail : null;
    }
  };
  global.window.dispatchEvent = (evt) => {
    eventDispatched = evt;
  };

  Model.setActiveStrategy('volatility_trading');
  assert.ok(eventDispatched);
  assert.equal(eventDispatched.name, 'healthyTrend:strategyChanged');
  assert.equal(eventDispatched.detail.strategy, 'volatility_trading');
  assert.equal(eventDispatched.detail.previousStrategy, 'trend_following');
  assert.equal(eventDispatched.detail.config.shortLabel, 'Volatilidade');

  // Restaurar para trend_following
  Model.setActiveStrategy('trend_following');
});

test('StrategyWorkspaceModel: imutabilidade do strategyType dos trades históricos', () => {
  const trendTrade = {
    id: 'tr-1',
    ticker: 'PETR4',
    strategyType: 'trend_following'
  };

  const volTrade = {
    id: 'tr-2',
    ticker: 'VALE3',
    strategyType: 'volatility_trading'
  };

  const legacyTrade = {
    id: 'tr-3',
    ticker: 'WEGE3'
    // sem campo explícito
  };

  const metaVolTrade = {
    id: 'tr-4',
    ticker: 'BBAS3',
    metadata: { strategyType: 'volatility_trading' }
  };

  // No mundo Trend Following:
  Model.setActiveStrategy('trend_following');
  assert.equal(Model.getStrategyForTrade(trendTrade), 'trend_following');
  assert.equal(Model.getStrategyForTrade(volTrade), 'volatility_trading');
  assert.equal(Model.getStrategyForTrade(legacyTrade), 'trend_following');
  assert.equal(Model.getStrategyForTrade(metaVolTrade), 'volatility_trading');

  // Trocar o mundo ativo para Volatility Trading:
  Model.setActiveStrategy('volatility_trading');
  // REGRA DE OURO: A classificação dos trades NUNCA muda!
  assert.equal(Model.getStrategyForTrade(trendTrade), 'trend_following');
  assert.equal(Model.getStrategyForTrade(volTrade), 'volatility_trading');
  assert.equal(Model.getStrategyForTrade(legacyTrade), 'trend_following');
  assert.equal(Model.getStrategyForTrade(metaVolTrade), 'volatility_trading');

  // Restaurar
  Model.setActiveStrategy('trend_following');
});

test('StrategyWorkspaceModel: filtro por workspace vs visão consolidada', () => {
  const trades = [
    { id: '1', ticker: 'PETR4', strategyType: 'trend_following' },
    { id: '2', ticker: 'VALE3', strategyType: 'volatility_trading' },
    { id: '3', ticker: 'PRIO3', strategyType: 'trend_following' },
    { id: '4', ticker: 'ITUB4', strategyType: 'volatility_trading' }
  ];

  // Filtro Trend Following
  Model.setActiveStrategy('trend_following');
  const trendOnly = Model.filterTradesByStrategy(trades);
  assert.equal(trendOnly.length, 2);
  assert.deepEqual(trendOnly.map(t => t.id), ['1', '3']);

  // Filtro Volatility Trading
  Model.setActiveStrategy('volatility_trading');
  const volOnly = Model.filterTradesByStrategy(trades);
  assert.equal(volOnly.length, 2);
  assert.deepEqual(volOnly.map(t => t.id), ['2', '4']);

  // Visão consolidada (retorna todos os trades da carteira)
  const consolidated = Model.filterTradesByStrategy(trades, null, { consolidated: true });
  assert.equal(consolidated.length, 4);

  // Restaurar
  Model.setActiveStrategy('trend_following');
});

test('StrategyWorkspaceModel: módulos compartilhados e permissões', () => {
  // Patrimônio, posições e risco são compartilhados
  assert.equal(Model.isSharedModule('dashboard'), true);
  assert.equal(Model.isSharedModule('positions'), true);
  assert.equal(Model.isSharedModule('portfolioheat'), true);
  assert.equal(Model.isSharedModule('journal'), true);
  assert.equal(Model.isSharedModule('tradesimulator'), true);

  // Ambos os mundos mantêm acesso a módulos compartilhados
  assert.equal(Model.isModuleAvailable('dashboard', 'trend_following'), true);
  assert.equal(Model.isModuleAvailable('dashboard', 'volatility_trading'), true);
  assert.equal(Model.isModuleAvailable('tradesimulator', 'volatility_trading'), true);
});
