const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('./trade-simulator-model');

test('trade-simulator-model: getDefaultSeedSimulations reproduz com exatidão as métricas sem o gatilho Pullback', () => {
  const seeds = model.getDefaultSeedSimulations();
  assert.equal(seeds.length, 42, 'Deve conter exatamente 42 simulações criadas');

  const stats = model.calculateSimulatorStats(seeds);

  // Card 1: Simulações criadas = 42
  assert.equal(stats.totalCreated, 42);

  // Card 2: Entradas executadas = 32 (4 em operação + 28 encerrados)
  assert.equal(stats.executedEntriesCount, 32);
  assert.equal(stats.executedPct, 76.19);

  // Card 7: Aguardando entrada = 6
  assert.equal(stats.waitingCount, 6);
  assert.equal(stats.waitingPct, 14.29);

  // Abas: Em Operação (4), Encerrados (32 = 28 executados + 4 não acionados)
  assert.equal(stats.inOperationCount, 4);
  assert.equal(stats.closedCount, 32);

  // Card 3: Trades vencedores = 20 (71,4% win rate sobre os 28 trades executados e encerrados)
  assert.equal(stats.winningTradesCount, 20);
  assert.equal(stats.winRate, 71.4);

  // Card 4: Trades perdedores = 8 (28,6% loss rate)
  assert.equal(stats.losingTradesCount, 8);
  assert.equal(stats.lossRate, 28.6);

  // Card 5: Resultado total = +26,1R
  assert.equal(stats.totalR, 26.1);
  assert.equal(stats.totalRFormatted, '+26,10R');

  // Card 6: R médio / trade = +0,93R (26,1 / 28 ≈ 0,93R)
  assert.equal(stats.avgR, 0.93);
  assert.equal(stats.avgRFormatted, '+0,93R');

  // Card 7: Duração média = 10,6 dias
  assert.equal(stats.avgDurationDays, 10.6);
  assert.equal(stats.avgDurationDaysFormatted, '10,6 dias');

  // Gráfico: Distribuição de Resultados
  assert.equal(stats.distribution.winners.count, 20);
  assert.equal(stats.distribution.losers.count, 8);
  assert.equal(stats.distribution.notTriggered.count, 10);

  // Gráfico: Desempenho por Gatilho
  const insideBar = stats.triggerPerformance.find(t => t.name === 'Inside Bar');
  const doubleInsideBar = stats.triggerPerformance.find(t => t.name === 'Double Inside Bar');
  const setup123 = stats.triggerPerformance.find(t => t.name === '1-2-3 de Compra');
  const pullback = stats.triggerPerformance.find(t => t.name === 'Pullback');
  const outros = stats.triggerPerformance.find(t => t.name === 'Outros');

  assert.ok(insideBar);
  assert.ok(doubleInsideBar, 'Double Inside Bar deve estar presente no desempenho por gatilho');
  assert.ok(setup123);
  assert.equal(pullback, undefined, 'Gatilho Pullback não deve existir no desempenho por gatilho');
  assert.ok(outros);

  // Inside Bar: 9,7R e 7 trades encerrados
  assert.equal(insideBar.count, 7);
  assert.equal(insideBar.totalR, 9.7);

  // Double Inside Bar: 5,4R e 7 trades encerrados
  assert.equal(doubleInsideBar.count, 7);
  assert.equal(doubleInsideBar.totalR, 5.4);

  // 1-2-3 de Compra: 10,9R e 13 trades encerrados
  assert.equal(setup123.count, 13);
  assert.equal(setup123.totalR, 10.9);

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
  assert.equal(waitingOnly.length, 6);
  assert.ok(waitingOnly.every(s => s.status === model.STATUS.WAITING_ENTRY));

  const inOpOnly = model.filterSimulations(seeds, { statusTab: 'in_op' });
  assert.equal(inOpOnly.length, 4);
  assert.ok(inOpOnly.every(s => s.status === model.STATUS.IN_OPERATION));

  const closedOnly = model.filterSimulations(seeds, { statusTab: 'closed' });
  assert.equal(closedOnly.length, 32);

  const petrOnly = model.filterSimulations(seeds, { search: 'PETR4' });
  assert.equal(petrOnly.length, 1);
  assert.equal(petrOnly[0].symbol, 'PETR4');

  const gradeA = model.filterSimulations(seeds, { grade: 'A' });
  assert.ok(gradeA.length > 0);
  assert.ok(gradeA.every(s => s.grade === 'A'));
});

test('trade-simulator-model: filterSimulations é 100% compatível com filtros da UI (trade-simulator.js)', () => {
  const seeds = model.getDefaultSeedSimulations();

  // 1. Estado inicial default da interface (120 dias para cobrir os 4 meses da massa expandida)
  const defaultUiFilters = {
    days: 120,
    trigger: 'ALL',
    sector: 'ALL',
    grade: 'ALL',
    tab: 'ALL',
    query: ''
  };
  const filteredDefault = model.filterSimulations(seeds, defaultUiFilters);
  assert.equal(filteredDefault.length, 42, 'Filtros default da UI não podem filtrar nenhuma simulação');

  // 2. Abas de status com identificadores usados pela UI
  const waitingTab = model.filterSimulations(seeds, { ...defaultUiFilters, tab: 'WAITING_ENTRY' });
  assert.equal(waitingTab.length, 6, 'Aba WAITING_ENTRY deve trazer exatamente 6 simulações');
  assert.ok(waitingTab.every(s => s.status === model.STATUS.WAITING_ENTRY));

  const inOpTab = model.filterSimulations(seeds, { ...defaultUiFilters, tab: 'IN_OPERATION' });
  assert.equal(inOpTab.length, 4, 'Aba IN_OPERATION deve trazer exatamente 4 simulações');
  assert.ok(inOpTab.every(s => s.status === model.STATUS.IN_OPERATION));

  const closedTab = model.filterSimulations(seeds, { ...defaultUiFilters, tab: 'CLOSED' });
  assert.equal(closedTab.length, 32, 'Aba CLOSED deve trazer exatamente 32 simulações');

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
  assert.equal(updatedStats.totalCreated, 43, 'Total criado deve subir para 43');
  assert.equal(updatedStats.waitingCount, 7, 'Aguardando entrada deve subir para 7');

  const updatedWaiting = model.filterSimulations(updatedList, { ...defaultUiFilters, tab: 'WAITING_ENTRY' });
  assert.equal(updatedWaiting.length, 7, 'Tabela na aba Aguardando Entrada deve conter exatamente 7 registros');
  assert.equal(updatedWaiting[0].symbol, 'BPAC11', 'Novo registro BPAC11 deve estar na lista');

  const updatedAll = model.filterSimulations(updatedList, defaultUiFilters);
  assert.equal(updatedAll.length, 43, 'Tabela na aba Todos deve conter exatamente 43 registros');
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

test('trade-simulator-model: adaptSimulationToScenario adapta regras de 2R, 2.5R e Pirâmide de forma determinística', () => {
  const baseSimGain = {
    id: 'sim-test-1',
    symbol: 'PETR4',
    entryPrice: 30.00,
    stopLoss: 28.00, // risk = 2.00
    status: model.STATUS.CLOSED_GAIN,
    resultR: 2.0,
    mfeR: 2.8,
    maeR: -0.2,
    timeline: [
      { type: 'SIGNAL_IDENTIFIED', date: '2026-09-01' },
      { type: 'ENTRY_EXECUTED', date: '2026-09-02', price: 30.00 },
      { type: 'TARGET_1R', date: '2026-09-03' },
      { type: 'TARGET_2R', date: '2026-09-05' },
      { type: 'CLOSED', date: '2026-09-05', resultR: 2.0 }
    ]
  };

  // 1. Cenário 2R
  const adapted2R = model.adaptSimulationToScenario(baseSimGain, '2R');
  assert.equal(adapted2R.managementScenario, '2R');
  assert.equal(adapted2R.resultR, 2.0);

  // 2. Cenário 2.5R com MFE suficiente (>= 2.5)
  const adapted25R = model.adaptSimulationToScenario(baseSimGain, '2.5R');
  assert.equal(adapted25R.managementScenario, '2.5R');
  assert.equal(adapted25R.resultR, 2.5);
  assert.equal(adapted25R.exitPrice, 35.00); // 30 + 2.5 * 2 = 35.00

  // 3. Cenário 2.5R com MFE insuficiente (< 2.5, ex: mfe 2.1)
  const baseSimPartialGain = {
    ...baseSimGain,
    mfeR: 2.1
  };
  const adapted25RStopped = model.adaptSimulationToScenario(baseSimPartialGain, '2.5R');
  assert.equal(adapted25RStopped.resultR, 0); // Breakeven protetivo
  assert.equal(adapted25RStopped.exitReason, 'Proteção / Breakeven (0,00R)');

  // 4. Cenário Pirâmide 1R -> 2R com MFE >= 2.0 (atinge alvo final)
  const adaptedPyr = model.adaptSimulationToScenario(baseSimGain, 'PYRAMID_1R_2R');
  assert.equal(adaptedPyr.managementScenario, 'PYRAMID_1R_2R');
  assert.equal(adaptedPyr.resultR, 3.0, 'Lote 1 (+2R) + Lote 2 (+1R) = +3,00R consolidado');
  assert.ok(adaptedPyr.scaleIn && adaptedPyr.scaleIn.executed);
  assert.equal(adaptedPyr.scaleIn.price, 32.00); // 30 + 1 * 2 = 32.00
  assert.equal(adaptedPyr.scaleIn.consolidatedResultR, 3.0);

  // 5. Cenário Pirâmide com recuo após +1R (mfe 1.5, não atingiu 2R)
  const baseSimPyrPullback = {
    ...baseSimGain,
    mfeR: 1.5
  };
  const adaptedPyrPullback = model.adaptSimulationToScenario(baseSimPyrPullback, 'PYRAMID_1R_2R');
  assert.equal(adaptedPyrPullback.status, model.STATUS.CLOSED_LOSS);
  assert.equal(adaptedPyrPullback.resultR, -1.0, 'Lote 1 no breakeven (0R) + Lote 2 no stop (-1R) = -1,00R');
  assert.equal(adaptedPyrPullback.scaleIn.consolidatedResultR, -1.0);
});

test('trade-simulator-model: getDefaultSeedSimulations aceita cenário e gera 42 simulações idênticas em amostra', () => {
  const seeds2R = model.getDefaultSeedSimulations('2R');
  const seeds25R = model.getDefaultSeedSimulations('2.5R');
  const seedsPyr = model.getDefaultSeedSimulations('PYRAMID_1R_2R');
  const seedsPart50 = model.getDefaultSeedSimulations('PARTIAL_50_2R_EMA9');
  const seedsPart80 = model.getDefaultSeedSimulations('PARTIAL_80_2R_EMA9');

  assert.equal(seeds2R.length, 42);
  assert.equal(seeds25R.length, 42);
  assert.equal(seedsPyr.length, 42);
  assert.equal(seedsPart50.length, 42);
  assert.equal(seedsPart80.length, 42);

  // Todos os cenários compartilham a mesma amostra de ativos e datas de sinal
  for (let i = 0; i < 42; i++) {
    assert.equal(seeds2R[i].symbol, seeds25R[i].symbol);
    assert.equal(seeds2R[i].symbol, seedsPyr[i].symbol);
    assert.equal(seeds2R[i].symbol, seedsPart50[i].symbol);
    assert.equal(seeds2R[i].symbol, seedsPart80[i].symbol);
    assert.equal(seeds2R[i].signalDate, seeds25R[i].signalDate);
    assert.equal(seeds2R[i].entryPrice, seeds25R[i].entryPrice);
  }

  // Verifica cenários identificados
  assert.ok(seeds2R.every(s => s.managementScenario === '2R'));
  assert.ok(seeds25R.every(s => s.managementScenario === '2.5R'));
  assert.ok(seedsPyr.every(s => s.managementScenario === 'PYRAMID_1R_2R'));
  assert.ok(seedsPart50.every(s => s.managementScenario === 'PARTIAL_50_2R_EMA9'));
  assert.ok(seedsPart80.every(s => s.managementScenario === 'PARTIAL_80_2R_EMA9'));
});

test('trade-simulator-model: compareManagementScenarios consolida 10 métricas oficiais dos 5 cenários', () => {
  const comparison = model.compareManagementScenarios();
  assert.ok(comparison && Array.isArray(comparison.scenarios));
  assert.equal(comparison.scenarios.length, 5);

  const [sc2R, sc25R, scPyr, scPart50, scPart80] = comparison.scenarios;

  // 1. Cenário 2R Base
  assert.equal(sc2R.id, '2R');
  assert.equal(sc2R.totalTrades, 42);
  assert.equal(sc2R.winRate, 71.4);
  assert.equal(sc2R.lossRate, 28.6);
  assert.equal(sc2R.avgR, 0.93);
  assert.equal(sc2R.expectancy, 0.93);
  assert.equal(sc2R.totalR, 26.10);
  assert.equal(sc2R.winnersCount, 20);
  assert.equal(sc2R.losersCount, 8);

  // 2. Cenário 2.5R Alvo Estendido
  assert.equal(sc25R.id, '2.5R');
  assert.equal(sc25R.totalTrades, 42);
  assert.equal(sc25R.winRate, 35.7);
  assert.equal(sc25R.lossRate, 64.3);
  assert.equal(sc25R.avgR, 0.61);
  assert.equal(sc25R.expectancy, 0.61);
  assert.equal(sc25R.totalR, 17.20);
  assert.equal(sc25R.winnersCount, 10);
  assert.equal(sc25R.losersCount, 18);

  // 3. Cenário Pirâmide 1R -> 2R
  assert.equal(scPyr.id, 'PYRAMID_1R_2R');
  assert.equal(scPyr.totalTrades, 42);
  assert.equal(scPyr.winRate, 46.4);
  assert.equal(scPyr.lossRate, 53.6);
  assert.equal(scPyr.avgR, 0.86);
  assert.equal(scPyr.expectancy, 0.86);
  assert.equal(scPyr.totalR, 24.20);
  assert.equal(scPyr.winnersCount, 13);
  assert.equal(scPyr.losersCount, 15);

  // 4. Cenário Parcial 50% em 2R + Condução por MM9
  assert.equal(scPart50.id, 'PARTIAL_50_2R_EMA9');
  assert.equal(scPart50.totalTrades, 42);
  assert.equal(scPart50.winRate, 71.4);
  assert.equal(scPart50.lossRate, 28.6);
  assert.equal(scPart50.avgR, 0.90);
  assert.equal(scPart50.expectancy, 0.90);
  assert.equal(scPart50.totalR, 25.13);
  assert.equal(scPart50.winnersCount, 20);
  assert.equal(scPart50.losersCount, 8);

  // 5. Cenário Parcial 80% em 2R + Condução por MM9
  assert.equal(scPart80.id, 'PARTIAL_80_2R_EMA9');
  assert.equal(scPart80.totalTrades, 42);
  assert.equal(scPart80.winRate, 71.4);
  assert.equal(scPart80.lossRate, 28.6);
  assert.equal(scPart80.avgR, 0.91);
  assert.equal(scPart80.expectancy, 0.91);
  assert.equal(scPart80.totalR, 25.46);
  assert.equal(scPart80.winnersCount, 20);
  assert.equal(scPart80.losersCount, 8);
});

test('trade-simulator-model: evaluateSimulationOnCandles simula Pirâmide, 2.5R e Parciais com física real de candles', () => {
  const baseSim = {
    symbol: 'PETR4',
    signalDate: '2026-09-01',
    entryPrice: 30.00,
    stopLoss: 28.00, // risk = 2.00, 1R = 32.00, 2R = 34.00, 2.5R = 35.00
    status: model.STATUS.WAITING_ENTRY,
    timeline: []
  };

  // Cenário A: Pirâmide com Gain (+3,00R)
  const candlesGain = [
    { time: '2026-09-01', open: 29.50, high: 29.90, low: 28.50, close: 29.60 },
    { time: '2026-09-02', open: 29.80, high: 30.50, low: 29.50, close: 30.40 }, // Ativa entrada a 30.00
    { time: '2026-09-03', open: 30.50, high: 32.50, low: 30.20, close: 32.20 }, // Passa por 1R (32.00) -> Scale-In!
    { time: '2026-09-04', open: 32.20, high: 34.50, low: 31.80, close: 34.20 }  // Atinge 2R (34.00) -> Saída total +3.00R!
  ];
  const evalPyrGain = model.evaluateSimulationOnCandles(baseSim, candlesGain, 'PYRAMID_1R_2R');
  assert.equal(evalPyrGain.status, model.STATUS.CLOSED_GAIN);
  assert.equal(evalPyrGain.resultR, 3.0);
  assert.ok(evalPyrGain.scaleIn && evalPyrGain.scaleIn.executed);
  assert.equal(evalPyrGain.scaleIn.price, 32.00);
  assert.equal(evalPyrGain.scaleIn.consolidatedResultR, 3.0);

  // Cenário B: Pirâmide com recuo após +1R (atinge 1R, stop vai para 30.00, dia seguinte recua para 29.80)
  const candlesPyrStop = [
    { time: '2026-09-01', open: 29.50, high: 29.90, low: 28.50, close: 29.60 },
    { time: '2026-09-02', open: 29.80, high: 30.50, low: 29.50, close: 30.40 }, // Ativa entrada a 30.00
    { time: '2026-09-03', open: 30.50, high: 32.50, low: 30.20, close: 32.20 }, // Passa por 1R (32.00) -> Scale-In, stop = 30.00
    { time: '2026-09-04', open: 31.80, high: 32.00, low: 29.50, close: 29.80 }  // Recua e bate no stop (30.00) -> -1.00R consolidado!
  ];
  const evalPyrLoss = model.evaluateSimulationOnCandles(baseSim, candlesPyrStop, 'PYRAMID_1R_2R');
  assert.equal(evalPyrLoss.status, model.STATUS.CLOSED_LOSS);
  assert.equal(evalPyrLoss.resultR, -1.0);
  assert.equal(evalPyrLoss.scaleIn.consolidatedResultR, -1.0);

  // Cenário C: Alvo estendido 2.5R atingido
  const candles25Gain = [
    { time: '2026-09-01', open: 29.50, high: 29.90, low: 28.50, close: 29.60 },
    { time: '2026-09-02', open: 29.80, high: 30.50, low: 29.50, close: 30.40 }, // Ativa entrada a 30.00
    { time: '2026-09-03', open: 30.50, high: 33.00, low: 30.20, close: 32.80 },
    { time: '2026-09-04', open: 33.00, high: 35.50, low: 32.50, close: 35.20 }  // Atinge 2.5R (35.00)
  ];
  const eval25Gain = model.evaluateSimulationOnCandles(baseSim, candles25Gain, '2.5R');
  assert.equal(eval25Gain.status, model.STATUS.CLOSED_GAIN);
  assert.equal(eval25Gain.resultR, 2.5);
  assert.equal(eval25Gain.exitPrice, 35.00);

  // Cenário D: Parcial 50% em 2R + condução por MM9
  // Dia 4: atinge 2R (34.00) -> realiza 50% (+1.00R garantido), stop = 30.00
  // Dia 5: preço fecha a 31.00 (abaixo da EMA 9 que está em ~31.04) -> runner encerra a 31.00 (+0.50R no runner)
  // Consolidado: 0.5 * 2.0 + 0.5 * 0.5 = 1.0 + 0.25 = +1.25R
  const candlesPart50 = [
    { time: '2026-09-01', open: 29.50, high: 29.90, low: 28.50, close: 29.60 },
    { time: '2026-09-02', open: 29.80, high: 30.50, low: 29.50, close: 30.40 },
    { time: '2026-09-03', open: 30.50, high: 32.50, low: 30.20, close: 32.20 },
    { time: '2026-09-04', open: 32.20, high: 34.50, low: 31.80, close: 34.20 }, // Atinge +2R (34.00)
    { time: '2026-09-05', open: 33.00, high: 33.10, low: 30.80, close: 31.00 }  // Fecha abaixo da EMA 9
  ];
  const evalPart50 = model.evaluateSimulationOnCandles(baseSim, candlesPart50, 'PARTIAL_50_2R_EMA9');
  assert.equal(evalPart50.status, model.STATUS.CLOSED_GAIN);
  assert.ok(evalPart50.partialExit && evalPart50.partialExit.executed);
  assert.equal(evalPart50.partialExit.percent, 50);
  assert.equal(evalPart50.partialExit.runnerPercent, 50);
  assert.equal(evalPart50.resultR, 1.25); // 0.5*2 + 0.5*0.5 = 1.25R
  assert.ok(evalPart50.resultR > 1.0);
});

test('trade-simulator-model: calcula duração de dias de cada trade e duração média dos trades', () => {
  // 1. Trade encerrado vencedor (ITUB4: 23/09/2026 até 01/10/2026 = 8 dias)
  const itub = {
    symbol: 'ITUB4',
    status: model.STATUS.CLOSED_GAIN,
    signalDate: '2026-09-22',
    entryDate: '2026-09-23',
    exitDate: '2026-10-01'
  };
  assert.equal(model.calculateTradeDurationDays(itub), 8);
  assert.equal(model.formatDurationDays(model.calculateTradeDurationDays(itub)), '8 dias');

  // 2. Trade com duração de 1 dia (singular)
  const oneDayTrade = {
    status: model.STATUS.CLOSED_GAIN,
    entryDate: '2026-10-01',
    exitDate: '2026-10-02'
  };
  assert.equal(model.calculateTradeDurationDays(oneDayTrade), 1);
  assert.equal(model.formatDurationDays(1), '1 dia');

  // 3. Trade encerrado perdedor (KEPL3: 18/09/2026 até 24/09/2026 = 6 dias)
  const kepl = {
    symbol: 'KEPL3',
    status: model.STATUS.CLOSED_LOSS,
    signalDate: '2026-09-17',
    entryDate: '2026-09-18',
    exitDate: '2026-09-24'
  };
  assert.equal(model.calculateTradeDurationDays(kepl), 6);

  // 4. Trade aguardando entrada não possui duração
  const waiting = {
    status: model.STATUS.WAITING_ENTRY,
    signalDate: '2026-10-02'
  };
  assert.equal(model.calculateTradeDurationDays(waiting), null);
  assert.equal(model.formatDurationDays(model.calculateTradeDurationDays(waiting)), '—');

  // 5. Trade em operação calcula dias decorridos até referência
  const inOp = {
    status: model.STATUS.IN_OPERATION,
    signalDate: '2026-10-02',
    entryDate: '2026-10-03'
  };
  assert.equal(model.calculateTradeDurationDays(inOp, '2026-10-05'), 2);

  // 6. Todas as simulações padrão possuem duração válida
  const seeds = model.getDefaultSeedSimulations();
  seeds.forEach(s => {
    if (s.status === model.STATUS.CLOSED_GAIN || s.status === model.STATUS.CLOSED_LOSS) {
      assert.ok(s.durationDays > 0, `Trade encerrado ${s.symbol} deve ter durationDays > 0`);
    } else if (s.status === model.STATUS.WAITING_ENTRY) {
      assert.equal(s.durationDays, null, `Trade aguardando ${s.symbol} deve ter durationDays null`);
    }
  });

  // 7. Estatísticas consolidadas calculam a média geral dos trades encerrados (10,6 dias)
  const stats = model.calculateSimulatorStats(seeds);
  assert.equal(stats.avgDurationDays, 10.6);
  assert.equal(stats.avgDurationDaysFormatted, '10,6 dias');

  // 8. Comparador de cenários reporta duração média para todos os cenários
  const comp = model.compareManagementScenarios(seeds);
  const sc2R = comp.scenarios.find(s => s.id === '2R');
  const sc25R = comp.scenarios.find(s => s.id === '2.5R');
  const scPyr = comp.scenarios.find(s => s.id === 'PYRAMID_1R_2R');
  assert.ok(sc2R && sc2R.avgDurationDaysFormatted);
  assert.ok(sc25R && sc25R.avgDurationDaysFormatted);
  assert.ok(scPyr && scPyr.avgDurationDaysFormatted);
});

test('trade-simulator-model: getTradeVisionAtivo reproduz com fidelidade o cenário do Rubric e Visão do Ativo', () => {
  // Caso 1: ITUB4 na data de 22/09/2026 (Exatamente como na Imagem 2 do usuário)
  const itub = {
    symbol: 'ITUB4',
    signalDate: '2026-09-22',
    entryPrice: 37.20,
    stopLoss: 35.90,
    triggerName: 'Inside Bar',
    grade: 'B',
    status: model.STATUS.CLOSED_GAIN
  };

  const visionItub = model.getTradeVisionAtivo(itub);
  assert.ok(visionItub, 'Visão do Ativo deve ser gerada');
  assert.equal(visionItub.grade, 'B');
  assert.equal(visionItub.gradeBoxClass, 'grade-b');

  // 1. Força Relativa: Neutro (67)
  assert.equal(visionItub.relativeStrength.classification, 'Neutro');
  assert.equal(visionItub.relativeStrength.score, 67);
  assert.equal(visionItub.relativeStrength.status, 'neutral');
  assert.equal(visionItub.relativeStrength.text, 'Neutro (67)');

  // 2. Ciclo de Mercado: Positivo
  assert.equal(visionItub.marketCycle.regime, 'Positivo');
  assert.equal(visionItub.marketCycle.status, 'good');

  // 3. Tendência: Preço > EMA 9 > EMA 30
  assert.equal(visionItub.trend.formula, 'Preço > EMA 9 > EMA 30');
  assert.equal(visionItub.trend.status, 'good');

  // 4. Estrutura: Correção
  assert.equal(visionItub.structure.label, 'Correção');
  assert.equal(visionItub.structure.status, 'good');

  // 5. Gatilho: Inside Bar (B)
  assert.equal(visionItub.trigger.display, 'Inside Bar (B)');
  assert.equal(visionItub.trigger.status, 'good');

  // 6. Volatilidade: Normal (ATR 1,30 | 3,49%)
  assert.equal(visionItub.volatility.regime, 'Normal');
  assert.equal(visionItub.volatility.atr21, 1.30);
  assert.equal(visionItub.volatility.text, 'Normal (ATR 1,30 | 3,49%)');
  assert.equal(visionItub.volatility.status, 'good');

  // 7. Fundamentos: Forte
  assert.equal(visionItub.fundamentals.evaluation, 'Forte');
  assert.equal(visionItub.fundamentals.status, 'good');

  // 8. Contexto: Super Contexto
  assert.equal(visionItub.context.title, 'Super Contexto');
  assert.equal(visionItub.context.status, 'good');

  // Caso 2: Simulações padrão trazem visionAtivo anexado
  const seeds = model.getDefaultSeedSimulations();
  const seedItub = seeds.find(s => s.symbol === 'ITUB4');
  assert.ok(seedItub && seedItub.visionAtivo);
  assert.equal(seedItub.visionAtivo.relativeStrength.score, 67);

  // Caso 3: Trade que estopou em mercado defensivo (Junho de 2026)
  const defensiveTrade = {
    symbol: 'PETR4',
    signalDate: '2026-06-15',
    entryPrice: 38.00,
    stopLoss: 36.00,
    triggerName: 'Inside Bar',
    grade: 'B',
    status: model.STATUS.CLOSED_LOSS
  };
  const visionDefensive = model.getTradeVisionAtivo(defensiveTrade);
  assert.equal(visionDefensive.marketCycle.regime, 'Defensivo');
  assert.equal(visionDefensive.marketCycle.status, 'bad');
  assert.equal(visionDefensive.trend.status, 'bad');
  assert.equal(visionDefensive.structure.label, 'Degradada');
  assert.equal(visionDefensive.context.title, 'Desfavorável');
});

test('trade-simulator-model: calculateDoubleInsideBarStructure valida contenção aninhada estrita e métricas de compressão', () => {
  // Caso 1: Estrutura válida (Candle-mãe -> IB1 -> IB2)
  const mother = { high: 50.00, low: 40.00 }; // range = 10.00
  const ib1 = { high: 48.00, low: 42.00 };    // range = 6.00 (60% do mother)
  const ib2 = { high: 46.00, low: 44.00 };    // range = 2.00 (33.3% do ib1)

  const validStruct = model.calculateDoubleInsideBarStructure(mother, ib1, ib2);
  assert.ok(validStruct);
  assert.equal(validStruct.ibCount, 2);
  assert.equal(validStruct.motherCandle.range, 10.00);
  assert.equal(validStruct.ib1.range, 6.00);
  assert.equal(validStruct.ib2.range, 2.00);
  assert.equal(validStruct.ib1.compressionRatio, 0.6);
  assert.equal(validStruct.ib2.compressionRatio, 0.33);
  assert.equal(validStruct.totalCompressionRatio, 0.2); // 2.00 / 10.00
  assert.equal(validStruct.totalCompressionPct, 20.0);
  assert.equal(validStruct.totalContractionPct, 80.0); // 100 - 20
  assert.equal(validStruct.entryPrice, 46.01); // high ib2 + 0.01
  assert.equal(validStruct.stopLoss, 43.99);   // low ib2 - 0.01
  assert.equal(validStruct.initialRisk, 2.02);
  assert.equal(validStruct.graphicRiskPct, 4.39);

  // Caso 2: Falha quando IB1 rompe a máxima do Candle-mãe
  const badIb1 = { high: 50.50, low: 42.00 };
  const resBadIb1 = model.calculateDoubleInsideBarStructure(mother, badIb1, ib2);
  assert.equal(resBadIb1.isValid, false);
  assert.equal(resBadIb1.isIb1InsideMother, false);

  // Caso 3: Falha quando IB2 rompe a mínima de IB1
  const badIb2 = { high: 46.00, low: 41.50 };
  const resBadIb2 = model.calculateDoubleInsideBarStructure(mother, ib1, badIb2);
  assert.equal(resBadIb2.isValid, false);
  assert.equal(resBadIb2.isIb2InsideIb1, false);

  // Caso 4: Falha em máximas/mínimas iguais (Inside Bar estrito requer < e >)
  const equalIb = { high: 50.00, low: 42.00 };
  const resEqualIb = model.calculateDoubleInsideBarStructure(mother, equalIb, ib2);
  assert.equal(resEqualIb.isValid, false);
});

test('trade-simulator-model: evaluateSimulationOnCandles rastreia Time to Target (TTT) e expansão pós-rompimento', () => {
  const sim = {
    symbol: 'TEST3',
    signalDate: '2026-08-01',
    entryPrice: 20.00,
    stopLoss: 18.00, // R = 2.00. 1R = 22.00, 2R = 24.00, 3R = 26.00
    triggerName: 'Double Inside Bar',
    status: model.STATUS.WAITING_ENTRY
  };

  const candles = [
    { date: '2026-08-01', open: 19.00, high: 19.50, low: 18.50, close: 19.20 },
    // Candle 1: ativa entrada a 20.00
    { date: '2026-08-02', open: 19.80, high: 20.50, low: 19.50, close: 20.30 },
    // Candle 2: atinge +1R (22.10 >= 22.00) -> ttt1R = 2 candles
    { date: '2026-08-03', open: 20.40, high: 22.20, low: 20.20, close: 22.00 },
    // Candle 3: continua subindo
    { date: '2026-08-04', open: 22.10, high: 23.50, low: 21.90, close: 23.20 },
    // Candle 4: atinge +2R (24.20 >= 24.00) -> ttt2R = 4 candles
    { date: '2026-08-05', open: 23.30, high: 24.20, low: 23.00, close: 24.10 }
  ];

  const evaluated = model.evaluateSimulationOnCandles(sim, candles);
  assert.equal(evaluated.status, model.STATUS.CLOSED_GAIN);
  assert.equal(evaluated.ttt1R, 2, 'Primeiro toque de +1R ocorre no 2º candle da operação');
  assert.equal(evaluated.ttt2R, 4, 'Primeiro toque de +2R ocorre no 4º candle da operação');
  assert.equal(evaluated.ttt3R, null, '+3R não foi atingido');
  assert.ok(evaluated.expansionAfterBreakout);
  assert.ok(evaluated.expansionAfterBreakout.c1 != null);
  assert.ok(evaluated.expansionAfterBreakout.c2 != null);
});

test('trade-simulator-model: compareInsideBarTriggers gera comparação estatística direta e preserva bet sizing', () => {
  const seeds = model.getDefaultSeedSimulations();
  const comparison = model.compareInsideBarTriggers(seeds);

  assert.ok(comparison.simple, 'Deve conter grupo Inside Bar simples');
  assert.ok(comparison.double, 'Deve conter grupo Double Inside Bar');
  assert.ok(comparison.diff, 'Deve conter deltas comparativos');
  assert.ok(comparison.crossContext, 'Deve conter cruzamentos contextuais');
  assert.ok(comparison.hypothesisStatus, 'Deve conter status da hipótese');

  // Nomes de gatilhos corretos
  assert.equal(comparison.simple.triggerName, 'Inside Bar');
  assert.equal(comparison.double.triggerName, 'Double Inside Bar');

  // Métricas obrigatórias no grupo Double Inside Bar
  assert.ok(comparison.double.totalCreated > 0);
  assert.ok(comparison.double.winRateFormatted);
  assert.ok(comparison.double.avgGainFormatted);
  assert.ok(comparison.double.avgLossFormatted);
  assert.ok(comparison.double.expectancyFormatted);
  assert.ok(comparison.double.totalRFormatted);
  assert.ok(comparison.double.avgTtt1RFormatted);
  assert.ok(comparison.double.avgTtt2RFormatted);
  assert.ok(comparison.double.pctHit1RFormatted);
  assert.ok(comparison.double.pctHit2RFormatted);
  assert.ok(comparison.double.pctHit3RFormatted);

  // Velocidade (TTT): Double Inside Bar atinge +1R mais rápido (1,8 vs 2,7 candles)
  assert.ok(comparison.double.avgTtt1R < comparison.simple.avgTtt1R, 'Double Inside Bar deve ter TTT1R menor ou igual');
  assert.ok(comparison.diff.ttt1RDelta < 0, 'Delta de TTT1R deve ser negativo (mais rápido)');

  // Cruzamentos do Edge
  assert.ok(comparison.crossContext.byRsTier.tier95_100);
  assert.ok(comparison.crossContext.byRsTier.tierSub80);
  assert.ok(comparison.crossContext.byMarketCycle.healthy);
  assert.ok(comparison.crossContext.byMarketCycle.defensive);
  assert.ok(comparison.crossContext.bySuperTrend.aligned);
  assert.ok(comparison.crossContext.bySuperTrend.notAligned);

  // REGRA DE OURO INVIOLÁVEL: Bet Sizing NÃO é alterado
  assert.match(comparison.hypothesisStatus.betSizingRule, /INALTERADO/);
});

test('trade-simulator-model: calculateSimulatorStats calcula profit factor, max drawdown, sequências e distribuição em R', () => {
  const seeds = model.getDefaultSeedSimulations('2R');
  const stats = model.calculateSimulatorStats(seeds);

  // Métricas estatísticas avançadas
  assert.ok(stats.profitFactor !== undefined);
  assert.ok(stats.profitFactorFormatted);
  assert.ok(stats.maxDrawdownR !== undefined);
  assert.ok(stats.maxDrawdownRFormatted);
  assert.ok(stats.maxConsecutiveLosses !== undefined);
  assert.ok(stats.totalGainsR > 0);
  assert.ok(stats.totalLossesR > 0);

  // 6 Buckets de distribuição em R
  assert.ok(Array.isArray(stats.rDistribution));
  assert.equal(stats.rDistribution.length, 6);
  assert.equal(stats.rDistribution[0].bucket, '< -1R');
  assert.equal(stats.rDistribution[1].bucket, '-1R');
  assert.equal(stats.rDistribution[2].bucket, '-0.99R a 0R');
  assert.equal(stats.rDistribution[3].bucket, '0R a +1R');
  assert.equal(stats.rDistribution[4].bucket, '+1R a +2R');
  assert.equal(stats.rDistribution[5].bucket, '> +2R');

  // Performance por Grade do Rubric
  assert.ok(Array.isArray(stats.gradePerformance));
  const gradeA = stats.gradePerformance.find(g => g.name === 'A');
  assert.ok(gradeA);

  // Performance por Período
  assert.ok(Array.isArray(stats.periodPerformance));
});

test('trade-simulator-model: filterSimulations suporta períodos de 6m, 12m, 24m, 36m e datas personalizadas', () => {
  const seeds = model.getDefaultSeedSimulations('2R');

  // Filtro 365 dias
  const f365 = model.filterSimulations(seeds, { days: 365 });
  assert.ok(f365.length > 0);

  // Filtro 730 dias (24 meses)
  const f730 = model.filterSimulations(seeds, { days: 730 });
  assert.ok(f730.length > 0);

  // Filtro 1095 dias (36 meses)
  const f1095 = model.filterSimulations(seeds, { days: 1095 });
  assert.ok(f1095.length > 0);

  // Filtro CUSTOM com intervalo específico
  const customFiltered = model.filterSimulations(seeds, {
    days: 'CUSTOM',
    startDate: '2026-07-01',
    endDate: '2026-08-31'
  });
  assert.ok(Array.isArray(customFiltered));
  assert.ok(customFiltered.every(s => s.signalDate >= '2026-07-01' && s.signalDate <= '2026-08-31'));
});

test('trade-simulator-model: detectSetupTrigger identifica Inside Bar, Double Inside Bar e 1-2-3 de Compra', () => {
  // 1. Inside Bar clássico (candle 2 contido em candle 1 e acima da EMA9/EMA30)
  const ibCandles = [
    { date: '2026-01-01', open: 20, high: 22, low: 19, close: 21, ema9: 20, ema30: 18 },
    { date: '2026-01-02', open: 20.5, high: 21.5, low: 20, close: 21, ema9: 20.2, ema30: 18.2 }
  ];
  const ib = model.detectSetupTrigger(ibCandles);
  assert.ok(ib);
  assert.equal(ib.name, 'Inside Bar');
  assert.equal(ib.entry, 21.51); // high + 0.01
  assert.equal(ib.stop, 19.99); // low - 0.01

  // 2. Double Inside Bar (candle 3 contido em 2, que está contido em 1)
  const dibCandles = [
    { date: '2026-01-01', open: 20, high: 24, low: 18, close: 22, ema9: 20, ema30: 18 },
    { date: '2026-01-02', open: 21, high: 23, low: 19, close: 22, ema9: 20.5, ema30: 18.2 },
    { date: '2026-01-03', open: 21.5, high: 22.5, low: 20, close: 22, ema9: 21, ema30: 18.5 }
  ];
  const dib = model.detectSetupTrigger(dibCandles);
  assert.ok(dib);
  assert.equal(dib.name, 'Double Inside Bar');

  // 3. 1-2-3 de Compra (Fundo em V: c1.low > c2.low e c3.low > c2.low)
  const setup123Candles = [
    { date: '2026-01-01', open: 22, high: 23, low: 20, close: 21, ema9: 20, ema30: 18 },
    { date: '2026-01-02', open: 20.5, high: 21.5, low: 19, close: 20, ema9: 20, ema30: 18 }, // fundo
    { date: '2026-01-03', open: 20.2, high: 22, low: 19.8, close: 21.8, ema9: 20.3, ema30: 18.2 }
  ];
  const s123 = model.detectSetupTrigger(setup123Candles);
  assert.ok(s123);
  assert.equal(s123.name, '1-2-3 de Compra');
  assert.equal(s123.entry, 22.01);
  assert.equal(s123.stop, 18.99); // Mínima do candle 2 - 0.01
});

test('trade-simulator-model: generateHistoricalSimulations gera massa de trades sem look-ahead e respeita concorrência de ativos', () => {
  // Cria dados sintéticos para 3 ativos ao longo de 60 pregões
  const dates = [];
  const start = new Date('2026-01-05');
  for (let i = 0; i < 60; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      dates.push(d.toISOString().slice(0, 10));
    }
  }

  const candlesMap = new Map();
  ['VALE3', 'PETR4', 'ITUB4'].forEach(sym => {
    let price = 50;
    const candles = dates.map((date, idx) => {
      // Cria alternâncias que disparam setups
      const mod = idx % 5;
      let high, low, close, open;
      if (mod === 0) {
        open = price; high = price + 2; low = price - 1; close = price + 1;
      } else if (mod === 1) {
        // Inside bar
        open = price + 0.5; high = price + 1; low = price; close = price + 0.8;
      } else {
        open = price + 0.8; high = price + 3; low = price + 0.5; close = price + 2.5;
        price += 1;
      }
      return {
        date,
        open,
        high,
        low,
        close,
        ema9: price - 1,
        ema30: price - 3,
        volume: 1000000
      };
    });
    candlesMap.set(sym, candles);
  });

  const res = model.generateHistoricalSimulations({
    candlesMap,
    metadataMap: {
      VALE3: { name: 'Vale', sector: 'Mineração' },
      PETR4: { name: 'Petrobras', sector: 'Petróleo' },
      ITUB4: { name: 'Itaú', sector: 'Financeiro' }
    },
    targetVolume: 10,
    period: 'ALL',
    scenario: '2R'
  });

  assert.ok(res.simulations.length > 0, 'Deve gerar simulações');
  assert.ok(res.stats, 'Deve retornar stats calculadas');
  assert.ok(res.meta, 'Deve retornar metadados da execução');

  // Separar distinções fundamentais
  assert.ok(res.stats.totalCreated >= res.stats.executedEntriesCount, 'Sinais identificados >= Entradas executadas');
  assert.ok(res.stats.executedEntriesCount === (res.stats.winningTradesCount + res.stats.losingTradesCount + res.stats.inOperationCount),
    'Entradas executadas = Vencedores + Perdedores + Em Operação');

  // Concorrência: nenhum ativo pode ter 2 posições sobrepostas
  const simByAsset = {};
  res.simulations.forEach(sim => {
    if (!simByAsset[sim.symbol]) simByAsset[sim.symbol] = [];
    simByAsset[sim.symbol].push(sim);
  });

  for (const [sym, list] of Object.entries(simByAsset)) {
    list.sort((a, b) => String(a.signalDate).localeCompare(String(b.signalDate)));
    for (let i = 0; i < list.length - 1; i++) {
      const current = list[i];
      const next = list[i + 1];
      if (current.exitDate) {
        assert.ok(
          String(next.signalDate) >= String(current.exitDate),
          `Ativo ${sym} não pode abrir trade em ${next.signalDate} antes da saída do trade anterior em ${current.exitDate}`
        );
      }
    }
  }
});

test('trade-simulator-model: calendário B3 rejeita fins de semana e feriados e faz snap determinístico', () => {
  // Sábado e Domingo
  assert.equal(model.isTradingDay('2026-09-19'), false, '19/09/2026 é sábado');
  assert.equal(model.isTradingDay('2026-09-20'), false, '20/09/2026 é domingo');
  assert.equal(model.isTradingDay('2026-09-21'), true, '21/09/2026 é segunda-feira');

  // Feriados B3
  assert.equal(model.isHolidayB3('2026-01-01'), true, 'Confraternização Universal');
  assert.equal(model.isHolidayB3('2026-04-21'), true, 'Tiradentes');
  assert.equal(model.isHolidayB3('2026-05-01'), true, 'Dia do Trabalho');
  assert.equal(model.isHolidayB3('2026-09-07'), true, 'Independência do Brasil');
  assert.equal(model.isHolidayB3('2026-10-12'), true, 'N. Sra. Aparecida');
  assert.equal(model.isHolidayB3('2026-11-02'), true, 'Finados');
  assert.equal(model.isHolidayB3('2026-11-15'), true, 'Proclamação da República');
  assert.equal(model.isHolidayB3('2026-11-20'), true, 'Dia da Consciência Negra');
  assert.equal(model.isHolidayB3('2026-12-25'), true, 'Natal');

  // Snap to trading day: sábado 19/09 avança para segunda 21/09
  assert.equal(model.snapToTradingDay('2026-09-19'), '2026-09-21');
  assert.equal(model.snapToTradingDay('2026-09-20'), '2026-09-21');
  assert.equal(model.snapToTradingDay('2026-09-21'), '2026-09-21');

  // Feriado 07/09/2026 (segunda-feira) avança para terça 08/09/2026
  assert.equal(model.snapToTradingDay('2026-09-07'), '2026-09-08');
});

test('trade-simulator-model: validateSimulation identifica inconsistências de notas, calendário e integridade de trade', () => {
  // Trade válido (deve ser válido e ter 0 erros)
  const validTrade = {
    symbol: 'PETR4',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-09-21',
    entryDate: '2026-09-22',
    exitDate: '2026-09-25',
    entryPrice: 30.00,
    stopLoss: 28.50,
    executedEntryPrice: 30.00,
    currentStop: 28.50,
    exitPrice: 33.00,
    status: model.STATUS.CLOSED_GAIN,
    resultR: 2.0,
    mfeR: 2.5,
    maeR: -0.3,
    durationDays: 3
  };
  const resValid = model.validateSimulation(validTrade);
  assert.equal(resValid.isValid, true);
  assert.equal(resValid.errors.length, 0, 'Trade válido não deve ter erros');

  // 1. Nota inválida (A+ ou outra classificação fora de A, B, C, D)
  const invalidGrade = { ...validTrade, grade: 'A+' };
  const resGrade = model.validateSimulation(invalidGrade);
  assert.equal(resGrade.isValid, false);
  assert.ok(resGrade.errors.some(i => i.field === 'grade' && i.code === 'INVALID_GRADE'));

  // 2. Data em final de semana (sábado 19/09/2026)
  const weekendSignal = { ...validTrade, signalDate: '2026-09-19' };
  const resWeekend = model.validateSimulation(weekendSignal);
  assert.equal(resWeekend.isValid, false);
  assert.ok(resWeekend.errors.some(i => i.field === 'signalDate' && i.code === 'NON_TRADING_DAY_SIGNAL'));

  // 3. Feriado sem pregão (07/09/2026)
  const holidayEntry = { ...validTrade, entryDate: '2026-09-07' };
  const resHoliday = model.validateSimulation(holidayEntry);
  assert.equal(resHoliday.isValid, false);
  assert.ok(resHoliday.errors.some(i => i.field === 'entryDate' && i.code === 'NON_TRADING_DAY_ENTRY'));

  // 4. Inconsistência de Gain com 0,00R ou negativo
  const gainZeroR = { ...validTrade, status: model.STATUS.CLOSED_GAIN, resultR: 0.0 };
  const resGainZero = model.validateSimulation(gainZeroR);
  assert.equal(resGainZero.isValid, false);
  assert.ok(resGainZero.errors.some(i => i.code === 'ZERO_OR_NEGATIVE_GAIN'));

  // 5. Inversão cronológica: saída antes da entrada
  const invertedChronology = { ...validTrade, entryDate: '2026-09-25', exitDate: '2026-09-22' };
  const resChronology = model.validateSimulation(invertedChronology);
  assert.equal(resChronology.isValid, false);
  assert.ok(resChronology.errors.some(i => i.code === 'CHRONOLOGY_ERROR'));
});

test('trade-simulator-model: auditSimulationsBatch audita integridade global e reconciliação estatística', () => {
  const seeds = model.getDefaultSeedSimulations();
  const report = model.auditSimulationsBatch(seeds);

  assert.equal(report.isConsistent, true, 'Lote padrão de seeds deve ser 100% consistente na auditoria');
  assert.equal(report.invalidRecords.length, 0, 'Zero registros inválidos no lote padrão');
  assert.equal(report.summary.totalEvaluated, 42);
  assert.equal(report.summary.executedEntriesCount, 32);
  assert.equal(report.summary.closedTradesCount, 28);

  // Invariantes matemáticas da reconciliação estatística
  const reconciliation = report.reconciliation;
  assert.equal(reconciliation.isReconciled, true, 'Reconciliação global deve ser verdadeira');
  assert.equal(reconciliation.countsMatch, true, 'Total criado = soma de todos os estados');
  assert.equal(reconciliation.executedMatch, true, 'executedEntriesCount = inOperation + closed');
  assert.equal(reconciliation.closedMatch, true, 'closedTrades = winners + losers');
  assert.equal(reconciliation.onlyValidGradesPresent, true, 'Apenas notas válidas presentes');
  assert.equal(reconciliation.globalTotalR, 26.1);
  assert.equal(reconciliation.triggerSumR, 26.1);
  assert.equal(reconciliation.gradeSumR, 26.1);
});

