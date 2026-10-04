const test = require('node:test');
const assert = require('node:assert/strict');
const database = require('../src/database');
const tradeSimulator = require('../src/trade-simulator');

test('tradeSimulator backend: listagem retorna seeds quando banco vazio', async () => {
  const originalQuery = database.query;
  database.query = async (sql) => {
    if (sql.includes('SELECT * FROM app.trade_simulations')) {
      return { rows: [] };
    }
    return { rows: [] };
  };

  try {
    const res = await tradeSimulator.list('test-user-1');
    assert.equal(res.simulations.length, 42);
    assert.equal(res.stats.totalCreated, 42);
    assert.equal(res.stats.executedEntriesCount, 36);
    assert.equal(res.stats.waitingCount, 6);
    assert.equal(res.stats.totalR, 23.4);
    assert.equal(res.stats.avgR, 0.65);
  } finally {
    database.query = originalQuery;
  }
});

test('tradeSimulator backend: criação sempre inicia em WAITING_ENTRY e valida campos', async () => {
  const originalQuery = database.query;
  const store = [];

  database.query = async (sql, values) => {
    if (sql.includes('INSERT INTO app.trade_simulations')) {
      const row = {
        id: values[0],
        user_id: values[1],
        symbol: values[2],
        company_name: values[3],
        trigger_name: values[4],
        grade: values[5],
        sector: values[6],
        signal_date: values[7],
        entry_price: values[8],
        stop_loss: values[9],
        status: values[10],
        timeline: values[11],
        notes: values[12],
        created_at: new Date(),
        updated_at: new Date()
      };
      store.push(row);
      return { rows: [row] };
    }
    if (sql.includes('SELECT * FROM app.trade_simulations WHERE id = $1')) {
      const item = store.find(s => s.id === values[0]);
      return { rows: item ? [item] : [] };
    }
    return { rows: [] };
  };

  try {
    // 1. Erro se ativo ausente
    await assert.rejects(
      () => tradeSimulator.create('user-1', { triggerName: 'Inside Bar', entryPrice: 10, stopLoss: 9 }),
      /Ativo é obrigatório/
    );

    // 2. Erro se preço de entrada inválido
    await assert.rejects(
      () => tradeSimulator.create('user-1', { symbol: 'PETR4', triggerName: 'Inside Bar', entryPrice: 0, stopLoss: 9 }),
      /Preço de entrada inválido/
    );

    // 3. Sucesso: Status SEMPRE inicia em WAITING_ENTRY (regra fundamental)
    const sim = await tradeSimulator.create('user-1', {
      symbol: 'PETR4',
      companyName: 'Petrobras PN',
      triggerName: 'Inside Bar',
      grade: 'A+',
      sector: 'Petróleo e Gás',
      entryPrice: 49.80,
      stopLoss: 48.90
    });

    assert.equal(sim.symbol, 'PETR4');
    assert.equal(sim.status, 'WAITING_ENTRY', 'O status DEVE ser estritamente WAITING_ENTRY ao criar');
    assert.equal(sim.executedEntryPrice, null, 'Não deve ter preço executado no momento da criação');
    assert.ok(sim.timeline.length >= 3);
    assert.equal(sim.timeline[2].type, 'WAITING_ENTRY');
  } finally {
    database.query = originalQuery;
  }
});

test('tradeSimulator backend: update e remoção de simulação', async () => {
  const originalQuery = database.query;
  const store = [{
    id: 'sim-123',
    user_id: 'user-1',
    symbol: 'VALE3',
    trigger_name: '1-2-3 de Compra',
    entry_price: 68.20,
    stop_loss: 66.90,
    status: 'WAITING_ENTRY',
    notes: 'Aguardando rompimento',
    timeline: []
  }];

  database.query = async (sql, values) => {
    if (sql.includes('SELECT * FROM app.trade_simulations WHERE id = $1')) {
      const item = store.find(s => s.id === values[0] && s.user_id === values[1]);
      return { rows: item ? [item] : [] };
    }
    if (sql.includes('UPDATE app.trade_simulations')) {
      const item = store.find(s => s.id === values[0] && s.user_id === values[1]);
      if (item && values[2]) {
        item.notes = values[2];
      }
      return { rows: [item] };
    }
    if (sql.includes('DELETE FROM app.trade_simulations')) {
      const idx = store.findIndex(s => s.id === values[0] && s.user_id === values[1]);
      if (idx >= 0) {
        store.splice(idx, 1);
        return { rows: [{ id: values[0] }] };
      }
      return { rows: [] };
    }
    return { rows: [] };
  };

  try {
    const updated = await tradeSimulator.update('user-1', 'sim-123', { notes: 'Nova observação' });
    assert.equal(updated.notes, 'Nova observação');

    const del = await tradeSimulator.remove('user-1', 'sim-123');
    assert.equal(del.deleted, true);
    assert.equal(store.length, 0);

    // Teste clearAll
    store.push({ id: 'sim-1', user_id: 'user-1' }, { id: 'sim-2', user_id: 'user-1' });
    const cleared = await tradeSimulator.clearAll('user-1');
    assert.equal(cleared.deleted, true);
    assert.deepEqual(cleared.simulations, []);
  } finally {
    database.query = originalQuery;
  }
});

test('tradeSimulator backend: reset aceita cenários de gestão e compare retorna dados comparativos', async () => {
  const originalQuery = database.query;
  const store = [];

  database.query = async (sql, values) => {
    if (sql.includes('DELETE FROM app.trade_simulations')) {
      store.length = 0;
      return { rows: [] };
    }
    if (sql.includes('INSERT INTO app.trade_simulations')) {
      const row = {
        id: values[0],
        user_id: values[1],
        symbol: values[2],
        company_name: values[3],
        trigger_name: values[4],
        grade: values[5],
        sector: values[6],
        signal_date: values[7],
        entry_price: values[8],
        stop_loss: values[9],
        status: values[10],
        executed_entry_price: values[11],
        entry_date: values[12],
        current_stop: values[13],
        current_price: values[14],
        exit_price: values[15],
        exit_date: values[16],
        exit_reason: values[17],
        result_r: values[18],
        mfe_r: values[19],
        mae_r: values[20],
        timeline: values[21],
        notes: values[22],
        management_scenario: values[23],
        scale_in: values[24]
      };
      store.push(row);
      return { rows: [row] };
    }
    if (sql.includes('SELECT * FROM app.trade_simulations')) {
      return { rows: [...store] };
    }
    return { rows: [] };
  };

  try {
    // 1. Reset com cenário PYRAMID_1R_2R
    const resPyramid = await tradeSimulator.reset('user-1', { scenario: 'PYRAMID_1R_2R' });
    assert.equal(resPyramid.simulations.length, 42);
    assert.ok(resPyramid.comparison);
    assert.equal(resPyramid.comparison.scenarios.length, 3);

    // Verifica que simulações têm managementScenario PYRAMID_1R_2R
    assert.equal(resPyramid.simulations[0].managementScenario, 'PYRAMID_1R_2R');

    // 2. Endpoint compare
    const cmp = await tradeSimulator.compare('user-1');
    assert.ok(cmp.comparison);
    assert.equal(cmp.comparison.scenarios.length, 3);
    const scen2R = cmp.comparison.scenarios.find(s => s.id === '2R');
    const scen25R = cmp.comparison.scenarios.find(s => s.id === '2.5R');
    const scenPyr = cmp.comparison.scenarios.find(s => s.id === 'PYRAMID_1R_2R');
    assert.ok(scen2R && scen25R && scenPyr);
    assert.equal(scen2R.totalTrades, 42);
    assert.equal(scen25R.totalTrades, 42);
    assert.equal(scenPyr.totalTrades, 42);
  } finally {
    database.query = originalQuery;
  }
});
