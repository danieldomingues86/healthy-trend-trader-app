const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('./trade-simulator-model');

test('trade-simulator-model: getDefaultSeedSimulations reproduz com exatidão as métricas sem o gatilho Pullback', () => {
  const seeds = model.getDefaultSeedSimulations();
  assert.equal(seeds.length, 42, 'Deve conter exatamente 42 simulações criadas');

  const stats = model.calculateSimulatorStats(seeds);

  // Card 1: Simulações criadas = 42
  assert.equal(stats.totalCreated, 42);

  // Card 2: Entradas executadas = 36
  assert.equal(stats.executedEntriesCount, 36);
  assert.equal(stats.executedPct, 85.71);

  // Card 7: Aguardando entrada = 6
  assert.equal(stats.waitingCount, 6);
  assert.equal(stats.waitingPct, 14.29);

  // Abas: Em Operação (4), Encerrados (32)
  assert.equal(stats.inOperationCount, 4);
  assert.equal(stats.closedCount, 32);

  // Card 3: Trades vencedores = 20 (55,6% win rate)
  assert.equal(stats.winningTradesCount, 20);
  assert.equal(stats.winRate, 55.6);

  // Card 4: Trades perdedores = 16 (44,4% loss rate)
  assert.equal(stats.losingTradesCount, 16);
  assert.equal(stats.lossRate, 44.4);

  // Card 5: Resultado total = +23,4R
  assert.equal(stats.totalR, 23.4);
  assert.equal(stats.totalRFormatted, '+23,40R');

  // Card 6: R médio / trade = +0,65R (23,4 / 36 ≈ 0,65R)
  assert.equal(stats.avgR, 0.65);
  assert.equal(stats.avgRFormatted, '+0,65R');

  // Card 7: Duração média = 10,7 dias
  assert.equal(stats.avgDurationDays, 10.7);
  assert.equal(stats.avgDurationDaysFormatted, '10,7 dias');

  // Gráfico: Distribuição de Resultados
  assert.equal(stats.distribution.winners.count, 20);
  assert.equal(stats.distribution.losers.count, 16);
  assert.equal(stats.distribution.notTriggered.count, 6);

  // Gráfico: Desempenho por Gatilho
  const insideBar = stats.triggerPerformance.find(t => t.name === 'Inside Bar');
  const setup123 = stats.triggerPerformance.find(t => t.name === '1-2-3 de Compra');
  const pullback = stats.triggerPerformance.find(t => t.name === 'Pullback');
  const outros = stats.triggerPerformance.find(t => t.name === 'Outros');

  assert.ok(insideBar);
  assert.ok(setup123);
  assert.equal(pullback, undefined, 'Gatilho Pullback não deve existir no desempenho por gatilho');
  assert.ok(outros);

  // Inside Bar: 13,4R e 18 trades
  assert.equal(insideBar.count, 18);
  assert.equal(insideBar.totalR, 13.4);

  // 1-2-3 de Compra: 9,9R e 17 trades
  assert.equal(setup123.count, 17);
  assert.equal(setup123.totalR, 9.9);

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

  const gradeAPlus = model.filterSimulations(seeds, { grade: 'A+' });
  assert.ok(gradeAPlus.length > 0);
  assert.ok(gradeAPlus.every(s => s.grade === 'A+'));
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
  assert.equal(adapted25RStopped.exitReason, 'Proteção / Breakeven');

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
  assert.equal(sc2R.winRate, 55.6);
  assert.equal(sc2R.lossRate, 44.4);
  assert.equal(sc2R.avgR, 0.65);
  assert.equal(sc2R.expectancy, 0.65);
  assert.equal(sc2R.totalR, 23.40);
  assert.equal(sc2R.winnersCount, 20);
  assert.equal(sc2R.losersCount, 16);

  // 2. Cenário 2.5R Alvo Estendido
  assert.equal(sc25R.id, '2.5R');
  assert.equal(sc25R.totalTrades, 42);
  assert.equal(sc25R.winRate, 27.8);
  assert.equal(sc25R.lossRate, 72.2);
  assert.equal(sc25R.avgR, 0.48);
  assert.equal(sc25R.expectancy, 0.48);
  assert.equal(sc25R.totalR, 17.20);
  assert.equal(sc25R.winnersCount, 10);
  assert.equal(sc25R.losersCount, 26);

  // 3. Cenário Pirâmide 1R -> 2R
  assert.equal(scPyr.id, 'PYRAMID_1R_2R');
  assert.equal(scPyr.totalTrades, 42);
  assert.equal(scPyr.winRate, 36.1);
  assert.equal(scPyr.lossRate, 63.9);
  assert.equal(scPyr.avgR, 0.67);
  assert.equal(scPyr.expectancy, 0.67);
  assert.equal(scPyr.totalR, 24.20);
  assert.equal(scPyr.winnersCount, 13);
  assert.equal(scPyr.losersCount, 23);

  // 4. Cenário Parcial 50% em 2R + Condução por MM9
  assert.equal(scPart50.id, 'PARTIAL_50_2R_EMA9');
  assert.equal(scPart50.totalTrades, 42);
  assert.equal(scPart50.winRate, 55.6);
  assert.equal(scPart50.lossRate, 44.4);
  assert.equal(scPart50.avgR, 0.70);
  assert.equal(scPart50.expectancy, 0.70);
  assert.equal(scPart50.totalR, 25.13);
  assert.equal(scPart50.winnersCount, 20);
  assert.equal(scPart50.losersCount, 16);

  // 5. Cenário Parcial 80% em 2R + Condução por MM9
  assert.equal(scPart80.id, 'PARTIAL_80_2R_EMA9');
  assert.equal(scPart80.totalTrades, 42);
  assert.equal(scPart80.winRate, 55.6);
  assert.equal(scPart80.lossRate, 44.4);
  assert.equal(scPart80.avgR, 0.71);
  assert.equal(scPart80.expectancy, 0.71);
  assert.equal(scPart80.totalR, 25.46);
  assert.equal(scPart80.winnersCount, 20);
  assert.equal(scPart80.losersCount, 16);
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

  // 7. Estatísticas consolidadas calculam a média geral dos trades encerrados (10,7 dias)
  const stats = model.calculateSimulatorStats(seeds);
  assert.equal(stats.avgDurationDays, 10.7);
  assert.equal(stats.avgDurationDaysFormatted, '10,7 dias');

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
    grade: 'B+',
    status: model.STATUS.CLOSED_GAIN
  };

  const visionItub = model.getTradeVisionAtivo(itub);
  assert.ok(visionItub, 'Visão do Ativo deve ser gerada');
  assert.equal(visionItub.grade, 'B+');
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

  // 5. Gatilho: Inside Bar (B+)
  assert.equal(visionItub.trigger.display, 'Inside Bar (B+)');
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
