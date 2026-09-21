const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:6CQbMow5ZoEZ72gg@db.alkabtqhcxffxkntwqqv.supabase.co:5432/postgres' });

async function run() {
  await client.connect();
  const users = await client.query("SELECT id, email FROM app.app_users WHERE email = 'danieldomingues86@gmail.com'");
  if (users.rows.length === 0) {
    console.error('User not found');
    await client.end();
    return;
  }
  const userId = users.rows[0].id;
  const current = await client.query('SELECT policy FROM app.risk_policies WHERE user_id = $1', [userId]);
  if (current.rows.length === 0) {
    console.error('Policy not found');
    await client.end();
    return;
  }
  const policy = current.rows[0].policy;
  console.log('Current grades:', policy.grades);
  
  // Update grades
  policy.grades = [
    { grade: 'A+', minScore: 90, riskPct: 0.005 },
    { grade: 'A', minScore: 80, riskPct: 0.004 },
    { grade: 'B', minScore: 70, riskPct: 0.002 },
    { grade: 'C', minScore: 60, riskPct: 0.001 },
    { grade: 'D', minScore: null, riskPct: 0.000 }
  ];

  await client.query('UPDATE app.risk_policies SET policy = $1::jsonb, updated_at = NOW() WHERE user_id = $2', [JSON.stringify(policy), userId]);
  console.log('Updated policy in app.risk_policies for user:', userId);

  const check = await client.query('SELECT policy FROM app.risk_policies WHERE user_id = $1', [userId]);
  console.log('New grades:', JSON.stringify(check.rows[0].policy.grades, null, 2));

  await client.end();
}

run().catch(console.error);
