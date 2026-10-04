const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('./trade-simulator-model');

test('trade-simulator-model: getDefaultSeedSimulations reproduz com exatidão as métricas sem o gatilho Pullback', () => {
  const seeds = model.getDefaultSeedSimulations();
  assert.equal(seeds.length, 19, 'Deve conter exatamente 19 simulações criadas');

  const stats = model.calculateSimulatorStats(seeds);

  // Card 1: Simulações criadas = 19
  assert.equal(stats.totalCreated, 19);

  // Card 2: Entradas executadas = 14
  assert.equal(stats.executedEntriesCount, 14);
  assert.equal(stats.executedPct, 73.68);

  // Card 7: Aguardando entrada = 5
  assert.equal(stats.waitingCount, 5);
  assert.equal(stats.waitingPct, 26.32);

  // Abas: Em Operação (3), Encerrados (11)
  assert.equal(stats.inOperationCount, 3);
  assert.equal(stats.closedCount, 11);

  // Card 3: Trades vencedores = 10 (71,4% win rate)
  assert.equal(stats.winningTradesCount, 10);
  assert.equal(stats.winRate, 71.4);

  // Card 4: Trades perdedores = 4 (28,6% loss rate)
  assert.equal(stats.losingTradesCount, 4);
  assert.equal(stats.lossRate, 28.6);

  // Card 5: Resultado total = +13,6R
  assert.equal(stats.totalR, 13.6);
  assert.equal(stats.totalRFormatted, '+13,60R');

  // Card 6: R médio / trade = +0,97R (13,6 / 14 ≈ 0,97R)
  assert.equal(stats.avgR, 0.97);
  assert.equal(stats.avgRFormatted, '+0,97R');

  // Gráfico: Distribuição de Resultados
  assert.equal(stats.distribution.winners.count, 10);
  assert.equal(stats.distribution.losers.count, 4);
  assert.equal(stats.distribution.notTriggered.count, 5);

  // Gráfico: Desempenho por Gatilho
  const insideBar = stats.triggerPerformance.find(t => t.name === 'Inside Bar');
  const setup123 = stats.triggerPerformance.find(t => t.name === '1-2-3 de Compra');
  const pullback = stats.triggerPerformance.find(t => t.name === 'Pullback');
  const outros = stats.triggerPerformance.find(t => t.name === 'Outros');

  assert.ok(insideBar);
  assert.ok(setup123);
  assert.equal(pullback, undefined, 'Gatilho Pullback não deve existir no desempenho por gatilho');
  assert.ok(outros);

  // Inside Bar: 8,4R e 8 trades
  assert.equal(insideBar.count, 8);
  assert.equal(insideBar.totalR, 8.4);

  // 1-2-3 de Compra: 5,1R e 7 trades
  assert.equal(setup123.count, 7);
  assert.equal(setup123.totalR, 5.1);

  // Outros: 0,1R e 1 trade
  assert.equal(outros.count, 1);
  assert.equal(outros.totalR, 0.1);
});

test('trade-simulator-model: NÃO entra se o preço não romper o nível de entrada (sem look-ahead)', () => {
  const sim = {
    symbol: 'PETR4',
    signalDate: '2026-09-20',
    entryPrice: 50.00,
    stopLoss: 48.00,
    status: model.STATUS.WAITING_ENTRY,
    timeline: []
  };

  // Candle do dia 21 não atinge 50.00 (máxima 49.50)
  const candles = [
    { time: '2026-09-20', open: 49.00, high: 49.80, low: 48.50, close: 49.20 },
    { time: '2026-09-21', open: 49.10, high: 49.50, low: 48.60, close: 49.00 }
  ];

  const evaluated = model.evaluateSimulationOnCandles(sim, candles);
  assert.equal(evaluated.status, model.STATUS.WAITING_ENTRY);
  assert.equal(evaluated.executedEntryPrice, null);
  assert.equal(evaluated.resultR, null);
});

test('trade-simulator-model: aciona entrada quando candle seguinte atinge ou ultrapassa a máxima planejada', () => {
  const sim = {
    symbol: 'PETR4',
    signalDate: '2026-09-20',
    entryPrice: 50.00,
    stopLoss: 48.00,
    status: model.STATUS.WAITING_ENTRY,
    timeline: []
  };

  const candles = [
    { time: '2026-09-20', open: 49.00, high: 49.80, low: 48.50, close: 49.20 },
    { time: '2026-09-21', open: 49.20, high: 50.80, low: 49.00, close: 50.50 }
  ];

  const evaluated = model.evaluateSimulationOnCandles(sim, candles);
  assert.equal(evaluated.status, model.STATUS.IN_OPERATION);
  assert.equal(evaluated.executedEntryPrice, 50.00);
  assert.equal(evaluated.entryDate, '2026-09-21');
  assert.equal(evaluated.mfeR, 0.40); // (50.80 - 50) / 2 = +0.40R
  assert.equal(evaluated.maeR, -0.50); // (49.00 - 50) / 2 = -0.50R
});

test('trade-simulator-model: política de ambiguidade intradiária trata stop no mesmo candle de forma conservadora', () => {
  const sim = {
    symbol: 'VALE3',
    signalDate: '2026-09-20',
    entryPrice: 60.00,
    stopLoss: 58.00,
    status: model.STATUS.WAITING_ENTRY,
    timeline: []
  };

  // Candle do dia 21 abre a 59.00, sobe a 60.50 (ativa entrada) mas cai a 57.50 (toca stop) no mesmo dia
  const candles = [
    { time: '2026-09-20', open: 58.50, high: 59.80, low: 58.20, close: 59.00 },
    { time: '2026-09-21', open: 59.00, high: 60.50, low: 57.50, close: 57.80 }
  ];

  const evaluated = model.evaluateSimulationOnCandles(sim, candles);
  assert.equal(evaluated.status, model.STATUS.CLOSED_LOSS);
  assert.equal(evaluated.resultR, -1.0);
  assert.ok(evaluated.exitReason.includes('Stop Loss'));
});

test('trade-simulator-model: Sell Into Strength encerra trade com lucro a +2R', () => {
  const sim = {
    symbol: 'ITUB4',
    signalDate: '2026-09-20',
    entryPrice: 30.00,
    stopLoss: 28.00, // Risco = R$ 2.00 -> 1R = 32.00, 2R = 34.00
    status: model.STATUS.WAITING_ENTRY,
    timeline: []
  };

  const candles = [
    { time: '2026-09-20', open: 29.50, high: 29.90, low: 28.50, close: 29.60 },
    // Dia 21: Rompe entrada (30.00)
    { time: '2026-09-21', open: 29.80, high: 31.00, low: 29.50, close: 30.80 },
    // Dia 22: Passa por 1R (32.00)
    { time: '2026-09-22', open: 30.80, high: 32.50, low: 30.50, close: 32.20 },
    // Dia 23: Atinge 2R (34.00)
    { time: '2026-09-23', open: 32.20, high: 34.20, low: 32.00, close: 34.10 }
  ];

  const evaluated = model.evaluateSimulationOnCandles(sim, candles);
  assert.equal(evaluated.status, model.STATUS.CLOSED_GAIN);
  assert.equal(evaluated.resultR, 2.0);
  assert.ok(evaluated.exitReason.includes('Sell Into Strength'));
  assert.equal(evaluated.exitPrice, 34.00);

  // Timeline deve conter os marcos cronológicos
  const eventTypes = evaluated.timeline.map(e => e.type);
  assert.ok(eventTypes.includes('SIGNAL_IDENTIFIED'));
  assert.ok(eventTypes.includes('ENTRY_EXECUTED'));
  assert.ok(eventTypes.includes('TARGET_1R'));
  assert.ok(eventTypes.includes('TARGET_2R'));
  assert.ok(eventTypes.includes('SELL_INTO_STRENGTH'));
  assert.ok(eventTypes.includes('CLOSED'));
});

test('trade-simulator-model: expira e marca NÃO ACIONADO se perder o stop antes da ativação', () => {
  const sim = {
    symbol: 'BBAS3',
    signalDate: '2026-09-20',
    entryPrice: 30.00,
    stopLoss: 28.00,
    status: model.STATUS.WAITING_ENTRY,
    timeline: []
  };

  const candles = [
    { time: '2026-09-20', open: 29.00, high: 29.80, low: 28.20, close: 29.00 },
    // Dia 21: Não atinge entrada (máx 29.50) e rompe abaixo do stop (mín 27.50)
    { time: '2026-09-21', open: 28.50, high: 29.50, low: 27.50, close: 27.60 }
  ];

  const evaluated = model.evaluateSimulationOnCandles(sim, candles);
  assert.equal(evaluated.status, model.STATUS.NOT_TRIGGERED);
  assert.equal(evaluated.resultR, null);
  assert.ok(evaluated.exitReason.includes('violada antes da ativação'));
});

test('trade-simulator-model: filterSimulations filtra por abas, texto e critérios', () => {
  const seeds = model.getDefaultSeedSimulations();

  const waitingOnly = model.filterSimulations(seeds, { statusTab: 'waiting' });
  assert.equal(waitingOnly.length, 5);
  assert.ok(waitingOnly.every(s => s.status === model.STATUS.WAITING_ENTRY));

  const inOpOnly = model.filterSimulations(seeds, { statusTab: 'in_op' });
  assert.equal(inOpOnly.length, 3);
  assert.ok(inOpOnly.every(s => s.status === model.STATUS.IN_OPERATION));

  const closedOnly = model.filterSimulations(seeds, { statusTab: 'closed' });
  assert.equal(closedOnly.length, 11);

  const petrOnly = model.filterSimulations(seeds, { search: 'PETR4' });
  assert.equal(petrOnly.length, 1);
  assert.equal(petrOnly[0].symbol, 'PETR4');

  const gradeAPlus = model.filterSimulations(seeds, { grade: 'A+' });
  assert.ok(gradeAPlus.length > 0);
  assert.ok(gradeAPlus.every(s => s.grade === 'A+'));
});

test('trade-simulator-model: filterSimulations é 100% compatível com filtros da UI (trade-simulator.js)', () => {
  const seeds = model.getDefaultSeedSimulations();

  // 1. Estado inicial default da interface
  const defaultUiFilters = {
    days: 90,
    trigger: 'ALL',
    sector: 'ALL',
    grade: 'ALL',
    tab: 'ALL',
    query: ''
  };
  const filteredDefault = model.filterSimulations(seeds, defaultUiFilters);
  assert.equal(filteredDefault.length, 19, 'Filtros default da UI não podem filtrar nenhuma simulação');

  // 2. Abas de status com identificadores usados pela UI
  const waitingTab = model.filterSimulations(seeds, { ...defaultUiFilters, tab: 'WAITING_ENTRY' });
  assert.equal(waitingTab.length, 5, 'Aba WAITING_ENTRY deve trazer exatamente 5 simulações');
  assert.ok(waitingTab.every(s => s.status === model.STATUS.WAITING_ENTRY));

  const inOpTab = model.filterSimulations(seeds, { ...defaultUiFilters, tab: 'IN_OPERATION' });
  assert.equal(inOpTab.length, 3, 'Aba IN_OPERATION deve trazer exatamente 3 simulações');
  assert.ok(inOpTab.every(s => s.status === model.STATUS.IN_OPERATION));

  const closedTab = model.filterSimulations(seeds, { ...defaultUiFilters, tab: 'CLOSED' });
  assert.equal(closedTab.length, 11, 'Aba CLOSED deve trazer exatamente 11 simulações');

  // 3. Busca por texto usando propriedade `query`
  const querySearch = model.filterSimulations(seeds, { ...defaultUiFilters, query: 'VALE3' });
  assert.equal(querySearch.length, 1);
  assert.equal(querySearch[0].symbol, 'VALE3');

  // 4. Paridade com novo trade adicionado de Gráficos (ex: BPAC11)
  const newSim = {
    id: 'sim-test-bpac11',
    symbol: 'BPAC11',
    companyName: 'BTG PACTUAL',
    sector: 'Financeiro',
    triggerName: '1-2-3 de Compra',
    triggerKey: '123_COMPRA',
    grade: 'A',
    signalDate: new Date().toISOString().slice(0, 10),
    entryPrice: 66.03,
    stopLoss: 63.06,
    status: model.STATUS.WAITING_ENTRY,
    currentPrice: 66.02,
    resultR: null,
    mfeR: 0,
    maeR: 0
  };

  const updatedList = [newSim, ...seeds];
  const updatedStats = model.calculateSimulatorStats(updatedList);
  assert.equal(updatedStats.totalCreated, 20, 'Total criado deve subir para 20');
  assert.equal(updatedStats.waitingCount, 6, 'Aguardando entrada deve subir para 6');

  const updatedWaiting = model.filterSimulations(updatedList, { ...defaultUiFilters, tab: 'WAITING_ENTRY' });
  assert.equal(updatedWaiting.length, 6, 'Tabela na aba Aguardando Entrada deve conter exatamente 6 registros');
  assert.equal(updatedWaiting[0].symbol, 'BPAC11', 'Novo registro BPAC11 deve estar na lista');

  const updatedAll = model.filterSimulations(updatedList, defaultUiFilters);
  assert.equal(updatedAll.length, 20, 'Tabela na aba Todos deve conter exatamente 20 registros');
  assert.equal(updatedAll[0].symbol, 'BPAC11');
});

test('trade-simulator-model: generateSimulationSnapshotCandles produz estrutura cronológica para o snapshot do trade', () => {
  // 1. Trade com Gain (+2R)
  const gainSim = {
    symbol: 'PETR4',
    signalDate: '2026-09-01',
    entryDate: '2026-09-02',
    exitDate: '2026-09-06',
    entryPrice: 38.00,
    stopLoss: 36.50,
    status: model.STATUS.CLOSED_GAIN
  };
  const gainCandles = model.generateSimulationSnapshotCandles(gainSim);
  assert.ok(Array.isArray(gainCandles) && gainCandles.length >= 10, 'Deve gerar pelo menos 10 candles');
  assert.ok(gainCandles.some(c => c.isSignal), 'Deve possuir candle do sinal');
  assert.ok(gainCandles.some(c => c.isEntry), 'Deve possuir candle da entrada executada');
  assert.ok(gainCandles.some(c => c.isTarget2R || (c.isExit && c.close >= 41.00)), 'Deve possuir alvo atingido (+2R)');
  assert.ok(gainCandles.every(c => typeof c.ema9 === 'number' && typeof c.ema30 === 'number'), 'Todos os candles devem ter EMAs 9 e 30');

  // 2. Trade com Loss (Stop Loss)
  const lossSim = {
    symbol: 'VALE3',
    signalDate: '2026-09-10',
    entryDate: '2026-09-11',
    exitDate: '2026-09-13',
    entryPrice: 58.00,
    stopLoss: 56.00,
    status: model.STATUS.CLOSED_LOSS
  };
  const lossCandles = model.generateSimulationSnapshotCandles(lossSim);
  assert.ok(lossCandles.some(c => c.isStop || (c.isExit && c.low <= 56.00)), 'Deve registrar o toque no stop loss');

  // 3. Trade Aguardando Entrada
  const waitSim = {
    symbol: 'BPAC11',
    signalDate: '2026-10-02',
    entryPrice: 66.03,
    stopLoss: 63.06,
    status: model.STATUS.WAITING_ENTRY
  };
  const waitCandles = model.generateSimulationSnapshotCandles(waitSim);
  assert.ok(waitCandles.some(c => c.isSignal), 'Deve possuir candle de sinal');
  assert.ok(!waitCandles.some(c => c.isEntry), 'Não deve possuir entrada ativada');
});


