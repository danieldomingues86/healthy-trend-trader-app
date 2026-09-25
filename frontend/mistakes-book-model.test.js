const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('./mistakes-book-model');

test('blank results stay unknown and metrics use saved records rather than display examples', () => {
  const records = [
    { mistakeTypes: ['Entrada antecipada'], resultR: '-1,2', isMastered: false },
    { mistakeTypes: ['Entrada antecipada', 'FOMO'], resultR: '-0,8', isMastered: true },
    { mistakeTypes: ['Stop incorreto'], resultR: '', isMastered: false }
  ];
  assert.equal(M.number(''), null);
  assert.deepEqual(M.metrics(records), { total: 3, repeated: 2, repeatedPercent: 67, costR: -2, mastered: 1 });
  assert.deepEqual(M.impact(records, 'Entrada antecipada'), { count: 2, percentage: 67, costR: -2 });
  assert.deepEqual(M.impact(records, 'Stop incorreto'), { count: 1, percentage: 33, costR: null });
});

test('evolution compares actual occurrences in successive three-month periods', () => {
  const records = [
    { date: '2026-04-02', mistakeTypes: ['FOMO'] },
    { date: '2026-05-02', mistakeTypes: ['FOMO'] },
    { date: '2026-07-02', mistakeTypes: ['FOMO'] }
  ];
  const trend = M.change(records, 'FOMO', new Date(2026, 8, 15));
  assert.equal(trend.previous, 2);
  assert.equal(trend.recent, 1);
  assert.equal(trend.percentage, 50);
});

test('older books gain an empty market lessons collection without changing records', () => {
  const storage = { getItem: () => JSON.stringify({ version: 1, records: [{ id: 'kept' }] }) };
  assert.deepEqual(M.load(storage), { version: 1, records: [{ id: 'kept' }], marketLessons: [] });
});

test('nextRecordId navigates smoothly across records and respects boundaries for keyboard navigation', () => {
  const records = [{ id: 'rec-1' }, { id: 'rec-2' }, { id: 'rec-3' }];
  assert.equal(M.nextRecordId(records, 'rec-1', 1), 'rec-2');
  assert.equal(M.nextRecordId(records, 'rec-2', 1), 'rec-3');
  assert.equal(M.nextRecordId(records, 'rec-3', 1), 'rec-3'); // boundary: stays on last
  assert.equal(M.nextRecordId(records, 'rec-3', -1), 'rec-2');
  assert.equal(M.nextRecordId(records, 'rec-2', -1), 'rec-1');
  assert.equal(M.nextRecordId(records, 'rec-1', -1), 'rec-1'); // boundary: stays on first
  assert.equal(M.nextRecordId(records, 'unknown', 1), 'rec-1'); // fallback to first
  assert.equal(M.nextRecordId(records, 'unknown', -1), 'rec-3'); // fallback to last
  assert.equal(M.nextRecordId([], 'rec-1', 1), null);
});

test('ANNOTATION_TOOLS defines standard charting markers without colliding with zoom mode', () => {
  assert.ok(Array.isArray(M.ANNOTATION_TOOLS));
  assert.ok(M.ANNOTATION_TOOLS.includes('Entrada'));
  assert.ok(M.ANNOTATION_TOOLS.includes('Stop'));
  assert.ok(M.ANNOTATION_TOOLS.includes('Saída'));
  assert.ok(M.ANNOTATION_TOOLS.includes('Erro'));
});

test('uppercase normalizes ticker, setup, timeframe and market to uppercase and trims', () => {
  assert.equal(M.uppercase('wege3'), 'WEGE3');
  assert.equal(M.uppercase('  breakout 20 '), 'BREAKOUT 20');
  assert.equal(M.uppercase('1h / 4h'), '1H / 4H');
  assert.equal(M.uppercase('ibov'), 'IBOV');
  assert.equal(M.uppercase(null), '');
  assert.equal(M.uppercase(undefined), '');
});


