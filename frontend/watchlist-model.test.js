const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('./watchlist-model');

test('createSnapshot captura métricas no momento de entrada', () => {
  const snap = model.createSnapshot({
    price: 48.5,
    rsScore: 94,
    distance52wPct: -1.8,
    atrPct: 2.1,
    volumeRatio: 1.4,
    marketCycle: 'Saudável'
  });

  assert.equal(snap.price, 48.5);
  assert.equal(snap.rsScore, 94);
  assert.equal(snap.distance52wPct, -1.8);
  assert.equal(snap.atrPct, 2.1);
  assert.equal(snap.volumeRatio, 1.4);
  assert.equal(snap.marketCycle, 'Saudável');
  assert.ok(snap.date);
});

test('generateWhyObserving cria justificativas baseadas em métricas reais', () => {
  const stock = {
    rsScore: 92,
    distance52wPct: -3.2,
    volumeRatio: 1.5,
    trend: 'alta',
    sector: 'Tecnologia',
    sectorLeader: true,
    scoreFundamentals: 78
  };

  const reasons = model.generateWhyObserving(stock);
  const ids = reasons.map(r => r.id);

  assert.ok(ids.includes('rs-elite'), 'Deve identificar RS de elite');
  assert.ok(ids.includes('52w-high'), 'Deve identificar proximidade da 52W');
  assert.ok(ids.includes('volume-pressure'), 'Deve identificar pressão de volume');
  assert.ok(ids.includes('healthy-trend'), 'Deve identificar tendência saudável');
  assert.ok(ids.includes('sector-leadership'), 'Deve identificar liderança setorial');
  assert.ok(ids.includes('solid-fundamentals'), 'Deve identificar fundamentos');
});

test('calculateEvolution detecta amadurecimento quando RS sobe e preço se aproxima do topo', () => {
  const opp = {
    ticker: 'WEGE3',
    snapshot: {
      price: 45.0,
      rsScore: 82,
      distance52wPct: -8.4,
      atrPct: 3.1
    }
  };

  const currentMetrics = {
    price: 48.6,
    rsScore: 96,
    distance52wPct: -1.8,
    atrPct: 2.2
  };

  const evo = model.calculateEvolution(opp, currentMetrics);

  assert.equal(evo.hasInitialSnapshot, true);
  assert.equal(evo.rsDelta, 14); // 82 -> 96
  assert.equal(Math.round(evo.priceChangePct), 8); // 45 -> 48.6 = +8%
  assert.equal(evo.dist52wDelta > 0, true); // -8.4 -> -1.8 (aproximou da máxima)
  assert.equal(evo.atrDelta < 0, true); // 3.1 -> 2.2 (volatilidade contraiu)
  assert.equal(evo.state, 'amadurecendo');
  assert.equal(evo.label, 'Amadurecendo');
});

test('calculateEvolution detecta deterioração quando RS cai expressivamente', () => {
  const opp = {
    ticker: 'VALE3',
    snapshot: {
      price: 65.0,
      rsScore: 84,
      distance52wPct: -4.0,
      atrPct: 2.5
    }
  };

  const currentMetrics = {
    price: 59.0,
    rsScore: 71,
    distance52wPct: -14.0,
    atrPct: 3.2
  };

  const evo = model.calculateEvolution(opp, currentMetrics);

  assert.equal(evo.rsDelta, -13);
  assert.equal(evo.state, 'deteriorando');
  assert.equal(evo.label, 'Perdendo Força');
});

test('filterAndSortOpportunities filtra por status, setor, origem e busca', () => {
  const list = [
    model.normalizeOpportunity({ ticker: 'WEGE3', name: 'WEG SA', sector: 'Bens Industriais', origin: 'emerging-leaders', status: 'setup-proximo' }),
    model.normalizeOpportunity({ ticker: 'PRIO3', name: 'PetroRio', sector: 'Petróleo', origin: 'relative-strength', status: 'observando' }),
    model.normalizeOpportunity({ ticker: 'TOTS3', name: 'Totvs', sector: 'Tecnologia', origin: 'scans', status: 'ready' })
  ];

  // Filtro por status
  const readyList = model.filterAndSortOpportunities(list, { status: 'ready' });
  assert.equal(readyList.length, 1);
  assert.equal(readyList[0].ticker, 'TOTS3');

  // Filtro por setor
  const petroleoList = model.filterAndSortOpportunities(list, { sector: 'Petróleo' });
  assert.equal(petroleoList.length, 1);
  assert.equal(petroleoList[0].ticker, 'PRIO3');

  // Filtro por texto de busca
  const searchList = model.filterAndSortOpportunities(list, { search: 'weg' });
  assert.equal(searchList.length, 1);
  assert.equal(searchList[0].ticker, 'WEGE3');
});

test('calculateSummaryKpis conta pipeline e novos ativos esta semana', () => {
  const now = new Date();
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

  const list = [
    { ticker: 'A', status: 'observando', created_at: now.toISOString() },
    { ticker: 'B', status: 'desenvolvendo', created_at: now.toISOString() },
    { ticker: 'C', status: 'setup-proximo', created_at: now.toISOString() },
    { ticker: 'D', status: 'ready', created_at: eightDaysAgo }
  ];

  const kpis = model.calculateSummaryKpis(list);

  assert.equal(kpis.total, 4);
  assert.equal(kpis.observando, 1);
  assert.equal(kpis.desenvolvendo, 1);
  assert.equal(kpis.setupProximo, 1);
  assert.equal(kpis.ready, 1);
  assert.equal(kpis.novosSemana, 3); // A, B, C estão nos últimos 7 dias
});
