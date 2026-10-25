const { test } = require('node:test');
const assert = require('node:assert/strict');
const TickerChartModel = require('./ticker-chart-model.js');

test('TickerChartModel: inicialização de estado de disciplina', () => {
  const state = TickerChartModel.createInitialState('2026-10-02');
  assert.equal(state.today, '2026-10-02');
  assert.equal(state.sessionsToday, 0);
  assert.equal(state.bypassMotives.length, 0);
});

test('TickerChartModel: primeira sessão incrementa contador diário', () => {
  const initial = TickerChartModel.createInitialState('2026-10-02');
  const now = new Date('2026-10-02T09:14:00Z').getTime();
  const res = TickerChartModel.registerChartAccess(initial, { now });

  assert.equal(res.isNewSession, true);
  assert.equal(res.shouldShowDisciplineModal, false);
  assert.equal(res.state.sessionsToday, 1);
});

test('TickerChartModel: navegação entre tickers na mesma sessão (<15min) não incrementa contador', () => {
  const initial = TickerChartModel.createInitialState('2026-10-02');
  const t0 = new Date('2026-10-02T09:14:00Z').getTime();
  const first = TickerChartModel.registerChartAccess(initial, { now: t0 });

  // 3 minutos depois, o usuário troca de PETR4 para VALE3
  const t1 = t0 + 3 * 60 * 1000;
  const second = TickerChartModel.registerChartAccess(first.state, { now: t1 });

  assert.equal(second.isNewSession, false);
  assert.equal(second.state.sessionsToday, 1);
  assert.equal(second.shouldShowDisciplineModal, false);
});

test('TickerChartModel: segunda sessão após intervalo (>15min) incrementa contador para 2/2', () => {
  const initial = TickerChartModel.createInitialState('2026-10-02');
  const t0 = new Date('2026-10-02T09:14:00Z').getTime();
  const first = TickerChartModel.registerChartAccess(initial, { now: t0 });

  // 1 hora depois (segunda sessão planejada)
  const t1 = t0 + 60 * 60 * 1000;
  const second = TickerChartModel.registerChartAccess(first.state, { now: t1 });

  assert.equal(second.isNewSession, true);
  assert.equal(second.state.sessionsToday, 2);
  assert.equal(second.shouldShowDisciplineModal, false);
});

test('TickerChartModel: terceira sessão ativa modal de disciplina anti-overtrading', () => {
  const initial = TickerChartModel.createInitialState('2026-10-02');
  const t0 = new Date('2026-10-02T09:14:00Z').getTime();
  const first = TickerChartModel.registerChartAccess(initial, { now: t0 });

  const t1 = t0 + 60 * 60 * 1000;
  const second = TickerChartModel.registerChartAccess(first.state, { now: t1 });

  // Tentativa de 3ª sessão no mesmo dia
  const t2 = t1 + 60 * 60 * 1000;
  const third = TickerChartModel.registerChartAccess(second.state, { now: t2 });

  assert.equal(third.isNewSession, true);
  assert.equal(third.shouldShowDisciplineModal, true);
  // O contador não deve ter sido incrementado ainda até a confirmação
  assert.equal(third.state.sessionsToday, 2);
});

test('TickerChartModel: logBypassMotive registra motivo e libera acesso', () => {
  const initial = TickerChartModel.createInitialState('2026-10-02');
  initial.sessionsToday = 2;

  const now = new Date('2026-10-02T15:30:00Z').getTime();
  const updated = TickerChartModel.logBypassMotive(initial, 'ansiedade', 'PETR4', { now });

  assert.equal(updated.sessionsToday, 3);
  assert.equal(updated.bypassMotives.length, 1);
  assert.equal(updated.bypassMotives[0].motive, 'ansiedade');
  assert.equal(updated.bypassMotives[0].ticker, 'PETR4');
});

test('TickerChartModel: evaluatePatienceIndex calcula dias úteis e pontuação', () => {
  const state = TickerChartModel.createInitialState('2026-10-02'); // Sexta-feira
  state.sessionsToday = 1;
  state.historyByDay = {
    '2026-09-28': { sessions: 1 },
    '2026-09-29': { sessions: 2 },
    '2026-09-30': { sessions: 1 },
    '2026-10-01': { sessions: 2 }
  };

  const evalResult = TickerChartModel.evaluatePatienceIndex(state, new Date('2026-10-02T18:00:00Z'));
  assert.ok(evalResult.patienceScore >= 80);
  assert.equal(evalResult.weekDays.length, 5);
  assert.equal(evalResult.currentStreak >= 1, true);
});

test('TickerChartModel: cálculo de EMA 9 e EMA 30', () => {
  const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40];
  const ema9 = TickerChartModel.calculateEma(prices, 9);
  assert.equal(ema9.length, prices.length);
  assert.equal(ema9[7], null);
  assert.ok(Number.isFinite(ema9[8]));
  assert.ok(ema9[ema9.length - 1] > ema9[ema9.length - 2]); // Inclinada para cima
});

test('TickerChartModel: detecção de Inside Bar', () => {
  // Candle anterior (mãe): H=30, L=20
  // Candle atual: H=28, L=22 (Inside Bar)
  const candles = [
    { high: 32, low: 22, close: 25 },
    { high: 30, low: 20, close: 28 },
    { high: 28, low: 22, close: 26 }
  ];
  const trigger = TickerChartModel.detectSetupTriggers(candles);
  assert.equal(trigger.id, 'INSIDE_BAR');
  assert.equal(trigger.grade, 'A+');
});

test('TickerChartModel: rejeita PFR em sequência de candles ascendentes (caso HGRE11)', () => {
  // Candles reais da referência HGRE11 em 20/10, 21/10 e 22/10
  const candles = [
    { open: 126.62, high: 129.17, low: 126.07, close: 128.69 }, // c3
    { open: 128.69, high: 129.74, low: 127.70, close: 127.70 }, // c2
    { open: 128.40, high: 129.92, low: 126.99, close: 129.00 }  // c1: mínima (126.99) > c3.low (126.07) -> continuidade de alta
  ];
  const ema10 = [125.0, 125.5, 126.0];
  const ema72 = [120.0, 120.5, 121.0];
  const trigger = TickerChartModel.detectSetupTriggers(candles, ema10, ema72);

  assert.notEqual(trigger.id, 'PFR_COMPRA', 'Não pode detectar PFR em continuidade de alta');
  assert.equal(trigger.hasTrigger, false, 'Nenhum gatilho deve ser acionado');
  assert.equal(trigger.entry, null, 'Não deve gerar entrada para falso positivo');
  assert.equal(trigger.stop, null, 'Não deve gerar stop para falso positivo');

  // Validação direta do validador com auditoria
  const validation = TickerChartModel.validatePfrBuyPattern(candles[2], candles[1], candles[0]);
  assert.equal(validation.isValid, false);
  assert.equal(validation.audit.checks.lowerThanC3.pass, false);
  assert.ok(validation.reason.includes('não renovou o fundo'));
});

test('TickerChartModel: rejeita PFR em candle de alta isolado sem mínima renovada', () => {
  const candles = [
    { open: 10.0, high: 11.0, low: 9.5, close: 10.5 },
    { open: 10.5, high: 11.5, low: 10.0, close: 11.0 },
    { open: 11.0, high: 12.5, low: 10.5, close: 12.0 } // Todas as mínimas são ascendentes
  ];
  const validation = TickerChartModel.validatePfrBuyPattern(candles[2], candles[1], candles[0]);
  assert.equal(validation.isValid, false);
  assert.equal(validation.audit.checks.lowerThanC2.pass, false);
  assert.equal(validation.audit.checks.lowerThanC3.pass, false);

  const trigger = TickerChartModel.detectSetupTriggers(candles);
  assert.notEqual(trigger.id, 'PFR_COMPRA');
  assert.equal(trigger.hasTrigger, false);
});

test('TickerChartModel: rejeita PFR quando qualquer condição obrigatória falhar', () => {
  // Falha 1: c1.low (21.0) < c2.low (22.0), mas c1.low (21.0) >= c3.low (20.0)
  const failStructure = TickerChartModel.validatePfrBuyPattern(
    { open: 21.5, high: 23.0, low: 21.0, close: 22.8 },
    { open: 22.5, high: 23.5, low: 22.0, close: 22.2 },
    { open: 21.0, high: 22.0, low: 20.0, close: 21.5 }
  );
  assert.equal(failStructure.isValid, false);
  assert.equal(failStructure.audit.checks.lowerThanC3.pass, false);

  // Falha 2: Menor mínima, mas c1.close (23.8) <= c2.close (24.0)
  const failClose = TickerChartModel.validatePfrBuyPattern(
    { open: 23.2, high: 24.0, low: 22.5, close: 23.8 },
    { open: 24.5, high: 25.0, low: 23.0, close: 24.0 },
    { open: 25.0, high: 26.0, low: 24.0, close: 24.5 }
  );
  assert.equal(failClose.isValid, false);
  assert.equal(failClose.audit.checks.closesAboveC2.pass, false);

  // Falha 3: Menor mínima e c1.close > c2.close, mas c1.close (24.2) < c1.open (24.8) - barra vermelha
  const failBullish = TickerChartModel.validatePfrBuyPattern(
    { open: 24.8, high: 25.0, low: 22.5, close: 24.2 },
    { open: 24.5, high: 25.0, low: 23.0, close: 24.0 },
    { open: 25.0, high: 26.0, low: 24.0, close: 24.5 }
  );
  assert.equal(failBullish.isValid, false);
  assert.equal(failBullish.audit.checks.bullishReaction.pass, false);
});

test('TickerChartModel: reconhece PFR de Compra quando cumpre integralmente a definição oficial', () => {
  const candles = [
    { open: 30.0, high: 31.0, low: 29.5, close: 30.2 }, // c3
    { open: 30.2, high: 30.5, low: 28.5, close: 28.8 }, // c2: queda
    { open: 28.0, high: 30.0, low: 27.5, close: 29.8 }  // c1: mínima (27.5) < c2 e c3, fechamento (29.8) > c2.close (28.8) e >= open (28.0)
  ];
  const ema10 = [27.5, 27.8, 28.0];
  const ema72 = [25.6, 25.8, 26.0];
  const trigger = TickerChartModel.detectSetupTriggers(candles, ema10, ema72);

  assert.equal(trigger.id, 'PFR_COMPRA');
  assert.equal(trigger.name, 'PFR de Compra');
  assert.equal(trigger.hasTrigger, true);
  assert.equal(trigger.grade, 'A');
  assert.equal(trigger.entry, 30.01, 'Entrada calculada 1 tick acima da máxima do candle sinal');
  assert.equal(trigger.stop, 27.49, 'Stop calculado 1 tick abaixo da mínima do candle sinal');
  assert.ok(trigger.audit);
  assert.equal(trigger.audit.isValid, true);
});

test('TickerChartModel: contexto e médias favoráveis NÃO criam PFR inexistente', () => {
  // Preço estritamente acima das médias, mas candles são de alta contínua sem reversão
  const candles = [
    { open: 50.0, high: 52.0, low: 49.5, close: 51.5 },
    { open: 51.5, high: 53.5, low: 51.0, close: 53.0 },
    { open: 53.0, high: 55.0, low: 52.5, close: 54.8 }
  ];
  const ema10 = [48.0, 48.5, 49.0];
  const ema72 = [40.0, 40.5, 41.0];
  const trigger = TickerChartModel.detectSetupTriggers(candles, ema10, ema72);

  assert.notEqual(trigger.id, 'PFR_COMPRA', 'Contexto favorável não pode criar PFR inexistente');
  assert.equal(trigger.entry, null);
  assert.equal(trigger.stop, null);
});

test('TickerChartModel: PFR geometricamente válido abaixo das EMAs é rejeitado por contexto', () => {
  const candles = [
    { open: 30.0, high: 31.0, low: 29.5, close: 30.2 },
    { open: 30.2, high: 30.5, low: 28.5, close: 28.8 },
    { open: 28.0, high: 30.0, low: 27.5, close: 29.0 } // c1 fecha a 29.0
  ];
  // EMA 10 a 31.0 (preço abaixo da EMA 10)
  const ema10 = [32.0, 31.5, 31.0];
  const ema72 = [33.0, 32.5, 32.0];
  const trigger = TickerChartModel.detectSetupTriggers(candles, ema10, ema72);

  assert.equal(trigger.id, 'NONE');
  assert.equal(trigger.hasTrigger, false);
  assert.equal(trigger.patternDetected, 'PFR de Compra (rejeitado: abaixo das médias)');
  assert.equal(trigger.entry, null);
  assert.equal(trigger.stop, null);
});

test('TickerChartModel: Inside Bar acima da EMA 9 e EMA 30 é promovido a gatilho válido (A+)', () => {
  const candles = [
    { high: 32, low: 22, close: 25 },
    { high: 30, low: 20, close: 28 },
    { high: 28, low: 22, close: 26 }
  ];
  // EMAs abaixo do fechamento (26): EMA9 = 24, EMA30 = 22
  const ema9 = [23, 23.5, 24];
  const ema30 = [21, 21.5, 22];
  const trigger = TickerChartModel.detectSetupTriggers(candles, ema9, ema30);

  assert.equal(trigger.hasTrigger, true);
  assert.equal(trigger.id, 'INSIDE_BAR');
  assert.equal(trigger.name, 'Inside Bar');
  assert.equal(trigger.grade, 'A+');
  assert.equal(trigger.entry, 28.01);
  assert.equal(trigger.stop, 21.99);
});

test('TickerChartModel: Inside Bar abaixo da EMA 9 é rejeitado (hasTrigger: false)', () => {
  const candles = [
    { high: 32, low: 22, close: 25 },
    { high: 30, low: 20, close: 24 },
    { high: 28, low: 22, close: 23 } // Fechamento em 23
  ];
  // EMA9 acima do fechamento: EMA9 = 25, EMA30 = 20
  const ema9 = [25, 25, 25];
  const ema30 = [20, 20, 20];
  const trigger = TickerChartModel.detectSetupTriggers(candles, ema9, ema30);

  assert.equal(trigger.hasTrigger, false);
  assert.equal(trigger.id, 'NONE');
  assert.equal(trigger.name, 'Nenhum gatilho encontrado');
  assert.equal(trigger.grade, 'Neutro');
  assert.equal(trigger.entry, null);
  assert.equal(trigger.stop, null);
});

test('TickerChartModel: Inside Bar abaixo da EMA 30 é rejeitado (hasTrigger: false)', () => {
  const candles = [
    { high: 32, low: 22, close: 25 },
    { high: 30, low: 20, close: 28 },
    { high: 28, low: 22, close: 26 } // Fechamento em 26
  ];
  // EMA30 acima do fechamento: EMA9 = 24, EMA30 = 29
  const ema9 = [24, 24, 24];
  const ema30 = [29, 29, 29];
  const trigger = TickerChartModel.detectSetupTriggers(candles, ema9, ema30);

  assert.equal(trigger.hasTrigger, false);
  assert.equal(trigger.id, 'NONE');
  assert.equal(trigger.name, 'Nenhum gatilho encontrado');
  assert.equal(trigger.grade, 'Neutro');
});

test('TickerChartModel: 1-2-3 de Compra acima das médias é gatilho válido, mas abaixo é rejeitado', () => {
  // c3: L=18; c2: L=15, H=20; c1: L=16, H=22, close=21 (> c2.high)
  const candles = [
    { high: 25, low: 18, close: 19 },
    { high: 20, low: 15, close: 17 },
    { high: 22, low: 16, close: 21 }
  ];

  // Caso 1: acima de ambas (EMA9=18, EMA30=17)
  const valid = TickerChartModel.detectSetupTriggers(candles, [17, 17.5, 18], [16, 16.5, 17]);
  assert.equal(valid.hasTrigger, true);
  assert.equal(valid.id, '123_COMPRA');
  assert.equal(valid.grade, 'A');
  assert.equal(valid.entry, 22.01);
  assert.equal(valid.stop, 14.99);

  // Caso 2: abaixo da EMA 9 (EMA9=23, EMA30=17)
  const invalid = TickerChartModel.detectSetupTriggers(candles, [23, 23, 23], [16, 16.5, 17]);
  assert.equal(invalid.hasTrigger, false);
  assert.equal(invalid.id, 'NONE');
  assert.equal(invalid.name, 'Nenhum gatilho encontrado');
});

test('TickerChartModel: ausência de padrão nunca retorna "Pullback em andamento" como gatilho', () => {
  const candles = [
    { high: 30, low: 20, close: 25 },
    { high: 35, low: 22, close: 32 },
    { high: 40, low: 30, close: 38 } // Expansão forte, sem inside bar ou 123
  ];
  const ema9 = [24, 26, 28];
  const ema30 = [20, 21, 22];
  const trigger = TickerChartModel.detectSetupTriggers(candles, ema9, ema30);

  assert.equal(trigger.hasTrigger, false);
  assert.equal(trigger.id, 'NONE');
  assert.equal(trigger.name, 'Nenhum gatilho encontrado');
  assert.equal(trigger.description, 'Nenhum padrão de entrada válido identificado no gráfico Diário.');
  assert.notEqual(trigger.name, 'Pullback em Andamento');
});

test('TickerChartModel: buildTradeContext e inferRubricRatingsFromContext respeitam fundamentos fracos (MGLU3) e fortes (PETR4)', () => {
  // Cenário MGLU3: Fundamentos Fracos
  const mgluContext = TickerChartModel.buildTradeContext({
    tickerInfo: { symbol: 'MGLU3', price: 8.35 },
    trigger: { id: 'INSIDE_BAR', name: 'Inside Bar', grade: 'A', entry: 8.50, stop: 7.90 },
    fundamentals: {
      score: 4.7,
      classification: 'FRACO',
      evaluation: 'Fraco',
      status: 'bad',
      available: true
    }
  });

  assert.equal(mgluContext.fundamentals.evaluation, 'Fraco');
  assert.equal(mgluContext.fundamentals.status, 'bad');
  assert.equal(mgluContext.fundamentals.classification, 'FRACO');
  assert.equal(mgluContext.fundamentals.score, 4.7);

  const mgluRatings = TickerChartModel.inferRubricRatingsFromContext(mgluContext);
  assert.equal(mgluRatings.fundamentalScore, 'bad');

  // Cenário PETR4: Fundamentos Fortes
  const petrContext = TickerChartModel.buildTradeContext({
    tickerInfo: { symbol: 'PETR4', price: 36.50 },
    trigger: { id: '123_COMPRA', name: '1-2-3 de Compra', grade: 'A', entry: 36.80, stop: 35.20 },
    fundamentals: {
      score: 8.8,
      classification: 'BOM',
      evaluation: 'Forte',
      status: 'good',
      available: true
    }
  });

  assert.equal(petrContext.fundamentals.evaluation, 'Forte');
  assert.equal(petrContext.fundamentals.status, 'good');
  assert.equal(petrContext.fundamentals.classification, 'BOM');
  assert.equal(petrContext.fundamentals.score, 8.8);

  const petrRatings = TickerChartModel.inferRubricRatingsFromContext(petrContext);
  assert.equal(petrRatings.fundamentalScore, 'good');
});

test('TickerChartModel: fins de semana liberam o gráfico para estudos sem modal de disciplina', () => {
  // Sábado
  assert.equal(TickerChartModel.isWeekend('2026-10-03T10:00:00-03:00'), true);
  // Domingo
  assert.equal(TickerChartModel.isWeekend('2026-10-04T15:00:00-03:00'), true);
  // Segunda (útil)
  assert.equal(TickerChartModel.isWeekend('2026-10-05T09:00:00-03:00'), false);

  const satState = TickerChartModel.createInitialState('2026-10-03');
  satState.sessionsToday = 2; // Já atingiu 2 sessões
  satState.lastInteractionAt = new Date('2026-10-03T10:00:00-03:00').getTime();

  // Tentativa de 3ª sessão no sábado (1 hora depois)
  const satThird = TickerChartModel.registerChartAccess(satState, {
    now: new Date('2026-10-03T11:30:00-03:00').getTime()
  });

  assert.equal(satThird.isNewSession, true);
  assert.equal(satThird.isWeekend, true);
  assert.equal(satThird.shouldShowDisciplineModal, false, 'Modal de disciplina NUNCA deve aparecer no fim de semana');
  assert.equal(satThird.state.sessionsToday, 3, 'Deve permitir navegar livremente nos estudos de fim de semana');
  // Validação adicional de alinhamento e inclinação das EMAs 10 e 72 no Diário
  const validPfrCandles = [
    { time: '2025-11-14', open: 30.0, high: 31.0, low: 29.5, close: 30.2 },
    { time: '2025-11-17', open: 30.2, high: 30.5, low: 28.5, close: 28.8 },
    { time: '2025-11-18', open: 28.0, high: 30.0, low: 27.5, close: 29.8 }
  ];
  const bothDown = TickerChartModel.detectSetupTriggers(validPfrCandles, [29.0, 28.5, 28.0], [27.0, 26.5, 26.0]);
  assert.equal(bothDown.hasTrigger, false);
  assert.equal(bothDown.entry, null);
  assert.equal(bothDown.stop, null);
  assert.equal(bothDown.rejectionReason, 'Rejeitado: EMA 10 e EMA 72 descendentes');

  const ema10Down = TickerChartModel.detectSetupTriggers(validPfrCandles, [29.0, 28.5, 28.0], [25.5, 25.8, 26.0]);
  assert.equal(ema10Down.hasTrigger, false);
  assert.equal(ema10Down.rejectionReason, 'Rejeitado: EMA 10 descendente');

  const ema72Down = TickerChartModel.detectSetupTriggers(validPfrCandles, [27.5, 27.8, 28.0], [26.8, 26.4, 26.0]);
  assert.equal(ema72Down.hasTrigger, false);
  assert.equal(ema72Down.rejectionReason, 'Rejeitado: EMA 72 descendente');

  const flatEmas = TickerChartModel.detectSetupTriggers(validPfrCandles, [28.0, 28.0, 28.0], [26.0, 26.0, 26.0]);
  assert.equal(flatEmas.hasTrigger, false);
  assert.ok(flatEmas.rejectionReason.includes('Rejeitado: Médias sem inclinação altista confirmada'));

  const misaligned = TickerChartModel.detectSetupTriggers(validPfrCandles, [25.5, 25.8, 26.0], [27.5, 27.8, 28.0]);
  assert.equal(misaligned.hasTrigger, false);
  assert.equal(misaligned.rejectionReason, 'Rejeitado: EMA 10 abaixo da EMA 72');

  const approved = TickerChartModel.detectSetupTriggers(validPfrCandles, [27.5, 27.8, 28.0], [25.5, 25.8, 26.0]);
  assert.equal(approved.hasTrigger, true);
  assert.equal(approved.id, 'PFR_COMPRA');
  assert.equal(approved.entry, 30.01);
  assert.equal(approved.stop, 27.49);
  assert.equal(approved.trendAudit.isValid, true);
});


