require('./env');
const crypto = require('node:crypto');
const database = require('./database');

const source = 'Trading_Log_Premium_V10 · EQUITY STATUS V6';
const base = 1086604.57;
const months = [
  ['2026-01-31', 1109070.60, 1096270.60, [-3800, -9000]],
  ['2026-02-28', 1104552.22, 1081452.22, [-4300, -6000]],
  ['2026-03-31', 1099389.79, 1062889.79, [-4000, -9400]],
  ['2026-04-30', 1097134.41, 1050034.41, [-4100, -6500]],
  ['2026-05-31', 1096173.05, 1045273.05, [-3800, 0]],
  ['2026-06-30', 1091407.68, 1029607.68, [-4400, -6500]],
  ['2026-07-31', 1103444.77, 1030844.77, [-3800, -7000]],
  ['2026-08-31', 1112309.50, 1031309.50, [-5900, -2500]]
];
const allocations = [
  ['Tesouro Direto', 'Renda fixa', 941000, 91.2432205840344],
  ['Startups - Longo Prazo', 'Alternativos', 5000, 0.48482051319890754],
  ['Trend Following - Brasil', 'Renda variável', 53000, 5.13909743990842],
  ['US (Treasuries)', 'Exterior / renda fixa', 30164, 2.9248251920263695]
];

async function seed() {
  await database.migrate();
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!email) throw new Error('ADMIN_EMAIL não configurado.');
  const user = await database.query('SELECT id FROM app.app_users WHERE email = $1', [email]);
  if (!user.rowCount) throw new Error('Usuário administrador não encontrado.');
  const userId = user.rows[0].id;
  await database.transaction(async client => {
    await client.query(`DELETE FROM app.wealth_movements WHERE user_id = $1 AND note LIKE $2`, [userId, `${source}%`]);
    await client.query(`DELETE FROM app.wealth_allocations WHERE user_id = $1 AND label IN ('Tesouro Direto','Startups - Longo Prazo','Trend Following - Brasil','US (Treasuries)')`, [userId]);
    await client.query(`DELETE FROM app.wealth_snapshots WHERE user_id = $1 AND source = $2`, [userId, source]);
    await client.query(`INSERT INTO app.wealth_settings (user_id, strategy_base) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET strategy_base = EXCLUDED.strategy_base`, [userId, base]);
    for (const [date, strategyEquity, realWealth, [natalia, daniel]] of months) {
      for (const [type, amount, person] of [['strategy_equity', strategyEquity, null], ['real_wealth', realWealth, null]]) await client.query(`INSERT INTO app.wealth_snapshots (id,user_id,snapshot_type,amount,occurred_at,source) VALUES ($1,$2,$3,$4,$5,$6)`, [crypto.randomUUID(), userId, type, amount, date, source]);
      for (const [amount, person] of [[natalia, 'Natália'], [daniel, 'Daniel']]) if (amount) await client.query(`INSERT INTO app.wealth_movements (id,user_id,movement_type,amount,occurred_at,note) VALUES ($1,$2,'withdrawal',$3,$4,$5)`, [crypto.randomUUID(), userId, Math.abs(amount), date, `${source} · ${person}`]);
    }
    for (const [label, assetClass, amount, targetPct] of allocations) await client.query(`INSERT INTO app.wealth_allocations (id,user_id,label,asset_class,amount,target_pct,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [crypto.randomUUID(), userId, label, assetClass, amount, targetPct, allocations.findIndex(item => item[0] === label)]);
  });
  console.log('Patrimônio importado da planilha.');
}
seed().catch(error => { console.error(error.message); process.exitCode = 1; });
