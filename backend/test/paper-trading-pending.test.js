const test = require('node:test');
const assert = require('node:assert/strict');
const pendingModel = require('../../frontend/paper-trading-pending-model');
const tradesModule = require('../src/trades');

test('PaperTradingPendingModel: calculatePendingQuantity calcula quantidade conservadora respeitando risco e lote', () => {
  const equity = 100000;
  const riskPct = 0.002; // 0.2% = R$ 200 de risco
  const entry = 40.0;
  const stop = 38.0; // Distância = R$ 2.00 -> 200 / 2 = 100 ações
  const qty = pendingModel.calculatePendingQuantity({ equity, riskPct, entry, stop, lot: 100 });
  assert.equal(qty, 100);

  // Distância menor: stop 39.0 -> 200 / 1 = 200 ações
  const qty2 = pendingModel.calculatePendingQuantity({ equity, riskPct, entry, stop: 39.0, lot: 100 });
  assert.equal(qty2, 200);

  // Arredondamento para baixo do lote de 100 (ex: 150 ações -> 100)
  const qty3 = pendingModel.calculatePendingQuantity({ equity, riskPct, entry: 40.0, stop: 38.67, lot: 100 });
  assert.equal(qty3, 100);

  // Se o risco permite menos que 1 lote, mas pelo menos 1 unidade
  const qtyFractional = pendingModel.calculatePendingQuantity({ equity: 10000, riskPct: 0.002, entry: 50.0, stop: 48.0, lot: 100 });
  assert.equal(qtyFractional, 10); // 20 / 2 = 10 unidades

  // Dados zerados ou inválidos retornam 0
  assert.equal(pendingModel.calculatePendingQuantity({ equity: 0, riskPct: 0.002, entry: 10, stop: 9 }), 0);
  assert.equal(pendingModel.calculatePendingQuantity({ equity: 100000, riskPct: 0, entry: 10, stop: 9 }), 0);
  assert.equal(pendingModel.calculatePendingQuantity({ equity: 100000, riskPct: 0.002, entry: 10, stop: 10 }), 0);
});

test('PaperTradingPendingModel: normalizePendingOrderPayload valida e sanitiza dados da ordem', () => {
  const payload = {
    symbol: '  prio3 ',
    entry: 42.50,
    stop: 40.10,
    quantity: 300,
    triggerId: '123_compra',
    grade: 'A',
    rubricScore: 92,
    rsScore: 88,
    signalDate: '2026-10-15',
    notes: 'Contração de volatilidade no diário'
  };

  const norm = pendingModel.normalizePendingOrderPayload(payload);
  assert.equal(norm.ticker, 'PRIO3');
  assert.equal(norm.entry, 42.50);
  assert.equal(norm.stop, 40.10);
  assert.equal(norm.quantity, 300);
  assert.equal(norm.setupTrigger, '123_COMPRA');
  assert.equal(norm.setup, '1-2-3 de Compra');
  assert.equal(norm.validitySessions, 1);
  assert.equal(norm.snapshotMarketData.grade, 'A');
  assert.equal(norm.snapshotMarketData.rubricScore, 92);
});

test('PaperTradingPendingModel: normalizePendingOrderPayload rejeita dados incorretos', () => {
  assert.throws(() => pendingModel.normalizePendingOrderPayload({ ticker: 'INVALIDO!', entry: 10, stop: 9, quantity: 100 }), /Ticker inválido/);
  assert.throws(() => pendingModel.normalizePendingOrderPayload({ ticker: 'VALE3', entry: 0, stop: 9, quantity: 100 }), /Preço de entrada/);
  assert.throws(() => pendingModel.normalizePendingOrderPayload({ ticker: 'VALE3', entry: 10, stop: 0, quantity: 100 }), /Stop inicial/);
  assert.throws(() => pendingModel.normalizePendingOrderPayload({ ticker: 'VALE3', entry: 10, stop: 10, quantity: 100 }), /não podem ser iguais/);
  assert.throws(() => pendingModel.normalizePendingOrderPayload({ ticker: 'VALE3', direction: 'long', entry: 10, stop: 11, quantity: 100 }), /stop inicial deve estar abaixo/);
  assert.throws(() => pendingModel.normalizePendingOrderPayload({ ticker: 'VALE3', entry: 10, stop: 9, quantity: 0 }), /Quantidade planejada/);
});

test('PaperTradingPendingModel: verifyPendingOrder Cenário 1 (Executada sem violação de stop)', () => {
  const order = {
    id: 'ord-1',
    status: 'pending',
    signalDate: '2026-10-15',
    entry_price: 42.50,
    stop_price: 40.00,
    planned_quantity: 200,
    validitySessions: 1
  };

  const candles = [
    { date: '2026-10-15', open: 41.0, high: 42.0, low: 40.5, close: 41.8 },
    // Pregão seguinte: rompe entrada (high 43.20) e stop não é atingido (low 41.50)
    { date: '2026-10-16', open: 41.8, high: 43.2, low: 41.5, close: 42.9 }
  ];

  const res = pendingModel.verifyPendingOrder(order, candles);
  assert.equal(res.outcome, 'EXECUTED');
  assert.equal(res.status, 'open');
  assert.equal(res.executionPrice, 42.50);
  assert.equal(res.executedQuantity, 200);
  assert.equal(res.executedAt, '2026-10-16');
});

test('PaperTradingPendingModel: verifyPendingOrder Cenário 2 (Não executada e expira validade)', () => {
  const order = {
    id: 'ord-2',
    status: 'pending',
    signalDate: '2026-10-15',
    entry_price: 42.50,
    stop_price: 40.00,
    planned_quantity: 200,
    validitySessions: 1
  };

  const candles = [
    { date: '2026-10-15', open: 41.0, high: 42.0, low: 40.5, close: 41.8 },
    // Pregão seguinte não atinge entrada (high 42.20 < 42.50)
    { date: '2026-10-16', open: 41.8, high: 42.2, low: 41.0, close: 41.5 }
  ];

  const res = pendingModel.verifyPendingOrder(order, candles);
  assert.equal(res.outcome, 'EXPIRED');
  assert.equal(res.status, 'cancelled');
  assert.match(res.reason, /expirada/i);
});

test('PaperTradingPendingModel: verifyPendingOrder Cenário 3 (Gap de alta na abertura)', () => {
  const order = {
    id: 'ord-3',
    status: 'pending',
    signalDate: '2026-10-15',
    entry_price: 42.50,
    stop_price: 40.00,
    planned_quantity: 200,
    validitySessions: 1
  };

  // Abre com gap acima da entrada em 43.10
  const candles = [
    { date: '2026-10-16', open: 43.10, high: 44.00, low: 42.80, close: 43.50 }
  ];

  const res = pendingModel.verifyPendingOrder(order, candles);
  assert.equal(res.outcome, 'EXECUTED');
  assert.equal(res.status, 'open');
  assert.equal(res.executionPrice, 43.10); // Executa no preço do gap
});

test('PaperTradingPendingModel: verifyPendingOrder Cenário 4 (Conflito intradiário: rompe entrada e stop na mesma barra)', () => {
  const order = {
    id: 'ord-4',
    status: 'pending',
    signalDate: '2026-10-15',
    entry_price: 42.50,
    stop_price: 40.00,
    planned_quantity: 200,
    validitySessions: 1
  };

  // Barra de altíssima volatilidade: high 43.00 (rompe entrada) e low 39.50 (rompe stop)
  const candles = [
    { date: '2026-10-16', open: 41.00, high: 43.00, low: 39.50, close: 40.20 }
  ];

  const res = pendingModel.verifyPendingOrder(order, candles);
  assert.equal(res.outcome, 'CONFLICT_SAME_CANDLE');
  assert.equal(res.status, 'cancelled');
  assert.match(res.reason, /Conflito intradiário/);
});

test('PaperTradingPendingModel: verifyPendingOrder Cenário 5 (Idempotência e ordens já processadas)', () => {
  const order = {
    id: 'ord-5',
    status: 'open'
  };

  const res = pendingModel.verifyPendingOrder(order, [{ date: '2026-10-16', open: 42, high: 43, low: 41, close: 42 }]);
  assert.equal(res.outcome, 'ALREADY_PROCESSED');
  assert.equal(res.status, 'open');
});

test('PaperTradingPendingModel: sanitizePendingMetrics zera risco, Portfolio Heat e P&L', () => {
  const pos = {
    id: 'ord-test',
    status: 'pending',
    isPending: true,
    entry: 30.00,
    initialQty: 500,
    currentPrice: 32.00,
    currentStop: 28.00
  };

  const baseMetrics = {
    remaining: 500,
    totalBought: 500,
    avgEntry: 30.00,
    realized: 1000,
    open: 1000,
    total: 2000,
    risk: 1000,
    riskPct: 1.0,
    partials: 1,
    scaleIns: 0,
    closed: false
  };

  const clean = pendingModel.sanitizePendingMetrics(pos, baseMetrics);
  assert.equal(clean.open, 0);
  assert.equal(clean.realized, 0);
  assert.equal(clean.total, 0);
  assert.equal(clean.risk, 0);
  assert.equal(clean.riskPct, 0);
  assert.equal(clean.partials, 0);
  assert.equal(clean.isPending, true);
});

test('trades module exporta createPendingOrder e verifyPendingOrders', () => {
  assert.equal(typeof tradesModule.createPendingOrder, 'function');
  assert.equal(typeof tradesModule.verifyPendingOrders, 'function');
});
