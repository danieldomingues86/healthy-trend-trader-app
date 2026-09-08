const database = require('./database');
const CATEGORIES = new Set(['health', 'exercise', 'sleep', 'food', 'study', 'mind', 'finance', 'fun', 'process']);
const CATEGORY_ALIASES = { 'saude': 'health', 'saúde': 'health', 'exercicio': 'exercise', 'exercício': 'exercise', 'sono': 'sleep', 'alimentacao': 'food', 'alimentação': 'food', 'estudo': 'study', 'estudos': 'study', 'mental': 'mind', 'financas': 'finance', 'finanças': 'finance', 'diversao': 'fun', 'diversão': 'fun', 'processo': 'process' };
function invalid(message) { const error = new Error(message); error.status = 400; return error; }
function habitId(value) { const v = String(value || '').trim().toLowerCase(); if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(v)) throw invalid('Hábito inválido.'); return v; }
function date(value) { const v = String(value || '').trim(); if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(new Date(`${v}T12:00:00`).getTime())) throw invalid('Data inválida.'); return v; }
function details(input) {
  const id = habitId(input?.id), name = (String(input?.name || '').trim().slice(0, 48) || id.replace(/[-_]+/g, ' '));
  const supplied = String(input?.category || '').trim().toLowerCase();
  const category = CATEGORIES.has(supplied) ? supplied : CATEGORY_ALIASES[supplied] || 'process';
  return { id, name, category };
}
async function list(userId) {
  const [habits, checkins, ignoredDays] = await Promise.all([
    database.query('SELECT id, name, category, created_at FROM app.habits WHERE user_id = $1 ORDER BY created_at, id', [userId]),
    database.query('SELECT habit_id, checkin_date, status FROM app.habit_checkins WHERE user_id = $1', [userId]),
    database.query('SELECT ignored_date FROM app.habit_ignored_days WHERE user_id = $1', [userId])
  ]);
  return { habits: habits.rows, checkins: checkins.rows, ignoredDays: ignoredDays.rows };
}
async function save(userId, input) { const h = details(input); const r = await database.query(`INSERT INTO app.habits (user_id, id, name, category) VALUES ($1,$2,$3,$4) ON CONFLICT (user_id,id) DO UPDATE SET name=EXCLUDED.name, category=EXCLUDED.category RETURNING id,name,category,created_at`, [userId,h.id,h.name,h.category]); return r.rows[0]; }
async function remove(userId, value) { const id = habitId(value); await database.query('DELETE FROM app.habits WHERE user_id=$1 AND id=$2',[userId,id]); return { id }; }
async function checkin(userId, habit, input) {
  const id=habitId(habit), day=date(input?.date), status=String(input?.status || '');
  if (!['done','skipped',''].includes(status)) throw invalid('Status de hábito inválido.');
  if (!status) { await database.query('DELETE FROM app.habit_checkins WHERE user_id=$1 AND habit_id=$2 AND checkin_date=$3',[userId,id,day]); return { habitId:id,date:day,status:null }; }
  const existing = await database.query('SELECT 1 FROM app.habits WHERE user_id=$1 AND id=$2', [userId,id]);
  if (!existing.rows[0]) await save(userId, { id, name: input?.name, category: input?.category });
  const r=await database.query(`INSERT INTO app.habit_checkins (user_id,habit_id,checkin_date,status) VALUES ($1,$2,$3,$4) ON CONFLICT (user_id,habit_id,checkin_date) DO UPDATE SET status=EXCLUDED.status,updated_at=now() RETURNING habit_id,checkin_date,status`,[userId,id,day,status]); return r.rows[0];
}
async function ignoredDay(userId, input) { const day=date(input?.date); if (input?.ignored) await database.query('INSERT INTO app.habit_ignored_days (user_id,ignored_date) VALUES ($1,$2) ON CONFLICT DO NOTHING',[userId,day]); else await database.query('DELETE FROM app.habit_ignored_days WHERE user_id=$1 AND ignored_date=$2',[userId,day]); return { date: day, ignored: Boolean(input?.ignored) }; }
async function migrate(userId, state) {
  const current = await database.query('SELECT COUNT(*)::int AS count FROM app.habits WHERE user_id=$1', [userId]);
  if (current.rows[0].count) return list(userId);
  const source = state && typeof state === 'object' ? state : {};
  const habitRows = Array.isArray(source.habits) ? source.habits.map(details) : [];
  await database.transaction(async ({ query }) => {
    for (const item of habitRows) await query('INSERT INTO app.habits (user_id,id,name,category) VALUES ($1,$2,$3,$4)', [userId,item.id,item.name,item.category]);
    const known = new Set(habitRows.map(item => item.id));
    for (const [key,status] of Object.entries(source.records || {})) {
      const match = String(key).match(/^(\d{4}-\d{2}-\d{2}):([a-z0-9][a-z0-9_-]{0,79})$/i);
      if (!match || !known.has(match[2]) || !['done','skipped'].includes(status)) continue;
      await query('INSERT INTO app.habit_checkins (user_id,habit_id,checkin_date,status) VALUES ($1,$2,$3,$4)', [userId,match[2],date(match[1]),status]);
    }
    for (const [day,ignored] of Object.entries(source.ignoredDays || {})) if (ignored) await query('INSERT INTO app.habit_ignored_days (user_id,ignored_date) VALUES ($1,$2)', [userId,date(day)]);
  });
  return list(userId);
}
module.exports = { CATEGORIES, habitId, date, details, list, save, remove, checkin, ignoredDay, migrate };
