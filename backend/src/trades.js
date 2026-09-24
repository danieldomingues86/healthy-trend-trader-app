const crypto = require('node:crypto');
const database = require('./database');
const management = require('../../frontend/position-management-model');
const rubricModel = require('../../frontend/trading-rubrics');
const assetBlacklist = require('./asset-blacklist');

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function number(value, field, { minimum = 0, required = false } = {}) {
  if (value === '' || value == null) {
    if (required) throw invalid(`${field} é obrigatório.`);
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum) throw invalid(`${field} é inválido.`);
  return parsed;
}

function ratingFromValue(value) {
  const score = Number(value);
  if (score >= 2) return 'good';
  if (score >= 1) return 'medium';
  return 'bad';
}

function entryTimestamp(value) {
  if (value == null || value === '') return new Date().toISOString();
  const date = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw invalid('Data de entrada é inválida.');
  const timestamp = new Date(date + 'T12:00:00-03:00');
  if (Number.isNaN(timestamp.getTime())) throw invalid('Data de entrada é inválida.');
  return timestamp.toISOString();
}

function normalizePlan(payload = {}) {
  const ticker = String(payload.asset || payload.ticker || '').trim().toUpperCase();
  if (!/^[A-Z0-9.\-]{2,20}$/.test(ticker)) throw invalid('Ticker inválido.');
  const entry = number(payload.entry ?? payload.entryPrice, 'Preço de entrada', { minimum: 0.000001, required: true });
  const stop = number(payload.stop ?? payload.stopPrice, 'Stop inicial', { minimum: 0.000001, required: true });
  const plannedQuantity = number(payload.suggestedQty ?? payload.plannedQuantity, 'Quantidade planejada', { minimum: 1, required: true });
  const riskPct = number(payload.executableRiskPct ?? payload.riskPct, 'Risco executável', { minimum: 0, required: true });
  const riskBudgetPct = number(payload.riskBudgetPct, 'Orçamento de risco', { minimum: 0 });
  if (riskPct > 1) throw invalid('Risco executável é inválido.');
  if (riskBudgetPct != null && riskBudgetPct > 1) throw invalid('Orçamento de risco é inválido.');
  const rubric = payload.rubricResponses && typeof payload.rubricResponses === 'object' ? payload.rubricResponses : {};
  const contributions = Array.isArray(payload.rubricContributions) ? payload.rubricContributions : [];
  const rubricGrade = String(payload.grade || payload.rubricGrade || '').trim();
  if (!['A', 'B', 'C', 'D'].includes(rubricGrade)) throw invalid('Grade da Rubric inválido. Reavalie o trade com a classificação atual.');
  return {
    ticker,
    market: String(payload.market || '').slice(0, 50) || null,
    direction: ['long', 'short'].includes(payload.direction) ? payload.direction : null,
    setup: String(payload.setup || '').slice(0, 100) || null,
    entry,
    stop,
    atr: number(payload.atr, 'ATR', { minimum: 0 }),
    plannedQuantity,
    riskPct,
    rubricScore: number(payload.rubricScore, 'Score da Rubric', { minimum: -1000 }),
    rubricMaxScore: number(payload.rubricMaxScore, 'Score máximo da Rubric', { minimum: 0 }),
    rubricGrade,
    rubricResponses: rubric,
    contributions: contributions
      .filter((item) => item && typeof item.key === 'string')
      .map((item) => ({
        key: item.key.slice(0, 80),
        rating: ['bad', 'medium', 'good'].includes(item.selectedRating) ? item.selectedRating : ratingFromValue(item.value),
        score: number(item.points, 'Pontuação da Rubric', { minimum: -1000, required: true }),
        maxScore: Math.max(0, Number(item.weight || 0) * 2)
      })),
    metadata: {
      gradingVersion: 2,
      mode: payload.mode === 'paper' ? 'paper' : 'real',
      thesis: String(payload.thesis || '').slice(0, 4000),
      executedQuantity: number(payload.executedQty, 'Quantidade da operação', { minimum: 1, required: true }),
      entryDate: String(payload.entryDate || '').slice(0, 10) || null,
      riskProfile: ['rampUp', 'standard'].includes(payload.riskProfile) ? payload.riskProfile : 'standard',
      marketFactor: number(payload.marketFactor, 'Multiplicador de mercado', { minimum: 0 }),
      riskBudgetPct,
      executableRiskPct: riskPct,
      limitingLayer: String(payload.limitingLayer || '').slice(0, 40) || null,
      limitingLayerName: String(payload.limitingLayerName || '').slice(0, 120) || null,
      blacklistOverride: payload.blacklistOverride === true
    },
    entryTimestamp: entryTimestamp(payload.entryDate)
  };
}

function validateRareTrade(plan, policy) {
  if (plan.rubricGrade !== 'A') return;
  const verified = rubricModel.calculateRubric(plan.rubricResponses, policy);
  if (!verified.qualityAllowed || Math.abs(verified.score - plan.rubricScore) > 0.11) {
    throw invalid('Grade A exige score de pelo menos 95 e excelência em todos os critérios da Rubric. Reavalie o trade.');
  }
}

async function createPlan(userId, payload) {
  const plan = normalizePlan(payload);
  const id = crypto.randomUUID();
  await database.transaction(async (client) => {
    const restriction = await assetBlacklist.find(userId, plan.ticker, plan.market, client);
    if (restriction?.restrictionLevel === 'block') throw invalid(`${plan.ticker} está bloqueado na sua Blacklist. Consulte a regra pessoal antes de operar.`);
    if (restriction?.restrictionLevel === 'alert' && !plan.metadata.blacklistOverride) throw invalid(`${plan.ticker} está na sua Blacklist. Confirme conscientemente antes de continuar.`);
    if (!restriction) plan.metadata.blacklistOverride = false;
    if (plan.rubricGrade === 'A') {
      const savedPolicy = await client.query('SELECT policy FROM app.risk_policies WHERE user_id = $1', [userId]);
      validateRareTrade(plan, savedPolicy.rows[0]?.policy);
    }
    await client.query(
      `INSERT INTO app.trades (
        id, user_id, ticker, market, direction, setup, entry_price, stop_price, atr,
        planned_quantity, risk_pct, rubric_score, rubric_max_score, rubric_grade,
        rubric_responses, status, metadata, execution_price, executed_quantity, executed_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15::jsonb, 'open', $16::jsonb, $7, $17, $18
      )`,
      [id, userId, plan.ticker, plan.market, plan.direction, plan.setup, plan.entry, plan.stop, plan.atr,
        plan.plannedQuantity, plan.riskPct, plan.rubricScore, plan.rubricMaxScore, plan.rubricGrade,
        JSON.stringify(plan.rubricResponses), JSON.stringify(plan.metadata), plan.metadata.executedQuantity, plan.entryTimestamp]
    );
    for (const item of plan.contributions) {
      await client.query(
        `INSERT INTO app.trade_rubric_ratings (id, trade_id, criterion_key, selected_rating, score, max_score)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), id, item.key, item.rating, item.score, item.maxScore]
      );
    }
    await client.query(
      `INSERT INTO app.trade_events (id, trade_id, event_type, quantity, price, stop_price, atr, note, occurred_at)
       VALUES ($1, $2, 'entry', $3, $4, $5, $6, $7, $8)`,
      [crypto.randomUUID(), id, plan.metadata.executedQuantity, plan.entry, plan.stop, plan.atr,
        plan.metadata.executedQuantity === plan.plannedQuantity ? 'Trade registrado conforme quantidade sugerida.' : `Quantidade registrada diferente da sugestão: ${plan.plannedQuantity} unidades.`, plan.entryTimestamp]
    );
  });
  return { id, ticker: plan.ticker, status: 'open', rubricGrade: plan.rubricGrade, executionPrice: plan.entry, executedQuantity: plan.metadata.executedQuantity };
}

async function listPlans(userId) {
  const result = await database.query(
    `SELECT t.id, t.ticker, t.market, t.direction, t.setup, t.entry_price, t.stop_price, t.atr, t.planned_quantity,
            t.risk_pct, t.rubric_score, t.rubric_max_score, t.rubric_grade, t.rubric_responses, t.status, t.metadata,
            t.execution_price, t.executed_quantity, t.executed_at, t.created_at, t.updated_at,
            COALESCE(events.items, '[]'::jsonb) AS events
       FROM app.trades t
       LEFT JOIN LATERAL (
         SELECT jsonb_agg(jsonb_build_object(
           'id', e.id, 'type', e.event_type, 'qty', e.quantity, 'price', e.price,
           'stop', e.stop_price, 'atr', e.atr, 'note', e.note, 'at', e.occurred_at, 'context', e.context
         ) ORDER BY e.occurred_at, e.created_at) AS items
         FROM app.trade_events e WHERE e.trade_id = t.id
       ) events ON true
       WHERE t.user_id = $1 ORDER BY t.created_at DESC`,
    [userId]
  );
  return result.rows;
}

function normalizePositionEvent(type, payload = {}) {
  if (!['update', 'peeloff', 'close'].includes(type)) throw invalid('Tipo de evento inválido.');
  const event = { type, note: String(payload.note || '').slice(0, 4000) };
  if (type === 'update') {
    event.price = number(payload.price, 'Preço atual', { minimum: 0.000001, required: true });
    event.stop = number(payload.stop, 'Novo stop', { minimum: 0.000001, required: true });
    event.atr = number(payload.atr, 'ATR atual', { minimum: 0 });
  } else {
    event.quantity = number(payload.qty ?? payload.quantity, 'Quantidade', { minimum: 1, required: true });
    if (!Number.isSafeInteger(event.quantity)) throw invalid('Quantidade deve ser um número inteiro de unidades.');
    event.price = number(payload.price, type === 'close' ? 'Preço de saída' : 'Preço da parcial', { minimum: 0.000001, required: true });
  }
  if (payload.occurredAt != null && payload.occurredAt !== '') {
    const date = new Date(payload.occurredAt);
    if (Number.isNaN(date.getTime())) throw invalid('Data/hora da parcial é inválida.');
    event.occurredAt = date.toISOString();
  }
  return event;
}

async function recordPositionEvent(userId, tradeId, type, payload) {
  if (!/^[0-9a-f-]{36}$/i.test(String(tradeId || ''))) throw invalid('Trade inválido.');
  const event = normalizePositionEvent(type, payload);
  return database.transaction(async (client) => {
    const current = await client.query(
      `SELECT id, status, executed_quantity, execution_price, entry_price, stop_price, direction FROM app.trades WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [tradeId, userId]
    );
    if (!current.rowCount) throw invalid('Trade não encontrado.');
    if (current.rows[0].status !== 'open') throw invalid('A gestão só está disponível para posições abertas.');
    const exits = await client.query(
      `SELECT COALESCE(SUM(quantity), 0) AS total FROM app.trade_events
        WHERE trade_id = $1 AND event_type IN ('peeloff', 'close')`, [tradeId]
    );
    const remaining = Number(current.rows[0].executed_quantity) - Number(exits.rows[0].total);
    if (event.quantity && event.quantity > remaining) throw invalid('A quantidade precisa ser menor ou igual ao saldo da posição.');
    if (event.type === 'peeloff' && event.quantity >= remaining) throw invalid('Para encerrar toda a posição, registre um encerramento.');
    const history = await client.query(
      `SELECT event_type AS type, quantity AS qty, price, stop_price AS stop, context
         FROM app.trade_events WHERE trade_id = $1 ORDER BY occurred_at, created_at`, [tradeId]
    );
    const trade = current.rows[0];
    const entryEvent = history.rows.find(item => item.type === 'entry');
    const events = entryEvent ? history.rows : [{ type: 'entry', qty: trade.executed_quantity, price: trade.execution_price ?? trade.entry_price, stop: trade.stop_price }, ...history.rows];
    const entry = Number(entryEvent?.price ?? trade.execution_price ?? trade.entry_price);
    const currentPrice = Number([...events].reverse().find(item => Number(item.price) > 0)?.price ?? entry);
    const basis = { entry, initialStop: Number(entryEvent?.stop ?? trade.stop_price), initialQty: Number(entryEvent?.qty ?? trade.executed_quantity),
      direction: trade.direction || 'long', currentPrice, currentStop: Number(trade.stop_price), events };
    const before = management.state(basis, management.metricsFromEvents(basis));
    const afterEvents = [...events, { type: event.type, qty: event.quantity, price: event.price, stop: event.stop }];
    const next = { ...basis, currentPrice: event.price, currentStop: event.stop ?? basis.currentStop, events: afterEvents };
    const after = management.state(next, management.metricsFromEvents(next));
    const r = after.currentR;
    if (event.type === 'peeloff' && payload?.source === 'sell_into_strength') {
      const policy = await client.query('SELECT policy FROM app.risk_policies WHERE user_id = $1', [userId]);
      const sell = management.settings(policy.rows[0]?.policy?.sellIntoStrength);
      if (!sell.enabled || r == null || r < sell.startR) throw invalid('Sell Into Strength só está disponível na zona configurada.');
    }
    const historicalR = events.map(item => management.currentR({ ...basis, currentPrice: Number(item.price) || entry })).filter(Number.isFinite);
    const previousPeak = Math.max(...historicalR, -Infinity);
    const previousTrough = Math.min(...historicalR, Infinity);
    const milestones = [2, 3].filter(level => r != null && r >= level && previousPeak < level).map(level => `${level}R`);
    const source = event.type === 'peeloff' && payload?.source === 'sell_into_strength' ? 'sell_into_strength' : event.type === 'peeloff' ? 'risk_peel' : event.type;
    const partialProfit = event.quantity ? (event.price - entry) * (basis.direction === 'short' ? -1 : 1) * event.quantity : 0;
    const context = {
      source, rAtEvent: r, rAtExit: event.quantity ? r : null,
      percentRealized: event.quantity ? event.quantity / remaining * 100 : null,
      partialProfit, totalRealizedProfit: after.realizedProfit,
      runnerProfit: event.type === 'close' && event.quantity === remaining && before.runner ? partialProfit : null,
      remainingQuantity: after.remaining, ongoingRisk: after.ongoingRisk,
      freeRollCoverage: Number.isFinite(after.coverage) ? after.coverage : null,
      freeRollActivated: !before.freeRoll && after.freeRoll,
      freeRollActive: after.freeRoll, peakR: Math.max(previousPeak, r ?? -Infinity),
      troughR: Math.min(previousTrough, r ?? Infinity), milestones
    };
    await client.query(
      `INSERT INTO app.trade_events (id, trade_id, event_type, quantity, price, stop_price, atr, note, context, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, COALESCE($10::timestamptz, now()))`,
      [crypto.randomUUID(), tradeId, event.type, event.quantity || null, event.price, event.stop || null, event.atr || null, event.note, JSON.stringify(context), event.occurredAt || null]
    );
    const shouldClose = event.type === 'close' && event.quantity === remaining;
    if (event.type === 'update') {
      await client.query(`UPDATE app.trades SET stop_price = $3, atr = COALESCE($4, atr) WHERE id = $1 AND user_id = $2`, [tradeId, userId, event.stop, event.atr]);
    } else if (shouldClose) {
      await client.query(`UPDATE app.trades SET status = 'closed' WHERE id = $1 AND user_id = $2`, [tradeId, userId]);
    }
    return { ...event, context, remaining: remaining - (event.quantity || 0), status: shouldClose ? 'closed' : 'open' };
  });
}

function normalizeExecution(payload = {}) {
  return {
    quantity: number(payload.executedQty ?? payload.executedQuantity, 'Quantidade executada', { minimum: 1, required: true }),
    price: number(payload.executionPrice ?? payload.execution_price, 'Preço de execução', { minimum: 0.000001, required: true })
  };
}

async function executePlan(userId, tradeId, payload) {
  if (!/^[0-9a-f-]{36}$/i.test(String(tradeId || ''))) throw invalid('Plano inválido.');
  const execution = normalizeExecution(payload);
  return database.transaction(async (client) => {
    const current = await client.query(
      `SELECT id, ticker, status, planned_quantity, metadata
         FROM app.trades WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [tradeId, userId]
    );
    if (!current.rowCount) throw invalid('Plano não encontrado.');
    if (current.rows[0].status !== 'planned') throw invalid('Este plano já foi executado ou não está disponível.');
    const result = await client.query(
      `UPDATE app.trades
          SET status = 'open', execution_price = $3, executed_quantity = $4, executed_at = now(),
              metadata = jsonb_set(metadata, '{executedQuantity}', to_jsonb($4::numeric), true)
        WHERE id = $1 AND user_id = $2
        RETURNING id, ticker, status, execution_price, executed_quantity, executed_at`,
      [tradeId, userId, execution.price, execution.quantity]
    );
    return result.rows[0];
  });
}

module.exports = { createPlan, listPlans, executePlan, recordPositionEvent, normalizePlan, validateRareTrade, normalizeExecution, normalizePositionEvent, ratingFromValue };
