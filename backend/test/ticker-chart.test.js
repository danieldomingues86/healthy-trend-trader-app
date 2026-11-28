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
  assert.ok(Array.isArray(data.indicators.sma7) && data.indicators.sma7.length > 0);
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
  assert.equal(data.rubric.criteria.length, 9);
  assert.ok(data.rubric.criteria.some(c => c.name === 'Negócios por dia'), 'Deve conter o critério Negócios por dia');

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
  assert.ok(data.relativeStrength.score <= 40, `Score esperado <= 40 para ativo fraco, recebido ${data.relativeStrength.score}`);
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

test('ticker-chart: avaliação de fundamentos reflete FundamentalScore oficial para MGLU3 (Fraco) e PETR4 (Forte)', async () => {
  const mglu = await tickerChart.getTickerChartData('MGLU3');
  assert.equal(mglu.tickerInfo.symbol, 'MGLU3');
  assert.equal(mglu.fundamentals.classification, 'FRACO');
  assert.equal(mglu.fundamentals.evaluation, 'Fraco');
  assert.equal(mglu.fundamentals.status, 'bad');
  assert.ok(mglu.fundamentals.score >= 4.0 && mglu.fundamentals.score <= 5.0);
  const mgluFundCriteria = mglu.rubric.criteria.find(c => c.name === 'Fundamentos');
  assert.ok(mgluFundCriteria);
  assert.equal(mgluFundCriteria.status, false);
  assert.equal(mgluFundCriteria.obs, 'Fraco');

  const petr = await tickerChart.getTickerChartData('PETR4');
  assert.equal(petr.tickerInfo.symbol, 'PETR4');
  assert.equal(petr.fundamentals.classification, 'BOM');
  assert.equal(petr.fundamentals.evaluation, 'Forte');
  assert.equal(petr.fundamentals.status, 'good');
  assert.ok(petr.fundamentals.score >= 7.0);
  const petrFundCriteria = petr.rubric.criteria.find(c => c.name === 'Fundamentos');
  assert.ok(petrFundCriteria);
  assert.equal(petrFundCriteria.status, true);
  assert.equal(petrFundCriteria.obs, 'Forte');
});

test('ticker-chart: expõe bdrInfo para BDRs (StockCharts + Earnings) e mantém nulo para ações nacionais', async () => {
  const nvdc = await tickerChart.getTickerChartData('NVDC34');
  assert.equal(nvdc.tickerInfo.symbol, 'NVDC34');
  assert.equal(nvdc.tickerInfo.isBdr, true);
  assert.equal(nvdc.tickerInfo.originalSymbol, 'NVDA');
  assert.ok(nvdc.bdrInfo);
  assert.equal(nvdc.bdrInfo.underlyingSymbol, 'NVDA');
  assert.equal(nvdc.bdrInfo.stockChartsUrl, 'https://stockcharts.com/acp/?s=NVDA');

  const petr = await tickerChart.getTickerChartData('PETR4');
  assert.equal(petr.tickerInfo.isBdr, false);
  assert.equal(petr.tickerInfo.originalSymbol, null);
  assert.equal(petr.bdrInfo, null);
});

test('ticker-chart: Ciclo de Mercado e Estrutura apresentam condições objetivas e regimes canônicos (sem rótulo Expansão)', async () => {
  // 1. TIMS3: Estrutura em Alta com alta volatilidade (Up & Volatile) e Ciclo do IBOV
  const tims = await tickerChart.getTickerChartData('TIMS3');
  assert.notEqual(tims.marketCycle.regime, 'Expansão');
  assert.notEqual(tims.structure.label, 'Expansão');
  assert.ok(
    tims.marketCycle.regime === 'Média 10 > Média 30' || tims.marketCycle.regime === 'Média 10 ≤ Média 30',
    `Ciclo esperado Média 10 > Média 30 ou Média 10 ≤ Média 30, recebido: ${tims.marketCycle.regime}`
  );
  assert.equal(tims.structure.label, 'Alta com alta volatilidade (Up & Volatile)');
  assert.equal(tims.structure.regimeCode, 'UP_VOLATILE');
  assert.equal(tims.structure.status, 'alert');

  // Critérios da Rubric nunca apresentam rótulo genérico Expansão
  const timsCycleCrit = tims.rubric.criteria.find(c => c.name === 'Ciclo de Mercado');
  assert.ok(timsCycleCrit);
  assert.notEqual(timsCycleCrit.obs, 'Expansão');
  assert.equal(timsCycleCrit.obs, tims.marketCycle.regime);

  const timsStructCrit = tims.rubric.criteria.find(c => c.name === 'Estrutura');
  assert.ok(timsStructCrit);
  assert.notEqual(timsStructCrit.obs, 'Expansão');
  assert.equal(timsStructCrit.obs, 'Alta com alta volatilidade (Up & Volatile)');

  // 2. DESK3: Estrutura em Alta com baixa volatilidade (Up & Quiet)
  const desk = await tickerChart.getTickerChartData('DESK3');
  assert.notEqual(desk.structure.label, 'Expansão');
  assert.equal(desk.structure.label, 'Alta com baixa volatilidade (Up & Quiet)');
  assert.equal(desk.structure.regimeCode, 'UP_QUIET');
  assert.equal(desk.structure.status, 'good');

  // SBSP3: Estrutura em transição/repique (Preço > EMAs, porém EMA 10 < EMA 72 => Sideways)
  const sbsp = await tickerChart.getTickerChartData('SBSP3');
  assert.notEqual(sbsp.structure.label, 'Expansão');
  assert.equal(sbsp.structure.label, 'Mercado lateral (Sideways)');
  assert.equal(sbsp.structure.status, 'neutral');

  // 3. PETR4: Estrutura em Baixa com alta volatilidade (Down & Volatile)
  const petr = await tickerChart.getTickerChartData('PETR4');
  assert.notEqual(petr.structure.label, 'Expansão');
  assert.equal(petr.structure.label, 'Baixa com alta volatilidade (Down & Volatile)');
  assert.equal(petr.structure.regimeCode, 'DOWN_VOLATILE');
  assert.equal(petr.structure.status, 'bad');

  // 4. VALE3: Estrutura em Baixa com alta volatilidade (Down & Volatile)
  const vale = await tickerChart.getTickerChartData('VALE3');
  assert.notEqual(vale.structure.label, 'Expansão');
  assert.equal(vale.structure.label, 'Baixa com alta volatilidade (Down & Volatile)');
  assert.equal(vale.structure.regimeCode, 'DOWN_VOLATILE');
  assert.equal(vale.structure.status, 'bad');
});


