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

test('TickerChartModel: detecção de Inside Bar e PFR', () => {
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

