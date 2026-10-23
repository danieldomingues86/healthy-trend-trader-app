'use strict';

const marketData = require('./market-data');
const tickerChart = require('./ticker-chart');
const OpportunityRadarModel = require('../../frontend/opportunity-radar-model');

async function getOpportunityRadarData(cache) {
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

  const stockCycleState = stockCycleRes?.cycle?.state || cache?.cycle?.state || 'healthy';
  const fiiCycleState = fiiCycleRes?.cycle?.state || 'healthy';
  const bdrCycleState = bdrCycleRes?.cycle?.state || 'healthy';

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
    { market: 'IBOV', cycleState: stockCycleState, list: stockItems },
    { market: 'IFIX', cycleState: fiiCycleState, list: fiiItems },
    { market: 'BDRs', cycleState: bdrCycleState, list: bdrItems }
  ];

  const readyItems = [];
  const seenSymbols = new Set();

  for (const group of groups) {
    // Somente mercados em Ciclo Positivo são elegíveis para o Radar de Oportunidades.
    // Mercados em transição ou defensivos não autorizam novos setups.
    if (!isPositiveCycle(group.cycleState)) {
      continue;
    }

    for (const item of group.list) {
      if (!item || !item.symbol) continue;
      const symbol = String(item.symbol).trim().toUpperCase();
      if (seenSymbols.has(symbol)) continue;
      seenSymbols.add(symbol);

      const candles = b3Histories.get(symbol);
      if (!Array.isArray(candles) || candles.length < 30) continue;

      const enrichedItem = {
        ...item,
        marketCategory: group.market
      };

      const evaluated = OpportunityRadarModel.evaluateAssetReadiness(enrichedItem, candles, group.cycleState);
      if (evaluated) {
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
        const chartCycleRegime = String(chartData?.marketCycle?.regime || '').trim().toLowerCase();
        if (chartCycleRegime && (chartCycleRegime.includes('transi') || chartCycleRegime.includes('defens') || chartCycleRegime === 'riskoff')) {
          readyItem.__excludedByCycle = true;
          return;
        }
        if (chartData?.rubric?.finalGrade) {
          readyItem.grade = chartData.rubric.finalGrade;
          readyItem.rubricScore = chartData.rubric.score;
          readyItem.rubricSummary = chartData.rubric.summaryText;
        }
      } catch {
        // Preserva avaliação padrão em caso de exceção isolada
      }
    })
  );

  const filteredReadyItems = readyItems.filter((i) => !i.__excludedByCycle);

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
    totalReady: filteredReadyItems.length,
    items: filteredReadyItems
  };
}

module.exports = {
  getOpportunityRadarData
};
