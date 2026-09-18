const test = require('node:test');
const assert = require('node:assert/strict');
const watchlist = require('../src/watchlist');

test('valida e normaliza tickers da watchlist', () => {
  assert.equal(watchlist.ticker(' petr4 '), 'PETR4');
  assert.equal(watchlist.ticker('wege3'), 'WEGE3');
  assert.equal(watchlist.ticker('bova11'), 'BOVA11');
  assert.throws(() => watchlist.ticker(''), /Ticker inválido/);
  assert.throws(() => watchlist.ticker('PETR'), /Ticker inválido/);
  assert.throws(() => watchlist.ticker('PETR444'), /Ticker inválido/);
  assert.throws(() => watchlist.ticker('PETR$'), /Ticker inválido/);
});

test('normaliza payload de oportunidade com valores padrão e snapshot inicial', () => {
  const norm = watchlist.normalizeOpportunityPayload('wege3', {
    origin: 'emerging-leaders',
    status: 'observando',
    thesis: 'Rompimento de pivô após consolidação 4H',
    snapshot: { price: 48.5, rsScore: 92, distance52wPct: -3.5, atrPct: 2.1 },
    waiting_conditions: [{ id: '4h-contraction', label: 'Contração 4H', checked: false }],
    why_observing: [{ id: 'rs-high', label: 'RS 92 > 90' }]
  });

  assert.equal(norm.ticker, 'WEGE3');
  assert.equal(norm.origin, 'emerging-leaders');
  assert.equal(norm.status, 'observando');
  assert.equal(norm.thesis, 'Rompimento de pivô após consolidação 4H');
  assert.deepEqual(norm.snapshot, { price: 48.5, rsScore: 92, distance52wPct: -3.5, atrPct: 2.1 });
  assert.equal(norm.waitingConditions.length, 1);
  assert.equal(norm.whyObserving.length, 1);
  assert.equal(norm.sources.length, 1);
  assert.equal(norm.sources[0].origin, 'emerging-leaders');
});

test('combina múltiplas origens sem duplicar e preservando histórico', () => {
  const initialSources = [{ origin: 'emerging-leaders', date: '2026-09-10T10:00:00Z' }];
  
  // Adiciona mesma origem: não duplica
  const unchanged = watchlist.mergeSources(initialSources, 'emerging-leaders');
  assert.equal(unchanged.length, 1);

  // Adiciona nova origem: appends
  const merged = watchlist.mergeSources(initialSources, 'relative-strength');
  assert.equal(merged.length, 2);
  assert.equal(merged[0].origin, 'emerging-leaders');
  assert.equal(merged[1].origin, 'relative-strength');

  // Adiciona terceira origem: scans
  const merged3 = watchlist.mergeSources(merged, 'scans');
  assert.equal(merged3.length, 3);
  assert.equal(merged3[2].origin, 'scans');
});
