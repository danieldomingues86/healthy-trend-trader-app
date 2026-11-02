'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const MarketResilienceModel = require('./market-resilience-model.js');

test('MarketResilienceModel: faixas de pontuação e classificação', () => {
  assert.equal(MarketResilienceModel.getScoreTier(100).label, 'Excelente');
  assert.equal(MarketResilienceModel.getScoreTier(92).label, 'Excelente');
  assert.equal(MarketResilienceModel.getScoreTier(80).label, 'Excelente');
  assert.equal(MarketResilienceModel.getScoreTier(79).label, 'Forte');
  assert.equal(MarketResilienceModel.getScoreTier(60).label, 'Forte');
  assert.equal(MarketResilienceModel.getScoreTier(59).label, 'Moderada');
  assert.equal(MarketResilienceModel.getScoreTier(40).label, 'Moderada');
  assert.equal(MarketResilienceModel.getScoreTier(39).label, 'Fraca');
  assert.equal(MarketResilienceModel.getScoreTier(0).label, 'Fraca');
  assert.equal(MarketResilienceModel.getScoreTier(null).label, '—');
});

test('MarketResilienceModel: cálculo matemático de Market Weakness Days', () => {
  // Benchmark with 4 down days out of 10 days
  const bench = [
    { date: '2026-01-01', close: 100 },
    { date: '2026-01-02', close: 98 },  // Down -2.0% (Weakness Day 1)
    { date: '2026-01-03', close: 99 },  // Up
    { date: '2026-01-04', close: 97 },  // Down -2.02% (Weakness Day 2)
    { date: '2026-01-05', close: 95 },  // Down -2.06% (Weakness Day 3)
    { date: '2026-01-06', close: 96 },  // Up
    { date: '2026-01-07', close: 94 },  // Down -2.08% (Weakness Day 4)
    { date: '2026-01-08', close: 95 },  // Up
    { date: '2026-01-09', close: 93 },  // Down -2.10% (Weakness Day 5)
    { date: '2026-01-10', close: 94 }   // Up
  ];

  // Resilient Asset: drops much less or rises on down days
  const asset = [
    { date: '2026-01-01', close: 10 },
    { date: '2026-01-02', close: 10.1 }, // Up +1.0% vs Bench -2.0% -> Beat! (+3.0pp)
    { date: '2026-01-03', close: 10.2 },
    { date: '2026-01-04', close: 10.15 },// Down -0.49% vs Bench -2.02% -> Beat! (+1.53pp)
    { date: '2026-01-05', close: 10.10 },// Down -0.49% vs Bench -2.06% -> Beat! (+1.57pp)
    { date: '2026-01-06', close: 10.3 },
    { date: '2026-01-07', close: 10.25 },// Down -0.48% vs Bench -2.08% -> Beat! (+1.60pp)
    { date: '2026-01-08', close: 10.5 },
    { date: '2026-01-09', close: 10.45 },// Down -0.47% vs Bench -2.10% -> Beat! (+1.63pp)
    { date: '2026-01-10', close: 10.7 }
  ];

  const res = MarketResilienceModel.calculate(asset, bench);
  assert.ok(res !== null, 'Deveria calcular resiliência');
  assert.equal(res.marketDownDays, 5, 'Deveria identificar exatamente 5 dias de queda do índice');
  assert.equal(res.beatCount, 5, 'Deveria superar o índice em 5 de 5 dias');
  assert.equal(res.beatRate, 100, 'Taxa de superação deve ser 100%');
  assert.ok(res.outperformance > 1.5, 'Outperformance média deve ser positiva e expressiva');
  assert.ok(res.score >= 80, 'Score deve ser classificado como Excelente');
  assert.equal(res.label, 'Excelente');
});

test('MarketResilienceModel: formatação de outperformance e interpretação', () => {
  assert.equal(MarketResilienceModel.formatOutperformance(1.7), '+1,7 p.p.');
  assert.equal(MarketResilienceModel.formatOutperformance(-0.8), '-0,8 p.p.');
  assert.equal(MarketResilienceModel.formatOutperformance(0), '+0,0 p.p.');

  const interpHigh = MarketResilienceModel.getInterpretation(92, 'JSLG3');
  assert.ok(interpHigh.includes('excelente capacidade'), 'Score >= 80 deve conter excelente capacidade');

  const interpLow = MarketResilienceModel.getInterpretation(32, 'ANIM3');
  assert.ok(interpLow.includes('acompanhou ou ampliou as quedas'), 'Score < 40 deve indicar fraqueza sob pressão');
});

test('MarketResilienceModel: filtro por faixa de resiliência preserva RS e ranking original', () => {
  const items = [
    { symbol: 'JSLG3', score: 100, rank: 1, resilience12m: { score: 92 } },
    { symbol: 'SIMH3', score: 96, rank: 2, resilience12m: { score: 71 } },
    { symbol: 'DASA3', score: 91, rank: 3, resilience12m: { score: 48 } },
    { symbol: 'ANIM3', score: 90, rank: 4, resilience12m: { score: 32 } }
  ];

  const filteredExc = MarketResilienceModel.filterByResilienceTier(items, 'excelente');
  assert.equal(filteredExc.length, 1);
  assert.equal(filteredExc[0].symbol, 'JSLG3');
  assert.equal(filteredExc[0].score, 100, 'RS não pode ser alterado');
  assert.equal(filteredExc[0].rank, 1, 'Rank não pode ser alterado');

  const filteredFraca = MarketResilienceModel.filterByResilienceTier(items, 'fraca');
  assert.equal(filteredFraca.length, 1);
  assert.equal(filteredFraca[0].symbol, 'ANIM3');
  assert.equal(filteredFraca[0].score, 90, 'ANIM3 continua sendo RS 90 (Líder) mesmo com Resiliência Fraca');

  const filteredAll = MarketResilienceModel.filterByResilienceTier(items, 'all');
  assert.equal(filteredAll.length, 4);
});

test('MarketResilienceModel: resolve recupera resilience12m de forma defensiva', () => {
  const itemWithProp = { symbol: 'WEGE3', resilience12m: { score: 87, label: 'Excelente' } };
  assert.equal(MarketResilienceModel.resolve(itemWithProp).score, 87);

  const itemNumeric = { symbol: 'PRIO3', resilienceScore: 95 };
  const resolvedNumeric = MarketResilienceModel.resolve(itemNumeric);
  assert.equal(resolvedNumeric.score, 95);
  assert.equal(resolvedNumeric.label, 'Excelente');

  assert.equal(MarketResilienceModel.resolve(null), null);
});
