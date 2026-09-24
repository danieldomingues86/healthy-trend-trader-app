const test = require('node:test');
const assert = require('node:assert/strict');
const database = require('../src/database');
const blacklist = require('../src/asset-blacklist');
const trades = require('../src/trades');

const item = { market: 'Futuros', symbol: ' wdo ', name: 'Mini Dólar', reason: 'Movimento rápido não combina com meu estilo.', category: 'Movimento muito rápido', restrictionLevel: 'block' };
const plan = { asset: 'WDO', market: 'Futuros', entry: 5500, stop: 5490, suggestedQty: 2, executedQty: 2, riskPct: .005, grade: 'B' };

test('normaliza e valida registros da Blacklist', () => {
  assert.equal(blacklist.normalize(item).symbol, 'WDO');
  assert.throws(() => blacklist.normalize({ ...item, reason: '' }), /motivo/);
  assert.throws(() => blacklist.normalize({ ...item, restrictionLevel: 'ignore' }), /restrição/);
  assert.throws(() => blacklist.normalize({ ...item, symbol: 'WDO!' }), /Ticker/);
  assert.equal(trades.normalizePlan({ ...plan, blacklistOverride: true }).metadata.blacklistOverride, true);
});

test('regra pessoal bloqueia o registro e alerta exige confirmação; override fica no histórico', async () => {
  const original = database.transaction;
  let restrictionLevel = 'block';
  let savedMetadata;
  const queries = [];
  database.transaction = async work => work({ query: async (sql, values) => {
    queries.push({ sql, values });
    if (sql.includes('FROM app.asset_blacklist')) return { rows: [{ id: 'entry', market: 'Futuros', symbol: 'WDO', name: 'Mini Dólar', reason: item.reason, category: item.category, restriction_level: restrictionLevel }] };
    if (sql.includes('INSERT INTO app.trades')) savedMetadata = JSON.parse(values[15]);
    return { rows: [] };
  } });
  try {
    await assert.rejects(trades.createPlan('user-1', { ...plan, blacklistOverride: true }), /bloqueado/);
    assert.equal(queries.filter(entry => entry.sql.includes('INSERT INTO app.trades')).length, 0);
    restrictionLevel = 'alert';
    await assert.rejects(trades.createPlan('user-1', plan), /Confirme conscientemente/);
    await trades.createPlan('user-1', { ...plan, blacklistOverride: true });
    assert.equal(savedMetadata.blacklistOverride, true);
    assert.deepEqual(queries[0].values, ['user-1', 'WDO']);
  } finally { database.transaction = original; }
});

test('CRUD da Blacklist sempre restringe operações ao usuário autenticado', async () => {
  const original = database.query;
  const queries = [];
  database.query = async (sql, values) => {
    queries.push({ sql, values });
    if (sql.startsWith('SELECT')) return { rows: [] };
    if (sql.startsWith('DELETE')) return { rows: [{ id: 'entry-1' }] };
    return { rows: [{ id: 'entry-1', user_id: 'user-1', market: 'Futuros', symbol: 'WDO', name: 'Mini Dólar', reason: item.reason, category: item.category, restriction_level: 'block' }] };
  };
  try {
    const created = await blacklist.save('user-1', item);
    assert.equal(created.symbol, 'WDO');
    assert.equal((await blacklist.list('user-1')).length, 0);
    await blacklist.save('user-1', item, 'entry-1');
    await blacklist.remove('user-1', 'entry-1');
    for (const { sql, values } of queries) {
      assert.match(sql, /user_id/);
      assert.ok(values.includes('user-1'));
    }
  } finally { database.query = original; }
});
