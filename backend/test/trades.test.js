const test = require('node:test');
const assert = require('node:assert/strict');
const database = require('../src/database');
const { normalizePlan, validateRareTrade, validateMissionRisk, normalizeExecution, normalizePositionEvent, ratingFromValue, deleteTrade } = require('../src/trades');

test('normaliza plano com ticker em caixa alta e contribuições da Rubric', () => {
  const plan = normalizePlan({
    asset: ' wege3 ', entry: 48.3, stop: 45.8, atr: 1.72, suggestedQty: 400,
    executedQty: 400, riskPct: .004, riskBudgetPct: .01, executableRiskPct: .0051,
    limitingLayer: 'capital', limitingLayerName: 'Limite de capital', rubricScore: 97, rubricMaxScore: 100, grade: 'A',
    rubricResponses: { marketCycle: 2 }, rubricContributions: [{ key: 'marketCycle', value: 2, points: 2, weight: 1 }]
  });
  assert.equal(plan.ticker, 'WEGE3');
  assert.equal(plan.contributions[0].rating, 'good');
  assert.equal(plan.contributions[0].maxScore, 2);
  assert.equal(plan.riskPct, .0051);
  assert.equal(plan.metadata.riskBudgetPct, .01);
  assert.equal(plan.metadata.executableRiskPct, .0051);
  assert.equal(plan.metadata.limitingLayer, 'capital');
  assert.equal(plan.metadata.limitingLayerName, 'Limite de capital');
});

test('preserva campos de auditoria do ciclo de mercado e override no metadata', () => {
  const plan = normalizePlan({
    asset: 'HGLG11', entry: 160.5, stop: 155.0, atr: 2.1, suggestedQty: 100,
    executedQty: 100, riskPct: .004, rubricScore: 85, rubricMaxScore: 100, grade: 'B',
    benchmark: 'IFIX', marketBenchmark: 'IFIX', marketType: 'FII',
    marketCycleScore: 68, marketCycleSource: 'AUTO',
    marketCycleSuggested: 'Transição', marketCycleUsed: 'Transição', marketCycleOverride: false
  });
  assert.equal(plan.metadata.benchmark, 'IFIX');
  assert.equal(plan.metadata.marketBenchmark, 'IFIX');
  assert.equal(plan.metadata.marketType, 'FII');
  assert.equal(plan.metadata.marketCycleScore, 68);
  assert.equal(plan.metadata.marketCycleSource, 'AUTO');
  assert.equal(plan.metadata.marketCycleSuggested, 'Transição');
  assert.equal(plan.metadata.marketCycleUsed, 'Transição');
  assert.equal(plan.metadata.marketCycleOverride, false);
});

test('preserva a data efetiva de entrada separada do registro do trade', () => {
  const plan = normalizePlan({
    asset: 'WEGE3', entry: 48.3, stop: 45.8, atr: 1.72, suggestedQty: 400,
    executedQty: 400, riskPct: .001, rubricScore: 8, rubricMaxScore: 10, grade: 'B',
    entryDate: '2026-08-27'
  });
  assert.equal(plan.metadata.entryDate, '2026-08-27');
  assert.equal(plan.entryTimestamp, '2026-08-27T15:00:00.000Z');
});

test('rejeita ticker e quantidade inválidos antes de acessar o banco', () => {
  assert.throws(() => normalizePlan({ asset: 'weg!', entry: 10, stop: 9, suggestedQty: 100, riskPct: .001 }), /Ticker inválido/);
  assert.throws(() => normalizePlan({ asset: 'WEGE3', entry: 10, stop: 9, suggestedQty: 0, riskPct: .001 }), /Quantidade planejada/);
});

test('não aceita o grade legado em novos trades', () => {
  assert.throws(() => normalizePlan({ asset: 'WEGE3', entry: 10, stop: 9, suggestedQty: 100, executedQty: 100, riskPct: .004, grade: 'A+' }), /Grade da Rubric inválido/);
});

test('API recusa Grade A com score alto mas um Quality Gate reprovado', () => {
  const allGood = { trendQuality: 'good', relativeStrength: 'good', volatility: 'good', setupQuality: 'good', fundamentalScore: 'good' };
  const verified = { rubricGrade: 'A', rubricScore: 100, rubricResponses: { ratings: allGood, marketCycleRegime: 'healthy' } };
  assert.doesNotThrow(() => validateRareTrade(verified));
  const failed = { ...verified, rubricScore: 97.8, rubricResponses: { ratings: { ...allGood, fundamentalScore: 'medium' }, marketCycleRegime: 'healthy' } };
  assert.throws(() => validateRareTrade(failed), /Grade A exige/);
  assert.throws(() => validateRareTrade({ ...verified, rubricScore: 97 }), /Grade A exige/);
});

test('converte a escala da tela para os três estados persistidos', () => {
  assert.equal(ratingFromValue(2), 'good');
  assert.equal(ratingFromValue(1), 'medium');
  assert.equal(ratingFromValue(0), 'bad');
});

test('normaliza a confirmação de execução com preço e quantidade efetivos', () => {
  assert.deepEqual(normalizeExecution({ executedQty: 1100, executionPrice: 48.35 }), { quantity: 1100, price: 48.35 });
  assert.throws(() => normalizeExecution({ executedQty: 0, executionPrice: 48.35 }), /Quantidade executada/);
});

test('normaliza eventos de gestão de posição', () => {
  assert.deepEqual(normalizePositionEvent('update', { price: 51.2, stop: 48, atr: 1.5, note: 'Stop protegido.' }), {
    type: 'update', price: 51.2, stop: 48, atr: 1.5, note: 'Stop protegido.'
  });
  assert.deepEqual(normalizePositionEvent('peeloff', { qty: 100, price: 52, note: '' }), {
    type: 'peeloff', quantity: 100, price: 52, note: ''
  });
  assert.throws(() => normalizePositionEvent('close', { qty: 0, price: 52 }), /Quantidade/);
  assert.throws(() => normalizePositionEvent('peeloff', { qty: 1.5, price: 52 }), /inteiro/);
  assert.equal(normalizePositionEvent('peeloff', { qty: 2, price: 52, occurredAt: '2026-09-15T10:30:00-03:00' }).occurredAt, '2026-09-15T13:30:00.000Z');
});

test('normaliza e valida setupTrigger com catálogo oficial dos 5 gatilhos', () => {
  const plan1 = normalizePlan({
    asset: 'PETR4', entry: 38.5, stop: 36.5, atr: 1.2, suggestedQty: 100, executedQty: 100,
    riskPct: .002, grade: 'B', setupTrigger: 'INSIDE_BAR'
  });
  assert.equal(plan1.setupTrigger, 'INSIDE_BAR');
  assert.equal(plan1.setup, 'Inside Bar');

  const plan2 = normalizePlan({
    asset: 'VALE3', entry: 60.0, stop: 58.0, atr: 1.5, suggestedQty: 100, executedQty: 100,
    riskPct: .002, grade: 'B', setupTrigger: '1-2-3 de Compra'
  });
  assert.equal(plan2.setupTrigger, '123_COMPRA');
  assert.equal(plan2.setup, '1-2-3 de Compra');

  assert.throws(() => normalizePlan({
    asset: 'WEGE3', entry: 50, stop: 48, suggestedQty: 100, executedQty: 100,
    riskPct: .002, grade: 'B', setupTrigger: 'GATILHO_INVALIDO'
  }), /Gatilho de entrada inválido/);

  // Trade legado sem setupTrigger: mantém null e não falha
  const legacy = normalizePlan({
    asset: 'ITUB4', entry: 30, stop: 29, suggestedQty: 100, executedQty: 100,
    riskPct: .002, grade: 'B'
  });
  assert.equal(legacy.setupTrigger, null);
});

test('validateMissionRisk: bloqueia trades que excedam o limite de risco da missão ativa', () => {
  const mission = { status: 'ACTIVE', riskPct: 0.001 }; // 0,10%

  // Trade dentro do limite (0.10%)
  const planOk = { riskPct: 0.001 };
  assert.doesNotThrow(() => validateMissionRisk(planOk, mission));

  // Trade com risco dentro da tolerância (+0.02pp, ex: 0.115%)
  const planTol = { riskPct: 0.00115 };
  assert.doesNotThrow(() => validateMissionRisk(planTol, mission));

  // Trade com risco acima do limite (0.20%)
  const planExceeded = { riskPct: 0.0020 };
  assert.throws(() => validateMissionRisk(planExceeded, mission), /Operação bloqueada: o risco \(0,20%\) excede o limite de 0,10%/);

  // Missão parada (STOPPED) não bloqueia
  const stoppedMission = { status: 'STOPPED', riskPct: 0.001 };
  assert.doesNotThrow(() => validateMissionRisk(planExceeded, stoppedMission));

  // Suporte a JSON string e double-stringified JSON
  assert.doesNotThrow(() => validateMissionRisk(planOk, JSON.stringify(mission)));
  assert.doesNotThrow(() => validateMissionRisk(planOk, JSON.stringify(JSON.stringify(mission))));
  assert.throws(() => validateMissionRisk(planExceeded, JSON.stringify(mission)), /Operação bloqueada/);
});

test('deleteTrade: valida UUID do trade e existência no banco', async () => {
  await assert.rejects(() => deleteTrade('user-1', 'invalid-uuid'), /Trade inválido/);

  const original = database.transaction;
  database.transaction = async work => work({
    query: async () => ({ rowCount: 0, rows: [] })
  });
  try {
    await assert.rejects(() => deleteTrade('user-1', '00000000-0000-0000-0000-000000000001'), /Posição não encontrada/);
  } finally {
    database.transaction = original;
  }
});

test('deleteTrade: bloqueia exclusão de trade já encerrado ou com saídas/parciais/scale-in', async () => {
  const original = database.transaction;
  const tradeId = '00000000-0000-0000-0000-000000000001';

  // Cenário 1: status closed
  database.transaction = async work => work({
    query: async sql => {
      if (sql.includes('FROM app.trades')) {
        return {
          rowCount: 1,
          rows: [{ id: tradeId, ticker: 'WEGE3', status: 'closed', events: [], entries: [] }]
        };
      }
      throw new Error(`Unexpected: ${sql}`);
    }
  });
  try {
    await assert.rejects(() => deleteTrade('user-1', tradeId), /Apenas posições em aberto/);
  } finally {
    database.transaction = original;
  }

  // Cenário 2: com peeloff (saída parcial)
  database.transaction = async work => work({
    query: async sql => {
      if (sql.includes('FROM app.trades')) {
        return {
          rowCount: 1,
          rows: [{ id: tradeId, ticker: 'WEGE3', status: 'open', events: [{ type: 'peeloff', qty: 100 }], entries: [] }]
        };
      }
      throw new Error(`Unexpected: ${sql}`);
    }
  });
  try {
    await assert.rejects(() => deleteTrade('user-1', tradeId), /saídas ou parciais já registradas/);
  } finally {
    database.transaction = original;
  }

  // Cenário 3: com scale_in
  database.transaction = async work => work({
    query: async sql => {
      if (sql.includes('FROM app.trades')) {
        return {
          rowCount: 1,
          rows: [{ id: tradeId, ticker: 'WEGE3', status: 'open', scale_in_count: 1, events: [{ type: 'scale_in', qty: 100 }], entries: [] }]
        };
      }
      throw new Error(`Unexpected: ${sql}`);
    }
  });
  try {
    await assert.rejects(() => deleteTrade('user-1', tradeId), /entradas parciais \(scale-ins\)/);
  } finally {
    database.transaction = original;
  }
});

test('deleteTrade: exclui com sucesso posição aberta registrada por engano e retorna metadados', async () => {
  const original = database.transaction;
  const tradeId = 'a1234567-89ab-cdef-0123-456789abcdef';
  const queries = [];

  database.transaction = async work => work({
    query: async (sql, values) => {
      queries.push({ sql, values });
      if (sql.includes('SELECT t.*') && sql.includes('FROM app.trades t')) {
        return {
          rowCount: 1,
          rows: [{
            id: tradeId,
            ticker: 'WEGE3',
            status: 'open',
            scale_in_count: 0,
            metadata: { mode: 'real' },
            events: [{ type: 'entry', qty: 400, price: 48.3 }],
            entries: [{ type: 'INITIAL', qty: 400 }]
          }]
        };
      }
      if (sql.includes('DELETE FROM app.trades')) {
        return { rowCount: 1 };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    }
  });

  try {
    const result = await deleteTrade('user-42', tradeId);
    assert.equal(result.success, true);
    assert.equal(result.deletedId, tradeId);
    assert.equal(result.ticker, 'WEGE3');
    assert.equal(result.mode, 'real');

    const deleteQuery = queries.find(q => q.sql.includes('DELETE FROM app.trades'));
    assert.ok(deleteQuery, 'Deve executar DELETE query');
    assert.deepEqual(deleteQuery.values, [tradeId, 'user-42']);
  } finally {
    database.transaction = original;
  }
});



