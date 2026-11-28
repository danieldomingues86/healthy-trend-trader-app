(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.BdrIntelligenceModel = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * HEALTHY TREND TRADER — BDR INTELLIGENCE MODEL
   *
   * Camada de inteligência dedicada à análise integrada de BDRs no gráfico Diário:
   * 1. Ciclo do mercado de origem (EMA 10 e EMA 30 no gráfico Diário do índice internacional).
   * 2. Força e estrutura individual da ação original (EMA 10 e EMA 72 no gráfico Diário em USD).
   * 3. Impacto cambial (USD/BRL no gráfico Diário).
   * 4. Decomposição teórica vs. efetiva do preço da BDR (respeitando fator de conversão).
   * 5. Hierarquia de decisão em 3 níveis (nunca média ponderada simples) e Matriz de Interpretação.
   */

  const MARKET_CYCLE_EMA_FAST = 10;
  const MARKET_CYCLE_EMA_SLOW = 30;
  const ASSET_STRUCTURE_EMA_FAST = 10;
  const ASSET_STRUCTURE_EMA_SLOW = 72;

  // Catálogo canônico de BDRs com bolsa de origem, índice internacional de referência e paridade oficial B3
  // bdrsPerShare: quantas BDRs representam 1 ação original (conversionFactor = 1 / bdrsPerShare)
  const BDR_CATALOG = {
    AAPL34: { bdrSymbol: 'AAPL34', underlyingSymbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 20, sector: 'Tecnologia' },
    AAPL35: { bdrSymbol: 'AAPL35', underlyingSymbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 20, sector: 'Tecnologia' },
    MSFT34: { bdrSymbol: 'MSFT34', underlyingSymbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 24, sector: 'Tecnologia' },
    MSFT35: { bdrSymbol: 'MSFT35', underlyingSymbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 24, sector: 'Tecnologia' },
    NVDC34: { bdrSymbol: 'NVDC34', underlyingSymbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 48, sector: 'Tecnologia' },
    AMZO34: { bdrSymbol: 'AMZO34', underlyingSymbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 20, sector: 'Consumo' },
    AMZO35: { bdrSymbol: 'AMZO35', underlyingSymbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 20, sector: 'Consumo' },
    GOGL34: { bdrSymbol: 'GOGL34', underlyingSymbol: 'GOOGL', name: 'Alphabet Inc. (Google)', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 12, sector: 'Tecnologia' },
    GOGL35: { bdrSymbol: 'GOGL35', underlyingSymbol: 'GOOGL', name: 'Alphabet Inc. (Google)', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 12, sector: 'Tecnologia' },
    M1TA34: { bdrSymbol: 'M1TA34', underlyingSymbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 28, sector: 'Tecnologia' },
    TSLA34: { bdrSymbol: 'TSLA34', underlyingSymbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 32, sector: 'Consumo' },
    MELI34: { bdrSymbol: 'MELI34', underlyingSymbol: 'MELI', name: 'MercadoLibre Inc.', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 120, sector: 'Consumo' },
    NFLX34: { bdrSymbol: 'NFLX34', underlyingSymbol: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 50, sector: 'Comunicação' },
    AVGO34: { bdrSymbol: 'AVGO34', underlyingSymbol: 'AVGO', name: 'Broadcom Inc.', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 70, sector: 'Tecnologia' },
    A1MD34: { bdrSymbol: 'A1MD34', underlyingSymbol: 'AMD', name: 'Advanced Micro Devices', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 8, sector: 'Tecnologia' },
    P2LT34: { bdrSymbol: 'P2LT34', underlyingSymbol: 'PLTR', name: 'Palantir Technologies', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 3, sector: 'Tecnologia' },
    MUTC34: { bdrSymbol: 'MUTC34', underlyingSymbol: 'MU', name: 'Micron Technology', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 6, sector: 'Tecnologia' },
    M2ST34: { bdrSymbol: 'M2ST34', underlyingSymbol: 'MSTR', name: 'MicroStrategy Inc.', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 70, sector: 'Tecnologia' },
    ITLC34: { bdrSymbol: 'ITLC34', underlyingSymbol: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 1.25, sector: 'Tecnologia' },
    BKNG34: { bdrSymbol: 'BKNG34', underlyingSymbol: 'BKNG', name: 'Booking Holdings Inc.', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 175, sector: 'Consumo' },
    C2OI34: { bdrSymbol: 'C2OI34', underlyingSymbol: 'COIN', name: 'Coinbase Global Inc.', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 55, sector: 'Financeiro' },
    S2GM34: { bdrSymbol: 'S2GM34', underlyingSymbol: 'SGML', name: 'Sigma Lithium Corp.', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 2, sector: 'Materiais Básicos' },
    ROXO34: { bdrSymbol: 'ROXO34', underlyingSymbol: 'NU', name: 'Nu Holdings Ltd. (Nubank)', exchange: 'NYSE', country: 'EUA', benchmarkId: 'SP500', benchmarkName: 'S&P 500', bdrsPerShare: 6, sector: 'Financeiro' },
    WALM34: { bdrSymbol: 'WALM34', underlyingSymbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', country: 'EUA', benchmarkId: 'SP500', benchmarkName: 'S&P 500', bdrsPerShare: 11, sector: 'Consumo' },
    LILY34: { bdrSymbol: 'LILY34', underlyingSymbol: 'LLY', name: 'Eli Lilly and Company', exchange: 'NYSE', country: 'EUA', benchmarkId: 'SP500', benchmarkName: 'S&P 500', bdrsPerShare: 18, sector: 'Saúde' },
    DISB34: { bdrSymbol: 'DISB34', underlyingSymbol: 'DIS', name: 'The Walt Disney Company', exchange: 'NYSE', country: 'EUA', benchmarkId: 'SP500', benchmarkName: 'S&P 500', bdrsPerShare: 15, sector: 'Comunicação' },
    BERK34: { bdrSymbol: 'BERK34', underlyingSymbol: 'BRK.B', name: 'Berkshire Hathaway Inc.', exchange: 'NYSE', country: 'EUA', benchmarkId: 'SP500', benchmarkName: 'S&P 500', bdrsPerShare: 16, sector: 'Financeiro' },
    COCA34: { bdrSymbol: 'COCA34', underlyingSymbol: 'KO', name: 'The Coca-Cola Company', exchange: 'NYSE', country: 'EUA', benchmarkId: 'SP500', benchmarkName: 'S&P 500', bdrsPerShare: 4, sector: 'Consumo' },
    CHVX34: { bdrSymbol: 'CHVX34', underlyingSymbol: 'CVX', name: 'Chevron Corporation', exchange: 'NYSE', country: 'EUA', benchmarkId: 'SP500', benchmarkName: 'S&P 500', bdrsPerShare: 7, sector: 'Petróleo e Gás' },
    JNJB34: { bdrSymbol: 'JNJB34', underlyingSymbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', country: 'EUA', benchmarkId: 'SP500', benchmarkName: 'S&P 500', bdrsPerShare: 9, sector: 'Saúde' },
    PAGS34: { bdrSymbol: 'PAGS34', underlyingSymbol: 'PAGS', name: 'PagSeguro Digital Ltd.', exchange: 'NYSE', country: 'EUA', benchmarkId: 'SP500', benchmarkName: 'S&P 500', bdrsPerShare: 1, sector: 'Financeiro' },
    NIKE34: { bdrSymbol: 'NIKE34', underlyingSymbol: 'NKE', name: 'NIKE, Inc.', exchange: 'NYSE', country: 'EUA', benchmarkId: 'SP500', benchmarkName: 'S&P 500', bdrsPerShare: 10, sector: 'Consumo' },
    JPMC34: { bdrSymbol: 'JPMC34', underlyingSymbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', country: 'EUA', benchmarkId: 'SP500', benchmarkName: 'S&P 500', bdrsPerShare: 15, sector: 'Financeiro' },
    SPCX34: { bdrSymbol: 'SPCX34', underlyingSymbol: 'DXYZ', name: 'Destiny Tech100 Inc.', exchange: 'NYSE', country: 'EUA', benchmarkId: 'SP500', benchmarkName: 'S&P 500', bdrsPerShare: 5, sector: 'Tecnologia' },
    BOAC34: { bdrSymbol: 'BOAC34', underlyingSymbol: 'BAC', name: 'Bank of America Corp.', exchange: 'NYSE', country: 'EUA', benchmarkId: 'SP500', benchmarkName: 'S&P 500', bdrsPerShare: 4, sector: 'Financeiro' },
    TSMC34: { bdrSymbol: 'TSMC34', underlyingSymbol: 'TSM', name: 'Taiwan Semiconductor (TSMC)', exchange: 'NYSE', country: 'EUA', benchmarkId: 'SP500', benchmarkName: 'S&P 500', bdrsPerShare: 8, sector: 'Tecnologia' },
    ORCL34: { bdrSymbol: 'ORCL34', underlyingSymbol: 'ORCL', name: 'Oracle Corporation', exchange: 'NYSE', country: 'EUA', benchmarkId: 'SP500', benchmarkName: 'S&P 500', bdrsPerShare: 6, sector: 'Tecnologia' },
    BABA34: { bdrSymbol: 'BABA34', underlyingSymbol: 'BABA', name: 'Alibaba Group Holding', exchange: 'NYSE', country: 'EUA', benchmarkId: 'SP500', benchmarkName: 'S&P 500', bdrsPerShare: 30, sector: 'Consumo' },
    VISA34: { bdrSymbol: 'VISA34', underlyingSymbol: 'V', name: 'Visa Inc.', exchange: 'NYSE', country: 'EUA', benchmarkId: 'SP500', benchmarkName: 'S&P 500', bdrsPerShare: 20, sector: 'Financeiro' },
    EXXO34: { bdrSymbol: 'EXXO34', underlyingSymbol: 'XOM', name: 'Exxon Mobil Corp.', exchange: 'NYSE', country: 'EUA', benchmarkId: 'SP500', benchmarkName: 'S&P 500', bdrsPerShare: 8, sector: 'Petróleo e Gás' },
    PYPL34: { bdrSymbol: 'PYPL34', underlyingSymbol: 'PYPL', name: 'PayPal Holdings Inc.', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 16, sector: 'Financeiro' },
    ADBE34: { bdrSymbol: 'ADBE34', underlyingSymbol: 'ADBE', name: 'Adobe Inc.', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 50, sector: 'Tecnologia' },
    CRWD34: { bdrSymbol: 'CRWD34', underlyingSymbol: 'CRWD', name: 'CrowdStrike Holdings', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 24, sector: 'Tecnologia' },
    ASML34: { bdrSymbol: 'ASML34', underlyingSymbol: 'ASML', name: 'ASML Holding N.V.', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 40, sector: 'Tecnologia' },
    CSCO34: { bdrSymbol: 'CSCO34', underlyingSymbol: 'CSCO', name: 'Cisco Systems Inc.', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 5, sector: 'Tecnologia' },
    PEPB34: { bdrSymbol: 'PEPB34', underlyingSymbol: 'PEP', name: 'PepsiCo Inc.', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 12, sector: 'Consumo' },
    QCOM34: { bdrSymbol: 'QCOM34', underlyingSymbol: 'QCOM', name: 'QUALCOMM Inc.', exchange: 'NASDAQ', country: 'EUA', benchmarkId: 'NASDAQ', benchmarkName: 'Nasdaq-100', bdrsPerShare: 12, sector: 'Tecnologia' }
  };

  function isBdrTicker(symbol) {
    if (!symbol) return false;
    const clean = String(symbol).trim().toUpperCase();
    if (BDR_CATALOG[clean]) return true;
    return /^[A-Z0-9]{4}(31|32|33|34|35|39)$/.test(clean);
  }

  function formatParityLabel(conversionFactor, bdrsPerShare) {
    const factor = Number(conversionFactor);
    const ratio = Number(bdrsPerShare) || (factor > 0 ? Number((1 / factor).toFixed(2)) : 1);
    if (!Number.isFinite(factor) || factor <= 0 || Math.abs(factor - 1) < 0.001) {
      return '1 BDR = 1 ação';
    }
    const factorFormatted = factor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    const ratioFormatted = Number.isInteger(ratio) ? String(ratio) : ratio.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    return `1 BDR = ${factorFormatted} ação (${ratioFormatted}:1)`;
  }

  function getBdrMetadata(symbol, overrides = {}) {
    const clean = String(symbol || '').trim().toUpperCase();
    const base = BDR_CATALOG[clean] || {
      bdrSymbol: clean,
      underlyingSymbol: overrides.underlyingSymbol || clean.replace(/\d+$/, ''),
      name: overrides.name || clean,
      exchange: overrides.exchange || 'NYSE',
      country: overrides.country || 'EUA',
      benchmarkId: (overrides.exchange || 'NYSE').toUpperCase().includes('NASDAQ') ? 'NASDAQ' : 'SP500',
      benchmarkName: (overrides.exchange || 'NYSE').toUpperCase().includes('NASDAQ') ? 'Nasdaq-100' : 'S&P 500',
      bdrsPerShare: overrides.bdrsPerShare || 10,
      sector: overrides.sector || 'Internacional'
    };

    // Garantir proibição do uso de BDRX como substituto de índice de origem
    let exchange = String(overrides.exchange || base.exchange || 'NYSE').trim().toUpperCase();
    let benchmarkId = String(overrides.benchmarkId || base.benchmarkId || (exchange.includes('NASDAQ') ? 'NASDAQ' : 'SP500')).trim().toUpperCase();
    if (benchmarkId === 'BDRX') {
      benchmarkId = exchange.includes('NASDAQ') ? 'NASDAQ' : 'SP500';
    }
    const benchmarkName = benchmarkId === 'NASDAQ'
      ? 'Nasdaq-100'
      : (benchmarkId === 'SP500' ? 'S&P 500' : (overrides.benchmarkName || base.benchmarkName || 'S&P 500'));

    const bdrsPerShare = Number(overrides.bdrsPerShare) > 0
      ? Number(overrides.bdrsPerShare)
      : (Number(overrides.conversionFactor) > 0 ? Number((1 / Number(overrides.conversionFactor)).toFixed(4)) : base.bdrsPerShare);

    const conversionFactor = Number(overrides.conversionFactor) > 0
      ? Number(overrides.conversionFactor)
      : Number((1 / bdrsPerShare).toFixed(6));

    return {
      bdrSymbol: clean,
      underlyingSymbol: String(overrides.underlyingSymbol || base.underlyingSymbol).trim().toUpperCase(),
      name: overrides.name || base.name,
      exchange,
      exchangeDisplay: `${exchange} (${overrides.country || base.country || 'EUA'})`,
      country: overrides.country || base.country || 'EUA',
      benchmarkId,
      benchmarkName,
      bdrsPerShare,
      conversionFactor,
      parityLabel: overrides.parityLabel || formatParityLabel(conversionFactor, bdrsPerShare),
      sector: overrides.sector || base.sector || 'Internacional'
    };
  }

  function calculateEmaSeries(values, period) {
    if (!Array.isArray(values) || values.length < period || period <= 0) return [];
    const k = 2 / (period + 1);
    const result = new Array(values.length).fill(null);
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += Number(values[i]);
    }
    let current = sum / period;
    result[period - 1] = Number(current.toFixed(4));
    for (let i = period; i < values.length; i++) {
      current = Number(values[i]) * k + current * (1 - k);
      result[i] = Number(current.toFixed(4));
    }
    return result;
  }

  function normalizeCandles(rawCandles) {
    if (!Array.isArray(rawCandles)) return [];
    const valid = [];
    for (const item of rawCandles) {
      if (!item) continue;
      const close = Number(item.close ?? item.closeValue ?? item.adjustedClose ?? item.price);
      if (!Number.isFinite(close) || close <= 0) continue;
      const open = Number.isFinite(Number(item.open ?? item.openValue)) && Number(item.open ?? item.openValue) > 0
        ? Number(item.open ?? item.openValue)
        : close;
      const high = Number.isFinite(Number(item.high ?? item.highValue)) && Number(item.high ?? item.highValue) > 0
        ? Number(item.high ?? item.highValue)
        : Math.max(open, close);
      const low = Number.isFinite(Number(item.low ?? item.lowValue)) && Number(item.low ?? item.lowValue) > 0
        ? Number(item.low ?? item.lowValue)
        : Math.min(open, close);
      const rawDate = String(item.date || item.time || item.referenceDate || '').trim();
      const date = rawDate.length === 8 && /^\d{8}$/.test(rawDate)
        ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
        : rawDate.slice(0, 10);
      valid.push({
        date,
        open,
        high,
        low,
        close,
        volume: Number(item.volume) || 0
      });
    }
    return valid;
  }

  /**
   * CARD A — CICLO DO MERCADO DE ORIGEM (EMA 10 e EMA 30 no Diário)
   * Regra: A recuperação de um único pregão não deve ser confundida com mudança estrutural de ciclo.
   */
  function evaluateOriginMarketCycle(rawCandles, options = {}) {
    const candles = normalizeCandles(rawCandles);
    const benchmarkName = options.benchmarkName || 'Nasdaq-100';
    const benchmarkId = options.benchmarkId || 'NASDAQ';

    if (candles.length < MARKET_CYCLE_EMA_SLOW) {
      return {
        isComplete: false,
        state: 'INCOMPLETE',
        classification: 'Dados Insuficientes',
        tone: 'neutral',
        benchmarkId,
        benchmarkName,
        price: candles.length ? candles[candles.length - 1].close : null,
        dayChangePct: null,
        ema10: null,
        ema30: null,
        emaFastPeriod: MARKET_CYCLE_EMA_FAST,
        emaSlowPeriod: MARKET_CYCLE_EMA_SLOW,
        alignment: 'Indisponível',
        alignmentDirection: 'neutral',
        structure: 'Histórico diário insuficiente (< 30 pregões)',
        summary: `Dados diários insuficientes para calcular EMA 10 e EMA 30 do índice ${benchmarkName}.`,
        chartSeries: []
      };
    }

    const closes = candles.map((c) => c.close);
    const ema10Series = calculateEmaSeries(closes, MARKET_CYCLE_EMA_FAST);
    const ema30Series = calculateEmaSeries(closes, MARKET_CYCLE_EMA_SLOW);

    const lastIdx = candles.length - 1;
    const prevIdx = Math.max(0, lastIdx - 1);
    const price = closes[lastIdx];
    const prevPrice = closes[prevIdx];
    const dayChangePct = prevPrice > 0 ? ((price / prevPrice) - 1) * 100 : 0;

    const ema10 = ema10Series[lastIdx];
    const ema30 = ema30Series[lastIdx];
    const prevEma10 = ema10Series[prevIdx] ?? ema10;
    const prevEma30 = ema30Series[prevIdx] ?? ema30;

    const ema10Slope = ema10 - prevEma10;
    const ema30Slope = ema30 - prevEma30;

    const priceAbove10 = price > ema10;
    const priceAbove30 = price > ema30;
    const ema10Above30 = ema10 > ema30;
    const slopesFavorable = ema10Slope >= 0 && ema30Slope >= 0;

    // Verificar persistência nos últimos 3 pregões para não confundir repique de 1 pregão com mudança de ciclo
    let alignedDaysCount = 0;
    const checkWindow = Math.min(3, candles.length);
    for (let i = lastIdx - checkWindow + 1; i <= lastIdx; i++) {
      if (i >= 0 && ema10Series[i] != null && ema30Series[i] != null) {
        if (closes[i] > ema30Series[i] && ema10Series[i] > ema30Series[i]) {
          alignedDaysCount++;
        }
      }
    }

    let state = 'NEGATIVE';
    let classification = 'Ciclo Negativo';
    let tone = 'bad';
    let alignment = '↓ Baixista';
    let alignmentDirection = 'down';
    let structure = 'Tendência de baixa';
    let summary = `${benchmarkName} opera abaixo das médias estruturais (EMA 10 < EMA 30), exigindo preservação de capital.`;

    if (ema10Above30 && priceAbove10 && priceAbove30 && alignedDaysCount >= 2 && (ema30Slope >= -0.0005 * ema30)) {
      state = 'POSITIVE';
      classification = 'Ciclo Positivo';
      tone = 'good';
      alignment = '↑ Altista';
      alignmentDirection = 'up';
      structure = 'Tendência de alta';
      summary = `${benchmarkName} em tendência predominante de alta, com EMA 10 acima da EMA 30, inclinação favorável e persistência confirmada.`;
    } else if (
      (ema10Above30 && priceAbove30) ||
      (priceAbove10 && ema10Slope > 0) ||
      (ema10Above30 && !priceAbove30 && ema30Slope > 0)
    ) {
      state = 'TRANSITION';
      classification = 'Ciclo de Transição';
      tone = 'warn';
      alignment = '↔ Em transição';
      alignmentDirection = 'sideways';
      if (!ema10Above30 && priceAbove10) {
        structure = 'Tentativa de retomada';
        summary = `${benchmarkName} apresenta repique curto acima da EMA 10, mas a EMA 10 segue abaixo da EMA 30. Um pregão isolado não confirma mudança estrutural de ciclo.`;
      } else {
        structure = 'Correção / Transição';
        summary = `${benchmarkName} em teste de médias (EMA 10/30). Ambiente pede seletividade e confirmação adicional.`;
      }
    }

    const sliceStart = Math.max(0, candles.length - 28);
    const chartSeries = candles.slice(sliceStart).map((c, idx) => {
      const globalIdx = sliceStart + idx;
      return {
        date: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        ema10: ema10Series[globalIdx],
        ema30: ema30Series[globalIdx]
      };
    });

    return {
      isComplete: true,
      state, // 'POSITIVE' | 'TRANSITION' | 'NEGATIVE'
      classification,
      tone,
      benchmarkId,
      benchmarkName,
      date: candles[lastIdx].date,
      price: Number(price.toFixed(2)),
      dayChangePct: Number(dayChangePct.toFixed(2)),
      ema10: Number(ema10.toFixed(2)),
      ema30: Number(ema30.toFixed(2)),
      emaFastPeriod: MARKET_CYCLE_EMA_FAST,
      emaSlowPeriod: MARKET_CYCLE_EMA_SLOW,
      ema10Slope: Number(ema10Slope.toFixed(4)),
      ema30Slope: Number(ema30Slope.toFixed(4)),
      slopesFavorable,
      persistenceDays: alignedDaysCount,
      alignment,
      alignmentDirection,
      structure,
      summary,
      chartSeries
    };
  }

  /**
   * CARD B — FORÇA INDIVIDUAL DA EMPRESA (EMA 10 e EMA 72 no Diário da Ação Original)
   */
  function evaluateCompanyStructure(rawCandles, options = {}) {
    const candles = normalizeCandles(rawCandles);
    const underlyingSymbol = options.underlyingSymbol || 'AAPL';
    const exchange = options.exchange || 'NASDAQ';

    if (candles.length < 30) {
      return {
        isComplete: false,
        state: 'INCOMPLETE',
        classification: 'Dados Insuficientes',
        tone: 'neutral',
        underlyingSymbol,
        exchange,
        price: candles.length ? candles[candles.length - 1].close : null,
        dayChangePct: null,
        ema10: null,
        ema72: null,
        emaFastPeriod: ASSET_STRUCTURE_EMA_FAST,
        emaSlowPeriod: ASSET_STRUCTURE_EMA_SLOW,
        alignment: 'Indisponível',
        alignmentDirection: 'neutral',
        relativeStrengthLabel: 'Indisponível',
        rsScore: options.rsScore ?? null,
        pattern: 'Dados insuficientes',
        summary: `Histórico diário insuficiente da ação original (${underlyingSymbol}) para avaliar estrutura EMA 10 / EMA 72.`,
        chartSeries: []
      };
    }

    const closes = candles.map((c) => c.close);
    const slowPeriod = Math.min(ASSET_STRUCTURE_EMA_SLOW, closes.length);
    const ema10Series = calculateEmaSeries(closes, ASSET_STRUCTURE_EMA_FAST);
    const ema72Series = calculateEmaSeries(closes, slowPeriod);

    const lastIdx = candles.length - 1;
    const prevIdx = Math.max(0, lastIdx - 1);
    const price = closes[lastIdx];
    const prevPrice = closes[prevIdx];
    const dayChangePct = prevPrice > 0 ? ((price / prevPrice) - 1) * 100 : 0;

    const ema10 = ema10Series[lastIdx];
    const ema72 = ema72Series[lastIdx];
    const prevEma10 = ema10Series[prevIdx] ?? ema10;
    const prevEma72 = ema72Series[prevIdx] ?? ema72;

    const ema10Slope = ema10 - prevEma10;
    const ema72Slope = ema72 - prevEma72;

    const priceAbove10 = price > ema10;
    const priceAbove72 = price > ema72;
    const ema10Above72 = ema10 > ema72;

    // Cálculo de retorno de 3M (~63 pregões) para Força Relativa se rsScore não vier pronto
    const idx3m = Math.max(0, lastIdx - Math.min(63, lastIdx));
    const return3mPct = closes[idx3m] > 0 ? ((price / closes[idx3m]) - 1) * 100 : 0;
    const rsScore = Number.isFinite(Number(options.rsScore))
      ? Number(options.rsScore)
      : Math.max(10, Math.min(99, Math.round(50 + return3mPct * 1.4)));

    let relativeStrengthLabel = 'Moderada';
    if (rsScore >= 80 || (priceAbove10 && ema10Above72 && return3mPct > 8)) {
      relativeStrengthLabel = 'Forte';
    } else if (rsScore < 45 || (!priceAbove72 && return3mPct < -3)) {
      relativeStrengthLabel = 'Fraca';
    }

    let state = 'NEGATIVE';
    let classification = 'Estrutura Negativa';
    let tone = 'bad';
    let alignment = '↓ Baixista';
    let alignmentDirection = 'down';
    let pattern = 'Abaixo das médias estruturais';
    let summary = `${underlyingSymbol} negocia abaixo das EMAs 10 e 72 no gráfico Diário, demonstrando fraqueza técnica no mercado de origem.`;

    if (ema10Above72 && priceAbove72) {
      state = 'POSITIVE';
      classification = 'Estrutura Positiva';
      tone = 'good';
      alignment = '↑ Altista';
      alignmentDirection = 'up';
      if (priceAbove10) {
        pattern = dayChangePct >= 0 ? 'Continuação / Retomada' : 'Consolidação acima da EMA 10';
        summary = `${underlyingSymbol} opera com alinhamento estrutural completo (Preço > EMA 10 > EMA 72) e tendência primária de alta.`;
      } else {
        pattern = 'Pullback na EMA 10 / Suporte EMA 72';
        summary = `${underlyingSymbol} realiza pullback controlado entre a EMA 10 e a EMA 72, mantendo estrutura primária altista.`;
      }
    } else if (priceAbove10 || priceAbove72) {
      state = 'RECOVERY';
      classification = 'Estrutura em Recuperação';
      tone = 'warn';
      alignment = '↔ Em recuperação';
      alignmentDirection = 'sideways';
      pattern = priceAbove72 ? 'Transição acima da EMA 72' : 'Recuperação curta acima da EMA 10';
      summary = `${underlyingSymbol} mostra reação técnica no curto prazo, mas ainda aguarda alinhamento completo entre EMA 10 e EMA 72.`;
    }

    const sliceStart = Math.max(0, candles.length - 28);
    const chartSeries = candles.slice(sliceStart).map((c, idx) => {
      const globalIdx = sliceStart + idx;
      return {
        date: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        ema10: ema10Series[globalIdx],
        ema72: ema72Series[globalIdx]
      };
    });

    return {
      isComplete: true,
      state, // 'POSITIVE' | 'RECOVERY' | 'NEGATIVE'
      classification,
      tone,
      underlyingSymbol,
      exchange,
      date: candles[lastIdx].date,
      price: Number(price.toFixed(2)),
      dayChangePct: Number(dayChangePct.toFixed(2)),
      ema10: Number(ema10.toFixed(2)),
      ema72: Number(ema72.toFixed(2)),
      emaFastPeriod: ASSET_STRUCTURE_EMA_FAST,
      emaSlowPeriod: ASSET_STRUCTURE_EMA_SLOW,
      ema10Slope: Number(ema10Slope.toFixed(4)),
      ema72Slope: Number(ema72Slope.toFixed(4)),
      alignment,
      alignmentDirection,
      rsScore,
      relativeStrengthLabel,
      return3mPct: Number(return3mPct.toFixed(2)),
      pattern,
      summary,
      chartSeries
    };
  }

  /**
   * CARD C — IMPACTO CAMBIAL (USD/BRL no Diário)
   */
  function evaluateFxImpact(rawFxCandles) {
    const candles = normalizeCandles(rawFxCandles);
    if (candles.length < 2) {
      return {
        isComplete: false,
        state: 'INCOMPLETE',
        classification: 'Câmbio Indisponível',
        tone: 'neutral',
        rate: candles.length ? candles[0].close : null,
        dayChangePct: null,
        direction: 'Indisponível',
        directionCode: 'neutral',
        bdrImpact: 'Indisponível',
        intensity: 'Indisponível',
        explanation: 'Cotação diária do USD/BRL indisponível para calcular o impacto cambial.',
        chartSeries: []
      };
    }

    const lastIdx = candles.length - 1;
    const rate = candles[lastIdx].close;
    const prevRate = candles[lastIdx - 1].close;
    const dayChangePct = prevRate > 0 ? ((rate / prevRate) - 1) * 100 : 0;
    const absChange = Math.abs(dayChangePct);

    let intensity = 'Baixa';
    if (absChange >= 1.25) intensity = 'Alta';
    else if (absChange >= 0.45) intensity = 'Moderada';

    let state = 'NEUTRAL';
    let classification = 'Câmbio Neutro';
    let tone = 'info';
    let direction = '↔ Estável';
    let directionCode = 'neutral';
    let bdrImpact = 'Neutro';
    let explanation = 'Dólar estável: o câmbio exerce influência neutra, permitindo que a BDR reflita predominantemente a ação original.';

    if (dayChangePct < -0.25) {
      state = 'UNFAVORABLE';
      classification = 'Câmbio Desfavorável';
      tone = 'bad';
      direction = '↓ Queda do dólar';
      directionCode = 'down';
      bdrImpact = 'Negativo';
      explanation = 'Dólar em queda: o real está se valorizando, criando pressão negativa sobre a cotação da BDR em reais.';
    } else if (dayChangePct > 0.25) {
      state = 'FAVORABLE';
      classification = 'Câmbio Favorável';
      tone = 'good';
      direction = '↑ Alta do dólar';
      directionCode = 'up';
      bdrImpact = 'Positivo';
      explanation = 'Dólar em alta: a valorização cambial favorece a cotação da BDR em reais.';
    }

    const sliceStart = Math.max(0, candles.length - 28);
    const chartSeries = candles.slice(sliceStart).map((c) => ({
      date: c.date,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }));

    return {
      isComplete: true,
      state, // 'FAVORABLE' | 'NEUTRAL' | 'UNFAVORABLE'
      classification,
      tone,
      date: candles[lastIdx].date,
      rate: Number(rate.toFixed(4)),
      rateDisplay: Number(rate.toFixed(2)),
      dayChangePct: Number(dayChangePct.toFixed(2)),
      direction,
      directionCode,
      bdrImpact,
      intensity,
      explanation,
      chartSeries
    };
  }

  /**
   * ÁREA 3 — DECOMPOSIÇÃO DO PREÇO DA BDR
   * Fórmula: Preço teórico da BDR = Preço da ação original × USD/BRL × fator de conversão
   */
  function calculatePriceDecomposition(params = {}) {
    const underlyingPriceUsd = Number(params.underlyingPriceUsd);
    const underlyingChangePct = Number(params.underlyingChangePct);
    const fxRate = Number(params.fxRate);
    const fxChangePct = Number(params.fxChangePct);
    const conversionFactor = Number(params.conversionFactor) > 0 ? Number(params.conversionFactor) : 1;
    const observedBdrPriceBrl = Number(params.observedBdrPriceBrl);
    const observedBdrChangePct = Number(params.observedBdrChangePct);

    const hasCoreNumbers = Number.isFinite(underlyingPriceUsd) &&
      Number.isFinite(underlyingChangePct) &&
      Number.isFinite(fxRate) &&
      Number.isFinite(fxChangePct);

    if (!hasCoreNumbers) {
      return {
        isComplete: false,
        formula: 'Preço teórico da BDR = Preço da ação original × USD/BRL × fator de conversão',
        conversionFactor,
        underlyingContributionPct: null,
        fxContributionPct: null,
        interactionEffectPct: null,
        theoreticalBdrChangePct: null,
        observedBdrChangePct: Number.isFinite(observedBdrChangePct) ? Number(observedBdrChangePct.toFixed(2)) : null,
        theoreticalPriceBrl: null,
        observedPriceBrl: Number.isFinite(observedBdrPriceBrl) ? Number(observedBdrPriceBrl.toFixed(2)) : null,
        priceDifferenceBrl: null,
        priceDifferencePct: null,
        returnDifferencePct: null,
        dominantDriver: 'UNKNOWN',
        dominantDriverLabel: 'Dados incompletos',
        message: 'Não foi possível decompor o preço da BDR porque faltam cotações sincronizadas da ação original ou do câmbio.'
      };
    }

    const rStock = underlyingChangePct / 100;
    const rFx = fxChangePct / 100;
    const rTheo = (1 + rStock) * (1 + rFx) - 1;
    const theoreticalBdrChangePct = Number((rTheo * 100).toFixed(2));
    const interactionEffectPct = Number(((rStock * rFx) * 100).toFixed(2));
    const theoreticalPriceBrl = Number((underlyingPriceUsd * fxRate * conversionFactor).toFixed(2));

    const hasObservedPrice = Number.isFinite(observedBdrPriceBrl) && observedBdrPriceBrl > 0;
    const hasObservedReturn = Number.isFinite(observedBdrChangePct);

    const priceDifferenceBrl = hasObservedPrice
      ? Number((observedBdrPriceBrl - theoreticalPriceBrl).toFixed(2))
      : null;
    const priceDifferencePct = (hasObservedPrice && theoreticalPriceBrl > 0)
      ? Number((((observedBdrPriceBrl / theoreticalPriceBrl) - 1) * 100).toFixed(2))
      : null;
    const returnDifferencePct = hasObservedReturn
      ? Number((observedBdrChangePct - theoreticalBdrChangePct).toFixed(2))
      : null;

    // Identificar fator predominante da movimentação no dia
    const absStock = Math.abs(underlyingChangePct);
    const absFx = Math.abs(fxChangePct);
    let dominantDriver = 'BALANCED';
    let dominantDriverLabel = 'Equilíbrio entre Ação Original e Câmbio';
    if (absStock > absFx * 1.25 && absStock >= 0.25) {
      dominantDriver = 'COMPANY';
      dominantDriverLabel = underlyingChangePct >= 0
        ? 'Alta puxada pela Ação Original no exterior'
        : 'Queda puxada pela Ação Original no exterior';
    } else if (absFx > absStock * 1.25 && absFx >= 0.25) {
      dominantDriver = 'FX';
      dominantDriverLabel = fxChangePct >= 0
        ? 'Movimento dominado pela Alta do Dólar (USD/BRL)'
        : 'Movimento dominado pela Queda do Dólar (USD/BRL)';
    }

    // Mensagem automática explicativa conforme especificação
    let message = 'Movimentação equilibrada: a variação da BDR reflete de forma proporcional o comportamento da ação original e do câmbio.';
    if (underlyingChangePct > 0.15 && fxChangePct < -0.15) {
      if (theoreticalBdrChangePct < 0) {
        message = 'A empresa está valorizando no mercado de origem, mas a desvalorização do dólar está superando essa valorização. A queda da BDR não representa necessariamente fraqueza da empresa.';
      } else {
        message = 'A empresa está valorizando no mercado de origem com força suficiente para manter a BDR em alta, embora a queda do dólar esteja reduzindo parte do ganho em reais.';
      }
    } else if (underlyingChangePct < -0.15 && fxChangePct > 0.15) {
      if (theoreticalBdrChangePct > 0) {
        message = 'A alta da BDR em reais decorre predominantemente da valorização do dólar, mascarando a queda da ação original no mercado de origem. Não confunda alta cambial com força da empresa.';
      } else {
        message = 'A ação original está caindo no mercado de origem; a valorização do dólar apenas amortece parcialmente a queda da BDR em reais.';
      }
    } else if (underlyingChangePct > 0.15 && fxChangePct > 0.15) {
      message = 'Convergência positiva: a valorização da empresa no mercado de origem está sendo potencializada pela alta do dólar frente ao real.';
    } else if (underlyingChangePct < -0.15 && fxChangePct < -0.15) {
      message = 'Pressão negativa dupla: a queda da BDR decorre tanto do recuo da ação original no exterior quanto da desvalorização do dólar frente ao real.';
    }

    return {
      isComplete: true,
      formula: 'Preço teórico da BDR = Preço da ação original × USD/BRL × fator de conversão',
      conversionFactor,
      underlyingPriceUsd: Number(underlyingPriceUsd.toFixed(2)),
      fxRate: Number(fxRate.toFixed(4)),
      underlyingContributionPct: Number(underlyingChangePct.toFixed(2)),
      fxContributionPct: Number(fxChangePct.toFixed(2)),
      interactionEffectPct,
      theoreticalBdrChangePct,
      observedBdrChangePct: hasObservedReturn ? Number(observedBdrChangePct.toFixed(2)) : theoreticalBdrChangePct,
      theoreticalPriceBrl,
      observedPriceBrl: hasObservedPrice ? Number(observedBdrPriceBrl.toFixed(2)) : theoreticalPriceBrl,
      priceDifferenceBrl,
      priceDifferencePct,
      returnDifferencePct,
      dominantDriver,
      dominantDriverLabel,
      message
    };
  }

  /**
   * MATRIZ DE INTERPRETAÇÃO COMPLETA (27 combinações explícitas: 3 Ciclo × 3 Empresa × 3 Câmbio)
   * Hierarquia estrita:
   * Nível 1: Mercado de origem (POSITIVE | TRANSITION | NEGATIVE) — filtro estrutural prioritário.
   * Nível 2: Empresa (POSITIVE | RECOVERY | NEGATIVE) — estrutura técnica individual.
   * Nível 3: Câmbio (FAVORABLE | NEUTRAL | UNFAVORABLE) — ajuste de atratividade, nunca compensa filtro negativo.
   */
  const INTERPRETATION_MATRIX = [
    // =========================================================================
    // 1. CICLO DO MERCADO DE ORIGEM: POSITIVO (Procurar oportunidades)
    // =========================================================================
    {
      id: 'POS_POS_FAV',
      market: 'POSITIVE',
      marketLabel: 'Ciclo Positivo',
      company: 'POSITIVE',
      companyLabel: 'Estrutura Positiva',
      fx: 'FAVORABLE',
      fxLabel: 'Câmbio Favorável',
      guidance: 'Cenário ideal',
      topDiagnosis: 'Favorável para análise',
      tone: 'good',
      isOperable: true,
      hasConflict: false,
      explanation: 'Os três vetores atuam a favor: mercado internacional em ciclo positivo, empresa em tendência de alta e dólar valorizando a BDR em reais.'
    },
    {
      id: 'POS_POS_NEU',
      market: 'POSITIVE',
      marketLabel: 'Ciclo Positivo',
      company: 'POSITIVE',
      companyLabel: 'Estrutura Positiva',
      fx: 'NEUTRAL',
      fxLabel: 'Câmbio Neutro',
      guidance: 'Cenário favorável',
      topDiagnosis: 'Favorável para análise',
      tone: 'good',
      isOperable: true,
      hasConflict: false,
      explanation: 'Ciclo internacional positivo e empresa com estrutura técnica saudável, com pouca interferência cambial.'
    },
    {
      id: 'POS_POS_UNF',
      market: 'POSITIVE',
      marketLabel: 'Ciclo Positivo',
      company: 'POSITIVE',
      companyLabel: 'Estrutura Positiva',
      fx: 'UNFAVORABLE',
      fxLabel: 'Câmbio Desfavorável',
      guidance: 'Oportunidade com pressão cambial',
      topDiagnosis: 'Atenção: conflito entre fatores',
      tone: 'warn',
      isOperable: true,
      hasConflict: true,
      explanation: 'A empresa demonstra força no mercado de origem em ciclo positivo, mas a queda do dólar exerce pressão negativa sobre a cotação da BDR em reais.'
    },
    {
      id: 'POS_REC_FAV',
      market: 'POSITIVE',
      marketLabel: 'Ciclo Positivo',
      company: 'RECOVERY',
      companyLabel: 'Em Recuperação',
      fx: 'FAVORABLE',
      fxLabel: 'Câmbio Favorável',
      guidance: 'Aguardar confirmação da empresa',
      topDiagnosis: 'Aguardar confirmação',
      tone: 'info',
      isOperable: false,
      hasConflict: true,
      explanation: 'Ciclo externo positivo e câmbio favorável, mas a ação original ainda está em recuperação estrutural. Aguardar alinhamento das EMAs 10 e 72.'
    },
    {
      id: 'POS_REC_NEU',
      market: 'POSITIVE',
      marketLabel: 'Ciclo Positivo',
      company: 'RECOVERY',
      companyLabel: 'Em Recuperação',
      fx: 'NEUTRAL',
      fxLabel: 'Câmbio Neutro',
      guidance: 'Aguardar confirmação da empresa',
      topDiagnosis: 'Aguardar confirmação',
      tone: 'info',
      isOperable: false,
      hasConflict: true,
      explanation: 'O mercado de origem permite buscar operações, mas a empresa ainda precisa confirmar retomada estrutural (EMA 10 > EMA 72) com câmbio neutro.'
    },
    {
      id: 'POS_REC_UNF',
      market: 'POSITIVE',
      marketLabel: 'Ciclo Positivo',
      company: 'RECOVERY',
      companyLabel: 'Em Recuperação',
      fx: 'UNFAVORABLE',
      fxLabel: 'Câmbio Desfavorável',
      guidance: 'Aguardar confirmação da empresa (com pressão cambial)',
      topDiagnosis: 'Atenção: conflito entre fatores',
      tone: 'warn',
      isOperable: false,
      hasConflict: true,
      explanation: 'Mercado externo positivo, porém a empresa ainda está em recuperação técnica e enfrenta pressão negativa da queda do dólar.'
    },
    {
      id: 'POS_NEG_FAV',
      market: 'POSITIVE',
      marketLabel: 'Ciclo Positivo',
      company: 'NEGATIVE',
      companyLabel: 'Estrutura Negativa',
      fx: 'FAVORABLE',
      fxLabel: 'Câmbio Favorável',
      guidance: 'Não operar',
      topDiagnosis: 'Desfavorável',
      tone: 'bad',
      isOperable: false,
      hasConflict: true,
      explanation: 'Apesar do ciclo internacional positivo e da alta do dólar, a empresa apresenta estrutura técnica negativa no mercado de origem. Não operar.'
    },
    {
      id: 'POS_NEG_NEU',
      market: 'POSITIVE',
      marketLabel: 'Ciclo Positivo',
      company: 'NEGATIVE',
      companyLabel: 'Estrutura Negativa',
      fx: 'NEUTRAL',
      fxLabel: 'Câmbio Neutro',
      guidance: 'Não operar',
      topDiagnosis: 'Desfavorável',
      tone: 'bad',
      isOperable: false,
      hasConflict: false,
      explanation: 'A ação original opera abaixo das EMAs 10 e 72 em tendência de baixa, mesmo com o índice externo positivo. Não operar.'
    },
    {
      id: 'POS_NEG_UNF',
      market: 'POSITIVE',
      marketLabel: 'Ciclo Positivo',
      company: 'NEGATIVE',
      companyLabel: 'Estrutura Negativa',
      fx: 'UNFAVORABLE',
      fxLabel: 'Câmbio Desfavorável',
      guidance: 'Não operar',
      topDiagnosis: 'Desfavorável',
      tone: 'bad',
      isOperable: false,
      hasConflict: false,
      explanation: 'Empresa com estrutura técnica negativa no exterior somada à desvalorização do dólar frente ao real. Não operar.'
    },

    // =========================================================================
    // 2. CICLO DO MERCADO DE ORIGEM: TRANSIÇÃO (Aguardar confirmação)
    // =========================================================================
    {
      id: 'TRA_POS_FAV',
      market: 'TRANSITION',
      marketLabel: 'Ciclo de Transição',
      company: 'POSITIVE',
      companyLabel: 'Estrutura Positiva',
      fx: 'FAVORABLE',
      fxLabel: 'Câmbio Favorável',
      guidance: 'Aguardar confirmação do ciclo',
      topDiagnosis: 'Aguardar confirmação',
      tone: 'info',
      isOperable: false,
      hasConflict: true,
      explanation: 'A empresa apresenta estrutura positiva e câmbio a favor, mas o mercado de origem está em transição. Exigir confirmação adicional do ciclo.'
    },
    {
      id: 'TRA_POS_NEU',
      market: 'TRANSITION',
      marketLabel: 'Ciclo de Transição',
      company: 'POSITIVE',
      companyLabel: 'Estrutura Positiva',
      fx: 'NEUTRAL',
      fxLabel: 'Câmbio Neutro',
      guidance: 'Aguardar confirmação do ciclo',
      topDiagnosis: 'Aguardar confirmação',
      tone: 'info',
      isOperable: false,
      hasConflict: true,
      explanation: 'Empresa líder com estrutura positiva e câmbio neutro, porém o índice internacional ainda está em transição. Aguardar confirmação do ciclo.'
    },
    {
      id: 'TRA_POS_UNF',
      market: 'TRANSITION',
      marketLabel: 'Ciclo de Transição',
      company: 'POSITIVE',
      companyLabel: 'Estrutura Positiva',
      fx: 'UNFAVORABLE',
      fxLabel: 'Câmbio Desfavorável',
      guidance: 'Aguardar confirmação do ciclo (com pressão cambial)',
      topDiagnosis: 'Atenção: conflito entre fatores',
      tone: 'warn',
      isOperable: false,
      hasConflict: true,
      explanation: 'A empresa mantém estrutura positiva, mas enfrenta mercado de origem em transição e pressão cambial negativa do dólar.'
    },
    {
      id: 'TRA_REC_FAV',
      market: 'TRANSITION',
      marketLabel: 'Ciclo de Transição',
      company: 'RECOVERY',
      companyLabel: 'Em Recuperação',
      fx: 'FAVORABLE',
      fxLabel: 'Câmbio Favorável',
      guidance: 'Aguardar confirmação',
      topDiagnosis: 'Aguardar confirmação',
      tone: 'info',
      isOperable: false,
      hasConflict: true,
      explanation: 'Tanto o mercado internacional quanto a ação original estão em transição/recuperação. A alta do dólar não substitui a confirmação técnica.'
    },
    {
      id: 'TRA_REC_NEU',
      market: 'TRANSITION',
      marketLabel: 'Ciclo de Transição',
      company: 'RECOVERY',
      companyLabel: 'Em Recuperação',
      fx: 'NEUTRAL',
      fxLabel: 'Câmbio Neutro',
      guidance: 'Aguardar confirmação',
      topDiagnosis: 'Aguardar confirmação',
      tone: 'info',
      isOperable: false,
      hasConflict: false,
      explanation: 'Mercado de origem em transição e empresa em recuperação técnica com câmbio neutro. Aguardar alinhamento estrutural.'
    },
    {
      id: 'TRA_REC_UNF',
      market: 'TRANSITION',
      marketLabel: 'Ciclo de Transição',
      company: 'RECOVERY',
      companyLabel: 'Em Recuperação',
      fx: 'UNFAVORABLE',
      fxLabel: 'Câmbio Desfavorável',
      guidance: 'Aguardar confirmação',
      topDiagnosis: 'Atenção: conflito entre fatores',
      tone: 'warn',
      isOperable: false,
      hasConflict: true,
      explanation: 'Mercado em transição, empresa sem estrutura confirmada e câmbio desfavorável pressionando a BDR.'
    },
    {
      id: 'TRA_NEG_FAV',
      market: 'TRANSITION',
      marketLabel: 'Ciclo de Transição',
      company: 'NEGATIVE',
      companyLabel: 'Estrutura Negativa',
      fx: 'FAVORABLE',
      fxLabel: 'Câmbio Favorável',
      guidance: 'Não operar',
      topDiagnosis: 'Desfavorável',
      tone: 'bad',
      isOperable: false,
      hasConflict: true,
      explanation: 'Mercado de origem em transição e empresa em estrutura negativa. A alta do dólar não justifica entrada em ativo fraco.'
    },
    {
      id: 'TRA_NEG_NEU',
      market: 'TRANSITION',
      marketLabel: 'Ciclo de Transição',
      company: 'NEGATIVE',
      companyLabel: 'Estrutura Negativa',
      fx: 'NEUTRAL',
      fxLabel: 'Câmbio Neutro',
      guidance: 'Não operar',
      topDiagnosis: 'Desfavorável',
      tone: 'bad',
      isOperable: false,
      hasConflict: false,
      explanation: 'Mercado de origem sem tendência confirmada e empresa em estrutura técnica negativa.'
    },
    {
      id: 'TRA_NEG_UNF',
      market: 'TRANSITION',
      marketLabel: 'Ciclo de Transição',
      company: 'NEGATIVE',
      companyLabel: 'Estrutura Negativa',
      fx: 'UNFAVORABLE',
      fxLabel: 'Câmbio Desfavorável',
      guidance: 'Não operar',
      topDiagnosis: 'Desfavorável',
      tone: 'bad',
      isOperable: false,
      hasConflict: false,
      explanation: 'Mercado em transição, ação original em tendência de baixa e dólar exercendo pressão negativa sobre a BDR.'
    },

    // =========================================================================
    // 3. CICLO DO MERCADO DE ORIGEM: NEGATIVO (Bloquear novas entradas)
    // =========================================================================
    {
      id: 'NEG_POS_FAV',
      market: 'NEGATIVE',
      marketLabel: 'Ciclo Negativo',
      company: 'POSITIVE',
      companyLabel: 'Estrutura Positiva',
      fx: 'FAVORABLE',
      fxLabel: 'Câmbio Favorável',
      guidance: 'Bloqueado pela metodologia padrão',
      topDiagnosis: 'Atenção: conflito entre fatores',
      tone: 'bad',
      isOperable: false,
      hasConflict: true,
      explanation: 'Empresa resiliente e câmbio favorável, mas o ciclo do mercado de origem é negativo. A força individual não compensa um ciclo negativo.'
    },
    {
      id: 'NEG_POS_NEU',
      market: 'NEGATIVE',
      marketLabel: 'Ciclo Negativo',
      company: 'POSITIVE',
      companyLabel: 'Estrutura Positiva',
      fx: 'NEUTRAL',
      fxLabel: 'Câmbio Neutro',
      guidance: 'Bloqueado pela metodologia padrão',
      topDiagnosis: 'Atenção: conflito entre fatores',
      tone: 'bad',
      isOperable: false,
      hasConflict: true,
      explanation: 'Apesar da estrutura positiva da empresa, o mercado de origem encontra-se em ciclo negativo (EMA 10 < EMA 30). Bloqueado pela metodologia padrão.'
    },
    {
      id: 'NEG_POS_UNF',
      market: 'NEGATIVE',
      marketLabel: 'Ciclo Negativo',
      company: 'POSITIVE',
      companyLabel: 'Estrutura Positiva',
      fx: 'UNFAVORABLE',
      fxLabel: 'Câmbio Desfavorável',
      guidance: 'Bloqueado pela metodologia padrão',
      topDiagnosis: 'Atenção: conflito entre fatores',
      tone: 'bad',
      isOperable: false,
      hasConflict: true,
      explanation: 'Empresa positiva isoladamente, mas bloqueada pelo ciclo negativo do mercado de origem e penalizada pela queda do dólar.'
    },
    {
      id: 'NEG_REC_FAV',
      market: 'NEGATIVE',
      marketLabel: 'Ciclo Negativo',
      company: 'RECOVERY',
      companyLabel: 'Em Recuperação',
      fx: 'FAVORABLE',
      fxLabel: 'Câmbio Favorável',
      guidance: 'Bloqueado pela metodologia padrão',
      topDiagnosis: 'Desfavorável',
      tone: 'bad',
      isOperable: false,
      hasConflict: true,
      explanation: 'Ciclo do mercado internacional negativo bloqueia novas entradas pela metodologia padrão, mesmo com repique da ação e alta do dólar.'
    },
    {
      id: 'NEG_REC_NEU',
      market: 'NEGATIVE',
      marketLabel: 'Ciclo Negativo',
      company: 'RECOVERY',
      companyLabel: 'Em Recuperação',
      fx: 'NEUTRAL',
      fxLabel: 'Câmbio Neutro',
      guidance: 'Bloqueado pela metodologia padrão',
      topDiagnosis: 'Desfavorável',
      tone: 'bad',
      isOperable: false,
      hasConflict: false,
      explanation: 'Ciclo internacional negativo e empresa ainda sem estrutura confirmada. Bloqueado pela metodologia padrão.'
    },
    {
      id: 'NEG_REC_UNF',
      market: 'NEGATIVE',
      marketLabel: 'Ciclo Negativo',
      company: 'RECOVERY',
      companyLabel: 'Em Recuperação',
      fx: 'UNFAVORABLE',
      fxLabel: 'Câmbio Desfavorável',
      guidance: 'Bloqueado pela metodologia padrão',
      topDiagnosis: 'Desfavorável',
      tone: 'bad',
      isOperable: false,
      hasConflict: false,
      explanation: 'Ciclo internacional negativo com empresa apenas em recuperação e pressão cambial contrária. Bloqueado pela metodologia padrão.'
    },
    {
      id: 'NEG_NEG_FAV',
      market: 'NEGATIVE',
      marketLabel: 'Ciclo Negativo',
      company: 'NEGATIVE',
      companyLabel: 'Estrutura Negativa',
      fx: 'FAVORABLE',
      fxLabel: 'Câmbio Favorável',
      guidance: 'Desfavorável',
      topDiagnosis: 'Desfavorável',
      tone: 'bad',
      isOperable: false,
      hasConflict: true,
      explanation: 'Ciclo internacional negativo e empresa em tendência de baixa. A alta do dólar jamais compensa ciclo e estrutura negativos.'
    },
    {
      id: 'NEG_NEG_NEU',
      market: 'NEGATIVE',
      marketLabel: 'Ciclo Negativo',
      company: 'NEGATIVE',
      companyLabel: 'Estrutura Negativa',
      fx: 'NEUTRAL',
      fxLabel: 'Câmbio Neutro',
      guidance: 'Desfavorável',
      topDiagnosis: 'Desfavorável',
      tone: 'bad',
      isOperable: false,
      hasConflict: false,
      explanation: 'Ciclo internacional negativo e empresa em estrutura de baixa com câmbio neutro. Ambiente totalmente desfavorável.'
    },
    {
      id: 'NEG_NEG_UNF',
      market: 'NEGATIVE',
      marketLabel: 'Ciclo Negativo',
      company: 'NEGATIVE',
      companyLabel: 'Estrutura Negativa',
      fx: 'UNFAVORABLE',
      fxLabel: 'Câmbio Desfavorável',
      guidance: 'Desfavorável',
      topDiagnosis: 'Desfavorável',
      tone: 'bad',
      isOperable: false,
      hasConflict: false,
      explanation: 'Todos os três fatores negativos: mercado internacional em queda, ação original em tendência de baixa e dólar desvalorizando.'
    }
  ];

  function resolveDecisionHierarchy(marketCycle, companyStructure, fxImpact) {
    if (!marketCycle?.isComplete || !companyStructure?.isComplete || !fxImpact?.isComplete) {
      return {
        isComplete: false,
        ruleId: 'INCOMPLETE_DATA',
        guidance: 'Dados insuficientes para diagnóstico conclusivo',
        topDiagnosis: 'Aguardar confirmação',
        tone: 'neutral',
        isOperable: false,
        hasConflict: false,
        explanation: 'Existem séries diárias ausentes ou incompletas. O sistema não emite diagnóstico conclusivo com dados parciais.',
        levels: {
          level1: {
            title: 'Mercado de origem',
            status: marketCycle?.classification || 'Indisponível',
            tone: 'neutral',
            text: marketCycle?.isComplete ? marketCycle.summary : 'Aguardando sincronização do índice internacional.'
          },
          level2: {
            title: 'Empresa',
            status: companyStructure?.classification || 'Indisponível',
            tone: 'neutral',
            text: companyStructure?.isComplete ? companyStructure.summary : 'Aguardando sincronização da ação original.'
          },
          level3: {
            title: 'Câmbio',
            status: fxImpact?.classification || 'Indisponível',
            tone: 'neutral',
            text: fxImpact?.isComplete ? fxImpact.explanation : 'Aguardando sincronização do USD/BRL.'
          }
        }
      };
    }

    const m = marketCycle.state; // POSITIVE | TRANSITION | NEGATIVE
    const c = companyStructure.state; // POSITIVE | RECOVERY | NEGATIVE
    const f = fxImpact.state; // FAVORABLE | NEUTRAL | UNFAVORABLE

    let matched = INTERPRETATION_MATRIX.find(
      (row) => row.market === m && row.company === c && row.fx === f
    );
    if (!matched) {
      matched = INTERPRETATION_MATRIX.find(
        (row) => row.market === m && row.company === c && row.fx === 'ANY'
      );
    }
    if (!matched) {
      matched = INTERPRETATION_MATRIX[INTERPRETATION_MATRIX.length - 1];
    }

    // Textos dos 3 níveis hierárquicos da Área 4
    const level1Text = m === 'POSITIVE'
      ? 'Ciclo positivo — ambiente autorizado para buscar oportunidades.'
      : (m === 'TRANSITION'
        ? 'Ciclo de transição — exigir confirmação adicional antes de operar.'
        : 'Ciclo negativo — evitar novas entradas pela metodologia padrão.');

    const level2Text = c === 'POSITIVE'
      ? 'Estrutura positiva — tendência de alta e força relativa.'
      : (c === 'RECOVERY'
        ? 'Em recuperação — aguardar confirmação estrutural (EMA 10 > EMA 72).'
        : 'Estrutura negativa — não operar contra a tendência da ação original.');

    const level3Text = f === 'FAVORABLE'
      ? 'Favorável — valorização do dólar atua a favor da BDR em reais.'
      : (f === 'NEUTRAL'
        ? 'Neutro — câmbio estável sem distorcer a movimentação da ação original.'
        : 'Desfavorável — pressão cambial negativa sobre a BDR em reais.');

    return {
      isComplete: true,
      ruleId: matched.id,
      guidance: matched.guidance,
      topDiagnosis: matched.topDiagnosis,
      tone: matched.tone,
      isOperable: matched.isOperable,
      hasConflict: matched.hasConflict,
      explanation: matched.explanation,
      detailCallout: matched.guidance === 'Oportunidade com pressão cambial'
        ? 'A operação é possível pela força da empresa e do ciclo externo, mas exige maior atenção ao risco e ao impacto do câmbio.'
        : matched.explanation,
      levels: {
        level1: {
          level: 1,
          title: 'Mercado de origem',
          status: marketCycle.classification,
          tone: marketCycle.tone,
          text: level1Text
        },
        level2: {
          level: 2,
          title: 'Empresa',
          status: companyStructure.classification,
          tone: companyStructure.tone,
          text: level2Text
        },
        level3: {
          level: 3,
          title: 'Câmbio',
          status: fxImpact.classification,
          tone: fxImpact.tone,
          text: level3Text
        }
      }
    };
  }

  /**
   * Validação de sincronia temporal, diferenças de calendário e atualidade dos dados (Seção 5)
   */
  function evaluateDataQuality(params = {}) {
    const bdrDate = params.bdrDate || null;
    const underlyingDate = params.underlyingDate || null;
    const benchmarkDate = params.benchmarkDate || null;
    const fxDate = params.fxDate || null;
    const isComplete = Boolean(params.isComplete);

    const dates = [bdrDate, underlyingDate, benchmarkDate, fxDate].filter(Boolean);
    if (!isComplete || dates.length < 3) {
      return {
        isComplete: false,
        isSynchronized: false,
        isStale: true,
        status: 'INCOMPLETE',
        badgeText: 'Dados Parciais / Incompletos',
        warningMessage: 'Há séries diárias ausentes ou com histórico insuficiente. O sistema bloqueia diagnósticos conclusivos com dados incompletos.',
        timestamps: { bdrDate, underlyingDate, benchmarkDate, fxDate }
      };
    }

    const toMs = (dStr) => {
      const parsed = Date.parse(`${String(dStr).slice(0, 10)}T12:00:00Z`);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const msValues = dates.map(toMs).filter(Number.isFinite);
    const maxMs = Math.max(...msValues);
    const minMs = Math.min(...msValues);
    const spreadDays = Math.round((maxMs - minMs) / (1000 * 60 * 60 * 24));

    // Verifica diferença de calendário (ex: feriado nos EUA vs pregão normal na B3)
    const hasCalendarDiff = bdrDate && underlyingDate && bdrDate !== underlyingDate;
    const isStale = spreadDays > 5;

    let status = 'SYNCHRONIZED';
    let badgeText = 'Cotações Sincronizadas (Diário)';
    let warningMessage = null;

    if (isStale) {
      status = 'STALE';
      badgeText = 'Atenção: Cotação Defasada';
      warningMessage = `Defasagem de ${spreadDays} dias detectada entre as fontes (B3: ${bdrDate || '—'}, EUA: ${underlyingDate || '—'}, Câmbio: ${fxDate || '—'}). Não confunda cotação defasada com variação real.`;
    } else if (hasCalendarDiff) {
      status = 'CALENDAR_OFFSET';
      badgeText = 'Diferença de Calendário (B3 × EUA)';
      warningMessage = `Diferença de calendário entre os mercados (B3: ${bdrDate}, Bolsa de origem: ${underlyingDate}). Considere feriados ou horários distintos de fechamento.`;
    }

    return {
      isComplete: true,
      isSynchronized: !isStale,
      hasCalendarDiff: Boolean(hasCalendarDiff),
      isStale,
      spreadDays,
      status,
      badgeText,
      warningMessage,
      timestamps: { bdrDate, underlyingDate, benchmarkDate, fxDate }
    };
  }

  /**
   * Avaliação completa de uma BDR (Ponto de entrada principal do modelo)
   */
  function evaluateBdrIntelligence(input = {}) {
    const meta = getBdrMetadata(input.bdrSymbol || input.symbol || 'AAPL34', input);

    const bdrCandles = normalizeCandles(input.bdrCandles);
    const underlyingCandles = normalizeCandles(input.underlyingCandles);
    const benchmarkCandles = normalizeCandles(input.benchmarkCandles);
    const fxCandles = normalizeCandles(input.fxCandles);

    const marketCycle = evaluateOriginMarketCycle(benchmarkCandles, {
      benchmarkId: meta.benchmarkId,
      benchmarkName: meta.benchmarkName
    });

    const companyStructure = evaluateCompanyStructure(underlyingCandles, {
      underlyingSymbol: meta.underlyingSymbol,
      exchange: meta.exchange,
      rsScore: input.rsScore
    });

    const fxImpact = evaluateFxImpact(fxCandles);

    // Preço e variação observados na BDR na B3
    let observedBdrPriceBrl = Number(input.bdrPriceBrl);
    let observedBdrChangePct = Number(input.bdrChangePct);
    let bdrDate = input.bdrDate || null;

    if (bdrCandles.length >= 1) {
      const lastBdr = bdrCandles[bdrCandles.length - 1];
      if (!Number.isFinite(observedBdrPriceBrl)) observedBdrPriceBrl = lastBdr.close;
      bdrDate = bdrDate || lastBdr.date;
      if (bdrCandles.length >= 2 && !Number.isFinite(observedBdrChangePct)) {
        const prevBdr = bdrCandles[bdrCandles.length - 2];
        observedBdrChangePct = prevBdr.close > 0 ? ((lastBdr.close / prevBdr.close) - 1) * 100 : 0;
      }
    }

    const decomposition = calculatePriceDecomposition({
      underlyingPriceUsd: companyStructure.price,
      underlyingChangePct: companyStructure.dayChangePct,
      fxRate: fxImpact.rate,
      fxChangePct: fxImpact.dayChangePct,
      conversionFactor: meta.conversionFactor,
      observedBdrPriceBrl,
      observedBdrChangePct
    });

    const decision = resolveDecisionHierarchy(marketCycle, companyStructure, fxImpact);

    const dataQuality = evaluateDataQuality({
      isComplete: decision.isComplete && decomposition.isComplete,
      bdrDate,
      underlyingDate: companyStructure.date,
      benchmarkDate: marketCycle.date,
      fxDate: fxImpact.date
    });

    // Resumo compacto para exibição na Watchlist (Seção 4)
    const watchlistBadge = {
      bdrSymbol: meta.bdrSymbol,
      underlyingSymbol: meta.underlyingSymbol,
      originCycle: marketCycle.classification,
      originCycleTone: marketCycle.tone,
      companyStrength: companyStructure.classification,
      companyStrengthTone: companyStructure.tone,
      fxImpact: fxImpact.classification,
      fxImpactTone: fxImpact.tone,
      consolidatedDiagnosis: decision.guidance,
      topDiagnosis: decision.topDiagnosis,
      diagnosisTone: decision.tone
    };

    return {
      bdrSymbol: meta.bdrSymbol,
      underlyingSymbol: meta.underlyingSymbol,
      companyName: meta.name,
      sector: meta.sector,
      exchange: meta.exchange,
      exchangeDisplay: meta.exchangeDisplay,
      country: meta.country,
      benchmarkId: meta.benchmarkId,
      benchmarkName: meta.benchmarkName,
      bdrsPerShare: meta.bdrsPerShare,
      conversionFactor: meta.conversionFactor,
      parityLabel: meta.parityLabel,
      updatedAt: input.updatedAt || new Date().toISOString(),
      quotes: {
        bdrPriceBrl: decomposition.observedPriceBrl,
        bdrChangePct: decomposition.observedBdrChangePct,
        theoreticalBdrPriceBrl: decomposition.theoreticalPriceBrl,
        theoreticalBdrChangePct: decomposition.theoreticalBdrChangePct,
        underlyingPriceUsd: companyStructure.price,
        underlyingChangePct: companyStructure.dayChangePct,
        fxRate: fxImpact.rate,
        fxRateDisplay: fxImpact.rateDisplay,
        fxChangePct: fxImpact.dayChangePct
      },
      diagnosis: {
        status: decision.topDiagnosis,
        guidance: decision.guidance,
        tone: decision.tone,
        isOperable: decision.isOperable,
        hasConflict: decision.hasConflict,
        explanation: decision.explanation,
        detailCallout: decision.detailCallout
      },
      factors: {
        originMarket: marketCycle,
        company: companyStructure,
        fx: fxImpact
      },
      decomposition,
      decision,
      dataQuality,
      watchlistBadge,
      matrix: INTERPRETATION_MATRIX
    };
  }

  return {
    MARKET_CYCLE_EMA_FAST,
    MARKET_CYCLE_EMA_SLOW,
    ASSET_STRUCTURE_EMA_FAST,
    ASSET_STRUCTURE_EMA_SLOW,
    BDR_CATALOG,
    INTERPRETATION_MATRIX,
    isBdrTicker,
    formatParityLabel,
    getBdrMetadata,
    calculateEmaSeries,
    normalizeCandles,
    evaluateOriginMarketCycle,
    evaluateCompanyStructure,
    evaluateFxImpact,
    calculatePriceDecomposition,
    resolveDecisionHierarchy,
    evaluateDataQuality,
    evaluateBdrIntelligence
  };
});
