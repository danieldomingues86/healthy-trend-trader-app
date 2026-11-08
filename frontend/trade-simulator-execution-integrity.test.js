const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TradeSimulatorModel = require('./trade-simulator-model');

function assertPriceWithinCandle(price, candle, label) {
  assert.ok(candle, `${label}: candle deve existir`);
  assert.ok(Number.isFinite(price), `${label}: preço (${price}) deve ser numérico`);
  const low = Number(candle.low);
  const high = Number(candle.high);
  assert.ok(
    price >= low - 0.015 && price <= high + 0.015,
    `${label}: preço executado (${price}) fora da amplitude negociável do candle ${candle.time || candle.date} [${low}, ${high}]`
  );
}

test('Integridade OHLC 1 — Stop atingido durante o candle (Open >= Stop e Low <= Stop -> executa no Stop)', () => {
  // Exemplo da especificação: Stop = R$ 30,00 | Open = R$ 30,50 | Low = R$ 29,80 -> Execução = R$ 30,00
  const baseSim = {
    id: 'sim-stop-intraday',
    symbol: 'WEGE3',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-09-01',
    entryPrice: 32.00,
    stopLoss: 30.00,
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  };

  const candles = [
    { time: '2026-09-01', open: 31.00, high: 32.00, low: 30.00, close: 31.80 },
    { time: '2026-09-02', open: 31.90, high: 32.40, low: 31.50, close: 32.10 }, // T+1: entrada em 32.00
    { time: '2026-09-03', open: 30.50, high: 30.80, low: 29.80, close: 29.90 }  // Stop em 30.00 dentro da amplitude [29.80, 30.80]
  ];

  const evaluated = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, candles, '2R');
  assert.equal(evaluated.status, TradeSimulatorModel.STATUS.CLOSED_LOSS);
  assert.equal(evaluated.executedEntryPrice, 32.00);
  assert.equal(evaluated.exitDate, '2026-09-03');
  assert.equal(evaluated.exitPrice, 30.00);
  assert.equal(evaluated.resultR, -1.00);
  assertPriceWithinCandle(evaluated.exitPrice, candles[2], 'Stop atingido durante o candle');
});

test('Integridade OHLC 2 — Gap de abertura abaixo do stop (Open < Stop -> executa na abertura Open)', () => {
  // Exemplo da especificação: Stop = R$ 30,00 | Open = R$ 29,50 | Low = R$ 29,00 -> Execução = R$ 29,50
  const baseSim = {
    id: 'sim-stop-gap',
    symbol: 'WEGE3',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-09-01',
    entryPrice: 32.00,
    stopLoss: 30.00,
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  };

  const candles = [
    { time: '2026-09-01', open: 31.00, high: 32.00, low: 30.00, close: 31.80 },
    { time: '2026-09-02', open: 31.90, high: 32.40, low: 31.50, close: 32.10 }, // T+1: entrada em 32.00
    { time: '2026-09-03', open: 29.50, high: 29.90, low: 29.00, close: 29.20 }  // Gap de baixa: abre a 29.50 (< stop 30.00)
  ];

  const evaluated = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, candles, '2R');
  assert.equal(evaluated.status, TradeSimulatorModel.STATUS.CLOSED_LOSS);
  assert.equal(evaluated.exitDate, '2026-09-03');
  assert.equal(evaluated.exitPrice, 29.50, 'Nunca executar em preço melhor que o disponível quando houver gap desfavorável');
  assert.equal(evaluated.resultR, -1.25, '(29.50 - 32.00) / 2.00 = -1.25R');
  assertPriceWithinCandle(evaluated.exitPrice, candles[2], 'Gap de abertura abaixo do stop');
});

test('Integridade OHLC 3 — Alvo atingido durante o candle (Open <= Alvo e High >= Alvo -> executa no Alvo)', () => {
  // Exemplo da especificação: Alvo 2R = R$ 35,00 | Open = R$ 33,00 | High = R$ 35,50 -> Execução = R$ 35,00
  const baseSim = {
    id: 'sim-target-intraday',
    symbol: 'PETR4',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-09-01',
    entryPrice: 31.00,
    stopLoss: 29.00, // 1R = 2.00 -> Alvo 2R = 35.00
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  };

  const candles = [
    { time: '2026-09-01', open: 30.00, high: 31.00, low: 29.00, close: 30.80 },
    { time: '2026-09-02', open: 30.90, high: 32.50, low: 30.50, close: 32.20 }, // T+1: entrada em 31.00
    { time: '2026-09-03', open: 33.00, high: 35.50, low: 32.80, close: 34.80 }  // Alvo 35.00 atingido na amplitude [32.80, 35.50]
  ];

  const evaluated = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, candles, '2R');
  assert.equal(evaluated.status, TradeSimulatorModel.STATUS.CLOSED_GAIN);
  assert.equal(evaluated.exitDate, '2026-09-03');
  assert.equal(evaluated.exitPrice, 35.00);
  assert.equal(evaluated.resultR, 2.00);
  assertPriceWithinCandle(evaluated.exitPrice, candles[2], 'Alvo atingido durante o candle');
});

test('Integridade OHLC 4 — Gap de abertura acima do alvo (Open > Alvo -> executa na abertura Open)', () => {
  // Exemplo da especificação: Alvo 2R = R$ 35,00 | Open = R$ 36,00 | High = R$ 37,00 -> Execução = R$ 36,00
  const baseSim = {
    id: 'sim-target-gap',
    symbol: 'PETR4',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-09-01',
    entryPrice: 31.00,
    stopLoss: 29.00, // 1R = 2.00 -> Alvo 2R = 35.00
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  };

  const candles = [
    { time: '2026-09-01', open: 30.00, high: 31.00, low: 29.00, close: 30.80 },
    { time: '2026-09-02', open: 30.90, high: 32.50, low: 30.50, close: 32.20 }, // T+1: entrada em 31.00
    { time: '2026-09-03', open: 36.00, high: 37.00, low: 35.60, close: 36.50 }  // Gap de alta: abre a 36.00 (> alvo 35.00)
  ];

  const evaluated = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, candles, '2R');
  assert.equal(evaluated.status, TradeSimulatorModel.STATUS.CLOSED_GAIN);
  assert.equal(evaluated.exitDate, '2026-09-03');
  assert.equal(evaluated.exitPrice, 36.00, 'Nunca registrar execução abaixo do alvo quando o mercado abre acima do alvo');
  assert.equal(evaluated.resultR, 2.50, '(36.00 - 31.00) / 2.00 = +2.50R');
  assertPriceWithinCandle(evaluated.exitPrice, candles[2], 'Gap de abertura acima do alvo');
});

test('Integridade OHLC 5 — Alvo não atingido (High < Alvo -> não executa saída no alvo)', () => {
  // Exemplo da especificação: Alvo 2R = R$ 35,00 | Open = R$ 33,00 | High = R$ 34,50 -> Não executa
  const baseSim = {
    id: 'sim-target-not-hit',
    symbol: 'PETR4',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-09-01',
    entryPrice: 31.00,
    stopLoss: 29.00, // 1R = 2.00 -> Alvo 2R = 35.00
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  };

  const candles = [
    { time: '2026-09-01', open: 30.00, high: 31.00, low: 29.00, close: 30.80 },
    { time: '2026-09-02', open: 30.90, high: 32.50, low: 30.50, close: 32.20 },
    { time: '2026-09-03', open: 33.00, high: 34.50, low: 32.50, close: 34.00 } // High 34.50 < Alvo 35.00
  ];

  const evaluated = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, candles, '2R');
  assert.equal(evaluated.status, TradeSimulatorModel.STATUS.IN_OPERATION);
  assert.equal(evaluated.exitPrice, null);
  assert.equal(evaluated.exitDate, null);
  assert.equal(evaluated.resultR, null);
});

test('Integridade OHLC 6 — Stop e alvo atingidos no mesmo candle (ambiguidade intraday -> Stop executa primeiro)', () => {
  // Exemplo da especificação: Stop = R$ 30,00 | Alvo = R$ 35,00 | Low = R$ 29,80 | High = R$ 35,50 -> Executa Stop primeiro
  const baseSim = {
    id: 'sim-intraday-ambiguity',
    symbol: 'VALE3',
    triggerName: '1-2-3 de Compra',
    grade: 'A',
    signalDate: '2026-09-01',
    entryPrice: 32.50,
    stopLoss: 30.00, // 1R = 2.50 -> Alvo 2R = 37.50 (ou com entrada 32.00 e stop 30.00, alvo 2.5R = 35.00)
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  };

  const sim30To35 = {
    ...baseSim,
    entryPrice: 32.00,
    stopLoss: 30.00 // 1R = 2.00 -> Alvo 2.5R = 35.00
  };

  const candles = [
    { time: '2026-09-01', open: 31.00, high: 32.00, low: 30.00, close: 31.80 },
    { time: '2026-09-02', open: 31.90, high: 32.50, low: 31.50, close: 32.20 }, // Entrada em 32.00
    { time: '2026-09-03', open: 32.20, high: 35.50, low: 29.80, close: 34.00 }  // Atinge Low 29.80 (<= 30.00) E High 35.50 (>= 35.00)
  ];

  const evaluated = TradeSimulatorModel.evaluateSimulationOnCandles(sim30To35, candles, '2.5R');
  assert.equal(evaluated.status, TradeSimulatorModel.STATUS.CLOSED_LOSS, 'Deve adotar o cenário conservador: Stop Loss executado primeiro');
  assert.equal(evaluated.exitDate, '2026-09-03');
  assert.equal(evaluated.exitPrice, 30.00);
  assert.equal(evaluated.resultR, -1.00);
  assertPriceWithinCandle(evaluated.exitPrice, candles[2], 'Ambiguidade intraday conservadora');
});

test('Integridade OHLC 7 — Atualização de stop/breakeven no fechamento não executa retroativamente no próprio candle D0', () => {
  // No candle D0, a mínima vai a 29.80 (acima do stop inicial 28.00, mas abaixo do breakeven 30.00) e a máxima atinge +2R (34.00) na parcial,
  // movendo o stop para o breakeven (30.00). Esse novo stop (30.00) NÃO pode ser considerado violado retroativamente em D0 pela mínima 29.80!
  const baseSim = {
    id: 'sim-no-retroactive-be',
    symbol: 'ITUB4',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-09-01',
    entryPrice: 30.00,
    stopLoss: 28.00, // 1R = 2.00, +2R = 34.00
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  };

  const candles = [
    { time: '2026-09-01', open: 29.00, high: 30.00, low: 28.00, close: 29.80 },
    { time: '2026-09-02', open: 29.90, high: 31.00, low: 29.50, close: 30.80 }, // T+1: entrada a 30.00
    { time: '2026-09-03', open: 30.50, high: 34.50, low: 29.80, close: 34.20 }, // D0: Low 29.80 > stop inicial 28.00; High 34.50 atinge parcial 34.00 e sobe stop para 30.00 para D1+
    { time: '2026-09-04', open: 34.00, high: 35.00, low: 30.00, close: 30.20 }  // D1: Low 30.00 toca o novo stop no breakeven (30.00)
  ];

  const evaluated = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, candles, 'PARTIAL_50_2R_EMA10');
  assert.equal(evaluated.status, TradeSimulatorModel.STATUS.CLOSED_GAIN);
  assert.equal(evaluated.partialExit.date, '2026-09-03', 'Parcial executada em D0 (2026-09-03)');
  assert.equal(evaluated.exitDate, '2026-09-04', 'O stop no breakeven só pode ser acionado a partir do candle seguinte D1 (2026-09-04)');
  assert.equal(evaluated.exitPrice, 30.00);
  assert.equal(evaluated.resultR, 1.00, '50% * 2R + 50% * 0R = +1.00R');
});

test('Integridade OHLC 8 — Regra baseada no fechamento (perda da EMA 10) executa na abertura do próximo candle D1', () => {
  const baseSim = {
    id: 'sim-close-rule-next-open',
    symbol: 'RENT3',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-09-01',
    entryPrice: 30.00,
    stopLoss: 28.00, // 1R = 2.00, +2R = 34.00
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  };

  const candles = [
    { time: '2026-09-01', open: 29.80, high: 30.00, low: 28.00, close: 29.90 },
    { time: '2026-09-02', open: 29.90, high: 32.50, low: 29.50, close: 32.40 }, // Entrada a 30.00
    { time: '2026-09-03', open: 32.40, high: 34.50, low: 32.00, close: 34.20 }, // Parcial em 34.00 (+2R), EMA10 sobe para ~31.13
    { time: '2026-09-04', open: 33.80, high: 34.00, low: 30.80, close: 31.00 }, // D0: Fecha a 31.00 abaixo da EMA 10 (decisão após o fechamento)
    { time: '2026-09-08', open: 30.60, high: 31.20, low: 30.20, close: 30.90 }  // D1 (pós-feriado 07/09): Executa na ABERTURA (30.60)
  ];

  const evaluated = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, candles, 'PARTIAL_50_2R_EMA10');
  assert.equal(evaluated.status, TradeSimulatorModel.STATUS.CLOSED_GAIN);
  assert.equal(evaluated.exitDate, '2026-09-08', 'Saída por fechamento de D0 deve executar em D1');
  assert.equal(evaluated.exitPrice, 30.60, 'Preço de execução deve ser a abertura de D1 (30.60), nunca o fechamento de D0 (31.00)');
  assert.equal(evaluated.partialExit.runnerExitPrice, 30.60);
  assert.equal(evaluated.partialExit.runnerExitR, 0.30, '(30.60 - 30.00) / 2.00 = +0.30R');
  assert.equal(evaluated.resultR, 1.15, '0.50 * 2.00R + 0.50 * 0.30R = +1.15R');
  assertPriceWithinCandle(evaluated.exitPrice, candles[4], 'Saída no Open de D1');
});

test('Integridade OHLC 9 — Saídas parciais (50% e 80% no 2R + Média 10) respeitam OHLC em todas as pernas', () => {
  const baseSim = {
    id: 'sim-partial-80',
    symbol: 'TOTS3',
    triggerName: 'PFR de Compra',
    grade: 'A',
    signalDate: '2026-09-01',
    entryPrice: 30.00,
    stopLoss: 28.00, // 1R = 2.00, +2R = 34.00
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  };

  const candles = [
    { time: '2026-09-01', open: 29.50, high: 30.00, low: 28.00, close: 29.80 },
    { time: '2026-09-02', open: 29.90, high: 32.80, low: 29.50, close: 32.50 }, // Entrada a 30.00
    { time: '2026-09-03', open: 34.40, high: 35.00, low: 34.10, close: 34.80 }, // Gap acima de 34.00! Parcial 80% executa no Open 34.40 (+2.20R)
    { time: '2026-09-04', open: 34.50, high: 34.60, low: 30.80, close: 31.00 }, // Fecha sob EMA 10 (~31.20)
    { time: '2026-09-08', open: 31.20, high: 31.50, low: 30.90, close: 31.10 }  // Runner 20% sai na abertura 31.20 (+0.60R)
  ];

  const eval80 = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, candles, 'PARTIAL_80_2R_EMA10');
  assert.equal(eval80.status, TradeSimulatorModel.STATUS.CLOSED_GAIN);
  assert.equal(eval80.partialExit.partialPrice, 34.40, 'Parcial em gap de alta executa na abertura 34.40');
  assertPriceWithinCandle(eval80.partialExit.partialPrice, candles[2], 'Parcial 80% no candle de 2026-09-03');
  assert.equal(eval80.exitDate, '2026-09-08');
  assert.equal(eval80.exitPrice, 31.20);
  assertPriceWithinCandle(eval80.exitPrice, candles[4], 'Runner 20% no candle de 2026-09-08');
  // 80% * 2.20R (1.76R) + 20% * 0.60R (0.12R) = 1.88R
  assert.equal(eval80.resultR, 1.88);
});

test('Integridade OHLC 10 — Piramidagem (1R -> 2R) respeita OHLC na adição, preço médio e saída', () => {
  const baseSim = {
    id: 'sim-pyramid',
    symbol: 'EMBR3',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-09-01',
    entryPrice: 30.00,
    stopLoss: 28.00, // 1R = 2.00 -> +1R = 32.00, +2R = 34.00
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  };

  const candles = [
    { time: '2026-09-01', open: 29.50, high: 30.00, low: 28.00, close: 29.80 },
    { time: '2026-09-02', open: 29.90, high: 31.00, low: 29.50, close: 30.80 }, // Lote 1 entra a 30.00
    { time: '2026-09-03', open: 31.00, high: 32.50, low: 30.80, close: 32.20 }, // Lote 2 adiciona em +1R (32.00), preço médio = 31.00
    { time: '2026-09-04', open: 32.30, high: 34.50, low: 32.00, close: 34.20 }  // Saída total em +2R (34.00)
  ];

  const evalPyr = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, candles, 'PYRAMID_1R_2R');
  assert.equal(evalPyr.status, TradeSimulatorModel.STATUS.CLOSED_GAIN);
  assert.ok(evalPyr.scaleIn && evalPyr.scaleIn.executed);
  assert.equal(evalPyr.scaleIn.price, 32.00);
  assert.equal(evalPyr.scaleIn.averagePrice, 31.00);
  assertPriceWithinCandle(evalPyr.scaleIn.price, candles[2], 'Adição de pirâmide (+1R)');
  assert.equal(evalPyr.exitPrice, 34.00);
  assertPriceWithinCandle(evalPyr.exitPrice, candles[3], 'Saída da pirâmide (+2R)');
  assert.equal(evalPyr.resultR, 3.00);
});

test('Integridade OHLC 11 e 12 — Ausência de candles futuros e ausência de execução sem condição satisfeita', () => {
  const baseSim = {
    id: 'sim-no-future-candles',
    symbol: 'SBSP3',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-09-01',
    entryPrice: 30.00,
    stopLoss: 28.00, // 1R = 2.00, +2R = 34.00
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  };

  // Caso A: Sem candles após o sinal -> permanece WAITING_ENTRY
  const onlySignalCandle = [
    { time: '2026-09-01', open: 29.50, high: 30.00, low: 28.00, close: 29.80 }
  ];
  const resWaiting = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, onlySignalCandle, '2R');
  assert.equal(resWaiting.status, TradeSimulatorModel.STATUS.WAITING_ENTRY);
  assert.equal(resWaiting.executedEntryPrice ?? null, null);
  assert.equal(resWaiting.exitPrice ?? null, null);

  // Caso B: Parcial executada e candle D0 fecha abaixo da EMA 10, mas NÃO existe candle D1 futuro ainda -> permanece IN_OPERATION (incompleto)
  const partialWithoutD1 = [
    { time: '2026-09-01', open: 29.50, high: 30.00, low: 28.00, close: 29.80 },
    { time: '2026-09-02', open: 29.90, high: 32.80, low: 29.50, close: 32.50 }, // Entrada a 30.00
    { time: '2026-09-03', open: 32.50, high: 34.50, low: 32.00, close: 34.20 }, // Parcial em 34.00
    { time: '2026-09-04', open: 33.80, high: 34.00, low: 30.80, close: 31.00 }  // Fecha sob EMA 10, mas é o último candle disponível
  ];
  const resPendingD1 = TradeSimulatorModel.evaluateSimulationOnCandles(baseSim, partialWithoutD1, 'PARTIAL_50_2R_EMA10');
  assert.equal(resPendingD1.status, TradeSimulatorModel.STATUS.IN_OPERATION, 'Não deve fabricar execução em D0 sem a abertura de D1');
  assert.equal(resPendingD1.isIncomplete, true);
  assert.equal(resPendingD1.exitPrice, null);
  assert.equal(resPendingD1.resultR, null);
});

test('Integridade OHLC 13 — Regressão real BPAC11 (02/10/2026 -> 05/10/2026): gap de abertura em T+1 jamais gera preço fora do candle', () => {
  // Reproduz exatamente o caso da imagem reportada pelo usuário em BPAC11:
  // Sinal em 02/10/2026: 1-2-3 de Compra, Entrada Planejada = R$ 66,03, Stop Inicial = R$ 63,06, Risco 1R = R$ 2,97.
  // No pregão seguinte (05/10/2026), BPAC11 abriu em gap de alta: Open = 76.00, High = 84.59, Low = 75.40, Close = 80.89.
  const bpacSim = {
    id: 'sim-bpac11-regression',
    symbol: 'BPAC11',
    triggerName: '1-2-3 de Compra',
    grade: 'B',
    signalDate: '2026-10-02',
    entryPrice: 66.03,
    stopLoss: 63.06,
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY
  };

  const bpacCandles = [
    { time: '2026-09-29', open: 64.10, high: 65.20, low: 63.80, close: 64.80 },
    { time: '2026-09-30', open: 64.80, high: 66.10, low: 64.20, close: 65.10 },
    { time: '2026-10-01', open: 64.28, high: 65.87, low: 63.61, close: 64.94 },
    { time: '2026-10-02', open: 63.24, high: 65.93, low: 63.16, close: 65.62 }, // Sinal (T)
    { time: '2026-10-05', open: 76.00, high: 84.59, low: 75.40, close: 80.89 }, // T+1 com gap de abertura
    { time: '2026-10-06', open: 81.47, high: 82.89, low: 76.81, close: 78.60 }
  ];

  const evaluated = TradeSimulatorModel.evaluateSimulationOnCandles(bpacSim, bpacCandles, '2R');
  assert.equal(evaluated.status, TradeSimulatorModel.STATUS.CLOSED_GAIN);
  assert.equal(evaluated.entryDate, '2026-10-05');
  assert.equal(evaluated.executedEntryPrice, 76.00, 'Entrada em gap de alta deve ocorrer na abertura real (R$ 76,00), nunca em R$ 66,03');
  assert.equal(evaluated.exitDate, '2026-10-05');
  assert.equal(evaluated.exitPrice, 81.94, 'Alvo +2R a partir da entrada real (76.00 + 2 * 2.97 = 81.94) atingido dentro da máxima 84.59');

  // Garantir que tanto a entrada quanto a saída estão estritamente dentro de [Low 75.40, High 84.59]
  assertPriceWithinCandle(evaluated.executedEntryPrice, bpacCandles[4], 'BPAC11 entrada em 2026-10-05');
  assertPriceWithinCandle(evaluated.exitPrice, bpacCandles[4], 'BPAC11 saída em 2026-10-05');

  // Verificar também que o Snapshot valida com status VERIFIED (sem falhas de faixa OHLC)
  const snap = TradeSimulatorModel.buildSimulationSnapshot(evaluated, bpacCandles);
  const entryCheck = snap.verification.checks.find(c => c.id === 'ENTRY_EXECUTION');
  const exitCheck = snap.verification.checks.find(c => c.id === 'EXIT_EVENT');
  assert.equal(entryCheck.level, 'ok');
  assert.equal(exitCheck.level, 'ok');
});

test('Integridade OHLC 14 — Auditoria em escala sobre o histórico real da B3 em todos os cenários de gestão de risco', () => {
  const tickerChart = require('../backend/src/ticker-chart');
  const fullMap = tickerChart.loadB3History();
  if (!fullMap || fullMap.size === 0) return;

  // Selecionar subconjunto representativo de ativos reais da B3 (incluindo BPAC11) para auditoria rápida nas 5 estratégias
  const prioritySymbols = [
    'BPAC11', 'WEGE3', 'VALE3', 'PETR4', 'ITUB4', 'BBDC4', 'BBAS3', 'RENT3',
    'PRIO3', 'RADL3', 'EQTL3', 'SUZB3', 'VIVT3', 'RDOR3', 'LREN3', 'MGLU3',
    'B3SA3', 'EMBR3', 'SBSP3', 'TOTS3', 'ENEV3', 'CSAN3', 'GGBR4', 'JBSS3'
  ];
  const candlesMap = new Map();
  for (const sym of prioritySymbols) {
    if (fullMap.has(sym)) candlesMap.set(sym, fullMap.get(sym));
  }
  if (candlesMap.size < 10) {
    for (const [k, v] of fullMap.entries()) {
      candlesMap.set(k, v);
      if (candlesMap.size >= 20) break;
    }
  }

  const scenarios = ['2R', '2.5R', 'PYRAMID_1R_2R', 'PARTIAL_50_2R_EMA10', 'PARTIAL_80_2R_EMA10'];

  for (const scenario of scenarios) {
    const res = TradeSimulatorModel.generateHistoricalSimulations({
      candlesMap,
      scenario,
      period: '730',
      targetVolume: '100',
      universe: 'B3'
    });

    assert.ok(res.simulations.length > 0, `Cenário ${scenario} deve gerar simulações válidas`);

    for (const sim of res.simulations) {
      const candles = candlesMap.get(sim.symbol) || [];
      if (sim.entryDate && sim.executedEntryPrice != null) {
        const ec = candles.find(c => String(c.time || c.date).slice(0, 10) === sim.entryDate);
        assertPriceWithinCandle(Number(sim.executedEntryPrice), ec, `[${scenario}] ${sim.symbol} entrada em ${sim.entryDate}`);
      }
      if ((sim.status === TradeSimulatorModel.STATUS.CLOSED_GAIN || sim.status === TradeSimulatorModel.STATUS.CLOSED_LOSS) && sim.exitDate && sim.exitPrice != null) {
        const xc = candles.find(c => String(c.time || c.date).slice(0, 10) === sim.exitDate);
        assertPriceWithinCandle(Number(sim.exitPrice), xc, `[${scenario}] ${sim.symbol} saída em ${sim.exitDate}`);
      }
    }
  }
});
