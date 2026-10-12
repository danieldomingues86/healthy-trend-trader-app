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

    const rebuildState = RM ? RM.getRebuildState() : { isActive: false };
    const progress = M.calculateMissionProgress(currentMission, { equity: getEquity() });
    const waypoints = progress.waypoints;

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
      <div class="mission-shell">
        <!-- Hero Artístico da Montanha com Soldado e Trilha -->
        <section class="mission-hero-panorama" aria-label="Jornada da Missão" onclick="window.handleSelectWaypoint(null)">
          <!-- Título Superior Esquerdo com Breadcrumb e Histórico -->
          <div class="mission-hero-title-block">
            <div class="mission-hero-nav-row">
              <button class="mission-hero-breadcrumb-btn" type="button" onclick="go('tradertraining')">
                ← TREINAMENTO
              </button>
              <button class="mission-hero-history-btn" type="button" onclick="window.openMissionHistoryModal()" title="Histórico de missões concluídas">
                📜 Histórico (${missionHistory.length})
              </button>
            </div>
            <h1>MISSÃO</h1>
            <p>Disciplina hoje.<br>Um trader melhor amanhã.</p>
          </div>

          <!-- Placas de Madeira na Trilha à Esquerda -->
          <div class="mission-trail-signs" aria-hidden="true">
            <div class="mission-sign-wood">DISCIPLINA</div>
            <div class="mission-sign-wood">FOCO</div>
            <div class="mission-sign-wood">CONFIANÇA</div>
            <div class="mission-sign-wood">PRAZER DE OPERAR</div>
          </div>

          <!-- Card Superior Central: MINHA MISSÃO Único -->
          <div class="mission-center-card">
            <div class="mission-center-head">
              <span class="mission-center-kicker">MINHA MISSÃO</span>
              <button class="mission-edit-btn" type="button" onclick="window.openEditMissionModal()">
                ✎ Editar
              </button>
            </div>
            <h2 class="mission-goal-text">${escapeHtml(currentMission.title)}</h2>
            <div class="mission-reason-label">MOTIVO / PORQUÊ</div>
            <p class="mission-reason-text">${escapeHtml(currentMission.reason || 'Sem motivo registrado. Clique em Editar para registrar.')}</p>
          </div>

          <!-- Destino no Cume (Baú da Recompensa Topo Direito) -->
          <div class="mission-reward-destination" onclick="window.openEditMissionModal()" title="Clique para editar a recompensa">
            <span class="mission-reward-kicker">RECOMPENSA</span>
            <span class="mission-reward-sub">POR TER CONCLUÍDO<br>A SUA MISSÃO</span>
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

        <!-- 4 Cards Inferiores Alinhados Horizontalmente -->
        <div class="mission-cards-grid">
          <!-- Card 1: CONFIGURAÇÃO DA MISSÃO -->
          <section class="mission-card mission-config-card">
            <h3 class="mission-card-title">
              <span>CONFIGURAÇÃO DA MISSÃO</span>
              ${rebuildState.isActive ? '<span class="mission-rebuild-flag">REBUILD MODE</span>' : ''}
            </h3>
            <div class="mission-config-form">
              <div class="mission-config-field">
                <label for="missionTargetInput">Número de trades</label>
                <input id="missionTargetInput" type="number" min="1" max="100" value="${currentMission.targetTrades}" onchange="window.handleTargetTradesChange(this.value)">
              </div>

              <div class="mission-config-field">
                <label for="missionRiskSelect">Risco por trade</label>
                <select id="missionRiskSelect">
                  <option value="0.0010" ${Math.abs(currentMission.riskPct - 0.001) < 0.0001 ? 'selected' : ''}>0,10%</option>
                  <option value="0.0015" ${Math.abs(currentMission.riskPct - 0.0015) < 0.0001 ? 'selected' : ''}>0,15%</option>
                  <option value="0.0020" ${Math.abs(currentMission.riskPct - 0.002) < 0.0001 ? 'selected' : ''}>0,20%</option>
                  <option value="0.0025" ${Math.abs(currentMission.riskPct - 0.0025) < 0.0001 ? 'selected' : ''}>0,25%</option>
                </select>
              </div>

              <div class="mission-config-field mission-field-reward">
                <label for="missionRewardInput">Recompensa ao finalizar</label>
                <input id="missionRewardInput" type="text" value="${escapeHtml(currentMission.reward)}" placeholder="Ex: Um jantar especial">
              </div>

              ${rebuildState.isActive ? `
                <div class="mission-rebuild-badge">
                  <strong>Regra de Proteção:</strong> 1 trade por vez.<br>
                  <small>Teto de risco travado pelo Rebuild Mode.</small>
                </div>
              ` : ''}

              ${currentMission.status === 'STOPPED' ? `
                <div class="mission-stopped-badge">
                  <strong>Missão Interrompida</strong><br>
                  <small>A política de risco normal da conta está ativa no Novo Trade.</small>
                </div>
              ` : ''}

              <div id="missionConfigFeedback" class="mission-inline-feedback" style="display:none;"></div>

              <button class="mission-start-btn ${currentMission.status === 'ACTIVE' ? 'is-active' : ''}" type="button" onclick="window.handleStartOrSaveMission()">
                ${currentMission.status === 'ACTIVE' ? '✓ Missão Ativa (Salvar)' : (currentMission.status === 'STOPPED' ? '▶ Retomar Missão' : '▶ Iniciar Missão')}
              </button>
              ${currentMission.status === 'ACTIVE' ? `
                <button class="mission-stop-btn" type="button" onclick="window.openStopMissionModal()">
                  ⏹ Parar Missão
                </button>
              ` : ''}
              ${(currentMission.status === 'ACTIVE' || currentMission.status === 'STOPPED' || currentMission.status === 'COMPLETED') ? `
                <button class="mission-reset-btn" type="button" onclick="window.openResetMissionModal()">
                  ↺ ${currentMission.status === 'STOPPED' ? 'Iniciar Nova Missão (Zerar)' : 'Reiniciar Missão (Zerar)'}
                </button>
              ` : ''}
              <span class="mission-config-hint">
                ${currentMission.status === 'ACTIVE'
                  ? `Missão ativa com teto de ${M.formatPctBR(currentMission.riskPct, 2)} por trade no Novo Trade.`
                  : (currentMission.status === 'STOPPED'
                    ? 'Missão parada. Ao iniciar uma nova missão, o progresso começará em zero.'
                    : 'Ao iniciar, o progresso começará em zero e o risco será limitado no Novo Trade.')}
              </span>
            </div>
          </section>

          <!-- Card 2: PROGRESSO DA MISSÃO -->
          <section class="mission-card mission-progress-card">
            <h3 class="mission-card-title">PROGRESSO DA MISSÃO</h3>
            <div class="mission-progress-body">
              <div class="mission-radial-gauge">
                <svg class="mission-gauge-svg" viewBox="0 0 120 120">
                  <circle class="mission-gauge-bg" cx="60" cy="60" r="${radius}"></circle>
                  <circle class="mission-gauge-fill" cx="60" cy="60" r="${radius}"
                          stroke-dasharray="${circumference}"
                          stroke-dashoffset="${strokeDashoffset}"></circle>
                </svg>
                <div class="mission-gauge-text">
                  <strong>${progress.completedTrades} de ${progress.targetTrades}</strong>
                  <small>trades concluídos</small>
                </div>
              </div>

              <div class="mission-stats-list">
                <div class="mission-stat-item">
                  <span class="mission-stat-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                  </span>
                  <div class="mission-stat-content">
                    <strong>${progress.progressPct}%</strong>
                    <small>Progresso geral</small>
                  </div>
                </div>
                <div class="mission-stat-item">
                  <span class="mission-stat-icon" style="color:#facc15;">
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
                    <strong>${progress.daysSinceStart}</strong>
                    <small>Dias desde o início</small>
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
              </div>
            </div>
          </section>

          <!-- Card 3: ÚLTIMOS TRADES DA MISSÃO -->
          <section class="mission-card mission-trades-card">
            <div class="mission-card-title">
              <span>ÚLTIMOS TRADES DA MISSÃO</span>
              <div class="mission-trades-head-actions">
                <button class="mission-mark-trade-btn" type="button" onclick="window.openMarkTradeModal()">
                  + Marcar Trade
                </button>
              </div>
            </div>

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
                        <td><span class="mission-trade-check">✓</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : `
                <div class="mission-empty-trades">
                  Nenhum trade marcado ainda.<br>
                  ${currentMission.status === 'ACTIVE'
                    ? 'Clique em <b>+ Marcar Trade</b> após realizar uma operação dentro das regras.'
                    : 'Inicie a sua missão para começar a registrar seus trades.'}
                </div>
              `}
            </div>
          </section>

          <!-- Card 4: FRASE MOTIVACIONAL -->
          <section class="mission-card mission-quote-card">
            <p class="mission-quote-text">
              “O objetivo agora não é fazer muito dinheiro, é recuperar a sua confiança e alegria de operar.”
            </p>
            <div class="mission-quote-bar"></div>
          </section>
        </div>
      </div>

      <!-- Container para Modais Dinâmicos -->
      <div id="missionModalContainer"></div>
    `;

    rootEl.innerHTML = html;
  }

  // ── Ações e Modais ──────────────────────────────────────────────────────────

  window.handleTargetTradesChange = function (val) {
    const nextVal = Math.max(1, Math.min(100, Math.round(Number(val) || 20)));
    currentMission = M.updateMissionConfig(currentMission, { targetTrades: nextVal }, RM ? RM.getRebuildState() : null);
    renderMissionPage();
  };

  window.handleStartOrSaveMission = function () {
    const targetInput = document.getElementById('missionTargetInput');
    const riskSelect = document.getElementById('missionRiskSelect');
    const rewardInput = document.getElementById('missionRewardInput');

    const nextTarget = Math.max(1, Math.min(100, Math.round(Number(targetInput?.value) || currentMission.targetTrades || 20)));
    const nextRisk = Number(riskSelect?.value || currentMission.riskPct || 0.001);
    const nextReward = String(rewardInput?.value || '').trim() || currentMission.reward || 'Um jantar especial';

    const rebuildState = RM ? RM.getRebuildState() : null;

    // Inicializa ou atualiza a missão conforme o ciclo de vida
    const startResult = M.startMission(currentMission, {
      targetTrades: nextTarget,
      riskPct: nextRisk,
      reward: nextReward
    }, rebuildState);

    currentMission = startResult.mission;
    saveMissionData();
    renderMissionPage();

    const feedback = document.getElementById('missionConfigFeedback');
    if (feedback) {
      feedback.textContent = startResult.isNew
        ? 'Missão iniciada com sucesso! O progresso começou em zero.'
        : 'Configuração salva com sucesso! Progresso atual preservado.';
      feedback.style.display = 'block';
      setTimeout(() => {
        if (feedback) feedback.style.display = 'none';
      }, 3500);
    }
  };

  window.openEditMissionModal = function () {
    const container = document.getElementById('missionModalContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="mission-modal-backdrop" onclick="window.closeMissionModal(event)">
        <div class="mission-modal-dialog" onclick="event.stopPropagation()">
          <div class="mission-modal-head">
            <h3>Editar Minha Missão</h3>
            <button class="mission-modal-close-btn" type="button" onclick="window.closeMissionModal()" aria-label="Fechar">✕</button>
          </div>
          <div class="mission-modal-body">
            <div class="mission-form-group">
              <label for="editMissionTitle">Objetivo Central da Missão</label>
              <input id="editMissionTitle" type="text" value="${escapeHtml(currentMission.title)}" placeholder="Ex: Operar pequeno e constante">
              <small style="color:#94a3b8;font-size:11px;">Mantenha curto, focado e específico.</small>
            </div>

            <div class="mission-form-group">
              <label for="editMissionReason">Motivo / Por quê?</label>
              <textarea id="editMissionReason" rows="4" placeholder="Por que essa missão é importante? Qual barreira emocional você deseja superar?">${escapeHtml(currentMission.reason || '')}</textarea>
            </div>

            <div id="editMissionModalError" class="mission-inline-error" style="display:none;"></div>

            <div class="mission-modal-actions">
              <button class="mission-btn-secondary" type="button" onclick="window.closeMissionModal()">Cancelar</button>
              <button class="mission-btn-primary" type="button" onclick="window.handleSaveEditMissionModal()">Salvar Alterações</button>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  window.handleSaveEditMissionModal = function () {
    const titleEl = document.getElementById('editMissionTitle');
    const reasonEl = document.getElementById('editMissionReason');
    const errorEl = document.getElementById('editMissionModalError');

    const title = String(titleEl?.value || '').trim();
    const reason = String(reasonEl?.value || '').trim();

    if (!title) {
      if (errorEl) {
        errorEl.textContent = 'Por favor, informe o objetivo central da sua missão.';
        errorEl.style.display = 'block';
      }
      titleEl?.focus();
      return;
    }

    const rebuildState = RM ? RM.getRebuildState() : null;

    currentMission = M.updateMissionConfig(currentMission, {
      title,
      reason
    }, rebuildState);

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
      container.innerHTML = `
        <div class="mission-modal-backdrop" onclick="window.closeMissionModal(event)">
          <div class="mission-modal-dialog" onclick="event.stopPropagation()">
            <div class="mission-modal-head">
              <h3>Iniciar Missão</h3>
              <button class="mission-modal-close-btn" type="button" onclick="window.closeMissionModal()" aria-label="Fechar">✕</button>
            </div>
            <div class="mission-modal-body">
              <p style="font-size:13.5px;color:#cbd5e1;line-height:1.55;margin-top:0;">
                A sua missão ainda não foi iniciada. Para registrar seus trades na trilha, inicie a missão primeiro. O progresso começará em zero com foco total em disciplina e consistência.
              </p>
              <div class="mission-modal-actions">
                <button class="mission-btn-secondary" type="button" onclick="window.closeMissionModal()">Cancelar</button>
                <button class="mission-btn-primary" type="button" onclick="window.handleStartOrSaveMission(); window.closeMissionModal();">
                  ▶ Iniciar Missão Agora
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const progress = M.calculateMissionProgress(currentMission);
    if (progress.isCompleted) {
      window.openCelebrationModal();
      return;
    }

    const todayStr = new Date().toLocaleDateString('pt-BR');

    container.innerHTML = `
      <div class="mission-modal-backdrop" onclick="window.closeMissionModal(event)">
        <div class="mission-modal-dialog" onclick="event.stopPropagation()">
          <div class="mission-modal-head">
            <h3>Marcar Trade na Missão</h3>
            <button class="mission-modal-close-btn" type="button" onclick="window.closeMissionModal()" aria-label="Fechar">✕</button>
          </div>
          <div class="mission-modal-body">
            <p style="font-size:13px;color:#cbd5e1;margin-top:0;">
              Marque o trade que você executou respeitando a regra de <b>risco pequeno (${progress.riskPctFormatted})</b> e <b>1 trade por vez</b>.
            </p>

            <div class="mission-form-group">
              <label for="markTradeTicker">Ativo / Ticker</label>
              <input id="markTradeTicker" type="text" required placeholder="Ex: PETR4, VALE3, ITUB4" style="text-transform:uppercase;">
            </div>

            <div class="mission-form-group">
              <label for="markTradeDate">Data da Execução</label>
              <input id="markTradeDate" type="text" value="${todayStr}">
            </div>

            <div class="mission-form-group">
              <label for="markTradeNotes">Observações / Reflexão</label>
              <textarea id="markTradeNotes" placeholder="Como você se sentiu? Respeitou o processo com calma?"></textarea>
            </div>

            <div id="markTradeModalError" class="mission-inline-error" style="display:none;"></div>

            <div class="mission-modal-actions">
              <button class="mission-btn-secondary" type="button" onclick="window.closeMissionModal()">Cancelar</button>
              <button class="mission-btn-primary" type="button" onclick="window.handleConfirmMarkTrade()">Confirmar Trade ✓</button>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  window.handleConfirmMarkTrade = function () {
    const tickerEl = document.getElementById('markTradeTicker');
    const dateEl = document.getElementById('markTradeDate');
    const notesEl = document.getElementById('markTradeNotes');
    const errorEl = document.getElementById('markTradeModalError');

    const ticker = String(tickerEl?.value || '').trim().toUpperCase();
    const date = String(dateEl?.value || '').trim() || new Date().toLocaleDateString('pt-BR');
    const notes = String(notesEl?.value || '').trim();

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

    container.innerHTML = `
      <div class="mission-modal-backdrop" onclick="window.closeMissionModal(event)">
        <div class="mission-modal-dialog mission-celebrate-dialog" onclick="event.stopPropagation()">
          <div class="mission-celebrate-chest-icon">🏆✨</div>
          <h2 class="mission-celebrate-title">MISSÃO CUMPRIDA!</h2>

          <p class="mission-celebrate-desc">
            “Parabéns! Você percorreu o caminho, manteve seu compromisso e venceu uma barreira importante. O objetivo não era apenas completar trades: era provar que você consegue seguir seu processo com calma, disciplina e consistência.”
          </p>

          <p class="mission-celebrate-desc">
            “Agora, celebre essa conquista e dê a si mesmo a recompensa que você definiu. Você merece reconhecer o progresso que fez.”
          </p>

          ${currentMission.reward ? `
            <div class="mission-celebrate-reward-box">
              <b>SUA RECOMPENSA MERECIDA:</b>
              <strong>${escapeHtml(currentMission.reward)}</strong>
            </div>
          ` : ''}

          <div style="display:flex;justify-content:center;gap:12px;">
            <button class="mission-btn-primary" type="button" onclick="window.archiveMissionAndReset()">
              Celebrar e Salvar no Histórico
            </button>
          </div>
        </div>
      </div>
    `;
  };

  window.archiveMissionAndReset = function () {
    missionHistory.unshift({ ...currentMission });
    currentMission = M.createMission({
      title: 'Minha próxima missão',
      reason: currentMission.reason,
      targetTrades: currentMission.targetTrades,
      riskPct: currentMission.riskPct,
      reward: 'Nova recompensa a definir',
      status: 'ACTIVE'
    });
    saveMissionData();
    window.closeMissionModal();
    renderMissionPage();
  };

  window.openStopMissionModal = function () {
    const container = document.getElementById('missionModalContainer');
    if (!container) return;

    const tradesCount = Array.isArray(currentMission.trades) ? currentMission.trades.length : 0;

    container.innerHTML = `
      <div class="mission-modal-backdrop" onclick="window.closeMissionModal(event)">
        <div class="mission-modal-dialog" onclick="event.stopPropagation()">
          <div class="mission-modal-head">
            <h3>Parar Missão</h3>
            <button class="mission-modal-close-btn" type="button" onclick="window.closeMissionModal()" aria-label="Fechar">✕</button>
          </div>
          <div class="mission-modal-body">
            <p style="font-size:13.5px;color:#cbd5e1;line-height:1.55;margin-top:0;">
              Tem certeza que deseja interromper a sua missão ativa?
            </p>
            <div style="background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:12px;margin-bottom:14px;color:#fca5a5;font-size:12px;line-height:1.45;">
              ⏹ <strong>O que acontecerá:</strong><br>
              • O ciclo atual com <b>${tradesCount} trade(s)</b> será arquivado com segurança no seu histórico.<br>
              • O teto rígido de risco (${M.formatPctBR(currentMission.riskPct, 2)}) será desativado e sua <b>política normal de risco</b> voltará a vigorar no Novo Trade.<br>
              • Você poderá retomar ou iniciar uma nova jornada quando desejar.
            </div>
            <p style="font-size:12.5px;color:#94a3b8;line-height:1.45;margin-bottom:0;">
              Nenhum registro histórico será perdido.
            </p>
            <div class="mission-modal-actions" style="margin-top:18px;">
              <button class="mission-btn-secondary" type="button" onclick="window.closeMissionModal()">Cancelar</button>
              <button class="mission-btn-danger" type="button" onclick="window.confirmStopMission()">
                ⏹ Sim, Parar Missão
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  window.confirmStopMission = function () {
    // Arquiva no histórico preservando todos os dados
    missionHistory.unshift({
      ...currentMission,
      stoppedAt: new Date().toISOString(),
      stopReason: 'Missão interrompida pelo usuário'
    });

    currentMission = M.stopMission(currentMission, 'Missão interrompida pelo usuário');
    saveMissionData();
    window.closeMissionModal();
    renderMissionPage();

    const feedback = document.getElementById('missionConfigFeedback');
    if (feedback) {
      feedback.textContent = 'Missão parada com sucesso. Sua política normal de risco foi restabelecida no Novo Trade.';
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
            <h3>Reiniciar Missão do Zero</h3>
            <button class="mission-modal-close-btn" type="button" onclick="window.closeMissionModal()" aria-label="Fechar">✕</button>
          </div>
          <div class="mission-modal-body">
            <p style="font-size:13.5px;color:#cbd5e1;line-height:1.55;margin-top:0;">
              Tem certeza que deseja reiniciar esta missão?
            </p>
            <div style="background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:12px;margin-bottom:14px;color:#fca5a5;font-size:12px;line-height:1.45;">
              ⚠️ <strong>Atenção:</strong> ${tradesCount > 0
                ? `Todos os <b>${tradesCount} trade(s)</b> registrados no ciclo atual serão arquivados com segurança no histórico e o progresso da jornada voltará a <b>0 trades concluídos (0%)</b>.`
                : 'O progresso da missão será reinicializado para <b>0 trades (0%)</b>.'}
            </div>
            <p style="font-size:12.5px;color:#94a3b8;line-height:1.45;margin-bottom:0;">
              O objetivo central, o motivo e as configurações de risco e meta serão preservados para o novo ciclo.
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
    const nextReward = String(rewardInput?.value || '').trim() || currentMission.reward || 'Um jantar especial';

    const rebuildState = RM ? RM.getRebuildState() : null;

    // Se havia trades registrados, arquiva no histórico para não perder dados
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
      reward: nextReward
    }, rebuildState);

    saveMissionData();
    window.closeMissionModal();
    renderMissionPage();

    const feedback = document.getElementById('missionConfigFeedback');
    if (feedback) {
      feedback.textContent = 'Missão reiniciada do zero! Nova jornada iniciada.';
      feedback.style.display = 'block';
      setTimeout(() => {
        if (feedback) feedback.style.display = 'none';
      }, 3500);
    }
  };

  window.openMissionHistoryModal = function () {
    const container = document.getElementById('missionModalContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="mission-modal-backdrop" onclick="window.closeMissionModal(event)">
        <div class="mission-modal-dialog" style="max-width:620px;" onclick="event.stopPropagation()">
          <div class="mission-modal-head">
            <h3>Histórico de Missões Concluídas</h3>
            <button class="mission-modal-close-btn" type="button" onclick="window.closeMissionModal()" aria-label="Fechar">✕</button>
          </div>

          ${missionHistory.length > 0 ? `
            <div style="max-height:360px;overflow-y:auto;display:flex;flex-direction:column;gap:14px;">
              ${missionHistory.map((m, idx) => `
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                    <b style="color:#34d399;font-size:14px;">${escapeHtml(m.title)}</b>
                    <span style="font-size:11px;color:#94a3b8;">${m.trades?.length || 0} trades cumpridos</span>
                  </div>
                  <p style="font-size:12px;color:#cbd5e1;margin:0 0 8px 0;">${escapeHtml(m.reason || 'Sem motivo registrado')}</p>
                  <div style="font-size:11px;color:#facc15;">
                    Recompensa: <b>${escapeHtml(m.reward || 'Sem recompensa')}</b>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <p style="text-align:center;color:#94a3b8;padding:24px 0;">Nenhuma missão concluída no histórico ainda.</p>
          `}

          <div class="mission-modal-actions">
            <button class="mission-btn-secondary" type="button" onclick="window.closeMissionModal()">Fechar</button>
          </div>
        </div>
      </div>
    `;
  };

  window.closeMissionModal = function (event) {
    if (event && event.target && !event.target.classList.contains('mission-modal-backdrop') && !event.target.classList.contains('mission-modal-close-btn') && !event.target.classList.contains('mission-btn-secondary')) {
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
    getHistory: () => [...missionHistory]
  };

})(typeof window !== 'undefined' ? window : this);

