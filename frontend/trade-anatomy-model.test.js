const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('./trade-anatomy-model');

function trade(overrides = {}) {
  return {
    id: 't1', status: 'closed', ticker: 'WEGE3', market: 'Ações', direction: 'long', setup: 'Contração 1-2-3',
    atr: 1, rubric_grade: 'A', rubric_responses: { ratings: { trendQuality: 'good', marketCycle: 'healthy', relativeStrength: 'good', setupQuality: 'good', fundamentalScore: 'good' }, marketCycleRegime: 'healthy' },
    created_at: '2025-01-02T12:00:00Z', updated_at: '2025-01-12T12:00:00Z',
    events: [{ type: 'entry', qty: 100, price: 100, stop: 95, at: '2025-01-02T12:00:00Z' }, { type: 'close', qty: 100, price: 110, at: '2025-01-12T12:00:00Z' }],
    ...overrides
  };
}

test('calcula resultado, R e duração pelos eventos oficiais', () => {
  const item = model.analyzeTrade(trade());
  assert.equal(item.result, 1000);
  assert.equal(item.r, 2);
  assert.equal(item.durationDays, 10);
  assert.equal(item.marketContext, 'Saudável');
});

test('filtra por ano, mês, mercado e direção sem incluir trades abertos', () => {
  const items = [trade(), trade({ id: 't2', market: 'Futuros', direction: 'short' }), trade({ id: 't3', status: 'open' })];
  assert.equal(model.filterTrades(items, { year: 2025, month: 1, market: 'Ações', direction: 'long' }).length, 1);
  assert.equal(model.filterTrades(items, { market: 'Futuros', direction: 'short' }).length, 1);
});

test('ranking aceita menos de dez itens e ordena perdas pela maior perda', () => {
  const losing = trade({ id: 'l1', events: [{ type: 'entry', qty: 10, price: 100, stop: 95, at: '2025-01-01' }, { type: 'close', qty: 10, price: 90, at: '2025-01-02' }] });
  const ranked = model.ranking([model.analyzeTrade(trade()), model.analyzeTrade(losing)]);
  assert.equal(ranked.winners.length, 1);
  assert.equal(ranked.losers.length, 1);
  assert.equal(ranked.losers[0].id, 'l1');
});

test('DNA usa apenas o denominador de snapshots realmente registrados', () => {
  const complete = model.analyzeTrade(trade());
  const missing = model.analyzeTrade(trade({ id: 't2', rubric_grade: null, rubric_responses: {}, atr: null, setup: null }));
  const grade = model.dna([complete, missing]).find(item => item.key === 'gradeA');
  assert.equal(grade.matches, 1);
  assert.equal(grade.denominator, 1);
  assert.equal(grade.percentage, 100);
});
