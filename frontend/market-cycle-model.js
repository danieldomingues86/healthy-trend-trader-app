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

  return {
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
