const test = require('node:test');
const assert = require('node:assert/strict');

const TickerChartModel = require('./ticker-chart-model');
const TradeSimulatorModel = require('./trade-simulator-model');

test('1-2-3 de Compra — 1. Exemplos positivos conhecidos (reconhecimento geométrico oficial)', () => {
  // Cenário Clássico de Fundo 1-2-3 no gráfico diário:
  // c3 (Pivô 1 - Referência prévia do recuo): H=22.00, L=20.00, C=20.50
  // c2 (Pivô 2 - Vértice do Fundo / Mínima local): H=21.00, L=18.00, C=18.50 (c2.low < c3.low)
  // c1 (Pivô 3 - Candle Sinal): H=22.00, L=19.00, C=21.50 (c1.low > c2.low E c1.close > c2.high)
  const c3 = { open: 21.50, high: 22.00, low: 20.00, close: 20.50, date: '2026-05-18' };
  const c2 = { open: 20.20, high: 21.00, low: 18.00, close: 18.50, date: '2026-05-19' };
  const c1 = { open: 18.80, high: 22.00, low: 19.00, close: 21.50, date: '2026-05-20' };

  // Validação no TickerChartModel
  const chartResult = TickerChartModel.validateOneTwoThreeBuyPattern(c1, c2, c3);
  assert.equal(chartResult.isValid, true, 'TickerChartModel deve validar o 1-2-3 clássico');
  assert.equal(chartResult.triggerType, '1-2-3 de Compra');
  assert.equal(chartResult.entryPrice, 22.01, 'Entrada deve ser 1 tick (+0.01) acima da máxima de c1');
  assert.equal(chartResult.stopLoss, 17.99, 'Stop deve ser 1 tick (-0.01) abaixo da mínima do vértice do fundo (c2)');
  assert.equal(chartResult.initialRisk, 4.02, 'Risco inicial absoluto deve ser 22.01 - 17.99 = 4.02');
  assert.equal(chartResult.graphicRiskPct, 18.26, 'Risco gráfico percentual deve ser (4.02 / 22.01) * 100 = 18.26%');
  assert.equal(chartResult.audit.checks.pivot2IsBottom.pass, true);
  assert.equal(chartResult.audit.checks.pivot3HoldsFloor.pass, true);
  assert.equal(chartResult.audit.checks.confirmationClose.pass, true);

  // Validação no TradeSimulatorModel
  const simResult = TradeSimulatorModel.validateOneTwoThreeBuyPattern(c1, c2, c3);
  assert.equal(simResult.isValid, true, 'TradeSimulatorModel deve validar o 1-2-3 clássico');
  assert.equal(simResult.entryPrice, 22.01);
  assert.equal(simResult.stopLoss, 17.99);
  assert.equal(simResult.initialRisk, 4.02);
  assert.equal(simResult.graphicRiskPct, 18.26);

  // Verificação com método de conveniência detectSetupTriggers
  const detected = TickerChartModel.detectSetupTriggers([c3, c2, c1]);
  assert.equal(detected.name, '1-2-3 de Compra');
  assert.equal(detected.hasTrigger, true);
  assert.equal(detected.entry, 22.01);
  assert.equal(detected.stop, 17.99);
});

test('1-2-3 de Compra — 2. Exemplos negativos e eliminação de falsos positivos (continuidade de alta vs reversão)', () => {
  // Caso A: Simples continuidade de alta (mínimas e máximas ascendentes sem fundo)
  // c3 (L=15), c2 (L=16), c1 (L=17, C=19) -> NÃO há fundo em c2!
  const contHighC3 = { high: 16.00, low: 15.00, close: 15.80 };
  const contHighC2 = { high: 17.00, low: 16.00, close: 16.90 };
  const contHighC1 = { high: 19.50, low: 17.00, close: 19.00 };

  const resCont = TradeSimulatorModel.validateOneTwoThreeBuyPattern(contHighC1, contHighC2, contHighC3);
  assert.equal(resCont.isValid, false, 'Continuidade de alta simples não pode ser validada como 1-2-3 de Compra');
  assert.equal(resCont.audit.checks.pivot2IsBottom.pass, false);
  assert.match(resCont.reason, /fundo/i);

  // Caso B: Fundo não renovado (c2.low >= c3.low)
  const noBottomC3 = { high: 22.00, low: 18.00, close: 20.00 };
  const noBottomC2 = { high: 21.00, low: 18.50, close: 19.00 }; // 18.50 > 18.00
  const noBottomC1 = { high: 22.50, low: 19.00, close: 21.50 };

  const resNoBottom = TradeSimulatorModel.validateOneTwoThreeBuyPattern(noBottomC1, noBottomC2, noBottomC3);
  assert.equal(resNoBottom.isValid, false, 'Se c2 não renova a mínima de c3, não há vértice de fundo');
  assert.equal(resNoBottom.audit.checks.pivot2IsBottom.pass, false);

  // Caso C: Suporte não sustentado (c1.low <= c2.low - candle 3 perdeu a mínima do candle 2)
  const lostFloorC3 = { high: 22.00, low: 20.00, close: 20.50 };
  const lostFloorC2 = { high: 21.00, low: 18.00, close: 18.50 };
  const lostFloorC1 = { high: 22.00, low: 17.50, close: 21.50 }; // 17.50 < 18.00

  const resLostFloor = TradeSimulatorModel.validateOneTwoThreeBuyPattern(lostFloorC1, lostFloorC2, lostFloorC3);
  assert.equal(resLostFloor.isValid, false, 'Se c1 renova a mínima de c2, o suporte foi violado e anula o 1-2-3');
  assert.equal(resLostFloor.audit.checks.pivot3HoldsFloor.pass, false);
  assert.match(resLostFloor.reason, /suporte/i);

  // Caso D: Rompimento não confirmado (c1.close <= c2.high)
  const noBreakoutC3 = { high: 22.00, low: 20.00, close: 20.50 };
  const noBreakoutC2 = { high: 21.00, low: 18.00, close: 18.50 };
  const noBreakoutC1 = { high: 22.00, low: 19.00, close: 20.80 }; // 20.80 <= 21.00

  const resNoBreakout = TradeSimulatorModel.validateOneTwoThreeBuyPattern(noBreakoutC1, noBreakoutC2, noBreakoutC3);
  assert.equal(resNoBreakout.isValid, false, 'Se c1 não fechar acima da máxima de c2, o pivô não está confirmado');
  assert.equal(resNoBreakout.audit.checks.confirmationClose.pass, false);
  assert.match(resNoBreakout.reason, /fech/i);
});

test('1-2-3 de Compra — 3. Limites exatos, dados corrompidos e candles incompletos', () => {
  // Limite estrito: c1.close == c2.high (igualdade exata NÃO supera a máxima)
  const eqCloseC3 = { high: 22.00, low: 20.00, close: 20.50 };
  const eqCloseC2 = { high: 21.00, low: 18.00, close: 18.50 };
  const eqCloseC1 = { high: 22.00, low: 19.00, close: 21.00 }; // 21.00 == 21.00

  const resEqClose = TradeSimulatorModel.validateOneTwoThreeBuyPattern(eqCloseC1, eqCloseC2, eqCloseC3);
  assert.equal(resEqClose.isValid, false, 'Igualdade entre c1.close e c2.high não configura superação estrita');

  // Limite estrito: c1.low == c2.low (fundo duplo no mesmo tick, não fundo mais alto)
  const eqFloorC3 = { high: 22.00, low: 20.00, close: 20.50 };
  const eqFloorC2 = { high: 21.00, low: 18.00, close: 18.50 };
  const eqFloorC1 = { high: 22.00, low: 18.00, close: 21.50 }; // 18.00 == 18.00

  const resEqFloor = TradeSimulatorModel.validateOneTwoThreeBuyPattern(eqFloorC1, eqFloorC2, eqFloorC3);
  assert.equal(resEqFloor.isValid, false, 'Mínima de c1 igual a c2 não forma fundo mais alto');

  // Limite estrito: c2.low == c3.low (não renovou mínima)
  const eqBottomC3 = { high: 22.00, low: 18.00, close: 20.50 };
  const eqBottomC2 = { high: 21.00, low: 18.00, close: 18.50 }; // 18.00 == 18.00
  const eqBottomC1 = { high: 22.00, low: 19.00, close: 21.50 };

  const resEqBottom = TradeSimulatorModel.validateOneTwoThreeBuyPattern(eqBottomC1, eqBottomC2, eqBottomC3);
  assert.equal(resEqBottom.isValid, false, 'Mínima de c2 igual a c3 não renova fundo');

  // Dados ausentes ou incompletos
  assert.equal(TradeSimulatorModel.validateOneTwoThreeBuyPattern(null, eqCloseC2, eqCloseC3).isValid, false);
  assert.equal(TradeSimulatorModel.validateOneTwoThreeBuyPattern(eqCloseC1, null, eqCloseC3).isValid, false);
  assert.equal(TradeSimulatorModel.validateOneTwoThreeBuyPattern(eqCloseC1, eqCloseC2, null).isValid, false);

  // Dados corrompidos com NaN ou incoerência OHLC (high <= low)
  const corruptC1 = { high: 18.00, low: 20.00, close: 19.00 }; // high < low
  const resCorrupt = TradeSimulatorModel.validateOneTwoThreeBuyPattern(corruptC1, eqCloseC2, eqCloseC3);
  assert.equal(resCorrupt.isValid, false);
  assert.match(resCorrupt.reason, /corrompidos|inválidos/i);

  const nanC2 = { high: NaN, low: 18.00, close: 19.00 };
  const resNan = TradeSimulatorModel.validateOneTwoThreeBuyPattern(eqCloseC1, nanC2, eqCloseC3);
  assert.equal(resNan.isValid, false);
});

test('1-2-3 de Compra — 4. Separação rigorosa entre geometria do gatilho e filtros operacionais', () => {
  // Série longa com tendência de alta confirmada (EMA 10 e EMA 72 ascendentes)
  const alignedSeries = [];
  for (let i = 0; i < 80; i++) {
    const p = 20 + i * 0.25;
    alignedSeries.push({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      open: p,
      high: p + 1.2,
      low: p - 0.4,
      close: p + 0.8
    });
  }
  const lastP = alignedSeries[alignedSeries.length - 1].close;

  // Anexa os 3 candles da formação clássica de 1-2-3 no topo da série
  // c3 (Pivô 1): recuo inicial
  const c3 = { date: '2026-05-18', open: lastP, high: lastP + 1.5, low: lastP - 0.5, close: lastP + 0.5 };
  // c2 (Pivô 2): faz nova mínima (fundo em V)
  const c2 = { date: '2026-05-19', open: lastP + 0.5, high: lastP + 0.8, low: lastP - 1.8, close: lastP - 1.2 };
  // c1 (Pivô 3): sustenta fundo mais alto e supera a máxima de c2 fechando em alta
  const c1 = { date: '2026-05-20', open: lastP - 0.8, high: lastP + 2.5, low: lastP - 1.0, close: lastP + 2.0 };
  alignedSeries.push(c3, c2, c1);

  // 1. O validador geométrico aprova isoladamente:
  const geom = TradeSimulatorModel.validateOneTwoThreeBuyPattern(c1, c2, c3);
  assert.equal(geom.isValid, true, 'Geometria do 1-2-3 é válida');

  // Cenário 1: 1-2-3 geometricamente válido + Filtros Oficiais Aprovados -> Gatilho ativo
  const triggerApproved = TradeSimulatorModel.detectSetupTrigger(alignedSeries, {
    rsScore: 88,
    marketPermission: { isPermitted: true, classification: 'Positivo' }
  });
  assert.ok(triggerApproved, 'Gatilho deve ser detectado');
  assert.equal(triggerApproved.name, '1-2-3 de Compra');
  assert.equal(triggerApproved.hasTrigger, true);
  assert.equal(triggerApproved.entry, Number((c1.high + 0.01).toFixed(2)));
  assert.equal(triggerApproved.stop, Number((c2.low - 0.01).toFixed(2)));

  // Cenário 2: 1-2-3 geometricamente válido + Ciclo Defensivo -> Bloqueado categoricamente no Modo Oficial
  const triggerDefensive = TradeSimulatorModel.detectAllSetupTriggers(alignedSeries, {
    rsScore: 88,
    marketPermission: { isPermitted: false, classification: 'Defensivo', reason: 'Ciclo defensivo no IBOV' },
    includeRejected: true
  });
  const rejectedDefensive = triggerDefensive.find(t => t.name === '1-2-3 de Compra');
  assert.ok(rejectedDefensive);
  assert.equal(rejectedDefensive.hasTrigger, false);
  assert.equal(rejectedDefensive.grade, 'D');
  assert.equal(rejectedDefensive.rejectionCode, 'DEFENSIVE_CYCLE_ENTRY');

  // Cenário 3: 1-2-3 geometricamente válido + RS < 80 -> Bloqueado categoricamente no Modo Oficial
  const triggerSub80 = TradeSimulatorModel.detectAllSetupTriggers(alignedSeries, {
    rsScore: 65,
    marketPermission: { isPermitted: true, classification: 'Positivo' },
    includeRejected: true
  });
  const rejectedRs = triggerSub80.find(t => t.name === '1-2-3 de Compra');
  assert.ok(rejectedRs);
  assert.equal(rejectedRs.hasTrigger, false);
  assert.equal(rejectedRs.grade, 'D');
  assert.equal(rejectedRs.rejectionCode, 'RS_BELOW_80_OFFICIAL');

  // Cenário 4: Médias favoráveis e ciclo positivo NÃO criam 1-2-3 onde a geometria falha
  const fake123Series = [...alignedSeries.slice(0, -3)];
  const fakeC3 = { date: '2026-05-18', open: lastP, high: lastP + 1.0, low: lastP - 0.2, close: lastP + 0.8 };
  const fakeC2 = { date: '2026-05-19', open: lastP + 0.8, high: lastP + 1.5, low: lastP + 0.1, close: lastP + 1.2 }; // mínima ascendente, não faz fundo
  const fakeC1 = { date: '2026-05-20', open: lastP + 1.2, high: lastP + 2.0, low: lastP + 0.5, close: lastP + 1.8 };
  fake123Series.push(fakeC3, fakeC2, fakeC1);

  const triggerFake = TradeSimulatorModel.detectAllSetupTriggers(fake123Series, {
    rsScore: 95,
    marketPermission: { isPermitted: true, classification: 'Positivo' }
  });
  assert.equal(triggerFake.some(t => t.name === '1-2-3 de Compra'), false);
});

test('1-2-3 de Compra — 5. Acionamento da entrada e stop no simulador histórico (sem look-ahead)', () => {
  const baseSim = {
    id: 'sim-123-01',
    symbol: 'PETR4',
    companyName: 'Petrobras PN',
    triggerName: '1-2-3 de Compra',
    grade: 'A',
    signalDate: '2026-06-03',
    entryPrice: 22.01,
    stopLoss: 17.99,
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY,
    managementScenario: '2R'
  };

  // Dia do rompimento (2026-06-05, considerando feriado de Corpus Christi em 04/06) supera 22.01 -> Executa a entrada
  const executionCandles = [
    { date: '2026-06-03', open: 18.80, high: 22.00, low: 19.00, close: 21.50 }, // dia do sinal
    { date: '2026-06-05', open: 21.60, high: 22.50, low: 21.20, close: 22.40 }  // próximo pregão B3 supera 22.01
  ];
  const evaluatedSuccess = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, executionCandles);
  assert.equal(evaluatedSuccess.status, TradeSimulatorModel.STATUS.IN_OPERATION);
  assert.equal(evaluatedSuccess.entryDate, '2026-06-05');
  assert.equal(evaluatedSuccess.executedEntryPrice, 22.01);
  assert.equal(evaluatedSuccess.stopLoss, 17.99, 'Stop loss posicionado 1 tick abaixo do vértice do fundo (17.99)');

  // Dia seguinte perde a mínima do stop (17.99) sem atingir 22.01 -> NOT_TRIGGERED
  const expireCandles = [
    { date: '2026-06-03', open: 18.80, high: 22.00, low: 19.00, close: 21.50 },
    { date: '2026-06-05', open: 20.00, high: 20.50, low: 17.50, close: 17.80 }  // perdeu 17.99 sem atingir 22.01
  ];
  const evaluatedExpired = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, expireCandles);
  assert.equal(evaluatedExpired.status, TradeSimulatorModel.STATUS.NOT_TRIGGERED);
  assert.equal(evaluatedExpired.executedEntryPrice, null);
  assert.equal(evaluatedExpired.resultR, null);
});

test('1-2-3 de Compra — 6. Consistência canônica estrita entre TickerChartModel e TradeSimulatorModel', () => {
  const c3 = { open: 30.00, high: 31.00, low: 28.50, close: 29.00 };
  const c2 = { open: 29.00, high: 29.80, low: 26.00, close: 27.20 }; // fundo em 26.00
  const c1 = { open: 27.50, high: 30.50, low: 27.00, close: 30.10 }; // sustenta 27.00 > 26.00 e fecha 30.10 > 29.80

  const chart = TickerChartModel.validateOneTwoThreeBuyPattern(c1, c2, c3);
  const sim = TradeSimulatorModel.validateOneTwoThreeBuyPattern(c1, c2, c3);

  // Ambas as validações devem ser estritamente idênticas
  assert.equal(chart.isValid, sim.isValid);
  assert.equal(chart.triggerType, sim.triggerType);
  assert.equal(chart.entryPrice, sim.entryPrice);
  assert.equal(chart.stopLoss, sim.stopLoss);
  assert.equal(chart.initialRisk, sim.initialRisk);
  assert.equal(chart.graphicRiskPct, sim.graphicRiskPct);
  assert.equal(chart.reason, sim.reason);

  assert.equal(chart.entryPrice, 30.51, 'Entrada 30.50 + 0.01 = 30.51');
  assert.equal(chart.stopLoss, 25.99, 'Stop 26.00 - 0.01 = 25.99');
  assert.equal(chart.initialRisk, 4.52, 'Risco inicial 30.51 - 25.99 = 4.52');
  assert.equal(chart.graphicRiskPct, 14.81, 'Risco % (4.52 / 30.51) * 100 = 14.81%');
});
