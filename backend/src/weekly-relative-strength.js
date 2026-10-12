'use strict';

/**
 * ==============================================================================
 * Weekly Relative Strength & Position Trade Analysis Engine
 * The Healthy Trend Trader
 * ==============================================================================
 * Constrói candles semanais agregados a partir de séries diárias e calcula
 * a Força Relativa (RS) e estrutura de tendência sob a perspectiva de Position Trade.
 */

function percent(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function calculateSMA(data, period) {
  if (!Array.isArray(data) || data.length < period) return null;
  const slice = data.slice(-period);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return Number((sum / period).toFixed(2));
}

function calculateEMA(data, period) {
  if (!Array.isArray(data) || data.length < period) return null;
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return Number(ema.toFixed(2));
}

/**
 * Normaliza qualquer data (YYYYMMDD, YYYY-MM-DD, timestamp) para a chave da semana (segunda-feira).
 */
function toWeekKey(rawDate) {
  if (!rawDate) return '';
  let y, m, d;
  if (typeof rawDate === 'string' && /^\d{8}$/.test(rawDate)) {
    y = parseInt(rawDate.slice(0, 4), 10);
    m = parseInt(rawDate.slice(4, 6), 10) - 1;
    d = parseInt(rawDate.slice(6, 8), 10);
  } else {
    const dt = new Date(rawDate);
    if (isNaN(dt.getTime())) return String(rawDate);
    y = dt.getUTCFullYear();
    m = dt.getUTCMonth();
    d = dt.getUTCDate();
  }
  const dateObj = new Date(Date.UTC(y, m, d));
  const day = dateObj.getUTCDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(dateObj.getTime() + diffToMonday * 86400000);
  return monday.toISOString().slice(0, 10);
}

/**
 * Agrega uma série de candles diários em candles semanais.
 * Cada candle semanal contém:
 * - open: preço da 1ª negociação da semana
 * - high: máxima da semana
 * - low: mínima da semana
 * - close: fechamento da última negociação da semana
 * - volume: volume total acumulado na semana
 * - date: data do último pregão da semana
 * - daysCount: número de sessões negociadas na semana
 */
function aggregateWeeklyCandles(dailyHistory) {
  if (!Array.isArray(dailyHistory) || !dailyHistory.length) return [];
  const weeks = new Map();

  for (const c of dailyHistory) {
    const close = c.adjustedClose ?? c.close;
    if (!Number.isFinite(close) || close <= 0) continue;
    const weekKey = toWeekKey(c.date);
    if (!weekKey) continue;

    const open = c.open ?? close;
    const high = c.high ?? close;
    const low = c.low ?? close;
    const volume = Number(c.volume) || 0;

    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, {
        weekKey,
        date: c.date,
        open,
        high,
        low,
        close,
        volume,
        daysCount: 1
      });
    } else {
      const w = weeks.get(weekKey);
      w.high = Math.max(w.high, high);
      w.low = Math.min(w.low, low);
      w.close = close;
      w.volume += volume;
      w.date = c.date; // atualiza para a data do último pregão registrado na semana
      w.daysCount += 1;
    }
  }

  return [...weeks.values()].sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}

/**
 * Calcula retornos semanais de 1M (4 semanas) e 3M (13 semanas).
 */
function weeklyReturns(weeklyCandles) {
  if (!Array.isArray(weeklyCandles) || weeklyCandles.length < 2) {
    return { m1: null, m3: null, currentPrice: null, has1M: false, has3M: false };
  }

  const closes = weeklyCandles.map(w => w.close).filter(Number.isFinite);
  const latest = closes[closes.length - 1];

  // 1M: 4 semanas completas atrás (índice closes.length - 5)
  const has1M = closes.length >= 5;
  const ref1M = has1M ? closes[closes.length - 5] : closes[0];

  // 3M: 13 semanas completas atrás (índice closes.length - 14)
  const has3M = closes.length >= 14;
  const ref3M = has3M ? closes[closes.length - 14] : closes[0];

  return {
    currentPrice: latest,
    m1: percent(latest, ref1M),
    m3: percent(latest, ref3M),
    has1M,
    has3M
  };
}

/**
 * Avalia a estrutura de tendência no timeframe semanal (Position Trade).
 * Utiliza EMA 9 semanas (curto prazo), EMA 21 semanas (médio prazo) e SMA 40 semanas (longo prazo).
 */
function getWeeklyTrendState(weeklyCandles) {
  const closes = (Array.isArray(weeklyCandles) ? weeklyCandles.map(w => w.close) : []).filter(Number.isFinite);

  if (closes.length < 9) {
    return {
      state: 'NEUTRAL',
      ema9: null,
      ema21: null,
      sma40: null,
      latestClose: closes[closes.length - 1] || null,
      reason: 'Histórico insuficiente (< 9 semanas) para médias semanais.',
      summary: 'Histórico curto'
    };
  }

  const latestClose = closes[closes.length - 1];
  const ema9 = calculateEMA(closes, 9);
  const ema21 = closes.length >= 21 ? calculateEMA(closes, 21) : null;
  const sma40 = closes.length >= 40 ? calculateSMA(closes, 40) : null;

  let state = 'NEUTRAL';
  let reason = '';

  if (ema21 !== null) {
    const aboveEma9 = latestClose > ema9;
    const aboveEma21 = latestClose > ema21;
    const ema9Above21 = ema9 > ema21;

    if (aboveEma9 && aboveEma21 && ema9Above21) {
      if (sma40 !== null && latestClose > sma40 && ema21 > sma40) {
        state = 'BULLISH';
        reason = 'Tendência de Alta estrutural plena (preço acima das EMAs 9, 21 e SMA 40 semanais).';
      } else {
        state = 'BULLISH';
        reason = 'Tendência de Alta semanal confirmada (preço > EMA 9 > EMA 21 semanais).';
      }
    } else if (!aboveEma21 && ema9 < ema21) {
      state = 'BEARISH';
      reason = 'Tendência de Baixa semanal (preço abaixo da EMA 21 e EMA 9 descendente).';
    } else {
      state = 'NEUTRAL';
      reason = 'Transição ou consolidação em relação às médias móveis semanais.';
    }
  } else {
    state = latestClose > ema9 ? 'BULLISH' : 'NEUTRAL';
    reason = `Tendência avaliada pela EMA 9 semanal (${latestClose > ema9 ? 'alta' : 'neutra'}).`;
  }

  return {
    state,
    ema9,
    ema21,
    sma40,
    latestClose,
    reason,
    summary: state === 'BULLISH' ? 'Alta semanal' : state === 'BEARISH' ? 'Baixa semanal' : 'Transição'
  };
}

/**
 * Resolve a classificação operacional para a modalidade Position Trade (Semanal).
 * Faixas padronizadas:
 * - Líder: RS ≥ 90 (com proteção de tendência estrutural)
 * - Qualificado: RS 80–89
 * - Acompanhar: RS 70–79
 * - Em observação: RS 50–69 (ou RS elevado com tendência semanal baixista)
 * - Abaixo do filtro: RS < 50
 */
function resolveWeeklyClassification(score, trendState = 'NEUTRAL') {
  const normScore = Math.max(0, Math.min(100, Math.round(score)));

  if (normScore >= 90) {
    if (trendState === 'BULLISH') {
      return {
        classification: 'Líder',
        bandKey: 'leader',
        trendTemplate: 'leader',
        label: 'Líder Estrutural',
        reason: `Força relativa de topo (RS ${normScore}) com tendência semanal de alta confirmada.`
      };
    }
    if (trendState === 'NEUTRAL') {
      return {
        classification: 'Qualificado',
        bandKey: 'qualified',
        trendTemplate: 'qualified',
        label: 'Qualificado (RS Topo)',
        reason: `Força relativa elevada (RS ${normScore}), porém consolidação no gráfico semanal.`
      };
    }
    // Se a tendência semanal for BEARISH, nunca é Líder (proteção de capital)
    return {
      classification: 'Em observação',
      bandKey: 'observation',
      trendTemplate: 'watch',
      label: 'Em observação',
      reason: `RS elevado (RS ${normScore}), mas estrutura semanal baixista. Requer reversão de médio prazo.`
    };
  }

  if (normScore >= 80) {
    if (trendState === 'BEARISH') {
      return {
        classification: 'Em observação',
        bandKey: 'observation',
        trendTemplate: 'watch',
        label: 'Em observação',
        reason: `RS qualificado (RS ${normScore}), porém tendência semanal baixista.`
      };
    }
    return {
      classification: 'Qualificado',
      bandKey: 'qualified',
      trendTemplate: 'qualified',
      label: 'Qualificado',
      reason: `Boa força relativa (RS ${normScore}) com estrutura semanal positiva.`
    };
  }

  if (normScore >= 70) {
    if (trendState === 'BEARISH') {
      return {
        classification: 'Em observação',
        bandKey: 'observation',
        trendTemplate: 'watch',
        label: 'Em observação',
        reason: `Momentum intermediário (RS ${normScore}) com tendência semanal fragilizada.`
      };
    }
    return {
      classification: 'Acompanhar',
      bandKey: 'watch',
      trendTemplate: 'watch',
      label: 'Acompanhar',
      reason: `Sinais mistos (RS ${normScore}). Acompanhar evolução estrutural.`
    };
  }

  if (normScore >= 50) {
    return {
      classification: 'Em observação',
      bandKey: 'observation',
      trendTemplate: 'below-threshold',
      label: 'Em observação',
      reason: `Força limitada (RS ${normScore}). Aguardar confirmação de fluxo.`
    };
  }

  return {
    classification: 'Abaixo do filtro',
    bandKey: 'laggard',
    trendTemplate: 'below-threshold',
    label: 'Abaixo do filtro',
    reason: `Força relativa fraca (RS ${normScore}). Fora do escopo operacional no momento.`
  };
}

/**
 * Ordena e atribui scores percentis (0 a 100) para um conjunto de itens semanais.
 */
function rankWeeklyItems(items) {
  const sorted = [...items].sort((a, b) => b.relativeScore - a.relativeScore);
  const total = sorted.length;

  return sorted.map((item, index) => {
    const score = total === 1 ? 100 : Math.round(100 - (index / (total - 1)) * 100);
    const classification = resolveWeeklyClassification(score, item.trendState);

    return {
      ...item,
      rank: index + 1,
      score,
      rsScore: score,
      classification: classification.classification,
      bandKey: classification.bandKey,
      trendTemplate: classification.trendTemplate,
      reason: classification.reason
    };
  });
}

/**
 * Constrói e ranqueia uma classe de ativos inteira no timeframe semanal.
 */
function buildWeeklyClass({ assetClass, catalogItems, histories, benchmarkDailyHistory, benchmarkSymbol, benchmarkName }) {
  const benchmarkWeekly = aggregateWeeklyCandles(benchmarkDailyHistory || []);
  const benchmarkRet = weeklyReturns(benchmarkWeekly);

  const scored = [];
  for (const item of (catalogItems || [])) {
    const history = histories instanceof Map ? histories.get(item.symbol) : histories[item.symbol];
    if (!history || !history.length) continue;
    const weeklyCandles = aggregateWeeklyCandles(history);
    const ret = weeklyReturns(weeklyCandles);
    if (!Number.isFinite(ret.m1) || !Number.isFinite(ret.m3)) continue;
    const trendInfo = getWeeklyTrendState(weeklyCandles);

    const relScore = Number.isFinite(benchmarkRet.m1) && Number.isFinite(benchmarkRet.m3)
      ? (ret.m1 - benchmarkRet.m1) * 0.35 + (ret.m3 - benchmarkRet.m3) * 0.65
      : (ret.m1 * 0.35 + ret.m3 * 0.65);

    scored.push({
      symbol: item.symbol,
      name: item.name || item.symbol,
      sector: item.sector || 'Não classificado',
      assetClass,
      currentPrice: ret.currentPrice,
      m1: ret.m1,
      m3: ret.m3,
      benchmark: benchmarkSymbol,
      benchmark1M: benchmarkRet.m1,
      benchmark3M: benchmarkRet.m3,
      relativeScore: relScore,
      trendState: trendInfo.state,
      weeklyTrend: trendInfo,
      timeframe: 'weekly'
    });
  }

  const ranked = rankWeeklyItems(scored);
  return {
    key: assetClass,
    assetClass,
    benchmark: benchmarkSymbol,
    benchmarkName: benchmarkName || benchmarkSymbol,
    returns: benchmarkRet,
    timeframe: 'weekly',
    requested: (catalogItems || []).length,
    available: ranked.length,
    items: ranked
  };
}

module.exports = {
  percent,
  calculateSMA,
  calculateEMA,
  toWeekKey,
  aggregateWeeklyCandles,
  weeklyReturns,
  getWeeklyTrendState,
  resolveWeeklyClassification,
  rankWeeklyItems,
  buildWeeklyClass
};
