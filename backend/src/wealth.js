const crypto = require('node:crypto');
const database = require('./database');

function invalid(message) { const error = new Error(message); error.status = 400; return error; }
function amount(value, label) { const parsed = Number(value); if (!Number.isFinite(parsed) || parsed <= 0) throw invalid(`${label} é inválido.`); return parsed; }
function text(value, max = 120) { return String(value || '').trim().slice(0, max); }

function normalizeMovement(payload = {}) {
  const type = payload.type === 'withdrawal' ? 'withdrawal' : payload.type === 'deposit' ? 'deposit' : null;
  if (!type) throw invalid('Tipo de movimentação inválido.');
  return { type, amount: amount(payload.amount, 'Valor'), occurredAt: payload.occurredAt ? new Date(payload.occurredAt) : new Date(), note: text(payload.note, 500) };
}
function normalizeAllocation(payload = {}) {
  const label = text(payload.label, 100), assetClass = text(payload.assetClass, 100);
  if (!label || !assetClass) throw invalid('Nome e classe do ativo são obrigatórios.');
  const targetPct = payload.targetPct === '' || payload.targetPct == null ? null : Number(payload.targetPct);
  if (targetPct !== null && (!Number.isFinite(targetPct) || targetPct < 0 || targetPct > 100)) throw invalid('Alocação-alvo é inválida.');
  const currentAmount = Number(payload.amount);
  if (payload.amount === '' || payload.amount == null || !Number.isFinite(currentAmount) || currentAmount < 0) throw invalid('Valor é inválido.');
  return { label, assetClass, amount: currentAmount, targetPct, sortOrder: Number.isInteger(Number(payload.sortOrder)) ? Number(payload.sortOrder) : 0 };
}
async function list(userId) {
  const [movements, allocations, trades, snapshots, settings] = await Promise.all([
    database.query(`SELECT id, movement_type, amount, occurred_at, note FROM app.wealth_movements WHERE user_id = $1 ORDER BY occurred_at DESC, created_at DESC`, [userId]),
    database.query(`SELECT id, label, asset_class, amount, target_pct, sort_order FROM app.wealth_allocations WHERE user_id = $1 ORDER BY sort_order, created_at`, [userId]),
    database.query(`SELECT t.status, t.direction, t.entry_price, t.executed_quantity, COALESCE(events.items, '[]'::jsonb) AS events FROM app.trades t LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('type', e.event_type, 'quantity', e.quantity, 'price', e.price) ORDER BY e.occurred_at, e.created_at) AS items FROM app.trade_events e WHERE e.trade_id = t.id) events ON true WHERE t.user_id = $1`, [userId]),
    database.query(`SELECT snapshot_type, amount, occurred_at FROM app.wealth_snapshots WHERE user_id = $1 ORDER BY occurred_at`, [userId]),
    database.query(`SELECT strategy_base FROM app.wealth_settings WHERE user_id = $1`, [userId])
  ]);
  const movementRows = movements.rows.map(row => ({ id: row.id, type: row.movement_type, amount: Number(row.amount), occurredAt: row.occurred_at, note: row.note }));
  const deposited = movementRows.filter(row => row.type === 'deposit').reduce((sum, row) => sum + row.amount, 0);
  const withdrawn = movementRows.filter(row => row.type === 'withdrawal').reduce((sum, row) => sum + row.amount, 0);
  const strategyResult = trades.rows.reduce((total, trade) => { const sign = trade.direction === 'short' ? -1 : 1; const entry = Number(trade.entry_price || 0); return total + trade.events.filter(event => ['peeloff', 'close'].includes(event.type)).reduce((sum, event) => sum + (Number(event.price || 0) - entry) * sign * Number(event.quantity || 0), 0); }, 0);
  const snapshotRows = snapshots.rows.map(row => ({ type: row.snapshot_type, amount: Number(row.amount), occurredAt: row.occurred_at }));
  const latest = type => [...snapshotRows].reverse().find(row => row.type === type)?.amount;
  const strategyBase = Number(settings.rows[0]?.strategy_base || 0);
  const strategyEquity = latest('strategy_equity') ?? (strategyBase + strategyResult);
  const realWealth = latest('real_wealth') ?? (deposited - withdrawn + strategyResult);
  return { movements: movementRows, allocations: allocations.rows.map(row => ({ id: row.id, label: row.label, assetClass: row.asset_class, amount: Number(row.amount), targetPct: row.target_pct == null ? null : Number(row.target_pct), sortOrder: row.sort_order })), snapshots: snapshotRows, summary: { deposited, withdrawn, netContributions: deposited - withdrawn, strategyResult, strategyBase, strategyEquity, realWealth } };
}
async function createMovement(userId, payload) { const movement = normalizeMovement(payload); const result = await database.query(`INSERT INTO app.wealth_movements (id, user_id, movement_type, amount, occurred_at, note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [crypto.randomUUID(), userId, movement.type, movement.amount, movement.occurredAt, movement.note]); return result.rows[0]; }
async function createAllocation(userId, payload) { const allocation = normalizeAllocation(payload); const result = await database.query(`INSERT INTO app.wealth_allocations (id, user_id, label, asset_class, amount, target_pct, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [crypto.randomUUID(), userId, allocation.label, allocation.assetClass, allocation.amount, allocation.targetPct, allocation.sortOrder]); return result.rows[0]; }
async function updateAllocation(userId, allocationId, payload) { if (!/^[0-9a-f-]{36}$/i.test(String(allocationId || ''))) throw invalid('Alocação inválida.'); const allocation = normalizeAllocation(payload); const result = await database.query(`UPDATE app.wealth_allocations SET label=$3, asset_class=$4, amount=$5, target_pct=$6, sort_order=$7 WHERE id=$1 AND user_id=$2 RETURNING id`, [allocationId, userId, allocation.label, allocation.assetClass, allocation.amount, allocation.targetPct, allocation.sortOrder]); if (!result.rowCount) throw invalid('Alocação não encontrada.'); return result.rows[0]; }
module.exports = { list, createMovement, createAllocation, updateAllocation, normalizeMovement, normalizeAllocation };
