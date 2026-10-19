const test = require('node:test');
const assert = require('node:assert/strict');

const MarketTreemapModel = require('./market-treemap-model');

test('MarketTreemapModel: layoutTreemap particiona área proporcionalmente aos pesos', () => {
  const items = [
    { ticker: 'PETR4', marketCap: 500 },
    { ticker: 'VALE3', marketCap: 300 },
    { ticker: 'ITUB4', marketCap: 200 }
  ];

  const layout = MarketTreemapModel.layoutTreemap(items, 1000, 500, 2);

  assert.equal(layout.length, 3);
  assert.equal(layout[0].ticker, 'PETR4');
  assert.equal(layout[1].ticker, 'VALE3');
  assert.equal(layout[2].ticker, 'ITUB4');

  // Área de PETR4 deve ser maior que VALE3 e ITUB4
  const area0 = layout[0].w * layout[0].h;
  const area1 = layout[1].w * layout[1].h;
  const area2 = layout[2].w * layout[2].h;

  assert.ok(area0 > area1, 'Área 0 maior que Área 1');
  assert.ok(area1 > area2, 'Área 1 maior que Área 2');
});

test('MarketTreemapModel: layoutTreemap lida com lista vazia ou dimensões zero', () => {
  assert.deepEqual(MarketTreemapModel.layoutTreemap([], 500, 300), []);
  assert.deepEqual(MarketTreemapModel.layoutTreemap([{ ticker: 'A', marketCap: 100 }], 0, 300), []);
  assert.deepEqual(MarketTreemapModel.layoutTreemap([{ ticker: 'A', marketCap: 100 }], 500, 0), []);
});

test('MarketTreemapModel: layoutTreemap lida com item único preenchendo o contêiner', () => {
  const items = [{ ticker: 'SOLO3', marketCap: 100 }];
  const layout = MarketTreemapModel.layoutTreemap(items, 400, 200, 2);

  assert.equal(layout.length, 1);
  assert.equal(layout[0].x, 0);
  assert.equal(layout[0].y, 0);
  assert.equal(layout[0].w, 398); // 400 - gap(2)
  assert.equal(layout[0].h, 198); // 200 - gap(2)
});

test('MarketTreemapModel: filterStocks filtra corretamente por universo, setor e busca', () => {
  const stocks = [
    { ticker: 'PETR4', name: 'Petrobras', sector: 'Petróleo, Gás e Biocombustíveis', isIbov: true, isSmallCap: false },
    { ticker: 'VALE3', name: 'Vale', sector: 'Materiais Básicos', isIbov: true, isSmallCap: false },
    { ticker: 'TUPY3', name: 'Tupy', sector: 'Bens Industriais', isIbov: false, isSmallCap: true },
    { ticker: 'MGLU3', name: 'Magazine Luiza', sector: 'Consumo Cíclico', isIbov: true, isSmallCap: true }
  ];

  // Filtro IBOV
  const ibovOnly = MarketTreemapModel.filterStocks(stocks, { universe: 'IBOV' });
  assert.equal(ibovOnly.length, 3);
  assert.ok(ibovOnly.every(s => s.isIbov));

  // Filtro SMALL
  const smallOnly = MarketTreemapModel.filterStocks(stocks, { universe: 'SMALL' });
  assert.equal(smallOnly.length, 2);
  assert.ok(smallOnly.every(s => s.isSmallCap));

  // Filtro Setor
  const matOnly = MarketTreemapModel.filterStocks(stocks, { sector: 'Materiais Básicos' });
  assert.equal(matOnly.length, 1);
  assert.equal(matOnly[0].ticker, 'VALE3');

  // Filtro Busca
  const searchMatch = MarketTreemapModel.filterStocks(stocks, { search: 'petr' });
  assert.equal(searchMatch.length, 1);
  assert.equal(searchMatch[0].ticker, 'PETR4');
});

test('MarketTreemapModel: getColorForReturn produz cores esperadas nos extremos e centro', () => {
  assert.equal(MarketTreemapModel.getColorForReturn(-15), 'rgb(127, 29, 29)');
  assert.equal(MarketTreemapModel.getColorForReturn(15), 'rgb(34, 197, 94)');
  assert.equal(MarketTreemapModel.getColorForReturn(0), 'rgb(45, 55, 72)');
  assert.equal(MarketTreemapModel.getColorForReturn(null), '#1e293b');
});
