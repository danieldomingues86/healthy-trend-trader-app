/**
 * HEALTHY TREND TRADER — RISK OF RUIN CONTROLLER & CROSS-SCREEN INTEGRATIONS
 *
 * Módulo transversal de proteção patrimonial e sobrevivência estatística:
 * 1. Tela dedicada (#riskofruin no menu Simuladores)
 * 2. Card prioritário no Dashboard Patrimonial (#dashboard)
 * 3. Painel de contexto pré-entrada na tela Novo Trade (#newtrade)
 * 4. Seção comparativa de cenários de risco no Simulador de Trades (#tradesimulator)
 * 5. Resumo separado (Histórico Observado vs Projeção) no Painel da Verdade (#analytics)
 * 6. Configuração de Limite de Drawdown e Tolerância na Política de Risco (#riskpolicy)
 */

(function (root) {
  'use strict';

  const Model = root.RiskOfRuinModel;
  if (!Model) return;

  const STORAGE_KEY = Model.STORAGE_KEY_CONFIG || 'healthy-trend-risk-of-ruin-config-v1';

  const state = {
    config: loadSavedConfig(),
    sourceMode: 'real_account', // 'real_account' | 'study_simulator'
    uiState: 'IDLE',            // 'IDLE' | 'CALCULATING' | 'CALCULATED' | 'LOW_SAMPLE' | 'INSUFFICIENT_DATA' | 'OUTDATED' | 'ERROR'
    lastResult: null,
    lastComparison: null,
    lastRecommendation: null,
    lastCalculatedAt: null,
    isOutdated: false,
    errorMessage: null,
    simulatorCustomRisks: [0.10, 0.25, 0.50, 0.75, 1.00]
  };

  function esc(val) {
    return String(val ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  function fmtNum(val, decimals = 1) {
    if (val === null || val === undefined || !Number.isFinite(Number(val))) return '—';
    return Number(val).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function fmtPct(val, decimals = 1) {
    if (val === null || val === undefined || !Number.isFinite(Number(val))) return '—';
    return `${fmtNum(val, decimals)}%`;
  }

  function fmtSignedR(val, decimals = 2) {
    if (val === null || val === undefined || !Number.isFinite(Number(val))) return '—';
    const n = Number(val);
    return `${n >= 0 ? '+' : ''}${fmtNum(n, decimals)}R`;
  }

  function fmtDateTimeBR(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return '—';
    const datePart = d.toLocaleDateString('pt-BR');
    const timePart = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${datePart} às ${timePart}`;
  }

  /**
   * Carrega a configuração salva, sincronizando o risco por trade padrão com a Política de Risco vigente.
   */
  function loadSavedConfig() {
    let saved = {};
    try {
      const raw = root.localStorage?.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw) || {};
    } catch (_) {}

    const policyRiskPct = getActivePolicyRiskPerTradePct();
    if (!saved.riskPerTradePct && policyRiskPct > 0) {
      saved.riskPerTradePct = policyRiskPct;
    }

    return Model.normalizeConfig(saved);
  }

  function saveConfig(newConfig) {
    state.config = Model.normalizeConfig({ ...state.config, ...newConfig });
    try {
      root.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state.config));
    } catch (_) {}
    try {
      if (root.healthyTrendWorkspace && typeof root.healthyTrendWorkspace.set === 'function') {
        root.healthyTrendWorkspace.set('riskOfRuinConfig', state.config);
      }
    } catch (_) {}
  }

  /**
   * Obtém o risco nominal por trade (Grade A) da Política de Risco como referência inicial.
   */
  function getActivePolicyRiskPerTradePct() {
    try {
      const policy = root.riskPolicyState;
      if (policy && root.TradingRubrics && typeof root.TradingRubrics.normalizePolicy === 'function') {
        const norm = root.TradingRubrics.normalizePolicy(policy);
        const gradeA = norm.grades?.find(g => g.grade === 'A');
        if (gradeA && Number.isFinite(Number(gradeA.riskPct)) && Number(gradeA.riskPct) > 0) {
          return Number((Number(gradeA.riskPct) * 100).toFixed(2));
        }
      }
    } catch (_) {}
    return Model.DEFAULT_CONFIG.riskPerTradePct;
  }

  /**
   * Extrai os trades reais encerrados do Trading Log Premium (synchronizedTrades + operationalState.closedPositions).
   * Posições abertas são estritamente ignoradas.
   */
  function getRealAccountClosedTrades() {
    const collected = [];
    const seenIds = new Set();

    try {
      if (Array.isArray(root.synchronizedTrades)) {
        for (const t of root.synchronizedTrades) {
          if (!t) continue;
          const status = String(t.status || '').toLowerCase();
          if (status && status !== 'closed' && status !== 'encerrado' && status !== 'finalizado') continue;
          const id = String(t.id || t.databaseId || '');
          if (id && seenIds.has(id)) continue;
          if (id) seenIds.add(id);

          // Se houver helper analyticsTrade global, calcula o R líquido realizado das saídas
          if (typeof root.analyticsTrade === 'function' && Array.isArray(t.events) && t.events.length > 0) {
            const parsed = root.analyticsTrade(t);
            if (parsed && Number.isFinite(parsed.r) && parsed.initialRisk > 0) {
              collected.push({
                id: id || `sync-${collected.length}`,
                symbol: t.ticker || t.symbol || 'ATIVO',
                status: 'closed',
                rMultiple: parsed.r,
                netResult: parsed.result,
                initialRisk: parsed.initialRisk,
                closedAt: t.closed_at || t.executed_at || t.created_at
              });
              continue;
            }
          }
          collected.push(t);
        }
      }
    } catch (_) {}

    try {
      const closedPos = root.operationalState?.closedPositions;
      if (Array.isArray(closedPos)) {
        for (const p of closedPos) {
          if (!p) continue;
          const id = String(p.id || p.databaseId || '');
          if (id && seenIds.has(id)) continue;
          if (id) seenIds.add(id);

          if (typeof root.operationMetrics === 'function') {
            const m = root.operationMetrics(p);
            const initRisk = Number(p.initialRisk) || (Math.abs((Number(p.entry) || 0) - (Number(p.initialStop || p.currentStop) || 0)) * (Number(p.initialQty) || 0));
            if (m && initRisk > 0 && Number.isFinite(m.realized)) {
              collected.push({
                id: id || `pos-${collected.length}`,
                symbol: p.asset || p.symbol || 'ATIVO',
                status: 'closed',
                rMultiple: m.realized / initRisk,
                netResult: m.realized,
                initialRisk: initRisk,
                closedAt: p.closedAt || p.openedAt
              });
              continue;
            }
          }
          collected.push({ ...p, status: 'closed' });
        }
      }
    } catch (_) {}

    return collected;
  }

  /**
   * Extrai os trades encerrados do Simulador de Trades (usado apenas quando o usuário ativa explicitamente o Modo Estudo,
   * ou na seção consultiva dentro da própria tela do Simulador de Trades).
   */
  function getSimulatorClosedTrades() {
    try {
      const simState = root.TradeSimulator?.getState?.();
      if (simState && Array.isArray(simState.simulations) && simState.simulations.length > 0) {
        return simState.simulations.filter(s => s && Number.isFinite(Number(s.resultR)));
      }
      if (root.TradeSimulatorModel && typeof root.TradeSimulatorModel.getDefaultSeedSimulations === 'function') {
        return root.TradeSimulatorModel.getDefaultSeedSimulations('2R').filter(s => s && Number.isFinite(Number(s.resultR)));
      }
    } catch (_) {}
    return [];
  }

  /**
   * Calcula o drawdown real atual e máximo da conta em relação ao pico real do patrimônio.
   */
  function getAccountRealDrawdownMetrics() {
    let currentDrawdownPct = 0;
    let maxDrawdownPct = 0;

    try {
      // Verifica snapshots de wealth se disponíveis
      const wealthData = root.wealthDashboardState?.data || root.DEFAULT_WEALTH;
      if (wealthData && Array.isArray(wealthData.snapshots) && wealthData.snapshots.length > 0) {
        const stratSnaps = wealthData.snapshots
          .filter(s => s && s.type === 'strategy_equity' && Number.isFinite(Number(s.amount)) && Number(s.amount) > 0)
          .sort((a, b) => String(a.occurredAt).localeCompare(String(b.occurredAt)));

        if (stratSnaps.length > 0) {
          let peak = 0;
          let maxDd = 0;
          let curDd = 0;
          for (const snap of stratSnaps) {
            const val = Number(snap.amount);
            if (val > peak) peak = val;
            const dd = peak > 0 ? ((peak - val) / peak) * 100 : 0;
            if (dd > maxDd) maxDd = dd;
            curDd = dd;
          }
          currentDrawdownPct = curDd;
          maxDrawdownPct = maxDd;
        }
      }
    } catch (_) {}

    return {
      currentDrawdownPct,
      maxDrawdownPct
    };
  }

  /**
   * Obtém o snapshot atual do Portfolio Heat da carteira.
   */
  function getPortfolioHeatSnapshotSafe() {
    try {
      if (typeof root.portfolioHeatSnapshot === 'function') {
        return root.portfolioHeatSnapshot();
      }
    } catch (_) {}
    return null;
  }

  /**
   * Executa o cálculo completo do Risk of Ruin e atualiza todos os touchpoints.
   */
  function runCalculation(options = {}) {
    try {
      state.uiState = 'CALCULATING';
      state.errorMessage = null;

      const rawTrades = state.sourceMode === 'study_simulator'
        ? getSimulatorClosedTrades()
        : getRealAccountClosedTrades();

      const accountDd = getAccountRealDrawdownMetrics();
      const heatSnap = getPortfolioHeatSnapshotSafe();

      const simResult = Model.runMonteCarloSimulation(rawTrades, state.config, {
        accountCurrentDrawdownPct: state.sourceMode === 'real_account' ? accountDd.currentDrawdownPct : undefined,
        accountMaxDrawdownPct: state.sourceMode === 'real_account' ? accountDd.maxDrawdownPct : undefined,
        calculatedAt: new Date().toISOString()
      });

      const comparison = Model.compareRiskScenarios(rawTrades, state.config);
      const recommendation = Model.evaluateHandRecommendation({
        simulationResult: simResult,
        scenarioComparison: comparison,
        riskPolicy: root.riskPolicyState || null,
        portfolioHeat: heatSnap
      });

      state.lastResult = simResult;
      state.lastComparison = comparison;
      state.lastRecommendation = recommendation;
      state.lastCalculatedAt = simResult.calculatedAt;
      state.isOutdated = false;
      state.uiState = simResult.status;

      if (!options.silent) {
        renderPage();
        refreshAllCrossScreenWidgets();
      }

      return simResult;
    } catch (err) {
      state.uiState = 'ERROR';
      state.errorMessage = err?.message || 'Erro inesperado ao executar a simulação de Monte Carlo.';
      if (!options.silent) {
        renderPage();
      }
      return null;
    }
  }

  function ensureCalculated() {
    if (!state.lastResult) {
      runCalculation({ silent: true });
    }
    return state.lastResult;
  }

  /**
   * Renderiza o SVG do Histograma da Distribuição dos Drawdowns Máximos (Monte Carlo).
   */
  function renderDrawdownHistogramSvg(simResult) {
    if (!simResult || !simResult.isSufficientSample || !Array.isArray(simResult.histogram) || simResult.histogram.length === 0) {
      return `
        <div style="height: 220px; display: flex; align-items: center; justify-content: center; background: #f8faf9; border-radius: 12px; border: 1px dashed var(--line, #dce6df); color: var(--muted, #52665c); font-size: 13px; text-align: center; padding: 20px;">
          Sem distribuição empírica para exibir.<br>São necessários pelo menos ${state.config.minSampleRequired} trades encerrados.
        </div>
      `;
    }

    const bins = simResult.histogram;
    const limitPct = simResult.config.maxDrawdownLimitPct;

    // Determina alcance relevante do eixo X (sempre mostrando pelo menos até limitPct + 10% ou 45%)
    const maxObservedBin = bins.reduce((acc, b) => (b.count > 0 ? Math.max(acc, b.endPct) : acc), 10);
    const maxDisplayPct = Math.min(50, Math.max(40, Math.ceil((Math.max(maxObservedBin, limitPct) + 6) / 5) * 5));
    const visibleBins = bins.filter(b => b.startPct < maxDisplayPct);

    const maxFreq = Math.max(2, ...visibleBins.map(b => b.frequencyPct));
    const yMax = Math.ceil(maxFreq / 2) * 2;

    const svgW = 540;
    const svgH = 235;
    const padL = 40;
    const padR = 16;
    const padT = 22;
    const padB = 34;
    const plotW = svgW - padL - padR;
    const plotH = svgH - padT - padB;

    const getX = pctVal => padL + (pctVal / maxDisplayPct) * plotW;
    const getY = freqVal => padT + plotH - (Math.min(yMax, freqVal) / yMax) * plotH;

    // Linhas de grade horizontais
    const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];
    const gridSvg = yTicks.map(tv => {
      const y = getY(tv);
      return `
        <line x1="${padL}" y1="${y.toFixed(1)}" x2="${svgW - padR}" y2="${y.toFixed(1)}" stroke="rgba(15,42,32,0.08)" stroke-width="1" />
        <text x="${padL - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#64748b" font-weight="600">${fmtNum(tv, 0)}%</text>
      `;
    }).join('');

    // Barras do histograma
    const barW = Math.max(3, (plotW / visibleBins.length) - 2);
    const barsSvg = visibleBins.map(b => {
      const x = getX(b.startPct) + 1;
      const y = getY(b.frequencyPct);
      const h = Math.max(0, padT + plotH - y);
      const isRuin = b.startPct + 1e-9 >= limitPct;
      const isWarn = !isRuin && b.startPct >= limitPct * 0.75;
      const fill = isRuin ? '#ef4444' : (isWarn ? '#60a5fa' : '#3b82f6');
      const opacity = b.count === 0 ? 0.15 : (isRuin ? 0.88 : 0.82);
      return `
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${fill}" fill-opacity="${opacity}">
          <title>Drawdown ${b.startPct}% a ${b.endPct}%: ${b.count} trajetórias (${fmtPct(b.frequencyPct, 2)})</title>
        </rect>
      `;
    }).join('');

    // Eixo X ticks a cada 5% ou 10%
    const xStep = maxDisplayPct <= 35 ? 5 : 5;
    const xTicks = [];
    for (let xVal = 0; xVal <= maxDisplayPct; xVal += xStep) {
      xTicks.push(xVal);
    }
    const xAxisSvg = xTicks.map(xv => {
      const x = getX(xv);
      return `<text x="${x.toFixed(1)}" y="${svgH - 12}" text-anchor="middle" font-size="9.5" fill="#64748b" font-weight="600">${xv}%</text>`;
    }).join('');

    // Linha vertical tracejada do limite de drawdown
    const limitX = getX(Math.min(maxDisplayPct, limitPct));
    const limitCalloutX = Math.min(svgW - padR - 58, Math.max(padL + 58, limitX));
    const limitLineSvg = `
      <line x1="${limitX.toFixed(1)}" y1="${padT}" x2="${limitX.toFixed(1)}" y2="${padT + plotH}" stroke="#dc2626" stroke-width="2" stroke-dasharray="4 3" />
      <g transform="translate(${limitCalloutX.toFixed(1)}, ${padT + 8})">
        <rect x="-56" y="-10" width="112" height="20" rx="5" fill="#fef2f2" stroke="#fca5a5" stroke-width="1" />
        <text x="0" y="3.5" text-anchor="middle" font-size="9.5" font-weight="800" fill="#dc2626">Limite: ${fmtNum(limitPct, 0)}% DD</text>
      </g>
    `;

    return `
      <div class="ror-svg-wrap">
        <svg class="ror-chart-svg" viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Histograma de Drawdowns Máximos Simulados">
          ${gridSvg}
          ${barsSvg}
          <line x1="${padL}" y1="${padT + plotH}" x2="${svgW - padR}" y2="${padT + plotH}" stroke="rgba(15,42,32,0.18)" stroke-width="1" />
          ${xAxisSvg}
          ${limitLineSvg}
        </svg>
      </div>
    `;
  }

  /**
   * Renderiza o SVG da Evolução de Trajetórias Simuladas (Fan Chart de Curvas de Capital Base 100).
   */
  function renderTrajectoriesChartSvg(simResult) {
    if (!simResult || !simResult.isSufficientSample || !Array.isArray(simResult.samplePaths) || simResult.samplePaths.length === 0) {
      return `
        <div style="height: 220px; display: flex; align-items: center; justify-content: center; background: #f8faf9; border-radius: 12px; border: 1px dashed var(--line, #dce6df); color: var(--muted, #52665c); font-size: 13px; text-align: center; padding: 20px;">
          Aguardando dados suficientes para traçar as trajetórias de patrimônio.
        </div>
      `;
    }

    const paths = simResult.samplePaths;
    const bands = simResult.horizonBands || [];
    const H = simResult.config.horizonTrades;
    const initialEq = simResult.config.initialEquity || 100;
    const ruinFloorEq = initialEq * (1 - simResult.config.maxDrawdownLimitPct / 100);

    // Calcula limites do eixo Y com base nas trajetórias amostradas e bandas
    let minEq = Math.min(ruinFloorEq * 0.9, initialEq * 0.65);
    let maxEq = initialEq * 1.35;

    for (const p of paths) {
      for (const pt of p.points) {
        if (!pt) continue;
        if (pt.equity < minEq) minEq = pt.equity;
        if (pt.equity > maxEq) maxEq = pt.equity;
      }
    }
    minEq = Math.max(0, Math.floor(minEq / 10) * 10);
    maxEq = Math.ceil(maxEq / 10) * 10;
    if (maxEq - minEq < 40) maxEq = minEq + 40;

    const svgW = 500;
    const svgH = 225;
    const padL = 42;
    const padR = 16;
    const padT = 16;
    const padB = 30;
    const plotW = svgW - padL - padR;
    const plotH = svgH - padT - padB;

    const getX = step => padL + (step / H) * plotW;
    const getY = eq => padT + plotH - ((Math.max(minEq, Math.min(maxEq, eq)) - minEq) / (maxEq - minEq)) * plotH;

    // Grade horizontal
    const yStep = (maxEq - minEq) <= 80 ? 20 : Math.ceil((maxEq - minEq) / 4 / 10) * 10;
    const yTicks = [];
    for (let yv = minEq; yv <= maxEq; yv += yStep) {
      yTicks.push(yv);
    }
    const gridSvg = yTicks.map(yv => {
      const y = getY(yv);
      return `
        <line x1="${padL}" y1="${y.toFixed(1)}" x2="${svgW - padR}" y2="${y.toFixed(1)}" stroke="rgba(15,42,32,0.08)" stroke-width="1" />
        <text x="${padL - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#64748b" font-weight="600">${fmtNum(yv, 0)}</text>
      `;
    }).join('');

    // Eixo X ticks (0, 50, 100, 150, 200, 250...)
    const xStride = Math.max(10, Math.floor(H / 5));
    const xTicks = [];
    for (let s = 0; s <= H; s += xStride) {
      xTicks.push(s);
    }
    if (xTicks[xTicks.length - 1] !== H) xTicks.push(H);
    const xAxisSvg = xTicks.map(s => {
      const x = getX(s);
      return `<text x="${x.toFixed(1)}" y="${svgH - 8}" text-anchor="middle" font-size="9.5" fill="#64748b" font-weight="600">${s}</text>`;
    }).join('');

    // Polilinhas das trajetórias amostradas
    const sampleLinesSvg = paths.slice(0, 38).map(p => {
      const validPts = (p.points || []).filter(Boolean);
      if (validPts.length < 2) return '';
      const d = validPts.map((pt, i) => `${i === 0 ? 'M' : 'L'}${getX(pt.step).toFixed(1)},${getY(pt.equity).toFixed(1)}`).join(' ');
      const stroke = p.ruined ? 'rgba(239, 68, 68, 0.32)' : 'rgba(59, 130, 246, 0.22)';
      return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.15" />`;
    }).join('');

    // Curva mediana (P50) ao longo do horizonte
    let medianPathSvg = '';
    if (bands.length >= 2) {
      const dMed = bands.map((b, i) => `${i === 0 ? 'M' : 'L'}${getX(b.step).toFixed(1)},${getY(b.p50).toFixed(1)}`).join(' ');
      medianPathSvg = `<path d="${dMed}" fill="none" stroke="#1d4ed8" stroke-width="2.6" stroke-linecap="round" />`;
    }

    // Linha de referência do piso inicial de drawdown limite (Base 100 * (1 - limitPct))
    const floorY = getY(ruinFloorEq);
    const floorLineSvg = `
      <line x1="${padL}" y1="${floorY.toFixed(1)}" x2="${svgW - padR}" y2="${floorY.toFixed(1)}" stroke="#ef4444" stroke-width="1.8" stroke-dasharray="5 4" />
    `;

    return `
      <div class="ror-svg-wrap">
        <svg class="ror-chart-svg" viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Evolução de Trajetórias Simuladas">
          ${gridSvg}
          ${sampleLinesSvg}
          ${floorLineSvg}
          ${medianPathSvg}
          <line x1="${padL}" y1="${padT + plotH}" x2="${svgW - padR}" y2="${padT + plotH}" stroke="rgba(15,42,32,0.18)" stroke-width="1" />
          ${xAxisSvg}
        </svg>
      </div>
    `;
  }

  /**
   * Renderiza a tela principal dedicada (#riskofruin).
   */
  function renderPage() {
    const container = document.getElementById('riskOfRuinRoot');
    if (!container) return;

    const sim = ensureCalculated();
    const comp = state.lastComparison;
    const rec = state.lastRecommendation;
    const cfg = state.config;
    const stats = sim?.sampleStats || {
      count: 0,
      winRatePct: 0,
      payoffRatio: null,
      expectancyR: 0,
      observedMaxDrawdownPct: 0,
      observedCurrentDrawdownPct: 0
    };

    const isSufficient = Boolean(sim && sim.isSufficientSample);
    const ci = sim?.confidenceInterval95;
    const ruinProb = sim?.ruinProbabilityPct;
    const exceedsTolerance = isSufficient && ruinProb > cfg.ruinProbabilityTolerancePct;

    // Status visual do cabeçalho
    let statusDotClass = 'neutral';
    let statusLabel = 'Aguardando amostra suficiente';
    let statusSubClass = 'neutral';

    if (state.uiState === 'ERROR') {
      statusDotClass = 'danger';
      statusSubClass = 'danger';
      statusLabel = 'Erro no cálculo';
    } else if (state.isOutdated) {
      statusDotClass = 'warn';
      statusSubClass = 'warn';
      statusLabel = 'Parâmetros alterados · Recálculo pendente';
    } else if (!isSufficient) {
      statusDotClass = 'warn';
      statusSubClass = 'warn';
      statusLabel = `Dados insuficientes (${stats.count}/${cfg.minSampleRequired} trades)`;
    } else if (sim.isLowSampleWarning) {
      statusDotClass = 'warn';
      statusSubClass = 'warn';
      statusLabel = `Amostra reduzida (${stats.count} trades · mín. ideal ${cfg.minSampleRecommended})`;
    } else {
      statusDotClass = 'good';
      statusSubClass = '';
      statusLabel = 'Simulação válida';
    }

    // Banner de estado explícito (Dados insuficientes, Amostra reduzida, Modo Estudo ou Desatualizado)
    let stateBannerHtml = '';
    if (state.sourceMode === 'study_simulator') {
      stateBannerHtml = `
        <div class="ror-state-banner info" role="status">
          <div>
            <strong>🔬 Modo Estudo Ativo (Amostra do Simulador de Trades):</strong>
            Esta visualização utiliza os trades encerrados do Simulador de Trades (${stats.count} operações) exclusivamente para estudo estatístico de cenários. Não representa o saldo real da sua conta.
          </div>
          <div class="ror-state-banner-actions">
            <button type="button" class="ror-banner-btn" id="rorSwitchToRealAccountBtn">Voltar para Conta Real</button>
          </div>
        </div>
      `;
    } else if (!isSufficient) {
      stateBannerHtml = `
        <div class="ror-state-banner" role="alert">
          <div>
            <strong>⚠️ Dados insuficientes na conta real (${stats.count} de ${cfg.minSampleRequired} trades encerrados):</strong>
            ${esc(sim?.message || 'Registre e encerre operações no Trading Log Premium para habilitar a estimativa probabilística real.')}
            O sistema nunca exibe números fictícios como se fossem resultados reais da sua conta.
          </div>
          <div class="ror-state-banner-actions">
            <button type="button" class="ror-banner-btn" id="rorSwitchToStudySimulatorBtn">🔬 Explorar em Modo Estudo (Simulador)</button>
            <button type="button" class="ror-banner-btn" onclick="typeof go==='function'&&go('closedpositions')">Ver Posições Encerradas</button>
          </div>
        </div>
      `;
    } else if (sim.isLowSampleWarning) {
      stateBannerHtml = `
        <div class="ror-state-banner" role="status">
          <div>
            <strong>ℹ️ Aviso de baixa significância estatística (${stats.count} trades encerrados):</strong>
            A simulação foi executada com os seus dados reais, mas amostras inferiores a ${cfg.minSampleRecommended} trades possuem maior dispersão no bootstrap. Interprete os extremos com cautela.
          </div>
        </div>
      `;
    } else if (state.isOutdated) {
      stateBannerHtml = `
        <div class="ror-state-banner" role="status">
          <div>
            <strong>🔄 Resultado desatualizado:</strong>
            Os parâmetros ou a amostra de trades mudaram desde a última simulação. Clique em <b>Recalcular simulação</b> para atualizar as curvas.
          </div>
          <div class="ror-state-banner-actions">
            <button type="button" class="ror-banner-btn" id="rorBannerRecalcBtn">Recalcular agora</button>
          </div>
        </div>
      `;
    }

    // Formatação do Card 1 (Probabilidade de atingir o limite)
    let kpi1HighlightClass = '';
    let kpi1ValueHtml = '—';
    let kpi1SubHtml = 'Aguardando amostra mínima';

    if (isSufficient && ci) {
      if (ci.zeroOccurrences) {
        kpi1HighlightClass = 'highlight-good';
        kpi1ValueHtml = `<span class="ror-kpi-value zero-occ">0 ocorrências observadas nesta simulação</span>`;
        kpi1SubHtml = `Limite sup. IC 95%: ≤ ${fmtPct(ci.upperPct, 2)} (${ci.total.toLocaleString('pt-BR')} trajetórias)`;
      } else {
        kpi1HighlightClass = exceedsTolerance ? 'highlight-danger' : 'highlight-good';
        const valColorClass = exceedsTolerance ? 'danger' : 'good';
        kpi1ValueHtml = `<span class="ror-kpi-value ${valColorClass}">${fmtPct(ruinProb, 1)}</span>`;
        kpi1SubHtml = `IC 95%: ${fmtPct(ci.lowerPct, 1)} – ${fmtPct(ci.upperPct, 1)}`;
      }
    }

    const pcts = sim?.drawdownPercentiles || { p50: null, p75: null, p90: null, p95: null, p99: null };
    const scenarios = comp?.scenarios || [];

    container.innerHTML = `
      <div class="ror-page">
        <!-- 1. HERO HEADER -->
        <header class="ror-header">
          <div class="ror-header-left">
            <h1>Risco de Ruína</h1>
            <p>Proteção patrimonial e sobrevivência estatística</p>
          </div>

          <div class="ror-header-right">
            <div class="ror-status-cluster">
              <div class="ror-status-line">
                <span class="ror-status-dot ${statusDotClass}"></span>
                <span>Última simulação: ${esc(fmtDateTimeBR(state.lastCalculatedAt))}</span>
              </div>
              <span class="ror-status-sub ${statusSubClass}">Status: ${esc(statusLabel)}</span>
            </div>

            <div class="ror-header-Counters">
              <div class="ror-header-counter">
                <span>Histórico utilizado</span>
                <strong>${stats.count} trades</strong>
              </div>
              <div class="ror-header-counter">
                <span>Horizonte</span>
                <strong>${cfg.horizonTrades} trades</strong>
              </div>
              <div class="ror-header-counter">
                <span>Simulações</span>
                <strong>${cfg.simulationsCount.toLocaleString('pt-BR')}</strong>
              </div>
            </div>
          </div>
        </header>

        ${stateBannerHtml}

        <!-- 2. TOP WORKBENCH (MAIN COLUMN + CONFIG SIDEBAR) -->
        <div class="ror-workbench-top">
          <div class="ror-main-col">
            <!-- 5 KPI CARDS -->
            <section class="ror-kpi-grid" aria-label="Indicadores principais de Risco de Ruína">
              <!-- KPI 1 -->
              <article class="ror-kpi-card ${kpi1HighlightClass}">
                <div>
                  <div class="ror-kpi-label">Probabilidade de atingir o limite</div>
                  ${kpi1ValueHtml}
                </div>
                <div class="ror-kpi-foot">
                  <span class="ror-kpi-sub">${esc(kpi1SubHtml)}</span>
                  <span class="ror-kpi-icon" aria-hidden="true">📉</span>
                </div>
              </article>

              <!-- KPI 2 -->
              <article class="ror-kpi-card">
                <div>
                  <div class="ror-kpi-label">Drawdown máximo configurado</div>
                  <div class="ror-kpi-value">${fmtPct(cfg.maxDrawdownLimitPct, 0)}</div>
                </div>
                <div class="ror-kpi-foot">
                  <span class="ror-kpi-sub">Limite de proteção (Tolerância: ${fmtPct(cfg.ruinProbabilityTolerancePct, 1)})</span>
                  <span class="ror-kpi-icon" aria-hidden="true">🛡️</span>
                </div>
              </article>

              <!-- KPI 3 -->
              <article class="ror-kpi-card">
                <div>
                  <div class="ror-kpi-label">Drawdown máximo histórico</div>
                  <div class="ror-kpi-value">${stats.count > 0 ? fmtPct(stats.observedMaxDrawdownPct, 1) : '—'}</div>
                </div>
                <div class="ror-kpi-foot">
                  <span class="ror-kpi-sub">Atual do pico real: <b>${stats.count > 0 ? fmtPct(stats.observedCurrentDrawdownPct, 1) : '0,0%'}</b></span>
                  <span class="ror-kpi-icon" aria-hidden="true">📊</span>
                </div>
              </article>

              <!-- KPI 4 -->
              <article class="ror-kpi-card">
                <div>
                  <div class="ror-kpi-label">Expectancy média por trade</div>
                  <div class="ror-kpi-value ${stats.expectancyR > 0 ? 'good' : (stats.expectancyR < 0 ? 'danger' : '')}">
                    ${stats.count > 0 ? fmtSignedR(stats.expectancyR, 2) : '—'}
                  </div>
                </div>
                <div class="ror-kpi-foot">
                  <span class="ror-kpi-sub">Win rate: ${stats.count > 0 ? fmtPct(stats.winRatePct, 0) : '—'} | Payoff: ${stats.payoffRatio ? fmtNum(stats.payoffRatio, 2) : '—'}</span>
                  <span class="ror-kpi-icon" aria-hidden="true">📈</span>
                </div>
              </article>

              <!-- KPI 5 -->
              <article class="ror-kpi-card">
                <div>
                  <div class="ror-kpi-label">Risco por trade (atual)</div>
                  <div class="ror-kpi-value">${fmtPct(cfg.riskPerTradePct, 2)}</div>
                </div>
                <div class="ror-kpi-foot">
                  <span class="ror-kpi-sub">${cfg.riskModel === 'fixed' ? 'Risco monetário fixo' : 'Política da conta (composto)'}</span>
                  <span class="ror-kpi-icon" aria-hidden="true">⚖️</span>
                </div>
              </article>
            </section>

            <!-- CHARTS ROW -->
            <section class="ror-charts-row">
              <!-- CHART 1: HISTOGRAMA + PERCENTIS -->
              <article class="ror-card">
                <h2 class="ror-card-title">
                  <span>Distribuição dos Drawdowns Máximos (Monte Carlo)</span>
                </h2>
                <div class="ror-histogram-layout">
                  ${renderDrawdownHistogramSvg(sim)}
                  <aside class="ror-percentiles-box" aria-label="Percentis dos drawdowns simulados">
                    <h4>Percentis dos drawdowns</h4>
                    <div class="ror-percentile-row">
                      <span>Mediana (P50):</span>
                      <strong>${isSufficient ? fmtPct(pcts.p50, 1) : '—'}</strong>
                    </div>
                    <div class="ror-percentile-row">
                      <span>P75:</span>
                      <strong>${isSufficient ? fmtPct(pcts.p75, 1) : '—'}</strong>
                    </div>
                    <div class="ror-percentile-row">
                      <span>P90:</span>
                      <strong>${isSufficient ? fmtPct(pcts.p90, 1) : '—'}</strong>
                    </div>
                    <div class="ror-percentile-row">
                      <span>P95:</span>
                      <strong>${isSufficient ? fmtPct(pcts.p95, 1) : '—'}</strong>
                    </div>
                    <div class="ror-percentile-row">
                      <span>P99:</span>
                      <strong style="color: ${isSufficient && pcts.p99 >= cfg.maxDrawdownLimitPct ? '#dc2626' : 'inherit'}">
                        ${isSufficient ? fmtPct(pcts.p99, 1) : '—'}
                      </strong>
                    </div>
                  </aside>
                </div>
              </article>

              <!-- CHART 2: EVOLUÇÃO DE TRAJETÓRIAS SIMULADAS -->
              <article class="ror-card">
                <h2 class="ror-card-title">
                  <span>Evolução de trajetórias simuladas</span>
                </h2>
                ${renderTrajectoriesChartSvg(sim)}
                <div class="ror-chart-legend">
                  <span class="ror-legend-item"><i class="ror-legend-line paths"></i> Trajetórias simuladas</span>
                  <span class="ror-legend-item"><i class="ror-legend-line median"></i> Mediana (P50)</span>
                  <span class="ror-legend-item"><i class="ror-legend-line limit"></i> Piso de drawdown (${fmtNum(100 - cfg.maxDrawdownLimitPct, 0)} pts)</span>
                </div>
              </article>
            </section>
          </div>

          <!-- RIGHT SIDEBAR: CONFIGURAÇÕES DA SIMULAÇÃO -->
          <aside class="ror-config-card" aria-label="Configurações da simulação">
            <div>
              <div class="ror-config-head">
                <span aria-hidden="true">⚙️</span>
                <span>Configurações da simulação</span>
              </div>

              <div class="ror-config-form" style="margin-top: 14px;">
                <div class="ror-config-row">
                  <label for="rorInputLimitDd">Limite de drawdown máx.</label>
                  <div class="ror-input-group">
                    <input id="rorInputLimitDd" type="number" min="5" max="95" step="1" value="${cfg.maxDrawdownLimitPct}" />
                    <span>%</span>
                  </div>
                </div>

                <div class="ror-config-row">
                  <label for="rorInputTolerance">Tolerância de ruína</label>
                  <div class="ror-input-group">
                    <input id="rorInputTolerance" type="number" min="0.1" max="50" step="0.1" value="${cfg.ruinProbabilityTolerancePct}" />
                    <span>%</span>
                  </div>
                </div>

                <div class="ror-config-row">
                  <label for="rorInputHorizon">Horizonte de trades</label>
                  <div class="ror-input-group">
                    <input id="rorInputHorizon" type="number" min="10" max="2000" step="10" value="${cfg.horizonTrades}" />
                  </div>
                </div>

                <div class="ror-config-row">
                  <label for="rorInputSims">Número de simulações</label>
                  <div class="ror-input-group">
                    <input id="rorInputSims" type="number" min="1000" max="50000" step="1000" value="${cfg.simulationsCount}" />
                  </div>
                </div>

                <div class="ror-config-row">
                  <label for="rorInputRiskPct">Risco por trade (atual)</label>
                  <div class="ror-input-group">
                    <input id="rorInputRiskPct" type="number" min="0.05" max="10" step="0.05" value="${cfg.riskPerTradePct.toFixed(2)}" />
                    <span>%</span>
                  </div>
                </div>

                <div class="ror-config-stack">
                  <label for="rorSelectRiskModel">Modelo de capitalização</label>
                  <select id="rorSelectRiskModel" class="ror-config-select">
                    <option value="compounding" ${cfg.riskModel === 'compounding' ? 'selected' : ''}>Percentual do patrimônio atualizado</option>
                    <option value="fixed" ${cfg.riskModel === 'fixed' ? 'selected' : ''}>Risco monetário fixo (capital inicial)</option>
                  </select>
                </div>

                <div class="ror-config-stack">
                  <label for="rorSelectWindow">Janela histórica</label>
                  <select id="rorSelectWindow" class="ror-config-select">
                    <option value="ALL" ${cfg.historyWindow === 'ALL' ? 'selected' : ''}>Todo o histórico (${stats.count} trades)</option>
                    <option value="LAST_100" ${cfg.historyWindow === 'LAST_100' ? 'selected' : ''}>Últimos 100 trades</option>
                    <option value="LAST_50" ${cfg.historyWindow === 'LAST_50' ? 'selected' : ''}>Últimos 50 trades</option>
                    <option value="LAST_365D" ${cfg.historyWindow === 'LAST_365D' ? 'selected' : ''}>Últimos 12 meses</option>
                    <option value="LAST_180D" ${cfg.historyWindow === 'LAST_180D' ? 'selected' : ''}>Últimos 6 meses</option>
                  </select>
                </div>

                <div class="ror-config-stack">
                  <label for="rorSelectSourceMode">Fonte de dados da amostra</label>
                  <select id="rorSelectSourceMode" class="ror-config-select">
                    <option value="real_account" ${state.sourceMode === 'real_account' ? 'selected' : ''}>Trading Log Real (Conta)</option>
                    <option value="study_simulator" ${state.sourceMode === 'study_simulator' ? 'selected' : ''}>Modo Estudo (Simulador de Trades)</option>
                  </select>
                </div>
              </div>
            </div>

            <button type="button" class="ror-recalc-btn" id="rorRecalculateBtn">
              <span>🔄</span>
              <span>Recalcular simulação</span>
            </button>
          </aside>
        </div>

        <!-- 3. MIDDLE ROW: COMPARAÇÃO DE CENÁRIOS + RECOMENDAÇÃO DE REDUÇÃO DE MÃO -->
        <div class="ror-middle-row">
          <!-- TABELA DE CENÁRIOS -->
          <article class="ror-card">
            <h2 class="ror-card-title">
              <span>Comparação de cenários de risco por trade</span>
              <small style="font-size: 11.5px; font-weight: 600; color: var(--muted, #52665c);">Mesmo histórico, seed (${cfg.seed}) e horizonte (${cfg.horizonTrades} trades)</small>
            </h2>
            <div class="ror-table-wrap">
              <table class="ror-scenario-table">
                <thead>
                  <tr>
                    <th>Cenário</th>
                    <th>Risco / trade</th>
                    <th>Prob. de atingir ${fmtNum(cfg.maxDrawdownLimitPct, 0)}% DD</th>
                    <th>DD mediano (P50)</th>
                    <th>DD P95</th>
                    <th>IC 95%</th>
                  </tr>
                </thead>
                <tbody>
                  ${scenarios.length > 0 ? scenarios.map(sc => {
                    const scCi = sc.confidenceInterval95;
                    const probLabel = scCi?.zeroOccurrences
                      ? `<span style="color:#15803d;font-weight:700;">0 ocorr. (≤ ${fmtPct(scCi.upperPct, 2)})</span>`
                      : `<span style="color:${sc.ruinProbabilityPct > cfg.ruinProbabilityTolerancePct ? '#dc2626' : '#15803d'};font-weight:700;">${fmtPct(sc.ruinProbabilityPct, 1)}</span>`;
                    const ciLabel = scCi?.zeroOccurrences
                      ? `0,0% – ${fmtPct(scCi.upperPct, 2)}`
                      : `${fmtPct(scCi.lowerPct, 1)} – ${fmtPct(scCi.upperPct, 1)}`;
                    return `
                      <tr class="${sc.isCurrent ? 'is-current' : ''}">
                        <td>${esc(sc.label)}${sc.isCurrent ? ' ★' : ''}</td>
                        <td>${fmtPct(sc.riskPerTradePct, 2)}</td>
                        <td>${probLabel}</td>
                        <td>${fmtPct(sc.medianDrawdownPct, 1)}</td>
                        <td>${fmtPct(sc.p95DrawdownPct, 1)}</td>
                        <td style="font-size: 11.5px; color: var(--muted, #52665c);">${ciLabel}</td>
                      </tr>
                    `;
                  }).join('') : `
                    <tr>
                      <td colspan="6" style="text-align: center; padding: 24px; color: var(--muted, #52665c);">
                        Aguardando amostra mínima (${cfg.minSampleRequired} trades encerrados) para comparar cenários de risco.
                      </td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          </article>

          <!-- CARD DE RECOMENDAÇÃO DE REDUÇÃO DE MÃO -->
          <article class="ror-recommendation-card ${rec?.shouldReduceHand ? '' : 'good'}">
            <div>
              <div class="ror-rec-head">
                <span class="ror-rec-icon" aria-hidden="true">${rec?.shouldReduceHand ? '⚠️' : '🛡️'}</span>
                <div>
                  <div class="ror-rec-eyebrow">Recomendação de redução de mão</div>
                  <h3 class="ror-rec-title">${esc(rec?.headline || 'Avaliação consultiva de risco')}</h3>
                </div>
              </div>
              <p class="ror-rec-body" style="margin-top: 12px;">
                ${esc(rec?.justification || '')}
              </p>
              ${rec?.policyConstraintsSummary ? `
                <div style="margin-top: 10px; font-size: 11.5px; color: #475569; display: flex; gap: 12px; flex-wrap: wrap;">
                  <span>Perfil ativo: <b>${esc(rec.policyConstraintsSummary.profileLabel)}</b></span>
                  <span>Heat máx.: <b>${fmtPct(rec.policyConstraintsSummary.maxPortfolioHeatPct, 1)}</b></span>
                  <span>Máx. posições: <b>${rec.policyConstraintsSummary.maxPositions}</b></span>
                </div>
              ` : ''}
            </div>

            ${rec?.shouldReduceHand && rec.recommendedRiskPct ? `
              <button type="button" class="ror-rec-btn" id="rorSimulateRecommendedRiskBtn" data-recommended-risk="${rec.recommendedRiskPct}">
                <span>Simular ajuste para ${fmtPct(rec.recommendedRiskPct, 2)} (Consultivo)</span>
                <span>→</span>
              </button>
            ` : `
              <button type="button" class="ror-rec-btn" onclick="typeof go==='function'&&go('riskpolicy')">
                <span>Revisar Política de Risco & Position Sizing</span>
                <span>→</span>
              </button>
            `}
          </article>
        </div>

        <!-- 4. ECOSYSTEM TOUCHPOINTS ROW (OS 4 PONTOS DE INTEGRAÇÃO) -->
        <section class="ror-touchpoints-grid" aria-label="Integração transversal no ecossistema">
          <!-- CARD 1: DASHBOARD PATRIMONIAL -->
          <article class="ror-tp-card">
            <div class="ror-tp-head">
              <span class="ror-tp-num">1</span>
              <div>
                <h3>Dashboard Patrimonial</h3>
                <p>Resumo prioritário</p>
              </div>
            </div>
            <div class="ror-tp-inner">
              <div class="ror-tp-title-row">
                <span>Proteção Patrimonial (Risco de Ruína)</span>
                <button type="button" class="ror-banner-btn" style="padding: 3px 8px; font-size: 11px;" onclick="typeof go==='function'&&go('dashboard')">Abrir →</button>
              </div>
              <div class="ror-tp-metrics-2col">
                <div>
                  <div style="font-size: 11px; color: var(--muted);">Prob. de atingir ${fmtNum(cfg.maxDrawdownLimitPct, 0)}% DD</div>
                  <div style="font-size: 20px; font-weight: 800; color: ${exceedsTolerance ? '#dc2626' : '#15803d'};">
                    ${isSufficient ? (ci?.zeroOccurrences ? `≤ ${fmtPct(ci.upperPct, 2)}` : fmtPct(ruinProb, 1)) : '—'}
                  </div>
                </div>
                <div>
                  <div style="font-size: 11px; color: var(--muted);">Drawdown atual</div>
                  <div style="font-size: 20px; font-weight: 800;">${fmtPct(stats.observedCurrentDrawdownPct, 1)}</div>
                  <div style="font-size: 10.5px; color: var(--muted);">Risco/trade: <b>${fmtPct(cfg.riskPerTradePct, 2)}</b></div>
                </div>
              </div>
              <div class="ror-tp-status-pill ${rec?.shouldReduceHand ? 'warn' : 'good'}">
                <span>${rec?.shouldReduceHand ? `⚠️ Reduzir mão p/ ${fmtPct(rec.recommendedRiskPct, 2)}` : '✓ Dimensionamento dentro da tolerância'}</span>
              </div>
            </div>
          </article>

          <!-- CARD 2: POLÍTICA DE RISCO & POSITION SIZING -->
          <article class="ror-tp-card">
            <div class="ror-tp-head">
              <span class="ror-tp-num">2</span>
              <div>
                <h3>Política de Risco</h3>
                <p>Parâmetros e limitadores</p>
              </div>
            </div>
            <div class="ror-tp-inner">
              <div class="ror-tp-title-row">
                <span>Fonte da Verdade Operacional</span>
                <button type="button" class="ror-banner-btn" style="padding: 3px 8px; font-size: 11px;" onclick="typeof go==='function'&&go('riskpolicy')">Abrir →</button>
              </div>
              <div class="ror-tp-kv">
                <span>Risco nominal por trade (política):</span>
                <strong>${fmtPct(cfg.riskPerTradePct, 2)}</strong>
              </div>
              <div class="ror-tp-kv">
                <span>Teto de drawdown configurado:</span>
                <strong>${fmtNum(cfg.maxDrawdownLimitPct, 0)}%</strong>
              </div>
              <div class="ror-tp-kv">
                <span>Tolerância máx. de ruína:</span>
                <strong>${fmtPct(cfg.ruinProbabilityTolerancePct, 1)}</strong>
              </div>
              <div style="font-size: 11px; color: var(--muted); line-height: 1.35;">
                Dimensionamento regulado pelas 3 camadas (Risco, ATR, Capital). Recomendações estatísticas apoiam a revisão da política geral de risco.
              </div>
            </div>
          </article>

          <!-- CARD 3: SIMULADOR DE TRADES -->
          <article class="ror-tp-card">
            <div class="ror-tp-head">
              <span class="ror-tp-num">3</span>
              <div>
                <h3>Simulador de Trades</h3>
                <p>Análise de cenários</p>
              </div>
            </div>
            <div class="ror-tp-inner">
              <div class="ror-tp-title-row">
                <span>Sensibilidade ao Risco por Trade</span>
                <button type="button" class="ror-banner-btn" style="padding: 3px 8px; font-size: 11px;" onclick="typeof go==='function'&&go('tradesimulator')">Abrir →</button>
              </div>
              ${scenarios.slice(0, 3).map(sc => `
                <div class="${sc.isCurrent ? 'ror-tp-highlight-row' : 'ror-tp-kv'}">
                  <span>Cenário (${fmtPct(sc.riskPerTradePct, 2)}):</span>
                  <strong>${fmtPct(sc.ruinProbabilityPct, 1)} Ruin | ${fmtPct(sc.medianDrawdownPct, 1)} DD</strong>
                </div>
              `).join('') || '<div style="font-size:12px;color:var(--muted);">Sem cenários calculados.</div>'}
            </div>
          </article>

          <!-- CARD 4: RESULTADOS / ESTATÍSTICAS -->
          <article class="ror-tp-card">
            <div class="ror-tp-head">
              <span class="ror-tp-num">4</span>
              <div>
                <h3>Resultados / Estatísticas</h3>
                <p>Histórico vs Projeção</p>
              </div>
            </div>
            <div class="ror-tp-inner">
              <div class="ror-tp-title-row">
                <span>Métricas de Risco e Drawdown</span>
                <button type="button" class="ror-banner-btn" style="padding: 3px 8px; font-size: 11px;" onclick="typeof go==='function'&&go('analytics')">Abrir →</button>
              </div>
              <div class="ror-tp-kv">
                <span>Drawdown máx. histórico (observado):</span>
                <strong>${stats.count > 0 ? fmtPct(stats.observedMaxDrawdownPct, 1) : '—'}</strong>
              </div>
              <div class="ror-tp-kv">
                <span>Drawdown atual do pico real:</span>
                <strong>${fmtPct(stats.observedCurrentDrawdownPct, 1)}</strong>
              </div>
              <div class="ror-tp-kv">
                <span>Prob. projetada (${cfg.horizonTrades} trades):</span>
                <strong style="color: ${exceedsTolerance ? '#dc2626' : '#15803d'};">${isSufficient ? fmtPct(ruinProb, 1) : '—'}</strong>
              </div>
              <div style="font-size: 10.5px; color: var(--muted);">
                Projeção estatística separada do histórico realizado.
              </div>
            </div>
          </article>
        </section>

        <!-- 5. AUDITORIA METODOLÓGICA E LIMITAÇÕES EXPLÍCITAS -->
        <footer class="ror-audit-card" aria-label="Premissas e limitações metodológicas">
          <div class="ror-audit-card-head">
            <span class="ror-audit-eyebrow">AUDITORIA METODOLÓGICA & LIMITAÇÕES ESTATÍSTICAS</span>
            <span class="ror-audit-badge">Modelo Certificado · Risco de Ruína</span>
          </div>
          <div class="ror-audit-meta">
            <div class="ror-audit-meta-item"><span>Motor estatístico:</span> <b>Monte Carlo Bootstrap (${esc(Model.MODEL_VERSION)})</b></div>
            <div class="ror-audit-meta-item"><span>Seed reprodutível:</span> <b>#${cfg.seed}</b></div>
            <div class="ror-audit-meta-item"><span>Amostra válida:</span> <b>${stats.count} trades</b> ${sim?.invalidRecordsIgnored ? `(${sim.invalidRecordsIgnored} ignorados por falta de R válido)` : ''}</div>
            <div class="ror-audit-meta-item"><span>Critério de ruína:</span> <b>Drawdown ≥ ${fmtPct(cfg.maxDrawdownLimitPct, 0)} em até ${cfg.horizonTrades} trades</b></div>
          </div>
          <ul class="ror-limitations-list">
            ${Model.STATISTICAL_LIMITATIONS.map(item => `<li>${esc(item)}</li>`).join('')}
          </ul>
        </footer>
      </div>
    `;

    bindPageEvents(container);
  }

  function bindPageEvents(container) {
    const markOutdated = () => {
      state.isOutdated = true;
    };

    ['rorInputLimitDd', 'rorInputTolerance', 'rorInputHorizon', 'rorInputSims', 'rorInputRiskPct', 'rorSelectRiskModel', 'rorSelectWindow'].forEach(id => {
      const el = container.querySelector(`#${id}`);
      if (el) {
        el.addEventListener('change', markOutdated);
      }
    });

    const sourceSelect = container.querySelector('#rorSelectSourceMode');
    if (sourceSelect) {
      sourceSelect.addEventListener('change', (e) => {
        state.sourceMode = e.target.value === 'study_simulator' ? 'study_simulator' : 'real_account';
        runCalculation();
      });
    }

    const applyAndRecalculate = () => {
      const limitVal = Number(container.querySelector('#rorInputLimitDd')?.value);
      const tolVal = Number(container.querySelector('#rorInputTolerance')?.value);
      const horVal = Number(container.querySelector('#rorInputHorizon')?.value);
      const simsVal = Number(container.querySelector('#rorInputSims')?.value);
      const riskVal = Number(container.querySelector('#rorInputRiskPct')?.value);
      const modelVal = container.querySelector('#rorSelectRiskModel')?.value;
      const winVal = container.querySelector('#rorSelectWindow')?.value;

      saveConfig({
        maxDrawdownLimitPct: limitVal,
        ruinProbabilityTolerancePct: tolVal,
        horizonTrades: horVal,
        simulationsCount: simsVal,
        riskPerTradePct: riskVal,
        riskModel: modelVal,
        historyWindow: winVal
      });

      runCalculation();
      if (typeof root.showToast === 'function') {
        root.showToast('Simulação de Monte Carlo atualizada com sucesso.');
      }
    };

    container.querySelector('#rorRecalculateBtn')?.addEventListener('click', applyAndRecalculate);
    container.querySelector('#rorBannerRecalcBtn')?.addEventListener('click', applyAndRecalculate);

    container.querySelector('#rorSwitchToStudySimulatorBtn')?.addEventListener('click', () => {
      state.sourceMode = 'study_simulator';
      runCalculation();
    });

    container.querySelector('#rorSwitchToRealAccountBtn')?.addEventListener('click', () => {
      state.sourceMode = 'real_account';
      runCalculation();
    });

    container.querySelector('#rorSimulateRecommendedRiskBtn')?.addEventListener('click', (e) => {
      const recRisk = Number(e.currentTarget.dataset.recommendedRisk);
      if (Number.isFinite(recRisk) && recRisk > 0) {
        saveConfig({ riskPerTradePct: recRisk });
        runCalculation();
        if (typeof root.showToast === 'function') {
          root.showToast(`Cenário consultivo simulado com risco de ${fmtPct(recRisk, 2)} por trade.`);
        }
      }
    });
  }

  // =========================================================================
  // CROSS-SCREEN TOUCHPOINT 1: DASHBOARD PATRIMONIAL (#dashboard)
  // =========================================================================
  function buildWealthDashboardCardHtml() {
    const realTrades = getRealAccountClosedTrades();
    const accountDd = getAccountRealDrawdownMetrics();
    const sim = Model.runMonteCarloSimulation(realTrades, state.config, {
      accountCurrentDrawdownPct: accountDd.currentDrawdownPct,
      accountMaxDrawdownPct: accountDd.maxDrawdownPct
    });
    const comp = Model.compareRiskScenarios(realTrades, state.config);
    const rec = Model.evaluateHandRecommendation({
      simulationResult: sim,
      scenarioComparison: comp,
      riskPolicy: root.riskPolicyState || null,
      portfolioHeat: getPortfolioHeatSnapshotSafe()
    });

    const cfg = state.config;
    const isSufficient = Boolean(sim && sim.isSufficientSample);
    const ci = sim?.confidenceInterval95;
    const exceeds = isSufficient && sim.ruinProbabilityPct > cfg.ruinProbabilityTolerancePct;

    return `
      <section class="wealth-card wealth-panel ror-wealth-summary-card" style="margin-bottom: 20px; cursor: pointer;" onclick="typeof go==='function'&&go('riskofruin')" role="region" aria-label="Resumo de Proteção Patrimonial Risco de Ruína">
        <header class="panel-header" style="margin-bottom: 14px;">
          <div>
            <span style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted, #52665c);">PROTEÇÃO PATRIMONIAL · MONTE CARLO (${cfg.horizonTrades} TRADES)</span>
            <h2 style="margin-top: 2px;">Risco de Ruína & Sobrevivência Estatística</h2>
            <p>Estimativa baseada no histórico real encerrado (${sim.sampleStats.count} trade${sim.sampleStats.count === 1 ? '' : 's'}) · Último cálculo: ${esc(fmtDateTimeBR(sim.calculatedAt))}</p>
          </div>
          <div class="panel-header-actions" style="display: flex; align-items: center; gap: 10px;">
            <span class="ror-tp-status-pill ${!isSufficient ? '' : (rec.shouldReduceHand ? 'warn' : 'good')}">
              ${!isSufficient
                ? `Amostra insuficiente (${sim.sampleStats.count}/${cfg.minSampleRequired})`
                : (rec.shouldReduceHand ? `⚠️ Recomendação: reduzir mão p/ ${fmtPct(rec.recommendedRiskPct, 2)}` : '✓ Risco dentro da tolerância')}
            </span>
            <button type="button" class="btn-policy-link" onclick="event.stopPropagation();typeof go==='function'&&go('riskofruin')">Abrir análise completa →</button>
          </div>
        </header>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px;">
          <div style="padding: 12px 14px; border-radius: 12px; background: rgba(15,42,32,0.03); border: 1px solid var(--line, #dce6df);">
            <small style="display:block;font-size:11px;color:var(--muted);">Prob. de atingir ${fmtNum(cfg.maxDrawdownLimitPct, 0)}% DD</small>
            <strong style="font-size:20px;font-weight:800;color:${!isSufficient ? 'var(--ink)' : (exceeds ? '#dc2626' : '#15803d')};">
              ${!isSufficient ? 'Dados insuf.' : (ci?.zeroOccurrences ? `0 ocorr. (≤ ${fmtPct(ci.upperPct, 2)})` : fmtPct(sim.ruinProbabilityPct, 1))}
            </strong>
            <small style="display:block;font-size:10.5px;color:var(--muted);margin-top:2px;">
              ${!isSufficient ? `Mínimo de ${cfg.minSampleRequired} trades fechados` : `Tolerância: ${fmtPct(cfg.ruinProbabilityTolerancePct, 1)}`}
            </small>
          </div>

          <div style="padding: 12px 14px; border-radius: 12px; background: rgba(15,42,32,0.03); border: 1px solid var(--line, #dce6df);">
            <small style="display:block;font-size:11px;color:var(--muted);">Limite de Drawdown Configurado</small>
            <strong style="font-size:20px;font-weight:800;">${fmtPct(cfg.maxDrawdownLimitPct, 0)}</strong>
            <small style="display:block;font-size:10.5px;color:var(--muted);margin-top:2px;">Horizonte de ${cfg.horizonTrades} operações</small>
          </div>

          <div style="padding: 12px 14px; border-radius: 12px; background: rgba(15,42,32,0.03); border: 1px solid var(--line, #dce6df);">
            <small style="display:block;font-size:11px;color:var(--muted);">Drawdown Atual (do Pico Real)</small>
            <strong style="font-size:20px;font-weight:800;">${fmtPct(sim.sampleStats.observedCurrentDrawdownPct, 1)}</strong>
            <small style="display:block;font-size:10.5px;color:var(--muted);margin-top:2px;">Máx. histórico: ${fmtPct(sim.sampleStats.observedMaxDrawdownPct, 1)}</small>
          </div>

          <div style="padding: 12px 14px; border-radius: 12px; background: rgba(15,42,32,0.03); border: 1px solid var(--line, #dce6df);">
            <small style="display:block;font-size:11px;color:var(--muted);">Risco por Trade Atual</small>
            <strong style="font-size:20px;font-weight:800;">${fmtPct(cfg.riskPerTradePct, 2)}</strong>
            <small style="display:block;font-size:10.5px;color:var(--muted);margin-top:2px;">
              ${rec.shouldReduceHand ? `Sugerido: ${fmtPct(rec.recommendedRiskPct, 2)} (consultivo)` : 'Alinhado à Política de Risco'}
            </small>
          </div>
        </div>
      </section>
    `;
  }

  // =========================================================================
  // NOVO TRADE: DESACOPLADO
  // O fluxo de abertura de trades é independente de Risco de Ruína.
  // Preserva apenas a remoção de qualquer elemento residual de sessões prévias.
  // =========================================================================
  function renderNewTradePreEntryPanel() {
    try {
      const existing = document.getElementById('newTradeRiskOfRuinPanel');
      if (existing) existing.remove();
    } catch (_) {}
  }

  // =========================================================================
  // CROSS-SCREEN TOUCHPOINT 3: SIMULADOR DE TRADES (#tradesimulator)
  // =========================================================================
  function renderTradeSimulatorScenarioSection() {
    const simRoot = document.getElementById('tradeSimulatorRoot');
    if (!simRoot) return;

    let section = document.getElementById('simRiskOfRuinScenarioSection');
    if (!section) {
      section = document.createElement('section');
      section.id = 'simRiskOfRuinScenarioSection';
      section.className = 'ror-embedded-card';
      section.style.margin = '18px 0';
      const tableSec = simRoot.querySelector('.sim-table-card') || simRoot.querySelector('.simulator-page')?.lastElementChild;
      if (tableSec && tableSec.parentNode) {
        tableSec.parentNode.insertBefore(section, tableSec);
      } else {
        simRoot.appendChild(section);
      }
    }

    const simTrades = getSimulatorClosedTrades();
    const comp = Model.compareRiskScenarios(simTrades, state.config, state.simulatorCustomRisks);
    const cfg = state.config;

    section.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:14px;">
        <div>
          <span style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted,#52665c);">ANÁLISE CONSULTIVA DE CENÁRIOS · MONTE CARLO</span>
          <h3 style="margin:2px 0 0;font-size:16px;font-weight:800;color:var(--ink,#0f2a20);">Sensibilidade de Risco de Ruína na Amostra do Simulador (${simTrades.length} trades encerrados)</h3>
          <p style="margin:3px 0 0;font-size:12px;color:var(--muted,#52665c);">
            Compara diferentes níveis de risco por trade sobre o mesmo histórico simulado, horizonte de ${cfg.horizonTrades} trades, limite de ${fmtNum(cfg.maxDrawdownLimitPct, 0)}% DD e seed #${cfg.seed}. Simulação consultiva — não modifica a conta real.
          </p>
        </div>
        <button type="button" class="ror-banner-btn" onclick="typeof go==='function'&&go('riskofruin')">Abrir módulo Risco de Ruína →</button>
      </div>

      <div class="ror-table-wrap">
        <table class="ror-scenario-table">
          <thead>
            <tr>
              <th>Cenário de Risco</th>
              <th>Risco por Trade</th>
              <th>Prob. de atingir ${fmtNum(cfg.maxDrawdownLimitPct, 0)}% DD</th>
              <th>Drawdown Mediano (P50)</th>
              <th>Drawdown P90</th>
              <th>Drawdown P95</th>
              <th>IC 95% Binomial</th>
            </tr>
          </thead>
          <tbody>
            ${comp.scenarios.map(sc => {
              const ci = sc.confidenceInterval95;
              return `
                <tr class="${sc.isCurrent ? 'is-current' : ''}">
                  <td>${esc(sc.label)}${sc.isCurrent ? ' (Referência)' : ''}</td>
                  <td><b>${fmtPct(sc.riskPerTradePct, 2)}</b></td>
                  <td style="font-weight:700;color:${sc.ruinProbabilityPct > cfg.ruinProbabilityTolerancePct ? '#dc2626' : '#15803d'};">
                    ${ci?.zeroOccurrences ? `0 ocorr. (≤ ${fmtPct(ci.upperPct, 2)})` : fmtPct(sc.ruinProbabilityPct, 1)}
                  </td>
                  <td>${fmtPct(sc.medianDrawdownPct, 1)}</td>
                  <td>${fmtPct(sc.p90DrawdownPct, 1)}</td>
                  <td>${fmtPct(sc.p95DrawdownPct, 1)}</td>
                  <td style="font-size:11.5px;color:var(--muted);">${ci?.zeroOccurrences ? `0,0% – ${fmtPct(ci.upperPct, 2)}` : `${fmtPct(ci.lowerPct, 1)} – ${fmtPct(ci.upperPct, 1)}`}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // =========================================================================
  // CROSS-SCREEN TOUCHPOINT 4: RESULTADOS / ESTATÍSTICAS (#analytics)
  // =========================================================================
  function renderAnalyticsSummarySection(customTrades = null) {
    const analyticsPage = document.getElementById('analytics');
    if (!analyticsPage) return;

    let section = document.getElementById('analyticsRiskOfRuinSummary');
    if (!section) {
      section = document.createElement('section');
      section.id = 'analyticsRiskOfRuinSummary';
      section.className = 'ror-embedded-card';
      analyticsPage.appendChild(section);
    }

    const tradesToUse = Array.isArray(customTrades) ? customTrades : getRealAccountClosedTrades();
    const accountDd = getAccountRealDrawdownMetrics();
    const sim = Model.runMonteCarloSimulation(tradesToUse, state.config, {
      accountCurrentDrawdownPct: accountDd.currentDrawdownPct,
      accountMaxDrawdownPct: accountDd.maxDrawdownPct
    });

    const cfg = state.config;
    const isSufficient = Boolean(sim && sim.isSufficientSample);
    const ci = sim?.confidenceInterval95;

    section.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
        <div>
          <span style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted,#52665c);">HISTÓRICO OBSERVADO VS PROJEÇÃO ESTATÍSTICA</span>
          <h3 style="margin:2px 0 0;font-size:16px;font-weight:800;color:var(--ink,#0f2a20);">Métricas de Drawdown e Risco de Ruína</h3>
          <p style="margin:2px 0 0;font-size:12px;color:var(--muted,#52665c);">
            Separação rigorosa entre o que ocorreu no histórico realizado e a projeção probabilística de Monte Carlo para os próximos ${cfg.horizonTrades} trades.
          </p>
        </div>
        <button type="button" class="ror-banner-btn" onclick="typeof go==='function'&&go('riskofruin')">Ver simulação completa →</button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
        <div style="padding:14px;border-radius:12px;background:#f8faf9;border:1px solid var(--line,#dce6df);">
          <span style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--muted);">1. Histórico Realizado (Passado)</span>
          <div style="font-size:12px;color:var(--muted);margin-top:4px;">Drawdown Máximo Histórico Observado</div>
          <strong style="font-size:22px;font-weight:800;color:var(--ink);">${sim.sampleStats.count > 0 ? fmtPct(sim.sampleStats.observedMaxDrawdownPct, 1) : '—'}</strong>
          <small style="display:block;font-size:11px;color:var(--muted);margin-top:4px;">Amostra analisada: ${sim.sampleStats.count} trade(s) encerrado(s)</small>
        </div>

        <div style="padding:14px;border-radius:12px;background:#f8faf9;border:1px solid var(--line,#dce6df);">
          <span style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--muted);">2. Estado Atual da Conta (Presente)</span>
          <div style="font-size:12px;color:var(--muted);margin-top:4px;">Drawdown Atual em Relação ao Pico Real</div>
          <strong style="font-size:22px;font-weight:800;color:var(--ink);">${fmtPct(sim.sampleStats.observedCurrentDrawdownPct, 1)}</strong>
          <small style="display:block;font-size:11px;color:var(--muted);margin-top:4px;">Limite máximo configurado: ${fmtPct(cfg.maxDrawdownLimitPct, 0)}</small>
        </div>

        <div style="padding:14px;border-radius:12px;background:#f8faf9;border:1px solid var(--line,#dce6df);">
          <span style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--muted);">3. Projeção Monte Carlo (Futuro · ${cfg.horizonTrades} trades)</span>
          <div style="font-size:12px;color:var(--muted);margin-top:4px;">Probabilidade Estimada de Atingir ${fmtNum(cfg.maxDrawdownLimitPct, 0)}% DD</div>
          <strong style="font-size:22px;font-weight:800;color:${!isSufficient ? 'var(--ink)' : (sim.ruinProbabilityPct > cfg.ruinProbabilityTolerancePct ? '#dc2626' : '#15803d')};">
            ${!isSufficient ? 'Dados insuficientes' : (ci?.zeroOccurrences ? `0 ocorr. (≤ ${fmtPct(ci.upperPct, 2)})` : fmtPct(sim.ruinProbabilityPct, 1))}
          </strong>
          <small style="display:block;font-size:11px;color:var(--muted);margin-top:4px;">
            ${!isSufficient ? `Mínimo de ${cfg.minSampleRequired} trades fechados para projetar` : `Risco/trade: ${fmtPct(cfg.riskPerTradePct, 2)} · ${cfg.simulationsCount.toLocaleString('pt-BR')} trajetórias`}
          </small>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // CROSS-SCREEN TOUCHPOINT 5: POLÍTICA DE RISCO (#riskpolicy)
  // =========================================================================
  function renderRiskPolicySection() {
    const riskPolicyPage = document.getElementById('riskpolicy');
    if (!riskPolicyPage) return;

    let section = document.getElementById('riskPolicyRorSection');
    if (!section) {
      section = document.createElement('section');
      section.id = 'riskPolicyRorSection';
      section.className = 'ror-embedded-card';
      riskPolicyPage.appendChild(section);
    }

    const cfg = state.config;
    section.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
        <div>
          <span style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted,#52665c);">GOVERNANÇA DE SOBREVIVÊNCIA ESTATÍSTICA</span>
          <h3 style="margin:2px 0 0;font-size:16px;font-weight:800;color:var(--ink,#0f2a20);">Parâmetros de Risco de Ruína (Monte Carlo)</h3>
          <p style="margin:2px 0 0;font-size:12px;color:var(--muted,#52665c);">
            Define o limite de drawdown máximo da conta e a tolerância máxima de probabilidade para acionar recomendações consultivas de redução de mão.
          </p>
        </div>
        <button type="button" class="ror-banner-btn" onclick="typeof go==='function'&&go('riskofruin')">Abrir Simulador Risco de Ruína →</button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;align-items:end;">
        <div>
          <label for="rpRorMaxDdInput" style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Limite de Drawdown Máximo da Conta (%)</label>
          <div class="ror-input-group" style="width:100%;">
            <input id="rpRorMaxDdInput" type="number" min="5" max="95" step="1" value="${cfg.maxDrawdownLimitPct}" />
            <span>%</span>
          </div>
        </div>

        <div>
          <label for="rpRorToleranceInput" style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Tolerância de Probabilidade de Ruína (%)</label>
          <div class="ror-input-group" style="width:100%;">
            <input id="rpRorToleranceInput" type="number" min="0.1" max="50" step="0.1" value="${cfg.ruinProbabilityTolerancePct}" />
            <span>%</span>
          </div>
        </div>

        <div>
          <label for="rpRorHorizonInput" style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Horizonte Padrão de Avaliação (Trades)</label>
          <div class="ror-input-group" style="width:100%;">
            <input id="rpRorHorizonInput" type="number" min="10" max="2000" step="10" value="${cfg.horizonTrades}" />
            <span>trades</span>
          </div>
        </div>

        <div>
          <button type="button" class="ror-recalc-btn" id="rpRorSaveBtn" style="height:36px;margin-top:0;">
            Salvar parâmetros de proteção
          </button>
        </div>
      </div>
    `;

    section.querySelector('#rpRorSaveBtn')?.addEventListener('click', () => {
      const dd = Number(section.querySelector('#rpRorMaxDdInput')?.value);
      const tol = Number(section.querySelector('#rpRorToleranceInput')?.value);
      const hor = Number(section.querySelector('#rpRorHorizonInput')?.value);
      saveConfig({
        maxDrawdownLimitPct: dd,
        ruinProbabilityTolerancePct: tol,
        horizonTrades: hor
      });
      runCalculation();
      renderRiskPolicySection();
      if (typeof root.showToast === 'function') {
        root.showToast('Limites de Risco de Ruína salvos e sincronizados.');
      }
    });
  }

  function refreshAllCrossScreenWidgets() {
    try { renderNewTradePreEntryPanel(); } catch (_) {}
    try { renderTradeSimulatorScenarioSection(); } catch (_) {}
    try { renderAnalyticsSummarySection(); } catch (_) {}
    try { renderRiskPolicySection(); } catch (_) {}
  }

  function init() {
    runCalculation({ silent: true });
    renderPage();
    refreshAllCrossScreenWidgets();

    // Escuta eventos globais de atualização de trades ou autenticação
    if (typeof root.addEventListener === 'function') {
      root.addEventListener('healthyTrend:tradesUpdated', () => {
        state.isOutdated = true;
        runCalculation({ silent: true });
        const activePage = document.querySelector('.page.active');
        if (activePage?.id === 'riskofruin') renderPage();
        refreshAllCrossScreenWidgets();
      });
    }
  }

  const controllerApi = {
    init,
    render: renderPage,
    runCalculation,
    getState: () => state,
    saveConfig,
    buildWealthDashboardCardHtml,
    renderNewTradePreEntryPanel,
    renderTradeSimulatorScenarioSection,
    renderAnalyticsSummarySection,
    renderRiskPolicySection,
    refreshAllCrossScreenWidgets
  };

  root.RiskOfRuinController = controllerApi;
  root.renderRiskOfRuinPage = renderPage;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(init, 60));
    } else {
      setTimeout(init, 60);
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
