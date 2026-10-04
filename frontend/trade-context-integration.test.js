const { test } = require('node:test');
const assert = require('node:assert/strict');
const TickerChartModel = require('./ticker-chart-model.js');
const trades = require('../backend/src/trades.js');

test('TradeContext: buildTradeContext extrai todos os dados analíticos de BPAC11 com fidelidade', () => {
  const tickerData = {
    tickerInfo: {
      symbol: 'BPAC11',
      name: 'BTG PACTUAL',
      price: 66.02,
      sessionDate: '2026-10-02',
      assetClass: 'Ações (B3)',
      sector: 'Financeiro'
    },
    trigger: {
      id: '123_COMPRA',
      name: '1-2-3 de Compra',
      grade: 'A',
      hasTrigger: true,
      entry: 66.03,
      stop: 63.06,
      entryLabel: '1 tick acima da máxima',
      stopLabel: '1 tick abaixo da mínima'
    },
    relativeStrength: {
      score: 80,
      classification: 'Forte'
    },
    marketCycle: {
      regime: 'healthy',
      description: 'Positivo',
      benchmark: 'IBOV',
      score: 88
    },
    trend: {
      status: 'Alta',
      formula: 'Preço > EMA 9 > EMA 30',
      priceAboveEma9: true,
      ema9AboveEma30: true,
      bothSlopingUp: true
    },
    structure: {
      label: 'Pullback',
      description: 'Pullback na EMA 9'
    },
    volatility: {
      atr21: 1.67,
      atrPct: 2.53,
      regime: 'Baixa'
    },
    indicators: {
      ema9: [62.10, 62.80, 63.51],
      ema30: [59.50, 59.90, 60.36],
      atr21: 1.67,
      atrPct: 2.53
    },
    fundamentals: {
      available: true,
      roe: { value: '22,4%', positive: true },
      netMargin: { value: '28,1%', positive: true },
      netDebtToEbitda: { value: '1,2x', positive: true }
    },
    context: {
      title: 'Super Contexto',
      description: 'Ativo em tendência de alta alinhada'
    }
  };

  const ctx = TickerChartModel.buildTradeContext(tickerData);

  assert.equal(ctx.symbol, 'BPAC11');
  assert.equal(ctx.companyName, 'BTG PACTUAL');
  assert.equal(ctx.date, '2026-10-02');
  assert.equal(ctx.timeframe, 'Diário');
  assert.equal(ctx.marketClass, 'Ações');
  assert.equal(ctx.entryPrice, 66.03);
  assert.equal(ctx.stopLoss, 63.06);
  assert.equal(ctx.triggerKey, '123_COMPRA');
  assert.equal(ctx.triggerName, '1-2-3 de Compra');
  assert.equal(ctx.triggerGrade, 'A');
  assert.equal(ctx.relativeStrength.score, 80);
  assert.equal(ctx.relativeStrength.classification, 'Forte');
  assert.equal(ctx.marketCycle.regime, 'healthy');
  assert.equal(ctx.marketCycle.benchmark, 'IBOV');
  assert.equal(ctx.trend.formula, 'Preço > EMA 9 > EMA 30');
  assert.equal(ctx.structure.label, 'Pullback');
  assert.equal(ctx.volatility.atr21, 1.67);
  assert.equal(ctx.volatility.atrPct, 2.53);
  assert.equal(ctx.volatility.regime, 'Baixa');
  assert.equal(ctx.technicals.ema9, 63.51);
  assert.equal(ctx.technicals.ema30, 60.36);
  assert.equal(ctx.context.title, 'Super Contexto');
  assert.equal(ctx.source, 'charts_trigger');
});

test('TradeContext: inferRubricRatingsFromContext deduz notas coerentes para oportunidade de alta qualidade', () => {
  const ctx = {
    symbol: 'BPAC11',
    triggerGrade: 'A',
    trend: { priceAboveEma9: true, ema9AboveEma30: true, formula: 'Preço > EMA 9 > EMA 30' },
    structure: { label: 'Pullback' },
    relativeStrength: { score: 80, classification: 'Forte' },
    marketCycle: { regime: 'healthy' },
    volatility: { atrPct: 2.53, regime: 'Baixa' },
    fundamentals: { available: true, roe: { positive: true }, netMargin: { positive: true }, netDebtToEbitda: { positive: true } }
  };

  const ratings = TickerChartModel.inferRubricRatingsFromContext(ctx);

  assert.equal(ratings.trendQuality, 'good', 'Contexto do ativo diário deve ser bom');
  assert.equal(ratings.marketCycle, 'healthy', 'Ciclo de mercado deve ser saudável');
  assert.equal(ratings.relativeStrength, 'good', 'Força Relativa 80 deve ser boa');
  assert.equal(ratings.setupQuality, 'good', 'Gatilho Grade A deve ser bom');
  assert.equal(ratings.fundamentalScore, 'good', 'Fundamentos fortes devem ser bons');
});

test('TradeContext: inferRubricRatingsFromContext trata ativos em transição ou fraqueza', () => {
  const ctxWeak = {
    symbol: 'VALE3',
    triggerGrade: 'C',
    trend: { priceAboveEma9: false, ema9AboveEma30: false, status: 'Lateral' },
    structure: { label: 'Congestão' },
    relativeStrength: { score: 35, classification: 'Fraco' },
    marketCycle: { regime: 'defensive' },
    volatility: { atrPct: 5.2, regime: 'Moderada' },
    fundamentals: { available: false }
  };

  const ratings = TickerChartModel.inferRubricRatingsFromContext(ctxWeak);

  assert.equal(ratings.trendQuality, 'medium');
  assert.equal(ratings.marketCycle, 'defensive');
  assert.equal(ratings.relativeStrength, 'bad');
  assert.equal(ratings.setupQuality, 'bad');
  assert.equal(ratings.fundamentalScore, 'medium');
});

test('TradeContext: formatTradeThesis gera tese descritiva e completa', () => {
  const ctx = {
    symbol: 'BPAC11',
    companyName: 'BTG PACTUAL',
    timeframe: 'Diário',
    triggerName: '1-2-3 de Compra',
    triggerGrade: 'A',
    entryPrice: 66.03,
    stopLoss: 63.06,
    trend: { formula: 'Preço > EMA 9 > EMA 30' },
    structure: { label: 'Pullback' },
    relativeStrength: { score: 80, classification: 'Forte' },
    marketCycle: { description: 'Positivo', benchmark: 'IBOV' },
    volatility: { atr21: 1.67, atrPct: 2.53, regime: 'Baixa' },
    technicals: { ema9: 63.51, ema30: 60.36 },
    context: { title: 'Super Contexto' }
  };

  const thesis = TickerChartModel.formatTradeThesis(ctx);

  assert.ok(thesis.includes('BPAC11 (BTG PACTUAL)'));
  assert.ok(thesis.includes('Timeframe: Diário'));
  assert.ok(thesis.includes('1-2-3 de Compra (Grade A)'));
  assert.ok(thesis.includes('Entrada sugerida: R$ 66,03'));
  assert.ok(thesis.includes('Stop inicial: R$ 63,06'));
  assert.ok(thesis.includes('Preço > EMA 9 > EMA 30 (Estrutura: Pullback)'));
  assert.ok(thesis.includes('Força Relativa: Forte (80)'));
  assert.ok(thesis.includes('Ciclo de Mercado: Positivo [IBOV]'));
  assert.ok(thesis.includes('ATR 1,67 (2,53%) — Baixa'));
  assert.ok(thesis.includes('EMA 9: 63,51 | EMA 30: 60,36'));
  assert.ok(thesis.includes('Super Contexto'));
});

test('TradeContext: backend normalizePlan preserva tradeContext e timeframe em metadata', () => {
  const planPayload = {
    asset: 'BPAC11',
    market: 'Ações',
    direction: 'long',
    setup: '1-2-3 de Compra',
    setupTrigger: '123_COMPRA',
    entry: 66.03,
    stop: 63.06,
    atr: 1.67,
    executableRiskPct: 0.004,
    grade: 'A',
    rubricScore: 96,
    suggestedQty: 500,
    executedQty: 500,
    entryDate: '2026-10-02',
    timeframe: 'Diário',
    thesis: 'Plano test',
    tradeContext: {
      symbol: 'BPAC11',
      triggerName: '1-2-3 de Compra',
      entryPrice: 66.03,
      stopLoss: 63.06,
      rsScore: 80,
      source: 'charts_trigger'
    },
    rubricResponses: { trendQuality: 2, relativeStrength: 2, setupQuality: 2, fundamentalScore: 2, volatility: 2, marketCycle: 2 }
  };

  const normalized = trades.normalizePlan(planPayload);

  assert.equal(normalized.ticker, 'BPAC11');
  assert.equal(normalized.entry, 66.03);
  assert.equal(normalized.stop, 63.06);
  assert.equal(normalized.metadata.timeframe, 'Diário');
  assert.ok(normalized.metadata.tradeContext, 'metadata.tradeContext deve existir');
  assert.equal(normalized.metadata.tradeContext.symbol, 'BPAC11');
  assert.equal(normalized.metadata.tradeContext.triggerName, '1-2-3 de Compra');
  assert.equal(normalized.metadata.tradeContext.source, 'charts_trigger');
});

test('TradeContext: buildTradeContext resolve classes de ativos especiais (BDR e FII)', () => {
  const bdrData = {
    tickerInfo: { symbol: 'AAPL34', price: 95.50 },
    trigger: { id: 'INSIDE_BAR', name: 'Inside Bar', grade: 'A', hasTrigger: true, entry: 96.00, stop: 94.00 }
  };
  const bdrCtx = TickerChartModel.buildTradeContext(bdrData);
  assert.equal(bdrCtx.marketClass, 'BDR');

  const fiiData = {
    tickerInfo: { symbol: 'HGLG11', price: 165.00, sector: 'Fundos Imobiliários' },
    trigger: { id: '123_COMPRA', name: '1-2-3 de Compra', grade: 'A', hasTrigger: true, entry: 166.00, stop: 163.00 }
  };
  const fiiCtx = TickerChartModel.buildTradeContext(fiiData);
  assert.equal(fiiCtx.marketClass, 'FII');
});
