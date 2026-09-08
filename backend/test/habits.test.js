const test = require('node:test');
const assert = require('node:assert/strict');
const habits = require('../src/habits');

test('hábitos validam identificador, categoria e data', () => {
  assert.equal(habits.habitId('habit-123'), 'habit-123');
  assert.equal(habits.date('2026-09-08'), '2026-09-08');
  assert.deepEqual(habits.details({ id: 'walk', name: 'Caminhar', category: 'exercise' }), { id: 'walk', name: 'Caminhar', category: 'exercise' });
  assert.equal(habits.details({ id: 'journal', name: '', category: 'Processo' }).category, 'process');
  assert.throws(() => habits.habitId('../walk'), /Hábito inválido/);
});
