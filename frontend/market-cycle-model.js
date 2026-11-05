/**
 * market-cycle-model.js
 *
 * Módulo centralizado e compartilhado para validação oficial do Ciclo de Mercado e
 * autorização de compras no Healthy Trend Trader.
 *
 * REGRA CENTRAL MANDATÓRIA (P0):
 * COMPRA_PERMITIDA = CICLO_FAVORÁVEL AND PREÇO_ÍNDICE_ACIMA_EMA10 AND PREÇO_ÍNDICE_ACIMA_EMA72 AND GATILHO_VÁLIDO AND DEMAIS_FILTROS_OK
 *
 * Exclusivamente no timeframe Diário.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MarketCycleModel = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const OFFICIAL_EMA_FAST = 10;
  const OFFICIAL_EMA_SLOW = 72;

  // Lista canônica de FIIs conhecidos da B3
  const KNOWN_FII_SYMBOLS = new Set([
    'ALZR11', 'BTLG11', 'CPTS11', 'CVBI11', 'DEVA11', 'GALG11', 'GARE11', 'HABT11',
    'HCTR11', 'HGBS11', 'HGCR11', 'HGLG11', 'HGRE11', 'HGRU11', 'HSML11', 'IRDM11',
    'JGPX11', 'JSRE11', 'KNCA11', 'KNCR11', 'KNIP11', 'KNRI11', 'KNSC11', 'MALL11',
    'MAXR11', 'MFII11', 'MXRF11', 'OUJP11', 'PATL11', 'PLCR11', 'PVBI11', 'QAGR11',
    'RBED11', 'RBRP11', 'RBRR11', 'RBRY11', 'RCRB11', 'RECT11', 'RECR11', 'RNDP11',
    'RZAK11', 'RZTR11', 'SARE11', 'TGAR11', 'TRBL11', 'TRXF11', 'URPR11', 'VGHF11',
    'VGIA11', 'VGIP11', 'VGIR11', 'VILG11', 'VINO11', 'VISC11', 'VRTA11', 'VSHO11',
    'XPCI11', 'XPCM11', 'XPIN11', 'XPLG11', 'XPML11', 'XPPR11', 'HGRF11'
  ]);

  // Ações conhecidas que terminam em 11 (Units de Ações) — NÃO são FIIs
  const STOCK_UNITS_ENDING_IN_11 = new Set([
    'ALUP11', 'BIDI11', 'BPAC11', 'CPLE11', 'ENGI11', 'IGTI11', 'KLBN11', 'MODL11',
    'RANI11', 'SANB11', 'SAPR11', 'SULA11', 'TAEE11', 'TIET11'
  ]);

  const NASDAQ_100_SYMBOLS = new Set([
    'AAPL', 'ABNB', 'ADBE', 'ADI', 'ADP', 'ADSK', 'AEP', 'AMAT', 'AMD', 'AMGN', 'AMZN',
    'ANSS', 'APP', 'ASML', 'AVGO', 'AZN', 'BIIB', 'BKNG', 'BKR', 'CCEP', 'CDNS', 'CDW',
    'CEG', 'CHTR', 'CMCSA', 'COST', 'CPRT', 'CRWD', 'CSCO', 'CSGP', 'CSX', 'CTAS', 'CTSH',
    'DASH', 'DDOG', 'DLTR', 'DXCM', 'EA', 'EXC', 'FANG', 'FAST', 'FTNT', 'GEHC', 'GFS',
    'GILD', 'GOOG', 'GOOGL', 'HON', 'IDXX', 'ILMN', 'INTC', 'INTU', 'ISRG', 'KDP', 'KHC',
    'KLAC', 'LRCX', 'LULU', 'MAR', 'MCHP', 'MDLZ', 'MELI', 'META', 'MNST', 'MRNA', 'MRVL',
    'MSFT', 'MSTR', 'MU', 'NFLX', 'NVDA', 'NXPI', 'ODFL', 'ON', 'ORLY', 'PANW', 'PAYX',
    'PCAR', 'PDD', 'PEP', 'PLTR', 'PYPL', 'QCOM', 'REGN', 'ROP', 'ROST', 'SBUX', 'SNPS',
    'TEAM', 'TMUS', 'TSLA', 'TTD', 'TTWO', 'TXN', 'VRSK', 'VRTX', 'WBD', 'WDAY', 'XEL', 'ZS'
  ]);

  function isFiiSymbol(symbol) {
    const s = String(symbol || '').trim().toUpperCase();
    if (KNOWN_FII_SYMBOLS.has(s)) return true;
    if (STOCK_UNITS_ENDING_IN_11.has(s)) return false;
    return s.endsWith('11') && !s.startsWith('IBOV') && !s.startsWith('IFIX') && !s.startsWith('SMLL');
  }

  function isBdrSymbol(symbol) {
    const s = String(symbol || '').trim().toUpperCase();
    return /(31|32|33|34|35|39)$/.test(s);
  }

  function isNasdaqSymbol(symbol) {
    const s = String(symbol || '').trim().toUpperCase();
    return NASDAQ_100_SYMBOLS.has(s);
  }

  /**
   * Determina o índice de referência correspondente a um ativo.
   */
  function getBenchmarkForAsset(symbol, assetClass = null) {
    const sym = String(symbol || '').trim().toUpperCase();
    const cls = String(assetClass || '').trim().toLowerCase();

    if (cls === 'fii' || cls === 'fiis' || (!cls && isFiiSymbol(sym))) {
      return { symbol: 'IFIX', name: 'Índice de Fundos de Investimentos Imobiliários (IFIX)', assetClass: 'fii' };
    }
    if (cls === 'bdr' || cls === 'bdrs' || (!cls && isBdrSymbol(sym))) {
      return { symbol: 'BDRX', name: 'Índice de BDRs Não Patrocinados (BDRX)', assetClass: 'bdr' };
    }
    if (cls === 'nasdaq' || cls === 'us' || (!cls && isNasdaqSymbol(sym))) {
      return { symbol: 'QQQ', name: 'Invesco QQQ Trust (QQQ)', assetClass: 'nasdaq' };
    }
    return { symbol: 'IBOV', name: 'Índice Bovespa (IBOV)', assetClass: 'stock' };
  }

  /**
   * Cálculo determinístico de EMA sem look-ahead.
   */
  function calculateEmaSeries(values, period) {
    if (!Array.isArray(values) || values.length < period) return [];
    const k = 2 / (period + 1);
    const result = new Array(values.length).fill(null);
    let sum = 0;
    for (let i = 0; i < period; i++) sum += Number(values[i]);
    let currentEma = sum / period;
    result[period - 1] = Number(currentEma.toFixed(4));
    for (let i = period; i < values.length; i++) {
      currentEma = Number(values[i]) * k + currentEma * (1 - k);
      result[i] = Number(currentEma.toFixed(4));
    }
    return result;
  }

  /**
   * Calcula o reading oficial do Ciclo de Mercado a partir de candles diários fechados do índice.
   */
  function scoreMarketCycleFromCandles(candles) {
    if (!Array.isArray(candles) || candles.length < 30) return null;
    const closes = candles
      .map(c => Number(c.adjustedClose != null ? c.adjustedClose : c.close))
      .filter(Number.isFinite);

    if (closes.length < 30) return null;

    const price = closes.at(-1);
    const ema10Arr = calculateEmaSeries(closes, OFFICIAL_EMA_FAST);
    const ema72Period = Math.min(OFFICIAL_EMA_SLOW, closes.length);
    const ema72Arr = calculateEmaSeries(closes, ema72Period);

    const ema10 = ema10Arr[ema10Arr.length - 1];
    const ema72 = ema72Arr[ema72Arr.length - 1];

    if (!Number.isFinite(ema10) || !Number.isFinite(ema72) || !Number.isFinite(price)) {
      return null;
    }

    const prevEma10 = ema10Arr.length > 1 ? ema10Arr[ema10Arr.length - 2] : ema10;
    const prevEma72 = ema72Arr.length > 1 ? ema72Arr[ema72Arr.length - 2] : ema72;
    const ema10Slope = ema10 - prevEma10;
    const ema72Slope = ema72 - prevEma72;

    const above10 = price > ema10;
    const above72 = price > ema72;
    const structure = ema10 > ema72;
    const isExpansion = above10 && above72;
    const state = isExpansion ? 'healthy' : 'defensive';

    return {
      state,
      price,
      ema10,
      ema72,
      above10,
      above72,
      structure,
      ema10Slope,
      ema72Slope,
      isFavorable: isExpansion
    };
  }

  /**
   * Validação mandatória central de regime de mercado para autorização de compras.
   *
   * Regras obrigatórias:
   * 1. Regime de Mercado favorável (Expansão / Agressivo / Operável / healthy).
   * 2. Preço do índice estritamente acima da EMA 10.
   * 3. Preço do índice estritamente acima da EMA 72.
   * 4. Confirmação simultânea no mesmo candle Diário.
   * 5. Dados ausentes, inválidos ou insuficientes BLOQUEIAM por padrão.
   *
   * @param {Object} options
   * @param {string} [options.regime] - Regime do ciclo ('healthy', 'defensive', etc.)
   * @param {number} [options.indexPrice] - Preço do índice
   * @param {number} [options.indexEma10] - EMA 10 do índice
   * @param {number} [options.indexEma72] - EMA 72 do índice
   * @param {string} [options.benchmarkSymbol] - Ticker do índice ('IBOV', 'IFIX', 'BDRX', 'QQQ')
   * @param {Array}  [options.indexCandles] - Candles históricos do índice até o sinal (opcional para cálculo automático)
   * @returns {Object} { isPermitted, isFavorable, aboveEma10, aboveEma72, regime, price, ema10, ema72, benchmarkSymbol, reason, reasons }
   */
  function validateMarketPermissionForBuy(options = {}) {
    let regime = options.regime != null ? options.regime : (options.state || null);
    let price = Number(options.indexPrice != null ? options.indexPrice : (options.price != null ? options.price : NaN));
    let ema10 = Number(options.indexEma10 != null ? options.indexEma10 : (options.ema10 != null ? options.ema10 : (options.ema9 != null ? options.ema9 : NaN)));
    let ema72 = Number(options.indexEma72 != null ? options.indexEma72 : (options.ema72 != null ? options.ema72 : (options.ema30 != null ? options.ema30 : (options.ema20 != null ? options.ema20 : NaN))));
    const benchmarkSymbol = String(options.benchmarkSymbol || options.benchmark || 'IBOV').trim().toUpperCase();

    // Se candles históricos do índice foram fornecidos, calcula de forma canônica
    if (Array.isArray(options.indexCandles) && options.indexCandles.length >= 30) {
      const reading = scoreMarketCycleFromCandles(options.indexCandles);
      if (reading) {
        regime = reading.state;
        price = reading.price;
        ema10 = reading.ema10;
        ema72 = reading.ema72;
      }
    }

    // REGRA DE SEGURANÇA: Dados ausentes, inválidos ou não finitos BLOQUEIAM por padrão
    if (!Number.isFinite(price) || !Number.isFinite(ema10) || !Number.isFinite(ema72) || !regime) {
      return {
        isPermitted: false,
        isFavorable: false,
        aboveEma10: false,
        aboveEma72: false,
        regime: regime || 'desconhecido',
        price: Number.isFinite(price) ? price : null,
        ema10: Number.isFinite(ema10) ? ema10 : null,
        ema72: Number.isFinite(ema72) ? ema72 : null,
        benchmarkSymbol,
        reason: 'ENTRADA BLOQUEADA — DADOS DO ÍNDICE DE REFERÊNCIA AUSENTES OU INSUFICIENTES',
        reasons: ['Dados ausentes ou insuficientes do índice de referência para validar o Ciclo de Mercado']
      };
    }

    const sRegime = String(regime).trim().toLowerCase();
    const isFavorable = (
      sRegime === 'healthy' ||
      sRegime === 'positive' ||
      sRegime === 'positivo' ||
      sRegime === 'expansão' ||
      sRegime === 'expansao' ||
      sRegime === 'expansion' ||
      sRegime.includes('agressivo') ||
      sRegime.includes('operável') ||
      sRegime.includes('operavel')
    );
    const isDefensive = (
      sRegime === 'defensive' ||
      sRegime === 'defensivo' ||
      sRegime === 'defesa' ||
      sRegime.includes('desfavor') ||
      sRegime === 'risk-off' ||
      sRegime === 'down'
    );

    const aboveEma10 = price > ema10;
    const aboveEma72 = price > ema72;

    const reasons = [];
    if (!aboveEma10 && !aboveEma72) {
      reasons.push(`Preço do índice ${benchmarkSymbol} (${price}) abaixo da EMA 10 (${ema10.toFixed(2)}) e da EMA 72 (${ema72.toFixed(2)})`);
    } else if (!aboveEma10) {
      reasons.push(`Preço do índice ${benchmarkSymbol} (${price}) abaixo da EMA 10 (${ema10.toFixed(2)})`);
    } else if (!aboveEma72) {
      reasons.push(`Preço do índice ${benchmarkSymbol} (${price}) abaixo da EMA 72 (${ema72.toFixed(2)})`);
    }

    if (!isFavorable || isDefensive) {
      reasons.push(`Ciclo de Mercado do índice ${benchmarkSymbol} em regime Defensivo (${sRegime})`);
    }

    const isPermitted = isFavorable && !isDefensive && aboveEma10 && aboveEma72;

    let reason = null;
    if (!isPermitted) {
      if (!isFavorable || isDefensive) {
        reason = 'ENTRADA BLOQUEADA — CICLO DE MERCADO DEFENSIVO';
      } else if (!aboveEma10 && !aboveEma72) {
        reason = 'ENTRADA BLOQUEADA — ÍNDICE ABAIXO DAS EMAS 10 E 72';
      } else if (!aboveEma10) {
        reason = 'ENTRADA BLOQUEADA — ÍNDICE ABAIXO DA EMA 10';
      } else if (!aboveEma72) {
        reason = 'ENTRADA BLOQUEADA — ÍNDICE ABAIXO DA EMA 72';
      } else {
        reason = 'ENTRADA BLOQUEADA — CICLO DE MERCADO DESFAVORÁVEL';
      }
    }

    return {
      isPermitted,
      isFavorable: isFavorable && !isDefensive,
      aboveEma10,
      aboveEma72,
      regime: isPermitted ? 'Expansão' : 'Defensivo',
      price,
      ema10,
      ema72,
      benchmarkSymbol,
      reason,
      reasons
    };
  }

  const REGIMES = Object.freeze({
    UP_QUIET: 'UP_QUIET',
    UP_VOLATILE: 'UP_VOLATILE',
    SIDEWAYS_QUIET: 'SIDEWAYS_QUIET',
    SIDEWAYS_VOLATILE: 'SIDEWAYS_VOLATILE',
    DOWN_QUIET: 'DOWN_QUIET',
    DOWN_VOLATILE: 'DOWN_VOLATILE'
  });

  const REGIME_METADATA = Object.freeze({
    UP_QUIET: {
      id: 'UP_QUIET',
      label: 'Up – Quiet',
      title: 'Up – Quiet',
      name: 'Tendência de alta com baixa volatilidade',
      direction: 'UP',
      volatility: 'QUIET',
      color: '#16a879',
      hex: '#16a879',
      badgeClass: 'regime-up-quiet',
      description: 'Tendência de alta com baixa volatilidade',
      summary: 'Ambiente ideal para operações direcionais de tendência com menor ruído e paradas estáveis.'
    },
    UP_VOLATILE: {
      id: 'UP_VOLATILE',
      label: 'Up – Volatile',
      title: 'Up – Volatile',
      name: 'Alta + alta volatilidade',
      direction: 'UP',
      volatility: 'VOLATILE',
      color: '#f59e0b',
      hex: '#f59e0b',
      badgeClass: 'regime-up-volatile',
      description: 'Alta + alta volatilidade',
      summary: 'Tendência de alta com oscilações amplas; requer stops ajustados e cautela com violinadas.'
    },
    SIDEWAYS_QUIET: {
      id: 'SIDEWAYS_QUIET',
      label: 'Sideways – Quiet',
      title: 'Sideways – Quiet',
      name: 'Lateral + baixa volatilidade',
      direction: 'SIDEWAYS',
      volatility: 'QUIET',
      color: '#3b82f6',
      hex: '#3b82f6',
      badgeClass: 'regime-sideways-quiet',
      description: 'Lateral + baixa volatilidade',
      summary: 'Mercado em consolidação estreita sem direção definida; aguardar rompimentos confirmados.'
    },
    SIDEWAYS_VOLATILE: {
      id: 'SIDEWAYS_VOLATILE',
      label: 'Sideways – Volatile',
      title: 'Sideways – Volatile',
      name: 'Lateral + alta volatilidade',
      direction: 'SIDEWAYS',
      volatility: 'VOLATILE',
      color: '#b45309',
      hex: '#b45309',
      badgeClass: 'regime-sideways-volatile',
      description: 'Lateral + alta volatilidade',
      summary: 'Mercado errático e turbulento sem tendência; alto risco de violinadas e ruído operacional.'
    },
    DOWN_QUIET: {
      id: 'DOWN_QUIET',
      label: 'Down – Quiet',
      title: 'Down – Quiet',
      name: 'Baixa + baixa volatilidade',
      direction: 'DOWN',
      volatility: 'QUIET',
      color: '#64748b',
      hex: '#64748b',
      badgeClass: 'regime-down-quiet',
      description: 'Baixa + baixa volatilidade',
      summary: 'Tendência de baixa ordenada e contínua; preservação mandatória de capital em compras.'
    },
    DOWN_VOLATILE: {
      id: 'DOWN_VOLATILE',
      label: 'Down – Volatile',
      title: 'Down – Volatile',
      name: 'Baixa + alta volatilidade',
      direction: 'DOWN',
      volatility: 'VOLATILE',
      color: '#dc4545',
      hex: '#dc4545',
      badgeClass: 'regime-down-volatile',
      description: 'Baixa + alta volatilidade',
      summary: 'Pânico ou forte correção com amplitude desmedida; capital deve permanecer 100% protegido.'
    }
  });

  const DEFAULT_BENCHMARKS = Object.freeze([
    { id: 'IBOV', name: 'Índice Bovespa (IBOV)', symbol: '^BVSP', market: 'BR', provider: 'b3', is_default: true, active: true },
    { id: 'SP500', name: 'S&P 500 Index', symbol: '^GSPC', market: 'US', provider: 'brapi', is_default: true, active: true },
    { id: 'NASDAQ', name: 'Nasdaq Composite Index', symbol: '^IXIC', market: 'NASDAQ', provider: 'twelve_data', is_default: true, active: true },
    { id: 'IFIX', name: 'Índice de FIIs (IFIX)', symbol: 'IFIX', market: 'BR', provider: 'b3', is_default: false, active: true },
    { id: 'BDRX', name: 'Índice de BDRs Não Patrocinados (BDRX)', symbol: 'BDRX', market: 'BR', provider: 'b3', is_default: false, active: true }
  ]);

  function calculateTrueRange(candle, prevCandle) {
    const high = Number(candle?.high);
    const low = Number(candle?.low);
    const close = Number(candle?.adjustedClose ?? candle?.close);
    const prevClose = prevCandle ? Number(prevCandle?.adjustedClose ?? prevCandle?.close) : null;

    if (Number.isFinite(high) && Number.isFinite(low)) {
      if (Number.isFinite(prevClose)) {
        return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      }
      return high - low;
    }

    if (Number.isFinite(close) && Number.isFinite(prevClose)) {
      return Math.abs(close - prevClose);
    }

    return 0;
  }

  function calculateWilderATRSeries(candles, period = 21) {
    if (!Array.isArray(candles) || candles.length <= period) {
      return new Array(candles ? candles.length : 0).fill(null);
    }

    const atrs = new Array(candles.length).fill(null);
    const trs = new Array(candles.length).fill(0);

    for (let i = 0; i < candles.length; i++) {
      trs[i] = calculateTrueRange(candles[i], i > 0 ? candles[i - 1] : null);
    }

    let initialTrSum = 0;
    for (let i = 1; i <= period; i++) {
      initialTrSum += trs[i];
    }
    let currentAtr = initialTrSum / period;
    atrs[period] = currentAtr;

    for (let i = period + 1; i < candles.length; i++) {
      currentAtr = (currentAtr * (period - 1) + trs[i]) / period;
      atrs[i] = currentAtr;
    }

    return atrs;
  }

  function calculateATRPercentageSeries(candles, period = 21) {
    const atrs = calculateWilderATRSeries(candles, period);
    return candles.map((c, i) => {
      const close = Number(c.adjustedClose ?? c.close);
      const atr = atrs[i];
      const atrPct = (atr !== null && Number.isFinite(close) && close > 0) ? (atr / close) * 100 : null;
      return {
        date: c.date,
        close,
        atr,
        atrPct
      };
    });
  }

  function classifyDirection(candlesOrReading) {
    let price, ema10, ema72;

    if (candlesOrReading && typeof candlesOrReading === 'object' && !Array.isArray(candlesOrReading)) {
      price = (candlesOrReading.price !== null && candlesOrReading.price !== undefined && candlesOrReading.price !== '') ? Number(candlesOrReading.price) : NaN;
      ema10 = (candlesOrReading.ema10 != null || candlesOrReading.ema9 != null) ? Number(candlesOrReading.ema10 ?? candlesOrReading.ema9) : NaN;
      ema72 = (candlesOrReading.ema72 != null || candlesOrReading.ema30 != null) ? Number(candlesOrReading.ema72 ?? candlesOrReading.ema30) : NaN;
    } else if (Array.isArray(candlesOrReading)) {
      const candles = candlesOrReading;
      if (candles.length < 30) {
        return { direction: 'INSUFFICIENT_DATA', price: null, ema10: null, ema72: null };
      }
      const reading = scoreMarketCycleFromCandles(candles);
      price = Number(reading?.price);
      ema10 = Number(reading?.ema10 ?? reading?.ema9);
      ema72 = Number(reading?.ema72 ?? reading?.ema30);
    }

    if (!Number.isFinite(price) || !Number.isFinite(ema10) || !Number.isFinite(ema72)) {
      return { direction: 'INSUFFICIENT_DATA', price: null, ema10: null, ema72: null };
    }

    const above10 = price > ema10;
    const above72 = price > ema72;
    const below10 = price < ema10;
    const below72 = price < ema72;

    let direction = 'SIDEWAYS';
    if (above10 && above72) direction = 'UP';
    else if (below10 && below72) direction = 'DOWN';

    return { direction, price, ema10, ema72 };
  }

  function calculateVolatility(candles, period = 21, smaPeriod = 252) {
    if (!Array.isArray(candles) || candles.length < period + smaPeriod) {
      return {
        volatility: 'INSUFFICIENT_DATA',
        status: 'INSUFFICIENT_DATA',
        reason: 'Histórico insuficiente para cálculo de volatilidade (requer ' + (period + smaPeriod) + ' candles diários).',
        atr21: null,
        atrPct: null,
        atrPctSma252: null,
        volatilityDeviation: null
      };
    }

    const atrSeries = calculateATRPercentageSeries(candles, period);
    const validPcts = atrSeries.map(s => s.atrPct).filter(v => v !== null && Number.isFinite(v));

    if (validPcts.length < smaPeriod) {
      return {
        volatility: 'INSUFFICIENT_DATA',
        status: 'INSUFFICIENT_DATA',
        reason: 'Valores válidos de ATR% insuficientes (' + validPcts.length + '/' + smaPeriod + ').',
        atr21: null,
        atrPct: null,
        atrPctSma252: null,
        volatilityDeviation: null
      };
    }

    const currentAtr = atrSeries.at(-1)?.atr;
    const currentAtrPct = atrSeries.at(-1)?.atrPct;

    const window252 = validPcts.slice(-smaPeriod);
    const atrPctSma252 = window252.reduce((sum, val) => sum + val, 0) / smaPeriod;

    const volatility = currentAtrPct > atrPctSma252 ? 'VOLATILE' : 'QUIET';
    const volatilityDeviation = atrPctSma252 > 0
      ? ((currentAtrPct - atrPctSma252) / atrPctSma252) * 100
      : 0;

    return {
      volatility,
      status: 'OK',
      atr21: Number(currentAtr.toFixed(2)),
      atrPct: Number(currentAtrPct.toFixed(2)),
      atrPctSma252: Number(atrPctSma252.toFixed(2)),
      volatilityDeviation: Number(volatilityDeviation.toFixed(1))
    };
  }

  function combineRegime(direction, volatility) {
    if (!direction || !volatility || direction === 'INSUFFICIENT_DATA' || volatility === 'INSUFFICIENT_DATA') {
      return 'INSUFFICIENT_DATA';
    }

    const code = direction.toUpperCase() + '_' + volatility.toUpperCase();
    return REGIMES[code] || 'INSUFFICIENT_DATA';
  }

  function derivePeriods(dailyRecords = []) {
    if (!Array.isArray(dailyRecords) || !dailyRecords.length) return [];

    const sorted = [...dailyRecords].sort((a, b) => String(a.reference_date || a.date).localeCompare(String(b.reference_date || b.date)));
    const periods = [];
    let current = null;

    for (const row of sorted) {
      const reg = row.regime;
      const refDate = row.reference_date || row.date;
      const close = Number(row.close_price ?? row.close);

      if (!current || current.regime !== reg) {
        if (current) periods.push(current);
        current = {
          benchmark_id: row.benchmark_id || 'IBOV',
          regime: reg,
          direction: row.direction,
          volatility: row.volatility,
          startDate: refDate,
          endDate: refDate,
          startPrice: close,
          endPrice: close,
          durationTradingDays: 1,
          color: REGIME_METADATA[reg]?.color || '#94a3b8'
        };
      } else {
        current.endDate = refDate;
        current.endPrice = close;
        current.durationTradingDays += 1;
      }
    }

    if (current) periods.push(current);
    return periods;
  }

  function calculateDistribution(dailyRecords = []) {
    const total = dailyRecords.length;
    const counts = {
      UP_QUIET: 0,
      UP_VOLATILE: 0,
      SIDEWAYS_QUIET: 0,
      SIDEWAYS_VOLATILE: 0,
      DOWN_QUIET: 0,
      DOWN_VOLATILE: 0
    };

    for (const r of dailyRecords) {
      if (counts[r.regime] !== undefined) {
        counts[r.regime]++;
      }
    }

    const distribution = {};
    for (const [key, count] of Object.entries(counts)) {
      const pct = total > 0 ? (count / total) * 100 : 0;
      distribution[key] = {
        regime: key,
        meta: REGIME_METADATA[key],
        count,
        percentage: Number(pct.toFixed(1)),
        label: (REGIME_METADATA[key]?.label || key) + ' (' + Math.round(pct) + '% dos pregões)'
      };
    }

    return { totalDays: total, distribution };
  }

  function calculateRegimePerformance(tradesOrSimulations = [], options = {}) {
    const list = Array.isArray(tradesOrSimulations) ? tradesOrSimulations : [];
    const minSampleThreshold = options.minSampleThreshold || 30;

    const completed = list.filter(t => {
      const isGradeD = String(t.grade || t.rubricGrade || '').toUpperCase() === 'D';
      if (isGradeD) return false;
      const r = Number(t.resultR != null ? t.resultR : (t.r_multiple != null ? t.r_multiple : (t.metadata?.resultR ?? NaN)));
      return Number.isFinite(r);
    });

    const regimeOrder = ['UP_QUIET', 'UP_VOLATILE', 'SIDEWAYS_QUIET', 'SIDEWAYS_VOLATILE', 'DOWN_QUIET', 'DOWN_VOLATILE'];
    const groups = {};
    for (const code of regimeOrder) {
      groups[code] = [];
    }

    for (const item of completed) {
      const reg = item.entry_market_regime || item.entryMarketRegime || item.regime;
      if (groups[reg]) {
        groups[reg].push(item);
      }
    }

    const rows = [];
    let bestRegime = null;
    let worstRegime = null;

    for (const code of regimeOrder) {
      const group = groups[code];
      const meta = REGIME_METADATA[code];
      const count = group.length;

      if (count === 0) {
        rows.push({
          regime: code,
          label: meta.label,
          name: meta.name,
          color: meta.color,
          badgeClass: meta.badgeClass,
          trades: 0,
          winRate: 0,
          profitFactor: 0,
          expectancy: 0,
          resultadoR: 0,
          maxDrawdown: 0,
          sampleQuality: 'insufficient',
          sampleMessage: 'Sem trades registrados neste regime'
        });
        continue;
      }

      let wins = 0;
      let losses = 0;
      let sumGainR = 0;
      let sumLossR = 0;
      let totalR = 0;

      let peakR = 0;
      let runningR = 0;
      let maxDd = 0;

      const sortedGroup = [...group].sort((a, b) => {
        const da = String(a.entryDate || a.signalDate || a.executed_at || a.created_at || '');
        const db = String(b.entryDate || b.signalDate || b.executed_at || b.created_at || '');
        return da.localeCompare(db);
      });

      for (const t of sortedGroup) {
        const r = Number(t.resultR != null ? t.resultR : (t.r_multiple != null ? t.r_multiple : t.metadata?.resultR));
        totalR += r;
        runningR += r;
        if (runningR > peakR) peakR = runningR;
        const dd = peakR - runningR;
        if (dd > maxDd) maxDd = dd;

        if (r > 0) {
          wins++;
          sumGainR += r;
        } else if (r < 0) {
          losses++;
          sumLossR += Math.abs(r);
        }
      }

      const winRate = (wins / count) * 100;
      const profitFactor = sumLossR > 0 ? sumGainR / sumLossR : (sumGainR > 0 ? 99.9 : 0);
      const expectancy = totalR / count;
      const maxDrawdownPct = peakR > 0 ? (maxDd / peakR) * 100 : (maxDd > 0 ? maxDd * 10 : 0);

      let sampleQuality = 'adequate';
      let sampleMessage = 'Amostra confiável (>= 30 trades)';
      if (count < 10) {
        sampleQuality = 'insufficient';
        sampleMessage = 'Amostra muito pequena (< 10 trades)';
      } else if (count < 30) {
        sampleQuality = 'limited';
        sampleMessage = 'Amostra limitada (10-29 trades)';
      }

      const row = {
        regime: code,
        label: meta.label,
        name: meta.name,
        color: meta.color,
        badgeClass: meta.badgeClass,
        trades: count,
        winRate: Number(winRate.toFixed(1)),
        profitFactor: Number(profitFactor.toFixed(2)),
        expectancy: Number(expectancy.toFixed(2)),
        resultadoR: Number(totalR.toFixed(1)),
        maxDrawdown: -Number(maxDrawdownPct.toFixed(1)),
        sampleQuality,
        sampleMessage
      };

      rows.push(row);

      if (!bestRegime || row.expectancy > bestRegime.expectancy) {
        bestRegime = row;
      }
      if (!worstRegime || row.expectancy < worstRegime.expectancy) {
        worstRegime = row;
      }
    }

    const overallSampleAdequate = completed.length >= (minSampleThreshold * 2);

    return {
      rows,
      bestRegime,
      worstRegime,
      totalTrades: completed.length,
      sampleQualityStatus: overallSampleAdequate ? 'valid' : 'warning',
      sampleRecommendationText: 'Recomendação: pelo menos ' + minSampleThreshold + ' trades por regime para uma análise mais confiável.'
    };
  }

  return {
    REGIMES,
    REGIME_METADATA,
    DEFAULT_BENCHMARKS,
    calculateTrueRange,
    calculateWilderATRSeries,
    calculateATRPercentageSeries,
    classifyDirection,
    calculateVolatility,
    combineRegime,
    derivePeriods,
    calculateDistribution,
    calculateRegimePerformance,
    OFFICIAL_EMA_FAST,
    OFFICIAL_EMA_SLOW,
    isFiiSymbol,
    isBdrSymbol,
    isNasdaqSymbol,
    getBenchmarkForAsset,
    calculateEmaSeries,
    scoreMarketCycleFromCandles,
    validateMarketPermissionForBuy
  };
});
