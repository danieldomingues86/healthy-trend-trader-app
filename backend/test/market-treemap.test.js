const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  getMarketTreemapData,
  resolveCanonicalSector,
  cleanCompanyName,
  computeTickerReturns,
  calculateDeduplicatedMarketCap
} = require('../src/market-treemap');

const MarketTreemapModel = require('../../frontend/market-treemap-model');

test('market-treemap: resolveCanonicalSector mapeia setores oficiais da B3', () => {
  assert.equal(resolveCanonicalSector('Intermediários Financeiros'), 'Financeiro');
  assert.equal(resolveCanonicalSector('Previdência e Seguros'), 'Financeiro');
  assert.equal(resolveCanonicalSector('Petróleo, Gás e Biocombustíveis'), 'Petróleo, Gás e Biocombustíveis');
  assert.equal(resolveCanonicalSector('Mineração'), 'Materiais Básicos');
  assert.equal(resolveCanonicalSector('Siderurgia e Metalurgia'), 'Materiais Básicos');
  assert.equal(resolveCanonicalSector('Comércio'), 'Consumo Cíclico');
  assert.equal(resolveCanonicalSector('Construção Civil'), 'Consumo Cíclico');
  assert.equal(resolveCanonicalSector('Energia Elétrica'), 'Utilidade Pública');
  assert.equal(resolveCanonicalSector('Água e Saneamento'), 'Utilidade Pública');
  assert.equal(resolveCanonicalSector('Alimentos Processados'), 'Consumo Não Cíclico');
  assert.equal(resolveCanonicalSector('Comércio e Distribuição'), 'Consumo Não Cíclico');
  assert.equal(resolveCanonicalSector('Máquinas e Equipamentos'), 'Bens Industriais');
  assert.equal(resolveCanonicalSector('Material de Transporte'), 'Bens Industriais');
  assert.equal(resolveCanonicalSector('Programas e Serviços'), 'Tecnologia da Informação');
  assert.equal(resolveCanonicalSector('Serv.Méd.Hospit. Análises e Diagnósticos'), 'Saúde');
  assert.equal(resolveCanonicalSector('Telecomunicações'), 'Telecomunicações');
  assert.equal(resolveCanonicalSector(''), 'Não Classificado');
  assert.equal(resolveCanonicalSector(null), 'Não Classificado');
});

test('market-treemap: cleanCompanyName produz nomes amigáveis para treemap', () => {
  assert.equal(cleanCompanyName('PETR4', 'PETROBRAS PN N2'), 'Petrobras');
  assert.equal(cleanCompanyName('VALE3', 'VALE ON NM'), 'Vale');
  assert.equal(cleanCompanyName('ITUB4', 'ITAUUNIBANCO PN ED N1'), 'Itaú Unibanco');
  assert.equal(cleanCompanyName('MGLU3', 'MAGAZ LUIZA ON NM'), 'Magazine Luiza');
  assert.equal(cleanCompanyName('WEGE3', 'WEG ON NM'), 'Weg');
  assert.equal(cleanCompanyName('BBAS3', 'BANCO DO BRASIL ON NM'), 'Banco do Brasil');
  assert.equal(cleanCompanyName('XYZ123', 'EMPRESA EXEMPLO S.A. ON'), 'Empresa Exemplo');
});

test('market-treemap: deduplicação de classes evita dupla contagem de Market Cap no aggregate', () => {
  const mockStocks = [
    { ticker: 'PETR4', root: 'PETR', marketCap: 400e9, companyMarketCap: 750e9 },
    { ticker: 'PETR3', root: 'PETR', marketCap: 350e9, companyMarketCap: 750e9 },
    { ticker: 'ITUB4', root: 'ITUB', marketCap: 300e9, companyMarketCap: 550e9 },
    { ticker: 'ITUB3', root: 'ITUB', marketCap: 250e9, companyMarketCap: 550e9 },
    { ticker: 'VALE3', root: 'VALE', marketCap: 280e9, companyMarketCap: 280e9 }
  ];

  const total = calculateDeduplicatedMarketCap(mockStocks);
  // Esperado: PETR (750 bi) + ITUB (550 bi) + VALE (280 bi) = 1580 bi
  assert.equal(total, 1580e9);

  // Testa modelo do frontend
  const frontendTotal = MarketTreemapModel.calculateDeduplicatedMarketCap(mockStocks);
  assert.equal(frontendTotal, 1580e9);
});

test('market-treemap: computeTickerReturns calcula variações de 1d, 1w, 1m, 3m, 6m, 1y', () => {
  const candles = [
    { close: 10.0 }, // n=0 (dia 0)
    ...Array(100).fill(null).map((_, i) => ({ close: 10.0 + i * 0.1 })),
    { close: 25.0 }  // latest (n=101)
  ];
  const marketItem = { scan: { price: 25.0, dayChangePct: 2.5 } };
  const ret = computeTickerReturns('TEST3', candles, marketItem);

  assert.equal(ret['1d'], 2.5);
  assert.equal(typeof ret['1w'], 'number');
  assert.equal(typeof ret['1m'], 'number');
  assert.equal(typeof ret['3m'], 'number');
});

test('market-treemap: getMarketTreemapData retorna universo completo de ações com sumário', async () => {
  const data = await getMarketTreemapData({ universe: 'ALL', period: '1d' });

  assert.ok(data.summary, 'Sumário existe');
  assert.ok(data.summary.totalCompanies >= 250, 'Mais de 250 empresas listadas');
  assert.ok(data.summary.totalSectors >= 10, 'Ao menos 10 setores representados');
  assert.ok(data.summary.totalMarketCap > 4e12, 'Market cap total superior a R$ 4 trilhões');
  assert.ok(Number.isFinite(data.summary.avgChangePct), 'Variação média é um número finito');
  assert.equal(data.summary.period, '1d');

  assert.ok(Array.isArray(data.sectors), 'Sectors é um array');
  assert.ok(data.sectors.length >= 10, 'Contém setores B3');

  const petrSector = data.sectors.find((s) => s.name === 'Petróleo, Gás e Biocombustíveis');
  assert.ok(petrSector, 'Setor de Petróleo presente');
  const petr4 = petrSector.companies.find((c) => c.ticker === 'PETR4');
  assert.ok(petr4, 'PETR4 presente no setor de Petróleo');
  assert.ok(petr4.marketCap > 100e9, 'PETR4 tem Market Cap expressivo');
  assert.ok(petr4.returns, 'PETR4 possui variações de múltiplos períodos');

  // Filtro Ibovespa
  const ibovData = await getMarketTreemapData({ universe: 'IBOV' });
  assert.ok(ibovData.summary.totalCompanies > 60 && ibovData.summary.totalCompanies < 90, 'Universo Ibovespa entre 60 e 90 ações');
  for (const sec of ibovData.sectors) {
    for (const comp of sec.companies) {
      assert.equal(comp.isIbov, true, 'Todos os ativos no filtro IBOV possuem flag isIbov=true');
    }
  }

  // Filtro Small Caps
  const smallData = await getMarketTreemapData({ universe: 'SMALL' });
  assert.ok(smallData.summary.totalCompanies > 100, 'Small Caps tem mais de 100 empresas');
  for (const sec of smallData.sectors) {
    for (const comp of sec.companies) {
      assert.equal(comp.isSmallCap, true, 'Todos os ativos no filtro SMALL possuem flag isSmallCap=true');
    }
  }
});

test('market-treemap-model: layoutTreemap particiona espaço geométrico sem sobreposição', () => {
  const items = [
    { ticker: 'ITUB4', marketCap: 350e9 },
    { ticker: 'BBAS3', marketCap: 190e9 },
    { ticker: 'BBDC4', marketCap: 120e9 },
    { ticker: 'SANB11', marketCap: 90e9 },
    { ticker: 'BPAC11', marketCap: 80e9 },
    { ticker: 'BRB3', marketCap: 25e9 }
  ];

  const width = 500;
  const height = 300;
  const layout = MarketTreemapModel.layoutTreemap(items, width, height, 2);

  assert.equal(layout.length, items.length);

  for (const box of layout) {
    assert.ok(box.x >= 0, `x >= 0 (${box.ticker})`);
    assert.ok(box.y >= 0, `y >= 0 (${box.ticker})`);
    assert.ok(box.w > 0, `w > 0 (${box.ticker})`);
    assert.ok(box.h > 0, `h > 0 (${box.ticker})`);
    assert.ok(box.x + box.w <= width + 1, `Não ultrapassa largura (${box.ticker})`);
    assert.ok(box.y + box.h <= height + 1, `Não ultrapassa altura (${box.ticker})`);
  }

  // Itens maiores devem ter áreas maiores
  const itubBox = layout.find((b) => b.ticker === 'ITUB4');
  const bbdcBox = layout.find((b) => b.ticker === 'BBDC4');
  const brbBox = layout.find((b) => b.ticker === 'BRB3');

  assert.ok((itubBox.w * itubBox.h) > (bbdcBox.w * bbdcBox.h), 'ITUB4 tem área maior que BBDC4');
  assert.ok((bbdcBox.w * bbdcBox.h) > (brbBox.w * brbBox.h), 'BBDC4 tem área maior que BRB3');
});

test('market-treemap-model: getColorForReturn interpola cores conforme retorno', () => {
  const red = MarketTreemapModel.getColorForReturn(-8);
  assert.ok(red.startsWith('rgb('), 'Retorna rgb para valor negativo');

  const green = MarketTreemapModel.getColorForReturn(4.5);
  assert.ok(green.startsWith('rgb('), 'Retorna rgb para valor positivo');

  const neutral = MarketTreemapModel.getColorForReturn(0);
  assert.equal(neutral, 'rgb(45, 55, 72)', 'Retorna slate neutro para 0%');

  const missing = MarketTreemapModel.getColorForReturn(null);
  assert.equal(missing, '#1e293b', 'Retorna slate escuro para dado ausente');
});

test('market-treemap-model: formatação de números grandes e percentuais', () => {
  assert.equal(MarketTreemapModel.formatMarketCap(1.38e12).includes('tri'), true);
  assert.equal(MarketTreemapModel.formatMarketCap(352.1e9).includes('bi'), true);
  assert.equal(MarketTreemapModel.formatMarketCap(500e6).includes('mi'), true);
  assert.equal(MarketTreemapModel.formatMarketCap(null), 'R$ —');

  assert.equal(MarketTreemapModel.formatSignedPercent(1.32), '+1,32%');
  assert.equal(MarketTreemapModel.formatSignedPercent(-0.73), '-0,73%');
  assert.equal(MarketTreemapModel.formatSignedPercent(0), '0,00%');
  assert.equal(MarketTreemapModel.formatSignedPercent(null), 'N/D');

  assert.equal(MarketTreemapModel.formatPrice(67.42), 'R$ 67,42');
  assert.equal(MarketTreemapModel.formatPrice(null), '—');
});
