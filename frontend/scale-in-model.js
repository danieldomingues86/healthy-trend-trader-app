(function (root, factory) {
  'use strict';
  const rubric = typeof module === 'object' && module.exports ? require('./trading-rubrics') : root.TradingRubrics;
  const api = factory(rubric);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ScaleInModel = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (Rubric) {
  'use strict';

  const DEFAULT_SCALE_IN_CONFIG = Object.freeze({
    enabled: true,
    maxAdditions: 2,
    minR: 1.0,
    triggerR1: 1.0,
    triggerR2: 2.0,
    requireBreakeven: true,
    maxRiskPct: 0.5, // 0.50% do patrimônio
    respectPortfolioHeat: true,
    allowLosingTrades: false
  });

  const finite = (value, fallback) => (value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))) ? Number(value) : fallback;

  function settings(input) {
    const saved = input || {};
    const triggerR1 = Math.max(0, finite(saved.triggerR1, finite(saved.minR, DEFAULT_SCALE_IN_CONFIG.triggerR1)));
    const triggerR2 = Math.max(0, finite(saved.triggerR2, DEFAULT_SCALE_IN_CONFIG.triggerR2));
    return {
      enabled: saved.enabled !== false,
      maxAdditions: Math.max(1, Math.floor(finite(saved.maxAdditions, DEFAULT_SCALE_IN_CONFIG.maxAdditions))),
      minR: triggerR1,
      triggerR1,
      triggerR2,
      requireBreakeven: saved.requireBreakeven !== false,
      maxRiskPct: Math.max(0, finite(saved.maxRiskPct, DEFAULT_SCALE_IN_CONFIG.maxRiskPct)),
      respectPortfolioHeat: saved.respectPortfolioHeat !== false,
      allowLosingTrades: saved.allowLosingTrades === true
    };
  }

  function initialTradeInfo(trade = {}) {
    const events = Array.isArray(trade.events) ? trade.events : [];
    const entryEvent = events.find(e => e.type === 'entry');
    const entry = finite(entryEvent?.price, finite(trade.execution_price, finite(trade.entry_price, finite(trade.entry, 0))));
    const initialStop = finite(entryEvent?.stop, finite(trade.stop_price, finite(trade.initialStop, 0)));
    const initialQty = Math.floor(finite(entryEvent?.qty, finite(trade.executed_quantity, finite(trade.planned_quantity, finite(trade.initialQty, 0)))));
    const direction = trade.direction === 'short' ? 'short' : 'long';
    const sign = direction === 'short' ? -1 : 1;
    const currentStop = finite(trade.currentStop, finite(trade.stop_price, initialStop));
    const currentPrice = finite(trade.currentPrice, finite(trade.execution_price, entry));
    const initialRiskPerUnit = Math.abs(entry - initialStop);
    const initialRiskCash = initialRiskPerUnit * initialQty;
    const currentR = initialRiskPerUnit > 0 ? (currentPrice - entry) * sign / initialRiskPerUnit : null;
    const breakevenProtected = (currentStop - entry) * sign >= -0.0001;

    // Scale-In events and exits
    const scaleIns = events.filter(e => e.type === 'scale_in');
    const scaleInQty = scaleIns.reduce((sum, e) => sum + (finite(e.qty, 0)), 0);
    const exits = events.filter(e => ['peeloff', 'close'].includes(e.type));
    const exitedQty = exits.reduce((sum, e) => sum + (finite(e.qty, 0)), 0);
    const totalBought = initialQty + scaleInQty;
    const remainingQty = Math.max(0, totalBought - exitedQty);

    // Calculate current weighted average entry price
    let currentAvgPrice = entry;
    if (finite(trade.average_entry_price, null) !== null) {
      currentAvgPrice = Number(trade.average_entry_price);
    } else if (totalBought > 0) {
      const totalBuyCost = (initialQty * entry) + scaleIns.reduce((sum, e) => sum + (finite(e.qty, 0) * finite(e.price, 0)), 0);
      currentAvgPrice = totalBuyCost / totalBought;
    }

    const currentAllocatedCapital = remainingQty * currentAvgPrice;

    // Remaining risk on original shares
    let originalRiskCash = 0;
    if (!breakevenProtected && initialQty > 0) {
      originalRiskCash = Math.max(0, (entry - currentStop) * sign * Math.min(initialQty, remainingQty));
    }

    // Risk on existing scale-ins
    let existingScaleInsRiskCash = 0;
    for (const sc of scaleIns) {
      const scPrice = finite(sc.price, 0);
      const scStop = finite(sc.stop, currentStop);
      const scRiskGap = (scPrice - scStop) * sign;
      if (scRiskGap > 0) {
        existingScaleInsRiskCash += scRiskGap * finite(sc.qty, 0);
      }
    }

    const currentRiskCash = originalRiskCash + existingScaleInsRiskCash;

    return {
      entry,
      initialStop,
      initialQty,
      direction,
      sign,
      currentStop,
      currentPrice,
      initialRiskPerUnit,
      initialRiskCash,
      currentR,
      breakevenProtected,
      scaleIns,
      scaleInCount: finite(trade.scale_in_count, scaleIns.length),
      scaleInEnabled: trade.scale_in_enabled !== false,
      exits,
      exitedQty,
      totalBought,
      remainingQty,
      currentAvgPrice,
      currentAllocatedCapital,
      currentRiskCash
    };
  }

  function calculateScaleInMetrics({ trade = {}, scaleIn = {}, equity = 1029500, policy = {}, openTrades = [] }) {
    const accEquity = Math.max(1, finite(equity, 1029500));
    const normalizedPolicy = Rubric && Rubric.normalizePolicy ? Rubric.normalizePolicy(policy) : { scaleIn: DEFAULT_SCALE_IN_CONFIG };
    const scaleConfig = settings(normalizedPolicy.scaleIn);
    const profile = Rubric && Rubric.profileFor ? Rubric.profileFor(normalizedPolicy, trade.riskProfile) : { capitalPct: 0.1, maximumPortfolioRiskPct: 0.125 };
    const info = initialTradeInfo(trade);

    const price = finite(scaleIn.price, info.currentPrice);
    const quantity = Math.max(0, Math.floor(finite(scaleIn.qty ?? scaleIn.quantity, 0)));
    const stop = finite(scaleIn.stop ?? scaleIn.stop_price, info.currentStop);

    // Additional risk from this addition
    const riskDistance = (price - stop) * info.sign;
    const additionalRiskCash = Math.max(0, riskDistance * quantity);
    const additionalRiskPct = accEquity > 0 ? (additionalRiskCash / accEquity) * 100 : 0;

    // Capital metrics
    const additionalCapital = price * quantity;
    const totalCapitalAfter = info.currentAllocatedCapital + additionalCapital;
    const maxCapitalAllowed = accEquity * (profile.capitalPct || 0.1);

    // Consolidated quantity and average price
    const newRemainingQty = info.remainingQty + quantity;
    const newTotalBought = info.totalBought + quantity;
    const newAvgPrice = newRemainingQty > 0
      ? (info.currentAllocatedCapital + additionalCapital) / newRemainingQty
      : price;

    // Total risk after scale-in
    const totalRiskCashAfter = info.currentRiskCash + additionalRiskCash;
    const totalRiskPctAfter = accEquity > 0 ? (totalRiskCashAfter / accEquity) * 100 : 0;

    // Portfolio Heat
    let currentHeatPct = 0;
    if (Array.isArray(openTrades) && openTrades.length > 0) {
      for (const op of openTrades) {
        if (op.mode === 'paper') continue;
        const opInfo = initialTradeInfo(op);
        const opRisk = Math.max(0, (opInfo.currentPrice - opInfo.currentStop) * opInfo.sign * opInfo.remainingQty);
        currentHeatPct += (opRisk / accEquity) * 100;
      }
    } else {
      currentHeatPct = (info.currentRiskCash / accEquity) * 100;
    }

    const projectedHeatPct = currentHeatPct + additionalRiskPct;
    const maxHeatPct = (profile.maximumPortfolioRiskPct || 0.125) * 100;

    const additionNumber = info.scaleInCount + 1;
    const targetTriggerR = additionNumber === 1
      ? scaleConfig.triggerR1
      : (additionNumber === 2
          ? scaleConfig.triggerR2
          : scaleConfig.triggerR2 + (additionNumber - 2) * 1.0);

    return {
      additionNumber,
      maxAdditions: scaleConfig.maxAdditions,
      currentR: info.currentR,
      minR: targetTriggerR,
      targetTriggerR,
      triggerR1: scaleConfig.triggerR1,
      triggerR2: scaleConfig.triggerR2,
      currentRiskCash: info.currentRiskCash,
      currentRiskPct: accEquity > 0 ? (info.currentRiskCash / accEquity) * 100 : 0,
      additionalRiskCash,
      additionalRiskPct,
      totalRiskCashAfter,
      totalRiskPctAfter,
      maxRiskPctAllowed: scaleConfig.maxRiskPct,
      currentCapital: info.currentAllocatedCapital,
      additionalCapital,
      totalCapitalAfter,
      maxCapitalAllowed,
      currentHeatPct,
      projectedHeatPct,
      maxHeatPct,
      currentQuantity: info.remainingQty,
      newQuantity: newRemainingQty,
      currentAvgPrice: info.currentAvgPrice,
      newAvgPrice,
      price,
      quantity,
      stop,
      breakevenProtected: info.breakevenProtected,
      scaleConfig,
      profile
    };
  }

  function canExecuteScaleIn({ trade = {}, scaleIn = {}, equity = 1029500, policy = {}, openTrades = [] }) {
    const normalizedPolicy = Rubric && Rubric.normalizePolicy ? Rubric.normalizePolicy(policy) : { scaleIn: DEFAULT_SCALE_IN_CONFIG };
    const scaleConfig = settings(normalizedPolicy.scaleIn);
    const info = initialTradeInfo(trade);
    const metrics = calculateScaleInMetrics({ trade, scaleIn, equity, policy: normalizedPolicy, openTrades });

    const checks = [
      {
        key: 'trigger',
        label: 'Trade atingiu o gatilho mínimo',
        passed: metrics.currentR !== null && metrics.currentR >= (metrics.targetTriggerR - 0.0001),
        detail: metrics.currentR !== null
          ? `${metrics.currentR >= 0 ? '+' : ''}${metrics.currentR.toFixed(2)}R (mínimo: +${metrics.targetTriggerR.toFixed(2)}R)`
          : 'Gatilho não atingido'
      },
      {
        key: 'breakeven',
        label: 'Stop da posição inicial protegido',
        passed: !scaleConfig.requireBreakeven || info.breakevenProtected,
        detail: info.breakevenProtected
          ? `Stop em R$ ${info.currentStop.toFixed(2)} protege entrada de R$ ${info.entry.toFixed(2)}`
          : `Stop em R$ ${info.currentStop.toFixed(2)} ainda abaixo da entrada (R$ ${info.entry.toFixed(2)})`
      },
      {
        key: 'additions',
        label: 'Limite de adições respeitado',
        passed: info.scaleInCount < scaleConfig.maxAdditions,
        detail: `${info.scaleInCount} de ${scaleConfig.maxAdditions} adição(ões) realizada(s)`
      },
      {
        key: 'capital',
        label: 'Capital máximo por trade respeitado',
        passed: metrics.maxCapitalAllowed > 0 ? metrics.totalCapitalAfter <= (metrics.maxCapitalAllowed + 0.01) : true,
        detail: `R$ ${Math.round(metrics.totalCapitalAfter).toLocaleString('pt-BR')} (limite: R$ ${Math.round(metrics.maxCapitalAllowed).toLocaleString('pt-BR')})`
      },
      {
        key: 'heat',
        label: 'Heat máximo do portfólio respeitado',
        passed: !scaleConfig.respectPortfolioHeat || (metrics.maxHeatPct > 0 ? metrics.projectedHeatPct <= (metrics.maxHeatPct + 0.001) : true),
        detail: `${metrics.projectedHeatPct.toFixed(2)}% (limite: ${metrics.maxHeatPct.toFixed(2)}%)`
      },
      {
        key: 'risk',
        label: 'Risco máximo permitido respeitado',
        passed: scaleConfig.maxRiskPct > 0 ? metrics.totalRiskPctAfter <= (scaleConfig.maxRiskPct + 0.001) : true,
        detail: `${metrics.totalRiskPctAfter.toFixed(2)}% (máximo: ${scaleConfig.maxRiskPct.toFixed(2)}%)`
      }
    ];

    // Priority rejection reasons
    let reason = null;

    if (trade.status && trade.status !== 'open') {
      reason = 'A gestão de Scale-In só está disponível para posições abertas.';
    } else if (info.remainingQty <= 0) {
      reason = 'A posição não possui unidades ativas restantes.';
    } else if (!scaleConfig.enabled || !info.scaleInEnabled) {
      reason = 'Scale-In desativado na Política de Risco.';
    } else if (!scaleConfig.allowLosingTrades && (metrics.currentR === null || metrics.currentR < 0 || (metrics.price - info.entry) * info.sign < 0)) {
      reason = 'Scale-In não é permitido em trades perdedores.';
    } else if (info.scaleInCount >= scaleConfig.maxAdditions) {
      reason = `Limite de ${scaleConfig.maxAdditions} adições já atingido para esta operação.`;
    } else if (metrics.currentR === null || metrics.currentR < (metrics.targetTriggerR - 0.0001)) {
      reason = `O trade ainda não atingiu o gatilho mínimo de +${metrics.targetTriggerR.toFixed(2)}R.`;
    } else if (scaleConfig.requireBreakeven && !info.breakevenProtected) {
      reason = 'O stop da posição inicial ainda não está protegido no breakeven.';
    } else if (scaleIn.quantity !== undefined && scaleIn.quantity <= 0) {
      reason = 'A quantidade para Scale-In deve ser maior que zero.';
    } else if (scaleIn.price !== undefined && scaleIn.stop !== undefined && (metrics.price - metrics.stop) * info.sign <= 0) {
      reason = 'O stop considerado precisa ser inferior ao preço de entrada para compras.';
    } else if (scaleConfig.respectPortfolioHeat && metrics.projectedHeatPct > (metrics.maxHeatPct + 0.001)) {
      reason = `Esta operação excederia o Heat Máximo do Portfólio de ${metrics.maxHeatPct.toFixed(2)}%.`;
    } else if (metrics.totalCapitalAfter > (metrics.maxCapitalAllowed + 0.01)) {
      reason = 'O Capital Máximo por Trade seria excedido.';
    } else if (scaleConfig.maxRiskPct > 0 && metrics.totalRiskPctAfter > (scaleConfig.maxRiskPct + 0.001)) {
      reason = `Risco total resultante de ${metrics.totalRiskPctAfter.toFixed(2)}% excederia o limite máximo autorizado de ${scaleConfig.maxRiskPct.toFixed(2)}%.`;
    }

    const allowed = reason === null && checks.every(c => c.passed);

    return {
      allowed,
      reason,
      checks,
      metrics
    };
  }

  function calculateConsolidatedPosition({ trade = {}, scaleIns = [], events = [] }) {
    const allEvents = Array.isArray(events) && events.length > 0 ? events : (trade.events || []);
    const entryEvent = allEvents.find(e => e.type === 'entry');
    const initialEntry = finite(entryEvent?.price, finite(trade.execution_price, finite(trade.entry_price, 0)));
    const initialQty = Math.floor(finite(entryEvent?.qty, finite(trade.executed_quantity, 0)));
    const initialStop = finite(entryEvent?.stop, finite(trade.stop_price, 0));
    const direction = trade.direction || 'long';
    const sign = direction === 'short' ? -1 : 1;

    const scaleInEvents = allEvents.filter(e => e.type === 'scale_in');
    const exits = allEvents.filter(e => ['peeloff', 'close'].includes(e.type));
    const exitedQty = exits.reduce((sum, e) => sum + (finite(e.qty, 0)), 0);

    const totalEnteredQty = initialQty + scaleInEvents.reduce((sum, e) => sum + (finite(e.qty, 0)), 0);
    const remainingQty = Math.max(0, totalEnteredQty - exitedQty);

    const totalCost = (initialQty * initialEntry) + scaleInEvents.reduce((sum, e) => sum + (finite(e.qty, 0) * finite(e.price, 0)), 0);
    const averageEntryPrice = totalEnteredQty > 0 ? totalCost / totalEnteredQty : initialEntry;
    const totalAllocatedCapital = remainingQty * averageEntryPrice;

    const currentPrice = finite(trade.currentPrice, initialEntry);
    const currentStop = finite(trade.currentStop, initialStop);
    const initialRiskPerUnit = Math.abs(initialEntry - initialStop);
    const initialRiskCash = initialRiskPerUnit * initialQty;
    const currentR = initialRiskPerUnit > 0 ? (currentPrice - initialEntry) * sign / initialRiskPerUnit : null;

    // Realized profit based on average entry price
    const realizedProfit = exits.reduce((sum, e) => sum + ((finite(e.price, averageEntryPrice) - averageEntryPrice) * sign * finite(e.qty, 0)), 0);
    const openProfit = (currentPrice - averageEntryPrice) * sign * remainingQty;
    const totalProfit = realizedProfit + openProfit;

    // Realized R and Total R relative to initial risk
    const realizedR = initialRiskCash > 0 ? realizedProfit / initialRiskCash : 0;
    const unrealizedR = initialRiskCash > 0 ? openProfit / initialRiskCash : 0;
    const totalR = initialRiskCash > 0 ? totalProfit / initialRiskCash : 0;

    return {
      initialEntry,
      initialStop,
      initialQty,
      initialRiskPerUnit,
      initialRiskCash,
      currentPrice,
      currentStop,
      currentR,
      scaleInCount: scaleInEvents.length,
      scaleIns: scaleInEvents,
      totalEnteredQty,
      remainingQty,
      exitedQty,
      averageEntryPrice,
      totalAllocatedCapital,
      realizedProfit,
      openProfit,
      totalProfit,
      realizedR,
      unrealizedR,
      totalR
    };
  }

  function calculateScaleInAnalytics(trades = []) {
    const closed = trades.filter(t => t.status === 'closed');
    const withScaleIn = [];
    const withoutScaleIn = [];

    for (const trade of closed) {
      const events = Array.isArray(trade.events) ? trade.events : [];
      const hasScaleIn = events.some(e => e.type === 'scale_in') || (Number(trade.scale_in_count || 0) > 0);
      const cons = calculateConsolidatedPosition({ trade, events });
      const record = {
        trade,
        result: cons.totalProfit,
        r: cons.totalR,
        scaleInCount: cons.scaleInCount,
        won: cons.totalProfit > 0
      };
      if (hasScaleIn) withScaleIn.push(record);
      else withoutScaleIn.push(record);
    }

    const calcGroup = items => {
      const count = items.length;
      const wins = items.filter(i => i.won);
      const losses = items.filter(i => i.result < 0);
      const winRate = count > 0 ? (wins.length / count) * 100 : 0;
      const totalResult = items.reduce((sum, i) => sum + i.result, 0);
      const avgResult = count > 0 ? totalResult / count : 0;
      const avgR = count > 0 ? items.reduce((sum, i) => sum + i.r, 0) / count : 0;
      const totalAdditions = items.reduce((sum, i) => sum + i.scaleInCount, 0);
      const avgAdditions = count > 0 ? totalAdditions / count : 0;
      return { count, winCount: wins.length, lossCount: losses.length, winRate, totalResult, avgResult, avgR, avgAdditions };
    };

    return {
      totalClosed: closed.length,
      withScaleIn: calcGroup(withScaleIn),
      withoutScaleIn: calcGroup(withoutScaleIn)
    };
  }

  return {
    DEFAULT_SCALE_IN_CONFIG,
    settings,
    initialTradeInfo,
    calculateScaleInMetrics,
    canExecuteScaleIn,
    calculateConsolidatedPosition,
    calculateScaleInAnalytics
  };
}));
