const test = require('node:test');
const assert = require('node:assert/strict');
const MarketCentralModel = require('./market-central-model.js');

test('MarketCentralModel: constantes básicas e estruturas de universos, mercados e períodos', () => {
  assert.ok(Array.isArray(MarketCentralModel.UNIVERSES), 'UNIVERSES deve ser um array');
  assert.ok(MarketCentralModel.UNIVERSES.length >= 4, 'UNIVERSES deve conter ao menos 4 universos');
  assert.ok(MarketCentralModel.UNIVERSES.some(u => u.id === 'stock_b3'));
  assert.ok(MarketCentralModel.UNIVERSES.some(u => u.id === 'ibov'));
  assert.ok(MarketCentralModel.UNIVERSES.some(u => u.id === 'smallcaps'));
  assert.ok(MarketCentralModel.UNIVERSES.some(u => u.id === 'watchlist'));

  assert.ok(Array.isArray(MarketCentralModel.MARKETS), 'MARKETS deve ser um array');
  assert.ok(MarketCentralModel.MARKETS.some(m => m.id === 'stock_b3' && m.benchmark === 'IBOV'));

  assert.ok(Array.isArray(MarketCentralModel.PERIODS), 'PERIODS deve ser um array');
  assert.ok(MarketCentralModel.PERIODS.some(p => p.id === 'today'));
  assert.ok(MarketCentralModel.PERIODS.some(p => p.id === '5d'));
});

test('MarketCentralModel: scoreToGaugeAngle mapeia o score 0-100 para o arco -90 a +90 graus', () => {
  assert.equal(MarketCentralModel.scoreToGaugeAngle(0), -90);
  assert.equal(MarketCentralModel.scoreToGaugeAngle(50), 0);
  assert.equal(MarketCentralModel.scoreToGaugeAngle(100), 90);
  assert.equal(MarketCentralModel.scoreToGaugeAngle(25), -45);
  assert.equal(MarketCentralModel.scoreToGaugeAngle(75), 45);

  // Clamping de valores extremos
  assert.equal(MarketCentralModel.scoreToGaugeAngle(-20), -90);
  assert.equal(MarketCentralModel.scoreToGaugeAngle(150), 90);
  assert.equal(MarketCentralModel.scoreToGaugeAngle(null), -90);
});

test('MarketCentralModel: resolveRegimeColor retorna paleta e rótulo semântico correto', () => {
  const healthy = MarketCentralModel.resolveRegimeColor('healthy');
  assert.equal(healthy.hex, '#22c55e');
  assert.match(healthy.label, /Alta/);

  const defensive = MarketCentralModel.resolveRegimeColor('defensive');
  assert.equal(defensive.hex, '#ef4444');
  assert.match(defensive.label, /Baixa/);

  const transition = MarketCentralModel.resolveRegimeColor('transition');
  assert.equal(transition.hex, '#eab308');
  assert.match(transition.label, /Atenção/);
});

test('MarketCentralModel: formatadores numéricos e de porcentagem', () => {
  assert.equal(MarketCentralModel.formatPercent(2.5), '+2,5%');
  assert.equal(MarketCentralModel.formatPercent(-1.2), '-1,2%');
  assert.equal(MarketCentralModel.formatPercent(0), '0,0%');
  assert.equal(MarketCentralModel.formatPercent(NaN), '—');

  assert.equal(MarketCentralModel.formatNumber(132500), '132.500');
  assert.equal(MarketCentralModel.formatNumber(NaN), '—');
});

test('MarketCentralModel: cadastro e remoção de eventos customizados pelo trader', () => {
  const testEvent = {
    name: 'Reunião Extraordinária do Copom',
    date: '2026-10-20',
    time: '18:00',
    impact: 'ALTO',
    relatedAssets: 'IBOV / DI1'
  };

  const added = MarketCentralModel.addCustomEvent(testEvent);
  assert.ok(added.id.startsWith('cust-evt-'));
  assert.equal(added.name, testEvent.name);
  assert.equal(added.impact, 'ALTO');

  const list = MarketCentralModel.getCustomEvents();
  assert.ok(list.some(e => e.id === added.id));

  // Remoção
  const remaining = MarketCentralModel.removeCustomEvent(added.id);
  assert.ok(!remaining.some(e => e.id === added.id));
});

test('MarketCentralModel: Playbook de Eventos salva e consulta reação do mercado', () => {
  const reaction = {
    eventId: 'evt-test-999',
    eventName: 'Payroll EUA Teste',
    eventDate: '2026-10-07',
    whatHappened: 'Criação de vagas veio 40% acima do esperado, gerando reprecificação imediata da curva de juros.',
    volatilityBehavior: 'Spike inicial de 1,5% seguido de devolução e fechamento perto da mínima.',
    affectedAssets: 'Dólar Futuro, S&P 500, IBOV',
    lessonsLearned: 'Não antecipar a entrada antes da divulgação oficial e esperar a primeira vela de 15m fechar.'
  };

  const saved = MarketCentralModel.saveEventReaction(reaction);
  assert.ok(saved.id.startsWith('reaction-'));
  assert.equal(saved.eventId, 'evt-test-999');

  const reactionsForEvent = MarketCentralModel.getReactionsForEvent('evt-test-999');
  assert.ok(reactionsForEvent.length >= 1);
  assert.equal(reactionsForEvent[0].lessonsLearned, reaction.lessonsLearned);
});

test('MarketCentralModel: MAP_TABS define exatamente Setores, Ativos e Variação do dia', () => {
  assert.ok(Array.isArray(MarketCentralModel.MAP_TABS));
  assert.equal(MarketCentralModel.MAP_TABS.length, 3);
  const tabIds = MarketCentralModel.MAP_TABS.map(t => t.id);
  assert.deepEqual(tabIds, ['sectors', 'assets', 'variation']);
});

test('MarketCentralModel: sortAssetsByVariation separa maiores altas e maiores baixas com integridade', () => {
  const assets = [
    { symbol: 'PETR4', changePct: 3.10 },
    { symbol: 'VALE3', changePct: -1.80 },
    { symbol: 'ITUB4', changePct: 2.40 },
    { symbol: 'MGLU3', changePct: -4.50 },
    { symbol: 'WEGE3', changePct: 0.60 },
    { symbol: 'BBDC4', changePct: 0.00 }
  ];

  const { gainers, losers } = MarketCentralModel.sortAssetsByVariation(assets);

  // Gainers: ordenados decrescente (> 0)
  assert.equal(gainers.length, 3);
  assert.equal(gainers[0].symbol, 'PETR4'); // 3.10%
  assert.equal(gainers[1].symbol, 'ITUB4'); // 2.40%
  assert.equal(gainers[2].symbol, 'WEGE3'); // 0.60%

  // Losers: ordenados pela maior queda (< 0)
  assert.equal(losers.length, 2);
  assert.equal(losers[0].symbol, 'MGLU3'); // -4.50%
  assert.equal(losers[1].symbol, 'VALE3'); // -1.80%
});

test('MarketCentralModel: getEffectiveChange e sortAssetsByVariation suportam múltiplos períodos em memória', () => {
  const assetA = { symbol: 'PETR4', changePct: 1.0, returns: { today: 1.0, '5d': 5.0, '1m': -2.0, '3m': 20.0 } };
  const assetB = { symbol: 'VALE3', changePct: 2.0, returns: { today: 2.0, '5d': -3.0, '1m': 10.0, '3m': -5.0 } };

  assert.equal(MarketCentralModel.getEffectiveChange(assetA, 'today'), 1.0);
  assert.equal(MarketCentralModel.getEffectiveChange(assetA, '5d'), 5.0);
  assert.equal(MarketCentralModel.getEffectiveChange(assetA, '1m'), -2.0);
  assert.equal(MarketCentralModel.getEffectiveChange(assetA, '3m'), 20.0);

  // Fallback caso não haja returns
  assert.equal(MarketCentralModel.getEffectiveChange({ symbol: 'TEST', changePct: 3.5 }, '5d'), 3.5);

  const assets = [assetA, assetB];
  const sorted5d = MarketCentralModel.sortAssetsByVariation(assets, '5d');
  assert.equal(sorted5d.gainers[0].symbol, 'PETR4');
  assert.equal(sorted5d.losers[0].symbol, 'VALE3');

  const sorted1m = MarketCentralModel.sortAssetsByVariation(assets, '1m');
  assert.equal(sorted1m.gainers[0].symbol, 'VALE3');
  assert.equal(sorted1m.losers[0].symbol, 'PETR4');
});

test('MarketCentral: renderMarketCentral renderiza interface sem erros de referência', async () => {
  const root = { innerHTML: '', querySelectorAll: () => [], querySelector: () => null };
  const prevDoc = global.document;
  const prevWin = global.window;
  const prevLs = global.localStorage;

  global.window = global;
  global.document = {
    getElementById: (id) => (id === 'marketCentralRoot' || id === 'marketcentral' ? root : null),
    querySelectorAll: () => [],
    querySelector: () => null,
    body: { appendChild: () => {} }
  };
  global.localStorage = { getItem: () => null, setItem: () => {} };
  global.healthyTrendApi = {
    request: () => Promise.resolve({ success: true, regime: {}, breadth: {}, globalMarkets: [], marketMap: [], events: [], assets: [], news: [] })
  };

  require('./event-playbook-model.js');
  require('./market-central.js');

  assert.doesNotThrow(() => {
    global.renderMarketCentral();
  });
  assert.ok(root.innerHTML.length > 0, 'O markup HTML da Central de Mercado deve ser gerado');
  assert.ok(root.innerHTML.includes('Central de Mercado'), 'Deve conter o título da tela');
  assert.ok(root.innerHTML.includes('Regime de Mercado'), 'Deve conter o card de Regime');
  assert.ok(root.innerHTML.includes('Market Breadth'), 'Deve conter o card de Breadth');
  assert.ok(root.innerHTML.includes('mcMapContentContainer'), 'Deve conter o container do mapa de mercado');

  await new Promise(resolve => setTimeout(resolve, 50));

  if (prevDoc !== undefined) global.document = prevDoc; else delete global.document;
  if (prevWin !== undefined) global.window = prevWin; else delete global.window;
  if (prevLs !== undefined) global.localStorage = prevLs; else delete global.localStorage;
  delete global.healthyTrendApi;
});

