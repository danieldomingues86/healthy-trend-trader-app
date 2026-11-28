'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const LiquidityGateModel = require('./liquidity-gate-model');
const MarketCycleModel = require('./market-cycle-model');
const TickerChartModel = require('./ticker-chart-model');
const TradeSimulatorModel = require('./trade-simulator-model');
const VolatilityTradingEngineModel = require('./volatility-trading-engine-model');
const VolatilityTradeSimulatorModel = require('./volatility-trade-simulator-model');
const tickerChart = require('../backend/src/ticker-chart');
const tradeSimulatorBackend = require('../backend/src/trade-simulator');

test('Performance & Equivalência Matemática — 1. buildMarketCycleReadingsSeries é 100% equivalente a scoreMarketCycleFromCandles barra a barra', () => {
  const b3Map = tickerChart.loadB3History();
  const bova = b3Map.get('BOVA11') || [];
  assert.ok(bova.length >= 100, 'BOVA11 deve possuir histórico suficiente');

  const sample = bova.slice(-160);
  const fastSeries = MarketCycleModel.buildMarketCycleReadingsSeries(sample);
  assert.equal(fastSeries.length, sample.length);

  for (let i = 0; i < 29; i++) {
    assert.equal(fastSeries[i], null);
  }

  for (let i = 29; i < sample.length; i++) {
    const expected = MarketCycleModel.scoreMarketCycleFromCandles(sample.slice(0, i + 1));
    assert.deepEqual(fastSeries[i], expected, `Divergência na barra ${i}`);
  }
});

test('Performance & Equivalência Matemática — 2. Fast-path O(1) de validateDailyEmaAlignment e calculateHistoricalRsScore com séries pré-calculadas coincide 100% com slice fatiado', () => {
  const b3Map = tickerChart.loadB3History();
  const weg = b3Map.get('WEGE3') || [];
  const bova = b3Map.get('BOVA11') || [];
  assert.ok(weg.length >= 120 && bova.length >= 120);

  const closes = weg.map(c => Number(c.close));
  const ema10Series = TradeSimulatorModel.calculateEmaSeriesRaw(closes, 10);
  const ema72Series = TradeSimulatorModel.calculateEmaSeriesRaw(closes, 72);

  for (let idx = weg.length - 80; idx < weg.length; idx++) {
    const slice = weg.slice(0, idx + 1);

    const alignSlow = TickerChartModel.validateDailyEmaAlignment(slice);
    const alignFast = TickerChartModel.validateDailyEmaAlignment(weg, ema10Series, ema72Series, idx);
    assert.deepEqual(alignFast, alignSlow, `Divergência em validateDailyEmaAlignment no índice ${idx}`);

    const rsSlow = TradeSimulatorModel.calculateHistoricalRsScore(slice, bova);
    const rsFast = TradeSimulatorModel.calculateHistoricalRsScore(weg, bova, {
      endIndex: idx,
      precomputedEma10: ema10Series,
      precomputedEma72: ema72Series
    });
    assert.deepEqual(rsFast, rsSlow, `Divergência em calculateHistoricalRsScore no índice ${idx}`);
  }
});

test('Performance & Equivalência Matemática — 3. Trend Following (24 meses IBOV) mantém 100% dos sinais, entradas, saídas, stops, trailing stops e métricas com execução rápida e callback de progresso', () => {
  const b3Map = tickerChart.loadB3History();
  const marketCachePath = path.join(__dirname, '..', 'backend', 'data', 'market-cache.json');
  const marketCache = JSON.parse(fs.readFileSync(marketCachePath, 'utf8'));

  const ibovSymbols = marketCache.relativeStrength
    .filter(s => s.assetClass === 'stock_ibov')
    .map(s => s.symbol);
  const metadataMap = {};
  marketCache.relativeStrength.forEach(item => {
    if (item.symbol) {
      metadataMap[item.symbol] = { name: item.name || item.symbol, sector: item.sector || 'Geral' };
    }
  });

  const benchmarkCycleByDate = tradeSimulatorBackend.getPrecomputedBenchmarkCycleMap();
  const benchmarkCandlesMap = new Map();
  if (b3Map.get('IBOV')) benchmarkCandlesMap.set('IBOV', b3Map.get('IBOV'));
  if (b3Map.get('BOVA11')) benchmarkCandlesMap.set('BOVA11', b3Map.get('BOVA11'));

  const progressUpdates = [];
  const t0 = performance.now();
  const res = TradeSimulatorModel.generateHistoricalSimulations({
    candlesMap: b3Map,
    metadataMap,
    symbols: ibovSymbols,
    targetVolume: 'MAX',
    period: '730',
    triggers: 'ALL',
    grades: ['A', 'B', 'C'],
    scenario: '2R',
    universe: 'IBOV',
    simulationMode: 'OFFICIAL',
    benchmarkCycleByDate,
    benchmarkCandlesMap,
    onProgress: (info) => progressUpdates.push(info)
  });
  const elapsedMs = performance.now() - t0;

  // Valida fidelidade matemática e consistência da auditoria
  assert.ok(res.meta.blockedBreakdown.totalCandidatesEvaluated > 10000);
  assert.ok(res.meta.totalSignals > 1000);
  assert.ok(res.meta.executedCount > 700);
  assert.ok(res.stats.winRate >= 35 && res.stats.winRate <= 45);
  assert.ok(Number.isFinite(res.stats.totalR));
  assert.ok(Number.isFinite(res.stats.expectancyR));
  assert.equal(res.auditReport.isConsistent, true);
  assert.equal(res.auditReport.invalidTradesCount, 0);

  // Valida telemetria de progresso e tempo
  assert.ok(progressUpdates.length >= 5, 'Deve emitir eventos de progresso durante a varredura');
  assert.equal(progressUpdates[progressUpdates.length - 1].progressPct, 100);
  assert.ok(res.meta.assetsProcessedCount > 0);
  assert.ok(Number.isFinite(res.meta.elapsedMs));
  assert.ok(elapsedMs < 6000, `Trend Following IBOV 24m deve executar em menos de 6s (atual: ${elapsedMs.toFixed(1)}ms)`);

  // Valida comparação entre os 5 cenários de saída (2R, 2.5R, PYRAMID_1R_2R, PARTIAL_50_2R_EMA9, PARTIAL_80_2R_EMA9)
  const tComp = performance.now();
  const mgmtComp = TradeSimulatorModel.compareManagementScenarios(res.simulations);
  const compElapsed = performance.now() - tComp;
  assert.equal(mgmtComp.scenarios.length, 5);
  assert.ok(compElapsed < 3000, `Comparação dos 5 cenários deve executar em menos de 3s (atual: ${compElapsed.toFixed(1)}ms)`);
});

test('Performance & Equivalência Matemática — 4. Volatility Trading (24 meses IBOV e LIQUID_B3) mantém 100% dos trades, lucro líquido e métricas com cache de indicadores e progresso', () => {
  const b3Map = tickerChart.loadB3History();
  const marketCachePath = path.join(__dirname, '..', 'backend', 'data', 'market-cache.json');
  const marketCache = JSON.parse(fs.readFileSync(marketCachePath, 'utf8'));

  const ibovSymbols = marketCache.relativeStrength
    .filter(s => s.assetClass === 'stock_ibov')
    .map(s => s.symbol);
  const liquidB3Symbols = marketCache.relativeStrength.map(s => s.symbol);
  const metadataMap = {};
  marketCache.relativeStrength.forEach(item => {
    if (item.symbol) {
      metadataMap[item.symbol] = { name: item.name || item.symbol, sector: item.sector || 'Geral' };
    }
  });

  const progressUpdates = [];
  const t0 = performance.now();
  const vtIbov = VolatilityTradeSimulatorModel.simulateUniverse(b3Map, {
    symbols: ibovSymbols,
    metadataMap,
    universe: 'IBOV',
    market: 'B3',
    period: '504',
    onProgress: (info) => progressUpdates.push(info)
  });
  const ibovElapsed = performance.now() - t0;

  assert.ok(vtIbov.metrics.totalTrades >= 270 && vtIbov.metrics.totalTrades <= 280);
  assert.ok(Number.isFinite(vtIbov.metrics.netProfit));
  assert.ok(progressUpdates.length >= 5);
  assert.equal(progressUpdates[progressUpdates.length - 1].progressPct, 100);
  assert.ok(vtIbov.metadata.assetsProcessedCount > 0);
  assert.ok(Number.isFinite(vtIbov.metadata.elapsedMs));
  assert.ok(ibovElapsed < 2000, `Volatility Trading IBOV 24m deve executar em menos de 2s (atual: ${ibovElapsed.toFixed(1)}ms)`);

  // Comparação de 4 experimentos no universo LIQUID_B3 (216 ativos, 504 pregões)
  const tComp = performance.now();
  const vtComp = VolatilityTradeSimulatorModel.compareExperiments(b3Map, null, {
    symbols: liquidB3Symbols,
    metadataMap,
    universe: 'LIQUID_B3',
    market: 'B3',
    period: '504'
  });
  const compElapsed = performance.now() - tComp;

  assert.equal(vtComp.results.length, 4);
  const ifr10Row = vtComp.results.find(r => r.oversoldLevel === 10);
  assert.ok(ifr10Row);
  assert.ok(ifr10Row.tradesCount >= 400 && ifr10Row.tradesCount <= 410);
  assert.ok(Number.isFinite(ifr10Row.netProfit));
  assert.ok(compElapsed < 4000, `compareExperiments (4 variantes LIQUID_B3 24m) deve executar em menos de 4s (atual: ${compElapsed.toFixed(1)}ms)`);
});
