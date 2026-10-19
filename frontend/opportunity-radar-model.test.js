const test = require('node:test');
const assert = require('node:assert/strict');
const OpportunityRadarModel = require('./opportunity-radar-model');

function generateUptrendWithInsideBar() {
  const candles = [];
  let price = 30.0;
  for (let i = 0; i < 35; i++) {
    price += 0.35;
    candles.push({
      time: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`,
      open: Number((price - 0.2).toFixed(2)),
      high: Number((price + 0.4).toFixed(2)),
      low: Number((price - 0.3).toFixed(2)),
      close: Number((price + 0.1).toFixed(2)),
      volume: 1000000
    });
  }
  // Mother bar
  candles.push({
    time: '2026-10-15',
    open: 41.0,
    high: 43.0,
    low: 40.5,
    close: 42.5,
    volume: 1500000
  });
  // Inside Bar above EMA 9 and EMA 30
  candles.push({
    time: '2026-10-16',
    open: 41.8,
    high: 42.6,
    low: 41.2,
    close: 42.2,
    volume: 1200000
  });
  return candles;
}

test('OpportunityRadarModel.resolveMarketCategory classifica corretamente em IBOV, IFIX ou BDRs', () => {
  assert.equal(
    OpportunityRadarModel.resolveMarketCategory({ symbol: 'PETR4', sector: 'Energy Minerals', assetClass: 'stock_ibov' }),
    'IBOV'
  );
  assert.equal(
    OpportunityRadarModel.resolveMarketCategory({ symbol: 'HGLG11', sector: 'Logística', assetClass: 'fii' }),
    'IFIX'
  );
  assert.equal(
    OpportunityRadarModel.resolveMarketCategory({ symbol: 'AAPL34', sector: 'Tecnologia', assetClass: 'bdr' }),
    'BDRs'
  );
  assert.equal(
    OpportunityRadarModel.resolveMarketCategory({ symbol: 'NVDC34', sector: 'Tecnologia' }),
    'BDRs'
  );
});

test('OpportunityRadarModel.evaluateAssetReadiness aprova apenas ativo que cumpre todos os critérios e tem gatilho confirmado', () => {
  const candles = generateUptrendWithInsideBar();
  const asset = {
    symbol: 'PETR4',
    name: 'PETROLEO BRASILEIRO S.A. PETROBRAS',
    sector: 'Energy Minerals',
    score: 92,
    m3: 24.5,
    assetClass: 'stock_ibov'
  };

  const result = OpportunityRadarModel.evaluateAssetReadiness(asset, candles, 'healthy');
  assert.ok(result, 'Ativo que cumpre todos os critérios deve ser retornado como pronto');
  assert.equal(result.symbol, 'PETR4');
  assert.equal(result.name, 'Petrobras');
  assert.equal(result.market, 'IBOV');
  assert.equal(result.rsScore, 92);
  assert.equal(result.rsLabel, 'Líder');
  assert.ok(['A', 'B', 'C', 'D'].includes(result.grade), 'Deve calcular Grade oficial via motor da Rubric');
  assert.equal(result.marketCycle, 'Ciclo Positivo');
  assert.equal(result.trend, 'Alinhada');
  assert.equal(result.triggerName, 'Inside Bar');
  assert.equal(result.entry, 42.61);
  assert.equal(result.stop, 41.19);
  assert.ok(result.rr >= 2.0);
  assert.equal(result.status, 'Pronto para entrada');
});

test('OpportunityRadarModel.evaluateAssetReadiness rejeita ativo sem gatilho, com RS <= 80 ou em ciclo defensivo', () => {
  const candles = generateUptrendWithInsideBar();
  const asset = {
    symbol: 'VALE3',
    name: 'VALE S.A.',
    sector: 'Non-Energy Minerals',
    score: 85,
    assetClass: 'stock_ibov'
  };

  // Rejeita ciclo defensivo
  assert.equal(OpportunityRadarModel.evaluateAssetReadiness(asset, candles, 'defensive'), null);
  assert.equal(OpportunityRadarModel.evaluateAssetReadiness(asset, candles, 'riskoff'), null);

  // Rejeita ciclo em transição (somente Ciclo Positivo é aceito no Radar de Oportunidades)
  assert.equal(OpportunityRadarModel.evaluateAssetReadiness(asset, candles, 'transition'), null);
  assert.equal(OpportunityRadarModel.evaluateAssetReadiness(asset, candles, 'Em Transição'), null);
  assert.equal(OpportunityRadarModel.evaluateAssetReadiness({ ...asset, marketCycleState: 'transition' }, candles, 'healthy'), null);
  assert.equal(OpportunityRadarModel.evaluateAssetReadiness({ ...asset, cycle: 'Em Transição' }, candles, 'healthy'), null);

  // Rejeita RS menor ou igual a 80 (exigência estrita de RS > 80)
  assert.equal(OpportunityRadarModel.evaluateAssetReadiness({ ...asset, score: 80 }, candles, 'healthy'), null);
  assert.equal(OpportunityRadarModel.evaluateAssetReadiness({ ...asset, score: 79 }, candles, 'healthy'), null);
  assert.equal(OpportunityRadarModel.evaluateAssetReadiness({ ...asset, score: 70 }, candles, 'healthy'), null);
  assert.equal(OpportunityRadarModel.evaluateAssetReadiness({ ...asset, score: 62 }, candles, 'healthy'), null);

  // Rejeita quando não há candles suficientes
  assert.equal(OpportunityRadarModel.evaluateAssetReadiness(asset, candles.slice(0, 10), 'healthy'), null);
});

test('OpportunityRadarModel.filterOpportunities filtra por Mercado (IBOV, IFIX, BDRs), Setor, Gatilho e Busca', () => {
  const items = [
    {
      symbol: 'PETR4',
      name: 'Petrobras',
      fullName: 'PETROBRAS',
      market: 'IBOV',
      sector: 'Petróleo, Gás e Energia',
      triggerId: 'INSIDE_BAR',
      triggerName: 'Inside Bar',
      grade: 'A',
      status: 'Pronto para entrada'
    },
    {
      symbol: 'HGLG11',
      name: 'Cshg Logística',
      fullName: 'CSHG LOGISTICA FII',
      market: 'IFIX',
      sector: 'Logística',
      triggerId: 'PFR_COMPRA',
      triggerName: 'PFR de Compra',
      grade: 'B',
      status: 'Pronto para entrada'
    },
    {
      symbol: 'AAPL34',
      name: 'Apple',
      fullName: 'APPLE INC BDR',
      market: 'BDRs',
      sector: 'Tecnologia',
      triggerId: '123_COMPRA',
      triggerName: '123 Buy',
      grade: 'B',
      status: 'Pronto para entrada'
    }
  ];

  assert.equal(OpportunityRadarModel.filterOpportunities(items, { market: 'ALL' }).length, 3);
  assert.equal(OpportunityRadarModel.filterOpportunities(items, { market: 'IBOV' }).length, 1);
  assert.equal(OpportunityRadarModel.filterOpportunities(items, { market: 'IFIX' })[0].symbol, 'HGLG11');
  assert.equal(OpportunityRadarModel.filterOpportunities(items, { market: 'BDRs' })[0].symbol, 'AAPL34');
  assert.equal(OpportunityRadarModel.filterOpportunities(items, { grade: 'A' }).length, 1);
  assert.equal(OpportunityRadarModel.filterOpportunities(items, { grade: 'A' })[0].symbol, 'PETR4');
  assert.equal(OpportunityRadarModel.filterOpportunities(items, { grade: 'B' }).length, 2);
  assert.equal(OpportunityRadarModel.filterOpportunities(items, { sector: 'Tecnologia' })[0].symbol, 'AAPL34');
  assert.equal(OpportunityRadarModel.filterOpportunities(items, { trigger: '123 Buy' })[0].symbol, 'AAPL34');
  assert.equal(OpportunityRadarModel.filterOpportunities(items, { search: 'petr' })[0].symbol, 'PETR4');

  // Garante que qualquer item em transição ou defensivo seja sumariamente excluído
  const itemsWithTransition = [
    ...items,
    {
      symbol: 'PAGS34',
      name: 'PagSeguro',
      fullName: 'PAGSEGURO DIGITAL',
      market: 'BDRs',
      sector: 'Tecnologia',
      triggerId: '123_COMPRA',
      triggerName: '123 Buy',
      grade: 'B',
      status: 'Pronto para entrada',
      marketCycle: 'Em Transição',
      marketCycleState: 'transition'
    }
  ];
  const filteredWithoutTransition = OpportunityRadarModel.filterOpportunities(itemsWithTransition, { market: 'ALL' });
  assert.equal(filteredWithoutTransition.length, 3, 'Ativo em ciclo Em Transição não pode aparecer no Radar');
  assert.ok(!filteredWithoutTransition.some(i => i.symbol === 'PAGS34'), 'PAGS34 em transição deve ser excluído');

  const options = OpportunityRadarModel.extractFilterOptions(items);
  assert.ok(Array.isArray(options.grades));
  assert.ok(options.grades.includes('A'));
  assert.ok(options.grades.includes('B'));
  assert.ok(!options.grades.includes('A+'));
});

test('OpportunityRadarModel: gerenciamento de seleção (add, remove, toggle, isSelected, clear) sem duplicatas', () => {
  let selection = [];
  assert.equal(OpportunityRadarModel.isSelected(selection, 'wege3'), false);

  selection = OpportunityRadarModel.addSelection(selection, 'wege3');
  assert.deepEqual(selection, ['WEGE3']);
  assert.equal(OpportunityRadarModel.isSelected(selection, 'WEGE3'), true);
  assert.equal(OpportunityRadarModel.isSelected(selection, 'wege3'), true);

  // Tentativa de duplicata deve ser ignorada
  selection = OpportunityRadarModel.addSelection(selection, 'WEGE3');
  assert.deepEqual(selection, ['WEGE3']);

  // Adiciona mais ativos
  selection = OpportunityRadarModel.addSelection(selection, 'ITUB4');
  selection = OpportunityRadarModel.addSelection(selection, 'SUZB3');
  assert.deepEqual(selection, ['WEGE3', 'ITUB4', 'SUZB3']);

  // Toggle remove se presente
  selection = OpportunityRadarModel.toggleSelection(selection, 'ITUB4');
  assert.deepEqual(selection, ['WEGE3', 'SUZB3']);

  // Toggle adiciona se ausente
  selection = OpportunityRadarModel.toggleSelection(selection, 'PETR4');
  assert.deepEqual(selection, ['WEGE3', 'SUZB3', 'PETR4']);

  // Remove individual
  selection = OpportunityRadarModel.removeSelection(selection, 'WEGE3');
  assert.deepEqual(selection, ['SUZB3', 'PETR4']);

  // Clear zera seleção
  selection = OpportunityRadarModel.clearSelection();
  assert.deepEqual(selection, []);
});

test('OpportunityRadarModel.generateProfitChartCsv exporta tickers no formato Profit Chart (uma linha por ticker, CRLF, sem cabeçalho)', () => {
  const fixedDate = new Date('2026-10-18T15:00:00Z');

  // Caso vazio: bloqueia e retorna erro amigável
  const emptyRes = OpportunityRadarModel.generateProfitChartCsv([], fixedDate);
  assert.equal(emptyRes.success, false);
  assert.equal(emptyRes.count, 0);
  assert.equal(emptyRes.csvContent, '');

  // Caso com ativos válidos e duplicatas acidentais
  const tickers = ['wege3', 'ITUB4', 'SUZB3', 'PETR4', 'itub4', '   '];
  const res = OpportunityRadarModel.generateProfitChartCsv(tickers, fixedDate);

  assert.equal(res.success, true);
  assert.equal(res.count, 4);
  assert.equal(res.filename, 'watchlist_profit_2026-10-18.csv');
  assert.equal(res.mimeType, 'text/csv;charset=utf-8');

  // Formato exato do Profit: um ticker por linha, sem cabeçalho, com quebra CRLF
  assert.equal(res.csvContent, 'WEGE3\r\nITUB4\r\nSUZB3\r\nPETR4\r\n');
});

test('OpportunityRadarModel.enrichSelectedItems preserva informações dos ativos mesmo se saírem da lista de prontas', () => {
  const opportunities = [
    {
      symbol: 'WEGE3',
      name: 'Weg S.A.',
      fullName: 'WEG S.A.',
      entry: 37.42,
      lastPrice: 37.42,
      change1dPct: 2.14,
      sector: 'Bens Industriais',
      market: 'IBOV',
      triggerName: 'Inside Bar'
    }
  ];

  const fallbackCatalog = {
    ITUB4: {
      name: 'Itaú Unibanco',
      price: 32.65,
      change1dPct: 1.20,
      sector: 'Financeiro'
    }
  };

  const selected = ['WEGE3', 'ITUB4'];
  const enriched = OpportunityRadarModel.enrichSelectedItems(selected, opportunities, fallbackCatalog);

  assert.equal(enriched.length, 2);

  // WEGE3 presente no radar
  assert.equal(enriched[0].symbol, 'WEGE3');
  assert.equal(enriched[0].name, 'Weg S.A.');
  assert.equal(enriched[0].price, 37.42);
  assert.equal(enriched[0].change1dPct, 2.14);
  assert.equal(enriched[0].isReady, true);
  assert.equal(enriched[0].triggerName, 'Inside Bar');

  // ITUB4 não presente no radar (mas enriquecido pelo fallback sem sumir)
  assert.equal(enriched[1].symbol, 'ITUB4');
  assert.equal(enriched[1].name, 'Itaú Unibanco');
  assert.equal(enriched[1].price, 32.65);
  assert.equal(enriched[1].sector, 'Financeiro');
  assert.equal(enriched[1].isReady, false);
});

test('OpportunityRadarModel.migrateLegacyWatchlist preserva itens históricos da Watchlist sem duplicar', () => {
  const currentSelection = ['WEGE3'];
  const legacyItems = [
    { ticker: 'TOTS3', name: 'Totvs' },
    { symbol: 'WEGE3' }, // duplicado
    { ticker: 'PRIO3' },
    'ITUB4' // formato string
  ];

  const result = OpportunityRadarModel.migrateLegacyWatchlist(legacyItems, currentSelection);
  assert.equal(result.migratedCount, 3); // TOTS3, PRIO3, ITUB4
  assert.deepEqual(result.combinedSelection, ['WEGE3', 'TOTS3', 'PRIO3', 'ITUB4']);
});

test('OpportunityRadarModel.resolveAssetLogoUrl resolve URLs oficiais de logos de empresas B3 e trata frações', () => {
  assert.equal(
    OpportunityRadarModel.resolveAssetLogoUrl('PETR4'),
    'https://icons.brapi.dev/icons/PETR4.svg'
  );
  assert.equal(
    OpportunityRadarModel.resolveAssetLogoUrl('wege3'),
    'https://icons.brapi.dev/icons/WEGE3.svg'
  );
  assert.equal(
    OpportunityRadarModel.resolveAssetLogoUrl('VALE3'),
    'https://icons.brapi.dev/icons/VALE3.svg'
  );
  assert.equal(
    OpportunityRadarModel.resolveAssetLogoUrl('HGLG11'),
    'https://icons.brapi.dev/icons/HGLG11.svg'
  );
  assert.equal(
    OpportunityRadarModel.resolveAssetLogoUrl('AAPL34'),
    'https://icons.brapi.dev/icons/AAPL34.svg'
  );

  // Normalização de ações fracionárias da B3 (PETR4F -> PETR4)
  assert.equal(
    OpportunityRadarModel.resolveAssetLogoUrl('PETR4F'),
    'https://icons.brapi.dev/icons/PETR4.svg'
  );
  assert.equal(
    OpportunityRadarModel.resolveAssetLogoUrl('VALE3F'),
    'https://icons.brapi.dev/icons/VALE3.svg'
  );

  // Rejeita ticker inválido ou vazio
  assert.equal(OpportunityRadarModel.resolveAssetLogoUrl(''), null);
  assert.equal(OpportunityRadarModel.resolveAssetLogoUrl(null), null);
  assert.equal(OpportunityRadarModel.resolveAssetLogoUrl('XYZ!@#'), null);
});

test('OpportunityRadarModel.getAssetBrandDetails fornece dados de branding e fallback determinístico elegante', () => {
  // Marca pré-cadastrada
  const petr = OpportunityRadarModel.getAssetBrandDetails('PETR4');
  assert.equal(petr.brandText, 'BR');
  assert.equal(petr.bg, '#008542');
  assert.equal(petr.hasCustomBrand, true);

  const itub = OpportunityRadarModel.getAssetBrandDetails('ITUB4');
  assert.equal(itub.brandText, 'itaú');
  assert.equal(itub.bg, '#003399');
  assert.equal(itub.hasCustomBrand, true);

  // Ativo não mapeado diretamente recebe iniciais e paleta determinística
  const fatn = OpportunityRadarModel.getAssetBrandDetails('FATN11');
  assert.equal(fatn.brandText, 'FAT');
  assert.ok(fatn.bg);
  assert.ok(fatn.fg);
  assert.equal(fatn.hasCustomBrand, false);
});

