const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeMovement, normalizeAllocation } = require('../src/wealth');

test('normaliza aporte e retirada sem misturar os dois tipos', () => {
  assert.deepEqual(normalizeMovement({ type: 'deposit', amount: '1500', note: 'Aporte mensal' }).type, 'deposit');
  assert.deepEqual(normalizeMovement({ type: 'withdrawal', amount: 200 }).type, 'withdrawal');
  assert.throws(() => normalizeMovement({ type: 'transfer', amount: 100 }), /Tipo de movimentação/);
});

test('normaliza uma alocação com meta percentual', () => {
  const allocation = normalizeAllocation({ label: 'Trend Following', assetClass: 'Renda variável', amount: '2500', targetPct: '35' });
  assert.equal(allocation.amount, 2500);
  assert.equal(allocation.targetPct, 35);
  assert.throws(() => normalizeAllocation({ label: 'Caixa', assetClass: 'Liquidez', amount: 1, targetPct: 120 }), /Alocação-alvo/);
});
