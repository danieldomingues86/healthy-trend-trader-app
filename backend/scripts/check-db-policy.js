const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:6CQbMow5ZoEZ72gg@db.alkabtqhcxffxkntwqqv.supabase.co:5432/postgres' });
async function run() {
  await client.connect();
  const users = await client.query("SELECT id, email, display_name FROM app.app_users");
  console.log('Users:', users.rows);
  const p = await client.query('SELECT user_id, policy, updated_at FROM app.risk_policies');
  console.log('app.risk_policies count:', p.rows.length);
  for (const row of p.rows) {
    const u = users.rows.find(x => x.id === row.user_id);
    console.log('User:', u?.email || row.user_id, 'Updated at:', row.updated_at);
    console.log('Grades:', JSON.stringify(row.policy?.grades, null, 2));
  }
  await client.end();
}
run().catch(console.error);
