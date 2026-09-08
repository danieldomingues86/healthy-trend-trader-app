const crypto = require('node:crypto');
const database = require('./database');

function ticker(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!/^[A-Z]{4}\d{1,2}$/.test(normalized)) { const error = new Error('Ticker inválido.'); error.status = 400; throw error; }
  return normalized;
}
async function list(userId) {
  const result = await database.query('SELECT ticker, created_at FROM app.watchlist_items WHERE user_id = $1 ORDER BY ticker', [userId]);
  return result.rows;
}
async function add(userId, value) {
  const symbol = ticker(value);
  const result = await database.query(
    `INSERT INTO app.watchlist_items (id, user_id, ticker) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, ticker) DO UPDATE SET ticker = EXCLUDED.ticker
     RETURNING ticker, created_at`,
    [crypto.randomUUID(), userId, symbol]
  );
  return result.rows[0];
}
async function remove(userId, value) {
  const symbol = ticker(value);
  await database.query('DELETE FROM app.watchlist_items WHERE user_id = $1 AND ticker = $2', [userId, symbol]);
  return { ticker: symbol };
}
module.exports = { list, add, remove, ticker };
