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

test('MarketTreemapModel: suporte a mercados B3 e US Market com FINVIZ oficial', () => {
  // Constantes de mercado
  assert.equal(MarketTreemapModel.MARKETS.B3, 'B3');
  assert.equal(MarketTreemapModel.MARKETS.US, 'US');

  // Normalização de mercado
  assert.equal(MarketTreemapModel.normalizeMarket('B3'), 'B3');
  assert.equal(MarketTreemapModel.normalizeMarket('b3'), 'B3');
  assert.equal(MarketTreemapModel.normalizeMarket('US'), 'US');
  assert.equal(MarketTreemapModel.normalizeMarket('us'), 'US');
  assert.equal(MarketTreemapModel.normalizeMarket('US_MARKET'), 'US');
  assert.equal(MarketTreemapModel.normalizeMarket('usa'), 'US');
  assert.equal(MarketTreemapModel.normalizeMarket(null), 'B3');
  assert.equal(MarketTreemapModel.normalizeMarket(''), 'B3');

  // Configuração Oficial FINVIZ
  const cfg = MarketTreemapModel.FINVIZ_CONFIG;
  assert.ok(cfg, 'FINVIZ_CONFIG deve existir');
  assert.ok(cfg.embedUrl.includes('finviz.com/widgets/map'), 'Embed URL deve apontar para o widget oficial');
  assert.ok(cfg.embedUrl.includes('wid=i8jancme'), 'Embed URL deve conter o widget ID fornecido');
  assert.ok(cfg.embedUrl.includes('st=d1'), 'Embed URL deve usar período d1 (1 Day)');
  assert.ok(cfg.creditUrl.includes('finviz.com/map'), 'Credit URL deve apontar para mapa oficial');
  assert.equal(cfg.creditText, 'Market map by FINVIZ', 'Texto de crédito oficial do FINVIZ');
  assert.equal(cfg.universe, 'S&P 500', 'Universo inicial é S&P 500');
  assert.equal(cfg.period, '1 Day', 'Período deve ser estritamente 1 Day');
  assert.notEqual(cfg.period, 'EOD', 'Regra explícita: não rotular como EOD sem validação');
});
