const test = require('node:test');
const assert = require('node:assert/strict');
const { sessionId, normalizePreferences } = require('../src/platform-access');

test('aceita um sessionId UUID e rejeita identificadores inválidos', () => {
  assert.equal(sessionId('8d773025-21f5-46ea-9e33-2f5f1c9e0b7b'), '8d773025-21f5-46ea-9e33-2f5f1c9e0b7b');
  assert.throws(() => sessionId('sessao-123'), /inválido/);
});

test('preferências mantêm duração e aberturas habilitadas por padrão', () => {
  assert.deepEqual(normalizePreferences({}), { targetAppName: 'Profit Trader · Nelógica', targetExecutable: 'Profit.exe', countOpenings: true, trackDuration: true, trackMinimize: true, trackMaximize: true, trackWindowEvents: true });
  assert.deepEqual(normalizePreferences({ countOpenings: false, trackDuration: true, trackWindowEvents: true }), { targetAppName: 'Profit Trader · Nelógica', targetExecutable: 'Profit.exe', countOpenings: false, trackDuration: true, trackMinimize: true, trackMaximize: true, trackWindowEvents: true });
});
