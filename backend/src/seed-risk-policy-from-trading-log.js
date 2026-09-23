require('./env');
const database = require('./database');

const policy = {
  gradingVersion: 2,
  positionSizingVersion: 3,
  criteria: [
    { key: 'trendQuality', label: 'Contexto do Ativo (Diário)', weight: 25 },
    { key: 'marketCycle', label: 'Contexto do Mercado', weight: 20 },
    { key: 'relativeStrength', label: 'Força Relativa (RS)', weight: 20 },
    { key: 'volatility', label: 'Volatilidade (ATR)', weight: 15 },
    { key: 'setupQuality', label: 'Gatilho de Entrada', weight: 15 },
    { key: 'fundamentalScore', label: 'Fundamentos', weight: 5 }
  ],
  grades: [
    { grade: 'A', minScore: 95, riskPct: 0.004 },
    { grade: 'B', minScore: 80, riskPct: 0.002 },
    { grade: 'C', minScore: 65, riskPct: 0.001 },
    { grade: 'D', minScore: -Infinity, riskPct: 0 }
  ],
  profiles: {
    rampUp: { label: 'Risk Ramp-Up', ongoingRiskPct: 0.0025, initialVolatilityPct: 0.001, ongoingVolatilityPct: 0.0025, capitalPct: 0.1, maximumPortfolioRiskPct: 0.05, maximumPositions: 3, pyramiding: false },
    standard: { label: 'Política padrão', ongoingRiskPct: 0.006, initialVolatilityPct: 0.003, ongoingVolatilityPct: 0.006, capitalPct: 0.1, maximumPortfolioRiskPct: 0.05, maximumPositions: 6, pyramiding: false }
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
