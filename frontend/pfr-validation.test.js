const test = require('node:test');
const assert = require('node:assert/strict');
const TradeSimulatorModel = require('./trade-simulator-model');
const TickerChartModel = require('./ticker-chart-model');

test('PFR de Compra — 1. Exemplos positivos conhecidos (reconhecimento geométrico oficial)', () => {
  // Estrutura de reversão clássica em 3 candles:
  // c3: Candle 2 dias antes (em recuo corretivo)
  const c3 = { date: '2026-06-01', open: 30.0, high: 31.0, low: 29.5, close: 30.2 };
  // c2: Candle imediatamente anterior (acelera a queda)
  const c2 = { date: '2026-06-02', open: 30.2, high: 30.5, low: 28.5, close: 28.8 };
  // c1: Candle sinal (faz a menor mínima dos 3 candles, mas fecha com força compradora acima do fechamento de c2)
  const c1 = { date: '2026-06-03', open: 28.0, high: 30.0, low: 27.5, close: 29.8 };

  // Validação direta via validador estrito
  const pfr = TradeSimulatorModel.validatePfrBuyPattern(c1, c2, c3);
  assert.equal(pfr.isValid, true);
  assert.equal(pfr.triggerType, 'PFR de Compra');
  assert.equal(pfr.audit.checks.lowerThanC2.pass, true, 'c1.low (27.50) < c2.low (28.50)');
  assert.equal(pfr.audit.checks.lowerThanC3.pass, true, 'c1.low (27.50) < c3.low (29.50)');
  assert.equal(pfr.audit.checks.closesAboveC2.pass, true, 'c1.close (29.80) > c2.close (28.80)');
  assert.equal(pfr.audit.checks.bullishReaction.pass, true, 'c1.close (29.80) >= c1.open (28.00)');

  // Entrada: 1 tick (+0,01) acima da máxima do candle sinal
  assert.equal(pfr.entryPrice, 30.01);

  // Stop Inicial: 1 tick (-0,01) abaixo da menor mínima da formação (mínima do candle sinal)
  assert.equal(pfr.stopLoss, 27.49);

  // Risco Gráfico: ((30.01 - 27.49) / 30.01) * 100 = 8.40%
  assert.equal(pfr.initialRisk, 2.52);
  assert.equal(pfr.graphicRiskPct, 8.40);
});

test('PFR de Compra — 2. Exemplos negativos e eliminação de falsos positivos (continuidade de alta vs reversão)', () => {
  // Caso A: Sequência de candles ascendentes (caso real HGRE11 - continuidade de alta NÃO é reversão)
  const c3Asc = { date: '2026-06-01', open: 126.62, high: 129.17, low: 126.07, close: 128.69 };
  const c2Asc = { date: '2026-06-02', open: 128.69, high: 129.74, low: 127.70, close: 127.70 };
  const c1Asc = { date: '2026-06-03', open: 128.40, high: 129.92, low: 126.99, close: 129.00 }; // mínima (126.99) > c3.low (126.07)
  const resAsc = TradeSimulatorModel.validatePfrBuyPattern(c1Asc, c2Asc, c3Asc);
  assert.equal(resAsc.isValid, false);
  assert.equal(resAsc.audit.checks.lowerThanC3.pass, false);
  assert.ok(resAsc.reason.includes('não renovou o fundo'));

  // Caso B: c1.low < c2.low, mas c1.low >= c3.low (falha em formar a menor mínima da formação de 3 candles)
  const c3HighFloor = { date: '2026-06-01', open: 21.0, high: 22.0, low: 20.0, close: 21.5 };
  const c2HighFloor = { date: '2026-06-02', open: 22.5, high: 23.5, low: 22.0, close: 22.2 };
  const c1HighFloor = { date: '2026-06-03', open: 21.5, high: 23.0, low: 21.0, close: 22.8 }; // 21.0 > 20.0 (c3.low)
  const resFloor = TradeSimulatorModel.validatePfrBuyPattern(c1HighFloor, c2HighFloor, c3HighFloor);
  assert.equal(resFloor.isValid, false);
  assert.equal(resFloor.audit.checks.lowerThanC3.pass, false);

  // Caso C: Menor mínima cumprida, mas c1.close <= c2.close (reversão não confirmada)
  const c3WeakClose = { date: '2026-06-01', open: 25.0, high: 26.0, low: 24.0, close: 24.5 };
  const c2WeakClose = { date: '2026-06-02', open: 24.5, high: 25.0, low: 23.0, close: 24.0 };
  const c1WeakClose = { date: '2026-06-03', open: 23.2, high: 24.0, low: 22.5, close: 23.8 }; // 23.80 <= 24.00 (c2.close)
  const resWeakClose = TradeSimulatorModel.validatePfrBuyPattern(c1WeakClose, c2WeakClose, c3WeakClose);
  assert.equal(resWeakClose.isValid, false);
  assert.equal(resWeakClose.audit.checks.closesAboveC2.pass, false);
  assert.ok(resWeakClose.reason.includes('não superou o fechamento anterior'));

  // Caso D: Menor mínima e c1.close > c2.close, mas candle sinal é vendedor (close < open)
  const c3RedCandle = { date: '2026-06-01', open: 25.0, high: 26.0, low: 24.0, close: 24.5 };
  const c2RedCandle = { date: '2026-06-02', open: 24.5, high: 25.0, low: 23.0, close: 24.0 };
  const c1RedCandle = { date: '2026-06-03', open: 24.8, high: 25.0, low: 22.5, close: 24.2 }; // close 24.20 < open 24.80 (barra vermelha)
  const resRedCandle = TradeSimulatorModel.validatePfrBuyPattern(c1RedCandle, c2RedCandle, c3RedCandle);
  assert.equal(resRedCandle.isValid, false);
  assert.equal(resRedCandle.audit.checks.bullishReaction.pass, false);
  assert.ok(resRedCandle.reason.includes('Barra vendedora sem rejeição de fundo'));
});

test('PFR de Compra — 3. Limites exatos, dados corrompidos e candles incompletos', () => {
  // Faltando candle (menos de 3 candles)
  const incomplete = TradeSimulatorModel.validatePfrBuyPattern(null, {}, {});
  assert.equal(incomplete.isValid, false);
  assert.ok(incomplete.reason.includes('requer pelo menos 3 candles'));

  // Valores NaN
  const c3 = { date: '2026-06-01', open: 30, high: 31, low: 29.5, close: 30.2 };
  const c2 = { date: '2026-06-02', open: 30.2, high: 30.5, low: 28.5, close: 28.8 };
  const c1Nan = { date: '2026-06-03', open: 28, high: 30, low: NaN, close: 29.8 };
  const resNan = TradeSimulatorModel.validatePfrBuyPattern(c1Nan, c2, c3);
  assert.equal(resNan.isValid, false);
  assert.ok(resNan.reason.includes('inválidos'));

  // Candle com High <= Low
  const c1Corrupt = { date: '2026-06-03', open: 28, high: 26, low: 28, close: 27 };
  const resCorrupt = TradeSimulatorModel.validatePfrBuyPattern(c1Corrupt, c2, c3);
  assert.equal(resCorrupt.isValid, false);
});

test('PFR de Compra — 4. Separação rigorosa entre geometria do gatilho e filtros operacionais', () => {
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

  // Anexa os 3 candles da formação de PFR no topo da série
  const c3 = { date: '2026-05-18', open: lastP, high: lastP + 1.5, low: lastP - 0.5, close: lastP + 0.5 };
  const c2 = { date: '2026-05-19', open: lastP + 0.5, high: lastP + 0.8, low: lastP - 1.5, close: lastP - 1.2 };
  const c1 = { date: '2026-05-20', open: lastP - 1.5, high: lastP + 0.5, low: lastP - 2.5, close: lastP - 0.2 };
  alignedSeries.push(c3, c2, c1);

  // Cenário 1: PFR geometricamente válido + Filtros Oficiais Aprovados -> Gatilho ativo
  const triggerApproved = TradeSimulatorModel.detectSetupTrigger(alignedSeries, {
    rsScore: 88,
    marketPermission: { isPermitted: true, classification: 'Positivo' }
  });
  assert.ok(triggerApproved, 'Gatilho deve ser detectado');
  assert.equal(triggerApproved.name, 'PFR de Compra');
  assert.equal(triggerApproved.hasTrigger, true);
  assert.equal(triggerApproved.entry, Number((c1.high + 0.01).toFixed(2)));
  assert.equal(triggerApproved.stop, Number((c1.low - 0.01).toFixed(2)));

  // Cenário 2: PFR geometricamente válido + Ciclo Defensivo -> Bloqueado categoricamente no Modo Oficial
  const triggerDefensive = TradeSimulatorModel.detectAllSetupTriggers(alignedSeries, {
    rsScore: 88,
    marketPermission: { isPermitted: false, classification: 'Defensivo', reason: 'Ciclo defensivo no IBOV' },
    includeRejected: true
  });
  const rejectedDefensive = triggerDefensive.find(t => t.name === 'PFR de Compra');
  assert.ok(rejectedDefensive);
  assert.equal(rejectedDefensive.hasTrigger, false);
  assert.equal(rejectedDefensive.grade, 'D');
  assert.equal(rejectedDefensive.rejectionCode, 'DEFENSIVE_CYCLE_ENTRY');

  // Cenário 3: PFR geometricamente válido + RS < 80 -> Bloqueado categoricamente no Modo Oficial
  const triggerSub80 = TradeSimulatorModel.detectAllSetupTriggers(alignedSeries, {
    rsScore: 65,
    marketPermission: { isPermitted: true, classification: 'Positivo' },
    includeRejected: true
  });
  const rejectedRs = triggerSub80.find(t => t.name === 'PFR de Compra');
  assert.ok(rejectedRs);
  assert.equal(rejectedRs.hasTrigger, false);
  assert.equal(rejectedRs.grade, 'D');
  assert.equal(rejectedRs.rejectionCode, 'RS_BELOW_80_OFFICIAL');

  // Cenário 4: Médias favoráveis e ciclo positivo NÃO criam PFR onde a geometria falha
  const fakePfrSeries = [...alignedSeries.slice(0, -1)];
  const fakeC1 = { date: '2026-05-20', open: lastP, high: lastP + 2.0, low: lastP + 0.5, close: lastP + 1.8 }; // Mínima mais alta! Continuidade de alta
  fakePfrSeries.push(fakeC1);
  const triggerFake = TradeSimulatorModel.detectAllSetupTriggers(fakePfrSeries, {
    rsScore: 95,
    marketPermission: { isPermitted: true, classification: 'Positivo' }
  });
  assert.equal(triggerFake.some(t => t.name === 'PFR de Compra'), false);
});

test('PFR de Compra — 5. Acionamento da entrada e stop no simulador histórico (sem look-ahead)', () => {
  const baseSim = {
    id: 'sim-pfr-01',
    symbol: 'PETR4',
    companyName: 'Petrobras PN',
    triggerName: 'PFR de Compra',
    grade: 'A',
    signalDate: '2026-06-03',
    entryPrice: 30.01,
    stopLoss: 27.49,
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY,
    managementScenario: '2R'
  };

  // Dia do rompimento (2026-06-05, considerando feriado de Corpus Christi em 04/06) supera 30.01 -> Executa a entrada
  const executionCandles = [
    { date: '2026-06-03', open: 28.0, high: 30.0, low: 27.5, close: 29.8 }, // dia do sinal
    { date: '2026-06-05', open: 29.9, high: 30.4, low: 29.5, close: 30.2 }  // próximo pregão B3 supera 30.01
  ];
  const evaluatedSuccess = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, executionCandles);
  assert.equal(evaluatedSuccess.status, TradeSimulatorModel.STATUS.IN_OPERATION);
  assert.equal(evaluatedSuccess.entryDate, '2026-06-05');
  assert.equal(evaluatedSuccess.executedEntryPrice, 30.01);

  // Dia seguinte perde a mínima do stop (27.49) sem atingir 30.01 -> NOT_TRIGGERED
  const expireCandles = [
    { date: '2026-06-03', open: 28.0, high: 30.0, low: 27.5, close: 29.8 },
    { date: '2026-06-05', open: 29.0, high: 29.5, low: 27.0, close: 27.2 }  // perdeu 27.49
  ];
  const evaluatedExpired = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, expireCandles);
  assert.equal(evaluatedExpired.status, TradeSimulatorModel.STATUS.NOT_TRIGGERED);
  assert.equal(evaluatedExpired.executedEntryPrice, null);
  assert.equal(evaluatedExpired.resultR, null);
});

test('PFR de Compra — 6. Consistência canônica estrita entre TickerChartModel e TradeSimulatorModel', () => {
  const c3 = { date: '2026-06-01', open: 30.0, high: 31.0, low: 29.5, close: 30.2 };
  const c2 = { date: '2026-06-02', open: 30.2, high: 30.5, low: 28.5, close: 28.8 };
  const c1 = { date: '2026-06-03', open: 28.0, high: 30.0, low: 27.5, close: 29.8 };

  const valChart = TickerChartModel.validatePfrBuyPattern(c1, c2, c3);
  const valSim = TradeSimulatorModel.validatePfrBuyPattern(c1, c2, c3);

  // Ambas as validações devem ser estritamente idênticas
  assert.equal(valChart.isValid, true);
  assert.equal(valSim.isValid, true);
  assert.equal(valChart.entryPrice, valSim.entryPrice);
  assert.equal(valChart.stopLoss, valSim.stopLoss);
  assert.equal(valChart.initialRisk, valSim.initialRisk);
  assert.equal(valChart.graphicRiskPct, valSim.graphicRiskPct);
});
