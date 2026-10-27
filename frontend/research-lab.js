/**
 * ResearchLab — Laboratório de Pesquisa Quantitativa: Descobertas & Regras Candidatas
 * Controla a renderização e interatividade da tela #researchlab
 */
(function() {
  'use strict';

  let currentDashboard = null;
  let activeMainTab = 'TRIGGER_GRADES'; // 'TRIGGER_GRADES' | 'RISK_SCENARIOS' | 'MFE_POLICIES'
  let activeTab = 'HOLD';
  let isModalOpen = false;

  const filters = {
    period: '2022 - 2024',
    asset: 'Todos',
    strategy: 'Sell Into Strength',
    grade: 'Todas',
    exitPolicy: 'Todas',
    simVersion: 'v2.3'
  };

  async function loadData() {
    let rawSims = [];
    try {
      if (window.healthyTrendApi && typeof window.healthyTrendApi.request === 'function') {
        const res = await window.healthyTrendApi.request('/api/trade-simulations?env=RESEARCH');
        if (res && Array.isArray(res.simulations)) {
          rawSims = res.simulations;
        }
      }
    } catch (e) {
      console.warn('[ResearchLab] Utilizando dados de referência calibrados:', e.message);
    }

    if (window.ResearchLabModel) {
      currentDashboard = window.ResearchLabModel.buildResearchLabDashboard(rawSims, {
        period: filters.period === '2022 - 2024' ? '01/01/2022 - 31/12/2024' : filters.period,
        asset: filters.asset === 'Todos' ? 'Todos os ativos' : filters.asset,
        strategy: `${filters.strategy} (${filters.simVersion})`
      });
    }
  }

  function render() {
    const container = document.getElementById('researchlab');
    if (!container) return;

    if (!currentDashboard && window.ResearchLabModel) {
      currentDashboard = window.ResearchLabModel.buildResearchLabDashboard();
    }
    const d = currentDashboard;
    if (!d) {
      container.innerHTML = '<div style="padding: 2rem;">Carregando Laboratório de Pesquisa...</div>';
      return;
    }

    const mfeRows = d.mfeDistribution.rows || [];
    const extremeCases = d.giveback.extremeCases || [];
    const signals = d.warningSignals || [];
    const candidateRules = d.candidateRules || [];
    const rejectedRules = d.rejectedRules || [];
    const exitPolicies = d.exitPolicies;

    container.innerHTML = `
      <div class="research-lab-page env-research-mode">
        <!-- Header & Top Bar -->
        <div class="rl-header-wrap">
          <div>
            <div class="rl-breadcrumb">
              <a href="#" onclick="window.go && window.go('tradesimulator'); return false;">Simuladores</a>
              <span>&rsaquo;</span>
              <span>Laboratório de Pesquisa</span>
            </div>
            <div class="rl-title-row">
              <h1 class="rl-title">Laboratório de Pesquisa Quantitativa</h1>
              <span class="rl-beta-badge">Modo Aberto</span>
            </div>
            <div class="rl-subtitle">
              Descobertas & Regras Candidatas — Investigando padrões, testando filtros alternativos e validando hipóteses com base em evidências.
            </div>
          </div>
          <button class="rl-export-btn" id="rlExportReportBtn" onclick="window.ResearchLab.exportReport()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exportar Relatório
          </button>
        </div>

        <!-- Mandatory Persistent Isolation Banner (Card #188) -->
        <div class="rl-research-mode-banner">
          <div class="rl-banner-content">
            <div class="rl-banner-seal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 2v7.31M14 9.3V1.99M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0"/></svg>
              ${d.modeBadge}
            </div>
            <div class="rl-banner-text">
              <strong>Ambiente Experimental Isolado:</strong> ${d.disclaimer}
            </div>
          </div>
          <a href="#" class="rl-banner-back-link" onclick="window.go && window.go('tradesimulator'); return false;">
            &larr; Ir para o Simulador de Trades (Modo Oficial)
          </a>
        </div>

        <!-- Main Navigation Tabs Bar -->
        <div class="rl-main-tabs-bar">
          <button class="rl-main-tab-btn ${activeMainTab === 'TRIGGER_GRADES' ? 'active' : ''}" onclick="window.ResearchLab.setMainTab('TRIGGER_GRADES')">
            <span class="rl-tab-num">1</span> Análise de Grade por Gatilho (A+, A, B, C)
          </button>
          <button class="rl-main-tab-btn ${activeMainTab === 'RISK_SCENARIOS' ? 'active' : ''}" onclick="window.ResearchLab.setMainTab('RISK_SCENARIOS')">
            <span class="rl-tab-num">2</span> Cenários de Risco, RS & Dimensionamento
          </button>
          <button class="rl-main-tab-btn ${activeMainTab === 'MFE_POLICIES' ? 'active' : ''}" onclick="window.ResearchLab.setMainTab('MFE_POLICIES')">
            <span class="rl-tab-num">3</span> MFE, Giveback & Políticas de Saída
          </button>
        </div>

        <!-- Active Tab Content -->
        <div class="rl-tab-content">
          ${activeMainTab === 'TRIGGER_GRADES' ? renderTriggerGradesTab(d) :
            activeMainTab === 'RISK_SCENARIOS' ? renderRiskScenariosTab(d) :
            renderMfePoliciesTab(d, mfeRows, extremeCases, signals, candidateRules, rejectedRules, exitPolicies)}
        </div>

        <!-- Modal Nova Hipótese -->
        ${renderModal()}
      </div>
    `;
  }

  function renderTriggerGradesTab(d) {
    const triggerData = d.gradeByTrigger || {};
    const triggers = Object.keys(triggerData).length > 0 ? Object.keys(triggerData) : [
      'Inside Bar', '1-2-3 de Compra', 'PFR de Compra', 'Barra Vermelha Ignorada'
    ];

    return `
      <div class="rl-tab-intro-card">
        <div class="rl-tab-intro-head">
          <span class="rl-tab-intro-badge">Laboratório Quantitativo — Aba 1</span>
          <h2 class="rl-tab-intro-title">Análise de Grade por Gatilho Operacional (A+, A, B, C)</h2>
        </div>
        <p class="rl-tab-intro-desc">
          No Healthy Trend Trader, o gatilho gráfico (ex: Inside Bar, 1-2-3 de Compra, PFR ou Barra Vermelha Ignorada) é apenas o evento mecânico de acionamento do setup. A qualidade, expectativa matemática e autorização de risco decorrem da confluência de edges avaliados pelo Rubric (Força Relativa RS, ciclo de mercado, estrutura e volatilidade ATR). As matrizes abaixo avaliam empiricamente a distribuição de desempenho de cada um dos 4 gatilhos ativos no gráfico Diário.
        </p>
      </div>

      <div class="rl-triggers-matrix-grid">
        ${triggers.map(triggerName => {
          const gradesMap = triggerData[triggerName] || {};
          const grades = ['ALL', 'A+', 'A', 'B', 'C'];
          const totalIdentified = gradesMap.ALL ? gradesMap.ALL.opportunitiesCount : 0;
          return `
            <div class="rl-trigger-card">
              <div class="rl-trigger-card-head">
                <div class="rl-trigger-card-title-wrap">
                  <span class="rl-trigger-icon">🎯</span>
                  <h3 class="rl-trigger-name">${triggerName}</h3>
                </div>
                <span class="rl-trigger-total-badge">${totalIdentified} sinais identificados</span>
              </div>

              <div class="rl-table-responsive">
                <table class="rl-grade-table">
                  <thead>
                    <tr>
                      <th>Grade</th>
                      <th>Oportunidades</th>
                      <th>Executados</th>
                      <th>Taxa Bloqueio</th>
                      <th>Taxa Acerto</th>
                      <th>Total R</th>
                      <th>Expectativa (R)</th>
                      <th>Consistência Temporal (IS vs OOS)</th>
                      <th>Amostra</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${grades.map(gr => {
                      const st = gradesMap[gr] || {
                        grade: gr,
                        opportunitiesCount: 0,
                        executedCount: 0,
                        blockedCount: 0,
                        winRate: 0,
                        expectancyR: 0,
                        totalR: 0,
                        standardError: 0,
                        isLowSample: true,
                        confidenceNote: 'Sem dados suficientes',
                        temporalConsistency: {}
                      };
                      const blockRate = st.opportunitiesCount > 0 ? ((st.blockedCount / st.opportunitiesCount) * 100).toFixed(0) : '0';
                      const seFormatted = st.standardError > 0 ? ` ±${st.standardError.toFixed(2)}` : '';
                      const expClass = st.expectancyR > 0 ? 'rl-delta-pos' : (st.expectancyR < 0 ? 'rl-delta-neg' : '');

                      // Grade badge
                      const gradeClass = gr === 'ALL' ? 'grade-all' : `grade-${gr.toLowerCase().replace('+', '-plus')}`;
                      const gradeBadge = `<span class="rl-grade-pill ${gradeClass}">${gr === 'ALL' ? 'Todos' : gr}</span>`;

                      // Temporal consistency
                      let tempHtml = '<span class="rl-text-muted">—</span>';
                      if (st.temporalConsistency && st.temporalConsistency.inSampleExpectancyR !== null && st.temporalConsistency.outOfSampleExpectancyR !== null) {
                        const isConsistent = st.temporalConsistency.isConsistent;
                        const isVal = st.temporalConsistency.inSampleExpectancyR;
                        const oosVal = st.temporalConsistency.outOfSampleExpectancyR;
                        tempHtml = `
                          <div class="rl-temporal-wrap">
                            <span class="rl-temporal-pill ${isConsistent ? 'pill-consistent' : 'pill-divergent'}">
                              ${isConsistent ? '✓ Consistente' : '⚠ Divergente'}
                            </span>
                            <span class="rl-temporal-text">IS: ${isVal > 0 ? '+' : ''}${isVal}R / OOS: ${oosVal > 0 ? '+' : ''}${oosVal}R</span>
                          </div>
                        `;
                      }

                      // Uncertainty badge
                      const sampleHtml = st.isLowSample
                        ? `<span class="rl-uncertainty-pill" title="${st.confidenceNote}">⚠️ n < 30</span>`
                        : `<span class="rl-sample-ok-pill" title="${st.confidenceNote}">✓ Robusto</span>`;

                      return `
                        <tr class="${gr === 'ALL' ? 'rl-row-all' : ''}">
                          <td>${gradeBadge}</td>
                          <td><strong>${st.opportunitiesCount}</strong></td>
                          <td>${st.executedCount}</td>
                          <td><span class="${Number(blockRate) > 0 ? 'rl-delta-neg' : 'rl-text-muted'}">${blockRate}%</span></td>
                          <td><strong>${st.winRate.toFixed(1)}%</strong></td>
                          <td>${st.totalR > 0 ? '+' : ''}${st.totalR.toFixed(2)}R</td>
                          <td class="${expClass}"><strong>${st.expectancyR > 0 ? '+' : ''}${st.expectancyR.toFixed(2)}R</strong><span class="rl-se-sub">${seFormatted}</span></td>
                          <td>${tempHtml}</td>
                          <td>${sampleHtml}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderRiskScenariosTab(d) {
    const comp = d.rubricComparison || {};
    const scenarios = d.riskScenarios || {};
    const sel = comp.selectionEffect || {};
    const siz = comp.sizingEffect || {};
    const deltas = comp.deltas || {};

    const scenarioKeys = ['NORMAL', 'LOW_RS', 'WEAK_CYCLE', 'WEAK_EDGE', 'POOR_SELECTION', 'STRESS_STREAK'];

    return `
      <div class="rl-tab-intro-card">
        <div class="rl-tab-intro-head">
          <span class="rl-tab-intro-badge">Laboratório Quantitativo — Aba 2</span>
          <h2 class="rl-tab-intro-title">Cenários de Risco, RS & Dimensionamento</h2>
        </div>
        <p class="rl-tab-intro-desc">
          Avaliação de sensibilidade do portfólio e isolamento paramétrico de efeitos. O laboratório estressa os 3 componentes do método: a filtragem de oportunidades (Efeito Seleção), o Bet Sizing por faixas de Força Relativa e o dimensionamento dinâmico por 3 camadas (Efeito Dimensionamento).
        </p>
      </div>

      <!-- Bloco 1: Efeito Seleção vs Efeito Dimensionamento -->
      <div class="rl-effects-split-section">
        <div class="rl-section-head">
          <div class="rl-section-title-wrap">
            <h3 class="rl-section-title">Isolamento de Efeitos: Seleção vs Dimensionamento</h3>
            <span class="rl-section-sub">Decomposição causal da melhoria de desempenho obtida com o motor do Rubric</span>
          </div>
        </div>

        <div class="rl-effects-split-grid">
          <!-- Card Seleção -->
          <div class="rl-effect-card card-selection">
            <div class="rl-effect-head">
              <span class="rl-effect-icon">🔍</span>
              <div>
                <h4 class="rl-effect-title">Efeito Seleção (Rubric / Filtros)</h4>
                <span class="rl-effect-tag">Qualidade do Sinal</span>
              </div>
            </div>
            <div class="rl-effect-kpis">
              <div class="rl-effect-kpi">
                <span class="lbl">Ganho na Taxa de Acerto</span>
                <span class="val ${deltas.winRateDeltaPct >= 0 ? 'rl-delta-pos' : 'rl-delta-neg'}">
                  ${deltas.winRateDeltaPct >= 0 ? '+' : ''}${deltas.winRateDeltaPct || 0}pp
                </span>
              </div>
              <div class="rl-effect-kpi">
                <span class="lbl">Expectativa Matemática Δ</span>
                <span class="val ${deltas.expectancyDeltaR >= 0 ? 'rl-delta-pos' : 'rl-delta-neg'}">
                  ${deltas.expectancyDeltaR >= 0 ? '+' : ''}${deltas.expectancyDeltaR || 0} R
                </span>
              </div>
              <div class="rl-effect-kpi">
                <span class="lbl">Trades Bloqueados (Ruído / Grade D)</span>
                <span class="val">${sel.blockedBadTradesCount || 0}</span>
              </div>
            </div>
            <div class="rl-effect-summary">
              <strong>Mecanismo Causal:</strong> ${sel.summary || 'A filtragem criteriosa elimina trades com probabilidade estatisticamente desfavorável.'}
            </div>
          </div>

          <!-- Card Dimensionamento -->
          <div class="rl-effect-card card-sizing">
            <div class="rl-effect-head">
              <span class="rl-effect-icon">⚖️</span>
              <div>
                <h4 class="rl-effect-title">Efeito Dimensionamento (Bet Sizing & 3 Camadas)</h4>
                <span class="rl-effect-tag">Alocação de Risco</span>
              </div>
            </div>
            <div class="rl-effect-kpis">
              <div class="rl-effect-kpi">
                <span class="lbl">Redução de Drawdown Máximo</span>
                <span class="val ${siz.drawdownReductionPct >= 0 ? 'rl-delta-pos' : 'rl-delta-neg'}">
                  ${siz.drawdownReductionPct >= 0 ? '-' : '+'}${Math.abs(siz.drawdownReductionPct || 0)}pp
                </span>
              </div>
              <div class="rl-effect-kpi">
                <span class="lbl">Ganho no Profit Factor</span>
                <span class="val ${deltas.profitFactorDelta >= 0 ? 'rl-delta-pos' : 'rl-delta-neg'}">
                  ${deltas.profitFactorDelta >= 0 ? '+' : ''}${deltas.profitFactorDelta || 0}
                </span>
              </div>
              <div class="rl-effect-kpi">
                <span class="lbl">Portfolio Heat Máximo</span>
                <span class="val">${siz.maxHeatControlledPct || 0}%</span>
              </div>
            </div>
            <div class="rl-effect-summary">
              <strong>Mecanismo Causal:</strong> ${siz.summary || 'O Bet Sizing dinâmico modula a exposição para que perdas em trades marginais tenham peso reduzido na curva de capital.'}
            </div>
          </div>
        </div>
      </div>

      <!-- Bloco 2: Os 6 Cenários Paramétricos de Risco -->
      <div class="rl-scenarios-section">
        <div class="rl-section-head">
          <div class="rl-section-title-wrap">
            <h3 class="rl-section-title">Os 6 Cenários Paramétricos de Risco & Estresse</h3>
            <span class="rl-section-sub">Resiliência do portfólio sob diferentes hipóteses de mercado e degradação de edge</span>
          </div>
        </div>

        <div class="rl-scenarios-grid">
          ${scenarioKeys.map(k => {
            const sc = scenarios[k];
            if (!sc) return '';
            const rep = sc.report || {};
            const perf = rep.performance || {};
            const risk = rep.risk || {};
            const retClass = perf.netReturnPct >= 0 ? 'rl-delta-pos' : 'rl-delta-neg';
            const expClass = perf.expectancyR >= 0 ? 'rl-delta-pos' : 'rl-delta-neg';

            return `
              <div class="rl-scenario-card ${k === 'NORMAL' ? 'highlight-normal' : ''}">
                <div class="rl-scenario-head">
                  <div class="rl-scenario-badge">${sc.id}</div>
                  <h4 class="rl-scenario-title">${sc.name}</h4>
                </div>
                <p class="rl-scenario-desc">${sc.description}</p>

                <div class="rl-scenario-metrics-grid">
                  <div class="rl-scen-metric">
                    <span class="lbl">Retorno Líquido</span>
                    <span class="val ${retClass}">${perf.netReturnPct >= 0 ? '+' : ''}${perf.netReturnPct || 0}%</span>
                  </div>
                  <div class="rl-scen-metric">
                    <span class="lbl">Expectativa</span>
                    <span class="val ${expClass}">${perf.expectancyR >= 0 ? '+' : ''}${perf.expectancyR || 0} R</span>
                  </div>
                  <div class="rl-scen-metric">
                    <span class="lbl">Taxa de Acerto</span>
                    <span class="val">${perf.winRate || 0}%</span>
                  </div>
                  <div class="rl-scen-metric">
                    <span class="lbl">Max Drawdown</span>
                    <span class="val rl-delta-neg">-${risk.maxDrawdownPct || 0}%</span>
                  </div>
                  <div class="rl-scen-metric">
                    <span class="lbl">Profit Factor</span>
                    <span class="val">${perf.profitFactor || 0}</span>
                  </div>
                  <div class="rl-scen-metric">
                    <span class="lbl">Executados / Bloq.</span>
                    <span class="val">${perf.executedCount || 0} / ${perf.blockedCount || 0}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderMfePoliciesTab(d, mfeRows, extremeCases, signals, candidateRules, rejectedRules, exitPolicies) {
    return `
      <!-- Filter Toolbar -->
      <div class="rl-filter-bar">
        <div class="rl-filter-controls">
          <div class="rl-filter-group">
            <label class="rl-filter-label">Período</label>
            <select class="rl-filter-select" id="rlFilterPeriod" onchange="window.ResearchLab.updateFilter('period', this.value)">
              <option value="2022 - 2024" ${filters.period === '2022 - 2024' ? 'selected' : ''}>2022 - 2024</option>
              <option value="2023 - 2024" ${filters.period === '2023 - 2024' ? 'selected' : ''}>2023 - 2024</option>
              <option value="2024" ${filters.period === '2024' ? 'selected' : ''}>2024</option>
              <option value="Todos" ${filters.period === 'Todos' ? 'selected' : ''}>Histórico Completo</option>
            </select>
          </div>
          <div class="rl-filter-group">
            <label class="rl-filter-label">Ativo</label>
            <select class="rl-filter-select" id="rlFilterAsset" onchange="window.ResearchLab.updateFilter('asset', this.value)">
              <option value="Todos">Todos</option>
              <option value="PETR4">PETR4</option>
              <option value="VALE3">VALE3</option>
              <option value="ITUB4">ITUB4</option>
              <option value="WEGE3">WEGE3</option>
            </select>
          </div>
          <div class="rl-filter-group">
            <label class="rl-filter-label">Estratégia</label>
            <select class="rl-filter-select" id="rlFilterStrategy" onchange="window.ResearchLab.updateFilter('strategy', this.value)">
              <option value="Sell Into Strength" selected>Sell Into Strength</option>
              <option value="Trend Following">Trend Following Puro</option>
              <option value="Todas">Todas</option>
            </select>
          </div>
          <div class="rl-filter-group">
            <label class="rl-filter-label">Grade</label>
            <select class="rl-filter-select" id="rlFilterGrade" onchange="window.ResearchLab.updateFilter('grade', this.value)">
              <option value="Todas" selected>Todas</option>
              <option value="A">Grade A / A+</option>
              <option value="B">Grade B</option>
              <option value="C">Grade C</option>
              <option value="D">Grade D (Pesquisa)</option>
            </select>
          </div>
          <div class="rl-filter-group">
            <label class="rl-filter-label">Política de saída</label>
            <select class="rl-filter-select" id="rlFilterExitPolicy" onchange="window.ResearchLab.updateFilter('exitPolicy', this.value)">
              <option value="Todas" selected>Todas</option>
              <option value="SIS_2R">Parcial +2R / +3R</option>
              <option value="TRAILING">Trailing Stop Puro</option>
            </select>
          </div>
          <div class="rl-filter-group">
            <label class="rl-filter-label">Versão da simulação</label>
            <select class="rl-filter-select" id="rlFilterVersion" onchange="window.ResearchLab.updateFilter('simVersion', this.value)">
              <option value="v2.3" selected>v2.3</option>
              <option value="v2.2">v2.2</option>
              <option value="v2.1">v2.1</option>
            </select>
          </div>
          <button class="rl-apply-btn" onclick="window.ResearchLab.applyFilters()">Aplicar</button>
        </div>
        <div class="rl-current-base-card">
          <strong>Base atual</strong>
          <span>${d.baseInfo.period}</span>
          <span>${d.baseInfo.asset}</span>
          <span>${d.baseInfo.strategy}</span>
        </div>
      </div>

      <!-- 1. Visão geral das evidências -->
      <section class="rl-section">
        <div class="rl-section-head">
          <div class="rl-section-title-wrap">
            <h2 class="rl-section-title">1. Visão geral das evidências</h2>
          </div>
        </div>
        <div class="rl-overview-grid">
          <div class="rl-overview-card">
            <div class="rl-card-label">
              <span>Trades analisados</span>
              <span class="rl-trend-badge">${d.evidenceOverview.trendPctBadge}</span>
            </div>
            <div class="rl-card-value">${d.evidenceOverview.totalTrades.toLocaleString('pt-BR')}</div>
          </div>
          <div class="rl-overview-card">
            <div class="rl-card-label">
              <span>Grade A</span>
              <span class="rl-grade-pill grade-a">A</span>
            </div>
            <div class="rl-card-value">
              ${d.evidenceOverview.gradeA.count}
              <span class="rl-val-sub">(${d.evidenceOverview.gradeA.pct}%)</span>
            </div>
          </div>
          <div class="rl-overview-card">
            <div class="rl-card-label">
              <span>Grade B</span>
              <span class="rl-grade-pill grade-b">B</span>
            </div>
            <div class="rl-card-value">
              ${d.evidenceOverview.gradeB.count}
              <span class="rl-val-sub">(${d.evidenceOverview.gradeB.pct}%)</span>
            </div>
          </div>
          <div class="rl-overview-card">
            <div class="rl-card-label">
              <span>Grade C</span>
              <span class="rl-grade-pill grade-c">C</span>
            </div>
            <div class="rl-card-value">
              ${d.evidenceOverview.gradeC.count}
              <span class="rl-val-sub">(${d.evidenceOverview.gradeC.pct}%)</span>
            </div>
          </div>
          <div class="rl-overview-card">
            <div class="rl-card-label">MFE médio</div>
            <div class="rl-card-value">${d.evidenceOverview.mfeAvgR.toFixed(1).replace('.', ',')} R</div>
          </div>
          <div class="rl-overview-card">
            <div class="rl-card-label">Resultado médio</div>
            <div class="rl-card-value">${d.evidenceOverview.resultAvgR.toFixed(1).replace('.', ',')} R</div>
          </div>
          <div class="rl-overview-card">
            <div class="rl-card-label">Expectancy</div>
            <div class="rl-card-value">${d.evidenceOverview.expectancyR.toFixed(2).replace('.', ',')} R</div>
          </div>
          <div class="rl-overview-card">
            <div class="rl-card-label">Capture Ratio</div>
            <div class="rl-card-value">${d.evidenceOverview.captureRatioPct}%</div>
          </div>
          <div class="rl-overview-card">
            <div class="rl-card-label">Giveback médio</div>
            <div class="rl-card-value">${d.evidenceOverview.givebackAvgR.toFixed(1).replace('.', ',')} R</div>
          </div>
        </div>

        <!-- Status Counters Strip -->
        <div class="rl-status-strip">
          <div class="rl-status-item">
            <span class="rl-status-label">Descobertas identificadas</span>
            <span class="rl-status-num">💡 ${d.statusSummary.discoveriesCount}</span>
          </div>
          <div class="rl-status-item">
            <span class="rl-status-label">Hipóteses em estudo</span>
            <span class="rl-status-num">🧪 ${d.statusSummary.hypothesesInStudyCount}</span>
          </div>
          <div class="rl-status-item">
            <span class="rl-status-label">Evidência consistente</span>
            <span class="rl-status-num">📈 ${d.statusSummary.consistentEvidenceCount}</span>
          </div>
          <div class="rl-status-item">
            <span class="rl-status-label">Regras incorporadas</span>
            <span class="rl-status-num">✅ ${d.statusSummary.incorporatedRulesCount}</span>
          </div>
          <div class="rl-status-item">
            <span class="rl-status-label">Regras rejeitadas</span>
            <span class="rl-status-num">❌ ${d.statusSummary.rejectedRulesCount}</span>
          </div>
        </div>
      </section>

      <!-- 2, 3, 4 Row: MFE, Velocidade, Giveback -->
      <div class="rl-grid-234">
        <!-- 2. Distribuição do MFE -->
        <section class="rl-section">
          <div class="rl-section-head">
            <div class="rl-section-title-wrap">
              <h3 class="rl-section-title">2. Distribuição do MFE</h3>
              <span class="rl-section-sub">Percentual de trades vencedores que atingiram cada múltiplo de risco</span>
            </div>
          </div>
          <div class="rl-chart-legend">
            <div class="rl-legend-item"><span class="rl-legend-dot all"></span> Todos</div>
            <div class="rl-legend-item"><span class="rl-legend-dot grade-a"></span> Grade A</div>
            <div class="rl-legend-item"><span class="rl-legend-dot grade-b"></span> Grade B</div>
            <div class="rl-legend-item"><span class="rl-legend-dot grade-c"></span> Grade C</div>
          </div>
          <div class="rl-mfe-chart-container">
            ${mfeRows.map(r => `
              <div class="rl-mfe-group">
                <div class="rl-mfe-bars-wrap">
                  <div class="rl-mfe-bar all" style="height: ${r.allPct * 1.2}px;" title="Todos: ${r.allPct}%"></div>
                  <div class="rl-mfe-bar grade-a" style="height: ${r.gradeAPct * 1.2}px;" title="Grade A: ${r.gradeAPct}%"></div>
                  <div class="rl-mfe-bar grade-b" style="height: ${r.gradeBPct * 1.2}px;" title="Grade B: ${r.gradeBPct}%"></div>
                  <div class="rl-mfe-bar grade-c" style="height: ${r.gradeCPct * 1.2}px;" title="Grade C: ${r.gradeCPct}%"></div>
                </div>
                <span class="rl-mfe-bar-label">${r.threshold}</span>
              </div>
            `).join('')}
          </div>
          <table class="rl-data-table">
            <thead>
              <tr>
                <th>Múltiplo</th>
                <th>Todos</th>
                <th>Grade A</th>
                <th>Grade B</th>
                <th>Grade C</th>
              </tr>
            </thead>
            <tbody>
              ${mfeRows.map(r => `
                <tr>
                  <td><strong>${r.threshold}</strong></td>
                  <td>${r.allPct}% <span style="color: var(--muted); font-size: 0.7rem;">(${r.allCount})</span></td>
                  <td>${r.gradeAPct}%</td>
                  <td>${r.gradeBPct}%</td>
                  <td>${r.gradeCPct}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>

        <!-- 3. Velocidade dos trades -->
        <section class="rl-section">
          <div class="rl-section-head">
            <div class="rl-section-title-wrap">
              <h3 class="rl-section-title">3. Velocidade dos trades</h3>
              <span class="rl-section-sub">Tempo para atingir marcos de MFE</span>
            </div>
          </div>
          <div class="rl-velocity-container">
            <!-- Rápidos -->
            <div class="rl-velocity-card">
              <div class="rl-velocity-header">
                <span>⚡</span>
                <span>Trades rápidos / explosivos</span>
              </div>
              <div class="rl-velocity-count">${d.tradeVelocity.fast.count} trades (${d.tradeVelocity.fast.pct}%)</div>
              <div class="rl-metric-row">
                <span class="rl-metric-name">Tempo médio p/ +1R</span>
                <span class="rl-metric-val">${d.tradeVelocity.fast.timeTo1R}</span>
              </div>
              <div class="rl-metric-row">
                <span class="rl-metric-name">Tempo médio p/ +2R</span>
                <span class="rl-metric-val">${d.tradeVelocity.fast.timeTo2R}</span>
              </div>
              <div class="rl-metric-row">
                <span class="rl-metric-name">Tempo médio p/ +3R</span>
                <span class="rl-metric-val">${d.tradeVelocity.fast.timeTo3R}</span>
              </div>
              <div class="rl-metric-row">
                <span class="rl-metric-name">MFE médio</span>
                <span class="rl-metric-val">${d.tradeVelocity.fast.mfeAvgR} R</span>
              </div>
              <div class="rl-metric-row">
                <span class="rl-metric-name">Resultado médio</span>
                <span class="rl-metric-val">${d.tradeVelocity.fast.resultAvgR} R</span>
              </div>
              <div class="rl-metric-row">
                <span class="rl-metric-name">Capture Ratio</span>
                <span class="rl-metric-val">${d.tradeVelocity.fast.captureRatio}%</span>
              </div>
              <div class="rl-metric-row">
                <span class="rl-metric-name">Giveback médio</span>
                <span class="rl-metric-val">${d.tradeVelocity.fast.givebackAvgR} R</span>
              </div>
            </div>

            <!-- Lentos -->
            <div class="rl-velocity-card">
              <div class="rl-velocity-header">
                <span>🐢</span>
                <span>Trades lentos / organizados</span>
              </div>
              <div class="rl-velocity-count">${d.tradeVelocity.slow.count} trades (${d.tradeVelocity.slow.pct}%)</div>
              <div class="rl-metric-row">
                <span class="rl-metric-name">Tempo médio p/ +1R</span>
                <span class="rl-metric-val">${d.tradeVelocity.slow.timeTo1R}</span>
              </div>
              <div class="rl-metric-row">
                <span class="rl-metric-name">Tempo médio p/ +2R</span>
                <span class="rl-metric-val">${d.tradeVelocity.slow.timeTo2R}</span>
              </div>
              <div class="rl-metric-row">
                <span class="rl-metric-name">Tempo médio p/ +3R</span>
                <span class="rl-metric-val">${d.tradeVelocity.slow.timeTo3R}</span>
              </div>
              <div class="rl-metric-row">
                <span class="rl-metric-name">MFE médio</span>
                <span class="rl-metric-val">${d.tradeVelocity.slow.mfeAvgR} R</span>
              </div>
              <div class="rl-metric-row">
                <span class="rl-metric-name">Resultado médio</span>
                <span class="rl-metric-val">${d.tradeVelocity.slow.resultAvgR} R</span>
              </div>
              <div class="rl-metric-row">
                <span class="rl-metric-name">Capture Ratio</span>
                <span class="rl-metric-val">${d.tradeVelocity.slow.captureRatio}%</span>
              </div>
              <div class="rl-metric-row">
                <span class="rl-metric-name">Giveback médio</span>
                <span class="rl-metric-val">${d.tradeVelocity.slow.givebackAvgR} R</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 4. Giveback -->
        <section class="rl-section">
          <div class="rl-section-head">
            <div class="rl-section-title-wrap">
              <h3 class="rl-section-title">4. Giveback</h3>
              <span class="rl-section-sub">Quanto do MFE foi devolvido antes do encerramento</span>
            </div>
          </div>
          <div class="rl-giveback-top-stats">
            <div class="rl-giveback-stat">
              <span class="lbl">Giveback médio</span>
              <span class="val">${d.giveback.givebackAvgR} R</span>
            </div>
            <div class="rl-giveback-stat">
              <span class="lbl">Giveback mediano</span>
              <span class="val">${d.giveback.givebackMedianR} R</span>
            </div>
            <div class="rl-giveback-stat">
              <span class="lbl">Giveback % do MFE</span>
              <span class="val">${d.giveback.givebackPctOfMfe}%</span>
            </div>
          </div>

          <!-- Histogram -->
          <div class="rl-histogram-container">
            ${d.giveback.histogram.map(h => `
              <div class="rl-hist-col">
                <div class="rl-hist-bar" style="height: ${(h.count / 200) * 100}px;" title="${h.bucket}: ${h.count} trades"></div>
                <span class="rl-hist-label">${h.bucket}</span>
              </div>
            `).join('')}
          </div>

          <div class="rl-extreme-cases-title">Casos extremos</div>
          <table class="rl-data-table">
            <thead>
              <tr>
                <th>Trade</th>
                <th>MFE</th>
                <th>Resultado</th>
                <th>Giveback</th>
              </tr>
            </thead>
            <tbody>
              ${extremeCases.map(c => `
                <tr>
                  <td><strong>${c.id}</strong></td>
                  <td>${c.mfeR}R</td>
                  <td>${c.resultR}R</td>
                  <td style="color: #ef4444; font-weight: 700;">${c.givebackR}R</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>
      </div>

      <!-- 5. Sinais Antes da Devolução & Políticas 6, 7, 8 -->
      <div class="rl-grid-5678">
        <!-- 5. Sinais antes da devolução -->
        <section class="rl-section">
          <div class="rl-section-head">
            <div class="rl-section-title-wrap">
              <h3 class="rl-section-title">5. Sinais antes da devolução</h3>
              <span class="rl-section-sub">Frequência de sinais que aparecem antes de devoluções relevantes</span>
            </div>
          </div>
          <table class="rl-data-table">
            <thead>
              <tr>
                <th>Sinal</th>
                <th>Ocorrências</th>
                <th>% dos trades</th>
                <th>Devolução após sinal</th>
                <th>Giveback médio</th>
              </tr>
            </thead>
            <tbody>
              ${signals.map(s => `
                <tr>
                  <td><span>${s.icon}</span> <strong>${s.signal}</strong></td>
                  <td>${s.occurrences}</td>
                  <td>${s.tradePct}%</td>
                  <td style="color: #f59e0b; font-weight: 600;">${s.givebackProbPct}%</td>
                  <td>${s.givebackAvgR} R</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>

        <!-- 6, 7 & 8: Políticas de Saída comparadas -->
        <section class="rl-section">
          <div class="rl-section-head">
            <div class="rl-section-title-wrap">
              <h3 class="rl-section-title">Políticas de Saída & Benchmarks de Gestão</h3>
              <span class="rl-section-sub">Comparação paramétrica entre trailing stop clássico e realizações parciais por força</span>
            </div>
          </div>
          <div class="rl-policies-grid">
            <!-- 6. Benchmark Trailing Puro -->
            <div class="rl-policy-card">
              <div>
                <div class="rl-policy-title">
                  <span>${exitPolicies.benchmarkTrailingPuro.icon}</span>
                  <span>${exitPolicies.benchmarkTrailingPuro.name}</span>
                </div>
                <div class="rl-metric-row"><span class="rl-metric-name">Expectancy</span><span class="rl-metric-val">${exitPolicies.benchmarkTrailingPuro.expectancyR} R</span></div>
                <div class="rl-metric-row"><span class="rl-metric-name">Resultado médio</span><span class="rl-metric-val">${exitPolicies.benchmarkTrailingPuro.resultAvgR} R</span></div>
                <div class="rl-metric-row"><span class="rl-metric-name">Resultado méd. (winners)</span><span class="rl-metric-val">${exitPolicies.benchmarkTrailingPuro.winnerResultAvgR} R</span></div>
                <div class="rl-metric-row"><span class="rl-metric-name">MFE médio</span><span class="rl-metric-val">${exitPolicies.benchmarkTrailingPuro.mfeAvgR} R</span></div>
                <div class="rl-metric-row"><span class="rl-metric-name">Capture Ratio</span><span class="rl-metric-val">${exitPolicies.benchmarkTrailingPuro.captureRatio}%</span></div>
                <div class="rl-metric-row"><span class="rl-metric-name">Giveback médio</span><span class="rl-metric-val">${exitPolicies.benchmarkTrailingPuro.givebackAvgR} R</span></div>
                <div class="rl-metric-row"><span class="rl-metric-name">Drawdown</span><span class="rl-metric-val rl-delta-neg">${exitPolicies.benchmarkTrailingPuro.maxDrawdownR} R</span></div>
                <div class="rl-metric-row"><span class="rl-metric-name">Grandes winners preservados</span><span class="rl-metric-val">${exitPolicies.benchmarkTrailingPuro.largeWinnersPreservedPct}%</span></div>
              </div>
              <div class="rl-policy-footer-box">
                <strong>Configuração do trailing:</strong><br>
                Stop: ${exitPolicies.benchmarkTrailingPuro.config.stop}<br>
                Ajuste: ${exitPolicies.benchmarkTrailingPuro.config.adjustment}<br>
                Demais condições: ${exitPolicies.benchmarkTrailingPuro.config.other}
              </div>
            </div>

            <!-- 7. Sell Into Strength Mecânico -->
            <div class="rl-policy-card">
              <div>
                <div class="rl-policy-title">
                  <span>${exitPolicies.mechanicalSellIntoStrength.icon}</span>
                  <span>${exitPolicies.mechanicalSellIntoStrength.name}</span>
                </div>
                <div class="rl-metric-row">
                  <span class="rl-metric-name">Expectancy</span>
                  <span class="rl-metric-val rl-delta-pos">${exitPolicies.mechanicalSellIntoStrength.expectancyR} R (+${exitPolicies.mechanicalSellIntoStrength.expectancyDeltaPct}%)</span>
                </div>
                <div class="rl-metric-row"><span class="rl-metric-name">Resultado médio</span><span class="rl-metric-val">${exitPolicies.mechanicalSellIntoStrength.resultAvgR} R</span></div>
                <div class="rl-metric-row"><span class="rl-metric-name">Capture Ratio</span><span class="rl-metric-val">${exitPolicies.mechanicalSellIntoStrength.captureRatio}%</span></div>
                <div class="rl-metric-row"><span class="rl-metric-name">Giveback médio</span><span class="rl-metric-val">${exitPolicies.mechanicalSellIntoStrength.givebackAvgR} R</span></div>
                <div class="rl-metric-row"><span class="rl-metric-name">Drawdown</span><span class="rl-metric-val rl-delta-neg">${exitPolicies.mechanicalSellIntoStrength.maxDrawdownR} R</span></div>
                <div class="rl-metric-row"><span class="rl-metric-name">Impacto grandes winners</span><span class="rl-metric-val rl-delta-neg">${exitPolicies.mechanicalSellIntoStrength.largeWinnersImpactPct}%</span></div>
              </div>
              <div class="rl-policy-footer-box">
                <strong>Política testada:</strong><br>
                +2R &rarr; 25%<br>
                +3R &rarr; 25%<br>
                Restante &rarr; trailing (50%)
              </div>
            </div>

            <!-- 8. Sell Into Strength Contextual -->
            <div class="rl-policy-card highlight">
              <div>
                <div class="rl-policy-title">
                  <span>${exitPolicies.contextualSellIntoStrength.icon}</span>
                  <span>${exitPolicies.contextualSellIntoStrength.name}</span>
                </div>
                <div class="rl-metric-row">
                  <span class="rl-metric-name">Expectancy</span>
                  <span class="rl-metric-val rl-delta-pos">${exitPolicies.contextualSellIntoStrength.expectancyR} R (+${exitPolicies.contextualSellIntoStrength.expectancyDeltaPct}%)</span>
                </div>
                <div class="rl-metric-row"><span class="rl-metric-name">Resultado médio</span><span class="rl-metric-val">${exitPolicies.contextualSellIntoStrength.resultAvgR} R</span></div>
                <div class="rl-metric-row"><span class="rl-metric-name">Capture Ratio</span><span class="rl-metric-val">${exitPolicies.contextualSellIntoStrength.captureRatio}%</span></div>
                <div class="rl-metric-row"><span class="rl-metric-name">Giveback médio</span><span class="rl-metric-val">${exitPolicies.contextualSellIntoStrength.givebackAvgR} R</span></div>
                <div class="rl-metric-row"><span class="rl-metric-name">Drawdown</span><span class="rl-metric-val rl-delta-neg">${exitPolicies.contextualSellIntoStrength.maxDrawdownR} R</span></div>
                <div class="rl-metric-row"><span class="rl-metric-name">Impacto grandes winners</span><span class="rl-metric-val">${exitPolicies.contextualSellIntoStrength.largeWinnersImpactPct}%</span></div>
              </div>
              <div class="rl-policy-footer-box">
                <strong>Condições estudadas:</strong><br>
                ✦ R atingido<br>
                ✦ Velocidade do movimento<br>
                ✦ Preço acima da EMA20<br>
                ✦ Extensão em relação à EMA20<br>
                ✦ Volatilidade (ATR)
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- 9 & 10: Regras Candidatas & Regras Rejeitadas -->
      <div class="rl-grid-910">
        <!-- 9. Regras Candidatas -->
        <section class="rl-section">
          <div class="rl-section-head">
            <div class="rl-section-title-wrap">
              <h3 class="rl-section-title">
                9. Regras Candidatas
                <span class="rl-beta-badge" style="background: rgba(56, 189, 248, 0.15); border-color: rgba(56, 189, 248, 0.3);">${candidateRules.length} candidatas</span>
              </h3>
            </div>
            <button class="rl-add-hypothesis-btn" onclick="window.ResearchLab.openNewHypothesisModal()">
              <span>+</span> Nova Hipótese
            </button>
          </div>
          <table class="rl-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Título / Hipótese</th>
                <th>Ocorrências</th>
                <th>Resultado observado</th>
                <th>Status</th>
                <th>Última atualização</th>
              </tr>
            </thead>
            <tbody>
              ${candidateRules.map(r => {
                const conf = window.ResearchLabModel ? window.ResearchLabModel.STATUS_CONFIG[r.status] : null;
                const badgeClass = conf ? conf.badgeClass : 'badge-study';
                const label = conf ? `${conf.icon} ${conf.label}` : r.status;
                const dBR = r.updatedAt.includes('-') ? r.updatedAt.split('-').reverse().join('/') : r.updatedAt;
                return `
                  <tr>
                    <td><strong>${r.id}</strong></td>
                    <td>${r.title}</td>
                    <td>${r.occurrences}</td>
                    <td style="color: #38bdf8;">${r.observedResult}</td>
                    <td><span class="rl-status-badge ${badgeClass}">${label}</span></td>
                    <td>${dBR}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </section>

        <!-- 10. Regras Rejeitadas -->
        <section class="rl-section">
          <div class="rl-section-head">
            <div class="rl-section-title-wrap">
              <h3 class="rl-section-title">
                10. Regras Rejeitadas
                <span class="rl-beta-badge" style="background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.3); color: #f87171;">${rejectedRules.length} regras</span>
              </h3>
            </div>
            <a href="#" style="font-size: 0.75rem; color: #38bdf8; text-decoration: none;" onclick="alert('Histórico completo de regras rejeitadas disponível para auditoria.'); return false;">Ver todas &gt;</a>
          </div>
          <table class="rl-data-table">
            <thead>
              <tr>
                <th>Regra testada</th>
                <th>Amostra</th>
                <th>Problema encontrado</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              ${rejectedRules.map(r => {
                const dBR = r.date.includes('-') ? r.date.split('-').reverse().join('/') : r.date;
                return `
                  <tr>
                    <td><strong>${r.ruleTested}</strong></td>
                    <td>${r.sampleSize}</td>
                    <td style="color: #f87171;">${r.failureReason}</td>
                    <td>${dBR}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </section>
      </div>

      <!-- 11. Política Atual de Sell Into Strength -->
      <section class="rl-section">
        <div class="rl-section-head">
          <div class="rl-section-title-wrap">
            <h3 class="rl-section-title">
              11. Política Atual de Sell Into Strength
              <span class="rl-beta-badge" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.3); color: #34d399;">${d.currentSellIntoStrengthPolicy.version}</span>
            </h3>
            <span class="rl-section-sub">Aprovada formalmente em ${d.currentSellIntoStrengthPolicy.approvedAt}</span>
          </div>
        </div>
        <div class="rl-sis-policy-card">
          <div class="rl-sis-tabs">
            <button class="rl-sis-tab ${activeTab === 'HOLD' ? 'active' : ''}" onclick="window.ResearchLab.setPolicyTab('HOLD')">HOLD</button>
            <button class="rl-sis-tab ${activeTab === 'HARVEST' ? 'active' : ''}" onclick="window.ResearchLab.setPolicyTab('HARVEST')">HARVEST</button>
            <button class="rl-sis-tab ${activeTab === 'PROTECT' ? 'active' : ''}" onclick="window.ResearchLab.setPolicyTab('PROTECT')">PROTECT</button>
          </div>
          <div class="rl-sis-content-grid">
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-bright); margin-bottom: 0.5rem; text-transform: uppercase;">
                Condições oficiais para manutenção da posição
              </div>
              <ul class="rl-checklist">
                ${d.currentSellIntoStrengthPolicy.holdConditions.map(c => `
                  <li><span class="rl-checklist-icon">✓</span> ${c}</li>
                `).join('')}
              </ul>
            </div>
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-bright); margin-bottom: 0.5rem; text-transform: uppercase;">
                Percentuais de realização
              </div>
              <div class="rl-realization-breakdown">
                ${d.currentSellIntoStrengthPolicy.harvestRules.map(r => `
                  <div class="rl-realization-item">
                    <span>${r.target}</span>
                    <span style="color: #38bdf8; font-weight: 700;">&rarr; ${r.pct}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          <div style="margin-top: 0.5rem; text-align: center;">
            <a href="#" style="font-size: 0.75rem; color: #38bdf8; text-decoration: none;" onclick="alert('Consulte o Manual de Gestão de Saída para o histórico integral de versões.'); return false;">
              👁️ Ver detalhes da política e histórico de versões
            </a>
          </div>
        </div>
      </section>
    `;
  }


  function renderModal() {
    if (!isModalOpen) return '';
    return `
      <div class="rl-modal-backdrop" onclick="if(event.target === this) window.ResearchLab.closeModal();">
        <div class="rl-modal-dialog">
          <div class="rl-modal-header">
            <h3 class="rl-modal-title">Formular Nova Hipótese Quantitativa</h3>
            <button class="rl-modal-close" onclick="window.ResearchLab.closeModal()">&times;</button>
          </div>
          <form onsubmit="window.ResearchLab.saveHypothesis(event)">
            <div class="rl-form-group">
              <label class="rl-form-label">Título da Hipótese</label>
              <input type="text" id="rlHypoTitle" class="rl-form-input" required placeholder="Ex: RS < 80 gera menos expectativa no diário" />
            </div>
            <div class="rl-form-group">
              <label class="rl-form-label">Descrição / Racional Causal</label>
              <textarea id="rlHypoDesc" class="rl-form-textarea" rows="3" required placeholder="Descreva os filtros alterados, o mecanismo de mercado e o resultado esperado..."></textarea>
            </div>
            <div class="rl-form-group">
              <label class="rl-form-label">Status Inicial</label>
              <select id="rlHypoStatus" class="rl-form-select">
                <option value="IN_STUDY">🧪 Em estudo</option>
                <option value="DISCOVERY">💡 Descoberta identificada</option>
                <option value="OBSERVATION">👁️ Observação</option>
              </select>
            </div>
            <div class="rl-modal-footer">
              <button type="button" class="rl-export-btn" onclick="window.ResearchLab.closeModal()">Cancelar</button>
              <button type="submit" class="rl-apply-btn">Salvar no Laboratório</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function openNewHypothesisModal() {
    isModalOpen = true;
    render();
  }

  function closeModal() {
    isModalOpen = false;
    render();
  }

  function saveHypothesis(e) {
    if (e && e.preventDefault) e.preventDefault();
    const titleInput = document.getElementById('rlHypoTitle');
    const descInput = document.getElementById('rlHypoDesc');
    const statusSelect = document.getElementById('rlHypoStatus');
    if (!titleInput || !descInput) return;

    const newHypo = {
      id: `H-${String(Math.floor(Math.random() * 900) + 100)}`,
      title: titleInput.value.trim(),
      occurrences: 0,
      observedResult: 'Aguardando simulação',
      status: statusSelect ? statusSelect.value : 'IN_STUDY',
      updatedAt: new Date().toISOString().slice(0, 10),
      author: 'Trader / Quant',
      description: descInput.value.trim()
    };

    if (currentDashboard && currentDashboard.candidateRules) {
      currentDashboard.candidateRules.unshift(newHypo);
      currentDashboard.statusSummary.hypothesesInStudyCount++;
    }

    isModalOpen = false;
    render();
    if (window.toast) {
      window.toast('Nova hipótese quantitativa registrada no Laboratório de Pesquisa!');
    }
  }

  function setPolicyTab(tab) {
    activeTab = tab;
    render();
  }

  function updateFilter(key, val) {
    filters[key] = val;
  }

  function applyFilters() {
    loadData().then(render);
    if (window.toast) {
      window.toast('Filtros do Laboratório aplicados com sucesso.');
    }
  }

  function exportReport() {
    if (!currentDashboard) return;
    const d = currentDashboard;
    const lines = [
      `# Relatório Quantitativo — Laboratório de Pesquisa`,
      `**Selo:** ${d.modeBadge}`,
      `**Aviso:** ${d.disclaimer}`,
      `**Data da Emissão:** ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`,
      `**Base Analisada:** ${d.baseInfo.period} | ${d.baseInfo.asset} | ${d.baseInfo.strategy}`,
      ``,
      `---`,
      `## 1. Visão Geral das Evidências`,
      `- **Trades Analisados:** ${d.evidenceOverview.totalTrades}`,
      `- **Distribuição por Grade:** Grade A: ${d.evidenceOverview.gradeA.count} (${d.evidenceOverview.gradeA.pct}%) | Grade B: ${d.evidenceOverview.gradeB.count} (${d.evidenceOverview.gradeB.pct}%) | Grade C: ${d.evidenceOverview.gradeC.count} (${d.evidenceOverview.gradeC.pct}%)`,
      `- **MFE Médio:** ${d.evidenceOverview.mfeAvgR} R`,
      `- **Resultado Médio:** ${d.evidenceOverview.resultAvgR} R`,
      `- **Expectancy:** ${d.evidenceOverview.expectancyR} R`,
      `- **Capture Ratio:** ${d.evidenceOverview.captureRatioPct}%`,
      `- **Giveback Médio:** ${d.evidenceOverview.givebackAvgR} R`,
      ``,
      `---`,
      `## 2. Distribuição do MFE`,
      `| Múltiplo | Todos | Grade A | Grade B | Grade C |`,
      `| --- | --- | --- | --- | --- |`,
      ...d.mfeDistribution.rows.map(r => `| ${r.threshold} | ${r.allPct}% (${r.allCount}) | ${r.gradeAPct}% | ${r.gradeBPct}% | ${r.gradeCPct}% |`),
      ``,
      `---`,
      `## 3. Velocidade dos Trades`,
      `- **Trades Rápidos/Explosivos (33%):** Tempo médio p/ +1R: ${d.tradeVelocity.fast.timeTo1R} | MFE: ${d.tradeVelocity.fast.mfeAvgR}R | Giveback: ${d.tradeVelocity.fast.givebackAvgR}R`,
      `- **Trades Lentos/Organizados (67%):** Tempo médio p/ +1R: ${d.tradeVelocity.slow.timeTo1R} | MFE: ${d.tradeVelocity.slow.mfeAvgR}R | Giveback: ${d.tradeVelocity.slow.givebackAvgR}R`,
      ``,
      `---`,
      `## 4. Políticas de Saída & Benchmarks`,
      `- **Benchmark Trailing Puro:** Expectancy: ${d.exitPolicies.benchmarkTrailingPuro.expectancyR}R | Drawdown: ${d.exitPolicies.benchmarkTrailingPuro.maxDrawdownR}R`,
      `- **Sell Into Strength Mecânico:** Expectancy: ${d.exitPolicies.mechanicalSellIntoStrength.expectancyR}R (+19%) | Drawdown: ${d.exitPolicies.mechanicalSellIntoStrength.maxDrawdownR}R`,
      `- **Sell Into Strength Contextual:** Expectancy: ${d.exitPolicies.contextualSellIntoStrength.expectancyR}R (+40%) | Drawdown: ${d.exitPolicies.contextualSellIntoStrength.maxDrawdownR}R`,
      ``,
      `---`,
      `## 5. Regras Candidatas Ativas`,
      ...d.candidateRules.map(r => `- **[${r.id}]** ${r.title} — Status: ${r.status} (${r.observedResult})`),
      ``,
      `---`,
      `## 6. Regras Rejeitadas & Problemas Identificados`,
      ...d.rejectedRules.map(r => `- **${r.ruleTested}:** Rejeitada em ${r.date} devido a "${r.failureReason}".`),
      ``,
      `---`,
      `## 7. Análise de Grade por Gatilho Operacional (Laboratório)`,
      ...(d.gradeByTrigger ? Object.keys(d.gradeByTrigger).flatMap(trig => {
        const gm = d.gradeByTrigger[trig];
        return [
          `### ${trig}`,
          `| Grade | Oportunidades | Executados | Taxa Bloqueio | Win Rate | Expectativa (R) | Amostra |`,
          `| --- | --- | --- | --- | --- | --- | --- |`,
          ...['ALL', 'A+', 'A', 'B', 'C'].map(gr => {
            const st = gm[gr] || {};
            const br = st.opportunitiesCount > 0 ? ((st.blockedCount / st.opportunitiesCount) * 100).toFixed(0) : '0';
            const note = st.isLowSample ? 'n < 30 (Incerteza)' : 'Robusto';
            return `| ${gr} | ${st.opportunitiesCount || 0} | ${st.executedCount || 0} | ${br}% | ${(st.winRate || 0).toFixed(1)}% | ${(st.expectancyR || 0).toFixed(2)}R | ${note} |`;
          }),
          ``
        ];
      }) : []),
      `---`,
      `## 8. Cenários Paramétricos de Risco & Estresse`,
      ...(d.riskScenarios ? Object.keys(d.riskScenarios).map(k => {
        const sc = d.riskScenarios[k];
        const p = sc.report ? sc.report.performance : {};
        const r = sc.report ? sc.report.risk : {};
        return `- **[${sc.id}] ${sc.name}:** Retorno: ${p.netReturnPct || 0}% | Expectancy: ${p.expectancyR || 0}R | Win Rate: ${p.winRate || 0}% | Max DD: -${r.maxDrawdownPct || 0}% | PF: ${p.profitFactor || 0}`;
      }) : [])
    ];

    const markdownText = lines.join('\n');
    const blob = new Blob([markdownText], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-pesquisa-quantitativa-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (window.toast) {
      window.toast('Relatório Quantitativo de Pesquisa exportado em Markdown!');
    }
  }

  function init() {
    loadData().then(render);
  }

  
  function setMainTab(tab) {
    activeMainTab = tab;
    render();
  }
window.ResearchLab = {
    setMainTab,
    init,
    render,
    updateFilter,
    applyFilters,
    setPolicyTab,
    openNewHypothesisModal,
    closeModal,
    saveHypothesis,
    exportReport
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('researchlab')) init();
    });
  } else {
    if (document.getElementById('researchlab')) init();
  }
})();
