const test = require('node:test');
const assert = require('node:assert/strict');
const database = require('../src/database');
const marketPause = require('../src/market-pause');

const pausePayload = {
  reason: 'Saúde mental / emocional',
  startDate: '2026-09-27',
  expectedReturnDate: '2026-10-04',
  notes: 'Pausa para reciclagem mental e descanso.'
};

test('marketPause: start cria pausa e getActive retorna registro ativo', async () => {
  const original = database.query;
  const queries = [];
  let currentActive = null;

  database.query = async (sql, values) => {
    queries.push({ sql, values });
    if (sql.includes("status = 'active'")) {
      return { rows: currentActive ? [currentActive] : [] };
    }
    if (sql.includes('INSERT INTO app.market_pauses')) {
      currentActive = {
        id: values[0],
        user_id: values[1],
        status: 'active',
        reason: values[2],
        start_date: values[3],
        expected_return_date: values[4],
        notes: values[5],
        created_at: new Date('2026-09-27T10:00:00Z'),
        updated_at: new Date('2026-09-27T10:00:00Z')
      };
      return { rows: [currentActive] };
    }
    if (sql.includes('UPDATE app.market_pauses') && sql.includes("status = 'ended'")) {
      currentActive = {
        ...currentActive,
        status: 'ended',
        ended_at: new Date('2026-09-29T12:00:00Z'),
        end_reflection: values[2]
      };
      return { rows: [currentActive] };
    }
    if (sql.includes('SELECT * FROM app.market_pauses WHERE user_id = $1 ORDER BY created_at DESC')) {
      return { rows: currentActive ? [currentActive] : [] };
    }
    return { rows: [] };
  };

  try {
    // 1. Iniciar pausa
    const active = await marketPause.start('user-42', pausePayload);
    assert.equal(active.userId, 'user-42');
    assert.equal(active.status, 'active');
    assert.equal(active.reason, 'Saúde mental / emocional');
    assert.equal(active.startDate, '2026-09-27');
    assert.equal(active.expectedReturnDate, '2026-10-04');

    // 2. Consultar ativo
    const found = await marketPause.getActive('user-42');
    assert.ok(found);
    assert.equal(found.status, 'active');

    // 3. Encerrar pausa
    const ended = await marketPause.end('user-42', { endReflection: 'Descansado e focado no método.' });
    assert.equal(ended.status, 'ended');
    assert.equal(ended.endReflection, 'Descansado e focado no método.');
    assert.ok(ended.endedAt);

    // 4. Histórico
    const history = await marketPause.getHistory('user-42');
    assert.equal(history.length, 1);
    assert.equal(history[0].status, 'ended');
  } finally {
    database.query = original;
  }
});

test('trades.createPlan bloqueia nova operação se Modo Fora do Mercado estiver ativo', async () => {
  const trades = require('../src/trades');
  const originalTx = database.transaction;
  const plan = { asset: 'WEGE3', market: 'Ações', entry: 50, stop: 48, suggestedQty: 100, executedQty: 100, riskPct: .002, grade: 'B' };

  let pauseActive = true;
  database.transaction = async work => work({
    query: async (sql, values) => {
      if (sql.includes('FROM app.asset_blacklist')) return { rows: [] };
      if (sql.includes('FROM app.market_pauses')) {
        return { rows: pauseActive ? [{ id: 'p-1', user_id: 'user-42', status: 'active', reason: 'Saúde mental', start_date: '2026-09-27', expected_return_date: '2026-10-04' }] : [] };
      }
      if (sql.includes('INSERT INTO app.trades')) {
        return { rows: [{ id: 'trade-1' }] };
      }
      return { rows: [] };
    }
  });

  try {
    // Com pausa ativa, o registro é rejeitado
    await assert.rejects(
      trades.createPlan('user-42', plan),
      /Você está em período de pausa fora do mercado/
    );

    // Quando a pausa é encerrada, o plano é criado com sucesso
    pauseActive = false;
    await trades.createPlan('user-42', plan);
  } finally {
    database.transaction = originalTx;
  }
});

