(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CourageChallengeModel = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'healthy-trend-a-plus-challenge-v1';
  const DEFAULT_TARGET_GOAL = 20;
  const DEFAULT_TOLERANCE_PP = 0.02; // ±0,02 pontos percentuais (ex: 0,48% a 0,52% para 0,50%)

  const STATUS = {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED'
  };

  const BARRIER_OPTIONS = [
    { key: 'fear_risk', label: 'Medo de assumir o risco planejado' },
    { key: 'money_attachment', label: 'Apego ao dinheiro' },
    { key: 'under_sizing', label: 'Under-Sizing' },
    { key: 'over_sizing', label: 'Over-Sizing / euforia' },
    { key: 'loss_acceptance', label: 'Dificuldade em aceitar perdas' },
    { key: 'other', label: 'Outra' }
  ];

  const DIFFERENCE_REASONS = [
    { key: 'fear', label: 'Medo / desconforto com a volatilidade', affectsCourageGap: true },
    { key: 'liquidity', label: 'Baixa liquidez no book / spread alto', affectsCourageGap: false },
    { key: 'portfolioHeat', label: 'Portfolio Heat atingido', affectsCourageGap: false },
    { key: 'capitalLimit', label: 'Limite de capital operacional', affectsCourageGap: false },
    { key: 'correlation', label: 'Ajuste de correlação de portfólio', affectsCourageGap: false },
    { key: 'eventRisk', label: 'Risco de evento iminente (balanço / Copom)', affectsCourageGap: false },
    { key: 'operationalRule', label: 'Regra operacional específica', affectsCourageGap: false },
    { key: 'other', label: 'Outro motivo operacional', affectsCourageGap: false }
  ];

  function defaultChallengeState() {
    return {
      challengeId: 'challenge-' + Date.now(),
      status: STATUS.DRAFT, // DRAFT | ACTIVE | PAUSED | COMPLETED | CANCELLED
      targetGoal: DEFAULT_TARGET_GOAL,
      targetCompliantExecutions: DEFAULT_TARGET_GOAL,
      tolerancePp: DEFAULT_TOLERANCE_PP,
      detachmentMode: true, // Modo Desapego ON por padrão
      barriers: ['Medo de assumir o risco planejado', 'Apego ao dinheiro'],
      reward: 'Jantar de celebração com a família no melhor restaurante da cidade ao completar 20 execuções perfeitas.',
      punishment: 'Se eu violar o processo por medo ou ganância, doarei R$ 500 para caridade e ficarei 3 dias sem operar.',
      consequence: 'Se eu violar o processo por medo ou ganância, doarei R$ 500 para caridade e ficarei 3 dias sem operar.',
      deadline: '2026-12-31',
      createdAt: new Date().toISOString(),
      startedAt: null,
      pausedAt: null,
      completedAt: null,
      cancelledAt: null,
      attempts: [],
      executions: [], // compatibilidade com views antigas
      celebrationDismissed: false
    };
  }

  function calculateActualRisk({ entryPrice, initialStop, quantity, equityAtEntry }) {
    const entry = Number(entryPrice) || 0;
    const stop = Number(initialStop) || 0;
    const qty = Number(quantity) || 0;
    const equity = Number(equityAtEntry) || 0;

    const riskPerUnit = Math.abs(entry - stop);
    const totalRiskAmount = riskPerUnit * qty;
    const actualRiskPct = equity > 0 ? (totalRiskAmount / equity) * 100 : 0;

    return {
      riskPerUnit,
      totalRiskAmount,
      actualRiskPct: Number(actualRiskPct.toFixed(4))
    };
  }

  function evaluateSizingCompliance({ targetRiskPct, actualRiskPct, tolerancePp = DEFAULT_TOLERANCE_PP }) {
    const target = Number(targetRiskPct) || 0;
    const actual = Number(actualRiskPct) || 0;
    const tol = Number(tolerancePp) >= 0 ? Number(tolerancePp) : DEFAULT_TOLERANCE_PP;

    const deviation = Number((actual - target).toFixed(4));
    const absDeviation = Math.abs(deviation);
    const accuracy = target > 0 ? Math.round((actual / target) * 100) : 100;

    // Se estiver dentro da margem técnica (ex: 0,48% a 0,52% para alvo de 0,50%)
    if (absDeviation <= tol + 0.0001) {
      return {
        sizingStatus: 'compliant',
        complianceStatus: 'COMPLIANT',
        label: 'EXECUÇÃO CORRETA',
        isCompliant: true,
        policyViolation: false,
        deviation,
        accuracy,
        message: 'Você executou exatamente o risco definido pela sua política.'
      };
    }

    if (deviation < -tol) {
      return {
        sizingStatus: 'under-sizing',
        complianceStatus: 'UNDER_SIZING',
        label: 'UNDER-SIZING',
        isCompliant: false,
        policyViolation: false,
        deviation,
        accuracy,
        message: 'Você assumiu menos risco do que sua política determinou.'
      };
    }

    return {
      sizingStatus: 'over-sizing',
      complianceStatus: 'OVER_SIZING',
      label: 'POLICY VIOLATION',
      isCompliant: false,
      policyViolation: true,
      deviation,
      accuracy,
      message: 'Você assumiu mais risco do que sua política autorizava.'
    };
  }

  function calculateCourageGap({ actualRiskPct, targetRiskPct, differenceReason }) {
    const target = Number(targetRiskPct) || 0;
    const actual = Number(actualRiskPct) || 0;
    const isFear = differenceReason === 'fear' || 
                   differenceReason === 'Medo / desconforto' ||
                   (typeof differenceReason === 'string' && differenceReason.toLowerCase().includes('medo'));

    if (isFear && target > 0 && actual < target) {
      const gap = Math.round(((actual / target) - 1) * 100);
      return gap; // Ex: -40%
    }
    return null;
  }

  function calculateDaysRemaining(deadlineStr) {
    if (!deadlineStr) return 0;
    const targetDate = new Date(deadlineStr + 'T23:59:59');
    const now = new Date();
    const diffMs = targetDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  function calculateChallengeMetrics(state) {
    const challenge = state || loadChallengeState();
    const attempts = Array.isArray(challenge.attempts) ? challenge.attempts : 
                     (Array.isArray(challenge.executions) ? challenge.executions : []);
    const totalGoal = challenge.targetCompliantExecutions || challenge.targetGoal || DEFAULT_TARGET_GOAL;
    const totalAttempts = attempts.length;

    const compliantAttempts = attempts.filter(e => 
      e.complianceStatus === 'COMPLIANT' || e.sizingStatus === 'compliant' || e.status === 'compliant'
    );
    const underSizingAttempts = attempts.filter(e => 
      e.complianceStatus === 'UNDER_SIZING' || e.sizingStatus === 'under-sizing' || e.status === 'under-sizing'
    );
    const overSizingAttempts = attempts.filter(e => 
      e.complianceStatus === 'OVER_SIZING' || e.sizingStatus === 'over-sizing' || e.status === 'over-sizing'
    );
    const courageGapsAttempts = attempts.filter(e => e.courageGap !== null && e.courageGap !== undefined);

    const compliantCount = compliantAttempts.length;
    const underSizingCount = underSizingAttempts.length;
    const overSizingCount = overSizingAttempts.length;
    const courageGapsCount = courageGapsAttempts.length;

    const riskCompliancePct = totalAttempts > 0 ? Math.round((compliantCount / totalAttempts) * 100) : 100;
    const progressPct = Math.min(100, Math.round((compliantCount / totalGoal) * 100));
    const daysRemaining = calculateDaysRemaining(challenge.deadline);
    const isCompleted = compliantCount >= totalGoal;

    const latestAttempt = totalAttempts > 0 ? attempts[attempts.length - 1] : null;

    return {
      status: challenge.status || STATUS.DRAFT,
      isActive: challenge.status === STATUS.ACTIVE,
      isPaused: challenge.status === STATUS.PAUSED,
      isDraft: !challenge.status || challenge.status === STATUS.DRAFT,
      isCompleted: isCompleted || challenge.status === STATUS.COMPLETED,
      isCancelled: challenge.status === STATUS.CANCELLED,
      detachmentMode: challenge.detachmentMode !== false,
      barriers: Array.isArray(challenge.barriers) ? challenge.barriers : ['Medo de assumir o risco planejado', 'Apego ao dinheiro'],
      totalGoal,
      targetCompliantExecutions: totalGoal,
      totalAttempts,
      totalExecutions: totalAttempts, // alias para retrocompatibilidade
      correctExecutions: compliantCount,
      compliantCount,
      underSizingCount,
      overSizingCount,
      courageGapsCount,
      riskCompliancePct,
      complianceRate: riskCompliancePct,
      accuracyRate: riskCompliancePct,
      completedPct: progressPct,
      progressPct,
      daysRemaining,
      latestExecution: latestAttempt,
      latestAttempt,
      compliantAttempts
    };
  }

  function loadChallengeState(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
    if (!storage) return defaultChallengeState();
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return defaultChallengeState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return defaultChallengeState();
      
      const merged = {
        ...defaultChallengeState(),
        ...parsed,
        status: parsed.status || STATUS.DRAFT,
        detachmentMode: parsed.detachmentMode !== undefined ? Boolean(parsed.detachmentMode) : true,
        barriers: Array.isArray(parsed.barriers) ? parsed.barriers : defaultChallengeState().barriers,
        attempts: Array.isArray(parsed.attempts) ? parsed.attempts : 
                  (Array.isArray(parsed.executions) ? parsed.executions : [])
      };
      merged.executions = merged.attempts;
      return merged;
    } catch {
      return defaultChallengeState();
    }
  }

  function saveChallengeState(state, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
    if (!storage) return;
    try {
      if (state && !state.executions && state.attempts) {
        state.executions = state.attempts;
      }
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save challenge state', e);
    }
  }

  function startChallenge(stateOrStorage, maybeStorage) {
    let state, storage;
    if (stateOrStorage && typeof stateOrStorage.setItem === 'function') {
      storage = stateOrStorage;
      state = loadChallengeState(storage);
    } else if (maybeStorage && typeof maybeStorage.setItem === 'function') {
      storage = maybeStorage;
      state = stateOrStorage ? { ...stateOrStorage } : loadChallengeState(storage);
    } else {
      state = stateOrStorage ? { ...stateOrStorage } : loadChallengeState();
      storage = typeof localStorage !== 'undefined' ? localStorage : null;
    }

    state.status = STATUS.ACTIVE;
    state.startedAt = state.startedAt || new Date().toISOString();
    state.pausedAt = null;
    state.cancelledAt = null;
    if (state.completedAt) state.completedAt = null;

    saveChallengeState(state, storage);
    return state;
  }

  function pauseChallenge(stateOrStorage, maybeStorage) {
    let state, storage;
    if (stateOrStorage && typeof stateOrStorage.setItem === 'function') {
      storage = stateOrStorage;
      state = loadChallengeState(storage);
    } else if (maybeStorage && typeof maybeStorage.setItem === 'function') {
      storage = maybeStorage;
      state = stateOrStorage ? { ...stateOrStorage } : loadChallengeState(storage);
    } else {
      state = stateOrStorage ? { ...stateOrStorage } : loadChallengeState();
      storage = typeof localStorage !== 'undefined' ? localStorage : null;
    }

    if (state.status === STATUS.ACTIVE) {
      state.status = STATUS.PAUSED;
      state.pausedAt = new Date().toISOString();
      saveChallengeState(state, storage);
    }
    return state;
  }

  function resumeChallenge(stateOrStorage, maybeStorage) {
    let state, storage;
    if (stateOrStorage && typeof stateOrStorage.setItem === 'function') {
      storage = stateOrStorage;
      state = loadChallengeState(storage);
    } else if (maybeStorage && typeof maybeStorage.setItem === 'function') {
      storage = maybeStorage;
      state = stateOrStorage ? { ...stateOrStorage } : loadChallengeState(storage);
    } else {
      state = stateOrStorage ? { ...stateOrStorage } : loadChallengeState();
      storage = typeof localStorage !== 'undefined' ? localStorage : null;
    }

    if (state.status === STATUS.PAUSED) {
      state.status = STATUS.ACTIVE;
      state.pausedAt = null;
      saveChallengeState(state, storage);
    }
    return state;
  }

  function cancelChallenge(stateOrStorage, maybeStorage) {
    let state, storage;
    if (stateOrStorage && typeof stateOrStorage.setItem === 'function') {
      storage = stateOrStorage;
      state = loadChallengeState(storage);
    } else if (maybeStorage && typeof maybeStorage.setItem === 'function') {
      storage = maybeStorage;
      state = stateOrStorage ? { ...stateOrStorage } : loadChallengeState(storage);
    } else {
      state = stateOrStorage ? { ...stateOrStorage } : loadChallengeState();
      storage = typeof localStorage !== 'undefined' ? localStorage : null;
    }

    state.status = STATUS.CANCELLED;
    state.cancelledAt = new Date().toISOString();
    saveChallengeState(state, storage);
    return state;
  }

  function isChallengeActive(stateOrStorage) {
    const s = (stateOrStorage && stateOrStorage.status) ? stateOrStorage : loadChallengeState(stateOrStorage);
    return s.status === STATUS.ACTIVE;
  }

  function isTradeEligibleForChallenge(trade, stateOrStorage) {
    if (!trade) return false;
    const g = trade.grade || trade.setupGrade;
    if (!['A', 'A+'].includes(g)) return false;
    const s = (stateOrStorage && stateOrStorage.status) ? stateOrStorage : loadChallengeState(stateOrStorage);
    return s.status === STATUS.ACTIVE;
  }

  function getActiveChallenge(storage) {
    const s = loadChallengeState(storage);
    return s.status === STATUS.ACTIVE ? s : null;
  }

  function setDetachmentMode(val, storage) {
    const s = loadChallengeState(storage);
    s.detachmentMode = Boolean(val);
    saveChallengeState(s, storage);
    return s;
  }

  function setBarriers(barriersList, storage) {
    const s = loadChallengeState(storage);
    if (Array.isArray(barriersList)) {
      s.barriers = barriersList.filter(Boolean);
    }
    saveChallengeState(s, storage);
    return s;
  }

  function getRecentAttempts(stateOrStorage, count = 5) {
    const state = (stateOrStorage && Array.isArray(stateOrStorage.attempts)) 
      ? stateOrStorage 
      : loadChallengeState(stateOrStorage);
    const list = Array.isArray(state.attempts) ? state.attempts : [];
    return list.slice(-count);
  }

  function calculateEmotionalEvolution(stateOrStorage) {
    const state = (stateOrStorage && Array.isArray(stateOrStorage.attempts)) 
      ? stateOrStorage 
      : loadChallengeState(stateOrStorage);
    const attempts = (state.attempts || []).filter(a => a.preTradeDiscomfortLevel !== null && a.preTradeDiscomfortLevel !== undefined);

    if (attempts.length < 4) {
      return {
        hasData: false,
        totalWithRating: attempts.length,
        message: 'Dados insuficientes para análise de evolução (mínimo de 4 avaliações necessárias).'
      };
    }

    const half = Math.floor(attempts.length / 2);
    const early = attempts.slice(0, half);
    const late = attempts.slice(half);

    const earlyAvg = early.reduce((acc, x) => acc + Number(x.preTradeDiscomfortLevel), 0) / early.length;
    const lateAvg = late.reduce((acc, x) => acc + Number(x.preTradeDiscomfortLevel), 0) / late.length;

    const earlyComp = early.filter(x => x.complianceStatus === 'COMPLIANT' || x.sizingStatus === 'compliant').length;
    const lateComp = late.filter(x => x.complianceStatus === 'COMPLIANT' || x.sizingStatus === 'compliant').length;

    const earlyCompRate = Math.round((earlyComp / early.length) * 100);
    const lateCompRate = Math.round((lateComp / late.length) * 100);

    const hasImproved = lateAvg < earlyAvg && lateCompRate >= earlyCompRate;

    return {
      hasData: true,
      earlyCount: early.length,
      lateCount: late.length,
      earlyAvgDiscomfort: Number(earlyAvg.toFixed(1)),
      lateAvgDiscomfort: Number(lateAvg.toFixed(1)),
      earlyComplianceRate: earlyCompRate,
      lateComplianceRate: lateCompRate,
      hasImproved,
      message: hasImproved 
        ? 'Você está conseguindo executar seu risco planejado com menos desconforto.' 
        : 'Continue monitorando o desconforto emocional antes de cada operação.'
    };
  }

  function detectNominalAttachment(stateOrStorage) {
    const state = (stateOrStorage && Array.isArray(stateOrStorage.attempts)) 
      ? stateOrStorage 
      : loadChallengeState(stateOrStorage);
    const attempts = state.attempts || [];

    if (attempts.length < 4) {
      return {
        hasPattern: false,
        attemptsCount: attempts.length,
        message: 'Amostra insuficiente para detectar correlação de valor nominal.'
      };
    }

    // Filtrar tentativas que possuem risco financeiro calculado
    const valid = attempts.filter(a => Number(a.financialRiskAmount || a.riskAmount) > 0);
    if (valid.length < 4) {
      return {
        hasPattern: false,
        message: 'Amostra insuficiente de valores financeiros.'
      };
    }

    // Ordenar por valor financeiro (R$)
    const sorted = [...valid].sort((a, b) => 
      (Number(a.financialRiskAmount || a.riskAmount) || 0) - (Number(b.financialRiskAmount || b.riskAmount) || 0)
    );

    const half = Math.floor(sorted.length / 2);
    const lowerRiskTier = sorted.slice(0, half);
    const upperRiskTier = sorted.slice(half);

    const lowerUnderCount = lowerRiskTier.filter(a => a.complianceStatus === 'UNDER_SIZING' || a.sizingStatus === 'under-sizing').length;
    const upperUnderCount = upperRiskTier.filter(a => a.complianceStatus === 'UNDER_SIZING' || a.sizingStatus === 'under-sizing').length;

    const lowerRate = lowerUnderCount / lowerRiskTier.length;
    const upperRate = upperUnderCount / upperRiskTier.length;

    // Se no grupo de maior valor nominal o under-sizing for significativamente maior (ex: >= 25pp a mais)
    const hasPattern = upperRate >= 0.4 && (upperRate - lowerRate >= 0.25);

    return {
      hasPattern,
      lowerRiskAvgAmount: Math.round(lowerRiskTier.reduce((acc, x) => acc + (x.financialRiskAmount || x.riskAmount || 0), 0) / lowerRiskTier.length),
      upperRiskAvgAmount: Math.round(upperRiskTier.reduce((acc, x) => acc + (x.financialRiskAmount || x.riskAmount || 0), 0) / upperRiskTier.length),
      lowerUnderSizingRate: Math.round(lowerRate * 100),
      upperUnderSizingRate: Math.round(upperRate * 100),
      message: hasPattern
        ? 'Quando o valor financeiro correspondente ao mesmo percentual de risco aumenta, sua frequência de Under-Sizing também aumenta.'
        : 'Nenhuma correlação adversa entre valor nominal e sub-dimensionamento detectada.'
    };
  }

  function recordExecution(stateOrParams, maybeParams) {
    let state, params, singleArg = false;
    if (maybeParams !== undefined) {
      state = stateOrParams;
      params = maybeParams || {};
    } else {
      state = loadChallengeState();
      params = stateOrParams || {};
      singleArg = true;
    }

    const currentState = state ? { ...state } : defaultChallengeState();
    const attempts = [...(currentState.attempts || currentState.executions || [])];

    const {
      tradeId,
      id,
      ticker,
      date,
      setupGrade = 'A+',
      grade,
      rubricScore = 100,
      targetRiskPercent,
      targetRiskPct,
      entryPrice,
      initialStop,
      actualQuantity,
      plannedQuantity,
      quantity,
      equityAtEntry,
      tolerancePp = DEFAULT_TOLERANCE_PP,
      differenceReason = null,
      differenceComment = '',
      reason,
      tradeResultR = null,
      riskPolicySnapshot = null,
      detachmentMode,
      preTradeDiscomfortLevel = null,
      forceActive = false
    } = params;

    // REGRA FUNDAMENTAL: Se o desafio não estiver ACTIVE nem DRAFT (ex: PAUSED, CANCELLED, COMPLETED), ignorar!
    if (!forceActive && currentState.status && (currentState.status === STATUS.PAUSED || currentState.status === STATUS.CANCELLED)) {
      return singleArg ? null : { state: currentState, execution: null, ignored: true, reason: 'CHALLENGE_NOT_ACTIVE' };
    }

    const effTradeId = tradeId || id || ('trade-' + Date.now());
    const effGrade = grade || setupGrade || 'A+';

    // REGRA DE ELEGIBILIDADE: Apenas Grade A ou A+ pertencem ao Desafio A/A+. Trades B ou inferiores nunca entram!
    if (!['A', 'A+'].includes(effGrade)) {
      return singleArg ? null : { state: currentState, execution: null, ignored: true, reason: 'GRADE_NOT_ELIGIBLE' };
    }

    const effTargetRisk = Number(targetRiskPct !== undefined ? targetRiskPct : (targetRiskPercent !== undefined ? targetRiskPercent : 0.5));
    const effQty = Number(quantity !== undefined ? quantity : (actualQuantity !== undefined ? actualQuantity : plannedQuantity)) || 0;
    const effPlannedQty = Number(plannedQuantity !== undefined ? plannedQuantity : effQty) || 0;
    const effReason = differenceReason || reason || null;

    // Idempotência estrita: Evitar duplicatas por tradeId
    if (effTradeId && attempts.some(e => e.tradeId === effTradeId || e.id === effTradeId || e.attemptId === effTradeId)) {
      const existing = attempts.find(e => e.tradeId === effTradeId || e.id === effTradeId || e.attemptId === effTradeId);
      return singleArg ? existing : { state: currentState, execution: existing, isNew: false };
    }

    const { actualRiskPct, totalRiskAmount } = calculateActualRisk({
      entryPrice,
      initialStop,
      quantity: effQty,
      equityAtEntry
    });

    const compliance = evaluateSizingCompliance({
      targetRiskPct: effTargetRisk,
      actualRiskPct,
      tolerancePp: tolerancePp || currentState.tolerancePp
    });

    const courageGap = calculateCourageGap({
      actualRiskPct,
      targetRiskPct: effTargetRisk,
      differenceReason: effReason
    });

    const attemptNumber = attempts.length + 1;
    const compliantCountSoFar = attempts.filter(a => a.complianceStatus === 'COMPLIANT' || a.sizingStatus === 'compliant').length;
    const executionNumber = compliance.isCompliant ? compliantCountSoFar + 1 : null;
    const riskUnit = Math.abs((Number(entryPrice) || 0) - (Number(initialStop) || 0));

    // SNAPSHOT IMUTÁVEL NO MOMENTO DO TRADE
    const newAttempt = {
      attemptId: 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      challengeId: currentState.challengeId,
      challengeExecutionId: 'exec-' + Date.now(),
      attemptNumber,
      executionNumber,
      tradeId: effTradeId,
      id: effTradeId,
      timestamp: new Date().toISOString(),
      date: date || new Date().toISOString().slice(0, 10),
      ticker: (ticker || 'ATIVO').toUpperCase(),
      setupGrade: effGrade,
      grade: effGrade,
      rubricScore,
      targetRiskPercent: Number(effTargetRisk.toFixed(2)),
      targetRiskPct: Number(effTargetRisk.toFixed(2)),
      actualRiskPercent: Number(Number(actualRiskPct).toFixed(2)),
      actualRiskPct: Number(Number(actualRiskPct).toFixed(2)),
      equityAtEntry: Number(equityAtEntry) || 0,
      riskPolicySnapshot: riskPolicySnapshot || {
        baseRisk: effTargetRisk,
        equity: Number(equityAtEntry) || 0
      },
      plannedPositionSize: effPlannedQty,
      actualPositionSize: effQty,
      riskTolerance: tolerancePp || DEFAULT_TOLERANCE_PP,
      complianceStatus: compliance.complianceStatus,
      policyViolation: compliance.policyViolation,
      sizingStatus: compliance.sizingStatus,
      status: compliance.sizingStatus, // alias
      entryPrice: Number(entryPrice) || 0,
      initialStop: Number(initialStop) || 0,
      quantity: effQty,
      riskAmount: Number(totalRiskAmount.toFixed(2)),
      financialRiskAmount: Number(totalRiskAmount.toFixed(2)),
      plannedFinancialRiskAmount: Number((riskUnit * effPlannedQty).toFixed(2)),
      riskDeviation: compliance.deviation,
      riskExecutionAccuracy: compliance.accuracy,
      riskExecutionRatio: effTargetRisk > 0 ? Number((actualRiskPct / effTargetRisk).toFixed(2)) : 1.0,
      differenceReason: effReason,
      reason: effReason || differenceComment || '',
      underSizingReason: effReason,
      isFearReason: effReason === 'fear' || (typeof effReason === 'string' && effReason.toLowerCase().includes('medo')),
      differenceComment: differenceComment || '',
      courageGap,
      tradeResultR: tradeResultR !== null && tradeResultR !== undefined ? Number(tradeResultR) : null,
      detachmentMode: detachmentMode !== undefined ? Boolean(detachmentMode) : Boolean(currentState.detachmentMode !== false),
      preTradeDiscomfortLevel: preTradeDiscomfortLevel !== null && preTradeDiscomfortLevel !== undefined ? Number(preTradeDiscomfortLevel) : null,
      createdAt: new Date().toISOString()
    };

    attempts.push(newAttempt);
    currentState.attempts = attempts;
    currentState.executions = attempts; // compatibilidade retroativa

    const newCompliantCount = attempts.filter(a => a.complianceStatus === 'COMPLIANT' || a.sizingStatus === 'compliant').length;
    const targetGoal = currentState.targetCompliantExecutions || currentState.targetGoal || DEFAULT_TARGET_GOAL;

    if (newCompliantCount >= targetGoal && !currentState.completedAt) {
      currentState.status = STATUS.COMPLETED;
      currentState.completedAt = new Date().toISOString();
    }

    if (singleArg) {
      saveChallengeState(currentState);
      return newAttempt;
    }

    return {
      state: currentState,
      execution: newAttempt,
      attempt: newAttempt,
      isNew: true
    };
  }

  function updateExecutionReason(state, executionNumberOrTradeId, reason, comment) {
    const currentState = state ? { ...state } : defaultChallengeState();
    const attempts = [...(currentState.attempts || currentState.executions || [])];
    const index = attempts.findIndex(e => 
      e.executionNumber === executionNumberOrTradeId || 
      e.tradeId === executionNumberOrTradeId || 
      e.id === executionNumberOrTradeId ||
      e.attemptId === executionNumberOrTradeId
    );

    if (index === -1) return currentState;

    const ex = { ...attempts[index] };
    ex.differenceReason = reason;
    ex.underSizingReason = reason;
    ex.reason = reason;
    ex.differenceComment = comment !== undefined ? comment : ex.differenceComment;
    ex.isFearReason = reason === 'fear' || (typeof reason === 'string' && reason.toLowerCase().includes('medo'));
    ex.courageGap = calculateCourageGap({
      actualRiskPct: ex.actualRiskPercent,
      targetRiskPct: ex.targetRiskPercent,
      differenceReason: reason
    });

    attempts[index] = ex;
    currentState.attempts = attempts;
    currentState.executions = attempts;
    return currentState;
  }

  function updateSettings(state, { reward, consequence, punishment, deadline, barriers, detachmentMode }) {
    const currentState = state ? { ...state } : defaultChallengeState();
    if (reward !== undefined) currentState.reward = String(reward).trim();
    if (punishment !== undefined) {
      currentState.punishment = String(punishment).trim();
      currentState.consequence = currentState.punishment;
    } else if (consequence !== undefined) {
      currentState.consequence = String(consequence).trim();
      currentState.punishment = currentState.consequence;
    }
    if (deadline !== undefined) currentState.deadline = String(deadline).trim();
    if (barriers !== undefined && Array.isArray(barriers)) currentState.barriers = barriers.filter(Boolean);
    if (detachmentMode !== undefined) currentState.detachmentMode = Boolean(detachmentMode);
    return currentState;
  }

  function resetChallenge(storage) {
    const fresh = defaultChallengeState();
    if (storage) saveChallengeState(fresh, storage);
    return fresh;
  }

  function getState(storage) {
    return loadChallengeState(storage);
  }

  function saveState(state, storage) {
    return saveChallengeState(state, storage);
  }

  function updateCommitments(settings, storage) {
    const s = loadChallengeState(storage);
    const updated = updateSettings(s, settings);
    saveChallengeState(updated, storage);
    return updated;
  }

  function recordExecutionDirect(tradeData, storage) {
    const s = loadChallengeState(storage);
    const res = recordExecution(s, tradeData);
    if (res && res.state) saveChallengeState(res.state, storage);
    return res ? res.execution : null;
  }

  function recordUnderSizingReasonDirect(tradeId, reason, comment, storage) {
    const s = loadChallengeState(storage);
    const updated = updateExecutionReason(s, tradeId, reason, comment);
    saveChallengeState(updated, storage);
    return updated;
  }

  function removeExecutionDirect(tradeId, storage) {
    const s = loadChallengeState(storage);
    s.attempts = (s.attempts || s.executions || []).filter(e => 
      e.tradeId !== tradeId && e.executionNumber !== tradeId && e.id !== tradeId && e.attemptId !== tradeId
    );
    let compCount = 0;
    s.attempts.forEach((e, idx) => {
      e.attemptNumber = idx + 1;
      if (e.complianceStatus === 'COMPLIANT' || e.sizingStatus === 'compliant') {
        compCount++;
        e.executionNumber = compCount;
      } else {
        e.executionNumber = null;
      }
    });
    s.executions = s.attempts;
    saveChallengeState(s, storage);
    return s;
  }

  return {
    STORAGE_KEY,
    DEFAULT_TARGET_GOAL,
    DEFAULT_TOLERANCE_PP,
    STATUS,
    BARRIER_OPTIONS,
    DIFFERENCE_REASONS,
    defaultChallengeState,
    calculateActualRisk,
    evaluateSizingCompliance,
    calculateCourageGap,
    calculateDaysRemaining,
    calculateChallengeMetrics,
    loadChallengeState,
    saveChallengeState,
    startChallenge,
    pauseChallenge,
    resumeChallenge,
    cancelChallenge,
    isChallengeActive,
    isTradeEligibleForChallenge,
    getActiveChallenge,
    setDetachmentMode,
    setBarriers,
    getRecentAttempts,
    calculateEmotionalEvolution,
    detectNominalAttachment,
    recordExecution,
    recordAttempt: recordExecution,
    updateExecutionReason,
    recordUnderSizingReason: (id, reason, comment) => recordUnderSizingReasonDirect(id, reason, comment),
    updateSettings,
    resetChallenge,
    getState,
    saveState,
    updateCommitments,
    recordExecutionDirect,
    recordUnderSizingReasonDirect,
    removeExecutionDirect,
    removeExecution: (id) => removeExecutionDirect(id)
  };
});
