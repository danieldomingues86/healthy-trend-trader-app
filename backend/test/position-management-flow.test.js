const test = require('node:test');
const assert = require('node:assert/strict');
const database = require('../src/database');
const { recordPositionEvent } = require('../src/trades');

test('fluxo de eventos preserva entrada, registra parcial manual, Free Roll e fechamento do Runner', async () => {
  const original = database.transaction;
  const trade = { id: 'a32f72d0-7c8b-4858-bf18-299598822335', status: 'open', executed_quantity: 1000,
    execution_price: 50, entry_price: 50, stop_price: 45, direction: 'long' };
  const history = [{ type: 'entry', qty: 1000, price: 50, stop: 45, context: {} }];
  const client = { query: async (sql, values) => {
    if (sql.includes('FROM app.trades') && sql.includes('FOR UPDATE')) return { rowCount: 1, rows: [{ ...trade }] };
    if (sql.includes('COALESCE(SUM(quantity)')) return { rows: [{ total: history.filter(e => ['peeloff', 'close'].includes(e.type)).reduce((n, e) => n + e.qty, 0) }] };
    if (sql.includes('FROM app.trade_events') && sql.includes('ORDER BY')) return { rows: history.map(e => ({ ...e })) };
    if (sql.includes('FROM app.risk_policies')) return { rows: [{ policy: { sellIntoStrength: { enabled: true, startR: 2, endR: 3, suggestedPercent: 50 } } }] };
    if (sql.includes('INSERT INTO app.trade_events')) {
      history.push({ type: values[2], qty: values[3], price: values[4], stop: values[5], context: JSON.parse(values[8]) });
      return { rowCount: 1 };
    }
    if (sql.includes('UPDATE app.trades')) {
      if (sql.includes('stop_price')) trade.stop_price = values[2];
      if (sql.includes("status = 'closed'")) trade.status = 'closed';
      return { rowCount: 1 };
    }
    throw new Error(`Unexpected query: ${sql}`);
  } };
  database.transaction = async work => work(client);
  try {
    const update = await recordPositionEvent('user', trade.id, 'update', { price: 62.5, stop: 45 });
    assert.deepEqual(update.context.milestones, ['2R']);
    const partial = await recordPositionEvent('user', trade.id, 'peeloff', { qty: 500, price: 62.5, source: 'sell_into_strength' });
    assert.equal(partial.context.rAtExit, 2.5);
    assert.equal(partial.context.partialProfit, 6250);
    assert.equal(partial.context.freeRollActive, false);
    assert.equal(partial.remaining, 500);
    const trailing = await recordPositionEvent('user', trade.id, 'update', { price: 62.5, stop: 52 });
    assert.equal(trailing.context.freeRollActivated, true);
    assert.ok(trailing.context.freeRollCoverage > 1);
    const second = await recordPositionEvent('user', trade.id, 'peeloff', { qty: 100, price: 70, source: 'sell_into_strength' });
    assert.equal(second.remaining, 400);
    assert.equal(second.context.totalRealizedProfit, 8250);
    const close = await recordPositionEvent('user', trade.id, 'close', { qty: 400, price: 80 });
    assert.equal(close.status, 'closed');
    assert.equal(close.context.runnerProfit, 12000);
    assert.equal(history[0].qty, 1000);
    assert.equal(history[0].price, 50);
    assert.equal(history[0].stop, 45);
    assert.equal(history.filter(e => e.type === 'peeloff').length, 2);
  } finally { database.transaction = original; }
});

test('API rejeita Sell Into Strength fora da zona e parcial que zeraria Runner', async () => {
  const original = database.transaction;
  const id = 'c4eb99a4-1c1b-46e3-9d29-3243ff988aa3';
  database.transaction = async work => work({ query: async sql => {
    if (sql.includes('FROM app.trades')) return { rowCount: 1, rows: [{ id, status: 'open', executed_quantity: 2, execution_price: 50, entry_price: 50, stop_price: 45, direction: 'long' }] };
    if (sql.includes('COALESCE(SUM(quantity)')) return { rows: [{ total: 0 }] };
    if (sql.includes('ORDER BY')) return { rows: [{ type: 'entry', qty: 2, price: 50, stop: 45, context: {} }] };
    if (sql.includes('FROM app.risk_policies')) return { rows: [{ policy: null }] };
    throw new Error('Não deve inserir evento inválido.');
  } });
  try {
    await assert.rejects(recordPositionEvent('user', id, 'peeloff', { qty: 2, price: 62.5, source: 'sell_into_strength' }), /encerramento/);
    await assert.rejects(recordPositionEvent('user', id, 'peeloff', { qty: 1, price: 55, source: 'sell_into_strength' }), /zona configurada/);
  } finally { database.transaction = original; }
});
