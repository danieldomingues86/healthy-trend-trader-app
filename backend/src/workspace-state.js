const database = require('./database');
const MAX_STATE_BYTES = 900_000;

function invalid(message) { const error = new Error(message); error.status = 400; return error; }
function key(value) {
  const normalized = String(value || '').trim();
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(normalized)) throw invalid('Chave de estado inválida.');
  return normalized;
}
function value(input) {
  const serialized = typeof input === 'string' ? input : JSON.stringify(input ?? null);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_STATE_BYTES) throw invalid('O estado informado excede o limite de armazenamento.');
  return serialized;
}
async function get(userId) {
  const result = await database.query('SELECT state FROM app.workspace_state WHERE user_id = $1', [userId]);
  return result.rows[0]?.state || {};
}
async function save(userId, stateKey, input) {
  const normalizedKey = key(stateKey);
  const serialized = value(input);
  const result = await database.query(
    `INSERT INTO app.workspace_state (user_id, state) VALUES ($1, jsonb_build_object($2::text, $3::jsonb))
     ON CONFLICT (user_id) DO UPDATE SET state = app.workspace_state.state || jsonb_build_object($2::text, $3::jsonb)
     RETURNING state`,
    [userId, normalizedKey, JSON.stringify(serialized)]
  );
  return result.rows[0].state;
}
async function remove(userId, stateKey) {
  const normalizedKey = key(stateKey);
  const result = await database.query(
    `UPDATE app.workspace_state SET state = state - $2 WHERE user_id = $1 RETURNING state`,
    [userId, normalizedKey]
  );
  return result.rows[0]?.state || {};
}

module.exports = { get, save, remove, key, value, MAX_STATE_BYTES };
