const test = require('node:test');
const assert = require('node:assert/strict');
const { marketDataState, buildNextAction, summarizeScans } = require('./today-cockpit-model');

test('classifica dados recentes da BRAPI como live e cache antigo como real', () => {
  const now = Date.parse('2026-09-08T15:00:00.000Z');
  assert.equal(marketDataState({ source: 'brapi', updatedAt: '2026-09-08T14:30:00.000Z', now }).kind, 'live');
  assert.equal(marketDataState({ source: 'brapi', updatedAt: '2026-09-08T12:00:00.000Z', now }).kind, 'cached');
});

test('nunca apresenta demonstração ou ausência como live', () => {
  assert.equal(marketDataState({ source: 'demo-seed', updatedAt: new Date().toISOString() }).kind, 'demo');
  assert.equal(marketDataState({}).kind, 'unavailable');
});

test('prioriza risco e posição aberta antes de novas oportunidades', () => {
  assert.equal(buildNextAction({ heat: 3, heatLimit: 3, healthyMarket: true, opportunityCount: 8 }).kind, 'risk');
  assert.equal(buildNextAction({ heat: 1, heatLimit: 3, positions: [{ id: '1', asset: 'WEGE3', mode: 'real', riskPct: .4 }], healthyMarket: true, opportunityCount: 8 }).kind, 'position');
});

test('conta ativos únicos encontrados pelos scans disponíveis', () => {
  const summary = summarizeScans({ cards: [
    { available: true, results: [{ symbol: 'WEGE3' }, { symbol: 'PETR4' }] },
    { available: true, results: [{ symbol: 'WEGE3' }] },
    { available: false, results: [] }
  ] });
  assert.deepEqual(summary, { available: 2, unavailable: 1, matches: 2 });
});
