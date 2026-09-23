const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('./courage-challenge-model');

test('calculateActualRisk calcula risco real por unidade, total e percentual do equity', () => {
  const result = Model.calculateActualRisk({
    entryPrice: 35.00,
    initialStop: 33.00,
    quantity: 500,
    equityAtEntry: 200000
  });

  assert.equal(result.riskPerUnit, 2.00);
  assert.equal(result.totalRiskAmount, 1000.00);
  assert.equal(result.actualRiskPct, 0.50);
});

test('evaluateSizingCompliance classifica como COMPLIANT quando dentro da tolerância de ±0.02pp', () => {
  const exact = Model.evaluateSizingCompliance({ targetRiskPct: 0.50, actualRiskPct: 0.50, tolerancePp: 0.02 });
  assert.equal(exact.sizingStatus, 'compliant');
  assert.equal(exact.complianceStatus, 'COMPLIANT');
  assert.equal(exact.isCompliant, true);
  assert.equal(exact.label, 'EXECUÇÃO CORRETA');

  const withinLower = Model.evaluateSizingCompliance({ targetRiskPct: 0.50, actualRiskPct: 0.49, tolerancePp: 0.02 });
  assert.equal(withinLower.sizingStatus, 'compliant');
  assert.equal(withinLower.complianceStatus, 'COMPLIANT');
  assert.equal(withinLower.isCompliant, true);

  const withinUpper = Model.evaluateSizingCompliance({ targetRiskPct: 0.50, actualRiskPct: 0.52, tolerancePp: 0.02 });
  assert.equal(withinUpper.sizingStatus, 'compliant');
  assert.equal(withinUpper.complianceStatus, 'COMPLIANT');
  assert.equal(withinUpper.isCompliant, true);
});

test('evaluateSizingCompliance classifica como UNDER-SIZING quando risco é inferior à tolerância', () => {
  const result = Model.evaluateSizingCompliance({ targetRiskPct: 0.50, actualRiskPct: 0.30, tolerancePp: 0.02 });
  assert.equal(result.sizingStatus, 'under-sizing');
  assert.equal(result.complianceStatus, 'UNDER_SIZING');
  assert.equal(result.isCompliant, false);
  assert.equal(result.policyViolation, false);
  assert.equal(result.label, 'UNDER-SIZING');
  assert.equal(result.deviation, -0.20);
  assert.equal(result.accuracy, 60);
});

test('evaluateSizingCompliance classifica como OVER-SIZING (POLICY VIOLATION) sem premiar excesso', () => {
  const result = Model.evaluateSizingCompliance({ targetRiskPct: 0.50, actualRiskPct: 0.70, tolerancePp: 0.02 });
  assert.equal(result.sizingStatus, 'over-sizing');
  assert.equal(result.complianceStatus, 'OVER_SIZING');
  assert.equal(result.isCompliant, false);
  assert.equal(result.policyViolation, true);
  assert.equal(result.label, 'POLICY VIOLATION');
  assert.equal(result.deviation, 0.20);
  assert.match(result.message, /mais risco do que sua política autorizava/);
});

test('calculateCourageGap gera gap negativo apenas quando o motivo for medo / desconforto', () => {
  const fearGap = Model.calculateCourageGap({ targetRiskPct: 0.50, actualRiskPct: 0.30, differenceReason: 'fear' });
  assert.equal(fearGap, -40);

  const fearTextGap = Model.calculateCourageGap({ targetRiskPct: 0.50, actualRiskPct: 0.30, differenceReason: 'Medo / desconforto com a volatilidade' });
  assert.equal(fearTextGap, -40);

  const heatGap = Model.calculateCourageGap({ targetRiskPct: 0.50, actualRiskPct: 0.30, differenceReason: 'portfolioHeat' });
  assert.equal(heatGap, null);

  const capitalGap = Model.calculateCourageGap({ targetRiskPct: 0.50, actualRiskPct: 0.30, differenceReason: 'capitalLimit' });
  assert.equal(capitalGap, null);
});

test('trade perdedor (-1R) conta como execução correta se o sizing foi respeitado (sem outcome bias)', () => {
  let state = Model.startChallenge(Model.defaultChallengeState());
  const { state: updated, execution } = Model.recordExecution(state, {
    tradeId: 'trade-loss-1',
    ticker: 'VALE3',
    setupGrade: 'A',
    targetRiskPercent: 0.50,
    entryPrice: 60.00,
    initialStop: 58.00,
    actualQuantity: 500,
    equityAtEntry: 200000,
    tradeResultR: -1.0
  });

  assert.equal(execution.complianceStatus, 'COMPLIANT');
  assert.equal(execution.tradeResultR, -1.0);

  const metrics = Model.calculateChallengeMetrics(updated);
  assert.equal(metrics.totalAttempts, 1);
  assert.equal(metrics.correctExecutions, 1);
  assert.equal(metrics.riskCompliancePct, 100);
});

test('20/20 significa 20 execuções corretas: under e over sizing não avançam os slots mas são registrados', () => {
  let state = Model.startChallenge(Model.defaultChallengeState());

  // 13 Compliant (+1 cada)
  for (let i = 1; i <= 13; i++) {
    const res = Model.recordExecution(state, {
      tradeId: 'trade-comp-' + i,
      ticker: 'PETR4',
      setupGrade: 'A',
      targetRiskPercent: 0.50,
      entryPrice: 30,
      initialStop: 29,
      actualQuantity: 1000,
      equityAtEntry: 200000
    });
    state = res.state;
  }

  // 2 Under-sizing por medo (+0 no avanço da meta 20)
  for (let i = 1; i <= 2; i++) {
    const res = Model.recordExecution(state, {
      tradeId: 'trade-fear-' + i,
      ticker: 'BBAS3',
      setupGrade: 'A',
      targetRiskPercent: 0.50,
      entryPrice: 25,
      initialStop: 24,
      actualQuantity: 600,
      equityAtEntry: 200000,
      differenceReason: 'fear'
    });
    state = res.state;
  }

  // 1 Over-sizing (+0 no avanço)
  const overRes = Model.recordExecution(state, {
    tradeId: 'trade-over-1',
    ticker: 'WEGE3',
    setupGrade: 'A',
    targetRiskPercent: 0.50,
    entryPrice: 40,
    initialStop: 39,
    actualQuantity: 1400,
    equityAtEntry: 200000
  });
  state = overRes.state;

  const metrics = Model.calculateChallengeMetrics(state);
  assert.equal(metrics.totalGoal, 20);
  assert.equal(metrics.totalAttempts, 16); // 16 tentativas no total
  assert.equal(metrics.correctExecutions, 13); // 13 corretas
  assert.equal(metrics.compliantCount, 13);
  assert.equal(metrics.underSizingCount, 2);
  assert.equal(metrics.courageGapsCount, 2);
  assert.equal(metrics.overSizingCount, 1);
  assert.equal(metrics.riskCompliancePct, 81); // 13 / 16 = 81%
  assert.equal(metrics.progressPct, 65); // 13 corretas de 20 meta = 65%
  assert.equal(metrics.isCompleted, false);
});

test('ciclo de vida do Desafio Grade A: DRAFT -> ACTIVE -> PAUSED -> ACTIVE -> CANCELLED', () => {
  let state = Model.defaultChallengeState();
  assert.equal(state.status, 'DRAFT');
  assert.equal(Model.isChallengeActive(state), false);

  // Iniciar
  state = Model.startChallenge(state);
  assert.equal(state.status, 'ACTIVE');
  assert.equal(Model.isChallengeActive(state), true);
  assert.ok(state.startedAt);

  // Registrar um trade enquanto ativo
  const tradeActive = Model.recordExecution(state, {
    tradeId: 'trade-act-1',
    ticker: 'ITUB4',
    setupGrade: 'A',
    targetRiskPercent: 0.50,
    entryPrice: 30,
    initialStop: 29,
    actualQuantity: 1000,
    equityAtEntry: 100000
  });
  state = tradeActive.state;
  assert.equal(state.attempts.length, 1);

  // Pausar
  state = Model.pauseChallenge(state);
  assert.equal(state.status, 'PAUSED');
  assert.equal(Model.isChallengeActive(state), false);
  assert.ok(state.pausedAt);

  // Tentativa de trade durante PAUSED não deve ser registrada no desafio
  const tradePaused = Model.recordExecution(state, {
    tradeId: 'trade-paused-1',
    ticker: 'B3SA3',
    setupGrade: 'A',
    targetRiskPercent: 0.50,
    entryPrice: 12,
    initialStop: 11,
    actualQuantity: 500,
    equityAtEntry: 100000
  });
  assert.equal(tradePaused.ignored, true);
  assert.equal(tradePaused.execution, null);
  assert.equal(state.attempts.length, 1); // continua 1

  // Retomar
  state = Model.resumeChallenge(state);
  assert.equal(state.status, 'ACTIVE');
  assert.equal(Model.isChallengeActive(state), true);
  assert.equal(state.pausedAt, null);

  // Cancelar
  state = Model.cancelChallenge(state);
  assert.equal(state.status, 'CANCELLED');
  assert.equal(Model.isChallengeActive(state), false);
  assert.ok(state.cancelledAt);
});

test('snapshot imutável no momento do trade salva todos os parâmetros requeridos', () => {
  let state = Model.startChallenge(Model.defaultChallengeState());
  const policySnap = { maxPortfolioHeat: 6.0, baseRisk: 0.50, equity: 150000 };

  const res = Model.recordExecution(state, {
    tradeId: 'trade-snap-1',
    ticker: 'PRIO3',
    setupGrade: 'A',
    targetRiskPercent: 0.50,
    entryPrice: 45.00,
    initialStop: 42.00,
    plannedQuantity: 250,
    actualQuantity: 250,
    equityAtEntry: 150000,
    tolerancePp: 0.02,
    riskPolicySnapshot: policySnap
  });

  const attempt = res.attempt;
  assert.ok(attempt.attemptId);
  assert.ok(attempt.challengeId);
  assert.ok(attempt.challengeExecutionId);
  assert.equal(attempt.ticker, 'PRIO3');
  assert.equal(attempt.targetRiskPercent, 0.50);
  assert.equal(attempt.actualRiskPercent, 0.50);
  assert.equal(attempt.equityAtEntry, 150000);
  assert.equal(attempt.plannedPositionSize, 250);
  assert.equal(attempt.actualPositionSize, 250);
  assert.equal(attempt.riskTolerance, 0.02);
  assert.equal(attempt.complianceStatus, 'COMPLIANT');
  assert.equal(attempt.policyViolation, false);
  assert.deepEqual(attempt.riskPolicySnapshot, policySnap);
});

test('persiste e atualiza Recompensa, Punição e Prazo sem alterar histórico', () => {
  let state = Model.defaultChallengeState();
  state = Model.updateSettings(state, {
    reward: 'Uma viagem para a praia',
    punishment: 'Doar R$ 500 para instituição beneficente',
    deadline: '2026-12-31'
  });

  assert.equal(state.reward, 'Uma viagem para a praia');
  assert.equal(state.punishment, 'Doar R$ 500 para instituição beneficente');
  assert.equal(state.consequence, 'Doar R$ 500 para instituição beneficente');
  assert.equal(state.deadline, '2026-12-31');
});

test('Modo Desapego e Barreiras: inicialização padrão, alternância e gravação no snapshot', () => {
  let state = Model.defaultChallengeState();
  assert.equal(state.detachmentMode, true);
  assert.ok(Array.isArray(state.barriers));
  assert.ok(state.barriers.includes('Apego ao dinheiro'));

  // Alterar modo e barreiras
  state = Model.setDetachmentMode(false, { getItem: () => JSON.stringify(state), setItem: (k, v) => { state = JSON.parse(v); } });
  assert.equal(state.detachmentMode, false);

  state = Model.setBarriers(['Apego ao dinheiro', 'Under-Sizing'], { getItem: () => JSON.stringify(state), setItem: (k, v) => { state = JSON.parse(v); } });
  assert.deepEqual(state.barriers, ['Apego ao dinheiro', 'Under-Sizing']);

  // Gravar execução com desconforto e modo desapego
  state = Model.startChallenge(state);
  const res = Model.recordExecution(state, {
    tradeId: 'trade-det-1',
    ticker: 'ELET3',
    setupGrade: 'A',
    targetRiskPercent: 0.50,
    entryPrice: 40.00,
    initialStop: 38.00,
    actualQuantity: 250,
    equityAtEntry: 100000,
    detachmentMode: true,
    preTradeDiscomfortLevel: 3
  });

  const attempt = res.attempt;
  assert.equal(attempt.detachmentMode, true);
  assert.equal(attempt.preTradeDiscomfortLevel, 3);
  assert.equal(attempt.financialRiskAmount, 500.00);
});

test('getRecentAttempts retorna as últimas 5 tentativas em ordem', () => {
  let state = Model.startChallenge(Model.defaultChallengeState());
  for (let i = 1; i <= 8; i++) {
    const res = Model.recordExecution(state, {
      tradeId: 'trade-order-' + i,
      ticker: 'ATIVO' + i,
      setupGrade: 'A',
      targetRiskPercent: 0.50,
      entryPrice: 10,
      initialStop: 9,
      actualQuantity: 500,
      equityAtEntry: 100000
    });
    state = res.state;
  }

  const recents = Model.getRecentAttempts(state, 5);
  assert.equal(recents.length, 5);
  assert.equal(recents[0].ticker, 'ATIVO4');
  assert.equal(recents[4].ticker, 'ATIVO8');
});

test('calculateEmotionalEvolution detecta redução de desconforto e aumento de compliance', () => {
  let state = Model.startChallenge(Model.defaultChallengeState());

  // 3 primeiras tentativas com desconforto alto (4) e sob under-sizing (hesitação)
  for (let i = 1; i <= 3; i++) {
    const res = Model.recordExecution(state, {
      tradeId: 'trade-early-' + i,
      ticker: 'EARLY' + i,
      setupGrade: 'A',
      targetRiskPercent: 0.50,
      entryPrice: 20,
      initialStop: 19,
      actualQuantity: 300, // 0.30% under-sizing
      equityAtEntry: 100000,
      preTradeDiscomfortLevel: 4
    });
    state = res.state;
  }

  // 3 últimas tentativas com desconforto baixo (2) e compliant
  for (let i = 1; i <= 3; i++) {
    const res = Model.recordExecution(state, {
      tradeId: 'trade-late-' + i,
      ticker: 'LATE' + i,
      setupGrade: 'A',
      targetRiskPercent: 0.50,
      entryPrice: 20,
      initialStop: 19,
      actualQuantity: 500, // 0.50% compliant
      equityAtEntry: 100000,
      preTradeDiscomfortLevel: 2
    });
    state = res.state;
  }

  const evo = Model.calculateEmotionalEvolution(state);
  assert.equal(evo.hasData, true);
  assert.equal(evo.earlyAvgDiscomfort, 4.0);
  assert.equal(evo.lateAvgDiscomfort, 2.0);
  assert.equal(evo.earlyComplianceRate, 0);
  assert.equal(evo.lateComplianceRate, 100);
  assert.equal(evo.hasImproved, true);
  assert.match(evo.message, /menos desconforto/);
});

test('detectNominalAttachment identifica correlação de Under-Sizing com risco nominal alto', () => {
  let state = Model.startChallenge(Model.defaultChallengeState());

  // Operações de risco financeiro baixo (R$ 500) -> Compliant
  for (let i = 1; i <= 2; i++) {
    const res = Model.recordExecution(state, {
      tradeId: 'trade-low-' + i,
      ticker: 'LOW' + i,
      setupGrade: 'A',
      targetRiskPercent: 0.50,
      entryPrice: 10,
      initialStop: 9,
      actualQuantity: 500, // R$ 500 de risco
      equityAtEntry: 100000
    });
    state = res.state;
  }

  // Operações de risco financeiro alto (R$ 5.000) -> Under-sizing por hesitação
  for (let i = 1; i <= 2; i++) {
    const res = Model.recordExecution(state, {
      tradeId: 'trade-high-' + i,
      ticker: 'HIGH' + i,
      setupGrade: 'A',
      targetRiskPercent: 0.50,
      entryPrice: 100,
      initialStop: 90,
      actualQuantity: 200, // Deveria ser 500 ações (R$ 5.000), executou 200 (R$ 2.000)
      equityAtEntry: 1000000
    });
    state = res.state;
  }

  const nominal = Model.detectNominalAttachment(state);
  assert.equal(nominal.hasPattern, true);
  assert.match(nominal.message, /frequência de Under-Sizing também aumenta/);
});

test('isTradeEligibleForChallenge valida apenas Grade A com desafio ativo', () => {
  const activeState = { status: 'ACTIVE' };
  const pausedState = { status: 'PAUSED' };

  assert.equal(Model.isTradeEligibleForChallenge({ grade: 'A' }, activeState), true);
  assert.equal(Model.isTradeEligibleForChallenge({ setupGrade: 'A' }, activeState), true);
  assert.equal(Model.isTradeEligibleForChallenge({ grade: 'A+' }, activeState), false);
  assert.equal(Model.isTradeEligibleForChallenge({ grade: 'B' }, activeState), false);
  assert.equal(Model.isTradeEligibleForChallenge({ grade: 'C' }, activeState), false);
  assert.equal(Model.isTradeEligibleForChallenge({ grade: 'D' }, activeState), false);
  assert.equal(Model.isTradeEligibleForChallenge({ grade: 'A' }, pausedState), false);
  assert.equal(Model.isTradeEligibleForChallenge(null, activeState), false);
});

test('Desafio Grade A: trades Grade B ou inferiores são rejeitados e não entram no histórico', () => {
  let state = Model.startChallenge(Model.defaultChallengeState());
  const initialAttemptsCount = state.attempts.length;

  const resB = Model.recordExecution(state, {
    tradeId: 'trade-grade-b',
    ticker: 'BBDC4',
    grade: 'B',
    setupGrade: 'B',
    entryPrice: 20,
    initialStop: 19,
    quantity: 100,
    equityAtEntry: 100000
  });

  assert.equal(resB.ignored, true);
  assert.equal(resB.reason, 'GRADE_NOT_ELIGIBLE');
  assert.equal(state.attempts.length, initialAttemptsCount);
});

test('Desafio compara a execução com o risco executável, não com o Risk Budget do Grade', () => {
  const state = Model.startChallenge(Model.defaultChallengeState());
  const result = Model.recordExecution(state, {
    tradeId: 'trade-policy-limited',
    ticker: 'PETR4',
    setupGrade: 'A',
    riskBudgetPercent: 1.00,
    executableRiskPercent: 0.51,
    limitingLayer: 'capital',
    limitingLayerName: 'Limite de capital',
    entryPrice: 100,
    initialStop: 94.90,
    plannedQuantity: 1000,
    actualQuantity: 1000,
    equityAtEntry: 1000000
  });
  assert.equal(result.execution.complianceStatus, 'COMPLIANT');
  assert.equal(result.execution.riskBudgetPercent, 1);
  assert.equal(result.execution.executableRiskPercent, .51);
  assert.equal(result.execution.actualRiskPercent, .51);
  assert.equal(result.execution.limitingLayer, 'capital');
});

test('Desafio Grade A não presume um grade ou score para registros sem avaliação', () => {
  const state = Model.startChallenge(Model.defaultChallengeState());
  const missingGrade = Model.recordExecution(state, {
    tradeId: 'sem-rubric', targetRiskPercent: 0.4, entryPrice: 20,
    initialStop: 19, quantity: 400, equityAtEntry: 100000
  });
  assert.equal(missingGrade.ignored, true);
  assert.equal(missingGrade.reason, 'GRADE_NOT_ELIGIBLE');
  assert.equal(state.attempts.length, 0);
});

test('Desafio Grade A usa o alvo da política e rejeita o grade legado', () => {
  let state = Model.startChallenge(Model.defaultChallengeState());

  // Tentativa 1: Grade A com alvo 0,40% (ex: 400 ações com stop de R$ 1 em conta de 100k = 0,40%)
  const resA = Model.recordExecution(state, {
    tradeId: 'trade-grade-a-1',
    ticker: 'WEGE3',
    grade: 'A',
    setupGrade: 'A',
    targetRiskPercent: 0.40,
    entryPrice: 40,
    initialStop: 39,
    actualQuantity: 400,
    equityAtEntry: 100000
  });
  state = resA.state;

  assert.equal(resA.execution.setupGrade, 'A');
  assert.equal(resA.execution.targetRiskPercent, 0.40);
  assert.equal(resA.execution.actualRiskPercent, 0.40);
  assert.equal(resA.execution.complianceStatus, 'COMPLIANT');

  // Uma execução legada não entra no desafio atual.
  const resAPlus = Model.recordExecution(state, {
    tradeId: 'trade-grade-aplus-1',
    ticker: 'PETR4',
    grade: 'A+',
    setupGrade: 'A+',
    targetRiskPercent: 0.50,
    entryPrice: 35,
    initialStop: 34,
    actualQuantity: 500,
    equityAtEntry: 100000
  });
  assert.equal(resAPlus.ignored, true);
  assert.equal(resAPlus.reason, 'GRADE_NOT_ELIGIBLE');

  const metrics = Model.calculateChallengeMetrics(state);
  assert.equal(metrics.totalAttempts, 1);
  assert.equal(metrics.correctExecutions, 1);
  assert.equal(metrics.riskCompliancePct, 100);
});

test('Desafio Grade A: idempotência estrita por tradeId impede duplicação por retry ou duplo clique', () => {
  let state = Model.startChallenge(Model.defaultChallengeState());

  const payload = {
    tradeId: 'trade-unique-12345',
    ticker: 'VALE3',
    grade: 'A',
    setupGrade: 'A',
    targetRiskPercent: 0.40,
    entryPrice: 60,
    initialStop: 58,
    actualQuantity: 200,
    equityAtEntry: 100000
  };

  // Primeira chamada: registra
  const firstRes = Model.recordExecution(state, payload);
  state = firstRes.state;
  assert.equal(firstRes.isNew, true);
  assert.equal(state.attempts.length, 1);

  // Segunda chamada com mesmo tradeId (simulando duplo clique / re-render / retry)
  const secondRes = Model.recordExecution(state, payload);
  assert.equal(secondRes.isNew, false);
  assert.equal(secondRes.execution.tradeId, 'trade-unique-12345');
  assert.equal(state.attempts.length, 1, 'Não deve duplicar tentativas no Desafio Grade A');
});

test('migração arquiva execuções legadas sem contá-las no novo Desafio Grade A', () => {
  const oldState = {
    status: 'ACTIVE',
    attempts: [
      { tradeId: 'old-aplus', grade: 'A+', complianceStatus: 'COMPLIANT' },
      { tradeId: 'old-a', grade: 'A', complianceStatus: 'COMPLIANT' }
    ]
  };
  const data = new Map([['healthy-trend-a-plus-challenge-v1', JSON.stringify(oldState)]]);
  const storage = {
    getItem: key => data.get(key) || null,
    setItem: (key, value) => data.set(key, value)
  };
  const migrated = Model.loadChallengeState(storage);
  assert.equal(migrated.gradingVersion, 2);
  assert.equal(migrated.legacyAttempts.length, 2);
  assert.deepEqual(migrated.attempts, []);
  assert.equal(Model.calculateChallengeMetrics(migrated).correctExecutions, 0);
  assert.equal(Model.loadChallengeState(storage).legacyAttempts.length, 2);
  const nextCycle = Model.resetChallenge(storage);
  assert.equal(nextCycle.legacyAttempts.length, 2);
  assert.equal(Model.loadChallengeState(storage).legacyAttempts.length, 2);
});
