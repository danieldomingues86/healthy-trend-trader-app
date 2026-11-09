/**
 * Healthy Trend Trader — Strategy Analytics Model
 *
 * Camada analítica unificada e independente para:
 * 1. Trend Following Analytics:
 *    - Métricas em R-múltiplos e financeiras, breakdowns por setup, regime, RS, grade.
 * 2. Volatility Trading Analytics:
 *    - Métricas financeiras e percentuais sobre capital alocado (sem presumir R-múltiplos).
 *    - Breakdowns por nível de IFR, distância SMA7, SMA200, ATR%, permanência, motivo de saída (SMA vs tempo).
 * 3. Consolidado de Carteira (Portfolio Consolidated Analytics):
 *    - Resultado financeiro total e contribuição de cada estratégia.
 *    - Exposição simultânea e capital comprometido dia a dia.
 *    - Curva de patrimônio combinada e Drawdown real da carteira.
 *    - Correlação de Pearson entre as séries de retorno das estratégias.
 *    - Concentração consolidada por ativo, setor e mercado.
 *    - Documentação explícita de denominadores e alertas de amostra reduzida (< 30 trades).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StrategyAnalyticsModel = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MIN_SAMPLE_SIZE = 30;

  // Glossário metodológico oficial
  const METRIC_DEFINITIONS = Object.freeze({
    winRate: {
      name: 'Taxa de Acerto (Win Rate)',
      formula: '(Trades Vencedores / Total de Trades Encerrados) × 100',
      description: 'Percentual de operações cujo resultado líquido foi positivo. Em Trend Following, valores normais giram em torno de 40% a 55%. Em Volatilidade (IFR2), o esperado gira entre 65% e 75%.'
    },
    payoffRatio: {
      name: 'Relação Payoff',
      formula: 'Ganho Médio / Perda Média',
      description: 'Mede a assimetria entre ganhos e perdas. Trend Following compensa menor taxa de acerto com alto payoff (≥ 2,0x). Volatilidade opera com alta taxa de acerto e payoff menor (~0,8x a 1,2x).'
    },
    profitFactor: {
      name: 'Fator de Lucro (Profit Factor)',
      formula: 'Lucro Bruto Total / |Perda Bruta Total|',
      description: 'Mede a rentabilidade global do sistema. Valores acima de 1,5 indicam boa solidez estatística; acima de 2,0 indicam excelente vantagem competitiva.'
    },
    expectancy: {
      name: 'Expectativa Matemática',
      formula: '(WinRate × Ganho Médio) - (LossRate × Perda Média)',
      description: 'Retorno esperado por trade ao longo de uma série de execuções. Para Trend Following, é expressa tanto em R-múltiplos (+0,30R a +0,60R) quanto em moeda. Para Volatilidade, é expressa em % sobre o capital alocado e em valor financeiro (R$).'
    },
    recoveryFactor: {
      name: 'Fator de Recuperação (Recovery Factor)',
      formula: 'Lucro Líquido Acumulado / |Drawdown Máximo em Moeda|',
      description: 'Mede a capacidade do sistema em gerar lucros acima do seu maior declínio patrimonial histórico. Valores > 3,0 indicam alta resiliência.'
    },
    portfolioDrawdown: {
      name: 'Drawdown Real da Carteira',
      formula: '((Pico de Patrimônio Combinado - Patrimônio Atual) / Pico de Patrimônio Combinado) × 100',
      description: 'Calculado sobre a série unificada de capital real da carteira. Ao invés de somar ingenuamente drawdowns isolados, reflete o benefício genuíno da descorrelação temporal entre estratégias.'
    },
    pearsonCorrelation: {
      name: 'Correlação de Retornos entre Estratégias (Pearson r)',
      formula: 'Covariância(R_trend, R_vol) / (StdDev(R_trend) × StdDev(R_vol))',
      description: 'Mede o grau de correlação entre os retornos diários de Trend Following e Volatility Trading. Valores próximos de zero ou negativos comprovam a eficácia da diversificação multi-estratégia.'
    },
    rMultipleCaveat: {
      name: 'Nota Metodológica sobre R-Múltiplos',
      formula: 'R = Lucro Líquido / Risco Inicial Nominal',
      description: 'Métricas baseadas em R são válidas exclusivamente para Trend Following, onde existe um stop técnico inicial mensurável. Para Volatilidade (IFR2), que não opera com stop inicial fixo, o retorno é calculado sobre o capital financeiro alocado na operação.'
    }
  });

  function round2(val) {
    return Number(Math.round(val + 'e2') + 'e-2');
  }

  function round4(val) {
    return Number(Math.round(val + 'e4') + 'e-4');
  }

  function toIsoDate(value) {
    if (!value) return null;
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return null;
      return value.toISOString().slice(0, 10);
    }
    const s = String(value).trim();
    if (/^\d{8}$/.test(s)) {
      return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.slice(0, 10);
    }
    return null;
  }

  function median(values) {
    if (!Array.isArray(values) || values.length === 0) return 0;
    const sorted = [...values].filter(v => Number.isFinite(v)).sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Normaliza um trade operacional para a camada analítica com identificação estrita de estratégia.
   */
  function analyzeTrade(trade) {
    if (!trade) return null;

    const rawStrat = String(trade.strategy_type || trade.strategyType || '').toUpperCase().trim();
    const strategyType = rawStrat === 'VOLATILITY_TRADING' ? 'VOLATILITY_TRADING' : 'TREND_FOLLOWING';

    const events = Array.isArray(trade.events) ? trade.events : [];
    const entryEvent = events.find(e => e.type === 'entry') || {};
    const exits = events.filter(e => e.type === 'peeloff' || e.type === 'close');
    const closeEvent = [...events].reverse().find(e => e.type === 'close') || {};

    const entryPrice = Number(entryEvent.price ?? trade.executed_entry_price ?? trade.execution_price ?? trade.entry_price ?? trade.entry ?? 0);
    const exitPrice = Number(closeEvent.price ?? trade.exit_price ?? trade.exit ?? 0);
    const sharesQuantity = Number(entryEvent.qty ?? trade.executed_quantity ?? trade.planned_quantity ?? trade.shares_quantity ?? trade.quantity ?? trade.shares ?? trade.qty ?? 0);
    const allocatedCapital = round2(entryPrice * sharesQuantity) || Number(trade.allocated_capital ?? trade.allocatedCapital ?? trade.position_size ?? 0);

    const openedAtStr = toIsoDate(entryEvent.at || trade.entry_date || trade.executed_at || trade.created_at);
    const closedAtStr = toIsoDate(closeEvent.at || trade.exit_date || trade.updated_at || trade.created_at);
    const openedAt = openedAtStr ? new Date(openedAtStr) : null;
    const closedAt = closedAtStr ? new Date(closedAtStr) : null;

    let holdingSessions = Number(trade.holding_sessions ?? trade.holdingSessions ?? 0);
    if (!holdingSessions && openedAt && closedAt && !Number.isNaN(openedAt.getTime()) && !Number.isNaN(closedAt.getTime())) {
      holdingSessions = Math.max(1, Math.round((closedAt - openedAt) / (1000 * 60 * 60 * 24)));
    }

    const direction = String(trade.direction || 'long').toLowerCase();
    const sign = direction === 'short' ? -1 : 1;

    // Resultado financeiro
    let grossResult = 0;
    if (exits.length > 0) {
      grossResult = exits.reduce((sum, e) => sum + ((Number(e.price) || 0) - entryPrice) * sign * (Number(e.qty) || 0), 0);
    } else if (exitPrice > 0 && sharesQuantity > 0) {
      grossResult = (exitPrice - entryPrice) * sign * sharesQuantity;
    } else if (trade.result != null && Number.isFinite(Number(trade.result))) {
      grossResult = Number(trade.result);
    } else if (trade.net_result != null && Number.isFinite(Number(trade.net_result))) {
      grossResult = Number(trade.net_result);
    } else if (trade.netResult != null && Number.isFinite(Number(trade.netResult))) {
      grossResult = Number(trade.netResult);
    } else if (trade.grossPnl != null) {
      grossResult = Number(trade.grossPnl);
    }

    const costs = Number(trade.costs ?? trade.costsIncurred ?? 0);
    const slippage = Number(trade.slippage ?? trade.slippageIncurred ?? 0);
    const netResult = round2(grossResult - costs);

    const returnPct = allocatedCapital > 0 ? round2((netResult / allocatedCapital) * 100) : 0;

    let outcome = 'BREAKEVEN';
    if (netResult > 0.005) outcome = 'WIN';
    else if (netResult < -0.005) outcome = 'LOSS';

    // Propriedades comuns
    const base = {
      id: trade.id,
      symbol: String(trade.ticker || trade.symbol || '—').toUpperCase().trim(),
      companyName: trade.company_name || trade.companyName || trade.ticker || trade.symbol || '',
      market: String(trade.market || 'B3').toUpperCase(),
      sector: trade.sector || 'Geral',
      direction,
      strategyType,
      status: trade.status || 'closed',
      entryDate: openedAtStr,
      entryPrice,
      exitDate: closedAtStr,
      exitPrice,
      exitReason: trade.exit_reason || trade.exitReason || null,
      sharesQuantity,
      allocatedCapital,
      grossResult: round2(grossResult),
      netResult,
      costs: round2(costs),
      slippage: round2(slippage),
      returnPct,
      holdingSessions,
      outcome,
      raw: trade
    };

    // Propriedades específicas por estratégia
    if (strategyType === 'TREND_FOLLOWING') {
      const initialStop = Number(entryEvent.stop ?? trade.stop_loss ?? trade.stop_price ?? 0);
      const initialRisk = Math.abs(entryPrice - initialStop) * sharesQuantity;
      const r = initialRisk > 0 ? round2(netResult / initialRisk) : (trade.result_r != null ? Number(trade.result_r) : null);

      return {
        ...base,
        initialStop,
        initialRisk: round2(initialRisk),
        r,
        setup: trade.entry_setup || trade.setup || trade.trigger_name || 'Trend Following',
        setupTrigger: trade.setup_trigger || trade.setupTrigger || trade.trigger_name || null,
        grade: trade.rubric_grade || trade.grade || null,
        rubricScore: Number(trade.rubric_score ?? trade.score ?? 0),
        marketCycle: trade.market_cycle || trade.marketCycle || null,
        relativeStrength: trade.relative_strength || trade.relativeStrength || null
      };
    } else {
      // VOLATILITY_TRADING
      const meta = trade.metadata || trade.parameters || {};
      const indicators = trade.signal_indicators || trade.signalIndicators || meta.indicators || {};

      return {
        ...base,
        r: null, // R-múltiplos não se aplicam a Volatilidade sem stop inicial fixo
        setup: trade.entry_setup || 'VOLATILITY_SWING_IFR2',
        ifr: Number(trade.ifr ?? indicators.ifr ?? meta.ifr ?? 0),
        oversoldLevel: Number(meta.oversoldLevel ?? 10),
        distSma7Pct: Number(trade.dist_sma7_pct ?? meta.distSma7Pct ?? (indicators.smaShort && indicators.close ? ((indicators.close - indicators.smaShort) / indicators.smaShort * 100) : 0)),
        distSma200Pct: Number(trade.dist_sma200_pct ?? meta.distSma200Pct ?? (indicators.smaLong && indicators.close ? ((indicators.close - indicators.smaLong) / indicators.smaLong * 100) : 0)),
        atr: Number(trade.atr ?? indicators.atr ?? 0),
        atrPct: Number(trade.atr_pct ?? indicators.atrPct ?? (indicators.close && indicators.atr ? (indicators.atr / indicators.close * 100) : 0)),
        profileId: trade.strategy_config_id || trade.strategyConfigId || meta.profileId || null,
        profileVersion: trade.strategy_config_version || trade.strategyConfigVersion || meta.profileVersion || '1.0'
      };
    }
  }

  /**
   * Consolida métricas analíticas completas para um conjunto homogêneo de trades de uma estratégia.
   */
  function calculateStrategyMetrics(trades, options = {}) {
    const rawList = Array.isArray(trades) ? trades : [];
    const closed = rawList.map(t => (t.grossResult !== undefined ? t : analyzeTrade(t)))
      .filter(t => t && (t.status === 'closed' || t.status === 'CLOSED'));

    const initialCapital = Number(options.initialCapital || 100000);
    const strategyType = options.strategyType || (closed[0]?.strategyType) || 'TREND_FOLLOWING';

    const totalTrades = closed.length;
    const wins = closed.filter(t => t.outcome === 'WIN');
    const losses = closed.filter(t => t.outcome === 'LOSS');
    const breakevens = closed.filter(t => t.outcome === 'BREAKEVEN');

    const winRatePct = totalTrades > 0 ? round2((wins.length / totalTrades) * 100) : 0;
    const lossRatePct = totalTrades > 0 ? round2((losses.length / totalTrades) * 100) : 0;

    const grossProfit = round2(wins.reduce((sum, t) => sum + t.netResult, 0));
    const grossLoss = round2(Math.abs(losses.reduce((sum, t) => sum + t.netResult, 0)));
    const netProfit = round2(grossProfit - grossLoss);

    const profitFactor = grossLoss > 0 ? round2(grossProfit / grossLoss) : (grossProfit > 0 ? 999 : 0);

    const avgWinAmount = wins.length > 0 ? round2(grossProfit / wins.length) : 0;
    const avgLossAmount = losses.length > 0 ? round2(grossLoss / losses.length) : 0;
    const payoffRatio = avgLossAmount > 0 ? round2(avgWinAmount / avgLossAmount) : (avgWinAmount > 0 ? 99 : 0);

    const avgWinPct = wins.length > 0 ? round2(wins.reduce((sum, t) => sum + t.returnPct, 0) / wins.length) : 0;
    const avgLossPct = losses.length > 0 ? round2(losses.reduce((sum, t) => sum + t.returnPct, 0) / losses.length) : 0;
    const avgTradeReturnPct = totalTrades > 0 ? round2(closed.reduce((sum, t) => sum + t.returnPct, 0) / totalTrades) : 0;

    // Expectativa matemática
    const expectancyAmount = totalTrades > 0 ? round2(netProfit / totalTrades) : 0;
    const expectancyPct = round2((winRatePct / 100 * avgWinPct) - (lossRatePct / 100 * Math.abs(avgLossPct)));

    // R-múltiplos (apenas se Trend Following)
    let avgWinR = null;
    let avgLossR = null;
    let expectancyR = null;
    let totalR = null;

    if (strategyType === 'TREND_FOLLOWING') {
      const validRTrades = closed.filter(t => t.r != null && Number.isFinite(t.r));
      if (validRTrades.length > 0) {
        totalR = round2(validRTrades.reduce((sum, t) => sum + t.r, 0));
        const winsR = validRTrades.filter(t => t.r > 0);
        const lossesR = validRTrades.filter(t => t.r < 0);
        avgWinR = winsR.length > 0 ? round2(winsR.reduce((sum, t) => sum + t.r, 0) / winsR.length) : 0;
        avgLossR = lossesR.length > 0 ? round2(Math.abs(lossesR.reduce((sum, t) => sum + t.r, 0)) / lossesR.length) : 0;
        expectancyR = round2((winRatePct / 100 * (avgWinR || 0)) - (lossRatePct / 100 * (avgLossR || 0)));
      }
    }

    // Holding period
    const holdingList = closed.map(t => t.holdingSessions).filter(h => Number.isFinite(h));
    const avgHoldingSessions = holdingList.length > 0 ? round2(holdingList.reduce((a, b) => a + b, 0) / holdingList.length) : 0;
    const medianHoldingSessions = median(holdingList);

    // Maior ganho e perda
    let largestGainAmount = 0;
    let largestGainPct = 0;
    let largestLossAmount = 0;
    let largestLossPct = 0;

    for (const t of closed) {
      if (t.netResult > largestGainAmount) {
        largestGainAmount = t.netResult;
        largestGainPct = t.returnPct;
      }
      if (t.netResult < largestLossAmount) {
        largestLossAmount = t.netResult;
        largestLossPct = t.returnPct;
      }
    }

    // Curva de patrimônio e Drawdown
    const sortedChronological = [...closed].sort((a, b) => (a.exitDate || '').localeCompare(b.exitDate || ''));
    let currentEquity = initialCapital;
    let peakEquity = initialCapital;
    let maxDrawdownPct = 0;
    let maxDrawdownAmount = 0;

    const equityCurve = [{ date: sortedChronological[0]?.entryDate || 'INÍCIO', equity: currentEquity, tradePnl: 0, drawdownPct: 0 }];

    for (const t of sortedChronological) {
      currentEquity = round2(currentEquity + t.netResult);
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }
      const ddAmount = round2(peakEquity - currentEquity);
      const ddPct = peakEquity > 0 ? round2((ddAmount / peakEquity) * 100) : 0;

      if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;
      if (ddAmount > maxDrawdownAmount) maxDrawdownAmount = ddAmount;

      equityCurve.push({
        date: t.exitDate,
        symbol: t.symbol,
        equity: currentEquity,
        tradePnl: t.netResult,
        returnPct: t.returnPct,
        drawdownPct: ddPct
      });
    }

    const recoveryFactor = maxDrawdownAmount > 0 ? round2(netProfit / maxDrawdownAmount) : (netProfit > 0 ? 99 : 0);

    // Custos e slippage
    const totalCosts = round2(closed.reduce((sum, t) => sum + (t.costs || 0), 0));
    const totalSlippage = round2(closed.reduce((sum, t) => sum + (t.slippage || 0), 0));

    // Exposição de capital
    const allocatedCapitals = closed.map(t => t.allocatedCapital).filter(c => c > 0);
    const avgAllocatedCapital = allocatedCapitals.length > 0 ? round2(allocatedCapitals.reduce((a, b) => a + b, 0) / allocatedCapitals.length) : 0;
    const maxAllocatedCapital = allocatedCapitals.length > 0 ? Math.max(...allocatedCapitals) : 0;

    // Consistência Mensal
    const monthlyMap = new Map();
    for (const t of closed) {
      if (!t.exitDate) continue;
      const mKey = t.exitDate.slice(0, 7); // YYYY-MM
      const group = monthlyMap.get(mKey) || [];
      group.push(t);
      monthlyMap.set(mKey, group);
    }

    const monthlyBreakdown = [];
    let positiveMonthsCount = 0;
    const sortedMonths = Array.from(monthlyMap.keys()).sort();

    for (const mKey of sortedMonths) {
      const mTrades = monthlyMap.get(mKey);
      const mWins = mTrades.filter(t => t.outcome === 'WIN');
      const mNet = round2(mTrades.reduce((sum, t) => sum + t.netResult, 0));
      if (mNet > 0) positiveMonthsCount++;

      monthlyBreakdown.push({
        month: mKey,
        tradesCount: mTrades.length,
        winsCount: mWins.length,
        winRatePct: round2((mWins.length / mTrades.length) * 100),
        netProfit: mNet
      });
    }

    const monthlyConsistencyPct = sortedMonths.length > 0 ? round2((positiveMonthsCount / sortedMonths.length) * 100) : 0;

    // Alerta de tamanho de amostra
    const sampleSizeAlert = totalTrades < MIN_SAMPLE_SIZE;
    const sampleSizeWarning = sampleSizeAlert
      ? `Amostra estatística reduzida (${totalTrades} operações < ${MIN_SAMPLE_SIZE}). Margem de erro elevada.`
      : `Amostra estatisticamente representativa (${totalTrades} operações ≥ ${MIN_SAMPLE_SIZE}).`;

    return {
      strategyType,
      totalTrades,
      winningTradesCount: wins.length,
      losingTradesCount: losses.length,
      breakevenTradesCount: breakevens.length,
      winRatePct,
      lossRatePct,
      grossProfit,
      grossLoss,
      netProfit,
      profitFactor,
      avgWinAmount,
      avgLossAmount,
      payoffRatio,
      avgWinPct,
      avgLossPct,
      avgTradeReturnPct,
      expectancyAmount,
      expectancyPct,
      avgWinR,
      avgLossR,
      expectancyR,
      totalR,
      avgHoldingSessions,
      medianHoldingSessions,
      largestGainAmount,
      largestGainPct,
      largestLossAmount,
      largestLossPct,
      maxDrawdownPct,
      maxDrawdownAmount,
      recoveryFactor,
      totalCosts,
      totalSlippage,
      avgAllocatedCapital,
      maxAllocatedCapital,
      equityCurve,
      monthlyBreakdown,
      monthlyConsistencyPct,
      positiveMonthsCount,
      totalMonthsCount: sortedMonths.length,
      sampleSizeAlert,
      sampleSizeWarning
    };
  }

  /**
   * Drill-downs específicos de Trend Following:
   * Por setup, regime de mercado, força relativa e nota da rubric.
   */
  function calculateTrendBreakdowns(trades) {
    const closed = (Array.isArray(trades) ? trades : []).map(analyzeTrade)
      .filter(t => t && t.strategyType === 'TREND_FOLLOWING' && t.status === 'closed');

    function groupAndSummarize(keyFn, nameMap = {}) {
      const groups = new Map();
      for (const t of closed) {
        const rawKey = keyFn(t) || 'Não informado';
        const k = nameMap[rawKey] || rawKey;
        const list = groups.get(k) || [];
        list.push(t);
        groups.set(k, list);
      }

      return Array.from(groups.entries()).map(([label, items]) => {
        const wins = items.filter(t => t.outcome === 'WIN');
        const net = round2(items.reduce((sum, t) => sum + t.netResult, 0));
        const rList = items.map(t => t.r).filter(v => v != null);
        const avgR = rList.length > 0 ? round2(rList.reduce((a, b) => a + b, 0) / rList.length) : null;
        return {
          label,
          total: items.length,
          wins: wins.length,
          winRate: round2((wins.length / items.length) * 100),
          net,
          avgR
        };
      }).sort((a, b) => b.total - a.total);
    }

    return {
      bySetup: groupAndSummarize(t => t.setupTrigger || t.setup),
      byMarketCycle: groupAndSummarize(t => t.marketCycle),
      byRelativeStrength: groupAndSummarize(t => t.relativeStrength),
      byGrade: groupAndSummarize(t => t.grade),
      byMarket: groupAndSummarize(t => t.market)
    };
  }

  /**
   * Drill-downs específicos de Volatility Trading:
   * Por nível de IFR, distância da SMA7, SMA200, ATR%, holding sessions e motivo de saída.
   */
  function calculateVolatilityBreakdowns(trades) {
    const closed = (Array.isArray(trades) ? trades : []).map(analyzeTrade)
      .filter(t => t && t.strategyType === 'VOLATILITY_TRADING' && (t.status === 'closed' || t.status === 'CLOSED'));

    function summarizeGroup(groups) {
      return Array.from(groups.entries()).map(([label, items]) => {
        const wins = items.filter(t => t.outcome === 'WIN');
        const net = round2(items.reduce((sum, t) => sum + t.netResult, 0));
        const avgReturn = items.length > 0 ? round2(items.reduce((sum, t) => sum + t.returnPct, 0) / items.length) : 0;
        return {
          label,
          total: items.length,
          wins: wins.length,
          winRate: round2((wins.length / items.length) * 100),
          net,
          avgReturnPct: avgReturn
        };
      });
    }

    // 1. Por Faixa de IFR(2)
    const ifrGroups = new Map([
      ['IFR ≤ 5 (Exaustão Extrema)', []],
      ['5 < IFR ≤ 10 (Padrão)', []],
      ['10 < IFR ≤ 15 (Moderado)', []],
      ['IFR > 15 (Amplo)', []]
    ]);
    for (const t of closed) {
      const v = Number(t.ifr);
      if (v <= 5) ifrGroups.get('IFR ≤ 5 (Exaustão Extrema)').push(t);
      else if (v <= 10) ifrGroups.get('5 < IFR ≤ 10 (Padrão)').push(t);
      else if (v <= 15) ifrGroups.get('10 < IFR ≤ 15 (Moderado)').push(t);
      else ifrGroups.get('IFR > 15 (Amplo)').push(t);
    }

    // 2. Por Distância da SMA(7)
    const distSma7Groups = new Map([
      ['Muito Afastado (< -6%)', []],
      ['Moderado (-6% a -3%)', []],
      ['Próximo (-3% a 0%)', []]
    ]);
    for (const t of closed) {
      const d = Number(t.distSma7Pct);
      if (d < -6) distSma7Groups.get('Muito Afastado (< -6%)').push(t);
      else if (d < -3) distSma7Groups.get('Moderado (-6% a -3%)').push(t);
      else distSma7Groups.get('Próximo (-3% a 0%)').push(t);
    }

    // 3. Por Motivo de Saída
    const exitReasonGroups = new Map([
      ['Recuperação SMA(7)', []],
      ['Saída Temporal (D7)', []],
      ['Outros', []]
    ]);
    for (const t of closed) {
      if (t.exitReason === 'TARGET_MA_RECOVERY') exitReasonGroups.get('Recuperação SMA(7)').push(t);
      else if (t.exitReason === 'TIME_EXIT') exitReasonGroups.get('Saída Temporal (D7)').push(t);
      else exitReasonGroups.get('Outros').push(t);
    }

    // 4. Por Faixa de Permanência (Holding Sessions)
    const holdingGroups = new Map([
      ['1 pregão', []],
      ['2 a 3 pregões', []],
      ['4 a 6 pregões', []],
      ['7 pregões (D7 limite)', []]
    ]);
    for (const t of closed) {
      const h = Number(t.holdingSessions);
      if (h <= 1) holdingGroups.get('1 pregão').push(t);
      else if (h <= 3) holdingGroups.get('2 a 3 pregões').push(t);
      else if (h <= 6) holdingGroups.get('4 a 6 pregões').push(t);
      else holdingGroups.get('7 pregões (D7 limite)').push(t);
    }

    // 5. Por Ativo, Setor e Mercado
    const bySymbolMap = new Map();
    const bySectorMap = new Map();
    const byMarketMap = new Map();

    for (const t of closed) {
      const s = t.symbol || 'OUTROS';
      const sec = t.sector || 'Geral';
      const mkt = t.market || 'B3';

      if (!bySymbolMap.has(s)) bySymbolMap.set(s, []);
      bySymbolMap.get(s).push(t);

      if (!bySectorMap.has(sec)) bySectorMap.set(sec, []);
      bySectorMap.get(sec).push(t);

      if (!byMarketMap.has(mkt)) byMarketMap.set(mkt, []);
      byMarketMap.get(mkt).push(t);
    }

    return {
      byIfrLevel: summarizeGroup(ifrGroups),
      byDistSma7: summarizeGroup(distSma7Groups),
      byExitReason: summarizeGroup(exitReasonGroups),
      byHoldingPeriod: summarizeGroup(holdingGroups),
      bySymbol: summarizeGroup(bySymbolMap).sort((a, b) => b.total - a.total).slice(0, 10),
      bySector: summarizeGroup(bySectorMap).sort((a, b) => b.total - a.total),
      byMarket: summarizeGroup(byMarketMap)
    };
  }

  /**
   * Coeficiente de correlação linear de Pearson entre duas séries temporais numéricas.
   */
  function calculatePearsonCorrelation(seriesA, seriesB) {
    if (!Array.isArray(seriesA) || !Array.isArray(seriesB) || seriesA.length < 3 || seriesA.length !== seriesB.length) {
      return 0;
    }

    const n = seriesA.length;
    let sumA = 0;
    let sumB = 0;
    for (let i = 0; i < n; i++) {
      sumA += seriesA[i];
      sumB += seriesB[i];
    }
    const meanA = sumA / n;
    const meanB = sumB / n;

    let cov = 0;
    let varA = 0;
    let varB = 0;

    for (let i = 0; i < n; i++) {
      const diffA = seriesA[i] - meanA;
      const diffB = seriesB[i] - meanB;
      cov += diffA * diffB;
      varA += diffA * diffA;
      varB += diffB * diffB;
    }

    if (varA === 0 || varB === 0) return 0;
    return round4(cov / (Math.sqrt(varA) * Math.sqrt(varB)));
  }

  /**
   * Consolida a visão da Carteira (Portfolio Consolidated Analytics):
   * Constrói a curva de patrimônio unificada, drawdown real da carteira, correlação de Pearson e exposição simultânea.
   */
  function calculateConsolidatedPortfolio(trades, options = {}) {
    const rawList = Array.isArray(trades) ? trades : [];
    const normalized = rawList.map(analyzeTrade).filter(t => t && (t.status === 'closed' || t.status === 'CLOSED'));

    const initialCapital = Number(options.initialCapital || 100000);

    const trendTrades = normalized.filter(t => t.strategyType === 'TREND_FOLLOWING');
    const volTrades = normalized.filter(t => t.strategyType === 'VOLATILITY_TRADING');

    // Métricas individuais
    const trendMetrics = calculateStrategyMetrics(trendTrades, { initialCapital, strategyType: 'TREND_FOLLOWING' });
    const volMetrics = calculateStrategyMetrics(volTrades, { initialCapital, strategyType: 'VOLATILITY_TRADING' });

    // Resultado Financeiro Total
    const totalNetProfit = round2(trendMetrics.netProfit + volMetrics.netProfit);
    const totalTradesCount = trendMetrics.totalTrades + volMetrics.totalTrades;

    // Contribuição por Estratégia
    let trendContributionPct = 0;
    let volContributionPct = 0;

    if (Math.abs(totalNetProfit) > 0.01) {
      trendContributionPct = round2((trendMetrics.netProfit / totalNetProfit) * 100);
      volContributionPct = round2((volMetrics.netProfit / totalNetProfit) * 100);
    } else {
      trendContributionPct = 50;
      volContributionPct = 50;
    }

    // Curva Cronológica Unificada da Carteira
    const allSortedTrades = [...normalized].sort((a, b) => (a.exitDate || '').localeCompare(b.exitDate || ''));

    let runningEquity = initialCapital;
    let peakEquity = initialCapital;
    let maxDrawdownPct = 0;
    let maxDrawdownAmount = 0;

    const combinedEquityCurve = [
      {
        date: allSortedTrades[0]?.entryDate || 'INÍCIO',
        equity: runningEquity,
        tradePnl: 0,
        drawdownPct: 0,
        strategy: null
      }
    ];

    for (const t of allSortedTrades) {
      runningEquity = round2(runningEquity + t.netResult);
      if (runningEquity > peakEquity) {
        peakEquity = runningEquity;
      }
      const ddAmount = round2(peakEquity - runningEquity);
      const ddPct = peakEquity > 0 ? round2((ddAmount / peakEquity) * 100) : 0;

      if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;
      if (ddAmount > maxDrawdownAmount) maxDrawdownAmount = ddAmount;

      combinedEquityCurve.push({
        date: t.exitDate,
        symbol: t.symbol,
        equity: runningEquity,
        tradePnl: t.netResult,
        strategy: t.strategyType,
        drawdownPct: ddPct
      });
    }

    // Exposição Simultânea & Capital Comprometido
    // Coleta todas as datas em que havia trades em aberto
    const dateCalendarSet = new Set();
    for (const t of normalized) {
      if (t.entryDate) dateCalendarSet.add(t.entryDate);
      if (t.exitDate) dateCalendarSet.add(t.exitDate);
    }
    const calendarDates = Array.from(dateCalendarSet).sort();

    let maxSimultaneousCapital = 0;
    let maxSimultaneousPositions = 0;
    let sumCapitalCommitted = 0;

    const exposureTimeline = [];
    for (const date of calendarDates) {
      const activeTrades = normalized.filter(t => t.entryDate && t.exitDate && t.entryDate <= date && t.exitDate >= date);
      const tfActive = activeTrades.filter(t => t.strategyType === 'TREND_FOLLOWING');
      const volActive = activeTrades.filter(t => t.strategyType === 'VOLATILITY_TRADING');

      const tfCapital = tfActive.reduce((sum, t) => sum + t.allocatedCapital, 0);
      const volCapital = volActive.reduce((sum, t) => sum + t.allocatedCapital, 0);
      const totalCapital = tfCapital + volCapital;

      if (totalCapital > maxSimultaneousCapital) maxSimultaneousCapital = totalCapital;
      if (activeTrades.length > maxSimultaneousPositions) maxSimultaneousPositions = activeTrades.length;
      sumCapitalCommitted += totalCapital;

      exposureTimeline.push({
        date,
        totalActiveCount: activeTrades.length,
        trendCount: tfActive.length,
        volatilityCount: volActive.length,
        trendCapital: round2(tfCapital),
        volatilityCapital: round2(volCapital),
        totalCapitalCommitted: round2(totalCapital)
      });
    }

    const avgCapitalCommitted = calendarDates.length > 0 ? round2(sumCapitalCommitted / calendarDates.length) : 0;

    // Correlação de Retornos entre Estratégias (Agregação Diária ou Mensal)
    // Agrupa PnL diário de cada estratégia
    const dailyPnlTrendMap = new Map();
    const dailyPnlVolMap = new Map();

    for (const t of trendTrades) {
      if (!t.exitDate) continue;
      dailyPnlTrendMap.set(t.exitDate, (dailyPnlTrendMap.get(t.exitDate) || 0) + t.netResult);
    }
    for (const t of volTrades) {
      if (!t.exitDate) continue;
      dailyPnlVolMap.set(t.exitDate, (dailyPnlVolMap.get(t.exitDate) || 0) + t.netResult);
    }

    const seriesTrend = [];
    const seriesVol = [];

    for (const date of calendarDates) {
      seriesTrend.push(dailyPnlTrendMap.get(date) || 0);
      seriesVol.push(dailyPnlVolMap.get(date) || 0);
    }

    const pearsonCorrelation = calculatePearsonCorrelation(seriesTrend, seriesVol);
    let correlationInterpretation = 'Diversificação Ótima: estratégias atuam de forma descorrelacionada';
    if (pearsonCorrelation < 0) {
      correlationInterpretation = 'Hedge Positivo: retornos contracíclicos atenuam a volatilidade global';
    } else if (pearsonCorrelation > 0.5) {
      correlationInterpretation = 'Correlação Moderada/Elevada: atenuação reduzida em momentos de estresse';
    }

    // Concentração Consolidada de Carteira
    // Por Ativo
    const assetConcentrationMap = new Map();
    const sectorConcentrationMap = new Map();

    for (const t of normalized) {
      const sym = t.symbol || 'OUTROS';
      const sec = t.sector || 'Geral';

      const aRec = assetConcentrationMap.get(sym) || { symbol: sym, totalTrades: 0, netResult: 0, capitalAllocated: 0 };
      aRec.totalTrades++;
      aRec.netResult = round2(aRec.netResult + t.netResult);
      aRec.capitalAllocated = round2(aRec.capitalAllocated + t.allocatedCapital);
      assetConcentrationMap.set(sym, aRec);

      const sRec = sectorConcentrationMap.get(sec) || { sector: sec, totalTrades: 0, netResult: 0, capitalAllocated: 0 };
      sRec.totalTrades++;
      sRec.netResult = round2(sRec.netResult + t.netResult);
      sRec.capitalAllocated = round2(sRec.capitalAllocated + t.allocatedCapital);
      sectorConcentrationMap.set(sec, sRec);
    }

    const topAssets = Array.from(assetConcentrationMap.values()).sort((a, b) => b.capitalAllocated - a.capitalAllocated).slice(0, 10);
    const topSectors = Array.from(sectorConcentrationMap.values()).sort((a, b) => b.capitalAllocated - a.capitalAllocated);

    const isSampleSizeInsufficient = totalTradesCount < MIN_SAMPLE_SIZE;
    const sampleSizeWarning = isSampleSizeInsufficient
      ? `Amostra combinada reduzida (${totalTradesCount} operações < ${MIN_SAMPLE_SIZE}). Recomenda-se expandir o histórico para validação conclusiva.`
      : `Amostra combinada estatisticamente representativa (${totalTradesCount} operações ≥ ${MIN_SAMPLE_SIZE}).`;

    return {
      initialCapital,
      totalNetProfit,
      totalTradesCount,
      trendFollowing: trendMetrics,
      volatilityTrading: volMetrics,
      contribution: {
        trendFollowing: {
          netProfit: trendMetrics.netProfit,
          tradesCount: trendMetrics.totalTrades,
          contributionPct: trendContributionPct
        },
        volatilityTrading: {
          netProfit: volMetrics.netProfit,
          tradesCount: volMetrics.totalTrades,
          contributionPct: volContributionPct
        }
      },
      exposure: {
        maxSimultaneousCapital: round2(maxSimultaneousCapital),
        maxSimultaneousPositions,
        avgCapitalCommitted,
        exposureTimeline: exposureTimeline.slice(-60) // Últimos 60 pontos
      },
      portfolioDrawdown: {
        maxDrawdownPct,
        maxDrawdownAmount: round2(maxDrawdownAmount),
        recoveryFactor: maxDrawdownAmount > 0 ? round2(totalNetProfit / maxDrawdownAmount) : (totalNetProfit > 0 ? 99 : 0)
      },
      correlation: {
        pearsonCorrelation,
        interpretation: correlationInterpretation
      },
      concentration: {
        topAssets,
        topSectors
      },
      combinedEquityCurve,
      sampleSizeAlert: isSampleSizeInsufficient,
      sampleSizeWarning,
      definitions: METRIC_DEFINITIONS
    };
  }

  /**
   * Filtra um array de trades por critérios de data, mercado, ativo e estratégia.
   */
  function filterTrades(trades, filters = {}) {
    if (!Array.isArray(trades)) return [];

    const stratFilter = filters.strategy || filters.strategyType || 'ALL';
    const period = filters.period || 'ALL';
    const sDate = filters.startDate ? toIsoDate(filters.startDate) : null;
    const eDate = filters.endDate ? toIsoDate(filters.endDate) : null;
    const market = filters.market && filters.market !== 'ALL' ? String(filters.market).toUpperCase() : null;
    const symbol = filters.symbol && filters.symbol !== 'ALL' ? String(filters.symbol).toUpperCase().trim() : null;
    const profileId = filters.profileId && filters.profileId !== 'ALL' ? filters.profileId : null;

    let items = trades.map(analyzeTrade).filter(Boolean);

    // Filtro por Estratégia
    if (stratFilter !== 'ALL') {
      items = items.filter(t => t.strategyType === stratFilter);
    }

    // Filtro por Mercado
    if (market) {
      items = items.filter(t => t.market === market);
    }

    // Filtro por Ativo
    if (symbol) {
      items = items.filter(t => t.symbol === symbol);
    }

    // Filtro por Perfil
    if (profileId) {
      items = items.filter(t => t.profileId === profileId);
    }

    // Filtro por Data / Período
    if (sDate || eDate) {
      items = items.filter(t => {
        const d = t.exitDate || t.entryDate;
        if (!d) return false;
        if (sDate && d < sDate) return false;
        if (eDate && d > eDate) return false;
        return true;
      });
    } else if (period !== 'ALL') {
      const numDays = Number(period);
      if (Number.isFinite(numDays) && numDays > 0) {
        const now = new Date();
        const cutoff = new Date(now.getTime() - (numDays * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10);
        items = items.filter(t => {
          const d = t.exitDate || t.entryDate;
          return d && d >= cutoff;
        });
      }
    }

    return items;
  }

  return Object.freeze({
    MIN_SAMPLE_SIZE,
    METRIC_DEFINITIONS,
    round2,
    round4,
    toIsoDate,
    median,
    analyzeTrade,
    calculateStrategyMetrics,
    calculateTrendBreakdowns,
    calculateVolatilityBreakdowns,
    calculatePearsonCorrelation,
    calculateConsolidatedPortfolio,
    filterTrades
  });
});
