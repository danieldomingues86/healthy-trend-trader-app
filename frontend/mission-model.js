(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.MissionModel = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'healthy-trend-trader-mission-v1';
  const HISTORY_STORAGE_KEY = 'healthy-trend-trader-mission-history-v1';

  const DEFAULT_MISSION = {
    id: 'mission-default-1',
    title: 'Operar pequeno e constante',
    reason: 'Conseguir me concentrar em operar sem arriscar muito de uma única vez, para não ficar com medo e parar de operar. O maior objetivo é seguir meu método por muitos trades sem ficar com medo ou com o emocional abalado.',
    targetTrades: 20,
    riskPct: 0.001, // 0,10%
    reward: 'Um jantar especial',
    status: 'ACTIVE', // 'ACTIVE', 'PAUSED', 'COMPLETED'
    rebuildModeLinked: true,
    startDate: '2026-10-01T09:00:00.000Z',
    completedDate: null,
    trades: [
      { id: 'mt-1', tradeNumber: 1, date: '10/10/2026', ticker: 'PETR4', result: 'COMPLIANT', status: 'CLOSED', notes: 'Gatilho perfeito, stop respeitado.' },
      { id: 'mt-2', tradeNumber: 2, date: '13/10/2026', ticker: 'VALE3', result: 'COMPLIANT', status: 'CLOSED', notes: 'Executado com calma.' },
      { id: 'mt-3', tradeNumber: 3, date: '14/10/2026', ticker: 'ITUB4', result: 'COMPLIANT', status: 'CLOSED', notes: 'Saída disciplinada.' },
      { id: 'mt-4', tradeNumber: 4, date: '16/10/2026', ticker: 'BBDC4', result: 'COMPLIANT', status: 'CLOSED', notes: 'Risco pequeno sem ansiedade.' },
      { id: 'mt-5', tradeNumber: 5, date: '17/10/2026', ticker: 'ABEV3', result: 'COMPLIANT', status: 'CLOSED', notes: 'Foco total no processo.' },
      { id: 'mt-6', tradeNumber: 6, date: '18/10/2026', ticker: 'RENT3', result: 'COMPLIANT', status: 'CLOSED', notes: 'Entrada serena na média.' },
      { id: 'mt-7', tradeNumber: 7, date: '19/10/2026', ticker: 'PRIO3', result: 'COMPLIANT', status: 'CLOSED', notes: 'Cumprimento das regras.' }
    ]
  };

  function sanitizeString(val) {
    return String(val ?? '').trim();
  }

  function normalizeNumber(val, fallback) {
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  function calculateDaysSince(startDate) {
    if (!startDate) return 0;
    try {
      const start = new Date(startDate);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    } catch (_) {
      return 0;
    }
  }

  function formatCurrencyBRL(val) {
    const n = Number(val) || 0;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatPctBR(val, decimals = 2) {
    const n = (Number(val) || 0) * 100;
    return n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + '%';
  }

  function createMission(params = {}) {
    const targetTrades = Math.max(1, Math.round(normalizeNumber(params.targetTrades, 20)));
    let riskPct = Number(params.riskPct);
    if (!Number.isFinite(riskPct) || riskPct <= 0) riskPct = 0.001;
    // Se digitado em percentual inteiro (ex.: 0.10), converte para decimal 0.001
    if (riskPct > 0.05) riskPct = riskPct / 100;

    return {
      id: params.id || 'mission-' + Date.now(),
      title: sanitizeString(params.title) || 'Minha missão é operar pequeno e constante.',
      reason: sanitizeString(params.reason) || '',
      targetTrades,
      riskPct,
      reward: sanitizeString(params.reward) || 'Um jantar especial',
      status: params.status || 'ACTIVE',
      rebuildModeLinked: Boolean(params.rebuildModeLinked ?? true),
      startDate: params.startDate || new Date().toISOString(),
      completedDate: params.completedDate || null,
      trades: Array.isArray(params.trades) ? params.trades : []
    };
  }

  function calculateMissionProgress(mission, options = {}) {
    const m = mission || DEFAULT_MISSION;
    const trades = Array.isArray(m.trades) ? m.trades : [];
    const completedTrades = trades.length;
    const targetTrades = Math.max(1, Number(m.targetTrades) || 20);
    const progressPct = Math.min(100, Math.round((completedTrades / targetTrades) * 100));
    const remainingTrades = Math.max(0, targetTrades - completedTrades);
    const isCompleted = completedTrades >= targetTrades;
    const daysSinceStart = calculateDaysSince(m.startDate);

    const equity = Number(options.equity) || 0;
    const estimatedRiskValue = equity > 0 ? equity * (m.riskPct || 0.001) : null;

    // Verifica se há trade em andamento na missão
    const hasOpenTrade = trades.some(t => t.status === 'OPEN');

    return {
      completedTrades,
      targetTrades,
      progressPct,
      remainingTrades,
      isCompleted,
      daysSinceStart,
      riskPct: m.riskPct || 0.001,
      riskPctFormatted: formatPctBR(m.riskPct || 0.001, 2),
      estimatedRiskValue,
      estimatedRiskValueFormatted: estimatedRiskValue !== null ? formatCurrencyBRL(estimatedRiskValue) : null,
      hasOpenTrade,
      status: m.status || 'ACTIVE',
      canAddTrade: !hasOpenTrade && !isCompleted
    };
  }

  function addMissionTrade(mission, tradeData = {}) {
    if (!mission) throw new Error('Missão não informada.');
    if (mission.status === 'COMPLETED') {
      throw new Error('A missão já foi concluída.');
    }

    const currentTrades = Array.isArray(mission.trades) ? [...mission.trades] : [];

    // Regra protetiva: 1 trade por vez
    const openTrade = currentTrades.find(t => t.status === 'OPEN');
    if (openTrade) {
      throw new Error('Já existe um trade em andamento na missão. Encerre-o antes de marcar o próximo.');
    }

    const tradeNumber = currentTrades.length + 1;
    const ticker = sanitizeString(tradeData.ticker).toUpperCase() || 'TRADE' + tradeNumber;
    const date = sanitizeString(tradeData.date) || new Date().toLocaleDateString('pt-BR');
    const result = tradeData.result || 'COMPLIANT';
    const notes = sanitizeString(tradeData.notes) || '';
    const status = tradeData.status === 'OPEN' ? 'OPEN' : 'CLOSED';

    const newTrade = {
      id: tradeData.id || 'mt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      tradeNumber,
      date,
      ticker,
      result,
      status,
      notes
    };

    const nextTrades = [...currentTrades, newTrade];
    const isNowCompleted = nextTrades.length >= mission.targetTrades;

    const updatedMission = {
      ...mission,
      trades: nextTrades,
      status: isNowCompleted ? 'COMPLETED' : mission.status,
      completedDate: isNowCompleted ? (mission.completedDate || new Date().toISOString()) : mission.completedDate
    };

    return {
      mission: updatedMission,
      trade: newTrade,
      justCompleted: isNowCompleted
    };
  }

  function closeOpenMissionTrade(mission, tradeId, closeData = {}) {
    if (!mission) return mission;
    const currentTrades = Array.isArray(mission.trades) ? [...mission.trades] : [];
    const index = currentTrades.findIndex(t => t.id === tradeId || t.status === 'OPEN');
    if (index === -1) return mission;

    const targetTrade = {
      ...currentTrades[index],
      status: 'CLOSED',
      result: closeData.result || currentTrades[index].result || 'COMPLIANT',
      notes: closeData.notes || currentTrades[index].notes || ''
    };

    currentTrades[index] = targetTrade;
    const isNowCompleted = currentTrades.length >= mission.targetTrades;

    return {
      ...mission,
      trades: currentTrades,
      status: isNowCompleted ? 'COMPLETED' : mission.status,
      completedDate: isNowCompleted ? (mission.completedDate || new Date().toISOString()) : mission.completedDate
    };
  }

  function removeMissionTrade(mission, tradeId) {
    if (!mission || !Array.isArray(mission.trades)) return mission;
    const nextTrades = mission.trades
      .filter(t => t.id !== tradeId)
      .map((t, idx) => ({ ...t, tradeNumber: idx + 1 }));

    const wasCompleted = mission.status === 'COMPLETED';
    const isStillCompleted = nextTrades.length >= mission.targetTrades;

    return {
      ...mission,
      trades: nextTrades,
      status: isStillCompleted ? 'COMPLETED' : (wasCompleted ? 'ACTIVE' : mission.status),
      completedDate: isStillCompleted ? mission.completedDate : null
    };
  }

  function updateMissionConfig(mission, nextConfig = {}, rebuildModeState = null) {
    const current = mission || DEFAULT_MISSION;
    let targetTrades = nextConfig.targetTrades !== undefined ? Number(nextConfig.targetTrades) : current.targetTrades;
    targetTrades = Math.max(1, Math.round(normalizeNumber(targetTrades, 20)));

    let riskPct = nextConfig.riskPct !== undefined ? Number(nextConfig.riskPct) : current.riskPct;
    if (riskPct > 0.05) riskPct = riskPct / 100;
    if (!Number.isFinite(riskPct) || riskPct <= 0) riskPct = 0.001;

    // Regra de integração com Rebuild Mode: se Rebuild Mode estiver ativo, limita o risco
    if (rebuildModeState && rebuildModeState.isActive) {
      const rebuildMax = Number(rebuildModeState.maxRiskPct) || 0.001;
      if (riskPct > rebuildMax) {
        riskPct = rebuildMax;
      }
    }

    const title = nextConfig.title !== undefined ? sanitizeString(nextConfig.title) : current.title;
    const reason = nextConfig.reason !== undefined ? sanitizeString(nextConfig.reason) : current.reason;
    const reward = nextConfig.reward !== undefined ? sanitizeString(nextConfig.reward) : current.reward;

    return {
      ...current,
      title: title || current.title,
      reason: reason !== undefined ? reason : current.reason,
      targetTrades,
      riskPct,
      reward: reward || current.reward
    };
  }

  /**
   * Gera a lista de 7 waypoints estáticos que compõem a rota na montanha,
   * calculando seu estado visual (COMPLETED, ACTIVE, LOCKED) de acordo
   * com a meta de trades e o progresso atual.
   */
  function generateWaypoints(targetTrades, completedTrades) {
    const target = Math.max(1, Number(targetTrades) || 20);
    const completed = Math.max(0, Number(completedTrades) || 0);

    // Mapeia o progresso em 7 estações no percurso (1 a 7)
    // Se target = 7: estação i corresponde exatamente ao trade i
    // Se target = 20: interpolação proporcional
    const totalStations = 7;
    const stations = [];

    // Estação ativa atual (onde o soldado / caminhante está)
    // Se completed == 0: ativo é o 1
    // Se completed >= target: ativo é o 7 (cumprido)
    const activeStationIndex = completed >= target
      ? totalStations
      : Math.min(totalStations, Math.floor((completed / target) * (totalStations - 1)) + 1);

    for (let i = 1; i <= totalStations; i++) {
      let status = 'LOCKED';
      // Quantidade de trades que essa estação representa
      const stationTrades = Math.max(1, Math.round((i / totalStations) * target));

      if (completed >= stationTrades || (completed >= target && i === totalStations)) {
        status = 'COMPLETED';
      } else if (i === activeStationIndex) {
        status = 'ACTIVE';
      } else if (i < activeStationIndex) {
        status = 'COMPLETED';
      } else {
        status = 'LOCKED';
      }

      stations.push({
        stationNumber: i,
        stationTrades,
        status, // 'COMPLETED', 'ACTIVE', 'LOCKED'
        isSummit: i === totalStations
      });
    }

    return stations;
  }

  return {
    STORAGE_KEY,
    HISTORY_STORAGE_KEY,
    DEFAULT_MISSION,
    createMission,
    calculateMissionProgress,
    addMissionTrade,
    closeOpenMissionTrade,
    removeMissionTrade,
    updateMissionConfig,
    generateWaypoints,
    formatCurrencyBRL,
    formatPctBR
  };
});
