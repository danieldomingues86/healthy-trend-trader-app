const crypto = require('node:crypto');
const database = require('./database');
const model = require('../../frontend/market-pause-model');

function invalid(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function map(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    reason: row.reason,
    startDate: row.start_date instanceof Date ? row.start_date.toISOString().slice(0, 10) : String(row.start_date || '').slice(0, 10),
    expectedReturnDate: row.expected_return_date instanceof Date ? row.expected_return_date.toISOString().slice(0, 10) : String(row.expected_return_date || '').slice(0, 10),
    notes: row.notes || '',
    endedAt: row.ended_at ? (row.ended_at instanceof Date ? row.ended_at.toISOString() : String(row.ended_at)) : null,
    endReflection: row.end_reflection || '',
    createdAt: row.created_at ? (row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)) : null,
    updatedAt: row.updated_at ? (row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)) : null
  };
}

async function getActive(userId, client = database) {
  const result = await client.query(
    `SELECT * FROM app.market_pauses WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return map(result.rows[0]);
}

async function getHistory(userId, client = database) {
  const result = await client.query(
    `SELECT * FROM app.market_pauses WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map(map);
}

async function start(userId, payload, client = database) {
  const normalized = model.normalize(payload);
  const active = await getActive(userId, client);

  if (active) {
    // If already active, update the active pause with new dates/reason/notes
    const result = await client.query(
      `UPDATE app.market_pauses
       SET reason = $3, start_date = $4, expected_return_date = $5, notes = $6, updated_at = now()
       WHERE id = $1 AND user_id = $2 AND status = 'active'
       RETURNING *`,
      [active.id, userId, normalized.reason, normalized.startDate, normalized.expectedReturnDate, normalized.notes]
    );
    return map(result.rows[0]);
  }

  const id = crypto.randomUUID();
  const result = await client.query(
    `INSERT INTO app.market_pauses (
       id, user_id, status, reason, start_date, expected_return_date, notes
     ) VALUES (
       $1, $2, 'active', $3, $4, $5, $6
     ) RETURNING *`,
    [id, userId, normalized.reason, normalized.startDate, normalized.expectedReturnDate, normalized.notes]
  );
  return map(result.rows[0]);
}

async function end(userId, payload = {}, client = database) {
  const { endReflection } = model.normalizeEnd(payload);
  const active = await getActive(userId, client);
  if (!active) {
    throw invalid('Nenhum período de pausa ativo no momento.', 404);
  }

  const result = await client.query(
    `UPDATE app.market_pauses
     SET status = 'ended', ended_at = now(), end_reflection = $3, updated_at = now()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [active.id, userId, endReflection]
  );
  return map(result.rows[0]);
}

module.exports = {
  REASONS: model.REASONS,
  TRADE_ATTEMPT_REASONS: model.TRADE_ATTEMPT_REASONS,
  getActive,
  getHistory,
  start,
  end,
  map
};
