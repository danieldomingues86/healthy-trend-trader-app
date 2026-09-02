const database = require('./database');
const crypto = require('node:crypto');

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function sessionId(value) {
  const id = String(value || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw invalid('Identificador de sessão inválido.');
  return id;
}

function version(value) { return String(value || '').trim().slice(0, 80) || null; }

function normalizePreferences(value = {}) {
  return {
    targetAppName: String(value.targetAppName || 'Profit Trader · Nelógica').trim().slice(0, 80) || 'Profit Trader · Nelógica',
    targetExecutable: String(value.targetExecutable || 'Profit.exe').trim().slice(0, 160) || 'Profit.exe',
    countOpenings: value.countOpenings !== false,
    trackDuration: value.trackDuration !== false,
    trackMinimize: value.trackMinimize !== false,
    trackMaximize: value.trackMaximize !== false,
    trackWindowEvents: true
  };
}

async function preferences(userId) {
  const result = await database.query('SELECT preferences FROM app.platform_access_preferences WHERE user_id = $1', [userId]);
  return normalizePreferences(result.rows[0]?.preferences);
}

async function savePreferences(userId, value) {
  const next = normalizePreferences(value);
  const result = await database.query(`INSERT INTO app.platform_access_preferences (user_id, preferences)
    VALUES ($1, $2::jsonb)
    ON CONFLICT (user_id) DO UPDATE SET preferences = EXCLUDED.preferences
    RETURNING preferences`, [userId, JSON.stringify(next)]);
  return normalizePreferences(result.rows[0].preferences);
}

async function start(userId, payload = {}) {
  const id = sessionId(payload.sessionId);
  return database.transaction(async ({ query }) => {
    const existing = await query('SELECT id, opened_at, closed_at FROM app.platform_access_sessions WHERE id = $1 AND user_id = $2', [id, userId]);
    if (existing.rowCount) {
      const result = await query(`UPDATE app.platform_access_sessions
        SET closed_at = NULL, duration_seconds = NULL, last_seen_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING id, opened_at, last_seen_at, closed_at, duration_seconds`, [id, userId]);
      return { session: result.rows[0], resumed: true };
    }
    await query(`UPDATE app.platform_access_sessions
      SET closed_at = now(), last_seen_at = now(),
          duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (now() - opened_at))::integer)
      WHERE user_id = $1 AND closed_at IS NULL`, [userId]);
    const result = await query(`INSERT INTO app.platform_access_sessions (id, user_id, app_version)
      VALUES ($1, $2, $3)
      RETURNING id, opened_at, last_seen_at, closed_at, duration_seconds`, [id, userId, version(payload.appVersion)]);
    return { session: result.rows[0], resumed: false };
  });
}

async function heartbeat(userId, value) {
  const id = sessionId(value);
  const result = await database.query(`UPDATE app.platform_access_sessions SET last_seen_at = now()
    WHERE id = $1 AND user_id = $2 AND closed_at IS NULL
    RETURNING id, opened_at, last_seen_at`, [id, userId]);
  if (!result.rowCount) throw invalid('Sessão de acesso não está ativa.');
  return result.rows[0];
}

async function close(userId, value) {
  const id = sessionId(value);
  const result = await database.query(`UPDATE app.platform_access_sessions
    SET closed_at = now(), last_seen_at = now(),
        duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (now() - opened_at))::integer)
    WHERE id = $1 AND user_id = $2 AND closed_at IS NULL
    RETURNING id, opened_at, last_seen_at, closed_at, duration_seconds`, [id, userId]);
  return result.rows[0] || null;
}

async function recordEvent(userId, sessionIdValue, eventType) {
  const sessionId = sessionIdValue ? sessionIdValue : null;
  const allowed = new Set(['opened', 'minimized', 'restored', 'maximized', 'normal', 'closed']);
  if (!allowed.has(eventType)) throw invalid('Evento de acesso inválido.');
  await database.query('INSERT INTO app.platform_access_events (id, user_id, session_id, event_type) VALUES ($1, $2, $3, $4)', [crypto.randomUUID(), userId, sessionId, eventType]);
}

async function list(userId, days = 30) {
  const limit = Math.min(180, Math.max(1, Number(days) || 30));
  const result = await database.query(`SELECT id, app_version, opened_at, last_seen_at, closed_at,
      COALESCE(duration_seconds, GREATEST(0, EXTRACT(EPOCH FROM (now() - opened_at))::integer)) AS duration_seconds
    FROM app.platform_access_sessions
    WHERE user_id = $1 AND opened_at >= now() - ($2::text || ' days')::interval
    ORDER BY opened_at DESC`, [userId, limit]);
  return result.rows.map((row) => ({
    sessionId: row.id, appVersion: row.app_version, openedAt: row.opened_at, lastSeenAt: row.last_seen_at,
    closedAt: row.closed_at, durationSeconds: Number(row.duration_seconds || 0)
  }));
}

module.exports = { start, heartbeat, close, recordEvent, list, preferences, savePreferences, sessionId, normalizePreferences };
