const test = require('node:test');
const assert = require('node:assert/strict');
const instruments = require('./instrument-catalog');

test('catálogo separa futuros de ações acompanhadas', () => {
  const stocks = [{ symbol: 'WEGE3', name: 'WEG', score: 99 }];
  const futures = instruments.forMarket('Futuros', stocks);
  assert.ok(futures.some(item => item.symbol === 'WDO'));
  assert.ok(futures.some(item => item.symbol === 'WIN'));
  assert.ok(!futures.some(item => item.symbol === 'WEGE3'));
  const actions = instruments.forMarket('Ações', stocks);
  assert.ok(actions.some(item => item.symbol === 'WEGE3'));
  assert.ok(actions.some(item => item.symbol === 'PETR4'));
  assert.ok(!actions.some(item => item.symbol === 'WDO'));
});

test('catálogo só reconhece o símbolo dentro do mercado correto', () => {
  const stocks = [{ symbol: 'PETR4', name: 'Petrobras' }];
  assert.equal(instruments.belongsToMarket('WDO', 'Futuros', stocks), true);
  assert.equal(instruments.belongsToMarket('PETR4', 'Futuros', stocks), false);
  assert.equal(instruments.belongsToMarket('PETR4', 'Ações', stocks), true);
});

test('Blacklist reconhece contratos da mesma família de futuros', () => {
  const rule = { market: 'Futuros', symbol: ' wdo ' };
  for (const symbol of ['WDO', 'wdofut', 'WDOQ26', 'WDOV26', 'WDOZ26']) {
    assert.equal(instruments.matchesBlacklistRule({ market: 'Futuros', symbol }, rule), true, symbol);
  }
  assert.equal(instruments.belongsToMarket('WDOQ26', 'Futuros'), true);
  assert.equal(instruments.find('WDOQ26', 'Futuros').name, 'Mini Dólar');
});

test('matching por família exige o mesmo mercado e não usa prefixo genérico', () => {
  const futureRule = { market: 'Futuros', symbol: 'WDO' };
  assert.equal(instruments.matchesBlacklistRule({ market: 'Ações', symbol: 'WDO' }, futureRule), false);
  assert.equal(instruments.matchesBlacklistRule({ market: 'Futuros', symbol: 'WDOXYZ' }, futureRule), false);
  assert.equal(instruments.matchesBlacklistRule({ market: 'Ações', symbol: 'PETR4' }, { market: 'Ações', symbol: 'PETR' }), false);
});
