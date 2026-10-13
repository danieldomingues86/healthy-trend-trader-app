/**
 * CENTRAL DE MERCADO — DOMAIN & LOGIC MODEL
 * Healthy Trend Trader
 *
 * Filosofia: "Contexto para decidir. Não informação para distrair."
 * Fornece normalização de dados, cálculos de amplitude, gestão de eventos
 * macroeconômicos e catálogo de reações ao mercado (Playbook de Eventos).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    let ep = null;
    try { ep = require('./event-playbook-model'); } catch (_) {}
    module.exports = factory(ep);
  } else {
    root.MarketCentralModel = factory(root.EventPlaybookModel);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (EventPlaybook) {
  'use strict';

  const STORAGE_KEY_CUSTOM_EVENTS = 'healthy-trend-central-events-v1';
  const STORAGE_KEY_EVENT_REACTIONS = 'healthy-trend-central-reactions-v1';
  const STORAGE_KEY_PREFS = 'healthy-trend-central-prefs-v1';

  const UNIVERSES = [
    { id: 'stock_b3', label: 'B3 (Todos os ativos)', desc: 'Universo integral de ações monitoradas na B3.' },
    { id: 'ibov', label: 'Componentes do Ibovespa', desc: 'Ativos que compõem o principal índice brasileiro.' },
    { id: 'smallcaps', label: 'Small Caps', desc: 'Empresas de menor capitalização fora dos grandes índices.' },
    { id: 'watchlist', label: 'Minha Watchlist', desc: 'Apenas os ativos salvos na sua Watchlist ativa.' }
  ];

  const MARKETS = [
    { id: 'stock_b3', label: 'Ações B3', benchmark: 'IBOV' },
    { id: 'bdr', label: 'BDRs', benchmark: 'BDRX' },
    { id: 'fii', label: 'FIIs', benchmark: 'IFIX' }
  ];

  const PERIODS = [
    { id: 'today', label: 'Hoje' },
    { id: '5d', label: '5 dias' },
    { id: '1m', label: '1 mês' },
    { id: '3m', label: '3 meses' }
  ];

  const MAP_TABS = [
    { id: 'sectors', label: 'Setores', desc: 'Mapa de calor dos setores da B3' },
    { id: 'assets', label: 'Ativos', desc: 'Desempenho dos ativos individuais do universo' },
    { id: 'variation', label: 'Variação do dia', desc: 'Ranking de maiores altas e maiores baixas do dia' }
  ];

  function getEffectiveChange(item, period = 'today') {
    if (!item) return 0;
    if (item.returns && typeof item.returns[period] === 'number') {
      return item.returns[period];
    }
    if (period === 'today' && typeof item.changePct === 'number') {
      return item.changePct;
    }
    return typeof item.changePct === 'number' ? item.changePct : 0;
  }

  function sortAssetsByVariation(assets, period = 'today') {
    if (!Array.isArray(assets)) return { gainers: [], losers: [] };
    const valid = assets.filter(it => it && Number.isFinite(Number(getEffectiveChange(it, period))));
    const sorted = [...valid].sort((a, b) => Number(getEffectiveChange(b, period)) - Number(getEffectiveChange(a, period)));
    const gainers = sorted.filter(it => Number(getEffectiveChange(it, period)) > 0);
    const losers = [...sorted].reverse().filter(it => Number(getEffectiveChange(it, period)) < 0);
    return { gainers, losers };
  }

  function formatPercent(value, decimals = 1) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '—';
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`;
  }

  function formatNumber(value, decimals = 0) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '—';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  /**
   * Converte score de 0 a 100 para o ângulo da agulha no gauge semicircular (-90deg a +90deg)
   */
  function scoreToGaugeAngle(score) {
    const clamped = Math.max(0, Math.min(100, Number(score) || 0));
    // 0 = -90 graus, 50 = 0 graus, 100 = +90 graus
    return -90 + (clamped / 100) * 180;
  }

  /**
   * Resolve a cor temática baseada na classificação do regime
   */
  function resolveRegimeColor(state) {
    switch (state) {
      case 'healthy':
        return { hex: '#22c55e', text: '#dcfce7', label: 'Alta (Favorável)' };
      case 'defensive':
        return { hex: '#ef4444', text: '#fee2e2', label: 'Baixa (Desfavorável)' };
      case 'transition':
      default:
        return { hex: '#eab308', text: '#fef9c3', label: 'Atenção' };
    }
  }

  const memoryStore = new Map();

  function safeStorageGet(key) {
    try {
      if (typeof window !== 'undefined' && window.healthyTrendWorkspace?.raw) {
        const raw = window.healthyTrendWorkspace.raw(key);
        if (raw) return typeof raw === 'string' ? JSON.parse(raw) : raw;
      }
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        const local = localStorage.getItem(key);
        if (local) return JSON.parse(local);
      }
    } catch (e) {
      // Ignora erro em ambientes sem suporte
    }
    return memoryStore.get(key) || null;
  }

  function safeStorageSet(key, value) {
    memoryStore.set(key, value);
    try {
      if (typeof window !== 'undefined' && window.healthyTrendWorkspace?.save) {
        window.healthyTrendWorkspace.save(key, value);
      }
      if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      // Memory store já garantiu retenção
    }
  }

  function getPlaybook() {
    if (typeof EventPlaybook !== 'undefined' && EventPlaybook) return EventPlaybook;
    if (typeof window !== 'undefined' && window.EventPlaybookModel) return window.EventPlaybookModel;
    if (typeof globalThis !== 'undefined' && globalThis.EventPlaybookModel) return globalThis.EventPlaybookModel;
    return null;
  }

  /**
   * Lê eventos customizados do usuário salvos no workspace ou localStorage
   */
  function getCustomEvents() {
    const pb = getPlaybook();
    if (pb && typeof pb.getAllEvents === 'function') {
      return pb.getAllEvents();
    }
    const data = safeStorageGet(STORAGE_KEY_CUSTOM_EVENTS);
    return Array.isArray(data) ? data : [];
  }

  /**
   * Salva um novo evento cadastrado manualmente pelo trader
   */
  function addCustomEvent(eventData) {
    if (!eventData || !eventData.name) {
      throw new Error('O nome do evento é obrigatório.');
    }
    const pb = getPlaybook();
    if (pb && typeof pb.addEvent === 'function') {
      const added = pb.addEvent({
        ...eventData,
        id: eventData.id || ('cust-evt-' + Date.now()),
        impact: eventData.impact === 'ALTO' ? 4 : 3,
        impactLevel: eventData.impact === 'ALTO' ? 'ALTO' : 'MÉDIO'
      });
      return {
        ...added,
        impact: eventData.impact || (added.impact >= 4 ? 'ALTO' : 'MÉDIO')
      };
    }

    const current = getCustomEvents();
    const newEvent = {
      id: 'cust-evt-' + Date.now(),
      name: String(eventData.name).trim(),
      date: String(eventData.date || new Date().toISOString().slice(0, 10)),
      time: String(eventData.time || '10:00'),
      timezone: String(eventData.timezone || 'America/Sao_Paulo'),
      impact: eventData.impact === 'ALTO' ? 'ALTO' : 'MÉDIO',
      country: eventData.country || 'Brasil',
      relatedAssets: eventData.relatedAssets || 'Geral',
      description: eventData.description || '',
      notes: eventData.notes || '',
      source: 'Manual (Usuário)',
      createdAt: new Date().toISOString()
    };

    current.unshift(newEvent);
    saveCustomEvents(current);
    return newEvent;
  }

  function removeCustomEvent(eventId) {
    const pb = getPlaybook();
    if (pb && typeof pb.deleteEvent === 'function') {
      return pb.deleteEvent(eventId);
    }
    const current = getCustomEvents();
    const filtered = current.filter(it => it.id !== eventId);
    saveCustomEvents(filtered);
    return filtered;
  }

  function saveCustomEvents(eventsList) {
    safeStorageSet(STORAGE_KEY_CUSTOM_EVENTS, eventsList);
  }

  /**
   * Playbook de Eventos: registro da reação do mercado a acontecimentos
   */
  function getEventReactions() {
    const data = safeStorageGet(STORAGE_KEY_EVENT_REACTIONS);
    return Array.isArray(data) ? data : [];
  }

  function saveEventReaction(reactionData) {
    if (!reactionData || !reactionData.eventId) {
      throw new Error('O ID do evento é obrigatório para registrar a reação.');
    }

    const pb = getPlaybook();
    if (pb && typeof pb.saveReaction === 'function') {
      pb.saveReaction(reactionData);
    }

    const current = getEventReactions();
    const newReaction = {
      id: 'reaction-' + Date.now(),
      eventId: reactionData.eventId,
      eventName: reactionData.eventName || '',
      eventDate: reactionData.eventDate || '',
      preEventScreenshot: reactionData.preEventScreenshot || null,
      postEventScreenshot: reactionData.postEventScreenshot || null,
      whatHappened: String(reactionData.whatHappened || '').trim(),
      affectedAssets: String(reactionData.affectedAssets || '').trim(),
      volatilityBehavior: reactionData.volatilityBehavior || 'Expansão rápida seguida de absorção',
      lessonsLearned: String(reactionData.lessonsLearned || '').trim(),
      recordedAt: new Date().toISOString()
    };

    current.unshift(newReaction);
    safeStorageSet(STORAGE_KEY_EVENT_REACTIONS, current);
    return newReaction;
  }

  function getReactionsForEvent(eventId) {
    const pb = getPlaybook();
    if (pb && typeof pb.getEventById === 'function') {
      const ev = pb.getEventById(eventId);
      if (ev && (ev.whatHappened || ev.lessonsLearned)) {
        return [{
          id: 'reaction-' + ev.id,
          eventId: ev.id,
          eventName: ev.name,
          eventDate: ev.date,
          whatHappened: ev.whatHappened,
          affectedAssets: ev.affectedAssets,
          volatilityBehavior: ev.volatilityBehavior,
          lessonsLearned: ev.lessonsLearned
        }];
      }
    }
    return getEventReactions().filter(r => r.eventId === eventId);
  }

  return {
    UNIVERSES,
    MARKETS,
    PERIODS,
    MAP_TABS,
    getEffectiveChange,
    sortAssetsByVariation,
    formatPercent,
    formatNumber,
    scoreToGaugeAngle,
    resolveRegimeColor,
    getCustomEvents,
    addCustomEvent,
    removeCustomEvent,
    getEventReactions,
    saveEventReaction,
    getReactionsForEvent
  };
});
