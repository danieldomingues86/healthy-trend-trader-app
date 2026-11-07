/**
 * STORM ALERT MODEL — Healthy Trend Trader
 * Modelo de domínio para o widget de alerta de Eventos Extremos no Dashboard.
 * 
 * Filosofia:
 * "O trader precisa entender que não existe obrigação de estar posicionado o tempo inteiro.
 *  O mercado estará lá amanhã. Seu capital precisa estar também.
 *  Não seja herói diante de uma tempestade. Proteja seu patrimônio e espere a poeira baixar."
 * 
 * Suporta três estados operacionais:
 * - ESTADO 1: ATENÇÃO (Evento extremo no radar, preparação para zeragem)
 * - ESTADO 2: AÇÃO NECESSÁRIA (Prazo limite de zeragem iminente/atingido e posições ainda abertas)
 * - ESTADO 3: PROTEÇÃO CONCLUÍDA (Posições 100% zeradas antes do evento extremo)
 * - ESTADO 0: INATIVO / DISCRETO (Sem evento relevante no horizonte)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StormAlertModel = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Feriados Nacionais B3 mais comuns (formato MM-DD ou AAAA-MM-DD)
  const FIXED_B3_HOLIDAYS_MM_DD = new Set([
    '01-01', // Confraternização Universal
    '04-21', // Tiradentes
    '05-01', // Dia do Trabalho
    '09-07', // Independência do Brasil
    '10-12', // Nossa Senhora Aparecida
    '11-02', // Finados
    '11-15', // Proclamação da República
    '11-20', // Dia da Consciência Negra
    '12-25'  // Natal
  ]);

  // Feriados móveis conhecidos recentes (Carnaval, Sexta-feira Santa, Corpus Christi)
  const MOBILE_B3_HOLIDAYS_YMD = new Set([
    // 2022
    '2022-02-28', '2022-03-01', '2022-04-15', '2022-06-16',
    // 2025
    '2025-03-03', '2025-03-04', '2025-04-18', '2025-06-19',
    // 2026
    '2026-02-16', '2026-02-17', '2026-04-03', '2026-06-04'
  ]);

  const WEEKDAY_NAMES_PT = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado'
  ];

  /**
   * Verifica se uma data é dia útil de negociação da B3.
   */
  function isB3TradingDay(dateStr) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const d = new Date(dateStr + 'T12:00:00Z');
    if (isNaN(d.getTime())) return false;
    const dayOfWeek = d.getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return false; // Fim de semana
    const mmDd = dateStr.slice(5, 10);
    if (FIXED_B3_HOLIDAYS_MM_DD.has(mmDd)) return false;
    if (MOBILE_B3_HOLIDAYS_YMD.has(dateStr)) return false;
    return true;
  }

  /**
   * Ajusta uma data para o pregão de negociação mais próximo na direção desejada.
   * direction: -1 para anterior (passado), +1 para posterior (futuro)
   */
  function snapToB3TradingDay(dateStr, direction = -1) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    let curr = new Date(dateStr + 'T12:00:00Z');
    let attempts = 0;
    while (attempts < 30) {
      const iso = curr.toISOString().slice(0, 10);
      if (isB3TradingDay(iso)) return iso;
      curr = new Date(curr.getTime() + (direction >= 0 ? 1 : -1) * 86400000);
      attempts++;
    }
    return dateStr;
  }

  /**
   * Adiciona ou subtrai N pregões de negociação a partir de uma data de pregão.
   */
  function addTradingDays(dateStr, offsetTradingDays = 0) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    if (offsetTradingDays === 0) return snapToB3TradingDay(dateStr, -1);
    const step = offsetTradingDays > 0 ? 1 : -1;
    let remaining = Math.abs(offsetTradingDays);
    let curr = new Date(dateStr + 'T12:00:00Z');
    let attempts = 0;
    while (remaining > 0 && attempts < 120) {
      curr = new Date(curr.getTime() + step * 86400000);
      const iso = curr.toISOString().slice(0, 10);
      if (isB3TradingDay(iso)) {
        remaining--;
      }
      attempts++;
    }
    return curr.toISOString().slice(0, 10);
  }

  /**
   * Conta quantos pregões úteis existem entre duas datas (inclusive data final, exclusive data inicial).
   */
  function countTradingDaysBetween(startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr) return 0;
    if (startDateStr >= endDateStr) return 0;
    let count = 0;
    let curr = new Date(startDateStr + 'T12:00:00Z');
    const end = new Date(endDateStr + 'T12:00:00Z');
    while (curr < end) {
      curr = new Date(curr.getTime() + 86400000);
      const iso = curr.toISOString().slice(0, 10);
      if (isB3TradingDay(iso)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Formata data para exibição com dia da semana amigável (ex.: "Domingo — 01/11" ou "Domingo — 04/10/2026").
   */
  function formatDateWithWeekdayBR(dateStr, includeYear = false) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || '—';
    const d = new Date(dateStr + 'T12:00:00Z');
    if (isNaN(d.getTime())) return dateStr;
    const weekday = WEEKDAY_NAMES_PT[d.getUTCDay()] || '';
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    const dateFormatted = includeYear ? `${day}/${month}/${year}` : `${day}/${month}`;
    return `${weekday} — ${dateFormatted}`;
  }

  /**
   * Formata a sessão de cutoff para exibição (ex.: "Sexta-feira — fechamento").
   */
  function formatCutoffSessionBR(cutoffDateStr) {
    if (!cutoffDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(cutoffDateStr)) return 'Fechamento do pregão anterior';
    const d = new Date(cutoffDateStr + 'T12:00:00Z');
    if (isNaN(d.getTime())) return 'Fechamento do pregão anterior';
    const weekday = WEEKDAY_NAMES_PT[d.getUTCDay()] || '';
    return `${weekday} — fechamento`;
  }

  /**
   * Calendário padrão de eventos extremos de referência.
   * É unificado com TradeSimulatorModel caso este esteja presente no ambiente.
   */
  const DEFAULT_EXTREME_EVENTS = [
    {
      id: 'evt-br-presidential-2026-r1',
      name: 'Eleições presidenciais',
      fullName: 'Eleições Presidenciais do Brasil 2026 — 1º Turno',
      category: 'PRESIDENTIAL_ELECTION_1ST_ROUND',
      categoryLabel: 'Eleições Presidenciais',
      eventDate: '2026-10-04',
      riskStartDate: '2026-10-04',
      riskEndDate: '2026-10-04',
      defaultAdvanceSessions: 1
    },
    {
      id: 'evt-br-presidential-2026-r2',
      name: 'Eleições presidenciais — 2º Turno',
      fullName: 'Eleições Presidenciais do Brasil 2026 — 2º Turno',
      category: 'PRESIDENTIAL_ELECTION_2ND_ROUND',
      categoryLabel: 'Segundo Turno Eleitoral',
      eventDate: '2026-10-25',
      riskStartDate: '2026-10-25',
      riskEndDate: '2026-10-25',
      defaultAdvanceSessions: 1
    },
    {
      id: 'evt-copom-extraordinary-2026-11',
      name: 'Decisão Extraordinária de Política Monetária (COPOM)',
      fullName: 'Decisão Extraordinária de Política Monetária (COPOM / Selic)',
      category: 'EXTRAORDINARY_MONETARY_POLICY',
      categoryLabel: 'Política Monetária Extraordinária',
      eventDate: '2026-11-18',
      riskStartDate: '2026-11-18',
      riskEndDate: '2026-11-18',
      defaultAdvanceSessions: 1
    },
    {
      id: 'evt-sample-election-demo',
      name: 'Eleições presidenciais',
      fullName: 'Eleições Presidenciais (Simulação de Proteção Patrimonial)',
      category: 'PRESIDENTIAL_ELECTION_1ST_ROUND',
      categoryLabel: 'Eleições Presidenciais',
      eventDate: '2026-11-08',
      riskStartDate: '2026-11-08',
      riskEndDate: '2026-11-08',
      defaultAdvanceSessions: 1
    }
  ];

  let _customStormEvents = [];
  let _testMode = 'AUTO';

  function initStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('healthyTrend_customExtremeEvents');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            _customStormEvents = parsed;
          }
        }
        const savedMode = localStorage.getItem('healthyTrend_stormAlertTestMode');
        if (savedMode) {
          _testMode = savedMode;
        }
      } catch (_) {}
    }
  }
  initStorage();

  function saveCustomEventsToStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('healthyTrend_customExtremeEvents', JSON.stringify(_customStormEvents));
      } catch (_) {}
    }
  }

  function getTestMode() {
    return _testMode;
  }

  function setTestMode(mode) {
    const validModes = ['AUTO', 'ACTION_REQUIRED', 'WARNING', 'PROTECTED', 'INACTIVE'];
    _testMode = validModes.includes(mode) ? mode : 'AUTO';
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('healthyTrend_stormAlertTestMode', _testMode);
      } catch (_) {}
    }
    return _testMode;
  }

  function removeCustomEvent(eventId) {
    if (!eventId) return false;
    const beforeLen = _customStormEvents.length;
    _customStormEvents = _customStormEvents.filter(e => e.id !== eventId);
    saveCustomEventsToStorage();
    return _customStormEvents.length < beforeLen;
  }

  function getActiveCalendar() {
    let baseEvents = DEFAULT_EXTREME_EVENTS;
    if (typeof globalThis !== 'undefined' && globalThis.TradeSimulatorModel && typeof globalThis.TradeSimulatorModel.getExtremeEventsCalendar === 'function') {
      try {
        const simCal = globalThis.TradeSimulatorModel.getExtremeEventsCalendar();
        if (Array.isArray(simCal) && simCal.length > 0) {
          baseEvents = simCal;
        }
      } catch (err) {
        // Fallback para o calendário embutido
      }
    }

    const mergedMap = new Map();
    baseEvents.forEach(e => {
      if (e && e.id) mergedMap.set(e.id, { ...e });
    });
    _customStormEvents.forEach(e => {
      if (e && e.id) mergedMap.set(e.id, { ...e });
    });

    return Array.from(mergedMap.values()).sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''));
  }

  function registerCustomEvent(eventInput) {
    if (!eventInput || !eventInput.eventDate) return null;
    const evt = {
      id: eventInput.id || `evt-custom-${eventInput.eventDate}-${Math.random().toString(36).slice(2, 7)}`,
      name: String(eventInput.name || 'Evento Extremo').trim(),
      fullName: String(eventInput.fullName || eventInput.name || 'Evento Extremo').trim(),
      category: eventInput.category || 'OTHER_EXTREME_RISK',
      categoryLabel: eventInput.categoryLabel || 'Risco Extremo',
      eventDate: String(eventInput.eventDate).slice(0, 10),
      riskStartDate: String(eventInput.riskStartDate || eventInput.eventDate).slice(0, 10),
      riskEndDate: String(eventInput.riskEndDate || eventInput.riskStartDate || eventInput.eventDate).slice(0, 10),
      defaultAdvanceSessions: Math.max(1, Number(eventInput.defaultAdvanceSessions || 1))
    };

    const idx = _customStormEvents.findIndex(e => e.id === evt.id);
    if (idx >= 0) _customStormEvents[idx] = evt;
    else _customStormEvents.push(evt);

    // Sincroniza com TradeSimulatorModel se estiver disponível
    if (typeof globalThis !== 'undefined' && globalThis.TradeSimulatorModel && typeof globalThis.TradeSimulatorModel.registerExtremeEvent === 'function') {
      try {
        globalThis.TradeSimulatorModel.registerExtremeEvent(evt);
      } catch (e) {
        // Ignora caso de duplicação
      }
    }

    return evt;
  }

  function clearCustomEvents() {
    _customStormEvents = [];
  }

  /**
   * Calcula o pregão de cutoff obrigatório para um evento.
   * Se o evento é domingo 04/10/2026, com advanceSessions = 1:
   * Último pregão anterior é sexta-feira 02/10/2026.
   */
  function resolveCutoffSession(event, advanceSessions = 1) {
    if (!event || !event.eventDate) return null;
    const firstRiskDate = event.riskStartDate || event.eventDate;
    const advance = Math.max(1, Math.round(Number(advanceSessions) || event.defaultAdvanceSessions || 1));

    // Dia anterior ao início do risco do evento
    const dayBeforeEvent = new Date(new Date(firstRiskDate + 'T12:00:00Z').getTime() - 86400000).toISOString().slice(0, 10);
    const lastSessionBefore = snapToB3TradingDay(dayBeforeEvent, -1);

    const cutoffDate = advance > 1
      ? addTradingDays(lastSessionBefore, -(advance - 1))
      : lastSessionBefore;

    return {
      cutoffDate,
      advanceSessions: advance,
      firstRiskDate,
      riskEndDate: event.riskEndDate || firstRiskDate
    };
  }

  /**
   * Avalia a contagem de posições abertas reais disponíveis no ambiente.
   */
  function resolveOpenPositionsCount(overrideCount = null) {
    if (overrideCount != null && Number.isFinite(Number(overrideCount))) {
      return Math.max(0, Math.round(Number(overrideCount)));
    }

    if (typeof window !== 'undefined') {
      if (Array.isArray(window.positionsState?.positions)) {
        const count = window.positionsState.positions.filter(p => !p.closed && p.status !== 'CLOSED').length;
        return count;
      }
      if (Array.isArray(window.operationalState?.positions)) {
        const count = window.operationalState.positions.filter(p => p.mode === 'real').length;
        return count;
      }
      if (Array.isArray(window.healthyTrendPositions)) {
        const count = window.healthyTrendPositions.filter(p => p.status === 'open').length;
        return count;
      }
      if (window.wealthState?.trades && Array.isArray(window.wealthState.trades)) {
        const count = window.wealthState.trades.filter(t => t.status === 'open' && t.metadata?.mode !== 'paper').length;
        return count;
      }
    }

    // Default de demonstração do mock operacional caso nenhum estado de posições esteja injetado
    return 8;
  }

  /**
   * MOTOR PRINCIPAL DE AVALIAÇÃO DO STORM ALERT
   * Avalia o status do alerta para uma data de referência e parâmetros fornecidos.
   */
  function evaluateStormAlertStatus(options = {}) {
    const currentMode = options.testMode || getTestMode();
    if (currentMode && currentMode !== 'AUTO') {
      if (currentMode === 'ACTION_REQUIRED') {
        const count = options.openPositionsCount != null ? Number(options.openPositionsCount) : 8;
        return {
          hasActiveAlert: true,
          testMode: 'ACTION_REQUIRED',
          state: 'ACTION_REQUIRED',
          stateLabel: 'AÇÃO NECESSÁRIA',
          riskLevel: 'RISCO EXTREMO',
          openPositionsCount: count,
          isProtected: false,
          headline: 'TEMPESTADE À VISTA.',
          primaryMessage: 'ZERE SUAS POSIÇÕES. PROTEJA SEU CAPITAL.',
          complementaryMessage: 'Um evento extremo está se aproximando. Permanecer posicionado pode expor seu patrimônio a gaps de abertura, volatilidade extraordinária e perdas que seus stops talvez não consigam evitar.',
          impactQuote: 'PROTEGER SEU CAPITAL É MAIS IMPORTANTE DO QUE GANHAR DINHEIRO.',
          subWarning: 'Não ignore este alerta.',
          event: {
            id: 'evt-test-eleicoes-2026',
            name: 'Eleições presidenciais',
            fullName: 'Eleições Presidenciais 2026 (1º Turno)',
            category: 'ELECTION',
            categoryLabel: 'Eleições e Política',
            eventDate: '2026-10-04',
            eventDateFormatted: 'Domingo — 04/10',
            cutoffDate: '2026-10-02',
            cutoffFormatted: 'Sexta-feira — fechamento',
            daysRemaining: 1,
            sessionsRemaining: 1,
            isPastCutoff: false,
            isInRiskPeriod: false
          }
        };
      }
      if (currentMode === 'WARNING') {
        const count = options.openPositionsCount != null ? Number(options.openPositionsCount) : 6;
        return {
          hasActiveAlert: true,
          testMode: 'WARNING',
          state: 'WARNING',
          stateLabel: 'ATENÇÃO — EVENTO NO RADAR',
          riskLevel: 'ALERTA PREVENTIVO',
          openPositionsCount: count,
          isProtected: false,
          headline: 'TEMPESTADE NO RADAR.',
          primaryMessage: 'PLANEJE SUA SAÍDA. REDUZA A EXPOSIÇÃO.',
          complementaryMessage: 'Um evento extremo relevante se aproxima nos próximos pregões. Inicie a redução gradativa ou planeje o encerramento ordenado das suas operações antes do prazo limite.',
          impactQuote: 'PROTEGER SEU CAPITAL É MAIS IMPORTANTE DO QUE GANHAR DINHEIRO.',
          subWarning: 'Planejamento antecipado evita liquidações forçadas a mercado.',
          event: {
            id: 'evt-test-copom',
            name: 'Reunião Extraordinária do COPOM',
            fullName: 'Reunião Extraordinária do COPOM',
            category: 'MONETARY_POLICY',
            categoryLabel: 'Política Monetária',
            eventDate: '2026-11-20',
            eventDateFormatted: 'Sexta-feira — 20/11',
            cutoffDate: '2026-11-19',
            cutoffFormatted: 'Quinta-feira — fechamento',
            daysRemaining: 13,
            sessionsRemaining: 9,
            isPastCutoff: false,
            isInRiskPeriod: false
          }
        };
      }
      if (currentMode === 'PROTECTED') {
        return {
          hasActiveAlert: true,
          testMode: 'PROTECTED',
          state: 'PROTECTED',
          stateLabel: 'PROTEÇÃO CONCLUÍDA',
          riskLevel: 'PATRIMÔNIO PROTEGIDO',
          openPositionsCount: 0,
          isProtected: true,
          headline: 'PATRIMÔNIO PROTEGIDO.',
          primaryMessage: 'VOCÊ ESTÁ 100% FORA DE RISCO.',
          complementaryMessage: 'Todas as suas posições foram encerradas com sucesso antes do evento. Seu capital está preservado em caixa e imune à volatilidade e aos gaps do mercado durante este período.',
          impactQuote: 'PROTEGER SEU CAPITAL É MAIS IMPORTANTE DO QUE GANHAR DINHEIRO.',
          subWarning: 'Aguarde a reabertura do mercado e a normalização da volatilidade.',
          event: {
            id: 'evt-test-eleicoes-2026',
            name: 'Eleições presidenciais',
            fullName: 'Eleições Presidenciais 2026 (1º Turno)',
            category: 'ELECTION',
            categoryLabel: 'Eleições e Política',
            eventDate: '2026-10-04',
            eventDateFormatted: 'Domingo — 04/10',
            cutoffDate: '2026-10-02',
            cutoffFormatted: 'Sexta-feira — fechamento',
            daysRemaining: 1,
            sessionsRemaining: 1,
            isPastCutoff: false,
            isInRiskPeriod: false
          }
        };
      }
      if (currentMode === 'INACTIVE') {
        return {
          hasActiveAlert: false,
          testMode: 'INACTIVE',
          state: 'INACTIVE',
          stateLabel: 'SEM EVENTO',
          riskLevel: 'NORMAL',
          event: null,
          openPositionsCount: 0,
          isProtected: true,
          headline: '',
          primaryMessage: '',
          complementaryMessage: '',
          impactQuote: 'PROTEGER SEU CAPITAL É MAIS IMPORTANTE DO QUE GANHAR DINHEIRO.',
          subWarning: ''
        };
      }
    }

    const referenceDate = options.referenceDate
      ? String(options.referenceDate).slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const advanceSessions = options.advanceSessions != null
      ? Math.max(1, Math.round(Number(options.advanceSessions)))
      : 1;

    const calendar = Array.isArray(options.calendar) && options.calendar.length > 0
      ? options.calendar
      : getActiveCalendar();

    const horizonDays = options.horizonDays != null
      ? Math.max(1, Number(options.horizonDays))
      : 45; // Janela máxima no radar (45 dias)

    const openCount = resolveOpenPositionsCount(options.openPositionsCount);

    // Procura o evento relevante mais próximo (em curso ou futuro dentro da janela)
    let candidateEvent = null;
    let candidateCutoff = null;
    let minDiffMs = Infinity;

    for (const evt of calendar) {
      if (!evt || !evt.eventDate) continue;
      const cutoff = resolveCutoffSession(evt, advanceSessions);
      if (!cutoff) continue;

      const evtTime = new Date(evt.eventDate + 'T12:00:00Z').getTime();
      const refTime = new Date(referenceDate + 'T12:00:00Z').getTime();
      const cutoffTime = new Date(cutoff.cutoffDate + 'T12:00:00Z').getTime();
      const riskEndTime = new Date(cutoff.riskEndDate + 'T12:00:00Z').getTime();

      // O evento é elegível se:
      // a) A data de referência ainda não ultrapassou o fim do risco do evento
      // b) E a data do evento está dentro do horizonte (dias futuros <= horizonDays)
      //    ou a data de referência já está na janela entre o cutoff e o fim do evento.
      const daysUntilEvent = Math.round((evtTime - refTime) / 86400000);

      const isCurrentOrUpcoming = referenceDate <= cutoff.riskEndDate;
      const isWithinHorizon = daysUntilEvent >= -1 && daysUntilEvent <= horizonDays;

      if (isCurrentOrUpcoming && isWithinHorizon) {
        // Prioriza o evento mais iminente
        const diff = Math.abs(refTime - cutoffTime);
        if (diff < minDiffMs || !candidateEvent) {
          minDiffMs = diff;
          candidateEvent = evt;
          candidateCutoff = cutoff;
        }
      }
    }

    // Se nenhum evento foi encontrado no horizonte, retorna estado inativo
    if (!candidateEvent || !candidateCutoff) {
      return {
        hasActiveAlert: false,
        state: 'INACTIVE',
        stateLabel: 'SEM EVENTO',
        riskLevel: 'NORMAL',
        event: null,
        openPositionsCount: openCount,
        isProtected: openCount === 0,
        headline: '',
        primaryMessage: '',
        complementaryMessage: '',
        impactQuote: 'PROTEGER SEU CAPITAL É MAIS IMPORTANTE DO QUE GANHAR DINHEIRO.',
        subWarning: ''
      };
    }

    const refTime = new Date(referenceDate + 'T12:00:00Z').getTime();
    const evtTime = new Date(candidateEvent.eventDate + 'T12:00:00Z').getTime();
    const cutoffTime = new Date(candidateCutoff.cutoffDate + 'T12:00:00Z').getTime();
    const riskStartTime = new Date(candidateCutoff.firstRiskDate + 'T12:00:00Z').getTime();
    const riskEndTime = new Date(candidateCutoff.riskEndDate + 'T12:00:00Z').getTime();

    const daysRemaining = Math.max(0, Math.round((evtTime - refTime) / 86400000));
    const sessionsRemaining = countTradingDaysBetween(referenceDate, candidateCutoff.cutoffDate);
    const isPastCutoff = referenceDate > candidateCutoff.cutoffDate;
    const isInRiskPeriod = referenceDate >= candidateCutoff.firstRiskDate && referenceDate <= candidateCutoff.riskEndDate;
    const isProtected = openCount === 0;

    // Resolução dos 3 Estados Canônicos:
    // ESTADO 3: PROTEÇÃO CONCLUÍDA — se o trader já zerou 100% das posições
    // ESTADO 2: AÇÃO NECESSÁRIA — se ainda há posições abertas E o prazo de zeragem está próximo (sessionsRemaining <= 2 ou já no dia/passado cutoff)
    // ESTADO 1: ATENÇÃO — se há posições abertas, mas ainda restam mais de 2 pregões até o prazo de zeragem (fase de preparação)
    let state = 'ACTION_REQUIRED';
    let stateLabel = 'AÇÃO NECESSÁRIA';
    let riskLevel = 'RISCO EXTREMO';
    let headline = 'TEMPESTADE À VISTA.';
    let primaryMessage = 'ZERE SUAS POSIÇÕES. PROTEJA SEU CAPITAL.';
    let complementaryMessage = 'Um evento extremo está se aproximando. Permanecer posicionado pode expor seu patrimônio a gaps, volatilidade extraordinária e perdas que seus stops talvez não consigam evitar.';
    let impactQuote = 'PROTEGER SEU CAPITAL É MAIS IMPORTANTE DO QUE GANHAR DINHEIRO.';
    let subWarning = 'Não ignore este alerta.';

    if (isProtected) {
      state = 'PROTECTED';
      stateLabel = 'PROTEÇÃO CONCLUÍDA';
      riskLevel = 'PATRIMÔNIO PROTEGIDO';
      headline = 'PATRIMÔNIO PROTEGIDO.';
      primaryMessage = 'VOCÊ FEZ SUA PARTE.';
      complementaryMessage = 'Todas as operações foram encerradas conforme a regra de proteção. Seu capital está blindado contra gaps de abertura, perda de efetividade dos stops e volatilidade extraordinária.';
      impactQuote = 'O MERCADO ESTARÁ LÁ AMANHÃ. SEU CAPITAL PRECISA ESTAR TAMBÉM.';
      subWarning = 'Operações zeradas. Aguarde o encerramento do evento para novo planejamento.';
    } else if (sessionsRemaining > 2 && !isPastCutoff && !isInRiskPeriod) {
      state = 'WARNING';
      stateLabel = 'ATENÇÃO';
      riskLevel = 'RISCO ELEVADO';
      headline = 'TEMPESTADE NO RADAR.';
      primaryMessage = 'PREPARE-SE PARA ZERAR SUAS POSIÇÕES.';
      complementaryMessage = 'Existe um evento extremo agendado nos próximos dias. Monitore o calendário e organize o encerramento de todas as posições abertas antes do prazo limite de zeragem.';
      impactQuote = 'PROTEGER SEU CAPITAL É MAIS IMPORTANTE DO QUE GANHAR DINHEIRO.';
      subWarning = 'Monitore suas operações. O encerramento prévio é mandatório.';
    } else {
      // Estado 2: AÇÃO NECESSÁRIA
      state = 'ACTION_REQUIRED';
      stateLabel = 'AÇÃO NECESSÁRIA';
      riskLevel = 'RISCO EXTREMO';
      headline = 'TEMPESTADE À VISTA.';
      primaryMessage = 'ZERE SUAS POSIÇÕES. PROTEJA SEU CAPITAL.';
      complementaryMessage = 'Um evento extremo está se aproximando. Permanecer posicionado pode expor seu patrimônio a gaps, volatilidade extraordinária e perdas que seus stops talvez não consigam evitar.';
      impactQuote = 'PROTEGER SEU CAPITAL É MAIS IMPORTANTE DO QUE GANHAR DINHEIRO.';
      subWarning = 'Não ignore este alerta.';
    }

    return {
      hasActiveAlert: true,
      state, // 'WARNING' | 'ACTION_REQUIRED' | 'PROTECTED'
      stateLabel,
      riskLevel,
      openPositionsCount: openCount,
      isProtected,
      headline,
      primaryMessage,
      complementaryMessage,
      impactQuote,
      subWarning,
      event: {
        id: candidateEvent.id,
        name: candidateEvent.name,
        fullName: candidateEvent.fullName || candidateEvent.name,
        category: candidateEvent.category,
        categoryLabel: candidateEvent.categoryLabel || 'Risco Extremo',
        eventDate: candidateEvent.eventDate,
        eventDateFormatted: formatDateWithWeekdayBR(candidateEvent.eventDate),
        riskStartDate: candidateCutoff.firstRiskDate,
        riskEndDate: candidateCutoff.riskEndDate,
        cutoffDate: candidateCutoff.cutoffDate,
        cutoffFormatted: formatCutoffSessionBR(candidateCutoff.cutoffDate),
        daysRemaining,
        sessionsRemaining,
        isPastCutoff,
        isInRiskPeriod
      }
    };
  }

  return {
    isB3TradingDay,
    snapToB3TradingDay,
    addTradingDays,
    countTradingDaysBetween,
    formatDateWithWeekdayBR,
    formatCutoffSessionBR,
    DEFAULT_EXTREME_EVENTS,
    getActiveCalendar,
    registerCustomEvent,
    removeCustomEvent,
    clearCustomEvents,
    getTestMode,
    setTestMode,
    resolveCutoffSession,
    resolveOpenPositionsCount,
    evaluateStormAlertStatus
  };
});
