const test = require('node:test');
const assert = require('node:assert/strict');
const { historyRangeFor } = require('../src/market-data');

test('índices usam a faixa compatível com o plano atual da Brapi', () => {
  assert.equal(historyRangeFor('^BVSP'), '3mo');
  assert.equal(historyRangeFor('IFIX'), '3mo');
  assert.equal(historyRangeFor('PETR4'), '1y');
});
