const test = require('node:test');
const assert = require('node:assert/strict');
const scaleInModel = require('../../frontend/scale-in-model');
const tradingRubrics = require('../../frontend/trading-rubrics');
const database = require('../src/database');
const { recordPositionEvent, addScaleIn } = require('../src/trades');

const EQUITY = 1000000;
const defaultPolicy = tradingRubrics.DEFAULT_POLICY;

test('Cenário 1: Scale-in permitido (ALLOW) quando atinge gatilho +1R e breakeven', () => {
  const trade = {
    id: 'b1111111-1111-1111-1111-111111111111',
    status: 'open',
    direction: 'long',
    execution_price: 100,
    entry_price: 100,
    stop_price: 101, // stop acima da entrada (breakeven protegido)
    executed_quantity: 100,
    planned_quantity: 100,
    currentPrice: 107, // +1.4R (risco unitário = 5)
    currentStop: 101,
    events: [
      { type: 'entry', qty: 100, price: 100, stop: 95 }
    ]
  };

  const validation = scaleInModel.canExecuteScaleIn({
    trade,
    scaleIn: { price: 107, quantity: 50, stop: 101 },
    equity: EQUITY,
    policy: defaultPolicy,
    openTrades: [trade]
  });

  assert.equal(validation.allowed, true);
  assert.equal(validation.reason, null);
  assert.equal(validation.metrics.currentR >= 1.0, true);
  assert.equal(validation.checks.every(c => c.passed), true);
  assert.equal(validation.metrics.additionNumber, 1);
});

test('Cenário 2: R abaixo do mínimo de +1R bloqueia Scale-In (DENY)', () => {
  const trade = {
    id: 'b2222222-2222-2222-2222-222222222222',
    status: 'open',
    direction: 'long',
    execution_price: 100,
    stop_price: 100,
    executed_quantity: 100,
    currentPrice: 102, // +0.4R apenas (mínimo é +1.0R)
    currentStop: 100,
    events: [
      { type: 'entry', qty: 100, price: 100, stop: 95 }
    ]
  };

  const validation = scaleInModel.canExecuteScaleIn({
    trade,
    scaleIn: { price: 102, quantity: 50, stop: 100 },
    equity: EQUITY,
    policy: defaultPolicy
  });

  assert.equal(validation.allowed, false);
  assert.match(validation.reason, /gatilho mínimo/i);
  const triggerCheck = validation.checks.find(c => c.key === 'trigger');
  assert.equal(triggerCheck.passed, false);
});

test('Cenário 3: Posição com stop antes do breakeven bloqueia Scale-In (DENY)', () => {
  const trade = {
    id: 'b3333333-3333-3333-3333-333333333333',
    status: 'open',
    direction: 'long',
    execution_price: 100,
    stop_price: 97, // stop ainda abaixo da entrada de 100
    executed_quantity: 100,
    currentPrice: 108, // +1.6R
    currentStop: 97,
    events: [
      { type: 'entry', qty: 100, price: 100, stop: 95 }
    ]
  };

  const validation = scaleInModel.canExecuteScaleIn({
    trade,
    scaleIn: { price: 108, quantity: 50, stop: 97 },
    equity: EQUITY,
    policy: defaultPolicy
  });

  assert.equal(validation.allowed, false);
  assert.match(validation.reason, /breakeven/i);
  const beCheck = validation.checks.find(c => c.key === 'breakeven');
  assert.equal(beCheck.passed, false);
});

test('Cenário 4: Heat Máximo do Portfólio excedido bloqueia Scale-In (DENY)', () => {
  const trade = {
    id: 'b4444444-4444-4444-4444-444444444444',
    status: 'open',
    direction: 'long',
    execution_price: 100,
    stop_price: 100,
    executed_quantity: 100,
    currentPrice: 107,
    currentStop: 100,
    events: [{ type: 'entry', qty: 100, price: 100, stop: 95 }]
  };

  // Open trades with existing high risk close to 12.5% max heat
  const existingTrades = [
    {
      id: 'existing-1',
      direction: 'long',
      currentPrice: 100,
      currentStop: 50,
      remainingQty: 2400, // risk = 50 * 2400 = 120,000 (12.0% de heat)
      events: [{ type: 'entry', qty: 2400, price: 100, stop: 50 }]
    }
  ];

  const validation = scaleInModel.canExecuteScaleIn({
    trade,
    // addition of 2000 shares with gap of 5 = 10,000 additional risk (1.0%), total 13.0% > 12.5%
    scaleIn: { price: 107, quantity: 2000, stop: 102 },
    equity: EQUITY,
    policy: defaultPolicy,
    openTrades: [...existingTrades, trade]
  });

  assert.equal(validation.allowed, false);
  assert.match(validation.reason, /Heat Máximo/i);
  const heatCheck = validation.checks.find(c => c.key === 'heat');
  assert.equal(heatCheck.passed, false);
});

test('Cenário 5: Capital Máximo por Trade excedido bloqueia Scale-In (DENY)', () => {
  const trade = {
    id: 'b5555555-5555-5555-5555-555555555555',
    status: 'open',
    direction: 'long',
    execution_price: 100,
    stop_price: 100,
    executed_quantity: 800, // 800 * 100 = 80,000 (limite de 10% é 100,000)
    currentPrice: 106,
    currentStop: 100,
    events: [{ type: 'entry', qty: 800, price: 100, stop: 95 }]
  };

  const validation = scaleInModel.canExecuteScaleIn({
    trade,
    // addition of 300 shares @ 106 = 31,800. Total capital = 80,000 + 31,800 = 111,800 > 100,000
    scaleIn: { price: 106, quantity: 300, stop: 101 },
    equity: EQUITY,
    policy: defaultPolicy
  });

  assert.equal(validation.allowed, false);
  assert.match(validation.reason, /Capital Máximo/i);
  const capCheck = validation.checks.find(c => c.key === 'capital');
  assert.equal(capCheck.passed, false);
});

test('Cenário 6: Limite de 2 adições atingido bloqueia nova adição (DENY)', () => {
  const trade = {
    id: 'b6666666-6666-6666-6666-666666666666',
    status: 'open',
    direction: 'long',
    execution_price: 100,
    stop_price: 105,
    executed_quantity: 100,
    scale_in_count: 2,
    currentPrice: 115,
    currentStop: 105,
    events: [
      { type: 'entry', qty: 100, price: 100, stop: 95 },
      { type: 'scale_in', qty: 50, price: 106, stop: 100 },
      { type: 'scale_in', qty: 50, price: 111, stop: 105 }
    ]
  };

  const validation = scaleInModel.canExecuteScaleIn({
    trade,
    scaleIn: { price: 115, quantity: 20, stop: 108 },
    equity: EQUITY,
    policy: defaultPolicy
  });

  assert.equal(validation.allowed, false);
  assert.match(validation.reason, /adições já atingido/i);
  const addCheck = validation.checks.find(c => c.key === 'additions');
  assert.equal(addCheck.passed, false);
});

test('Cenário 7: Venda parcial após Scale-In usa preço médio ponderado no lucro realizado', async () => {
  const original = database.transaction;
  const tradeId = 'b7777777-7777-7777-7777-777777777777';
  const trade = {
    id: tradeId,
    status: 'open',
    direction: 'long',
    executed_quantity: 100,
    total_quantity: 150,
    average_entry_price: 101.67,
    execution_price: 100,
    entry_price: 100,
    stop_price: 100
  };

  const history = [
    { type: 'entry', qty: 100, price: 100, stop: 95, context: {} },
    { type: 'scale_in', qty: 50, price: 105, stop: 100, context: { additionNumber: 1, averageEntryAfter: 101.67 } }
  ];

  const client = {
    query: async (sql, values) => {
      if (sql.includes('FROM app.trades') && sql.includes('FOR UPDATE')) return { rowCount: 1, rows: [{ ...trade }] };
      if (sql.includes('COALESCE(SUM(quantity)')) return { rows: [{ total: 0 }] };
      if (sql.includes('FROM app.trade_events') && sql.includes('ORDER BY')) return { rows: history.map(e => ({ ...e })) };
      if (sql.includes('FROM app.risk_policies')) return { rows: [{ policy: defaultPolicy }] };
      if (sql.includes('INSERT INTO app.trade_events')) {
        history.push({ type: values[2], qty: values[3], price: values[4], stop: values[5], context: JSON.parse(values[8]) });
        return { rowCount: 1 };
      }
      if (sql.includes('UPDATE app.trades')) return { rowCount: 1 };
      throw new Error(`Unexpected query: ${sql}`);
    }
  };

  database.transaction = async work => work(client);
  try {
    // Peel-off of 50 units @ 110
    const partial = await recordPositionEvent('user', tradeId, 'peeloff', { qty: 50, price: 110 });
    // Total bought = 150. Closed = 50. Remaining = 100.
    assert.equal(partial.remaining, 100);
    // Realized profit on 50 units: (110 - 101.67) * 50 = 416.50
    const expectedProfit = (110 - 101.67) * 50;
    assert.ok(Math.abs(partial.context.partialProfit - expectedProfit) < 0.1);
  } finally {
    database.transaction = original;
  }
});

test('Cenário 8: Fechamento total do trade calcula lucro total e R-múltiplo sem diluição', () => {
  const events = [
    { type: 'entry', qty: 100, price: 100, stop: 95 },
    { type: 'scale_in', qty: 50, price: 105, stop: 100 },
    { type: 'peeloff', qty: 50, price: 110 },
    { type: 'close', qty: 100, price: 115 }
  ];

  const cons = scaleInModel.calculateConsolidatedPosition({
    trade: { execution_price: 100, stop_price: 95, currentPrice: 115, currentStop: 100 },
    events
  });

  // Total bought = 150
  assert.equal(cons.totalEnteredQty, 150);
  assert.equal(cons.remainingQty, 0);
  assert.equal(cons.averageEntryPrice, (100 * 100 + 50 * 105) / 150); // 101.6666...

  // Realized profit = 50 * (110 - 101.6667) + 100 * (115 - 101.6667) = 416.67 + 1333.33 = 1750.00
  assert.ok(Math.abs(cons.realizedProfit - 1750) < 0.5);

  // Initial risk = 100 shares * (100 - 95) = R$ 500
  assert.equal(cons.initialRiskCash, 500);

  // Total R = 1750 / 500 = +3.5R (NOT diluted by scale-in price!)
  assert.ok(Math.abs(cons.totalR - 3.5) < 0.01);
});

test('Cenário 9: Compatibilidade com trades legados sem dados de Scale-In', () => {
  const legacyTrade = {
    id: 'legacy-trade-1',
    status: 'open',
    ticker: 'VALE3',
    direction: 'long',
    entry_price: 60,
    stop_price: 55,
    executed_quantity: 200,
    // Notice: no average_entry_price, no scale_in_count, no total_quantity
    events: [
      { type: 'entry', qty: 200, price: 60, stop: 55 }
    ]
  };

  const info = scaleInModel.initialTradeInfo(legacyTrade);
  assert.equal(info.entry, 60);
  assert.equal(info.initialStop, 55);
  assert.equal(info.initialQty, 200);
  assert.equal(info.scaleInCount, 0);
  assert.equal(info.scaleInEnabled, true);
  assert.equal(info.currentAvgPrice, 60);
  assert.equal(info.remainingQty, 200);

  const cons = scaleInModel.calculateConsolidatedPosition({ trade: legacyTrade });
  assert.equal(cons.averageEntryPrice, 60);
  assert.equal(cons.scaleInCount, 0);
});

test('Cenário 10: Duas adições consecutivas com auditoria completa de preço médio e risco', () => {
  // Step 1: Initial trade
  let trade = {
    id: 'b1010101-1010-1010-1010-101010101010',
    status: 'open',
    direction: 'long',
    execution_price: 100,
    entry_price: 100,
    stop_price: 100, // Breakeven moved
    executed_quantity: 100,
    total_quantity: 100,
    average_entry_price: 100,
    total_allocated_capital: 10000,
    scale_in_count: 0,
    currentPrice: 106, // +1.2R
    currentStop: 100,
    events: [
      { type: 'entry', qty: 100, price: 100, stop: 95 }
    ]
  };

  // First Scale-In: +50 @ 106, stop 100
  const val1 = scaleInModel.canExecuteScaleIn({
    trade,
    scaleIn: { price: 106, quantity: 50, stop: 100 },
    equity: EQUITY,
    policy: defaultPolicy
  });
  assert.equal(val1.allowed, true);
  assert.equal(val1.metrics.newQuantity, 150);
  // (100 * 100 + 50 * 106) / 150 = 15300 / 150 = 102.00
  assert.equal(val1.metrics.newAvgPrice, 102);

  // Update trade state after Scale-In #1
  trade.scale_in_count = 1;
  trade.total_quantity = 150;
  trade.average_entry_price = 102;
  trade.total_allocated_capital = 15300;
  trade.currentPrice = 112; // +2.4R from initial 100
  trade.currentStop = 106; // trailing stop protected
  trade.stop_price = 106;
  trade.events.push({ type: 'scale_in', qty: 50, price: 106, stop: 100, context: { additionNumber: 1, averageEntryAfter: 102 } });

  // Second Scale-In: +50 @ 112, stop 106
  const val2 = scaleInModel.canExecuteScaleIn({
    trade,
    scaleIn: { price: 112, quantity: 50, stop: 106 },
    equity: EQUITY,
    policy: defaultPolicy
  });
  assert.equal(val2.allowed, true);
  assert.equal(val2.metrics.newQuantity, 200);
  // (15300 + 50 * 112) / 200 = (15300 + 5600) / 200 = 20900 / 200 = 104.50
  assert.equal(val2.metrics.newAvgPrice, 104.5);
  assert.equal(val2.metrics.totalCapitalAfter, 20900);

  // Update trade state after Scale-In #2
  trade.scale_in_count = 2;
  trade.total_quantity = 200;
  trade.average_entry_price = 104.5;
  trade.total_allocated_capital = 20900;
  trade.currentPrice = 118;
  trade.events.push({ type: 'scale_in', qty: 50, price: 112, stop: 106, context: { additionNumber: 2, averageEntryAfter: 104.5 } });

  // Third Scale-In attempted: Must be blocked (max 2 additions reached)
  const val3 = scaleInModel.canExecuteScaleIn({
    trade,
    scaleIn: { price: 118, quantity: 20, stop: 112 },
    equity: EQUITY,
    policy: defaultPolicy
  });
  assert.equal(val3.allowed, false);
  assert.match(val3.reason, /adições já atingido/i);
});
