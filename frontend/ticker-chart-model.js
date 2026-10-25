(function (root, factory) {
  const rubrics = typeof module === 'object' && module.exports ? require('./trading-rubrics') : (root && root.TradingRubrics);
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(rubrics);
  } else {
    root.TickerChartModel = factory(rubrics);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (TradingRubrics) {
  'use strict';

  const STORAGE_KEY = 'healthyTrendChartDiscipline';
  const MAX_PLANNED_SESSIONS_PER_DAY = 2;
  const SESSION_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos sem atividade conta como nova sessão ao retornar

  const MOTIVE_OPTIONS = [
    { id: 'nova_entrada', label: 'Nova entrada' },
    { id: 'medo_fomo', label: 'Medo de perder oportunidade' },
    { id: 'verificar_posicao', label: 'Verificar posição' },
    { id: 'ansiedade', label: 'Ansiedade' },
    { id: 'verificar_stop', label: 'Verificar stop' },
    { id: 'curiosidade', label: 'Apenas curiosidade' },
    { id: 'verificar_lucro', label: 'Verificar lucro' },
    { id: 'outro', label: 'Outro motivo' }
  ];

  function getTodayIsoDate(date = new Date()) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function isWeekend(date = new Date()) {
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

  function getNowTimeFormatted(date = new Date()) {
    const d = new Date(date);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function createInitialState(today = getTodayIsoDate()) {
    return {
      today,
      sessionsToday: 0,
      activeSessionStartedAt: null,
      lastInteractionAt: null,
      lastAnalysisTime: null,
      bypassMotives: [], // { timestamp, motive, ticker }
      historyByDay: {
        // 'YYYY-MM-DD': { sessions: 1, motives: [] }
      }
    };
  }

  function loadDisciplineState(storageImpl) {
    try {
      const store = storageImpl || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!store) return createInitialState();
      const raw = store.getItem(STORAGE_KEY);
      if (!raw) return createInitialState();
      const data = JSON.parse(raw);
      const today = getTodayIsoDate();
      if (data.today !== today) {
        // Novo dia: reseta o contador diário mantendo o histórico
        const history = { ...(data.historyByDay || {}) };
        if (data.today && Number.isFinite(data.sessionsToday)) {
          history[data.today] = {
            sessions: data.sessionsToday,
            motives: data.bypassMotives || []
          };
        }
        return {
          today,
          sessionsToday: 0,
          activeSessionStartedAt: null,
          lastInteractionAt: null,
          lastAnalysisTime: data.lastAnalysisTime || null,
          bypassMotives: [],
          historyByDay: history
        };
      }
      return data;
    } catch {
      return createInitialState();
    }
  }

  function saveDisciplineState(state, storageImpl) {
    try {
      const store = storageImpl || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (store) {
        store.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch {
      // Ignora erro de storage privado/bloqueado
    }
    return state;
  }

  /**
   * Registra a entrada ou atividade na tela de Gráficos.
   * Não incrementa a sessão se a mesma sessão estiver ativa (< 15 minutos).
   */
  function registerChartAccess(currentState, options = {}) {
    const now = options.now ? new Date(options.now).getTime() : Date.now();
    const today = getTodayIsoDate(new Date(now));
    let state = { ...currentState };

    if (state.today !== today) {
      state = {
        today,
        sessionsToday: 0,
        activeSessionStartedAt: null,
        lastInteractionAt: null,
        lastAnalysisTime: state.lastAnalysisTime || null,
        bypassMotives: [],
        historyByDay: {
          ...(state.historyByDay || {}),
          [state.today]: { sessions: state.sessionsToday, motives: state.bypassMotives || [] }
        }
      };
    }

    const lastInteraction = state.lastInteractionAt ? Number(state.lastInteractionAt) : 0;
    const isNewSession = !lastInteraction || (now - lastInteraction) > SESSION_INACTIVITY_TIMEOUT_MS;

    const weekend = isWeekend(new Date(now));
    let shouldShowDisciplineModal = false;

    if (isNewSession) {
      // Se já atingiu ou superou o limite de 2 sessões em dia útil e está iniciando uma nova sessão
      if (!weekend && state.sessionsToday >= MAX_PLANNED_SESSIONS_PER_DAY && !options.bypassApproved) {
        shouldShowDisciplineModal = true;
      } else {
        state.sessionsToday += 1;
        state.activeSessionStartedAt = now;
        state.lastAnalysisTime = getNowTimeFormatted(new Date(now));
      }
    }

    state.lastInteractionAt = now;
    if (state.historyByDay) {
      state.historyByDay[today] = {
        sessions: state.sessionsToday,
        motives: state.bypassMotives || []
      };
    }

    return {
      state,
      isNewSession,
      shouldShowDisciplineModal,
      isWeekend: weekend
    };
  }

  /**
   * Registra a confirmação de que o usuário precisa consultar o gráfico mesmo após exceder a cota diária
   */
  function logBypassMotive(currentState, motiveId, ticker, options = {}) {
    const now = options.now ? new Date(options.now).getTime() : Date.now();
    const state = { ...currentState };
    state.sessionsToday += 1;
    state.activeSessionStartedAt = now;
    state.lastInteractionAt = now;
    state.lastAnalysisTime = getNowTimeFormatted(new Date(now));
    state.bypassMotives = [
      ...(state.bypassMotives || []),
      {
        timestamp: new Date(now).toISOString(),
        motive: motiveId,
        ticker: ticker ? String(ticker).toUpperCase() : null
      }
    ];
    if (!state.historyByDay) state.historyByDay = {};
    state.historyByDay[state.today] = {
      sessions: state.sessionsToday,
      motives: state.bypassMotives
    };
    return state;
  }

  /**
   * Avalia a pontuação de paciência e disciplina semanal
   */
  function evaluatePatienceIndex(state, referenceDate = new Date()) {
    const history = state?.historyByDay || {};
    const days = [];
    const ref = new Date(referenceDate);

    // Obtém os dias da semana útil corrente (Seg a Sex)
    const currentDayOfWeek = ref.getDay(); // 0 Dom, 1 Seg, ..., 6 Sáb
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(ref);
    monday.setDate(ref.getDate() + mondayOffset);

    const weekLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
    let totalScore = 0;
    let evaluatedDays = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < 5; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      const iso = getTodayIsoDate(dayDate);
      const isPastOrToday = dayDate <= ref || iso === getTodayIsoDate(ref);

      let sessions = 0;
      if (iso === state.today) {
        sessions = state.sessionsToday || 0;
      } else if (history[iso]) {
        sessions = history[iso].sessions || 0;
      }

      if (isPastOrToday) {
        evaluatedDays++;
        if (sessions <= MAX_PLANNED_SESSIONS_PER_DAY) {
          tempStreak++;
          if (tempStreak > maxStreak) maxStreak = tempStreak;
          if (sessions === 1) totalScore += 100;
          else if (sessions === 2) totalScore += 90;
          else totalScore += 80;
        } else {
          tempStreak = 0;
          if (sessions <= 5) totalScore += 50;
          else if (sessions <= 10) totalScore += 25;
          else totalScore += 0;
        }
      }

      const dayStr = `${String(dayDate.getDate()).padStart(2, '0')}/${String(dayDate.getMonth() + 1).padStart(2, '0')}`;
      days.push({
        label: weekLabels[i],
        date: dayStr,
        iso,
        sessions,
        status: sessions <= 2 ? (sessions === 0 ? 'zero' : 'good') : (sessions <= 5 ? 'warn' : 'danger')
      });
    }

    currentStreak = tempStreak;
    const patienceScore = evaluatedDays > 0 ? Math.round(totalScore / evaluatedDays) : 100;

    let classification = 'Excelente';
    let legendClass = 'excellent';
    if (patienceScore >= 85) {
      classification = 'Boa disciplina';
      legendClass = 'good';
    } else if (patienceScore >= 60) {
      classification = 'Atenção';
      legendClass = 'warn';
    } else if (patienceScore >= 40) {
      classification = 'Impaciência';
      legendClass = 'orange';
    } else {
      classification = 'Quebra comportamental';
      legendClass = 'danger';
    }

    return {
      patienceScore,
      classification,
      legendClass,
      currentStreak,
      maxStreak: Math.max(maxStreak, currentStreak),
      weekDays: days
    };
  }

  /**
   * Cálculo de Médias Móveis Exponenciais (EMA)
   */
  function calculateEma(values, period) {
    if (!Array.isArray(values) || values.length < period) return [];
    const k = 2 / (period + 1);
    const result = new Array(values.length).fill(null);

    // Primeira média simples (SMA)
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += Number(values[i]);
    }
    let currentEma = sum / period;
    result[period - 1] = Number(currentEma.toFixed(4));

    for (let i = period; i < values.length; i++) {
      currentEma = Number(values[i]) * k + currentEma * (1 - k);
      result[i] = Number(currentEma.toFixed(4));
    }
    return result;
  }

  /**
   * Cálculo do ATR (Average True Range)
   */
  function calculateAtr(candles, period = 21) {
    if (!Array.isArray(candles) || candles.length < 2) {
      return { atrSeries: [], latestAtr: null, latestAtrPct: null };
    }
    const trList = [candles[0].high - candles[0].low];
    for (let i = 1; i < candles.length; i++) {
      const prevClose = candles[i - 1].close;
      const tr = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - prevClose),
        Math.abs(candles[i].low - prevClose)
      );
      trList.push(tr);
    }

    if (trList.length < period) {
      const avgTr = trList.reduce((a, b) => a + b, 0) / trList.length;
      const latestPrice = candles[candles.length - 1].close;
      return {
        atrSeries: trList,
        latestAtr: Number(avgTr.toFixed(2)),
        latestAtrPct: Number(((avgTr / latestPrice) * 100).toFixed(2))
      };
    }

    let atr = trList.slice(0, period).reduce((a, b) => a + b, 0) / period;
    const atrSeries = new Array(period - 1).fill(null);
    atrSeries.push(Number(atr.toFixed(4)));

    for (let i = period; i < trList.length; i++) {
      atr = (atr * (period - 1) + trList[i]) / period;
      atrSeries.push(Number(atr.toFixed(4)));
    }

    const latestPrice = candles[candles.length - 1].close;
    return {
      atrSeries,
      latestAtr: Number(atr.toFixed(2)),
      latestAtrPct: latestPrice > 0 ? Number(((atr / latestPrice) * 100).toFixed(2)) : null
    };
  }

  /**
   * Configuração Oficial do Healthy Trend Trader no gráfico Diário
   */
  const OFFICIAL_EMA_FAST = 10;
  const OFFICIAL_EMA_SLOW = 72;

  /**
   * Validação estrita do padrão geométrico PFR de Compra (Preço de Fechamento de Reversão de fundo)
   *
   * Regra Oficial de 3 candles (Alexandre Wolwacz / Stormer):
   * 1. Estrutura geométrica de fundo: a mínima do candle sinal deve ser estritamente inferior às
   *    mínimas dos dois candles anteriores (c1.low < c2.low E c1.low < c3.low).
   *    Isto impede categoricamente que sequências de candles ascendentes (continuidade de alta)
   *    sejam confundidas com reversão.
   * 2. Fechamento de reversão: o fechamento do candle sinal deve superar o fechamento do candle
   *    imediatamente anterior (c1.close > c2.close).
   * 3. Reação compradora: o candle sinal deve fechar em alta ou estável em relação à sua abertura
   *    (c1.close >= c1.open), comprovando absorção da pressão vendedora e rejeição do fundo.
   */
  function validatePfrBuyPattern(c1, c2, c3) {
    if (!c1 || !c2 || !c3) {
      return {
        isValid: false,
        reason: 'Histórico insuficiente: requer pelo menos 3 candles para validar o padrão de reversão de fundo (PFR).',
        audit: { hasRequiredCandles: false }
      };
    }

    const c1Low = Number(c1.low);
    const c2Low = Number(c2.low);
    const c3Low = Number(c3.low);
    const c1Close = Number(c1.close);
    const c2Close = Number(c2.close);
    const c1High = Number(c1.high);
    const c1Open = Number(c1.open != null ? c1.open : c1Close);

    const isLowerThanC2 = c1Low < c2Low;
    const isLowerThanC3 = c1Low < c3Low;
    const isBottomStructure = isLowerThanC2 && isLowerThanC3;
    const closesAboveC2 = c1Close > c2Close;
    const isBullishReversal = c1Close >= c1Open;

    const audit = {
      hasRequiredCandles: true,
      candles: {
        c1: { low: c1Low, high: c1High, open: c1Open, close: c1Close },
        c2: { low: c2Low, high: Number(c2.high), open: Number(c2.open != null ? c2.open : c2Close), close: c2Close },
        c3: { low: c3Low, high: Number(c3.high), open: Number(c3.open != null ? c3.open : Number(c3.close)), close: Number(c3.close) }
      },
      checks: {
        lowerThanC2: { pass: isLowerThanC2, expected: `${c1Low.toFixed(2)} < ${c2Low.toFixed(2)}` },
        lowerThanC3: { pass: isLowerThanC3, expected: `${c1Low.toFixed(2)} < ${c3Low.toFixed(2)} (estrutura de fundo)` },
        closesAboveC2: { pass: closesAboveC2, expected: `${c1Close.toFixed(2)} > ${c2Close.toFixed(2)}` },
        bullishReaction: { pass: isBullishReversal, expected: `${c1Close.toFixed(2)} >= ${c1Open.toFixed(2)}` }
      }
    };

    if (!isBottomStructure) {
      const reason = !isLowerThanC2
        ? `Mínima atual (${c1Low.toFixed(2)}) não é menor que a mínima anterior (${c2Low.toFixed(2)}).`
        : `Mínima atual (${c1Low.toFixed(2)}) não renovou o fundo em relação ao candle prévio c3 (${c3Low.toFixed(2)}). Sequência ascendente sem reversão de fundo.`;
      return {
        isValid: false,
        reason,
        audit
      };
    }

    if (!closesAboveC2) {
      return {
        isValid: false,
        reason: `Fechamento atual (${c1Close.toFixed(2)}) não superou o fechamento anterior (${c2Close.toFixed(2)}). Reversão não confirmada.`,
        audit
      };
    }

    if (!isBullishReversal) {
      return {
        isValid: false,
        reason: `Candle de sinal fechou abaixo de sua abertura (${c1Close.toFixed(2)} < ${c1Open.toFixed(2)}). Barra vendedora sem rejeição de fundo.`,
        audit
      };
    }

    return {
      isValid: true,
      reason: null,
      audit
    };
  }

  /**
   * Calcula série causal de EMA com precisão de 4 casas decimais para todos os candles disponíveis (sem look-ahead).
   */
  function calculateCausalEmaSeries(values, period) {
    if (!Array.isArray(values) || values.length === 0) return [];
    const k = 2 / (period + 1);
    const result = new Array(values.length);
    let prev = Number(values[0]);
    result[0] = Number(prev.toFixed(4));
    for (let i = 1; i < values.length; i++) {
      prev = Number(values[i]) * k + prev * (1 - k);
      result[i] = Number(prev.toFixed(4));
    }
    return result;
  }

  /**
   * Valida o alinhamento estrutural e a inclinação altista das médias móveis oficiais EMA 10 e EMA 72 no Diário.
   *
   * Regra operacional obrigatória (Diário — 1D, estritamente com candles fechados até a data do sinal, zero look-ahead):
   * 1. Preço acima da EMA 10 e da EMA 72 (close >= EMA 10 e close >= EMA 72).
   * 2. Alinhamento estrutural altista: EMA 10 estritamente acima da EMA 72 (EMA 10 > EMA 72).
   * 3. Inclinação altista confirmada nas duas médias:
   *    - EMA 10 ascendente no momento do sinal (EMA10[t] > EMA10[t-1] e, quando disponíveis candles anteriores da janela,
   *      EMA10[t] > EMA10[t-2] e EMA10[t] > EMA10[t-3]).
   *    - EMA 72 ascendente no momento do sinal (EMA72[t] > EMA72[t-1] e, quando disponíveis candles anteriores da janela,
   *      EMA72[t] > EMA72[t-2] e EMA72[t] > EMA72[t-3]).
   *
   * Se qualquer condição falhar, bloqueia o sinal de compra e retorna motivo explícito para auditoria.
   */
  function validateDailyEmaAlignment(candles, ema10Values = [], ema72Values = []) {
    if (!Array.isArray(candles) || candles.length < 2) {
      const msg = 'Rejeitado: Histórico diário insuficiente para validar alinhamento das EMAs 10 e 72';
      return {
        isValid: false,
        reason: msg,
        reasons: [msg],
        timeframe: '1D',
        checks: {
          priceAboveEma10: false,
          priceAboveEma72: false,
          ema10AboveEma72: false,
          ema10Ascending: false,
          ema72Ascending: false,
          bothAscending: false
        },
        values: null
      };
    }

    const len = candles.length;
    const lastCandle = candles[len - 1];
    const latestClose = Number(lastCandle.close);
    const signalDate = lastCandle.time || lastCandle.date || null;
    const closes = candles.map(c => Number(c.close));

    let e10Series = [];
    if (Array.isArray(ema10Values) && ema10Values.some(v => v != null && Number.isFinite(Number(v)))) {
      e10Series = ema10Values.slice(0, len).filter(v => v != null && Number.isFinite(Number(v))).map(Number);
    } else if (candles.some(c => c && (c.ema10 != null || c.ema9 != null))) {
      e10Series = candles
        .map(c => (c.ema10 != null ? Number(c.ema10) : (c.ema9 != null ? Number(c.ema9) : null)))
        .filter(v => v != null && Number.isFinite(v));
    } else {
      e10Series = calculateCausalEmaSeries(closes, OFFICIAL_EMA_FAST);
    }

    let e72Series = [];
    if (Array.isArray(ema72Values) && ema72Values.some(v => v != null && Number.isFinite(Number(v)))) {
      e72Series = ema72Values.slice(0, len).filter(v => v != null && Number.isFinite(Number(v))).map(Number);
    } else if (candles.some(c => c && (c.ema72 != null || c.ema30 != null))) {
      e72Series = candles
        .map(c => (c.ema72 != null ? Number(c.ema72) : (c.ema30 != null ? Number(c.ema30) : null)))
        .filter(v => v != null && Number.isFinite(v));
    } else {
      e72Series = calculateCausalEmaSeries(closes, OFFICIAL_EMA_SLOW);
    }

    if (e10Series.length < 2) {
      e10Series = calculateCausalEmaSeries(closes, OFFICIAL_EMA_FAST);
    }
    if (e72Series.length < 2) {
      e72Series = calculateCausalEmaSeries(closes, OFFICIAL_EMA_SLOW);
    }

    if (e10Series.length < 2 || e72Series.length < 2) {
      const msg = 'Rejeitado: Série de EMAs insuficiente para confirmar inclinação no Diário';
      return {
        isValid: false,
        reason: msg,
        reasons: [msg],
        timeframe: '1D',
        checks: {
          priceAboveEma10: false,
          priceAboveEma72: false,
          ema10AboveEma72: false,
          ema10Ascending: false,
          ema72Ascending: false,
          bothAscending: false
        },
        values: null
      };
    }

    const e10_0 = e10Series[e10Series.length - 1];
    const e10_1 = e10Series[e10Series.length - 2];

    const e72_0 = e72Series[e72Series.length - 1];
    const e72_1 = e72Series[e72Series.length - 2];

    const priceAboveEma10 = Number.isFinite(latestClose) && latestClose >= e10_0;
    const priceAboveEma72 = Number.isFinite(latestClose) && latestClose >= e72_0;
    const ema10AboveEma72 = e10_0 > e72_0;

    const ema10Ascending = e10_0 > e10_1;
    const ema72Ascending = e72_0 > e72_1;
    const ema10Descending = e10_0 < e10_1;
    const ema72Descending = e72_0 < e72_1;
    const bothAscending = ema10Ascending && ema72Ascending;

    const reasons = [];
    if (ema10Descending && ema72Descending) {
      reasons.push('Rejeitado: EMA 10 e EMA 72 descendentes');
    } else {
      if (ema10Descending) {
        reasons.push('Rejeitado: EMA 10 descendente');
      } else if (!ema10Ascending) {
        reasons.push('Rejeitado: Médias sem inclinação altista confirmada (EMA 10 sem inclinação positiva)');
      }
      if (ema72Descending) {
        reasons.push('Rejeitado: EMA 72 descendente');
      } else if (!ema72Ascending) {
        reasons.push('Rejeitado: Médias sem inclinação altista confirmada (EMA 72 sem inclinação positiva)');
      }
    }

    if (!ema10AboveEma72) {
      reasons.push('Rejeitado: EMA 10 abaixo da EMA 72');
    }

    if (!priceAboveEma10 || !priceAboveEma72) {
      reasons.push('Rejeitado: Preço abaixo da EMA 10 ou EMA 72');
    }

    const isValid = priceAboveEma10 && priceAboveEma72 && ema10AboveEma72 && bothAscending;
    const reason = isValid ? null : (reasons[0] || 'Rejeitado: Médias sem inclinação altista confirmada');

    return {
      isValid,
      reason,
      reasons,
      timeframe: '1D',
      signalDate,
      checks: {
        priceAboveEma10,
        priceAboveEma72,
        ema10AboveEma72,
        ema10Ascending,
        ema72Ascending,
        bothAscending
      },
      values: {
        close: latestClose,
        ema10: Number(e10_0.toFixed(4)),
        prevEma10: Number(e10_1.toFixed(4)),
        ema10Slope: Number((e10_0 - e10_1).toFixed(4)),
        ema72: Number(e72_0.toFixed(4)),
        prevEma72: Number(e72_1.toFixed(4)),
        ema72Slope: Number((e72_0 - e72_1).toFixed(4))
      }
    };
  }

  /**
   * Detecção de Gatilhos Técnicos Oficiais nos últimos candles
   * Regra Obrigatória: Para ser considerado um gatilho válido de compra,
   * o preço precisa estar acima da EMA 10 e da EMA 72, com EMA 10 > EMA 72
   * e ambas as médias ascendentes no gráfico Diário.
   * Se qualquer condição falhar, retorna "Nenhum gatilho encontrado" (sem falsos positivos).
   */
  function detectSetupTriggers(candles, ema10Values = [], ema72Values = []) {
    if (!Array.isArray(candles) || candles.length < 3) {
      return {
        id: 'NONE',
        name: 'Nenhum gatilho encontrado',
        grade: 'Neutro',
        hasTrigger: false,
        description: 'Nenhum padrão de entrada válido identificado no gráfico Diário.',
        detail: null,
        entry: null,
        stop: null,
        entryLabel: null,
        stopLabel: null
      };
    }

    const c1 = candles[candles.length - 1]; // candle atual
    const c2 = candles[candles.length - 2]; // candle anterior
    const c3 = candles[candles.length - 3]; // candle prévio

    const hasExplicitEmaArrays = (Array.isArray(ema10Values) && ema10Values.length > 0) || (Array.isArray(ema72Values) && ema72Values.length > 0);
    const hasCandleEmaProps = candles.some(c => c && (c.ema10 != null || c.ema9 != null || c.ema72 != null || c.ema30 != null));
    const hasEmaContext = hasExplicitEmaArrays || hasCandleEmaProps || candles.length >= 10;

    const emaAlignment = hasEmaContext ? validateDailyEmaAlignment(candles, ema10Values, ema72Values) : null;
    const isAboveBothEmas = emaAlignment
      ? (emaAlignment.checks.priceAboveEma10 && emaAlignment.checks.priceAboveEma72 && c1.close > emaAlignment.values.ema10 && c1.close > emaAlignment.values.ema72)
      : true;
    const isTrendAligned = emaAlignment ? (emaAlignment.isValid && isAboveBothEmas) : true;

    function buildRejectedTrigger(patternName, defaultBelowMsg, extra = {}) {
      const rejReason = !isAboveBothEmas
        ? (emaAlignment && emaAlignment.reason ? emaAlignment.reason : 'Rejeitado: Preço abaixo da EMA 10 ou EMA 72')
        : (emaAlignment && emaAlignment.reason ? emaAlignment.reason : 'Rejeitado: Médias sem alinhamento altista');
      const patternDetected = !isAboveBothEmas
        ? `${patternName} (rejeitado: abaixo das médias)`
        : `${patternName} (${rejReason})`;
      return {
        id: 'NONE',
        name: 'Nenhum gatilho encontrado',
        grade: 'Neutro',
        hasTrigger: false,
        patternDetected,
        rejectionReason: rejReason,
        description: 'Nenhum padrão de entrada válido identificado no gráfico Diário.',
        detail: !isAboveBothEmas ? defaultBelowMsg : `Padrão ${patternName} bloqueado pelo filtro de tendência no Diário (${rejReason}).`,
        entry: null,
        stop: null,
        entryLabel: null,
        stopLabel: null,
        trendAudit: emaAlignment,
        ...extra
      };
    }

    // 1. Inside Bar: candle atual completamente contido dentro da amplitude do anterior
    if (c1.high <= c2.high && c1.low >= c2.low) {
      if (!isTrendAligned) {
        return buildRejectedTrigger(
          'Inside Bar',
          'Padrão Inside Bar abaixo da EMA 10 ou EMA 72 não qualifica como gatilho de compra pelo método.'
        );
      }
      return {
        id: 'INSIDE_BAR',
        name: 'Inside Bar',
        grade: 'A+',
        hasTrigger: true,
        description: 'Candle dentro do candle anterior.',
        detail: 'Contração de volatilidade acima da EMA 10 e EMA 72. Rompimento da máxima ativa compra.',
        entry: Number((c1.high + 0.01).toFixed(2)),
        stop: Number((c1.low - 0.01).toFixed(2)),
        entryLabel: '1 tick acima da máxima do Inside Bar',
        stopLabel: '1 tick abaixo da mínima do Inside Bar',
        trendAudit: emaAlignment
      };
    }

    // 2. 1-2-3 de Compra: candle 2 é a mínima mais baixa entre 1 e 3; candle 1 (mais recente) fecha acima da máxima do candle 2
    if (c2.low < c3.low && c1.low > c2.low && c1.close > c2.high) {
      if (!isTrendAligned) {
        return buildRejectedTrigger(
          '1-2-3 de Compra',
          'Formação 1-2-3 de compra abaixo da EMA 10 ou EMA 72 não qualifica como gatilho pelo método.'
        );
      }
      return {
        id: '123_COMPRA',
        name: '1-2-3 de Compra',
        grade: 'A',
        hasTrigger: true,
        description: 'Formação de fundo de 3 candles.',
        detail: 'Candle 2 fez o fundo e candle 3 confirmou sustentação acima da EMA 10 e EMA 72.',
        entry: Number((c1.high + 0.01).toFixed(2)),
        stop: Number((c2.low - 0.01).toFixed(2)),
        entryLabel: '1 tick acima da máxima do candle 3',
        stopLabel: '1 tick abaixo da mínima do candle 2 (fundo)',
        trendAudit: emaAlignment
      };
    }

    // 3. PFR de Compra: padrão oficial de reversão de fundo de 3 candles (menor mínima e fechamento de reversão)
    const pfrValidation = validatePfrBuyPattern(c1, c2, c3);
    if (pfrValidation.isValid) {
      if (!isTrendAligned) {
        return buildRejectedTrigger(
          'PFR de Compra',
          'Padrão PFR de Compra confirmado geometricamente, porém rejeitado por estar abaixo da EMA 10 ou EMA 72.',
          { audit: pfrValidation }
        );
      }
      return {
        id: 'PFR_COMPRA',
        name: 'PFR de Compra',
        grade: 'A',
        hasTrigger: true,
        description: 'Padrão de Fechamento de Reversão de fundo.',
        detail: 'Reversão de fundo com menor mínima dos 3 candles e fechamento acima do candle anterior, confirmado acima da EMA 10 e EMA 72.',
        entry: Number((c1.high + 0.01).toFixed(2)),
        stop: Number((c1.low - 0.01).toFixed(2)),
        entryLabel: '1 tick acima da máxima do candle de reversão',
        stopLabel: '1 tick abaixo da mínima do candle de reversão',
        audit: pfrValidation,
        trendAudit: emaAlignment
      };
    }

    // 4. Dave Landry: 2 mínimas descendentes com médias apontando para cima
    if (c2.low < c3.low && c1.low < c2.low) {
      if (!isTrendAligned) {
        return buildRejectedTrigger(
          'Dave Landry',
          'Recuo abaixo da EMA 10 ou EMA 72 não qualifica como gatilho pelo método.'
        );
      }
      return {
        id: 'DAVE_LANDRY',
        name: 'Dave Landry',
        grade: 'B',
        hasTrigger: true,
        description: 'Recuo ordenado para média móvel.',
        detail: 'Duas ou mais mínimas consecutivas mais baixas com sustentação acima da EMA 10 e EMA 72.',
        entry: Number((c1.high + 0.01).toFixed(2)),
        stop: Number((c1.low - 0.01).toFixed(2)),
        entryLabel: '1 tick acima da máxima do candle gatilho',
        stopLabel: '1 tick abaixo da mínima do candle gatilho',
        trendAudit: emaAlignment
      };
    }

    // 5. Barra Vermelha Ignorada (RBI): candle anterior vermelho pequeno seguido de fechamento positivo
    if (c2.close < c2.open && c1.close > c1.open && c1.close > c2.high) {
      if (!isTrendAligned) {
        return buildRejectedTrigger(
          'Barra Vermelha Ignorada',
          'Superação abaixo da EMA 10 ou EMA 72 não qualifica como gatilho pelo método.'
        );
      }
      return {
        id: 'RBI',
        name: 'Barra Vermelha Ignorada (RBI)',
        grade: 'A',
        hasTrigger: true,
        description: 'Retomada imediata após breve correção.',
        detail: 'Superação imediata da máxima da barra vendedora acima da EMA 10 e EMA 72.',
        entry: Number((c1.high + 0.01).toFixed(2)),
        stop: Number((c2.low - 0.01).toFixed(2)),
        entryLabel: '1 tick acima da máxima da barra compradora',
        stopLabel: '1 tick abaixo da mínima da barra vermelha',
        trendAudit: emaAlignment
      };
    }

    // 6. Nenhum padrão válido identificado
    return {
      id: 'NONE',
      name: 'Nenhum gatilho encontrado',
      grade: 'Neutro',
      hasTrigger: false,
      description: 'Nenhum padrão de entrada válido identificado no gráfico Diário.',
      detail: 'Aguarde a formação de um padrão com fechamento acima da EMA 10 e EMA 72.',
      entry: null,
      stop: null,
      entryLabel: null,
      stopLabel: null,
      trendAudit: emaAlignment
    };
  }

  function classifyRelativeStrength(score, classification) {
    if (TradingRubrics && typeof TradingRubrics.classifyRelativeStrength === 'function') {
      return TradingRubrics.classifyRelativeStrength(score, classification);
    }
    const hasScore = score !== null && score !== undefined && score !== '' && !Number.isNaN(Number(score));
    const rawNum = hasScore ? Number(score) : null;
    const hasNum = Number.isFinite(rawNum);
    const num = hasNum ? Math.max(0, Math.min(100, Math.round(rawNum))) : null;
    const c = String(classification || '').trim().toLowerCase();
    if ((hasNum && num >= 90) || c.includes('líd') || c.includes('lead')) {
      return { score: num, tier: 'leader', label: 'Líder', status: 'good', statusClass: 'good', badgeClass: 'good', color: '#15803d', icon: '🟢', dot: '●', display: num !== null ? `Líder (${num})` : 'Líder' };
    }
    if ((hasNum && num >= 70) || c.includes('fort') || c.includes('qualif')) {
      return { score: num, tier: 'strong', label: 'Forte', status: 'good', statusClass: 'good', badgeClass: 'good', color: '#15803d', icon: '🟢', dot: '●', display: num !== null ? `Forte (${num})` : 'Forte' };
    }
    if ((hasNum && num < 40) || c.includes('frac') || c.includes('lag') || c.includes('abaixo')) {
      return { score: num, tier: 'weak', label: 'Fraco', status: 'bad', statusClass: 'bad', badgeClass: 'bad', color: '#b91c1c', icon: '🔴', dot: '●', display: num !== null ? `Fraco (${num})` : 'Fraco' };
    }
    return { score: num, tier: 'neutral', label: 'Neutro', status: 'neutral', statusClass: 'neutral', badgeClass: 'neutral', color: '#64748b', icon: '🟡', dot: '●', display: num !== null ? `Neutro (${num})` : 'Neutro' };
  }

  function getRubricGradeVisual(grade) {
    if (TradingRubrics && typeof TradingRubrics.getRubricGradeVisual === 'function') {
      return TradingRubrics.getRubricGradeVisual(grade);
    }
    const raw = String(grade || '').trim().toUpperCase();
    if (raw === 'A+' || raw === 'A') {
      return { grade: raw || 'A', status: 'good', statusClass: 'grade-a', badgeClass: 'good', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', icon: '🏆', title: raw === 'A+' ? 'Rare Trade (A+)' : 'Alta Qualidade (A)', summaryText: 'Setup com alta probabilidade segundo o seu método.', riskDescription: 'Risco nominal liberado' };
    }
    if (raw === 'B') {
      return { grade: 'B', status: 'good', statusClass: 'grade-b', badgeClass: 'good', color: '#a16207', bg: '#fefce8', border: '#fef08a', icon: '✅', title: 'Bom Edge (B)', summaryText: 'Setup dentro dos parâmetros de risco controlado.', riskDescription: 'Risco moderado permitido' };
    }
    if (raw === 'C') {
      return { grade: 'C', status: 'neutral', statusClass: 'grade-c', badgeClass: 'neutral', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa', icon: '⚠️', title: 'Edge Pequeno (C)', summaryText: 'Qualidade limítrofe. Exige cautela e dimensionamento reduzido.', riskDescription: 'Risco mínimo reduzido' };
    }
    return { grade: raw || 'D', status: 'bad', statusClass: 'grade-d', badgeClass: 'bad', color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5', icon: '⛔', title: 'Sem Edge (D)', summaryText: 'Sem Edge. Bloqueio automático com risco nominal zero (0%).', riskDescription: 'Operação bloqueada pelo método' };
  }

  function getRubricGradeColor(grade) {
    return getRubricGradeVisual(grade).color;
  }

  function formatContextNum(val, dec = 2) {
    if (val === null || val === undefined || val === '' || Number.isNaN(Number(val))) return '—';
    return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  function resolveLastIndicatorValue(series) {
    if (Array.isArray(series)) {
      for (let i = series.length - 1; i >= 0; i--) {
        const v = series[i];
        if (v !== null && v !== undefined && Number.isFinite(Number(v))) return Number(v);
      }
      return null;
    }
    return Number.isFinite(Number(series)) ? Number(series) : null;
  }

  function buildTradeContext(tickerData = {}) {
    const info = tickerData.tickerInfo || {};
    const trig = tickerData.trigger || {};
    const rs = tickerData.relativeStrength || {};
    const cycle = tickerData.marketCycle || {};
    const trend = tickerData.trend || {};
    const struct = tickerData.structure || {};
    const vol = tickerData.volatility || {};
    const inds = tickerData.indicators || {};
    const funds = tickerData.fundamentals || {};
    const ctx = tickerData.context || {};

    const symbol = String(info.symbol || trig.symbol || '').trim().toUpperCase();
    const companyName = String(info.name || symbol);
    const date = String(info.sessionDate || info.date || getTodayIsoDate()).slice(0, 10);
    const timeframe = 'Diário';

    const currentPrice = Number.isFinite(Number(info.price)) ? Number(info.price) : null;
    const entryPrice = Number.isFinite(Number(trig.entry)) ? Number(trig.entry) : null;
    const stopLoss = Number.isFinite(Number(trig.stop)) ? Number(trig.stop) : null;

    const hasTrigger = Boolean(trig.hasTrigger);
    const triggerKey = trig.id || null;
    const triggerName = trig.name || (hasTrigger ? 'Gatilho de Compra' : null);
    const triggerGrade = trig.grade || (hasTrigger ? 'A' : 'Neutro');
    const rubricGrade = tickerData.rubric?.finalGrade || null;

    const ema10Val = resolveLastIndicatorValue(inds.ema10 || inds.ema9);
    const ema72Val = resolveLastIndicatorValue(inds.ema72 || inds.ema30);
    const atr21Val = Number.isFinite(Number(vol.atr21)) ? Number(vol.atr21) : (Number.isFinite(Number(inds.atr21)) ? Number(inds.atr21) : null);
    const atrPctVal = Number.isFinite(Number(vol.atrPct)) ? Number(vol.atrPct) : (Number.isFinite(Number(inds.atrPct)) ? Number(inds.atrPct) : null);

    let marketClass = 'Ações';
    if (info.assetClass) {
      const ac = String(info.assetClass).toLowerCase();
      if (ac.includes('bdr')) marketClass = 'BDR';
      else if (ac.includes('fii')) marketClass = 'FII';
      else if (ac.includes('futuro')) marketClass = 'Futuros';
      else if (ac.includes('cripto')) marketClass = 'Cripto';
    } else if (/34|35$/.test(symbol)) {
      marketClass = 'BDR';
    } else if (/11$/.test(symbol) && (info.sector?.toLowerCase().includes('imobil') || info.sector?.toLowerCase().includes('fii'))) {
      marketClass = 'FII';
    }

    return {
      symbol,
      companyName,
      date,
      timeframe,
      marketClass,
      currentPrice,
      entryPrice,
      stopLoss,
      hasTrigger,
      triggerKey,
      triggerName,
      triggerGrade,
      rubricGrade,
      relativeStrength: {
        score: Number.isFinite(Number(rs.score)) ? Number(rs.score) : null,
        classification: rs.classification || (rs.score >= 70 ? 'Forte' : 'Neutro')
      },
      marketCycle: {
        regime: cycle.regime || 'healthy',
        description: cycle.description || 'Positivo',
        benchmark: cycle.benchmark || 'IBOV',
        score: Number.isFinite(Number(cycle.score)) ? Number(cycle.score) : null
      },
      trend: {
        status: trend.status || 'Alta',
        formula: trend.formula || 'Preço > EMA 10 > EMA 72',
        priceAboveEma10: trend.priceAboveEma10 !== false && trend.priceAboveEma9 !== false,
        ema10AboveEma72: trend.ema10AboveEma72 !== false && trend.ema9AboveEma30 !== false,
        bothSlopingUp: trend.bothSlopingUp !== false,
        // Compatibilidade legada
        priceAboveEma9: trend.priceAboveEma10 !== false && trend.priceAboveEma9 !== false,
        ema9AboveEma30: trend.ema10AboveEma72 !== false && trend.ema9AboveEma30 !== false
      },
      structure: {
        label: struct.label || 'Correção',
        description: struct.description || 'Correção saudável'
      },
      volatility: {
        atr21: atr21Val,
        atrPct: atrPctVal,
        regime: vol.regime || (atrPctVal && atrPctVal < 3 ? 'Baixa' : 'Normal')
      },
      technicals: {
        ema10: ema10Val,
        ema72: ema72Val,
        ema9: ema10Val,
        ema30: ema72Val
      },
      fundamentals: {
        available: funds.available !== false,
        evaluation: funds.evaluation || (funds.available === false ? 'Neutro' : 'Forte'),
        status: funds.status || (funds.available === false ? 'neutral' : 'good'),
        classification: funds.classification || null,
        score: funds.score ?? null,
        ...funds
      },
      context: {
        title: ctx.title || 'Super Contexto',
        description: ctx.description || 'Ativo em tendência alinhada no gráfico Diário.'
      },
      source: 'charts_trigger',
      importedAt: new Date().toISOString()
    };
  }

  function inferRubricRatingsFromContext(ctx) {
    if (!ctx) return {
      trendQuality: 'good',
      relativeStrength: 'good',
      setupQuality: 'good',
      fundamentalScore: 'good'
    };

    // 1. Contexto do Ativo (Diário) - trendQuality
    let trendQuality = 'good';
    if (ctx.trend) {
      const isStrong = (ctx.trend.priceAboveEma10 ?? ctx.trend.priceAboveEma9) && (ctx.trend.ema10AboveEma72 ?? ctx.trend.ema9AboveEma30);
      const isPullback = ctx.structure?.label?.toLowerCase().includes('pullback') || ctx.structure?.label?.toLowerCase().includes('contração');
      if (isStrong && isPullback) {
        trendQuality = 'good';
      } else if (isStrong || ctx.trend.status?.toLowerCase().includes('alta')) {
        trendQuality = 'good';
      } else if (ctx.trend.status?.toLowerCase().includes('neutr') || ctx.trend.status?.toLowerCase().includes('lateral')) {
        trendQuality = 'medium';
      } else {
        trendQuality = 'bad';
      }
    }

    // 2. Ciclo de Mercado - marketCycle
    let marketCycle = 'healthy';
    if (ctx.marketCycle) {
      const reg = String(ctx.marketCycle.regime || '').toLowerCase();
      if (reg.includes('defens') || reg.includes('down') || reg.includes('baixa')) {
        marketCycle = 'defensive';
      } else if (reg.includes('trans') || reg.includes('neutr') || reg.includes('recup') || reg.includes('improv')) {
        marketCycle = 'transition';
      } else if (!reg.includes('positiv') && !reg.includes('health') && !reg.includes('saud') && ctx.marketCycle.score != null && ctx.marketCycle.score < 70) {
        marketCycle = 'transition';
      } else {
        marketCycle = 'healthy';
      }
    }

    // 3. Força Relativa (RS) - relativeStrength
    let relativeStrength = 'good';
    if (ctx.relativeStrength) {
      const rsScore = ctx.relativeStrength.score;
      const rsClass = String(ctx.relativeStrength.classification || '').toLowerCase();
      if ((rsScore != null && rsScore >= 70) || rsClass.includes('líd') || rsClass.includes('fort')) {
        relativeStrength = 'good';
      } else if ((rsScore != null && rsScore >= 40) || rsClass.includes('neutr')) {
        relativeStrength = 'medium';
      } else if (rsScore != null && rsScore < 40) {
        relativeStrength = 'bad';
      }
    }

    // 4. Gatilho de Entrada - setupQuality
    let setupQuality = 'good';
    if (ctx.hasTrigger === false || String(ctx.triggerKey || '').toUpperCase() === 'NONE') {
      setupQuality = 'bad';
    } else {
      const grade = String(ctx.triggerGrade || 'A').toUpperCase();
      if (grade === 'A+' || grade === 'A') {
        setupQuality = 'good';
      } else if (grade === 'B') {
        setupQuality = 'medium';
      } else {
        setupQuality = 'bad';
      }
    }

    // 5. Fundamentos - fundamentalScore
    let fundamentalScore = 'good';
    if (ctx.fundamentals) {
      const fStatus = String(ctx.fundamentals.status || '').toLowerCase();
      const fClass = String(ctx.fundamentals.classification || '').toLowerCase();
      const fEval = String(ctx.fundamentals.evaluation || '').toLowerCase();
      if (ctx.fundamentals.available === false || fStatus === 'neutral' || fEval.includes('neutr')) {
        fundamentalScore = 'medium';
      } else if (fStatus === 'bad' || fClass.includes('frac') || fClass.includes('ruim') || fEval.includes('frac') || fEval.includes('ruim')) {
        fundamentalScore = 'bad';
      } else if (fStatus === 'alert' || fClass.includes('méd') || fClass.includes('med') || fEval.includes('méd') || fEval.includes('med')) {
        fundamentalScore = 'medium';
      } else if (fStatus === 'good' || fClass.includes('bom') || fClass.includes('excel') || fEval.includes('fort') || fEval.includes('excel')) {
        fundamentalScore = 'good';
      } else if (ctx.fundamentals.roe?.positive && ctx.fundamentals.netMargin?.positive && ctx.fundamentals.netDebtToEbitda?.positive) {
        fundamentalScore = 'good';
      } else if (ctx.fundamentals.roe?.positive || ctx.fundamentals.netMargin?.positive) {
        fundamentalScore = 'medium';
      } else {
        fundamentalScore = 'bad';
      }
    }

    // 6. Volatilidade (ATR) - volatility
    let volatility = 'good';
    if (ctx.volatility) {
      const reg = String(ctx.volatility.regime || '').toLowerCase();
      const atrP = Number(ctx.volatility.atrPct);
      if (reg.includes('baix') || (Number.isFinite(atrP) && atrP < 3.0)) {
        volatility = 'good';
      } else if (reg.includes('mode') || (Number.isFinite(atrP) && atrP < 5.0)) {
        volatility = 'medium';
      } else {
        volatility = 'bad';
      }
    }

    return {
      trendQuality,
      marketCycle,
      relativeStrength,
      setupQuality,
      fundamentalScore,
      volatility
    };
  }

  /**
   * Avalia a Rubric de um ativo na tela Gráficos usando exatamente os mesmos
   * critérios, arredondamentos (entry/atr) e motor (TradingRubrics.calculateRubric)
   * que a tela Novo Trade utiliza ao importar o contexto.
   */
  function evaluateChartRubric(tickerData = {}, policy) {
    const ctx = buildTradeContext(tickerData);
    const ratings = inferRubricRatingsFromContext(ctx);
    const hasTrigger = Boolean(tickerData?.trigger?.hasTrigger);
    if (!hasTrigger) {
      ratings.setupQuality = 'bad';
    }
    const rawEntry = (hasTrigger && ctx.entryPrice != null && Number(ctx.entryPrice) > 0)
      ? Number(ctx.entryPrice)
      : Number(ctx.currentPrice || 0);
    const entry = rawEntry > 0 ? Number(rawEntry.toFixed(2)) : 0;
    const rawAtr = Number(ctx.volatility?.atr21 ?? tickerData?.indicators?.atr21 ?? 0);
    const atr = rawAtr > 0 ? Number(rawAtr.toFixed(2)) : 0;

    if (TradingRubrics && typeof TradingRubrics.calculateRubric === 'function') {
      const evalResult = TradingRubrics.calculateRubric({
        ratings,
        marketCycleRegime: ratings.marketCycle,
        entry,
        atr
      }, policy);
      const finalGrade = evalResult.grade || 'D';
      const gradeVisual = getRubricGradeVisual(finalGrade);
      return {
        finalGrade,
        score: evalResult.score,
        summaryText: gradeVisual.summaryText,
        ratings,
        evaluation: evalResult
      };
    }

    const fallbackGrade = 'B';
    const gradeVisual = getRubricGradeVisual(fallbackGrade);
    return {
      finalGrade: fallbackGrade,
      score: 80,
      summaryText: gradeVisual.summaryText,
      ratings,
      evaluation: null
    };
  }

  function formatTradeThesis(ctx) {
    if (!ctx) return '';
    const parts = [];
    const sym = ctx.symbol || 'ATIVO';
    const name = ctx.companyName && ctx.companyName !== sym ? ` (${ctx.companyName})` : '';
    parts.push(`• Ativo: ${sym}${name} — Timeframe: ${ctx.timeframe || 'Diário'}`);
    if (ctx.triggerName) {
      const displayGrade = ctx.rubricGrade || ctx.triggerGrade || 'A';
      parts.push(`• Gatilho: ${ctx.triggerName} (Grade ${displayGrade})`);
    }
    if (ctx.entryPrice != null && ctx.stopLoss != null) {
      parts.push(`• Entrada sugerida: R$ ${formatContextNum(ctx.entryPrice)} | Stop inicial: R$ ${formatContextNum(ctx.stopLoss)}`);
    }
    if (ctx.trend?.formula || ctx.structure?.label) {
      const formula = ctx.trend?.formula || 'Preço > EMA 9 > EMA 30';
      const struct = ctx.structure?.label ? ` (Estrutura: ${ctx.structure.label})` : '';
      parts.push(`• Tendência: ${formula}${struct}`);
    }
    if (ctx.relativeStrength) {
      const rsLabel = ctx.relativeStrength.classification || (ctx.relativeStrength.score >= 70 ? 'Forte' : 'Neutro');
      const rsScore = ctx.relativeStrength.score != null ? ` (${ctx.relativeStrength.score})` : '';
      parts.push(`• Força Relativa: ${rsLabel}${rsScore}`);
    }
    if (ctx.marketCycle) {
      const cycleDesc = ctx.marketCycle.description || (ctx.marketCycle.regime === 'healthy' ? 'Positivo' : ctx.marketCycle.regime);
      const bmk = ctx.marketCycle.benchmark ? ` [${ctx.marketCycle.benchmark}]` : '';
      parts.push(`• Ciclo de Mercado: ${cycleDesc}${bmk}`);
    }
    if (ctx.volatility) {
      const atrTxt = ctx.volatility.atr21 != null ? `ATR ${formatContextNum(ctx.volatility.atr21)}` : '';
      const atrPctTxt = ctx.volatility.atrPct != null ? ` (${formatContextNum(ctx.volatility.atrPct)}%)` : '';
      const reg = ctx.volatility.regime ? ` — ${ctx.volatility.regime}` : '';
      if (atrTxt) parts.push(`• Volatilidade: ${atrTxt}${atrPctTxt}${reg}`);
    }
    if (ctx.technicals?.ema9 != null && ctx.technicals?.ema30 != null) {
      parts.push(`• Médias: EMA 9: ${formatContextNum(ctx.technicals.ema9)} | EMA 30: ${formatContextNum(ctx.technicals.ema30)}`);
    }
    if (ctx.context?.title) {
      parts.push(`• Contexto: ${ctx.context.title}`);
    }
    return `Contexto da oportunidade (importado de Gráficos):\n` + parts.join('\n');
  }

  return {
    STORAGE_KEY,
    MAX_PLANNED_SESSIONS_PER_DAY,
    SESSION_INACTIVITY_TIMEOUT_MS,
    MOTIVE_OPTIONS,
    getTodayIsoDate,
    getNowTimeFormatted,
    isWeekend,
    createInitialState,
    loadDisciplineState,
    saveDisciplineState,
    registerChartAccess,
    logBypassMotive,
    evaluatePatienceIndex,
    calculateEma,
    calculateCausalEmaSeries,
    calculateAtr,
    OFFICIAL_EMA_FAST,
    OFFICIAL_EMA_SLOW,
    validatePfrBuyPattern,
    validateDailyEmaAlignment,
    detectSetupTriggers,
    classifyRelativeStrength,
    getRubricGradeVisual,
    getRubricGradeColor,
    buildTradeContext,
    inferRubricRatingsFromContext,
    evaluateChartRubric,
    formatTradeThesis
  };
});
