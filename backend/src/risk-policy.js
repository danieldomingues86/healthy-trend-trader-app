const database = require('./database');

function invalid(message) { const error = new Error(message); error.status = 400; return error; }

function policy(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw invalid('Política de risco inválida.');
  return payload;
}

async function get(userId) {
  const result = await database.query('SELECT policy, updated_at FROM app.risk_policies WHERE user_id = $1', [userId]);
  return result.rowCount ? { policy: result.rows[0].policy, updatedAt: result.rows[0].updated_at } : { policy: null, updatedAt: null };
}

async function save(userId, payload) {
  const result = await database.query(
    `INSERT INTO app.risk_policies (user_id, policy) VALUES ($1, $2::jsonb)
     ON CONFLICT (user_id) DO UPDATE SET policy = EXCLUDED.policy
     RETURNING policy, updated_at`,
    [userId, JSON.stringify(policy(payload))]
  );
  return { policy: result.rows[0].policy, updatedAt: result.rows[0].updated_at };
}

module.exports = { get, save, policy };
