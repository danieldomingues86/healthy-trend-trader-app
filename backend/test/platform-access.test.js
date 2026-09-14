const test = require('node:test');
const assert = require('node:assert/strict');
const { sessionId, normalizePreferences } = require('../src/platform-access');
const access = require('../src/platform-access');
const database = require('../src/database');

test('aceita um sessionId UUID e rejeita identificadores inválidos', () => {
  assert.equal(sessionId('8d773025-21f5-46ea-9e33-2f5f1c9e0b7b'), '8d773025-21f5-46ea-9e33-2f5f1c9e0b7b');
  assert.throws(() => sessionId('sessao-123'), /inválido/);
});

test('preferências mantêm duração e aberturas habilitadas por padrão', () => {
  assert.deepEqual(normalizePreferences({}), { targetAppName: 'Profit Trader · Nelógica', targetExecutable: 'Profit.exe', countOpenings: true, trackDuration: true, monitorEnabled: true, trackMinimize: true, trackMaximize: true, trackWindowEvents: true });
  assert.deepEqual(normalizePreferences({ countOpenings: false, trackDuration: true, monitorEnabled: false, trackWindowEvents: true }), { targetAppName: 'Profit Trader · Nelógica', targetExecutable: 'Profit.exe', countOpenings: false, trackDuration: true, monitorEnabled: false, trackMinimize: true, trackMaximize: true, trackWindowEvents: true });
});

test('histórico completo não herda o limite de 180 dias e continua restrito ao usuário', async (t) => {
  const calls = [];
  t.mock.method(database, 'query', async (sql, args) => { calls.push({ sql, args }); return { rows: [] }; });
  await access.list('account-one', 'all');
  assert.deepEqual(calls[0].args, ['account-one', null]);
  assert.match(calls[0].sql, /user_id = \$1/); assert.match(calls[0].sql, /\$2::integer IS NULL/);
  await access.list('account-one', 365); assert.equal(calls[1].args[1], 365);
  await access.list('account-one', 'invalid'); assert.equal(calls[2].args[1], 30);
});
