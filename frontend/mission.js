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
          currentMission = parsed;
        }
      }
    } catch (_) {}

    if (!currentMission) {
      currentMission = { ...M.DEFAULT_MISSION };
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
      { left: 31.5, top: 57.5 }, // Marco 1
      { left: 39.5, top: 53.5 }, // Marco 2
      { left: 47.5, top: 49.5 }, // Marco 3
      { left: 58.5, top: 45.0 }, // Marco 4
      { left: 68.0, top: 40.0 }, // Marco 5
      { left: 77.8, top: 34.0 }, // Marco 6
      { left: 83.8, top: 26.5 }  // Marco 7 (Cume / Baú)
    ];

    // Cálculos do Gauge Radial
    const radius = 48;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress.progressPct / 100) * circumference;

    const html = `
      <div class="mission-shell">
        <!-- Hero Artístico da Montanha com Soldado e Trilha -->
        <section class="mission-hero-panorama" aria-label="Jornada da Missão" onclick="window.handleSelectWaypoint(null)">
          <!-- Título Superior Esquerdo com Breadcrumb, Histórico e Pílula de Progresso Integrado -->
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
            <div class="mission-hero-progress-pill">
              <span class="mission-pill-dot"></span>
              <span>Jornada: <b>${progress.completedTrades} de ${progress.targetTrades} trades</b> (${progress.progressPct}%) • <b>Marco ${progress.currentStationNumber} de 7</b></span>
            </div>
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
              let iconContent = '';
              if (wp.status === 'COMPLETED') {
                iconContent = '✓';
              } else if (wp.status === 'ACTIVE') {
                iconContent = `${wp.stationNumber}`;
              } else {
                if (wp.stationNumber === 7) {
                  iconContent = `${wp.stationNumber}`;
                } else {
                  iconContent = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
                }
              }

              return `
                <div class="mission-waypoint-node ${wp.status.toLowerCase()} ${isSelected ? 'is-selected' : ''}"
                     style="left: ${coords.left}%; top: ${coords.top}%;"
                     onclick="window.handleSelectWaypoint(${wp.stationNumber})"
                     title="${wp.stationLabel}: ${wp.stationTrades} trades (${wp.status})">
                  <div class="mission-node-disc">${iconContent}</div>
                  <span class="mission-node-num">${wp.stationNumber}</span>

                  ${isSelected ? `
                    <div class="mission-waypoint-info-card" onclick="event.stopPropagation()">
                      <div class="mission-waypoint-info-head">
                        <b>${wp.stationLabel}: meta de ${wp.stationTrades} trades</b>
                        <button type="button" class="mission-waypoint-info-close" onclick="window.handleSelectWaypoint(null)" aria-label="Fechar">✕</button>
                      </div>
                      <p class="mission-waypoint-info-desc">${escapeHtml(wp.statusDescription)}</p>
                      <div class="mission-waypoint-info-foot">
                        <span class="mission-waypoint-badge ${wp.status.toLowerCase()}">
                          ${wp.status === 'COMPLETED' ? '✓ Concluído' : (wp.status === 'ACTIVE' ? '★ Em andamento' : '🔒 Bloqueado')}
                        </span>
                        <small>${progress.completedTrades} de ${progress.targetTrades} trades</small>
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
                <input id="missionTargetInput" type="number" min="1" max="100" value="${currentMission.targetTrades}">
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

              <div id="missionConfigFeedback" class="mission-inline-feedback" style="display:none;"></div>

              <button class="mission-start-btn ${currentMission.status === 'ACTIVE' ? 'is-active' : ''}" type="button" onclick="window.handleStartOrSaveMission()">
                ${currentMission.status === 'ACTIVE' ? '✓ Missão Ativa (Salvar)' : '▶ Iniciar Missão'}
              </button>
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
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                  </span>
                  <div class="mission-stat-content">
                    <strong>${progress.progressPct}%</strong>
                    <small>Progresso geral</small>
                  </div>
                </div>
                <div class="mission-stat-item">
                  <span class="mission-stat-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                  </span>
                  <div class="mission-stat-content">
                    <strong>Marco ${progress.currentStationNumber} de 7</strong>
                    <small>Estágio atual (meta: ${progress.currentStationTrades} trades)</small>
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
                      <th>Nº</th>
                      <th>Data</th>
                      <th>Ativo</th>
                      <th>Resultado</th>
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
                  Clique em <b>+ Marcar Trade</b> após realizar uma operação dentro das regras.
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

  window.handleStartOrSaveMission = function () {
    const targetInput = document.getElementById('missionTargetInput');
    const riskSelect = document.getElementById('missionRiskSelect');
    const rewardInput = document.getElementById('missionRewardInput');

    const nextTarget = Math.max(1, Math.min(100, Math.round(Number(targetInput?.value) || currentMission.targetTrades || 20)));
    const nextRisk = Number(riskSelect?.value || currentMission.riskPct || 0.001);
    const nextReward = String(rewardInput?.value || '').trim() || currentMission.reward || 'Um jantar especial';

    const rebuildState = RM ? RM.getRebuildState() : null;

    // Atualiza a configuração preservando integralmente os trades e histórico existentes
    currentMission = M.updateMissionConfig(currentMission, {
      targetTrades: nextTarget,
      riskPct: nextRisk,
      reward: nextReward
    }, rebuildState);

    // Ativa a missão se ainda não estiver ativa, gravando a data de início
    if (currentMission.status !== 'ACTIVE') {
      currentMission.status = 'ACTIVE';
      if (!currentMission.startDate) {
        currentMission.startDate = new Date().toISOString();
      }
    }

    saveMissionData();
    renderMissionPage();

    const feedback = document.getElementById('missionConfigFeedback');
    if (feedback) {
      feedback.textContent = 'Configuração salva com sucesso!';
      feedback.style.display = 'block';
      setTimeout(() => {
        if (feedback) feedback.style.display = 'none';
      }, 3000);
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

