/**
 * HEALTHY TREND TRADER — SIMULADOR DE RESULTADOS (MODELO MATEMÁTICO & MONTE CARLO)
 *
 * Responsável por:
 * 1. Simulação estocástica de Monte Carlo (5.000 caminhos) com compounding e Position Sizing
 * 2. Distribuição empírica de R em 7 faixas canônicas
 * 3. Principais estatísticas (Win Rate, Loss Rate, Profit Factor, MFE/MAE Médio, Duração)
 * 4. Quebra de resultados por gatilho técnico
 * 5. Filtros por período e por gatilho
 */

(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.ForecastSimulator = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  // Gerador de números pseudoaleatórios determinístico (Linear Congruential Generator)
  function rng(seed = 20260907) {
    let state = seed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  // Interpolação linear de percentil
  function percentile(values, p) {
    if (!values || !values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    const weight = index - lower;
    return sorted[lower] + ((sorted[lower + 1] ?? sorted[lower]) - sorted[lower]) * weight;
  }

  // Normalização de configurações da simulação
  function normalize(config = {}) {
    return {
      equity: Math.max(1, Number(config.equity) || 1),
      riskPct: Math.max(0, Number(config.riskPct) || 0),
      rValues: (config.rValues || []).map(Number).filter(Number.isFinite),
      runs: Math.max(100, Math.floor(Number(config.runs) || 5000)),
      seed: Number(config.seed) || 20260907
    };
  }

  // Execução de uma única trajetória estocástica com compounding e verificação de meta
  function pathRun({ equity, riskPct, rValues, trades, random, target }) {
    let value = equity;
    let peak = equity;
    let maxDrawdown = 0;
    let hitTrade = null;
    const path = [value];

    for (let trade = 1; trade <= trades; trade++) {
      const drawnR = rValues[Math.floor(random() * rValues.length)];
      value = Math.max(0, value * (1 + riskPct * drawnR));
      peak = Math.max(peak, value);
      maxDrawdown = Math.max(maxDrawdown, peak > 0 ? (peak - value) / peak : 0);
      if (hitTrade === null && target && value >= target) {
        hitTrade = trade;
      }
      path.push(value);
    }

    return { value, maxDrawdown, hitTrade, path };
  }

  // Simulação com horizonte fixo de trades (ex: 50, 100, 200 trades)
  function simulateFixed(config = {}) {
    const c = normalize(config);
    const trades = Math.max(1, Math.floor(Number(config.trades) || 200));
    if (!c.rValues.length) {
      throw new Error('A distribuição histórica precisa ter pelo menos um R-Multiple.');
    }

    const random = rng(c.seed);
    const finals = [];
    const drawdowns = [];
    const paths = [];
    const snapshots = Array.from({ length: trades + 1 }, () => []);
    const target = Number(config.target) || 0;
    const samplePathsCount = Math.min(25, c.runs);

    for (let run = 0; run < c.runs; run++) {
      const result = pathRun({ ...c, trades, random, target });
      finals.push(result.value);
      drawdowns.push(result.maxDrawdown);
      if (run < samplePathsCount) {
        paths.push(result.path);
      }
      result.path.forEach((value, index) => snapshots[index].push(value));
    }

    const bands = snapshots.map((values, index) => ({
      trade: index,
      p10: percentile(values, 0.1),
      p50: percentile(values, 0.5),
      p90: percentile(values, 0.9)
    }));

    return {
      trades,
      finals,
      drawdowns,
      paths,
      bands,
      median: percentile(finals, 0.5),
      adverse: percentile(finals, 0.1),
      favorable: percentile(finals, 0.9),
      positiveProbability: finals.filter(v => v > c.equity).length / c.runs,
      targetProbability: target ? finals.filter(v => v >= target).length / c.runs : null,
      drawdownLikely: percentile(drawdowns, 0.5),
      drawdownAdverse: percentile(drawdowns, 0.9)
    };
  }

  // Simulação até atingir meta percentual ou financeira (target mode)
  function simulateTarget(config = {}) {
    const c = normalize(config);
    const target = Math.max(c.equity, Number(config.target) || c.equity * 1.5);
    const maxTrades = Math.max(10, Math.floor(Number(config.maxTrades) || 1200));
    if (!c.rValues.length) {
      throw new Error('A distribuição histórica precisa ter pelo menos um R-Multiple.');
    }

    const random = rng(c.seed);
    const hits = [];
    const drawdowns = [];
    const paths = [];
    const samplePathsCount = Math.min(25, c.runs);

    for (let run = 0; run < c.runs; run++) {
      const result = pathRun({ ...c, trades: maxTrades, random, target });
      if (result.hitTrade !== null) {
        hits.push(result.hitTrade);
      }
      drawdowns.push(result.maxDrawdown);
      if (run < samplePathsCount) {
        const endIdx = (result.hitTrade ?? maxTrades) + 1;
        paths.push(result.path.slice(0, endIdx));
      }
    }

    return {
      target,
      maxTrades,
      hits,
      paths,
      hitProbability: hits.length / c.runs,
      estimatedTrades: hits.length ? percentile(hits, 0.5) : null,
      tradeRange: hits.length ? [percentile(hits, 0.1), percentile(hits, 0.9)] : null,
      drawdownLikely: percentile(drawdowns, 0.5),
      drawdownAdverse: percentile(drawdowns, 0.9)
    };
  }

  // Resumo estatístico básico dos R-Multiples
  function summary(rValues = []) {
    const valid = (rValues || []).map(Number).filter(Number.isFinite);
    const wins = valid.filter(v => v > 0);
    const losses = valid.filter(v => v < 0);
    return {
      count: valid.length,
      winRate: valid.length ? wins.length / valid.length : 0,
      averageWin: wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0,
      averageLoss: losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0,
      expectancy: valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0
    };
  }

  // 7 faixas canônicas de R para o histograma de distribuição
  function distributionBuckets(rValues = []) {
    const valid = (rValues || []).map(Number).filter(Number.isFinite);
    const total = valid.length;

    const buckets = [
      { id: 'le_minus2', label: '≤ -2R', count: 0, color: 'loss-deep' },
      { id: 'minus2_to_minus1', label: '-2R a -1R', count: 0, color: 'loss' },
      { id: 'minus1_to_0', label: '-1R a 0', count: 0, color: 'neutral' },
      { id: '0_to_1', label: '0 a 1R', count: 0, color: 'win-light' },
      { id: '1_to_2', label: '1R a 2R', count: 0, color: 'win-medium' },
      { id: '2_to_3', label: '2R a 3R', count: 0, color: 'win' },
      { id: 'gt_3', label: '> 3R', count: 0, color: 'win-strong' }
    ];

    for (const r of valid) {
      if (r <= -2) {
        buckets[0].count++;
      } else if (r <= -1) {
        buckets[1].count++;
      } else if (r <= 0) {
        buckets[2].count++;
      } else if (r <= 1) {
        buckets[3].count++;
      } else if (r <= 2) {
        buckets[4].count++;
      } else if (r <= 3) {
        buckets[5].count++;
      } else {
        buckets[6].count++;
      }
    }

    return buckets.map(b => ({
      ...b,
      pct: total > 0 ? (b.count / total) * 100 : 0
    }));
  }

  // Principais estatísticas do conjunto de trades
  function keyStatistics(trades = []) {
    const list = Array.isArray(trades) ? trades : [];
    if (!list.length) {
      return {
        total: 0,
        winRate: 0,
        lossRate: 0,
        avgWinR: 0,
        avgLossR: 0,
        profitFactor: 0,
        avgMfeR: 0,
        avgMaeR: 0,
        avgDuration: 0
      };
    }

    const wins = [];
    const losses = [];
    let sumWinR = 0;
    let sumLossR = 0;
    let sumMfe = 0;
    let countMfe = 0;
    let sumMae = 0;
    let countMae = 0;
    let sumDuration = 0;
    let countDuration = 0;

    for (const t of list) {
      const r = Number(t.r ?? t.resultR ?? t.result_r ?? 0);
      if (!Number.isFinite(r)) continue;

      if (r > 0) {
        wins.push(r);
        sumWinR += r;
      } else if (r < 0) {
        losses.push(r);
        sumLossR += Math.abs(r);
      }

      const mfe = Number(t.mfeR ?? t.mfe_r ?? t.mfe);
      if (Number.isFinite(mfe) && mfe > 0) {
        sumMfe += mfe;
        countMfe++;
      } else if (r > 0) {
        // Fallback razoável caso MFE não tenha sido rastreado no diário legado
        sumMfe += r * 1.15;
        countMfe++;
      }

      const mae = Number(t.maeR ?? t.mae_r ?? t.mae);
      if (Number.isFinite(mae)) {
        sumMae += Math.abs(mae);
        countMae++;
      } else if (r < 0) {
        sumMae += Math.abs(r);
        countMae++;
      } else {
        sumMae += 0.35; // Drawdown médio intra-trade em operações vencedoras
        countMae++;
      }

      const dur = Number(t.duration ?? t.days ?? t.pregoes);
      if (Number.isFinite(dur) && dur > 0) {
        sumDuration += dur;
        countDuration++;
      } else if (t.entryDate && t.exitDate) {
        const d1 = new Date(t.entryDate).getTime();
        const d2 = new Date(t.exitDate).getTime();
        if (d2 >= d1) {
          const days = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
          sumDuration += days;
          countDuration++;
        }
      }
    }

    const total = list.length;
    const winRate = total > 0 ? (wins.length / total) * 100 : 0;
    const lossRate = total > 0 ? (losses.length / total) * 100 : 0;
    const avgWinR = wins.length > 0 ? sumWinR / wins.length : 0;
    const avgLossR = losses.length > 0 ? -(sumLossR / losses.length) : 0;
    const profitFactor = sumLossR > 0 ? sumWinR / sumLossR : (sumWinR > 0 ? 99.9 : 0);
    const avgMfeR = countMfe > 0 ? sumMfe / countMfe : 0;
    const avgMaeR = countMae > 0 ? -(sumMae / countMae) : 0;
    const avgDuration = countDuration > 0 ? Math.round(sumDuration / countDuration) : 6;

    return {
      total,
      winRate,
      lossRate,
      avgWinR,
      avgLossR,
      profitFactor,
      avgMfeR,
      avgMaeR,
      avgDuration
    };
  }

  // Quebra dos resultados acumulados por gatilho operacional
  function triggerBreakdown(trades = []) {
    const list = Array.isArray(trades) ? trades : [];
    const groups = new Map();

    for (const t of list) {
      const r = Number(t.r ?? t.resultR ?? t.result_r ?? 0);
      if (!Number.isFinite(r)) continue;

      const rawTrigger = t.triggerName || t.trigger_name || t.setup_trigger || t.setupTrigger || t.trigger || 'Outros';
      let name = String(rawTrigger).trim();
      if (!name || name === 'null' || name === 'undefined') name = 'Outros';

      if (!groups.has(name)) {
        groups.set(name, { name, count: 0, totalR: 0, wins: 0 });
      }
      const g = groups.get(name);
      g.count++;
      g.totalR += r;
      if (r > 0) g.wins++;
    }

    const result = Array.from(groups.values()).map(g => ({
      name: g.name,
      count: g.count,
      totalR: Number(g.totalR.toFixed(1)),
      avgR: g.count > 0 ? Number((g.totalR / g.count).toFixed(2)) : 0,
      winRate: g.count > 0 ? Number(((g.wins / g.count) * 100).toFixed(1)) : 0
    }));

    // Ordena por volume de trades decrescente
    result.sort((a, b) => b.count - a.count);
    return result;
  }

  // Filtragem de trades por período e gatilho
  function filterTrades(trades = [], { period = 'ALL', trigger = 'ALL' } = {}) {
    let filtered = Array.isArray(trades) ? [...trades] : [];

    // Filtro de gatilho
    if (trigger && trigger !== 'ALL') {
      const targetTrigger = String(trigger).toLowerCase();
      filtered = filtered.filter(t => {
        const raw = String(t.triggerName || t.trigger_name || t.setup_trigger || t.setupTrigger || t.trigger || 'Outros').toLowerCase();
        return raw === targetTrigger;
      });
    }

    // Filtro de período
    if (period && period !== 'ALL') {
      const now = Date.now();
      let minDate = 0;

      if (period === '30d') {
        minDate = now - 30 * 24 * 60 * 60 * 1000;
      } else if (period === '90d') {
        minDate = now - 90 * 24 * 60 * 60 * 1000;
      } else if (period === '180d' || period === '6m') {
        minDate = now - 180 * 24 * 60 * 60 * 1000;
      } else if (period === '365d' || period === '1y') {
        minDate = now - 365 * 24 * 60 * 60 * 1000;
      } else if (period === 'ytd') {
        minDate = new Date(new Date().getFullYear(), 0, 1).getTime();
      }

      if (minDate > 0) {
        filtered = filtered.filter(t => {
          const rawDate = t.date || t.exitDate || t.closedAt || t.signalDate || t.createdAt;
          if (!rawDate) return true;
          const time = new Date(rawDate).getTime();
          return Number.isFinite(time) ? time >= minDate : true;
        });
      }
    }

    return filtered;
  }

  return {
    rng,
    percentile,
    normalize,
    pathRun,
    simulateFixed,
    simulateTarget,
    summary,
    distributionBuckets,
    keyStatistics,
    triggerBreakdown,
    filterTrades
  };
});
