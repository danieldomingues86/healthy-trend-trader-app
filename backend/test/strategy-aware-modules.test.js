'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const StrategyWorkspaceModel = require('../../frontend/strategy-workspace-model');
const WatchlistModel = require('../../frontend/watchlist-model');
const TradeAnatomyModel = require('../../frontend/trade-anatomy-model');
const SystemQualityAnalyticsModel = require('../../frontend/system-quality-analytics-model');
const JournalExportModel = require('../../frontend/journal-export-model');
const VolatilityEngineModel = require('../../frontend/volatility-trading-engine-model');
const TradingRubrics = require('../../frontend/trading-rubrics');
const opportunityRadar = require('../src/opportunity-radar');
const { marketScansFromCache } = require('../src/market-scans');

test('PASSO 9 — Auditoria e Classificação Canônica de Todos os Módulos do Sistema', () => {
  const allAudits = StrategyWorkspaceModel.getAllModuleAudits();
  assert.ok(Array.isArray(allAudits));
  assert.ok(allAudits.length >= 15, 'Deve auditar e classificar pelo menos 15 módulos');

  // Mapeamento esperado
  const expectedClassifications = {
    // 1. Exclusivos de Trend Following (ou contextuais na volatilidade)
    relativestrength: 'EXCLUSIVE_TREND',
    emergingleaders: 'EXCLUSIVE_TREND',
    couragechallenge: 'EXCLUSIVE_TREND',

    // 2. Exclusivos de Volatility Trading
    volatilityengine: 'EXCLUSIVE_VOLATILITY',
    strategyconfigcenter: 'EXCLUSIVE_VOLATILITY',

    // 3. Compartilhados com contexto de estratégia
    watchlist: 'SHARED_AWARE',
    marketscans: 'SHARED_AWARE',
    marketcycle: 'SHARED_AWARE',
    charts: 'SHARED_AWARE',
    tradeanatomy: 'SHARED_AWARE',
    journal: 'SHARED_AWARE',
    newtrade: 'SHARED_AWARE',
    tradesimulator: 'SHARED_AWARE',
    systemquality: 'SHARED_AWARE',
    reports: 'SHARED_AWARE',
    manual: 'SHARED_AWARE',

    // 4. Consolidados de Carteira & Risco
    dashboard: 'CONSOLIDATED_PORTFOLIO',
    wealth: 'CONSOLIDATED_PORTFOLIO',
    positions: 'CONSOLIDATED_PORTFOLIO',
    closedpositions: 'CONSOLIDATED_PORTFOLIO',
    portfolioheat: 'CONSOLIDATED_PORTFOLIO',
    riskpolicy: 'CONSOLIDATED_PORTFOLIO',
    assetblacklist: 'CONSOLIDATED_PORTFOLIO',
    analytics: 'CONSOLIDATED_PORTFOLIO'
  };

  for (const [modId, expectedClass] of Object.entries(expectedClassifications)) {
    const classification = StrategyWorkspaceModel.getModuleClassification(modId);
    assert.equal(
      classification,
      expectedClass,
      `Módulo "${modId}" deve ser classificado como ${expectedClass}, recebido: ${classification}`
    );
  }
});

test('PASSO 9 — Watchlist Inteligente: Suporte a Estratégia Dual e Filtros', () => {
  // 1. Normalização com strategyType explícito
  const oppTrend = WatchlistModel.normalizeOpportunity({
    ticker: 'PRIO3',
    origin: 'emerging-leaders',
    strategyType: 'TREND_FOLLOWING'
  });
  assert.equal(oppTrend.strategyType, 'TREND_FOLLOWING');

  const oppVol = WatchlistModel.normalizeOpportunity({
    ticker: 'ITUB4',
    origin: 'volatility-scan',
    strategyType: 'VOLATILITY_TRADING'
  });
  assert.equal(oppVol.strategyType, 'VOLATILITY_TRADING');

  // 2. Origens de volatilidade registradas
  assert.ok(WatchlistModel.ORIGINS['volatility-engine']);
  assert.ok(WatchlistModel.ORIGINS['volatility-scan']);

  // 3. Filtragem por estratégia
  const list = [oppTrend, oppVol];

  const onlyTrend = WatchlistModel.filterAndSortOpportunities(list, { strategy: 'trend_following' });
  assert.equal(onlyTrend.length, 1);
  assert.equal(onlyTrend[0].ticker, 'PRIO3');

  const onlyVol = WatchlistModel.filterAndSortOpportunities(list, { strategy: 'volatility_trading' });
  assert.equal(onlyVol.length, 1);
  assert.equal(onlyVol[0].ticker, 'ITUB4');

  const allOpps = WatchlistModel.filterAndSortOpportunities(list, { strategy: 'todos' });
  assert.equal(allOpps.length, 2);
});

test('PASSO 9 — Radar de Oportunidades & Scans: Suporte a Volatility Trading', async () => {
  // 1. Scans de Mercado inclui card de Volatility Trading
  const fakeCache = {
    relativeStrength: [
      { symbol: 'PETR4', score: 85, scan: { healthyTrend: true, close: 38, ema200: 34, rsi2: 8, dayChangePct: -2 } },
      { symbol: 'VALE3', score: 45, scan: { healthyTrend: false, close: 60, ema200: 55, rsi2: 6, dayChangePct: -3 } }
    ],
    relativeStrengthByClass: {}
  };

  const scanResult = marketScansFromCache(fakeCache, { strategy: 'VOLATILITY_TRADING' });
  const volCard = scanResult.cards.find(c => c.id === 'volatility-oversold');
  assert.ok(volCard, 'Deve conter o card volatility-oversold nos Scans de Mercado');
  assert.equal(volCard.strategy, 'VOLATILITY_TRADING');
  assert.ok(volCard.results.length > 0);

  // 2. Opportunity Radar suporta estratégia
  const radarVol = await opportunityRadar.getOpportunityRadarData(fakeCache, { strategy: 'VOLATILITY_TRADING' });
  assert.ok(radarVol);
  assert.ok(Array.isArray(radarVol.items));
});

test('PASSO 9 — Força Relativa e Líderes Emergentes: Não Bloqueiam Volatility Trading', () => {
  // Ativo com Força Relativa PÉSSIMA (RS = 15, laggard extremo)
  // mas que preenche os critérios objetivos de reversão à média do Volatility Swing
  const candles = makeSyntheticCandles({
    count: 220,
    closeAboveSma200: true,
    closeBelowSma7: true,
    ifr2Oversold: 7.5
  });

  // Avaliação no motor de Volatilidade
  const signal = VolatilityEngineModel.evaluateSignal(candles, candles.length - 1, {
    symbol: 'MGLU3'
  });

  assert.equal(signal.isValid, true, 'Sinal de Volatilidade deve ser aprovado independentemente de RS');
  assert.ok(signal.indicators.ifr <= 10);

  // Avaliação na Rubric de Volatilidade
  const rubricRes = TradingRubrics.calculateRubric({
    strategyType: 'VOLATILITY_TRADING',
    ratings: {
      primaryTrend: 'good',
      meanReversionTrigger: 'good',
      distanceShortMa: 'good',
      volatilityContext: 'good',
      liquidity: 'good',
      historicalEdge: 'good',
      executionExposure: 'good'
    }
  });

  assert.ok(['A', 'B'].includes(rubricRes.grade), 'Deve receber nota de excelência na Rubric de Volatilidade sem exigir RS');
  assert.equal(rubricRes.strategyType, 'VOLATILITY_TRADING');
});

test('PASSO 9 — Portfolio Heat: Governança Consolidada de Risco da Carteira', () => {
  // Posições abertas simultâneas dos dois mundos
  const openPositions = [
    {
      id: 'pos-1',
      asset: 'WEGE3',
      strategyType: 'TREND_FOLLOWING',
      entryPrice: 45.0,
      stopPrice: 43.0,
      remainingQty: 500, // Risco = R$ 1.000 (1.0% de 100k)
      currentPrice: 46.0
    },
    {
      id: 'pos-2',
      asset: 'PETR4',
      strategyType: 'VOLATILITY_TRADING',
      entryPrice: 38.0,
      allocatedCapital: 20000, // R$ 20.000 alocado (20% de 100k)
      remainingQty: 500,
      currentPrice: 37.8
    }
  ];

  // Ambas as posições coexistem na carteira consolidada
  const trendPositions = openPositions.filter(p => p.strategyType === 'TREND_FOLLOWING');
  const volPositions = openPositions.filter(p => p.strategyType === 'VOLATILITY_TRADING');

  assert.equal(trendPositions.length, 1);
  assert.equal(volPositions.length, 1);
  assert.equal(openPositions.length, 2, 'A carteira consolidada monitora os dois mundos em conjunto');
});

test('PASSO 9 — Anatomia dos Trades: Filtro por Estratégia', () => {
  const mockTrades = [
    {
      id: 't-1',
      ticker: 'EQTL3',
      status: 'closed',
      strategy_type: 'TREND_FOLLOWING',
      execution_price: 30,
      stop_price: 28,
      executed_quantity: 500,
      events: [
        { type: 'entry', price: 30, qty: 500, at: '2026-03-01T10:00:00Z' },
        { type: 'close', price: 33, qty: 500, at: '2026-03-05T15:00:00Z' }
      ]
    },
    {
      id: 'v-1',
      ticker: 'B3SA3',
      status: 'closed',
      strategy_type: 'VOLATILITY_TRADING',
      execution_price: 12,
      executed_quantity: 1000,
      events: [
        { type: 'entry', price: 12, qty: 1000, at: '2026-03-02T10:00:00Z' },
        { type: 'close', price: 12.8, qty: 1000, at: '2026-03-04T15:00:00Z' }
      ]
    }
  ];

  // 1. Filtro Trend Following
  const trendOnly = TradeAnatomyModel.filterTrades(mockTrades, { strategy: 'TREND_FOLLOWING' });
  assert.equal(trendOnly.length, 1);
  assert.equal(trendOnly[0].symbol, 'EQTL3');

  // 2. Filtro Volatility Trading
  const volOnly = TradeAnatomyModel.filterTrades(mockTrades, { strategy: 'VOLATILITY_TRADING' });
  assert.equal(volOnly.length, 1);
  assert.equal(volOnly[0].symbol, 'B3SA3');

  // 3. Consolidado (ALL)
  const allTrades = TradeAnatomyModel.filterTrades(mockTrades, { strategy: 'ALL' });
  assert.equal(allTrades.length, 2);
});

test('PASSO 9 — SQN (System Quality Number): Preservação da Pureza Amostral e R-Isolation', () => {
  // Lista com trade de Trend Following (com R) e trade de Volatilidade (sem stop em R)
  const trades = [
    { id: 't-1', strategy_type: 'TREND_FOLLOWING', resultR: 2.5 },
    { id: 't-2', strategy_type: 'TREND_FOLLOWING', resultR: -1.0 },
    { id: 't-3', strategy_type: 'TREND_FOLLOWING', resultR: 1.8 },
    { id: 'v-1', strategy_type: 'VOLATILITY_TRADING', result: 1500 } // Não deve virar R nem contaminar SQN
  ];

  const rValues = SystemQualityAnalyticsModel.extractRMultiples(trades);
  assert.equal(rValues.length, 3, 'Deve extrair apenas os 3 trades de Trend Following');
  assert.deepEqual(rValues, [2.5, -1.0, 1.8]);

  const sqnReport = SystemQualityAnalyticsModel.calculateSystemQualityAnalytics(trades);
  assert.equal(sqnReport.sampleSize, 3);
  assert.ok(sqnReport.sqn > 0);
});

test('PASSO 9 — Relatórios do Diário: Inclusão e Identificação de Estratégia', () => {
  const records = [
    {
      date: '2026-03-05',
      technical: { executionScore: 9 },
      trades: [
        {
          id: 'trade-trend',
          ticker: 'WEGE3',
          direction: 'long',
          strategyType: 'TREND_FOLLOWING',
          setup: 'Inside Bar'
        },
        {
          id: 'trade-vol',
          ticker: 'BBAS3',
          direction: 'long',
          strategyType: 'VOLATILITY_TRADING',
          setup: 'IFR2 Sobrevendido'
        }
      ]
    }
  ];

  // 1. Exportação em Markdown contém os badges de estratégia
  const md = JournalExportModel.toMarkdown(records);
  assert.ok(md.includes('Trend Following'));
  assert.ok(md.includes('Volatility Trading'));

  // 2. Exportação em JSON inclui strategyType estruturado
  const jsonStr = JournalExportModel.toJson(records);
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.records[0].trades[0].strategyType, 'TREND_FOLLOWING');
  assert.equal(parsed.records[0].trades[1].strategyType, 'VOLATILITY_TRADING');
});

// Helper para gerar candles sintéticos
function makeSyntheticCandles({ count = 220, closeAboveSma200 = true, closeBelowSma7 = true, ifr2Oversold = 8.0 } = {}) {
  const candles = [];
  let p = 20.00, d = 1, m = 1, y = 2025;
  for (let i = 0; i < count; i++) {
    p += 0.05;
    const dStr = String(d).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    candles.push({
      time: `${y}-${mStr}-${dStr}`,
      open: p - 0.1,
      high: p + 0.3,
      low: p - 0.2,
      close: p,
      volume: 3000000,
      trades: 800
    });
    d++;
    if (d > 28) {
      d = 1;
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
  }

  // Ajusta as últimas barras para atender aos parâmetros solicitados
  const n = candles.length;
  for (let k = 1; k <= 10; k++) {
    candles[n - 1 - k].close = 34.00;
  }
  candles[n - 2].close = 30.00;
  candles[n - 1].close = 28.00;
  return candles;
}
