const crypto = require('node:crypto');
const database = require('./database');

function materialId(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9-]{1,80}$/.test(normalized)) { const error = new Error('Material inválido.'); error.status = 400; throw error; }
  return normalized;
}
async function list(userId) {
  const result = await database.query('SELECT material_id, source, acquired_at FROM app.material_entitlements WHERE user_id = $1 ORDER BY acquired_at DESC', [userId]);
  return result.rows;
}
async function grant(userId, input) {
  const id = materialId(input?.materialId);
  const result = await database.query(
    `INSERT INTO app.material_entitlements (id, user_id, material_id, source)
     VALUES ($1, $2, $3, 'manual') ON CONFLICT (user_id, material_id) DO UPDATE SET material_id = EXCLUDED.material_id
     RETURNING material_id, source, acquired_at`,
    [crypto.randomUUID(), userId, id]
  );
  return result.rows[0];
}
module.exports = { list, grant, materialId };
