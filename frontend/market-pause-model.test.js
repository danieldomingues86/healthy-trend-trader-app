const test = require('node:test');
const assert = require('node:assert/strict');
const MarketPauseModel = require('./market-pause-model');

test('MarketPauseModel: normaliza e valida payload de pausa', () => {
  const valid = {
    reason: 'Saúde mental / emocional',
    startDate: '2026-09-27',
    expectedReturnDate: '2026-10-04',
    notes: 'Pausa para descanso e reciclagem mental.'
  };

  const normalized = MarketPauseModel.normalize(valid);
  assert.equal(normalized.reason, 'Saúde mental / emocional');
  assert.equal(normalized.startDate, '2026-09-27');
  assert.equal(normalized.expectedReturnDate, '2026-10-04');
  assert.equal(normalized.notes, 'Pausa para descanso e reciclagem mental.');

  // Rejeita motivo vazio
  assert.throws(() => MarketPauseModel.normalize({ ...valid, reason: '' }), /motivo/);

  // Rejeita data de retorno vazia
  assert.throws(() => MarketPauseModel.normalize({ ...valid, expectedReturnDate: '' }), /data prevista de retorno/);

  // Rejeita retorno anterior ao início
  assert.throws(
    () => MarketPauseModel.normalize({ ...valid, startDate: '2026-10-05', expectedReturnDate: '2026-10-04' }),
    /não pode ser anterior/
  );
});

test('MarketPauseModel: calcula duração, tempo decorrido e formata datas', () => {
  assert.equal(MarketPauseModel.formatDate('2026-09-27'), '27/09/2026');
  assert.equal(MarketPauseModel.formatDate('2026-10-04'), '04/10/2026');
  assert.equal(MarketPauseModel.formatDate(null), '-');

  const days = MarketPauseModel.calculateDays('2026-09-27', '2026-10-04');
  assert.equal(days, 7);
  assert.equal(MarketPauseModel.calculateDurationLabel('2026-09-27', '2026-10-04'), '7 dias');
  assert.equal(MarketPauseModel.calculateDurationLabel('2026-09-27', '2026-09-28'), '1 dia');

  // Elapsed days
  const elapsed = MarketPauseModel.calculateElapsedDays('2026-09-27', '2026-09-29');
  assert.equal(elapsed, 2);

  // Remaining days
  const remaining = MarketPauseModel.calculateRemainingDays('2026-10-04', '2026-09-29');
  assert.equal(remaining, 5);
});

test('MarketPauseModel: normaliza reflexão de encerramento e valida status ativo', () => {
  const end = MarketPauseModel.normalizeEnd({ endReflection: ' Sinto-me calmo e focado no método. ' });
  assert.equal(end.endReflection, 'Sinto-me calmo e focado no método.');

  assert.equal(MarketPauseModel.isPauseCurrentlyActive({ status: 'active' }), true);
  assert.equal(MarketPauseModel.isPauseCurrentlyActive({ status: 'ended' }), false);
  assert.equal(MarketPauseModel.isPauseCurrentlyActive(null), false);
});
