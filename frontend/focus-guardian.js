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
        currentConfig = { ...Model.DEFAULT_CONFIG, ...JSON.parse(stored), soundEnabled: false, soundVolume: 0 };
        return currentConfig;
      }
    } catch (_) {}
    currentConfig = { ...Model.DEFAULT_CONFIG, soundEnabled: false, soundVolume: 0 };
    return currentConfig;
  }

  function saveConfig(nextConfig) {
    currentConfig = { ...Model.DEFAULT_CONFIG, ...nextConfig, soundEnabled: false, soundVolume: 0 };
    try {
      localStorage.setItem(Model.STORAGE_KEY_CONFIG, JSON.stringify(currentConfig));
    } catch (_) {}
    evaluateAndNotify();
  }

  function resolveActiveMarketConfig() {
    const cfg = getConfig();
    let marketFocus = null;
    try {
      if (root.marketFocusConfig && typeof root.marketFocusConfig === 'object') {
        marketFocus = root.marketFocusConfig;
      } else {
        const raw = (root.healthyTrendWorkspace?.raw && root.healthyTrendWorkspace.raw(Model.STORAGE_KEY_MARKET_FOCUS || 'healthy-trend-market-focus-v1'))
          || (typeof localStorage !== 'undefined' ? localStorage.getItem(Model.STORAGE_KEY_MARKET_FOCUS || 'healthy-trend-market-focus-v1') : null);
        if (raw) {
          marketFocus = typeof raw === 'string' ? JSON.parse(raw) : raw;
        }
      }
    } catch (_) {}

    return {
      start: marketFocus?.start || cfg.marketOpenTime || Model.DEFAULT_CONFIG.marketOpenTime || '10:00',
      end: marketFocus?.end || cfg.marketCloseTime || Model.DEFAULT_CONFIG.marketCloseTime || '17:55',
      days: marketFocus?.days || 'weekdays',
      ...(typeof cfg.isMarketOpen === 'boolean' ? { isOpen: cfg.isMarketOpen } : {})
    };
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
   * Evaluates the current state and triggers modal ONLY when market is OPEN and critical threshold is reached.
   * Purely visual experience — zero audio or sound effects.
   */
  function evaluateAndNotify() {
    const config = getConfig();
    const marketConfig = resolveActiveMarketConfig();
    const nowTs = currentState.nowOverride || Date.now();
    const evalResult = Model.evaluateFocusState({
      monitor: currentState.monitor,
      sessions: currentState.sessions,
      config,
      marketConfig,
      lastAcknowledgedAt: currentState.lastAcknowledgedAt,
      now: nowTs
    });

    currentState.evalResult = evalResult;

    // Never show modal or keep pending modal open when market is closed
    if (!evalResult.isMarketOpen) {
      closeInterventionModal();
    } else if (evalResult.shouldShowModal) {
      showInterventionModal(evalResult);
    }

    // Refresh widget if visible
    if (typeof window !== 'undefined' && typeof window.renderTodayCockpit === 'function' && document.getElementById('today')?.classList.contains('active')) {
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
   * Injects and displays the cinematic Spartan Focus Guardian intervention modal in the DOM.
   * Strictly blocked whenever the market is closed (weekends, B3 holidays, or outside trading hours).
   * Purely visual experience — zero sound or audio calls.
   */
  function showInterventionModal(evalResult) {
    const nowTs = currentState.nowOverride || Date.now();
    const marketConfig = resolveActiveMarketConfig();
    const marketOpen = evalResult && typeof evalResult.isMarketOpen === 'boolean'
      ? evalResult.isMarketOpen
      : (Model?.isMarketOpen ? Model.isMarketOpen(nowTs, marketConfig) : !Model?.isWeekend?.(nowTs));

    if (!marketOpen || evalResult?.isWeekend || evalResult?.isHoliday) {
      closeInterventionModal();
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

    const triggerReason = evalResult?.triggers?.[0] || 'Frequência impulsiva: 3+ aberturas em menos de 15 min';

    backdrop.innerHTML = `
      <div class="focus-guardian-modal focus-guardian-cinematic" id="focusGuardianModal">
        <button type="button" class="focus-guardian-modal-close" aria-label="Fechar alerta" onclick="FocusGuardianController.acknowledgeAlert('close')">✕</button>

        <div class="focus-guardian-split-layout">
          <div class="focus-guardian-content-col">
            <header class="focus-guardian-modal-header">
              <div class="focus-guardian-title-block">
                <span class="focus-guardian-modal-eyebrow">
                  <svg class="fg-shield-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2L4 5.5V11.5C4 16.8 7.4 21.6 12 23C16.6 21.6 20 16.8 20 11.5V5.5L12 2Z" stroke="currentColor" stroke-width="1.8" fill="rgba(218,176,84,0.14)"/>
                    <path d="M12 7.2L13.3 9.9L16.2 10.3L14.1 12.3L14.6 15.2L12 13.8L9.4 15.2L9.9 12.3L7.8 10.3L10.7 9.9L12 7.2Z" fill="currentColor"/>
                  </svg>
                  INTERVENÇÃO COMPORTAMENTAL
                </span>
                <h2 id="focusGuardianModalTitle">GUARDIÃO DO FOCO</h2>
                <div class="focus-guardian-title-flare" aria-hidden="true"></div>
              </div>
            </header>

            <h3 class="focus-guardian-question">
              “Você está <strong>operando</strong> ou apenas <span class="fg-gold-accent">procurando oportunidades?</span>”
            </h3>
            <p class="focus-guardian-lead">
              O mercado não precisa da sua atenção o tempo todo. Seu capital precisa que você tome decisões de qualidade.
            </p>

            <div class="focus-guardian-modal-data">
              <div class="metric-block">
                <span class="metric-icon" aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="13" width="3.5" height="7" rx="1" fill="currentColor" opacity="0.65"/>
                    <rect x="10.25" y="9" width="3.5" height="11" rx="1" fill="currentColor" opacity="0.85"/>
                    <rect x="16.5" y="4" width="3.5" height="16" rx="1" fill="currentColor"/>
                  </svg>
                </span>
                <div class="metric-copy">
                  <small>Aberturas Hoje</small>
                  <b>${safeEsc(evalResult?.openingsCount ?? 0)}</b>
                </div>
              </div>
              <div class="metric-block">
                <span class="metric-icon" aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.9"/>
                    <path d="M12 7.5V12L15 13.8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
                <div class="metric-copy">
                  <small>Tempo de Tela Hoje</small>
                  <b>${safeEsc(evalResult?.totalDurationFormatted || '0min')}</b>
                </div>
              </div>
              <div class="focus-guardian-modal-reason">
                <span class="reason-warn-icon" aria-hidden="true">⚠️</span>
                <span><strong>Motivo:</strong> ${safeEsc(triggerReason)}</span>
              </div>
            </div>

            <div class="focus-guardian-reflections">
              <div class="focus-guardian-reflections-head">
                <span class="reflections-brain-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M9.5 4C7.6 4 6 5.5 6 7.4C6 7.7 6.05 8 6.12 8.28C4.88 8.78 4 10 4 11.4C4 12.9 4.95 14.16 6.28 14.6C6.1 15.05 6 15.54 6 16.05C6 18.23 7.77 20 9.95 20H11V4H9.5Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
                    <path d="M14.5 4C16.4 4 18 5.5 18 7.4C18 7.7 17.95 8 17.88 8.28C19.12 8.78 20 10 20 11.4C20 12.9 19.05 14.16 17.72 14.6C17.9 15.05 18 15.54 18 16.05C18 18.23 16.23 20 14.05 20H13V4H14.5Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
                  </svg>
                </span>
                <strong>Perguntas de reflexão antes da próxima ação:</strong>
              </div>
              <ul>
                <li>Tenho um setup válido segundo meu plano operacional?</li>
                <li>Estou buscando uma oportunidade ou tentando satisfazer a vontade de operar?</li>
                <li>Minha próxima decisão respeita rigorosamente meu gerenciamento de risco?</li>
              </ul>
            </div>

            <div class="focus-guardian-modal-actions">
              <button type="button" class="focus-guardian-btn-primary" onclick="FocusGuardianController.acknowledgeAlert('plan')">
                <span class="btn-icon" aria-hidden="true">✓</span>
                <span>Reconhecer e seguir meu plano</span>
              </button>
              <button type="button" class="focus-guardian-btn-secondary" onclick="FocusGuardianController.acknowledgeAlert('pause')">
                <span class="btn-icon" aria-hidden="true">☕</span>
                <span>Vou fazer uma pausa (Trader Zen)</span>
              </button>
            </div>
          </div>

          <div class="focus-guardian-art-col" aria-hidden="true">
            <div class="focus-guardian-art-glow"></div>
          </div>
        </div>
      </div>
    `;

    backdrop.style.display = 'grid';
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
      soundEnabled: false,
      soundVolume: 0
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
      config: getConfig(),
      marketConfig: resolveActiveMarketConfig(),
      now: currentState.nowOverride || Date.now()
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
    if (refreshTimer && typeof refreshTimer.unref === 'function') {
      refreshTimer.unref();
    }

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
    resolveActiveMarketConfig,
    testChime: () => {},
    _setMockDataForTesting: (mock) => {
      currentState = { ...currentState, ...mock };
    }
  };

  root.FocusGuardianController = FocusGuardianController;

})(typeof window !== 'undefined' ? window : globalThis);
