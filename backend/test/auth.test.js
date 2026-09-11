const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword, validateRegistration, normalizePlanType, TRIAL_DAYS } = require('../src/auth');

test('password hash verifies only the matching password', async () => {
  const hash = await hashPassword('uma-senha-segura-123');
  assert.notEqual(hash, 'uma-senha-segura-123');
  assert.equal(await verifyPassword('uma-senha-segura-123', hash), true);
  assert.equal(await verifyPassword('senha-incorreta', hash), false);
});

test('invalid stored password hash is rejected safely', async () => {
  assert.equal(await verifyPassword('qualquer-coisa', 'valor-invalido'), false);
});

test('registration accepts only a complete account and a server-supported plan', () => {
  assert.equal(TRIAL_DAYS, 7);
  assert.equal(normalizePlanType('professional'), 'PROFESSIONAL');
  assert.equal(normalizePlanType('premium'), null);
  const valid = validateRegistration({ name: 'Ana Trader', email: ' ANA@EXAMPLE.COM ', password: 'senha-segura-123', planType: 'trial', acceptedTerms: true });
  assert.equal(valid.error, undefined);
  assert.equal(valid.email, 'ana@example.com');
  assert.equal(valid.planType, 'TRIAL');
  const payload = { name: 'Ana Trader', email: 'ana@example.com', password: 'senha-segura-123', planType: 'TRIAL', acceptedTerms: true };
  assert.match(validateRegistration({ ...payload, password: 'curta' }).error, /10 caracteres/);
  assert.match(validateRegistration({ ...payload, acceptedTerms: false }).error, /aceitar/);
});
