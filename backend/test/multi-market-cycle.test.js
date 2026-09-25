const test = require('node:test');
const assert = require('node:assert/strict');
const { b3IndexCode } = require('../src/b3-index-history');
const { marketCycleFor, resolveMarketCycle, scoreCycle, marketCycleSeries } = require('../src/market-data');

test('b3IndexCode reconhece o índice BDRX', () => {
  assert.equal(b3IndexCode('BDRX'), 'BDRX');
  assert.equal(b3IndexCode('bdrx'), 'BDRX');
  assert.equal(b3IndexCode('^BVSP'), 'IBOV');
});

test('marketCycleFor retorna dados independentes para stock_b3 e bdr sem misturar índices', () => {
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

  // bdr
  const bdrResult = marketCycleFor(mockCache, 'bdr');
  assert.equal(bdrResult.market, 'bdr');
  assert.equal(bdrResult.benchmark.symbol, 'BDRX');
  assert.equal(bdrResult.cycle.state, 'defensive');
  assert.equal(bdrResult.cycle.score, 28);
  assert.equal(bdrResult.breadth, null);

  // Garantir que os dados não vazaram entre os mercados
  assert.notEqual(stockResult.cycle.state, bdrResult.cycle.state);
  assert.notEqual(stockResult.cycle.score, bdrResult.cycle.score);
  assert.notEqual(stockResult.benchmark.symbol, bdrResult.benchmark.symbol);
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

test('scoreCycle diferencia mercado em expansão de mercado em recuo de curto prazo', async () => {
  const { fetchBenchmarkHistory } = require('../src/market-data');
  const [ibov, bdrx] = await Promise.all([fetchBenchmarkHistory('^BVSP'), fetchBenchmarkHistory('BDRX')]);
  const ibovCycle = scoreCycle(ibov);
  const bdrxCycle = scoreCycle(bdrx);

  assert.ok(ibovCycle.ema10, 'IBOV deve calcular EMA 10');
  assert.ok(bdrxCycle.ema10, 'BDRX deve calcular EMA 10');
  assert.equal(ibovCycle.above10, false, 'IBOV recuou abaixo da EMA 10');
  assert.equal(bdrxCycle.above10, true, 'BDRX está acima da EMA 10');
  assert.notEqual(ibovCycle.score, bdrxCycle.score, 'Scores de IBOV e BDRX não devem ser idênticos');
  assert.ok(bdrxCycle.score > ibovCycle.score, 'BDRX (em expansão) deve ter score maior que IBOV (em recuo)');
});

