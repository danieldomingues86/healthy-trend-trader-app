'use strict';

/**
 * HEALTHY TREND TRADER — MACRO TRENDS ENGINE (08)
 * Tendências Macro Históricas: Dólar/BRL, Curva DI, US Treasury 10Y, VIX e Contexto Selic
 *
 * Princípios invioláveis:
 * 1. Foco em tendências históricas de 21 pregões (com contexto de 63 pregões) — NUNCA classificar
 *    o cenário apenas pela variação diária de 1 único pregão.
 * 2. Unidades estritamente corretas e isoladas:
 *    - Dólar/BRL: nível em R$/US$, tendência em % (e Δ em R$)
 *    - Curva DI Futuro (BR) e US Treasury 10Y: nível em % a.a., tendência em p.p. e pontos-base (bps)
 *    - Selic Meta (Política Monetária): nível em % a.a., variação em p.p. e bps — NUNCA confundida com Curva DI negociada
 *    - VIX: nível em pontos (pts), tendência em pontos (pts) e %, mais regime de nível documentado
 * 3. Nunca comparar unidades distintas no mesmo eixo sem normalização explícita.
 * 4. Explicações estritamente observacionais — sem atribuir causalidade automaticamente.
 * 5. Transparência absoluta de fonte, período, timestamp, defasagem e dados atrasados/indisponíveis.
 */

const {
  INSTRUMENT_CATALOG,
  getExpectedReferenceDate,
  countBusinessDaysBetween
} = require('./capital-intelligence-ingestion');

const TREND_DIRECTIONS = {
  RISING: { code: 'rising', label: 'Tendência de Alta (21p)', shortLabel: 'Alta 21p', color: '#f59e0b' },
  FALLING: { code: 'falling', label: 'Tendência de Queda (21p)', shortLabel: 'Queda 21p', color: '#10b981' },
  SIDEWAYS: { code: 'sideways', label: 'Lateral / Estável (21p)', shortLabel: 'Lateral 21p', color: '#94a3b8' },
  INSUFFICIENT: { code: 'insufficient_history', label: 'Histórico curto (< 22p)', shortLabel: 'Sem janela 21p', color: '#64748b' },
  UNAVAILABLE: { code: 'unavailable', label: 'Indisponível', shortLabel: 'Indisponível', color: '#64748b' }
};

const VIX_LEVEL_REGIMES = [
  { code: 'low', maxExclusive: 15, label: 'Baixa / Calma (< 15 pts)', shortLabel: 'Calma', color: '#10b981' },
  { code: 'moderate', maxExclusive: 20, label: 'Moderada (15–20 pts)', shortLabel: 'Moderada', color: '#38bdf8' },
  { code: 'elevated', maxExclusive: 30, label: 'Elevada / Atenção (20–30 pts)', shortLabel: 'Elevada', color: '#f59e0b' },
  { code: 'stress', maxExclusive: Infinity, label: 'Estresse / Alta Volatilidade (≥ 30 pts)', shortLabel: 'Estresse', color: '#ef4444' }
];

const INDICATOR_CONFIGS = {
  fx_usd_brl: {
    satelliteId: 'trend_dolar',
    indicatorId: 'fx_usd_brl',
    title: 'Dólar (USD/BRL)',
    shortTitle: 'Dólar/BRL',
    category: 'fx',
    instrumentRole: 'spot_reference_fx',
    sourceLabel: 'BCB SGS (Série 1 — PTAX Venda)',
    unitSpec: {
      unitFamily: 'currency_brl_usd',
      levelUnit: 'R$/US$',
      primaryDeltaUnit: '%',
      secondaryDeltaUnit: 'R$'
    },
    thresholds21d: {
      metric: 'pct',
      strongThreshold: 1.25,
      moderateThreshold: 0.60,
      slopeConfirm: 0.40,
      slopeAbort: -0.30
    }
  },
  rate_di_curve: {
    satelliteId: 'trend_di',
    indicatorId: 'rate_di_curve',
    title: 'Curva DI Futuro (BR)',
    shortTitle: 'Curva DI',
    category: 'rates_br_future',
    instrumentRole: 'market_traded_future_curve',
    distinctFromMonetaryPolicy: true,
    sourceLabel: 'Curva DI Futuro (B3 / ANBIMA ETTJ)',
    unitSpec: {
      unitFamily: 'interest_rate_pct_aa',
      levelUnit: '% a.a.',
      primaryDeltaUnit: 'bps',
      secondaryDeltaUnit: 'p.p.'
    },
    thresholds21d: {
      metric: 'bps',
      strongThreshold: 20,
      moderateThreshold: 10,
      slopeConfirm: 0.25,
      slopeAbort: -0.25
    }
  },
  rate_us10y: {
    satelliteId: 'trend_us10y',
    indicatorId: 'rate_us10y',
    title: 'US Treasury 10Y',
    shortTitle: 'Treasury 10Y',
    category: 'rates_us',
    instrumentRole: 'sovereign_benchmark_yield',
    sourceLabel: 'FRED (DGS10 — US Treasury 10Y Yield)',
    unitSpec: {
      unitFamily: 'interest_rate_pct_aa',
      levelUnit: '% a.a.',
      primaryDeltaUnit: 'bps',
      secondaryDeltaUnit: 'p.p.'
    },
    thresholds21d: {
      metric: 'bps',
      strongThreshold: 15,
      moderateThreshold: 8,
      slopeConfirm: 0.25,
      slopeAbort: -0.25
    }
  },
  vol_vix: {
    satelliteId: 'trend_vix',
    indicatorId: 'vol_vix',
    title: 'CBOE VIX (Volatilidade)',
    shortTitle: 'VIX',
    category: 'volatility_us',
    instrumentRole: 'implied_volatility_index',
    sourceLabel: 'CBOE Daily History CSV (fallback FRED VIXCLS)',
    unitSpec: {
      unitFamily: 'volatility_index_pts',
      levelUnit: 'pontos',
      primaryDeltaUnit: 'pts',
      secondaryDeltaUnit: '%'
    },
    thresholds21d: {
      metric: 'pts',
      strongThreshold: 2.0,
      moderateThreshold: 1.0,
      slopeConfirm: 3.0,
      slopeAbort: -3.0
    }
  },
  rate_selic_meta: {
    satelliteId: null,
    indicatorId: 'rate_selic_meta',
    title: 'Taxa Selic Meta (COPOM)',
    shortTitle: 'Selic Meta',
    category: 'monetary_policy_br',
    instrumentRole: 'monetary_policy_rate',
    distinctFromFutureCurve: true,
    sourceLabel: 'BCB SGS (Série 432 — Meta Selic COPOM)',
    unitSpec: {
      unitFamily: 'interest_rate_pct_aa',
      levelUnit: '% a.a.',
      primaryDeltaUnit: 'bps',
      secondaryDeltaUnit: 'p.p.'
    },
    thresholds21d: {
      metric: 'bps',
      strongThreshold: 25,
      moderateThreshold: 25,
      slopeConfirm: 0,
      slopeAbort: 0
    }
  }
};

const MACRO_TRENDS_METHODOLOGY = {
  name: 'Macro Historical Trends Engine v1 (21p & 63p)',
  primaryWindowSessions: 21,
  contextWindowSessions: 63,
  trendRule:
    'A direção de cada indicador é determinada exclusivamente pela evolução acumulada em 21 pregões fechados combinada à inclinação interna da 2ª vs. 1ª metade da janela. A variação de 1 único pregão nunca define o cenário.',
  unitNormalizationRule:
    'Cada indicador é exibido em sua unidade nativa (R$/US$ e % para Dólar; % a.a., p.p. e bps para DI/Selic/US10Y; pontos e % para VIX). Unidades diferentes nunca são plotadas no mesmo eixo bruto; qualquer comparação transversal usa índice normalizado explícito.',
  diVsSelicRule:
    'Separação rigorosa: a Taxa Selic Meta reflete a decisão vigente de política monetária do COPOM, enquanto a Curva DI Futuro reflete expectativas de juros negociadas diariamente pelo mercado. Uma jamais substitui silenciosamente a outra.',
  nonCausalityRule:
    'As notas explicativas descrevem movimentos históricos relevantes observados nos dados, sem inferir nem afirmar relações automáticas de causa e efeito entre variáveis.'
};

function round2(n) {
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}

function round4(n) {
  return Number.isFinite(n) ? Number(n.toFixed(4)) : null;
}

function pctChange(latest, base) {
  if (!Number.isFinite(latest) || !Number.isFinite(base) || base === 0) return null;
  return round2(((latest - base) / base) * 100);
}

function diffVal(latest, base, decimals = 2) {
  if (!Number.isFinite(latest) || !Number.isFinite(base)) return null;
  return Number((latest - base).toFixed(decimals));
}

function fmtSigned(val, decimals = 2, suffix = '') {
  if (!Number.isFinite(val)) return '—';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(decimals).replace('.', ',')}${suffix}`;
}

function fmtSignedInt(val, suffix = '') {
  if (!Number.isFinite(val)) return '—';
  const sign = val > 0 ? '+' : '';
  return `${sign}${Math.round(val)}${suffix}`;
}

function fmtBrDate(iso) {
  if (!iso || iso.length < 10) return '—';
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/**
 * Rejeita observações futuras, incompletas/intraday ou não-positivas e ordena ASC por data.
 */
function sanitizeClosedMacroSeries(indicatorId, series = [], now = new Date()) {
  const spec = INSTRUMENT_CATALOG[indicatorId];
  const expectedInfo = spec ? getExpectedReferenceDate(spec, now) : null;
  const maxAllowedDate = expectedInfo ? expectedInfo.expectedDate : null;

  if (!Array.isArray(series) || series.length === 0) {
    return { rows: [], filteredCount: 0, expectedInfo };
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
      sourceProvider: row.sourceProvider || spec?.provider || null,
      sourceTimestamp: row.sourceTimestamp || null
    });
  }

  const rows = Array.from(byDate.values()).sort((a, b) => a.referenceDate.localeCompare(b.referenceDate));
  return { rows, filteredCount, expectedInfo };
}

function classifyVixLevel(vixVal) {
  if (!Number.isFinite(vixVal)) return null;
  for (const r of VIX_LEVEL_REGIMES) {
    if (vixVal < r.maxExclusive) {
      return { code: r.code, label: r.label, shortLabel: r.shortLabel, color: r.color };
    }
  }
  return VIX_LEVEL_REGIMES[VIX_LEVEL_REGIMES.length - 1];
}

/**
 * Classifica tendência histórica de 21 pregões (NUNCA pela variação de 1 dia).
 */
function classifyMacroTrend21d(cfg, { change21dPct, delta21dBps, delta21dPts, halfSlopePct, hasFull21dWindow }) {
  if (!hasFull21dWindow) return TREND_DIRECTIONS.INSUFFICIENT;

  const t = cfg.thresholds21d;
  const primaryVal = t.metric === 'bps' ? delta21dBps : t.metric === 'pts' ? delta21dPts : change21dPct;
  if (!Number.isFinite(primaryVal)) return TREND_DIRECTIONS.INSUFFICIENT;

  const slope = Number.isFinite(halfSlopePct) ? halfSlopePct : 0;

  // Taxa de política monetária (Selic Meta): muda em degraus discretos do COPOM
  if (cfg.instrumentRole === 'monetary_policy_rate') {
    if (primaryVal >= t.strongThreshold) return { code: 'rising', label: 'Ciclo de Alta (COPOM)', shortLabel: 'Alta Selic', color: '#f59e0b' };
    if (primaryVal <= -t.strongThreshold) return { code: 'falling', label: 'Ciclo de Corte (COPOM)', shortLabel: 'Corte Selic', color: '#10b981' };
    return { code: 'sideways', label: 'Taxa Vigente Mantida (21p)', shortLabel: 'Mantida', color: '#94a3b8' };
  }

  if ((primaryVal >= t.strongThreshold && slope >= t.slopeAbort) || (primaryVal >= t.moderateThreshold && slope >= t.slopeConfirm)) {
    return TREND_DIRECTIONS.RISING;
  }

  if ((primaryVal <= -t.strongThreshold && slope <= -t.slopeAbort) || (primaryVal <= -t.moderateThreshold && slope <= -t.slopeConfirm)) {
    return TREND_DIRECTIONS.FALLING;
  }

  return TREND_DIRECTIONS.SIDEWAYS;
}

/**
 * Gera explicação observacional (rigorosamente NÃO causal) para o movimento histórico de 21 pregões.
 */
function buildObservationalExplanation(cfg, state) {
  if (state.status === 'indisponivel') {
    if (cfg.indicatorId === 'rate_di_curve') {
      return 'Série da Curva DI Futuro ainda indisponível (aguardando parser oficial B3/ANBIMA ETTJ). A taxa Selic Meta aparece separadamente como contexto de política monetária e não substitui juros futuros negociados.';
    }
    return `Série histórica de ${cfg.title} ainda indisponível nesta coleta. Nenhum valor é estimado ou preenchido manualmente.`;
  }

  if (!state.hasFull21dWindow) {
    return `${cfg.title} possui ${state.observationsCount} fechamento(s) armazenado(s), insuficiente para fechar a janela histórica mínima de 21 pregões. Valor complementar mais recente: ${state.currentValueFormatted}.`;
  }

  const periodTxt = `${fmtBrDate(state.period21d.startDate)} a ${fmtBrDate(state.period21d.endDate)}`;
  const lagWarning = state.status === 'atrasado'
    ? ` Atenção: série defasada em ${state.lagBusinessDays} pregão(ões) frente à data esperada (${fmtBrDate(state.expectedDate)}).`
    : '';

  if (cfg.indicatorId === 'fx_usd_brl') {
    const verb = state.trend.code === 'rising'
      ? `acumulou alta de ${state.primaryDelta21dFormatted} (${fmtSigned(state.delta21dAbs, 2, ' R$')})`
      : state.trend.code === 'falling'
        ? `acumulou queda de ${state.primaryDelta21dFormatted} (${fmtSigned(state.delta21dAbs, 2, ' R$')})`
        : `oscilou de forma lateral (${state.primaryDelta21dFormatted})`;
    return `Entre ${periodTxt} (21 pregões), o Dólar PTAX ${verb}, encerrando em ${state.currentValueFormatted} (faixa 21p: R$ ${state.range21d.min.toFixed(2).replace('.', ',')} – R$ ${state.range21d.max.toFixed(2).replace('.', ',')}). Registro puramente observacional da direção cambial, sem atribuir causalidade automática.${lagWarning}`;
  }

  if (cfg.indicatorId === 'rate_di_curve') {
    const verb = state.trend.code === 'rising'
      ? `abriu ${state.primaryDelta21dFormatted} (${state.secondaryDelta21dFormatted})`
      : state.trend.code === 'falling'
        ? `fechou ${state.primaryDelta21dFormatted} (${state.secondaryDelta21dFormatted})`
        : `permaneceu próxima da estabilidade (${state.primaryDelta21dFormatted})`;
    return `Entre ${periodTxt} (21 pregões), a Curva DI negociada ${verb}, com taxa mais recente em ${state.currentValueFormatted}. Reflete precificação diária de mercado para juros futuros — distinta de decisões do COPOM — descrita de forma observacional sem causalidade automática.${lagWarning}`;
  }

  if (cfg.indicatorId === 'rate_us10y') {
    const verb = state.trend.code === 'rising'
      ? `subiu ${state.primaryDelta21dFormatted} (${state.secondaryDelta21dFormatted})`
      : state.trend.code === 'falling'
        ? `recuou ${state.primaryDelta21dFormatted} (${state.secondaryDelta21dFormatted})`
        : `permaneceu lateral (${state.primaryDelta21dFormatted})`;
    return `Entre ${periodTxt} (21 pregões), o rendimento do Treasury americano de 10 anos ${verb}, marcando ${state.currentValueFormatted} no fechamento mais recente. Leitura descritiva da trajetória de juros longos nos EUA, sem inferência causal automática.${lagWarning}`;
  }

  if (cfg.indicatorId === 'vol_vix') {
    const regTxt = state.levelRegime ? ` em regime de nível "${state.levelRegime.label}"` : '';
    const verb = state.trend.code === 'rising'
      ? `expandiu ${state.primaryDelta21dFormatted} (${state.secondaryDelta21dFormatted})`
      : state.trend.code === 'falling'
        ? `comprimiu ${state.primaryDelta21dFormatted} (${state.secondaryDelta21dFormatted})`
        : `manteve-se estável (${state.primaryDelta21dFormatted})`;
    return `Entre ${periodTxt} (21 pregões), o CBOE VIX ${verb}, situando-se em ${state.currentValueFormatted}${regTxt}. A variação descreve o comportamento observado da volatilidade implícita sem atribuir causa única.${lagWarning}`;
  }

  if (cfg.indicatorId === 'rate_selic_meta') {
    const changeTxt = state.delta21dBps === 0
      ? 'permaneceu inalterada (0 bps)'
      : `variou ${state.primaryDelta21dFormatted} (${state.secondaryDelta21dFormatted})`;
    return `Entre ${periodTxt}, a Taxa Selic Meta vigente definida pelo COPOM ${changeTxt}, em ${state.currentValueFormatted}. Atua como referência de política monetária vigente e não substitui a Curva DI negociada em mercado.${lagWarning}`;
  }

  return '';
}

function formatCurrentLevel(cfg, val) {
  if (!Number.isFinite(val)) return 'Indisponível';
  if (cfg.unitSpec.unitFamily === 'currency_brl_usd') return `R$ ${val.toFixed(2).replace('.', ',')}`;
  if (cfg.unitSpec.unitFamily === 'interest_rate_pct_aa') return `${val.toFixed(2).replace('.', ',')}% a.a.`;
  if (cfg.unitSpec.unitFamily === 'volatility_index_pts') return `${val.toFixed(2).replace('.', ',')} pts`;
  return String(val);
}

/**
 * Constrói o diagnóstico histórico completo de um indicador macro.
 */
function buildSingleMacroIndicator(indicatorId, series = [], now = new Date()) {
  const cfg = INDICATOR_CONFIGS[indicatorId];
  const spec = INSTRUMENT_CATALOG[indicatorId];
  const { rows, filteredCount, expectedInfo } = sanitizeClosedMacroSeries(indicatorId, series, now);

  const expectedDate = expectedInfo?.expectedDate || null;

  if (!rows.length) {
    const emptyState = {
      indicatorId,
      satelliteId: cfg.satelliteId,
      title: cfg.title,
      shortTitle: cfg.shortTitle,
      category: cfg.category,
      instrumentRole: cfg.instrumentRole,
      distinctFromMonetaryPolicy: Boolean(cfg.distinctFromMonetaryPolicy),
      distinctFromFutureCurve: Boolean(cfg.distinctFromFutureCurve),
      status: 'indisponivel',
      source: spec?.provider || 'unconfigured',
      sourceLabel: cfg.sourceLabel,
      unitSpec: cfg.unitSpec,
      asOfDate: null,
      expectedDate,
      lagBusinessDays: null,
      collectedAt: null,
      currentValue: null,
      currentValueFormatted: 'Indisponível',
      hasFull21dWindow: false,
      hasFull63dWindow: false,
      observationsCount: 0,
      period21d: null,
      period63d: null,
      range21d: null,
      change1dSecondary: null,
      change21dPct: null,
      change63dPct: null,
      delta21dAbs: null,
      delta21dPp: null,
      delta21dBps: null,
      delta63dPp: null,
      delta63dBps: null,
      delta21dPts: null,
      delta63dPts: null,
      primaryDelta21dFormatted: 'Indisponível',
      secondaryDelta21dFormatted: '—',
      primaryDelta63dFormatted: '—',
      halfSlopePct: null,
      normalizedPositionIn21dRange: null,
      levelRegime: null,
      trend: TREND_DIRECTIONS.UNAVAILABLE,
      series21d: [],
      series63d: [],
      sparkline21d: [],
      filteredFutureOrIncompleteCount: filteredCount,
      unavailableReason: spec?.unavailableReason || 'NO_OBSERVATIONS_STORED'
    };
    emptyState.explanation = buildObservationalExplanation(cfg, emptyState);
    return emptyState;
  }

  const n = rows.length;
  const latest = rows[n - 1];
  const latestVal = latest.closeValue;
  const asOfDate = latest.referenceDate;
  const market = spec?.market === 'US' ? 'US' : 'BR';
  const lagDays = expectedDate && asOfDate < expectedDate
    ? countBusinessDaysBetween(asOfDate, expectedDate, market)
    : 0;
  const status = lagDays === 0 ? 'atualizado' : 'atrasado';

  const hasFull21dWindow = n >= 22;
  const hasFull63dWindow = n >= 64;

  const base1 = n >= 2 ? rows[n - 2] : null;
  const base21 = hasFull21dWindow ? rows[n - 22] : null;
  const base63 = hasFull63dWindow ? rows[n - 64] : null;

  const isRate = cfg.unitSpec.unitFamily === 'interest_rate_pct_aa';
  const isVix = cfg.unitSpec.unitFamily === 'volatility_index_pts';

  const change21dPct = base21 ? pctChange(latestVal, base21.closeValue) : null;
  const change63dPct = base63 ? pctChange(latestVal, base63.closeValue) : null;
  const delta21dAbs = base21 ? diffVal(latestVal, base21.closeValue, 4) : null;

  const delta21dPp = (isRate && base21) ? diffVal(latestVal, base21.closeValue, 2) : null;
  const delta21dBps = delta21dPp !== null ? Math.round(delta21dPp * 100) : null;
  const delta63dPp = (isRate && base63) ? diffVal(latestVal, base63.closeValue, 2) : null;
  const delta63dBps = delta63dPp !== null ? Math.round(delta63dPp * 100) : null;

  const delta21dPts = (isVix && base21) ? diffVal(latestVal, base21.closeValue, 2) : null;
  const delta63dPts = (isVix && base63) ? diffVal(latestVal, base63.closeValue, 2) : null;

  // Variação diária isolada (apenas metadado secundário — NUNCA usada na classificação!)
  const change1dSecondary = base1
    ? (isRate
        ? { value: diffVal(latestVal, base1.closeValue, 2), unit: 'p.p.', bps: Math.round(diffVal(latestVal, base1.closeValue, 2) * 100) }
        : isVix
          ? { value: diffVal(latestVal, base1.closeValue, 2), unit: 'pts', pct: pctChange(latestVal, base1.closeValue) }
          : { value: pctChange(latestVal, base1.closeValue), unit: '%' })
    : null;

  // Série histórica de 21 e 63 pregões (preservando unidade nativa + índice normalizado base 100)
  const slice21 = rows.slice(-21);
  const first21Val = slice21[0].closeValue;
  const series21d = slice21.map(r => ({
    date: r.referenceDate,
    value: round4(r.closeValue),
    normalizedBase100: first21Val > 0 ? round2((r.closeValue / first21Val) * 100) : 100
  }));

  const slice63 = rows.slice(-63);
  const first63Val = slice63[0].closeValue;
  const series63d = slice63.map(r => ({
    date: r.referenceDate,
    value: round4(r.closeValue),
    normalizedBase100: first63Val > 0 ? round2((r.closeValue / first63Val) * 100) : 100
  }));

  // Inclinação interna da janela de 21p (2ª metade vs 1ª metade)
  let halfSlopePct = null;
  if (series21d.length >= 6) {
    const mid = Math.floor(series21d.length / 2);
    const avg1 = series21d.slice(0, mid).reduce((a, p) => a + p.value, 0) / mid;
    const avg2 = series21d.slice(mid).reduce((a, p) => a + p.value, 0) / (series21d.length - mid);
    halfSlopePct = pctChange(avg2, avg1);
  }

  const vals21 = series21d.map(p => p.value);
  const min21 = Math.min(...vals21);
  const max21 = Math.max(...vals21);
  const span21 = max21 - min21;
  const normalizedPositionIn21dRange = span21 > 0
    ? round2(((latestVal - min21) / span21) * 100)
    : 50;

  const trend = classifyMacroTrend21d(cfg, {
    change21dPct,
    delta21dBps,
    delta21dPts,
    halfSlopePct,
    hasFull21dWindow
  });

  // Formatação estrita na unidade nativa
  let primaryDelta21dFormatted = 'Sem janela 21p';
  let secondaryDelta21dFormatted = '—';
  let primaryDelta63dFormatted = '—';

  if (hasFull21dWindow) {
    if (isRate) {
      primaryDelta21dFormatted = fmtSignedInt(delta21dBps, ' bps');
      secondaryDelta21dFormatted = fmtSigned(delta21dPp, 2, ' p.p.');
      primaryDelta63dFormatted = delta63dBps !== null ? `${fmtSignedInt(delta63dBps, ' bps')} (${fmtSigned(delta63dPp, 2, ' p.p.')})` : '—';
    } else if (isVix) {
      primaryDelta21dFormatted = fmtSigned(delta21dPts, 2, ' pts');
      secondaryDelta21dFormatted = fmtSigned(change21dPct, 1, '%');
      primaryDelta63dFormatted = delta63dPts !== null ? `${fmtSigned(delta63dPts, 2, ' pts')} (${fmtSigned(change63dPct, 1, '%')})` : '—';
    } else {
      primaryDelta21dFormatted = fmtSigned(change21dPct, 2, '%');
      secondaryDelta21dFormatted = fmtSigned(delta21dAbs, 2, ' R$');
      primaryDelta63dFormatted = change63dPct !== null ? fmtSigned(change63dPct, 2, '%') : '—';
    }
  }

  const state = {
    indicatorId,
    satelliteId: cfg.satelliteId,
    title: cfg.title,
    shortTitle: cfg.shortTitle,
    category: cfg.category,
    instrumentRole: cfg.instrumentRole,
    distinctFromMonetaryPolicy: Boolean(cfg.distinctFromMonetaryPolicy),
    distinctFromFutureCurve: Boolean(cfg.distinctFromFutureCurve),
    status,
    source: latest.sourceProvider || spec?.provider || 'unknown',
    sourceLabel: cfg.sourceLabel,
    unitSpec: cfg.unitSpec,
    asOfDate,
    expectedDate,
    lagBusinessDays: lagDays,
    collectedAt: latest.collectedAt || null,
    sourceTimestamp: latest.sourceTimestamp || null,
    currentValue: round4(latestVal),
    currentValueFormatted: formatCurrentLevel(cfg, latestVal),
    hasFull21dWindow,
    hasFull63dWindow,
    observationsCount: n,
    period21d: hasFull21dWindow
      ? { startDate: base21.referenceDate, endDate: asOfDate, sessions: 21 }
      : { startDate: slice21[0].referenceDate, endDate: asOfDate, sessions: slice21.length },
    period63d: hasFull63dWindow
      ? { startDate: base63.referenceDate, endDate: asOfDate, sessions: 63 }
      : null,
    range21d: { min: round4(min21), max: round4(max21), startValue: round4(slice21[0].closeValue) },
    change1dSecondary,
    change21dPct,
    change63dPct,
    delta21dAbs,
    delta21dPp,
    delta21dBps,
    delta63dPp,
    delta63dBps,
    delta21dPts,
    delta63dPts,
    primaryDelta21dFormatted,
    secondaryDelta21dFormatted,
    primaryDelta63dFormatted,
    halfSlopePct,
    normalizedPositionIn21dRange,
    levelRegime: isVix ? classifyVixLevel(latestVal) : null,
    trend,
    series21d,
    series63d,
    sparkline21d: series21d.map(p => p.value),
    filteredFutureOrIncompleteCount: filteredCount
  };

  state.explanation = buildObservationalExplanation(cfg, state);
  return state;
}

/**
 * Constrói a dimensão completa de Tendências Macro Históricas (08):
 * Dólar/BRL, Curva DI (BR), US Treasury 10Y, VIX e Contexto de Política Monetária (Selic Meta).
 */
function buildMacroTrendsDimension(seriesById = {}, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();

  const dolar = buildSingleMacroIndicator('fx_usd_brl', seriesById.fx_usd_brl || [], now);
  const diCurve = buildSingleMacroIndicator('rate_di_curve', seriesById.rate_di_curve || [], now);
  const us10y = buildSingleMacroIndicator('rate_us10y', seriesById.rate_us10y || [], now);
  const vix = buildSingleMacroIndicator('vol_vix', seriesById.vol_vix || [], now);
  const selic = buildSingleMacroIndicator('rate_selic_meta', seriesById.rate_selic_meta || [], now);

  // Spread implícito Curva DI vs Selic Meta (somente quando AMBOS estão disponíveis — nunca substitui um pelo outro!)
  const hasBothBrRates = diCurve.status !== 'indisponivel' && selic.status !== 'indisponivel' &&
    Number.isFinite(diCurve.currentValue) && Number.isFinite(selic.currentValue);
  const spreadDiVsSelicPp = hasBothBrRates ? diffVal(diCurve.currentValue, selic.currentValue, 2) : null;
  const spreadDiVsSelicBps = spreadDiVsSelicPp !== null ? Math.round(spreadDiVsSelicPp * 100) : null;

  const brRatesDistinction = {
    selicIsMonetaryPolicy: true,
    diIsMarketTradedFuture: true,
    neverSubstituteSelicForDi: true,
    diAvailable: diCurve.status !== 'indisponivel',
    selicAvailable: selic.status !== 'indisponivel',
    spreadDiVsSelicPp,
    spreadDiVsSelicBps,
    distinctionNote:
      'Taxa Selic Meta (decisão de política monetária vigente do COPOM) e Curva DI Futuro (expectativa de juros negociada diariamente no mercado) são métricas distintas e apresentadas separadamente.'
  };

  const priorityList = [dolar, diCurve, us10y, vix];

  // Comparação transversal normalizada (0–100 dentro da faixa de 21p de cada indicador — NUNCA mistura unidades brutas!)
  const normalizedComparison21d = priorityList.map(ind => ({
    indicatorId: ind.indicatorId,
    satelliteId: ind.satelliteId,
    shortTitle: ind.shortTitle,
    status: ind.status,
    nativeUnit: ind.unitSpec.primaryDeltaUnit,
    primaryDelta21dFormatted: ind.primaryDelta21dFormatted,
    currentValueFormatted: ind.currentValueFormatted,
    trendCode: ind.trend.code,
    trendShortLabel: ind.trend.shortLabel,
    trendColor: ind.trend.color,
    isNormalizedScale: true,
    normalizedRangePositionPct: ind.normalizedPositionIn21dRange,
    normalizedBase100Latest: ind.series21d.length ? ind.series21d[ind.series21d.length - 1].normalizedBase100 : null
  }));

  // Observações não-causais consolidadas
  const observations = [];
  for (const ind of priorityList) {
    if (ind.status === 'indisponivel') {
      observations.push({
        indicatorId: ind.indicatorId,
        severity: 'muted',
        text: `${ind.shortTitle}: indisponível (${ind.unavailableReason || 'sem série armazenada'}).`
      });
    } else if (ind.status === 'atrasado') {
      observations.push({
        indicatorId: ind.indicatorId,
        severity: 'warn',
        text: `${ind.shortTitle} (${ind.trend.shortLabel} · ${ind.primaryDelta21dFormatted}): dado atrasado em ${ind.lagBusinessDays} pregão(ões) (ref. ${fmtBrDate(ind.asOfDate)}).`
      });
    } else if (ind.hasFull21dWindow) {
      observations.push({
        indicatorId: ind.indicatorId,
        severity: ind.trend.code === 'sideways' ? 'neutral' : 'info',
        text: `${ind.shortTitle}: ${ind.trend.label} (${ind.primaryDelta21dFormatted}; nível complementar ${ind.currentValueFormatted}).`
      });
    }
  }

  if (selic.status !== 'indisponivel') {
    observations.push({
      indicatorId: 'rate_selic_meta',
      severity: 'neutral',
      text: `Contexto COPOM (Selic Meta vigente): ${selic.currentValueFormatted} (${selic.hasFull21dWindow ? selic.primaryDelta21dFormatted : 'referência vigente'}) — mantida separada da Curva DI Futuro.`
    });
  }

  // Status consolidado rigoroso dos 4 indicadores prioritários + Selic
  const allStatuses = [...priorityList, selic].map(i => i.status);
  let overallStatus = 'parcial';
  if (allStatuses.every(s => s === 'atualizado')) overallStatus = 'atualizado';
  else if (allStatuses.every(s => s === 'indisponivel')) overallStatus = 'indisponivel';
  else if (allStatuses.every(s => s === 'atrasado')) overallStatus = 'atrasado';

  const counts = {
    totalTracked: 5,
    atualizado: allStatuses.filter(s => s === 'atualizado').length,
    atrasado: allStatuses.filter(s => s === 'atrasado').length,
    indisponivel: allStatuses.filter(s => s === 'indisponivel').length
  };

  return {
    id: 'macro_trends',
    horizonSessions: 21,
    contextSessions: 63,
    status: overallStatus,
    counts,
    causalityGuard: true,
    normalizationGuard: true,
    indicators: {
      fx_usd_brl: dolar,
      rate_di_curve: diCurve,
      rate_us10y: us10y,
      vol_vix: vix
    },
    bySatelliteId: {
      trend_dolar: dolar,
      trend_di: diCurve,
      trend_us10y: us10y,
      trend_vix: vix
    },
    policyContext: {
      selic,
      brRatesDistinction
    },
    normalizedComparison21d,
    observations,
    methodology: MACRO_TRENDS_METHODOLOGY
  };
}

module.exports = {
  TREND_DIRECTIONS,
  VIX_LEVEL_REGIMES,
  INDICATOR_CONFIGS,
  MACRO_TRENDS_METHODOLOGY,
  sanitizeClosedMacroSeries,
  classifyVixLevel,
  classifyMacroTrend21d,
  buildSingleMacroIndicator,
  buildMacroTrendsDimension
};
