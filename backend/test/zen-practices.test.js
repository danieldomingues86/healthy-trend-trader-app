const test = require('node:test');
const assert = require('node:assert/strict');
const zen = require('../src/zen-practices');

test('sessões Zen aceitam apenas práticas conhecidas', () => {
  assert.equal(zen.practiceId('breathing'), 'breathing');
  assert.equal(zen.practiceId('LONGTERM'), 'longterm');
  assert.throws(() => zen.practiceId('qualquer-coisa'), /Prática Zen inválida/);
});

test('sessões Zen usam identificadores UUID válidos', () => {
  const id = 'efc1e610-e962-4be2-b47a-794d6ff5bdaf';
  assert.equal(zen.sessionId(id), id);
  assert.throws(() => zen.sessionId('sessao-zen'), /Sessão Zen inválida/);
});
