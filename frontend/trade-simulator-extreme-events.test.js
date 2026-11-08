'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TradeSimulatorModel = require('./trade-simulator-model.js');

/**
 * Gera uma série contínua de candles diários (apenas pregões válidos B3) para testes determinísticos.
 */
function buildTradingSessionCandles(entries) {
  return entries.map(e => ({
    time: e.time,
    date: e.time,
    open: Number(e.open),
    high: Number(e.high),
    low: Number(e.low),
    close: Number(e.close),
    volume: e.volume || 15000000
  }));
}

test('Proteção Obrigatória contra Eventos Extremos — 1. Trade aberto antes de evento extremo é encerrado obrigatoriamente no fechamento do último pregão anterior', () => {
  TradeSimulatorModel.resetExtremeEventsCalendar();

  // Evento eleitoral no domingo 2026-10-04 -> Último pregão anterior na B3: sexta-feira 2026-10-02
  const sim = {
    id: 'sim-petr4-oct2026-r1',
    symbol: 'PETR4',
    companyName: 'Petrobras PN',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-09-29',
    entryPrice: 38.00,
    stopLoss: 36.00, // Risco 1R = R$ 2,00 | Alvo +2R = R$ 42,00
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  };

  const candles = buildTradingSessionCandles([
    { time: '2026-09-29', open: 37.20, high: 37.99, low: 36.01, close: 37.80 }, // Sinal
    { time: '2026-09-30', open: 37.90, high: 38.60, low: 37.50, close: 38.40 }, // T+1: Entrada acionada a R$ 38,00
    { time: '2026-10-01', open: 38.40, high: 39.20, low: 38.10, close: 39.00 }, // Permanece aberto (+0,50R)
    { time: '2026-10-02', open: 39.00, high: 39.80, low: 38.70, close: 39.50 }, // Sexta-feira antes do 1º turno (04/10/2026): deve encerrar no fechamento (39,50)
    { time: '2026-10-05', open: 34.00, high: 35.00, low: 33.20, close: 33.80 }  // Segunda-feira pós-eleição: forte gap de baixa (-14%)
  ]);

  const evaluated = TradeSimulatorModel.evaluateSimulationOnCandles(sim, candles, '2R');

  assert.equal(evaluated.exitDate, '2026-10-02', 'Deve encerrar na sexta-feira 02/10/2026 (último pregão antes de 04/10/2026)');
  assert.equal(evaluated.exitPrice, 39.50, 'Deve encerrar exatamente no preço de fechamento da sessão de sexta-feira');
  assert.equal(evaluated.exitReason, 'EVENTO EXTREMO IDENTIFICADO');
  assert.equal(evaluated.exitType, 'EXTREME_EVENT_PROTECTION');
  assert.equal(evaluated.isExtremeEventExit, true);
  assert.equal(evaluated.isTechnicalStop, false);
  assert.equal(evaluated.status, TradeSimulatorModel.STATUS.CLOSED_GAIN);
  assert.equal(evaluated.resultR, 0.75); // (39.50 - 38.00) / 2.00 = +0.75R

  // Verifica metadados completos do histórico do trade (Seção 5)
  const ext = evaluated.extremeEventProtection;
  assert.ok(ext, 'Deve conter objeto extremeEventProtection detalhado');
  assert.equal(ext.exitDate, '2026-10-02');
  assert.equal(ext.exitTime, '17:00 BRT');
  assert.equal(ext.effectiveExitPrice, 39.50);
  assert.ok(ext.eventName.includes('Eleições Presidenciais do Brasil 2026 — 1º Turno'));
  assert.equal(ext.eventCategory, 'PRESIDENTIAL_ELECTION_1ST_ROUND');
  assert.ok(ext.justification.includes('Operação encerrada antecipadamente por proteção contra evento extremo'));
  assert.equal(ext.realizedResultR, 0.75);
  assert.equal(ext.hypotheticalResultR, -2.00); // Na segunda 05/10 abriu em gap a 34.00 -> (34.00 - 38.00) / 2.00 = -2.00R
  assert.equal(ext.protectionImpactR, 2.75);    // Evitou perda de -2.00R e garantiu +0.75R -> impacto positivo de +2.75R
});

test('Proteção Obrigatória contra Eventos Extremos — 2 e 3. Trade em lucro e trade em prejuízo encerram ambos antes do evento no preço de fechamento (com custos aplicáveis)', () => {
  TradeSimulatorModel.resetExtremeEventsCalendar();

  // Caso A: Trade em lucro parcial antes do 2º turno (25/10/2026 -> sexta-feira 23/10/2026)
  const winningSim = {
    id: 'sim-win-before-r2',
    symbol: 'WEGE3',
    triggerName: '1-2-3 de Compra',
    grade: 'A',
    signalDate: '2026-10-20',
    entryPrice: 50.00,
    stopLoss: 48.00, // 1R = 2.00
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  };

  const winCandles = buildTradingSessionCandles([
    { time: '2026-10-20', open: 49.20, high: 49.99, low: 48.10, close: 49.80 },
    { time: '2026-10-21', open: 49.90, high: 51.00, low: 49.50, close: 50.80 }, // Entra a 50.00
    { time: '2026-10-22', open: 50.80, high: 51.80, low: 50.40, close: 51.50 },
    { time: '2026-10-23', open: 51.50, high: 52.40, low: 51.10, close: 52.00 }, // Sexta-feira 23/10: fecha a 52.00 (+1.00R)
    { time: '2026-10-26', open: 55.00, high: 56.00, low: 54.00, close: 55.50 }  // Segunda-feira pós-2º turno: mesmo subindo depois, trade já foi encerrado
  ]);

  const evalWin = TradeSimulatorModel.evaluateSimulationOnCandles(winningSim, winCandles, '2R');
  assert.equal(evalWin.exitDate, '2026-10-23');
  assert.equal(evalWin.exitPrice, 52.00);
  assert.equal(evalWin.resultR, 1.00);
  assert.equal(evalWin.status, TradeSimulatorModel.STATUS.CLOSED_GAIN);
  assert.equal(evalWin.exitReason, 'EVENTO EXTREMO IDENTIFICADO');

  // Caso B: Trade em prejuízo parcial antes do 2º turno (sem ter tocado o stop loss técnico de 48.00)
  const losingSim = {
    id: 'sim-loss-before-r2',
    symbol: 'ITUB4',
    triggerName: 'PFR de Compra',
    grade: 'B',
    signalDate: '2026-10-20',
    entryPrice: 50.00,
    stopLoss: 48.00, // 1R = 2.00
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  };

  const lossCandles = buildTradingSessionCandles([
    { time: '2026-10-20', open: 49.20, high: 49.99, low: 48.10, close: 49.80 },
    { time: '2026-10-21', open: 49.90, high: 50.40, low: 49.20, close: 49.60 }, // Entra a 50.00
    { time: '2026-10-22', open: 49.60, high: 49.80, low: 48.60, close: 48.90 },
    { time: '2026-10-23', open: 48.90, high: 49.10, low: 48.30, close: 48.50 }, // Sexta-feira 23/10: fecha a 48.50 (-0.75R)
    { time: '2026-10-26', open: 45.00, high: 46.00, low: 44.50, close: 45.20 }
  ]);

  const evalLoss = TradeSimulatorModel.evaluateSimulationOnCandles(losingSim, lossCandles, '2R');
  assert.equal(evalLoss.exitDate, '2026-10-23');
  assert.equal(evalLoss.exitPrice, 48.50);
  assert.equal(evalLoss.resultR, -0.75);
  assert.equal(evalLoss.status, TradeSimulatorModel.STATUS.CLOSED_LOSS);
  assert.equal(evalLoss.exitReason, 'EVENTO EXTREMO IDENTIFICADO');
  assert.equal(evalLoss.isTechnicalStop, false, 'Não deve ser classificado como stop técnico');
});

test('Proteção Obrigatória contra Eventos Extremos — 4 e 5. Trade encerrado normalmente antes do evento não sofre interferência; nenhuma posição permanece aberta durante o evento', () => {
  TradeSimulatorModel.resetExtremeEventsCalendar();

  // Trade que atinge o alvo +2R na quinta-feira 2026-10-01 (antes da sexta-feira 2026-10-02)
  const earlyClosedSim = {
    id: 'sim-early-target',
    symbol: 'RENT3',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-09-28',
    entryPrice: 40.00,
    stopLoss: 38.00, // 1R = 2.00 | Alvo +2R = 44.00
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  };

  const candles = buildTradingSessionCandles([
    { time: '2026-09-28', open: 39.20, high: 39.99, low: 38.10, close: 39.80 },
    { time: '2026-09-29', open: 39.90, high: 41.20, low: 39.60, close: 41.00 }, // Entra a 40.00
    { time: '2026-09-30', open: 41.00, high: 42.80, low: 40.80, close: 42.50 },
    { time: '2026-10-01', open: 42.60, high: 44.50, low: 42.40, close: 44.20 }, // Atinge +2R (44.00) em 01/10
    { time: '2026-10-02', open: 44.20, high: 45.00, low: 43.50, close: 43.80 },
    { time: '2026-10-05', open: 39.00, high: 40.00, low: 38.00, close: 38.50 }
  ]);

  const evaluated = TradeSimulatorModel.evaluateSimulationOnCandles(earlyClosedSim, candles, '2R');
  assert.equal(evaluated.exitDate, '2026-10-01');
  assert.equal(evaluated.exitPrice, 44.00);
  assert.equal(evaluated.resultR, 2.00);
  assert.equal(evaluated.isExtremeEventExit || false, false, 'Trade já encerrado em 01/10 não deve ser marcado como saída por evento extremo');
  assert.equal(evaluated.exitReason, 'Sell Into Strength (+2R)');
});

test('Proteção Obrigatória contra Eventos Extremos — 6 e 7. Evento em fim de semana ou feriado resolve corretamente o último pregão útil anterior e respeita antecedência configurada', () => {
  TradeSimulatorModel.resetExtremeEventsCalendar();

  // 1. Domingo 04/10/2026 -> Último pregão anterior (advance = 1) é sexta-feira 02/10/2026
  const r1 = TradeSimulatorModel.resolveExtremeEventCutoffSession({
    id: 'evt-sun',
    name: 'Eleição Domingo',
    eventDate: '2026-10-04'
  }, { advanceSessions: 1 });
  assert.equal(r1.cutoffDate, '2026-10-02');
  assert.equal(r1.reopenDate, '2026-10-05');

  // 2. Com antecedência configurada pelo usuário para 2 pregões antes -> quinta-feira 01/10/2026
  const r1Adv2 = TradeSimulatorModel.resolveExtremeEventCutoffSession({
    id: 'evt-sun-adv2',
    name: 'Eleição Domingo (2 pregões antes)',
    eventDate: '2026-10-04'
  }, { advanceSessions: 2 });
  assert.equal(r1Adv2.cutoffDate, '2026-10-01');

  // 3. Tentativa de configurar antecedência 0 ou negativa é bloqueada (mínimo 1 pregão antes)
  TradeSimulatorModel.setExtremeEventProtectionConfig({ advanceSessions: 0 });
  assert.equal(TradeSimulatorModel.getExtremeEventProtectionConfig().advanceSessions, 1);

  // 4. Evento na terça-feira 2026-10-13 logo após o feriado de Nossa Senhora Aparecida (segunda-feira 2026-10-12):
  // O último pregão anterior deve ser sexta-feira 2026-10-09!
  const afterHoliday = TradeSimulatorModel.resolveExtremeEventCutoffSession({
    id: 'evt-after-holiday',
    name: 'Decisão Extraordinária Pós-Feriado',
    eventDate: '2026-10-13'
  }, { advanceSessions: 1 });
  assert.equal(afterHoliday.cutoffDate, '2026-10-09', 'Deve pular o feriado de 12/10/2026 e o fim de semana, encerrando na sexta-feira 09/10/2026');
});

test('Proteção Obrigatória contra Eventos Extremos — 8. Nenhum stop ou alvo é avaliado após o encerramento antecipado em todos os cenários (2R, 2.5R, Pirâmide e Parciais)', () => {
  TradeSimulatorModel.resetExtremeEventsCalendar();

  const baseSim = {
    id: 'sim-all-scenarios-oct2026',
    symbol: 'PRIO3',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-09-29',
    entryPrice: 40.00,
    stopLoss: 38.00, // 1R = 2.00 | +1R = 42.00 | +2R = 44.00 | +2.5R = 45.00
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  };

  // Na quinta 01/10 atinge +1R (42.00, acionando adição na Pirâmide).
  // Na sexta 02/10 fecha a 43.00 (antes de +2R).
  // Na segunda 05/10 despenca para 32.00 (violaria todos os stops) e na terça 06/10 dispara para 48.00 (atingiria todos os alvos).
  const candles = buildTradingSessionCandles([
    { time: '2026-09-29', open: 39.40, high: 39.99, low: 38.10, close: 39.85 },
    { time: '2026-09-30', open: 39.95, high: 41.00, low: 39.70, close: 40.80 }, // Entrada a 40.00
    { time: '2026-10-01', open: 40.90, high: 42.50, low: 40.70, close: 42.20 }, // Atinge +1R (42.00)
    { time: '2026-10-02', open: 42.20, high: 43.40, low: 42.00, close: 43.00 }, // Sexta-feira pré-eleição: encerra a 43.00
    { time: '2026-10-05', open: 32.00, high: 33.00, low: 31.00, close: 31.50 }, // Gap violento pós-eleição (ignorado pois trade já encerrou)
    { time: '2026-10-06', open: 46.00, high: 48.50, low: 45.00, close: 48.00 }
  ]);

  const scenarios = ['2R', '2.5R', 'PYRAMID_1R_2R', 'PARTIAL_50_2R_EMA10', 'PARTIAL_80_2R_EMA10'];
  for (const sc of scenarios) {
    const res = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, candles, sc);
    assert.equal(res.exitDate, '2026-10-02', `Cenário ${sc} deve encerrar em 2026-10-02`);
    assert.equal(res.exitPrice, 43.00, `Cenário ${sc} deve encerrar no fechamento 43.00`);
    assert.equal(res.exitReason, 'EVENTO EXTREMO IDENTIFICADO', `Cenário ${sc} deve registrar motivo EVENTO EXTREMO IDENTIFICADO`);
    assert.equal(res.isExtremeEventExit, true);
    if (sc === 'PYRAMID_1R_2R') {
      // Lote 1: (43 - 40)/2 = +1.50R | Lote 2 (adicionado em 42): (43 - 42)/2 = +0.50R -> Total = +2.00R
      assert.equal(res.resultR, 2.00);
    } else {
      assert.equal(res.resultR, 1.50);
    }
  }
});

test('Proteção Obrigatória contra Eventos Extremos — 9. Integridade Cronológica (Zero Look-Ahead Bias): eventos inesperados não conhecidos antes da data não geram encerramento preventivo artificial', () => {
  TradeSimulatorModel.resetExtremeEventsCalendar();

  // Cadastra um evento inesperado (choque súbito não agendado previamente)
  TradeSimulatorModel.registerExtremeEvent({
    id: 'evt-unexpected-shock',
    name: 'Choque Geopolítico Súbito Não Agendado',
    category: 'GEOPOLITICAL_IMPACT',
    eventDate: '2026-08-16',
    isPreScheduled: false,
    isUnexpected: true
  });

  const sim = {
    id: 'sim-unexpected-event',
    symbol: 'VALE3',
    triggerName: '1-2-3 de Compra',
    grade: 'A',
    signalDate: '2026-08-12',
    entryPrice: 60.00,
    stopLoss: 58.00,
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  };

  const candles = buildTradingSessionCandles([
    { time: '2026-08-12', open: 59.20, high: 59.99, low: 58.10, close: 59.80 },
    { time: '2026-08-13', open: 59.90, high: 61.00, low: 59.60, close: 60.80 }, // Entra a 60.00
    { time: '2026-08-14', open: 60.80, high: 61.50, low: 60.40, close: 61.20 }, // Sexta-feira antes do choque inesperado: NÃO pode encerrar por look-ahead!
    { time: '2026-08-17', open: 56.00, high: 56.50, low: 55.20, close: 55.80 }  // Segunda-feira: sofre o gap de abertura real e executa stop na abertura (56.00)
  ]);

  const evaluated = TradeSimulatorModel.evaluateSimulationOnCandles(sim, candles, '2R');
  assert.equal(evaluated.exitDate, '2026-08-17', 'Evento inesperado não pode acionar saída retroativa na sexta-feira 14/08');
  assert.equal(evaluated.exitPrice, 56.00, 'Deve sofrer a execução realista do stop em gap na abertura de segunda-feira (56.00)');
  assert.equal(evaluated.isExtremeEventExit || false, false);

  TradeSimulatorModel.resetExtremeEventsCalendar();
});

test('Proteção Obrigatória contra Eventos Extremos — 10. Critério de Aceite Outubro/2026 (1º e 2º Turnos das Eleições Presidenciais), Estatísticas e Representação Visual', () => {
  TradeSimulatorModel.resetExtremeEventsCalendar();

  // Simulação 1: Aberta antes do 1º turno (04/10/2026) -> Encerra em 02/10/2026
  const simRound1 = TradeSimulatorModel.evaluateSimulationOnCandles({
    id: 'sim-oct2026-r1',
    symbol: 'BBAS3',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-09-30',
    entryPrice: 28.00,
    stopLoss: 27.00,
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  }, buildTradingSessionCandles([
    { time: '2026-09-28', open: 27.10, high: 28.10, low: 26.90, close: 27.40 },
    { time: '2026-09-29', open: 27.40, high: 28.20, low: 26.99, close: 27.60 },
    { time: '2026-09-30', open: 27.50, high: 27.99, low: 27.05, close: 27.90 },
    { time: '2026-10-01', open: 27.95, high: 28.50, low: 27.80, close: 28.40 }, // Entra a 28.00
    { time: '2026-10-02', open: 28.40, high: 28.90, low: 28.20, close: 28.60 }, // Encerra na sexta 02/10 a 28.60 (+0.60R)
    { time: '2026-10-05', open: 25.50, high: 26.20, low: 25.00, close: 25.40 }  // Evitou gap de baixa a 25.50 (-2.50R)
  ]), '2R');

  // Simulação 2: Aberta entre o 1º e o 2º turno -> Encerra em 23/10/2026 antes do 2º turno (25/10/2026)
  const simRound2 = TradeSimulatorModel.evaluateSimulationOnCandles({
    id: 'sim-oct2026-r2',
    symbol: 'ELET3',
    triggerName: '1-2-3 de Compra',
    grade: 'B',
    signalDate: '2026-10-20',
    entryPrice: 40.00,
    stopLoss: 38.00,
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  }, buildTradingSessionCandles([
    { time: '2026-10-19', open: 39.50, high: 40.20, low: 39.00, close: 39.40 },
    { time: '2026-10-20', open: 39.30, high: 39.99, low: 38.50, close: 39.80 },
    { time: '2026-10-21', open: 39.90, high: 40.60, low: 39.60, close: 40.30 }, // Entra a 40.00
    { time: '2026-10-22', open: 40.30, high: 40.50, low: 39.20, close: 39.50 },
    { time: '2026-10-23', open: 39.50, high: 39.80, low: 39.00, close: 39.20 }, // Encerra na sexta 23/10 a 39.20 (-0.40R)
    { time: '2026-10-26', open: 36.00, high: 37.00, low: 35.50, close: 36.20 }  // Evitou gap de baixa a 36.00 (-2.00R)
  ]), '2R');

  // Simulação 3: Stop técnico normal fora de eventos extremos
  const simNormalStop = TradeSimulatorModel.evaluateSimulationOnCandles({
    id: 'sim-normal-tech-stop',
    symbol: 'SUZB3',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-09-09',
    entryPrice: 55.00,
    stopLoss: 53.00,
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  }, buildTradingSessionCandles([
    { time: '2026-09-09', open: 54.20, high: 54.99, low: 53.10, close: 54.80 },
    { time: '2026-09-10', open: 54.90, high: 55.40, low: 54.50, close: 55.10 }, // Entra a 55.00
    { time: '2026-09-11', open: 54.80, high: 55.00, low: 52.80, close: 52.90 }  // Stop técnico normal a 53.00 (-1.00R)
  ]), '2R');

  assert.equal(simRound1.exitDate, '2026-10-02');
  assert.equal(simRound1.exitReason, 'EVENTO EXTREMO IDENTIFICADO');
  assert.equal(simRound2.exitDate, '2026-10-23');
  assert.equal(simRound2.exitReason, 'EVENTO EXTREMO IDENTIFICADO');

  // Verifica impacto nas estatísticas (Seção 8)
  const stats = TradeSimulatorModel.calculateSimulatorStats([simRound1, simRound2, simNormalStop]);
  assert.equal(stats.closedTradesCount, 3, 'Trades encerrados por evento extremo devem fazer parte das estatísticas do backtest');
  assert.equal(stats.extremeEventExitsCount, 2, 'Deve contabilizar exatamente 2 trades encerrados por evento extremo');
  assert.equal(stats.extremeEventTotalR, 0.20, 'Soma de R dos eventos extremos: +0.60R + (-0.40R) = +0.20R');
  assert.ok(stats.extremeEventAvoidedImpactR > 0, 'Deve calcular o prejuízo evitado em comparação com a permanência hipotética');
  assert.equal(stats.technicalStopsCount, 1, 'Saídas por evento extremo NÃO devem ser contabilizadas como stops técnicos');

  // Verifica Snapshot e Representação Visual (Seção 6)
  const snap = TradeSimulatorModel.buildSimulationSnapshot(simRound1, simRound1._evalCandles);
  const extSnapEvt = snap.events.find(e => e.type === 'EXTREME_EVENT_EXIT');
  assert.ok(extSnapEvt, 'Snapshot deve emitir evento específico EXTREME_EVENT_EXIT para diferenciação visual no gráfico');
  assert.equal(extSnapEvt.label, '🛡️ Saída antecipada — Evento Extremo');
  assert.equal(extSnapEvt.time, '2026-10-02');
  assert.equal(extSnapEvt.price, 28.60);

  // Verifica presença da legenda e componentes visuais em trade-simulator.js
  const uiCode = fs.readFileSync(path.join(__dirname, 'trade-simulator.js'), 'utf8');
  assert.ok(uiCode.includes('🛡️ Saída antecipada — Evento Extremo'), 'UI deve exibir a legenda obrigatória no gráfico do snapshot');
  assert.ok(uiCode.includes('EVENTO EXTREMO IDENTIFICADO'), 'UI deve exibir o motivo obrigatório EVENTO EXTREMO IDENTIFICADO');
});
