/**
 * Testes Unitários — System Quality Analytics Model (SQN)
 * Valida a exatidão matemática, fórmula de Van Tharp, desvio-padrão amostral (N-1),
 * faixas de classificação e integridade amostral.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const model = require('./system-quality-analytics-model');

test('SystemQualityAnalyticsModel: validação estrita do exemplo do material de referência (Item 6)', () => {
  // Exemplo oficial do prompt:
  // Expectancy: +0,70R
  // Desvio-padrão: 1,10
  // Número de trades: 100
  // SQN = (0,70 / 1,10) * sqrt(100) = 0,636363... * 10 = 6,3636... -> 6,36
  // Classificação: EXCEPCIONAL
  const expectancy = 0.70;
  const stdDev = 1.10;
  const n = 100;

  const sqn = model.calculateRawSQN(expectancy, stdDev, n);
  assert.ok(sqn !== null);
  assert.strictEqual(sqn.toFixed(2), '6.36');

  const classification = model.classifySQN(sqn);
  assert.strictEqual(classification.key, 'exceptional');
  assert.strictEqual(classification.label, 'Excepcional');
});

test('SystemQualityAnalyticsModel: cálculo da Expectancy (Média aritmética em R)', () => {
  const rValues = [1.5, -1.0, 2.0, -1.0, 0.5];
  // Soma = 2.0, N = 5 -> Média = 0.40
  const exp = model.calculateExpectancy(rValues);
  assert.strictEqual(exp.toFixed(2), '0.40');

  // Array vazio
  assert.strictEqual(model.calculateExpectancy([]), null);
});

test('SystemQualityAnalyticsModel: cálculo do Desvio-Padrão Amostral (N - 1)', () => {
  // Amostra simples: [2.0, -1.0, 3.0, -1.0]
  // N = 4
  // Média = (2 - 1 + 3 - 1) / 4 = 3 / 4 = 0.75
  // Difs: (2 - 0.75)^2 = 1.25^2 = 1.5625
  //       (-1 - 0.75)^2 = (-1.75)^2 = 3.0625
  //       (3 - 0.75)^2 = 2.25^2 = 5.0625
  //       (-1 - 0.75)^2 = (-1.75)^2 = 3.0625
  // Soma = 12.75
  // Variância amostral (N - 1 = 3) = 12.75 / 3 = 4.25
  // Desvio-padrão = sqrt(4.25) ≈ 2.06155...
  const sample = [2.0, -1.0, 3.0, -1.0];
  const std = model.calculateSampleStandardDeviation(sample);
  assert.ok(std !== null);
  assert.strictEqual(std.toFixed(4), '2.0616');

  // Menos de 2 observações não deve calcular
  assert.strictEqual(model.calculateSampleStandardDeviation([1.5]), null);
  assert.strictEqual(model.calculateSampleStandardDeviation([]), null);
});

test('SystemQualityAnalyticsModel: escala oficial de classificação Van Tharp (Item 2.4)', () => {
  // < 1.6: Fraco
  assert.strictEqual(model.classifySQN(1.45).label, 'Fraco');
  assert.strictEqual(model.classifySQN(-0.5).label, 'Fraco');

  // 1.6 até < 2.0: Abaixo da média
  assert.strictEqual(model.classifySQN(1.60).label, 'Abaixo da média');
  assert.strictEqual(model.classifySQN(1.99).label, 'Abaixo da média');

  // 2.0 até < 2.5: Mediano
  assert.strictEqual(model.classifySQN(2.00).label, 'Mediano');
  assert.strictEqual(model.classifySQN(2.49).label, 'Mediano');

  // 2.5 até < 3.0: Bom
  assert.strictEqual(model.classifySQN(2.50).label, 'Bom');
  assert.strictEqual(model.classifySQN(2.99).label, 'Bom');

  // 3.0 até 5.0: Excelente
  assert.strictEqual(model.classifySQN(3.00).label, 'Excelente');
  assert.strictEqual(model.classifySQN(4.20).label, 'Excelente');
  assert.strictEqual(model.classifySQN(5.00).label, 'Excelente');

  // > 5.0: Excepcional
  assert.strictEqual(model.classifySQN(5.01).label, 'Excepcional');
  assert.strictEqual(model.classifySQN(7.50).label, 'Excepcional');
});

test('SystemQualityAnalyticsModel: regras de integridade e bloqueio para amostras inválidas', () => {
  // Amostra < 2
  assert.strictEqual(model.calculateRawSQN(0.5, 1.0, 1), null);
  assert.strictEqual(model.calculateRawSQN(0.5, 1.0, 0), null);

  // Desvio padrão zero ou negativo
  assert.strictEqual(model.calculateRawSQN(0.5, 0, 10), null);
  assert.strictEqual(model.calculateRawSQN(0.5, -0.2, 10), null);

  // Valores não finitos
  assert.strictEqual(model.calculateRawSQN(NaN, 1.0, 10), null);
  assert.strictEqual(model.calculateRawSQN(0.5, Infinity, 10), null);
});

test('SystemQualityAnalyticsModel: avaliação de significância estatística do tamanho da amostra', () => {
  const sig1 = model.evaluateSampleSignificance(1);
  assert.strictEqual(sig1.isEligible, false);
  assert.strictEqual(sig1.status, 'insufficient');

  const sig20 = model.evaluateSampleSignificance(20);
  assert.strictEqual(sig20.isEligible, true);
  assert.strictEqual(sig20.isReliable, false);
  assert.strictEqual(sig20.status, 'preliminary');

  const sig50 = model.evaluateSampleSignificance(50);
  assert.strictEqual(sig50.isEligible, true);
  assert.strictEqual(sig50.isReliable, true);
  assert.strictEqual(sig50.status, 'representative');

  const sig120 = model.evaluateSampleSignificance(120);
  assert.strictEqual(sig120.isEligible, true);
  assert.strictEqual(sig120.isReliable, true);
  assert.strictEqual(sig120.status, 'robust');
});

test('SystemQualityAnalyticsModel: extração de R-múltiplos de objetos heterogêneos', () => {
  const trades = [
    { resultR: 2.0 },
    { netResultR: -1.0 },
    { r: 1.5 },
    { realizedR: -0.5 },
    { result: 1000, initialRisk: 500, status: 'closed' }, // 1000 / 500 = 2.0
    2.5,
    { status: 'open' } // Sem R -> deve ser ignorado
  ];

  const rList = model.extractRMultiples(trades);
  assert.deepStrictEqual(rList, [2.0, -1.0, 1.5, -0.5, 2.0, 2.5]);
});

test('SystemQualityAnalyticsModel: evolução histórica do SQN trade a trade', () => {
  // Gerando 4 trades
  const rList = [2.0, -1.0, 2.0, 1.5];
  const evolution = model.calculateSQNEvolution(rList);

  // Começa a partir do 2º trade (N=2)
  assert.strictEqual(evolution.length, 3);
  assert.strictEqual(evolution[0].tradeIndex, 2);
  assert.strictEqual(evolution[1].tradeIndex, 3);
  assert.strictEqual(evolution[2].tradeIndex, 4);

  // Verificando que cada passo tem SQN e classificação válida
  evolution.forEach(step => {
    assert.ok(typeof step.sqn === 'number');
    assert.ok(typeof step.classification === 'string');
    assert.ok(step.cumulativeStdDev > 0);
  });
});

test('SystemQualityAnalyticsModel: relatório completo calculateSystemQualityAnalytics', () => {
  // Simulação de 30 trades consistentes
  const sample30 = [
    2.0, -1.0, 1.8, -1.0, 2.2, 1.5, -1.0, 2.0, -1.0, 1.9,
    2.1, -1.0, 2.0, -0.8, 1.7, 2.5, -1.0, 1.9, -1.0, 2.0,
    1.6, -1.0, 2.3, -1.0, 2.0, 1.8, -1.0, 2.0, -1.0, 2.4
  ];

  const report = model.calculateSystemQualityAnalytics(sample30);
  assert.strictEqual(report.isEligible, true);
  assert.strictEqual(report.sampleSize, 30);
  assert.ok(report.expectancy > 0);
  assert.ok(report.standardDeviation > 0);
  assert.ok(report.sqn > 0);
  assert.ok(['Bom', 'Excelente', 'Excepcional'].includes(report.classification.label));
  assert.strictEqual(report.significance.isReliable, true);
  assert.strictEqual(report.evolution.length, 29);
});
