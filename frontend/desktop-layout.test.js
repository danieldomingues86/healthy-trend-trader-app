const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize } = require('./desktop-layout.js');
const registry = [
  { id: 'portfolio', defaultSize: 'large', defaultActive: true },
  { id: 'opportunities', defaultSize: 'medium', defaultActive: true },
  { id: 'relative-strength', defaultSize: 'medium', defaultActive: false }
];
test('layout initializes finite spans and respects registry availability', () => {
  const result = normalize([], registry);
  assert.deepEqual(result.map(x => x.columns), [10, 8, 8]);
  assert.deepEqual(result.map(x => x.active), [true, true, false]);
});
test('legacy invalid dimensions become safe and arbitrary heights are discarded', () => {
  const result = normalize([
    { id: 'portfolio', columns: 'undefined', rows: 800, height: 10000 },
    { id: 'opportunities', columns: -10 },
    { id: 'relative-strength', columns: 1000, active: true }
  ], registry);
  assert.deepEqual(result.map(x => x.columns), [10, 8, 16]);
  result.forEach(x => assert.deepEqual(Object.keys(x).sort(), ['active', 'columns', 'id', 'order']));
});
test('roundtrip preserves order, widths and removed widgets', () => {
  const source = [
    { id: 'relative-strength', order: 0, columns: 5, active: true },
    { id: 'portfolio', order: 1, columns: 9, active: false },
    { id: 'opportunities', order: 2, columns: 7, active: true }
  ];
  const result = normalize(source, registry);
  assert.deepEqual(normalize(JSON.parse(JSON.stringify(result)), registry), source);
});
test('unknown, duplicate and malformed entries cannot create extra instances', () => {
  const result = normalize([null, { id: 'unknown' }, { id: 'portfolio', columns: 4.8 }, { id: 'portfolio', columns: 16 }], registry);
  assert.equal(result.length, registry.length);
  assert.equal(result[0].columns, 5);
  assert.deepEqual(normalize({}, registry), normalize([], registry));
});
test('explicit visual defaults create the intended composition without overriding saved widths', () => {
  const visualRegistry = [
    { id: 'portfolio', defaultSize: 'medium', defaultColumns: 8, defaultOrder: 0, defaultActive: true },
    { id: 'opportunities', defaultSize: 'medium', defaultColumns: 8, defaultOrder: 1, defaultActive: true },
    { id: 'next-action', defaultSize: 'small', defaultColumns: 5, defaultOrder: 2, defaultActive: true }
  ];
  const defaults = normalize([], visualRegistry);
  assert.deepEqual(defaults.map(x => [x.id, x.columns]), [['portfolio', 8], ['opportunities', 8], ['next-action', 5]]);
  const saved = normalize([{ id: 'portfolio', order: 2, columns: 12 }], visualRegistry);
  assert.equal(saved.find(x => x.id === 'portfolio').columns, 12);
});
