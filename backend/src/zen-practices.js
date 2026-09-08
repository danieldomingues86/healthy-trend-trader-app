const crypto = require('node:crypto');
const database = require('./database');

const PRACTICES = new Set(['breathing', 'meditation', 'audio', 'reflection', 'forest', 'ocean', 'rain', 'landscape', 'affirmations', 'focus', 'gratitude', 'longterm']);
function invalid(message) { const error = new Error(message); error.status = 400; return error; }
function practiceId(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!PRACTICES.has(normalized)) throw invalid('Prática Zen inválida.');
  return normalized;
}
function sessionId(value) {
  const normalized = String(value || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) throw invalid('Sessão Zen inválida.');
  return normalized;
}
async function start(userId, input) {
  const result = await database.query(
    `INSERT INTO app.zen_practice_sessions (id, user_id, practice_id) VALUES ($1, $2, $3)
     RETURNING id, practice_id, started_at, completed_at`,
    [crypto.randomUUID(), userId, practiceId(input?.practiceId)]
  );
  return result.rows[0];
}
async function complete(userId, value) {
  const result = await database.query(
    `UPDATE app.zen_practice_sessions SET completed_at = COALESCE(completed_at, now())
     WHERE id = $1 AND user_id = $2
     RETURNING id, practice_id, started_at, completed_at`,
    [sessionId(value), userId]
  );
  if (!result.rows[0]) { const error = new Error('Sessão Zen não encontrada.'); error.status = 404; throw error; }
  return result.rows[0];
}
async function summary(userId) {
  const result = await database.query(
    `SELECT COUNT(*) FILTER (WHERE completed_at IS NOT NULL AND completed_at >= now() - interval '30 days')::int AS completed_last_30_days,
            COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::int AS completed_total,
            (SELECT practice_id FROM app.zen_practice_sessions WHERE user_id = $1 AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1) AS last_practice_id,
            (SELECT completed_at FROM app.zen_practice_sessions WHERE user_id = $1 AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1) AS last_completed_at
       FROM app.zen_practice_sessions WHERE user_id = $1`, [userId]
  );
  return result.rows[0];
}
module.exports = { PRACTICES, practiceId, sessionId, start, complete, summary };
