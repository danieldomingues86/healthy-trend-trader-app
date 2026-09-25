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

test('expectedClosingDate calcula o fechamento devido considerando dias úteis e horário de fechamento', () => {
  const { previousBusinessDay, expectedClosingDate } = require('../src/market-data');
  // Segunda-feira às 14h (antes das 19h): espera fechamento da sexta-feira anterior
  assert.equal(expectedClosingDate(new Date('2026-09-14T17:00:00Z')), '2026-09-11');
  // Segunda-feira às 20h (após as 19h): espera fechamento da própria segunda-feira
  assert.equal(expectedClosingDate(new Date('2026-09-14T23:00:00Z')), '2026-09-14');
  // Domingo: espera fechamento da sexta-feira
  assert.equal(expectedClosingDate(new Date('2026-09-13T15:00:00Z')), '2026-09-11');
  // Quinta-feira às 15h: espera fechamento de quarta-feira
  assert.equal(expectedClosingDate(new Date('2026-09-17T18:00:00Z')), '2026-09-16');
  // Quinta-feira às 20h: espera fechamento de quinta-feira
  assert.equal(expectedClosingDate(new Date('2026-09-17T23:00:00Z')), '2026-09-17');
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

test('todas as 34 BDRs são reconhecidas como classe bdr', () => {
  const { assetClassForSymbol } = require('../src/market-data');
  const bdrs = [
    'ROXO34', 'MELI34', 'M1TA34', 'NVDC34', 'TSLA34', 'ITLC34', 'AMZO34', 'GOGL34',
    'MSFT34', 'M2ST34', 'SPCX34', 'TSMC34', 'P2LT34', 'ORCL34', 'MUTC34', 'AAPL34',
    'NFLX34', 'BABA34', 'LILY34', 'A1MD34', 'JPMC34', 'AVGO34', 'BOAC34', 'C2OI34',
    'COCA34', 'BERK34', 'BKNG34', 'S2GM34', 'NIKE34', 'WALM34', 'JNJB34', 'DISB34',
    'PAGS34', 'CHVX34'
  ];
  for (const symbol of bdrs) {
    assert.equal(assetClassForSymbol(symbol), 'bdr', `${symbol} deve ser classificado como bdr`);
  }
  assert.equal(bdrs.length, 34);
});

