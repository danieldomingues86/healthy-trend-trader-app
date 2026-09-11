/* Usage: node scripts/import-trades-from-xlsx.js --file <xlsx> --email <email> [--apply] */
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function argument(name) { const at = process.argv.indexOf(name); return at === -1 ? null : process.argv[at + 1]; }
function loadEnv() { const file = path.join(__dirname, '..', '.env'); try { for (const line of require('node:fs').readFileSync(file, 'utf8').split(/\r?\n/)) { const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/); if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, ''); } } catch {} }
function isoDate(value) { return `${value}T12:00:00-03:00`; }
function number(value) { return Number.isFinite(Number(value)) ? Number(value) : null; }
function direction(value) { return /venda|short/i.test(value || '') ? 'short' : /compra|long/i.test(value || '') ? 'long' : null; }
function status(value, exitDate, exitPrice) { return /fechado|encerrado/i.test(value || '') || (exitDate && exitPrice != null) ? 'closed' : 'open'; }
function importKey(row) { return ['xlsx-v10', row.mode, row.ticker, row.entryDate, row.quantity, row.entryPrice].join('|'); }
function validate(row) {
  const issues = [];
  if (!/^[A-Z0-9]{4,12}$/.test(row.ticker || '')) issues.push('ticker inválido');
  if (!row.entryDate) issues.push('data de entrada ausente');
  if (!(number(row.entryPrice) > 0)) issues.push('preço de entrada inválido');
  if (!(number(row.stopPrice) > 0)) issues.push('stop inicial ausente ou inválido');
  if (!(number(row.quantity) > 0)) issues.push('quantidade inicial ausente ou inválida');
  if (status(row.status, row.exitDate, row.exitPrice) === 'closed' && (!row.exitDate || !(number(row.exitPrice) > 0))) issues.push('trade fechado sem data ou preço de saída');
  return issues;
}

async function main() {
  const file = argument('--file'), email = String(argument('--email') || '').trim().toLowerCase(), apply = process.argv.includes('--apply');
  if (!file || !email) throw new Error('Uso: node scripts/import-trades-from-xlsx.js --file <xlsx> --email <email> [--apply]');
  loadEnv();
  const extractor = path.join(__dirname, 'extract-trades-from-xlsx.py');
  const python = process.env.PYTHON || 'python';
  const source = JSON.parse(execFileSync(python, [extractor, path.resolve(file)], { encoding: 'utf8' }));
  const database = require('../src/database');
  const user = await database.query('SELECT id, email FROM app.app_users WHERE lower(email) = $1', [email]);
  if (!user.rowCount) throw new Error(`Usuário não encontrado: ${email}`);
  const userId = user.rows[0].id;
  const existing = await database.query("SELECT id, metadata->>'importKey' AS import_key FROM app.trades WHERE user_id = $1 AND metadata ? 'importKey'", [userId]);
  const existingKeys = new Set(existing.rows.map(item => item.import_key));
  const report = { sourceRows: source.trades.length, imported: 0, updated: 0, skipped: 0, duplicates: 0, errors: [], open: 0, closed: 0, mode: apply ? 'apply' : 'dry-run' };
  if (apply) {
    const snapshot = await database.query(`SELECT t.*, COALESCE(jsonb_agg(e ORDER BY e.occurred_at, e.created_at) FILTER (WHERE e.id IS NOT NULL), '[]') AS events FROM app.trades t LEFT JOIN app.trade_events e ON e.trade_id = t.id WHERE t.user_id = $1 GROUP BY t.id`, [userId]);
    const backupDir = path.join(__dirname, '..', 'backups'); await fs.mkdir(backupDir, { recursive: true });
    const backup = path.join(backupDir, `trades-${email.replace(/[^a-z0-9]/g, '_')}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    await fs.writeFile(backup, JSON.stringify({ user: email, createdAt: new Date().toISOString(), trades: snapshot.rows }, null, 2)); report.backup = backup;
  }
  for (const row of source.trades) {
    const key = importKey(row), problems = validate(row); if (problems.length) { report.errors.push({ sheet: row.sheet, row: row.row, ticker: row.ticker, reason: problems.join('; ') }); continue; }
    if (existingKeys.has(key)) { report.duplicates++; report.skipped++; continue; }
    const tradeStatus = status(row.status, row.exitDate, row.exitPrice); if (tradeStatus === 'open') report.open++; else report.closed++;
    if (!apply) { report.imported++; continue; }
    const metadata = { importSource: 'Trading_Log_Premium_V10.xlsx', importKey: key, sourceSheet: row.sheet, sourceRow: row.row, mode: row.mode, entryDate: row.entryDate, timeframe: row.timeframe, marketRegime: row.marketRegime, riskPolicy: row.riskPolicy, positionSizing: row.positionSizing, limitedBy: row.limitedBy, financialResult: row.financialResult, rMultiple: row.rMultiple, sourceStatus: row.status, note: row.note };
    try { await database.transaction(async client => { const id = crypto.randomUUID(), entryAt = isoDate(row.entryDate); await client.query(`INSERT INTO app.trades (id,user_id,ticker,market,direction,setup,entry_price,stop_price,atr,planned_quantity,risk_pct,rubric_score,status,metadata,execution_price,executed_quantity,executed_at,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$7,$10,$15,$15)`, [id,userId,row.ticker,row.market,direction(row.direction),row.setup,row.entryPrice,row.stopPrice,row.atr,row.quantity,row.riskPct,row.executionScore,tradeStatus,JSON.stringify(metadata),entryAt]); await client.query(`INSERT INTO app.trade_events (id,trade_id,event_type,quantity,price,stop_price,atr,note,occurred_at) VALUES ($1,$2,'entry',$3,$4,$5,$6,$7,$8)`, [crypto.randomUUID(),id,row.quantity,row.entryPrice,row.stopPrice,row.atr,'Importado da planilha histórica.',entryAt]); let remaining = row.quantity; for (const peel of row.peels) { if (peel.quantity > remaining) throw new Error('quantidade de redução maior que a posição'); await client.query(`INSERT INTO app.trade_events (id,trade_id,event_type,quantity,price,note,occurred_at) VALUES ($1,$2,'peeloff',$3,$4,$5,$6)`, [crypto.randomUUID(),id,peel.quantity,peel.price,peel.note || 'Redução parcial importada da planilha.',entryAt]); remaining -= peel.quantity; } if (tradeStatus === 'closed') await client.query(`INSERT INTO app.trade_events (id,trade_id,event_type,quantity,price,note,occurred_at) VALUES ($1,$2,'close',$3,$4,$5,$6)`, [crypto.randomUUID(),id,remaining,row.exitPrice,'Saída final importada da planilha.',isoDate(row.exitDate)]); }); report.imported++; existingKeys.add(key); } catch (error) { report.errors.push({ sheet: row.sheet, row: row.row, ticker: row.ticker, reason: error.message }); }
  }
  report.failed = report.errors.length; console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
