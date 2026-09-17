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
  window.loadRelativeStrengthClasses = async function loadRelativeStrengthClassesFresh() {
    const state = window.relativeStrengthClassesState;
    state.loading = true;
    window.renderRelativeStrengthClassesPage();
    try {
      const response = await fetch(`${window.MARKET_DATA_API_URL || 'http://localhost:8787/api'}/relative-strength/classes`, {cache:'no-store'});
      if (!response.ok) throw new Error('Classes indisponíveis');
      const payload = await response.json();
      const source = payload.classes || {};
      // O endpoint mantém a chave legada "stock" por compatibilidade e também
      // entrega os dois universos corretos: Ibovespa e demais ações.
      const stockIbov = source.stock_ibov?.items?.length ? source.stock_ibov : (source.stock?.items?.length ? {...source.stock,key:'stock_ibov',items:source.stock.items.map(item=>({...item,assetClass:'stock_ibov'}))} : fallback);
      state.classes = {...source, stock:source.stock?.items?.length ? source.stock : stockIbov, stock_ibov:stockIbov, stock_other:source.stock_other || {key:'stock_other',items:[],available:0}};
      state.updatedAt = payload.updatedAt || null;
      state.dataAsOf = payload.dataAsOf || null;
      state.source = payload.source || null;
      state.error = false;
    } catch (error) {
      // Um erro temporário nunca apaga os universos já carregados no cliente.
      state.classes = {...state.classes, stock:state.classes.stock?.items?.length ? state.classes.stock : fallback, stock_ibov:state.classes.stock_ibov?.items?.length ? state.classes.stock_ibov : fallback};
      state.error = true;
      console.info('Cache de Força Relativa temporariamente indisponível.', error);
    } finally {
      state.loading = false;
      if (!state.classes[state.selected]?.items?.length && state.classes.stock_ibov?.items?.length) state.selected = 'stock_ibov';
      window.renderRelativeStrengthClassesPage();
    }
  };
  // Carrega novamente sem cache do navegador depois que todos os aprimoramentos
  // de apresentação já foram registrados.
  window.loadRelativeStrengthClasses();
})();
