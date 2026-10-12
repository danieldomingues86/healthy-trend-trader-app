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
    status: 'NOT_STARTED', // 'NOT_STARTED', 'ACTIVE', 'STOPPED', 'COMPLETED'
    rebuildModeLinked: true,
    startDate: null,
    stoppedDate: null,
    stopReason: null,
    completedDate: null,
    trades: []
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

    const status = params.status || 'NOT_STARTED';
    const startDate = params.startDate || (status === 'ACTIVE' ? new Date().toISOString() : null);

    return {
      id: params.id || 'mission-' + Date.now(),
      title: sanitizeString(params.title) || 'Minha missão é operar pequeno e constante.',
      reason: sanitizeString(params.reason) || '',
      targetTrades,
      riskPct,
      reward: sanitizeString(params.reward) || 'Um jantar especial',
      status,
      rebuildModeLinked: Boolean(params.rebuildModeLinked ?? true),
      startDate,
      stoppedDate: params.stoppedDate || null,
      stopReason: params.stopReason || null,
      completedDate: params.completedDate || null,
      trades: Array.isArray(params.trades) ? [...params.trades] : []
    };
  }

  function calculateMissionProgress(mission, options = {}) {
    const m = mission || DEFAULT_MISSION;
    const trades = Array.isArray(m.trades) ? m.trades : [];
    const completedTrades = trades.length;
    const targetTrades = Math.max(1, Number(m.targetTrades) || 20);
    const progressPct = Math.min(100, Math.round((completedTrades / targetTrades) * 100));
    const remainingTrades = Math.max(0, targetTrades - completedTrades);
    const isCompleted = m.status === 'COMPLETED' || (m.status === 'ACTIVE' && completedTrades >= targetTrades);
    const daysSinceStart = m.startDate ? calculateDaysSince(m.startDate) : 0;

    const equity = Number(options.equity) || 0;
    const estimatedRiskValue = equity > 0 ? equity * (m.riskPct || 0.001) : null;

    // Verifica se há trade em andamento na missão
    const hasOpenTrade = trades.some(t => t.status === 'OPEN');

    // Fonte única da trilha da montanha (7 marcos)
    const waypoints = generateWaypoints(targetTrades, completedTrades);
    const activeWp = waypoints.find(w => w.status === 'ACTIVE') || waypoints[waypoints.length - 1];
    const currentStationNumber = isCompleted ? 7 : (activeWp ? activeWp.stationNumber : 1);
    const completedStations = waypoints.filter(w => w.status === 'COMPLETED').length;
    const currentStationTrades = activeWp ? (activeWp.endTrade || activeWp.stationTrades) : targetTrades;

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
      status: m.status || 'NOT_STARTED',
      canAddTrade: m.status === 'ACTIVE' && !hasOpenTrade && !isCompleted,
      // Marco da montanha sincronizado com a mesma fonte de verdade
      totalStations: 7,
      completedStations,
      currentStationNumber,
      currentStationTrades,
      activeWaypoint: activeWp,
      waypoints
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

    const nextStatus = isNowCompleted ? 'COMPLETED' : (mission.status === 'NOT_STARTED' ? 'ACTIVE' : mission.status);

    const updatedMission = {
      ...mission,
      trades: nextTrades,
      startDate: mission.startDate || new Date().toISOString(),
      status: nextStatus,
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
   * Inicia ou atualiza a missão de acordo com as regras de ciclo de vida:
   * 1. Se a missão ainda não foi iniciada (status !== 'ACTIVE' ou sem startDate):
   *    - Cria ou ativa a instância da missão
   *    - Inicializa o progresso estritamente em zero (trades = [])
   *    - Registra a data de início atual (startDate = now)
   *    - Aplica as configurações validadas
   *    - Retorna { mission, isNew: true }
   * 2. Se a missão já estiver ativa (status === 'ACTIVE'):
   *    - Proteção contra reinicialização acidental: preserva integralmente os trades e startDate
   *    - Atualiza apenas a configuração (meta, risco, recompensa, título, motivo)
   *    - Retorna { mission, isNew: false }
   */
  function startMission(mission, config = {}, rebuildState = null) {
    const base = mission || DEFAULT_MISSION;
    const updated = updateMissionConfig(base, config, rebuildState);

    if (base.status === 'ACTIVE' && base.startDate) {
      return {
        mission: updated,
        isNew: false
      };
    }

    return {
      mission: {
        ...updated,
        status: 'ACTIVE',
        startDate: new Date().toISOString(),
        completedDate: null,
        trades: [] // Inicializa estritamente em zero
      },
      isNew: true
    };
  }

  /**
   * Reinicia a missão atual estritamente do zero:
   * - Zera a lista de trades (trades = [])
   * - Registra nova data de início (startDate = now)
   * - Define status como 'ACTIVE'
   * - Preserva ou atualiza as configurações (meta, risco, recompensa, título, motivo)
   * - Limpa completedDate
   * - Retorna a missão reiniciada
   */
  function resetMission(mission, config = {}, rebuildState = null) {
    const base = mission || DEFAULT_MISSION;
    const updated = updateMissionConfig(base, config, rebuildState);

    return {
      ...updated,
      id: 'mission-' + Date.now(),
      status: 'ACTIVE',
      startDate: new Date().toISOString(),
      stoppedDate: null,
      stopReason: null,
      completedDate: null,
      trades: []
    };
  }

  /**
   * Interrompe/para a missão ativa voluntariamente pelo trader:
   * - Define status como 'STOPPED'
   * - Registra stoppedDate (ISO) e stopReason
   * - Preserva integralmente trades, startDate, meta e configurações
   * - Restaura imediatamente o controle padrão de risco da conta
   */
  function stopMission(mission, reason = '') {
    const base = mission || DEFAULT_MISSION;
    return {
      ...base,
      status: 'STOPPED',
      stoppedDate: new Date().toISOString(),
      stopReason: sanitizeString(reason) || 'Missão interrompida voluntariamente pelo trader.'
    };
  }

  /**
   * Retorna a missão ativa no contexto especificado ou no storage global do navegador
   */
  function getActiveMission(missionOrState) {
    if (missionOrState && typeof missionOrState === 'object') {
      return missionOrState.status === 'ACTIVE' ? missionOrState : null;
    }
    if (typeof window !== 'undefined') {
      if (typeof window.MissionController?.getState === 'function') {
        const state = window.MissionController.getState();
        if (state && state.status === 'ACTIVE') return state;
      }
      try {
        const storage = window.healthyTrendWorkspace?.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
        let raw = storage ? storage.getItem(STORAGE_KEY) : null;
        if (!raw && typeof localStorage !== 'undefined' && storage !== localStorage) {
          raw = localStorage.getItem(STORAGE_KEY);
        }
        if (raw) {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (parsed && parsed.status === 'ACTIVE') return parsed;
        }
      } catch (_) {}
    }
    return null;
  }

  /**
   * Verifica se há uma missão ativa em andamento
   */
  function isMissionActive(missionOrState) {
    const active = getActiveMission(missionOrState);
    return Boolean(active && active.status === 'ACTIVE');
  }

  /**
   * Valida se um trade respeita o teto de risco imposto pela missão ativa (com tolerância de ±0.02pp)
   */
  function validateTradeAgainstMission(mission, options = {}) {
    const m = (mission && typeof mission === 'object') ? mission : getActiveMission();
    if (!m || m.status !== 'ACTIVE' || !Number(m.riskPct)) {
      return { allowed: true };
    }
    const actualRiskPct = Number(options.actualRiskPct || 0);
    const missionLimitPct = Number(m.riskPct) * 100;
    const tolerance = 0.0201; // Tolerância estrita de ±0.02pp
    if (actualRiskPct > (missionLimitPct + tolerance)) {
      return {
        allowed: false,
        missionLimitPct,
        actualRiskPct,
        message: `Operação bloqueada: o risco excede o limite de ${formatPctBR(m.riskPct, 2)} definido pela sua Missão ativa. Reduza a quantidade ou ajuste o stop.`
      };
    }
    return {
      allowed: true,
      missionLimitPct,
      actualRiskPct
    };
  }

  const STATION_TITLES = [
    'Primeiro Passo',
    'Construindo Base',
    'Ganhando Consistência',
    'Disciplina Firme',
    'Foco Inabalável',
    'Reta Final',
    'Missão Cumprida'
  ];

  /**
   * Calcula a divisão matemática dos trades da meta ao longo dos 7 marcos.
   * Exemplo para 20 trades:
   * Marco 1: 1 a 2 trades (tamanho 2)
   * Marco 2: 3 a 5 trades (tamanho 3)
   * Marco 3: 6 a 8 trades (tamanho 3)
   * Marco 4: 9 a 11 trades (tamanho 3)
   * Marco 5: 12 a 14 trades (tamanho 3)
   * Marco 6: 15 a 17 trades (tamanho 3)
   * Marco 7: 18 a 20 trades (tamanho 3)
   */
  function getStationMilestones(targetTrades, totalStations = 7) {
    const N = Math.max(1, Math.round(Number(targetTrades) || 20));
    const K = totalStations;
    const milestones = [];

    if (N <= K) {
      for (let i = 1; i <= K; i++) {
        const endTrade = Math.min(N, Math.max(1, Math.round((i * N) / K)));
        const prevEnd = i === 1 ? 0 : milestones[i - 2].endTrade;
        const startTrade = Math.min(endTrade, prevEnd + (endTrade > prevEnd ? 1 : 0));
        milestones.push({
          stationNumber: i,
          startTrade: Math.max(1, startTrade),
          endTrade
        });
      }
    } else {
      const base = Math.floor(N / K);
      const remainder = N % K;
      const sizes = [];
      for (let i = 0; i < K; i++) {
        sizes.push(i < (K - remainder) ? base : base + 1);
      }
      let currentStart = 1;
      for (let i = 0; i < K; i++) {
        const endTrade = (i === K - 1) ? N : (currentStart + sizes[i] - 1);
        milestones.push({
          stationNumber: i + 1,
          startTrade: currentStart,
          endTrade
        });
        currentStart = endTrade + 1;
      }
    }
    return milestones;
  }

  /**
   * Gera a lista de 7 waypoints que compõem a rota na montanha,
   * calculando seu estado visual (COMPLETED, ACTIVE, LOCKED) de acordo
   * com a meta de trades e o progresso atual de forma estritamente coerente.
   */
  function generateWaypoints(targetTrades, completedTrades) {
    const target = Math.max(1, Number(targetTrades) || 20);
    const completed = Math.max(0, Number(completedTrades) || 0);
    const totalStations = 7;
    const milestones = getStationMilestones(target, totalStations);

    let activeStationIndex = totalStations;
    if (completed < target) {
      for (let i = 0; i < totalStations; i++) {
        if (completed < milestones[i].endTrade) {
          activeStationIndex = i + 1;
          break;
        }
      }
    }

    const stations = [];
    for (let i = 1; i <= totalStations; i++) {
      const ms = milestones[i - 1];
      const startTrade = ms.startTrade;
      const endTrade = ms.endTrade;
      const title = STATION_TITLES[i - 1] || `Marco ${i}`;

      let status = 'LOCKED';
      if (completed >= target) {
        status = 'COMPLETED';
      } else if (completed >= endTrade) {
        status = 'COMPLETED';
      } else if (i === activeStationIndex) {
        status = 'ACTIVE';
      } else {
        status = 'LOCKED';
      }

      const statusLabel = status === 'COMPLETED' ? 'Concluído' : (status === 'ACTIVE' ? 'Em andamento' : 'Bloqueado');
      const rangeLabel = startTrade === endTrade ? `${startTrade} trade` : `${startTrade} – ${endTrade} trades`;
      const targetTradesText = `Meta: ${startTrade === endTrade ? `${endTrade} trade concluído` : `${startTrade} a ${endTrade} trades concluídos`}`;
      const progressText = `Progresso: ${Math.min(completed, endTrade)} de ${endTrade} trades`;

      let remainingText = '';
      if (status === 'COMPLETED') {
        remainingText = 'Marco concluído com sucesso!';
      } else if (status === 'ACTIVE') {
        const diff = Math.max(0, endTrade - completed);
        remainingText = diff === 1
          ? 'Falta 1 trade para concluir este marco.'
          : `Faltam ${diff} trades para concluir este marco.`;
      } else {
        const diff = Math.max(0, endTrade - completed);
        remainingText = diff === 1
          ? 'Falta 1 trade para alcançar este marco.'
          : `Faltam ${diff} trades para alcançar este marco.`;
      }

      stations.push({
        stationNumber: i,
        stationLabel: `Marco ${i}`,
        stationTitle: title,
        fullName: `Marco ${i}: ${title}`,
        startTrade,
        endTrade,
        stationTrades: endTrade, // Compatibilidade com chamadas existentes
        tradesLabel: rangeLabel,
        rangeLabel,
        status, // 'COMPLETED', 'ACTIVE', 'LOCKED'
        statusLabel,
        targetTradesText,
        progressText,
        remainingText,
        statusDescription: `${title} (${rangeLabel}): ${statusLabel}. ${progressText}. ${remainingText}`,
        completedTrades: completed,
        isSummit: i === totalStations
      });
    }

    return stations;
  }

  return {
    STORAGE_KEY,
    HISTORY_STORAGE_KEY,
    DEFAULT_MISSION,
    STATION_TITLES,
    createMission,
    startMission,
    resetMission,
    stopMission,
    isMissionActive,
    getActiveMission,
    validateTradeAgainstMission,
    calculateMissionProgress,
    addMissionTrade,
    closeOpenMissionTrade,
    removeMissionTrade,
    updateMissionConfig,
    getStationMilestones,
    generateWaypoints,
    formatCurrencyBRL,
    formatPctBR
  };
});
