const test = require('node:test');
const assert = require('node:assert/strict');
const marketCentral = require('../src/market-central');

test('market-central: calculateMarketBreadth calcula métricas reais sem inventar dados', () => {
  const mockAssets = [
    {
      symbol: 'PETR4',
      scan: { price: 38.5, ema20: 36.0, ema50: 35.0, ema200: 32.0, healthyTrend: true, dayChangePct: 1.5 }
    },
    {
      symbol: 'VALE3',
      scan: { price: 60.0, ema20: 62.0, ema50: 63.0, ema200: 65.0, healthyTrend: false, dayChangePct: -1.2 }
    },
    {
      symbol: 'ITUB4',
      scan: { price: 35.0, ema20: 34.0, ema50: 33.5, ema200: 30.0, healthyTrend: true, dayChangePct: 0.8 }
    },
    {
      symbol: 'WEGE3',
      scan: { price: 50.0, ema20: 48.0, ema50: 52.0, ema200: 45.0, healthyTrend: false, dayChangePct: -0.5 }
    }
  ];

  const breadth = marketCentral.calculateMarketBreadth(mockAssets);

  assert.equal(breadth.totalEligible, 4);
  assert.equal(breadth.dataAvailable, true);
  // above20: PETR4, ITUB4, WEGE3 -> 3 de 4 = 75%
  assert.equal(breadth.aboveEma20Pct, 75);
  // above50: PETR4, ITUB4 -> 2 de 4 = 50%
  assert.equal(breadth.aboveEma50Pct, 50);
  // above200: PETR4, ITUB4, WEGE3 -> 3 de 4 = 75%
  assert.equal(breadth.aboveEma200Pct, 75);
  // positiveTrend: PETR4, ITUB4, WEGE3 -> 3 de 4 = 75%
  assert.equal(breadth.positiveTrendPct, 75);
  // advances: PETR4, ITUB4 -> 2 de 4 = 50%
  assert.equal(breadth.advancePct, 50);
  // declines: VALE3, WEGE3 -> 2 de 4 = 50%
  assert.equal(breadth.declinePct, 50);
});

test('market-central: buildSectorMarketMap agrupa e calcula desempenho setorial corretamente', () => {
  const mockAssets = [
    { symbol: 'PETR4', sector: 'Petróleo e Gás', score: 85, trendTemplate: 'leader', scan: { price: 38, dayChangePct: 3.0 } },
    { symbol: 'PRIO3', sector: 'Petróleo e Gás', score: 80, scan: { price: 45, dayChangePct: 2.0 } },
    { symbol: 'VALE3', sector: 'Mineração', score: 60, scan: { price: 60, dayChangePct: 1.5 } },
    { symbol: 'ITUB4', sector: 'Financeiro', score: 75, scan: { price: 35, dayChangePct: -0.5 } }
  ];

  const sectors = marketCentral.buildSectorMarketMap(mockAssets);
  assert.ok(Array.isArray(sectors));
  assert.equal(sectors.length, 3);

  const petroleo = sectors.find(s => s.name === 'Petróleo e Gás');
  assert.ok(petroleo);
  assert.equal(petroleo.assetsCount, 2);
  assert.equal(petroleo.changePct, 2.5); // (3.0 + 2.0) / 2 = 2.5%
  assert.equal(petroleo.leadersCount, 2);
  assert.equal(petroleo.topAssets.length, 2);
});

test('market-central: getMarketCentralData retorna pacote consolidado com todas as 6 seções', async () => {
  const mockCache = {
    updatedAt: new Date().toISOString(),
    source: 'test-cache',
    overview: {
      benchmarkHistory: [{ date: '2026-10-10', close: 130000 }]
    },
    relativeStrength: [
      { symbol: 'PETR4', sector: 'Petróleo e Gás', score: 85, scan: { price: 38, ema20: 36, ema50: 35, ema200: 30, healthyTrend: true, dayChangePct: 2.5 } },
      { symbol: 'VALE3', sector: 'Mineração', score: 65, scan: { price: 60, ema20: 62, ema50: 61, ema200: 65, healthyTrend: false, dayChangePct: -1.0 } }
    ]
  };

  const data = await marketCentral.getMarketCentralData({ market: 'stock_b3', universe: 'stock_b3', cache: mockCache });

  assert.equal(data.success, true);
  // 1. Regime
  assert.ok(data.regime);
  assert.ok(typeof data.regime.score === 'number');
  assert.ok(data.regime.label);
  // 2. Breadth
  assert.ok(data.breadth);
  assert.equal(data.breadth.totalEligible, 2);
  // 3. Globais
  assert.ok(Array.isArray(data.globalMarkets));
  assert.ok(data.globalMarkets.length >= 7);
  // 4. Map
  assert.ok(Array.isArray(data.marketMap));
  assert.equal(data.marketMap.length, 2);
  // 5. Eventos
  assert.ok(Array.isArray(data.events));
  assert.ok(data.events.length > 0);
  // 6. Notícias
  assert.ok(Array.isArray(data.news));
});
