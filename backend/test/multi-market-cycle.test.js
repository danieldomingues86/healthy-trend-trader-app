const test = require('node:test');
const assert = require('node:assert/strict');
const { b3IndexCode } = require('../src/b3-index-history');
const { marketCycleFor, resolveMarketCycle, scoreCycle, marketCycleSeries } = require('../src/market-data');

test('b3IndexCode reconhece os índices BDRX e IFIX', () => {
  assert.equal(b3IndexCode('BDRX'), 'BDRX');
  assert.equal(b3IndexCode('bdrx'), 'BDRX');
  assert.equal(b3IndexCode('IFIX'), 'IFIX');
  assert.equal(b3IndexCode('ifix'), 'IFIX');
  assert.equal(b3IndexCode('^BVSP'), 'IBOV');
});

test('marketCycleFor retorna dados independentes para stock_b3, bdr e fii sem misturar índices', () => {
  const mockCache = {
    updatedAt: '2026-09-25T12:00:00Z',
    source: 'b3-indexes',
    cycle: { state: 'healthy', score: 82, price: 180000, ema20: 178000, ema200: 170000 },
    benchmark: { symbol: 'IBOV', name: 'Índice Bovespa (IBOV)', returns: { m1: 2.5, m3: 5.1 }, history: [{ date: '20260924', close: 180000 }] },
    overview: { breadth: { leader: 15, qualified: 25, watch: 10, 'below-threshold': 50 } },
    cycles: {
      stock_b3: {
        market: 'stock_b3',
        benchmark: { symbol: 'IBOV', name: 'Índice Bovespa (IBOV)', returns: { m1: 2.5, m3: 5.1 }, history: [{ date: '20260924', close: 180000 }] },
        cycle: { state: 'healthy', score: 82, price: 180000, ema20: 178000, ema200: 170000 },
        breadth: { leader: 15, qualified: 25, watch: 10, 'below-threshold': 50 }
      },
      bdr: {
        market: 'bdr',
        benchmark: { symbol: 'BDRX', name: 'Índice de BDRs Não Patrocinados (BDRX)', returns: { m1: -1.2, m3: 0.8 }, history: [{ date: '20260924', close: 28500 }] },
        cycle: { state: 'defensive', score: 28, price: 28500, ema20: 29000, ema200: 29500 },
        breadth: null
      },
      fii: {
        market: 'fii',
        benchmark: { symbol: 'IFIX', name: 'Índice de Fundos de Investimentos Imobiliários (IFIX)', returns: { m1: 0.5, m3: 1.2 }, history: [{ date: '20260924', close: 3420 }] },
        cycle: { state: 'transition', score: 55, price: 3420, ema20: 3410, ema200: 3380 },
        breadth: null
      }
    }
  };

  // stock_b3 (padrão)
  const stockResult = marketCycleFor(mockCache, 'stock_b3');
  assert.equal(stockResult.market, 'stock_b3');
  assert.equal(stockResult.benchmark.symbol, 'IBOV');
  assert.equal(stockResult.cycle.state, 'healthy');
  assert.equal(stockResult.cycle.score, 82);
  assert.equal(stockResult.breadth.leader, 15);
  assert.deepEqual(stockResult.supportedMarkets, ['stock_b3', 'bdr', 'fii']);

  // bdr
  const bdrResult = marketCycleFor(mockCache, 'bdr');
  assert.equal(bdrResult.market, 'bdr');
  assert.equal(bdrResult.benchmark.symbol, 'BDRX');
  assert.equal(bdrResult.cycle.state, 'defensive');
  assert.equal(bdrResult.cycle.score, 28);
  assert.equal(bdrResult.breadth, null);

  // fii
  const fiiResult = marketCycleFor(mockCache, 'fii');
  assert.equal(fiiResult.market, 'fii');
  assert.equal(fiiResult.benchmark.symbol, 'IFIX');
  assert.equal(fiiResult.cycle.state, 'transition');
  assert.equal(fiiResult.cycle.score, 55);
  assert.equal(fiiResult.breadth, null);

  // Garantir que os dados não vazaram entre os três mercados
  assert.notEqual(stockResult.cycle.state, bdrResult.cycle.state);
  assert.notEqual(stockResult.cycle.state, fiiResult.cycle.state);
  assert.notEqual(bdrResult.cycle.state, fiiResult.cycle.state);
  assert.notEqual(stockResult.benchmark.symbol, fiiResult.benchmark.symbol);
});

test('resolveMarketCycle carrega histórico do IFIX sob demanda quando ausente no cache', async () => {
  const cache = {
    updatedAt: '2026-09-25T12:00:00Z',
    source: 'b3-indexes',
    cycle: { state: 'healthy', score: 82, price: 180000 },
    benchmark: { symbol: 'IBOV', history: [] }
  };

  const fiiPayload = await resolveMarketCycle(cache, 'fii');
  assert.equal(fiiPayload.market, 'fii');
  assert.equal(fiiPayload.benchmark.symbol, 'IFIX');
  assert.ok(fiiPayload.cycle, 'Ciclo do IFIX deve ter sido calculado');
  assert.ok(Number.isFinite(fiiPayload.cycle.score), 'Score do IFIX deve ser numérico');
  assert.ok(Number.isFinite(fiiPayload.cycle.price), 'Preço do IFIX deve ser numérico');
  assert.ok(['healthy', 'transition', 'defensive'].includes(fiiPayload.cycle.state), 'Regime válido para IFIX');
  assert.ok(Array.isArray(fiiPayload.benchmark.history), 'Série histórica do IFIX deve existir');
});

test('resolveMarketCycle carrega histórico do BDRX sob demanda quando ausente no cache', async () => {
  const cache = {
    updatedAt: '2026-09-25T12:00:00Z',
    source: 'b3-indexes',
    cycle: { state: 'healthy', score: 82, price: 180000 },
    benchmark: { symbol: 'IBOV', history: [] }
  };

  const bdrPayload = await resolveMarketCycle(cache, 'bdr');
  assert.equal(bdrPayload.market, 'bdr');
  assert.equal(bdrPayload.benchmark.symbol, 'BDRX');
  assert.ok(bdrPayload.cycle, 'Ciclo do BDRX deve ter sido calculado');
  assert.ok(Number.isFinite(bdrPayload.cycle.score), 'Score do BDRX deve ser numérico');
  assert.ok(Number.isFinite(bdrPayload.cycle.price), 'Preço do BDRX deve ser numérico');
  assert.ok(['healthy', 'transition', 'defensive'].includes(bdrPayload.cycle.state), 'Regime válido para BDRX');
  assert.ok(Array.isArray(bdrPayload.benchmark.history), 'Série histórica do BDRX deve existir');
});

test('scoreCycle calcula ciclos de IBOV, BDRX e IFIX de forma independente', async () => {
  const { fetchBenchmarkHistory } = require('../src/market-data');
  const [ibov, bdrx, ifix] = await Promise.all([
    fetchBenchmarkHistory('^BVSP'),
    fetchBenchmarkHistory('BDRX'),
    fetchBenchmarkHistory('IFIX')
  ]);
  const ibovCycle = scoreCycle(ibov);
  const bdrxCycle = scoreCycle(bdrx);
  const ifixCycle = scoreCycle(ifix);

  assert.ok(ibovCycle.ema10, 'IBOV deve calcular EMA 10');
  assert.ok(bdrxCycle.ema10, 'BDRX deve calcular EMA 10');
  assert.ok(ifixCycle.ema10, 'IFIX deve calcular EMA 10');
  assert.ok(Number.isFinite(ifixCycle.score), 'Score do IFIX deve ser numérico');
  assert.ok(['healthy', 'transition', 'defensive'].includes(ifixCycle.state), 'Estado do IFIX deve ser válido');
});

