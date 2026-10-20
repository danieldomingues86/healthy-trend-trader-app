const test = require('node:test');
const assert = require('node:assert/strict');
const Forecast = require('./forecast-simulator-model');

test('simulação fixa aplica compounding e produz percentis ordenados', () => {
  const result = Forecast.simulateFixed({ equity: 100000, riskPct: 0.01, rValues: [1], trades: 10, runs: 200, seed: 4 });
  assert.ok(Math.abs(result.median - 100000 * Math.pow(1.01, 10)) < 0.01);
  assert.ok(result.adverse <= result.median && result.median <= result.favorable);
});

test('simulação de objetivo retorna faixa probabilística de trades', () => {
  const result = Forecast.simulateTarget({ equity: 100000, target: 105000, riskPct: 0.01, rValues: [-1, 2, 2], runs: 1000, maxTrades: 100, seed: 8 });
  assert.ok(result.hitProbability > 0 && result.hitProbability <= 1);
  assert.ok(result.tradeRange[0] <= result.estimatedTrades && result.estimatedTrades <= result.tradeRange[1]);
});

test('resumo usa a distribuição de R-Multiples informada', () => {
  assert.deepEqual(Forecast.summary([-1, -0.5, 1, 2]), { count: 4, winRate: 0.5, averageWin: 1.5, averageLoss: -0.75, expectancy: 0.375 });
});

test('distributionBuckets divide em 7 faixas canônicas com percentuais', () => {
  const rValues = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 4.0];
  const buckets = Forecast.distributionBuckets(rValues);
  assert.equal(buckets.length, 7);
  assert.equal(buckets[0].id, 'le_minus2');
  assert.equal(buckets[0].count, 1);
  assert.equal(buckets[6].id, 'gt_3');
  assert.equal(buckets[6].count, 1);
  const totalCount = buckets.reduce((acc, b) => acc + b.count, 0);
  assert.equal(totalCount, 7);
  const totalPct = buckets.reduce((acc, b) => acc + b.pct, 0);
  assert.ok(Math.abs(totalPct - 100) < 0.01);
});

test('keyStatistics calcula métricas essenciais de desempenho', () => {
  const trades = [
    { r: 2.0, mfeR: 2.5, maeR: 0.2, duration: 5 },
    { r: -1.0, mfeR: 0.2, maeR: 1.0, duration: 3 },
    { r: 1.0, mfeR: 1.2, maeR: 0.3, duration: 4 }
  ];
  const stats = Forecast.keyStatistics(trades);
  assert.equal(stats.total, 3);
  assert.equal(Number(stats.winRate.toFixed(1)), 66.7);
  assert.equal(Number(stats.lossRate.toFixed(1)), 33.3);
  assert.equal(stats.avgWinR, 1.5);
  assert.equal(stats.avgLossR, -1.0);
  assert.equal(stats.profitFactor, 3.0);
  assert.equal(stats.avgDuration, 4);
});

test('triggerBreakdown agrupa e ordena trades por gatilho', () => {
  const trades = [
    { triggerName: 'Pullback MM21', r: 1.5 },
    { triggerName: 'Rompimento de Pivô', r: -1.0 },
    { triggerName: 'Pullback MM21', r: 2.0 }
  ];
  const breakdown = Forecast.triggerBreakdown(trades);
  assert.equal(breakdown.length, 2);
  assert.equal(breakdown[0].name, 'Pullback MM21');
  assert.equal(breakdown[0].count, 2);
  assert.equal(breakdown[0].totalR, 3.5);
  assert.equal(breakdown[0].winRate, 100);
});

test('filterTrades filtra por gatilho e período', () => {
  const now = new Date().toISOString();
  const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const trades = [
    { triggerName: 'Pullback MM21', r: 1.5, exitDate: now },
    { triggerName: 'Rompimento de Pivô', r: -1.0, exitDate: now },
    { triggerName: 'Pullback MM21', r: 2.0, exitDate: oldDate }
  ];

  const filteredTrigger = Forecast.filterTrades(trades, { trigger: 'Pullback MM21' });
  assert.equal(filteredTrigger.length, 2);

  const filteredPeriod = Forecast.filterTrades(trades, { period: '30d' });
  assert.equal(filteredPeriod.length, 2);

  const combined = Forecast.filterTrades(trades, { trigger: 'Pullback MM21', period: '30d' });
  assert.equal(combined.length, 1);
  assert.equal(combined[0].r, 1.5);
});
