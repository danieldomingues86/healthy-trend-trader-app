(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TickerChartModel = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
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

    let shouldShowDisciplineModal = false;

    if (isNewSession) {
      // Se já atingiu ou superou o limite de 2 sessões e está iniciando uma nova sessão
      if (state.sessionsToday >= MAX_PLANNED_SESSIONS_PER_DAY && !options.bypassApproved) {
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
      shouldShowDisciplineModal
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
   * Detecção de Gatilhos Técnicos Oficiais nos últimos candles
   */
  function detectSetupTriggers(candles, ema9Values = [], ema30Values = []) {
    if (!Array.isArray(candles) || candles.length < 3) {
      return { id: 'NONE', name: 'Nenhum gatilho ativo', grade: 'D', description: 'Aguardando formação de setup.' };
    }

    const c1 = candles[candles.length - 1]; // candle atual
    const c2 = candles[candles.length - 2]; // candle anterior
    const c3 = candles[candles.length - 3]; // candle prévio

    // 1. Inside Bar: candle atual completamente contido dentro da amplitude do anterior
    if (c1.high <= c2.high && c1.low >= c2.low) {
      return {
        id: 'INSIDE_BAR',
        name: 'Inside Bar',
        grade: 'A+',
        description: 'Candle dentro do candle anterior.',
        detail: 'Contração de volatilidade em região de médias. Rompimento da máxima ativa compra.',
        entry: c1.high + 0.01,
        stop: c1.low - 0.01
      };
    }

    // 2. PFR de Compra: mínima mais baixa que o candle anterior, mas fechamento acima do fechamento anterior
    if (c1.low < c2.low && c1.close > c2.close) {
      return {
        id: 'PFR_COMPRA',
        name: 'PFR de Compra',
        grade: 'A',
        description: 'Padrão de Fechamento de Reversão de fundo.',
        detail: 'Rejeição de mínimas com fechamento forte acima do candle anterior.',
        entry: c1.high + 0.01,
        stop: c1.low - 0.01
      };
    }

    // 3. 1-2-3 de Compra: candle 2 é a mínima mais baixa entre 1 e 3; candle 1 faz mínima mais alta
    if (c2.low < c3.low && c1.low > c2.low && c1.close > c2.high) {
      return {
        id: '123_COMPRA',
        name: '1-2-3 de Compra',
        grade: 'A',
        description: 'Formação de fundo de 3 candles.',
        detail: 'Candle 2 fez o fundo e candle 3 confirmou sustentação do suporte.',
        entry: c1.high + 0.01,
        stop: c2.low - 0.01
      };
    }

    // 4. Dave Landry: 2 mínimas descendentes com médias apontando para cima
    if (c2.low < c3.low && c1.low < c2.low) {
      return {
        id: 'DAVE_LANDRY',
        name: 'Dave Landry',
        grade: 'B',
        description: 'Recuo ordenado para média móvel.',
        detail: 'Duas ou mais mínimas consecutivas mais baixas em tendência de alta.',
        entry: c1.high + 0.01,
        stop: c1.low - 0.01
      };
    }

    // 5. Barra Vermelha Ignorada (RBI): candle anterior vermelho pequeno seguido de fechamento positivo
    if (c2.close < c2.open && c1.close > c1.open && c1.close > c2.high) {
      return {
        id: 'RBI',
        name: 'Barra Vermelha Ignorada (RBI)',
        grade: 'A',
        description: 'Retomada imediata após breve correção.',
        detail: 'Superação imediata da máxima da barra vendedora.',
        entry: c1.high + 0.01,
        stop: c2.low - 0.01
      };
    }

    return {
      id: 'PULLBACK',
      name: 'Pullback em Andamento',
      grade: 'B',
      description: 'Correção técnica saudável na direção da tendência.',
      detail: 'Aguarde o candle de confirmação para acionamento do gatilho.',
      entry: null,
      stop: null
    };
  }

  return {
    STORAGE_KEY,
    MAX_PLANNED_SESSIONS_PER_DAY,
    SESSION_INACTIVITY_TIMEOUT_MS,
    MOTIVE_OPTIONS,
    getTodayIsoDate,
    getNowTimeFormatted,
    createInitialState,
    loadDisciplineState,
    saveDisciplineState,
    registerChartAccess,
    logBypassMotive,
    evaluatePatienceIndex,
    calculateEma,
    calculateAtr,
    detectSetupTriggers
  };
});
