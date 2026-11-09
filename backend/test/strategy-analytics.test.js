const test = require('node:test');
const assert = require('node:assert/strict');

const StrategyAnalyticsModel = require('../../frontend/strategy-analytics-model');
const strategyAnalyticsService = require('../src/strategy-analytics');

// Fixtures para testes
function makeMockTrendTrade(id, overrides = {}) {
  return {
    id: `tf-${id}`,
    ticker: 'PETR4',
    market: 'B3',
    sector: 'Petróleo',
    direction: 'long',
    strategy_type: 'TREND_FOLLOWING',
    status: 'closed',
    entry_price: 30.00,
    stop_loss: 28.00,
    exit_price: 34.00, // +4.00 lucro (+2R)
    executed_quantity: 100,
    entry_date: '2026-03-01',
    exit_date: '2026-03-10',
    holding_sessions: 7,
    entry_setup: 'Inside Bar',
    setup_trigger: 'INSIDE_BAR',
    rubric_grade: 'A',
    rubric_score: 92,
    market_cycle: 'Saudável',
    relative_strength: 'Bom',
    costs: 10,
    ...overrides
  };
}

function makeMockVolTrade(id, overrides = {}) {
  return {
    id: `vol-${id}`,
    ticker: 'VALE3',
    market: 'B3',
    sector: 'Mineração',
    direction: 'long',
    strategy_type: 'VOLATILITY_TRADING',
    status: 'closed',
    entry_price: 60.00,
    exit_price: 63.00, // +3.00 lucro (+5%)
    executed_quantity: 100,
    entry_date: '2026-03-05',
    exit_date: '2026-03-08',
    holding_sessions: 3,
    entry_setup: 'VOLATILITY_SWING_IFR2',
    exit_reason: 'TARGET_MA_RECOVERY',
    ifr: 7.5,
    dist_sma7_pct: -4.5,
    dist_sma200_pct: 8.2,
    atr_pct: 2.1,
    costs: 10,
    ...overrides
  };
}

test('PASSO 8 — Normalização de Trade e Isolamento de Estratégias', () => {
  const tfRaw = makeMockTrendTrade(1);
  const tf = StrategyAnalyticsModel.analyzeTrade(tfRaw);

  assert.equal(tf.strategyType, 'TREND_FOLLOWING');
  assert.equal(tf.symbol, 'PETR4');
  assert.equal(tf.initialRisk, 200); // |30 - 28| * 100
  assert.equal(tf.grossResult, 400); // (34 - 30) * 100
  assert.equal(tf.netResult, 390); // 400 - 10
  assert.equal(tf.r, 1.95); // 390 / 200
  assert.equal(tf.setupTrigger, 'INSIDE_BAR');
  assert.equal(tf.grade, 'A');

  const volRaw = makeMockVolTrade(1);
  const vol = StrategyAnalyticsModel.analyzeTrade(volRaw);

  assert.equal(vol.strategyType, 'VOLATILITY_TRADING');
  assert.equal(vol.symbol, 'VALE3');
  assert.equal(vol.r, null, 'R-múltiplo DEVE ser null para Volatility Trading (sem stop inicial fixo)');
  assert.equal(vol.grossResult, 300); // (63 - 60) * 100
  assert.equal(vol.netResult, 290); // 300 - 10
  assert.equal(vol.returnPct, 4.83); // 290 / 6000 * 100
  assert.equal(vol.exitReason, 'TARGET_MA_RECOVERY');
  assert.equal(vol.ifr, 7.5);
});

test('PASSO 8 — Analytics de Trend Following: Métricas completas em R e financeiras', () => {
  const trades = [
    makeMockTrendTrade(1, { exit_price: 34.00, entry_date: '2026-01-05', exit_date: '2026-01-12' }), // Gain (+2R)
    makeMockTrendTrade(2, { exit_price: 36.00, entry_date: '2026-01-15', exit_date: '2026-01-22' }), // Gain (+3R)
    makeMockTrendTrade(3, { exit_price: 28.00, entry_date: '2026-02-02', exit_date: '2026-02-05' }), // Loss (-1R)
    makeMockTrendTrade(4, { exit_price: 28.00, entry_date: '2026-02-10', exit_date: '2026-02-15' })  // Loss (-1R)
  ];

  const metrics = StrategyAnalyticsModel.calculateStrategyMetrics(trades, {
    strategyType: 'TREND_FOLLOWING',
    initialCapital: 100000
  });

  assert.equal(metrics.totalTrades, 4);
  assert.equal(metrics.winningTradesCount, 2);
  assert.equal(metrics.losingTradesCount, 2);
  assert.equal(metrics.winRatePct, 50.0);
  assert.ok(metrics.profitFactor > 1.0, 'Profit Factor deve ser positivo');
  assert.ok(metrics.expectancyR > 0, 'Expectativa em R deve ser positiva');
  assert.ok(metrics.totalR > 0, 'Total R deve ser positivo');
  assert.equal(metrics.sampleSizeAlert, true, 'Amostra < 30 deve gerar alerta estatístico');
  assert.match(metrics.sampleSizeWarning, /Amostra/i);
});

test('PASSO 8 — Analytics de Volatility Trading: Métricas financeiras e percentuais sem R-multiples', () => {
  const trades = [
    makeMockVolTrade(1, { exit_price: 63.00, exit_reason: 'TARGET_MA_RECOVERY', holding_sessions: 2 }), // Gain
    makeMockVolTrade(2, { exit_price: 64.50, exit_reason: 'TARGET_MA_RECOVERY', holding_sessions: 3 }), // Gain
    makeMockVolTrade(3, { exit_price: 62.00, exit_reason: 'TARGET_MA_RECOVERY', holding_sessions: 1 }), // Gain
    makeMockVolTrade(4, { exit_price: 58.00, exit_reason: 'TIME_EXIT', holding_sessions: 7 })           // Loss (D7)
  ];

  const metrics = StrategyAnalyticsModel.calculateStrategyMetrics(trades, {
    strategyType: 'VOLATILITY_TRADING',
    initialCapital: 100000
  });

  assert.equal(metrics.totalTrades, 4);
  assert.equal(metrics.winningTradesCount, 3);
  assert.equal(metrics.losingTradesCount, 1);
  assert.equal(metrics.winRatePct, 75.0);
  assert.equal(metrics.expectancyR, null, 'Expectancy em R não deve existir em Volatilidade');
  assert.ok(metrics.expectancyPct > 0, 'Expectancy em % sobre capital alocado deve ser positiva');
  assert.ok(metrics.expectancyAmount > 0, 'Expectancy em R$ por trade deve ser positiva');
  assert.equal(metrics.medianHoldingSessions, 2.5);
  assert.equal(metrics.sampleSizeAlert, true);
});

test('PASSO 8 — Breakdowns específicos de Trend Following e Volatility Trading', () => {
  const tfTrades = [
    makeMockTrendTrade(1, { setup_trigger: 'INSIDE_BAR', rubric_grade: 'A' }),
    makeMockTrendTrade(2, { setup_trigger: 'INSIDE_BAR', rubric_grade: 'B' }),
    makeMockTrendTrade(3, { setup_trigger: 'PFR_COMPRA', rubric_grade: 'A' })
  ];
  const tfBreakdowns = StrategyAnalyticsModel.calculateTrendBreakdowns(tfTrades);
  assert.ok(Array.isArray(tfBreakdowns.bySetup));
  assert.equal(tfBreakdowns.bySetup[0].label, 'INSIDE_BAR');
  assert.equal(tfBreakdowns.bySetup[0].total, 2);

  const volTrades = [
    makeMockVolTrade(1, { ifr: 4.5, exit_reason: 'TARGET_MA_RECOVERY', dist_sma7_pct: -7.0 }),
    makeMockVolTrade(2, { ifr: 8.0, exit_reason: 'TARGET_MA_RECOVERY', dist_sma7_pct: -4.0 }),
    makeMockVolTrade(3, { ifr: 12.0, exit_reason: 'TIME_EXIT', dist_sma7_pct: -2.0 })
  ];
  const volBreakdowns = StrategyAnalyticsModel.calculateVolatilityBreakdowns(volTrades);
  assert.ok(Array.isArray(volBreakdowns.byIfrLevel));
  assert.ok(Array.isArray(volBreakdowns.byExitReason));
  assert.ok(Array.isArray(volBreakdowns.byDistSma7));

  const recoveryGroup = volBreakdowns.byExitReason.find(r => r.label === 'Recuperação SMA(7)');
  assert.ok(recoveryGroup);
  assert.equal(recoveryGroup.total, 2);
});

test('PASSO 8 — Consolidado de Carteira: Resultado financeiro, contribuição, exposição e correlação', () => {
  const allTrades = [
    makeMockTrendTrade(1, { entry_date: '2026-03-01', exit_date: '2026-03-10', exit_price: 34.00 }), // TF Net: +390
    makeMockTrendTrade(2, { entry_date: '2026-03-12', exit_date: '2026-03-20', exit_price: 33.00 }), // TF Net: +290
    makeMockVolTrade(1, { entry_date: '2026-03-02', exit_date: '2026-03-06', exit_price: 63.00 }),   // Vol Net: +290
    makeMockVolTrade(2, { entry_date: '2026-03-08', exit_date: '2026-03-15', exit_price: 62.00 })    // Vol Net: +190
  ];

  const cons = StrategyAnalyticsModel.calculateConsolidatedPortfolio(allTrades, { initialCapital: 100000 });

  assert.equal(cons.totalTradesCount, 4);
  assert.equal(cons.totalNetProfit, 390 + 290 + 290 + 190); // 1160
  assert.equal(cons.trendFollowing.totalTrades, 2);
  assert.equal(cons.volatilityTrading.totalTrades, 2);

  // Contribuição percentual
  assert.ok(cons.contribution.trendFollowing.contributionPct > 0);
  assert.ok(cons.contribution.volatilityTrading.contributionPct > 0);
  assert.equal(
    round2(cons.contribution.trendFollowing.contributionPct + cons.contribution.volatilityTrading.contributionPct),
    100.00
  );

  // Exposição simultânea
  assert.ok(cons.exposure.maxSimultaneousCapital > 0);
  assert.ok(cons.exposure.maxSimultaneousPositions >= 1);

  // Curva de patrimônio combinada
  assert.ok(Array.isArray(cons.combinedEquityCurve));
  assert.equal(cons.combinedEquityCurve.length, 5); // Início + 4 trades
  assert.equal(cons.combinedEquityCurve[cons.combinedEquityCurve.length - 1].equity, 100000 + 1160);

  // Correlação de Pearson
  assert.ok(typeof cons.correlation.pearsonCorrelation === 'number');
  assert.ok(cons.correlation.interpretation);

  // Glossário de métricas presente
  assert.ok(cons.definitions.winRate);
  assert.ok(cons.definitions.portfolioDrawdown);
  assert.ok(cons.definitions.pearsonCorrelation);
  assert.ok(cons.definitions.rMultipleCaveat);
});

test('PASSO 8 — Serviço Backend Strategy Analytics', async () => {
  const userId = 'analytics-test-user-' + Date.now();
  const tradesService = require('../src/trades');
  const origListPlans = tradesService.listPlans;

  const mockTrades = [
    {
      id: 't-1',
      strategy_type: 'TREND_FOLLOWING',
      asset: 'EQTL3',
      market: 'Ações B3',
      entry_price: 30,
      exit_price: 33,
      r_multiple: 1.5,
      net_result: 1500,
      status: 'closed',
      entry_timestamp: '2026-03-01T10:00:00Z',
      exit_timestamp: '2026-03-05T15:00:00Z'
    },
    {
      id: 'v-1',
      strategy_type: 'VOLATILITY_TRADING',
      asset: 'BBAS3',
      market: 'Ações B3',
      entry_price: 25,
      exit_price: 26,
      net_result: 800,
      status: 'closed',
      entry_timestamp: '2026-03-02T10:00:00Z',
      exit_timestamp: '2026-03-04T15:00:00Z',
      exit_reason: 'TARGET_MA_RECOVERY'
    }
  ];

  try {
    tradesService.listPlans = async (uid) => {
      assert.equal(uid, userId);
      return mockTrades;
    };

    // 1. Escopo Consolidado
    const analytics = await strategyAnalyticsService.getAnalytics({
      userId,
      strategy: 'ALL',
      initialCapital: 100000
    });

    assert.equal(analytics.scope, 'CONSOLIDATED');
    assert.ok(analytics.consolidated);
    assert.equal(analytics.consolidated.totalNetProfit, 2300);
    assert.equal(analytics.consolidated.totalTradesCount, 2);
    assert.ok(analytics.breakdowns);
    assert.ok(analytics.definitions);

    // 2. Escopo Trend Following
    const trendRes = await strategyAnalyticsService.getAnalytics({
      userId,
      strategy: 'TREND_FOLLOWING',
      initialCapital: 100000
    });
    assert.equal(trendRes.scope, 'TREND_FOLLOWING');
    assert.equal(trendRes.metrics.totalTrades, 1);
    assert.equal(trendRes.metrics.netProfit, 1500);

    // 3. Escopo Volatility Trading
    const volRes = await strategyAnalyticsService.getAnalytics({
      userId,
      strategy: 'VOLATILITY_TRADING',
      initialCapital: 100000
    });
    assert.equal(volRes.scope, 'VOLATILITY_TRADING');
    assert.equal(volRes.metrics.totalTrades, 1);
    assert.equal(volRes.metrics.netProfit, 800);
  } finally {
    tradesService.listPlans = origListPlans;
  }
});

function round2(num) {
  return Number(Math.round(num + 'e2') + 'e-2');
}
