const test = require('node:test');
const assert = require('node:assert/strict');
const { historyRangeFor, classStrengthFromCache, classifyAsset } = require('../src/market-data');

test('índices usam a faixa compatível com o plano atual da Brapi', () => {
  assert.equal(historyRangeFor('^BVSP'), '3mo');
  assert.equal(historyRangeFor('IFIX'), '3mo');
  assert.equal(historyRangeFor('PETR4'), '1y');
});

test('ações preservam endpoint legado e são classificadas no pelotão correto', () => {
  const cache = { universe:{requested:2,available:2}, relativeStrength:[{symbol:'PETR4'},{symbol:'SLCE3'}], relativeStrengthByClass:{stock_ibov:{key:'stock_ibov',items:[{symbol:'PETR4'}]},stock_other:{key:'stock_other',items:[{symbol:'SLCE3',benchmark:'SMLL'}]}} };
  const classes = classStrengthFromCache(cache);
  assert.deepEqual(classes.stock.items.map(item=>item.symbol), ['PETR4','SLCE3']);
  assert.equal(classifyAsset('PETR4',cache).assetClass,'stock_ibov');
  assert.equal(classifyAsset('SLCE3',cache).assetClass,'stock_other');
});
