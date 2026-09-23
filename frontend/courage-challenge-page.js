/**
 * HEALTHY TREND TRADER - DESAFIO A (CORAGEM CALCULADA V2 & MODO DESAPEGO)
 * Filosofia: "Menos Dashboard. Mais Treinamento."
 */

(function(root) {
  'use strict';

  function safe(val) {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function numBR(val, decimals) {
    if (decimals === undefined) decimals = 2;
    const n = Number(val) || 0;
    return n.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function renderCourageChallengePage() {
    const container = document.getElementById('couragechallenge');
    if (!container) return;

    const CurrentModel = root.CourageChallengeModel;
    if (!CurrentModel) {
      container.innerHTML = '<div class="card" style="padding:40px;text-align:center;">Modelo CourageChallengeModel não carregado.</div>';
      return;
    }

    const state = CurrentModel.getState();
    const metrics = CurrentModel.calculateChallengeMetrics(state);
    const attempts = Array.isArray(state.attempts) ? state.attempts : [];
    const compliantAttempts = attempts.filter(function(a) {
      return a.complianceStatus === 'COMPLIANT' || a.sizingStatus === 'compliant';
    });

    const targetGoal = state.targetGoal || 20;
    const totalAttempts = attempts.length;
    const compCount = compliantAttempts.length;
    const underCount = metrics.underSizingCount || 0;
    const overCount = metrics.overSizingCount || 0;
    const compRate = metrics.riskCompliancePct !== undefined ? metrics.riskCompliancePct : (totalAttempts > 0 ? Math.round(compCount / totalAttempts * 100) : 100);
    const pctConcluido = Math.min(100, Math.round((compCount / targetGoal) * 100));

    // Último trade avaliado para o card protagonista Sizing Compliance
    const latestAttempt = totalAttempts > 0 ? attempts[totalAttempts - 1] : null;
    let targetDisplay = root.TradingRubrics?.normalizePolicy(root.riskPolicyState)?.grades.find(item => item.grade === 'A')?.riskPct * 100 || 0;
    if (latestAttempt) {
      targetDisplay = latestAttempt.executableRiskPercent || latestAttempt.targetRiskPercent || latestAttempt.targetRiskPct || targetDisplay;
    } else if (root.riskPolicyState && root.riskPolicyState.grades && root.riskPolicyState.grades[0]) {
      targetDisplay = root.riskPolicyState.grades[0].riskPct * 100;
    }
    const actualDisplay = latestAttempt ? (latestAttempt.actualRiskPercent || latestAttempt.actualRiskPct || targetDisplay) : targetDisplay;
    const complianceStatus = latestAttempt ? (latestAttempt.complianceStatus || latestAttempt.sizingStatus || 'COMPLIANT') : 'COMPLIANT';

    // Status Pill
    let statusPillClass = 'draft';
    let statusPillLabel = '📝 RASCUNHO';
    if (metrics.isActive) {
      statusPillClass = 'active';
      statusPillLabel = '🟢 DESAFIO ATIVO';
    } else if (metrics.isPaused) {
      statusPillClass = 'paused';
      statusPillLabel = '⏸️ PAUSADO';
    } else if (metrics.isCompleted) {
      statusPillClass = 'completed';
      statusPillLabel = '🏆 20/20 CONCLUÍDO';
    } else if (metrics.isCancelled) {
      statusPillClass = 'cancelled';
      statusPillLabel = '⏹️ CANCELADO';
    }

    // Action buttons in top-right
    let heroActionsHtml = '';
    if (metrics.isActive) {
      heroActionsHtml += '<button class="courage-mini-action-btn outline" onclick="CourageChallengePage.pauseChallenge()" title="Pausar Desafio">⏸️ Pausar</button>';
      heroActionsHtml += '<button class="courage-mini-action-btn danger" onclick="CourageChallengePage.confirmCancelChallenge()" title="Encerrar Desafio">✕ Encerrar</button>';
      heroActionsHtml += '<button class="courage-mini-action-btn gold" onclick="CourageChallengePage.openAddTradeModal()" title="Registrar Trade Manual">＋ Registrar</button>';
    } else if (metrics.isPaused) {
      heroActionsHtml += '<button class="courage-mini-action-btn primary" onclick="CourageChallengePage.resumeChallenge()">▶️ Retomar</button>';
      heroActionsHtml += '<button class="courage-mini-action-btn danger" onclick="CourageChallengePage.confirmCancelChallenge()">✕ Encerrar</button>';
    } else if (metrics.isCompleted || metrics.isCancelled) {
      heroActionsHtml += '<button class="courage-mini-action-btn gold" onclick="CourageChallengePage.startNewChallenge()">🔄 Novo Ciclo</button>';
    } else {
      heroActionsHtml += '<button class="courage-mini-action-btn primary" onclick="CourageChallengePage.startChallenge()">🟢 Iniciar Desafio</button>';
    }

    const isDetached = state.detachmentMode !== false;

    // Deadline format
    let formattedDeadline = '31/12/2026';
    if (state.deadline) {
      const parts = state.deadline.split('-');
      if (parts.length === 3) {
        formattedDeadline = parts[2] + '/' + parts[1] + '/' + parts[0];
      } else {
        formattedDeadline = safe(state.deadline);
      }
    }
    const daysRemaining = metrics.daysRemaining !== null ? metrics.daysRemaining : 109;

    // SVG Donut
    // SVG Donut metrics (scaled up 60% to 130px diameter)
    const radius = 54;
    const circumference = 2 * Math.PI * radius; // 339.292
    const dashOffset = Math.max(0, circumference * (1 - pctConcluido / 100));

    // Dots Row
    let dotsHtml = '';
    for (let i = 1; i <= targetGoal; i++) {
      const isFilled = i <= compCount;
      const trade = compliantAttempts[i - 1];

      if (isFilled) {
        dotsHtml += '<button type="button" class="courage-clean-dot filled" onclick="CourageChallengePage.openTradeDetails(' + JSON.stringify(trade ? (trade.id || trade.attemptId) : '') + ')" title="Execução #' + i + ': ' + safe(trade ? trade.ticker : 'COMPLIANT') + '"></button>';
      } else {
        dotsHtml += '<button type="button" class="courage-clean-dot empty" onclick="CourageChallengePage.openAddTradeModal()" title="Aguardando Execução #' + i + '"></button>';
      }
    }

    // Sizing Compliance Logic
    const isCompliant = (complianceStatus === 'COMPLIANT' || complianceStatus === 'compliant');
    const isUnder = (complianceStatus === 'UNDER_SIZING' || complianceStatus === 'under-sizing');
    const isOver = (complianceStatus === 'OVER_SIZING' || complianceStatus === 'over-sizing');

    let feedbackClass = 'compliant';
    let feedbackIcon = '✓';
    let feedbackTitle = 'EXECUÇÃO CORRETA';
    let feedbackDesc = 'Você seguiu exatamente o risco definido pela sua política.';

    if (isUnder) {
      feedbackClass = 'under-sizing';
      feedbackIcon = '⚠';
      feedbackTitle = 'UNDER-SIZING DETECTADO';
      feedbackDesc = 'Você assumiu menos risco do que sua política determinou.';
    } else if (isOver) {
      feedbackClass = 'over-sizing';
      feedbackIcon = '✕';
      feedbackTitle = 'OVER-SIZING DETECTADO';
      feedbackDesc = 'Você assumiu mais risco do que sua política autorizava.';
    }

    let html = '<div class="courage-challenge-shell compact-viewport">';

    // 1. HERO COMPACTO COM IMAGEM DE FUNDO
    html += '<header class="courage-compact-hero">';
    html += '  <div class="courage-compact-hero-controls">';
    html += '    <span class="courage-hero-status-tag ' + statusPillClass + '">' + statusPillLabel + '</span>';
    html += '    <button type="button" class="courage-detachment-toggle-pill ' + (isDetached ? 'active' : '') + '" onclick="CourageChallengePage.toggleDetachmentMode(' + !isDetached + ')" title="Clique para alternar o Modo Desapego">';
    html += '      🧘 Desapego: <strong>' + (isDetached ? 'ON' : 'OFF') + '</strong>';
    html += '    </button>';
    html += heroActionsHtml;
    html += '  </div>';

    html += '  <div class="courage-compact-hero-body">';
    html += '    <div class="courage-kicker-gold">DESAFIO GRADE A</div>';
    html += '    <h1 class="courage-compact-title">';
    html += '      Quebre suas<br>';
    html += '      <span class="courage-title-accent">';
    html += '        barreiras!';
    html += '        <svg class="courage-title-brush" viewBox="0 0 170 14" fill="none"><path d="M 2 9 Q 85 1 168 9" stroke="#2ee59d" stroke-width="3.2" stroke-linecap="round"/></svg>';
    html += '      </span>';
    html += '    </h1>';
    html += '    <div class="courage-compact-subtitle">What\'s holding you back?</div>';
    html += '    <blockquote class="courage-compact-quote">';
    html += '      “Meu objetivo não é perder o medo.<br>É parar de deixar o medo decidir minha exposição.”';
    html += '    </blockquote>';
    html += '  </div>';
    html += '</header>';

    // 2. CARD PROGRESSO (DONUT + 65% CONCLUÍDO + 20 DOTS + 4 STATS + PRAZO)
    html += '<section class="courage-compact-progress-card">';
    html += '  <div class="courage-progress-donut-col">';
    html += '    <div class="courage-donut-wrap">';
    html += '      <svg class="courage-donut-svg" width="130" height="130" viewBox="0 0 130 130">';
    html += '        <circle cx="65" cy="65" r="' + radius + '" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8"/>';
    html += '        <circle cx="65" cy="65" r="' + radius + '" fill="none" stroke="#2ee59d" stroke-width="8"';
    html += '          stroke-dasharray="' + circumference.toFixed(1) + '" stroke-dashoffset="' + dashOffset.toFixed(1) + '"';
    html += '          stroke-linecap="round" transform="rotate(-90 65 65)"/>';
    html += '      </svg>';
    html += '      <div class="courage-donut-center">';
    html += '        <div class="courage-donut-current">' + compCount + '</div>';
    html += '        <div class="courage-donut-goal">/ ' + targetGoal + '</div>';
    html += '        <div class="courage-donut-label">EXECUÇÕES GRADE A</div>';
    html += '      </div>';
    html += '    </div>';
    html += '  </div>';

    html += '  <div class="courage-progress-main-col">';
    html += '    <div class="courage-progress-top-headline">';
    html += '      <span class="courage-pct-highlight">' + pctConcluido + '%</span>';
    html += '      <span class="courage-pct-sublabel">concluído</span>';
    html += '    </div>';
    html += '    <div class="courage-clean-dots-bar">' + dotsHtml + '</div>';
    html += '    <div class="courage-clean-stats-row">';
    html += '      <div class="courage-clean-stat-col">';
    html += '        <span class="courage-clean-stat-number">' + totalAttempts + '</span>';
    html += '        <span class="courage-clean-stat-desc">Setups Grade A</span>';
    html += '      </div>';
    html += '      <div class="courage-clean-stat-col">';
    html += '        <span class="courage-clean-stat-number green">' + compCount + '</span>';
    html += '        <span class="courage-clean-stat-desc">Execuções corretas</span>';
    html += '      </div>';
    html += '      <div class="courage-clean-stat-col">';
    html += '        <span class="courage-clean-stat-number">' + compRate + '%</span>';
    html += '        <span class="courage-clean-stat-desc">Risk Compliance</span>';
    html += '      </div>';
    html += '      <div class="courage-clean-stat-col">';
    html += '        <span class="courage-clean-stat-number ' + (underCount > 0 ? 'yellow' : '') + '">' + underCount + '</span>';
    html += '        <span class="courage-clean-stat-desc">Courage Gaps</span>';
    html += '      </div>';
    html += '    </div>';
    html += '  </div>';

    html += '  <div class="courage-progress-deadline-col" onclick="CourageChallengePage.openCommitmentsModal()" title="Clique para editar prazo e compromissos">';
    html += '    <div class="courage-cal-header-row">';
    html += '      <span class="courage-cal-emoji">📅</span>';
    html += '      <div>';
    html += '        <div class="courage-cal-kicker">PRAZO DO DESAFIO</div>';
    html += '        <div class="courage-cal-date">' + formattedDeadline + '</div>';
    html += '      </div>';
    html += '    </div>';
    html += '    <div class="courage-cal-countdown">';
    html += '      <strong class="courage-cal-days">' + daysRemaining + '</strong>';
    html += '      <span class="courage-cal-days-label">dias restantes</span>';
    html += '    </div>';
    html += '  </div>';
    html += '</section>';

    // 3. CARD SIZING COMPLIANCE (PROTAGONISTA)
    html += '<section class="courage-compact-sizing-card">';
    html += '  <div class="courage-compact-sizing-head">';
    html += '    <div class="courage-sizing-heading-group">';
    html += '      <span class="courage-sizing-icon-svg">🎯</span>';
    html += '      <div>';
    html += '        <h3 class="courage-sizing-h3">SIZING COMPLIANCE</h3>';
    html += '        <p class="courage-sizing-explainer">Execute exatamente o risco que seu sistema determinou. <span class="courage-tooltip-ico" title="Monitoramento do risco planejado vs executado">ⓘ</span></p>';
    html += '      </div>';
    html += '    </div>';
    html += '    <button type="button" class="courage-details-outline-btn" onclick="CourageChallengePage.openFullHistoryModal()">Ver detalhes →</button>';
    html += '  </div>';

    html += '  <div class="courage-compact-sizing-body">';
    html += '    <div class="courage-sizing-metric-box defined">';
    html += '      <div class="courage-metric-tag">RISCO DEFINIDO</div>';
    html += '      <div class="courage-metric-sub">(pela política)</div>';
    html += '      <div class="courage-metric-value">' + numBR(targetDisplay, 2) + '%</div>';
    html += '      <div class="courage-metric-footer">do seu capital</div>';
    html += '    </div>';

    html += '    <div class="courage-sizing-connector-arrow">➔</div>';

    html += '    <div class="courage-sizing-metric-box executed ' + (isCompliant ? 'highlight-compliant' : (isUnder ? 'highlight-under' : 'highlight-over')) + '">';
    html += '      <div class="courage-metric-tag green">RISCO EXECUTADO</div>';
    html += '      <div class="courage-metric-sub">(este trade)</div>';
    html += '      <div class="courage-metric-value green">' + numBR(actualDisplay, 2) + '% ' + (isCompliant ? '<span class="courage-metric-check-inline">✓</span>' : '') + '</div>';
    html += '      <div class="courage-metric-footer">do seu capital</div>';
    html += '    </div>';

    html += '    <div class="courage-sizing-result-box ' + feedbackClass + '">';
    html += '      <div class="courage-result-icon-circle">' + feedbackIcon + '</div>';
    html += '      <div class="courage-result-text-group">';
    html += '        <h4 class="courage-result-title">' + feedbackTitle + '</h4>';
    html += '        <p class="courage-result-desc">' + feedbackDesc + '</p>';
    html += '      </div>';
    html += '    </div>';
    html += '  </div>';
    html += '</section>';

    // 4. CARDS COMPACTOS: MINHA RECOMPENSA & MINHA CONSEQUÊNCIA (LADO A LADO)
    html += '<div class="courage-compact-commitments-row">';
    html += '  <div class="courage-compact-tile reward" onclick="CourageChallengePage.openCommitmentsModal()" title="Clique para editar recompensa">';
    html += '    <div class="courage-tile-head">';
    html += '      <div class="courage-tile-icon-badge green">🎁</div>';
    html += '      <div>';
    html += '        <h4 class="courage-tile-title">MINHA RECOMPENSA</h4>';
    html += '        <p class="courage-tile-subtitle">O que vou me dar ao completar o desafio?</p>';
    html += '      </div>';
    html += '    </div>';
    html += '    <div class="courage-tile-body-box">' + safe(state.reward || 'Ex.: Uma viagem / novo equipamento / experiência especial / aporte extra.') + '</div>';
    html += '  </div>';

    html += '  <div class="courage-compact-tile consequence" onclick="CourageChallengePage.openCommitmentsModal()" title="Clique para editar consequência">';
    html += '    <div class="courage-tile-head">';
    html += '      <div class="courage-tile-icon-badge gold">⚡</div>';
    html += '      <div>';
    html += '        <h4 class="courage-tile-title">MINHA CONSEQUÊNCIA</h4>';
    html += '        <p class="courage-tile-subtitle">O que vou fazer se não concluir até a data?</p>';
    html += '      </div>';
    html += '    </div>';
    html += '    <div class="courage-tile-body-box">' + safe(state.consequence || state.punishment || 'Ex.: Doação de um valor / cortar um gasto / rotina extra de estudos / outra consequência.') + '</div>';
    html += '  </div>';
    html += '</div>';

    // 5. FOOTER
    html += '<footer class="courage-compact-footer">';
    html += '  <div class="courage-footer-quote">PROCESSO &nbsp;➔&nbsp; EXECUÇÃO &nbsp;➔&nbsp; CONFIANÇA &nbsp;➔&nbsp; LIBERDADE</div>';
    html += '  <div class="courage-footer-brand">';
    html += '    <span style="color:#25d366;font-size:12px;margin-right:4px;">▲</span> HEALTHY TREND TRADER';
    html += '  </div>';
    html += '</footer>';

    html += '</div>'; // close courage-challenge-shell
    html += '<div id="courageModalsHost"></div>';

    container.innerHTML = html;

    if (compCount >= 20 && !state.celebrationDismissed) {
      setTimeout(function() { CourageChallengePage.openCelebrationModal(); }, 600);
    }
  }

  // Lifecycle actions
  function startChallenge() {
    root.CourageChallengeModel.startChallenge();
    renderCourageChallengePage();
    if (typeof showToast === 'function') {
      showToast('🟢 Desafio Grade A Iniciado! Seus próximos setups Grade A serão monitorados.');
    }
  }

  function pauseChallenge() {
    root.CourageChallengeModel.pauseChallenge();
    renderCourageChallengePage();
    if (typeof showToast === 'function') {
      showToast('⏸️ Desafio Grade A Pausado. Trades não serão contabilizados até você retomar.');
    }
  }

  function resumeChallenge() {
    root.CourageChallengeModel.resumeChallenge();
    renderCourageChallengePage();
    if (typeof showToast === 'function') {
      showToast('🟢 Desafio Grade A Retomado! Próximos setups Grade A voltarão a ser vinculados.');
    }
  }

  function confirmCancelChallenge() {
    if (!confirm('Deseja realmente encerrar este Desafio Grade A? O progresso será finalizado.')) return;
    root.CourageChallengeModel.cancelChallenge();
    renderCourageChallengePage();
    if (typeof showToast === 'function') {
      showToast('⏹️ Desafio Grade A encerrado.');
    }
  }

  function startNewChallenge() {
    if (!confirm('Deseja iniciar um novo ciclo de 20 execuções Grade A? O histórico anterior será reiniciado.')) return;
    root.CourageChallengeModel.resetChallenge();
    root.CourageChallengeModel.startChallenge();
    renderCourageChallengePage();
    if (typeof showToast === 'function') {
      showToast('🟢 Novo Desafio Grade A iniciado com sucesso!');
    }
  }

  function toggleDetachmentMode(val) {
    root.CourageChallengeModel.setDetachmentMode(val);
    renderCourageChallengePage();
    if (typeof showToast === 'function') {
      showToast(val ? '🧘 Modo Desapego ATIVADO: foco em R e percentual de risco.' : 'Modo Desapego desativado.');
    }
  }

  // Modais
  function openCommitmentsModal() {
    const state = root.CourageChallengeModel.getState();
    const host = document.getElementById('courageModalsHost') || document.body;
    const barrierOptions = root.CourageChallengeModel.BARRIER_OPTIONS || [];
    const activeBarriers = Array.isArray(state.barriers) ? state.barriers : [];

    let barriersCheckboxes = '';
    barrierOptions.forEach(function(opt) {
      const isChecked = activeBarriers.includes(opt.label);
      barriersCheckboxes += '<label class="courage-barrier-checkbox-item' + (isChecked ? ' checked' : '') + '">';
      barriersCheckboxes += '  <input type="checkbox" name="challengeBarrier" value="' + safe(opt.label) + '" ' + (isChecked ? 'checked' : '') + ' onchange="this.closest(\'.courage-barrier-checkbox-item\').classList.toggle(\'checked\', this.checked)">';
      barriersCheckboxes += '  <span class="courage-barrier-checkbox-label">' + safe(opt.label) + '</span>';
      barriersCheckboxes += '</label>';
    });

    let modalHtml = '<div class="courage-modal-backdrop open" id="courageCommitmentsModal">';
    modalHtml += '<div class="courage-modal-card">';
    modalHtml += '  <div class="courage-modal-header">';
    modalHtml += '    <h3>⚙️ Configuração do Ciclo & Barreiras</h3>';
    modalHtml += '    <button class="courage-modal-close" onclick="CourageChallengePage.closeModal(&apos;courageCommitmentsModal&apos;)" title="Fechar modal">×</button>';
    modalHtml += '  </div>';
    modalHtml += '  <div style="display:flex;flex-direction:column;gap:16px;">';
    modalHtml += '    <div>';
    modalHtml += '      <label class="courage-modal-field-label">🎁 Minha Recompensa (ao completar 20 acertos)</label>';
    modalHtml += '      <input type="text" id="modalRewardInput" class="courage-modal-input" placeholder="Ex.: Jantar de celebração com a família no melhor restaurante..." value="' + safe(state.reward || '') + '">';
    modalHtml += '    </div>';
    modalHtml += '    <div>';
    modalHtml += '      <label class="courage-modal-field-label">⚡ Minha Punição (se violar por medo ou euforia)</label>';
    modalHtml += '      <input type="text" id="modalPunishmentInput" class="courage-modal-input" placeholder="Ex.: Se violar o processo, doarei R$ 500 para caridade e ficarei 3 dias sem operar..." value="' + safe(state.punishment || state.consequence || '') + '">';
    modalHtml += '    </div>';
    modalHtml += '    <div>';
    modalHtml += '      <label class="courage-modal-field-label">⏳ Prazo Limite do Desafio</label>';
    modalHtml += '      <input type="date" id="modalDeadlineInput" class="courage-modal-input" value="' + safe(state.deadline || '') + '">';
    modalHtml += '    </div>';
    modalHtml += '    <div>';
    modalHtml += '      <label class="courage-modal-field-label">What\'s holding you back? · Barreiras que estou treinando</label>';
    modalHtml += '      <div class="courage-barriers-picker-grid">' + barriersCheckboxes + '</div>';
    modalHtml += '    </div>';
    modalHtml += '  </div>';
    modalHtml += '  <div class="courage-modal-footer">';
    modalHtml += '    <button class="courage-action-btn outline" onclick="CourageChallengePage.closeModal(&apos;courageCommitmentsModal&apos;)">Cancelar</button>';
    modalHtml += '    <button class="courage-action-btn primary" onclick="CourageChallengePage.saveCommitmentsFromModal()">Salvar Alterações</button>';
    modalHtml += '  </div>';
    modalHtml += '</div></div>';

    host.innerHTML = modalHtml;
  }

  function saveCommitmentsFromModal() {
    const reward = document.getElementById('modalRewardInput')?.value;
    const punishment = document.getElementById('modalPunishmentInput')?.value;
    const deadline = document.getElementById('modalDeadlineInput')?.value;
    const barrierCheckboxes = document.querySelectorAll('input[name="challengeBarrier"]:checked');
    const selectedBarriers = Array.from(barrierCheckboxes).map(function(cb) { return cb.value; });

    root.CourageChallengeModel.updateCommitments({
      reward,
      punishment,
      deadline,
      barriers: selectedBarriers
    });

    closeModal('courageCommitmentsModal');
    renderCourageChallengePage();
    if (typeof showToast === 'function') {
      showToast('✓ Configurações do ciclo salvas com sucesso.');
    }
  }

  function openFullHistoryModal() {
    const state = root.CourageChallengeModel.getState();
    const attempts = state.attempts || [];
    const host = document.getElementById('courageModalsHost') || document.body;

    let tableRows = '';
    attempts.forEach(function(att, idx) {
      const isComp = att.complianceStatus === 'COMPLIANT' || att.sizingStatus === 'compliant';
      const isUnder = att.complianceStatus === 'UNDER_SIZING' || att.sizingStatus === 'under-sizing';
      const stClass = isComp ? 'comp' : (isUnder ? 'under' : 'over');
      const stLabel = isComp ? 'COMPLIANT (+1)' : (isUnder ? 'UNDER-SIZING (+0)' : 'OVER-SIZING (+0)');
      const gapLabel = att.courageGap ? (att.courageGap + '% (Medo)') : (att.underSizingReason || att.reason || '—');

      tableRows += '<tr>';
      tableRows += '  <td><strong>#' + (att.attemptNumber || idx + 1) + '</strong></td>';
      tableRows += '  <td>' + safe(att.date || '—') + '</td>';
      tableRows += '  <td><strong class="courage-ticker-badge">' + safe(att.ticker) + '</strong></td>';
      tableRows += '  <td>' + numBR(att.executableRiskPercent || att.targetRiskPercent || att.targetRiskPct, 2) + '% → <strong>' + numBR(att.actualRiskPercent || att.actualRiskPct, 2) + '%</strong></td>';
      tableRows += '  <td><span class="courage-status-pill ' + stClass + '">' + stLabel + '</span></td>';
      tableRows += '  <td class="courage-muted-cell">' + safe(gapLabel) + '</td>';
      tableRows += '  <td><button class="courage-mini-action-btn outline" data-trade-id="' + safe(att.id || att.attemptId) + '" onclick="CourageChallengePage.openTradeDetails(this.dataset.tradeId)">Snapshot</button></td>';
      tableRows += '</tr>';
    });

    let modalHtml = '<div class="courage-modal-backdrop open" id="courageFullHistoryModal">';
    modalHtml += '<div class="courage-modal-card" style="max-width:860px;">';
    modalHtml += '  <div class="courage-modal-header">';
    modalHtml += '    <h3>📋 Histórico Completo de Tentativas (' + attempts.length + ')</h3>';
    modalHtml += '    <button class="courage-modal-close" onclick="CourageChallengePage.closeModal(&apos;courageFullHistoryModal&apos;)" title="Fechar modal">×</button>';
    modalHtml += '  </div>';
    modalHtml += '  <div style="overflow-x:auto;">';
    modalHtml += '    <table class="courage-modal-table">';
    modalHtml += '      <thead><tr>';
    modalHtml += '        <th>#</th><th>Data</th><th>Ativo</th><th>Alvo → Real</th><th>Resultado</th><th>Motivo / Gap</th><th>Ação</th>';
    modalHtml += '      </tr></thead><tbody>' + (tableRows || '<tr><td colspan="7" style="padding:24px;text-align:center;color:#9bb7aa;">Nenhuma tentativa registrada ainda.</td></tr>') + '</tbody>';
    modalHtml += '    </table>';
    modalHtml += '  </div>';
    modalHtml += '  <div class="courage-modal-footer">';
    modalHtml += '    <button class="courage-action-btn outline" onclick="CourageChallengePage.closeModal(&apos;courageFullHistoryModal&apos;)">Fechar</button>';
    modalHtml += '  </div>';
    modalHtml += '</div></div>';

    host.innerHTML = modalHtml;
  }

  function openTradeDetails(tradeId) {
    const state = root.CourageChallengeModel.getState();
    const attempts = state.attempts || [];
    const trade = attempts.find(function(a) { return a.id === tradeId || a.attemptId === tradeId; });
    if (!trade) return;

    const isComp = trade.complianceStatus === 'COMPLIANT' || trade.sizingStatus === 'compliant';
    const host = document.getElementById('courageModalsHost') || document.body;
    let modalHtml = '<div class="courage-modal-backdrop open" id="courageSnapshotModal">';
    modalHtml += '<div class="courage-modal-card" style="max-width:640px;">';
    modalHtml += '  <div class="courage-modal-header">';
    modalHtml += '    <h3>📸 Snapshot Imutável de Entrada (' + safe(trade.ticker) + ')</h3>';
    modalHtml += '    <button class="courage-modal-close" onclick="CourageChallengePage.closeModal(&apos;courageSnapshotModal&apos;)" title="Fechar modal">×</button>';
    modalHtml += '  </div>';
    modalHtml += '  <div class="courage-snapshot-grid">';
    modalHtml += '    <div class="courage-snapshot-item"><div class="courage-snapshot-label">Data/Hora</div><div class="courage-snapshot-value">' + safe(trade.timestamp || trade.date) + '</div></div>';
    modalHtml += '    <div class="courage-snapshot-item"><div class="courage-snapshot-label">Ticker & Setup</div><div class="courage-snapshot-value">' + safe(trade.ticker) + ' (' + safe(trade.setupGrade || 'A') + ')</div></div>';
    modalHtml += '    <div class="courage-snapshot-item"><div class="courage-snapshot-label">Risk Budget pelo Grade</div><div class="courage-snapshot-value">' + numBR(trade.riskBudgetPercent || trade.riskBudgetPct, 2) + '%</div></div>';
    modalHtml += '    <div class="courage-snapshot-item"><div class="courage-snapshot-label">Risco executável autorizado</div><div class="courage-snapshot-value">' + numBR(trade.executableRiskPercent || trade.targetRiskPercent || trade.targetRiskPct, 2) + '%</div></div>';
    modalHtml += '    <div class="courage-snapshot-item"><div class="courage-snapshot-label">Actual Risk (Executado)</div><div class="courage-snapshot-value ' + (isComp ? 'green' : 'yellow') + '">' + numBR(trade.actualRiskPercent || trade.actualRiskPct, 2) + '%</div></div>';
    modalHtml += '    <div class="courage-snapshot-item"><div class="courage-snapshot-label">Status Compliance</div><div class="courage-snapshot-value ' + (isComp ? 'green' : 'yellow') + '">' + safe(trade.complianceStatus) + '</div></div>';
    modalHtml += '    <div class="courage-snapshot-item"><div class="courage-snapshot-label">Courage Gap</div><div class="courage-snapshot-value">' + (trade.courageGap !== null ? (trade.courageGap + '%') : 'Nenhum') + '</div></div>';
    modalHtml += '    <div class="courage-snapshot-item"><div class="courage-snapshot-label">Desconforto Pré-Trade</div><div class="courage-snapshot-value">' + (trade.preTradeDiscomfortLevel !== null ? (trade.preTradeDiscomfortLevel + ' / 5') : 'Não avaliado') + '</div></div>';
    modalHtml += '    <div class="courage-snapshot-item"><div class="courage-snapshot-label">Modo Desapego</div><div class="courage-snapshot-value">' + (trade.detachmentMode ? 'ATIVADO (Foco em R)' : 'DESATIVADO') + '</div></div>';
    modalHtml += '    <div class="courage-snapshot-item"><div class="courage-snapshot-label">Qtd Boletada</div><div class="courage-snapshot-value">' + (trade.actualPositionSize || trade.quantity) + ' ações</div></div>';
    modalHtml += '    <div class="courage-snapshot-item"><div class="courage-snapshot-label">Risco Financeiro Nominal</div><div class="courage-snapshot-value">' + (trade.financialRiskAmount || trade.riskAmount ? ('R$ ' + numBR(trade.financialRiskAmount || trade.riskAmount, 2)) : 'R$ 0,00') + '</div></div>';
    modalHtml += '  </div>';
    modalHtml += '  <div class="courage-modal-footer">';
    modalHtml += '    <button class="courage-action-btn outline" onclick="CourageChallengePage.closeModal(&apos;courageSnapshotModal&apos;)">Fechar</button>';
    modalHtml += '  </div>';
    modalHtml += '</div></div>';

    host.innerHTML = modalHtml;
  }

  function openAddTradeModal() {
    const host = document.getElementById('courageModalsHost') || document.body;
    const policy = root.TradingRubrics?.normalizePolicy(root.riskPolicyState);
    let modalHtml = '<div class="courage-modal-backdrop open" id="courageAddTradeModal">';
    modalHtml += '<div class="courage-modal-card" style="max-width:500px;">';
    modalHtml += '  <div class="courage-modal-header">';
    modalHtml += '    <h3>＋ Registrar Execução Grade A Manual</h3>';
    modalHtml += '    <button class="courage-modal-close" onclick="CourageChallengePage.closeModal(&apos;courageAddTradeModal&apos;)" title="Fechar modal">×</button>';
    modalHtml += '  </div>';
    modalHtml += '  <div style="display:flex;flex-direction:column;gap:14px;">';
    modalHtml += '    <div><label class="courage-modal-field-label">Ticker do Ativo</label><input type="text" id="manTicker" class="courage-modal-input" value="PETR4"></div>';
    modalHtml += '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
    const nominalRisk = root.TradingRubrics?.normalizePolicy(root.riskPolicyState)?.grades.find(item => item.grade === 'A')?.riskPct * 100 || 0;
    modalHtml += '      <div><label class="courage-modal-field-label">Target Risk %</label><input type="number" step="0.01" id="manTarget" class="courage-modal-input" value="' + nominalRisk + '" readonly></div>';
    modalHtml += '      <div><label class="courage-modal-field-label">Actual Risk %</label><input type="number" step="0.01" id="manActual" class="courage-modal-input" value="' + nominalRisk + '"></div>';
    modalHtml += '    </div>';
    modalHtml += '    <div><div class="courage-modal-field-label">Quality Gate do Rubric</div><p style="margin:4px 0 10px;color:#a2c7b7;font-size:12px;">Avalie todos os critérios. Só um Rare Trade confirmado entra no Desafio.</p>';
    (policy?.criteria || []).forEach(function(criterion) {
      const options = criterion.key === 'marketCycle'
        ? [['healthy', 'Saudável'], ['improving', 'Melhorando'], ['transition', 'Transição'], ['defensive', 'Defensivo'], ['riskOff', 'Risk-Off']]
        : [['good', 'Bom'], ['medium', 'Médio'], ['bad', 'Ruim']];
      modalHtml += '<label class="courage-modal-field-label" for="manualRubric-' + safe(criterion.key) + '">' + safe(criterion.label) + '</label>';
      modalHtml += '<select id="manualRubric-' + safe(criterion.key) + '" class="courage-modal-input" style="margin:4px 0 9px;"><option value="">Selecione</option>';
      options.forEach(function(option) { modalHtml += '<option value="' + option[0] + '">' + option[1] + '</option>'; });
      modalHtml += '</select>';
    });
    modalHtml += '</div>';
    modalHtml += '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
    modalHtml += '      <div><label class="courage-modal-field-label">Preço Entrada (R$)</label><input type="number" step="0.01" id="manEntry" class="courage-modal-input" value="35.00"></div>';
    modalHtml += '      <div><label class="courage-modal-field-label">Stop Inicial (R$)</label><input type="number" step="0.01" id="manStop" class="courage-modal-input" value="34.00"></div>';
    modalHtml += '    </div>';
    modalHtml += '    <div>';
    modalHtml += '      <label class="courage-modal-field-label">Nível de Desconforto Pré-Trade (1 a 5)</label>';
    modalHtml += '      <input type="range" min="1" max="5" value="2" id="manDiscomfort" style="width:100%;accent-color:#2ee59d;">';
    modalHtml += '      <div style="display:flex;justify-content:space-between;font-size:11px;color:#a2c7b7;margin-top:2px;"><span>1: Confortável / Calmo</span><span>3: Hesitação</span><span>5: Alto Desconforto</span></div>';
    modalHtml += '    </div>';
    modalHtml += '  </div>';
    modalHtml += '  <div class="courage-modal-footer">';
    modalHtml += '    <button class="courage-action-btn outline" onclick="CourageChallengePage.closeModal(&apos;courageAddTradeModal&apos;)">Cancelar</button>';
    modalHtml += '    <button class="courage-action-btn primary" onclick="CourageChallengePage.confirmManualTrade()">Registrar</button>';
    modalHtml += '  </div>';
    modalHtml += '</div></div>';

    host.innerHTML = modalHtml;
  }

  function confirmManualTrade() {
    const policy = root.TradingRubrics?.normalizePolicy(root.riskPolicyState);
    if (!policy) return;
    const ratings = {};
    let marketCycleRegime = '';
    for (const criterion of policy.criteria) {
      const value = document.getElementById('manualRubric-' + criterion.key)?.value;
      if (!value) {
        if (typeof showToast === 'function') showToast('Avalie todos os critérios do Rubric antes de registrar.');
        return;
      }
      if (criterion.key === 'marketCycle') marketCycleRegime = value;
      else ratings[criterion.key] = value;
    }
    const rubric = root.TradingRubrics.calculateRubric({ ratings, marketCycleRegime }, policy);
    if (!rubric.complete || !rubric.qualityAllowed || rubric.grade !== 'A') {
      if (typeof showToast === 'function') showToast('Este setup não passou pelo Quality Gate do Grade A. Revise os critérios no Novo Trade.');
      return;
    }
    const ticker = document.getElementById('manTicker')?.value || 'ATIVO';
    const target = parseFloat(document.getElementById('manTarget')?.value);
    const actual = parseFloat(document.getElementById('manActual')?.value);
    if (!root.CourageChallengeModel.isChallengeActive() || !Number.isFinite(target) || target <= 0 || !Number.isFinite(actual)) return;
    const entry = parseFloat(document.getElementById('manEntry')?.value) || 35;
    const stop = parseFloat(document.getElementById('manStop')?.value) || 34;
    const discomfort = parseInt(document.getElementById('manDiscomfort')?.value) || 2;
    const equity = typeof OPERATIONAL_EQUITY !== 'undefined' ? Number(OPERATIONAL_EQUITY) : 0;
    if (equity <= 0) return;
    const riskAmount = (actual / 100) * equity;
    const riskPerUnit = Math.abs(entry - stop) || 1;
    const qty = Math.round(riskAmount / riskPerUnit);

    root.CourageChallengeModel.recordAttempt({
      ticker,
      setupGrade: rubric.grade,
      rubricScore: rubric.score,
      rubricContributions: rubric.contributions,
      targetRiskPercent: target,
      entryPrice: entry,
      initialStop: stop,
      quantity: qty,
      equityAtEntry: equity,
      preTradeDiscomfortLevel: discomfort,
    });

    closeModal('courageAddTradeModal');
    renderCourageChallengePage();
    if (typeof showToast === 'function') {
      showToast('✓ Execução registrada.');
    }
  }

  function openCelebrationModal() {
    const host = document.getElementById('courageModalsHost') || document.body;
    let modalHtml = '<div class="courage-modal-backdrop open" id="courageCelebrationModal">';
    modalHtml += '<div class="courage-modal-card" style="text-align:center;max-width:520px;">';
    modalHtml += '  <div style="font-size:56px;line-height:1;margin-bottom:12px;">🏆</div>';
    modalHtml += '  <h2 style="font-family:&apos;Playfair Display&apos;,Georgia,serif;font-size:28px;margin:0 0 10px;color:#f7d674;">DESAFIO GRADE A CONCLUÍDO!</h2>';
    modalHtml += '  <p style="font-size:15px;color:#dcece2;line-height:1.45;margin:0 0 24px;">Você completou 20 execuções perfeitas respeitando rigorosamente o risco autorizado pelo seu sistema.</p>';
    modalHtml += '  <button class="courage-action-btn gold" style="width:100%;justify-content:center;padding:12px;" onclick="CourageChallengePage.dismissCelebration()">Celebrar e Continuar</button>';
    modalHtml += '</div></div>';
    host.innerHTML = modalHtml;
  }

  function dismissCelebration() {
    const s = root.CourageChallengeModel.getState();
    s.celebrationDismissed = true;
    root.CourageChallengeModel.saveState(s);
    closeModal('courageCelebrationModal');
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.remove();
  }

  root.CourageChallengePage = {
    render: renderCourageChallengePage,
    startChallenge,
    pauseChallenge,
    resumeChallenge,
    confirmCancelChallenge,
    startNewChallenge,
    toggleDetachmentMode,
    openCommitmentsModal,
    saveCommitmentsFromModal,
    openFullHistoryModal,
    openTradeDetails,
    openAddTradeModal,
    confirmManualTrade,
    openCelebrationModal,
    dismissCelebration,
    closeModal
  };

  root.renderCourageChallengePage = renderCourageChallengePage;

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
      if (document.getElementById('couragechallenge')) {
        renderCourageChallengePage();
      }
    });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
