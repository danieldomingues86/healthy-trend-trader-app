const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CONFIG,
  calculateDimensionScore,
  calculateCompositeScore,
  classifyStock,
  calculate52wRangePosition,
  analyzeSectorClusters,
  marketCycleMode,
  filterAndSortCandidates
} = require('./emerging-leaders-model');

test('calculateDimensionScore maps each dimension properly', () => {
  // RS
  assert.equal(calculateDimensionScore('relativeStrength', 95), 95);
  assert.equal(calculateDimensionScore('relativeStrength', 120), 100);
  assert.equal(calculateDimensionScore('relativeStrength', -10), 0);

  // RS Acceleration
  assert.equal(calculateDimensionScore('rsAcceleration', 20), 100);
  assert.equal(calculateDimensionScore('rsAcceleration', 15), 85);
  assert.equal(calculateDimensionScore('rsAcceleration', 10), 70);
  assert.equal(calculateDimensionScore('rsAcceleration', 0), 40);

  // 52W Proximity
  assert.equal(calculateDimensionScore('high52wProximity', 0), 100);
  assert.equal(calculateDimensionScore('high52wProximity', -1.5), 96.25);
  assert.equal(calculateDimensionScore('high52wProximity', -5), 85);
  assert.equal(calculateDimensionScore('high52wProximity', -10), 70);

  // Resilience
  assert.equal(calculateDimensionScore('correctionResilience', 'Forte'), 100);
  assert.equal(calculateDimensionScore('correctionResilience', 'Moderada'), 65);
  assert.equal(calculateDimensionScore('correctionResilience', 'Baixa'), 30);

  // Recovery
  assert.equal(calculateDimensionScore('recoveryStrength', 25), 100);
  assert.equal(calculateDimensionScore('recoveryStrength', 20), 85);
  assert.equal(calculateDimensionScore('recoveryStrength', 10), 55);

  // Sector Leadership
  assert.equal(calculateDimensionScore('sectorLeadership', 'Grupo Forte'), 100);
  assert.equal(calculateDimensionScore('sectorLeadership', 'Cluster Forte'), 100);
  assert.equal(calculateDimensionScore('sectorLeadership', 'Grupo Moderado'), 70);
  assert.equal(calculateDimensionScore('sectorLeadership', 'Em Formação'), 45);
});

test('calculateCompositeScore combines 6 dimensions with correct default weights', () => {
  const dimensions = {
    relativeStrength: 96,
    rsAcceleration: 18,
    high52wProximity: -1.8,
    correctionResilience: 'Forte',
    recoveryStrength: 24,
    sectorLeadership: 'Grupo Forte'
  };

  const result = calculateCompositeScore(dimensions);
  assert.ok(result.score >= 90 && result.score <= 98, `Score ${result.score} should be ~92-95`);
  assert.ok(Math.abs(result.activeWeightsRatio - 1.0) < 0.0001);
});

test('calculateCompositeScore renormalizes missing dimensions without zero-fill distortion', () => {
  // Only RS and 52W Proximity available
  const partial = {
    relativeStrength: 90,
    high52wProximity: -5.0
  };

  const result = calculateCompositeScore(partial);
  // rs score = 90 (weight 0.25), proximity score = 85 (weight 0.20)
  // total weighted = 90*0.25 + 85*0.20 = 22.5 + 17 = 39.5
  // total weight = 0.45
  // normalized = 39.5 / 0.45 = 87.77 -> 88
  assert.equal(result.score, 88);
  assert.equal(result.dimensions.rsAcceleration, null);
  assert.equal(result.dimensions.correctionResilience, null);
});

test('classifyStock returns correct categories and handles New High priority', () => {
  assert.equal(classifyStock(92, -1.8).key, 'new-high');
  assert.equal(classifyStock(92, -3.5).key, 'emerging-leader');
  assert.equal(classifyStock(82, -6.1).key, 'strong-candidate');
  assert.equal(classifyStock(65, -12.0).key, 'improving');
  assert.equal(classifyStock(45, -25.0).key, 'not-confirmed');
});

test('calculate52wRangePosition calculates percent within range correctly', () => {
  assert.equal(calculate52wRangePosition(98, 50, 100), 96);
  assert.equal(calculate52wRangePosition(75, 50, 100), 50);
  assert.equal(calculate52wRangePosition(50, 50, 100), 0);
  assert.equal(calculate52wRangePosition(null, 50, 100), null);
});

test('analyzeSectorClusters aggregates metrics and classifies cluster strength', () => {
  const sampleStocks = [
    { symbol: 'PRIO3', sector: 'Energia', score: 92, rs: 96, dist52w: -1.8 },
    { symbol: 'PETR4', sector: 'Energia', score: 89, rs: 93, dist52w: -3.2 },
    { symbol: 'ENAT3', sector: 'Energia', score: 85, rs: 91, dist52w: -4.5 },
    { symbol: 'RECV3', sector: 'Energia', score: 80, rs: 88, dist52w: -6.0 },
    { symbol: 'ITUB4', sector: 'Financeiro', score: 86, rs: 91, dist52w: -4.5 },
    { symbol: 'BBAS3', sector: 'Financeiro', score: 82, rs: 88, dist52w: -6.1 },
    { symbol: 'BBDC4', sector: 'Financeiro', score: 72, rs: 81, dist52w: -8.0 },
    { symbol: 'WEGE3', sector: 'Industriais', score: 74, rs: 81, dist52w: -9.1 }
  ];

  const clusters = analyzeSectorClusters(sampleStocks);
  const energia = clusters.find(c => c.name === 'Energia');
  assert.ok(energia);
  assert.equal(energia.candidates, 4);
  assert.equal(energia.rs90, 3);
  assert.equal(energia.status, 'Grupo Forte');

  const financeiro = clusters.find(c => c.name === 'Financeiro');
  assert.ok(financeiro);
  assert.equal(financeiro.candidates, 3);
  assert.equal(financeiro.status, 'Grupo Moderado');

  const industriais = clusters.find(c => c.name === 'Industriais');
  assert.ok(industriais);
  assert.equal(industriais.candidates, 1);
  assert.equal(industriais.status, 'Em Formação');
});

test('marketCycleMode activates Leadership Discovery Mode in transition regime', () => {
  const trans = marketCycleMode('transition');
  assert.equal(trans.discoveryModeActive, true);
  assert.equal(trans.modeBadge, 'Modo Descoberta de Líderes');

  const healthy = marketCycleMode('healthy');
  assert.equal(healthy.discoveryModeActive, false);

  const def = marketCycleMode('defensive');
  assert.equal(def.discoveryModeActive, false);
});

test('filterAndSortCandidates filters and sorts candidates correctly', () => {
  const sample = [
    { symbol: 'PRIO3', name: 'Prio', sector: 'Energia', score: 92, rs: 96, dist52w: -1.8 },
    { symbol: 'ITUB4', name: 'Itaú', sector: 'Financeiro', score: 86, rs: 91, dist52w: -4.5 },
    { symbol: 'RENT3', name: 'Localiza', sector: 'Consumo', score: 71, rs: 79, dist52w: -10.4 }
  ];

  const filteredSector = filterAndSortCandidates(sample, { sector: 'Energia' });
  assert.equal(filteredSector.length, 1);
  assert.equal(filteredSector[0].symbol, 'PRIO3');

  const filteredScore = filterAndSortCandidates(sample, { minScore: 80 });
  assert.equal(filteredScore.length, 2);

  const filteredNewHighs = filterAndSortCandidates(sample, { onlyNewHighs: true });
  assert.equal(filteredNewHighs.length, 1);
  assert.equal(filteredNewHighs[0].symbol, 'PRIO3');

  const sortedByRs = filterAndSortCandidates(sample, {}, 'rs', false);
  assert.equal(sortedByRs[0].symbol, 'PRIO3');
  assert.equal(sortedByRs[2].symbol, 'RENT3');
});

