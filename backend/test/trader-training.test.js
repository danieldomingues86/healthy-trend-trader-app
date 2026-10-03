const test = require('node:test');
const assert = require('node:assert/strict');
const database = require('../src/database');
const traderTraining = require('../src/trader-training');

test('traderTraining: fluxo completo de objetivo ativo, registros e conclusão', async () => {
  const originalQuery = database.query;
  const originalTransaction = database.transaction;

  let goals = [];
  let records = [];

  database.query = async (sql, values) => {
    if (sql.includes('SELECT * FROM app.trader_training_goals') && sql.includes("status = 'active'")) {
      const active = goals.find(g => g.user_id === values[0] && g.status === 'active');
      return { rows: active ? [active] : [] };
    }
    if (sql.includes('SELECT * FROM app.trader_training_goals') && sql.includes('ORDER BY created_at DESC')) {
      return { rows: goals.filter(g => g.user_id === values[0]) };
    }
    if (sql.includes('SELECT * FROM app.trader_training_records') && sql.includes('goal_id = $2')) {
      return { rows: records.filter(r => r.user_id === values[0] && r.goal_id === values[1]) };
    }
    if (sql.includes('INSERT INTO app.trader_training_records')) {
      const record = {
        id: values[0],
        user_id: values[1],
        goal_id: values[2],
        source_ref: values[3],
        record_date: values[4],
        ticker: values[5],
        outcome: values[6],
        r_multiple: values[7],
        assessment: values[8],
        note: values[9],
        created_at: new Date(),
        updated_at: new Date()
      };
      const existingIdx = records.findIndex(r => r.user_id === record.user_id && r.goal_id === record.goal_id && r.source_ref === record.source_ref);
      if (existingIdx >= 0) {
        records[existingIdx] = record;
      } else {
        records.push(record);
      }
      return { rows: [record] };
    }
    if (sql.includes('UPDATE app.trader_training_goals') && sql.includes('extensions = extensions + 1')) {
      const g = goals.find(item => item.id === values[0] && item.user_id === values[1]);
      if (g) {
        g.end_date = values[2];
        g.duration_days = values[3];
        g.extensions = (g.extensions || 0) + 1;
        return { rows: [g] };
      }
    }
    if (sql.includes('UPDATE app.trader_training_goals') && sql.includes('status = $3')) {
      const g = goals.find(item => item.id === values[0] && item.user_id === values[1]);
      if (g) {
        g.status = values[2];
        g.final_adherence = values[3];
        g.completed_at = new Date();
        return { rows: [g] };
      }
    }
    return { rows: [] };
  };

  database.transaction = async (callback) => {
    return callback({
      query: async (sql, values) => {
        if (sql.includes("status = 'active'")) {
          const active = goals.find(g => g.user_id === values[0] && g.status === 'active');
          return { rows: active ? [active] : [] };
        }
        if (sql.includes('UPDATE app.trader_training_goals')) {
          const g = goals.find(item => item.id === values[0] && item.user_id === values[1]);
          if (g) {
            g.status = values[2];
            g.final_adherence = values[3];
            g.completed_at = new Date();
            return { rows: [g] };
          }
        }
        if (sql.includes('INSERT INTO app.trader_training_goals')) {
          const g = {
            id: values[0],
            user_id: values[1],
            catalog_id: values[2],
            title: values[3],
            category: values[4],
            start_date: values[5],
            end_date: values[6],
            duration_days: values[7],
            target_pct: values[8],
            status: 'active',
            extensions: 0,
            created_at: new Date(),
            updated_at: new Date()
          };
          goals.push(g);
          return { rows: [g] };
        }
        return { rows: [] };
      }
    });
  };

  try {
    // 1. Iniciar primeiro objetivo
    const goal = await traderTraining.startGoal('user-1', {
      catalogId: 'exec-trigger',
      durationDays: 21,
      targetPct: 90
    });

    assert.equal(goal.userId, 'user-1');
    assert.equal(goal.status, 'active');
    assert.equal(goal.title, 'Executar o gatilho da operação sempre corretamente.');
    assert.equal(goal.durationDays, 21);

    // 2. Salvar registros de comportamento no Diário
    const res1 = await traderTraining.saveRecord('user-1', {
      sourceRef: 'trade-petr4-1',
      recordDate: '2026-10-03',
      ticker: 'PETR4',
      outcome: 'gain',
      rMultiple: 2.1,
      assessment: 'correct',
      note: 'Gatilho 123 executado perfeitamente.'
    });
    assert.equal(res1.record.ticker, 'PETR4');
    assert.equal(res1.adherence.pct, 100);

    const res2 = await traderTraining.saveRecord('user-1', {
      sourceRef: 'trade-vale3-1',
      recordDate: '2026-10-05',
      ticker: 'VALE3',
      outcome: 'loss',
      rMultiple: -1.0,
      assessment: 'incorrect',
      note: 'Entrada antecipada sem confirmação.'
    });
    assert.equal(res2.adherence.pct, 50); // 1 correta, 1 incorreta = 50%

    // 3. Consultar estado consolidado
    const state = await traderTraining.getState('user-1');
    assert.ok(state.active);
    assert.equal(state.active.title, 'Executar o gatilho da operação sempre corretamente.');
    assert.equal(state.active.records.length, 2);
    assert.equal(state.active.adherence.applicable, 2);

    // 4. Estender o objetivo em 7 dias
    const extended = await traderTraining.extendActiveGoal('user-1', { extraDays: 7 });
    assert.equal(extended.durationDays, 28);
    assert.equal(extended.extensions, 1);

    // 5. Iniciar um segundo objetivo arquiva automaticamente o primeiro
    const secondGoal = await traderTraining.startGoal('user-1', {
      catalogId: 'exec-initial-stop',
      durationDays: 14,
      targetPct: 80
    });
    assert.equal(secondGoal.title, 'Respeitar o stop inicial.');

    const updatedState = await traderTraining.getState('user-1');
    assert.equal(updatedState.active.title, 'Respeitar o stop inicial.');
    assert.ok(updatedState.history.length >= 2);
    assert.ok(updatedState.history.some(g => g.title.includes('Executar o gatilho')));
  } finally {
    database.query = originalQuery;
    database.transaction = originalTransaction;
  }
});
