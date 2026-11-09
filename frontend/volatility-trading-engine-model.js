/**
 * Healthy Trend Trader — Volatility Trading Engine Model
 *
 * Módulo operacional fundamental do mundo VOLATILITY TRADING:
 * Estratégia: Volatility Swing — IFR2 Mean Reversion
 *
 * Princípios do Motor:
 * 1. Timeframe oficial: Diário (candles OHLCV diários completos).
 * 2. Indicadores canônicos:
 *    - SMA curta: Simple Moving Average (padrão 7 períodos).
 *    - SMA longa/estrutural: Simple Moving Average (padrão 200 períodos).
 *    - IFR/RSI curto: Índice de Força Relativa de Welles Wilder (padrão 2 períodos).
 *    - Nível de sobrevenda inicial: <= 10 (parametrizável).
 * 3. Entrada Comprada:
 *    - Na data do sinal T (no fechamento):
 *      a) Fechamento > SMA(200) (tendência primária estrutural de alta)
 *      b) Fechamento < SMA(7) (correção técnica de curto prazo)
 *      c) IFR(2) <= nível de sobrevenda configurado (exaustão vendedora)
 *      d) Liquidity Gate aprovado estritamente até T (sem look-ahead bias)
 *      e) Ativo elegível / não constante na Blacklist comportamental
 *    - Execução da Entrada:
 *      Confirmada APÓS o fechamento do candle de sinal.
 *      Executada na abertura do pregão seguinte (T+1 / D0) no próximo preço negociável, com absorção de gap.
 * 4. Saída da Posição (100%):
 *    - Encerra quando ocorrer PRIMEIRO:
 *      a) Saída por recuperação (TARGET_MA_RECOVERY): Fechamento diário acima da SMA(7) (Close > SMA7).
 *      b) Saída temporal (TIME_EXIT): Completar 7 pregões de permanência (D7) caso a saída por recuperação não tenha ocorrido.
 *    - Contagem de pregões D0/D1:
 *      D0 = dia da entrada executada (abertura de T+1).
 *      D1 = primeiro pregão completo subsequente à execução (candle T+2).
 *      D7 = sétimo pregão completo subsequente à execução (candle T+8).
 * 5. Position Sizing:
 *    - Capital financeiro fixo por trade (padrão R$ 10.000).
 *    - Quantidade = Math.floor(Capital / EntryPrice).
 *    - Stop técnico ou financeiro desabilitado na configuração inicial.
 * 6. Zero contaminação:
 *    - NENHUMA dependência de Força Relativa Mansfield/O'Neil, ações líderes, Donchian, setups de continuidade ou Rubric de Trend Following.
 */

(function (root, factory) {
  const LiquidityGate = typeof module === 'object' && module.exports
    ? require('./liquidity-gate-model')
    : (root && root.LiquidityGateModel);
  const StrategyConfig = typeof module === 'object' && module.exports
    ? require('./strategy-configuration-model')
    : (root && root.StrategyConfigurationModel);

  if (typeof module === 'object' && module.exports) {
    module.exports = factory(LiquidityGate, StrategyConfig);
  } else {
    root.VolatilityTradingEngineModel = factory(LiquidityGate, StrategyConfig);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (LiquidityGateModel, StrategyConfigurationModel) {
  'use strict';

  const STRATEGY_TYPE = 'VOLATILITY_TRADING';
  const SETUP_NAME = 'VOLATILITY_SWING_IFR2';

  const EXIT_REASONS = Object.freeze({
    TARGET_MA_RECOVERY: 'TARGET_MA_RECOVERY',
    TIME_EXIT: 'TIME_EXIT',
    MANUAL_EXIT: 'MANUAL_EXIT',
    STOP_LOSS: 'STOP_LOSS'
  });

  const SIGNAL_CODES = Object.freeze({
    SIGNAL_CONFIRMED: 'SIGNAL_CONFIRMED',
    INSUFFICIENT_HISTORY: 'INSUFFICIENT_HISTORY',
    INSUFFICIENT_HISTORY_LONG_MA: 'INSUFFICIENT_HISTORY_LONG_MA',
    INSUFFICIENT_HISTORY_SHORT_MA: 'INSUFFICIENT_HISTORY_SHORT_MA',
    INSUFFICIENT_HISTORY_IFR: 'INSUFFICIENT_HISTORY_IFR',
    NOT_ABOVE_LONG_MA: 'NOT_ABOVE_LONG_MA',
    NOT_BELOW_SHORT_MA: 'NOT_BELOW_SHORT_MA',
    RSI_NOT_OVERSOLD: 'RSI_NOT_OVERSOLD',
    LIQUIDITY_REJECTED: 'LIQUIDITY_REJECTED',
    BLACKLISTED: 'BLACKLISTED',
    INVALID_CANDLE: 'INVALID_CANDLE',
    INDEX_OUT_OF_BOUNDS: 'INDEX_OUT_OF_BOUNDS'
  });

  const DEFAULT_PARAMETERS = Object.freeze({
    timeframe: 'Diário',
    shortMaPeriod: 7,
    longMaPeriod: 200,
    indicator: 'IFR',
    rsiPeriod: 2,
    oversoldLevel: 10,
    holdingPeriodSessions: 7,
    positionSizingModel: 'FIXED_FINANCIAL',
    fixedCapitalPerTrade: 10000,
    stopModel: 'NONE',
    rsiMethod: 'WILDER' // 'WILDER' (canônico) ou 'CUTLER' (média móvel simples)
  });

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

  function round2(num) {
    return Number(Math.round(num + 'e2') + 'e-2');
  }

  function round4(num) {
    return Number(Math.round(num + 'e4') + 'e-4');
  }

  /**
   * Normaliza e valida a série de candles OHLCV.
   * Garante ordenação cronológica estrita, deduplicação por data e valores numéricos positivos.
   */
  function normalizeCandles(rawCandles = []) {
    if (!Array.isArray(rawCandles)) return [];
    const valid = [];
    for (let i = 0; i < rawCandles.length; i++) {
      const c = rawCandles[i];
      if (!c) continue;
      const time = toIsoDate(c.time || c.date || c.datetime);
      const open = Number(c.open);
      const high = Number(c.high);
      const low = Number(c.low);
      const close = Number(c.close);
      const volume = Number(c.volume ?? c.vol ?? c.financialVolume ?? 0);
      const trades = Number(c.trades ?? c.negocios ?? 0);

      if (!time || !Number.isFinite(close) || close <= 0) continue;

      valid.push({
        time,
        open: Number.isFinite(open) && open > 0 ? open : close,
        high: Number.isFinite(high) && high > 0 ? high : close,
        low: Number.isFinite(low) && low > 0 ? low : close,
        close,
        volume: Number.isFinite(volume) && volume >= 0 ? volume : 0,
        trades: Number.isFinite(trades) && trades >= 0 ? trades : 0
      });
    }

    valid.sort((a, b) => a.time.localeCompare(b.time));

    // Deduplica datas preservando o último registro
    const deduped = [];
    const seen = new Set();
    for (let i = 0; i < valid.length; i++) {
      const item = valid[i];
      if (!seen.has(item.time)) {
        seen.add(item.time);
        deduped.push(item);
      }
    }
    return deduped;
  }

  /**
   * Cálculo canônico de Média Móvel Simples (SMA).
   * Retorna array com o mesmo comprimento da entrada. Índices < period - 1 recebem null.
   */
  function calculateSMA(values, period) {
    const p = Math.floor(Number(period));
    if (!Array.isArray(values) || !p || p < 1) return [];
    const result = new Array(values.length).fill(null);
    if (values.length < p) return result;

    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      const v = typeof values[i] === 'object' && values[i] !== null ? Number(values[i].close) : Number(values[i]);
      if (!Number.isFinite(v)) {
        sum = 0;
        continue;
      }
      sum += v;
      if (i >= p) {
        const oldVal = typeof values[i - p] === 'object' && values[i - p] !== null ? Number(values[i - p].close) : Number(values[i - p]);
        sum -= oldVal;
      }
      if (i >= p - 1) {
        result[i] = round4(sum / p);
      }
    }
    return result;
  }

  /**
   * Cálculo canônico do Índice de Força Relativa (IFR / RSI).
   * Suporta o método original de Welles Wilder ('WILDER') e a variante de Cutler ('CUTLER').
   * Retorna array com o mesmo comprimento da entrada. Índices < period recebem null.
   */
  function calculateRSI(closes, period = 2, method = 'WILDER') {
    const p = Math.floor(Number(period));
    if (!Array.isArray(closes) || !p || p < 1) return [];
    const result = new Array(closes.length).fill(null);
    if (closes.length <= p) return result;

    const useCutler = String(method).toUpperCase() === 'CUTLER';

    // Primeiro período: média simples dos primeiros p ganhos e perdas
    let gainSum = 0;
    let lossSum = 0;

    for (let i = 1; i <= p; i++) {
      const prev = typeof closes[i - 1] === 'object' && closes[i - 1] !== null ? Number(closes[i - 1].close) : Number(closes[i - 1]);
      const curr = typeof closes[i] === 'object' && closes[i] !== null ? Number(closes[i].close) : Number(closes[i]);
      const diff = curr - prev;
      if (diff > 0) gainSum += diff;
      else if (diff < 0) lossSum += Math.abs(diff);
    }

    let avgGain = gainSum / p;
    let avgLoss = lossSum / p;

    if (avgLoss === 0) {
      result[p] = avgGain === 0 ? 50 : 100;
    } else {
      const rs = avgGain / avgLoss;
      result[p] = round2(100 - (100 / (1 + rs)));
    }

    // Períodos subsequentes
    for (let i = p + 1; i < closes.length; i++) {
      const prev = typeof closes[i - 1] === 'object' && closes[i - 1] !== null ? Number(closes[i - 1].close) : Number(closes[i - 1]);
      const curr = typeof closes[i] === 'object' && closes[i] !== null ? Number(closes[i].close) : Number(closes[i]);
      const diff = curr - prev;
      const g = diff > 0 ? diff : 0;
      const l = diff < 0 ? Math.abs(diff) : 0;

      if (useCutler) {
        // Cutler: Média simples de p dias para ganhos e perdas
        let wGain = 0;
        let wLoss = 0;
        for (let k = 0; k < p; k++) {
          const p1 = typeof closes[i - k - 1] === 'object' && closes[i - k - 1] !== null ? Number(closes[i - k - 1].close) : Number(closes[i - k - 1]);
          const p2 = typeof closes[i - k] === 'object' && closes[i - k] !== null ? Number(closes[i - k].close) : Number(closes[i - k]);
          const d = p2 - p1;
          if (d > 0) wGain += d;
          else if (d < 0) wLoss += Math.abs(d);
        }
        avgGain = wGain / p;
        avgLoss = wLoss / p;
      } else {
        // Welles Wilder: Suavização exponencial modificada (RMA)
        avgGain = (avgGain * (p - 1) + g) / p;
        avgLoss = (avgLoss * (p - 1) + l) / p;
      }

      if (avgLoss === 0) {
        result[i] = avgGain === 0 ? 50 : 100;
      } else {
        const rs = avgGain / avgLoss;
        result[i] = round2(100 - (100 / (1 + rs)));
      }
    }

    return result;
  }

  /**
   * Constrói a série cronológica enriquecida com todos os indicadores do motor.
   */
  function computeIndicators(rawCandles, options = {}) {
    const candles = normalizeCandles(rawCandles);
    const shortMaPeriod = Number(options.shortMaPeriod || DEFAULT_PARAMETERS.shortMaPeriod);
    const longMaPeriod = Number(options.longMaPeriod || DEFAULT_PARAMETERS.longMaPeriod);
    const rsiPeriod = Number(options.rsiPeriod || DEFAULT_PARAMETERS.rsiPeriod);
    const rsiMethod = options.rsiMethod || DEFAULT_PARAMETERS.rsiMethod;

    const closes = candles.map(c => c.close);
    const smaShortArr = calculateSMA(closes, shortMaPeriod);
    const smaLongArr = calculateSMA(closes, longMaPeriod);
    const ifrArr = calculateRSI(closes, rsiPeriod, rsiMethod);

    return candles.map((c, i) => ({
      ...c,
      smaShort: smaShortArr[i],
      smaLong: smaLongArr[i],
      ifr: ifrArr[i]
    }));
  }

  /**
   * Avalia as regras de entrada do Volatility Swing IFR2 em uma barra específica (índice ou data).
   *
   * @param {Array} candlesOrSeries Série de candles ou série pré-calculada por computeIndicators
   * @param {number|string|Date} target Índice numérico ou data do sinal
   * @param {Object} [options] Parâmetros de estratégia, política de liquidez e blacklist
   * @returns {Object} Diagnóstico completo do sinal
   */
  function evaluateSignal(candlesOrSeries, target, options = {}) {
    if (!Array.isArray(candlesOrSeries) || candlesOrSeries.length === 0) {
      return {
        isValid: false,
        code: SIGNAL_CODES.INSUFFICIENT_HISTORY,
        reason: 'Histórico de negociação vazio ou ausente.'
      };
    }

    // Se a série ainda não possui os indicadores calculados, calcula agora
    const hasIndicators = candlesOrSeries[0] && ('smaShort' in candlesOrSeries[0]);
    const series = hasIndicators ? candlesOrSeries : computeIndicators(candlesOrSeries, options);

    // Localiza o índice da barra de sinal
    let idx = -1;
    if (typeof target === 'number') {
      idx = Math.floor(target);
    } else {
      const targetIso = toIsoDate(target);
      idx = series.findIndex(c => c.time === targetIso);
      if (idx === -1 && targetIso) {
        // Se a data exata for final de semana/feriado, pega o último candle anterior ou igual
        for (let i = series.length - 1; i >= 0; i--) {
          if (series[i].time <= targetIso) {
            idx = i;
            break;
          }
        }
      }
    }

    if (idx < 0 || idx >= series.length) {
      return {
        isValid: false,
        code: SIGNAL_CODES.INDEX_OUT_OF_BOUNDS,
        reason: `Índice ou data do sinal fora do alcance temporal da série (disponíveis: ${series[0]?.time} a ${series[series.length - 1]?.time}).`
      };
    }

    const bar = series[idx];
    const shortMaPeriod = Number(options.shortMaPeriod || DEFAULT_PARAMETERS.shortMaPeriod);
    const longMaPeriod = Number(options.longMaPeriod || DEFAULT_PARAMETERS.longMaPeriod);
    const rsiPeriod = Number(options.rsiPeriod || DEFAULT_PARAMETERS.rsiPeriod);
    const oversoldLevel = Number(options.oversoldLevel ?? DEFAULT_PARAMETERS.oversoldLevel);
    const holdingPeriodSessions = Number(options.holdingPeriodSessions || DEFAULT_PARAMETERS.holdingPeriodSessions);
    const fixedCapitalPerTrade = Number(options.fixedCapitalPerTrade || DEFAULT_PARAMETERS.fixedCapitalPerTrade);

    // 1. Histórico suficiente para todos os indicadores
    if (bar.smaLong === null || bar.smaLong === undefined || !Number.isFinite(bar.smaLong)) {
      return {
        isValid: false,
        code: SIGNAL_CODES.INSUFFICIENT_HISTORY_LONG_MA,
        reason: `Histórico insuficiente: são necessários no mínimo ${longMaPeriod} pregões para a média estrutural SMA(${longMaPeriod}). O ativo possui apenas ${idx + 1} candles disponíveis.`,
        metrics: { index: idx, date: bar.time, close: bar.close, smaShort: bar.smaShort, smaLong: bar.smaLong, ifr: bar.ifr }
      };
    }

    if (bar.smaShort === null || bar.smaShort === undefined || !Number.isFinite(bar.smaShort)) {
      return {
        isValid: false,
        code: SIGNAL_CODES.INSUFFICIENT_HISTORY_SHORT_MA,
        reason: `Histórico insuficiente para cálculo da média curta SMA(${shortMaPeriod}).`,
        metrics: { index: idx, date: bar.time, close: bar.close, smaShort: bar.smaShort, smaLong: bar.smaLong, ifr: bar.ifr }
      };
    }

    if (bar.ifr === null || bar.ifr === undefined || !Number.isFinite(bar.ifr)) {
      return {
        isValid: false,
        code: SIGNAL_CODES.INSUFFICIENT_HISTORY_IFR,
        reason: `Histórico insuficiente para cálculo do IFR(${rsiPeriod}).`,
        metrics: { index: idx, date: bar.time, close: bar.close, smaShort: bar.smaShort, smaLong: bar.smaLong, ifr: bar.ifr }
      };
    }

    // 2. Trava Comportamental: Blacklist de Risco Pessoal
    if (options.isBlacklisted || (Array.isArray(options.blacklist) && options.symbol && options.blacklist.includes(options.symbol.toUpperCase()))) {
      return {
        isValid: false,
        code: SIGNAL_CODES.BLACKLISTED,
        reason: `Ativo ${options.symbol} bloqueado pela Blacklist Comportamental de Risco Pessoal.`,
        metrics: { symbol: options.symbol }
      };
    }

    // 3. Salvaguarda Inegociável: Liquidity Gate (Hard Gate global de elegibilidade)
    let liquidityResult = null;
    if (options.checkLiquidity !== false && LiquidityGateModel && typeof LiquidityGateModel.evaluateLiquidity === 'function') {
      // Regra anti look-ahead: envia candles estritamente até o sinal idx
      const subCandles = series.slice(0, idx + 1);
      const symbol = options.symbol || 'ATIVO';
      const market = options.market || 'B3';
      const policy = options.policy || { liquidityGate: options.liquidityConfig || { enabled: true } };

      liquidityResult = LiquidityGateModel.evaluateLiquidity({
        candles: subCandles,
        targetDate: bar.time,
        symbol,
        market,
        policy
      });

      if (!liquidityResult.isEligible) {
        return {
          isValid: false,
          code: SIGNAL_CODES.LIQUIDITY_REJECTED,
          reason: `Bloqueado pelo Liquidity Gate: ${liquidityResult.reason}`,
          liquidity: liquidityResult,
          metrics: { close: bar.close, smaShort: bar.smaShort, smaLong: bar.smaLong, ifr: bar.ifr, oversoldLevel }
        };
      }
    }

    // 4. Filtro Estrutural de Tendência: Fechamento estritamente acima da média longa (SMA200)
    if (!(bar.close > bar.smaLong)) {
      return {
        isValid: false,
        code: SIGNAL_CODES.NOT_ABOVE_LONG_MA,
        reason: `Filtro estrutural reprovado: Fechamento (R$ ${bar.close.toFixed(2)}) não está acima da SMA(${longMaPeriod}) estrutural (R$ ${bar.smaLong.toFixed(2)}). Tendência primária não é de alta.`,
        liquidity: liquidityResult,
        metrics: { close: bar.close, smaShort: bar.smaShort, smaLong: bar.smaLong, ifr: bar.ifr, oversoldLevel }
      };
    }

    // 5. Condição de Preço: Fechamento estritamente abaixo da média curta (SMA7)
    if (!(bar.close < bar.smaShort)) {
      return {
        isValid: false,
        code: SIGNAL_CODES.NOT_BELOW_SHORT_MA,
        reason: `Condição de preço reprovada: Fechamento (R$ ${bar.close.toFixed(2)}) não está abaixo da SMA(${shortMaPeriod}) curta (R$ ${bar.smaShort.toFixed(2)}). Ativo não está em correção de curto prazo.`,
        liquidity: liquidityResult,
        metrics: { close: bar.close, smaShort: bar.smaShort, smaLong: bar.smaLong, ifr: bar.ifr, oversoldLevel }
      };
    }

    // 6. Oscilador de Sobrevenda: IFR menor ou igual ao nível configurado (IFR <= oversoldLevel)
    if (!(bar.ifr <= oversoldLevel)) {
      return {
        isValid: false,
        code: SIGNAL_CODES.RSI_NOT_OVERSOLD,
        reason: `IFR(${rsiPeriod}) em ${bar.ifr.toFixed(2)} está acima do nível de sobrevenda configurado (${oversoldLevel}).`,
        liquidity: liquidityResult,
        metrics: { close: bar.close, smaShort: bar.smaShort, smaLong: bar.smaLong, ifr: bar.ifr, oversoldLevel }
      };
    }

    // SINAL CONFIRMADO COM SUCESSO
    return {
      isValid: true,
      code: SIGNAL_CODES.SIGNAL_CONFIRMED,
      strategyType: STRATEGY_TYPE,
      entrySetup: SETUP_NAME,
      symbol: options.symbol || null,
      market: options.market || 'B3',
      signalDate: bar.time,
      signalIndex: idx,
      signalPrice: bar.close,
      parameters: {
        shortMaPeriod,
        longMaPeriod,
        rsiPeriod,
        oversoldLevel,
        holdingPeriodSessions,
        positionSizingModel: 'FIXED_FINANCIAL',
        fixedCapitalPerTrade,
        stopModel: 'NONE'
      },
      indicators: {
        close: bar.close,
        smaShort: bar.smaShort,
        smaLong: bar.smaLong,
        ifr: bar.ifr
      },
      liquidity: liquidityResult
    };
  }

  /**
   * Simula o ciclo de vida completo de uma operação disparada a partir do candle de sinal.
   *
   * Regras de execução e tempo:
   * - Entrada em T+1 na abertura (Open), com tratamento de gap.
   * - D0 é o dia de entrada executada (T+1).
   * - D1 é o primeiro pregão completo subsequente à execução (T+2).
   * - No fechamento de cada sessão D1..D7:
   *   Se Close > SMA7: Saída imediata no fechamento com motivo 'TARGET_MA_RECOVERY'.
   * - No fechamento de D7 (7º pregão completo):
   *   Se não ocorreu saída por recuperação: Saída no fechamento de D7 com motivo 'TIME_EXIT'.
   *
   * @param {Object} params
   * @param {Array} params.series Série enriquecida com candles e indicadores
   * @param {number} params.signalIndex Índice da barra de sinal T
   * @param {Object} [params.options] Parâmetros de estratégia e capital
   * @returns {Object} Detalhes completos do trade executado ou em aberto
   */
  function simulateTradeLifecycle({ series, signalIndex, options = {} }) {
    if (!Array.isArray(series) || signalIndex < 0 || signalIndex >= series.length) {
      throw new Error('Série de candles ou índice de sinal inválido.');
    }

    const signalBar = series[signalIndex];
    const shortMaPeriod = Number(options.shortMaPeriod || DEFAULT_PARAMETERS.shortMaPeriod);
    const longMaPeriod = Number(options.longMaPeriod || DEFAULT_PARAMETERS.longMaPeriod);
    const rsiPeriod = Number(options.rsiPeriod || DEFAULT_PARAMETERS.rsiPeriod);
    const oversoldLevel = Number(options.oversoldLevel ?? DEFAULT_PARAMETERS.oversoldLevel);
    const holdingPeriodSessions = Number(options.holdingPeriodSessions || DEFAULT_PARAMETERS.holdingPeriodSessions);
    const fixedCapital = Number(options.fixedCapitalPerTrade || DEFAULT_PARAMETERS.fixedCapitalPerTrade);

    const entryIndex = signalIndex + 1;

    // Se o candle de sinal é o último disponível na base, a ordem está aguardando abertura do próximo pregão
    if (entryIndex >= series.length) {
      return {
        status: 'PENDING_NEXT_OPEN',
        strategyType: STRATEGY_TYPE,
        entrySetup: SETUP_NAME,
        symbol: options.symbol || null,
        signalDate: signalBar.time,
        signalPrice: signalBar.close,
        signalIndicators: {
          close: signalBar.close,
          smaShort: signalBar.smaShort,
          smaLong: signalBar.smaLong,
          ifr: signalBar.ifr
        },
        entryExpectedDate: null,
        entryPrice: null,
        message: 'Sinal confirmado no fechamento de ' + signalBar.time + '. Aguardando abertura do próximo pregão para execução a mercado.'
      };
    }

    const entryBar = series[entryIndex];
    const entryDate = entryBar.time;
    const entryPrice = entryBar.open; // Preço negociável realista da abertura de T+1

    // Cálculo do gap de abertura em relação ao fechamento do sinal
    const entryGapPct = round2(((entryPrice - signalBar.close) / signalBar.close) * 100);

    // Position sizing: capital financeiro fixo
    const sharesQuantity = Math.floor(fixedCapital / entryPrice);
    if (sharesQuantity <= 0) {
      return {
        status: 'REJECTED_CAPITAL_INSUFFICIENT',
        strategyType: STRATEGY_TYPE,
        entrySetup: SETUP_NAME,
        symbol: options.symbol || null,
        signalDate: signalBar.time,
        entryDate,
        entryPrice,
        fixedCapital,
        sharesQuantity: 0,
        reason: `Preço de entrada (R$ ${entryPrice.toFixed(2)}) superior ao capital financeiro alocado (R$ ${fixedCapital.toFixed(2)}).`
      };
    }

    const allocatedCapital = round2(sharesQuantity * entryPrice);
    const remainingCash = round2(fixedCapital - allocatedCapital);

    // Contagem de pregões e verificação de saída
    // D0 = entryIndex (T+1)
    // D1 = entryIndex + 1 (T+2)
    // ...
    // Dk = entryIndex + k (T+1+k)
    let exitBar = null;
    let exitReason = null;
    let holdingSessions = 0;
    let isClosed = false;

    for (let k = 1; k <= holdingPeriodSessions; k++) {
      const sessionIdx = entryIndex + k;

      // Se a base de dados terminou antes de completar as sessões necessárias
      if (sessionIdx >= series.length) {
        holdingSessions = k - 1; // sessões completas decorridas até a última data
        break;
      }

      const currentSessionBar = series[sessionIdx];

      // 1. Saída por Recuperação: Fechamento diário acima da SMA curta (SMA7)
      // Tem precedência sobre saída temporal inclusive no pregão D7
      if (currentSessionBar.close > currentSessionBar.smaShort) {
        exitBar = currentSessionBar;
        exitReason = EXIT_REASONS.TARGET_MA_RECOVERY;
        holdingSessions = k;
        isClosed = true;
        break;
      }

      // 2. Saída Temporal: Limite de permanência atingido (D7)
      if (k === holdingPeriodSessions) {
        exitBar = currentSessionBar;
        exitReason = EXIT_REASONS.TIME_EXIT;
        holdingSessions = k;
        isClosed = true;
        break;
      }
    }

    // Trade ainda em aberto na base histórica
    if (!isClosed) {
      const lastAvailableBar = series[series.length - 1];
      const unrealizedPnl = round2(sharesQuantity * (lastAvailableBar.close - entryPrice));
      const unrealizedReturnPct = round2(((lastAvailableBar.close - entryPrice) / entryPrice) * 100);

      return {
        status: 'OPEN',
        strategyType: STRATEGY_TYPE,
        entrySetup: SETUP_NAME,
        symbol: options.symbol || null,
        market: options.market || 'B3',
        signalDate: signalBar.time,
        signalPrice: signalBar.close,
        signalIndicators: {
          close: signalBar.close,
          smaShort: signalBar.smaShort,
          smaLong: signalBar.smaLong,
          ifr: signalBar.ifr
        },
        entryDate,
        entryPrice,
        entryGapPct,
        sharesQuantity,
        allocatedCapital,
        remainingCash,
        currentHoldingSessions: holdingSessions,
        maxHoldingSessions: holdingPeriodSessions,
        lastDate: lastAvailableBar.time,
        lastPrice: lastAvailableBar.close,
        lastIndicators: {
          close: lastAvailableBar.close,
          smaShort: lastAvailableBar.smaShort,
          smaLong: lastAvailableBar.smaLong
        },
        unrealizedPnl,
        unrealizedReturnPct,
        parameters: {
          shortMaPeriod,
          longMaPeriod,
          rsiPeriod,
          oversoldLevel,
          holdingPeriodSessions,
          fixedCapitalPerTrade: fixedCapital
        }
      };
    }

    // Trade encerrado com sucesso
    const exitPrice = exitBar.close;
    const exitDate = exitBar.time;
    const grossPnl = round2(sharesQuantity * (exitPrice - entryPrice));
    const returnPct = round2(((exitPrice - entryPrice) / entryPrice) * 100);
    const exitCapital = round2(sharesQuantity * exitPrice);

    let outcome = 'BREAKEVEN';
    if (grossPnl > 0.005) outcome = 'WIN';
    else if (grossPnl < -0.005) outcome = 'LOSS';

    return {
      status: 'CLOSED',
      strategyType: STRATEGY_TYPE,
      entrySetup: SETUP_NAME,
      symbol: options.symbol || null,
      market: options.market || 'B3',
      signalDate: signalBar.time,
      signalPrice: signalBar.close,
      signalIndicators: {
        close: signalBar.close,
        smaShort: signalBar.smaShort,
        smaLong: signalBar.smaLong,
        ifr: signalBar.ifr
      },
      entryDate,
      entryPrice,
      entryGapPct,
      sharesQuantity,
      allocatedCapital,
      remainingCash,
      exitDate,
      exitPrice,
      exitCapital,
      exitReason,
      exitIndicators: {
        close: exitBar.close,
        smaShort: exitBar.smaShort,
        smaLong: exitBar.smaLong
      },
      holdingSessions,
      grossPnl,
      returnPct,
      outcome,
      parameters: {
        shortMaPeriod,
        longMaPeriod,
        rsiPeriod,
        oversoldLevel,
        holdingPeriodSessions,
        fixedCapitalPerTrade: fixedCapital
      }
    };
  }

  /**
   * Executa a simulação sequencial (backtest) de um ativo em todo o seu histórico disponível.
   * Não permite entradas simultâneas sobrepostas no mesmo ticker (uma posição por vez).
   * Sem look-ahead bias: cada decisão usa exclusivamente os dados disponíveis até aquele instante.
   */
  function simulateAsset(rawCandles, options = {}) {
    const series = computeIndicators(rawCandles, options);
    const symbol = options.symbol || 'ATIVO';
    const market = options.market || 'B3';
    const longMaPeriod = Number(options.longMaPeriod || DEFAULT_PARAMETERS.longMaPeriod);

    const trades = [];
    let i = longMaPeriod - 1;

    while (i < series.length) {
      // Avalia sinal estritamente no candle i
      const signalResult = evaluateSignal(series, i, { ...options, symbol, market });

      if (signalResult.isValid) {
        // Simula ciclo de vida a partir deste sinal
        const trade = simulateTradeLifecycle({ series, signalIndex: i, options: { ...options, symbol, market } });

        if (trade && trade.status === 'CLOSED') {
          trades.push(trade);
          // Avança o cursor para a data de saída para evitar novos trades sobrepostos no mesmo ativo
          const exitIdx = series.findIndex(c => c.time === trade.exitDate);
          i = exitIdx >= 0 ? exitIdx + 1 : i + 1;
          continue;
        } else if (trade && trade.status === 'OPEN') {
          trades.push(trade);
          break; // Posição em aberto até o fim da série
        }
      }
      i++;
    }

    // Consolidação de métricas estatísticas
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    const winningTrades = closedTrades.filter(t => t.outcome === 'WIN');
    const losingTrades = closedTrades.filter(t => t.outcome === 'LOSS');
    const breakevenTrades = closedTrades.filter(t => t.outcome === 'BREAKEVEN');

    const totalGrossProfit = winningTrades.reduce((acc, t) => acc + t.grossPnl, 0);
    const totalGrossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + t.grossPnl, 0));
    const netProfit = round2(totalGrossProfit - totalGrossLoss);

    const winRatePct = closedTrades.length > 0 ? round2((winningTrades.length / closedTrades.length) * 100) : 0;
    const profitFactor = totalGrossLoss > 0 ? round2(totalGrossProfit / totalGrossLoss) : (totalGrossProfit > 0 ? 999 : 0);

    const avgTradeReturnPct = closedTrades.length > 0
      ? round2(closedTrades.reduce((acc, t) => acc + t.returnPct, 0) / closedTrades.length)
      : 0;

    const avgWinPct = winningTrades.length > 0
      ? round2(winningTrades.reduce((acc, t) => acc + t.returnPct, 0) / winningTrades.length)
      : 0;

    const avgLossPct = losingTrades.length > 0
      ? round2(losingTrades.reduce((acc, t) => acc + t.returnPct, 0) / losingTrades.length)
      : 0;

    const payoffRatio = Math.abs(avgLossPct) > 0 ? round2(avgWinPct / Math.abs(avgLossPct)) : (avgWinPct > 0 ? 99 : 0);

    const avgHoldingSessions = closedTrades.length > 0
      ? round2(closedTrades.reduce((acc, t) => acc + t.holdingSessions, 0) / closedTrades.length)
      : 0;

    // Distribuição por motivo de saída
    const exitsBreakdown = {
      [EXIT_REASONS.TARGET_MA_RECOVERY]: closedTrades.filter(t => t.exitReason === EXIT_REASONS.TARGET_MA_RECOVERY).length,
      [EXIT_REASONS.TIME_EXIT]: closedTrades.filter(t => t.exitReason === EXIT_REASONS.TIME_EXIT).length
    };

    // Curva de capital e Max Drawdown
    let currentEquity = Number(options.initialCapital || 100000);
    let peakEquity = currentEquity;
    let maxDrawdownPct = 0;
    const equityCurve = [{ date: series[0]?.time || 'INICIO', equity: currentEquity, tradePnl: 0 }];

    for (const t of closedTrades) {
      currentEquity = round2(currentEquity + t.grossPnl);
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }
      const ddPct = peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0;
      if (ddPct > maxDrawdownPct) {
        maxDrawdownPct = round2(ddPct);
      }
      equityCurve.push({
        date: t.exitDate,
        equity: currentEquity,
        tradePnl: t.grossPnl,
        symbol: t.symbol,
        returnPct: t.returnPct
      });
    }

    return {
      symbol,
      market,
      strategyType: STRATEGY_TYPE,
      entrySetup: SETUP_NAME,
      summary: {
        totalTrades: closedTrades.length,
        openTrades: trades.filter(t => t.status === 'OPEN').length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        breakevenTrades: breakevenTrades.length,
        winRatePct,
        profitFactor,
        netProfit,
        totalGrossProfit: round2(totalGrossProfit),
        totalGrossLoss: round2(totalGrossLoss),
        avgTradeReturnPct,
        avgWinPct,
        avgLossPct,
        payoffRatio,
        avgHoldingSessions,
        maxDrawdownPct,
        exitsBreakdown
      },
      trades,
      equityCurve
    };
  }

  /**
   * Rastreia todo o universo de ativos na data solicitada em busca de novas oportunidades de Volatility Swing.
   *
   * @param {Map|Object} candlesMap Dicionário de histórico { symbol: candles[] }
   * @param {Object} [options] Opções de filtro e data
   * @returns {Object} Lista ordenada de sinais confirmados
   */
  function scanUniverse(candlesMap, options = {}) {
    const mapEntries = candlesMap instanceof Map ? Array.from(candlesMap.entries()) : Object.entries(candlesMap || {});
    const asOfDate = options.asOfDate ? toIsoDate(options.asOfDate) : null;
    const signals = [];
    let totalEvaluated = 0;
    let rejectedCount = 0;

    for (const [symbol, candles] of mapEntries) {
      if (!Array.isArray(candles) || candles.length < 200) continue;
      totalEvaluated++;

      // Determina a data alvo
      const targetDate = asOfDate || candles[candles.length - 1]?.time;
      const evalRes = evaluateSignal(candles, targetDate, { ...options, symbol });

      if (evalRes && evalRes.isValid) {
        signals.push({
          symbol,
          market: evalRes.market || 'B3',
          signalDate: evalRes.signalDate,
          signalPrice: evalRes.signalPrice,
          ifr: evalRes.indicators.ifr,
          smaShort: evalRes.indicators.smaShort,
          smaLong: evalRes.indicators.smaLong,
          oversoldLevel: evalRes.parameters.oversoldLevel,
          parameters: evalRes.parameters,
          liquidity: evalRes.liquidity
        });
      } else {
        rejectedCount++;
      }
    }

    // Ordena do menor IFR para o maior (ativos mais sobrevendidos primeiro)
    signals.sort((a, b) => (a.ifr - b.ifr));

    return {
      strategyType: STRATEGY_TYPE,
      setupName: SETUP_NAME,
      asOfDate,
      totalEvaluated,
      rejectedCount,
      signalsFound: signals.length,
      signals
    };
  }

  return Object.freeze({
    STRATEGY_TYPE,
    SETUP_NAME,
    EXIT_REASONS,
    SIGNAL_CODES,
    DEFAULT_PARAMETERS,
    toIsoDate,
    round2,
    round4,
    normalizeCandles,
    calculateSMA,
    calculateRSI,
    computeIndicators,
    evaluateSignal,
    simulateTradeLifecycle,
    simulateAsset,
    scanUniverse
  });
});
