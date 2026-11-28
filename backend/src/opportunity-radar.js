'use strict';

const marketData = require('./market-data');
const tickerChart = require('./ticker-chart');
const OpportunityRadarModel = require('../../frontend/opportunity-radar-model');
const MarketCycleModel = require('../../frontend/market-cycle-model');
const LiquidityGateModel = require('../../frontend/liquidity-gate-model');
const VolatilityEngineModel = require('../../frontend/volatility-trading-engine-model');
const bdrInternational = require('./bdr-international');

async function getOpportunityRadarData(cache, options = {}) {
  const strategy = options.strategy ? String(options.strategy).toUpperCase() : 'TREND_FOLLOWING';
  if (!cache || typeof cache !== 'object') {
    return {
      updatedAt: null,
      dataAsOf: null,
      marketCycleState: 'unavailable',
      totalReady: 0,
      items: []
    };
  }

  const [stockCycleRes, fiiCycleRes, bdrCycleRes] = await Promise.all([
    marketData.resolveMarketCycle(cache, 'stock_b3').catch(() => null),
    marketData.resolveMarketCycle(cache, 'fii').catch(() => null),
    marketData.resolveMarketCycle(cache, 'bdr').catch(() => null)
  ]);

  const stockPerm = MarketCycleModel.validateMarketPermissionForBuy({
    ...(stockCycleRes?.cycle || cache?.cycle || {}),
    indexCandles: stockCycleRes?.benchmark?.history || cache?.benchmark?.history,
    benchmarkSymbol: 'IBOV'
  });
  const fiiPerm = MarketCycleModel.validateMarketPermissionForBuy({
    ...(fiiCycleRes?.cycle || cache?.cycles?.fii?.cycle || {}),
    indexCandles: fiiCycleRes?.benchmark?.history || cache?.cycles?.fii?.benchmark?.history,
    benchmarkSymbol: 'IFIX'
  });
  const bdrPerm = MarketCycleModel.validateMarketPermissionForBuy({
    ...(bdrCycleRes?.cycle || cache?.cycles?.bdr?.cycle || {}),
    indexCandles: bdrCycleRes?.benchmark?.history || cache?.cycles?.bdr?.benchmark?.history,
    benchmarkSymbol: 'BDRX'
  });

  const stockCycleState = stockPerm.isPermitted ? 'healthy' : 'defensive';
  const fiiCycleState = fiiPerm.isPermitted ? 'healthy' : 'defensive';
  const bdrCycleState = bdrPerm.isPermitted ? 'healthy' : 'defensive';

  const b3Histories = tickerChart.loadB3History();

  const stockItems = Array.isArray(cache.relativeStrength)
    ? cache.relativeStrength
    : [
        ...(Array.isArray(cache.relativeStrengthByClass?.stock_ibov?.items) ? cache.relativeStrengthByClass.stock_ibov.items : []),
        ...(Array.isArray(cache.relativeStrengthByClass?.stock_other?.items) ? cache.relativeStrengthByClass.stock_other.items : [])
      ];
  const fiiItems = Array.isArray(cache.relativeStrengthByClass?.fii?.items)
    ? cache.relativeStrengthByClass.fii.items
    : [];
  const bdrItems = Array.isArray(cache.relativeStrengthByClass?.bdr?.items)
    ? cache.relativeStrengthByClass.bdr.items
    : [];

  const isPositiveCycle = (state) => {
    const s = String(state || '').trim().toLowerCase();
    return s === 'healthy' || s === 'positive' || s.includes('positivo') || s.includes('expans');
  };

  const groups = [
    { market: 'IBOV', cycleState: stockCycleState, isPermitted: stockPerm.isPermitted, list: stockItems },
    { market: 'IFIX', cycleState: fiiCycleState, isPermitted: fiiPerm.isPermitted, list: fiiItems },
    { market: 'BDRs', cycleState: bdrCycleState, isPermitted: bdrPerm.isPermitted, list: bdrItems }
  ];

  const readyItems = [];
  const seenSymbols = new Set();

  for (const group of groups) {
    // O ciclo de mercado macro orienta o contexto operacional e a exposição ao risco,
    // mas não bloqueia a detecção de oportunidades em ativos líderes com estrutura individual favorável.
    for (const item of group.list) {
      if (!item || !item.symbol) continue;
      const symbol = String(item.symbol).trim().toUpperCase();
      if (seenSymbols.has(symbol)) continue;
      seenSymbols.add(symbol);

      const candles = b3Histories.get(symbol);
      if (!Array.isArray(candles) || candles.length < 30) continue;

      // Salvaguarda mandatória: Liquidity Gate (Hard Gate global)
      let liquidityResult = null;
      if (LiquidityGateModel && typeof LiquidityGateModel.evaluateLiquidity === 'function') {
        const liqCheck = LiquidityGateModel.evaluateLiquidity({
          candles,
          symbol,
          market: group.market
        });
        if (!liqCheck || !liqCheck.isEligible) continue;
        liquidityResult = liqCheck;
      }

      const enrichedItem = {
        ...item,
        marketCategory: group.market,
        liquidity: liquidityResult
      };

      const evaluated = OpportunityRadarModel.evaluateAssetReadiness(enrichedItem, candles, item.marketCycleState || 'healthy');
      if (evaluated) {
        evaluated.macroCycle = group.cycleState;
        if (!evaluated.liquidity && liquidityResult) {
          evaluated.liquidity = liquidityResult;
        }
        if (!evaluated.tradesCount) {
          const lastCandleTrades = Number(candles.at(-1)?.trades ?? candles.at(-1)?.negocios);
          const fallbackTrades = Number(evaluated.liquidity?.metrics?.lastDayTrades ?? evaluated.liquidity?.metrics?.averageDailyTrades ?? item.liquidity?.metrics?.averageDailyTrades);
          const resolvedTrades = Number.isFinite(lastCandleTrades) && lastCandleTrades > 0
            ? Math.round(lastCandleTrades)
            : (Number.isFinite(fallbackTrades) && fallbackTrades > 0 ? Math.round(fallbackTrades) : null);
          evaluated.tradesCount = resolvedTrades;
          evaluated.dailyTrades = resolvedTrades;
        }
        if (!evaluated.tradesCount || evaluated.tradesCount < 500 || (evaluated.dailyTrades && evaluated.dailyTrades < 500)) {
          continue;
        }
        readyItems.push(evaluated);
      }
    }
  }

  readyItems.sort((a, b) => (b.rsScore - a.rsScore) || a.symbol.localeCompare(b.symbol));

  // Sincroniza a Rubric dos ativos prontos com o motor oficial e fundamentos do tickerChart (100% de paridade com a tela Gráficos)
  await Promise.all(
    readyItems.map(async (readyItem) => {
      try {
        const chartData = await tickerChart.getTickerChartData(readyItem.symbol, cache);
        if (chartData?.marketCycle) {
          readyItem.macroCycle = chartData.marketCycle.regime;
          readyItem.macroCycleDesc = chartData.marketCycle.description || '';
        }
        if (chartData?.liquidity) {
          if (!chartData.liquidity.isEligible) {
            readyItem.__excludedByLiquidity = true;
            return;
          }
          readyItem.liquidity = chartData.liquidity;
        }
        if (chartData?.rubric?.finalGrade) {
          readyItem.grade = chartData.rubric.finalGrade;
          readyItem.rubricScore = chartData.rubric.score;
          readyItem.rubricSummary = chartData.rubric.summaryText;
        }
        if (chartData?.tickerInfo?.bdrInfo) {
          readyItem.bdrInfo = chartData.tickerInfo.bdrInfo;
          if (chartData.tickerInfo.bdrInfo.earnings?.isWithinWindow) {
            readyItem.hasUpcomingEarnings = true;
            readyItem.earnings = chartData.tickerInfo.bdrInfo.earnings;
          }
        }
      } catch {
        // Preserva avaliação padrão em caso de exceção isolada
      }
    })
  );

  const filteredReadyItems = readyItems.filter((i) => !i.__excludedByCycle && !i.__excludedByLiquidity);
  filteredReadyItems.forEach(item => { item.strategyType = 'TREND_FOLLOWING'; });

  const volatilityItems = [];
  const oversoldLevel = 10;
  if (true) {
    for (const [symbol, candles] of b3Histories.entries()) {
      if (!Array.isArray(candles) || candles.length < 30) continue;
      const marketCat = OpportunityRadarModel.resolveMarketCategory({ symbol });

      // Salvaguarda mandatória: Liquidity Gate (Hard Gate global)
      let liqCheck = null;
      if (LiquidityGateModel && typeof LiquidityGateModel.evaluateLiquidity === 'function') {
        liqCheck = LiquidityGateModel.evaluateLiquidity({ candles, symbol, market: marketCat });
        if (!liqCheck || !liqCheck.isEligible) continue;
      }

      const closes = candles.map((c) => c.close);
      const ifr2Array = VolatilityEngineModel.calculateRSI(closes, 2, 'WILDER');
      const latestIfr2 = ifr2Array[ifr2Array.length - 1];
      if (!Number.isFinite(latestIfr2)) continue;

      const sma7Array = VolatilityEngineModel.calculateSMA(closes, 7);
      const sma200Array = VolatilityEngineModel.calculateSMA(closes, 200);
      const latestSma7 = sma7Array[sma7Array.length - 1];
      const latestSma200 = sma200Array[sma200Array.length - 1];

      const currentCandle = candles[candles.length - 1];
      const currentPrice = currentCandle.close;
      const lastCandleDate = currentCandle.time;

      const ifr2Val = Number(latestIfr2.toFixed(2));
      const distanceToOversold = Number((latestIfr2 - oversoldLevel).toFixed(2));

      let status = 'SEM OPORTUNIDADE';
      let statusLabel = 'Sem Oportunidade';
      let statusCode = 'NO_OPPORTUNITY';
      let sortPriority = 3;

      if (latestIfr2 <= oversoldLevel) {
        status = 'SOBREVENDA';
        statusLabel = 'Sobrevenda';
        statusCode = 'OVERSOLD';
        sortPriority = 1;
      } else if (latestIfr2 <= 20) {
        status = 'PRÓXIMO DA SOBREVENDA';
        statusLabel = 'Próximo da Sobrevenda';
        statusCode = 'NEAR_OVERSOLD';
        sortPriority = 2;
      }

      const compName = OpportunityRadarModel.cleanCompanyName(symbol);
      const rawTrades = Number(currentCandle?.trades ?? currentCandle?.negocios);
      const fallbackTrades = Number(liqCheck?.metrics?.lastDayTrades ?? liqCheck?.metrics?.averageDailyTrades);
      const tradesCount = Number.isFinite(rawTrades) && rawTrades > 0
        ? Math.round(rawTrades)
        : (Number.isFinite(fallbackTrades) && fallbackTrades > 0 ? Math.round(fallbackTrades) : null);

      if (!tradesCount || tradesCount < 500) {
        continue;
      }

      volatilityItems.push({
        symbol,
        name: compName,
        market: marketCat,
        marketCategory: marketCat,
        strategyType: 'VOLATILITY_TRADING',
        price: currentPrice,
        close: currentPrice,
        ifr2: ifr2Val,
        oversoldLevel,
        distanceToOversold,
        status,
        statusLabel,
        statusCode,
        sortPriority,
        sma7: latestSma7 != null ? Number(latestSma7.toFixed(2)) : null,
        sma200: latestSma200 != null ? Number(latestSma200.toFixed(2)) : null,
        liquidity: liqCheck,
        liquidityApproved: true,
        tradesCount,
        dailyTrades: tradesCount,
        lastCandleDate
      });
    }

    // Ordenação: primeiro ativos em SOBREVENDA (menor IFR2 primeiro), depois PRÓXIMO DA SOBREVENDA, depois SEM OPORTUNIDADE
    volatilityItems.sort((a, b) => {
      if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
      if (a.ifr2 !== b.ifr2) return a.ifr2 - b.ifr2;
      return a.symbol.localeCompare(b.symbol);
    });
  }

  const countOversold = volatilityItems.filter((i) => i.statusCode === 'OVERSOLD').length;
  const countNear = volatilityItems.filter((i) => i.statusCode === 'NEAR_OVERSOLD').length;
  const countNoOpp = volatilityItems.filter((i) => i.statusCode === 'NO_OPPORTUNITY').length;
  const volatilitySummary = {
    oversoldCount: countOversold,
    nearOversoldCount: countNear,
    noOpportunityCount: countNoOpp,
    oversoldLevel: oversoldLevel,
    totalEvaluated: volatilityItems.length,
    updatedAt: cache.updatedAt || cache.historyUpdatedAt || null
  };

  // Somente ativos que cumprem 100% o critério de entrada: SOBREVENDA (IFR 2 <= 10)
  const oversoldOpportunities = volatilityItems.filter((i) => i.statusCode === 'OVERSOLD');

  // Enriquece ativos BDR com dados internacionais e alerta de earnings na janela de 0 a 10 dias corridos
  const allRadarItems = [...filteredReadyItems, ...oversoldOpportunities];
  await Promise.all(
    allRadarItems.map(async (item) => {
      if (!item || !item.symbol || item.bdrInfo) return;
      if (bdrInternational.isBdr(item.symbol)) {
        try {
          const bdrInfo = await bdrInternational.getBdrIntegrationData(item.symbol, {
            referenceDate: item.lastCandleDate || new Date().toISOString().slice(0, 10)
          });
          if (bdrInfo && bdrInfo.isBdr) {
            item.bdrInfo = bdrInfo;
            if (bdrInfo.earnings?.isWithinWindow) {
              item.hasUpcomingEarnings = true;
              item.earnings = bdrInfo.earnings;
            }
          }
        } catch {
          // Silencioso e resiliente
        }
      }
    })
  );

  let finalItems = filteredReadyItems;
  if (strategy === 'VOLATILITY_TRADING' || strategy === 'VOLATILITY') {
    finalItems = oversoldOpportunities;
  } else if (strategy === 'ALL') {
    finalItems = [...filteredReadyItems, ...oversoldOpportunities];
  }

  const latestCandleDates = filteredReadyItems.map((i) => i.lastCandleDate).filter(Boolean).sort();
  const dataAsOf = latestCandleDates.at(-1)
    || cache.dataAsOf
    || cache.b3CotahistDate
    || cache.relativeStrengthByClass?.dataAsOf
    || null;

  const allIsPositive = [stockCycleState, fiiCycleState, bdrCycleState].some(s => isPositiveCycle(s));
  const allCycleState = allIsPositive ? 'healthy' : 'defensive';
  const allScore = Math.max(
    isPositiveCycle(stockCycleState) ? (stockCycleRes?.cycle?.score || 0) : 0,
    isPositiveCycle(fiiCycleState) ? (fiiCycleRes?.cycle?.score || 0) : 0,
    isPositiveCycle(bdrCycleState) ? (bdrCycleRes?.cycle?.score || 0) : 0
  ) || (allIsPositive ? 70 : 30);

  const stockScore = Number.isFinite(Number(stockCycleRes?.cycle?.score)) ? Number(stockCycleRes.cycle.score) : (isPositiveCycle(stockCycleState) ? 75 : 33);
  const fiiScore = Number.isFinite(Number(fiiCycleRes?.cycle?.score)) ? Number(fiiCycleRes.cycle.score) : (isPositiveCycle(fiiCycleState) ? 87 : 33);
  const bdrScore = Number.isFinite(Number(bdrCycleRes?.cycle?.score)) ? Number(bdrCycleRes.cycle.score) : (isPositiveCycle(bdrCycleState) ? 75 : 22);

  return {
    updatedAt: cache.updatedAt || cache.historyUpdatedAt || null,
    dataAsOf,
    marketCycleState: stockCycleState,
    marketCycles: {
      ALL: {
        state: allCycleState,
        score: allScore,
        marketId: isPositiveCycle(stockCycleState) ? 'stock_b3' : (isPositiveCycle(fiiCycleState) ? 'fii' : 'bdr'),
        name: 'Todos os Mercados'
      },
      IBOV: {
        state: stockCycleState,
        score: stockScore,
        marketId: 'stock_b3',
        name: 'Ações B3 (IBOV)'
      },
      IFIX: {
        state: fiiCycleState,
        score: fiiScore,
        marketId: 'fii',
        name: 'FIIs (IFIX)'
      },
      BDRs: {
        state: bdrCycleState,
        score: bdrScore,
        marketId: 'bdr',
        name: 'BDRs (BDRX)'
      },
      stock_b3: {
        state: stockCycleState,
        score: stockScore,
        marketId: 'stock_b3',
        name: 'Ações B3 (IBOV)'
      },
      fii: {
        state: fiiCycleState,
        score: fiiScore,
        marketId: 'fii',
        name: 'FIIs (IFIX)'
      },
      bdr: {
        state: bdrCycleState,
        score: bdrScore,
        marketId: 'bdr',
        name: 'BDRs (BDRX)'
      }
    },
    totalReady: finalItems.length,
    items: finalItems,
    trendItems: filteredReadyItems,
    volatilityItems: oversoldOpportunities,
    volatilitySummary
  };
}

module.exports = {
  getOpportunityRadarData
};
