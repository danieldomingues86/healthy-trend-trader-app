(function (root, factory) {
  const triggersCatalog = (typeof module === 'object' && module.exports)
    ? require('./setup-triggers-catalog')
    : (typeof window !== 'undefined' ? window.SetupTriggersCatalog : null);
  const api = factory(triggersCatalog);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TradeAnatomyModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (setupTriggers) {
  const number = value => Number.isFinite(Number(value)) ? Number(value) : null;
  const normalized = value => String(value || '').trim().toLowerCase();

  function responsesOf(trade) {
    const source = trade?.rubric_responses;
    if (!source || typeof source !== 'object') return {};
    if (!Array.isArray(source)) return source.ratings && typeof source.ratings === 'object' ? source.ratings : source;
    return source.reduce((all, item) => {
      const key = item?.key || item?.id;
      if (key) all[key] = item.selectedRating ?? item.rating ?? item.value;
      return all;
    }, {});
  }

  function ratingLabel(value) {
    const key = normalized(value);
    return ({ good: 'Bom', bom: 'Bom', medium: 'Médio', medio: 'Médio', médio: 'Médio', bad: 'Ruim', ruim: 'Ruim', healthy: 'Saudável', saudável: 'Saudável', saudavel: 'Saudável', improving: 'Melhorando', melhorando: 'Melhorando', transition: 'Transição', transição: 'Transição', transicao: 'Transição', defensive: 'Defensivo', defensivo: 'Defensivo', riskoff: 'Risk-Off', 'risk-off': 'Risk-Off' })[key] || null;
  }

  function cycleLabel(trade, responses) {
    const raw = trade?.rubric_responses?.marketCycleRegime ?? trade?.rubric_responses?.marketCycle ?? responses.marketCycle;
    return ratingLabel(raw) || (raw ? String(raw) : null);
  }

  function analyzeTrade(trade) {
    const events = Array.isArray(trade?.events) ? trade.events : [];
    const entryEvent = events.find(event => event.type === 'entry');
    const exits = events.filter(event => event.type === 'peeloff' || event.type === 'close');
    const closeEvent = [...events].reverse().find(event => event.type === 'close');
    const entry = number(entryEvent?.price ?? trade?.execution_price ?? trade?.entry_price) || 0;
    const quantity = number(entryEvent?.qty ?? trade?.executed_quantity ?? trade?.planned_quantity) || 0;
    const initialStop = number(entryEvent?.stop ?? trade?.stop_price) || 0;
    const sign = trade?.direction === 'short' ? -1 : 1;
    const result = exits.reduce((sum, event) => sum + ((number(event.price) || 0) - entry) * sign * (number(event.qty) || 0), 0);
    const initialRisk = Math.abs(entry - initialStop) * quantity;
    const openedAt = new Date(entryEvent?.at || trade?.executed_at || trade?.created_at || 0);
    const closedAt = new Date(closeEvent?.at || trade?.updated_at || trade?.created_at || 0);
    const durationDays = Number.isNaN(openedAt.getTime()) || Number.isNaN(closedAt.getTime()) ? null : Math.max(0, (closedAt - openedAt) / 86400000);
    const responses = responsesOf(trade);
    const atr = number(entryEvent?.atr ?? trade?.atr);
    const atrPct = atr != null && entry > 0 ? atr / entry * 100 : null;

    const setupTrigger = trade?.setup_trigger || trade?.setupTrigger || (setupTriggers ? setupTriggers.normalizeKey(trade?.setup) : null);
    const triggerLabel = setupTriggers ? setupTriggers.getTriggerLabel(setupTrigger || trade?.setup) : (trade?.setup || 'Não informado');

    return {
      id: trade?.id,
      trade,
      symbol: String(trade?.ticker || '—').toUpperCase(),
      market: trade?.market || null,
      direction: trade?.direction || null,
      setup: triggerLabel,
      setupTrigger,
      triggerLabel,
      grade: trade?.rubric_grade || null,
      score: number(trade?.rubric_score),
      result,
      r: initialRisk > 0 ? result / initialRisk : null,
      initialRisk,
      openedAt,
      closedAt,
      durationDays,
      atr,
      atrPct,
      assetContext: ratingLabel(responses.trendQuality),
      marketContext: cycleLabel(trade, responses),
      relativeStrength: ratingLabel(responses.relativeStrength),
      triggerQuality: ratingLabel(responses.setupQuality),
      fundamentals: ratingLabel(responses.fundamentalScore),
      responses
    };
  }

  function filtersFor(trades) {
    const items = trades.filter(trade => trade?.status === 'closed').map(analyzeTrade);
    const years = [...new Set(items.map(item => item.closedAt.getFullYear()).filter(Number.isFinite))].sort((a, b) => b - a);
    const markets = [...new Set(items.map(item => item.market).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
    return { years, markets };
  }

  function filterTrades(trades, filters = {}) {
    return trades.filter(trade => trade?.status === 'closed').map(analyzeTrade).filter(item => {
      const year = item.closedAt.getFullYear();
      const month = item.closedAt.getMonth() + 1;
      const matchesTrigger = !filters.setupTrigger || item.setupTrigger === filters.setupTrigger;
      return (!filters.year || year === Number(filters.year)) && (!filters.month || month === Number(filters.month)) &&
        (!filters.market || item.market === filters.market) && (!filters.direction || item.direction === filters.direction) &&
        matchesTrigger;
    });
  }

  function metrics(items) {
    const wins = items.filter(item => item.result > 0);
    const losses = items.filter(item => item.result < 0);
    const grossProfit = wins.reduce((sum, item) => sum + item.result, 0);
    const grossLoss = Math.abs(losses.reduce((sum, item) => sum + item.result, 0));
    return {
      total: items.length,
      net: items.reduce((sum, item) => sum + item.result, 0),
      grossProfit,
      grossLoss,
      profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null,
      winRate: items.length ? wins.length / items.length * 100 : 0,
      wins,
      losses
    };
  }

  function metricsByTrigger(items) {
    const triggers = setupTriggers ? setupTriggers.getAllTriggers() : [
      { id: 'INSIDE_BAR', name: 'Inside Bar', shortLabel: 'Inside Bar' },
      { id: 'PFR_COMPRA', name: 'PFR de Compra', shortLabel: 'PFR de Compra' },
      { id: '123_COMPRA', name: '1-2-3 de Compra', shortLabel: '1-2-3 de Compra' },
      { id: 'DAVE_LANDRY', name: 'Dave Landry', shortLabel: 'Dave Landry' },
      { id: 'RBI', name: 'Barra Vermelha Ignorada (RBI)', shortLabel: 'RBI' }
    ];

    return triggers.map(t => {
      const subset = items.filter(item => item.setupTrigger === t.id);
      const wins = subset.filter(item => item.result > 0);
      const losses = subset.filter(item => item.result < 0);
      const grossProfit = wins.reduce((sum, item) => sum + item.result, 0);
      const grossLoss = Math.abs(losses.reduce((sum, item) => sum + item.result, 0));
      const net = subset.reduce((sum, item) => sum + item.result, 0);
      const rValues = subset.map(item => item.r).filter(v => v != null);
      const avgR = rValues.length ? rValues.reduce((a, b) => a + b, 0) / rValues.length : null;
      const winRate = subset.length ? (wins.length / subset.length) * 100 : 0;
      const avgWin = wins.length ? grossProfit / wins.length : 0;
      const avgLoss = losses.length ? grossLoss / losses.length : 0;
      const expectancy = subset.length ? ((winRate / 100) * avgWin) - (((100 - winRate) / 100) * avgLoss) : 0;

      return {
        id: t.id,
        name: t.name,
        shortLabel: t.shortLabel,
        total: subset.length,
        wins: wins.length,
        losses: losses.length,
        winRate,
        profitFactor: grossLoss ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : null),
        net,
        avgR,
        expectancy,
        grossProfit,
        grossLoss,
        avgWin,
        avgLoss
      };
    });
  }

  function ranking(items, limit = 10) {
    return {
      winners: items.filter(item => item.result > 0).sort((a, b) => b.result - a.result).slice(0, limit),
      losers: items.filter(item => item.result < 0).sort((a, b) => a.result - b.result).slice(0, limit)
    };
  }

  const FEATURES = [
    { key: 'gradeA', label: 'Grade A', read: item => item.grade ? item.grade === 'A' : null },
    { key: 'relativeStrength', label: 'Força Relativa boa', read: item => item.relativeStrength ? item.relativeStrength === 'Bom' : null },
    { key: 'assetContext', label: 'Contexto Diário bom', read: item => item.assetContext ? item.assetContext === 'Bom' : null },
    { key: 'marketHealthy', label: 'Mercado saudável', read: item => item.marketContext ? item.marketContext === 'Saudável' : null },
    { key: 'atr', label: 'ATR < 2%', read: item => item.atrPct == null ? null : item.atrPct < 2 },
    { key: 'triggerInsideBar', label: 'Gatilho: Inside Bar', read: item => item.setupTrigger ? item.setupTrigger === 'INSIDE_BAR' : null },
    { key: 'triggerPfr', label: 'Gatilho: PFR de Compra', read: item => item.setupTrigger ? item.setupTrigger === 'PFR_COMPRA' : null },
    { key: 'trigger123', label: 'Gatilho: 1-2-3 de Compra', read: item => item.setupTrigger ? item.setupTrigger === '123_COMPRA' : null },
    { key: 'triggerDaveLandry', label: 'Gatilho: Dave Landry', read: item => item.setupTrigger ? item.setupTrigger === 'DAVE_LANDRY' : null },
    { key: 'triggerRbi', label: 'Gatilho: RBI', read: item => item.setupTrigger ? item.setupTrigger === 'RBI' : null },
    { key: 'long', label: 'Direção Long', read: item => item.direction ? item.direction === 'long' : null }
  ];

  function dna(items) {
    return FEATURES.map(feature => {
      const known = items.map(feature.read).filter(value => value !== null);
      const matches = known.filter(Boolean).length;
      return { key: feature.key, label: feature.label, matches, denominator: known.length, percentage: known.length ? matches / known.length * 100 : null };
    });
  }

  function compare(winners, losers) {
    const winnerDna = dna(winners);
    const loserDna = dna(losers);
    return winnerDna.map((winner, index) => ({ feature: winner.label, winners: winner, losers: loserDna[index] }));
  }

  return { analyzeTrade, filtersFor, filterTrades, metrics, metricsByTrigger, ranking, dna, compare, ratingLabel };
});

