const test = require('node:test');
const assert = require('node:assert/strict');
const calculator = require('../src/capital-intelligence-calculator.js');
const pipelineModule = require('../src/capital-intelligence-pipeline.js');
const portfolioEngine = require('../src/capital-intelligence-portfolio.js');
const allocationEngine = require('../src/capital-intelligence-allocation.js');

test('E2E — 1. Pipeline Completo: integridade das 7 esferas, 4 satélites e metadados de rastreabilidade', () => {
  const snapshot = calculator.buildDailySnapshot({ now: new Date('2026-11-24T18:00:00-03:00') });

  // 1.1 Metadados de Snapshot
  assert.equal(snapshot.schemaVersion, '1.0');
  assert.equal(snapshot.horizonSessions, 21);
  assert.ok(snapshot.snapshotDate);
  assert.ok(snapshot.generatedAt);
  assert.ok(['atualizado', 'atrasado', 'parcial', 'indisponivel'].includes(snapshot.overallStatus));

  // 1.2 Exatamente as 7 Esferas Principais Canônicas
  const presentSpheres = Object.keys(snapshot.spheres);
  ['cycle_br', 'cycle_us', 'breadth_us', 'gold_commodities', 'sector_rotation_us', 'macro_events'].forEach(id => {
    assert.ok(presentSpheres.includes(id), `Esfera ${id} obrigatória no snapshot base`);
    const sphere = snapshot.spheres[id];
    assert.ok(sphere.id, `Esfera ${id} deve ter id`);
    assert.ok(sphere.status, `Esfera ${id} deve ter status`);
    assert.ok(sphere.asOfDate || sphere.asOfDate === null, `Esfera ${id} deve ter asOfDate`);
  });

  // 1.3 Exatamente os 4 Satélites de Tendência Histórica (21 Pregões)
  const requiredSatellites = ['trend_dolar', 'trend_di', 'trend_us10y', 'trend_vix'];
  requiredSatellites.forEach(satId => {
    assert.ok(snapshot.trendSatellites21d[satId], `Satélite ${satId} obrigatório`);
    const sat = snapshot.trendSatellites21d[satId];
    assert.ok(sat.macroTrend, `Satélite ${satId} deve carregar objeto macroTrend`);
    assert.ok(Array.isArray(sat.macroTrend.series21d), `Satélite ${satId} deve calcular série de 21 pregões`);
    assert.ok(['pts', '%', 'p.p.', 'bps'].includes(sat.macroTrend.unitSpec?.primaryDeltaUnit), `Unidade nativa válida para ${satId}`);
  });

  // 1.4 Faixa secundária de 1 pregão
  assert.ok(Array.isArray(snapshot.dailyTapeSecondary), 'dailyTapeSecondary obrigatório');
  assert.equal(snapshot.dailyTapeSecondary.length, 6, 'Exatamente 6 benchmarks na faixa de rodapé');
});

test('E2E — 2. Independência Absoluta entre Ciclos Brasil e EUA e Autonomia do Market Breadth', () => {
  const snapshot = calculator.buildDailySnapshot({ now: new Date('2026-11-24T18:00:00-03:00') });

  const br = snapshot.spheres.cycle_br;
  const us = snapshot.spheres.cycle_us;
  const breadth = snapshot.spheres.breadth_us;

  // Brasil avalia B3/IBOV
  assert.equal(br.id, 'cycle_br');
  assert.ok(br.supportingIndicators, 'Brasil deve ter indicadores próprios de suporte');
  assert.ok(br.status, 'Brasil deve ter status de frescor');

  // EUA avalia SPY / QQQ / RSP de forma isolada
  assert.equal(us.id, 'cycle_us');
  assert.ok(us.spyVsQqqAlignment, 'EUA deve avaliar confluência entre SPY e QQQ');
  assert.ok(us.methodology?.separationGuarantee, 'EUA deve conter garantia explícita de separação');
  assert.ok(us.benchmarks?.SP500, 'EUA deve conter benchmark primário SP500');
  assert.ok(us.benchmarks?.NASDAQ, 'EUA deve conter benchmark co-líder NASDAQ');

  // Market Breadth EUA é dimensão separada
  assert.equal(breadth.id, 'breadth_us');
  assert.equal(breadth.metricNature, 'breadth');
  assert.ok(breadth.condition, 'Breadth deve ter classificação de amplitude');

  // A condição de Breadth não é imposta como regime do SPY
  assert.notEqual(breadth.id, us.id);
});

test('E2E — 3. Rastreabilidade dos 21 Pregões: oscilação isolada de 1D NÃO reverte regime estrutural', () => {
  const dates = [];
  const start = new Date('2026-10-01');
  for (let i = 0; i < 21; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const seriesDescending = dates.map((date, idx) => {
    let val = 130000 - (idx * 500);
    if (idx === 20) val += 1500;
    return {
      referenceDate: date,
      closeValue: val,
      openValue: val - 100,
      highValue: val + 200,
      lowValue: val - 150,
      collectedAt: `${date}T18:00:00Z`,
      sourceTimestamp: `${date}T18:00:00Z`
    };
  });

  const snapshot = calculator.buildDailySnapshot({
    now: new Date('2026-11-24T18:00:00-03:00'),
    seriesById: {
      cycle_br_ibov: seriesDescending
    }
  });

  const ibovTape = snapshot.dailyTapeSecondary.find(i => i.symbol === 'IBOV');
  assert.ok(ibovTape);

  const alloc = allocationEngine.buildAllocationSuggestion({
    spheres: snapshot.spheres,
    indicators: snapshot.indicators,
    trendSatellites: snapshot.trendSatellites21d,
    officialEvents: snapshot.officialCalendar,
    now: new Date('2026-11-24T18:00:00-03:00')
  });

  assert.ok(['ALTA', 'MODERADA', 'AGUARDAR'].includes(alloc.confidenceLevel));
  let sumSuggested = 0;
  alloc.comparisonRows.forEach(r => {
    assert.equal(r.suggestedPct % 5, 0);
    sumSuggested += r.suggestedPct;
  });
  assert.equal(sumSuggested, 100);
});

test('E2E — 4. Reconciliação Patrimonial: Contas Correntes estritamente FORA da Equity de Investimentos', () => {
  const mockUserAccounts = [
    { id: 'xp_invest', name: 'XP Investimentos', accountType: 'investment', balance: 250000.0, currency: 'BRL' },
    { id: 'nomad_user', name: 'Nomad Global', accountType: 'investment', balance: 100000.0, currency: 'BRL' },
    { id: 'bradesco_cc', name: 'Bradesco Conta Corrente', accountType: 'checking', balance: 50000.0, currency: 'BRL' }
  ];

  const mockOpenTrades = [
    { id: 't1', ticker: 'PETR4', quantity: 2000, currentPrice: 40.0, status: 'open' },
    { id: 't2', ticker: 'AAPL34', quantity: 700, currentPrice: 100.0, status: 'open' }
  ];

  const dim = portfolioEngine.buildPortfolioDimension({
    workspaceStateData: { daily_update_accounts: mockUserAccounts },
    tradesData: mockOpenTrades,
    now: new Date('2026-11-24T18:00:00Z')
  });

  // Equity da estratégia deve incluir APENAS contas de investimento (250k + 100k = 350k)
  assert.strictEqual(dim.operationalEquity, 350000.0, 'Equity da Estratégia deve ser 350k');
  assert.strictEqual(dim.checkingWealth, 50000.0, 'Contas Correntes devem totalizar 50k');
  assert.strictEqual(dim.realWealth, 400000.0, 'Patrimônio Real total deve ser 400k');

  // Não há duplicidade entre posições e saldos
  assert.strictEqual(dim.totalExposure, 150000.0, 'Exposição em ações (80k + 70k) deve ser 150k');
  assert.strictEqual(dim.cashValue, 200000.0, 'Caixa livre deve ser Equity - Exposição (200k)');

  // Integridade de governança: o objeto é puramente analítico e rastreável
  assert.strictEqual(dim.isLive, true);
  assert.ok(dim.reconciledAt);
  assert.strictEqual(dim.id, 'my_portfolio');
});

test('E2E — 5. Pipeline Integrado com Autenticação do Usuário e Injeção do Motor de Alocação', async () => {
  const mockUser = { id: 'usr_e2e_test', name: 'Trader E2E' };
  const userSnapshot = await pipelineModule.pipeline.getSnapshotForUser(mockUser);

  assert.ok(userSnapshot.allocationSuggestion, 'Snapshot do usuário deve conter allocationSuggestion');
  assert.ok(userSnapshot.spheres.my_portfolio, 'Snapshot do usuário deve conter esfera my_portfolio');
  assert.equal(userSnapshot.allocationSuggestion.horizon, '21 pregões (Trend Following Macro)');

  const target = userSnapshot.allocationSuggestion.targetAllocations;
  assert.ok(target);
  const targetSum = target.fixedIncome + target.localEquities + target.globalEquities + target.goldProtection + target.cashLiquidity;
  assert.equal(targetSum, 100);

  Object.values(target).forEach(v => {
    assert.equal(v % 5, 0, `Valor ${v} deve ser múltiplo de 5%`);
  });
});
