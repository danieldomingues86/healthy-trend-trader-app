(function (root) {
  'use strict';

  const M = root.MissionModel;
  const RM = root.RebuildModeModel;

  if (!M) {
    console.error('MissionModel não carregado.');
    return;
  }

  // Estado em memória da tela
  let currentMission = null;
  let missionHistory = [];
  let selectedWaypointNumber = null;
  let historyActiveFilter = 'ALL'; // 'ALL' | 'STANDARD' | 'REBUILD'

  function getMissionStorage() {
    return root.healthyTrendWorkspace?.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  }

  function isLegacyMockSeed(mission) {
    if (!mission) return false;
    if (mission.id === 'mission-default-1' && Array.isArray(mission.trades)) {
      const hasMock = mission.trades.some(t => t.id === 'mt-1' || t.id === 'mt-2' || t.id === 'mt-7');
      if (hasMock && mission.status !== 'COMPLETED') {
        return true;
      }
    }
    return false;
  }

  function loadMissionData() {
    try {
      const storage = getMissionStorage();
      let raw = storage ? storage.getItem(M.STORAGE_KEY) : null;
      if (!raw && typeof localStorage !== 'undefined' && storage !== localStorage) {
        raw = localStorage.getItem(M.STORAGE_KEY);
      }
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (parsed && typeof parsed === 'object') {
          if (isLegacyMockSeed(parsed)) {
            parsed.trades = [];
            parsed.status = 'NOT_STARTED';
            parsed.startDate = null;
          }
          currentMission = parsed;
        }
      }
    } catch (_) {}

    if (!currentMission) {
      currentMission = { ...M.DEFAULT_MISSION, trades: [] };
    }

    // Garante que o modo está inicializado
    if (!currentMission.mode) {
      currentMission.mode = M.MODES?.STANDARD || 'STANDARD';
    }

    try {
      const storage = getMissionStorage();
      let histRaw = storage ? storage.getItem(M.HISTORY_STORAGE_KEY) : null;
      if (!histRaw && typeof localStorage !== 'undefined' && storage !== localStorage) {
        histRaw = localStorage.getItem(M.HISTORY_STORAGE_KEY);
      }
      if (histRaw) {
        const parsedHist = typeof histRaw === 'string' ? JSON.parse(histRaw) : histRaw;
        if (Array.isArray(parsedHist)) {
          missionHistory = parsedHist;
        }
      }
    } catch (_) {}
  }

  function saveMissionData() {
    try {
      const storage = getMissionStorage();
      const serialized = JSON.stringify(currentMission);
      const serializedHist = JSON.stringify(missionHistory);

      if (storage) {
        storage.setItem(M.STORAGE_KEY, serialized);
        storage.setItem(M.HISTORY_STORAGE_KEY, serializedHist);
      }
      if (typeof localStorage !== 'undefined' && storage !== localStorage) {
        localStorage.setItem(M.STORAGE_KEY, serialized);
        localStorage.setItem(M.HISTORY_STORAGE_KEY, serializedHist);
      }
      if (root.healthyTrendWorkspace?.save) {
        root.healthyTrendWorkspace.save('missionState', currentMission);
        root.healthyTrendWorkspace.save('missionHistory', missionHistory);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('healthyTrend:missionStateChanged', {
          detail: { mission: currentMission, active: currentMission?.status === 'ACTIVE' }
        }));
      }
    } catch (_) {}
  }

  // Sincronização automática com carregamento tardio do workspace
  if (typeof window !== 'undefined') {
    window.addEventListener('healthyTrend:workspaceLoaded', function (e) {
      const wsState = e.detail?.state;
      if (wsState?.missionState) {
        currentMission = wsState.missionState;
        if (document.getElementById('missionRoot')) {
          renderMissionPage();
        }
      }
    });
  }

  function getEquity() {
    if (root.portfolioState && Number(root.portfolioState.equity) > 0) {
      return Number(root.portfolioState.equity);
    }
    if (root.wealthState && Number(root.wealthState.equity) > 0) {
      return Number(root.wealthState.equity);
    }
    if (root.riskPolicyState && Number(root.riskPolicyState.equity) > 0) {
      return Number(root.riskPolicyState.equity);
    }
    return 100000; // Valor de referência para demonstração
  }

  function getOpenPositionsCount() {
    if (Array.isArray(root.positionsState?.positions)) {
      return root.positionsState.positions.filter(p => !p.closed && p.status !== 'CLOSED').length;
    }
    if (Array.isArray(root.operationalState?.positions)) {
      return root.operationalState.positions.filter(p => p.mode === 'real').length;
    }
    if (Array.isArray(root.portfolioState?.positions)) {
      return root.portfolioState.positions.length;
    }
    return 0;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── Renderização da Tela Principal ──────────────────────────────────────────
  function renderMissionPage() {
    const rootEl = document.getElementById('missionRoot');
    if (!rootEl) return;

    loadMissionData();

    const isRebuild = currentMission.mode === 'REBUILD';
    const rebuildState = RM ? RM.getRebuildState() : { isActive: false };
    const progress = M.calculateMissionProgress(currentMission, { equity: getEquity() });
    const waypoints = progress.waypoints;
    const openPositions = getOpenPositionsCount();

    // Coordenadas exatas na montanha para os 7 marcos ao longo da crista
    const waypointCoords = [
      { left: 36.5, top: 51.5 }, // Marco 1
      { left: 44.5, top: 48.5 }, // Marco 2
      { left: 53.5, top: 46.5 }, // Marco 3
      { left: 61.5, top: 44.0 }, // Marco 4
      { left: 70.0, top: 40.0 }, // Marco 5
      { left: 78.0, top: 35.0 }, // Marco 6
      { left: 83.5, top: 25.5 }  // Marco 7 (Cume / Baú)
    ];

    // Cálculos do Gauge Radial
    const radius = 48;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress.progressPct / 100) * circumference;

    const html = `
      <div class="mission-shell ${isRebuild ? 'is-rebuild-mode' : 'is-standard-mode'}">
        <!-- Hero Artístico da Montanha com Soldado e Trilha -->
        <section class="mission-hero-panorama ${isRebuild ? 'theme-rebuild-hero' : ''}" aria-label="Jornada da Missão" onclick="window.handleSelectWaypoint(null)">
          <!-- Overlay de Leitura Independente e Contraste Uniforme -->
          <div class="mission-hero-readability-overlay" aria-hidden="true"></div>

          <!-- Coluna Independente de Leitura e Configuração (Esquerda) -->
          <div class="mission-hero-briefing" onclick="event.stopPropagation()">
            <!-- Linha de Navegação (sem Histórico redundante no Hero) -->
            <div class="mission-hero-nav-row">
              <button class="mission-hero-breadcrumb-btn" type="button" onclick="go('tradertraining')">
                ← TREINAMENTO
              </button>
            </div>

            <!-- Título e Citação do Modo -->
            ${isRebuild ? `
              <h1 class="mission-hero-title-rebuild">RECUPERAÇÃO</h1>
              <p class="mission-hero-quote-rebuild">“Não tente recuperar o patrimônio.<br>Recupere o Trader.”</p>
            ` : `
              <h1>MISSÃO</h1>
              <p class="mission-hero-quote-standard">Disciplina hoje.<br>Um trader melhor amanhã.</p>
            `}

            <!-- Princípios de Recuperação / Foco -->
            <div class="mission-recovery-principles" aria-label="Princípios do Modo">
              ${isRebuild ? `
                <span class="mission-principle-tag">PROTEÇÃO</span>
                <span class="mission-principle-tag">PACIÊNCIA</span>
                <span class="mission-principle-tag">CALMA</span>
                <span class="mission-principle-tag">RECONSTRUÇÃO</span>
              ` : `
                <span class="mission-principle-tag">DISCIPLINA</span>
                <span class="mission-principle-tag">FOCO</span>
                <span class="mission-principle-tag">CONFIANÇA</span>
                <span class="mission-principle-tag">CONSISTÊNCIA</span>
              `}
            </div>

            <!-- Card Superior Central: MINHA MISSÃO / MOTIVO DA RECUPERAÇÃO -->
            <div class="mission-center-card ${isRebuild ? 'theme-rebuild-card' : ''}" onclick="event.stopPropagation()">
              <div class="mission-center-head">
                <span class="mission-center-kicker">
                  ${isRebuild ? 'MOTIVO DA RECUPERAÇÃO' : 'MINHA MISSÃO'}
                </span>
                <button id="missionHeroEditBtn" class="mission-edit-btn" type="button" onclick="window.openEditMissionModal(event)" title="Editar informações da recuperação">
                  ✎ Editar
                </button>
              </div>
              <h2 class="mission-goal-text">${escapeHtml(currentMission.title)}</h2>
              <div class="mission-reason-label">
                ${isRebuild ? 'POR QUE ESTOU EM RECUPERAÇÃO' : 'MOTIVO / PORQUÊ'}
              </div>
              <p class="mission-reason-text">${escapeHtml(currentMission.reason || 'Sem motivo registrado. Clique em Editar para registrar.')}</p>

              ${isRebuild ? `
                <div class="mission-rebuild-meta-row">
                  <span class="mission-meta-chip">📅 Retorno: <b>${M.formatDateBR(currentMission.plannedReturnDate)}</b></span>
                  <span class="mission-meta-chip highlight">🔒 <b>1 Posição por Vez</b></span>
                  <span class="mission-meta-chip">🛡️ Teto: <b>${M.formatPctBR(currentMission.riskPct, 2)}</b></span>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Destino no Cume (Baú da Recompensa Topo Direito) -->
          <div class="mission-reward-destination ${isRebuild ? 'theme-rebuild-destination' : ''}" onclick="window.openEditMissionModal(event); event.stopPropagation();" title="Clique para editar a recompensa / objetivo">
            <span class="mission-reward-kicker">${isRebuild ? 'OBJETIVO DO CICLO' : 'RECOMPENSA'}</span>
            <span class="mission-reward-sub">
              ${isRebuild ? 'RECUPERAR A CONFIANÇA<br>E ALEGRIA DE OPERAR' : 'POR TER CONCLUÍDO<br>A SUA MISSÃO'}
            </span>
            ${currentMission.reward ? `<div class="mission-reward-preview">🎁 ${escapeHtml(currentMission.reward)}</div>` : ''}
          </div>

          <!-- Waypoints Marcados ao Longo da Trilha Natural na Montanha -->
          <div class="mission-interactive-trail" onclick="event.stopPropagation()">
            ${waypoints.map((wp, idx) => {
              const coords = waypointCoords[idx] || { left: 50, top: 50 };
              const isSelected = selectedWaypointNumber === wp.stationNumber;

              return `
                <div class="mission-waypoint-node ${wp.status.toLowerCase()} ${isSelected ? 'is-selected' : ''}"
                     style="left: ${coords.left}%; top: ${coords.top}%;"
                     onclick="window.handleSelectWaypoint(${wp.stationNumber})"
                     title="${escapeHtml(wp.fullName)}: ${wp.rangeLabel} (${wp.statusLabel})">

                  ${wp.status === 'ACTIVE' ? '<div class="mission-node-active-crown" aria-hidden="true">◆</div>' : ''}

                  <div class="mission-node-disc">
                    ${wp.status === 'COMPLETED' ? `
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ` : (wp.status === 'ACTIVE' ? `
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"></line></svg>
                    ` : `
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    `)}
                  </div>

                  <div class="mission-waypoint-label-card">
                    <span class="mission-waypoint-title">Marco ${wp.stationNumber}</span>
                    <span class="mission-waypoint-range">${wp.rangeLabel}</span>
                    <span class="mission-waypoint-pill ${wp.status.toLowerCase()}">${wp.statusLabel}</span>
                  </div>

                  ${isSelected ? `
                    <div class="mission-waypoint-info-card" onclick="event.stopPropagation()">
                      <div class="mission-waypoint-info-head">
                        <b>${escapeHtml(wp.fullName)}</b>
                        <button type="button" class="mission-waypoint-info-close" onclick="window.handleSelectWaypoint(null)" aria-label="Fechar">✕</button>
                      </div>
                      <div class="mission-waypoint-info-body">
                        <div class="mission-waypoint-info-line">
                          <span class="mission-info-icon">⚑</span>
                          <span>${escapeHtml(wp.targetTradesText)}</span>
                        </div>
                        <div class="mission-waypoint-info-line">
                          <span class="mission-info-icon">⚑</span>
                          <span>${escapeHtml(wp.progressText)}</span>
                        </div>
                        <div class="mission-waypoint-info-line highlight">
                          <span class="mission-info-icon">⚑</span>
                          <span>${escapeHtml(wp.remainingText)}</span>
                        </div>
                      </div>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </section>

        <!-- 3 Cards Inferiores Alinhados Horizontalmente (31% / 32% / 37%) -->
        <div class="mission-cards-grid">
          <!-- Card 1: CONFIGURAÇÃO DA MISSÃO / CONTROLE -->
          <section class="mission-card mission-config-card ${isRebuild ? 'theme-rebuild-config' : ''}">
            <div class="mission-card-title">
              <span>CONFIGURAÇÃO</span>
              <span class="mission-card-mode-badge ${isRebuild ? 'rebuild' : 'standard'}">
                ${isRebuild ? '🚀 MODO RECUPERAÇÃO' : '🎯 MISSÃO PADRÃO'}
              </span>
            </div>

            <div class="mission-config-form">
              <div class="mission-config-field">
                <label for="missionTargetInput">Meta de trades</label>
                <input id="missionTargetInput" type="number" min="1" max="100" value="${currentMission.targetTrades}" onchange="window.handleTargetTradesChange(this.value)">
              </div>

              <div class="mission-config-field">
                <label for="missionRiskSelect">Risco por trade</label>
                <select id="missionRiskSelect" onchange="window.handleRiskPctChange(this.value)">
                  ${isRebuild ? `
                    <option value="0.0005" ${Math.abs(currentMission.riskPct - 0.0005) < 0.0001 ? 'selected' : ''}>0,05%</option>
                    <option value="0.0010" ${Math.abs(currentMission.riskPct - 0.0010) < 0.0001 ? 'selected' : ''}>0,10%</option>
                  ` : `
                    <option value="0.0010" ${Math.abs(currentMission.riskPct - 0.0010) < 0.0001 ? 'selected' : ''}>0,10%</option>
                    <option value="0.0015" ${Math.abs(currentMission.riskPct - 0.0015) < 0.0001 ? 'selected' : ''}>0,15%</option>
                    <option value="0.0020" ${Math.abs(currentMission.riskPct - 0.0020) < 0.0001 ? 'selected' : ''}>0,20%</option>
                    <option value="0.0025" ${Math.abs(currentMission.riskPct - 0.0025) < 0.0001 ? 'selected' : ''}>0,25%</option>
                    <option value="0.0050" ${Math.abs(currentMission.riskPct - 0.0050) < 0.0001 ? 'selected' : ''}>0,50%</option>
                    <option value="0.0100" ${Math.abs(currentMission.riskPct - 0.0100) < 0.0001 ? 'selected' : ''}>1,00%</option>
                  `}
                </select>
              </div>

              ${isRebuild ? `
                <div class="mission-config-field">
                  <label for="missionPlannedDateInput">Data planejada de retorno</label>
                  <input type="date" id="missionPlannedDateInput" value="${currentMission.plannedReturnDate || new Date().toISOString().slice(0, 10)}" onchange="window.handlePlannedDateChange(this.value)">
                </div>
                <div class="mission-rebuild-rules-badge">
                  <strong>🔒 Regra Obrigatória:</strong> 1 posição aberta por vez.<br>
                  <small>Novos trades serão bloqueados se houver operação aberta.</small>
                </div>
              ` : `
                <div class="mission-config-field mission-field-reward">
                  <label for="missionRewardInput">Recompensa ao finalizar</label>
                  <input id="missionRewardInput" type="text" value="${escapeHtml(currentMission.reward)}" placeholder="Ex: Um jantar especial">
                </div>
              `}

              ${currentMission.status === 'STOPPED' ? `
                <div class="mission-stopped-badge">
                  <strong>Ciclo Interrompido</strong><br>
                  <small>A política normal de risco está ativa no Novo Trade.</small>
                </div>
              ` : ''}

              <div id="missionConfigFeedback" class="mission-inline-feedback" style="display:none;"></div>

              <div class="mission-actions-stack">
                <button class="mission-start-btn ${currentMission.status === 'ACTIVE' ? 'is-active' : ''}" type="button" onclick="window.handleStartOrSaveMission()">
                  ${currentMission.status === 'ACTIVE' ? '✓ Salvar Alterações' : (currentMission.status === 'STOPPED' ? '▶ Retomar Ciclo' : '▶ Iniciar Ciclo')}
                </button>

                <div class="mission-secondary-actions">
                  <button class="mission-new-modal-btn" type="button" onclick="window.openNewMissionModal()">
                    ＋ Nova Missão / Alterar Modalidade
                  </button>

                  ${currentMission.status === 'ACTIVE' ? `
                    <button class="mission-stop-btn" type="button" onclick="window.openStopMissionModal()">
                      ⏹ Parar Ciclo
                    </button>
                  ` : ''}

                  ${(currentMission.status === 'ACTIVE' || currentMission.status === 'STOPPED' || currentMission.status === 'COMPLETED') ? `
                    <button class="mission-reset-btn" type="button" onclick="window.openResetMissionModal()">
                      ↺ Reiniciar do Zero
                    </button>
                  ` : ''}
                </div>
              </div>

              <span class="mission-config-hint">
                ${currentMission.status === 'ACTIVE'
                  ? `Ciclo ativo com teto de ${M.formatPctBR(currentMission.riskPct, 2)} por trade no Novo Trade.`
                  : (currentMission.status === 'STOPPED'
                    ? 'Ciclo parado. Sua política normal de risco está em vigor.'
                    : 'Ao iniciar, o progresso começará em zero com risco limitado.')}
              </span>
            </div>
          </section>

          <!-- Card 2: PROGRESSO DO CICLO & TELEMETRIA -->
          <section class="mission-card mission-progress-card">
            <div class="mission-card-title">
              <span>PROGRESSO DO CICLO</span>
            </div>
            <div class="mission-progress-body">
              <div class="mission-progress-top-grid">
                <div class="mission-radial-gauge">
                  <svg class="mission-gauge-svg" viewBox="0 0 120 120">
                    <circle class="mission-gauge-bg" cx="60" cy="60" r="${radius}"></circle>
                    <circle class="mission-gauge-fill ${isRebuild ? 'rebuild-stroke' : ''}" cx="60" cy="60" r="${radius}"
                            stroke-dasharray="${circumference}"
                            stroke-dashoffset="${strokeDashoffset}"></circle>
                  </svg>
                  <div class="mission-gauge-text">
                    <strong>${progress.progressPct}%</strong>
                    <small>Progresso geral</small>
                  </div>
                </div>

                <div class="mission-stats-list">
                  <div class="mission-stat-item">
                    <span class="mission-stat-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                    </span>
                    <div class="mission-stat-content">
                      <strong>${progress.completedTrades} de ${progress.targetTrades}</strong>
                      <small>trades concluídos</small>
                    </div>
                  </div>

                  <div class="mission-stat-item">
                    <span class="mission-stat-icon" style="color:#f59e0b;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"></line></svg>
                    </span>
                    <div class="mission-stat-content">
                      <strong>${progress.completedStations} de 7</strong>
                      <small>marcos concluídos</small>
                    </div>
                  </div>

                  <div class="mission-stat-item">
                    <span class="mission-stat-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </span>
                    <div class="mission-stat-content">
                      <strong>${progress.daysSinceStart} dias</strong>
                      <small>Desde o início</small>
                    </div>
                  </div>

                  <div class="mission-stat-item">
                    <span class="mission-stat-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="m16 10-4 4-2-2"></path></svg>
                    </span>
                    <div class="mission-stat-content">
                      <strong>${progress.riskPctFormatted}</strong>
                      <small>Risco definido</small>
                    </div>
                  </div>

                  ${progress.completedTrades > 0 ? `
                    <div class="mission-stat-item">
                      <span class="mission-stat-icon" style="color:#0284c7;">🎯</span>
                      <div class="mission-stat-content">
                        <strong>${progress.winRatePct}%</strong>
                        <small>Taxa de acerto</small>
                      </div>
                    </div>
                    <div class="mission-stat-item">
                      <span class="mission-stat-icon" style="color:${progress.totalR >= 0 ? '#16a34a' : '#dc2626'};">📈</span>
                      <div class="mission-stat-content">
                        <strong style="color:${progress.totalR >= 0 ? '#16a34a' : '#dc2626'};">${progress.totalR >= 0 ? '+' : ''}${progress.totalR.toFixed(2).replace('.', ',')}R</strong>
                        <small>Retorno acumulado</small>
                      </div>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Frase Motivacional Integrada no Card 2 -->
              <div class="mission-card-quote-box ${isRebuild ? 'theme-rebuild-quote' : ''}">
                <p class="mission-card-quote-text">
                  ${isRebuild
                    ? '“O objetivo agora não é pensar em fazer muito dinheiro. É recuperar a sua confiança e alegria de operar.”'
                    : '“Disciplina hoje. Um trader melhor amanhã. O processo é o único controle que você tem sobre o mercado.”'}
                </p>
                <div class="mission-card-quote-sub">
                  ${isRebuild ? 'Protocolo de Recuperação do Trader' : 'The Healthy Trend Trader'}
                </div>
              </div>
            </div>
          </section>

          <!-- Card 3: ÚLTIMOS TRADES DO CICLO -->
          <section class="mission-card mission-trades-card">
            <div class="mission-card-title">
              <span>ÚLTIMOS TRADES DO CICLO</span>
              <div class="mission-trades-head-actions">
                <button class="mission-mark-trade-btn ${isRebuild ? 'theme-rebuild-mark-btn' : ''}" type="button" onclick="window.openMarkTradeModal()">
                  + Marcar Trade
                </button>
              </div>
            </div>

            ${isRebuild && openPositions >= 1 ? `
              <div class="mission-rebuild-open-alert">
                🔒 <b>Posição aberta em andamento (${openPositions}).</b><br>
                Durante o Rebuild, opere apenas 1 ativo por vez.
              </div>
            ` : ''}

            <div class="mission-trades-table-wrap">
              ${currentMission.trades && currentMission.trades.length > 0 ? `
                <table class="mission-trades-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>DATA</th>
                      <th>ATIVO</th>
                      <th>RESULTADO</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${currentMission.trades.slice(0, 10).map(trade => `
                      <tr>
                        <td>${trade.tradeNumber}</td>
                        <td>${escapeHtml(trade.date)}</td>
                        <td><b>${escapeHtml(trade.ticker)}</b></td>
                        <td>
                          <span class="mission-trade-check" title="Trade executado dentro das regras">✓</span>
                          ${trade.resultR != null ? `<small style="margin-left:4px;color:${trade.resultR >= 0 ? '#16a34a' : '#dc2626'};font-weight:700;">${trade.resultR >= 0 ? '+' : ''}${Number(trade.resultR).toFixed(2).replace('.', ',')}R</small>` : ''}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : `
                <div class="mission-empty-trades mission-empty-trades-visual">
                  <div class="mission-empty-trades-icon">
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <line x1="18" y1="20" x2="18" y2="10"></line>
                      <line x1="12" y1="20" x2="12" y2="4"></line>
                      <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                  </div>
                  <strong class="mission-empty-trades-title">Nenhum trade marcado ainda.</strong>
                  <p class="mission-empty-trades-desc">
                    ${currentMission.status === 'ACTIVE'
                      ? 'Clique em <b>+ Marcar Trade</b> após realizar uma operação dentro das regras.'
                      : 'Inicie a sua missão para começar a registrar seus trades.'}
                  </p>
                </div>
              `}
            </div>
          </section>
        </div>
      </div>

      <!-- Container para Modais Dinâmicos -->
      <div id="missionModalContainer"></div>
    `;

    rootEl.innerHTML = html;

    // Vincula explicitamente o botão Editar para garantir acionamento
    const editBtn = document.getElementById('missionHeroEditBtn');
    if (editBtn) {
      editBtn.onclick = function (e) {
        if (e) {
          if (typeof e.stopPropagation === 'function') e.stopPropagation();
          if (typeof e.preventDefault === 'function') e.preventDefault();
        }
        window.openEditMissionModal(e);
      };
    }
  }

  // ── Ações e Modais ──────────────────────────────────────────────────────────

  window.handleTargetTradesChange = function (val) {
    const nextVal = Math.max(1, Math.min(100, Math.round(Number(val) || 20)));
    currentMission = M.updateMissionConfig(currentMission, { targetTrades: nextVal }, RM ? RM.getRebuildState() : null);
    saveMissionData();
    renderMissionPage();
  };

  window.handleRiskPctChange = function (val) {
    const nextRisk = Number(val) || (currentMission.mode === 'REBUILD' ? 0.001 : 0.005);
    currentMission = M.updateMissionConfig(currentMission, { riskPct: nextRisk }, RM ? RM.getRebuildState() : null);
    saveMissionData();
    renderMissionPage();
  };

  window.handlePlannedDateChange = function (val) {
    currentMission = M.updateMissionConfig(currentMission, { plannedReturnDate: String(val || '') }, RM ? RM.getRebuildState() : null);
    saveMissionData();
    renderMissionPage();
  };

  window.handleStartOrSaveMission = function () {
    const targetInput = document.getElementById('missionTargetInput');
    const riskSelect = document.getElementById('missionRiskSelect');
    const rewardInput = document.getElementById('missionRewardInput');
    const plannedDateInput = document.getElementById('missionPlannedDateInput');

    const nextTarget = Math.max(1, Math.min(100, Math.round(Number(targetInput?.value) || currentMission.targetTrades || 20)));
    const nextRisk = Number(riskSelect?.value || currentMission.riskPct || 0.001);
    const nextReward = rewardInput ? (String(rewardInput.value || '').trim() || currentMission.reward || 'Um jantar especial') : currentMission.reward;
    const nextPlannedDate = plannedDateInput ? String(plannedDateInput.value || '') : currentMission.plannedReturnDate;

    const rebuildState = RM ? RM.getRebuildState() : null;

    // Inicializa ou atualiza a missão conforme o ciclo de vida
    const startResult = M.startMission(currentMission, {
      targetTrades: nextTarget,
      riskPct: nextRisk,
      reward: nextReward,
      plannedReturnDate: nextPlannedDate,
      mode: currentMission.mode || 'STANDARD'
    }, rebuildState);

    currentMission = startResult.mission;
    saveMissionData();
    renderMissionPage();

    const feedback = document.getElementById('missionConfigFeedback');
    if (feedback) {
      feedback.textContent = startResult.isNew
        ? 'Ciclo iniciado com sucesso! O progresso começou em zero.'
        : 'Configuração salva com sucesso! Progresso atual preservado.';
      feedback.style.display = 'block';
      setTimeout(() => {
        if (feedback) feedback.style.display = 'none';
      }, 3500);
    }
  };

  // ── Modal de Escolha da Modalidade (Nova Missão: Passo 1) ───────────────────
  window.openNewMissionModal = function () {
    const container = document.getElementById('missionModalContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="mission-modal-backdrop" onclick="window.closeMissionModal(event)">
        <div class="mission-modal-dialog mission-modal-modes-dialog" onclick="event.stopPropagation()">
          <div class="mission-modal-head">
            <div>
              <span class="mission-modal-kicker">CENTRO UNIFICADO DE TREINAMENTO</span>
              <h3 style="font-size:22px;margin:2px 0 0 0;">Configurar Nova Missão</h3>
            </div>
            <button class="mission-modal-close-btn" type="button" onclick="window.closeMissionModal()" aria-label="Fechar">✕</button>
          </div>

          <p class="mission-modal-lead">
            Selecione a modalidade de treinamento adequada ao seu momento operacional:
          </p>

          <div class="mission-modes-choice-grid">
            <!-- Opção 1: Missão Padrão -->
            <div class="mission-choice-card standard" onclick="window.openConfigureMissionModal('STANDARD')">
              <div class="mission-choice-badge">
                <span class="mission-choice-icon">🎯</span>
                <span class="mission-choice-tag">EVOLUÇÃO CONTÍNUA</span>
              </div>
              <h4>Missão Padrão</h4>
              <p class="mission-choice-desc">
                “Treine sua disciplina, fortaleça sua consistência e execute seu método com regularidade.”
              </p>
              <ul class="mission-choice-features">
                <li>Política normal de risco (0,25% a 1,00%)</li>
                <li>Meta flexível de trades (1 a 100)</li>
                <li>Marcos de progresso e recompensa ao finalizar</li>
                <li>Foco em consolidar hábitos de alta performance</li>
              </ul>
              <button class="mission-choice-btn standard" type="button">
                Escolher Missão Padrão →
              </button>
            </div>

            <!-- Opção 2: Modo Recuperação (Rebuild) -->
            <div class="mission-choice-card rebuild" onclick="window.openConfigureMissionModal('REBUILD')">
              <div class="mission-choice-badge">
                <span class="mission-choice-icon">🦅</span>
                <span class="mission-choice-tag gold">RECONSTRUÇÃO</span>
              </div>
              <h4>Modo Recuperação (Rebuild)</h4>
              <p class="mission-choice-desc">
                “Retorne gradualmente à operação, com risco reduzido e foco na reconstrução da confiança.”
              </p>
              <ul class="mission-choice-features">
                <li><b>Risco reduzido obrigatório:</b> 0,05% ou 0,10%</li>
                <li><b>Regra estrita:</b> Apenas 1 posição aberta por vez</li>
                <li>Meta delimitada de trades (5 a 10)</li>
                <li>Data planejada de retorno e restauração da política normal</li>
              </ul>
              <button class="mission-choice-btn rebuild" type="button">
                Escolher Modo Recuperação →
              </button>
            </div>
          </div>

          <div class="mission-modal-actions" style="margin-top:20px;">
            <button class="mission-btn-secondary" type="button" onclick="window.closeMissionModal()">Cancelar</button>
          </div>
        </div>
      </div>
    `;
  };

  // ── Modal de Configuração da Modalidade Escolhida (Passo 2) ──────────────────
  window.openConfigureMissionModal = function (mode) {
    const container = document.getElementById('missionModalContainer');
    if (!container) return;

    const isRebuild = mode === 'REBUILD';
    const todayStr = new Date().toISOString().slice(0, 10);

    container.innerHTML = `
      <div class="mission-modal-backdrop" onclick="window.closeMissionModal(event)">
        <div class="mission-modal-dialog" style="max-width:560px;" onclick="event.stopPropagation()">
          <div class="mission-modal-head">
            <div>
              <span class="mission-modal-kicker ${isRebuild ? 'gold-kicker' : ''}">
                ${isRebuild ? '🦅 MODO RECUPERAÇÃO (REBUILD)' : '🎯 MISSÃO PADRÃO'}
              </span>
              <h3>${isRebuild ? 'Configurar Ciclo de Recuperação' : 'Configurar Missão Padrão'}</h3>
            </div>
            <button class="mission-modal-close-btn" type="button" onclick="window.closeMissionModal()" aria-label="Fechar">✕</button>
          </div>

          <div class="mission-modal-body">
            ${isRebuild ? `
              <div class="mission-modal-rebuild-rules-box">
                <div class="mission-rebuild-box-title">🛡️ Regras Obrigatórias do Modo Recuperação:</div>
                <ul>
                  <li><b>1 posição aberta por vez:</b> O sistema bloqueia novos trades enquanto houver uma operação em andamento.</li>
                  <li><b>Teto reduzido de risco:</b> Travado em 0,05% ou 0,10% para proteger capital e remover a pressão financeira.</li>
                  <li><b>Foco em processo:</b> Não tente recuperar o patrimônio. Recupere o trader.</li>
                </ul>
              </div>

              <div class="mission-form-group">
                <label for="cfgTargetTrades">Meta de Trades do Ciclo</label>
                <select id="cfgTargetTrades">
                  <option value="5" selected>5 trades (Ciclo Curto de Confiança)</option>
                  <option value="10">10 trades (Ciclo Moderado de Reconstrução)</option>
                </select>
              </div>

              <div class="mission-form-group">
                <label for="cfgRiskPct">Risco Reduzido por Trade</label>
                <select id="cfgRiskPct">
                  <option value="0.0005" selected>0,05%</option>
                  <option value="0.0010">0,10%</option>
                </select>
                <small style="color:#94a3b8;font-size:11.5px;display:block;margin-top:4px;">
                  Teto rigorosamente aplicado e travado no cálculo do Novo Trade.
                </small>
              </div>

              <div class="mission-form-group">
                <label for="cfgPlannedDate">Data Planejada de Retorno</label>
                <input id="cfgPlannedDate" type="date" value="${todayStr}">
              </div>

              <div class="mission-form-group">
                <label for="cfgReason">Motivo da Recuperação</label>
                <textarea id="cfgReason" rows="3" placeholder="Por que você está entrando em recuperação? O que aconteceu e o que precisa ser reconstruído emocionalmente?"></textarea>
              </div>
            ` : `
              <div class="mission-form-group">
                <label for="cfgTargetTrades">Número de Trades (Meta)</label>
                <input id="cfgTargetTrades" type="number" min="1" max="100" value="20" placeholder="Ex: 20">
                <small style="color:#94a3b8;font-size:11.5px;display:block;margin-top:4px;">
                  Recomendado: 20 trades disciplinados para consolidar o hábito.
                </small>
              </div>

              <div class="mission-form-group">
                <label for="cfgRiskPct">Risco por Trade</label>
                <select id="cfgRiskPct">
                  <option value="0.0010">0,10%</option>
                  <option value="0.0020">0,20%</option>
                  <option value="0.0025" selected>0,25%</option>
                  <option value="0.0050">0,50%</option>
                  <option value="0.0100">1,00%</option>
                </select>
              </div>

              <div class="mission-form-group">
                <label for="cfgTitle">Objetivo Central da Missão</label>
                <input id="cfgTitle" type="text" value="Minha Missão de Disciplina" placeholder="Ex: Operar pequeno e constante">
              </div>

              <div class="mission-form-group">
                <label for="cfgReason">Motivo / Por quê?</label>
                <textarea id="cfgReason" rows="3" placeholder="Qual barreira você deseja superar? Por que esse compromisso é importante?"></textarea>
              </div>

              <div class="mission-form-group">
                <label for="cfgReward">Recompensa ao Concluir</label>
                <input id="cfgReward" type="text" value="Um jantar especial" placeholder="Ex: Um jantar especial, um presente para si">
              </div>
            `}

            <div id="cfgModalError" class="mission-inline-error" style="display:none;"></div>

            <div class="mission-modal-actions">
              <button class="mission-btn-secondary" type="button" onclick="window.openNewMissionModal()">← Voltar</button>
              <button class="mission-btn-primary ${isRebuild ? 'theme-rebuild-submit-btn' : ''}" type="button" onclick="window.handleConfirmStartConfiguredMission('${mode}')">
                ${isRebuild ? '🦅 Iniciar Modo Recuperação' : '▶ Iniciar Missão Padrão'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  window.handleConfirmStartConfiguredMission = function (mode) {
    const isRebuild = mode === 'REBUILD';
    const targetEl = document.getElementById('cfgTargetTrades');
    const riskEl = document.getElementById('cfgRiskPct');
    const titleEl = document.getElementById('cfgTitle');
    const reasonEl = document.getElementById('cfgReason');
    const rewardEl = document.getElementById('cfgReward');
    const plannedDateEl = document.getElementById('cfgPlannedDate');
    const errorEl = document.getElementById('cfgModalError');

    const targetTrades = Math.max(1, Math.min(100, Math.round(Number(targetEl?.value) || (isRebuild ? 5 : 20))));
    const riskPct = Number(riskEl?.value || (isRebuild ? 0.0005 : 0.0025));
    const title = isRebuild
      ? 'Reconstrução da Confiança Operacional'
      : (String(titleEl?.value || '').trim() || 'Minha Missão de Disciplina');
    const reason = String(reasonEl?.value || '').trim();
    const reward = isRebuild ? 'Confiança e tranquilidade recuperadas' : String(rewardEl?.value || '').trim();
    const plannedReturnDate = isRebuild ? (String(plannedDateEl?.value || '') || new Date().toISOString().slice(0, 10)) : null;

    if (isRebuild && !reason) {
      if (errorEl) {
        errorEl.textContent = 'Por favor, registre o motivo da recuperação (o que você deseja reconstruir).';
        errorEl.style.display = 'block';
      }
      reasonEl?.focus();
      return;
    }

    // Se havia uma missão anterior em andamento com trades, arquiva
    if (currentMission && Array.isArray(currentMission.trades) && currentMission.trades.length > 0) {
      missionHistory.unshift({
        ...currentMission,
        archivedAt: new Date().toISOString(),
        archiveReason: 'Substituída por novo ciclo de ' + (isRebuild ? 'Recuperação' : 'Missão Padrão')
      });
    }

    currentMission = M.createMission({
      title,
      reason,
      targetTrades,
      riskPct,
      reward,
      mode: isRebuild ? 'REBUILD' : 'STANDARD',
      plannedReturnDate,
      maxPositions: isRebuild ? 1 : 6,
      status: 'ACTIVE'
    });

    saveMissionData();
    window.closeMissionModal();
    renderMissionPage();
  };

  window.openEditMissionModal = function (event) {
    if (event) {
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
      if (typeof event.preventDefault === 'function') event.preventDefault();
    }
    loadMissionData();
    let container = document.getElementById('missionModalContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'missionModalContainer';
      const rootEl = document.getElementById('missionRoot') || document.body;
      rootEl.appendChild(container);
    }

    const isRebuild = currentMission.mode === 'REBUILD';

    container.innerHTML = `
      <div class="mission-modal-backdrop" onclick="window.closeMissionModal(event)">
        <div class="mission-modal-dialog" onclick="event.stopPropagation()">
          <div class="mission-modal-head">
            <div>
              <span class="mission-modal-kicker ${isRebuild ? 'gold-kicker' : ''}">${isRebuild ? '🦅 MODO RECUPERAÇÃO (REBUILD)' : '🎯 MISSÃO PADRÃO'}</span>
              <h3>${isRebuild ? 'Editar Configuração da Recuperação' : 'Editar Minha Missão'}</h3>
            </div>
            <button class="mission-modal-close-btn" type="button" onclick="window.closeMissionModal(event)" aria-label="Fechar">✕</button>
          </div>
          <div class="mission-modal-body">
            <div class="mission-form-group">
              <label for="editMissionTitle">${isRebuild ? 'Motivo da Recuperação' : 'Objetivo da Missão'}</label>
              <input id="editMissionTitle" type="text" value="${escapeHtml(currentMission.title)}" placeholder="${isRebuild ? 'Ex: Reconstrução da Confiança Operacional' : 'Ex: 20 Trades Seguidos no Plano'}">
              <small class="mission-form-help">${isRebuild ? 'O foco e tema central deste ciclo de recuperação.' : 'O objetivo central da sua jornada operacional.'}</small>
            </div>

            <div class="mission-form-group">
              <label for="editMissionReason">${isRebuild ? 'Descrição ou Justificativa Pessoal' : 'Motivo / Por quê?'}</label>
              <textarea id="editMissionReason" rows="3" placeholder="${isRebuild ? 'Descreva o que motivou a entrada em recuperação e seu compromisso pessoal com o método.' : 'Por que esta missão é importante para você?'}">${escapeHtml(currentMission.reason || '')}</textarea>
              <small class="mission-form-help">${isRebuild ? 'Seu lembrete pessoal para manter a calma, paciência e disciplina.' : 'A razão emocional e profissional por trás desta meta.'}</small>
            </div>

            ${isRebuild ? `
              <div class="mission-form-group">
                <label for="editMissionPlannedDate">Data Planejada de Retorno</label>
                <input id="editMissionPlannedDate" type="date" value="${currentMission.plannedReturnDate || ''}">
                <small class="mission-form-help">Data estimada para reavaliar sua consistência e retornar ao modo padrão.</small>
              </div>
            ` : `
              <div class="mission-form-group">
                <label for="editMissionReward">Recompensa ao Finalizar</label>
                <input id="editMissionReward" type="text" value="${escapeHtml(currentMission.reward || '')}">
              </div>
            `}

            <div id="editMissionModalError" class="mission-inline-error" style="display:none;"></div>

            <div class="mission-modal-actions">
              <button class="mission-btn-secondary" type="button" onclick="window.closeMissionModal(event)">Cancelar</button>
              <button class="mission-btn-primary" type="button" onclick="window.handleSaveEditMissionModal(event)">Salvar alterações</button>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  window.handleSaveEditMissionModal = function (event) {
    if (event) {
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
      if (typeof event.preventDefault === 'function') event.preventDefault();
    }
    const titleEl = document.getElementById('editMissionTitle');
    const reasonEl = document.getElementById('editMissionReason');
    const rewardEl = document.getElementById('editMissionReward');
    const plannedDateEl = document.getElementById('editMissionPlannedDate');
    const errorEl = document.getElementById('editMissionModalError');

    const title = String(titleEl?.value || '').trim();
    const reason = String(reasonEl?.value || '').trim();
    const reward = rewardEl ? String(rewardEl.value || '').trim() : currentMission.reward;
    const plannedReturnDate = plannedDateEl ? String(plannedDateEl.value || '') : currentMission.plannedReturnDate;

    if (!title) {
      if (errorEl) {
        errorEl.textContent = currentMission.mode === 'REBUILD'
          ? 'Por favor, informe o motivo da recuperação.'
          : 'Por favor, informe o objetivo da missão.';
        errorEl.style.display = 'block';
      }
      titleEl?.focus();
      return;
    }

    const rebuildState = RM ? RM.getRebuildState() : null;

    currentMission = M.updateMissionConfig(currentMission, {
      title,
      reason,
      reward,
      plannedReturnDate
    }, rebuildState);

    if (currentMission.mode === 'REBUILD' && RM && typeof RM.setRebuildConfig === 'function') {
      RM.setRebuildConfig({
        reason: title,
        notes: reason,
        plannedReturnDate: plannedReturnDate
      });
    }

    saveMissionData();
    window.closeMissionModal();
    renderMissionPage();
  };

  window.handleSelectWaypoint = function (stationNumber) {
    if (selectedWaypointNumber === stationNumber) {
      selectedWaypointNumber = null;
    } else {
      selectedWaypointNumber = stationNumber;
    }
    renderMissionPage();
  };

  window.openMarkTradeModal = function () {
    const container = document.getElementById('missionModalContainer');
    if (!container) return;

    if (currentMission.status !== 'ACTIVE') {
      window.openNewMissionModal();
      return;
    }

    const progress = M.calculateMissionProgress(currentMission);
    if (progress.isCompleted) {
      window.openCelebrationModal();
      return;
    }

    const isRebuild = currentMission.mode === 'REBUILD';
    const openPositions = getOpenPositionsCount();
    const todayStr = new Date().toLocaleDateString('pt-BR');

    container.innerHTML = `
      <div class="mission-modal-backdrop" onclick="window.closeMissionModal(event)">
        <div class="mission-modal-dialog" onclick="event.stopPropagation()">
          <div class="mission-modal-head">
            <h3>Marcar Trade no Ciclo</h3>
            <button class="mission-modal-close-btn" type="button" onclick="window.closeMissionModal()" aria-label="Fechar">✕</button>
          </div>
          <div class="mission-modal-body">
            <p style="font-size:13px;color:#cbd5e1;margin-top:0;">
              Marque o trade executado respeitando o teto de <b>risco pequeno (${progress.riskPctFormatted})</b> ${isRebuild ? 'e a regra de <b>1 posição por vez</b>.' : '.'}
            </p>

            ${isRebuild && openPositions >= 1 ? `
              <div class="mission-rebuild-modal-alert">
                ⚠️ Você possui <b>${openPositions} posição(ões) em andamento</b>. Certifique-se de que a operação anterior já foi finalizada antes de registrar a próxima.
              </div>
            ` : ''}

            <div class="mission-form-group">
              <label for="markTradeTicker">Ativo / Ticker</label>
              <input id="markTradeTicker" type="text" required placeholder="Ex: PETR4, VALE3, ITUB4" style="text-transform:uppercase;">
            </div>

            <div class="mission-form-group">
              <label for="markTradeDate">Data da Execução</label>
              <input id="markTradeDate" type="text" value="${todayStr}">
            </div>

            <div class="mission-form-group">
              <label for="markTradeResultR">Resultado em R (opcional)</label>
              <input id="markTradeResultR" type="number" step="0.1" placeholder="Ex: 2.0 (ganho), -1.0 (stop)">
            </div>

            <div class="mission-form-group">
              <label for="markTradeNotes">Observações / Reflexão</label>
              <textarea id="markTradeNotes" placeholder="Como você se sentiu? Respeitou o processo com calma?"></textarea>
            </div>

            <div id="markTradeModalError" class="mission-inline-error" style="display:none;"></div>

            <div class="mission-modal-actions">
              <button class="mission-btn-secondary" type="button" onclick="window.closeMissionModal()">Cancelar</button>
              <button class="mission-btn-primary ${isRebuild ? 'theme-rebuild-submit-btn' : ''}" type="button" onclick="window.handleConfirmMarkTrade()">Confirmar Trade ✓</button>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  window.handleConfirmMarkTrade = function () {
    const tickerEl = document.getElementById('markTradeTicker');
    const dateEl = document.getElementById('markTradeDate');
    const resultREl = document.getElementById('markTradeResultR');
    const notesEl = document.getElementById('markTradeNotes');
    const errorEl = document.getElementById('markTradeModalError');

    const ticker = String(tickerEl?.value || '').trim().toUpperCase();
    const date = String(dateEl?.value || '').trim() || new Date().toLocaleDateString('pt-BR');
    const notes = String(notesEl?.value || '').trim();
    const resultRVal = resultREl && resultREl.value !== '' ? Number(resultREl.value) : null;

    if (!ticker) {
      if (errorEl) {
        errorEl.textContent = 'Por favor, informe o código do ativo (ex: PETR4).';
        errorEl.style.display = 'block';
      }
      tickerEl?.focus();
      return;
    }

    try {
      const result = M.addMissionTrade(currentMission, {
        ticker,
        date,
        notes,
        resultR: resultRVal,
        result: 'COMPLIANT',
        status: 'CLOSED'
      });

      currentMission = result.mission;
      saveMissionData();
      window.closeMissionModal();
      renderMissionPage();

      if (result.justCompleted) {
        window.openCelebrationModal();
      }
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || 'Não foi possível marcar o trade.';
        errorEl.style.display = 'block';
      }
    }
  };

  window.openCelebrationModal = function () {
    const container = document.getElementById('missionModalContainer');
    if (!container) return;

    const isRebuild = currentMission.mode === 'REBUILD';

    container.innerHTML = `
      <div class="mission-modal-backdrop" onclick="window.closeMissionModal(event)">
        <div class="mission-modal-dialog mission-celebrate-dialog ${isRebuild ? 'theme-rebuild-celebrate' : ''}" onclick="event.stopPropagation()">
          <div class="mission-celebrate-chest-icon">${isRebuild ? '🦅✨' : '🏆✨'}</div>
          <h2 class="mission-celebrate-title">${isRebuild ? 'CICLO DE RECUPERAÇÃO CONCLUÍDO!' : 'MISSÃO CUMPRIDA!'}</h2>

          <p class="mission-celebrate-desc">
            ${isRebuild
              ? '“Parabéns! Você concluiu seu ciclo de recuperação operando estritamente protegido, com calma e disciplina. Você provou a si mesmo que consegue respeitar seu processo e que a sua confiança está restabelecida.”'
              : '“Parabéns! Você percorreu o caminho, manteve seu compromisso e venceu uma barreira importante. O objetivo não era apenas completar trades: era provar que você consegue seguir seu processo com calma, disciplina e consistência.”'}
          </p>

          <p class="mission-celebrate-desc">
            ${isRebuild
              ? '“Sua política normal de risco agora está disponível para restauração quando você se sentir pronto.”'
              : '“Agora, celebre essa conquista e dê a si mesmo a recompensa que você definiu. Você merece reconhecer o progresso que fez.”'}
          </p>

          ${currentMission.reward ? `
            <div class="mission-celebrate-reward-box">
              <b>${isRebuild ? 'SUA CONQUISTA:' : 'SUA RECOMPENSA MERECIDA:'}</b>
              <strong>${escapeHtml(currentMission.reward)}</strong>
            </div>
          ` : ''}

          <div style="display:flex;justify-content:center;gap:12px;">
            <button class="mission-btn-primary ${isRebuild ? 'theme-rebuild-submit-btn' : ''}" type="button" onclick="window.archiveMissionAndReset()">
              Celebrar e Salvar no Histórico
            </button>
          </div>
        </div>
      </div>
    `;
  };

  window.archiveMissionAndReset = function () {
    missionHistory.unshift({
      ...currentMission,
      status: 'COMPLETED',
      completedAt: new Date().toISOString()
    });

    currentMission = M.createMission({
      title: 'Minha próxima missão',
      reason: currentMission.reason,
      targetTrades: 20,
      riskPct: 0.0025,
      reward: 'Nova recompensa a definir',
      mode: 'STANDARD',
      status: 'NOT_STARTED'
    });

    saveMissionData();
    window.closeMissionModal();
    renderMissionPage();
  };

  window.openStopMissionModal = function () {
    const container = document.getElementById('missionModalContainer');
    if (!container) return;

    const isRebuild = currentMission.mode === 'REBUILD';
    const tradesCount = Array.isArray(currentMission.trades) ? currentMission.trades.length : 0;

    container.innerHTML = `
      <div class="mission-modal-backdrop" onclick="window.closeMissionModal(event)">
        <div class="mission-modal-dialog" onclick="event.stopPropagation()">
          <div class="mission-modal-head">
            <h3>${isRebuild ? 'Parar Modo Recuperação' : 'Parar Missão'}</h3>
            <button class="mission-modal-close-btn" type="button" onclick="window.closeMissionModal()" aria-label="Fechar">✕</button>
          </div>
          <div class="mission-modal-body">
            <p style="font-size:13.5px;color:#cbd5e1;line-height:1.55;margin-top:0;">
              Tem certeza que deseja interromper o ciclo ativo?
            </p>
            <div style="background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:12px;margin-bottom:14px;color:#fca5a5;font-size:12px;line-height:1.45;">
              ⏹ <strong>O que acontecerá:</strong><br>
              • O ciclo atual com <b>${tradesCount} trade(s)</b> será arquivado com segurança no seu histórico.<br>
              • O teto reduzido de risco (${M.formatPctBR(currentMission.riskPct, 2)}) será desativado e sua <b>política normal de risco</b> voltará a vigorar no Novo Trade.<br>
              ${isRebuild ? '• A restrição de 1 posição por vez será desativada.<br>' : ''}
              • Você poderá iniciar uma nova jornada quando desejar.
            </div>
            <p style="font-size:12.5px;color:#94a3b8;line-height:1.45;margin-bottom:0;">
              Nenhum registro histórico será perdido.
            </p>
            <div class="mission-modal-actions" style="margin-top:18px;">
              <button class="mission-btn-secondary" type="button" onclick="window.closeMissionModal()">Cancelar</button>
              <button class="mission-btn-danger" type="button" onclick="window.confirmStopMission()">
                ⏹ Sim, Interromper Ciclo
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  window.confirmStopMission = function () {
    missionHistory.unshift({
      ...currentMission,
      stoppedAt: new Date().toISOString(),
      stopReason: 'Interrompido pelo usuário'
    });

    currentMission = M.stopMission(currentMission, 'Interrompido pelo usuário');
    saveMissionData();
    window.closeMissionModal();
    renderMissionPage();

    const feedback = document.getElementById('missionConfigFeedback');
    if (feedback) {
      feedback.textContent = 'Ciclo interrompido. Sua política normal de risco foi restabelecida no Novo Trade.';
      feedback.style.display = 'block';
      setTimeout(() => {
        if (feedback) feedback.style.display = 'none';
      }, 4000);
    }
  };

  window.openResetMissionModal = function () {
    const container = document.getElementById('missionModalContainer');
    if (!container) return;

    const tradesCount = Array.isArray(currentMission.trades) ? currentMission.trades.length : 0;

    container.innerHTML = `
      <div class="mission-modal-backdrop" onclick="window.closeMissionModal(event)">
        <div class="mission-modal-dialog" onclick="event.stopPropagation()">
          <div class="mission-modal-head">
            <h3>Reiniciar Ciclo do Zero</h3>
            <button class="mission-modal-close-btn" type="button" onclick="window.closeMissionModal()" aria-label="Fechar">✕</button>
          </div>
          <div class="mission-modal-body">
            <p style="font-size:13.5px;color:#cbd5e1;line-height:1.55;margin-top:0;">
              Tem certeza que deseja reiniciar este ciclo?
            </p>
            <div style="background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:12px;margin-bottom:14px;color:#fca5a5;font-size:12px;line-height:1.45;">
              ⚠️ <strong>Atenção:</strong> ${tradesCount > 0
                ? `Todos os <b>${tradesCount} trade(s)</b> registrados no ciclo atual serão arquivados com segurança no histórico e o progresso voltará a <b>0 trades (0%)</b>.`
                : 'O progresso do ciclo será reinicializado para <b>0 trades (0%)</b>.'}
            </div>
            <p style="font-size:12.5px;color:#94a3b8;line-height:1.45;margin-bottom:0;">
              As configurações de modalidade, risco e meta serão preservadas para o novo ciclo.
            </p>
            <div class="mission-modal-actions" style="margin-top:18px;">
              <button class="mission-btn-secondary" type="button" onclick="window.closeMissionModal()">Cancelar</button>
              <button class="mission-btn-danger" type="button" onclick="window.confirmResetMission()">
                ↺ Sim, Reiniciar do Zero
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  window.confirmResetMission = function () {
    const targetInput = document.getElementById('missionTargetInput');
    const riskSelect = document.getElementById('missionRiskSelect');
    const rewardInput = document.getElementById('missionRewardInput');

    const nextTarget = Math.max(1, Math.min(100, Math.round(Number(targetInput?.value) || currentMission.targetTrades || 20)));
    const nextRisk = Number(riskSelect?.value || currentMission.riskPct || 0.001);
    const nextReward = rewardInput ? (String(rewardInput.value || '').trim() || currentMission.reward || 'Um jantar especial') : currentMission.reward;

    const rebuildState = RM ? RM.getRebuildState() : null;

    if (Array.isArray(currentMission.trades) && currentMission.trades.length > 0) {
      missionHistory.unshift({
        ...currentMission,
        archivedAt: new Date().toISOString(),
        resetReason: 'Reinício solicitado pelo usuário'
      });
    }

    currentMission = M.resetMission(currentMission, {
      targetTrades: nextTarget,
      riskPct: nextRisk,
      reward: nextReward,
      mode: currentMission.mode || 'STANDARD'
    }, rebuildState);

    saveMissionData();
    window.closeMissionModal();
    renderMissionPage();

    const feedback = document.getElementById('missionConfigFeedback');
    if (feedback) {
      feedback.textContent = 'Ciclo reiniciado do zero com sucesso!';
      feedback.style.display = 'block';
      setTimeout(() => {
        if (feedback) feedback.style.display = 'none';
      }, 3500);
    }
  };

  // ── Modal de Histórico Estruturado com Filtros de Modalidade ─────────────────
  window.openMissionHistoryModal = function (filter, event) {
    if (filter && typeof filter === 'object' && filter.stopPropagation) {
      event = filter;
      filter = null;
    }
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    if (filter && typeof filter === 'string') {
      historyActiveFilter = filter;
    }
    const container = document.getElementById('missionModalContainer');
    if (!container) return;

    const totalCount = missionHistory.length;
    const standardCount = missionHistory.filter(m => (m.mode || 'STANDARD') === 'STANDARD').length;
    const rebuildCount = missionHistory.filter(m => m.mode === 'REBUILD').length;

    let filtered = missionHistory;
    if (historyActiveFilter === 'STANDARD') {
      filtered = missionHistory.filter(m => (m.mode || 'STANDARD') === 'STANDARD');
    } else if (historyActiveFilter === 'REBUILD') {
      filtered = missionHistory.filter(m => m.mode === 'REBUILD');
    }

    container.innerHTML = `
      <div class="mission-modal-backdrop" onclick="window.closeMissionModal(event)">
        <div class="mission-modal-dialog mission-history-modal-dialog" onclick="event.stopPropagation()">
          <div class="mission-modal-head">
            <div>
              <span class="mission-modal-kicker">REGISTRO HISTÓRICO</span>
              <h3>Histórico de Missões e Recuperação</h3>
            </div>
            <button class="mission-modal-close-btn" type="button" onclick="window.closeMissionModal()" aria-label="Fechar">✕</button>
          </div>

          <!-- Abas de Filtro de Modalidade -->
          <div class="mission-history-tabs">
            <button class="mission-tab-btn ${historyActiveFilter === 'ALL' ? 'active' : ''}" type="button" onclick="window.openMissionHistoryModal('ALL')">
              Todas (${totalCount})
            </button>
            <button class="mission-tab-btn ${historyActiveFilter === 'STANDARD' ? 'active' : ''}" type="button" onclick="window.openMissionHistoryModal('STANDARD')">
              🎯 Missão Padrão (${standardCount})
            </button>
            <button class="mission-tab-btn ${historyActiveFilter === 'REBUILD' ? 'active' : ''}" type="button" onclick="window.openMissionHistoryModal('REBUILD')">
              🦅 Modo Recuperação (${rebuildCount})
            </button>
          </div>

          <!-- Tabela de Histórico -->
          ${filtered.length > 0 ? `
            <div class="mission-history-table-wrap">
              <table class="mission-history-table">
                <thead>
                  <tr>
                    <th>DATA</th>
                    <th>MODALIDADE</th>
                    <th>OBJETIVO / MOTIVO</th>
                    <th>STATUS</th>
                    <th>TRADES</th>
                    <th>RESULTADO</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered.map(m => {
                    const isMRebuild = m.mode === 'REBUILD';
                    const tradesNum = Array.isArray(m.trades) ? m.trades.length : 0;
                    const dateDisplay = m.startDate ? M.formatDateBR(m.startDate) : (m.archivedAt ? M.formatDateBR(m.archivedAt.slice(0, 10)) : '—');
                    const isCompleted = m.status === 'COMPLETED' || tradesNum >= (m.targetTrades || 20);
                    const isStopped = m.status === 'STOPPED';

                    return `
                      <tr>
                        <td><small style="color:#cbd5e1;white-space:nowrap;">${dateDisplay}</small></td>
                        <td>
                          <span class="mission-mode-badge-small ${isMRebuild ? 'rebuild' : 'standard'}">
                            ${isMRebuild ? '🦅 Rebuild' : '🎯 Padrão'}
                          </span>
                        </td>
                        <td>
                          <b>${escapeHtml(m.title || (isMRebuild ? 'Recuperação' : 'Missão'))}</b>
                          <div style="font-size:11px;color:#94a3b8;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            ${escapeHtml(m.reason || 'Sem motivo')}
                          </div>
                        </td>
                        <td>
                          <span class="mission-status-chip ${isCompleted ? 'completed' : (isStopped ? 'stopped' : 'active')}">
                            ${isCompleted ? '✓ Concluída' : (isStopped ? '⏹ Parada' : '● Ativa')}
                          </span>
                        </td>
                        <td>
                          <b>${tradesNum}</b> / ${m.targetTrades || 20}
                        </td>
                        <td>
                          <span style="color:#facc15;font-weight:700;">${M.formatPctBR(m.riskPct, 2)}</span>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="mission-history-empty">
              <span style="font-size:28px;">📜</span>
              <p>Nenhuma missão registrada nesta categoria ainda.</p>
            </div>
          `}

          <div class="mission-modal-actions">
            <button class="mission-btn-secondary" type="button" onclick="window.closeMissionModal()">Fechar</button>
          </div>
        </div>
      </div>
    `;
  };

  window.closeMissionModal = function (event) {
    if (event && event.target && event.target.closest && !event.target.closest('.mission-modal-backdrop, .mission-modal-close-btn, .mission-btn-secondary')) {
      return;
    }
    const container = document.getElementById('missionModalContainer');
    if (container) container.innerHTML = '';
  };

  // Exposição global
  root.renderMissionPage = renderMissionPage;
  root.MissionController = {
    render: renderMissionPage,
    getState: () => ({ ...currentMission }),
    getHistory: () => [...missionHistory],
    openNewMissionModal: window.openNewMissionModal,
    openEditMissionModal: window.openEditMissionModal,
    openHistory: window.openMissionHistoryModal
  };

})(typeof window !== 'undefined' ? window : this);
