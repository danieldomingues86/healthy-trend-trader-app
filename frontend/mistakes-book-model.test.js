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
