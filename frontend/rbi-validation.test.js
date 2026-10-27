const test = require('node:test');
const assert = require('node:assert/strict');

const TickerChartModel = require('./ticker-chart-model');
const TradeSimulatorModel = require('./trade-simulator-model');

test('Barra Vermelha Ignorada (RBI) — 1. Exemplos positivos conhecidos (reconhecimento geométrico oficial)', () => {
  // Cenário Clássico de RBI no gráfico Diário:
  // c2 (Barra Vermelha Ignorada): O=30.00, H=30.50, L=28.50, C=29.00 (c2.close < c2.open)
  // c1 (Barra Sinal / Ignição): O=29.20, H=32.00, L=29.00, C=31.50 (c1.close > c1.open E c1.close > c2.high)
  const c2 = { open: 30.00, high: 30.50, low: 28.50, close: 29.00, date: '2026-05-19' };
  const c1 = { open: 29.20, high: 32.00, low: 29.00, close: 31.50, date: '2026-05-20' };

  // Validação no TickerChartModel
  const chartResult = TickerChartModel.validateRedBarIgnoredPattern(c1, c2);
  assert.equal(chartResult.isValid, true, 'TickerChartModel deve validar a RBI clássica');
  assert.equal(chartResult.triggerType, 'RBI');
  assert.equal(chartResult.triggerDisplayName, 'Barra Vermelha Ignorada');
  assert.equal(chartResult.entryPrice, 32.01, 'Entrada 1 tick (+0.01) acima da máxima do candle sinal c1');
  assert.equal(chartResult.stopLoss, 28.49, 'Stop 1 tick (-0.01) abaixo da mínima da barra vermelha c2');
  assert.equal(chartResult.initialRisk, 3.52, 'Risco inicial absoluto deve ser 32.01 - 28.49 = 3.52');
  assert.equal(chartResult.graphicRiskPct, 11.00, 'Risco gráfico percentual deve ser (3.52 / 32.01) * 100 = 11.00%');
  assert.equal(chartResult.audit.checks.c2IsRedBar.pass, true);
  assert.equal(chartResult.audit.checks.c1IsGreenBar.pass, true);
  assert.equal(chartResult.audit.checks.closeAboveRedBarHigh.pass, true);

  // Validação no TradeSimulatorModel
  const simResult = TradeSimulatorModel.validateRedBarIgnoredPattern(c1, c2);
  assert.equal(simResult.isValid, true, 'TradeSimulatorModel deve validar a RBI clássica');
  assert.equal(simResult.entryPrice, 32.01);
  assert.equal(simResult.stopLoss, 28.49);
  assert.equal(simResult.initialRisk, 3.52);
  assert.equal(simResult.graphicRiskPct, 11.00);

  // Verificação no detector gráfico de setups
  const c3 = { open: 28.00, high: 30.20, low: 27.80, close: 30.00, date: '2026-05-18' }; // candle prévio verde
  const detected = TickerChartModel.detectSetupTriggers([c3, c2, c1]);
  assert.equal(detected.name, 'Barra Vermelha Ignorada (RBI)');
  assert.equal(detected.hasTrigger, true);
  assert.equal(detected.entry, 32.01);
  assert.equal(detected.stop, 28.49);
});

test('Barra Vermelha Ignorada (RBI) — 2. Exemplos negativos e quase semelhantes (eliminação de falsos positivos)', () => {
  const validRedC2 = { open: 30.00, high: 30.50, low: 28.50, close: 29.00 };
  const validGreenC1 = { open: 29.20, high: 32.00, low: 29.00, close: 31.50 };

  // Caso A: Candle anterior NÃO é vermelho (c2.close >= c2.open, ex: candle verde)
  const greenC2 = { open: 29.00, high: 30.50, low: 28.50, close: 30.00 }; // verde
  const resGreenC2 = TradeSimulatorModel.validateRedBarIgnoredPattern(validGreenC1, greenC2);
  assert.equal(resGreenC2.isValid, false, 'Candle anterior verde não configura barra vermelha para ser ignorada');
  assert.equal(resGreenC2.audit.checks.c2IsRedBar.pass, false);
  assert.match(resGreenC2.reason, /não é uma barra vermelha/i);

  // Caso B: Doji no candle anterior (c2.close == c2.open)
  const dojiC2 = { open: 29.50, high: 30.50, low: 28.50, close: 29.50 };
  const resDojiC2 = TradeSimulatorModel.validateRedBarIgnoredPattern(validGreenC1, dojiC2);
  assert.equal(resDojiC2.isValid, false, 'Doji anterior não é barra vermelha estrita');

  // Caso C: Candle sinal NÃO é verde (c1.close <= c1.open, ex: candle vermelho ou doji)
  const redC1 = { open: 31.80, high: 32.00, low: 29.00, close: 31.00 }; // fechamento menor que abertura
  const resRedC1 = TradeSimulatorModel.validateRedBarIgnoredPattern(redC1, validRedC2);
  assert.equal(resRedC1.isValid, false, 'Candle sinal deve ser obrigatoriamente verde');
  assert.equal(resRedC1.audit.checks.c1IsGreenBar.pass, false);
  assert.match(resRedC1.reason, /não é uma barra verde/i);

  // Caso D: Candle sinal não superou a máxima da vermelha no fechamento (c1.close <= c2.high)
  // Rompeu intradiariamente (H=31.00 > 30.50), mas fechou a 30.20 (<= 30.50)
  const weakCloseC1 = { open: 29.20, high: 31.00, low: 29.00, close: 30.20 };
  const resWeakClose = TradeSimulatorModel.validateRedBarIgnoredPattern(weakCloseC1, validRedC2);
  assert.equal(resWeakClose.isValid, false, 'Superação apenas da máxima intradiária sem fechamento acima anula a RBI');
  assert.equal(resWeakClose.audit.checks.closeAboveRedBarHigh.pass, false);
  assert.match(resWeakClose.reason, /não superou a máxima/i);

  // Caso E: Limite exato de tick (c1.close == c2.high)
  const equalCloseC1 = { open: 29.20, high: 31.00, low: 29.00, close: 30.50 }; // 30.50 == 30.50
  const resEqualClose = TradeSimulatorModel.validateRedBarIgnoredPattern(equalCloseC1, validRedC2);
  assert.equal(resEqualClose.isValid, false, 'Fechamento exatamente igual à máxima da vermelha não é superação estrita');

  // Caso F: Inside Bar em vez de RBI (c1 contido na barra vermelha)
  const insideC1 = { open: 29.20, high: 30.00, low: 29.00, close: 29.80 }; // H < 30.50 e L > 28.50
  const resInside = TradeSimulatorModel.validateRedBarIgnoredPattern(insideC1, validRedC2);
  assert.equal(resInside.isValid, false, 'Candle contido na vermelha é Inside Bar, não Barra Vermelha Ignorada');

  // Caso G: Barras vermelhas consecutivas com mínimas descendentes
  const redC3 = { open: 32.00, high: 32.50, low: 30.00, close: 30.50 }; // vermelha anterior
  const redC2Lower = { open: 30.00, high: 30.50, low: 28.50, close: 29.00 }; // 28.50 < 30.00 (recuo)
  const resConsecutive = TradeSimulatorModel.validateRedBarIgnoredPattern(validGreenC1, redC2Lower, redC3);
  assert.equal(resConsecutive.hasPrecedingRedBar, true, 'Detecta presença de recuo com barras vermelhas consecutivas');
});

test('Barra Vermelha Ignorada (RBI) — 3. Limites exatos, candles incompletos e dados corrompidos', () => {
  const validRedC2 = { open: 30.00, high: 30.50, low: 28.50, close: 29.00 };
  const validGreenC1 = { open: 29.20, high: 32.00, low: 29.00, close: 31.50 };

  // Candles ausentes ou nulos
  assert.equal(TradeSimulatorModel.validateRedBarIgnoredPattern(null, validRedC2).isValid, false);
  assert.equal(TradeSimulatorModel.validateRedBarIgnoredPattern(validGreenC1, null).isValid, false);
  assert.equal(TradeSimulatorModel.validateRedBarIgnoredPattern(null, null).isValid, false);

  // Dados com NaN
  const nanC1 = { open: 29.20, high: NaN, low: 29.00, close: 31.50 };
  const resNan = TradeSimulatorModel.validateRedBarIgnoredPattern(nanC1, validRedC2);
  assert.equal(resNan.isValid, false);
  assert.match(resNan.reason, /corrompidos|inválidos/i);

  // Inversão OHLC (high <= low)
  const invertedC2 = { open: 30.00, high: 28.00, low: 30.50, close: 29.00 };
  const resInverted = TradeSimulatorModel.validateRedBarIgnoredPattern(validGreenC1, invertedC2);
  assert.equal(resInverted.isValid, false);
});

test('Barra Vermelha Ignorada (RBI) — 4. Tratamento robusto de Gap de Alta', () => {
  // Candle sinal abre com forte gap acima da barra vermelha
  // c2 (vermelha): O=20.00, H=20.50, L=19.00, C=19.20
  // c1 (gap de alta): O=21.00 (abre acima de 20.50), H=22.50, L=20.80, C=22.00 (fecha verde)
  const c2 = { open: 20.00, high: 20.50, low: 19.00, close: 19.20, date: '2026-05-19' };
  const c1Gap = { open: 21.00, high: 22.50, low: 20.80, close: 22.00, date: '2026-05-20' };

  const resGap = TradeSimulatorModel.validateRedBarIgnoredPattern(c1Gap, c2);
  assert.equal(resGap.isValid, true, 'Gap de alta com fechamento positivo é uma ignição perfeitamente válida');
  assert.equal(resGap.entryPrice, 22.51, 'Entrada 1 tick acima da máxima do candle sinal');
  assert.equal(resGap.stopLoss, 18.99, 'Stop rigorosamente ancorado 1 tick abaixo da mínima da barra vermelha ignorada');
  assert.equal(resGap.initialRisk, 3.52);
  assert.equal(resGap.graphicRiskPct, 15.64);
});

test('Barra Vermelha Ignorada (RBI) — 5. Separação rigorosa entre geometria do gatilho e filtros operacionais', () => {
  // Série longa com tendência de alta confirmada e volatilidade saudável (ATR ~1.5%)
  const alignedSeries = [];
  for (let i = 0; i < 80; i++) {
    const p = 20 + i * 0.25;
    alignedSeries.push({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      open: p,
      high: p + 0.4,
      low: p - 0.2,
      close: p + 0.3
    });
  }
  const lastP = alignedSeries[alignedSeries.length - 1].close;

  // Anexa os candles da RBI no topo da série (amplitude controlada com risco gráfico <= 3.6% para Grade A)
  // c3 (verde prévio)
  const c3 = { date: '2026-05-18', open: lastP, high: lastP + 1.0, low: lastP - 0.2, close: lastP + 0.8 };
  // c2 (barra vermelha solitária)
  const c2 = { date: '2026-05-19', open: lastP + 0.8, high: lastP + 0.9, low: lastP + 0.2, close: lastP + 0.3 };
  // c1 (barra verde de ignição superando a máxima da vermelha)
  const c1 = { date: '2026-05-20', open: lastP + 0.35, high: lastP + 1.2, low: lastP + 0.3, close: lastP + 1.1 };
  alignedSeries.push(c3, c2, c1);

  // Cenário 1: RBI válida + Tendência de Alta Oficial + RS >= 80 + Ciclo Positivo -> Elegível (Grade A)
  const triggerApproved = TradeSimulatorModel.detectSetupTrigger(alignedSeries, {
    rsScore: 88,
    marketPermission: { isPermitted: true, classification: 'Positivo' }
  });
  assert.ok(triggerApproved, 'Gatilho deve ser detectado e aprovado');
  assert.equal(triggerApproved.id, 'RBI');
  assert.equal(TradeSimulatorModel.formatTriggerDisplayName(triggerApproved.name), 'Barra Vermelha Ignorada');
  assert.equal(triggerApproved.hasTrigger, true);
  assert.equal(triggerApproved.grade, 'A');
  assert.equal(triggerApproved.entry, Number((c1.high + 0.01).toFixed(2)));
  assert.equal(triggerApproved.stop, Number((c2.low - 0.01).toFixed(2)));

  // Cenário 2: RBI geometricamente válida + Ciclo Defensivo -> Bloqueado categoricamente no Modo Oficial
  const triggerDefensive = TradeSimulatorModel.detectAllSetupTriggers(alignedSeries, {
    rsScore: 88,
    marketPermission: { isPermitted: false, classification: 'Defensivo', reason: 'Ciclo defensivo no IBOV' },
    includeRejected: true
  });
  const rejectedDefensive = triggerDefensive.find(t => t.id === 'RBI' || t.name === 'Barra Vermelha Ignorada (RBI)');
  assert.ok(rejectedDefensive);
  assert.equal(rejectedDefensive.hasTrigger, false);
  assert.equal(rejectedDefensive.grade, 'D');
  assert.equal(rejectedDefensive.rejectionCode, 'DEFENSIVE_CYCLE_ENTRY');

  // Cenário 3: RBI geometricamente válida + RS < 80 -> Bloqueado categoricamente no Modo Oficial
  const triggerSub80 = TradeSimulatorModel.detectAllSetupTriggers(alignedSeries, {
    rsScore: 65,
    marketPermission: { isPermitted: true, classification: 'Positivo' },
    includeRejected: true
  });
  const rejectedRs = triggerSub80.find(t => t.id === 'RBI' || t.name === 'Barra Vermelha Ignorada (RBI)');
  assert.ok(rejectedRs);
  assert.equal(rejectedRs.hasTrigger, false);
  assert.equal(rejectedRs.grade, 'D');
  assert.equal(rejectedRs.rejectionCode, 'RS_BELOW_80_OFFICIAL');

  // Cenário 4: Médias favoráveis e ciclo positivo NÃO criam RBI onde a geometria falha (ex: c1 não fecha acima da vermelha)
  const fakeRbiSeries = [...alignedSeries.slice(0, -1)];
  const fakeC1 = { date: '2026-05-20', open: lastP + 0.2, high: lastP + 0.85, low: lastP + 0.1, close: lastP + 0.7 }; // c1.close (0.7) <= c2.high (0.9)
  fakeRbiSeries.push(fakeC1);

  const triggerFake = TradeSimulatorModel.detectAllSetupTriggers(fakeRbiSeries, {
    rsScore: 95,
    marketPermission: { isPermitted: true, classification: 'Positivo' }
  });
  assert.equal(triggerFake.some(t => t.id === 'RBI'), false);
});

test('Barra Vermelha Ignorada (RBI) — 6. Acionamento da entrada e stop no simulador histórico (sem look-ahead)', () => {
  const baseSim = {
    id: 'sim-rbi-01',
    symbol: 'PETR4',
    companyName: 'Petrobras PN',
    triggerName: 'Barra Vermelha Ignorada',
    grade: 'A',
    signalDate: '2026-06-03',
    entryPrice: 32.01,
    stopLoss: 28.49,
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY,
    managementScenario: '2R'
  };

  // Dia do rompimento (2026-06-05, considerando feriado de Corpus Christi em 04/06) atinge 32.50 -> Executa entrada
  const executionCandles = [
    { date: '2026-06-03', open: 29.20, high: 32.00, low: 29.00, close: 31.50 }, // dia do sinal (c1)
    { date: '2026-06-05', open: 31.60, high: 32.50, low: 31.20, close: 32.30 }  // próximo pregão B3 supera 32.01
  ];
  const evaluatedSuccess = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, executionCandles);
  assert.equal(evaluatedSuccess.status, TradeSimulatorModel.STATUS.IN_OPERATION);
  assert.equal(evaluatedSuccess.entryDate, '2026-06-05');
  assert.equal(evaluatedSuccess.executedEntryPrice, 32.01);
  assert.equal(evaluatedSuccess.stopLoss, 28.49, 'Stop loss posicionado 1 tick abaixo da barra vermelha (28.49)');

  // Dia seguinte perde a mínima do stop (28.49) sem atingir 32.01 -> NOT_TRIGGERED
  const expireCandles = [
    { date: '2026-06-03', open: 29.20, high: 32.00, low: 29.00, close: 31.50 },
    { date: '2026-06-05', open: 30.00, high: 31.00, low: 28.00, close: 28.20 }  // perdeu 28.49 sem atingir 32.01
  ];
  const evaluatedExpired = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, expireCandles);
  assert.equal(evaluatedExpired.status, TradeSimulatorModel.STATUS.NOT_TRIGGERED);
  assert.equal(evaluatedExpired.executedEntryPrice, null);
  assert.equal(evaluatedExpired.resultR, null);
});

test('Barra Vermelha Ignorada (RBI) — 7. Consistência canônica estrita entre TickerChartModel e TradeSimulatorModel', () => {
  const c2 = { open: 40.00, high: 40.80, low: 38.00, close: 38.50 };
  const c1 = { open: 38.80, high: 42.00, low: 38.50, close: 41.50 };

  const chart = TickerChartModel.validateRedBarIgnoredPattern(c1, c2);
  const sim = TradeSimulatorModel.validateRedBarIgnoredPattern(c1, c2);

  // Ambas as validações devem ser estritamente idênticas
  assert.equal(chart.isValid, sim.isValid);
  assert.equal(chart.triggerType, sim.triggerType);
  assert.equal(chart.entryPrice, sim.entryPrice);
  assert.equal(chart.stopLoss, sim.stopLoss);
  assert.equal(chart.initialRisk, sim.initialRisk);
  assert.equal(chart.graphicRiskPct, sim.graphicRiskPct);
  assert.equal(chart.reason, sim.reason);

  assert.equal(chart.entryPrice, 42.01, 'Entrada 42.00 + 0.01 = 42.01');
  assert.equal(chart.stopLoss, 37.99, 'Stop 38.00 - 0.01 = 37.99');
  assert.equal(chart.initialRisk, 4.02, 'Risco inicial 42.01 - 37.99 = 4.02');
  assert.equal(chart.graphicRiskPct, 9.57, 'Risco % (4.02 / 42.01) * 100 = 9.57%');
});
