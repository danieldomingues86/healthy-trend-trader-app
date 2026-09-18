(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.WatchlistModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PIPELINE_STATUSES = [
    {
      id: 'observando',
      label: 'Observando',
      icon: '👀',
      color: '#94a3b8',
      desc: 'No radar inicial / Monitorando estrutura'
    },
    {
      id: 'desenvolvendo',
      label: 'Desenvolvendo',
      icon: '🟡',
      color: '#f59e0b',
      desc: 'Padrão amadurecendo / Volatilidade contraindo'
    },
    {
      id: 'setup-proximo',
      label: 'Setup Próximo',
      icon: '🟢',
      color: '#10b981',
      desc: 'Próximo do ponto de compra / Aguardando gatilho'
    },
    {
      id: 'ready',
      label: 'Ready',
      icon: '🎯',
      color: '#00f0ff',
      desc: 'Setup acionado / Ponto de entrada ativo'
    }
  ];

  const ORIGINS = {
    'emerging-leaders': { id: 'emerging-leaders', label: 'Emerging Leaders', badge: 'Líder Emergente' },
    'relative-strength': { id: 'relative-strength', label: 'Relative Strength', badge: 'Força Relativa' },
    'fundamentalista': { id: 'fundamentalista', label: 'Fundamentalista', badge: 'Fundamentos' },
    'scans': { id: 'scans', label: 'Scans de Mercado', badge: 'Scan Técnico' },
    'manual': { id: 'manual', label: 'Manual', badge: 'Manual' }
  };

  const isNum = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

  function createSnapshot(data = {}) {
    return {
      date: new Date().toISOString(),
      price: isNum(data.price) ? Number(data.price) : (isNum(data.close) ? Number(data.close) : 0),
      rsScore: isNum(data.rsScore) ? Number(data.rsScore) : (isNum(data.rs) ? Number(data.rs) : 0),
      distance52wPct: isNum(data.distance52wPct) ? Number(data.distance52wPct) : (isNum(data.dist52w) ? Number(data.dist52w) : 0),
      atrPct: isNum(data.atrPct) ? Number(data.atrPct) : 0,
      volumeRatio: isNum(data.volumeRatio) ? Number(data.volumeRatio) : (isNum(data.volRatio) ? Number(data.volRatio) : 1.0),
      marketCycle: String(data.marketCycle || 'Saudável'),
      emergingScore: isNum(data.emergingScore) ? Number(data.emergingScore) : 0
    };
  }

  function generateWhyObserving(stock = {}) {
    const reasons = [];
    const rs = isNum(stock.rsScore) ? Number(stock.rsScore) : (isNum(stock.rs) ? Number(stock.rs) : 0);
    const dist52w = isNum(stock.distance52wPct) ? Number(stock.distance52wPct) : (isNum(stock.dist52w) ? Number(stock.dist52w) : -99);
    const volRatio = isNum(stock.volumeRatio) ? Number(stock.volumeRatio) : (isNum(stock.volRatio) ? Number(stock.volRatio) : 1);
    const fundScore = isNum(stock.scoreFundamentals) ? Number(stock.scoreFundamentals) : (isNum(stock.fundamentalScore) ? Number(stock.fundamentalScore) : 0);

    if (rs >= 90) {
      reasons.push({
        id: 'rs-elite',
        title: 'RS de Elite',
        desc: `Força Relativa ${Math.round(rs)} > 90, entre os líderes máximos do mercado`
      });
    } else if (rs >= 80) {
      reasons.push({
        id: 'rs-strong',
        title: 'RS Forte',
        desc: `Força Relativa consistente em ${Math.round(rs)}, superando o Ibovespa`
      });
    }

    if (dist52w >= -5 && dist52w <= 2) {
      reasons.push({
        id: '52w-high',
        title: 'Máxima de 52 Semanas',
        desc: `A apenas ${Math.abs(dist52w).toFixed(1)}% da máxima anual (perto de novas máximas)`
      });
    } else if (dist52w >= -15 && dist52w < -5) {
      reasons.push({
        id: '52w-structure',
        title: 'Estrutura Próxima ao Topo',
        desc: `Consolidando a ${Math.abs(dist52w).toFixed(1)}% da máxima anual`
      });
    }

    if (volRatio >= 1.2) {
      reasons.push({
        id: 'volume-pressure',
        title: 'Pressão Compradora',
        desc: `Volume ${volRatio.toFixed(1)}x acima da média de 20 pregões`
      });
    }

    if (stock.trend === 'alta' || (stock.price && stock.ema200 && stock.price > stock.ema200)) {
      reasons.push({
        id: 'healthy-trend',
        title: 'Tendência Primária Saudável',
        desc: 'Preço negociando acima da EMA 200 em alinhamento de alta'
      });
    }

    if (stock.sectorLeader || stock.isSectorLeader) {
      reasons.push({
        id: 'sector-leadership',
        title: 'Liderança Setorial',
        desc: `Destaque e liderança no setor ${stock.sector || ''}`
      });
    }

    if (fundScore >= 70) {
      reasons.push({
        id: 'solid-fundamentals',
        title: 'Fundamentos Sólidos',
        desc: `Score fundamentalista de ${fundScore}/100 com margens e ROIC atrativos`
      });
    }

    if (!reasons.length) {
      reasons.push({
        id: 'setup-formation',
        title: 'Setup Técnico em Formação',
        desc: 'Monitoramento de base, consolidação e ponto de pivô'
      });
    }

    return reasons;
  }

  function getDefaultWaitingConditions() {
    return [
      { id: 'contraction-4h', label: 'Contração de volatilidade (base estreita no 4H/Diário)', checked: false },
      { id: 'support-emas', label: 'Teste ou suporte nas médias móveis rápidas (EMA 9 / EMA 21)', checked: false },
      { id: 'entry-trigger', label: 'Gatilho técnico claro (rompimento de pivô ou linha de tendência)', checked: false },
      { id: 'volume-confirmation', label: 'Volume de confirmação acima da média na barra de ignição', checked: false },
      { id: 'market-cycle', label: 'Confirmação do Market Cycle (Ambiente Saudável ou Transição)', checked: false }
    ];
  }

  function calculateEvolution(opportunity, currentMetrics = {}) {
    const snap = opportunity.snapshot || {};
    const hasSnap = isNum(snap.price) && isNum(snap.rsScore);

    const initialPrice = hasSnap ? Number(snap.price) : (isNum(currentMetrics.price) ? Number(currentMetrics.price) : 0);
    const currentPrice = isNum(currentMetrics.price) ? Number(currentMetrics.price) : initialPrice;
    const priceChangePct = initialPrice > 0 ? ((currentPrice - initialPrice) / initialPrice) * 100 : 0;

    const initialRs = hasSnap ? Number(snap.rsScore) : (isNum(currentMetrics.rsScore) ? Number(currentMetrics.rsScore) : 0);
    const currentRs = isNum(currentMetrics.rsScore) ? Number(currentMetrics.rsScore) : initialRs;
    const rsDelta = currentRs - initialRs;

    const initial52w = hasSnap && isNum(snap.distance52wPct) ? Number(snap.distance52wPct) : (isNum(currentMetrics.distance52wPct) ? Number(currentMetrics.distance52wPct) : 0);
    const current52w = isNum(currentMetrics.distance52wPct) ? Number(currentMetrics.distance52wPct) : initial52w;
    const dist52wDelta = current52w - initial52w; // + significa que aproximou da máxima

    const initialAtr = hasSnap && isNum(snap.atrPct) ? Number(snap.atrPct) : (isNum(currentMetrics.atrPct) ? Number(currentMetrics.atrPct) : 0);
    const currentAtr = isNum(currentMetrics.atrPct) ? Number(currentMetrics.atrPct) : initialAtr;
    const atrDelta = currentAtr - initialAtr; // - significa que contraiu volatilidade (bom para setup)

    // Classificação da evolução
    let state = 'estavel';
    let label = 'Estável';
    let color = '#f59e0b';
    let summary = 'Ativo mantendo métricas similares ao momento de entrada na Watchlist.';

    const improvingSignals = (rsDelta >= 2 ? 1 : 0) + (dist52wDelta >= 1 ? 1 : 0) + (atrDelta < 0 ? 1 : 0) + (priceChangePct > 1 ? 1 : 0);
    const deterioratingSignals = (rsDelta <= -4 ? 1 : 0) + (dist52wDelta <= -4 ? 1 : 0) + (priceChangePct < -4 ? 1 : 0);

    if (improvingSignals >= 2 || rsDelta >= 5 || (current52w >= -2 && currentRs >= 85)) {
      state = 'amadurecendo';
      label = 'Amadurecendo';
      color = '#10b981';
      if (rsDelta > 0) {
        summary = `RS acelerou de ${Math.round(initialRs)} para ${Math.round(currentRs)} (+${Math.round(rsDelta)} pts) e ativo se aproxima do ponto de compra.`;
      } else {
        summary = `Ativo consolidando firme próximo à máxima anual com volatilidade controlada.`;
      }
    } else if (deterioratingSignals >= 2 || rsDelta <= -6) {
      state = 'deteriorando';
      label = 'Perdendo Força';
      color = '#ef4444';
      summary = `RS recuou de ${Math.round(initialRs)} para ${Math.round(currentRs)} (${Math.round(rsDelta)} pts). Afastou-se do setup ideal.`;
    }

    return {
      hasInitialSnapshot: hasSnap,
      initialPrice,
      currentPrice,
      priceChangePct,
      initialRs,
      currentRs,
      rsDelta,
      initial52w,
      current52w,
      dist52wDelta,
      initialAtr,
      currentAtr,
      atrDelta,
      state,
      label,
      color,
      summary
    };
  }

  function normalizeOpportunity(raw = {}) {
    const symbol = String(raw.ticker || raw.symbol || '').trim().toUpperCase();
    const origin = String(raw.origin || 'manual').trim().toLowerCase();
    const status = String(raw.status || 'observando').trim().toLowerCase();
    const createdAt = raw.created_at || raw.createdAt || new Date().toISOString();
    const updatedAt = raw.updated_at || raw.updatedAt || createdAt;

    const sources = Array.isArray(raw.sources) && raw.sources.length
      ? raw.sources
      : [{ origin, date: createdAt }];

    const waitingConditions = Array.isArray(raw.waiting_conditions) && raw.waiting_conditions.length
      ? raw.waiting_conditions
      : (Array.isArray(raw.waitingConditions) && raw.waitingConditions.length ? raw.waitingConditions : getDefaultWaitingConditions());

    const whyObserving = Array.isArray(raw.why_observing) && raw.why_observing.length
      ? raw.why_observing
      : (Array.isArray(raw.whyObserving) && raw.whyObserving.length ? raw.whyObserving : []);

    const snapshot = (raw.snapshot && typeof raw.snapshot === 'object') ? raw.snapshot : {};

    return {
      id: raw.id || `opp-${symbol}-${Date.now()}`,
      ticker: symbol,
      name: raw.name || raw.shortName || symbol,
      sector: raw.sector || raw.setor || 'Outros',
      origin,
      status,
      thesis: typeof raw.thesis === 'string' ? raw.thesis : '',
      snapshot,
      waiting_conditions: waitingConditions,
      why_observing: whyObserving,
      sources,
      history: Array.isArray(raw.history) ? raw.history : [],
      created_at: createdAt,
      updated_at: updatedAt
    };
  }

  function filterAndSortOpportunities(list = [], filters = {}, currentMetricsMap = {}) {
    const search = String(filters.search || '').trim().toUpperCase();
    const status = String(filters.status || 'todos').trim().toLowerCase();
    const sector = String(filters.sector || 'todos').trim().toLowerCase();
    const origin = String(filters.origin || 'todos').trim().toLowerCase();
    const sortBy = String(filters.sort || 'recentes').trim().toLowerCase();

    let filtered = list.filter((item) => {
      if (search) {
        const matchesTicker = item.ticker.includes(search);
        const matchesName = (item.name || '').toUpperCase().includes(search);
        if (!matchesTicker && !matchesName) return false;
      }

      if (status !== 'todos' && item.status !== status) {
        return false;
      }

      if (sector !== 'todos') {
        const itemSector = (item.sector || '').toLowerCase();
        if (itemSector !== sector) return false;
      }

      if (origin !== 'todos') {
        const hasOrigin = item.origin === origin || (Array.isArray(item.sources) && item.sources.some((s) => s.origin === origin));
        if (!hasOrigin) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      const metricsA = currentMetricsMap[a.ticker] || {};
      const metricsB = currentMetricsMap[b.ticker] || {};

      switch (sortBy) {
        case 'rs-desc': {
          const rsA = isNum(metricsA.rsScore) ? Number(metricsA.rsScore) : (isNum(a.snapshot?.rsScore) ? Number(a.snapshot.rsScore) : 0);
          const rsB = isNum(metricsB.rsScore) ? Number(metricsB.rsScore) : (isNum(b.snapshot?.rsScore) ? Number(b.snapshot.rsScore) : 0);
          return rsB - rsA;
        }
        case 'rs-asc': {
          const rsA = isNum(metricsA.rsScore) ? Number(metricsA.rsScore) : (isNum(a.snapshot?.rsScore) ? Number(a.snapshot.rsScore) : 0);
          const rsB = isNum(metricsB.rsScore) ? Number(metricsB.rsScore) : (isNum(b.snapshot?.rsScore) ? Number(b.snapshot.rsScore) : 0);
          return rsA - rsB;
        }
        case '52w-desc': {
          const dA = isNum(metricsA.distance52wPct) ? Number(metricsA.distance52wPct) : (isNum(a.snapshot?.distance52wPct) ? Number(a.snapshot.distance52wPct) : -100);
          const dB = isNum(metricsB.distance52wPct) ? Number(metricsB.distance52wPct) : (isNum(b.snapshot?.distance52wPct) ? Number(b.snapshot.distance52wPct) : -100);
          return dB - dA; // closer to 0 is higher
        }
        case 'evolucao': {
          const evoA = calculateEvolution(a, metricsA);
          const evoB = calculateEvolution(b, metricsB);
          const score = (evo) => (evo.state === 'amadurecendo' ? 3 : (evo.state === 'estavel' ? 2 : 1));
          return score(evoB) - score(evoA) || evoB.rsDelta - evoA.rsDelta;
        }
        case 'alphabetical':
          return a.ticker.localeCompare(b.ticker);
        case 'recentes':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }

  function calculateSummaryKpis(list = []) {
    const total = list.length;
    let observando = 0;
    let desenvolvendo = 0;
    let setupProximo = 0;
    let ready = 0;
    let novosSemana = 0;

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const item of list) {
      if (item.status === 'observando') observando++;
      else if (item.status === 'desenvolvendo') desenvolvendo++;
      else if (item.status === 'setup-proximo') setupProximo++;
      else if (item.status === 'ready') ready++;

      const createdTime = new Date(item.created_at).getTime();
      if (createdTime >= sevenDaysAgo) {
        novosSemana++;
      }
    }

    return {
      total,
      observando,
      desenvolvendo,
      setupProximo,
      ready,
      novosSemana
    };
  }

  return {
    PIPELINE_STATUSES,
    ORIGINS,
    createSnapshot,
    generateWhyObserving,
    getDefaultWaitingConditions,
    calculateEvolution,
    normalizeOpportunity,
    filterAndSortOpportunities,
    calculateSummaryKpis
  };
});
