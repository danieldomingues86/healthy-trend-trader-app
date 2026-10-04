const test = require('node:test');
const assert = require('node:assert/strict');
const tickerChart = require('../src/ticker-chart');

test('ticker-chart: formatação de números grandes', () => {
  assert.equal(tickerChart.formatLargeNumber(1500000000000), 'R$ 1,5 tri');
  assert.equal(tickerChart.formatLargeNumber(506800000000), 'R$ 506,8 bi');
  assert.equal(tickerChart.formatLargeNumber(52400000), 'R$ 52,4 mi');
  assert.equal(tickerChart.formatLargeNumber(0), '—');
});

test('ticker-chart: universo pesquisável retorna ativos estruturados', async () => {
  const universe = await tickerChart.getSearchUniverse();
  assert.ok(Array.isArray(universe));
  assert.ok(universe.length > 50);

  const petr4 = universe.find(x => x.symbol === 'PETR4');
  assert.ok(petr4);
  assert.equal(petr4.symbol, 'PETR4');
  assert.ok(petr4.name);
  assert.ok(petr4.sector);
});

test('ticker-chart: getTickerChartData retorna pacote analítico completo para PETR4', async () => {
  const data = await tickerChart.getTickerChartData('PETR4');

  // 1. Ticker info
  assert.equal(data.tickerInfo.symbol, 'PETR4');
  assert.ok(data.tickerInfo.price > 0);
  assert.ok(data.tickerInfo.sessionDate);
  assert.ok(data.tickerInfo.marketCapFormatted);

  // 2. OHLC Candles
  assert.ok(Array.isArray(data.ohlc));
  assert.ok(data.ohlc.length > 100);
  const candle = data.ohlc[0];
  assert.ok(candle.time);
  assert.ok(candle.open > 0);
  assert.ok(candle.high > 0);
  assert.ok(candle.low > 0);
  assert.ok(candle.close > 0);

  // 3. Indicadores (EMA 9, EMA 30, ATR)
  assert.ok(data.indicators.ema9.length > 0);
  assert.ok(data.indicators.ema30.length > 0);
  assert.ok(data.indicators.atr21 > 0);
  assert.ok(data.indicators.atrPct > 0);

  // 4. Força Relativa
  assert.ok(data.relativeStrength.score >= 0);
  assert.ok(data.relativeStrength.classification);

  // 5. Ciclo de mercado
  assert.ok(data.marketCycle.regime);

  // 6. Tendência e Estrutura
  assert.ok(data.trend.status);
  assert.ok(data.structure.label);

  // 7. Gatilho
  assert.ok(data.trigger.id);
  assert.ok(data.trigger.name);
  assert.equal(typeof data.trigger.hasTrigger, 'boolean');

  // 8. Rubric
  assert.ok(data.rubric.finalGrade);
  assert.ok(Array.isArray(data.rubric.criteria));
  assert.equal(data.rubric.criteria.length, 8);

  // 9. Fundamentos e Liquidez
  assert.ok(data.fundamentals.roe);
  assert.ok(data.liquidity.volumeAvg21Formatted);
  assert.ok(data.context.title);
});

test('ticker-chart: rejeita símbolo vazio', async () => {
  await assert.rejects(
    async () => tickerChart.getTickerChartData(''),
    /Símbolo do ticker não fornecido/
  );
});

test('ticker-chart: ativo fraco (VALE3) retorna Grade D e classificação Fraco com bloqueio nominal', async () => {
  const data = await tickerChart.getTickerChartData('VALE3');
  assert.equal(data.tickerInfo.symbol, 'VALE3');
  assert.equal(data.relativeStrength.score, 12);
  assert.equal(data.relativeStrength.classification, 'Fraco');
  assert.equal(data.rubric.finalGrade, 'D');
  assert.ok(data.rubric.summaryText.includes('Bloqueio automático com risco nominal zero'));
  const rsCriteria = data.rubric.criteria.find(c => c.name === 'Força Relativa');
  assert.ok(rsCriteria);
  assert.equal(rsCriteria.status, false);
});

test('ticker-chart: ativo da Nasdaq (AAPL) resolve benchmark BDRX e classe Nasdaq', async () => {
  const data = await tickerChart.getTickerChartData('AAPL');
  assert.equal(data.tickerInfo.symbol, 'AAPL');
  assert.equal(data.tickerInfo.assetClass, 'Nasdaq');
  assert.equal(data.marketCycle.benchmark, 'BDRX');
  assert.ok(data.marketCycle.regime);
  assert.ok(data.marketCycle.score > 0);
  assert.notEqual(data.marketCycle.benchmark, 'IBOV');
});

test('ticker-chart: ativo BDR (AAPL34) resolve benchmark BDRX e classe BDR', async () => {
  const data = await tickerChart.getTickerChartData('AAPL34');
  assert.equal(data.tickerInfo.symbol, 'AAPL34');
  assert.equal(data.tickerInfo.assetClass, 'BDR');
  assert.equal(data.marketCycle.benchmark, 'BDRX');
  assert.ok(data.marketCycle.regime);
  assert.notEqual(data.marketCycle.benchmark, 'IBOV');
});

test('ticker-chart: ação B3 (PETR4) resolve benchmark IBOV e classe B3', async () => {
  const data = await tickerChart.getTickerChartData('PETR4');
  assert.equal(data.tickerInfo.symbol, 'PETR4');
  assert.equal(data.tickerInfo.assetClass, 'B3');
  assert.equal(data.marketCycle.benchmark, 'IBOV');
  assert.ok(data.marketCycle.regime);
  assert.ok(data.marketCycle.score > 0);
});

test('ticker-chart: FII (HGLG11) resolve benchmark IFIX e classe FII', async () => {
  const data = await tickerChart.getTickerChartData('HGLG11');
  assert.equal(data.tickerInfo.symbol, 'HGLG11');
  assert.equal(data.tickerInfo.assetClass, 'FII');
  assert.equal(data.marketCycle.benchmark, 'IFIX');
  assert.ok(data.marketCycle.regime);
  assert.notEqual(data.marketCycle.benchmark, 'IBOV');
});
