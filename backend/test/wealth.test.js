const test = require('node:test');
const assert = require('node:assert/strict');
const database = require('../src/database');
const { normalizeMovement, normalizeAllocation, adjustEquity, list } = require('../src/wealth');

test('normaliza aporte e retirada sem misturar os dois tipos', () => {
  assert.deepEqual(normalizeMovement({ type: 'deposit', amount: '1500', note: 'Aporte mensal' }).type, 'deposit');
  assert.deepEqual(normalizeMovement({ type: 'withdrawal', amount: 200 }).type, 'withdrawal');
  assert.throws(() => normalizeMovement({ type: 'transfer', amount: 100 }), /Tipo de movimentação/);
});

test('normaliza uma alocação com meta percentual', () => {
  const allocation = normalizeAllocation({ label: 'Trend Following', assetClass: 'Renda variável', amount: '2500', targetPct: '35' });
  assert.equal(allocation.amount, 2500);
  assert.equal(allocation.targetPct, 35);
  assert.throws(() => normalizeAllocation({ label: 'Caixa', assetClass: 'Liquidez', amount: 1, targetPct: 120 }), /Alocação-alvo/);
});

test('adjustEquity: rejeita valores menores ou iguais a zero ou não numéricos', async () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  await assert.rejects(() => adjustEquity(userId, { amount: 0 }), /inválido/);
  await assert.rejects(() => adjustEquity(userId, { amount: -1000 }), /inválido/);
  await assert.rejects(() => adjustEquity(userId, { amount: 'abc' }), /inválido/);
  await assert.rejects(() => adjustEquity(userId, {}), /inválido/);
});

test('adjustEquity: persiste ajuste em wealth_adjustments e atualiza snapshot de real_wealth', async () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const originalTx = database.transaction;
  const queries = [];

  database.transaction = async (fn) => {
    const fakeClient = {
      query: async (sql, params) => {
        queries.push({ sql, params });
        if (sql.includes('SELECT new_amount FROM app.wealth_adjustments')) {
          return { rowCount: 1, rows: [{ new_amount: '1029500' }] };
        }
        if (sql.includes('SELECT amount FROM app.wealth_snapshots')) {
          return { rowCount: 1, rows: [{ amount: '1029500' }] };
        }
        if (sql.includes('INSERT INTO app.wealth_adjustments')) {
          return { rowCount: 1 };
        }
        if (sql.includes('INSERT INTO app.wealth_snapshots')) {
          return { rowCount: 1 };
        }
        return { rowCount: 0, rows: [] };
      }
    };
    return fn(fakeClient);
  };

  try {
    const res = await adjustEquity(userId, { amount: 1100000, reason: 'Atualização de saldo' });
    assert.equal(res.ok, true);
    assert.equal(res.operationalEquity, 1100000);
    assert.equal(res.adjustment.newAmount, 1100000);
    assert.equal(res.adjustment.previousAmount, 1029500);
    assert.equal(res.adjustment.reason, 'Atualização de saldo');

    const insertAdj = queries.find(q => q.sql.includes('INSERT INTO app.wealth_adjustments'));
    assert.ok(insertAdj, 'Deveria inserir em app.wealth_adjustments');
    assert.equal(insertAdj.params[1], userId);
    assert.equal(insertAdj.params[2], 1029500);
    assert.equal(insertAdj.params[3], 1100000);
    assert.equal(insertAdj.params[4], 'Atualização de saldo');

    const insertSnap = queries.find(q => q.sql.includes('INSERT INTO app.wealth_snapshots'));
    assert.ok(insertSnap, 'Deveria atualizar o snapshot em app.wealth_snapshots');
    assert.equal(insertSnap.params[1], userId);
    assert.equal(insertSnap.params[2], 1100000);
  } finally {
    database.transaction = originalTx;
  }
});

test('wealth.list: retorna adjustments e summary com operationalEquity e realWealth sincronizados', async () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const originalQuery = database.query;

  database.query = async (sql, params) => {
    if (sql.includes('FROM app.wealth_movements')) {
      return { rowCount: 0, rows: [] };
    }
    if (sql.includes('FROM app.wealth_allocations')) {
      return { rowCount: 0, rows: [] };
    }
    if (sql.includes('FROM app.trades')) {
      return { rowCount: 0, rows: [] };
    }
    if (sql.includes('FROM app.wealth_snapshots')) {
      return { rowCount: 1, rows: [{ snapshot_type: 'strategy_equity', amount: '1000000', occurred_at: '2026-10-01' }] };
    }
    if (sql.includes('FROM app.wealth_settings')) {
      return { rowCount: 1, rows: [{ strategy_base: '1000000' }] };
    }
    if (sql.includes('FROM app.wealth_adjustments')) {
      return {
        rowCount: 1,
        rows: [{
          id: '22222222-2222-4222-8222-222222222222',
          previous_amount: '1029500',
          new_amount: '1100000',
          reason: 'Conciliação',
          adjusted_at: new Date('2026-10-15T12:00:00Z')
        }]
      };
    }
    return { rowCount: 0, rows: [] };
  };

  try {
    const data = await list(userId);
    assert.equal(data.adjustments.length, 1);
    assert.equal(data.adjustments[0].newAmount, 1100000);
    assert.equal(data.summary.operationalEquity, 1100000);
    assert.equal(data.summary.realWealth, 1100000);
    // strategyEquity permanece intacto (1000000), não distorcendo o método
    assert.equal(data.summary.strategyEquity, 1000000);
  } finally {
    database.query = originalQuery;
  }
});

