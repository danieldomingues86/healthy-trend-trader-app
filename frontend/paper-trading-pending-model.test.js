const test = require('node:test');
const assert = require('node:assert/strict');
const PaperTradingPendingModel = require('./paper-trading-pending-model');

test('calculatePendingQuantity calcula corretamente quantidade respeitando lote padrão', () => {
  // R$ 100.000 equity, 0.2% risco = R$ 200 de risco financeiro
  // Entrada 37.80, Stop 36.20 -> Distância = 1.60
  // Qtd teórica = 200 / 1.60 = 125 ações -> Lote de 100 = 100 ações
  const qty = PaperTradingPendingModel.calculatePendingQuantity({
    equity: 100000,
    riskPct: 0.002,
    entry: 37.80,
    stop: 36.20,
    lot: 100
  });
  assert.equal(qty, 100);

  // R$ 500.000 equity, 0.2% risco = R$ 1.000 de risco
  // Distância 1.60 -> 1000 / 1.60 = 625 -> Lote 100 = 600 ações
  const qty2 = PaperTradingPendingModel.calculatePendingQuantity({
    equity: 500000,
    riskPct: 0.002,
    entry: 37.80,
    stop: 36.20,
    lot: 100
  });
  assert.equal(qty2, 600);

  // Parâmetros inválidos retornam 0
  assert.equal(PaperTradingPendingModel.calculatePendingQuantity({ equity: 0, riskPct: 0.002, entry: 10, stop: 9 }), 0);
  assert.equal(PaperTradingPendingModel.calculatePendingQuantity({ equity: 100000, riskPct: 0, entry: 10, stop: 9 }), 0);
  assert.equal(PaperTradingPendingModel.calculatePendingQuantity({ equity: 100000, riskPct: 0.002, entry: 10, stop: 10 }), 0);
});

test('normalizePendingOrderPayload valida e estrutura snapshot imutável', () => {
  const normalized = PaperTradingPendingModel.normalizePendingOrderPayload({
    symbol: ' wege3 ',
    name: 'Weg S.A.',
    entry: '37.80',
    stop: '36.20',
    quantity: '600',
    setup: 'Inside Bar',
    notes: 'Trade de acompanhamento para validar o setup',
    signalDate: '2026-10-16',
    lastPrice: 37.42,
    grade: 'A',
    rubricScore: 92,
    rsScore: 88
  });

  assert.equal(normalized.ticker, 'WEGE3');
  assert.equal(normalized.name, 'Weg S.A.');
  assert.equal(normalized.entry, 37.80);
  assert.equal(normalized.stop, 36.20);
  assert.equal(normalized.quantity, 600);
  assert.equal(normalized.setupTrigger, 'INSIDE_BAR');
  assert.equal(normalized.signalDate, '2026-10-16');
  assert.equal(normalized.validitySessions, 1);
  assert.equal(normalized.snapshotMarketData.signalDate, '2026-10-16');
  assert.equal(normalized.snapshotMarketData.grade, 'A');
  assert.equal(normalized.snapshotMarketData.rsScore, 88);

  // Rejeições
  assert.throws(() => PaperTradingPendingModel.normalizePendingOrderPayload({ symbol: '' }), /Ticker inválido/);
  assert.throws(() => PaperTradingPendingModel.normalizePendingOrderPayload({ symbol: 'PETR4', entry: 0, stop: 10 }), /Preço de entrada deve ser maior que zero/);
  assert.throws(() => PaperTradingPendingModel.normalizePendingOrderPayload({ symbol: 'PETR4', entry: 30, stop: 35 }), /stop inicial deve estar abaixo do preço de entrada/);
  assert.throws(() => PaperTradingPendingModel.normalizePendingOrderPayload({ symbol: 'PETR4', entry: 30, stop: 30 }), /não podem ser iguais/);
  assert.throws(() => PaperTradingPendingModel.normalizePendingOrderPayload({ symbol: 'PETR4', entry: 30, stop: 28, quantity: 0 }), /Quantidade planejada deve ser um número inteiro/);
});

test('verifyPendingOrder: Cenário 1 — Entrada Executada com Sucesso', () => {
  const order = {
    status: 'pending',
    signalDate: '2026-10-16',
    entry_price: 37.80,
    stop_price: 36.20,
    planned_quantity: 600,
    validitySessions: 1
  };

  // No pregão de 2026-10-19:
  // Aberto em 37.50, Máxima 38.40 (rompeu entrada 37.80), Mínima 37.10 (respeitou stop 36.20)
  const candles = [
    { time: '2026-10-16', open: 37.00, high: 37.60, low: 36.80, close: 37.42 },
    { time: '2026-10-19', open: 37.50, high: 38.40, low: 37.10, close: 38.10 }
  ];

  const result = PaperTradingPendingModel.verifyPendingOrder(order, candles);
  assert.equal(result.outcome, 'EXECUTED');
  assert.equal(result.status, 'open');
  assert.equal(result.isExecuted, true);
  assert.equal(result.isDiscarded, false);
  assert.equal(result.executionPrice, 37.80);
  assert.equal(result.executedQuantity, 600);
  assert.equal(result.executedAt, '2026-10-19');
});

test('verifyPendingOrder: Execução com Gap de Alta acima do gatilho', () => {
  const order = {
    status: 'pending',
    signalDate: '2026-10-16',
    entry_price: 37.80,
    stop_price: 36.20,
    planned_quantity: 600,
    validitySessions: 1
  };

  // Abriu em gap a 38.00 (acima de 37.80), máxima 38.50, mínima 37.90
  const candles = [
    { time: '2026-10-16', open: 37.00, high: 37.60, low: 36.80, close: 37.42 },
    { time: '2026-10-19', open: 38.00, high: 38.50, low: 37.90, close: 38.20 }
  ];

  const result = PaperTradingPendingModel.verifyPendingOrder(order, candles);
  assert.equal(result.outcome, 'EXECUTED');
  assert.equal(result.status, 'open');
  assert.equal(result.executionPrice, 38.00); // Executa no preço de abertura do gap
});

test('verifyPendingOrder: Cenário 2 — Entrada Não Executada (Expirada)', () => {
  const order = {
    status: 'pending',
    signalDate: '2026-10-16',
    entry_price: 37.80,
    stop_price: 36.20,
    planned_quantity: 600,
    validitySessions: 1
  };

  // No pregão de 2026-10-19:
  // Máxima foi 37.65 (não atingiu 37.80)
  const candles = [
    { time: '2026-10-16', open: 37.00, high: 37.60, low: 36.80, close: 37.42 },
    { time: '2026-10-19', open: 37.40, high: 37.65, low: 37.00, close: 37.20 }
  ];

  const result = PaperTradingPendingModel.verifyPendingOrder(order, candles);
  assert.equal(result.outcome, 'EXPIRED');
  assert.equal(result.status, 'cancelled');
  assert.equal(result.isExecuted, false);
  assert.equal(result.isDiscarded, true);
  assert.match(result.discardReason, /Validade expirada/);
});

test('verifyPendingOrder: Caso Ambíguo — Conflito de Entrada e Stop no Mesmo Candle', () => {
  const order = {
    status: 'pending',
    signalDate: '2026-10-16',
    entry_price: 37.80,
    stop_price: 36.20,
    planned_quantity: 600,
    validitySessions: 1
  };

  // No pregão de 2026-10-19:
  // Máxima 38.20 (tocou entrada) e Mínima 35.80 (violou stop)
  const candles = [
    { time: '2026-10-16', open: 37.00, high: 37.60, low: 36.80, close: 37.42 },
    { time: '2026-10-19', open: 37.50, high: 38.20, low: 35.80, close: 36.00 }
  ];

  const result = PaperTradingPendingModel.verifyPendingOrder(order, candles);
  assert.equal(result.outcome, 'CONFLICT_SAME_CANDLE');
  assert.equal(result.status, 'cancelled');
  assert.equal(result.isExecuted, false);
  assert.equal(result.isDiscarded, true);
  assert.match(result.discardReason, /Conflito intradiário/);
});

test('verifyPendingOrder: Aguardando fechamento (Sem candle posterior ao sinal)', () => {
  const order = {
    status: 'pending',
    signalDate: '2026-10-16',
    entry_price: 37.80,
    stop_price: 36.20,
    planned_quantity: 600
  };

  // Apenas candle do dia do sinal
  const candles = [
    { time: '2026-10-16', open: 37.00, high: 37.60, low: 36.80, close: 37.42 }
  ];

  const result = PaperTradingPendingModel.verifyPendingOrder(order, candles);
  assert.equal(result.outcome, 'PENDING');
  assert.equal(result.status, 'pending');
});

test('verifyPendingOrder: Idempotência — Ordem já processada não sofre reavaliação', () => {
  const alreadyOpen = {
    status: 'open',
    signalDate: '2026-10-16',
    entry_price: 37.80,
    stop_price: 36.20
  };

  const candles = [
    { time: '2026-10-19', open: 37.50, high: 38.40, low: 37.10, close: 38.10 }
  ];

  const result = PaperTradingPendingModel.verifyPendingOrder(alreadyOpen, candles);
  assert.equal(result.outcome, 'ALREADY_PROCESSED');
  assert.equal(result.status, 'open');
});

test('sanitizePendingMetrics: Isola estritamente métricas de risco e P&L', () => {
  const pendingPosition = {
    status: 'pending',
    entry_price: 37.80,
    stop_price: 36.20,
    planned_quantity: 600
  };

  const metrics = PaperTradingPendingModel.sanitizePendingMetrics(pendingPosition, {
    risk: 960,
    riskPct: 0.2,
    open: 200,
    realized: 50,
    total: 250
  });

  assert.equal(metrics.risk, 0);
  assert.equal(metrics.riskPct, 0);
  assert.equal(metrics.open, 0);
  assert.equal(metrics.realized, 0);
  assert.equal(metrics.total, 0);
  assert.equal(metrics.isPending, true);
  assert.equal(metrics.remaining, 600);
});
