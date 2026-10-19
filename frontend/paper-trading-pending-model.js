/**
 * paper-trading-pending-model.js
 * 
 * Regras e modelo de domínio para Ordens e Posições Pendentes no Paper Trading.
 * Permite registrar oportunidades do Radar de Oportunidades antes da execução real,
 * avaliar automaticamente o pregão de fechamento de forma idempotente e segura,
 * e garantir isolamento estrito de métricas de risco e P&L.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PaperTradingPendingModel = factory();
  }
}(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';

  const DEFAULT_VALIDITY_SESSIONS = 1;
  const DEFAULT_LOT = 100;

  function toDateString(val) {
    if (!val) return '';
    if (typeof val === 'string') {
      const match = val.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  function roundLot(q, lot = DEFAULT_LOT) {
    const lotSize = Math.max(1, Number(lot) || DEFAULT_LOT);
    return Math.max(0, Math.floor(Number(q || 0) / lotSize) * lotSize);
  }

  /**
   * Calcula a quantidade recomendada para uma ordem pendente
   * com base no capital operacional, risco percentual e distância do stop.
   */
  function calculatePendingQuantity({ equity, riskPct, entry, stop, lot = DEFAULT_LOT }) {
    const eq = Number(equity) || 0;
    const rPct = Number(riskPct) || 0;
    const entryP = Number(entry) || 0;
    const stopP = Number(stop) || 0;
    const lotSize = Math.max(1, Number(lot) || DEFAULT_LOT);

    if (eq <= 0 || rPct <= 0 || entryP <= 0 || stopP <= 0) return 0;
    const stopDistance = Math.abs(entryP - stopP);
    if (stopDistance <= 0.000001) return 0;

    const maxRiskCapital = eq * rPct;
    const rawQty = maxRiskCapital / stopDistance;
    const rounded = Math.floor(rawQty / lotSize) * lotSize;

    if (rounded >= lotSize) return rounded;
    // Se o capital de risco autoriza menos de 1 lote padrão, usa unidades fracionárias se permitido ou pelo menos 1 lote mínimo se rawQty >= 1
    if (rawQty >= 1) return Math.floor(rawQty);
    return 0;
  }

  /**
   * Valida e normaliza o payload de criação de uma ordem pendente no Paper Trading.
   */
  function normalizePendingOrderPayload(payload = {}) {
    const ticker = String(payload.ticker || payload.symbol || payload.asset || '').trim().toUpperCase();
    if (!/^[A-Z0-9.\-]{3,12}$/.test(ticker)) {
      throw new Error('Ticker inválido para ordem pendente.');
    }

    const entry = Number(payload.entry ?? payload.entryPrice);
    if (!Number.isFinite(entry) || entry <= 0) {
      throw new Error('Preço de entrada deve ser maior que zero.');
    }

    const stop = Number(payload.stop ?? payload.stopPrice);
    if (!Number.isFinite(stop) || stop <= 0) {
      throw new Error('Stop inicial deve ser maior que zero.');
    }

    if (Math.abs(entry - stop) < 0.00001) {
      throw new Error('Preço de entrada e stop inicial não podem ser iguais.');
    }

    // No modelo Healthy Trend Trader, compras no Radar são long (Stop abaixo da entrada)
    const direction = ['long', 'short'].includes(payload.direction) ? payload.direction : 'long';
    if (direction === 'long' && stop >= entry) {
      throw new Error('Para compra (Long), o stop inicial deve estar abaixo do preço de entrada.');
    }

    const quantity = Math.floor(Number(payload.quantity ?? payload.plannedQuantity ?? payload.executedQty ?? 0));
    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new Error('Quantidade planejada deve ser um número inteiro de pelo menos 1 unidade.');
    }

    const rawTrigger = String(payload.setupTrigger || payload.triggerId || payload.setup || 'INSIDE_BAR').trim();
    let setupTrigger = rawTrigger.toUpperCase().replace(/\s+/g, '_');
    if (setupTrigger.includes('123') || setupTrigger.includes('1-2-3')) setupTrigger = '123_COMPRA';
    else if (setupTrigger.includes('PFR')) setupTrigger = 'PFR_COMPRA';
    else if (setupTrigger.includes('DAVE') || setupTrigger.includes('LANDRY')) setupTrigger = 'DAVE_LANDRY';
    else if (setupTrigger.includes('RBI') || setupTrigger.includes('VERMELHA')) setupTrigger = 'RBI';
    else if (setupTrigger.includes('INSIDE')) setupTrigger = 'INSIDE_BAR';

    const triggerLabels = {
      'INSIDE_BAR': 'Inside Bar',
      '123_COMPRA': '1-2-3 de Compra',
      'PFR_COMPRA': 'PFR de Compra',
      'DAVE_LANDRY': 'Dave Landry',
      'RBI': 'Barra Vermelha Ignorada (RBI)'
    };
    const setupLabel = payload.setup || triggerLabels[setupTrigger] || 'Setup Técnico';

    const signalDate = toDateString(payload.signalDate || payload.lastCandleDate || new Date());
    const validitySessions = Math.max(1, Math.floor(Number(payload.validitySessions) || DEFAULT_VALIDITY_SESSIONS));

    const notes = String(payload.notes || payload.thesis || '').trim().slice(0, 2000);
    const riskPct = Number.isFinite(Number(payload.riskPct)) ? Number(payload.riskPct) : 0.002;

    const snapshotMarketData = {
      signalDate,
      entry,
      stop,
      stopPct: entry > 0 ? Math.abs((entry - stop) / entry) * 100 : 0,
      lastPrice: Number(payload.lastPrice ?? payload.price ?? entry),
      grade: payload.grade || 'A',
      rubricScore: Number(payload.rubricScore) || 85,
      rsScore: Number(payload.rsScore) || 80,
      capturedAt: new Date().toISOString()
    };

    return {
      ticker,
      name: String(payload.name || ticker).trim(),
      market: String(payload.market || 'Ações').slice(0, 50),
      direction,
      setup: setupLabel,
      setupTrigger,
      entry,
      stop,
      quantity,
      riskPct,
      notes,
      signalDate,
      validitySessions,
      snapshotMarketData
    };
  }

  /**
   * Verifica o status de uma ordem pendente contra as cotações diárias após o sinal.
   * 
   * Retorna um objeto com a decisão:
   * - outcome: 'EXECUTED' | 'EXPIRED' | 'CONFLICT_SAME_CANDLE' | 'PENDING' | 'ALREADY_PROCESSED'
   * - status: 'open' | 'cancelled' | 'pending'
   * - executionPrice
   * - executedQuantity
   * - executedAt
   * - reason
   * - dataSnapshot: dados do candle que fundamentou a decisão
   */
  function verifyPendingOrder(order, candles = [], options = {}) {
    if (!order || typeof order !== 'object') {
      return { outcome: 'INVALID_ORDER', status: 'error', reason: 'Dados da ordem pendente inválidos.' };
    }

    const currentStatus = String(order.status || '').trim().toLowerCase();
    if (currentStatus !== 'pending') {
      return {
        outcome: 'ALREADY_PROCESSED',
        status: currentStatus,
        reason: `Ordem não está mais pendente (status atual: ${currentStatus}).`
      };
    }

    const signalDate = toDateString(order.signalDate || order.pending_snapshot?.signalDate || order.metadata?.signalDate || order.created_at);
    const entryPrice = Number(order.entry_price ?? order.entry ?? order.pending_snapshot?.plannedEntry);
    const stopPrice = Number(order.stop_price ?? order.stop ?? order.pending_snapshot?.plannedStop);
    const plannedQuantity = Number(order.planned_quantity ?? order.quantity ?? order.pending_snapshot?.plannedQuantity ?? 0);
    const validitySessions = Math.max(1, Number(order.validitySessions ?? order.pending_snapshot?.validitySessions ?? DEFAULT_VALIDITY_SESSIONS));

    if (!signalDate || !Number.isFinite(entryPrice) || !Number.isFinite(stopPrice) || entryPrice <= 0 || stopPrice <= 0) {
      return {
        outcome: 'INCOMPLETE_DATA',
        status: 'pending',
        reason: 'Ordem pendente com parâmetros insuficientes para verificação técnica.'
      };
    }

    if (!Array.isArray(candles) || candles.length === 0) {
      return {
        outcome: 'PENDING',
        status: 'pending',
        reason: 'Histórico de mercado indisponível no momento. Mantida pendente com segurança.'
      };
    }

    // Normaliza candles cronologicamente
    const normalizedCandles = candles
      .filter(c => c && (c.time || c.date))
      .map(c => ({
        date: toDateString(c.time || c.date),
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume || 0)
      }))
      .filter(c => c.date && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Filtra candles estritamente posteriores ao sinal do Radar
    const candidateCandles = normalizedCandles.filter(c => c.date > signalDate);

    if (candidateCandles.length === 0) {
      return {
        outcome: 'PENDING',
        status: 'pending',
        reason: `Aguardando fechamento do pregão posterior ao sinal (${signalDate}).`
      };
    }

    // Avalia o primeiro pregão da janela de validade (ou os pregões até o limite da validade)
    for (let i = 0; i < candidateCandles.length && i < validitySessions; i++) {
      const candle = candidateCandles[i];
      const isLastValidSession = (i === validitySessions - 1) || (i === candidateCandles.length - 1 && candidateCandles.length >= validitySessions);

      const hitEntry = candle.high >= entryPrice;
      const hitStop = candle.low <= stopPrice;

      // 1. Caso Ambíguo / Conflito no mesmo candle:
      // Se entrada e stop foram atingidos na mesma sessão diária, não presumir execução favorável!
      // Regra conservadora documental: invalida a operação e descarta a ordem pendente.
      if (hitEntry && hitStop) {
        return {
          outcome: 'CONFLICT_SAME_CANDLE',
          status: 'cancelled',
          discardReason: 'Conflito intradiário: preço de entrada e stop inicial foram atingidos no mesmo pregão. Posição descartada por prudência operacional.',
          reason: `Conflito intradiário no pregão de ${candle.date}: Máxima (R$ ${candle.high.toFixed(2)}) >= Entrada (R$ ${entryPrice.toFixed(2)}) e Mínima (R$ ${candle.low.toFixed(2)}) <= Stop (R$ ${stopPrice.toFixed(2)}). Posição descartada por prudência.`,
          sessionDate: candle.date,
          dataSnapshot: candle,
          isExecuted: false,
          isDiscarded: true
        };
      }

      // 2. Execução confirmada com sucesso:
      // Atingiu ou superou o preço de compra e NÃO violou o stop.
      if (hitEntry && !hitStop) {
        // Se abriu em gap acima da entrada, executa no preço de abertura; caso contrário, no preço do gatilho
        const executionPrice = candle.open >= entryPrice ? candle.open : entryPrice;
        return {
          outcome: 'EXECUTED',
          status: 'open',
          executionPrice,
          executedQuantity: plannedQuantity,
          executedAt: candle.date,
          reason: `Entrada executada no pregão de ${candle.date}. Preço executado: R$ ${executionPrice.toFixed(2)} (Máx: R$ ${candle.high.toFixed(2)}, Mín: R$ ${candle.low.toFixed(2)}).`,
          sessionDate: candle.date,
          dataSnapshot: candle,
          isExecuted: true,
          isDiscarded: false
        };
      }

      // 3. Entrada não atingida neste pregão:
      // Se este era o último pregão da janela de validade, expira e remove.
      if (!hitEntry && isLastValidSession) {
        return {
          outcome: 'EXPIRED',
          status: 'cancelled',
          discardReason: 'Validade expirada: preço de entrada não foi atingido durante a janela do gatilho.',
          reason: `Entrada não executada: máxima de R$ ${candle.high.toFixed(2)} no pregão de ${candle.date} não atingiu o preço planejado de R$ ${entryPrice.toFixed(2)}. Ordem pendente expirada.`,
          sessionDate: candle.date,
          dataSnapshot: candle,
          isExecuted: false,
          isDiscarded: true
        };
      }
    }

    // Se ainda está dentro da janela de validade e nenhum pregão atingiu a entrada nem expirou
    return {
      outcome: 'PENDING',
      status: 'pending',
      reason: 'Ordem pendente permanece válida aguardando execução nas próximas sessões autorizadas.',
      candidateCount: candidateCandles.length
    };
  }

  /**
   * Sanitiza métricas operacionais para posições pendentes.
   * Assegura que posições com status 'pending' não adicionem risco, heat ou P&L.
   */
  function sanitizePendingMetrics(position, baseMetrics = {}) {
    if (!position || (position.status !== 'pending' && !position.isPending)) {
      return baseMetrics;
    }
    return {
      ...baseMetrics,
      remaining: Number(position.planned_quantity || position.initialQty || 0),
      totalBought: 0,
      avgEntry: Number(position.entry_price || position.entry || 0),
      realized: 0,
      open: 0,
      total: 0,
      risk: 0,
      riskPct: 0,
      partials: 0,
      scaleIns: 0,
      closed: false,
      isPending: true
    };
  }

  return {
    DEFAULT_VALIDITY_SESSIONS,
    DEFAULT_LOT,
    toDateString,
    roundLot,
    calculatePendingQuantity,
    normalizePendingOrderPayload,
    verifyPendingOrder,
    sanitizePendingMetrics
  };
}));
