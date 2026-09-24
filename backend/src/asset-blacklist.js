const crypto = require('node:crypto');
const database = require('./database');
const instruments = require('../../frontend/instrument-catalog');

const MARKETS = instruments.MARKETS;
const CATEGORIES = ['Movimento muito rápido', 'Volatilidade excessiva', 'Comportamento errático', 'Exige monitoramento constante', 'Baixa liquidez', 'Não combina com meu método', 'Histórico pessoal ruim', 'Outro'];

function invalid(message, status = 400) { const error = new Error(message); error.status = status; return error; }
function symbol(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!/^[A-Z0-9.\-]{2,20}$/.test(normalized)) throw invalid('Ticker ou símbolo inválido.');
  return normalized;
}
function normalize(payload = {}) {
  const market = String(payload.market || '').trim();
  const name = String(payload.name || '').trim();
  const reason = String(payload.reason || '').trim();
  const category = String(payload.category || '').trim();
  const restrictionLevel = String(payload.restrictionLevel || '').trim();
  if (!MARKETS.includes(market)) throw invalid('Mercado inválido.');
  if (name.length > 120) throw invalid('Nome do ativo muito longo.');
  if (!reason || reason.length > 2000) throw invalid('Informe um motivo de até 2.000 caracteres.');
  if (!CATEGORIES.includes(category)) throw invalid('Categoria inválida.');
  if (!['alert', 'block'].includes(restrictionLevel)) throw invalid('Nível de restrição inválido.');
  return { market, symbol: symbol(payload.symbol), name, reason, category, restrictionLevel };
}
function map(row) {
  return { id: row.id, market: row.market, symbol: row.symbol, name: row.name, reason: row.reason, category: row.category, restrictionLevel: row.restriction_level, createdAt: row.created_at, updatedAt: row.updated_at };
}
async function list(userId) {
  const result = await database.query('SELECT * FROM app.asset_blacklist WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return result.rows.map(map);
}
async function find(userId, value, market, client = database) {
  const normalizedSymbol = symbol(value);
  const normalizedMarket = String(market || '').trim();
  if (!MARKETS.includes(normalizedMarket)) return null;
  const result = await client.query('SELECT * FROM app.asset_blacklist WHERE user_id = $1 AND market = $2 ORDER BY created_at DESC', [userId, normalizedMarket]);
  const tradeAsset = { symbol: normalizedSymbol, market: normalizedMarket };
  const row = result.rows.find(entry => instruments.matchesBlacklistRule(tradeAsset, map(entry)));
  return row ? map(row) : null;
}
async function save(userId, payload, id) {
  const item = normalize(payload);
  try {
    if (id) {
      const result = await database.query('UPDATE app.asset_blacklist SET market=$3, symbol=$4, name=$5, reason=$6, category=$7, restriction_level=$8 WHERE id=$1 AND user_id=$2 RETURNING *', [id, userId, item.market, item.symbol, item.name, item.reason, item.category, item.restrictionLevel]);
      if (!result.rows[0]) throw invalid('Ativo não encontrado na Blacklist.', 404);
      return map(result.rows[0]);
    }
    const result = await database.query('INSERT INTO app.asset_blacklist (id,user_id,market,symbol,name,reason,category,restriction_level) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [crypto.randomUUID(), userId, item.market, item.symbol, item.name, item.reason, item.category, item.restrictionLevel]);
    return map(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') throw invalid(`${item.symbol} já está na sua Blacklist.`, 409);
    throw error;
  }
}
async function remove(userId, id) {
  const result = await database.query('DELETE FROM app.asset_blacklist WHERE id=$1 AND user_id=$2 RETURNING id', [id, userId]);
  if (!result.rows[0]) throw invalid('Ativo não encontrado na Blacklist.', 404);
  return result.rows[0];
}
module.exports = { MARKETS, CATEGORIES, normalize, symbol, list, find, save, remove };
