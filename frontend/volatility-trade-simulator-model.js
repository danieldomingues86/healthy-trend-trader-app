/**
 * Healthy Trend Trader — Volatility Trade Simulator Model
 *
 * Motor de Simulação e Laboratório de Experimentos para VOLATILITY TRADING (IFR2 Mean Reversion).
 *
 * Princípios e Garantias Arquiteturais:
 * 1. Simulação Autônoma e Isolada:
 *    - Totalmente desacoplada do motor de Trend Following.
 *    - Sem contaminação por Força Relativa, ações líderes, setups de continuidade ou Rubric de tendência.
 * 2. Integridade Histórica e Sem Look-Ahead Bias:
 *    - Decisão de sinal no fechamento de T usando exclusivamente dados disponíveis até T.
 *    - Liquidity Gate avaliado na data histórica do sinal.
 *    - Execução da entrada na abertura de T+1 (D0) com absorção real de gaps.
 *    - Saída por recuperação (Close > SMA7) ou Saída Temporal no fechamento de D7.
 *    - Precedência rigorosa no pregão D7: se Close > SMA7 no dia D7, saída é classificada como TARGET_MA_RECOVERY.
 * 3. Gestão e Dimensionamento:
 *    - Position sizing financeiro fixo (R$ por operação).
 *    - Sem stop loss financeiro ou técnico na configuração inicial.
 *    - Não permite posições simultâneas duplicadas no mesmo ativo.
 * 4. Métricas e Laboratório de Experimentos:
 *    - Avaliação de múltiplos perfis (ex: IFR2 nível 5, 10, 15, 20).
 *    - Rastreamento completo de metadados: configuração, versão, universo, mercado, custos, slippage, timestamp.
 *    - Métricas completas: Win Rate, Profit Factor, Expectancy, Drawdown, Retorno Médio, Holding Period, Curva de Equity e Alerta de Amostra Reduzida (< 30 trades).
 */

(function (root, factory) {
  const VolatilityEngine = typeof module === 'object' && module.exports
    ? require('./volatility-trading-engine-model')
    : (root && root.VolatilityTradingEngineModel);
  const LiquidityGate = typeof module === 'object' && module.exports
    ? require('./liquidity-gate-model')
    : (root && root.LiquidityGateModel);
  const StrategyConfig = typeof module === 'object' && module.exports
    ? require('./strategy-configuration-model')
    : (root && root.StrategyConfigurationModel);

  if (typeof module === 'object' && module.exports) {
    module.exports = factory(VolatilityEngine, LiquidityGate, StrategyConfig);
  } else {
    root.VolatilityTradeSimulatorModel = factory(VolatilityEngine, LiquidityGate, StrategyConfig);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (VolatilityTradingEngineModel, LiquidityGateModel, StrategyConfigurationModel) {
  'use strict';

  const STRATEGY_TYPE = 'VOLATILITY_TRADING';
  const SIMULATOR_VERSION = 'volatility-sim-v1.0';
  const MIN_SAMPLE_SIZE = 30;

  const DEFAULT_CONFIG = Object.freeze({
    shortMaPeriod: 7,
    longMaPeriod: 200,
    indicator: 'IFR',
    rsiPeriod: 2,
    oversoldLevel: 10,
    holdingPeriodSessions: 7,
    positionSizingModel: 'FIXED_FINANCIAL',
    fixedCapitalPerTrade: 10000,
    initialCapital: 100000,
    stopModel: 'NONE',
    rsiMethod: 'WILDER',
    costsPerTrade: 0,
    slippagePct: 0,
    maxConcurrentPositions: 10,
    minDailyLiquidity: 500000
  });

  const EXPERIMENT_PRESETS = Object.freeze([
    {
      id: 'ifr2-extrema-5',
      name: 'IFR(2) ≤ 5 — Exaustão Extrema',
      description: 'Entrada apenas em quedas extremas de curtíssimo prazo com alta probabilidade de repique.',
      oversoldLevel: 5,
      shortMaPeriod: 7,
      longMaPeriod: 200,
      holdingPeriodSessions: 7
    },
    {
      id: 'ifr2-padrao-10',
      name: 'IFR(2) ≤ 10 — Padrão Oficial',
      description: 'Configuração canônica equilibrada do método para reversão à média.',
      oversoldLevel: 10,
      shortMaPeriod: 7,
      longMaPeriod: 200,
      holdingPeriodSessions: 7
    },
    {
      id: 'ifr2-moderada-15',
      name: 'IFR(2) ≤ 15 — Filtro Moderado',
      description: 'Mais oportunidades em correções moderadas dentro da tendência primária.',
      oversoldLevel: 15,
      shortMaPeriod: 7,
      longMaPeriod: 200,
      holdingPeriodSessions: 7
    },
    {
      id: 'ifr2-ampla-20',
      name: 'IFR(2) ≤ 20 — Filtro Amplo',
      description: 'Maior sensibilidade de entrada com volume superior de operações.',
      oversoldLevel: 20,
      shortMaPeriod: 7,
      longMaPeriod: 200,
      holdingPeriodSessions: 7
    }
  ]);

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

  /**
   * Resolve a lista de ativos a partir de um Map, Objeto ou lista fornecida.
   */
  function extractCandlesMap(candlesMapInput) {
    if (candlesMapInput instanceof Map) {
      return candlesMapInput;
    }
    const map = new Map();
    if (candlesMapInput && typeof candlesMapInput === 'object') {
      for (const [key, val] of Object.entries(candlesMapInput)) {
        if (Array.isArray(val)) {
          map.set(String(key).toUpperCase().trim(), val);
        }
      }
    }
    return map;
  }

  /**
   * Filtra o histórico de candles por período solicitado.
   */
  function filterCandlesByPeriod(candles, { period, startDate, endDate } = {}) {
    if (!Array.isArray(candles) || candles.length === 0) return [];

    let filtered = candles;
    const sDate = startDate ? toIsoDate(startDate) : null;
    const eDate = endDate ? toIsoDate(endDate) : null;

    if (sDate || eDate) {
      filtered = filtered.filter(c => {
        const t = toIsoDate(c.time || c.date);
        if (sDate && t < sDate) return false;
        if (eDate && t > eDate) return false;
        return true;
      });
    } else if (period && period !== 'ALL') {
      const numDays = Number(period);
      if (Number.isFinite(numDays) && numDays > 0) {
        // Pega as últimas numDays barras ou calendário
        if (filtered.length > numDays) {
          filtered = filtered.slice(-numDays);
        }
      }
    }

    return filtered;
  }

  /**
   * Executa a simulação de Volatility Trading (IFR2 Mean Reversion) em um universo completo de ativos.
   *
   * @param {Map|Object} candlesMap Dicionário de ativos { ticker: candles[] }
   * @param {Object} [options] Opções de execução, parâmetros e filtros
   * @returns {Object} Pacote completo do experimento com métricas e curva de equity
   */
  function simulateUniverse(candlesMap, options = {}) {
    const rawMap = extractCandlesMap(candlesMap);
    const symbols = options.symbols || Array.from(rawMap.keys());
    const metadataMap = options.metadataMap || {};

    const shortMaPeriod = Number(options.shortMaPeriod || DEFAULT_CONFIG.shortMaPeriod);
    const longMaPeriod = Number(options.longMaPeriod || DEFAULT_CONFIG.longMaPeriod);
    const rsiPeriod = Number(options.rsiPeriod || DEFAULT_CONFIG.rsiPeriod);
    const oversoldLevel = Number(options.oversoldLevel !== undefined ? options.oversoldLevel : DEFAULT_CONFIG.oversoldLevel);
    const holdingPeriodSessions = Number(options.holdingPeriodSessions || DEFAULT_CONFIG.holdingPeriodSessions);
    const fixedCapitalPerTrade = Number(options.fixedCapitalPerTrade || DEFAULT_CONFIG.fixedCapitalPerTrade);
    const initialCapital = Number(options.initialCapital || DEFAULT_CONFIG.initialCapital);
    const costsPerTrade = Number(options.costsPerTrade || DEFAULT_CONFIG.costsPerTrade);
    const slippagePct = Number(options.slippagePct || DEFAULT_CONFIG.slippagePct);
    const maxConcurrentPositions = Number(options.maxConcurrentPositions || DEFAULT_CONFIG.maxConcurrentPositions);
    const minDailyLiquidity = Number(options.minDailyLiquidity || DEFAULT_CONFIG.minDailyLiquidity);

    const universeName = options.universe || 'IBOV';
    const market = options.market || 'B3';
    const requestedPeriod = options.period || '120';
    const startDate = options.startDate ? toIsoDate(options.startDate) : null;
    const endDate = options.endDate ? toIsoDate(options.endDate) : null;

    // Prepara séries pré-calculadas com indicadores para cada ativo elegível
    const precomputed = new Map();
    let minDatasetDate = null;
    let maxDatasetDate = null;

    for (const sym of symbols) {
      const symKey = String(sym).toUpperCase().trim();
      const rawCandles = rawMap.get(symKey);
      if (!Array.isArray(rawCandles) || rawCandles.length < longMaPeriod) continue;

      const series = VolatilityTradingEngineModel.computeIndicators(rawCandles, {
        shortMaPeriod,
        longMaPeriod,
        rsiPeriod,
        rsiMethod: options.rsiMethod || 'WILDER'
      });

      if (series.length < longMaPeriod) continue;

      precomputed.set(symKey, {
        symbol: symKey,
        meta: metadataMap[symKey] || {},
        series
      });

      const firstDate = series[0]?.time;
      const lastDate = series[series.length - 1]?.time;
      if (firstDate && (!minDatasetDate || firstDate < minDatasetDate)) minDatasetDate = firstDate;
      if (lastDate && (!maxDatasetDate || lastDate > maxDatasetDate)) maxDatasetDate = lastDate;
    }

    // Coleta todas as datas de negociação ordenadas globalmente
    const allTradingDatesSet = new Set();
    for (const [, item] of precomputed) {
      for (let i = 0; i < item.series.length; i++) {
        const d = item.series[i].time;
        if (d) allTradingDatesSet.add(d);
      }
    }
    let allTradingDates = Array.from(allTradingDatesSet).sort();

    // Filtra pelo intervalo de datas configurado
    if (startDate) {
      allTradingDates = allTradingDates.filter(d => d >= startDate);
    }
    if (endDate) {
      allTradingDates = allTradingDates.filter(d => d <= endDate);
    }
    if (requestedPeriod && requestedPeriod !== 'ALL' && !startDate && !endDate) {
      const pNum = Number(requestedPeriod);
      if (Number.isFinite(pNum) && pNum > 0 && allTradingDates.length > pNum) {
        allTradingDates = allTradingDates.slice(-pNum);
      }
    }

    const effectiveStartDate = allTradingDates[0] || startDate || minDatasetDate;
    const effectiveEndDate = allTradingDates[allTradingDates.length - 1] || endDate || maxDatasetDate;

    // Estado da Simulação Cronológica
    let currentCash = initialCapital;
    let totalCostsIncurred = 0;
    let totalSlippageIncurred = 0;

    const openPositionsBySymbol = new Map(); // sym -> position
    const closedTrades = [];
    const openTrades = [];

    let peakEquity = initialCapital;
    let maxDrawdownPct = 0;
    let maxDrawdownAmount = 0;
    let maxConcurrentObserved = 0;
    let sumConcurrentSessions = 0;

    const equityCurve = [
      {
        date: effectiveStartDate || 'INÍCIO',
        equity: round2(initialCapital),
        cash: round2(currentCash),
        allocatedCapital: 0,
        openPositionsCount: 0,
        tradePnl: 0,
        drawdownPct: 0
      }
    ];

    // Mapa auxiliar: { symbol -> { date -> index } } para busca ultra-rápida
    const indexByDateMap = new Map();
    for (const [sym, item] of precomputed) {
      const dateMap = new Map();
      for (let idx = 0; idx < item.series.length; idx++) {
        dateMap.set(item.series[idx].time, idx);
      }
      indexByDateMap.set(sym, dateMap);
    }

    // Execução dia a dia ao longo das datas de negociação
    for (let dayIdx = 0; dayIdx < allTradingDates.length; dayIdx++) {
      const currentDate = allTradingDates[dayIdx];

      // 1. Processa saídas de posições em aberto no pregão atual
      const openSymbols = Array.from(openPositionsBySymbol.keys());
      for (const sym of openSymbols) {
        const pos = openPositionsBySymbol.get(sym);
        const assetInfo = precomputed.get(sym);
        const dateMap = indexByDateMap.get(sym);
        const barIdx = dateMap.get(currentDate);

        if (barIdx === undefined) continue; // Ativo sem pregão nesta data

        const currentBar = assetInfo.series[barIdx];

        // Se a data atual é a data da entrada (D0), não avalia saída antes do candle de entrada fechar
        if (currentDate === pos.entryDate) {
          // Atualiza marcação a mercado
          pos.lastDate = currentDate;
          pos.lastPrice = currentBar.close;
          continue;
        }

        // Incrementa sessões de permanência
        pos.holdingSessions++;

        // Verifica saídas:
        // A. Saída por Recuperação: Fechamento diário acima da SMA curta (Close > SMA7)
        // B. Saída Temporal: Atingiu o limite de permanência (D7)
        let isExiting = false;
        let exitReason = null;

        if (currentBar.close > currentBar.smaShort) {
          isExiting = true;
          exitReason = VolatilityTradingEngineModel.EXIT_REASONS.TARGET_MA_RECOVERY;
        } else if (pos.holdingSessions >= holdingPeriodSessions) {
          isExiting = true;
          exitReason = VolatilityTradingEngineModel.EXIT_REASONS.TIME_EXIT;
        }

        if (isExiting) {
          const rawExitPrice = currentBar.close;
          const slippageRate = slippagePct / 100;
          const effectiveExitPrice = round4(rawExitPrice * (1 - slippageRate));
          const grossProceeds = round2(pos.sharesQuantity * rawExitPrice);
          const netProceeds = round2(pos.sharesQuantity * effectiveExitPrice);

          const costFee = costsPerTrade;
          totalCostsIncurred += costFee;

          const slippageLoss = round2((rawExitPrice - effectiveExitPrice) * pos.sharesQuantity);
          totalSlippageIncurred += slippageLoss;

          const netPnl = round2(netProceeds - pos.allocatedCapital - costFee);
          const grossPnl = round2(grossProceeds - pos.rawAllocatedCapital);
          const returnPct = round2(((effectiveExitPrice - pos.effectiveEntryPrice) / pos.effectiveEntryPrice) * 100);

          currentCash = round2(currentCash + netProceeds - costFee);
          openPositionsBySymbol.delete(sym);

          let outcome = 'BREAKEVEN';
          if (netPnl > 0.005) outcome = 'WIN';
          else if (netPnl < -0.005) outcome = 'LOSS';

          closedTrades.push({
            id: `trade-${sym}-${pos.signalDate}`,
            symbol: sym,
            companyName: assetInfo.meta.name || sym,
            sector: assetInfo.meta.sector || 'Geral',
            strategyType: STRATEGY_TYPE,
            entrySetup: VolatilityTradingEngineModel.SETUP_NAME,
            signalDate: pos.signalDate,
            signalPrice: pos.signalPrice,
            signalIndicators: pos.signalIndicators,
            entryDate: pos.entryDate,
            entryPrice: pos.rawEntryPrice,
            executedEntryPrice: pos.effectiveEntryPrice,
            entryGapPct: pos.entryGapPct,
            sharesQuantity: pos.sharesQuantity,
            allocatedCapital: pos.allocatedCapital,
            exitDate: currentDate,
            exitPrice: rawExitPrice,
            executedExitPrice: effectiveExitPrice,
            exitReason,
            exitIndicators: {
              close: currentBar.close,
              smaShort: currentBar.smaShort,
              smaLong: currentBar.smaLong
            },
            holdingSessions: pos.holdingSessions,
            grossPnl,
            netPnl,
            returnPct,
            outcome,
            costsIncurred: round2(pos.entryCostFee + costFee),
            slippageIncurred: round2(pos.entrySlippageLoss + slippageLoss)
          });
        } else {
          pos.lastDate = currentDate;
          pos.lastPrice = currentBar.close;
        }
      }

      // 2. Avalia novos sinais gerados no fechamento da data atual (sinal confirmado para entrada em T+1)
      const potentialEntries = [];

      for (const [sym, assetInfo] of precomputed) {
        // Se já está posicionado no ativo, não avalia sinal para evitar posições duplicadas
        if (openPositionsBySymbol.has(sym)) continue;

        const dateMap = indexByDateMap.get(sym);
        const barIdx = dateMap.get(currentDate);
        if (barIdx === undefined || barIdx < longMaPeriod - 1) continue;

        const evalResult = VolatilityTradingEngineModel.evaluateSignal(assetInfo.series, barIdx, {
          shortMaPeriod,
          longMaPeriod,
          rsiPeriod,
          oversoldLevel,
          minFinancialVolume: minDailyLiquidity,
          symbol: sym,
          market
        });

        if (evalResult && evalResult.isValid) {
          // Verifica se há pregão seguinte na série do ativo
          if (barIdx + 1 < assetInfo.series.length) {
            const nextBar = assetInfo.series[barIdx + 1];
            potentialEntries.push({
              symbol: sym,
              signalBar: assetInfo.series[barIdx],
              nextBar,
              assetInfo,
              ifr: evalResult.indicators.ifr,
              indicators: evalResult.indicators
            });
          }
        }
      }

      // Ordena potenciais entradas por IFR crescente (ativos mais sobrevendidos têm prioridade de capital)
      potentialEntries.sort((a, b) => a.ifr - b.ifr);

      // 3. Executa as entradas elegíveis que couberem no limite de posições e caixa
      for (const cand of potentialEntries) {
        if (openPositionsBySymbol.size >= maxConcurrentPositions) break;
        if (currentCash < fixedCapitalPerTrade * 0.5) break; // Caixa insuficiente

        const rawEntryPrice = cand.nextBar.open;
        if (!rawEntryPrice || rawEntryPrice <= 0) continue;

        const slippageRate = slippagePct / 100;
        const effectiveEntryPrice = round4(rawEntryPrice * (1 + slippageRate));
        const sharesQuantity = Math.floor(fixedCapitalPerTrade / effectiveEntryPrice);

        if (sharesQuantity <= 0) continue;

        const effectiveAllocated = round2(sharesQuantity * effectiveEntryPrice);
        const rawAllocated = round2(sharesQuantity * rawEntryPrice);
        const costFee = costsPerTrade;

        if (currentCash < effectiveAllocated + costFee) continue;

        currentCash = round2(currentCash - effectiveAllocated - costFee);
        totalCostsIncurred += costFee;

        const slippageLoss = round2((effectiveEntryPrice - rawEntryPrice) * sharesQuantity);
        totalSlippageIncurred += slippageLoss;

        const entryGapPct = round2(((rawEntryPrice - cand.signalBar.close) / cand.signalBar.close) * 100);

        openPositionsBySymbol.set(cand.symbol, {
          symbol: cand.symbol,
          signalDate: cand.signalBar.time,
          signalPrice: cand.signalBar.close,
          signalIndicators: cand.indicators,
          entryDate: cand.nextBar.time,
          rawEntryPrice,
          effectiveEntryPrice,
          entryGapPct,
          sharesQuantity,
          rawAllocatedCapital: rawAllocated,
          allocatedCapital: effectiveAllocated,
          entryCostFee: costFee,
          entrySlippageLoss: slippageLoss,
          holdingSessions: 0, // D0
          lastDate: cand.nextBar.time,
          lastPrice: rawEntryPrice
        });
      }

      // 4. Marcação a Mercado no fim do dia e Curva de Equity
      const currentConcurrent = openPositionsBySymbol.size;
      if (currentConcurrent > maxConcurrentObserved) {
        maxConcurrentObserved = currentConcurrent;
      }
      sumConcurrentSessions += currentConcurrent;

      let totalOpenMarketValue = 0;
      for (const [, pos] of openPositionsBySymbol) {
        const mktPrice = pos.lastPrice || pos.rawEntryPrice;
        totalOpenMarketValue += pos.sharesQuantity * mktPrice;
      }

      const totalEquity = round2(currentCash + totalOpenMarketValue);
      if (totalEquity > peakEquity) {
        peakEquity = totalEquity;
      }

      const currentDrawdownAmount = round2(peakEquity - totalEquity);
      const currentDrawdownPct = peakEquity > 0 ? round2(((peakEquity - totalEquity) / peakEquity) * 100) : 0;

      if (currentDrawdownPct > maxDrawdownPct) {
        maxDrawdownPct = currentDrawdownPct;
      }
      if (currentDrawdownAmount > maxDrawdownAmount) {
        maxDrawdownAmount = currentDrawdownAmount;
      }

      // Amostra a curva de capital em marcos importantes ou no encerramento diário
      equityCurve.push({
        date: currentDate,
        equity: totalEquity,
        cash: round2(currentCash),
        allocatedCapital: round2(totalOpenMarketValue),
        openPositionsCount: currentConcurrent,
        tradePnl: 0,
        drawdownPct: currentDrawdownPct
      });
    }

    // Registra trades que permaneceram em aberto no fim do período
    for (const [sym, pos] of openPositionsBySymbol) {
      const assetInfo = precomputed.get(sym);
      const currentPrice = pos.lastPrice || pos.rawEntryPrice;
      const unrealizedPnl = round2(pos.sharesQuantity * (currentPrice - pos.effectiveEntryPrice));
      const unrealizedReturnPct = round2(((currentPrice - pos.effectiveEntryPrice) / pos.effectiveEntryPrice) * 100);

      openTrades.push({
        id: `trade-open-${sym}-${pos.signalDate}`,
        symbol: sym,
        companyName: assetInfo?.meta?.name || sym,
        sector: assetInfo?.meta?.sector || 'Geral',
        strategyType: STRATEGY_TYPE,
        entrySetup: VolatilityTradingEngineModel.SETUP_NAME,
        signalDate: pos.signalDate,
        signalPrice: pos.signalPrice,
        entryDate: pos.entryDate,
        entryPrice: pos.rawEntryPrice,
        executedEntryPrice: pos.effectiveEntryPrice,
        entryGapPct: pos.entryGapPct,
        sharesQuantity: pos.sharesQuantity,
        allocatedCapital: pos.allocatedCapital,
        holdingSessions: pos.holdingSessions,
        currentPrice,
        unrealizedPnl,
        unrealizedReturnPct,
        status: 'OPEN'
      });
    }

    // Consolidação Estatística Completa
    const winningTrades = closedTrades.filter(t => t.outcome === 'WIN');
    const losingTrades = closedTrades.filter(t => t.outcome === 'LOSS');
    const breakevenTrades = closedTrades.filter(t => t.outcome === 'BREAKEVEN');

    const totalTradesCount = closedTrades.length;
    const winRatePct = totalTradesCount > 0 ? round2((winningTrades.length / totalTradesCount) * 100) : 0;
    const lossRatePct = totalTradesCount > 0 ? round2((losingTrades.length / totalTradesCount) * 100) : 0;

    const totalGrossProfit = round2(winningTrades.reduce((acc, t) => acc + t.netPnl, 0));
    const totalGrossLoss = round2(Math.abs(losingTrades.reduce((acc, t) => acc + t.netPnl, 0)));
    const netProfit = round2(totalGrossProfit - totalGrossLoss);

    const profitFactor = totalGrossLoss > 0
      ? round2(totalGrossProfit / totalGrossLoss)
      : (totalGrossProfit > 0 ? 999 : 0);

    const avgTradeReturnPct = totalTradesCount > 0
      ? round2(closedTrades.reduce((acc, t) => acc + t.returnPct, 0) / totalTradesCount)
      : 0;

    const avgWinPct = winningTrades.length > 0
      ? round2(winningTrades.reduce((acc, t) => acc + t.returnPct, 0) / winningTrades.length)
      : 0;

    const avgLossPct = losingTrades.length > 0
      ? round2(losingTrades.reduce((acc, t) => acc + t.returnPct, 0) / losingTrades.length)
      : 0;

    const avgWinAmount = winningTrades.length > 0
      ? round2(totalGrossProfit / winningTrades.length)
      : 0;

    const avgLossAmount = losingTrades.length > 0
      ? round2(totalGrossLoss / losingTrades.length)
      : 0;

    const payoffRatio = Math.abs(avgLossPct) > 0 ? round2(avgWinPct / Math.abs(avgLossPct)) : (avgWinPct > 0 ? 99 : 0);

    // Expectativa matemática: E = (WinRate * AvgWin) - (LossRate * AvgLoss)
    const expectancyPct = round2((winRatePct / 100 * avgWinPct) - (lossRatePct / 100 * Math.abs(avgLossPct)));
    const expectancyAmount = totalTradesCount > 0 ? round2(netProfit / totalTradesCount) : 0;

    const avgHoldingSessions = totalTradesCount > 0
      ? round2(closedTrades.reduce((acc, t) => acc + t.holdingSessions, 0) / totalTradesCount)
      : 0;

    // Maior perda e maior ganho
    let worstTradeLossPct = 0;
    let worstTradeLossAmount = 0;
    let bestTradeGainPct = 0;
    let bestTradeGainAmount = 0;

    for (const t of closedTrades) {
      if (t.returnPct < worstTradeLossPct) worstTradeLossPct = t.returnPct;
      if (t.netPnl < worstTradeLossAmount) worstTradeLossAmount = t.netPnl;
      if (t.returnPct > bestTradeGainPct) bestTradeGainPct = t.returnPct;
      if (t.netPnl > bestTradeGainAmount) bestTradeGainAmount = t.netPnl;
    }

    const avgConcurrentPositions = allTradingDates.length > 0
      ? round2(sumConcurrentSessions / allTradingDates.length)
      : 0;

    const maxCapitalExposure = round2(maxConcurrentObserved * fixedCapitalPerTrade);

    const exitsBreakdown = {
      [VolatilityTradingEngineModel.EXIT_REASONS.TARGET_MA_RECOVERY]: closedTrades.filter(t => t.exitReason === VolatilityTradingEngineModel.EXIT_REASONS.TARGET_MA_RECOVERY).length,
      [VolatilityTradingEngineModel.EXIT_REASONS.TIME_EXIT]: closedTrades.filter(t => t.exitReason === VolatilityTradingEngineModel.EXIT_REASONS.TIME_EXIT).length,
      [VolatilityTradingEngineModel.EXIT_REASONS.STOP_LOSS]: closedTrades.filter(t => t.exitReason === VolatilityTradingEngineModel.EXIT_REASONS.STOP_LOSS).length
    };

    const isSampleSizeInsufficient = totalTradesCount < MIN_SAMPLE_SIZE;
    const sampleSizeWarning = isSampleSizeInsufficient
      ? `Atenção: Amostra estatística reduzida (${totalTradesCount} trades < ${MIN_SAMPLE_SIZE}). Os resultados possuem menor significância estatística.`
      : `Amostra robusta com ${totalTradesCount} operações concluídas (≥ ${MIN_SAMPLE_SIZE}).`;

    const configSnapshot = {
      shortMaPeriod,
      longMaPeriod,
      rsiPeriod,
      oversoldLevel,
      holdingPeriodSessions,
      positionSizingModel: 'FIXED_FINANCIAL',
      fixedCapitalPerTrade,
      initialCapital,
      stopModel: 'NONE',
      rsiMethod: options.rsiMethod || 'WILDER',
      costsPerTrade,
      slippagePct,
      maxConcurrentPositions,
      minDailyLiquidity,
      profileId: options.profileId || null,
      profileVersion: options.profileVersion || '1.0'
    };

    const configHash = StrategyConfigurationModel && typeof StrategyConfigurationModel.computeParametersHash === 'function'
      ? StrategyConfigurationModel.computeParametersHash(configSnapshot)
      : null;

    return {
      strategyType: STRATEGY_TYPE,
      simulatorVersion: SIMULATOR_VERSION,
      executedAt: new Date().toISOString(),
      metadata: {
        experimentName: options.name || `IFR(2) ≤ ${oversoldLevel} (${universeName})`,
        universe: universeName,
        market,
        period: {
          label: requestedPeriod,
          startDate: effectiveStartDate,
          endDate: effectiveEndDate,
          totalTradingSessions: allTradingDates.length
        },
        dataSource: options.dataSource || 'B3/COTAHIST v2026-10',
        executionModel: 'NEXT_OPEN_WITH_GAP',
        config: configSnapshot,
        configHash
      },
      metrics: {
        totalTrades: totalTradesCount,
        openTradesCount: openTrades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        breakevenTrades: breakevenTrades.length,
        winRatePct,
        lossRatePct,
        profitFactor,
        netProfit,
        totalGrossProfit,
        totalGrossLoss,
        avgTradeReturnPct,
        avgWinPct,
        avgLossPct,
        avgWinAmount,
        avgLossAmount,
        payoffRatio,
        expectancyPct,
        expectancyAmount,
        avgHoldingSessions,
        worstTradeLossPct: round2(worstTradeLossPct),
        worstTradeLossAmount: round2(worstTradeLossAmount),
        bestTradeGainPct: round2(bestTradeGainPct),
        bestTradeGainAmount: round2(bestTradeGainAmount),
        maxDrawdownPct: round2(maxDrawdownPct),
        maxDrawdownAmount: round2(maxDrawdownAmount),
        maxConcurrentPositions: maxConcurrentObserved,
        avgConcurrentPositions,
        maxCapitalExposure,
        totalCosts: round2(totalCostsIncurred),
        totalSlippage: round2(totalSlippageIncurred),
        exitsBreakdown,
        sampleSizeAlert: isSampleSizeInsufficient,
        sampleSizeWarning
      },
      trades: closedTrades,
      openTrades,
      equityCurve
    };
  }

  /**
   * Executa e compara múltiplos experimentos / variantes de parâmetros lado a lado.
   *
   * @param {Map|Object} candlesMap Dicionário de ativos
   * @param {Array} [variants] Lista de perfis/parâmetros variantes para teste (ex: IFR 5, 10, 15, 20)
   * @param {Object} [baseOptions] Opções base compartilhadas (universo, período, capital, etc.)
   * @returns {Object} Matriz comparativa dos experimentos
   */
  function compareExperiments(candlesMap, variants = null, baseOptions = {}) {
    const listVariants = Array.isArray(variants) && variants.length > 0
      ? variants
      : EXPERIMENT_PRESETS;

    const results = [];
    for (const variant of listVariants) {
      const mergedOptions = {
        ...baseOptions,
        ...variant,
        name: variant.name || baseOptions.name,
        profileId: variant.id || variant.profileId || baseOptions.profileId,
        oversoldLevel: variant.oversoldLevel !== undefined ? variant.oversoldLevel : (baseOptions.oversoldLevel || 10)
      };

      const simResult = simulateUniverse(candlesMap, mergedOptions);
      results.push({
        id: variant.id || `var-${variant.oversoldLevel}`,
        name: variant.name || `IFR(2) ≤ ${variant.oversoldLevel}`,
        oversoldLevel: variant.oversoldLevel,
        parameters: simResult.metadata.config,
        metrics: simResult.metrics,
        tradesCount: simResult.metrics.totalTrades,
        winRatePct: simResult.metrics.winRatePct,
        profitFactor: simResult.metrics.profitFactor,
        expectancyPct: simResult.metrics.expectancyPct,
        netProfit: simResult.metrics.netProfit,
        maxDrawdownPct: simResult.metrics.maxDrawdownPct,
        avgHoldingSessions: simResult.metrics.avgHoldingSessions,
        sampleSizeAlert: simResult.metrics.sampleSizeAlert
      });
    }

    // Identifica os melhores desempenhos por critério
    let bestWinRate = null;
    let bestProfitFactor = null;
    let bestExpectancy = null;
    let bestNetProfit = null;

    for (const r of results) {
      if (!bestWinRate || r.winRatePct > bestWinRate.winRatePct) bestWinRate = r;
      if (!bestProfitFactor || r.profitFactor > bestProfitFactor.profitFactor) bestProfitFactor = r;
      if (!bestExpectancy || r.expectancyPct > bestExpectancy.expectancyPct) bestExpectancy = r;
      if (!bestNetProfit || r.netProfit > bestNetProfit.netProfit) bestNetProfit = r;
    }

    return {
      strategyType: STRATEGY_TYPE,
      simulatorVersion: SIMULATOR_VERSION,
      comparedAt: new Date().toISOString(),
      variantsCount: results.length,
      bestVariants: {
        bestWinRate: bestWinRate ? { id: bestWinRate.id, name: bestWinRate.name, value: bestWinRate.winRatePct } : null,
        bestProfitFactor: bestProfitFactor ? { id: bestProfitFactor.id, name: bestProfitFactor.name, value: bestProfitFactor.profitFactor } : null,
        bestExpectancy: bestExpectancy ? { id: bestExpectancy.id, name: bestExpectancy.name, value: bestExpectancy.expectancyPct } : null,
        bestNetProfit: bestNetProfit ? { id: bestNetProfit.id, name: bestNetProfit.name, value: bestNetProfit.netProfit } : null
      },
      results
    };
  }

  /**
   * Gerador de dados OHLC sintéticos para testes rigorosos de casos limites.
   */
  function generateSyntheticDataset() {
    // 1. Gera base com 200 candles de tendência de alta estável para servir de warmup (SMA200)
    const baseCandles = [];
    let p = 20.00;
    const startYear = 2025;
    let month = 1;
    let day = 1;

    for (let i = 0; i < 210; i++) {
      p += 0.05; // Leve tendência ascendente
      const mStr = String(month).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      baseCandles.push({
        time: `${startYear}-${mStr}-${dStr}`,
        open: round2(p - 0.02),
        high: round2(p + 0.10),
        low: round2(p - 0.10),
        close: round2(p),
        volume: 2000000,
        trades: 500
      });

      day++;
      if (day > 28) {
        day = 1;
        month++;
        if (month > 12) {
          month = 1;
        }
      }
    }

    return baseCandles;
  }

  /**
   * Auditoria de integridade de uma simulação (sem look-ahead, preços dentro dos candles, etc.).
   */
  function auditSimulationIntegrity(simResult) {
    const issues = [];
    if (!simResult) {
      return { isValid: false, issues: ['Resultado de simulação nulo ou indefinido.'] };
    }

    const { trades = [], metrics = {} } = simResult;

    // 1. Validação de trades concluídos
    for (const t of trades) {
      if (!t.symbol) issues.push(`Trade ${t.id} sem símbolo.`);
      if (!t.signalDate) issues.push(`Trade ${t.id} sem data de sinal.`);
      if (!t.entryDate) issues.push(`Trade ${t.id} sem data de entrada.`);
      if (!t.exitDate) issues.push(`Trade ${t.id} sem data de saída.`);

      if (t.signalDate >= t.entryDate) {
        issues.push(`Trade ${t.symbol} violou integridade temporal: sinal (${t.signalDate}) deve preceder entrada (${t.entryDate}).`);
      }
      if (t.entryDate > t.exitDate) {
        issues.push(`Trade ${t.symbol} violou integridade temporal: entrada (${t.entryDate}) após saída (${t.exitDate}).`);
      }
      if (!t.executedEntryPrice || t.executedEntryPrice <= 0) {
        issues.push(`Trade ${t.symbol} possui preço de entrada inválido: ${t.executedEntryPrice}`);
      }
      if (!t.executedExitPrice || t.executedExitPrice <= 0) {
        issues.push(`Trade ${t.symbol} possui preço de saída inválido: ${t.executedExitPrice}`);
      }
      if (t.holdingSessions < 1) {
        issues.push(`Trade ${t.symbol} possui holdingSessions inválido: ${t.holdingSessions}`);
      }
    }

    // 2. Validação de consistência matemática dos totais
    const computedWinners = trades.filter(t => t.outcome === 'WIN').length;
    const computedLosers = trades.filter(t => t.outcome === 'LOSS').length;

    if (computedWinners !== metrics.winningTrades) {
      issues.push(`Divergência na contagem de vencedores: ${computedWinners} vs ${metrics.winningTrades}`);
    }
    if (computedLosers !== metrics.losingTrades) {
      issues.push(`Divergência na contagem de perdedores: ${computedLosers} vs ${metrics.losingTrades}`);
    }

    const computedNetProfit = round2(trades.reduce((acc, t) => acc + (t.netPnl || 0), 0));
    if (Math.abs(computedNetProfit - metrics.netProfit) > 0.05) {
      issues.push(`Divergência de lucro líquido: soma de trades (${computedNetProfit}) vs métrica consolidada (${metrics.netProfit})`);
    }

    return {
      isValid: issues.length === 0,
      tradesAudited: trades.length,
      issues
    };
  }

  return Object.freeze({
    STRATEGY_TYPE,
    SIMULATOR_VERSION,
    MIN_SAMPLE_SIZE,
    DEFAULT_CONFIG,
    EXPERIMENT_PRESETS,
    round2,
    round4,
    toIsoDate,
    extractCandlesMap,
    filterCandlesByPeriod,
    simulateUniverse,
    compareExperiments,
    generateSyntheticDataset,
    auditSimulationIntegrity
  });
});
