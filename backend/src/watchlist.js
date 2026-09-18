const crypto = require('node:crypto');
const database = require('./database');

function ticker(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!/^[A-Z]{4}\d{1,2}$/.test(normalized)) {
    const error = new Error('Ticker inválido.');
    error.status = 400;
    throw error;
  }
  return normalized;
}

function normalizeJson(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return fallback; }
  }
  return val;
}

function mergeSources(existingSources, newOrigin) {
  const normalizedOrigin = String(newOrigin || 'manual').trim().toLowerCase();
  const list = Array.isArray(existingSources) ? [...existingSources] : [];
  if (!list.some(s => s && s.origin === normalizedOrigin)) {
    list.push({ origin: normalizedOrigin, date: new Date().toISOString() });
  }
  return list;
}

function normalizeOpportunityPayload(symbol, payload = {}) {
  const validTicker = ticker(symbol);
  const origin = String(payload.origin || 'manual').trim().toLowerCase();
  const status = String(payload.status || 'observando').trim().toLowerCase();
  const thesis = typeof payload.thesis === 'string' ? payload.thesis.trim() : null;
  const snapshot = normalizeJson(payload.snapshot, {});
  const waitingConditions = normalizeJson(payload.waiting_conditions, []);
  const whyObserving = normalizeJson(payload.why_observing, []);
  const initialSource = { origin, date: new Date().toISOString() };
  return {
    ticker: validTicker,
    origin,
    status,
    thesis,
    snapshot,
    waitingConditions,
    whyObserving,
    sources: [initialSource]
  };
}

async function list(userId) {
  const result = await database.query(
    `SELECT id, ticker, origin, status, thesis, snapshot, waiting_conditions, why_observing, sources, history, created_at, updated_at
     FROM app.watchlist_items
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map(row => ({
    ...row,
    snapshot: normalizeJson(row.snapshot, {}),
    waiting_conditions: normalizeJson(row.waiting_conditions, []),
    why_observing: normalizeJson(row.why_observing, []),
    sources: normalizeJson(row.sources, []),
    history: normalizeJson(row.history, [])
  }));
}

async function add(userId, value, payload = {}) {
  const symbol = ticker(value);
  const origin = String(payload.origin || 'manual').trim().toLowerCase();
  const status = String(payload.status || 'observando').trim().toLowerCase();
  const thesis = typeof payload.thesis === 'string' ? payload.thesis.trim() : null;
  const snapshot = normalizeJson(payload.snapshot, {});
  const waitingConditions = normalizeJson(payload.waiting_conditions, []);
  const whyObserving = normalizeJson(payload.why_observing, []);
  const initialSource = { origin, date: new Date().toISOString() };
  const sources = [initialSource];

  // Check if ticker already exists for this user
  const existing = await database.query(
    'SELECT id, snapshot, sources, origin, status, thesis, waiting_conditions, why_observing, history, created_at FROM app.watchlist_items WHERE user_id = $1 AND ticker = $2',
    [userId, symbol]
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    const existingSources = normalizeJson(row.sources, []);
    const mergedSources = [...existingSources];
    if (!mergedSources.some(s => s.origin === origin)) {
      mergedSources.push(initialSource);
    }

    const updatedThesis = thesis || row.thesis;
    const updatedStatus = payload.status ? status : row.status;
    const updatedWaiting = waitingConditions.length ? waitingConditions : normalizeJson(row.waiting_conditions, []);
    const updatedWhy = whyObserving.length ? whyObserving : normalizeJson(row.why_observing, []);

    const updated = await database.query(
      `UPDATE app.watchlist_items
       SET sources = $1, thesis = $2, status = $3, waiting_conditions = $4, why_observing = $5, updated_at = now()
       WHERE user_id = $6 AND ticker = $7
       RETURNING id, ticker, origin, status, thesis, snapshot, waiting_conditions, why_observing, sources, history, created_at, updated_at`,
      [
        JSON.stringify(mergedSources),
        updatedThesis,
        updatedStatus,
        JSON.stringify(updatedWaiting),
        JSON.stringify(updatedWhy),
        userId,
        symbol
      ]
    );
    const res = updated.rows[0];
    return {
      ...res,
      snapshot: normalizeJson(res.snapshot, {}),
      waiting_conditions: normalizeJson(res.waiting_conditions, []),
      why_observing: normalizeJson(res.why_observing, []),
      sources: normalizeJson(res.sources, []),
      history: normalizeJson(res.history, [])
    };
  }

  const result = await database.query(
    `INSERT INTO app.watchlist_items (
      id, user_id, ticker, origin, status, thesis, snapshot, waiting_conditions, why_observing, sources, history, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
    RETURNING id, ticker, origin, status, thesis, snapshot, waiting_conditions, why_observing, sources, history, created_at, updated_at`,
    [
      crypto.randomUUID(),
      userId,
      symbol,
      origin,
      status,
      thesis,
      JSON.stringify(snapshot),
      JSON.stringify(waitingConditions),
      JSON.stringify(whyObserving),
      JSON.stringify(sources),
      JSON.stringify([])
    ]
  );
  const res = result.rows[0];
  return {
    ...res,
    snapshot: normalizeJson(res.snapshot, {}),
    waiting_conditions: normalizeJson(res.waiting_conditions, []),
    why_observing: normalizeJson(res.why_observing, []),
    sources: normalizeJson(res.sources, []),
    history: normalizeJson(res.history, [])
  };
}

async function update(userId, value, payload = {}) {
  const symbol = ticker(value);
  const fields = [];
  const values = [];
  let idx = 1;

  if (payload.status) {
    fields.push(`status = $${idx++}`);
    values.push(String(payload.status).trim().toLowerCase());
  }
  if (payload.thesis !== undefined) {
    fields.push(`thesis = $${idx++}`);
    values.push(payload.thesis);
  }
  if (payload.waiting_conditions !== undefined) {
    fields.push(`waiting_conditions = $${idx++}`);
    values.push(JSON.stringify(normalizeJson(payload.waiting_conditions, [])));
  }
  if (payload.why_observing !== undefined) {
    fields.push(`why_observing = $${idx++}`);
    values.push(JSON.stringify(normalizeJson(payload.why_observing, [])));
  }
  if (payload.history !== undefined) {
    fields.push(`history = $${idx++}`);
    values.push(JSON.stringify(normalizeJson(payload.history, [])));
  }

  fields.push('updated_at = now()');
  values.push(userId, symbol);

  const queryStr = `UPDATE app.watchlist_items SET ${fields.join(', ')} WHERE user_id = $${idx++} AND ticker = $${idx} RETURNING *`;
  const result = await database.query(queryStr, values);
  if (!result.rows.length) {
    const err = new Error('Ativo não encontrado na watchlist.');
    err.status = 404;
    throw err;
  }
  const row = result.rows[0];
  return {
    ...row,
    snapshot: normalizeJson(row.snapshot, {}),
    waiting_conditions: normalizeJson(row.waiting_conditions, []),
    why_observing: normalizeJson(row.why_observing, []),
    sources: normalizeJson(row.sources, []),
    history: normalizeJson(row.history, [])
  };
}

async function archive(userId, value, payload = {}) {
  const symbol = ticker(value);
  const existing = await database.query(
    'SELECT * FROM app.watchlist_items WHERE user_id = $1 AND ticker = $2',
    [userId, symbol]
  );
  if (!existing.rows.length) {
    const err = new Error('Ativo não encontrado na watchlist.');
    err.status = 404;
    throw err;
  }
  const item = existing.rows[0];
  const exitReason = String(payload.exit_reason || 'Removido').trim();
  const turnedTrade = Boolean(payload.turned_trade);
  const finalSnapshot = normalizeJson(payload.final_snapshot, normalizeJson(item.snapshot, {}));

  await database.query(
    `INSERT INTO app.watchlist_archive (
      id, user_id, ticker, origin, sources, thesis, initial_snapshot, final_snapshot, exit_reason, turned_trade, entered_at, exited_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())`,
    [
      crypto.randomUUID(),
      userId,
      symbol,
      item.origin,
      item.sources,
      item.thesis,
      item.snapshot,
      JSON.stringify(finalSnapshot),
      exitReason,
      turnedTrade,
      item.created_at
    ]
  );

  await database.query('DELETE FROM app.watchlist_items WHERE user_id = $1 AND ticker = $2', [userId, symbol]);
  return { ticker: symbol, archived: true, exitReason, turnedTrade };
}

async function remove(userId, value) {
  const symbol = ticker(value);
  await database.query('DELETE FROM app.watchlist_items WHERE user_id = $1 AND ticker = $2', [userId, symbol]);
  return { ticker: symbol };
}

module.exports = { list, add, update, archive, remove, ticker, mergeSources, normalizeOpportunityPayload };
