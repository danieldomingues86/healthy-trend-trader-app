/**
 * HEALTHY TREND TRADER - FOCUS GUARDIAN MODEL (Guardião do Foco)
 * 
 * Behavioral monitoring and intervention model for platform usage awareness.
 * Evaluates session frequency, accumulated screen time, rapid reopening bursts,
 * and determines visual states (green/yellow/red) and modal trigger cooldowns.
 */

(function(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.FocusGuardianModel = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const DEFAULT_CONFIG = Object.freeze({
    maxOpeningsWarning: 6,           // Amarelo a partir de 6 aberturas
    maxOpeningsCritical: 10,         // Vermelho/crítico a partir de 10 aberturas
    maxDurationWarningMinutes: 120,  // Amarelo a partir de 2h
    maxDurationCriticalMinutes: 240, // Vermelho a partir de 4h
    rapidOpeningsCount: 3,           // 3 aberturas
    rapidOpeningsWindowMinutes: 15,  // em menos de 15 minutos
    cooldownMinutes: 30,             // Intervalo mínimo entre alertas do modal
    soundEnabled: true,              // Som do alerta ativado
    soundVolume: 0.5                 // Volume padrão (0.0 a 1.0)
  });

  const STORAGE_KEY_CONFIG = 'healthy-trend-focus-guardian-config-v1';
  const STORAGE_KEY_STATE = 'healthy-trend-focus-guardian-state-v1';

  /**
   * Formats duration in seconds to human-readable pt-BR string (e.g. "2h 15min" or "45min").
   * 
   * @param {number} seconds
   * @returns {string}
   */
  function formatDuration(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${String(minutes).padStart(2, '0')}min`;
    }
    return `${minutes}min`;
  }

  /**
   * Checks whether a date falls on a weekend (Saturday or Sunday) in São Paulo time.
   * On weekends, the market is closed and platform usage is free for study without alarms.
   * 
   * @param {Date|string|number} [date]
   * @returns {boolean}
   */
  function isWeekend(date) {
    try {
      const d = date ? new Date(date) : new Date();
      const str = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        weekday: 'short'
      }).format(d).toLowerCase();
      return str.startsWith('sat') || str.startsWith('sun');
    } catch (_) {
      const d = date ? new Date(date) : new Date();
      const day = d.getDay();
      return day === 0 || day === 6;
    }
  }

  /**
   * Generates a date key for São Paulo timezone (YYYY-MM-DD).
   * 
   * @param {Date|string|number} [date]
   * @returns {string}
   */
  function getTodayKey(date) {
    try {
      const d = date ? new Date(date) : new Date();
      return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(d);
    } catch (_) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  /**
   * Detects if rapid reopening burst occurred.
   * 
   * @param {Array<{ openedAt: string|Date }>} sessions
   * @param {number} count Threshold count of openings
   * @param {number} windowMinutes Window in minutes
   * @returns {boolean}
   */
  function detectRapidOpenings(sessions, count = 3, windowMinutes = 15) {
    if (!Array.isArray(sessions) || sessions.length < count) return false;
    const timestamps = sessions
      .map(s => new Date(s.openedAt).getTime())
      .filter(t => Number.isFinite(t))
      .sort((a, b) => a - b);

    const windowMs = windowMinutes * 60 * 1000;
    for (let i = 0; i <= timestamps.length - count; i++) {
      const diff = timestamps[i + count - 1] - timestamps[i];
      if (diff <= windowMs) {
        return true;
      }
    }
    return false;
  }

  /**
   * Evaluates the focus state based on current monitor status and sessions.
   * 
   * @param {Object} params
   * @param {Object} [params.monitor] Monitor status { active: boolean, profitRunning: boolean }
   * @param {Array<Object>} [params.sessions] List of session objects from /api/platform-access/sessions
   * @param {Object} [params.config] Custom configuration overrides
   * @param {number|null} [params.lastAcknowledgedAt] Timestamp of last modal acknowledgement
   * @param {number} [params.now] Current timestamp
   * @returns {Object} Evaluated focus state
   */
  function evaluateFocusState({
    monitor = null,
    sessions = [],
    config = {},
    lastAcknowledgedAt = null,
    now = Date.now()
  } = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const todayKey = getTodayKey(now);

    // Filter sessions belonging to today (São Paulo time)
    const todaySessions = (Array.isArray(sessions) ? sessions : []).filter(s => {
      if (!s || !s.openedAt) return false;
      return getTodayKey(s.openedAt) === todayKey;
    });

    const openingsCount = todaySessions.length;
    const totalDurationSeconds = todaySessions.reduce((acc, s) => acc + (Number(s.durationSeconds) || 0), 0);
    const totalDurationMinutes = Math.floor(totalDurationSeconds / 60);

    // 1. Check if monitor is inactive or offline
    const isMonitorActive = Boolean(monitor && monitor.active);
    const isProfitRunning = Boolean(monitor && monitor.profitRunning);
    const weekend = isWeekend(now);

    if (!isMonitorActive) {
      return {
        status: 'inactive',
        level: 'inactive',
        badgeClass: 'neutral',
        label: 'Monitor Desligado',
        color: '#64748b',
        openingsCount,
        totalDurationSeconds,
        totalDurationFormatted: formatDuration(totalDurationSeconds),
        isMonitorActive: false,
        isProfitRunning: false,
        isWeekend: weekend,
        triggers: ['Monitor local desligado'],
        message: weekend
          ? 'Fim de semana · Mercado fechado. Monitor local desativado.'
          : 'O monitor local do Profit Trader está desativado.',
        shouldShowModal: false,
        inCooldown: false,
        cooldownRemainingMinutes: 0
      };
    }

    // 2. Fim de semana (Sábado ou Domingo): mercado fechado, uso livre para estudos sem alarmes
    if (weekend) {
      return {
        status: 'weekend',
        level: 'good',
        badgeClass: 'good',
        label: 'Estudo Livre',
        color: '#10b981',
        openingsCount,
        totalDurationSeconds,
        totalDurationFormatted: formatDuration(totalDurationSeconds),
        isMonitorActive: true,
        isProfitRunning,
        isWeekend: true,
        triggers: [],
        message: 'Fim de semana · Mercado fechado. Plataforma liberada para estudos e preparação sem alarmes de foco.',
        shouldShowModal: false,
        inCooldown: false,
        cooldownRemainingMinutes: 0,
        config: cfg
      };
    }

    // 3. Monitor is active, check if waiting for profit and no sessions yet
    if (openingsCount === 0) {
      return {
        status: 'waiting',
        level: 'waiting',
        badgeClass: isProfitRunning ? 'good' : 'neutral',
        label: isProfitRunning ? 'Profit Conectado' : 'Aguardando Profit',
        color: isProfitRunning ? '#10b981' : '#0284c7',
        openingsCount: 0,
        totalDurationSeconds: 0,
        totalDurationFormatted: '0min',
        isMonitorActive: true,
        isProfitRunning,
        triggers: [],
        message: isProfitRunning
          ? 'Profit Trader em execução. Nenhum excesso detectado.'
          : 'Monitor ativo; aguardando o Profit Trader iniciar.',
        shouldShowModal: false,
        inCooldown: false,
        cooldownRemainingMinutes: 0
      };
    }

    // 3. We have active monitoring and sessions today: Evaluate thresholds
    const rapidBurst = detectRapidOpenings(todaySessions, cfg.rapidOpeningsCount, cfg.rapidOpeningsWindowMinutes);
    const criticalTriggers = [];
    const warningTriggers = [];

    if (openingsCount >= cfg.maxOpeningsCritical) {
      criticalTriggers.push(`Limite crítico de ${cfg.maxOpeningsCritical} aberturas atingido (${openingsCount} hoje)`);
    } else if (openingsCount >= cfg.maxOpeningsWarning) {
      warningTriggers.push(`Alerta de ${openingsCount} aberturas no dia`);
    }

    if (totalDurationMinutes >= cfg.maxDurationCriticalMinutes) {
      criticalTriggers.push(`Tempo crítico de tela excedido (${formatDuration(totalDurationSeconds)})`);
    } else if (totalDurationMinutes >= cfg.maxDurationWarningMinutes) {
      warningTriggers.push(`Tempo de tela elevado (${formatDuration(totalDurationSeconds)})`);
    }

    if (rapidBurst) {
      criticalTriggers.push(`Frequência impulsiva: ${cfg.rapidOpeningsCount}+ aberturas em menos de ${cfg.rapidOpeningsWindowMinutes} min`);
    }

    let level = 'good';
    let label = 'Uso Consciente';
    let badgeClass = 'good';
    let color = '#10b981';
    let message = 'Uso equilibrado dentro dos limites operacionais do seu plano.';
    let triggers = [];

    if (criticalTriggers.length > 0) {
      level = 'critical';
      label = 'Atenção Crítica';
      badgeClass = 'critical';
      color = '#ef4444';
      triggers = criticalTriggers;
      message = criticalTriggers[0];
    } else if (warningTriggers.length > 0) {
      level = 'warning';
      label = 'Atenção ao Foco';
      badgeClass = 'warning';
      color = '#f59e0b';
      triggers = warningTriggers;
      message = warningTriggers[0];
    }

    // Cooldown evaluation for critical intervention modal
    let shouldShowModal = false;
    let inCooldown = false;
    let cooldownRemainingMinutes = 0;

    if (level === 'critical') {
      const cooldownMs = cfg.cooldownMinutes * 60 * 1000;
      if (lastAcknowledgedAt && Number.isFinite(lastAcknowledgedAt)) {
        const elapsed = now - lastAcknowledgedAt;
        if (elapsed < cooldownMs) {
          inCooldown = true;
          cooldownRemainingMinutes = Math.max(1, Math.ceil((cooldownMs - elapsed) / 60000));
        } else {
          shouldShowModal = true;
        }
      } else {
        shouldShowModal = true;
      }
    }

    return {
      status: 'active',
      level,
      badgeClass,
      label,
      color,
      openingsCount,
      totalDurationSeconds,
      totalDurationFormatted: formatDuration(totalDurationSeconds),
      isMonitorActive: true,
      isProfitRunning,
      triggers,
      message,
      shouldShowModal,
      inCooldown,
      cooldownRemainingMinutes,
      config: cfg
    };
  }

  return {
    DEFAULT_CONFIG,
    STORAGE_KEY_CONFIG,
    STORAGE_KEY_STATE,
    formatDuration,
    getTodayKey,
    isWeekend,
    detectRapidOpenings,
    evaluateFocusState
  };
}));
