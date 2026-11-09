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
    },
    returnPerCapitalDay: {
      name: 'Retorno por Capital-Dia (Return per Capital-Day)',
      formula: '(Lucro Líquido / Soma de (Capital Empregado × Dias de Exposição)) × 100',
      description: 'Métrica prioritária de eficiência econômica. Responde quanto resultado financeiro o sistema produz para cada unidade monetária comprometida durante o período em que a posição permaneceu aberta. Desconta todos os custos operacionais e trata entradas e saídas parciais.'
    },
    capitalTurnover: {
      name: 'Rotatividade do Capital (Capital Turnover)',
      formula: 'Capital Total Alocado em Trades / Capital Disponível da Conta',
      description: 'Mede quantas vezes o capital da carteira foi reciclado em novas operações no período. Um turnover elevado indica que o mesmo capital foi reutilizado para capturar múltiplos ciclos de mercado sucessivos.'
    },
    tradesPerMonth: {
      name: 'Frequência Operacional (Trades / Mês)',
      formula: 'Total de Trades Executados / Meses de Histórico no Período',
      description: 'Mede o ritmo e a cadência média de geração de oportunidades do sistema ao longo do tempo.'
    },
    avgHoldingPeriod: {
      name: 'Tempo Médio de Exposição (Holding Period)',
      formula: 'Média de Pregões e Dias Corridos das Operações Encerradas',
      description: 'Mede quanto tempo, em média, o capital permanece sob risco de mercado em cada posição antes de ser realizado.'
    },
    expectancyPerMonth: {
      name: 'Expectativa Mensal (Projetada vs Observada)',
      formula: 'Projetada: Expectativa por Trade × Frequência Mensal | Observada: Lucro Líquido Total / Meses no Período',
      description: 'Diferencia a expectativa estatística de geração mensal do sistema (combinação de expectativa por trade e cadência) do retorno mensal médio efetivamente observado no histórico.'
    },
    returnOnCapitalDeployed: {
      name: 'Retorno sobre Capital Empregado (ROCD)',
      formula: '(Lucro Líquido Total / Capital Médio Comprometido) × 100',
      description: 'Mede a rentabilidade líquida do sistema em relação ao capital que esteve efetivamente alocado nas posições, isolando o efeito do caixa ocioso.'
    },
    maxDrawdown: {
      name: 'Drawdown Máximo (Maximum Drawdown)',
      formula: '((Pico Anterior - Fundo Posterior) / Pico Anterior) × 100',
      description: 'Maior declínio percentual e financeiro acumulado a partir de um topo patrimonial anterior.'
    }
  });

  function countBusinessDays(d1, d2) {
    if (!d1 || !d2) return 1;
    const start = new Date(d1);
    const end = new Date(d2);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
    if (end < start) return 1;
    let cur = new Date(start);
    let count = 0;
    while (cur <= end) {
      const day = cur.getUTCDay();
      if (day !== 0 && day !== 6) count++;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return Math.max(1, count);
  }

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
    const entryEvent = events.find(e => {
      const tp = String(e.type || '').toLowerCase();
      return tp === 'entry' || tp === 'buy';
    }) || {};
    const exits = events.filter(e => {
      const tp = String(e.type || '').toLowerCase();
      return tp === 'peeloff' || tp === 'partial_exit' || tp === 'close' || tp === 'exit' || tp === 'sell';
    });
    const closeEvent = [...events].reverse().find(e => {
      const tp = String(e.type || '').toLowerCase();
      return tp === 'close' || tp === 'exit' || tp === 'sell';
    }) || {};

    const entryPrice = Number(entryEvent.price ?? trade.executed_entry_price ?? trade.execution_price ?? trade.entry_price ?? trade.entryPrice ?? trade.entry ?? 0);
    const exitPrice = Number(closeEvent.price ?? trade.exit_price ?? trade.exitPrice ?? trade.exit ?? 0);
    const sharesQuantity = Number(entryEvent.qty ?? entryEvent.quantity ?? trade.executed_quantity ?? trade.planned_quantity ?? trade.shares_quantity ?? trade.sharesQuantity ?? trade.positionSize ?? trade.position_size ?? trade.quantity ?? trade.shares ?? trade.qty ?? 0);
    const allocatedCapital = round2(entryPrice * sharesQuantity) || Number(trade.allocated_capital ?? trade.allocatedCapital ?? trade.financialInvested ?? trade.financial_invested ?? trade.position_size ?? 0);

    const openedAtStr = toIsoDate(entryEvent.at || entryEvent.date || trade.entry_date || trade.entryDate || trade.executed_at || trade.executedAt || trade.created_at || trade.createdAt);
    const closedAtStr = toIsoDate(closeEvent.at || closeEvent.date || trade.exit_date || trade.exitDate || trade.updated_at || trade.updatedAt || trade.closed_at || trade.closedAt || trade.created_at || trade.createdAt);
    const openedAt = openedAtStr ? new Date(openedAtStr + 'T00:00:00Z') : null;
    const closedAt = closedAtStr ? new Date(closedAtStr + 'T00:00:00Z') : null;

    let holdingSessions = Number(trade.holding_sessions ?? trade.holdingSessions ?? 0);
    let calendarDays = Number(trade.duration_days ?? trade.durationDays ?? trade.calendar_days ?? trade.calendarDays ?? 0);

    if (openedAt && closedAt && !Number.isNaN(openedAt.getTime()) && !Number.isNaN(closedAt.getTime())) {
      const diffDays = Math.max(0, Math.round((closedAt - openedAt) / (1000 * 60 * 60 * 24)));
      // Convenção inclusiva: mesmo dia = 1 dia, dias subsequentes = diffDays + 1
      calendarDays = calendarDays || Math.max(1, diffDays + 1);
    }
    if (!calendarDays) calendarDays = 1;

    if (!holdingSessions && openedAtStr && closedAtStr) {
      holdingSessions = countBusinessDays(openedAtStr, closedAtStr);
    }
    if (!holdingSessions) {
      holdingSessions = calendarDays;
    }

    const direction = String(trade.direction || 'long').toLowerCase();
    const sign = direction === 'short' ? -1 : 1;

    // Volume financeiro movimentado e Capital-Dias
    let tradedVolume = round2((entryPrice * sharesQuantity) + (exitPrice * sharesQuantity)) || round2(allocatedCapital * 2);
    let capitalDays = round2(allocatedCapital * calendarDays);
    let capitalSessions = round2(allocatedCapital * holdingSessions);

    // Se houver eventos detalhados com entradas e saídas parciais (scale-in e peel-off)
    if (events.length > 1) {
      const sortedEvents = [...events]
        .filter(e => e && (e.at || e.date))
        .sort((a, b) => new Date(a.at || a.date) - new Date(b.at || b.date));

      if (sortedEvents.length > 1) {
        let runningQty = 0;
        let runningCapDays = 0;
        let runningCapSessions = 0;
        let segTradedVol = 0;

        for (let i = 0; i < sortedEvents.length; i++) {
          const ev = sortedEvents[i];
          const evQty = Number(ev.qty ?? ev.quantity ?? ev.sharesQuantity ?? 0);
          const evPrice = Number(ev.price ?? entryPrice);
          const evType = String(ev.type || '').toLowerCase();

          if (evType === 'entry' || evType === 'scalein' || evType === 'scale_in' || evType === 'buy') {
            runningQty += evQty;
            segTradedVol += evQty * evPrice;
          } else if (evType === 'peeloff' || evType === 'partial_exit' || evType === 'partial_close' || evType === 'close' || evType === 'exit' || evType === 'sell') {
            runningQty = Math.max(0, runningQty - evQty);
            segTradedVol += evQty * evPrice;
          }

          if (i < sortedEvents.length - 1) {
            const nextEv = sortedEvents[i + 1];
            const d1 = toIsoDate(ev.at || ev.date);
            const d2 = toIsoDate(nextEv.at || nextEv.date);
            if (d1 && d2) {
              const diffSeg = Math.max(0, Math.round((new Date(d2 + 'T00:00:00Z') - new Date(d1 + 'T00:00:00Z')) / (1000 * 60 * 60 * 24)));
              // Se o próximo evento for o último (exit final), soma +1 no último intervalo para convenção inclusiva
              const isLastSegment = (i + 1 === sortedEvents.length - 1);
              const segCalDays = isLastSegment ? (diffSeg + 1) : diffSeg;
              const segSess = countBusinessDays(d1, d2);
              const segCap = runningQty * entryPrice;
              runningCapDays += segCap * segCalDays;
              runningCapSessions += segCap * segSess;
            }
          }
        }

        if (runningCapDays > 0) {
          capitalDays = round2(runningCapDays);
          capitalSessions = round2(runningCapSessions);
        }
        if (segTradedVol > 0) {
          tradedVolume = round2(segTradedVol);
        }
      }
    }

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
      calendarDays,
      holdingCalendarDays: calendarDays,
      capitalDays,
      capitalSessions,
      tradedVolume,
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

    // Período avaliado e frequência operacional
    let minEntryDate = null;
    let maxExitDate = null;
    for (const t of closed) {
      const dIn = t.entryDate;
      const dOut = t.exitDate || t.entryDate;
      if (dIn && (!minEntryDate || dIn < minEntryDate)) minEntryDate = dIn;
      if (dOut && (!maxExitDate || dOut > maxExitDate)) maxExitDate = dOut;
    }

    let daysSpan = 1;
    if (options.period && Number(options.period) > 0) {
      daysSpan = Number(options.period);
    } else if (minEntryDate && maxExitDate) {
      daysSpan = Math.max(1, Math.round((new Date(maxExitDate) - new Date(minEntryDate)) / (1000 * 60 * 60 * 24)));
    }
    const monthsSpan = round2(Math.max(1 / 30.4375, daysSpan / 30.4375));
    const tradesPerMonth = totalTrades > 0 ? round2(totalTrades / monthsSpan) : 0;

    // Holding period em dias corridos e pregões
    const holdingDaysList = closed.map(t => t.calendarDays || t.holdingCalendarDays || 1);
    const avgHoldingDays = holdingDaysList.length > 0 ? round2(holdingDaysList.reduce((a, b) => a + b, 0) / holdingDaysList.length) : 0;
    const medianHoldingDays = median(holdingDaysList);

    const holdingSessionsList = closed.map(t => t.holdingSessions || 1);
    const avgHoldingSessions = holdingSessionsList.length > 0 ? round2(holdingSessionsList.reduce((a, b) => a + b, 0) / holdingSessionsList.length) : 0;
    const medianHoldingSessions = median(holdingSessionsList);

    // Métrica Prioritária: Capital-Dias e Retorno por Capital-Dia
    const totalCapitalDays = round2(closed.reduce((sum, t) => sum + (t.capitalDays || 0), 0));
    const totalCapitalSessions = round2(closed.reduce((sum, t) => sum + (t.capitalSessions || 0), 0));

    // Return per Capital-Day (%) = (Lucro Líquido / Soma(Capital Empregado x Dias)) * 100
    const returnPerCapitalDayPct = totalCapitalDays > 0 ? round4((netProfit / totalCapitalDays) * 100) : 0;
    const returnPerCapitalSessionPct = totalCapitalSessions > 0 ? round4((netProfit / totalCapitalSessions) * 100) : 0;
    const netPerThousandCapitalDays = totalCapitalDays > 0 ? round2((netProfit / totalCapitalDays) * 1000) : 0;
    const annualizedCapitalDayReturnPct = round2(returnPerCapitalDayPct * 365);

    // Capital Turnover e Volume Financeiro
    const totalAllocatedCapital = round2(closed.reduce((sum, t) => sum + (t.allocatedCapital || 0), 0));
    const totalVolumeTraded = round2(closed.reduce((sum, t) => sum + (t.tradedVolume || 0), 0));
    const capitalTurnover = initialCapital > 0 ? round2(totalAllocatedCapital / initialCapital) : 0;
    const volumeTurnover = initialCapital > 0 ? round2(totalVolumeTraded / initialCapital) : 0;

    // Return on Capital Deployed (ROCD)
    const avgCapitalCommitted = daysSpan > 0 ? round2(totalCapitalDays / daysSpan) : avgAllocatedCapital;
    const returnOnCapitalDeployedPct = avgCapitalCommitted > 0 ? round2((netProfit / avgCapitalCommitted) * 100) : 0;
    const returnOnCumulativeAllocatedPct = totalAllocatedCapital > 0 ? round2((netProfit / totalAllocatedCapital) * 100) : 0;

    // Expectativa Mensal: Projetada vs Observada
    const projectedMonthlyExpectancy = round2(expectancyAmount * tradesPerMonth);
    const projectedMonthlyExpectancyR = (strategyType === 'TREND_FOLLOWING' && expectancyR != null)
      ? round2(expectancyR * tradesPerMonth)
      : null;
    const observedMonthlyAverage = monthsSpan > 0 ? round2(netProfit / monthsSpan) : 0;

    // Custos e slippage
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
      avgHoldingDays,
      medianHoldingDays,
      daysSpan,
      monthsSpan,
      tradesPerMonth,
      totalCapitalDays,
      totalCapitalSessions,
      returnPerCapitalDayPct,
      returnPerCapitalSessionPct,
      netPerThousandCapitalDays,
      annualizedCapitalDayReturnPct,
      totalAllocatedCapital,
      totalVolumeTraded,
      capitalTurnover,
      volumeTurnover,
      avgCapitalCommitted,
      returnOnCapitalDeployedPct,
      returnOnCumulativeAllocatedPct,
      projectedMonthlyExpectancy,
      projectedMonthlyExpectancyR,
      observedMonthlyAverage,
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

    // Eficiência de Capital Consolidada da Carteira
    const totalCapitalDays = round2(trendMetrics.totalCapitalDays + volMetrics.totalCapitalDays);
    const totalCapitalSessions = round2(trendMetrics.totalCapitalSessions + volMetrics.totalCapitalSessions);
    const returnPerCapitalDayPct = totalCapitalDays > 0 ? round4((totalNetProfit / totalCapitalDays) * 100) : 0;
    const returnPerCapitalSessionPct = totalCapitalSessions > 0 ? round4((totalNetProfit / totalCapitalSessions) * 100) : 0;
    const netPerThousandCapitalDays = totalCapitalDays > 0 ? round2((totalNetProfit / totalCapitalDays) * 1000) : 0;
    const totalAllocatedCapital = round2(trendMetrics.totalAllocatedCapital + volMetrics.totalAllocatedCapital);
    const totalVolumeTraded = round2(trendMetrics.totalVolumeTraded + volMetrics.totalVolumeTraded);
    const capitalTurnover = initialCapital > 0 ? round2(totalAllocatedCapital / initialCapital) : 0;
    const volumeTurnover = initialCapital > 0 ? round2(totalVolumeTraded / initialCapital) : 0;

    const comparison = compareStrategies(normalized, { ...options, initialCapital });

    return {
      initialCapital,
      totalNetProfit,
      totalTradesCount,
      trendFollowing: trendMetrics,
      volatilityTrading: volMetrics,
      capitalEfficiency: {
        totalCapitalDays,
        totalCapitalSessions,
        returnPerCapitalDayPct,
        returnPerCapitalSessionPct,
        netPerThousandCapitalDays,
        totalAllocatedCapital,
        totalVolumeTraded,
        capitalTurnover,
        volumeTurnover
      },
      comparison,
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
   * Compara lado a lado os sistemas operacionais (Trend Following vs Volatility Trading)
   * no mesmo período histórico, avaliando eficiência econômica, giro, retorno por capital-dia e drawdown.
   */
  function compareStrategies(trades, options = {}) {
    const rawList = Array.isArray(trades) ? trades : [];
    const normalized = rawList.map(analyzeTrade).filter(t => t && (t.status === 'closed' || t.status === 'CLOSED'));

    const initialCapital = Number(options.initialCapital || 100000);
    const trendTrades = normalized.filter(t => t.strategyType === 'TREND_FOLLOWING');
    const volTrades = normalized.filter(t => t.strategyType === 'VOLATILITY_TRADING');

    const trendMetrics = calculateStrategyMetrics(trendTrades, { ...options, initialCapital, strategyType: 'TREND_FOLLOWING' });
    const volMetrics = calculateStrategyMetrics(volTrades, { ...options, initialCapital, strategyType: 'VOLATILITY_TRADING' });

    function resolveWinner(trendVal, volVal, lowerIsBetter = false) {
      if (trendVal == null && volVal == null) return 'TIE';
      if (trendVal == null || Number.isNaN(trendVal)) return 'VOLATILITY_TRADING';
      if (volVal == null || Number.isNaN(volVal)) return 'TREND_FOLLOWING';
      if (Math.abs(trendVal - volVal) < 0.0001) return 'TIE';
      if (lowerIsBetter) {
        return trendVal < volVal ? 'TREND_FOLLOWING' : 'VOLATILITY_TRADING';
      }
      return trendVal > volVal ? 'TREND_FOLLOWING' : 'VOLATILITY_TRADING';
    }

    function formatMoneyBR(val) {
      return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    const dimensions = [
      {
        id: 'returnPerCapitalDay',
        name: 'Retorno por Capital-Dia',
        isPriority: true,
        unit: '% ao dia',
        description: 'Rentabilidade gerada por cada unidade monetária comprometida multiplicada pelos dias em aberto. Métrica prioritária de eficiência de capital.',
        trendValue: trendMetrics.returnPerCapitalDayPct,
        trendFormatted: `${trendMetrics.returnPerCapitalDayPct.toFixed(3)}% ao dia (${formatMoneyBR(trendMetrics.netPerThousandCapitalDays)} / R$ 1k-dia)`,
        volValue: volMetrics.returnPerCapitalDayPct,
        volFormatted: `${volMetrics.returnPerCapitalDayPct.toFixed(3)}% ao dia (${formatMoneyBR(volMetrics.netPerThousandCapitalDays)} / R$ 1k-dia)`,
        winner: resolveWinner(trendMetrics.returnPerCapitalDayPct, volMetrics.returnPerCapitalDayPct),
        insight: 'Mede o poder de geração diária de riqueza sobre o capital sob risco no mercado.'
      },
      {
        id: 'capitalTurnover',
        name: 'Rotatividade do Capital (Turnover)',
        unit: 'vezes',
        description: 'Quantas vezes o capital disponível da conta foi reutilizado em operações durante o período.',
        trendValue: trendMetrics.capitalTurnover,
        trendFormatted: `${trendMetrics.capitalTurnover.toFixed(1)}x`,
        volValue: volMetrics.capitalTurnover,
        volFormatted: `${volMetrics.capitalTurnover.toFixed(1)}x`,
        winner: resolveWinner(trendMetrics.capitalTurnover, volMetrics.capitalTurnover),
        insight: 'Maior turnover recicla o capital com rapidez para capturar mais oportunidades.'
      },
      {
        id: 'tradesPerMonth',
        name: 'Frequência Operacional',
        unit: 'trades/mês',
        description: 'Média de operações executadas por mês no período observado.',
        trendValue: trendMetrics.tradesPerMonth,
        trendFormatted: `${trendMetrics.tradesPerMonth.toFixed(1)} trades/mês`,
        volValue: volMetrics.tradesPerMonth,
        volFormatted: `${volMetrics.tradesPerMonth.toFixed(1)} trades/mês`,
        winner: resolveWinner(trendMetrics.tradesPerMonth, volMetrics.tradesPerMonth),
        insight: 'Frequência de gatilhos acionados pelo modelo estatístico.'
      },
      {
        id: 'avgHoldingPeriod',
        name: 'Tempo Médio de Exposição',
        unit: 'pregões',
        description: 'Duração média das operações no mercado (menor tempo = menor exposição a choques exógenos).',
        trendValue: trendMetrics.avgHoldingSessions,
        trendFormatted: `${trendMetrics.avgHoldingSessions.toFixed(1)} pregões (${trendMetrics.avgHoldingDays.toFixed(1)} dias)`,
        volValue: volMetrics.avgHoldingSessions,
        volFormatted: `${volMetrics.avgHoldingSessions.toFixed(1)} pregões (${volMetrics.avgHoldingDays.toFixed(1)} dias)`,
        winner: resolveWinner(trendMetrics.avgHoldingSessions, volMetrics.avgHoldingSessions, true),
        insight: 'Posições curtas reduzem a permanência sob risco de mercado.'
      },
      {
        id: 'payoffRatio',
        name: 'Relação Payoff Médio',
        unit: 'x',
        description: 'Ganho médio por trade vencedor dividido pela perda média por trade perdedor.',
        trendValue: trendMetrics.payoffRatio,
        trendFormatted: `${trendMetrics.payoffRatio.toFixed(2)}x`,
        volValue: volMetrics.payoffRatio,
        volFormatted: `${volMetrics.payoffRatio.toFixed(2)}x`,
        winner: resolveWinner(trendMetrics.payoffRatio, volMetrics.payoffRatio),
        insight: 'Trend Following compensa menor frequência com grandes movimentos direcionais assimétricos.'
      },
      {
        id: 'projectedMonthlyExpectancy',
        name: 'Expectativa Mensal Projetada',
        unit: 'R$/mês',
        description: 'Expectativa matemática mensal baseada na combinação de Expectativa por Trade × Frequência Mensal.',
        trendValue: trendMetrics.projectedMonthlyExpectancy,
        trendFormatted: `${trendMetrics.projectedMonthlyExpectancy >= 0 ? '+' : ''}${formatMoneyBR(trendMetrics.projectedMonthlyExpectancy)}${trendMetrics.projectedMonthlyExpectancyR != null ? ` (+${trendMetrics.projectedMonthlyExpectancyR.toFixed(1)}R)` : ''}`,
        volValue: volMetrics.projectedMonthlyExpectancy,
        volFormatted: `${volMetrics.projectedMonthlyExpectancy >= 0 ? '+' : ''}${formatMoneyBR(volMetrics.projectedMonthlyExpectancy)}`,
        winner: resolveWinner(trendMetrics.projectedMonthlyExpectancy, volMetrics.projectedMonthlyExpectancy),
        insight: 'Demonstra como frequência e turnover compensam payoffs individuais moderados.'
      },
      {
        id: 'observedMonthlyAverage',
        name: 'Média Mensal Observada',
        unit: 'R$/mês',
        description: 'Resultado líquido total histórico dividido pela extensão em meses do período avaliado.',
        trendValue: trendMetrics.observedMonthlyAverage,
        trendFormatted: `${trendMetrics.observedMonthlyAverage >= 0 ? '+' : ''}${formatMoneyBR(trendMetrics.observedMonthlyAverage)}`,
        volValue: volMetrics.observedMonthlyAverage,
        volFormatted: `${volMetrics.observedMonthlyAverage >= 0 ? '+' : ''}${formatMoneyBR(volMetrics.observedMonthlyAverage)}`,
        winner: resolveWinner(trendMetrics.observedMonthlyAverage, volMetrics.observedMonthlyAverage),
        insight: 'Resultado líquido efetivamente realizado dividido pela extensão do período em meses.'
      },
      {
        id: 'returnOnCapitalDeployed',
        name: 'Retorno sobre Capital Empregado (ROCD)',
        unit: '%',
        description: 'Retorno líquido total em relação ao capital médio que esteve comprometido.',
        trendValue: trendMetrics.returnOnCapitalDeployedPct,
        trendFormatted: `${trendMetrics.returnOnCapitalDeployedPct >= 0 ? '+' : ''}${trendMetrics.returnOnCapitalDeployedPct.toFixed(1)}%`,
        volValue: volMetrics.returnOnCapitalDeployedPct,
        volFormatted: `${volMetrics.returnOnCapitalDeployedPct >= 0 ? '+' : ''}${volMetrics.returnOnCapitalDeployedPct.toFixed(1)}%`,
        winner: resolveWinner(trendMetrics.returnOnCapitalDeployedPct, volMetrics.returnOnCapitalDeployedPct),
        insight: 'Eficiência sobre o capital que foi efetivamente alocado em posições.'
      },
      {
        id: 'maxDrawdown',
        name: 'Drawdown Máximo Histórico',
        unit: '%',
        description: 'Maior queda patrimonial percentual de pico a vale (menor é melhor).',
        trendValue: trendMetrics.maxDrawdownPct,
        trendFormatted: `-${trendMetrics.maxDrawdownPct.toFixed(1)}% (${formatMoneyBR(trendMetrics.maxDrawdownAmount)})`,
        volValue: volMetrics.maxDrawdownPct,
        volFormatted: `-${volMetrics.maxDrawdownPct.toFixed(1)}% (${formatMoneyBR(volMetrics.maxDrawdownAmount)})`,
        winner: resolveWinner(trendMetrics.maxDrawdownPct, volMetrics.maxDrawdownPct, true),
        insight: 'Menor drawdown preserva estabilidade emocional e reduz risco de ruína.'
      },
      {
        id: 'winRate',
        name: 'Taxa de Acerto (Win Rate)',
        unit: '%',
        description: 'Percentual de operações com lucro líquido.',
        trendValue: trendMetrics.winRatePct,
        trendFormatted: `${trendMetrics.winRatePct.toFixed(1)}%`,
        volValue: volMetrics.winRatePct,
        volFormatted: `${volMetrics.winRatePct.toFixed(1)}%`,
        winner: resolveWinner(trendMetrics.winRatePct, volMetrics.winRatePct),
        insight: 'Volatilidade foca em alta probabilidade; Tendência foca em assimetria favorável.'
      },
      {
        id: 'profitFactor',
        name: 'Fator de Lucro (Profit Factor)',
        unit: '',
        description: 'Lucro bruto total dividido por perda bruta total.',
        trendValue: trendMetrics.profitFactor,
        trendFormatted: `${trendMetrics.profitFactor.toFixed(2)}`,
        volValue: volMetrics.profitFactor,
        volFormatted: `${volMetrics.profitFactor.toFixed(2)}`,
        winner: resolveWinner(trendMetrics.profitFactor, volMetrics.profitFactor),
        insight: 'Solidez global do sistema na relação entre lucros e perdas acumuladas.'
      }
    ];

    const trendWins = dimensions.filter(d => d.winner === 'TREND_FOLLOWING').length;
    const volWins = dimensions.filter(d => d.winner === 'VOLATILITY_TRADING').length;

    let primaryVerdict = '';
    if (volMetrics.returnPerCapitalDayPct > trendMetrics.returnPerCapitalDayPct) {
      primaryVerdict = `O Swing Trade de Volatilidade superou em Retorno por Capital-Dia (${volMetrics.returnPerCapitalDayPct.toFixed(3)}%/dia vs ${trendMetrics.returnPerCapitalDayPct.toFixed(3)}%/dia). Embora o Trend Following apresente maior payoff por trade (${trendMetrics.payoffRatio.toFixed(2)}x vs ${volMetrics.payoffRatio.toFixed(2)}x), a maior rotação de capital (${volMetrics.capitalTurnover.toFixed(1)}x vs ${trendMetrics.capitalTurnover.toFixed(1)}x) e a menor permanência média (${volMetrics.avgHoldingSessions.toFixed(1)} vs ${trendMetrics.avgHoldingSessions.toFixed(1)} pregões) permitiram ao sistema de volatilidade gerar mais riqueza por unidade de capital e tempo de exposição.`;
    } else if (trendMetrics.returnPerCapitalDayPct > volMetrics.returnPerCapitalDayPct) {
      primaryVerdict = `O Swing Trade de Tendência superou em Retorno por Capital-Dia (${trendMetrics.returnPerCapitalDayPct.toFixed(3)}%/dia vs ${volMetrics.returnPerCapitalDayPct.toFixed(3)}%/dia). O elevado payoff direcional das operações vencedoras (${trendMetrics.payoffRatio.toFixed(2)}x) mais do que compensou o maior tempo de exposição (${trendMetrics.avgHoldingSessions.toFixed(1)} pregões).`;
    } else {
      primaryVerdict = `Ambos os sistemas apresentaram eficiência de capital equivalente por tempo de exposição no período analisado.`;
    }

    const dualSynergySummary = `Princípio do Portfólio Dual: Payoff elevado não significa necessariamente maior eficiência de capital. A integração de ambos os sistemas em carteira permite capturar grandes tendências estruturais com Trend Following enquanto Volatility Trading mantém o capital girando de forma líquida e produtiva durante consolidações de mercado.`;

    return {
      scope: 'COMPARISON',
      initialCapital,
      totalTradesCount: normalized.length,
      trendFollowing: trendMetrics,
      volatilityTrading: volMetrics,
      dimensions,
      trendWins,
      volWins,
      primaryVerdict,
      dualSynergySummary,
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
    compareStrategies,
    countBusinessDays,
    filterTrades
  });
});
