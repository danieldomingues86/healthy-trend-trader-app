const test = require('node:test');
const assert = require('node:assert');
const TruthPanelModel = require('./truth-panel-model.js');

test('TruthPanelModel: normalizeTrade normaliza dados reais e simulados', () => {
  const rawTrade = {
    id: 'trade-1',
    ticker: 'PETR4',
    direction: 'long',
    setup: 'Contração 1-2-3',
    rubric_grade: 'A',
    status: 'closed',
    strategy_type: 'TREND_FOLLOWING',
    events: [
      { type: 'entry', at: '2026-03-01T10:00:00Z', qty: 100, price: 30.00, stop: 28.00 },
      { type: 'close', at: '2026-03-05T16:00:00Z', qty: 100, price: 36.00 }
    ]
  };

  const norm = TruthPanelModel.normalizeTrade(rawTrade);
  assert.ok(norm);
  assert.strictEqual(norm.symbol, 'PETR4');
  assert.strictEqual(norm.netResult, 600); // (36 - 30) * 100
  assert.strictEqual(norm.r, 3.0); // 600 / ( (30 - 28) * 100 ) = 600 / 200 = 3R
  assert.strictEqual(norm.grade, 'A');
  assert.strictEqual(norm.accountLabel, 'Conta real');
});

test('TruthPanelModel: filterTrades filtra por múltiplos critérios simultâneos', () => {
  const trades = [
    {
      id: 't1', ticker: 'VALE3', status: 'closed', direction: 'long', setup: 'Breakout', rubric_grade: 'A',
      strategy_type: 'TREND_FOLLOWING',
      events: [{ type: 'entry', price: 60, qty: 100, stop: 55 }, { type: 'close', price: 70, qty: 100 }]
    },
    {
      id: 't2', ticker: 'PETR4', status: 'closed', direction: 'long', setup: 'Contração 1-2-3', rubric_grade: 'B',
      strategy_type: 'TREND_FOLLOWING',
      events: [{ type: 'entry', price: 30, qty: 100, stop: 28 }, { type: 'close', price: 28, qty: 100 }]
    },
    {
      id: 't3', ticker: 'ITUB4', status: 'open', direction: 'long', setup: 'Breakout', rubric_grade: 'A',
      strategy_type: 'TREND_FOLLOWING',
      events: [{ type: 'entry', price: 35, qty: 100, stop: 33 }]
    }
  ];

  // Apenas fechados
  assert.strictEqual(TruthPanelModel.filterTrades(trades).length, 2);

  // Filtro por ativo
  assert.strictEqual(TruthPanelModel.filterTrades(trades, { asset: 'VALE3' }).length, 1);

  // Filtro por grade
  assert.strictEqual(TruthPanelModel.filterTrades(trades, { grade: 'B' }).length, 1);

  // Filtro por setup
  assert.strictEqual(TruthPanelModel.filterTrades(trades, { setup: 'Breakout' }).length, 1);
});

test('TruthPanelModel: calculateOverview calcula métricas com precisão matemática', () => {
  const trades = [
    { id: '1', status: 'closed', direction: 'long', events: [{ type: 'entry', price: 10, qty: 100, stop: 9 }, { type: 'close', price: 13, qty: 100 }] }, // +300 (+3R)
    { id: '2', status: 'closed', direction: 'long', events: [{ type: 'entry', price: 20, qty: 100, stop: 18 }, { type: 'close', price: 18, qty: 100 }] }, // -200 (-1R)
    { id: '3', status: 'closed', direction: 'long', events: [{ type: 'entry', price: 50, qty: 100, stop: 48 }, { type: 'close', price: 52, qty: 100 }] }  // +200 (+1R)
  ];

  const overview = TruthPanelModel.calculateOverview(trades, 100000);
  assert.strictEqual(overview.totalTrades, 3);
  assert.strictEqual(overview.winningTradesCount, 2);
  assert.strictEqual(overview.losingTradesCount, 1);
  assert.strictEqual(overview.winRatePct, 66.67);
  assert.strictEqual(overview.grossProfit, 500);
  assert.strictEqual(overview.grossLoss, 200);
  assert.strictEqual(overview.netProfit, 300);
  assert.strictEqual(overview.profitFactor, 2.5); // 500 / 200
  assert.strictEqual(overview.expectancyAmount, 100); // 300 / 3
  assert.strictEqual(overview.totalR, 3); // 3 - 1 + 1 = 3R
  assert.strictEqual(overview.expectancyR, 1.0); // 3 / 3 = 1R
});

test('TruthPanelModel: calculateQuality calcula agrupamentos por R, Grade e Mensal', () => {
  const trades = [
    { id: '1', status: 'closed', rubric_grade: 'A', events: [{ type: 'entry', price: 10, qty: 100, stop: 9, at: '2026-04-01' }, { type: 'close', price: 14, qty: 100, at: '2026-04-05' }] }, // +4R
    { id: '2', status: 'closed', rubric_grade: 'A', events: [{ type: 'entry', price: 20, qty: 100, stop: 18, at: '2026-04-02' }, { type: 'close', price: 18, qty: 100, at: '2026-04-04' }] }  // -1R
  ];

  const quality = TruthPanelModel.calculateQuality(trades);
  assert.ok(quality.byRLevel);
  assert.ok(quality.byGrade);
  assert.strictEqual(quality.byGrade.find(g => g.grade === 'A')?.count, 2);
  assert.ok(quality.monthlyStats);
  assert.strictEqual(quality.monthlyStats.length, 12);
});

test('TruthPanelModel: calculateBehavior calcula sequências de vitórias e derrotas', () => {
  const trades = [
    { id: '1', status: 'closed', events: [{ type: 'entry', price: 10, qty: 10 }, { type: 'close', price: 12, qty: 10 }] }, // Win
    { id: '2', status: 'closed', events: [{ type: 'entry', price: 10, qty: 10 }, { type: 'close', price: 13, qty: 10 }] }, // Win
    { id: '3', status: 'closed', events: [{ type: 'entry', price: 10, qty: 10 }, { type: 'close', price: 9, qty: 10 }] },  // Loss
    { id: '4', status: 'closed', events: [{ type: 'entry', price: 10, qty: 10 }, { type: 'close', price: 8, qty: 10 }] }   // Loss
  ];

  const behavior = TruthPanelModel.calculateBehavior(trades);
  assert.strictEqual(behavior.maxConsecutiveWins, 2);
  assert.strictEqual(behavior.maxConsecutiveLosses, 2);
});
