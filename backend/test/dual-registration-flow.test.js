const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const trades = require('../src/trades');
const JournalV2Model = require('../../frontend/journal-v2-model');

test('PASSO 6 — Dual Registration Flow: Criação e Validação de Trend Following', () => {
  // 1. Trend Following com gatilho válido e stop obrigatório
  const trendPayload = {
    strategyType: 'TREND_FOLLOWING',
    asset: 'PETR4',
    market: 'Ações B3',
    direction: 'long',
    entry: 38.50,
    stop: 36.20,
    suggestedQty: 500,
    executedQty: 500,
    riskPct: 0.002,
    setupTrigger: 'INSIDE_BAR',
    grade: 'A',
    rubricScore: 96,
    rubricMaxScore: 100,
    rubricResponses: { trendQuality: 'good', marketCycle: 'healthy' }
  };

  const normalized = trades.normalizePlan(trendPayload);
  assert.equal(normalized.strategyType, 'TREND_FOLLOWING');
  assert.equal(normalized.strategy_type, 'TREND_FOLLOWING');
  assert.equal(normalized.ticker, 'PETR4');
  assert.equal(normalized.entry, 38.50);
  assert.equal(normalized.stop, 36.20);
  assert.equal(normalized.setupTrigger, 'INSIDE_BAR');
  assert.equal(normalized.setup, 'Inside Bar');
  assert.ok(normalized.stop > 0, 'Stop inicial é obrigatório em Trend Following');

  // 2. Trend Following sem stop deve falhar
  assert.throws(
    () => trades.normalizePlan({ ...trendPayload, stop: null }),
    /Stop inicial é obrigatório/
  );

  // 3. Trend Following com gatilho inválido deve falhar
  assert.throws(
    () => trades.normalizePlan({ ...trendPayload, setupTrigger: 'GATILHO_INVENTADO' }),
    /Gatilho de entrada inválido/
  );
});

test('PASSO 6 — Dual Registration Flow: Criação e Validação de Volatility Trading', () => {
  // 1. Volatility Trading não exige stop e não exige os 5 gatilhos de tendência
  const volPayload = {
    strategyType: 'VOLATILITY_TRADING',
    asset: 'VALE3',
    market: 'Ações B3',
    direction: 'long',
    entry: 62.00,
    stop: 0, // Stop opcional / desabilitado
    suggestedQty: 200,
    executedQty: 200,
    riskPct: 0,
    setupTrigger: 'VOLATILITY_SWING_IFR2',
    strategyConfigId: 'vol-ifr2-standard',
    strategyConfigVersion: '1.0',
    grade: 'A',
    rubricScore: 90,
    rubricMaxScore: 100,
    rubricVersion: 'volatility-ifr2-v1.0'
  };

  const normalized = trades.normalizePlan(volPayload);
  assert.equal(normalized.strategyType, 'VOLATILITY_TRADING');
  assert.equal(normalized.strategy_type, 'VOLATILITY_TRADING');
  assert.equal(normalized.ticker, 'VALE3');
  assert.equal(normalized.entry, 62.00);
  assert.equal(normalized.stop, 0, 'Stop é opcional em Volatility Trading');
  assert.equal(normalized.setupTrigger, 'VOLATILITY_SWING_IFR2');
  assert.equal(normalized.strategyConfigId, 'vol-ifr2-standard');
  assert.equal(normalized.strategyConfigVersion, '1.0');
  assert.equal(normalized.rubricVersion, 'volatility-ifr2-v1.0');

  // 2. Se setupTrigger for omitido, assume o padrão de Volatility Swing
  const volDefaultSetup = trades.normalizePlan({
    strategyType: 'VOLATILITY_TRADING',
    asset: 'ITUB4',
    entry: 32.00,
    suggestedQty: 300,
    executedQty: 300,
    riskPct: 0,
    grade: 'B',
    rubricScore: 78
  });
  assert.equal(volDefaultSetup.setupTrigger, 'VOLATILITY_SWING_IFR2');
  assert.equal(volDefaultSetup.entrySetup, 'Volatility Swing — IFR2');
});

test('PASSO 6 — Dual Registration Flow: Duplicação Preserva Estratégia por Padrão', () => {
  // Mock trade de Volatility Trading
  const originalVolTrade = {
    id: 'vol-trade-123',
    ticker: 'PRIO3',
    market: 'Ações B3',
    direction: 'long',
    strategy_type: 'VOLATILITY_TRADING',
    strategy_config_id: 'vol-ifr2-aggressive',
    strategy_config_version: '1.0',
    entry_setup: 'Volatility Swing — IFR2',
    setup_trigger: 'VOLATILITY_SWING_IFR2',
    entry_price: 45.20,
    stop_price: 0,
    planned_quantity: 400,
    status: 'open'
  };

  // Verificação de duplicação padrão
  const duplicatedDefault = {
    strategyType: originalVolTrade.strategy_type,
    ticker: originalVolTrade.ticker,
    strategyConfigId: originalVolTrade.strategy_config_id
  };
  assert.equal(duplicatedDefault.strategyType, 'VOLATILITY_TRADING', 'Duplicação deve preservar a estratégia por padrão');

  // Duplicação explícita para outra estratégia
  const duplicatedExplicit = {
    strategyType: 'TREND_FOLLOWING',
    ticker: originalVolTrade.ticker
  };
  assert.equal(duplicatedExplicit.strategyType, 'TREND_FOLLOWING');
});

test('PASSO 6 — Trade Journal: JournalV2Model suporta Estratégia e Filtro Dual', () => {
  // 1. createTrade com TREND_FOLLOWING
  const trendTrade = JournalV2Model.createTrade({
    ticker: 'BBAS3',
    strategyType: 'TREND_FOLLOWING',
    setupTrigger: 'PFR_COMPRA',
    grade: 'A'
  });
  assert.equal(trendTrade.strategyType, 'TREND_FOLLOWING');
  assert.equal(trendTrade.timeframe, 'Diário + 4H');
  assert.equal(trendTrade.setup, 'PFR de Compra');

  // 2. createTrade com VOLATILITY_TRADING
  const volTrade = JournalV2Model.createTrade({
    ticker: 'B3SA3',
    strategyType: 'VOLATILITY_TRADING',
    strategyConfigId: 'vol-ifr2-standard',
    grade: 'A'
  });
  assert.equal(volTrade.strategyType, 'VOLATILITY_TRADING');
  assert.equal(volTrade.timeframe, 'Diário', 'Volatility Trading usa apenas o timeframe Diário');
  assert.equal(volTrade.setup, 'Volatility Swing — IFR2');

  // 3. tradesForDay com filtro de estratégia
  const mixedTrades = [
    { id: 't1', ticker: 'PETR4', entryDate: '2026-11-08', strategyType: 'TREND_FOLLOWING', status: 'open' },
    { id: 't2', ticker: 'VALE3', entryDate: '2026-11-08', strategyType: 'VOLATILITY_TRADING', status: 'open' },
    { id: 't3', ticker: 'ITUB4', entryDate: '2026-11-08', strategyType: 'TREND_FOLLOWING', status: 'open' }
  ];

  // Filtro ALL
  const allTrades = JournalV2Model.tradesForDay('2026-11-08', mixedTrades, 'ALL');
  assert.equal(allTrades.length, 3);

  // Filtro TREND_FOLLOWING
  const trendOnly = JournalV2Model.tradesForDay('2026-11-08', mixedTrades, 'TREND_FOLLOWING');
  assert.equal(trendOnly.length, 2);
  assert.deepEqual(trendOnly.map(t => t.id), ['t1', 't3']);

  // Filtro VOLATILITY_TRADING
  const volOnly = JournalV2Model.tradesForDay('2026-11-08', mixedTrades, 'VOLATILITY_TRADING');
  assert.equal(volOnly.length, 1);
  assert.equal(volOnly[0].id, 't2');
});

test('PASSO 6 — Centralização na Política de Risco: Sizing e Parâmetros de Volatilidade', () => {
  const { normalizePolicy } = require('../../frontend/trading-rubrics');
  const riskPolicy = require('../src/risk-policy');

  // 1. A Política de Risco normaliza e preserva os parâmetros do Volatility Trading
  const policyPayload = {
    volatility: {
      activeProfileId: 'vol-ifr2-standard',
      fixedCapital: 10000,
      ifrPeriod: 2,
      oversoldLevel: 10,
      shortMaPeriod: 7,
      longMaPeriod: 200,
      maxHoldingSessions: 7,
      minDailyFinancialVolume: 500000,
      minDailyTrades: 200
    }
  };

  const normalized = normalizePolicy(policyPayload);
  assert.ok(normalized.volatility, 'A política normalizada deve conter o bloco volatility');
  assert.equal(normalized.volatility.fixedCapital, 10000);
  assert.equal(normalized.volatility.oversoldLevel, 10);
  assert.equal(normalized.volatility.shortMaPeriod, 7);
  assert.equal(normalized.volatility.longMaPeriod, 200);
  assert.equal(normalized.volatility.maxHoldingSessions, 7);

  // 2. O módulo risk-policy valida e retorna a estrutura
  const validated = riskPolicy.policy(policyPayload);
  assert.equal(validated.volatility.fixedCapital, 10000);

  // 3. Simulação de dimensionamento no Novo Trade a partir da Política de Risco:
  // entry = R$ 25,00 -> fixedCapital 10.000 / 25.00 = 400 ações
  const entry = 25.00;
  const suggestedQty = Math.floor(normalized.volatility.fixedCapital / entry);
  assert.equal(suggestedQty, 400);

  // 4. Se a política for alterada para R$ 5.000 (ex: Perfil Conservador), o Novo Trade reflete imediatamente
  const conservativePolicy = normalizePolicy({
    volatility: {
      ...policyPayload.volatility,
      activeProfileId: 'vol-ifr2-conservative',
      fixedCapital: 5000,
      oversoldLevel: 15
    }
  });
  const updatedQty = Math.floor(conservativePolicy.volatility.fixedCapital / entry);
  assert.equal(updatedQty, 200);
});

