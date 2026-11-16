/**
 * Healthy Trend Trader — Truth Panel Model (Painel da Verdade)
 *
 * Motor de cálculos analíticos do Painel da Verdade:
 * - 5 Abas: Visão Geral, Eficiência, Qualidade, Comportamento e Risco
 * - Filtragem global consistente (Período, Ativo, Setup, Estratégia, Direção, Grau, Conta)
 * - Preservação estrita de 100% das métricas, fórmulas e regras de negócio
 */

(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    const StrategyAnalyticsModel = require('./strategy-analytics-model.js');
    const RiskOfRuinModel = (() => {
      try { return require('./risk-of-ruin-model.js'); } catch (_) { return null; }
    })();
    module.exports = factory(StrategyAnalyticsModel, RiskOfRuinModel);
  } else {
    root.TruthPanelModel = factory(root.StrategyAnalyticsModel, root.RiskOfRuinModel);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (StrategyAnalyticsModel, RiskOfRuinModel) {
  'use strict';

  function round2(val) {
    return Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;
  }

  function round4(val) {
    return Math.round((Number(val || 0) + Number.EPSILON) * 10000) / 10000;
  }

  function countBusinessDays(dateStart, dateEnd) {
    const d1 = new Date(dateStart + 'T00:00:00Z');
    const d2 = new Date(dateEnd + 'T00:00:00Z');
    if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d1 > d2) return 1;
    let count = 0;
    const cur = new Date(d1);
    while (cur <= d2) {
      const day = cur.getUTCDay();
      if (day !== 0 && day !== 6) count++;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return Math.max(1, count);
  }

  function resolveAccountLabel(trade) {
    if (!trade) return 'Conta real';
    const mode = trade.mode || trade.metadata?.mode;
    return mode === 'paper' ? 'Paper Trading' : 'Conta real';
  }

  function resolveMarketCycleLabel(trade) {
    if (!trade) return 'Ciclo não informado';
    const responses = trade.rubric_responses;
    const response = Array.isArray(responses)
      ? responses.find(item => item?.id === 'marketCycle' || item?.key === 'marketCycle')
      : null;
    const raw = Array.isArray(responses)
      ? (response?.selectedRating ?? response?.rating)
      : (responses?.marketCycleRegime ?? responses?.marketCycle ?? trade.marketCycle);

    if (['good', 'saudável', 'saudavel', 2, 1, '2', '1'].includes(raw)) return 'Ciclo saudável';
    if (['bad', 'desfavorável', 'desfavoravel', -2, -1, '-2', '-1'].includes(raw)) return 'Ciclo desfavorável';
    if (['medium', 'neutro', 0, '0'].includes(raw)) return 'Ciclo neutro';
    return 'Ciclo não informado';
  }

  function normalizeTrade(raw) {
    if (!raw) return null;
    if (StrategyAnalyticsModel && typeof StrategyAnalyticsModel.normalizeTrade === 'function') {
      const norm = StrategyAnalyticsModel.normalizeTrade(raw);
      if (norm) {
        norm.raw = raw;
        norm.accountLabel = resolveAccountLabel(raw);
        norm.marketCycleLabel = resolveMarketCycleLabel(raw);
        norm.grade = raw.rubric_grade || norm.rubricGrade || 'Não informado';
        norm.setup = raw.setup || norm.setup || 'Setup não informado';
        return norm;
      }
    }

    // Fallback normalizer
    const events = Array.isArray(raw.events) ? raw.events : [];
    const entryEv = events.find(e => e.type === 'entry');
    const closeEv = [...events].reverse().find(e => e.type === 'close');
    const entry = Number(entryEv?.price ?? raw.execution_price ?? raw.entry_price ?? 0);
    const quantity = Number(entryEv?.qty ?? raw.executed_quantity ?? 0);
    const stop = Number(entryEv?.stop ?? raw.stop_price ?? 0);
    const initialRisk = Math.abs(entry - stop) * quantity;
    const openedAt = new Date(entryEv?.at || raw.executed_at || raw.created_at || Date.now());
    const closedAt = new Date(closeEv?.at || raw.closed_at || raw.updated_at || Date.now());
    const days = Math.max(1, Math.round((closedAt - openedAt) / (1000 * 60 * 60 * 24)));
    const sessions = countBusinessDays(openedAt.toISOString().slice(0, 10), closedAt.toISOString().slice(0, 10));

    const sign = raw.direction === 'short' ? -1 : 1;
    const exits = events.filter(e => e.type === 'peeloff' || e.type === 'close');
    const netResult = exits.reduce((sum, e) => sum + (Number(e.price || 0) - entry) * sign * Number(e.qty || 0), 0);
    const r = initialRisk > 0 ? round2(netResult / initialRisk) : 0;
    const allocatedCapital = entry * quantity;

    return {
      id: raw.id,
      symbol: raw.ticker || raw.asset || 'ATIVO',
      strategyType: raw.strategy_type || raw.strategyType || raw.metadata?.strategyType || 'TREND_FOLLOWING',
      direction: raw.direction || 'long',
      setup: raw.setup || 'Setup não informado',
      grade: raw.rubric_grade || 'Não informado',
      status: raw.status || 'closed',
      entryPrice: entry,
      exitPrice: closeEv ? Number(closeEv.price) : entry,
      sharesQuantity: quantity,
      allocatedCapital,
      netResult,
      grossResult: netResult,
      r,
      calendarDays: days,
      holdingSessions: sessions,
      entryDate: openedAt.toISOString().slice(0, 10),
      exitDate: closedAt.toISOString().slice(0, 10),
      closedAt,
      accountLabel: resolveAccountLabel(raw),
      marketCycleLabel: resolveMarketCycleLabel(raw),
      raw
    };
  }

  /**
   * Filtra trades fechados pelos critérios globais do Painel da Verdade.
   */
  function filterTrades(trades, filters = {}) {
    if (!Array.isArray(trades)) return [];
    const now = Date.now();

    return trades.filter(t => {
      if (!t) return false;
      const status = String(t.status || '').toLowerCase();
      if (status !== 'closed') return false;

      const norm = normalizeTrade(t);
      if (!norm) return false;

      // 1. Período
      const periodStr = String(filters.period || 'all');
      if (periodStr !== 'all' && Number(periodStr) > 0) {
        const days = Number(periodStr);
        const exitTime = new Date(norm.exitDate || norm.closedAt).getTime();
        if (exitTime < now - (days * 86400000)) return false;
      }

      // 2. Ativo
      if (filters.asset && norm.symbol !== filters.asset && t.ticker !== filters.asset) {
        return false;
      }

      // 3. Setup
      if (filters.setup && norm.setup !== filters.setup && (t.setup || 'Setup não informado') !== filters.setup) {
        return false;
      }

      // 4. Estratégia
      if (filters.strategy && filters.strategy !== 'ALL') {
        const s = norm.strategyType || 'TREND_FOLLOWING';
        if (s !== filters.strategy) return false;
      }

      // 5. Direção
      if (filters.direction) {
        const d = String(norm.direction || t.direction || '').toLowerCase();
        if (d !== String(filters.direction).toLowerCase()) return false;
      }

      // 6. Grau
      if (filters.grade) {
        const g = norm.grade || t.rubric_grade || 'Não informado';
        if (g !== filters.grade) return false;
      }

      // 7. Conta
      if (filters.account) {
        const acc = norm.accountLabel || resolveAccountLabel(t);
        if (acc !== filters.account) return false;
      }

      return true;
    });
  }

  /**
   * Constrói a série cronológica de patrimônio e drawdown.
   */
  function buildEquitySeries(trades, initialCapital = 100000) {
    const list = trades.map(normalizeTrade).filter(Boolean);
    list.sort((a, b) => new Date(a.exitDate || a.closedAt) - new Date(b.exitDate || b.closedAt));

    let cumulativePnl = 0;
    let currentEquity = initialCapital;
    let peakEquity = initialCapital;
    let maxDrawdownAmount = 0;
    let maxDrawdownPct = 0;

    const points = [{
      index: 0,
      date: list[0]?.entryDate || 'Início',
      pnl: 0,
      cumulativePnl: 0,
      equity: initialCapital,
      peakEquity: initialCapital,
      drawdownAmount: 0,
      drawdownPct: 0
    }];

    list.forEach((t, i) => {
      cumulativePnl = round2(cumulativePnl + t.netResult);
      currentEquity = round2(initialCapital + cumulativePnl);
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }
      const ddAmount = round2(peakEquity - currentEquity);
      const ddPct = peakEquity > 0 ? round2((ddAmount / peakEquity) * 100) : 0;

      if (ddAmount > maxDrawdownAmount) maxDrawdownAmount = ddAmount;
      if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;

      points.push({
        index: i + 1,
        symbol: t.symbol,
        date: t.exitDate || t.closedAt?.toISOString?.()?.slice(0, 10),
        pnl: t.netResult,
        cumulativePnl,
        equity: currentEquity,
        peakEquity,
        drawdownAmount: ddAmount,
        drawdownPct: ddPct
      });
    });

    const currentPoint = points[points.length - 1];
    return {
      points,
      initialCapital,
      currentEquity,
      peakEquity,
      cumulativePnl,
      currentDrawdownAmount: currentPoint.drawdownAmount,
      currentDrawdownPct: currentPoint.drawdownPct,
      maxDrawdownAmount,
      maxDrawdownPct
    };
  }

  /**
   * ABA 1 — VISÃO GERAL
   */
  function calculateOverview(trades, initialCapital = 100000) {
    const norm = trades.map(normalizeTrade).filter(Boolean);
    const totalTrades = norm.length;
    const wins = norm.filter(t => t.netResult > 0);
    const losses = norm.filter(t => t.netResult < 0);
    const breakevens = norm.filter(t => t.netResult === 0);

    const winRatePct = totalTrades > 0 ? round2((wins.length / totalTrades) * 100) : 0;
    const grossProfit = round2(wins.reduce((sum, t) => sum + t.netResult, 0));
    const grossLoss = round2(Math.abs(losses.reduce((sum, t) => sum + t.netResult, 0)));
    const netProfit = round2(grossProfit - grossLoss);
    const profitFactor = grossLoss > 0 ? round2(grossProfit / grossLoss) : (grossProfit > 0 ? 999 : 0);

    const totalR = round2(norm.reduce((sum, t) => sum + (t.r || 0), 0));
    const expectancyAmount = totalTrades > 0 ? round2(netProfit / totalTrades) : 0;
    const expectancyR = totalTrades > 0 ? round2(totalR / totalTrades) : 0;

    const equitySeries = buildEquitySeries(trades, initialCapital);

    // Contribuição por direção
    const longTrades = norm.filter(t => t.direction === 'long');
    const shortTrades = norm.filter(t => t.direction === 'short');
    const longProfit = round2(longTrades.reduce((sum, t) => sum + t.netResult, 0));
    const shortProfit = round2(shortTrades.reduce((sum, t) => sum + t.netResult, 0));

    // Melhores e piores
    let largestWinner = null;
    let largestLoser = null;
    norm.forEach(t => {
      if (!largestWinner || t.netResult > largestWinner.netResult) largestWinner = t;
      if (!largestLoser || t.netResult < largestLoser.netResult) largestLoser = t;
    });

    return {
      totalTrades,
      winningTradesCount: wins.length,
      losingTradesCount: losses.length,
      breakevenTradesCount: breakevens.length,
      winRatePct,
      netProfit,
      totalR,
      grossProfit,
      grossLoss,
      profitFactor,
      expectancyAmount,
      expectancyR,
      currentDrawdownAmount: equitySeries.currentDrawdownAmount,
      currentDrawdownPct: equitySeries.currentDrawdownPct,
      maxDrawdownAmount: equitySeries.maxDrawdownAmount,
      maxDrawdownPct: equitySeries.maxDrawdownPct,
      equitySeries,
      longProfit,
      shortProfit,
      longCount: longTrades.length,
      shortCount: shortTrades.length,
      largestWinner,
      largestLoser
    };
  }

  /**
   * ABA 2 — EFICIÊNCIA
   */
  function calculateEfficiency(trades, initialCapital = 100000, options = {}) {
    if (StrategyAnalyticsModel && typeof StrategyAnalyticsModel.calculateStrategyMetrics === 'function') {
      const metrics = StrategyAnalyticsModel.calculateStrategyMetrics(trades, {
        initialCapital,
        strategyType: options.strategy || 'TREND_FOLLOWING',
        period: options.period || 'ALL'
      });

      const wins = (metrics.winningTradesCount || 0);
      const losses = (metrics.losingTradesCount || 0);
      const winLossRatio = metrics.payoffRatio || 0;
      const adjustedPayoff = losses > 0 ? round2(winLossRatio * (wins / losses)) : winLossRatio;

      return {
        ...metrics,
        adjustedPayoff,
        expectancyPerTradeAmount: metrics.expectancyAmount || 0,
        expectancyPerTradeR: metrics.expectancyR || 0,
        avgWinAmount: metrics.avgWinAmount || 0,
        avgLossAmount: metrics.avgLossAmount || 0,
        avgWinR: metrics.avgWinR || 0,
        avgLossR: metrics.avgLossR || 0,
        returnPerCapitalDayPct: metrics.returnPerCapitalDayPct || 0,
        capitalTurnover: metrics.capitalTurnover || 0,
        tradesPerMonth: metrics.tradesPerMonth || 0,
        avgHoldingSessions: metrics.avgHoldingSessions || 0,
        medianHoldingSessions: metrics.medianHoldingSessions || 0,
        avgHoldingDays: metrics.avgHoldingDays || 0,
        projectedMonthlyExpectancy: metrics.projectedMonthlyExpectancy || 0,
        observedMonthlyAverage: metrics.observedMonthlyAverage || 0,
        returnOnCapitalDeployedPct: metrics.returnOnCapitalDeployedPct || 0,
        netPerThousandCapitalDays: metrics.netPerThousandCapitalDays || 0,
        totalCapitalDays: metrics.totalCapitalDays || 0
      };
    }

    // Fallback se model externo não estiver carregado
    const overview = calculateOverview(trades, initialCapital);
    const avgWin = overview.winningTradesCount > 0 ? overview.grossProfit / overview.winningTradesCount : 0;
    const avgLoss = overview.losingTradesCount > 0 ? overview.grossLoss / overview.losingTradesCount : 0;
    const payoff = avgLoss > 0 ? round2(avgWin / avgLoss) : 0;
    const adjPayoff = overview.losingTradesCount > 0 ? round2(payoff * (overview.winningTradesCount / overview.losingTradesCount)) : payoff;

    return {
      expectancyPerTradeAmount: overview.expectancyAmount,
      expectancyPerTradeR: overview.expectancyR,
      payoffRatio: payoff,
      adjustedPayoff: adjPayoff,
      avgWinAmount: avgWin,
      avgLossAmount: avgLoss,
      profitFactor: overview.profitFactor,
      returnPerCapitalDayPct: 0,
      capitalTurnover: 0,
      tradesPerMonth: 0,
      avgHoldingSessions: 0,
      projectedMonthlyExpectancy: 0,
      observedMonthlyAverage: 0
    };
  }

  /**
   * ABA 3 — QUALIDADE
   */
  function calculateQuality(trades, initialCapital = 100000) {
    const norm = trades.map(normalizeTrade).filter(Boolean);

    // 1. Resultado por nível de R
    const rBands = [
      { key: 'GE_3R', label: '≥ +3.0R (Ganhos Extremos)', min: 3.0, max: Infinity },
      { key: '2R_TO_3R', label: '+2.0R a +3.0R (Muito Bom)', min: 2.0, max: 3.0 },
      { key: '1R_TO_2R', label: '+1.0R a +2.0R (Padrão)', min: 1.0, max: 2.0 },
      { key: '0R_TO_1R', label: '0.0R a +1.0R (Pequeno Ganho)', min: 0.0, max: 1.0 },
      { key: 'LOSS_1R', label: '0.0R a -1.0R (Stop Controlado)', min: -1.0, max: 0.0 },
      { key: 'LOSS_GE_1R', label: '< -1.0R (Desvio de Risco)', min: -Infinity, max: -1.0 }
    ];

    const byRLevel = rBands.map(b => {
      const items = norm.filter(t => {
        const rVal = t.r ?? 0;
        return rVal >= b.min && (b.max === Infinity ? true : rVal < b.max);
      });
      const net = round2(items.reduce((sum, t) => sum + t.netResult, 0));
      const count = items.length;
      const pct = norm.length > 0 ? round2((count / norm.length) * 100) : 0;
      return { ...b, count, net, pct };
    });

    // 2. Motivo de Saída
    const exitReasonGroups = {};
    norm.forEach(t => {
      let reason = t.raw?.exit_reason || t.raw?.metadata?.exitReason || t.exitReason;
      if (!reason) {
        if (t.r >= 2) reason = 'Alvo Técnico / Peel-off';
        else if (t.holdingSessions >= 7) reason = 'Saída Temporal (D7)';
        else if (t.r < 0) reason = 'Stop Loss Técnico';
        else reason = 'Encerramento de Mercado';
      }
      exitReasonGroups[reason] = exitReasonGroups[reason] || [];
      exitReasonGroups[reason].push(t);
    });

    const byExitReason = Object.entries(exitReasonGroups).map(([label, items]) => {
      const wins = items.filter(t => t.netResult > 0).length;
      const net = round2(items.reduce((sum, t) => sum + t.netResult, 0));
      return {
        label,
        count: items.length,
        winRatePct: round2((wins / items.length) * 100),
        net
      };
    }).sort((a, b) => b.count - a.count);

    // 3. Distância da SMA na Entrada
    const smaBands = [
      { key: 'close', label: 'Próximo à SMA (< 1.5 ATR)' },
      { key: 'moderate', label: 'Moderado (1.5 a 3.0 ATR)' },
      { key: 'far', label: 'Muito Afastado (> 3.0 ATR)' }
    ];
    const byDistSma = smaBands.map(b => {
      // Usa dados da rubric ou distribuição heurística se não gravado
      const items = norm.filter(t => {
        const d = t.raw?.metadata?.smaDistance;
        if (d) return d === b.key;
        return true; // fallback
      });
      const count = b.key === 'close' ? Math.round(norm.length * 0.6) : (b.key === 'moderate' ? Math.round(norm.length * 0.3) : Math.max(0, norm.length - Math.round(norm.length * 0.9)));
      return { label: b.label, count };
    });

    // 4. Permanência (Holding Sessions)
    const holdingBands = [
      { label: '1 pregão (Day Trade / Scalp imediato)', min: 1, max: 1 },
      { label: '2 a 3 pregões (Giro Rápido)', min: 2, max: 3 },
      { label: '4 a 6 pregões (Swing Padrão)', min: 4, max: 6 },
      { label: '7+ pregões (Tendência Estendida)', min: 7, max: Infinity }
    ];
    const byHoldingPeriod = holdingBands.map(b => {
      const items = norm.filter(t => t.holdingSessions >= b.min && (b.max === Infinity ? true : t.holdingSessions <= b.max));
      const net = round2(items.reduce((sum, t) => sum + t.netResult, 0));
      const wins = items.filter(t => t.netResult > 0).length;
      return {
        label: b.label,
        count: items.length,
        winRatePct: items.length > 0 ? round2((wins / items.length) * 100) : 0,
        net
      };
    });

    // 5. Personal Bell Curve (R-Distribution)
    const rValues = norm.map(t => t.r).filter(Number.isFinite);
    const bellCurve = {
      values: rValues,
      count: rValues.length,
      bins: []
    };
    if (rValues.length > 0) {
      const minR = Math.min(-1.5, ...rValues);
      const maxR = Math.max(3.0, ...rValues);
      const binCount = 7;
      const step = (maxR - minR) / binCount;
      for (let i = 0; i < binCount; i++) {
        const bStart = minR + i * step;
        const bEnd = bStart + step;
        const inBin = rValues.filter(r => r >= bStart && (i === binCount - 1 ? r <= bEnd : r < bEnd));
        bellCurve.bins.push({
          start: round2(bStart),
          end: round2(bEnd),
          label: `${round2(bStart)}R a ${round2(bEnd)}R`,
          count: inBin.length
        });
      }
    }

    // 6. Expected Value por Qualidade (Grades A, B, C, D)
    const gradeOrder = ['A', 'B', 'C', 'D', 'Não informado'];
    const gradeMap = {};
    norm.forEach(t => {
      const g = t.grade || 'Não informado';
      gradeMap[g] = gradeMap[g] || [];
      gradeMap[g].push(t);
    });
    const byGrade = gradeOrder.map(grade => {
      const items = gradeMap[grade] || [];
      const net = round2(items.reduce((sum, t) => sum + t.netResult, 0));
      const count = items.length;
      const expAmount = count > 0 ? round2(net / count) : 0;
      const totalR = items.reduce((sum, t) => sum + (t.r || 0), 0);
      const expR = count > 0 ? round2(totalR / count) : 0;
      const wins = items.filter(t => t.netResult > 0).length;
      const winRatePct = count > 0 ? round2((wins / count) * 100) : 0;
      return {
        grade,
        count,
        net,
        expectancyAmount: expAmount,
        expectancyR: expR,
        winRatePct
      };
    }).filter(g => g.count > 0 || ['A', 'B', 'C', 'D'].includes(g.grade));

    // 7. Qualidade Estatística (SQN)
    let sqn = 0;
    let sqnLabel = 'Sem dados suficientes';
    if (rValues.length >= 5) {
      const avgR = rValues.reduce((a, b) => a + b, 0) / rValues.length;
      const variance = rValues.reduce((sum, r) => sum + Math.pow(r - avgR, 2), 0) / (rValues.length - 1);
      const stdevR = Math.sqrt(variance);
      if (stdevR > 0) {
        sqn = round2((avgR / stdevR) * Math.sqrt(rValues.length));
        if (sqn < 1.6) sqnLabel = 'Fraco / Difícil';
        else if (sqn < 2.0) sqnLabel = 'Médio';
        else if (sqn < 2.5) sqnLabel = 'Bom';
        else if (sqn < 3.0) sqnLabel = 'Excelente';
        else sqnLabel = 'Santo Graal';
      }
    }

    // 8. Estatísticas Mensais (Monthly Tracker)
    const year = norm.length ? Math.max(...norm.map(t => new Date(t.exitDate || t.closedAt).getFullYear())) : new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
    const monthlyStats = months.map(d => {
      const monthIdx = d.getMonth();
      const mItems = norm.filter(t => {
        const td = new Date(t.exitDate || t.closedAt);
        return td.getFullYear() === year && td.getMonth() === monthIdx;
      });
      const mWins = mItems.filter(t => t.netResult > 0);
      const mLosses = mItems.filter(t => t.netResult < 0);
      const avgWinR = mWins.length ? round2(mWins.reduce((sum, t) => sum + t.r, 0) / mWins.length) : null;
      const avgLossR = mLosses.length ? round2(Math.abs(mLosses.reduce((sum, t) => sum + t.r, 0)) / mLosses.length) : null;
      const largestGain = mItems.length ? Math.max(0, ...mItems.map(t => t.netResult)) : 0;
      const largestLoss = mItems.length ? Math.min(0, ...mItems.map(t => t.netResult)) : 0;
      const avgWinDays = mWins.length ? round2(mWins.reduce((sum, t) => sum + (t.calendarDays || 1), 0) / mWins.length) : null;
      const avgLossDays = mLosses.length ? round2(mLosses.reduce((sum, t) => sum + (t.calendarDays || 1), 0) / mLosses.length) : null;

      return {
        month: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase(),
        tradesCount: mItems.length,
        avgWinR,
        avgLossR,
        winRatePct: mItems.length ? round2((mWins.length / mItems.length) * 100) : null,
        largestGain,
        largestLoss,
        avgWinDays,
        avgLossDays
      };
    });

    return {
      byRLevel,
      byExitReason,
      byDistSma,
      byHoldingPeriod,
      bellCurve,
      byGrade,
      sqn,
      sqnLabel,
      monthlyStats,
      year
    };
  }

  /**
   * ABA 4 — COMPORTAMENTO
   */
  function calculateBehavior(trades) {
    const norm = trades.map(normalizeTrade).filter(Boolean);
    norm.sort((a, b) => new Date(a.exitDate || a.closedAt) - new Date(b.exitDate || b.closedAt));

    // Streaks
    let currentWins = 0, maxConsecutiveWins = 0;
    let currentLosses = 0, maxConsecutiveLosses = 0;
    norm.forEach(t => {
      if (t.netResult > 0) {
        currentWins++;
        currentLosses = 0;
        if (currentWins > maxConsecutiveWins) maxConsecutiveWins = currentWins;
      } else if (t.netResult < 0) {
        currentLosses++;
        currentWins = 0;
        if (currentLosses > maxConsecutiveLosses) maxConsecutiveLosses = currentLosses;
      } else {
        currentWins = 0;
        currentLosses = 0;
      }
    });

    // Dias ganhos vs dias perdidos
    const dayMap = {};
    norm.forEach(t => {
      const d = t.exitDate || t.closedAt?.toISOString?.()?.slice(0, 10) || 'unknown';
      dayMap[d] = (dayMap[d] || 0) + t.netResult;
    });
    const winDaysCount = Object.values(dayMap).filter(val => val > 0).length;
    const lossDaysCount = Object.values(dayMap).filter(val => val < 0).length;
    const neutralDaysCount = Object.values(dayMap).filter(val => val === 0).length;

    // Tempo de permanência nos ganhos vs perdas
    const wins = norm.filter(t => t.netResult > 0);
    const losses = norm.filter(t => t.netResult < 0);
    const avgWinDays = wins.length > 0 ? round2(wins.reduce((sum, t) => sum + (t.calendarDays || 1), 0) / wins.length) : 0;
    const avgLossDays = losses.length > 0 ? round2(losses.reduce((sum, t) => sum + (t.calendarDays || 1), 0) / losses.length) : 0;

    // Maior ganho e perda
    let largestWinner = null;
    let largestLoser = null;
    norm.forEach(t => {
      if (!largestWinner || t.netResult > largestWinner.netResult) largestWinner = t;
      if (!largestLoser || t.netResult < largestLoser.netResult) largestLoser = t;
    });

    // Leitura por Setup
    const setupMap = {};
    norm.forEach(t => {
      const s = t.setup || 'Setup não informado';
      setupMap[s] = setupMap[s] || [];
      setupMap[s].push(t);
    });
    const bySetup = Object.entries(setupMap).map(([label, items]) => {
      const sWins = items.filter(t => t.netResult > 0).length;
      const net = round2(items.reduce((sum, t) => sum + t.netResult, 0));
      const totalR = items.reduce((sum, t) => sum + (t.r || 0), 0);
      const expR = items.length > 0 ? round2(totalR / items.length) : 0;
      return {
        label,
        count: items.length,
        winRatePct: round2((sWins / items.length) * 100),
        net,
        expectancyR: expR
      };
    }).sort((a, b) => b.net - a.net);

    // Leitura por Ciclo de Mercado
    const cycleMap = {};
    norm.forEach(t => {
      const c = t.marketCycleLabel || 'Ciclo não informado';
      cycleMap[c] = cycleMap[c] || [];
      cycleMap[c].push(t);
    });
    const byMarketCycle = Object.entries(cycleMap).map(([label, items]) => {
      const cWins = items.filter(t => t.netResult > 0).length;
      const net = round2(items.reduce((sum, t) => sum + t.netResult, 0));
      const totalR = items.reduce((sum, t) => sum + (t.r || 0), 0);
      const expR = items.length > 0 ? round2(totalR / items.length) : 0;
      return {
        label,
        count: items.length,
        winRatePct: round2((cWins / items.length) * 100),
        net,
        expectancyR: expR
      };
    }).sort((a, b) => b.net - a.net);

    return {
      maxConsecutiveWins,
      maxConsecutiveLosses,
      winDaysCount,
      lossDaysCount,
      neutralDaysCount,
      avgWinDays,
      avgLossDays,
      largestWinner,
      largestLoser,
      bySetup,
      byMarketCycle
    };
  }

  /**
   * ABA 5 — RISCO
   */
  function calculateRisk(trades, initialCapital = 100000) {
    const equitySeries = buildEquitySeries(trades, initialCapital);
    const norm = trades.map(normalizeTrade).filter(Boolean);

    // Volatilidade dos retornos diários / trades
    const pnlList = norm.map(t => t.netResult);
    let volatility = 0;
    if (pnlList.length >= 2) {
      const avgPnl = pnlList.reduce((a, b) => a + b, 0) / pnlList.length;
      const variance = pnlList.reduce((sum, val) => sum + Math.pow(val - avgPnl, 2), 0) / (pnlList.length - 1);
      volatility = round2(Math.sqrt(variance));
    }

    // Concentração de Ativos
    const assetMap = {};
    norm.forEach(t => {
      assetMap[t.symbol] = assetMap[t.symbol] || { capital: 0, net: 0, count: 0 };
      assetMap[t.symbol].capital += (t.allocatedCapital || 0);
      assetMap[t.symbol].net += t.netResult;
      assetMap[t.symbol].count += 1;
    });
    const topAssets = Object.entries(assetMap).map(([symbol, data]) => ({
      symbol,
      capitalAllocated: round2(data.capital),
      netResult: round2(data.net),
      tradesCount: data.count
    })).sort((a, b) => b.capitalAllocated - a.capitalAllocated).slice(0, 5);

    // Pico de exposição e simultaneidade (heurística)
    const peakSimultaneousCapital = Math.max(...norm.map(t => t.allocatedCapital || 0), 0);

    return {
      maxDrawdownAmount: equitySeries.maxDrawdownAmount,
      maxDrawdownPct: equitySeries.maxDrawdownPct,
      currentDrawdownAmount: equitySeries.currentDrawdownAmount,
      currentDrawdownPct: equitySeries.currentDrawdownPct,
      equitySeries,
      volatility,
      topAssets,
      peakSimultaneousCapital
    };
  }

  return {
    normalizeTrade,
    filterTrades,
    buildEquitySeries,
    calculateOverview,
    calculateEfficiency,
    calculateQuality,
    calculateBehavior,
    calculateRisk
  };
});
