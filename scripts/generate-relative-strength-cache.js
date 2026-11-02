const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const b3CachePath = path.join(root, 'backend', 'data', 'market-cache.json');
const nasdaqCachePath = path.join(root, 'backend', 'data', 'nasdaq-market-cache.json');
const resilienceCachePath = path.join(root, 'backend', 'data', 'resilience-12m-cache.json');
const outputPath = path.join(root, 'frontend', 'relative-strength-data-cache.js');

const b3 = JSON.parse(fs.readFileSync(b3CachePath, 'utf8'));
const nq = JSON.parse(fs.readFileSync(nasdaqCachePath, 'utf8'));
const resilienceMap = fs.existsSync(resilienceCachePath)
  ? JSON.parse(fs.readFileSync(resilienceCachePath, 'utf8'))
  : {};

function cleanItem(item) {
  const res = resilienceMap[item.symbol] || null;
  const obj = {
    symbol: item.symbol,
    name: item.name || item.companyName || item.symbol,
    sector: item.sector || '',
    m1: item.m1,
    m3: item.m3,
    score: item.score ?? item.rsScore ?? 0,
    resilience12m: res ? {
      score: res.score,
      label: res.label,
      badgeColor: res.badgeColor,
      outperformance: res.outperformance,
      beatRate: res.beatRate,
      avgAssetDrop: res.avgAssetDrop,
      avgBenchDrop: res.avgBenchDrop,
      marketDownDays: res.marketDownDays,
      beatCount: res.beatCount,
      upCount: res.upCount,
      matchedDays: res.matchedDays,
      benchmark: res.benchmark,
      interpretation: res.interpretation
    } : null
  };
  if (item.weeklyTrend && item.weeklyTrend.state) {
    obj.weeklyTrend = { state: item.weeklyTrend.state };
  } else if (item.trendState) {
    obj.trendState = item.trendState;
  }
  if (item.benchmark) obj.benchmark = item.benchmark;
  if (item.rank) obj.rank = item.rank;
  return obj;
}

const staticCache = {
  updatedAt: b3.updatedAt || '2026-10-12T11:58:34.473Z',
  dataAsOf: b3.dataAsOf || '2026-10-07',
  source: 'B3 (COTAHIST)',
  daily: {
    stock_ibov: {
      key: 'stock_ibov',
      label: 'Ações Ibovespa',
      benchmark: 'IBOV',
      items: (b3.relativeStrengthByClass?.stock_ibov?.items || []).map(cleanItem)
    },
    stock_other: {
      key: 'stock_other',
      label: 'Demais ações',
      benchmark: 'SMLL + B3',
      items: (b3.relativeStrengthByClass?.stock_other?.items || []).map(cleanItem)
    },
    fii: {
      key: 'fii',
      label: 'FIIs',
      benchmark: 'IFIX',
      items: (b3.relativeStrengthByClass?.fii?.items || []).map(cleanItem)
    },
    bdr: {
      key: 'bdr',
      label: 'BDRs',
      benchmark: 'Universo BDR',
      items: (b3.relativeStrengthByClass?.bdr?.items || []).map(cleanItem)
    }
  },
  weekly: {
    stock_ibov: {
      key: 'stock_ibov',
      label: 'Ações Ibovespa',
      benchmark: 'IBOV',
      items: (b3.relativeStrengthByClassWeekly?.stock_ibov?.items || b3.relativeStrengthByClass?.stock_ibov?.items || []).map(cleanItem)
    },
    stock_other: {
      key: 'stock_other',
      label: 'Demais ações',
      benchmark: 'SMLL + B3',
      items: (b3.relativeStrengthByClassWeekly?.stock_other?.items || b3.relativeStrengthByClass?.stock_other?.items || []).map(cleanItem)
    },
    fii: {
      key: 'fii',
      label: 'FIIs',
      benchmark: 'IFIX',
      items: (b3.relativeStrengthByClassWeekly?.fii?.items || b3.relativeStrengthByClass?.fii?.items || []).map(cleanItem)
    },
    bdr: {
      key: 'bdr',
      label: 'BDRs',
      benchmark: 'Universo BDR',
      items: (b3.relativeStrengthByClassWeekly?.bdr?.items || b3.relativeStrengthByClass?.bdr?.items || []).map(cleanItem)
    }
  },
  nasdaq: {
    daily: {
      source: 'Twelve Data',
      baseDate: nq.baseDate || '2026-10-07',
      displayDate: nq.displayDate || '07/10/2026',
      ranking: (nq.ranking || []).map(cleanItem)
    },
    weekly: {
      source: 'Twelve Data (Semanal)',
      baseDate: nq.baseDate || '2026-10-07',
      displayDate: nq.displayDate || '07/10/2026',
      ranking: (nq.weeklyRanking || nq.ranking || []).map(cleanItem)
    }
  }
};

const fileContent = `/* ==========================================================================
   Healthy Trend Trader — Cache de Dados de Força Relativa (B3 e Nasdaq)
   Gerado automaticamente a partir do último fechamento em market-cache.json
   Garante disponibilidade instantânea dos dados reais mesmo em modo offline.
   ========================================================================== */
(function() {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const staticCache = ${JSON.stringify(staticCache, null, 2)};
  root.__relativeStrengthStaticCache = staticCache;

  // Hidratação imediata do estado global para inicialização instantânea
  if (!root.relativeStrengthClassesState) {
    root.relativeStrengthClassesState = {
      selected: 'stock_ibov',
      classes: staticCache.daily,
      dailyClasses: staticCache.daily,
      weeklyClasses: staticCache.weekly,
      updatedAt: staticCache.updatedAt,
      dataAsOf: staticCache.dataAsOf,
      source: staticCache.source,
      loading: false,
      error: false
    };
  } else {
    root.relativeStrengthClassesState.dailyClasses = root.relativeStrengthClassesState.dailyClasses || staticCache.daily;
    root.relativeStrengthClassesState.weeklyClasses = root.relativeStrengthClassesState.weeklyClasses || staticCache.weekly;
    if (!root.relativeStrengthClassesState.classes || !root.relativeStrengthClassesState.classes.stock_ibov) {
      root.relativeStrengthClassesState.classes = staticCache.daily;
    }
    if (!root.relativeStrengthClassesState.selected || root.relativeStrengthClassesState.selected === 'stock') {
      root.relativeStrengthClassesState.selected = 'stock_ibov';
    }
  }

  // Hidratação do cache do Nasdaq
  root.__nasdaqRelativeStrengthCache_daily = staticCache.nasdaq.daily;
  root.__nasdaqRelativeStrengthCache_weekly = staticCache.nasdaq.weekly;
  if (!root.__nasdaqRelativeStrengthCache) {
    root.__nasdaqRelativeStrengthCache = staticCache.nasdaq.daily;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = staticCache;
  }
})();
`;

fs.writeFileSync(outputPath, fileContent, 'utf8');
console.log('Successfully generated frontend/relative-strength-data-cache.js with Resilience 12M!');
