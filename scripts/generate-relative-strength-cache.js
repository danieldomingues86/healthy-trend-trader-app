const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const b3CachePath = path.join(root, 'backend', 'data', 'market-cache.json');
const nasdaqCachePath = path.join(root, 'backend', 'data', 'nasdaq-market-cache.json');
const outputPath = path.join(root, 'frontend', 'relative-strength-data-cache.js');

const b3 = JSON.parse(fs.readFileSync(b3CachePath, 'utf8'));
const nq = JSON.parse(fs.readFileSync(nasdaqCachePath, 'utf8'));

function cleanItem(item) {
  const obj = {
    symbol: item.symbol,
    name: item.name || item.companyName || item.symbol,
    sector: item.sector || '',
    m1: item.m1,
    m3: item.m3,
    score: item.score ?? item.rsScore ?? 0
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
      items: (b3.relativeStrengthByClassWeekly?.stock_ibov?.items || []).map(cleanItem)
    },
    stock_other: {
      key: 'stock_other',
      label: 'Demais ações',
      benchmark: 'SMLL + B3',
      items: (b3.relativeStrengthByClassWeekly?.stock_other?.items || []).map(cleanItem)
    },
    fii: {
      key: 'fii',
      label: 'FIIs',
      benchmark: 'IFIX',
      items: (b3.relativeStrengthByClassWeekly?.fii?.items || []).map(cleanItem)
    },
    bdr: {
      key: 'bdr',
      label: 'BDRs',
      benchmark: 'Universo BDR',
      items: (b3.relativeStrengthByClassWeekly?.bdr?.items || []).map(cleanItem)
    }
  },
  nasdaq: {
    daily: {
      displayDate: nq.displayDate || '07/10/2026',
      baseDate: nq.baseDate,
      source: 'Twelve Data',
      ranking: (nq.ranking || []).map(cleanItem)
    },
    weekly: {
      displayDate: nq.weekly?.displayDate || '07/10/2026',
      baseDate: nq.weekly?.baseDate,
      source: 'Twelve Data (Semanal)',
      ranking: (nq.weekly?.ranking || []).map(cleanItem)
    }
  }
};

const code = `/* ==========================================================================
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

fs.writeFileSync(outputPath, code, 'utf8');
console.log('Cache generated successfully at:', outputPath);
console.log('Daily B3 counts: stock_ibov=' + staticCache.daily.stock_ibov.items.length + ', stock_other=' + staticCache.daily.stock_other.items.length + ', fii=' + staticCache.daily.fii.items.length + ', bdr=' + staticCache.daily.bdr.items.length);
console.log('Weekly B3 counts: stock_ibov=' + staticCache.weekly.stock_ibov.items.length + ', stock_other=' + staticCache.weekly.stock_other.items.length + ', fii=' + staticCache.weekly.fii.items.length + ', bdr=' + staticCache.weekly.bdr.items.length);
console.log('Nasdaq counts: daily=' + staticCache.nasdaq.daily.ranking.length + ', weekly=' + staticCache.nasdaq.weekly.ranking.length);
