(() => {
  'use strict';
  if (!window.relativeStrengthClassesState || typeof window.renderRelativeStrengthClassesPage !== 'function') return;

  const fallback = typeof window.relativeStockFallback === 'function' ? window.relativeStockFallback() : {key:'stock_ibov',items:[]};
  const formatDate = value => {
    const raw = String(value || '');
    const date = /^\d{8}$/.test(raw) ? new Date(`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}T12:00:00Z`) : new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(window.appLanguage === 'en-US' ? 'en-US' : 'pt-BR',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
  };
  window.relativeStrengthDataLabel = (closingDate, source) => {
    const provider = String(source || 'B3').startsWith('b3-') ? 'B3' : source || 'B3';
    const closing = formatDate(closingDate);
    const refreshed = formatDate(window.relativeStrengthClassesState?.updatedAt || window.marketDataUpdatedAt);
    if (!closing) return window.cycleText?.(`Atualização indisponível · Fonte: ${provider}`,`Update unavailable · Source: ${provider}`) || `Atualização indisponível · Fonte: ${provider}`;
    const pt = `${refreshed ? `Atualizado em ${refreshed} · ` : ''}Último fechamento: ${closing} · Fonte: ${provider}`;
    const en = `${refreshed ? `Updated ${refreshed} · ` : ''}Latest close: ${closing} · Source: ${provider}`;
    return window.cycleText?.(pt,en) || pt;
  };
  window.loadRelativeStrengthClasses = async function loadRelativeStrengthClassesFresh(force = true) {
    if (typeof window.loadRelativeStrengthClassesForTimeframe === 'function') {
      return window.loadRelativeStrengthClassesForTimeframe(window.currentRelativeStrengthTimeframe || 'daily', force);
    }
    const state = window.relativeStrengthClassesState;
    if (!state.classes[state.selected]?.items?.length) {
      state.loading = true;
      window.renderRelativeStrengthClassesPage();
    }
    const isWeekly = (window.currentRelativeStrengthTimeframe === 'weekly');
    try {
      const response = await fetch(`${window.MARKET_DATA_API_URL || 'http://localhost:8787/api'}/relative-strength/classes${isWeekly ? '?timeframe=weekly' : ''}`, {cache:'no-store'});
      if (!response.ok) throw new Error('Classes indisponíveis');
      const payload = await response.json();
      const source = payload.classes || {};
      const stockIbov = source.stock_ibov?.items?.length ? source.stock_ibov : (source.stock?.items?.length ? {...source.stock,key:'stock_ibov',items:source.stock.items.map(item=>({...item,assetClass:'stock_ibov'}))} : fallback);
      const unifiedClasses = {...source, stock:source.stock?.items?.length ? source.stock : stockIbov, stock_ibov:stockIbov, stock_other:source.stock_other || {key:'stock_other',items:[],available:0}};
      state.classes = unifiedClasses;
      if (isWeekly) {
        state.weeklyClasses = unifiedClasses;
        state.weeklyDataAsOf = payload.dataAsOf;
        state.weeklyFresh = true;
      } else {
        state.dailyClasses = unifiedClasses;
        state.dailyDataAsOf = payload.dataAsOf;
        state.dailyFresh = true;
      }
      state.updatedAt = payload.updatedAt || null;
      state.dataAsOf = payload.dataAsOf || null;
      state.source = payload.source || null;
      state.error = false;
      state.offlineFallback = false;
    } catch (error) {
      const staticCache = window.__relativeStrengthStaticCache;
      const staticClasses = (isWeekly ? staticCache?.weekly : staticCache?.daily) || {};
      const stockIbov = state.classes.stock_ibov?.items?.length ? state.classes.stock_ibov : (staticClasses.stock_ibov || fallback);
      const fallbackClasses = {
        ...staticClasses,
        ...state.classes,
        stock: state.classes.stock?.items?.length ? state.classes.stock : stockIbov,
        stock_ibov: stockIbov,
        stock_other: state.classes.stock_other?.items?.length ? state.classes.stock_other : (staticClasses.stock_other || { key: 'stock_other', items: [] }),
        fii: state.classes.fii?.items?.length ? state.classes.fii : (staticClasses.fii || { key: 'fii', items: [] }),
        bdr: state.classes.bdr?.items?.length ? state.classes.bdr : (staticClasses.bdr || { key: 'bdr', items: [] })
      };
      state.classes = fallbackClasses;
      if (isWeekly) {
        state.weeklyClasses = state.weeklyClasses || fallbackClasses;
        state.weeklyFresh = false;
      } else {
        state.dailyClasses = state.dailyClasses || fallbackClasses;
        state.dailyFresh = false;
      }
      state.error = true;
      state.offlineFallback = true;
      console.info('Cache de Força Relativa ativo (modo offline/resiliente).');
    } finally {
      state.loading = false;
      if (!state.classes[state.selected]?.items?.length && state.classes.stock_ibov?.items?.length) state.selected = 'stock_ibov';
      window.renderRelativeStrengthClassesPage();
    }
  };
  // Carrega novamente sem cache do navegador depois que todos os aprimoramentos
  // de apresentação já foram registrados.
  window.loadRelativeStrengthClasses(true);
})();
