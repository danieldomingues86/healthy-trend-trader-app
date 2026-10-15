const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('./equity-adjustment-model');

test('parseCurrencyBR: converte com precisão múltiplos formatos brasileiros e numéricos', () => {
  assert.equal(Model.parseCurrencyBR(1029500), 1029500);
  assert.equal(Model.parseCurrencyBR('1029500'), 1029500);
  assert.equal(Model.parseCurrencyBR('1.029.500'), 1029500);
  assert.equal(Model.parseCurrencyBR('1.029.500,00'), 1029500);
  assert.equal(Model.parseCurrencyBR('1.029.500,50'), 1029500.5);
  assert.equal(Model.parseCurrencyBR('R$ 1.100.000,00'), 1100000);
  assert.equal(Model.parseCurrencyBR('  R$  1.100.000,75  '), 1100000.75);
  assert.equal(Model.parseCurrencyBR('1100000.50'), 1100000.5);
  assert.equal(Model.parseCurrencyBR('1100000,50'), 1100000.5);
  assert.ok(Number.isNaN(Model.parseCurrencyBR('')));
  assert.ok(Number.isNaN(Model.parseCurrencyBR(null)));
  assert.ok(Number.isNaN(Model.parseCurrencyBR('invalido')));
});

test('validateAdjustment: valida valores positivos e rejeita entradas inválidas ou nulas', () => {
  const valid1 = Model.validateAdjustment({ amount: '1.100.000,00', reason: 'Ajuste de saldo' }, 1029500);
  assert.equal(valid1.valid, true);
  assert.equal(valid1.amount, 1100000);
  assert.equal(valid1.reason, 'Ajuste de saldo');
  assert.equal(valid1.previousAmount, 1029500);

  const valid2 = Model.validateAdjustment({ newAmount: 500000 }, 400000);
  assert.equal(valid2.valid, true);
  assert.equal(valid2.amount, 500000);
  assert.equal(valid2.reason, '');

  const invalidZero = Model.validateAdjustment({ amount: '0' });
  assert.equal(invalidZero.valid, false);
  assert.match(invalidZero.error, /maior que zero/);

  const invalidNegative = Model.validateAdjustment({ amount: '-500' });
  assert.equal(invalidNegative.valid, false);

  const invalidEmpty = Model.validateAdjustment({ amount: '' });
  assert.equal(invalidEmpty.valid, false);
  assert.match(invalidEmpty.error, /obrigatório/);

  const invalidText = Model.validateAdjustment({ amount: 'abc' });
  assert.equal(invalidText.valid, false);
});

test('calculateDerivedMetrics: recalcula Risk Budget e limites financeiros com base na nova Equity', () => {
  const policy = {
    grades: [
      { grade: 'A', riskPct: 0.0025 }, // 0.25%
      { grade: 'B', riskPct: 0.0015 },
      { grade: 'D', riskPct: 0 }
    ],
    profiles: {
      standard: {
        label: 'Padrão',
        capitalPct: 0.10, // 10%
        initialVolatilityPct: 0.003, // 0.3%
        maximumPortfolioRiskPct: 0.125, // 12.5%
        ongoingRiskPct: 0.005,
        maximumPositions: 10
      }
    }
  };

  // 1. Cenário com Equity inicial: R$ 1.029.500,00
  const metricsInitial = Model.calculateDerivedMetrics(1029500, policy);
  const gradeAInitial = metricsInitial.gradeBudgets.find(g => g.grade === 'A');
  assert.equal(gradeAInitial.budgetMoney, 2573.75); // 1.029.500 * 0.0025 = 2.573,75
  assert.equal(metricsInitial.profiles.standard.capitalLimitMoney, 102950); // 10% de 1.029.500
  assert.equal(metricsInitial.profiles.standard.volatilityLimitMoney, 3088.50); // 0.3% de 1.029.500
  assert.equal(metricsInitial.profiles.standard.portfolioHeatLimitMoney, 128687.50); // 12.5% de 1.029.500

  // 2. Cenário atualizado: R$ 1.100.000,00
  const metricsUpdated = Model.calculateDerivedMetrics(1100000, policy);
  const gradeAUpdated = metricsUpdated.gradeBudgets.find(g => g.grade === 'A');
  assert.equal(gradeAUpdated.budgetMoney, 2750.00); // 1.100.000 * 0.0025 = 2.750,00 (exemplo exato do prompt!)
  assert.equal(metricsUpdated.profiles.standard.capitalLimitMoney, 110000); // 10% de 1.100.000
  assert.equal(metricsUpdated.profiles.standard.volatilityLimitMoney, 3300.00); // 0.3% de 1.100.000
  assert.equal(metricsUpdated.profiles.standard.portfolioHeatLimitMoney, 137500.00); // 12.5% de 1.100.000
});
