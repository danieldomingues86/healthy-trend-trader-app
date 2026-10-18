/**
 * HEALTHY TREND TRADER - FOCUS GUARDIAN CONTROLLER (Guardião do Foco)
 * 
 * Manages platform usage monitoring, behavioral threshold evaluation,
 * sound alerts, intervention modal, and widget rendering on Meu Desktop.
 */

(function(root) {
  'use strict';

  const Model = root.FocusGuardianModel;

  let currentConfig = null;
  let currentState = {
    monitor: null,
    sessions: [],
    lastAcknowledgedAt: null,
    evalResult: null,
    alertHistory: []
  };

  let isInitialized = false;
  let refreshTimer = null;

  function safeEsc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  function getConfig() {
    if (currentConfig) return currentConfig;
    try {
      const stored = localStorage.getItem(Model.STORAGE_KEY_CONFIG);
      if (stored) {
        currentConfig = { ...Model.DEFAULT_CONFIG, ...JSON.parse(stored) };
        return currentConfig;
      }
    } catch (_) {}
    currentConfig = { ...Model.DEFAULT_CONFIG };
    return currentConfig;
  }

  function saveConfig(nextConfig) {
    currentConfig = { ...Model.DEFAULT_CONFIG, ...nextConfig };
    try {
      localStorage.setItem(Model.STORAGE_KEY_CONFIG, JSON.stringify(currentConfig));
    } catch (_) {}
    evaluateAndNotify();
  }

  function loadSavedState() {
    try {
      const stored = localStorage.getItem(Model.STORAGE_KEY_STATE);
      if (stored) {
        const parsed = JSON.parse(stored);
        currentState.lastAcknowledgedAt = parsed.lastAcknowledgedAt || null;
        currentState.alertHistory = Array.isArray(parsed.alertHistory) ? parsed.alertHistory : [];
      }
    } catch (_) {}
  }

  function saveState() {
    try {
      localStorage.setItem(Model.STORAGE_KEY_STATE, JSON.stringify({
        lastAcknowledgedAt: currentState.lastAcknowledgedAt,
        alertHistory: (currentState.alertHistory || []).slice(0, 50)
      }));
    } catch (_) {}
  }

  /**
   * Plays a gentle, harmonic Web Audio chime alert.
   * Gracefully ignores autoplay restrictions without errors.
   */
  function playAlertChime(customVolume = null) {
    const config = getConfig();
    if (!config.soundEnabled && customVolume === null) return;
    const volume = customVolume !== null ? Number(customVolume) : (config.soundVolume ?? 0.5);

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, now); // A5

      const targetVol = Math.max(0.01, Math.min(1, volume)) * 0.25;
      gainNode.gain.setValueAtTime(targetVol, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    } catch (err) {
      console.warn('[FocusGuardian] Audio playback not available or blocked by browser:', err.message);
    }
  }

  /**
   * Evaluates the current state and triggers modal if critical threshold is reached.
   */
  function evaluateAndNotify() {
    const config = getConfig();
    const evalResult = Model.evaluateFocusState({
      monitor: currentState.monitor,
      sessions: currentState.sessions,
      config,
      lastAcknowledgedAt: currentState.lastAcknowledgedAt,
      now: Date.now()
    });

    currentState.evalResult = evalResult;

    // Trigger intervention modal if needed
    if (evalResult.shouldShowModal) {
      showInterventionModal(evalResult);
    }

    // Refresh widget if visible
    if (typeof window.renderTodayCockpit === 'function' && document.getElementById('today')?.classList.contains('active')) {
      const widgetEl = document.querySelector('[data-focus-guardian-root]');
      if (widgetEl) {
        widgetEl.innerHTML = renderWidgetContent(evalResult);
      }
    }
  }

  /**
   * Fetches fresh sessions and monitor state from backend.
   */
  async function refreshData() {
    if (!window.healthyTrendApi?.isAuthenticated()) {
      currentState.monitor = null;
      currentState.sessions = [];
      evaluateAndNotify();
      return;
    }

    try {
      const [sessionsRes, monitorRes] = await Promise.allSettled([
        window.healthyTrendApi.request('/api/platform-access/sessions?days=7'),
        window.healthyTrendApi.request('/api/platform-access/monitor')
      ]);

      if (sessionsRes.status === 'fulfilled' && sessionsRes.value?.sessions) {
        currentState.sessions = sessionsRes.value.sessions;
      }
      if (monitorRes.status === 'fulfilled' && monitorRes.value?.monitor) {
        currentState.monitor = monitorRes.value.monitor;
      }

      evaluateAndNotify();
    } catch (error) {
      console.warn('[FocusGuardian] Erro ao sincronizar dados do monitor:', error);
    }
  }

  /**
   * Acknowledges an active critical alert.
   */
  function acknowledgeAlert(actionKind = 'plan') {
    currentState.lastAcknowledgedAt = Date.now();
    const event = {
      at: new Date().toISOString(),
      action: actionKind,
      openings: currentState.evalResult?.openingsCount || 0,
      duration: currentState.evalResult?.totalDurationSeconds || 0,
      triggers: currentState.evalResult?.triggers || []
    };
    currentState.alertHistory.unshift(event);
    saveState();
    closeInterventionModal();

    if (actionKind === 'pause') {
      if (typeof window.go === 'function') {
        window.go('zen');
      }
    }
  }

  /**
   * Injects and displays the intervention modal in the DOM.
   */
  function showInterventionModal(evalResult) {
    if (evalResult?.isWeekend || Model?.isWeekend?.(Date.now())) {
      return;
    }

    let backdrop = document.getElementById('focusGuardianModalBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'focusGuardianModalBackdrop';
      backdrop.className = 'focus-guardian-backdrop';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.setAttribute('aria-labelledby', 'focusGuardianModalTitle');
      document.body.appendChild(backdrop);
    }

    const triggerReason = evalResult.triggers?.[0] || 'Limite de atenção atingido';
    const soundActive = getConfig().soundEnabled;

    backdrop.innerHTML = `
      <div class="focus-guardian-modal" id="focusGuardianModal">
        <header class="focus-guardian-modal-header">
          <div>
            <span class="focus-guardian-modal-eyebrow">🛡️ Intervenção Comportamental</span>
            <h2 id="focusGuardianModalTitle">Guardião do Foco</h2>
          </div>
          <button type="button" class="focus-guardian-modal-close" aria-label="Fechar alerta" onclick="FocusGuardianController.acknowledgeAlert('close')">×</button>
        </header>

        <h3 class="focus-guardian-question">“Você está operando ou apenas procurando oportunidades?”</h3>
        <p class="focus-guardian-lead">O mercado não precisa da sua atenção o tempo todo. Seu capital precisa que você tome decisões de qualidade.</p>

        <div class="focus-guardian-modal-data">
          <div class="metric-block">
            <small>Aberturas Hoje</small>
            <b>${safeEsc(evalResult.openingsCount)}</b>
          </div>
          <div class="metric-block">
            <small>Tempo de Tela Hoje</small>
            <b>${safeEsc(evalResult.totalDurationFormatted)}</b>
          </div>
          <div class="focus-guardian-modal-reason">
            ⚠️ Motivo: ${safeEsc(triggerReason)}
          </div>
        </div>

        <div class="focus-guardian-reflections">
          <strong>Perguntas de reflexão antes da próxima ação:</strong>
          <ul>
            <li>Tenho um setup válido segundo meu plano operacional?</li>
            <li>Estou buscando uma oportunidade ou tentando satisfazer a vontade de operar?</li>
            <li>Minha próxima decisão respeita rigorosamente meu gerenciamento de risco?</li>
          </ul>
        </div>

        <div class="focus-guardian-modal-actions">
          <button type="button" class="focus-guardian-btn-primary" onclick="FocusGuardianController.acknowledgeAlert('plan')">
            ✓ Reconhecer e seguir meu plano
          </button>
          <button type="button" class="focus-guardian-btn-secondary" onclick="FocusGuardianController.acknowledgeAlert('pause')">
            ☕ Vou fazer uma pausa (Trader Zen)
          </button>
        </div>
      </div>
    `;

    backdrop.style.display = 'grid';

    // Play chime sound
    if (soundActive) {
      playAlertChime();
    }
  }

  function closeInterventionModal() {
    const backdrop = document.getElementById('focusGuardianModalBackdrop');
    if (backdrop) {
      backdrop.style.display = 'none';
    }
  }

  /**
   * Opens settings modal to configure limits, cooldown, and audio.
   */
  function openSettingsModal() {
    let backdrop = document.getElementById('focusGuardianSettingsBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'focusGuardianSettingsBackdrop';
      backdrop.className = 'focus-guardian-backdrop';
      document.body.appendChild(backdrop);
    }

    const cfg = getConfig();

    backdrop.innerHTML = `
      <div class="focus-guardian-modal focus-guardian-settings-modal">
        <header class="focus-guardian-modal-header">
          <div>
            <span class="focus-guardian-modal-eyebrow">Preferências</span>
            <h2>Limites do Guardião do Foco</h2>
          </div>
          <button type="button" class="focus-guardian-modal-close" onclick="FocusGuardianController.closeSettingsModal()">×</button>
        </header>

        <form id="focusGuardianConfigForm" onsubmit="event.preventDefault(); FocusGuardianController.handleSaveSettings(event);">
          <div class="focus-guardian-settings-grid">
            <div class="focus-guardian-setting-row">
              <label for="cfgMaxOpeningsWarning">Aberturas para Atenção (Amarelo):</label>
              <input type="number" id="cfgMaxOpeningsWarning" min="1" max="50" value="${cfg.maxOpeningsWarning}">
            </div>

            <div class="focus-guardian-setting-row">
              <label for="cfgMaxOpeningsCritical">Aberturas para Limite Crítico (Vermelho):</label>
              <input type="number" id="cfgMaxOpeningsCritical" min="2" max="100" value="${cfg.maxOpeningsCritical}">
            </div>

            <div class="focus-guardian-setting-row">
              <label for="cfgMaxDurationWarningMinutes">Tempo de tela para Atenção (minutos):</label>
              <input type="number" id="cfgMaxDurationWarningMinutes" min="10" max="720" step="10" value="${cfg.maxDurationWarningMinutes}">
            </div>

            <div class="focus-guardian-setting-row">
              <label for="cfgMaxDurationCriticalMinutes">Tempo de tela para Crítico (minutos):</label>
              <input type="number" id="cfgMaxDurationCriticalMinutes" min="20" max="960" step="10" value="${cfg.maxDurationCriticalMinutes}">
            </div>

            <div class="focus-guardian-setting-row">
              <label for="cfgCooldownMinutes">Intervalo entre alertas / Cooldown (minutos):</label>
              <input type="number" id="cfgCooldownMinutes" min="5" max="180" step="5" value="${cfg.cooldownMinutes}">
            </div>

            <div class="focus-guardian-sound-row">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="cfgSoundEnabled" ${cfg.soundEnabled ? 'checked' : ''}>
                <span>Alerta sonoro suave</span>
              </label>
              <button type="button" class="focus-guardian-cfg-btn" onclick="FocusGuardianController.testChime()">♫ Testar som</button>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; gap:10px; margin-top:20px;">
            <button type="button" class="focus-guardian-btn-secondary" onclick="FocusGuardianController.resetDefaultSettings()">
              Restaurar padrões
            </button>
            <button type="submit" class="focus-guardian-btn-primary" style="flex:1;">
              Salvar preferências
            </button>
          </div>
        </form>
      </div>
    `;

    backdrop.style.display = 'grid';
  }

  function closeSettingsModal() {
    const backdrop = document.getElementById('focusGuardianSettingsBackdrop');
    if (backdrop) {
      backdrop.style.display = 'none';
    }
  }

  function handleSaveSettings(event) {
    const form = event.target;
    const next = {
      maxOpeningsWarning: Number(form.querySelector('#cfgMaxOpeningsWarning').value) || 6,
      maxOpeningsCritical: Number(form.querySelector('#cfgMaxOpeningsCritical').value) || 10,
      maxDurationWarningMinutes: Number(form.querySelector('#cfgMaxDurationWarningMinutes').value) || 120,
      maxDurationCriticalMinutes: Number(form.querySelector('#cfgMaxDurationCriticalMinutes').value) || 240,
      cooldownMinutes: Number(form.querySelector('#cfgCooldownMinutes').value) || 30,
      soundEnabled: form.querySelector('#cfgSoundEnabled').checked
    };
    saveConfig(next);
    closeSettingsModal();
    if (typeof window.showToast === 'function') {
      window.showToast('Configurações do Guardião do Foco salvas com sucesso.');
    }
  }

  function resetDefaultSettings() {
    saveConfig(Model.DEFAULT_CONFIG);
    closeSettingsModal();
    if (typeof window.showToast === 'function') {
      window.showToast('Configurações restauradas para os padrões recomendados.');
    }
  }

  /**
   * Helper rendering the inner HTML of the widget card.
   */
  function renderWidgetContent(evalResult) {
    const res = evalResult || Model.evaluateFocusState({
      monitor: currentState.monitor,
      sessions: currentState.sessions,
      config: getConfig()
    });

    const badgeClass = res.badgeClass || 'neutral';
    const statusLabel = res.label || 'Uso Consciente';
    const message = res.message || 'Monitorando atividade do Profit Trader.';

    return `
      <div class="focus-guardian-widget">
        <div class="focus-guardian-header">
          <span class="focus-guardian-badge ${badgeClass}">
            <span class="badge-dot" aria-hidden="true"></span>
            ${safeEsc(statusLabel)}
          </span>
          <button type="button" class="focus-guardian-cfg-btn" title="Configurar limites de foco" onclick="FocusGuardianController.openSettingsModal()">
            ⚙ Limites
          </button>
        </div>

        <div class="focus-guardian-kpis" onclick="go('platformaccess')" style="cursor: pointer;" title="Abrir Uso da Plataforma">
          <div class="focus-guardian-kpi">
            <small>Aberturas hoje</small>
            <b>${safeEsc(res.openingsCount)}</b>
          </div>
          <div class="focus-guardian-kpi">
            <small>Tempo de tela hoje</small>
            <b>${safeEsc(res.totalDurationFormatted)}</b>
          </div>
        </div>

        <p class="focus-guardian-message ${badgeClass}">
          ${safeEsc(message)}
        </p>
      </div>
    `;
  }

  /**
   * Main entry point called by Desktop layout to render the widget.
   */
  function renderWidget() {
    const content = renderWidgetContent(currentState.evalResult);
    return `<div data-focus-guardian-root>${content}</div>`;
  }

  function init() {
    if (isInitialized) return;
    loadSavedState();
    refreshData();

    // Auto-refresh periodically (every 30s)
    refreshTimer = setInterval(refreshData, 30000);

    // Listen to platform access updates
    window.addEventListener('healthyTrend:accessUpdated', refreshData);
    window.addEventListener('healthyTrend:authenticated', refreshData);

    isInitialized = true;
  }

  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  const FocusGuardianController = {
    init,
    getConfig,
    saveConfig,
    getState: () => currentState,
    refreshData,
    evaluateAndNotify,
    acknowledgeAlert,
    showInterventionModal,
    closeInterventionModal,
    openSettingsModal,
    closeSettingsModal,
    handleSaveSettings,
    resetDefaultSettings,
    renderWidget,
    renderWidgetContent,
    testChime: () => playAlertChime(1.0),
    _setMockDataForTesting: (mock) => {
      currentState = { ...currentState, ...mock };
    }
  };

  root.FocusGuardianController = FocusGuardianController;

})(typeof window !== 'undefined' ? window : globalThis);
