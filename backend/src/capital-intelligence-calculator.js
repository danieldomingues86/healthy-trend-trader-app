'use strict';

/**
 * CAPITAL INTELLIGENCE — CAMADA DE CÁLCULO DE INDICADORES E SNAPSHOTS
 *
 * Funções puras e determinísticas:
 * - Classifica frescor estrito: 'atualizado' | 'atrasado' | 'indisponivel' | 'parcial'.
 * - Nunca apresenta dado antigo como atual.
 * - Calcula retornos exatos em janelas de 1, 5, 21 e 63 pregões (e deltas em p.p. para taxas).
 * - Monta o snapshot diário canônico com rastreabilidade (fonte, data de origem, data de coleta, status).
 */

const {
  INSTRUMENT_CATALOG,
  US_SECTOR_IDS,
  getExpectedReferenceDate,
  countBusinessDaysBetween,
  getZonedParts
} = require('./capital-intelligence-ingestion');
const marketRegime = require('./market-regime');
const usMarketBreadth = require('./us-market-breadth');
const usSectorRotation = require('./us-sector-rotation');
const macroTrends = require('./macro-trends');
const goldProtection = require('./gold-protection');
const macroEventsCalendar = require('./macro-events-calendar');

const VALID_OFFICIAL_REGIMES = new Set(Object.values(marketRegime.REGIMES || {}));

const FRESHNESS = {
  ATUALIZADO: 'atualizado',
  ATRASADO: 'atrasado',
  INDISPONIVEL: 'indisponivel',
  PARCIAL: 'parcial'
};

// Calendário institucional de datas oficiais (COPOM / FOMC / Payroll / IPCA / PCE / PIB) — base determinística
const OFFICIAL_MACRO_CALENDAR = macroEventsCalendar.OFFICIAL_CALENDAR_EVENTS;

function pctChange(latest, base) {
  if (!Number.isFinite(latest) || !Number.isFinite(base) || base === 0) return null;
  return Number((((latest - base) / base) * 100).toFixed(2));
}

function diffChange(latest, base) {
  if (!Number.isFinite(latest) || !Number.isFinite(base)) return null;
  return Number((latest - base).toFixed(2));
}

/**
 * Filtra estritamente observações fechadas e não-futuras.
 * Regra inviolável: nunca usar datas futuras nem candles incompletos/não publicados
 * para conclusões que dependam de fechamento diário.
 */
function filterClosedNonFutureObservations(indicatorId, series = [], now = new Date()) {
  if (!Array.isArray(series) || series.length === 0) {
    return { valid: [], filteredCount: 0, maxAllowedDate: null };
  }
  const spec = INSTRUMENT_CATALOG[indicatorId];
  const expectedInfo = spec ? getExpectedReferenceDate(spec, now) : null;
  const maxAllowedDate = expectedInfo ? expectedInfo.expectedDate : getZonedParts(now, 'America/Sao_Paulo').isoDate;

  const valid = [];
  let filteredCount = 0;

  for (const row of series) {
    if (!row || !row.referenceDate) {
      filteredCount += 1;
      continue;
    }
    const closeNum = Number(row.closeValue);
    const isIncomplete = row.qualityStatus === 'incomplete' || row.qualityStatus === 'intraday' || row.metadata?.isIncomplete === true;
    const isFutureOrUnpublished = Boolean(maxAllowedDate && row.referenceDate > maxAllowedDate);
    if (isIncomplete || isFutureOrUnpublished || !Number.isFinite(closeNum) || closeNum <= 0) {
      filteredCount += 1;
      continue;
    }
    valid.push(row);
  }

  valid.sort((a, b) => a.referenceDate.localeCompare(b.referenceDate));
  return { valid, filteredCount, maxAllowedDate };
}

/**
 * Classifica o frescor de uma série histórica frente à data esperada do mercado.
 * Nunca trata dado antigo como 'atualizado'.
 */
function classifySeriesFreshness(indicatorId, series = [], now = new Date()) {
  const spec = INSTRUMENT_CATALOG[indicatorId];
  if (!spec || spec.provider === 'unconfigured') {
    return {
      status: FRESHNESS.INDISPONIVEL,
      asOfDate: null,
      expectedDate: null,
      lagBusinessDays: null,
      collectedAt: null,
      sourceTimestamp: null,
      filteredFutureOrIncompleteCount: 0,
      reason: spec?.unavailableReason || 'PROVIDER_UNCONFIGURED'
    };
  }

  const expectedInfo = getExpectedReferenceDate(spec, now);
  const { valid, filteredCount } = filterClosedNonFutureObservations(indicatorId, series, now);

  if (valid.length === 0) {
    return {
      status: FRESHNESS.INDISPONIVEL,
      asOfDate: null,
      expectedDate: expectedInfo.expectedDate,
      lagBusinessDays: null,
      collectedAt: null,
      sourceTimestamp: null,
      filteredFutureOrIncompleteCount: filteredCount,
      reason: filteredCount > 0 ? 'ONLY_INCOMPLETE_OR_FUTURE_OBSERVATIONS' : 'NO_OBSERVATIONS_STORED'
    };
  }

  const latest = valid[valid.length - 1];
  const asOfDate = latest.referenceDate;
  const lagDays = asOfDate >= expectedInfo.expectedDate
    ? 0
    : countBusinessDaysBetween(asOfDate, expectedInfo.expectedDate, spec.market === 'US' ? 'US' : 'BR');

  // Regra estrita: se há defasagem frente ao esperado, marca explicitamente como 'atrasado'
  const status = lagDays === 0 ? FRESHNESS.ATUALIZADO : FRESHNESS.ATRASADO;

  return {
    status,
    asOfDate,
    expectedDate: expectedInfo.expectedDate,
    lagBusinessDays: lagDays,
    collectedAt: latest.collectedAt || null,
    sourceTimestamp: latest.sourceTimestamp || null,
    marketLocalTime: expectedInfo.marketLocalTime,
    timezone: expectedInfo.timezone,
    filteredFutureOrIncompleteCount: filteredCount,
    reason: status === FRESHNESS.ATRASADO ? `DEFASADO_${lagDays}_PREGOES` : null
  };
}

/**
 * Calcula métricas exatas de janela (1p, 5p, 21p, 63p) e sparkline de 21 pregões.
 */
function computeIndicatorMetrics(indicatorId, series = [], now = new Date()) {
  const spec = INSTRUMENT_CATALOG[indicatorId] || {
    indicatorId,
    symbol: indicatorId,
    name: indicatorId,
    market: 'GLOBAL',
    currency: 'USD',
    unit: 'pts',
    metricNature: 'price_performance',
    provider: 'unknown'
  };

  const { valid: ordered } = filterClosedNonFutureObservations(indicatorId, series, now);
  const freshness = classifySeriesFreshness(indicatorId, series, now);
  if (ordered.length === 0) {
    return {
      indicatorId: spec.indicatorId,
      symbol: spec.symbol,
      name: spec.name,
      market: spec.market,
      currency: spec.currency,
      unit: spec.unit,
      metricNature: spec.metricNature,
      provider: spec.provider,
      isProxy: Boolean(spec.isProxy),
      status: freshness.status,
      freshness,
      latestValue: null,
      change1dPct: null,
      change5dPct: null,
      change21dPct: null,
      change63dPct: null,
      delta21dPp: null,
      sparkline21d: [],
      metadata: {}
    };
  }

  const closes = ordered.map(r => Number(r.closeValue));
  const n = closes.length;
  const latestRow = ordered[n - 1];
  const latestVal = closes[n - 1];

  const isRate = spec.metricNature === 'macro_rate' && spec.unit.includes('%');

  const prev1 = n >= 2 ? closes[n - 2] : null;
  const prev5 = n >= 6 ? closes[n - 6] : null;
  const prev21 = n >= 22 ? closes[n - 22] : null;
  const prev63 = n >= 64 ? closes[n - 64] : null;

  return {
    indicatorId: spec.indicatorId,
    symbol: spec.symbol,
    name: spec.name,
    sectorLabel: spec.sectorLabel || null,
    market: spec.market,
    currency: spec.currency,
    unit: spec.unit,
    metricNature: spec.metricNature,
    provider: latestRow.sourceProvider || spec.provider,
    isProxy: Boolean(spec.isProxy),
    status: freshness.status,
    freshness,
    latestValue: latestVal,
    change1dPct: isRate ? diffChange(latestVal, prev1) : pctChange(latestVal, prev1),
    change5dPct: isRate ? diffChange(latestVal, prev5) : pctChange(latestVal, prev5),
    change21dPct: isRate ? null : pctChange(latestVal, prev21),
    change63dPct: isRate ? null : pctChange(latestVal, prev63),
    delta21dPp: isRate ? diffChange(latestVal, prev21) : null,
    hasFull21dWindow: n >= 22,
    observationsCount: n,
    sparkline21d: closes.slice(-21),
    metadata: latestRow.metadata || {}
  };
}

/**
 * Combina estados de frescor de múltiplos sub-indicadores em um estado consolidado.
 */
function aggregateFreshnessStatus(statuses = []) {
  const valid = statuses.filter(Boolean);
  if (!valid.length) return FRESHNESS.INDISPONIVEL;

  const allUpdated = valid.every(s => s === FRESHNESS.ATUALIZADO);
  if (allUpdated) return FRESHNESS.ATUALIZADO;

  const allUnavailable = valid.every(s => s === FRESHNESS.INDISPONIVEL);
  if (allUnavailable) return FRESHNESS.INDISPONIVEL;

  const allDelayed = valid.every(s => s === FRESHNESS.ATRASADO);
  if (allDelayed) return FRESHNESS.ATRASADO;

  return FRESHNESS.PARCIAL;
}

/**
 * Seleciona próximos eventos oficiais a partir da data atual (nunca retorna datas vencidas como futuras).
 */
function resolveUpcomingOfficialEvents(now = new Date(), userPlaybookEvents = []) {
  const dim = macroEventsCalendar.buildMacroEventsDimension({ now, userPlaybookEvents });
  return dim.upcomingEvents;
}

function extractOfficialRegimeInfo(rawRegimeCode) {
  const code = String(rawRegimeCode || '').trim().toUpperCase();
  if (!VALID_OFFICIAL_REGIMES.has(code)) return null;
  const meta = marketRegime.REGIME_METADATA[code];
  if (!meta) return null;

  const permissionMap = {
    UP_QUIET: 'Permissão favorável para Trend Following (priorizar Grades A e B com risco calibrado).',
    UP_VOLATILE: 'Alta com volatilidade expandida: exigir seletividade rigorosa e stops ajustados pelo ATR.',
    SIDEWAYS_QUIET: 'Transição/consolidação: reduzir agressividade e aguardar rompimentos confirmados.',
    SIDEWAYS_VOLATILE: 'Ambiente lateral turbulento: alto risco de violinadas; priorizar preservação.',
    DOWN_QUIET: 'Proteção de capital: não abrir novas compras direcionais sem reversão estrutural.',
    DOWN_VOLATILE: 'Defesa máxima: pânico/volatilidade elevada; proteger capital e evitar novas compras em tendência.'
  };

  return {
    code,
    label: meta.label,
    name: meta.name,
    direction: meta.direction,
    volatility: meta.volatility,
    color: meta.color,
    summary: meta.summary,
    permissionGuidance: permissionMap[code] || meta.summary
  };
}

/**
 * Constrói a dimensão completa da Esfera Ciclo de Mercado Brasil (04):
 * - Reutiliza estritamente os registros e metadados oficiais de backend/src/market-regime.js.
 * - Nunca inventa classificação se o motor oficial não tiver resultado válido.
 * - Nunca usa candles incompletos nem datas futuras.
 */
function buildBrazilCycleDimension(indicators, seriesById = {}, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const ibovMetric = indicators.cycle_br_ibov;
  const ifixMetric = indicators.cycle_br_ifix;
  const bdrxMetric = indicators.cycle_br_bdrx;

  const { valid: closedIbovSeries, filteredCount } = filterClosedNonFutureObservations(
    'cycle_br_ibov',
    seriesById.cycle_br_ibov || [],
    now
  );

  // Mantém apenas pregões que já carregam classificação oficial válida do market-regime.js
  const officialRegimeRows = closedIbovSeries
    .map(row => {
      const regCode = String(row.metadata?.regime || '').toUpperCase();
      if (!VALID_OFFICIAL_REGIMES.has(regCode)) return null;
      const meta = marketRegime.REGIME_METADATA[regCode];
      return {
        benchmark_id: 'IBOV',
        reference_date: row.referenceDate,
        direction: row.metadata?.direction || meta.direction,
        volatility: row.metadata?.volatility || meta.volatility,
        regime: regCode,
        regimeLabel: meta.label,
        color: meta.color,
        close_price: Number(row.closeValue),
        ema_10: Number.isFinite(Number(row.metadata?.ema10)) ? Number(row.metadata.ema10) : null,
        ema_72: Number.isFinite(Number(row.metadata?.ema72)) ? Number(row.metadata.ema72) : null,
        atr_21: Number.isFinite(Number(row.metadata?.atr21)) ? Number(row.metadata.atr21) : null,
        atr_percentage: Number.isFinite(Number(row.metadata?.atrPct)) ? Number(row.metadata.atrPct) : null,
        atr_percentage_sma_252: Number.isFinite(Number(row.metadata?.atrPctSma252)) ? Number(row.metadata.atrPctSma252) : null,
        volatility_deviation: Number.isFinite(Number(row.metadata?.volatilityDeviation)) ? Number(row.metadata.volatilityDeviation) : null
      };
    })
    .filter(Boolean);

  const latestRegimeRow = officialRegimeRows.length ? officialRegimeRows[officialRegimeRows.length - 1] : null;
  const officialRegime = latestRegimeRow ? extractOfficialRegimeInfo(latestRegimeRow.regime) : null;

  // Deriva períodos históricos reutilizando diretamente marketRegime.derivePeriods
  const periods = officialRegimeRows.length ? marketRegime.derivePeriods(officialRegimeRows) : [];
  const currentPeriodRaw = periods.length ? periods[periods.length - 1] : null;
  const currentPeriod = currentPeriodRaw
    ? {
        regime: currentPeriodRaw.regime,
        regimeLabel: marketRegime.REGIME_METADATA[currentPeriodRaw.regime]?.label || currentPeriodRaw.regime,
        color: currentPeriodRaw.color,
        startDate: currentPeriodRaw.startDate,
        endDate: currentPeriodRaw.endDate,
        durationTradingDays: currentPeriodRaw.durationTradingDays,
        startPrice: currentPeriodRaw.startPrice,
        endPrice: currentPeriodRaw.endPrice,
        periodReturnPct: pctChange(currentPeriodRaw.endPrice, currentPeriodRaw.startPrice)
      }
    : null;

  const recentTransitions = periods.slice(-5).reverse().map(p => ({
    regime: p.regime,
    regimeLabel: marketRegime.REGIME_METADATA[p.regime]?.label || p.regime,
    color: p.color,
    startDate: p.startDate,
    endDate: p.endDate,
    durationTradingDays: p.durationTradingDays,
    periodReturnPct: pctChange(p.endPrice, p.startPrice)
  }));

  const recentTimeline21d = officialRegimeRows.slice(-21).map(r => ({
    date: r.reference_date,
    regime: r.regime,
    regimeLabel: r.regimeLabel,
    direction: r.direction,
    volatility: r.volatility,
    color: r.color,
    close: r.close_price,
    ema10: r.ema_10,
    ema72: r.ema_72,
    atrPct: r.atr_percentage
  }));

  // Indicadores técnicos que sustentam o regime oficial (zero cálculo paralelo de classificação)
  const closeVal = latestRegimeRow?.close_price ?? ibovMetric.latestValue;
  const ema10Val = latestRegimeRow?.ema_10 ?? null;
  const ema72Val = latestRegimeRow?.ema_72 ?? null;
  const supportingIndicators = {
    close: closeVal,
    ema10: ema10Val,
    ema72: ema72Val,
    distEma10Pct: pctChange(closeVal, ema10Val),
    distEma72Pct: pctChange(closeVal, ema72Val),
    emaStructure: (Number.isFinite(ema10Val) && Number.isFinite(ema72Val))
      ? (ema10Val > ema72Val ? 'EMA 10 acima da EMA 72' : 'EMA 10 abaixo da EMA 72')
      : null,
    atr21: latestRegimeRow?.atr_21 ?? null,
    atrPct: latestRegimeRow?.atr_percentage ?? null,
    atrPctSma252: latestRegimeRow?.atr_percentage_sma_252 ?? null,
    volatilityDeviationPct: latestRegimeRow?.volatility_deviation ?? null,
    return21dPct: ibovMetric.change21dPct,
    return63dPct: ibovMetric.change63dPct,
    dailyChangeExcludedFromRegime: true
  };

  const summarizeBenchmark = (metric) => {
    const regInfo = extractOfficialRegimeInfo(metric?.metadata?.regime);
    return {
      symbol: metric?.symbol || null,
      name: metric?.name || null,
      status: metric?.status || FRESHNESS.INDISPONIVEL,
      asOfDate: metric?.freshness?.asOfDate || null,
      lagBusinessDays: metric?.freshness?.lagBusinessDays ?? null,
      latestValue: metric?.latestValue ?? null,
      return21dPct: metric?.change21dPct ?? null,
      return63dPct: metric?.change63dPct ?? null,
      regimeCode: regInfo?.code || null,
      regimeLabel: regInfo?.label || null,
      regimeColor: regInfo?.color || null
    };
  };

  // Fatores relacionados: Dólar, Juros (Selic/DI), Amplitude das Ações B3 e Volatilidade
  const fxMetric = indicators.fx_usd_brl;
  const selicMetric = indicators.rate_selic_meta;
  const diMetric = indicators.rate_di_curve;
  const brBreadth = options.brBreadth || null;

  const relatedFactors = {
    dolar: {
      status: fxMetric?.status || FRESHNESS.INDISPONIVEL,
      latestValue: fxMetric?.latestValue ?? null,
      change21dPct: fxMetric?.change21dPct ?? null,
      asOfDate: fxMetric?.freshness?.asOfDate || null,
      source: fxMetric?.provider || 'bcb_sgs',
      unit: fxMetric?.unit || 'BRL/USD'
    },
    juros: {
      selicStatus: selicMetric?.status || FRESHNESS.INDISPONIVEL,
      selicValue: selicMetric?.latestValue ?? null,
      selicDelta21dPp: selicMetric?.delta21dPp ?? null,
      selicAsOfDate: selicMetric?.freshness?.asOfDate || null,
      diCurveStatus: diMetric?.status || FRESHNESS.INDISPONIVEL,
      diCurveReason: 'PENDING_DI_CURVE_PARSER',
      source: selicMetric?.status !== FRESHNESS.INDISPONIVEL ? 'bcb_sgs' : 'unconfigured'
    },
    breadthB3: brBreadth && brBreadth.dataAvailable
      ? {
          status: brBreadth.status || FRESHNESS.ATUALIZADO,
          universe: brBreadth.universe || 'stock_b3',
          totalEligible: brBreadth.totalEligible,
          aboveEma20Pct: brBreadth.aboveEma20Pct,
          aboveEma50Pct: brBreadth.aboveEma50Pct,
          aboveEma200Pct: brBreadth.aboveEma200Pct,
          positiveTrendPct: brBreadth.positiveTrendPct,
          asOfDate: brBreadth.asOfDate || null,
          source: 'b3_cotahist_breadth'
        }
      : {
          status: FRESHNESS.INDISPONIVEL,
          universe: 'stock_b3',
          totalEligible: 0,
          aboveEma20Pct: null,
          aboveEma50Pct: null,
          aboveEma200Pct: null,
          positiveTrendPct: null,
          asOfDate: null,
          source: 'b3_cotahist_breadth'
        },
    volatility: {
      status: officialRegime ? ibovMetric.status : FRESHNESS.INDISPONIVEL,
      regimeVolatility: officialRegime?.volatility || null,
      atr21: supportingIndicators.atr21,
      atrPct: supportingIndicators.atrPct,
      atrPctSma252: supportingIndicators.atrPctSma252,
      volatilityDeviationPct: supportingIndicators.volatilityDeviationPct,
      source: 'backend/src/market-regime.js'
    }
  };

  // Se o motor oficial não produziu classificação válida, nunca inventar regime
  const effectiveStatus = officialRegime ? ibovMetric.status : FRESHNESS.INDISPONIVEL;

  return {
    id: 'cycle_br',
    metricNature: 'price_performance',
    status: effectiveStatus,
    asOfDate: latestRegimeRow?.reference_date || ibovMetric.freshness.asOfDate,
    expectedDate: ibovMetric.freshness.expectedDate,
    lagBusinessDays: ibovMetric.freshness.lagBusinessDays,
    collectedAt: ibovMetric.freshness.collectedAt,
    source: ibovMetric.provider,
    hasOfficialRegime: Boolean(officialRegime),
    regimeCode: officialRegime?.code || null,
    regimeLabel: officialRegime?.label || null,
    regimeName: officialRegime?.name || null,
    regimeColor: officialRegime?.color || null,
    direction: officialRegime?.direction || null,
    volatility: officialRegime?.volatility || null,
    diagnosis: officialRegime
      ? {
          summary: officialRegime.summary,
          permissionGuidance: officialRegime.permissionGuidance
        }
      : {
          summary: 'Classificação oficial indisponível: aguardando histórico fechado suficiente do motor de Market Regime.',
          permissionGuidance: 'Não inferir regime a partir de variação diária isolada.'
        },
    currentPeriod,
    recentTimeline21d,
    recentTransitions,
    supportingIndicators,
    primary: ibovMetric,
    benchmarks: {
      IBOV: ibovMetric,
      IFIX: ifixMetric,
      BDRX: bdrxMetric
    },
    benchmarkSummary: [
      summarizeBenchmark(ibovMetric),
      summarizeBenchmark(ifixMetric),
      summarizeBenchmark(bdrxMetric)
    ],
    relatedFactors,
    provenance: {
      engine: 'backend/src/market-regime.js (EMA10/EMA72 + ATR%21 vs SMA252)',
      provider: ibovMetric.provider,
      asOfDate: latestRegimeRow?.reference_date || ibovMetric.freshness.asOfDate,
      expectedDate: ibovMetric.freshness.expectedDate,
      lagBusinessDays: ibovMetric.freshness.lagBusinessDays,
      collectedAt: ibovMetric.freshness.collectedAt,
      status: effectiveStatus,
      filteredFutureOrIncompleteCount: filteredCount
    }
  };
}

/**
 * Constrói a dimensão completa e independente da Esfera Ciclo de Mercado Estados Unidos (05):
 * - Reutiliza estritamente o motor canônico backend/src/market-regime.js (SPY e QQQ, fuso America/New_York).
 * - Avalia Equal-Weight (RSP) como benchmark complementar sem contaminar o regime primário quando indisponível.
 * - Separa rigorosamente classificação do índice (Ciclo EUA) de amplitude interna (Market Breadth EUA) e do Ciclo Brasil.
 */
function buildUsCycleDimension(indicators, seriesById = {}, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const spyMetric = indicators.cycle_us_sp500;
  const qqqMetric = indicators.cycle_us_nasdaq;
  const rspMetric = indicators.cycle_us_rsp;

  const { valid: closedSpySeries, filteredCount: spyFiltered } = filterClosedNonFutureObservations(
    'cycle_us_sp500',
    seriesById.cycle_us_sp500 || [],
    now
  );

  const officialRegimeRows = closedSpySeries
    .map(row => {
      const regCode = String(row.metadata?.regime || '').toUpperCase();
      if (!VALID_OFFICIAL_REGIMES.has(regCode)) return null;
      const meta = marketRegime.REGIME_METADATA[regCode];
      return {
        benchmark_id: 'SP500',
        reference_date: row.referenceDate,
        direction: row.metadata?.direction || meta.direction,
        volatility: row.metadata?.volatility || meta.volatility,
        regime: regCode,
        regimeLabel: meta.label,
        color: meta.color,
        close_price: Number(row.closeValue),
        ema_10: Number.isFinite(Number(row.metadata?.ema10)) ? Number(row.metadata.ema10) : null,
        ema_72: Number.isFinite(Number(row.metadata?.ema72)) ? Number(row.metadata.ema72) : null,
        atr_21: Number.isFinite(Number(row.metadata?.atr21)) ? Number(row.metadata.atr21) : null,
        atr_percentage: Number.isFinite(Number(row.metadata?.atrPct)) ? Number(row.metadata.atrPct) : null,
        atr_percentage_sma_252: Number.isFinite(Number(row.metadata?.atrPctSma252)) ? Number(row.metadata.atrPctSma252) : null,
        volatility_deviation: Number.isFinite(Number(row.metadata?.volatilityDeviation)) ? Number(row.metadata.volatilityDeviation) : null
      };
    })
    .filter(Boolean);

  const latestRegimeRow = officialRegimeRows.length ? officialRegimeRows[officialRegimeRows.length - 1] : null;
  const officialRegime = latestRegimeRow ? extractOfficialRegimeInfo(latestRegimeRow.regime) : null;
  const qqqRegime = extractOfficialRegimeInfo(qqqMetric?.metadata?.regime);

  // Períodos históricos de SPY reutilizando marketRegime.derivePeriods
  const periods = officialRegimeRows.length ? marketRegime.derivePeriods(officialRegimeRows) : [];
  const currentPeriodRaw = periods.length ? periods[periods.length - 1] : null;
  const currentPeriod = currentPeriodRaw
    ? {
        regime: currentPeriodRaw.regime,
        regimeLabel: marketRegime.REGIME_METADATA[currentPeriodRaw.regime]?.label || currentPeriodRaw.regime,
        color: currentPeriodRaw.color,
        startDate: currentPeriodRaw.startDate,
        endDate: currentPeriodRaw.endDate,
        durationTradingDays: currentPeriodRaw.durationTradingDays,
        startPrice: currentPeriodRaw.startPrice,
        endPrice: currentPeriodRaw.endPrice,
        periodReturnPct: pctChange(currentPeriodRaw.endPrice, currentPeriodRaw.startPrice)
      }
    : null;

  const recentTransitions = periods.slice(-5).reverse().map(p => ({
    regime: p.regime,
    regimeLabel: marketRegime.REGIME_METADATA[p.regime]?.label || p.regime,
    color: p.color,
    startDate: p.startDate,
    endDate: p.endDate,
    durationTradingDays: p.durationTradingDays,
    periodReturnPct: pctChange(p.endPrice, p.startPrice)
  }));

  const recentTimeline21d = officialRegimeRows.slice(-21).map(r => ({
    date: r.reference_date,
    regime: r.regime,
    regimeLabel: r.regimeLabel,
    direction: r.direction,
    volatility: r.volatility,
    color: r.color,
    close: r.close_price,
    ema10: r.ema_10,
    ema72: r.ema_72,
    atrPct: r.atr_percentage
  }));

  // Alinhamento S&P 500 (SPY) × Nasdaq-100 (QQQ)
  let spyVsQqqAlignment = {
    state: 'unavailable',
    label: 'Aguardando benchmarks EUA',
    note: 'Necessário regime oficial de SPY e QQQ para avaliar confluência interna de Wall Street.'
  };
  if (officialRegime && qqqRegime) {
    if (officialRegime.code === qqqRegime.code) {
      spyVsQqqAlignment = {
        state: 'aligned_regime',
        label: 'Confluência plena (SPY = QQQ)',
        note: `S&P 500 e Nasdaq-100 operam no mesmo regime oficial (${officialRegime.label}).`
      };
    } else if (officialRegime.direction === qqqRegime.direction) {
      spyVsQqqAlignment = {
        state: 'aligned_direction',
        label: 'Mesma direção, volatilidade distinta',
        note: `SPY (${officialRegime.label}) e QQQ (${qqqRegime.label}) compartilham direção ${officialRegime.direction}, com regimes de volatilidade distintos.`
      };
    } else {
      spyVsQqqAlignment = {
        state: 'divergent',
        label: 'Divergência entre SPY e QQQ',
        note: `S&P 500 (${officialRegime.label}) diverge do Nasdaq-100 (${qqqRegime.label}), sinalizando seletividade entre mercado amplo e tecnologia.`
      };
    }
  } else if (officialRegime) {
    spyVsQqqAlignment = {
      state: 'single_benchmark',
      label: 'Leitura baseada em S&P 500 (SPY)',
      note: 'Nasdaq-100 (QQQ) ainda sem regime oficial disponível neste snapshot.'
    };
  }

  // Spread complementar de concentração: SPY (Cap-Weighted) vs RSP (Equal-Weight) em 21 pregões
  const spy21d = spyMetric?.change21dPct;
  const rsp21d = rspMetric?.change21dPct;
  const concentrationSpread21dPct = (Number.isFinite(spy21d) && Number.isFinite(rsp21d))
    ? Number((spy21d - rsp21d).toFixed(2))
    : null;

  const equalWeightContext = {
    symbol: 'RSP',
    name: 'S&P 500 Equal-Weight (RSP)',
    status: rspMetric?.status || FRESHNESS.INDISPONIVEL,
    asOfDate: rspMetric?.freshness?.asOfDate || null,
    latestValue: rspMetric?.latestValue ?? null,
    return21dPct: rsp21d ?? null,
    return63dPct: rspMetric?.change63dPct ?? null,
    concentrationSpread21dPct,
    interpretation: concentrationSpread21dPct === null
      ? 'Benchmark equal-weight complementar (RSP) aguardando série histórica para comparar dispersão vs. megacaps.'
      : concentrationSpread21dPct > 1.0
        ? `Concentração em megacaps: SPY superou o Equal-Weight (RSP) em ${concentrationSpread21dPct > 0 ? '+' : ''}${concentrationSpread21dPct.toFixed(2).replace('.', ',')} p.p. em 21p.`
        : concentrationSpread21dPct < -1.0
          ? `Participação mais distribuída: Equal-Weight (RSP) superou o SPY em ${Math.abs(concentrationSpread21dPct).toFixed(2).replace('.', ',')} p.p. em 21p.`
          : 'Desempenho equilibrado entre S&P 500 ponderado por capitalização (SPY) e Equal-Weight (RSP) em 21p.'
  };

  // Indicadores técnicos que sustentam o regime oficial (SPY)
  const closeVal = latestRegimeRow?.close_price ?? spyMetric.latestValue;
  const ema10Val = latestRegimeRow?.ema_10 ?? null;
  const ema72Val = latestRegimeRow?.ema_72 ?? null;
  const supportingIndicators = {
    benchmarkSymbol: 'SPY',
    close: closeVal,
    ema10: ema10Val,
    ema72: ema72Val,
    distEma10Pct: pctChange(closeVal, ema10Val),
    distEma72Pct: pctChange(closeVal, ema72Val),
    emaStructure: (Number.isFinite(ema10Val) && Number.isFinite(ema72Val))
      ? (ema10Val > ema72Val ? 'EMA 10 acima da EMA 72' : 'EMA 10 abaixo da EMA 72')
      : null,
    atr21: latestRegimeRow?.atr_21 ?? null,
    atrPct: latestRegimeRow?.atr_percentage ?? null,
    atrPctSma252: latestRegimeRow?.atr_percentage_sma_252 ?? null,
    volatilityDeviationPct: latestRegimeRow?.volatility_deviation ?? null,
    return21dPct: spyMetric.change21dPct,
    return63dPct: spyMetric.change63dPct,
    dailyChangeExcludedFromRegime: true,
    breadthExcludedFromCycleClassification: true
  };

  const summarizeUsBenchmark = (metric, roleLabel) => {
    const regInfo = extractOfficialRegimeInfo(metric?.metadata?.regime);
    return {
      symbol: metric?.symbol || null,
      name: metric?.name || null,
      role: roleLabel,
      status: metric?.status || FRESHNESS.INDISPONIVEL,
      asOfDate: metric?.freshness?.asOfDate || null,
      lagBusinessDays: metric?.freshness?.lagBusinessDays ?? null,
      latestValue: metric?.latestValue ?? null,
      return21dPct: metric?.change21dPct ?? null,
      return63dPct: metric?.change63dPct ?? null,
      regimeCode: regInfo?.code || null,
      regimeLabel: regInfo?.label || null,
      regimeColor: regInfo?.color || null
    };
  };

  // Contexto relacionado (estritamente separado do cálculo do ciclo!)
  const usSectorMetrics = Array.isArray(options.usSectorMetrics) ? options.usSectorMetrics : [];
  const sectorLeader = usSectorMetrics.length ? usSectorMetrics[0] : null;
  const sectorLaggard = usSectorMetrics.length > 1 ? usSectorMetrics[usSectorMetrics.length - 1] : null;

  const vixMetric = indicators.vol_vix;
  const us10yMetric = indicators.rate_us10y;
  const brSphere = options.brSphere || null;

  let brazilComparison = {
    independentFromBrazil: true,
    state: 'unavailable',
    brazilRegimeLabel: brSphere?.regimeLabel || null,
    note: 'Ciclo dos EUA é calculado de forma 100% independente do Brasil (fuso America/New_York e benchmarks SPY/QQQ).'
  };
  if (officialRegime && brSphere?.hasOfficialRegime) {
    const sameRegime = officialRegime.code === brSphere.regimeCode;
    const sameDir = officialRegime.direction === brSphere.direction;
    brazilComparison = {
      independentFromBrazil: true,
      state: sameRegime ? 'aligned' : sameDir ? 'same_direction' : 'divergent',
      brazilRegimeCode: brSphere.regimeCode,
      brazilRegimeLabel: brSphere.regimeLabel,
      note: sameRegime
        ? `Coincidência pontual: EUA (${officialRegime.label}) e Brasil (${brSphere.regimeLabel}) estão no mesmo regime, calculados em motores independentes.`
        : `Regimes independentes e distintos: EUA opera em ${officialRegime.label} enquanto Brasil opera em ${brSphere.regimeLabel}.`
    };
  }

  const relatedContext = {
    breadthUs: {
      independentDimensionId: 'breadth_us',
      excludedFromIndexCycle: true,
      status: indicators.breadth_us_broad?.status || FRESHNESS.INDISPONIVEL,
      note: 'Amplitude interna (Market Breadth EUA) é avaliada em esfera própria para nunca misturar saúde interna das ações com a classificação do índice.'
    },
    sectorRotationUs: {
      independentDimensionId: 'sector_rotation_us',
      status: options.sectorStatus || FRESHNESS.INDISPONIVEL,
      leader: sectorLeader ? { symbol: sectorLeader.symbol, sector: sectorLeader.sector, return21dPct: sectorLeader.return21dPct } : null,
      laggard: sectorLaggard ? { symbol: sectorLaggard.symbol, sector: sectorLaggard.sector, return21dPct: sectorLaggard.return21dPct } : null,
      note: sectorLeader
        ? `Liderança relativa (preço 21p): ${sectorLeader.sector} (${sectorLeader.symbol}) à frente; ${sectorLaggard?.sector || '—'} atrás.`
        : 'Rotação setorial EUA (12 ETFs SPDR/SMH) aguardando coleta histórica de 21 pregões.'
    },
    vix: {
      status: vixMetric?.status || FRESHNESS.INDISPONIVEL,
      latestValue: vixMetric?.latestValue ?? null,
      change21dPct: vixMetric?.change21dPct ?? null,
      asOfDate: vixMetric?.freshness?.asOfDate || null,
      source: vixMetric?.provider || 'cboe_csv'
    },
    us10y: {
      status: us10yMetric?.status || FRESHNESS.INDISPONIVEL,
      latestValue: us10yMetric?.latestValue ?? null,
      delta21dPp: us10yMetric?.delta21dPp ?? null,
      asOfDate: us10yMetric?.freshness?.asOfDate || null,
      source: us10yMetric?.provider || 'fred'
    },
    brazilComparison
  };

  const effectiveStatus = officialRegime
    ? aggregateFreshnessStatus([spyMetric.status, qqqMetric.status].filter(s => s !== FRESHNESS.INDISPONIVEL))
    : FRESHNESS.INDISPONIVEL;

  return {
    id: 'cycle_us',
    metricNature: 'price_performance',
    status: effectiveStatus,
    asOfDate: latestRegimeRow?.reference_date || spyMetric.freshness.asOfDate,
    expectedDate: spyMetric.freshness.expectedDate,
    lagBusinessDays: spyMetric.freshness.lagBusinessDays,
    collectedAt: spyMetric.freshness.collectedAt,
    source: spyMetric.provider,
    hasOfficialRegime: Boolean(officialRegime),
    regimeCode: officialRegime?.code || null,
    regimeLabel: officialRegime?.label || null,
    regimeName: officialRegime?.name || null,
    regimeColor: officialRegime?.color || null,
    direction: officialRegime?.direction || null,
    volatility: officialRegime?.volatility || null,
    diagnosis: officialRegime
      ? {
          summary: officialRegime.summary,
          permissionGuidance: officialRegime.permissionGuidance,
          confluencyNote: spyVsQqqAlignment.note
        }
      : {
          summary: 'Classificação oficial EUA indisponível: aguardando histórico fechado suficiente de SPY no motor de Market Regime.',
          permissionGuidance: 'Não assumir que o ciclo americano acompanha o ciclo brasileiro nem inferir regime por variação diária.',
          confluencyNote: spyVsQqqAlignment.note
        },
    spyVsQqqAlignment,
    equalWeightContext,
    currentPeriod,
    recentTimeline21d,
    recentTransitions,
    supportingIndicators,
    primary: spyMetric,
    benchmarks: {
      SP500: spyMetric,
      NASDAQ: qqqMetric,
      EQUAL_WEIGHT: rspMetric
    },
    benchmarkSummary: [
      summarizeUsBenchmark(spyMetric, 'Primário (S&P 500)'),
      summarizeUsBenchmark(qqqMetric, 'Co-benchmark (Nasdaq-100)'),
      summarizeUsBenchmark(rspMetric, 'Complementar (Equal-Weight)')
    ],
    relatedContext,
    methodology: {
      engine: 'backend/src/market-regime.js (mesmo motor canônico, instância independente EUA)',
      directionRule: 'UP: Fechamento > EMA10 e > EMA72 | DOWN: < EMA10 e < EMA72 | SIDEWAYS: entre/sobre as EMAs',
      volatilityRule: 'ATR%(21) de Wilder comparado à SMA(ATR%, 252) sobre OHLCV diário real de SPY/QQQ',
      marketCalendar: 'America/New_York (somente pregões fechados após 16h45 ET; sem dados futuros/incompletos)',
      separationGuarantee: 'Classificação exclusiva de preço/volatilidade do índice — NÃO mistura Market Breadth EUA nem Ciclo Brasil.'
    },
    provenance: {
      engine: 'backend/src/market-regime.js',
      provider: spyMetric.provider,
      primaryInstrument: 'SPY (Proxy S&P 500)',
      secondaryInstrument: 'QQQ (Proxy Nasdaq-100)',
      complementaryInstrument: 'RSP (Equal-Weight)',
      asOfDate: latestRegimeRow?.reference_date || spyMetric.freshness.asOfDate,
      expectedDate: spyMetric.freshness.expectedDate,
      lagBusinessDays: spyMetric.freshness.lagBusinessDays,
      collectedAt: spyMetric.freshness.collectedAt,
      status: effectiveStatus,
      filteredFutureOrIncompleteCount: spyFiltered
    }
  };
}

/**
 * Constrói a esfera independente e protagonista Market Breadth — Estados Unidos (06).
 * - Avalia S&P 500 e Nasdaq-100 separadamente sem preencher componentes ausentes com estimativas.
 * - Classifica condição ampla (Forte / Neutra / Fraca) via multi-fator documentado (nunca um único percentual).
 * - Detecta divergências entre o índice (Ciclo EUA) e a participação interna.
 */
function buildUsBreadthDimension(usBreadthData, usSphere, now = new Date()) {
  const expectedUs = getExpectedReferenceDate({ market: 'US', scheduleKey: 'US', publishLagDays: 0 }, now);

  if (!usBreadthData || (!usBreadthData.sp500?.available && !usBreadthData.nasdaq100?.available)) {
    return {
      id: 'breadth_us',
      metricNature: 'breadth',
      status: FRESHNESS.INDISPONIVEL,
      asOfDate: null,
      expectedDate: expectedUs.expectedDate,
      lagBusinessDays: null,
      collectedAt: null,
      source: 'unconfigured',
      primaryUniverseId: null,
      primaryUniverseName: null,
      condition: {
        code: null,
        label: 'Indisponível',
        compositeScore: null,
        pillarsEvaluated: 0,
        pillars: []
      },
      divergence: {
        state: 'unavailable',
        severity: 'none',
        label: 'Comparação indisponível',
        explanation: 'Aguardando séries reais dos componentes de S&P 500 e/ou Nasdaq-100.',
        dateMismatchWarning: null
      },
      universes: {
        sp500: usBreadthData?.sp500 || { universeId: 'SP500', universeName: 'S&P 500', available: false, status: FRESHNESS.INDISPONIVEL, composition: { expectedConstituents: 500, coveredConstituents: 0, coveragePct: 0 } },
        nasdaq100: usBreadthData?.nasdaq100 || { universeId: 'NASDAQ_100', universeName: 'Nasdaq-100', available: false, status: FRESHNESS.INDISPONIVEL, composition: { expectedConstituents: 100, coveredConstituents: 0, coveragePct: 0 } }
      },
      history21d: [],
      history63d: [],
      methodology: usMarketBreadth.BREADTH_METHODOLOGY,
      limitations: [
        'Nenhuma série histórica de componentes dos EUA carregada (S&P 500: 0/500; Nasdaq-100: 0/100).',
        'Componentes sem dados não são preenchidos com estimativas fictícias.'
      ],
      reason: 'PENDING_US_BROAD_BREADTH_PROVIDER',
      message: 'Market Breadth amplo dos EUA aguarda séries históricas reais dos componentes.'
    };
  }

  const sp500 = usBreadthData.sp500;
  const nasdaq100 = usBreadthData.nasdaq100;

  // Prioriza S&P 500 como universo primário quando disponível; caso contrário usa Nasdaq-100 deixando cobertura explícita!
  const primary = sp500?.available ? sp500 : nasdaq100;
  const divergence = usMarketBreadth.detectIndexVsBreadthDivergence(usSphere, primary);

  // Status consolidado rigoroso:
  // - Se só 1 dos 2 universos existe e está em dia => 'parcial'
  // - Se o(s) universo(s) disponível(is) está(ão) defasado(s) => 'atrasado'
  // - Se ambos existem e estão em dia => 'atualizado'
  let overallBreadthStatus;
  if (sp500?.available && nasdaq100?.available) {
    overallBreadthStatus = aggregateFreshnessStatus([sp500.status, nasdaq100.status]);
  } else {
    overallBreadthStatus = primary.status === FRESHNESS.ATRASADO ? FRESHNESS.ATRASADO : FRESHNESS.PARCIAL;
  }

  const combinedLimitations = [];
  if (!sp500?.available) {
    combinedLimitations.push('S&P 500 (500 componentes): indisponível (0/500) — requer feed EOD em lote. Leitura atual baseada exclusivamente nos componentes reais do Nasdaq-100.');
  }
  if (!nasdaq100?.available) {
    combinedLimitations.push('Nasdaq-100 (100 componentes): indisponível (0/100).');
  }
  if (Array.isArray(primary.limitations)) {
    combinedLimitations.push(...primary.limitations);
  }
  if (divergence.dateMismatchWarning) {
    combinedLimitations.push(divergence.dateMismatchWarning);
  }

  return {
    id: 'breadth_us',
    metricNature: 'breadth',
    status: overallBreadthStatus,
    asOfDate: primary.asOfDate,
    expectedDate: primary.expectedDate || expectedUs.expectedDate,
    lagBusinessDays: primary.lagBusinessDays,
    collectedAt: primary.collectedAt,
    source: primary.source,
    primaryUniverseId: primary.universeId,
    primaryUniverseName: primary.universeName,
    coverageLabel: `${sp500?.available ? `S&P 500 (${sp500.composition.coveredConstituents}/500)` : 'S&P 500 (0/500)'} · ${nasdaq100?.available ? `Nasdaq-100 (${nasdaq100.composition.coveredConstituents}/100)` : 'Nasdaq-100 (0/100)'}`,
    latest: primary.latest,
    evolution21d: primary.evolution21d,
    condition: primary.condition,
    divergence,
    universes: {
      sp500,
      nasdaq100
    },
    history21d: primary.history21d,
    history63d: primary.history63d,
    methodology: usBreadthData.methodology || usMarketBreadth.BREADTH_METHODOLOGY,
    limitations: combinedLimitations,
    provenance: {
      engine: 'backend/src/us-market-breadth.js',
      primaryUniverse: primary.universeName,
      source: primary.source,
      asOfDate: primary.asOfDate,
      expectedDate: primary.expectedDate || expectedUs.expectedDate,
      lagBusinessDays: primary.lagBusinessDays,
      collectedAt: primary.collectedAt,
      status: overallBreadthStatus
    }
  };
}

/**
 * Constrói o snapshot completo do Capital Intelligence a partir de séries já armazenadas (zero I/O externo).
 */
function buildDailySnapshot(seriesById = {}, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const snapshotDate = getZonedParts(now, 'America/Sao_Paulo').isoDate;
  const generatedAt = now.toISOString();

  // Calcula métricas para todos os indicadores catalogados
  const indicators = {};
  for (const id of Object.keys(INSTRUMENT_CATALOG)) {
    indicators[id] = computeIndicatorMetrics(id, seriesById[id] || [], now);
  }

  // Rotação Setorial e Força Relativa EUA (07): desempenho relativo de preço vs SPY (21p + 63p) — NÃO é fluxo líquido de fundos
  const usSectorRotationSphere = usSectorRotation.buildUsSectorRotationDimension(seriesById, { now });
  const usSectorMetrics = usSectorRotationSphere.sectors;
  const sectorStatus = usSectorRotationSphere.status;

  const macroEventsDimension = macroEventsCalendar.buildMacroEventsDimension({
    now,
    userPlaybookEvents: options.userPlaybookEvents || []
  });
  const upcomingEvents = macroEventsDimension.upcomingEvents;

  const brSphere = buildBrazilCycleDimension(indicators, seriesById, { now, brBreadth: options.brBreadth || null });
  const usSphere = buildUsCycleDimension(indicators, seriesById, {
    now,
    usSectorMetrics,
    sectorStatus,
    brSphere
  });
  const usBreadthSphere = buildUsBreadthDimension(options.usBreadth || null, usSphere, now);
  if (usSphere.relatedContext?.breadthUs) {
    usSphere.relatedContext.breadthUs.status = usBreadthSphere.status;
    usSphere.relatedContext.breadthUs.conditionLabel = usBreadthSphere.condition?.label || 'Indisponível';
    usSphere.relatedContext.breadthUs.divergenceLabel = usBreadthSphere.divergence?.label || null;
  }

  // Monta as 7 dimensões estruturais canônicas
  const spheres = {
    cycle_br: brSphere,
    cycle_us: usSphere,
    breadth_us: usBreadthSphere,
    gold_commodities: {
      ...goldProtection.buildGoldProtectionDimension(seriesById, { now }),
      primary: indicators.cmd_gold,
      instruments: {
        GOLD: indicators.cmd_gold,
        OIL: indicators.cmd_oil,
        BROAD: indicators.cmd_broad
      }
    },
    sector_rotation_us: usSectorRotationSphere,
    macro_events: {
      ...macroEventsDimension,
      id: 'macro_events',
      metricNature: 'event',
      status: macroEventsDimension.status,
      asOfDate: snapshotDate,
      collectedAt: generatedAt,
      source: macroEventsDimension.source,
      upcomingEvents
    }
  };

  // 4 Satélites de tendência histórica (21 pregões) + Contexto de Política Monetária (Selic separada de DI!)
  const macroTrendsDimension = macroTrends.buildMacroTrendsDimension(seriesById, { now });
  const trendSatellites21d = {
    trend_dolar: { ...indicators.fx_usd_brl, macroTrend: macroTrendsDimension.bySatelliteId.trend_dolar },
    trend_di: {
      ...indicators.rate_di_curve,
      diCurvePending: indicators.rate_di_curve.status === FRESHNESS.INDISPONIVEL,
      macroTrend: macroTrendsDimension.bySatelliteId.trend_di,
      monetaryPolicyContext: macroTrendsDimension.policyContext.selic
    },
    trend_us10y: { ...indicators.rate_us10y, macroTrend: macroTrendsDimension.bySatelliteId.trend_us10y },
    trend_vix: { ...indicators.vol_vix, macroTrend: macroTrendsDimension.bySatelliteId.trend_vix }
  };

  // Faixa secundária e compacta do rodapé (variações de 1 único pregão)
  const dailyTapeSecondary = [
    { symbol: 'IBOV', label: 'IBOV', market: 'BR', flag: '🇧🇷', calendar: 'B3 (São Paulo)', metric: indicators.cycle_br_ibov },
    { symbol: 'SPX', label: 'S&P 500', market: 'US', flag: '🇺🇸', calendar: 'NYSE (New York)', metric: indicators.cycle_us_sp500 },
    { symbol: 'NDX', label: 'Nasdaq', market: 'US', flag: '🇺🇸', calendar: 'NASDAQ (New York)', metric: indicators.cycle_us_nasdaq },
    { symbol: 'USD', label: 'Dólar PTAX', market: 'BR', flag: '🇧🇷', calendar: 'Banco Central (BRL)', metric: indicators.fx_usd_brl },
    { symbol: 'GOLD', label: 'Ouro (GLD)', market: 'US', flag: '🇺🇸', calendar: 'NYSE Arca (USD)', metric: indicators.cmd_gold },
    { symbol: 'VIX', label: 'VIX', market: 'US', flag: '🇺🇸', calendar: 'CBOE (New York)', metric: indicators.vol_vix }
  ].map(({ symbol, label, market, flag, calendar, metric }) => ({
    symbol,
    label,
    market,
    flag,
    calendar,
    closeValue: metric?.latestValue ?? null,
    change1dPct: metric?.change1dPct ?? null,
    unit: metric?.unit || '',
    asOfDate: metric?.freshness?.asOfDate || null,
    updatedAt: metric?.freshness?.collectedAt || generatedAt,
    timezone: metric?.freshness?.timezone || (market === 'US' ? 'America/New_York' : 'America/Sao_Paulo'),
    status: metric?.status || 'indisponivel'
  }));

  // Estado consolidado global de frescor (exclui indicadores intencionalmente unconfigured do cálculo de quebra, mas expõe contagem!)
  const configuredStatuses = Object.values(indicators)
    .filter(m => m.provider !== 'unconfigured')
    .map(m => m.status);

  const counts = { atualizado: 0, atrasado: 0, indisponivel: 0, parcial: 0 };
  for (const m of Object.values(indicators)) {
    counts[m.status] = (counts[m.status] || 0) + 1;
  }

  const overallStatus = aggregateFreshnessStatus(configuredStatuses);

  return {
    schemaVersion: '1.0',
    snapshotDate,
    generatedAt,
    horizonSessions: 21,
    overallStatus,
    freshnessSummary: {
      overallStatus,
      counts,
      totalCataloged: Object.keys(INSTRUMENT_CATALOG).length
    },
    spheres,
    trendSatellites21d,
    macroTrends: macroTrendsDimension,
    officialCalendar: upcomingEvents,
    upcomingEvents,
    dailyTapeSecondary,
    indicators
  };
}

module.exports = {
  FRESHNESS,
  OFFICIAL_MACRO_CALENDAR,
  pctChange,
  diffChange,
  filterClosedNonFutureObservations,
  extractOfficialRegimeInfo,
  classifySeriesFreshness,
  computeIndicatorMetrics,
  aggregateFreshnessStatus,
  resolveUpcomingOfficialEvents,
  macroEventsCalendar,
  buildMacroEventsDimension: macroEventsCalendar.buildMacroEventsDimension,
  buildBrazilCycleDimension,
  buildUsCycleDimension,
  buildUsBreadthDimension,
  buildUsSectorRotationDimension: usSectorRotation.buildUsSectorRotationDimension,
  buildMacroTrendsDimension: macroTrends.buildMacroTrendsDimension,
  buildDailySnapshot
};
