'use strict';

/**
 * HEALTHY TREND TRADER — GOLD & PROTECTION ASSETS ENGINE (09)
 * Esfera dedicada ao Ouro e Ativos de Proteção
 *
 * Princípios invioláveis:
 * 1. Tendência histórica dos últimos 21 pregões (e janelas de 63p) em DESTAQUE;
 *    variação diária (1d) apresentada como métrica estritamente secundária.
 * 2. Leitura independente e contextualizada com fonte confiável e timestamp.
 * 3. Força relativa consistente frente a ações (S&P 500, IBOV) e dólar (USD).
 * 4. Racional comportamental crítico: NUNCA presumir que toda alta do ouro
 *    representa fuga para segurança. Diferencia regimes de liquidez, inflação
 *    e aversão a risco genuína.
 * 5. Arquitetura extensível para acomodar outras commodities (Petróleo, Commodities Amplas).
 */

const {
  INSTRUMENT_CATALOG,
  getExpectedReferenceDate,
  countBusinessDaysBetween
} = require('./capital-intelligence-ingestion');

const GOLD_REGIMES = {
  FLIGHT_TO_SAFETY: {
    code: 'flight_to_safety',
    label: 'Aversão a Risco / Fuga para Segurança',
    shortLabel: 'Fuga p/ Segurança',
    badge: 'PROTEÇÃO ATIVA',
    color: '#10b981',
    description: 'Ouro em valorização com aumento da volatilidade (VIX) e enfraquecimento acionário. Demanda institucional por refúgio de capital.'
  },
  LIQUIDITY_EXPANSION: {
    code: 'liquidity_expansion',
    label: 'Expansão de Liquidez / Dólar Fraco',
    shortLabel: 'Liquidez / Dólar Fraco',
    badge: 'EXPANSÃO DE LIQUIDEZ',
    color: '#38bdf8',
    description: 'Ouro sobe em sintonia com ações e enfraquecimento do dólar/taxas de juros. Movimento decorrente de expansão de liquidez, não pânico ou crise.'
  },
  INFLATION_HEDGE: {
    code: 'inflation_hedge',
    label: 'Proteção Inflacionária / Hedge Real',
    shortLabel: 'Hedge Inflacionário',
    badge: 'HEDGE REAL',
    color: '#d97706',
    description: 'Ouro avança alinhado à cesta ampla de commodities e energia. Proteção de patrimônio contra perda de poder de compra da moeda fiduciária.'
  },
  OPPORTUNITY_COST: {
    code: 'opportunity_cost',
    label: 'Pressão por Custo de Oportunidade (Juros Altos)',
    shortLabel: 'Custo Oportunidade',
    badge: 'PRESSÃO DE JUROS',
    color: '#ef4444',
    description: 'Ouro recua ou lateraliza diante de taxas de juros reais elevadas e dólar forte, que aumentam o custo de manter reservas sem rendimento direto.'
  },
  CONSOLIDATION: {
    code: 'consolidation',
    label: 'Consolidação / Equilíbrio Macroeconômico',
    shortLabel: 'Consolidação',
    badge: 'EQUILÍBRIO',
    color: '#94a3b8',
    description: 'Ouro oscilando em faixa lateral estreita sem dominância clara de aversão ao risco ou choque inflacionário.'
  }
};

const GOLD_TREND_THRESHOLDS = {
  RISING: 1.5,   // +1.5% em 21 pregões
  FALLING: -1.5  // -1.5% em 21 pregões
};

/**
 * Calcula variação percentual segura entre dois valores.
 */
function calcPctChange(latest, base) {
  if (!Number.isFinite(latest) || !Number.isFinite(base) || base === 0) return null;
  return Number((((latest - base) / base) * 100).toFixed(2));
}

/**
 * Filtra e ordena observações históricas não futuras.
 */
function sanitizeObservations(series = [], maxDate = null) {
  if (!Array.isArray(series)) return [];
  const valid = [];
  for (const row of series) {
    if (!row || !row.referenceDate) continue;
    const ref = String(row.referenceDate).slice(0, 10);
    if (maxDate && ref > maxDate) continue;
    const val = Number(row.closeValue);
    if (!Number.isFinite(val) || val <= 0) continue;
    valid.push({
      date: ref,
      closeValue: val
    });
  }
  return valid.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Avalia o regime comportamental do Ouro cruzando com Ações, Dólar e Volatilidade.
 * Aceita argumentos posicionais ou um objeto de opções.
 */
function evaluateGoldMacroRegime(goldTrend21dOrOptions, spyTrend21d, usdTrend21d, vixLevel, oilTrend21d) {
  let gRet, sRet, uRet, vix, oRet;
  if (typeof goldTrend21dOrOptions === 'object' && goldTrend21dOrOptions !== null) {
    const opts = goldTrend21dOrOptions;
    gRet = Number.isFinite(opts.goldChange21d ?? opts.goldTrend21d) ? (opts.goldChange21d ?? opts.goldTrend21d) : 0;
    sRet = Number.isFinite(opts.equitiesChange21d ?? opts.spyTrend21d) ? (opts.equitiesChange21d ?? opts.spyTrend21d) : 0;
    uRet = Number.isFinite(opts.dollarChange21d ?? opts.usdTrend21d) ? (opts.dollarChange21d ?? opts.usdTrend21d) : 0;
    oRet = Number.isFinite(opts.oilChange21d ?? opts.oilTrend21d) ? (opts.oilChange21d ?? opts.oilTrend21d) : 0;
    vix = Number.isFinite(opts.vixLevel) ? opts.vixLevel : 16;
  } else {
    gRet = Number.isFinite(goldTrend21dOrOptions) ? goldTrend21dOrOptions : 0;
    sRet = Number.isFinite(spyTrend21d) ? spyTrend21d : 0;
    uRet = Number.isFinite(usdTrend21d) ? usdTrend21d : 0;
    oRet = Number.isFinite(oilTrend21d) ? oilTrend21d : 0;
    vix = Number.isFinite(vixLevel) ? vixLevel : 16;
  }

  // 1. Fuga para Segurança: Ouro sobe com ações caindo e volatilidade moderada/alta (VIX > 19 ou subindo)
  if (gRet > GOLD_TREND_THRESHOLDS.RISING && sRet < 0 && (vix >= 19 || sRet < -2.0)) {
    return {
      regime: GOLD_REGIMES.FLIGHT_TO_SAFETY,
      flightToSafetyConfirmed: true,
      rationale: 'O avanço recente do ouro coincide com desvalorização nas bolsas globais e volatilidade sustentada, confirmando alocação institucional de refúgio.'
    };
  }

  // 2. Expansão de Liquidez: Ouro sobe junto com ações e dólar em queda
  if (gRet > GOLD_TREND_THRESHOLDS.RISING && sRet > 0.5 && uRet <= 0.5) {
    return {
      regime: GOLD_REGIMES.LIQUIDITY_EXPANSION,
      flightToSafetyConfirmed: false,
      rationale: 'O ouro avança em paralelo com a expansão das ações globais e estabilidade cambial. O movimento reflete expansão ampla de liquidez e enfraquecimento de moedas fiduciárias, e NÃO pânico ou crise.'
    };
  }

  // 3. Hedge Inflacionário: Ouro e petróleo/commodities sobem juntos
  if (gRet > GOLD_TREND_THRESHOLDS.RISING && oRet > 2.0) {
    return {
      regime: GOLD_REGIMES.INFLATION_HEDGE,
      flightToSafetyConfirmed: false,
      rationale: 'A alta do ouro está correlacionada à valorização de commodities de energia e insumos básicos, caracterizando proteção contra pressões inflacionárias estruturais.'
    };
  }

  // 4. Custo de Oportunidade: Ouro fraco enquanto dólar/juros sustentam força
  if (gRet < GOLD_TREND_THRESHOLDS.FALLING && (uRet > 1.0 || sRet > 2.0)) {
    return {
      regime: GOLD_REGIMES.OPPORTUNITY_COST,
      flightToSafetyConfirmed: false,
      rationale: 'O ouro enfrenta pressão de realização diante do fortalecimento do dólar e concorrência com rendimentos de renda fixa soberana.'
    };
  }

  // 5. Consolidação padrão
  return {
    regime: GOLD_REGIMES.CONSOLIDATION,
    flightToSafetyConfirmed: false,
    rationale: 'O ouro oscila em equilíbrio relativo frente aos ativos globais de risco e moedas de reserva, sem assimetria direcional pronunciada nos últimos 21 pregões.'
  };
}

/**
 * Constrói a dimensão estrutural do Ouro e Ativos de Proteção (Esfera 09).
 */
function buildGoldProtectionDimension(seriesById = {}, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const maxDate = options.maxDate || now.toISOString().slice(0, 10);

  // Séries históricas sanitizadas
  const goldSeries = sanitizeObservations(seriesById.cmd_gold || seriesById.GOLD || [], maxDate);
  const spySeries = sanitizeObservations(seriesById.cycle_us_sp500 || seriesById.cycle_us_spy || seriesById.SPY || [], maxDate);
  const usdSeries = sanitizeObservations(seriesById.fx_usd_brl || seriesById.macro_dxy || seriesById.USD || [], maxDate);
  const vixSeries = sanitizeObservations(seriesById.vol_vix || seriesById.macro_vix || seriesById.VIX || [], maxDate);
  const oilSeries = sanitizeObservations(seriesById.cmd_oil || seriesById.OIL || seriesById.USO || [], maxDate);
  const broadSeries = sanitizeObservations(seriesById.cmd_broad || seriesById.DBC || seriesById.COMMODITIES || [], maxDate);

  const hasHistory = goldSeries.length >= 2;
  const latestGold = hasHistory ? goldSeries[goldSeries.length - 1] : null;
  const prev1dGold = goldSeries.length >= 2 ? goldSeries[goldSeries.length - 2] : null;
  const prev21dGold = goldSeries.length >= 22 ? goldSeries[goldSeries.length - 22] : (goldSeries.length > 5 ? goldSeries[0] : null);
  const prev63dGold = goldSeries.length >= 64 ? goldSeries[goldSeries.length - 64] : null;

  const currentPrice = latestGold ? latestGold.closeValue : null;
  const change1dPct = (latestGold && prev1dGold) ? calcPctChange(latestGold.closeValue, prev1dGold.closeValue) : null;
  const change21dPct = (latestGold && prev21dGold) ? calcPctChange(latestGold.closeValue, prev21dGold.closeValue) : null;
  const change63dPct = (latestGold && prev63dGold) ? calcPctChange(latestGold.closeValue, prev63dGold.closeValue) : null;

  // Tendência primária do ouro (21 pregões)
  let trendDirection = 'neutral';
  let trendLabel = 'Lateral / Estável';
  if (change21dPct !== null) {
    if (change21dPct >= GOLD_TREND_THRESHOLDS.RISING) {
      trendDirection = 'up';
      trendLabel = 'Tendência de Alta (21p)';
    } else if (change21dPct <= GOLD_TREND_THRESHOLDS.FALLING) {
      trendDirection = 'down';
      trendLabel = 'Tendência de Queda (21p)';
    }
  }

  // Desempenho relativo dos pares de controle (21 pregões)
  const spyLatest = spySeries.length >= 1 ? spySeries[spySeries.length - 1] : null;
  const spyPrev21 = spySeries.length >= 22 ? spySeries[spySeries.length - 22] : (spySeries.length > 1 ? spySeries[0] : null);
  const spyChange21d = (spyLatest && spyPrev21) ? calcPctChange(spyLatest.closeValue, spyPrev21.closeValue) : null;

  const usdLatest = usdSeries.length >= 1 ? usdSeries[usdSeries.length - 1] : null;
  const usdPrev21 = usdSeries.length >= 22 ? usdSeries[usdSeries.length - 22] : (usdSeries.length > 1 ? usdSeries[0] : null);
  const usdChange21d = (usdLatest && usdPrev21) ? calcPctChange(usdLatest.closeValue, usdPrev21.closeValue) : null;

  const vixLatest = vixSeries.length >= 1 ? vixSeries[vixSeries.length - 1].closeValue : null;

  const oilLatest = oilSeries.length >= 1 ? oilSeries[oilSeries.length - 1] : null;
  const oilPrev21 = oilSeries.length >= 22 ? oilSeries[oilSeries.length - 22] : (oilSeries.length > 1 ? oilSeries[0] : null);
  const oilChange21d = (oilLatest && oilPrev21) ? calcPctChange(oilLatest.closeValue, oilPrev21.closeValue) : null;

  const broadLatest = broadSeries.length >= 1 ? broadSeries[broadSeries.length - 1] : null;
  const broadPrev21 = broadSeries.length >= 22 ? broadSeries[broadSeries.length - 22] : (broadSeries.length > 1 ? broadSeries[0] : null);
  const broadChange21d = (broadLatest && broadPrev21) ? calcPctChange(broadLatest.closeValue, broadPrev21.closeValue) : null;

  // Força Relativa (Spread de Retorno em 21 pregões)
  const relativeStrength = {
    vsEquitiesUs: (change21dPct !== null && spyChange21d !== null)
      ? Number((change21dPct - spyChange21d).toFixed(2))
      : null,
    vsDollar: (change21dPct !== null && usdChange21d !== null)
      ? Number((change21dPct - usdChange21d).toFixed(2))
      : null,
    equitiesChange21d: spyChange21d,
    dollarChange21d: usdChange21d
  };

  // Avaliação do Regime
  const regimeAnalysis = evaluateGoldMacroRegime(
    change21dPct,
    spyChange21d,
    usdChange21d,
    vixLatest,
    oilChange21d
  );

  // Informações de frescor e proveniência
  const spec = INSTRUMENT_CATALOG.cmd_gold || {};
  const expectedInfo = getExpectedReferenceDate(spec, now);
  const asOfDate = latestGold ? latestGold.date : null;
  const lagBusinessDays = asOfDate
    ? countBusinessDaysBetween(asOfDate, expectedInfo.expectedDate, 'US')
    : null;

  let status = 'atualizado';
  if (!latestGold) {
    status = 'indisponivel';
  } else if (lagBusinessDays > 1) {
    status = 'atrasado';
  }

  // Cesta de Commodities Adicionais para expansão futura
  const otherCommodities = [
    {
      symbol: 'OIL',
      name: 'Petróleo WTI (Proxy USO)',
      latestValue: oilLatest ? oilLatest.closeValue : null,
      change1dPct: (oilLatest && oilSeries.length >= 2) ? calcPctChange(oilLatest.closeValue, oilSeries[oilSeries.length - 2].closeValue) : null,
      change21dPct: oilChange21d,
      asOfDate: oilLatest ? oilLatest.date : null,
      status: oilLatest ? 'atualizado' : 'indisponivel'
    },
    {
      symbol: 'BROAD',
      name: 'Cesta Ampla Commodities (Proxy DBC)',
      latestValue: broadLatest ? broadLatest.closeValue : null,
      change1dPct: (broadLatest && broadSeries.length >= 2) ? calcPctChange(broadLatest.closeValue, broadSeries[broadSeries.length - 2].closeValue) : null,
      change21dPct: broadChange21d,
      asOfDate: broadLatest ? broadLatest.date : null,
      status: broadLatest ? 'atualizado' : 'indisponivel'
    }
  ];

  return {
    id: 'gold_commodities',
    tier: 'primary',
    universe: 'macro',
    region: 'GLOBAL',
    badge: 'OURO / PROTEÇÃO',
    label: 'Ouro & Ativos de Proteção',
    shortLabel: 'Ouro / Proteção',
    subtitle: 'Hedge Real · Tendência Histórica e Comportamento Relativo',
    status,
    metricNature: 'price_performance',
    asOfDate,
    expectedDate: expectedInfo.expectedDate,
    lagBusinessDays,
    collectedAt: now.toISOString(),
    source: spec.provider ? `Referência Internacional (${spec.provider.toUpperCase()} / GLD Proxy)` : 'Benchmarks Globais',

    // Preço e Janelas Temporais
    primaryPrice: {
      instrument: 'XAU_USD',
      symbol: 'GLD',
      name: 'Ouro Internacional (Proxy ETF GLD)',
      currency: 'USD',
      currentPrice,
      asOfDate
    },
    historicalTrends: {
      primaryWindowLabel: '21 pregões (destaque)',
      change21dPct,
      change63dPct,
      change1dPct, // secundária
      trendDirection,
      trendLabel
    },

    // Força Relativa
    relativeStrength: {
      vsEquitiesUsPct: relativeStrength.vsEquitiesUs,
      vsDollarPct: relativeStrength.vsDollar,
      summaryText: relativeStrength.vsEquitiesUs !== null
        ? (relativeStrength.vsEquitiesUs > 0
            ? `Superando ações globais em +${relativeStrength.vsEquitiesUs.toFixed(1)}pp nos últimos 21 pregões`
            : `Desempenho relativo inferior às ações globais em ${relativeStrength.vsEquitiesUs.toFixed(1)}pp (21p)`)
        : 'Histórico insuficiente para comparação consistente'
    },

    // Contexto Macroeconômico e Volatilidade
    macroContext: {
      vixLevel: vixLatest,
      vixRegime: vixLatest ? (vixLatest < 18 ? 'Calmo' : vixLatest < 25 ? 'Moderado' : 'Estresse') : '—',
      oilTrend21dPct: oilChange21d
    },

    // Interpretação Comportamental e Racional
    interpretation: {
      regimeCode: regimeAnalysis.regime.code,
      regimeLabel: regimeAnalysis.regime.label,
      regimeBadge: regimeAnalysis.regime.badge,
      regimeColor: regimeAnalysis.regime.color,
      flightToSafetyConfirmed: regimeAnalysis.flightToSafetyConfirmed,
      rationale: regimeAnalysis.rationale,
      limitations: [
        'Não presumir que toda alta do ouro seja fuga para segurança: períodos de enfraquecimento do dólar e expansão de liquidez global impulsionam o ouro conjuntamente com ativos de risco.',
        'Ouro não gera fluxo de caixa ou dividendos; momentos de juros reais soberanos elevados impõem custo de oportunidade relevante.',
        'Variações cambiais em moedas locais (como USD/BRL) afetam a percepção do investidor doméstico em relação ao preço internacional em USD.'
      ]
    },

    // Expansão Futura de Commodities
    otherCommodities,

    // Resumo executivo para exibição rápida na esfera
    displayValue: change21dPct !== null
      ? `${change21dPct > 0 ? '+' : ''}${change21dPct.toFixed(1).replace('.', ',')}% (21p)`
      : (currentPrice ? `$${currentPrice.toFixed(2)}` : 'Aguardando feed'),
    metricCaption: change1dPct !== null
      ? `Hoje: ${change1dPct > 0 ? '+' : ''}${change1dPct.toFixed(2).replace('.', ',')}%`
      : 'Ouro · Janela 21p',
    state: trendDirection === 'up' ? 'expansion' : (trendDirection === 'down' ? 'defense' : 'neutral'),
    stateLabel: regimeAnalysis.regime.shortLabel
  };
}

module.exports = {
  GOLD_REGIMES,
  GOLD_TREND_THRESHOLDS,
  calcPctChange,
  sanitizeObservations,
  evaluateGoldMacroRegime,
  buildGoldProtectionDimension
};
