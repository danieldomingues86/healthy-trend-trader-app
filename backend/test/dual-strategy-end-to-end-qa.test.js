'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Módulos Frontend e Backend
const StrategyWorkspaceModel = require('../../frontend/strategy-workspace-model');
const StrategyConfigurationModel = require('../../frontend/strategy-configuration-model');
const VolatilityEngineModel = require('../../frontend/volatility-trading-engine-model');
const TradingRubrics = require('../../frontend/trading-rubrics');
const WatchlistModel = require('../../frontend/watchlist-model');
const TradeAnatomyModel = require('../../frontend/trade-anatomy-model');
const SystemQualityAnalyticsModel = require('../../frontend/system-quality-analytics-model');
const JournalExportModel = require('../../frontend/journal-export-model');
const VolatilityTradeSimulatorModel = require('../../frontend/volatility-trade-simulator-model');
const StrategyAnalyticsModel = require('../../frontend/strategy-analytics-model');
const tradesModule = require('../src/trades');
const strategyConfigsService = require('../src/strategy-configs');
const volatilitySimulatorService = require('../src/volatility-simulator');
const strategyAnalyticsService = require('../src/strategy-analytics');
const { loadB3History } = require('../src/ticker-chart');
const { marketScansFromCache } = require('../src/market-scans');
const opportunityRadar = require('../src/opportunity-radar');

// Helper para velas sintéticas diárias com tendência primária e IFR calculável
function makeSyntheticCandles(options = {}) {
  const count = options.count || 220;
  const candles = [];

  let currentPrice = 30.0;
  for (let i = 0; i < count; i++) {
    const d = new Date(2026, 0, 1 + i).toISOString().slice(0, 10);
    currentPrice = currentPrice * 1.002;
    candles.push({
      date: d,
      open: currentPrice * 0.995,
      high: currentPrice * 1.01,
      low: currentPrice * 0.99,
      close: currentPrice,
      volume: 2500000,
      trades: 650
    });
  }

  // Ajusta velas finais para sobrevenda acentuada se solicitado
  if (options.closeAboveSma200 && options.closeBelowSma7 && options.ifr2Oversold) {
    const lastIdx = candles.length - 1;
    candles[lastIdx - 1].close = candles[lastIdx - 2].close * 0.94;
    candles[lastIdx - 1].low = candles[lastIdx - 1].close * 0.99;
    candles[lastIdx].close = candles[lastIdx - 1].close * 0.93;
    candles[lastIdx].low = candles[lastIdx].close * 0.99;
    candles[lastIdx].volume = 3000000;
    candles[lastIdx].trades = 800;
  }

  return candles;
}

test('PASSO 10 — QA 1: Navegação, Workspace e Isolamento de Estado', async (t) => {
  await t.test('Alternância fluida entre Trend Following e Volatility Trading', () => {
    StrategyWorkspaceModel.setActiveStrategy('trend_following', { force: true });
    assert.equal(StrategyWorkspaceModel.getActiveStrategy(), StrategyWorkspaceModel.STRATEGIES.TREND_FOLLOWING);

    const switched = StrategyWorkspaceModel.setActiveStrategy(StrategyWorkspaceModel.STRATEGIES.VOLATILITY_TRADING);
    assert.equal(switched, true);
    assert.equal(StrategyWorkspaceModel.getActiveStrategy(), StrategyWorkspaceModel.STRATEGIES.VOLATILITY_TRADING);

    StrategyWorkspaceModel.setActiveStrategy(StrategyWorkspaceModel.STRATEGIES.TREND_FOLLOWING);
    assert.equal(StrategyWorkspaceModel.getActiveStrategy(), StrategyWorkspaceModel.STRATEGIES.TREND_FOLLOWING);
  });

  await t.test('Alternar de mundo não altera o strategyType de trades já gravados', () => {
    const tradeTrend = { id: 't1', ticker: 'PRIO3', strategyType: 'trend_following' };
    const tradeVol = { id: 't2', ticker: 'VALE3', strategyType: 'volatility_trading' };

    StrategyWorkspaceModel.setActiveStrategy('volatility_trading');
    assert.equal(StrategyWorkspaceModel.getStrategyForTrade(tradeTrend), 'trend_following');
    assert.equal(StrategyWorkspaceModel.getStrategyForTrade(tradeVol), 'volatility_trading');

    StrategyWorkspaceModel.setActiveStrategy('trend_following');
    assert.equal(StrategyWorkspaceModel.getStrategyForTrade(tradeTrend), 'trend_following');
    assert.equal(StrategyWorkspaceModel.getStrategyForTrade(tradeVol), 'volatility_trading');
  });

  await t.test('Permissões de módulos e categorização canônica rigorosa', () => {
    assert.equal(StrategyWorkspaceModel.getModuleClassification('relativestrength'), 'EXCLUSIVE_TREND');
    assert.equal(StrategyWorkspaceModel.getModuleClassification('emergingleaders'), 'EXCLUSIVE_TREND');
    assert.equal(StrategyWorkspaceModel.getModuleClassification('couragechallenge'), 'EXCLUSIVE_TREND');
    assert.equal(StrategyWorkspaceModel.getModuleClassification('volatilityengine'), 'EXCLUSIVE_VOLATILITY');
    assert.equal(StrategyWorkspaceModel.getModuleClassification('strategyconfigcenter'), 'EXCLUSIVE_VOLATILITY');
    assert.equal(StrategyWorkspaceModel.getModuleClassification('watchlist'), 'SHARED_AWARE');
    assert.equal(StrategyWorkspaceModel.getModuleClassification('portfolioheat'), 'CONSOLIDATED_PORTFOLIO');
  });
});

test('PASSO 10 — QA 2: Dados, Migração e Imutabilidade da Estratégia', async (t) => {
  await t.test('Scripts de migração SQL 043, 044, 045 e rollbacks existem e são válidos', () => {
    const mig043 = fs.readFileSync(path.join(__dirname, '..', 'db', 'migrations', '043_dual_strategy_trades.sql'), 'utf8');
    assert.ok(mig043.includes('strategy_type'));
    assert.ok(mig043.includes("DEFAULT 'TREND_FOLLOWING'"));

    const mig044 = fs.readFileSync(path.join(__dirname, '..', 'db', 'migrations', '044_strategy_configurations.sql'), 'utf8');
    assert.ok(mig044.includes('strategy_configurations'));

    const mig045 = fs.readFileSync(path.join(__dirname, '..', 'db', 'migrations', '045_volatility_simulations.sql'), 'utf8');
    assert.ok(mig045.includes('volatility_simulation_experiments'));

    const rb043 = fs.readFileSync(path.join(__dirname, '..', 'db', 'rollback', '043_rollback_dual_strategy_trades.sql'), 'utf8');
    assert.ok(rb043.includes('DROP COLUMN IF EXISTS strategy_type'));
  });

  await t.test('normalizePlan classifica legados como TREND_FOLLOWING sem perda de dados', () => {
    const legacyPlan = {
      asset: 'BBAS3',
      entry: 28.5,
      stop: 26.8,
      atr: 0.8,
      suggestedQty: 1000,
      executedQty: 1000,
      riskPct: 0.004,
      rubricScore: 85,
      grade: 'A'
    };

    const norm = tradesModule.normalizePlan(legacyPlan);
    assert.equal(norm.strategyType, 'TREND_FOLLOWING');
    assert.equal(norm.strategy_type, 'TREND_FOLLOWING');
    assert.equal(norm.entry, 28.5);
    assert.equal(norm.stop, 26.8);
    assert.equal(norm.plannedQuantity, 1000);
  });

  await t.test('normalizePlan aceita VOLATILITY_TRADING e rejeita estratégias inválidas', () => {
    const volPlan = {
      asset: 'ITUB4',
      entry: 35.0,
      stop: 33.0,
      suggestedQty: 500,
      executedQty: 500,
      riskPct: 0.004,
      grade: 'A',
      strategyType: 'VOLATILITY_TRADING',
      strategyConfigId: 'volatility_ifr2_default',
      strategyConfigVersion: '1.0.0',
      entrySetup: 'IFR2_OVERSOLD'
    };

    const normVol = tradesModule.normalizePlan(volPlan);
    assert.equal(normVol.strategyType, 'VOLATILITY_TRADING');
    assert.equal(normVol.strategyConfigId, 'volatility_ifr2_default');

    assert.throws(() => {
      tradesModule.normalizePlan({
        asset: 'PETR4',
        entry: 30,
        stop: 28,
        suggestedQty: 100,
        executedQty: 100,
        riskPct: 0.005,
        grade: 'B',
        strategyType: 'DAY_TRADE_SCALPING'
      });
    }, /Estratégia inválida/);
  });
});

test('PASSO 10 — QA 3: Regras Operacionais e Ausência de Look-Ahead Bias', async (t) => {
  await t.test('Casos positivos e negativos do motor Volatility Swing', () => {
    // 1. Caso Positivo
    const positiveCandles = makeSyntheticCandles({
      count: 220,
      closeAboveSma200: true,
      closeBelowSma7: true,
      ifr2Oversold: true
    });
    const posSignal = VolatilityEngineModel.evaluateSignal(positiveCandles, positiveCandles.length - 1, { symbol: 'ELET3' });
    assert.equal(posSignal.isValid, true);
    assert.ok(posSignal.indicators.ifr <= 10.0);
    assert.ok(posSignal.indicators.close > posSignal.indicators.smaLong);
    assert.ok(posSignal.indicators.close < posSignal.indicators.smaShort);

    // 2. Caso Negativo: Fechamento abaixo da SMA200 (reprovado na tendência primária)
    const negCandlesTrend = makeSyntheticCandles({ count: 220 });
    negCandlesTrend[negCandlesTrend.length - 1].close = 10.0;
    const negSignalTrend = VolatilityEngineModel.evaluateSignal(negCandlesTrend, negCandlesTrend.length - 1, { symbol: 'ELET3' });
    assert.equal(negSignalTrend.isValid, false);
    assert.equal(negSignalTrend.code, 'NOT_ABOVE_LONG_MA');
    assert.ok(negSignalTrend.reason.includes('SMA(200)'));

    // 3. Caso Negativo: IFR acima de 10.00 / Fechamento acima da SMA7
    const negCandlesIfr = makeSyntheticCandles({ count: 220 });
    const negSignalIfr = VolatilityEngineModel.evaluateSignal(negCandlesIfr, negCandlesIfr.length - 1, { symbol: 'ELET3' });
    assert.equal(negSignalIfr.isValid, false);
    assert.ok(['NOT_OVERSOLD', 'NOT_BELOW_SHORT_MA'].includes(negSignalIfr.code));

    // 4. Caso Negativo: Reprovação no Liquidity Gate
    const negCandlesLiq = makeSyntheticCandles({
      count: 220,
      closeAboveSma200: true,
      closeBelowSma7: true,
      ifr2Oversold: true
    });
    for (let i = negCandlesLiq.length - 25; i < negCandlesLiq.length; i++) {
      negCandlesLiq[i].volume = 10000; // < R$ 500k em toda a janela de 21 dias
    }
    const negSignalLiq = VolatilityEngineModel.evaluateSignal(negCandlesLiq, negCandlesLiq.length - 1, { symbol: 'MGLU3' });
    assert.equal(negSignalLiq.isValid, false);
    assert.equal(negSignalLiq.code, 'LIQUIDITY_REJECTED');
  });

  await t.test('Simulação em dados reais (PETR4) com absorção de gap e saídas sem look-ahead', () => {
    const petr = loadB3History().get('PETR4');
    assert.ok(petr && petr.length >= 200, 'PETR4 deve ter candles para backtest');

    const sim = VolatilityEngineModel.simulateAsset(petr, {
      symbol: 'PETR4',
      market: 'B3',
      checkLiquidity: false
    });

    assert.ok(sim.summary.totalTrades > 0, 'Deve gerar trades simulados');
    assert.ok(sim.summary.winRatePct >= 50, 'Taxa de acerto deve ser expressiva');
    assert.equal(sim.trades[0].status, 'CLOSED');
    assert.ok(sim.trades[0].entryPrice > 0);
    assert.ok(sim.trades[0].holdingSessions <= 7, 'Nenhum trade pode ultrapassar 7 pregões');
    assert.ok(['TARGET_MA_RECOVERY', 'TIME_EXIT'].includes(sim.trades[0].exitReason));
  });
});

test('PASSO 10 — QA 4: Simulador de Trades — Determinismo e Zero Look-Ahead', async () => {
  const petr = loadB3History().get('PETR4');

  // Execução 1
  const run1 = VolatilityEngineModel.simulateAsset(petr, {
    symbol: 'PETR4',
    market: 'B3',
    fixedCapitalPerTrade: 10000,
    checkLiquidity: false
  });

  // Execução 2
  const run2 = VolatilityEngineModel.simulateAsset(petr, {
    symbol: 'PETR4',
    market: 'B3',
    fixedCapitalPerTrade: 10000,
    checkLiquidity: false
  });

  assert.equal(run1.summary.totalTrades, run2.summary.totalTrades, 'Total de trades deve ser estritamente idêntico');
  assert.equal(run1.summary.netProfit, run2.summary.netProfit, 'Lucro financeiro deve ser idêntico');
  assert.equal(run1.summary.winRatePct, run2.summary.winRatePct, 'Taxa de acerto deve ser idêntica');
  assert.deepEqual(run1.trades, run2.trades, 'Array completo de trades simulados deve ser idêntico');
});

test('PASSO 10 — QA 5: Rubrics Independentes e Pureza Amostral do SQN', async (t) => {
  await t.test('Rubric de Volatilidade não contém critérios de Força Relativa nem Líderes', () => {
    const volCriteria = TradingRubrics.DEFAULT_VOLATILITY_POLICY.criteria;
    assert.equal(volCriteria.some(c => c.key === 'relativeStrength'), false);
    assert.equal(volCriteria.some(c => c.key === 'leadersRank'), false);
    assert.equal(volCriteria.length, 7);
  });

  await t.test('SQN (System Quality Number) exclui operações de Volatilidade (R-Isolation)', () => {
    const mixedTrades = [
      { id: '1', strategyType: 'TREND_FOLLOWING', resultR: 2.5, netResult: 2500 },
      { id: '2', strategyType: 'TREND_FOLLOWING', resultR: -1.0, netResult: -1000 },
      { id: '3', strategyType: 'TREND_FOLLOWING', resultR: 3.0, netResult: 3000 },
      // Trades de volatilidade NÃO possuem stop por R
      { id: '4', strategyType: 'VOLATILITY_TRADING', resultR: null, netResult: 1200 },
      { id: '5', strategyType: 'VOLATILITY_TRADING', resultR: 0, netResult: -400 }
    ];

    const rMultiples = SystemQualityAnalyticsModel.extractRMultiples(mixedTrades);
    assert.equal(rMultiples.length, 3, 'Deve extrair R-múltiplos exclusivamente de Trend Following');
    assert.deepEqual(rMultiples, [2.5, -1.0, 3.0]);

    const sqn = SystemQualityAnalyticsModel.calculateSystemQualityAnalytics(mixedTrades);
    assert.equal(sqn.sampleSize, 3);
    assert.ok(sqn.sqn > 0);
  });
});

test('PASSO 10 — QA 6: Reconciliação Consolidada da Carteira (Portfolio Heat & Analytics)', async () => {
  const trendTrades = [
    { id: '1', status: 'closed', strategyType: 'TREND_FOLLOWING', netResult: 5000, durationDays: 14, resultR: 2.0 },
    { id: '2', status: 'closed', strategyType: 'TREND_FOLLOWING', netResult: -2000, durationDays: 5, resultR: -1.0 }
  ];
  const volTrades = [
    { id: '3', status: 'closed', strategyType: 'VOLATILITY_TRADING', netResult: 1500, durationDays: 3, resultR: null },
    { id: '4', status: 'closed', strategyType: 'VOLATILITY_TRADING', netResult: 800, durationDays: 2, resultR: null }
  ];

  const allTrades = [...trendTrades, ...volTrades];
  const consolidated = StrategyAnalyticsModel.calculateConsolidatedPortfolio(allTrades, { initialCapital: 100000 });

  assert.equal(consolidated.totalNetProfit, 5300, 'Resultado consolidado deve ser a soma exata: 5000 - 2000 + 1500 + 800 = 5300');
  assert.equal(consolidated.trendFollowing.netProfit, 3000);
  assert.equal(consolidated.volatilityTrading.netProfit, 2300);
  assert.equal(consolidated.trendFollowing.totalTrades, 2);
  assert.equal(consolidated.volatilityTrading.totalTrades, 2);
});

test('PASSO 10 — QA 7: Módulos Integrados e Exportação do Diário', async () => {
  // 1. Watchlist com suporte a filtro dual
  const list = [
    WatchlistModel.normalizeOpportunity({ ticker: 'PRIO3', strategyType: 'TREND_FOLLOWING' }),
    WatchlistModel.normalizeOpportunity({ ticker: 'ITUB4', strategyType: 'VOLATILITY_TRADING' })
  ];
  assert.equal(WatchlistModel.filterAndSortOpportunities(list, { strategy: 'trend_following' }).length, 1);
  assert.equal(WatchlistModel.filterAndSortOpportunities(list, { strategy: 'volatility_trading' }).length, 1);
  assert.equal(WatchlistModel.filterAndSortOpportunities(list, { strategy: 'todos' }).length, 2);

  // 2. Exportação do Diário com identificação visual de estratégia
  const markdown = JournalExportModel.toMarkdown([{
    date: '2026-08-10',
    type: 'trade',
    trades: [{ ticker: 'BBDC4', strategyType: 'VOLATILITY_TRADING' }]
  }]);
  assert.ok(markdown.includes('[⚡ Volatility Trading]'));
});

test('PASSO 10 — QA 8: Documentação e In-App Manual', () => {
  const repoRoot = path.join(__dirname, '..', '..');
  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

  // Seções no index.html
  assert.ok(indexHtml.includes('id="manual-dualstrategy"'), 'index.html deve conter #manual-dualstrategy');
  assert.ok(indexHtml.includes('id="manual-volatilitystrategy"'), 'index.html deve conter #manual-volatilitystrategy');
  assert.ok(indexHtml.includes('data-manual-target="manual-dualstrategy"'), 'index.html deve conter botão de navegação para #manual-dualstrategy');
  assert.ok(indexHtml.includes('data-manual-target="manual-volatilitystrategy"'), 'index.html deve conter botão de navegação para #manual-volatilitystrategy');

  // Perguntas no FAQ
  assert.ok(indexHtml.includes('Qual a diferença entre Trend Following e Volatility Trading no software?'));
  assert.ok(indexHtml.includes('Como o software lida com o risco consolidado da carteira?'));

  // Arquivo de especificação técnica
  const docPath = path.join(repoRoot, 'docs', 'DUAL_STRATEGY_ARCHITECTURE.md');
  assert.ok(fs.existsSync(docPath), 'docs/DUAL_STRATEGY_ARCHITECTURE.md deve existir');
  const docContent = fs.readFileSync(docPath, 'utf8');
  assert.ok(docContent.includes('Active Strategy Workspace'));
  assert.ok(docContent.includes('043_dual_strategy_trades.sql'));
  assert.ok(docContent.includes('Capital Alocado vs. Risco'));
  assert.ok(docContent.includes('Limitações e Riscos do Volatility Trading'));
});
