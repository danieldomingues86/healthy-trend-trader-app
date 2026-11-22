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
    EXTREME_EVENT_EXIT: 'EXTREME_EVENT_EXIT',
    MANUAL_EXIT: 'MANUAL_EXIT',
    STOP_LOSS: 'STOP_LOSS'
  });

  const EXIT_EXECUTION_MODES = Object.freeze({
    SAME_CLOSE: 'SAME_CLOSE',
    NEXT_OPEN: 'NEXT_OPEN'
  });

  const RS_FILTER_MODES = Object.freeze({
    NONE: 'NONE',
    RS_POSITIVE: 'RS_POSITIVE',
    RS_RISING: 'RS_RISING'
  });

  const POSITION_SIZING_MODELS = Object.freeze({
    FIXED_FINANCIAL: 'FIXED_FINANCIAL',
    EQUITY_PERCENT: 'EQUITY_PERCENT'
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
    RS_FILTER_REJECTED: 'RS_FILTER_REJECTED',
    EXTREME_EVENT_BLOCKED: 'EXTREME_EVENT_BLOCKED',
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

  const indicatorSeriesWeakCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  /**
   * Constrói a série cronológica enriquecida com todos os indicadores do motor.
   * Calcula também indicadores causais opcionais de Força Relativa (RS) para experimentos (Seção 4.9),
   * utilizando exclusivamente barras fechadas até o índice i (zero look-ahead bias).
   */
  function computeIndicators(rawCandles, options = {}) {
    const shortMaPeriod = Number(options.shortMaPeriod || DEFAULT_PARAMETERS.shortMaPeriod);
    const longMaPeriod = Number(options.longMaPeriod || DEFAULT_PARAMETERS.longMaPeriod);
    const rsiPeriod = Number(options.rsiPeriod || DEFAULT_PARAMETERS.rsiPeriod);
    const rsiMethod = options.rsiMethod || DEFAULT_PARAMETERS.rsiMethod;

    let cacheByParams = null;
    let cacheKey = null;
    if (indicatorSeriesWeakCache && Array.isArray(rawCandles) && rawCandles.length > 0) {
      const firstC = rawCandles[0];
      const lastC = rawCandles[rawCandles.length - 1];
      cacheKey = `${shortMaPeriod}:${longMaPeriod}:${rsiPeriod}:${rsiMethod}:${rawCandles.length}:${firstC?.time || firstC?.date || ''}:${lastC?.time || lastC?.date || ''}:${lastC?.close || ''}`;
      cacheByParams = indicatorSeriesWeakCache.get(rawCandles);
      if (cacheByParams && cacheByParams.has(cacheKey)) {
        return cacheByParams.get(cacheKey);
      }
    }

    const candles = normalizeCandles(rawCandles);
    const closes = candles.map(c => c.close);
    const smaShortArr = calculateSMA(closes, shortMaPeriod);
    const smaLongArr = calculateSMA(closes, longMaPeriod);
    const ifrArr = calculateRSI(closes, rsiPeriod, rsiMethod);

    // Cálculo causal de Força Relativa (RS) por barra para uso apenas quando rsFilterMode for ativado em experimentos
    const rsScoreArr = new Array(candles.length).fill(null);
    for (let i = 0; i < candles.length; i++) {
      const cNow = closes[i];
      if (!Number.isFinite(cNow) || cNow <= 0) continue;
      const idx21 = Math.max(0, i - 21);
      const idx63 = Math.max(0, i - 63);
      const c21 = closes[idx21] || cNow;
      const c63 = closes[idx63] || c21;
      const ret21 = c21 > 0 ? ((cNow / c21) - 1) * 100 : 0;
      const ret63 = c63 > 0 ? ((cNow / c63) - 1) * 100 : ret21;
      const rawRs = Math.round(50 + (ret63 * 1.15) + (ret21 * 0.45));
      rsScoreArr[i] = Math.max(1, Math.min(99, rawRs));
    }

    const enriched = candles.map((c, i) => {
      const rsNow = rsScoreArr[i];
      const rsPrev5 = i >= 5 ? rsScoreArr[i - 5] : rsNow;
      const idx63 = Math.max(0, i - 63);
      const ret63 = closes[idx63] > 0 ? ((c.close / closes[idx63]) - 1) * 100 : 0;
      const rsPositive = (rsNow !== null && rsNow >= 50) || ret63 > 0;
      const rsRising = rsNow !== null && rsPrev5 !== null && rsNow > rsPrev5;

      return {
        ...c,
        smaShort: smaShortArr[i],
        smaLong: smaLongArr[i],
        ifr: ifrArr[i],
        rsScore: rsNow,
        rsPrev5,
        rsPositive,
        rsRising
      };
    });

    Object.defineProperty(enriched, '_isChronological', { value: true, enumerable: false });

    if (indicatorSeriesWeakCache && Array.isArray(rawCandles) && rawCandles.length > 0 && cacheKey) {
      if (!cacheByParams) {
        cacheByParams = new Map();
        indicatorSeriesWeakCache.set(rawCandles, cacheByParams);
      }
      cacheByParams.set(cacheKey, enriched);
    }

    return enriched;
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
    const positionSizingModel = options.positionSizingModel || DEFAULT_PARAMETERS.positionSizingModel;
    const equityPercentPerTrade = Number(options.equityPercentPerTrade || 5);
    const rsFilterMode = String(options.rsFilterMode || RS_FILTER_MODES.NONE).toUpperCase();

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

    // 2.1. Proteção Obrigatória contra Eventos Extremos (Seção 11): bloqueia novos sinais na véspera de evento extremo
    if (options.preEventBlockedDates instanceof Set && options.preEventBlockedDates.has(bar.time)) {
      return {
        isValid: false,
        code: SIGNAL_CODES.EXTREME_EVENT_BLOCKED,
        reason: `Sinal bloqueado preventivamente: data ${bar.time} precede evento extremo monitorado.`,
        metrics: { date: bar.time, symbol: options.symbol }
      };
    }

    // 3. Salvaguarda Inegociável: Liquidity Gate (Hard Gate global de elegibilidade, Seção 4.8)
    let liquidityResult = null;
    if (options.checkLiquidity !== false && LiquidityGateModel && typeof LiquidityGateModel.evaluateLiquidity === 'function') {
      // Regra anti look-ahead: envia candles estritamente até o sinal idx
      const subCandles = series._isChronological ? series : series.slice(0, idx + 1);
      const symbol = options.symbol || 'ATIVO';
      const market = options.market || 'B3';

      const customMinVol = Number(options.minFinancialVolume || options.minDailyLiquidity || 0);
      const customWindow = Number(options.liquidityWindowSessions || 0);
      const customMinTrades = Number(options.minDailyTrades || 0);

      const baseLiqCfg = {
        enabled: true,
        ...(options.liquidityConfig || {})
      };
      if (customMinVol > 0) baseLiqCfg.minDailyFinancialVolumeB3 = customMinVol;
      if (customWindow > 0) baseLiqCfg.windowSessions = customWindow;
      if (customMinTrades > 0) baseLiqCfg.minDailyTrades = customMinTrades;

      const policy = options.policy || { liquidityGate: baseLiqCfg };

      liquidityResult = LiquidityGateModel.evaluateLiquidity({
        candles: subCandles,
        targetDate: bar.time,
        targetIndex: series._isChronological ? idx : undefined,
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

      // Se quantidade mínima de negócios foi explicitamente exigida no cenário e o ativo possui dados de negócios
      if (customMinTrades > 0 && liquidityResult.metrics && liquidityResult.metrics.hasTradesData) {
        if (liquidityResult.metrics.averageDailyTrades < customMinTrades) {
          return {
            isValid: false,
            code: SIGNAL_CODES.LIQUIDITY_REJECTED,
            reason: `Bloqueado pelo Liquidity Gate: média de negócios (${Math.round(liquidityResult.metrics.averageDailyTrades)}/dia) inferior ao mínimo configurado (${customMinTrades}/dia).`,
            liquidity: liquidityResult,
            metrics: { close: bar.close, smaShort: bar.smaShort, smaLong: bar.smaLong, ifr: bar.ifr, oversoldLevel }
          };
        }
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

    // 7. Filtro Opcional Experimental de Força Relativa (RS — Seção 4.9)
    if (rsFilterMode === RS_FILTER_MODES.RS_POSITIVE) {
      const isPos = bar.rsPositive !== undefined ? bar.rsPositive : true;
      if (!isPos) {
        return {
          isValid: false,
          code: SIGNAL_CODES.RS_FILTER_REJECTED,
          reason: `Filtro experimental de Força Relativa (RS Positiva) reprovado na data ${bar.time}.`,
          liquidity: liquidityResult,
          metrics: { close: bar.close, smaShort: bar.smaShort, smaLong: bar.smaLong, ifr: bar.ifr, rsScore: bar.rsScore }
        };
      }
    } else if (rsFilterMode === RS_FILTER_MODES.RS_RISING) {
      const isRis = bar.rsRising !== undefined ? bar.rsRising : true;
      if (!isRis) {
        return {
          isValid: false,
          code: SIGNAL_CODES.RS_FILTER_REJECTED,
          reason: `Filtro experimental de Força Relativa (RS Crescente) reprovado na data ${bar.time}.`,
          liquidity: liquidityResult,
          metrics: { close: bar.close, smaShort: bar.smaShort, smaLong: bar.smaLong, ifr: bar.ifr, rsScore: bar.rsScore }
        };
      }
    }

    const validatedConditions = [
      `IFR(${rsiPeriod}) = ${bar.ifr.toFixed(2)} <= ${oversoldLevel}`,
      `Close (${bar.close.toFixed(2)}) < SMA(${shortMaPeriod}) (${bar.smaShort.toFixed(2)})`,
      `Close (${bar.close.toFixed(2)}) > SMA(${longMaPeriod}) (${bar.smaLong.toFixed(2)})`,
      options.checkLiquidity === false ? 'Liquidez: Isenta em modo teste' : 'Liquidez: Aprovada (Liquidity Gate)'
    ];
    if (rsFilterMode !== RS_FILTER_MODES.NONE) {
      validatedConditions.push(`Filtro RS: ${rsFilterMode} aprovado (RS ${bar.rsScore ?? 'N/D'})`);
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
      validatedConditions,
      parameters: {
        shortMaPeriod,
        longMaPeriod,
        rsiPeriod,
        oversoldLevel,
        holdingPeriodSessions,
        positionSizingModel,
        fixedCapitalPerTrade,
        equityPercentPerTrade,
        rsFilterMode,
        stopModel: 'NONE'
      },
      indicators: {
        close: bar.close,
        smaShort: bar.smaShort,
        smaLong: bar.smaLong,
        ifr: bar.ifr,
        rsScore: bar.rsScore ?? null,
        rsPositive: bar.rsPositive ?? null,
        rsRising: bar.rsRising ?? null
      },
      liquidity: liquidityResult
    };
  }

  /**
   * Simula o ciclo de vida completo de uma operação disparada a partir do candle de sinal.
   *
   * Regras de execução e tempo:
   * - Entrada em T+1 na abertura (Open), com tratamento de gap, slippage e custos.
   * - D0 é o dia de entrada executada (T+1).
   * - D1 é o primeiro pregão completo subsequente à execução (T+2).
   * - No fechamento de cada sessão D1..D7:
   *   Se Close > SMA7:
   *     - Quando exitExecutionTiming === 'NEXT_OPEN': confirma sinal de saída no fechamento e executa na abertura do próximo pregão (respeitando gaps e custos).
   *     - Quando exitExecutionTiming === 'SAME_CLOSE' (default legado): executa no fechamento da própria sessão.
   * - No limite de permanência D7 (7º pregão):
   *   Se não ocorreu saída por recuperação: encerra com motivo 'TIME_EXIT'.
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
    const positionSizingModel = String(options.positionSizingModel || DEFAULT_PARAMETERS.positionSizingModel).toUpperCase();
    const currentEquity = Number(options.currentEquity || options.initialCapital || 100000);
    const equityPercentPerTrade = Number(options.equityPercentPerTrade || 10);
    const fixedCapital = positionSizingModel === POSITION_SIZING_MODELS.EQUITY_PERCENT
      ? round2(currentEquity * (equityPercentPerTrade / 100))
      : Number(options.fixedCapitalPerTrade || DEFAULT_PARAMETERS.fixedCapitalPerTrade);
    const exitExecutionTiming = String(options.exitExecutionTiming || EXIT_EXECUTION_MODES.SAME_CLOSE).toUpperCase();
    const slippagePct = Number(options.slippagePct || 0);
    const costsPerTrade = Number(options.costsPerTrade || 0);

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
    const rawEntryPrice = entryBar.open; // Preço negociável realista da abertura de T+1
    const slippageRate = slippagePct / 100;
    const entryPrice = slippagePct > 0 ? round4(rawEntryPrice * (1 + slippageRate)) : rawEntryPrice;

    // Cálculo do gap de abertura em relação ao fechamento do sinal
    const entryGapPct = round2(((rawEntryPrice - signalBar.close) / signalBar.close) * 100);

    // Position sizing: capital financeiro fixo ou percentual do patrimônio
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

    // Rastreamento de MAE (Maximum Adverse Excursion) e MFE (Maximum Favorable Excursion) desde D0
    let minLowPrice = Number.isFinite(entryBar.low) ? entryBar.low : rawEntryPrice;
    let maxHighPrice = Number.isFinite(entryBar.high) ? entryBar.high : rawEntryPrice;

    let exitBar = null;
    let exitSignalBar = null;
    let exitReason = null;
    let holdingSessions = 0;
    let isClosed = false;
    let useOpenPriceOnExit = false;

    for (let k = 1; k <= holdingPeriodSessions; k++) {
      const sessionIdx = entryIndex + k;

      // Se a base de dados terminou antes de completar as sessões necessárias
      if (sessionIdx >= series.length) {
        holdingSessions = k - 1; // sessões completas decorridas até a última data
        break;
      }

      const currentSessionBar = series[sessionIdx];
      if (Number.isFinite(currentSessionBar.low) && currentSessionBar.low < minLowPrice) {
        minLowPrice = currentSessionBar.low;
      }
      if (Number.isFinite(currentSessionBar.high) && currentSessionBar.high > maxHighPrice) {
        maxHighPrice = currentSessionBar.high;
      }

      // 0. Proteção Obrigatória contra Eventos Extremos (Seção 11)
      if (options.preEventBlockedDates instanceof Set && options.preEventBlockedDates.has(currentSessionBar.time)) {
        exitSignalBar = currentSessionBar;
        exitBar = currentSessionBar;
        exitReason = EXIT_REASONS.EXTREME_EVENT_EXIT;
        holdingSessions = k;
        isClosed = true;
        useOpenPriceOnExit = false;
        break;
      }

      // 1. Saída por Recuperação: Fechamento diário acima da SMA curta (SMA7)
      // Tem precedência sobre saída temporal inclusive no pregão D7
      if (currentSessionBar.close > currentSessionBar.smaShort) {
        exitSignalBar = currentSessionBar;
        exitReason = EXIT_REASONS.TARGET_MA_RECOVERY;
        holdingSessions = k;

        if (exitExecutionTiming === EXIT_EXECUTION_MODES.NEXT_OPEN) {
          if (sessionIdx + 1 < series.length) {
            exitBar = series[sessionIdx + 1];
            if (Number.isFinite(exitBar.open)) {
              if (exitBar.open < minLowPrice) minLowPrice = exitBar.open;
              if (exitBar.open > maxHighPrice) maxHighPrice = exitBar.open;
            }
            useOpenPriceOnExit = true;
            isClosed = true;
          } else {
            // Sinal de saída confirmado no último candle, aguardando abertura do próximo pregão
            isClosed = false;
          }
        } else {
          exitBar = currentSessionBar;
          useOpenPriceOnExit = false;
          isClosed = true;
        }
        break;
      }

      // 2. Saída Temporal: Limite de permanência atingido (D7)
      if (k === holdingPeriodSessions) {
        exitSignalBar = currentSessionBar;
        exitReason = EXIT_REASONS.TIME_EXIT;
        holdingSessions = k;
        if (exitExecutionTiming === EXIT_EXECUTION_MODES.NEXT_OPEN && options.timeExitNextOpen === true) {
          if (sessionIdx + 1 < series.length) {
            exitBar = series[sessionIdx + 1];
            useOpenPriceOnExit = true;
            isClosed = true;
          } else {
            isClosed = false;
          }
        } else {
          exitBar = currentSessionBar;
          useOpenPriceOnExit = false;
          isClosed = true;
        }
        break;
      }
    }

    const maePct = round2(Math.min(0, ((minLowPrice - entryPrice) / entryPrice) * 100));
    const mfePct = round2(Math.max(0, ((maxHighPrice - entryPrice) / entryPrice) * 100));
    const maeAmount = round2(sharesQuantity * Math.min(0, minLowPrice - entryPrice));
    const mfeAmount = round2(sharesQuantity * Math.max(0, maxHighPrice - entryPrice));

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
        maePct,
        mfePct,
        maeAmount,
        mfeAmount,
        unrealizedPnl,
        unrealizedReturnPct,
        parameters: {
          shortMaPeriod,
          longMaPeriod,
          rsiPeriod,
          oversoldLevel,
          holdingPeriodSessions,
          positionSizingModel,
          fixedCapitalPerTrade: fixedCapital
        }
      };
    }

    // Trade encerrado com sucesso
    const rawExitPrice = useOpenPriceOnExit ? exitBar.open : exitBar.close;
    const exitPrice = slippagePct > 0 ? round4(rawExitPrice * (1 - slippageRate)) : rawExitPrice;
    const exitDate = exitBar.time;
    const signalExitClose = exitSignalBar ? exitSignalBar.close : rawExitPrice;
    const exitGapPct = useOpenPriceOnExit && signalExitClose > 0
      ? round2(((rawExitPrice - signalExitClose) / signalExitClose) * 100)
      : 0;
    const grossPnl = round2(sharesQuantity * (rawExitPrice - rawEntryPrice));
    const totalCosts = round2(costsPerTrade * 2);
    const netPnl = round2(sharesQuantity * (exitPrice - entryPrice) - totalCosts);
    const returnPct = round2(((exitPrice - entryPrice) / entryPrice) * 100);
    const exitCapital = round2(sharesQuantity * exitPrice);

    let outcome = 'BREAKEVEN';
    const refPnl = (slippagePct > 0 || costsPerTrade > 0) ? netPnl : grossPnl;
    if (refPnl > 0.005) outcome = 'WIN';
    else if (refPnl < -0.005) outcome = 'LOSS';

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
        ifr: signalBar.ifr,
        rsScore: signalBar.rsScore ?? null
      },
      entryDate,
      entryPrice,
      rawEntryPrice,
      entryGapPct,
      sharesQuantity,
      allocatedCapital,
      remainingCash,
      exitSignalDate: exitSignalBar ? exitSignalBar.time : exitDate,
      exitDate,
      exitPrice,
      rawExitPrice,
      exitGapPct,
      exitCapital,
      exitReason,
      exitExecutionTiming,
      exitIndicators: {
        close: (exitSignalBar || exitBar).close,
        smaShort: (exitSignalBar || exitBar).smaShort,
        smaLong: (exitSignalBar || exitBar).smaLong
      },
      holdingSessions,
      maePct,
      mfePct,
      maeAmount,
      mfeAmount,
      grossPnl,
      netPnl,
      returnPct,
      outcome,
      parameters: {
        shortMaPeriod,
        longMaPeriod,
        rsiPeriod,
        oversoldLevel,
        holdingPeriodSessions,
        positionSizingModel,
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
    EXIT_EXECUTION_MODES,
    RS_FILTER_MODES,
    POSITION_SIZING_MODELS,
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
