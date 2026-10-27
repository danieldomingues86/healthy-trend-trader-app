const test = require('node:test');
const assert = require('node:assert/strict');
const TradeSimulatorModel = require('./trade-simulator-model');
const TickerChartModel = require('./ticker-chart-model');

test('Inside Bar — 1. Exemplos positivos conhecidos (reconhecimento geométrico estrito)', () => {
  const mother = { date: '2026-05-10', open: 20.0, high: 22.0, low: 19.0, close: 21.0 };
  const ib = { date: '2026-05-11', open: 20.5, high: 21.2, low: 19.8, close: 20.9 };

  // Validação da estrutura geométrica
  const struct = TradeSimulatorModel.calculateInsideBarStructure(mother, ib);
  assert.equal(struct.isValid, true);
  assert.equal(struct.isStrictlyInside, true);
  assert.equal(struct.isHighInside, true);
  assert.equal(struct.isLowInside, true);

  // Entrada: 1 tick (+0,01) acima da máxima da Inside Bar
  assert.equal(struct.entryPrice, 21.21);

  // Stop Inicial Oficial HTT: 1 tick (-0,01) abaixo da mínima do candle anterior (barra-mãe)
  assert.equal(struct.stopLoss, 18.99);
  assert.equal(struct.stopLossMother, 18.99);

  // Stop Inicial Clássico: 1 tick (-0,01) abaixo da mínima do próprio Inside Bar
  assert.equal(struct.stopLossIb, 19.79);

  // Risco Gráfico: ((Entrada - Stop) / Entrada) * 100
  // (21.21 - 18.99) / 21.21 * 100 = 10.47%
  assert.equal(struct.graphicRiskPct, 10.47);

  // Amplitudes e taxa de compressão
  assert.equal(struct.motherCandle.range, 3.0);
  assert.equal(struct.insideBarCandle.range, 1.4);
  assert.equal(struct.compressionRatio, 0.47);
});

test('Inside Bar — 2. Exemplos negativos e quase semelhantes (eliminação de falsos positivos)', () => {
  const mother = { date: '2026-05-10', open: 20.0, high: 22.0, low: 19.0, close: 21.0 };

  // Quase semelhante 1: Máxima IGUAL à da barra-mãe (violação da contenção estrita do High)
  const equalHigh = { date: '2026-05-11', open: 20.5, high: 22.0, low: 19.8, close: 20.9 };
  const resEqualHigh = TradeSimulatorModel.calculateInsideBarStructure(mother, equalHigh);
  assert.equal(resEqualHigh.isValid, false);
  assert.equal(resEqualHigh.isHighInside, false);
  assert.ok(resEqualHigh.reason.includes('Máxima igual à do candle-mãe'));

  // Quase semelhante 2: Mínima IGUAL à da barra-mãe (violação da contenção estrita do Low)
  const equalLow = { date: '2026-05-11', open: 20.5, high: 21.2, low: 19.0, close: 20.9 };
  const resEqualLow = TradeSimulatorModel.calculateInsideBarStructure(mother, equalLow);
  assert.equal(resEqualLow.isValid, false);
  assert.equal(resEqualLow.isLowInside, false);
  assert.ok(resEqualLow.reason.includes('Mínima igual à do candle-mãe'));

  // Quase semelhante 3: Falso rompimento superior (High maior que a barra-mãe)
  const breakHigh = { date: '2026-05-11', open: 20.5, high: 22.3, low: 19.8, close: 21.9 };
  const resBreakHigh = TradeSimulatorModel.calculateInsideBarStructure(mother, breakHigh);
  assert.equal(resBreakHigh.isValid, false);
  assert.ok(resBreakHigh.reason.includes('Máxima superior à do candle-mãe'));

  // Quase semelhante 4: Falso rompimento inferior (Low menor que a barra-mãe)
  const breakLow = { date: '2026-05-11', open: 20.5, high: 21.2, low: 18.8, close: 19.2 };
  const resBreakLow = TradeSimulatorModel.calculateInsideBarStructure(mother, breakLow);
  assert.equal(resBreakLow.isValid, false);
  assert.ok(resBreakLow.reason.includes('Mínima inferior à do candle-mãe'));

  // Quase semelhante 5: Outside Bar / Engolfo (máxima maior e mínima menor)
  const outsideBar = { date: '2026-05-11', open: 20.5, high: 22.5, low: 18.5, close: 21.0 };
  const resOutside = TradeSimulatorModel.calculateInsideBarStructure(mother, outsideBar);
  assert.equal(resOutside.isValid, false);
});

test('Inside Bar — 3. Limites exatos, candles incompletos e integridade de dados', () => {
  // Candles incompletos / ausentes
  const missingCandles = TradeSimulatorModel.calculateInsideBarStructure(null, null);
  assert.equal(missingCandles.isValid, false);
  assert.ok(missingCandles.reason.includes('Candles incompletos'));

  // Array vazio ou com apenas 1 candle no detector global
  const singleCandle = [{ date: '2026-05-10', open: 20, high: 22, low: 19, close: 21 }];
  assert.deepEqual(TradeSimulatorModel.detectAllSetupTriggers(singleCandle), []);
  assert.equal(TradeSimulatorModel.detectSetupTrigger(singleCandle), null);

  // Valores NaN ou não numéricos
  const nanMother = { date: '2026-05-10', open: 20, high: NaN, low: 19, close: 21 };
  const validIb = { date: '2026-05-11', open: 20.5, high: 21.2, low: 19.8, close: 20.9 };
  const resNan = TradeSimulatorModel.calculateInsideBarStructure(nanMother, validIb);
  assert.equal(resNan.isValid, false);
  assert.ok(resNan.reason.includes('inválidos'));

  // Candle corrompido com High <= Low
  const invertedCandle = { date: '2026-05-10', open: 20, high: 18, low: 22, close: 19 };
  const resInverted = TradeSimulatorModel.calculateInsideBarStructure(invertedCandle, validIb);
  assert.equal(resInverted.isValid, false);
});

test('Inside Bar — 4. Separação entre geometria do gatilho e filtros operacionais', () => {
  // Candles com tendência altista alinhada (EMA 10 > EMA 72)
  const alignedSeries = [];
  for (let i = 0; i < 80; i++) {
    const p = 20 + i * 0.2;
    alignedSeries.push({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      open: p,
      high: p + 1.0,
      low: p - 0.5,
      close: p + 0.8
    });
  }
  // Adiciona a barra-mãe e a Inside Bar no final
  const lastP = alignedSeries[alignedSeries.length - 1].close;
  const mother = {
    date: '2026-05-10',
    open: lastP,
    high: lastP + 2.0,
    low: lastP - 1.0,
    close: lastP + 1.0
  };
  const ib = {
    date: '2026-05-11',
    open: lastP + 0.5,
    high: lastP + 1.2,
    low: lastP - 0.2,
    close: lastP + 0.8
  };
  alignedSeries.push(mother, ib);

  // Cenário 1: Geometria válida + Filtros Oficiais Aprovados -> Gatilho liberado
  const triggerApproved = TradeSimulatorModel.detectSetupTrigger(alignedSeries, {
    rsScore: 85,
    marketPermission: { isPermitted: true, classification: 'Positivo' }
  });
  assert.ok(triggerApproved, 'Gatilho deve ser detectado');
  assert.equal(triggerApproved.name, 'Inside Bar');
  assert.equal(triggerApproved.hasTrigger, true);
  assert.equal(triggerApproved.entry, Number((ib.high + 0.01).toFixed(2)));
  assert.equal(triggerApproved.stop, Number((mother.low - 0.01).toFixed(2)));

  // Cenário 2: Geometria válida + Ciclo Defensivo -> Bloqueado no Modo Oficial
  const triggerDefensive = TradeSimulatorModel.detectAllSetupTriggers(alignedSeries, {
    rsScore: 85,
    marketPermission: { isPermitted: false, classification: 'Defensivo', reason: 'Ciclo defensivo no IBOV' },
    includeRejected: true
  });
  const rejectedDefensive = triggerDefensive.find(t => t.name === 'Inside Bar');
  assert.ok(rejectedDefensive);
  assert.equal(rejectedDefensive.hasTrigger, false);
  assert.equal(rejectedDefensive.grade, 'D');
  assert.equal(rejectedDefensive.rejectionCode, 'DEFENSIVE_CYCLE_ENTRY');

  // Cenário 3: Geometria válida + RS < 80 -> Bloqueado no Modo Oficial
  const triggerSub80 = TradeSimulatorModel.detectAllSetupTriggers(alignedSeries, {
    rsScore: 68,
    marketPermission: { isPermitted: true, classification: 'Positivo' },
    includeRejected: true
  });
  const rejectedRs = triggerSub80.find(t => t.name === 'Inside Bar');
  assert.ok(rejectedRs);
  assert.equal(rejectedRs.hasTrigger, false);
  assert.equal(rejectedRs.grade, 'D');
  assert.equal(rejectedRs.rejectionCode, 'RS_BELOW_80_OFFICIAL');

  // Cenário 4: Geometria INVÁLIDA + Contexto Excelente -> NUNCA é aprovado
  const invalidIbSeries = [...alignedSeries.slice(0, -1)];
  const fakeIb = { date: '2026-05-11', open: lastP + 0.5, high: lastP + 3.0, low: lastP - 0.2, close: lastP + 2.0 }; // Rompeu a máxima da mãe!
  invalidIbSeries.push(fakeIb);
  const triggerInvalid = TradeSimulatorModel.detectAllSetupTriggers(invalidIbSeries, {
    rsScore: 99,
    marketPermission: { isPermitted: true, classification: 'Positivo' }
  });
  assert.equal(triggerInvalid.some(t => t.name === 'Inside Bar'), false);
});

test('Inside Bar — 5. Acionamento da entrada e stop no simulador (sem look-ahead)', () => {
  // Simulação com entrada em 21.01 e stop em 18.99
  const baseSim = {
    id: 'sim-ib-01',
    symbol: 'WEGE3',
    companyName: 'WEG ON',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-05-11',
    entryPrice: 21.01,
    stopLoss: 18.99,
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY,
    managementScenario: '2R'
  };

  // Caso A: Candle seguinte atinge 21.50 (supera 21.01) -> Entrada executada
  const executionCandles = [
    { date: '2026-05-11', open: 20.0, high: 21.0, low: 19.5, close: 20.8 }, // dia do sinal
    { date: '2026-05-12', open: 20.8, high: 21.5, low: 20.6, close: 21.3 }  // dia do rompimento
  ];
  const evaluatedSuccess = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, executionCandles);
  assert.equal(evaluatedSuccess.status, TradeSimulatorModel.STATUS.IN_OPERATION);
  assert.equal(evaluatedSuccess.entryDate, '2026-05-12');
  assert.equal(evaluatedSuccess.executedEntryPrice, 21.01);

  // Caso B: Candle seguinte NÃO atinge 21.01 e perde a mínima do stop (18.99) -> NOT_TRIGGERED
  const expireCandles = [
    { date: '2026-05-11', open: 20.0, high: 21.0, low: 19.5, close: 20.8 },
    { date: '2026-05-12', open: 20.0, high: 20.5, low: 18.5, close: 18.7 }  // perdeu 18.99 sem atingir 21.01
  ];
  const evaluatedExpired = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, expireCandles);
  assert.equal(evaluatedExpired.status, TradeSimulatorModel.STATUS.NOT_TRIGGERED);
  assert.equal(evaluatedExpired.executedEntryPrice, null);
  assert.equal(evaluatedExpired.resultR, null);
});

test('Inside Bar — 6. Consecutivos consolidados no Inside Bar canônico', () => {
  // Três candles: c3 (mãe), c2 (IB de c3), c1 (IB de c2)
  const mother = { date: '2026-05-08', open: 20.0, high: 24.0, low: 18.0, close: 22.0 };
  const ib1 = { date: '2026-05-09', open: 21.0, high: 23.0, low: 19.0, close: 22.0 };
  const ib2 = { date: '2026-05-10', open: 21.5, high: 22.5, low: 20.0, close: 22.0 };

  const series = [mother, ib1, ib2];
  const detected = TradeSimulatorModel.detectSetupTrigger(series, {
    simulationMode: 'RESEARCH',
    allowTrendMisalignment: true
  });

  // detectSetupTrigger deve retornar Double Inside Bar (prioridade sobre Inside Bar simples)
  assert.ok(detected);
  assert.equal(detected.name, 'Inside Bar');
  assert.equal(detected.id, 'INSIDE_BAR');
});

test('Inside Bar — 7. Consistência entre TradeSimulatorModel e TickerChartModel', () => {
  // Ambas as implementações canônicas utilizam a convenção estrita (High < Mãe.High e Low > Mãe.Low)
  const c3 = { time: '2026-05-09', date: '2026-05-09', open: 19.5, high: 21.0, low: 18.5, close: 20.0 };
  const mother = { time: '2026-05-10', date: '2026-05-10', open: 20.0, high: 22.0, low: 19.0, close: 21.0 };
  const ib = { time: '2026-05-11', date: '2026-05-11', open: 20.5, high: 21.2, low: 19.8, close: 20.9 };
  const almostIbEqualHigh = { time: '2026-05-11', date: '2026-05-11', open: 20.5, high: 22.0, low: 19.8, close: 20.9 };

  const ema10 = [19.0, 19.5, 20.0];
  const ema72 = [17.5, 17.8, 18.0];

  // Gráfico: positivo com contenção estrita
  const chartPatterns = TickerChartModel.detectSetupTriggers([c3, mother, ib], ema10, ema72);
  assert.equal(chartPatterns.hasTrigger, true);
  assert.equal(chartPatterns.id, 'INSIDE_BAR');
  assert.equal(chartPatterns.entry, 21.21);
  assert.equal(chartPatterns.stop, 18.99);

  // Gráfico: falso positivo com máxima igual deve ser rejeitado
  const chartPatternsEqualHigh = TickerChartModel.detectSetupTriggers([c3, mother, almostIbEqualHigh], ema10, ema72);
  assert.equal(chartPatternsEqualHigh.hasTrigger, false);

  // Simulador: falso positivo com máxima igual deve ser rejeitado
  const simPatternsEqualHigh = TradeSimulatorModel.detectSetupTrigger([mother, almostIbEqualHigh], {
    simulationMode: 'RESEARCH',
    allowTrendMisalignment: true
  });
  assert.equal(simPatternsEqualHigh, null);
});
