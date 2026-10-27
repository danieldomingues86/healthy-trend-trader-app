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
    assert.equal(res.stats.executedEntriesCount, 32);
    assert.equal(res.stats.waitingCount, 6);
    assert.equal(res.stats.totalR, 26.1);
    assert.equal(res.stats.avgR, 0.93);
    assert.ok(res.auditReport, 'Deve incluir relatório de auditoria');
    assert.equal(res.auditReport.isConsistent, true);
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
      grade: 'A',
      sector: 'Petróleo e Gás',
      signalDate: '2026-10-23',
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
    assert.equal(resPyramid.comparison.scenarios.length, 5);

    // Verifica que simulações têm managementScenario PYRAMID_1R_2R
    assert.equal(resPyramid.simulations[0].managementScenario, 'PYRAMID_1R_2R');

    // Reset com cenário PARTIAL_50_2R_EMA9
    const resPart50 = await tradeSimulator.reset('user-1', { scenario: 'PARTIAL_50_2R_EMA9' });
    assert.equal(resPart50.simulations[0].managementScenario, 'PARTIAL_50_2R_EMA9');

    // 2. Endpoint compare
    const cmp = await tradeSimulator.compare('user-1');
    assert.ok(cmp.comparison);
    assert.equal(cmp.comparison.scenarios.length, 5);
    const scen2R = cmp.comparison.scenarios.find(s => s.id === '2R');
    const scen25R = cmp.comparison.scenarios.find(s => s.id === '2.5R');
    const scenPyr = cmp.comparison.scenarios.find(s => s.id === 'PYRAMID_1R_2R');
    const scenPart50 = cmp.comparison.scenarios.find(s => s.id === 'PARTIAL_50_2R_EMA9');
    const scenPart80 = cmp.comparison.scenarios.find(s => s.id === 'PARTIAL_80_2R_EMA9');
    assert.ok(scen2R && scen25R && scenPyr && scenPart50 && scenPart80);
    assert.equal(scen2R.totalTrades, 42);
    assert.equal(scen25R.totalTrades, 42);
    assert.equal(scenPyr.totalTrades, 42);
    assert.equal(scenPart50.totalTrades, 42);
    assert.equal(scenPart80.totalTrades, 42);
  } finally {
    database.query = originalQuery;
  }
});

test('tradeSimulator backend: list e compareHypothesis retornam hipótese do Double Inside Bar', async () => {
  const originalQuery = database.query;
  database.query = async () => ({ rows: [] }); // Simula banco sem simulações (usa seeds calibradas)

  try {
    const listData = await tradeSimulator.list('user-test');
    assert.ok(listData.hypothesisComparison, 'list deve incluir hypothesisComparison');
    assert.ok(listData.hypothesisComparison.simple);
    assert.ok(listData.hypothesisComparison.double);
    assert.equal(listData.hypothesisComparison.double.triggerName, 'Double Inside Bar');
    assert.ok(listData.hypothesisComparison.diff);

    const hypData = await tradeSimulator.compareHypothesis('user-test');
    assert.ok(hypData.hypothesisComparison);
    assert.equal(hypData.hypothesisComparison.double.triggerName, 'Double Inside Bar');
    assert.ok(hypData.hypothesisComparison.crossContext.byRsTier);
    assert.ok(hypData.hypothesisComparison.crossContext.byMarketCycle);
    assert.ok(hypData.hypothesisComparison.crossContext.bySuperTrend);
    assert.ok(hypData.hypothesisComparison.crossContext.byVolatility);
    assert.match(hypData.hypothesisComparison.hypothesisStatus.betSizingRule, /INALTERADO/);
  } finally {
    database.query = originalQuery;
  }
});

test('tradeSimulator backend: generateMass gera lote de trades em escala e armazena no banco', async () => {
  const originalQuery = database.query;
  const store = [];

  database.query = async (sql, values) => {
    if (sql.includes('DELETE FROM app.trade_simulations')) {
      store.length = 0;
      return { rows: [] };
    }
    if (sql.includes('INSERT INTO app.trade_simulations')) {
      // Divide parâmetros por 30 (inclui market_cycle, market_permission, rs_score, simulation_mode, rule_version)
      const numRows = values.length / 30;
      for (let i = 0; i < numRows; i++) {
        const offset = i * 30;
        store.push({
          id: values[offset],
          user_id: values[offset + 1],
          symbol: values[offset + 2],
          trigger_name: values[offset + 4],
          status: values[offset + 10],
          result_r: values[offset + 18],
          market_cycle: values[offset + 25],
          market_permission: values[offset + 26],
          rs_score: values[offset + 27],
          simulation_mode: values[offset + 28],
          rule_version: values[offset + 29]
        });
      }
      return { rows: store };
    }
    return { rows: [] };
  };

  try {
    const res = await tradeSimulator.generateMass('user-test-scale', {
      period: 120,
      universe: 'IBOV',
      triggers: 'ALL',
      grades: 'ALL',
      targetVolume: 50,
      scenario: '2R'
    });

    assert.ok(res.simulations.length > 0, 'Deve gerar simulações');
    assert.ok(res.stats, 'Deve retornar stats calculadas');
    assert.ok(res.meta, 'Deve retornar metadados da execução');
    assert.equal(res.meta.universe, 'IBOV');
    assert.equal(res.meta.scenario, '2R');
    assert.ok(store.length > 0, 'Simulações devem ter sido gravadas no banco');
    assert.equal(store.length, res.simulations.length);

    // Teste de 12 meses (365 dias): deve cobrir o horizonte anual e respeitar o target
    const res12m = await tradeSimulator.generateMass('user-test-scale', {
      period: 365,
      universe: 'IBOV',
      targetVolume: 100,
      scenario: '2R'
    });
    assert.ok(res12m.simulations.length >= 100, 'Deve conter a amostra solicitada de 100 trades');
    assert.equal(res12m.meta.executedCount, 100, 'Meta de 100 executados deve ser atingida');
    const executedSims = res12m.simulations.filter(s => s.status === 'IN_OPERATION' || s.status === 'CLOSED_GAIN' || s.status === 'CLOSED_LOSS');
    assert.equal(executedSims.length, 100);
    const sortedDates = executedSims.map(s => s.signalDate).sort();
    assert.ok(sortedDates[0].startsWith('2025-'), 'Trade mais antigo deve ser de 2025 (início dos 12 meses)');
    assert.ok(sortedDates[sortedDates.length - 1] > sortedDates[0], 'Trade mais recente deve ser posterior ao mais antigo');
  } finally {
    database.query = originalQuery;
  }
});

test('tradeSimulator backend: buildSnapshot usa histórico real injetado e nunca sintetiza candles', async () => {
  const model = require('../../frontend/trade-simulator-model');
  const dates = [];
  const d = new Date('2026-03-02T12:00:00Z');
  while (dates.length < 50) {
    const iso = d.toISOString().slice(0, 10);
    if (model.isTradingDay(iso)) dates.push(iso);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  const rows = [];
  for (let i = 0; i < 40; i++) { const b = 20 + i * 0.3; rows.push([b - 0.1, b + 0.4, b - 0.35, b + 0.15]); }
  rows.push([31.9, 32.3, 31.4, 32.0], [32.0, 32.2, 30.8, 31.6], [31.5, 32.6, 31.1, 32.5], [32.4, 32.9, 32.2, 32.8], [32.8, 34.0, 32.7, 33.9]);
  const history = rows.map((r, i) => ({ time: dates[i], open: r[0], high: r[1], low: r[2], close: r[3], volume: 1 }));
  const histories = new Map([['TEST3', history]]);

  const sim = {
    id: 'sim-x', symbol: 'test3', triggerName: '1-2-3 de Compra', signalDate: dates[42],
    entryPrice: 32.61, stopLoss: 30.79, status: 'WAITING_ENTRY'
  };
  const { snapshot } = await tradeSimulator.buildSnapshot('user-1', { simulation: sim }, { histories, source: 'fixture' });
  assert.equal(snapshot.available, true);
  assert.equal(snapshot.symbol, 'TEST3');
  assert.equal(snapshot.timeframe, '1D');
  assert.equal(snapshot.source, 'fixture');
  assert.equal(snapshot.verification.status, 'VERIFIED');
  assert.deepEqual(snapshot.patternMarkers.map(m => m.role), ['1', '2', '3']);

  // Ativo sem histórico: indisponível, sem candles
  const none = await tradeSimulator.buildSnapshot('user-1', { simulation: { ...sim, symbol: 'SEMDADOS9' } }, { histories });
  assert.equal(none.snapshot.available, false);
  assert.equal(none.snapshot.reason, 'NO_HISTORY');
  assert.equal(none.snapshot.candles, undefined);

  await assert.rejects(() => tradeSimulator.buildSnapshot(null, { simulation: sim }), /não autenticado/);
  await assert.rejects(() => tradeSimulator.buildSnapshot('user-1', {}), /inválida/);
});

test('tradeSimulator backend: snapshot do PRIO3 em 28/09/2026 reproduz o 1-2-3 real do histórico B3 (quando o cache existe)', async (t) => {
  let tickerChart;
  try { tickerChart = require('../src/ticker-chart'); } catch { return t.skip('ticker-chart indisponível'); }
  const history = tickerChart.loadB3History().get('PRIO3');
  if (!history || !history.some(c => c.time === '2026-09-28')) return t.skip('histórico real de PRIO3 indisponível');

  const sim = {
    id: 'sim-prio3', symbol: 'PRIO3', triggerName: '1-2-3 de Compra', signalDate: '2026-09-28',
    entryPrice: 62.11, stopLoss: 59.07, status: 'WAITING_ENTRY'
  };
  const { snapshot } = await tradeSimulator.buildSnapshot('user-1', { simulation: sim });
  assert.equal(snapshot.available, true);
  assert.equal(snapshot.verification.status, 'VERIFIED', JSON.stringify(snapshot.verification.checks));
  const byDate = new Map(history.map(c => [c.time, c]));
  snapshot.candles.forEach(c => {
    const real = byDate.get(c.time);
    assert.ok(real);
    assert.equal(c.close, real.close);
    assert.equal(c.low, real.low);
  });
  assert.deepEqual(snapshot.patternMarkers.map(m => m.time), ['2026-09-24', '2026-09-25', '2026-09-28']);
});

test('tradeSimulator backend: list() e create() bloqueiam categoricamente Grade D no Modo Oficial', async () => {
  const fakeDb = {
    async query(sql, params) {
      if (sql.includes('SELECT * FROM app.trade_simulations')) {
        return {
          rows: [
            {
              id: 'sim-a',
              user_id: 'user-1',
              symbol: 'VALE3',
              companyName: 'Vale',
              trigger_name: 'Inside Bar',
              grade: 'A',
              status: 'CLOSED_GAIN',
              signal_date: '2026-09-01',
              entry_date: '2026-09-02',
              exit_date: '2026-09-15',
              entry_price: 60.00,
              stop_loss: 58.00,
              executed_entry_price: 60.00,
              exit_price: 64.00,
              result_r: 2.0,
              rs_score: 88,
              simulation_mode: 'OFFICIAL',
              market_cycle: 'Positivo'
            },
            {
              id: 'sim-d',
              user_id: 'user-1',
              symbol: 'OPCT3',
              companyName: 'OceanPact',
              trigger_name: '1-2-3 de Compra',
              grade: 'D',
              status: 'CLOSED_LOSS',
              signal_date: '2026-09-01',
              entry_date: '2026-09-02',
              exit_date: '2026-09-05',
              entry_price: 10.95,
              stop_loss: 9.85,
              executed_entry_price: 10.95,
              exit_price: 9.85,
              result_r: -1.0,
              rs_score: 90,
              simulation_mode: 'OFFICIAL',
              market_cycle: 'Positivo'
            }
          ]
        };
      }
      return { rows: [] };
    }
  };

  // 1. No Modo Oficial, a listagem deve excluir qualquer simulação Grade D
  const officialRes = await tradeSimulator.list('user-1', fakeDb, { environment: 'OFFICIAL' });
  assert.equal(officialRes.simulations.length, 1);
  assert.equal(officialRes.simulations[0].symbol, 'VALE3');
  assert.equal(officialRes.simulations[0].grade, 'A');
  assert.ok(!officialRes.simulations.some(s => s.grade === 'D'), 'Modo Oficial não pode retornar operações Grade D');

  // 2. No Modo Pesquisa, simulações Grade D são preservadas para análise laboratorial
  const researchRes = await tradeSimulator.list('user-1', fakeDb, { environment: 'RESEARCH' });
  assert.equal(researchRes.simulations.length, 2);
  assert.ok(researchRes.simulations.some(s => s.grade === 'D'));

  // 3. Tentativa de criação no Modo Oficial com Grade D deve ser rejeitada com 422
  await assert.rejects(
    () => tradeSimulator.create('user-1', {
      symbol: 'OPCT3',
      triggerName: '1-2-3 de Compra',
      entryPrice: 10.95,
      stopLoss: 9.85,
      grade: 'D',
      simulationMode: 'OFFICIAL'
    }, fakeDb),
    /GRADE D NÃO É PERMITIDO NO MODO OFICIAL/
  );
});
