const { Client } = require('pg');
const { normalizePolicy } = require('../../frontend/trading-rubrics');

async function run() {
  const email = process.env.TARGET_EMAIL;
  if (!process.env.DATABASE_URL || !email) {
    throw new Error('Informe DATABASE_URL e TARGET_EMAIL antes de atualizar a política.');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const current = await client.query(
      `SELECT p.user_id, p.policy FROM app.risk_policies p
       JOIN app.app_users u ON u.id = p.user_id WHERE u.email = $1`,
      [email]
    );
    if (!current.rowCount) throw new Error('Política não encontrada para o usuário informado.');
    const { user_id: userId, policy } = current.rows[0];
    const migrated = normalizePolicy(policy);
    await client.query(
      'UPDATE app.risk_policies SET policy = $1::jsonb WHERE user_id = $2',
      [JSON.stringify(migrated), userId]
    );
    console.log('Política atualizada para A/B/C/D:', migrated.grades);
  } finally {
    await client.end();
  }
}

run().catch(error => { console.error(error.message); process.exitCode = 1; });
