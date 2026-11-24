/**
 * UNIT TESTS — CAPITAL INTELLIGENCE MODEL
 * Direção Artística & Arquitetura Estrutural (01)
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const CapitalIntelligenceModel = require('./capital-intelligence-model');

test('CapitalIntelligenceModel: define exatamente as 7 esferas principais obrigatórias e 4 satélites de tendência 21p', () => {
  const model = new CapitalIntelligenceModel();

  const primaryIds = model.getPrimarySpheres().map(n => n.id);
  assert.deepEqual(primaryIds, [
    'cycle_br',
    'cycle_us',
    'breadth_us',
    'gold_commodities',
    'sector_rotation_us',
    'macro_events',
    'my_portfolio'
  ], 'As 7 dimensões estruturais e cíclicas obrigatórias devem ser esferas principais');

  const satelliteIds = model.getTrendSatellites().map(n => n.id);
  assert.deepEqual(satelliteIds, [
    'trend_dolar',
    'trend_di',
    'trend_us10y',
    'trend_vix'
  ], 'Dólar, DI, Treasury 10Y e VIX devem figurar como satélites de tendência histórica (21 pregões)');
});

test('CapitalIntelligenceModel: Brasil, EUA e Market Breadth EUA são dimensões visualmente distintas e independentes', () => {
  const model = new CapitalIntelligenceModel();
  const br = model.getNodeById('cycle_br');
  const us = model.getNodeById('cycle_us');
  const breadth = model.getNodeById('breadth_us');

  assert.ok(br && us && breadth);
  assert.equal(br.tier, 'primary');
  assert.equal(us.tier, 'primary');
  assert.equal(breadth.tier, 'primary');

  // Cores distintas (Esmeralda, Azul Safira, Roxo Ametista)
  assert.notEqual(br.color, us.color);
  assert.notEqual(us.color, breadth.color);
  assert.notEqual(br.color, breadth.color);

  // Market Breadth EUA possui widget de anel dedicado e universo próprio
  assert.equal(breadth.universe, 'breadth');
  assert.equal(breadth.visualWidget, 'breadth_ring');
  assert.equal(breadth.breadthPct, null, 'Sem feed ao vivo, Market Breadth não pode inventar percentual fictício');
});

test('CapitalIntelligenceModel: conexões possuem tipologia rigorosa e fundamentação explicável', () => {
  const model = new CapitalIntelligenceModel();
  assert.ok(model.connections.length >= 15, 'Deve conter ao menos 15 conexões estruturais');

  const validTypes = new Set(['economic', 'correlation', 'allocation']);
  model.connections.forEach(conn => {
    assert.ok(validTypes.has(conn.type), `Tipo inválido: ${conn.type}`);
    assert.ok(model.getNodeById(conn.source), `Origem ausente: ${conn.source}`);
    assert.ok(model.getNodeById(conn.target), `Destino ausente: ${conn.target}`);
    assert.ok(conn.explanation && conn.explanation.length > 25, `Explicação insuficiente em ${conn.id}`);
    assert.ok(conn.supportingData && conn.supportingData.length > 10, `Dados de suporte ausentes em ${conn.id}`);
    assert.ok(conn.timeframe && conn.timeframe.length > 3, `Horizonte temporal ausente em ${conn.id}`);
  });

  const usBreadthConn = model.getConnectionById('conn_cycle_us_breadth_us');
  assert.equal(usBreadthConn.type, 'correlation');

  const portBrConn = model.getConnectionById('conn_portfolio_cycle_br');
  assert.equal(portBrConn.type, 'allocation');
});

test('CapitalIntelligenceModel: nenhum número fictício da imagem de referência é reaproveitado como dado real', () => {
  const modelSource = fs.readFileSync(path.join(__dirname, 'capital-intelligence-model.js'), 'utf8');
  const viewSource = fs.readFileSync(path.join(__dirname, 'capital-intelligence.js'), 'utf8');
  const combined = modelSource + '\n' + viewSource;

  const forbiddenReferenceMockNumbers = [
    '1.014.295,73',
    '1.234 / 3.876',
    '+6,8%',
    '+0,68 p.p.',
    '21,7',
    '4,36%',
    '+0,32 p.p.',
    '+4,9%',
    '-5,7%',
    '-6,2%'
  ];

  forbiddenReferenceMockNumbers.forEach(num => {
    assert.equal(
      combined.includes(num),
      false,
      `Número fictício da imagem de referência não pode aparecer no código: ${num}`
    );
  });

  // Sem hidratação, Patrimônio não exibe saldo inventado
  const model = new CapitalIntelligenceModel();
  const breakdown = model.getPortfolioAllocationBreakdown();
  assert.equal(breakdown.isLive, false);
  assert.equal(breakdown.equity, null);
});

test('CapitalIntelligenceModel: getFilteredGraph destaca lentes estruturais e preserva pontes', () => {
  const model = new CapitalIntelligenceModel();

  const allGraph = model.getFilteredGraph('all');
  assert.equal(allGraph.nodes.length, 11);
  assert.ok(allGraph.nodes.every(n => !n.isDimmed));

  const breadthGraph = model.getFilteredGraph('breadth');
  const breadthNode = breadthGraph.nodes.find(n => n.id === 'breadth_us');
  const cycleUsNode = breadthGraph.nodes.find(n => n.id === 'cycle_us');
  assert.equal(breadthNode.isDimmed, false, 'Market Breadth deve ficar em destaque na lente breadth');
  assert.equal(cycleUsNode.isBridge, true, 'Ciclo EUA deve figurar como nó ponte conectado ao Breadth');
});

test('CapitalIntelligenceModel: hydrateFromSystemState absorve dados reais de patrimônio e mercado sem contas correntes', () => {
  const model = new CapitalIntelligenceModel();

  const fakeDailyModel = {
    getInvestmentWealth: () => 850000.00,
    getAvailableCash: () => 550000.00,
    getPortfolioHeat: () => 1.85,
    getHeatLimit: () => 5.00,
    classifyPositionMarket: (p) => p.assetClass,
    getPositionFinancialVolume: (p) => p.vol,
    positions: [
      { id: '1', ticker: 'PETR4', assetClass: 'STOCK', vol: 180000, closed: false },
      { id: '2', ticker: 'AAPL34', assetClass: 'BDR', vol: 70000, closed: false }
    ],
    accounts: [
      { id: 'nomad_user', currency: 'USD', type: 'investment', newBalance: 50000.00 },
      { id: 'bradesco_cc', currency: 'BRL', type: 'checking', newBalance: 99000.00 }
    ],
    constructor: {
      formatBRL: (n) => `R$ ${n.toFixed(2)}`
    }
  };

  const fakeMarketCentral = {
    regime: { label: 'Up — Quiet', permission: 'Alta estrutural com volatilidade controlada' },
    globalBenchmarks: [
      { symbol: 'SPX', value: '5.800,00', changePct: 0.45, returns: { '1m': 2.15 }, trend: 'up' },
      { symbol: 'GOLD', value: '2.690,00', changePct: 0.30, returns: { '1m': 3.10 }, trend: 'up' },
      { symbol: 'VIX', value: '15,20', numericValue: 15.2, changePct: -2.1, returns: { '1m': -8.4 }, sparkline: [17, 16.5, 16, 15.2] }
    ],
    events: [
      { id: 'e1', country: 'BR', title: 'COPOM', dateLabel: 'Próxima quarta' }
    ]
  };

  model.hydrateFromSystemState({
    dailyUpdateModel: fakeDailyModel,
    marketCentralData: fakeMarketCentral
  });

  const portfolio = model.getPortfolioAllocationBreakdown();
  assert.equal(portfolio.isLive, true);
  assert.equal(portfolio.equity, 850000.00);
  assert.equal(portfolio.globalEquities.value, 120000.00); // 70k BDR + 50k Nomad (Bradesco checking ignorado)

  const brNode = model.getNodeById('cycle_br');
  assert.equal(brNode.dataStatus, 'live');
  assert.equal(brNode.displayValue, 'Up — Quiet');
  assert.equal(brNode.state, 'expansion');

  const tape = model.getDailyTapeItems();
  const spxTape = tape.find(t => t.symbol === 'SPX');
  assert.equal(spxTape.dataStatus, 'live');
  assert.equal(spxTape.changePct, 0.45);
});

test('CapitalIntelligenceModel: sugestão de alocação inclui disclaimer obrigatório não vinculante', () => {
  const model = new CapitalIntelligenceModel();
  const scenario = model.getIndicativeRebalanceScenario();

  assert.ok(scenario.rows.length >= 3);
  assert.ok(scenario.recommendations.length >= 2);
  assert.ok(scenario.disclaimer.includes('NÃO VINCULANTE'));
  assert.ok(scenario.disclaimer.includes('Não constitui recomendação'));
});
