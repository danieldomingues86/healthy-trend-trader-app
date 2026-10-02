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
