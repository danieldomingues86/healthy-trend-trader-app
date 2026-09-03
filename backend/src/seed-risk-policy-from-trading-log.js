require('./env');
const database = require('./database');

const policy = {
  criteria: [
    { key: 'marketCycle', label: 'Market Cycle · permissão de mercado', weight: 4 },
    { key: 'trendQuality', label: 'Diário / Contexto técnico', weight: 1.5 },
    { key: 'relativeStrength', label: 'RS Rank / Força Relativa', weight: 1.5 },
    { key: 'setupQuality', label: 'Gatilho de entrada / Contração 4H', weight: 1 },
    { key: 'volatility', label: 'ATR% adequado', weight: 0.75 },
    { key: 'entryQuality', label: 'Price Action fluido', weight: 0.75 },
    { key: 'fundamentalScore', label: 'Fundamentalista', weight: 0.5 }
  ],
  grades: [
    { grade: 'A+', minScore: 8.5, riskPct: 0.004 },
    { grade: 'B', minScore: 7, riskPct: 0.002 },
    { grade: 'C', minScore: 5.5, riskPct: 0.001 },
    { grade: 'No Trade', minScore: -Infinity, riskPct: 0 }
  ],
  marketMultipliers: { healthy: 1, improving: 0.75, transition: 0.5, defensive: 0.25, riskOff: 0 },
  profiles: {
    rampUp: { label: 'Risk Ramp-Up', initialRiskPct: 0.001, ongoingRiskPct: 0.0025, initialVolatilityPct: 0.001, ongoingVolatilityPct: 0.0025, capitalPct: 0.1, maximumPortfolioRiskPct: 0.05, maximumPositions: 3, pyramiding: false },
    standard: { label: 'Política padrão', initialRiskPct: 0.003, ongoingRiskPct: 0.006, initialVolatilityPct: 0.003, ongoingVolatilityPct: 0.006, capitalPct: 0.1, maximumPortfolioRiskPct: 0.05, maximumPositions: 6, pyramiding: false }
  },
  selectedProfile: 'standard'
};

async function seed() {
  await database.migrate();
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!email) throw new Error('ADMIN_EMAIL não configurado.');
  const user = await database.query('SELECT id FROM app.app_users WHERE email = $1', [email]);
  if (!user.rowCount) throw new Error('Usuário administrador não encontrado.');
  await database.query(
    `INSERT INTO app.risk_policies (user_id, policy) VALUES ($1, $2::jsonb)
     ON CONFLICT (user_id) DO UPDATE SET policy = EXCLUDED.policy`,
    [user.rows[0].id, JSON.stringify(policy)]
  );
  console.log('Política de risco importada da planilha.');
}

seed().catch(error => { console.error(error.message); process.exitCode = 1; });
