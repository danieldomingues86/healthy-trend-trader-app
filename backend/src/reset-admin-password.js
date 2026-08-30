require('./env');
const database = require('./database');
const { hashPassword } = require('./auth');

async function run() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!database.configured()) throw new Error('DATABASE_URL não foi definida no backend/.env.');
  if (!email || password.length < 12) throw new Error('Defina ADMIN_EMAIL e um ADMIN_PASSWORD com ao menos 12 caracteres no backend/.env.');
  const result = await database.query('UPDATE app.app_users SET password_hash = $1 WHERE email = $2 RETURNING id', [await hashPassword(password), email]);
  if (!result.rowCount) throw new Error('Administrador não encontrado para o ADMIN_EMAIL informado.');
  await database.query('DELETE FROM app.app_sessions WHERE user_id = $1', [result.rows[0].id]);
  console.log('Senha do administrador redefinida. Sessões anteriores foram encerradas.');
}

run().catch((error) => { console.error(`Falha ao redefinir senha: ${error.message}`); process.exitCode = 1; });
