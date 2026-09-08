const test = require('node:test');
const assert = require('node:assert/strict');
const workspaceState = require('../src/workspace-state');

test('workspace state aceita chaves de tela estáveis', () => {
  assert.equal(workspaceState.key('healthy-trend-habit-tracker-v2'), 'healthy-trend-habit-tracker-v2');
  assert.equal(workspaceState.key('profile.preferences'), 'profile.preferences');
});

test('workspace state rejeita chaves e cargas inválidas', () => {
  assert.throws(() => workspaceState.key('../state'), /Chave de estado inválida/);
  assert.throws(() => workspaceState.value('x'.repeat(workspaceState.MAX_STATE_BYTES + 1)), /excede o limite/);
});

test('workspace state preserva JSON serializável', () => {
  assert.equal(workspaceState.value({ favorites: ['zen'], history: [] }), '{"favorites":["zen"],"history":[]}');
});
