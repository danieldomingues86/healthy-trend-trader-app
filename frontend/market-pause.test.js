const test = require('node:test');
const assert = require('node:assert/strict');
const MarketPauseModel = require('./market-pause-model');

test('MarketPauseModel: razões operacionais e de freio psicológico estão completas e corretas', () => {
  assert.deepEqual(MarketPauseModel.REASONS, [
    'Saúde mental / emocional',
    'Sequência de perdas',
    'Cansaço',
    'Falta de clareza',
    'Pausa planejada',
    'Outro'
  ]);

  assert.deepEqual(MarketPauseModel.TRADE_ATTEMPT_REASONS, [
    'O setup realmente apareceu',
    'Estou com medo de perder a oportunidade',
    'Quero recuperar uma perda',
    'Estou entediado',
    'Estou tentando provar que estou certo',
    'Outro'
  ]);
});

test('MarketPauseModel: cálculos de tempo e transição de ciclo', () => {
  const p = {
    reason: 'Falta de clareza',
    startDate: '2026-10-01',
    expectedReturnDate: '2026-10-08',
    notes: 'Aguardar o IBOV retomar tendência clara.'
  };

  const norm = MarketPauseModel.normalize(p);
  assert.equal(norm.reason, 'Falta de clareza');
  assert.equal(norm.startDate, '2026-10-01');
  assert.equal(norm.expectedReturnDate, '2026-10-08');

  // Elapsed calculations
  assert.equal(MarketPauseModel.calculateElapsedDays('2026-10-01', '2026-10-01'), 0);
  assert.equal(MarketPauseModel.calculateElapsedDays('2026-10-01', '2026-10-04'), 3);

  // Remaining calculations
  assert.equal(MarketPauseModel.calculateRemainingDays('2026-10-08', '2026-10-04'), 4);
  assert.equal(MarketPauseModel.calculateRemainingDays('2026-10-08', '2026-10-08'), 0);
  assert.equal(MarketPauseModel.calculateRemainingDays('2026-10-08', '2026-10-09'), -1);

  // Formatting
  assert.equal(MarketPauseModel.formatDate('2026-10-01'), '01/10/2026');
  assert.equal(MarketPauseModel.calculateDurationLabel('2026-10-01', '2026-10-08'), '7 dias');
});
