const crypto = require('node:crypto');
const database = require('./database');

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
  if (!/^[A-Z0-9]{4,12}$/.test(ticker)) throw invalid('Ticker inválido.');
  const entry = number(payload.entry ?? payload.entryPrice, 'Preço de entrada', { minimum: 0.000001, required: true });
  const stop = number(payload.stop ?? payload.stopPrice, 'Stop inicial', { minimum: 0.000001, required: true });
  const plannedQuantity = number(payload.suggestedQty ?? payload.plannedQuantity, 'Quantidade planejada', { minimum: 1, required: true });
  const riskPct = number(payload.riskPct, 'Risco-base', { minimum: 0, required: true });
  if (riskPct > 1) throw invalid('Risco-base é inválido.');
  const rubric = payload.rubricResponses && typeof payload.rubricResponses === 'object' ? payload.rubricResponses : {};
  const contributions = Array.isArray(payload.rubricContributions) ? payload.rubricContributions : [];
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
    rubricGrade: String(payload.grade || payload.rubricGrade || '').slice(0, 20) || null,
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
      mode: payload.mode === 'paper' ? 'paper' : 'real',
      thesis: String(payload.thesis || '').slice(0, 4000),
      executedQuantity: number(payload.executedQty, 'Quantidade da operação', { minimum: 1, required: true }),
      entryDate: String(payload.entryDate || '').slice(0, 10) || null,
      riskProfile: ['rampUp', 'standard'].includes(payload.riskProfile) ? payload.riskProfile : 'standard',
      marketFactor: number(payload.marketFactor, 'Multiplicador de mercado', { minimum: 0 })
    },
    entryTimestamp: entryTimestamp(payload.entryDate)
  };
}

async function createPlan(userId, payload) {
  const plan = normalizePlan(payload);
  const id = crypto.randomUUID();
  await database.transaction(async (client) => {
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
           'stop', e.stop_price, 'atr', e.atr, 'note', e.note, 'at', e.occurred_at
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
    event.price = number(payload.price, type === 'close' ? 'Preço de saída' : 'Preço da parcial', { minimum: 0.000001, required: true });
  }
  return event;
}

async function recordPositionEvent(userId, tradeId, type, payload) {
  if (!/^[0-9a-f-]{36}$/i.test(String(tradeId || ''))) throw invalid('Trade inválido.');
  const event = normalizePositionEvent(type, payload);
  return database.transaction(async (client) => {
    const current = await client.query(
      `SELECT id, status, executed_quantity FROM app.trades WHERE id = $1 AND user_id = $2 FOR UPDATE`,
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
    await client.query(
      `INSERT INTO app.trade_events (id, trade_id, event_type, quantity, price, stop_price, atr, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [crypto.randomUUID(), tradeId, event.type, event.quantity || null, event.price || null, event.stop || null, event.atr || null, event.note]
    );
    const shouldClose = event.type === 'close' && event.quantity === remaining;
    if (event.type === 'update') {
      await client.query(`UPDATE app.trades SET stop_price = $3, atr = COALESCE($4, atr) WHERE id = $1 AND user_id = $2`, [tradeId, userId, event.stop, event.atr]);
    } else if (shouldClose) {
      await client.query(`UPDATE app.trades SET status = 'closed' WHERE id = $1 AND user_id = $2`, [tradeId, userId]);
    }
    return { ...event, remaining: remaining - (event.quantity || 0), status: shouldClose ? 'closed' : 'open' };
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

module.exports = { createPlan, listPlans, executePlan, recordPositionEvent, normalizePlan, normalizeExecution, normalizePositionEvent, ratingFromValue };
