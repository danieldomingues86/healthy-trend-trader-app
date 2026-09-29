(() => {
  'use strict';

  const M = window.MarketPauseModel;
  const STORAGE_KEY = 'healthy-trend-market-pause-v1';
  const LOGIN_DISMISSED_KEY = 'htt_market_pause_login_dismissed';

  const state = {
    active: null,
    history: [],
    loaded: false,
    selectedAttemptReason: ''
  };

  function notify(msg) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg);
    } else {
      console.log('[MarketPause]', msg);
    }
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getLocalBackup() {
    try {
      const raw = window.healthyTrendWorkspace?.raw?.(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveLocalBackup(data) {
    try {
      const serialized = JSON.stringify(data);
      if (window.healthyTrendWorkspace?.storage) {
        window.healthyTrendWorkspace.storage.setItem(STORAGE_KEY, serialized);
      } else {
        localStorage.setItem(STORAGE_KEY, serialized);
      }
    } catch (_) {}
  }

  // ---------------------------------------------------------------------------
  // Data Loading & API Sync
  // ---------------------------------------------------------------------------
  async function load() {
    try {
      if (window.healthyTrendApi?.isAuthenticated?.()) {
        const response = await window.healthyTrendApi.request('/api/market-pause');
        state.active = response.active || null;
        state.history = Array.isArray(response.history) ? response.history : [];
        saveLocalBackup({ active: state.active, history: state.history });
      } else {
        const backup = getLocalBackup();
        if (backup) {
          state.active = backup.active || null;
          state.history = Array.isArray(backup.history) ? backup.history : [];
        }
      }
    } catch (err) {
      const backup = getLocalBackup();
      if (backup) {
        state.active = backup.active || null;
        state.history = Array.isArray(backup.history) ? backup.history : [];
      }
    } finally {
      state.loaded = true;
      renderAll();
      checkAndShowLoginModal();
    }
  }

  async function activate(payload) {
    const normalized = M.normalize(payload);
    if (window.healthyTrendApi?.isAuthenticated?.()) {
      const res = await window.healthyTrendApi.request('/api/market-pause', {
        method: 'POST',
        body: JSON.stringify(normalized)
      });
      state.active = res.active || null;
    } else {
      state.active = {
        id: `mp-${Date.now()}`,
        status: 'active',
        reason: normalized.reason,
        startDate: normalized.startDate,
        expectedReturnDate: normalized.expectedReturnDate,
        notes: normalized.notes,
        createdAt: new Date().toISOString()
      };
    }
    // Remove dismissal flag on new activation so login modal shows next time
    sessionStorage.removeItem(LOGIN_DISMISSED_KEY);
    saveLocalBackup({ active: state.active, history: state.history });
    renderAll();
    window.dispatchEvent(new CustomEvent('healthyTrend:marketPauseUpdated', { detail: { active: state.active } }));
    notify('Período fora do mercado ativado com sucesso.');
  }

  async function endPause(endReflection, onComplete) {
    const norm = M.normalizeEnd({ endReflection });
    if (window.healthyTrendApi?.isAuthenticated?.()) {
      const res = await window.healthyTrendApi.request('/api/market-pause/end', {
        method: 'POST',
        body: JSON.stringify(norm)
      });
      if (res.ended) {
        state.history.unshift(res.ended);
      }
      state.active = null;
    } else if (state.active) {
      const ended = {
        ...state.active,
        status: 'ended',
        endedAt: new Date().toISOString(),
        endReflection: norm.endReflection
      };
      state.history.unshift(ended);
      state.active = null;
    }
    sessionStorage.removeItem(LOGIN_DISMISSED_KEY);
    saveLocalBackup({ active: null, history: state.history });
    renderAll();
    window.dispatchEvent(new CustomEvent('healthyTrend:marketPauseUpdated', { detail: { active: null } }));
    notify('Período de pausa encerrado e registrado no histórico.');
    if (typeof onComplete === 'function') onComplete();
  }

  function isActive() {
    return M.isPauseCurrentlyActive(state.active);
  }

  function getActive() {
    return state.active;
  }

  function getHistory() {
    return state.history;
  }

  // ---------------------------------------------------------------------------
  // Global Banner
  // ---------------------------------------------------------------------------
  function ensureBannerRoot() {
    let root = document.getElementById('marketPauseBannerRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'marketPauseBannerRoot';
      root.className = 'market-pause-banner-root';
      const content = document.querySelector('.content') || document.querySelector('.main');
      if (content) {
        content.insertBefore(root, content.firstElementChild);
      }
    }
    return root;
  }

  function renderBanner() {
    const root = ensureBannerRoot();
    if (!root) return;

    if (!isActive()) {
      root.innerHTML = '';
      return;
    }

    const p = state.active;
    const returnDateFormatted = M.formatDate(p.expectedReturnDate);
    const reasonText = escapeHTML(p.reason);

    root.innerHTML = `
      <aside class="market-pause-banner" role="status" aria-live="polite">
        <div class="mp-banner-content">
          <span class="mp-banner-glow-dot" aria-hidden="true"></span>
          <div class="mp-banner-text">
            <span class="mp-banner-title">Modo Fora do Mercado</span>
            <span class="mp-banner-desc">Pausa ativa até <b>${returnDateFormatted}</b> · <em>${reasonText}</em></span>
          </div>
        </div>
        <div class="mp-banner-actions">
          <button type="button" class="mp-banner-btn-details" id="mpBannerDetailsBtn">Ver detalhes</button>
        </div>
      </aside>
    `;

    document.getElementById('mpBannerDetailsBtn')?.addEventListener('click', () => {
      openDetails();
    });
  }

  // ---------------------------------------------------------------------------
  // Settings Page Section Card
  // ---------------------------------------------------------------------------
  function ensureSettingsRoot() {
    let container = document.getElementById('marketPauseSettingsRoot');
    if (!container) {
      const grid = document.querySelector('#settings .settings-grid');
      if (!grid) return null;
      container = document.createElement('div');
      container.id = 'marketPauseSettingsRoot';
      container.style.gridColumn = '1 / -1';
      const drSection = document.getElementById('drSettingsSection');
      if (drSection) {
        grid.insertBefore(container, drSection);
      } else {
        grid.appendChild(container);
      }
    }
    return container;
  }

  function renderSettingsCard() {
    const root = ensureSettingsRoot();
    if (!root) return;

    const active = isActive();
    const pause = state.active;
    const todayISO = M.toDateOnly(new Date());
    const d7 = new Date();
    d7.setDate(d7.getDate() + 7);
    const d7ISO = M.toDateOnly(d7);

    let activeHTML = '';
    if (active) {
      const startFormatted = M.formatDate(pause.startDate);
      const returnFormatted = M.formatDate(pause.expectedReturnDate);
      const durationLabel = M.calculateDurationLabel(pause.startDate, pause.expectedReturnDate);
      const elapsed = M.calculateElapsedDays(pause.startDate);
      const remaining = M.calculateRemainingDays(pause.expectedReturnDate);

      activeHTML = `
        <div class="mp-active-summary-card">
          <div class="mp-summary-header">
            <div class="mp-summary-status">
              <span class="mp-pulse-dot"></span>
              <strong>Período Ativo</strong>
            </div>
            <span class="badge good">Modo Pausa Ativo</span>
          </div>
          <div class="mp-summary-grid">
            <div class="mp-summary-metric">
              <small>Motivo da pausa</small>
              <strong>${escapeHTML(pause.reason)}</strong>
            </div>
            <div class="mp-summary-metric">
              <small>Data de início</small>
              <strong>${startFormatted}</strong>
            </div>
            <div class="mp-summary-metric">
              <small>Retorno previsto</small>
              <strong>${returnFormatted}</strong>
            </div>
            <div class="mp-summary-metric">
              <small>Duração planejada</small>
              <strong>${durationLabel}</strong>
            </div>
            <div class="mp-summary-metric">
              <small>Tempo decorrido</small>
              <strong>${elapsed} dia(s) realizado(s)</strong>
            </div>
            <div class="mp-summary-metric">
              <small>Dias restantes</small>
              <strong>${remaining > 0 ? remaining + ' dia(s)' : 'Período concluído'}</strong>
            </div>
          </div>
          ${pause.notes ? `<div class="mp-summary-notes">“${escapeHTML(pause.notes)}”</div>` : ''}
          <div class="mp-summary-actions">
            <button type="button" class="primary" id="mpSettingsEndBtn" style="padding:10px 18px">Encerrar período de pausa</button>
            <button type="button" class="secondary" id="mpSettingsEditBtn" style="padding:10px 18px">Ajustar previsão de retorno</button>
          </div>
        </div>
      `;
    }

    let formHTML = '';
    if (!active) {
      formHTML = `
        <form class="mp-form" id="mpActivationForm" onsubmit="event.preventDefault()">
          <div class="mp-form-grid">
            <div class="mp-form-field full">
              <label for="mpReasonSelect">Motivo da pausa</label>
              <select id="mpReasonSelect" required>
                ${M.REASONS.map(r => `<option value="${r}">${r}</option>`).join('')}
              </select>
            </div>
            <div class="mp-form-field">
              <label for="mpStartDate">Data de início</label>
              <input type="date" id="mpStartDate" value="${todayISO}" required>
            </div>
            <div class="mp-form-field">
              <label for="mpReturnDate">Data prevista de retorno</label>
              <input type="date" id="mpReturnDate" value="${d7ISO}" min="${todayISO}" required>
            </div>
            <div class="mp-form-field full">
              <label for="mpNotes">Observação pessoal (opcional)</label>
              <textarea id="mpNotes" rows="3" placeholder="O que você pretende fazer durante esta pausa? O que quer preservar?"></textarea>
            </div>
          </div>
          <button type="submit" class="mp-btn-activate" id="mpActivateBtn">Ativar período fora do mercado</button>
        </form>
      `;
    }

    // History Table
    const pastRecords = state.history.filter(h => h.id !== pause?.id);
    let historyHTML = '';
    if (pastRecords.length > 0) {
      historyHTML = `
        <div class="mp-history-table-wrap">
          <table class="mp-history-table">
            <thead>
              <tr>
                <th>Início</th>
                <th>Retorno</th>
                <th>Duração</th>
                <th>Motivo</th>
                <th>Status / Reflexão</th>
              </tr>
            </thead>
            <tbody>
              ${pastRecords.map(rec => {
                const s = M.formatDate(rec.startDate);
                const r = M.formatDate(rec.endedAt || rec.expectedReturnDate);
                const dur = M.calculateDurationLabel(rec.startDate, rec.endedAt || rec.expectedReturnDate);
                const reflection = rec.endReflection || rec.notes || '-';
                return `
                  <tr>
                    <td><b>${s}</b></td>
                    <td>${r}</td>
                    <td>${dur}</td>
                    <td><span class="badge" style="background:#eaf3eb;border:1px solid #cfded4;color:#1c4b37;font-size:11px">${escapeHTML(rec.reason)}</span></td>
                    <td style="color:#506659;font-style:italic;max-width:280px">${escapeHTML(reflection)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      historyHTML = `<div class="mp-history-empty">Nenhum período de pausa anterior registrado.</div>`;
    }

    root.innerHTML = `
      <section class="card market-pause-settings-card" id="marketPauseSettingsCard">
        <div class="card-head">
          <svg class="settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="6" y="4" width="4" height="16" rx="1.5"></rect>
            <rect x="14" y="4" width="4" height="16" rx="1.5"></rect>
          </svg>
          <div>
            <h3>Modo Fora do Mercado</h3>
            <span>Mecanismo de proteção psicológica e disciplina operacional</span>
          </div>
          <span class="badge">${active ? 'Pausa Ativa' : 'Pronto para operar'}</span>
        </div>
        <p class="mp-settings-intro">
          Saber quando não operar também é parte fundamental do trading. Defina conscientemente um período de afastamento do mercado para preservar sua clareza mental, seu capital e o respeito ao seu processo.
        </p>
        ${activeHTML}
        ${formHTML}
        <div class="mp-history-section">
          <div class="mp-history-head">
            <h4>Histórico de Pausas</h4>
          </div>
          ${historyHTML}
        </div>
      </section>
    `;

    // Event listeners
    if (active) {
      document.getElementById('mpSettingsEndBtn')?.addEventListener('click', () => openEndModal());
      document.getElementById('mpSettingsEditBtn')?.addEventListener('click', () => openEditDatesModal());
    } else {
      document.getElementById('mpActivateBtn')?.addEventListener('click', handleActivateFromForm);
    }
  }

  function handleActivateFromForm() {
    const reason = document.getElementById('mpReasonSelect')?.value;
    const startDate = document.getElementById('mpStartDate')?.value;
    const expectedReturnDate = document.getElementById('mpReturnDate')?.value;
    const notes = document.getElementById('mpNotes')?.value;

    try {
      activate({ reason, startDate, expectedReturnDate, notes });
    } catch (err) {
      notify(err.message || 'Erro ao ativar pausa.');
    }
  }

  // ---------------------------------------------------------------------------
  // Pop-up no Login (Modal Central Automático)
  // ---------------------------------------------------------------------------
  function checkAndShowLoginModal() {
    if (!isActive()) return;
    if (sessionStorage.getItem(LOGIN_DISMISSED_KEY)) return;

    showLoginModal();
  }

  function showLoginModal() {
    closeAnyModal();
    const p = state.active;
    if (!p) return;

    const returnFormatted = M.formatDate(p.expectedReturnDate);
    const reasonText = escapeHTML(p.reason);

    const overlay = document.createElement('div');
    overlay.className = 'market-pause-modal-overlay';
    overlay.id = 'marketPauseActiveModalOverlay';

    overlay.innerHTML = `
      <div class="market-pause-modal" role="dialog" aria-modal="true" aria-labelledby="mpLoginTitle">
        <span class="mp-modal-kicker">Decisão de Disciplina</span>
        <h2 class="mp-modal-title" id="mpLoginTitle">⏸️ VOCÊ ESTÁ FORA DO MERCADO</h2>
        <div class="mp-modal-subtitle">E isso é uma decisão de disciplina.</div>
        <p class="mp-modal-lead">
          Você definiu um período de pausa para preservar sua clareza mental e seu processo.
        </p>

        <div class="mp-modal-info-box">
          <div class="mp-modal-info-row">
            <span>Motivo:</span>
            <strong>${reasonText}</strong>
          </div>
          <div class="mp-modal-info-row">
            <span>Pausa até:</span>
            <strong>${returnFormatted}</strong>
          </div>
        </div>

        <blockquote class="mp-modal-quote">
          “Você não precisa operar todos os dias.<br>
          Às vezes, o melhor trade é não fazer nenhum trade.”
        </blockquote>

        <div class="mp-modal-respect-text">
          “Você escolheu ficar fora. Nós vamos respeitar essa decisão.”
        </div>

        <div class="mp-modal-actions">
          <button type="button" class="secondary" id="mpLoginDetailsBtn">VER DETALHES</button>
          <button type="button" class="primary" id="mpLoginEnterBtn">ENTRAR NO MODO PAUSA</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('mpLoginEnterBtn')?.addEventListener('click', () => {
      sessionStorage.setItem(LOGIN_DISMISSED_KEY, '1');
      overlay.remove();
    });

    document.getElementById('mpLoginDetailsBtn')?.addEventListener('click', () => {
      sessionStorage.setItem(LOGIN_DISMISSED_KEY, '1');
      overlay.remove();
      openDetails();
    });
  }

  // ---------------------------------------------------------------------------
  // Freio Psicológico na Tentativa de Operar (Trade Attempt Brake)
  // ---------------------------------------------------------------------------
  function showTradeAttemptModal(onDismissBrake) {
    closeAnyModal();
    const p = state.active;
    if (!p) {
      if (typeof onDismissBrake === 'function') onDismissBrake();
      return;
    }

    const returnFormatted = M.formatDate(p.expectedReturnDate);
    state.selectedAttemptReason = M.TRADE_ATTEMPT_REASONS[0];

    const overlay = document.createElement('div');
    overlay.className = 'market-pause-modal-overlay';
    overlay.id = 'marketPauseActiveModalOverlay';

    overlay.innerHTML = `
      <div class="market-pause-modal mp-brake-modal" role="dialog" aria-modal="true">
        <span class="mp-modal-kicker mp-brake-kicker">Freio Psicológico Consciente</span>
        <h2 class="mp-modal-title">⚠️ VOCÊ ESTÁ EM PERÍODO DE PAUSA</h2>
        <p class="mp-modal-lead">
          Você decidiu ficar fora do mercado até <b>${returnFormatted}</b>.<br><br>
          Antes de continuar, pare por alguns segundos e reflita:
        </p>

        <h4 style="margin:0 0 10px;font-size:15px;color:var(--text)">Por que você quer operar agora?</h4>

        <div class="mp-options-container" id="mpOptionsContainer">
          ${M.TRADE_ATTEMPT_REASONS.map((r, i) => `
            <label class="mp-option-item ${i === 0 ? 'selected' : ''}">
              <input type="radio" name="mpTradeReason" value="${r}" ${i === 0 ? 'checked' : ''}>
              <span>${r}</span>
            </label>
          `).join('')}
        </div>

        <div class="mp-modal-actions" style="justify-content:space-between">
          <button type="button" class="mp-btn-end-pause-subtle" id="mpBrakeEndPauseBtn">ENCERRAR MINHA PAUSA</button>
          <button type="button" class="mp-btn-back-pause" id="mpBrakeStayBtn">VOLTAR PARA MINHA PAUSA</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelectorAll('input[name="mpTradeReason"]').forEach(input => {
      input.addEventListener('change', e => {
        state.selectedAttemptReason = e.target.value;
        overlay.querySelectorAll('.mp-option-item').forEach(el => el.classList.remove('selected'));
        e.target.closest('.mp-option-item')?.classList.add('selected');
      });
    });

    document.getElementById('mpBrakeStayBtn')?.addEventListener('click', () => {
      overlay.remove();
      notify('Você escolheu honrar sua pausa. Disciplina é sobre o que você decide não fazer.');
    });

    document.getElementById('mpBrakeEndPauseBtn')?.addEventListener('click', () => {
      overlay.remove();
      openEndModal({
        fromTradeAttempt: true,
        attemptReason: state.selectedAttemptReason
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Encerramento da Pausa (Modal de Encerramento)
  // ---------------------------------------------------------------------------
  function openEndModal(options = {}) {
    closeAnyModal();
    const p = state.active;
    if (!p) return;

    const startFormatted = M.formatDate(p.startDate);
    const returnFormatted = M.formatDate(p.expectedReturnDate);
    const elapsed = M.calculateElapsedDays(p.startDate);

    const overlay = document.createElement('div');
    overlay.className = 'market-pause-modal-overlay';
    overlay.id = 'marketPauseActiveModalOverlay';

    overlay.innerHTML = `
      <div class="market-pause-modal" role="dialog" aria-modal="true">
        <span class="mp-modal-kicker">Transição Consciente</span>
        <h2 class="mp-modal-title">Deseja realmente encerrar seu período de pausa?</h2>
        <p class="mp-modal-lead">
          Sua disciplina até aqui preservou seu capital. Avalie com honestidade sua clareza mental e prontidão para retomar operações com total aderência ao método.
        </p>

        <div class="mp-modal-info-box">
          <div class="mp-modal-info-row">
            <span>Motivo original:</span>
            <strong>${escapeHTML(p.reason)}</strong>
          </div>
          <div class="mp-modal-info-row">
            <span>Data de início:</span>
            <strong>${startFormatted}</strong>
          </div>
          <div class="mp-modal-info-row">
            <span>Data prevista de retorno:</span>
            <strong>${returnFormatted}</strong>
          </div>
          <div class="mp-modal-info-row">
            <span>Tempo de pausa realizado:</span>
            <strong style="color:var(--good)">${elapsed} dia(s) realizado(s)</strong>
          </div>
        </div>

        <div class="mp-form-field" style="margin-bottom:20px">
          <label for="mpEndReflectionInput" style="margin-bottom:6px">Como você se sente agora?</label>
          <textarea id="mpEndReflectionInput" rows="3" placeholder="Campo opcional para reflexão: como está sua clareza emocional e foco no método?"></textarea>
        </div>

        <div class="mp-modal-actions">
          <button type="button" class="secondary" id="mpEndCancelBtn">Continuar em pausa</button>
          <button type="button" class="primary" id="mpEndConfirmBtn">Encerrar período de pausa</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('mpEndCancelBtn')?.addEventListener('click', () => {
      overlay.remove();
    });

    document.getElementById('mpEndConfirmBtn')?.addEventListener('click', async () => {
      const reflection = document.getElementById('mpEndReflectionInput')?.value || '';
      overlay.remove();
      await endPause(reflection, () => {
        if (options.fromTradeAttempt) {
          if (typeof window.go === 'function') {
            window.go('newtrade');
          }
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Modal de Detalhes da Pausa (ao clicar em "Ver detalhes")
  // ---------------------------------------------------------------------------
  function openDetails() {
    closeAnyModal();
    if (!isActive()) {
      // Just navigate to settings
      if (typeof window.go === 'function') {
        window.go('settings');
        setTimeout(() => {
          document.getElementById('marketPauseSettingsCard')?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
      return;
    }

    const p = state.active;
    const startFormatted = M.formatDate(p.startDate);
    const returnFormatted = M.formatDate(p.expectedReturnDate);
    const durationLabel = M.calculateDurationLabel(p.startDate, p.expectedReturnDate);
    const elapsed = M.calculateElapsedDays(p.startDate);
    const remaining = M.calculateRemainingDays(p.expectedReturnDate);

    const overlay = document.createElement('div');
    overlay.className = 'market-pause-modal-overlay';
    overlay.id = 'marketPauseActiveModalOverlay';

    overlay.innerHTML = `
      <div class="market-pause-modal" role="dialog" aria-modal="true">
        <span class="mp-modal-kicker">Status Operacional</span>
        <h2 class="mp-modal-title">⏸️ Modo Fora do Mercado</h2>
        <div class="mp-modal-subtitle">Pausa ativa e protegida</div>

        <div class="mp-modal-info-box">
          <div class="mp-modal-info-row">
            <span>Motivo:</span>
            <strong>${escapeHTML(p.reason)}</strong>
          </div>
          <div class="mp-modal-info-row">
            <span>Início:</span>
            <strong>${startFormatted}</strong>
          </div>
          <div class="mp-modal-info-row">
            <span>Retorno previsto:</span>
            <strong>${returnFormatted}</strong>
          </div>
          <div class="mp-modal-info-row">
            <span>Duração total:</span>
            <strong>${durationLabel}</strong>
          </div>
          <div class="mp-modal-info-row">
            <span>Tempo realizado:</span>
            <strong style="color:var(--good)">${elapsed} dia(s) realizado(s)</strong>
          </div>
          <div class="mp-modal-info-row">
            <span>Tempo restante:</span>
            <strong>${remaining > 0 ? remaining + ' dia(s)' : 'Data prevista alcançada'}</strong>
          </div>
        </div>

        ${p.notes ? `
          <div style="margin-bottom:20px">
            <small style="color:var(--muted);text-transform:uppercase;font-size:11px;font-weight:600">Observação pessoal</small>
            <div class="mp-summary-notes" style="margin-top:6px">“${escapeHTML(p.notes)}”</div>
          </div>
        ` : ''}

        <div class="mp-modal-actions">
          <button type="button" class="secondary" id="mpDetailsEndBtn">Encerrar pausa</button>
          <button type="button" class="secondary" id="mpDetailsSettingsBtn">Ir para Configurações</button>
          <button type="button" class="primary" id="mpDetailsCloseBtn">Fechar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('mpDetailsCloseBtn')?.addEventListener('click', () => {
      overlay.remove();
    });

    document.getElementById('mpDetailsSettingsBtn')?.addEventListener('click', () => {
      overlay.remove();
      if (typeof window.go === 'function') {
        window.go('settings');
        setTimeout(() => {
          document.getElementById('marketPauseSettingsCard')?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    });

    document.getElementById('mpDetailsEndBtn')?.addEventListener('click', () => {
      overlay.remove();
      openEndModal();
    });
  }

  function openEditDatesModal() {
    closeAnyModal();
    const p = state.active;
    if (!p) return;

    const overlay = document.createElement('div');
    overlay.className = 'market-pause-modal-overlay';
    overlay.id = 'marketPauseActiveModalOverlay';

    overlay.innerHTML = `
      <div class="market-pause-modal" role="dialog" aria-modal="true">
        <span class="mp-modal-kicker">Ajuste de Previsão</span>
        <h2 class="mp-modal-title">Ajustar Previsão de Retorno</h2>
        <p class="mp-modal-lead">
          Se necessário, você pode estender ou antecipar a data prevista sem perder o histórico.
        </p>

        <div class="mp-form-field" style="margin-bottom:16px">
          <label for="mpEditReturnDate">Nova data prevista de retorno</label>
          <input type="date" id="mpEditReturnDate" value="${p.expectedReturnDate}" min="${p.startDate}" required>
        </div>

        <div class="mp-form-field" style="margin-bottom:20px">
          <label for="mpEditNotes">Observação pessoal</label>
          <textarea id="mpEditNotes" rows="3">${escapeHTML(p.notes || '')}</textarea>
        </div>

        <div class="mp-modal-actions">
          <button type="button" class="secondary" id="mpEditCancelBtn">Cancelar</button>
          <button type="button" class="primary" id="mpEditSaveBtn">Salvar Alterações</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('mpEditCancelBtn')?.addEventListener('click', () => overlay.remove());

    document.getElementById('mpEditSaveBtn')?.addEventListener('click', async () => {
      const newReturnDate = document.getElementById('mpEditReturnDate')?.value;
      const newNotes = document.getElementById('mpEditNotes')?.value;
      try {
        await activate({
          reason: p.reason,
          startDate: p.startDate,
          expectedReturnDate: newReturnDate,
          notes: newNotes
        });
        overlay.remove();
      } catch (err) {
        notify(err.message || 'Erro ao atualizar.');
      }
    });
  }

  function closeAnyModal() {
    document.getElementById('marketPauseActiveModalOverlay')?.remove();
  }

  function renderAll() {
    renderBanner();
    renderSettingsCard();
  }

  // ---------------------------------------------------------------------------
  // Interceptions: Navigation & Trade Registration
  // ---------------------------------------------------------------------------
  function attachInterceptors() {
    // 1. Intercept window.go('newtrade')
    const originalGo = window.go;
    if (typeof originalGo === 'function') {
      window.go = function (page, ...args) {
        if (page === 'newtrade' && isActive()) {
          showTradeAttemptModal(() => {
            originalGo.call(this, page, ...args);
          });
          return;
        }
        const res = originalGo.call(this, page, ...args);
        if (page === 'settings') {
          setTimeout(renderSettingsCard, 50);
        }
        return res;
      };
    }

    // 2. Intercept saveTradePlan / confirmTradeExecution in case user is already in newtrade
    const oldSavePlan = window.saveTradePlan;
    if (typeof oldSavePlan === 'function') {
      window.saveTradePlan = function (...args) {
        if (isActive()) {
          showTradeAttemptModal();
          return Promise.resolve(false);
        }
        return oldSavePlan.apply(this, args);
      };
    }

    const oldConfirmExec = window.confirmTradeExecution;
    if (typeof oldConfirmExec === 'function') {
      window.confirmTradeExecution = function (...args) {
        if (isActive()) {
          showTradeAttemptModal();
          return Promise.resolve(false);
        }
        return oldConfirmExec.apply(this, args);
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle Initialization
  // ---------------------------------------------------------------------------
  window.addEventListener('DOMContentLoaded', () => {
    attachInterceptors();
    load();
  });

  window.addEventListener('healthyTrend:authenticated', () => {
    load();
  });

  window.addEventListener('healthyTrend:workspaceLoaded', () => {
    load();
  });

  // Re-render settings if layout / language changes
  const oldApplyLanguage = window.applyLanguage;
  if (typeof oldApplyLanguage === 'function') {
    window.applyLanguage = function (...args) {
      const res = oldApplyLanguage.apply(this, args);
      setTimeout(renderAll, 100);
      return res;
    };
  }

  // Public API
  window.MarketPause = {
    load,
    activate,
    endPause,
    isActive,
    getActive,
    getHistory,
    renderBanner,
    renderSettingsCard,
    showLoginModal,
    showTradeAttemptModal,
    openEndModal,
    openDetails,
    openEditDatesModal,
    handleActivateFromForm
  };
})();
