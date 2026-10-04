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
   * Regra Obrigatória: Para ser considerado um gatilho válido de compra,
   * o preço precisa estar estritamente acima da EMA 9 e acima da EMA 30.
   * Se qualquer condição falhar, retorna "Nenhum gatilho encontrado" (sem falsos positivos).
   */
  function detectSetupTriggers(candles, ema9Values = [], ema30Values = []) {
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

    let ema9Arr = ema9Values;
    let ema30Arr = ema30Values;
    if ((!Array.isArray(ema9Arr) || ema9Arr.length === 0) && candles.length >= 9) {
      ema9Arr = calculateEma(candles.map(c => c.close), 9);
    }
    if ((!Array.isArray(ema30Arr) || ema30Arr.length === 0) && candles.length >= 30) {
      ema30Arr = calculateEma(candles.map(c => c.close), 30);
    }

    const latestEma9 = (Array.isArray(ema9Arr) && ema9Arr.length > 0)
      ? ema9Arr[ema9Arr.length - 1]
      : null;
    const latestEma30 = (Array.isArray(ema30Arr) && ema30Arr.length > 0)
      ? ema30Arr[ema30Arr.length - 1]
      : null;

    const hasEmaContext = latestEma9 !== null && latestEma30 !== null;
    const isAboveBothEmas = hasEmaContext
      ? (c1.close > latestEma9 && c1.close > latestEma30)
      : true;

    // 1. Inside Bar: candle atual completamente contido dentro da amplitude do anterior
    if (c1.high <= c2.high && c1.low >= c2.low) {
      if (!isAboveBothEmas) {
        return {
          id: 'NONE',
          name: 'Nenhum gatilho encontrado',
          grade: 'Neutro',
          hasTrigger: false,
          patternDetected: 'Inside Bar (rejeitado: abaixo das médias)',
          description: 'Nenhum padrão de entrada válido identificado no gráfico Diário.',
          detail: 'Padrão Inside Bar abaixo da EMA 9 ou EMA 30 não qualifica como gatilho de compra pelo método.',
          entry: null,
          stop: null,
          entryLabel: null,
          stopLabel: null
        };
      }
      return {
        id: 'INSIDE_BAR',
        name: 'Inside Bar',
        grade: 'A+',
        hasTrigger: true,
        description: 'Candle dentro do candle anterior.',
        detail: 'Contração de volatilidade acima da EMA 9 e EMA 30. Rompimento da máxima ativa compra.',
        entry: Number((c1.high + 0.01).toFixed(2)),
        stop: Number((c1.low - 0.01).toFixed(2)),
        entryLabel: '1 tick acima da máxima do Inside Bar',
        stopLabel: '1 tick abaixo da mínima do Inside Bar'
      };
    }

    // 2. 1-2-3 de Compra: candle 2 é a mínima mais baixa entre 1 e 3; candle 1 (mais recente) fecha acima da máxima do candle 2
    if (c2.low < c3.low && c1.low > c2.low && c1.close > c2.high) {
      if (!isAboveBothEmas) {
        return {
          id: 'NONE',
          name: 'Nenhum gatilho encontrado',
          grade: 'Neutro',
          hasTrigger: false,
          patternDetected: '1-2-3 de Compra (rejeitado: abaixo das médias)',
          description: 'Nenhum padrão de entrada válido identificado no gráfico Diário.',
          detail: 'Formação 1-2-3 de compra abaixo da EMA 9 ou EMA 30 não qualifica como gatilho pelo método.',
          entry: null,
          stop: null,
          entryLabel: null,
          stopLabel: null
        };
      }
      return {
        id: '123_COMPRA',
        name: '1-2-3 de Compra',
        grade: 'A',
        hasTrigger: true,
        description: 'Formação de fundo de 3 candles.',
        detail: 'Candle 2 fez o fundo e candle 3 confirmou sustentação acima da EMA 9 e EMA 30.',
        entry: Number((c1.high + 0.01).toFixed(2)),
        stop: Number((c2.low - 0.01).toFixed(2)),
        entryLabel: '1 tick acima da máxima do candle 3',
        stopLabel: '1 tick abaixo da mínima do candle 2 (fundo)'
      };
    }

    // 3. PFR de Compra: mínima mais baixa que o candle anterior, mas fechamento acima do fechamento anterior
    if (c1.low < c2.low && c1.close > c2.close) {
      if (!isAboveBothEmas) {
        return {
          id: 'NONE',
          name: 'Nenhum gatilho encontrado',
          grade: 'Neutro',
          hasTrigger: false,
          patternDetected: 'PFR de Compra (rejeitado: abaixo das médias)',
          description: 'Nenhum padrão de entrada válido identificado no gráfico Diário.',
          detail: 'Reversão abaixo da EMA 9 ou EMA 30 não qualifica como gatilho pelo método.',
          entry: null,
          stop: null,
          entryLabel: null,
          stopLabel: null
        };
      }
      return {
        id: 'PFR_COMPRA',
        name: 'PFR de Compra',
        grade: 'A',
        hasTrigger: true,
        description: 'Padrão de Fechamento de Reversão de fundo.',
        detail: 'Rejeição de mínimas com fechamento forte acima do candle anterior e acima das médias.',
        entry: Number((c1.high + 0.01).toFixed(2)),
        stop: Number((c1.low - 0.01).toFixed(2)),
        entryLabel: '1 tick acima da máxima do candle de reversão',
        stopLabel: '1 tick abaixo da mínima do candle de reversão'
      };
    }

    // 4. Dave Landry: 2 mínimas descendentes com médias apontando para cima
    if (c2.low < c3.low && c1.low < c2.low) {
      if (!isAboveBothEmas) {
        return {
          id: 'NONE',
          name: 'Nenhum gatilho encontrado',
          grade: 'Neutro',
          hasTrigger: false,
          patternDetected: 'Dave Landry (rejeitado: abaixo das médias)',
          description: 'Nenhum padrão de entrada válido identificado no gráfico Diário.',
          detail: 'Recuo abaixo da EMA 9 ou EMA 30 não qualifica como gatilho pelo método.',
          entry: null,
          stop: null,
          entryLabel: null,
          stopLabel: null
        };
      }
      return {
        id: 'DAVE_LANDRY',
        name: 'Dave Landry',
        grade: 'B',
        hasTrigger: true,
        description: 'Recuo ordenado para média móvel.',
        detail: 'Duas ou mais mínimas consecutivas mais baixas com sustentação acima da EMA 9 e EMA 30.',
        entry: Number((c1.high + 0.01).toFixed(2)),
        stop: Number((c1.low - 0.01).toFixed(2)),
        entryLabel: '1 tick acima da máxima do candle gatilho',
        stopLabel: '1 tick abaixo da mínima do candle gatilho'
      };
    }

    // 5. Barra Vermelha Ignorada (RBI): candle anterior vermelho pequeno seguido de fechamento positivo
    if (c2.close < c2.open && c1.close > c1.open && c1.close > c2.high) {
      if (!isAboveBothEmas) {
        return {
          id: 'NONE',
          name: 'Nenhum gatilho encontrado',
          grade: 'Neutro',
          hasTrigger: false,
          patternDetected: 'Barra Vermelha Ignorada (rejeitado: abaixo das médias)',
          description: 'Nenhum padrão de entrada válido identificado no gráfico Diário.',
          detail: 'Superação abaixo da EMA 9 ou EMA 30 não qualifica como gatilho pelo método.',
          entry: null,
          stop: null,
          entryLabel: null,
          stopLabel: null
        };
      }
      return {
        id: 'RBI',
        name: 'Barra Vermelha Ignorada (RBI)',
        grade: 'A',
        hasTrigger: true,
        description: 'Retomada imediata após breve correção.',
        detail: 'Superação imediata da máxima da barra vendedora acima da EMA 9 e EMA 30.',
        entry: Number((c1.high + 0.01).toFixed(2)),
        stop: Number((c2.low - 0.01).toFixed(2)),
        entryLabel: '1 tick acima da máxima da barra compradora',
        stopLabel: '1 tick abaixo da mínima da barra vermelha'
      };
    }

    // 6. Nenhum padrão válido identificado
    return {
      id: 'NONE',
      name: 'Nenhum gatilho encontrado',
      grade: 'Neutro',
      hasTrigger: false,
      description: 'Nenhum padrão de entrada válido identificado no gráfico Diário.',
      detail: 'Aguarde a formação de um padrão com fechamento acima da EMA 9 e EMA 30.',
      entry: null,
      stop: null,
      entryLabel: null,
      stopLabel: null
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

    const triggerKey = trig.id || null;
    const triggerName = trig.name || (trig.hasTrigger ? 'Gatilho de Compra' : null);
    const triggerGrade = trig.grade || 'A';

    const ema9Val = resolveLastIndicatorValue(inds.ema9);
    const ema30Val = resolveLastIndicatorValue(inds.ema30);
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
      triggerKey,
      triggerName,
      triggerGrade,
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
        formula: trend.formula || 'Preço > EMA 9 > EMA 30',
        priceAboveEma9: trend.priceAboveEma9 !== false,
        ema9AboveEma30: trend.ema9AboveEma30 !== false,
        bothSlopingUp: trend.bothSlopingUp !== false
      },
      structure: {
        label: struct.label || 'Pullback',
        description: struct.description || 'Pullback'
      },
      volatility: {
        atr21: atr21Val,
        atrPct: atrPctVal,
        regime: vol.regime || (atrPctVal && atrPctVal < 3 ? 'Baixa' : 'Normal')
      },
      technicals: {
        ema9: ema9Val,
        ema30: ema30Val
      },
      fundamentals: {
        available: funds.available !== false,
        evaluation: funds.available === false ? 'Neutro' : 'Fortes',
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
      const isStrong = ctx.trend.priceAboveEma9 && ctx.trend.ema9AboveEma30;
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
      } else if (reg.includes('trans') || reg.includes('neutr') || (ctx.marketCycle.score != null && ctx.marketCycle.score < 70)) {
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
    const grade = String(ctx.triggerGrade || 'A').toUpperCase();
    if (grade === 'A+' || grade === 'A') {
      setupQuality = 'good';
    } else if (grade === 'B') {
      setupQuality = 'medium';
    } else {
      setupQuality = 'bad';
    }

    // 5. Fundamentos - fundamentalScore
    let fundamentalScore = 'good';
    if (ctx.fundamentals) {
      if (ctx.fundamentals.available === false) {
        fundamentalScore = 'medium';
      } else if (ctx.fundamentals.roe?.positive && ctx.fundamentals.netMargin?.positive && ctx.fundamentals.netDebtToEbitda?.positive) {
        fundamentalScore = 'good';
      } else if (ctx.fundamentals.roe?.positive || ctx.fundamentals.netMargin?.positive) {
        fundamentalScore = 'medium';
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

  function formatTradeThesis(ctx) {
    if (!ctx) return '';
    const parts = [];
    const sym = ctx.symbol || 'ATIVO';
    const name = ctx.companyName && ctx.companyName !== sym ? ` (${ctx.companyName})` : '';
    parts.push(`• Ativo: ${sym}${name} — Timeframe: ${ctx.timeframe || 'Diário'}`);
    if (ctx.triggerName) {
      parts.push(`• Gatilho: ${ctx.triggerName} (Grade ${ctx.triggerGrade || 'A'})`);
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
    createInitialState,
    loadDisciplineState,
    saveDisciplineState,
    registerChartAccess,
    logBypassMotive,
    evaluatePatienceIndex,
    calculateEma,
    calculateAtr,
    detectSetupTriggers,
    classifyRelativeStrength,
    getRubricGradeVisual,
    getRubricGradeColor,
    buildTradeContext,
    inferRubricRatingsFromContext,
    formatTradeThesis
  };
});
