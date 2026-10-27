'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const TradeSimulatorModel = require('./trade-simulator-model');

test('Cenário A — Entrada executada no candle seguinte (T+1)', () => {
  const baseSim = {
    symbol: 'PETR4',
    triggerName: '1-2-3 de Compra',
    grade: 'A',
    signalDate: '2026-06-01',
    entryPrice: 30.00,
    stopLoss: 28.00,
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY,
    managementScenario: '2R'
  };

  const candles = [
    { date: '2026-06-01', open: 29.00, high: 29.90, low: 28.50, close: 29.50 }, // Candle T (Sinal)
    { date: '2026-06-02', open: 29.60, high: 30.50, low: 29.20, close: 30.20 }, // Candle T+1: rompe 30.00
    { date: '2026-06-03', open: 30.20, high: 34.50, low: 30.00, close: 34.20 }  // Candle T+2: atinge alvo +2R (34.00)
  ];

  const evaluated = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, candles);

  assert.equal(evaluated.status, TradeSimulatorModel.STATUS.CLOSED_GAIN);
  assert.equal(evaluated.executedEntryPrice, 30.00);
  assert.equal(evaluated.entryDate, '2026-06-02', 'Entrada deve ser executada exatamente em T+1');
  assert.equal(evaluated.resultR, 2.0);
  assert.ok(evaluated.timeline.some(e => e.type === 'ENTRY_EXECUTED' && e.date === '2026-06-02'));
});

test('Cenário B — Entrada não executada no candle seguinte (T+1): ordem cancelada sem operação', () => {
  const baseSim = {
    symbol: 'VALE3',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-06-01',
    entryPrice: 60.00,
    stopLoss: 57.00,
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY,
    managementScenario: '2R'
  };

  const candles = [
    { date: '2026-06-01', open: 58.00, high: 59.50, low: 57.50, close: 59.00 }, // Candle T (Sinal)
    { date: '2026-06-02', open: 59.00, high: 59.80, low: 58.20, close: 58.50 }  // Candle T+1: máxima 59.80 < 60.00
  ];

  const evaluated = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, candles);

  assert.equal(evaluated.status, TradeSimulatorModel.STATUS.NOT_TRIGGERED, 'Status deve ser NOT_TRIGGERED');
  assert.equal(evaluated.executedEntryPrice, null, 'Preço executado deve ser nulo');
  assert.equal(evaluated.entryDate, null, 'Data de entrada deve ser nula');
  assert.equal(evaluated.resultR, null, 'Resultado em R deve ser nulo');
  assert.equal(evaluated.exitDate, '2026-06-02', 'Data de invalidação deve ser a data de T+1');
  assert.ok(evaluated.exitReason.includes('candle seguinte (T+1)'));
  assert.ok(evaluated.timeline.some(e => e.type === 'NOT_TRIGGERED' && e.date === '2026-06-02'));
});

test('Cenário C — Rompimento tardio: candle T+1 não executa, mas candle T+2 rompe máxima planejada', () => {
  const baseSim = {
    symbol: 'MILL11',
    triggerName: '1-2-3 de Compra',
    grade: 'A',
    signalDate: '2025-11-10',
    entryPrice: 83.57,
    stopLoss: 81.05,
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY,
    managementScenario: '2R'
  };

  const candles = [
    { date: '2025-11-10', open: 81.50, high: 83.56, low: 81.10, close: 82.00 }, // Candle T (Sinal)
    { date: '2025-11-11', open: 82.00, high: 82.50, low: 81.80, close: 82.20 }, // Candle T+1: não rompeu 83.57!
    { date: '2025-11-12', open: 82.30, high: 84.50, low: 82.10, close: 83.90 }, // Candle T+2: rompeu 83.57 tardiamente!
    { date: '2025-11-13', open: 83.90, high: 84.00, low: 80.50, close: 80.80 }  // Candle T+3: tocou stop 81.05
  ];

  const evaluated = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, candles);

  // Proibição categórica de execução tardia:
  // Como T+1 (11/11/2025) não acionou a entrada, a ordem foi definitivamente cancelada.
  // O rompimento tardio de T+2 (12/11/2025) NUNCA deve ser executado e o trade NÃO vira loss.
  assert.equal(evaluated.status, TradeSimulatorModel.STATUS.NOT_TRIGGERED);
  assert.equal(evaluated.executedEntryPrice, null, 'Ordem original não pode ser executada tardiamente em T+2');
  assert.equal(evaluated.entryDate, null);
  assert.equal(evaluated.resultR, null);
  assert.equal(evaluated.exitDate, '2025-11-11');
  assert.ok(evaluated.timeline.some(e => e.type === 'NOT_TRIGGERED'));
  assert.ok(!evaluated.timeline.some(e => e.type === 'ENTRY_EXECUTED'), 'Não deve existir evento de entrada executada');
});

test('Cenário D — Novo sinal independente após expiração do sinal anterior', () => {
  const candlesMap = new Map();
  // Cria histórico diário onde o ativo gera sinal em T, expira em T+1, e gera novo sinal em T+2 que aciona em T+3
  const assetCandles = [
    { time: '2026-04-01', open: 20.0, high: 22.0, low: 19.5, close: 21.0 },
    { time: '2026-04-02', open: 21.0, high: 23.0, low: 20.5, close: 22.5 },
    { time: '2026-04-06', open: 22.5, high: 24.0, low: 22.0, close: 23.5 },
    { time: '2026-04-07', open: 23.5, high: 25.0, low: 23.0, close: 24.5 },
    { time: '2026-04-08', open: 24.5, high: 24.8, low: 24.0, close: 24.2 }, // Candle T1 (Sinal 1)
    { time: '2026-04-09', open: 24.2, high: 24.5, low: 24.1, close: 24.3 }, // Candle T1+1: não rompeu -> Expira
    { time: '2026-04-10', open: 24.3, high: 24.4, low: 24.2, close: 24.3 }, // Candle T2 (Novo Sinal Inside Bar)
    { time: '2026-04-13', open: 24.3, high: 25.5, low: 24.2, close: 25.2 }, // Candle T2+1: rompe e executa Sinal 2!
    { time: '2026-04-14', open: 25.2, high: 27.0, low: 25.0, close: 26.8 }
  ];
  candlesMap.set('TEST4', assetCandles);

  // Simulação individual 1:
  const sim1 = {
    symbol: 'TEST4',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-04-08',
    entryPrice: 24.81,
    stopLoss: 23.99,
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY,
    managementScenario: '2R'
  };
  const eval1 = TradeSimulatorModel.evaluateSimulationOnCandles(sim1, assetCandles);
  assert.equal(eval1.status, TradeSimulatorModel.STATUS.NOT_TRIGGERED, 'Sinal 1 deve expirar em T+1');

  // Simulação individual 2 (Novo sinal em 2026-04-10):
  const sim2 = {
    symbol: 'TEST4',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-04-10',
    entryPrice: 24.41,
    stopLoss: 24.19,
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY,
    managementScenario: '2R'
  };
  const eval2 = TradeSimulatorModel.evaluateSimulationOnCandles(sim2, assetCandles);
  assert.equal(eval2.status, TradeSimulatorModel.STATUS.CLOSED_GAIN, 'Novo sinal 2 deve ser executado independentemente');
  assert.equal(eval2.entryDate, '2026-04-13');
  assert.equal(eval2.executedEntryPrice, 24.41);
});

test('Cenário E — Validade temporal em T+1 para TODOS os 4 gatilhos canônicos', () => {
  const triggers = [
    { id: '123_COMPRA', name: '1-2-3 de Compra', entry: 50.01, stop: 47.99 },
    { id: 'INSIDE_BAR', name: 'Inside Bar', entry: 25.01, stop: 23.99 },
    { id: 'PFR_COMPRA', name: 'PFR de Compra', entry: 40.01, stop: 38.49 },
    { id: 'RBI', name: 'Barra Vermelha Ignorada (RBI)', entry: 35.01, stop: 33.99 }
  ];

  for (const trig of triggers) {
    const sim = {
      symbol: 'TEST3',
      triggerName: trig.name,
      grade: 'A',
      signalDate: '2026-05-04',
      entryPrice: trig.entry,
      stopLoss: trig.stop,
      status: TradeSimulatorModel.STATUS.WAITING_ENTRY,
      managementScenario: '2R'
    };

    // Caso 1: T+1 rompe a máxima -> Executa
    const candlesSuccess = [
      { date: '2026-05-04', open: trig.entry - 1, high: trig.entry - 0.01, low: trig.stop + 0.1, close: trig.entry - 0.2 },
      { date: '2026-05-05', open: trig.entry - 0.2, high: trig.entry + 0.50, low: trig.stop + 0.2, close: trig.entry + 0.3 }
    ];
    const evalSuccess = TradeSimulatorModel.evaluateSimulationOnCandles(sim, candlesSuccess);
    assert.equal(evalSuccess.status, TradeSimulatorModel.STATUS.IN_OPERATION, `Gatilho ${trig.name} deve executar em T+1`);
    assert.equal(evalSuccess.entryDate, '2026-05-05');
    assert.equal(evalSuccess.executedEntryPrice, trig.entry);

    // Caso 2: T+1 não rompe a máxima -> Expira (NOT_TRIGGERED)
    const candlesExpired = [
      { date: '2026-05-04', open: trig.entry - 1, high: trig.entry - 0.01, low: trig.stop + 0.1, close: trig.entry - 0.2 },
      { date: '2026-05-05', open: trig.entry - 0.5, high: trig.entry - 0.10, low: trig.stop + 0.2, close: trig.entry - 0.3 }
    ];
    const evalExpired = TradeSimulatorModel.evaluateSimulationOnCandles(sim, candlesExpired);
    assert.equal(evalExpired.status, TradeSimulatorModel.STATUS.NOT_TRIGGERED, `Gatilho ${trig.name} deve expirar em T+1`);
    assert.equal(evalExpired.executedEntryPrice, null);
    assert.equal(evalExpired.entryDate, null);
    assert.equal(evalExpired.resultR, null);
    assert.equal(evalExpired.exitDate, '2026-05-05');

    // Caso 3: T+1 não rompe, mas T+2 rompe -> NUNCA executa (permanece NOT_TRIGGERED)
    const candlesLateBreakout = [
      { date: '2026-05-04', open: trig.entry - 1, high: trig.entry - 0.01, low: trig.stop + 0.1, close: trig.entry - 0.2 },
      { date: '2026-05-05', open: trig.entry - 0.5, high: trig.entry - 0.10, low: trig.stop + 0.2, close: trig.entry - 0.3 }, // T+1 não aciona
      { date: '2026-05-06', open: trig.entry - 0.2, high: trig.entry + 1.00, low: trig.stop + 0.1, close: trig.entry + 0.8 }  // T+2 rompe tardiamente
    ];
    const evalLate = TradeSimulatorModel.evaluateSimulationOnCandles(sim, candlesLateBreakout);
    assert.equal(evalLate.status, TradeSimulatorModel.STATUS.NOT_TRIGGERED, `Gatilho ${trig.name} não pode ter execução tardia em T+2`);
    assert.equal(evalLate.executedEntryPrice, null);
    assert.equal(evalLate.entryDate, null);
    assert.equal(evalLate.resultR, null);
  }
});

test('Cenário F — validateSimulation e Auditoria barram categoricamente execuções tardias em T+2+', () => {
  // Trade válido com entrada exatamente em T+1 (2026-09-22 é o dia útil seguinte a 2026-09-21)
  const validTrade = {
    symbol: 'PETR4',
    triggerName: 'Inside Bar',
    grade: 'A',
    marketCycle: 'Positivo',
    signalDate: '2026-09-21',
    entryDate: '2026-09-22',
    exitDate: '2026-09-25',
    entryPrice: 30.00,
    stopLoss: 28.50,
    executedEntryPrice: 30.00,
    currentStop: 28.50,
    exitPrice: 33.00,
    status: TradeSimulatorModel.STATUS.CLOSED_GAIN,
    resultR: 2.0,
    mfeR: 2.5,
    maeR: -0.3,
    durationDays: 3
  };
  const resValid = TradeSimulatorModel.validateSimulation(validTrade);
  assert.equal(resValid.isValid, true);
  assert.equal(resValid.errors.length, 0);

  // Trade com execução tardia em T+2 (2026-09-23 ao invés de 2026-09-22)
  const delayedTrade = {
    ...validTrade,
    entryDate: '2026-09-23'
  };
  const resDelayed = TradeSimulatorModel.validateSimulation(delayedTrade);
  assert.equal(resDelayed.isValid, false, 'Trade executado tardiamente em T+2 deve ser rejeitado');
  assert.ok(resDelayed.errors.some(e => e.code === 'DELAYED_ENTRY_EXECUTION' && e.field === 'entryDate'));
});

test('Cenário G — Sinais não executados não entram na contagem de trades executados nem nos cálculos de estatística', () => {
  const simulations = [
    // 2 trades executados (1 gain, 1 loss)
    {
      id: 'sim-1',
      symbol: 'PETR4',
      status: TradeSimulatorModel.STATUS.CLOSED_GAIN,
      resultR: 2.0,
      signalDate: '2026-05-04',
      entryDate: '2026-05-05',
      exitDate: '2026-05-08'
    },
    {
      id: 'sim-2',
      symbol: 'VALE3',
      status: TradeSimulatorModel.STATUS.CLOSED_LOSS,
      resultR: -1.0,
      signalDate: '2026-05-04',
      entryDate: '2026-05-05',
      exitDate: '2026-05-06'
    },
    // 3 sinais NÃO acionados (expirados em T+1)
    {
      id: 'sim-3',
      symbol: 'ITUB4',
      status: TradeSimulatorModel.STATUS.NOT_TRIGGERED,
      resultR: null,
      signalDate: '2026-05-04',
      entryDate: null,
      exitDate: '2026-05-05'
    },
    {
      id: 'sim-4',
      symbol: 'BBDC4',
      status: TradeSimulatorModel.STATUS.NOT_TRIGGERED,
      resultR: null,
      signalDate: '2026-05-04',
      entryDate: null,
      exitDate: '2026-05-05'
    },
    {
      id: 'sim-5',
      symbol: 'WEGE3',
      status: TradeSimulatorModel.STATUS.NOT_TRIGGERED,
      resultR: null,
      signalDate: '2026-05-04',
      entryDate: null,
      exitDate: '2026-05-05'
    }
  ];

  const stats = TradeSimulatorModel.calculateSimulatorStats(simulations);

  assert.equal(stats.totalCreated, 5, 'Total criado deve ser 5');
  assert.equal(stats.executedEntriesCount, 2, 'Entradas executadas deve ser rigorosamente 2');
  assert.equal(stats.notTriggeredCount, 3, 'Não acionados deve ser 3');
  assert.equal(stats.closedTradesCount, 2, 'Trades encerrados deve ser 2');
  assert.equal(stats.winningTradesCount, 1, '1 vencedor');
  assert.equal(stats.losingTradesCount, 1, '1 perdedor');
  assert.equal(stats.winRate, 50.0, 'Win Rate = 1/2 = 50% (NOT_TRIGGERED não dilui)');
  assert.equal(stats.totalR, 1.0, 'Total R = 2.0 - 1.0 = +1.0R');
  assert.equal(stats.expectancyR, 0.5, 'Expectancy = +1.0R / 2 = +0.50R');
});
