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
  let SqnModel = null;
  try {
    SqnModel = typeof module === 'object' && module.exports
      ? require('./system-quality-analytics-model')
      : (root && (root.SystemQualityAnalyticsModel || root.SystemQualityAnalytics));
  } catch (_) {
    SqnModel = null;
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = factory(VolatilityEngine, LiquidityGate, StrategyConfig, SqnModel);
  } else {
    root.VolatilityTradeSimulatorModel = factory(VolatilityEngine, LiquidityGate, StrategyConfig, SqnModel);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (VolatilityTradingEngineModel, LiquidityGateModel, StrategyConfigurationModel, SystemQualityAnalyticsModel) {
  'use strict';

  const STRATEGY_TYPE = 'VOLATILITY_TRADING';
  const SIMULATOR_VERSION = 'volatility-sim-v1.0';
  const MIN_SAMPLE_SIZE = 30;

  const OFFICIAL_EXTREME_EVENTS_CALENDAR = Object.freeze([
    {
      id: 'br-presidential-2022-r1',
      name: 'Eleições Presidenciais do Brasil 2022 — 1º Turno',
      eventDate: '2022-10-02',
      category: 'PRESIDENTIAL_ELECTION',
      marketScope: 'B3',
      justification: 'Risco binário eleitoral com potencial de gap severo na abertura pós-pleito.'
    },
    {
      id: 'br-presidential-2022-r2',
      name: 'Eleições Presidenciais do Brasil 2022 — 2º Turno',
      eventDate: '2022-10-30',
      category: 'PRESIDENTIAL_ELECTION',
      marketScope: 'B3',
      justification: 'Definição presidencial com alta incerteza macroeconômica e descontinuidade de preço.'
    },
    {
      id: 'br-presidential-2026-r1',
      name: 'Eleições Presidenciais do Brasil 2026 — 1º Turno',
      eventDate: '2026-10-04',
      category: 'PRESIDENTIAL_ELECTION',
      marketScope: 'B3',
      justification: 'Evento eleitoral nacional monitorado preventivamente pelo protocolo de risco.'
    },
    {
      id: 'br-presidential-2026-r2',
      name: 'Eleições Presidenciais do Brasil 2026 — 2º Turno',
      eventDate: '2026-10-25',
      category: 'PRESIDENTIAL_ELECTION',
      marketScope: 'B3',
      justification: 'Segundo turno presidencial monitorado preventivamente pelo protocolo de risco.'
    }
  ]);

  const DEFAULT_CONFIG = Object.freeze({
    shortMaPeriod: 7,
    longMaPeriod: 200,
    indicator: 'IFR',
    rsiPeriod: 2,
    oversoldLevel: 10,
    holdingPeriodSessions: 7,
    positionSizingModel: 'FIXED_FINANCIAL',
    fixedCapitalPerTrade: 10000,
    equityPercentPerTrade: 10,
    initialCapital: 100000,
    stopModel: 'NONE',
    rsiMethod: 'WILDER',
    exitExecutionTiming: 'SAME_CLOSE',
    rsFilterMode: 'NONE',
    financialRiskUnitMode: 'PERCENT_OF_POSITION',
    financialRiskUnitValue: 5,
    extremeEventProtectionEnabled: true,
    costsPerTrade: 0,
    slippagePct: 0,
    maxConcurrentPositions: 10,
    minDailyLiquidity: 500000,
    liquidityWindowSessions: 21,
    minDailyTrades: 500
  });

  const EXPERIMENT_PRESETS = Object.freeze([
    {
      id: 'ifr2-extrema-5',
      name: 'IFR(2) ≤ 5 — Exaustão Extrema',
      description: 'Entrada apenas em quedas extremas de curtíssimo prazo com alta probabilidade de repique.',
      oversoldLevel: 5,
      shortMaPeriod: 7,
      longMaPeriod: 200,
      holdingPeriodSessions: 7,
      rsFilterMode: 'NONE'
    },
    {
      id: 'ifr2-padrao-10',
      name: 'IFR(2) ≤ 10 — Padrão Oficial',
      description: 'Configuração canônica equilibrada do método para reversão à média.',
      oversoldLevel: 10,
      shortMaPeriod: 7,
      longMaPeriod: 200,
      holdingPeriodSessions: 7,
      rsFilterMode: 'NONE'
    },
    {
      id: 'ifr2-moderada-15',
      name: 'IFR(2) ≤ 15 — Filtro Moderado',
      description: 'Mais oportunidades em correções moderadas dentro da tendência primária.',
      oversoldLevel: 15,
      shortMaPeriod: 7,
      longMaPeriod: 200,
      holdingPeriodSessions: 7,
      rsFilterMode: 'NONE'
    },
    {
      id: 'ifr2-ampla-20',
      name: 'IFR(2) ≤ 20 — Filtro Amplo',
      description: 'Maior sensibilidade de entrada com volume superior de operações.',
      oversoldLevel: 20,
      shortMaPeriod: 7,
      longMaPeriod: 200,
      holdingPeriodSessions: 7,
      rsFilterMode: 'NONE'
    }
  ]);

  const RS_EXPERIMENT_PRESETS = Object.freeze([
    {
      id: 'rs-none',
      name: 'Sem Filtro de RS (Padrão)',
      description: 'Avalia puramente exaustão de IFR(2) acima da SMA(200) sem restrição de Força Relativa.',
      rsFilterMode: 'NONE'
    },
    {
      id: 'rs-positive',
      name: 'Com Filtro RS Positiva',
      description: 'Exige que o ativo apresente Força Relativa positiva (RS ≥ 50 ou retorno trimestral positivo) na data do sinal.',
      rsFilterMode: 'RS_POSITIVE'
    },
    {
      id: 'rs-rising',
      name: 'Com Filtro RS Crescente',
      description: 'Exige que a Força Relativa do ativo esteja em aceleração (RS atual > RS de 5 pregões atrás).',
      rsFilterMode: 'RS_RISING'
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

  function formatR(val) {
    if (val === null || val === undefined || Number.isNaN(Number(val))) return '—';
    const num = Number(val);
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(2).replace('.', ',')}R`;
  }

  /**
   * Identifica as datas de pregão imediatamente anteriores aos eventos extremos monitorados.
   */
  function resolvePreEventTradingDates(allTradingDates, calendar = OFFICIAL_EXTREME_EVENTS_CALENDAR) {
    const preEventMap = new Map(); // tradingDate -> eventObj
    if (!Array.isArray(allTradingDates) || allTradingDates.length === 0 || !Array.isArray(calendar)) {
      return preEventMap;
    }

    for (const evt of calendar) {
      const evtIso = toIsoDate(evt && evt.eventDate);
      if (!evtIso) continue;
      // Encontra o último pregão estritamente anterior à data do evento (advanceSessions = 1)
      let preDate = null;
      for (let i = allTradingDates.length - 1; i >= 0; i--) {
        if (allTradingDates[i] < evtIso) {
          preDate = allTradingDates[i];
          break;
        }
      }
      if (preDate) {
        // Só registra se a distância entre o último pregão e o evento for de até 7 dias corridos
        const diffDays = (new Date(evtIso + 'T12:00:00Z').getTime() - new Date(preDate + 'T12:00:00Z').getTime()) / 86400000;
        if (diffDays >= 0 && diffDays <= 7) {
          preEventMap.set(preDate, evt);
        }
      }
    }
    return preEventMap;
  }

  /**
   * Classifica o regime de mercado (BULL, SIDEWAYS, CORRECTION) para cada data com base na média
   * estrutural e curta dos ativos do universo ou índice de referência.
   */
  function classifyMarketRegimeOnBar(bar) {
    if (!bar || !Number.isFinite(bar.close)) return 'SIDEWAYS';
    const close = bar.close;
    const smaShort = bar.smaShort;
    const smaLong = bar.smaLong;
    const rsScore = bar.rsScore;

    if (Number.isFinite(smaLong) && close < smaLong) {
      return 'CORRECTION';
    }
    if (Number.isFinite(smaLong) && close > smaLong * 1.06 && (rsScore === null || rsScore >= 52)) {
      return 'BULL';
    }
    if (Number.isFinite(smaShort) && Number.isFinite(smaLong) && smaShort < smaLong * 1.015) {
      return 'CORRECTION';
    }
    return 'SIDEWAYS';
  }

  /**
   * Executa a simulação de Volatility Trading (IFR2 Mean Reversion) em um universo completo de ativos.
   *
   * @param {Map|Object} candlesMap Dicionário de ativos { ticker: candles[] }
   * @param {Object} [options] Opções de execução, parâmetros e filtros
   * @returns {Object} Pacote completo do experimento com as 20 métricas, breakdowns e curva de equity
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
    const positionSizingModel = String(options.positionSizingModel || DEFAULT_CONFIG.positionSizingModel).toUpperCase();
    const fixedCapitalPerTrade = Number(options.fixedCapitalPerTrade || DEFAULT_CONFIG.fixedCapitalPerTrade);
    const equityPercentPerTrade = Number(options.equityPercentPerTrade || DEFAULT_CONFIG.equityPercentPerTrade);
    const initialCapital = Number(options.initialCapital || DEFAULT_CONFIG.initialCapital);
    const costsPerTrade = Number(options.costsPerTrade || DEFAULT_CONFIG.costsPerTrade);
    const slippagePct = Number(options.slippagePct || DEFAULT_CONFIG.slippagePct);
    const maxConcurrentPositions = Number(options.maxConcurrentPositions || DEFAULT_CONFIG.maxConcurrentPositions);
    const minDailyLiquidity = Number(options.minDailyLiquidity || options.minFinancialVolume || DEFAULT_CONFIG.minDailyLiquidity);
    const liquidityWindowSessions = Number(options.liquidityWindowSessions || DEFAULT_CONFIG.liquidityWindowSessions);
    const minDailyTrades = Number(options.minDailyTrades !== undefined ? options.minDailyTrades : DEFAULT_CONFIG.minDailyTrades);
    const exitExecutionTiming = String(options.exitExecutionTiming || DEFAULT_CONFIG.exitExecutionTiming).toUpperCase();
    const rsFilterMode = String(options.rsFilterMode || DEFAULT_CONFIG.rsFilterMode).toUpperCase();
    const financialRiskUnitMode = String(options.financialRiskUnitMode || DEFAULT_CONFIG.financialRiskUnitMode).toUpperCase();
    const financialRiskUnitValue = Number(options.financialRiskUnitValue !== undefined ? options.financialRiskUnitValue : DEFAULT_CONFIG.financialRiskUnitValue);
    const extremeEventProtectionEnabled = options.extremeEventProtectionEnabled !== false;
    const extremeEventsCalendar = Array.isArray(options.extremeEventsCalendar)
      ? options.extremeEventsCalendar
      : OFFICIAL_EXTREME_EVENTS_CALENDAR;

    const universeName = options.universe || 'IBOV';
    const market = options.market || 'B3';
    const requestedPeriod = options.period || '120';
    const startDate = options.startDate ? toIsoDate(options.startDate) : null;
    const endDate = options.endDate ? toIsoDate(options.endDate) : null;
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
    const perfStart = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();

    // Prepara séries pré-calculadas com indicadores para cada ativo elegível
    const precomputed = new Map();
    let minDatasetDate = null;
    let maxDatasetDate = null;
    let skippedAssetsCount = 0;

    for (const sym of symbols) {
      try {
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
      } catch {
        skippedAssetsCount++;
      }
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

    // Resolve datas de véspera de Eventos Extremos
    const preEventMap = extremeEventProtectionEnabled
      ? resolvePreEventTradingDates(allTradingDates, extremeEventsCalendar)
      : new Map();
    const preEventBlockedDates = new Set(preEventMap.keys());

    // Estado da Simulação Cronológica
    let currentCash = initialCapital;
    let currentTotalEquity = initialCapital;
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
    let sessionsWithAllocatedCapital = 0;
    let sumAllocatedRatio = 0;

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

    // Mapa auxiliar: { symbol -> { date -> index } } para busca ultra-rápida (reutiliza índice pré-calculado na série)
    const indexByDateMap = new Map();
    for (const [sym, item] of precomputed) {
      let dateMap = item.series._dateIndexMap;
      if (!dateMap) {
        dateMap = new Map();
        for (let idx = 0; idx < item.series.length; idx++) {
          dateMap.set(item.series[idx].time, idx);
        }
        Object.defineProperty(item.series, '_dateIndexMap', { value: dateMap, enumerable: false });
      }
      indexByDateMap.set(sym, dateMap);
    }

    function finalizePositionClose(sym, pos, assetInfo, currentBar, barIdx, currentDate, exitReason, useOpenPrice, extremeEventObj = null) {
      const rawExitPrice = useOpenPrice ? currentBar.open : currentBar.close;
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

      const minLow = Math.min(pos.minLowPrice, useOpenPrice ? currentBar.open : currentBar.low);
      const maxHigh = Math.max(pos.maxHighPrice, useOpenPrice ? currentBar.open : currentBar.high);
      const maePct = round2(Math.min(0, ((minLow - pos.effectiveEntryPrice) / pos.effectiveEntryPrice) * 100));
      const mfePct = round2(Math.max(0, ((maxHigh - pos.effectiveEntryPrice) / pos.effectiveEntryPrice) * 100));
      const maeAmount = round2(pos.sharesQuantity * Math.min(0, minLow - pos.effectiveEntryPrice));
      const mfeAmount = round2(pos.sharesQuantity * Math.max(0, maxHigh - pos.effectiveEntryPrice));

      // Unidade de Risco Financeiro para cálculo de R e SQN (Seção 6.1)
      let financialRiskUnitCash = null;
      let resultR = null;
      let hasExplicitFinancialRiskUnit = false;
      if (financialRiskUnitMode === 'PERCENT_OF_POSITION' && financialRiskUnitValue > 0) {
        financialRiskUnitCash = round2(pos.allocatedCapital * (financialRiskUnitValue / 100));
      } else if (financialRiskUnitMode === 'FIXED_CASH' && financialRiskUnitValue > 0) {
        financialRiskUnitCash = round2(financialRiskUnitValue);
      }
      if (financialRiskUnitCash && financialRiskUnitCash > 0) {
        resultR = round2(netPnl / financialRiskUnitCash);
        hasExplicitFinancialRiskUnit = true;
      }

      // Contrafactual caso saída tenha sido por Evento Extremo (Seção 11)
      let avoidedLossAmount = 0;
      let avoidedLossR = 0;
      if (exitReason === VolatilityTradingEngineModel.EXIT_REASONS.EXTREME_EVENT_EXIT && barIdx + 1 < assetInfo.series.length) {
        const postEventBar = assetInfo.series[barIdx + 1];
        const postEventPrice = postEventBar.close || postEventBar.open || rawExitPrice;
        const hypotheticalPnl = round2(pos.sharesQuantity * (postEventPrice - pos.effectiveEntryPrice) - costFee);
        avoidedLossAmount = round2(netPnl - hypotheticalPnl);
        if (financialRiskUnitCash && financialRiskUnitCash > 0) {
          avoidedLossR = round2(avoidedLossAmount / financialRiskUnitCash);
        }
      }

      const signalExitClose = pos.pendingExit ? pos.pendingExit.signalClose : currentBar.close;
      const exitGapPct = useOpenPrice && signalExitClose > 0
        ? round2(((rawExitPrice - signalExitClose) / signalExitClose) * 100)
        : 0;

      closedTrades.push({
        id: `trade-${sym}-${pos.signalDate}`,
        symbol: sym,
        companyName: assetInfo.meta.name || sym,
        sector: assetInfo.meta.sector || 'Geral',
        strategyType: STRATEGY_TYPE,
        entrySetup: VolatilityTradingEngineModel.SETUP_NAME,
        triggerName: `IFR(${rsiPeriod}) ≤ ${oversoldLevel}`,
        signalDate: pos.signalDate,
        signalPrice: pos.signalPrice,
        signalIndicators: pos.signalIndicators,
        validatedConditions: pos.validatedConditions || [],
        marketRegime: pos.marketRegime || 'SIDEWAYS',
        entryDate: pos.entryDate,
        entryPrice: pos.rawEntryPrice,
        executedEntryPrice: pos.effectiveEntryPrice,
        entryGapPct: pos.entryGapPct,
        sharesQuantity: pos.sharesQuantity,
        allocatedCapital: pos.allocatedCapital,
        exitSignalDate: pos.pendingExit ? pos.pendingExit.signalDate : currentDate,
        exitDate: currentDate,
        exitPrice: rawExitPrice,
        executedExitPrice: effectiveExitPrice,
        exitGapPct,
        exitReason,
        exitExecutionTiming,
        extremeEventName: extremeEventObj ? extremeEventObj.name : null,
        avoidedLossAmount,
        avoidedLossR,
        exitIndicators: pos.pendingExit ? pos.pendingExit.signalIndicators : {
          close: currentBar.close,
          smaShort: currentBar.smaShort,
          smaLong: currentBar.smaLong
        },
        holdingSessions: pos.holdingSessions,
        durationDays: pos.holdingSessions,
        maePct,
        mfePct,
        maeAmount,
        mfeAmount,
        grossPnl,
        netPnl,
        netPnL: netPnl,
        returnPct,
        financialRiskUnitCash,
        resultR,
        netResultR: resultR,
        hasExplicitFinancialRiskUnit,
        outcome,
        status: outcome === 'WIN' ? 'CLOSED_GAIN' : (outcome === 'LOSS' ? 'CLOSED_LOSS' : 'CLOSED_BE'),
        costsIncurred: round2(pos.entryCostFee + costFee),
        slippageIncurred: round2(pos.entrySlippageLoss + slippageLoss)
      });
    }

    const totalSessionsToScan = allTradingDates.length;

    // Execução dia a dia ao longo das datas de negociação
    for (let dayIdx = 0; dayIdx < totalSessionsToScan; dayIdx++) {
      const currentDate = allTradingDates[dayIdx];
      if (onProgress && (dayIdx === 0 || dayIdx === totalSessionsToScan - 1 || dayIdx % 50 === 0)) {
        try {
          const nowMs = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
          onProgress({
            phase: 'SIMULATE_TRADES',
            sessionsProcessed: dayIdx + 1,
            totalSessions: totalSessionsToScan,
            assetsCount: precomputed.size,
            executedCount: closedTrades.length + openPositionsBySymbol.size,
            elapsedMs: round2(nowMs - perfStart),
            progressPct: totalSessionsToScan > 0 ? Math.round(((dayIdx + 1) / totalSessionsToScan) * 100) : 100
          });
        } catch {
          // Não interrompe simulação caso callback de progresso falhe
        }
      }
      const extremeEventForToday = preEventMap.get(currentDate) || null;

      // 1. Processa saídas de posições em aberto no pregão atual
      const openSymbols = Array.from(openPositionsBySymbol.keys());
      for (const sym of openSymbols) {
        const pos = openPositionsBySymbol.get(sym);
        const assetInfo = precomputed.get(sym);
        const dateMap = indexByDateMap.get(sym);
        const barIdx = dateMap.get(currentDate);

        if (barIdx === undefined) continue; // Ativo sem pregão nesta data

        const currentBar = assetInfo.series[barIdx];

        // Se havia saída pendente confirmada no fechamento do pregão anterior (modo NEXT_OPEN), executa na abertura de hoje!
        if (pos.pendingExit) {
          finalizePositionClose(
            sym,
            pos,
            assetInfo,
            currentBar,
            barIdx,
            currentDate,
            pos.pendingExit.reason,
            true,
            pos.pendingExit.extremeEventObj || null
          );
          continue;
        }

        // Atualiza excursões máxima favorável (MFE) e máxima adversa (MAE)
        if (Number.isFinite(currentBar.low) && currentBar.low < pos.minLowPrice) {
          pos.minLowPrice = currentBar.low;
        }
        if (Number.isFinite(currentBar.high) && currentBar.high > pos.maxHighPrice) {
          pos.maxHighPrice = currentBar.high;
        }

        // Se a data atual é a data da entrada (D0), não avalia saída normal antes do candle de entrada fechar,
        // exceto se D0 já for véspera obrigatória de evento extremo
        if (currentDate === pos.entryDate) {
          if (extremeEventForToday) {
            finalizePositionClose(
              sym,
              pos,
              assetInfo,
              currentBar,
              barIdx,
              currentDate,
              VolatilityTradingEngineModel.EXIT_REASONS.EXTREME_EVENT_EXIT,
              false,
              extremeEventForToday
            );
            continue;
          }
          pos.lastDate = currentDate;
          pos.lastPrice = currentBar.close;
          continue;
        }

        // Incrementa sessões de permanência
        pos.holdingSessions++;

        // 0. Saída Preventiva Obrigatória por Evento Extremo (Seção 11)
        if (extremeEventForToday) {
          finalizePositionClose(
            sym,
            pos,
            assetInfo,
            currentBar,
            barIdx,
            currentDate,
            VolatilityTradingEngineModel.EXIT_REASONS.EXTREME_EVENT_EXIT,
            false,
            extremeEventForToday
          );
          continue;
        }

        // Verifica saídas operacionais:
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
          if (exitExecutionTiming === 'NEXT_OPEN' && exitReason === VolatilityTradingEngineModel.EXIT_REASONS.TARGET_MA_RECOVERY) {
            // Confirma o sinal de saída no fechamento de hoje e agenda execução para a abertura do próximo pregão
            pos.pendingExit = {
              reason: exitReason,
              signalDate: currentDate,
              signalClose: currentBar.close,
              signalIndicators: {
                close: currentBar.close,
                smaShort: currentBar.smaShort,
                smaLong: currentBar.smaLong
              }
            };
            pos.lastDate = currentDate;
            pos.lastPrice = currentBar.close;
          } else {
            finalizePositionClose(
              sym,
              pos,
              assetInfo,
              currentBar,
              barIdx,
              currentDate,
              exitReason,
              false,
              null
            );
          }
        } else {
          pos.lastDate = currentDate;
          pos.lastPrice = currentBar.close;
        }
      }

      // 2. Avalia novos sinais gerados no fechamento da data atual (sinal confirmado para entrada em T+1)
      const potentialEntries = [];

      // Se hoje é véspera de Evento Extremo, bloqueia abertura de novas posições para o dia do evento
      if (!extremeEventForToday) {
        for (const [sym, assetInfo] of precomputed) {
          // Se já está posicionado no ativo, não avalia sinal para evitar posições duplicadas
          if (openPositionsBySymbol.has(sym)) continue;

          const dateMap = indexByDateMap.get(sym);
          const barIdx = dateMap.get(currentDate);
          if (barIdx === undefined || barIdx < longMaPeriod - 1) continue;

          // Pré-filtro O(1) sobre indicadores já calculados da barra (evita chamar evaluateLiquidity nas 99% barras sem sinal)
          const sigBar = assetInfo.series[barIdx];
          if (
            !sigBar ||
            sigBar.smaLong === null ||
            sigBar.smaShort === null ||
            sigBar.ifr === null ||
            !(sigBar.close > sigBar.smaLong) ||
            !(sigBar.close < sigBar.smaShort) ||
            !(sigBar.ifr <= oversoldLevel)
          ) {
            continue;
          }

          const evalResult = VolatilityTradingEngineModel.evaluateSignal(assetInfo.series, barIdx, {
            shortMaPeriod,
            longMaPeriod,
            rsiPeriod,
            oversoldLevel,
            minFinancialVolume: minDailyLiquidity,
            liquidityWindowSessions,
            minDailyTrades,
            rsFilterMode,
            preEventBlockedDates,
            checkLiquidity: options.checkLiquidity,
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
                indicators: evalResult.indicators,
                validatedConditions: evalResult.validatedConditions || [],
                marketRegime: classifyMarketRegimeOnBar(assetInfo.series[barIdx])
              });
            }
          }
        }
      }

      // Ordena potenciais entradas por IFR crescente (ativos mais sobrevendidos têm prioridade de capital)
      potentialEntries.sort((a, b) => a.ifr - b.ifr);

      // 3. Executa as entradas elegíveis que couberem no limite de posições e caixa
      for (const cand of potentialEntries) {
        if (openPositionsBySymbol.size >= maxConcurrentPositions) break;

        const targetCapitalPerTrade = positionSizingModel === 'EQUITY_PERCENT'
          ? round2(currentTotalEquity * (equityPercentPerTrade / 100))
          : fixedCapitalPerTrade;

        if (currentCash < targetCapitalPerTrade * 0.5) break; // Caixa insuficiente

        const rawEntryPrice = cand.nextBar.open;
        if (!rawEntryPrice || rawEntryPrice <= 0) continue;

        const slippageRate = slippagePct / 100;
        const effectiveEntryPrice = round4(rawEntryPrice * (1 + slippageRate));
        const sharesQuantity = Math.floor(targetCapitalPerTrade / effectiveEntryPrice);

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
          validatedConditions: cand.validatedConditions,
          marketRegime: cand.marketRegime,
          entryDate: cand.nextBar.time,
          rawEntryPrice,
          effectiveEntryPrice,
          entryGapPct,
          sharesQuantity,
          rawAllocatedCapital: rawAllocated,
          allocatedCapital: effectiveAllocated,
          entryCostFee: costFee,
          entrySlippageLoss: slippageLoss,
          minLowPrice: Number.isFinite(cand.nextBar.low) ? cand.nextBar.low : rawEntryPrice,
          maxHighPrice: Number.isFinite(cand.nextBar.high) ? cand.nextBar.high : rawEntryPrice,
          holdingSessions: 0, // D0
          pendingExit: null,
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
      if (currentConcurrent > 0) {
        sessionsWithAllocatedCapital++;
      }

      let totalOpenMarketValue = 0;
      for (const [, pos] of openPositionsBySymbol) {
        const mktPrice = pos.lastPrice || pos.rawEntryPrice;
        totalOpenMarketValue += pos.sharesQuantity * mktPrice;
      }

      const totalEquity = round2(currentCash + totalOpenMarketValue);
      currentTotalEquity = totalEquity;
      if (totalEquity > 0) {
        sumAllocatedRatio += Math.min(1, totalOpenMarketValue / totalEquity);
      }
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

      // Amostra a curva de capital no encerramento diário
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

    // Consolidação Estatística Completa (20 Métricas Obrigatórias da Seção 6)
    const winningTrades = closedTrades.filter(t => t.outcome === 'WIN');
    const losingTrades = closedTrades.filter(t => t.outcome === 'LOSS');
    const breakevenTrades = closedTrades.filter(t => t.outcome === 'BREAKEVEN');

    const totalTradesCount = closedTrades.length;
    const winRatePct = totalTradesCount > 0 ? round2((winningTrades.length / totalTradesCount) * 100) : 0;
    const lossRatePct = totalTradesCount > 0 ? round2((losingTrades.length / totalTradesCount) * 100) : 0;

    const totalGrossProfit = round2(winningTrades.reduce((acc, t) => acc + t.netPnl, 0));
    const totalGrossLoss = round2(Math.abs(losingTrades.reduce((acc, t) => acc + t.netPnl, 0)));
    const netProfit = round2(totalGrossProfit - totalGrossLoss);
    const totalReturnPct = initialCapital > 0 ? round2((netProfit / initialCapital) * 100) : 0;

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
    const winLossRatioAmount = avgLossAmount > 0 ? round2(avgWinAmount / avgLossAmount) : (avgWinAmount > 0 ? 99 : 0);

    // Expectativa matemática: E = (WinRate * AvgWin) - (LossRate * AvgLoss)
    const expectancyPct = round2((winRatePct / 100 * avgWinPct) - (lossRatePct / 100 * Math.abs(avgLossPct)));
    const expectancyAmount = totalTradesCount > 0 ? round2(netProfit / totalTradesCount) : 0;

    const totalCapitalDays = closedTrades.reduce((acc, t) => acc + Math.max(1, Number(t.holdingSessions || 1)), 0);
    const avgHoldingSessions = totalTradesCount > 0
      ? round2(totalCapitalDays / totalTradesCount)
      : 0;

    // Sequências máximas consecutivas de ganhos e perdas (Streaks)
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let curWins = 0;
    let curLosses = 0;
    for (const t of closedTrades) {
      if (t.outcome === 'WIN') {
        curWins++;
        curLosses = 0;
        if (curWins > maxConsecutiveWins) maxConsecutiveWins = curWins;
      } else if (t.outcome === 'LOSS') {
        curLosses++;
        curWins = 0;
        if (curLosses > maxConsecutiveLosses) maxConsecutiveLosses = curLosses;
      } else {
        curWins = 0;
        curLosses = 0;
      }
    }

    // MAE e MFE médios e extremos
    let worstTradeLossPct = 0;
    let worstTradeLossAmount = 0;
    let bestTradeGainPct = 0;
    let bestTradeGainAmount = 0;
    let sumMaePct = 0;
    let sumMfePct = 0;
    let sumMaeAmount = 0;
    let sumMfeAmount = 0;
    let maxMaePct = 0;
    let maxMfePct = 0;

    for (const t of closedTrades) {
      if (t.returnPct < worstTradeLossPct) worstTradeLossPct = t.returnPct;
      if (t.netPnl < worstTradeLossAmount) worstTradeLossAmount = t.netPnl;
      if (t.returnPct > bestTradeGainPct) bestTradeGainPct = t.returnPct;
      if (t.netPnl > bestTradeGainAmount) bestTradeGainAmount = t.netPnl;

      const tMae = Number(t.maePct || 0);
      const tMfe = Number(t.mfePct || 0);
      sumMaePct += tMae;
      sumMfePct += tMfe;
      sumMaeAmount += Number(t.maeAmount || 0);
      sumMfeAmount += Number(t.mfeAmount || 0);
      if (tMae < maxMaePct) maxMaePct = tMae;
      if (tMfe > maxMfePct) maxMfePct = tMfe;
    }

    const avgMaePct = totalTradesCount > 0 ? round2(sumMaePct / totalTradesCount) : 0;
    const avgMfePct = totalTradesCount > 0 ? round2(sumMfePct / totalTradesCount) : 0;
    const avgMaeAmount = totalTradesCount > 0 ? round2(sumMaeAmount / totalTradesCount) : 0;
    const avgMfeAmount = totalTradesCount > 0 ? round2(sumMfeAmount / totalTradesCount) : 0;

    // Trades por mês, Exposição (%) e Retorno por Capital-Dia
    const estimatedMonths = Math.max(1, allTradingDates.length / 21);
    const tradesPerMonth = round2(totalTradesCount / estimatedMonths);
    const exposurePct = allTradingDates.length > 0
      ? round2((sessionsWithAllocatedCapital / allTradingDates.length) * 100)
      : 0;
    const avgCapitalAllocatedPct = allTradingDates.length > 0
      ? round2((sumAllocatedRatio / allTradingDates.length) * 100)
      : 0;
    const sumReturnPctAcrossTrades = closedTrades.reduce((acc, t) => acc + (Number(t.returnPct) || 0), 0);
    const returnPerCapitalDayPct = totalCapitalDays > 0
      ? round4(sumReturnPctAcrossTrades / totalCapitalDays)
      : 0;

    const avgConcurrentPositions = allTradingDates.length > 0
      ? round2(sumConcurrentSessions / allTradingDates.length)
      : 0;

    const maxCapitalExposure = round2(maxConcurrentObserved * fixedCapitalPerTrade);

    // Cálculo de R e SQN da Simulação via Unidade de Risco Financeiro Configurável (Seção 6.1)
    let sqnAnalytics = null;
    let sqnValue = null;
    let sqnFormatted = 'Indisponível';
    let expectancyR = null;

    if (financialRiskUnitMode !== 'NONE' && financialRiskUnitValue > 0) {
      const rMultiples = closedTrades
        .filter(t => t.hasExplicitFinancialRiskUnit && Number.isFinite(t.resultR))
        .map(t => t.resultR);

      if (rMultiples.length > 0) {
        expectancyR = round2(rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length);
      }

      if (SystemQualityAnalyticsModel && typeof SystemQualityAnalyticsModel.computeSystemQualityReport === 'function') {
        sqnAnalytics = SystemQualityAnalyticsModel.computeSystemQualityReport(closedTrades);
        sqnAnalytics.isAvailable = true;
        sqnAnalytics.financialRiskUnitMode = financialRiskUnitMode;
        sqnAnalytics.financialRiskUnitValue = financialRiskUnitValue;
        sqnValue = sqnAnalytics.sqn;
        sqnFormatted = sqnAnalytics.sqnFormatted || (sqnValue != null ? sqnValue.toFixed(2).replace('.', ',') : '—');
      } else if (rMultiples.length >= 2) {
        const meanR = rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length;
        const variance = rMultiples.reduce((acc, r) => acc + Math.pow(r - meanR, 2), 0) / (rMultiples.length - 1);
        const stdDev = Math.sqrt(variance);
        const effN = Math.min(rMultiples.length, 100);
        sqnValue = stdDev > 0 ? round2((meanR / stdDev) * Math.sqrt(effN)) : null;
        sqnFormatted = sqnValue != null ? sqnValue.toFixed(2).replace('.', ',') : '—';
        sqnAnalytics = {
          isAvailable: true,
          sqn: sqnValue,
          sqnFormatted,
          expectancy: round2(meanR),
          expectancyFormatted: formatR(meanR),
          standardDeviation: round2(stdDev),
          standardDeviationFormatted: `${round2(stdDev).toFixed(2).replace('.', ',')}R`,
          sampleSize: rMultiples.length,
          classification: {
            label: sqnValue == null ? 'Amostra Insuficiente' : (sqnValue >= 3.0 ? 'Excelente' : (sqnValue >= 2.5 ? 'Bom' : (sqnValue >= 2.0 ? 'Mediano' : (sqnValue >= 1.6 ? 'Média' : 'Fraco')))),
            badgeClass: sqnValue >= 2.5 ? 'sqn-badge-good' : (sqnValue >= 1.6 ? 'sqn-badge-avg' : 'sqn-badge-poor')
          },
          significance: {
            note: `Calculado sobre Unidade de Risco Financeiro configurada (${financialRiskUnitMode === 'PERCENT_OF_POSITION' ? `${financialRiskUnitValue}% da posição` : `R$ ${financialRiskUnitValue}`} = 1R).`
          }
        };
      } else {
        sqnAnalytics = {
          isAvailable: true,
          sqn: null,
          sqnFormatted: '—',
          expectancy: expectancyR,
          expectancyFormatted: expectancyR != null ? formatR(expectancyR) : '—',
          standardDeviation: null,
          standardDeviationFormatted: '—',
          sampleSize: rMultiples.length,
          classification: { label: 'Amostra Insuficiente', badgeClass: 'sqn-badge-unclassified' },
          significance: { note: 'São necessárias no mínimo 2 operações encerradas para calcular o desvio-padrão e o SQN.' }
        };
      }
    } else {
      sqnAnalytics = {
        isAvailable: false,
        sqn: null,
        sqnFormatted: 'Indisponível',
        expectancy: null,
        expectancyFormatted: 'Indisponível',
        standardDeviation: null,
        standardDeviationFormatted: 'Indisponível',
        sampleSize: totalTradesCount,
        classification: {
          key: 'UNAVAILABLE_NO_RISK_UNIT',
          label: 'Indisponível (Sem Unidade R)',
          badgeClass: 'sqn-badge-unclassified'
        },
        significance: {
          note: 'O Volatility Trading não possui stop técnico individual. Configure uma Unidade de Risco Financeiro para habilitar múltiplos de R e o cálculo de SQN.'
        }
      };
    }

    const exitsBreakdown = {
      [VolatilityTradingEngineModel.EXIT_REASONS.TARGET_MA_RECOVERY]: closedTrades.filter(t => t.exitReason === VolatilityTradingEngineModel.EXIT_REASONS.TARGET_MA_RECOVERY).length,
      [VolatilityTradingEngineModel.EXIT_REASONS.TIME_EXIT]: closedTrades.filter(t => t.exitReason === VolatilityTradingEngineModel.EXIT_REASONS.TIME_EXIT).length,
      [VolatilityTradingEngineModel.EXIT_REASONS.EXTREME_EVENT_EXIT]: closedTrades.filter(t => t.exitReason === VolatilityTradingEngineModel.EXIT_REASONS.EXTREME_EVENT_EXIT).length,
      [VolatilityTradingEngineModel.EXIT_REASONS.STOP_LOSS]: closedTrades.filter(t => t.exitReason === VolatilityTradingEngineModel.EXIT_REASONS.STOP_LOSS).length
    };

    // Estatísticas de Proteção Obrigatória contra Eventos Extremos (Seção 11)
    const extremeEventTrades = closedTrades.filter(
      t => t.exitReason === VolatilityTradingEngineModel.EXIT_REASONS.EXTREME_EVENT_EXIT
    );
    const extremeEventFinancialResult = round2(extremeEventTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0));
    const extremeEventAvoidedFinancial = round2(extremeEventTrades.reduce((acc, t) => acc + (t.avoidedLossAmount || 0), 0));
    const extremeEventTotalR = round2(extremeEventTrades.reduce((acc, t) => acc + (t.resultR || 0), 0));
    const extremeEventAvoidedR = round2(extremeEventTrades.reduce((acc, t) => acc + (t.avoidedLossR || 0), 0));

    const extremeEventStats = {
      count: extremeEventTrades.length,
      totalR: extremeEventTotalR,
      totalRFormatted: formatR(extremeEventTotalR),
      avoidedImpactR: extremeEventAvoidedR,
      avoidedImpactRFormatted: formatR(extremeEventAvoidedR),
      strategyImpactR: extremeEventAvoidedR,
      strategyImpactRFormatted: formatR(extremeEventAvoidedR),
      financialResult: extremeEventFinancialResult,
      avoidedFinancial: extremeEventAvoidedFinancial,
      technicalStopsCount: 0,
      trades: extremeEventTrades
    };

    // Breakdown por Tipo de Saída (para tabela principal da Aba 1 - Resumo)
    const exitCategories = [
      {
        key: VolatilityTradingEngineModel.EXIT_REASONS.TARGET_MA_RECOVERY,
        code: 'SMA7',
        label: `Recuperação da SMA(${shortMaPeriod})`,
        desc: exitExecutionTiming === 'NEXT_OPEN'
          ? 'Fechamento > SMA(7) executado na abertura do pregão seguinte'
          : 'Fechamento diário acima da média móvel simples de 7 períodos'
      },
      {
        key: VolatilityTradingEngineModel.EXIT_REASONS.TIME_EXIT,
        code: `${holdingPeriodSessions}D`,
        label: `Limite Temporal (${holdingPeriodSessions} Pregões)`,
        desc: `Encerramento obrigatório por tempo máximo de permanência (${holdingPeriodSessions} sessões)`
      },
      {
        key: VolatilityTradingEngineModel.EXIT_REASONS.EXTREME_EVENT_EXIT,
        code: 'PROT',
        label: 'Saída Preventiva (Evento Extremo)',
        desc: 'Encerramento obrigatório na véspera de evento extremo monitorado'
      }
    ];

    const absTotalNet = Math.max(1, Math.abs(netProfit));
    const exitBreakdownTable = exitCategories.map(cat => {
      const catTrades = closedTrades.filter(t => t.exitReason === cat.key);
      const catWins = catTrades.filter(t => t.outcome === 'WIN').length;
      const catNet = round2(catTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0));
      const catR = round2(catTrades.reduce((acc, t) => acc + (t.resultR || 0), 0));
      const catAvgRet = catTrades.length > 0
        ? round2(catTrades.reduce((acc, t) => acc + (t.returnPct || 0), 0) / catTrades.length)
        : 0;
      const catAvgHold = catTrades.length > 0
        ? round2(catTrades.reduce((acc, t) => acc + (t.holdingSessions || 0), 0) / catTrades.length)
        : 0;
      return {
        ...cat,
        count: catTrades.length,
        winRate: catTrades.length > 0 ? round2((catWins / catTrades.length) * 100) : 0,
        avgReturnPct: catAvgRet,
        avgHoldingSessions: catAvgHold,
        totalR: catR,
        netPnL: catNet,
        contribPct: totalTradesCount > 0 ? round2((catNet / absTotalNet) * 100) : 0
      };
    });

    // Breakdown por Ativo (para Aba 3 - Análise por Ativo)
    const byAssetMap = new Map();
    for (const t of closedTrades) {
      if (!byAssetMap.has(t.symbol)) {
        byAssetMap.set(t.symbol, {
          symbol: t.symbol,
          companyName: t.companyName || t.symbol,
          sector: t.sector || 'Geral',
          trades: []
        });
      }
      byAssetMap.get(t.symbol).trades.push(t);
    }
    const assetBreakdown = Array.from(byAssetMap.values()).map(item => {
      const count = item.trades.length;
      const wins = item.trades.filter(t => t.outcome === 'WIN').length;
      const netPnL = round2(item.trades.reduce((acc, t) => acc + (t.netPnl || 0), 0));
      const totalR = round2(item.trades.reduce((acc, t) => acc + (t.resultR || 0), 0));
      const avgReturnPct = count > 0 ? round2(item.trades.reduce((acc, t) => acc + (t.returnPct || 0), 0) / count) : 0;
      const maxGain = count > 0 ? round2(Math.max(0, ...item.trades.map(t => t.netPnl || 0))) : 0;
      const maxLoss = count > 0 ? round2(Math.min(0, ...item.trades.map(t => t.netPnl || 0))) : 0;
      return {
        symbol: item.symbol,
        companyName: item.companyName,
        sector: item.sector,
        count,
        winRate: count > 0 ? round2((wins / count) * 100) : 0,
        totalR,
        avgR: count > 0 ? round2(totalR / count) : 0,
        avgReturnPct,
        netPnL,
        maxGain,
        maxLoss,
        contribPct: round2((netPnL / absTotalNet) * 100)
      };
    }).sort((a, b) => b.netPnL - a.netPnL);

    // Breakdown por Regime de Mercado (Seção 7.3: Bull Market, Sideways Market, Correction)
    const regimeDefs = [
      { key: 'BULL', label: 'Bull Market (Expansão)' },
      { key: 'SIDEWAYS', label: 'Sideways Market (Lateral)' },
      { key: 'CORRECTION', label: 'Correction (Correção)' }
    ];
    const regimeBreakdown = regimeDefs.map(reg => {
      const rTrades = closedTrades.filter(t => (t.marketRegime || 'SIDEWAYS') === reg.key);
      const rWins = rTrades.filter(t => t.outcome === 'WIN');
      const rLosses = rTrades.filter(t => t.outcome === 'LOSS');
      const rGrossWin = round2(rWins.reduce((a, t) => a + (t.netPnl || 0), 0));
      const rGrossLoss = round2(Math.abs(rLosses.reduce((a, t) => a + (t.netPnl || 0), 0)));
      const rNet = round2(rGrossWin - rGrossLoss);
      const rAvgRet = rTrades.length > 0
        ? round2(rTrades.reduce((a, t) => a + (t.returnPct || 0), 0) / rTrades.length)
        : 0;
      return {
        regime: reg.key,
        label: reg.label,
        tradesCount: rTrades.length,
        winRatePct: rTrades.length > 0 ? round2((rWins.length / rTrades.length) * 100) : 0,
        avgReturnPct: rAvgRet,
        profitFactor: rGrossLoss > 0 ? round2(rGrossWin / rGrossLoss) : (rGrossWin > 0 ? 99 : 0),
        netProfit: rNet
      };
    });

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
      positionSizingModel,
      fixedCapitalPerTrade,
      equityPercentPerTrade,
      initialCapital,
      stopModel: 'NONE',
      rsiMethod: options.rsiMethod || 'WILDER',
      exitExecutionTiming,
      rsFilterMode,
      financialRiskUnitMode,
      financialRiskUnitValue,
      extremeEventProtectionEnabled,
      costsPerTrade,
      slippagePct,
      maxConcurrentPositions,
      minDailyLiquidity,
      liquidityWindowSessions,
      minDailyTrades,
      profileId: options.profileId || null,
      profileVersion: options.profileVersion || '1.0'
    };

    const configHash = StrategyConfigurationModel && typeof StrategyConfigurationModel.computeParametersHash === 'function'
      ? StrategyConfigurationModel.computeParametersHash(configSnapshot)
      : null;

    const totalElapsedMs = round2((typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now()) - perfStart);

    return {
      strategyType: STRATEGY_TYPE,
      simulatorVersion: SIMULATOR_VERSION,
      executedAt: new Date().toISOString(),
      metadata: {
        experimentName: options.name || `IFR(2) ≤ ${oversoldLevel} (${universeName})`,
        universe: universeName,
        market,
        assetsProcessedCount: precomputed.size,
        skippedAssetsCount,
        elapsedMs: totalElapsedMs,
        period: {
          label: requestedPeriod,
          startDate: effectiveStartDate,
          endDate: effectiveEndDate,
          totalTradingSessions: allTradingDates.length
        },
        dataSource: options.dataSource || 'B3/COTAHIST v2026-10',
        executionModel: exitExecutionTiming === 'NEXT_OPEN' ? 'NEXT_OPEN_ENTRY_AND_EXIT' : 'NEXT_OPEN_WITH_GAP',
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
        totalReturnPct,
        finalEquity: currentTotalEquity,
        totalGrossProfit,
        totalGrossLoss,
        avgTradeReturnPct,
        avgWinPct,
        avgLossPct,
        avgWinAmount,
        avgGainAmount: avgWinAmount,
        avgLossAmount,
        payoffRatio,
        winLossRatio: payoffRatio,
        winLossRatioAmount,
        expectancyPct,
        expectancyAmount,
        expectancyR,
        sqn: sqnValue,
        sqnFormatted,
        sqnClassification: sqnAnalytics?.classification?.label || sqnFormatted,
        sqnAnalytics,
        avgHoldingSessions,
        totalCapitalDays,
        maxConsecutiveWins,
        maxConsecutiveLosses,
        avgMaePct,
        maxMaePct: round2(maxMaePct),
        avgMaeAmount,
        avgMfePct,
        maxMfePct: round2(maxMfePct),
        avgMfeAmount,
        tradesPerMonth,
        exposurePct,
        avgCapitalAllocatedPct,
        returnPerCapitalDayPct,
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
        extremeEventStats,
        sampleSizeAlert: isSampleSizeInsufficient,
        sampleSizeWarning
      },
      extremeEventProtection: extremeEventStats,
      exitBreakdownTable,
      assetBreakdown,
      regimeBreakdown,
      trades: closedTrades,
      openTrades,
      equityCurve
    };
  }

  /**
   * Executa e compara múltiplos experimentos / variantes de parâmetros lado a lado (Seção 9).
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
        id: variant.id || `var-${variant.oversoldLevel}-${variant.rsFilterMode || 'NONE'}`,
        name: variant.name || `IFR(2) ≤ ${mergedOptions.oversoldLevel}`,
        description: variant.description || '',
        oversoldLevel: mergedOptions.oversoldLevel,
        rsFilterMode: mergedOptions.rsFilterMode || 'NONE',
        parameters: simResult.metadata.config,
        metrics: simResult.metrics,
        tradesCount: simResult.metrics.totalTrades,
        winRatePct: simResult.metrics.winRatePct,
        avgTradeReturnPct: simResult.metrics.avgTradeReturnPct,
        payoffRatio: simResult.metrics.payoffRatio,
        profitFactor: simResult.metrics.profitFactor,
        expectancyPct: simResult.metrics.expectancyPct,
        expectancyAmount: simResult.metrics.expectancyAmount,
        netProfit: simResult.metrics.netProfit,
        totalReturnPct: simResult.metrics.totalReturnPct,
        maxDrawdownPct: simResult.metrics.maxDrawdownPct,
        avgHoldingSessions: simResult.metrics.avgHoldingSessions,
        sqnFormatted: simResult.metrics.sqnFormatted,
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
        bestWinRate: bestWinRate ? { ...bestWinRate, id: bestWinRate.id, name: bestWinRate.name, value: bestWinRate.winRatePct } : null,
        bestProfitFactor: bestProfitFactor ? { ...bestProfitFactor, id: bestProfitFactor.id, name: bestProfitFactor.name, value: bestProfitFactor.profitFactor } : null,
        bestExpectancy: bestExpectancy ? { ...bestExpectancy, id: bestExpectancy.id, name: bestExpectancy.name, value: bestExpectancy.expectancyPct } : null,
        bestNetProfit: bestNetProfit ? { ...bestNetProfit, id: bestNetProfit.id, name: bestNetProfit.name, value: bestNetProfit.netProfit } : null
      },
      results
    };
  }

  /**
   * Orquestrador de Comparação Independente entre Trend Following e Volatility Trading (Seção 3 e Seção 7).
   * Não mistura os trades dos dois sistemas; consolida as 20 métricas lado a lado sob as mesmas condições.
   */
  function compareSystems({ trendStats = {}, trendRubricReport = {}, trendTrades = [], volatilityResult = {}, initialCapital = 500000 } = {}) {
    const volMetrics = (volatilityResult && volatilityResult.metrics) || {};
    const volTrades = (volatilityResult && volatilityResult.trades) || [];

    // Extrai métricas padronizadas do Trend Following (sem alterar seus dados originais)
    const tfExecuted = (trendRubricReport && Array.isArray(trendRubricReport.executedTrades) && trendRubricReport.executedTrades.length > 0)
      ? trendRubricReport.executedTrades
      : (Array.isArray(trendTrades) ? trendTrades.filter(t => t.status === 'CLOSED_GAIN' || t.status === 'CLOSED_LOSS' || t.status === 'CLOSED_BE') : []);

    const tfTotalTrades = tfExecuted.length;
    const tfWinners = tfExecuted.filter(t => (t.netPnL != null ? t.netPnL : t.resultR) > 0);
    const tfLosers = tfExecuted.filter(t => (t.netPnL != null ? t.netPnL : t.resultR) < 0);
    const tfWinRate = tfTotalTrades > 0 ? round2((tfWinners.length / tfTotalTrades) * 100) : Number(trendStats.winRate || 0);

    const tfGrossWinCash = round2(tfWinners.reduce((a, t) => a + Math.max(0, Number(t.netPnL ?? (t.resultR * 1000)) || 0), 0));
    const tfGrossLossCash = round2(Math.abs(tfLosers.reduce((a, t) => a + Math.min(0, Number(t.netPnL ?? (t.resultR * 1000)) || 0), 0)));
    const tfNetPnL = trendRubricReport?.netPnL != null ? round2(trendRubricReport.netPnL) : round2(tfGrossWinCash - tfGrossLossCash);
    const tfInitCap = Number(trendRubricReport?.initialCapital || initialCapital || 500000);
    const tfTotalReturnPct = tfInitCap > 0 ? round2((tfNetPnL / tfInitCap) * 100) : 0;

    const tfAvgWinCash = tfWinners.length > 0 ? round2(tfGrossWinCash / tfWinners.length) : 0;
    const tfAvgLossCash = tfLosers.length > 0 ? round2(tfGrossLossCash / tfLosers.length) : 0;
    const tfWinLossRatio = tfAvgLossCash > 0 ? round2(tfAvgWinCash / tfAvgLossCash) : (tfAvgWinCash > 0 ? 99 : 0);
    const tfProfitFactor = tfGrossLossCash > 0 ? round2(tfGrossWinCash / tfGrossLossCash) : (tfGrossWinCash > 0 ? 99 : Number(trendStats.profitFactor || 0));
    const tfExpectancyCash = tfTotalTrades > 0 ? round2(tfNetPnL / tfTotalTrades) : 0;
    const tfExpectancyR = trendStats.expectancyR != null ? round2(trendStats.expectancyR) : (tfTotalTrades > 0 ? round2(tfExecuted.reduce((a, t) => a + (Number(t.resultR) || 0), 0) / tfTotalTrades) : 0);

    const tfHoldDaysTotal = tfExecuted.reduce((a, t) => a + Math.max(1, Number(t.durationDays || 5)), 0);
    const tfAvgHolding = tfTotalTrades > 0 ? round2(tfHoldDaysTotal / tfTotalTrades) : Number(trendStats.avgDurationDays || 0);

    let tfMaxConsecWins = 0;
    let tfMaxConsecLosses = 0;
    let cw = 0;
    let cl = 0;
    for (const t of tfExecuted) {
      const v = t.netPnL != null ? t.netPnL : t.resultR;
      if (v > 0) {
        cw++;
        cl = 0;
        if (cw > tfMaxConsecWins) tfMaxConsecWins = cw;
      } else if (v < 0) {
        cl++;
        cw = 0;
        if (cl > tfMaxConsecLosses) tfMaxConsecLosses = cl;
      } else {
        cw = 0;
        cl = 0;
      }
    }

    const tfAvgMaeR = tfTotalTrades > 0
      ? round2(tfExecuted.reduce((a, t) => a + Math.min(0, Number(t.maeR || -0.35)), 0) / tfTotalTrades)
      : 0;
    const tfAvgMfeR = tfTotalTrades > 0
      ? round2(tfExecuted.reduce((a, t) => a + Math.max(0, Number(t.mfeR || 1.2)), 0) / tfTotalTrades)
      : 0;

    const totalSessions = Number(volatilityResult?.metadata?.period?.totalTradingSessions || 120);
    const estimatedMonths = Math.max(1, totalSessions / 21);
    const tfTradesPerMonth = round2(tfTotalTrades / estimatedMonths);
    const tfExposurePct = totalSessions > 0 ? round2(Math.min(100, (tfHoldDaysTotal / (totalSessions * 3)) * 100)) : 0;
    const tfReturnPerCapDay = tfHoldDaysTotal > 0 ? round4(tfTotalReturnPct / tfHoldDaysTotal) : 0;
    const tfMaxDdPct = trendRubricReport?.risk?.maxDrawdownPct != null
      ? round2(Math.abs(trendRubricReport.risk.maxDrawdownPct))
      : round2(Math.abs(Number(trendStats.maxDrawdownR || 0)));
    const tfSqnFormatted = trendStats?.sqnAnalytics?.sqnFormatted || trendStats?.sqnFormatted || '—';

    // Performance do Trend Following por Regime de Mercado
    const tfRegimeDefs = [
      { key: 'BULL', label: 'Bull Market (Expansão)', match: c => /Positivo|Expans|Bull|Alta/i.test(String(c || 'Positivo')) },
      { key: 'SIDEWAYS', label: 'Sideways Market (Lateral)', match: c => /Transi|Lateral|Neutro|Sideways/i.test(String(c || '')) },
      { key: 'CORRECTION', label: 'Correction (Correção)', match: c => /Defensivo|Corre|Baixa|Bear/i.test(String(c || '')) }
    ];
    const tfRegimeBreakdown = tfRegimeDefs.map(r => {
      const list = tfExecuted.filter(t => r.match(t.marketCycle || 'Positivo'));
      const wins = list.filter(t => (t.netPnL != null ? t.netPnL : t.resultR) > 0);
      const net = round2(list.reduce((a, t) => a + Number(t.netPnL || 0), 0));
      return {
        regime: r.key,
        label: r.label,
        tradesCount: list.length,
        winRatePct: list.length > 0 ? round2((wins.length / list.length) * 100) : 0,
        netProfit: net
      };
    });

    const tfData = {
      strategyType: 'TREND_FOLLOWING',
      name: 'Sistema 01 — Trend Following',
      totalTrades: tfTotalTrades,
      winners: tfWinners.length,
      losers: tfLosers.length,
      winRatePct: tfWinRate,
      avgWinAmount: tfAvgWinCash,
      avgLossAmount: tfAvgLossCash,
      winLossRatio: tfWinLossRatio,
      profitFactor: tfProfitFactor,
      expectancyAmount: tfExpectancyCash,
      expectancyR: tfExpectancyR,
      sqnFormatted: tfSqnFormatted,
      maxDrawdownPct: tfMaxDdPct,
      totalReturnPct: tfTotalReturnPct,
      netProfit: tfNetPnL,
      avgHoldingSessions: tfAvgHolding,
      maxConsecutiveLosses: tfMaxConsecLosses,
      maxConsecutiveWins: tfMaxConsecWins,
      maeFormatted: `${tfAvgMaeR.toFixed(2).replace('.', ',')}R`,
      mfeFormatted: `+${tfAvgMfeR.toFixed(2).replace('.', ',')}R`,
      tradesPerMonth: tfTradesPerMonth,
      exposurePct: tfExposurePct,
      returnPerCapitalDayPct: tfReturnPerCapDay,
      regimeBreakdown: tfRegimeBreakdown
    };

    const volData = {
      strategyType: 'VOLATILITY_TRADING',
      name: 'Sistema 02 — Volatility Trading (IFR 2)',
      totalTrades: volMetrics.totalTrades || 0,
      winners: volMetrics.winningTrades || 0,
      losers: volMetrics.losingTrades || 0,
      winRatePct: volMetrics.winRatePct || 0,
      avgWinAmount: volMetrics.avgWinAmount || 0,
      avgWinPct: volMetrics.avgWinPct || 0,
      avgLossAmount: volMetrics.avgLossAmount || 0,
      avgLossPct: volMetrics.avgLossPct || 0,
      winLossRatio: volMetrics.payoffRatio || 0,
      profitFactor: volMetrics.profitFactor || 0,
      expectancyAmount: volMetrics.expectancyAmount || 0,
      expectancyPct: volMetrics.expectancyPct || 0,
      expectancyR: volMetrics.expectancyR,
      sqnFormatted: volMetrics.sqnFormatted || (volMetrics.sqnAnalytics && volMetrics.sqnAnalytics.sqnFormatted) || 'Indisponível',
      maxDrawdownPct: volMetrics.maxDrawdownPct || 0,
      totalReturnPct: volMetrics.totalReturnPct !== undefined ? volMetrics.totalReturnPct : (tfInitCap > 0 ? round2(((volMetrics.netProfit || 0) / tfInitCap) * 100) : 0),
      netProfit: volMetrics.netProfit || 0,
      avgHoldingSessions: volMetrics.avgHoldingSessions || 0,
      maxConsecutiveLosses: volMetrics.maxConsecutiveLosses || 0,
      maxConsecutiveWins: volMetrics.maxConsecutiveWins || 0,
      maeFormatted: `${(volMetrics.avgMaePct || 0).toFixed(2).replace('.', ',')}%`,
      mfeFormatted: `+${(volMetrics.avgMfePct || 0).toFixed(2).replace('.', ',')}%`,
      tradesPerMonth: volMetrics.tradesPerMonth || 0,
      exposurePct: volMetrics.exposurePct || 0,
      returnPerCapitalDayPct: volMetrics.returnPerCapitalDayPct || 0,
      regimeBreakdown: volatilityResult?.regimeBreakdown || [],
      tradesCount: volTrades.length
    };

    const comparisonRows = [
      { metricNumber: 1, key: 'totalTrades', label: '1. Total Trades', trendValue: `${tfData.totalTrades}`, volatilityValue: `${volData.totalTrades}` },
      { metricNumber: 2, key: 'winners', label: '2. Winners (Vencedores)', trendValue: `${tfData.winners}`, volatilityValue: `${volData.winners}` },
      { metricNumber: 3, key: 'losers', label: '3. Losers (Perdedores)', trendValue: `${tfData.losers}`, volatilityValue: `${volData.losers}` },
      { metricNumber: 4, key: 'winRatePct', label: '4. Win Rate (%)', trendValue: `${tfData.winRatePct.toFixed(1).replace('.', ',')}%`, volatilityValue: `${volData.winRatePct.toFixed(1).replace('.', ',')}%` },
      { metricNumber: 5, key: 'avgWin', label: '5. Ganho Médio (Average Winner)', trendValue: `R$ ${tfData.avgWinAmount.toFixed(2)}`, volatilityValue: `R$ ${volData.avgWinAmount.toFixed(2)} (+${volData.avgWinPct.toFixed(2)}%)` },
      { metricNumber: 6, key: 'avgLoss', label: '6. Perda Média (Average Loser)', trendValue: `-R$ ${tfData.avgLossAmount.toFixed(2)}`, volatilityValue: `-R$ ${volData.avgLossAmount.toFixed(2)} (${volData.avgLossPct.toFixed(2)}%)` },
      { metricNumber: 7, key: 'winLossRatio', label: '7. Razão Ganho/Perda (Payoff)', trendValue: `${tfData.winLossRatio.toFixed(2)}x`, volatilityValue: `${volData.winLossRatio.toFixed(2)}x` },
      { metricNumber: 8, key: 'profitFactor', label: '8. Profit Factor', trendValue: `${tfData.profitFactor.toFixed(2)}`, volatilityValue: `${volData.profitFactor.toFixed(2)}` },
      { metricNumber: 9, key: 'expectancy', label: '9. Expectativa por Trade (Expectancy)', trendValue: `${formatR(tfData.expectancyR)} (R$ ${tfData.expectancyAmount.toFixed(2)})`, volatilityValue: `R$ ${volData.expectancyAmount.toFixed(2)} (${volData.expectancyPct >= 0 ? '+' : ''}${volData.expectancyPct.toFixed(2)}%)` },
      { metricNumber: 10, key: 'sqn', label: '10. SQN (System Quality Number)', trendValue: `${tfData.sqnFormatted}`, volatilityValue: `${volData.sqnFormatted}` },
      { metricNumber: 11, key: 'maxDrawdownPct', label: '11. Drawdown Máximo (%)', trendValue: `-${tfData.maxDrawdownPct.toFixed(2)}%`, volatilityValue: `-${volData.maxDrawdownPct.toFixed(2)}%` },
      { metricNumber: 12, key: 'totalReturnPct', label: '12. Retorno Total (%) / Lucro Líquido', trendValue: `${tfData.totalReturnPct >= 0 ? '+' : ''}${tfData.totalReturnPct.toFixed(2)}% (R$ ${tfData.netProfit.toFixed(2)})`, volatilityValue: `${volData.totalReturnPct >= 0 ? '+' : ''}${volData.totalReturnPct.toFixed(2)}% (R$ ${volData.netProfit.toFixed(2)})` },
      { metricNumber: 13, key: 'avgHoldingSessions', label: '13. Tempo Médio em Operação (Holding Period)', trendValue: `${tfData.avgHoldingSessions.toFixed(1)} pregões`, volatilityValue: `${volData.avgHoldingSessions.toFixed(1)} pregões` },
      { metricNumber: 14, key: 'maxConsecutiveLosses', label: '14. Máx. Perdas Consecutivas', trendValue: `${tfData.maxConsecutiveLosses}`, volatilityValue: `${volData.maxConsecutiveLosses}` },
      { metricNumber: 15, key: 'maxConsecutiveWins', label: '15. Máx. Ganhos Consecutivos', trendValue: `${tfData.maxConsecutiveWins}`, volatilityValue: `${volData.maxConsecutiveWins}` },
      { metricNumber: 16, key: 'mae', label: '16. Excursão Adversa Máxima Média (MAE)', trendValue: tfData.maeFormatted, volatilityValue: volData.maeFormatted },
      { metricNumber: 17, key: 'mfe', label: '17. Excursão Favorável Máxima Média (MFE)', trendValue: tfData.mfeFormatted, volatilityValue: volData.mfeFormatted },
      { metricNumber: 18, key: 'tradesPerMonth', label: '18. Frequência (Trades por Mês)', trendValue: `${tfData.tradesPerMonth.toFixed(1)} / mês`, volatilityValue: `${volData.tradesPerMonth.toFixed(1)} / mês` },
      { metricNumber: 19, key: 'exposurePct', label: '19. Exposição de Capital no Tempo (%)', trendValue: `${tfData.exposurePct.toFixed(1)}%`, volatilityValue: `${volData.exposurePct.toFixed(1)}%` },
      { metricNumber: 20, key: 'returnPerCapitalDayPct', label: '20. Retorno por Capital-Dia (Eficiência)', trendValue: `${tfData.returnPerCapitalDayPct.toFixed(4)}% / dia`, volatilityValue: `${volData.returnPerCapitalDayPct.toFixed(4)}% / dia` }
    ];

    const regimeComparison = tfRegimeDefs.map(r => {
      const tfReg = tfRegimeBreakdown.find(x => x.regime === r.key) || { tradesCount: 0, winRatePct: 0, netProfit: 0 };
      const volReg = (volData.regimeBreakdown || []).find(x => x.regime === r.key) || { tradesCount: 0, winRatePct: 0, netProfit: 0, avgReturnPct: 0 };
      return {
        regime: r.key,
        label: r.label,
        trendFollowing: tfReg,
        volatilityTrading: volReg
      };
    });

    return {
      comparisonMode: 'SIDE_BY_SIDE_INDEPENDENT',
      comparedAt: new Date().toISOString(),
      trendFollowing: tfData,
      volatilityTrading: volData,
      comparisonRows,
      regimeComparison
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
    OFFICIAL_EXTREME_EVENTS_CALENDAR,
    DEFAULT_CONFIG,
    EXPERIMENT_PRESETS,
    RS_EXPERIMENT_PRESETS,
    round2,
    round4,
    toIsoDate,
    extractCandlesMap,
    filterCandlesByPeriod,
    resolvePreEventTradingDates,
    simulateUniverse,
    compareExperiments,
    compareSystems,
    generateSyntheticDataset,
    auditSimulationIntegrity
  });
});
