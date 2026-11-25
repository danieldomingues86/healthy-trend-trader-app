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
    marketOpenTime: '10:00',         // Abertura oficial padrão B3
    marketCloseTime: '17:55',        // Fechamento oficial padrão B3
    soundEnabled: false,             // Som permanentemente desativado (experiência 100% visual)
    soundVolume: 0
  });

  const STORAGE_KEY_CONFIG = 'healthy-trend-focus-guardian-config-v1';
  const STORAGE_KEY_STATE = 'healthy-trend-focus-guardian-state-v1';
  const STORAGE_KEY_MARKET_FOCUS = 'healthy-trend-market-focus-v1';

  const _b3HolidayCache = new Map();

  function formatUTCDateISO(dateObj) {
    const y = dateObj.getUTCFullYear();
    const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Anonymous Gregorian Easter Sunday algorithm (Meeus/Jones/Butcher).
   */
  function computeEasterDateUTC(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }

  /**
   * Returns B3 non-trading holidays (fixed national, movable Carnaval/Good Friday/Corpus Christi,
   * Consciência Negra, Dec 24, Dec 31 and last banking business day of December) plus Ash Wednesday date.
   */
  function getB3CalendarForYear(year) {
    const y = Number(year);
    if (!Number.isInteger(y) || y < 1900 || y > 2200) {
      return { holidays: new Set(), ashWednesday: null };
    }
    if (_b3HolidayCache.has(y)) return _b3HolidayCache.get(y);

    const holidays = new Set([
      `${y}-01-01`, // Confraternização Universal
      `${y}-04-21`, // Tiradentes
      `${y}-05-01`, // Dia do Trabalho
      `${y}-09-07`, // Independência do Brasil
      `${y}-10-12`, // Nossa Senhora Aparecida
      `${y}-11-02`, // Finados
      `${y}-11-15`, // Proclamação da República
      `${y}-12-24`, // Véspera de Natal (B3 fechada)
      `${y}-12-25`, // Natal
      `${y}-12-31`  // Véspera de Ano Novo (B3 fechada)
    ]);

    if (y >= 2024 || y <= 2021) {
      holidays.add(`${y}-11-20`); // Dia Nacional de Zumbi e da Consciência Negra
    }
    if (y <= 2021) {
      holidays.add(`${y}-01-25`);
      holidays.add(`${y}-07-09`);
    }

    const dec31 = new Date(Date.UTC(y, 11, 31, 12, 0, 0));
    const dec31Dow = dec31.getUTCDay();
    if (dec31Dow === 6) holidays.add(`${y}-12-30`);
    else if (dec31Dow === 0) holidays.add(`${y}-12-29`);

    const easter = computeEasterDateUTC(y);
    const addOffset = (days) => formatUTCDateISO(new Date(easter.getTime() + days * 86400000));
    holidays.add(addOffset(-48)); // Segunda-feira de Carnaval
    holidays.add(addOffset(-47)); // Terça-feira de Carnaval
    holidays.add(addOffset(-2));  // Sexta-feira Santa
    holidays.add(addOffset(60));  // Corpus Christi
    const ashWednesday = addOffset(-46); // Quarta-feira de Cinzas (pregão reduzido a partir das 13:00)

    const entry = { holidays, ashWednesday };
    _b3HolidayCache.set(y, entry);
    return entry;
  }

  function getSaoPauloDateTimeParts(dateVal = Date.now()) {
    const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
    if (Number.isNaN(d.getTime())) return null;
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).formatToParts(d);
      const get = (type) => parts.find(p => p.type === type)?.value || '';
      const year = Number(get('year'));
      const month = get('month');
      const day = get('day');
      const hour = Number(get('hour')) % 24;
      const minute = Number(get('minute'));
      const second = Number(get('second'));
      const wk = get('weekday').toLowerCase();
      const isWeekendDay = wk.startsWith('sat') || wk.startsWith('sun');
      return {
        dateKey: `${year}-${month}-${day}`,
        year,
        hour,
        minute,
        second,
        minutesOfDay: hour * 60 + minute,
        secondsOfDay: hour * 3600 + minute * 60 + second,
        isWeekend: isWeekendDay
      };
    } catch (_) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hour = d.getHours();
      const minute = d.getMinutes();
      const second = d.getSeconds();
      const dow = d.getDay();
      return {
        dateKey: `${year}-${month}-${day}`,
        year,
        hour,
        minute,
        second,
        minutesOfDay: hour * 60 + minute,
        secondsOfDay: hour * 3600 + minute * 60 + second,
        isWeekend: dow === 0 || dow === 6
      };
    }
  }

  function parseTimeMinutes(hhmm, fallbackMinutes) {
    if (!hhmm || typeof hhmm !== 'string') return fallbackMinutes;
    const [h, m] = hhmm.trim().split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return fallbackMinutes;
    return Math.max(0, Math.min(24 * 60, h * 60 + m));
  }

  /**
   * Checks whether a given date (or timestamp) is a valid B3 trading day
   * (excludes Saturdays, Sundays, fixed national holidays, movable holidays, and B3 closures).
   */
  function isB3TradingDay(dateVal = Date.now()) {
    if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
      const d = new Date(`${dateVal.trim()}T12:00:00Z`);
      if (Number.isNaN(d.getTime())) return false;
      const dow = d.getUTCDay();
      if (dow === 0 || dow === 6) return false;
      const cal = getB3CalendarForYear(d.getUTCFullYear());
      return !cal.holidays.has(dateVal.trim());
    }
    const sp = getSaoPauloDateTimeParts(dateVal);
    if (!sp || sp.isWeekend) return false;
    const cal = getB3CalendarForYear(sp.year);
    return !cal.holidays.has(sp.dateKey);
  }

  /**
   * Evaluates the official B3 market open/closed state at a given timestamp,
   * honoring weekends, B3 national/movable holidays, Ash Wednesday special opening (13:00),
   * and user-configured session hours (start/end).
   */
  function getMarketStatus(dateVal = Date.now(), marketConfig = {}) {
    const sp = getSaoPauloDateTimeParts(dateVal);
    if (!sp) {
      return { isOpen: false, reason: 'invalid_date', label: 'Mercado Fechado', isWeekend: false, isHoliday: false };
    }

    if (marketConfig && typeof marketConfig.isOpen === 'boolean') {
      return {
        isOpen: marketConfig.isOpen,
        reason: marketConfig.isOpen ? 'open_override' : 'closed_override',
        label: marketConfig.isOpen ? 'Mercado Aberto' : 'Mercado Fechado',
        isWeekend: sp.isWeekend,
        isHoliday: false,
        dateKey: sp.dateKey
      };
    }

    const cal = getB3CalendarForYear(sp.year);
    const isHoliday = cal.holidays.has(sp.dateKey);
    const isAshWednesday = cal.ashWednesday === sp.dateKey;
    const daysRule = marketConfig?.days || 'weekdays';

    if (daysRule === 'weekdays' && sp.isWeekend) {
      return {
        isOpen: false,
        reason: 'weekend',
        label: 'Fim de Semana · Mercado Fechado',
        isWeekend: true,
        isHoliday: false,
        dateKey: sp.dateKey
      };
    }

    if (isHoliday) {
      return {
        isOpen: false,
        reason: 'holiday',
        label: 'Feriado B3 · Mercado Fechado',
        isWeekend: sp.isWeekend,
        isHoliday: true,
        dateKey: sp.dateKey
      };
    }

    const cfgStart = parseTimeMinutes(marketConfig?.start || marketConfig?.marketOpenTime || DEFAULT_CONFIG.marketOpenTime, 10 * 60);
    const cfgEnd = parseTimeMinutes(marketConfig?.end || marketConfig?.marketCloseTime || DEFAULT_CONFIG.marketCloseTime, 17 * 60 + 55);
    const effectiveStart = isAshWednesday ? Math.max(cfgStart, 13 * 60) : cfgStart;
    const effectiveEnd = cfgEnd;

    const withinHours = effectiveStart <= effectiveEnd
      ? (sp.minutesOfDay >= effectiveStart && sp.minutesOfDay <= effectiveEnd)
      : (sp.minutesOfDay >= effectiveStart || sp.minutesOfDay <= effectiveEnd);

    if (!withinHours) {
      return {
        isOpen: false,
        reason: sp.minutesOfDay < effectiveStart ? 'before_open' : 'after_close',
        label: 'Fora do Horário de Pregão · Mercado Fechado',
        isWeekend: false,
        isHoliday: false,
        isAshWednesday,
        dateKey: sp.dateKey,
        startMinutes: effectiveStart,
        endMinutes: effectiveEnd
      };
    }

    return {
      isOpen: true,
      reason: 'trading_session',
      label: 'Mercado Aberto',
      isWeekend: false,
      isHoliday: false,
      isAshWednesday,
      dateKey: sp.dateKey,
      startMinutes: effectiveStart,
      endMinutes: effectiveEnd
    };
  }

  function isMarketOpen(dateVal = Date.now(), marketConfig = {}) {
    return getMarketStatus(dateVal, marketConfig).isOpen;
  }

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
    marketConfig = null,
    lastAcknowledgedAt = null,
    now = Date.now()
  } = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config, soundEnabled: false, soundVolume: 0 };
    const todayKey = getTodayKey(now);
    const effectiveMarketCfg = marketConfig || {
      start: cfg.marketOpenTime || DEFAULT_CONFIG.marketOpenTime,
      end: cfg.marketCloseTime || DEFAULT_CONFIG.marketCloseTime,
      days: cfg.days || 'weekdays',
      ...(typeof cfg.isMarketOpen === 'boolean' ? { isOpen: cfg.isMarketOpen } : {})
    };
    const marketStatus = getMarketStatus(now, effectiveMarketCfg);

    // Filter sessions belonging to today (São Paulo time) and exclude sessions explicitly flagged as closed-market
    const todaySessions = (Array.isArray(sessions) ? sessions : []).filter(s => {
      if (!s || !s.openedAt) return false;
      if (s.marketOpen === false || s.duringMarketHours === false) return false;
      return getTodayKey(s.openedAt) === todayKey;
    });

    // When market is closed, do NOT count closed-market usage as operational screen time
    const openingsCount = marketStatus.isOpen ? todaySessions.length : 0;
    const totalDurationSeconds = marketStatus.isOpen
      ? todaySessions.reduce((acc, s) => acc + (Number(s.durationSeconds) || 0), 0)
      : 0;
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
        openingsCount: todaySessions.length,
        totalDurationSeconds: todaySessions.reduce((acc, s) => acc + (Number(s.durationSeconds) || 0), 0),
        totalDurationFormatted: formatDuration(todaySessions.reduce((acc, s) => acc + (Number(s.durationSeconds) || 0), 0)),
        isMonitorActive: false,
        isProfitRunning: false,
        isWeekend: weekend,
        isHoliday: marketStatus.isHoliday,
        isMarketOpen: marketStatus.isOpen,
        marketStatus,
        triggers: ['Monitor local desligado'],
        message: weekend
          ? 'Fim de semana · Mercado fechado. Monitor local desativado.'
          : !marketStatus.isOpen
            ? `${marketStatus.label}. Monitor local desativado.`
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
        openingsCount: 0,
        totalDurationSeconds: 0,
        totalDurationFormatted: '0min',
        isMonitorActive: true,
        isProfitRunning,
        isWeekend: true,
        isHoliday: false,
        isMarketOpen: false,
        marketStatus,
        triggers: [],
        message: 'Fim de semana · Mercado fechado. Plataforma liberada para estudos e preparação sem alarmes de foco.',
        shouldShowModal: false,
        inCooldown: false,
        cooldownRemainingMinutes: 0,
        config: cfg
      };
    }

    // 3. Feriado B3 ou fora do horário oficial do pregão: mercado fechado, zero modal, zero intervenção, zero contagem operacional
    if (!marketStatus.isOpen) {
      const closedLabel = marketStatus.isHoliday ? 'Feriado · Estudo Livre' : 'Mercado Fechado';
      const closedMsg = marketStatus.isHoliday
        ? 'Feriado na B3 · Mercado fechado. Uso livre para estudos e revisão sem intervenções.'
        : 'Mercado fechado fora do horário de pregão. O Guardião do Foco atua exclusivamente com o mercado aberto.';
      return {
        status: 'market_closed',
        level: 'good',
        badgeClass: 'good',
        label: closedLabel,
        color: '#10b981',
        openingsCount: 0,
        totalDurationSeconds: 0,
        totalDurationFormatted: '0min',
        isMonitorActive: true,
        isProfitRunning,
        isWeekend: false,
        isHoliday: Boolean(marketStatus.isHoliday),
        isMarketOpen: false,
        marketStatus,
        triggers: [],
        message: closedMsg,
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
      isWeekend: false,
      isHoliday: false,
      isMarketOpen: true,
      marketStatus,
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
    STORAGE_KEY_MARKET_FOCUS,
    formatDuration,
    getTodayKey,
    isWeekend,
    isB3TradingDay,
    getB3CalendarForYear,
    getMarketStatus,
    isMarketOpen,
    detectRapidOpenings,
    evaluateFocusState
  };
}));
