const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePlan, validateRareTrade, normalizeExecution, normalizePositionEvent, ratingFromValue } = require('../src/trades');

test('normaliza plano com ticker em caixa alta e contribuições da Rubric', () => {
  const plan = normalizePlan({
    asset: ' wege3 ', entry: 48.3, stop: 45.8, atr: 1.72, suggestedQty: 400,
    executedQty: 400, riskPct: .004, riskBudgetPct: .01, executableRiskPct: .0051,
    limitingLayer: 'capital', limitingLayerName: 'Limite de capital', rubricScore: 97, rubricMaxScore: 100, grade: 'A',
    rubricResponses: { marketCycle: 2 }, rubricContributions: [{ key: 'marketCycle', value: 2, points: 2, weight: 1 }]
  });
  assert.equal(plan.ticker, 'WEGE3');
  assert.equal(plan.contributions[0].rating, 'good');
  assert.equal(plan.contributions[0].maxScore, 2);
  assert.equal(plan.riskPct, .0051);
  assert.equal(plan.metadata.riskBudgetPct, .01);
  assert.equal(plan.metadata.executableRiskPct, .0051);
  assert.equal(plan.metadata.limitingLayer, 'capital');
  assert.equal(plan.metadata.limitingLayerName, 'Limite de capital');
});

test('preserva campos de auditoria do ciclo de mercado e override no metadata', () => {
  const plan = normalizePlan({
    asset: 'WEGE3', entry: 48.3, stop: 45.8, atr: 1.72, suggestedQty: 400,
    executedQty: 400, riskPct: .004, rubricScore: 85, rubricMaxScore: 100, grade: 'A',
    benchmark: 'IBOV', marketCycleSuggested: 'Saudável', marketCycleUsed: 'Transição', marketCycleOverride: true
  });
  assert.equal(plan.metadata.benchmark, 'IBOV');
  assert.equal(plan.metadata.marketCycleSuggested, 'Saudável');
  assert.equal(plan.metadata.marketCycleUsed, 'Transição');
  assert.equal(plan.metadata.marketCycleOverride, true);
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

test('não aceita o grade legado em novos trades', () => {
  assert.throws(() => normalizePlan({ asset: 'WEGE3', entry: 10, stop: 9, suggestedQty: 100, executedQty: 100, riskPct: .004, grade: 'A+' }), /Grade da Rubric inválido/);
});

test('API recusa Grade A com score alto mas um Quality Gate reprovado', () => {
  const allGood = { trendQuality: 'good', relativeStrength: 'good', volatility: 'good', setupQuality: 'good', fundamentalScore: 'good' };
  const verified = { rubricGrade: 'A', rubricScore: 100, rubricResponses: { ratings: allGood, marketCycleRegime: 'healthy' } };
  assert.doesNotThrow(() => validateRareTrade(verified));
  const failed = { ...verified, rubricScore: 97.8, rubricResponses: { ratings: { ...allGood, fundamentalScore: 'medium' }, marketCycleRegime: 'healthy' } };
  assert.throws(() => validateRareTrade(failed), /Grade A exige/);
  assert.throws(() => validateRareTrade({ ...verified, rubricScore: 97 }), /Grade A exige/);
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
  assert.throws(() => normalizePositionEvent('peeloff', { qty: 1.5, price: 52 }), /inteiro/);
  assert.equal(normalizePositionEvent('peeloff', { qty: 2, price: 52, occurredAt: '2026-09-15T10:30:00-03:00' }).occurredAt, '2026-09-15T13:30:00.000Z');
});
