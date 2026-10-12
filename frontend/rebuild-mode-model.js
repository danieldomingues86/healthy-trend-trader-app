(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.RebuildModeModel = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'healthy-trend-trader-rebuild-mode-v1';

  const DEFAULT_STATE = {
    isActive: false,
    maxRiskPct: 0.001, // 0,10% teto obrigatório
    maxPositions: 1,   // 1 trade por vez rigoroso
    activatedAt: null,
    reason: 'Foco em disciplina, proteção do capital e recuperação do prazer de operar.',
    targetPhase: 'CALM_CONSISTENCY'
  };

  let memoryState = { ...DEFAULT_STATE };

  function getRebuildState() {
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            return { ...DEFAULT_STATE, ...parsed };
          }
        }
      }
    } catch (_) {}
    return { ...memoryState };
  }

  function saveRebuildState(state) {
    memoryState = { ...state };
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch (_) {}
    return state;
  }

  function activateRebuild(options = {}) {
    let maxRisk = Number(options.maxRiskPct || 0.001);
    if (maxRisk > 0.05) maxRisk = maxRisk / 100;
    // Teto estrito do Rebuild Mode: máx 0,25%
    maxRisk = Math.min(0.0025, Math.max(0.0005, maxRisk));

    const state = {
      ...getRebuildState(),
      isActive: true,
      maxRiskPct: maxRisk,
      maxPositions: 1,
      activatedAt: new Date().toISOString(),
      reason: options.reason || DEFAULT_STATE.reason
    };
    return saveRebuildState(state);
  }

  function deactivateRebuild() {
    const state = {
      ...getRebuildState(),
      isActive: false
    };
    return saveRebuildState(state);
  }

  function clampRiskToRebuild(riskPct) {
    const state = getRebuildState();
    if (!state.isActive) return riskPct;
    return Math.min(riskPct, state.maxRiskPct);
  }

  return {
    STORAGE_KEY,
    DEFAULT_STATE,
    getRebuildState,
    saveRebuildState,
    activateRebuild,
    deactivateRebuild,
    clampRiskToRebuild
  };
});
