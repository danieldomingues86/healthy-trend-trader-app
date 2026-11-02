/* ==========================================================================
   Healthy Trend Trader — Market Resilience Model (Resiliência 12M)
   Conceito: Gem #6 — High Relative Strength Survives Market Weakness
   "Quando o mercado fica fraco, esse ativo consegue continuar forte?"
   Análise complementar 100% EOD / Diário (12 meses ~ 252 pregões).
   IMPORTANTE: A Resiliência não altera nem interfere na classificação RS.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MarketResilienceModel = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TIERS = {
    EXCELENTE: { key: 'excelente', min: 80, max: 100, label: 'Excelente', badgeClass: 'green', dot: '🟢', desc: 'Resistência excepcional em quedas do mercado' },
    FORTE:     { key: 'forte',     min: 60, max: 79,  label: 'Forte',     badgeClass: 'yellow', dot: '🟡', desc: 'Boa capacidade de sustentação em correções' },
    MODERADA:  { key: 'moderada',  min: 40, max: 59,  label: 'Moderada',  badgeClass: 'yellow', dot: '🟡', desc: 'Comportamento alinhado à média do mercado' },
    FRACA:     { key: 'fraca',     min: 0,  max: 39,  label: 'Fraca',     badgeClass: 'red',    dot: '🔴', desc: 'Amplia quedas ou sofre forte pressão em correções' }
  };

  const TOOLTIPS = {
    rsReading: 'Classificação baseada exclusivamente na Força Relativa (RS). A Resiliência 12M não altera esta classificação.',
    resilience12m: 'Resiliência 12M — Mede como o ativo se comportou durante os dias em que o índice de referência apresentou desempenho negativo nos últimos 12 meses. O cálculo utiliza exclusivamente dados EOD / Diário. Métrica complementar à Força Relativa.',
    explanationBanner: 'A classificação do ativo (Líder, Qualificado, etc.) é determinada exclusivamente pela Força Relativa (RS). A Resiliência 12M é uma métrica complementar que mostra como o ativo se comportou durante períodos de fraqueza do mercado nos últimos 12 meses.'
  };

  function getScoreTier(score) {
    if (score === null || score === undefined || score === '') {
      return { key: 'none', label: '—', badgeClass: 'neutral', dot: '⚪', desc: 'Dados insuficientes' };
    }
    const num = Number(score);
    if (!Number.isFinite(num)) {
      return { key: 'none', label: '—', badgeClass: 'neutral', dot: '⚪', desc: 'Dados insuficientes' };
    }
    if (num >= 80) return TIERS.EXCELENTE;
    if (num >= 60) return TIERS.FORTE;
    if (num >= 40) return TIERS.MODERADA;
    return TIERS.FRACA;
  }

  function formatOutperformance(val) {
    const n = Number(val);
    if (!Number.isFinite(n)) return '—';
    const sign = n >= 0 ? '+' : '';
    return `${sign}${n.toFixed(1).replace('.', ',')} p.p.`;
  }

  function formatPercent(val) {
    const n = Number(val);
    if (!Number.isFinite(n)) return '—';
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(1).replace('.', ',')}%`;
  }

  function getInterpretation(score, symbol = '', benchmark = 'IBOV') {
    const num = Number(score);
    if (!Number.isFinite(num)) {
      return 'Dados históricos insuficientes para calcular a resiliência nos últimos 12 meses.';
    }
    if (num >= 80) {
      return 'Este ativo demonstrou excelente capacidade de preservar ou superar seu desempenho durante períodos de fraqueza do mercado.';
    }
    if (num >= 60) {
      return 'Este ativo apresentou boa capacidade de preservar seu desempenho relativo em dias de queda do mercado.';
    }
    if (num >= 40) {
      return 'Este ativo apresentou capacidade moderada de sustentação relativa durante correções do mercado.';
    }
    return 'Este ativo acompanhou ou ampliou as quedas do mercado durante os períodos de fraqueza.';
  }

  /**
   * Calcula a Resiliência 12M a partir de candles diários EOD do ativo e do benchmark.
   * Janela oficial: 12 meses (~252 pregões).
   */
  function calculate(assetCandles, benchmarkCandles, options = {}) {
    const windowSize = options.window || 252;
    const benchmarkLabel = options.benchmarkLabel || 'IBOV';
    const minSessions = options.minSessions || 5;
    const minMatchedDays = options.minMatchedDays || 5;

    if (!Array.isArray(assetCandles) || !Array.isArray(benchmarkCandles) || assetCandles.length < minSessions || benchmarkCandles.length < minSessions) {
      return null;
    }

    // Retornos do benchmark
    const benchMap = new Map();
    for (let i = 1; i < benchmarkCandles.length; i++) {
      const prev = benchmarkCandles[i - 1];
      const curr = benchmarkCandles[i];
      const pClose = Number(prev.close);
      const cClose = Number(curr.close);
      if (pClose > 0 && cClose > 0) {
        const ret = ((cClose - pClose) / pClose) * 100;
        const d = String(curr.time || curr.date || '');
        const normDate = d.includes('-') ? d : `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
        benchMap.set(normDate, { close: cClose, ret });
      }
    }

    // Seleciona as últimas N sessões do benchmark
    const benchEntries = Array.from(benchMap.entries()).slice(-windowSize);
    const downBenchmarkDays = benchEntries.filter(([_, data]) => data.ret < 0);

    if (downBenchmarkDays.length < 5) return null;

    // Retornos do ativo
    const assetMap = new Map();
    for (let i = 1; i < assetCandles.length; i++) {
      const prev = assetCandles[i - 1];
      const curr = assetCandles[i];
      const pClose = Number(prev.close);
      const cClose = Number(curr.close);
      if (pClose > 0 && cClose > 0) {
        const ret = ((cClose - pClose) / pClose) * 100;
        const d = String(curr.time || curr.date || '');
        const normDate = d.includes('-') ? d : `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
        assetMap.set(normDate, { close: cClose, ret });
      }
    }

    let matchedDays = 0;
    let beatCount = 0;
    let upCount = 0;
    let sumDelta = 0;
    let sumAssetRet = 0;
    let sumBenchRet = 0;

    for (const [dateStr, benchData] of downBenchmarkDays) {
      const assetData = assetMap.get(dateStr);
      if (assetData) {
        matchedDays++;
        sumAssetRet += assetData.ret;
        sumBenchRet += benchData.ret;
        const delta = assetData.ret - benchData.ret;
        sumDelta += delta;
        if (delta > 0) beatCount++;
        if (assetData.ret > 0) upCount++;
      }
    }

    if (matchedDays < minMatchedDays) return null;

    const beatRate = Number(((beatCount / matchedDays) * 100).toFixed(1));
    const avgAssetDrop = Number((sumAssetRet / matchedDays).toFixed(2));
    const avgBenchDrop = Number((sumBenchRet / matchedDays).toFixed(2));
    const outperformance = Number((sumDelta / matchedDays).toFixed(2));

    // Normalização determinística do score de 0 a 100
    const beatScore = beatRate;
    const spreadScore = Math.min(Math.max(((outperformance + 1.5) / 3.0) * 100, 0), 100);
    const upScore = Math.min(((upCount / matchedDays) / 0.4) * 100, 100);
    const rawScore = 0.50 * beatScore + 0.35 * spreadScore + 0.15 * upScore;
    const score = Math.min(Math.max(Math.round(rawScore), 5), 100);

    const tier = getScoreTier(score);

    return {
      score,
      label: tier.label,
      badgeColor: tier.badgeClass,
      dot: tier.dot,
      tierKey: tier.key,
      outperformance,
      beatRate,
      avgAssetDrop,
      avgBenchDrop,
      marketDownDays: downBenchmarkDays.length,
      beatCount,
      upCount,
      matchedDays,
      benchmark: benchmarkLabel,
      interpretation: getInterpretation(score, '', benchmarkLabel)
    };
  }

  /**
   * Filtra itens da tabela de Força Relativa por faixa de Resiliência sem alterar RS ou ordenação.
   */
  function filterByResilienceTier(items, tierKey) {
    if (!Array.isArray(items)) return [];
    if (!tierKey || tierKey === 'all' || tierKey === 'todas') return items;

    const targetKey = String(tierKey).trim().toLowerCase();
    return items.filter(item => {
      const res = resolve(item);
      if (!res || res.score == null) return false;
      const t = getScoreTier(res.score);
      return t.key === targetKey;
    });
  }

  /**
   * Resolve ou extrai os dados de Resiliência 12M de um item de forma defensiva.
   */
  function resolve(item, fallbackBenchmark = 'IBOV') {
    if (!item) return null;
    if (item.resilience12m && typeof item.resilience12m === 'object') {
      return item.resilience12m;
    }
    const sym = item.symbol || item.ticker;
    if (sym && typeof globalThis !== 'undefined' && globalThis.__marketResilience12mCache && globalThis.__marketResilience12mCache[sym]) {
      return globalThis.__marketResilience12mCache[sym];
    }
    if (typeof item.resilienceScore === 'number') {
      const tier = getScoreTier(item.resilienceScore);
      return {
        score: item.resilienceScore,
        label: tier.label,
        badgeColor: tier.badgeClass,
        dot: tier.dot,
        outperformance: Number(item.resilienceOutperformance || 0),
        beatRate: Number(item.resilienceBeatRate || 50),
        avgAssetDrop: Number(item.resilienceAvgAssetDrop || -1.0),
        avgBenchDrop: Number(item.resilienceAvgBenchDrop || -1.5),
        marketDownDays: Number(item.resilienceMarketDownDays || 120),
        beatCount: Number(item.resilienceBeatCount || 60),
        benchmark: item.resilienceBenchmark || fallbackBenchmark,
        interpretation: getInterpretation(item.resilienceScore, sym, fallbackBenchmark)
      };
    }
    return null;
  }

  return {
    TIERS,
    TOOLTIPS,
    getScoreTier,
    formatOutperformance,
    formatPercent,
    getInterpretation,
    calculate,
    filterByResilienceTier,
    resolve
  };
}));
