'use strict';

/**
 * HEALTHY TREND TRADER — US SECTOR ROTATION & RELATIVE STRENGTH ENGINE
 * Dimensão: Rotação Setorial e Força Relativa — Estados Unidos (07)
 *
 * Princípios invioláveis:
 * 1. Foco estrito em rotação de força relativa em janelas históricas (21 pregões primária + 63 pregões de contexto),
 *    NUNCA em ranking de variação de um único pregão.
 * 2. Benchmark explícito e rastreável: S&P 500 via ETF SPY (alinhamento exato por data de pregão fechado).
 * 3. Rejeita candles futuros ou incompletos antes de qualquer cálculo.
 * 4. Separação epistemológica estrita: mede DESEMPENHO RELATIVO DE PREÇO (price_performance) de ETFs setoriais.
 *    NÃO representa nem comprova fluxo financeiro líquido (entrada/saída efetiva de recursos em fundos).
 * 5. Nunca inventa ou estima dados para setores indisponíveis; expõe cobertura real (X/12), frescor e defasagem.
 */

const {
  INSTRUMENT_CATALOG,
  US_SECTOR_IDS,
  getExpectedReferenceDate,
  countBusinessDaysBetween
} = require('./capital-intelligence-ingestion');

const BENCHMARK_ID = 'cycle_us_sp500';
const BENCHMARK_SYMBOL = 'SPY';
const BENCHMARK_NAME = 'S&P 500 (Proxy SPY)';

const ROTATION_STATES = {
  STRENGTHENING: {
    code: 'strengthening',
    label: 'Fortalecendo',
    shortLabel: 'Ganhando Força',
    color: '#10b981'
  },
  NEUTRAL: {
    code: 'neutral',
    label: 'Neutro',
    shortLabel: 'Neutro',
    color: '#94a3b8'
  },
  WEAKENING: {
    code: 'weakening',
    label: 'Enfraquecendo',
    shortLabel: 'Perdendo Força',
    color: '#ef4444'
  },
  INSUFFICIENT_HISTORY: {
    code: 'insufficient_history',
    label: 'Histórico curto',
    shortLabel: 'Sem janela 21p',
    color: '#64748b'
  }
};

const SECTOR_METADATA = {
  sec_us_xlk: { sector: 'Tecnologia / IA', shortSector: 'Tech / IA', style: 'growth_tech', cluster: 'Tecnologia / IA & Semis', priorityCompare: true },
  sec_us_smh: { sector: 'Semicondutores', shortSector: 'Semis', style: 'growth_tech', cluster: 'Tecnologia / IA & Semis', priorityCompare: true },
  sec_us_xlc: { sector: 'Comunicação', shortSector: 'Comunic.', style: 'growth_tech', cluster: 'Tecnologia / IA & Semis', priorityCompare: false },
  sec_us_xle: { sector: 'Energia', shortSector: 'Energia', style: 'real_assets', cluster: 'Energia & Materiais', priorityCompare: true },
  sec_us_xlb: { sector: 'Materiais', shortSector: 'Materiais', style: 'real_assets', cluster: 'Energia & Materiais', priorityCompare: false },
  sec_us_xlf: { sector: 'Financeiro', shortSector: 'Financeiro', style: 'cyclical', cluster: 'Financeiro & Industriais', priorityCompare: true },
  sec_us_xli: { sector: 'Industriais', shortSector: 'Industriais', style: 'cyclical', cluster: 'Financeiro & Industriais', priorityCompare: false },
  sec_us_xly: { sector: 'Consumo Discricionário', shortSector: 'Cons. Discr.', style: 'cyclical', cluster: 'Consumo (Discric. vs. Básico)', priorityCompare: true },
  sec_us_xlp: { sector: 'Consumo Básico', shortSector: 'Cons. Básico', style: 'defensive', cluster: 'Consumo (Discric. vs. Básico)', priorityCompare: true },
  sec_us_xlv: { sector: 'Saúde', shortSector: 'Saúde', style: 'defensive', cluster: 'Defensivos (Saúde, Utilities & REITs)', priorityCompare: true },
  sec_us_xlu: { sector: 'Utilities', shortSector: 'Utilities', style: 'defensive', cluster: 'Defensivos (Saúde, Utilities & REITs)', priorityCompare: false },
  sec_us_xlre: { sector: 'Imobiliário', shortSector: 'Imobiliário', style: 'defensive', cluster: 'Defensivos (Saúde, Utilities & REITs)', priorityCompare: false }
};

const COLOR_LEGEND = [
  { code: 'strengthening', label: 'Fortalecendo (ganhando força relativa vs. SPY)', color: '#10b981' },
  { code: 'neutral', label: 'Neutro (desempenho em linha com o SPY)', color: '#94a3b8' },
  { code: 'weakening', label: 'Enfraquecendo (perdendo força relativa vs. SPY)', color: '#ef4444' }
];

const EPISTEMOLOGICAL_DISCLAIMER =
  'Esta leitura mede exclusivamente rotação de desempenho relativo de preço de ETFs setoriais americanos contra o S&P 500 (SPY). ' +
  'Desempenho relativo superior NÃO comprova entrada líquida de capital em fundos, nem desempenho inferior comprova resgate efetivo; ' +
  'afirmações sobre fluxo financeiro líquido só são válidas com dados dedicados de fund flows.';

const SECTOR_ROTATION_METHODOLOGY = {
  name: 'US Sector Relative Strength & Rotation Engine v1',
  benchmark: `${BENCHMARK_SYMBOL} — ${BENCHMARK_NAME}`,
  primaryWindowSessions: 21,
  contextWindowSessions: 63,
  relativeStrengthFormula: 'RS(t) = (Fechamento_Setor(t) / Fechamento_SPY(t)), normalizado em base 100 no início da janela de 21 pregões; Retorno Relativo (Δ vs SPY) = Retorno_Setor(21p) − Retorno_SPY(21p) em pontos percentuais sobre as mesmas datas de fechamento.',
  classificationRule:
    'Fortalecendo: Δ vs SPY (21p) >= +1,50 p.p. sem deterioração abrupta na 2ª metade (inclinação RS >= -0,35%), ou >= +0,75 p.p. com aceleração RS >= +0,50%. ' +
    'Enfraquecendo: Δ vs SPY (21p) <= -1,50 p.p. sem reversão abrupta (inclinação RS <= +0,35%), ou <= -0,75 p.p. com desaceleração RS <= -0,50%. ' +
    'Neutro: faixa intermediária sem vantagem relativa consolidada. Variação de 1 único pregão é excluída da classificação e do ranking.',
  epistemologicalRule: EPISTEMOLOGICAL_DISCLAIMER,
  coverageUniverse: '12 ETFs setoriais líquidos nos EUA (11 SPDR S&P Select Sectors: XLK, XLF, XLV, XLE, XLI, XLY, XLP, XLU, XLB, XLRE, XLC + VanEck Semicondutores SMH).'
};

function round2(n) {
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}

function pctChange(latest, base) {
  if (!Number.isFinite(latest) || !Number.isFinite(base) || base === 0) return null;
  return round2(((latest - base) / base) * 100);
}

/**
 * Filtra observações válidas, fechadas e não-futuras, deduplicando por data (ASC).
 */
function sanitizeClosedSeries(series = [], maxAllowedDate = null) {
  if (!Array.isArray(series) || series.length === 0) {
    return { rows: [], filteredCount: 0 };
  }

  const byDate = new Map();
  let filteredCount = 0;

  for (const row of series) {
    const refDate = String(row?.referenceDate || row?.date || '').trim().slice(0, 10);
    const close = Number(row?.closeValue ?? row?.close);
    const isIncomplete = row?.qualityStatus === 'incomplete' || row?.qualityStatus === 'intraday' || row?.metadata?.isIncomplete === true;
    const isFuture = Boolean(maxAllowedDate && refDate > maxAllowedDate);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(refDate) || !Number.isFinite(close) || close <= 0 || isIncomplete || isFuture) {
      filteredCount += 1;
      continue;
    }

    byDate.set(refDate, {
      referenceDate: refDate,
      closeValue: close,
      collectedAt: row.collectedAt || null,
      sourceProvider: row.sourceProvider || null
    });
  }

  const rows = Array.from(byDate.values()).sort((a, b) => a.referenceDate.localeCompare(b.referenceDate));
  return { rows, filteredCount };
}

/**
 * Classifica o estado de rotação de um setor usando apenas janelas históricas (21p + inclinação RS),
 * nunca a variação isolada de 1 pregão.
 */
function classifySectorRotationState({ excessReturn21dPct, rsHalfSlopePct, hasFull21dWindow }) {
  if (!hasFull21dWindow || !Number.isFinite(excessReturn21dPct)) {
    return ROTATION_STATES.INSUFFICIENT_HISTORY;
  }

  const slope = Number.isFinite(rsHalfSlopePct) ? rsHalfSlopePct : 0;

  if ((excessReturn21dPct >= 1.5 && slope >= -0.35) || (excessReturn21dPct >= 0.75 && slope >= 0.5)) {
    return ROTATION_STATES.STRENGTHENING;
  }

  if ((excessReturn21dPct <= -1.5 && slope <= 0.35) || (excessReturn21dPct <= -0.75 && slope <= -0.5)) {
    return ROTATION_STATES.WEAKENING;
  }

  return ROTATION_STATES.NEUTRAL;
}

/**
 * Classifica a aceleração de força relativa (comparando 21p vs ritmo de 63p e inclinação interna da curva RS).
 */
function resolveMomentumNote(rsChange21dPct, rsChange63dPct, rsHalfSlopePct) {
  if (!Number.isFinite(rsChange21dPct)) return 'Janela insuficiente';
  const expectedPaceFrom63d = Number.isFinite(rsChange63dPct) ? rsChange63dPct / 3 : null;
  const accel = expectedPaceFrom63d !== null ? round2(rsChange21dPct - expectedPaceFrom63d) : null;

  if ((accel !== null && accel >= 1.2) || (Number.isFinite(rsHalfSlopePct) && rsHalfSlopePct >= 0.8)) {
    return 'Acelerando força relativa';
  }
  if ((accel !== null && accel <= -1.2) || (Number.isFinite(rsHalfSlopePct) && rsHalfSlopePct <= -0.8)) {
    return 'Perdendo tração relativa';
  }
  return 'Trajetória relativa estável';
}

/**
 * Calcula um perfil resumido do viés setorial (estritamente em termos de desempenho relativo).
 */
function deriveRotationStyleProfile(rankedSectors = []) {
  const valid = rankedSectors.filter(s => s.hasFull21dWindow && Number.isFinite(s.excessReturn21dPct));
  if (valid.length === 0) {
    return {
      code: 'unavailable',
      label: 'Aguardando série histórica (21p)',
      summary: 'Necessário histórico fechado de 21 pregões dos ETFs setoriais e do SPY para diagnosticar rotação.'
    };
  }

  const avgByStyle = (style) => {
    const items = valid.filter(s => s.style === style);
    if (!items.length) return null;
    const sum = items.reduce((acc, s) => acc + s.excessReturn21dPct, 0);
    return round2(sum / items.length);
  };

  const growthAvg = avgByStyle('growth_tech');
  const defensiveAvg = avgByStyle('defensive');
  const realAssetsAvg = avgByStyle('real_assets');
  const cyclicalAvg = avgByStyle('cyclical');

  const buckets = [
    { key: 'defensive', avg: defensiveAvg, label: 'Viés Defensivo (Desempenho Relativo)', desc: 'Setores defensivos (Saúde, Consumo Básico, Utilities) superam o SPY em 21 pregões.' },
    { key: 'growth_tech', avg: growthAvg, label: 'Liderança em Tecnologia / IA', desc: 'Tecnologia/IA e Semicondutores lideram o desempenho relativo contra o SPY em 21 pregões.' },
    { key: 'real_assets', avg: realAssetsAvg, label: 'Força em Energia & Materiais', desc: 'Ativos reais e commodities (Energia/Materiais) exibem maior força relativa contra o SPY em 21 pregões.' },
    { key: 'cyclical', avg: cyclicalAvg, label: 'Liderança Cíclica (Financeiro / Industriais)', desc: 'Setores cíclicos lideram o desempenho relativo contra o SPY em 21 pregões.' }
  ].filter(b => Number.isFinite(b.avg));

  buckets.sort((a, b) => b.avg - a.avg);
  const top = buckets[0];
  const second = buckets[1];

  if (!top || top.avg < 0.75 || (second && (top.avg - second.avg) < 0.5)) {
    return {
      code: 'mixed',
      label: 'Rotação Mista / Seletiva',
      summary: 'Nenhum bloco macro domina de forma isolada; a dispersão de desempenho relativo ocorre de maneira seletiva entre setores.',
      styleAverages21dPp: { growth_tech: growthAvg, defensive: defensiveAvg, real_assets: realAssetsAvg, cyclical: cyclicalAvg }
    };
  }

  return {
    code: top.key,
    label: top.label,
    summary: top.desc,
    styleAverages21dPp: { growth_tech: growthAvg, defensive: defensiveAvg, real_assets: realAssetsAvg, cyclical: cyclicalAvg }
  };
}

/**
 * Motor principal de Rotação Setorial e Força Relativa dos EUA (07).
 * Puro, determinístico e rastreável — zero I/O externo.
 */
function buildUsSectorRotationDimension(seriesById = {}, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const expectedInfo = getExpectedReferenceDate({ market: 'US', scheduleKey: 'US', publishLagDays: 0 }, now);
  const maxAllowedDate = expectedInfo.expectedDate;

  const { rows: spyRows, filteredCount: spyFiltered } = sanitizeClosedSeries(seriesById[BENCHMARK_ID] || [], maxAllowedDate);
  const spyByDate = new Map(spyRows.map(r => [r.referenceDate, r.closeValue]));

  const spyLatest = spyRows.length ? spyRows[spyRows.length - 1] : null;
  const spyRet21d = spyRows.length >= 22 ? pctChange(spyRows[spyRows.length - 1].closeValue, spyRows[spyRows.length - 22].closeValue) : null;
  const spyRet63d = spyRows.length >= 64 ? pctChange(spyRows[spyRows.length - 1].closeValue, spyRows[spyRows.length - 64].closeValue) : null;
  const spyLag = spyLatest
    ? (spyLatest.referenceDate >= maxAllowedDate ? 0 : countBusinessDaysBetween(spyLatest.referenceDate, maxAllowedDate, 'US'))
    : null;

  const benchmark = {
    indicatorId: BENCHMARK_ID,
    symbol: BENCHMARK_SYMBOL,
    name: BENCHMARK_NAME,
    status: !spyLatest ? 'indisponivel' : spyLag === 0 ? 'atualizado' : 'atrasado',
    asOfDate: spyLatest?.referenceDate || null,
    expectedDate: maxAllowedDate,
    lagBusinessDays: spyLag,
    latestClose: spyLatest?.closeValue ?? null,
    return21dPct: spyRet21d,
    return63dPct: spyRet63d,
    observationsCount: spyRows.length
  };

  const sectors = [];
  const missingSectors = [];
  let totalFiltered = spyFiltered;
  let latestCollectedAt = spyLatest?.collectedAt || null;

  for (const id of US_SECTOR_IDS) {
    const spec = INSTRUMENT_CATALOG[id];
    const meta = SECTOR_METADATA[id] || {
      sector: spec?.sectorLabel || spec?.name || id,
      shortSector: spec?.symbol || id,
      style: 'other',
      cluster: 'Outros Setores',
      priorityCompare: false
    };

    const { rows: secRows, filteredCount } = sanitizeClosedSeries(seriesById[id] || [], maxAllowedDate);
    totalFiltered += filteredCount;

    if (!secRows.length) {
      missingSectors.push({
        indicatorId: id,
        symbol: spec?.symbol || id,
        sector: meta.sector,
        reason: 'NO_OBSERVATIONS_STORED'
      });
      continue;
    }

    const latestSec = secRows[secRows.length - 1];
    if (latestSec.collectedAt && (!latestCollectedAt || latestSec.collectedAt > latestCollectedAt)) {
      latestCollectedAt = latestSec.collectedAt;
    }

    const secLag = latestSec.referenceDate >= maxAllowedDate
      ? 0
      : countBusinessDaysBetween(latestSec.referenceDate, maxAllowedDate, 'US');
    const secFreshStatus = secLag === 0 ? 'atualizado' : 'atrasado';

    // Alinha estritamente pelas mesmas datas fechadas com SPY
    const aligned = [];
    for (const r of secRows) {
      const spyClose = spyByDate.get(r.referenceDate);
      if (Number.isFinite(spyClose) && spyClose > 0) {
        aligned.push({
          date: r.referenceDate,
          sectorClose: r.closeValue,
          spyClose,
          ratio: r.closeValue / spyClose
        });
      }
    }

    const nSec = secRows.length;
    const return1dPct = nSec >= 2 ? pctChange(secRows[nSec - 1].closeValue, secRows[nSec - 2].closeValue) : null;
    const return5dPct = nSec >= 6 ? pctChange(secRows[nSec - 1].closeValue, secRows[nSec - 6].closeValue) : null;
    const return21dPct = nSec >= 22 ? pctChange(secRows[nSec - 1].closeValue, secRows[nSec - 22].closeValue) : null;
    const return63dPct = nSec >= 64 ? pctChange(secRows[nSec - 1].closeValue, secRows[nSec - 64].closeValue) : null;

    const m = aligned.length;
    const hasFull21dWindow = m >= 22;
    const hasFull63dWindow = m >= 64;

    let excessReturn21dPct = null;
    let rsChange21dPct = null;
    let excessReturn63dPct = null;
    let rsChange63dPct = null;
    let rsChange5dPct = null;
    let rsHalfSlopePct = null;
    let rsSeries21d = [];

    if (m >= 6) {
      rsChange5dPct = pctChange(aligned[m - 1].ratio, aligned[m - 6].ratio);
    }

    if (hasFull21dWindow) {
      const latestPair = aligned[m - 1];
      const base21Pair = aligned[m - 22];
      const secAligned21 = pctChange(latestPair.sectorClose, base21Pair.sectorClose);
      const spyAligned21 = pctChange(latestPair.spyClose, base21Pair.spyClose);
      excessReturn21dPct = (secAligned21 !== null && spyAligned21 !== null)
        ? round2(secAligned21 - spyAligned21)
        : null;
      rsChange21dPct = pctChange(latestPair.ratio, base21Pair.ratio);

      // Série normalizada de 21 pregões (base 100 no 1º ponto da janela)
      const windowSlice = aligned.slice(-21);
      const baseRatio = windowSlice[0].ratio;
      rsSeries21d = windowSlice.map(p => ({
        date: p.date,
        rsIndex: round2((p.ratio / baseRatio) * 100),
        sectorClose: round2(p.sectorClose),
        spyClose: round2(p.spyClose)
      }));

      // Inclinação interna da curva RS (2ª metade vs 1ª metade da janela de 21p)
      const mid = Math.floor(rsSeries21d.length / 2);
      const firstHalf = rsSeries21d.slice(0, mid);
      const secondHalf = rsSeries21d.slice(mid);
      const avg1 = firstHalf.reduce((acc, p) => acc + p.rsIndex, 0) / firstHalf.length;
      const avg2 = secondHalf.reduce((acc, p) => acc + p.rsIndex, 0) / secondHalf.length;
      rsHalfSlopePct = pctChange(avg2, avg1);
    }

    if (hasFull63dWindow) {
      const latestPair = aligned[m - 1];
      const base63Pair = aligned[m - 64];
      const secAligned63 = pctChange(latestPair.sectorClose, base63Pair.sectorClose);
      const spyAligned63 = pctChange(latestPair.spyClose, base63Pair.spyClose);
      excessReturn63dPct = (secAligned63 !== null && spyAligned63 !== null)
        ? round2(secAligned63 - spyAligned63)
        : null;
      rsChange63dPct = pctChange(latestPair.ratio, base63Pair.ratio);
    }

    const stateInfo = classifySectorRotationState({
      excessReturn21dPct,
      rsHalfSlopePct,
      hasFull21dWindow
    });

    sectors.push({
      indicatorId: id,
      symbol: spec?.symbol || id,
      name: spec?.name || meta.sector,
      sector: meta.sector,
      shortSector: meta.shortSector,
      style: meta.style,
      cluster: meta.cluster,
      priorityCompare: Boolean(meta.priorityCompare),
      metricNature: 'price_performance',
      isCapitalFlowData: false,
      status: secFreshStatus,
      asOfDate: latestSec.referenceDate,
      lagBusinessDays: secLag,
      latestClose: round2(latestSec.closeValue),
      // Retornos absolutos (21p primário + 63p contexto; 1p estritamente informativo/excluído do ranking)
      return21dPct,
      return63dPct,
      return5dPct,
      return1dPctSecondary: return1dPct,
      // Força Relativa contra SPY
      excessReturnVsSpy21dPct: excessReturn21dPct,
      excessReturnVsSpy63dPct: excessReturn63dPct,
      rsChange21dPct,
      rsChange63dPct,
      rsChange5dPct,
      rsHalfSlopePct,
      rsMomentumNote: resolveMomentumNote(rsChange21dPct, rsChange63dPct, rsHalfSlopePct),
      rsSeries21d,
      // Classificação documentada de rotação
      rotationState: stateInfo.code,
      rotationLabel: stateInfo.label,
      rotationShortLabel: stateInfo.shortLabel,
      rotationColor: stateInfo.color,
      hasFull21dWindow,
      hasFull63dWindow,
      alignedSessionsCount: m
    });
  }

  // Ordena estritamente por Força Relativa 21p vs SPY (decrescente) — NUNCA por variação de 1 pregão!
  sectors.sort((a, b) => {
    const aKey = Number.isFinite(a.excessReturnVsSpy21dPct) ? a.excessReturnVsSpy21dPct : (Number.isFinite(a.return21dPct) ? a.return21dPct - 1000 : -9999);
    const bKey = Number.isFinite(b.excessReturnVsSpy21dPct) ? b.excessReturnVsSpy21dPct : (Number.isFinite(b.return21dPct) ? b.return21dPct - 1000 : -9999);
    if (bKey !== aKey) return bKey - aKey;
    return a.symbol.localeCompare(b.symbol);
  });

  const strengthening = sectors.filter(s => s.rotationState === 'strengthening');
  const neutral = sectors.filter(s => s.rotationState === 'neutral');
  const weakening = sectors.filter(s => s.rotationState === 'weakening');

  // Agrupamento comparativo por clusters temáticos (Tech/IA & Semis, Energia, Saúde, Financeiro, Consumo, etc.)
  const clusterOrder = [
    'Tecnologia / IA & Semis',
    'Energia & Materiais',
    'Financeiro & Industriais',
    'Consumo (Discric. vs. Básico)',
    'Defensivos (Saúde, Utilities & REITs)'
  ];
  const clusterComparison = clusterOrder.map(clusterName => {
    const members = sectors.filter(s => s.cluster === clusterName);
    const withRs = members.filter(s => Number.isFinite(s.excessReturnVsSpy21dPct));
    const avgExcess21d = withRs.length
      ? round2(withRs.reduce((acc, s) => acc + s.excessReturnVsSpy21dPct, 0) / withRs.length)
      : null;
    const avgReturn21d = withRs.length
      ? round2(withRs.reduce((acc, s) => acc + (s.return21dPct ?? 0), 0) / withRs.length)
      : null;

    let state = ROTATION_STATES.NEUTRAL;
    if (avgExcess21d === null) state = ROTATION_STATES.INSUFFICIENT_HISTORY;
    else if (avgExcess21d >= 1.25) state = ROTATION_STATES.STRENGTHENING;
    else if (avgExcess21d <= -1.25) state = ROTATION_STATES.WEAKENING;

    return {
      cluster: clusterName,
      sectorsCount: members.length,
      symbols: members.map(m => m.symbol),
      avgReturn21dPct: avgReturn21d,
      avgExcessVsSpy21dPct: avgExcess21d,
      stateCode: state.code,
      stateLabel: state.label,
      color: state.color
    };
  });

  const rotationProfile = deriveRotationStyleProfile(sectors);

  // Determina frescor consolidado rigoroso
  const totalExpected = US_SECTOR_IDS.length;
  const coveredCount = sectors.length;
  const classifiedCount = sectors.filter(s => s.hasFull21dWindow).length;
  const asOfDates = sectors.map(s => s.asOfDate).filter(Boolean).sort();
  const latestAsOfDate = asOfDates.length ? asOfDates[asOfDates.length - 1] : null;
  const maxLag = sectors.reduce((mx, s) => (Number.isFinite(s.lagBusinessDays) ? Math.max(mx, s.lagBusinessDays) : mx), 0);

  let status = 'indisponivel';
  if (coveredCount === 0 || !spyLatest) {
    status = 'indisponivel';
  } else if (coveredCount < totalExpected || classifiedCount < coveredCount) {
    status = maxLag > 0 || (spyLag ?? 0) > 0 ? 'atrasado' : 'parcial';
  } else if (maxLag > 0 || (spyLag ?? 0) > 0) {
    status = 'atrasado';
  } else {
    status = 'atualizado';
  }

  const limitations = [];
  if (!spyLatest) {
    limitations.push('Benchmark de comparação S&P 500 (SPY) indisponível — necessário para calcular força relativa.');
  }
  if (missingSectors.length > 0) {
    limitations.push(`${missingSectors.length} de ${totalExpected} ETFs setoriais sem série armazenada (${missingSectors.map(m => m.symbol).join(', ')}). Nenhum setor ausente é estimado.`);
  }
  const shortHistory = sectors.filter(s => !s.hasFull21dWindow);
  if (shortHistory.length > 0) {
    limitations.push(`${shortHistory.length} setor(es) ainda com menos de 22 pregões fechados alinhados com SPY (${shortHistory.map(s => s.symbol).join(', ')}).`);
  }
  limitations.push('Os dados refletem exclusivamente preços fechados de ETFs setoriais (desempenho relativo), sem dados de fluxo financeiro líquido de fundos.');

  const leader = sectors.find(s => s.hasFull21dWindow) || sectors[0] || null;
  const laggard = [...sectors].reverse().find(s => s.hasFull21dWindow) || (sectors.length > 1 ? sectors[sectors.length - 1] : null);

  return {
    id: 'sector_rotation_us',
    metricNature: 'price_performance',
    isCapitalFlowData: false,
    disclaimerNote: EPISTEMOLOGICAL_DISCLAIMER,
    status,
    asOfDate: latestAsOfDate,
    expectedDate: maxAllowedDate,
    lagBusinessDays: latestAsOfDate ? maxLag : null,
    collectedAt: latestCollectedAt,
    source: coveredCount > 0 ? 'twelve_data' : 'unconfigured',
    benchmark,
    rotationProfile,
    summaryCounts: {
      totalCataloged: totalExpected,
      covered: coveredCount,
      classified21d: classifiedCount,
      strengthening: strengthening.length,
      neutral: neutral.length,
      weakening: weakening.length
    },
    leader: leader
      ? {
          symbol: leader.symbol,
          sector: leader.sector,
          return21dPct: leader.return21dPct,
          excessReturnVsSpy21dPct: leader.excessReturnVsSpy21dPct,
          rotationState: leader.rotationState,
          rotationLabel: leader.rotationLabel
        }
      : null,
    laggard: laggard
      ? {
          symbol: laggard.symbol,
          sector: laggard.sector,
          return21dPct: laggard.return21dPct,
          excessReturnVsSpy21dPct: laggard.excessReturnVsSpy21dPct,
          rotationState: laggard.rotationState,
          rotationLabel: laggard.rotationLabel
        }
      : null,
    groups: {
      strengthening,
      neutral,
      weakening
    },
    clusterComparison,
    sectors,
    missingSectors,
    colorLegend: COLOR_LEGEND,
    methodology: SECTOR_ROTATION_METHODOLOGY,
    limitations,
    provenance: {
      engine: 'backend/src/us-sector-rotation.js',
      provider: coveredCount > 0 ? 'twelve_data' : 'unconfigured',
      benchmark: `${BENCHMARK_SYMBOL} (${benchmark.asOfDate || 'indisponível'})`,
      coverageLabel: `${coveredCount}/${totalExpected} ETFs setoriais EUA`,
      asOfDate: latestAsOfDate,
      expectedDate: maxAllowedDate,
      lagBusinessDays: latestAsOfDate ? maxLag : null,
      collectedAt: latestCollectedAt,
      status,
      filteredFutureOrIncompleteCount: totalFiltered
    }
  };
}

module.exports = {
  BENCHMARK_ID,
  BENCHMARK_SYMBOL,
  BENCHMARK_NAME,
  ROTATION_STATES,
  SECTOR_METADATA,
  COLOR_LEGEND,
  EPISTEMOLOGICAL_DISCLAIMER,
  SECTOR_ROTATION_METHODOLOGY,
  sanitizeClosedSeries,
  classifySectorRotationState,
  buildUsSectorRotationDimension
};
