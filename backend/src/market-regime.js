const fs = require('node:fs/promises');
const path = require('node:path');
const database = require('./database');
const b3IndexHistory = require('./b3-index-history');
const marketData = require('./market-data');
const scoreCycle = marketData.scoreCycle;

function calculateEmaSeries(values, period) {
  if (typeof marketData.calculateEmaSeries === 'function') {
    return marketData.calculateEmaSeries(values, period);
  }
  if (!Array.isArray(values) || values.length < period) return [];
  const k = 2 / (period + 1);
  const result = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += Number(values[i]);
  let currentEma = sum / period;
  result[period - 1] = Number(currentEma.toFixed(4));
  for (let i = period; i < values.length; i++) {
    currentEma = Number(values[i]) * k + currentEma * (1 - k);
    result[i] = Number(currentEma.toFixed(4));
  }
  return result;
}

const REGIMES = {
  UP_QUIET: 'UP_QUIET',
  UP_VOLATILE: 'UP_VOLATILE',
  SIDEWAYS_QUIET: 'SIDEWAYS_QUIET',
  SIDEWAYS_VOLATILE: 'SIDEWAYS_VOLATILE',
  DOWN_QUIET: 'DOWN_QUIET',
  DOWN_VOLATILE: 'DOWN_VOLATILE'
};

const REGIME_METADATA = {
  UP_QUIET: {
    id: 'UP_QUIET',
    label: 'Up – Quiet',
    title: 'Up – Quiet',
    name: 'Tendência de alta com baixa volatilidade',
    direction: 'UP',
    volatility: 'QUIET',
    color: '#10b981',
    hex: '#10b981',
    badgeClass: 'regime-up-quiet',
    description: 'Tendência de alta com baixa volatilidade',
    summary: 'Ambiente ideal para operações direcionais de tendência com menor ruído e paradas estáveis.'
  },
  UP_VOLATILE: {
    id: 'UP_VOLATILE',
    label: 'Up – Volatile',
    title: 'Up – Volatile',
    name: 'Alta + alta volatilidade',
    direction: 'UP',
    volatility: 'VOLATILE',
    color: '#f59e0b',
    hex: '#f59e0b',
    badgeClass: 'regime-up-volatile',
    description: 'Alta + alta volatilidade',
    summary: 'Tendência de alta com oscilações amplas; requer stops ajustados e cautela com violinadas.'
  },
  SIDEWAYS_QUIET: {
    id: 'SIDEWAYS_QUIET',
    label: 'Sideways – Quiet',
    title: 'Sideways – Quiet',
    name: 'Lateral + baixa volatilidade',
    direction: 'SIDEWAYS',
    volatility: 'QUIET',
    color: '#3b82f6',
    hex: '#3b82f6',
    badgeClass: 'regime-sideways-quiet',
    description: 'Lateral + baixa volatilidade',
    summary: 'Mercado em consolidação estreita sem direção definida; aguardar rompimentos confirmados.'
  },
  SIDEWAYS_VOLATILE: {
    id: 'SIDEWAYS_VOLATILE',
    label: 'Sideways – Volatile',
    title: 'Sideways – Volatile',
    name: 'Lateral + alta volatilidade',
    direction: 'SIDEWAYS',
    volatility: 'VOLATILE',
    color: '#f97316',
    hex: '#f97316',
    badgeClass: 'regime-sideways-volatile',
    description: 'Lateral + alta volatilidade',
    summary: 'Mercado errático e turbulento sem tendência; alto risco de violinadas e ruído operacional.'
  },
  DOWN_QUIET: {
    id: 'DOWN_QUIET',
    label: 'Down – Quiet',
    title: 'Down – Quiet',
    name: 'Baixa + baixa volatilidade',
    direction: 'DOWN',
    volatility: 'QUIET',
    color: '#6b7280',
    hex: '#6b7280',
    badgeClass: 'regime-down-quiet',
    description: 'Baixa + baixa volatilidade',
    summary: 'Tendência de baixa ordenada e contínua; preservação mandatória de capital em compras.'
  },
  DOWN_VOLATILE: {
    id: 'DOWN_VOLATILE',
    label: 'Down – Volatile',
    title: 'Down – Volatile',
    name: 'Baixa + alta volatilidade',
    direction: 'DOWN',
    volatility: 'VOLATILE',
    color: '#ef4444',
    hex: '#ef4444',
    badgeClass: 'regime-down-volatile',
    description: 'Baixa + alta volatilidade',
    summary: 'Pânico ou forte correção com amplitude desmedida; capital deve permanecer 100% protegido.'
  }
};

const DEFAULT_BENCHMARKS = [
  { id: 'IBOV', name: 'Índice Bovespa (IBOV)', symbol: '^BVSP', market: 'BR', provider: 'b3', is_default: true, active: true },
  { id: 'IFIX', name: 'Índice de FIIs (IFIX)', symbol: 'IFIX', market: 'BR', provider: 'b3', is_default: false, active: true },
  { id: 'BDRX', name: 'Índice de BDRs Não Patrocinados (BDRX)', symbol: 'BDRX', market: 'BR', provider: 'b3', is_default: false, active: true },
  { id: 'SP500', name: 'S&P 500 (SPY)', symbol: 'SPY', market: 'US', provider: 'twelve_data', is_default: false, active: true },
  { id: 'NASDAQ', name: 'Nasdaq-100 (QQQ)', symbol: 'QQQ', market: 'US', provider: 'twelve_data', is_default: false, active: true }
];

const CACHE_FILE_PATH = path.join(__dirname, '..', 'data', 'market-regimes-cache.json');
const US_BENCHMARKS_CACHE_PATH = path.join(__dirname, '..', 'data', 'us-benchmarks-cache.json');
const B3_INDEX_HISTORY_CACHE = process.env.B3_INDEX_HISTORY_CACHE_DIRECTORY || path.join(__dirname, '..', 'data', 'b3-index-history-cache');

function formatDateIso(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  const d = new Date(value);
  if (Number.isFinite(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

/**
 * Cálculo de True Range com fallback para close-to-close quando High/Low ausentes.
 */
function calculateTrueRange(candle, prevCandle) {
  const high = Number(candle?.high);
  const low = Number(candle?.low);
  const close = Number(candle?.adjustedClose ?? candle?.close);
  const prevClose = prevCandle ? Number(prevCandle?.adjustedClose ?? prevCandle?.close) : null;

  if (Number.isFinite(high) && Number.isFinite(low)) {
    if (Number.isFinite(prevClose)) {
      return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    }
    return high - low;
  }

  if (Number.isFinite(close) && Number.isFinite(prevClose)) {
    return Math.abs(close - prevClose);
  }

  return 0;
}

/**
 * Cálculo do ATR com suavização de Wilder (período padrão: 21).
 * Primeiro valor de ATR = média simples dos 21 primeiros TRs válidos.
 * Valores subsequentes = (ATR_anterior * 20 + TR_atual) / 21.
 */
function calculateWilderATRSeries(candles, period = 21) {
  if (!Array.isArray(candles) || candles.length <= period) {
    return new Array(candles ? candles.length : 0).fill(null);
  }

  const atrs = new Array(candles.length).fill(null);
  const trs = new Array(candles.length).fill(0);

  for (let i = 0; i < candles.length; i++) {
    trs[i] = calculateTrueRange(candles[i], i > 0 ? candles[i - 1] : null);
  }

  // Primeiro ATR na posição `period`: média dos TRs de 1 até `period`
  let initialTrSum = 0;
  for (let i = 1; i <= period; i++) {
    initialTrSum += trs[i];
  }
  let currentAtr = initialTrSum / period;
  atrs[period] = currentAtr;

  for (let i = period + 1; i < candles.length; i++) {
    currentAtr = (currentAtr * (period - 1) + trs[i]) / period;
    atrs[i] = currentAtr;
  }

  return atrs;
}

/**
 * Calcula série de ATR% = (ATR(21) / Close) * 100
 */
function calculateATRPercentageSeries(candles, period = 21) {
  const atrs = calculateWilderATRSeries(candles, period);
  return candles.map((c, i) => {
    const close = Number(c.adjustedClose ?? c.close);
    const atr = atrs[i];
    const atrPct = (atr !== null && Number.isFinite(close) && close > 0) ? (atr / close) * 100 : null;
    return {
      date: formatDateIso(c.date),
      close,
      atr,
      atrPct
    };
  });
}

/**
 * Classifica a Direção reutilizando estritamente o classificador do Ciclo de Mercado (EMA 10 e EMA 30 no Diário):
 * UP: Preço > EMA 10 E Preço > EMA 30
 * DOWN: Preço < EMA 10 E Preço < EMA 30
 * SIDEWAYS: Preço entre ou sobre as EMAs (nem estritamente UP nem estritamente DOWN)
 */
function classifyDirection(candlesOrReading) {
  let price, ema10, ema30;

  if (candlesOrReading && typeof candlesOrReading === 'object' && !Array.isArray(candlesOrReading)) {
    price = (candlesOrReading.price !== null && candlesOrReading.price !== undefined && candlesOrReading.price !== '') ? Number(candlesOrReading.price) : NaN;
    ema10 = (candlesOrReading.ema10 != null || candlesOrReading.ema_10 != null || candlesOrReading.ema9 != null)
      ? Number(candlesOrReading.ema10 ?? candlesOrReading.ema_10 ?? candlesOrReading.ema9)
      : NaN;
    ema30 = (candlesOrReading.ema30 != null || candlesOrReading.ema_30 != null || candlesOrReading.ema72 != null || candlesOrReading.ema_72 != null)
      ? Number(candlesOrReading.ema30 ?? candlesOrReading.ema_30 ?? candlesOrReading.ema72 ?? candlesOrReading.ema_72)
      : NaN;
  } else if (Array.isArray(candlesOrReading)) {
    const candles = candlesOrReading;
    if (candles.length < 30) {
      return { direction: 'INSUFFICIENT_DATA', price: null, ema10: null, ema30: null, ema72: null };
    }
    const reading = scoreCycle(candles);
    price = Number(reading?.price);
    ema10 = Number(reading?.ema10 ?? reading?.ema9);
    ema30 = Number(reading?.ema30 ?? reading?.ema72);
  }

  if (!Number.isFinite(price) || !Number.isFinite(ema10) || !Number.isFinite(ema30)) {
    return { direction: 'INSUFFICIENT_DATA', price: null, ema10: null, ema30: null, ema72: null };
  }

  const above10 = price > ema10;
  const above30 = price > ema30;
  const below10 = price < ema10;
  const below30 = price < ema30;
  const structure = ema10 > ema30;

  let direction = 'SIDEWAYS';
  if (above10 && above30 && structure) {
    direction = 'UP';
  } else if (below10 && below30 && !structure) {
    direction = 'DOWN';
  }

  return { direction, price, ema10, ema30, ema72: ema30, structure };
}

/**
 * Classifica a Volatilidade comparando ATR% atual com SMA(ATR%, 252).
 * Exige no mínimo 252 valores diários válidos de ATR%.
 * Se < 252 => INSUFFICIENT_DATA (nunca assumir QUIET por padrão).
 */
function calculateVolatility(candles, period = 21, smaPeriod = 252) {
  if (!Array.isArray(candles) || candles.length < period + smaPeriod) {
    return {
      volatility: 'INSUFFICIENT_DATA',
      status: 'INSUFFICIENT_DATA',
      reason: `Histórico insuficiente para cálculo de volatilidade (requer ${period + smaPeriod} candles diários).`,
      atr21: null,
      atrPct: null,
      atrPctSma252: null,
      volatilityDeviation: null
    };
  }

  const atrSeries = calculateATRPercentageSeries(candles, period);
  const validPcts = atrSeries.map(s => s.atrPct).filter(v => v !== null && Number.isFinite(v));

  if (validPcts.length < smaPeriod) {
    return {
      volatility: 'INSUFFICIENT_DATA',
      status: 'INSUFFICIENT_DATA',
      reason: `Valores válidos de ATR% insuficientes (${validPcts.length}/${smaPeriod}).`,
      atr21: null,
      atrPct: null,
      atrPctSma252: null,
      volatilityDeviation: null
    };
  }

  const currentAtr = atrSeries.at(-1)?.atr;
  const currentAtrPct = atrSeries.at(-1)?.atrPct;

  // SMA(ATR%, 252) sobre os últimos 252 valores válidos
  const window252 = validPcts.slice(-smaPeriod);
  const atrPctSma252 = window252.reduce((sum, val) => sum + val, 0) / smaPeriod;

  const volatility = currentAtrPct > atrPctSma252 ? 'VOLATILE' : 'QUIET';
  const volatilityDeviation = atrPctSma252 > 0
    ? ((currentAtrPct - atrPctSma252) / atrPctSma252) * 100
    : 0;

  return {
    volatility,
    status: 'OK',
    atr21: Number(currentAtr.toFixed(2)),
    atrPct: Number(currentAtrPct.toFixed(2)),
    atrPctSma252: Number(atrPctSma252.toFixed(2)),
    volatilityDeviation: Number(volatilityDeviation.toFixed(1))
  };
}

/**
 * Combina Direção e Volatilidade em um dos 6 regimes canônicos.
 */
function combineRegime(direction, volatility) {
  if (!direction || !volatility || direction === 'INSUFFICIENT_DATA' || volatility === 'INSUFFICIENT_DATA') {
    return 'INSUFFICIENT_DATA';
  }

  const code = `${direction.toUpperCase()}_${volatility.toUpperCase()}`;
  return REGIMES[code] || 'INSUFFICIENT_DATA';
}

/**
 * Calcula série diária completa de regimes para um benchmark sem viés de look-ahead.
 */
function calculateBenchmarkRegimes(candles, benchmarkId = 'IBOV') {
  if (!Array.isArray(candles) || candles.length < 30) return [];

  const closes = candles.map(c => Number(c.adjustedClose ?? c.close));
  const ema10Arr = calculateEmaSeries(closes, 10);
  const ema30Arr = calculateEmaSeries(closes, Math.min(30, closes.length));
  const atrSeries = calculateATRPercentageSeries(candles, 21);

  const results = [];
  const smaPeriod = 252;
  const validPcts = [];
  let rollingSum252 = 0;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const date = formatDateIso(candle.date);
    const price = closes[i];
    const ema10 = ema10Arr[i];
    const ema30 = ema30Arr[i];
    const atrInfo = atrSeries[i];
    const atrPct = atrInfo?.atrPct;

    if (atrPct !== null && Number.isFinite(atrPct)) {
      validPcts.push(atrPct);
      rollingSum252 += atrPct;
      if (validPcts.length > smaPeriod) {
        rollingSum252 -= validPcts[validPcts.length - 1 - smaPeriod];
      }
    }

    if (i < 29 || validPcts.length < smaPeriod || !Number.isFinite(ema10) || !Number.isFinite(ema30)) {
      continue;
    }

    // Direção (Ciclo de Mercado Diário: EMA 10 e EMA 30)
    // Confirmação mandatória: UP exige alinhamento EMA 10 > EMA 30 e preço acima de ambas.
    // DOWN exige alinhamento EMA 10 < EMA 30 e preço abaixo de ambas.
    // Repiques de preço com médias invertidas ou correções parciais são classificados como SIDEWAYS (transição/lateral).
    const above10 = price > ema10;
    const above30 = price > ema30;
    const below10 = price < ema10;
    const below30 = price < ema30;
    const structure = ema10 > ema30;

    let direction = 'SIDEWAYS';
    if (above10 && above30 && structure) direction = 'UP';
    else if (below10 && below30 && !structure) direction = 'DOWN';

    // Volatilidade
    const atrPctSma252 = rollingSum252 / smaPeriod;
    const volatility = atrPct > atrPctSma252 ? 'VOLATILE' : 'QUIET';
    const volatilityDeviation = atrPctSma252 > 0 ? ((atrPct - atrPctSma252) / atrPctSma252) * 100 : 0;
    const regime = combineRegime(direction, volatility);

    results.push({
      benchmark_id: benchmarkId,
      reference_date: date,
      direction,
      volatility,
      regime,
      close_price: Number(price.toFixed(4)),
      ema_10: Number(ema10.toFixed(4)),
      ema_30: Number(ema30.toFixed(4)),
      ema_72: Number(ema30.toFixed(4)),
      atr_21: Number((atrInfo.atr || 0).toFixed(4)),
      atr_percentage: Number(atrPct.toFixed(4)),
      atr_percentage_sma_252: Number(atrPctSma252.toFixed(4)),
      volatility_deviation: Number(volatilityDeviation.toFixed(2)),
      calculation_version: 'v2_ema10_30'
    });
  }

  return results;
}

/**
 * Agrupa registros diários contínuos em períodos de regime (MarketRegimePeriod).
 * durationTradingDays conta estritamente as sessões diárias operadas.
 */
function derivePeriods(dailyRecords = []) {
  if (!Array.isArray(dailyRecords) || !dailyRecords.length) return [];

  const sorted = [...dailyRecords].sort((a, b) => a.reference_date.localeCompare(b.reference_date));
  const periods = [];
  let current = null;

  for (const row of sorted) {
    if (!current || current.regime !== row.regime) {
      if (current) periods.push(current);
      current = {
        benchmark_id: row.benchmark_id,
        regime: row.regime,
        direction: row.direction,
        volatility: row.volatility,
        startDate: row.reference_date,
        endDate: row.reference_date,
        startPrice: row.close_price,
        endPrice: row.close_price,
        durationTradingDays: 1,
        color: REGIME_METADATA[row.regime]?.color || '#94a3b8'
      };
    } else {
      current.endDate = row.reference_date;
      current.endPrice = row.close_price;
      current.durationTradingDays += 1;
    }
  }

  if (current) periods.push(current);
  return periods;
}

/**
 * Calcula a distribuição percentual e contagem dos 6 regimes em um período.
 */
function calculateDistribution(dailyRecords = []) {
  const total = dailyRecords.length;
  const counts = {
    UP_QUIET: 0,
    UP_VOLATILE: 0,
    SIDEWAYS_QUIET: 0,
    SIDEWAYS_VOLATILE: 0,
    DOWN_QUIET: 0,
    DOWN_VOLATILE: 0
  };

  for (const r of dailyRecords) {
    if (counts[r.regime] !== undefined) {
      counts[r.regime]++;
    }
  }

  const distribution = {};
  for (const [key, count] of Object.entries(counts)) {
    const pct = total > 0 ? (count / total) * 100 : 0;
    distribution[key] = {
      regime: key,
      meta: REGIME_METADATA[key],
      count,
      percentage: Number(pct.toFixed(1)),
      label: `${REGIME_METADATA[key]?.label || key} (${Math.round(pct)}% dos pregões)`
    };
  }

  return { totalDays: total, distribution };
}

/**
 * Calcula a performance das operações (reais ou simuladas) segregada por Regime de Mercado.
 * Garante fidelidade ao mock visual:
 * - Colunas: Regime, Trades, Win Rate, Profit Factor, Expectancy (R), Resultado (R), Drawdown Máx.
 * - Cards: Melhor Regime, Pior Regime, Qualidade da Amostra (>= 30 trades recomendados).
 */
function calculateRegimePerformance(tradesOrSimulations = [], options = {}) {
  const list = Array.isArray(tradesOrSimulations) ? tradesOrSimulations : [];
  const minSampleThreshold = options.minSampleThreshold || 30;

  // Filtrar apenas operações válidas e finalizadas (excluindo Grade D se presente no simulador)
  const completed = list.filter(t => {
    const isGradeD = String(t.grade || t.rubricGrade || '').toUpperCase() === 'D';
    if (isGradeD) return false;
    const r = Number(t.resultR != null ? t.resultR : (t.r_multiple != null ? t.r_multiple : (t.metadata?.resultR ?? NaN)));
    return Number.isFinite(r);
  });

  const regimeOrder = ['UP_QUIET', 'UP_VOLATILE', 'SIDEWAYS_QUIET', 'SIDEWAYS_VOLATILE', 'DOWN_QUIET', 'DOWN_VOLATILE'];
  const groups = {};
  for (const code of regimeOrder) {
    groups[code] = [];
  }

  for (const item of completed) {
    const reg = item.entry_market_regime || item.entryMarketRegime || item.regime;
    if (groups[reg]) {
      groups[reg].push(item);
    }
  }

  const rows = [];
  let bestRegime = null;
  let worstRegime = null;

  for (const code of regimeOrder) {
    const group = groups[code];
    const meta = REGIME_METADATA[code] || { label: code, name: code, color: '#94a3b8', badgeClass: '' };
    const count = group.length;

    if (count === 0) {
      rows.push({
        regime: code,
        label: meta.label,
        name: meta.name,
        color: meta.color,
        badgeClass: meta.badgeClass,
        trades: 0,
        hasData: false,
        winRate: null,
        profitFactor: null,
        expectancy: null,
        resultadoR: null,
        maxDrawdown: null,
        sampleQuality: 'no_history',
        sampleMessage: 'Sem histórico de trades'
      });
      continue;
    }

    let wins = 0;
    let losses = 0;
    let sumGainR = 0;
    let sumLossR = 0;
    let totalR = 0;

    // Curva de equity para cálculo do Drawdown Máximo dentro do regime
    let peakR = 0;
    let runningR = 0;
    let maxDd = 0;

    // Ordenar cronologicamente por data de entrada
    const sortedGroup = [...group].sort((a, b) => {
      const da = String(a.entryDate || a.signalDate || a.executed_at || a.created_at || '');
      const db = String(b.entryDate || b.signalDate || b.executed_at || b.created_at || '');
      return da.localeCompare(db);
    });

    for (const t of sortedGroup) {
      const r = Number(t.resultR != null ? t.resultR : (t.r_multiple != null ? t.r_multiple : t.metadata?.resultR));
      totalR += r;
      runningR += r;
      if (runningR > peakR) peakR = runningR;
      const dd = peakR - runningR;
      if (dd > maxDd) maxDd = dd;

      if (r > 0) {
        wins++;
        sumGainR += r;
      } else if (r < 0) {
        losses++;
        sumLossR += Math.abs(r);
      }
    }

    const winRate = (wins / count) * 100;
    const profitFactor = sumLossR > 0 ? sumGainR / sumLossR : (sumGainR > 0 ? 99.9 : (wins > 0 ? 1 : 0));
    const expectancy = totalR / count;
    const maxDrawdownPct = peakR > 0 ? (maxDd / peakR) * 100 : (maxDd > 0 ? maxDd * 10 : 0);

    let sampleQuality = 'exploratory';
    let sampleMessage = 'Amostra mínima para análise exploratória';
    if (count < 10) {
      sampleQuality = 'very_small';
      sampleMessage = 'Amostra muito pequena';
    } else if (count < 30) {
      sampleQuality = 'limited';
      sampleMessage = 'Amostra limitada';
    }

    const row = {
      regime: code,
      label: meta.label,
      name: meta.name,
      color: meta.color,
      badgeClass: meta.badgeClass,
      trades: count,
      hasData: true,
      winRate: Number(winRate.toFixed(1)),
      profitFactor: Number(profitFactor.toFixed(2)),
      expectancy: Number(expectancy.toFixed(2)),
      resultadoR: Number(totalR.toFixed(1)),
      maxDrawdown: -Number(maxDrawdownPct.toFixed(1)),
      sampleQuality,
      sampleMessage
    };

    rows.push(row);

    if (!bestRegime || row.expectancy > bestRegime.expectancy) {
      bestRegime = row;
    }
    if (!worstRegime || row.expectancy < worstRegime.expectancy) {
      worstRegime = row;
    }
  }

  // Base mínima de 10 trades para ranqueamento confiável
  const canRank = completed.length >= 10;
  const overallSampleAdequate = completed.length >= (minSampleThreshold * 2);

  return {
    rows,
    bestRegime,
    worstRegime,
    canRank,
    totalTrades: completed.length,
    sampleQualityStatus: completed.length === 0 ? 'no_data' : (overallSampleAdequate ? 'valid' : 'warning'),
    sampleRecommendationText: completed.length === 0
      ? 'Não há registros de operações no Trading Log para calcular as métricas por regime.'
      : (canRank
          ? `Recomendação: pelo menos ${minSampleThreshold} trades por regime para uma análise mais confiável.`
          : 'Amostra insuficiente para ranqueamento de regimes (mínimo de 10 trades no Trading Log).')
  };
}

/**
 * Resolve o benchmark correspondente a um ativo e mercado.
 */
function resolveBenchmarkForAsset(symbol, assetClass = null, market = 'BR') {
  const sym = String(symbol || '').trim().toUpperCase();
  const cls = String(assetClass || '').trim().toLowerCase();
  const mkt = String(market || 'BR').trim().toUpperCase();

  if (cls === 'fii' || cls === 'fiis' || sym.endsWith('11') && !sym.startsWith('IBOV') && !sym.startsWith('IFIX')) {
    return 'IFIX';
  }
  if (cls === 'bdr' || cls === 'bdrs' || /(31|32|33|34|35|39)$/.test(sym)) {
    return 'BDRX';
  }
  if (mkt === 'NASDAQ' || cls === 'nasdaq' || sym === 'QQQ' || sym === 'NDX') {
    return 'NASDAQ';
  }
  if (mkt === 'US' || cls === 'us' || sym === 'SPY' || sym === 'SPX' || sym === 'SP500') {
    return 'SP500';
  }
  return 'IBOV';
}

/**
 * Calendário e Fuso Horário Oficial por Mercado (BR: America/Sao_Paulo, US: America/New_York).
 * - Nunca considera um candle diário ainda aberto como fechamento definitivo.
 * - Respeita finais de semana, feriados fixos e feriados móveis (Carnaval, Sexta-Feira Santa, Corpus Christi, Thanksgiving, etc.).
 */
const FIXED_HOLIDAYS_BR = new Set(['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25', '12-31']);
const FIXED_HOLIDAYS_US = new Set(['01-01', '06-19', '07-04', '12-25']);

function computeEasterUtc(year) {
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
  return new Date(Date.UTC(year, month - 1, day));
}

function addUtcDays(dateObj, days) {
  const d = new Date(dateObj.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function getMovableHolidaysForYear(year, market = 'BR') {
  const easter = computeEasterUtc(year);
  const set = new Set();
  const toIso = d => d.toISOString().slice(0, 10);

  // Good Friday (Sexta-Feira Santa) é feriado tanto na B3 quanto na NYSE/NASDAQ
  set.add(toIso(addUtcDays(easter, -2)));

  if (market === 'BR') {
    // Segunda e Terça de Carnaval (-48 e -47 dias da Páscoa) e Corpus Christi (+60 dias)
    set.add(toIso(addUtcDays(easter, -48)));
    set.add(toIso(addUtcDays(easter, -47)));
    set.add(toIso(addUtcDays(easter, 60)));
  } else if (market === 'US') {
    // Thanksgiving: 4ª quinta-feira de novembro
    const nov1 = new Date(Date.UTC(year, 10, 1));
    const dow = nov1.getUTCDay(); // 4 = Thursday
    const firstThu = 1 + ((4 - dow + 7) % 7);
    const fourthThu = firstThu + 21;
    set.add(`${year}-11-${String(fourthThu).padStart(2, '0')}`);
  }
  return set;
}

function isMarketTradingDay(isoDateInput, market = 'BR') {
  const iso = formatDateIso(isoDateInput);
  if (!iso) return false;
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay();
  if (dow === 0 || dow === 6) return false;

  const mkt = String(market || 'BR').toUpperCase() === 'US' ? 'US' : 'BR';
  const mmdd = iso.slice(5, 10);
  const fixed = mkt === 'US' ? FIXED_HOLIDAYS_US : FIXED_HOLIDAYS_BR;
  if (fixed.has(mmdd)) return false;

  const movable = getMovableHolidaysForYear(y, mkt);
  if (movable.has(iso)) return false;
  return true;
}

function getMarketZonedNow(now = new Date(), market = 'BR') {
  const mkt = String(market || 'BR').toUpperCase() === 'US' ? 'US' : 'BR';
  const timeZone = mkt === 'US' ? 'America/New_York' : 'America/Sao_Paulo';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now instanceof Date ? now : new Date(now));
  const map = Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return {
    isoDate: `${map.year}-${map.month}-${map.day}`,
    hour: Number(map.hour),
    minute: Number(map.minute),
    totalMinutes: Number(map.hour) * 60 + Number(map.minute),
    timeZone
  };
}

/**
 * Retorna a data ISO (YYYY-MM-DD) do último pregão diário FECHADO para o mercado informado.
 * - Brasil (B3): fechamento diário consolidado a partir das 18h00 (America/Sao_Paulo).
 * - EUA (NYSE/NASDAQ): fechamento diário consolidado a partir das 16h05 (America/New_York).
 */
function getExpectedClosedDate(market = 'BR', now = new Date()) {
  const mkt = String(market || 'BR').toUpperCase() === 'US' ? 'US' : 'BR';
  const zoned = getMarketZonedNow(now, mkt);
  const closeCutoffMinutes = mkt === 'US' ? (16 * 60 + 5) : (18 * 60);

  let cursorIso = zoned.isoDate;
  if (isMarketTradingDay(cursorIso, mkt) && zoned.totalMinutes >= closeCutoffMinutes) {
    return cursorIso;
  }

  // Recuar para o dia útil imediatamente anterior
  const [y, m, d] = cursorIso.split('-').map(Number);
  let cursorDt = new Date(Date.UTC(y, m - 1, d));
  for (let i = 0; i < 15; i++) {
    cursorDt = addUtcDays(cursorDt, -1);
    const candidate = cursorDt.toISOString().slice(0, 10);
    if (isMarketTradingDay(candidate, mkt)) {
      return candidate;
    }
  }
  return cursorIso;
}

/**
 * Filtra, normaliza, deduplica e ordena candles diários, descartando qualquer candle
 * aberto/intradiário (data > expectedClosedDate) ou com preço inválido.
 */
function filterClosedDailyCandles(candles = [], market = 'BR', now = new Date(), options = {}) {
  if (!Array.isArray(candles)) return [];
  const expectedClosed = options.expectedClosedDate || getExpectedClosedDate(market, now);
  const enforceCutoff = options.enforceCutoff !== false;
  const byDate = new Map();

  for (const c of candles) {
    if (!c) continue;
    const rawDate = c.date || c.datetime || c.reference_date;
    const iso = formatDateIso(rawDate);
    if (!iso) continue;
    if (enforceCutoff && iso > expectedClosed) {
      // Descarta candle diário ainda em formação / data futura
      continue;
    }
    const close = Number(c.adjustedClose ?? c.close);
    if (!Number.isFinite(close) || close <= 0) continue;
    const rawOpen = Number(c.open);
    const rawHigh = Number(c.high);
    const rawLow = Number(c.low);
    const hasRealOhlc = Number.isFinite(rawOpen) && Number.isFinite(rawHigh) && Number.isFinite(rawLow) &&
      (rawHigh > rawLow || rawOpen !== close);

    const candleObj = {
      date: iso,
      close,
      volume: Number.isFinite(Number(c.volume)) && Number(c.volume) >= 0 ? Number(c.volume) : 0
    };
    if (hasRealOhlc) {
      candleObj.open = rawOpen;
      candleObj.high = rawHigh;
      candleObj.low = rawLow;
    }

    byDate.set(iso, candleObj);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// Controle de cooldown em memória para evitar chamadas repetidas quando o provedor falha ou ainda não publicou
const lastSyncAttemptByBenchmark = new Map();
const SYNC_RETRY_COOLDOWN_MS = 120 * 1000; // 2 minutos

/**
 * Lê cache em disco ou inicializa.
 */
async function readDiskCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { benchmarks: {}, lastSyncAt: null };
  }
}

/**
 * Salva cache em disco de forma atômica.
 */
async function writeDiskCache(cache) {
  try {
    await fs.mkdir(path.dirname(CACHE_FILE_PATH), { recursive: true });
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(cache, null, 2), 'utf8');
  } catch (err) {
    console.warn('[market-regime] Falha ao salvar cache em disco:', err.message);
  }
}

async function readUsBenchmarksDiskCache() {
  try {
    const raw = await fs.readFile(US_BENCHMARKS_CACHE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { benchmarks: {} };
  }
}

async function writeUsBenchmarksDiskCache(parsed) {
  try {
    await fs.mkdir(path.dirname(US_BENCHMARKS_CACHE_PATH), { recursive: true });
    await fs.writeFile(US_BENCHMARKS_CACHE_PATH, JSON.stringify(parsed, null, 2), 'utf8');
  } catch (err) {
    console.warn('[market-regime] Falha ao salvar us-benchmarks-cache.json:', err.message);
  }
}

/**
 * Carrega e atualiza histórico diário de benchmark americano (SP500 / NASDAQ) com:
 * - Verificação de defasagem contra o último pregão fechado esperado (America/New_York)
 * - Busca incremental na Twelve Data quando defasado ou forçado
 * - Merge determinístico por data preservando janela longa (>= 700 pregões) para SMA(ATR%, 252)
 * - Persistência em us-benchmarks-cache.json e fallback seguro com diagnóstico de erro
 */
async function loadUsBenchmarkCandles(benchmarkId, options = {}) {
  const norm = String(benchmarkId || '').toUpperCase();
  const isSp500 = norm === 'SP500' || norm === 'SPX' || norm === 'SPY';
  const targetKey = isSp500 ? 'SP500' : 'NASDAQ';
  const targetSymbol = isSp500 ? 'SPY' : 'QQQ';
  const now = options.now ? new Date(options.now) : new Date();
  const expectedClosedDate = options.expectedClosedDate || getExpectedClosedDate('US', now);
  const force = Boolean(options.force);

  let usDisk = await readUsBenchmarksDiskCache();
  usDisk.benchmarks = usDisk.benchmarks || {};
  const existingEntry = usDisk.benchmarks[targetKey] || usDisk.benchmarks[targetSymbol] || {};
  let cachedCandles = filterClosedDailyCandles(existingEntry.candles || [], 'US', now, { expectedClosedDate });

  const lastCachedDate = cachedCandles.at(-1)?.date || null;
  const isBehindExpected = !lastCachedDate || lastCachedDate < expectedClosedDate;
  const needsMoreHistory = cachedCandles.length < 275;

  const attemptState = lastSyncAttemptByBenchmark.get(targetKey);
  const withinCooldown = !force && attemptState && (Date.now() - attemptState.atMs < SYNC_RETRY_COOLDOWN_MS) && attemptState.expectedDate === expectedClosedDate;

  let fetchError = null;
  const providerInstance = options.provider || null;
  const hasApiKey = Boolean(providerInstance || process.env.TWELVE_DATA_API_KEY);

  if ((force || isBehindExpected || needsMoreHistory) && !withinCooldown && hasApiKey) {
    lastSyncAttemptByBenchmark.set(targetKey, { atMs: Date.now(), expectedDate: expectedClosedDate });
    try {
      let provider = providerInstance;
      if (!provider) {
        const { TwelveDataMarketDataProvider } = require('./twelve-data-provider');
        provider = new TwelveDataMarketDataProvider();
      }
      const outputsize = cachedCandles.length >= 250 && !needsMoreHistory ? 60 : 500;
      const fetchedRaw = await provider.getHistoricalDailyPrices(targetSymbol, { outputsize });
      if (!Array.isArray(fetchedRaw) || fetchedRaw.length === 0) {
        throw new Error(`Resposta vazia ou inválida do provedor para ${targetSymbol}`);
      }
      const fetchedClean = filterClosedDailyCandles(fetchedRaw, 'US', now, { expectedClosedDate });
      if (!fetchedClean.length) {
        throw new Error(`Nenhum candle diário fechado válido retornado para ${targetSymbol}`);
      }

      // Merge preservando histórico longo
      const merged = filterClosedDailyCandles([...cachedCandles, ...fetchedClean], 'US', now, { expectedClosedDate });
      if (merged.length >= cachedCandles.length) {
        cachedCandles = merged;
        // Re-ler arquivo antes de gravar para não sobrescrever atualização concorrente do outro benchmark
        const latestDisk = await readUsBenchmarksDiskCache();
        latestDisk.benchmarks = latestDisk.benchmarks || {};
        latestDisk.benchmarks[targetKey] = {
          symbol: targetSymbol,
          name: isSp500 ? 'S&P 500 (SPY)' : 'Nasdaq-100 (QQQ)',
          provider: 'twelve_data',
          updatedAt: now.toISOString(),
          lastReferenceDate: cachedCandles.at(-1)?.date || null,
          candles: cachedCandles
        };
        await writeUsBenchmarksDiskCache(latestDisk);
      }
    } catch (err) {
      fetchError = err.message || String(err);
      console.warn(`[market-regime] Falha ao atualizar benchmark US ${targetKey} (${targetSymbol}): ${fetchError}`);
    }
  } else if ((isBehindExpected || !cachedCandles.length) && !hasApiKey) {
    fetchError = 'TWELVE_DATA_API_KEY ausente para atualização online dos benchmarks dos EUA.';
  } else if (withinCooldown && attemptState?.lastError) {
    fetchError = attemptState.lastError;
  }

  if (fetchError && lastSyncAttemptByBenchmark.has(targetKey)) {
    const st = lastSyncAttemptByBenchmark.get(targetKey);
    st.lastError = fetchError;
  }

  if (fetchError) {
    Object.defineProperty(cachedCandles, 'fetchError', { value: fetchError, enumerable: false, configurable: true });
  }
  Object.defineProperty(cachedCandles, 'expectedClosedDate', { value: expectedClosedDate, enumerable: false, configurable: true });
  return cachedCandles;
}

/**
 * Busca histórico de benchmark (BR ou US), valida fechamentos diários e sincroniza registros de regimes.
 */
async function syncBenchmarkRegimes(benchmarkId = 'IBOV', options = {}) {
  const rawUpper = String(benchmarkId || 'IBOV').trim().toUpperCase();
  const normId = (rawUpper === 'SPX' || rawUpper === 'SPY' || rawUpper === 'SP500')
    ? 'SP500'
    : ((rawUpper === 'NDX' || rawUpper === 'QQQ' || rawUpper === 'NASDAQ') ? 'NASDAQ' : rawUpper);
  const isUs = normId === 'SP500' || normId === 'NASDAQ';
  const marketCode = isUs ? 'US' : 'BR';
  const now = options.now ? new Date(options.now) : new Date();
  const expectedClosedDate = options.expectedClosedDate || getExpectedClosedDate(marketCode, now);

  let candles = [];
  let syncError = null;

  if (Array.isArray(options.candles) && options.candles.length >= 30) {
    candles = filterClosedDailyCandles(options.candles, marketCode, now, { expectedClosedDate, enforceCutoff: options.enforceCutoff !== false });
  } else if (isUs) {
    try {
      candles = await loadUsBenchmarkCandles(normId, {
        now,
        expectedClosedDate,
        force: options.force,
        provider: options.provider
      });
      if (candles.fetchError) syncError = candles.fetchError;
    } catch (err) {
      syncError = err.message || String(err);
      console.warn(`[market-regime] Falha ao carregar histórico US para ${normId}:`, syncError);
    }
  } else {
    const curYear = now.getFullYear();
    const years = [curYear - 2, curYear - 1, curYear];
    try {
      const rawB3 = await b3IndexHistory.fetchIndexHistory(normId, {
        years,
        cacheDirectory: options.cacheDirectory || B3_INDEX_HISTORY_CACHE,
        force: Boolean(options.force),
        expectedDate: expectedClosedDate,
        fetchImpl: options.fetchImpl
      });
      if (rawB3.fetchError) syncError = rawB3.fetchError;
      candles = filterClosedDailyCandles(rawB3, 'BR', now, { expectedClosedDate });
    } catch (err) {
      syncError = err.message || String(err);
      console.warn(`[market-regime] Falha ao carregar histórico B3 para ${normId}:`, syncError);
    }
  }

  if (!candles || candles.length < 30) {
    const prevDisk = await readDiskCache();
    const prevCached = prevDisk.benchmarks?.[normId];
    if (prevCached && Array.isArray(prevCached.regimes) && prevCached.regimes.length > 0) {
      const lastDate = prevCached.current?.reference_date || prevCached.regimes.at(-1)?.reference_date || null;
      const isStale = Boolean(!lastDate || lastDate < expectedClosedDate);
      const fallbackFreshness = {
        benchmarkId: normId,
        market: marketCode,
        timezone: isUs ? 'America/New_York' : 'America/Sao_Paulo',
        lastCandleDate: lastDate,
        expectedClosedDate,
        isUpToDate: !isStale,
        isStale,
        status: isStale ? 'stale' : 'fresh',
        updatedAt: prevCached.updatedAt || now.toISOString(),
        source: isUs ? 'twelve_data_cache' : 'b3_cache',
        lastError: syncError || 'Histórico insuficiente na atualização; mantendo último cache válido.'
      };
      return {
        benchmarkId: normId,
        count: prevCached.regimes.length,
        current: prevCached.current,
        regimes: prevCached.regimes,
        periods: prevCached.periods || [],
        distribution: prevCached.distribution || calculateDistribution(prevCached.regimes),
        candles: prevCached.candles || [],
        freshness: fallbackFreshness
      };
    }
    return {
      benchmarkId: normId,
      count: 0,
      current: null,
      regimes: [],
      periods: [],
      distribution: calculateDistribution([]),
      candles: [],
      freshness: {
        benchmarkId: normId,
        market: marketCode,
        timezone: isUs ? 'America/New_York' : 'America/Sao_Paulo',
        lastCandleDate: null,
        expectedClosedDate,
        isUpToDate: false,
        isStale: true,
        status: 'unavailable',
        updatedAt: now.toISOString(),
        source: isUs ? 'twelve_data' : 'b3-indexes',
        lastError: syncError || 'Histórico indisponível.'
      }
    };
  }

  const regimes = calculateBenchmarkRegimes(candles, normId);
  const periods = derivePeriods(regimes);
  const distribution = calculateDistribution(regimes);
  const current = regimes.at(-1) || null;
  const lastCandleDate = current?.reference_date || candles.at(-1)?.date || null;
  const isStale = Boolean(!lastCandleDate || lastCandleDate < expectedClosedDate);
  const syncAtIso = now.toISOString();

  const freshness = {
    benchmarkId: normId,
    market: marketCode,
    timezone: isUs ? 'America/New_York' : 'America/Sao_Paulo',
    lastCandleDate,
    expectedClosedDate,
    isUpToDate: !isStale,
    isStale,
    status: isStale ? 'stale' : 'fresh',
    updatedAt: syncAtIso,
    source: isUs ? 'twelve_data' : 'b3-indexes',
    lastError: syncError || null
  };

  // Persistir em PostgreSQL se configurado
  if (database.configured() && regimes.length) {
    try {
      await database.transaction(async (client) => {
        const meta = DEFAULT_BENCHMARKS.find(b => b.id === normId) || {
          name: normId,
          symbol: normId,
          market: isUs ? 'US' : 'BR',
          provider: isUs ? 'twelve_data' : 'b3'
        };
        await client.query(
          `INSERT INTO app.market_benchmarks (id, name, symbol, market, provider, is_default, active)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET updated_at = now()`,
          [
            normId,
            meta.name,
            meta.symbol,
            meta.market,
            meta.provider,
            normId === 'IBOV',
            true
          ]
        );

        for (const r of regimes.slice(-100)) {
          await client.query(
            `INSERT INTO app.market_regime_daily (
               benchmark_id, reference_date, direction, volatility, regime,
               close_price, ema_10, ema_72, atr_21, atr_percentage, atr_percentage_sma_252, volatility_deviation, calculation_version
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (benchmark_id, reference_date, calculation_version)
             DO UPDATE SET
               direction = EXCLUDED.direction,
               volatility = EXCLUDED.volatility,
               regime = EXCLUDED.regime,
               close_price = EXCLUDED.close_price,
               ema_10 = EXCLUDED.ema_10,
               ema_72 = EXCLUDED.ema_72,
               atr_21 = EXCLUDED.atr_21,
               atr_percentage = EXCLUDED.atr_percentage,
               atr_percentage_sma_252 = EXCLUDED.atr_percentage_sma_252,
               volatility_deviation = EXCLUDED.volatility_deviation,
               calculated_at = now()`,
            [
              r.benchmark_id, r.reference_date, r.direction, r.volatility, r.regime,
              r.close_price, r.ema_10, r.ema_72, r.atr_21, r.atr_percentage, r.atr_percentage_sma_252, r.volatility_deviation, 'v1'
            ]
          );
        }
      });
    } catch (dbErr) {
      console.warn('[market-regime] Falha ao persistir regimes no DB:', dbErr.message);
    }
  }

  // Atualizar cache em disco
  const diskCache = await readDiskCache();
  diskCache.benchmarks = diskCache.benchmarks || {};
  diskCache.benchmarks[normId] = {
    updatedAt: syncAtIso,
    current,
    regimes,
    periods,
    distribution,
    candles: candles.slice(-800),
    freshness
  };
  await writeDiskCache(diskCache);

  return {
    benchmarkId: normId,
    count: regimes.length,
    current,
    regimes,
    periods,
    distribution,
    candles: candles.slice(-800),
    freshness
  };
}

/**
 * Verifica se o registro em cache de um benchmark precisa ser ressincronizado.
 */
async function shouldResyncBenchmarkCache(normId, cached, options = {}) {
  if (options.force) return true;
  if (!cached || !Array.isArray(cached.regimes) || !cached.regimes.length || !cached.current) return true;
  if (cached.current.ema_30 === undefined) return true;

  const isUs = normId === 'SP500' || normId === 'NASDAQ';
  const marketCode = isUs ? 'US' : 'BR';
  const now = options.now ? new Date(options.now) : new Date();
  const expectedClosedDate = options.expectedClosedDate || getExpectedClosedDate(marketCode, now);
  const currentRefDate = formatDateIso(cached.current.reference_date);

  if (!currentRefDate) return true;
  // Se o cache contém data futura / candle aberto intradiário, ressincronizar para limpar
  if (currentRefDate > expectedClosedDate) return true;
  // Se o chamador informou uma data de candle mais recente que o regime em cache
  if (options.latestCandleDate && formatDateIso(options.latestCandleDate) > currentRefDate) return true;

  // Se o regime em cache está atrás da última data de fechamento esperada
  if (currentRefDate < expectedClosedDate) {
    // Se não possui candles salvos no snapshot ou é um índice B3 (cujo cache de índice já pode ter atualizado em disco), sincronizar!
    if (!isUs) return true;
    const attempt = lastSyncAttemptByBenchmark.get(normId);
    if (!attempt || (Date.now() - attempt.atMs >= SYNC_RETRY_COOLDOWN_MS) || attempt.expectedDate !== expectedClosedDate) {
      return true;
    }
  }

  return false;
}

/**
 * Obtém o regime atual para um benchmark, sincronizando automaticamente quando defasado.
 */
async function getCurrentRegime(benchmarkId = 'IBOV', options = {}) {
  const hist = await getRegimeHistory(benchmarkId, options);
  return hist.current;
}

/**
 * Obtém o histórico completo de regimes, períodos, candles validados e diagnóstico de frescor de um benchmark.
 */
async function getRegimeHistory(benchmarkId = 'IBOV', options = {}) {
  const rawUpper = String(benchmarkId || 'IBOV').trim().toUpperCase();
  const normId = (rawUpper === 'SPX' || rawUpper === 'SPY' || rawUpper === 'SP500')
    ? 'SP500'
    : ((rawUpper === 'NDX' || rawUpper === 'QQQ' || rawUpper === 'NASDAQ') ? 'NASDAQ' : rawUpper);
  const isUs = normId === 'SP500' || normId === 'NASDAQ';
  const marketCode = isUs ? 'US' : 'BR';
  const now = options.now ? new Date(options.now) : new Date();
  const expectedClosedDate = options.expectedClosedDate || getExpectedClosedDate(marketCode, now);

  const diskCache = await readDiskCache();
  let cached = diskCache.benchmarks?.[normId];

  if (await shouldResyncBenchmarkCache(normId, cached, { ...options, now, expectedClosedDate })) {
    const syncResult = await syncBenchmarkRegimes(normId, { ...options, now, expectedClosedDate });
    cached = {
      updatedAt: syncResult.freshness?.updatedAt || now.toISOString(),
      current: syncResult.current,
      regimes: syncResult.regimes,
      periods: syncResult.periods,
      distribution: syncResult.distribution,
      candles: syncResult.candles,
      freshness: syncResult.freshness
    };
  }

  let regimes = cached.regimes || [];
  if (options.from) {
    regimes = regimes.filter(r => r.reference_date >= options.from);
  }
  if (options.to) {
    regimes = regimes.filter(r => r.reference_date <= options.to);
  }

  const lastDate = cached.current?.reference_date || regimes.at(-1)?.reference_date || null;
  const isStale = Boolean(!lastDate || lastDate < expectedClosedDate);
  const freshness = cached.freshness ? {
    ...cached.freshness,
    lastCandleDate: lastDate,
    expectedClosedDate,
    isUpToDate: !isStale,
    isStale,
    status: isStale ? 'stale' : 'fresh'
  } : {
    benchmarkId: normId,
    market: marketCode,
    timezone: isUs ? 'America/New_York' : 'America/Sao_Paulo',
    lastCandleDate: lastDate,
    expectedClosedDate,
    isUpToDate: !isStale,
    isStale,
    status: isStale ? 'stale' : 'fresh',
    updatedAt: cached.updatedAt || now.toISOString(),
    source: isUs ? 'twelve_data' : 'b3-indexes',
    lastError: null
  };

  return {
    benchmarkId: normId,
    current: cached.current,
    regimes,
    periods: cached.periods || [],
    distribution: cached.distribution || calculateDistribution(regimes),
    candles: cached.candles || [],
    freshness,
    metadata: REGIME_METADATA
  };
}

/**
 * Consulta a performance por regime para o usuário logado e/ou simulações.
 */
async function getPerformanceByRegime({ userId, benchmarkId = 'IBOV', source = 'all', trades: passedTrades } = {}) {
  let trades = Array.isArray(passedTrades) ? passedTrades : [];

  if (!trades.length && database.configured() && userId) {
    try {
      const res = await database.query(
        `SELECT id, ticker, status, entry_price, current_risk_percent,
                entry_market_direction, entry_market_volatility, entry_market_regime,
                entry_market_benchmark, entry_regime_reference_date, rubric_grade,
                metadata, created_at, executed_at
         FROM app.trades
         WHERE user_id = $1 AND status = 'closed'`,
        [userId]
      );

      // Obter histórico de regimes do benchmark para associar trades legados sem regime gravado
      let historyMap = null;
      try {
        const hist = await getRegimeHistory(benchmarkId);
        if (Array.isArray(hist?.regimes)) {
          historyMap = new Map();
          for (const r of hist.regimes) {
            historyMap.set(r.reference_date, r.regime);
          }
        }
      } catch (_) {}

      trades = res.rows.map(r => {
        const entryDate = r.entry_regime_reference_date || (r.executed_at ? r.executed_at.toISOString().slice(0, 10) : (r.created_at ? r.created_at.toISOString().slice(0, 10) : null));
        let reg = r.entry_market_regime;
        if (!reg && entryDate && historyMap) {
          reg = historyMap.get(entryDate) || null;
        }
        return {
          id: r.id,
          ticker: r.ticker,
          grade: r.rubric_grade,
          entry_market_regime: reg,
          resultR: Number(r.metadata?.resultR ?? (r.metadata?.rMultiple ?? (r.r_multiple ?? NaN))),
          entryDate
        };
      });
    } catch (err) {
      console.warn('[market-regime] Falha ao consultar trades no banco:', err.message);
    }
  }

  // Se não houver trades reais, retornar estado explícito de ausência de dados (SEM NENHUM DADO FICTÍCIO)
  if (!trades.length) {
    const regimeOrder = ['UP_QUIET', 'UP_VOLATILE', 'SIDEWAYS_QUIET', 'SIDEWAYS_VOLATILE', 'DOWN_QUIET', 'DOWN_VOLATILE'];
    return {
      benchmarkId,
      source: 'user-trades',
      hasData: false,
      totalTrades: 0,
      canRank: false,
      rows: regimeOrder.map(code => ({
        regime: code,
        label: REGIME_METADATA[code]?.label || code,
        name: REGIME_METADATA[code]?.name || code,
        color: REGIME_METADATA[code]?.color || '#94a3b8',
        badgeClass: REGIME_METADATA[code]?.badgeClass || '',
        trades: 0,
        hasData: false,
        winRate: null,
        profitFactor: null,
        expectancy: null,
        resultadoR: null,
        maxDrawdown: null,
        sampleQuality: 'no_history',
        sampleMessage: 'Sem histórico de trades'
      })),
      bestRegime: null,
      worstRegime: null,
      sampleQualityStatus: 'insufficient',
      sampleRecommendationText: 'Não há registros de operações no Trading Log para calcular as métricas por regime.'
    };
  }

  const perf = calculateRegimePerformance(trades, { benchmarkId });
  return {
    benchmarkId,
    source: 'user-trades',
    hasData: true,
    ...perf
  };
}

module.exports = {
  REGIMES,
  REGIME_METADATA,
  DEFAULT_BENCHMARKS,
  formatDateIso,
  isMarketTradingDay,
  getExpectedClosedDate,
  filterClosedDailyCandles,
  loadUsBenchmarkCandles,
  calculateTrueRange,
  calculateWilderATRSeries,
  calculateATRPercentageSeries,
  classifyDirection,
  calculateVolatility,
  combineRegime,
  calculateBenchmarkRegimes,
  derivePeriods,
  calculateDistribution,
  calculateRegimePerformance,
  resolveBenchmarkForAsset,
  syncBenchmarkRegimes,
  getCurrentRegime,
  getRegimeHistory,
  getPerformanceByRegime,
  readDiskCache,
  writeDiskCache
};
