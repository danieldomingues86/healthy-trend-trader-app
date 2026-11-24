'use strict';

/**
 * HEALTHY TREND TRADER — US MARKET BREADTH ENGINE
 * Dimensão independente de Amplitude Interna do Mercado Americano (06)
 *
 * Calcula exclusivamente a partir de séries OHLCV reais dos componentes:
 * 1. % de ações acima da SMA(50) e SMA(200) — S&P 500 e Nasdaq-100 separados
 * 2. Advance / Decline (avanços, declínios, neutros, razão A/D e Advance/Decline Line acumulada)
 * 3. Novas Máximas vs. Novas Mínimas em janela de 52 semanas (mínimo 240 pregões reais)
 * 4. Evolução histórica em janelas de 21 e 63 pregões
 * 5. Classificação ampla multi-fator (Forte / Neutra / Fraca) — nunca baseada em um único percentual
 * 6. Detecção explícita de divergências entre o índice (Ciclo EUA) e a participação interna
 *
 * Regras invioláveis:
 * - Nunca preencher componentes ausentes com estimativas fictícias.
 * - Excluir benchmarks (SPY, QQQ) da contagem de componentes.
 * - Documentar composição, cobertura real, limitações, timestamp e defasagem.
 */

const fs = require('node:fs');
const path = require('node:path');
const {
  getExpectedReferenceDate,
  countBusinessDaysBetween
} = require('./capital-intelligence-ingestion');

const BENCHMARK_EXCLUSIONS = new Set(['QQQ', 'SPY', 'DIA', 'IWM', 'RSP', '^GSPC', '^NDX', '^IXIC']);
const DEFAULT_NASDAQ_PRICES_PATH = path.join(__dirname, '..', 'data', 'nasdaq-daily-prices.json');
const DEFAULT_SP500_PRICES_PATH = path.join(__dirname, '..', 'data', 'sp500-daily-prices.json');

const MIN_WINDOW_52W = 240; // ~50-52 semanas úteis (nasdaq-daily-prices tem 250 pregões/ativo)
const MAX_WINDOW_52W = 252;

const BREADTH_METHODOLOGY = {
  name: 'Multi-Factor US Internal Breadth Model v1',
  pillars: [
    { id: 'sma50', label: '% acima da SMA(50)', strongThreshold: '>= 60%', weakThreshold: '<= 40%' },
    { id: 'sma200', label: '% acima da SMA(200)', strongThreshold: '>= 60%', weakThreshold: '<= 40%' },
    { id: 'adLine21d', label: 'Inclinação da A/D Line (21p)', strongThreshold: '> +8% do universo elegível', weakThreshold: '< -8% do universo elegível' },
    { id: 'highLow52w', label: 'Saldo Novas Máx. vs. Mín. (52s)', strongThreshold: 'Saldo líquido positivo', weakThreshold: 'Saldo líquido negativo' }
  ],
  classificationRule: 'Média normalizada dos pilares disponíveis (mín. 2 pilares reais): >= +0,40 => Forte | <= -0,40 => Fraca | intermediário => Neutra. Nunca baseada em um único percentual.',
  missingDataRule: 'Componentes sem histórico suficiente não são preenchidos por estimativa; entram apenas nos denominadores para os quais possuem pregões reais.',
  separationRule: 'Amplitude interna é independente do Ciclo EUA (SPY/QQQ) e serve para confirmar ou sinalizar divergências entre índice e participação.'
};

function round2(n) {
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}

function round1(n) {
  return Number.isFinite(n) ? Number(n.toFixed(1)) : null;
}

/**
 * Normaliza e deduplica candles diários por símbolo, ordenando cronologicamente (ASC)
 * e rejeitando datas futuras ou candles incompletos/inválidos.
 */
function normalizeConstituentMap(rawBySymbol, { maxAllowedDate = null } = {}) {
  const cleanMap = new Map();
  const entries = rawBySymbol instanceof Map
    ? Array.from(rawBySymbol.entries())
    : Object.entries(rawBySymbol || {});

  for (const [rawSym, rows] of entries) {
    const sym = String(rawSym || '').trim().toUpperCase();
    if (!sym || BENCHMARK_EXCLUSIONS.has(sym) || !Array.isArray(rows)) continue;

    const byDate = new Map();
    for (const r of rows) {
      const date = String(r?.date || r?.referenceDate || '').trim().slice(0, 10);
      const close = Number(r?.close ?? r?.closeValue);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(close) || close <= 0) continue;
      if (maxAllowedDate && date > maxAllowedDate) continue;
      if (r?.qualityStatus === 'incomplete' || r?.qualityStatus === 'intraday') continue;

      const high = Number(r?.high ?? r?.highValue);
      const low = Number(r?.low ?? r?.lowValue);
      byDate.set(date, {
        date,
        close,
        high: Number.isFinite(high) && high > 0 ? high : close,
        low: Number.isFinite(low) && low > 0 ? low : close
      });
    }

    if (byDate.size >= 2) {
      const sorted = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
      cleanMap.set(sym, sorted);
    }
  }

  return cleanMap;
}

/**
 * Calcula série histórica diária real de Market Breadth para um universo (SP500 ou NASDAQ_100).
 */
function computeUniverseBreadth(rawBySymbol, options = {}) {
  const universeId = options.universeId || 'NASDAQ_100';
  const universeName = options.universeName || (universeId === 'SP500' ? 'S&P 500' : 'Nasdaq-100');
  const expectedConstituents = Number(options.expectedConstituents || (universeId === 'SP500' ? 500 : 100));
  const now = options.now ? new Date(options.now) : new Date();
  const source = options.source || 'internal_daily_prices';
  const collectedAt = options.collectedAt || null;

  const expectedInfo = getExpectedReferenceDate({ market: 'US', scheduleKey: 'US', publishLagDays: 0 }, now);
  const cleanMap = normalizeConstituentMap(rawBySymbol, { maxAllowedDate: expectedInfo.expectedDate });

  if (cleanMap.size === 0) {
    return {
      universeId,
      universeName,
      available: false,
      status: 'indisponivel',
      source,
      asOfDate: null,
      expectedDate: expectedInfo.expectedDate,
      lagBusinessDays: null,
      collectedAt,
      composition: {
        expectedConstituents,
        coveredConstituents: 0,
        coveragePct: 0,
        eligibleSma50: 0,
        eligibleSma200: 0,
        eligible52w: 0
      },
      latest: null,
      evolution21d: null,
      history21d: [],
      history63d: [],
      condition: null,
      limitations: [
        `Sem histórico diário dos componentes de ${universeName} armazenado (cobertura 0/${expectedConstituents}).`,
        'Componentes ausentes não são estimados nem substituídos pelo ETF do índice.'
      ]
    };
  }

  // Pré-calcula prefix sums de fechamento e índices por data para cada ativo (O(N * D))
  const allDatesSet = new Set();
  const assetStats = [];

  for (const [symbol, candles] of cleanMap.entries()) {
    const dateToIdx = new Map();
    const prefixSum = new Float64Array(candles.length + 1);
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      allDatesSet.add(c.date);
      dateToIdx.set(c.date, i);
      prefixSum[i + 1] = prefixSum[i] + c.close;
    }
    assetStats.push({ symbol, candles, dateToIdx, prefixSum });
  }

  const allDates = Array.from(allDatesSet).sort();
  // Calcula sobre os últimos 63 pregões (para alimentar janelas de 21p e 63p + A/D Line contínua)
  const evalDates = allDates.slice(-63);
  const dailySeries = [];
  let cumulativeAdLine = 0;

  for (const date of evalDates) {
    let activeToday = 0;
    let eligible50 = 0;
    let above50 = 0;
    let eligible200 = 0;
    let above200 = 0;
    let advances = 0;
    let declines = 0;
    let unchanged = 0;
    let eligible52w = 0;
    let newHighs52w = 0;
    let newLows52w = 0;

    for (const asset of assetStats) {
      const idx = asset.dateToIdx.get(date);
      if (idx === undefined) continue;

      const cur = asset.candles[idx];
      activeToday += 1;

      // Advance / Decline vs pregão anterior do próprio ativo
      if (idx >= 1) {
        const prev = asset.candles[idx - 1];
        if (cur.close > prev.close) advances += 1;
        else if (cur.close < prev.close) declines += 1;
        else unchanged += 1;
      }

      // SMA 50 exata
      if (idx >= 49) {
        eligible50 += 1;
        const sma50 = (asset.prefixSum[idx + 1] - asset.prefixSum[idx + 1 - 50]) / 50;
        if (cur.close > sma50) above50 += 1;
      }

      // SMA 200 exata
      if (idx >= 199) {
        eligible200 += 1;
        const sma200 = (asset.prefixSum[idx + 1] - asset.prefixSum[idx + 1 - 200]) / 200;
        if (cur.close > sma200) above200 += 1;
      }

      // 52-Week Highs / Lows (somente se o ativo tiver >= MIN_WINDOW_52W pregões fechados até `date`)
      if (idx + 1 >= MIN_WINDOW_52W) {
        eligible52w += 1;
        const winStart = Math.max(0, idx - (MAX_WINDOW_52W - 1));
        let maxPrevHigh = -Infinity;
        let minPrevLow = Infinity;
        for (let k = winStart; k < idx; k++) {
          const h = asset.candles[k].high;
          const l = asset.candles[k].low;
          if (h > maxPrevHigh) maxPrevHigh = h;
          if (l < minPrevLow) minPrevLow = l;
        }
        if (cur.high >= maxPrevHigh) newHighs52w += 1;
        if (cur.low <= minPrevLow) newLows52w += 1;
      }
    }

    // Descarta datas anômalas com menos de 50% dos componentes cobertos
    if (activeToday < Math.max(1, Math.floor(cleanMap.size * 0.5))) continue;

    const adDiff = advances - declines;
    cumulativeAdLine += adDiff;

    dailySeries.push({
      date,
      activeCount: activeToday,
      eligibleSma50: eligible50,
      aboveSma50Count: above50,
      aboveSma50Pct: eligible50 > 0 ? round1((above50 / eligible50) * 100) : null,
      eligibleSma200: eligible200,
      aboveSma200Count: above200,
      aboveSma200Pct: eligible200 > 0 ? round1((above200 / eligible200) * 100) : null,
      advances,
      declines,
      unchanged,
      adDiff,
      adRatio: declines > 0 ? round2(advances / declines) : (advances > 0 ? advances : null),
      adLine: cumulativeAdLine,
      eligible52w,
      newHighs52w: eligible52w > 0 ? newHighs52w : null,
      newLows52w: eligible52w > 0 ? newLows52w : null,
      netNewHighs52w: eligible52w > 0 ? (newHighs52w - newLows52w) : null
    });
  }

  if (dailySeries.length === 0) {
    return {
      universeId,
      universeName,
      available: false,
      status: 'indisponivel',
      source,
      asOfDate: null,
      expectedDate: expectedInfo.expectedDate,
      lagBusinessDays: null,
      collectedAt,
      composition: { expectedConstituents, coveredConstituents: cleanMap.size, coveragePct: round1((cleanMap.size / expectedConstituents) * 100), eligibleSma50: 0, eligibleSma200: 0, eligible52w: 0 },
      latest: null,
      evolution21d: null,
      history21d: [],
      history63d: [],
      condition: null,
      limitations: ['Histórico insuficiente para formar datas válidas de amplitude.']
    };
  }

  const latest = dailySeries[dailySeries.length - 1];
  const history21d = dailySeries.slice(-21);
  const base21 = dailySeries.length >= 22
    ? dailySeries[dailySeries.length - 22]
    : history21d[0];

  const adLineDelta21d = latest.adLine - base21.adLine;
  const deltaAboveSma50_21dPp = (latest.aboveSma50Pct !== null && base21.aboveSma50Pct !== null)
    ? round1(latest.aboveSma50Pct - base21.aboveSma50Pct)
    : null;
  const deltaAboveSma200_21dPp = (latest.aboveSma200Pct !== null && base21.aboveSma200Pct !== null)
    ? round1(latest.aboveSma200Pct - base21.aboveSma200Pct)
    : null;

  const validHighLow21 = history21d.filter(d => d.netNewHighs52w !== null);
  const netHighLowSum21d = validHighLow21.length > 0
    ? validHighLow21.reduce((sum, d) => sum + d.netNewHighs52w, 0)
    : null;

  const adThreshold = Math.max(4, Math.round(latest.activeCount * 0.08));
  const adLineSlope21d = adLineDelta21d > adThreshold
    ? 'improving'
    : adLineDelta21d < -adThreshold
      ? 'deteriorating'
      : 'flat';

  const evolution21d = {
    windowSessions: history21d.length,
    fromDate: base21.date,
    toDate: latest.date,
    deltaAboveSma50Pp: deltaAboveSma50_21dPp,
    deltaAboveSma200Pp: deltaAboveSma200_21dPp,
    adLineDelta: adLineDelta21d,
    adLineSlope: adLineSlope21d,
    netHighLowSum: netHighLowSum21d,
    highLowSessionsCovered: validHighLow21.length
  };

  // Classificação multi-fator documentada (jamais um único percentual!)
  const condition = classifyBreadthCondition(latest, evolution21d);

  // Frescor e defasagem estritos no fuso America/New_York
  const asOfDate = latest.date;
  const lagDays = asOfDate >= expectedInfo.expectedDate
    ? 0
    : countBusinessDaysBetween(asOfDate, expectedInfo.expectedDate, 'US');
  const status = lagDays === 0 ? 'atualizado' : 'atrasado';

  const coveragePct = round1((cleanMap.size / expectedConstituents) * 100);
  const limitations = [];
  if (coveragePct < 95) {
    limitations.push(`Cobertura parcial: ${cleanMap.size}/${expectedConstituents} componentes (${coveragePct}%).`);
  }
  if (latest.eligible52w < latest.activeCount) {
    limitations.push(`Janela de 52 semanas disponível para ${latest.eligible52w}/${latest.activeCount} componentes (mínimo exigido: ${MIN_WINDOW_52W} pregões).`);
  }
  if (lagDays > 0) {
    limitations.push(`Série defasada em ${lagDays} pregões frente ao fechamento esperado de NY (${expectedInfo.expectedDate}).`);
  }

  return {
    universeId,
    universeName,
    available: true,
    status,
    source,
    asOfDate,
    expectedDate: expectedInfo.expectedDate,
    lagBusinessDays: lagDays,
    collectedAt,
    composition: {
      expectedConstituents,
      coveredConstituents: cleanMap.size,
      coveragePct,
      eligibleSma50: latest.eligibleSma50,
      eligibleSma200: latest.eligibleSma200,
      eligible52w: latest.eligible52w
    },
    latest,
    evolution21d,
    history21d,
    history63d: dailySeries,
    condition,
    limitations
  };
}

/**
 * Classificação ampla multi-fator (Forte / Neutra / Fraca) — nunca usa um único percentual.
 */
function classifyBreadthCondition(latest, evolution21d) {
  if (!latest) return null;

  const pillars = [];

  // Pilar 1: % > SMA(50)
  if (Number.isFinite(latest.aboveSma50Pct)) {
    const score = latest.aboveSma50Pct >= 60 ? 1 : latest.aboveSma50Pct <= 40 ? -1 : 0;
    pillars.push({
      id: 'sma50',
      label: '% > SMA(50)',
      valueDisplay: `${latest.aboveSma50Pct.toFixed(1).replace('.', ',')}%`,
      score,
      state: score > 0 ? 'Forte' : score < 0 ? 'Fraca' : 'Neutra'
    });
  }

  // Pilar 2: % > SMA(200)
  if (Number.isFinite(latest.aboveSma200Pct)) {
    const score = latest.aboveSma200Pct >= 60 ? 1 : latest.aboveSma200Pct <= 40 ? -1 : 0;
    pillars.push({
      id: 'sma200',
      label: '% > SMA(200)',
      valueDisplay: `${latest.aboveSma200Pct.toFixed(1).replace('.', ',')}%`,
      score,
      state: score > 0 ? 'Forte' : score < 0 ? 'Fraca' : 'Neutra'
    });
  }

  // Pilar 3: Tendência da A/D Line (21 pregões)
  if (evolution21d && Number.isFinite(evolution21d.adLineDelta)) {
    const score = evolution21d.adLineSlope === 'improving' ? 1 : evolution21d.adLineSlope === 'deteriorating' ? -1 : 0;
    const sign = evolution21d.adLineDelta > 0 ? '+' : '';
    pillars.push({
      id: 'adLine21d',
      label: 'A/D Line (21p)',
      valueDisplay: `${sign}${evolution21d.adLineDelta}`,
      score,
      state: score > 0 ? 'Forte' : score < 0 ? 'Fraca' : 'Neutra'
    });
  }

  // Pilar 4: Novas Máximas vs. Novas Mínimas (52 semanas)
  if (Number.isFinite(latest.netNewHighs52w)) {
    const refNet = (evolution21d && Number.isFinite(evolution21d.netHighLowSum))
      ? evolution21d.netHighLowSum
      : latest.netNewHighs52w;
    const score = refNet > 0 ? 1 : refNet < 0 ? -1 : 0;
    pillars.push({
      id: 'highLow52w',
      label: 'Máx vs. Mín (52s)',
      valueDisplay: `${latest.newHighs52w} / ${latest.newLows52w}`,
      score,
      state: score > 0 ? 'Forte' : score < 0 ? 'Fraca' : 'Neutra'
    });
  }

  // Regra estrita: exige pelo menos 2 pilares reais (nunca um único percentual)
  if (pillars.length < 2) {
    return {
      code: null,
      label: 'Indisponível',
      compositeScore: null,
      pillarsEvaluated: pillars.length,
      pillars,
      reason: 'INSUFFICIENT_MULTI_FACTOR_PILLARS'
    };
  }

  const avgScore = round2(pillars.reduce((acc, p) => acc + p.score, 0) / pillars.length);
  let code = 'neutral';
  let label = 'Neutra';
  if (avgScore >= 0.4) {
    code = 'strong';
    label = 'Forte';
  } else if (avgScore <= -0.4) {
    code = 'weak';
    label = 'Fraca';
  }

  return {
    code,
    label,
    compositeScore: avgScore,
    pillarsEvaluated: pillars.length,
    pillars,
    reason: null
  };
}

/**
 * Detecta divergências entre o índice americano (Ciclo EUA) e a participação interna (Breadth).
 */
function detectIndexVsBreadthDivergence(usCycleSphere, primaryBreadth) {
  if (!primaryBreadth?.available || !primaryBreadth?.condition?.code) {
    return {
      state: 'unavailable',
      severity: 'none',
      label: 'Comparação indisponível',
      explanation: 'Aguardando amplitude real para comparar contra o ciclo do índice americano.',
      dateMismatchWarning: null
    };
  }

  if (!usCycleSphere?.hasOfficialRegime) {
    return {
      state: 'unavailable',
      severity: 'none',
      label: 'Ciclo EUA indisponível',
      explanation: 'Amplitude calculada, porém sem regime oficial do índice EUA para verificar divergência.',
      dateMismatchWarning: null
    };
  }

  // Verifica se as datas de referência entre Ciclo EUA e Breadth diferem significativamente
  let dateMismatchWarning = null;
  if (usCycleSphere.asOfDate && primaryBreadth.asOfDate && usCycleSphere.asOfDate !== primaryBreadth.asOfDate) {
    const gap = Math.abs(
      countBusinessDaysBetween(
        primaryBreadth.asOfDate < usCycleSphere.asOfDate ? primaryBreadth.asOfDate : usCycleSphere.asOfDate,
        primaryBreadth.asOfDate < usCycleSphere.asOfDate ? usCycleSphere.asOfDate : primaryBreadth.asOfDate,
        'US'
      )
    );
    if (gap > 3) {
      dateMismatchWarning = `Atenção: Ciclo EUA (${usCycleSphere.asOfDate}) e Market Breadth (${primaryBreadth.asOfDate}) estão separados por ${gap} pregões. Atualize os componentes antes de concluir divergência atual.`;
    }
  }

  const idxDir = usCycleSphere.direction; // 'UP' | 'SIDEWAYS' | 'DOWN'
  const idxRet21 = usCycleSphere.supportingIndicators?.return21dPct;
  const cond = primaryBreadth.condition.code; // 'strong' | 'neutral' | 'weak'
  const delta50 = primaryBreadth.evolution21d?.deltaAboveSma50Pp;
  const adSlope = primaryBreadth.evolution21d?.adLineSlope;

  const indexPositive = idxDir === 'UP' || (Number.isFinite(idxRet21) && idxRet21 > 1.5);
  const indexWeak = idxDir === 'DOWN' || (Number.isFinite(idxRet21) && idxRet21 < -1.5);
  const breadthDeteriorating = cond === 'weak' || (Number.isFinite(delta50) && delta50 <= -8 && adSlope === 'deteriorating');
  const breadthImproving = cond === 'strong' || (Number.isFinite(delta50) && delta50 >= 8 && adSlope === 'improving');

  if (indexPositive && breadthDeteriorating) {
    return {
      state: 'bearish_divergence',
      severity: 'high',
      label: 'Divergência Baixista (Índice × Amplitude)',
      explanation: `O índice americano mantém força (${usCycleSphere.regimeLabel}), porém a participação interna em ${primaryBreadth.universeName} está enfraquecida (${primaryBreadth.condition.label}) — sinal clássico de mercado sustentado por poucos líderes.`,
      dateMismatchWarning
    };
  }

  if (indexWeak && breadthImproving) {
    return {
      state: 'bullish_divergence',
      severity: 'medium',
      label: 'Divergência Altista (Recuperação Interna)',
      explanation: `Apesar do índice ainda pressionado (${usCycleSphere.regimeLabel}), a amplitude interna em ${primaryBreadth.universeName} mostra melhora (${primaryBreadth.condition.label}), sugerindo base em formação.`,
      dateMismatchWarning
    };
  }

  if (indexPositive && cond === 'strong') {
    return {
      state: 'confirmed_strength',
      severity: 'none',
      label: 'Confirmação Altista Ampla',
      explanation: `Tanto o ciclo do índice (${usCycleSphere.regimeLabel}) quanto a amplitude interna (${primaryBreadth.condition.label}) confirmam participação saudável.`,
      dateMismatchWarning
    };
  }

  if (indexWeak && cond === 'weak') {
    return {
      state: 'confirmed_weakness',
      severity: 'high',
      label: 'Fraqueza Confirmada na Amplitude',
      explanation: `Queda/pressão no índice (${usCycleSphere.regimeLabel}) acompanhada por participação fraca dos componentes (${primaryBreadth.condition.label}).`,
      dateMismatchWarning
    };
  }

  return {
    state: 'aligned_neutral',
    severity: 'none',
    label: 'Sem Divergência Extrema',
    explanation: `Índice EUA (${usCycleSphere.regimeLabel}) e participação interna de ${primaryBreadth.universeName} (${primaryBreadth.condition.label}) sem divergência aguda na janela atual.`,
    dateMismatchWarning
  };
}

/**
 * Carrega séries locais armazenadas em disco (sem chamadas HTTP externas) e gera o pacote consolidado de Breadth EUA.
 */
function loadDiskPriceMap(filePath) {
  try {
    if (!fs.existsSync(filePath)) return { map: new Map(), mtimeIso: null };
    const stat = fs.statSync(filePath);
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const map = new Map();
    if (Array.isArray(raw)) {
      for (const item of raw) {
        const sym = String(item?.symbol || '').trim().toUpperCase();
        if (!sym) continue;
        if (!map.has(sym)) map.set(sym, []);
        map.get(sym).push(item);
      }
    } else if (raw && typeof raw === 'object') {
      for (const [sym, arr] of Object.entries(raw)) {
        if (Array.isArray(arr)) map.set(String(sym).toUpperCase(), arr);
      }
    }
    return { map, mtimeIso: stat.mtime.toISOString() };
  } catch (_) {
    return { map: new Map(), mtimeIso: null };
  }
}

function computeUsMarketBreadthFromDisk(options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const nasdaqPath = options.nasdaqPath || DEFAULT_NASDAQ_PRICES_PATH;
  const sp500Path = options.sp500Path || DEFAULT_SP500_PRICES_PATH;

  const sp500Disk = options.sp500CandlesBySymbol
    ? { map: options.sp500CandlesBySymbol, mtimeIso: now.toISOString() }
    : loadDiskPriceMap(sp500Path);

  const nasdaqDisk = options.nasdaqCandlesBySymbol
    ? { map: options.nasdaqCandlesBySymbol, mtimeIso: now.toISOString() }
    : loadDiskPriceMap(nasdaqPath);

  const sp500 = computeUniverseBreadth(sp500Disk.map, {
    universeId: 'SP500',
    universeName: 'S&P 500',
    expectedConstituents: 500,
    source: sp500Disk.map.size ? 'sp500_daily_prices_store' : 'pending_sp500_bulk_feed',
    collectedAt: sp500Disk.mtimeIso,
    now
  });

  const nasdaq100 = computeUniverseBreadth(nasdaqDisk.map, {
    universeId: 'NASDAQ_100',
    universeName: 'Nasdaq-100',
    expectedConstituents: 100,
    source: nasdaqDisk.map.size ? 'twelve_data_nasdaq_store' : 'unconfigured',
    collectedAt: nasdaqDisk.mtimeIso,
    now
  });

  return {
    sp500,
    nasdaq100,
    methodology: BREADTH_METHODOLOGY
  };
}

module.exports = {
  BREADTH_METHODOLOGY,
  MIN_WINDOW_52W,
  MAX_WINDOW_52W,
  normalizeConstituentMap,
  computeUniverseBreadth,
  classifyBreadthCondition,
  detectIndexVsBreadthDivergence,
  computeUsMarketBreadthFromDisk
};
