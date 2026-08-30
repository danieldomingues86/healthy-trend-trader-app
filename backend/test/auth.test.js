const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword } = require('../src/auth');

test('password hash verifies only the matching password', async () => {
  const hash = await hashPassword('uma-senha-segura-123');
  assert.notEqual(hash, 'uma-senha-segura-123');
  assert.equal(await verifyPassword('uma-senha-segura-123', hash), true);
  assert.equal(await verifyPassword('senha-incorreta', hash), false);
});

test('invalid stored password hash is rejected safely', async () => {
  assert.equal(await verifyPassword('qualquer-coisa', 'valor-invalido'), false);
});
