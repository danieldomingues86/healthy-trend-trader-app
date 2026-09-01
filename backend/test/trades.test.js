const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePlan, normalizeExecution, normalizePositionEvent, ratingFromValue } = require('../src/trades');

test('normaliza plano com ticker em caixa alta e contribuições da Rubric', () => {
  const plan = normalizePlan({
    asset: ' wege3 ', entry: 48.3, stop: 45.8, atr: 1.72, suggestedQty: 400,
    executedQty: 400, riskPct: .004, rubricScore: 18, rubricMaxScore: 24, grade: 'A+',
    rubricResponses: { marketCycle: 2 }, rubricContributions: [{ key: 'marketCycle', value: 2, points: 2, weight: 1 }]
  });
  assert.equal(plan.ticker, 'WEGE3');
  assert.equal(plan.contributions[0].rating, 'good');
  assert.equal(plan.contributions[0].maxScore, 2);
});

test('preserva a data efetiva de entrada separada do registro do trade', () => {
  const plan = normalizePlan({
    asset: 'WEGE3', entry: 48.3, stop: 45.8, atr: 1.72, suggestedQty: 400,
    executedQty: 400, riskPct: .001, rubricScore: 8, rubricMaxScore: 10, grade: 'B',
    entryDate: '2026-08-27'
  });
  assert.equal(plan.metadata.entryDate, '2026-08-27');
  assert.equal(plan.entryTimestamp, '2026-08-27T15:00:00.000Z');
});

test('rejeita ticker e quantidade inválidos antes de acessar o banco', () => {
  assert.throws(() => normalizePlan({ asset: 'weg!', entry: 10, stop: 9, suggestedQty: 100, riskPct: .001 }), /Ticker inválido/);
  assert.throws(() => normalizePlan({ asset: 'WEGE3', entry: 10, stop: 9, suggestedQty: 0, riskPct: .001 }), /Quantidade planejada/);
});

test('converte a escala da tela para os três estados persistidos', () => {
  assert.equal(ratingFromValue(2), 'good');
  assert.equal(ratingFromValue(1), 'medium');
  assert.equal(ratingFromValue(0), 'bad');
});

test('normaliza a confirmação de execução com preço e quantidade efetivos', () => {
  assert.deepEqual(normalizeExecution({ executedQty: 1100, executionPrice: 48.35 }), { quantity: 1100, price: 48.35 });
  assert.throws(() => normalizeExecution({ executedQty: 0, executionPrice: 48.35 }), /Quantidade executada/);
});

test('normaliza eventos de gestão de posição', () => {
  assert.deepEqual(normalizePositionEvent('update', { price: 51.2, stop: 48, atr: 1.5, note: 'Stop protegido.' }), {
    type: 'update', price: 51.2, stop: 48, atr: 1.5, note: 'Stop protegido.'
  });
  assert.deepEqual(normalizePositionEvent('peeloff', { qty: 100, price: 52, note: '' }), {
    type: 'peeloff', quantity: 100, price: 52, note: ''
  });
  assert.throws(() => normalizePositionEvent('close', { qty: 0, price: 52 }), /Quantidade/);
});
