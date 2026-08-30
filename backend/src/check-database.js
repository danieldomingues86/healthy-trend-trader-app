require('./env');
const database = require('./database');
const auth = require('./auth');

async function run() {
  if (!database.configured()) throw new Error('DATABASE_URL não foi definida no backend/.env.');
  await database.migrate();
  await auth.ensureAdmin();
  const result = await database.query('SELECT count(*)::int AS users FROM app.app_users');
  console.log(`Banco conectado e schema aplicado. Usuários cadastrados: ${result.rows[0].users}.`);
}

run().catch((error) => { console.error(`Falha na conexão com o banco: ${error.message}`); process.exitCode = 1; });
