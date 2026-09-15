const test = require('node:test');
const assert = require('node:assert/strict');
const { historyRangeFor, classStrengthFromCache, classifyAsset, historyDate, hasCurrentHistoricalClose, marketCycleSeries } = require('../src/market-data');

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

test('coleta após o fechamento só é final quando inclui o pregão atual da B3', () => {
  const now = new Date('2026-09-14T22:00:00Z');
  assert.equal(historyDate('20260914'), '2026-09-14');
  assert.equal(hasCurrentHistoricalClose({ overview: { benchmarkHistory: [{ date: '20260911' }] } }, now), false);
  assert.equal(hasCurrentHistoricalClose({ overview: { benchmarkHistory: [{ date: '20260914' }] } }, now), true);
});

test('série do Ciclo de Mercado é derivada do histórico real sem inventar observações', () => {
  const history = Array.from({ length: 230 }, (_, index) => ({
    date: `2026${String(Math.floor(index / 28) + 1).padStart(2, '0')}${String(index % 28 + 1).padStart(2, '0')}`,
    close: 100000 + index * 100
  }));
  const series = marketCycleSeries(history);
  assert.equal(series.length, history.length - 24);
  assert.equal(series.at(-1).date, history.at(-1).date);
  assert.equal(series.at(-1).close, history.at(-1).close);
  assert.ok(Number.isFinite(series.at(-1).ema20));
  assert.ok(Number.isFinite(series.at(-1).ema200));
  assert.equal(series.at(-1).atr21, null);
});
