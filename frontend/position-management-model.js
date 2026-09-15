(function (root, factory) {
  const rubric = typeof module === 'object' && module.exports ? require('./trading-rubrics') : root.TradingRubrics;
  const model = factory(rubric);
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.PositionManagementModel = model;
}(typeof window === 'undefined' ? globalThis : window, function (Rubric) {
  'use strict';
  const DEFAULT_SELL = Object.freeze({ enabled: true, startR: 2, endR: 3, suggestedPercent: 50 });
  const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
  const settings = input => {
    const saved = input || {};
    const startR = Math.max(0, finite(saved.startR) ?? DEFAULT_SELL.startR);
    return { enabled: saved.enabled !== false, startR, endR: Math.max(startR, finite(saved.endR) ?? DEFAULT_SELL.endR), suggestedPercent: Math.min(100, Math.max(1, finite(saved.suggestedPercent) ?? DEFAULT_SELL.suggestedPercent)) };
  };
  const isSellIntoStrength = event => event?.type === 'peeloff' && (event.context?.source === 'sell_into_strength' || /^sell into strength\b/i.test(String(event.note || '').trim()));
  function initial(position) {
    const entryEvent = (position.events || []).find(event => event.type === 'entry');
    const entry = finite(entryEvent?.price) ?? finite(position.entry);
    const stop = finite(entryEvent?.stop) ?? finite(position.initialStop);
    const originalQuantity = finite(entryEvent?.qty) ?? finite(position.initialQty);
    const sign = position.direction === 'short' ? -1 : 1;
    const perUnit = entry !== null && stop !== null ? (entry - stop) * sign : null;
    return { entry, stop, originalQuantity, sign, perUnit: perUnit > 0 ? perUnit : null, cash: perUnit > 0 && originalQuantity > 0 ? perUnit * originalQuantity : null };
  }
  function currentR(position) {
    const basis = initial(position), price = finite(position.currentPrice);
    return basis.perUnit !== null && price !== null ? (price - basis.entry) * basis.sign / basis.perUnit : null;
  }
  function metricsFromEvents(position, equity) {
    const basis = initial(position), events = position.events || [], entry = basis.entry ?? 0;
    const exits = events.filter(event => ['peeloff', 'close'].includes(event.type));
    const exited = exits.reduce((sum, event) => sum + (finite(event.qty) || 0), 0);
    const remaining = Math.max(0, (basis.originalQuantity || 0) - exited);
    const realized = exits.reduce((sum, event) => sum + ((finite(event.price) ?? entry) - entry) * basis.sign * (finite(event.qty) || 0), 0);
    const price = finite(position.currentPrice) ?? entry;
    const risk = Rubric.calculateOngoingRisk({ currentPrice: price, currentStop: finite(position.currentStop) ?? price, quantity: remaining, direction: position.direction, equity });
    return { remaining, realized, open: (price - entry) * basis.sign * remaining, risk: risk.cash, riskPct: risk.riskPct, partials: events.filter(event => event.type === 'peeloff').length };
  }
  function state(position, metric, config) {
    const basis = initial(position), sell = settings(config), r = currentR(position);
    const remaining = Math.max(0, finite(metric.remaining) ?? 0), realized = finite(metric.realized) ?? 0, ongoingRisk = Math.max(0, finite(metric.risk) ?? 0);
    const partials = (position.events || []).filter(event => event.type === 'peeloff');
    const coverage = realized > 0 ? (ongoingRisk > 0 ? realized / ongoingRisk : Infinity) : null;
    return {
      initialRisk: basis.cash, initialRiskPerUnit: basis.perUnit, initialStop: basis.stop,
      currentR: r, remaining, originalQuantity: basis.originalQuantity, realizedProfit: realized,
      openProfit: finite(metric.open) ?? 0, ongoingRisk, coverage,
      freeRoll: partials.length > 0 && realized > 0 && realized >= ongoingRisk,
      runner: partials.length > 0 && remaining > 0,
      realizedQuantity: (basis.originalQuantity || 0) - remaining,
      sellAvailable: sell.enabled && r !== null && r >= sell.startR && remaining > 1 && partials.filter(isSellIntoStrength).length === 0,
      aboveZone: r !== null && r > sell.endR,
      sell, sellCount: partials.filter(isSellIntoStrength).length
    };
  }
  function preview(position, metric, percent, price, quantity) {
    const basis = initial(position), remaining = Math.max(0, Math.floor(finite(metric.remaining) ?? 0));
    const value = finite(price), pct = finite(percent);
    const qty = quantity == null ? (pct !== null ? Math.floor(remaining * pct / 100) : 0) : finite(quantity);
    if (!(remaining > 1 && Number.isInteger(qty) && qty >= 1 && qty < remaining && value !== null && value > 0)) return null;
    const profit = basis.entry !== null ? (value - basis.entry) * basis.sign * qty : null;
    const initialR = basis.perUnit !== null ? (value - basis.entry) * basis.sign / basis.perUnit : null;
    const afterRisk = Rubric.calculateOngoingRisk({ currentPrice: value, currentStop: finite(position.currentStop) ?? value, quantity: remaining - qty, direction: position.direction }).cash;
    return { quantity: qty, percent: qty / remaining * 100, price: value, rAtExit: initialR, realizedProfit: profit, totalRealizedAfter: (finite(metric.realized) ?? 0) + (profit ?? 0), remainingAfter: remaining - qty, ongoingRiskAfter: afterRisk };
  }
  function actions(position, metric, options = {}) {
    const positionState = state(position, metric, options.sellIntoStrength);
    const items = [];
    if (options.policy && Number(options.equity) > 0 && positionState.remaining > 0) {
      const peel = Rubric.calculatePeelOff({
        currentPrice: position.currentPrice,
        currentStop: position.currentStop,
        atr: position.atr,
        quantity: positionState.remaining,
        direction: position.direction,
        equity: Number(options.equity),
        policy: options.policy,
        profileKey: options.profileKey,
        lot: options.lot || 100
      });
      if (peel.required) items.push({ type: 'peeloff', label: 'PEEL-OFF', detail: `Reduzir ${peel.peelQuantity} unidades`, priority: 'critical' });
    }
    if (positionState.sellAvailable) items.push({ type: 'sell-into-strength', label: 'SELL INTO STRENGTH', detail: `Zona ${positionState.sell.startR}R–${positionState.sell.endR}R`, priority: 'opportunity' });
    return items;
  }
  return { DEFAULT_SELL, settings, isSellIntoStrength, initial, currentR, metricsFromEvents, state, preview, actions };
}));
