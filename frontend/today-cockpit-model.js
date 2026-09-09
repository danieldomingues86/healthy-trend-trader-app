(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TodayCockpitModel = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEMO_SOURCE = /demo|mock|sample|seed|fixture|fallback/i;

  function finite(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function marketDataState({ source, updatedAt, now = Date.now(), liveMinutes = 45 } = {}) {
    if (!source && !updatedAt) return { kind: 'unavailable', label: 'INDISPONÍVEL', ageMinutes: null };
    if (DEMO_SOURCE.test(String(source || ''))) return { kind: 'demo', label: 'DEMO', ageMinutes: null };
    const timestamp = Date.parse(updatedAt);
    if (!Number.isFinite(timestamp)) return { kind: 'cached', label: 'CACHE REAL', ageMinutes: null };
    const ageMinutes = Math.max(0, Math.floor((finite(now, Date.now()) - timestamp) / 60000));
    return ageMinutes <= liveMinutes
      ? { kind: 'live', label: 'LIVE', ageMinutes }
      : { kind: 'cached', label: 'CACHE REAL', ageMinutes };
  }

  function buildNextAction({ heat = 0, heatLimit = 3, positions = [], drafts = [], healthyMarket = false, opportunityCount = 0 } = {}) {
    const realPositions = positions.filter((position) => position.mode === 'real');
    if (heat >= heatLimit) return { kind: 'risk', title: 'Revisar Portfolio Heat', detail: 'O limite de risco agregado foi atingido.', page: 'portfolioheat', action: 'Abrir controle de risco' };
    if (realPositions.length) {
      const position = [...realPositions].sort((left, right) => finite(right.riskPct) - finite(left.riskPct))[0];
      return { kind: 'position', title: `Revisar ${position.asset || 'posição aberta'}`, detail: 'Confirme preço, stop e risco em andamento antes de procurar algo novo.', page: 'position', positionId: position.id, action: 'Gerenciar posição' };
    }
    if (drafts.length) return { kind: 'draft', title: 'Retomar plano salvo', detail: `${drafts.length} plano(s) aguardando sua decisão.`, page: 'newtrade', action: 'Abrir planejamento' };
    if (healthyMarket && opportunityCount > 0) return { kind: 'opportunity', title: 'Revisar oportunidades', detail: `${opportunityCount} ativo(s) passaram pelos filtros atuais.`, page: 'marketscans', action: 'Abrir scans' };
    if (healthyMarket) return { kind: 'plan', title: 'Planejar somente um cenário A+', detail: 'O mercado permite procurar oportunidades, mas nenhum scan substitui a validação do setup.', page: 'newtrade', action: 'Planejar trade' };
    return { kind: 'wait', title: 'Preservar capital e observar', detail: 'Revise o Ciclo de Mercado antes de considerar uma nova exposição.', page: 'marketcycle', action: 'Ver ciclo de mercado' };
  }

  function summarizeScans(payload) {
    const cards = Array.isArray(payload?.cards) ? payload.cards : [];
    const available = cards.filter((card) => card.available !== false);
    const unique = new Set(available.flatMap((card) => Array.isArray(card.results) ? card.results.map((item) => item.symbol).filter(Boolean) : []));
    return { available: available.length, unavailable: cards.length - available.length, matches: unique.size };
  }

  return { marketDataState, buildNextAction, summarizeScans };
}));
