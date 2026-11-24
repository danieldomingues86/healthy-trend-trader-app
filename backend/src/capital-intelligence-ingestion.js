'use strict';

/**
 * CAPITAL INTELLIGENCE — CAMADA DE PADRONIZAÇÃO, CALENDÁRIOS E INGESTÃO
 *
 * Responsabilidades:
 * - Catálogo padronizado de instrumentos (moeda, unidade, natureza epistemológica, fuso horário e janela de publicação).
 * - Motor de calendário por mercado (America/Sao_Paulo para BR; America/New_York para EUA).
 * - Nunca tratar dado ainda não publicado como dado do dia.
 * - Coletores idempotentes com retry, backoff exponencial, timeout, rate limit e isolamento de falhas.
 * - Credenciais permanecem estritamente no backend (process.env).
 */

const { normalizeDateIso } = require('./capital-intelligence-store');

// Feriados fixos nacionais (não-móveis) para evitar falsos atrasos em datas sem pregão
const FIXED_HOLIDAYS = {
  BR: new Set(['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25']),
  US: new Set(['01-01', '06-19', '07-04', '12-25'])
};

// Regras de fuso e disponibilidade pós-fechamento por mercado
const MARKET_SCHEDULES = {
  BR: {
    timezone: 'America/Sao_Paulo',
    closeHour: 18,
    closeMinute: 0,
    availableAfterHour: 18,
    availableAfterMinute: 30
  },
  BR_PTAX: {
    timezone: 'America/Sao_Paulo',
    closeHour: 13,
    closeMinute: 15,
    availableAfterHour: 13,
    availableAfterMinute: 30
  },
  US: {
    timezone: 'America/New_York',
    closeHour: 16,
    closeMinute: 0,
    availableAfterHour: 16,
    availableAfterMinute: 45
  }
};

// Catálogo canônico de instrumentos do Capital Intelligence
const INSTRUMENT_CATALOG = {
  // 1. Ciclos de Mercado — Brasil (reuso canônico de market-regime.js)
  cycle_br_ibov: {
    indicatorId: 'cycle_br_ibov',
    symbol: 'IBOV',
    name: 'Ibovespa (Ciclo Brasil)',
    market: 'BR',
    scheduleKey: 'BR',
    currency: 'PTS',
    unit: 'pts',
    metricNature: 'price_performance',
    provider: 'b3_market_regime',
    publishLagDays: 0
  },
  cycle_br_ifix: {
    indicatorId: 'cycle_br_ifix',
    symbol: 'IFIX',
    name: 'IFIX (FIIs Brasil)',
    market: 'BR',
    scheduleKey: 'BR',
    currency: 'PTS',
    unit: 'pts',
    metricNature: 'price_performance',
    provider: 'b3_market_regime',
    publishLagDays: 0
  },
  cycle_br_bdrx: {
    indicatorId: 'cycle_br_bdrx',
    symbol: 'BDRX',
    name: 'BDRX (BDRs Brasil)',
    market: 'BR',
    scheduleKey: 'BR',
    currency: 'PTS',
    unit: 'pts',
    metricNature: 'price_performance',
    provider: 'b3_market_regime',
    publishLagDays: 0
  },

  // 2. Ciclos de Mercado — Estados Unidos (reuso canônico de market-regime.js / Twelve Data)
  cycle_us_sp500: {
    indicatorId: 'cycle_us_sp500',
    symbol: 'SPY',
    name: 'S&P 500 (Proxy SPY)',
    market: 'US',
    scheduleKey: 'US',
    currency: 'USD',
    unit: 'USD',
    metricNature: 'price_performance',
    provider: 'twelve_data_market_regime',
    publishLagDays: 0,
    isProxy: true
  },
  cycle_us_nasdaq: {
    indicatorId: 'cycle_us_nasdaq',
    symbol: 'QQQ',
    name: 'Nasdaq-100 (Proxy QQQ)',
    market: 'US',
    scheduleKey: 'US',
    currency: 'USD',
    unit: 'USD',
    metricNature: 'price_performance',
    provider: 'twelve_data_market_regime',
    publishLagDays: 0,
    isProxy: true
  },
  cycle_us_rsp: {
    indicatorId: 'cycle_us_rsp',
    symbol: 'RSP',
    name: 'S&P 500 Equal-Weight (RSP)',
    market: 'US',
    scheduleKey: 'US',
    currency: 'USD',
    unit: 'USD',
    metricNature: 'price_performance',
    provider: 'twelve_data',
    publishLagDays: 0,
    isProxy: true,
    isComplementary: true
  },

  // 3. Macro Brasil (BCB SGS Oficial Gratuito)
  fx_usd_brl: {
    indicatorId: 'fx_usd_brl',
    symbol: 'USDBRL',
    name: 'Dólar PTAX (USD/BRL)',
    market: 'BR',
    scheduleKey: 'BR_PTAX',
    currency: 'BRL',
    unit: 'BRL/USD',
    metricNature: 'price_performance',
    provider: 'bcb_sgs',
    sgsCode: 1,
    publishLagDays: 0
  },
  rate_selic_meta: {
    indicatorId: 'rate_selic_meta',
    symbol: 'SELIC',
    name: 'Taxa Selic Meta (BCB)',
    market: 'BR',
    scheduleKey: 'BR',
    currency: 'PCT',
    unit: '% a.a.',
    metricNature: 'macro_rate',
    provider: 'bcb_sgs',
    sgsCode: 432,
    publishLagDays: 0
  },
  inflation_ipca: {
    indicatorId: 'inflation_ipca',
    symbol: 'IPCA',
    name: 'IPCA Mensal (IBGE/BCB)',
    market: 'BR',
    scheduleKey: 'BR',
    currency: 'PCT',
    unit: '% a.m.',
    metricNature: 'macro_rate',
    provider: 'bcb_sgs',
    sgsCode: 433,
    publishLagDays: 35 // Série mensal
  },

  // 4. Macro & Volatilidade EUA (CBOE CSV Oficial + FRED API)
  vol_vix: {
    indicatorId: 'vol_vix',
    symbol: 'VIX',
    name: 'CBOE VIX (Volatilidade Implícita)',
    market: 'US',
    scheduleKey: 'US',
    currency: 'PTS',
    unit: 'idx',
    metricNature: 'macro_rate',
    provider: 'cboe_csv',
    fredSeries: 'VIXCLS',
    publishLagDays: 1
  },
  rate_us10y: {
    indicatorId: 'rate_us10y',
    symbol: 'US10Y',
    name: 'US Treasury 10Y Yield',
    market: 'US',
    scheduleKey: 'US',
    currency: 'PCT',
    unit: '% a.a.',
    metricNature: 'macro_rate',
    provider: 'fred',
    fredSeries: 'DGS10',
    publishLagDays: 1
  },
  rate_fed_funds: {
    indicatorId: 'rate_fed_funds',
    symbol: 'FEDFUNDS',
    name: 'Effective Federal Funds Rate',
    market: 'US',
    scheduleKey: 'US',
    currency: 'PCT',
    unit: '% a.a.',
    metricNature: 'macro_rate',
    provider: 'fred',
    fredSeries: 'DFF',
    publishLagDays: 1
  },

  // 5. Ouro / Proteção e Commodities (Twelve Data ETFs)
  cmd_gold: {
    indicatorId: 'cmd_gold',
    symbol: 'GLD',
    name: 'Ouro (Proxy ETF GLD)',
    market: 'US',
    scheduleKey: 'US',
    currency: 'USD',
    unit: 'USD',
    metricNature: 'price_performance',
    provider: 'twelve_data',
    publishLagDays: 0,
    isProxy: true
  },
  cmd_oil: {
    indicatorId: 'cmd_oil',
    symbol: 'USO',
    name: 'Petróleo WTI (Proxy ETF USO)',
    market: 'US',
    scheduleKey: 'US',
    currency: 'USD',
    unit: 'USD',
    metricNature: 'price_performance',
    provider: 'twelve_data',
    publishLagDays: 0,
    isProxy: true
  },
  cmd_broad: {
    indicatorId: 'cmd_broad',
    symbol: 'DBC',
    name: 'Commodities Amplas (ETF DBC)',
    market: 'US',
    scheduleKey: 'US',
    currency: 'USD',
    unit: 'USD',
    metricNature: 'price_performance',
    provider: 'twelve_data',
    publishLagDays: 0,
    isProxy: true
  },

  // 6. Rotação Setorial — Estados Unidos (11 SPDR Sectors + Semicondutores)
  sec_us_xlk: { indicatorId: 'sec_us_xlk', symbol: 'XLK', name: 'Tecnologia / IA (XLK)', sectorLabel: 'Tecnologia / IA', market: 'US', scheduleKey: 'US', currency: 'USD', unit: 'USD', metricNature: 'price_performance', provider: 'twelve_data', publishLagDays: 0 },
  sec_us_smh: { indicatorId: 'sec_us_smh', symbol: 'SMH', name: 'Semicondutores (SMH)', sectorLabel: 'Semicondutores', market: 'US', scheduleKey: 'US', currency: 'USD', unit: 'USD', metricNature: 'price_performance', provider: 'twelve_data', publishLagDays: 0 },
  sec_us_xlf: { indicatorId: 'sec_us_xlf', symbol: 'XLF', name: 'Financeiro (XLF)', sectorLabel: 'Financeiro', market: 'US', scheduleKey: 'US', currency: 'USD', unit: 'USD', metricNature: 'price_performance', provider: 'twelve_data', publishLagDays: 0 },
  sec_us_xlv: { indicatorId: 'sec_us_xlv', symbol: 'XLV', name: 'Saúde (XLV)', sectorLabel: 'Saúde', market: 'US', scheduleKey: 'US', currency: 'USD', unit: 'USD', metricNature: 'price_performance', provider: 'twelve_data', publishLagDays: 0 },
  sec_us_xle: { indicatorId: 'sec_us_xle', symbol: 'XLE', name: 'Energia (XLE)', sectorLabel: 'Energia', market: 'US', scheduleKey: 'US', currency: 'USD', unit: 'USD', metricNature: 'price_performance', provider: 'twelve_data', publishLagDays: 0 },
  sec_us_xli: { indicatorId: 'sec_us_xli', symbol: 'XLI', name: 'Industriais (XLI)', sectorLabel: 'Industriais', market: 'US', scheduleKey: 'US', currency: 'USD', unit: 'USD', metricNature: 'price_performance', provider: 'twelve_data', publishLagDays: 0 },
  sec_us_xly: { indicatorId: 'sec_us_xly', symbol: 'XLY', name: 'Consumo Discricionário (XLY)', sectorLabel: 'Consumo Discric.', market: 'US', scheduleKey: 'US', currency: 'USD', unit: 'USD', metricNature: 'price_performance', provider: 'twelve_data', publishLagDays: 0 },
  sec_us_xlp: { indicatorId: 'sec_us_xlp', symbol: 'XLP', name: 'Consumo Básico (XLP)', sectorLabel: 'Consumo Básico', market: 'US', scheduleKey: 'US', currency: 'USD', unit: 'USD', metricNature: 'price_performance', provider: 'twelve_data', publishLagDays: 0 },
  sec_us_xlu: { indicatorId: 'sec_us_xlu', symbol: 'XLU', name: 'Utilities (XLU)', sectorLabel: 'Utilities', market: 'US', scheduleKey: 'US', currency: 'USD', unit: 'USD', metricNature: 'price_performance', provider: 'twelve_data', publishLagDays: 0 },
  sec_us_xlb: { indicatorId: 'sec_us_xlb', symbol: 'XLB', name: 'Materiais Básicos (XLB)', sectorLabel: 'Materiais', market: 'US', scheduleKey: 'US', currency: 'USD', unit: 'USD', metricNature: 'price_performance', provider: 'twelve_data', publishLagDays: 0 },
  sec_us_xlre: { indicatorId: 'sec_us_xlre', symbol: 'XLRE', name: 'Imobiliário (XLRE)', sectorLabel: 'Imobiliário', market: 'US', scheduleKey: 'US', currency: 'USD', unit: 'USD', metricNature: 'price_performance', provider: 'twelve_data', publishLagDays: 0 },
  sec_us_xlc: { indicatorId: 'sec_us_xlc', symbol: 'XLC', name: 'Comunicação (XLC)', sectorLabel: 'Comunicação', market: 'US', scheduleKey: 'US', currency: 'USD', unit: 'USD', metricNature: 'price_performance', provider: 'twelve_data', publishLagDays: 0 },

  // 7. Indicadores Explicitamente Pendentes de Provedor Dedicado (nunca simulados)
  breadth_us_broad: {
    indicatorId: 'breadth_us_broad',
    symbol: 'US_BREADTH',
    name: 'Market Breadth EUA (NYSE + NASDAQ)',
    market: 'US',
    scheduleKey: 'US',
    currency: 'PCT',
    unit: '%',
    metricNature: 'breadth',
    provider: 'unconfigured',
    publishLagDays: 0,
    unavailableReason: 'PENDING_US_BROAD_BREADTH_PROVIDER'
  },
  rate_di_curve: {
    indicatorId: 'rate_di_curve',
    symbol: 'DI1',
    name: 'Curva DI Futuro (B3 / ANBIMA ETTJ)',
    market: 'BR',
    scheduleKey: 'BR',
    currency: 'PCT',
    unit: '% a.a.',
    metricNature: 'macro_rate',
    provider: 'unconfigured',
    publishLagDays: 1,
    unavailableReason: 'PENDING_DI_CURVE_PARSER'
  }
};

const US_SECTOR_IDS = Object.keys(INSTRUMENT_CATALOG).filter(id => id.startsWith('sec_us_'));
const COMMODITY_IDS = ['cmd_gold', 'cmd_oil', 'cmd_broad'];

// ============================================================================
// CALENDÁRIO DE MERCADO & FUSO HORÁRIO
// ============================================================================

function getZonedParts(date = new Date(), timeZone = 'America/Sao_Paulo') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short'
  }).formatToParts(date);

  const map = Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return {
    isoDate: `${map.year}-${map.month}-${map.day}`,
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday: map.weekday
  };
}

function addCalendarDays(isoDate, deltaDays) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

function isBusinessDay(isoDate, market = 'BR') {
  const clean = normalizeDateIso(isoDate);
  if (!clean) return false;
  const [y, m, d] = clean.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0=Sun, 6=Sat
  if (dow === 0 || dow === 6) return false;

  const mmdd = clean.slice(5, 10);
  const holidaySet = FIXED_HOLIDAYS[market === 'US' ? 'US' : 'BR'];
  return !holidaySet.has(mmdd);
}

function shiftBusinessDays(isoDate, deltaBusinessDays, market = 'BR') {
  let cursor = normalizeDateIso(isoDate);
  if (!cursor) return null;

  if (deltaBusinessDays === 0) {
    while (!isBusinessDay(cursor, market)) {
      cursor = addCalendarDays(cursor, -1);
    }
    return cursor;
  }

  const step = deltaBusinessDays > 0 ? 1 : -1;
  let remaining = Math.abs(deltaBusinessDays);
  while (remaining > 0) {
    cursor = addCalendarDays(cursor, step);
    if (isBusinessDay(cursor, market)) {
      remaining -= 1;
    }
  }
  return cursor;
}

function countBusinessDaysBetween(fromIso, toIso, market = 'BR') {
  const from = normalizeDateIso(fromIso);
  const to = normalizeDateIso(toIso);
  if (!from || !to || from >= to) return 0;

  let cursor = from;
  let count = 0;
  let guard = 0;
  while (cursor < to && guard < 1000) {
    cursor = addCalendarDays(cursor, 1);
    if (isBusinessDay(cursor, market)) count += 1;
    guard += 1;
  }
  return count;
}

/**
 * Calcula a data de referência mais recente ESPERADA para um indicador/mercado em `now`.
 * Regra estrita:
 * - Se o mercado ainda não fechou/publicou hoje no seu fuso horário, NÃO espera dado de hoje.
 * - Se hoje é fim de semana ou feriado, recua para o último dia útil.
 * - Aplica `publishLagDays` (ex.: D+1 para séries FRED/CBOE).
 */
function getExpectedReferenceDate(indicatorOrSchedule, now = new Date()) {
  const spec = typeof indicatorOrSchedule === 'string'
    ? (INSTRUMENT_CATALOG[indicatorOrSchedule] || { market: indicatorOrSchedule === 'US' ? 'US' : 'BR', scheduleKey: indicatorOrSchedule, publishLagDays: 0 })
    : (indicatorOrSchedule || { market: 'BR', scheduleKey: 'BR', publishLagDays: 0 });

  const market = spec.market === 'US' ? 'US' : 'BR';
  const schedule = MARKET_SCHEDULES[spec.scheduleKey] || MARKET_SCHEDULES[market];
  const zoned = getZonedParts(now, schedule.timezone);

  const afterPublishCutoff =
    (zoned.hour > schedule.availableAfterHour) ||
    (zoned.hour === schedule.availableAfterHour && zoned.minute >= schedule.availableAfterMinute);

  let expected;
  if (isBusinessDay(zoned.isoDate, market) && afterPublishCutoff) {
    expected = zoned.isoDate;
  } else {
    // Ainda não publicado hoje (ou fim de semana/feriado): último dia útil anterior
    const prevCal = addCalendarDays(zoned.isoDate, -1);
    expected = shiftBusinessDays(prevCal, 0, market);
  }

  const lag = Number(spec.publishLagDays || 0);
  if (lag > 0 && lag <= 5) {
    expected = shiftBusinessDays(expected, -lag, market);
  } else if (lag > 5) {
    // Séries mensais (ex.: IPCA) — recua dias corridos aproximados para evitar falso atraso diário
    expected = addCalendarDays(expected, -lag);
  }

  return {
    expectedDate: expected,
    marketLocalDate: zoned.isoDate,
    marketLocalTime: `${String(zoned.hour).padStart(2, '0')}:${String(zoned.minute).padStart(2, '0')}`,
    timezone: schedule.timezone,
    isAfterPublishCutoff: afterPublishCutoff,
    isBusinessDayToday: isBusinessDay(zoned.isoDate, market)
  };
}

// ============================================================================
// HTTP CLIENTE RESILIENTE (RETRY + BACKOFF + RATE LIMIT)
// ============================================================================

const providerLastCallAt = new Map();

async function enforceProviderRateLimit(providerKey, minIntervalMs = 250) {
  if (minIntervalMs <= 0) return;
  const prev = providerLastCallAt.get(providerKey) || 0;
  const elapsed = Date.now() - prev;
  if (elapsed < minIntervalMs) {
    await new Promise(r => setTimeout(r, minIntervalMs - elapsed));
  }
  providerLastCallAt.set(providerKey, Date.now());
}

async function fetchWithRetry(url, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const maxRetries = options.maxRetries != null ? options.maxRetries : 2;
  const timeoutMs = options.timeoutMs || 12000;
  const baseBackoffMs = options.baseBackoffMs || 400;
  const providerKey = options.providerKey || 'http';
  const minIntervalMs = options.minIntervalMs != null ? options.minIntervalMs : 200;

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await enforceProviderRateLimit(providerKey, minIntervalMs);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url, {
        headers: Object.assign({ 'User-Agent': 'HealthyTrendTrader-CapitalIntelligence/1.0' }, options.headers || {}),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status} em ${providerKey}`);
        lastError.status = response.status;
        if (attempt < maxRetries) {
          const retryAfter = Number(response.headers?.get?.('retry-after'));
          const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.min(retryAfter * 1000, 15000)
            : baseBackoffMs * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }
        throw lastError;
      }

      if (!response.ok) {
        const err = new Error(`HTTP ${response.status} em ${providerKey}`);
        err.status = response.status;
        throw err;
      }

      return response;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      const retryable = err.name === 'AbortError' || err.status === 429 || (err.status && err.status >= 500) || /fetch failed|ECONNRESET|ETIMEDOUT/i.test(String(err.message));
      if (retryable && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, baseBackoffMs * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error(`Falha desconhecida em ${providerKey}`);
}

// ============================================================================
// COLETORES CANÔNICOS POR FONTE
// ============================================================================

/**
 * 1. Reutiliza o motor canônico backend/src/market-regime.js para Ciclos BR e EUA.
 * Zero duplicação de EMA10/EMA72 ou ATR%(21) vs SMA(252).
 */
async function collectFromMarketRegime(benchmarkIds = ['IBOV', 'IFIX', 'BDRX'], options = {}) {
  const marketRegime = options.marketRegime || require('./market-regime');
  const forceSync = Boolean(options.forceSync);
  const collectedAt = new Date(options.now || Date.now()).toISOString();

  const benchmarkToIndicator = {
    IBOV: 'cycle_br_ibov',
    IFIX: 'cycle_br_ifix',
    BDRX: 'cycle_br_bdrx',
    SP500: 'cycle_us_sp500',
    NASDAQ: 'cycle_us_nasdaq'
  };

  const observations = [];
  const errors = [];
  const updatedIds = [];

  for (const bmId of benchmarkIds) {
    const indicatorId = benchmarkToIndicator[bmId];
    const spec = INSTRUMENT_CATALOG[indicatorId];
    if (!spec) continue;

    try {
      const historyPayload = forceSync
        ? await marketRegime.syncBenchmarkRegimes(bmId)
        : await marketRegime.getRegimeHistory(bmId);

      const regimes = Array.isArray(historyPayload?.regimes) ? historyPayload.regimes : [];
      if (!regimes.length) {
        errors.push({ indicatorId, provider: spec.provider, message: `Sem série de regimes para ${bmId}` });
        continue;
      }

      // Persiste últimos 120 pregões para suportar janelas de 21p, 63p e histórico
      for (const r of regimes.slice(-120)) {
        observations.push({
          indicatorId: spec.indicatorId,
          symbol: spec.symbol,
          market: spec.market,
          currency: spec.currency,
          unit: spec.unit,
          metricNature: spec.metricNature,
          referenceDate: r.reference_date,
          closeValue: r.close_price,
          sourceProvider: spec.provider,
          sourceTimestamp: `${r.reference_date}T21:00:00.000Z`,
          collectedAt,
          qualityStatus: 'valid',
          metadata: {
            regime: r.regime,
            direction: r.direction,
            volatility: r.volatility,
            ema10: r.ema_10,
            ema72: r.ema_72,
            atr21: r.atr_21,
            atrPct: r.atr_percentage,
            atrPctSma252: r.atr_percentage_sma_252,
            volatilityDeviation: r.volatility_deviation,
            calculationVersion: r.calculation_version || 'v1'
          }
        });
      }

      updatedIds.push(indicatorId);
    } catch (err) {
      errors.push({ indicatorId, provider: spec.provider, message: err.message });
    }
  }

  return { observations, updatedIds, errors, creditsUsed: 0 };
}

/**
 * 2. Coletor Oficial BCB SGS (Gratuito, Oficial, Sem Chave):
 *    - Série 1: Dólar PTAX Venda (USD/BRL)
 *    - Série 432: Taxa Selic Meta (% a.a.)
 *    - Série 433: IPCA Mensal (% a.m.)
 */
async function collectBcbMacro(options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const collectedAt = now.toISOString();
  const targetIds = options.indicatorIds || ['fx_usd_brl', 'rate_selic_meta', 'inflation_ipca'];

  const endDate = getZonedParts(now, 'America/Sao_Paulo').isoDate;
  const startDate = addCalendarDays(endDate, -150);
  const toBrDate = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

  const observations = [];
  const updatedIds = [];
  const errors = [];

  for (const id of targetIds) {
    const spec = INSTRUMENT_CATALOG[id];
    if (!spec || !spec.sgsCode) continue;

    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${spec.sgsCode}/dados?formato=json&dataInicial=${toBrDate(startDate)}&dataFinal=${toBrDate(endDate)}`;

    try {
      const response = await fetchWithRetry(url, {
        fetchImpl: options.fetchImpl,
        providerKey: 'bcb_sgs',
        maxRetries: options.maxRetries ?? 2,
        baseBackoffMs: options.baseBackoffMs ?? 300,
        minIntervalMs: options.minIntervalMs ?? 150
      });
      const json = await response.json();
      if (!Array.isArray(json) || !json.length) {
        errors.push({ indicatorId: id, provider: 'bcb_sgs', message: `Série BCB ${spec.sgsCode} retornou vazia.` });
        continue;
      }

      for (const item of json) {
        const refDate = normalizeDateIso(item.data);
        const val = Number(String(item.valor || '').replace(',', '.'));
        if (!refDate || !Number.isFinite(val)) continue;
        observations.push({
          indicatorId: spec.indicatorId,
          symbol: spec.symbol,
          market: spec.market,
          currency: spec.currency,
          unit: spec.unit,
          metricNature: spec.metricNature,
          referenceDate: refDate,
          closeValue: val,
          sourceProvider: 'bcb_sgs',
          sourceTimestamp: `${refDate}T16:30:00.000Z`,
          collectedAt,
          qualityStatus: 'valid',
          metadata: { sgsCode: spec.sgsCode }
        });
      }

      updatedIds.push(id);
    } catch (err) {
      errors.push({ indicatorId: id, provider: 'bcb_sgs', message: err.message });
    }
  }

  return { observations, updatedIds, errors, creditsUsed: 0 };
}

/**
 * 3. Coletor Oficial CBOE VIX CSV (Gratuito, Oficial, Sem Chave):
 *    Parseia linhas recentes de VIX_History.csv (DATE,OPEN,HIGH,LOW,CLOSE).
 */
function parseCboeVixCsv(csvText, limitRows = 120) {
  const lines = String(csvText || '').trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const parsed = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 5) continue;
    // Formato CBOE: MM/DD/YYYY
    const rawDate = cols[0].trim();
    let iso = null;
    const usMatch = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (usMatch) iso = `${usMatch[3]}-${usMatch[1]}-${usMatch[2]}`;
    else iso = normalizeDateIso(rawDate);

    const open = Number(cols[1]);
    const high = Number(cols[2]);
    const low = Number(cols[3]);
    const close = Number(cols[4]);
    if (!iso || !Number.isFinite(close)) continue;

    parsed.push({
      referenceDate: iso,
      openValue: Number.isFinite(open) ? open : close,
      highValue: Number.isFinite(high) ? high : close,
      lowValue: Number.isFinite(low) ? low : close,
      closeValue: close
    });
  }

  parsed.sort((a, b) => a.referenceDate.localeCompare(b.referenceDate));
  return parsed.slice(-limitRows);
}

async function collectCboeVix(options = {}) {
  const spec = INSTRUMENT_CATALOG.vol_vix;
  const collectedAt = new Date(options.now || Date.now()).toISOString();
  const url = 'https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv';

  try {
    const response = await fetchWithRetry(url, {
      fetchImpl: options.fetchImpl,
      providerKey: 'cboe_csv',
      maxRetries: options.maxRetries ?? 2,
      baseBackoffMs: options.baseBackoffMs ?? 300,
      minIntervalMs: options.minIntervalMs ?? 150
    });
    const text = await response.text();
    const rows = parseCboeVixCsv(text, 120);
    if (!rows.length) {
      return { observations: [], updatedIds: [], errors: [{ indicatorId: 'vol_vix', provider: 'cboe_csv', message: 'CSV CBOE sem linhas válidas.' }], creditsUsed: 0 };
    }

    const observations = rows.map(r => ({
      indicatorId: spec.indicatorId,
      symbol: spec.symbol,
      market: spec.market,
      currency: spec.currency,
      unit: spec.unit,
      metricNature: spec.metricNature,
      referenceDate: r.referenceDate,
      openValue: r.openValue,
      highValue: r.highValue,
      lowValue: r.lowValue,
      closeValue: r.closeValue,
      sourceProvider: 'cboe_csv',
      sourceTimestamp: `${r.referenceDate}T21:15:00.000Z`,
      collectedAt,
      qualityStatus: 'valid',
      metadata: { officialSource: 'CBOE Daily History CSV' }
    }));

    return { observations, updatedIds: ['vol_vix'], errors: [], creditsUsed: 0 };
  } catch (err) {
    return {
      observations: [],
      updatedIds: [],
      errors: [{ indicatorId: 'vol_vix', provider: 'cboe_csv', message: err.message }],
      creditsUsed: 0
    };
  }
}

/**
 * 4. Coletor Oficial FRED (Federal Reserve Bank of St. Louis):
 *    Ativado exclusivamente se process.env.FRED_API_KEY estiver configurada no backend.
 */
async function collectFredMacro(options = {}) {
  const apiKey = options.apiKey !== undefined ? options.apiKey : (process.env.FRED_API_KEY || '');
  const targetIds = options.indicatorIds || ['rate_us10y', 'rate_fed_funds'];

  if (!apiKey) {
    return {
      observations: [],
      updatedIds: [],
      errors: [],
      skipped: true,
      skipReason: 'FRED_API_KEY_NOT_CONFIGURED',
      creditsUsed: 0
    };
  }

  const now = options.now ? new Date(options.now) : new Date();
  const collectedAt = now.toISOString();
  const startDate = addCalendarDays(getZonedParts(now, 'America/New_York').isoDate, -150);

  const observations = [];
  const updatedIds = [];
  const errors = [];

  for (const id of targetIds) {
    const spec = INSTRUMENT_CATALOG[id];
    if (!spec || !spec.fredSeries) continue;

    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(spec.fredSeries)}&api_key=${encodeURIComponent(apiKey)}&file_type=json&observation_start=${startDate}`;

    try {
      const response = await fetchWithRetry(url, {
        fetchImpl: options.fetchImpl,
        providerKey: 'fred',
        maxRetries: options.maxRetries ?? 2,
        baseBackoffMs: options.baseBackoffMs ?? 300,
        minIntervalMs: options.minIntervalMs ?? 200
      });
      const json = await response.json();
      const rows = Array.isArray(json?.observations) ? json.observations : [];

      let validCount = 0;
      for (const item of rows) {
        const refDate = normalizeDateIso(item.date);
        const val = Number(item.value);
        if (!refDate || !Number.isFinite(val)) continue;
        validCount += 1;
        observations.push({
          indicatorId: spec.indicatorId,
          symbol: spec.symbol,
          market: spec.market,
          currency: spec.currency,
          unit: spec.unit,
          metricNature: spec.metricNature,
          referenceDate: refDate,
          closeValue: val,
          sourceProvider: 'fred',
          sourceTimestamp: `${refDate}T21:00:00.000Z`,
          collectedAt,
          qualityStatus: 'valid',
          metadata: { fredSeries: spec.fredSeries }
        });
      }

      if (validCount > 0) updatedIds.push(id);
      else errors.push({ indicatorId: id, provider: 'fred', message: `Série FRED ${spec.fredSeries} sem observações numéricas válidas.` });
    } catch (err) {
      errors.push({ indicatorId: id, provider: 'fred', message: err.message });
    }
  }

  return { observations, updatedIds, errors, creditsUsed: 0 };
}

/**
 * 5. Coletor Twelve Data para ETFs de Commodities (GLD, USO, DBC) e Rotação Setorial EUA (12 ETFs).
 *    Respeita estritamente TwelveDataUsageGuard (8 créditos/minuto, 700 créditos seguros/dia).
 */
async function collectTwelveDataEtfs(indicatorIds = [...COMMODITY_IDS, ...US_SECTOR_IDS], options = {}) {
  const collectedAt = new Date(options.now || Date.now()).toISOString();
  const { TwelveDataMarketDataProvider } = require('./twelve-data-provider');
  const provider = options.provider || new TwelveDataMarketDataProvider();

  if (!provider.getApiKey || !provider.getApiKey()) {
    return {
      observations: [],
      updatedIds: [],
      errors: [],
      skipped: true,
      skipReason: 'TWELVE_DATA_API_KEY_NOT_CONFIGURED',
      creditsUsed: 0
    };
  }

  const specs = indicatorIds.map(id => INSTRUMENT_CATALOG[id]).filter(Boolean);
  const estimatedCredits = specs.length;

  // Verifica orçamento diário seguro antes de iniciar o lote
  if (provider.usageGuard && typeof provider.usageGuard.canExecute === 'function') {
    const guardStatus = provider.usageGuard.getStatus ? provider.usageGuard.getStatus() : null;
    const remaining = guardStatus?.creditsRemainingToday;
    if (Number.isFinite(remaining) && remaining < estimatedCredits) {
      return {
        observations: [],
        updatedIds: [],
        errors: [{ provider: 'twelve_data', message: `Orçamento diário insuficiente (${remaining} < ${estimatedCredits} créditos).` }],
        skipped: true,
        skipReason: 'TWELVE_DATA_DAILY_BUDGET_PROTECTED',
        creditsUsed: 0
      };
    }
  }

  const outputsize = Number(options.outputsize || 90);
  const observations = [];
  const updatedIds = [];
  const errors = [];
  let creditsUsed = 0;

  for (const spec of specs) {
    try {
      const candles = await provider.getHistoricalDailyPrices(spec.symbol, { outputsize });
      creditsUsed += 1;

      if (!Array.isArray(candles) || !candles.length) {
        errors.push({ indicatorId: spec.indicatorId, provider: 'twelve_data', message: `Sem candles retornados para ${spec.symbol}` });
        continue;
      }

      for (const c of candles) {
        const refDate = normalizeDateIso(c.date || c.datetime);
        const close = Number(c.close);
        if (!refDate || !Number.isFinite(close)) continue;
        observations.push({
          indicatorId: spec.indicatorId,
          symbol: spec.symbol,
          market: spec.market,
          currency: spec.currency,
          unit: spec.unit,
          metricNature: spec.metricNature,
          referenceDate: refDate,
          openValue: Number(c.open) || close,
          highValue: Number(c.high) || close,
          lowValue: Number(c.low) || close,
          closeValue: close,
          volume: Number(c.volume) || 0,
          sourceProvider: 'twelve_data',
          sourceTimestamp: `${refDate}T21:00:00.000Z`,
          collectedAt,
          qualityStatus: 'valid',
          metadata: { isProxy: Boolean(spec.isProxy), sectorLabel: spec.sectorLabel || null }
        });
      }

      updatedIds.push(spec.indicatorId);
    } catch (err) {
      errors.push({ indicatorId: spec.indicatorId, provider: 'twelve_data', message: err.message });
      if (/RATE_LIMIT|DAILY_CREDIT|DISABLED/i.test(String(err.message))) {
        break; // Circuit breaker: interrompe o lote sem desperdiçar retentativas
      }
    }
  }

  return { observations, updatedIds, errors, creditsUsed };
}

module.exports = {
  INSTRUMENT_CATALOG,
  MARKET_SCHEDULES,
  US_SECTOR_IDS,
  COMMODITY_IDS,
  getZonedParts,
  addCalendarDays,
  isBusinessDay,
  shiftBusinessDays,
  countBusinessDaysBetween,
  getExpectedReferenceDate,
  fetchWithRetry,
  parseCboeVixCsv,
  collectFromMarketRegime,
  collectBcbMacro,
  collectCboeVix,
  collectFredMacro,
  collectTwelveDataEtfs
};
