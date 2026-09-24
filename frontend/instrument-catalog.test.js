const test = require('node:test');
const assert = require('node:assert/strict');
const instruments = require('./instrument-catalog');

test('catálogo separa futuros de ações acompanhadas', () => {
  const stocks = [{ symbol: 'WEGE3', name: 'WEG', score: 99 }];
  const futures = instruments.forMarket('Futuros', stocks);
  assert.ok(futures.some(item => item.symbol === 'WDO'));
  assert.ok(futures.some(item => item.symbol === 'WIN'));
  assert.ok(!futures.some(item => item.symbol === 'WEGE3'));
  assert.deepEqual(instruments.forMarket('Ações', stocks).map(item => item.symbol), ['WEGE3']);
});

test('catálogo só reconhece o símbolo dentro do mercado correto', () => {
  const stocks = [{ symbol: 'PETR4', name: 'Petrobras' }];
  assert.equal(instruments.belongsToMarket('WDO', 'Futuros', stocks), true);
  assert.equal(instruments.belongsToMarket('PETR4', 'Futuros', stocks), false);
  assert.equal(instruments.belongsToMarket('PETR4', 'Ações', stocks), true);
});
