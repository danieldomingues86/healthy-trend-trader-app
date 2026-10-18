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

  const groups = [
    { market: 'IBOV', cycleState: stockCycleState, list: stockItems },
    { market: 'IFIX', cycleState: fiiCycleState, list: fiiItems },
    { market: 'BDRs', cycleState: bdrCycleState, list: bdrItems }
  ];

  const readyItems = [];
  const seenSymbols = new Set();

  for (const group of groups) {
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

  const latestCandleDates = readyItems.map((i) => i.lastCandleDate).filter(Boolean).sort();
  const dataAsOf = latestCandleDates.at(-1)
    || cache.overview?.benchmarkHistory?.at(-1)?.date
    || null;

  return {
    updatedAt: cache.updatedAt || cache.historyUpdatedAt || null,
    dataAsOf,
    marketCycleState: stockCycleState,
    totalReady: readyItems.length,
    items: readyItems
  };
}

module.exports = {
  getOpportunityRadarData
};
